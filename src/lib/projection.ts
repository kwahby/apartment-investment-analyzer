import type {
  Apartment,
  CostSettings,
  Projection,
  ProjectionParams,
  ProjectionYear,
  Results,
} from '../types';

const CURRENT_YEAR = new Date().getFullYear();

/** Sonderabschreibung §7b: +5% of building value per year for the first 4 years. */
const SONDER_AFA_RATE_PCT = 5;
const SONDER_AFA_YEARS = 4;

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * First-year monthly cash flow before and after German tax effects (AfA
 * depreciation and deductible interest). Shared by the Summary and Scenarios
 * views so they always agree.
 */
export function firstYearMonthlyAfterTax(
  apartment: Apartment,
  results: Results,
  params: ProjectionParams,
): { preTax: number; taxEffectMonthly: number; afterTax: number } {
  const year1Interest = results.amortization[0]?.cumulativeInterest ?? 0;
  // Include closing costs in the AfA basis, consistent with computeProjection.
  const buildingValue = round2(((apartment.purchasePrice + results.closingCosts) * params.buildingSharePct) / 100);
  const annualAfA = buildingValue * (params.afaRatePct / 100);
  // Year 1 always falls inside the 4-year Sonder-AfA window when it's enabled.
  const sonderAfA = params.sonderAfaEnabled ? buildingValue * (SONDER_AFA_RATE_PCT / 100) : 0;
  const taxableAnnual =
    results.effectiveMonthlyRent * 12 - results.monthlyOperatingCosts * 12 - year1Interest - annualAfA - sonderAfA;
  const annualTax = (taxableAnnual * params.marginalTaxRatePct) / 100;
  const taxEffectMonthly = round2(-annualTax / 12);
  const afterTax = round2(results.monthlyCashFlowAfterLoan + taxEffectMonthly);
  return { preTax: results.monthlyCashFlowAfterLoan, taxEffectMonthly, afterTax };
}

/**
 * Internal rate of return for a series of yearly cash flows (index 0 = today).
 * Solved by bisection. Returns an annual rate in %, or null if it can't be
 * bracketed (e.g. no sign change in the cash-flow series).
 */
export function irr(cashFlows: number[]): number | null {
  const npv = (rate: number) =>
    cashFlows.reduce((acc, cf, i) => acc + cf / Math.pow(1 + rate, i), 0);

  let lo = -0.9;
  let hi = 2; // 200%
  let fLo = npv(lo);
  let fHi = npv(hi);
  if (fLo === 0) return round2(lo * 100);
  if (fHi === 0) return round2(hi * 100);
  if (fLo * fHi > 0) return null; // no sign change -> no bracketed root

  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    const fMid = npv(mid);
    if (Math.abs(fMid) < 1e-6) return round2(mid * 100);
    if (fLo * fMid < 0) {
      hi = mid;
      fHi = fMid;
    } else {
      lo = mid;
      fLo = fMid;
    }
  }
  return round2(((lo + hi) / 2) * 100);
}

/** Build per-year balance & cumulative-interest lookups from the amortization. */
function loanByYear(results: Results, maxYear: number) {
  const balance: number[] = [results.loanAmount];
  const cumInterest: number[] = [0];
  const map = new Map<number, { bal: number; cum: number }>();
  for (const p of results.amortization) {
    map.set(p.year, { bal: p.remainingBalance, cum: p.cumulativeInterest });
  }
  for (let t = 1; t <= maxYear; t++) {
    const entry = map.get(CURRENT_YEAR + t);
    if (entry) {
      balance[t] = entry.bal;
      cumInterest[t] = entry.cum;
    } else {
      // After payoff (or gap): carry the balance forward, interest stays flat.
      balance[t] = balance[t - 1] <= 0.01 ? 0 : balance[t - 1];
      cumInterest[t] = cumInterest[t - 1];
    }
  }
  return { balance, cumInterest };
}

/**
 * Multi-year projection: appreciation, rent growth, cost inflation, a sale at
 * the end of the holding period, and (optionally) the German after-tax view
 * with AfA depreciation, deductible interest and Spekulationssteuer.
 */
export function computeProjection(
  apartment: Apartment,
  costs: CostSettings,
  results: Results,
  params: ProjectionParams,
): Projection {
  const price = Math.max(apartment.purchasePrice, 0);
  const holdingYears = Math.max(1, Math.round(params.holdingYears));
  const cashInvested = results.cashInvested;

  // Post-renovation starting value (uplift applied immediately) and the extra
  // cash cost, which lifts the capital-gains cost basis when selling.
  const renovationCost = Math.max(0, apartment.renovationCost ?? 0);
  const renovationValueAdd = Math.max(0, apartment.renovationValueAdd ?? 0);
  const baseValue = price + renovationValueAdd;

  const appr = params.annualAppreciationPct / 100;
  const rentG = params.annualRentGrowthPct / 100;
  const costG = params.annualCostInflationPct / 100;

  const baseAnnualRent = apartment.monthlyColdRent * 12;
  const vacancyFactor = 1 - costs.vacancyPct / 100;
  const baseAnnualOperating = results.monthlyOperatingCosts * 12;
  // Annual reserve contribution (Instandhaltungsrücklage) that is NOT immediately
  // tax-deductible. Excluded from taxable income but still part of operating cash flow.
  const baseAnnualReserve = results.monthlyHausgeldReserve * 12;

  // Depreciable building basis = (purchase price + acquisition costs) × building share.
  // Acquisition costs (Kaufnebenkosten) are capitalised and allocated proportionally
  // between land and building — they are NOT immediately deductible.
  const buildingValue = round2(((price + results.closingCosts) * params.buildingSharePct) / 100);
  const annualDepreciation = params.taxEnabled
    ? round2((buildingValue * params.afaRatePct) / 100)
    : 0;

  // §7b Sonder-AfA assessment basis:
  // - If the cost per m² exceeds the €5,200 eligibility ceiling, §7b does NOT apply.
  // - The assessment basis is capped at eligibleArea × €4,000 (the statutory maximum).
  // - If no area is entered (legacy/unknown), fall back to the building value as before.
  const SONDER_COST_CEILING = 5200; // €/m² — eligibility threshold
  const SONDER_BASIS_CAP_PER_SQM = 4000; // €/m² — max assessment basis
  const sonder7bArea = Math.max(0, params.sonder7bEligibleAreaSqm ?? 0);
  const sonder7bCost = Math.max(0, params.sonder7bCostPerSqm ?? 0);
  // Eligible if cost check is not entered (conservative: include) or cost ≤ ceiling.
  const sonder7bEligible = sonder7bCost === 0 || sonder7bCost <= SONDER_COST_CEILING;
  // §7b assessment basis: capped at area × €4,000 when area is known, else building value.
  const sonder7bBasis = sonder7bArea > 0
    ? Math.min(buildingValue, round2(sonder7bArea * SONDER_BASIS_CAP_PER_SQM))
    : buildingValue;

  const { balance, cumInterest } = loanByYear(results, holdingYears);

  const years: ProjectionYear[] = [];
  const cashFlowSeries: number[] = [-cashInvested]; // index 0 = today
  let cumulative = 0;
  let accumulatedDepreciation = 0;

  for (let t = 1; t <= holdingYears; t++) {
    const propertyValue = round2(baseValue * Math.pow(1 + appr, t));
    const remainingLoan = round2(balance[t]);
    const grossRent = round2(baseAnnualRent * Math.pow(1 + rentG, t - 1));
    const effectiveRent = grossRent * vacancyFactor;
    const operatingCosts = round2(baseAnnualOperating * Math.pow(1 + costG, t - 1));
    // Reserve grows with cost inflation but is not deductible until spent by the WEG.
    const reserveThisYear = round2(baseAnnualReserve * Math.pow(1 + costG, t - 1));
    const interest = round2(cumInterest[t] - cumInterest[t - 1]);
    const principal = round2(Math.max(balance[t - 1] - balance[t], 0));

    const cashFlowPreTax = round2(effectiveRent - operatingCosts - interest - principal);

    // Regular linear AfA, capped so total depreciation never exceeds the building value.
    const regularDep = params.taxEnabled
      ? Math.min(annualDepreciation, Math.max(0, buildingValue - accumulatedDepreciation))
      : 0;
    accumulatedDepreciation += regularDep;

    // Sonderabschreibung §7b: extra 5%/year for the first 4 years on top of regular AfA.
    // Assessment basis is capped at eligibleArea × €4,000 (or buildingValue if unknown).
    // Property is ineligible if the cost per m² exceeds the €5,200 statutory ceiling.
    const sonderDep =
      params.taxEnabled && params.sonderAfaEnabled && sonder7bEligible && t <= SONDER_AFA_YEARS
        ? Math.min(
            (sonder7bBasis * SONDER_AFA_RATE_PCT) / 100,
            Math.max(0, buildingValue - accumulatedDepreciation),
          )
        : 0;
    accumulatedDepreciation += sonderDep;

    const depThisYear = round2(regularDep + sonderDep);

    const taxableIncome = round2(effectiveRent - (operatingCosts - reserveThisYear) - interest - depThisYear);
    const tax = params.taxEnabled
      ? round2((taxableIncome * params.marginalTaxRatePct) / 100)
      : 0;
    const cashFlowAfterTax = round2(cashFlowPreTax - tax);

    const flow = params.taxEnabled ? cashFlowAfterTax : cashFlowPreTax;
    cumulative = round2(cumulative + flow);
    cashFlowSeries.push(flow);

    years.push({
      year: CURRENT_YEAR + t,
      yearIndex: t,
      propertyValue,
      remainingLoan,
      equity: round2(propertyValue - remainingLoan),
      grossRent,
      operatingCosts,
      interest,
      principal,
      effectiveRent: round2(effectiveRent),
      cashFlowPreTax,
      depreciation: depThisYear,
      taxableIncome,
      tax,
      cashFlowAfterTax,
      cumulativeCashFlow: cumulative,
    });
  }

  // --- Sale at the end of the holding period ---
  const saleValue = round2(baseValue * Math.pow(1 + appr, holdingYears));
  const sellingCosts = round2((saleValue * params.sellingCostsPct) / 100);
  const remainingLoanAtSale = round2(balance[holdingYears]);
  const speculationTaxFree = holdingYears >= 10;

  // Private-sale capital gain: proceeds minus the (depreciated) acquisition cost.
  // Renovation spend lifts the cost basis, reducing the taxable gain.
  const acquisitionCost = price + results.closingCosts + renovationCost - accumulatedDepreciation;
  const taxableGain = round2(saleValue - sellingCosts - acquisitionCost);
  const speculationTax = params.taxEnabled && !speculationTaxFree
    ? round2((Math.max(0, taxableGain) * params.marginalTaxRatePct) / 100)
    : 0;

  const netSaleProceeds = round2(
    saleValue - sellingCosts - remainingLoanAtSale - speculationTax,
  );

  // Add the sale proceeds to the final year's cash flow for the IRR series.
  cashFlowSeries[cashFlowSeries.length - 1] += netSaleProceeds;

  const totalRentCashFlow = round2(cumulative);
  const totalReturned = round2(totalRentCashFlow + netSaleProceeds);
  const totalProfit = round2(totalReturned - cashInvested);
  const moneyMultiple = cashInvested > 0 ? round2(totalReturned / cashInvested) : 0;
  const irrPct = cashInvested > 0 ? irr(cashFlowSeries) : null;

  // --- Property vs. ETF (opportunity cost) ---
  // Both paths commit the same cash: the down payment up front plus every yearly
  // top-up the property needs. Buying gives you the sale proceeds plus any rental
  // surplus (reinvested at the ETF rate); the ETF gives the compounded value of
  // that same committed cash.
  const etfRate = params.etfReturnPct / 100;
  let etfEndWealth = cashInvested * Math.pow(1 + etfRate, holdingYears);
  let buySurplusFV = 0;
  let topUpsTotal = 0;
  for (const y of years) {
    const cf = params.taxEnabled ? y.cashFlowAfterTax : y.cashFlowPreTax;
    const yearsToEnd = holdingYears - y.yearIndex;
    const growth = Math.pow(1 + etfRate, Math.max(0, yearsToEnd));
    if (cf < 0) {
      topUpsTotal += -cf;
      etfEndWealth += -cf * growth; // invest the top-up in the ETF instead
    } else {
      buySurplusFV += cf * growth; // reinvest the rental surplus
    }
  }
  const totalCashCommitted = round2(cashInvested + topUpsTotal);
  const buyEndWealth = round2(netSaleProceeds + buySurplusFV);
  etfEndWealth = round2(etfEndWealth);

  return {
    years,
    holdingYears,
    taxEnabled: params.taxEnabled,
    cashInvested,
    annualDepreciation,
    saleValue,
    sellingCosts,
    remainingLoanAtSale,
    accumulatedDepreciation: round2(accumulatedDepreciation),
    taxableGain,
    speculationTax,
    speculationTaxFree,
    netSaleProceeds,
    totalRentCashFlow,
    totalProfit,
    moneyMultiple,
    irrPct,
    etfReturnPct: params.etfReturnPct,
    totalCashCommitted,
    buyEndWealth,
    etfEndWealth,
  };
}

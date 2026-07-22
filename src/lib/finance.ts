import type {
  AmortizationPoint,
  Apartment,
  CostSettings,
  LoanParams,
  Results,
} from '../types';

const CURRENT_YEAR = new Date().getFullYear();

/** Round to 2 decimals for currency. */
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Compute Kaufnebenkosten (closing costs) breakdown from settings. */
function computeClosingCosts(purchasePrice: number, costs: CostSettings) {
  const breakdown = [
    { label: 'Grunderwerbsteuer', amount: round2((purchasePrice * costs.transferTaxPct) / 100) },
    { label: 'Notar', amount: round2((purchasePrice * costs.notaryPct) / 100) },
    { label: 'Grundbuch', amount: round2((purchasePrice * costs.landRegistryPct) / 100) },
    { label: 'Makler', amount: round2((purchasePrice * costs.agentCommissionPct) / 100) },
  ];
  const total = round2(breakdown.reduce((sum, b) => sum + b.amount, 0));
  return { breakdown, total };
}

/**
 * Simulate a German annuity loan month by month with a fixed monthly payment.
 * Optionally the interest rate changes after `fixedMonths` (to model a
 * follow-up loan / Anschlussfinanzierung at a different rate).
 *
 * Captures the remaining balance (Restschuld) and interest paid at the end of
 * the fixed-interest period. If the loan never amortizes, payoffYears is null.
 */
export function buildAmortization(
  loanAmount: number,
  annualInterestRatePct: number,
  monthlyAnnuity: number,
  fixedMonths = Infinity,
  followUpRatePct = annualInterestRatePct,
  annualExtraPayment = 0,
): {
  schedule: AmortizationPoint[];
  payoffYears: number | null;
  totalInterest: number;
  restschuldAtFixedEnd: number;
  interestDuringFixed: number;
} {
  const rate1 = annualInterestRatePct / 100 / 12;
  const rate2 = followUpRatePct / 100 / 12;
  const extra = Math.max(0, annualExtraPayment);
  const schedule: AmortizationPoint[] = [];

  if (loanAmount <= 0) {
    return {
      schedule,
      payoffYears: 0,
      totalInterest: 0,
      restschuldAtFixedEnd: 0,
      interestDuringFixed: 0,
    };
  }

  let balance = loanAmount;
  let cumulativeInterest = 0;
  let cumulativePrincipal = 0;
  let month = 0;
  let lumpThisYear = 0;
  let restschuldAtFixedEnd = loanAmount;
  let interestDuringFixed = 0;
  const MAX_MONTHS = 60 * 12; // 60 year safety cap

  // Detect non-amortizing loans (annuity does not cover the first-month interest
  // and there are no annual lump sums to chip away at the balance).
  if (rate1 > 0 && monthlyAnnuity <= loanAmount * rate1 && extra <= 0) {
    for (let y = 1; y <= 40; y++) {
      cumulativeInterest += loanAmount * rate1 * 12;
      schedule.push({
        year: CURRENT_YEAR + y,
        remainingBalance: round2(loanAmount),
        cumulativeInterest: round2(cumulativeInterest),
        cumulativePrincipal: 0,
        lumpSum: 0,
      });
    }
    const fixedYearsCap = Number.isFinite(fixedMonths) ? fixedMonths / 12 : 40;
    return {
      schedule,
      payoffYears: null,
      totalInterest: round2(cumulativeInterest),
      restschuldAtFixedEnd: round2(loanAmount),
      interestDuringFixed: round2(loanAmount * rate1 * 12 * Math.min(40, fixedYearsCap)),
    };
  }

  while (balance > 0.01 && month < MAX_MONTHS) {
    const rate = month < fixedMonths ? rate1 : rate2;
    const interest = balance * rate;
    let principal = monthlyAnnuity - interest;
    if (principal > balance) principal = balance;
    balance -= principal;
    cumulativeInterest += interest;
    cumulativePrincipal += principal;
    month++;

    // Apply the annual lump-sum extra repayment at each year boundary.
    if (extra > 0 && month % 12 === 0 && balance > 0) {
      const lump = Math.min(extra, balance);
      balance -= lump;
      cumulativePrincipal += lump;
      lumpThisYear = lump;
    }

    if (month === fixedMonths) {
      restschuldAtFixedEnd = Math.max(balance, 0);
      interestDuringFixed = cumulativeInterest;
    }

    if (month % 12 === 0 || balance <= 0.01) {
      schedule.push({
        year: CURRENT_YEAR + Math.ceil(month / 12),
        remainingBalance: round2(Math.max(balance, 0)),
        cumulativeInterest: round2(cumulativeInterest),
        cumulativePrincipal: round2(cumulativePrincipal),
        lumpSum: round2(lumpThisYear),
      });
      lumpThisYear = 0;
    }
  }

  // Loan repaid before the fixed period ended.
  if (month < fixedMonths) {
    restschuldAtFixedEnd = 0;
    interestDuringFixed = cumulativeInterest;
  }

  const paidOff = balance <= 0.01;
  return {
    schedule,
    payoffYears: paidOff ? round2(month / 12) : null,
    totalInterest: round2(cumulativeInterest),
    restschuldAtFixedEnd: round2(restschuldAtFixedEnd),
    interestDuringFixed: round2(interestDuringFixed),
  };
}

/**
 * Monthly annuity payment required to fully repay `principal` over `months`
 * at a monthly interest rate `monthlyRate` (standard annuity formula).
 */
export function annuityToPayOff(principal: number, monthlyRate: number, months: number): number {
  if (principal <= 0 || months <= 0) return 0;
  if (monthlyRate === 0) return principal / months;
  const factor = Math.pow(1 + monthlyRate, months);
  return (principal * monthlyRate * factor) / (factor - 1);
}

/** Remaining balance after `months`, given a two-phase interest rate. */
function balanceAfterMonths(
  loanAmount: number,
  rate1: number,
  rate2: number,
  fixedMonths: number,
  payment: number,
  months: number,
): number {
  let bal = loanAmount;
  for (let m = 0; m < months; m++) {
    if (bal <= 0) return bal;
    const r = m < fixedMonths ? rate1 : rate2;
    bal = bal - (payment - bal * r);
  }
  return bal;
}

/**
 * The fixed monthly payment that repays the loan in exactly `targetMonths`,
 * accounting for the rate switching from rate1 to rate2 after the fixed period.
 * Solved by bisection.
 */
export function solveAnnuityForTarget(
  loanAmount: number,
  rate1: number,
  rate2: number,
  fixedMonths: number,
  targetMonths: number,
): number {
  if (loanAmount <= 0 || targetMonths <= 0) return 0;
  let lo = 0; // pays nothing -> balance grows -> positive residual
  let hi = loanAmount; // pays off almost immediately -> negative residual
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    const residual = balanceAfterMonths(loanAmount, rate1, rate2, fixedMonths, mid, targetMonths);
    if (residual > 0) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/** Main entry point: turn inputs into a full Results object. */
export function computeResults(
  apartment: Apartment,
  loan: LoanParams,
  costs: CostSettings,
): Results {
  const price = Math.max(apartment.purchasePrice, 0);

  // --- Purchase & financing ---
  const { breakdown: closingCostBreakdown, total: closingCosts } = computeClosingCosts(price, costs);
  const renovationCost = Math.max(0, apartment.renovationCost ?? 0);
  const totalInvestment = round2(price + closingCosts + renovationCost);

  // The loan is sized on the purchase (+ closing costs if financed) — never on the
  // renovation, which you fund in cash.
  const financedBase = loan.financeClosingCosts ? round2(price + closingCosts) : price;
  const loanAmount = round2(Math.max(financedBase - loan.downPayment, 0));
  // Cash actually put in = equity plus any costs not covered by the loan, plus renovation.
  const cashInvested = round2(totalInvestment - loanAmount);

  // --- Mortgage (annuity) ---
  const fixedMonths = Math.max(1, Math.round(loan.fixedRatePeriodYears * 12));
  const monthlyRate = loan.annualInterestRatePct / 100 / 12;
  const followUpMonthlyRate = loan.followUpInterestRatePct / 100 / 12;

  // Payment needed to repay in exactly the target years (used forced or as advice).
  const targetMonths = Math.max(1, Math.round(loan.targetPayoffYears * 12));
  const targetPaymentRaw = solveAnnuityForTarget(
    loanAmount,
    monthlyRate,
    followUpMonthlyRate,
    fixedMonths,
    targetMonths,
  );
  const targetPayment = round2(targetPaymentRaw);
  const targetImpliedTilgungPct = loanAmount > 0
    ? round2((targetPayment * 12) / loanAmount * 100 - loan.annualInterestRatePct)
    : 0;

  const isPayoffWithin = loan.repaymentStrategy === 'payoffWithinFixed';

  let rawAnnuity: number;
  if (loan.forceTargetPayoff) {
    // Auto-size the payment to hit the target payoff exactly.
    rawAnnuity = targetPaymentRaw;
  } else {
    // Standard German annuity: the interest rate and the initial Tilgung rate are
    // ADDED together to form one fixed monthly payment. This drives BOTH options —
    // they differ only in the interest rate assumed after the fixed period.
    rawAnnuity = (loanAmount * ((loan.annualInterestRatePct + loan.initialRepaymentPct) / 100)) / 12;
  }
  const monthlyAnnuity = round2(rawAnnuity);

  // The rate applied after the fixed period: the follow-up rate, except in the
  // pure "repay within fixed" plan where we assume the same rate throughout.
  const postFixedRatePct = isPayoffWithin && !loan.forceTargetPayoff
    ? loan.annualInterestRatePct
    : loan.followUpInterestRatePct;

  const {
    schedule,
    payoffYears,
    totalInterest,
    restschuldAtFixedEnd: simRestschuld,
    interestDuringFixed,
  } = buildAmortization(
    loanAmount,
    loan.annualInterestRatePct,
    rawAnnuity,
    fixedMonths,
    postFixedRatePct,
    loan.annualExtraPayment,
  );

  // In payoff-within mode the same rate is assumed throughout, so there is no
  // refinancing shock — but the loan may still carry a Restschuld at the end of
  // the fixed period if the Tilgung is modest. Report it honestly for both options.
  const restschuldAtFixedEnd = simRestschuld;
  const fullyRepaidWithinFixed = loanAmount > 0 && restschuldAtFixedEnd <= 0.01;

  // Does the active plan repay within the target?
  const meetsTarget = loanAmount <= 0
    ? true
    : loan.forceTargetPayoff
      ? true
      : payoffYears !== null && payoffYears <= loan.targetPayoffYears + 0.08;

  // Tilgung % implied by the chosen payment (helpful in payoffWithinFixed mode).
  const impliedRepaymentPct = loanAmount > 0
    ? round2((monthlyAnnuity * 12) / loanAmount * 100 - loan.annualInterestRatePct)
    : 0;

  let payoffDateLabel = 'Never (payment too low)';
  if (payoffYears !== null) {
    payoffDateLabel = payoffYears === 0
      ? 'Paid in cash'
      : `~${Math.ceil(payoffYears)} years (≈ ${CURRENT_YEAR + Math.ceil(payoffYears)})`;
  }

  // --- Cash flow (monthly) ---
  const annualRent = apartment.monthlyColdRent * 12;
  const monthlyVacancyCost = round2((annualRent * (costs.vacancyPct / 100)) / 12);
  const effectiveMonthlyRent = round2(apartment.monthlyColdRent - monthlyVacancyCost);
  const nonRecoverableHausgeld = round2(
    apartment.hausgeld * (1 - clamp01(apartment.hausgeldRecoverableRatio)),
  );
  const monthlyMaintenance = round2((price * (costs.maintenanceReservePctPerYear / 100)) / 12);
  const monthlyManagement = round2(costs.managementPerMonth);
  const monthlyOperatingCosts = round2(
    nonRecoverableHausgeld + monthlyMaintenance + monthlyManagement,
  );
  const monthlyCashFlowBeforeLoan = round2(effectiveMonthlyRent - monthlyOperatingCosts);
  const monthlyCashFlowAfterLoan = round2(monthlyCashFlowBeforeLoan - monthlyAnnuity);

  // First-month split of the fixed annuity into interest vs. Tilgung (principal).
  // The Tilgung portion isn't money lost — it pays down the loan and builds equity.
  const monthlyLoanInterest = round2(loanAmount * monthlyRate);
  const monthlyLoanPrincipal = round2(Math.max(0, monthlyAnnuity - monthlyLoanInterest));

  // --- Cash-flow-positive timeline ---
  // While paying the loan, monthly cash flow is monthlyCashFlowAfterLoan.
  // Once the loan is repaid the annuity stops, so cash flow jumps to
  // monthlyCashFlowBeforeLoan ("what's left over"). Work out when the flip happens.
  const monthlyIncomeAfterPayoff = monthlyCashFlowBeforeLoan;
  const cashFlowPositiveFromStart = monthlyCashFlowAfterLoan >= 0;
  let cashFlowPositiveYears: number | null;
  let totalOutOfPocketUntilPositive = 0;
  let cashFlowPositiveLabel: string;

  if (loanAmount <= 0) {
    // Cash purchase: cash flow is just the operating result from day one.
    cashFlowPositiveYears = monthlyCashFlowBeforeLoan >= 0 ? 0 : null;
    cashFlowPositiveLabel = monthlyCashFlowBeforeLoan >= 0
      ? 'Positive from day one (no loan).'
      : 'Running costs exceed the rent even without a loan.';
  } else if (cashFlowPositiveFromStart) {
    cashFlowPositiveYears = 0;
    cashFlowPositiveLabel = 'Positive from month one — rent covers all costs and the loan.';
  } else if (monthlyCashFlowBeforeLoan > 0 && payoffYears !== null) {
    // Negative during the loan, flips positive once it's repaid.
    cashFlowPositiveYears = payoffYears;
    totalOutOfPocketUntilPositive = round2(-monthlyCashFlowAfterLoan * payoffYears * 12);
    cashFlowPositiveLabel = `Turns positive when the loan is repaid in ~${Math.ceil(payoffYears)} years (≈ ${CURRENT_YEAR + Math.ceil(payoffYears)}).`;
  } else {
    // Even without the loan the property loses money each month.
    cashFlowPositiveYears = null;
    cashFlowPositiveLabel = 'Never at these numbers — even after payoff the rent does not cover running costs.';
  }

  // --- Investment metrics ---
  const grossYieldPct = price > 0 ? round2((annualRent / price) * 100) : 0;
  const annualNetOperatingIncome = monthlyCashFlowBeforeLoan * 12;
  const netYieldPct = totalInvestment > 0 ? round2((annualNetOperatingIncome / totalInvestment) * 100) : 0;
  const priceToRentMultiple = annualRent > 0 ? round2(price / annualRent) : 0;
  const cashOnCashPct = cashInvested > 0
    ? round2(((monthlyCashFlowAfterLoan * 12) / cashInvested) * 100)
    : 0;

  // --- Benchmark (vs. the manual area averages) ---
  // Effective area for the €/m² comparison: living area plus a weighted share of
  // the balcony (German Wohnflächenverordnung usually counts a balcony at ~25%).
  const balconySqm = Math.max(0, apartment.balconySqm ?? 0);
  const balconyWeightPct = Math.min(100, Math.max(0, apartment.balconyWeightPct ?? 25));
  const balconyWeightedSqm = balconySqm * (balconyWeightPct / 100);
  const effectiveSqm = apartment.sizeSqm + balconyWeightedSqm;
  const includesBalcony = balconyWeightedSqm > 0;
  const pricePerSqm = effectiveSqm > 0 ? round2(price / effectiveSqm) : 0;
  const rentPerSqm = effectiveSqm > 0 ? round2(apartment.monthlyColdRent / effectiveSqm) : 0;
  const refBuyPerSqm = Math.max(0, apartment.avgPricePerSqm);
  const refRentPerSqm = Math.max(0, apartment.avgRentPerSqm);
  const hasRentRef = refRentPerSqm > 0;
  const benchmark = {
    hasData: refBuyPerSqm > 0,
    areaLabel: apartment.areaLabel?.trim() || '',
    refBuyPerSqm,
    refRentPerSqm,
    hasRentRef,
    buyDeltaPct: refBuyPerSqm > 0
      ? round2(((pricePerSqm - refBuyPerSqm) / refBuyPerSqm) * 100)
      : 0,
    rentDeltaPct: hasRentRef
      ? round2(((rentPerSqm - refRentPerSqm) / refRentPerSqm) * 100)
      : 0,
    locationScore: Math.min(10, Math.max(0, apartment.locationScore || 0)),
    effectiveSqm: round2(effectiveSqm),
    includesBalcony,
    balconyWeightPct,
  };

  // --- Verdict ---
  const verdict = computeVerdict({
    grossYieldPct,
    monthlyCashFlowAfterLoan,
    buyDeltaPct: benchmark.buyDeltaPct,
    hasBenchmark: benchmark.hasData,
    locationScore: benchmark.locationScore,
    priceToRentMultiple,
  });

  // Baseline schedule with NO lump sums (same payment & rate) so the chart can
  // show "with vs. without extra payments". Only needed when a lump sum is set.
  const amortizationNoExtra =
    loan.annualExtraPayment > 0
      ? buildAmortization(
          loanAmount,
          loan.annualInterestRatePct,
          rawAnnuity,
          fixedMonths,
          postFixedRatePct,
          0,
        ).schedule
      : [];

  return {
    closingCosts,
    closingCostBreakdown,
    totalInvestment,
    loanAmount,
    cashInvested,
    monthlyAnnuity,
    payoffYears,
    payoffDateLabel,
    totalInterest,
    amortization: schedule,
    amortizationNoExtra,
    fixedRatePeriodYears: loan.fixedRatePeriodYears,
    repaymentStrategy: loan.repaymentStrategy,
    restschuldAtFixedEnd,
    interestDuringFixed,
    impliedRepaymentPct,
    fullyRepaidWithinFixed,
    targetPayoffYears: loan.targetPayoffYears,
    targetForced: loan.forceTargetPayoff,
    targetPayment,
    targetImpliedTilgungPct,
    meetsTarget,
    effectiveMonthlyRent,
    nonRecoverableHausgeld,
    monthlyMaintenance,
    monthlyManagement,
    monthlyVacancyCost,
    monthlyOperatingCosts,
    monthlyCashFlowBeforeLoan,
    monthlyCashFlowAfterLoan,
    monthlyLoanInterest,
    monthlyLoanPrincipal,
    cashFlowPositiveFromStart,
    cashFlowPositiveYears,
    cashFlowPositiveLabel,
    monthlyIncomeAfterPayoff,
    totalOutOfPocketUntilPositive,
    grossYieldPct,
    netYieldPct,
    priceToRentMultiple,
    cashOnCashPct,
    pricePerSqm,
    rentPerSqm,
    benchmark,
    verdict,
  };
}

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

/**
 * Weighted 0..100 investment score with a Buy / Caution / Avoid label.
 * Weights: yield 35, cash flow 30, price vs district 20, location 15.
 */
function computeVerdict(input: {
  grossYieldPct: number;
  monthlyCashFlowAfterLoan: number;
  buyDeltaPct: number;
  hasBenchmark: boolean;
  locationScore: number;
  priceToRentMultiple: number;
}): Results['verdict'] {
  const reasons: string[] = [];

  // Yield sub-score (0..1): 2.5% -> 0, 5%+ -> 1
  const yieldScore = clampNorm(input.grossYieldPct, 2.5, 5);
  if (input.grossYieldPct >= 4) reasons.push(`Healthy gross yield (${input.grossYieldPct}%)`);
  else if (input.grossYieldPct < 3) reasons.push(`Low gross yield (${input.grossYieldPct}%)`);

  // Cash flow sub-score (0..1): -400€/mo -> 0, +200€/mo -> 1
  const cfScore = clampNorm(input.monthlyCashFlowAfterLoan, -400, 200);
  if (input.monthlyCashFlowAfterLoan >= 0) reasons.push('Positive monthly cash flow');
  else reasons.push(`Negative cash flow (${Math.round(input.monthlyCashFlowAfterLoan)} €/mo)`);

  // Price vs district sub-score (0..1): +20% over -> 0, -15% under -> 1
  let priceScore = 0.5;
  if (input.hasBenchmark) {
    priceScore = clampNorm(-input.buyDeltaPct, -20, 15);
    if (input.buyDeltaPct <= -5) reasons.push(`Priced ${Math.abs(input.buyDeltaPct)}% below district avg`);
    else if (input.buyDeltaPct >= 10) reasons.push(`Priced ${input.buyDeltaPct}% above district avg`);
  }

  // Location sub-score (0..1): score 3 -> 0, 9 -> 1
  const locScore = input.hasBenchmark ? clampNorm(input.locationScore, 3, 9) : 0.5;

  const score = Math.round(
    (yieldScore * 35 + cfScore * 30 + priceScore * 20 + locScore * 15),
  );

  let label: Results['verdict']['label'] = 'Avoid';
  if (score >= 65) label = 'Buy';
  else if (score >= 45) label = 'Caution';

  return { label, score, reasons };
}

/** Normalize a value between lo and hi into 0..1 (clamped). */
function clampNorm(value: number, lo: number, hi: number): number {
  if (hi === lo) return 0.5;
  const t = (value - lo) / (hi - lo);
  return Math.min(1, Math.max(0, t));
}

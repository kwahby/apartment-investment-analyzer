import type { Apartment, CostSettings, LoanParams, ProjectionParams, Profile } from '../types';
import { computeResults } from './finance';
import { computeProjection } from './projection';
import { estimateMarginalRate } from './germanTax';

export type MonthlyVerdict =
  | 'positive'
  | 'comfortable'
  | 'manageable'
  | 'stretched'
  | 'unaffordable';

export interface AffordabilityResult {
  // Monthly buying power
  freeCashMonthly: number; // salary − expenses
  monthlyTopUp: number; // out-of-pocket the investment needs (0 if cash-flow positive)
  monthlyLeftAfter: number; // free cash after the top-up
  topUpSharePct: number; // top-up as % of free cash
  monthlyVerdict: MonthlyVerdict;
  monthlyCashFlow: number; // the deal's own monthly cash flow after loan

  // Upfront
  upfrontNeeded: number; // down payment + closing + renovation
  savingsAfter: number; // savings − upfront
  upfrontCovered: boolean;

  // Tax impact (rental, at your marginal rate incl. church tax)
  effectiveMarginalPct: number;
  /** Estimated income-tax marginal rate (before church tax), from income + tax class. */
  incomeMarginalPct: number;
  /** Estimated taxable income (zvE) used for the marginal-rate estimate. */
  taxableIncome: number;
  /** Whether married-couple splitting was applied. */
  splitting: boolean;
  year1TaxEffect: number; // + = refund to you, − = you pay extra
  totalTaxEffect: number; // over the holding period
  refundYears: number; // number of years you get money back
  taxRefundMonthlyEquiv: number; // year-1 effect spread over 12 months
}

export function computeAffordability(
  apartment: Apartment,
  loan: LoanParams,
  costs: CostSettings,
  projection: ProjectionParams,
  profile: Profile,
): AffordabilityResult {
  const res = computeResults(apartment, loan, costs);

  const freeCashMonthly = profile.netMonthlySalary - profile.monthlyExpenses;
  const monthlyCashFlow = res.monthlyCashFlowAfterLoan;
  const monthlyTopUp = Math.max(0, -monthlyCashFlow);
  const monthlyLeftAfter = freeCashMonthly - monthlyTopUp;
  const topUpSharePct =
    freeCashMonthly > 0 ? (monthlyTopUp / freeCashMonthly) * 100 : monthlyTopUp > 0 ? 999 : 0;

  let monthlyVerdict: MonthlyVerdict;
  if (monthlyCashFlow >= 0) monthlyVerdict = 'positive';
  else if (monthlyTopUp >= freeCashMonthly) monthlyVerdict = 'unaffordable';
  else if (topUpSharePct <= 25) monthlyVerdict = 'comfortable';
  else if (topUpSharePct <= 50) monthlyVerdict = 'manageable';
  else monthlyVerdict = 'stretched';

  const upfrontNeeded = res.cashInvested;
  const savingsAfter = profile.savings - upfrontNeeded;
  const upfrontCovered = savingsAfter >= 0;

  // Estimate the marginal tax rate from the user's income, tax class and children
  // (German §32a EStG tariff), then add church tax on top.
  const est = estimateMarginalRate({
    grossAnnualIncome: profile.grossAnnualIncome,
    taxClass: profile.taxClass,
    children: profile.children,
    churchTaxPct: profile.churchTaxPct,
  });
  const effectiveMarginalPct = est.effectivePct;
  const taxProj = computeProjection(apartment, costs, res, {
    ...projection,
    taxEnabled: true,
    marginalTaxRatePct: effectiveMarginalPct,
  });
  // year.tax: + = you pay, − = refund. Flip sign so + = money back to you.
  const effects = taxProj.years.map((y) => -y.tax);
  const year1TaxEffect = Math.round(effects[0] ?? 0);
  const totalTaxEffect = Math.round(effects.reduce((a, b) => a + b, 0));
  const refundYears = effects.filter((e) => e > 0).length;
  const taxRefundMonthlyEquiv = Math.round(year1TaxEffect / 12);

  return {
    freeCashMonthly: Math.round(freeCashMonthly),
    monthlyTopUp: Math.round(monthlyTopUp),
    monthlyLeftAfter: Math.round(monthlyLeftAfter),
    topUpSharePct: Math.round(topUpSharePct),
    monthlyVerdict,
    monthlyCashFlow: Math.round(monthlyCashFlow),
    upfrontNeeded: Math.round(upfrontNeeded),
    savingsAfter: Math.round(savingsAfter),
    upfrontCovered,
    effectiveMarginalPct: Math.round(effectiveMarginalPct * 10) / 10,
    incomeMarginalPct: est.incomeMarginalPct,
    taxableIncome: est.taxableIncome,
    splitting: est.splitting,
    year1TaxEffect,
    totalTaxEffect,
    refundYears,
    taxRefundMonthlyEquiv,
  };
}

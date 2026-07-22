import type { Apartment, CostSettings, LoanParams, ProjectionParams } from '../types';
import { computeResults } from './finance';
import { computeProjection } from './projection';

export type GoalMetric = 'grossYield' | 'netYield' | 'breakEvenCashFlow' | 'irr';

export interface GoalSeekResult {
  /** True if a max price meeting the target exists in a sensible range. */
  achievable: boolean;
  /** Highest purchase price that still meets the target, or null if unachievable. */
  maxPrice: number | null;
  /** The current metric value at the current price. */
  currentValue: number;
  /** True if the current price already meets the target. */
  meetsAtCurrent: boolean;
}

/** Evaluate the chosen metric at a candidate purchase price (other inputs fixed). */
function metricAt(
  metric: GoalMetric,
  apartment: Apartment,
  loan: LoanParams,
  costs: CostSettings,
  projection: ProjectionParams,
  price: number,
): number {
  const apt: Apartment = { ...apartment, purchasePrice: price };
  const res = computeResults(apt, loan, costs);
  switch (metric) {
    case 'grossYield':
      return res.grossYieldPct;
    case 'netYield':
      return res.netYieldPct;
    case 'breakEvenCashFlow':
      return res.monthlyCashFlowAfterLoan;
    case 'irr': {
      const proj = computeProjection(apt, costs, res, projection);
      return proj.irrPct ?? -999;
    }
  }
}

/**
 * Find the highest purchase price at which `metric >= target`, holding every
 * other input fixed. All these metrics fall as the price rises, so we bisect
 * for the crossing point. For break-even cash flow the target is 0.
 */
export function goalSeekMaxPrice(
  metric: GoalMetric,
  target: number,
  apartment: Apartment,
  loan: LoanParams,
  costs: CostSettings,
  projection: ProjectionParams,
): GoalSeekResult {
  const goal = metric === 'breakEvenCashFlow' ? 0 : target;
  const currentValue = metricAt(metric, apartment, loan, costs, projection, apartment.purchasePrice);
  const meetsAtCurrent = currentValue >= goal;

  const lo = 1000; // very cheap → metric is high
  const hi = Math.max(apartment.purchasePrice * 4, 3_000_000); // very expensive → metric is low

  const mLo = metricAt(metric, apartment, loan, costs, projection, lo);
  const mHi = metricAt(metric, apartment, loan, costs, projection, hi);

  // Even the cheapest price can't reach the target → unachievable.
  if (mLo < goal) {
    return { achievable: false, maxPrice: null, currentValue, meetsAtCurrent };
  }
  // Even the most expensive price still beats the target → target is very easy.
  if (mHi >= goal) {
    return { achievable: true, maxPrice: hi, currentValue, meetsAtCurrent };
  }

  // Bisection: keep `a` where metric >= goal and `b` where metric < goal.
  let a = lo;
  let b = hi;
  for (let i = 0; i < 60; i++) {
    const mid = (a + b) / 2;
    const m = metricAt(metric, apartment, loan, costs, projection, mid);
    if (m >= goal) a = mid;
    else b = mid;
  }
  return { achievable: true, maxPrice: Math.round(a), currentValue, meetsAtCurrent };
}

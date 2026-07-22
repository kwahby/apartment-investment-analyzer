import type { Apartment, CostSettings, LoanParams } from '../types';
import { computeResults } from './finance';

type Label = 'Buy' | 'Caution' | 'Avoid';
const RANK: Record<Label, number> = { Buy: 2, Caution: 1, Avoid: 0 };

export interface Flip {
  variable: 'interestRate' | 'price' | 'rent';
  label: string;
  currentLabel: Label;
  /** The value at which the verdict first downgrades, or null if it holds across the range. */
  flipValue: number | null;
  flipTo: Label | null;
  /** 'up' if the value rising worsens the deal, 'down' if falling worsens it. */
  worsening: 'up' | 'down';
  unit: string;
}

/** Bisection for the boundary where the verdict rank first drops below the current one. */
function findDowngrade(evalLabel: (x: number) => Label, current: number, extreme: number) {
  const curRank = RANK[evalLabel(current)];
  if (RANK[evalLabel(extreme)] >= curRank) return null; // never downgrades in range
  let a = current; // not worse than current
  let b = extreme; // worse than current
  for (let i = 0; i < 50; i++) {
    const mid = (a + b) / 2;
    if (RANK[evalLabel(mid)] < curRank) b = mid;
    else a = mid;
  }
  return { value: b, to: evalLabel(b) };
}

/**
 * For the current inputs, find where the verdict downgrades as the interest rate
 * rises, the price rises, or the rent falls (the three biggest levers).
 */
export function computeTippingPoints(
  apartment: Apartment,
  loan: LoanParams,
  costs: CostSettings,
): Flip[] {
  const current = computeResults(apartment, loan, costs).verdict.label;

  const rateFlip = findDowngrade(
    (rate) => computeResults(apartment, { ...loan, annualInterestRatePct: rate }, costs).verdict.label,
    loan.annualInterestRatePct,
    15,
  );
  const priceFlip = findDowngrade(
    (price) => computeResults({ ...apartment, purchasePrice: price }, loan, costs).verdict.label,
    apartment.purchasePrice,
    apartment.purchasePrice * 2.5,
  );
  const rentFlip = findDowngrade(
    (rent) => computeResults({ ...apartment, monthlyColdRent: rent }, loan, costs).verdict.label,
    apartment.monthlyColdRent,
    Math.max(1, apartment.monthlyColdRent * 0.3),
  );

  return [
    {
      variable: 'interestRate',
      label: 'Interest rate',
      currentLabel: current,
      flipValue: rateFlip ? Math.round(rateFlip.value * 10) / 10 : null,
      flipTo: rateFlip?.to ?? null,
      worsening: 'up',
      unit: '%',
    },
    {
      variable: 'price',
      label: 'Purchase price',
      currentLabel: current,
      flipValue: priceFlip ? Math.round(priceFlip.value / 1000) * 1000 : null,
      flipTo: priceFlip?.to ?? null,
      worsening: 'up',
      unit: '€',
    },
    {
      variable: 'rent',
      label: 'Monthly rent',
      currentLabel: current,
      flipValue: rentFlip ? Math.round(rentFlip.value / 5) * 5 : null,
      flipTo: rentFlip?.to ?? null,
      worsening: 'down',
      unit: '€',
    },
  ];
}

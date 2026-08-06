import { describe, expect, it } from 'vitest';
import type { Projection, Results } from '../types';
import { calculate } from './wealthCreationScore';

function deal(scale: number) {
  const results = {
    cashInvested: 100_000 * scale,
    loanAmount: 300_000 * scale,
  } as Results;
  const projection = {
    saleValue: 500_000 * scale,
    remainingLoanAtSale: 200_000 * scale,
    totalProfit: 100_000 * scale,
    moneyMultiple: 2,
  } as Projection;

  return { purchasePrice: 400_000 * scale, results, projection };
}

describe('wealth creation score', () => {
  it('does not reward a deal merely for having a larger purchase price', () => {
    expect(calculate(deal(1))).toBe(calculate(deal(2)));
  });

  it('increases when equity and profit improve', () => {
    const base = deal(1);
    const stronger = {
      ...base,
      projection: {
        ...base.projection,
        saleValue: 560_000,
        remainingLoanAtSale: 150_000,
        totalProfit: 180_000,
        moneyMultiple: 2.4,
      },
    };
    expect(calculate(stronger)).toBeGreaterThan(calculate(base) ?? 0);
  });
});
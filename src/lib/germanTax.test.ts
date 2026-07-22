import { describe, it, expect } from 'vitest';
import { incomeTax, marginalRate, estimateMarginalRate, afaRateForBuildYear } from './germanTax';

describe('germanTax §32a tariff', () => {
  it('is tax-free up to the Grundfreibetrag', () => {
    expect(incomeTax(12000)).toBe(0);
    expect(marginalRate(10000)).toBe(0);
  });

  it('hits the top marginal rates in the upper zones', () => {
    expect(marginalRate(100000)).toBeCloseTo(0.42, 5);
    expect(marginalRate(300000)).toBeCloseTo(0.45, 5);
  });

  it('produces a rising tax for rising income', () => {
    expect(incomeTax(60000)).toBeGreaterThan(incomeTax(30000));
  });
});

describe('estimateMarginalRate', () => {
  const base = { grossAnnualIncome: 80000, children: 0, churchTaxPct: 0 } as const;

  it('applies married-couple splitting (lower rate than single for same income)', () => {
    const single = estimateMarginalRate({ ...base, taxClass: 1 });
    const married = estimateMarginalRate({ ...base, taxClass: 3 });
    expect(married.splitting).toBe(true);
    expect(married.incomeMarginalPct).toBeLessThan(single.incomeMarginalPct);
  });

  it('adds church tax on top of the income-tax rate', () => {
    const none = estimateMarginalRate({ ...base, taxClass: 1, churchTaxPct: 0 });
    const church = estimateMarginalRate({ ...base, taxClass: 1, churchTaxPct: 9 });
    expect(church.effectivePct).toBeGreaterThan(none.effectivePct);
    expect(church.effectivePct).toBeCloseTo(none.incomeMarginalPct * 1.09, 1);
  });

  it('lowers taxable income (and can lower the rate) with children', () => {
    const noKids = estimateMarginalRate({ ...base, taxClass: 1, children: 0 });
    const kids = estimateMarginalRate({ ...base, taxClass: 1, children: 3 });
    expect(kids.taxableIncome).toBeLessThan(noKids.taxableIncome);
  });
});

describe('afaRateForBuildYear', () => {
  it('maps completion year to the typical AfA rate', () => {
    expect(afaRateForBuildYear(1910)).toBe(2.5);
    expect(afaRateForBuildYear(1960)).toBe(2);
    expect(afaRateForBuildYear(2024)).toBe(3);
    expect(afaRateForBuildYear(undefined)).toBeUndefined();
    expect(afaRateForBuildYear(0)).toBeUndefined();
  });
});

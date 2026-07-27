import { describe, it, expect } from 'vitest';
import { goalSeekMaxPrice } from './goalSeek';
import type { Apartment, CostSettings, LoanParams, ProjectionParams } from '../types';

const costs: CostSettings = {
  transferTaxPct: 6,
  notaryPct: 1.5,
  landRegistryPct: 0.5,
  agentCommissionPct: 3.57,
  maintenanceReservePctPerYear: 1,
  maintenanceSqmPerYear: 12,
  maintenanceMode: 'pct',
  managementPerMonth: 30,
  vacancyPct: 3,
};

const apartment: Apartment = {
  title: 'Test',
  areaLabel: '',
  purchasePrice: 400000,
  sizeSqm: 80,
  monthlyColdRent: 1500,
  hausgeld: 250,
  hausgeldRecoverableRatio: 0.6,
  buildYear: 1980,
  avgPricePerSqm: 5000,
  avgRentPerSqm: 15,
  locationScore: 8,
};

const loan: LoanParams = {
  downPayment: 100000,
  financeClosingCosts: false,
  annualInterestRatePct: 4,
  initialRepaymentPct: 2,
  fixedRatePeriodYears: 10,
  repaymentStrategy: 'followUp',
  followUpInterestRatePct: 4,
  annualExtraPayment: 0,
  targetPayoffYears: 15,
  forceTargetPayoff: false,
};

const projection: ProjectionParams = {
  holdingYears: 12,
  annualAppreciationPct: 2,
  annualRentGrowthPct: 1.5,
  annualCostInflationPct: 2,
  sellingCostsPct: 2,
  taxEnabled: false,
  marginalTaxRatePct: 42,
  buildingSharePct: 70,
  afaRatePct: 2,
  sonderAfaEnabled: false,
  sonder7bEligibleAreaSqm: 0,
  sonder7bCostPerSqm: 0,
  etfReturnPct: 7,
};

describe('goalSeekMaxPrice', () => {
  it('finds the price where gross yield exactly equals the target', () => {
    // Rent 1500/mo = 18000/yr. For 4.5% gross yield → price = 18000/0.045 = 400000.
    const res = goalSeekMaxPrice('grossYield', 4.5, apartment, loan, costs, projection);
    expect(res.achievable).toBe(true);
    expect(res.maxPrice).toBeCloseTo(400000, -3); // within ~1k
  });

  it('reports the current price qualifies when the target is easy', () => {
    const res = goalSeekMaxPrice('grossYield', 3, apartment, loan, costs, projection);
    expect(res.meetsAtCurrent).toBe(true);
    expect(res.maxPrice).not.toBeNull();
    expect(res.maxPrice!).toBeGreaterThan(apartment.purchasePrice);
  });

  it('flags the current price as too high for an aggressive yield target', () => {
    const res = goalSeekMaxPrice('grossYield', 6, apartment, loan, costs, projection);
    expect(res.achievable).toBe(true);
    expect(res.meetsAtCurrent).toBe(false);
    expect(res.maxPrice!).toBeLessThan(apartment.purchasePrice);
  });

  it('a stricter yield target lowers the max price you can pay', () => {
    const loose = goalSeekMaxPrice('grossYield', 4, apartment, loan, costs, projection);
    const strict = goalSeekMaxPrice('grossYield', 6, apartment, loan, costs, projection);
    expect(loose.maxPrice!).toBeGreaterThan(strict.maxPrice!);
  });

  it('solves a break-even cash-flow ceiling below the current price', () => {
    const res = goalSeekMaxPrice('breakEvenCashFlow', 0, apartment, loan, costs, projection);
    // At 400k the deal is cash-flow negative, so the break-even price is lower.
    expect(res.achievable).toBe(true);
    expect(res.maxPrice!).toBeLessThan(apartment.purchasePrice);
  });
});

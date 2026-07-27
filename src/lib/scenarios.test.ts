import { describe, it, expect } from 'vitest';
import { computeScenarios } from './scenarios';
import type {
  Apartment,
  CostSettings,
  LoanParams,
  ProjectionParams,
} from '../types';

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
  areaLabel: 'Test area',
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

describe('computeScenarios', () => {
  const s = computeScenarios(apartment, loan, costs, projection);

  it('returns the cautious, base and optimistic scenarios in order', () => {
    expect(s.map((x) => x.key)).toEqual(['cautious', 'base', 'optimistic']);
  });

  it('gives every scenario a label and at least one assumption line', () => {
    for (const sc of s) {
      expect(sc.label.length).toBeGreaterThan(0);
      expect(sc.assumptions.length).toBeGreaterThan(0);
    }
  });

  it('the base case leaves assumptions unchanged', () => {
    const base = s.find((x) => x.key === 'base')!;
    expect(base.assumptions).toContain('Your current assumptions, unchanged');
  });

  it('optimistic total profit is at least as high as cautious', () => {
    const cautious = s.find((x) => x.key === 'cautious')!;
    const optimistic = s.find((x) => x.key === 'optimistic')!;
    expect(optimistic.totalProfit).toBeGreaterThanOrEqual(cautious.totalProfit);
  });

  it('the cautious case (lower rent, higher rate) has worse monthly cash flow than base', () => {
    const cautious = s.find((x) => x.key === 'cautious')!;
    const base = s.find((x) => x.key === 'base')!;
    expect(cautious.monthlyBeforeTax).toBeLessThan(base.monthlyBeforeTax);
  });

  it('carries the tax flag through from the projection params', () => {
    const taxed = computeScenarios(apartment, loan, costs, { ...projection, taxEnabled: true });
    for (const sc of taxed) {
      expect(sc.taxEnabled).toBe(true);
    }
  });
});

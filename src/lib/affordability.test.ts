import { describe, it, expect } from 'vitest';
import { computeAffordability } from './affordability';
import type { Apartment, CostSettings, LoanParams, ProjectionParams, Profile } from '../types';

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

const profile: Profile = {
  netMonthlySalary: 3500,
  grossAnnualIncome: 75000,
  monthlyExpenses: 1800,
  savings: 150000,
  taxClass: 1,
  children: 0,
  churchTaxPct: 0,
};

describe('computeAffordability', () => {
  it('computes free cash and covers the upfront cost from savings', () => {
    const a = computeAffordability(apartment, loan, costs, projection, profile);
    expect(a.freeCashMonthly).toBe(1700);
    expect(a.upfrontCovered).toBe(true);
    expect(a.savingsAfter).toBeGreaterThan(0);
  });

  it('flags unaffordable when the top-up exceeds free cash', () => {
    const broke = computeAffordability(apartment, loan, costs, projection, {
      ...profile,
      monthlyExpenses: 3400, // only €100 free
    });
    expect(broke.monthlyVerdict).toBe('unaffordable');
  });

  it('church tax raises the effective marginal rate', () => {
    const none = computeAffordability(apartment, loan, costs, projection, profile);
    const church = computeAffordability(apartment, loan, costs, projection, {
      ...profile,
      churchTaxPct: 9,
    });
    expect(church.effectiveMarginalPct).toBeGreaterThan(none.effectiveMarginalPct);
  });

  it('gives a first-year tax refund from depreciation + interest', () => {
    const a = computeAffordability(apartment, loan, costs, projection, profile);
    expect(a.year1TaxEffect).toBeGreaterThan(0);
    expect(a.refundYears).toBeGreaterThan(0);
  });
});

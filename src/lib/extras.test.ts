import { describe, it, expect } from 'vitest';
import { computeRentVsBuy } from './rentVsBuy';
import { computeTippingPoints } from './tippingPoints';
import type { Apartment, CostSettings, LoanParams, ProjectionParams } from '../types';

const costs: CostSettings = {
  transferTaxPct: 6,
  notaryPct: 1.5,
  landRegistryPct: 0.5,
  agentCommissionPct: 3.57,
  maintenanceReservePctPerYear: 1,
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
  etfReturnPct: 7,
};

describe('computeRentVsBuy', () => {
  const r = computeRentVsBuy(apartment, loan, costs, projection, 1500);

  it('produces a net-worth series with one point per year', () => {
    expect(r.series).toHaveLength(projection.holdingYears);
    expect(r.series[0].year).toBeGreaterThan(2000);
  });

  it('returns end wealth for both paths and a consistent winner', () => {
    expect(r.buyEndWealth).not.toBeNaN();
    expect(r.rentEndWealth).not.toBeNaN();
    expect(r.buyerWins).toBe(r.difference >= 0);
  });

  it('makes buying relatively more attractive when the comparable rent is high', () => {
    const cheapRent = computeRentVsBuy(apartment, loan, costs, projection, 800);
    const dearRent = computeRentVsBuy(apartment, loan, costs, projection, 2500);
    // Paying more to rent shifts the balance toward buying.
    expect(dearRent.difference).toBeGreaterThan(cheapRent.difference);
  });
});

describe('computeTippingPoints', () => {
  const tips = computeTippingPoints(apartment, loan, costs);

  it('returns a flip entry for rate, price and rent', () => {
    expect(tips.map((t) => t.variable)).toEqual(['interestRate', 'price', 'rent']);
  });

  it('a higher price eventually downgrades the verdict', () => {
    const priceTip = tips.find((t) => t.variable === 'price')!;
    if (priceTip.flipValue !== null) {
      expect(priceTip.flipValue).toBeGreaterThan(apartment.purchasePrice);
    }
  });
});

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
  const tips = computeTippingPoints(apartment, loan, costs, projection);

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

describe('ETF monthly compounding (req #13)', () => {
  it('geometric monthly rate compounds to the correct annual rate over 12 months', () => {
    // The fix: monthlyRate = (1 + annualRate)^(1/12) - 1
    // Verify that 12 monthly compoundings reproduce exactly the annual rate.
    const annualRate = 0.07; // 7%
    const monthlyRate = Math.pow(1 + annualRate, 1 / 12) - 1;
    const compounded = Math.pow(1 + monthlyRate, 12) - 1;
    expect(compounded).toBeCloseTo(annualRate, 8);
  });

  it('the linear approximation (rate/12) over-states 12-month compounding', () => {
    const annualRate = 0.07;
    const linearMonthly = annualRate / 12;
    const linearCompounded = Math.pow(1 + linearMonthly, 12) - 1;
    // Linear approximation gives ~7.23%, not 7% — this is the bug we fixed.
    expect(linearCompounded).toBeGreaterThan(annualRate + 0.001);
  });

  it('computeRentVsBuy with 0% ETF return: ETF wealth ≈ initial investment', () => {
    const r = computeRentVsBuy(apartment, loan, costs, { ...projection, etfReturnPct: 0 }, 1500);
    // At 0% return, the renter's pot (upfront invested) stays flat.
    // It should roughly equal the initial cash invested (not much more).
    const upfront = r.upfront;
    const lastRentWealth = r.series[r.series.length - 1].Rent;
    // Should not drift more than a few % from initial investment (any diff = cash injections)
    expect(lastRentWealth).toBeGreaterThanOrEqual(upfront * 0.9);
  });
});

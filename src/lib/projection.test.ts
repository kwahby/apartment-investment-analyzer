import { describe, it, expect } from 'vitest';
import { computeResults } from './finance';
import { computeProjection, irr } from './projection';
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

const projParams: ProjectionParams = {
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

const results = computeResults(apartment, loan, costs);

describe('irr', () => {
  it('returns 100% for -100 then +200 after one year', () => {
    expect(irr([-100, 200])).toBeCloseTo(100, 0);
  });

  it('returns 0% when you get exactly your money back', () => {
    expect(irr([-100, 100])).toBeCloseTo(0, 4);
  });

  it('returns null when there is no sign change', () => {
    expect(irr([100, 100, 100])).toBeNull();
  });
});

describe('computeProjection', () => {
  const p = computeProjection(apartment, costs, results, projParams);

  it('produces one row per holding year', () => {
    expect(p.years).toHaveLength(projParams.holdingYears);
    expect(p.years[0].yearIndex).toBe(1);
  });

  it('grows the property value with the appreciation rate', () => {
    expect(p.saleValue).toBeCloseTo(400000 * Math.pow(1.02, 12), 0);
  });

  it('shrinks the loan and builds equity over time', () => {
    const first = p.years[0];
    const last = p.years[p.years.length - 1];
    expect(last.remainingLoan).toBeLessThan(first.remainingLoan);
    expect(last.equity).toBeGreaterThan(first.equity);
  });

  it('deducts selling costs and remaining loan from the sale value', () => {
    expect(p.netSaleProceeds).toBeCloseTo(
      p.saleValue - p.sellingCosts - p.remainingLoanAtSale - p.speculationTax,
      2,
    );
  });

  it('treats a 12-year hold as speculation-tax-free', () => {
    expect(p.speculationTaxFree).toBe(true);
    expect(p.speculationTax).toBe(0);
  });

  it('computes an IRR and a money multiple from the cash invested', () => {
    expect(p.cashInvested).toBeGreaterThan(0);
    expect(p.irrPct).not.toBeNull();
    expect(p.moneyMultiple).toBeGreaterThan(0);
  });
});

describe('computeProjection - after tax', () => {
  it('charges speculation tax on a short (<10y) hold when tax is on', () => {
    const shortHold = computeProjection(apartment, costs, results, {
      ...projParams,
      holdingYears: 5,
      taxEnabled: true,
      annualAppreciationPct: 4,
    });
    expect(shortHold.speculationTaxFree).toBe(false);
    expect(shortHold.speculationTax).toBeGreaterThan(0);
  });

  it('applies depreciation only to the building share (including closing costs)', () => {
    const taxed = computeProjection(apartment, costs, results, {
      ...projParams,
      taxEnabled: true,
    });
    // (400000 + closingCosts) * 70% * 2%
    const expected = (apartment.purchasePrice + results.closingCosts) * 0.7 * 0.02;
    expect(taxed.annualDepreciation).toBeCloseTo(expected, 0);
  });

  it('after-tax total profit differs from pre-tax', () => {
    const pre = computeProjection(apartment, costs, results, projParams);
    const post = computeProjection(apartment, costs, results, {
      ...projParams,
      taxEnabled: true,
    });
    expect(post.totalProfit).not.toBeCloseTo(pre.totalProfit, 0);
  });
});

describe('computeProjection - Sonderabschreibung (§7b)', () => {
  const base = { ...projParams, taxEnabled: true };

  it('deducts an extra 5% of the building value in years 1-4', () => {
    const withSonder = computeProjection(apartment, costs, results, {
      ...base,
      sonderAfaEnabled: true,
    });
    const withoutSonder = computeProjection(apartment, costs, results, base);
    // Building basis now includes closing costs
    const buildingBasis = (apartment.purchasePrice + results.closingCosts) * base.buildingSharePct / 100;
    const extra = buildingBasis * 0.05;

    for (let i = 0; i < 4; i++) {
      expect(withSonder.years[i].depreciation).toBeCloseTo(
        withoutSonder.years[i].depreciation + extra,
        0,
      );
    }
  });

  it('stops the extra depreciation after year 4', () => {
    const withSonder = computeProjection(apartment, costs, results, {
      ...base,
      sonderAfaEnabled: true,
    });
    const withoutSonder = computeProjection(apartment, costs, results, base);
    expect(withSonder.years[4].depreciation).toBeCloseTo(
      withoutSonder.years[4].depreciation,
      0,
    );
  });

  it('lowers taxable income (bigger refunds) in the early years', () => {
    const withSonder = computeProjection(apartment, costs, results, {
      ...base,
      sonderAfaEnabled: true,
    });
    const withoutSonder = computeProjection(apartment, costs, results, base);
    expect(withSonder.years[0].taxableIncome).toBeLessThan(
      withoutSonder.years[0].taxableIncome,
    );
  });

  it('never lets total depreciation exceed the building value', () => {
    const withSonder = computeProjection(apartment, costs, results, {
      ...base,
      sonderAfaEnabled: true,
    });
    const buildingBasis = (apartment.purchasePrice + results.closingCosts) * base.buildingSharePct / 100;
    expect(withSonder.accumulatedDepreciation).toBeLessThanOrEqual(buildingBasis + 0.5);
  });
});

describe('computeProjection - property vs. ETF', () => {
  const p = computeProjection(apartment, costs, results, projParams);

  it('reports the ETF return used and a committed-cash figure', () => {
    expect(p.etfReturnPct).toBe(projParams.etfReturnPct);
    expect(p.totalCashCommitted).toBeGreaterThanOrEqual(p.cashInvested);
  });

  it('produces both buy and ETF end-wealth figures', () => {
    expect(p.buyEndWealth).toBeGreaterThan(0);
    expect(p.etfEndWealth).toBeGreaterThan(0);
  });

  it('grows ETF end-wealth as the assumed ETF return rises', () => {
    const low = computeProjection(apartment, costs, results, {
      ...projParams,
      etfReturnPct: 3,
    });
    const high = computeProjection(apartment, costs, results, {
      ...projParams,
      etfReturnPct: 10,
    });
    expect(high.etfEndWealth).toBeGreaterThan(low.etfEndWealth);
  });

  it('at 0% ETF return the ETF wealth equals the total cash committed', () => {
    const zero = computeProjection(apartment, costs, results, {
      ...projParams,
      etfReturnPct: 0,
    });
    expect(zero.etfEndWealth).toBeCloseTo(zero.totalCashCommitted, 2);
  });
});

describe('computeProjection - AfA basis includes acquisition costs (req #1)', () => {
  it('depreciable basis = (price + closingCosts) * buildingShare', () => {
    // For this apartment: price 400000 + closingCosts (6+1.5+0.5+3.57 = 11.57% = 46280)
    // = 446280 * 70% = 312396; annual AfA at 2% = 6247.92
    const taxed = computeProjection(apartment, costs, results, {
      ...projParams,
      taxEnabled: true,
      afaRatePct: 2,
      buildingSharePct: 70,
      sonderAfaEnabled: false,
    });
    // Should be > pure-price-based basis (400000 * 70% * 2% = 5600)
    expect(taxed.annualDepreciation).toBeGreaterThan(5600);
    // Should include closing costs: (400000 + ~46280) * 70% * 2% ≈ 6248
    expect(taxed.annualDepreciation).toBeCloseTo(
      ((apartment.purchasePrice + results.closingCosts) * 0.7 * 0.02),
      0,
    );
  });

  it('AfA example from spec: price 250000, costs 27500, 70% building, 2% rate => 3885/yr', () => {
    const smallApt: typeof apartment = { ...apartment, purchasePrice: 250000, monthlyColdRent: 1000 };
    const smallCosts: typeof costs = {
      transferTaxPct: 6, notaryPct: 4.5, landRegistryPct: 0, agentCommissionPct: 0.5,
      maintenanceReservePctPerYear: 1, managementPerMonth: 30, vacancyPct: 3,
    };
    // Closing costs = 250000 * (6+4.5+0.5)/100 = 250000 * 0.11 = 27500
    const smallResults = computeResults(smallApt, { ...loan, downPayment: 80000 }, smallCosts);
    expect(smallResults.closingCosts).toBeCloseTo(27500, 0);
    const smallProj = computeProjection(smallApt, smallCosts, smallResults, {
      ...projParams, taxEnabled: true, buildingSharePct: 70, afaRatePct: 2, sonderAfaEnabled: false,
    });
    // (250000 + 27500) * 70% * 2% = 3885
    expect(smallProj.annualDepreciation).toBeCloseTo(3885, 0);
  });
});

import { describe, it, expect } from 'vitest';
import { buildAmortization, computeResults } from './finance';
import type { Apartment, CostSettings, LoanParams } from '../types';

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

describe('buildAmortization', () => {
  it('returns payoffYears 0 and no interest for a zero loan', () => {
    const r = buildAmortization(0, 4, 0);
    expect(r.payoffYears).toBe(0);
    expect(r.totalInterest).toBe(0);
    expect(r.schedule).toHaveLength(0);
  });

  it('fully amortizes a normal annuity loan and ends at zero balance', () => {
    // 300k at 4% + 2% tilgung => annuity 6% of 300k / 12 = 1500/mo
    const r = buildAmortization(300000, 4, 1500);
    expect(r.payoffYears).not.toBeNull();
    // Rough payoff for 4%/2% annuity is well under 35 years.
    expect(r.payoffYears!).toBeGreaterThan(20);
    expect(r.payoffYears!).toBeLessThan(35);
    expect(r.totalInterest).toBeGreaterThan(0);
    const last = r.schedule[r.schedule.length - 1];
    expect(last.remainingBalance).toBeLessThanOrEqual(0.01);
  });

  it('flags a non-amortizing loan (annuity below interest) as never paid off', () => {
    // Monthly interest on 300k at 4% is 1000; annuity of 500 never amortizes.
    const r = buildAmortization(300000, 4, 500);
    expect(r.payoffYears).toBeNull();
    expect(r.totalInterest).toBeGreaterThan(0);
  });

  it('accumulates interest and principal to sensible totals', () => {
    const r = buildAmortization(100000, 3, 500);
    const last = r.schedule[r.schedule.length - 1];
    expect(last.cumulativePrincipal).toBeCloseTo(100000, -1);
  });
});

describe('computeResults - purchase & financing', () => {
  const r = computeResults(apartment, loan, costs);

  it('sums closing costs from the configured percentages', () => {
    // 6 + 1.5 + 0.5 + 3.57 = 11.57% of 400000 = 46280
    expect(r.closingCosts).toBeCloseTo(46280, 2);
    expect(r.totalInvestment).toBeCloseTo(446280, 2);
  });

  it('computes loan amount as price minus down payment when costs are not financed', () => {
    expect(r.loanAmount).toBe(300000);
  });

  it('cash invested equals total investment minus loan', () => {
    expect(r.cashInvested).toBeCloseTo(446280 - 300000, 2);
  });

  it('finances closing costs into the loan when enabled', () => {
    const r2 = computeResults(
      apartment,
      { ...loan, financeClosingCosts: true },
      costs,
    );
    expect(r2.loanAmount).toBeCloseTo(446280 - 100000, 2);
  });
});

describe('computeResults - mortgage', () => {
  const r = computeResults(apartment, loan, costs);

  it('computes the monthly annuity from interest + tilgung', () => {
    // 300000 * (4+2)% / 12 = 1500
    expect(r.monthlyAnnuity).toBeCloseTo(1500, 2);
  });

  it('produces an amortization schedule and payoff figures', () => {
    expect(r.amortization.length).toBeGreaterThan(0);
    expect(r.payoffYears).not.toBeNull();
    expect(r.totalInterest).toBeGreaterThan(0);
  });
});

describe('computeResults - fixed period & strategy', () => {
  it('followUp: leaves a Restschuld and interest after the fixed period', () => {
    const r = computeResults(apartment, loan, costs);
    expect(r.repaymentStrategy).toBe('followUp');
    expect(r.restschuldAtFixedEnd).toBeGreaterThan(0);
    expect(r.restschuldAtFixedEnd).toBeLessThan(r.loanAmount);
    expect(r.interestDuringFixed).toBeGreaterThan(0);
    expect(r.fullyRepaidWithinFixed).toBe(false);
  });

  it('payoffWithinFixed: uses the same interest + Tilgung payment as followUp', () => {
    const r = computeResults(
      apartment,
      { ...loan, repaymentStrategy: 'payoffWithinFixed', fixedRatePeriodYears: 10 },
      costs,
    );
    // Same standard annuity: 300000 * (4+2)% / 12 = 1500.
    expect(r.monthlyAnnuity).toBeCloseTo(1500, 2);
    expect(r.payoffYears).not.toBeNull();
  });

  it('payoffWithinFixed: the Tilgung % drives the payment (higher Tilgung = bigger payment)', () => {
    const t2 = computeResults(
      apartment,
      { ...loan, repaymentStrategy: 'payoffWithinFixed', initialRepaymentPct: 2 },
      costs,
    );
    const t3 = computeResults(
      apartment,
      { ...loan, repaymentStrategy: 'payoffWithinFixed', initialRepaymentPct: 3 },
      costs,
    );
    expect(t3.monthlyAnnuity).toBeGreaterThan(t2.monthlyAnnuity);
    // Higher Tilgung repays sooner.
    expect(t3.payoffYears!).toBeLessThan(t2.payoffYears!);
  });

  it('payoffWithinFixed reports an implied Tilgung close to the set rate', () => {
    const payoff = computeResults(
      apartment,
      { ...loan, repaymentStrategy: 'payoffWithinFixed', initialRepaymentPct: 2, fixedRatePeriodYears: 10 },
      costs,
    );
    expect(payoff.impliedRepaymentPct).toBeCloseTo(2, 1);
  });

  it('splits the monthly annuity into interest + Tilgung that sum to the payment', () => {
    const r = computeResults(apartment, loan, costs);
    expect(r.monthlyLoanInterest + r.monthlyLoanPrincipal).toBeCloseTo(r.monthlyAnnuity, 1);
    // 300000 * 4% / 12 = 1000 interest in the first month.
    expect(r.monthlyLoanInterest).toBeCloseTo(1000, 1);
    expect(r.monthlyLoanPrincipal).toBeCloseTo(500, 1);
  });
});

describe('computeResults - lump sums (Sondertilgung)', () => {
  it('an annual lump sum shortens payoff and cuts total interest', () => {
    const base = computeResults(apartment, loan, costs);
    const withLump = computeResults(
      apartment,
      { ...loan, annualExtraPayment: 6000 },
      costs,
    );
    expect(withLump.payoffYears).not.toBeNull();
    expect(base.payoffYears).not.toBeNull();
    expect(withLump.payoffYears!).toBeLessThan(base.payoffYears!);
    expect(withLump.totalInterest).toBeLessThan(base.totalInterest);
  });

  it('lump sums leave a smaller Restschuld at the end of the fixed period', () => {
    const base = computeResults(apartment, loan, costs);
    const withLump = computeResults(
      apartment,
      { ...loan, annualExtraPayment: 6000 },
      costs,
    );
    expect(withLump.restschuldAtFixedEnd).toBeLessThan(base.restschuldAtFixedEnd);
  });
});

describe('computeResults - cash-flow-positive timeline', () => {
  it('flags a loss-making-while-financing deal as turning positive at payoff', () => {
    const r = computeResults(
      { ...apartment, purchasePrice: 500000, monthlyColdRent: 1400 },
      loan,
      costs,
    );
    expect(r.cashFlowPositiveFromStart).toBe(false);
    expect(r.cashFlowPositiveYears).not.toBeNull();
    expect(r.totalOutOfPocketUntilPositive).toBeGreaterThan(0);
    expect(r.monthlyIncomeAfterPayoff).toBeCloseTo(r.monthlyCashFlowBeforeLoan, 2);
  });

  it('flags a strong-rent deal as positive from the start', () => {
    const r = computeResults(
      { ...apartment, purchasePrice: 250000, monthlyColdRent: 2200 },
      { ...loan, downPayment: 120000 },
      costs,
    );
    expect(r.cashFlowPositiveFromStart).toBe(true);
    expect(r.cashFlowPositiveYears).toBe(0);
    expect(r.totalOutOfPocketUntilPositive).toBe(0);
  });

  it('reports never when rent cannot cover running costs even without a loan', () => {
    const r = computeResults(
      { ...apartment, monthlyColdRent: 200, hausgeld: 600, hausgeldRecoverableRatio: 0 },
      loan,
      costs,
    );
    expect(r.cashFlowPositiveYears).toBeNull();
    expect(r.cashFlowPositiveFromStart).toBe(false);
  });
});

describe('computeResults - target payoff', () => {
  it('forcing the target repays the loan in exactly the target years', () => {
    const r = computeResults(
      apartment,
      { ...loan, targetPayoffYears: 15, forceTargetPayoff: true },
      costs,
    );
    expect(r.targetForced).toBe(true);
    expect(r.meetsTarget).toBe(true);
    expect(r.payoffYears).not.toBeNull();
    expect(r.payoffYears!).toBeGreaterThan(14.5);
    expect(r.payoffYears!).toBeLessThanOrEqual(15.2);
  });

  it('reports meetsTarget=false when a low-Tilgung plan misses the target', () => {
    const r = computeResults(
      apartment,
      { ...loan, initialRepaymentPct: 2, targetPayoffYears: 15, forceTargetPayoff: false },
      costs,
    );
    // 2% Tilgung at 4% pays off in ~28y, so it misses a 15y target.
    expect(r.meetsTarget).toBe(false);
    // The advice payment should be bigger than the current 2%-Tilgung payment.
    expect(r.targetPayment).toBeGreaterThan(r.monthlyAnnuity);
  });

  it('reports meetsTarget=true when the plan already beats the target', () => {
    const r = computeResults(
      apartment,
      { ...loan, initialRepaymentPct: 6, targetPayoffYears: 20, forceTargetPayoff: false },
      costs,
    );
    expect(r.meetsTarget).toBe(true);
  });

  it('a shorter target needs a bigger monthly payment', () => {
    const t10 = computeResults(apartment, { ...loan, targetPayoffYears: 10, forceTargetPayoff: true }, costs);
    const t20 = computeResults(apartment, { ...loan, targetPayoffYears: 20, forceTargetPayoff: true }, costs);
    expect(t10.monthlyAnnuity).toBeGreaterThan(t20.monthlyAnnuity);
  });
});

describe('computeResults - yields & metrics', () => {
  const r = computeResults(apartment, loan, costs);

  it('gross yield = annual cold rent / price', () => {
    // 1500*12 / 400000 = 4.5%
    expect(r.grossYieldPct).toBeCloseTo(4.5, 2);
  });

  it('price-to-rent multiple = price / annual rent', () => {
    // 400000 / 18000 = 22.22
    expect(r.priceToRentMultiple).toBeCloseTo(22.22, 1);
  });

  it('derives per-sqm figures', () => {
    expect(r.pricePerSqm).toBeCloseTo(5000, 2);
    expect(r.rentPerSqm).toBeCloseTo(18.75, 2);
  });
});

describe('computeResults - cash flow', () => {
  const r = computeResults(apartment, loan, costs);

  it('applies the vacancy allowance to effective rent', () => {
    // 1500 - 3% = 1455
    expect(r.effectiveMonthlyRent).toBeCloseTo(1455, 2);
  });

  it('only counts the non-recoverable portion of Hausgeld', () => {
    // 250 * (1 - 0.6) = 100
    expect(r.nonRecoverableHausgeld).toBeCloseTo(100, 2);
  });

  it('after-loan cash flow subtracts the annuity', () => {
    expect(r.monthlyCashFlowAfterLoan).toBeCloseTo(
      r.monthlyCashFlowBeforeLoan - r.monthlyAnnuity,
      2,
    );
  });
});

describe('computeResults - benchmark', () => {
  it('computes deltas against the area averages', () => {
    const r = computeResults(apartment, loan, costs);
    expect(r.benchmark.hasData).toBe(true);
    // pricePerSqm 5000 vs ref 5000 => 0% delta
    expect(r.benchmark.buyDeltaPct).toBeCloseTo(0, 1);
    // rentPerSqm 18.75 vs ref 15 => +25%
    expect(r.benchmark.rentDeltaPct).toBeCloseTo(25, 1);
    expect(r.benchmark.hasRentRef).toBe(true);
  });

  it('hides the rent comparison when no average rent is given', () => {
    const r = computeResults({ ...apartment, avgRentPerSqm: 0 }, loan, costs);
    expect(r.benchmark.hasRentRef).toBe(false);
    expect(r.benchmark.rentDeltaPct).toBe(0);
  });

  it('reports no data when no area price is set', () => {
    const r = computeResults({ ...apartment, avgPricePerSqm: 0 }, loan, costs);
    expect(r.benchmark.hasData).toBe(false);
  });
});

describe('computeResults - verdict', () => {
  it('labels a strong deal as Buy', () => {
    const good = computeResults(
      { ...apartment, purchasePrice: 250000, monthlyColdRent: 1600 },
      { ...loan, downPayment: 120000 },
      costs,
    );
    expect(good.verdict.score).toBeGreaterThanOrEqual(65);
    expect(good.verdict.label).toBe('Buy');
  });

  it('labels a weak deal as Avoid', () => {
    const bad = computeResults(
      { ...apartment, purchasePrice: 800000, monthlyColdRent: 900 },
      { ...loan, downPayment: 40000 },
      costs,
    );
    expect(bad.verdict.score).toBeLessThan(45);
    expect(bad.verdict.label).toBe('Avoid');
  });

  it('always returns a score between 0 and 100', () => {
    const r = computeResults(apartment, loan, costs);
    expect(r.verdict.score).toBeGreaterThanOrEqual(0);
    expect(r.verdict.score).toBeLessThanOrEqual(100);
  });
});

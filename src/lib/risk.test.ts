import { describe, expect, it } from 'vitest';
import { DEFAULT_APARTMENT, DEFAULT_COST_SETTINGS, DEFAULT_LOAN } from '../data/defaults';
import { computeResults } from './finance';
import { computeFinancingRisk } from './risk';

describe('computeFinancingRisk', () => {
  it('calculates leverage, debt coverage, break-even rent, and refinance ceiling', () => {
    const results = computeResults(DEFAULT_APARTMENT, DEFAULT_LOAN, DEFAULT_COST_SETTINGS);
    const risk = computeFinancingRisk(DEFAULT_APARTMENT, DEFAULT_COST_SETTINGS, results);
    const vacancyFactor = 1 - DEFAULT_COST_SETTINGS.vacancyPct / 100;

    expect(risk.ltvPct).toBeCloseTo(
      results.loanAmount / DEFAULT_APARTMENT.purchasePrice * 100,
      2,
    );
    expect(risk.dscr).toBeCloseTo(
      results.monthlyCashFlowBeforeLoan / results.monthlyAnnuity,
      2,
    );
    expect(risk.breakEvenColdRent).toBeCloseTo(
      (results.monthlyOperatingCosts + results.monthlyAnnuity) / vacancyFactor,
      2,
    );
    expect(risk.refinanceInterestCeilingPct).toBeCloseTo(
      results.monthlyAnnuity * 12 / results.restschuldAtFixedEnd * 100,
      2,
    );
  });

  it('returns debt metrics as unavailable for a cash purchase', () => {
    const cashLoan = {
      ...DEFAULT_LOAN,
      downPayment: DEFAULT_APARTMENT.purchasePrice,
      financeClosingCosts: false,
    };
    const results = computeResults(DEFAULT_APARTMENT, cashLoan, DEFAULT_COST_SETTINGS);
    const risk = computeFinancingRisk(DEFAULT_APARTMENT, DEFAULT_COST_SETTINGS, results);

    expect(risk.ltvPct).toBe(0);
    expect(risk.dscr).toBeNull();
    expect(risk.refinanceInterestCeilingPct).toBeNull();
    expect(risk.breakEvenColdRent).toBeCloseTo(
      results.monthlyOperatingCosts / (1 - DEFAULT_COST_SETTINGS.vacancyPct / 100),
      2,
    );
  });
});
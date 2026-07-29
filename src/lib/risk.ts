import type { Apartment, CostSettings, Results } from '../types';

export interface FinancingRiskMetrics {
  ltvPct: number | null;
  dscr: number | null;
  breakEvenColdRent: number | null;
  refinanceInterestCeilingPct: number | null;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function computeFinancingRisk(
  apartment: Apartment,
  costs: CostSettings,
  results: Results,
): FinancingRiskMetrics {
  const purchasePrice = Math.max(0, apartment.purchasePrice);
  const annualDebtService = results.monthlyAnnuity * 12;
  const annualNetOperatingIncome = results.monthlyCashFlowBeforeLoan * 12;
  const vacancyFactor = 1 - Math.min(100, Math.max(0, costs.vacancyPct)) / 100;

  return {
    ltvPct: purchasePrice > 0 ? round2((results.loanAmount / purchasePrice) * 100) : null,
    dscr: annualDebtService > 0 ? round2(annualNetOperatingIncome / annualDebtService) : null,
    breakEvenColdRent: vacancyFactor > 0
      ? round2((results.monthlyOperatingCosts + results.monthlyAnnuity) / vacancyFactor)
      : null,
    refinanceInterestCeilingPct: results.restschuldAtFixedEnd > 0
      ? round2((results.monthlyAnnuity * 12 / results.restschuldAtFixedEnd) * 100)
      : null,
  };
}
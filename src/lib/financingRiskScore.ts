import type { Apartment, CostSettings, LoanParams, Results } from '../types';
import { computeFinancingRisk } from './risk';
import { SCORE_CONFIG } from './scoringConfig';
import { cappedScore, weightedScore } from './scoring';
import type { ScoreBreakdown, ScoreFactor } from './scoring';

export interface FinancingRiskScoreInput {
  apartment: Apartment;
  loan: LoanParams;
  costs: CostSettings;
  results: Results;
}

export function breakdown(input: FinancingRiskScoreInput): ScoreBreakdown {
  const risk = computeFinancingRisk(input.apartment, input.costs, input.results);
  const { weights, ranges } = SCORE_CONFIG.financing;
  const factors: ScoreFactor[] = [];

  if (risk.dscr !== null) {
    factors.push({ key: 'dscr', label: 'DSCR', value: `${risk.dscr.toFixed(2)}x`, score: cappedScore(risk.dscr, ranges.dscr), weight: weights.dscr });
  }
  if (risk.ltvPct !== null) {
    factors.push({ key: 'ltv', label: 'Loan-to-value', value: `${risk.ltvPct.toFixed(1)}%`, score: cappedScore(risk.ltvPct, ranges.ltv, true), weight: weights.ltv });
  }
  if (risk.breakEvenColdRent !== null && input.apartment.monthlyColdRent > 0) {
    const ratio = risk.breakEvenColdRent / input.apartment.monthlyColdRent;
    factors.push({ key: 'breakEvenRent', label: 'Break-even / current rent', value: `${(ratio * 100).toFixed(0)}%`, score: cappedScore(ratio, ranges.breakEvenRentRatio, true), weight: weights.breakEvenRent });
  }
  if (risk.refinanceInterestCeilingPct !== null) {
    const assumedRate = input.loan.repaymentStrategy === 'followUp'
      ? input.loan.followUpInterestRatePct
      : input.loan.annualInterestRatePct;
    const headroom = risk.refinanceInterestCeilingPct - assumedRate;
    factors.push({ key: 'refinancingCeiling', label: 'Refinancing headroom', value: `${headroom >= 0 ? '+' : ''}${headroom.toFixed(1)} pp`, score: cappedScore(headroom, ranges.refinancingHeadroom), weight: weights.refinancingCeiling });
  }
  const deficit = Math.max(0, -input.results.monthlyCashFlowAfterLoan);
  factors.push({ key: 'monthlyDeficit', label: 'Monthly deficit', value: `${Math.round(deficit)} EUR`, score: cappedScore(deficit, ranges.monthlyDeficit, true), weight: weights.monthlyDeficit });

  return { score: weightedScore(factors), factors };
}

export function calculate(input: FinancingRiskScoreInput): number | null {
  return breakdown(input).score;
}

export function tooltip(): string {
  return 'Measures financing quality using leverage, debt coverage and refinancing resilience.';
}
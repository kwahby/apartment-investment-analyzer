import type { Projection, Results } from '../types';
import { SCORE_CONFIG } from './scoringConfig';
import { cappedScore, weightedScore } from './scoring';
import type { ScoreBreakdown, ScoreFactor } from './scoring';

export interface FinancialScoreInput {
  results: Results;
  projection: Projection;
}

export function breakdown({ results, projection }: FinancialScoreInput): ScoreBreakdown {
  const { weights, ranges } = SCORE_CONFIG.financial;
  const definitions = [
    ['irr', 'IRR', projection.irrPct, projection.irrPct === null ? '' : `${projection.irrPct.toFixed(1)}%`, weights.irr, ranges.irr],
    ['monthlyCashFlow', 'Monthly cash flow', results.monthlyCashFlowAfterLoan, `${Math.round(results.monthlyCashFlowAfterLoan)} EUR`, weights.monthlyCashFlow, ranges.monthlyCashFlow],
    ['netYield', 'Net yield', results.netYieldPct, `${results.netYieldPct.toFixed(1)}%`, weights.netYield, ranges.netYield],
    ['cashOnCash', 'Cash-on-cash return', results.cashOnCashPct, `${results.cashOnCashPct.toFixed(1)}%`, weights.cashOnCash, ranges.cashOnCash],
    ['moneyMultiple', 'Money multiple', projection.moneyMultiple, `${projection.moneyMultiple.toFixed(2)}x`, weights.moneyMultiple, ranges.moneyMultiple],
    ['grossYield', 'Gross yield', results.grossYieldPct, `${results.grossYieldPct.toFixed(1)}%`, weights.grossYield, ranges.grossYield],
  ] as const;
  const factors: ScoreFactor[] = definitions
    .filter((definition) => definition[2] !== null)
    .map(([key, label, rawValue, value, weight, range]) => ({
      key,
      label,
      value,
      score: cappedScore(rawValue as number, range),
      weight,
    }));

  return { score: weightedScore(factors), factors };
}

export function calculate(input: FinancialScoreInput): number | null {
  return breakdown(input).score;
}

export function tooltip(): string {
  return 'Measures expected financial returns using yield, cash flow, IRR and cash-on-cash return.';
}
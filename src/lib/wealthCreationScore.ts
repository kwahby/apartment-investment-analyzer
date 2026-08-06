import type { Projection, Results } from '../types';
import { SCORE_CONFIG } from './scoringConfig';
import { cappedScore, weightedScore } from './scoring';
import type { ScoreBreakdown, ScoreFactor } from './scoring';

export interface WealthCreationInput {
  purchasePrice: number;
  results: Results;
  projection: Projection;
}

function pct(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export function breakdown(input: WealthCreationInput): ScoreBreakdown {
  const { results, projection } = input;
  const cashBase = Math.max(results.cashInvested, 1);
  const loanBase = Math.max(results.loanAmount, 1);
  const priceBase = Math.max(input.purchasePrice, 1);
  const equityAtSale = projection.saleValue - projection.remainingLoanAtSale;
  const equityToCash = equityAtSale / cashBase;
  const loanReduction = results.loanAmount > 0
    ? (results.loanAmount - projection.remainingLoanAtSale) / loanBase
    : 1;
  const profitToCash = projection.totalProfit / cashBase;
  const saleValueGrowth = (projection.saleValue - input.purchasePrice) / priceBase;
  const { weights, ranges } = SCORE_CONFIG.wealth;

  const factors: ScoreFactor[] = [
    {
      key: 'equityAtSale',
      label: 'Equity at sale / cash invested',
      value: `${equityToCash.toFixed(2)}x`,
      score: cappedScore(equityToCash, ranges.equityToCash),
      weight: weights.equityAtSale,
    },
    {
      key: 'moneyMultiple',
      label: 'Money multiple',
      value: `${projection.moneyMultiple.toFixed(2)}x`,
      score: cappedScore(projection.moneyMultiple, ranges.moneyMultiple),
      weight: weights.moneyMultiple,
    },
    {
      key: 'loanReduction',
      label: 'Loan balance reduction',
      value: pct(loanReduction),
      score: cappedScore(loanReduction, ranges.loanReduction),
      weight: weights.loanReduction,
    },
    {
      key: 'totalProfit',
      label: 'Profit / cash invested',
      value: pct(profitToCash),
      score: cappedScore(profitToCash, ranges.profitToCash),
      weight: weights.totalProfit,
    },
    {
      key: 'saleValue',
      label: 'Projected value growth',
      value: pct(saleValueGrowth),
      score: cappedScore(saleValueGrowth, ranges.saleValueGrowth),
      weight: weights.saleValue,
    },
  ];

  return { score: weightedScore(factors), factors };
}

export function calculate(input: WealthCreationInput): number | null {
  return breakdown(input).score;
}

export function tooltip(): string {
  return 'Estimates long-term wealth generation through appreciation, equity growth and loan amortization.';
}
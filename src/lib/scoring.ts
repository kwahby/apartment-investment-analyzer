import type { ScoreRange } from './scoringConfig';

export interface ScoreFactor {
  key: string;
  label: string;
  value: string;
  score: number;
  weight: number;
}

export interface ScoreBreakdown {
  score: number | null;
  factors: ScoreFactor[];
  unavailableReason?: string;
}

export function cappedScore(value: number, range: ScoreRange, inverse = false): number {
  if (!Number.isFinite(value) || range.min === range.max) return 50;
  const normalized = Math.min(1, Math.max(0, (value - range.min) / (range.max - range.min)));
  return Math.round((inverse ? 1 - normalized : normalized) * 100);
}

export function weightedScore(factors: ScoreFactor[]): number | null {
  const totalWeight = factors.reduce((sum, factor) => sum + factor.weight, 0);
  if (totalWeight === 0) return null;
  return Math.round(
    factors.reduce((sum, factor) => sum + factor.score * factor.weight, 0) / totalWeight,
  );
}
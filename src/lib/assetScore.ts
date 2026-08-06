import type { Apartment, Results } from '../types';
import { SCORE_CONFIG } from './scoringConfig';
import { cappedScore, weightedScore } from './scoring';
import type { ScoreBreakdown, ScoreFactor } from './scoring';

export interface AssetScoreInput {
  apartment: Apartment;
  results: Results;
  analysisYear?: number;
}

export function breakdown({ apartment, results, analysisYear = new Date().getFullYear() }: AssetScoreInput): ScoreBreakdown {
  const { weights, ranges } = SCORE_CONFIG.asset;
  const factors: ScoreFactor[] = [];

  if (results.benchmark.hasData) {
    factors.push({
      key: 'priceVsDistrict',
      label: 'Price vs district',
      value: `${results.benchmark.buyDeltaPct > 0 ? '+' : ''}${results.benchmark.buyDeltaPct.toFixed(1)}%`,
      score: cappedScore(results.benchmark.buyDeltaPct, ranges.priceVsDistrict, true),
      weight: weights.priceVsDistrict,
    });
  }
  if (apartment.buildYear && apartment.buildYear <= analysisYear) {
    const age = analysisYear - apartment.buildYear;
    factors.push({
      key: 'buildingAge',
      label: 'Building age',
      value: `${age} years`,
      score: cappedScore(age, ranges.buildingAge, true),
      weight: weights.buildingAge,
    });
  }
  if (apartment.locationScore > 0) {
    factors.push({
      key: 'location',
      label: 'Location',
      value: `${apartment.locationScore.toFixed(1)}/10`,
      score: cappedScore(apartment.locationScore, ranges.location),
      weight: weights.location,
    });
  }
  if (apartment.balconySqm !== undefined) {
    factors.push({
      key: 'balcony',
      label: 'Balcony / terrace',
      value: apartment.balconySqm > 0 ? `${apartment.balconySqm.toFixed(1)} sqm` : 'None',
      score: apartment.balconySqm > 0 ? 100 : 0,
      weight: weights.balcony,
    });
  }

  return {
    score: weightedScore(factors),
    factors,
    unavailableReason: factors.length === 0 ? 'No apartment quality inputs available' : undefined,
  };
}

export function calculate(input: AssetScoreInput): number | null {
  return breakdown(input).score;
}

export function tooltip(): string {
  return 'Scores the apartment itself using objective characteristics such as location, building age, balcony and pricing. Uncollected characteristics are excluded.';
}
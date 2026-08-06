import { describe, expect, it } from 'vitest';
import type { Apartment, Results } from '../types';
import { breakdown as assetBreakdown } from './assetScore';
import { calculate as calculateMargin } from './marginOfSafety';
import { breakdown as recommend } from './recommendationEngine';

const baseRecommendation = {
  financialScore: 70,
  assetScore: 75,
  financingScore: 60,
  wealthScore: 80,
  marginPct: 0,
  monthlyCashFlow: -100,
};

describe('recommendation engine', () => {
  it('returns BUY only when every available buy threshold is met', () => {
    expect(recommend(baseRecommendation).recommendation).toBe('BUY');
  });

  it('returns NEGOTIATE for a strong asset with middling economics', () => {
    expect(recommend({ ...baseRecommendation, financialScore: 60, marginPct: -4 }).recommendation).toBe('NEGOTIATE');
  });

  it('returns PASS when a hard-stop rule is breached', () => {
    expect(recommend({ ...baseRecommendation, financingScore: 39 }).recommendation).toBe('PASS');
    expect(recommend({ ...baseRecommendation, marginPct: -11 }).recommendation).toBe('PASS');
  });

  it('always explains the recommendation with three or four reasons', () => {
    expect(recommend({ ...baseRecommendation, wealthScore: 50 }).reasons.length).toBeGreaterThanOrEqual(3);
    expect(recommend(baseRecommendation).reasons.length).toBeLessThanOrEqual(4);
  });
});

describe('asset score', () => {
  it('excludes uncollected characteristics instead of scoring them as zero', () => {
    const result = assetBreakdown({
      apartment: { buildYear: undefined, locationScore: 8 } as Apartment,
      results: { benchmark: { hasData: false } } as Results,
      analysisYear: 2026,
    });
    expect(result.factors.map((factor) => factor.key)).toEqual(['location']);
    expect(result.score).toBe(83);
  });
});

describe('margin of safety', () => {
  it('uses district price per sqm and effective area as fair value', () => {
    const margin = calculateMargin({
      apartment: { purchasePrice: 400_000 } as Apartment,
      results: {
        benchmark: { hasData: true, refBuyPerSqm: 5_000, effectiveSqm: 84 },
      } as Results,
    });
    expect(margin).toBeCloseTo(5, 6);
  });

  it('returns unavailable when no district benchmark exists', () => {
    expect(calculateMargin({
      apartment: { purchasePrice: 400_000 } as Apartment,
      results: { benchmark: { hasData: false } } as Results,
    })).toBeNull();
  });
});
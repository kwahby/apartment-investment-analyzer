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
  dscr: 1.2,
  cashFlowPositiveYears: 20,
};

describe('recommendation engine', () => {
  it('returns BUY when most independent strong signals are present despite an average asset', () => {
    const result = recommend({
      ...baseRecommendation,
      financialScore: 100,
      assetScore: 60,
      financingScore: 88,
      wealthScore: 78,
      marginPct: 35.4,
      monthlyCashFlow: 365.8,
    });
    expect(result.recommendation).toBe('BUY');
    expect(result.strengths).toContain('Significant discount to estimated fair value');
    expect(result.weaknesses).toContain('Average apartment characteristics');
  });

  it('returns NEGOTIATE for a strong asset with middling economics', () => {
    expect(recommend({ ...baseRecommendation, financialScore: 60, marginPct: -4 }).recommendation).toBe('NEGOTIATE');
  });

  it('returns PASS when a hard-stop rule is breached', () => {
    expect(recommend({ ...baseRecommendation, financingScore: 34 }).recommendation).toBe('PASS');
    expect(recommend({ ...baseRecommendation, marginPct: -16 }).recommendation).toBe('PASS');
    expect(recommend({ ...baseRecommendation, dscr: 0.6 }).recommendation).toBe('PASS');
  });

  it('passes an extreme deficit only when there is no projected path to positive cash flow', () => {
    expect(recommend({ ...baseRecommendation, monthlyCashFlow: -800, cashFlowPositiveYears: null }).recommendation).toBe('PASS');
    expect(recommend({ ...baseRecommendation, monthlyCashFlow: -800, cashFlowPositiveYears: 12 }).recommendation).not.toBe('PASS');
  });

  it('returns PASS for multiple major weaknesses without requiring one hard stop', () => {
    expect(recommend({ ...baseRecommendation, financialScore: 40, wealthScore: 35 }).recommendation).toBe('PASS');
  });

  it('always provides structured strengths, weaknesses and a conclusion', () => {
    const result = recommend(baseRecommendation);
    expect(result.strengths.length).toBeGreaterThan(0);
    expect(result.weaknesses.length).toBeGreaterThan(0);
    expect(result.conclusion.length).toBeGreaterThan(0);
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
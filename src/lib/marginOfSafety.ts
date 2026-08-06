import type { Apartment, Results } from '../types';

export interface MarginOfSafetyInput {
  apartment: Apartment;
  results: Results;
}

export interface MarginOfSafetyBreakdown {
  marginPct: number | null;
  fairValue: number | null;
  askingPrice: number;
  method: string;
}

export function breakdown({ apartment, results }: MarginOfSafetyInput): MarginOfSafetyBreakdown {
  if (!results.benchmark.hasData || apartment.purchasePrice <= 0) {
    return {
      marginPct: null,
      fairValue: null,
      askingPrice: apartment.purchasePrice,
      method: 'District price benchmark unavailable',
    };
  }
  const fairValue = results.benchmark.refBuyPerSqm * results.benchmark.effectiveSqm;
  return {
    marginPct: ((fairValue - apartment.purchasePrice) / apartment.purchasePrice) * 100,
    fairValue,
    askingPrice: apartment.purchasePrice,
    method: 'District average EUR/sqm x effective area',
  };
}

export function calculate(input: MarginOfSafetyInput): number | null {
  return breakdown(input).marginPct;
}

export function tooltip(): string {
  return 'Shows whether the current asking price is above or below our estimated fair value.';
}
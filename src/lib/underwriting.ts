import type { Apartment, CostSettings, LoanParams, Projection, Results } from '../types';
import * as asset from './assetScore';
import * as financial from './financialScore';
import * as financing from './financingRiskScore';
import * as margin from './marginOfSafety';
import * as recommendation from './recommendationEngine';
import * as wealth from './wealthCreationScore';

export interface UnderwritingInput {
  apartment: Apartment;
  loan: LoanParams;
  costs: CostSettings;
  results: Results;
  projection: Projection;
}

export function calculateUnderwriting(input: UnderwritingInput) {
  const financialResult = financial.breakdown(input);
  const assetResult = asset.breakdown(input);
  const financingResult = financing.breakdown(input);
  const wealthResult = wealth.breakdown({
    purchasePrice: input.apartment.purchasePrice,
    results: input.results,
    projection: input.projection,
  });
  const marginResult = margin.breakdown(input);
  const recommendationResult = recommendation.breakdown({
    financialScore: financialResult.score,
    assetScore: assetResult.score,
    financingScore: financingResult.score,
    wealthScore: wealthResult.score,
    marginPct: marginResult.marginPct,
    monthlyCashFlow: input.results.monthlyCashFlowAfterLoan,
  });

  return {
    financial: financialResult,
    asset: assetResult,
    financing: financingResult,
    wealth: wealthResult,
    margin: marginResult,
    recommendation: recommendationResult,
    tooltips: {
      thesis: recommendation.tooltip(),
      financial: financial.tooltip(),
      asset: asset.tooltip(),
      financing: financing.tooltip(),
      wealth: wealth.tooltip(),
      margin: margin.tooltip(),
    },
  };
}

export type Underwriting = ReturnType<typeof calculateUnderwriting>;
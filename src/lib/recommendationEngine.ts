import { SCORE_CONFIG } from './scoringConfig';

export type Recommendation = 'BUY' | 'NEGOTIATE' | 'PASS';

export interface RecommendationInput {
  financialScore: number | null;
  assetScore: number | null;
  financingScore: number | null;
  wealthScore: number | null;
  marginPct: number | null;
  monthlyCashFlow: number;
  dscr: number | null;
  cashFlowPositiveYears: number | null;
}

export interface RecommendationBreakdown {
  recommendation: Recommendation;
  stars: number;
  opportunityLabel: string;
  strengths: string[];
  weaknesses: string[];
  dealBreakers: string[];
  conclusion: string;
  reasons: { text: string; tone: 'positive' | 'negative' | 'neutral' }[];
}

function below(value: number | null, threshold: number): boolean {
  return value !== null && value < threshold;
}

function atLeast(value: number | null, threshold: number): boolean {
  return value !== null && value >= threshold;
}

export function breakdown(input: RecommendationInput): RecommendationBreakdown {
  const rules = SCORE_CONFIG.recommendation;
  const dealBreakers: string[] = [];
  const financialHardStop = below(input.financialScore, rules.dealBreakers.financialBelow);
  const financingHardStop = below(input.financingScore, rules.dealBreakers.financingBelow);
  const pricingHardStop = below(input.marginPct, rules.dealBreakers.marginBelow);

  if (financialHardStop) dealBreakers.push('Financial performance is below the minimum investment standard');
  if (financingHardStop) dealBreakers.push('Financing risk exceeds the acceptable limit');
  if (pricingHardStop) dealBreakers.push('Asking price is significantly above estimated fair value');
  if (below(input.dscr, rules.dealBreakers.dscrBelow)) dealBreakers.push('Debt-service coverage is critically low');
  if (input.monthlyCashFlow < rules.dealBreakers.extremeMonthlyDeficitBelow && input.cashFlowPositiveYears === null) {
    dealBreakers.push('Extreme monthly deficit has no projected path to positive cash flow');
  }

  const strongSignals = [
    atLeast(input.financialScore, rules.strongSignals.financialMin),
    atLeast(input.financingScore, rules.strongSignals.financingMin),
    atLeast(input.wealthScore, rules.strongSignals.wealthMin),
    input.marginPct !== null && input.marginPct > rules.strongSignals.marginAbove,
  ].filter(Boolean).length;
  const majorWeaknesses = [
    below(input.financialScore, rules.majorWeaknesses.financialBelow),
    below(input.financingScore, rules.majorWeaknesses.financingBelow),
    below(input.wealthScore, rules.majorWeaknesses.wealthBelow),
    below(input.marginPct, rules.majorWeaknesses.marginBelow),
  ].filter(Boolean).length;

  const recommendation: Recommendation = dealBreakers.length > 0 || majorWeaknesses >= rules.majorWeaknesses.requiredForPass
    ? 'PASS'
    : strongSignals >= rules.strongSignals.requiredForBuy ? 'BUY' : 'NEGOTIATE';
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const { strongScoreMin, averageScoreMin, slightDeficitAbove, slightDeficitBelow } = rules.assessment;

  if (atLeast(input.financialScore, strongScoreMin)) strengths.push('Outstanding financial performance');
  else if (atLeast(input.financialScore, averageScoreMin)) strengths.push('Acceptable investment economics');
  else if (input.financialScore !== null && !financialHardStop) weaknesses.push('Weak financial returns');
  if (atLeast(input.financingScore, strongScoreMin)) strengths.push('Strong financing profile');
  else if (atLeast(input.financingScore, averageScoreMin)) strengths.push('Manageable financing profile');
  else if (input.financingScore !== null && !financingHardStop) weaknesses.push('Elevated financing risk');
  if (atLeast(input.wealthScore, strongScoreMin)) strengths.push('Excellent long-term wealth creation');
  else if (atLeast(input.wealthScore, averageScoreMin)) strengths.push('Positive long-term wealth outlook');
  else if (input.wealthScore !== null) weaknesses.push('Weak long-term wealth creation');
  if (input.marginPct !== null && input.marginPct > rules.strongSignals.marginAbove) strengths.push('Significant discount to estimated fair value');
  else if (input.marginPct !== null && input.marginPct >= 0) strengths.push('Asking price is supported by estimated fair value');
  else if (input.marginPct !== null && input.marginPct >= rules.majorWeaknesses.marginBelow) weaknesses.push('Limited or negative pricing advantage');
  else if (input.marginPct !== null && !pricingHardStop) weaknesses.push('Significantly above estimated fair value');
  if (input.assetScore !== null && input.assetScore >= strongScoreMin) strengths.push('Attractive apartment characteristics');
  else if (input.assetScore !== null && input.assetScore >= averageScoreMin) weaknesses.push('Average apartment characteristics');
  else if (input.assetScore !== null) weaknesses.push('Weak apartment characteristics');
  if (input.monthlyCashFlow < slightDeficitBelow && input.monthlyCashFlow >= slightDeficitAbove) weaknesses.push('Monthly cash flow is slightly negative');
  else if (input.monthlyCashFlow < slightDeficitAbove) weaknesses.push('Monthly cash flow requires a substantial top-up');

  const stars = recommendation === 'BUY' ? 5 : recommendation === 'NEGOTIATE' ? 4 : dealBreakers.length > 1 ? 1 : 2;
  const opportunityLabel = recommendation === 'BUY'
    ? 'Excellent investment opportunity'
    : recommendation === 'NEGOTIATE' ? 'Good investment opportunity' : 'Weak investment opportunity';
  const conclusion = recommendation === 'BUY'
    ? 'The strengths clearly outweigh the weaknesses. The property should be pursued.'
    : recommendation === 'NEGOTIATE'
      ? 'The opportunity is worth pursuing if the price or financing terms can be improved.'
      : 'The weaknesses outweigh the strengths. Capital should be deployed elsewhere.';
  const reasons: RecommendationBreakdown['reasons'] = [
    ...strengths.map((text) => ({ text, tone: 'positive' as const })),
    ...weaknesses.map((text) => ({ text, tone: 'negative' as const })),
    ...dealBreakers.map((text) => ({ text, tone: 'negative' as const })),
  ];

  return { recommendation, stars, opportunityLabel, strengths, weaknesses, dealBreakers, conclusion, reasons };
}

export function calculate(input: RecommendationInput): Recommendation {
  return breakdown(input).recommendation;
}

export function tooltip(): string {
  return 'Applies investment-committee rules: deal breakers first, then independent strengths, weaknesses, pricing and financing terms. Scores explain the decision but are not averaged into it.';
}
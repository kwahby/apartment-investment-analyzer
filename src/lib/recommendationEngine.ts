import { SCORE_CONFIG } from './scoringConfig';

export type Recommendation = 'BUY' | 'NEGOTIATE' | 'PASS';

export interface RecommendationInput {
  financialScore: number | null;
  assetScore: number | null;
  financingScore: number | null;
  wealthScore: number | null;
  marginPct: number | null;
  monthlyCashFlow: number;
}

export interface RecommendationBreakdown {
  recommendation: Recommendation;
  reasons: { text: string; tone: 'positive' | 'negative' | 'neutral' }[];
}

function meets(value: number | null, minimum: number): boolean {
  return value === null || value >= minimum;
}

export function breakdown(input: RecommendationInput): RecommendationBreakdown {
  const rules = SCORE_CONFIG.recommendation;
  const pass = (input.financialScore !== null && input.financialScore < rules.pass.financialBelow)
    || (input.financingScore !== null && input.financingScore < rules.pass.financingBelow)
    || (input.marginPct !== null && input.marginPct < rules.pass.marginBelow);
  const buy = !pass
    && meets(input.financialScore, rules.buy.financialMin)
    && meets(input.assetScore, rules.buy.assetMin)
    && meets(input.financingScore, rules.buy.financingMin)
    && meets(input.marginPct, rules.buy.marginMin);
  const negotiate = !pass && !buy && (
    (input.financialScore !== null && input.financialScore >= rules.negotiate.financialMin)
    || (input.assetScore !== null && input.assetScore >= rules.negotiate.assetMin)
    || (input.marginPct !== null && input.marginPct >= rules.negotiate.marginMin)
  );
  const recommendation: Recommendation = pass ? 'PASS' : buy ? 'BUY' : negotiate ? 'NEGOTIATE' : 'PASS';
  const reasons: RecommendationBreakdown['reasons'] = [];

  if (input.wealthScore !== null && input.wealthScore >= 70) reasons.push({ text: 'Strong long-term wealth creation', tone: 'positive' });
  if (input.assetScore !== null && input.assetScore >= 75) reasons.push({ text: 'Attractive apartment fundamentals', tone: 'positive' });
  if (input.financingScore !== null && input.financingScore >= 60) reasons.push({ text: 'Healthy financing', tone: 'positive' });
  if (input.marginPct !== null && input.marginPct >= 0) reasons.push({ text: 'Attractive pricing versus fair value', tone: 'positive' });
  if (input.financialScore !== null && input.financialScore < 50) reasons.push({ text: 'Poor financial returns', tone: 'negative' });
  else if (input.monthlyCashFlow < 0) reasons.push({ text: 'Weak monthly cash flow', tone: 'negative' });
  if (input.financingScore !== null && input.financingScore < 40) reasons.push({ text: 'High financing risk', tone: 'negative' });
  if (input.marginPct !== null && input.marginPct < -10) reasons.push({ text: 'Significantly above fair value', tone: 'negative' });
  else if (input.marginPct !== null && input.marginPct < 0) reasons.push({ text: 'Slightly above fair value', tone: 'negative' });

  const fallbacks: RecommendationBreakdown['reasons'] = [
    input.financialScore === null
      ? { text: 'Financial return data is incomplete', tone: 'neutral' }
      : { text: input.financialScore >= 70 ? 'Strong investment economics' : 'Moderate investment economics', tone: input.financialScore >= 70 ? 'positive' : 'neutral' },
    input.assetScore === null
      ? { text: 'Limited apartment quality data', tone: 'neutral' }
      : { text: input.assetScore >= 50 ? 'Sound apartment fundamentals' : 'Weak apartment fundamentals', tone: input.assetScore >= 50 ? 'positive' : 'negative' },
    input.financingScore === null
      ? { text: 'Financing metrics are unavailable', tone: 'neutral' }
      : { text: input.financingScore >= 40 ? 'Manageable financing risk' : 'High financing risk', tone: input.financingScore >= 40 ? 'neutral' : 'negative' },
    input.marginPct === null
      ? { text: 'Fair value benchmark is unavailable', tone: 'neutral' }
      : { text: input.marginPct >= 0 ? 'Price is supported by the benchmark' : 'Price exceeds the benchmark', tone: input.marginPct >= 0 ? 'positive' : 'negative' },
  ];
  for (const fallback of fallbacks) {
    if (reasons.length >= 4) break;
    if (!reasons.some((reason) => reason.text === fallback.text)) reasons.push(fallback);
  }

  return { recommendation, reasons: reasons.slice(0, 4) };
}

export function calculate(input: RecommendationInput): Recommendation {
  return breakdown(input).recommendation;
}

export function tooltip(): string {
  return 'Summarizes the overall investment recommendation using deterministic decision rules rather than a single weighted score.';
}
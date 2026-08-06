import type { Underwriting } from '../lib/underwriting';
import type { ScoreBreakdown } from '../lib/scoring';
import { formatEur } from '../lib/format';
import { InfoDot } from './InfoDot';

interface Props {
  underwriting: Underwriting;
}

function ExpandableDetails({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <details className="underwriting-details">
      <summary aria-label={`Show ${label}`}>
        <span>Details</span>
        <span className="underwriting-expand-icon" aria-hidden="true">+</span>
      </summary>
      {children}
    </details>
  );
}

function ScoreCard({
  title,
  subtitle,
  result,
  tooltip,
}: {
  title: string;
  subtitle: string;
  result: ScoreBreakdown;
  tooltip: string;
}) {
  return (
    <article className="underwriting-card">
      <header className="underwriting-card-head">
        <span>{title}</span>
        <InfoDot text={tooltip} label={`How ${title} is calculated`} />
      </header>
      <div className="underwriting-score">
        {result.score === null ? 'N/A' : result.score}
        {result.score !== null && <span>/ 100</span>}
      </div>
      <p className="underwriting-subtitle">{subtitle}</p>
      <ExpandableDetails label={`${title} factors`}>
        <div className="underwriting-factors" aria-label={`${title} factors`}>
          {result.factors.map((factor) => (
            <div className="underwriting-factor" key={factor.key}>
              <span>{factor.label}</span>
              <strong>{factor.value}</strong>
              <small>{factor.score}/100 · {factor.weight}% weight</small>
            </div>
          ))}
          {result.unavailableReason && <p className="underwriting-unavailable">{result.unavailableReason}</p>}
        </div>
      </ExpandableDetails>
    </article>
  );
}

export function UnderwritingDashboard({ underwriting }: Props) {
  const recommendation = underwriting.recommendation.recommendation;
  const thesisClass = recommendation.toLowerCase();
  const thesisStatus = {
    BUY: { symbol: '✓' },
    NEGOTIATE: { symbol: '↔' },
    PASS: { symbol: '!' },
  }[recommendation];
  const thesis = underwriting.recommendation;
  const starRating = `${'★'.repeat(thesis.stars)}${'☆'.repeat(5 - thesis.stars)}`;
  const margin = underwriting.margin;
  const marginClass = margin.marginPct === null ? 'neutral' : margin.marginPct >= 0 ? 'positive' : 'negative';

  return (
    <section className="underwriting-dashboard" aria-label="Investment underwriting dashboard">
      <article className={`underwriting-card underwriting-thesis thesis-${thesisClass}`}>
        <header className="underwriting-card-head">
          <span>Investment Thesis</span>
          <InfoDot text={underwriting.tooltips.thesis} label="How the investment thesis is determined" />
        </header>
        <div className="underwriting-recommendation">
          <span aria-hidden="true">{thesisStatus.symbol}</span>
          {recommendation}
        </div>
        <div className="underwriting-rating" aria-label={`${thesis.stars} out of 5 stars`}>{starRating}</div>
        <p className="underwriting-subtitle">{thesis.opportunityLabel}</p>
        <ExpandableDetails label="investment thesis reasons">
          <div className="underwriting-thesis-details">
            {thesis.dealBreakers.length > 0 && (
              <section>
                <h4>Deal breakers</h4>
                <ul className="underwriting-reasons">
                  {thesis.dealBreakers.map((reason) => <li className="reason-negative" key={reason}>{reason}</li>)}
                </ul>
              </section>
            )}
            {thesis.strengths.length > 0 && (
              <section>
                <h4>Strengths</h4>
                <ul className="underwriting-reasons">
                  {thesis.strengths.map((reason) => <li className="reason-positive" key={reason}>{reason}</li>)}
                </ul>
              </section>
            )}
            {thesis.weaknesses.length > 0 && (
              <section>
                <h4>Weaknesses</h4>
                <ul className="underwriting-reasons">
                  {thesis.weaknesses.map((reason) => <li className="reason-negative" key={reason}>{reason}</li>)}
                </ul>
              </section>
            )}
            <section className="underwriting-conclusion">
              <h4>Conclusion</h4>
              <p>{thesis.conclusion}</p>
            </section>
          </div>
        </ExpandableDetails>
      </article>

      <ScoreCard
        title="Financial Performance"
        subtitle="How profitable is this investment?"
        result={underwriting.financial}
        tooltip={underwriting.tooltips.financial}
      />
      <ScoreCard
        title="Asset Attractiveness"
        subtitle="How attractive is the apartment to future tenants and buyers?"
        result={underwriting.asset}
        tooltip={underwriting.tooltips.asset}
      />
      <ScoreCard
        title="Financing Risk"
        subtitle="How safely can this investment be financed?"
        result={underwriting.financing}
        tooltip={underwriting.tooltips.financing}
      />
      <ScoreCard
        title="Wealth Creation"
        subtitle="Expected long-term wealth generation"
        result={underwriting.wealth}
        tooltip={underwriting.tooltips.wealth}
      />

      <article className="underwriting-card">
        <header className="underwriting-card-head">
          <span>Margin of Safety</span>
          <InfoDot text={underwriting.tooltips.margin} label="How margin of safety is calculated" />
        </header>
        <div className={`underwriting-score margin-${marginClass}`}>
          {margin.marginPct === null
            ? 'N/A'
            : `${margin.marginPct >= 0 ? '+' : ''}${margin.marginPct.toFixed(1)}%`}
        </div>
        <p className="underwriting-subtitle">Asking price versus estimated fair value</p>
        <ExpandableDetails label="margin of safety factors">
          <div className="underwriting-factors">
            <div className="underwriting-factor">
              <span>Estimated fair value</span>
              <strong>{margin.fairValue === null ? 'Unavailable' : formatEur(margin.fairValue)}</strong>
            </div>
            <div className="underwriting-factor">
              <span>Asking price</span>
              <strong>{formatEur(margin.askingPrice)}</strong>
            </div>
            <div className="underwriting-factor">
              <span>Method</span>
              <small>{margin.method}</small>
            </div>
          </div>
        </ExpandableDetails>
      </article>
    </section>
  );
}
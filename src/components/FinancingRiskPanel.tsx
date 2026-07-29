import type { Apartment, CostSettings, LoanParams, Results } from '../types';
import { computeFinancingRisk } from '../lib/risk';
import { formatEur2, formatPct } from '../lib/format';
import { InfoDot } from './InfoDot';

interface Props {
  apartment: Apartment;
  loan: LoanParams;
  costs: CostSettings;
  results: Results;
}

function RiskMetric({
  label,
  value,
  sub,
  tone = 'neutral',
  info,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: 'good' | 'bad' | 'neutral';
  info: string;
}) {
  return (
    <div className={`metric metric-${tone}`}>
      <span className="metric-value">{value}</span>
      <span className="metric-label">
        {label}
        <InfoDot text={info} label={`About: ${label}`} />
      </span>
      {sub && <span className="metric-sub">{sub}</span>}
    </div>
  );
}

export function FinancingRiskPanel({ apartment, loan, costs, results }: Props) {
  const risk = computeFinancingRisk(apartment, costs, results);
  const rentGap = risk.breakEvenColdRent === null
    ? null
    : apartment.monthlyColdRent - risk.breakEvenColdRent;
  const refinanceMargin = risk.refinanceInterestCeilingPct === null
    ? null
    : risk.refinanceInterestCeilingPct - loan.followUpInterestRatePct;

  return (
    <section className="card">
      <h2>Financing risk</h2>
      <p className="muted small" style={{ marginTop: 0 }}>
        Bank-style checks for leverage, debt coverage, and refinancing headroom.
      </p>
      <div className="metric-grid">
        <RiskMetric
          label="Loan-to-value (LTV)"
          value={risk.ltvPct === null ? 'n/a' : formatPct(risk.ltvPct)}
          sub="loan ÷ purchase price"
          tone={risk.ltvPct === null ? 'neutral' : risk.ltvPct <= 80 ? 'good' : risk.ltvPct > 100 ? 'bad' : 'neutral'}
          info="Loan amount divided by purchase price. Up to 80% generally leaves a stronger equity buffer; above 100% means the loan also exceeds the property price."
        />
        <RiskMetric
          label="Debt-service coverage (DSCR)"
          value={risk.dscr === null ? 'No debt' : `${risk.dscr.toFixed(2)}×`}
          sub={risk.dscr === null ? 'cash purchase' : risk.dscr >= 1 ? 'rent covers debt service' : 'rent does not cover debt service'}
          tone={risk.dscr === null ? 'neutral' : risk.dscr >= 1.2 ? 'good' : risk.dscr < 1 ? 'bad' : 'neutral'}
          info="Net operating income before the mortgage divided by annual loan payments. 1.00× is break-even; lenders commonly prefer a buffer around 1.20× or more."
        />
        <RiskMetric
          label="Break-even cold rent"
          value={risk.breakEvenColdRent === null ? 'n/a' : `${formatEur2(risk.breakEvenColdRent)}/mo`}
          sub={rentGap === null ? 'unavailable' : `${formatEur2(Math.abs(rentGap))} ${rentGap >= 0 ? 'buffer' : 'shortfall'} vs current rent`}
          tone={rentGap === null ? 'neutral' : rentGap >= 0 ? 'good' : 'bad'}
          info="Gross monthly cold rent needed to cover vacancy, operating costs, and the mortgage payment without a monthly top-up."
        />
        <RiskMetric
          label="Refinance interest ceiling"
          value={risk.refinanceInterestCeilingPct === null ? 'No balance' : formatPct(risk.refinanceInterestCeilingPct)}
          sub={refinanceMargin === null ? 'nothing to refinance' : `${formatPct(Math.abs(refinanceMargin))} ${refinanceMargin >= 0 ? 'above' : 'below'} your assumption`}
          tone={refinanceMargin === null ? 'good' : refinanceMargin >= 2 ? 'good' : refinanceMargin < 0 ? 'bad' : 'neutral'}
          info="Highest follow-up interest rate at which the current monthly payment still covers interest on the balance after the fixed period. At or above this rate, the balance stops shrinking."
        />
      </div>
    </section>
  );
}
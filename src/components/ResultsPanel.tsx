import type { Results } from '../types';
import { formatEur, formatEur2, formatNum, formatPct } from '../lib/format';
import { InfoDot } from './InfoDot';

function Metric({
  label,
  value,
  sub,
  tone,
  info,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: 'good' | 'bad' | 'neutral';
  info?: string;
}) {
  return (
    <div className={`metric metric-${tone ?? 'neutral'}`}>
      <span className="metric-value">{value}</span>
      <span className="metric-label">
        {label}
        {info && <InfoDot text={info} label={`About: ${label}`} />}
      </span>
      {sub && <span className="metric-sub">{sub}</span>}
    </div>
  );
}

export function ResultsPanel({ r }: { r: Results }) {
  const cfTone = r.monthlyCashFlowAfterLoan >= 0 ? 'good' : 'bad';
  const yieldTone = r.grossYieldPct >= 4 ? 'good' : r.grossYieldPct < 3 ? 'bad' : 'neutral';

  return (
    <section className="card">
      <h2>Key metrics</h2>
      <div className="metric-grid">
        <Metric
          label="Gross yield (Bruttomietrendite)"
          value={formatPct(r.grossYieldPct)}
          tone={yieldTone}
          info="Annual cold rent ÷ price. Quick gauge, ignores costs. In big cities 3–4% is normal, 4%+ is good, under 3% is thin."
        />
        <Metric
          label="Net yield (Nettomietrendite)"
          value={formatPct(r.netYieldPct)}
          info="Rent after running costs ÷ total investment (incl. closing costs). More realistic than gross yield."
        />
        <Metric
          label="Price factor (Kaufpreisfaktor)"
          value={`${formatNum(r.priceToRentMultiple)}×`}
          sub="annual cold rents"
          info="Years of rent that equal the price. Lower = cheaper. Below ~25× is good value; big cities are often 28–35×."
        />
        <Metric
          label="Cash-on-cash return"
          value={formatPct(r.cashOnCashPct)}
          tone={r.cashOnCashPct >= 0 ? 'good' : 'bad'}
          info="Yearly cash flow after the loan ÷ the cash you actually put in. Negative means you top up out of pocket each month."
        />
        <Metric
          label="Monthly cash flow (after loan)"
          value={formatEur2(r.monthlyCashFlowAfterLoan)}
          tone={cfTone}
          info="What lands in (or leaves) your pocket each month after rent, running costs and the loan payment."
        />
        <Metric
          label="Monthly loan payment (annuity)"
          value={formatEur2(r.monthlyAnnuity)}
          info="Fixed monthly payment = (interest % + Tilgung %) of the loan ÷ 12. Interest and Tilgung are added together, not stacked."
        />
        <Metric
          label={`Balance after fixed period (${r.fixedRatePeriodYears}y)`}
          value={r.fullyRepaidWithinFixed ? 'Fully repaid 🎉' : formatEur(r.restschuldAtFixedEnd)}
          tone={r.fullyRepaidWithinFixed ? 'good' : 'neutral'}
          info="Restschuld: how much you'd still owe when the fixed-interest period ends. If you take a follow-up loan, this is what gets refinanced at the then-current rate."
        />
        <Metric
          label={`Interest during fixed period (${r.fixedRatePeriodYears}y)`}
          value={formatEur(r.interestDuringFixed)}
          info="Interest paid to the bank only during the guaranteed fixed-rate years — the part you can plan with certainty."
        />
        <Metric
          label="Loan amount"
          value={formatEur(r.loanAmount)}
          info="Price (plus closing costs if you chose to finance them) minus your down payment."
        />
        <Metric
          label="Cash invested (equity + costs)"
          value={formatEur(r.cashInvested)}
          info="The real money you need up front: your down payment plus any closing costs not covered by the loan."
        />
        <Metric
          label="Total investment"
          value={formatEur(r.totalInvestment)}
          info="Purchase price + all closing costs (Kaufnebenkosten)."
        />
        <Metric
          label="Full loan payoff"
          value={r.payoffDateLabel}
          info={
            r.repaymentStrategy === 'payoffWithinFixed'
              ? 'With this plan the loan is fully repaid by the end of the fixed period.'
              : 'Estimated total payoff, assuming the follow-up loan continues at your assumed rate and the same monthly payment.'
          }
        />
        <Metric
          label="Total interest paid"
          value={formatEur(r.totalInterest)}
          info="All interest over the full life of the loan (including the assumed follow-up phase, if any). Lower is better."
        />
        <Metric
          label="Price / m²"
          value={formatEur(r.pricePerSqm)}
          info="Purchase price ÷ living area. Compare it to the district average in the benchmark panel."
        />
      </div>
    </section>
  );
}

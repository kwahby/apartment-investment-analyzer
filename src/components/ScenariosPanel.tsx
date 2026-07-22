import type { ScenarioResult } from '../lib/scenarios';
import { formatEur, formatEur2, formatPct } from '../lib/format';
import { InfoDot } from './InfoDot';

function money(n: number): { text: string; cls: string } {
  return { text: formatEur2(n), cls: n >= 0 ? 'pos' : 'neg' };
}

export function ScenariosPanel({ scenarios }: { scenarios: ScenarioResult[] }) {
  const taxEnabled = scenarios[0]?.taxEnabled;

  return (
    <div className="stack">
      <section className="card">
        <h2>What if things go better or worse?</h2>
        <p className="muted small" style={{ marginTop: 0 }}>
          Your numbers rely on assumptions no one can be sure of — rents, vacancy,
          interest rates, price growth. These three scenarios stress-test them so
          you can see the realistic range of what lands in (or leaves) your pocket.
        </p>

        <div className="scen-grid">
          <div className="scen-row scen-head">
            <span>Scenario</span>
            <span className="scen-bad">Cautious</span>
            <span className="scen-neutral">Base</span>
            <span className="scen-good">Optimistic</span>
          </div>

          <ScenRow
            label="Out of pocket / month (before tax)"
            info="Rent minus running costs and the loan payment, in year 1. Negative = you top up from your own money each month."
            values={scenarios.map((s) => money(s.monthlyBeforeTax))}
          />
          <ScenRow
            label="Out of pocket / month (after tax)"
            info="The same, after AfA depreciation and interest deduction at your marginal rate. This is the truest 'what I actually pay' figure."
            values={scenarios.map((s) => money(s.monthlyAfterTax))}
          />
          <ScenRow
            label="Total top-ups until positive"
            info="Sum of the monthly top-ups you'd pay before the flat turns cash-flow positive (usually at loan payoff)."
            values={scenarios.map((s) => ({
              text: s.totalOutOfPocketUntilPositive > 0 ? formatEur(s.totalOutOfPocketUntilPositive) : '—',
              cls: s.totalOutOfPocketUntilPositive > 0 ? 'neg' : '',
            }))}
          />
          <ScenRow
            label="Balance after fixed period"
            info="What you'd still owe (Restschuld) when the fixed-interest period ends."
            values={scenarios.map((s) => ({
              text: s.fullyRepaidWithinFixed ? 'Repaid' : formatEur(s.restschuldAtFixedEnd),
              cls: s.fullyRepaidWithinFixed ? 'pos' : '',
            }))}
          />
          <ScenRow
            label={`Return over hold (IRR${taxEnabled ? ', a/tax' : ''})`}
            info="Annualized return on your invested cash across the whole holding period, including the sale."
            values={scenarios.map((s) => ({
              text: s.irrPct === null ? 'n/a' : formatPct(s.irrPct),
              cls: s.irrPct === null ? '' : s.irrPct >= 4 ? 'pos' : s.irrPct < 0 ? 'neg' : '',
            }))}
          />
          <ScenRow
            label={`Total profit (${taxEnabled ? 'a/tax' : 'pre-tax'})`}
            info="Net gain over the whole hold, including the sale, minus the cash you put in."
            values={scenarios.map((s) => money(s.totalProfit))}
          />
        </div>
      </section>

      <section className="card">
        <h2>What each scenario changes</h2>
        <div className="scen-assume">
          {scenarios.map((s) => (
            <div key={s.key} className={`scen-assume-card scen-${s.tone}`}>
              <div className="scen-assume-title">{s.label}</div>
              <ul>
                {s.assumptions.map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="muted small">
          Tip: adjust the middle "Base" figures in the Financing, Settings and
          Projection tabs — the Cautious and Optimistic columns shift relative to
          them. {taxEnabled ? '' : 'Turn on the after-tax view in the Projection tab to stress-test after-tax returns too.'}
        </p>
      </section>
    </div>
  );
}

function ScenRow({
  label,
  info,
  values,
}: {
  label: string;
  info?: string;
  values: { text: string; cls: string }[];
}) {
  return (
    <div className="scen-row">
      <span className="scen-label">
        {label}
        {info && <InfoDot text={info} label={label} />}
      </span>
      {values.map((v, i) => (
        <span key={i} className={`scen-val ${v.cls}`}>{v.text}</span>
      ))}
    </div>
  );
}

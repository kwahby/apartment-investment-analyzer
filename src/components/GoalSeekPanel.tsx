import { useMemo, useState } from 'react';
import type { Apartment, CostSettings, LoanParams, ProjectionParams } from '../types';
import { goalSeekMaxPrice, type GoalMetric } from '../lib/goalSeek';
import { NumberField } from './NumberField';
import { InfoDot } from './InfoDot';
import { formatEur, formatPct } from '../lib/format';

interface Props {
  apartment: Apartment;
  loan: LoanParams;
  costs: CostSettings;
  projection: ProjectionParams;
}

const METRICS: { key: GoalMetric; label: string; needsTarget: boolean; unit?: string }[] = [
  { key: 'breakEvenCashFlow', label: 'Break-even cash flow (€0/mo)', needsTarget: false },
  { key: 'grossYield', label: 'Gross yield target', needsTarget: true, unit: '%' },
  { key: 'netYield', label: 'Net yield target', needsTarget: true, unit: '%' },
  { key: 'irr', label: 'IRR target', needsTarget: true, unit: '%' },
];

export function GoalSeekPanel({ apartment, loan, costs, projection }: Props) {
  const [metric, setMetric] = useState<GoalMetric>('breakEvenCashFlow');
  const [target, setTarget] = useState(4);

  const meta = METRICS.find((m) => m.key === metric)!;

  const result = useMemo(
    () => goalSeekMaxPrice(metric, target, apartment, loan, costs, projection),
    [metric, target, apartment, loan, costs, projection],
  );

  const price = apartment.purchasePrice;
  const maxPrice = result.maxPrice;
  const headroom = maxPrice !== null ? maxPrice - price : 0;

  const fmtCurrent = () => {
    if (metric === 'breakEvenCashFlow') return `${formatEur(result.currentValue)}/mo`;
    return formatPct(result.currentValue);
  };

  return (
    <section className="card goal-seek">
      <h2>
        Max offer price
        <InfoDot
          text="Works out the highest price you could pay and still hit your chosen target, holding everything else (rent, rates, down payment) fixed. Great for setting a negotiation ceiling."
          label="About: Max offer price"
        />
      </h2>

      <div className="grid-2">
        <label className="field">
          <span className="field-label">Target</span>
          <span className="field-input">
            <select value={metric} onChange={(e) => setMetric(e.target.value as GoalMetric)}>
              {METRICS.map((m) => (
                <option key={m.key} value={m.key}>
                  {m.label}
                </option>
              ))}
            </select>
          </span>
        </label>
        {meta.needsTarget && (
          <NumberField
            label="Target value"
            value={target}
            onChange={setTarget}
            suffix={meta.unit}
            step={0.5}
            min={0}
          />
        )}
      </div>

      {!result.achievable ? (
        <div className="fixed-callout fixed-callout-warn" style={{ marginTop: 6 }}>
          <span>
            ⚠️ This target can't be reached at these rent/financing assumptions — even a very low
            price wouldn't get there. Try a lower target, higher rent, or more equity.
          </span>
        </div>
      ) : (
        <>
          <div className="goal-result">
            <div className="goal-result-main">
              <span className="goal-result-label">Pay at most</span>
              <span className="goal-result-price">{formatEur(maxPrice ?? 0)}</span>
            </div>
            <div className={`goal-badge ${result.meetsAtCurrent ? 'is-good' : 'is-bad'}`}>
              {result.meetsAtCurrent ? '✓ Your price qualifies' : '✗ Above your ceiling'}
            </div>
          </div>

          <p className="muted small" style={{ marginTop: 10 }}>
            {result.meetsAtCurrent ? (
              <>
                Your current price of <strong>{formatEur(price)}</strong> already meets this target
                (current {meta.needsTarget ? meta.label.replace(' target', '').toLowerCase() : 'cash flow'}:{' '}
                <strong>{fmtCurrent()}</strong>). You have about{' '}
                <strong>{formatEur(headroom)}</strong> of headroom before you'd miss it.
              </>
            ) : (
              <>
                Your current price of <strong>{formatEur(price)}</strong> is about{' '}
                <strong>{formatEur(-headroom)}</strong> too high for this target (current:{' '}
                <strong>{fmtCurrent()}</strong>). You'd need to negotiate down to{' '}
                <strong>{formatEur(maxPrice ?? 0)}</strong>.
              </>
            )}
          </p>
        </>}
      )}
      <p className="muted small" style={{ marginTop: 12 }}>
        The maximum offer price is a back-of-envelope estimate based on your current inputs — not a
        formal valuation. It ignores individual negotiation factors, legal due diligence, and market
        conditions. Not financial or property advice; verify with a qualified advisor before
        making any offer.
      </p>
    </section>
  );
}

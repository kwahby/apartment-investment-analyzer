import type { Results } from '../types';
import { formatEur, formatPct } from '../lib/format';

function DeltaBadge({ deltaPct, invert }: { deltaPct: number; invert?: boolean }) {
  // For buy price: below average (negative) is good. For rent: above average is good.
  const good = invert ? deltaPct > 0 : deltaPct < 0;
  const tone = Math.abs(deltaPct) < 2 ? 'neutral' : good ? 'good' : 'bad';
  const sign = deltaPct > 0 ? '+' : '';
  return <span className={`badge badge-${tone}`}>{sign}{deltaPct.toFixed(1)} %</span>;
}

export function BenchmarkPanel({ r }: { r: Results }) {
  const b = r.benchmark;
  if (!b.hasData) {
    return (
      <section className="card">
        <h2>Market benchmark</h2>
        <p className="muted">
          Enter an average price per m² for the area (in the form) to compare this
          listing against the local market.
        </p>
      </section>
    );
  }
  const heading = b.areaLabel ? `Market benchmark — ${b.areaLabel}` : 'Market benchmark';
  return (
    <section className="card">
      <h2>{heading}</h2>
      <div className="bench-grid">
        <div className="bench-row bench-head">
          <span></span>
          <span>This listing</span>
          <span>Area avg.</span>
          <span>Δ</span>
        </div>
        <div className="bench-row">
          <span>Price / m²</span>
          <span>{formatEur(r.pricePerSqm)}</span>
          <span>{formatEur(b.refBuyPerSqm)}</span>
          <span><DeltaBadge deltaPct={b.buyDeltaPct} /></span>
        </div>
        {b.hasRentRef && (
          <div className="bench-row">
            <span>Rent / m²</span>
            <span>{formatEur(r.rentPerSqm)}</span>
            <span>{formatEur(b.refRentPerSqm)}</span>
            <span><DeltaBadge deltaPct={b.rentDeltaPct} invert /></span>
          </div>
        )}
      </div>
      <div className="loc-score">
        <span>Location score</span>
        <div className="loc-bar">
          <div className="loc-bar-fill" style={{ width: `${(b.locationScore / 10) * 100}%` }} />
        </div>
        <span className="loc-score-val">{b.locationScore}/10</span>
      </div>
      <p className="muted small">
        Negative price Δ = cheaper than the area average (good for a buyer).
        {b.hasRentRef && ' Positive rent Δ = this unit rents above the area average.'}
        {' '}Yield here: {formatPct(r.grossYieldPct)}.
      </p>
      {b.includesBalcony && (
        <p className="muted small">
          €/m² is based on an effective area of {b.effectiveSqm} m² (living area plus{' '}
          {b.balconyWeightPct}% of the balcony).
        </p>
      )}
    </section>
  );
}

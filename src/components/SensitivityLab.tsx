import { useState } from 'react';
import type { Apartment, CostSettings, LoanParams, ProjectionParams } from '../types';
import { computeResults } from '../lib/finance';
import { computeProjection } from '../lib/projection';
import { computeTippingPoints } from '../lib/tippingPoints';
import { calculateUnderwriting } from '../lib/underwriting';
import { formatEur, formatPct } from '../lib/format';

interface Props {
  apartment: Apartment;
  loan: LoanParams;
  costs: CostSettings;
  projection: ProjectionParams;
  onApply: (patch: {
    apartment: Apartment;
    loan: LoanParams;
    costs: CostSettings;
    projection: ProjectionParams;
  }) => void;
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  baseline,
  fmt,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  baseline: number;
  fmt: (n: number) => string;
  onChange: (v: number) => void;
}) {
  const changed = Math.abs(value - baseline) > step / 2;
  const pct = ((baseline - min) / (max - min)) * 100;
  return (
    <div className="slab-slider">
      <div className="slab-slider-head">
        <span className="slab-slider-label">{label}</span>
        <span className={`slab-slider-value ${changed ? 'is-changed' : ''}`}>{fmt(value)}</span>
      </div>
      <div className="slab-slider-track">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
        />
        <span className="slab-baseline-tick" style={{ left: `${Math.min(100, Math.max(0, pct))}%` }} title="Your current value" />
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  delta,
  fmt,
  higherBetter = true,
}: {
  label: string;
  value: number;
  delta: number;
  fmt: (n: number) => string;
  higherBetter?: boolean;
}) {
  const eps = 1e-6;
  const flat = Math.abs(delta) < eps;
  const good = higherBetter ? delta > 0 : delta < 0;
  const tone = flat ? 'flat' : good ? 'good' : 'bad';
  const arrow = flat ? '' : delta > 0 ? '▲' : '▼';
  return (
    <div className="slab-stat">
      <span className="slab-stat-label">{label}</span>
      <span className="slab-stat-value">{fmt(value)}</span>
      {!flat && (
        <span className={`slab-stat-delta d-${tone}`}>
          {arrow} {fmt(Math.abs(delta))}
        </span>
      )}
    </div>
  );
}

export function SensitivityLab({ apartment, loan, costs, projection, onApply }: Props) {
  const [price, setPrice] = useState(apartment.purchasePrice);
  const [rent, setRent] = useState(apartment.monthlyColdRent);
  const [rate, setRate] = useState(loan.annualInterestRatePct);
  const [vacancy, setVacancy] = useState(costs.vacancyPct);
  const [appr, setAppr] = useState(projection.annualAppreciationPct);
  const [rentGrowth, setRentGrowth] = useState(projection.annualRentGrowthPct);

  const modApt: Apartment = { ...apartment, purchasePrice: price, monthlyColdRent: rent };
  const modLoan: LoanParams = { ...loan, annualInterestRatePct: rate };
  const modCosts: CostSettings = { ...costs, vacancyPct: vacancy };
  const modProj: ProjectionParams = {
    ...projection,
    annualAppreciationPct: appr,
    annualRentGrowthPct: rentGrowth,
  };

  const res = computeResults(modApt, modLoan, modCosts);
  const proj = computeProjection(modApt, modCosts, res, modProj);

  const baseRes = computeResults(apartment, loan, costs);
  const baseProj = computeProjection(apartment, costs, baseRes, projection);
  const underwriting = calculateUnderwriting({ apartment: modApt, loan: modLoan, costs: modCosts, results: res, projection: proj });
  const baseUnderwriting = calculateUnderwriting({ apartment, loan, costs, results: baseRes, projection: baseProj });

  const vColor =
    underwriting.recommendation.recommendation === 'BUY'
      ? 'buy'
      : underwriting.recommendation.recommendation === 'PASS' ? 'avoid' : 'caution';

  const buyVsEtf = proj.buyEndWealth - proj.etfEndWealth;
  const baseBuyVsEtf = baseProj.buyEndWealth - baseProj.etfEndWealth;

  const irr = proj.irrPct ?? 0;
  const baseIrr = baseProj.irrPct ?? 0;

  const dirty =
    price !== apartment.purchasePrice ||
    rent !== apartment.monthlyColdRent ||
    rate !== loan.annualInterestRatePct ||
    vacancy !== costs.vacancyPct ||
    appr !== projection.annualAppreciationPct ||
    rentGrowth !== projection.annualRentGrowthPct;

  const reset = () => {
    setPrice(apartment.purchasePrice);
    setRent(apartment.monthlyColdRent);
    setRate(loan.annualInterestRatePct);
    setVacancy(costs.vacancyPct);
    setAppr(projection.annualAppreciationPct);
    setRentGrowth(projection.annualRentGrowthPct);
  };

  const apply = () =>
    onApply({ apartment: modApt, loan: modLoan, costs: modCosts, projection: modProj });

  const tips = computeTippingPoints(modApt, modLoan, modCosts, modProj);
  const fmtTip = (t: (typeof tips)[number]) =>
    t.unit === '€' ? formatEur(t.flipValue ?? 0) : `${t.flipValue}%`;

  return (
    <div className="slab">
      <p className="muted small" style={{ marginTop: 0 }}>
        Drag the sliders to stress-test the deal. Everything updates live and the arrows show the
        change vs. your current numbers. Nothing is saved unless you hit “Apply”.
      </p>

      {/* live outputs */}
      <div className={`slab-verdict v-${vColor}`}>
        <div className="slab-verdict-main">
          <span className="slab-verdict-label">{underwriting.recommendation.recommendation}</span>
          <span className="slab-verdict-score">Rules-based recommendation</span>
        </div>
        <div className="slab-verdict-delta">
          Financial {underwriting.financial.score ?? 'n/a'}
          {' · '}Asset {underwriting.asset.score ?? 'n/a'}
          {' · '}Financing {underwriting.financing.score ?? 'n/a'}
          {' · '}Wealth {underwriting.wealth.score ?? 'n/a'}
          {underwriting.recommendation.recommendation !== baseUnderwriting.recommendation.recommendation
            ? ` · changed from ${baseUnderwriting.recommendation.recommendation}`
            : ' · recommendation unchanged'}
        </div>
      </div>

      <div className="slab-stats">
        <Stat label="Monthly cash flow" value={res.monthlyCashFlowAfterLoan} delta={res.monthlyCashFlowAfterLoan - baseRes.monthlyCashFlowAfterLoan} fmt={formatEur} />
        <Stat label="Gross yield" value={res.grossYieldPct} delta={res.grossYieldPct - baseRes.grossYieldPct} fmt={(n) => formatPct(n)} />
        <Stat label={`IRR (${modProj.holdingYears}y)`} value={irr} delta={irr - baseIrr} fmt={(n) => formatPct(n)} />
        <Stat label={`Profit (${modProj.holdingYears}y)`} value={proj.totalProfit} delta={proj.totalProfit - baseProj.totalProfit} fmt={formatEur} />
        <Stat label="Flat − ETF" value={buyVsEtf} delta={buyVsEtf - baseBuyVsEtf} fmt={formatEur} />
      </div>

      {/* sliders */}
      <div className="slab-sliders">
        <Slider label="Purchase price" value={price} min={Math.max(10000, Math.round(apartment.purchasePrice * 0.6))} max={Math.round(apartment.purchasePrice * 1.5)} step={5000} baseline={apartment.purchasePrice} fmt={formatEur} onChange={setPrice} />
        <Slider label="Monthly cold rent" value={rent} min={Math.max(100, Math.round(apartment.monthlyColdRent * 0.6))} max={Math.round(apartment.monthlyColdRent * 1.6)} step={25} baseline={apartment.monthlyColdRent} fmt={formatEur} onChange={setRent} />
        <Slider label="Interest rate" value={rate} min={0} max={8} step={0.1} baseline={loan.annualInterestRatePct} fmt={(n) => formatPct(n)} onChange={setRate} />
        <Slider label="Vacancy allowance" value={vacancy} min={0} max={15} step={0.5} baseline={costs.vacancyPct} fmt={(n) => formatPct(n)} onChange={setVacancy} />
        <Slider label="Appreciation / yr" value={appr} min={-2} max={8} step={0.5} baseline={projection.annualAppreciationPct} fmt={(n) => formatPct(n)} onChange={setAppr} />
        <Slider label="Rent growth / yr" value={rentGrowth} min={0} max={6} step={0.5} baseline={projection.annualRentGrowthPct} fmt={(n) => formatPct(n)} onChange={setRentGrowth} />
      </div>

      {/* tipping points */}
      <div className="slab-tips">
        <h3>Where the verdict flips</h3>
        <p className="muted small" style={{ marginTop: 0 }}>
          Starting from the values above, here's how far each lever can move before the verdict
          downgrades.
        </p>
        <div className="slab-tip-grid">
          {tips.map((t) => (
            <div key={t.variable} className="slab-tip">
              <span className="slab-tip-label">{t.label}</span>
              {t.flipValue === null || t.flipTo === null ? (
                <span className="slab-tip-hold">holds across the range</span>
              ) : (
                <span className="slab-tip-value">
                  {t.worsening === 'up' ? 'up to' : 'down to'} <strong>{fmtTip(t)}</strong>
                  {'  '}→{' '}
                  <span className={`slab-tip-to v-${t.flipTo.toLowerCase()}`}>{t.flipTo}</span>
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="slab-actions">
        <button type="button" className="btn-secondary" onClick={reset} disabled={!dirty}>
          Reset to current
        </button>
        <button type="button" className="btn-primary" onClick={apply} disabled={!dirty}>
          Apply to inputs
        </button>
      </div>
    </div>
  );
}

import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { Apartment, Profile, Projection, ProjectionParams } from '../types';
import { formatEur, formatPct } from '../lib/format';
import { estimateMarginalRate, afaRateForBuildYear } from '../lib/germanTax';
import { NumberField } from './NumberField';
import { InfoDot } from './InfoDot';

interface Props {
  params: ProjectionParams;
  setParams: (p: ProjectionParams) => void;
  p: Projection;
  apartment: Apartment;
  profile: Profile;
}

function Metric({
  label,
  value,
  tone,
  info,
}: {
  label: string;
  value: string;
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
    </div>
  );
}

export function ProjectionPanel({ params, setParams, p, apartment, profile }: Props) {
  const up = (patch: Partial<ProjectionParams>) => setParams({ ...params, ...patch });

  // Suggested marginal rate from the user's profile (income + tax class + church tax),
  // and suggested AfA rate from the building's completion year. Both are one-click
  // "Use" hints so the Projection tab stays consistent with the Affordability estimate
  // while still allowing a manual override.
  const estMarginalPct = estimateMarginalRate({
    grossAnnualIncome: profile.grossAnnualIncome,
    taxClass: profile.taxClass,
    children: profile.children,
    churchTaxPct: profile.churchTaxPct,
  }).effectivePct;
  const suggestedAfa = afaRateForBuildYear(apartment.buildYear);

  const chartData = p.years.map((y) => ({
    year: y.year,
    Value: y.propertyValue,
    Loan: y.remainingLoan,
    Equity: y.equity,
    Cumulative: y.cumulativeCashFlow,
  }));

  const irrTone = p.irrPct === null ? 'neutral' : p.irrPct >= 5 ? 'good' : p.irrPct < 2 ? 'bad' : 'neutral';

  const maxWealth = Math.max(p.buyEndWealth, p.etfEndWealth, 1);
  const barPct = (v: number) => Math.max(2, Math.min(100, (v / maxWealth) * 100));

  return (
    <div className="stack">
      <section className="card">
        <h2>Projection assumptions</h2>
        <p className="muted small" style={{ marginTop: 0 }}>
          These are estimates about the future — nobody knows them for sure. Try a
          few scenarios (optimistic and cautious) to see how sensitive the return is.
        </p>
        <div className="grid-2">
          <NumberField
            label="Holding period"
            value={params.holdingYears}
            onChange={(v) => up({ holdingYears: v })}
            suffix="years"
            step={1}
            min={1}
            max={40}
            hint="How long you plan to own before selling. In Germany, holding 10+ years makes the sale profit tax-free."
          />
          <NumberField
            label="Property appreciation"
            value={params.annualAppreciationPct}
            onChange={(v) => up({ annualAppreciationPct: v })}
            suffix="% / year"
            step={0.5}
            hint="Assumed yearly rise in the flat's value. Long-run German averages are ~2–3%, but it can also stagnate or fall."
          />
          <NumberField
            label="Rent growth"
            value={params.annualRentGrowthPct}
            onChange={(v) => up({ annualRentGrowthPct: v })}
            suffix="% / year"
            step={0.5}
            hint="Assumed yearly rent increase. Many German cities have caps (Mietpreisbremse) that can limit this."
          />
          <NumberField
            label="Cost inflation"
            value={params.annualCostInflationPct}
            onChange={(v) => up({ annualCostInflationPct: v })}
            suffix="% / year"
            step={0.5}
            hint="Assumed yearly rise in Hausgeld, maintenance and management costs."
          />
          <NumberField
            label="Selling costs"
            value={params.sellingCostsPct}
            onChange={(v) => up({ sellingCostsPct: v })}
            suffix="% of sale"
            step={0.5}
            hint="Costs when you sell (agent, notary, prep). Deducted from the sale price."
          />
          <NumberField
            label="Expected net annual return (after tax &amp; fees)"
            value={params.etfReturnPct}
            onChange={(v) => up({ etfReturnPct: v })}
            suffix="% / year"
            step={0.5}
            hint="Assumed yearly return if you invested the same cash in a stock-index ETF instead. Long-run global equity averages are ~6–8% before tax."
          />
        </div>

        <label className="checkbox-field">
          <input
            type="checkbox"
            checked={params.taxEnabled}
            onChange={(e) => up({ taxEnabled: e.target.checked })}
          />
          <span>
            Show the German after-tax view (AfA depreciation, deductible interest,
            income tax)
          </span>
        </label>

        {params.taxEnabled && (
          <div className="grid-2">
            <NumberField
              label="Your marginal tax rate"
              value={params.marginalTaxRatePct}
              onChange={(v) => up({ marginalTaxRatePct: v })}
              suffix="%"
              step={1}
              hint="The tax rate on your top slice of income. Rental profit is taxed at this rate; rental losses reduce your other taxable income at this rate."
              footer={
                Math.abs(params.marginalTaxRatePct - estMarginalPct) >= 0.1 && (
                  <>
                    Estimated {formatPct(estMarginalPct)} from your profile{' '}
                    <button
                      type="button"
                      className="field-footer-link"
                      onClick={() => up({ marginalTaxRatePct: estMarginalPct })}
                    >
                      Use
                    </button>
                  </>
                )
              }
            />
            <NumberField
              label="Building share of price"
              value={params.buildingSharePct}
              onChange={(v) => up({ buildingSharePct: v })}
              suffix="%"
              step={5}
              hint="Only the building depreciates, not the land. Typically 60–80% of the price is the building; the rest is land."
            />
            <NumberField
              label="Depreciation (AfA) rate"
              value={params.afaRatePct}
              onChange={(v) => up({ afaRatePct: v })}
              suffix="% / year"
              step={0.5}
              hint="Yearly write-off on the building. Usually 2% (buildings from 1925+), 2.5% (pre-1925), or 5% degressive for new builds from 2023."
              footer={
                suggestedAfa !== undefined &&
                Math.abs(params.afaRatePct - suggestedAfa) >= 0.05 && (
                  <>
                    Typical {formatPct(suggestedAfa)} for a {apartment.buildYear} build{' '}
                    <button
                      type="button"
                      className="field-footer-link"
                      onClick={() => up({ afaRatePct: suggestedAfa })}
                    >
                      Use
                    </button>
                  </>
                )
              }
            />
          </div>
        )}

        {params.taxEnabled && (
          <>
            <label className="checkbox-field" style={{ marginTop: 12 }}>
              <input
                type="checkbox"
                checked={params.sonderAfaEnabled}
                onChange={(e) => up({ sonderAfaEnabled: e.target.checked })}
              />
              <span>
                Apply Sonderabschreibung §7b — +5%/year on the §7b basis for years 1–4
                (qualifying new builds only — see eligibility below).
              </span>
            </label>

            {params.sonderAfaEnabled && (
              <div style={{ marginTop: 10 }}>
                <div className="grid-2">
                  <NumberField
                    label="Eligible living area (m²)"
                    value={params.sonder7bEligibleAreaSqm ?? 0}
                    onChange={(v) => up({ sonder7bEligibleAreaSqm: v })}
                    suffix="m²"
                    step={1}
                    min={0}
                    hint="The qualifying floor area for §7b. The assessment basis is capped at this area × €4,000/m². Leave at 0 if unknown (uses the building value — eligibility unverified)."
                  />
                  <NumberField
                    label="Build cost / purchase cost per m²"
                    value={params.sonder7bCostPerSqm ?? 0}
                    onChange={(v) => up({ sonder7bCostPerSqm: v })}
                    suffix="€/m²"
                    step={100}
                    min={0}
                    hint="Total construction or purchase cost per m². If above €5,200/m² the property is not eligible for §7b. Leave at 0 if unknown (eligibility unverified)."
                  />
                </div>

                {/* Eligibility status banner */}
                {(() => {
                  const cost = params.sonder7bCostPerSqm ?? 0;
                  const area = params.sonder7bEligibleAreaSqm ?? 0;
                  if (cost > 5200) {
                    return (
                      <div className="fixed-callout fixed-callout-warn" style={{ marginTop: 8 }}>
                        <span>
                          ❌ <strong>Not eligible:</strong> the entered cost of{' '}
                          <strong>€{cost.toLocaleString('de-DE')}/m²</strong> exceeds the
                          €5,200/m² statutory ceiling. §7b Sonder-AfA has not been applied.
                        </span>
                      </div>
                    );
                  }
                  if (cost === 0 || area === 0) {
                    return (
                      <div className="fixed-callout fixed-callout-warn" style={{ marginTop: 8 }}>
                        <span>
                          ⚠️ <strong>Eligibility not verified.</strong> Enter the living area
                          and build cost per m² above to confirm. Until then the §7b benefit
                          is calculated on the full building basis without the area cap —
                          this may overstate the deduction.{' '}
                          Verify eligibility with a Steuerberater before relying on this figure.
                        </span>
                      </div>
                    );
                  }
                  return (
                    <div className="fixed-callout fixed-callout-good" style={{ marginTop: 8 }}>
                      <span>
                        ✅ <strong>Eligible (cost check passed):</strong> §7b basis capped at{' '}
                        <strong>{area} m² × €4,000 = €{(area * 4000).toLocaleString('de-DE')}</strong>.
                        Annual extra AfA: <strong>€{Math.round(area * 4000 * 0.05).toLocaleString('de-DE')}</strong>{' '}
                        for years 1–4 (capped at the actual depreciable building basis).
                        Confirm all other §7b conditions (EH40/QNG, 10-year rental period) with
                        a Steuerberater.
                      </span>
                    </div>
                  );
                })()}
              </div>
            )}

            {params.sonderAfaEnabled && (
              <p className="muted small" style={{ marginTop: 8 }}>
                §7b requires: new-build residential rental, build application Oct 2023–Sep 2029,
                EH40 energy standard with QNG seal, cost ≤ €5,200/m², rented ≥ 10 years.
                Existing flats do <strong>not</strong> qualify.
                Not financial or tax advice — verify with a Steuerberater.
              </p>
            )}
          </>
        )}
      </section>

      <section className="card">
        <h2>
          Total return over {p.holdingYears} years
          {p.taxEnabled ? ' (after tax)' : ' (before tax)'}
        </h2>
        <div className="metric-grid">
          <Metric
            label="Annualized return (IRR)"
            value={p.irrPct === null ? 'n/a' : formatPct(p.irrPct)}
            tone={irrTone}
            info="The yearly return on the cash you put in, counting rent cash flow, loan paydown and the sale. Compare it to what your money could earn elsewhere (e.g. an ETF ~6–8%)."
          />
          <Metric
            label="Total profit"
            value={formatEur(p.totalProfit)}
            tone={p.totalProfit >= 0 ? 'good' : 'bad'}
            info="All cash flows over the hold plus net sale proceeds, minus the cash you invested up front."
          />
          <Metric
            label="Money multiple"
            value={`${p.moneyMultiple.toFixed(2)}×`}
            info="Total cash returned ÷ cash invested. 2× means you doubled your money over the whole period."
          />
          <Metric
            label="Cash invested up front"
            value={formatEur(p.cashInvested)}
            info="Down payment plus closing costs not covered by the loan."
          />
          <Metric
            label={`Net sale proceeds (yr ${p.holdingYears})`}
            value={formatEur(p.netSaleProceeds)}
            info="Sale price minus selling costs, the remaining loan, and any speculation tax."
          />
          <Metric
            label={`Equity at sale`}
            value={formatEur(p.saleValue - p.remainingLoanAtSale)}
            info="The flat's value minus the loan still owed at the time of sale (before selling costs/tax)."
          />
          <Metric
            label="Rental cash flow (total)"
            value={formatEur(p.totalRentCashFlow)}
            tone={p.totalRentCashFlow >= 0 ? 'good' : 'bad'}
            info="Sum of every year's cash flow while you hold (negative means you topped up out of pocket)."
          />
          <Metric
            label={`Sale value (yr ${p.holdingYears})`}
            value={formatEur(p.saleValue)}
            info="Projected market value when you sell, based on your appreciation assumption."
          />
        </div>

        <div className={`fixed-callout ${p.speculationTaxFree ? 'fixed-callout-good' : 'fixed-callout-warn'}`}>
          {p.speculationTaxFree ? (
            <span>
              ✅ Holding {p.holdingYears} years (≥ 10) means the sale profit is{' '}
              <strong>free of speculation tax</strong> (Spekulationssteuer) in Germany.
            </span>
          ) : (
            <span>
              ⚠️ Selling after {p.holdingYears} years (&lt; 10) means the gain is
              taxable (Spekulationssteuer).{' '}
              {p.taxEnabled ? (
                <>Estimated tax on the gain: <strong>{formatEur(p.speculationTax)}</strong>.</>
              ) : (
                <>Turn on the after-tax view to estimate it.</>
              )}{' '}
              Holding 10+ years would make it tax-free.
            </span>
          )}
        </div>
      </section>

      <section className={`card etf-compare ${p.buyEndWealth >= p.etfEndWealth ? 'buy-wins' : 'etf-wins'}`}>
        <h2>Is buying worth it vs. an ETF?</h2>
        <p className="etf-headline">
          {p.buyEndWealth >= p.etfEndWealth ? (
            <>
              Over {p.holdingYears} years, this flat is projected to leave you about{' '}
              <strong>{formatEur(p.buyEndWealth - p.etfEndWealth)} more</strong> than putting the
              same cash in a {p.etfReturnPct}% ETF. 🏠
            </>
          ) : (
            <>
              Over {p.holdingYears} years, a {p.etfReturnPct}% ETF is projected to leave you about{' '}
              <strong>{formatEur(p.etfEndWealth - p.buyEndWealth)} more</strong> than this flat — the
              hassle may not be worth it. 📈
            </>
          )}
        </p>

        <div className="etf-bars">
          <div className="etf-bar-row">
            <span className="etf-bar-label">
              Buy the flat
              <InfoDot text="Your net worth at the end: the sale proceeds (after loan, selling costs and any tax) plus any rental surplus reinvested at the ETF rate." label="Property end wealth" />
            </span>
            <div className="etf-bar-track">
              <div
                className="etf-bar-fill etf-bar-buy"
                style={{ width: `${barPct(p.buyEndWealth)}%` }}
              />
            </div>
            <span className="etf-bar-value">{formatEur(p.buyEndWealth)}</span>
          </div>
          <div className="etf-bar-row">
            <span className="etf-bar-label">
              Same cash in an ETF
              <InfoDot text="The same money — your down payment plus every monthly top-up the flat needed — compounded at the assumed ETF return over the same years." label="ETF end wealth" />
            </span>
            <div className="etf-bar-track">
              <div
                className="etf-bar-fill etf-bar-etf"
                style={{ width: `${barPct(p.etfEndWealth)}%` }}
              />
            </div>
            <span className="etf-bar-value">{formatEur(p.etfEndWealth)}</span>
          </div>
        </div>

        <div className="metric-grid" style={{ marginTop: 14 }}>
          <Metric
            label="Property return (IRR)"
            value={p.irrPct === null ? 'n/a' : formatPct(p.irrPct)}
            tone={p.irrPct !== null && p.irrPct >= p.etfReturnPct ? 'good' : 'bad'}
            info="Your annualized return on the property. Beating the ETF % means the flat outperforms per euro invested."
          />
          <Metric
            label="Expected net annual return"
            value={formatPct(p.etfReturnPct)}
            info="The benchmark you set above."
          />
          <Metric
            label="Total cash you commit"
            value={formatEur(p.totalCashCommitted)}
            info="Down payment plus all the monthly top-ups — the same in both paths, so it's a fair comparison."
          />
        </div>

        <p className="muted small" style={{ marginTop: 12 }}>
          Fair, same-money comparison: both paths commit {formatEur(p.totalCashCommitted)} (down
          payment + top-ups). Remember the flat also gives you leverage, a tangible asset, potential
          rent for life after payoff, and inflation protection — while the ETF is more liquid and
          hands-off. This is pre-tax on the ETF side; a real decision should weigh both after tax.
        </p>
      </section>

      <section className="card">
        <h2>Wealth build-up over time</h2>
        <div className="chart-wrap">
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="year" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`} />
              <Tooltip formatter={(v) => formatEur(Number(v))} />
              <Legend />
              <Area type="monotone" dataKey="Value" stroke="#2563eb" fill="#bfdbfe" name="Property value" />
              <Area type="monotone" dataKey="Loan" stroke="#dc2626" fill="#fecaca" name="Loan owed" />
              <Area type="monotone" dataKey="Equity" stroke="#16a34a" fill="#bbf7d0" name="Your equity" />
              <Line type="monotone" dataKey="Cumulative" stroke="#7c3aed" strokeWidth={2} dot={false} name="Cumulative cash flow" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <p className="chart-caption muted small">
          Your <strong>equity</strong> (green) grows as the loan (red) shrinks and
          the value (blue) rises. The purple line is the running total of rental
          cash flow {p.taxEnabled ? 'after tax' : 'before tax'} — it dips below zero
          if you're topping up each month, then climbs once the flat pays for itself.
        </p>
      </section>

      <section className="card">
        <h2>Year-by-year</h2>
        <div className="proj-table">
          <div className="proj-row proj-head">
            <span>Year</span>
            <span>Value</span>
            <span>Loan</span>
            <span>Equity</span>
            <span>{p.taxEnabled ? 'Cash flow (a/tax)' : 'Cash flow'}</span>
          </div>
          {p.years.map((y) => (
            <div className="proj-row" key={y.year}>
              <span>{y.year}</span>
              <span>{formatEur(y.propertyValue)}</span>
              <span>{formatEur(y.remainingLoan)}</span>
              <span>{formatEur(y.equity)}</span>
              <span className={(p.taxEnabled ? y.cashFlowAfterTax : y.cashFlowPreTax) >= 0 ? 'pos' : 'neg'}>
                {formatEur(p.taxEnabled ? y.cashFlowAfterTax : y.cashFlowPreTax)}
              </span>
            </div>
          ))}
        </div>
        <p className="muted small">
          Estimates only — this ignores things like special repairs, tax-law
          changes and market swings. Not tax or financial advice; confirm with a
          Steuerberater before you buy.
        </p>
      </section>
    </div>
  );
}

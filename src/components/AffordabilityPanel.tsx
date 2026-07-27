import type { Apartment, CostSettings, LoanParams, ProjectionParams, Profile } from '../types';
import { computeAffordability, type MonthlyVerdict } from '../lib/affordability';
import { NumberField } from './NumberField';
import { InfoDot } from './InfoDot';
import { formatEur, formatPct } from '../lib/format';

interface Props {
  apartment: Apartment;
  loan: LoanParams;
  costs: CostSettings;
  projection: ProjectionParams;
  profile: Profile;
  setProfile: (p: Profile) => void;
}

const VERDICT_META: Record<MonthlyVerdict, { label: string; cls: string }> = {
  positive: { label: 'Pays you — cash-flow positive', cls: 'v-buy' },
  comfortable: { label: 'Comfortable', cls: 'v-buy' },
  manageable: { label: 'Manageable', cls: 'v-caution' },
  stretched: { label: 'Stretched', cls: 'v-caution' },
  unaffordable: { label: 'Unaffordable', cls: 'v-avoid' },
};

export function AffordabilityPanel({ apartment, loan, costs, projection, profile, setProfile }: Props) {
  const up = (patch: Partial<Profile>) => setProfile({ ...profile, ...patch });
  const a = computeAffordability(apartment, loan, costs, projection, profile);
  const vm = VERDICT_META[a.monthlyVerdict];

  return (
    <div className="stack">
      <section className="card">
        <h2>Your finances</h2>
        <p className="muted small" style={{ marginTop: 0 }}>
          Kept on this device only. Used to check whether you can carry this investment and what it
          does to your tax.
        </p>
        <div className="grid-2">
          <NumberField
            label="Net monthly salary"
            value={profile.netMonthlySalary}
            onChange={(v) => up({ netMonthlySalary: v })}
            suffix="€ / mo"
            step={100}
            min={0}
            hint="Your take-home pay per month (after tax and social contributions). Used for the affordability check."
          />
          <NumberField
            label="Gross annual salary"
            value={profile.grossAnnualIncome}
            onChange={(v) => up({ grossAnnualIncome: v })}
            suffix="€ / yr"
            step={5000}
            min={0}
            hint="Your pre-tax yearly salary (Bruttojahresgehalt). Used to estimate your marginal tax rate — the rate at which the property's rental profit or loss is taxed."
          />
          <NumberField
            label="Monthly living expenses"
            value={profile.monthlyExpenses}
            onChange={(v) => up({ monthlyExpenses: v })}
            suffix="€ / mo"
            step={100}
            min={0}
            hint="What you typically spend each month (rent/other housing, food, insurance, etc.), excluding this investment."
          />
          <NumberField
            label="Savings for the purchase"
            value={profile.savings}
            onChange={(v) => up({ savings: v })}
            suffix="€"
            step={5000}
            min={0}
            hint="Cash you have available for the down payment, closing costs and any renovation."
          />
          <label className="field">
            <span className="field-label">Church tax</span>
            <span className="field-input">
              <select
                value={profile.churchTaxPct}
                onChange={(e) => up({ churchTaxPct: Number(e.target.value) })}
              >
                <option value={0}>None</option>
                <option value={8}>8% (Bavaria / Baden-Württemberg)</option>
                <option value={9}>9% (rest of Germany)</option>
              </select>
            </span>
          </label>
          <label className="field">
            <span className="field-label">Tax class (Steuerklasse)</span>
            <span className="field-input">
              <select
                value={profile.taxClass}
                onChange={(e) => up({ taxClass: Number(e.target.value) as Profile['taxClass'] })}
              >
                {[1, 2, 3, 4, 5, 6].map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </span>
          </label>
          <NumberField
            label="Number of children"
            value={profile.children}
            onChange={(v) => up({ children: v })}
            step={1}
            min={0}
          />
        </div>
        <p className="muted small">
          Your marginal tax rate is estimated from your gross salary, tax class and children using
          the German income-tax tariff (§32a EStG){' '}
          {a.splitting ? '(with married-couple splitting)' : ''} — currently about{' '}
          <strong>{formatPct(a.incomeMarginalPct)}</strong> income tax
          {profile.churchTaxPct > 0 && (
            <>
              , or <strong>{formatPct(a.effectiveMarginalPct)}</strong> with church tax
            </>
          )}
          . It's an approximation on an estimated taxable income of{' '}
          {formatEur(a.taxableIncome)} — confirm with a Steuerberater.
        </p>
      </section>

      {/* Affordability */}
      <section className="card">
        <h2>
          Can you afford it?
          <InfoDot
            text="Compares the monthly top-up this investment needs against the free cash you have after your expenses, and checks whether your savings cover the upfront cash."
            label="About: affordability"
          />
        </h2>

        <div className={`slab-verdict ${vm.cls}`} style={{ marginBottom: 14 }}>
          <div className="slab-verdict-main">
            <span className="slab-verdict-label" style={{ fontSize: 20 }}>{vm.label}</span>
          </div>
          <div className="slab-verdict-delta">
            {a.monthlyCashFlow >= 0
              ? `+${formatEur(a.monthlyCashFlow)}/mo to you`
              : `${formatEur(a.monthlyTopUp)}/mo top-up`}
          </div>
        </div>

        <div className="metric-grid">
          <div className="metric metric-neutral">
            <span className="metric-value">{formatEur(a.freeCashMonthly)}</span>
            <span className="metric-label">Free cash / month (salary − expenses)</span>
          </div>
          <div className={`metric metric-${a.monthlyCashFlow >= 0 ? 'good' : 'bad'}`}>
            <span className="metric-value">
              {a.monthlyCashFlow >= 0 ? '+' : '−'}
              {formatEur(Math.abs(a.monthlyCashFlow))}
            </span>
            <span className="metric-label">The flat's monthly cash flow</span>
          </div>
          <div className="metric metric-neutral">
            <span className="metric-value">{formatEur(a.monthlyLeftAfter)}</span>
            <span className="metric-label">Left each month after the top-up</span>
          </div>
          <div className={`metric metric-${a.upfrontCovered ? 'good' : 'bad'}`}>
            <span className="metric-value">{formatEur(a.upfrontNeeded)}</span>
            <span className="metric-label">Upfront cash needed</span>
          </div>
        </div>

        <p className="muted small" style={{ marginTop: 12 }}>
          {a.upfrontCovered ? (
            <>
              ✅ Your savings cover the upfront cost, leaving{' '}
              <strong>{formatEur(a.savingsAfter)}</strong> as a cushion.
            </>
          ) : (
            <>
              ⚠️ Your savings fall <strong>{formatEur(-a.savingsAfter)}</strong> short of the{' '}
              {formatEur(a.upfrontNeeded)} upfront cash needed.
            </>
          )}{' '}
          {a.monthlyCashFlow < 0 &&
            `The top-up eats about ${a.topUpSharePct}% of your free monthly cash. Keep a buffer for repairs and vacancy.`}
        </p>
      </section>

      {/* Tax impact */}
      <section className="card">
        <h2>
          Your tax impact
          <InfoDot
            text="How the rental changes your income tax. Early on, depreciation (AfA) plus deductible interest often create a paper loss that reduces your taxable income. Later, when the flat turns a profit, you pay tax on it. Uses your marginal rate plus church tax. This is a simplified planning estimate — not a Steuerberater calculation."
            label="About: tax impact"
          />
        </h2>

        <div className="metric-grid">
          <div className={`metric metric-${a.year1TaxEffect >= 0 ? 'good' : 'bad'}`}>
            <span className="metric-value">
              {a.year1TaxEffect >= 0 ? '+' : '−'}
              {formatEur(Math.abs(a.year1TaxEffect))}
            </span>
            <span className="metric-label">Year 1 {a.year1TaxEffect >= 0 ? 'estimated tax saving' : 'extra tax'}</span>
          </div>
          <div className="metric metric-neutral">
            <span className="metric-value">
              {a.taxRefundMonthlyEquiv >= 0 ? '+' : '−'}
              {formatEur(Math.abs(a.taxRefundMonthlyEquiv))}
            </span>
            <span className="metric-label">≈ per month (year 1)</span>
          </div>
          <div className={`metric metric-${a.totalTaxEffect >= 0 ? 'good' : 'bad'}`}>
            <span className="metric-value">
              {a.totalTaxEffect >= 0 ? '+' : '−'}
              {formatEur(Math.abs(a.totalTaxEffect))}
            </span>
            <span className="metric-label">Total over {projection.holdingYears} years</span>
          </div>
          <div className="metric metric-neutral">
            <span className="metric-value">{formatPct(a.effectiveMarginalPct)}</span>
            <span className="metric-label">Effective marginal rate (incl. church)</span>
          </div>
        </div>

        <p className="muted small" style={{ marginTop: 12 }}>
          The estimated tax effect is positive in about <strong>{a.refundYears}</strong> of the{' '}
          {projection.holdingYears} years (the early ones, thanks to depreciation and interest).
          {a.year1TaxEffect >= 0 &&
            ` In year 1, deductible AfA and interest reduce the modelled taxable rental result. At your marginal rate the estimated tax effect is approximately ${formatEur(a.year1TaxEffect)} — equivalent to about ${formatEur(a.taxRefundMonthlyEquiv)}/month.`}{' '}
          This is a simplified estimate — confirm with a Steuerberater.
        </p>
      </section>
      <p className="muted small" style={{ padding: '0 4px' }}>
        Affordability figures are rough estimates based on your inputs — not a credit assessment
        or financial advice. Tax calculations use the simplified §32a EStG tariff and may differ
        from your actual liability. Always confirm with a qualified tax advisor (Steuerberater)
        and your bank before committing to a purchase.
      </p>
    </div>
  );
}

import type { Apartment, CostSettings, ProjectionParams, Results } from '../types';
import { formatEur2 } from '../lib/format';
import { firstYearMonthlyAfterTax } from '../lib/projection';
import { InfoDot } from './InfoDot';

interface Props {
  apartment: Apartment;
  costs: CostSettings;
  results: Results;
  projection: ProjectionParams;
}

/**
 * The "just tell me the numbers" view: what leaves your pocket to the bank,
 * what comes in from rent, and what you actually pay or earn each month —
 * before and after German tax effects (AfA, deductible interest).
 */
export function SimpleSummary({ apartment, results, projection }: Props) {
  const r = results;

  // Split this year's monthly bank payment into interest (Zinsen) and repayment (Tilgung).
  const year1Interest = r.amortization[0]?.cumulativeInterest ?? 0;
  const monthlyInterest = year1Interest / 12;
  const monthlyTilgung = Math.max(0, r.monthlyAnnuity - monthlyInterest);

  // First-year tax effect, using the tax settings from the Projection tab.
  const { taxEffectMonthly, afterTax: afterTaxMonthly } = firstYearMonthlyAfterTax(
    apartment,
    results,
    projection,
  );

  const preTax = r.monthlyCashFlowAfterLoan;
  const noTaxRate = projection.marginalTaxRatePct <= 0;

  return (
    <div className="stack">
      <section className="card">
        <h2>The bottom line, per month</h2>
        <p className="muted small" style={{ marginTop: 0 }}>
          A plain view of the money moving in and out each month for this flat.
        </p>

        <div className="simple-flow">
          <div className="simple-line simple-in">
            <span className="simple-label">
              Rent coming in
              <InfoDot text="Cold rent (Kaltmiete). After allowing for occasional vacancy it's about the 'effective' figure shown." label="About rent in" />
            </span>
            <span className="simple-amount pos">+ {formatEur2(apartment.monthlyColdRent)}</span>
          </div>
          <div className="simple-sub">
            after a small vacancy allowance ≈ {formatEur2(r.effectiveMonthlyRent)}
          </div>

          <div className="simple-line simple-out">
            <span className="simple-label">
              Running costs you carry
              <InfoDot text="Your owner-side costs: the non-recoverable part of the Hausgeld, a maintenance reserve, and property management." label="About running costs" />
            </span>
            <span className="simple-amount neg">− {formatEur2(r.monthlyOperatingCosts)}</span>
          </div>

          <div className="simple-line simple-out">
            <span className="simple-label">
              To the bank (Zinsen + Tilgung)
              <InfoDot text="Your fixed monthly loan payment. It bundles interest to the bank (Zinsen) and paying down the loan (Tilgung)." label="About bank payment" />
            </span>
            <span className="simple-amount neg">− {formatEur2(r.monthlyAnnuity)}</span>
          </div>
          <div className="simple-sub">
            of which interest ≈ {formatEur2(monthlyInterest)}, repayment ≈ {formatEur2(monthlyTilgung)} (this year)
          </div>

          <div className={`simple-line simple-result ${preTax >= 0 ? 'good' : 'bad'}`}>
            <span className="simple-label">= Before tax, you {preTax >= 0 ? 'earn' : 'pay'}</span>
            <span className="simple-amount">{formatEur2(preTax)}</span>
          </div>
        </div>
      </section>

      <section className={`card simple-tax ${afterTaxMonthly >= 0 ? 'is-good' : 'is-bad'}`}>
        <h2>After tax benefits (AfA, interest deduction)</h2>
        <div className="simple-tax-grid">
          <div className="simple-tax-item">
            <span className="simple-tax-value">{formatEur2(preTax)}</span>
            <span className="simple-tax-label">Before tax / month</span>
          </div>
          <div className="simple-tax-op">{taxEffectMonthly >= 0 ? '+' : '−'}</div>
          <div className="simple-tax-item">
            <span className={`simple-tax-value ${taxEffectMonthly >= 0 ? 'pos' : 'neg'}`}>
              {formatEur2(Math.abs(taxEffectMonthly))}
            </span>
            <span className="simple-tax-label">
              {taxEffectMonthly >= 0 ? 'Tax saving' : 'Extra tax'} / month
            </span>
          </div>
          <div className="simple-tax-op">=</div>
          <div className="simple-tax-item simple-tax-final">
            <span className={`simple-tax-value ${afterTaxMonthly >= 0 ? 'pos' : 'neg'}`}>
              {formatEur2(afterTaxMonthly)}
            </span>
            <span className="simple-tax-label">
              You actually {afterTaxMonthly >= 0 ? 'earn' : 'pay'} / month
            </span>
          </div>
        </div>

        <p className="simple-verdict">
          {afterTaxMonthly >= 0 ? (
            <>
              After the taxman, this flat puts about{' '}
              <strong>{formatEur2(afterTaxMonthly)}</strong> in your pocket every
              month — while a tenant pays down your loan.
            </>
          ) : (
            <>
              After the taxman, this flat costs you about{' '}
              <strong>{formatEur2(Math.abs(afterTaxMonthly))}</strong> a month out of
              pocket — but that money is buying you equity (you own more of the flat
              each month), and the value may grow too.
            </>
          )}
        </p>

        <p className="muted small">
          {noTaxRate ? (
            <>
              Tip: set your <strong>marginal tax rate</strong> in the Projection tab
              to see the real after-tax figure. Right now it's 0%, so before- and
              after-tax are the same.
            </>
          ) : (
            <>
              Uses your tax settings from the Projection tab (marginal rate{' '}
              {projection.marginalTaxRatePct}%, AfA {projection.afaRatePct}% on{' '}
              {projection.buildingSharePct}% building share). AfA and loan interest
              are tax-deductible; repayment (Tilgung) is not. Estimate only — not tax
              advice.
            </>
          )}
        </p>
      </section>
    </div>
  );
}

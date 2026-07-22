import { useState } from 'react';
import type { Apartment, CostSettings, LoanParams, Results } from '../types';
import { NumberField } from './NumberField';
import { InfoDot } from './InfoDot';
import { lookupArea } from '../data/priceLookup';
import { validateInputs } from '../lib/validate';
import { formatEur, formatEur2 } from '../lib/format';

interface InputFormProps {
  apartment: Apartment;
  setApartment: (a: Apartment) => void;
  loan: LoanParams;
  setLoan: (l: LoanParams) => void;
  costs: CostSettings;
  /** Live results, used to preview payments and the follow-up impact. */
  results: Results;
}

export function InputForm({ apartment, setApartment, loan, setLoan, costs, results }: InputFormProps) {
  const upA = (patch: Partial<Apartment>) => setApartment({ ...apartment, ...patch });
  const upL = (patch: Partial<LoanParams>) => setLoan({ ...loan, ...patch });

  // Let the user enter the recoverable Hausgeld either as a % or as a €/month
  // amount. Either way it is stored as a 0..1 ratio so the maths is unchanged.
  const [recoverMode, setRecoverMode] = useState<'pct' | 'eur'>('pct');
  const clampRatio = (x: number) => Math.min(1, Math.max(0, x));

  // Postal-code / city lookup that auto-fills the market benchmark averages.
  // The query is the apartment's areaLabel, so there is a single location field.
  const [lookupMsg, setLookupMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const runLookup = () => {
    const hit = lookupArea(apartment.areaLabel);
    if (!hit) {
      setLookupMsg({
        text: 'No match found — enter the averages manually below.',
        ok: false,
      });
      return;
    }
    upA({
      avgPricePerSqm: hit.avgPricePerSqm,
      avgRentPerSqm: hit.avgRentPerSqm,
    });
    setLookupMsg({
      text: `Filled from ${hit.label}${hit.exact ? '' : ' — approximate area estimate'}. Adjust if needed.`,
      ok: true,
    });
  };

  const loanAmount = results.loanAmount;

  // Both repayment options size the monthly payment the same way — interest plus
  // the initial Tilgung rate. They differ only in the rate assumed after the
  // fixed-interest period, so the preview payment is identical for both.
  const tilgungPayment = (loanAmount * ((loan.annualInterestRatePct + loan.initialRepaymentPct) / 100)) / 12;

  const warnings = validateInputs(apartment, loan, costs);

  return (
    <div className="stack">
      {warnings.length > 0 && (
        <section className="card input-warnings">
          <div className="input-warnings-head">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <span>Check these inputs</span>
          </div>
          <ul>
            {warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </section>
      )}

      <section className="card">
        <h2>Apartment</h2>
        <label className="field">
          <span className="field-label">Listing title</span>
          <span className="field-input">
            <input
              type="text"
              value={apartment.title}
              onChange={(e) => upA({ title: e.target.value })}
              placeholder="e.g. 3 rooms, city centre"
            />
          </span>
        </label>

        <div className="grid-2">
          <NumberField
            label="Purchase price (Kaufpreis)"
            value={apartment.purchasePrice}
            onChange={(v) => upA({ purchasePrice: v })}
            suffix="€"
            step={5000}
            min={0}
          />
          <NumberField
            label="Living area"
            value={apartment.sizeSqm}
            onChange={(v) => upA({ sizeSqm: v })}
            suffix="m²"
            step={1}
            min={0}
          />
          <NumberField
            label="Balcony / terrace area"
            value={apartment.balconySqm ?? 0}
            onChange={(v) => upA({ balconySqm: v })}
            suffix="m²"
            step={1}
            min={0}
            hint="Balcony/terrace size, if any. Leave at 0 if there is no balcony. In Germany a balcony usually counts partially (≈25%) towards the living area, so it is weighted before the €/m² comparison."
          />
          {(apartment.balconySqm ?? 0) > 0 && (
            <NumberField
              label="Balcony counts as"
              value={apartment.balconyWeightPct ?? 25}
              onChange={(v) => upA({ balconyWeightPct: v })}
              suffix="%"
              step={5}
              min={0}
              max={100}
              hint="Share of the balcony area added to the living area for the €/m² benchmark. German Wohnflächenverordnung: 25% typical, up to 50%."
            />
          )}
          <NumberField
            label="Monthly cold rent (Kaltmiete)"
            value={apartment.monthlyColdRent}
            onChange={(v) => upA({ monthlyColdRent: v })}
            suffix="€"
            step={25}
            min={0}
            hint="Rent for the flat only, WITHOUT heating/utilities. This is your income — the extras just pass through to the tenant."
          />
          <NumberField
            label="Build year"
            value={apartment.buildYear ?? 0}
            onChange={(v) => upA({ buildYear: v })}
            step={1}
            min={0}
            grouping={false}
          />
          <NumberField
            label="Hausgeld (total / month)"
            value={apartment.hausgeld}
            onChange={(v) => upA({ hausgeld: v })}
            suffix="€"
            step={10}
            min={0}
            hint="Monthly HOA fee for the whole unit"
          />
          {(() => {
            const unitToggle = (
              <span className="unit-toggle" role="group" aria-label="Input unit">
                <button
                  type="button"
                  className={recoverMode === 'pct' ? 'is-active' : ''}
                  onClick={() => setRecoverMode('pct')}
                >
                  %
                </button>
                <button
                  type="button"
                  className={recoverMode === 'eur' ? 'is-active' : ''}
                  onClick={() => setRecoverMode('eur')}
                >
                  €
                </button>
              </span>
            );
            return recoverMode === 'pct' ? (
              <NumberField
                label="Recoverable Hausgeld share"
                value={Math.round(apartment.hausgeldRecoverableRatio * 100)}
                onChange={(v) => upA({ hausgeldRecoverableRatio: clampRatio(v / 100) })}
                suffix="%"
                step={5}
                min={0}
                max={100}
                hint="Portion passed to tenant (umlagefähig). Switch to € to enter the recoverable amount per month instead."
                adornment={unitToggle}
              />
            ) : (
              <NumberField
                label="Recoverable Hausgeld"
                value={Math.round(apartment.hausgeldRecoverableRatio * apartment.hausgeld)}
                onChange={(v) =>
                  upA({
                    hausgeldRecoverableRatio:
                      apartment.hausgeld > 0 ? clampRatio(v / apartment.hausgeld) : 0,
                  })
                }
                suffix="€ / mo"
                step={10}
                min={0}
                max={apartment.hausgeld}
                hint="The euro amount of the monthly Hausgeld passed to the tenant. Switch to % for a percentage instead."
                adornment={unitToggle}
              />
            );
          })()}
        </div>
      </section>

      <section className="card">
        <h2>
          Market benchmark
          <InfoDot
            text="Reference figures for the area so the app can tell you if this listing is priced above or below the local average. Look up your postal code to auto-fill, or enter your own numbers."
            label="About: Market benchmark"
          />
        </h2>

        <label className="field">
          <span className="field-label">Area / postal code / city</span>
          <span className="lookup-row">
            <input
              type="text"
              value={apartment.areaLabel}
              onChange={(e) => upA({ areaLabel: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  runLookup();
                }
              }}
              placeholder="e.g. 60313 or Frankfurt am Main"
            />
            <button type="button" className="btn-secondary" onClick={runLookup}>
              Fill averages
            </button>
          </span>
        </label>
        {lookupMsg && (
          <p className={`lookup-msg ${lookupMsg.ok ? 'is-ok' : 'is-warn'}`}>{lookupMsg.text}</p>
        )}

        <div className="grid-2">
          <NumberField
            label="Avg. price / m² (area)"
            value={apartment.avgPricePerSqm}
            onChange={(v) => upA({ avgPricePerSqm: v })}
            suffix="€ / m²"
            step={100}
            min={0}
            hint="Typical purchase price per m² for comparable flats in this area. Default 3,500 €/m² is a placeholder — replace it with a local figure if you have one."
          />
          <NumberField
            label="Avg. cold rent / m² (area)"
            value={apartment.avgRentPerSqm}
            onChange={(v) => upA({ avgRentPerSqm: v })}
            suffix="€ / m²"
            step={0.5}
            min={0}
            hint="Typical cold rent per m² locally. Leave at 0 if unknown — the rent comparison row is then hidden."
          />
          <NumberField
            label="Location score"
            value={apartment.locationScore}
            onChange={(v) => upA({ locationScore: v })}
            suffix="/ 10"
            step={1}
            min={0}
            max={10}
            hint="Your subjective rating of the location (1 = poor, 10 = prime). Feeds into the overall verdict."
          />
        </div>
      </section>

      <section className="card">
        <h2>
          Renovation / CapEx
          <InfoDot
            text="For fixer-uppers: money you'll spend upfront to renovate, and the value it adds. The cost is paid in cash (not financed), so it raises your total invested; the uplift raises the property's value for equity and the eventual sale. If the works also raise the achievable rent, enter that higher rent in 'Monthly cold rent' above."
            label="About: Renovation / CapEx"
          />
        </h2>
        <div className="grid-2">
          <NumberField
            label="Renovation cost (upfront)"
            value={apartment.renovationCost ?? 0}
            onChange={(v) => upA({ renovationCost: v })}
            suffix="€"
            step={5000}
            min={0}
            hint="One-off refurbishment budget, paid in cash. Adds to your total investment and the sale cost basis."
          />
          <NumberField
            label="Value uplift after reno"
            value={apartment.renovationValueAdd ?? 0}
            onChange={(v) => upA({ renovationValueAdd: v })}
            suffix="€"
            step={5000}
            min={0}
            hint="How much the renovation is expected to raise the property's value straight away. Feeds equity, appreciation and the sale price."
          />
        </div>
      </section>

      <section className="card">
        <h2>Financing</h2>
        <div className="grid-2">
          <NumberField
            label="Down payment (Eigenkapital)"
            value={loan.downPayment}
            onChange={(v) => upL({ downPayment: v })}
            suffix="€"
            step={5000}
            min={0}
            hint="Cash you put in yourself. Tip: aim to at least cover the closing costs plus 10–20% of the price."
          />
          <NumberField
            label="Interest rate (Sollzins)"
            value={loan.annualInterestRatePct}
            onChange={(v) => upL({ annualInterestRatePct: v })}
            suffix="%"
            step={0.1}
            min={0}
            hint="The bank's annual interest during the fixed-interest period. Ask your bank for a current quote."
          />
          <NumberField
            label="Fixed-interest period (Zinsbindung)"
            value={loan.fixedRatePeriodYears}
            onChange={(v) => upL({ fixedRatePeriodYears: v })}
            suffix="years"
            step={1}
            min={1}
            max={40}
            hint="How long the bank guarantees this interest rate — commonly 5, 10, 15 or 20 years. After it ends, the rate can change."
          />
          <NumberField
            label="Initial repayment (Tilgung)"
            value={loan.initialRepaymentPct}
            onChange={(v) => upL({ initialRepaymentPct: v })}
            suffix="%"
            step={0.5}
            min={0}
            hint="How fast you repay the loan. It's ADDED to the interest rate to form one fixed monthly payment — see the explainer. Higher Tilgung = bigger monthly payment, debt-free sooner. This applies to both repayment options below."
          />
        </div>

        <fieldset className="radio-group">
          <legend>What happens after the fixed-interest period?</legend>
          <label className={`radio-option ${loan.repaymentStrategy === 'payoffWithinFixed' ? 'is-selected' : ''}`}>
            <input
              type="radio"
              name="repaymentStrategy"
              checked={loan.repaymentStrategy === 'payoffWithinFixed'}
              onChange={() => upL({ repaymentStrategy: 'payoffWithinFixed' })}
            />
            <span>
              <strong>
                Assume the same rate for the whole loan
                <span className="radio-pay">{formatEur2(tilgungPayment)}/mo</span>
              </strong>
              <em>Simple view: keep paying {loan.annualInterestRatePct}% interest + {loan.initialRepaymentPct}% Tilgung at the same rate until the loan is repaid. Best when you'll clear it within the fixed period, or as an optimistic baseline.</em>
            </span>
          </label>
          <label className={`radio-option ${loan.repaymentStrategy === 'followUp' ? 'is-selected' : ''}`}>
            <input
              type="radio"
              name="repaymentStrategy"
              checked={loan.repaymentStrategy === 'followUp'}
              onChange={() => upL({ repaymentStrategy: 'followUp' })}
            />
            <span>
              <strong>
                Refinance the Restschuld (follow-up loan)
                <span className="radio-pay">{formatEur2(tilgungPayment)}/mo</span>
              </strong>
              <em>
                Same {loan.annualInterestRatePct}% + {loan.initialRepaymentPct}% payment now; whatever is left (Restschuld) at the end of the fixed period is refinanced at an assumed rate.
                <InfoDot
                  text="German twist: your interest rate is only locked for the fixed period (e.g. 10y), but the loan takes longer to repay (~28y at 2% Tilgung). At the end of the lock you still owe the Restschuld and refinance it (Anschlussfinanzierung) at whatever rate applies then — the main uncertainty. See the Glossary for a full example."
                  label="What is a follow-up loan?"
                />
              </em>
            </span>
          </label>
        </fieldset>

        {loan.repaymentStrategy === 'followUp' && (
          <div className="grid-2">
            <NumberField
              label="Assumed follow-up rate"
              value={loan.followUpInterestRatePct}
              onChange={(v) => upL({ followUpInterestRatePct: v })}
              suffix="%"
              step={0.1}
              min={0}
              hint="Nobody knows future rates. This is just an estimate for the Anschlussfinanzierung so the total payoff figures are realistic — try a higher rate to stress-test."
            />
          </div>
        )}

        {loan.repaymentStrategy === 'followUp' && (
          <div className={`followup-readout ${results.fullyRepaidWithinFixed ? 'is-muted' : ''}`}>
            {results.fullyRepaidWithinFixed ? (
              <>
                ℹ️ The follow-up rate has <strong>no effect right now</strong>: your loan
                is fully repaid within the {loan.fixedRatePeriodYears}-year fixed period,
                so there's no leftover to refinance. Lower the Tilgung or shorten the
                fixed period to see it matter.
              </>
            ) : (
              <>
                At <strong>{loan.followUpInterestRatePct}%</strong> → full payoff{' '}
                <strong>{results.payoffDateLabel}</strong>, total interest{' '}
                <strong>{formatEur(results.totalInterest)}</strong>.{' '}
                <span className="muted">(Changes payoff &amp; total interest, not your fixed-period monthly payment.)</span>
              </>
            )}
          </div>
        )}

        <div className="grid-2">
          <NumberField
            label="Annual lump-sum (Sondertilgung)"
            value={loan.annualExtraPayment}
            onChange={(v) => upL({ annualExtraPayment: v })}
            suffix="€ / year"
            step={1000}
            min={0}
            hint="Extra one-off repayment you make once a year (e.g. from a work bonus) straight off the loan balance. It shortens the payoff and cuts total interest. Most banks allow up to 5% of the loan per year — check your contract."
          />
        </div>

        <div className="target-block">
          <div className="grid-2">
            <NumberField
              label="Target: repay within"
              value={loan.targetPayoffYears}
              onChange={(v) => upL({ targetPayoffYears: v })}
              suffix="years"
              step={1}
              min={1}
              max={40}
              hint="A goal for being debt-free. Turn on the toggle to auto-size your payment to hit it exactly; leave it off to check whether your current settings already make it."
            />
          </div>
          <label className="checkbox-field">
            <input
              type="checkbox"
              checked={loan.forceTargetPayoff}
              onChange={(e) => upL({ forceTargetPayoff: e.target.checked })}
            />
            <span>Auto-adjust my payment to repay in exactly {loan.targetPayoffYears} years</span>
          </label>

          {loanAmount > 0 && (
            <div className={`followup-readout ${loan.forceTargetPayoff || results.meetsTarget ? '' : 'is-muted'}`}>
              {loan.forceTargetPayoff ? (
                <>
                  ✅ Payment set to <strong>{formatEur2(results.monthlyAnnuity)}/mo</strong> to fully
                  repay in exactly <strong>{loan.targetPayoffYears} years</strong> (≈{' '}
                  {results.targetImpliedTilgungPct.toFixed(1)}% starting Tilgung). This overrides the
                  repayment option above.
                </>
              ) : results.meetsTarget ? (
                <>
                  ✅ Your current setup repays in <strong>{results.payoffDateLabel}</strong> — that's
                  within your {loan.targetPayoffYears}-year target.
                </>
              ) : (
                <>
                  ⚠️ Your current setup repays in <strong>{results.payoffDateLabel}</strong> — <strong>not</strong>{' '}
                  within {loan.targetPayoffYears} years. To hit it exactly you'd pay ≈{' '}
                  <strong>{formatEur2(results.targetPayment)}/mo</strong> (≈{' '}
                  {results.targetImpliedTilgungPct.toFixed(1)}% starting Tilgung). Flip the toggle to
                  apply that.
                </>
              )}
            </div>
          )}
        </div>

        <label className="checkbox-field">
          <input
            type="checkbox"
            checked={loan.financeClosingCosts}
            onChange={(e) => upL({ financeClosingCosts: e.target.checked })}
          />
          <span>Finance closing costs (Kaufnebenkosten) with the loan too</span>
        </label>
      </section>
    </div>
  );
}

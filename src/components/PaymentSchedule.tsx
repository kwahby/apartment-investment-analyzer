import { useState } from 'react';
import type { Results } from '../types';
import { formatEur } from '../lib/format';

/**
 * Year-by-year payment schedule for the Financing tab. Shows the monthly loan
 * payment, any yearly lump sum (Sondertilgung), the remaining balance with vs.
 * without those lump sums, and the monthly amount left for you (out-of-pocket
 * while paying, surplus once the loan is gone).
 */
export function PaymentSchedule({ r }: { r: Results }) {
  const [open, setOpen] = useState(false);

  if (r.amortization.length === 0) return null;

  const hasExtra = r.amortizationNoExtra.length > 0;

  const mainByYear = new Map(r.amortization.map((p) => [p.year, p]));
  const baseByYear = new Map(r.amortizationNoExtra.map((p) => [p.year, p]));
  const allYears = Array.from(
    new Set([...mainByYear.keys(), ...baseByYear.keys()]),
  ).sort((a, b) => a - b);

  let prevWith = r.loanAmount;
  const rows = allYears.map((year) => {
    const m = mainByYear.get(year);
    const b = baseByYear.get(year);
    const withBalance = m ? m.remainingBalance : 0;
    const loanActive = prevWith > 0.01;
    const row = {
      year,
      loanActive,
      monthlyPayment: loanActive ? r.monthlyAnnuity : 0,
      lump: m?.lumpSum ?? 0,
      withBalance,
      noBalance: hasExtra ? (b ? b.remainingBalance : 0) : null,
      monthlyForMe: loanActive ? r.monthlyCashFlowAfterLoan : r.monthlyIncomeAfterPayoff,
    };
    prevWith = withBalance;
    return row;
  });

  const cols = hasExtra ? 6 : 4;

  return (
    <section className="card">
      <button className="collapse-toggle" onClick={() => setOpen((o) => !o)}>
        <h2>Payment schedule (year by year)</h2>
        <span>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <>
          <p className="muted small" style={{ marginTop: 4 }}>
            How the loan and your monthly cash flow develop over time. “Left for you”
            is what remains each month after rent, running costs and the loan payment
            — negative means you top up out of pocket, positive means the flat pays
            you. {hasExtra
              ? 'The two balance columns show the effect of your yearly lump sums (Sondertilgung).'
              : 'Add an annual lump-sum in the form to compare a faster payoff here.'}
          </p>

          <div className="pay-table-wrap">
            <table className={`pay-table pay-cols-${cols}`}>
              <thead>
                <tr>
                  <th>Year</th>
                  <th>Monthly payment</th>
                  {hasExtra && <th>Lump sum</th>}
                  <th>{hasExtra ? 'Balance (with lump)' : 'Remaining balance'}</th>
                  {hasExtra && <th>Balance (no lump)</th>}
                  <th>Left for you / month</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.year} className={row.loanActive ? '' : 'paid-off'}>
                    <td>{row.year}</td>
                    <td>{row.loanActive ? formatEur(row.monthlyPayment) : '— paid off'}</td>
                    {hasExtra && (
                      <td className={row.lump > 0 ? 'lump-cell' : 'muted'}>
                        {row.lump > 0 ? formatEur(row.lump) : '—'}
                      </td>
                    )}
                    <td>{formatEur(row.withBalance)}</td>
                    {hasExtra && (
                      <td className="muted">
                        {row.noBalance !== null ? formatEur(row.noBalance) : '—'}
                      </td>
                    )}
                    <td className={row.monthlyForMe >= 0 ? 'pos' : 'neg'}>
                      {formatEur(row.monthlyForMe)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {hasExtra && (
            <p className="chart-caption muted small">
              Note: the yearly <strong>lump sum</strong> is extra money you put in on
              top of the monthly payment — it doesn’t change the monthly figure, but
              it shrinks the balance faster (see the gap between the two balance
              columns) and brings the “left for you” flip to positive sooner.
            </p>
          )}
        </>
      )}
    </section>
  );
}

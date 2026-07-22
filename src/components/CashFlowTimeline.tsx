import type { Results } from '../types';
import { formatEur, formatEur2 } from '../lib/format';

/**
 * Explains, in plain language, when the investment becomes cash-flow positive —
 * i.e. when rent stops leaving your pocket and starts leaving money behind.
 */
export function CashFlowTimeline({ r }: { r: Results }) {
  const positiveNow = r.cashFlowPositiveFromStart;
  const flipsAtPayoff = !positiveNow && r.cashFlowPositiveYears !== null;
  const never = r.cashFlowPositiveYears === null && !positiveNow;

  const tone = positiveNow ? 'good' : flipsAtPayoff ? 'warn' : 'bad';

  return (
    <section className={`card timeline timeline-${tone}`}>
      <h2>When do you become cash-flow positive?</h2>

      <p className="timeline-headline">{r.cashFlowPositiveLabel}</p>

      <div className="timeline-track">
        <div className="timeline-phase timeline-now">
          <span className="timeline-phase-label">While repaying the loan</span>
          <span className={`timeline-amount ${r.monthlyCashFlowAfterLoan >= 0 ? 'pos' : 'neg'}`}>
            {formatEur2(r.monthlyCashFlowAfterLoan)}/mo
          </span>
        </div>
        <div className="timeline-arrow">→</div>
        <div className="timeline-phase timeline-after">
          <span className="timeline-phase-label">After the loan is repaid</span>
          <span className={`timeline-amount ${r.monthlyIncomeAfterPayoff >= 0 ? 'pos' : 'neg'}`}>
            {formatEur2(r.monthlyIncomeAfterPayoff)}/mo
          </span>
        </div>
      </div>

      <ul className="timeline-notes">
        {positiveNow && (
          <li>
            You're in the black straight away: rent covers the running costs and
            the loan, leaving <strong>{formatEur2(r.monthlyCashFlowAfterLoan)}</strong>{' '}
            in your pocket each month.
          </li>
        )}
        {flipsAtPayoff && (
          <>
            <li>
              Until the loan is repaid you top up about{' '}
              <strong>{formatEur2(Math.abs(r.monthlyCashFlowAfterLoan))}</strong> a
              month out of your own pocket.
            </li>
            <li>
              That adds up to roughly{' '}
              <strong>{formatEur(r.totalOutOfPocketUntilPositive)}</strong> of
              top-ups before you turn positive — after which you keep{' '}
              <strong>{formatEur2(r.monthlyIncomeAfterPayoff)}</strong>/month (plus
              you now own the flat outright).
            </li>
            <li className="timeline-tip">
              💡 Add an annual lump-sum (Sondertilgung) in the form to repay sooner
              and flip to positive earlier.
            </li>
          </>
        )}
        {never && (
          <li>
            At these numbers the rent doesn't even cover the running costs
            (Hausgeld, maintenance, management), so it stays cash-flow negative
            even after the loan is gone. You'd need a higher rent, a lower price,
            or lower costs.
          </li>
        )}
      </ul>
    </section>
  );
}

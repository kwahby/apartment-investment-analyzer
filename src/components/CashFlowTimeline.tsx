import type { Projection, Results } from '../types';
import { formatEur, formatEur2 } from '../lib/format';

/**
 * Explains, in plain language, when the investment becomes cash-flow positive.
 * The break-even year is derived from the multi-year projection (which applies
 * rent growth and cost inflation) rather than the static payoff date.
 */
export function CashFlowTimeline({ r, projection }: { r: Results; projection: Projection }) {
  // Derive the first-positive year from the projection cash flows — this is
  // more accurate than the static payoff date because rents grow over time.
  const relevantFlow = (y: { cashFlowPreTax: number; cashFlowAfterTax: number }) =>
    projection.taxEnabled ? y.cashFlowAfterTax : y.cashFlowPreTax;

  const firstPositiveYear = projection.years.find((y) => relevantFlow(y) >= 0);

  const positiveNow = r.cashFlowPositiveFromStart;
  const positiveBeforePayoff =
    firstPositiveYear !== null &&
    firstPositiveYear !== undefined &&
    r.payoffYears !== null &&
    firstPositiveYear.yearIndex < Math.ceil(r.payoffYears);

  // Fall back to static calculation if projection has no positive year
  const hasPositive = positiveNow || firstPositiveYear !== undefined;
  const never = !hasPositive;

  const tone = positiveNow ? 'good' : hasPositive ? 'warn' : 'bad';

  return (
    <section className={`card timeline timeline-${tone}`}>
      <h2>When do you become cash-flow positive?</h2>

      <p className="timeline-headline">
        {positiveNow
          ? 'Positive from month one — rent covers all costs and the loan.'
          : firstPositiveYear
          ? <>
              Projected to turn positive in <strong>{firstPositiveYear.year}</strong>
              {' '}(year {firstPositiveYear.yearIndex}
              {positiveBeforePayoff && ' — before the loan is repaid, because rents grow'})
              {projection.taxEnabled ? ', after tax' : ', before tax'}.
            </>
          : 'Not reached within the projection period at these assumptions.'}
      </p>

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
        {!positiveNow && firstPositiveYear && (
          <>
            <li>
              Until year {firstPositiveYear.yearIndex} you top up about{' '}
              <strong>{formatEur2(Math.abs(r.monthlyCashFlowAfterLoan))}</strong>/mo
              today (the monthly gap narrows as rent grows).
            </li>
            {r.totalOutOfPocketUntilPositive > 0 && (
              <li>
                Rough cumulative top-ups at today's rates:{' '}
                <strong>{formatEur(r.totalOutOfPocketUntilPositive)}</strong>.
                The projection-based figure will be lower because rents grow.
              </li>
            )}
            <li className="timeline-tip">
              💡 Add an annual lump-sum (Sondertilgung) in the form to repay sooner
              and flip to positive earlier.
            </li>
          </>
        )}
        {never && (
          <li>
            At these projection assumptions the yearly cash flow never turns
            positive within the {projection.holdingYears}-year period. You'd need
            a higher rent, a lower price, or lower costs.
          </li>
        )}
        <li className="timeline-tip muted small">
          Break-even year is from the Projection tab model (rent and cost growth
          assumptions). Change those assumptions on the Projection tab to stress-test.
        </li>
      </ul>
    </section>
  );
}

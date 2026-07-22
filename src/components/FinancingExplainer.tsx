import type { LoanParams, Results } from '../types';
import { formatEur, formatEur2 } from '../lib/format';

interface Props {
  loan: LoanParams;
  r: Results;
}

/**
 * Beginner-friendly, plain-language explanation of how the monthly loan
 * payment is derived — specifically clearing up the common Tilgung confusion.
 */
export function FinancingExplainer({ loan, r }: Props) {
  if (r.loanAmount <= 0) {
    return (
      <section className="card explainer">
        <h2>How your payment works</h2>
        <p className="explainer-lead">
          You're buying without a loan (your down payment covers everything), so
          there's no monthly mortgage — just the running costs shown in the cash
          flow.
        </p>
      </section>
    );
  }

  const combinedRate = loan.annualInterestRatePct + loan.initialRepaymentPct;
  const firstYear = r.amortization[0];
  const y1Interest = firstYear?.cumulativeInterest ?? 0;
  const y1Principal = firstYear?.cumulativePrincipal ?? 0;
  const isSameRate = r.repaymentStrategy === 'payoffWithinFixed';

  return (
    <section className="card explainer">
      <h2>How your monthly payment works</h2>

      <p className="explainer-lead">
        <strong>Tilgung is not paid on top of the interest.</strong> In a German
        annuity loan (Annuitätendarlehen) the interest rate and the Tilgung rate
        are <em>added together</em> to set one fixed monthly payment.
      </p>

      <div className="explainer-calc">
        <div className="explainer-calc-row">
          <span>Loan amount</span>
          <span>{formatEur(r.loanAmount)}</span>
        </div>
        <div className="explainer-calc-row">
          <span>Interest ({loan.annualInterestRatePct}%) + Tilgung ({loan.initialRepaymentPct}%)</span>
          <span>= {combinedRate.toFixed(2)}% / year</span>
        </div>
        <div className="explainer-calc-row explainer-calc-total">
          <span>Fixed monthly payment</span>
          <span>{formatEur2(r.monthlyAnnuity)}</span>
        </div>
      </div>

      <p className="explainer-note">
        So {loan.annualInterestRatePct}% + {loan.initialRepaymentPct}% ={' '}
        {combinedRate.toFixed(2)}% of {formatEur(r.loanAmount)} ÷ 12 ≈{' '}
        <strong>{formatEur2(r.monthlyAnnuity)} per month</strong>. This amount
        stays fixed for the {r.fixedRatePeriodYears}-year fixed period.
      </p>

      <div className="explainer-split">
        <div className="explainer-split-head">In your first year that payment splits into:</div>
        <div className="explainer-split-bars">
          <div className="split-bar">
            <div
              className="split-bar-fill split-interest"
              style={{ width: `${pct(y1Interest, y1Interest + y1Principal)}%` }}
            />
          </div>
        </div>
        <div className="explainer-split-legend">
          <span><i className="dot dot-interest" /> Interest to the bank: {formatEur(y1Interest)}</span>
          <span><i className="dot dot-principal" /> Repaying your loan: {formatEur(y1Principal)}</span>
        </div>
      </div>

      <div className={`fixed-callout ${r.fullyRepaidWithinFixed ? 'fixed-callout-good' : 'fixed-callout-warn'}`}>
        {r.fullyRepaidWithinFixed ? (
          <span>
            ✅ After the {r.fixedRatePeriodYears}-year fixed period the loan is{' '}
            <strong>fully repaid</strong> — you owe nothing and face no refinancing
            risk.
          </span>
        ) : isSameRate ? (
          <span>
            ℹ️ After the {r.fixedRatePeriodYears}-year fixed period you'd still owe{' '}
            <strong>{formatEur(r.restschuldAtFixedEnd)}</strong> (Restschuld). This
            simple view assumes you keep paying at the same{' '}
            <strong>{loan.annualInterestRatePct}%</strong> until it's cleared — full
            payoff <strong>{r.payoffDateLabel}</strong>. Switch to the follow-up
            option to stress-test a higher refinancing rate.
          </span>
        ) : (
          <span>
            ⚠️ After the {r.fixedRatePeriodYears}-year fixed period you'd still owe{' '}
            <strong>{formatEur(r.restschuldAtFixedEnd)}</strong> (Restschuld). You'd
            refinance that with a follow-up loan at whatever rate applies then — here
            assumed at <strong>{loan.followUpInterestRatePct}%</strong>.
          </span>
        )}
      </div>

      <ul className="explainer-tips">
        <li>
          The payment is fixed, but each year a little <strong>more</strong> goes
          to repaying the loan and a little <strong>less</strong> to interest —
          because you owe less.
        </li>
        {isSameRate ? (
          <li>
            This view keeps the <strong>same interest rate</strong> for the whole
            loan. If you won't clear it within the fixed period, try the follow-up
            option to see how a different refinancing rate changes total interest.
          </li>
        ) : (
          <li>
            A <strong>higher Tilgung</strong> (e.g. 3% instead of 2%) means a higher
            monthly payment but a smaller Restschuld and less interest overall.
          </li>
        )}
        <li>
          During the {r.fixedRatePeriodYears} guaranteed years you'd pay{' '}
          <strong>{formatEur(r.interestDuringFixed)}</strong> in interest. Full
          payoff: <strong>{r.payoffDateLabel}</strong>, total interest{' '}
          <strong>{formatEur(r.totalInterest)}</strong>
          {!isSameRate && <> (using the assumed follow-up rate)</>}.
        </li>
        {loan.annualExtraPayment > 0 && (
          <li>
            Your <strong>{formatEur(loan.annualExtraPayment)}/year</strong> lump-sum
            (Sondertilgung) is already included above — it goes straight off the
            balance each year, shortening the payoff and cutting total interest.
          </li>
        )}
      </ul>
    </section>
  );
}

function pct(part: number, whole: number): number {
  if (whole <= 0) return 0;
  return Math.min(100, Math.max(0, (part / whole) * 100));
}

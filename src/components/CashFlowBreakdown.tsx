import type { Results } from '../types';
import { formatEur2 } from '../lib/format';

function Row({ label, amount, kind }: { label: string; amount: number; kind: 'in' | 'out' | 'total' }) {
  return (
    <div className={`cf-row cf-${kind}`}>
      <span>{label}</span>
      <span>{kind === 'out' && amount !== 0 ? `− ${formatEur2(Math.abs(amount))}` : formatEur2(amount)}</span>
    </div>
  );
}

export function CashFlowBreakdown({ r }: { r: Results }) {
  return (
    <section className="card">
      <h2>Monthly cash flow</h2>
      <div className="cf-table">
        <Row label="Cold rent (after vacancy allowance)" amount={r.effectiveMonthlyRent} kind="in" />
        <Row label="Non-recoverable Hausgeld" amount={r.nonRecoverableHausgeld} kind="out" />
        <Row label="Maintenance reserve" amount={r.monthlyMaintenance} kind="out" />
        <Row label="Property management" amount={r.monthlyManagement} kind="out" />
        <Row label="= Cash flow before loan" amount={r.monthlyCashFlowBeforeLoan} kind="total" />
        <Row label="Loan interest" amount={r.monthlyLoanInterest} kind="out" />
        <Row label="Loan repayment (Tilgung)" amount={r.monthlyLoanPrincipal} kind="out" />
        <Row label="= Cash flow after loan" amount={r.monthlyCashFlowAfterLoan} kind="total" />
      </div>
      {r.monthlyLoanPrincipal > 0 && (
        <p className="cf-note muted small">
          The Tilgung ({formatEur2(r.monthlyLoanPrincipal)}/mo) isn't lost — it pays
          down your loan and builds equity. Only the interest is a true cost.
        </p>
      )}
    </section>
  );
}

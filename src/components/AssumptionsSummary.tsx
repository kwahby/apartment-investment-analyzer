import { useState } from 'react';
import type { Apartment, CostSettings, LoanParams, ProjectionParams, Results } from '../types';
import { formatEur, formatPct } from '../lib/format';

interface Props {
  apartment: Apartment;
  loan: LoanParams;
  costs: CostSettings;
  projection: ProjectionParams;
  results: Results;
}

interface Row {
  label: string;
  value: string;
}

function Group({ title, rows }: { title: string; rows: Row[] }) {
  return (
    <div className="assump-group">
      <h3>{title}</h3>
      <div className="assump-rows">
        {rows.map((r) => (
          <div className="assump-row" key={r.label}>
            <span>{r.label}</span>
            <strong>{r.value}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AssumptionsSummary({ apartment, loan, costs, projection, results }: Props) {
  const [open, setOpen] = useState(false);

  const strategy = loan.repaymentStrategy === 'payoffWithinFixed' ? 'Same rate throughout' : 'Follow-up loan';

  const purchase: Row[] = [
    { label: 'Purchase price', value: formatEur(apartment.purchasePrice) },
    { label: 'Living area', value: `${apartment.sizeSqm} m²` },
    ...((apartment.balconySqm ?? 0) > 0
      ? [{ label: 'Balcony area', value: `${apartment.balconySqm} m² (@ ${apartment.balconyWeightPct ?? 25}%)` }]
      : []),
    { label: 'Price / m²', value: formatEur(results.pricePerSqm) },
    { label: 'Monthly cold rent', value: formatEur(apartment.monthlyColdRent) },
    { label: 'Build year', value: apartment.buildYear ? String(apartment.buildYear) : '—' },
    { label: 'Renovation budget', value: formatEur(apartment.renovationCost ?? 0) },
    { label: 'Renovation value uplift', value: formatEur(apartment.renovationValueAdd ?? 0) },
    { label: 'Closing costs', value: formatEur(results.closingCosts) },
    { label: 'Total investment', value: formatEur(results.totalInvestment) },
  ];

  const financing: Row[] = [
    { label: 'Down payment', value: formatEur(loan.downPayment) },
    { label: 'Finance closing costs', value: loan.financeClosingCosts ? 'Yes' : 'No' },
    { label: 'Loan amount', value: formatEur(results.loanAmount) },
    { label: 'Interest rate', value: formatPct(loan.annualInterestRatePct) },
    { label: 'Initial repayment (Tilgung)', value: formatPct(loan.initialRepaymentPct) },
    { label: 'Fixed-rate period', value: `${loan.fixedRatePeriodYears} yrs` },
    { label: 'Strategy', value: strategy },
    { label: 'Follow-up rate', value: formatPct(loan.followUpInterestRatePct) },
    { label: 'Annual lump sum', value: formatEur(loan.annualExtraPayment) },
    { label: 'Target payoff', value: `${loan.targetPayoffYears} yrs${loan.forceTargetPayoff ? ' (forced)' : ''}` },
  ];

  const running: Row[] = [
    { label: 'Grunderwerbsteuer', value: formatPct(costs.transferTaxPct) },
    { label: 'Notary', value: formatPct(costs.notaryPct) },
    { label: 'Land registry', value: formatPct(costs.landRegistryPct) },
    { label: 'Agent commission', value: formatPct(costs.agentCommissionPct) },
    { label: 'Maintenance reserve / yr', value: `${formatPct(costs.maintenanceReservePctPerYear)} of price` },
    { label: 'Management / month', value: formatEur(costs.managementPerMonth) },
    { label: 'Vacancy allowance', value: `${formatPct(costs.vacancyPct)} of rent` },
    { label: 'Recoverable Hausgeld', value: `${Math.round(apartment.hausgeldRecoverableRatio * 100)} %` },
  ];

  const projectionRows: Row[] = [
    { label: 'Holding period', value: `${projection.holdingYears} yrs` },
    { label: 'Appreciation / yr', value: formatPct(projection.annualAppreciationPct) },
    { label: 'Rent growth / yr', value: formatPct(projection.annualRentGrowthPct) },
    { label: 'Cost inflation / yr', value: formatPct(projection.annualCostInflationPct) },
    { label: 'Selling costs', value: `${formatPct(projection.sellingCostsPct)} of sale` },
    { label: 'ETF return (comparison)', value: formatPct(projection.etfReturnPct) },
    { label: 'After-tax view', value: projection.taxEnabled ? 'On' : 'Off' },
    { label: 'Marginal tax rate', value: formatPct(projection.marginalTaxRatePct) },
    { label: 'Building share', value: formatPct(projection.buildingSharePct) },
    { label: 'AfA rate', value: formatPct(projection.afaRatePct) },
    { label: 'Sonderabschreibung §7b', value: projection.sonderAfaEnabled ? 'On' : 'Off' },
  ];

  return (
    <section className="card">
      <button className="collapse-toggle" onClick={() => setOpen((o) => !o)}>
        <h2>All assumptions (transparency)</h2>
        <span>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="assump-body">
          <p className="muted small" style={{ marginTop: 0 }}>
            Every figure feeding the analysis, in one place. Edit purchase/financing in the form,
            and the cost/tax assumptions in Settings.
          </p>
          <div className="assump-grid">
            <Group title="Purchase" rows={purchase} />
            <Group title="Financing" rows={financing} />
            <Group title="Running & purchase costs" rows={running} />
            <Group title="Projection & tax" rows={projectionRows} />
          </div>
        </div>
      )}
    </section>
  );
}

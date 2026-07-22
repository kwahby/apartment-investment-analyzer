import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { Projection, Results } from '../types';
import { formatEur } from '../lib/format';

const CURRENT_YEAR = new Date().getFullYear();

/**
 * Bar chart of the yearly (net) cash flow over the holding period, using the
 * Projection tab's rent-growth / cost-inflation assumptions. Bars are green
 * once the year is cash-flow positive and red while you're still topping up.
 * A dashed marker highlights the first positive year — which can land BEFORE
 * the loan is repaid, because rents grow while the loan payment stays fixed.
 */
export function CashFlowChart({ projection, r }: { projection: Projection; r: Results }) {
  const taxEnabled = projection.taxEnabled;
  const data = projection.years.map((y) => ({
    year: y.year,
    annual: taxEnabled ? y.cashFlowAfterTax : y.cashFlowPreTax,
  }));

  if (data.length === 0) {
    return null;
  }

  // First year where the yearly cash flow turns positive.
  const firstPositive = data.find((d) => d.annual >= 0) ?? null;

  // Calendar year the loan is fully repaid (for context on the chart).
  const payoffYear =
    r.payoffYears !== null ? CURRENT_YEAR + Math.ceil(r.payoffYears) : null;
  const lastYear = data[data.length - 1].year;
  const showPayoffLine = payoffYear !== null && payoffYear > data[0].year && payoffYear <= lastYear;

  const yearsUntilPositive = firstPositive ? firstPositive.year - CURRENT_YEAR : null;
  const positiveBeforePayoff =
    firstPositive !== null && payoffYear !== null && firstPositive.year < payoffYear;

  return (
    <section className="card">
      <h2>Yearly cash flow</h2>
      <div className="chart-wrap">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} margin={{ top: 18, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="year" tick={{ fontSize: 12 }} />
            <YAxis
              tick={{ fontSize: 12 }}
              tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`}
            />
            <Tooltip
              formatter={(v) => [formatEur(Number(v)), 'Cash flow']}
              labelFormatter={(label) => `Year ${label}`}
            />
            <ReferenceLine y={0} stroke="#334155" />

            {showPayoffLine && (
              <ReferenceLine
                x={payoffYear!}
                stroke="#6b7280"
                strokeDasharray="4 3"
                label={{ value: 'Loan repaid', position: 'insideTopRight', fontSize: 11, fill: '#6b7280' }}
              />
            )}

            {firstPositive && (
              <ReferenceLine
                x={firstPositive.year}
                stroke="#16a34a"
                strokeDasharray="4 3"
                label={{ value: 'Turns positive', position: 'insideTopLeft', fontSize: 11, fill: '#16a34a' }}
              />
            )}

            <Bar dataKey="annual" name="Yearly cash flow" radius={[3, 3, 0, 0]}>
              {data.map((d) => (
                <Cell key={d.year} fill={d.annual >= 0 ? '#16a34a' : '#dc2626'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="chart-caption muted small">
        {firstPositive ? (
          <>
            Your yearly cash flow turns <strong>positive in {firstPositive.year}</strong>
            {yearsUntilPositive !== null && yearsUntilPositive > 0 && (
              <> (about {yearsUntilPositive} {yearsUntilPositive === 1 ? 'year' : 'years'} out)</>
            )}
            {positiveBeforePayoff ? (
              <> — before the loan is repaid, because rents grow while the loan payment stays fixed.</>
            ) : (
              <>.</>
            )}
          </>
        ) : (
          <>
            Yearly cash flow stays negative for the whole {projection.holdingYears}-year
            projection at these assumptions — you'd keep topping up each year.
          </>
        )}{' '}
        Based on the rent-growth and cost-inflation assumptions on the{' '}
        <strong>Projection</strong> tab{taxEnabled ? ' (after-tax view)' : ''}.
      </p>
    </section>
  );
}

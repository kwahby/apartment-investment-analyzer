import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { Projection } from '../types';
import { formatEur } from '../lib/format';

/**
 * Diverging stacked bar chart: rental income (above zero) vs. the outflows that
 * eat it — operating costs, loan interest and principal (below zero) — for each
 * year of the holding period. The overlaid line is the net cash flow, so you can
 * see at a glance which stack is winning and why a year is red or green.
 *
 * This is a pre-tax operating view (income in, money out); the German tax layer
 * is handled separately on the Projection tab.
 */
export function IncomeVsOutflowChart({ projection }: { projection: Projection }) {
  if (projection.years.length === 0) {
    return null;
  }

  const data = projection.years.map((y) => ({
    year: y.year,
    Rent: y.effectiveRent,
    Operating: -y.operatingCosts,
    Interest: -y.interest,
    Principal: -y.principal,
    Net: y.cashFlowPreTax,
  }));

  return (
    <section className="card">
      <h2>Income vs. outflow</h2>
      <div className="chart-wrap">
        <ResponsiveContainer width="100%" height={320}>
          <ComposedChart data={data} margin={{ top: 18, right: 10, left: 0, bottom: 0 }} stackOffset="sign">
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="year" tick={{ fontSize: 12 }} />
            <YAxis
              tick={{ fontSize: 12 }}
              tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`}
            />
            <Tooltip
              formatter={(v, name) => [formatEur(Number(v)), name as string]}
              labelFormatter={(label) => `Year ${label}`}
            />
            <Legend />
            <ReferenceLine y={0} stroke="#334155" />

            <Bar dataKey="Rent" stackId="cf" fill="#16a34a" name="Rent (after vacancy)" />
            <Bar dataKey="Operating" stackId="cf" fill="#f59e0b" name="Operating costs" />
            <Bar dataKey="Interest" stackId="cf" fill="#dc2626" name="Loan interest" />
            <Bar dataKey="Principal" stackId="cf" fill="#2563eb" name="Loan principal" />

            <Line
              type="monotone"
              dataKey="Net"
              stroke="#0f172a"
              strokeWidth={2}
              dot={false}
              name="Net cash flow"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <p className="chart-caption muted small">
        Green rent sits above the line; the amber/red/blue blocks below are what it has
        to cover — running costs, interest and principal. When the green bar is taller
        than the stack below, the black net line is positive. As rents grow and interest
        shrinks, the stack lightens and the year flips into the black.
      </p>
    </section>
  );
}

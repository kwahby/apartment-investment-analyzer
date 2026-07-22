import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  ReferenceArea,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { Results } from '../types';
import { formatEur } from '../lib/format';

export function AmortizationChart({ r }: { r: Results }) {
  if (r.amortization.length === 0) {
    return null;
  }

  const hasExtra = r.amortizationNoExtra.length > 0;

  // Merge the actual schedule (with lump sums) and the baseline (without) by
  // year, spanning the longer of the two so the full effect is visible.
  const mainByYear = new Map(r.amortization.map((p) => [p.year, p]));
  const baseByYear = new Map(r.amortizationNoExtra.map((p) => [p.year, p]));
  const lastMain = r.amortization[r.amortization.length - 1];
  const allYears = Array.from(
    new Set([...mainByYear.keys(), ...baseByYear.keys()]),
  ).sort((a, b) => a - b);

  const data = allYears.map((year) => {
    const m = mainByYear.get(year);
    const b = baseByYear.get(year);
    return {
      year,
      // After the (earlier) with-lump payoff, balance is 0 and the cumulative
      // interest/principal stay flat at their final values.
      Balance: m ? m.remainingBalance : 0,
      Interest: m ? m.cumulativeInterest : lastMain.cumulativeInterest,
      Principal: m ? m.cumulativePrincipal : lastMain.cumulativePrincipal,
      BalanceNoExtra: hasExtra ? (b ? b.remainingBalance : 0) : undefined,
      lumpSum: m?.lumpSum ?? 0,
    };
  });

  // Years where a lump sum was actually applied — marked on the balance line.
  const lumpPoints = data.filter((d) => d.lumpSum > 0);

  // Interest & time saved by the lump sums (for the caption).
  const baseInterest = hasExtra
    ? r.amortizationNoExtra[r.amortizationNoExtra.length - 1].cumulativeInterest
    : 0;
  const interestSaved = Math.max(0, baseInterest - r.totalInterest);
  const baseLastYear = hasExtra
    ? r.amortizationNoExtra[r.amortizationNoExtra.length - 1].year
    : lastMain.year;
  const yearsSaved = Math.max(0, baseLastYear - lastMain.year);

  const currentYear = new Date().getFullYear();
  const firstYear = data[0].year;
  const lastYear = data[data.length - 1].year;
  // The fixed-interest period ends this many calendar years out.
  const fixedEndYear = currentYear + r.fixedRatePeriodYears;
  const showFixedLine = fixedEndYear > firstYear && fixedEndYear < lastYear;
  // Shade the follow-up loan phase (only relevant when a Restschuld is refinanced).
  const showFollowUp =
    r.repaymentStrategy === 'followUp' && !r.fullyRepaidWithinFixed && fixedEndYear < lastYear;

  return (
    <section className="card">
      <h2>Loan payoff over time</h2>
      <div className="chart-wrap">
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data} margin={{ top: 18, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="year" tick={{ fontSize: 12 }} />
            <YAxis
              tick={{ fontSize: 12 }}
              tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`}
            />
            <Tooltip formatter={(v) => formatEur(Number(v))} />
            <Legend />

            {showFollowUp && (
              <ReferenceArea
                x1={fixedEndYear}
                x2={lastYear}
                fill="#f59e0b"
                fillOpacity={0.08}
                ifOverflow="visible"
              />
            )}

            <Area
              type="monotone"
              dataKey="Balance"
              stroke="#dc2626"
              fill="#fecaca"
              name="Remaining balance"
            />
            <Area
              type="monotone"
              dataKey="Principal"
              stroke="#16a34a"
              fill="#bbf7d0"
              name="Principal repaid"
            />
            <Area
              type="monotone"
              dataKey="Interest"
              stroke="#2563eb"
              fill="#bfdbfe"
              name="Interest paid (cum.)"
            />

            {hasExtra && (
              <Line
                type="monotone"
                dataKey="BalanceNoExtra"
                stroke="#9333ea"
                strokeWidth={2}
                strokeDasharray="6 4"
                dot={false}
                name="Balance without lump sums"
              />
            )}

            {hasExtra &&
              lumpPoints.map((d) => (
                <ReferenceDot
                  key={d.year}
                  x={d.year}
                  y={d.Balance}
                  r={3.5}
                  fill="#16a34a"
                  stroke="#fff"
                  strokeWidth={1}
                  ifOverflow="visible"
                />
              ))}

            {showFixedLine && (
              <ReferenceLine
                x={fixedEndYear}
                stroke="#7c3aed"
                strokeDasharray="5 4"
                strokeWidth={2}
                label={{
                  value: `Fixed rate ends (${r.fixedRatePeriodYears}y)`,
                  position: 'top',
                  fill: '#7c3aed',
                  fontSize: 11,
                  fontWeight: 700,
                }}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {hasExtra && (
        <p className="chart-caption">
          <span className="lump-legend-dot" /> The green dots mark each year you make
          a lump-sum (Sondertilgung). The dashed purple line is the balance{' '}
          <strong>without</strong> those extra payments — the gap to the red balance
          is how much faster you own the flat. Over the loan they save you about{' '}
          <strong>{formatEur(interestSaved)}</strong> in interest
          {yearsSaved > 0 && (
            <>
              {' '}and pay it off roughly <strong>{yearsSaved} year{yearsSaved === 1 ? '' : 's'}</strong> sooner
            </>
          )}
          .
        </p>
      )}

      <p className="chart-caption muted small">
        {r.repaymentStrategy === 'payoffWithinFixed' ? (
          <>
            The loan is fully repaid within the{' '}
            <strong>{r.fixedRatePeriodYears}-year</strong> fixed period — the red
            balance reaches €0 at the dashed line.
          </>
        ) : r.fullyRepaidWithinFixed ? (
          <>
            The loan is cleared before the{' '}
            <strong>{r.fixedRatePeriodYears}-year</strong> fixed period ends — no
            follow-up loan needed.
          </>
        ) : (
          <>
            At the dashed line the fixed rate ends with a{' '}
            <strong>{formatEur(r.restschuldAtFixedEnd)}</strong> balance
            (Restschuld). The shaded area is the follow-up loan phase, estimated at
            your assumed follow-up rate.
          </>
        )}
      </p>
    </section>
  );
}

import { useMemo, useState } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { Apartment, CostSettings, LoanParams, ProjectionParams } from '../types';
import { computeRentVsBuy } from '../lib/rentVsBuy';
import { NumberField } from './NumberField';
import { InfoDot } from './InfoDot';
import { formatEur } from '../lib/format';

interface Props {
  apartment: Apartment;
  loan: LoanParams;
  costs: CostSettings;
  projection: ProjectionParams;
}

export function RentVsBuyPanel({ apartment, loan, costs, projection }: Props) {
  const [rent, setRent] = useState(apartment.monthlyColdRent);

  const r = useMemo(
    () => computeRentVsBuy(apartment, loan, costs, projection, rent),
    [apartment, loan, costs, projection, rent],
  );

  const maxWealth = Math.max(r.buyEndWealth, r.rentEndWealth, 1);
  const barPct = (v: number) => Math.max(2, Math.min(100, (v / maxWealth) * 100));

  return (
    <div className="stack">
      <section className="card">
        <h2>
          Rent vs. buy — for living in it yourself
          <InfoDot
            text="Compares buying this flat to live in against renting an equivalent home and investing your cash instead. Both households spend the same on housing each month; the cheaper one invests the difference at your ETF return, and the renter also invests the down payment. It uses your Projection assumptions (holding years, appreciation, ETF return, selling costs)."
            label="About: Rent vs. buy"
          />
        </h2>
        <p className="muted small" style={{ marginTop: 0 }}>
          This is the owner-occupier question (no rental income or landlord tax). It uses your
          <strong> Projection</strong> assumptions — holding {r.holdingYears} years, appreciation,
          ETF return and selling costs.
        </p>

        <div className="grid-2">
          <NumberField
            label="Rent you'd pay to live in an equal home"
            value={rent}
            onChange={setRent}
            suffix="€ / mo"
            step={25}
            min={0}
            hint="What renting a comparable place would cost you each month (cold rent). Defaults to this flat's market rent."
          />
        </div>

        <div className={`etf-compare ${r.buyerWins ? 'buy-wins' : 'etf-wins'}`} style={{ marginTop: 8 }}>
          <p className="etf-headline">
            {r.buyerWins ? (
              <>
                Over {r.holdingYears} years, <strong>buying</strong> is projected to leave you about{' '}
                <strong>{formatEur(r.difference)} more</strong> than renting &amp; investing. 🏠
              </>
            ) : (
              <>
                Over {r.holdingYears} years, <strong>renting &amp; investing</strong> is projected to
                leave you about <strong>{formatEur(-r.difference)} more</strong> than buying. 📈
              </>
            )}
          </p>

          <div className="etf-bars">
            <div className="etf-bar-row">
              <span className="etf-bar-label">Buy &amp; live in it</span>
              <div className="etf-bar-track">
                <div className="etf-bar-fill etf-bar-buy" style={{ width: `${barPct(r.buyEndWealth)}%` }} />
              </div>
              <span className="etf-bar-value">{formatEur(r.buyEndWealth)}</span>
            </div>
            <div className="etf-bar-row">
              <span className="etf-bar-label">Rent &amp; invest</span>
              <div className="etf-bar-track">
                <div className="etf-bar-fill etf-bar-etf" style={{ width: `${barPct(r.rentEndWealth)}%` }} />
              </div>
              <span className="etf-bar-value">{formatEur(r.rentEndWealth)}</span>
            </div>
          </div>
        </div>

        <div className="metric-grid" style={{ marginTop: 14 }}>
          <div className="metric metric-neutral">
            <span className="metric-value">{formatEur(r.upfront)}</span>
            <span className="metric-label">Upfront cash (down payment + costs)</span>
          </div>
          <div className="metric metric-neutral">
            <span className="metric-value">{formatEur(r.year1BuyMonthly)}</span>
            <span className="metric-label">Owning: monthly (yr 1)</span>
          </div>
          <div className="metric metric-neutral">
            <span className="metric-value">{formatEur(r.year1RentMonthly)}</span>
            <span className="metric-label">Renting: monthly (yr 1)</span>
          </div>
          <div className="metric metric-neutral">
            <span className="metric-value">{r.crossoverYear ?? '—'}</span>
            <span className="metric-label">Buying pulls ahead in</span>
          </div>
        </div>
      </section>

      <section className="card">
        <h2>Net worth over time</h2>
        <div className="chart-wrap">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={r.series} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="year" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`} />
              <Tooltip formatter={(v) => formatEur(Number(v))} />
              <Legend />
              <Line type="monotone" dataKey="Buy" stroke="#16a34a" strokeWidth={2.5} dot={false} name="Buy & live in it" />
              <Line type="monotone" dataKey="Rent" stroke="#7c3aed" strokeWidth={2.5} dot={false} name="Rent & invest" />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <p className="chart-caption muted small">
          Net worth if you liquidated each year (property equity after selling costs, plus any
          invested surplus, vs. the renter's compounded pot). Where the green line crosses above the
          purple, buying has paid off. Renting looks strong early because you avoid the big upfront
          costs and invest them instead.
        </p>
      </section>
    </div>
  );
}

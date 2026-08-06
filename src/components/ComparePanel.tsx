import { useMemo, useRef, useState } from 'react';
import type { Apartment, CostSettings, LoanParams, ProjectionParams, SavedDeal } from '../types';
import { computeResults } from '../lib/finance';
import { computeProjection } from '../lib/projection';
import { calculateUnderwriting } from '../lib/underwriting';
import { formatEur, formatPct } from '../lib/format';

interface CurrentInputs {
  apartment: Apartment;
  loan: LoanParams;
  costs: CostSettings;
  projection: ProjectionParams;
}

interface Props {
  current: CurrentInputs;
  deals: SavedDeal[];
  saveDeal: (name: string) => void;
  updateDeal: (id: string) => void;
  renameDeal: (id: string, name: string) => void;
  deleteDeal: (id: string) => void;
  loadDeal: (id: string) => void;
  importDeals: (deals: SavedDeal[], replace: boolean) => void;
}

type Dir = 'high' | 'low' | 'none';

interface MetricDef {
  key: string;
  label: string;
  dir: Dir;
  get: (m: ComputedDeal) => number | null;
  fmt: (v: number | null) => string;
}

interface ComputedDeal {
  id: string;
  name: string;
  isCurrent: boolean;
  recommendation: 'BUY' | 'NEGOTIATE' | 'PASS';
  financialScore: number | null;
  assetScore: number | null;
  financingScore: number | null;
  wealthScore: number | null;
  marginPct: number | null;
  price: number;
  pricePerSqm: number;
  cashInvested: number;
  monthlyCashFlow: number;
  grossYield: number;
  netYield: number;
  irr: number | null;
  totalProfit: number;
  moneyMultiple: number;
}

function compute(id: string, name: string, isCurrent: boolean, inp: CurrentInputs): ComputedDeal {
  const res = computeResults(inp.apartment, inp.loan, inp.costs);
  const proj = computeProjection(inp.apartment, inp.costs, res, inp.projection);
  const underwriting = calculateUnderwriting({
    apartment: inp.apartment,
    loan: inp.loan,
    costs: inp.costs,
    results: res,
    projection: proj,
  });
  return {
    id,
    name,
    isCurrent,
    recommendation: underwriting.recommendation.recommendation,
    financialScore: underwriting.financial.score,
    assetScore: underwriting.asset.score,
    financingScore: underwriting.financing.score,
    wealthScore: underwriting.wealth.score,
    marginPct: underwriting.margin.marginPct,
    price: inp.apartment.purchasePrice,
    pricePerSqm: res.pricePerSqm,
    cashInvested: res.cashInvested,
    monthlyCashFlow: res.monthlyCashFlowAfterLoan,
    grossYield: res.grossYieldPct,
    netYield: res.netYieldPct,
    irr: proj.irrPct,
    totalProfit: proj.totalProfit,
    moneyMultiple: proj.moneyMultiple,
  };
}

const METRICS: MetricDef[] = [
  { key: 'financialScore', label: 'Financial performance', dir: 'high', get: (m) => m.financialScore, fmt: (v) => (v === null ? 'n/a' : `${Math.round(v)}/100`) },
  { key: 'assetScore', label: 'Asset attractiveness', dir: 'high', get: (m) => m.assetScore, fmt: (v) => (v === null ? 'n/a' : `${Math.round(v)}/100`) },
  { key: 'financingScore', label: 'Financing safety', dir: 'high', get: (m) => m.financingScore, fmt: (v) => (v === null ? 'n/a' : `${Math.round(v)}/100`) },
  { key: 'wealthScore', label: 'Wealth creation', dir: 'high', get: (m) => m.wealthScore, fmt: (v) => (v === null ? 'n/a' : `${Math.round(v)}/100`) },
  { key: 'margin', label: 'Margin of safety', dir: 'high', get: (m) => m.marginPct, fmt: (v) => (v === null ? 'n/a' : `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`) },
  { key: 'price', label: 'Purchase price', dir: 'low', get: (m) => m.price, fmt: (v) => formatEur(v ?? 0) },
  { key: 'pricePerSqm', label: 'Price / m²', dir: 'low', get: (m) => m.pricePerSqm, fmt: (v) => formatEur(v ?? 0) },
  { key: 'cashInvested', label: 'Cash invested', dir: 'low', get: (m) => m.cashInvested, fmt: (v) => formatEur(v ?? 0) },
  { key: 'mcf', label: 'Monthly cash flow', dir: 'high', get: (m) => m.monthlyCashFlow, fmt: (v) => formatEur(v ?? 0) },
  { key: 'gy', label: 'Gross yield', dir: 'high', get: (m) => m.grossYield, fmt: (v) => formatPct(v ?? 0) },
  { key: 'ny', label: 'Net yield', dir: 'high', get: (m) => m.netYield, fmt: (v) => formatPct(v ?? 0) },
  { key: 'irr', label: 'IRR', dir: 'high', get: (m) => m.irr, fmt: (v) => (v === null ? 'n/a' : formatPct(v)) },
  { key: 'profit', label: 'Total profit', dir: 'high', get: (m) => m.totalProfit, fmt: (v) => formatEur(v ?? 0) },
  { key: 'mm', label: 'Money multiple', dir: 'high', get: (m) => m.moneyMultiple, fmt: (v) => `${(v ?? 0).toFixed(2)}×` },
];

function bestIndex(rows: ComputedDeal[], def: MetricDef): number {
  if (def.dir === 'none' || rows.length < 2) return -1;
  let best = -1;
  let bestVal = def.dir === 'high' ? -Infinity : Infinity;
  rows.forEach((m, i) => {
    const v = def.get(m);
    if (v === null) return;
    if (def.dir === 'high' ? v > bestVal : v < bestVal) {
      bestVal = v;
      best = i;
    }
  });
  return best;
}

export function ComparePanel({
  current,
  deals,
  saveDeal,
  updateDeal,
  renameDeal,
  deleteDeal,
  loadDeal,
  importDeals,
}: Props) {
  const [name, setName] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const [ioMsg, setIoMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const entries = useMemo<ComputedDeal[]>(() => {
    const cur = compute('current', current.apartment.title?.trim() || 'Current', true, current);
    const saved = deals.map((d) =>
      compute(d.id, d.name, false, {
        apartment: d.apartment,
        loan: d.loan,
        costs: d.costs,
        projection: d.projection,
      }),
    );
    return [cur, ...saved];
  }, [current, deals]);

  const doSave = () => {
    saveDeal(name);
    setName('');
  };

  const doExport = () => {
    const payload = {
      app: 'apartment-investment-analyzer',
      version: 1,
      exportedAt: new Date().toISOString(),
      deals,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `apartment-deals-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const onImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-importing the same file
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      const incoming: SavedDeal[] = Array.isArray(parsed) ? parsed : parsed?.deals;
      if (!Array.isArray(incoming)) throw new Error('no deals array');
      const valid = incoming.filter(
        (d) => d && d.apartment && d.loan && d.costs && d.projection,
      );
      if (valid.length === 0) throw new Error('no valid deals');
      const replace =
        deals.length > 0 &&
        window.confirm(
          `Import ${valid.length} deal(s).\n\nOK = replace your ${deals.length} current deal(s).\nCancel = add them alongside.`,
        );
      importDeals(valid, replace);
      setIoMsg({ text: `Imported ${valid.length} deal(s).`, ok: true });
    } catch {
      setIoMsg({ text: 'That file could not be read as a deals backup.', ok: false });
    }
  };

  return (
    <div className="stack">
      <section className="card">
        <h2>Save this deal</h2>
        <p className="muted small" style={{ marginTop: 0 }}>
          Snapshot the current inputs so you can compare listings side by side. Everything is stored
          on this device only — use Export to back it up or move it to another device.
        </p>
        <div className="lookup-row">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                doSave();
              }
            }}
            placeholder={current.apartment.title?.trim() || 'e.g. Bornheim 3-room'}
          />
          <button type="button" className="btn-primary" onClick={doSave}>
            Save current
          </button>
        </div>

        <div className="deal-io">
          <button type="button" className="btn-secondary" onClick={doExport} disabled={deals.length === 0}>
            Export deals
          </button>
          <button type="button" className="btn-secondary" onClick={() => fileRef.current?.click()}>
            Import deals
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            onChange={onImportFile}
            style={{ display: 'none' }}
          />
        </div>
        {ioMsg && <p className={`lookup-msg ${ioMsg.ok ? 'is-ok' : 'is-warn'}`}>{ioMsg.text}</p>}
      </section>

      <section className="card">
        <h2>Compare deals</h2>
        {deals.length === 0 ? (
          <p className="muted">
            No saved deals yet. Save the current one above, tweak the inputs for another listing,
            save that too, and they'll line up here for a side-by-side comparison.
          </p>
        ) : (
          <div className="compare-wrap">
            <table className="compare-table">
              <thead>
                <tr>
                  <th className="compare-metric-head">Metric</th>
                  {entries.map((e) => (
                    <th key={e.id} className={e.isCurrent ? 'is-current' : ''}>
                      <div className="compare-deal-name">{e.name}</div>
                      <div className={`badge-verdict v-${e.recommendation === 'BUY' ? 'buy' : e.recommendation === 'PASS' ? 'avoid' : 'caution'}`}>{e.recommendation}</div>
                      {e.isCurrent ? (
                        <div className="compare-tag">live</div>
                      ) : (
                        <div className="compare-actions">
                          <button title="Load into inputs" onClick={() => loadDeal(e.id)}>
                            Load
                          </button>
                          <button title="Overwrite with current inputs" onClick={() => updateDeal(e.id)}>
                            Update
                          </button>
                          <button
                            title="Rename"
                            onClick={() => {
                              const n = window.prompt('Rename deal', e.name);
                              if (n !== null) renameDeal(e.id, n);
                            }}
                          >
                            Rename
                          </button>
                          <button
                            className="danger"
                            title="Delete"
                            onClick={() => {
                              if (window.confirm(`Delete "${e.name}"?`)) deleteDeal(e.id);
                            }}
                          >
                            ✕
                          </button>
                        </div>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {METRICS.map((def) => {
                  const best = bestIndex(entries, def);
                  return (
                    <tr key={def.key}>
                      <th>{def.label}</th>
                      {entries.map((e, i) => (
                        <td key={e.id} className={i === best ? 'is-best' : ''}>
                          {def.fmt(def.get(e))}
                          {i === best && <span className="best-star"> ★</span>}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {deals.length > 0 && (
          <p className="muted small" style={{ marginTop: 10 }}>
            ★ marks the best value in each row. "Load" pulls a saved deal back into the inputs;
            "Update" overwrites it with your current inputs.
          </p>
        )}
      </section>
    </div>
  );
}

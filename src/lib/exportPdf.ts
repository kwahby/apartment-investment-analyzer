import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import type { Apartment, LoanParams, Results, Projection } from '../types';
import { formatEur, formatEur2, formatPct } from './format';

const esc = (s: string) =>
  s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));

// --- tiny inline SVG icon set (stroke-based) ---
const ic = (path: string, color: string, size = 18) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;
const ICON = {
  home: (c: string, s = 18) => ic('<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M9.5 21v-6h5v6"/>', c, s),
  cash: (c: string, s = 18) => ic('<rect x="2" y="6" width="20" height="13" rx="3"/><circle cx="12" cy="12.5" r="2.5"/><path d="M6 9.5h.01M18 15.5h.01"/>', c, s),
  percent: (c: string, s = 18) => ic('<line x1="19" y1="5" x2="5" y2="19"/><circle cx="6.5" cy="6.5" r="2.2"/><circle cx="17.5" cy="17.5" r="2.2"/>', c, s),
  trend: (c: string, s = 18) => ic('<polyline points="3 17 9 11 13 15 21 7"/><polyline points="15 7 21 7 21 13"/>', c, s),
  bank: (c: string, s = 18) => ic('<path d="M3 21h18"/><path d="M5 21V10M9 21V10M15 21V10M19 21V10"/><path d="M12 3 3.5 8h17z"/>', c, s),
  pin: (c: string, s = 18) => ic('<path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.4"/>', c, s),
  scale: (c: string, s = 18) => ic('<path d="M12 3v18"/><path d="M6 8h12"/><path d="M3 13l3-5 3 5a3 3 0 0 1-6 0z"/><path d="M15 13l3-5 3 5a3 3 0 0 1-6 0z"/><path d="M8 21h8"/>', c, s),
};

interface Row {
  label: string;
  value: string;
  tone?: string;
}
function rowsHtml(rows: Row[]): string {
  return rows
    .map(
      (r, i) => `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;${
        i < rows.length - 1 ? 'border-bottom:1px solid #eef1f6;' : ''
      }">
        <span style="color:#64748b;font-size:12.5px">${esc(r.label)}</span>
        <span style="font-weight:700;font-size:12.5px;color:${r.tone ?? '#0f172a'}">${esc(r.value)}</span>
      </div>`,
    )
    .join('');
}

function bar(label: string, value: number, max: number, grad: string, valueStr: string, badge?: string): string {
  const pct = Math.max(3, Math.min(100, (value / max) * 100));
  return `
    <div style="display:flex;align-items:center;gap:14px;margin-bottom:13px">
      <div style="width:180px;font-size:13px;color:#475569;font-weight:500">${esc(label)}${
        badge ? `<span style="margin-left:7px;font-size:10px;font-weight:800;color:#fff;background:#0f172a;padding:2px 7px;border-radius:999px">${esc(badge)}</span>` : ''
      }</div>
      <div style="flex:1;height:28px;background:#eef1f6;border-radius:10px;overflow:hidden">
        <div style="height:100%;width:${pct}%;background:${grad};border-radius:10px"></div>
      </div>
      <div style="width:112px;text-align:right;font-weight:800;font-size:16px;color:#0f172a">${esc(valueStr)}</div>
    </div>`;
}

function verdictTheme(label: string) {
  if (label === 'Buy')
    return { color: '#22c55e', pill: 'linear-gradient(135deg,#22c55e,#15803d)', g0: '#86efac', g1: '#22d3ee', mark: '✓' };
  if (label === 'Avoid')
    return { color: '#f87171', pill: 'linear-gradient(135deg,#fb7185,#be123c)', g0: '#fca5a5', g1: '#fb7185', mark: '✕' };
  return { color: '#fbbf24', pill: 'linear-gradient(135deg,#fbbf24,#b45309)', g0: '#fde68a', g1: '#fbbf24', mark: '!' };
}

function buildReport(apartment: Apartment, loan: LoanParams, r: Results, p: Projection): HTMLElement {
  const v = verdictTheme(r.verdict.label);
  const score = Math.round(r.verdict.score);
  const R = 60;
  const circ = 2 * Math.PI * R;
  const prog = (circ * Math.min(100, Math.max(0, score))) / 100;

  const cfPos = r.monthlyCashFlowAfterLoan >= 0;
  const profitPos = p.totalProfit >= 0;
  const cocPos = r.cashOnCashPct >= 0;

  const maxWealth = Math.max(p.buyEndWealth, p.etfEndWealth, 1);
  const etfDelta = p.buyEndWealth - p.etfEndWealth;
  const flatWins = etfDelta >= 0;
  const strategy = r.repaymentStrategy === 'payoffWithinFixed' ? 'Same rate throughout' : 'Follow-up loan';
  const dBench = r.benchmark.buyDeltaPct;

  const chip = (label: string, value: string, color?: string) => `
    <div style="flex:1;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.14);border-radius:14px;padding:12px 14px">
      <div style="font-size:10px;font-weight:700;letter-spacing:.08em;color:#c7d2fe">${esc(label)}</div>
      <div style="font-size:19px;font-weight:800;margin-top:6px;color:${color ?? '#fff'}">${esc(value)}</div>
    </div>`;

  const kpi = (grad: string, iconSvg: string, label: string, value: string) => `
    <div style="flex:1;border-radius:18px;padding:16px 16px 18px;background:${grad};color:#fff;box-shadow:0 12px 26px rgba(2,6,23,0.14);position:relative;overflow:hidden">
      <div style="position:absolute;right:-8px;top:-6px;opacity:.22;transform:scale(2.6)">${iconSvg}</div>
      <div style="position:relative">
        <div style="font-size:10.5px;font-weight:800;letter-spacing:.06em;opacity:.92">${esc(label)}</div>
        <div style="font-size:23px;font-weight:800;margin-top:10px;line-height:1">${esc(value)}</div>
      </div>
    </div>`;

  const cardHead = (iconSvg: string, title: string, color: string, tint: string) => `
    <div style="display:flex;align-items:center;gap:9px;margin-bottom:8px">
      <span style="width:28px;height:28px;border-radius:9px;background:${tint};display:flex;align-items:center;justify-content:center">${iconSvg}</span>
      <span style="font-size:12.5px;font-weight:800;color:${color};letter-spacing:.02em">${esc(title)}</span>
    </div>`;

  const propertyRows: Row[] = [
    { label: 'Price / m²', value: formatEur(r.pricePerSqm) },
    { label: 'Cold rent / mo', value: formatEur(apartment.monthlyColdRent) },
    { label: 'Rent / m²', value: formatEur2(r.rentPerSqm) },
    { label: 'Closing costs', value: formatEur(r.closingCosts) },
    { label: 'Total investment', value: formatEur(r.totalInvestment) },
    { label: 'Cash invested', value: formatEur(r.cashInvested) },
  ];
  const financeRows: Row[] = [
    { label: 'Loan amount', value: formatEur(r.loanAmount) },
    { label: 'Interest rate', value: formatPct(loan.annualInterestRatePct) },
    { label: 'Monthly payment', value: formatEur(r.monthlyAnnuity) },
    { label: 'Fixed period', value: `${r.fixedRatePeriodYears} yrs` },
    { label: 'Plan', value: strategy },
    { label: 'Payoff', value: r.payoffDateLabel.replace(/\s*\(.*\)/, '') },
  ];
  const returnRows: Row[] = [
    { label: 'Net yield', value: formatPct(r.netYieldPct) },
    { label: 'Cash-on-cash', value: formatPct(r.cashOnCashPct), tone: cocPos ? '#16a34a' : '#dc2626' },
    { label: 'Price multiple', value: `${r.priceToRentMultiple.toFixed(1)}×` },
    { label: 'Money multiple', value: `${p.moneyMultiple.toFixed(2)}×` },
    {
      label: 'Price vs area',
      value: r.benchmark.hasData ? `${dBench > 0 ? '+' : ''}${dBench.toFixed(1)}%` : '—',
      tone: r.benchmark.hasData ? (dBench <= 0 ? '#16a34a' : '#dc2626') : '#64748b',
    },
  ];

  const dots = Array.from({ length: 10 }, (_, i) => {
    const on = i < Math.round(r.benchmark.locationScore);
    return `<span style="width:14px;height:14px;border-radius:50%;background:${on ? '#4f46e5' : '#e2e8f0'};display:inline-block"></span>`;
  }).join('');

  const reasons = r.verdict.reasons
    .slice(0, 3)
    .map(
      (x) =>
        `<span style="display:inline-block;background:rgba(255,255,255,0.12);color:#e0e7ff;font-size:11.5px;font-weight:600;padding:5px 11px;border-radius:999px;margin:0 6px 6px 0">${esc(x)}</span>`,
    )
    .join('');

  const when = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  const sub = [
    apartment.areaLabel?.trim(),
    (apartment.balconySqm ?? 0) > 0
      ? `${apartment.sizeSqm} m² + ${apartment.balconySqm} m² balcony`
      : `${apartment.sizeSqm} m²`,
    apartment.buildYear ? `built ${apartment.buildYear}` : '',
    formatEur(apartment.purchasePrice),
  ]
    .filter(Boolean)
    .map(esc)
    .join('&nbsp;&nbsp;·&nbsp;&nbsp;');

  const el = document.createElement('div');
  el.style.cssText =
    'position:fixed;left:-10000px;top:0;width:794px;background:#0b1020;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0f172a;';
  el.innerHTML = `
    <div>
      <!-- ===== DARK HERO ===== -->
      <div style="position:relative;background:linear-gradient(135deg,#0b1020 0%,#1e1b4b 55%,#4338ca 120%);padding:30px 34px 66px;color:#fff;overflow:hidden">
        <div style="position:absolute;width:280px;height:280px;border-radius:50%;background:#6366f1;opacity:.28;top:-120px;right:-60px"></div>
        <div style="position:absolute;width:200px;height:200px;border-radius:50%;background:#22d3ee;opacity:.16;bottom:-90px;left:-40px"></div>

        <div style="position:relative">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <div style="display:flex;align-items:center;gap:10px">
              <span style="width:34px;height:34px;border-radius:10px;background:rgba(255,255,255,0.14);display:flex;align-items:center;justify-content:center">${ICON.home('#fff', 20)}</span>
              <span style="font-size:11px;font-weight:800;letter-spacing:.16em;color:#c7d2fe">INVESTMENT ANALYSIS</span>
            </div>
            <span style="font-size:11px;color:#a5b4fc">${esc(when)}</span>
          </div>

          <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-top:22px;gap:20px">
            <div style="flex:1">
              <div style="font-size:30px;font-weight:800;line-height:1.08;letter-spacing:-.01em">${esc(apartment.title?.trim() || 'Apartment')}</div>
              <div style="font-size:13px;color:#c7d2fe;margin-top:9px">${sub}</div>
              <div style="display:inline-flex;align-items:center;gap:10px;margin-top:16px;background:${v.pill};padding:9px 16px 9px 12px;border-radius:999px;box-shadow:0 10px 22px rgba(0,0,0,0.25)">
                <span style="width:22px;height:22px;border-radius:50%;background:rgba(255,255,255,0.25);color:#fff;font-weight:800;font-size:13px;display:flex;align-items:center;justify-content:center">${v.mark}</span>
                <span style="font-size:15px;font-weight:800;color:#fff;letter-spacing:.02em">${esc(r.verdict.label.toUpperCase())}</span>
              </div>
              <div style="margin-top:14px">${reasons}</div>
            </div>

            <div style="position:relative;width:150px;height:150px;flex-shrink:0">
              <svg width="150" height="150" viewBox="0 0 150 150">
                <defs>
                  <linearGradient id="gaugeGrad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stop-color="${v.g0}"/><stop offset="1" stop-color="${v.g1}"/>
                  </linearGradient>
                </defs>
                <circle cx="75" cy="75" r="${R}" fill="none" stroke="rgba(255,255,255,0.14)" stroke-width="14"/>
                <circle cx="75" cy="75" r="${R}" fill="none" stroke="url(#gaugeGrad)" stroke-width="14" stroke-linecap="round"
                  stroke-dasharray="${prog.toFixed(1)} ${circ.toFixed(1)}" transform="rotate(-90 75 75)"/>
              </svg>
              <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center">
                <div style="font-size:44px;font-weight:800;line-height:1;color:#fff">${score}</div>
                <div style="font-size:11px;color:#a5b4fc;margin-top:3px;letter-spacing:.1em">SCORE / 100</div>
              </div>
            </div>
          </div>

          <!-- glass stat chips -->
          <div style="display:flex;gap:12px;margin-top:22px">
            ${chip('PRICE', formatEur(apartment.purchasePrice))}
            ${chip('MONTHLY CASH FLOW', formatEur(r.monthlyCashFlowAfterLoan), cfPos ? '#86efac' : '#fca5a5')}
            ${chip('GROSS YIELD', formatPct(r.grossYieldPct))}
            ${chip('IRR · ' + p.holdingYears + 'Y', p.irrPct === null ? 'n/a' : formatPct(p.irrPct))}
          </div>
        </div>
      </div>

      <!-- ===== LIGHT SHEET ===== -->
      <div style="background:#f5f6fb;border-radius:26px 26px 0 0;margin-top:-30px;position:relative;padding:24px 24px 22px">

        <!-- KPI TILES -->
        <div style="display:flex;gap:14px">
          ${kpi(cfPos ? 'linear-gradient(135deg,#34d399,#059669)' : 'linear-gradient(135deg,#fb7185,#dc2626)', ICON.cash('#fff', 18), 'MONTHLY CASH FLOW', formatEur(r.monthlyCashFlowAfterLoan))}
          ${kpi('linear-gradient(135deg,#38bdf8,#0284c7)', ICON.percent('#fff', 18), 'GROSS YIELD', formatPct(r.grossYieldPct))}
          ${kpi('linear-gradient(135deg,#a78bfa,#7c3aed)', ICON.trend('#fff', 18), 'IRR · ' + p.holdingYears + 'Y', p.irrPct === null ? 'n/a' : formatPct(p.irrPct))}
          ${kpi(profitPos ? 'linear-gradient(135deg,#4ade80,#16a34a)' : 'linear-gradient(135deg,#fb7185,#dc2626)', ICON.trend('#fff', 18), 'PROFIT · ' + p.holdingYears + 'Y', formatEur(p.totalProfit))}
        </div>

        <!-- PROPERTY vs ETF -->
        <div style="background:#fff;border-radius:20px;box-shadow:0 12px 30px rgba(2,6,23,0.07);padding:20px 24px;margin-top:18px">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
            <div style="display:flex;align-items:center;gap:9px">
              <span style="width:28px;height:28px;border-radius:9px;background:#ede9fe;display:flex;align-items:center;justify-content:center">${ICON.scale('#7c3aed', 18)}</span>
              <span style="font-size:16px;font-weight:800;color:#0f172a">Property vs. ETF</span>
              <span style="font-weight:500;color:#94a3b8;font-size:12px">· same cash, ${p.holdingYears}-yr hold</span>
            </div>
            <span style="background:${flatWins ? 'linear-gradient(135deg,#22c55e,#15803d)' : 'linear-gradient(135deg,#fb7185,#be123c)'};color:#fff;font-weight:800;font-size:12px;padding:7px 14px;border-radius:999px;box-shadow:0 6px 14px rgba(2,6,23,0.15)">
              ${flatWins ? `Flat wins · +${esc(formatEur(etfDelta))}` : `ETF wins · +${esc(formatEur(-etfDelta))}`}
            </span>
          </div>
          ${bar('Buy the flat', p.buyEndWealth, maxWealth, 'linear-gradient(90deg,#34d399,#16a34a)', formatEur(p.buyEndWealth), flatWins ? 'WINNER' : undefined)}
          ${bar('Same cash in ETF (' + p.etfReturnPct + '%)', p.etfEndWealth, maxWealth, 'linear-gradient(90deg,#a78bfa,#7c3aed)', formatEur(p.etfEndWealth), flatWins ? undefined : 'WINNER')}
        </div>

        <!-- DETAIL GRID -->
        <div style="display:flex;gap:14px;margin-top:18px">
          <div style="flex:1;background:#fff;border-radius:18px;box-shadow:0 10px 24px rgba(2,6,23,0.05);padding:16px 18px">
            ${cardHead(ICON.home('#4f46e5', 16), 'THE PROPERTY', '#4f46e5', '#eef2ff')}
            ${rowsHtml(propertyRows)}
          </div>
          <div style="flex:1;background:#fff;border-radius:18px;box-shadow:0 10px 24px rgba(2,6,23,0.05);padding:16px 18px">
            ${cardHead(ICON.bank('#0284c7', 16), 'FINANCING', '#0284c7', '#e0f2fe')}
            ${rowsHtml(financeRows)}
          </div>
          <div style="flex:1;background:#fff;border-radius:18px;box-shadow:0 10px 24px rgba(2,6,23,0.05);padding:16px 18px">
            ${cardHead(ICON.trend('#16a34a', 16), 'RETURNS & MARKET', '#16a34a', '#dcfce7')}
            ${rowsHtml(returnRows)}
            <div style="margin-top:12px">
              <div style="display:flex;align-items:center;gap:6px;font-size:11px;font-weight:800;color:#94a3b8;margin-bottom:9px">
                ${ICON.pin('#94a3b8', 13)} LOCATION · ${r.benchmark.locationScore}/10
              </div>
              <div style="display:flex;gap:5px">${dots}</div>
            </div>
          </div>
        </div>

        <div style="text-align:center;color:#94a3b8;font-size:10.5px;margin-top:20px">
          Apartment Investment Analyzer &nbsp;·&nbsp; Estimates only — verify before deciding.${p.taxEnabled ? ' &nbsp;·&nbsp; Projection shown after German tax.' : ''}
        </div>
      </div>
    </div>`;
  return el;
}

/** Render a designed HTML report to a PDF and download it. */
export async function exportApartmentPdf(
  apartment: Apartment,
  loan: LoanParams,
  r: Results,
  p: Projection,
): Promise<void> {
  const el = buildReport(apartment, loan, r, p);
  document.body.appendChild(el);
  try {
    const canvas = await html2canvas(el, {
      scale: 2,
      backgroundColor: '#0b1020',
      useCORS: true,
      windowWidth: el.offsetWidth,
    });
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pw = pdf.internal.pageSize.getWidth();
    const ph = pdf.internal.pageSize.getHeight();
    const imgW = pw;
    const imgH = (canvas.height * imgW) / canvas.width;
    const img = canvas.toDataURL('image/jpeg', 0.95);

    let heightLeft = imgH;
    let position = 0;
    pdf.addImage(img, 'JPEG', 0, position, imgW, imgH);
    heightLeft -= ph;
    while (heightLeft > 0.5) {
      position -= ph;
      pdf.addPage();
      pdf.addImage(img, 'JPEG', 0, position, imgW, imgH);
      heightLeft -= ph;
    }

    const safe = (s: string) => s.replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '').slice(0, 40);
    const namePart = safe(apartment.title || apartment.areaLabel || 'apartment') || 'apartment';
    pdf.save(`${namePart}-analysis.pdf`);
  } finally {
    document.body.removeChild(el);
  }
}

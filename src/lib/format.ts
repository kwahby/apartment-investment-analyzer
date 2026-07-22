// The UI is in English, so use English-style separators (comma for thousands,
// dot for decimals) — e.g. €400,000 and €1,234.56 — rather than the German
// convention (€400.000 / €1.234,56), which English readers can misread.
const eur = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

const eur2 = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 2,
});

const num = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 0 });

// Groups thousands with commas while preserving any decimals (e.g. 250000 -> "250,000",
// 2.5 -> "2.5"). Used to make raw number inputs readable.
const group = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 20 });

export function formatEur(n: number): string {
  return eur.format(Number.isFinite(n) ? n : 0);
}

export function formatEur2(n: number): string {
  return eur2.format(Number.isFinite(n) ? n : 0);
}

export function formatNum(n: number): string {
  return num.format(Number.isFinite(n) ? n : 0);
}

export function formatGroup(n: number): string {
  return group.format(Number.isFinite(n) ? n : 0);
}

export function formatPct(n: number, digits = 1): string {
  const v = Number.isFinite(n) ? n : 0;
  return `${v.toFixed(digits)} %`;
}
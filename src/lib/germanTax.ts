// German income-tax (Einkommensteuer) helpers — a transparent approximation of the
// §32a EStG "Grundtarif" (2025 tariff), used to estimate the marginal tax rate that
// applies to rental income/losses. This is NOT a payroll calculator: it estimates the
// rate at which extra income (or a paper loss) is taxed, which is what matters for a
// buy-to-let. Always confirm with a Steuerberater.

/** 2025 basic tariff constants (§32a EStG). */
const GRUNDFREIBETRAG = 12096; // zone 1 ceiling — tax-free
const Z2_CEIL = 17443;
const Z3_CEIL = 68480;
const Z4_CEIL = 277825;

/** Income tax on a taxable income (zu versteuerndes Einkommen), single/Grundtarif. */
export function incomeTax(zvE: number): number {
  const x = Math.max(0, Math.floor(zvE));
  if (x <= GRUNDFREIBETRAG) return 0;
  if (x <= Z2_CEIL) {
    const y = (x - GRUNDFREIBETRAG) / 10000;
    return (932.3 * y + 1400) * y;
  }
  if (x <= Z3_CEIL) {
    const z = (x - Z2_CEIL) / 10000;
    return (176.64 * z + 2397) * z + 1015.13;
  }
  if (x <= Z4_CEIL) return 0.42 * x - 10911.92;
  return 0.45 * x - 19246.67;
}

/** Marginal income-tax rate (fraction 0..0.45) at a given taxable income, Grundtarif. */
export function marginalRate(zvE: number): number {
  const x = Math.max(0, zvE);
  if (x <= GRUNDFREIBETRAG) return 0;
  if (x <= Z2_CEIL) {
    const y = (x - GRUNDFREIBETRAG) / 10000;
    return (2 * 932.3 * y + 1400) / 10000;
  }
  if (x <= Z3_CEIL) {
    const z = (x - Z2_CEIL) / 10000;
    return (2 * 176.64 * z + 2397) / 10000;
  }
  if (x <= Z4_CEIL) return 0.42;
  return 0.45;
}

export type TaxClass = 1 | 2 | 3 | 4 | 5 | 6;

export interface MarginalEstimate {
  /** Estimated taxable income (zvE) used for the calculation, in EUR. */
  taxableIncome: number;
  /** Marginal income-tax rate as a percentage (before church tax). */
  incomeMarginalPct: number;
  /** Marginal rate including church tax, as a percentage. */
  effectivePct: number;
  /** True when jointly-assessed splitting was applied (married classes). */
  splitting: boolean;
}

/** Married classes are jointly assessed → Ehegattensplitting. */
function isSplitting(taxClass: TaxClass): boolean {
  return taxClass === 3 || taxClass === 4 || taxClass === 5;
}

/**
 * Estimate the marginal tax rate on additional rental income from gross salary,
 * tax class, children and church tax. The taxable income is approximated from
 * gross by removing the employee lump allowance and a rough estimate of
 * deductible insurance (Vorsorgeaufwendungen) and child allowances.
 */
export function estimateMarginalRate(params: {
  grossAnnualIncome: number;
  taxClass: TaxClass;
  children: number;
  churchTaxPct: number;
}): MarginalEstimate {
  const { grossAnnualIncome, taxClass, children, churchTaxPct } = params;
  const gross = Math.max(0, grossAnnualIncome);
  const splitting = isSplitting(taxClass);

  // Employee lump allowance (Werbungskostenpauschale 2025) + Sonderausgabenpauschbetrag.
  const werbungskosten = 1230 + 36;
  // Rough deductible insurance (pension + health/care) — approximation, capped.
  const vorsorge = Math.min(gross * 0.21, 12000);
  // Single-parent relief (Entlastungsbetrag) for class 2.
  const entlastung = taxClass === 2 ? 4260 : 0;
  // Child allowance (Kinderfreibetrag incl. BEA, 2025 ≈ €9,600 joint / €4,800 single) per child.
  const perChildAllowance = splitting ? 9600 : 4800;
  const childAllowance = Math.max(0, children) * perChildAllowance;

  const taxableIncome = Math.max(
    0,
    gross - werbungskosten - vorsorge - entlastung - childAllowance,
  );

  // For jointly-assessed couples the tariff is applied to half the (household) income,
  // so extra income is taxed at the rate at zvE/2.
  const rateBase = splitting ? taxableIncome / 2 : taxableIncome;
  const incomeMarginal = marginalRate(rateBase);

  const incomeMarginalPct = incomeMarginal * 100;
  const effectivePct = incomeMarginalPct * (1 + churchTaxPct / 100);

  return {
    taxableIncome: Math.round(taxableIncome),
    incomeMarginalPct: Math.round(incomeMarginalPct * 10) / 10,
    effectivePct: Math.round(effectivePct * 10) / 10,
    splitting,
  };
}

/**
 * Typical linear AfA depreciation rate (% per year) for a residential building by
 * completion year (§7 Abs. 4 EStG): pre-1925 buildings 2.5%, 1925–2022 2%, and
 * new builds from 2023 onwards 3%. Returns undefined when the year is unknown.
 */
export function afaRateForBuildYear(buildYear?: number): number | undefined {
  if (!buildYear || !Number.isFinite(buildYear)) return undefined;
  if (buildYear >= 2023) return 3;
  if (buildYear >= 1925) return 2;
  return 2.5;
}

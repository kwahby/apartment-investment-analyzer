import type { Apartment, CostSettings, LoanParams, ProjectionParams, Profile } from '../types';

/** Kaufnebenkosten / running cost defaults (typical German figures – adjust per Bundesland). */
export const DEFAULT_COST_SETTINGS: CostSettings = {
  transferTaxPct: 6, // Grunderwerbsteuer Hessen
  notaryPct: 1.5,
  landRegistryPct: 0.5,
  agentCommissionPct: 3.57, // typical buyer share incl. VAT
  maintenanceReservePctPerYear: 1, // % of purchase price per year
  maintenanceSqmPerYear: 12,       // €/m²/yr (typical German guideline 10-15)
  maintenanceMode: 'pct' as const,
  managementPerMonth: 30,
  vacancyPct: 3,
};

export const DEFAULT_LOAN: LoanParams = {
  downPayment: 100000,
  financeClosingCosts: false,
  annualInterestRatePct: 3.8,
  initialRepaymentPct: 2,
  fixedRatePeriodYears: 10,
  repaymentStrategy: 'followUp',
  followUpInterestRatePct: 4.5,
  annualExtraPayment: 0,
  targetPayoffYears: 15,
  forceTargetPayoff: false,
};

export const DEFAULT_APARTMENT: Apartment = {
  title: 'Sample listing',
  areaLabel: '',
  purchasePrice: 400000,
  sizeSqm: 70,
  balconySqm: 0,
  balconyWeightPct: 25,
  monthlyColdRent: 1300,
  hausgeld: 250,
  hausgeldRecoverableRatio: 0.6,
  hausgeldReserveMonthly: 0,
  buildYear: 1960,
  avgPricePerSqm: 3500,
  avgRentPerSqm: 0,
  locationScore: 5,
  renovationCost: 0,
  renovationValueAdd: 0,
};

export const DEFAULT_PROJECTION: ProjectionParams = {
  holdingYears: 12,
  annualAppreciationPct: 2,
  annualRentGrowthPct: 1.5,
  annualCostInflationPct: 2,
  sellingCostsPct: 2,
  taxEnabled: false,
  marginalTaxRatePct: 42,
  buildingSharePct: 70,
  afaRatePct: 2,
  sonderAfaEnabled: false,
  sonder7bEligibleAreaSqm: 0,
  sonder7bCostPerSqm: 0,
  etfReturnPct: 7,
};

export const DEFAULT_PROFILE: Profile = {
  netMonthlySalary: 3000,
  grossAnnualIncome: 60000,
  monthlyExpenses: 1800,
  savings: 120000,
  taxClass: 1,
  children: 0,
  churchTaxPct: 0,
};

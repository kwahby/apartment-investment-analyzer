// Core domain types for the apartment investment analyzer.

export interface Apartment {
  /** Free-form title/label for the listing (e.g. the portal headline). */
  title: string;
  /** Optional area / city / postal-code note for context (e.g. "Berlin 10115"). */
  areaLabel: string;
  /** Purchase price (Kaufpreis) in EUR. */
  purchasePrice: number;
  /** Living area in square meters (Wohnfläche). */
  sizeSqm: number;
  /** Balcony / terrace area in square meters (0 = none). */
  balconySqm?: number;
  /**
   * Share of the balcony area counted towards the effective living area for the
   * €/m² benchmark, in %. German Wohnflächenverordnung usually counts a balcony
   * at 25% (up to 50%). Defaults to 25 when omitted.
   */
  balconyWeightPct?: number;
  /** Expected monthly cold rent (Kaltmiete) in EUR. */
  monthlyColdRent: number;
  /** Total monthly Hausgeld (HOA fee) in EUR. */
  hausgeld: number;
  /** Share of Hausgeld that can be passed to the tenant (umlagefähig), 0..1. */
  hausgeldRecoverableRatio: number;
  /** Year the building was constructed (optional, used for context). */
  buildYear?: number;
  /** Reference average purchase price per m² for the area (manual benchmark). */
  avgPricePerSqm: number;
  /** Reference average cold rent per m² for the area (0 = unknown, skips the rent benchmark). */
  avgRentPerSqm: number;
  /** Subjective location desirability score 1..10. */
  locationScore: number;
  /** One-time upfront renovation / refurbishment cost (Modernisierung), in EUR. Paid in cash. */
  renovationCost?: number;
  /** Immediate value uplift the renovation is expected to add to the property, in EUR. */
  renovationValueAdd?: number;
}

export interface LoanParams {
  /** Down payment / equity (Eigenkapital) in EUR. */
  downPayment: number;
  /** Whether purchase costs (Kaufnebenkosten) are financed by the loan too. */
  financeClosingCosts: boolean;
  /** Nominal annual interest rate as a percentage, e.g. 3.8. */
  annualInterestRatePct: number;
  /** Initial annual repayment rate (anfängliche Tilgung) as a percentage, e.g. 2. */
  initialRepaymentPct: number;
  /** Length of the fixed-interest period (Zinsbindung) in years, e.g. 10. */
  fixedRatePeriodYears: number;
  /**
   * What interest rate applies AFTER the fixed-interest period. Both options size
   * the monthly payment from interest + initial Tilgung; they differ only here:
   * - 'payoffWithinFixed': assume the SAME rate for the whole loan (simple view,
   *   no refinancing shock).
   * - 'followUp': refinance the remaining Restschuld with a follow-up loan
   *   (Anschlussfinanzierung) at an assumed follow-up rate.
   */
  repaymentStrategy: 'payoffWithinFixed' | 'followUp';
  /** Assumed interest rate for the follow-up loan phase, in % (followUp only). */
  followUpInterestRatePct: number;
  /** Optional one-off extra repayment made once per year (Sondertilgung), in EUR. */
  annualExtraPayment: number;
  /** A target: fully repay the loan within this many years. */
  targetPayoffYears: number;
  /** When true, the monthly payment is auto-sized to hit the target exactly. */
  forceTargetPayoff: boolean;
}

/** Editable cost/tax assumptions for Kaufnebenkosten and running costs. */
export interface CostSettings {
  /** Grunderwerbsteuer (real estate transfer tax) %. Varies 3.5–6.5% by Bundesland. */
  transferTaxPct: number;
  /** Notary fees %. */
  notaryPct: number;
  /** Land registry (Grundbuch) fees %. */
  landRegistryPct: number;
  /** Buyer's estate agent commission (Maklerprovision) %. */
  agentCommissionPct: number;
  /** Annual maintenance reserve as % of purchase price (owner-side upkeep). */
  maintenanceReservePctPerYear: number;
  /** Property management cost per month in EUR (Verwaltung). */
  managementPerMonth: number;
  /** Assumed vacancy allowance as % of annual rent (Mietausfallwagnis). */
  vacancyPct: number;
}

export interface AmortizationPoint {
  year: number;
  /** Remaining loan balance at end of this year. */
  remainingBalance: number;
  /** Cumulative interest paid through this year. */
  cumulativeInterest: number;
  /** Cumulative principal repaid through this year. */
  cumulativePrincipal: number;
  /** Annual lump-sum (Sondertilgung) applied at the end of this year, in EUR. */
  lumpSum: number;
}

export interface Results {
  // Purchase & financing
  closingCosts: number;
  closingCostBreakdown: { label: string; amount: number }[];
  totalInvestment: number;
  loanAmount: number;
  cashInvested: number;

  // Mortgage
  monthlyAnnuity: number;
  payoffYears: number | null;
  payoffDateLabel: string;
  totalInterest: number;
  amortization: AmortizationPoint[];
  /**
   * Baseline amortization assuming NO annual lump sums (same payment/rate),
   * for the chart's "with vs. without extra payments" comparison. Empty when
   * no lump sum is set.
   */
  amortizationNoExtra: AmortizationPoint[];

  // Fixed-period / strategy
  fixedRatePeriodYears: number;
  repaymentStrategy: 'payoffWithinFixed' | 'followUp';
  /** Remaining loan balance at the end of the fixed-interest period. */
  restschuldAtFixedEnd: number;
  /** Interest paid during the fixed-interest period. */
  interestDuringFixed: number;
  /** The Tilgung % implied by the payment (useful in payoffWithinFixed mode). */
  impliedRepaymentPct: number;
  /** True when the fixed period fully repays the loan (nothing left to refinance). */
  fullyRepaidWithinFixed: boolean;
  /**
   * True when the assumed follow-up interest rate is so high that the scheduled
   * monthly payment no longer covers the first month's interest after the fixed
   * period ends — i.e. the loan balance would grow rather than shrink.
   */
  negativeAmortizationRisk: boolean;

  // Target payoff
  /** The user's target payoff period, in years. */
  targetPayoffYears: number;
  /** True when the payment is currently forced to hit the target. */
  targetForced: boolean;
  /** Monthly payment that would repay the loan in exactly the target years. */
  targetPayment: number;
  /** Starting Tilgung % implied by the target payment. */
  targetImpliedTilgungPct: number;
  /** True when the active plan repays within (≤) the target years. */
  meetsTarget: boolean;

  // Cash flow (monthly)
  effectiveMonthlyRent: number;
  nonRecoverableHausgeld: number;
  monthlyMaintenance: number;
  monthlyManagement: number;
  monthlyVacancyCost: number;
  monthlyOperatingCosts: number;
  monthlyCashFlowBeforeLoan: number;
  monthlyCashFlowAfterLoan: number;
  /** First-month interest portion of the fixed monthly annuity. */
  monthlyLoanInterest: number;
  /** First-month Tilgung (principal) portion of the fixed monthly annuity. */
  monthlyLoanPrincipal: number;

  // Cash-flow-positive timeline
  /** True when monthly cash flow is already positive while still paying the loan. */
  cashFlowPositiveFromStart: boolean;
  /** Years until monthly cash flow turns positive (0 = now, null = never at these numbers). */
  cashFlowPositiveYears: number | null;
  /** Human-readable label for when cash flow turns positive. */
  cashFlowPositiveLabel: string;
  /** Monthly cash left over once the loan is fully repaid (rent minus running costs). */
  monthlyIncomeAfterPayoff: number;
  /** Total out-of-pocket top-ups paid before cash flow turns positive (if applicable). */
  totalOutOfPocketUntilPositive: number;

  // Investment metrics
  grossYieldPct: number; // Bruttomietrendite
  netYieldPct: number; // Nettomietrendite
  priceToRentMultiple: number; // Kaufpreisfaktor
  cashOnCashPct: number;

  // Benchmark
  pricePerSqm: number;
  rentPerSqm: number;
  benchmark: {
    hasData: boolean;
    areaLabel: string;
    refBuyPerSqm: number;
    refRentPerSqm: number;
    hasRentRef: boolean;
    buyDeltaPct: number; // >0 = more expensive than the area average
    rentDeltaPct: number;
    locationScore: number;
    /** Effective area used for the €/m² benchmarks (living area + weighted balcony). */
    effectiveSqm: number;
    /** True when a balcony area is being counted towards the effective area. */
    includesBalcony: boolean;
    /** The balcony weighting applied, in % (for the explanatory note). */
    balconyWeightPct: number;
  };

  // Verdict
  verdict: {
    label: 'Buy' | 'Caution' | 'Avoid';
    score: number; // 0..100
    reasons: string[];
  };
}

/** Assumptions for the multi-year projection & after-tax analysis. */
export interface ProjectionParams {
  /** How many years you plan to hold the property before selling. */
  holdingYears: number;
  /** Assumed property value growth per year, in %. */
  annualAppreciationPct: number;
  /** Assumed rent growth per year, in %. */
  annualRentGrowthPct: number;
  /** Assumed inflation of running costs per year, in %. */
  annualCostInflationPct: number;
  /** Costs to sell (agent, notary, etc.) as % of the sale price. */
  sellingCostsPct: number;

  // After-tax modelling
  /** Turn the German income-tax view on/off. */
  taxEnabled: boolean;
  /** Your personal marginal income-tax rate, in %. */
  marginalTaxRatePct: number;
  /** Share of the purchase price that is the building (depreciable), in %. */
  buildingSharePct: number;
  /** Annual depreciation (AfA) rate on the building, in %. */
  afaRatePct: number;
  /**
   * Sonderabschreibung §7b: extra 5%/year of the building value for the first
   * 4 years (new-build rental meeting energy/cost rules), on top of regular AfA.
   */
  sonderAfaEnabled: boolean;
  /** Assumed annual return of an alternative ETF investment, in %. */
  etfReturnPct: number;
}

export interface ProjectionYear {
  year: number; // calendar year
  yearIndex: number; // 1..N
  propertyValue: number;
  remainingLoan: number;
  equity: number;
  grossRent: number;
  operatingCosts: number;
  interest: number;
  principal: number; // regular principal + any lump sums
  effectiveRent: number; // grossRent minus the vacancy allowance
  cashFlowPreTax: number;
  depreciation: number; // total AfA deducted this year (regular + Sonder-AfA)
  taxableIncome: number;
  tax: number; // + = you pay, − = tax saving
  cashFlowAfterTax: number;
  cumulativeCashFlow: number; // after tax if enabled, else pre-tax
}

export interface Projection {
  years: ProjectionYear[];
  holdingYears: number;
  taxEnabled: boolean;
  cashInvested: number;
  annualDepreciation: number;

  // Sale
  saleValue: number;
  sellingCosts: number;
  remainingLoanAtSale: number;
  accumulatedDepreciation: number;
  taxableGain: number;
  speculationTax: number;
  speculationTaxFree: boolean;
  netSaleProceeds: number;

  // Returns
  totalRentCashFlow: number; // sum of yearly cash flows over the hold
  totalProfit: number; // net gain incl. sale, minus cash invested
  moneyMultiple: number; // total cash returned / cash invested
  irrPct: number | null; // annualized internal rate of return

  // Property vs. ETF comparison
  etfReturnPct: number;
  /** Total cash you commit either way (down payment + top-ups). */
  totalCashCommitted: number;
  /** End-of-hold net worth from the property (sale proceeds + reinvested surpluses). */
  buyEndWealth: number;
  /** End-of-hold net worth if the same cash went into an ETF instead. */
  etfEndWealth: number;
}

/** A saved property deal — a named snapshot of all inputs, for save & compare. */
export interface SavedDeal {
  id: string;
  name: string;
  savedAt: number; // epoch ms
  apartment: Apartment;
  loan: LoanParams;
  costs: CostSettings;
  projection: ProjectionParams;
}

/** Personal finances used for the affordability & tax-impact view. */
export interface Profile {
  /** Net (take-home) monthly salary in EUR. */
  netMonthlySalary: number;
  /** Gross (pre-tax) annual salary in EUR — used to estimate the marginal tax rate. */
  grossAnnualIncome: number;
  /** Typical monthly living expenses in EUR (excluding this investment). */
  monthlyExpenses: number;
  /** Savings available for the purchase (down payment + costs) in EUR. */
  savings: number;
  /** German tax class (Steuerklasse) 1..6. */
  taxClass: 1 | 2 | 3 | 4 | 5 | 6;
  /** Number of children. */
  children: number;
  /** Church tax rate as % of income tax: 0 (none), 8 (BY/BW) or 9 (rest). */
  churchTaxPct: number;
}


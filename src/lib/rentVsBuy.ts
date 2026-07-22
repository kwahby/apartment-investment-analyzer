import type { Apartment, CostSettings, LoanParams, ProjectionParams } from '../types';
import { computeResults } from './finance';

const CURRENT_YEAR = new Date().getFullYear();
const round = (n: number) => Math.round(n);

export interface RentVsBuyResult {
  upfront: number;
  comparableRent: number;
  holdingYears: number;
  buyEndWealth: number;
  rentEndWealth: number;
  difference: number; // buy − rent (positive = buying wins)
  buyerWins: boolean;
  crossoverYear: number | null; // first calendar year buying is ahead
  year1BuyMonthly: number;
  year1RentMonthly: number;
  series: { year: number; Buy: number; Rent: number }[];
}

/**
 * Rent-vs-buy for living in the place yourself. Both households spend the same
 * on housing; the cheaper option each month invests the difference at the ETF
 * rate, and the renter also invests the down payment they never spent. End
 * wealth = the property equity at sale (buy) vs. the compounded ETF pot (rent).
 */
export function computeRentVsBuy(
  apartment: Apartment,
  loan: LoanParams,
  costs: CostSettings,
  projection: ProjectionParams,
  comparableRent: number,
): RentVsBuyResult {
  const res = computeResults(apartment, loan, costs);
  const holdingYears = Math.max(1, Math.round(projection.holdingYears));
  const appr = projection.annualAppreciationPct / 100;
  const rentG = projection.annualRentGrowthPct / 100;
  const costG = projection.annualCostInflationPct / 100;
  const etfM = projection.etfReturnPct / 100 / 12;
  const sellingPct = projection.sellingCostsPct / 100;

  const baseValue =
    Math.max(0, apartment.purchasePrice) + Math.max(0, apartment.renovationValueAdd ?? 0);
  const upfront = res.cashInvested;

  const balByYear = new Map<number, number>();
  for (const p of res.amortization) balByYear.set(p.year, p.remainingBalance);
  const balanceAt = (yr: number) => {
    const key = CURRENT_YEAR + yr;
    if (balByYear.has(key)) return balByYear.get(key)!;
    return res.payoffYears !== null && yr >= res.payoffYears ? 0 : res.loanAmount;
  };
  const payoffMonths = res.payoffYears !== null ? Math.round(res.payoffYears * 12) : Infinity;

  // Owner-side carrying cost (you live there → no management/vacancy, no rental income).
  const carryingBase = res.nonRecoverableHausgeld + res.monthlyMaintenance;

  let buyInvest = 0;
  let rentInvest = upfront;
  let year1BuyMonthly = 0;
  let year1RentMonthly = 0;
  const series: { year: number; Buy: number; Rent: number }[] = [];

  for (let m = 1; m <= holdingYears * 12; m++) {
    const yIdx = Math.floor((m - 1) / 12);
    const mortgage = m <= payoffMonths ? res.monthlyAnnuity : 0;
    const carrying = carryingBase * Math.pow(1 + costG, yIdx);
    const rent = comparableRent * Math.pow(1 + rentG, yIdx);
    const buyMonthly = mortgage + carrying;

    if (m === 1) {
      year1BuyMonthly = round(buyMonthly);
      year1RentMonthly = round(rent);
    }

    buyInvest *= 1 + etfM;
    rentInvest *= 1 + etfM;
    const diff = buyMonthly - rent;
    if (diff > 0) rentInvest += diff;
    else buyInvest += -diff;

    if (m % 12 === 0) {
      const yr = m / 12;
      const value = baseValue * Math.pow(1 + appr, yr);
      const equity = value * (1 - sellingPct) - balanceAt(yr);
      series.push({ year: CURRENT_YEAR + yr, Buy: round(equity + buyInvest), Rent: round(rentInvest) });
    }
  }

  const last = series[series.length - 1];
  const buyEndWealth = last.Buy;
  const rentEndWealth = last.Rent;
  const crossover = series.find((s) => s.Buy >= s.Rent);

  return {
    upfront: round(upfront),
    comparableRent: round(comparableRent),
    holdingYears,
    buyEndWealth,
    rentEndWealth,
    difference: buyEndWealth - rentEndWealth,
    buyerWins: buyEndWealth >= rentEndWealth,
    crossoverYear: crossover ? crossover.year : null,
    year1BuyMonthly,
    year1RentMonthly,
    series,
  };
}

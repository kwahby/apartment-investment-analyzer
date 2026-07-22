import type {
  Apartment,
  CostSettings,
  LoanParams,
  ProjectionParams,
} from '../types';
import { computeResults } from './finance';
import { computeProjection, firstYearMonthlyAfterTax } from './projection';

export interface ScenarioResult {
  key: 'cautious' | 'base' | 'optimistic';
  label: string;
  tone: 'bad' | 'neutral' | 'good';
  assumptions: string[];
  monthlyBeforeTax: number;
  monthlyAfterTax: number;
  totalOutOfPocketUntilPositive: number;
  cashFlowPositiveLabel: string;
  restschuldAtFixedEnd: number;
  fullyRepaidWithinFixed: boolean;
  irrPct: number | null;
  totalProfit: number;
  taxEnabled: boolean;
}

interface Deltas {
  rentAdjustPct: number; // % change to cold rent
  vacancyDeltaPp: number; // percentage points added to vacancy
  interestDeltaPp: number; // pp added to the loan interest rate
  followUpDeltaPp: number; // pp added to the follow-up rate
  appreciationDeltaPp: number; // pp added to appreciation
  rentGrowthDeltaPp: number; // pp added to rent growth
}

const SCENARIOS: {
  key: ScenarioResult['key'];
  label: string;
  tone: ScenarioResult['tone'];
  deltas: Deltas;
}[] = [
  {
    key: 'cautious',
    label: 'Cautious',
    tone: 'bad',
    deltas: {
      rentAdjustPct: -5,
      vacancyDeltaPp: 3,
      interestDeltaPp: 0.5,
      followUpDeltaPp: 2,
      appreciationDeltaPp: -2,
      rentGrowthDeltaPp: -1.5,
    },
  },
  {
    key: 'base',
    label: 'Base',
    tone: 'neutral',
    deltas: {
      rentAdjustPct: 0,
      vacancyDeltaPp: 0,
      interestDeltaPp: 0,
      followUpDeltaPp: 0,
      appreciationDeltaPp: 0,
      rentGrowthDeltaPp: 0,
    },
  },
  {
    key: 'optimistic',
    label: 'Optimistic',
    tone: 'good',
    deltas: {
      rentAdjustPct: 0,
      vacancyDeltaPp: -1,
      interestDeltaPp: -0.5,
      followUpDeltaPp: -1,
      appreciationDeltaPp: 1.5,
      rentGrowthDeltaPp: 1,
    },
  },
];

function describe(d: Deltas): string[] {
  const out: string[] = [];
  if (d.rentAdjustPct !== 0) out.push(`Rent ${d.rentAdjustPct > 0 ? '+' : ''}${d.rentAdjustPct}%`);
  if (d.vacancyDeltaPp !== 0) out.push(`Vacancy ${d.vacancyDeltaPp > 0 ? '+' : ''}${d.vacancyDeltaPp}pp`);
  if (d.interestDeltaPp !== 0) out.push(`Rate ${d.interestDeltaPp > 0 ? '+' : ''}${d.interestDeltaPp}pp`);
  if (d.followUpDeltaPp !== 0) out.push(`Follow-up ${d.followUpDeltaPp > 0 ? '+' : ''}${d.followUpDeltaPp}pp`);
  if (d.appreciationDeltaPp !== 0) out.push(`Value ${d.appreciationDeltaPp > 0 ? '+' : ''}${d.appreciationDeltaPp}pp/yr`);
  if (d.rentGrowthDeltaPp !== 0) out.push(`Rent growth ${d.rentGrowthDeltaPp > 0 ? '+' : ''}${d.rentGrowthDeltaPp}pp/yr`);
  if (out.length === 0) out.push('Your current assumptions, unchanged');
  return out;
}

/** Run the base, cautious and optimistic what-if scenarios. */
export function computeScenarios(
  apartment: Apartment,
  loan: LoanParams,
  costs: CostSettings,
  projection: ProjectionParams,
): ScenarioResult[] {
  return SCENARIOS.map(({ key, label, tone, deltas }) => {
    const apt: Apartment = {
      ...apartment,
      monthlyColdRent: Math.max(0, apartment.monthlyColdRent * (1 + deltas.rentAdjustPct / 100)),
    };
    const cst: CostSettings = {
      ...costs,
      vacancyPct: Math.max(0, costs.vacancyPct + deltas.vacancyDeltaPp),
    };
    const ln: LoanParams = {
      ...loan,
      annualInterestRatePct: Math.max(0, loan.annualInterestRatePct + deltas.interestDeltaPp),
      followUpInterestRatePct: Math.max(0, loan.followUpInterestRatePct + deltas.followUpDeltaPp),
    };
    const prj: ProjectionParams = {
      ...projection,
      annualAppreciationPct: projection.annualAppreciationPct + deltas.appreciationDeltaPp,
      annualRentGrowthPct: projection.annualRentGrowthPct + deltas.rentGrowthDeltaPp,
    };

    const res = computeResults(apt, ln, cst);
    const proj = computeProjection(apt, cst, res, prj);
    const { afterTax } = firstYearMonthlyAfterTax(apt, res, prj);

    return {
      key,
      label,
      tone,
      assumptions: describe(deltas),
      monthlyBeforeTax: res.monthlyCashFlowAfterLoan,
      monthlyAfterTax: afterTax,
      totalOutOfPocketUntilPositive: res.totalOutOfPocketUntilPositive,
      cashFlowPositiveLabel: res.cashFlowPositiveLabel,
      restschuldAtFixedEnd: res.restschuldAtFixedEnd,
      fullyRepaidWithinFixed: res.fullyRepaidWithinFixed,
      irrPct: proj.irrPct,
      totalProfit: proj.totalProfit,
      taxEnabled: projection.taxEnabled,
    };
  });
}

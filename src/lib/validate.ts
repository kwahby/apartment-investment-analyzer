import type { Apartment, CostSettings, LoanParams } from '../types';

/** Plain-language warnings for implausible or broken inputs. Empty = all good. */
export function validateInputs(
  apartment: Apartment,
  loan: LoanParams,
  costs: CostSettings,
): string[] {
  const w: string[] = [];

  if (apartment.purchasePrice <= 0) {
    w.push('Purchase price is 0 — enter a price to get meaningful results.');
  }
  if (apartment.sizeSqm <= 0) {
    w.push('Living area is 0 — price/m² and rent/m² can’t be calculated.');
  }
  if (apartment.monthlyColdRent <= 0) {
    w.push('Monthly cold rent is 0 — yields and cash flow will look far worse than reality.');
  }
  if (loan.downPayment > apartment.purchasePrice && apartment.purchasePrice > 0) {
    w.push('Down payment is larger than the purchase price — check the numbers.');
  }
  if (loan.downPayment <= 0) {
    w.push('No down payment (Eigenkapital) — a 100% loan is rare and high-risk.');
  }
  if (loan.annualInterestRatePct <= 0) {
    w.push('Interest rate is 0% — unrealistic for a real mortgage.');
  }
  if (loan.annualInterestRatePct > 12) {
    w.push('Interest rate above 12% looks unusually high — double-check it.');
  }
  if (
    loan.initialRepaymentPct <= 0 &&
    loan.annualExtraPayment <= 0 &&
    !loan.forceTargetPayoff
  ) {
    w.push('Initial repayment (Tilgung) is 0% — at this rate the loan would never be repaid.');
  }
  if (loan.fixedRatePeriodYears <= 0) {
    w.push('Fixed-rate period is 0 years — set at least 1.');
  }
  if (costs.vacancyPct > 30) {
    w.push('Vacancy allowance above 30% is extreme — check the value.');
  }

  return w;
}

export interface ScoreRange {
  min: number;
  max: number;
}

export const SCORE_CONFIG = {
  financial: {
    weights: {
      irr: 25,
      monthlyCashFlow: 25,
      netYield: 20,
      cashOnCash: 15,
      moneyMultiple: 10,
      grossYield: 5,
    },
    ranges: {
      irr: { min: 0, max: 10 },
      monthlyCashFlow: { min: -500, max: 250 },
      netYield: { min: 1.5, max: 5 },
      cashOnCash: { min: -8, max: 8 },
      moneyMultiple: { min: 0.8, max: 2.5 },
      grossYield: { min: 2, max: 6 },
    },
  },
  asset: {
    weights: {
      priceVsDistrict: 35,
      buildingAge: 20,
      location: 20,
      balcony: 10,
    },
    ranges: {
      priceVsDistrict: { min: -15, max: 20 },
      buildingAge: { min: 0, max: 100 },
      location: { min: 3, max: 9 },
    },
  },
  financing: {
    weights: {
      dscr: 35,
      ltv: 25,
      breakEvenRent: 20,
      refinancingCeiling: 15,
      monthlyDeficit: 5,
    },
    ranges: {
      dscr: { min: 0.7, max: 1.35 },
      ltv: { min: 60, max: 110 },
      breakEvenRentRatio: { min: 0.8, max: 1.35 },
      refinancingHeadroom: { min: -1, max: 3 },
      monthlyDeficit: { min: 0, max: 500 },
    },
  },
  wealth: {
    weights: {
      equityAtSale: 35,
      moneyMultiple: 20,
      loanReduction: 20,
      totalProfit: 15,
      saleValue: 10,
    },
    ranges: {
      equityToCash: { min: 0.75, max: 3 },
      moneyMultiple: { min: 0.8, max: 2.5 },
      loanReduction: { min: 0, max: 0.6 },
      profitToCash: { min: -0.25, max: 1.5 },
      saleValueGrowth: { min: 0, max: 0.5 },
    },
  },
  recommendation: {
    buy: {
      financialMin: 70,
      assetMin: 75,
      financingMin: 60,
      marginMin: 0,
    },
    negotiate: {
      financialMin: 50,
      assetMin: 75,
      marginMin: -10,
    },
    pass: {
      financialBelow: 50,
      financingBelow: 40,
      marginBelow: -10,
    },
  },
} as const;
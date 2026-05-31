export interface RealEstateState {
  propertyPrice: number;
  city: string;
  profile: "investment" | "single";
  rentingElsewhere: boolean;
  rentPaidMonthly: number;
  lawyerPct: number;
  hasBrokerage: boolean; brokeragePct: number;
  hasAppraiser: boolean; appraiserAmount: number;
  hasInspection: boolean; inspectionAmount: number;
  hasMortgageOpen: boolean; mortgageOpenAmount: number;
  hasMortgageAdvisor: boolean; mortgageAdvisorAmount: number;
  hasRenovation: boolean; renovationPct: number;
  mortgageRate: number;
  mortgageYears: number;
  monthlyRent: number;
  vacancyPct: number;
  rentGrowthPct: number;
  maintenancePct: number;
  condoFeeAnnual: number;
  buildingInsurance: number;
  lifeInsurance: number;
  taxTrack: "exempt" | "10pct" | "marginal";
  marginalRate: number;
  hasPropertyMgmt: boolean; propertyMgmtPct: number;
  inflationPct: number;
  pessimisticGrowth: number;
  realisticGrowth: number;
  optimisticGrowth: number;
  hasExitBrokerage: boolean; exitBrokeragePct: number;
  exitLawyerPct: number;
  hasEarlyRepayment: boolean; earlyRepaymentAmount: number;
}

export interface IndexState {
  selectedIndex: string;
  returnPct: number;
  dividendPct: number;
  drip: boolean;
  pessimisticOffset: number;
  optimisticOffset: number;
}

export interface ScenarioResult {
  pessimistic: number;
  realistic: number;
  optimistic: number;
}

export interface RealEstateResults {
  totalEquity: number;
  purchaseCosts: number;
  downPayment: number;
  mortgage: number;
  monthlyMortgagePayment: number;
  profile: "investment" | "single";
  scenarioCashflow: ScenarioResult;
  scenarioCapitalGain: ScenarioResult;
  scenarioTotalReturn: ScenarioResult;
  scenarioROEAnnual: ScenarioResult;
  yearlyData: YearlyData[];
}

export interface YearlyData {
  year: number;
  cashflow: number;
  propertyValue: number;
  mortgageBalance: number;
  interest: number;
}

export interface IndexResults {
  finalValue: number;
  totalReturn: number;
  netReturn: number;
  roeAnnual: number;
  yearlyValues: number[];
  scenarioROEAnnual: ScenarioResult;
  scenarioNetReturn: ScenarioResult;
}

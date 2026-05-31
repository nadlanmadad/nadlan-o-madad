import { useReducer, useMemo } from "react";
import type { RealEstateState, RealEstateResults } from "@/types";

const VAT = 1.17;

export const CITY_DEFAULTS: Record<string, number> = {
  "תל אביב": 5, "ירושלים": 4.5, "חיפה": 4, "באר שבע": 4.5,
  "נתניה": 4.5, "ראשון לציון": 4.5, "הרצליה": 4.5, "רמת גן": 4.5,
  "פתח תקווה": 4, "אחר": 4,
};

export const MADLAN_URLS: Record<string, string> = {
  "תל אביב": "https://www.madlan.co.il/area-info/%D7%AA%D7%9C-%D7%90%D7%91%D7%99%D7%91-%D7%99%D7%A4%D7%95-%D7%99%D7%A9%D7%A8%D7%90%D7%9C",
  "ירושלים": "https://www.madlan.co.il/area-info/%D7%99%D7%A8%D7%95%D7%A9%D7%9C%D7%99%D7%9D-%D7%99%D7%A9%D7%A8%D7%90%D7%9C",
  "חיפה": "https://www.madlan.co.il/area-info/%D7%97%D7%99%D7%A4%D7%94-%D7%99%D7%A9%D7%A8%D7%90%D7%9C",
  "באר שבע": "https://www.madlan.co.il/area-info/%D7%91%D7%90%D7%A8-%D7%A9%D7%91%D7%A2-%D7%99%D7%A9%D7%A8%D7%90%D7%9C",
  "נתניה": "https://www.madlan.co.il/area-info/%D7%A0%D7%AA%D7%A0%D7%99%D7%94-%D7%99%D7%A9%D7%A8%D7%90%D7%9C",
  "ראשון לציון": "https://www.madlan.co.il/area-info/%D7%A8%D7%90%D7%A9%D7%95%D7%9F-%D7%9C%D7%A6%D7%99%D7%95%D7%9F-%D7%99%D7%A9%D7%A8%D7%90%D7%9C",
  "הרצליה": "https://www.madlan.co.il/area-info/%D7%94%D7%A8%D7%A6%D7%9C%D7%99%D7%94-%D7%99%D7%A9%D7%A8%D7%90%D7%9C",
  "רמת גן": "https://www.madlan.co.il/area-info/%D7%A8%D7%9E%D7%AA-%D7%92%D7%9F-%D7%99%D7%A9%D7%A8%D7%90%D7%9C",
  "פתח תקווה": "https://www.madlan.co.il/area-info/%D7%A4%D7%AA%D7%97-%D7%AA%D7%A7%D7%95%D7%95%D7%94-%D7%99%D7%A9%D7%A8%D7%90%D7%9C",
  "אחר": "https://www.madlan.co.il/",
};

export function getMadlanUrl(city: string) { return MADLAN_URLS[city] || MADLAN_URLS["אחר"]; }

// אתר נדל"ן הממשלתי — עסקאות אמיתיות מרשות המיסים
export function getGovNadlanUrl(city: string) {
  return `https://www.nadlan.gov.il/?view=address&query=${encodeURIComponent(city)}`;
}

function calcPurchaseTax(price: number, profile: "investment" | "single"): number {
  if (profile === "investment") return price * 0.08;
  if (price <= 1846337) return 0;
  if (price <= 2190000) return (price - 1846337) * 0.035;
  if (price <= 5329131) return (2190000 - 1846337) * 0.035 + (price - 2190000) * 0.05;
  return (2190000 - 1846337) * 0.035 + (5329131 - 2190000) * 0.05 + (price - 5329131) * 0.08;
}

function calcMortgagePayment(principal: number, annualRate: number, years: number): number {
  const r = annualRate / 100 / 12;
  const n = years * 12;
  if (r === 0) return principal / n;
  return principal * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

function calcCAGR(totalReturn: number, equity: number, years: number): number {
  if (equity <= 0 || years <= 0) return 0;
  const ratio = 1 + totalReturn / equity;
  if (ratio <= 0) return -100;
  return (Math.pow(ratio, 1 / years) - 1) * 100;
}

export const DEFAULT_RE_STATE: RealEstateState = {
  propertyPrice: 1800000, city: "תל אביב", profile: "investment",
  rentingElsewhere: false, rentPaidMonthly: 0,
  lawyerPct: 0.75,
  hasBrokerage: true, brokeragePct: 1,
  hasAppraiser: true, appraiserAmount: 2000,
  hasInspection: true, inspectionAmount: 1500,
  hasMortgageOpen: true, mortgageOpenAmount: 2000,
  hasMortgageAdvisor: true, mortgageAdvisorAmount: 5000,
  hasRenovation: true, renovationPct: 7,
  mortgageRate: 4, mortgageYears: 25,
  monthlyRent: 5500, vacancyPct: 8, rentGrowthPct: 3,
  maintenancePct: 1, condoFeeAnnual: 3600,
  buildingInsurance: 1200, lifeInsurance: 1800,
  taxTrack: "exempt", marginalRate: 30,
  hasPropertyMgmt: false, propertyMgmtPct: 9,
  inflationPct: 3,
  pessimisticGrowth: 2, realisticGrowth: 5, optimisticGrowth: 8,
  hasExitBrokerage: true, exitBrokeragePct: 1,
  exitLawyerPct: 0.5,
  hasEarlyRepayment: false, earlyRepaymentAmount: 0,
};

type Action = { type: "SET"; field: keyof RealEstateState; value: any }
            | { type: "SET_CITY"; city: string }
            | { type: "LOAD"; state: RealEstateState };

function reducer(state: RealEstateState, action: Action): RealEstateState {
  if (action.type === "SET_CITY") {
    const r = CITY_DEFAULTS[action.city] ?? 4;
    return { ...state, city: action.city, realisticGrowth: r, pessimisticGrowth: Math.max(0, r - 3), optimisticGrowth: r + 3 };
  }
  if (action.type === "LOAD") return action.state;
  return { ...state, [action.field]: action.value };
}

export function useRealEstateCalc(equity: number, years: number) {
  const [state, dispatch] = useReducer(reducer, DEFAULT_RE_STATE);

  const results = useMemo((): RealEstateResults => {
    const s = state;
    const price = s.propertyPrice;
    const purchaseTax = calcPurchaseTax(price, s.profile);
    const lawyer = price * (s.lawyerPct / 100) * VAT;
    const brokerage = s.hasBrokerage ? price * (s.brokeragePct / 100) * VAT : 0;
    const appraiser = s.hasAppraiser ? s.appraiserAmount : 0;
    const inspection = s.hasInspection ? s.inspectionAmount : 0;
    const mortgageOpen = s.hasMortgageOpen ? s.mortgageOpenAmount : 0;
    const mortgageAdvisor = s.hasMortgageAdvisor ? s.mortgageAdvisorAmount : 0;
    const renovation = s.hasRenovation ? price * (s.renovationPct / 100) : 0;
    const purchaseCosts = purchaseTax + lawyer + brokerage + appraiser + inspection + mortgageOpen + mortgageAdvisor + renovation;
    const downPayment = Math.max(0, equity - purchaseCosts);
    const mortgage = Math.max(0, price - downPayment);
    const monthlyPayment = calcMortgagePayment(mortgage, s.mortgageRate, s.mortgageYears);

    function calcScenario(growthPct: number) {
      let balance = mortgage;
      let totalCashflow = 0;
      const yearly: any[] = [];
      const r = s.mortgageRate / 100 / 12;
      let remainingPayments = s.mortgageYears * 12;

      for (let yr = 1; yr <= years; yr++) {
        const annualRent = s.monthlyRent * 12 * Math.pow(1 + s.rentGrowthPct / 100, yr - 1);
        const effectiveRent = annualRent * (1 - s.vacancyPct / 100);
        let annualInterest = 0;
        for (let m = 0; m < 12; m++) {
          if (remainingPayments <= 0) break;
          const interestPmt = balance * r;
          const principalPmt = monthlyPayment - interestPmt;
          annualInterest += interestPmt;
          balance = Math.max(0, balance - principalPmt);
          remainingPayments--;
        }
        const inflation = Math.pow(1 + s.inflationPct / 100, yr - 1);
        const maintenance = price * (s.maintenancePct / 100) * inflation;
        const condo = s.condoFeeAnnual * inflation;
        const ins = (s.buildingInsurance + s.lifeInsurance) * inflation;
        const mgmt = s.hasPropertyMgmt ? effectiveRent * (s.propertyMgmtPct / 100) : 0;
        let rentalTax = 0;
        const EXEMPT_CEILING = 5470 * 12;
        if (s.taxTrack === "10pct") rentalTax = effectiveRent * 0.10;
        else if (s.taxTrack === "marginal") {
          let taxable = effectiveRent;
          if (s.profile === "single" && s.rentingElsewhere) taxable = Math.max(0, effectiveRent - s.rentPaidMonthly * 12);
          rentalTax = taxable * (s.marginalRate / 100);
        } else if (effectiveRent > EXEMPT_CEILING) rentalTax = (effectiveRent - EXEMPT_CEILING) * 0.10;
        const totalExpenses = annualInterest + maintenance + condo + ins + mgmt + rentalTax;
        const cashflow = effectiveRent - totalExpenses;
        totalCashflow += cashflow;
        yearly.push({ year: yr, cashflow, propertyValue: price * Math.pow(1 + growthPct / 100, yr), mortgageBalance: balance, interest: annualInterest });
      }

      const finalValue = price * Math.pow(1 + growthPct / 100, years);
      const grossGain = finalValue - price;
      const accDepreciation = price * 0.015 * years;
      const taxableGain = grossGain + accDepreciation;
      const exitBrokerageCost = s.hasExitBrokerage ? finalValue * (s.exitBrokeragePct / 100) * VAT : 0;
      const exitLawyer = finalValue * (s.exitLawyerPct / 100) * VAT;
      const earlyRepayment = s.hasEarlyRepayment ? s.earlyRepaymentAmount : 0;
      const capitalGainTax = s.profile === "investment" ? taxableGain * 0.25 : 0;
      const netCapitalGain = grossGain - capitalGainTax - exitBrokerageCost - exitLawyer - earlyRepayment;
      const totalReturn = totalCashflow + netCapitalGain;
      return { cashflow: totalCashflow, capitalGain: netCapitalGain, totalReturn, roeAnnual: calcCAGR(totalReturn, equity, years), yearly };
    }

    const pess = calcScenario(s.pessimisticGrowth);
    const real = calcScenario(s.realisticGrowth);
    const opt  = calcScenario(s.optimisticGrowth);

    return {
      totalEquity: equity, purchaseCosts, downPayment, mortgage,
      monthlyMortgagePayment: monthlyPayment, profile: s.profile,
      scenarioCashflow:    { pessimistic: pess.cashflow,     realistic: real.cashflow,     optimistic: opt.cashflow },
      scenarioCapitalGain: { pessimistic: pess.capitalGain,  realistic: real.capitalGain,  optimistic: opt.capitalGain },
      scenarioTotalReturn: { pessimistic: pess.totalReturn,  realistic: real.totalReturn,  optimistic: opt.totalReturn },
      scenarioROEAnnual:   { pessimistic: pess.roeAnnual,    realistic: real.roeAnnual,    optimistic: opt.roeAnnual },
      yearlyData: real.yearly,
    };
  }, [state, equity, years]);

  return { state, dispatch, results };
}

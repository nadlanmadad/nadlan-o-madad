import type {
  CashflowEntry,
  CommonAssumptions,
  MonthlyLedgerRow,
  RealEstateResult,
  RealEstateScenario,
} from '../../types';
import { buildSchedule, monthlyPayment } from '../mortgage/amortization';
import {
  TAX_RULES_2026,
  accumulatedDepreciation,
  calculatePurchaseTax,
  calculateRentalTax,
  calculateShevachTax,
} from '../tax/rules';

const VAT = 1 + TAX_RULES_2026.vatRate;

export function calculateAcquisitionCosts(
  scenario: RealEstateScenario,
): { purchaseTax: number; total: number; breakdown: Record<string, number> } {
  const price = scenario.purchasePrice;
  const a = scenario.acquisition;
  const purchaseTax = calculatePurchaseTax(price, scenario.tax.profile);
  const breakdown = {
    purchaseTax,
    lawyer: price * a.lawyerPct * VAT,
    brokerage: price * a.brokeragePct * VAT,
    appraiser: a.appraiser,
    inspection: a.inspection,
    mortgageOpen: a.mortgageOpen,
    mortgageAdvisor: a.mortgageAdvisor,
    renovation: price * a.renovationPct,
  };
  const total = Object.values(breakdown).reduce((s, v) => s + v, 0);
  return { purchaseTax, total, breakdown };
}

/**
 * מנוע הנדל"ן — פנקס חודשי מלא, לא רק הון סופי.
 * התזרים המוחזר הוא הבסיס גם ל-IRR וגם למנגנון השוואת ההון.
 */
export function calculateRealEstateInvestment(
  scenario: RealEstateScenario,
  common: CommonAssumptions,
): RealEstateResult {
  const months = Math.round(common.years * 12);
  const price = scenario.purchasePrice;

  const acq = calculateAcquisitionCosts(scenario);
  const equityForDownPayment = Math.max(0, common.initialCapital - acq.total);
  const downPayment = Math.min(equityForDownPayment, price);
  const excessCash = Math.max(0, equityForDownPayment - price);
  const principal = Math.max(0, price - downPayment);

  const pmt = monthlyPayment(principal, scenario.mortgage.annualRate, scenario.mortgage.termYears);
  const schedule = buildSchedule(
    principal,
    scenario.mortgage.annualRate,
    scenario.mortgage.termYears,
    months,
  );

  const monthlyInflation = Math.pow(1 + common.inflationRate, 1 / 12) - 1;
  const monthlyAppreciation = Math.pow(1 + scenario.appreciation.value, 1 / 12) - 1;
  const monthlyRentGrowth = Math.pow(1 + scenario.rent.annualGrowthRate, 1 / 12) - 1;

  const ledger: MonthlyLedgerRow[] = [];
  const cashflows: CashflowEntry[] = [
    { month: 0, amount: -common.initialCapital, label: 'הון עצמי ועלויות רכישה' },
  ];

  let totalNegative = 0;
  let totalPositive = 0;
  // צבירת שכר דירה שנתי לחישוב מס — המס מחושב על בסיס שנתי
  let rentAccumulatorYear = 0;

  for (let m = 1; m <= months; m++) {
    const inflationFactor = Math.pow(1 + monthlyInflation, m - 1);
    const propertyValue = price * Math.pow(1 + monthlyAppreciation, m);

    const rentGross = scenario.rent.monthlyRent * Math.pow(1 + monthlyRentGrowth, m - 1);
    const rentEffective = rentGross * (1 - scenario.rent.vacancyRate);
    rentAccumulatorYear += rentEffective;

    const row = schedule[m - 1];

    // תחזוקה נגזרת מהשווי המתעדכן, לא ממחיר הרכישה
    const maintenance = (propertyValue * scenario.expenses.maintenancePct) / 12;
    const condoFee = (scenario.expenses.condoFeeAnnual * inflationFactor) / 12;
    const insurance =
      ((scenario.expenses.buildingInsuranceAnnual + scenario.expenses.lifeInsuranceAnnual) *
        inflationFactor) /
      12;
    const management = scenario.expenses.hasManagement
      ? rentEffective * scenario.expenses.managementPct
      : 0;

    // מס שכר דירה נגבה פעם בשנה, בחודש ה-12 של כל שנה
    let rentalTax = 0;
    if (m % 12 === 0) {
      rentalTax = calculateRentalTax(rentAccumulatorYear, scenario.tax.rentalTrack, {
        marginalRate: scenario.tax.marginalRate,
        profile: scenario.tax.profile,
        rentPaidMonthly: scenario.tax.rentPaidMonthly,
      });
      rentAccumulatorYear = 0;
    }

    const netCashflow =
      rentEffective - row.payment - maintenance - condoFee - insurance - management - rentalTax;

    if (netCashflow < 0) totalNegative += -netCashflow;
    else totalPositive += netCashflow;

    ledger.push({
      month: m,
      rentGross,
      rentEffective,
      mortgagePayment: row.payment,
      interest: row.interest,
      principal: row.principal,
      mortgageBalance: row.balance,
      maintenance,
      condoFee,
      insurance,
      management,
      rentalTax,
      netCashflow,
      propertyValue,
    });

    cashflows.push({ month: m, amount: netCashflow, label: 'תזרים חודשי' });
  }

  // מכירה
  const salePrice = price * Math.pow(1 + scenario.appreciation.value, common.years);
  const sellingCosts =
    salePrice * scenario.exit.brokeragePct * VAT + salePrice * scenario.exit.lawyerPct * VAT;
  const remainingMortgage = months > 0 ? schedule[months - 1].balance : principal;

  const depreciation = scenario.tax.addDepreciationToGain
    ? accumulatedDepreciation(price, common.years)
    : 0;

  const shevach = calculateShevachTax({
    salePrice,
    sellingCosts,
    purchasePrice: price,
    acquisitionCosts: acq.total - acq.purchaseTax + acq.purchaseTax,
    improvements: 0,
    accumulatedDepreciation: depreciation,
    years: common.years,
    annualInflation: common.inflationRate,
    exempt: scenario.tax.profile === 'single' && scenario.tax.assumeShevachExemption,
  });

  const netSaleProceeds = salePrice - sellingCosts - remainingMortgage - shevach.tax;
  cashflows.push({ month: months, amount: netSaleProceeds, label: 'תמורת מכירה נטו' });

  return {
    purchaseTax: acq.purchaseTax,
    acquisitionCostsTotal: acq.total,
    downPayment,
    mortgagePrincipal: principal,
    monthlyPayment: pmt,
    excessCash,
    ledger,
    cashflows,
    totalNegativeCashflow: totalNegative,
    totalPositiveCashflow: totalPositive,
    salePrice,
    sellingCosts,
    remainingMortgage,
    shevachTax: shevach.tax,
    netSaleProceeds,
    finalNetWealth: netSaleProceeds,
  };
}

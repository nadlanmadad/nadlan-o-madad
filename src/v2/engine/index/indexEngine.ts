import type {
  CashflowEntry,
  CommonAssumptions,
  Contribution,
  IndexResult,
  IndexScenario,
} from '../../types';
import { calculateRealCapitalGainsTax } from '../tax/rules';

/**
 * מנוע המדד.
 *
 * שני תיקונים מהותיים מול הגרסה הקודמת:
 * 1. returnType מפורש — אין הוספת דיבידנד על תשואה שכבר כוללת אותו.
 * 2. מס רווח הון על הרווח הריאלי, עם הצמדה של כל הפקדה לפי מועדה.
 */
export function calculateIndexInvestment(
  scenario: IndexScenario,
  common: CommonAssumptions,
  contributions: Contribution[] = [],
): IndexResult {
  const months = Math.round(common.years * 12);

  // המרת שיעורים שנתיים לחודשיים בריבית דריבית
  // הפרדת הדיבידנד מהתשואה הכוללת היא חילוק, לא חיסור:
  // (1 + מחיר) × (1 + דיבידנד) = (1 + כוללת)
  const priceRateAnnual =
    scenario.returnType === 'total-return'
      ? (1 + scenario.annualReturn) / (1 + scenario.dividendYield) - 1
      : scenario.annualReturn;

  const monthlyPriceRate = Math.pow(1 + priceRateAnnual, 1 / 12) - 1;
  const monthlyDividendRate = Math.pow(1 + scenario.dividendYield, 1 / 12) - 1;
  const monthlyFeeRate = Math.pow(1 + scenario.managementFeeRate, 1 / 12) - 1;

  let value = common.initialCapital;
  const costLots: { month: number; amount: number }[] = [
    { month: 0, amount: common.initialCapital },
  ];
  const cashflows: CashflowEntry[] = [
    { month: 0, amount: -common.initialCapital, label: 'הון התחלתי' },
  ];
  const monthlyValues: number[] = [value];

  const contributionsByMonth = new Map<number, number>();
  for (const c of contributions) {
    contributionsByMonth.set(c.month, (contributionsByMonth.get(c.month) ?? 0) + c.amount);
  }

  let dividendTaxPaid = 0;
  let managementFeesPaid = 0;

  for (let m = 1; m <= months; m++) {
    // הפקדה בתחילת החודש
    const contribution = contributionsByMonth.get(m) ?? 0;
    if (contribution > 0) {
      value += contribution;
      costLots.push({ month: m, amount: contribution });
      cashflows.push({ month: m, amount: -contribution, label: 'הפקדה' });
    }

    // עליית מחיר
    value *= 1 + monthlyPriceRate;

    // דיבידנד — מחושב בנפרד תמיד, אחרי שהופרד מהתשואה הכוללת
    if (scenario.dividendYield > 0) {
      const grossDividend = value * monthlyDividendRate;
      const tax = grossDividend * scenario.dividendTaxRate;
      dividendTaxPaid += tax;
      const netDividend = grossDividend - tax;

      if (scenario.reinvestDividends) {
        // דיבידנד נטו שהושקע מחדש מגדיל את בסיס העלות
        value += netDividend;
        costLots.push({ month: m, amount: netDividend });
      } else {
        cashflows.push({ month: m, amount: netDividend, label: 'דיבידנד נטו' });
      }
    }

    // דמי ניהול
    if (monthlyFeeRate > 0) {
      const fee = value * monthlyFeeRate;
      managementFeesPaid += fee;
      value -= fee;
    }

    monthlyValues.push(value);
  }

  const { indexedBasis, realGain, tax } = calculateRealCapitalGainsTax(
    value,
    costLots,
    months,
    common.inflationRate,
    scenario.capitalGainsTaxRate,
  );

  const finalNetWealth = value - tax;
  cashflows.push({ month: months, amount: finalNetWealth, label: 'מימוש התיק' });

  return {
    finalGrossValue: value,
    nominalCostBasis: costLots.reduce((s, l) => s + l.amount, 0),
    indexedCostBasis: indexedBasis,
    realGain,
    capitalGainsTax: tax,
    dividendTaxPaid,
    managementFeesPaid,
    finalNetWealth,
    cashflows,
    monthlyValues,
  };
}

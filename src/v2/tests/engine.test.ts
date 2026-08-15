import { describe, expect, it } from 'vitest';
import { calculateIndexInvestment } from '../engine/index/indexEngine';
import { calculateRealEstateInvestment } from '../engine/realEstate/realEstateEngine';
import { compareInvestments } from '../engine/comparison/compare';
import { calculateCAGR, calculateIRR, countSignChanges } from '../engine/solver/irr';
import { bisect } from '../engine/solver/bisection';
import { buildSchedule, monthlyPayment } from '../engine/mortgage/amortization';
import {
  calculatePurchaseTax,
  calculateRealCapitalGainsTax,
  calculateRentalTax,
} from '../engine/tax/rules';
import {
  DEFAULT_COMMON,
  DEFAULT_INDEX,
  DEFAULT_REAL_ESTATE,
} from '../data/defaults';
import type { CommonAssumptions, IndexScenario } from '../types';

// ═══════════════════════ מנוע המדד ═══════════════════════

describe('מנוע המדד', () => {
  const common: CommonAssumptions = {
    years: 20,
    inflationRate: 0,
    initialCapital: 100_000,
  };

  it('תשואה כוללת אינה סופרת דיבידנד פעמיים', () => {
    const totalReturn: IndexScenario = {
      ...DEFAULT_INDEX,
      annualReturn: 0.1,
      dividendYield: 0.02,
      returnType: 'total-return',
      capitalGainsTaxRate: 0,
      dividendTaxRate: 0,
      managementFeeRate: 0,
    };
    const r = calculateIndexInvestment(totalReturn, common);
    // 10% כולל — לא 12%
    expect(r.finalGrossValue).toBeCloseTo(100_000 * Math.pow(1.1, 20), -1);
  });

  it('תשואת מחיר מוסיפה את הדיבידנד בנפרד', () => {
    const priceReturn: IndexScenario = {
      ...DEFAULT_INDEX,
      annualReturn: 0.08,
      dividendYield: 0.02,
      returnType: 'price-return',
      capitalGainsTaxRate: 0,
      dividendTaxRate: 0,
      managementFeeRate: 0,
      reinvestDividends: true,
    };
    const r = calculateIndexInvestment(priceReturn, common);
    // תשואת מחיר 8% + דיבידנד 2% ≈ 10% כולל
    expect(r.finalGrossValue).toBeGreaterThan(100_000 * Math.pow(1.09, 20));
    expect(r.finalGrossValue).toBeLessThan(100_000 * Math.pow(1.105, 20));
  });

  it('מס רווח הון מחושב על הרווח ולא על התיק', () => {
    const s: IndexScenario = {
      ...DEFAULT_INDEX,
      annualReturn: 0.1,
      dividendYield: 0,
      capitalGainsTaxRate: 0.25,
      managementFeeRate: 0,
    };
    const r = calculateIndexInvestment(s, common);
    const gain = r.finalGrossValue - 100_000;
    expect(r.capitalGainsTax).toBeCloseTo(gain * 0.25, 0);
    expect(r.capitalGainsTax).toBeLessThan(r.finalGrossValue * 0.25);
  });

  it('אינפלציה השווה לתשואה מאפסת את המס הריאלי', () => {
    const s: IndexScenario = {
      ...DEFAULT_INDEX,
      annualReturn: 0.03,
      dividendYield: 0,
      capitalGainsTaxRate: 0.25,
      managementFeeRate: 0,
    };
    const r = calculateIndexInvestment(s, {
      years: 20,
      inflationRate: 0.03,
      initialCapital: 100_000,
    });
    expect(r.capitalGainsTax).toBeCloseTo(0, 2);
    expect(r.realGain).toBeCloseTo(0, 2);
  });

  it('מס ריאלי נמוך ממס נומינלי כשיש אינפלציה', () => {
    const s: IndexScenario = {
      ...DEFAULT_INDEX,
      annualReturn: 0.08,
      dividendYield: 0,
      capitalGainsTaxRate: 0.25,
      managementFeeRate: 0,
    };
    const real = calculateIndexInvestment(s, {
      years: 20,
      inflationRate: 0.03,
      initialCapital: 100_000,
    });
    const nominal = calculateIndexInvestment(s, {
      years: 20,
      inflationRate: 0,
      initialCapital: 100_000,
    });
    expect(real.capitalGainsTax).toBeLessThan(nominal.capitalGainsTax);
    expect(real.finalNetWealth).toBeGreaterThan(nominal.finalNetWealth);
  });

  it('הפקדות מגדילות את בסיס העלות לפי מועדן', () => {
    const s: IndexScenario = {
      ...DEFAULT_INDEX,
      annualReturn: 0.08,
      dividendYield: 0,
      capitalGainsTaxRate: 0.25,
      managementFeeRate: 0,
    };
    const contributions = Array.from({ length: 240 }, (_, i) => ({
      month: i + 1,
      amount: 1_000,
    }));
    const r = calculateIndexInvestment(s, common, contributions);
    expect(r.nominalCostBasis).toBeCloseTo(100_000 + 240_000, 0);
  });

  it('דיבידנד ללא השקעה מחדש יוצא כתזרים ולא מנופח בתיק', () => {
    const base: IndexScenario = {
      ...DEFAULT_INDEX,
      annualReturn: 0.1,
      dividendYield: 0.02,
      returnType: 'price-return',
      capitalGainsTaxRate: 0,
      dividendTaxRate: 0.25,
      managementFeeRate: 0,
    };
    const drip = calculateIndexInvestment({ ...base, reinvestDividends: true }, common);
    const noDrip = calculateIndexInvestment({ ...base, reinvestDividends: false }, common);
    expect(drip.finalGrossValue).toBeGreaterThan(noDrip.finalGrossValue);
    expect(noDrip.cashflows.filter((c) => c.label === 'דיבידנד נטו').length).toBe(240);
  });

  it('דמי ניהול מקטינים את התשואה', () => {
    const withFee = calculateIndexInvestment(
      { ...DEFAULT_INDEX, managementFeeRate: 0.01, dividendYield: 0 },
      common,
    );
    const noFee = calculateIndexInvestment(
      { ...DEFAULT_INDEX, managementFeeRate: 0, dividendYield: 0 },
      common,
    );
    expect(withFee.finalGrossValue).toBeLessThan(noFee.finalGrossValue);
    expect(withFee.managementFeesPaid).toBeGreaterThan(0);
  });
});

// ═══════════════════════ משכנתה ═══════════════════════

describe('לוח סילוקין', () => {
  it('סכום הקרן שווה לסכום ההלוואה', () => {
    const schedule = buildSchedule(1_000_000, 0.04, 25, 300);
    const totalPrincipal = schedule.reduce((s, r) => s + r.principal, 0);
    expect(totalPrincipal).toBeCloseTo(1_000_000, 0);
    expect(schedule[299].balance).toBeCloseTo(0, 2);
  });

  it('תשלום חודשי מול ערך ייחוס ידוע', () => {
    // 1,000,000 ב-5% ל-30 שנה = 5,368.22
    expect(monthlyPayment(1_000_000, 0.05, 30)).toBeCloseTo(5368.22, 1);
  });

  it('היתרה יורדת מונוטונית', () => {
    const schedule = buildSchedule(1_000_000, 0.04, 25, 300);
    for (let i = 1; i < schedule.length; i++) {
      expect(schedule[i].balance).toBeLessThanOrEqual(schedule[i - 1].balance + 1e-6);
    }
  });
});

// ═══════════════════════ מס ═══════════════════════

describe('מס', () => {
  it('מס רכישה — דירה יחידה מתחת למדרגה הראשונה', () => {
    expect(calculatePurchaseTax(1_900_000, 'single')).toBe(0);
  });

  it('מס רכישה — דירת השקעה 8% מהשקל הראשון', () => {
    expect(calculatePurchaseTax(2_000_000, 'investment')).toBeCloseTo(160_000, 0);
  });

  it('מס רכישה — רציפות בגבול המדרגה', () => {
    const below = calculatePurchaseTax(6_055_069, 'investment');
    const above = calculatePurchaseTax(6_055_071, 'investment');
    expect(above - below).toBeLessThan(1);
  });

  it('מסלול הפטור ממסה רק את החלק שמעל התקרה', () => {
    const ceiling = 5_654 * 12;
    expect(
      calculateRentalTax(ceiling, 'exempt', {
        marginalRate: 0.3,
        profile: 'investment',
        rentPaidMonthly: 0,
      }),
    ).toBe(0);
    expect(
      calculateRentalTax(ceiling + 10_000, 'exempt', {
        marginalRate: 0.3,
        profile: 'investment',
        rentPaidMonthly: 0,
      }),
    ).toBeCloseTo(1_000, 0);
  });

  it('רווח ריאלי שלילי אינו מייצר מס שלילי', () => {
    const r = calculateRealCapitalGainsTax(
      100_000,
      [{ month: 0, amount: 100_000 }],
      240,
      0.03,
      0.25,
    );
    expect(r.tax).toBe(0);
    expect(r.realGain).toBeLessThan(0);
  });
});

// ═══════════════════════ תשואה פנימית ═══════════════════════

describe('תשואה פנימית', () => {
  it('ערך ייחוס ידוע', () => {
    // [-1000, 500, 500, 500] → 23.375%
    const flows = [
      { month: 0, amount: -1000, label: '' },
      { month: 1, amount: 500, label: '' },
      { month: 2, amount: 500, label: '' },
      { month: 3, amount: 500, label: '' },
    ];
    const r = calculateIRR(flows);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.monthly).toBeCloseTo(0.23375, 4);
  });

  it('תזרים ללא החלפת סימן מחזיר כישלון מפורש', () => {
    const r = calculateIRR([
      { month: 0, amount: -1000, label: '' },
      { month: 1, amount: -500, label: '' },
    ]);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('no-sign-change');
  });

  it('שתי החלפות סימן מחזירות multiple-roots ולא מספר', () => {
    const r = calculateIRR([
      { month: 0, amount: -1000, label: '' },
      { month: 1, amount: 3000, label: '' },
      { month: 2, amount: -2500, label: '' },
    ]);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('multiple-roots');
  });

  it('ספירת החלפות סימן', () => {
    expect(countSignChanges([-1, 1, 1, 1])).toBe(1);
    expect(countSignChanges([-1, 1, -1, 1])).toBe(3);
    expect(countSignChanges([-1, 0, -1])).toBe(0);
  });

  it('CAGR מתנהג כצפוי', () => {
    expect(calculateCAGR(200, 100, 10)).toBeCloseTo(Math.pow(2, 0.1) - 1, 6);
  });
});

// ═══════════════════════ פותר ═══════════════════════

describe('פותר נומרי', () => {
  it('מוצא שורש פשוט', () => {
    const r = bisect((x) => x * x - 4, 0, 10);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toBeCloseTo(2, 6);
  });

  it('מחזיר כישלון כשאין החלפת סימן', () => {
    const r = bisect((x) => x * x + 1, 0, 10, { allowExpand: false });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('no-bracket');
  });
});

// ═══════════════════════ נדל"ן ═══════════════════════

describe('מנוע הנדל"ן', () => {
  it('הפנקס מכיל שורה לכל חודש', () => {
    const r = calculateRealEstateInvestment(DEFAULT_REAL_ESTATE, DEFAULT_COMMON);
    expect(r.ledger.length).toBe(240);
  });

  it('תחזוקה נגזרת מהשווי המתעדכן ולא ממחיר הרכישה', () => {
    const r = calculateRealEstateInvestment(DEFAULT_REAL_ESTATE, DEFAULT_COMMON);
    expect(r.ledger[239].maintenance).toBeGreaterThan(r.ledger[0].maintenance);
  });

  it('שכר הדירה גדל לאורך התקופה', () => {
    const r = calculateRealEstateInvestment(DEFAULT_REAL_ESTATE, DEFAULT_COMMON);
    expect(r.ledger[239].rentGross).toBeGreaterThan(r.ledger[0].rentGross * 1.7);
  });

  it('מס שכר דירה נגבה פעם בשנה', () => {
    const withTax = {
      ...DEFAULT_REAL_ESTATE,
      rent: { ...DEFAULT_REAL_ESTATE.rent, monthlyRent: 9_000 },
    };
    const r = calculateRealEstateInvestment(withTax, DEFAULT_COMMON);
    const taxMonths = r.ledger.filter((row) => row.rentalTax > 0);
    expect(taxMonths.length).toBe(20);
    expect(taxMonths.every((row) => row.month % 12 === 0)).toBe(true);
  });

  it('יתרת המשכנתה בסוף התקופה קטנה מהקרן', () => {
    const r = calculateRealEstateInvestment(DEFAULT_REAL_ESTATE, DEFAULT_COMMON);
    expect(r.remainingMortgage).toBeGreaterThan(0);
    expect(r.remainingMortgage).toBeLessThan(r.mortgagePrincipal);
  });
});

// ═══════════════════════ השוואה — הבדיקה החשובה ═══════════════════════

describe('השוואת הון', () => {
  const input = {
    common: DEFAULT_COMMON,
    realEstate: DEFAULT_REAL_ESTATE,
    index: DEFAULT_INDEX,
    reinvestPositiveCashflow: true,
  };

  it('שני המסלולים מקבלים בדיוק את אותו סך מזומן', () => {
    const r = compareInvestments(input);
    expect(r.realEstate.totalCashInvested).toBeCloseTo(r.index.totalCashInvested, 2);
  });

  it('סך המזומן גדול מההון ההתחלתי כשהתזרים שלילי', () => {
    const r = compareInvestments(input);
    if (r.realEstate.result.totalNegativeCashflow > 0) {
      expect(r.realEstate.totalCashInvested).toBeGreaterThan(
        DEFAULT_COMMON.initialCapital,
      );
    }
  });

  it('שתי התשואות הפנימיות ניתנות לחישוב', () => {
    const r = compareInvestments(input);
    expect(r.realEstate.irr.ok).toBe(true);
    expect(r.index.irr.ok).toBe(true);
  });

  it('נקודת האיזון בעליית ערך מייצרת שוויון כשמזינים אותה חזרה', () => {
    const r = compareInvestments(input);
    expect(r.breakEven.appreciation.ok).toBe(true);
    if (r.breakEven.appreciation.ok) {
      const solved = r.breakEven.appreciation.value;
      const check = compareInvestments({
        ...input,
        realEstate: {
          ...DEFAULT_REAL_ESTATE,
          appreciation: { ...DEFAULT_REAL_ESTATE.appreciation, value: solved },
        },
      });
      expect(check.realEstate.irr.ok && check.index.irr.ok).toBe(true);
      if (check.realEstate.irr.ok && check.index.irr.ok) {
        expect(check.realEstate.irr.annual).toBeCloseTo(check.index.irr.annual, 4);
      }
    }
  });

  it('עליית ערך גבוהה יותר מטיבה עם הנדל"ן', () => {
    const low = compareInvestments({
      ...input,
      realEstate: {
        ...DEFAULT_REAL_ESTATE,
        appreciation: { ...DEFAULT_REAL_ESTATE.appreciation, value: 0.01 },
      },
    });
    const high = compareInvestments({
      ...input,
      realEstate: {
        ...DEFAULT_REAL_ESTATE,
        appreciation: { ...DEFAULT_REAL_ESTATE.appreciation, value: 0.09 },
      },
    });
    expect(high.realEstate.finalNetWealth).toBeGreaterThan(low.realEstate.finalNetWealth);
  });

  it('תרחיש A — נדל"ן חזק', () => {
    const r = compareInvestments({
      ...input,
      realEstate: {
        ...DEFAULT_REAL_ESTATE,
        appreciation: { ...DEFAULT_REAL_ESTATE.appreciation, value: 0.075 },
        rent: { ...DEFAULT_REAL_ESTATE.rent, monthlyRent: 7_500 },
      },
      index: { ...DEFAULT_INDEX, annualReturn: 0.06 },
    });
    expect(r.winner).toBe('real-estate');
  });

  it('תרחיש B — מדד חזק', () => {
    const r = compareInvestments({
      ...input,
      realEstate: {
        ...DEFAULT_REAL_ESTATE,
        appreciation: { ...DEFAULT_REAL_ESTATE.appreciation, value: 0.02 },
        rent: { ...DEFAULT_REAL_ESTATE.rent, monthlyRent: 4_500 },
      },
      index: { ...DEFAULT_INDEX, annualReturn: 0.11 },
    });
    expect(r.winner).toBe('index');
  });
});

import type {
  CashflowEntry,
  ComparisonInput,
  ComparisonResult,
  Contribution,
  SolverOutcome,
} from '../../types';
import { calculateIndexInvestment } from '../index/indexEngine';
import { calculateRealEstateInvestment } from '../realEstate/realEstateEngine';
import { calculateCAGR, calculateIRR } from '../solver/irr';
import { bisect } from '../solver/bisection';

/**
 * מנוע ההשוואה.
 *
 * העיקרון המרכזי: שני המסלולים מקבלים את אותו סך מזומן.
 * כל חודש שבו הנכס דורש הזרמה מהכיס — אותו סכום בדיוק מופקד לתיק המדד.
 * בלי זה הנדל"ן מקבל הון חינם וההשוואה חסרת ערך.
 */
export function compareInvestments(input: ComparisonInput): ComparisonResult {
  const { common, realEstate, index } = input;
  const months = Math.round(common.years * 12);

  const reResult = calculateRealEstateInvestment(realEstate, common);

  // ── שלב 1: גזירת ההפקדות לתיק המדד מהתזרים השלילי של הנכס ──
  const contributions: Contribution[] = [];
  const positiveFlows: Contribution[] = [];

  for (const row of reResult.ledger) {
    if (row.netCashflow < 0) {
      contributions.push({ month: row.month, amount: -row.netCashflow });
    } else if (row.netCashflow > 0) {
      positiveFlows.push({ month: row.month, amount: row.netCashflow });
    }
  }

  // ── שלב 2: תיק צדדי לנדל"ן מהתזרים החיובי ──
  let sidePortfolio = 0;
  if (input.reinvestPositiveCashflow && positiveFlows.length > 0) {
    const side = calculateIndexInvestment(
      index,
      { ...common, initialCapital: 0 },
      positiveFlows,
    );
    sidePortfolio = side.finalNetWealth;
  } else {
    sidePortfolio = positiveFlows.reduce((s, f) => s + f.amount, 0);
  }

  // ── שלב 3: המדד, עם ההפקדות ──
  const idxResult = calculateIndexInvestment(index, common, contributions);

  // ── שלב 4: תזרימים ל-IRR ──
  // תזרים חיובי שהושקע מחדש אינו זורם למשקיע — הוא נספר בשווי הסופי.
  const reFlows: CashflowEntry[] = [
    { month: 0, amount: -common.initialCapital, label: 'הון התחלתי' },
  ];
  for (const row of reResult.ledger) {
    if (row.netCashflow < 0) {
      reFlows.push({ month: row.month, amount: row.netCashflow, label: 'הזרמה מהכיס' });
    } else if (!input.reinvestPositiveCashflow && row.netCashflow > 0) {
      reFlows.push({ month: row.month, amount: row.netCashflow, label: 'תזרים חיובי' });
    }
  }
  const reFinalWealth = reResult.netSaleProceeds + sidePortfolio;
  reFlows.push({ month: months, amount: reFinalWealth, label: 'מכירה ותיק צדדי' });

  const idxFlows: CashflowEntry[] = [
    { month: 0, amount: -common.initialCapital, label: 'הון התחלתי' },
    ...contributions.map((c) => ({
      month: c.month,
      amount: -c.amount,
      label: 'הפקדה',
    })),
    { month: months, amount: idxResult.finalNetWealth, label: 'מימוש' },
  ];

  const reCashInvested =
    common.initialCapital + contributions.reduce((s, c) => s + c.amount, 0);
  const idxCashInvested = reCashInvested;

  const gap = reFinalWealth - idxResult.finalNetWealth;
  const tieThreshold = Math.max(reFinalWealth, idxResult.finalNetWealth) * 0.01;

  return {
    realEstate: {
      result: reResult,
      sidePortfolio,
      finalNetWealth: reFinalWealth,
      totalCashInvested: reCashInvested,
      irr: calculateIRR(reFlows),
      cagr: calculateCAGR(reFinalWealth, common.initialCapital, common.years),
      equityMultiple: reFinalWealth / reCashInvested,
    },
    index: {
      result: idxResult,
      finalNetWealth: idxResult.finalNetWealth,
      totalCashInvested: idxCashInvested,
      irr: calculateIRR(idxFlows),
      cagr: calculateCAGR(idxResult.finalNetWealth, common.initialCapital, common.years),
      equityMultiple: idxResult.finalNetWealth / idxCashInvested,
    },
    winner:
      Math.abs(gap) < tieThreshold ? 'tie' : gap > 0 ? 'real-estate' : 'index',
    gap,
    breakEven: {
      appreciation: solveBreakEven(input, 'appreciation'),
      monthlyRent: solveBreakEven(input, 'monthlyRent'),
      purchasePrice: solveBreakEven(input, 'purchasePrice'),
    },
  };
}

/** הפרש התשואות הפנימיות. NaN כשאחת מהן לא ניתנת לחישוב */
function irrGap(input: ComparisonInput): number {
  const r = compareCore(input);
  if (!r.reIrr.ok || !r.idxIrr.ok) return NaN;
  return r.reIrr.annual - r.idxIrr.annual;
}

/** גרסה מצומצמת של ההשוואה — בלי נקודות איזון, כדי למנוע רקורסיה */
function compareCore(input: ComparisonInput) {
  const { common, realEstate, index } = input;
  const months = Math.round(common.years * 12);
  const reResult = calculateRealEstateInvestment(realEstate, common);

  const contributions: Contribution[] = [];
  const positiveFlows: Contribution[] = [];
  for (const row of reResult.ledger) {
    if (row.netCashflow < 0) contributions.push({ month: row.month, amount: -row.netCashflow });
    else if (row.netCashflow > 0) positiveFlows.push({ month: row.month, amount: row.netCashflow });
  }

  let sidePortfolio = 0;
  if (input.reinvestPositiveCashflow && positiveFlows.length > 0) {
    sidePortfolio = calculateIndexInvestment(
      index,
      { ...common, initialCapital: 0 },
      positiveFlows,
    ).finalNetWealth;
  } else {
    sidePortfolio = positiveFlows.reduce((s, f) => s + f.amount, 0);
  }

  const idxResult = calculateIndexInvestment(index, common, contributions);

  const reFlows: CashflowEntry[] = [
    { month: 0, amount: -common.initialCapital, label: '' },
  ];
  for (const row of reResult.ledger) {
    if (row.netCashflow < 0) reFlows.push({ month: row.month, amount: row.netCashflow, label: '' });
    else if (!input.reinvestPositiveCashflow && row.netCashflow > 0)
      reFlows.push({ month: row.month, amount: row.netCashflow, label: '' });
  }
  reFlows.push({
    month: months,
    amount: reResult.netSaleProceeds + sidePortfolio,
    label: '',
  });

  const idxFlows: CashflowEntry[] = [
    { month: 0, amount: -common.initialCapital, label: '' },
    ...contributions.map((c) => ({ month: c.month, amount: -c.amount, label: '' })),
    { month: months, amount: idxResult.finalNetWealth, label: '' },
  ];

  return {
    reIrr: calculateIRR(reFlows),
    idxIrr: calculateIRR(idxFlows),
    reWealth: reResult.netSaleProceeds + sidePortfolio,
    idxWealth: idxResult.finalNetWealth,
  };
}

/**
 * נקודת איזון — פותר נומרי אחד לשלושת המשתנים.
 * אין נוסחה סגורה: המנוע מורץ מחדש בכל איטרציה.
 */
export function solveBreakEven(
  input: ComparisonInput,
  variable: 'appreciation' | 'monthlyRent' | 'purchasePrice',
): SolverOutcome {
  const withValue = (x: number): ComparisonInput => {
    const clone: ComparisonInput = {
      ...input,
      realEstate: { ...input.realEstate },
    };
    if (variable === 'appreciation') {
      clone.realEstate.appreciation = { ...input.realEstate.appreciation, value: x };
    } else if (variable === 'monthlyRent') {
      clone.realEstate.rent = { ...input.realEstate.rent, monthlyRent: x };
    } else {
      clone.realEstate.purchasePrice = x;
    }
    return clone;
  };

  const f = (x: number) => irrGap(withValue(x));

  const brackets: Record<typeof variable, [number, number]> = {
    appreciation: [-0.05, 0.2],
    monthlyRent: [0, input.realEstate.purchasePrice * 0.02],
    purchasePrice: [
      input.realEstate.purchasePrice * 0.1,
      input.realEstate.purchasePrice * 3,
    ],
  };

  const [lo, hi] = brackets[variable];
  return bisect(f, lo, hi, { tolerance: 1e-6, maxIterations: 120, allowExpand: false });
}

/**
 * ═══════════════════════════════════════════════════════════
 *  בדיקת המנוע על עסקה אמיתית
 *
 *  הרצה:  npx vite-node src/v2/myScenario.ts
 *
 *  ערוך את הבלוק שלמטה בלבד. אל תיגע בשאר הקובץ.
 * ═══════════════════════════════════════════════════════════
 */

const MY = {
  // ── הדירה ──
  מחיר_הדירה: 1_800_000,
  הון_עצמי_כולל: 700_000, // כל המזומן שאתה מעמיד, כולל עלויות רכישה
  שכר_דירה_חודשי: 5_500,

  // ── משכנתה ──
  ריבית_שנתית: 4.0, // באחוזים
  שנות_משכנתה: 25,

  // ── אופק ──
  שנות_השקעה: 20,

  // ── מס ──
  דירה_יחידה: false, // true = דירה יחידה, false = דירה נוספת
  מסלול_מס_שכר_דירה: 'exempt' as 'exempt' | '10pct' | 'marginal',

  // ── הנחות ──
  עליית_ערך_שנתית: 4.5, // באחוזים
  תשואת_מדד_שנתית: 8.0, // באחוזים — תשואה כוללת
  אינפלציה: 3.0, // באחוזים
  אי_אכלוס: 8.0, // באחוזים
  גדילת_שכר_דירה: 3.0, // באחוזים

  // ── עלויות שוטפות ──
  ועד_בית_שנתי: 3_600,
  ביטוח_מבנה_שנתי: 1_200,
  ביטוח_חיים_שנתי: 1_800,
  אחוז_שיפוץ: 7.0, // מהמחיר, חד פעמי בקנייה
};

// ═══════════════════ מכאן ואילך אין מה לערוך ═══════════════════

import { compareInvestments } from './engine/comparison/compare';
import { DEFAULT_INDEX, DEFAULT_REAL_ESTATE } from './data/defaults';

const nis = (n: number) => '₪' + Math.round(n).toLocaleString('en-US');
const pct = (n: number) => (n * 100).toFixed(1) + '%';
const pad = (s: string, n: number) => s + ' '.repeat(Math.max(0, n - s.length));

const result = compareInvestments({
  common: {
    years: MY.שנות_השקעה,
    inflationRate: MY.אינפלציה / 100,
    initialCapital: MY.הון_עצמי_כולל,
  },
  realEstate: {
    ...DEFAULT_REAL_ESTATE,
    purchasePrice: MY.מחיר_הדירה,
    acquisition: { ...DEFAULT_REAL_ESTATE.acquisition, renovationPct: MY.אחוז_שיפוץ / 100 },
    mortgage: { annualRate: MY.ריבית_שנתית / 100, termYears: MY.שנות_משכנתה },
    rent: {
      monthlyRent: MY.שכר_דירה_חודשי,
      vacancyRate: MY.אי_אכלוס / 100,
      annualGrowthRate: MY.גדילת_שכר_דירה / 100,
    },
    expenses: {
      ...DEFAULT_REAL_ESTATE.expenses,
      condoFeeAnnual: MY.ועד_בית_שנתי,
      buildingInsuranceAnnual: MY.ביטוח_מבנה_שנתי,
      lifeInsuranceAnnual: MY.ביטוח_חיים_שנתי,
    },
    appreciation: { value: MY.עליית_ערך_שנתית / 100, source: 'user', label: 'הנחת עליית ערך' },
    tax: {
      ...DEFAULT_REAL_ESTATE.tax,
      profile: MY.דירה_יחידה ? 'single' : 'investment',
      rentalTrack: MY.מסלול_מס_שכר_דירה,
      assumeShevachExemption: MY.דירה_יחידה,
    },
  },
  index: { ...DEFAULT_INDEX, annualReturn: MY.תשואת_מדד_שנתית / 100 },
  reinvestPositiveCashflow: true,
});

const re = result.realEstate;
const idx = result.index;
const reRes = re.result;

console.log('\n' + '═'.repeat(58));
console.log('  ' + nis(MY.מחיר_הדירה) + ' · הון ' + nis(MY.הון_עצמי_כולל) + ' · ' + MY.שנות_השקעה + ' שנים');
console.log('═'.repeat(58));

console.log('\n── עלויות הרכישה ──');
console.log('  מס רכישה:            ' + nis(reRes.purchaseTax));
console.log('  סך עלויות נלוות:     ' + nis(reRes.acquisitionCostsTotal));
console.log('  מקדמה בפועל:         ' + nis(reRes.downPayment));
console.log('  משכנתה:              ' + nis(reRes.mortgagePrincipal));
console.log('  החזר חודשי:          ' + nis(reRes.monthlyPayment));

const cf1 = reRes.ledger[0];
const cfLast = reRes.ledger[reRes.ledger.length - 1];
console.log('\n── תזרים ──');
console.log('  חודש ראשון:          ' + nis(cf1.netCashflow) + (cf1.netCashflow < 0 ? '  (מהכיס)' : ''));
console.log('  חודש אחרון:          ' + nis(cfLast.netCashflow));
console.log('  סך הזרמה מהכיס:      ' + nis(reRes.totalNegativeCashflow));
console.log('  סך תזרים חיובי:      ' + nis(reRes.totalPositiveCashflow));

console.log('\n── מכירה ──');
console.log('  שווי הנכס:           ' + nis(reRes.salePrice));
console.log('  עלויות מכירה:        ' + nis(reRes.sellingCosts));
console.log('  יתרת משכנתה:         ' + nis(reRes.remainingMortgage));
console.log('  מס שבח:              ' + nis(reRes.shevachTax));
console.log('  תמורה נטו:           ' + nis(reRes.netSaleProceeds));
console.log('  תיק צדדי מתזרים:     ' + nis(re.sidePortfolio));

console.log('\n' + '─'.repeat(58));
console.log('  ' + pad('', 22) + pad('נדל"ן', 18) + 'מדד');
console.log('─'.repeat(58));
console.log('  ' + pad('מזומן שהושקע', 22) + pad(nis(re.totalCashInvested), 18) + nis(idx.totalCashInvested));
console.log('  ' + pad('הון סופי נטו', 22) + pad(nis(re.finalNetWealth), 18) + nis(idx.finalNetWealth));
console.log('  ' + pad('IRR', 22) + pad(re.irr.ok ? pct(re.irr.annual) : 'לא ניתן', 18) + (idx.irr.ok ? pct(idx.irr.annual) : 'לא ניתן'));
console.log('  ' + pad('CAGR (משני)', 22) + pad(pct(re.cagr), 18) + pct(idx.cagr));
console.log('  ' + pad('מכפיל הון', 22) + pad(re.equityMultiple.toFixed(2), 18) + idx.equityMultiple.toFixed(2));
console.log('─'.repeat(58));

const verdict =
  result.winner === 'real-estate'
    ? 'בתנאי המודל שהוזנו — הנדל"ן מניב תשואה גבוהה יותר'
    : result.winner === 'index'
      ? 'בתנאי המודל שהוזנו — המדד מניב תשואה גבוהה יותר'
      : 'בתנאי המודל שהוזנו — הפער בין השניים אינו מובהק';
console.log('\n  ' + verdict);
console.log('  פער: ' + nis(Math.abs(result.gap)));

console.log('\n── מה צריך לקרות כדי שהתשובה תתהפך ──');
const be = result.breakEven;
console.log('  עליית ערך נדרשת:     ' + (be.appreciation.ok ? pct(be.appreciation.value) + '  (הוזן ' + pct(MY.עליית_ערך_שנתית / 100) + ')' : 'אין בטווח סביר'));
console.log('  שכר דירה נדרש:       ' + (be.monthlyRent.ok ? nis(be.monthlyRent.value) + '  (הוזן ' + nis(MY.שכר_דירה_חודשי) + ')' : 'אין בטווח סביר'));
console.log('  מחיר מקסימלי:        ' + (be.purchasePrice.ok ? nis(be.purchasePrice.value) + '  (הוזן ' + nis(MY.מחיר_הדירה) + ')' : 'אין בטווח סביר'));

console.log('\n  החישובים אומדנים לצורך השוואת השקעות. אינם ייעוץ מס, משפטי או השקעות.\n');

import type { ComparisonResult, ComparisonInput } from '../../types';

export type RiskLevel = 'low' | 'medium' | 'high';

export interface RiskIndicator {
  key: string;
  label: string;
  level: RiskLevel;
  explanation: string;
}

/**
 * דירוגי הסיכון נגזרים מהמספרים המחושבים בלבד.
 * אין כאן טקסטים קבועים שלא נובעים מהמנוע.
 */
export function assessRisk(
  input: ComparisonInput,
  result: ComparisonResult,
): RiskIndicator[] {
  const re = result.realEstate.result;
  const price = input.realEstate.purchasePrice;
  const ltv = re.mortgagePrincipal / price;

  const firstMonth = re.ledger[0];
  const monthlyGap = firstMonth ? firstMonth.netCashflow : 0;
  const rentToPayment = firstMonth
    ? firstMonth.rentEffective / Math.max(1, firstMonth.mortgagePayment)
    : 0;

  const indicators: RiskIndicator[] = [];

  // ── מינוף ──
  indicators.push({
    key: 'leverage',
    label: 'מינוף',
    level: ltv > 0.7 ? 'high' : ltv > 0.5 ? 'medium' : 'low',
    explanation:
      `המשכנתה מהווה ${(ltv * 100).toFixed(0)}% משווי הנכס.` +
      (ltv > 0.5
        ? ' לדירה נוספת הרגולציה מגבילה ל-50% — ההון שהוזן אינו מספיק לעסקה כפי שהוגדרה.'
        : ' מינוף גבוה מגדיל את התשואה על ההון וגם את ההפסד בתרחיש שלילי.'),
  });

  // ── תזרים ──
  indicators.push({
    key: 'cashflow',
    label: 'תזרים',
    level: monthlyGap < -3000 ? 'high' : monthlyGap < 0 ? 'medium' : 'low',
    explanation:
      monthlyGap < 0
        ? `הנכס דורש ${Math.round(-monthlyGap).toLocaleString('en-US')} ₪ מהכיס בחודש הראשון. סך ההזרמה על פני התקופה: ${Math.round(re.totalNegativeCashflow).toLocaleString('en-US')} ₪.`
        : 'הנכס מכסה את עצמו מהחודש הראשון.',
  });

  // ── ריבית ──
  indicators.push({
    key: 'interest',
    label: 'ריבית',
    level: rentToPayment < 0.8 ? 'high' : rentToPayment < 1 ? 'medium' : 'low',
    explanation: `שכר הדירה מכסה ${(rentToPayment * 100).toFixed(0)}% מההחזר החודשי. כל עלייה בריבית מגדילה את הפער.`,
  });

  // ── אי-אכלוס ──
  const vacancy = input.realEstate.rent.vacancyRate;
  indicators.push({
    key: 'vacancy',
    label: 'אי-אכלוס',
    level: vacancy < 0.05 ? 'high' : vacancy < 0.1 ? 'medium' : 'low',
    explanation:
      vacancy < 0.05
        ? `ההנחה של ${(vacancy * 100).toFixed(0)}% אי-אכלוס אופטימית. חודש פנוי בשנה הוא כ-8%.`
        : `ההנחה של ${(vacancy * 100).toFixed(0)}% מגלמת כ-${Math.round(vacancy * 12)} חודשים פנויים בשנה.`,
  });

  // ── מס ──
  const shevachShare = re.salePrice > 0 ? re.shevachTax / re.salePrice : 0;
  indicators.push({
    key: 'tax',
    label: 'מס',
    level: input.realEstate.tax.assumeShevachExemption ? 'high' : shevachShare > 0.05 ? 'medium' : 'low',
    explanation: input.realEstate.tax.assumeShevachExemption
      ? 'המודל מניח פטור מלא ממס שבח. הנחה זו דורשת אימות מול יועץ מס — אם היא לא מתקיימת, התוצאה משתנה מהותית.'
      : `מס השבח באומדן ${Math.round(re.shevachTax).toLocaleString('en-US')} ₪. המודל מפושט: הצמדה למדד ו-25% על הריאלי, בלי מסלול ליניארי.`,
  });

  // ── ריכוזיות ──
  indicators.push({
    key: 'concentration',
    label: 'ריכוזיות',
    level: 'high',
    explanation: `נכס בודד בשווי ${Math.round(price).toLocaleString('en-US')} ₪ הוא החזקה אחת, בשוק אחד, בעיר אחת. תיק מדד מפוזר על מאות חברות.`,
  });

  // ── נזילות ──
  indicators.push({
    key: 'liquidity',
    label: 'נזילות',
    level: 'high',
    explanation:
      'מכירת דירה נמשכת חודשים וכוללת עלויות מכירה. תיק מדד נמכר תוך יום. המודל מניח מכירה חלקה בשנה האחרונה.',
  });

  return indicators;
}

/**
 * פסק הדין — כל משפט נגזר ממספר מחושב.
 */
export function buildVerdict(input: ComparisonInput, result: ComparisonResult) {
  const re = result.realEstate;
  const idx = result.index;
  const reRes = re.result;

  const headline =
    result.winner === 'real-estate'
      ? 'בתנאי המודל שהוזנו — הנדל״ן מניב תשואה גבוהה יותר'
      : result.winner === 'index'
        ? 'בתנאי המודל שהוזנו — המדד מניב תשואה גבוהה יותר'
        : 'בתנאי המודל שהוזנו — הפער בין השניים אינו מובהק';

  const reasons: string[] = [];

  if (result.breakEven.appreciation.ok) {
    const needed = result.breakEven.appreciation.value;
    const assumed = input.realEstate.appreciation.value;
    reasons.push(
      needed > assumed
        ? `הנכס צריך לעלות ${(needed * 100).toFixed(1)}% בשנה כדי להשתוות למדד — מעל ההנחה שהוזנה, ${(assumed * 100).toFixed(1)}%`
        : `הנכס משתווה למדד כבר ב-${(needed * 100).toFixed(1)}% עלייה בשנה, מתחת להנחה שהוזנה`,
    );
  }

  const first = reRes.ledger[0];
  if (first && first.netCashflow < 0) {
    reasons.push(
      `התזרים החודשי שלילי ב-${Math.round(-first.netCashflow).toLocaleString('en-US')} ₪, וסך ההזרמה מהכיס מגיע ל-${Math.round(reRes.totalNegativeCashflow).toLocaleString('en-US')} ₪`,
    );
  }

  const ltv = reRes.mortgagePrincipal / input.realEstate.purchasePrice;
  if (ltv > 0.5) {
    reasons.push(
      `המינוף עומד על ${(ltv * 100).toFixed(0)}% — מגדיל את התשואה על ההון וגם את החשיפה`,
    );
  }

  if (re.irr.ok && idx.irr.ok) {
    reasons.push(
      `תשואה פנימית: ${(re.irr.annual * 100).toFixed(1)}% בנדל״ן מול ${(idx.irr.annual * 100).toFixed(1)}% במדד`,
    );
  }

  const changes: string[] = [];
  if (result.breakEven.appreciation.ok) {
    changes.push(`עליית ערך מעל ${(result.breakEven.appreciation.value * 100).toFixed(1)}%`);
  }
  if (result.breakEven.monthlyRent.ok) {
    changes.push(`שכר דירה מעל ${Math.round(result.breakEven.monthlyRent.value).toLocaleString('en-US')} ₪`);
  }
  if (result.breakEven.purchasePrice.ok) {
    changes.push(`מחיר רכישה מתחת ל-${Math.round(result.breakEven.purchasePrice.value).toLocaleString('en-US')} ₪`);
  }

  return { headline, reasons, changes };
}

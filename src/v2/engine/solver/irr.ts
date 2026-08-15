import type { CashflowEntry, IRRResult } from '../../types';
import { bisect } from './bisection';

/** ספירת החלפות סימן — יותר מאחת עלולה להעיד על כמה שורשים */
export function countSignChanges(amounts: number[]): number {
  let changes = 0;
  let prevSign = 0;
  for (const a of amounts) {
    if (a === 0) continue;
    const sign = a > 0 ? 1 : -1;
    if (prevSign !== 0 && sign !== prevSign) changes++;
    prevSign = sign;
  }
  return changes;
}

function npv(rate: number, flows: CashflowEntry[]): number {
  let sum = 0;
  for (const f of flows) {
    sum += f.amount / Math.pow(1 + rate, f.month);
  }
  return sum;
}

/**
 * תשואה פנימית חודשית על תזרים חודשי, מומרת לשנתית.
 *
 * שיטה: bisection בלבד. Newton-Raphson מתבדר בתזרימים ממונפים,
 * ולכן לא בשימוש כאן.
 */
export function calculateIRR(flows: CashflowEntry[]): IRRResult {
  if (flows.length < 2) {
    return { ok: false, reason: 'no-sign-change', signChanges: 0 };
  }

  // איחוד תזרימים לפי חודש לפני ספירת סימנים
  const byMonth = new Map<number, number>();
  for (const f of flows) {
    byMonth.set(f.month, (byMonth.get(f.month) ?? 0) + f.amount);
  }
  const ordered = [...byMonth.entries()].sort((a, b) => a[0] - b[0]);
  const amounts = ordered.map(([, amt]) => amt);

  const signChanges = countSignChanges(amounts);
  if (signChanges === 0) {
    return { ok: false, reason: 'no-sign-change', signChanges };
  }
  if (signChanges > 1) {
    return { ok: false, reason: 'multiple-roots', signChanges };
  }

  const merged: CashflowEntry[] = ordered.map(([month, amount]) => ({
    month,
    amount,
    label: '',
  }));

  // טווח חודשי: -50% עד +100% לחודש.
  // הגבול התחתון אינו -99%: על תזרים של 240 חודשים,
  // חלוקה ב-0.01^240 גולשת ל-Infinity והפותר נכשל שלא לצורך.
  // -50% לחודש הם כ--99.8% בשנה — יותר מספיק לכל תרחיש אמיתי.
  const outcome = bisect((r) => npv(r, merged), -0.5, 1.0, {
    tolerance: 1e-9,
    maxIterations: 300,
    allowExpand: false,
  });

  if (!outcome.ok) {
    return {
      ok: false,
      reason: outcome.reason === 'no-bracket' ? 'no-sign-change' : 'no-convergence',
      signChanges,
    };
  }

  const monthly = outcome.value;
  return { ok: true, monthly, annual: Math.pow(1 + monthly, 12) - 1 };
}

/**
 * XIRR — תזרים עם תאריכים אמיתיים, בסיס 365 יום.
 */
export function calculateXIRR(
  flows: { date: Date; amount: number }[],
): IRRResult {
  if (flows.length < 2) return { ok: false, reason: 'no-sign-change' };
  const sorted = [...flows].sort((a, b) => a.date.getTime() - b.date.getTime());
  const t0 = sorted[0].date.getTime();
  const years = sorted.map((f) => (f.date.getTime() - t0) / (365 * 24 * 3600 * 1000));

  const signChanges = countSignChanges(sorted.map((f) => f.amount));
  if (signChanges === 0) return { ok: false, reason: 'no-sign-change', signChanges };
  if (signChanges > 1) return { ok: false, reason: 'multiple-roots', signChanges };

  const f = (rate: number) =>
    sorted.reduce((sum, flow, i) => sum + flow.amount / Math.pow(1 + rate, years[i]), 0);

  const outcome = bisect(f, -0.99, 10, {
    tolerance: 1e-9,
    maxIterations: 300,
    allowExpand: false,
  });
  if (!outcome.ok) {
    return {
      ok: false,
      reason: outcome.reason === 'no-bracket' ? 'no-sign-change' : 'no-convergence',
      signChanges,
    };
  }
  return {
    ok: true,
    annual: outcome.value,
    monthly: Math.pow(1 + outcome.value, 1 / 12) - 1,
  };
}

/**
 * CAGR — מדד משני בלבד. מתעלם מתזמון התזרימים.
 * לא להציג אותו כשווה ערך ל-IRR.
 */
export function calculateCAGR(
  finalValue: number,
  initialValue: number,
  years: number,
): number {
  if (initialValue <= 0 || years <= 0) return 0;
  const ratio = finalValue / initialValue;
  if (ratio <= 0) return -1;
  return Math.pow(ratio, 1 / years) - 1;
}

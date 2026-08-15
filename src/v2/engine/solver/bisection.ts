import type { SolverOutcome } from '../../types';

export interface BisectionOptions {
  tolerance?: number;
  maxIterations?: number;
  /** הרחבה אחת של הטווח אם אין החלפת סימן */
  allowExpand?: boolean;
}

/**
 * חיפוש בינארי לשורש של f בטווח [lo, hi].
 * מחזיר כישלון מפורש כשאין החלפת סימן — לא מספר שגוי.
 */
export function bisect(
  f: (x: number) => number,
  lo: number,
  hi: number,
  opts: BisectionOptions = {},
): SolverOutcome {
  const tol = opts.tolerance ?? 1e-7;
  const maxIter = opts.maxIterations ?? 200;
  const allowExpand = opts.allowExpand ?? true;

  let a = lo;
  let b = hi;
  let fa = f(a);
  let fb = f(b);

  if (!Number.isFinite(fa) || !Number.isFinite(fb)) {
    return { ok: false, reason: 'no-bracket' };
  }
  if (fa === 0) return { ok: true, value: a, iterations: 0 };
  if (fb === 0) return { ok: true, value: b, iterations: 0 };

  // הרחבה אחת בלבד. אם עדיין אין החלפת סימן — אין נקודת איזון בטווח סביר.
  if (fa * fb > 0 && allowExpand) {
    const span = b - a;
    a = a - span * 0.5;
    b = b + span * 0.5;
    fa = f(a);
    fb = f(b);
  }
  if (!Number.isFinite(fa) || !Number.isFinite(fb) || fa * fb > 0) {
    return { ok: false, reason: 'no-bracket' };
  }

  for (let i = 0; i < maxIter; i++) {
    const mid = (a + b) / 2;
    const fm = f(mid);
    if (!Number.isFinite(fm)) return { ok: false, reason: 'no-convergence' };
    if (Math.abs(fm) < tol || (b - a) / 2 < tol) {
      return { ok: true, value: mid, iterations: i + 1 };
    }
    if (fa * fm < 0) {
      b = mid;
      fb = fm;
    } else {
      a = mid;
      fa = fm;
    }
  }
  return { ok: false, reason: 'no-convergence' };
}

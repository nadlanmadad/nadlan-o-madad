export interface AmortizationRow {
  month: number;
  payment: number;
  interest: number;
  principal: number;
  balance: number;
}

/** לוח שפיצר — תשלום חודשי קבוע */
export function monthlyPayment(
  principal: number,
  annualRate: number,
  termYears: number,
): number {
  const r = annualRate / 12;
  const n = Math.round(termYears * 12);
  if (n <= 0) return 0;
  if (r === 0) return principal / n;
  return (principal * (r * Math.pow(1 + r, n))) / (Math.pow(1 + r, n) - 1);
}

export function buildSchedule(
  principal: number,
  annualRate: number,
  termYears: number,
  months: number,
): AmortizationRow[] {
  const pmt = monthlyPayment(principal, annualRate, termYears);
  const r = annualRate / 12;
  const termMonths = Math.round(termYears * 12);
  const rows: AmortizationRow[] = [];
  let balance = principal;

  for (let m = 1; m <= months; m++) {
    if (m > termMonths || balance <= 0.005) {
      rows.push({ month: m, payment: 0, interest: 0, principal: 0, balance: 0 });
      continue;
    }
    const interest = balance * r;
    let principalPart = pmt - interest;
    let payment = pmt;
    // תשלום אחרון — לא לגבות יותר מהיתרה
    if (principalPart > balance) {
      principalPart = balance;
      payment = interest + principalPart;
    }
    balance = balance - principalPart;
    rows.push({
      month: m,
      payment,
      interest,
      principal: principalPart,
      balance: Math.max(0, balance),
    });
  }
  return rows;
}

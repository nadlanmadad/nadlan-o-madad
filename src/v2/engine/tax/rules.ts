import type { PurchaseProfile, RentalTaxTrack } from '../../types';

/**
 * כללי מס עם תוקף בתאריכים.
 * כל שיעור כאן הוא אומדן לצורך השוואת השקעות — לא ייעוץ מס.
 */
export interface TaxRuleSet {
  effectiveFrom: string;
  effectiveTo: string | null;
  label: string;
  purchaseTax: {
    single: { upTo: number; rate: number }[];
    investment: { upTo: number; rate: number }[];
  };
  rentalExemptCeilingMonthly: number;
  rentalReducedRate: number;
  /** קיזוז שכר דירה ששולם, במסלול המופחת בלבד */
  rentalOffsetAnnualCap: number;
  capitalGainsRate: number;
  /** שיעור פחת שנתי על מרכיב המבונה */
  depreciationRate: number;
  buildingShare: number;
  depreciationMaxYears: number;
  vatRate: number;
}

export const TAX_RULES_2026: TaxRuleSet = {
  effectiveFrom: '2026-01-16',
  effectiveTo: '2028-01-15',
  label: 'מדרגות 2026 (קפואות עד 15.1.2028)',
  purchaseTax: {
    single: [
      { upTo: 1_978_745, rate: 0 },
      { upTo: 2_347_040, rate: 0.035 },
      { upTo: 6_055_070, rate: 0.05 },
      { upTo: 20_183_565, rate: 0.08 },
      { upTo: Infinity, rate: 0.1 },
    ],
    investment: [
      { upTo: 6_055_070, rate: 0.08 },
      { upTo: Infinity, rate: 0.1 },
    ],
  },
  rentalExemptCeilingMonthly: 5_654,
  rentalReducedRate: 0.1,
  rentalOffsetAnnualCap: 90_000,
  capitalGainsRate: 0.25,
  depreciationRate: 0.015,
  buildingShare: 0.667,
  depreciationMaxYears: 25,
  vatRate: 0.17,
};

/** מס רכישה לפי מדרגות — לא אחוז אחיד ולא אחוז לפי עיר */
export function calculatePurchaseTax(
  price: number,
  profile: PurchaseProfile,
  rules: TaxRuleSet = TAX_RULES_2026,
): number {
  const brackets = rules.purchaseTax[profile];
  let tax = 0;
  let prev = 0;
  for (const b of brackets) {
    if (price <= prev) break;
    const taxableInBracket = Math.min(price, b.upTo) - prev;
    tax += taxableInBracket * b.rate;
    prev = b.upTo;
  }
  return tax;
}

/** מס שנתי על הכנסה משכר דירה, לפי המסלול שנבחר */
export function calculateRentalTax(
  annualRent: number,
  track: RentalTaxTrack,
  opts: {
    marginalRate: number;
    profile: PurchaseProfile;
    rentPaidMonthly: number;
    deductibleExpenses?: number;
  },
  rules: TaxRuleSet = TAX_RULES_2026,
): number {
  if (annualRent <= 0) return 0;

  if (track === '10pct') {
    let taxable = annualRent;
    if (opts.profile === 'single' && opts.rentPaidMonthly > 0) {
      taxable = Math.max(
        0,
        annualRent - Math.min(opts.rentPaidMonthly * 12, rules.rentalOffsetAnnualCap),
      );
    }
    return taxable * rules.rentalReducedRate;
  }

  if (track === 'marginal') {
    const taxable = Math.max(0, annualRent - (opts.deductibleExpenses ?? 0));
    return taxable * opts.marginalRate;
  }

  // מסלול הפטור — מס מופחת רק על החלק שמעל התקרה
  const ceiling = rules.rentalExemptCeilingMonthly * 12;
  if (annualRent <= ceiling) return 0;
  return (annualRent - ceiling) * rules.rentalReducedRate;
}

/**
 * מס רווח הון ריאלי — על הרווח אחרי הצמדה למדד.
 * כל הפקדה מוצמדת לפי מועדה שלה, לא הבסיס כמקשה אחת.
 */
export function calculateRealCapitalGainsTax(
  finalValue: number,
  lots: { month: number; amount: number }[],
  endMonth: number,
  annualInflation: number,
  rate: number,
): { indexedBasis: number; realGain: number; tax: number } {
  let indexedBasis = 0;
  for (const lot of lots) {
    const yearsHeld = Math.max(0, (endMonth - lot.month) / 12);
    indexedBasis += lot.amount * Math.pow(1 + annualInflation, yearsHeld);
  }
  const realGain = finalValue - indexedBasis;
  return {
    indexedBasis,
    realGain,
    tax: Math.max(0, realGain) * rate,
  };
}

/**
 * מס שבח — על השבח הריאלי.
 * מודל מפושט: הצמדת בסיס הרכישה למדד, 25% על הריאלי.
 */
export function calculateShevachTax(params: {
  salePrice: number;
  sellingCosts: number;
  purchasePrice: number;
  acquisitionCosts: number;
  improvements: number;
  accumulatedDepreciation: number;
  years: number;
  annualInflation: number;
  exempt: boolean;
  rate?: number;
}): { taxableRealGain: number; tax: number; indexedBasis: number } {
  const rate = params.rate ?? TAX_RULES_2026.capitalGainsRate;
  const nominalBasis =
    params.purchasePrice + params.acquisitionCosts + params.improvements;
  const indexedBasis =
    nominalBasis * Math.pow(1 + params.annualInflation, params.years);

  const netSale = params.salePrice - params.sellingCosts;
  const realGain = netSale - indexedBasis + params.accumulatedDepreciation;

  if (params.exempt) return { taxableRealGain: 0, tax: 0, indexedBasis };
  return {
    taxableRealGain: Math.max(0, realGain),
    tax: Math.max(0, realGain) * rate,
    indexedBasis,
  };
}

export function accumulatedDepreciation(
  purchasePrice: number,
  years: number,
  rules: TaxRuleSet = TAX_RULES_2026,
): number {
  const y = Math.min(years, rules.depreciationMaxYears);
  return purchasePrice * rules.buildingShare * rules.depreciationRate * y;
}

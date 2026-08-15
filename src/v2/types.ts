/**
 * V2 — טיפוסי הליבה של המנוע הפיננסי.
 * אין כאן שום תלות ב-React. כל הפונקציות במנוע הן pure.
 */

// ─────────────────────────── הנחות משותפות ───────────────────────────

export interface CommonAssumptions {
  /** אופק ההשקעה בשנים */
  years: number;
  /** אינפלציה שנתית — נדרשת לחישוב מס ריאלי. שיעור עשרוני (0.03 = 3%) */
  inflationRate: number;
  /** ההון הכולל שהמשקיע מעמיד בנקודת ההתחלה, בשקלים */
  initialCapital: number;
}

/** הנחה עם מקור — כדי שהממשק יוכל להציג "הנחה" ולא "עובדה" */
export interface Assumption {
  value: number;
  source: 'user' | 'historical' | 'market-data' | 'default';
  label: string;
}

// ─────────────────────────── תזרים ───────────────────────────

export interface CashflowEntry {
  /** מספר חודש מתחילת ההשקעה. 0 = נקודת הרכישה */
  month: number;
  amount: number;
  label: string;
}

/** פנקס חודשי מפורט של הנדל"ן */
export interface MonthlyLedgerRow {
  month: number;
  rentGross: number;
  rentEffective: number;
  mortgagePayment: number;
  interest: number;
  principal: number;
  mortgageBalance: number;
  maintenance: number;
  condoFee: number;
  insurance: number;
  management: number;
  rentalTax: number;
  netCashflow: number;
  propertyValue: number;
}

// ─────────────────────────── מס ───────────────────────────

export type PurchaseProfile = 'single' | 'investment';
export type RentalTaxTrack = 'exempt' | '10pct' | 'marginal';

export interface TaxProfile {
  profile: PurchaseProfile;
  rentalTrack: RentalTaxTrack;
  marginalRate: number;
  /** האם דירה יחידה זוכה לפטור ממס שבח. הנחה — לא נכונה תמיד */
  assumeShevachExemption: boolean;
  /** האם להוסיף פחת נצבר לשבח החייב */
  addDepreciationToGain: boolean;
  /** שכר דירה שהמשקיע עצמו משלם, לצורך קיזוז במסלול 10% */
  rentPaidMonthly: number;
}

// ─────────────────────────── נדל"ן ───────────────────────────

export interface AcquisitionCosts {
  lawyerPct: number;
  brokeragePct: number;
  appraiser: number;
  inspection: number;
  mortgageOpen: number;
  mortgageAdvisor: number;
  renovationPct: number;
}

export interface MortgageInput {
  annualRate: number;
  termYears: number;
}

export interface RentInput {
  monthlyRent: number;
  vacancyRate: number;
  annualGrowthRate: number;
}

export interface PropertyExpenses {
  /** אחוז שנתי משווי הנכס המתעדכן — לא ממחיר הרכישה */
  maintenancePct: number;
  condoFeeAnnual: number;
  buildingInsuranceAnnual: number;
  lifeInsuranceAnnual: number;
  managementPct: number;
  hasManagement: boolean;
}

export interface ExitInput {
  brokeragePct: number;
  lawyerPct: number;
}

export interface RealEstateScenario {
  purchasePrice: number;
  acquisition: AcquisitionCosts;
  mortgage: MortgageInput;
  rent: RentInput;
  expenses: PropertyExpenses;
  exit: ExitInput;
  appreciation: Assumption;
  tax: TaxProfile;
}

export interface RealEstateResult {
  purchaseTax: number;
  acquisitionCostsTotal: number;
  downPayment: number;
  mortgagePrincipal: number;
  monthlyPayment: number;
  /** הון שלא נכנס לנכס — מושקע בנפרד */
  excessCash: number;
  ledger: MonthlyLedgerRow[];
  cashflows: CashflowEntry[];
  totalNegativeCashflow: number;
  totalPositiveCashflow: number;
  salePrice: number;
  sellingCosts: number;
  remainingMortgage: number;
  shevachTax: number;
  netSaleProceeds: number;
  finalNetWealth: number;
}

// ─────────────────────────── מדד ───────────────────────────

export type ReturnType = 'total-return' | 'price-return';

export interface Contribution {
  month: number;
  amount: number;
}

export interface IndexScenario {
  annualReturn: number;
  returnType: ReturnType;
  dividendYield: number;
  reinvestDividends: boolean;
  dividendTaxRate: number;
  capitalGainsTaxRate: number;
  managementFeeRate: number;
}

export interface IndexResult {
  finalGrossValue: number;
  /** בסיס עלות נומינלי — הון התחלתי + הפקדות + דיבידנד שהושקע מחדש */
  nominalCostBasis: number;
  /** בסיס עלות מוצמד למדד, לפי מועד כל הפקדה בנפרד */
  indexedCostBasis: number;
  realGain: number;
  capitalGainsTax: number;
  dividendTaxPaid: number;
  managementFeesPaid: number;
  finalNetWealth: number;
  cashflows: CashflowEntry[];
  monthlyValues: number[];
}

// ─────────────────────────── תשואה פנימית ───────────────────────────

export type IRRResult =
  | { ok: true; monthly: number; annual: number }
  | {
      ok: false;
      reason: 'no-sign-change' | 'multiple-roots' | 'no-convergence';
      signChanges?: number;
    };

// ─────────────────────────── השוואה ───────────────────────────

export interface ComparisonInput {
  common: CommonAssumptions;
  realEstate: RealEstateScenario;
  index: IndexScenario;
  /** תזרים חיובי מהנכס מושקע במדד כתיק צדדי. ברירת מחדל: true */
  reinvestPositiveCashflow: boolean;
}

export type SolverOutcome =
  | { ok: true; value: number; iterations: number }
  | { ok: false; reason: 'no-bracket' | 'no-convergence' };

export interface ComparisonResult {
  realEstate: {
    result: RealEstateResult;
    /** שווי התיק הצדדי שנבנה מתזרים חיובי */
    sidePortfolio: number;
    finalNetWealth: number;
    totalCashInvested: number;
    irr: IRRResult;
    cagr: number;
    equityMultiple: number;
  };
  index: {
    result: IndexResult;
    finalNetWealth: number;
    totalCashInvested: number;
    irr: IRRResult;
    cagr: number;
    equityMultiple: number;
  };
  winner: 'real-estate' | 'index' | 'tie';
  gap: number;
  breakEven: {
    appreciation: SolverOutcome;
    monthlyRent: SolverOutcome;
    purchasePrice: SolverOutcome;
  };
}

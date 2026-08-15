import type {
  CommonAssumptions,
  IndexScenario,
  RealEstateScenario,
} from '../types';

/**
 * ברירות מחדל. כולן ניתנות לעריכה בממשק ואינן קשיחות בתוך רכיבים.
 *
 * הערה חשובה על נתוני המדד: annualReturn הוא תשואה כוללת —
 * הדיבידנד כבר כלול בו. אין להוסיף אותו שוב.
 */
export const INDEX_PRESETS: Record<
  string,
  { annualReturn: number; dividendYield: number; note: string }
> = {
  'S&P 500': {
    annualReturn: 0.105,
    dividendYield: 0.015,
    note: 'תשואה כוללת היסטורית. תשואת המחיר לבדה כ-9%',
  },
  'Nasdaq 100': {
    annualReturn: 0.13,
    dividendYield: 0.007,
    note: 'תשואה כוללת. תקופה קצרה יחסית, הטיית שורדים',
  },
  'MSCI World': {
    annualReturn: 0.085,
    dividendYield: 0.02,
    note: 'תשואה כוללת, פיזור גלובלי',
  },
  'מדד מותאם': {
    annualReturn: 0.08,
    dividendYield: 0.01,
    note: 'הנחה שמרנית',
  },
};

export const DEFAULT_COMMON: CommonAssumptions = {
  years: 20,
  inflationRate: 0.03,
  initialCapital: 700_000,
};

export const DEFAULT_INDEX: IndexScenario = {
  annualReturn: 0.105,
  returnType: 'total-return',
  dividendYield: 0.015,
  reinvestDividends: true,
  dividendTaxRate: 0.25,
  capitalGainsTaxRate: 0.25,
  managementFeeRate: 0.001,
};

export const DEFAULT_REAL_ESTATE: RealEstateScenario = {
  purchasePrice: 1_800_000,
  acquisition: {
    lawyerPct: 0.0075,
    brokeragePct: 0.01,
    appraiser: 2_000,
    inspection: 1_500,
    mortgageOpen: 2_000,
    mortgageAdvisor: 5_000,
    renovationPct: 0.07,
  },
  mortgage: { annualRate: 0.04, termYears: 25 },
  rent: { monthlyRent: 5_500, vacancyRate: 0.08, annualGrowthRate: 0.03 },
  expenses: {
    maintenancePct: 0.01,
    condoFeeAnnual: 3_600,
    buildingInsuranceAnnual: 1_200,
    lifeInsuranceAnnual: 1_800,
    managementPct: 0.09,
    hasManagement: false,
  },
  exit: { brokeragePct: 0.01, lawyerPct: 0.005 },
  appreciation: {
    value: 0.045,
    source: 'default',
    label: 'הנחת עליית ערך',
  },
  tax: {
    profile: 'investment',
    rentalTrack: 'exempt',
    marginalRate: 0.3,
    assumeShevachExemption: false,
    addDepreciationToGain: true,
    rentPaidMonthly: 0,
  },
};

/** שלושת התרחישים — ניתנים להגדרה מבחוץ */
export const SCENARIOS = {
  conservative: { appreciation: 0.025, indexReturn: 0.06, label: 'שמרני' },
  base: { appreciation: 0.045, indexReturn: 0.08, label: 'בסיס' },
  optimistic: { appreciation: 0.07, indexReturn: 0.11, label: 'אופטימי' },
} as const;

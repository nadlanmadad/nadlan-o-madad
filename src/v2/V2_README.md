# V2 — מנוע פיננסי

מנוע חישוב עצמאי, בלי שום תלות ב-React. V1 לא נגעו בה.

## התקנה והרצה

```bash
npm install -D vitest
npm test              # אחרי הוספת "test": "vitest run" ל-scripts
```

## מבנה

```text
src/v2/
  types.ts                          כל הטיפוסים
  data/defaults.ts                  ברירות מחדל ותרחישים
  engine/
    solver/bisection.ts             פותר נומרי גנרי
    solver/irr.ts                   IRR, XIRR, CAGR
    mortgage/amortization.ts        לוח שפיצר
    tax/rules.ts                    כללי מס עם תוקף בתאריכים
    index/indexEngine.ts            מנוע המדד
    realEstate/realEstateEngine.ts  מנוע הנדל"ן
    comparison/compare.ts           השוואה ונקודות איזון
  tests/engine.test.ts              35 בדיקות
```

## שימוש

```ts
import { compareInvestments } from '@/v2/engine/comparison/compare';
import { DEFAULT_COMMON, DEFAULT_INDEX, DEFAULT_REAL_ESTATE } from '@/v2/data/defaults';

const result = compareInvestments({
  common: DEFAULT_COMMON,
  realEstate: DEFAULT_REAL_ESTATE,
  index: DEFAULT_INDEX,
  reinvestPositiveCashflow: true,
});
```

`result` מכיל הון סופי, IRR, CAGR, מכפיל הון, סך מזומן שהושקע, ושלוש נקודות איזון.

## איך משנים דברים

**הנחות** — `data/defaults.ts`. אין ערכים קשיחים בתוך המנוע.

**כללי מס** — `engine/tax/rules.ts`. להוסיף `TaxRuleSet` חדש עם `effectiveFrom` ולהעביר אותו כפרמטר. המנוע לא משתנה.

**תרחיש** — להוסיף ל-`SCENARIOS` ב-`defaults.ts`.

**ספק נתוני שוק** — לממש ממשק עם `getIndexAssumptions()` ולהחליף את הערכים ב-`defaults.ts`. כרגע הכול סטטי, בלי קריאות רשת.

## שתי החלטות שכדאי להכיר

**הפרדת דיבידנד מתשואה כוללת היא חילוק ולא חיסור.** `(1+מחיר) × (1+דיבידנד) = (1+כוללת)`. חיסור פשוט נותן סטייה של כ-2% ל-20 שנה.

**הגבול התחתון של פותר ה-IRR הוא ‎-50%‎ לחודש ולא ‎-99%‎.** על תזרים של 240 חודשים, חלוקה ב-‎0.01^240‎ גולשת ל-Infinity והפותר נכשל שלא לצורך.

## מגבלות פתוחות

1. **מס שבח מפושט.** הצמדת בסיס למדד ו-25% על הריאלי. אין מסלול ליניארי, אין פטור דירת מגורים מזכה, אין פריסה. `assumeShevachExemption` הוא מתג בינארי גס.
2. **פחת** מתווסף לשבח החייב לפי מתג `addDepreciationToGain`, בלי קשר למסלול המס על שכר הדירה. סוגיה שדורשת החלטה מקצועית.
3. **מס רכישה** לא מבחין בין תושב לתושב חוץ ולא בין דירת מגורים לנכס אחר.
4. **אין XIRR בזרימה הראשית.** הפונקציה קיימת ובדוקה, אבל ההשוואה משתמשת ב-IRR חודשי כי כל התזרימים אחידים.
5. **נקודת איזון במחיר רכישה** מחזירה לעיתים "אין בטווח סביר". זה נכון: כשההון קבוע, שינוי המחיר משנה גם את המינוף, והפונקציה לא תמיד חוצה אפס בטווח 10%–300%.
6. **אין ממשק.** רק המנוע. שלבים 11–13 במפרט לא בוצעו.
7. **אין עדיין בדיקות ל-V1** — היא עדיין ללא כיסוי.

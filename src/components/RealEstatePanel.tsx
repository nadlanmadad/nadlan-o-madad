import { Panel, Section, Field, NumberInput, Toggle, Select, ResultBadge, Divider, fmtILS } from "@/components/UI";
import type { RealEstateState, RealEstateResults } from "@/types";
import { getMadlanUrl, getGovNadlanUrl } from "@/hooks/useRealEstateCalc";
import { T } from "@/theme";

const CITIES = ["תל אביב","ירושלים","חיפה","באר שבע","נתניה","ראשון לציון","הרצליה","רמת גן","פתח תקווה","אחר"];
const PROFILE_OPTIONS = ["דירה נוספת (השקעה)", "דירה יחידה"];
const PROFILE_MAP: Record<string, "investment"|"single"> = { "דירה נוספת (השקעה)": "investment", "דירה יחידה": "single" };
const PROFILE_DISPLAY: Record<string, string> = { investment: "דירה נוספת (השקעה)", single: "דירה יחידה" };

interface Props { state: RealEstateState; dispatch: (a:any)=>void; results: RealEstateResults; years: number; }

export function RealEstatePanel({ state: s, dispatch, results: r, years }: Props) {
  const set = (field: keyof RealEstateState) => (value: any) => dispatch({ type: "SET", field, value });
  return (
    <Panel title="נדל״ן" icon="🏠">
      <div style={{ background: T.bgApp, borderRadius: T.radiusMd, padding: "1rem", marginBottom: "1rem" }}>
        <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 8 }}>תשואה שנתית CAGR — {years} שנים</div>
        <ResultBadge label="" pessimistic={r.scenarioROEAnnual.pessimistic} realistic={r.scenarioROEAnnual.realistic} optimistic={r.scenarioROEAnnual.optimistic} />
        <Divider />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, fontSize: 12 }}>
          <div><span style={{ color: T.textMuted }}>הון: </span><strong style={{ color: T.textPrimary }}>{fmtILS(r.totalEquity)}</strong></div>
          <div><span style={{ color: T.textMuted }}>מקדמה: </span><strong style={{ color: T.textPrimary }}>{fmtILS(r.downPayment)}</strong></div>
          <div><span style={{ color: T.textMuted }}>החזר: </span><strong style={{ color: T.textPrimary }}>{fmtILS(r.monthlyMortgagePayment)}/חודש</strong></div>
        </div>
        <Divider />
        <ResultBadge label="תזרים מצטבר" pessimistic={r.scenarioCashflow.pessimistic} realistic={r.scenarioCashflow.realistic} optimistic={r.scenarioCashflow.optimistic} format="ils" />
        <ResultBadge label="רווח הון נקי" pessimistic={r.scenarioCapitalGain.pessimistic} realistic={r.scenarioCapitalGain.realistic} optimistic={r.scenarioCapitalGain.optimistic} format="ils" />
        <ResultBadge label="רווח כולל" pessimistic={r.scenarioTotalReturn.pessimistic} realistic={r.scenarioTotalReturn.realistic} optimistic={r.scenarioTotalReturn.optimistic} format="ils" />
      </div>

      <Section title="📍 פרטי נכס">
        <Field label="מחיר נכס (₪)"><NumberInput value={s.propertyPrice} onChange={set("propertyPrice")} step={50000} min={100000} /></Field>
        <Field label="עיר">
          <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 120 }}><Select value={s.city} onChange={city => dispatch({ type: "SET_CITY", city })} options={CITIES} /></div>
            <a href={getMadlanUrl(s.city)} target="_blank" rel="noopener noreferrer"
              style={{ fontSize: 11, background: T.bgElevated, border: `1px solid ${T.gold}66`, borderRadius: T.radiusSm, padding: "6px 10px", color: T.gold, textDecoration: "none", whiteSpace: "nowrap" }}>
              מדלן ↗
            </a>
            <a href={getGovNadlanUrl(s.city)} target="_blank" rel="noopener noreferrer"
              style={{ fontSize: 11, background: T.bgElevated, border: `1px solid ${T.info}66`, borderRadius: T.radiusSm, padding: "6px 10px", color: T.info, textDecoration: "none", whiteSpace: "nowrap" }}>
              נדל״ן ממשלתי ↗
            </a>
          </div>
          <div style={{ marginTop: 6, background: T.bgElevated, border: `1px solid ${T.border}`, borderRadius: T.radiusSm, padding: "8px 10px", fontSize: 11, color: T.textSecondary, lineHeight: 1.7 }}>
            <strong style={{ color: T.gold }}>מדלן</strong> — מגמת מחירים ממוצעת לאזור<br />
            <strong style={{ color: T.info }}>נדל״ן ממשלתי</strong> — עסקאות אמיתיות מרשות המיסים (מדויק יותר)<br />
            השווה % שינוי שנתי ← הזן ב"ריאלי" למטה
          </div>
        </Field>
        <Field label="פרופיל רוכש">
          <Select value={PROFILE_DISPLAY[s.profile]} onChange={v => set("profile")(PROFILE_MAP[v])} options={PROFILE_OPTIONS} />
          <div style={{ fontSize: 11, color: T.textMuted, marginTop: 2 }}>
            {s.profile === "investment" ? "מס רכישה 8% מהשקל הראשון" : "מדרגות מוטבות — פטור עד ₪1.85M"}
          </div>
        </Field>
        {s.profile === "single" && (
          <div style={{ marginTop: "0.5rem" }}>
            <Toggle checked={s.rentingElsewhere} onChange={set("rentingElsewhere")} label="אני שוכר דירה אחרת (קיזוז עד ₪7,500)" />
            {s.rentingElsewhere && <Field label="שכ״ד חודשי ששולם (₪)"><NumberInput value={s.rentPaidMonthly} onChange={set("rentPaidMonthly")} max={7500} /></Field>}
          </div>
        )}
      </Section>

      <Section title="💰 עלויות רכישה" defaultOpen={false}>
        <div style={{ marginBottom: 6, fontSize: 11, fontWeight: 600, color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.05em" }}>חובה</div>
        <Field label="עו״ד רכישה (%)"><NumberInput value={s.lawyerPct} onChange={set("lawyerPct")} step={0.1} min={0} max={3} suffix="%" /></Field>
        <div style={{ marginBottom: 6, fontSize: 11, fontWeight: 600, color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 8 }}>אופציונלי</div>
        {[
          { key: "hasBrokerage", label: "תיווך", field: "brokeragePct", suffix: "%" },
          { key: "hasRenovation", label: "שיפוץ + עיצוב", field: "renovationPct", suffix: "%" },
        ].map(({ key, label, field, suffix }) => (
          <div key={key} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <Toggle checked={(s as any)[key]} onChange={set(key as any)} label={label} />
            {(s as any)[key] && <div style={{ flex: 1 }}><NumberInput value={(s as any)[field]} onChange={set(field as any)} step={0.1} min={0} suffix={suffix} /></div>}
          </div>
        ))}
        {[
          { key: "hasAppraiser", label: "שמאי", field: "appraiserAmount" },
          { key: "hasInspection", label: "בדק בית", field: "inspectionAmount" },
          { key: "hasMortgageOpen", label: "פתיחת משכנתא", field: "mortgageOpenAmount" },
          { key: "hasMortgageAdvisor", label: "ייעוץ משכנתא", field: "mortgageAdvisorAmount" },
        ].map(({ key, label, field }) => (
          <div key={key} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <Toggle checked={(s as any)[key]} onChange={set(key as any)} label={label} />
            {(s as any)[key] && <div style={{ flex: 1 }}><NumberInput value={(s as any)[field]} onChange={set(field as any)} step={100} prefix="₪" /></div>}
          </div>
        ))}
        <div style={{ marginTop: 8, background: T.bgElevated, border: `1px solid ${T.border}`, borderRadius: T.radiusSm, padding: "8px 10px", fontSize: 12, color: T.textSecondary }}>
          עלויות: <strong>{fmtILS(r.purchaseCosts)}</strong> | מקדמה: <strong>{fmtILS(r.downPayment)}</strong> | משכנתא: <strong>{fmtILS(r.mortgage)}</strong>
        </div>
      </Section>

      <Section title="🏦 משכנתא" defaultOpen={false}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: "0.5rem" }}>
          <Field label="ריבית שנתית (%)"><NumberInput value={s.mortgageRate} onChange={set("mortgageRate")} step={0.1} min={0} max={15} suffix="%" /></Field>
          <Field label="תקופה (שנים)"><NumberInput value={s.mortgageYears} onChange={set("mortgageYears")} min={5} max={30} /></Field>
        </div>
      </Section>

      <Section title="🔑 שכירות ותפעול" defaultOpen={false}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: "0.5rem" }}>
          <Field label="שכ״ד חודשי (₪)"><NumberInput value={s.monthlyRent} onChange={set("monthlyRent")} step={100} /></Field>
          <Field label="ריק (%)"><NumberInput value={s.vacancyPct} onChange={set("vacancyPct")} step={1} min={0} max={50} suffix="%" /></Field>
          <Field label="עליית שכ״ד (%)"><NumberInput value={s.rentGrowthPct} onChange={set("rentGrowthPct")} step={0.5} suffix="%" /></Field>
          <Field label="תחזוקה (%/שנה)"><NumberInput value={s.maintenancePct} onChange={set("maintenancePct")} step={0.1} suffix="%" /></Field>
          <Field label="ועד בית (₪/שנה)"><NumberInput value={s.condoFeeAnnual} onChange={set("condoFeeAnnual")} step={100} /></Field>
          <Field label="ביטוח מבנה (₪)"><NumberInput value={s.buildingInsurance} onChange={set("buildingInsurance")} step={100} /></Field>
          <Field label="ביטוח חיים (₪)"><NumberInput value={s.lifeInsurance} onChange={set("lifeInsurance")} step={100} /></Field>
          <Field label="אינפלציה (%)"><NumberInput value={s.inflationPct} onChange={set("inflationPct")} step={0.5} suffix="%" /></Field>
        </div>
        <Field label="מסלול מס שכירות">
          <Select value={s.taxTrack} onChange={set("taxTrack")} options={["exempt","10pct","marginal"]} />
          <div style={{ fontSize: 11, color: T.textMuted, marginTop: 2 }}>
            {s.taxTrack==="exempt" ? "פטור (עד ₪5,470/חודש)" : s.taxTrack==="10pct" ? "10% ללא ניכוי הוצאות" : "מסלול שולי — עם ניכוי הוצאות"}
          </div>
        </Field>
        {s.taxTrack==="marginal" && <Field label="מס שולי (%)"><NumberInput value={s.marginalRate} onChange={set("marginalRate")} min={10} max={50} suffix="%" /></Field>}
        <Toggle checked={s.hasPropertyMgmt} onChange={set("hasPropertyMgmt")} label="חברת ניהול" />
        {s.hasPropertyMgmt && <Field label="עמלת ניהול (%)"><NumberInput value={s.propertyMgmtPct} onChange={set("propertyMgmtPct")} step={1} suffix="%" /></Field>}
      </Section>

      <Section title="📈 עליית ערך צפויה" defaultOpen={true}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "0.5rem" }}>
          <Field label="פסימי (%)"><NumberInput value={s.pessimisticGrowth} onChange={set("pessimisticGrowth")} step={0.5} suffix="%" /></Field>
          <Field label="ריאלי (%)"><NumberInput value={s.realisticGrowth} onChange={set("realisticGrowth")} step={0.5} suffix="%" /></Field>
          <Field label="אופטימי (%)"><NumberInput value={s.optimisticGrowth} onChange={set("optimisticGrowth")} step={0.5} suffix="%" /></Field>
        </div>
      </Section>

      <Section title="🔓 יציאה ומכירה" defaultOpen={false}>
        <Field label="עו״ד מכירה (%)"><NumberInput value={s.exitLawyerPct} onChange={set("exitLawyerPct")} step={0.1} suffix="%" /></Field>
        <Toggle checked={s.hasExitBrokerage} onChange={set("hasExitBrokerage")} label="תיווך מכירה" />
        {s.hasExitBrokerage && <Field label="% תיווך מכירה"><NumberInput value={s.exitBrokeragePct} onChange={set("exitBrokeragePct")} step={0.1} suffix="%" /></Field>}
        <Toggle checked={s.hasEarlyRepayment} onChange={set("hasEarlyRepayment")} label="עמלת פירעון מוקדם" />
        {s.hasEarlyRepayment && <Field label="סכום עמלה (₪)"><NumberInput value={s.earlyRepaymentAmount} onChange={set("earlyRepaymentAmount")} step={1000} prefix="₪" /></Field>}
        {s.profile==="investment" && (
          <div style={{ marginTop: 8, fontSize: 11, color: T.textMuted, background: T.bgElevated, border: `1px solid ${T.border}`, borderRadius: T.radiusSm, padding: 8 }}>
            מס שבח 25% מחושב אוטומטית · פחת מצטבר 1.5%/שנה מגדיל שבח חייב
          </div>
        )}
      </Section>
    </Panel>
  );
}

import { useState } from "react";
import { T } from "@/theme";
import type { RealEstateState, IndexState, RealEstateResults, IndexResults } from "@/types";
import { getMadlanUrl, getGovNadlanUrl } from "@/hooks/useRealEstateCalc";
import { INDEX_LIST } from "@/hooks/useIndexCalc";
import { fmtILS } from "@/components/UI";
import { EmailCapture } from "@/components/EmailCapture";

const CITIES = ["תל אביב","ירושלים","חיפה","באר שבע","נתניה","ראשון לציון","הרצליה","רמת גן","פתח תקווה","אחר"];

interface Props {
  equity: number; setEquity: (n: number) => void;
  years: number; setYears: (n: number) => void;
  reState: RealEstateState; reDispatch: (a: any) => void; reResults: RealEstateResults;
  idxState: IndexState; idxDispatch: (a: any) => void; idxResults: IndexResults;
  onFinish: () => void;
  onAdvanced: () => void;
}

const TOTAL = 10;

// Wizard-styled input
function WInput({ value, onChange, prefix, suffix, placeholder, big }: { value: number; onChange: (v: number) => void; prefix?: string; suffix?: string; placeholder?: string; big?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, background: T.bgInput, border: `1.5px solid ${T.border}`, borderRadius: T.radiusMd, padding: big ? "16px 18px" : "12px 14px" }}>
      {prefix && <span style={{ fontSize: big ? 22 : 16, color: T.textMuted }}>{prefix}</span>}
      <input type="number" value={value || ""} placeholder={placeholder}
        onChange={e => onChange(parseFloat(e.target.value) || 0)}
        style={{ flex: 1, fontSize: big ? 28 : 18, fontWeight: 600, border: "none", background: "transparent", color: T.gold, outline: "none", textAlign: "left", direction: "ltr", minWidth: 0 }} />
      {suffix && <span style={{ fontSize: big ? 18 : 14, color: T.textMuted, whiteSpace: "nowrap" }}>{suffix}</span>}
    </div>
  );
}

function WLabel({ children, hint }: { children: any; hint?: string }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontSize: 13, fontWeight: 500, color: T.textSecondary }}>{children}</div>
      {hint && <div style={{ fontSize: 11, color: T.textMuted, marginTop: 2 }}>{hint}</div>}
    </div>
  );
}

function WToggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: 14, color: T.textPrimary, padding: "10px 0" }}>
      <div onClick={() => onChange(!checked)} style={{ width: 40, height: 22, borderRadius: T.radiusFull, background: checked ? T.gold : T.bgElevated, border: `1px solid ${checked ? T.gold : T.border}`, position: "relative", flexShrink: 0, transition: "background 0.2s" }}>
        <div style={{ position: "absolute", top: 2, right: checked ? 2 : 18, width: 16, height: 16, borderRadius: "50%", background: checked ? T.bgApp : T.textMuted, transition: "right 0.2s" }} />
      </div>
      {label}
    </label>
  );
}

export function Wizard({ equity, setEquity, years, setYears, reState, reDispatch, reResults, idxState, idxDispatch, idxResults, onFinish, onAdvanced }: Props) {
  const [step, setStep] = useState(1);
  const [humanReturn, setHumanReturn] = useState(6.8);
  const [useHuman, setUseHuman] = useState(false);

  const setRE = (field: keyof RealEstateState) => (value: any) => reDispatch({ type: "SET", field, value });
  const next = () => setStep(s => Math.min(TOTAL, s + 1));
  const back = () => setStep(s => Math.max(1, s - 1));

  const reROE = reResults.scenarioROEAnnual.realistic;
  const idxRealistic = idxResults.scenarioROEAnnual.realistic;
  // human CAGR
  const TAX = 0.25;
  const totalRate = (humanReturn + idxState.dividendPct) / 100;
  const humanFinal = equity * Math.pow(1 + totalRate, years);
  const humanNet = (humanFinal - equity) * (1 - TAX);
  const humanCAGR = equity > 0 && years > 0 ? (Math.pow(1 + humanNet / equity, 1 / years) - 1) * 100 : 0;
  const activeIdxROE = useHuman ? humanCAGR : idxRealistic;
  const winner = reROE > activeIdxROE ? "נדל״ן" : "מדדים";

  const titles = ["", "הון וטווח", "פרטי הנכס", "עלויות רכישה", "משכנתא", "שכירות ותפעול", "עליית ערך צפויה", "יציאה ומכירה", "בחירת מדד", "Behavior Gap", "התוצאה"];

  return (
    <div style={{ minHeight: "100vh", background: T.bgApp, display: "flex", flexDirection: "column" }}>
      {/* Progress bar */}
      <div style={{ position: "sticky", top: 0, background: T.bgSurface, borderBottom: `1px solid ${T.border}`, zIndex: 10 }}>
        <div style={{ maxWidth: 640, margin: "0 auto", padding: "1rem 1.25rem" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: T.textPrimary }}>נדלן או מדד</span>
            <button onClick={onAdvanced} style={{ fontSize: 11, color: T.textMuted, background: "transparent", border: `1px solid ${T.border}`, borderRadius: T.radiusSm, padding: "5px 10px", cursor: "pointer" }}>
              מצב מתקדם ←
            </button>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ flex: 1, height: 4, background: T.bgElevated, borderRadius: T.radiusFull, overflow: "hidden" }}>
              <div style={{ width: `${(step / TOTAL) * 100}%`, height: "100%", background: T.gold, transition: "width 0.3s" }} />
            </div>
            <span style={{ fontSize: 11, color: T.textMuted, whiteSpace: "nowrap" }}>{step}/{TOTAL}</span>
          </div>
          <div style={{ fontSize: 12, color: T.gold, marginTop: 6, fontWeight: 500 }}>{titles[step]}</div>
        </div>
      </div>

      {/* Step content */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", maxWidth: 640, width: "100%", margin: "0 auto", padding: "2rem 1.25rem", boxSizing: "border-box" }}>

        {/* STEP 1 — הון וטווח */}
        {step === 1 && (
          <div>
            <h2 style={{ fontSize: 24, fontWeight: 700, color: T.textPrimary, marginBottom: 8 }}>כמה הון עצמי יש לך להשקעה?</h2>
            <p style={{ fontSize: 14, color: T.textSecondary, marginBottom: 24, lineHeight: 1.6 }}>הסכום הזה ישמש להשוואה בין שני המסלולים — אותו כסף, שתי דרכים.</p>
            <WLabel hint="הסכום שיש לך ביד כרגע">הון עצמי זמין</WLabel>
            <WInput value={equity} onChange={setEquity} prefix="₪" big placeholder="500,000" />
            <div style={{ marginTop: 24 }}>
              <WLabel hint="לכמה זמן אתה מתכנן להשקיע?">טווח השקעה</WLabel>
              <div style={{ display: "flex", gap: 8 }}>
                {[5, 10, 15, 20, 25].map(y => (
                  <button key={y} onClick={() => setYears(y)}
                    style={{ flex: 1, padding: "14px 0", borderRadius: T.radiusMd, border: `1.5px solid ${years === y ? T.gold : T.border}`, background: years === y ? T.gold : T.bgInput, color: years === y ? T.bgApp : T.textSecondary, fontSize: 16, fontWeight: 700, cursor: "pointer", transition: "all 0.15s" }}>
                    {y}
                  </button>
                ))}
              </div>
              <div style={{ textAlign: "center", fontSize: 12, color: T.textMuted, marginTop: 8 }}>שנים</div>
            </div>
          </div>
        )}

        {/* STEP 2 — פרטי הנכס */}
        {step === 2 && (
          <div>
            <h2 style={{ fontSize: 24, fontWeight: 700, color: T.textPrimary, marginBottom: 8 }}>איזה נכס אתה שוקל?</h2>
            <p style={{ fontSize: 14, color: T.textSecondary, marginBottom: 24, lineHeight: 1.6 }}>המחיר והעיר של הדירה שאתה מתכנן לקנות.</p>
            <WLabel>מחיר הנכס</WLabel>
            <WInput value={reState.propertyPrice} onChange={setRE("propertyPrice")} prefix="₪" big placeholder="1,800,000" />
            <div style={{ marginTop: 20 }}>
              <WLabel>עיר</WLabel>
              <select value={reState.city} onChange={e => reDispatch({ type: "SET_CITY", city: e.target.value })}
                style={{ width: "100%", padding: "12px 14px", fontSize: 16, border: `1.5px solid ${T.border}`, borderRadius: T.radiusMd, background: T.bgInput, color: T.textPrimary, outline: "none" }}>
                {CITIES.map(c => <option key={c} value={c} style={{ background: T.bgElevated }}>{c}</option>)}
              </select>
            </div>
            <div style={{ marginTop: 20 }}>
              <WLabel>סוג הרכישה</WLabel>
              <div style={{ display: "flex", gap: 8 }}>
                {[{ v: "investment", l: "דירה נוספת (השקעה)" }, { v: "single", l: "דירה יחידה" }].map(({ v, l }) => (
                  <button key={v} onClick={() => setRE("profile")(v)}
                    style={{ flex: 1, padding: "12px", borderRadius: T.radiusMd, border: `1.5px solid ${reState.profile === v ? T.gold : T.border}`, background: reState.profile === v ? T.bgElevated : T.bgInput, color: reState.profile === v ? T.gold : T.textSecondary, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                    {l}
                  </button>
                ))}
              </div>
              <div style={{ fontSize: 11, color: T.textMuted, marginTop: 6 }}>
                {reState.profile === "investment" ? "מס רכישה 8% מהשקל הראשון" : "מדרגות מוטבות — פטור עד ₪1.85M"}
              </div>
            </div>
          </div>
        )}

        {/* STEP 3 — עלויות רכישה */}
        {step === 3 && (
          <div>
            <h2 style={{ fontSize: 24, fontWeight: 700, color: T.textPrimary, marginBottom: 8 }}>עלויות הרכישה</h2>
            <p style={{ fontSize: 14, color: T.textSecondary, marginBottom: 24, lineHeight: 1.6 }}>אלה ההוצאות החד-פעמיות שיורדות מההון העצמי. ברירות מחדל מקובלות — אפשר לכבות או לערוך כל אחת.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                { key: "hasBrokerage", field: "brokeragePct", label: "תיווך", suffix: "%" },
                { key: "hasRenovation", field: "renovationPct", label: "שיפוץ + עיצוב", suffix: "%" },
              ].map(({ key, field, label, suffix }) => (
                <div key={key} style={{ display: "flex", alignItems: "center", gap: 10, background: T.bgElevated, border: `1px solid ${T.border}`, borderRadius: T.radiusMd, padding: "10px 14px" }}>
                  <div style={{ flex: 1 }}>
                    <WToggle checked={(reState as any)[key]} onChange={setRE(key as any)} label={label} />
                  </div>
                  {(reState as any)[key] && (
                    <div style={{ width: 100 }}>
                      <WInput value={(reState as any)[field]} onChange={setRE(field as any)} suffix={suffix} />
                    </div>
                  )}
                </div>
              ))}
              {[
                { key: "hasAppraiser", field: "appraiserAmount", label: "שמאי", step: 100 },
                { key: "hasInspection", field: "inspectionAmount", label: "בדק בית", step: 100 },
                { key: "hasMortgageAdvisor", field: "mortgageAdvisorAmount", label: "ייעוץ משכנתא", step: 500 },
              ].map(({ key, field, label }) => (
                <div key={key} style={{ display: "flex", alignItems: "center", gap: 10, background: T.bgElevated, border: `1px solid ${T.border}`, borderRadius: T.radiusMd, padding: "10px 14px" }}>
                  <div style={{ flex: 1 }}>
                    <WToggle checked={(reState as any)[key]} onChange={setRE(key as any)} label={label} />
                  </div>
                  {(reState as any)[key] && (
                    <div style={{ width: 130 }}>
                      <WInput value={(reState as any)[field]} onChange={setRE(field as any)} prefix="₪" />
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div style={{ marginTop: 20, padding: "12px 14px", background: T.bgElevated, border: `1px solid ${T.border}`, borderRadius: T.radiusMd, fontSize: 13, color: T.textSecondary }}>
              סך עלויות רכישה: <strong style={{ color: T.gold }}>{fmtILS(reResults.purchaseCosts)}</strong><br />
              מקדמה שנשארת: <strong style={{ color: T.textPrimary }}>{fmtILS(reResults.downPayment)}</strong>
            </div>
          </div>
        )}

        {/* STEP 4 — משכנתא */}
        {step === 4 && (
          <div>
            <h2 style={{ fontSize: 24, fontWeight: 700, color: T.textPrimary, marginBottom: 8 }}>תנאי המשכנתא</h2>
            <p style={{ fontSize: 14, color: T.textSecondary, marginBottom: 24, lineHeight: 1.6 }}>הסכום מחושב אוטומטית: מחיר הנכס פחות המקדמה.</p>
            <div style={{ padding: "12px 14px", background: T.bgElevated, border: `1px solid ${T.border}`, borderRadius: T.radiusMd, fontSize: 14, color: T.textSecondary, marginBottom: 20 }}>
              סכום המשכנתא: <strong style={{ color: T.gold, fontSize: 18 }}>{fmtILS(reResults.mortgage)}</strong>
            </div>
            <WLabel>ריבית שנתית</WLabel>
            <WInput value={reState.mortgageRate} onChange={setRE("mortgageRate")} suffix="%" />
            <div style={{ marginTop: 20 }}>
              <WLabel>תקופת המשכנתא</WLabel>
              <WInput value={reState.mortgageYears} onChange={setRE("mortgageYears")} suffix="שנים" />
            </div>
            <div style={{ marginTop: 16, padding: "10px 14px", background: T.bgElevated, border: `1px solid ${T.border}`, borderRadius: T.radiusMd, fontSize: 13, color: T.textSecondary }}>
              החזר חודשי משוער: <strong style={{ color: T.textPrimary }}>{fmtILS(reResults.monthlyMortgagePayment)}</strong>
            </div>
          </div>
        )}

        {/* STEP 5 — שכירות ותפעול */}
        {step === 5 && (
          <div>
            <h2 style={{ fontSize: 24, fontWeight: 700, color: T.textPrimary, marginBottom: 8 }}>הכנסה מהשכרה</h2>
            <p style={{ fontSize: 14, color: T.textSecondary, marginBottom: 24, lineHeight: 1.6 }}>כמה שכר דירה תקבל, ומה ההוצאות השוטפות.</p>
            <WLabel>שכר דירה חודשי צפוי</WLabel>
            <WInput value={reState.monthlyRent} onChange={setRE("monthlyRent")} prefix="₪" big placeholder="5,500" />
            <div style={{ marginTop: 20 }}>
              <WLabel hint="כמה מהזמן הנכס עומד ריק בין שוכרים">תקופת ריק שנתית</WLabel>
              <WInput value={reState.vacancyPct} onChange={setRE("vacancyPct")} suffix="%" />
            </div>
            <div style={{ marginTop: 20 }}>
              <WLabel hint="עליית שכ״ד שנתית צפויה">עליית שכ״ד שנתית</WLabel>
              <WInput value={reState.rentGrowthPct} onChange={setRE("rentGrowthPct")} suffix="%" />
            </div>
            <div style={{ marginTop: 20 }}>
              <WLabel>מסלול מס שכירות</WLabel>
              <select value={reState.taxTrack} onChange={e => setRE("taxTrack")(e.target.value)}
                style={{ width: "100%", padding: "12px 14px", fontSize: 15, border: `1.5px solid ${T.border}`, borderRadius: T.radiusMd, background: T.bgInput, color: T.textPrimary, outline: "none" }}>
                <option value="exempt" style={{ background: T.bgElevated }}>פטור (עד ₪5,470/חודש)</option>
                <option value="10pct" style={{ background: T.bgElevated }}>10% ללא ניכוי הוצאות</option>
                <option value="marginal" style={{ background: T.bgElevated }}>מסלול שולי</option>
              </select>
            </div>
            {reState.profile === "single" && (
              <div style={{ marginTop: 20, padding: "14px", background: T.bgElevated, border: `1px solid ${T.border}`, borderRadius: T.radiusMd }}>
                <WToggle checked={reState.rentingElsewhere} onChange={setRE("rentingElsewhere")} label="אני גם שוכר דירה אחרת" />
                {reState.rentingElsewhere && (
                  <div style={{ marginTop: 10 }}>
                    <WLabel hint="קיזוז שכ״ד ששולם מההכנסה החייבת — עד ₪7,500 לחודש">שכר דירה שאני משלם</WLabel>
                    <WInput value={reState.rentPaidMonthly} onChange={v => setRE("rentPaidMonthly")(Math.min(7500, v))} prefix="₪" suffix="עד 7,500" />
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* STEP 6 — עליית ערך */}
        {step === 6 && (
          <div>
            <h2 style={{ fontSize: 24, fontWeight: 700, color: T.textPrimary, marginBottom: 8 }}>כמה הנכס יעלה בערכו?</h2>
            <p style={{ fontSize: 14, color: T.textSecondary, marginBottom: 16, lineHeight: 1.6 }}>הזן הערכה שנתית ל-3 תסריטים. לא בטוח? בדוק נתונים אמיתיים:</p>
            <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
              <a href={getMadlanUrl(reState.city)} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, background: T.bgElevated, border: `1px solid ${T.gold}66`, borderRadius: T.radiusSm, padding: "8px 14px", color: T.gold, textDecoration: "none" }}>מדלן ↗</a>
              <a href={getGovNadlanUrl(reState.city)} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, background: T.bgElevated, border: `1px solid ${T.info}66`, borderRadius: T.radiusSm, padding: "8px 14px", color: T.info, textDecoration: "none" }}>נדל״ן ממשלתי ↗</a>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <WLabel>תסריט פסימי</WLabel>
                <WInput value={reState.pessimisticGrowth} onChange={setRE("pessimisticGrowth")} suffix="% לשנה" />
              </div>
              <div>
                <WLabel>תסריט ריאלי</WLabel>
                <WInput value={reState.realisticGrowth} onChange={setRE("realisticGrowth")} suffix="% לשנה" />
              </div>
              <div>
                <WLabel>תסריט אופטימי</WLabel>
                <WInput value={reState.optimisticGrowth} onChange={setRE("optimisticGrowth")} suffix="% לשנה" />
              </div>
            </div>
          </div>
        )}

        {/* STEP 7 — יציאה ומכירה */}
        {step === 7 && (
          <div>
            <h2 style={{ fontSize: 24, fontWeight: 700, color: T.textPrimary, marginBottom: 8 }}>עלויות מכירה עתידיות</h2>
            <p style={{ fontSize: 14, color: T.textSecondary, marginBottom: 24, lineHeight: 1.6 }}>כשתמכור את הנכס בסוף התקופה.</p>
            <WLabel>עו״ד מכירה</WLabel>
            <WInput value={reState.exitLawyerPct} onChange={setRE("exitLawyerPct")} suffix="%" />
            <div style={{ marginTop: 16, background: T.bgElevated, border: `1px solid ${T.border}`, borderRadius: T.radiusMd, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ flex: 1 }}>
                <WToggle checked={reState.hasExitBrokerage} onChange={setRE("hasExitBrokerage")} label="תיווך מכירה" />
              </div>
              {reState.hasExitBrokerage && (
                <div style={{ width: 100 }}>
                  <WInput value={reState.exitBrokeragePct} onChange={setRE("exitBrokeragePct")} suffix="%" />
                </div>
              )}
            </div>
            <div style={{ marginTop: 12, background: T.bgElevated, border: `1px solid ${T.border}`, borderRadius: T.radiusMd, padding: "10px 14px" }}>
              <WToggle checked={reState.hasEarlyRepayment} onChange={setRE("hasEarlyRepayment")} label="עמלת פירעון מוקדם" />
              {reState.hasEarlyRepayment && (
                <div style={{ marginTop: 10 }}>
                  <WInput value={reState.earlyRepaymentAmount} onChange={setRE("earlyRepaymentAmount")} prefix="₪" />
                </div>
              )}
            </div>
            {reState.profile === "investment" && (
              <div style={{ marginTop: 20, padding: "12px 14px", background: T.bgElevated, border: `1px solid ${T.border}`, borderRadius: T.radiusMd, fontSize: 12, color: T.textMuted, lineHeight: 1.6 }}>
                💡 מס שבח 25% על הרווח מחושב אוטומטית, כולל פחת מצטבר. עבור דירה יחידה — פטור ממס שבח.
              </div>
            )}
          </div>
        )}

        {/* STEP 8 — בחירת מדד */}
        {step === 8 && (
          <div>
            <h2 style={{ fontSize: 24, fontWeight: 700, color: T.textPrimary, marginBottom: 8 }}>באיזה מדד תשקיע?</h2>
            <p style={{ fontSize: 14, color: T.textSecondary, marginBottom: 24, lineHeight: 1.6 }}>החלופה לנדל"ן — השקעה פסיבית במדד מניות.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {INDEX_LIST.map(name => (
                <button key={name} onClick={() => idxDispatch({ type: "SET_INDEX", name })}
                  style={{ padding: "16px 18px", borderRadius: T.radiusMd, border: `1.5px solid ${idxState.selectedIndex === name ? T.gold : T.border}`, background: idxState.selectedIndex === name ? T.bgElevated : T.bgInput, color: idxState.selectedIndex === name ? T.gold : T.textSecondary, fontSize: 16, fontWeight: 600, cursor: "pointer", textAlign: "right", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>{name}</span>
                  {idxState.selectedIndex === name && <span style={{ fontSize: 13, color: T.textMuted }}>{idxState.returnPct}% שנתי</span>}
                </button>
              ))}
            </div>
            <div style={{ marginTop: 20 }}>
              <WToggle checked={idxState.drip} onChange={v => idxDispatch({ type: "SET", field: "drip", value: v })} label="DRIP — השקעה מחדש של דיבידנדים" />
            </div>
          </div>
        )}

        {/* STEP 9 — Behavior Gap */}
        {step === 9 && (
          <div>
            <h2 style={{ fontSize: 24, fontWeight: 700, color: T.textPrimary, marginBottom: 8 }}>הסוד שאף אחד לא מספר לך</h2>
            <p style={{ fontSize: 14, color: T.textSecondary, marginBottom: 20, lineHeight: 1.7 }}>
              המדד אולי עשה {idxState.returnPct}% בשנה — אבל <strong style={{ color: T.gold }}>המשקיע הממוצע</strong> השיג הרבה פחות. מכירה בפחד, כניסה מאוחרת, וצרכי נזילות אוכלים את התשואה.
            </p>
            <div style={{ background: `linear-gradient(135deg, #FBF3E0 0%, #F5E8C8 100%)`, border: `1.5px solid ${T.negative}`, borderRadius: T.radiusMd, padding: "16px 18px", marginBottom: 20 }}>
              <div style={{ fontSize: 13, color: T.textSecondary, marginBottom: 4 }}>מחקר DALBAR 2023</div>
              <div style={{ fontSize: 14, color: T.textPrimary, lineHeight: 1.6 }}>הפער בין תשואת המדד לתשואת המשקיע בפועל נקרא <strong style={{ color: T.negative }}>Behavior Gap</strong>.</div>
            </div>
            <WToggle checked={useHuman} onChange={setUseHuman} label="הצג תשואה אנושית מציאותית בתוצאה" />
            {useHuman && (
              <div style={{ marginTop: 16, padding: "16px", background: T.bgElevated, border: `1px solid ${T.border}`, borderRadius: T.radiusMd }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                  <span style={{ fontSize: 13, color: T.textSecondary }}>תשואה אנושית בפועל</span>
                  <span style={{ fontSize: 18, fontWeight: 700, color: T.negative }}>{humanReturn.toFixed(1)}%</span>
                </div>
                <input type="range" min={1} max={idxState.returnPct} step={0.1} value={humanReturn} onChange={e => setHumanReturn(parseFloat(e.target.value))} style={{ width: "100%", accentColor: T.negative }} />
                <div style={{ fontSize: 11, color: T.textMuted, marginTop: 8, fontStyle: "italic" }}>"נדל״ן כופה עליך להחזיק. המשכנתא לא מאפשרת פאניקה."</div>
              </div>
            )}
          </div>
        )}

        {/* STEP 10 — תוצאה */}
        {step === 10 && (
          <div>
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <div style={{ fontSize: 48, marginBottom: 8 }}>{winner === "נדל״ן" ? "🏠" : "📈"}</div>
              <div style={{ fontSize: 14, color: T.textMuted }}>{useHuman ? "במציאות האנושית — עדיף" : "בתסריט הריאלי — עדיף"}</div>
              <div style={{ fontSize: 32, fontWeight: 700, color: T.gold }}>{winner}</div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
              <div style={{ background: T.bgSurface, border: `1px solid ${T.border}`, borderRadius: T.radiusMd, padding: "16px", textAlign: "center" }}>
                <div style={{ fontSize: 24, marginBottom: 4 }}>🏠</div>
                <div style={{ fontSize: 12, color: T.textMuted }}>נדל״ן (ריאלי)</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: reROE >= 0 ? T.positive : T.negative }}>{reROE >= 0 ? "+" : ""}{reROE.toFixed(1)}%</div>
                <div style={{ fontSize: 11, color: T.textMuted, marginTop: 4 }}>{fmtILS(reResults.scenarioTotalReturn.realistic)} רווח</div>
              </div>
              <div style={{ background: T.bgSurface, border: `1px solid ${T.border}`, borderRadius: T.radiusMd, padding: "16px", textAlign: "center" }}>
                <div style={{ fontSize: 24, marginBottom: 4 }}>📈</div>
                <div style={{ fontSize: 12, color: T.textMuted }}>{useHuman ? `מדדים (${humanReturn}%)` : "מדדים (ריאלי)"}</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: activeIdxROE >= 0 ? T.positive : T.negative }}>{activeIdxROE >= 0 ? "+" : ""}{activeIdxROE.toFixed(1)}%</div>
                <div style={{ fontSize: 11, color: T.textMuted, marginTop: 4 }}>{fmtILS(useHuman ? humanNet : idxResults.netReturn)} רווח</div>
              </div>
            </div>
            <button onClick={onFinish}
              style={{ width: "100%", padding: "16px", background: T.gold, color: T.bgApp, border: "none", borderRadius: T.radiusMd, fontSize: 16, fontWeight: 700, cursor: "pointer", marginBottom: 12 }}>
              הצג השוואה מלאה עם גרפים ←
            </button>
            <div style={{ marginBottom: 12 }}>
              <EmailCapture source="wizard-result" />
            </div>
            <button onClick={onAdvanced}
              style={{ width: "100%", padding: "12px", background: "transparent", color: T.textSecondary, border: `1px solid ${T.border}`, borderRadius: T.radiusMd, fontSize: 14, cursor: "pointer" }}>
              ערוך נתונים במצב מתקדם
            </button>
          </div>
        )}

      </div>

      {/* Navigation */}
      {step < 10 && (
        <div style={{ position: "sticky", bottom: 0, background: T.bgSurface, borderTop: `1px solid ${T.border}`, padding: "1rem 1.25rem" }}>
          <div style={{ maxWidth: 640, margin: "0 auto", display: "flex", gap: 12 }}>
            {step > 1 && (
              <button onClick={back} style={{ padding: "14px 24px", background: "transparent", color: T.textSecondary, border: `1px solid ${T.border}`, borderRadius: T.radiusMd, fontSize: 15, fontWeight: 500, cursor: "pointer" }}>
                → חזור
              </button>
            )}
            <button onClick={next} style={{ flex: 1, padding: "14px", background: T.gold, color: T.bgApp, border: "none", borderRadius: T.radiusMd, fontSize: 16, fontWeight: 700, cursor: "pointer" }}>
              {step === 9 ? "הצג תוצאה" : "הבא"} ←
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

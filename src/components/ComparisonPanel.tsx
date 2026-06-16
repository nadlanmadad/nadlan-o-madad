import { useState, useMemo } from "react";
import type { RealEstateResults, IndexResults } from "@/types";
import { fmtILS } from "@/components/UI";
import { T } from "@/theme";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, LineChart, Line, CartesianGrid } from "recharts";

interface Props {
  realEstateResults: RealEstateResults;
  indexResults: IndexResults;
  years: number; equity: number;
  indexReturnPct: number; indexDividendPct: number; drip: boolean;
}

const DALBAR_RETURN = 6.8;

function calcCAGR(netReturn: number, equity: number, years: number): number {
  if (equity <= 0 || years <= 0) return 0;
  const ratio = 1 + netReturn / equity;
  if (ratio <= 0) return -100;
  return (Math.pow(ratio, 1 / years) - 1) * 100;
}

function calcHuman(equity: number, years: number, returnPct: number, dividendPct: number, drip: boolean) {
  const TAX = 0.25;
  const vals: number[] = [equity];
  if (drip) {
    const rate = (returnPct + dividendPct) / 100;
    const final = equity * Math.pow(1 + rate, years);
    const net = (final - equity) * (1 - TAX);
    for (let y = 1; y <= years; y++) vals.push(equity * Math.pow(1 + rate, y));
    return { netReturn: net, roeAnnual: calcCAGR(net, equity, years), yearlyValues: vals };
  } else {
    let value = equity; let divs = 0;
    for (let y = 1; y <= years; y++) {
      value *= (1 + returnPct / 100);
      divs += value * (dividendPct / 100) * (1 - TAX);
      vals.push(value);
    }
    const net = (value - equity) * (1 - TAX) + divs;
    return { netReturn: net, roeAnnual: calcCAGR(net, equity, years), yearlyValues: vals };
  }
}

export function ComparisonPanel({ realEstateResults: re, indexResults: idx, years, equity, indexReturnPct, indexDividendPct, drip }: Props) {
  const [humanMode, setHumanMode] = useState(false);
  const [humanReturn, setHumanReturn] = useState(DALBAR_RETURN);

  const humanResult = useMemo(() => calcHuman(equity, years, humanReturn, indexDividendPct, drip), [equity, years, humanReturn, indexDividendPct, drip]);

  const activeROE = humanMode ? humanResult.roeAnnual : idx.scenarioROEAnnual.realistic;
  const activeYearly = humanMode ? humanResult.yearlyValues : idx.yearlyValues;
  const activeNet = humanMode ? humanResult.netReturn : idx.netReturn;

  const reROE = re.scenarioROEAnnual.realistic;
  const winner = reROE > activeROE ? "נדל״ן" : "מדדים";
  const diff = Math.abs(reROE - activeROE).toFixed(1);
  const leverage = re.downPayment > 0 ? (re.mortgage / re.downPayment + 1).toFixed(1) : "—";

  const barData = [
    { name: "פסימי",  "נדל״ן": +re.scenarioROEAnnual.pessimistic.toFixed(1), [humanMode?"מדדים (אנושי)":"מדדים"]: +idx.scenarioROEAnnual.pessimistic.toFixed(1) },
    { name: "ריאלי",  "נדל״ן": +re.scenarioROEAnnual.realistic.toFixed(1),  [humanMode?"מדדים (אנושי)":"מדדים"]: +activeROE.toFixed(1) },
    { name: "אופטימי","נדל״ן": +re.scenarioROEAnnual.optimistic.toFixed(1), [humanMode?"מדדים (אנושי)":"מדדים"]: +idx.scenarioROEAnnual.optimistic.toFixed(1) },
  ];
  const lineData = re.yearlyData.map((d, i) => ({
    year: `${d.year}`,
    "נדל״ן": Math.round(d.propertyValue - d.mortgageBalance),
    [humanMode?"מדדים (אנושי)":"מדדים"]: Math.round(activeYearly[i+1] ?? 0),
  }));

  return (
    <div style={{ background: T.bgSurface, border: `1px solid ${T.border}`, borderTop: `3px solid ${T.gold}`, borderRadius: T.radiusMd }}>
      <div style={{ padding: "1rem 1.25rem", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 18 }}>⚖️</span>
        <span style={{ fontSize: 15, fontWeight: 600, color: T.textPrimary }}>השוואה סופית</span>
        <span style={{ fontSize: 12, color: T.textMuted, marginRight: "auto" }}>CAGR שנתי | {years} שנים</span>
      </div>

      <div style={{ padding: "1rem 1.25rem" }}>

        {/* BEHAVIOR GAP BANNER */}
        <div style={{ marginBottom: "1.5rem", border: humanMode ? `2px solid ${T.negative}` : `2px solid ${T.gold}`, borderRadius: T.radiusMd, overflow: "hidden", boxShadow: humanMode ? `0 0 24px ${T.negative}33` : `0 0 16px ${T.gold}22` }}>
          <div style={{ background: humanMode ? T.negative : `linear-gradient(135deg, #FBF3E0 0%, #F5E8C8 100%)`, padding: "1rem 1.25rem", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <span style={{ fontSize: 22 }}>{humanMode ? "🧠" : "⚠️"}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: humanMode ? "#fff" : "#6B5418" }}>
                {humanMode ? "מצב אנושי — Behavior Gap" : "המדד השיג 10.5% — אבל האם השגת אותם?"}
              </div>
              <div style={{ fontSize: 11, color: humanMode ? "rgba(255,255,255,0.75)" : "#8A6E28", marginTop: 3 }}>
                {humanMode ? `מחושב לפי ${humanReturn}% | מקור: DALBAR QAIB 2023` : "המשקיע הממוצע קיבל 6.8% בפועל — פחד, טיימינג שגוי, צרכי נזילות"}
              </div>
            </div>
            <button onClick={() => setHumanMode(!humanMode)}
              style={{ padding: "9px 20px", background: humanMode ? "rgba(255,255,255,0.15)" : T.gold, color: humanMode ? "#fff" : T.bgApp, border: "none", borderRadius: T.radiusSm, cursor: "pointer", fontSize: 12, fontWeight: 700, whiteSpace: "nowrap" }}>
              {humanMode ? "← חזור לתיאורטי" : "הצג מציאות אנושית →"}
            </button>
          </div>

          {humanMode && (
            <div style={{ padding: "1rem 1.25rem", background: T.bgElevated, borderTop: `1px solid ${T.negative}33` }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: "0.75rem", marginBottom: "0.75rem" }}>
                {[
                  { icon: "😱", title: "מכירה בפחד", desc: "ירידות של 30%+ גורמות לרוב המשקיעים למכור בדיוק בתחתית" },
                  { icon: "🐑", title: "כניסה מאוחרת", desc: "רוב הכסף נכנס אחרי עליות — וקונה בשיא" },
                  { icon: "💸", title: "צרכי נזילות", desc: "משכנתא, חתונה, פיטורים — ומוכרים בזמן הגרוע ביותר" },
                ].map(({ icon, title, desc }) => (
                  <div key={title} style={{ background: T.bgSurface, border: `1px solid ${T.border}`, borderRadius: T.radiusSm, padding: "0.75rem" }}>
                    <div style={{ fontSize: 20, marginBottom: 4 }}>{icon}</div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: T.textPrimary, marginBottom: 4 }}>{title}</div>
                    <div style={{ fontSize: 11, color: T.textSecondary, lineHeight: 1.5 }}>{desc}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, background: T.bgSurface, border: `1px solid ${T.border}`, borderRadius: T.radiusSm, padding: "0.75rem 1rem", marginBottom: "0.75rem" }}>
                <span style={{ fontSize: 12, color: T.textSecondary, whiteSpace: "nowrap" }}>תשואה בפועל:</span>
                <input type="range" min={1} max={indexReturnPct} step={0.1} value={humanReturn} onChange={e => setHumanReturn(parseFloat(e.target.value))} style={{ flex: 1, accentColor: T.negative }} />
                <div style={{ fontSize: 18, fontWeight: 700, color: T.negative, minWidth: 52, textAlign: "center" }}>{humanReturn.toFixed(1)}%</div>
                <button onClick={() => setHumanReturn(DALBAR_RETURN)} style={{ fontSize: 11, padding: "4px 8px", background: T.bgApp, border: `1px solid ${T.border}`, borderRadius: T.radiusSm, cursor: "pointer", color: T.textSecondary }}>DALBAR</button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: "0.75rem" }}>
                {[
                  { label: "תיאורטי", value: `${idx.roeAnnual.toFixed(1)}%`, color: T.info },
                  { label: "אנושי", value: `${humanResult.roeAnnual.toFixed(1)}%`, color: T.negative },
                  { label: "Behavior Gap", value: `${(idx.roeAnnual - humanResult.roeAnnual).toFixed(1)}%`, color: T.textMuted },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{ textAlign: "center", background: T.bgSurface, border: `1px solid ${T.border}`, borderRadius: T.radiusSm, padding: "0.6rem" }}>
                    <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 4 }}>{label}</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color }}>{value}</div>
                  </div>
                ))}
              </div>
              <div style={{ padding: "0.6rem 0.75rem", background: `${T.negative}11`, borderRadius: T.radiusSm, borderRight: `3px solid ${T.negative}` }}>
                <span style={{ fontSize: 12, color: T.textSecondary, fontStyle: "italic" }}>
                  "נדל״ן כופה עליך להחזיק. המשכנתא לא מאפשרת פאניקה."
                </span>
              </div>
            </div>
          )}
        </div>

        {/* מסקנה */}
        <div style={{ background: T.bgApp, border: `1px solid ${T.border}`, borderRadius: T.radiusMd, padding: "1rem 1.25rem", marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <div style={{ fontSize: 32 }}>{winner === "נדל״ן" ? "🏠" : "📈"}</div>
          <div>
            <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 2 }}>{humanMode ? "במציאות האנושית — עדיפות ל" : "בתסריט הריאלי — עדיפות ל"}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: T.gold }}>{winner}</div>
            <div style={{ fontSize: 12, color: T.textMuted }}>הפרש {diff}% CAGR שנתי</div>
          </div>
          <div style={{ marginRight: "auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", textAlign: "center" }}>
            <div>
              <div style={{ fontSize: 11, color: T.textMuted }}>נדל״ן (ריאלי)</div>
              <div style={{ fontSize: 26, fontWeight: 700, color: reROE >= 0 ? T.positive : T.negative }}>{reROE >= 0 ? "+" : ""}{reROE.toFixed(1)}%</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: T.textMuted }}>{humanMode ? `מדדים (${humanReturn}%)` : "מדדים (ריאלי)"}</div>
              <div style={{ fontSize: 26, fontWeight: 700, color: activeROE >= 0 ? T.positive : T.negative }}>{activeROE >= 0 ? "+" : ""}{activeROE.toFixed(1)}%</div>
            </div>
          </div>
        </div>

        {/* גרפים */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: "1.5rem", marginBottom: "1.5rem" }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: T.textSecondary, marginBottom: 8 }}>CAGR — 3 תסריטים</div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={barData} layout="vertical" margin={{ top:0, right:20, left:0, bottom:0 }}>
                <XAxis type="number" tickFormatter={v=>`${v}%`} tick={{ fontSize:11, fill:T.textMuted }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize:11, fill:T.textMuted }} width={45} />
                <Tooltip formatter={(v:any)=>`${v}%`} contentStyle={{ background:T.bgElevated, border:`1px solid ${T.border}`, borderRadius:T.radiusSm, color:T.textPrimary }} />
                <Legend wrapperStyle={{ fontSize:11 }} />
                <Bar dataKey="נדל״ן" fill={T.chartRE} radius={[0,3,3,0]} />
                <Bar dataKey={humanMode?"מדדים (אנושי)":"מדדים"} fill={humanMode?T.chartHuman:T.chartIdx} radius={[0,3,3,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: T.textSecondary, marginBottom: 8 }}>
              צמיחת אקוויטי — ריאלי
              {humanMode && <span style={{ color: T.negative, marginRight: 6, fontSize: 10 }}>(מדדים: אנושי)</span>}
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={lineData} margin={{ top:0, right:10, left:0, bottom:0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
                <XAxis dataKey="year" tick={{ fontSize:10, fill:T.textMuted }} />
                <YAxis tickFormatter={v=>`₪${(v/1000000).toFixed(1)}M`} tick={{ fontSize:10, fill:T.textMuted }} />
                <Tooltip formatter={(v:any)=>fmtILS(v)} contentStyle={{ background:T.bgElevated, border:`1px solid ${T.border}`, borderRadius:T.radiusSm, color:T.textPrimary }} />
                <Legend wrapperStyle={{ fontSize:11 }} />
                <Line type="monotone" dataKey="נדל״ן" stroke={T.chartRE} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey={humanMode?"מדדים (אנושי)":"מדדים"} stroke={humanMode?T.chartHuman:T.chartIdx} strokeWidth={2} dot={false} strokeDasharray={humanMode?"6 3":undefined} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* טבלה */}
        <table style={{ width:"100%", fontSize:12, borderCollapse:"collapse" }}>
          <thead><tr style={{ borderBottom:`2px solid ${T.border}` }}>
            <th style={{ textAlign:"right", padding:"6px 0", color:T.textMuted, fontWeight:500 }}>קריטריון</th>
            <th style={{ textAlign:"center", padding:"6px 0", color:T.textMuted, fontWeight:500 }}>נדל״ן</th>
            <th style={{ textAlign:"center", padding:"6px 0", color:humanMode?T.negative:T.textMuted, fontWeight:500 }}>{humanMode?`מדדים (${humanReturn}%)`:"מדדים"}</th>
          </tr></thead>
          <tbody>
            {[
              { label:"CAGR שנתי", re:`${reROE.toFixed(1)}%`, ix:`${activeROE.toFixed(1)}%` },
              { label:"רווח כולל נטו", re:fmtILS(re.scenarioTotalReturn.realistic), ix:fmtILS(activeNet) },
              { label:"הון עצמי", re:fmtILS(re.totalEquity), ix:fmtILS(re.totalEquity) },
              { label:"מינוף", re:`×${leverage}`, ix:"אין" },
              { label:"נזילות", re:"נמוכה", ix:"מלאה" },
              { label:"מיסוי", re:re.profile==="single"?"✓ פטור שבח":"25% מס שבח", ix:"25% רווח הון" },
              { label:"כפייה להחזיק", re:"✓ (משכנתא)", ix:humanMode?"✗ (דורש משמעת)":"—" },
            ].map((row, i) => (
              <tr key={i} style={{ borderBottom:`1px solid ${T.border}`, background:i%2===0?T.bgSurface:T.bgElevated }}>
                <td style={{ padding:"6px 0", color:T.textSecondary }}>{row.label}</td>
                <td style={{ textAlign:"center", padding:"6px 0", color:T.textPrimary, fontWeight:500 }}>{row.re}</td>
                <td style={{ textAlign:"center", padding:"6px 0", color:humanMode?T.negative:T.textPrimary, fontWeight:500 }}>{row.ix}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ marginTop:12, fontSize:11, color:T.textMuted, lineHeight:1.6 }}>
          * CAGR = תשואה שנתית מצטברת אמיתית. ** נתון DALBAR מבוסס על ניתוח משקיעים אמריקאים 2023. *** אינו ייעוץ השקעות.
        </div>
      </div>
    </div>
  );
}

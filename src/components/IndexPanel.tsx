import { Panel, Section, Field, NumberInput, Toggle, ResultBadge, Divider, fmtILS } from "@/components/UI";
import type { IndexState, IndexResults } from "@/types";
import { INDEX_LIST } from "@/hooks/useIndexCalc";
import { T } from "@/theme";

interface Props { state: IndexState; dispatch: (a:any)=>void; results: IndexResults; years: number; }

export function IndexPanel({ state: s, dispatch, results: r, years }: Props) {
  const set = (field: keyof IndexState) => (value: any) => dispatch({ type: "SET", field, value });
  return (
    <Panel title="מדדים" icon="📈">
      <div style={{ background: T.bgApp, borderRadius: T.radiusMd, padding: "1rem", marginBottom: "1rem" }}>
        <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 8 }}>תשואה שנתית CAGR — {years} שנים</div>
        <ResultBadge label="" pessimistic={r.scenarioROEAnnual.pessimistic} realistic={r.scenarioROEAnnual.realistic} optimistic={r.scenarioROEAnnual.optimistic} />
        <Divider />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 12 }}>
          <div><span style={{ color: T.textMuted }}>שווי סופי: </span><strong style={{ color: T.textPrimary }}>{fmtILS(r.finalValue)}</strong></div>
          <div><span style={{ color: T.textMuted }}>רווח נטו: </span><strong style={{ color: T.positive }}>{fmtILS(r.netReturn)}</strong></div>
        </div>
        <Divider />
        <ResultBadge label="רווח נטו" pessimistic={r.scenarioNetReturn.pessimistic} realistic={r.scenarioNetReturn.realistic} optimistic={r.scenarioNetReturn.optimistic} format="ils" />
      </div>

      <Section title="📊 בחירת מדד">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(110px,1fr))", gap: 6, marginBottom: "0.75rem" }}>
          {INDEX_LIST.map(name => (
            <button key={name} onClick={() => dispatch({ type: "SET_INDEX", name })}
              style={{ padding: "8px 4px", border: `1px solid ${s.selectedIndex===name ? T.gold : T.border}`, borderRadius: T.radiusSm, background: s.selectedIndex===name ? T.bgElevated : T.bgSurface, cursor: "pointer", fontSize: 12, fontWeight: s.selectedIndex===name ? 700 : 400, color: s.selectedIndex===name ? T.gold : T.textSecondary }}>
              {name}
            </button>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: "0.5rem" }}>
          <Field label="תשואה שנתית (%)" hint="ממוצע היסטורי"><NumberInput value={s.returnPct} onChange={set("returnPct")} step={0.5} min={0} max={30} suffix="%" /></Field>
          <Field label="דיבידנד שנתי (%)"><NumberInput value={s.dividendPct} onChange={set("dividendPct")} step={0.1} min={0} max={10} suffix="%" /></Field>
          <Field label="פסימי (סטייה)" hint={`= ${(s.returnPct+s.pessimisticOffset).toFixed(1)}%`}><NumberInput value={s.pessimisticOffset} onChange={set("pessimisticOffset")} step={0.5} min={-15} max={0} suffix="%" /></Field>
          <Field label="אופטימי (סטייה)" hint={`= ${(s.returnPct+s.optimisticOffset).toFixed(1)}%`}><NumberInput value={s.optimisticOffset} onChange={set("optimisticOffset")} step={0.5} min={0} max={15} suffix="%" /></Field>
        </div>
      </Section>

      <Section title="⚙️ הגדרות" defaultOpen={false}>
        <Toggle checked={s.drip} onChange={set("drip")} label="DRIP — השקעה מחדש של דיבידנדים" />
        <div style={{ fontSize: 11, color: T.textMuted, marginTop: 4, marginRight: 40, lineHeight: 1.6 }}>
          {s.drip ? "מס 25% נדחה לסוף התקופה · ריבית דריבית מקסימלית" : "דיבידנדים נמשכים שנתית · מס 25% כל שנה"}
        </div>
        <div style={{ marginTop: "0.75rem", background: T.bgElevated, border: `1px solid ${T.border}`, borderRadius: T.radiusSm, padding: 8, fontSize: 11, color: T.textMuted }}>
          מס רווח הון: <strong>25%</strong> · אין עלויות נלוות · נזילות מלאה
        </div>
      </Section>

      <Section title="📋 ממוצעים היסטוריים" defaultOpen={false}>
        <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
          <thead><tr style={{ borderBottom: `1px solid ${T.border}` }}>
            <th style={{ textAlign: "right", padding: "4px 0", color: T.textMuted, fontWeight: 500 }}>מדד</th>
            <th style={{ textAlign: "center", padding: "4px 0", color: T.textMuted, fontWeight: 500 }}>תשואה</th>
            <th style={{ textAlign: "center", padding: "4px 0", color: T.textMuted, fontWeight: 500 }}>דיבידנד</th>
          </tr></thead>
          <tbody>
            {[{ name:"S&P 500",ret:"10.5%",div:"1.5%" },{ name:"Nasdaq 100",ret:"13.0%",div:"0.7%" },{ name:"MSCI World",ret:"8.5%",div:"2.0%" }].map(row => (
              <tr key={row.name} style={{ borderBottom: `1px solid ${T.border}` }}>
                <td style={{ padding: "5px 0", color: T.textSecondary }}>{row.name}</td>
                <td style={{ textAlign: "center", padding: "5px 0", color: T.positive, fontWeight: 600 }}>{row.ret}</td>
                <td style={{ textAlign: "center", padding: "5px 0", color: T.textMuted }}>{row.div}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ marginTop: 6, fontSize: 11, color: T.textMuted }}>ממוצע 30 שנה. ניתן לשנות ידנית.</div>
      </Section>
    </Panel>
  );
}

import { useState, useRef } from "react";
import { HeroSection } from "@/components/HeroSection";
import { RealEstatePanel } from "@/components/RealEstatePanel";
import { IndexPanel } from "@/components/IndexPanel";
import { ComparisonPanel } from "@/components/ComparisonPanel";
import { Comments } from "@/components/Comments";
import { useRealEstateCalc } from "@/hooks/useRealEstateCalc";
import { useIndexCalc } from "@/hooks/useIndexCalc";
import { T } from "@/theme";
import type { RealEstateState, IndexState } from "@/types";

export default function App() {
  const [equity, setEquity] = useState(500000);
  const [years, setYears] = useState(10);
  const calcRef = useRef<HTMLDivElement>(null);

  const realEstate = useRealEstateCalc(equity, years);
  const index = useIndexCalc(equity, years);

  function handleScenario(re: RealEstateState, idx: IndexState, eq: number, yr: number) {
    setEquity(eq);
    setYears(yr);
    realEstate.dispatch({ type: "LOAD", state: re });
    index.dispatch({ type: "LOAD", state: idx });
    setTimeout(() => calcRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
  }

  return (
    <div style={{ fontFamily: T.fontFamily, direction: "rtl", minHeight: "100vh", background: T.bgApp, color: T.textPrimary }}>
      <link href="https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;500;600;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />

      {/* STICKY HEADER */}
      <header className="app-header" style={{ background: T.bgSurface, borderBottom:`1px solid ${T.border}`, position:"sticky", top:0, zIndex:100 }}>
        <div className="app-header-inner" style={{ maxWidth:1400, margin:"0 auto" }}>
          <span style={{ fontSize:16, fontWeight:700, color:T.textPrimary, letterSpacing:"-0.5px", flexShrink:0 }}>נדלן או מדד</span>

          <div className="app-header-controls">
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <label style={{ fontSize:11, color:T.textMuted, whiteSpace:"nowrap", minWidth:60 }}>הון עצמי</label>
              <div style={{ display:"flex", alignItems:"center", gap:4, background:T.bgElevated, border:`1px solid ${T.border}`, borderRadius:T.radiusSm, padding:"6px 8px", flex:1 }}>
                <span style={{ fontSize:12, color:T.textMuted }}>₪</span>
                <input type="number" value={equity} step={10000} min={0} onChange={e=>setEquity(parseFloat(e.target.value)||0)}
                  style={{ width:110, fontSize:13, fontWeight:600, border:"none", background:"transparent", color:T.gold, outline:"none", textAlign:"left", direction:"ltr", minWidth:0 }} />
              </div>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <label style={{ fontSize:11, color:T.textMuted, whiteSpace:"nowrap", minWidth:60, display:"none" }}>טווח</label>
              <div style={{ display:"flex", alignItems:"center", gap:4, background:T.bgElevated, border:`1px solid ${T.border}`, borderRadius:T.radiusSm, padding:"5px 6px", flex:1, justifyContent:"center" }}>
                {[5,10,15,20].map(y=>(
                  <button key={y} onClick={()=>setYears(y)}
                    style={{ flex:1, padding:"4px 8px", borderRadius:T.radiusSm-2, border:"none", fontSize:12, fontWeight:years===y?700:400, background:years===y?T.gold:"transparent", color:years===y?T.bgApp:T.textMuted, cursor:"pointer" }}>
                    {y}
                  </button>
                ))}
                <span style={{ fontSize:11, color:T.textMuted, flexShrink:0 }}>שנ׳</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* HERO */}
      <HeroSection onScenario={handleScenario} onScrollToCalc={() => calcRef.current?.scrollIntoView({ behavior:"smooth" })} />

      {/* CALCULATOR */}
      <div ref={calcRef} style={{ maxWidth:1400, margin:"0 auto", padding:"1.5rem" }} className="calc-container">
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))", gap:"1.25rem", alignItems:"start" }}>
          <RealEstatePanel state={realEstate.state} dispatch={realEstate.dispatch} results={realEstate.results} years={years} />
          <IndexPanel state={index.state} dispatch={index.dispatch} results={index.results} years={years} />
        </div>
        <div style={{ marginTop:"1.25rem" }}>
          <ComparisonPanel
            realEstateResults={realEstate.results} indexResults={index.results}
            years={years} equity={equity}
            indexReturnPct={index.state.returnPct} indexDividendPct={index.state.dividendPct} drip={index.state.drip}
          />
        </div>
        <Comments />
        <div style={{ marginTop:"2rem", padding:"1.25rem 0", borderTop:`1px solid ${T.border}`, display:"flex", justifyContent:"space-between", flexWrap:"wrap", gap:"0.5rem" }}>
          <div style={{ fontSize:11, color:T.textMuted }}><strong style={{ color:T.textSecondary }}>נדלן או מדד</strong> — אינו ייעוץ השקעות.</div>
          <div style={{ fontSize:11, color:T.textMuted }}>מקורות: DALBAR 2023 · הלמ"ס · בנק ישראל · madlan.co.il</div>
        </div>
      </div>
    </div>
  );
}

import { T } from "@/theme";
import type { RealEstateState } from "@/types";
import { DEFAULT_RE_STATE } from "@/hooks/useRealEstateCalc";
import { DEFAULT_IDX_STATE } from "@/hooks/useIndexCalc";
import type { IndexState } from "@/types";

interface Props {
  onScenario: (re: RealEstateState, idx: IndexState, equity: number, years: number) => void;
  onScrollToCalc: () => void;
}

const SCENARIOS = [
  {
    icon: "👫",
    title: "זוג עם 700K הון עצמי",
    desc: "דירה ראשונה להשקעה מול מדדים",
    equity: 700000,
    years: 10,
    re: { ...DEFAULT_RE_STATE, propertyPrice: 1800000, city: "ראשון לציון", profile: "investment" as const, monthlyRent: 4800, realisticGrowth: 6, pessimisticGrowth: 4, optimisticGrowth: 9 },
    idx: { ...DEFAULT_IDX_STATE, selectedIndex: "S&P 500", returnPct: 10.5 },
  },
  {
    icon: "🏠",
    title: "משקיע דירה שנייה",
    desc: "כולל מס רכישה 8% מלא",
    equity: 1200000,
    years: 15,
    re: { ...DEFAULT_RE_STATE, propertyPrice: 3000000, city: "תל אביב", profile: "investment" as const, monthlyRent: 8000, realisticGrowth: 7, pessimisticGrowth: 5, optimisticGrowth: 10 },
    idx: { ...DEFAULT_IDX_STATE, selectedIndex: "S&P 500", returnPct: 10.5 },
  },
  {
    icon: "📈",
    title: "משקיע מדדים פסיבי",
    desc: "השקעה ארוכת טווח עם DRIP",
    equity: 500000,
    years: 20,
    re: { ...DEFAULT_RE_STATE, propertyPrice: 1500000, city: "חיפה", profile: "investment" as const, monthlyRent: 3800, realisticGrowth: 5, pessimisticGrowth: 3, optimisticGrowth: 8 },
    idx: { ...DEFAULT_IDX_STATE, selectedIndex: "S&P 500", returnPct: 10.5, drip: true },
  },
  {
    icon: "⚡",
    title: "מינוף גבוה",
    desc: "בדיקת השפעת הריבית על התשואה",
    equity: 600000,
    years: 10,
    re: { ...DEFAULT_RE_STATE, propertyPrice: 2500000, city: "תל אביב", profile: "investment" as const, mortgageRate: 5.5, monthlyRent: 7000, realisticGrowth: 7, pessimisticGrowth: 4, optimisticGrowth: 10 },
    idx: { ...DEFAULT_IDX_STATE, selectedIndex: "Nasdaq 100", returnPct: 13.0 },
  },
];

const TRUST_ITEMS = [
  "מס רכישה לפי פרופיל",
  "מס שבח + פחת מצטבר",
  "לוח סילוקין אמיתי",
  "ריבית משכנתא דינמית",
  "DRIP במדדים",
  "אינפלציית הוצאות",
  "פירעון מוקדם",
  "CAGR על ההון העצמי",
  "Behavior Gap — DALBAR",
  "3 תסריטים לכל השוואה",
  "מיסוי שכירות 3 מסלולים",
  "עלויות רכישה מלאות",
];

export function HeroSection({ onScenario, onScrollToCalc }: Props) {
  return (
    <div>
      {/* ===== HERO ===== */}
      <div style={{
        background: `linear-gradient(160deg, #0f0f12 0%, ${T.bgApp} 60%)`,
        borderBottom: `1px solid ${T.border}`,
        padding: "4rem 1.5rem 3rem",
        textAlign: "center",
      }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          {/* Label */}
          <div style={{ fontSize: 12, color: T.gold, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "1.25rem", opacity: 0.85 }}>
            השוואת השקעות אמיתית בישראל
          </div>

          {/* Headline */}
          <h1 style={{ fontSize: "clamp(22px, 5vw, 40px)", fontWeight: 700, color: T.textPrimary, lineHeight: 1.25, margin: "0 0 1rem", letterSpacing: "-0.5px" }}>
            נדל״ן או S&P 500?{" "}
            <span style={{ color: T.gold }}>סוף סוף עם המספרים האמיתיים.</span>
          </h1>

          {/* Subheadline */}
          <p style={{ fontSize: "clamp(13px, 2.5vw, 16px)", color: T.textSecondary, lineHeight: 1.7, margin: "0 0 2rem", maxWidth: 600, marginInline: "auto" }}>
            המחשבון הראשון בישראל שמשווה תשואה אמיתית על ההון העצמי —
            כולל משכנתא, מיסוי, עלויות רכישה, DRIP ו־Behavior Gap.
          </p>

          {/* CTAs */}
          <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
            <button onClick={onScrollToCalc}
              style={{ padding: "12px 28px", background: T.gold, color: T.bgApp, border: "none", borderRadius: T.radiusMd, fontSize: 14, fontWeight: 700, cursor: "pointer", letterSpacing: "-0.2px" }}>
              בדוק מה באמת עדיף עבורך
            </button>
            <button onClick={() => onScenario(SCENARIOS[0].re, SCENARIOS[0].idx, SCENARIOS[0].equity, SCENARIOS[0].years)}
              style={{ padding: "12px 28px", background: "transparent", color: T.textSecondary, border: `1px solid ${T.border}`, borderRadius: T.radiusMd, fontSize: 14, fontWeight: 500, cursor: "pointer" }}>
              נסה תרחיש לדוגמה
            </button>
          </div>
        </div>
      </div>

      {/* ===== TRUST LAYER ===== */}
      <div style={{ background: T.bgSurface, borderBottom: `1px solid ${T.border}`, padding: "2rem 1.5rem" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "1.25rem" }}>
            <span style={{ fontSize: 12, color: T.textMuted, letterSpacing: "0.08em", textTransform: "uppercase" }}>
              מה מחושב כאן באמת?
            </span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", justifyContent: "center" }}>
            {TRUST_ITEMS.map(item => (
              <div key={item} style={{
                display: "flex", alignItems: "center", gap: 6,
                background: T.bgElevated, border: `1px solid ${T.border}`,
                borderRadius: T.radiusFull, padding: "5px 12px",
                fontSize: 12, color: T.textSecondary,
              }}>
                <span style={{ color: T.positive, fontSize: 10 }}>✓</span>
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ===== SCENARIOS ===== */}
      <div style={{ background: T.bgApp, borderBottom: `1px solid ${T.border}`, padding: "2rem 1.5rem" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "1.25rem" }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: T.textPrimary }}>נסה תרחיש מוכן</span>
            <p style={{ fontSize: 12, color: T.textMuted, margin: "4px 0 0" }}>לחץ על תרחיש — כל השדות ימולאו אוטומטית</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "0.75rem" }}>
            {SCENARIOS.map((s, i) => (
              <button key={i} onClick={() => onScenario(s.re, s.idx, s.equity, s.years)}
                style={{
                  background: T.bgSurface, border: `1px solid ${T.border}`,
                  borderRadius: T.radiusMd, padding: "1rem",
                  cursor: "pointer", textAlign: "right", transition: "all 0.15s",
                  display: "block", width: "100%",
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = T.gold; (e.currentTarget as HTMLElement).style.background = T.bgElevated; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = T.border; (e.currentTarget as HTMLElement).style.background = T.bgSurface; }}
              >
                <div style={{ fontSize: 22, marginBottom: 6 }}>{s.icon}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: T.textPrimary, marginBottom: 4 }}>{s.title}</div>
                <div style={{ fontSize: 11, color: T.textMuted }}>{s.desc}</div>
                <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 10, background: T.bgElevated, border: `1px solid ${T.border}`, borderRadius: T.radiusFull, padding: "2px 8px", color: T.textMuted }}>
                    ₪{(s.equity / 1000).toFixed(0)}K הון
                  </span>
                  <span style={{ fontSize: 10, background: T.bgElevated, border: `1px solid ${T.border}`, borderRadius: T.radiusFull, padding: "2px 8px", color: T.textMuted }}>
                    {s.years} שנים
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

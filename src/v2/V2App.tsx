import { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { T } from '@/theme';
import { compareInvestments } from './engine/comparison/compare';
import { assessRisk, buildVerdict, type RiskLevel } from './engine/risk/riskAssessment';
import { DEFAULT_INDEX, DEFAULT_REAL_ESTATE } from './data/defaults';
import type { ComparisonInput } from './types';

const nis = (n: number) => '₪' + Math.round(n).toLocaleString('en-US');
const pct = (n: number) => (n * 100).toFixed(1) + '%';
const compact = (n: number) => {
  if (Math.abs(n) >= 1_000_000) return '₪' + (n / 1_000_000).toFixed(1) + 'M';
  if (Math.abs(n) >= 1_000) return '₪' + Math.round(n / 1_000) + 'K';
  return '₪' + Math.round(n);
};

const RISK_COLOR: Record<RiskLevel, string> = {
  low: T.positive,
  medium: T.gold,
  high: T.negative,
};
const RISK_LABEL: Record<RiskLevel, string> = {
  low: 'נמוך',
  medium: 'בינוני',
  high: 'גבוה',
};

interface Inputs {
  price: number;
  capital: number;
  rent: number;
  rate: number;
  years: number;
  appreciation: number;
  indexReturn: number;
  inflation: number;
  singleProperty: boolean;
}

const INITIAL: Inputs = {
  price: 1_800_000,
  capital: 700_000,
  rent: 5_500,
  rate: 4,
  years: 20,
  appreciation: 4.5,
  indexReturn: 8,
  inflation: 3,
  singleProperty: false,
};

export default function V2App() {
  const [inp, setInp] = useState<Inputs>(INITIAL);

  const { result, risks, verdict } = useMemo(() => {
    const input: ComparisonInput = {
      common: {
        years: inp.years,
        inflationRate: inp.inflation / 100,
        initialCapital: inp.capital,
      },
      realEstate: {
        ...DEFAULT_REAL_ESTATE,
        purchasePrice: inp.price,
        mortgage: { annualRate: inp.rate / 100, termYears: 25 },
        rent: { ...DEFAULT_REAL_ESTATE.rent, monthlyRent: inp.rent },
        appreciation: {
          value: inp.appreciation / 100,
          source: 'user',
          label: 'הנחת עליית ערך',
        },
        tax: {
          ...DEFAULT_REAL_ESTATE.tax,
          profile: inp.singleProperty ? 'single' : 'investment',
          assumeShevachExemption: inp.singleProperty,
        },
      },
      index: { ...DEFAULT_INDEX, annualReturn: inp.indexReturn / 100 },
      reinvestPositiveCashflow: true,
    };
    const result = compareInvestments(input);
    return {
      result,
      risks: assessRisk(input, result),
      verdict: buildVerdict(input, result),
    };
  }, [inp]);

  const re = result.realEstate;
  const idx = result.index;
  const reRes = re.result;

  // נתוני גרפים — נקודה לשנה
  const chartData = useMemo(() => {
    const rows = [];
    for (let y = 0; y <= inp.years; y++) {
      const m = y * 12;
      const ledgerRow = m > 0 ? reRes.ledger[m - 1] : null;
      const propertyValue = ledgerRow ? ledgerRow.propertyValue : inp.price;
      const balance = ledgerRow ? ledgerRow.mortgageBalance : reRes.mortgagePrincipal;
      rows.push({
        year: y,
        equity: propertyValue - balance,
        portfolio: idx.result.monthlyValues[m] ?? 0,
        balance,
        rent: ledgerRow ? ledgerRow.rentEffective : inp.rent,
        payment: ledgerRow ? ledgerRow.mortgagePayment : reRes.monthlyPayment,
      });
    }
    return rows;
  }, [reRes, idx, inp]);

  const winnerColor =
    result.winner === 'real-estate'
      ? T.chartRE
      : result.winner === 'index'
        ? T.chartIdx
        : T.textSecondary;

  return (
    <div
      style={{
        fontFamily: T.fontFamily,
        direction: 'rtl',
        background: T.bgApp,
        minHeight: '100vh',
        color: T.textPrimary,
      }}
    >
      <link
        href="https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;500;600;700&display=swap"
        rel="stylesheet"
      />

      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '32px 20px 80px' }}>
        <div style={{ marginBottom: 8, fontSize: 13, color: T.textMuted, letterSpacing: 1 }}>
          נדל״ן או מדד · מנוע החלטה
        </div>

        {/* ─── פסק הדין ─── */}
        <section
          style={{
            background: T.bgSurface,
            border: `1px solid ${T.border}`,
            borderTop: `3px solid ${winnerColor}`,
            borderRadius: T.radiusLg,
            padding: '28px 26px',
            marginBottom: 20,
          }}
        >
          <h1 style={{ fontSize: 26, fontWeight: 600, margin: 0, lineHeight: 1.35 }}>
            {verdict.headline}
          </h1>
          <div style={{ marginTop: 10, fontSize: 15, color: T.textSecondary }}>
            פער בהון הסופי: <strong>{nis(Math.abs(result.gap))}</strong>
          </div>

          <div style={{ marginTop: 22, display: 'grid', gap: 22, gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
            <div>
              <Eyebrow>למה</Eyebrow>
              <ul style={{ margin: '8px 0 0', paddingInlineStart: 18, fontSize: 14, lineHeight: 1.7, color: T.textSecondary }}>
                {verdict.reasons.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
            <div>
              <Eyebrow>מה ישנה את התוצאה</Eyebrow>
              <ul style={{ margin: '8px 0 0', paddingInlineStart: 18, fontSize: 14, lineHeight: 1.7, color: T.textSecondary }}>
                {verdict.changes.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* ─── מדדים ─── */}
        <section
          style={{
            background: T.bgSurface,
            border: `1px solid ${T.border}`,
            borderRadius: T.radiusLg,
            padding: '4px 0',
            marginBottom: 20,
            overflowX: 'auto',
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr>
                <th style={thStyle}>&nbsp;</th>
                <th style={{ ...thStyle, color: T.chartRE }}>נדל״ן</th>
                <th style={{ ...thStyle, color: T.chartIdx }}>מדד</th>
              </tr>
            </thead>
            <tbody>
              <Row label="מזומן שהושקע" a={nis(re.totalCashInvested)} b={nis(idx.totalCashInvested)} />
              <Row label="הון סופי נטו" a={nis(re.finalNetWealth)} b={nis(idx.finalNetWealth)} strong />
              <Row
                label="תשואה פנימית"
                a={re.irr.ok ? pct(re.irr.annual) : 'לא ניתן לחשב'}
                b={idx.irr.ok ? pct(idx.irr.annual) : 'לא ניתן לחשב'}
                strong
              />
              <Row label="מכפיל הון" a={re.equityMultiple.toFixed(2)} b={idx.equityMultiple.toFixed(2)} />
              <Row
                label="CAGR"
                a={pct(re.cagr)}
                b={pct(idx.cagr)}
                note="מדד משני — מתעלם מתזמון התזרימים"
              />
            </tbody>
          </table>
        </section>

        {/* ─── נקודות איזון ─── */}
        <section style={cardStyle}>
          <Eyebrow>נקודות איזון</Eyebrow>
          <div style={{ marginTop: 14, display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
            <BreakEven
              label="עליית ערך נדרשת"
              value={result.breakEven.appreciation.ok ? pct(result.breakEven.appreciation.value) : null}
              current={pct(inp.appreciation / 100)}
            />
            <BreakEven
              label="שכר דירה נדרש"
              value={result.breakEven.monthlyRent.ok ? nis(result.breakEven.monthlyRent.value) : null}
              current={nis(inp.rent)}
            />
            <BreakEven
              label="מחיר רכישה מקסימלי"
              value={result.breakEven.purchasePrice.ok ? nis(result.breakEven.purchasePrice.value) : null}
              current={nis(inp.price)}
            />
          </div>
        </section>

        {/* ─── גרפים ─── */}
        <section style={cardStyle}>
          <Eyebrow>הון נטו לאורך זמן</Eyebrow>
          <div style={{ height: 300, marginTop: 16, direction: 'ltr' }}>
            <ResponsiveContainer>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="gRE" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={T.chartRE} stopOpacity={0.28} />
                    <stop offset="100%" stopColor={T.chartRE} stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="gIdx" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={T.chartIdx} stopOpacity={0.28} />
                    <stop offset="100%" stopColor={T.chartIdx} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={T.border} vertical={false} />
                <XAxis dataKey="year" stroke={T.textMuted} fontSize={12} />
                <YAxis tickFormatter={compact} stroke={T.textMuted} fontSize={12} width={60} />
                <Tooltip
                  formatter={(v) => nis(Number(v))}
                  labelFormatter={(l) => `שנה ${l}`}
                  contentStyle={{ direction: 'rtl', fontFamily: T.fontFamily, borderRadius: T.radiusSm }}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="equity"
                  name="הון בנכס"
                  stroke={T.chartRE}
                  fill="url(#gRE)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="portfolio"
                  name="תיק מדד"
                  stroke={T.chartIdx}
                  fill="url(#gIdx)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section style={cardStyle}>
          <Eyebrow>שכר דירה מול החזר משכנתה</Eyebrow>
          <div style={{ height: 240, marginTop: 16, direction: 'ltr' }}>
            <ResponsiveContainer>
              <LineChart data={chartData}>
                <CartesianGrid stroke={T.border} vertical={false} />
                <XAxis dataKey="year" stroke={T.textMuted} fontSize={12} />
                <YAxis tickFormatter={compact} stroke={T.textMuted} fontSize={12} width={60} />
                <Tooltip
                  formatter={(v) => nis(Number(v))}
                  labelFormatter={(l) => `שנה ${l}`}
                  contentStyle={{ direction: 'rtl', fontFamily: T.fontFamily, borderRadius: T.radiusSm }}
                />
                <Legend />
                <Line type="monotone" dataKey="rent" name="שכר דירה" stroke={T.positive} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="payment" name="החזר" stroke={T.negative} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="balance" name="יתרת משכנתה" stroke={T.textMuted} strokeWidth={1} strokeDasharray="4 3" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* ─── סיכונים ─── */}
        <section style={cardStyle}>
          <Eyebrow>סיכונים</Eyebrow>
          <div style={{ marginTop: 14, display: 'grid', gap: 10 }}>
            {risks.map((r) => (
              <div
                key={r.key}
                style={{
                  display: 'flex',
                  gap: 14,
                  alignItems: 'flex-start',
                  padding: '12px 14px',
                  background: T.bgElevated,
                  borderRadius: T.radiusMd,
                  borderInlineStart: `3px solid ${RISK_COLOR[r.level]}`,
                }}
              >
                <div style={{ minWidth: 92 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{r.label}</div>
                  <div style={{ fontSize: 12, color: RISK_COLOR[r.level], fontWeight: 600 }}>
                    {RISK_LABEL[r.level]}
                  </div>
                </div>
                <div style={{ fontSize: 13.5, color: T.textSecondary, lineHeight: 1.6 }}>
                  {r.explanation}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ─── הנחות ─── */}
        <section style={cardStyle}>
          <Eyebrow>הנחות המודל</Eyebrow>
          <div
            style={{
              marginTop: 16,
              display: 'grid',
              gap: 16,
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            }}
          >
            <Field label="מחיר הדירה" value={inp.price} step={50_000} onChange={(v) => setInp({ ...inp, price: v })} format={nis} />
            <Field label="הון עצמי" value={inp.capital} step={50_000} onChange={(v) => setInp({ ...inp, capital: v })} format={nis} />
            <Field label="שכר דירה חודשי" value={inp.rent} step={250} onChange={(v) => setInp({ ...inp, rent: v })} format={nis} />
            <Field label="ריבית משכנתה" value={inp.rate} step={0.25} onChange={(v) => setInp({ ...inp, rate: v })} format={(v) => v.toFixed(2) + '%'} />
            <Field label="אופק בשנים" value={inp.years} step={1} min={3} max={40} onChange={(v) => setInp({ ...inp, years: v })} format={(v) => String(v)} />
            <Field label="עליית ערך שנתית" value={inp.appreciation} step={0.5} onChange={(v) => setInp({ ...inp, appreciation: v })} format={(v) => v.toFixed(1) + '%'} />
            <Field label="תשואת מדד (כוללת)" value={inp.indexReturn} step={0.5} onChange={(v) => setInp({ ...inp, indexReturn: v })} format={(v) => v.toFixed(1) + '%'} />
            <Field label="אינפלציה" value={inp.inflation} step={0.5} onChange={(v) => setInp({ ...inp, inflation: v })} format={(v) => v.toFixed(1) + '%'} />
          </div>

          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginTop: 18,
              fontSize: 14,
              color: T.textSecondary,
              cursor: 'pointer',
            }}
          >
            <input
              type="checkbox"
              checked={inp.singleProperty}
              onChange={(e) => setInp({ ...inp, singleProperty: e.target.checked })}
            />
            דירה יחידה (מס רכישה מופחת, והנחת פטור ממס שבח)
          </label>
        </section>

        <p style={{ fontSize: 12.5, color: T.textMuted, lineHeight: 1.7, marginTop: 24 }}>
          החישובים הם אומדנים לצורך השוואת השקעות ואינם מהווים ייעוץ מס, ייעוץ משפטי או ייעוץ
          השקעות. מודל מס השבח מפושט — הצמדה למדד ו-25% על הרווח הריאלי, בלי מסלול ליניארי ובלי
          פטור דירת מגורים מזכה.
        </p>
      </div>
    </div>
  );
}

// ─────────────────────── רכיבי עזר ───────────────────────

const cardStyle: React.CSSProperties = {
  background: '#FFFFFF',
  border: '1px solid #E3E1DA',
  borderRadius: 14,
  padding: '22px 24px',
  marginBottom: 20,
};

const thStyle: React.CSSProperties = {
  textAlign: 'start',
  padding: '14px 22px 10px',
  fontSize: 12,
  fontWeight: 600,
  letterSpacing: 0.5,
  color: '#8A8880',
  borderBottom: '1px solid #E3E1DA',
};

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 11.5, fontWeight: 600, letterSpacing: 1.2, color: T.textMuted }}>
      {children}
    </div>
  );
}

function Row({
  label,
  a,
  b,
  strong,
  note,
}: {
  label: string;
  a: string;
  b: string;
  strong?: boolean;
  note?: string;
}) {
  return (
    <tr>
      <td style={{ padding: '13px 22px', borderBottom: `1px solid ${T.bgElevated}` }}>
        <div style={{ fontSize: 14, color: T.textSecondary }}>{label}</div>
        {note && <div style={{ fontSize: 11.5, color: T.textMuted, marginTop: 2 }}>{note}</div>}
      </td>
      <td
        style={{
          padding: '13px 22px',
          borderBottom: `1px solid ${T.bgElevated}`,
          fontSize: strong ? 17 : 15,
          fontWeight: strong ? 600 : 400,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {a}
      </td>
      <td
        style={{
          padding: '13px 22px',
          borderBottom: `1px solid ${T.bgElevated}`,
          fontSize: strong ? 17 : 15,
          fontWeight: strong ? 600 : 400,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {b}
      </td>
    </tr>
  );
}

function BreakEven({
  label,
  value,
  current,
}: {
  label: string;
  value: string | null;
  current: string;
}) {
  return (
    <div style={{ background: T.bgElevated, borderRadius: T.radiusMd, padding: '14px 16px' }}>
      <div style={{ fontSize: 12.5, color: T.textMuted }}>{label}</div>
      <div
        style={{
          fontSize: value ? 22 : 14,
          fontWeight: 600,
          marginTop: 6,
          color: value ? T.textPrimary : T.textMuted,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value ?? 'אין בטווח סביר'}
      </div>
      <div style={{ fontSize: 12, color: T.textMuted, marginTop: 4 }}>הוזן: {current}</div>
    </div>
  );
}

function Field({
  label,
  value,
  step,
  min,
  max,
  onChange,
  format,
}: {
  label: string;
  value: number;
  step: number;
  min?: number;
  max?: number;
  onChange: (v: number) => void;
  format: (v: number) => string;
}) {
  return (
    <div>
      <div style={{ fontSize: 12.5, color: T.textMuted, marginBottom: 6 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <button
          onClick={() => onChange(Math.max(min ?? 0, value - step))}
          style={btnStyle}
          aria-label={`הפחת ${label}`}
        >
          −
        </button>
        <div
          style={{
            flex: 1,
            textAlign: 'center',
            fontSize: 15,
            fontWeight: 500,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {format(value)}
        </div>
        <button
          onClick={() => onChange(Math.min(max ?? Infinity, value + step))}
          style={btnStyle}
          aria-label={`הוסף ${label}`}
        >
          +
        </button>
      </div>
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  width: 30,
  height: 30,
  borderRadius: 6,
  border: '1px solid #E3E1DA',
  background: '#FFFFFF',
  color: '#55534D',
  fontSize: 17,
  cursor: 'pointer',
  lineHeight: 1,
};

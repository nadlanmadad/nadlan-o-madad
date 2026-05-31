import { useState } from "react";
import type { ReactNode } from "react";
import { T } from "@/theme";

export function Panel({ title, icon, children }: { title: string; icon: string; children: ReactNode }) {
  return (
    <div style={{ background: T.bgSurface, border: `1px solid ${T.border}`, borderTop: `3px solid ${T.gold}`, borderRadius: T.radiusMd, overflow: "hidden" }}>
      <div style={{ padding: "1rem 1.25rem", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 18 }}>{icon}</span>
        <span style={{ fontSize: 15, fontWeight: 600, color: T.textPrimary, letterSpacing: "-0.3px" }}>{title}</span>
      </div>
      <div style={{ padding: "1.25rem" }}>{children}</div>
    </div>
  );
}

export function Section({ title, children, defaultOpen = true }: { title: string; children: ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ marginBottom: "0.875rem", border: `1px solid ${T.border}`, borderRadius: T.radiusSm, overflow: "hidden" }}>
      <button onClick={() => setOpen(!open)}
        style={{ width: "100%", background: open ? T.bgElevated : T.bgSurface, border: "none", padding: "0.65rem 1rem", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", fontSize: 12, fontWeight: 500, color: open ? T.textPrimary : T.textSecondary }}>
        <span>{title}</span>
        <span style={{ fontSize: 10, color: T.textMuted, transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}>▼</span>
      </button>
      {open && <div style={{ padding: "0.875rem 1rem", borderTop: `1px solid ${T.border}`, background: T.bgSurface }}>{children}</div>}
    </div>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <div style={{ marginBottom: "0.7rem" }}>
      <label style={{ display: "block", fontSize: 11, color: T.textMuted, marginBottom: 4, fontWeight: 500 }}>{label}</label>
      {children}
      {hint && <span style={{ fontSize: 11, color: T.textMuted, marginTop: 3, display: "block" }}>{hint}</span>}
    </div>
  );
}

export function NumberInput({ value, onChange, min, max, step, prefix, suffix }: {
  value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number; prefix?: string; suffix?: string;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4, background: T.bgInput, border: `1px solid ${T.border}`, borderRadius: T.radiusSm, padding: "5px 8px" }}>
      {prefix && <span style={{ fontSize: 12, color: T.textMuted }}>{prefix}</span>}
      <input type="number" value={value} min={min} max={max} step={step ?? 1}
        onChange={e => onChange(parseFloat(e.target.value) || 0)}
        style={{ flex: 1, fontSize: 13, fontWeight: 500, border: "none", background: "transparent", color: T.textPrimary, outline: "none", textAlign: "left", direction: "ltr", minWidth: 0 }} />
      {suffix && <span style={{ fontSize: 12, color: T.textMuted, whiteSpace: "nowrap" }}>{suffix}</span>}
    </div>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, color: T.textSecondary, marginBottom: "0.4rem" }}>
      <div onClick={() => onChange(!checked)} style={{ width: 32, height: 18, borderRadius: T.radiusFull, background: checked ? T.gold : T.bgElevated, border: `1px solid ${checked ? T.gold : T.border}`, position: "relative", cursor: "pointer", flexShrink: 0, transition: "background 0.2s" }}>
        <div style={{ position: "absolute", top: 2, right: checked ? 2 : 12, width: 12, height: 12, borderRadius: "50%", background: checked ? T.bgApp : T.textMuted, transition: "right 0.2s" }} />
      </div>
      <span>{label}</span>
    </label>
  );
}

export function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      style={{ width: "100%", padding: "6px 8px", fontSize: 13, border: `1px solid ${T.border}`, borderRadius: T.radiusSm, background: T.bgInput, color: T.textPrimary, outline: "none" }}>
      {options.map(o => <option key={o} value={o} style={{ background: T.bgElevated }}>{o}</option>)}
    </select>
  );
}

export function ResultBadge({ label, pessimistic, realistic, optimistic, format = "pct" }: {
  label: string; pessimistic: number; realistic: number; optimistic: number; format?: "pct" | "ils";
}) {
  const fmt = (v: number) => format === "pct"
    ? `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`
    : `${v >= 0 ? "" : "-"}₪${Math.abs(Math.round(v)).toLocaleString()}`;
  const color = (v: number) => v > 0 ? T.positive : v < -5 ? T.negative : T.textSecondary;
  return (
    <div style={{ marginBottom: "0.6rem" }}>
      {label && <div style={{ fontSize: 10, color: T.textMuted, marginBottom: 4, letterSpacing: "0.04em", textTransform: "uppercase" }}>{label}</div>}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
        {[{ k: "פסימי", v: pessimistic }, { k: "ריאלי", v: realistic }, { k: "אופטימי", v: optimistic }].map(({ k, v }) => (
          <div key={k} style={{ background: T.bgElevated, border: `1px solid ${T.border}`, borderRadius: T.radiusSm, padding: "6px 8px", textAlign: "center" }}>
            <div style={{ fontSize: 10, color: T.textMuted, marginBottom: 3 }}>{k}</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: color(v) }}>{fmt(v)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Divider() {
  return <div style={{ borderTop: `1px solid ${T.border}`, margin: "0.75rem 0" }} />;
}

export function fmtILS(n: number) {
  return `₪${Math.round(n).toLocaleString("he-IL")}`;
}

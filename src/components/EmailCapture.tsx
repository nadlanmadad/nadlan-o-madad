import { useState } from "react";
import { T } from "@/theme";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? "YOUR_SUPABASE_URL";
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON ?? "YOUR_ANON_KEY";
const CONNECTED = SUPABASE_URL !== "YOUR_SUPABASE_URL";

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function EmailCapture({ source = "wizard", compact = false }: { source?: string; compact?: boolean }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error" | "exists">("idle");

  async function submit() {
    if (!isValidEmail(email)) { setStatus("error"); return; }
    setStatus("loading");

    if (!CONNECTED) {
      setTimeout(() => setStatus("success"), 600);
      return;
    }

    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/subscribers`, {
        method: "POST",
        headers: {
          apikey: SUPABASE_ANON,
          Authorization: `Bearer ${SUPABASE_ANON}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify({ email: email.trim().toLowerCase(), source }),
      });
      if (res.ok) setStatus("success");
      else if (res.status === 409) setStatus("exists");
      else setStatus("error");
    } catch {
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div style={{ background: `${T.positive}15`, border: `1.5px solid ${T.positive}`, borderRadius: T.radiusMd, padding: compact ? "14px 16px" : "20px", textAlign: "center" }}>
        <div style={{ fontSize: 28, marginBottom: 6 }}>✓</div>
        <div style={{ fontSize: 14, fontWeight: 600, color: T.positive }}>נרשמת בהצלחה!</div>
        <div style={{ fontSize: 12, color: T.textSecondary, marginTop: 4 }}>תקבל את הניתוח המפורט והתובנות הבאות למייל.</div>
      </div>
    );
  }

  if (status === "exists") {
    return (
      <div style={{ background: T.bgElevated, border: `1px solid ${T.border}`, borderRadius: T.radiusMd, padding: compact ? "14px 16px" : "20px", textAlign: "center" }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: T.textPrimary }}>אתה כבר רשום 👍</div>
        <div style={{ fontSize: 12, color: T.textSecondary, marginTop: 4 }}>תודה שאתה איתנו.</div>
      </div>
    );
  }

  return (
    <div style={{ background: `linear-gradient(135deg, #FBF3E0 0%, #F5E8C8 100%)`, border: `1.5px solid ${T.gold}`, borderRadius: T.radiusMd, padding: compact ? "16px" : "20px 24px" }}>
      <div style={{ fontSize: compact ? 15 : 17, fontWeight: 700, color: "#6B5418", marginBottom: 4 }}>
        רוצה את הניתוח המפורט שלך למייל?
      </div>
      <div style={{ fontSize: 12, color: "#8A6E28", marginBottom: 14, lineHeight: 1.5 }}>
        קבל סיכום PDF של ההשוואה + מדריך "איך לבדוק נכס נכון" + תובנה חודשית אחת איכותית. בלי ספאם.
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input
          type="email" value={email} placeholder="האימייל שלך"
          onChange={e => { setEmail(e.target.value); if (status === "error") setStatus("idle"); }}
          onKeyDown={e => { if (e.key === "Enter") submit(); }}
          style={{ flex: 1, minWidth: 180, padding: "12px 14px", fontSize: 14, border: `1.5px solid ${status === "error" ? T.negative : T.border}`, borderRadius: T.radiusSm, background: "#fff", color: T.textPrimary, outline: "none", direction: "ltr", textAlign: "left" }}
        />
        <button onClick={submit} disabled={status === "loading"}
          style={{ padding: "12px 24px", background: T.gold, color: "#fff", border: "none", borderRadius: T.radiusSm, fontSize: 14, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
          {status === "loading" ? "שולח..." : "שלח לי →"}
        </button>
      </div>
      {status === "error" && <div style={{ fontSize: 12, color: T.negative, marginTop: 8 }}>אנא הזן כתובת אימייל תקינה</div>}
    </div>
  );
}

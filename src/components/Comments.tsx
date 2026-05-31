import { useState, useEffect } from "react";
import { T } from "@/theme";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? "YOUR_SUPABASE_URL";
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON ?? "YOUR_ANON_KEY";
const TABLE = "calculator_comments";
const CONNECTED = SUPABASE_URL !== "YOUR_SUPABASE_URL";

interface Comment { id: string; name: string; text: string; created_at: string; likes: number; }

const DEMO: Comment[] = [
  { id:"1", name:"דני כהן", text:"כלי מצוין! הייתי שמח לראות גם השוואה לאגרות חוב ממשלתיות כאפשרות שלישית.", created_at: new Date(Date.now()-7200000).toISOString(), likes:7 },
  { id:"2", name:"מירי לוי", text:"החישוב של מס שבח מדויק. אבל כדאי להוסיף אפשרות לפינוי בינוי — שם הדינמיקה שונה לגמרי.", created_at: new Date(Date.now()-86400000).toISOString(), likes:4 },
  { id:"3", name:"יוסי", text:"ה-Behavior Gap זה בדיוק מה שחסר בכל המחשבונות האחרים. כל הכבוד!", created_at: new Date(Date.now()-259200000).toISOString(), likes:12 },
];

function timeAgo(d: string) {
  const ms = Date.now() - new Date(d).getTime();
  const m = Math.floor(ms/60000), h = Math.floor(ms/3600000), days = Math.floor(ms/86400000);
  if (m<1) return "עכשיו"; if (m<60) return `לפני ${m} דק׳`; if (h<24) return `לפני ${h} שעות`; if (days===1) return "אתמול"; return `לפני ${days} ימים`;
}

const COLORS = [T.info, T.positive, T.goldDim, T.negative];
const avatarColor = (name: string) => COLORS[name.charCodeAt(0) % COLORS.length];

async function req(path: string, opts: RequestInit = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...opts, headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}`, "Content-Type":"application/json", ...(opts.headers||{}) } });
}

export function Comments() {
  const [comments, setComments] = useState<Comment[]>([]);
  const [name, setName] = useState(""); const [text, setText] = useState("");
  const [loading, setLoading] = useState(true); const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(""); const [success, setSuccess] = useState(false);
  const [liked, setLiked] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!CONNECTED) { setTimeout(() => { setComments(DEMO); setLoading(false); }, 400); return; }
    req(`${TABLE}?order=created_at.desc&limit=50`).then(r => r.ok ? r.json() : []).then(d => { setComments(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  async function submit() {
    if (!text.trim()) return;
    setSubmitting(true); setError("");
    const newC: Comment = { id: Date.now().toString(), name: name.trim()||"אנונימי", text: text.trim(), created_at: new Date().toISOString(), likes: 0 };
    if (!CONNECTED) { setComments(p => [newC,...p]); setText(""); setSuccess(true); setTimeout(()=>setSuccess(false),3000); setSubmitting(false); return; }
    try {
      const r = await req(TABLE, { method:"POST", headers:{ Prefer:"return=representation" }, body: JSON.stringify({ name: newC.name, text: newC.text, likes:0 }) });
      if (r.ok) { const [c] = await r.json(); setComments(p=>[c,...p]); setText(""); setSuccess(true); setTimeout(()=>setSuccess(false),3000); }
      else setError("שגיאה. נסה שוב.");
    } catch { setError("שגיאת רשת."); }
    setSubmitting(false);
  }

  async function like(id: string) {
    if (liked.has(id)) return;
    const c = comments.find(x=>x.id===id); if (!c) return;
    setLiked(p=>new Set([...p,id]));
    setComments(p=>p.map(x=>x.id===id?{...x,likes:x.likes+1}:x));
    if (CONNECTED) await req(`${TABLE}?id=eq.${id}`, { method:"PATCH", body: JSON.stringify({likes:c.likes+1}) });
  }

  return (
    <div style={{ background: T.bgSurface, border:`1px solid ${T.border}`, borderTop:`3px solid ${T.gold}`, borderRadius:T.radiusMd, marginTop:"1.25rem" }}>
      <div style={{ padding:"1rem 1.25rem", borderBottom:`1px solid ${T.border}`, display:"flex", alignItems:"center", gap:8 }}>
        <span style={{ fontSize:18 }}>💬</span>
        <div>
          <span style={{ fontSize:15, fontWeight:600, color:T.textPrimary }}>הערות והצעות לשיפור</span>
          <div style={{ fontSize:11, color:T.textMuted, marginTop:1 }}>מצאת בעיה בחישוב? יש רעיון? המחשבון הזה משתפר בזכותך</div>
        </div>
        <span style={{ fontSize:12, color:T.textMuted, background:T.bgElevated, padding:"2px 10px", borderRadius:T.radiusFull, marginRight:"auto" }}>{comments.length}</span>
      </div>
      <div style={{ padding:"1.25rem" }}>
        <div style={{ background:T.bgElevated, border:`1px solid ${T.border}`, borderRadius:T.radiusSm, padding:"1rem", marginBottom:"1.5rem" }}>
          <input value={name} onChange={e=>setName(e.target.value)} placeholder="שם (אופציונלי)" maxLength={50}
            style={{ width:"100%", padding:"7px 10px", fontSize:13, border:`1px solid ${T.border}`, borderRadius:T.radiusSm, background:T.bgInput, color:T.textPrimary, outline:"none", marginBottom:8, boxSizing:"border-box", direction:"rtl" }} />
          <textarea value={text} onChange={e=>setText(e.target.value)} placeholder={'לדוגמה: "חישוב המס לא מתחשב ב..." / "חסר שדה של..."'} maxLength={500} rows={3}
            style={{ width:"100%", padding:"7px 10px", fontSize:13, border:`1px solid ${T.border}`, borderRadius:T.radiusSm, background:T.bgInput, color:T.textPrimary, outline:"none", resize:"vertical", direction:"rtl", boxSizing:"border-box" }} />
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginTop:8 }}>
            <span style={{ fontSize:11, color:T.textMuted }}>{text.length}/500</span>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              {error && <span style={{ fontSize:12, color:T.negative }}>{error}</span>}
              {success && <span style={{ fontSize:12, color:T.positive }}>✓ נשמר!</span>}
              <button onClick={submit} disabled={submitting||!text.trim()}
                style={{ padding:"8px 20px", background:text.trim()?T.gold:"#444", color:text.trim()?T.bgApp:T.textMuted, border:"none", borderRadius:T.radiusSm, cursor:text.trim()?"pointer":"not-allowed", fontSize:13, fontWeight:700 }}>
                {submitting?"שולח...":"שלח ←"}
              </button>
            </div>
          </div>
        </div>
        {loading ? (
          <div style={{ textAlign:"center", padding:"2rem", color:T.textMuted, fontSize:13 }}>⏳ טוען...</div>
        ) : comments.length===0 ? (
          <div style={{ textAlign:"center", padding:"2rem", color:T.textMuted, fontSize:13 }}>💭 עדיין אין הערות — היה הראשון!</div>
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:"0.75rem" }}>
            {comments.map(c => (
              <div key={c.id} style={{ border:`1px solid ${T.border}`, borderRadius:T.radiusSm, padding:"0.875rem 1rem", background:T.bgSurface }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
                  <div style={{ width:30, height:30, borderRadius:"50%", background:avatarColor(c.name), color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:700, flexShrink:0 }}>
                    {c.name.charAt(0).toUpperCase()}
                  </div>
                  <span style={{ fontSize:13, fontWeight:600, color:T.textPrimary }}>{c.name}</span>
                  <span style={{ fontSize:11, color:T.textMuted, marginRight:"auto" }}>{timeAgo(c.created_at)}</span>
                </div>
                <div style={{ fontSize:13, color:T.textSecondary, lineHeight:1.7, marginBottom:10 }}>{c.text}</div>
                <button onClick={()=>like(c.id)}
                  style={{ background:liked.has(c.id)?T.bgElevated:"transparent", border:`1px solid ${liked.has(c.id)?T.gold:T.border}`, borderRadius:T.radiusFull, padding:"3px 12px", fontSize:12, color:liked.has(c.id)?T.gold:T.textMuted, cursor:liked.has(c.id)?"default":"pointer", display:"inline-flex", alignItems:"center", gap:5 }}>
                  👍 {c.likes>0 && <strong>{c.likes}</strong>} <span>{liked.has(c.id)?"תודה!":"מועיל"}</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

import ClientAnalytics from "./ClientAnalytics";
import ProgramPDFButton from "./ProgramPDF";
import CoachStats from "./CoachStats";
import ChatCoach from "./ChatCoach";
import { toast } from "./Toast";
import React, { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";
import { LOGO_B64 } from "../utils/logo";

const G = "#02d1ba";
const ORANGE = "#f97316";
const VIOLET = "#a78bfa";
const RED = "#ef4444";
const PREMIUM_STYLES = {
  card: { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 18, transition: "all 0.2s cubic-bezier(0.22,1,0.36,1)" },
  badge: (color) => ({ display: "inline-flex", alignItems: "center", gap: 4, background: color + "15", border: "1px solid " + color + "30", color, fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 20, letterSpacing: 0.5 }),
};
const G_DIM = "rgba(2,209,186,0.12)";
const G_BORDER = "rgba(2,209,186,0.25)";

// ===== Icon component premium (lucide/feather style) =====
// Remplace TOUS les emojis du dashboard. stroke 1.8 pour finesse, size par defaut 18.
function Icon({ name, size = 18, color = "currentColor", strokeWidth = 1.8 }) {
  const p = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: color, strokeWidth, strokeLinecap: "round", strokeLinejoin: "round" };
  const map = {
    users: <svg {...p}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>,
    document: <svg {...p}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>,
    flame: <svg {...p}><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" /></svg>,
    trending: <svg {...p}><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></svg>,
    alert: <svg {...p}><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>,
    search: <svg {...p}><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>,
    plus: <svg {...p}><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>,
    x: <svg {...p}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>,
    check: <svg {...p}><polyline points="20 6 9 17 4 12" /></svg>,
    refresh: <svg {...p}><polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></svg>,
    "arrow-left": <svg {...p}><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>,
    "arrow-right": <svg {...p}><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>,
    message: <svg {...p}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>,
    calendar: <svg {...p}><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>,
    chart: <svg {...p}><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>,
    apple: <svg {...p}><path d="M12 20.94c1.5 0 2.75 1.06 4 1.06 3 0 6-8 6-12.22A4.91 4.91 0 0 0 17 5c-2.22 0-4 1.44-5 2-1-.56-2.78-2-5-2a4.9 4.9 0 0 0-5 4.78C2 14 5 22 8 22c1.25 0 2.5-1.06 4-1.06z" /><path d="M10 2c1 .5 2 2 2 5" /></svg>,
    lightning: <svg {...p}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>,
    view: <svg {...p}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>,
    trash: <svg {...p}><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>,
    upload: <svg {...p}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>,
    activity: <svg {...p}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>,
  };
  return map[name] || null;
}

function daysAgo(dateStr) {
  if (!dateStr) return null;
  const d = Math.floor((Date.now() - new Date(dateStr)) / 86400000);
  if (d === 0) return "Aujourd'hui";
  if (d === 1) return "Hier";
  return `Il y a ${d}j`;
}
function activityColor(lastSeen) {
  if (!lastSeen) return "#444";
  const d = Math.floor((Date.now() - new Date(lastSeen)) / 86400000);
  if (d <= 1) return G;
  if (d <= 3) return "#4ade80";
  if (d <= 7) return "#f97316";
  return "#ef4444";
}
function Avatar({ name, size = 40, active }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", flexShrink: 0,
      background: active ? G_DIM : "rgba(255,255,255,0.04)",
      border: `2px solid ${active ? G_BORDER : "rgba(255,255,255,0.08)"}`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontWeight: 700, fontSize: size * 0.38, color: active ? G : "#666",
    }}>
      {(name || "?")[0].toUpperCase()}
    </div>
  );
}
function MiniSparkline({ data, color = G, w = 80, h = 28 }) {
  if (!data || data.length < 2) return <span style={{ fontSize: 11, color: "#444" }}>—</span>;
  const vals = data.map(d => d.weight || d.value || 0);
  const min = Math.min(...vals), max = Math.max(...vals);
  const range = max - min || 1;
  const pts = vals.map((v, i) => `${(i / (vals.length - 1)) * w},${h - ((v - min) / range) * (h - 4) - 2}`).join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ overflow: "hidden" }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={pts.split(" ").pop().split(",")[0]} cy={pts.split(" ").pop().split(",")[1]} r="2.5" fill={color} />
    </svg>
  );
}


/* ── Gestionnaire de créneaux ── */
function CreneauxManager() {
  const G = "#02d1ba";
  const [slots, setSlots] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [date, setDate] = React.useState("");
  const [heure, setHeure] = React.useState("09:00");
  const [saving, setSaving] = React.useState(false);
  const [bookings, setBookings] = React.useState([]);

  React.useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    const today = new Date().toISOString().split("T")[0];
    const [slotsRes, bookingsRes] = await Promise.all([
      supabase.from("coach_slots").select("*").order("date").order("heure"),
      supabase.from("bookings").select("*, clients(full_name, email)").order("booked_at", { ascending: false })
    ]);
    setSlots(slotsRes.data || []);
    setBookings(bookingsRes.data || []);
    setLoading(false);
  };

  const addSlot = async () => {
    if (!date || !heure) return;
    setSaving(true);
    await supabase.from("coach_slots").insert({ date, heure, is_available: true });
    setDate("");
    await fetchAll();
    setSaving(false);
  };

  const deleteSlot = async (id) => {
    await supabase.from("coach_slots").delete().eq("id", id);
    await fetchAll();
  };

  const HEURES = ["07:00","08:00","09:00","10:00","11:00","12:00","13:00","14:00","15:00","16:00","17:00","18:00","19:00","20:00"];

  return (
    <div style={{ padding: "16px 0", display: "flex", flexDirection: "column", gap: 20 }}>

      {/* Réservations */}
      {bookings.length > 0 && (
        <div>
          <div style={{ fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: G, marginBottom: 12 }}>Appels réservés</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {bookings.map(b => {
              const slot = slots.find(s => s.id === b.slot_id);
              return (
                <div key={b.id} style={{ background: "rgba(2,209,186,0.05)", border: "1px solid rgba(2,209,186,0.2)", borderRadius: 12, padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{b.clients?.full_name || b.clients?.email}</div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 3 }}>
                      {slot ? new Date(slot.date + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }) + " · " + slot.heure : "Créneau inconnu"}
                    </div>
                  </div>
                  <div style={{ background: "rgba(2,209,186,0.1)", border: "1px solid rgba(2,209,186,0.2)", borderRadius: 100, padding: "4px 12px", fontSize: 10, color: G, fontWeight: 700 }}>Confirmé</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Ajouter un créneau */}
      <div>
        <div style={{ fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: 12 }}>Ajouter un créneau</div>
        <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            min={new Date().toISOString().split("T")[0]}
            style={{ flex: 1, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, color: "#fff", padding: "10px 12px", fontSize: 13, outline: "none", fontFamily: "-apple-system,sans-serif" }} />
          <select value={heure} onChange={e => setHeure(e.target.value)}
            style={{ flex: 1, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, color: "#fff", padding: "10px 12px", fontSize: 13, outline: "none", fontFamily: "-apple-system,sans-serif" }}>
            {HEURES.map(h => <option key={h} value={h} style={{ background: "#1a1a1a" }}>{h}</option>)}
          </select>
          <button onClick={addSlot} disabled={saving || !date}
            style={{ padding: "10px 18px", background: G, border: "none", borderRadius: 10, color: "#000", fontSize: 13, fontWeight: 700, cursor: date ? "pointer" : "not-allowed", opacity: date ? 1 : 0.4 }}>
            {saving ? "..." : "+ Ajouter"}
          </button>
        </div>
      </div>

      {/* Liste des créneaux */}
      <div>
        <div style={{ fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: 12 }}>Créneaux disponibles</div>
        {loading ? (
          <div style={{ color: "rgba(255,255,255,0.2)", fontSize: 13 }}>Chargement...</div>
        ) : slots.filter(s => s.is_available).length === 0 ? (
          <div style={{ color: "rgba(255,255,255,0.2)", fontSize: 13, fontStyle: "italic" }}>Aucun créneau disponible</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {slots.filter(s => s.is_available).map(slot => (
              <div key={slot.id} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 13, color: "#fff", fontWeight: 600 }}>
                    {new Date(slot.date + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
                  </div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 2 }}>{slot.heure}</div>
                </div>
                <button onClick={() => deleteSlot(slot.id)}
                  style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, width: 30, height: 30, color: "#ef4444", fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Créneaux passés/réservés */}
      {slots.filter(s => !s.is_available).length > 0 && (
        <div>
          <div style={{ fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: "rgba(255,255,255,0.2)", marginBottom: 12 }}>Créneaux réservés / passés</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {slots.filter(s => !s.is_available).map(slot => (
              <div key={slot.id} style={{ background: "rgba(255,255,255,0.01)", border: "1px solid rgba(255,255,255,0.04)", borderRadius: 10, padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", opacity: 0.5 }}>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>
                  {new Date(slot.date + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} · {slot.heure}
                </div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.2)" }}>Réservé</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Panel détail client avec messages ── */
function ClientPanel({ client, onClose, onUpload, onDelete }) {
  const [msgText,   setMsgText]   = useState("");
  const [sending,   setSending]   = useState(false);
  const [messages,  setMessages]  = useState([]);
  const [rpeData,   setRpeData]   = useState([]);
  const [tab,       setTab]       = useState("overview"); // overview | messages | progress | nutrition
  const [nutGoals,  setNutGoals]  = useState(null);
  const [nutSaving, setNutSaving] = useState(false);
  const fileRef = useRef();

  const prog = client.programmes?.find(p => p.is_active);
  const logs = client._logs || [];
  const weights = client._weights || [];
  const lastWeight = weights[0];
  const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
  const weekLogs = logs.filter(l => new Date(l.logged_at) >= weekAgo);

  useEffect(() => {
    if (!client.id) return;
    // Charger messages
    supabase.from("messages").select("*").eq("client_id", client.id)
      .order("created_at", { ascending: false }).limit(20)
      .then(({ data }) => setMessages(data || []));
    // Charger RPE
    supabase.from("session_rpe").select("*").eq("client_id", client.id)
      .order("date", { ascending: false }).limit(10)
      .then(({ data }) => setRpeData(data || []));
    // Charger objectifs nutrition
    supabase.from("nutrition_goals").select("*").eq("client_id", client.id).single()
      .then(({ data }) => setNutGoals(data || { calories: 2000, proteines: 150, glucides: 250, lipides: 70, eau_ml: 2500, pas: 8000 }));
  }, [client.id]);

  const sendMessage = async () => {
    if (!msgText.trim() || !client.id) return;
    setSending(true);
    const { error } = await supabase.from("messages").insert({
      client_id: client.id, from_coach: true, content: msgText.trim(),
    });
    if (!error) {
      setMessages(prev => [{ content: msgText.trim(), from_coach: true, created_at: new Date().toISOString(), read: false }, ...prev]);
      setMsgText("");
    }
    setSending(false);
  };

  const RPE_EMOJIS = ["", "😊", "💪", "😤", "😰", "🥵"];
  const RPE_LABELS = ["", "Facile", "Correct", "Difficile", "Très dur", "Épuisant"];
  const RPE_COLORS = ["", "#4ade80", "#02d1ba", "#f97316", "#ef4444", "#dc2626"];

  // Exercices distincts avec progression
  const exMap = {};
  [...logs].reverse().forEach(l => {
    if (!exMap[l.ex_key]) exMap[l.ex_key] = [];
    exMap[l.ex_key].push({ weight: l.weight, date: l.logged_at });
  });
  const topEx = Object.entries(exMap)
    .filter(([, v]) => v.length >= 2)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 4);

  const tabStyle = (t) => ({
    padding: "7px 14px", fontSize: 11, fontWeight: 600,
    background: tab === t ? G_DIM : "transparent",
    border: `1px solid ${tab === t ? G_BORDER : "rgba(255,255,255,0.07)"}`,
    borderRadius: 100, color: tab === t ? G : "#666",
    cursor: "pointer", transition: "all 0.15s",
  });

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(14px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={onClose}>
      <div style={{ background: "#141414", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20, width: "100%", maxWidth: 520, maxHeight: "90vh", display: "flex", flexDirection: "column", animation: "slideUp 0.25s ease" }} onClick={e => e.stopPropagation()}>
        <style>{`@keyframes slideUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}`}</style>

        {/* Header panel */}
        <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
            <Avatar name={client.full_name || client.email} size={48} active={!!prog} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#f5f5f5" }}>{client.full_name || "—"}</div>
              <div style={{ fontSize: 11, color: "#555" }}>{client.email}</div>
            </div>
            {/* Alerte inactivité */}
            {client._inactive && (
              <div style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 100, padding: "5px 10px", fontSize: 10, fontWeight: 700, color: "#ef4444" }}>
                <Icon name="alert" size={11} />
                Inactif {client._inactiveDays}j
              </div>
            )}
            <button onClick={onClose} style={{ background: "none", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, width: 30, height: 30, color: "#666", fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
          </div>

          {/* Stats rapides */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: 14 }}>
            {[
              { l: "Seances", v: Math.ceil(logs.length / 3) || 0, ic: "activity" },
              { l: "Cette sem.", v: weekLogs.length, ic: "flame" },
              { l: "Pesees", v: weights.length, ic: "chart" },
              { l: "RPE moy.", v: rpeData.length ? (rpeData.reduce((a, r) => a + r.rpe, 0) / rpeData.length).toFixed(1) : "—", ic: "trending" },
            ].map((s, i) => (
              <div key={i} style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: "12px 8px 10px", textAlign: "center" }}>
                <div style={{ color: G, display: "flex", justifyContent: "center", marginBottom: 6, opacity: 0.8 }}>
                  <Icon name={s.ic} size={13} />
                </div>
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 18, fontWeight: 200, color: "#fff", lineHeight: 1, letterSpacing: "-0.5px" }}>{s.v}</div>
                <div style={{ fontSize: 8, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "1px", marginTop: 6, fontWeight: 600 }}>{s.l}</div>
              </div>
            ))}
          </div>

          {/* Onglets */}
          <div style={{ display: "flex", gap: 6 }}>
            {[
              ["overview", "Vue", "view"],
              ["messages", "Message", "message"],
              ["progress", "Progression", "chart"],
              ["nutrition", "Nutrition", "apple"],
              ["vivante", "Vivante", "lightning"],
              ["creneaux", "Creneaux", "calendar"],
            ].map(([t, l, ic]) => (
              <button key={t} onClick={() => setTab(t)} style={{ ...tabStyle(t), display: "flex", alignItems: "center", gap: 7, justifyContent: "center" }}>
                <Icon name={ic} size={13} />
                {l}
              </button>
            ))}
          </div>
        </div>

        {/* Contenu onglet */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>

          {/* ── OVERVIEW ── */}
          {tab === "overview" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Programme */}
              <div>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", color: "#444", marginBottom: 8 }}>Programme</div>
                {prog ? (
                  <div style={{ background: "#1a1a1a", borderRadius: 10, padding: "12px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#f5f5f5" }}>{prog.programme_name}</div>
                      <div style={{ fontSize: 10, color: G, marginTop: 2 }}>✓ Actif · {new Date(prog.uploaded_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}</div>
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => fileRef.current?.click()} style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", background: "none", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 7, padding: "5px 10px", cursor: "pointer" }}>Mettre à jour</button>
                      <button onClick={async () => { const {error} = await supabase.from('programmes').update({is_active:false}).eq('id',prog.id); if(error){console.error(error);alert('Erreur: '+error.message);return;} onClose(); }} style={{ fontSize: 10, fontWeight: 700, color: "#ef4444", background: "none", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 7, padding: "5px 10px", cursor: "pointer" }}>Supprimer</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ background: "rgba(249,115,22,0.06)", border: "1px solid rgba(249,115,22,0.2)", borderRadius: 10, padding: 14 }}>
                    <div style={{ fontSize: 12, color: "#f97316", marginBottom: 8 }}>⚠ Aucun programme assigné</div>
                    <button onClick={() => fileRef.current?.click()} style={{ width: "100%", padding: "8px", background: G_DIM, border: `1px solid ${G_BORDER}`, borderRadius: 8, color: G, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>↑ Uploader le programme</button>
                  </div>
                )}
              </div>

              {/* Dernier poids */}
              {lastWeight && (
                <div>
                  <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", color: "#444", marginBottom: 8 }}>Dernier poids</div>
                  <div style={{ background: "#1a1a1a", borderRadius: 10, padding: "12px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div>
                      <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 22, fontWeight: 700, color: G }}>{lastWeight.weight} kg</div>
                      <div style={{ fontSize: 11, color: "#555" }}>{new Date(lastWeight.date).toLocaleDateString("fr-FR", { weekday: "short", day: "2-digit", month: "short" })}</div>
                    </div>
                    {weights.length >= 2 && <MiniSparkline data={[...weights].reverse()} color={G} />}
                  </div>
                </div>
              )}

              {/* RPE récent */}
              {rpeData.length > 0 && (
                <div>
                  <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", color: "#444", marginBottom: 8 }}>Ressenti récent</div>
                  <div style={{ display: "flex", gap: 6 }}>
                    {rpeData.slice(0, 5).map((r, i) => (
                      <div key={i} style={{ flex: 1, background: "#1a1a1a", borderRadius: 8, padding: "8px 4px", textAlign: "center" }}>
                        <div style={{ fontSize: 18 }}>{RPE_EMOJIS[r.rpe]}</div>
                        <div style={{ fontSize: 9, color: RPE_COLORS[r.rpe], fontWeight: 700, marginTop: 2 }}>{r.rpe}/5</div>
                        <div style={{ fontSize: 8, color: "#444" }}>{new Date(r.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Input file toujours présent */}
              <input ref={fileRef} type="file" accept=".html" style={{ display: "none" }}
                onChange={e => { const f = e.target.files?.[0]; if (f) { onUpload(client, f); e.target.value = ""; } }} />
              {/* Actions */}
              <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                <button onClick={() => onDelete(client.id, client.email)} style={{ flex: 1, padding: "10px", background: "none", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 10, color: "#ef4444", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Supprimer</button>
                <button onClick={onClose} style={{ flex: 2, padding: "10px", background: G, border: "none", borderRadius: 10, color: "#0d0d0d", fontSize: 12, fontWeight: 800, cursor: "pointer" }}>Fermer</button>
              </div>
            </div>
          )}

          {/* ── MESSAGES ── */}
          {tab === "messages" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ fontSize: 10, color: "#555", textAlign: "center", marginBottom: 4 }}>
                Envoie un message directement à ton client — il le verra dès sa prochaine connexion
              </div>

              {/* Saisie message */}
              <div style={{ display: "flex", gap: 8 }}>
                <textarea
                  value={msgText}
                  onChange={e => setMsgText(e.target.value)}
                  placeholder="Ex: Super séance ! Augmente de 2.5kg sur le squat la prochaine fois 💪"
                  rows={3}
                  style={{
                    flex: 1, background: "#1a1a1a", border: "1.5px solid rgba(255,255,255,0.08)",
                    borderRadius: 10, padding: "10px 12px", color: "#f5f5f5",
                    fontFamily: "'Inter',sans-serif", fontSize: 13, resize: "none", outline: "none",
                  }}
                  onKeyDown={e => { if (e.key === "Enter" && e.metaKey) sendMessage(); }}
                />
                <button onClick={sendMessage} disabled={!msgText.trim() || sending} style={{
                  alignSelf: "flex-end", width: 44, height: 44, borderRadius: 10,
                  background: msgText.trim() ? G : "#1a1a1a",
                  border: "none", cursor: msgText.trim() ? "pointer" : "not-allowed",
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  fontSize: 18, color: msgText.trim() ? "#0d0d0d" : "#444",
                }}>
                  {sending ? "..." : "→"}
                </button>
              </div>
              <div style={{ fontSize: 10, color: "#444", textAlign: "right" }}>⌘+Entrée pour envoyer</div>

              {/* Historique messages */}
              {messages.length > 0 && (
                <div>
                  <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", color: "#444", marginBottom: 8 }}>Historique</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {messages.map((m, i) => (
                      <div key={i} style={{
                        background: "#1a1a1a", borderRadius: 10, padding: "10px 12px",
                        borderLeft: `3px solid ${m.from_coach ? G : "#6b7280"}`,
                        opacity: m.read ? 0.6 : 1,
                      }}>
                        <div style={{ fontSize: 12, color: "#f5f5f5", lineHeight: 1.5 }}>{m.content}</div>
                        <div style={{ fontSize: 10, color: "#555", marginTop: 4, display: "flex", justifyContent: "space-between" }}>
                          <span>{m.from_coach ? "Toi (coach)" : client.full_name || "Client"}</span>
                          <span>{m.read ? "Lu ✓" : "Non lu"} · {new Date(m.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── PROGRESSION ── */}
          {tab === "vivante" && (
            <div style={{ padding: "16px 0" }}>
              <SeanceVivanteCoach clientId={client.id} clientName={client.full_name} />
            </div>
          )}
          {tab === "creneaux" && (
            <CreneauxManager clientId={client.id} />
          )}

          {tab === "nutrition" && nutGoals && (
            <div style={{ padding: "16px 0", display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", marginBottom: 4 }}>
                Definir les objectifs nutritionnels de {client.full_name?.split(" ")[0] || "ce client"}
              </div>
              {[
                { key: "calories", label: "Calories", unit: "kcal", min: 500, max: 5000, step: 50, color: "#f97316" },
                { key: "proteines", label: "Proteines", unit: "g", min: 50, max: 400, step: 5, color: G },
                { key: "glucides", label: "Glucides", unit: "g", min: 50, max: 600, step: 10, color: "#60a5fa" },
                { key: "lipides", label: "Lipides", unit: "g", min: 20, max: 200, step: 5, color: "#a78bfa" },
                { key: "eau_ml", label: "Eau", unit: "mL", min: 500, max: 5000, step: 250, color: "#38bdf8" },
                { key: "pas", label: "Pas / jour", unit: "pas", min: 2000, max: 20000, step: 500, color: "#34d399" },
              ].map(({ key, label, unit, min, max, step, color }) => (
                <div key={key}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", fontWeight: 600 }}>{label}</div>
                    <div style={{ fontSize: 13, color, fontWeight: 700 }}>{nutGoals[key]?.toLocaleString()} {unit}</div>
                  </div>
                  <input type="range" min={min} max={max} step={step} value={nutGoals[key] || 0}
                    onChange={e => setNutGoals(prev => ({ ...prev, [key]: parseInt(e.target.value) }))}
                    style={{ width: "100%", accentColor: color }} />
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "rgba(255,255,255,0.2)", marginTop: 2 }}>
                    <span>{min.toLocaleString()}</span><span>{max.toLocaleString()}</span>
                  </div>
                </div>
              ))}
              <button onClick={async () => {
                setNutSaving(true);
                await supabase.from("nutrition_goals").upsert({ client_id: client.id, ...nutGoals }, { onConflict: "client_id" });
                setNutSaving(false);
                toast("Objectifs nutrition sauvegardes !");
              }} style={{ padding: "14px", background: G, color: "#000", border: "none", borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: "pointer", marginTop: 4 }}>
                {nutSaving ? "Sauvegarde..." : "Sauvegarder les objectifs"}
              </button>
            </div>
          )}
          {tab === "progress" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <ClientAnalytics clientId={client.id} period={30} />
              {topEx.length === 0 ? (
                <div style={{ textAlign: "center", padding: 32, color: "#444", fontSize: 13 }}>Aucune donnée de progression encore</div>
              ) : (
                topEx.map(([key, data], i) => {
                  const name = key.split("_").slice(-1)[0] || key;
                  const latest = data[data.length - 1];
                  const first = data[0];
                  const delta = latest.weight - first.weight;
                  const max = Math.max(...data.map(d => d.weight));
                  return (
                    <div key={i} style={{ background: "#1a1a1a", borderRadius: 12, padding: "14px 16px" }}>
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 600, color: "#f5f5f5", marginBottom: 2 }}>{name}</div>
                          <div style={{ fontSize: 10, color: "#555" }}>{data.length} séances · max {max} kg</div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 18, fontWeight: 700, color: G }}>{latest.weight} kg</div>
                          <div style={{ fontSize: 10, fontWeight: 600, color: delta > 0 ? G : delta < 0 ? "#ef4444" : "#555" }}>
                            {delta > 0 ? "+" : ""}{delta.toFixed(1)} kg
                          </div>
                        </div>
                      </div>
                      <MiniSparkline data={data} color={G} w={440} h={32} />
                    </div>
                  );
                })
              )}

              {/* Courbe poids */}
              {weights.length >= 2 && (
                <div style={{ background: "#1a1a1a", borderRadius: 12, padding: "14px 16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#f5f5f5" }}>Évolution du poids</div>
                    <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: "#555" }}>
                      {weights[weights.length-1]?.weight} → {weights[0]?.weight} kg
                    </div>
                  </div>
                  <MiniSparkline data={[...weights].reverse()} color={G} w={440} h={40} />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   COACH DASHBOARD PRINCIPAL
══════════════════════════════════════════════ */

function CoachSkeleton() {
  return (
    <div style={{ padding: "16px", animation: "fadeInUp 0.3s ease" }}>
      {/* Header skeleton */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div className="skeleton" style={{ width: 120, height: 20, borderRadius: 6 }} />
        <div className="skeleton" style={{ width: 80, height: 32, borderRadius: 10 }} />
      </div>
      {/* Stats skeleton */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {[...Array(4)].map((_,i) => (
          <div key={i} className="skeleton" style={{ flex: 1, height: 72, borderRadius: 14 }} />
        ))}
      </div>
      {/* Client rows skeleton */}
      {[...Array(5)].map((_,i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
          <div className="skeleton" style={{ width: 40, height: 40, borderRadius: "50%" }} />
          <div style={{ flex: 1 }}>
            <div className="skeleton" style={{ width: "60%", height: 13, borderRadius: 4, marginBottom: 6 }} />
            <div className="skeleton" style={{ width: "40%", height: 10, borderRadius: 4 }} />
          </div>
          <div className="skeleton" style={{ width: 50, height: 22, borderRadius: 20 }} />
        </div>
      ))}
    </div>
  );
}

function SeanceVivanteCoach({ clientId, clientName }) {
  const [text, setText] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [sent, setSent] = React.useState(false);
  const [isLive, setIsLive] = React.useState(false);
  const [recording, setRecording] = React.useState(false);
  const [recordingTime, setRecordingTime] = React.useState(0);
  const [audioBlob, setAudioBlob] = React.useState(null);
  const [liveSession, setLiveSession] = React.useState(null);
  const mediaRef = React.useRef(null);
  const chunksRef = React.useRef([]);
  const timerRef = React.useRef(null);


  React.useEffect(() => {
    if (!clientId) return;
    // Verifier si le client est en seance live
    const check = async () => {
      const { data } = await supabase.from("session_live")
        .select("active, session_name, started_at")
        .eq("client_id", clientId)
        .single();
      if (data?.active) setIsLive(true);
    };
    check();
    const interval = setInterval(check, 10000);
    return () => clearInterval(interval);
  }, [clientId]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Priorite absolue mp4 pour compatibilite iOS Safari
      let mimeType = "audio/webm";
      if (MediaRecorder.isTypeSupported("audio/mp4")) mimeType = "audio/mp4";
      else if (MediaRecorder.isTypeSupported("audio/mp4;codecs=avc1")) mimeType = "audio/mp4;codecs=avc1";
      else if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) mimeType = "audio/webm;codecs=opus";
      console.log("Recording format:", mimeType);
      mediaRef.current = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];
      mediaRef.current.ondataavailable = e => chunksRef.current.push(e.data);
      mediaRef.current.onstop = () => {
        const mimeType = MediaRecorder.isTypeSupported("audio/mp4") ? "audio/mp4" : MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/ogg";
        const blob = new Blob(chunksRef.current, { type: mimeType });
        setAudioBlob(blob);
        stream.getTracks().forEach(t => t.stop());
      };
      mediaRef.current.start();
      setRecording(true);
      setTimeout(() => stopRecording(), 10000);
    } catch(e) {
      alert("Micro non disponible");
    }
  };

  const stopRecording = () => {
    if (mediaRef.current?.state === "recording") {
      mediaRef.current.stop();
      setRecording(false);
    }
  };

  const sendMessage = async () => {
    if (!text.trim() && !audioBlob) return;
    setSending(true);
    let audioUrl = null;

    if (audioBlob) {
      const fileName = `flash_${clientId}_${Date.now()}.webm`;
      const { data: uploadData } = await supabase.storage
        .from("audio-messages")
        .upload(fileName, audioBlob, { contentType: audioBlob.type || "audio/webm" });
      if (uploadData) {
        const { data: urlData } = supabase.storage.from("audio-messages").getPublicUrl(fileName);
        audioUrl = urlData?.publicUrl;
      }
    }

    await supabase.from("coach_messages_flash").insert({
      client_id: clientId,
      text_message: text.trim() || null,
      audio_url: audioUrl,
      expires_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    });

    setSending(false);
    setSent(true);
    setText("");
    setAudioBlob(null);
    setTimeout(() => setSent(false), 3000);
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, padding: "10px 14px", background: isLive ? "rgba(2,209,186,0.08)" : "rgba(255,255,255,0.03)", border: `1px solid ${isLive ? "rgba(2,209,186,0.3)" : "rgba(255,255,255,0.07)"}`, borderRadius: 12 }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: isLive ? "#02d1ba" : "#444", animation: isLive ? "pulse 2s infinite" : "none" }} />
        <div style={{ fontSize: 13, color: isLive ? "#02d1ba" : "rgba(255,255,255,0.3)", fontWeight: 600 }}>
          {isLive ? `${clientName?.split(" ")[0]} est en seance !` : "Pas en seance actuellement"}
        </div>
      </div>

      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginBottom: 12 }}>Message flash — apparait en plein ecran pendant sa seance</div>

      <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Ex: Dernier set. Donne tout." maxLength={80}
        style={{ width: "100%", padding: "12px 14px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, color: "#fff", fontSize: 14, outline: "none", fontFamily: "-apple-system,Inter,sans-serif", resize: "none", height: 80, boxSizing: "border-box", marginBottom: 12 }} />

      <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
        <button onClick={recording ? stopRecording : startRecording} style={{ flex: 1, padding: 12, background: recording ? "rgba(239,68,68,0.1)" : "rgba(255,255,255,0.05)", border: `1px solid ${recording ? "rgba(239,68,68,0.3)" : "rgba(255,255,255,0.1)"}`, borderRadius: 12, color: recording ? "#ef4444" : "rgba(255,255,255,0.5)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
          {recording ? "⏹ Stop (10s max)" : "🎙 Vocal"}
        </button>
        {audioBlob && <div style={{ padding: "12px 14px", background: "rgba(2,209,186,0.08)", border: "1px solid rgba(2,209,186,0.2)", borderRadius: 12, fontSize: 11, color: "#02d1ba" }}>✓ Audio pret</div>}
      </div>

      <button onClick={sendMessage} disabled={sending || (!text.trim() && !audioBlob)} style={{ width: "100%", padding: 14, background: sent ? "rgba(2,209,186,0.1)" : "#02d1ba", color: sent ? "#02d1ba" : "#000", border: sent ? "1px solid rgba(2,209,186,0.3)" : "none", borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
        {sent ? "✓ Message envoye !" : sending ? "Envoi..." : "Envoyer le message flash"}
      </button>
    </div>
  );
}

export function CoachDashboard({ onExit }) {
  const [clients,   setClients]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [uploading, setUploading] = useState(false);
  const [search,    setSearch]    = useState("");
  const [showAdd,   setShowAdd]   = useState(false);
  const [newEmail,  setNewEmail]  = useState("");
  const [newName,   setNewName]   = useState("");
  const [toast,     setToast]     = useState(null);
  const [selected,  setSelected]  = useState(null);
  const [filter,    setFilter]    = useState("all");

  const showToast = (msg, type = "ok") => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

  const loadClients = async () => {
    setLoading(true);
    try {
      const { data: clientsData } = await supabase
        .from("clients")
        .select("*, programmes(id, programme_name, uploaded_at, is_active)")
        .order("created_at", { ascending: false });
      if (!clientsData) return;

      const enriched = await Promise.all(clientsData.map(async (c) => {
        const [{ data: logs }, { data: weights }, { data: rpe }] = await Promise.all([
          supabase.from("exercise_logs").select("*").eq("client_id", c.id).order("logged_at", { ascending: false }).limit(30),
          supabase.from("weight_logs").select("*").eq("client_id", c.id).order("date", { ascending: false }).limit(10),
          supabase.from("session_rpe").select("*").eq("client_id", c.id).order("date", { ascending: false }).limit(5),
        ]);
        const lastActivity = logs?.[0]?.logged_at || weights?.[0]?.date || null;
        const inactiveDays = lastActivity ? Math.floor((Date.now() - new Date(lastActivity)) / 86400000) : 999;
        return {
          ...c,
          _logs: logs || [], _weights: weights || [], _rpe: rpe || [],
          _lastActivity: lastActivity,
          _inactive: inactiveDays >= 7,
          _inactiveDays: inactiveDays < 999 ? inactiveDays : null,
        };
      }));
      setClients(enriched);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadClients(); }, []);

  const addClient = async () => {
    if (!newEmail) return;
    const email = newEmail.trim().toLowerCase();
    const fullName = newName.trim() || null;
    const { error } = await supabase.from("clients").insert({ email, full_name: fullName });
    if (error) { showToast(error.code === "23505" ? "Email déjà utilisé" : error.message, "err"); return; }
    // Envoyer l'email de bienvenue
    try {
      await supabase.functions.invoke("send-welcome", {
        body: { email, full_name: fullName },
      });
    } catch (e) {
      console.warn("Email de bienvenue non envoyé:", e);
    }
    showToast(`${email} ajoute — email de bienvenue envoye`);
    setNewEmail(""); setNewName(""); setShowAdd(false);
    loadClients();
  };

  const deleteClient = async (id, email) => {
    // confirmation supprimee
    await supabase.from("clients").delete().eq("id", id);
    setSelected(null); showToast("Client supprimé"); loadClients();
  };

  const deleteProg = async (progId) => {
    const { error } = await supabase.from("programmes").update({ is_active: false }).eq("id", progId);
    if (error) { console.error("deleteProg error:", error); showToast("Erreur: " + error.message); return; }
    showToast("Programme supprimé.");
    onClose();
  };

  const uploadProg = async (client, file) => {
    setUploading(true);
    try {
      const html = await file.text();
      // Parser le HTML pour extraire le nom du programme
      let progName = file.name.replace(".html", "");
      try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, "text/html");
        const nameEl = doc.getElementById("prog-name");
        const parsed = (nameEl?.value || nameEl?.getAttribute("value") || "").trim();
        if (parsed) progName = parsed;
      } catch(e) { console.warn("Parse name error", e); }
      await supabase.from("programmes").update({ is_active: false }).eq("client_id", client.id);
      const { error } = await supabase.from("programmes").insert({
        client_id: client.id, html_content: html, programme_name: progName || "Programme",
        is_active: true, uploaded_by: (await supabase.auth.getUser()).data.user?.email,
      });
      if (error) throw error;
      showToast(`Programme uploade pour ${client.full_name || client.email}`);
      loadClients();
    } catch (e) { showToast(e.message, "err"); }
    finally { setUploading(false); setSelected(null); }
  };

  // Stats
  const total        = clients.length;
  const withProg     = clients.filter(c => c.programmes?.some(p => p.is_active)).length;
  const activeToday  = clients.filter(c => c._lastActivity && Math.floor((Date.now() - new Date(c._lastActivity)) / 86400000) <= 1).length;
  const activeWeek   = clients.filter(c => c._lastActivity && Math.floor((Date.now() - new Date(c._lastActivity)) / 86400000) <= 7).length;
  const inactiveAlerts = clients.filter(c => c._inactive && c.programmes?.some(p => p.is_active)).length;

  // ===== Clients a agir (inactifs 3j+ OU sans programme) =====
  const clientsToAct = clients
    .filter(c => {
      const hasProg = c.programmes?.some(p => p.is_active);
      if (!hasProg && c.onboarding_done) return true; // onboarde sans programme
      if (hasProg && c._inactiveDays >= 3) return true; // inactif 3j+ avec programme
      return false;
    })
    .sort((a, b) => (b._inactiveDays || 999) - (a._inactiveDays || 999))
    .slice(0, 5);
  const urgentCount = clientsToAct.length;

  // ===== Score Business (0-100) : note globale du business =====
  // Pondere : couverture 20% + activite semaine 30% + activite jour 25% + sans alerte 25%
  const _coverage = total > 0 ? withProg / total : 0;
  const _act7d = withProg > 0 ? activeWeek / withProg : 1;
  const _actDay = withProg > 0 ? activeToday / withProg : 0;
  const _noAlert = withProg > 0 ? Math.max(0, 1 - inactiveAlerts / withProg) : 1;
  const businessScore = total > 0 ? Math.round((_coverage * 20) + (_act7d * 30) + (_actDay * 25) + (_noAlert * 25)) : 0;
  const scoreColor = businessScore >= 80 ? G : businessScore >= 50 ? ORANGE : RED;
  const scoreLabel = businessScore >= 80 ? "Excellent" : businessScore >= 60 ? "Bien" : businessScore >= 40 ? "A ameliorer" : "Critique";

  const filtered = clients
    .filter(c => {
      const s = search.toLowerCase();
      if (s && !c.email.includes(s) && !(c.full_name || "").toLowerCase().includes(s)) return false;
      if (filter === "active") return c._lastActivity && Math.floor((Date.now() - new Date(c._lastActivity)) / 86400000) <= 7;
      if (filter === "noprog") return !c.programmes?.some(p => p.is_active);
      if (filter === "inactive") return c._inactive && c.programmes?.some(p => p.is_active);
      return true;
    })
    .sort((a, b) => {
      if (!a._lastActivity && !b._lastActivity) return 0;
      if (!a._lastActivity) return 1;
      if (!b._lastActivity) return -1;
      return new Date(b._lastActivity) - new Date(a._lastActivity);
    });

  const inp = {
    padding: "10px 13px", background: "#141414",
    border: "1.5px solid rgba(255,255,255,0.08)", borderRadius: 9,
    color: "#f5f5f5", fontFamily: "'Inter',sans-serif", fontSize: 13,
    outline: "none", width: "100%", boxSizing: "border-box",
    transition: "border-color 0.15s",
  };

  return (
    <div style={{ minHeight: "100vh", background: "#050505", fontFamily: "-apple-system,Inter,sans-serif", color: "#fff" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500&display=swap');
        @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
        @keyframes pulseDot{0%,100%{box-shadow:0 0 0 0 rgba(239,68,68,0.7)}50%{box-shadow:0 0 0 6px rgba(239,68,68,0)}}
        @keyframes glowFlame{0%,100%{filter:drop-shadow(0 0 8px rgba(2,209,186,0.4))}50%{filter:drop-shadow(0 0 16px rgba(2,209,186,0.7))}}
        .cd-row:hover{background:rgba(2,209,186,0.04)!important;cursor:pointer}
        .cd-row:hover .cd-arrow{opacity:1!important;transform:translateX(2px)}
        .cd-row:hover .cd-avatar-glow{opacity:1!important}
        .inp-focus:focus{border-color:#02d1ba!important;background:rgba(2,209,186,0.04)!important}
        ::-webkit-scrollbar{width:6px}
        ::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.08);border-radius:3px}
        ::-webkit-scrollbar-thumb:hover{background:rgba(2,209,186,0.3)}
      `}</style>

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", top: 24, left: "50%", transform: "translateX(-50%)",
          background: toast.type === "err" ? "rgba(239,68,68,0.12)" : "rgba(2,209,186,0.1)",
          border: `1px solid ${toast.type === "err" ? "rgba(239,68,68,0.35)" : G_BORDER}`,
          borderRadius: 100, padding: "12px 22px", fontSize: 12, fontWeight: 700,
          color: toast.type === "err" ? RED : G,
          zIndex: 500, boxShadow: "0 16px 40px rgba(0,0,0,0.6), 0 0 30px rgba(2,209,186,0.1)",
          whiteSpace: "nowrap", animation: "fadeUp 0.25s cubic-bezier(0.22,1,0.36,1)",
          display: "flex", alignItems: "center", gap: 8,
          backdropFilter: "blur(20px)",
        }}>
          <Icon name={toast.type === "err" ? "alert" : "check"} size={14} />
          {toast.msg}
        </div>
      )}

      {uploading && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(5,5,5,0.85)", backdropFilter: "blur(16px)", zIndex: 300, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 18 }}>
          <div style={{ width: 48, height: 48, border: "2.5px solid rgba(2,209,186,0.12)", borderTopColor: G, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
          <div style={{ color: G, fontSize: 12, fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase" }}>Upload en cours</div>
        </div>
      )}

      {selected && <ClientPanel client={selected} onClose={() => setSelected(null)} onUpload={uploadProg} onDelete={deleteClient} />}

      {/* ========== TOPBAR ========== */}
      <div style={{
        background: "rgba(5,5,5,0.85)",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
        padding: "0 28px", height: 64,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        position: "sticky", top: 0, zIndex: 100,
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, overflow: "hidden", border: "1px solid rgba(255,255,255,0.1)", background: "#0a0a0a" }}>
            <img src={LOGO_B64} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.1 }}>
            <span style={{ fontSize: 15, fontWeight: 900, color: "#fff", letterSpacing: "-0.3px" }}>
              RB <span style={{ color: G }}>Performance</span>
            </span>
            <span style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.3)", letterSpacing: "3px", marginTop: 2 }}>
              COACH DASHBOARD
            </span>
          </div>
          {inactiveAlerts > 0 && (
            <div style={{
              display: "flex", alignItems: "center", gap: 6,
              background: "rgba(239,68,68,0.1)",
              border: "1px solid rgba(239,68,68,0.3)",
              borderRadius: 100, padding: "5px 12px 5px 10px",
              fontSize: 10, fontWeight: 700, color: RED,
              marginLeft: 8,
              animation: "pulse 2.5s ease-in-out infinite",
            }}>
              <Icon name="alert" size={12} />
              {inactiveAlerts} inactif{inactiveAlerts > 1 ? "s" : ""} 7j+
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={loadClients}
            aria-label="Actualiser"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "8px 14px", color: "rgba(255,255,255,0.5)", fontSize: 11, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontFamily: "inherit", letterSpacing: "0.3px" }}
          >
            <Icon name="refresh" size={13} />
            Actualiser
          </button>
          <button
            onClick={onExit}
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "8px 14px", color: "rgba(255,255,255,0.5)", fontSize: 11, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontFamily: "inherit", letterSpacing: "0.3px" }}
          >
            <Icon name="arrow-left" size={13} />
            Mon app
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "32px 28px 80px", position: "relative" }}>
        {/* Ambient */}
        <div style={{ position: "absolute", top: -40, left: "50%", transform: "translateX(-50%)", width: 800, height: 400, background: "radial-gradient(ellipse at center, rgba(2,209,186,0.06), transparent 60%)", pointerEvents: "none", zIndex: 0 }} />

        <div style={{ position: "relative", zIndex: 1 }}>
          {/* ========== HERO : phrase d'action + score business ========== */}
          <div style={{ display: "flex", gap: 28, alignItems: "flex-start", marginBottom: 32, flexWrap: "wrap", animation: "fadeUp 0.4s ease both" }}>
            {/* Phrase d'action a gauche */}
            <div style={{ flex: 1, minWidth: 280 }}>
              <h1 style={{ fontSize: 48, fontWeight: 900, letterSpacing: "-2.5px", color: "#fff", margin: 0, lineHeight: 0.95 }}>
                {total} client{total > 1 ? "s" : ""}.
                <br />
                {urgentCount > 0 ? (
                  <span style={{ color: urgentCount > 3 ? RED : ORANGE }}>
                    {urgentCount} a agir maintenant.
                  </span>
                ) : (
                  <span style={{ color: G }}>Tout roule.</span>
                )}
              </h1>
              {/* Stats one-liner : lisible en 2 secondes */}
              <div style={{ display: "flex", gap: 16, marginTop: 16, flexWrap: "wrap" }}>
                {[
                  { v: withProg, l: "programmes", c: G },
                  { v: activeToday, l: "en seance", c: activeToday > 0 ? G : "rgba(255,255,255,0.4)" },
                  { v: activeWeek, l: "actifs 7j", c: "rgba(255,255,255,0.5)" },
                  { v: inactiveAlerts, l: "inactifs", c: inactiveAlerts > 0 ? RED : "rgba(255,255,255,0.3)" },
                ].map((s, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "baseline", gap: 5 }}>
                    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 18, fontWeight: 700, color: s.c }}>{s.v}</span>
                    <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", fontWeight: 600 }}>{s.l}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Score Business a droite — gros chiffre seul */}
            <div style={{
              flexShrink: 0, width: 140, textAlign: "center",
              background: "rgba(255,255,255,0.025)",
              border: `1px solid ${scoreColor}30`,
              borderRadius: 24, padding: "24px 16px 20px",
              position: "relative", overflow: "hidden",
              animation: "fadeUp 0.5s ease both",
            }}>
              <div style={{ position: "absolute", top: -30, left: "50%", transform: "translateX(-50%)", width: 160, height: 160, background: `radial-gradient(circle, ${scoreColor}20, transparent 70%)`, pointerEvents: "none" }} />
              <div style={{ position: "relative" }}>
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 56, fontWeight: 200, color: scoreColor, letterSpacing: "-4px", lineHeight: 1 }}>
                  {businessScore}
                </div>
                <div style={{ fontSize: 8, fontWeight: 800, letterSpacing: "3px", textTransform: "uppercase", color: scoreColor, marginTop: 8, opacity: 0.8 }}>
                  Score
                </div>
                <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.5)", marginTop: 4 }}>
                  {scoreLabel}
                </div>
              </div>
            </div>
          </div>

          {/* ========== ALERTES CRITIQUES (clients a agir) ========== */}
          {urgentCount > 0 && (
            <div style={{ marginBottom: 28, animation: "fadeUp 0.5s ease 0.1s both" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: RED, animation: "pulseDot 2s infinite", flexShrink: 0 }} />
                <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "3px", textTransform: "uppercase", color: RED }}>
                  A agir maintenant
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {clientsToAct.map((c) => {
                  const hasProg = c.programmes?.some((p) => p.is_active);
                  const isCritical = c._inactiveDays >= 7;
                  const borderColor = isCritical ? "rgba(239,68,68,0.3)" : "rgba(249,115,22,0.25)";
                  const bgColor = isCritical ? "rgba(239,68,68,0.04)" : "rgba(249,115,22,0.03)";
                  return (
                    <div
                      key={c.id}
                      onClick={() => setSelected(c)}
                      style={{
                        display: "flex", alignItems: "center", gap: 14,
                        padding: "14px 18px",
                        background: bgColor,
                        border: `1px solid ${borderColor}`,
                        borderRadius: 14,
                        cursor: "pointer",
                        transition: "all 0.15s",
                      }}
                    >
                      <Avatar name={c.full_name || c.email} size={34} active={hasProg} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {c.full_name || c.email}
                        </div>
                        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>
                          {!hasProg ? "Sans programme" : `Inactif ${c._inactiveDays}j`}
                          {hasProg && c.programmes?.find((p) => p.is_active)?.programme_name && (
                            <span style={{ color: "rgba(255,255,255,0.25)" }}> · {c.programmes.find((p) => p.is_active).programme_name}</span>
                          )}
                        </div>
                      </div>
                      {isCritical && (
                        <div style={{
                          fontSize: 9, fontWeight: 800, letterSpacing: "1px", textTransform: "uppercase",
                          color: RED, background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.25)",
                          borderRadius: 100, padding: "3px 8px", flexShrink: 0,
                        }}>
                          Critique
                        </div>
                      )}
                      <div style={{ color: "rgba(255,255,255,0.3)", flexShrink: 0 }}>
                        <Icon name="arrow-right" size={14} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ========== BARRE FILTRES + ACTIONS ========== */}
          <div style={{ display: "flex", gap: 10, marginBottom: 16, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ position: "relative", flex: 1, minWidth: 240 }}>
              <div style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.3)", pointerEvents: "none" }}>
                <Icon name="search" size={15} />
              </div>
              <input
                className="inp-focus"
                placeholder="Rechercher un client..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  width: "100%", padding: "13px 16px 13px 42px",
                  background: "rgba(255,255,255,0.025)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 12, color: "#fff",
                  fontFamily: "inherit", fontSize: 14,
                  outline: "none", boxSizing: "border-box",
                  transition: "border-color 0.2s, background 0.2s",
                }}
              />
            </div>

            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {[
                ["all", "Tous", total, null],
                ["active", "Actifs 7j", activeWeek, null],
                ["noprog", "Sans prog.", total - withProg, null],
                ["inactive", "Inactifs", inactiveAlerts, "alert"],
              ].map(([k, l, n, ic]) => {
                const active = filter === k;
                return (
                  <button
                    key={k}
                    onClick={() => setFilter(k)}
                    style={{
                      padding: "8px 14px", fontSize: 11, fontWeight: 700,
                      background: active ? G_DIM : "rgba(255,255,255,0.025)",
                      border: `1px solid ${active ? G_BORDER : "rgba(255,255,255,0.08)"}`,
                      borderRadius: 100,
                      color: active ? G : "rgba(255,255,255,0.45)",
                      cursor: "pointer", whiteSpace: "nowrap",
                      display: "flex", alignItems: "center", gap: 6,
                      fontFamily: "inherit", letterSpacing: "0.2px",
                      transition: "all 0.15s",
                    }}
                  >
                    {ic && <Icon name={ic} size={11} />}
                    {l}
                    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: active ? G : "rgba(255,255,255,0.3)", fontWeight: 600 }}>
                      {n}
                    </span>
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setShowAdd((v) => !v)}
              style={{
                display: "flex", alignItems: "center", gap: 7,
                padding: "11px 18px",
                background: showAdd ? "rgba(255,255,255,0.04)" : `linear-gradient(135deg, ${G}, #0891b2)`,
                border: `1px solid ${showAdd ? "rgba(255,255,255,0.1)" : G}`,
                borderRadius: 12,
                color: showAdd ? "rgba(255,255,255,0.55)" : "#000",
                fontSize: 12, fontWeight: 800, cursor: "pointer",
                boxShadow: showAdd ? "none" : "0 8px 24px rgba(2,209,186,0.25)",
                letterSpacing: "0.3px", textTransform: "uppercase",
                fontFamily: "inherit",
              }}
            >
              <Icon name={showAdd ? "x" : "plus"} size={13} />
              {showAdd ? "Annuler" : "Nouveau client"}
            </button>
          </div>

          {/* ========== FORMULAIRE NOUVEAU CLIENT ========== */}
          {showAdd && (
            <div style={{
              background: "rgba(2,209,186,0.04)",
              border: `1px solid ${G_BORDER}`,
              borderRadius: 18, padding: 24, marginBottom: 20,
              animation: "fadeUp 0.25s cubic-bezier(0.22,1,0.36,1)",
            }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "3px", textTransform: "uppercase", color: G, marginBottom: 18 }}>
                Nouveau client
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 12 }}>
                <div>
                  <label style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase", display: "block", marginBottom: 6 }}>
                    Email *
                  </label>
                  <input
                    className="inp-focus" type="email" placeholder="client@email.com"
                    value={newEmail} onChange={(e) => setNewEmail(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addClient()}
                    style={{ width: "100%", padding: "12px 14px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, color: "#fff", fontFamily: "inherit", fontSize: 14, outline: "none", boxSizing: "border-box", transition: "all 0.2s" }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase", display: "block", marginBottom: 6 }}>
                    Prenom Nom
                  </label>
                  <input
                    className="inp-focus" type="text" placeholder="Thomas Dupont"
                    value={newName} onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addClient()}
                    style={{ width: "100%", padding: "12px 14px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, color: "#fff", fontFamily: "inherit", fontSize: 14, outline: "none", boxSizing: "border-box", transition: "all 0.2s" }}
                  />
                </div>
                <div style={{ display: "flex", alignItems: "flex-end" }}>
                  <button
                    onClick={addClient} disabled={!newEmail}
                    style={{
                      padding: "12px 22px",
                      background: newEmail ? `linear-gradient(135deg, ${G}, #0891b2)` : "rgba(255,255,255,0.04)",
                      border: "none", borderRadius: 10,
                      color: newEmail ? "#000" : "rgba(255,255,255,0.25)",
                      fontSize: 12, fontWeight: 800,
                      cursor: newEmail ? "pointer" : "not-allowed",
                      height: 44, fontFamily: "inherit",
                      textTransform: "uppercase", letterSpacing: "0.5px",
                      boxShadow: newEmail ? "0 8px 24px rgba(2,209,186,0.25)" : "none",
                    }}
                  >
                    Creer
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ========== CLIENT LIST ========== */}
          {loading ? (
            <div style={{ textAlign: "center", padding: 80, color: "rgba(255,255,255,0.35)" }}>
              <div style={{ width: 40, height: 40, border: "2.5px solid rgba(2,209,186,0.1)", borderTopColor: G, borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }} />
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "2px", textTransform: "uppercase" }}>Chargement</div>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: 80, color: "rgba(255,255,255,0.3)" }}>
              <div style={{ marginBottom: 14, display: "flex", justifyContent: "center", color: "rgba(255,255,255,0.2)" }}>
                <Icon name="users" size={40} strokeWidth={1.4} />
              </div>
              <div style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", fontWeight: 600 }}>
                {search || filter !== "all" ? "Aucun client correspondant" : "Aucun client pour l'instant"}
              </div>
              {!search && filter === "all" && (
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 8 }}>
                  Ajoute ton premier client avec le bouton ci-dessus
                </div>
              )}
            </div>
          ) : (
            <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 18, overflow: "hidden" }}>
              {/* Header colonnes */}
              <div style={{
                display: "grid",
                gridTemplateColumns: "2fr 1.4fr 0.9fr 0.7fr 0.9fr 0.9fr 1fr auto",
                padding: "14px 22px",
                borderBottom: "1px solid rgba(255,255,255,0.04)",
                fontSize: 9, fontWeight: 700, letterSpacing: "2px",
                textTransform: "uppercase", color: "rgba(255,255,255,0.3)",
                background: "rgba(255,255,255,0.015)",
              }}>
                <div>Client</div><div>Programme</div><div>Statut</div><div>Seances</div><div>Poids</div><div>RPE</div><div>Dernier contact</div><div></div>
              </div>

              {filtered.map((c, i) => {
                const prog = c.programmes?.find((p) => p.is_active);
                const actColor = activityColor(c._lastActivity);
                const logsCount = Math.ceil(c._logs.length / 3);
                const lastW = c._weights?.[0];
                const lastRpe = c._rpe?.[0];
                const RPE_COLORS = ["", "#4ade80", G, ORANGE, RED, "#dc2626"];
                const RPE_LABELS = ["", "Facile", "Moyen", "Dur", "Tres dur", "Max"];
                const daysAgoStr = daysAgo(c._lastActivity);
                const inactiveDays = c._lastActivity ? Math.floor((Date.now() - new Date(c._lastActivity)) / 86400000) : null;
                const hasProg = c.programmes?.some((p) => p.is_active);

                return (
                  <div
                    key={c.id}
                    className="cd-row"
                    onClick={() => setSelected(c)}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "2fr 1.4fr 0.9fr 0.7fr 0.9fr 0.9fr 1fr auto",
                      padding: "16px 22px",
                      borderBottom: i < filtered.length - 1 ? "1px solid rgba(255,255,255,0.03)" : "none",
                      alignItems: "center", gap: 10,
                      transition: "background 0.2s",
                      animation: `fadeUp ${0.25 + i * 0.03}s ease both`,
                    }}
                  >
                    {/* Nom + avatar */}
                    <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                      <div style={{ position: "relative", flexShrink: 0 }}>
                        <div className="cd-avatar-glow" style={{ position: "absolute", inset: -4, borderRadius: "50%", background: `radial-gradient(circle, ${G}30, transparent 70%)`, opacity: 0, transition: "opacity 0.2s", pointerEvents: "none" }} />
                        <Avatar name={c.full_name || c.email} size={38} active={!!prog} />
                        {c._inactive && hasProg && (
                          <div style={{ position: "absolute", top: -2, right: -2, width: 11, height: 11, borderRadius: "50%", background: RED, border: "2px solid #050505", animation: "pulseDot 2s infinite" }} />
                        )}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {c.full_name || <span style={{ color: "rgba(255,255,255,0.35)", fontWeight: 500 }}>Sans nom</span>}
                        </div>
                        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {c.email}
                        </div>
                      </div>
                    </div>

                    {/* Programme */}
                    <div style={{ minWidth: 0 }}>
                      {prog ? (
                        <>
                          <div style={{ fontSize: 11, fontWeight: 700, color: G, display: "flex", alignItems: "center", gap: 5, overflow: "hidden" }}>
                            <Icon name="check" size={11} />
                            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, minWidth: 0 }}>
                              {prog.programme_name || "Actif"}
                            </span>
                          </div>
                          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 2 }}>
                            {new Date(prog.uploaded_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}
                          </div>
                        </>
                      ) : (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, color: ORANGE, fontWeight: 700 }}>
                          <Icon name="alert" size={11} />
                          Aucun
                        </span>
                      )}
                    </div>

                    {/* Statut / activite */}
                    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      <div style={{
                        width: 8, height: 8, borderRadius: "50%", background: actColor,
                        boxShadow: inactiveDays !== null && inactiveDays <= 1 ? `0 0 10px ${actColor}, 0 0 4px ${actColor}` : "none",
                        flexShrink: 0,
                      }} />
                      <span style={{ fontSize: 10.5, color: actColor, fontWeight: 700, letterSpacing: "0.3px" }}>
                        {!c._lastActivity ? "Jamais" : inactiveDays <= 1 ? "Actif" : inactiveDays <= 7 ? "Cette sem." : inactiveDays + "j"}
                      </span>
                    </div>

                    {/* Seances */}
                    <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 16, fontWeight: 700, color: logsCount > 0 ? "#fff" : "rgba(255,255,255,0.2)" }}>
                      {logsCount}
                    </div>

                    {/* Poids */}
                    <div>
                      {lastW ? (
                        <>
                          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, fontWeight: 700, color: "#fff" }}>
                            {lastW.weight}<span style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginLeft: 2 }}>kg</span>
                          </div>
                          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 2 }}>
                            {new Date(lastW.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}
                          </div>
                        </>
                      ) : (
                        <span style={{ fontSize: 12, color: "rgba(255,255,255,0.2)" }}>—</span>
                      )}
                    </div>

                    {/* RPE (SVG + numero, plus d'emoji) */}
                    <div>
                      {lastRpe ? (
                        <div style={{
                          display: "inline-flex", alignItems: "center", gap: 6,
                          padding: "4px 10px",
                          background: RPE_COLORS[lastRpe.rpe] + "15",
                          border: "1px solid " + RPE_COLORS[lastRpe.rpe] + "30",
                          borderRadius: 100,
                        }}>
                          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, fontWeight: 800, color: RPE_COLORS[lastRpe.rpe] }}>
                            {lastRpe.rpe}
                          </div>
                          <div style={{ fontSize: 9, fontWeight: 700, color: RPE_COLORS[lastRpe.rpe], textTransform: "uppercase", letterSpacing: "0.5px" }}>
                            {RPE_LABELS[lastRpe.rpe]}
                          </div>
                        </div>
                      ) : (
                        <span style={{ fontSize: 12, color: "rgba(255,255,255,0.2)" }}>—</span>
                      )}
                    </div>

                    {/* Dernier contact */}
                    <div style={{
                      fontSize: 11,
                      color: daysAgoStr === null ? "rgba(255,255,255,0.2)" : daysAgoStr === "Aujourd'hui" || daysAgoStr === "Hier" ? G : "rgba(255,255,255,0.5)",
                      fontWeight: 600,
                    }}>
                      {daysAgoStr || "Jamais"}
                    </div>

                    {/* Fleche */}
                    <div className="cd-arrow" style={{ opacity: 0, transition: "all 0.2s", color: G, display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
                      <Icon name="arrow-right" size={16} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

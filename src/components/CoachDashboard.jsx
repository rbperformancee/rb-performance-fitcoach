import ClientAnalytics from "./ClientAnalytics";
import ProgramPDFButton from "./ProgramPDF";
import CoachStats from "./CoachStats";
import ChatCoach from "./ChatCoach";
import { toast } from "./Toast";
import React, { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";
import { LOGO_B64 } from "../utils/logo";

const G = "#02d1ba";
const PREMIUM_STYLES = {
  card: { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 18, transition: "all 0.2s cubic-bezier(0.22,1,0.36,1)" },
  badge: (color) => ({ display: "inline-flex", alignItems: "center", gap: 4, background: color + "15", border: "1px solid " + color + "30", color, fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 20, letterSpacing: 0.5 }),
};
// PREMIUM;
const G_DIM = "rgba(2,209,186,0.12)";
const G_BORDER = "rgba(2,209,186,0.25)";

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
              <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 8, padding: "4px 10px", fontSize: 10, fontWeight: 700, color: "#ef4444" }}>
                ⚠ Inactif {client._inactiveDays}j
              </div>
            )}
            <button onClick={onClose} style={{ background: "none", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, width: 30, height: 30, color: "#666", fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
          </div>

          {/* Stats rapides */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 8, marginBottom: 14 }}>
            {[
              { l: "Séances", v: Math.ceil(logs.length / 3) || 0, icon: "💪" },
              { l: "Cette sem.", v: weekLogs.length, icon: "🔥" },
              { l: "Pesées", v: weights.length, icon: "⚖️" },
              { l: "RPE moy.", v: rpeData.length ? (rpeData.reduce((a, r) => a + r.rpe, 0) / rpeData.length).toFixed(1) : "—", icon: "🧠" },
            ].map((s, i) => (
              <div key={i} style={{ background: "#1a1a1a", borderRadius: 10, padding: "8px 10px", textAlign: "center" }}>
                <div style={{ fontSize: 16 }}>{s.icon}</div>
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 16, fontWeight: 700, color: G, lineHeight: 1.2 }}>{s.v}</div>
                <div style={{ fontSize: 9, color: "#555", textTransform: "uppercase", letterSpacing: "0.5px" }}>{s.l}</div>
              </div>
            ))}
          </div>

          {/* Onglets */}
          <div style={{ display: "flex", gap: 6 }}>
            {[["overview","📋 Vue"], ["messages","💬 Message"], ["progress","📈 Progression"], ["nutrition","🥗 Nutrition"], ["vivante","⚡ Vivante"], ["creneaux","📅 Créneaux"]].map(([t, l]) => (
              <button key={t} onClick={() => setTab(t)} style={tabStyle(t)}>{l}</button>
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
                      <button onClick={async () => { await supabase.from("programmes").update({is_active:false}).eq("id",prog.id); setClient(prev => ({...prev, programmes: prev.programmes?.map(p => p.id===prog.id ? {...p, is_active:false} : p)})); showToast("Programme supprime"); }} style={{ fontSize: 10, fontWeight: 700, color: "#ef4444", background: "none", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 7, padding: "5px 10px", cursor: "pointer" }}>Supprimer</button>
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
    showToast(`✓ ${email} ajouté — email de bienvenue envoyé !`);
    setNewEmail(""); setNewName(""); setShowAdd(false);
    loadClients();
  };

  const deleteClient = async (id, email) => {
    // confirmation supprimee
    await supabase.from("clients").delete().eq("id", id);
    setSelected(null); showToast("Client supprimé"); loadClients();
  };

  const deleteProg = async (progId) => {
    await supabase.from("programmes").update({ is_active: false }).eq("id", progId);
    setClient(prev => ({ ...prev, programmes: prev.programmes?.map(p => p.id === progId ? { ...p, is_active: false } : p) }));
    void(0);
    toast("Programme supprimé.");
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
      showToast(`✓ Programme uploadé pour ${client.full_name || client.email}`);
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
    <div style={{ minHeight: "100vh", background: "#0d0d0d", fontFamily: "'Inter',sans-serif", color: "#f5f5f5" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
        .client-row:hover{background:#1c1c1c!important;cursor:pointer}
        .client-row:hover .row-arrow{opacity:1!important}
        .inp-focus:focus{border-color:#02d1ba!important}
        ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:#333;border-radius:2px}
      `}</style>

      {/* Toast */}
      {toast && (
        <div style={{ position:"fixed", top:16, left:"50%", transform:"translateX(-50%)", background: toast.type==="err"?"#1a0a0a":"#0a1a0f", border:`1px solid ${toast.type==="err"?"rgba(239,68,68,0.3)":G_BORDER}`, borderRadius:10, padding:"10px 20px", fontSize:12, fontWeight:600, color:toast.type==="err"?"#ef4444":G, zIndex:500, boxShadow:"0 8px 32px rgba(0,0,0,0.5)", whiteSpace:"nowrap", animation:"fadeUp 0.2s ease" }}>{toast.msg}</div>
      )}

      {false && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
          <div style={{background:"#111",border:"1px solid rgba(255,255,255,0.1)",borderRadius:20,padding:28,maxWidth:320,width:"100%",textAlign:"center"}}>
            <div style={{fontSize:40,marginBottom:16}}>🗑️</div>
            <div style={{fontSize:17,fontWeight:800,color:"#fff",marginBottom:8}}>Supprimer le programme ?</div>
            <div style={{fontSize:13,color:"rgba(255,255,255,0.4)",lineHeight:1.7,marginBottom:24}}>Le client n'aura plus accès à Train. Il retombera sur l'écran d'attente.</div>
            <div style={{display:"flex",gap:10}}>
              <button onClick={() => void(0)} style={{flex:1,padding:13,background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:12,color:"rgba(255,255,255,0.5)",fontSize:14,fontWeight:600,cursor:"pointer"}}>Annuler</button>
              <button onClick={async () => { await supabase.from("programmes").update({is_active:false}).eq("id","REMOVED"); void(0); toast("Programme supprimé."); onClose(); }} style={{flex:1,padding:13,background:"#ef4444",border:"none",borderRadius:12,color:"#fff",fontSize:14,fontWeight:700,cursor:"pointer"}}>Supprimer</button>
            </div>
          </div>
        </div>
      )}

      {uploading && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", backdropFilter:"blur(8px)", zIndex:300, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:14 }}>
          <div style={{ width:44, height:44, border:`3px solid #1a1a1a`, borderTopColor:G, borderRadius:"50%", animation:"spin 0.8s linear infinite" }} />
          <div style={{ color:G, fontSize:13, fontWeight:600 }}>Upload en cours...</div>
        </div>
      )}
      {selected && <ClientPanel client={selected} onClose={() => setSelected(null)} onUpload={uploadProg} onDelete={deleteClient} />}

      {/* TOPBAR */}
      <div style={{ background:"rgba(13,13,13,0.97)", borderBottom:"1px solid rgba(255,255,255,0.07)", padding:"0 32px", height:60, display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky", top:0, zIndex:100, backdropFilter:"blur(20px)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <div style={{ width:32, height:32, borderRadius:8, overflow:"hidden", border:"1px solid rgba(255,255,255,0.1)" }}><img src={LOGO_B64} alt="" style={{ width:"100%", height:"100%", objectFit:"contain" }} /></div>
          <span style={{ fontSize:14, fontWeight:800, color:"#f5f5f5" }}>RB <span style={{ color:G }}>Performance</span></span>
          <span style={{ fontSize:10, fontWeight:700, color:"#333", letterSpacing:"2px" }}>COACH</span>
          {/* Alerte inactifs */}
          {inactiveAlerts > 0 && (
            <div style={{ background:"rgba(239,68,68,0.12)", border:"1px solid rgba(239,68,68,0.25)", borderRadius:20, padding:"3px 10px", fontSize:10, fontWeight:700, color:"#ef4444", display:"flex", alignItems:"center", gap:5, animation:"pulse 2s infinite" }}>
              ⚠ {inactiveAlerts} inactif{inactiveAlerts>1?"s":""} 7j+
            </div>
          )}
        </div>
        <div style={{ display:"flex", gap:8 }}>
          <button onClick={loadClients} style={{ background:"none", border:"1px solid rgba(255,255,255,0.08)", borderRadius:7, padding:"5px 12px", color:"#555", fontSize:11, fontWeight:600, cursor:"pointer" }}>↻ Actualiser</button>
          <button onClick={onExit} style={{ background:"none", border:"1px solid rgba(255,255,255,0.08)", borderRadius:7, padding:"5px 12px", color:"#555", fontSize:11, fontWeight:600, cursor:"pointer" }}>← Mon app</button>
        </div>
      </div>

      <div style={{ maxWidth:"100%", margin:"0 auto", padding:"12px 12px 80px" }}>
        {/* Titre */}
        <div style={{ marginBottom:28 }}>
          <h1 style={{ fontSize:26, fontWeight:800, letterSpacing:"-0.5px", color:"#f5f5f5", marginBottom:4 }}>Dashboard Coach</h1>
          <p style={{ fontSize:13, color:"#555" }}>Vue d'ensemble de tes {total} client{total>1?"s":""}</p>
        </div>

        {/* Stats cards */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:12, marginBottom:28 }}>
          {[
            { label:"Clients total", value:total, icon:"👥", accent:false },
            { label:"Avec programme", value:withProg, sub:`${total-withProg} sans`, icon:"📋", accent:false },
            { label:"Actifs aujourd'hui", value:activeToday, icon:"🔥", accent:activeToday>0 },
            { label:"Actifs cette semaine", value:activeWeek, icon:"📈", accent:activeWeek>0 },
            { label:"Inactifs 7j+", value:inactiveAlerts, icon:"⚠️", accent:false, warn:inactiveAlerts>0 },
          ].map((s,i) => (
            <div key={i} style={{ background:"#141414", border:`1px solid ${s.warn?"rgba(239,68,68,0.2)":s.accent?G_BORDER:"rgba(255,255,255,0.06)"}`, borderRadius:14, padding:"16px 14px" }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                <div style={{ fontSize:9, fontWeight:700, letterSpacing:"1.5px", textTransform:"uppercase", color:"#555" }}>{s.label}</div>
                <span style={{ fontSize:16 }}>{s.icon}</span>
              </div>
              <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:26, fontWeight:700, color:s.warn&&s.value>0?"#ef4444":s.accent?G:"#f5f5f5", lineHeight:1.2, marginTop:4 }}>{s.value}</div>
              {s.sub && <div style={{ fontSize:10, color:"#555", marginTop:2 }}>{s.sub}</div>}
            </div>
          ))}
        </div>

        {/* Barre filtres + actions */}
        <div style={{ display:"flex", gap:10, marginBottom:16, alignItems:"center", flexWrap:"wrap" }}>
          <input className="inp-focus" placeholder="🔍  Rechercher..." value={search} onChange={e=>setSearch(e.target.value)} style={{ ...inp, flex:1, minWidth:200 }} />
          <div style={{ display:"flex", gap:4 }}>
            {[["all","Tous",total],["active","Actifs 7j",activeWeek],["noprog","Sans prog.",total-withProg],["inactive","⚠ Inactifs",inactiveAlerts]].map(([k,l,n])=>(
              <button key={k} onClick={()=>setFilter(k)} style={{ padding:"7px 12px", fontSize:10.5, fontWeight:600, background:filter===k?G_DIM:"transparent", border:`1px solid ${filter===k?G_BORDER:"rgba(255,255,255,0.08)"}`, borderRadius:100, color:filter===k?G:"#666", cursor:"pointer", whiteSpace:"nowrap" }}>
                {l} <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:9 }}>({n})</span>
              </button>
            ))}
          </div>
          <button onClick={()=>setShowAdd(v=>!v)} style={{ display:"flex", alignItems:"center", gap:6, padding:"9px 18px", background:showAdd?G_DIM:G, border:`1px solid ${showAdd?G_BORDER:G}`, borderRadius:9, color:showAdd?G:"#0d0d0d", fontSize:12, fontWeight:700, cursor:"pointer", boxShadow:showAdd?"none":"0 4px 16px rgba(2,209,186,0.25)" }}>
            {showAdd?"✕ Annuler":"+ Nouveau client"}
          </button>
        </div>

        {/* Formulaire nouveau client */}
        {showAdd && (
          <div style={{ background:"#141414", border:`1px solid ${G_BORDER}`, borderRadius:14, padding:20, marginBottom:16, animation:"fadeUp 0.2s ease" }}>
            <div style={{ fontSize:10, fontWeight:700, letterSpacing:"2px", textTransform:"uppercase", color:G, marginBottom:14 }}>Nouveau client</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr auto", gap:10 }}>
              <div>
                <label style={{ fontSize:9, color:"#555", fontWeight:700, letterSpacing:"1px", textTransform:"uppercase", display:"block", marginBottom:4 }}>Email *</label>
                <input className="inp-focus" type="email" placeholder="client@email.com" value={newEmail} onChange={e=>setNewEmail(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addClient()} style={inp} />
              </div>
              <div>
                <label style={{ fontSize:9, color:"#555", fontWeight:700, letterSpacing:"1px", textTransform:"uppercase", display:"block", marginBottom:4 }}>Prénom Nom</label>
                <input className="inp-focus" type="text" placeholder="Thomas Dupont" value={newName} onChange={e=>setNewName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addClient()} style={inp} />
              </div>
              <div style={{ display:"flex", alignItems:"flex-end" }}>
                <button onClick={addClient} disabled={!newEmail} style={{ padding:"10px 20px", background:newEmail?G:"#1e1e1e", border:"none", borderRadius:9, color:newEmail?"#0d0d0d":"#444", fontSize:12, fontWeight:700, cursor:newEmail?"pointer":"not-allowed", height:40 }}>Créer</button>
              </div>
            </div>
          </div>
        )}

        {/* Table clients */}
        {loading ? (
          <div style={{ textAlign:"center", padding:60, color:"#555" }}>
            <div style={{ width:32, height:32, border:`2.5px solid #222`, borderTopColor:G, borderRadius:"50%", animation:"spin 0.8s linear infinite", margin:"0 auto 12px" }} />
            Chargement...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign:"center", padding:60, color:"#444", fontSize:13 }}>
            {search||filter!=="all" ? "Aucun client correspond" : "Aucun client — ajoute ton premier 👆"}
          </div>
        ) : (
          <div style={{ background:"#0f0f0f", border:"1px solid rgba(255,255,255,0.06)", borderRadius:16, overflow:"hidden" }}>
            {/* Header colonnes */}
            <div style={{ display:"grid", gridTemplateColumns:"2fr 1.4fr 0.8fr 0.8fr 0.9fr 1fr 1fr auto", padding:"10px 20px", borderBottom:"1px solid rgba(255,255,255,0.05)", fontSize:9, fontWeight:700, letterSpacing:"1.5px", textTransform:"uppercase", color:"#444" }}>
              <div>Client</div><div>Programme</div><div>Statut</div><div>Séances</div><div>Poids</div><div>RPE</div><div>Dernier contact</div><div></div>
            </div>

            {filtered.map((c, i) => {
              const prog     = c.programmes?.find(p => p.is_active);
              const actColor = activityColor(c._lastActivity);
              const logsCount = Math.ceil(c._logs.length / 3);
              const lastW    = c._weights?.[0];
              const lastRpe  = c._rpe?.[0];
              const RPE_EMOJIS = ["","😊","💪","😤","😰","🥵"];
              const RPE_COLORS = ["","#4ade80","#02d1ba","#f97316","#ef4444","#dc2626"];
              const daysAgoStr = daysAgo(c._lastActivity);
              const inactiveDays = c._lastActivity ? Math.floor((Date.now()-new Date(c._lastActivity))/86400000) : null;

              return (
                <div key={c.id} className="client-row" onClick={() => setSelected(c)} style={{
                  display:"grid", gridTemplateColumns:"2fr 1.4fr 0.8fr 0.8fr 0.9fr 1fr 1fr auto",
                  padding:"13px 20px", borderBottom: i<filtered.length-1?"1px solid rgba(255,255,255,0.04)":"none",
                  alignItems:"center", gap:8, transition:"background 0.15s",
                  animation:`fadeUp ${0.05+i*0.025}s ease both`,
                }}>
                  {/* Nom */}
                  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <div style={{ position:"relative" }}>
                      <Avatar name={c.full_name||c.email} size={34} active={!!prog} />
                      {c._inactive && c.programmes?.some(p=>p.is_active) && (
                        <div style={{ position:"absolute", top:-2, right:-2, width:10, height:10, borderRadius:"50%", background:"#ef4444", border:"2px solid #0f0f0f", animation:"pulse 2s infinite" }} />
                      )}
                    </div>
                    <div>
                      <div style={{ fontSize:12, fontWeight:600, color:"#f5f5f5" }}>{c.full_name||<span style={{color:"#555"}}>Sans nom</span>}</div>
                      <div style={{ fontSize:10, color:"#555" }}>{c.email}</div>
                    </div>
                  </div>

                  {/* Programme */}
                  <div>
                    {prog ? (
                      <>
                        <div style={{ fontSize:11, fontWeight:600, color:G, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>✓ {prog.programme_name||"Actif"}</div>
                        <div style={{ fontSize:9, color:"#444" }}>{new Date(prog.uploaded_at).toLocaleDateString("fr-FR",{day:"2-digit",month:"short"})}</div>
                      </>
                    ) : <span style={{ fontSize:11, color:"#f97316", fontWeight:600 }}>⚠ Aucun</span>}
                  </div>

                  {/* Statut / activité */}
                  <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                    <div style={{ width:7, height:7, borderRadius:"50%", background:actColor, boxShadow: inactiveDays!==null&&inactiveDays<=1?`0 0 6px ${actColor}`:"none" }} />
                    <span style={{ fontSize:9.5, color:actColor, fontWeight:600 }}>
                      {!c._lastActivity ? "Jamais" : inactiveDays<=1 ? "Actif" : inactiveDays<=7 ? "Semaine" : `${inactiveDays}j`}
                    </span>
                  </div>

                  {/* Séances */}
                  <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:15, fontWeight:600, color:logsCount>0?"#f5f5f5":"#444" }}>{logsCount}</div>

                  {/* Poids */}
                  <div>
                    {lastW ? (
                      <>
                        <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:13, fontWeight:600, color:"#f5f5f5" }}>{lastW.weight} kg</div>
                        <div style={{ fontSize:9, color:"#444" }}>{new Date(lastW.date).toLocaleDateString("fr-FR",{day:"2-digit",month:"short"})}</div>
                      </>
                    ) : <span style={{ fontSize:11, color:"#444" }}>—</span>}
                  </div>

                  {/* RPE */}
                  <div>
                    {lastRpe ? (
                      <div style={{ display:"flex", alignItems:"center", gap:4 }}>
                        <span style={{ fontSize:16 }}>{RPE_EMOJIS[lastRpe.rpe]}</span>
                        <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:12, fontWeight:600, color:RPE_COLORS[lastRpe.rpe] }}>{lastRpe.rpe}/5</span>
                      </div>
                    ) : <span style={{ fontSize:11, color:"#444" }}>—</span>}
                  </div>

                  {/* Dernier contact */}
                  <div style={{ fontSize:11, color: daysAgoStr===null?"#444":daysAgoStr==="Aujourd'hui"||daysAgoStr==="Hier"?G:"#9ca3af" }}>
                    {daysAgoStr||"Jamais"}
                  </div>

                  {/* Flèche */}
                  <div className="row-arrow" style={{ opacity:0, transition:"opacity 0.15s", color:"#555", fontSize:14 }}>→</div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

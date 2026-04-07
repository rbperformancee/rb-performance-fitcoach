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
            {[["overview","📋 Vue"], ["messages","💬 Message"], ["progress","📈 Progression"], ["nutrition","🥗 Nutrition"], ["vivante","⚡ Vivante"]].map(([t, l]) => (
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
                    <button onClick={() => fileRef.current?.click()} style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", background: "none", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 7, padding: "5px 10px", cursor: "pointer" }}>Mettre à jour</button>
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
  const [liveSession, setLiveSession] = React.useState(null);
  const [recording, setRecording] = React.useState(false);
  const [recordingTime, setRecordingTime] = React.useState(0);
  const [audioBlob, setAudioBlob] = React.useState(null);
  const mediaRef = React.useRef(null);
  const chunksRef = React.useRef([]);
  const timerRef = React.useRef(null);

  React.useEffect(() => {
    if (!clientId) return;
    const check = async () => {
      const { data } = await supabase.from("session_live").select("active,session_name,started_at").eq("client_id", clientId).single();
      setIsLive(!!data?.active);
      setLiveSession(data);
    };
    check();
    const interval = setInterval(check, 10000);
    return () => clearInterval(interval);
  }, [clientId]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRef.current = new MediaRecorder(stream);
      chunksRef.current = [];
      mediaRef.current.ondataavailable = e => chunksRef.current.push(e.data);
      mediaRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        stream.getTracks().forEach(t => t.stop());
      };
      mediaRef.current.start();
      setRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= 9) { stopRecording(); return 10; }
          return prev + 1;
        });
      }, 1000);
    } catch(e) { alert("Micro non disponible"); }
  };

  const stopRecording = () => {
    if (mediaRef.current?.state === "recording") mediaRef.current.stop();
    clearInterval(timerRef.current);
    setRecording(false);
  };

  const send = async () => {
    if (!text.trim() && !audioBlob) return;
    setSending(true);
    let audioUrl = null;
    if (audioBlob) {
      const fileName = "flash_" + clientId + "_" + Date.now() + ".webm";
      const { data: up } = await supabase.storage.from("audio-messages").upload(fileName, audioBlob, { contentType: "audio/webm" });
      if (up) {
        const { data: u } = supabase.storage.from("audio-messages").getPublicUrl(fileName);
        audioUrl = u?.publicUrl;
      }
    }
    await supabase.from("coach_messages_flash").insert({
      client_id: clientId,
      text_message: text.trim() || null,
      audio_url: audioUrl,
      expires_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    });
    setSending(false); setSent(true); setText(""); setAudioBlob(null);
    setTimeout(() => setSent(false), 3000);
  };

  const prenom = clientName?.split(" ")[0] || "le client";

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, padding: "12px 14px", background: isLive ? "rgba(2,209,186,0.06)" : "rgba(255,255,255,0.03)", border: "1px solid " + (isLive ? "rgba(2,209,186,0.2)" : "rgba(255,255,255,0.06)"), borderRadius: 14 }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: isLive ? "#02d1ba" : "#333", boxShadow: isLive ? "0 0 8px #02d1ba" : "none", flexShrink: 0 }} />
        <div>
          <div style={{ fontSize: 13, color: isLive ? "#02d1ba" : "rgba(255,255,255,0.25)", fontWeight: 600 }}>
            {isLive ? prenom + " est en seance !" : prenom + " n est pas en seance"}
          </div>
          {isLive && liveSession?.session_name && (
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 2 }}>{liveSession.session_name}</div>
          )}
        </div>
      </div>
      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", letterSpacing: "2px", textTransform: "uppercase", marginBottom: 8 }}>Message flash</div>
      <textarea value={text} onChange={e => setText(e.target.value)} placeholder={"Ex: Dernier set. Donne tout " + prenom + " !"} maxLength={100}
        style={{ width: "100%", padding: "12px 14px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, color: "#fff", fontSize: 14, outline: "none", fontFamily: "-apple-system,Inter,sans-serif", resize: "none", height: 72, boxSizing: "border-box", marginBottom: 10 }} />
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <button onClick={recording ? stopRecording : startRecording} style={{ flex: 1, padding: 12, background: recording ? "rgba(239,68,68,0.08)" : "rgba(255,255,255,0.04)", border: "1px solid " + (recording ? "rgba(239,68,68,0.25)" : "rgba(255,255,255,0.08)"), borderRadius: 12, color: recording ? "#ef4444" : "rgba(255,255,255,0.5)", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          {recording ? <><div style={{ width: 8, height: 8, borderRadius: "50%", background: "#ef4444" }} />{10 - recordingTime}s</> : "🎙 Message vocal"}
        </button>
        {audioBlob && (
          <div style={{ padding: "12px 14px", background: "rgba(2,209,186,0.06)", border: "1px solid rgba(2,209,186,0.15)", borderRadius: 12, fontSize: 11, color: "#02d1ba", display: "flex", alignItems: "center", gap: 6 }}>
            ✓ Audio
            <button onClick={() => setAudioBlob(null)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.3)", cursor: "pointer", fontSize: 12, padding: 0 }}>✕</button>
          </div>
        )}
      </div>
      <button onClick={send} disabled={sending || (!text.trim() && !audioBlob)} style={{ width: "100%", padding: 14, background: sent ? "rgba(2,209,186,0.08)" : "#02d1ba", color: sent ? "#02d1ba" : "#000", border: sent ? "1px solid rgba(2,209,186,0.2)" : "none", borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: "pointer", opacity: (!text.trim() && !audioBlob) ? 0.4 : 1 }}>
        {sent ? "✓ Message envoye !" : sending ? "Envoi..." : "Envoyer le message flash"}
      </button>
    </div>
  );
}
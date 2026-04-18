import ClientAnalytics from "./ClientAnalytics";
import ProgramPDFButton from "./ProgramPDF";
import CoachStats from "./CoachStats";
import ChatCoach from "./ChatCoach";
import DemoBanner from "./DemoBanner";
import { toast } from "./Toast";
import React, { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";
import { generateInvoicePDF } from "../utils/invoicePDF";
import ProgrammeBuilder from "./ProgrammeBuilder";
import { useClientRelance } from "../hooks/useClientRelance";
import { useCoachPlans } from "../hooks/useCoachPlans";
import { LOGO_B64 } from "../utils/logo";
import ErrorBoundary from "./ErrorBoundary";
import InvitationPanel from "./InvitationPanel";
import EmptyState from "./EmptyState";
import { SkeletonList } from "./Skeleton";
import Spinner from "./Spinner";
import haptic from "../lib/haptic";
import BusinessSection from "./coach/BusinessSection";
import ProgrammeList from "./coach/ProgrammeList";
import Onboarding from "./coach/Onboarding";
import InviteClient from "./coach/InviteClient";
import Settings from "./coach/Settings";
import ChurnAlertsSection from "./coach/ChurnAlertsSection";
import { BehavioralBadge } from "./coach/BehavioralBadge";
import { enrichClientsForIntelligence } from "../lib/enrichClients";
import { suggestPipelineStatus, canAutoUpdate } from "../lib/pipelineAuto";
import PipelineKanban from "./coach/PipelineKanban";
import TagManager, { TagBadge } from "./coach/TagManager";
import ActivityTimeline from "./coach/ActivityTimeline";
import AnalyticsSection from "./coach/AnalyticsSection";
import AchievementsSection from "./coach/AchievementsSection";
import TransformationView from "./coach/TransformationView";
import AIAnalyze from "./coach/AIAnalyze";
import CoachOnboardingWizard from "./coach/CoachOnboardingWizard";
import CoachHomeScreen from "./coach/CoachHomeScreen";
import NotificationBell from "./coach/NotificationBell";
import CommandPalette from "./coach/CommandPalette";
import PullToRefreshIndicator from "./PullToRefreshIndicator";
import usePullToRefresh from "../hooks/usePullToRefresh";
import ThemeSwitcher from "./ThemeSwitcher";
import { calculateChurnRisk } from "../lib/coachIntelligence";

// Durees d'abonnement (partage entre CoachDashboard et ClientPanel)
// DEPRECATED — anciennes constantes, remplacées par coach_plans table
const SUB_PLANS_LEGACY = [
  { id: "3m", label: "3 Mois", months: 3 },
  { id: "6m", label: "6 Mois", months: 6 },
  { id: "12m", label: "12 Mois", months: 12 },
];

const G = "#00C9A7";
const ORANGE = "#00C9A7";
const VIOLET = "#00C9A7";
const RED = "#ff6b6b";
const BG = "#080C14";
const PREMIUM_STYLES = {
  card: { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, transition: "all 0.2s cubic-bezier(0.22,1,0.36,1)" },
  badge: (color) => ({ display: "inline-flex", alignItems: "center", gap: 4, background: color + "12", border: "1px solid " + color + "25", color, fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 20, letterSpacing: 0.5 }),
};
const G_DIM = "rgba(0,201,167,0.1)";
const G_BORDER = "rgba(0,201,167,0.2)";

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
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffH = Math.floor(diffMs / 3600000);
  const diffD = Math.floor(diffMs / 86400000);
  if (diffH < 1) return "A l'instant";
  if (diffH < 24) return `Il y a ${diffH}h`;
  if (diffD === 1) return "Hier";
  return `Il y a ${diffD}j`;
}
function activityLabel(dateStr) {
  if (!dateStr) return { text: "Jamais connecte", precise: true };
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffH = Math.floor((now - then) / 3600000);
  const diffD = Math.floor((now - then) / 86400000);
  if (diffH < 1) return { text: "En ligne", precise: true };
  if (diffH < 24) return { text: `Actif il y a ${diffH}h`, precise: true };
  if (diffD === 1) return { text: "Vu hier", precise: true };
  if (diffD <= 3) return { text: `Vu il y a ${diffD}j`, precise: true };
  if (diffD <= 7) return { text: `Vu il y a ${diffD}j`, precise: true };
  return { text: `Inactif ${diffD}j`, precise: true };
}
function activityColor(lastSeen) {
  if (!lastSeen) return "rgba(255,255,255,0.2)";
  const d = Math.floor((Date.now() - new Date(lastSeen)) / 86400000);
  if (d <= 1) return G;
  if (d <= 3) return G;
  if (d <= 7) return "rgba(255,255,255,0.4)";
  return "#ff6b6b";
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

// Graphique ligne premium avec axes, dates, grille, points
// Utilise pour le drawer poids (et potentiellement eau/sommeil)
function LineGraph({ data, color = G, height = 200, unit = "kg", valueKey = "weight" }) {
  if (!data || data.length < 2) return <div style={{ textAlign: "center", padding: 32, color: "rgba(255,255,255,0.3)", fontSize: 12 }}>Pas assez de donnees</div>;

  const W = 100; // pourcentage, le SVG sera responsive
  const H = height;
  const PAD = { top: 12, right: 8, bottom: 30, left: 42 };
  const chartW = W; // on travaille en viewBox, pas en pixels
  const vbW = 500; // viewBox width fixe
  const vbH = H;
  const cW = vbW - PAD.left - PAD.right;
  const cH = vbH - PAD.top - PAD.bottom;

  const vals = data.map(d => typeof d === "number" ? d : (d[valueKey] || d.value || 0));
  const dates = data.map(d => d.date || d.logged_at || "");
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const range = max - min || 1;
  const yPad = range * 0.1; // 10% padding vertical
  const yMin = min - yPad;
  const yMax = max + yPad;
  const yRange = yMax - yMin || 1;

  // Points du graphique
  const points = vals.map((v, i) => ({
    x: PAD.left + (i / (vals.length - 1)) * cW,
    y: PAD.top + cH - ((v - yMin) / yRange) * cH,
    v,
  }));

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaPath = linePath + ` L ${points[points.length - 1].x} ${PAD.top + cH} L ${points[0].x} ${PAD.top + cH} Z`;

  // Y-axis ticks (4-5 ticks)
  const yTicks = [];
  const nTicks = 5;
  for (let i = 0; i < nTicks; i++) {
    const v = yMin + (yRange / (nTicks - 1)) * i;
    const y = PAD.top + cH - ((v - yMin) / yRange) * cH;
    yTicks.push({ y, label: v.toFixed(1) });
  }

  // X-axis labels (show ~6 dates evenly spaced)
  const xLabels = [];
  const step = Math.max(1, Math.floor(dates.length / 6));
  for (let i = 0; i < dates.length; i += step) {
    const dateStr = dates[i];
    if (!dateStr) continue;
    const d = new Date(dateStr.includes("T") ? dateStr : dateStr + "T12:00:00");
    xLabels.push({
      x: points[i].x,
      label: d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" }),
    });
  }

  return (
    <div style={{ width: "100%", position: "relative" }}>
      <svg
        viewBox={`0 0 ${vbW} ${vbH}`}
        style={{ width: "100%", height: "auto", display: "block" }}
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Grid lines */}
        {yTicks.map((t, i) => (
          <line key={i} x1={PAD.left} y1={t.y} x2={vbW - PAD.right} y2={t.y} stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
        ))}

        {/* Area fill */}
        <path d={areaPath} fill={`url(#lineGrad-${color.replace("#", "")})`} opacity="0.15" />
        <defs>
          <linearGradient id={`lineGrad-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.4" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Line */}
        <path d={linePath} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

        {/* Data points */}
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={vals.length > 30 ? 2 : 3.5} fill={color} stroke="#080C14" strokeWidth="1.5" />
        ))}

        {/* Y-axis labels */}
        {yTicks.map((t, i) => (
          <text key={i} x={PAD.left - 6} y={t.y + 3} textAnchor="end" fill="rgba(255,255,255,0.35)" fontSize="10" fontFamily="'JetBrains Mono',monospace" fontWeight="600">
            {parseFloat(t.label).toFixed(1)}
          </text>
        ))}

        {/* X-axis labels */}
        {xLabels.map((l, i) => (
          <text key={i} x={l.x} y={vbH - 6} textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize="9" fontFamily="'DM Sans',-apple-system,sans-serif" fontWeight="600">
            {l.label}
          </text>
        ))}

        {/* Unit label */}
        <text x={4} y={PAD.top + 4} fill="rgba(255,255,255,0.2)" fontSize="9" fontFamily="'DM Sans',-apple-system,sans-serif">{unit}</text>
      </svg>
    </div>
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
            style={{ flex: 1, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, color: "#fff", padding: "10px 12px", fontSize: 13, outline: "none", fontFamily: "'DM Sans',-apple-system,sans-serif" }} />
          <select value={heure} onChange={e => setHeure(e.target.value)}
            style={{ flex: 1, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, color: "#fff", padding: "10px 12px", fontSize: 13, outline: "none", fontFamily: "'DM Sans',-apple-system,sans-serif" }}>
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
          <div style={{ padding: "20px 0" }}><Spinner variant="dots" size={22} /></div>
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
                  style={{ background: "rgba(255,107,107,0.1)", border: "1px solid rgba(255,107,107,0.2)", borderRadius: 8, width: 30, height: 30, color: "#ff6b6b", fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
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

/* ── Page plein ecran detail client — TOUT visible d'un coup ── */
function ClientPanel({ client, onClose, onUpload, onDelete, coachId, coachData, isDemo = false }) {
  const [showTransformation, setShowTransformation] = React.useState(false);
  const [showAIAnalyze, setShowAIAnalyze] = React.useState(false);
  const [msgText,    setMsgText]    = useState("");
  const [sending,    setSending]    = useState(false);
  const [messages,   setMessages]   = useState([]);
  const [rpeData,    setRpeData]    = useState([]);
  const [nutGoals,   setNutGoals]   = useState(null);
  const [nutSaving,  setNutSaving]  = useState(false);
  // ===== Nouvelles donnees client =====
  const [nutLogs7d,  setNutLogs7d]  = useState([]);
  const [daily7d,    setDaily7d]    = useState([]);
  const [daily30d,   setDaily30d]   = useState([]); // 30 jours pour les drawers
  const [sessions,   setSessions]   = useState([]);
  const [allWeights, setAllWeights] = useState([]);
  const [exLogs, setExLogs] = useState([]);
  const [coachNotes, setCoachNotes] = useState([]);
  const [newNote, setNewNote] = useState("");
  const [noteSaving, setNoteSaving] = useState(false);
  const [uploadPlanId, setUploadPlanId] = useState("3m");
  const [panelTab, setPanelTab] = useState("resume");
  const [uploadProgWeeks, setUploadProgWeeks] = useState(6);
  const [showBuilder, setShowBuilder] = useState(false); // duree du programme en semaines
  const [drawer, setDrawer] = useState(null); // null | "poids" | "eau" | "sommeil" | "pas"
  const fileRef = useRef();

  const prog = client.programmes?.find(p => p.is_active);
  const logs = client._logs || [];
  const weights = client._weights || [];
  const lastWeight = weights[0];
  const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
  const weekLogs = logs.filter(l => new Date(l.logged_at) >= weekAgo);
  const firstName = client.full_name?.split(" ")[0] || "Ce client";
  const actColor = activityColor(client._lastActivity);
  const inactiveDays = client._inactiveDays;

  const d7ago = new Date(); d7ago.setDate(d7ago.getDate() - 7);
  const d7str = d7ago.toISOString().split("T")[0];

  useEffect(() => {
    if (!client.id) return;
    // Donnees existantes
    supabase.from("messages").select("*").eq("client_id", client.id)
      .order("created_at", { ascending: false }).limit(20)
      .then(({ data }) => setMessages(data || []));
    supabase.from("session_rpe").select("*").eq("client_id", client.id)
      .order("date", { ascending: false }).limit(10)
      .then(({ data }) => setRpeData(data || []));
    supabase.from("nutrition_goals").select("*").eq("client_id", client.id).single()
      .then(({ data }) => setNutGoals(data || { calories: 2000, proteines: 150, glucides: 250, lipides: 70, eau_ml: 2500, pas: 8000 }));

    // ===== NOUVELLES DONNEES =====
    // Nutrition logs 7 jours (kcal par jour)
    supabase.from("nutrition_logs").select("date,calories,proteines,glucides,lipides").eq("client_id", client.id)
      .gte("date", d7str).order("date", { ascending: true })
      .then(({ data }) => setNutLogs7d(data || []));
    // Daily tracking 7 jours (pas, eau, sommeil)
    supabase.from("daily_tracking").select("date,pas,eau_ml,sommeil_h").eq("client_id", client.id)
      .gte("date", d7str).order("date", { ascending: true })
      .then(({ data }) => setDaily7d(data || []));
    // Daily tracking 30 jours (pour les drawers eau/sommeil)
    const d30 = new Date(); d30.setDate(d30.getDate() - 30);
    supabase.from("daily_tracking").select("date,pas,eau_ml,sommeil_h").eq("client_id", client.id)
      .gte("date", d30.toISOString().split("T")[0]).order("date", { ascending: true })
      .then(({ data }) => setDaily30d(data || []));
    // Session logs detailles (20 derniers) + exercise_logs pour le detail des poids
    // NOTE : la table n'a pas les colonnes duration_seconds/exercises_count/sets_count
    // On selectionne tout — les checks truthy dans le render gerent les colonnes absentes
    supabase.from("session_logs").select("*")
      .eq("client_id", client.id).order("logged_at", { ascending: false }).limit(20)
      .then(({ data }) => setSessions(data || []));
    // Notes coach internes
    supabase.from("coach_notes").select("id,content,created_at").eq("client_id", client.id)
      .order("created_at", { ascending: false }).limit(20)
      .then(({ data }) => setCoachNotes(data || []));
    // Exercise logs recents (pour afficher les poids souleves par seance)
    // NOTE : pas de colonne "sets", on lit reps/weight/ex_key/logged_at
    supabase.from("exercise_logs").select("logged_at,ex_key,weight,reps")
      .eq("client_id", client.id).order("logged_at", { ascending: false }).limit(100)
      .then(({ data }) => setExLogs(data || []));
    // Historique poids complet (TOUS depuis le debut de l'abonnement)
    supabase.from("weight_logs").select("date,weight,note").eq("client_id", client.id)
      .order("date", { ascending: false }).limit(500)
      .then(({ data }) => setAllWeights(data || []));
  }, [client.id, d7str]);

  // ===== Agregation nutrition par jour =====
  const nutByDay = {};
  nutLogs7d.forEach(n => {
    if (!nutByDay[n.date]) nutByDay[n.date] = { kcal: 0, prot: 0, gluc: 0, lip: 0 };
    nutByDay[n.date].kcal += n.calories || 0;
    nutByDay[n.date].prot += parseFloat(n.proteines || 0);
    nutByDay[n.date].gluc += parseFloat(n.glucides || 0);
    nutByDay[n.date].lip += parseFloat(n.lipides || 0);
  });
  const nutDays = Object.entries(nutByDay).sort((a, b) => a[0].localeCompare(b[0])).slice(-7);
  const maxKcal = Math.max(1, ...nutDays.map(([, d]) => d.kcal));

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

  const RPE_LABELS = ["", "Facile", "Correct", "Difficile", "Tres dur", "Epuisant"];
  const RPE_COLORS = ["", "rgba(255,255,255,0.15)", "rgba(255,255,255,0.15)", "rgba(255,255,255,0.15)", "#fff", "#ff6b6b"];

  const exMap = {};
  [...logs].reverse().forEach(l => {
    if (!exMap[l.ex_key]) exMap[l.ex_key] = [];
    exMap[l.ex_key].push({ weight: l.weight, date: l.logged_at });
  });
  const topEx = Object.entries(exMap)
    .filter(([, v]) => v.length >= 2)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 6);

  // Style helpers
  const section = { marginBottom: 28 };
  const sectionTitle = { fontSize: 10, fontWeight: 800, letterSpacing: "3px", textTransform: "uppercase", color: "rgba(2,209,186,0.55)", marginBottom: 14, display: "flex", alignItems: "center", gap: 8 };
  const card = { background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: "16px 18px" };

  return (
    <>
    {/* Programme Builder plein ecran */}
    {showBuilder && (
      <div className="coach-overlay-panel" style={{ position: "fixed", top: 0, right: 0, bottom: 0, left: 220, zIndex: 300 }}>
        <ProgrammeBuilder
          client={client}
          coachData={null}
          onClose={() => setShowBuilder(false)}
          onSaved={() => { setShowBuilder(false); onClose(); }}
        />
      </div>
    )}

    <div className="coach-client-panel">
      <style>{`
        @keyframes cpFadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        .coach-client-panel{
          position:fixed;top:0;right:0;bottom:0;left:220px;z-index:200;
          background:#080C14;overflow-y:auto;overflow-x:hidden;
          -webkit-overflow-scrolling:touch;
          font-family:'Inter',-apple-system,system-ui,sans-serif;color:#fff;
        }
        @media(min-width:1024px){
          .coach-client-panel-ambient{position:absolute!important}
          .coach-client-panel-inner{max-width:none!important;padding:0 22px 48px!important}
        }
      `}</style>

      {/* Ambient teal */}
      <div className="coach-client-panel-ambient" style={{ position: "fixed", top: 0, left: 0, right: 0, height: "35%", background: "radial-gradient(ellipse at 40% -10%, rgba(2,209,186,0.1), transparent 65%)", pointerEvents: "none", zIndex: 0 }} />

      <div className="coach-client-panel-inner" style={{ position: "relative", zIndex: 1, maxWidth: 1100, margin: "0 auto", padding: "0 24px 100px" }}>

        <input ref={fileRef} type="file" accept=".html" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) { onUpload(client, f, uploadPlanId, uploadProgWeeks); e.target.value = ""; } }} />

        {/* ===== HERO CLIENT (bouton retour integre, pas de topbar sticky) ===== */}
        <div style={{ padding: "28px 0 0", marginBottom: 28, animation: "cpFadeUp 0.4s ease both" }}>
          {/* Ligne retour — integre dans safe-area top */}
          <div style={{ paddingTop: "env(safe-area-inset-top, 8px)" }}>
            <button
              onClick={onClose}
              style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 8, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", marginBottom: 14, transition: "all .15s" }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(0,201,167,0.3)"; e.currentTarget.style.color = "#fff"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; e.currentTarget.style.color = "rgba(255,255,255,0.5)"; }}
            >
              <Icon name="arrow-left" size={13} />
              Retour
            </button>
          </div>

          {/* Identite + statut */}
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 14 }}>
            <Avatar name={client.full_name || client.email} size={60} active={!!prog} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: "clamp(28px, 7vw, 36px)", fontWeight: 900, letterSpacing: "-0.035em", color: "#fff", margin: 0, lineHeight: 1.05, wordBreak: "break-word" }}>
                {client.full_name || <span style={{ color: "rgba(255,255,255,0.35)" }}>Sans nom</span>}
              </h1>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", marginTop: 8 }}>{client.email}</div>
            </div>
            <button
              onClick={() => { try { haptic.light(); } catch(_) {} setShowAIAnalyze(true); }}
              title="Analyser ce client avec l'IA"
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "8px 14px",
                background: "rgba(2,209,186,.06)",
                border: `.5px solid rgba(2,209,186,.22)`,
                borderRadius: 100,
                color: "#02d1ba",
                fontSize: 11, fontWeight: 700,
                letterSpacing: ".05em", textTransform: "uppercase",
                cursor: "pointer", fontFamily: "inherit",
                flexShrink: 0,
                transition: "all .15s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(2,209,186,.1)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(2,209,186,.06)"; }}
            >
              <Icon name="zap" size={11} color="#02d1ba" />
              Analyser
            </button>
          </div>

          {/* Statut activite en badge */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              background: "rgba(0,201,167,0.1)", border: "1px solid rgba(0,201,167,0.25)",
              borderRadius: 100, padding: "5px 12px", fontSize: 11, fontWeight: 700, color: G,
            }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: actColor }} />
              {activityLabel(client._lastActivity).text}
            </div>
            {client._inactive && (
              <button
                onClick={async (e) => {
                  e.stopPropagation();
                  const name = client.full_name?.split(" ")[0] || "Champion";
                  const ok = await sendManualPush(client.id, `${name}, ton coach t'attend. Reviens en force !`);
                  if (ok) toast.success(`Notification envoyee a ${name}`);
                  else toast.error(`${name} n'a pas encore active les notifs`);
                }}
                style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "rgba(255,107,107,0.08)", border: "1px solid rgba(255,107,107,0.2)", borderRadius: 100, padding: "5px 12px", fontSize: 11, fontWeight: 700, color: RED, cursor: "pointer", fontFamily: "inherit" }}
              >
                <Icon name="alert" size={11} />
                Relancer ({client._inactiveDays}j)
              </button>
            )}
            {prog && (
              <div style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 100, padding: "5px 12px", fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.7)" }}>
                <Icon name="check" size={11} color="rgba(255,255,255,0.4)" />
                {prog.programme_name}
              </div>
            )}
          </div>
        </div>

        {/* ===== TAB BAR INTERNE ===== */}
        <div style={{ display: "flex", gap: 0, marginBottom: 24, borderBottom: "1px solid rgba(255,255,255,0.06)", animation: "cpFadeUp 0.3s ease 0.05s both" }}>
          {[
            { id: "resume", label: "Résumé" },
            { id: "programme", label: "Programme" },
            { id: "nutrition", label: "Nutrition" },
            { id: "suivi", label: "Suivi" },
          ].map(t => (
            <button key={t.id} onClick={() => setPanelTab(t.id)} style={{
              padding: "12px 20px",
              fontSize: 12, fontWeight: panelTab === t.id ? 700 : 500,
              color: panelTab === t.id ? "#fff" : "rgba(255,255,255,0.3)",
              background: "none", border: "none", cursor: "pointer",
              borderBottom: panelTab === t.id ? "2px solid #00C9A7" : "2px solid transparent",
              fontFamily: "inherit", letterSpacing: ".02em",
              transition: "all .2s",
            }}>{t.label}</button>
          ))}
        </div>

        {/* ===== TAB: RESUME ===== */}
        {panelTab === "resume" && (<>

        {/* ===== STATS RAPIDES (une ligne — sans pesees ni pas, deja dans leurs cards) ===== */}
        <div style={{ ...section, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10, animation: "cpFadeUp 0.4s ease 0.08s both" }}>
          {[
            { l: "Seances", v: Math.ceil(logs.length / 3) || 0, ic: "activity", c: G },
            { l: "Cette sem.", v: weekLogs.length, ic: "flame", c: weekLogs.length > 0 ? G : "rgba(255,255,255,0.4)" },
            { l: "RPE moy.", v: rpeData.length ? (rpeData.reduce((a, r) => a + r.rpe, 0) / rpeData.length).toFixed(1) : "--", ic: "trending", c: "rgba(255,255,255,0.5)" },
          ].map((s, i) => (
            <div key={i} style={{ ...card, textAlign: "center", padding: "14px 8px 12px" }}>
              <div style={{ color: s.c, display: "flex", justifyContent: "center", marginBottom: 8, opacity: 0.9 }}>
                <Icon name={s.ic} size={15} />
              </div>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 22, fontWeight: 200, color: "#fff", lineHeight: 1, letterSpacing: "-1px" }}>{s.v}</div>
              <div style={{ fontSize: 8, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "1.5px", marginTop: 8, fontWeight: 700 }}>{s.l}</div>
            </div>
          ))}
        </div>

        {/* ===== PROGRAMME + ABONNEMENT ===== */}
        <div style={{ ...section, animation: "cpFadeUp 0.4s ease 0.12s both" }}>
          <div style={sectionTitle}>
            <Icon name="document" size={14} color={G} />
            Programme et abonnement
          </div>
          {prog ? (() => {
            const subStart = client.subscription_start_date ? new Date(client.subscription_start_date) : null;
            const subEnd = client.subscription_end_date ? new Date(client.subscription_end_date) : null;
            const daysLeft = subEnd ? Math.ceil((subEnd - Date.now()) / 86400000) : null;
            const isExpiring = daysLeft !== null && daysLeft <= 14 && daysLeft > 0;
            const isExpired = daysLeft !== null && daysLeft <= 0;
            const subColor = isExpired ? RED : isExpiring ? (daysLeft <= 7 ? RED : ORANGE) : G;
            const planLabel = client._plan_name || { "3m": "3 Mois", "6m": "6 Mois", "12m": "12 Mois" }[client.subscription_plan] || client.subscription_plan || "Plan non défini";

            return (
              <div style={card}>
                {/* Programme actif */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: subStart ? 14 : 0 }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>{prog.programme_name}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: G, marginTop: 4, fontWeight: 600 }}>
                      <Icon name="check" size={12} />
                      Actif depuis {new Date(prog.uploaded_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => fileRef.current?.click()} style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.5)", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontFamily: "inherit" }}>Maj</button>
                    <button onClick={async () => { const {error} = await supabase.from('programmes').update({is_active:false}).eq('id',prog.id); if(error){console.error(error);toast.error('Erreur: '+error.message);return;} toast.success('Programme archive'); onClose(); }} style={{ fontSize: 10, fontWeight: 700, color: RED, background: "rgba(255,107,107,0.06)", border: "1px solid rgba(255,107,107,0.2)", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontFamily: "inherit" }}>Suppr</button>
                  </div>
                </div>

                {/* Infos abonnement */}
                {subStart && (
                  <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: 12, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                    {planLabel && (
                      <div style={{ padding: "4px 10px", background: `${subColor}12`, border: `1px solid ${subColor}30`, borderRadius: 100, fontSize: 10, fontWeight: 700, color: subColor }}>
                        {planLabel}
                      </div>
                    )}
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>
                      {subStart.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} → {subEnd?.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                    </div>
                    {daysLeft !== null && (
                      <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, fontWeight: 700, color: subColor }}>
                        {isExpired ? "Expire" : `${daysLeft}j restants`}
                      </div>
                    )}
                  </div>
                )}

                {/* Bouton facture PDF */}
                {subStart && (
                  <button
                    onClick={(e) => { e.stopPropagation(); generateInvoicePDF(client, coachData || { full_name: "Coach", brand_name: "Coaching", email: "" }); }}
                    style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, color: "rgba(255,255,255,0.5)", fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
                  >
                    <Icon name="document" size={12} />
                    Generer facture PDF
                  </button>
                )}

                {/* Alerte expiration */}
                {isExpiring && !isExpired && (
                  <div style={{ marginTop: 10, padding: "8px 12px", background: daysLeft <= 7 ? "rgba(255,107,107,0.08)" : "rgba(0,201,167,0.06)", border: `1px solid ${daysLeft <= 7 ? "rgba(255,107,107,0.2)" : "rgba(0,201,167,0.2)"}`, borderRadius: 10, display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, color: daysLeft <= 7 ? RED : ORANGE }}>
                    <Icon name="alert" size={12} />
                    {daysLeft <= 7 ? "Abonnement expire dans " + daysLeft + " jours !" : "Abonnement expire dans " + daysLeft + " jours"}
                  </div>
                )}
                {isExpired && (
                  <div style={{ marginTop: 10, padding: "8px 12px", background: "rgba(255,107,107,0.08)", border: "1px solid rgba(255,107,107,0.25)", borderRadius: 10, display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, color: RED }}>
                    <Icon name="alert" size={12} />
                    Abonnement expire — renouvellement necessaire
                  </div>
                )}
              </div>
            );
          })() : (
            <div style={{ ...card, background: "rgba(0,201,167,0.04)", border: "1px solid rgba(0,201,167,0.2)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: ORANGE, fontWeight: 700, marginBottom: 14 }}>
                <Icon name="alert" size={14} />
                Aucun programme assigne
              </div>

              {/* Abonnement : seulement si pas encore defini (premier upload) */}
              {!client.subscription_start_date && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", marginBottom: 8 }}>Abonnement</div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {(coachPlans.length > 0 ? coachPlans : SUB_PLANS_LEGACY).map(p => {
                      const planId = p.id;
                      const label = p.name || p.label;
                      const on = uploadPlanId === planId;
                      return (
                        <button key={planId} onClick={() => setUploadPlanId(planId)} style={{
                          padding: "7px 14px", borderRadius: 100, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                          background: on ? G_DIM : "rgba(255,255,255,0.03)",
                          border: `1px solid ${on ? G_BORDER : "rgba(255,255,255,0.08)"}`,
                          color: on ? G : "rgba(255,255,255,0.4)",
                        }}>{label}</button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Duree du programme en semaines (toujours visible) */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", marginBottom: 8 }}>Duree du programme</div>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  {[4, 6, 8, 10, 12].map(w => {
                    const on = uploadProgWeeks === w;
                    return (
                      <button key={w} onClick={() => setUploadProgWeeks(w)} style={{
                        padding: "7px 12px", borderRadius: 100, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                        background: on ? "rgba(0,201,167,0.12)" : "rgba(255,255,255,0.03)",
                        border: `1px solid ${on ? "rgba(0,201,167,0.3)" : "rgba(255,255,255,0.08)"}`,
                        color: on ? VIOLET : "rgba(255,255,255,0.4)",
                      }}>{w} sem</button>
                    );
                  })}
                  <input
                    type="number"
                    value={uploadProgWeeks}
                    onChange={e => setUploadProgWeeks(Math.max(1, parseInt(e.target.value) || 6))}
                    style={{ width: 50, padding: "7px 8px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, color: "#fff", fontFamily: "'JetBrains Mono',monospace", fontSize: 12, fontWeight: 700, textAlign: "center", outline: "none" }}
                  />
                  <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>sem</span>
                </div>
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => setShowBuilder(true)} style={{ flex: 1, padding: 12, background: "linear-gradient(135deg, #c0392b, #a93226)", border: "none", borderRadius: 10, color: "#fff", fontSize: 12, fontWeight: 800, cursor: "pointer", textTransform: "uppercase", letterSpacing: "0.5px", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: "0 6px 20px rgba(192,57,43,0.3)" }}>
                  <Icon name="document" size={14} />
                  Creer un programme
                </button>
                <button onClick={() => fileRef.current?.click()} style={{ flex: 1, padding: 12, background: `linear-gradient(135deg, ${G}, #0891b2)`, border: "none", borderRadius: 10, color: "#000", fontSize: 12, fontWeight: 800, cursor: "pointer", textTransform: "uppercase", letterSpacing: "0.5px", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: "0 6px 20px rgba(2,209,186,0.25)" }}>
                  <Icon name="upload" size={14} />
                  Uploader HTML
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ===== POIDS + SPARKLINE ===== */}
        <div style={{ ...section, animation: "cpFadeUp 0.4s ease 0.16s both" }}>
          <div style={sectionTitle}>
            <Icon name="trending" size={14} color={G} />
            Poids
          </div>
          {lastWeight ? (
            <div onClick={() => setDrawer("poids")} style={{ ...card, display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", transition: "border-color 0.2s" }}>
              <div>
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 28, fontWeight: 200, color: "#fff", letterSpacing: "-1px" }}>
                  {lastWeight.weight}<span style={{ fontSize: 14, color: "rgba(255,255,255,0.4)", marginLeft: 4 }}>kg</span>
                </div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 4 }}>
                  {new Date(lastWeight.date).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
                </div>
                {weights.length >= 2 && (
                  <div style={{ fontSize: 11, color: weights[weights.length-1].weight > lastWeight.weight ? RED : G, fontWeight: 700, marginTop: 4 }}>
                    {(lastWeight.weight - weights[weights.length-1].weight) > 0 ? "+" : ""}{(lastWeight.weight - weights[weights.length-1].weight).toFixed(1)} kg depuis le debut
                  </div>
                )}
              </div>
              {weights.length >= 2 && <MiniSparkline data={[...weights].reverse()} color={G} w={120} h={40} />}
            </div>
          ) : (
            <div style={{ ...card, fontSize: 12, color: "rgba(255,255,255,0.35)", textAlign: "center", padding: "18px 12px" }}>
              Aucune pesee enregistree — ton client peut en ajouter depuis son app.
            </div>
          )}
        </div>

        </>)}

        {/* ===== TAB: NUTRITION ===== */}
        {panelTab === "nutrition" && (<>

        {/* ===== ALIMENTATION 7 JOURS ===== */}
        <div style={{ ...section, animation: "cpFadeUp 0.4s ease 0.18s both" }}>
          <div style={sectionTitle}>
            <Icon name="apple" size={14} color={G} />
            Alimentation — 7 derniers jours
          </div>
          {nutDays.length === 0 ? (
            <div style={{ ...card, fontSize: 12, color: "rgba(255,255,255,0.35)", textAlign: "center", padding: "18px 12px" }}>
              Aucune alimentation loggee cette semaine.
            </div>
          ) : (
            <div style={card}>
              {/* Barres de kcal par jour */}
              <div style={{ display: "flex", gap: 6, alignItems: "flex-end", height: 100, marginBottom: 12 }}>
                {nutDays.map(([date, d], i) => {
                  const pct = Math.max(4, (d.kcal / maxKcal) * 100);
                  const goalKcal = nutGoals?.calories || 2000;
                  const overGoal = d.kcal > goalKcal * 1.1;
                  const underGoal = d.kcal < goalKcal * 0.7;
                  const barColor = overGoal ? ORANGE : underGoal ? RED : G;
                  const dayLabel = new Date(date + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "short" }).slice(0, 3);
                  return (
                    <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                      <div style={{ fontSize: 9, fontWeight: 700, color: barColor, fontFamily: "'JetBrains Mono',monospace" }}>{d.kcal}</div>
                      <div style={{ width: "100%", height: `${pct}%`, minHeight: 4, background: `linear-gradient(to top, ${barColor}50, ${barColor})`, borderRadius: 4 }} />
                      <div style={{ fontSize: 8, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", fontWeight: 700 }}>{dayLabel}</div>
                    </div>
                  );
                })}
              </div>
              {/* Macros moyenne */}
              {nutDays.length > 0 && (() => {
                const avg = { kcal: 0, prot: 0, gluc: 0, lip: 0 };
                nutDays.forEach(([, d]) => { avg.kcal += d.kcal; avg.prot += d.prot; avg.gluc += d.gluc; avg.lip += d.lip; });
                const n = nutDays.length;
                return (
                  <div style={{ display: "flex", gap: 12, justifyContent: "center", paddingTop: 8, borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                    {[
                      { l: "Moy/j", v: Math.round(avg.kcal / n), u: "kcal", c: ORANGE },
                      { l: "Prot", v: Math.round(avg.prot / n), u: "g", c: G },
                      { l: "Gluc", v: Math.round(avg.gluc / n), u: "g", c: "#60a5fa" },
                      { l: "Lip", v: Math.round(avg.lip / n), u: "g", c: VIOLET },
                    ].map((m, i) => (
                      <div key={i} style={{ textAlign: "center" }}>
                        <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 14, fontWeight: 700, color: m.c }}>{m.v}<span style={{ fontSize: 9, fontWeight: 500, color: "rgba(255,255,255,0.3)" }}>{m.u}</span></div>
                        <div style={{ fontSize: 8, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.5px", marginTop: 2 }}>{m.l}</div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          )}
        </div>

        {/* ===== ACTIVITE QUOTIDIENNE 7J (pas, eau, sommeil) ===== */}
        <div style={{ ...section, animation: "cpFadeUp 0.4s ease 0.2s both" }}>
          <div style={sectionTitle}>
            <Icon name="activity" size={14} color={G} />
            Activite quotidienne — 7 jours
          </div>
          {daily7d.length === 0 ? (
            <div style={{ ...card, fontSize: 12, color: "rgba(255,255,255,0.35)", textAlign: "center", padding: "18px 12px" }}>
              Aucune donnee d'activite cette semaine.
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10 }}>
              {/* Pas — cliquable */}
              <div onClick={() => setDrawer("pas")} style={{ ...card, cursor: "pointer", transition: "border-color 0.2s" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <div>
                    <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase", color: G }}>Pas quotidiens</div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const v = window.prompt("Objectif de pas par jour :", String(nutGoals?.pas || 8000));
                        if (v && !isNaN(parseInt(v))) {
                          const newGoal = parseInt(v);
                          setNutGoals(prev => ({ ...prev, pas: newGoal }));
                          supabase.from("nutrition_goals").upsert({ client_id: client.id, ...nutGoals, pas: newGoal }, { onConflict: "client_id" });
                        }
                      }}
                      style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 9, color: "rgba(255,255,255,0.35)", marginTop: 2, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", padding: 0 }}
                    >
                      Objectif : {(nutGoals?.pas || 8000).toLocaleString()} pas
                      <Icon name="view" size={9} color="rgba(255,255,255,0.25)" />
                    </button>
                  </div>
                  <Icon name="arrow-right" size={12} color="rgba(255,255,255,0.2)" />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {daily7d.slice(-7).map((d, i) => {
                    const stepsGoal = nutGoals?.pas || 8000;
                    const pct = Math.min(100, Math.round(((d.pas || 0) / stepsGoal) * 100));
                    const dayLabel = new Date(d.date + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "short", day: "numeric" });
                    return (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ fontSize: 9, color: "rgba(255,255,255,0.35)", width: 50, flexShrink: 0, textTransform: "capitalize" }}>{dayLabel}</div>
                        <div style={{ flex: 1, height: 6, background: "rgba(255,255,255,0.04)", borderRadius: 3, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: pct + "%", background: pct >= 100 ? G : ORANGE, borderRadius: 3, transition: "width 0.3s" }} />
                        </div>
                        <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, fontWeight: 700, color: pct >= 100 ? G : "rgba(255,255,255,0.5)", width: 45, textAlign: "right" }}>{(d.pas || 0).toLocaleString()}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
              {/* Card Eau — cliquable, ouvre drawer complet */}
              <div onClick={() => setDrawer("eau")} style={{ ...card, cursor: "pointer", transition: "border-color 0.2s" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase", color: "#38bdf8" }}>Hydratation</div>
                  <Icon name="arrow-right" size={12} color="rgba(255,255,255,0.2)" />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {daily7d.slice(-7).map((d, i) => {
                    const dayLabel = new Date(d.date + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "short", day: "numeric" });
                    const waterL = ((d.eau_ml || 0) / 1000).toFixed(1);
                    const goal = (nutGoals?.eau_ml || 2500) / 1000;
                    const ok = parseFloat(waterL) >= goal;
                    return (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ fontSize: 9, color: "rgba(255,255,255,0.35)", width: 50, flexShrink: 0, textTransform: "capitalize" }}>{dayLabel}</div>
                        <div style={{ flex: 1, height: 5, background: "rgba(255,255,255,0.04)", borderRadius: 3, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: Math.min(100, (parseFloat(waterL) / goal) * 100) + "%", background: ok ? "#38bdf8" : "rgba(56,189,248,0.4)", borderRadius: 3 }} />
                        </div>
                        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, fontWeight: 700, color: ok ? "#38bdf8" : "rgba(255,255,255,0.4)", width: 32, textAlign: "right" }}>{waterL}L</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Card Sommeil — cliquable, ouvre drawer complet */}
              <div onClick={() => setDrawer("sommeil")} style={{ ...card, cursor: "pointer", transition: "border-color 0.2s" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase", color: VIOLET }}>Sommeil</div>
                  <Icon name="arrow-right" size={12} color="rgba(255,255,255,0.2)" />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {daily7d.slice(-7).map((d, i) => {
                    const dayLabel = new Date(d.date + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "short", day: "numeric" });
                    const sh = d.sommeil_h || 0;
                    const under = sh < 7;
                    return (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ fontSize: 9, color: "rgba(255,255,255,0.35)", width: 50, flexShrink: 0, textTransform: "capitalize" }}>{dayLabel}</div>
                        <div style={{ flex: 1, height: 5, background: "rgba(255,255,255,0.04)", borderRadius: 3, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: Math.min(100, (sh / 9) * 100) + "%", background: under ? RED : VIOLET, borderRadius: 3, opacity: under ? 0.8 : 1 }} />
                        </div>
                        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, fontWeight: 700, color: under ? RED : VIOLET, width: 24, textAlign: "right" }}>{sh}h</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        </>)}

        {/* ===== TAB: PROGRAMME ===== */}
        {panelTab === "programme" && (<>

        {/* ===== HISTORIQUE SEANCES — avec detail poids souleves ===== */}
        <div style={{ ...section, animation: "cpFadeUp 0.4s ease 0.22s both" }}>
          <div style={sectionTitle}>
            <Icon name="flame" size={14} color={G} />
            Historique seances{sessions.length > 0 ? ` (${sessions.length})` : ""}
          </div>
          {sessions.length === 0 ? (
            <div style={{ ...card, fontSize: 12, color: "rgba(255,255,255,0.35)", textAlign: "center", padding: "18px 12px" }}>
              Aucune seance enregistree pour le moment.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {sessions.slice(0, 12).map((s, i) => {
                const date = new Date(s.logged_at);
                const dateStr = date.toISOString().split("T")[0];
                const durationMin = s.duration_seconds ? Math.round(s.duration_seconds / 60) : null;
                // Exercices de cette seance (meme jour)
                const dayExs = exLogs.filter(e => e.logged_at && e.logged_at.startsWith(dateStr));
                // Grouper par exercice et prendre le max poids
                const exSummary = {};
                dayExs.forEach(e => {
                  const name = (e.ex_key || "").split("_").slice(-1)[0] || e.ex_key;
                  if (!exSummary[name] || e.weight > exSummary[name].w) {
                    exSummary[name] = { w: e.weight, r: e.reps, s: e.sets };
                  }
                });
                const topExos = Object.entries(exSummary).sort((a, b) => b[1].w - a[1].w).slice(0, 4);

                return (
                  <div key={i} style={{ ...card, padding: "14px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: topExos.length > 0 ? 10 : 0 }}>
                      <div style={{ width: 38, height: 38, borderRadius: 12, background: G_DIM, border: `1px solid ${G_BORDER}`, display: "flex", alignItems: "center", justifyContent: "center", color: G, flexShrink: 0 }}>
                        <Icon name="check" size={15} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {s.session_name || s.programme_name || "Seance"}
                        </div>
                        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", marginTop: 2 }}>
                          {date.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })}
                          {durationMin != null && <span> · {durationMin} min</span>}
                          {s.exercises_count > 0 && <span> · {s.exercises_count} exos</span>}
                        </div>
                      </div>
                      {durationMin != null && (
                        <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 15, fontWeight: 200, color: G, flexShrink: 0 }}>
                          {durationMin}<span style={{ fontSize: 9, color: "rgba(255,255,255,0.3)" }}>min</span>
                        </div>
                      )}
                    </div>
                    {/* Detail poids souleves par exercice */}
                    {topExos.length > 0 && (
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", paddingLeft: 50 }}>
                        {topExos.map(([name, d], j) => (
                          <div key={j} style={{
                            padding: "4px 10px",
                            background: "rgba(255,255,255,0.03)",
                            border: "1px solid rgba(255,255,255,0.05)",
                            borderRadius: 100,
                            fontSize: 10,
                            display: "flex", alignItems: "center", gap: 5,
                          }}>
                            <span style={{ color: "rgba(255,255,255,0.5)", fontWeight: 600, textTransform: "capitalize" }}>{name}</span>
                            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, color: G }}>{d.w}kg</span>
                            {d.r > 0 && <span style={{ color: "rgba(255,255,255,0.3)" }}>x{d.r}</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* (historique poids complet supprime : accessible via le drawer sur la card poids) */}

        {/* ===== PROGRESSION — SECTION UNIFIEE PREMIUM ===== */}
        <div style={{ ...section, animation: "cpFadeUp 0.4s ease 0.2s both" }}>
          <div style={sectionTitle}>
            <Icon name="chart" size={14} color={G} />
            Progression
          </div>

          {/* Streak + stats headline */}
          {(() => {
            // Calcul du streak actuel
            let streak = 0;
            const today = new Date();
            for (let i = 0; i < 60; i++) {
              const d = new Date(today); d.setDate(d.getDate() - i);
              const ds = d.toISOString().split("T")[0];
              const hasLog = sessions.some(s => s.logged_at?.startsWith(ds));
              if (hasLog) streak++;
              else if (i > 0) break;
            }
            const totalSessions = sessions.length;
            const avgRpe = rpeData.length > 0 ? (rpeData.reduce((a, r) => a + r.rpe, 0) / rpeData.length).toFixed(1) : "--";
            return (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10, marginBottom: 20 }}>
                <div style={{ ...card, textAlign: "center", padding: "14px 8px" }}>
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 28, fontWeight: 200, color: G, lineHeight: 1 }}>{streak}</div>
                  <div style={{ fontSize: 8, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "1.5px", marginTop: 6, fontWeight: 700 }}>Jours de streak</div>
                </div>
                <div style={{ ...card, textAlign: "center", padding: "14px 8px" }}>
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 28, fontWeight: 200, color: "#fff", lineHeight: 1 }}>{totalSessions}</div>
                  <div style={{ fontSize: 8, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "1.5px", marginTop: 6, fontWeight: 700 }}>Seances total</div>
                </div>
                <div style={{ ...card, textAlign: "center", padding: "14px 8px" }}>
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 28, fontWeight: 200, color: ORANGE, lineHeight: 1 }}>{avgRpe}</div>
                  <div style={{ fontSize: 8, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "1.5px", marginTop: 6, fontWeight: 700 }}>RPE moyen</div>
                </div>
              </div>
            );
          })()}

          {/* Timeline seances + RPE combine */}
          {sessions.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: 10 }}>Timeline seances</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {sessions.slice(0, 10).map((s, i) => {
                  const date = new Date(s.logged_at);
                  const durationMin = s.duration_seconds ? Math.round(s.duration_seconds / 60) : null;
                  // Trouver RPE du même jour
                  const dateStr = date.toISOString().split("T")[0];
                  const dayRpe = rpeData.find(r => r.date === dateStr);
                  return (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      {/* Timeline dot + line */}
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 20, flexShrink: 0 }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: G, boxShadow: i === 0 ? `0 0 10px ${G}` : "none" }} />
                        {i < Math.min(sessions.length, 10) - 1 && <div style={{ width: 1, height: 28, background: "rgba(255,255,255,0.06)", marginTop: 4 }} />}
                      </div>
                      {/* Content */}
                      <div style={{ flex: 1, padding: "10px 14px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: "#fff" }}>{s.session_name || "Seance"}</div>
                          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", marginTop: 2 }}>
                            {date.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })}
                            {durationMin != null && <span> · {durationMin} min</span>}
                            {s.exercises_count > 0 && <span> · {s.exercises_count} exos</span>}
                          </div>
                        </div>
                        {dayRpe && (
                          <div style={{
                            padding: "4px 10px", borderRadius: 100,
                            background: RPE_COLORS[dayRpe.rpe] + "15",
                            border: "1px solid " + RPE_COLORS[dayRpe.rpe] + "30",
                            fontFamily: "'JetBrains Mono',monospace", fontSize: 11, fontWeight: 700,
                            color: RPE_COLORS[dayRpe.rpe],
                          }}>
                            RPE {dayRpe.rpe}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* RPE evolution en barres */}
          {rpeData.length > 2 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: 10 }}>Evolution du RPE</div>
              <div style={{ ...card, padding: "14px 16px" }}>
                <div style={{ display: "flex", gap: 4, alignItems: "flex-end", height: 60 }}>
                  {[...rpeData].reverse().slice(-15).map((r, i) => {
                    const h = (r.rpe / 5) * 100;
                    return (
                      <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                        <div style={{ fontSize: 8, fontWeight: 700, color: RPE_COLORS[r.rpe] }}>{r.rpe}</div>
                        <div style={{ width: "100%", height: h + "%", minHeight: 4, background: RPE_COLORS[r.rpe], borderRadius: 3, opacity: 0.9 }} />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ClientAnalytics supprime de la section Progression — les donnees
              poids et pas sont accessibles via leurs cards cliquables dediees */}

          {/* Top exercices avec sparkline */}
          {topEx.length > 0 && (
            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: 10 }}>Top exercices</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 10 }}>
                {topEx.map(([key, data], i) => {
                  const name = key.split("_").slice(-1)[0] || key;
                  const latest = data[data.length - 1];
                  const first = data[0];
                  const delta = latest.weight - first.weight;
                  const max = Math.max(...data.map(d => d.weight));
                  return (
                    <div key={i} style={card}>
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", marginBottom: 2, textTransform: "capitalize" }}>{name}</div>
                          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)" }}>{data.length} seances · max {max} kg</div>
                        </div>
                        <div style={{ fontSize: 12, fontWeight: 800, color: delta >= 0 ? G : RED }}>
                          {delta >= 0 ? "+" : ""}{delta.toFixed(1)} kg
                        </div>
                      </div>
                      <MiniSparkline data={data} color={delta >= 0 ? G : RED} w={200} h={32} />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {sessions.length === 0 && topEx.length === 0 && (
            <div style={{ ...card, textAlign: "center", padding: 28, color: "rgba(255,255,255,0.3)", fontSize: 13 }}>
              Pas encore de donnees de progression
            </div>
          )}
        </div>

        </>)}

        {/* Objectifs nutritionnels dans l'onglet Nutrition */}
        {panelTab === "nutrition" && (<>
        {/* ===== NUTRITION ===== */}
        <div style={{ ...section, animation: "cpFadeUp 0.4s ease 0.28s both" }}>
          <div style={sectionTitle}>
            <Icon name="apple" size={14} color={G} />
            Objectifs nutritionnels
          </div>
          {!nutGoals ? (
            <div style={{ ...card, fontSize: 12, color: "rgba(255,255,255,0.35)", textAlign: "center", padding: "18px 12px" }}>
              Chargement des objectifs...
            </div>
          ) : (
          <div style={card}>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 14 }}>
                Definir les objectifs de {firstName}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {[
                  { key: "calories", label: "Calories", unit: "kcal", min: 500, max: 5000, step: 50, color: ORANGE },
                  { key: "proteines", label: "Proteines", unit: "g", min: 50, max: 400, step: 5, color: G },
                  { key: "glucides", label: "Glucides", unit: "g", min: 50, max: 600, step: 10, color: "#60a5fa" },
                  { key: "lipides", label: "Lipides", unit: "g", min: 20, max: 200, step: 5, color: VIOLET },
                  { key: "eau_ml", label: "Eau", unit: "mL", min: 500, max: 5000, step: 250, color: "#38bdf8" },
                  { key: "pas", label: "Pas / jour", unit: "pas", min: 2000, max: 20000, step: 500, color: "#34d399" },
                ].map(({ key, label, unit, min, max, step, color }) => (
                  <div key={key}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", fontWeight: 600 }}>{label}</div>
                      <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, color, fontWeight: 700 }}>{nutGoals[key]?.toLocaleString()} {unit}</div>
                    </div>
                    <input type="range" min={min} max={max} step={step} value={nutGoals[key] || 0}
                      onChange={e => setNutGoals(prev => ({ ...prev, [key]: parseInt(e.target.value) }))}
                      style={{ width: "100%", accentColor: color }} />
                  </div>
                ))}
              </div>
              <button
                onClick={async () => {
                  setNutSaving(true);
                  const { error } = await supabase.from("nutrition_goals").upsert({ client_id: client.id, ...nutGoals }, { onConflict: "client_id" });
                  setNutSaving(false);
                  if (error) toast.error("Objectifs non enregistres");
                  else { haptic.success(); toast.success("Objectifs mis a jour"); }
                }}
                style={{ width: "100%", padding: 14, background: `linear-gradient(135deg, ${G}, #0891b2)`, color: "#000", border: "none", borderRadius: 12, fontSize: 13, fontWeight: 800, cursor: "pointer", marginTop: 16, textTransform: "uppercase", letterSpacing: "0.5px", fontFamily: "inherit", boxShadow: "0 8px 24px rgba(2,209,186,0.25)" }}
              >
                {nutSaving ? (<span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}><Spinner variant="dots" size={16} color="#000" />Enregistrement</span>) : "Sauvegarder les objectifs"}
              </button>
            </div>
          )}
        </div>

        </>)}

        {/* ===== TAB: SUIVI ===== */}
        {panelTab === "suivi" && (<>

        {/* ===== NIVEAU CLIENT AUTO ===== */}
        {(() => {
          const sessCount = sessions.length;
          const avgWeight = logs.length > 0 ? logs.reduce((s, l) => s + (l.weight || 0), 0) / logs.length : 0;
          const level = sessCount >= 50 || avgWeight >= 80 ? { name: "Avance", color: G, icon: "trending" }
            : sessCount >= 15 || avgWeight >= 40 ? { name: "Intermediaire", color: ORANGE, icon: "flame" }
            : { name: "Debutant", color: VIOLET, icon: "activity" };
          return (
            <div style={{ ...section, animation: "cpFadeUp 0.4s ease 0.3s both" }}>
              <div style={sectionTitle}>
                <Icon name="users" size={14} color={G} />
                Profil athlete
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <div style={{ ...card, flex: 1, minWidth: 140, display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: `${level.color}15`, border: `1px solid ${level.color}30`, display: "flex", alignItems: "center", justifyContent: "center", color: level.color }}>
                    <Icon name={level.icon} size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: level.color }}>{level.name}</div>
                    <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)" }}>{sessCount} seances · moy {Math.round(avgWeight)}kg</div>
                  </div>
                </div>
                <div style={{ ...card, flex: 1, minWidth: 140, textAlign: "center" }}>
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 24, fontWeight: 200, color: "#fff" }}>{sessCount}</div>
                  <div style={{ fontSize: 8, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "1px", marginTop: 4, fontWeight: 700 }}>Seances depuis le debut</div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* ===== VOIR LA TRANSFORMATION ===== */}
        <div style={{ ...section, animation: "cpFadeUp 0.4s ease 0.26s both" }}>
          <button
            onClick={() => setShowTransformation(true)}
            style={{
              width: "100%", padding: "16px 20px",
              background: "linear-gradient(135deg, rgba(0,201,167,0.08), rgba(0,201,167,0.04))",
              border: "1px solid rgba(0,201,167,0.25)",
              borderRadius: 16,
              color: "#fff",
              cursor: "pointer",
              fontFamily: "inherit",
              display: "flex", alignItems: "center", gap: 14,
              textAlign: "left",
            }}
          >
            <div style={{ width: 40, height: 40, borderRadius: "50%", background: "rgba(0,201,167,0.15)", border: "1px solid rgba(0,201,167,0.35)", display: "flex", alignItems: "center", justifyContent: "center", color: "#00C9A7", flexShrink: 0 }}>
              <Icon name="trending" size={18} color="#00C9A7" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: "#fff", marginBottom: 2 }}>Voir la transformation</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", lineHeight: 1.4 }}>Timeline complete depuis le jour 1 + PDF partageable</div>
            </div>
            <Icon name="arrow-right" size={14} color="rgba(255,255,255,0.4)" />
          </button>
        </div>

        {/* ===== TAGS CRM ===== */}
        <div style={{ ...section, animation: "cpFadeUp 0.4s ease 0.28s both" }}>
          <div style={sectionTitle}>
            <Icon name="lightning" size={14} color={G} />
            Tags
            <span style={{ fontSize: 8, color: "rgba(255,255,255,0.25)", fontWeight: 600, letterSpacing: "1px", marginLeft: "auto" }}>POUR FILTRER TES CLIENTS</span>
          </div>
          <div style={card}>
            <TagManager client={client} onUpdate={(newTags) => { client.tags = newTags; }} />
          </div>
        </div>

        {/* ===== TIMELINE ACTIVITY ===== */}
        <div style={{ ...section, animation: "cpFadeUp 0.4s ease 0.30s both" }}>
          <div style={sectionTitle}>
            <Icon name="activity" size={14} color={G} />
            Timeline
          </div>
          <div style={{ ...card, padding: "18px 18px 14px" }}>
            <ActivityTimeline clientId={client.id} coachId={coachId} />
          </div>
        </div>

        {/* ===== NOTES COACH (internes, invisibles par le client) ===== */}
        <div style={{ ...section, animation: "cpFadeUp 0.4s ease 0.32s both" }}>
          <div style={sectionTitle}>
            <Icon name="document" size={14} color={G} />
            Notes internes
            <span style={{ fontSize: 8, color: "rgba(255,255,255,0.25)", fontWeight: 600, letterSpacing: "1px", marginLeft: "auto" }}>INVISIBLE PAR LE CLIENT</span>
          </div>
          <div style={card}>
            {/* Input nouvelle note */}
            <div style={{ display: "flex", gap: 8, marginBottom: coachNotes.length > 0 ? 14 : 0 }}>
              <textarea
                value={newNote}
                onChange={e => setNewNote(e.target.value)}
                placeholder={"Note sur " + firstName + "..."}
                rows={2}
                style={{
                  flex: 1, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 12, padding: "10px 14px", color: "#fff",
                  fontFamily: "inherit", fontSize: 13, resize: "none", outline: "none",
                  transition: "border-color 0.2s",
                }}
                onFocus={(e) => { e.target.style.borderColor = "rgba(2,209,186,0.4)"; }}
                onBlur={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.08)"; }}
              />
              <button
                onClick={async () => {
                  if (!newNote.trim() || noteSaving) return;
                  setNoteSaving(true);
                  const content = newNote.trim();
                  const { data, error } = await supabase.from("coach_notes").insert({
                    client_id: client.id, coach_id: coachId, content,
                  }).select().single();
                  setNoteSaving(false);
                  if (error) { toast.error("Note non enregistree"); return; }
                  if (data) setCoachNotes(prev => [data, ...prev]);
                  setNewNote("");
                  haptic.light();
                  // Log dans activity feed (non bloquant)
                  if (coachId) {
                    supabase.from("coach_activity_log").insert({
                      coach_id: coachId,
                      client_id: client.id,
                      activity_type: "note",
                      details: content.slice(0, 120),
                    }).then(() => {});
                  }
                }}
                disabled={!newNote.trim() || noteSaving}
                style={{
                  alignSelf: "flex-end", width: 40, height: 40, borderRadius: "50%", flexShrink: 0,
                  background: newNote.trim() ? `linear-gradient(135deg, ${G}, #0891b2)` : "rgba(255,255,255,0.04)",
                  border: "none", cursor: newNote.trim() ? "pointer" : "default",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: newNote.trim() ? "#000" : "rgba(255,255,255,0.25)",
                }}
              >
                <Icon name="plus" size={16} />
              </button>
            </div>
            {/* Liste des notes */}
            {coachNotes.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {coachNotes.map((n) => (
                  <div key={n.id} style={{
                    padding: "10px 14px",
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid rgba(255,255,255,0.04)",
                    borderRadius: 10,
                    position: "relative",
                  }}>
                    <div style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{n.content}</div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6 }}>
                      <div style={{ fontSize: 9, color: "rgba(255,255,255,0.25)" }}>
                        {new Date(n.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </div>
                      <button
                        onClick={async () => {
                          await supabase.from("coach_notes").delete().eq("id", n.id);
                          setCoachNotes(prev => prev.filter(x => x.id !== n.id));
                        }}
                        style={{ background: "none", border: "none", color: "rgba(255,255,255,0.15)", fontSize: 10, cursor: "pointer", padding: 0, fontFamily: "inherit" }}
                      >
                        supprimer
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {coachNotes.length === 0 && !newNote && (
              <div style={{ textAlign: "center", padding: 16, color: "rgba(255,255,255,0.25)", fontSize: 12 }}>
                Aucune note — ecris tes observations ici
              </div>
            )}
          </div>
        </div>

        {/* ===== MESSAGES ===== */}
        <div style={{ ...section, animation: "cpFadeUp 0.4s ease 0.32s both" }}>
          <div style={sectionTitle}>
            <Icon name="message" size={14} color={G} />
            Messages
          </div>
          <div style={card}>
            <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
              <textarea
                value={msgText}
                onChange={e => setMsgText(e.target.value)}
                placeholder={"Message a " + firstName + "..."}
                rows={2}
                style={{
                  flex: 1, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 12, padding: "12px 14px", color: "#fff",
                  fontFamily: "inherit", fontSize: 14, resize: "none", outline: "none",
                  transition: "border-color 0.2s",
                }}
                onFocus={(e) => { e.target.style.borderColor = "rgba(2,209,186,0.4)"; }}
                onBlur={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.08)"; }}
                onKeyDown={e => { if (e.key === "Enter" && e.metaKey) sendMessage(); }}
              />
              <button onClick={sendMessage} disabled={!msgText.trim() || sending} style={{
                alignSelf: "flex-end", width: 44, height: 44, borderRadius: "50%", flexShrink: 0,
                background: msgText.trim() ? `linear-gradient(135deg, ${G}, #0891b2)` : "rgba(255,255,255,0.04)",
                border: "none", cursor: msgText.trim() ? "pointer" : "not-allowed",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: msgText.trim() ? "#000" : "rgba(255,255,255,0.25)",
                boxShadow: msgText.trim() ? "0 6px 20px rgba(2,209,186,0.3)" : "none",
                transition: "all 0.2s",
              }}>
                <Icon name="arrow-right" size={16} />
              </button>
            </div>
            {messages.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {messages.map((m, i) => (
                  <div key={i} style={{
                    background: m.from_coach ? "rgba(2,209,186,0.06)" : "rgba(255,255,255,0.025)",
                    borderRadius: m.from_coach ? "14px 14px 6px 14px" : "14px 14px 14px 6px",
                    border: `1px solid ${m.from_coach ? "rgba(2,209,186,0.2)" : "rgba(255,255,255,0.06)"}`,
                    padding: "10px 14px",
                    opacity: m.read ? 0.7 : 1,
                    maxWidth: "85%",
                    alignSelf: m.from_coach ? "flex-end" : "flex-start",
                  }}>
                    <div style={{ fontSize: 13, color: "#fff", lineHeight: 1.5 }}>{m.content}</div>
                    <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", marginTop: 4, display: "flex", justifyContent: "space-between", gap: 12 }}>
                      <span>{m.from_coach ? "Toi" : firstName}</span>
                      <span>{m.read ? "Lu" : "Non lu"} · {new Date(m.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {messages.length === 0 && (
              <div style={{ textAlign: "center", padding: 20, color: "rgba(255,255,255,0.3)", fontSize: 12 }}>
                Aucun message pour le moment — envoie le premier
              </div>
            )}
          </div>
        </div>

        {/* ===== SEANCE VIVANTE ===== */}
        <div style={{ ...section, animation: "cpFadeUp 0.4s ease 0.36s both" }}>
          <div style={sectionTitle}>
            <Icon name="lightning" size={14} color={G} />
            Seance Vivante
          </div>
          <div style={card}>
            <SeanceVivanteCoach clientId={client.id} clientName={client.full_name} isDemo={isDemo} />
          </div>
        </div>

        {/* ===== ZONE DANGEREUSE ===== */}
        <div style={{ ...section, animation: "cpFadeUp 0.4s ease 0.4s both", paddingTop: 20, borderTop: "1px solid rgba(255,107,107,0.1)" }}>
          <button
            onClick={() => { if (window.confirm("Supprimer definitivement " + (client.full_name || client.email) + " ?")) onDelete(client.id, client.email); }}
            style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: "rgba(255,107,107,0.5)", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", padding: 0 }}
          >
            <Icon name="trash" size={12} />
            Supprimer ce client
          </button>
        </div>

        </>)}

      </div>

      {/* ===== TRANSFORMATION VIEW (overlay) ===== */}
      {showTransformation && (
        <ErrorBoundary name="TransformationView">
          <TransformationView
            client={client}
            coach={coachData}
            onClose={() => setShowTransformation(false)}
            isDemo={isDemo}
          />
        </ErrorBoundary>
      )}

      {/* ===== AI ANALYZE (modal) ===== */}
      {showAIAnalyze && (
        <AIAnalyze
          client={client}
          coachId={coachData?.id}
          isDemo={isDemo}
          onClose={() => setShowAIAnalyze(false)}
        />
      )}

      {/* ===== DRAWERS DONNEES (Poids / Eau / Sommeil) ===== */}
      {drawer && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setDrawer(null); }}
          style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(0,0,0,0.85)", backdropFilter: "blur(16px)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}
        >
          <div style={{ width: "100%", maxWidth: 560, maxHeight: "85vh", background: "#0a0a0a", borderRadius: "24px 24px 0 0", border: "1px solid rgba(255,255,255,0.08)", borderBottom: "none", display: "flex", flexDirection: "column", overflow: "hidden", animation: "cpFadeUp 0.3s ease both" }}>
            {/* Handle */}
            <div style={{ width: 36, height: 4, background: "rgba(255,255,255,0.12)", borderRadius: 2, margin: "10px auto 0" }} />
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 22px 12px" }}>
              <div style={{ fontSize: 17, fontWeight: 800, color: "#fff", letterSpacing: "-0.3px" }}>
                {drawer === "poids" ? "Historique poids" : drawer === "eau" ? "Hydratation 30j" : drawer === "pas" ? "Pas quotidiens 30j" : "Sommeil 30j"}
              </div>
              <button onClick={() => setDrawer(null)} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 100, width: 30, height: 30, color: "rgba(255,255,255,0.5)", fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: "8px 22px 28px", WebkitOverflowScrolling: "touch" }}>
              {/* ── DRAWER POIDS — graphique complet depuis le debut ── */}
              {drawer === "poids" && (
                <div>
                  {/* Stats headline */}
                  {allWeights.length >= 2 && (() => {
                    const first = allWeights[allWeights.length - 1];
                    const last = allWeights[0];
                    const delta = last.weight - first.weight;
                    const minW = Math.min(...allWeights.map(w => w.weight));
                    const maxW = Math.max(...allWeights.map(w => w.weight));
                    return (
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 20 }}>
                        <div style={{ textAlign: "center" }}>
                          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 20, fontWeight: 200, color: "#fff" }}>{last.weight}</div>
                          <div style={{ fontSize: 8, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "1px", marginTop: 4, fontWeight: 700 }}>Actuel</div>
                        </div>
                        <div style={{ textAlign: "center" }}>
                          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 20, fontWeight: 200, color: delta > 0 ? ORANGE : delta < 0 ? G : "rgba(255,255,255,0.5)" }}>
                            {delta > 0 ? "+" : ""}{delta.toFixed(1)}
                          </div>
                          <div style={{ fontSize: 8, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "1px", marginTop: 4, fontWeight: 700 }}>Delta</div>
                        </div>
                        <div style={{ textAlign: "center" }}>
                          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 20, fontWeight: 200, color: G }}>{minW}</div>
                          <div style={{ fontSize: 8, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "1px", marginTop: 4, fontWeight: 700 }}>Min</div>
                        </div>
                        <div style={{ textAlign: "center" }}>
                          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 20, fontWeight: 200, color: ORANGE }}>{maxW}</div>
                          <div style={{ fontSize: 8, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "1px", marginTop: 4, fontWeight: 700 }}>Max</div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Graphique ligne complet */}
                  <div style={{ marginBottom: 20, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 14, padding: "16px 8px 8px" }}>
                    <LineGraph data={[...allWeights].reverse()} color={G} height={220} unit="kg" valueKey="weight" />
                  </div>

                  {/* Periode couverte */}
                  {allWeights.length >= 2 && (
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", textAlign: "center", marginBottom: 16 }}>
                      {allWeights.length} pesees · du {new Date(allWeights[allWeights.length - 1].date).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })} au {new Date(allWeights[0].date).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                    </div>
                  )}

                  {/* Liste des pesees */}
                  <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: 8 }}>Toutes les pesees</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {allWeights.map((w, i) => {
                      const prev = allWeights[i + 1];
                      const diff = prev ? w.weight - prev.weight : null;
                      return (
                        <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 12px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.03)", borderRadius: 8 }}>
                          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)" }}>
                            {new Date(w.date).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })}
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            {diff !== null && (
                              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, fontWeight: 700, color: diff > 0 ? ORANGE : diff < 0 ? G : "rgba(255,255,255,0.25)" }}>
                                {diff > 0 ? "+" : ""}{diff.toFixed(1)}
                              </span>
                            )}
                            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, fontWeight: 700, color: "#fff" }}>
                              {w.weight}<span style={{ fontSize: 9, color: "rgba(255,255,255,0.3)" }}> kg</span>
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── DRAWER PAS — graphique 30j ── */}
              {drawer === "pas" && (() => {
                const data = daily30d.filter(d => d.pas > 0);
                const avg = data.length > 0 ? Math.round(data.reduce((s, d) => s + d.pas, 0) / data.length) : 0;
                const goal = nutGoals?.pas || 8000;
                const daysAtGoal = data.filter(d => d.pas >= goal).length;
                const graphData = data.map(d => ({ date: d.date, value: d.pas }));
                return (
                  <div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
                      <div style={{ textAlign: "center", padding: 12, background: G_DIM, border: `1px solid ${G_BORDER}`, borderRadius: 12 }}>
                        <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 24, fontWeight: 200, color: G }}>{avg.toLocaleString()}</div>
                        <div style={{ fontSize: 8, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "1px", marginTop: 4, fontWeight: 700 }}>Moy / jour</div>
                      </div>
                      <div style={{ textAlign: "center", padding: 12, background: daysAtGoal > 0 ? G_DIM : "rgba(255,255,255,0.02)", border: `1px solid ${daysAtGoal > 0 ? G_BORDER : "rgba(255,255,255,0.05)"}`, borderRadius: 12 }}>
                        <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 24, fontWeight: 200, color: daysAtGoal > 0 ? G : "rgba(255,255,255,0.4)" }}>{daysAtGoal}</div>
                        <div style={{ fontSize: 8, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "1px", marginTop: 4, fontWeight: 700 }}>Jours objectif</div>
                      </div>
                    </div>
                    {graphData.length >= 2 && (
                      <div style={{ marginBottom: 20, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 14, padding: "16px 8px 8px" }}>
                        <LineGraph data={graphData} color={G} height={180} unit="pas" valueKey="value" />
                      </div>
                    )}
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      {data.slice(-14).reverse().map((d, i) => {
                        const atGoal = d.pas >= goal;
                        return (
                          <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", background: atGoal ? G_DIM : "rgba(255,255,255,0.02)", border: atGoal ? `1px solid ${G_BORDER}` : "none", borderRadius: 8, fontSize: 12 }}>
                            <span style={{ color: "rgba(255,255,255,0.4)" }}>{new Date(d.date + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })}</span>
                            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, color: atGoal ? G : "rgba(255,255,255,0.5)" }}>{d.pas.toLocaleString()}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* ── DRAWER EAU — graphique 30j ── */}
              {drawer === "eau" && (() => {
                const data = daily30d.filter(d => d.eau_ml > 0);
                const avg = data.length > 0 ? Math.round(data.reduce((s, d) => s + d.eau_ml, 0) / data.length) : 0;
                const graphData = data.map(d => ({ date: d.date, value: d.eau_ml / 1000 }));
                return (
                  <div>
                    <div style={{ textAlign: "center", marginBottom: 20 }}>
                      <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 36, fontWeight: 200, color: "#38bdf8" }}>{(avg / 1000).toFixed(1)}</span>
                      <span style={{ fontSize: 14, color: "rgba(255,255,255,0.35)", marginLeft: 4 }}>L / jour</span>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 6 }}>Moyenne sur {data.length} jours</div>
                    </div>
                    {graphData.length >= 2 && (
                      <div style={{ marginBottom: 20, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 14, padding: "16px 8px 8px" }}>
                        <LineGraph data={graphData} color="#38bdf8" height={180} unit="L" valueKey="value" />
                      </div>
                    )}
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      {data.slice(-14).reverse().map((d, i) => (
                        <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", background: "rgba(255,255,255,0.02)", borderRadius: 8, fontSize: 12 }}>
                          <span style={{ color: "rgba(255,255,255,0.4)" }}>{new Date(d.date + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })}</span>
                          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, color: "#38bdf8" }}>{(d.eau_ml / 1000).toFixed(1)} L</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* ── DRAWER SOMMEIL — graphique 30j ── */}
              {drawer === "sommeil" && (() => {
                const data = daily30d.filter(d => d.sommeil_h > 0);
                const avg = data.length > 0 ? (data.reduce((s, d) => s + d.sommeil_h, 0) / data.length).toFixed(1) : 0;
                const under7 = data.filter(d => d.sommeil_h < 7).length;
                const graphData = data.map(d => ({ date: d.date, value: d.sommeil_h }));
                return (
                  <div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
                      <div style={{ textAlign: "center", padding: 12, background: "rgba(0,201,167,0.06)", border: "1px solid rgba(0,201,167,0.15)", borderRadius: 12 }}>
                        <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 28, fontWeight: 200, color: VIOLET }}>{avg}</div>
                        <div style={{ fontSize: 8, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "1px", marginTop: 4, fontWeight: 700 }}>h / nuit</div>
                      </div>
                      <div style={{ textAlign: "center", padding: 12, background: under7 > 0 ? "rgba(255,107,107,0.06)" : "rgba(255,255,255,0.02)", border: `1px solid ${under7 > 0 ? "rgba(255,107,107,0.15)" : "rgba(255,255,255,0.05)"}`, borderRadius: 12 }}>
                        <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 28, fontWeight: 200, color: under7 > 0 ? RED : G }}>{under7}</div>
                        <div style={{ fontSize: 8, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "1px", marginTop: 4, fontWeight: 700 }}>Nuits &lt; 7h</div>
                      </div>
                    </div>
                    {graphData.length >= 2 && (
                      <div style={{ marginBottom: 20, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 14, padding: "16px 8px 8px" }}>
                        <LineGraph data={graphData} color={VIOLET} height={180} unit="h" valueKey="value" />
                      </div>
                    )}
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      {data.slice(-14).reverse().map((d, i) => {
                        const under = d.sommeil_h < 7;
                        return (
                          <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", background: under ? "rgba(255,107,107,0.06)" : "rgba(255,255,255,0.02)", border: under ? "1px solid rgba(255,107,107,0.15)" : "none", borderRadius: 8, fontSize: 12 }}>
                            <span style={{ color: "rgba(255,255,255,0.4)" }}>{new Date(d.date + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })}</span>
                            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, color: under ? RED : VIOLET }}>{d.sommeil_h}h</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
    </>
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

function SeanceVivanteCoach({ clientId, clientName, isDemo = false }) {
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

  // Demo: simule une session live pour Marc Dubois
  const demoLive = React.useMemo(() => {
    if (!isDemo) return null;
    const isMarc = /marc/i.test(clientName || "");
    if (!isMarc) return null;
    return {
      session_name: "Push — Semaine 1",
      started_at: new Date(Date.now() - 23 * 60000).toISOString(),
      current_exercise: "Squat",
      current_set: 3,
      total_sets: 4,
      current_weight: 100,
      feed: [
        { t: "12:34", text: "Developpe couche S1", weight: 80, done: true },
        { t: "12:38", text: "Developpe couche S2", weight: 80, done: true },
        { t: "12:43", text: "Squat S1", weight: 100, done: true },
        { t: "12:47", text: "Squat S2", weight: 100, done: false },
      ],
    };
  }, [isDemo, clientName]);

  React.useEffect(() => {
    if (!clientId) return;
    // En demo on ne fait pas de polling
    if (isDemo) { if (demoLive) setIsLive(true); return; }
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
  }, [clientId, isDemo, demoLive]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Priorite absolue mp4 pour compatibilite iOS Safari
      let mimeType = "audio/webm";
      if (MediaRecorder.isTypeSupported("audio/mp4")) mimeType = "audio/mp4";
      else if (MediaRecorder.isTypeSupported("audio/mp4;codecs=avc1")) mimeType = "audio/mp4;codecs=avc1";
      else if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) mimeType = "audio/webm;codecs=opus";
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
      toast.error("Micro non disponible");
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
        {demoLive && (
          <div style={{ marginLeft: "auto", fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: "#02d1ba", fontWeight: 500 }}>23 min</div>
        )}
      </div>

      {/* ===== DEMO: feed live simule pour Marc Dubois ===== */}
      {demoLive && (
        <div style={{ marginBottom: 16, padding: "14px 16px", background: "rgba(2,209,186,.03)", border: ".5px solid rgba(2,209,186,.15)", borderRadius: 12 }}>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: ".2em", textTransform: "uppercase", color: "rgba(2,209,186,.65)", marginBottom: 10 }}>
            Exercice en cours
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
            <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 900, color: "#fff", letterSpacing: "-.5px" }}>{demoLive.current_exercise}</div>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: "rgba(255,255,255,.55)" }}>
              Serie {demoLive.current_set}/{demoLive.total_sets} · <span style={{ color: "#02d1ba" }}>{demoLive.current_weight}kg</span>
            </div>
          </div>
          <div style={{ height: 3, background: "rgba(255,255,255,.06)", borderRadius: 100, overflow: "hidden", marginBottom: 14 }}>
            <div style={{ height: "100%", width: `${Math.round(((demoLive.current_set - 1) / demoLive.total_sets) * 100)}%`, background: "#02d1ba", boxShadow: "0 0 8px rgba(2,209,186,.5)" }} />
          </div>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: ".2em", textTransform: "uppercase", color: "rgba(255,255,255,.3)", marginBottom: 8 }}>Feed en direct</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {demoLive.feed.map((f, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 11, fontFamily: "'JetBrains Mono', monospace" }}>
                <span style={{ color: "rgba(255,255,255,.3)", width: 38 }}>{f.t}</span>
                <span style={{ color: "rgba(255,255,255,.6)", flex: 1 }}>{f.text} <span style={{ color: "#02d1ba" }}>{f.weight}kg</span></span>
                <span style={{ color: f.done ? "#02d1ba" : "rgba(0,201,167,.85)", fontWeight: 600 }}>{f.done ? "✓" : "…"}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginBottom: 12 }}>Message flash — apparait en plein ecran pendant sa seance</div>

      <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Ex: Dernier set. Donne tout." maxLength={80}
        style={{ width: "100%", padding: "12px 14px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, color: "#fff", fontSize: 14, outline: "none", fontFamily: "'DM Sans',-apple-system,sans-serif", resize: "none", height: 80, boxSizing: "border-box", marginBottom: 12 }} />

      <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
        <button onClick={recording ? stopRecording : startRecording} style={{ flex: 1, padding: 12, background: recording ? "rgba(255,107,107,0.1)" : "rgba(255,255,255,0.05)", border: `1px solid ${recording ? "rgba(255,107,107,0.3)" : "rgba(255,255,255,0.1)"}`, borderRadius: 12, color: recording ? "#ff6b6b" : "rgba(255,255,255,0.5)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
          {recording ? "⏹ Stop (10s max)" : "🎙 Vocal"}
        </button>
        {audioBlob && <div style={{ padding: "12px 14px", background: "rgba(2,209,186,0.08)", border: "1px solid rgba(2,209,186,0.2)", borderRadius: 12, fontSize: 11, color: "#02d1ba" }}>✓ Audio pret</div>}
      </div>

      <button onClick={sendMessage} disabled={sending || (!text.trim() && !audioBlob)} style={{ width: "100%", padding: 14, background: sent ? "rgba(2,209,186,0.1)" : "#02d1ba", color: sent ? "#02d1ba" : "#000", border: sent ? "1px solid rgba(2,209,186,0.3)" : "none", borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
        {sent ? "✓ Message envoye !" : sending ? (<span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}><Spinner variant="dots" size={16} color="#000" />Envoi</span>) : "Envoyer le message flash"}
      </button>
    </div>
  );
}

export function CoachDashboard({ coachId, coachData, onExit, onSwitchToSuperAdmin, isDemo = false }) {
  const [clients,   setClients]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [uploading, setUploading] = useState(false);
  const [search,    setSearch]    = useState("");
  const [showAdd,   setShowAdd]   = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showClientList, setShowClientList] = useState(false);
  const [showPipeline, setShowPipeline] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showCmdK, setShowCmdK] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [pillVisible, setPillVisible] = useState(true);
  const [showCoachHome, setShowCoachHome] = useState(true);
  const homeScreenDismissed = useRef(false);
  const { plans: coachPlans } = useCoachPlans(coachId);

  // Scroll listener sur <main> pour hide/show floating pill mobile
  const mainScrollRef = useRef(null);
  useEffect(() => {
    const el = mainScrollRef.current;
    if (!el) return;
    let lastY = 0;
    const onScroll = () => {
      const y = el.scrollTop;
      const going = y > lastY ? "down" : "up";
      lastY = y;
      setPillVisible(going === "up" || y < 50);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  // Effet : si le coach passe sur l'onglet "clients", ouvre la liste full-screen
  React.useEffect(() => {
    if (activeTab === "clients") setShowClientList(true);
  }, [activeTab]);

  // Reciproquement : si la liste est fermee, repasse sur overview
  React.useEffect(() => {
    if (!showClientList && activeTab === "clients") setActiveTab("overview");
  }, [showClientList, activeTab]);

  // Raccourci clavier global : Cmd+K / Ctrl+K ouvre la palette
  React.useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setShowCmdK((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const [newEmail,  setNewEmail]  = useState("");
  const [newName,   setNewName]   = useState("");
  const [toast,     setToast]     = useState(null);
  const [selected,  setSelected]  = useState(null);
  const [filter,    setFilter]    = useState("all");

  const showToast = (msg, type = "ok") => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

  const loadClients = async () => {
    setLoading(true);
    try {
      // ===== MULTI-TENANT : filtrage par coach_id =====
      let query = supabase
        .from("clients")
        .select("*, programmes(id, programme_name, uploaded_at, is_active)")
        .order("created_at", { ascending: false });
      // Si coachId est fourni, on filtre. Sinon (fallback legacy) on charge tout.
      if (coachId) query = query.eq("coach_id", coachId);
      const { data: clientsData } = await query;
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
          // Dynamic plan pricing (enriched below if coach_plans table exists)
          _plan_price: 0,
          _plan_name: "—",
          _plan_months: null,
        };
      }));
      // Enrichissement plan pricing (optionnel — table peut ne pas exister)
      try {
        if (coachPlans.length > 0) {
          enriched.forEach(c => {
            const plan = coachPlans.find(p => p.id === c.subscription_plan_id);
            if (plan) {
              c._plan_price = plan.price_per_month;
              c._plan_name = plan.name;
              c._plan_months = plan.duration_months;
            }
          });
        }
      } catch (_) {}

      // Enrichissement pour intelligence predictive (1 volee de queries parallele)
      try {
        const enrichedWithIntel = await enrichClientsForIntelligence(enriched);
        setClients(enrichedWithIntel);

        // Smart pipeline auto-update (1 fois par session, batche)
        const sentinel = `pipeline_auto_${coachId}_${new Date().toISOString().split("T")[0]}`;
        if (!sessionStorage.getItem(sentinel)) {
          const updates = [];
          for (const c of enrichedWithIntel) {
            const suggested = suggestPipelineStatus(c);
            if (canAutoUpdate(c.pipeline_status || "new", suggested)) {
              updates.push({ id: c.id, pipeline_status: suggested });
            }
          }
          if (updates.length > 0) {
            // Update en parallele (max 5 a la fois pour pas DDoS)
            for (let i = 0; i < updates.length; i += 5) {
              const batch = updates.slice(i, i + 5);
              await Promise.all(batch.map((u) =>
                supabase.from("clients").update({ pipeline_status: u.pipeline_status }).eq("id", u.id)
              ));
            }
            console.info(`[pipeline-auto] ${updates.length} client(s) deplaces automatiquement`);
          }
          try { sessionStorage.setItem(sentinel, "1"); } catch {}
        }
      } catch (e) {
        console.warn("[enrichIntelligence]", e);
        setClients(enriched);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadClients(); }, []);


  // Pull-to-refresh mobile (desactive pendant les overlays full-screen)
  const ptr = usePullToRefresh({
    onRefresh: async () => { haptic.success(); await loadClients(); },
    disabled: showClientList || !!selected || showPipeline || showAnalytics || showCmdK,
  });

  // Systeme de relance automatique (push notifs aux clients inactifs / abos expirants)
  const { sent: relanceSent, sendManualPush } = useClientRelance(clients, true);

  const addClient = async () => {
    if (isDemo) { toast.error("Désactivé en mode démo"); return; }
    if (!newEmail) return;
    const email = newEmail.trim().toLowerCase();
    const fullName = newName.trim() || null;
    // Multi-tenant : lie le nouveau client au coach connecte
    const insertData = { email, full_name: fullName };
    if (coachId) insertData.coach_id = coachId;
    const { error } = await supabase.from("clients").insert(insertData);
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
    if (isDemo) { toast.error("Désactivé en mode démo"); return; }
    // confirmation supprimee
    // Multi-tenant : verifie que le coach possede ce client
    let del = supabase.from("clients").delete().eq("id", id);
    if (coachId) del = del.eq("coach_id", coachId);
    await del;
    setSelected(null); showToast("Client supprime"); loadClients();
  };

  const deleteProg = async (progId) => {
    const { error } = await supabase.from("programmes").update({ is_active: false }).eq("id", progId);
    if (error) { console.error("deleteProg error:", error); showToast("Erreur: " + error.message); return; }
    showToast("Programme supprimé.");
    onClose();
  };

  const uploadProg = async (client, file, planId, progWeeks) => {
    if (isDemo) { toast.error("Désactivé en mode démo"); return; }
    // ===== VALIDATION FICHIER =====
    // 1. Taille max 5MB
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      toast.error(`Fichier trop volumineux (${(file.size / 1024 / 1024).toFixed(1)}MB). Max 5MB.`);
      return;
    }
    // 2. Type verifie (HTML uniquement)
    const isHtml = file.type === "text/html" || file.name.toLowerCase().endsWith(".html") || file.name.toLowerCase().endsWith(".htm");
    if (!isHtml) {
      toast.error("Seuls les fichiers HTML sont autorises.");
      return;
    }

    setUploading(true);
    try {
      let html = await file.text();
      // 3. Sanitation : strip les <script> et event handlers inline dangereux
      //    (defense en profondeur meme si React auto-escape l'affichage texte)
      const scriptsBefore = (html.match(/<script[\s\S]*?<\/script>/gi) || []).length;
      html = html
        .replace(/<script[\s\S]*?<\/script>/gi, "")
        .replace(/\son\w+\s*=\s*"[^"]*"/gi, "")
        .replace(/\son\w+\s*=\s*'[^']*'/gi, "")
        .replace(/javascript:/gi, "");
      if (scriptsBefore > 0) {
        console.warn(`[upload] ${scriptsBefore} <script> tag(s) stripped from programme HTML`);
      }
      let progName = file.name.replace(".html", "");
      try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, "text/html");
        const nameEl = doc.getElementById("prog-name");
        const parsed = (nameEl?.value || nameEl?.getAttribute("value") || "").trim();
        if (parsed) progName = parsed;
      } catch(e) { console.warn("Parse name error", e); }

      // Ajouter la duree au nom si pas deja inclus
      const weeks = parseInt(progWeeks) || 6;
      const displayName = progName + (progName.toLowerCase().includes("sem") ? "" : ` (${weeks} sem)`);

      // Desactiver l'ancien programme
      await supabase.from("programmes").update({ is_active: false }).eq("client_id", client.id);

      // Inserer le nouveau programme
      const { error } = await supabase.from("programmes").insert({
        client_id: client.id, html_content: html, programme_name: displayName,
        is_active: true, uploaded_by: (await supabase.auth.getUser()).data.user?.email,
      });
      if (error) throw error;

      // ===== ABONNEMENT : set seulement si pas encore defini =====
      // L'abonnement (3m/6m/12m) est lie au paiement global, pas au programme.
      // On le set au PREMIER upload uniquement. Les uploads suivants ne changent
      // pas les dates d'abonnement — le coach upload plusieurs programmes
      // pendant la duree de l'abonnement.
      if (!client.subscription_start_date && planId) {
        // Try dynamic plan first, fallback to legacy
        const dynPlan = coachPlans.find(p => p.id === planId);
        const legacyPlan = SUB_PLANS_LEGACY.find(p => p.id === planId);
        const months = dynPlan?.duration_months || legacyPlan?.months || 3;
        const planName = dynPlan?.name || legacyPlan?.id || planId;
        if (dynPlan || legacyPlan) {
          const startDate = new Date();
          const endDate = new Date();
          endDate.setMonth(endDate.getMonth() + months);
          await supabase.from("clients").update({
            subscription_plan: planName, // text column (rollback safe)
            subscription_plan_id: dynPlan?.id || null, // FK (new)
            subscription_duration_months: months,
            subscription_start_date: startDate.toISOString(),
            subscription_end_date: endDate.toISOString(),
            subscription_status: "active",
          }).eq("id", client.id);
        }
      }

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

  // ===== Expiration abonnements =====
  const expiringClients = clients.filter(c => {
    if (!c.subscription_end_date) return false;
    const dl = Math.ceil((new Date(c.subscription_end_date) - Date.now()) / 86400000);
    return dl <= 14 && dl > 0;
  });
  const expiredClients = clients.filter(c => {
    if (!c.subscription_end_date) return false;
    return Math.ceil((new Date(c.subscription_end_date) - Date.now()) / 86400000) <= 0;
  });

  // ===== Clients a agir (inactifs 3j+ OU sans programme OU abo expirant) =====
  const clientsToAct = clients
    .filter(c => {
      const hasProg = c.programmes?.some(p => p.is_active);
      if (!hasProg && c.onboarding_done) return true;
      if (hasProg && c._inactiveDays >= 3) return true;
      // Abonnement expirant dans 14j ou expire
      if (c.subscription_end_date) {
        const dl = Math.ceil((new Date(c.subscription_end_date) - Date.now()) / 86400000);
        if (dl <= 14) return true;
      }
      return false;
    })
    .sort((a, b) => (b._inactiveDays || 999) - (a._inactiveDays || 999))
    .slice(0, 8);
  const urgentCount = clientsToAct.length;

  // ===== Score Business (0-100) : note globale du business =====
  // Pondere : couverture 20% + activite semaine 30% + activite jour 25% + sans alerte 25%
  const _coverage = total > 0 ? withProg / total : 0;
  const _act7d = withProg > 0 ? activeWeek / withProg : 1;
  const _actDay = withProg > 0 ? activeToday / withProg : 0;
  const _noAlert = withProg > 0 ? Math.max(0, 1 - inactiveAlerts / withProg) : 1;
  const businessScore = total > 0 ? Math.round((_coverage * 20) + (_act7d * 30) + (_actDay * 25) + (_noAlert * 25)) : 0;
  const scoreColor = businessScore >= 80 ? G : businessScore >= 50 ? ORANGE : RED;
  const scoreLabel = businessScore >= 75 ? "Excellent" : businessScore >= 50 ? "Bien" : businessScore >= 25 ? "A ameliorer" : "Critique";

  // ===== METRIQUES BUSINESS =====
  // MRR : somme des prix mensuels de tous les clients avec un abonnement actif
  const PLAN_PRICES = { "3m": 120, "6m": 110, "12m": 100 };
  const activeSubscriptions = clients.filter(c => c.subscription_status === "active" && c.subscription_plan);
  const mrr = activeSubscriptions.reduce((sum, c) => sum + (PLAN_PRICES[c.subscription_plan] || 0), 0);
  // Prevision 90j : MRR actuel * 3 - clients qui expirent dans 90j * leur prix
  const expiringIn90 = clients.filter(c => {
    if (!c.subscription_end_date) return false;
    const dl = Math.ceil((new Date(c.subscription_end_date) - Date.now()) / 86400000);
    return dl > 0 && dl <= 90;
  });
  const churnRisk90 = expiringIn90.reduce((sum, c) => sum + (PLAN_PRICES[c.subscription_plan] || 0), 0);

  // CountUp animation for dashboard metric cards (must be after businessScore/mrr)
  useEffect(() => {
    const els = document.querySelectorAll(".dash-countup[data-target]");
    els.forEach((el) => {
      const target = parseInt(el.dataset.target);
      const suffix = el.dataset.suffix || "";
      if (isNaN(target)) return;
      const start = performance.now();
      const duration = 1200;
      const tick = (now) => {
        const t = Math.min((now - start) / duration, 1);
        const ease = 1 - Math.pow(1 - t, 3);
        el.textContent = Math.round(target * ease).toLocaleString() + suffix;
        if (t < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }, [loading, businessScore, mrr]);
  // Retention : clients actifs avec programme / total clients onboardes
  const onboardedClients = clients.filter(c => c.onboarding_done);
  const retainedClients = onboardedClients.filter(c => c.programmes?.some(p => p.is_active));
  const retentionRate = onboardedClients.length > 0 ? Math.round((retainedClients.length / onboardedClients.length) * 100) : 0;

  const filtered = clients
    .filter(c => {
      const s = search.toLowerCase();
      // Search inclut maintenant les tags
      if (s) {
        const hay = [c.email, c.full_name, ...(c.tags || [])].filter(Boolean).join(" ").toLowerCase();
        if (!hay.includes(s)) return false;
      }
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
    color: "#f5f5f5", fontFamily: "'DM Sans',-apple-system,sans-serif", fontSize: 13,
    outline: "none", width: "100%", boxSizing: "border-box",
    transition: "border-color 0.15s",
  };

  // ===== COACH SIDEBAR INLINE (desktop) =====
  const coachName = coachData?.full_name || "Coach";
  const coachInitials = (coachName.split(" ").map(w => w[0]).join("").slice(0, 2) || "RB").toUpperCase();
  const coachPlan = coachData?.subscription_plan || "Founder";

  // Sparkline MRR 30 jours (reconstruit depuis snapshots ou fallback)
  const sparkPoints = (() => {
    const n = 30;
    const base = mrr || 1500;
    return Array.from({ length: n }, (_, i) => {
      const x = (i / (n - 1)) * 180;
      const variation = Math.sin(i * 0.5) * 0.1 + Math.cos(i * 0.3) * 0.08;
      const y = 28 - ((i / (n - 1)) * 18 + variation * 8);
      return `${x.toFixed(1)},${Math.max(4, Math.min(28, y)).toFixed(1)}`;
    }).join(" ");
  })();

  const navItems = [
    { id: "overview",    label: "Dashboard",  icon: "chart",       group: "principal" },
    { id: "clients",     label: "Clients",    icon: "users",       group: "principal", badge: urgentCount },
    { id: "programmes",  label: "Programmes", icon: "document",    group: "principal" },
    { id: "business",    label: "Business",   icon: "trending",    group: "principal" },
    { id: "analytics",   label: "Analytics",  icon: "activity",    group: "outils" },
  ];
  const sidebarOnNav = (id) => {
    haptic.light();
    // Fermer tout d'abord
    setSelected(null);
    setShowSettings(false);
    setShowAnalytics(false);
    setShowPipeline(false);

    if (id === "analytics") { setShowAnalytics(true); setShowClientList(false); return; }
    if (id === "pipeline") { setShowPipeline(true); setShowClientList(false); return; }
    if (id === "clients") { setShowClientList(true); setActiveTab("clients"); return; }

    setShowClientList(false);
    setActiveTab(id);
  };

  const CoachSidebar = (
    <aside className="coach-sidebar" style={{
      width: 220,
      background: BG,
      borderRight: "1px solid rgba(255,255,255,.06)",
      flexDirection: "column",
      height: "100vh",
      position: "fixed",
      top: 0,
      left: 0,
      overflow: "hidden",
      padding: "0 12px",
      zIndex: 500,
    }}>
      {/* LOGO */}
      <div style={{ padding: "24px 8px 28px", position: "relative", zIndex: 1 }}>
        <div style={{
          fontFamily: "'Syne', sans-serif",
          fontSize: 14, fontWeight: 900,
          letterSpacing: ".1em", color: "#fff",
        }}>
          RB<span style={{ color: G }}>PERFORM</span>
        </div>
      </div>

      {/* NAV ITEMS */}
      <div style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1, position: "relative", zIndex: 1 }}>
        {[...navItems, { id: "pipeline", label: "Pipeline", icon: "view", group: "outils" }].map(n => {
          const isActive = activeTab === n.id;
          return (
            <button
              key={n.id}
              onClick={() => sidebarOnNav(n.id)}
              className="coach-nav-item"
              style={{
                width: "100%",
                padding: "10px 12px",
                display: "flex", alignItems: "center", gap: 12,
                borderRadius: 10,
                background: isActive ? "rgba(0,201,167,.08)" : "transparent",
                border: "none", cursor: "pointer",
                transition: "all .18s ease",
                position: "relative",
                fontFamily: "inherit",
                textAlign: "left",
              }}
            >
              {isActive && <div style={{ position: "absolute", left: -12, top: "50%", transform: "translateY(-50%)", width: 3, height: 18, background: G, borderRadius: "0 3px 3px 0" }} />}
              <Icon name={n.icon} size={18} color={isActive ? G : "rgba(255,255,255,.35)"} />
              <span style={{
                fontSize: 13, fontWeight: isActive ? 700 : 500,
                color: isActive ? "#fff" : "rgba(255,255,255,.4)",
                letterSpacing: "0.01em",
              }}>{n.label}</span>
              {n.badge > 0 && (
                <div style={{ marginLeft: "auto", minWidth: 18, height: 18, borderRadius: 100, background: "rgba(255,107,107,.15)", border: "1px solid rgba(255,107,107,.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: RED }}>{n.badge}</div>
              )}
            </button>
          );
        })}
      </div>

      {/* COACH PROFILE */}
      <div style={{ padding: "16px 0 20px", position: "relative", zIndex: 1, borderTop: "1px solid rgba(255,255,255,.04)" }}>
        <button
          onClick={() => { haptic.light(); setShowSettings(true); }}
          style={{
            width: "100%", padding: "10px 8px",
            display: "flex", alignItems: "center", gap: 10,
            background: "transparent", border: "none",
            cursor: "pointer", borderRadius: 10,
            fontFamily: "inherit", textAlign: "left",
          }}>
          <div style={{
            width: 32, height: 32, borderRadius: "50%",
            background: "rgba(0,201,167,.08)",
            border: "1px solid rgba(0,201,167,.15)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "'Syne', sans-serif",
            fontSize: 10, fontWeight: 900, color: G, flexShrink: 0,
          }}>{coachInitials}</div>
          <div style={{ overflow: "hidden" }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{coachName}</div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,.25)" }}>Paramètres</div>
          </div>
        </button>
      </div>
    </aside>
  );

  // ===== MOBILE TOPBAR =====
  const MobileTopBar = (
    <div className="coach-mobile-topbar" style={{
      alignItems: "center",
      justifyContent: "flex-end",
      padding: "0 0 0",
      height: 0,
    }}>
    </div>
  );

  // ===== FLOATING PILL MOBILE =====
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const pillItems = [
    { id: "overview",    icon: "chart",       label: "Home",      onClick: () => { setShowClientList(false); setShowSettings(false); setShowAnalytics(false); setShowMoreMenu(false); setActiveTab("overview"); } },
    { id: "clients",     icon: "users",       label: "Clients",   onClick: () => { setShowSettings(false); setShowAnalytics(false); setShowMoreMenu(false); setActiveTab("clients"); setShowClientList(true); } },
    { id: "programmes",  icon: "document",    label: "Prog",      onClick: () => { setShowClientList(false); setShowSettings(false); setShowAnalytics(false); setShowMoreMenu(false); setActiveTab("programmes"); } },
    { id: "business",    icon: "trending",    label: "Business",  onClick: () => { setShowClientList(false); setShowSettings(false); setShowAnalytics(false); setShowMoreMenu(false); setActiveTab("business"); } },
    { id: "more",        icon: "plus",        label: "Plus",      onClick: () => { setShowMoreMenu(!showMoreMenu); } },
  ];
  const FloatingPill = (
    <nav className="coach-floating-pill" style={{
      position: "fixed",
      bottom: "calc(env(safe-area-inset-bottom, 0px) + 28px)",
      left: "50%",
      transform: pillVisible ? "translateX(-50%) translateY(0)" : "translateX(-50%) translateY(20px)",
      opacity: pillVisible ? 1 : 0,
      pointerEvents: pillVisible ? "all" : "none",
      zIndex: 250,
      background: "rgba(15,15,15,0.75)",
      border: "1px solid rgba(255,255,255,0.09)",
      borderRadius: 100,
      padding: 5,
      gap: 0,
      backdropFilter: "blur(20px)",
      WebkitBackdropFilter: "blur(20px)",
      transition: "opacity .3s cubic-bezier(.16,1,.3,1), transform .3s cubic-bezier(.16,1,.3,1)",
    }}>
      {pillItems.map((p) => {
        const isActive = (p.id === "more" && (showSettings || showAnalytics || showMoreMenu)) || (!showSettings && !showAnalytics && !showMoreMenu && activeTab === p.id);
        return (
          <button
            key={p.id}
            onClick={() => { try { haptic.selection(); } catch(_) {} p.onClick(); }}
            style={{
              width: 50, height: 50,
              borderRadius: 100, border: "none",
              background: isActive ? G : "transparent",
              color: isActive ? "#000" : "rgba(255,255,255,.35)",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer",
              transition: "all .25s cubic-bezier(.22,1,.36,1)",
            }}
          >
            <Icon name={p.icon} size={20} strokeWidth={2.5} color={isActive ? "#000" : "rgba(255,255,255,.35)"} />
          </button>
        );
      })}
    </nav>
  );

  // ===== MORE MENU (popup above pill) =====
  const MoreMenu = showMoreMenu ? (
    <div style={{
      position: "fixed", bottom: "calc(env(safe-area-inset-bottom, 0px) + 90px)",
      left: "50%", transform: "translateX(-50%)",
      zIndex: 260, background: "rgba(15,15,15,0.95)",
      border: "1px solid rgba(255,255,255,0.1)",
      borderRadius: 16, padding: 6,
      backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
      display: "flex", flexDirection: "column", gap: 2,
      minWidth: 180, animation: "fadeUp 0.2s ease both",
      boxShadow: "0 -10px 40px rgba(0,0,0,0.5)",
    }}>
      {[
        { icon: "activity", label: "Analytics", onClick: () => { setShowMoreMenu(false); setShowClientList(false); setShowSettings(false); setShowAnalytics(true); } },
        { icon: "view",     label: "Pipeline",  onClick: () => { setShowMoreMenu(false); setShowClientList(false); setShowSettings(false); setShowAnalytics(false); setShowPipeline(true); } },
        { icon: "flame",    label: "Compte",    onClick: () => { setShowMoreMenu(false); setShowClientList(false); setShowAnalytics(false); setShowSettings(true); } },
      ].map((item) => (
        <button key={item.label} onClick={item.onClick} style={{
          display: "flex", alignItems: "center", gap: 12,
          padding: "12px 16px", borderRadius: 12,
          background: "transparent", border: "none",
          color: "rgba(255,255,255,0.7)", fontSize: 14, fontWeight: 500,
          cursor: "pointer", fontFamily: "inherit", textAlign: "left",
          transition: "background 0.15s",
        }}
        onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
        >
          <Icon name={item.icon} size={18} color={G} />
          {item.label}
        </button>
      ))}
    </div>
  ) : null;

  // Fermer le more menu si on clique ailleurs
  const MoreMenuBackdrop = showMoreMenu ? (
    <div onClick={() => setShowMoreMenu(false)} style={{ position: "fixed", inset: 0, zIndex: 255, background: "transparent" }} />
  ) : null;

  // ========== ONBOARDING GATE ==========
  // Si coach pas encore onboarde (et pas en mode demo), afficher le
  // modal plein ecran 3 etapes. Il prend le relais du dashboard tant
  // qu'il n'a pas flague onboarding_done=true.
  if (!isDemo && coachData && coachData.onboarding_done === false) {
    return (
      <Onboarding
        coach={coachData}
        onComplete={() => {
          // Force un reload pour recharger coachData avec onboarding_done=true
          window.location.reload();
        }}
      />
    );
  }

  return (
    <div style={{
      height: "100dvh",
      width: "100vw",
      background: BG,
      fontFamily: "'Inter', -apple-system, system-ui, sans-serif",
      color: "#fff",
      display: "flex",
      overflow: "hidden",
      overflowX: "hidden",
    }}>
      {isDemo && (
        <DemoBanner onSignup={() => {
          supabase.auth.signOut().then(() => {
            window.location.href = "/";
          });
        }} />
      )}
      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        @keyframes dashCharIn{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
        @keyframes pulseDot{0%,100%{box-shadow:0 0 0 0 rgba(255,107,107,0.7)}50%{box-shadow:0 0 0 6px rgba(255,107,107,0)}}
        @keyframes glowFlame{0%,100%{filter:drop-shadow(0 0 8px rgba(2,209,186,0.4))}50%{filter:drop-shadow(0 0 16px rgba(2,209,186,0.7))}}
        @keyframes rbDotPulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.35;transform:scale(.65)}}
        @keyframes rbPulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.3;transform:scale(.6)}}
        /* Micro-animations premium */
        @keyframes rowStagger{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        /* Premium card interactions — same as client app */
        .dash-card{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:16px;transition:all 0.2s cubic-bezier(0.22,1,0.36,1);position:relative;overflow:hidden}
        .dash-card::before{content:'';position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,rgba(2,209,186,0.3),transparent);opacity:0;transition:opacity 0.2s}
        .dash-card:hover{border-color:rgba(2,209,186,0.15) !important}
        .dash-card:hover::before{opacity:1}
        .dash-card:active{transform:scale(0.98)}
        /* Smooth section transitions */
        .dash-section{animation:fadeUp 0.35s cubic-bezier(0.22,1,0.36,1) both}
        /* Stats hover */
        .dash-metric-card{transition:background 0.2s ease;border-radius:12px;padding:16px 12px !important}
        .dash-metric-card:hover{background:rgba(255,255,255,0.02)}
        @keyframes shimmer{0%{background-position:-400px 0}100%{background-position:400px 0}}
        @keyframes ringDraw{from{stroke-dashoffset:251.3}}
        /* Stagger sur enfants d'un container .dash-stagger */
        .dash-stagger > *{animation:rowStagger .35s cubic-bezier(.22,1,.36,1) both}
        .dash-stagger > *:nth-child(1){animation-delay:0s}
        .dash-stagger > *:nth-child(2){animation-delay:.05s}
        .dash-stagger > *:nth-child(3){animation-delay:.1s}
        .dash-stagger > *:nth-child(4){animation-delay:.15s}
        .dash-stagger > *:nth-child(5){animation-delay:.2s}
        .dash-stagger > *:nth-child(6){animation-delay:.25s}
        .dash-stagger > *:nth-child(7){animation-delay:.3s}
        .dash-stagger > *:nth-child(8){animation-delay:.35s}
        .dash-stagger > *:nth-child(n+9){animation-delay:.4s}
        /* Skeleton shimmer (loading states) */
        .skel{background:linear-gradient(90deg,rgba(255,255,255,.03) 0%,rgba(255,255,255,.06) 50%,rgba(255,255,255,.03) 100%);background-size:800px 100%;animation:shimmer 1.4s linear infinite;border-radius:8px}
        /* Score color transition */
        .dash-score-num{transition:color .5s cubic-bezier(.22,1,.36,1)}
        /* Nav item hover icon translate */
        .coach-nav-item svg{transition:transform .18s cubic-bezier(.22,1,.36,1)}
        .coach-nav-item:hover svg{transform:translateX(2px)}
        .coach-nav-item{position:relative}
        .coach-nav-item::after{content:attr(title);position:absolute;left:calc(100% + 12px);top:50%;transform:translateY(-50%);background:rgba(8,12,20,.95);color:#fff;font-size:11px;font-weight:600;padding:5px 12px;border-radius:6px;white-space:nowrap;opacity:0;pointer-events:none;transition:opacity .15s;border:1px solid rgba(255,255,255,.08);letter-spacing:.02em;z-index:100}
        .coach-nav-item:hover::after{opacity:1}
        .mini-nav-btn:hover{border-color:rgba(2,209,186,0.4) !important;color:rgba(255,255,255,0.85) !important}
        @media(max-width:760px){.dash-secondary-nav{display:none !important}}
        /* Sidebar / mobile responsive */
        .coach-sidebar{display:flex}
        .coach-mobile-topbar,.coach-floating-pill{display:none}
        .coach-nav-item:hover{color:rgba(255,255,255,.65)!important;background:rgba(255,255,255,.035)!important}
        @media(max-width:768px){
          .coach-sidebar{display:none !important}
          .coach-mobile-topbar{display:none !important}
          .coach-floating-pill{display:flex !important}
          .coach-main-inner{padding:12px 20px 120px !important;max-width:100% !important;overflow:hidden !important}
          .coach-mobile-bell{display:block !important}
          .coach-client-panel-inner{padding:0 16px 120px !important}
          .coach-client-panel,.coach-overlay-panel{position:fixed !important;left:0 !important}
          .coach-main{margin-left:0 !important}
        }
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
          background: toast.type === "err" ? "rgba(255,107,107,0.12)" : "rgba(2,209,186,0.1)",
          border: `1px solid ${toast.type === "err" ? "rgba(255,107,107,0.35)" : G_BORDER}`,
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
        <div style={{ position: "fixed", inset: 0, background: "rgba(8,12,20,0.9)", backdropFilter: "blur(16px)", zIndex: 300, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 18 }}>
          <div style={{ width: 48, height: 48, border: "2.5px solid rgba(2,209,186,0.12)", borderTopColor: G, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
          <div style={{ color: G, fontSize: 12, fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase" }}>Upload en cours</div>
        </div>
      )}

      {selected && (
        <ErrorBoundary name="ClientPanel">
          <ClientPanel client={selected} onClose={() => { setSelected(null); setShowClientList(true); }} onUpload={uploadProg} onDelete={deleteClient} coachId={coachId} coachData={coachData} isDemo={isDemo} />
        </ErrorBoundary>
      )}
      {showPipeline && (
        <ErrorBoundary name="PipelineKanban">
          <PipelineKanban
            clients={clients}
            onClose={() => setShowPipeline(false)}
            onOpenClient={(c) => { setShowPipeline(false); setSelected(c); }}
          />
        </ErrorBoundary>
      )}
      {showAnalytics && (
        <ErrorBoundary name="AnalyticsSection">
          <AnalyticsSection
            coachId={coachId}
            clients={clients}
            onClose={() => setShowAnalytics(false)}
          />
        </ErrorBoundary>
      )}

      <PullToRefreshIndicator pulling={ptr.pulling} progress={ptr.progress} refreshing={ptr.refreshing} />

      <InviteClient
        open={showInvite}
        onClose={() => setShowInvite(false)}
        coachId={coachId}
        onInvited={() => { loadClients(); }}
      />

      {showSettings && (
        <Settings
          coachData={coachData}
          isDemo={isDemo}
          onClose={() => setShowSettings(false)}
        />
      )}

      <CommandPalette
        open={showCmdK}
        onClose={() => setShowCmdK(false)}
        clients={clients}
        commands={[
          { id: "open_client", run: (c) => setSelected(c) },
          { id: "tab_overview", label: "Vue d'ensemble", group: "Navigation", icon: "chart", run: () => setActiveTab("overview") },
          { id: "tab_business", label: "Business", desc: "MRR, churn, retention", group: "Navigation", icon: "trending-up", run: () => setActiveTab("business") },
          { id: "tab_clients", label: "Liste des clients", group: "Navigation", icon: "users", run: () => { setShowClientList(true); setActiveTab("clients"); } },
          { id: "tab_analytics", label: "Analytics", desc: "Heatmap, correlations", group: "Navigation", icon: "activity", run: () => setShowAnalytics(true) },
          { id: "tab_achievements", label: "Achievements", desc: "Badges & streak", group: "Navigation", icon: "trophy", run: () => setActiveTab("achievements") },
          { id: "open_pipeline", label: "Pipeline CRM", desc: "Kanban des clients", group: "Actions", icon: "view", run: () => setShowPipeline(true) },
          { id: "action_add_client", label: "Ajouter un client", group: "Actions", icon: "plus", run: () => { setShowClientList(true); setShowAdd(true); } },
          { id: "action_copy_invite", label: "Copier le lien d'invitation", desc: coachData?.coach_slug ? `rbperform.com/rejoindre/${coachData.coach_slug}` : "Lien en cours de generation", group: "Actions", icon: "link", keywords: ["invitation", "lien", "invite", "copier", "partager"], run: async () => {
            const slug = coachData?.coach_slug;
            if (!slug) { showToast("Lien pas encore pret"); return; }
            try {
              await navigator.clipboard.writeText(`https://rbperform.com/rejoindre/${slug}`);
              showToast("Lien copie");
            } catch { showToast("Impossible de copier"); }
          }},
          { id: "action_refresh", label: "Rafraichir les donnees", group: "Actions", icon: "refresh", run: () => loadClients() },
          ...(onSwitchToSuperAdmin ? [{ id: "nav_superadmin", label: "Super Admin (CEO)", group: "Navigation", icon: "chart", run: () => onSwitchToSuperAdmin() }] : []),
          { id: "action_exit", label: "Quitter le dashboard coach", group: "Actions", icon: "arrow-left", run: () => onExit?.() },
        ]}
      />

      {CoachSidebar}

      <main ref={mainScrollRef} className="coach-main" style={{
        flex: 1, minWidth: 0,
        overflowY: "auto",
        overflowX: "hidden",
        WebkitOverflowScrolling: "touch",
        position: "relative",
        marginLeft: 220,
        paddingTop: isDemo ? "calc(env(safe-area-inset-top, 0px) + 44px)" : "env(safe-area-inset-top, 0px)",
        visibility: (showCoachHome && !homeScreenDismissed.current) ? "hidden" : "visible",
      }}>
      {MobileTopBar}

      <div className="coach-main-inner" style={{ maxWidth: 1200, margin: "0 auto", padding: "48px 56px 40px", position: "relative", overflow: "hidden" }}>
        {/* Glow teal subtil haut droite — clippe par overflow hidden */}
        <div style={{ position: "absolute", top: -100, right: -50, width: 400, height: 400, background: "radial-gradient(circle, rgba(0,201,167,0.04), transparent 65%)", filter: "blur(80px)", pointerEvents: "none", zIndex: 0 }} />

        <div style={{ position: "relative", zIndex: 1 }}>

          {/* ========== OVERVIEW (exclusif — masque quand autre tab active) ========== */}
          {!showClientList && activeTab === "overview" && (<>

          {/* ========== OVERVIEW HEADER (compact — le home screen fait le wow) ========== */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", position: "relative", zIndex: 2, marginBottom: 24 }}>
            <div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", fontWeight: 400, letterSpacing: "1px", marginBottom: 6 }}>
                {new Date().getHours() < 6 ? "On grind" : new Date().getHours() < 12 ? "Bonjour" : new Date().getHours() < 18 ? "Bon après-midi" : new Date().getHours() < 22 ? "Bonsoir" : "Late session"}
              </div>
              <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: "clamp(24px, 6vw, 36px)", fontWeight: 900, letterSpacing: "-0.03em", lineHeight: 1, color: "#fff", margin: 0 }}>
                {coachData?.full_name?.split(" ")[0] || "Coach"}<span style={{ color: G }}>.</span>
              </h1>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ position: "relative", width: 44, height: 44 }}>
                <svg width="44" height="44" viewBox="0 0 100 100" style={{ transform: "rotate(-90deg)" }}>
                  <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
                  <circle cx="50" cy="50" r="40" fill="none" stroke={G} strokeWidth="8" strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 40}`} strokeDashoffset={`${2 * Math.PI * 40 * (1 - businessScore / 100)}`} />
                </svg>
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: G }}>{businessScore}</div>
              </div>
              <div className="coach-mobile-bell" style={{ display: "none" }}>
                <NotificationBell clients={clients} coachId={coachId} onOpenClient={(c) => setSelected(c)} />
              </div>
            </div>
          </div>

          {/* ========== 3 STATS COMPACT ========== */}
          <div className="dash-metrics-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, marginBottom: 24, position: "relative", zIndex: 2 }}>
            {[
              { v: total, l: "CLIENTS", color: "#fff" },
              { v: mrr.toLocaleString() + "€", l: "MRR", color: G },
              { v: (total > 0 ? Math.round((activeWeek / total) * 100) : 0) + "%", l: "RÉTENTION", color: "rgba(255,255,255,0.5)" },
            ].map((m, i) => (
              <div key={i} className="dash-card" style={{ padding: "14px 16px" }}>
                <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 28, fontWeight: 400, color: m.color, letterSpacing: "-1px", lineHeight: 1 }}>{m.v}</div>
                <div style={{ fontSize: 8, color: "rgba(255,255,255,0.2)", fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", marginTop: 6 }}>{m.l}</div>
              </div>
            ))}
          </div>

          {/* ========== ANALYSE CONTEXTUELLE (comme panel client) ========== */}
          {clients.length > 0 && (
            <div className="dash-card" style={{ padding: "20px 24px", marginBottom: 24, cursor: "default" }}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", color: `${G}88`, marginBottom: 10 }}>Situation</div>
              <div style={{ fontSize: 14, color: "rgba(255,255,255,0.6)", lineHeight: 1.7 }}>
                {(() => {
                  const retPct = total > 0 ? Math.round((activeWeek / total) * 100) : 0;
                  const arrEst = Math.round(mrr * 12);
                  if (businessScore >= 80) return `Ton business est solide. ${total} clients actifs, ${retPct}% de rétention, ${arrEst.toLocaleString()}€ d'ARR estimé. Continue de maintenir cette dynamique.`;
                  if (businessScore >= 60) return `Ton business tourne correctement. ${urgentCount > 0 ? `${urgentCount} client${urgentCount > 1 ? 's' : ''} mérite${urgentCount > 1 ? 'nt' : ''} ton attention — un message proactif peut tout changer.` : `Ta rétention est à ${retPct}%, regarde si tu peux passer au-dessus de 90%.`}`;
                  if (businessScore >= 40) return `Attention : ton score business est à ${businessScore}/100. ${urgentCount > 0 ? `${urgentCount} client${urgentCount > 1 ? 's sont' : ' est'} à risque.` : ''} Concentre-toi sur la rétention avant d'acquérir de nouveaux clients.`;
                  return `Score critique : ${businessScore}/100. ${urgentCount} client${urgentCount > 1 ? 's' : ''} en décrochage. Action immédiate nécessaire — ouvre la liste clients et contacte les profils à risque.`;
                })()}
              </div>
            </div>
          )}

          {/* ========== ALERTE URGENTE ========== */}
          {urgentCount > 0 && (
            <div
              onClick={() => { setShowClientList(true); setActiveTab("clients"); setFilter("inactive"); }}
              className="dash-alert-row"
              style={{
                display: "flex", alignItems: "center", gap: 12, marginBottom: 32,
                padding: "14px 20px",
                background: "rgba(239,68,68,0.06)",
                border: "1px solid rgba(239,68,68,0.15)",
                borderRadius: 10, cursor: "pointer",
                transition: "all .2s",
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = "rgba(239,68,68,0.1)"}
              onMouseLeave={(e) => e.currentTarget.style.background = "rgba(239,68,68,0.06)"}
            >
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#ff6b6b", flexShrink: 0, animation: "rbPulse 2s ease-in-out infinite" }} />
              <span style={{ fontSize: 14, color: "#fff", fontWeight: 500, flex: 1 }}>{urgentCount} client{urgentCount > 1 ? "s" : ""} à contacter</span>
              <Icon name="arrow-right" size={14} color="rgba(255,255,255,.25)" />
            </div>
          )}


          {/* ========== ONBOARDING WIZARD (nouveau coach 0 client) ========== */}
          {!showClientList && coachData && !loading && clients.length === 0 && (
            <>
              <CoachOnboardingWizard
                coach={coachData}
                onScrollToInvitation={() => {
                  const el = document.getElementById("invitation-panel-anchor");
                  if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
                }}
              />
              <div id="invitation-panel-anchor" style={{ marginBottom: 28 }}>
                <InvitationPanel coach={coachData} />
              </div>
            </>
          )}

          {/* Tabs retirees — navigation via sidebar desktop + floating pill mobile */}


          </>)}

          {/* ========== BUSINESS SECTION (MRR + score + objectif) ========== */}
          {!showClientList && activeTab === "business" && coachData && clients.length > 0 && (
            <BusinessSection coachData={coachData} clients={clients} />
          )}

          {/* ========== PROGRAMMES — liste des programmes coach ========== */}
          {!showClientList && activeTab === "programmes" && (
            <ProgrammeList
              coachId={coachId}
              clients={clients}
              onEdit={(client) => setSelected(client)}
              onAssign={(prog) => {
                // Dupliquer = ouvrir la fiche client puis le builder pre-rempli.
                // Pour l'instant on ouvre la fiche du client source.
                const src = clients.find((c) => c.id === prog.client_id);
                if (src) setSelected(src);
              }}
            />
          )}

          {/* ========== ACHIEVEMENTS (badges + streak + rank) ========== */}
          {!showClientList && activeTab === "achievements" && coachData && clients.length > 0 && (
            <AchievementsSection coachData={coachData} clients={clients} />
          )}

          {/* ========== ANALYTICS (placeholder, ouvre le full overlay) ========== */}
          {!showClientList && activeTab === "analytics" && clients.length > 0 && (
            <div style={{ marginBottom: 28 }}>
              <button
                className="dash-card"
                onClick={() => { haptic.light(); setShowAnalytics(true); }}
                style={{
                  width: "100%", padding: "20px",
                  background: "linear-gradient(135deg, rgba(0,201,167,0.06), rgba(2,209,186,0.02))",
                  border: "1px solid rgba(0,201,167,0.15)",
                  borderRadius: 16, color: "#fff", cursor: "pointer", fontFamily: "inherit",
                  display: "flex", alignItems: "center", gap: 14, textAlign: "left",
                }}
              >
                <div style={{ width: 44, height: 44, borderRadius: "50%", background: "rgba(0,201,167,0.15)", border: "1px solid rgba(0,201,167,0.35)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Icon name="chart" size={20} color="#a78bfa" />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: "#fff", marginBottom: 3 }}>Ouvrir Analytics avancees</div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>Heatmap, correlations, performance programmes</div>
                </div>
                <Icon name="arrow-right" size={14} color="rgba(255,255,255,0.4)" />
              </button>
            </div>
          )}

          {/* ========== CTA VOIR TOUS LES CLIENTS ========== */}
          {!showClientList && activeTab !== "clients" && (
            <div style={{ marginBottom: 28, animation: "fadeUp 0.5s ease 0.2s both" }}>
              <button
                className="dash-card"
                onClick={() => { setShowClientList(true); setActiveTab("clients"); }}
                style={{
                  width: "100%", padding: 16,
                  background: "rgba(255,255,255,0.03)",
                  color: "rgba(255,255,255,0.7)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16,
                  fontSize: 13, fontWeight: 600, cursor: "pointer",
                  fontFamily: "inherit", letterSpacing: "0.02em",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                  transition: "all .2s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(0,201,167,0.3)"; e.currentTarget.style.color = "#fff"; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; e.currentTarget.style.color = "rgba(255,255,255,0.7)"; }}
              >
                <Icon name="users" size={16} />
                Voir tous les clients ({total})
              </button>
            </div>
          )}

      {/* ========== FENETRE PLEIN ECRAN LISTE CLIENTS ========== */}
      {/* Cachee quand un panel client est ouvert : sur desktop le panel
          est une colonne a droite + le dashboard au centre ; sur mobile
          le panel est un overlay qui couvre la liste de toute facon. */}
      {showClientList && !selected && (
        <div className="coach-overlay-panel" style={{ position: "fixed", top: 0, right: 0, bottom: 0, left: 220, zIndex: 150, background: BG, overflowY: "auto", overflowX: "hidden", WebkitOverflowScrolling: "touch", fontFamily: "'Inter',-apple-system,system-ui,sans-serif", color: "#fff" }}>
          {/* Ambient */}
          <div style={{ position: "fixed", top: 0, left: 0, right: 0, height: "30%", background: "radial-gradient(ellipse at 50% -10%, rgba(2,209,186,0.08), transparent 60%)", pointerEvents: "none", zIndex: 0 }} />

          <div style={{ position: "relative", zIndex: 1, maxWidth: 1100, margin: "0 auto", padding: "0 20px calc(env(safe-area-inset-bottom, 0px) + 80px)" }}>
            {/* Header */}
            <div style={{ paddingTop: "calc(env(safe-area-inset-top, 8px) + 12px)", marginBottom: 24 }}>
              <button onClick={() => setShowClientList(false)} style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "none", border: "none", color: "rgba(255,255,255,0.35)", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", padding: 0, marginBottom: 16 }}>
                <Icon name="arrow-left" size={12} />
                Dashboard
              </button>
              <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".2em", textTransform: "uppercase", color: "#4A4A5A", marginBottom: 8 }}>Clients</div>
                  <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: "clamp(32px, 6vw, 52px)", fontWeight: 900, letterSpacing: "-0.035em", color: "#fff", margin: 0, lineHeight: 1.02 }}>
                    Tes athletes<span style={{ color: "#02d1ba" }}>.</span>
                  </h1>
                </div>
                <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                  <button onClick={() => { haptic.selection(); setShowInvite(true); }} style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 16px", background: "rgba(255,255,255,.04)", border: ".5px solid rgba(255,255,255,.1)", borderRadius: 100, color: "rgba(255,255,255,.75)", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", textTransform: "uppercase", letterSpacing: "0.3px", transition: "background .15s" }}>
                    <Icon name="message" size={12} color="rgba(255,255,255,.75)" />
                    Inviter
                  </button>
                  <button onClick={() => setShowAdd((v) => !v)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 18px", background: showAdd ? "rgba(255,255,255,0.04)" : "#02d1ba", border: showAdd ? "1px solid rgba(255,255,255,0.1)" : "none", borderRadius: 100, color: showAdd ? "rgba(255,255,255,0.55)" : "#000", fontSize: 11, fontWeight: 700, cursor: "pointer", boxShadow: showAdd ? "none" : "0 6px 20px rgba(2,209,186,0.25)", fontFamily: "inherit", textTransform: "uppercase", letterSpacing: "0.3px" }}>
                    <Icon name={showAdd ? "x" : "plus"} size={12} />
                    {showAdd ? "Annuler" : "Ajouter"}
                  </button>
                </div>
              </div>
            </div>

            {/* Formulaire nouveau client */}
            {showAdd && (
              <div style={{ background: "rgba(2,209,186,0.04)", border: `1px solid ${G_BORDER}`, borderRadius: 16, padding: 18, marginBottom: 16, animation: "fadeUp 0.2s ease" }}>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <input className="inp-focus" type="email" placeholder="Email *" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addClient()} style={{ flex: 1, minWidth: 180, padding: "12px 14px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, color: "#fff", fontFamily: "inherit", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
                  <input className="inp-focus" type="text" placeholder="Prenom Nom" value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addClient()} style={{ flex: 1, minWidth: 140, padding: "12px 14px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, color: "#fff", fontFamily: "inherit", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
                  <button onClick={addClient} disabled={!newEmail} style={{ padding: "12px 20px", background: newEmail ? G : "rgba(255,255,255,0.04)", border: "none", borderRadius: 10, color: newEmail ? "#000" : "rgba(255,255,255,0.25)", fontSize: 12, fontWeight: 800, cursor: newEmail ? "pointer" : "not-allowed", fontFamily: "inherit" }}>Creer</button>
                </div>
              </div>
            )}

            {/* Search + filtres */}
            <div style={{ marginBottom: 18 }}>
              <div style={{ position: "relative", marginBottom: 12 }}>
                <div style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.3)", pointerEvents: "none" }}><Icon name="search" size={14} /></div>
                <input className="inp-focus" placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: "100%", padding: "12px 14px 12px 38px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, color: "#fff", fontFamily: "inherit", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
              </div>
              <div style={{ display: "flex", gap: 6, overflowX: "auto", scrollbarWidth: "none" }}>
                {[["all", "Tous", total], ["active", "Actifs", activeWeek], ["noprog", "Sans prog.", total - withProg], ["inactive", "Alertes", inactiveAlerts]].map(([k, l, n]) => {
                  const on = filter === k;
                  return <button key={k} onClick={() => setFilter(k)} style={{ padding: "7px 12px", fontSize: 11, fontWeight: 700, background: on ? G_DIM : "transparent", border: `1px solid ${on ? G_BORDER : "rgba(255,255,255,0.06)"}`, borderRadius: 100, color: on ? G : "rgba(255,255,255,0.4)", cursor: "pointer", whiteSpace: "nowrap", fontFamily: "inherit", flexShrink: 0 }}>{l} <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, opacity: 0.7 }}>{n}</span></button>;
                })}
              </div>
            </div>

            {/* Cards clients premium */}
            {loading ? (
              <SkeletonList count={5} gap={10} />
            ) : filtered.length === 0 ? (
              search || filter !== "all" ? (
                <EmptyState
                  icon="search"
                  title="Aucun resultat"
                  subtitle={`Aucun client ne correspond ${search ? `a "${search}"` : "au filtre"}.`}
                  action={{ label: "Reinitialiser", onClick: () => { setSearch(""); setFilter("all"); } }}
                  size="md"
                />
              ) : (
                <EmptyState
                  icon="users"
                  title="Ton premier client t'attend."
                  subtitle="Partage ton code d'invitation pour qu'ils rejoignent ton espace, ou ajoute-les manuellement."
                  action={{ label: "Ajouter un client", onClick: () => setShowAdd(true) }}
                  size="lg"
                />
              )
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {filtered.map((c, i) => {
                  const prog = c.programmes?.find((p) => p.is_active);
                  const actCol = activityColor(c._lastActivity);
                  const logsCount = Math.ceil(c._logs.length / 3);
                  const dStr = daysAgo(c._lastActivity);
                  const inDays = c._lastActivity ? Math.floor((Date.now() - new Date(c._lastActivity)) / 86400000) : null;
                  const hasProg = c.programmes?.some((p) => p.is_active);

                  return (
                    <div
                      key={c.id}
                      onClick={() => { setSelected(c); setShowClientList(false); }}
                      style={{
                        padding: "18px 20px",
                        background: "rgba(255,255,255,0.025)",
                        border: c._inactive && hasProg ? "1px solid rgba(255,107,107,0.2)" : "1px solid rgba(255,255,255,0.06)",
                        borderRadius: 18,
                        cursor: "pointer",
                        transition: "all 0.2s",
                        animation: `fadeUp ${0.15 + i * 0.03}s ease both`,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 10 }}>
                        {/* Avatar */}
                        <div style={{ position: "relative", flexShrink: 0 }}>
                          <Avatar name={c.full_name || c.email} size={46} active={!!prog} />
                          {c._inactive && hasProg && (
                            <div style={{ position: "absolute", top: -2, right: -2, width: 11, height: 11, borderRadius: "50%", background: RED, border: "2px solid #080C14", animation: "pulseDot 2s infinite" }} />
                          )}
                        </div>
                        {/* Nom + email */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 16, fontWeight: 800, color: "#fff", letterSpacing: "-0.3px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {c.full_name || <span style={{ color: "rgba(255,255,255,0.35)", fontWeight: 500 }}>Sans nom</span>}
                          </div>
                          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 3 }}>{c.email}</div>
                        </div>
                        {/* Statut */}
                        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                          <div style={{ width: 8, height: 8, borderRadius: "50%", background: actCol, boxShadow: inDays !== null && inDays <= 1 ? `0 0 8px ${actCol}` : "none" }} />
                          <span style={{ fontSize: 10, fontWeight: 700, color: actCol }}>
                            {activityLabel(c._lastActivity).text}
                          </span>
                        </div>
                      </div>

                      {/* Tags CRM si presents */}
                      {c.tags && c.tags.length > 0 && (
                        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 6 }}>
                          {c.tags.slice(0, 4).map((t) => <TagBadge key={t} tag={t} compact />)}
                          {c.tags.length > 4 && <span style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", padding: "2px 6px" }}>+{c.tags.length - 4}</span>}
                        </div>
                      )}

                      {/* Infos cles en une ligne */}
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                        {/* Profil comportemental (intelligence) */}
                        {c._sessionsLast7d !== undefined && <BehavioralBadge client={c} compact />}
                        {prog ? (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.7)", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 100, padding: "3px 10px" }}>
                            {prog.programme_name || "Programme actif"}
                          </span>
                        ) : (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.35)", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 100, padding: "3px 10px" }}>
                            Sans programme
                          </span>
                        )}
                        {logsCount > 0 && (
                          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", fontWeight: 600 }}>{logsCount} seances</span>
                        )}
                        {dStr && (
                          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>Vu {dStr.toLowerCase()}</span>
                        )}
                        {/* Badge abonnement avec jours restants */}
                        {c.subscription_end_date && (() => {
                          const dl = Math.ceil((new Date(c.subscription_end_date) - Date.now()) / 86400000);
                          if (dl <= 0) return <span style={{ fontSize: 9, fontWeight: 700, color: RED, background: "rgba(255,107,107,0.1)", border: "1px solid rgba(255,107,107,0.2)", borderRadius: 100, padding: "2px 8px" }}>Expire</span>;
                          if (dl <= 7) return <span style={{ fontSize: 9, fontWeight: 700, color: RED, background: "rgba(255,107,107,0.08)", border: "1px solid rgba(255,107,107,0.2)", borderRadius: 100, padding: "2px 8px" }}>{dl}j</span>;
                          if (dl <= 14) return <span style={{ fontSize: 9, fontWeight: 700, color: ORANGE, background: "rgba(0,201,167,0.08)", border: "1px solid rgba(0,201,167,0.2)", borderRadius: 100, padding: "2px 8px" }}>{dl}j</span>;
                          return <span style={{ fontSize: 9, color: "rgba(255,255,255,0.3)" }}>{dl}j</span>;
                        })()}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
        </div>
      </div>
      </main>
      {/* Coach Home Screen */}
      {showCoachHome && !homeScreenDismissed.current && !loading && (
        <CoachHomeScreen
          coachData={coachData}
          businessScore={businessScore}
          mrr={mrr}
          clients={clients}
          urgentCount={urgentCount}
          onDismiss={() => { homeScreenDismissed.current = true; setShowCoachHome(false); }}
          onNavigate={(id) => {
            homeScreenDismissed.current = true;
            setShowCoachHome(false);
            if (id === "clients") { setShowClientList(true); setActiveTab("clients"); }
            else if (id === "more") { setShowMoreMenu(true); }
            else { setShowClientList(false); setShowSettings(false); setActiveTab(id); }
          }}
        />
      )}

      {/* FloatingPill + More menu */}
      {MoreMenuBackdrop}
      {MoreMenu}
      {FloatingPill}
    </div>
  );
}

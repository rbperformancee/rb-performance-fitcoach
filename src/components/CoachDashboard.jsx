import ClientAnalytics from "./ClientAnalytics";
import ProgramPDFButton from "./ProgramPDF";
import CoachStats from "./CoachStats";
import ChatCoach from "./ChatCoach";
import DemoBanner from "./DemoBanner";
import { toast } from "./Toast";
import React, { useState, useEffect, useRef } from "react";
import DOMPurify from "dompurify";
import { supabase } from "../lib/supabase";
import { generateInvoicePDF } from "../utils/invoicePDF";
import ProgrammeBuilder from "./ProgrammeBuilder";
import { useClientRelance } from "../hooks/useClientRelance";
import { useCoachPlans } from "../hooks/useCoachPlans";
import { usePushNotifications } from "../hooks/usePushNotifications";
import { LOGO_B64 } from "../utils/logo";
import ErrorBoundary from "./ErrorBoundary";
import InvitationPanel from "./InvitationPanel";
import EmptyState from "./EmptyState";
import { SkeletonList } from "./Skeleton";
import Spinner from "./Spinner";
import haptic from "../lib/haptic";
import { parseProgrammeHTML } from "../utils/parserProgramme";
import BusinessSection from "./coach/BusinessSection";
import ProgrammeList from "./coach/ProgrammeList";
import ProgrammeDuplicateModal from "./coach/ProgrammeDuplicateModal";
import Onboarding from "./coach/Onboarding";
import InviteClient from "./coach/InviteClient";
import LogPaymentModal from "./coach/LogPaymentModal";
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
import RecipesSection from "./coach/RecipesSection";
import TransformationView from "./coach/TransformationView";
import AIAnalyze from "./coach/AIAnalyze";
import CoachOnboardingWizard from "./coach/CoachOnboardingWizard";
import CoachHomeScreen from "./coach/CoachHomeScreen";
import MonCompte from "./coach/MonCompte";
import InvoiceModal from "./coach/InvoiceModal";
import Sentinel, { SentinelTeaser } from "./coach/Sentinel";
import NotificationBell from "./coach/NotificationBell";
import CommandPalette from "./coach/CommandPalette";
import PullToRefreshIndicator from "./PullToRefreshIndicator";
import usePullToRefresh from "../hooks/usePullToRefresh";
import { useT, getLocale, t as tStatic } from "../lib/i18n";

const intlLocale = () => (getLocale() === "en" ? "en-US" : "fr-FR");
const fillTpl = (s, vars) => {
  let out = s;
  Object.entries(vars).forEach(([k, v]) => { out = out.split(`{${k}}`).join(String(v)); });
  return out;
};
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
const BG = "#050505";
const PREMIUM_STYLES = {
  card: { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, transition: "all 0.2s cubic-bezier(0.22,1,0.36,1)" },
  badge: (color) => ({ display: "inline-flex", alignItems: "center", gap: 4, background: color + "12", border: "1px solid " + color + "25", color, fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 20, letterSpacing: 0.5 }),
};
const G_DIM = "rgba(0,201,167,0.1)";
const G_BORDER = "rgba(0,201,167,0.2)";

// ===== Icon component premium (lucide/feather style) =====
// Remplace TOUS les emojis du dashboard. stroke 1.8 pour finesse, size par defaut 18.
// Modal de confirmation suppression programme — typed-confirmation
// Pour supprimer, l'utilisateur doit taper le mot SUPPRIMER. Empêche tout
// clic réflexe sur "OK" d'un window.confirm.
function ConfirmDeleteProgramme({ progName, onCancel, onConfirm }) {
  const [typed, setTyped] = useState("");
  const RED = "#ff6b6b";
  const matches = typed.trim() === "SUPPRIMER";

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 11000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}>
      <div style={{ background: "#0f0f0f", border: "1px solid rgba(255,107,107,0.3)", borderRadius: 18, maxWidth: 460, width: "100%", padding: 28, boxShadow: "0 24px 64px rgba(0,0,0,0.6), 0 0 40px rgba(255,107,107,0.15)" }}>
        <div style={{ width: 48, height: 48, borderRadius: 12, background: "rgba(255,107,107,0.12)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 18 }}>
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke={RED} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
        </div>
        <div style={{ fontSize: 20, fontWeight: 800, color: "#fff", letterSpacing: -0.3, marginBottom: 10 }}>Supprimer définitivement ?</div>
        <div style={{ fontSize: 14, color: "rgba(255,255,255,0.65)", lineHeight: 1.6, marginBottom: 18 }}>
          Tu vas supprimer <strong style={{ color: "#fff" }}>{progName || "ce programme"}</strong>. Cette action est <strong style={{ color: RED }}>irréversible</strong> — toutes les semaines, séances et exercices seront perdus.
        </div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 8 }}>Tape <strong style={{ color: RED, letterSpacing: 1 }}>SUPPRIMER</strong> pour confirmer :</div>
        <input
          type="text"
          autoFocus
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          placeholder="SUPPRIMER"
          style={{ width: "100%", padding: "12px 14px", background: "rgba(255,255,255,0.04)", border: "1px solid " + (matches ? RED : "rgba(255,255,255,0.08)"), borderRadius: 10, color: "#fff", fontSize: 14, fontWeight: 700, letterSpacing: 1, fontFamily: "inherit", outline: "none", marginBottom: 18, transition: "border-color .2s" }}
        />
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button
            type="button"
            onClick={onCancel}
            style={{ padding: "10px 18px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", letterSpacing: 0.5 }}
          >Annuler</button>
          <button
            type="button"
            disabled={!matches}
            onClick={onConfirm}
            style={{ padding: "10px 18px", background: matches ? RED : "rgba(255,107,107,0.2)", border: "none", borderRadius: 10, color: matches ? "#fff" : "rgba(255,255,255,0.4)", fontSize: 12, fontWeight: 800, cursor: matches ? "pointer" : "not-allowed", fontFamily: "inherit", letterSpacing: 0.5, textTransform: "uppercase", opacity: matches ? 1 : 0.5, transition: "all .2s" }}
          >Supprimer définitivement</button>
        </div>
      </div>
    </div>
  );
}

// ProgrammeCalendarSection — affiche les infos calendrier du programme actif :
// start_date, training_days configurés, jours reportés / repos pris,
// total séances complétées, mini-calendrier des 14 derniers jours.
function ProgrammeCalendarSection({ programmeId, clientId }) {
  const [data, setData] = React.useState(null);
  const [completions, setCompletions] = React.useState([]);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const [{ data: prog }, { data: comps }] = await Promise.all([
        supabase.from("programmes")
          .select("start_date, training_days, rest_days_count, reported_days_count, uploaded_at")
          .eq("id", programmeId).maybeSingle(),
        supabase.from("session_completions")
          .select("week_idx, session_idx, validated_at")
          .eq("client_id", clientId).order("validated_at", { ascending: false }).limit(50),
      ]);
      if (cancelled) return;
      setData(prog);
      setCompletions(comps || []);
    })();
    return () => { cancelled = true; };
  }, [programmeId, clientId]);

  if (!data) return null;

  const labels = { 1: "Lun", 2: "Mar", 3: "Mer", 4: "Jeu", 5: "Ven", 6: "Sam", 7: "Dim" };
  const td = (data.training_days || []).slice().sort((a, b) => a - b);

  // Mini-calendrier 14 jours rétrospectifs
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const start = new Date((data.start_date || data.uploaded_at) + "T00:00:00");
  const msDay = 86400000;
  const days14 = Array.from({ length: 14 }).map((_, i) => {
    const date = new Date(today.getTime() - (13 - i) * msDay);
    const daysSinceStart = Math.floor((date - start) / msDay);
    const weekday = ((date.getDay() + 6) % 7) + 1;
    if (daysSinceStart < 0) return { date, status: "before" };
    if (!td.includes(weekday)) return { date, status: "rest" };
    const wIdx = Math.floor(daysSinceStart / 7);
    const sIdx = td.indexOf(weekday);
    const validated = completions.some(c => c.week_idx === wIdx && c.session_idx === sIdx);
    if (validated) return { date, status: "done" };
    if (date.getTime() === today.getTime()) return { date, status: "today" };
    return { date, status: "missed" };
  });

  return (
    <div style={{ marginTop: 18, padding: "14px 16px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 14, animation: "cpFadeUp 0.4s ease 0.42s both" }}>
      <div style={{ fontSize: 9, letterSpacing: "2.5px", color: "rgba(2,209,186,0.7)", textTransform: "uppercase", fontWeight: 800, marginBottom: 12 }}>
        Calendrier programme
      </div>

      {/* Stats grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, marginBottom: 14 }}>
        <Stat label="Démarré le" value={data.start_date ? new Date(data.start_date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }) : "—"} />
        <Stat label="Séances" value={completions.length} valueColor="#02d1ba" />
        <Stat label="Reportées" value={data.reported_days_count || 0} valueColor={data.reported_days_count > 0 ? "#f97316" : "rgba(255,255,255,0.5)"} />
        <Stat label="Repos pris" value={data.rest_days_count || 0} valueColor={data.rest_days_count > 0 ? "#a78bfa" : "rgba(255,255,255,0.5)"} />
      </div>

      {/* Jours d'entraînement configurés */}
      <div style={{ display: "flex", gap: 4, marginBottom: 12 }}>
        {[1, 2, 3, 4, 5, 6, 7].map(d => {
          const active = td.includes(d);
          return (
            <div key={d} style={{ flex: 1, height: 26, borderRadius: 6, background: active ? "rgba(2,209,186,0.18)" : "rgba(255,255,255,0.03)", border: `1px solid ${active ? "rgba(2,209,186,0.4)" : "rgba(255,255,255,0.05)"}`, color: active ? "#02d1ba" : "rgba(255,255,255,0.25)", fontSize: 9, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", letterSpacing: "0.5px" }}>
              {labels[d].slice(0, 1)}
            </div>
          );
        })}
      </div>

      {/* Mini-calendrier 14 jours */}
      <div style={{ display: "flex", gap: 3, marginBottom: 6 }}>
        {days14.map((d, i) => {
          const colors = {
            done: "rgba(2,209,186,0.7)", today: "#02d1ba",
            missed: "#f97316", rest: "rgba(255,255,255,0.08)",
            before: "rgba(255,255,255,0.04)",
          };
          const isToday = d.status === "today";
          return (
            <div key={i} title={d.date.toLocaleDateString("fr-FR")} style={{
              flex: 1, height: 24, borderRadius: 4,
              background: colors[d.status],
              border: isToday ? "1.5px solid #02d1ba" : "none",
            }} />
          );
        })}
      </div>
      <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", letterSpacing: "0.3px", marginTop: 4, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <span>← 14 jours</span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
          <span style={{ width: 8, height: 8, borderRadius: 2, background: "#02d1ba", display: "inline-block" }} /> fait
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
          <span style={{ width: 8, height: 8, borderRadius: 2, background: "#f97316", display: "inline-block" }} /> raté
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
          <span style={{ width: 8, height: 8, borderRadius: 2, background: "rgba(255,255,255,0.15)", display: "inline-block" }} /> repos
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
          <span style={{ width: 8, height: 8, borderRadius: 2, border: "1px solid #02d1ba", display: "inline-block" }} /> aujourd'hui
        </span>
      </div>
    </div>
  );
}

function Stat({ label, value, valueColor }) {
  return (
    <div style={{ background: "rgba(0,0,0,0.25)", borderRadius: 8, padding: "8px 10px", textAlign: "center" }}>
      <div style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", letterSpacing: "0.5px", textTransform: "uppercase", fontWeight: 700, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 800, color: valueColor || "#fff", letterSpacing: "-0.5px" }}>{value}</div>
    </div>
  );
}

// ProgrammesHistorySection — liste tous les programmes (actifs + archivés) du
// client avec dates et actions Re-utiliser / Éditer / Comparer.
function ProgrammesHistorySection({ client, onEdit, onReuse }) {
  const [history, setHistory] = React.useState([]);
  const [expanded, setExpanded] = React.useState(false);
  const [compareIds, setCompareIds] = React.useState([]);
  const [compareData, setCompareData] = React.useState(null);

  React.useEffect(() => {
    if (!client?.id) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("programmes")
        .select("id, programme_name, uploaded_at, is_active, programme_accepted_at")
        .eq("client_id", client.id)
        .order("uploaded_at", { ascending: false });
      if (!cancelled) setHistory(data || []);
    })();
    return () => { cancelled = true; };
  }, [client?.id]);

  const archived = (history || []).filter((p) => !p.is_active);
  if (archived.length === 0) return null;

  const toggleCompare = (id) => {
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 2) return [prev[1], id];
      return [...prev, id];
    });
  };

  const openCompare = async () => {
    if (compareIds.length !== 2) return;
    try {
      const { data } = await supabase
        .from("programmes")
        .select("id, programme_name, html_content, uploaded_at")
        .in("id", compareIds);
      if (!data || data.length !== 2) return;
      setCompareData(data);
    } catch (e) { console.error(e); }
  };

  return (
    <div style={{ marginTop: 16, padding: 16, background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14 }}>
      <button type="button" onClick={() => setExpanded((v) => !v)}
        style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", background: "transparent", border: "none", color: "#fff", padding: 0, cursor: "pointer", fontFamily: "inherit" }}
      >
        <div>
          <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: 2, color: "rgba(2,209,186,0.55)", textTransform: "uppercase", marginBottom: 4 }}>Historique programmes</div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.85)", fontWeight: 600 }}>{archived.length} programme{archived.length > 1 ? "s" : ""} archivé{archived.length > 1 ? "s" : ""}</div>
        </div>
        <span style={{ fontSize: 18, color: "rgba(255,255,255,0.4)" }}>{expanded ? "−" : "+"}</span>
      </button>

      {expanded && (
        <div style={{ marginTop: 14 }}>
          {compareIds.length > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", marginBottom: 10, background: "rgba(2,209,186,0.06)", border: "1px solid rgba(2,209,186,0.2)", borderRadius: 8, fontSize: 11 }}>
              <div style={{ color: "rgba(255,255,255,0.7)" }}>{compareIds.length}/2 sélectionnés pour comparer</div>
              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" onClick={() => setCompareIds([])} style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.5)", fontSize: 11, cursor: "pointer", fontFamily: "inherit", padding: 0 }}>Annuler</button>
                {compareIds.length === 2 && (
                  <button type="button" onClick={openCompare} style={{ background: "#02d1ba", border: "none", color: "#000", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", padding: "4px 10px", borderRadius: 6 }}>Comparer →</button>
                )}
              </div>
            </div>
          )}
          {archived.map((p) => {
            const isCompareSel = compareIds.includes(p.id);
            return (
              <div key={p.id} style={{
                display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", marginBottom: 6,
                background: isCompareSel ? "rgba(2,209,186,0.08)" : "rgba(255,255,255,0.025)",
                border: "1px solid " + (isCompareSel ? "rgba(2,209,186,0.35)" : "rgba(255,255,255,0.05)"),
                borderRadius: 10,
              }}>
                <input type="checkbox" checked={isCompareSel} onChange={() => toggleCompare(p.id)}
                  style={{ width: 16, height: 16, cursor: "pointer", accentColor: "#02d1ba" }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.programme_name}</div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>
                    {new Date(p.uploaded_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                  </div>
                </div>
                <button type="button" onClick={() => onEdit(p.id)} style={{ padding: "5px 10px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6, color: "rgba(255,255,255,0.7)", fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Éditer</button>
                <button type="button" onClick={() => onReuse(p.id)} style={{ padding: "5px 10px", background: "rgba(2,209,186,0.1)", border: "1px solid rgba(2,209,186,0.3)", borderRadius: 6, color: "#02d1ba", fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Réutiliser</button>
              </div>
            );
          })}
        </div>
      )}

      {compareData && <ProgrammeCompareModal data={compareData} onClose={() => { setCompareData(null); setCompareIds([]); }} />}
    </div>
  );
}

// ProgrammeCompareModal — affiche 2 programmes côte à côte (#C feature)
function ProgrammeCompareModal({ data, onClose }) {
  const [parsedA, parsedB] = React.useMemo(() => {
    try {
      const Parser = require("../utils/parserProgramme");
      return [Parser.parseProgrammeHTML(data[0].html_content), Parser.parseProgrammeHTML(data[1].html_content)];
    } catch { return [null, null]; }
  }, [data]);

  if (!parsedA || !parsedB) return null;
  const stat = (p) => {
    const sessions = (p.weeks || []).reduce((a, w) => a + (w.sessions || []).length, 0);
    const exos = (p.weeks || []).reduce((a, w) => a + (w.sessions || []).reduce((b, s) => b + (s.exercises || []).length, 0), 0);
    return { weeks: (p.weeks || []).length, sessions, exos };
  };
  const sa = stat(parsedA), sb = stat(parsedB);

  // Liste des exos uniques (par programme)
  const exoList = (p) => Array.from(new Set((p.weeks || []).flatMap((w) => (w.sessions || []).flatMap((s) => (s.exercises || []).map((e) => e.name))))).filter(Boolean);
  const exA = exoList(parsedA), exB = exoList(parsedB);
  const onlyA = exA.filter((e) => !exB.includes(e));
  const onlyB = exB.filter((e) => !exA.includes(e));
  const common = exA.filter((e) => exB.includes(e));

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 11000, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, overflow: "auto" }}>
      <div style={{ background: "#0f0f0f", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 18, maxWidth: 900, width: "100%", maxHeight: "90vh", padding: 28, display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 3, color: "#02d1ba", textTransform: "uppercase", marginBottom: 6 }}>Comparateur</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", letterSpacing: -0.5 }}>Comparaison de programmes</div>
          </div>
          <button type="button" onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, background: "transparent", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.6)", cursor: "pointer", fontSize: 16 }}>×</button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          {[{ p: parsedA, s: sa, src: data[0] }, { p: parsedB, s: sb, src: data[1] }].map((side, i) => (
            <div key={i} style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: 16 }}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, color: "rgba(2,209,186,0.6)", textTransform: "uppercase", marginBottom: 6 }}>{i === 0 ? "Programme A" : "Programme B"}</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#fff", marginBottom: 4 }}>{side.src.programme_name}</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 12 }}>{new Date(side.src.uploaded_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginBottom: 14 }}>
                {[{ l: "Sem", v: side.s.weeks }, { l: "Séances", v: side.s.sessions }, { l: "Exos", v: side.s.exos }].map((x, j) => (
                  <div key={j} style={{ padding: "8px 10px", background: "rgba(255,255,255,0.03)", borderRadius: 8, textAlign: "center" }}>
                    <div style={{ fontSize: 18, fontWeight: 200, color: "#fff", lineHeight: 1 }}>{x.v}</div>
                    <div style={{ fontSize: 8, color: "rgba(255,255,255,0.4)", letterSpacing: 1, textTransform: "uppercase", marginTop: 3 }}>{x.l}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 18, padding: 14, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12 }}>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, color: "rgba(2,209,186,0.6)", textTransform: "uppercase", marginBottom: 10 }}>Diff exos</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, fontSize: 11 }}>
            <div>
              <div style={{ color: "#ff8888", fontWeight: 700, marginBottom: 4 }}>− Retirés ({onlyA.length})</div>
              {onlyA.length === 0 ? <div style={{ color: "rgba(255,255,255,0.3)", fontStyle: "italic" }}>—</div> : onlyA.map((n) => <div key={n} style={{ color: "rgba(255,136,136,0.85)" }}>− {n}</div>)}
            </div>
            <div>
              <div style={{ color: "rgba(255,255,255,0.5)", fontWeight: 700, marginBottom: 4 }}>= Conservés ({common.length})</div>
              {common.length === 0 ? <div style={{ color: "rgba(255,255,255,0.3)", fontStyle: "italic" }}>—</div> : common.map((n) => <div key={n} style={{ color: "rgba(255,255,255,0.55)" }}>= {n}</div>)}
            </div>
            <div>
              <div style={{ color: "#02d1ba", fontWeight: 700, marginBottom: 4 }}>+ Ajoutés ({onlyB.length})</div>
              {onlyB.length === 0 ? <div style={{ color: "rgba(255,255,255,0.3)", fontStyle: "italic" }}>—</div> : onlyB.map((n) => <div key={n} style={{ color: "rgba(2,209,186,0.85)" }}>+ {n}</div>)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

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
  if (diffH < 1) return tStatic("coach.activity_just_now");
  if (diffH < 24) return tStatic("coach.activity_hours_ago").replace("{n}", diffH);
  if (diffD === 1) return tStatic("coach.activity_yesterday");
  return tStatic("coach.activity_days_ago").replace("{n}", diffD);
}
function activityLabel(dateStr) {
  if (!dateStr) return { text: tStatic("coach.activity_never"), precise: true };
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffH = Math.floor((now - then) / 3600000);
  const diffD = Math.floor((now - then) / 86400000);
  if (diffH < 1) return { text: tStatic("coach.activity_online"), precise: true };
  if (diffH < 24) return { text: tStatic("coach.activity_active_hours_ago").replace("{n}", diffH), precise: true };
  if (diffD === 1) return { text: tStatic("coach.activity_seen_yesterday"), precise: true };
  if (diffD <= 7) return { text: tStatic("coach.activity_seen_days_ago").replace("{n}", diffD), precise: true };
  return { text: tStatic("coach.activity_inactive_days").replace("{n}", diffD), precise: true };
}
function activityColor(lastSeen) {
  if (!lastSeen) return "rgba(255,255,255,0.2)";
  const d = Math.floor((Date.now() - new Date(lastSeen)) / 86400000);
  if (d <= 1) return G;
  if (d <= 3) return G;
  if (d <= 7) return "rgba(255,255,255,0.4)";
  return "#ff6b6b";
}
function Avatar({ name, size = 40, active, src }) {
  // Si le client a uploade une photo (clients.avatar_url), on l'affiche.
  // Sinon fallback sur l'initiale du prenom (ancien comportement).
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", flexShrink: 0,
      background: src ? "transparent" : (active ? G_DIM : "rgba(255,255,255,0.04)"),
      backgroundImage: src ? `url(${src})` : "none",
      backgroundSize: "cover", backgroundPosition: "center",
      border: `2px solid ${active ? G_BORDER : "rgba(255,255,255,0.08)"}`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontWeight: 700, fontSize: size * 0.38, color: active ? G : "#666",
      overflow: "hidden",
    }}>
      {!src && (name || "?")[0].toUpperCase()}
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
            style={{ flex: 1, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, color: "#fff", padding: "10px 12px", fontSize: 16, outline: "none", fontFamily: "'DM Sans',-apple-system,sans-serif" }} />
          <select value={heure} onChange={e => setHeure(e.target.value)}
            style={{ flex: 1, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, color: "#fff", padding: "10px 12px", fontSize: 16, outline: "none", fontFamily: "'DM Sans',-apple-system,sans-serif" }}>
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

/* ── Panel supplements cote coach ── */
function CoachSupplementsPanel({ clientId }) {
  const t = useT();
  const [supplements, setSupplements] = React.useState([]);
  const [logs7d, setLogs7d] = React.useState({});
  const [loading, setLoading] = React.useState(true);
  const [showAdd, setShowAdd] = React.useState(false);
  const [newName, setNewName] = React.useState("");
  const [newDose, setNewDose] = React.useState("");

  const load = React.useCallback(async () => {
    if (!clientId) return;
    const { data: sups } = await supabase.from("client_supplements").select("*").eq("client_id", clientId).eq("is_active", true).order("created_at");
    setSupplements(sups || []);
    const d7 = new Date(); d7.setDate(d7.getDate() - 7);
    const { data: recentLogs } = await supabase.from("supplement_logs").select("supplement_id,date,taken").eq("client_id", clientId).gte("date", d7.toISOString().slice(0, 10));
    const map = {};
    (recentLogs || []).forEach(l => { if (!map[l.supplement_id]) map[l.supplement_id] = 0; if (l.taken) map[l.supplement_id]++; });
    setLogs7d(map);
    setLoading(false);
  }, [clientId]);

  React.useEffect(() => { load(); }, [load]);

  const addSupplement = async () => {
    if (!newName.trim()) return;
    await supabase.from("client_supplements").insert({ client_id: clientId, name: newName.trim(), dose: newDose.trim() || null, added_by: "coach" });
    setNewName(""); setNewDose(""); setShowAdd(false); load();
  };

  const removeSupplement = async (id) => {
    await supabase.from("client_supplements").update({ is_active: false }).eq("id", id);
    load();
  };

  if (loading) return <div style={{ padding: 20, color: "rgba(255,255,255,0.3)", fontSize: 13 }}>{t("csp.loading")}</div>;

  return (
    <div style={{ animation: "cpFadeUp 0.3s ease both" }}>
      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", color: "rgba(255,255,255,0.25)", marginBottom: 16 }}>{t("csp.section_title")}</div>

      {supplements.map(sup => (
        <div key={sup.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, marginBottom: 6 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{sup.name}</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>
              {sup.dose || "—"} · {sup.added_by === "coach" ? t("csp.prescribed_by_coach") : t("csp.added_by_client")} · <span style={{ color: (logs7d[sup.id] || 0) >= 5 ? "#02d1ba" : "rgba(255,255,255,0.3)" }}>{fillTpl(t("csp.taken_count"), { n: logs7d[sup.id] || 0 })}</span>
            </div>
          </div>
          <button onClick={() => removeSupplement(sup.id)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.15)", cursor: "pointer", fontSize: 16 }}>×</button>
        </div>
      ))}

      {supplements.length === 0 && !showAdd && (
        <div style={{ padding: "24px 16px", textAlign: "center", color: "rgba(255,255,255,0.3)", fontSize: 12 }}>{t("csp.empty")}</div>
      )}

      {showAdd ? (
        <div style={{ marginTop: 8, padding: 14, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12 }}>
          <input type="text" value={newName} onChange={e => setNewName(e.target.value)} placeholder={t("csp.placeholder_name")} style={{ width: "100%", padding: "10px 12px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, color: "#fff", fontSize: 16, outline: "none", boxSizing: "border-box", marginBottom: 6, fontFamily: "inherit" }} />
          <input type="text" value={newDose} onChange={e => setNewDose(e.target.value)} placeholder={t("csp.placeholder_dose")} style={{ width: "100%", padding: "10px 12px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, color: "#fff", fontSize: 16, outline: "none", boxSizing: "border-box", marginBottom: 10, fontFamily: "inherit" }} />
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={() => { setShowAdd(false); setNewName(""); setNewDose(""); }} style={{ flex: 1, padding: 10, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, color: "rgba(255,255,255,0.5)", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>{t("csp.btn_cancel")}</button>
            <button onClick={addSupplement} disabled={!newName.trim()} style={{ flex: 1, padding: 10, background: newName.trim() ? "#02d1ba" : "rgba(255,255,255,0.04)", border: "none", borderRadius: 8, color: newName.trim() ? "#000" : "rgba(255,255,255,0.2)", fontSize: 11, fontWeight: 800, cursor: newName.trim() ? "pointer" : "not-allowed", fontFamily: "inherit" }}>{t("csp.btn_add")}</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setShowAdd(true)} style={{ width: "100%", marginTop: 8, padding: 12, background: "rgba(2,209,186,0.06)", border: "1px solid rgba(2,209,186,0.15)", borderRadius: 12, color: "#02d1ba", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>{t("csp.btn_prescribe")}</button>
      )}
    </div>
  );
}

/* ── Modal détail séance : poids/reps par exercice, RPE, durée ── */
// Formatte un poids : null → "—", entier → "80", décimal → "22.3" (1 déc max).
// Gère le cas "22.333333333333332" (artefact d'arrondi flottant à l'import).
function fmtKg(w) {
  if (w == null || w === "" || isNaN(w)) return "—";
  const n = Number(w);
  return Number.isInteger(n) ? String(n) : (Math.round(n * 10) / 10).toString();
}
// ex_key = "programme__w0_s0_e2" → "Exercice 3" (lisible, 1-indexé). Fallback
// si resolveExName ne trouve rien dans le HTML programme parsé.
function prettyExName(key) {
  const m = String(key || "").match(/_e(\d+)$/i);
  return m ? `Exercice ${parseInt(m[1], 10) + 1}` : (key || "—");
}
// Style unique pour TOUS les chiffres affichés dans la modale détail.
// On vire JetBrains Mono (s'affichait en Courier sur certains devices) au
// profit d'une stack native + tabular-nums : SF Pro / Inter / Roboto avec
// alignement parfait des colonnes via OpenType "tnum" et "ss01" pour les
// formes alternatives plus sobres. Slashed-zero pour distinguer 0 de O.
const NUM_FONT = "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', 'Helvetica Neue', sans-serif";
const numStyle = {
  fontFamily: NUM_FONT,
  fontVariantNumeric: "tabular-nums slashed-zero",
  fontFeatureSettings: "'tnum' 1, 'zero' 1, 'ss01' 1",
  letterSpacing: "-0.01em",
};
// Calcule un 1RM Epley : w × (1 + reps/30), arrondi à 1 décimale.
function epley1rm(w, r) {
  if (!(Number(w) > 0) || !(Number(r) > 0)) return null;
  return Math.round(Number(w) * (1 + Number(r) / 30) * 10) / 10;
}
function SessionDetailModal({ data, onClose, onShowProgression }) {
  const { session, dayExs, resolveExName, allExLogs } = data;
  const date = new Date(session.logged_at);
  const sessionDateStr = (session.logged_at || "").slice(0, 10);
  const durationMin = session.duration_seconds ? Math.round(session.duration_seconds / 60) : null;
  // Grouper exercise_logs par ex_key + tri par index e<n> (ordre du programme)
  // pour que E1 vienne avant E2 même si l'ordre de logging était différent.
  // EXPANSION : si la ligne a `sets` (jsonb migration 046), on déroule chaque
  // série en une ligne distincte ; sinon (ancienne ligne agrégée), une seule
  // ligne avec weight=moyenne / reps=dernière série.
  const grouped = {};
  dayExs.slice().sort((a, b) => new Date(a.logged_at) - new Date(b.logged_at)).forEach((e) => {
    const key = e.ex_key || "—";
    if (!grouped[key]) grouped[key] = [];
    if (Array.isArray(e.sets) && e.sets.length > 0) {
      e.sets.forEach((s, idx) => {
        grouped[key].push({
          weight: s.weight,
          reps: s.reps,
          logged_at: e.logged_at,
          _setIndex: idx,
          _expanded: true,
        });
      });
    } else {
      grouped[key].push(e);
    }
  });
  const exercises = Object.entries(grouped).sort((a, b) => {
    const ai = parseInt((a[0].match(/_e(\d+)$/i) || [])[1] || 999, 10);
    const bi = parseInt((b[0].match(/_e(\d+)$/i) || [])[1] || 999, 10);
    return ai - bi;
  });
  const G_LOCAL = "#02d1ba";

  // ── Comparaison vs séance précédente du même exo ──
  // allExLogs = tous les logs récents du client (table exercise_logs). Pour
  // chaque ex_key on isole les sessions ANTÉRIEURES (date < sessionDateStr) et
  // on prend la plus récente comme référence "séance précédente".
  const prevByKey = {};
  // PR all-time = max poids historique (sets antérieurs OU postérieurs hors
  // séance courante). Si la séance courante bat ce max → 🏆.
  const histMaxByKey = {};
  if (Array.isArray(allExLogs)) {
    const byKey = {};
    allExLogs.forEach((l) => {
      const k = l.ex_key;
      if (!k) return;
      if (!byKey[k]) byKey[k] = [];
      byKey[k].push(l);
    });
    // Renvoie le poids max d'une ligne — déroule sets[] jsonb si dispo
    // (sinon retombe sur weight agrégé). Sans ça : un client qui fait
    // 60→70→80kg verrait son max stocké comme avg≈70 → faux PR à chaque
    // séance répétée à charges identiques.
    const rowMaxW = (r) => {
      if (Array.isArray(r.sets) && r.sets.length > 0) {
        return Math.max(0, ...r.sets.map((s) => Number(s?.weight) || 0));
      }
      return Number(r.weight) || 0;
    };
    const rowBest1rm = (r) => {
      if (Array.isArray(r.sets) && r.sets.length > 0) {
        return Math.max(0, ...r.sets.map((s) => epley1rm(s?.weight, s?.reps) || 0));
      }
      return epley1rm(r.weight, r.reps) || 0;
    };
    Object.entries(byKey).forEach(([k, rows]) => {
      // Précédente = plus récente date STRICTEMENT antérieure à la séance courante
      const priorDates = [...new Set(rows
        .map((r) => (r.logged_at || "").slice(0, 10))
        .filter((d) => d && d < sessionDateStr))].sort().reverse();
      if (priorDates.length > 0) {
        const prevDate = priorDates[0];
        const prevSets = rows.filter((r) => (r.logged_at || "").startsWith(prevDate));
        const prevMaxW = Math.max(0, ...prevSets.map(rowMaxW));
        const prevBest1rm = Math.max(0, ...prevSets.map(rowBest1rm));
        prevByKey[k] = { date: prevDate, maxW: prevMaxW, best1rm: prevBest1rm };
      }
      // Max historique = max poids sur sets HORS séance courante avec poids>0.
      // null si aucun antécédent → empêche le faux 🏆 PR sur la 1ère séance
      // (le PR n'a de sens que s'il y avait quelque chose à battre).
      const others = rows.filter((r) => !(r.logged_at || "").startsWith(sessionDateStr));
      const otherMax = others.length > 0 ? Math.max(...others.map(rowMaxW)) : 0;
      histMaxByKey[k] = otherMax > 0 ? otherMax : null;
    });
  }
  // Vrai si AUCUN exercice de la séance n'a d'historique antérieur. Permet
  // d'afficher une bannière unique en haut au lieu de "1ère séance" dupliqué
  // sur chaque carte (visuellement plus propre).
  const allFirstTime = exercises.length > 0 && exercises.every(([k]) => !prevByKey[k]);

  // ── Stats agrégées de la séance (header) ──
  const allRealSets = [];
  exercises.forEach(([, sets]) => {
    sets.forEach((s) => {
      if ((Number(s.weight) > 0) || (Number(s.reps) > 0)) allRealSets.push(s);
    });
  });
  const sessionVolume = allRealSets.reduce((sum, s) => sum + (Number(s.weight) || 0) * (Number(s.reps) || 0), 0);
  const sessionMaxW = allRealSets.length > 0 ? Math.max(...allRealSets.map((s) => Number(s.weight) || 0)) : 0;
  const sessionTotalReps = allRealSets.reduce((sum, s) => sum + (Number(s.reps) || 0), 0);
  const sessionBest1rm = allRealSets.reduce((m, s) => Math.max(m, epley1rm(s.weight, s.reps) || 0), 0);
  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20, overflowY: "auto",
      }}
    >
      <div style={{
        background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20,
        maxWidth: 600, width: "100%", maxHeight: "90vh",
        display: "flex", flexDirection: "column", fontFamily: "-apple-system,'Inter',sans-serif",
        overflow: "hidden",
      }}>
        {/* Header : eyebrow + titre + date sur 2 lignes, croix à droite. Padding
            généreux pour un feeling premium, separator subtil entre header et corps. */}
        <div style={{
          padding: "26px 28px 22px",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
          background: "linear-gradient(180deg, rgba(2,209,186,0.025) 0%, transparent 100%)",
          display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16,
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: 3.5, color: G_LOCAL, textTransform: "uppercase", marginBottom: 8 }}>
              Détail séance
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", letterSpacing: -0.5, lineHeight: 1.15, marginBottom: 6 }}>
              {session.session_name || session.programme_name || "Séance"}
            </div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ textTransform: "capitalize" }}>
                {date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
              </span>
              {durationMin != null && (
                <>
                  <span style={{ color: "rgba(255,255,255,0.2)" }}>·</span>
                  <span style={{ fontFamily: NUM_FONT, fontVariantNumeric: "tabular-nums slashed-zero", fontFeatureSettings: "'tnum' 1, 'zero' 1", color: "rgba(255,255,255,0.7)" }}>{durationMin} min</span>
                </>
              )}
              {allRealSets.length > 0 && (
                <>
                  <span style={{ color: "rgba(255,255,255,0.2)" }}>·</span>
                  <span style={{ fontFamily: NUM_FONT, fontVariantNumeric: "tabular-nums slashed-zero", fontFeatureSettings: "'tnum' 1, 'zero' 1", color: "rgba(255,255,255,0.7)" }}>{allRealSets.length} sets loggés</span>
                </>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            style={{ width: 34, height: 34, borderRadius: 10, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.7)", cursor: "pointer", fontSize: 18, lineHeight: 1, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}
          >×</button>
        </div>

        {/* KPIs séance : 4 colonnes égales avec dividers internes plutôt que
            grille remplie. Numeros gros & monospace pour le côté Bloomberg. */}
        {allRealSets.length > 0 && (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            background: "rgba(2,209,186,0.03)",
            borderBottom: "1px solid rgba(255,255,255,0.05)",
          }}>
            {[
              { label: "Volume total", value: `${Math.round(sessionVolume).toLocaleString("fr-FR")}`, suffix: "kg" },
              { label: "Charge max", value: fmtKg(sessionMaxW), suffix: "kg" },
              { label: "Reps total", value: sessionTotalReps, suffix: "" },
              { label: "1RM est. max", value: fmtKg(sessionBest1rm), suffix: "kg" },
            ].map((kpi, i, arr) => (
              <div key={i} style={{
                padding: "16px 8px",
                textAlign: "center",
                borderRight: i < arr.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
              }}>
                <div style={{ fontSize: 8.5, fontWeight: 800, letterSpacing: 1.8, textTransform: "uppercase", color: "rgba(255,255,255,0.4)", marginBottom: 6 }}>
                  {kpi.label}
                </div>
                <div style={{ fontFamily: NUM_FONT, fontVariantNumeric: "tabular-nums slashed-zero", fontFeatureSettings: "'tnum' 1, 'zero' 1", fontWeight: 700, color: G_LOCAL, fontSize: 18, letterSpacing: -0.5 }}>
                  {kpi.value}
                  {kpi.suffix && <span style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginLeft: 3, fontWeight: 500 }}>{kpi.suffix}</span>}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Bannière 1ère séance : montrée UNE fois si tous les exos sont
            inédits, plutôt que dupliquée sur chaque carte. */}
        {allFirstTime && (
          <div style={{
            padding: "10px 28px",
            background: "rgba(255,170,0,0.04)",
            borderBottom: "1px solid rgba(255,170,0,0.12)",
            fontSize: 11, color: "rgba(255,200,100,0.8)",
            display: "flex", alignItems: "center", gap: 8,
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0 }}>
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4" />
              <path d="M12 16h.01" />
            </svg>
            <span>Première séance loggée pour ces exercices — pas encore de comparaison disponible.</span>
          </div>
        )}

        <div style={{ flex: 1, overflowY: "auto", padding: "20px 28px 28px" }}>
          {exercises.length === 0 ? (
            <div style={{
              padding: "44px 24px", textAlign: "center",
              background: "linear-gradient(180deg, rgba(2,209,186,0.025), rgba(255,255,255,0.01))",
              border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14,
              display: "flex", flexDirection: "column", alignItems: "center",
            }}>
              {/* Pictogramme custom (haltère) — meme aesthetic que les autres ecrans */}
              <div style={{
                width: 72, height: 72, borderRadius: "50%",
                background: "radial-gradient(circle at 30% 30%, rgba(2,209,186,0.16), rgba(2,209,186,0.03) 60%, transparent 80%)",
                border: "1px solid rgba(2,209,186,0.16)",
                boxShadow: "0 0 40px rgba(2,209,186,0.08), inset 0 0 20px rgba(2,209,186,0.04)",
                display: "flex", alignItems: "center", justifyContent: "center",
                marginBottom: 18,
              }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={G_LOCAL} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14.4 14.4 9.6 9.6" />
                  <path d="M18.657 21.485a2 2 0 1 1-2.829-2.828l-1.767 1.768a2 2 0 1 1-2.829-2.829l6.364-6.364a2 2 0 1 1 2.829 2.829l-1.768 1.767a2 2 0 1 1 2.828 2.829z" />
                  <path d="m21.5 21.5-1.4-1.4" />
                  <path d="M3.9 3.9 2.5 2.5" />
                  <path d="M6.404 12.768a2 2 0 1 1-2.829-2.829l1.768-1.767a2 2 0 1 1-2.828-2.829l2.828-2.828a2 2 0 1 1 2.829 2.828l1.767-1.768a2 2 0 1 1 2.829 2.829z" />
                </svg>
              </div>
              <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: 3, color: G_LOCAL, textTransform: "uppercase", marginBottom: 8, opacity: 0.7 }}>
                Sans détail
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#fff", marginBottom: 10, letterSpacing: "-0.4px" }}>
                Séance validée sans tracking
              </div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", lineHeight: 1.6, maxWidth: 340 }}>
                Le client a marqué la séance comme terminée sans saisir le poids ni les reps de chaque set. Rappelle-lui de logger ses charges directement dans l'app pendant la séance.
              </div>
            </div>
          ) : (
            <>
            <div style={{
              fontSize: 9, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase",
              color: "rgba(255,255,255,0.35)", marginBottom: 14,
            }}>
              Exercices · {exercises.length}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {exercises.map(([key, sets], i) => {
                const name = (resolveExName && resolveExName(session, key)) || prettyExName(key);
                // Sets "réellement loggés" = au moins un poids OU des reps. Le
                // reste (weight=0 + reps=0) = artefacts du bouton Terminer sans
                // saisie → on les compte à part pour ne pas fausser max/total.
                const realSets = sets.filter((s) => (Number(s.weight) > 0) || (Number(s.reps) > 0));
                const emptyCount = sets.length - realSets.length;
                const maxW = realSets.length > 0 ? Math.max(...realSets.map((s) => Number(s.weight) || 0)) : 0;
                const totalReps = realSets.reduce((sum, s) => sum + (Number(s.reps) || 0), 0);
                // Comparaison vs séance précédente (delta poids max)
                const prev = prevByKey[key];
                const deltaW = prev && maxW > 0 ? Math.round((maxW - prev.maxW) * 10) / 10 : null;
                const isPR = realSets.length > 0 && histMaxByKey[key] != null && maxW > histMaxByKey[key];
                const deltaColor = deltaW == null ? "rgba(255,255,255,0.3)" : deltaW > 0 ? "#02d1ba" : deltaW < 0 ? "#ff6b6b" : "rgba(255,255,255,0.4)";
                const deltaLabel = deltaW == null
                  ? null
                  : deltaW === 0 ? "= identique" : `${deltaW > 0 ? "▲ +" : "▼ "}${fmtKg(Math.abs(deltaW))}kg`;
                return (
                  <div key={i} style={{
                    background: isPR
                      ? "linear-gradient(180deg, rgba(2,209,186,0.06) 0%, rgba(255,255,255,0.015) 100%)"
                      : "rgba(255,255,255,0.02)",
                    border: `1px solid ${isPR ? "rgba(2,209,186,0.25)" : "rgba(255,255,255,0.05)"}`,
                    borderRadius: 14,
                    padding: 16,
                    boxShadow: isPR ? "0 0 32px rgba(2,209,186,0.06)" : "none",
                    transition: "border-color .15s",
                  }}>
                    {/* Header carte : numéro + nom (cliquable → progression),
                        badge PR à droite. */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 12 }}>
                      <button
                        type="button"
                        onClick={() => onShowProgression && onShowProgression({ exKey: key, exName: name })}
                        style={{
                          display: "flex", alignItems: "baseline", gap: 10, flex: 1, minWidth: 0,
                          background: "transparent", border: "none", padding: 0,
                          cursor: onShowProgression ? "pointer" : "default", textAlign: "left",
                          color: "inherit", font: "inherit",
                        }}
                        title={onShowProgression ? "Voir la progression de cet exercice" : ""}
                      >
                        <div style={{
                          fontSize: 10, fontWeight: 800, letterSpacing: 1.5, color: "rgba(255,255,255,0.3)",
                          fontFamily: NUM_FONT, fontVariantNumeric: "tabular-nums slashed-zero", fontFeatureSettings: "'tnum' 1, 'zero' 1", flexShrink: 0,
                        }}>
                          {String(i + 1).padStart(2, "0")}
                        </div>
                        <div style={{
                          fontSize: 14, fontWeight: 700, color: "#fff", letterSpacing: -0.2, lineHeight: 1.3, wordBreak: "break-word",
                          textDecoration: onShowProgression ? "underline" : "none", textDecorationColor: "rgba(2,209,186,0.3)", textDecorationThickness: 1, textUnderlineOffset: 4,
                        }}>{name}</div>
                      </button>
                      {isPR && (
                        <span style={{
                          fontSize: 9, fontWeight: 800, letterSpacing: 1.4, padding: "4px 8px",
                          background: "rgba(2,209,186,0.18)", color: G_LOCAL, borderRadius: 6,
                          textTransform: "uppercase", flexShrink: 0,
                          border: "1px solid rgba(2,209,186,0.3)",
                          display: "inline-flex", alignItems: "center", gap: 5,
                        }}>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={G_LOCAL} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M6 4h12v3a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V4Z" />
                            <path d="M6 4H3v2a3 3 0 0 0 3 3" />
                            <path d="M18 4h3v2a3 3 0 0 1-3 3" />
                            <path d="M9 17h6" />
                            <path d="M12 11v6" />
                          </svg>
                          Record battu
                        </span>
                      )}
                    </div>
                    {/* Ligne résumé : sets · max · reps. Sobre, sous le titre. */}
                    <div style={{
                      fontSize: 10, color: "rgba(255,255,255,0.5)", fontWeight: 600,
                      letterSpacing: 0.5, marginBottom: 12,
                      fontFamily: NUM_FONT, fontVariantNumeric: "tabular-nums slashed-zero", fontFeatureSettings: "'tnum' 1, 'zero' 1",
                    }}>
                      {realSets.length > 0 ? (
                        <>
                          <span>{realSets.length} série{realSets.length > 1 ? "s" : ""}</span>
                          <span style={{ color: "rgba(255,255,255,0.2)", margin: "0 8px" }}>·</span>
                          <span>max {fmtKg(maxW)}kg</span>
                          <span style={{ color: "rgba(255,255,255,0.2)", margin: "0 8px" }}>·</span>
                          <span>{totalReps} reps</span>
                          {emptyCount > 0 && (
                            <>
                              <span style={{ color: "rgba(255,255,255,0.2)", margin: "0 8px" }}>·</span>
                              <span style={{ color: "rgba(255,170,0,0.6)" }}>{emptyCount} non loggée{emptyCount > 1 ? "s" : ""}</span>
                            </>
                          )}
                        </>
                      ) : (
                        <span style={{ color: "rgba(255,170,0,0.6)" }}>Aucun set loggé</span>
                      )}
                    </div>
                    {/* Référence séance précédente : ligne dédiée seulement si on a un précédent */}
                    {prev && realSets.length > 0 && maxW > 0 && (
                      <div style={{
                        display: "flex", alignItems: "center", gap: 10,
                        padding: "8px 12px",
                        marginBottom: 12,
                        background: "rgba(0,0,0,0.25)",
                        border: "1px solid rgba(255,255,255,0.04)",
                        borderRadius: 8,
                        fontSize: 11,
                      }}>
                        <span style={{ color: "rgba(255,255,255,0.35)", letterSpacing: 1, textTransform: "uppercase", fontWeight: 700, fontSize: 9 }}>
                          Vs {new Date(prev.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}
                        </span>
                        <span style={{ fontFamily: NUM_FONT, fontVariantNumeric: "tabular-nums slashed-zero", fontFeatureSettings: "'tnum' 1, 'zero' 1", color: "rgba(255,255,255,0.55)" }}>{fmtKg(prev.maxW)}kg</span>
                        <span style={{ color: "rgba(255,255,255,0.2)" }}>→</span>
                        <span style={{ fontFamily: NUM_FONT, fontVariantNumeric: "tabular-nums slashed-zero", fontFeatureSettings: "'tnum' 1, 'zero' 1", color: "#fff", fontWeight: 700 }}>{fmtKg(maxW)}kg</span>
                        {deltaLabel && (
                          <span style={{ color: deltaColor, fontWeight: 700, fontFamily: NUM_FONT, fontVariantNumeric: "tabular-nums slashed-zero", fontFeatureSettings: "'tnum' 1, 'zero' 1", marginLeft: "auto", fontSize: 11 }}>
                            {deltaLabel}
                          </span>
                        )}
                      </div>
                    )}
                    {/* Tableau des séries — header fin + lignes alignées en
                        colonnes monospace pour ressembler à un terminal de
                        trading. Pas de bordure par ligne (trop bruyant) :
                        séparateurs hairline horizontaux à la place. */}
                    <div style={{
                      background: "rgba(0,0,0,0.25)",
                      border: "1px solid rgba(255,255,255,0.04)",
                      borderRadius: 10,
                      overflow: "hidden",
                    }}>
                      <div style={{
                        display: "grid",
                        gridTemplateColumns: "44px 1fr 80px 80px",
                        gap: 8, alignItems: "center",
                        fontSize: 9, fontWeight: 700, letterSpacing: 1.4,
                        textTransform: "uppercase", color: "rgba(255,255,255,0.3)",
                        padding: "10px 14px",
                        background: "rgba(255,255,255,0.02)",
                        borderBottom: "1px solid rgba(255,255,255,0.04)",
                      }}>
                        <div>Sér.</div>
                        <div>Charge × reps</div>
                        <div style={{ textAlign: "right" }}>Volume</div>
                        <div style={{ textAlign: "right" }}>1RM est.</div>
                      </div>
                      {sets.map((s, j) => {
                        const w = Number(s.weight) || 0;
                        const r = Number(s.reps) || 0;
                        const isEmpty = w === 0 && r === 0;
                        const repsMissing = !isEmpty && r === 0;
                        const volume = w > 0 && r > 0 ? Math.round(w * r * 10) / 10 : null;
                        const oneRm = epley1rm(w, r);
                        const time = s.logged_at ? new Date(s.logged_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : null;
                        return (
                          <div key={j} style={{
                            display: "grid",
                            gridTemplateColumns: "44px 1fr 80px 80px",
                            gap: 8, alignItems: "center",
                            padding: "12px 14px",
                            borderTop: j === 0 ? "none" : "1px solid rgba(255,255,255,0.03)",
                            opacity: isEmpty ? 0.5 : 1,
                          }}>
                            <div>
                              <div style={{
                                fontFamily: NUM_FONT, fontVariantNumeric: "tabular-nums slashed-zero", fontFeatureSettings: "'tnum' 1, 'zero' 1",
                                fontWeight: 700, fontSize: 11,
                                color: isEmpty ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.85)",
                              }}>
                                {String(j + 1).padStart(2, "0")}
                              </div>
                              {time && (
                                <div style={{ fontSize: 9, color: "rgba(255,255,255,0.25)", marginTop: 2, fontFamily: NUM_FONT, fontVariantNumeric: "tabular-nums slashed-zero", fontFeatureSettings: "'tnum' 1, 'zero' 1" }}>{time}</div>
                              )}
                            </div>
                            <div>
                              <div style={{ fontFamily: NUM_FONT, fontVariantNumeric: "tabular-nums slashed-zero", fontFeatureSettings: "'tnum' 1, 'zero' 1", fontWeight: 700, fontSize: 13, lineHeight: 1.2 }}>
                                <span style={{ color: isEmpty ? "rgba(255,255,255,0.35)" : G_LOCAL }}>
                                  {fmtKg(w)}<span style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginLeft: 2, fontWeight: 500 }}>kg</span>
                                </span>
                                <span style={{ color: "rgba(255,255,255,0.25)", margin: "0 8px", fontWeight: 400 }}>×</span>
                                <span style={{ color: isEmpty ? "rgba(255,255,255,0.35)" : "#fff" }}>{r}</span>
                              </div>
                              {repsMissing && (
                                <div style={{
                                  display: "inline-flex", alignItems: "center", gap: 4,
                                  marginTop: 4, padding: "1px 6px",
                                  background: "rgba(255,170,0,0.08)",
                                  border: "1px solid rgba(255,170,0,0.18)",
                                  borderRadius: 4,
                                  fontSize: 9, fontWeight: 700,
                                  color: "rgba(255,200,100,0.85)",
                                  textTransform: "uppercase", letterSpacing: 0.5,
                                }}>
                                  ⚠ Reps non saisis
                                </div>
                              )}
                            </div>
                            <div style={{ textAlign: "right", fontFamily: NUM_FONT, fontVariantNumeric: "tabular-nums slashed-zero", fontFeatureSettings: "'tnum' 1, 'zero' 1", fontSize: 11, color: volume != null ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.2)" }}>
                              {volume != null ? <>{volume}<span style={{ fontSize: 9, color: "rgba(255,255,255,0.35)", marginLeft: 2 }}>kg</span></> : "—"}
                            </div>
                            <div style={{ textAlign: "right", fontFamily: NUM_FONT, fontVariantNumeric: "tabular-nums slashed-zero", fontFeatureSettings: "'tnum' 1, 'zero' 1", fontSize: 11, color: oneRm != null ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.2)" }}>
                              {oneRm != null ? <>{fmtKg(oneRm)}<span style={{ fontSize: 9, color: "rgba(255,255,255,0.35)", marginLeft: 2 }}>kg</span></> : "—"}
                            </div>
                          </div>
                        );
                      })}
                      {realSets.length > 1 && (() => {
                        const totalVol = Math.round(realSets.reduce((s, x) => s + (Number(x.weight) || 0) * (Number(x.reps) || 0), 0) * 10) / 10;
                        return (
                          <div style={{
                            display: "grid",
                            gridTemplateColumns: "44px 1fr 80px 80px",
                            gap: 8, alignItems: "center",
                            padding: "10px 14px",
                            background: "rgba(2,209,186,0.04)",
                            borderTop: "1px solid rgba(2,209,186,0.12)",
                            fontSize: 10,
                          }}>
                            <div></div>
                            <div style={{ fontWeight: 700, letterSpacing: 1.4, textTransform: "uppercase", color: "rgba(255,255,255,0.5)", fontSize: 9 }}>Volume total exercice</div>
                            <div style={{ textAlign: "right", fontFamily: NUM_FONT, fontVariantNumeric: "tabular-nums slashed-zero", fontFeatureSettings: "'tnum' 1, 'zero' 1", fontWeight: 700, color: G_LOCAL, fontSize: 12 }}>
                              {totalVol.toLocaleString("fr-FR")}<span style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", marginLeft: 2 }}>kg</span>
                            </div>
                            <div></div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                );
              })}
            </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Modal progression d'un exercice : courbe poids max + volume + 1RM est.
   sur toutes les séances historiques de cet exo. Ouverte au clic sur le nom
   d'un exo dans SessionDetailModal. ── */
function ExerciseProgressionModal({ data, onClose }) {
  const { exKey, exName, allExLogs } = data;
  const G_LOCAL = "#02d1ba";
  // Reconstruit l'historique : 1 entrée par date avec maxW, totalVolume, best1rm
  const history = React.useMemo(() => {
    if (!Array.isArray(allExLogs)) return [];
    const rows = allExLogs.filter((l) => l.ex_key === exKey);
    const byDate = {};
    rows.forEach((r) => {
      const d = (r.logged_at || "").slice(0, 10);
      if (!d) return;
      if (!byDate[d]) byDate[d] = { date: d, maxW: 0, totalVolume: 0, best1rm: 0, sets: 0 };
      const sets = Array.isArray(r.sets) && r.sets.length > 0
        ? r.sets
        : [{ weight: r.weight, reps: r.reps }];
      sets.forEach((s) => {
        const w = Number(s?.weight) || 0;
        const reps = Number(s?.reps) || 0;
        byDate[d].maxW = Math.max(byDate[d].maxW, w);
        byDate[d].totalVolume += w * reps;
        const onerm = epley1rm(w, reps);
        if (onerm) byDate[d].best1rm = Math.max(byDate[d].best1rm, onerm);
        byDate[d].sets += 1;
      });
    });
    return Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date));
  }, [allExLogs, exKey]);

  const lastEntry = history[history.length - 1];
  const firstEntry = history[0];
  const allTimeMax = history.reduce((m, h) => Math.max(m, h.maxW), 0);
  const allTimeBest1rm = history.reduce((m, h) => Math.max(m, h.best1rm), 0);
  const totalSessions = history.length;
  const deltaW = lastEntry && firstEntry ? Math.round((lastEntry.maxW - firstEntry.maxW) * 10) / 10 : null;

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: "fixed", inset: 0, zIndex: 1100,
        background: "rgba(0,0,0,0.78)", backdropFilter: "blur(10px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20, overflowY: "auto",
      }}
    >
      <div style={{
        background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20,
        maxWidth: 640, width: "100%", maxHeight: "90vh",
        display: "flex", flexDirection: "column",
        fontFamily: "-apple-system,'Inter',sans-serif", overflow: "hidden",
      }}>
        <div style={{
          padding: "26px 28px 22px",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
          background: "linear-gradient(180deg, rgba(2,209,186,0.025) 0%, transparent 100%)",
          display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16,
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: 3.5, color: G_LOCAL, textTransform: "uppercase", marginBottom: 8 }}>
              Progression
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", letterSpacing: -0.5, lineHeight: 1.15, marginBottom: 6, wordBreak: "break-word" }}>
              {exName}
            </div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", ...numStyle }}>
              {totalSessions} séance{totalSessions > 1 ? "s" : ""} · première {firstEntry ? new Date(firstEntry.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            style={{ width: 34, height: 34, borderRadius: 10, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.7)", cursor: "pointer", fontSize: 18, lineHeight: 1, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}
          >×</button>
        </div>

        {/* KPIs all-time */}
        {history.length > 0 && (
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(4, 1fr)",
            background: "rgba(2,209,186,0.03)",
            borderBottom: "1px solid rgba(255,255,255,0.05)",
          }}>
            {[
              { label: "Charge actuelle", value: fmtKg(lastEntry?.maxW || 0), suffix: "kg" },
              { label: "Record poids", value: fmtKg(allTimeMax), suffix: "kg" },
              { label: "1RM est. max", value: fmtKg(allTimeBest1rm), suffix: "kg" },
              { label: "Δ depuis 1ère", value: deltaW != null ? `${deltaW > 0 ? "+" : ""}${fmtKg(deltaW)}` : "—", suffix: deltaW != null ? "kg" : "", color: deltaW == null ? null : deltaW > 0 ? G_LOCAL : deltaW < 0 ? "#ff6b6b" : null },
            ].map((kpi, i, arr) => (
              <div key={i} style={{
                padding: "16px 8px", textAlign: "center",
                borderRight: i < arr.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
              }}>
                <div style={{ fontSize: 8.5, fontWeight: 800, letterSpacing: 1.8, textTransform: "uppercase", color: "rgba(255,255,255,0.4)", marginBottom: 6 }}>
                  {kpi.label}
                </div>
                <div style={{ ...numStyle, fontWeight: 700, color: kpi.color || G_LOCAL, fontSize: 18, letterSpacing: -0.5 }}>
                  {kpi.value}
                  {kpi.suffix && <span style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginLeft: 3, fontWeight: 500 }}>{kpi.suffix}</span>}
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ flex: 1, overflowY: "auto", padding: "20px 28px 28px" }}>
          {history.length < 2 ? (
            <div style={{
              padding: "36px 24px", textAlign: "center",
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.05)", borderRadius: 14,
              fontSize: 12, color: "rgba(255,255,255,0.4)", lineHeight: 1.6,
            }}>
              {history.length === 0
                ? "Aucune donnée historique trouvée pour cet exercice."
                : "Une seule séance loggée — la courbe s'affichera dès la 2e."}
            </div>
          ) : (
            <>
              <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase", color: "rgba(255,255,255,0.35)", marginBottom: 14 }}>
                Évolution charge max
              </div>
              <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 14, padding: "16px 8px 8px", marginBottom: 24 }}>
                <LineGraph
                  data={history.map((h) => ({ date: h.date, weight: h.maxW }))}
                  color={G_LOCAL}
                  height={200}
                  unit="kg"
                  valueKey="weight"
                />
              </div>
              <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase", color: "rgba(255,255,255,0.35)", marginBottom: 14 }}>
                Détail par séance
              </div>
              <div style={{
                background: "rgba(0,0,0,0.25)",
                border: "1px solid rgba(255,255,255,0.04)",
                borderRadius: 10, overflow: "hidden",
              }}>
                <div style={{
                  display: "grid", gridTemplateColumns: "1fr 70px 80px 70px",
                  gap: 8, padding: "10px 14px",
                  background: "rgba(255,255,255,0.02)",
                  borderBottom: "1px solid rgba(255,255,255,0.04)",
                  fontSize: 9, fontWeight: 700, letterSpacing: 1.4, textTransform: "uppercase", color: "rgba(255,255,255,0.3)",
                }}>
                  <div>Date</div>
                  <div style={{ textAlign: "right" }}>Max</div>
                  <div style={{ textAlign: "right" }}>Volume</div>
                  <div style={{ textAlign: "right" }}>1RM est.</div>
                </div>
                {[...history].reverse().map((h, i) => (
                  <div key={i} style={{
                    display: "grid", gridTemplateColumns: "1fr 70px 80px 70px",
                    gap: 8, padding: "12px 14px",
                    borderTop: i === 0 ? "none" : "1px solid rgba(255,255,255,0.03)",
                    fontSize: 12,
                  }}>
                    <div style={{ ...numStyle, color: "rgba(255,255,255,0.85)", fontWeight: 600 }}>
                      {new Date(h.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "2-digit" })}
                    </div>
                    <div style={{ ...numStyle, textAlign: "right", color: G_LOCAL, fontWeight: 700 }}>
                      {fmtKg(h.maxW)}<span style={{ fontSize: 9, color: "rgba(255,255,255,0.35)", marginLeft: 2, fontWeight: 500 }}>kg</span>
                    </div>
                    <div style={{ ...numStyle, textAlign: "right", color: h.totalVolume > 0 ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.2)" }}>
                      {h.totalVolume > 0 ? <>{Math.round(h.totalVolume).toLocaleString("fr-FR")}<span style={{ fontSize: 9, color: "rgba(255,255,255,0.35)", marginLeft: 2 }}>kg</span></> : "—"}
                    </div>
                    <div style={{ ...numStyle, textAlign: "right", color: h.best1rm > 0 ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.2)" }}>
                      {h.best1rm > 0 ? <>{fmtKg(h.best1rm)}<span style={{ fontSize: 9, color: "rgba(255,255,255,0.35)", marginLeft: 2 }}>kg</span></> : "—"}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Page plein ecran detail client — TOUT visible d'un coup ── */
function ClientPanel({ client, onClose, onUpload, onDelete, coachId, coachData, isDemo = false, coachPlans = [], onWantInvoice }) {
  const t = useT();
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
  // HTML content de TOUS les programmes du client (actif + archivés). Loadé
  // séparément car loadClients() ne sélectionne que les métadonnées (sinon
  // ~25MB par programme × N clients exploserait le listing initial).
  const [programmesContent, setProgrammesContent] = useState([]);
  const [sessionDetail, setSessionDetail] = useState(null); // { session, dayExs }
  const [exProgression, setExProgression] = useState(null); // { exKey, exName }
  const [coachNotes, setCoachNotes] = useState([]);
  const [newNote, setNewNote] = useState("");
  const [noteSaving, setNoteSaving] = useState(false);
  const [uploadPlanId, setUploadPlanId] = useState("3m");
  const [panelTab, setPanelTab] = useState("resume");
  const [uploadProgWeeks, setUploadProgWeeks] = useState(6);
  const [showBuilder, setShowBuilder] = useState(false); // duree du programme en semaines
  const [builderEditing, setBuilderEditing] = useState(null); // programme pour edit mode
  const [showPrevalidate, setShowPrevalidate] = useState(false);
  const [prevalidWeek, setPrevalidWeek] = useState(1);
  const [prevalidSession, setPrevalidSession] = useState(1);
  const [prevalidWhen, setPrevalidWhen] = useState(""); // datetime-local ISO local string
  // Hook B : modal "logger paiement" pour ce client (déclenchée manuellement
  // depuis la fiche client via le bouton "Logger un paiement reçu")
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [lastPayment, setLastPayment] = useState(null);
  // Reload last payment after a save
  const reloadLastPayment = React.useCallback(async () => {
    if (!client?.id) return;
    const { data } = await supabase
      .from("client_payments")
      .select("amount_eur, received_date, period_start, period_end, payment_method")
      .eq("client_id", client.id)
      .eq("void", false)
      .order("period_end", { ascending: false })
      .limit(1)
      .maybeSingle();
    setLastPayment(data || null);
  }, [client?.id]);
  React.useEffect(() => { reloadLastPayment(); }, [reloadLastPayment]);
  const [confirmDelete, setConfirmDelete] = useState(null); // { progId, progName } pour modal confirm
  const [drawer, setDrawer] = useState(null); // null | "poids" | "eau" | "sommeil" | "pas"
  const fileRef = useRef();

  const prog = client.programmes?.find(p => p.is_active);
  // Parse TOUS les programmes du client (actif + archivés) pour résoudre
  // ex_key → vrai nom d'exo, même pour des séances loggées sous un ancien
  // programme. Si conflit de slug entre 2 programmes (rare : même nom), le
  // plus récent (celui parsé en dernier) gagne — c'est ok, l'archivé sera
  // moins consulté. Fallback "Exercice N" si pas de match.
  // Resolution des noms d'exos = double clé : programme_name (de session_logs)
  // + indices "wX_sY_eZ" extraits de ex_key. Les ex_key cloud ont le préfixe
  // "client_<uuid>__" qui n'aide pas à identifier le programme : c'est le
  // session_logs.programme_name qui désambiguise quand un client a eu
  // plusieurs programmes successifs avec des indices recyclés.
  const exNamesByProg = React.useMemo(() => {
    if (!Array.isArray(programmesContent) || programmesContent.length === 0) return {};
    const out = {};
    // Archivés d'abord, actif en dernier → si 2 programmes ont le même nom
    // (renommage/dup), l'actif gagne sur l'archivé.
    const sorted = [...programmesContent].sort((a, b) => (a.is_active ? 1 : 0) - (b.is_active ? 1 : 0));
    for (const p of sorted) {
      if (!p?.html_content || !p.programme_name) continue;
      try {
        const parsed = parseProgrammeHTML(p.html_content);
        const sub = {};
        (parsed?.weeks || []).forEach((w, wi) => {
          (w.sessions || []).forEach((s, si) => {
            (s.exercises || []).forEach((e, ei) => {
              sub[`w${wi}_s${si}_e${ei}`] = e.name;
            });
          });
        });
        out[p.programme_name] = sub;
        if (p.is_active) out.__active__ = sub; // fallback si session.programme_name absent
      } catch { /* prog corrompu, on continue */ }
    }
    return out;
  }, [programmesContent]);
  // Helper : résout (session, ex_key) → vrai nom d'exo, ou null si introuvable
  const resolveExName = React.useCallback((session, exKey) => {
    if (!exKey) return null;
    const m = String(exKey).match(/_(w\d+_s\d+_e\d+)$/);
    if (!m) return null;
    const idx = m[1];
    const byProg = exNamesByProg[session?.programme_name];
    if (byProg && byProg[idx]) return byProg[idx];
    // Fallback : programme actif (utile pour sessions sans programme_name)
    return exNamesByProg.__active__?.[idx] || null;
  }, [exNamesByProg]);
  const logs = client._logs || [];
  const weights = client._weights || [];
  const lastWeight = weights[0];
  const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
  const weekLogs = logs.filter(l => new Date(l.logged_at) >= weekAgo);
  const firstName = client.full_name?.split(" ")[0] || t("cp.fallback_this_client");
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
    // Exercise logs recents (pour afficher les poids souleves par seance).
    // sets est jsonb (migration 046) — détail set-par-set quand dispo,
    // sinon NULL pour les vieilles lignes pré-046 et on retombe sur weight/reps.
    supabase.from("exercise_logs").select("logged_at,ex_key,weight,reps,sets")
      .eq("client_id", client.id).order("logged_at", { ascending: false }).limit(100)
      .then(({ data }) => setExLogs(data || []));
    // Historique poids complet (TOUS depuis le debut de l'abonnement)
    supabase.from("weight_logs").select("date,weight,note").eq("client_id", client.id)
      .order("date", { ascending: false }).limit(500)
      .then(({ data }) => setAllWeights(data || []));
    // Charge le HTML de tous les programmes du client pour résoudre les
    // ex_key (programme__w0_s0_e2) en vrais noms ("Squat", "Leg Press") dans
    // la modale détail séance — même pour des sessions loggées sous d'anciens
    // programmes archivés.
    supabase.from("programmes")
      .select("id, programme_name, html_content, is_active")
      .eq("client_id", client.id)
      .then(({ data }) => setProgrammesContent(data || []));
  }, [client.id, d7str]);

  // ===== REALTIME : refetch ciblé quand le client agit (séance, set, pesée) =====
  // Le coach voit live l'activité du client en cours de visualisation. Un set
  // logué = la modal détail séance se met à jour si elle est ouverte. Pas
  // intrusif : juste les listes qui se rafraichissent en place.
  useEffect(() => {
    if (!client?.id) return;
    const refetchSessions = () => {
      supabase.from("session_logs").select("*")
        .eq("client_id", client.id).order("logged_at", { ascending: false }).limit(20)
        .then(({ data }) => setSessions(data || []));
    };
    const refetchExLogs = () => {
      supabase.from("exercise_logs").select("logged_at,ex_key,weight,reps,sets")
        .eq("client_id", client.id).order("logged_at", { ascending: false }).limit(100)
        .then(({ data }) => setExLogs(data || []));
    };
    const refetchWeights = () => {
      supabase.from("weight_logs").select("date,weight,note").eq("client_id", client.id)
        .order("date", { ascending: false }).limit(500)
        .then(({ data }) => setAllWeights(data || []));
    };
    let ch;
    try {
      ch = supabase.channel(`client-live-${client.id}`)
        .on("postgres_changes", {
          event: "*", schema: "public", table: "session_logs",
          filter: `client_id=eq.${client.id}`,
        }, refetchSessions)
        .on("postgres_changes", {
          event: "*", schema: "public", table: "exercise_logs",
          filter: `client_id=eq.${client.id}`,
        }, refetchExLogs)
        .on("postgres_changes", {
          event: "*", schema: "public", table: "weight_logs",
          filter: `client_id=eq.${client.id}`,
        }, refetchWeights)
        .subscribe();
    } catch { /* realtime peut etre desactive */ }
    return () => { if (ch) supabase.removeChannel(ch); };
  }, [client?.id]);

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

  const RPE_LABELS = ["", t("cp.rpe_easy"), t("cp.rpe_correct"), t("cp.rpe_hard"), t("cp.rpe_very_hard"), t("cp.rpe_exhausting")];
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
    {/* Modal de confirmation suppression programme — z-index très haut */}
    {confirmDelete && (
      <ConfirmDeleteProgramme
        progName={confirmDelete.progName}
        onCancel={() => setConfirmDelete(null)}
        onConfirm={async () => {
          const progId = confirmDelete.progId;
          setConfirmDelete(null);
          // Reset les completions de séance liées à ce client (sinon elles
          // ressortiront avec le prochain programme uploadé sur les mêmes index).
          if (client?.id) {
            await supabase.from('session_completions').delete().eq('client_id', client.id);
          }
          const { error } = await supabase.from('programmes').delete().eq('id', progId);
          if (error) { console.error(error); toast.error("Erreur : " + error.message); return; }
          toast.success("Programme supprimé");
          onClose();
        }}
      />
    )}

    {/* Programme Builder plein ecran — z-index > demo banner (9999).
        Sur mobile (<768px), App.css force left:0 via .coach-overlay-panel. */}
    {showBuilder && (
      <div className="coach-overlay-panel" style={{ position: "fixed", top: 0, right: 0, bottom: 0, left: 220, zIndex: 10000 }}>
        <ProgrammeBuilder
          client={client}
          coachData={null}
          onClose={() => { setShowBuilder(false); setBuilderEditing(null); }}
          onSaved={() => { setShowBuilder(false); setBuilderEditing(null); onClose(); }}
          onWantInvoice={onWantInvoice}
          existingProgramme={builderEditing}
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

        <input ref={fileRef} type="file" accept=".html,.htm" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) { onUpload(client, f, uploadPlanId, uploadProgWeeks); e.target.value = ""; } }} />

        {/* ===== HERO CLIENT (bouton retour integre, pas de topbar sticky) ===== */}
        <div style={{ padding: "28px 0 0", marginBottom: 28, animation: "cpFadeUp 0.4s ease both" }}>
          {/* Ligne retour — integre dans safe-area top + offset demo banner */}
          <div style={{ paddingTop: isDemo ? "calc(44px + 8px)" : "env(safe-area-inset-top, 8px)" }}>
            <button
              onClick={onClose}
              style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 8, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", marginBottom: 14, transition: "all .15s" }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(0,201,167,0.3)"; e.currentTarget.style.color = "#fff"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; e.currentTarget.style.color = "rgba(255,255,255,0.5)"; }}
            >
              <Icon name="arrow-left" size={13} />
              {t("cp.back")}
            </button>
          </div>

          {/* Identite + statut */}
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 14 }}>
            <Avatar name={client.full_name || client.email} size={60} active={!!prog} src={client.avatar_url} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <h1 style={{ fontSize: "clamp(28px, 7vw, 36px)", fontWeight: 800, letterSpacing: "-0.05em", color: "#fff", margin: 0, lineHeight: 0.95, wordBreak: "break-word" }}>
                {client.full_name || <span style={{ color: "rgba(255,255,255,0.35)" }}>{t("cp.no_name")}</span>}
              </h1>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", marginTop: 8 }}>{client.email}</div>
            </div>
            <button
              onClick={() => { try { haptic.light(); } catch(_) {} setShowAIAnalyze(true); }}
              title={t("cp.tooltip_analyze")}
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
              {t("cp.btn_analyze")}
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
                  const name = client.full_name?.split(" ")[0] || t("cp.fallback_champion");
                  const ok = await sendManualPush(client.id, t("cp.relance_msg").replace("{name}", name));
                  if (ok) toast.success(t("cp.toast_notif_sent").replace("{name}", name));
                  else toast.error(t("cp.toast_notif_no_perm").replace("{name}", name));
                }}
                style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "rgba(255,107,107,0.08)", border: "1px solid rgba(255,107,107,0.2)", borderRadius: 100, padding: "5px 12px", fontSize: 11, fontWeight: 700, color: RED, cursor: "pointer", fontFamily: "inherit" }}
              >
                <Icon name="alert" size={11} />
                {t("cp.btn_relance_one").replace("{n}", client._inactiveDays)}
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

        {/* ===== TAB BAR INTERNE — scroll horizontal sur mobile ===== */}
        <div
          className="cp-tabbar"
          style={{
            display: "flex", gap: 0, marginBottom: 24,
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            animation: "cpFadeUp 0.3s ease 0.05s both",
            overflowX: "auto",
            overflowY: "hidden",
            scrollbarWidth: "none",
            msOverflowStyle: "none",
            WebkitOverflowScrolling: "touch",
            scrollSnapType: "x proximity",
          }}
        >
          <style>{`.cp-tabbar::-webkit-scrollbar{display:none}`}</style>
          {[
            { id: "resume", label: t("coach.tab_resume") },
            { id: "programme", label: t("coach.tab_programme") },
            { id: "nutrition", label: t("coach.tab_nutrition") },
            { id: "supplements", label: t("coach.tab_supplements") },
            { id: "suivi", label: t("coach.tab_followup") },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={(e) => {
                setPanelTab(tab.id);
                try { e.currentTarget.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" }); } catch(_) {}
              }}
              style={{
                padding: "12px 18px",
                fontSize: 12, fontWeight: panelTab === tab.id ? 700 : 500,
                color: panelTab === tab.id ? "#fff" : "rgba(255,255,255,0.3)",
                background: "none", border: "none", cursor: "pointer",
                borderBottom: panelTab === tab.id ? "2px solid #00C9A7" : "2px solid transparent",
                fontFamily: "inherit", letterSpacing: ".02em",
                transition: "color .2s, border-color .2s",
                flexShrink: 0,
                whiteSpace: "nowrap",
                scrollSnapAlign: "center",
              }}
            >{tab.label}</button>
          ))}
        </div>

        {/* ===== TAB: RESUME ===== */}
        {panelTab === "resume" && (<>

        {/* ===== STATS RAPIDES (une ligne — sans pesees ni pas, deja dans leurs cards) ===== */}
        <div style={{ ...section, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10, animation: "cpFadeUp 0.4s ease 0.08s both" }}>
          {[
            { l: t("cp.stat_sessions"), v: Math.ceil(logs.length / 3) || 0, ic: "activity", c: G },
            { l: t("cp.stat_this_week"), v: weekLogs.length, ic: "flame", c: weekLogs.length > 0 ? G : "rgba(255,255,255,0.4)" },
            { l: t("cp.stat_avg_rpe"), v: rpeData.length ? (rpeData.reduce((a, r) => a + r.rpe, 0) / rpeData.length).toFixed(1) : "--", ic: "trending", c: "rgba(255,255,255,0.5)" },
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
            {t("cp.programme_section_title")}
          </div>
          {prog ? (() => {
            const subStart = client.subscription_start_date ? new Date(client.subscription_start_date) : null;
            const subEnd = client.subscription_end_date ? new Date(client.subscription_end_date) : null;
            const daysLeft = subEnd ? Math.ceil((subEnd - Date.now()) / 86400000) : null;
            const isExpiring = daysLeft !== null && daysLeft <= 14 && daysLeft > 0;
            const isExpired = daysLeft !== null && daysLeft <= 0;
            const subColor = isExpired ? RED : isExpiring ? (daysLeft <= 7 ? RED : ORANGE) : G;
            const planLabel = client._plan_name || { "3m": "3 Mois", "6m": "6 Mois", "12m": "12 Mois" }[client.subscription_plan] || client.subscription_plan || t("cp.plan_undefined");

            return (
              <div style={card}>
                {/* Programme actif */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: subStart ? 14 : 0 }}>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: "#fff", letterSpacing: "-0.03em" }}>{prog.programme_name}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: G, marginTop: 4, fontWeight: 600 }}>
                      <Icon name="check" size={12} />
                      {fillTpl(t("cp.active_since"), { date: new Date(prog.uploaded_at).toLocaleDateString(intlLocale(), { day: "numeric", month: "long" }) })}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      onClick={async () => {
                        try {
                          const { data, error } = await supabase
                            .from("programmes")
                            .select("id, programme_name, html_content, start_date, training_days")
                            .eq("id", prog.id)
                            .maybeSingle();
                          if (error || !data) { toast.error("Impossible de charger le programme"); return; }
                          setBuilderEditing(data);
                          setShowBuilder(true);
                        } catch (e) { toast.error("Erreur : " + e.message); }
                      }}
                      style={{ fontSize: 10, fontWeight: 700, color: G, background: "rgba(2,209,186,0.08)", border: "1px solid rgba(2,209,186,0.25)", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontFamily: "inherit" }}
                    >Éditer</button>
                    <button
                      onClick={() => setConfirmDelete({ progId: prog.id, progName: prog.programme_name })}
                      style={{ fontSize: 10, fontWeight: 700, color: RED, background: "rgba(255,107,107,0.06)", border: "1px solid rgba(255,107,107,0.2)", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontFamily: "inherit" }}
                    >{t("cp.btn_suppr")}</button>
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
                      {subStart.toLocaleDateString(intlLocale(), { day: "numeric", month: "short" })} → {subEnd?.toLocaleDateString(intlLocale(), { day: "numeric", month: "short", year: "numeric" })}
                    </div>
                    {daysLeft !== null && (
                      <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, fontWeight: 700, color: subColor }}>
                        {isExpired ? t("cp.expired_short") : fillTpl(t("cp.days_remaining"), { n: daysLeft })}
                      </div>
                    )}
                  </div>
                )}

                {/* Bouton facture (ouvre la modale, pas de PDF direct) */}
                {subStart && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onWantInvoice?.(client); }}
                    style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, color: "rgba(255,255,255,0.5)", fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
                  >
                    <Icon name="document" size={12} />
                    {t("cp.btn_generate_invoice")}
                  </button>
                )}

                {/* Alerte expiration */}
                {isExpiring && !isExpired && (
                  <div style={{ marginTop: 10, padding: "8px 12px", background: daysLeft <= 7 ? "rgba(255,107,107,0.08)" : "rgba(0,201,167,0.06)", border: `1px solid ${daysLeft <= 7 ? "rgba(255,107,107,0.2)" : "rgba(0,201,167,0.2)"}`, borderRadius: 10, display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, color: daysLeft <= 7 ? RED : ORANGE }}>
                    <Icon name="alert" size={12} />
                    {fillTpl(daysLeft <= 7 ? t("cp.expiring_warn_strong") : t("cp.expiring_warn"), { n: daysLeft })}
                  </div>
                )}
                {isExpired && (
                  <div style={{ marginTop: 10, padding: "8px 12px", background: "rgba(255,107,107,0.08)", border: "1px solid rgba(255,107,107,0.25)", borderRadius: 10, display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, color: RED }}>
                    <Icon name="alert" size={12} />
                    {t("cp.expired_warn")}
                  </div>
                )}
              </div>
            );
          })() : (
            <div style={{ ...card, background: "rgba(0,201,167,0.04)", border: "1px solid rgba(0,201,167,0.2)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: ORANGE, fontWeight: 700, marginBottom: 14 }}>
                <Icon name="alert" size={14} />
                {t("cp.no_programme_assigned")}
              </div>

              {/* Abonnement : seulement si pas encore defini (premier upload) */}
              {!client.subscription_start_date && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", marginBottom: 8 }}>{t("cp.subscription_label")}</div>
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
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", marginBottom: 8 }}>{t("cp.programme_duration")}</div>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  {[4, 6, 8, 10, 12].map(w => {
                    const on = uploadProgWeeks === w;
                    return (
                      <button key={w} onClick={() => setUploadProgWeeks(w)} style={{
                        padding: "7px 12px", borderRadius: 100, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                        background: on ? "rgba(0,201,167,0.12)" : "rgba(255,255,255,0.03)",
                        border: `1px solid ${on ? "rgba(0,201,167,0.3)" : "rgba(255,255,255,0.08)"}`,
                        color: on ? VIOLET : "rgba(255,255,255,0.4)",
                      }}>{fillTpl(t("cp.weeks_short"), { n: w })}</button>
                    );
                  })}
                  <input
                    type="number"
                    value={uploadProgWeeks}
                    onChange={e => setUploadProgWeeks(Math.max(1, parseInt(e.target.value) || 6))}
                    style={{ width: 50, padding: "7px 8px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, color: "#fff", fontFamily: "'JetBrains Mono',monospace", fontSize: 12, fontWeight: 700, textAlign: "center", outline: "none" }}
                  />
                  <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>{t("cp.weeks_unit")}</span>
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button onClick={() => setShowBuilder(true)} style={{ flex: "1 1 140px", padding: 12, background: "linear-gradient(135deg, #c0392b, #a93226)", border: "none", borderRadius: 10, color: "#fff", fontSize: 12, fontWeight: 800, cursor: "pointer", textTransform: "uppercase", letterSpacing: "0.5px", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: "0 6px 20px rgba(192,57,43,0.3)" }}>
                  <Icon name="document" size={14} />
                  {t("cp.btn_create_programme")}
                </button>
                <button onClick={() => fileRef.current?.click()} style={{ flex: "1 1 140px", padding: 12, background: `linear-gradient(135deg, ${G}, #0891b2)`, border: "none", borderRadius: 10, color: "#000", fontSize: 12, fontWeight: 800, cursor: "pointer", textTransform: "uppercase", letterSpacing: "0.5px", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: "0 6px 20px rgba(2,209,186,0.25)" }}>
                  <Icon name="upload" size={14} />
                  {t("cp.btn_upload_html")}
                </button>
                <button onClick={() => onWantInvoice?.(client)} style={{ flex: "1 1 140px", padding: 12, background: "linear-gradient(135deg, #a78bfa, #7c3aed)", border: "none", borderRadius: 10, color: "#fff", fontSize: 12, fontWeight: 800, cursor: "pointer", textTransform: "uppercase", letterSpacing: "0.5px", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: "0 6px 20px rgba(167,139,250,0.3)" }}>
                  <Icon name="document" size={14} />
                  {t("cp.btn_generate_invoice")}
                </button>
                <button onClick={async () => {
                  if (!client?.email) return;
                  const btn = "Renvoyer email de bienvenue";
                  try {
                    const { data: { session } } = await supabase.auth.getSession();
                    const jwt = session?.access_token;
                    const r = await fetch("/api/send-welcome", {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                        ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
                      },
                      body: JSON.stringify({ email: client.email, full_name: client.full_name || null }),
                    });
                    if (r.ok) {
                      toast.success(`Email de bienvenue envoyé à ${client.email}`);
                    } else {
                      const data = await r.json().catch(() => ({}));
                      toast.error(`${btn} : ÉCHEC (${r.status} ${data.reason || data.error || ""})`);
                    }
                  } catch (e) {
                    toast.error(`${btn} : ${e.message}`);
                  }
                }} style={{ flex: "1 1 140px", padding: 12, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(2,209,186,0.25)", borderRadius: 10, color: G, fontSize: 12, fontWeight: 700, cursor: "pointer", textTransform: "uppercase", letterSpacing: "0.5px", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  <Icon name="message" size={14} />
                  Renvoyer email
                </button>
                <button onClick={() => setShowPrevalidate(v => !v)} style={{ flex: "1 1 140px", padding: 12, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, color: "rgba(255,255,255,0.75)", fontSize: 12, fontWeight: 700, cursor: "pointer", textTransform: "uppercase", letterSpacing: "0.5px", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  <Icon name="check" size={14} />
                  Pré-valider séance
                </button>
              </div>
              {showPrevalidate && (
                <div style={{ marginTop: 12, padding: 14, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.55)", lineHeight: 1.5 }}>
                    Marque une séance comme déjà faite. Tu peux préciser la date/heure réelle (utile si le client l'a faite avant d'avoir accès à l'app).
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <label style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", display: "flex", alignItems: "center", gap: 6 }}>
                      Semaine
                      <input type="number" min="1" value={prevalidWeek} onChange={e => setPrevalidWeek(Math.max(1, parseInt(e.target.value) || 1))} style={{ width: 56, padding: "6px 8px", background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, color: "#fff", fontSize: 12, fontFamily: "inherit", textAlign: "center" }} />
                    </label>
                    <label style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", display: "flex", alignItems: "center", gap: 6 }}>
                      Séance
                      <input type="number" min="1" value={prevalidSession} onChange={e => setPrevalidSession(Math.max(1, parseInt(e.target.value) || 1))} style={{ width: 56, padding: "6px 8px", background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, color: "#fff", fontSize: 12, fontFamily: "inherit", textAlign: "center" }} />
                    </label>
                    <label style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", display: "flex", alignItems: "center", gap: 6 }}>
                      Le
                      <input type="datetime-local" value={prevalidWhen} onChange={e => setPrevalidWhen(e.target.value)} style={{ padding: "6px 8px", background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, color: "#fff", fontSize: 11, fontFamily: "inherit" }} />
                    </label>
                    <button onClick={async () => {
                      if (!client?.id) return;
                      const wIdx = Math.max(0, (parseInt(prevalidWeek) || 1) - 1);
                      const sIdx = Math.max(0, (parseInt(prevalidSession) || 1) - 1);
                      const payload = {
                        client_id: client.id, week_idx: wIdx, session_idx: sIdx,
                        chrono_seconds: 0,
                      };
                      if (prevalidWhen) {
                        // datetime-local renvoie "YYYY-MM-DDTHH:mm" sans timezone
                        // → on le considère comme local et le convertit en ISO UTC
                        const dt = new Date(prevalidWhen);
                        if (!isNaN(dt.getTime())) payload.validated_at = dt.toISOString();
                      }
                      const { error } = await supabase.from("session_completions").upsert(payload, { onConflict: "client_id,week_idx,session_idx" });
                      if (error) toast.error("Erreur : " + error.message);
                      else {
                        const whenLabel = prevalidWhen ? ` (${new Date(prevalidWhen).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })})` : "";
                        toast.success(`Séance S${prevalidWeek}/${prevalidSession} pré-validée${whenLabel}`);
                        setShowPrevalidate(false);
                        setPrevalidWhen("");
                      }
                    }} style={{ padding: "8px 16px", background: G, color: "#000", border: "none", borderRadius: 8, fontSize: 11, fontWeight: 800, cursor: "pointer", letterSpacing: "0.5px", textTransform: "uppercase", fontFamily: "inherit" }}>
                      Valider
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* CALENDRIER PROGRAMME ACTIF */}
          {prog && <ProgrammeCalendarSection programmeId={prog.id} clientId={client.id} />}

          {/* HISTORIQUE PROGRAMMES — affiché si plus de 1 programme dans l'historique */}
          <ProgrammesHistorySection client={client} onEdit={async (progId) => {
            try {
              const { data, error } = await supabase.from("programmes").select("id, programme_name, html_content").eq("id", progId).maybeSingle();
              if (error || !data) { toast.error("Impossible de charger ce programme"); return; }
              setBuilderEditing(data); setShowBuilder(true);
            } catch (e) { toast.error("Erreur : " + e.message); }
          }} onReuse={async (progId) => {
            // Re-applique un programme passé : copy html, désactive l'actuel, insert nouveau
            if (!window.confirm("Réutiliser ce programme ? Il deviendra actif et le programme courant sera désactivé.")) return;
            try {
              const { data: src } = await supabase.from("programmes").select("programme_name, html_content").eq("id", progId).maybeSingle();
              if (!src) return;
              await supabase.from("programmes").update({ is_active: false }).eq("client_id", client.id);
              const userResp = await supabase.auth.getUser();
              const { error } = await supabase.from("programmes").insert({
                client_id: client.id,
                programme_name: src.programme_name,
                html_content: src.html_content,
                is_active: true,
                uploaded_by: userResp?.data?.user?.email || null,
              });
              if (error) throw error;
              toast.success("Programme réutilisé");
              onClose();
            } catch (e) { toast.error("Erreur : " + e.message); }
          }} />
        </div>

        {/* ===== POIDS + SPARKLINE ===== */}
        <div style={{ ...section, animation: "cpFadeUp 0.4s ease 0.16s both" }}>
          <div style={sectionTitle}>
            <Icon name="trending" size={14} color={G} />
            {t("cp.weight_section_title")}
          </div>
          {lastWeight ? (
            <div onClick={() => setDrawer("poids")} style={{ ...card, display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", transition: "border-color 0.2s" }}>
              <div>
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 28, fontWeight: 200, color: "#fff", letterSpacing: "-1px" }}>
                  {lastWeight.weight}<span style={{ fontSize: 14, color: "rgba(255,255,255,0.4)", marginLeft: 4 }}>kg</span>
                </div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 4 }}>
                  {new Date(lastWeight.date).toLocaleDateString(intlLocale(), { weekday: "long", day: "numeric", month: "long" })}
                </div>
                {weights.length >= 2 && (() => {
                  const d = lastWeight.weight - weights[weights.length-1].weight;
                  const sign = d > 0 ? "+" : "";
                  return (
                    <div style={{ fontSize: 11, color: weights[weights.length-1].weight > lastWeight.weight ? RED : G, fontWeight: 700, marginTop: 4 }}>
                      {fillTpl(t("cp.weight_delta_since_start"), { delta: `${sign}${d.toFixed(1)}` })}
                    </div>
                  );
                })()}
              </div>
              {weights.length >= 2 && <MiniSparkline data={[...weights].reverse()} color={G} w={120} h={40} />}
            </div>
          ) : (
            <div style={{ ...card, fontSize: 12, color: "rgba(255,255,255,0.35)", textAlign: "center", padding: "18px 12px" }}>
              {t("cp.no_weights")}
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
            {t("cp.nutrition_7d_title")}
          </div>
          {nutDays.length === 0 ? (
            <div style={{ ...card, fontSize: 12, color: "rgba(255,255,255,0.35)", textAlign: "center", padding: "18px 12px" }}>
              {t("cp.no_nutrition_week")}
            </div>
          ) : (() => {
            // Construire les 7 derniers jours avec placeholders si pas de log
            const today0 = new Date(); today0.setHours(0, 0, 0, 0);
            const msDay = 86400000;
            const dataMap = Object.fromEntries(nutDays);
            const last7 = Array.from({ length: 7 }).map((_, i) => {
              const date = new Date(today0.getTime() - (6 - i) * msDay);
              const key = date.toISOString().slice(0, 10);
              const d = dataMap[key];
              return { date, key, d, isToday: i === 6 };
            });
            const goalKcal = nutGoals?.calories || 2000;
            const maxKcalLocal = Math.max(goalKcal * 0.6, ...last7.map(x => x.d?.kcal || 0));
            const loggedCount = last7.filter(x => x.d).length;
            // Moyenne sur les jours réellement loggés (sinon zéro fausse la lecture)
            const logged = last7.filter(x => x.d);
            const avg = logged.reduce((acc, x) => ({
              kcal: acc.kcal + x.d.kcal,
              prot: acc.prot + x.d.prot,
              gluc: acc.gluc + x.d.gluc,
              lip: acc.lip + x.d.lip,
            }), { kcal: 0, prot: 0, gluc: 0, lip: 0 });
            const n = Math.max(1, logged.length);
            return (
              <div style={{ ...card, padding: "18px 18px 20px" }}>
                {/* Header : compliance loggée */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 14 }}>
                  <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", letterSpacing: "1.5px", textTransform: "uppercase", fontWeight: 700 }}>
                    Objectif {goalKcal} kcal · {loggedCount}/7 jours loggés
                  </div>
                </div>

                {/* Barres de kcal par jour avec ligne d'objectif */}
                <div style={{ position: "relative", height: 110, marginBottom: 18, display: "flex", gap: 4, alignItems: "flex-end", paddingTop: 16 }}>
                  {/* Ligne objectif (en pointillés) */}
                  {(() => {
                    const goalPct = Math.min(95, (goalKcal / maxKcalLocal) * 100);
                    return (
                      <div style={{
                        position: "absolute",
                        left: 0, right: 0,
                        bottom: `calc(${goalPct}% + 16px)`,
                        height: 1,
                        background: "repeating-linear-gradient(to right, rgba(255,255,255,0.18) 0 4px, transparent 4px 8px)",
                        pointerEvents: "none",
                      }} />
                    );
                  })()}
                  {last7.map((x, i) => {
                    const labels = ["L", "M", "M", "J", "V", "S", "D"];
                    const dow = (x.date.getDay() + 6) % 7;
                    const dayLabel = labels[dow];
                    if (!x.d) {
                      return (
                        <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", gap: 6, height: "100%" }}>
                          <div style={{ width: "100%", height: 4, background: "rgba(255,255,255,0.04)", borderRadius: 2 }} />
                          <div style={{ fontSize: 9, color: x.isToday ? G : "rgba(255,255,255,0.25)", fontWeight: 700, letterSpacing: "0.5px" }}>{dayLabel}</div>
                          <div style={{ fontSize: 7, color: "rgba(255,255,255,0.18)", letterSpacing: "0.3px" }}>—</div>
                        </div>
                      );
                    }
                    const pct = Math.max(6, (x.d.kcal / maxKcalLocal) * 100);
                    const overGoal = x.d.kcal > goalKcal * 1.1;
                    const underGoal = x.d.kcal < goalKcal * 0.7;
                    const barColor = overGoal ? ORANGE : underGoal ? "#f97316" : G;
                    return (
                      <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", gap: 6, height: "100%" }}>
                        <div style={{
                          width: "100%",
                          height: `${pct}%`,
                          minHeight: 6,
                          background: `linear-gradient(to top, ${barColor}30, ${barColor})`,
                          borderRadius: 4,
                          position: "relative",
                          boxShadow: x.isToday ? `0 0 12px ${barColor}40` : "none",
                        }} />
                        <div style={{ fontSize: 9, color: x.isToday ? G : "rgba(255,255,255,0.4)", fontWeight: 700, letterSpacing: "0.5px" }}>{dayLabel}</div>
                        <div style={{ fontSize: 9, color: barColor, fontFamily: "'JetBrains Mono',monospace", fontWeight: 700 }}>{x.d.kcal}</div>
                      </div>
                    );
                  })}
                </div>

                {/* Macros moyenne — grid 4 colonnes avec dots couleur */}
                <div style={{
                  display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8,
                  paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.05)",
                }}>
                  {[
                    { l: "Kcal/j", v: Math.round(avg.kcal / n), u: "", c: ORANGE },
                    { l: "Protéines", v: Math.round(avg.prot / n), u: "g", c: G },
                    { l: "Glucides", v: Math.round(avg.gluc / n), u: "g", c: "#60a5fa" },
                    { l: "Lipides", v: Math.round(avg.lip / n), u: "g", c: VIOLET },
                  ].map((m, i) => (
                    <div key={i} style={{
                      padding: "10px 8px",
                      background: `${m.c}08`,
                      border: `1px solid ${m.c}1F`,
                      borderRadius: 10,
                      display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                    }}>
                      <div style={{ width: 5, height: 5, borderRadius: "50%", background: m.c, marginBottom: 2 }} />
                      <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 18, fontWeight: 800, color: "#fff", letterSpacing: "-0.5px", lineHeight: 1 }}>
                        {m.v}<span style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.4)", marginLeft: 1 }}>{m.u}</span>
                      </div>
                      <div style={{ fontSize: 9, color: "rgba(255,255,255,0.45)", letterSpacing: "0.5px", textTransform: "uppercase", fontWeight: 700 }}>{m.l}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>

        {/* ===== ACTIVITE QUOTIDIENNE 7J (pas, eau, sommeil) ===== */}
        <div style={{ ...section, animation: "cpFadeUp 0.4s ease 0.2s both" }}>
          <div style={sectionTitle}>
            <Icon name="activity" size={14} color={G} />
            {t("cp.activity_7d_title")}
          </div>
          {daily7d.length === 0 ? (
            <div style={{ ...card, fontSize: 12, color: "rgba(255,255,255,0.35)", textAlign: "center", padding: "18px 12px" }}>
              {t("cp.no_activity_week")}
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10 }}>
              {/* Pas — cliquable */}
              <div onClick={() => setDrawer("pas")} style={{ ...card, cursor: "pointer", transition: "border-color 0.2s" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <div>
                    <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase", color: G }}>{t("cp.daily_steps")}</div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const v = window.prompt(t("cp.prompt_steps_goal"), String(nutGoals?.pas || 8000));
                        if (v && !isNaN(parseInt(v))) {
                          const newGoal = parseInt(v);
                          setNutGoals(prev => ({ ...prev, pas: newGoal }));
                          supabase.from("nutrition_goals").upsert({ client_id: client.id, ...nutGoals, pas: newGoal }, { onConflict: "client_id" });
                        }
                      }}
                      style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 9, color: "rgba(255,255,255,0.35)", marginTop: 2, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", padding: 0 }}
                    >
                      {fillTpl(t("cp.steps_goal_label"), { n: (nutGoals?.pas || 8000).toLocaleString(intlLocale()) })}
                      <Icon name="view" size={9} color="rgba(255,255,255,0.25)" />
                    </button>
                  </div>
                  <Icon name="arrow-right" size={12} color="rgba(255,255,255,0.2)" />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {daily7d.slice(-7).map((d, i) => {
                    const stepsGoal = nutGoals?.pas || 8000;
                    const pct = Math.min(100, Math.round(((d.pas || 0) / stepsGoal) * 100));
                    const dayLabel = new Date(d.date + "T12:00:00").toLocaleDateString(intlLocale(), { weekday: "short", day: "numeric" });
                    return (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ fontSize: 9, color: "rgba(255,255,255,0.35)", width: 50, flexShrink: 0, textTransform: "capitalize" }}>{dayLabel}</div>
                        <div style={{ flex: 1, height: 6, background: "rgba(255,255,255,0.04)", borderRadius: 3, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: pct + "%", background: pct >= 100 ? G : ORANGE, borderRadius: 3, transition: "width 0.3s" }} />
                        </div>
                        <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, fontWeight: 700, color: pct >= 100 ? G : "rgba(255,255,255,0.5)", width: 45, textAlign: "right" }}>{(d.pas || 0).toLocaleString(intlLocale())}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
              {/* Card Eau — cliquable, ouvre drawer complet */}
              <div onClick={() => setDrawer("eau")} style={{ ...card, cursor: "pointer", transition: "border-color 0.2s" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase", color: "#38bdf8" }}>{t("cp.hydration")}</div>
                  <Icon name="arrow-right" size={12} color="rgba(255,255,255,0.2)" />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {daily7d.slice(-7).map((d, i) => {
                    const dayLabel = new Date(d.date + "T12:00:00").toLocaleDateString(intlLocale(), { weekday: "short", day: "numeric" });
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
                  <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase", color: VIOLET }}>{t("cp.sleep")}</div>
                  <Icon name="arrow-right" size={12} color="rgba(255,255,255,0.2)" />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {daily7d.slice(-7).map((d, i) => {
                    const dayLabel = new Date(d.date + "T12:00:00").toLocaleDateString(intlLocale(), { weekday: "short", day: "numeric" });
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
        {(() => {
          // Dedupe : si le client a valide la meme seance plusieurs fois le
          // meme jour (test, double-click, etc.), on garde seulement le 1er
          // log par (date + session_name). Le compteur du titre utilise
          // la liste dedupee pour ne pas afficher "(7)" quand seule 1 carte
          // distincte sera rendue.
          const seen = new Set();
          const dedupedSessions = sessions.filter((s) => {
            const dateStr = new Date(s.logged_at).toISOString().split("T")[0];
            const key = `${dateStr}__${s.session_name || s.programme_name || "—"}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });
          return (
        <div style={{ ...section, animation: "cpFadeUp 0.4s ease 0.22s both" }}>
          <div style={sectionTitle}>
            <Icon name="flame" size={14} color={G} />
            {t("cp.session_history_title")}{dedupedSessions.length > 0 ? ` (${dedupedSessions.length})` : ""}
          </div>
          {dedupedSessions.length === 0 ? (
            <div style={{ ...card, fontSize: 12, color: "rgba(255,255,255,0.35)", textAlign: "center", padding: "18px 12px" }}>
              {t("cp.no_sessions")}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {dedupedSessions.slice(0, 12).map((s, i) => {
                const date = new Date(s.logged_at);
                const dateStr = date.toISOString().split("T")[0];
                const durationMin = s.duration_seconds ? Math.round(s.duration_seconds / 60) : null;
                // Exercices de cette seance (meme jour)
                const dayExs = exLogs.filter(e => e.logged_at && e.logged_at.startsWith(dateStr));
                // Grouper par exercice et prendre le max poids. Le label
                // privilégie le vrai nom (parsé depuis le programme), sinon
                // fallback "Exercice N".
                const exSummary = {};
                dayExs.forEach(e => {
                  const name = resolveExName(s, e.ex_key) || prettyExName(e.ex_key);
                  if (!exSummary[name] || (Number(e.weight) || 0) > exSummary[name].w) {
                    exSummary[name] = { w: Number(e.weight) || 0, r: e.reps, s: e.sets };
                  }
                });
                const topExos = Object.entries(exSummary).sort((a, b) => b[1].w - a[1].w).slice(0, 4);

                return (
                  <div
                    key={i}
                    onClick={() => setSessionDetail({ session: s, dayExs, resolveExName, allExLogs: exLogs })}
                    style={{ ...card, padding: "14px 16px", cursor: "pointer", transition: "background .12s, border-color .12s" }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(2,209,186,0.04)"; e.currentTarget.style.borderColor = "rgba(2,209,186,0.18)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = card.background || "rgba(255,255,255,0.02)"; e.currentTarget.style.borderColor = card.border ? card.border.split(" ").slice(2).join(" ") : "rgba(255,255,255,0.05)"; }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: topExos.length > 0 ? 10 : 0 }}>
                      <div style={{ width: 38, height: 38, borderRadius: 12, background: G_DIM, border: `1px solid ${G_BORDER}`, display: "flex", alignItems: "center", justifyContent: "center", color: G, flexShrink: 0 }}>
                        <Icon name="check" size={15} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {s.session_name || s.programme_name || t("cp.session_fallback")}
                        </div>
                        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", marginTop: 2 }}>
                          {date.toLocaleDateString(intlLocale(), { weekday: "short", day: "numeric", month: "short" })}
                          {durationMin != null && <span> · {fillTpl(t("cp.minutes_short"), { n: durationMin })}</span>}
                          {s.exercises_count > 0 && <span> · {fillTpl(t("cp.exos_count"), { n: s.exercises_count })}</span>}
                          <span> · {dayExs.length > 0 ? `${dayExs.length} sets` : "Aucun set"}</span>
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                        {durationMin != null && (
                          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 15, fontWeight: 200, color: G }}>
                            {durationMin}<span style={{ fontSize: 9, color: "rgba(255,255,255,0.3)" }}>min</span>
                          </div>
                        )}
                        <Icon name="arrow-right" size={14} color="rgba(255,255,255,0.3)" />
                      </div>
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
                            <span style={{ color: "rgba(255,255,255,0.5)", fontWeight: 600 }}>{name}</span>
                            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, color: G }}>{fmtKg(d.w)}kg</span>
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
          );
        })()}

        {/* (historique poids complet supprime : accessible via le drawer sur la card poids) */}

        {/* ===== PROGRESSION — SECTION UNIFIEE PREMIUM ===== */}
        <div style={{ ...section, animation: "cpFadeUp 0.4s ease 0.2s both" }}>
          <div style={sectionTitle}>
            <Icon name="chart" size={14} color={G} />
            {t("cp.progression_title")}
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
                  <div style={{ fontSize: 8, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "1.5px", marginTop: 6, fontWeight: 700 }}>{t("cp.streak_days")}</div>
                </div>
                <div style={{ ...card, textAlign: "center", padding: "14px 8px" }}>
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 28, fontWeight: 200, color: "#fff", lineHeight: 1 }}>{totalSessions}</div>
                  <div style={{ fontSize: 8, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "1.5px", marginTop: 6, fontWeight: 700 }}>{t("cp.total_sessions")}</div>
                </div>
                <div style={{ ...card, textAlign: "center", padding: "14px 8px" }}>
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 28, fontWeight: 200, color: ORANGE, lineHeight: 1 }}>{avgRpe}</div>
                  <div style={{ fontSize: 8, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "1.5px", marginTop: 6, fontWeight: 700 }}>{t("cp.avg_rpe")}</div>
                </div>
              </div>
            );
          })()}

          {/* Timeline seances + RPE combine */}
          {sessions.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: 10 }}>{t("cp.timeline_sessions")}</div>
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
                          <div style={{ fontSize: 12, fontWeight: 700, color: "#fff" }}>{s.session_name || t("cp.session_fallback")}</div>
                          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", marginTop: 2 }}>
                            {date.toLocaleDateString(intlLocale(), { weekday: "short", day: "numeric", month: "short" })}
                            {durationMin != null && <span> · {fillTpl(t("cp.minutes_short"), { n: durationMin })}</span>}
                            {s.exercises_count > 0 && <span> · {fillTpl(t("cp.exos_count"), { n: s.exercises_count })}</span>}
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
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: 10 }}>{t("cp.rpe_evolution")}</div>
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

          {/* Top exercices avec sparkline — clic ouvre la progression complète */}
          {topEx.length > 0 && (
            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: 10 }}>{t("cp.top_exercises")}</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 10 }}>
                {topEx.map(([key, data], i) => {
                  // resolveExName prend une session ; ici on n'en a pas, donc on
                  // tape directement le map du programme actif via __active__.
                  const idxMatch = String(key).match(/_(w\d+_s\d+_e\d+)$/);
                  const idx = idxMatch ? idxMatch[1] : null;
                  const name = (idx && exNamesByProg.__active__?.[idx]) || prettyExName(key);
                  const latest = data[data.length - 1];
                  const first = data[0];
                  const delta = latest.weight - first.weight;
                  const max = Math.max(...data.map(d => d.weight));
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setExProgression({ exKey: key, exName: name })}
                      style={{ ...card, cursor: "pointer", textAlign: "left", color: "inherit", font: "inherit", width: "100%" }}
                      title="Voir la progression complète"
                    >
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</div>
                          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)" }}>{fillTpl(t("cp.exercise_summary"), { n: data.length, max })}</div>
                        </div>
                        <div style={{ fontSize: 12, fontWeight: 800, color: delta >= 0 ? G : RED, flexShrink: 0, marginLeft: 8 }}>
                          {delta >= 0 ? "+" : ""}{delta.toFixed(1)} kg
                        </div>
                      </div>
                      <MiniSparkline data={data} color={delta >= 0 ? G : RED} w={200} h={32} />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {sessions.length === 0 && topEx.length === 0 && (
            <div style={{ ...card, textAlign: "center", padding: 28, color: "rgba(255,255,255,0.3)", fontSize: 13 }}>
              {t("cp.no_progression")}
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
            {t("cp.nutrition_goals_title")}
          </div>
          {!nutGoals ? (
            <div style={{ ...card, fontSize: 12, color: "rgba(255,255,255,0.35)", textAlign: "center", padding: "18px 12px" }}>
              {t("cp.loading_goals")}
            </div>
          ) : (
          <div style={card}>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 14 }}>
                {fillTpl(t("cp.define_goals_for"), { name: firstName })}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {[
                  { key: "calories", label: t("cp.goal_calories"), unit: t("cp.unit_kcal"), min: 500, max: 5000, step: 50, color: ORANGE },
                  { key: "proteines", label: t("cp.goal_proteines"), unit: t("cp.unit_g"), min: 50, max: 400, step: 5, color: G },
                  { key: "glucides", label: t("cp.goal_glucides"), unit: t("cp.unit_g"), min: 50, max: 600, step: 10, color: "#60a5fa" },
                  { key: "lipides", label: t("cp.goal_lipides"), unit: t("cp.unit_g"), min: 20, max: 200, step: 5, color: VIOLET },
                  { key: "eau_ml", label: t("cp.goal_eau"), unit: t("cp.unit_ml"), min: 500, max: 5000, step: 250, color: "#38bdf8" },
                  { key: "pas", label: t("cp.goal_pas"), unit: t("cp.unit_pas"), min: 2000, max: 20000, step: 500, color: "#34d399" },
                ].map(({ key, label, unit, min, max, step, color }) => (
                  <div key={key}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", fontWeight: 600 }}>{label}</div>
                      <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, color, fontWeight: 700 }}>{nutGoals[key]?.toLocaleString(intlLocale())} {unit}</div>
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
                  if (error) toast.error(t("cp.toast_goals_save_error"));
                  else { haptic.success(); toast.success(t("cp.toast_goals_saved")); }
                }}
                style={{ width: "100%", padding: 14, background: `linear-gradient(135deg, ${G}, #0891b2)`, color: "#000", border: "none", borderRadius: 12, fontSize: 13, fontWeight: 800, cursor: "pointer", marginTop: 16, textTransform: "uppercase", letterSpacing: "0.5px", fontFamily: "inherit", boxShadow: "0 8px 24px rgba(2,209,186,0.25)" }}
              >
                {nutSaving ? (<span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}><Spinner variant="dots" size={16} color="#000" />{t("cp.btn_saving")}</span>) : t("cp.btn_save_goals")}
              </button>
            </div>
          )}
        </div>

        </>)}

        {/* ===== TAB: SUPPLEMENTS ===== */}
        {panelTab === "supplements" && (
          <CoachSupplementsPanel clientId={client.id} />
        )}

        {/* ===== TAB: SUIVI ===== */}
        {panelTab === "suivi" && (<>

        {/* ===== NIVEAU CLIENT AUTO ===== */}
        {(() => {
          const sessCount = sessions.length;
          const avgWeight = logs.length > 0 ? logs.reduce((s, l) => s + (l.weight || 0), 0) / logs.length : 0;
          const level = sessCount >= 50 || avgWeight >= 80 ? { name: t("cp.level_advanced"), color: G, icon: "trending" }
            : sessCount >= 15 || avgWeight >= 40 ? { name: t("cp.level_intermediate"), color: ORANGE, icon: "flame" }
            : { name: t("cp.level_beginner"), color: VIOLET, icon: "activity" };
          return (
            <div style={{ ...section, animation: "cpFadeUp 0.4s ease 0.3s both" }}>
              <div style={sectionTitle}>
                <Icon name="users" size={14} color={G} />
                {t("cp.athlete_profile")}
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <div style={{ ...card, flex: 1, minWidth: 140, display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: `${level.color}15`, border: `1px solid ${level.color}30`, display: "flex", alignItems: "center", justifyContent: "center", color: level.color }}>
                    <Icon name={level.icon} size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: level.color }}>{level.name}</div>
                    <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)" }}>{fillTpl(t("cp.athlete_summary"), { sessions: sessCount, weight: Math.round(avgWeight) })}</div>
                  </div>
                </div>
                <div style={{ ...card, flex: 1, minWidth: 140, textAlign: "center" }}>
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 24, fontWeight: 200, color: "#fff" }}>{sessCount}</div>
                  <div style={{ fontSize: 8, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "1px", marginTop: 4, fontWeight: 700 }}>{t("cp.sessions_since_start")}</div>
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
              <div style={{ fontSize: 13, fontWeight: 800, color: "#fff", marginBottom: 2 }}>{t("cp.see_transformation")}</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", lineHeight: 1.4 }}>{t("cp.see_transformation_sub")}</div>
            </div>
            <Icon name="arrow-right" size={14} color="rgba(255,255,255,0.4)" />
          </button>
        </div>

        {/* ===== TAGS CRM ===== */}
        <div style={{ ...section, animation: "cpFadeUp 0.4s ease 0.28s both" }}>
          <div style={sectionTitle}>
            <Icon name="lightning" size={14} color={G} />
            {t("cp.tags_title")}
            <span style={{ fontSize: 8, color: "rgba(255,255,255,0.25)", fontWeight: 600, letterSpacing: "1px", marginLeft: "auto" }}>{t("cp.tags_filter_hint")}</span>
          </div>
          <div style={card}>
            <TagManager client={client} onUpdate={(newTags) => { client.tags = newTags; }} />
          </div>
        </div>

        {/* ===== TIMELINE ACTIVITY ===== */}
        <div style={{ ...section, animation: "cpFadeUp 0.4s ease 0.30s both" }}>
          <div style={sectionTitle}>
            <Icon name="activity" size={14} color={G} />
            {t("cp.timeline_title")}
          </div>
          <div style={{ ...card, padding: "18px 18px 14px" }}>
            <ActivityTimeline clientId={client.id} coachId={coachId} />
          </div>
        </div>

        {/* ===== NOTES COACH (internes, invisibles par le client) ===== */}
        <div style={{ ...section, animation: "cpFadeUp 0.4s ease 0.32s both" }}>
          <div style={sectionTitle}>
            <Icon name="document" size={14} color={G} />
            {t("cp.notes_title")}
            <span style={{ fontSize: 8, color: "rgba(255,255,255,0.25)", fontWeight: 600, letterSpacing: "1px", marginLeft: "auto" }}>{t("cp.notes_invisible_hint")}</span>
          </div>
          <div style={card}>
            {/* Input nouvelle note */}
            <div style={{ display: "flex", gap: 8, marginBottom: coachNotes.length > 0 ? 14 : 0 }}>
              <textarea
                value={newNote}
                onChange={e => setNewNote(e.target.value)}
                placeholder={fillTpl(t("cp.note_placeholder"), { name: firstName })}
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
                  if (error) { toast.error(t("cp.toast_note_save_error")); return; }
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
                        {new Date(n.created_at).toLocaleDateString(intlLocale(), { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </div>
                      <button
                        onClick={async () => {
                          await supabase.from("coach_notes").delete().eq("id", n.id);
                          setCoachNotes(prev => prev.filter(x => x.id !== n.id));
                        }}
                        style={{ background: "none", border: "none", color: "rgba(255,255,255,0.15)", fontSize: 10, cursor: "pointer", padding: 0, fontFamily: "inherit" }}
                      >
                        {t("cp.note_delete")}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {coachNotes.length === 0 && !newNote && (
              <div style={{ textAlign: "center", padding: 16, color: "rgba(255,255,255,0.25)", fontSize: 12 }}>
                {t("cp.notes_empty")}
              </div>
            )}
          </div>
        </div>

        {/* ===== MESSAGES ===== */}
        <div style={{ ...section, animation: "cpFadeUp 0.4s ease 0.32s both" }}>
          <div style={sectionTitle}>
            <Icon name="message" size={14} color={G} />
            {t("cp.messages_title")}
          </div>
          <div style={card}>
            <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
              <textarea
                value={msgText}
                onChange={e => setMsgText(e.target.value)}
                placeholder={fillTpl(t("cp.message_placeholder"), { name: firstName })}
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
                      <span>{m.from_coach ? t("cp.you") : firstName}</span>
                      <span>{m.read ? t("cp.read") : t("cp.unread")} · {new Date(m.created_at).toLocaleTimeString(intlLocale(), { hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {messages.length === 0 && (
              <div style={{ textAlign: "center", padding: 20, color: "rgba(255,255,255,0.3)", fontSize: 12 }}>
                {t("cp.messages_empty")}
              </div>
            )}
          </div>
        </div>

        {/* ===== SEANCE VIVANTE ===== */}
        <div style={{ ...section, animation: "cpFadeUp 0.4s ease 0.36s both" }}>
          <div style={sectionTitle}>
            <Icon name="lightning" size={14} color={G} />
            {t("cp.live_session_title")}
          </div>
          <div style={card}>
            <SeanceVivanteCoach clientId={client.id} clientName={client.full_name} isDemo={isDemo} />
          </div>
        </div>

        {/* ===== PAIEMENTS REÇUS ===== */}
        <div style={{ ...section, animation: "cpFadeUp 0.4s ease 0.38s both" }}>
          <div style={sectionTitle}>
            <Icon name="check" size={14} color={G} />
            Paiements reçus
          </div>
          <div style={{ ...card, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 180 }}>
              {lastPayment ? (() => {
                const today = new Date().toISOString().slice(0, 10);
                const expired = lastPayment.period_end < today;
                const fmt = (d) => new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
                return (
                  <>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginBottom: 4, letterSpacing: 0.5 }}>Dernier paiement</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: "#fff", marginBottom: 2 }}>
                      {parseFloat(lastPayment.amount_eur).toFixed(0)} € · {fmt(lastPayment.received_date)}
                    </div>
                    <div style={{ fontSize: 11, color: expired ? "#ff6b6b" : G, fontWeight: 600 }}>
                      {expired ? `⚠ Période dépassée depuis le ${fmt(lastPayment.period_end)}` : `✓ Couvre jusqu'au ${fmt(lastPayment.period_end)}`}
                    </div>
                  </>
                );
              })() : (
                <>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginBottom: 4, letterSpacing: 0.5 }}>Statut</div>
                  <div style={{ fontSize: 13, color: "rgba(255,255,255,0.65)", lineHeight: 1.5 }}>
                    Aucun paiement loggé pour ce client.
                  </div>
                </>
              )}
            </div>
            <button
              onClick={() => setShowPaymentModal(true)}
              style={{ padding: "10px 16px", background: `${G}15`, border: `1px solid ${G}40`, borderRadius: 100, color: G, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", letterSpacing: 0.3, whiteSpace: "nowrap" }}
            >
              + Logger un paiement
            </button>
          </div>
        </div>

        {/* ===== ZONE DANGEREUSE ===== */}
        <div style={{ ...section, animation: "cpFadeUp 0.4s ease 0.4s both", paddingTop: 20, borderTop: "1px solid rgba(255,107,107,0.1)" }}>
          <button
            onClick={() => { if (window.confirm(fillTpl(t("cp.confirm_delete_client"), { name: client.full_name || client.email }))) onDelete(client.id, client.email); }}
            style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: "rgba(255,107,107,0.5)", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", padding: 0 }}
          >
            <Icon name="trash" size={12} />
            {t("cp.btn_delete_client")}
          </button>
        </div>

        {/* Hook B : modal logger paiement (déclenché par bouton ci-dessus) */}
        <LogPaymentModal
          open={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          clientId={client?.id}
          clientName={client?.full_name}
          coachId={coachId}
          defaultAmount={300}
          onSaved={reloadLastPayment}
        />

        </>)}

      </div>

      {/* Détail séance : monté hors panelTab pour rester accessible quel que
          soit l'onglet actif (sinon ouvert depuis "programme" mais rendu sous
          "suivi" → la modal n'apparait jamais). */}
      {sessionDetail && (
        <SessionDetailModal
          data={sessionDetail}
          onClose={() => setSessionDetail(null)}
          onShowProgression={({ exKey, exName }) => setExProgression({ exKey, exName })}
        />
      )}

      {/* Modal progression d'un exo : ouvert depuis le clic sur un nom d'exo
          dans SessionDetailModal. z-index plus élevé pour passer au-dessus. */}
      {exProgression && (
        <ExerciseProgressionModal
          data={{ ...exProgression, allExLogs: exLogs }}
          onClose={() => setExProgression(null)}
        />
      )}

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
          style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(0,0,0,0.85)", WebkitBackdropFilter: "blur(16px)", backdropFilter: "blur(16px)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}
        >
          <div style={{ width: "100%", maxWidth: 560, maxHeight: "85vh", background: "#0a0a0a", borderRadius: "24px 24px 0 0", border: "1px solid rgba(255,255,255,0.08)", borderBottom: "none", display: "flex", flexDirection: "column", overflow: "hidden", animation: "cpFadeUp 0.3s ease both" }}>
            {/* Handle */}
            <div style={{ width: 36, height: 4, background: "rgba(255,255,255,0.12)", borderRadius: 2, margin: "10px auto 0" }} />
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 22px 12px" }}>
              <div style={{ fontSize: 17, fontWeight: 800, color: "#fff", letterSpacing: "-0.3px" }}>
                {drawer === "poids" ? t("cp.drawer_weight_title") : drawer === "eau" ? t("cp.drawer_water_title") : drawer === "pas" ? t("cp.drawer_steps_title") : t("cp.drawer_sleep_title")}
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
                          <div style={{ fontSize: 8, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "1px", marginTop: 4, fontWeight: 700 }}>{t("cp.drawer_current")}</div>
                        </div>
                        <div style={{ textAlign: "center" }}>
                          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 20, fontWeight: 200, color: delta > 0 ? ORANGE : delta < 0 ? G : "rgba(255,255,255,0.5)" }}>
                            {delta > 0 ? "+" : ""}{delta.toFixed(1)}
                          </div>
                          <div style={{ fontSize: 8, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "1px", marginTop: 4, fontWeight: 700 }}>{t("cp.drawer_delta")}</div>
                        </div>
                        <div style={{ textAlign: "center" }}>
                          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 20, fontWeight: 200, color: G }}>{minW}</div>
                          <div style={{ fontSize: 8, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "1px", marginTop: 4, fontWeight: 700 }}>{t("cp.drawer_min")}</div>
                        </div>
                        <div style={{ textAlign: "center" }}>
                          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 20, fontWeight: 200, color: ORANGE }}>{maxW}</div>
                          <div style={{ fontSize: 8, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "1px", marginTop: 4, fontWeight: 700 }}>{t("cp.drawer_max")}</div>
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
                      {fillTpl(t("cp.drawer_period_range"), {
                        n: allWeights.length,
                        from: new Date(allWeights[allWeights.length - 1].date).toLocaleDateString(intlLocale(), { day: "numeric", month: "long", year: "numeric" }),
                        to: new Date(allWeights[0].date).toLocaleDateString(intlLocale(), { day: "numeric", month: "long", year: "numeric" }),
                      })}
                    </div>
                  )}

                  {/* Liste des pesees */}
                  <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: 8 }}>{t("cp.drawer_all_weighins")}</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {allWeights.map((w, i) => {
                      const prev = allWeights[i + 1];
                      const diff = prev ? w.weight - prev.weight : null;
                      return (
                        <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 12px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.03)", borderRadius: 8 }}>
                          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)" }}>
                            {new Date(w.date).toLocaleDateString(intlLocale(), { weekday: "short", day: "numeric", month: "short" })}
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
                        <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 24, fontWeight: 200, color: G }}>{avg.toLocaleString(intlLocale())}</div>
                        <div style={{ fontSize: 8, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "1px", marginTop: 4, fontWeight: 700 }}>{t("cp.drawer_avg_per_day")}</div>
                      </div>
                      <div style={{ textAlign: "center", padding: 12, background: daysAtGoal > 0 ? G_DIM : "rgba(255,255,255,0.02)", border: `1px solid ${daysAtGoal > 0 ? G_BORDER : "rgba(255,255,255,0.05)"}`, borderRadius: 12 }}>
                        <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 24, fontWeight: 200, color: daysAtGoal > 0 ? G : "rgba(255,255,255,0.4)" }}>{daysAtGoal}</div>
                        <div style={{ fontSize: 8, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "1px", marginTop: 4, fontWeight: 700 }}>{t("cp.drawer_days_at_goal")}</div>
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
                            <span style={{ color: "rgba(255,255,255,0.4)" }}>{new Date(d.date + "T12:00:00").toLocaleDateString(intlLocale(), { weekday: "short", day: "numeric", month: "short" })}</span>
                            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, color: atGoal ? G : "rgba(255,255,255,0.5)" }}>{d.pas.toLocaleString(intlLocale())}</span>
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
                      <span style={{ fontSize: 14, color: "rgba(255,255,255,0.35)", marginLeft: 4 }}>{t("cp.drawer_water_avg_unit")}</span>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 6 }}>{fillTpl(t("cp.drawer_water_avg_sub"), { n: data.length })}</div>
                    </div>
                    {graphData.length >= 2 && (
                      <div style={{ marginBottom: 20, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 14, padding: "16px 8px 8px" }}>
                        <LineGraph data={graphData} color="#38bdf8" height={180} unit="L" valueKey="value" />
                      </div>
                    )}
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      {data.slice(-14).reverse().map((d, i) => (
                        <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", background: "rgba(255,255,255,0.02)", borderRadius: 8, fontSize: 12 }}>
                          <span style={{ color: "rgba(255,255,255,0.4)" }}>{new Date(d.date + "T12:00:00").toLocaleDateString(intlLocale(), { weekday: "short", day: "numeric", month: "short" })}</span>
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
                        <div style={{ fontSize: 8, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "1px", marginTop: 4, fontWeight: 700 }}>{t("cp.drawer_sleep_h")}</div>
                      </div>
                      <div style={{ textAlign: "center", padding: 12, background: under7 > 0 ? "rgba(255,107,107,0.06)" : "rgba(255,255,255,0.02)", border: `1px solid ${under7 > 0 ? "rgba(255,107,107,0.15)" : "rgba(255,255,255,0.05)"}`, borderRadius: 12 }}>
                        <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 28, fontWeight: 200, color: under7 > 0 ? RED : G }}>{under7}</div>
                        <div style={{ fontSize: 8, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "1px", marginTop: 4, fontWeight: 700 }}>{t("cp.drawer_sleep_under")}</div>
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
                            <span style={{ color: "rgba(255,255,255,0.4)" }}>{new Date(d.date + "T12:00:00").toLocaleDateString(intlLocale(), { weekday: "short", day: "numeric", month: "short" })}</span>
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
  const t = useT();
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
        .maybeSingle();
      if (data?.active) setIsLive(true);
      else setIsLive(false);
    };
    check();
    const interval = setInterval(check, 10000);
    return () => clearInterval(interval);
  }, [clientId, isDemo, demoLive]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Priorite absolue mp4 pour compatibilite iOS Safari (Chrome sur Mac
      // ne supporte PAS mp4 en MediaRecorder → on tombe sur webm/opus, que
      // iOS Safari ne sait PAS décoder. Warning explicite au coach.)
      let mimeType = "audio/webm";
      let mp4Supported = false;
      if (MediaRecorder.isTypeSupported("audio/mp4")) { mimeType = "audio/mp4"; mp4Supported = true; }
      else if (MediaRecorder.isTypeSupported("audio/mp4;codecs=avc1")) { mimeType = "audio/mp4;codecs=avc1"; mp4Supported = true; }
      else if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) mimeType = "audio/webm;codecs=opus";
      // Note : pas de warning ici — on transcode en MP3 client-side après
      // l'enregistrement (cf. sendMessage), donc tous les codecs marchent.
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
      toast.error(tStatic("cp.toast_mic_unavailable"));
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
      // Transcode webm/mp4 → MP3 client-side via lamejs : MP3 lit nativement
      // partout (iOS Safari inclus), donc plus besoin que le coach utilise
      // Safari pour enregistrer.
      let mp3Blob;
      try {
        const lamejs = (await import("lamejs")).default || (await import("lamejs"));
        const arrayBuffer = await audioBlob.arrayBuffer();
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
        const samples = audioBuffer.getChannelData(0); // mono
        const sampleRate = audioBuffer.sampleRate;
        // Float32 (-1..1) → Int16 PCM
        const pcm = new Int16Array(samples.length);
        for (let i = 0; i < samples.length; i++) {
          pcm[i] = Math.max(-1, Math.min(1, samples[i])) * 32767;
        }
        const Mp3Encoder = lamejs.Mp3Encoder || lamejs.default?.Mp3Encoder;
        const encoder = new Mp3Encoder(1, sampleRate, 96); // mono, 96kbps
        const blockSize = 1152;
        const mp3Chunks = [];
        for (let i = 0; i < pcm.length; i += blockSize) {
          const chunk = pcm.subarray(i, i + blockSize);
          const enc = encoder.encodeBuffer(chunk);
          if (enc.length > 0) mp3Chunks.push(enc);
        }
        const tail = encoder.flush();
        if (tail.length > 0) mp3Chunks.push(tail);
        mp3Blob = new Blob(mp3Chunks, { type: "audio/mpeg" });
      } catch (e) {
        console.warn("[flash audio] MP3 transcoding failed, fallback to original:", e);
        mp3Blob = audioBlob;
      }

      const ext = mp3Blob.type === "audio/mpeg" ? "mp3" : ((audioBlob.type || "").includes("mp4") ? "m4a" : "webm");
      const fileName = `flash_${clientId}_${Date.now()}.${ext}`;
      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from("audio-messages")
        .upload(fileName, mp3Blob, { contentType: mp3Blob.type });
      if (uploadErr) {
        console.error("[flash audio upload] FAILED:", uploadErr.message, uploadErr);
        toast.error("Upload vocal échoué : " + (uploadErr.message || "voir console"));
      }
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
          {isLive ? fillTpl(t("sv.in_session"), { name: clientName?.split(" ")[0] || "" }) : t("sv.not_in_session")}
        </div>
        {demoLive && (
          <div style={{ marginLeft: "auto", fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: "#02d1ba", fontWeight: 500 }}>{fillTpl(t("sv.duration_min"), { n: 23 })}</div>
        )}
      </div>

      {/* ===== DEMO: feed live simule pour Marc Dubois ===== */}
      {demoLive && (
        <div style={{ marginBottom: 16, padding: "14px 16px", background: "rgba(2,209,186,.03)", border: ".5px solid rgba(2,209,186,.15)", borderRadius: 12 }}>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: ".2em", textTransform: "uppercase", color: "rgba(2,209,186,.65)", marginBottom: 10 }}>
            {t("sv.exercise_in_progress")}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
            <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 900, color: "#fff", letterSpacing: "-.5px" }}>{demoLive.current_exercise}</div>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: "rgba(255,255,255,.55)" }}>
              {fillTpl(t("sv.set_of"), { set: demoLive.current_set, total: demoLive.total_sets })} · <span style={{ color: "#02d1ba" }}>{demoLive.current_weight}kg</span>
            </div>
          </div>
          <div style={{ height: 3, background: "rgba(255,255,255,.06)", borderRadius: 100, overflow: "hidden", marginBottom: 14 }}>
            <div style={{ height: "100%", width: `${Math.round(((demoLive.current_set - 1) / demoLive.total_sets) * 100)}%`, background: "#02d1ba", boxShadow: "0 0 8px rgba(2,209,186,.5)" }} />
          </div>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: ".2em", textTransform: "uppercase", color: "rgba(255,255,255,.3)", marginBottom: 8 }}>{t("sv.live_feed")}</div>
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

      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginBottom: 12 }}>{t("sv.flash_msg_hint")}</div>

      <textarea value={text} onChange={e => setText(e.target.value)} placeholder={t("sv.flash_placeholder")} maxLength={80}
        style={{ width: "100%", padding: "12px 14px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, color: "#fff", fontSize: 14, outline: "none", fontFamily: "'DM Sans',-apple-system,sans-serif", resize: "none", height: 80, boxSizing: "border-box", marginBottom: 12 }} />

      <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
        <button onClick={recording ? stopRecording : startRecording} style={{ flex: 1, padding: 12, background: recording ? "rgba(255,107,107,0.1)" : "rgba(255,255,255,0.05)", border: `1px solid ${recording ? "rgba(255,107,107,0.3)" : "rgba(255,255,255,0.1)"}`, borderRadius: 12, color: recording ? "#ff6b6b" : "rgba(255,255,255,0.5)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
          {recording ? t("sv.btn_recording") : t("sv.btn_record")}
        </button>
        {audioBlob && <div style={{ padding: "12px 14px", background: "rgba(2,209,186,0.08)", border: "1px solid rgba(2,209,186,0.2)", borderRadius: 12, fontSize: 11, color: "#02d1ba" }}>{t("sv.audio_ready")}</div>}
      </div>

      <button onClick={sendMessage} disabled={sending || (!text.trim() && !audioBlob)} style={{ width: "100%", padding: 14, background: sent ? "rgba(2,209,186,0.1)" : "#02d1ba", color: sent ? "#02d1ba" : "#000", border: sent ? "1px solid rgba(2,209,186,0.3)" : "none", borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
        {sent ? t("sv.msg_sent") : sending ? (<span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}><Spinner variant="dots" size={16} color="#000" />{t("sv.btn_sending")}</span>) : t("sv.btn_send_flash")}
      </button>
    </div>
  );
}

export function CoachDashboard({ coachId, coachData, onExit, onSwitchToSuperAdmin, isDemo = false }) {
  const t = useT();
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
  const [showMonCompte, setShowMonCompte] = useState(false);
  const [monCompteInitialTab, setMonCompteInitialTab] = useState(null);
  const [showSentinel, setShowSentinel] = useState(false);
  const [showSentinelTeaser, setShowSentinelTeaser] = useState(false);
  const [showInvoice, setShowInvoice] = useState(false);
  const [invoicePreselect, setInvoicePreselect] = useState(null);
  const [duplicateProgramme, setDuplicateProgramme] = useState(null);
  const [showCmdK, setShowCmdK] = useState(false);

  // Couleur d'accent personnalisee par coach (lue depuis coaches.accent_color,
  // configuree dans onboarding + Settings). Fallback sur G (vert RB Perform)
  // si pas encore choisie.
  const accent = coachData?.accent_color || G;
  // Expose comme CSS var pour les composants enfants qui veulent l'utiliser
  // via var(--coach-accent) dans leurs inline styles.
  useEffect(() => {
    document.documentElement.style.setProperty('--coach-accent', accent);
  }, [accent]);

  // Sentinel gating: Pro/Elite/Founding ont accès. Free voit le teaser.
  const SENTINEL_PLANS = ["pro", "elite", "founding"];
  const sentinelEnabled = true; // launch SaaS — plus derrière flag
  const isFoundingCoach = coachData?.founding_coach === true || coachData?.subscription_plan === "founding";
  const hasSentinelAccess = isFoundingCoach || SENTINEL_PLANS.includes(coachData?.subscription_plan);
  const [activeTab, setActiveTab] = useState("overview");
  const [pillVisible, setPillVisible] = useState(true);
  const [showCoachHome, setShowCoachHome] = useState(true);
  const homeScreenDismissed = useRef(false);
  const { plans: coachPlans } = useCoachPlans(coachId);
  // Souscription push notifs coach : auto-subscribe si la permission est
  // déjà accordée (sinon on attend une CTA explicite). Notifie sur PR
  // client + autres events futurs.
  usePushNotifications({ coachId });

  // Deep-link: /dashboard/mon-compte?tab=abonnement (retour Stripe Customer Portal)
  // ou /app.html?view=mon-compte&tab=... → ouvre MonCompte sur l'onglet demandé.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const wantsMonCompte =
      window.location.pathname === "/dashboard/mon-compte" ||
      params.get("view") === "mon-compte";
    if (wantsMonCompte) {
      const tab = params.get("tab");
      if (tab) setMonCompteInitialTab(tab);
      setShowMonCompte(true);
    }
  }, []);

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
  const [toastMsg,  setToastMsg]  = useState(null);
  const [selected,  setSelected]  = useState(null);
  const [filter,    setFilter]    = useState("all");

  const showToast = (msg, type = "ok") => { setToastMsg({ msg, type }); setTimeout(() => setToastMsg(null), 3000); };

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
        // _lastActivity = max(log seance, pesee, derniere connexion auth)
        const candidates = [logs?.[0]?.logged_at, weights?.[0]?.date, c.last_seen_at].filter(Boolean);
        const lastActivity = candidates.length > 0
          ? candidates.reduce((a, b) => new Date(a) > new Date(b) ? a : b)
          : null;
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
  // Auto-refresh clients toutes les 60s pour tracking activite en temps reel.
  // Suspendu quand l'onglet est inactif (battery + bandwidth + Supabase quota).
  useEffect(() => {
    let iv = null;
    const start = () => {
      if (iv) return;
      iv = setInterval(() => { loadClients(); }, 60000);
    };
    const stop = () => {
      if (iv) { clearInterval(iv); iv = null; }
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") start();
      else stop();
    };
    if (document.visibilityState === "visible") start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  // ===== REALTIME : push live updates au coach quand ses clients agissent =====
  // Le polling 60s reste comme filet de sécurité, mais Supabase Realtime
  // donne une visibilité instantanée. Debounce 1s : si un burst arrive
  // (ex: 5 sets en 10s), on fait UN refetch au lieu de 5.
  const realtimeRefreshTimer = useRef(null);
  useEffect(() => {
    if (!coachId) return;
    const scheduleRefresh = () => {
      if (realtimeRefreshTimer.current) clearTimeout(realtimeRefreshTimer.current);
      realtimeRefreshTimer.current = setTimeout(() => loadClients(), 1000);
    };
    let ch;
    try {
      ch = supabase.channel(`coach-live-${coachId}`)
        // Activity log filtré par ce coach (PR clients, alertes inactivité…)
        .on("postgres_changes", {
          event: "INSERT", schema: "public", table: "coach_activity_log",
          filter: `coach_id=eq.${coachId}`,
        }, scheduleRefresh)
        // Clients du coach : nouveau, désabonnement, status change
        .on("postgres_changes", {
          event: "*", schema: "public", table: "clients",
          filter: `coach_id=eq.${coachId}`,
        }, scheduleRefresh)
        // Session_logs / exercise_logs (sans filtre coach_id qui n'existe pas
        // sur ces tables) : RLS bloquera ce qui ne nous concerne pas. Le
        // refresh global recompute les stats de chaque client.
        .on("postgres_changes", {
          event: "INSERT", schema: "public", table: "session_logs",
        }, scheduleRefresh)
        .subscribe();
    } catch { /* realtime peut être désactivé sur certaines tables */ }
    return () => {
      if (realtimeRefreshTimer.current) clearTimeout(realtimeRefreshTimer.current);
      if (ch) supabase.removeChannel(ch);
    };
  }, [coachId]);


  // Pull-to-refresh mobile (desactive pendant les overlays full-screen)
  const ptr = usePullToRefresh({
    onRefresh: async () => { haptic.success(); await loadClients(); },
    disabled: showClientList || !!selected || showPipeline || showAnalytics || showMonCompte || showCmdK,
  });

  // Systeme de relance automatique (push notifs aux clients inactifs / abos expirants)
  const { sent: relanceSent, sendManualPush } = useClientRelance(clients, true);

  const addClient = async () => {
    if (isDemo) { toast.error(t("cd.toast_demo_disabled")); return; }
    if (!newEmail) return;
    const email = newEmail.trim().toLowerCase();
    const fullName = newName.trim() || null;
    // Multi-tenant : lie le nouveau client au coach connecte
    const insertData = { email, full_name: fullName };
    if (coachId) insertData.coach_id = coachId;
    const { error } = await supabase.from("clients").insert(insertData);
    if (error) { showToast(error.code === "23505" ? t("cd.toast_email_used") : error.message, "err"); return; }
    // Crée l'auth.users associé (email_confirm=true, sans password) pour
    // que le client puisse se connecter par OTP du premier coup.
    // Sans ça, signInWithOtp(shouldCreateUser:false) renvoie "Signups not
    // allowed for otp" → "Compte inexistant" cote login.
    try {
      await fetch("/api/auth/check-invitation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
    } catch (e) {
      console.warn("[addClient] auth.users prep failed (non-blocking):", e?.message);
    }
    // Envoyer l'email de bienvenue via Vercel API (Zoho SMTP)
    // Auth Bearer requise — vérifie que coach connecté + recipient est son client
    let welcomeSent = true;
    let welcomeReason = "";
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const jwt = session?.access_token;
      const r = await fetch("/api/send-welcome", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
        },
        body: JSON.stringify({ email, full_name: fullName }),
      });
      if (!r.ok) {
        welcomeSent = false;
        const data = await r.json().catch(() => ({}));
        welcomeReason = `${r.status} ${data.reason || data.error || ""}`.trim();
        console.warn("[send-welcome] échec :", welcomeReason);
      }
    } catch (e) {
      welcomeSent = false;
      welcomeReason = e.message || "network";
      console.warn("Email de bienvenue non envoye:", e);
    }
    if (welcomeSent) {
      showToast(fillTpl(t("cd.toast_added_email"), { email }));
    } else {
      showToast(`${email} ajouté — email de bienvenue ÉCHEC (${welcomeReason}). À envoyer manuellement.`, "err");
    }
    setNewEmail(""); setNewName(""); setShowAdd(false);
    loadClients();
  };

  const deleteClient = async (id, email) => {
    if (isDemo) { toast.error(t("cd.toast_demo_disabled")); return; }
    // confirmation supprimee
    // Multi-tenant : verifie que le coach possede ce client
    let del = supabase.from("clients").delete().eq("id", id);
    if (coachId) del = del.eq("coach_id", coachId);
    await del;
    setSelected(null); showToast(t("cd.toast_client_deleted")); loadClients();
  };

  const deleteProg = async (progId) => {
    const { error } = await supabase.from("programmes").update({ is_active: false }).eq("id", progId);
    if (error) { console.error("deleteProg error:", error); showToast(t("cd.toast_error_prefix") + error.message); return; }
    showToast(t("cd.toast_programme_deleted"));
    onClose();
  };

  const uploadProg = async (client, file, planId, progWeeks) => {
    if (isDemo) { toast.info(t("cd.toast_demo_upload_disabled")); return; }
    // ===== VALIDATION FICHIER =====
    // 1. Taille max 25MB — l'HTML va directement dans programmes.html_content
    // (TEXT Postgres, capacite TOAST ~1GB), donc pas de contrainte storage.
    // 25MB couvre largement les programmes avec images base64 embarquees.
    const MAX_SIZE = 25 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      toast.error(fillTpl(t("cd.toast_file_too_large"), { size: (file.size / 1024 / 1024).toFixed(1) }));
      return;
    }
    // 2. Type verifie (HTML uniquement)
    const isHtml = file.type === "text/html" || file.name.toLowerCase().endsWith(".html") || file.name.toLowerCase().endsWith(".htm");
    if (!isHtml) {
      toast.error(t("cd.toast_only_html"));
      return;
    }

    setUploading(true);
    try {
      let html = await file.text();
      // ===== Sauvegarder les URLs videos AVANT DOMPurify =====
      // Si l'HTML contient des <iframe src="youtube..."> ou <a href="youtube...">
      // pour une démo d'exercice, DOMPurify les supprime (FORBID iframe). Or le
      // parser cherche les vidéos uniquement dans <input id="ev-XXX">. Donc on
      // récupère les URLs avant et on les écrit dans les inputs vides.
      try {
        const _doc = new DOMParser().parseFromString(html, "text/html");
        const isVideoUrl = (u) => /(?:youtube\.com|youtu\.be|vimeo\.com)/i.test(u || "");
        _doc.querySelectorAll(".exercise-item").forEach((exEl) => {
          const eid = (exEl.id || "").replace(/^ex-/, "");
          if (!eid) return;
          const evInput = _doc.getElementById(`ev-${eid}`);
          if (!evInput) return;
          const cur = (evInput.getAttribute("value") || "").trim();
          if (cur) return; // deja rempli, on ne touche pas
          let foundUrl = null;
          // 1. iframe direct
          const iframe = exEl.querySelector("iframe[src]");
          if (iframe && isVideoUrl(iframe.getAttribute("src"))) {
            foundUrl = iframe.getAttribute("src");
          }
          // 2. anchor avec href youtube
          if (!foundUrl) {
            const a = Array.from(exEl.querySelectorAll("a[href]"))
              .find((el) => isVideoUrl(el.getAttribute("href")));
            if (a) foundUrl = a.getAttribute("href");
          }
          if (foundUrl) evInput.setAttribute("value", foundUrl);
        });
        html = "<!DOCTYPE html>\n" + _doc.documentElement.outerHTML;
      } catch (e) {
        console.warn("[upload] video URL extraction failed (non-blocking):", e?.message);
      }

      // 3. Sanitation via DOMPurify : strip <script>, event handlers, javascript:
      //    + tout vecteur XSS connu (svg onload, srcdoc, mutation XSS, etc.).
      //    Le HTML programme est ensuite rendu dans un iframe sandbox="" cote
      //    client — defense en profondeur a 2 niveaux (purify + sandbox).
      const cleanHtml = DOMPurify.sanitize(html, {
        // On garde la majorite des balises pour preserver le markup riche
        // du programme (tableaux, listes, images, liens). DOMPurify retire
        // automatiquement les tags/attributs dangereux.
        ALLOW_DATA_ATTR: true,
        FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form'],
        FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'srcdoc'],
      });
      const removedCount = html.length - cleanHtml.length;
      if (removedCount > 0) {
        console.warn(`[upload] DOMPurify removed ${removedCount} chars (XSS sanitization)`);
      }
      html = cleanHtml;
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

      // Supprimer les anciens programmes (historique non affiche dans l'UI,
      // accumulation = bruit). run_logs.programme_id passe a NULL via FK.
      await supabase.from("programmes").delete().eq("client_id", client.id);

      // Reset les completions de séance de l'ancien programme : sinon les
      // index (week_idx, session_idx) du nouveau programme matchent les
      // anciens et les séances apparaissent comme déjà validées.
      await supabase.from("session_completions").delete().eq("client_id", client.id);

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

      showToast(fillTpl(t("cd.toast_programme_uploaded"), { who: client.full_name || client.email }));
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
  const scoreLabel = businessScore >= 75 ? t("cd.score_excellent") : businessScore >= 50 ? t("cd.score_good") : businessScore >= 25 ? t("cd.score_to_improve") : t("cd.score_critical");

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
  const coachName = coachData?.full_name || t("cd.coach_fallback");
  const coachInitials = (coachName.split(" ").map(w => w[0]).join("").slice(0, 2) || "RB").toUpperCase();
  const coachPlan = coachData?.subscription_plan || t("cd.plan_founder");

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
    { id: "overview",    label: t("coach.nav_dashboard"),  icon: "chart",       group: "principal" },
    { id: "clients",     label: t("coach.nav_clients"),    icon: "users",       group: "principal", badge: urgentCount },
    { id: "programmes",  label: t("coach.nav_programmes"), icon: "document",    group: "principal" },
    { id: "business",    label: t("coach.nav_business"),   icon: "trending",    group: "principal" },
    { id: "analytics",   label: t("coach.nav_analytics"),  icon: "activity",    group: "outils" },
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
      height: "100dvh",
      position: "fixed",
      top: 0,
      left: 0,
      overflow: "hidden",
      padding: "0 12px",
      zIndex: 500,
    }}>
      {/* LOGO — coach branding ou fallback RB Perform */}
      <div style={{ padding: "24px 8px 28px", position: "relative", zIndex: 1, display: "flex", alignItems: "center", gap: 10 }}>
        {coachData?.logo_url ? (
          <img
            src={coachData.logo_url}
            alt={coachData.coaching_name || coachData.brand_name || "Coach"}
            style={{ maxWidth: 140, maxHeight: 36, objectFit: "contain", display: "block" }}
          />
        ) : (
          <div style={{
            fontFamily: "'Syne', sans-serif",
            fontSize: 14, fontWeight: 900,
            letterSpacing: ".1em", color: "#fff",
          }}>
            RB<span style={{ color: accent }}>PERFORM</span>
          </div>
        )}
      </div>

      {/* NAV ITEMS */}
      <div style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1, position: "relative", zIndex: 1 }}>
        {[...navItems, { id: "pipeline", label: t("coach.nav_pipeline"), icon: "view", group: "outils" }].map(n => {
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
            <div style={{ fontSize: 11, color: "rgba(255,255,255,.5)", fontWeight: 600 }}>⚙ {t("cd.settings_label")}</div>
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
  const pillTabs = ["overview", "clients", "programmes", "business"];
  const pillItems = [
    { id: "overview",    icon: "chart",       label: t("coach.nav_home"),       shortLabel: "HOME",    onClick: () => { setSelected(null); setShowClientList(false); setShowSettings(false); setShowAnalytics(false); setShowMonCompte(false); setShowMoreMenu(false); setActiveTab("overview"); } },
    { id: "clients",     icon: "users",       label: t("coach.nav_clients"),    shortLabel: "CLIENTS", onClick: () => { setSelected(null); setShowSettings(false); setShowAnalytics(false); setShowMonCompte(false); setShowMoreMenu(false); setActiveTab("clients"); setShowClientList(true); } },
    { id: "programmes",  icon: "document",    label: t("coach.nav_prog"),       shortLabel: "PROG",    onClick: () => { setSelected(null); setShowClientList(false); setShowSettings(false); setShowAnalytics(false); setShowMonCompte(false); setShowMoreMenu(false); setActiveTab("programmes"); } },
    { id: "business",    icon: "trending",    label: t("coach.nav_business"),   shortLabel: "BIZ",     onClick: () => { setSelected(null); setShowClientList(false); setShowSettings(false); setShowAnalytics(false); setShowMonCompte(false); setShowMoreMenu(false); setActiveTab("business"); } },
    { id: "more",        icon: "plus",        label: t("cd.pill_more"),      shortLabel: t("cd.pill_more_short"),    onClick: () => { setShowMoreMenu(!showMoreMenu); } },
  ];
  // Swipe gesture sur la pill
  const pillSwipeRef = useRef({ startX: 0 });
  const handlePillSwipe = (dir) => {
    const currentIdx = pillTabs.indexOf(activeTab);
    if (currentIdx < 0) return;
    const nextIdx = dir === "left" ? Math.min(currentIdx + 1, pillTabs.length - 1) : Math.max(currentIdx - 1, 0);
    if (nextIdx !== currentIdx) {
      const item = pillItems.find(p => p.id === pillTabs[nextIdx]);
      if (item) item.onClick();
    }
  };
  // Coachmark first-time
  const [pillShowcase, setPillShowcase] = useState(false);
  useEffect(() => {
    if (!localStorage.getItem("coachmark_pill_seen")) {
      setPillShowcase(true);
      localStorage.setItem("coachmark_pill_seen", "1");
      setTimeout(() => setPillShowcase(false), 3000);
    }
  }, []);

  const FloatingPill = (
    <nav className={`coach-floating-pill${pillShowcase ? " pill-showcase" : ""}`}
      onTouchStart={(e) => { pillSwipeRef.current.startX = e.touches[0].clientX; }}
      onTouchEnd={(e) => {
        const dx = e.changedTouches[0].clientX - pillSwipeRef.current.startX;
        if (Math.abs(dx) > 50) handlePillSwipe(dx < 0 ? "left" : "right");
      }}
      style={{
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
      WebkitBackdropFilter: "blur(20px)", backdropFilter: "blur(20px)",
      WebkitBackdropFilter: "blur(20px)",
      transition: "opacity .3s cubic-bezier(.16,1,.3,1), transform .3s cubic-bezier(.16,1,.3,1)",
    }}>
      {pillItems.map((p) => {
        const isActive = (p.id === "more" && (showSettings || showAnalytics || showMonCompte || showMoreMenu)) || (!showSettings && !showAnalytics && !showMonCompte && !showMoreMenu && activeTab === p.id);
        return (
          <button
            key={p.id}
            onClick={() => { try { haptic.selection(); } catch(_) {} p.onClick(); }}
            data-label={p.label}
            aria-label={p.label}
            role="button"
            style={{
              width: 50, height: 50,
              borderRadius: 100, border: "none",
              background: isActive ? G : "transparent",
              color: isActive ? "#000" : "rgba(255,255,255,.35)",
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              cursor: "pointer",
              transition: "all .25s cubic-bezier(.22,1,.36,1)",
              gap: 1,
            }}
          >
            <Icon name={p.icon} size={18} strokeWidth={2.5} color={isActive ? "#000" : "rgba(255,255,255,.35)"} />
            <div className="pill-label" style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.05em", color: isActive ? "#000" : "rgba(255,255,255,0.35)", lineHeight: 1, marginTop: 1 }}>{p.shortLabel}</div>
          </button>
        );
      })}
    </nav>
  );

  // ===== MORE MENU (popup above pill) =====
  const moreMenuItems = [
    ...(sentinelEnabled ? [{
      icon: "lightning", label: t("cd.menu_sentinel"), color: "#818cf8",
      locked: !hasSentinelAccess,
      onClick: () => {
        setShowMoreMenu(false);
        if (hasSentinelAccess) {
          setShowSettings(false); setShowMonCompte(false); setShowAnalytics(false); setShowSentinel(true);
        } else {
          setShowSentinelTeaser(true);
        }
      },
    }] : []),
    { icon: "activity", label: t("cd.menu_analytics"), onClick: () => { setShowMoreMenu(false); setShowSettings(false); setShowMonCompte(false); setShowAnalytics(true); } },
    { icon: "view",     label: t("cd.menu_pipeline"),  onClick: () => { setShowMoreMenu(false); setShowSettings(false); setShowMonCompte(false); setShowAnalytics(false); setShowPipeline(true); } },
    { type: "separator" },
    { icon: "document", label: t("cd.menu_invoice"), onClick: () => { setShowMoreMenu(false); setShowInvoice(true); } },
    { icon: "flame",    label: t("cd.menu_settings"), onClick: () => { setShowMoreMenu(false); setShowAnalytics(false); setShowMonCompte(false); setShowSettings(true); } },
    { icon: "users",    label: t("cd.menu_my_account"), onClick: () => { setShowMoreMenu(false); setShowAnalytics(false); setShowSettings(false); setShowMonCompte(true); } },
    { type: "separator" },
    { icon: "message",  label: t("cd.menu_help"), color: "rgba(255,255,255,0.4)", onClick: () => { setShowMoreMenu(false); toast.success(t("cd.toast_help")); } },
    { icon: "arrow-right", label: t("cd.menu_logout"), color: RED, onClick: () => { setShowMoreMenu(false); if (isDemo) { toast.info(t("cd.toast_demo_logout")); return; } supabase.auth.signOut().then(() => { window.location.href = "/login"; }); } },
  ];
  const MoreMenu = showMoreMenu ? (
    <div style={{
      position: "fixed", bottom: "calc(env(safe-area-inset-bottom, 0px) + 90px)",
      left: "50%", transform: "translateX(-50%)",
      zIndex: 260, background: "rgba(15,15,15,0.95)",
      border: "1px solid rgba(255,255,255,0.1)",
      borderRadius: 16, padding: 6,
      WebkitBackdropFilter: "blur(20px)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
      display: "flex", flexDirection: "column", gap: 2,
      minWidth: 200, animation: "fadeUp 0.2s ease both",
      boxShadow: "0 -10px 40px rgba(0,0,0,0.5)",
    }}>
      {moreMenuItems.map((item, i) =>
        item.type === "separator" ? (
          <div key={`sep-${i}`} style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "4px 12px" }} />
        ) : (
          <button key={item.label} onClick={item.onClick} style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "12px 16px", borderRadius: 12,
            background: "transparent", border: "none",
            color: item.color || "rgba(255,255,255,0.7)", fontSize: 14, fontWeight: 500,
            cursor: "pointer", fontFamily: "inherit", textAlign: "left",
            transition: "background 0.15s",
          }}
          onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
          onMouseLeave={e => e.currentTarget.style.background = "transparent"}
          >
            <Icon name={item.icon} size={18} color={item.color || G} />
            {item.label}
            {item.locked && <span style={{ fontSize: 10, marginLeft: "auto", opacity: 0.4 }}>{t("cd.menu_pro_lock")}</span>}
          </button>
        )
      )}
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
    <div className={isDemo ? "coach-root demo-active" : "coach-root"} style={{
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
        /* Pill navigation — partout (desktop + mobile) */
        .coach-sidebar{display:none !important}
        .coach-mobile-topbar{display:none !important}
        .coach-floating-pill{display:flex !important}
        .coach-main{margin-left:0 !important}
        .coach-main-inner{max-width:100% !important;overflow:hidden !important}
        .coach-client-panel,.coach-overlay-panel{left:0 !important}
        .coach-mobile-bell{display:block !important}
        @media(max-width:768px){
          .coach-main-inner{padding:0 16px 120px !important}
          .coach-client-panel-inner{padding:0 16px 120px !important}
        }
        @media(min-width:769px){
          .coach-main-inner{padding:20px 56px 120px !important}
          .coach-client-panel-inner{padding:0 24px 120px !important}
        }
        /* Desktop pill tooltips */
        @media(hover:hover) and (min-width:769px){
          .coach-floating-pill button{position:relative}
          .coach-floating-pill button::after{content:attr(data-label);position:absolute;top:-36px;left:50%;transform:translateX(-50%) translateY(4px);background:rgba(8,12,20,0.95);color:#fff;font-size:11px;font-weight:600;letter-spacing:0.02em;padding:6px 12px;border-radius:8px;border:1px solid rgba(255,255,255,0.08);white-space:nowrap;pointer-events:none;opacity:0;transition:opacity 120ms ease,transform 120ms ease}
          .coach-floating-pill button:hover::after{opacity:1;transform:translateX(-50%) translateY(0)}
        }
        /* Mobile pill labels hidden on desktop */
        @media(min-width:769px){
          .pill-label{display:none !important}
        }
        /* Coachmark first-time tooltip reveal */
        .coach-floating-pill.pill-showcase button::after{opacity:1 !important;transform:translateX(-50%) translateY(0) !important;animation:pillFadeOut 400ms ease 2600ms forwards}
        @keyframes pillFadeOut{to{opacity:0}}
        /* Demo banner offset — push overlay headers down when demo banner visible */
        .demo-active .mc-header,.demo-active .an-header,.demo-active .kan-header,.demo-active .set-header,.demo-active .sent-header{padding-top:calc(44px + 16px) !important}
        .demo-active .coach-main{padding-top:44px !important}
        .cd-row:hover{background:rgba(2,209,186,0.04)!important;cursor:pointer}
        .cd-row:hover .cd-arrow{opacity:1!important;transform:translateX(2px)}
        .cd-row:hover .cd-avatar-glow{opacity:1!important}
        .inp-focus:focus{border-color:#02d1ba!important;background:rgba(2,209,186,0.04)!important}
        ::-webkit-scrollbar{width:6px}
        ::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.08);border-radius:3px}
        ::-webkit-scrollbar-thumb:hover{background:rgba(2,209,186,0.3)}
      `}</style>

      {/* Toast */}
      {toastMsg && (
        <div style={{
          position: "fixed", top: 24, left: "50%", transform: "translateX(-50%)",
          background: toastMsg.type === "err" ? "rgba(255,107,107,0.12)" : "rgba(2,209,186,0.1)",
          border: `1px solid ${toastMsg.type === "err" ? "rgba(255,107,107,0.35)" : G_BORDER}`,
          borderRadius: 100, padding: "12px 22px", fontSize: 12, fontWeight: 700,
          color: toastMsg.type === "err" ? RED : G,
          zIndex: 500, boxShadow: "0 16px 40px rgba(0,0,0,0.6), 0 0 30px rgba(2,209,186,0.1)",
          whiteSpace: "nowrap", animation: "fadeUp 0.25s cubic-bezier(0.22,1,0.36,1)",
          display: "flex", alignItems: "center", gap: 8,
          WebkitBackdropFilter: "blur(20px)", backdropFilter: "blur(20px)",
        }}>
          <Icon name={toastMsg.type === "err" ? "alert" : "check"} size={14} />
          {toastMsg.msg}
        </div>
      )}

      {uploading && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(8,12,20,0.9)", WebkitBackdropFilter: "blur(16px)", backdropFilter: "blur(16px)", zIndex: 300, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 18 }}>
          <div style={{ width: 48, height: 48, border: "2.5px solid rgba(2,209,186,0.12)", borderTopColor: G, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
          <div style={{ color: G, fontSize: 12, fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase" }}>Upload en cours</div>
        </div>
      )}

      {selected && (
        <ErrorBoundary name="ClientPanel">
          <ClientPanel client={selected} onClose={() => { setSelected(null); setShowClientList(true); loadClients(); }} onUpload={uploadProg} onDelete={deleteClient} coachId={coachId} coachData={coachData} isDemo={isDemo} coachPlans={coachPlans} onWantInvoice={(c) => { setInvoicePreselect(c); setShowInvoice(true); }} />
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
      {showMonCompte && (
        <MonCompte
          coachData={coachData}
          isDemo={isDemo}
          initialTab={monCompteInitialTab}
          onClose={() => setShowMonCompte(false)}
        />
      )}
      {showSentinel && hasSentinelAccess && (
        <ErrorBoundary name="Sentinel">
          <Sentinel
            coachData={coachData}
            onClose={() => setShowSentinel(false)}
            onNavigate={(target) => {
              setShowSentinel(false);
              if (target === "clients") { setShowClientList(true); setActiveTab("clients"); }
              else if (target === "settings") { setShowSettings(true); }
            }}
          />
        </ErrorBoundary>
      )}
      {showSentinelTeaser && (
        <SentinelTeaser
          onClose={() => setShowSentinelTeaser(false)}
          onUpgrade={() => { setShowSentinelTeaser(false); toast.info(t("cd.toast_waitlist")); }}
        />
      )}
      {showInvoice && (
        <InvoiceModal
          coachData={coachData}
          clients={clients}
          preselectedClient={invoicePreselect}
          onClose={() => { setShowInvoice(false); setInvoicePreselect(null); }}
        />
      )}

      {duplicateProgramme && (
        <ProgrammeDuplicateModal
          programme={duplicateProgramme}
          clients={clients}
          onClose={() => setDuplicateProgramme(null)}
        />
      )}

      <CommandPalette
        open={showCmdK}
        onClose={() => setShowCmdK(false)}
        clients={clients}
        commands={[
          { id: "open_client", run: (c) => setSelected(c) },
          { id: "tab_overview", label: t("cd.cmd_overview"), group: t("cd.cmd_group_navigation"), icon: "chart", run: () => setActiveTab("overview") },
          { id: "tab_business", label: t("cd.cmd_business"), desc: t("cd.cmd_business_desc"), group: t("cd.cmd_group_navigation"), icon: "trending-up", run: () => setActiveTab("business") },
          { id: "tab_clients", label: t("cd.cmd_clients_list"), group: t("cd.cmd_group_navigation"), icon: "users", run: () => { setShowClientList(true); setActiveTab("clients"); } },
          { id: "tab_analytics", label: t("cd.cmd_analytics"), desc: t("cd.cmd_analytics_desc"), group: t("cd.cmd_group_navigation"), icon: "activity", run: () => setShowAnalytics(true) },
          { id: "tab_achievements", label: t("cd.cmd_achievements"), desc: t("cd.cmd_achievements_desc"), group: t("cd.cmd_group_navigation"), icon: "trophy", run: () => setActiveTab("achievements") },
          { id: "open_pipeline", label: t("cd.cmd_pipeline"), desc: t("cd.cmd_pipeline_desc"), group: t("cd.cmd_group_actions"), icon: "view", run: () => setShowPipeline(true) },
          { id: "action_add_client", label: t("cd.cmd_add_client"), group: t("cd.cmd_group_actions"), icon: "plus", run: () => { setShowClientList(true); setShowAdd(true); } },
          { id: "action_copy_invite", label: t("cd.cmd_copy_invite"), desc: coachData?.coach_slug ? `rbperform.app/rejoindre/${coachData.coach_slug}` : t("cd.cmd_invite_pending"), group: t("cd.cmd_group_actions"), icon: "link", keywords: t("cd.cmd_kw_invite").split(", "), run: async () => {
            const slug = coachData?.coach_slug;
            if (!slug) { showToast(t("cd.toast_link_not_ready")); return; }
            try {
              await navigator.clipboard.writeText(`https://rbperform.app/rejoindre/${slug}`);
              showToast(t("cd.toast_link_copied"));
            } catch { showToast(t("cd.toast_copy_failed")); }
          }},
          { id: "action_refresh", label: t("cd.cmd_refresh"), group: t("cd.cmd_group_actions"), icon: "refresh", run: () => loadClients() },
          ...(onSwitchToSuperAdmin ? [{ id: "nav_superadmin", label: t("cd.cmd_superadmin"), group: t("cd.cmd_group_navigation"), icon: "chart", run: () => onSwitchToSuperAdmin() }] : []),
          { id: "action_exit", label: t("cd.cmd_exit"), group: t("cd.cmd_group_actions"), icon: "arrow-left", run: () => onExit?.() },
        ]}
      />

      {/* Sidebar désactivée — pill navigation partout */}
      {false && CoachSidebar}

      <main ref={mainScrollRef} className="coach-main"
        style={{
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
        {/* Ambiance gradients */}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "60%", background: "radial-gradient(ellipse at 50% -10%, rgba(2,209,186,0.15) 0%, transparent 60%)", pointerEvents: "none", zIndex: 0 }} />
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "40%", background: "radial-gradient(ellipse at 50% 120%, rgba(2,209,186,0.06) 0%, transparent 60%)", pointerEvents: "none", zIndex: 0 }} />

        <div style={{ position: "relative", zIndex: 1 }}>

          {/* ========== OVERVIEW (exclusif — masque quand autre tab active) ========== */}
          {!showClientList && activeTab === "overview" && (<>

          {/* ========== HERO (identique au format FuelPage / client panel) ========== */}
          <div style={{ padding: "8px 24px 0", position: "relative", zIndex: 2 }}>
            <div style={{ fontSize: 10, color: `${G}88`, letterSpacing: "3px", textTransform: "uppercase", marginBottom: 10 }}>{t("coach.dashboard_title")}</div>
            <div style={{ fontSize: 52, fontWeight: 800, color: "#fff", letterSpacing: "-3px", lineHeight: 0.92, marginBottom: 10 }}>
              {coachData?.full_name?.split(" ")[0] || t("coach.coach_fallback")}<span style={{ color: accent }}>.</span>
            </div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.2)", fontStyle: "italic" }}>
              {new Date().toLocaleDateString(intlLocale(), { weekday: "long", day: "numeric", month: "long" })}
            </div>
          </div>

          {/* ========== SCORE CARD (même format que FuelPage score énergie) ========== */}
          <div style={{ margin: "20px 24px", background: "rgba(255,255,255,0.025)", border: `1px solid ${G}33`, borderRadius: 22, padding: 20, position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: -40, right: -40, width: 140, height: 140, background: `radial-gradient(circle, ${G}14 0%, transparent 70%)`, pointerEvents: "none" }} />
            <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
              <div style={{ position: "relative", width: 52, height: 52, flexShrink: 0 }}>
                <svg width="52" height="52" viewBox="0 0 100 100" style={{ transform: "rotate(-90deg)" }}>
                  <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
                  <circle cx="50" cy="50" r="40" fill="none" stroke={G} strokeWidth="8" strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 40}`} strokeDashoffset={`${2 * Math.PI * 40 * (1 - businessScore / 100)}`}
                    style={{ filter: `drop-shadow(0 0 6px ${G}cc)` }} />
                </svg>
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: G }}>{businessScore}</div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", letterSpacing: "2px", textTransform: "uppercase", marginBottom: 6 }}>{t("coach.score_business")}</div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", lineHeight: 1.5, fontStyle: "italic" }}>
                  "{businessScore >= 80 ? t("coach.score_solid") : businessScore >= 60 ? t("coach.score_correct") : businessScore >= 40 ? t("coach.score_attention") : t("coach.score_critical")}"
                </div>
              </div>
            </div>
          </div>

          {/* ========== STATS (même format que FuelPage macros) ========== */}
          <div style={{ margin: "0 24px 20px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 22, padding: 20, position: "relative", zIndex: 2 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", letterSpacing: "2px", textTransform: "uppercase", marginBottom: 4 }}>{t("coach.mrr")}</div>
                <div style={{ fontSize: 38, fontWeight: 100, color: "#fff", letterSpacing: "-2px" }}>
                  {mrr.toLocaleString(intlLocale())}<span style={{ fontSize: 14, color: "rgba(255,255,255,0.2)" }}>{t("coach.per_month_eur")}</span>
                </div>
              </div>
              <div style={{ background: `${G}18`, border: `1px solid ${G}33`, borderRadius: 100, padding: "4px 12px", fontSize: 11, color: G, fontWeight: 600 }}>
                {Math.round(mrr * 12).toLocaleString(intlLocale())}{t("coach.per_year_eur")}
              </div>
            </div>
            <div style={{ display: "flex", gap: 0 }}>
              {[
                { v: total, l: t("coach.stat_clients"), color: "#fff" },
                { v: activeWeek, l: t("coach.stat_active_7d"), color: G },
                { v: (total > 0 ? Math.round((activeWeek / total) * 100) : 0) + "%", l: t("coach.stat_retention"), color: "rgba(255,255,255,0.5)" },
              ].map((s, i) => (
                <div key={i} style={{ flex: 1, borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 14, textAlign: i === 0 ? "left" : i === 2 ? "right" : "center" }}>
                  <div style={{ fontSize: 24, fontWeight: 200, color: s.color, letterSpacing: "-1px", lineHeight: 1 }}>{s.v}</div>
                  <div style={{ fontSize: 9, color: "rgba(255,255,255,0.2)", fontWeight: 600, letterSpacing: "1.5px", textTransform: "uppercase", marginTop: 6 }}>{s.l}</div>
                </div>
              ))}
            </div>
          </div>

          {/* ========== ANALYSE CONTEXTUELLE (comme panel client) ========== */}
          {clients.length > 0 && (
            <div className="dash-card" style={{ padding: "20px 24px", marginBottom: 24, cursor: "default" }}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", color: `${G}88`, marginBottom: 10 }}>{t("coach.situation_header")}</div>
              <div style={{ fontSize: 14, color: "rgba(255,255,255,0.6)", lineHeight: 1.7 }}>
                {(() => {
                  const retPct = total > 0 ? Math.round((activeWeek / total) * 100) : 0;
                  const arrEst = Math.round(mrr * 12);
                  const fillTpl = (key, vars) => {
                    let s = t(key);
                    Object.entries(vars).forEach(([k, v]) => { s = s.split(`{${k}}`).join(String(v)); });
                    return s;
                  };
                  if (businessScore >= 80) return fillTpl("coach.situation_solid", { n: total, pct: retPct, arr: arrEst.toLocaleString(intlLocale()) });
                  if (businessScore >= 60) {
                    if (urgentCount > 0) return fillTpl(urgentCount > 1 ? "coach.situation_correct_with_urgent_many" : "coach.situation_correct_with_urgent_one", { n: urgentCount });
                    return fillTpl("coach.situation_correct_no_urgent", { pct: retPct });
                  }
                  if (businessScore >= 40) {
                    if (urgentCount > 0) return fillTpl(urgentCount > 1 ? "coach.situation_attention_with_urgent_many" : "coach.situation_attention_with_urgent_one", { score: businessScore, n: urgentCount });
                    return fillTpl("coach.situation_attention_no_urgent", { score: businessScore });
                  }
                  return fillTpl(urgentCount > 1 ? "coach.situation_critical_many" : "coach.situation_critical_one", { score: businessScore, n: urgentCount });
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
              <span style={{ fontSize: 14, color: "#fff", fontWeight: 500, flex: 1 }}>{urgentCount} {urgentCount > 1 ? t("coach.urgent_to_contact_many") : t("coach.urgent_to_contact_one")}</span>
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

          {/* ========== BUSINESS SECTION (MRR + score + objectif) ==========
              Affichee meme avec 0 client (empty state pris en charge dans
              BusinessSection — montre 0 MRR + CTA pour inviter premier client). */}
          {!showClientList && activeTab === "business" && coachData && (
            <BusinessSection coachData={coachData} clients={clients} hasSentinelAccess={sentinelEnabled && hasSentinelAccess} onOpenSentinel={() => setShowSentinel(true)} />
          )}

          {/* ========== PROGRAMMES — liste des programmes coach ========== */}
          {!showClientList && activeTab === "programmes" && (
            <ProgrammeList
              coachId={coachId}
              clients={clients}
              onEdit={(client) => setSelected(client)}
              onAssign={(prog) => setDuplicateProgramme(prog)}
            />
          )}

          {/* ========== ACHIEVEMENTS (badges + streak + rank) ========== */}
          {!showClientList && activeTab === "achievements" && coachData && clients.length > 0 && (
            <AchievementsSection coachData={coachData} clients={clients} />
          )}

          {/* ========== RECETTES (PDF parsing + review IA) ========== */}
          {!showClientList && activeTab === "recipes" && coachId && (
            <RecipesSection coachId={coachId} />
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
                  <div style={{ fontSize: 14, fontWeight: 800, color: "#fff", marginBottom: 3 }}>{t("coach.open_advanced_analytics")}</div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>{t("coach.open_advanced_analytics_sub")}</div>
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
                {t("coach.see_all_clients").replace("{n}", total)}
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
              <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 10, color: "rgba(2,209,186,0.55)", letterSpacing: "3px", textTransform: "uppercase", marginBottom: 10 }}>Clients</div>
                  <h1 style={{ fontSize: "clamp(32px, 8vw, 52px)", fontWeight: 800, color: "#fff", letterSpacing: "-3px", lineHeight: 0.92, margin: 0 }}>
                    {t("coach.athletes_title")}<span style={{ color: accent }}>.</span>
                  </h1>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => { haptic.selection(); setShowInvite(true); }} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 36, height: 36, background: "rgba(255,255,255,.04)", border: ".5px solid rgba(255,255,255,.1)", borderRadius: 100, color: "rgba(255,255,255,.75)", cursor: "pointer", transition: "background .15s" }}>
                    <Icon name="message" size={14} color="rgba(255,255,255,.75)" />
                  </button>
                  <button onClick={() => setShowAdd((v) => !v)} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 36, height: 36, background: showAdd ? "rgba(255,255,255,0.04)" : "#02d1ba", border: showAdd ? "1px solid rgba(255,255,255,0.1)" : "none", borderRadius: 100, color: showAdd ? "rgba(255,255,255,0.55)" : "#000", cursor: "pointer", boxShadow: showAdd ? "none" : "0 6px 20px rgba(2,209,186,0.25)" }}>
                    <Icon name={showAdd ? "x" : "plus"} size={14} />
                  </button>
                </div>
              </div>
            </div>

            {/* Formulaire nouveau client */}
            {showAdd && (
              <div style={{ background: "rgba(2,209,186,0.04)", border: `1px solid ${G_BORDER}`, borderRadius: 16, padding: 18, marginBottom: 16, animation: "fadeUp 0.2s ease" }}>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <input className="inp-focus" type="email" placeholder={t("coach.input_email_placeholder")} value={newEmail} onChange={(e) => setNewEmail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addClient()} style={{ flex: 1, minWidth: 180, padding: "12px 14px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, color: "#fff", fontFamily: "inherit", fontSize: 16, outline: "none", boxSizing: "border-box" }} />
                  <input className="inp-focus" type="text" placeholder={t("coach.input_name_placeholder")} value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addClient()} style={{ flex: 1, minWidth: 140, padding: "12px 14px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, color: "#fff", fontFamily: "inherit", fontSize: 16, outline: "none", boxSizing: "border-box" }} />
                  <button onClick={addClient} disabled={!newEmail} style={{ padding: "12px 20px", background: newEmail ? G : "rgba(255,255,255,0.04)", border: "none", borderRadius: 10, color: newEmail ? "#000" : "rgba(255,255,255,0.25)", fontSize: 12, fontWeight: 800, cursor: newEmail ? "pointer" : "not-allowed", fontFamily: "inherit" }}>{t("coach.btn_create_client")}</button>
                </div>
              </div>
            )}

            {/* Search + filtres */}
            <div style={{ marginBottom: 18 }}>
              <div style={{ position: "relative", marginBottom: 12 }}>
                <div style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.3)", pointerEvents: "none" }}><Icon name="search" size={14} /></div>
                <input className="inp-focus" placeholder={t("coach.search_placeholder")} value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: "100%", padding: "12px 14px 12px 38px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, color: "#fff", fontFamily: "inherit", fontSize: 16, outline: "none", boxSizing: "border-box" }} />
              </div>
              <div style={{ display: "flex", gap: 6, overflowX: "auto", scrollbarWidth: "none" }}>
                {[["all", t("coach.filter_all"), total], ["active", t("coach.filter_active"), activeWeek], ["noprog", t("coach.filter_noprog"), total - withProg], ["inactive", t("coach.filter_alerts"), inactiveAlerts]].map(([k, l, n]) => {
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
                  title={t("coach.empty_search_title")}
                  subtitle={search ? t("coach.empty_search_subtitle_query").replace("{q}", search) : t("coach.empty_search_subtitle_filter")}
                  action={{ label: t("coach.empty_search_reset"), onClick: () => { setSearch(""); setFilter("all"); } }}
                  size="md"
                />
              ) : (
                <EmptyState
                  icon="users"
                  title={t("coach.no_clients_yet")}
                  subtitle={t("coach.empty_clients_subtitle")}
                  action={{ label: t("coach.empty_clients_action"), onClick: () => setShowAdd(true) }}
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
                          <Avatar name={c.full_name || c.email} size={46} active={!!prog} src={c.avatar_url} />
                          {c._inactive && hasProg && (
                            <div style={{ position: "absolute", top: -2, right: -2, width: 11, height: 11, borderRadius: "50%", background: RED, border: "2px solid #080C14", animation: "pulseDot 2s infinite" }} />
                          )}
                        </div>
                        {/* Nom + email */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 16, fontWeight: 800, color: "#fff", letterSpacing: "-0.3px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {c.full_name || <span style={{ color: "rgba(255,255,255,0.35)", fontWeight: 500 }}>{t("coach.client_no_name")}</span>}
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
                            {prog.programme_name || t("coach.client_default_prog_name")}
                          </span>
                        ) : (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.35)", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 100, padding: "3px 10px" }}>
                            {t("coach.client_no_prog")}
                          </span>
                        )}
                        {logsCount > 0 && (
                          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", fontWeight: 600 }}>{(logsCount > 1 ? t("coach.client_sessions_many") : t("coach.client_sessions_one")).replace("{n}", logsCount)}</span>
                        )}
                        {dStr && (
                          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>{t("coach.client_seen").replace("{when}", dStr.toLowerCase())}</span>
                        )}
                        {/* Badge abonnement avec jours restants */}
                        {c.subscription_end_date && (() => {
                          const dl = Math.ceil((new Date(c.subscription_end_date) - Date.now()) / 86400000);
                          if (dl <= 0) return <span style={{ fontSize: 9, fontWeight: 700, color: RED, background: "rgba(255,107,107,0.1)", border: "1px solid rgba(255,107,107,0.2)", borderRadius: 100, padding: "2px 8px" }}>{t("coach.client_expired")}</span>;
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

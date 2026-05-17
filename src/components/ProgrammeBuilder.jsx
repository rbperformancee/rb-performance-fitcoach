// ProgrammeBuilder — Phase 1 MVP (v2 sans dynamic Tag JSX qui crashait).
// Sidebar: meta + structure tree (semaines / séances / exercices).
// Preview: rendu live du programme tel que le client le verra.
import React, { useState, useMemo, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";
import { findVideo, EXERCISE_VIDEOS } from "../data/exerciseVideos";
import { findFallbackVideo, FALLBACK_VIDEOS } from "../data/fallbackVideos";
import LogPaymentModal, { checkPaymentNeeded } from "./coach/LogPaymentModal";
import { addBreadcrumb } from "../lib/sentry";
import { DndContext, closestCenter, PointerSensor, TouchSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { exportProgrammePDF } from "../utils/exportPDF";
import { buildExerciseBlocks, supersetTypeLabel } from "../lib/supersets";

const G = "#02d1ba";
const G_DIM = "rgba(2,209,186,0.1)";
const BG = "#0a0a0a";
const BG_2 = "#111";
const BORDER = "rgba(255,255,255,0.06)";

// Detection mobile partagee : breakpoint 768. Utilisee dans le composant
// principal ET dans ExerciseRow / SortableSession qui sont definis hors
// scope (et n'ont donc pas acces au state du parent).
function useIsMobile() {
  const [m, setM] = useState(
    typeof window !== "undefined" && window.innerWidth < 768
  );
  useEffect(() => {
    const onResize = () => setM(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return m;
}

// Sensors @dnd-kit partages : Pointer pour desktop (drag immediat apres 8px
// pour distinguer click), Touch pour mobile (delai 250ms tolerance 5px pour
// que le scroll natural ne declenche pas un drag).
function useDragSensors() {
  return useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
  );
}

const uid = () => Math.random().toString(36).slice(2, 10);
const escAttr = (s) => String(s ?? "").replace(/"/g, "&quot;").replace(/</g, "&lt;");
const escText = (s) => String(s ?? "").replace(/</g, "&lt;");

function buildHTML(p) {
  const weeksHtml = (p.weeks || []).map((w, wi) => {
    const sessionsHtml = (w.sessions || []).map((s, si) => {
      const sid = `w${wi + 1}s${si + 1}`;
      const exHtml = (s.exercises || []).map((ex, ei) => {
        const eid = `${sid}e${ei + 1}`;
        return `
        <div class="exercise-item" id="ex-${eid}">
          <input id="en-${eid}" value="${escAttr(ex.name)}" />
          <input id="er-${eid}" value="${escAttr(ex.reps)}" />
          <input id="et-${eid}" value="${escAttr(ex.tempo)}" />
          <select id="eri-${eid}"><option selected value="${escAttr(ex.rir)}">${escAttr(ex.rir)}</option></select>
          <input id="ers-${eid}" value="${escAttr(ex.rest)}" />
          <input id="eg-${eid}" value="${escAttr(ex.group || '')}" />
          <input id="ev-${eid}" value="${escAttr(ex.vidUrl || '')}" />
        </div>`;
      }).join("");
      // Runs / cardio prescrits — sérialisés au format lu par parserProgramme
      // (.run-item) pour qu'ils survivent à un aller-retour dans le builder.
      const runHtml = (s.runs || []).map((r, ri) => {
        const rid = `${sid}r${ri + 1}`;
        return `
        <div class="run-item" id="run-${rid}">
          <input id="rn-${rid}" value="${escAttr(r.name || '')}" />
          <input id="rd-${rid}" value="${escAttr(r.distance || '')}" />
          <input id="rdu-${rid}" value="${escAttr(r.duration || '')}" />
          <input id="rbpm-${rid}" value="${escAttr(r.bpm || '')}" />
          <input id="rrs-${rid}" value="${escAttr(r.rest || '')}" />
        </div>`;
      }).join("");
      // Séances terrain (foot, rugby…) — format .field-item lu par parserProgramme.
      const fieldHtml = (s.fieldSessions || []).map((f, fi) => {
        const fid = `${sid}f${fi + 1}`;
        return `
        <div class="field-item" id="field-${fid}">
          <input id="ft-${fid}" value="${escAttr(f.title || '')}" />
          <input id="fm-${fid}" value="${escAttr(f.moment || '')}" />
          <textarea id="fd-${fid}">${escText(f.description || '')}</textarea>
        </div>`;
      }).join("");
      return `
      <div class="seance-block" id="seance-${sid}">
        <input id="sn-${sid}" value="${escAttr(s.name)}" />
        <textarea id="sd-${sid}">${escText(s.description || '')}</textarea>
        <textarea id="sf-${sid}">${escText(s.finisher || '')}</textarea>
        ${exHtml}
        ${runHtml}
        ${fieldHtml}
      </div>`;
    }).join("");
    return `
    <div class="week-block">
      <h2>${escText(w.name || `Semaine ${wi + 1}`)}</h2>
      ${sessionsHtml}
    </div>`;
  }).join("");
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>${escText(p.name)}</title></head><body>
<input id="prog-name"     value="${escAttr(p.name)}" />
<input id="client-name"   value="${escAttr(p.clientName)}" />
<input id="prog-duration" value="${escAttr(p.duration)}" />
<input id="prog-tagline"  value="${escAttr(p.tagline)}" />
<input id="prog-obj"      value="${escAttr(p.objective)}" />
${weeksHtml}
</body></html>`;
}

const newExercise = () => ({ id: uid(), name: "", reps: "", tempo: "", rir: "", rest: "", group: "", vidUrl: "" });
const newSession = (n = 1) => ({ id: uid(), name: `Séance ${n}`, description: "", finisher: "", runs: [], fieldSessions: [], exercises: [newExercise()] });
const newFieldSession = () => ({ id: uid(), title: "", moment: "", description: "" });
const newWeek = (n = 1) => ({ id: uid(), name: `Semaine ${n}`, sessions: [newSession(1)] });

// Suggestions communes pour les champs exercice (autocomplete au focus).
// Fourchettes exhaustives (force, hypertrophie, endurance, drop sets, special).
const REPS_SUGGESTIONS = [
  // Force / Power
  "1X1", "2X1", "3X1", "5X1", "10X1",
  "5X2", "6X2", "7X2", "8X2", "10X2",
  "3X3", "4X3", "5X3", "6X3", "7X3", "8X3", "10X3",
  "3X4", "4X4", "5X4", "6X4",
  "3X5", "4X5", "5X5", "6X5",
  // Force-hypertrophie
  "3X6", "4X6", "5X6", "6X6",
  "3X3-5", "4X3-5", "5X3-5",
  "3X4-6", "4X4-6", "5X4-6",
  "3X5-7", "4X5-7",
  // Hypertrophie
  "3X8", "4X8", "5X8", "6X8",
  "3X6-8", "4X6-8", "5X6-8",
  "3X8-10", "4X8-10", "5X8-10",
  "3X10", "4X10", "5X10",
  "3X8-12", "4X8-12",
  "3X10-12", "4X10-12",
  // Endurance / pump
  "3X12", "4X12", "5X12",
  "3X15", "4X15",
  "3X12-15", "4X12-15",
  "3X15-20", "4X15-20",
  "3X20", "4X20",
  // Special
  "AMRAP", "Max reps", "À l'échec",
  "5/3/1", "5x5", "3x5",
  // Unilatéral
  "3X8/jambe", "3X10/jambe", "3X12/jambe", "4X8/bras", "3X10/bras",
  // Isométrique / temps
  "3X20 secondes", "3X30 secondes", "3X45 secondes", "3X60 secondes",
  // Drop set / cluster
  "Drop set", "Cluster set", "Rest-pause",
];

const TEMPO_SUGGESTIONS = [
  // Standard contrôle excentrique
  "1010", "2010", "3010", "4010", "5010", "6010", "8010",
  // Avec pause au stretch
  "1110", "2110", "3110", "4110", "5110",
  // Pause au top
  "1011", "2011", "3011", "1012", "2012", "3012",
  // Pause des 2 côtés
  "2121", "3131", "4141",
  // Concentrique pause (X = explosif)
  "30X0", "20X0", "10X0", "40X0", "50X0",
  // Tempo balance contrôle
  "2020", "3030", "4040",
  // Explosif
  "X010", "X020", "X030",
  // Special
  "Libre", "Tempo coach",
];

const RIR_SUGGESTIONS = ["0", "1", "2", "3", "4", "5", "Échec", "Pré-fatigue"];

const REST_SUGGESTIONS = [
  "15s", "20s", "30s", "45s",
  "1'", "1'15", "1'30", "1'45",
  "2'", "2'15", "2'30", "2'45",
  "3'", "3'30",
  "4'", "5'", "6'", "7'", "8'", "10'",
];

// ─── Classification muscle groups (pour analytics builder) ───────────────────
// Mapping basique nom d'exercice → groupe musculaire principal.
// Utilisé pour calculer le volume hebdo et la balance push/pull/legs.
const MUSCLE_PATTERNS = [
  { group: "Pectoraux", patterns: [/d[ée]velopp[ée]\s*couch[ée]|bench|dips|pec\s*fly|pec\s*deck|push.*press|pompe|pullover/i] },
  { group: "Épaules",   patterns: [/d[ée]velopp[ée]\s*militaire|shoulder\s*press|[ée]l[ée]vation\s*lat[ée]rale|lateral\s*raise|front\s*raise|arnold|face\s*pull|oiseaux|rear\s*delt|y\s*raise|push\s*jerk|push\s*press/i] },
  { group: "Triceps",   patterns: [/triceps|extension.*triceps|extension.*haltere|haltere.*au.*front|skull|jm.*press|tate.*press|tricep|kickback/i] },
  { group: "Biceps",    patterns: [/biceps|curl/i] },
  { group: "Dos",       patterns: [/traction|pull[\s-]?up|chin[\s-]?up|tirage|rowing|row\s|t[\s-]?bar|pendlay|lat[\s-]?pull|shrug|deadlift|soulev[ée]\s*de\s*terre|good\s*morning|clean\s*pull|snatch\s*pull/i] },
  { group: "Quadriceps", patterns: [/squat|fente|presse.*cuisse|leg\s*press|leg\s*extension|hack\s*squat|split\s*squat|bulgarian|step.*up|lunge/i] },
  { group: "Ischios",   patterns: [/leg\s*curl|nordic|hip\s*thrust|glute\s*bridge|RDL|romanian|jambes?\s*tendu|stiff\s*leg|good\s*morning/i] },
  { group: "Fessiers",  patterns: [/glute|fessier|hip\s*thrust|kickback|bridge|pull[\s-]?through/i] },
  { group: "Mollets",   patterns: [/mollet|calf/i] },
  { group: "Abdos",     patterns: [/abdo|crunch|plank|gainage|leg\s*raise|relev[ée]\s*jambes|hollow|dead\s*bug|bird\s*dog|ab\s*wheel|pallof|woodchop|russian\s*twist/i] },
  { group: "Adducteurs/Abducteurs", patterns: [/adducteur|abducteur|adductor|abductor/i] },
];

function classifyExercise(name) {
  if (!name) return "Autre";
  for (const { group, patterns } of MUSCLE_PATTERNS) {
    for (const p of patterns) if (p.test(name)) return group;
  }
  return "Autre";
}

// Analyse les sets totaux par groupe musculaire pour une semaine donnée.
function weeklyVolumeByGroup(week) {
  const groups = {};
  (week.sessions || []).forEach((s) => {
    (s.exercises || []).forEach((ex) => {
      const grp = classifyExercise(ex.name);
      // Parse les sets depuis "4X8-10", "5X5", "12-10-8", "8-10"
      const r = String(ex.reps || "").trim();
      let sets = 0;
      const mX = r.match(/^(\d+)\s*[xX×]/);
      if (mX) sets = parseInt(mX[1], 10);
      else if (/^\d+(\s*[-–]\s*\d+)+$/.test(r)) sets = r.split(/\s*[-–]\s*/).filter(Boolean).length;
      else if (/^\d+$/.test(r)) sets = 1;
      groups[grp] = (groups[grp] || 0) + sets;
    });
  });
  return groups;
}

// ─── Icônes SVG premium pour templates (vs emojis) ───────────────────────────
const TPL_ICONS = {
  blank:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>,
  hyper:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
  force:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M6 4v16M18 4v16M2 12h4M18 12h4M6 8h12M6 16h12"/></svg>,
  fullbody: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="6" r="3"/><path d="M12 9v6"/><path d="M9 12h6"/><path d="M9 21l3-6 3 6"/></svg>,
  deload:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v6M12 14v8M4.93 10.93 8.46 14.46M15.54 9.54l3.53-3.53M2 12h6M16 12h6"/></svg>,
};

// ─── Icônes SVG pour la barre toolbar (remplacent les emojis 📋📄👥⭐💾) ───
const ToolbarIcon = ({ name, size = 14 }) => {
  const props = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" };
  switch (name) {
    case "templates": return <svg {...props}><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>;
    case "pdf":       return <svg {...props}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="15" x2="15" y2="15"/></svg>;
    case "users":     return <svg {...props}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
    case "star":      return <svg {...props}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26"/></svg>;
    case "save":      return <svg {...props}><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>;
    default: return null;
  }
};

// ─── Templates de phases ──────────────────────────────────────────────────────
// Skeletons pré-remplis : structure (semaines × séances × exos vides + reps/RIR
// suggérés selon la phase). L'exercice picker remplit le nom + vidéo au tap.
const TEMPLATES = [
  {
    id: "blank",
    name: "Vierge",
    desc: "1 semaine, 1 séance, 1 exercice. Pour partir de zéro.",
    iconKey: "blank",
    build: () => ({ name: "", clientName: "", duration: "", tagline: "", objective: "", startDate: "", trainingDays: [1], weeks: [newWeek(1)] }),
  },
  {
    id: "ppl-hypertrophie-4",
    name: "PPL Hypertrophie · 4 sem",
    desc: "Push / Pull / Legs × 4 semaines progressives. Volume → intensité.",
    iconKey: "hyper",
    build: () => ({
      name: "PPL Hypertrophie · Q1",
      clientName: "",
      duration: "4",
      tagline: "Volume puis intensité.",
      objective: "prise-de-masse",
      weeks: [1, 2, 3, 4].map((wn) => {
        const repsByWeek = { 1: { heavy: "4X8-10", mid: "4X10-12", light: "3X12-15" }, 2: { heavy: "4X6-8", mid: "4X8-10", light: "3X10-12" }, 3: { heavy: "5X6-8", mid: "4X8-10", light: "4X10-12" }, 4: { heavy: "3X4-6", mid: "3X6-8", light: "3X8-10" } };
        const r = repsByWeek[wn];
        const mkEx = (reps, tempo, rir, rest) => ({ id: uid(), name: "", reps, tempo, rir, rest, group: "", vidUrl: "" });
        return {
          id: uid(), name: `Semaine ${wn}`,
          sessions: [
            { id: uid(), name: "Push", description: "Pectoraux, épaules, triceps.", finisher: "", exercises: Array.from({length:6}, (_,i) => mkEx(i<2?r.heavy:i<4?r.mid:r.light, "3010", "1", i<2?"2'30":i<4?"2'":"1'30")) },
            { id: uid(), name: "Pull", description: "Dos, biceps, deltoïdes postérieurs.", finisher: "", exercises: Array.from({length:6}, (_,i) => mkEx(i<2?r.heavy:i<4?r.mid:r.light, "2010", "1", i<2?"2'30":i<4?"2'":"1'30")) },
            { id: uid(), name: "Legs", description: "Quadriceps, ischios, fessiers, mollets.", finisher: "", exercises: Array.from({length:6}, (_,i) => mkEx(i<2?r.heavy:i<4?r.mid:r.light, "3010", "1", i<2?"3'":i<4?"2'":"1'30")) },
          ],
        };
      }),
    }),
  },
  {
    id: "force-pure-4",
    name: "Force pure · 4 sem",
    desc: "Squat / Bench / Deadlift / OHP. Reps 3-6, RIR 1-2, longs repos.",
    iconKey: "force",
    build: () => ({
      name: "Force pure · Bloc 1",
      clientName: "",
      duration: "4",
      tagline: "Lourd. Précis. Patient.",
      objective: "force",
      weeks: [1, 2, 3, 4].map((wn) => {
        const reps = { 1: "5X5", 2: "5X4", 3: "6X3", 4: "3X3-5" }[wn];
        const mkEx = (rir, rest) => ({ id: uid(), name: "", reps, tempo: "2010", rir, rest, group: "", vidUrl: "" });
        return {
          id: uid(), name: `Semaine ${wn}`,
          sessions: [
            { id: uid(), name: "Squat day", description: "Squat barre dos + accessoires jambes.", finisher: "", exercises: Array.from({length:4}, () => mkEx("2", "3'")) },
            { id: uid(), name: "Bench day", description: "Bench press + accessoires push.", finisher: "", exercises: Array.from({length:4}, () => mkEx("2", "3'")) },
            { id: uid(), name: "Deadlift day", description: "Soulevé de terre + accessoires pull.", finisher: "", exercises: Array.from({length:4}, () => mkEx("2", "3'")) },
          ],
        };
      }),
    }),
  },
  {
    id: "full-body-3",
    name: "Full body · 3 sem",
    desc: "3 séances/sem full body. Idéal débutant ou retour à l'entraînement.",
    iconKey: "fullbody",
    build: () => ({
      name: "Full Body · Phase 1",
      clientName: "",
      duration: "3",
      tagline: "Bouger souvent. Bien.",
      objective: "remise-en-forme",
      weeks: [1, 2, 3].map((wn) => ({
        id: uid(), name: `Semaine ${wn}`,
        sessions: ["A", "B", "C"].map((letter) => ({
          id: uid(), name: `Full ${letter}`, description: "Polyarticulaire + isolation.", finisher: "",
          exercises: Array.from({ length: 5 }, () => ({ id: uid(), name: "", reps: "3X8-12", tempo: "2010", rir: "2", rest: "1'30", group: "", vidUrl: "" })),
        })),
      })),
    }),
  },
  {
    id: "deload-1",
    name: "Deload · 1 sem",
    desc: "Semaine de récup : 50% volume, RIR 3+. Préserve la fraîcheur.",
    iconKey: "deload",
    build: () => ({
      name: "Deload",
      clientName: "",
      duration: "1",
      tagline: "Récupère. Reviens plus fort.",
      objective: "recuperation",
      weeks: [{
        id: uid(), name: "Semaine de deload",
        sessions: ["Push", "Pull", "Legs"].map((n) => ({
          id: uid(), name: n, description: "Mouvements légers, focus technique.", finisher: "",
          exercises: Array.from({ length: 4 }, () => ({ id: uid(), name: "", reps: "3X8", tempo: "3010", rir: "3", rest: "2'", group: "", vidUrl: "" })),
        })),
      }],
    }),
  },
];

// Convertit un programme parsé (parserProgramme.js) en state ProgrammeBuilder.
function fromParsed(parsed) {
  if (!parsed) return null;
  return {
    name: parsed.name || "",
    clientName: parsed.clientName || "",
    duration: parsed.duration || "",
    tagline: parsed.tagline || "",
    objective: parsed.objective || "",
    weeks: (parsed.weeks || []).map((w) => ({
      id: uid(),
      name: w.name || "",
      sessions: (w.sessions || []).map((s) => ({
        id: uid(),
        name: s.name || "",
        description: s.description || "",
        finisher: s.finisher || "",
        // Runs prescrits — préservés tels quels (le builder n'a pas encore
        // d'UI pour les éditer, mais ils ne doivent JAMAIS être perdus).
        runs: Array.isArray(s.runs)
          ? s.runs.map((r) => ({
              name: r.name || "",
              distance: r.distance || "",
              duration: r.duration || "",
              bpm: r.bpm || "",
              rest: r.rest || "",
            }))
          : [],
        // Séances terrain (foot, rugby…)
        fieldSessions: Array.isArray(s.fieldSessions)
          ? s.fieldSessions.map((f) => ({
              id: uid(),
              title: f.title || "",
              moment: f.moment || "",
              description: f.description || "",
            }))
          : [],
        exercises: (s.exercises || []).map((e) => ({
          id: uid(),
          name: e.name || "",
          reps: e.rawReps || e.reps || "",
          tempo: e.tempo || "",
          rir: e.rir || "",
          rest: e.rest || "",
          group: e.group || "",
          vidUrl: e.vidUrl || "",
        })),
      })),
    })),
  };
}

const inputBaseStyle = {
  width: "100%", padding: "8px 10px", background: "rgba(255,255,255,0.03)",
  border: "1px solid " + BORDER, borderRadius: 8, color: "#fff",
  fontSize: 12, fontFamily: "inherit", outline: "none",
};

function TextField({ label, value, onChange, placeholder }) {
  return (
    <label style={{ display: "block" }}>
      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: "rgba(255,255,255,0.35)", marginBottom: 4 }}>{label}</div>
      <input
        type="text"
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={inputBaseStyle}
      />
    </label>
  );
}

function SuggestField({ label, value, onChange, placeholder, suggestions }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const filtered = (value || "").length > 0
    ? suggestions.filter((s) => s.toLowerCase().includes((value || "").toLowerCase()))
    : suggestions;
  return (
    <label ref={ref} style={{ display: "block", position: "relative" }}>
      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: "rgba(255,255,255,0.35)", marginBottom: 4 }}>{label}</div>
      <input
        type="text"
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        style={inputBaseStyle}
      />
      {open && filtered.length > 0 && (
        <div style={{
          position: "absolute", top: "calc(100% + 2px)", left: 0, right: 0,
          background: "#161616", border: "1px solid " + BORDER, borderRadius: 8,
          maxHeight: 240, overflowY: "auto", zIndex: 60,
          boxShadow: "0 8px 24px rgba(0,0,0,0.6)",
        }}>
          {filtered.map((s) => (
            <button
              key={s}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); onChange(s); setOpen(false); }}
              style={{
                width: "100%", padding: "7px 10px", textAlign: "left",
                background: "transparent", border: "none", color: "#fff",
                fontSize: 12, cursor: "pointer", fontFamily: "inherit",
                borderBottom: "1px solid rgba(255,255,255,0.04)",
              }}
            >{s}</button>
          ))}
        </div>
      )}
    </label>
  );
}

function TextArea({ label, value, onChange, placeholder, rows = 2 }) {
  return (
    <label style={{ display: "block" }}>
      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: "rgba(255,255,255,0.35)", marginBottom: 4 }}>{label}</div>
      <textarea
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        style={{ ...inputBaseStyle, resize: "vertical" }}
      />
    </label>
  );
}

function ExercisePicker({ value, onChange, onPickFull }) {
  const [query, setQuery] = useState(value || "");
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => { setQuery(value || ""); }, [value]);
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const suggestions = useMemo(() => {
    if (!query || query.length < 2) return [];
    const norm = (s) => String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
    const q = norm(query);
    const matches = (v) =>
      norm(v.title).includes(q) ||
      (v.aliases || []).some((a) => norm(a).includes(q));

    // Bibliothèque perso prioritaire (badge "Perso"), puis fallback externe
    // (avec attribution créateur). Dedup par youtube id.
    const personal = EXERCISE_VIDEOS.filter(matches).map((v) => ({ ...v, source: "personal" }));
    const fallback = FALLBACK_VIDEOS.filter(matches).map((v) => ({ ...v, source: "fallback" }));
    const seen = new Set();
    return [...personal, ...fallback]
      .filter((v) => { if (seen.has(v.id)) return false; seen.add(v.id); return true; })
      .slice(0, 10);
  }, [query]);

  return (
    <div ref={ref} style={{ position: "relative", flex: 1, minWidth: 0 }}>
      <input
        type="text"
        value={query}
        onChange={(e) => { setQuery(e.target.value); onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder="Nom (tape 'bench', 'squat', 'curl'…)"
        style={{ ...inputBaseStyle, padding: "10px 12px", fontSize: 13, background: "rgba(255,255,255,0.04)" }}
      />
      {/* Si query >= 3 char et 0 résultat → fallback YouTube search */}
      {open && query && query.length >= 3 && suggestions.length === 0 && (
        <div style={{
          position: "absolute", top: "100%", left: 0, right: 0, marginTop: 4,
          background: "#161616", border: "1px solid " + BORDER, borderRadius: 10,
          padding: "10px 12px", zIndex: 50, boxShadow: "0 12px 32px rgba(0,0,0,0.6)",
        }}>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginBottom: 8, lineHeight: 1.5 }}>
            Aucune vidéo dans la bibliothèque pour <strong style={{ color: "#fff" }}>« {query} »</strong>.
          </div>
          <a
            href={`https://www.youtube.com/results?search_query=${encodeURIComponent(query + " exercice musculation technique")}`}
            target="_blank"
            rel="noopener noreferrer"
            onMouseDown={(e) => e.stopPropagation()}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "6px 12px", background: "rgba(2,209,186,0.08)", border: "1px solid rgba(2,209,186,0.3)",
              borderRadius: 100, color: G, fontSize: 11, fontWeight: 700,
              textDecoration: "none", letterSpacing: 0.3,
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            Chercher sur YouTube
          </a>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 8, lineHeight: 1.5 }}>
            Trouve une vidéo, copie l'URL, colle-la dans le champ « Vidéo URL » de l'exercice.
          </div>
        </div>
      )}
      {open && suggestions.length > 0 && (
        <div style={{
          position: "absolute", top: "100%", left: 0, right: 0, marginTop: 4,
          background: "#161616", border: "1px solid " + BORDER, borderRadius: 10,
          maxHeight: 320, overflowY: "auto", zIndex: 50, boxShadow: "0 12px 32px rgba(0,0,0,0.6)",
        }}>
          {suggestions.map((v) => (
            <button
              key={v.id}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                // Single update : nom + URL ensemble pour éviter race state.
                onPickFull({ name: v.title, vidUrl: "https://youtu.be/" + v.id });
                setQuery(v.title);
                setOpen(false);
              }}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: 10,
                padding: "8px 10px", background: "transparent", border: "none",
                cursor: "pointer", color: "#fff", textAlign: "left", fontFamily: "inherit",
                borderBottom: "1px solid rgba(255,255,255,0.04)",
              }}
            >
              <img
                src={"https://img.youtube.com/vi/" + v.id + "/default.jpg"}
                alt=""
                style={{ width: 60, height: 45, objectFit: "cover", borderRadius: 6, flexShrink: 0 }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", flex: 1, minWidth: 0 }}>{v.title}</span>
                  {v.source === "personal" ? (
                    <span style={{ fontSize: 8, fontWeight: 800, letterSpacing: 1, color: G, background: "rgba(2,209,186,0.1)", padding: "2px 6px", borderRadius: 100, textTransform: "uppercase", flexShrink: 0 }}>Perso</span>
                  ) : (
                    <span style={{ fontSize: 8, fontWeight: 800, letterSpacing: 1, color: "rgba(168,139,250,0.85)", background: "rgba(168,139,250,0.08)", padding: "2px 6px", borderRadius: 100, textTransform: "uppercase", flexShrink: 0 }} title={v.creator || "Créateur externe"}>Démo</span>
                  )}
                </div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>
                  {v.source === "fallback" && v.creator ? `via ${v.creator}` : ((v.aliases || []).slice(0, 2).join(" · ") || " ")}
                </div>
              </div>
              <div style={{ fontSize: 14, color: G }}>+</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function SortableExercise({ ex, idx, total, onUpdate, onRemove, onMove, onDuplicate }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: ex.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };
  return (
    <div ref={setNodeRef} style={style}>
      <ExerciseRow
        ex={ex} idx={idx} total={total}
        onUpdate={onUpdate} onRemove={onRemove} onMove={onMove} onDuplicate={onDuplicate}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  );
}

function ExerciseRow({ ex, idx, total, onUpdate, onRemove, onMove, onDuplicate, dragHandleProps }) {
  const update = (k, v) => onUpdate({ ...ex, [k]: v });
  const isMobile = useIsMobile();
  const iconBtn = { width: 24, height: 24, borderRadius: 6, border: "1px solid " + BORDER, background: "transparent", color: "rgba(255,255,255,0.45)", cursor: "pointer", fontSize: 11, flexShrink: 0, fontFamily: "inherit" };
  const [showCustomUrl, setShowCustomUrl] = useState(false);
  const [customUrlDraft, setCustomUrlDraft] = useState("");

  // Détecte la source effective de la vidéo
  // Priorité : ex.vidUrl > findVideo (lib perso) > findFallbackVideo (externe) > rien
  const personalUrl = !ex.vidUrl ? findVideo(ex.name) : null;
  const fallbackHit = !ex.vidUrl && !personalUrl ? findFallbackVideo(ex.name) : null;
  let videoSource = "none";
  if (ex.vidUrl) videoSource = "explicit";
  else if (personalUrl) videoSource = "personal";
  else if (fallbackHit) videoSource = "fallback";

  return (
    <div style={{
      background: "rgba(255,255,255,0.025)", border: "1px solid " + BORDER,
      borderRadius: 12, padding: 12, marginBottom: 10,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 4 : 6, marginBottom: 10, minWidth: 0 }}>
        {dragHandleProps ? (
          <button type="button" {...dragHandleProps}
            style={{ width: isMobile ? 22 : 16, height: isMobile ? 32 : 24, cursor: "grab", color: "rgba(255,255,255,0.3)", background: "transparent", border: "none", padding: 0, fontSize: isMobile ? 14 : 12, flexShrink: 0, touchAction: "none" }}
            title="Glisser"
          >⋮⋮</button>
        ) : null}
        <div style={{
          width: 24, height: 24, borderRadius: 6, background: G_DIM,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 11, fontWeight: 700, color: G, flexShrink: 0,
        }}>{idx + 1}</div>
        <ExercisePicker
          value={ex.name}
          onChange={(v) => update("name", v)}
          onPickFull={({ name, vidUrl }) => onUpdate({ ...ex, name, vidUrl })}
        />
        {!isMobile && idx > 0 && <button type="button" onClick={() => onMove(-1)} title="Monter" style={iconBtn}>↑</button>}
        {!isMobile && idx < total - 1 && <button type="button" onClick={() => onMove(1)} title="Descendre" style={iconBtn}>↓</button>}
        <button type="button" onClick={onDuplicate} title="Dupliquer" style={{ ...iconBtn, background: G_DIM, borderColor: "rgba(2,209,186,0.25)", color: G }}>⎘</button>
        <button type="button" onClick={onRemove} title="Supprimer" style={{ ...iconBtn, fontSize: 14 }}>×</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "1fr 1fr 1fr 1fr", gap: 6 }}>
        <SuggestField label="Reps" value={ex.reps} onChange={(v) => update("reps", v)} placeholder="4X8-10" suggestions={REPS_SUGGESTIONS} />
        <SuggestField label="Tempo" value={ex.tempo} onChange={(v) => update("tempo", v)} placeholder="3010" suggestions={TEMPO_SUGGESTIONS} />
        <SuggestField label="RIR" value={ex.rir} onChange={(v) => update("rir", v)} placeholder="1" suggestions={RIR_SUGGESTIONS} />
        <SuggestField label="Repos" value={ex.rest} onChange={(v) => update("rest", v)} placeholder="2'" suggestions={REST_SUGGESTIONS} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 2fr", gap: 6, marginTop: 6 }}>
        <TextField label="Groupe" value={ex.group} onChange={(v) => update("group", v)} placeholder="A1, A2…" />
        <TextField label="Vidéo URL" value={ex.vidUrl} onChange={(v) => update("vidUrl", v)} placeholder="Auto-rempli si tu choisis depuis la liste" />
      </div>

      {/* Indicateur source vidéo + CTA remplacer si fallback externe */}
      {videoSource !== "none" && !ex.vidUrl && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, padding: "6px 10px", background: videoSource === "fallback" ? "rgba(255,165,0,0.06)" : "rgba(2,209,186,0.06)", border: "1px solid " + (videoSource === "fallback" ? "rgba(255,165,0,0.2)" : "rgba(2,209,186,0.2)"), borderRadius: 8, fontSize: 11 }}>
          <span style={{ color: videoSource === "fallback" ? "rgba(255,180,80,0.85)" : G, fontWeight: 700 }}>
            {videoSource === "personal" ? "✓ Tes vidéos" : "↗ Démo externe · " + (fallbackHit?.creator || "")}
          </span>
          {videoSource === "fallback" && (
            <button
              type="button"
              onClick={() => { setCustomUrlDraft(""); setShowCustomUrl(true); }}
              style={{ marginLeft: "auto", padding: "3px 10px", background: "rgba(2,209,186,0.1)", border: "1px solid rgba(2,209,186,0.3)", borderRadius: 100, color: G, fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", letterSpacing: 0.3 }}
            >
              Remplacer par ma vidéo
            </button>
          )}
        </div>
      )}

      {/* Modal premium pour coller une URL custom (remplace window.prompt) */}
      {showCustomUrl && (
        <div
          role="dialog"
          aria-modal="true"
          style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowCustomUrl(false); }}
        >
          <div style={{ background: "#0e0e0e", border: "1px solid " + BORDER, borderRadius: 18, maxWidth: 460, width: "100%", padding: 24 }}>
            <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: 3, color: G, textTransform: "uppercase", marginBottom: 6 }}>Vidéo personnelle</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#fff", marginBottom: 4, letterSpacing: -0.3 }}>Remplacer la démo externe</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginBottom: 18, lineHeight: 1.5 }}>
              Colle l'URL YouTube de TA vidéo pour <strong style={{ color: "#fff" }}>{ex.name || "cet exercice"}</strong>. Elle remplacera la démo externe pour tous tes clients.
            </div>
            <input
              type="text"
              autoFocus
              value={customUrlDraft}
              onChange={(e) => setCustomUrlDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && customUrlDraft.trim()) { update("vidUrl", customUrlDraft.trim()); setShowCustomUrl(false); } }}
              placeholder="https://youtu.be/abc123XYZ ou https://www.youtube.com/watch?v=abc123XYZ"
              style={{
                width: "100%", padding: "11px 14px",
                background: "rgba(255,255,255,0.04)", border: "1px solid " + BORDER,
                borderRadius: 10, color: "#fff", fontSize: 12, fontFamily: "'JetBrains Mono', monospace",
                outline: "none", boxSizing: "border-box", marginBottom: 14,
              }}
            />
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                onClick={() => setShowCustomUrl(false)}
                style={{ flex: 1, padding: "10px 16px", background: "transparent", border: "1px solid " + BORDER, borderRadius: 10, color: "rgba(255,255,255,0.6)", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", letterSpacing: 0.5, textTransform: "uppercase" }}
              >Annuler</button>
              <button
                type="button"
                disabled={!customUrlDraft.trim()}
                onClick={() => { update("vidUrl", customUrlDraft.trim()); setShowCustomUrl(false); }}
                style={{ flex: 2, padding: "10px 16px", background: customUrlDraft.trim() ? `linear-gradient(135deg, ${G}, #0891b2)` : "rgba(255,255,255,0.04)", border: "none", borderRadius: 10, color: customUrlDraft.trim() ? "#000" : "rgba(255,255,255,0.3)", fontSize: 11, fontWeight: 800, cursor: customUrlDraft.trim() ? "pointer" : "not-allowed", fontFamily: "inherit", letterSpacing: 0.5, textTransform: "uppercase", boxShadow: customUrlDraft.trim() ? "0 6px 20px rgba(2,209,186,0.25)" : "none" }}
              >Utiliser cette vidéo</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SortableSession({ session, idx, total, onUpdate, onRemove, onMove, onDuplicate }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: session.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    position: "relative",
  };
  return (
    <div ref={setNodeRef} style={style}>
      <SessionPanel
        session={session} idx={idx} total={total}
        onUpdate={onUpdate} onRemove={onRemove} onMove={onMove} onDuplicate={onDuplicate}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  );
}

function SessionPanel({ session, idx, total, onUpdate, onRemove, onMove, onDuplicate, dragHandleProps }) {
  const update = (k, v) => onUpdate({ ...session, [k]: v });
  const isMobile = useIsMobile();
  const sensors = useDragSensors();
  const updateExercise = (exIdx, ex) => onUpdate({ ...session, exercises: session.exercises.map((e, i) => i === exIdx ? ex : e) });
  const addExercise = () => onUpdate({ ...session, exercises: [...session.exercises, newExercise()] });
  const removeExercise = (exIdx) => onUpdate({ ...session, exercises: session.exercises.filter((_, i) => i !== exIdx) });
  const moveExercise = (exIdx, dir) => {
    const arr = [...session.exercises];
    const j = exIdx + dir;
    if (j < 0 || j >= arr.length) return;
    [arr[exIdx], arr[j]] = [arr[j], arr[exIdx]];
    onUpdate({ ...session, exercises: arr });
  };
  const duplicateExercise = (exIdx) => {
    const orig = session.exercises[exIdx];
    const dup = { ...orig, id: uid() };
    const arr = [...session.exercises];
    arr.splice(exIdx + 1, 0, dup);
    onUpdate({ ...session, exercises: arr });
  };
  const fieldSessions = session.fieldSessions || [];
  const updateFieldSession = (fi, f) => onUpdate({ ...session, fieldSessions: fieldSessions.map((x, i) => i === fi ? f : x) });
  const addFieldSession = () => onUpdate({ ...session, fieldSessions: [...fieldSessions, newFieldSession()] });
  const removeFieldSession = (fi) => onUpdate({ ...session, fieldSessions: fieldSessions.filter((_, i) => i !== fi) });

  return (
    <div style={{
      background: BG_2, border: "1px solid " + BORDER, borderRadius: 14,
      padding: 16, marginBottom: 14,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 4 : 8, marginBottom: 14, minWidth: 0, flexWrap: "wrap" }}>
        {dragHandleProps ? (
          <button type="button" {...dragHandleProps}
            style={{ width: isMobile ? 28 : 24, height: isMobile ? 32 : 24, cursor: "grab", color: "rgba(255,255,255,0.3)", background: "transparent", border: "none", padding: 0, fontSize: 16, flexShrink: 0, touchAction: "none" }}
            title="Glisser pour réorganiser"
          >⋮⋮</button>
        ) : null}
        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, color: "rgba(2,209,186,0.6)", textTransform: "uppercase", flexShrink: 0 }}>Séance {idx + 1}</span>
        <input
          type="text"
          value={session.name || ""}
          onChange={(e) => update("name", e.target.value)}
          placeholder="Nom (Push, Pull, Legs…)"
          style={{
            flex: 1, minWidth: 0, padding: "6px 10px", background: "transparent", border: "1px solid " + BORDER,
            borderRadius: 8, color: "#fff", fontSize: 14, fontWeight: 700, fontFamily: "inherit", outline: "none",
          }}
        />
        {!isMobile && idx > 0 && <button type="button" onClick={() => onMove(-1)} title="Monter la séance"
          style={{ padding: "6px 8px", background: "transparent", border: "1px solid " + BORDER, borderRadius: 8, color: "rgba(255,255,255,0.55)", fontSize: 11, cursor: "pointer", fontFamily: "inherit", flexShrink: 0 }}
        >↑</button>}
        {!isMobile && idx < total - 1 && <button type="button" onClick={() => onMove(1)} title="Descendre la séance"
          style={{ padding: "6px 8px", background: "transparent", border: "1px solid " + BORDER, borderRadius: 8, color: "rgba(255,255,255,0.55)", fontSize: 11, cursor: "pointer", fontFamily: "inherit", flexShrink: 0 }}
        >↓</button>}
        <button type="button" onClick={onDuplicate} title="Dupliquer la séance"
          style={{ padding: "6px 10px", background: G_DIM, border: "1px solid rgba(2,209,186,0.25)", borderRadius: 8, color: G, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", flexShrink: 0 }}
        >⎘</button>
        <button
          type="button"
          onClick={onRemove}
          style={{
            padding: "6px 10px", background: "rgba(192,57,43,0.1)", border: "1px solid rgba(192,57,43,0.25)",
            borderRadius: 8, color: "#c0392b", fontSize: 11, cursor: "pointer", fontFamily: "inherit", flexShrink: 0,
          }}
        >{isMobile ? "×" : "Supprimer"}</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 8, marginBottom: 14 }}>
        <TextArea label="Description" value={session.description} onChange={(v) => update("description", v)} placeholder="Pectoraux, épaules, triceps…" />
        <TextArea label="Finisher" value={session.finisher} onChange={(v) => update("finisher", v)} placeholder="3 séries de pompes lestées AMRAP…" />
      </div>

      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", marginBottom: 10 }}>Exercices</div>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={(event) => {
          const { active, over } = event;
          if (!over || active.id === over.id) return;
          const oldIdx = session.exercises.findIndex((e) => e.id === active.id);
          const newIdx = session.exercises.findIndex((e) => e.id === over.id);
          if (oldIdx < 0 || newIdx < 0) return;
          onUpdate({ ...session, exercises: arrayMove(session.exercises, oldIdx, newIdx) });
        }}
      >
        <SortableContext items={(session.exercises || []).map((e) => e.id)} strategy={verticalListSortingStrategy}>
          {(session.exercises || []).map((ex, i) => (
            <SortableExercise key={ex.id} ex={ex} idx={i} total={session.exercises.length}
              onUpdate={(e) => updateExercise(i, e)}
              onRemove={() => removeExercise(i)}
              onMove={(dir) => moveExercise(i, dir)}
              onDuplicate={() => duplicateExercise(i)}
            />
          ))}
        </SortableContext>
      </DndContext>
      <button
        type="button"
        onClick={addExercise}
        style={{
          width: "100%", padding: 12, background: "transparent",
          border: "1px dashed rgba(2,209,186,0.3)", borderRadius: 12,
          color: G, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
          letterSpacing: 0.5,
        }}
      >+ Ajouter un exercice</button>

      {/* SÉANCES TERRAIN — foot, rugby… le même jour, à un autre moment */}
      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", margin: "18px 0 10px" }}>
        Séances terrain{" "}
        <span style={{ textTransform: "none", letterSpacing: 0, color: "rgba(255,255,255,0.25)" }}>(foot, rugby… le même jour)</span>
      </div>
      {fieldSessions.map((f, i) => (
        <div key={f.id} style={{ background: "rgba(2,209,186,0.04)", border: "1px solid rgba(2,209,186,0.18)", borderRadius: 10, padding: 10, marginBottom: 8 }}>
          <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
            <input
              value={f.title || ""}
              onChange={(e) => updateFieldSession(i, { ...f, title: e.target.value })}
              placeholder="Titre (ex. Entraînement club)"
              style={{ flex: 2, minWidth: 0, padding: "7px 9px", background: "rgba(255,255,255,0.03)", border: "1px solid " + BORDER, borderRadius: 8, color: "#fff", fontSize: 12, fontFamily: "inherit", outline: "none" }}
            />
            <input
              value={f.moment || ""}
              onChange={(e) => updateFieldSession(i, { ...f, moment: e.target.value })}
              placeholder="Moment (18h…)"
              style={{ flex: 1, minWidth: 0, padding: "7px 9px", background: "rgba(255,255,255,0.03)", border: "1px solid " + BORDER, borderRadius: 8, color: "#fff", fontSize: 12, fontFamily: "inherit", outline: "none" }}
            />
            <button type="button" onClick={() => removeFieldSession(i)} title="Retirer"
              style={{ flexShrink: 0, padding: "7px 10px", background: "rgba(192,57,43,0.1)", border: "1px solid rgba(192,57,43,0.25)", borderRadius: 8, color: "#c0392b", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}
            >×</button>
          </div>
          <textarea
            value={f.description || ""}
            onChange={(e) => updateFieldSession(i, { ...f, description: e.target.value })}
            placeholder="Consignes (ex. Vitesse + appuis, 45 min)"
            rows={2}
            style={{ width: "100%", boxSizing: "border-box", padding: "7px 9px", background: "rgba(255,255,255,0.03)", border: "1px solid " + BORDER, borderRadius: 8, color: "#fff", fontSize: 12, fontFamily: "inherit", outline: "none", resize: "vertical" }}
          />
        </div>
      ))}
      <button
        type="button"
        onClick={addFieldSession}
        style={{
          width: "100%", padding: 10, background: "transparent",
          border: "1px dashed rgba(2,209,186,0.3)", borderRadius: 12,
          color: G, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
          letterSpacing: 0.5,
        }}
      >+ Ajouter une séance terrain</button>
    </div>
  );
}

function SortableWeek({ week, weekIdx, totalWeeks, onUpdate, onRemove, onDuplicate, onMove }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: week.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };
  return (
    <div ref={setNodeRef} style={style}>
      <WeekPanel
        week={week} weekIdx={weekIdx} totalWeeks={totalWeeks}
        onUpdate={onUpdate} onRemove={onRemove} onDuplicate={onDuplicate} onMove={onMove}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  );
}

function WeekPanel({ week, weekIdx, totalWeeks, onUpdate, onRemove, onDuplicate, onMove, dragHandleProps }) {
  const update = (k, v) => onUpdate({ ...week, [k]: v });
  const isMobile = useIsMobile();
  const sensors = useDragSensors();
  const updateSession = (sIdx, s) => onUpdate({ ...week, sessions: week.sessions.map((x, i) => i === sIdx ? s : x) });
  const addSession = () => onUpdate({ ...week, sessions: [...week.sessions, newSession(week.sessions.length + 1)] });
  const removeSession = (sIdx) => {
    const sess = week.sessions[sIdx];
    if (!sess) return;
    if (!window.confirm("Supprimer la séance \"" + sess.name + "\" et ses " + (sess.exercises || []).length + " exercices ?")) return;
    onUpdate({ ...week, sessions: week.sessions.filter((_, i) => i !== sIdx) });
  };
  const moveSession = (sIdx, dir) => {
    const arr = [...week.sessions];
    const j = sIdx + dir;
    if (j < 0 || j >= arr.length) return;
    [arr[sIdx], arr[j]] = [arr[j], arr[sIdx]];
    onUpdate({ ...week, sessions: arr });
  };
  const duplicateSession = (sIdx) => {
    const orig = week.sessions[sIdx];
    const dup = { ...orig, id: uid(), name: orig.name + " (copie)", exercises: orig.exercises.map((e) => ({ ...e, id: uid() })) };
    const arr = [...week.sessions];
    arr.splice(sIdx + 1, 0, dup);
    onUpdate({ ...week, sessions: arr });
  };

  return (
    <div style={{
      marginBottom: 24, padding: isMobile ? 12 : 18,
      background: "linear-gradient(180deg, rgba(2,209,186,0.04), transparent)",
      border: "1px solid " + BORDER, borderRadius: 18,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 6 : 10, marginBottom: 16, minWidth: 0, flexWrap: "wrap" }}>
        {dragHandleProps ? (
          <button type="button" {...dragHandleProps}
            style={{ width: isMobile ? 28 : 24, height: isMobile ? 40 : 36, cursor: "grab", color: "rgba(255,255,255,0.4)", background: "transparent", border: "none", padding: 0, fontSize: 18, flexShrink: 0, touchAction: "none" }}
            title="Glisser pour réorganiser la semaine"
          >⋮⋮</button>
        ) : null}
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: G, color: "#000", display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 14, fontWeight: 900, flexShrink: 0,
        }}>S{weekIdx + 1}</div>
        <input
          type="text"
          value={week.name || ""}
          onChange={(e) => update("name", e.target.value)}
          placeholder={"Semaine " + (weekIdx + 1)}
          style={{
            flex: 1, minWidth: 0, padding: "8px 12px", background: "transparent", border: "1px solid " + BORDER,
            borderRadius: 10, color: "#fff", fontSize: 16, fontWeight: 800, fontFamily: "inherit", outline: "none",
          }}
        />
        {!isMobile && weekIdx > 0 && (
          <button type="button" onClick={() => onMove(-1)} title="Monter cette semaine"
            style={{ padding: "8px 10px", background: "transparent", border: "1px solid " + BORDER, borderRadius: 8, color: "rgba(255,255,255,0.6)", fontSize: 12, cursor: "pointer", fontFamily: "inherit", flexShrink: 0 }}
          >↑</button>
        )}
        {!isMobile && weekIdx < totalWeeks - 1 && (
          <button type="button" onClick={() => onMove(1)} title="Descendre cette semaine"
            style={{ padding: "8px 10px", background: "transparent", border: "1px solid " + BORDER, borderRadius: 8, color: "rgba(255,255,255,0.6)", fontSize: 12, cursor: "pointer", fontFamily: "inherit", flexShrink: 0 }}
          >↓</button>
        )}
        <button
          type="button"
          onClick={onDuplicate}
          style={{
            padding: isMobile ? "8px 10px" : "8px 14px", background: G_DIM, border: "1px solid rgba(2,209,186,0.3)",
            borderRadius: 10, color: G, fontSize: 11, fontWeight: 700, cursor: "pointer",
            fontFamily: "inherit", letterSpacing: 0.5, flexShrink: 0,
          }}
          title="Dupliquer cette semaine"
        >{isMobile ? "⎘" : "⎘ Dupliquer"}</button>
        <button
          type="button"
          onClick={onRemove}
          style={{
            padding: isMobile ? "8px 10px" : "8px 14px", background: "rgba(192,57,43,0.1)", border: "1px solid rgba(192,57,43,0.25)",
            borderRadius: 10, color: "#c0392b", fontSize: 11, fontWeight: 700, cursor: "pointer",
            fontFamily: "inherit", letterSpacing: 0.5, flexShrink: 0,
          }}
        >{isMobile ? "×" : "Supprimer"}</button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={(event) => {
          const { active, over } = event;
          if (!over || active.id === over.id) return;
          const oldIdx = week.sessions.findIndex((s) => s.id === active.id);
          const newIdx = week.sessions.findIndex((s) => s.id === over.id);
          if (oldIdx < 0 || newIdx < 0) return;
          onUpdate({ ...week, sessions: arrayMove(week.sessions, oldIdx, newIdx) });
        }}
      >
        <SortableContext items={(week.sessions || []).map((s) => s.id)} strategy={verticalListSortingStrategy}>
          {(week.sessions || []).map((s, i) => (
            <SortableSession key={s.id} session={s} idx={i} total={week.sessions.length}
              onUpdate={(ns) => updateSession(i, ns)}
              onRemove={() => removeSession(i)}
              onMove={(dir) => moveSession(i, dir)}
              onDuplicate={() => duplicateSession(i)}
            />
          ))}
        </SortableContext>
      </DndContext>
      <button
        type="button"
        onClick={addSession}
        style={{
          width: "100%", padding: 14, background: "transparent",
          border: "1px dashed " + BORDER, borderRadius: 14,
          color: "rgba(255,255,255,0.5)", fontSize: 12, fontWeight: 700, cursor: "pointer",
          fontFamily: "inherit", letterSpacing: 0.5,
        }}
      >+ Ajouter une séance</button>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div style={{ flex: 1, padding: "10px 14px", background: "rgba(255,255,255,0.03)", borderRadius: 10, textAlign: "center" }}>
      <div style={{ fontSize: 24, fontWeight: 200, color: "#fff", letterSpacing: -1, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", letterSpacing: 1.5, textTransform: "uppercase", marginTop: 4 }}>{label}</div>
    </div>
  );
}

function AnalyticsPanel({ programme }) {
  // Volume agrégé sur tout le programme, par groupe musculaire
  const totalByGroup = useMemo(() => {
    const acc = {};
    (programme.weeks || []).forEach((w) => {
      const wkVol = weeklyVolumeByGroup(w);
      for (const [grp, sets] of Object.entries(wkVol)) {
        acc[grp] = (acc[grp] || 0) + sets;
      }
    });
    return acc;
  }, [programme]);

  const totalSets = Object.values(totalByGroup).reduce((a, b) => a + b, 0);
  const sortedGroups = Object.entries(totalByGroup).sort((a, b) => b[1] - a[1]);

  // Balance push/pull/legs (ratio recommandé : ~1:1:1 ou 1:1.2:1.5 selon objectif)
  const pushSets = (totalByGroup["Pectoraux"] || 0) + (totalByGroup["Épaules"] || 0) + (totalByGroup["Triceps"] || 0);
  const pullSets = (totalByGroup["Dos"] || 0) + (totalByGroup["Biceps"] || 0);
  const legsSets = (totalByGroup["Quadriceps"] || 0) + (totalByGroup["Ischios"] || 0) + (totalByGroup["Fessiers"] || 0) + (totalByGroup["Mollets"] || 0);

  // Volume par semaine (pour détecter progression / deload)
  const weeklyTotals = (programme.weeks || []).map((w, i) => ({
    name: w.name || `Sem ${i + 1}`,
    sets: Object.values(weeklyVolumeByGroup(w)).reduce((a, b) => a + b, 0),
  }));
  const maxWeekly = Math.max(1, ...weeklyTotals.map((w) => w.sets));

  // Alertes : groupes oubliés (ex: 0 sets sur jambes), volume trop élevé/bas
  const alerts = [];
  if (totalByGroup["Quadriceps"] === undefined && totalByGroup["Ischios"] === undefined) {
    alerts.push({ level: "warn", msg: "Aucune séance jambes détectée." });
  }
  if (pushSets > 0 && pullSets === 0) {
    alerts.push({ level: "warn", msg: "Push sans tirage. Risque déséquilibre épaules." });
  }
  if (pushSets > 0 && pullSets > 0 && pullSets < pushSets * 0.7) {
    alerts.push({ level: "info", msg: `Tirage inférieur à push (${pullSets} vs ${pushSets} sets). Considère plus de dos.` });
  }
  const totalWeeks = (programme.weeks || []).length;
  if (totalWeeks >= 4 && weeklyTotals.every((w, i) => i === 0 || w.sets >= weeklyTotals[i - 1].sets * 0.85)) {
    // Pas de deload détecté (toutes les semaines au moins 85% de la précédente)
    alerts.push({ level: "info", msg: "Pas de semaine de récupération détectée sur 4+ semaines." });
  }

  if (totalSets === 0) {
    return (
      <div style={{ padding: 20, background: "rgba(255,255,255,0.02)", border: "1px dashed " + BORDER, borderRadius: 14, color: "rgba(255,255,255,0.4)", textAlign: "center", fontSize: 12 }}>
        Ajoute des exercices avec un format reps "NXM" pour voir les analytics.
      </div>
    );
  }

  return (
    <div>
      {/* Volume par groupe musculaire */}
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, color: G, textTransform: "uppercase", marginBottom: 10 }}>Volume par muscle</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 20 }}>
        {sortedGroups.map(([grp, sets]) => {
          const pct = (sets / totalSets) * 100;
          return (
            <div key={grp} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.7)", width: 100, flexShrink: 0 }}>{grp}</div>
              <div style={{ flex: 1, height: 8, background: "rgba(255,255,255,0.04)", borderRadius: 4, overflow: "hidden" }}>
                <div style={{ height: "100%", width: pct + "%", background: G, borderRadius: 4 }} />
              </div>
              <div style={{ fontSize: 11, color: "#fff", fontWeight: 700, width: 50, textAlign: "right", flexShrink: 0 }}>{sets} sets</div>
            </div>
          );
        })}
      </div>

      {/* Balance Push/Pull/Legs */}
      {(pushSets + pullSets + legsSets > 0) && (
        <>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, color: G, textTransform: "uppercase", marginBottom: 10 }}>Balance</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 20 }}>
            <Stat label="Push" value={pushSets} />
            <Stat label="Pull" value={pullSets} />
            <Stat label="Legs" value={legsSets} />
          </div>
        </>
      )}

      {/* Volume par semaine */}
      {weeklyTotals.length > 1 && (
        <>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, color: G, textTransform: "uppercase", marginBottom: 10 }}>Volume par semaine</div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 100, marginBottom: 20, padding: "4px 0" }}>
            {weeklyTotals.map((w, i) => (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <div style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", fontWeight: 700 }}>{w.sets}</div>
                <div style={{ width: "100%", height: ((w.sets / maxWeekly) * 80) + "px", background: G, borderRadius: 3, transition: "height 0.4s" }} />
                <div style={{ fontSize: 8, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: 1 }}>{w.name.replace("Semaine", "S")}</div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Alertes */}
      {alerts.length > 0 && (
        <>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, color: G, textTransform: "uppercase", marginBottom: 10 }}>Suggestions</div>
          {alerts.map((a, i) => (
            <div key={i} style={{ padding: 10, marginBottom: 6, background: a.level === "warn" ? "rgba(239,68,68,0.06)" : "rgba(2,209,186,0.04)", border: "1px solid " + (a.level === "warn" ? "rgba(239,68,68,0.2)" : "rgba(2,209,186,0.15)"), borderRadius: 8, fontSize: 11, color: a.level === "warn" ? "#ff8888" : "rgba(255,255,255,0.7)", lineHeight: 1.5 }}>
              <span style={{ marginRight: 6, fontWeight: 700, color: a.level === "warn" ? "#ff8888" : G }}>{a.level === "warn" ? "⚠" : "·"}</span>{a.msg}
            </div>
          ))}
        </>
      )}
    </div>
  );
}

function Preview({ programme, showAnalytics }) {
  const totalEx = (programme.weeks || []).reduce((a, w) => a + (w.sessions || []).reduce((b, s) => b + (s.exercises || []).length, 0), 0);
  const totalSessions = (programme.weeks || []).reduce((a, w) => a + (w.sessions || []).length, 0);

  if (showAnalytics) {
    return (
      <div style={{ background: "#050505", borderRadius: 16, padding: 24, height: "100%", overflowY: "auto" }}>
        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 3, color: "rgba(2,209,186,0.6)", textTransform: "uppercase", marginBottom: 16 }}>Analytics programme</div>
        <AnalyticsPanel programme={programme} />
      </div>
    );
  }

  return (
    <div style={{
      background: "#050505", borderRadius: 16, padding: 24,
      height: "100%", overflowY: "auto",
    }}>
      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 3, color: "rgba(2,209,186,0.6)", textTransform: "uppercase", marginBottom: 8 }}>
        Aperçu programme
      </div>
      <div style={{ fontSize: 28, fontWeight: 900, color: "#fff", letterSpacing: -1, marginBottom: 6 }}>
        {programme.name || "Sans nom"}
      </div>
      {programme.tagline ? <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginBottom: 16, fontStyle: "italic" }}>"{programme.tagline}"</div> : null}
      <div style={{ display: "flex", gap: 14, marginBottom: 24 }}>
        <Stat label="Semaines" value={programme.weeks.length} />
        <Stat label="Séances" value={totalSessions} />
        <Stat label="Exercices" value={totalEx} />
      </div>

      {programme.weeks.length === 0 ? (
        <div style={{
          padding: 32, textAlign: "center",
          background: "rgba(255,255,255,0.02)", border: "1px dashed " + BORDER,
          borderRadius: 14, color: "rgba(255,255,255,0.4)",
        }}>Aucune semaine. Ajoute la première semaine à gauche.</div>
      ) : null}

      {(programme.weeks || []).map((w, wi) => (
        <div key={w.id} style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, color: G, textTransform: "uppercase", marginBottom: 10 }}>{w.name || ("Semaine " + (wi + 1))}</div>
          {(w.sessions || []).map((s, si) => (
            <div key={s.id} style={{ marginBottom: 14, padding: 14, background: "rgba(255,255,255,0.02)", border: "1px solid " + BORDER, borderRadius: 12 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: "#fff", marginBottom: 8 }}>{s.name || ("Séance " + (si + 1))}</div>
              {s.description ? <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginBottom: 8 }}>{s.description}</div> : null}
              {(() => {
                const renderRow = (ex) => {
                  const effectiveVid = ex.vidUrl || findVideo(ex.name);
                  const m = effectiveVid ? effectiveVid.match(/(?:youtu\.be\/|v=)([\w-]{11})/) : null;
                  const ytId = m ? m[1] : null;
                  return (
                    <div key={ex.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                      {ytId ? (
                        <img src={"https://img.youtube.com/vi/" + ytId + "/default.jpg"} alt="" style={{ width: 40, height: 30, objectFit: "cover", borderRadius: 4 }} />
                      ) : (
                        <div style={{ width: 40, height: 30, background: "rgba(255,255,255,0.04)", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: "rgba(255,255,255,0.2)" }}>?</div>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{ex.name || "[Exercice sans nom]"}</div>
                        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>
                          {[ex.reps, ex.tempo ? "tempo " + ex.tempo : null, ex.rir ? "RIR " + ex.rir : null, ex.rest ? "repos " + ex.rest : null].filter(Boolean).join(" · ")}
                        </div>
                      </div>
                    </div>
                  );
                };
                return buildExerciseBlocks(s.exercises || []).map((block, bi) => {
                  if (!block.isSuperset) return renderRow(block.members[0].ex);
                  return (
                    <div key={"sb-" + bi} style={{ marginTop: 6, border: "1px solid rgba(2,209,186,0.2)", borderRadius: 8, padding: "0 8px 6px", background: "rgba(2,209,186,0.03)" }}>
                      <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: "rgba(2,209,186,0.8)", padding: "7px 0 2px" }}>
                        ⚡ {supersetTypeLabel(block.members.length)} · {block.key}
                      </div>
                      {block.members.map(({ ex }) => renderRow(ex))}
                    </div>
                  );
                });
              })()}
              {s.finisher ? (
                <div style={{ marginTop: 10, padding: "8px 10px", background: "rgba(239,68,68,0.05)", borderLeft: "2px solid rgba(239,68,68,0.5)", borderRadius: 6, fontSize: 11, color: "rgba(255,255,255,0.7)" }}>
                  <strong style={{ color: "rgba(239,68,68,0.85)" }}>Finisher</strong>{" — "}{s.finisher}
                </div>
              ) : null}
              {Array.isArray(s.runs) && s.runs.length > 0
                ? s.runs.map((r, ri) => (
                    <div key={ri} style={{ marginTop: ri === 0 ? 10 : 4, padding: "8px 10px", background: "rgba(2,209,186,0.05)", borderLeft: "2px solid rgba(2,209,186,0.5)", borderRadius: 6, fontSize: 11, color: "rgba(255,255,255,0.7)" }}>
                      <strong style={{ color: "rgba(2,209,186,0.85)" }}>🏃 {r.name || "Run"}</strong>
                      {[r.distance, r.duration, r.bpm ? r.bpm + " bpm" : null, r.rest].filter(Boolean).length > 0
                        ? " — " + [r.distance, r.duration, r.bpm ? r.bpm + " bpm" : null, r.rest].filter(Boolean).join(" · ")
                        : null}
                    </div>
                  ))
                : null}
              {Array.isArray(s.fieldSessions) && s.fieldSessions.length > 0
                ? s.fieldSessions.map((f, fi) => (
                    <div key={fi} style={{ marginTop: fi === 0 ? 10 : 4, padding: "8px 10px", background: "rgba(2,209,186,0.05)", borderLeft: "2px solid rgba(2,209,186,0.5)", borderRadius: 6, fontSize: 11, color: "rgba(255,255,255,0.7)" }}>
                      <strong style={{ color: "rgba(2,209,186,0.85)" }}>🏟 {f.title || "Séance terrain"}</strong>
                      {f.moment ? <span style={{ color: "rgba(255,255,255,0.45)" }}>{" · " + f.moment}</span> : null}
                      {f.description ? <div style={{ marginTop: 2, color: "rgba(255,255,255,0.5)" }}>{f.description}</div> : null}
                    </div>
                  ))
                : null}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export default function ProgrammeBuilder({ client, onClose, onSaved, existingProgramme }) {
  // Clé draft localStorage : 1 par client. Persiste entre sessions.
  const draftKey = `rb_progbuilder_draft_${client?.id || "anon"}`;
  // Autosave désactivé en mode "edit existing" (on travaille sur une copie live).
  const editMode = !!(existingProgramme && existingProgramme.html_content);

  const [programme, setProgramme] = useState(() => {
    if (editMode) {
      try {
        const ParserMod = require("../utils/parserProgramme");
        const parsed = ParserMod.parseProgrammeHTML(existingProgramme.html_content);
        const restored = fromParsed(parsed);
        if (restored && restored.weeks && restored.weeks.length > 0) {
          // start_date / training_days vivent dans des colonnes DB séparées
          // (pas dans le HTML). Sans ça, l'utilisateur voit les champs vides
          // a chaque réouverture → impression que "ça ne sauvegarde pas".
          return {
            ...restored,
            startDate: existingProgramme.start_date || "",
            trainingDays: Array.isArray(existingProgramme.training_days) && existingProgramme.training_days.length
              ? existingProgramme.training_days
              : [1],
          };
        }
      } catch (e) { console.warn("[ProgrammeBuilder] parse existing failed:", e); }
    }
    // Tente de restaurer un draft localStorage (mode création)
    try {
      const raw = localStorage.getItem(draftKey);
      if (raw) {
        const draft = JSON.parse(raw);
        if (draft && draft.weeks && draft.weeks.length > 0 && (Date.now() - (draft.savedAt || 0)) < 14 * 24 * 3600 * 1000) {
          return draft;
        }
      }
    } catch {}
    return {
      name: "",
      clientName: (client && client.full_name) ? client.full_name : "",
      duration: "",
      tagline: "",
      objective: "",
      weeks: [newWeek(1)],
    };
  });
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  // Brouillon restauré ? Lu une seule fois au mount.
  const [draftRestoredAt, setDraftRestoredAt] = useState(() => {
    if (editMode) return null;
    try {
      const raw = localStorage.getItem(`rb_progbuilder_draft_${client?.id || "anon"}`);
      if (!raw) return null;
      const d = JSON.parse(raw);
      const ts = d?.savedAt;
      if (ts && (Date.now() - ts) < 14 * 24 * 3600 * 1000 && d?.weeks?.length > 0) return ts;
    } catch {}
    return null;
  });
  const [showPublishMenu, setShowPublishMenu] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleDate, setScheduleDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(8, 0, 0, 0);
    return d.toISOString().slice(0, 16);
  });
  // Hook C : modal "logger paiement" déclenchée après save si la période en
  // cours du client est dépassée OU pas définie. Skippable.
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentCoachId, setPaymentCoachId] = useState(null);
  const [autosavedAt, setAutosavedAt] = useState(0);
  const [showTemplates, setShowTemplates] = useState(!editMode && (programme.weeks?.length === 1 && programme.weeks[0].sessions?.[0]?.exercises?.[0]?.name === "" && !programme.name));
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showApplyMulti, setShowApplyMulti] = useState(false);
  const [coachClients, setCoachClients] = useState([]);
  const [selectedClients, setSelectedClients] = useState([]);
  const [applying, setApplying] = useState(false);
  const [coachTemplates, setCoachTemplates] = useState([]);
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [tplName, setTplName] = useState("");
  const [tplDesc, setTplDesc] = useState("");
  const [savingTpl, setSavingTpl] = useState(false);

  // Mobile responsive : breakpoint 768px ; on bascule en single-pane avec
  // tabs Edit/Preview (sinon le split 50/50 = ~190px chacun sur iPhone).
  const isMobile = useIsMobile();
  const [mobileView, setMobileView] = useState("edit"); // "edit" | "preview"
  const dragSensors = useDragSensors();

  // Autosave debounce 800ms (uniquement mode création, pas edit)
  useEffect(() => {
    if (editMode) return;
    const t = setTimeout(() => {
      try {
        const draft = { ...programme, savedAt: Date.now() };
        localStorage.setItem(draftKey, JSON.stringify(draft));
        setAutosavedAt(Date.now());
      } catch {}
    }, 800);
    return () => clearTimeout(t);
  }, [programme, draftKey, editMode]);

  const applyTemplate = (tplId) => {
    const tpl = TEMPLATES.find((t) => t.id === tplId);
    if (!tpl) return;
    if (programme.weeks.some((w) => w.sessions.some((s) => s.exercises.some((e) => e.name)))) {
      if (!window.confirm("Appliquer le template '" + tpl.name + "' va remplacer ton programme actuel. Continuer ?")) return;
    }
    const fresh = tpl.build();
    setProgramme({
      ...fresh,
      clientName: (client && client.full_name) ? client.full_name : fresh.clientName,
    });
    setShowTemplates(false);
  };

  const clearDraft = () => {
    try { localStorage.removeItem(draftKey); } catch {}
    setDraftRestoredAt(null);
  };

  // Charge les templates perso du coach (pour les afficher dans la modal Templates)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const userResp = await supabase.auth.getUser();
        const email = userResp?.data?.user?.email;
        if (!email) return;
        const { data: coach } = await supabase.from("coaches").select("id").eq("email", email).maybeSingle();
        if (!coach?.id) return;
        const { data } = await supabase.from("coach_programme_templates")
          .select("id, name, description, html_content, weeks_count, sessions_count, exercises_count, created_at")
          .eq("coach_id", coach.id)
          .order("created_at", { ascending: false });
        if (!cancelled) setCoachTemplates(data || []);
      } catch (e) { console.warn("[ProgrammeBuilder] coach templates load failed:", e); }
    })();
    return () => { cancelled = true; };
  }, []);

  const saveAsTemplate = async () => {
    if (!tplName.trim()) { alert("Donne un nom au template."); return; }
    setSavingTpl(true);
    try {
      const userResp = await supabase.auth.getUser();
      const email = userResp?.data?.user?.email;
      const { data: coach } = await supabase.from("coaches").select("id").eq("email", email).maybeSingle();
      if (!coach?.id) throw new Error("Coach non trouvé");
      const html = buildHTML(programme);
      const totalSessions = (programme.weeks || []).reduce((a, w) => a + (w.sessions || []).length, 0);
      const totalEx = (programme.weeks || []).reduce((a, w) => a + (w.sessions || []).reduce((b, s) => b + (s.exercises || []).length, 0), 0);
      const { data: inserted, error } = await supabase.from("coach_programme_templates").insert({
        coach_id: coach.id,
        name: tplName.trim(),
        description: tplDesc.trim() || null,
        html_content: html,
        weeks_count: (programme.weeks || []).length,
        sessions_count: totalSessions,
        exercises_count: totalEx,
      }).select().single();
      if (error) throw error;
      setCoachTemplates((prev) => [inserted, ...prev]);
      setShowSaveTemplate(false);
      setTplName("");
      setTplDesc("");
      alert("Template sauvegardé.");
    } catch (e) {
      alert("Erreur : " + (e.message || "inconnue"));
    } finally {
      setSavingTpl(false);
    }
  };

  const applyCoachTemplate = (tpl) => {
    if (programme.weeks.some((w) => w.sessions.some((s) => s.exercises.some((e) => e.name)))) {
      if (!window.confirm("Appliquer le template '" + tpl.name + "' va remplacer ton programme actuel. Continuer ?")) return;
    }
    try {
      const ParserMod = require("../utils/parserProgramme");
      const parsed = ParserMod.parseProgrammeHTML(tpl.html_content);
      const restored = fromParsed(parsed);
      if (restored && restored.weeks?.length > 0) {
        setProgramme({
          ...restored,
          name: tpl.name + " (depuis template)",
          clientName: (client && client.full_name) || restored.clientName,
        });
        setShowTemplates(false);
      }
    } catch (e) { alert("Erreur lecture template : " + e.message); }
  };

  const deleteCoachTemplate = async (tplId) => {
    if (!window.confirm("Supprimer ce template ?")) return;
    try {
      const { error } = await supabase.from("coach_programme_templates").delete().eq("id", tplId);
      if (error) throw error;
      setCoachTemplates((prev) => prev.filter((t) => t.id !== tplId));
    } catch (e) { alert("Erreur : " + e.message); }
  };

  // Charge la liste des clients du coach connecté pour le multi-apply
  const loadCoachClients = async () => {
    try {
      const userResp = await supabase.auth.getUser();
      const email = userResp?.data?.user?.email;
      if (!email) return;
      const { data: coach } = await supabase.from("coaches").select("id").eq("email", email).maybeSingle();
      if (!coach?.id) return;
      const { data } = await supabase.from("clients").select("id, full_name, email, programmes(id, is_active)").eq("coach_id", coach.id).order("full_name");
      setCoachClients(data || []);
    } catch (e) {
      console.error("[ProgrammeBuilder] loadCoachClients:", e);
    }
  };

  const openApplyMulti = async () => {
    if (!programme.name?.trim()) { alert("Sauvegarde le programme d'abord ou nomme-le."); return; }
    await loadCoachClients();
    setSelectedClients([]);
    setShowApplyMulti(true);
  };

  const applyToSelectedClients = async () => {
    if (selectedClients.length === 0) return;
    setApplying(true);
    try {
      const html = buildHTML(programme);
      const userResp = await supabase.auth.getUser();
      const email = userResp?.data?.user?.email || null;
      // Désactive les anciens programmes actifs des clients sélectionnés
      await supabase.from("programmes").update({ is_active: false }).in("client_id", selectedClients);
      // Insert le nouveau pour chaque — published_at NOW pour visibilité client
      const nowIso = new Date().toISOString();
      const inserts = selectedClients.map((clientId) => ({
        client_id: clientId,
        programme_name: programme.name,
        html_content: html,
        is_active: true,
        published_at: nowIso,
        uploaded_by: email,
      }));
      const { error } = await supabase.from("programmes").insert(inserts);
      if (error) throw error;
      setShowApplyMulti(false);
      alert("Programme appliqué à " + selectedClients.length + " client" + (selectedClients.length > 1 ? "s" : "") + ".");
      setSelectedClients([]);
    } catch (e) {
      alert("Erreur : " + (e.message || "inconnue"));
    } finally {
      setApplying(false);
    }
  };

  const update = (k, v) => setProgramme((p) => ({ ...p, [k]: v }));
  const updateWeek = (idx, w) => setProgramme((p) => ({ ...p, weeks: p.weeks.map((x, i) => i === idx ? w : x) }));
  const addWeek = () => setProgramme((p) => ({ ...p, weeks: [...p.weeks, newWeek(p.weeks.length + 1)] }));
  const duplicateWeek = (idx) => setProgramme((p) => {
    const orig = p.weeks[idx];
    const dup = JSON.parse(JSON.stringify(orig));
    dup.id = uid();
    dup.name = orig.name + " (copie)";
    dup.sessions = (dup.sessions || []).map((s) => ({ ...s, id: uid(), exercises: (s.exercises || []).map((e) => ({ ...e, id: uid() })) }));
    return { ...p, weeks: [...p.weeks.slice(0, idx + 1), dup, ...p.weeks.slice(idx + 1)] };
  });
  const removeWeek = (idx) => {
    const w = programme.weeks[idx];
    if (!w) return;
    const nbEx = (w.sessions || []).reduce((a, s) => a + (s.exercises || []).length, 0);
    if (!window.confirm("Supprimer " + w.name + " (" + (w.sessions || []).length + " séances, " + nbEx + " exercices) ?")) return;
    setProgramme((p) => ({ ...p, weeks: p.weeks.filter((_, i) => i !== idx) }));
  };

  // mode: "draft" | "publish-now" | "schedule"
  // scheduledAt: ISO string (only for "schedule")
  const persistProgramme = async (mode, scheduledAt = null) => {
    if (!programme.name || !programme.name.trim()) { alert("Donne un nom au programme avant de sauvegarder."); return; }
    if (!client || !client.id) { alert("Pas de client cible."); return; }
    if (mode === "schedule") {
      if (!scheduledAt) { alert("Choisis une date de publication."); return; }
      if (new Date(scheduledAt) <= new Date()) { alert("La date doit être dans le futur."); return; }
    }
    setSaving(true);
    try {
      const html = buildHTML(programme);
      const userResp = await supabase.auth.getUser();
      const email = userResp && userResp.data && userResp.data.user ? userResp.data.user.email : null;

      // Cleanup avant insert :
      //  - draft     : on supprime juste l'ancien brouillon (is_active=false, published_at IS NULL)
      //                — l'éventuel programme en cours ou planifié reste intact
      //  - publish   : reset complet (current behavior) — un seul programme actif après
      //  - schedule  : on supprime brouillons + autres programmes planifiés (futurs).
      //                On GARDE le programme en cours pour que le client continue à l'avoir
      //                jusqu'à la date X. Le filtre côté client (`published_at <= NOW()`) prend
      //                automatiquement le plus récent quand X est passé.
      if (mode === "draft") {
        await supabase.from("programmes").delete()
          .eq("client_id", client.id)
          .eq("is_active", false)
          .is("published_at", null);
      } else if (mode === "publish-now") {
        await supabase.from("programmes").delete().eq("client_id", client.id);
      } else if (mode === "schedule") {
        // Supprime brouillons + autres "scheduled" (published_at futur)
        await supabase.from("programmes").delete()
          .eq("client_id", client.id)
          .eq("is_active", false)
          .is("published_at", null);
        await supabase.from("programmes").delete()
          .eq("client_id", client.id)
          .eq("is_active", true)
          .gt("published_at", new Date().toISOString());
      }

      const isActive = mode !== "draft";
      const publishedAt = mode === "publish-now" ? new Date().toISOString()
                       : mode === "schedule"     ? scheduledAt
                       : null;

      const { data: inserted, error } = await supabase.from("programmes").insert({
        client_id: client.id,
        programme_name: programme.name,
        html_content: html,
        is_active: isActive,
        published_at: publishedAt,
        uploaded_by: email,
        start_date: programme.startDate || new Date().toISOString().slice(0, 10),
        training_days: (programme.trainingDays && programme.trainingDays.length) ? programme.trainingDays : [1],
      }).select("id").maybeSingle();
      if (error) throw error;
      addBreadcrumb({ category: "programme", message: `programme_${mode}`, data: { clientId: client.id, hasScheduled: !!scheduledAt }, level: "info" });
      clearDraft();
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2500);
      if (typeof onSaved === "function") onSaved();

      // Notif instantanée "ton programme est dispo" quand on publie maintenant.
      // Pour les programmes planifiés futur, la cron prend le relais à published_at.
      if (mode === "publish-now" && inserted?.id) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          fetch("/api/notify-client-programme-published", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${session?.access_token || ""}`,
            },
            body: JSON.stringify({ programmeId: inserted.id }),
          }).catch(() => {}); // best-effort, la cron rattrappe au pire
        } catch (_) { /* noop */ }
      }

      // Hook C : check paiement uniquement quand on publie réellement (pas en draft)
      if (mode !== "draft") {
        try {
          const status = await checkPaymentNeeded(client.id);
          if (status.needs) {
            const { data: { user } } = await supabase.auth.getUser();
            if (user?.id) {
              setPaymentCoachId(user.id);
              setShowPaymentModal(true);
            }
          }
        } catch (_) { /* non bloquant */ }
      }
    } catch (e) {
      console.error("[ProgrammeBuilder] save error:", e);
      alert("Erreur de sauvegarde : " + (e.message || "inconnue"));
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDraft = () => { setShowPublishMenu(false); persistProgramme("draft"); };
  const handlePublishNow = () => { setShowPublishMenu(false); persistProgramme("publish-now"); };
  const handleSchedule = () => {
    setShowPublishMenu(false);
    setShowScheduleModal(true);
  };
  const confirmSchedule = () => {
    const iso = new Date(scheduleDate).toISOString();
    setShowScheduleModal(false);
    persistProgramme("schedule", iso);
  };

  return (
    <div style={{
      position: "absolute", top: 0, right: 0, bottom: 0, left: 0,
      background: BG, color: "#fff", fontFamily: "Inter,-apple-system,sans-serif",
      display: "flex", flexDirection: "column",
      // Safe-area iOS : sans ça, sur iPhone avec notch/Dynamic Island, le
      // bouton Retour passe derriere la zone système et devient incliquable.
      paddingTop: "env(safe-area-inset-top)",
      paddingBottom: "env(safe-area-inset-bottom)",
      // Empeche le swipe horizontal global (un input large quelque part dans
      // l'arborescence pousse le viewport — on contient à la racine).
      overflowX: "hidden",
      maxWidth: "100vw",
    }}>
      {showSaveTemplate ? (
        <div style={{ position: "absolute", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.65)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: BG_2, border: "1px solid " + BORDER, borderRadius: 18, maxWidth: 460, width: "100%", padding: 28 }}>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 3, color: G, textTransform: "uppercase", marginBottom: 6 }}>Template perso</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", letterSpacing: -0.5, marginBottom: 8 }}>Sauvegarder ce programme</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginBottom: 18 }}>Réutilisable dans la modal Templates pour tes prochains programmes.</div>
            <TextField label="Nom du template" value={tplName} onChange={setTplName} placeholder="ex: PPL Hypertrophie 4 sem" />
            <div style={{ height: 10 }} />
            <TextField label="Description (optionnel)" value={tplDesc} onChange={setTplDesc} placeholder="ex: Volume → intensité, intermédiaire" />
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 18 }}>
              <button type="button" onClick={() => setShowSaveTemplate(false)} style={{ padding: "10px 18px", background: "rgba(255,255,255,0.05)", border: "1px solid " + BORDER, borderRadius: 10, color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", letterSpacing: 0.5 }}>Annuler</button>
              <button type="button" onClick={saveAsTemplate} disabled={savingTpl || !tplName.trim()}
                style={{ padding: "10px 22px", background: savingTpl || !tplName.trim() ? "rgba(2,209,186,0.2)" : "linear-gradient(135deg, " + G + ", #0891b2)", border: "none", borderRadius: 10, color: "#000", fontSize: 12, fontWeight: 800, cursor: savingTpl || !tplName.trim() ? "not-allowed" : "pointer", fontFamily: "inherit", letterSpacing: 0.5, textTransform: "uppercase", opacity: savingTpl || !tplName.trim() ? 0.5 : 1 }}
              >{savingTpl ? "Sauvegarde…" : "Sauvegarder"}</button>
            </div>
          </div>
        </div>
      ) : null}

      {showApplyMulti ? (
        <div style={{ position: "absolute", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.65)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, overflowY: "auto" }}>
          <div style={{ background: BG_2, border: "1px solid " + BORDER, borderRadius: 18, maxWidth: 580, width: "100%", padding: 28, maxHeight: "90vh", display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 18 }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 3, color: G, textTransform: "uppercase", marginBottom: 6 }}>Bulk apply</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", letterSpacing: -0.5 }}>Appliquer à plusieurs clients</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginTop: 6 }}>"{programme.name}" deviendra leur programme actif. Les anciens seront désactivés.</div>
              </div>
              <button type="button" onClick={() => setShowApplyMulti(false)} style={{ width: 32, height: 32, borderRadius: 8, background: "transparent", border: "1px solid " + BORDER, color: "rgba(255,255,255,0.6)", cursor: "pointer", fontSize: 16 }}>×</button>
            </div>

            <div style={{ flex: 1, overflowY: "auto", marginBottom: 16, paddingRight: 4 }}>
              {coachClients.length === 0 ? (
                <div style={{ padding: 24, textAlign: "center", background: "rgba(255,255,255,0.02)", border: "1px dashed " + BORDER, borderRadius: 12, color: "rgba(255,255,255,0.5)", fontSize: 13 }}>
                  Aucun client trouvé.
                </div>
              ) : (
                <>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10, padding: "0 4px" }}>
                    <button type="button" onClick={() => setSelectedClients(coachClients.map((c) => c.id))} style={{ background: "transparent", border: "none", color: G, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", padding: 0 }}>Tout sélectionner</button>
                    <button type="button" onClick={() => setSelectedClients([])} style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.5)", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", padding: 0 }}>Désélectionner</button>
                  </div>
                  {coachClients.map((c) => {
                    const sel = selectedClients.includes(c.id);
                    const hasActive = (c.programmes || []).some((p) => p.is_active);
                    return (
                      <div key={c.id} onClick={() => setSelectedClients((s) => sel ? s.filter((id) => id !== c.id) : [...s, c.id])}
                        style={{
                          display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", marginBottom: 6, cursor: "pointer",
                          background: sel ? "rgba(2,209,186,0.08)" : "rgba(255,255,255,0.025)",
                          border: "1px solid " + (sel ? "rgba(2,209,186,0.35)" : BORDER),
                          borderRadius: 10, transition: "all .12s",
                        }}
                      >
                        <div style={{ width: 22, height: 22, borderRadius: 6, border: "2px solid " + (sel ? G : "rgba(255,255,255,0.15)"), background: sel ? G : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 13, color: "#000", fontWeight: 800 }}>{sel ? "✓" : ""}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, color: "#fff", fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.full_name || "(sans nom)"}</div>
                          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>{c.email}</div>
                        </div>
                        {hasActive ? (
                          <div style={{ fontSize: 9, padding: "3px 8px", background: "rgba(255,165,0,0.1)", border: "1px solid rgba(255,165,0,0.25)", borderRadius: 100, color: "rgba(255,165,0,0.8)", fontWeight: 700, letterSpacing: 0.5, flexShrink: 0 }}>PROG ACTIF</div>
                        ) : null}
                      </div>
                    );
                  })}
                </>
              )}
            </div>

            <div style={{ display: "flex", gap: 10, justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)" }}>{selectedClients.length} client{selectedClients.length > 1 ? "s" : ""} sélectionné{selectedClients.length > 1 ? "s" : ""}</div>
              <div style={{ display: "flex", gap: 10 }}>
                <button type="button" onClick={() => setShowApplyMulti(false)} style={{ padding: "10px 18px", background: "rgba(255,255,255,0.05)", border: "1px solid " + BORDER, borderRadius: 10, color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", letterSpacing: 0.5 }}>Annuler</button>
                <button type="button" disabled={applying || selectedClients.length === 0} onClick={applyToSelectedClients}
                  style={{ padding: "10px 22px", background: applying || selectedClients.length === 0 ? "rgba(2,209,186,0.2)" : "linear-gradient(135deg, " + G + ", #0891b2)", border: "none", borderRadius: 10, color: "#000", fontSize: 12, fontWeight: 800, cursor: applying || selectedClients.length === 0 ? "not-allowed" : "pointer", fontFamily: "inherit", letterSpacing: 0.5, textTransform: "uppercase", opacity: applying || selectedClients.length === 0 ? 0.5 : 1 }}
                >{applying ? "Application…" : "Appliquer"}</button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {showTemplates ? (
        <div style={{ position: "absolute", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.65)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, overflowY: "auto" }}>
          <div style={{ background: BG_2, border: "1px solid " + BORDER, borderRadius: 18, maxWidth: 720, width: "100%", padding: 28 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 18 }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 3, color: G, textTransform: "uppercase", marginBottom: 6 }}>Démarrer rapidement</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", letterSpacing: -0.5 }}>Choisis un template</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginTop: 6 }}>Tu remplis le squelette via l'autocomplete exos. Tu modifies tout après.</div>
              </div>
              <button type="button" onClick={() => setShowTemplates(false)} style={{ width: 32, height: 32, borderRadius: 8, background: "transparent", border: "1px solid " + BORDER, color: "rgba(255,255,255,0.6)", cursor: "pointer", fontSize: 16 }}>×</button>
            </div>
            {coachTemplates.length > 0 ? (
              <>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 10, fontWeight: 700, letterSpacing: 2, color: G, textTransform: "uppercase", marginBottom: 10 }}>
                  <ToolbarIcon name="star" size={11} />
                  Mes templates
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 22 }}>
                  {coachTemplates.map((tpl) => (
                    <div key={tpl.id} style={{ position: "relative", padding: 18, background: "rgba(2,209,186,0.04)", border: "1px solid rgba(2,209,186,0.2)", borderRadius: 14 }}>
                      <button type="button" onClick={() => applyCoachTemplate(tpl)}
                        style={{ display: "block", width: "100%", textAlign: "left", background: "transparent", border: "none", padding: 0, cursor: "pointer", fontFamily: "inherit", color: "#fff" }}
                      >
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(2,209,186,0.12)", display: "flex", alignItems: "center", justifyContent: "center", color: G, marginBottom: 12 }}>
                          <ToolbarIcon name="star" size={18} />
                        </div>
                        <div style={{ fontSize: 14, fontWeight: 800, color: "#fff", marginBottom: 4 }}>{tpl.name}</div>
                        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", lineHeight: 1.5 }}>{tpl.description || `${tpl.weeks_count || "?"} sem · ${tpl.sessions_count || "?"} séances · ${tpl.exercises_count || "?"} exos`}</div>
                      </button>
                      <button type="button" onClick={(e) => { e.stopPropagation(); deleteCoachTemplate(tpl.id); }}
                        style={{ position: "absolute", top: 6, right: 6, width: 22, height: 22, borderRadius: 6, background: "transparent", border: "1px solid " + BORDER, color: "rgba(255,255,255,0.4)", cursor: "pointer", fontSize: 12, fontFamily: "inherit" }}
                        title="Supprimer ce template"
                      >×</button>
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, color: "rgba(255,255,255,0.45)", textTransform: "uppercase", marginBottom: 10 }}>Templates par défaut</div>
              </>
            ) : null}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {TEMPLATES.map((tpl) => (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => applyTemplate(tpl.id)}
                  style={{ padding: 18, background: "rgba(255,255,255,0.025)", border: "1px solid " + BORDER, borderRadius: 14, textAlign: "left", cursor: "pointer", fontFamily: "inherit", color: "#fff", transition: "all .15s" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(2,209,186,0.06)"; e.currentTarget.style.borderColor = "rgba(2,209,186,0.3)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.025)"; e.currentTarget.style.borderColor = BORDER; }}
                >
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(2,209,186,0.08)", display: "flex", alignItems: "center", justifyContent: "center", color: G, marginBottom: 12 }}>
                    {tpl.iconKey ? React.cloneElement(TPL_ICONS[tpl.iconKey], { width: 20, height: 20 }) : null}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: "#fff", marginBottom: 4 }}>{tpl.name}</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", lineHeight: 1.5 }}>{tpl.desc}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: isMobile ? "10px 12px" : "14px 22px", borderBottom: "1px solid " + BORDER, background: BG_2, flexShrink: 0,
        gap: 8,
        position: "relative", zIndex: 10,
        maxWidth: "100%",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 8 : 14, minWidth: 0 }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: isMobile ? "8px 10px" : "8px 14px", background: "transparent", border: "1px solid " + BORDER,
              borderRadius: 10, color: "rgba(255,255,255,0.6)", fontSize: 12, cursor: "pointer", fontFamily: "inherit",
              flexShrink: 0,
            }}
          >←{isMobile ? "" : " Retour"}</button>
          <div style={{ minWidth: 0, overflow: "hidden" }}>
            <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: 3, color: G, textTransform: "uppercase" }}>{isMobile ? "Builder" : "Programme Builder"}</div>
            <div style={{ fontSize: isMobile ? 11 : 13, color: "rgba(255,255,255,0.7)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>Pour <strong>{(client && client.full_name) || "—"}</strong></div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 6 : 10, flexShrink: 0 }}>
          {/* Status indicator — caché sur mobile pour économiser la largeur */}
          {!isMobile && !editMode && !savedFlash && autosavedAt > 0 ? (
            <span title="Brouillon auto-sauvegardé" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 10, color: "rgba(255,255,255,0.35)", letterSpacing: 1, textTransform: "uppercase", fontWeight: 600 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "rgba(255,255,255,0.3)" }} />
              Brouillon
            </span>
          ) : null}
          {!isMobile && savedFlash ? (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 10, color: G, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: G, boxShadow: `0 0 8px ${G}` }} />
              Enregistré
            </span>
          ) : null}

          {/* Boutons secondaires — caches sur mobile pour ne pas wrapper */}
          {!isMobile && !editMode && (
            <button
              type="button"
              onClick={() => setShowTemplates(true)}
              title="Templates"
              style={{
                display: "inline-flex", alignItems: "center", gap: 7,
                padding: "8px 12px", background: "rgba(255,255,255,0.03)",
                border: "1px solid " + BORDER, borderRadius: 10, color: "rgba(255,255,255,0.7)",
                fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
              }}
            >
              <ToolbarIcon name="templates" />
              <span>Templates</span>
            </button>
          )}
          {!isMobile && (
            <button
              type="button"
              onClick={async () => {
                try { await exportProgrammePDF(programme); }
                catch (e) { console.error(e); alert("Erreur PDF : " + e.message); }
              }}
              title="Export PDF"
              style={{
                display: "inline-flex", alignItems: "center", gap: 7,
                padding: "8px 12px", background: "rgba(255,255,255,0.03)",
                border: "1px solid " + BORDER, borderRadius: 10, color: "rgba(255,255,255,0.7)",
                fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
              }}
            >
              <ToolbarIcon name="pdf" />
              <span>PDF</span>
            </button>
          )}
          {!isMobile && (
            <button
              type="button"
              onClick={() => {
                try {
                  const json = JSON.stringify(programme, null, 2);
                  const blob = new Blob([json], { type: "application/json" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `programme-${(programme.name || "rb-perform").toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40)}.json`;
                  document.body.appendChild(a); a.click(); a.remove();
                  URL.revokeObjectURL(url);
                } catch (e) { alert("Erreur export JSON : " + e.message); }
              }}
              title="Export JSON (pour outil PDF standalone)"
              style={{
                display: "inline-flex", alignItems: "center", gap: 7,
                padding: "8px 12px", background: "rgba(255,255,255,0.03)",
                border: "1px solid " + BORDER, borderRadius: 10, color: "rgba(255,255,255,0.7)",
                fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <text x="6" y="17" fontSize="6" fill="currentColor" stroke="none" fontFamily="monospace" fontWeight="bold">{ }</text>
              </svg>
              <span>JSON</span>
            </button>
          )}
          {!isMobile && (
            <button
              type="button"
              onClick={openApplyMulti}
              title="Appliquer à plusieurs clients"
              style={{
                display: "inline-flex", alignItems: "center", gap: 7,
                padding: "8px 12px", background: "rgba(255,255,255,0.03)",
                border: "1px solid " + BORDER, borderRadius: 10, color: "rgba(255,255,255,0.7)",
                fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
              }}
            >
              <ToolbarIcon name="users" />
              <span>Multi-clients</span>
            </button>
          )}
          {!isMobile && (
            <button
              type="button"
              onClick={() => setShowSaveTemplate(true)}
              title="Sauver comme template"
              style={{
                display: "inline-flex", alignItems: "center", gap: 7,
                padding: "8px 12px", background: "rgba(255,255,255,0.03)",
                border: "1px solid " + BORDER, borderRadius: 10, color: "rgba(255,255,255,0.7)",
                fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
              }}
            >
              <ToolbarIcon name="star" />
              <span>Template</span>
            </button>
          )}
          <div style={{ position: "relative", display: "inline-block" }}>
            <button
              type="button"
              onClick={() => setShowPublishMenu((v) => !v)}
              disabled={saving}
              style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: isMobile ? "8px 12px" : "10px 18px",
                background: "linear-gradient(135deg, " + G + ", #0891b2)",
                border: "none", borderRadius: 10, color: "#000",
                fontSize: isMobile ? 11 : 12, fontWeight: 800, cursor: saving ? "wait" : "pointer",
                fontFamily: "inherit", letterSpacing: 0.5, textTransform: "uppercase",
                boxShadow: "0 6px 20px rgba(2,209,186,0.25)",
              }}
            >
              {!saving && <ToolbarIcon name="save" size={14} />}
              <span>{saving ? (isMobile ? "…" : "Sauvegarde…") : (isMobile ? "OK" : "Publier")}</span>
              <span style={{ fontSize: 9, opacity: 0.7 }}>▾</span>
            </button>
            {showPublishMenu && !saving && (
              <div
                style={{
                  position: "absolute", top: "calc(100% + 6px)", right: 0, zIndex: 9999,
                  minWidth: 240, background: "#0a0a0a",
                  border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12,
                  boxShadow: "0 16px 40px rgba(0,0,0,0.6)", overflow: "hidden",
                }}
                onMouseLeave={() => setShowPublishMenu(false)}
              >
                <button
                  type="button" onClick={handlePublishNow}
                  style={{ display: "block", width: "100%", textAlign: "left", padding: "12px 14px", background: "transparent", border: "none", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
                  onMouseEnter={(e) => e.currentTarget.style.background = "rgba(2,209,186,0.08)"}
                  onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                >
                  <div>Publier maintenant</div>
                  <div style={{ fontSize: 10, fontWeight: 500, color: "rgba(255,255,255,0.5)", marginTop: 2 }}>Le client le voit immédiatement</div>
                </button>
                <button
                  type="button" onClick={handleSchedule}
                  style={{ display: "block", width: "100%", textAlign: "left", padding: "12px 14px", background: "transparent", border: "none", borderTop: "1px solid rgba(255,255,255,0.06)", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
                  onMouseEnter={(e) => e.currentTarget.style.background = "rgba(2,209,186,0.08)"}
                  onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                >
                  <div>Planifier la publication</div>
                  <div style={{ fontSize: 10, fontWeight: 500, color: "rgba(255,255,255,0.5)", marginTop: 2 }}>Bascule auto à une date / heure</div>
                </button>
                <button
                  type="button" onClick={handleSaveDraft}
                  style={{ display: "block", width: "100%", textAlign: "left", padding: "12px 14px", background: "transparent", border: "none", borderTop: "1px solid rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.7)", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
                  onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.04)"}
                  onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                >
                  <div>Enregistrer en brouillon</div>
                  <div style={{ fontSize: 10, fontWeight: 500, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>Pas envoyé au client</div>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bannière "brouillon restauré" — non-bloquant, dismissible */}
      {draftRestoredAt && !editMode && (
        <div style={{
          padding: "10px 16px", background: "rgba(2,209,186,0.08)",
          borderBottom: "1px solid rgba(2,209,186,0.15)",
          display: "flex", alignItems: "center", gap: 10, flexShrink: 0,
          fontSize: 12, color: "rgba(255,255,255,0.75)",
        }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: G, flexShrink: 0 }} />
          <span style={{ flex: 1 }}>
            Brouillon récupéré · sauvegardé {(() => {
              const m = Math.round((Date.now() - draftRestoredAt) / 60000);
              if (m < 1) return "à l'instant";
              if (m < 60) return `il y a ${m} min`;
              const h = Math.round(m / 60);
              if (h < 24) return `il y a ${h}h`;
              return `il y a ${Math.round(h / 24)}j`;
            })()}
          </span>
          <button
            type="button"
            onClick={() => {
              if (window.confirm("Supprimer le brouillon ?")) {
                clearDraft();
                setProgramme({ name: "", clientName: (client && client.full_name) || "", duration: "", tagline: "", objective: "", weeks: [newWeek(1)] });
              }
            }}
            style={{ padding: "4px 10px", background: "transparent", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, color: "rgba(255,255,255,0.55)", fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", letterSpacing: 0.3, textTransform: "uppercase" }}
          >Nettoyer</button>
        </div>
      )}

      {/* Tabs Edit/Preview — uniquement mobile */}
      {isMobile && (
        <div style={{ display: "flex", borderBottom: "1px solid " + BORDER, background: BG_2, flexShrink: 0 }}>
          <button
            type="button"
            onClick={() => setMobileView("edit")}
            style={{
              flex: 1, padding: "10px 0", background: "transparent",
              border: "none", borderBottom: "2px solid " + (mobileView === "edit" ? G : "transparent"),
              color: mobileView === "edit" ? G : "rgba(255,255,255,0.5)",
              fontSize: 11, fontWeight: 800, letterSpacing: 1.5, textTransform: "uppercase",
              cursor: "pointer", fontFamily: "inherit",
            }}
          >Édition</button>
          <button
            type="button"
            onClick={() => setMobileView("preview")}
            style={{
              flex: 1, padding: "10px 0", background: "transparent",
              border: "none", borderBottom: "2px solid " + (mobileView === "preview" ? G : "transparent"),
              color: mobileView === "preview" ? G : "rgba(255,255,255,0.5)",
              fontSize: 11, fontWeight: 800, letterSpacing: 1.5, textTransform: "uppercase",
              cursor: "pointer", fontFamily: "inherit",
            }}
          >Aperçu</button>
        </div>
      )}

      <div style={{
        flex: 1,
        display: isMobile ? "block" : "grid",
        gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
        gap: 0, overflow: "hidden", position: "relative",
      }}>
        <div style={{
          overflowY: "auto",
          overflowX: "hidden",
          padding: isMobile ? 14 : 22,
          borderRight: isMobile ? "none" : "1px solid " + BORDER,
          display: isMobile && mobileView !== "edit" ? "none" : "block",
          height: isMobile ? "100%" : "auto",
          maxWidth: "100%",
        }}>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 2, color: "rgba(2,209,186,0.6)", textTransform: "uppercase", marginBottom: 12 }}>Informations</div>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 8, marginBottom: 22 }}>
            <TextField label="Nom du programme" value={programme.name} onChange={(v) => update("name", v)} placeholder="ex : PRISE DE MASSE 12 SEM." />
            <TextField label="Client" value={programme.clientName} onChange={(v) => update("clientName", v)} placeholder="Prénom Nom" />
            <TextField label="Durée" value={programme.duration} onChange={(v) => update("duration", v)} placeholder="ex : 12" />
            <TextField label="Objectif" value={programme.objective} onChange={(v) => update("objective", v)} placeholder="prise-de-masse" />
            <div style={{ gridColumn: "span 2" }}>
              <TextField label="Tagline" value={programme.tagline} onChange={(v) => update("tagline", v)} placeholder="ex : LA DISCIPLINE EST LA CLÉ DU SUCCÈS" />
            </div>
          </div>

          {/* === CALENDRIER === */}
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 2, color: "rgba(2,209,186,0.6)", textTransform: "uppercase", marginBottom: 12 }}>Calendrier</div>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 8, marginBottom: 12 }}>
            <div>
              <label style={{ fontSize: 10, color: "rgba(255,255,255,0.45)", letterSpacing: "0.5px", textTransform: "uppercase", fontWeight: 700, display: "block", marginBottom: 6 }}>Date de démarrage</label>
              <input
                type="date"
                value={programme.startDate || ""}
                onChange={(e) => update("startDate", e.target.value)}
                style={{ width: "100%", padding: "10px 12px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, color: "#fff", fontSize: 13, fontFamily: "inherit", outline: "none" }}
              />
              <div style={{ fontSize: 9, color: "rgba(255,255,255,0.35)", marginTop: 4 }}>Vide = aujourd'hui</div>
            </div>
            <div>
              <label style={{ fontSize: 10, color: "rgba(255,255,255,0.45)", letterSpacing: "0.5px", textTransform: "uppercase", fontWeight: 700, display: "block", marginBottom: 6 }}>Jours d'entraînement</label>
              <div style={{ display: "flex", gap: 4 }}>
                {[
                  { d: 1, l: "L" }, { d: 2, l: "M" }, { d: 3, l: "M" },
                  { d: 4, l: "J" }, { d: 5, l: "V" }, { d: 6, l: "S" }, { d: 7, l: "D" },
                ].map(({ d, l }) => {
                  const days = programme.trainingDays || [1];
                  const active = days.includes(d);
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => {
                        const cur = new Set(programme.trainingDays || [1]);
                        if (cur.has(d)) cur.delete(d); else cur.add(d);
                        const next = Array.from(cur).sort((a, b) => a - b);
                        update("trainingDays", next.length ? next : [1]);
                      }}
                      style={{
                        flex: 1, height: 36, borderRadius: 8,
                        border: active ? "1px solid rgba(2,209,186,0.6)" : "1px solid rgba(255,255,255,0.08)",
                        background: active ? "rgba(2,209,186,0.15)" : "rgba(255,255,255,0.03)",
                        color: active ? "#02d1ba" : "rgba(255,255,255,0.4)",
                        fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                        transition: "all 0.12s",
                      }}
                    >
                      {l}
                    </button>
                  );
                })}
              </div>
              <div style={{ fontSize: 9, color: "rgba(255,255,255,0.35)", marginTop: 4 }}>
                {programme.trainingDays?.length || 1} jour{(programme.trainingDays?.length || 1) > 1 ? "s" : ""} / sem · vide = lundi
              </div>
            </div>
          </div>

          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 2, color: "rgba(2,209,186,0.6)", textTransform: "uppercase", marginBottom: 12 }}>Structure</div>
          <DndContext
            sensors={dragSensors}
            collisionDetection={closestCenter}
            onDragEnd={(event) => {
              const { active, over } = event;
              if (!over || active.id === over.id) return;
              setProgramme((p) => {
                const oldIdx = p.weeks.findIndex((w) => w.id === active.id);
                const newIdx = p.weeks.findIndex((w) => w.id === over.id);
                if (oldIdx < 0 || newIdx < 0) return p;
                return { ...p, weeks: arrayMove(p.weeks, oldIdx, newIdx) };
              });
            }}
          >
            <SortableContext items={(programme.weeks || []).map((w) => w.id)} strategy={verticalListSortingStrategy}>
              {(programme.weeks || []).map((w, i) => (
                <SortableWeek
                  key={w.id}
                  week={w}
                  weekIdx={i}
                  totalWeeks={programme.weeks.length}
                  onUpdate={(nw) => updateWeek(i, nw)}
                  onRemove={() => removeWeek(i)}
                  onDuplicate={() => duplicateWeek(i)}
                  onMove={(dir) => setProgramme((p) => {
                    const arr = [...p.weeks];
                    const j = i + dir;
                    if (j < 0 || j >= arr.length) return p;
                    [arr[i], arr[j]] = [arr[j], arr[i]];
                    return { ...p, weeks: arr };
                  })}
                />
              ))}
            </SortableContext>
          </DndContext>
          <button
            type="button"
            onClick={addWeek}
            style={{
              width: "100%", padding: 16, background: G_DIM,
              border: "1px solid rgba(2,209,186,0.3)", borderRadius: 14,
              color: G, fontSize: 13, fontWeight: 800, cursor: "pointer",
              fontFamily: "inherit", letterSpacing: 0.5,
            }}
          >+ Ajouter une semaine</button>
        </div>

        <div style={{
          overflowY: "auto",
          overflowX: "hidden",
          padding: isMobile ? 14 : 22,
          background: BG_2,
          position: "relative",
          display: isMobile && mobileView !== "preview" ? "none" : "block",
          height: isMobile ? "100%" : "auto",
          maxWidth: "100%",
        }}>
          {/* Toggle Aperçu / Analytics */}
          <div style={{ display: "flex", gap: 4, padding: 4, background: "rgba(255,255,255,0.04)", border: "1px solid " + BORDER, borderRadius: 100, width: "fit-content", marginBottom: 14 }}>
            <button type="button" onClick={() => setShowAnalytics(false)}
              style={{ padding: "6px 14px", borderRadius: 100, border: "none", background: !showAnalytics ? G : "transparent", color: !showAnalytics ? "#000" : "rgba(255,255,255,0.6)", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", letterSpacing: 0.5 }}
            >Aperçu</button>
            <button type="button" onClick={() => setShowAnalytics(true)}
              style={{ padding: "6px 14px", borderRadius: 100, border: "none", background: showAnalytics ? G : "transparent", color: showAnalytics ? "#000" : "rgba(255,255,255,0.6)", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", letterSpacing: 0.5 }}
            >Analytics</button>
          </div>
          <Preview programme={programme} showAnalytics={showAnalytics} />
        </div>
      </div>

      {/* Hook C : modal logger paiement (après save programme) */}
      <LogPaymentModal
        open={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        clientId={client?.id}
        clientName={client?.full_name}
        coachId={paymentCoachId}
        defaultAmount={300}
      />

      {/* Modal planification — date+heure de bascule */}
      {showScheduleModal && (
        <div
          onClick={() => setShowScheduleModal(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ width: "100%", maxWidth: 420, background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: 24 }}
          >
            <div style={{ fontSize: 18, fontWeight: 800, color: "#fff", marginBottom: 6 }}>Planifier la publication</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", marginBottom: 18 }}>
              Le client gardera son programme actuel jusqu'à cette date, puis basculera automatiquement sur celui-ci.
            </div>
            <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>
              Date et heure
            </label>
            <input
              type="datetime-local"
              value={scheduleDate}
              onChange={(e) => setScheduleDate(e.target.value)}
              min={new Date(Date.now() + 60_000).toISOString().slice(0, 16)}
              style={{
                width: "100%", padding: "12px 14px", background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10,
                color: "#fff", fontSize: 14, fontFamily: "inherit", marginBottom: 18,
                colorScheme: "dark",
              }}
            />
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                type="button" onClick={() => setShowScheduleModal(false)}
                style={{ padding: "10px 18px", background: "transparent", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, color: "rgba(255,255,255,0.7)", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
              >Annuler</button>
              <button
                type="button" onClick={confirmSchedule}
                style={{ padding: "10px 18px", background: "linear-gradient(135deg, " + G + ", #0891b2)", border: "none", borderRadius: 10, color: "#000", fontSize: 12, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", letterSpacing: 0.3 }}
              >Confirmer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

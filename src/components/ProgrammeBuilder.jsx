// ProgrammeBuilder — Phase 1 MVP (v2 sans dynamic Tag JSX qui crashait).
// Sidebar: meta + structure tree (semaines / séances / exercices).
// Preview: rendu live du programme tel que le client le verra.
import React, { useState, useMemo, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";
import { findVideo, EXERCISE_VIDEOS } from "../data/exerciseVideos";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { exportProgrammePDF } from "../utils/exportPDF";

const G = "#02d1ba";
const G_DIM = "rgba(2,209,186,0.1)";
const BG = "#0a0a0a";
const BG_2 = "#111";
const BORDER = "rgba(255,255,255,0.06)";

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
      return `
      <div class="seance-block" id="seance-${sid}">
        <input id="sn-${sid}" value="${escAttr(s.name)}" />
        <textarea id="sd-${sid}">${escText(s.description || '')}</textarea>
        <textarea id="sf-${sid}">${escText(s.finisher || '')}</textarea>
        ${exHtml}
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
const newSession = (n = 1) => ({ id: uid(), name: `Séance ${n}`, description: "", finisher: "", exercises: [newExercise()] });
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

// ─── Templates de phases ──────────────────────────────────────────────────────
// Skeletons pré-remplis : structure (semaines × séances × exos vides + reps/RIR
// suggérés selon la phase). L'exercice picker remplit le nom + vidéo au tap.
const TEMPLATES = [
  {
    id: "blank",
    name: "Vierge",
    desc: "1 semaine, 1 séance, 1 exercice. Pour partir de zéro.",
    icon: "📄",
    build: () => ({ name: "", clientName: "", duration: "", tagline: "", objective: "", weeks: [newWeek(1)] }),
  },
  {
    id: "ppl-hypertrophie-4",
    name: "PPL Hypertrophie · 4 sem",
    desc: "Push / Pull / Legs × 4 semaines progressives. Volume → intensité.",
    icon: "💪",
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
    icon: "🏋️",
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
    icon: "🔄",
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
    icon: "🌿",
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
    return EXERCISE_VIDEOS
      .filter((v) => {
        if (norm(v.title).includes(q)) return true;
        return (v.aliases || []).some((a) => norm(a).includes(q));
      })
      .slice(0, 8);
  }, [query]);

  return (
    <div ref={ref} style={{ position: "relative", flex: 1 }}>
      <input
        type="text"
        value={query}
        onChange={(e) => { setQuery(e.target.value); onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder="Nom (tape 'bench', 'squat', 'curl'…)"
        style={{ ...inputBaseStyle, padding: "10px 12px", fontSize: 13, background: "rgba(255,255,255,0.04)" }}
      />
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
                <div style={{ fontSize: 12, fontWeight: 700, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{v.title}</div>
                {(v.aliases || []).length > 0 && (
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>
                    {v.aliases.slice(0, 3).join(" · ")}
                  </div>
                )}
              </div>
              <div style={{ fontSize: 14, color: G }}>+</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ExerciseRow({ ex, idx, total, onUpdate, onRemove, onMove, onDuplicate }) {
  const update = (k, v) => onUpdate({ ...ex, [k]: v });
  const iconBtn = { width: 24, height: 24, borderRadius: 6, border: "1px solid " + BORDER, background: "transparent", color: "rgba(255,255,255,0.45)", cursor: "pointer", fontSize: 11, flexShrink: 0, fontFamily: "inherit" };

  return (
    <div style={{
      background: "rgba(255,255,255,0.025)", border: "1px solid " + BORDER,
      borderRadius: 12, padding: 12, marginBottom: 10,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
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
        {idx > 0 && <button type="button" onClick={() => onMove(-1)} title="Monter" style={iconBtn}>↑</button>}
        {idx < total - 1 && <button type="button" onClick={() => onMove(1)} title="Descendre" style={iconBtn}>↓</button>}
        <button type="button" onClick={onDuplicate} title="Dupliquer" style={{ ...iconBtn, background: G_DIM, borderColor: "rgba(2,209,186,0.25)", color: G }}>⎘</button>
        <button type="button" onClick={onRemove} title="Supprimer" style={{ ...iconBtn, fontSize: 14 }}>×</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 6 }}>
        <SuggestField label="Reps" value={ex.reps} onChange={(v) => update("reps", v)} placeholder="4X8-10" suggestions={REPS_SUGGESTIONS} />
        <SuggestField label="Tempo" value={ex.tempo} onChange={(v) => update("tempo", v)} placeholder="3010" suggestions={TEMPO_SUGGESTIONS} />
        <SuggestField label="RIR" value={ex.rir} onChange={(v) => update("rir", v)} placeholder="1" suggestions={RIR_SUGGESTIONS} />
        <SuggestField label="Repos" value={ex.rest} onChange={(v) => update("rest", v)} placeholder="2'" suggestions={REST_SUGGESTIONS} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 6, marginTop: 6 }}>
        <TextField label="Groupe" value={ex.group} onChange={(v) => update("group", v)} placeholder="A1, A2…" />
        <TextField label="🎥 Vidéo URL" value={ex.vidUrl} onChange={(v) => update("vidUrl", v)} placeholder="Auto-rempli si tu choisis depuis la liste" />
      </div>
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

  return (
    <div style={{
      background: BG_2, border: "1px solid " + BORDER, borderRadius: 14,
      padding: 16, marginBottom: 14,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        {dragHandleProps ? (
          <button type="button" {...dragHandleProps}
            style={{ width: 24, height: 24, cursor: "grab", color: "rgba(255,255,255,0.3)", background: "transparent", border: "none", padding: 0, fontSize: 16 }}
            title="Glisser pour réorganiser"
          >⋮⋮</button>
        ) : null}
        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, color: "rgba(2,209,186,0.6)", textTransform: "uppercase" }}>Séance {idx + 1}</span>
        <input
          type="text"
          value={session.name || ""}
          onChange={(e) => update("name", e.target.value)}
          placeholder="Nom (Push, Pull, Legs…)"
          style={{
            flex: 1, padding: "6px 10px", background: "transparent", border: "1px solid " + BORDER,
            borderRadius: 8, color: "#fff", fontSize: 14, fontWeight: 700, fontFamily: "inherit", outline: "none",
          }}
        />
        {idx > 0 && <button type="button" onClick={() => onMove(-1)} title="Monter la séance"
          style={{ padding: "6px 8px", background: "transparent", border: "1px solid " + BORDER, borderRadius: 8, color: "rgba(255,255,255,0.55)", fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}
        >↑</button>}
        {idx < total - 1 && <button type="button" onClick={() => onMove(1)} title="Descendre la séance"
          style={{ padding: "6px 8px", background: "transparent", border: "1px solid " + BORDER, borderRadius: 8, color: "rgba(255,255,255,0.55)", fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}
        >↓</button>}
        <button type="button" onClick={onDuplicate} title="Dupliquer la séance"
          style={{ padding: "6px 10px", background: G_DIM, border: "1px solid rgba(2,209,186,0.25)", borderRadius: 8, color: G, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
        >⎘</button>
        <button
          type="button"
          onClick={onRemove}
          style={{
            padding: "6px 10px", background: "rgba(192,57,43,0.1)", border: "1px solid rgba(192,57,43,0.25)",
            borderRadius: 8, color: "#c0392b", fontSize: 11, cursor: "pointer", fontFamily: "inherit",
          }}
        >Supprimer</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
        <TextArea label="Description" value={session.description} onChange={(v) => update("description", v)} placeholder="Pectoraux, épaules, triceps…" />
        <TextArea label="Finisher" value={session.finisher} onChange={(v) => update("finisher", v)} placeholder="3 séries de pompes lestées AMRAP…" />
      </div>

      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", marginBottom: 10 }}>Exercices</div>
      {(session.exercises || []).map((ex, i) => (
        <ExerciseRow key={ex.id} ex={ex} idx={i} total={session.exercises.length}
          onUpdate={(e) => updateExercise(i, e)}
          onRemove={() => removeExercise(i)}
          onMove={(dir) => moveExercise(i, dir)}
          onDuplicate={() => duplicateExercise(i)}
        />
      ))}
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
      marginBottom: 24, padding: 18,
      background: "linear-gradient(180deg, rgba(2,209,186,0.04), transparent)",
      border: "1px solid " + BORDER, borderRadius: 18,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        {dragHandleProps ? (
          <button type="button" {...dragHandleProps}
            style={{ width: 24, height: 36, cursor: "grab", color: "rgba(255,255,255,0.4)", background: "transparent", border: "none", padding: 0, fontSize: 18 }}
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
            flex: 1, padding: "8px 12px", background: "transparent", border: "1px solid " + BORDER,
            borderRadius: 10, color: "#fff", fontSize: 16, fontWeight: 800, fontFamily: "inherit", outline: "none",
          }}
        />
        {weekIdx > 0 && (
          <button type="button" onClick={() => onMove(-1)} title="Monter cette semaine"
            style={{ padding: "8px 10px", background: "transparent", border: "1px solid " + BORDER, borderRadius: 8, color: "rgba(255,255,255,0.6)", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}
          >↑</button>
        )}
        {weekIdx < totalWeeks - 1 && (
          <button type="button" onClick={() => onMove(1)} title="Descendre cette semaine"
            style={{ padding: "8px 10px", background: "transparent", border: "1px solid " + BORDER, borderRadius: 8, color: "rgba(255,255,255,0.6)", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}
          >↓</button>
        )}
        <button
          type="button"
          onClick={onDuplicate}
          style={{
            padding: "8px 14px", background: G_DIM, border: "1px solid rgba(2,209,186,0.3)",
            borderRadius: 10, color: G, fontSize: 11, fontWeight: 700, cursor: "pointer",
            fontFamily: "inherit", letterSpacing: 0.5,
          }}
          title="Dupliquer cette semaine"
        >⎘ Dupliquer</button>
        <button
          type="button"
          onClick={onRemove}
          style={{
            padding: "8px 14px", background: "rgba(192,57,43,0.1)", border: "1px solid rgba(192,57,43,0.25)",
            borderRadius: 10, color: "#c0392b", fontSize: 11, fontWeight: 700, cursor: "pointer",
            fontFamily: "inherit", letterSpacing: 0.5,
          }}
        >Supprimer</button>
      </div>

      <DndContext
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

function Preview({ programme }) {
  const totalEx = (programme.weeks || []).reduce((a, w) => a + (w.sessions || []).reduce((b, s) => b + (s.exercises || []).length, 0), 0);
  const totalSessions = (programme.weeks || []).reduce((a, w) => a + (w.sessions || []).length, 0);

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
              {(s.exercises || []).map((ex) => {
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
              })}
              {s.finisher ? (
                <div style={{ marginTop: 10, padding: "8px 10px", background: "rgba(239,68,68,0.05)", borderLeft: "2px solid rgba(239,68,68,0.5)", borderRadius: 6, fontSize: 11, color: "rgba(255,255,255,0.7)" }}>
                  🔥 <strong>Finisher :</strong> {s.finisher}
                </div>
              ) : null}
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
        if (restored && restored.weeks && restored.weeks.length > 0) return restored;
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
  const [autosavedAt, setAutosavedAt] = useState(0);
  const [showTemplates, setShowTemplates] = useState(!editMode && (programme.weeks?.length === 1 && programme.weeks[0].sessions?.[0]?.exercises?.[0]?.name === "" && !programme.name));

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

  const handleSave = async () => {
    if (!programme.name || !programme.name.trim()) { alert("Donne un nom au programme avant de sauvegarder."); return; }
    if (!client || !client.id) { alert("Pas de client cible."); return; }
    setSaving(true);
    try {
      const html = buildHTML(programme);
      await supabase.from("programmes").update({ is_active: false }).eq("client_id", client.id);
      const userResp = await supabase.auth.getUser();
      const email = userResp && userResp.data && userResp.data.user ? userResp.data.user.email : null;
      const { error } = await supabase.from("programmes").insert({
        client_id: client.id,
        programme_name: programme.name,
        html_content: html,
        is_active: true,
        uploaded_by: email,
      });
      if (error) throw error;
      clearDraft();
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2500);
      if (typeof onSaved === "function") onSaved();
    } catch (e) {
      console.error("[ProgrammeBuilder] save error:", e);
      alert("Erreur de sauvegarde : " + (e.message || "inconnue"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0, background: BG, color: "#fff", fontFamily: "Inter,-apple-system,sans-serif", display: "flex", flexDirection: "column" }}>
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
                  <div style={{ fontSize: 28, marginBottom: 8 }}>{tpl.icon}</div>
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
        padding: "14px 22px", borderBottom: "1px solid " + BORDER, background: BG_2, flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "8px 14px", background: "transparent", border: "1px solid " + BORDER,
              borderRadius: 10, color: "rgba(255,255,255,0.6)", fontSize: 12, cursor: "pointer", fontFamily: "inherit",
            }}
          >← Retour</button>
          <div>
            <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: 3, color: G, textTransform: "uppercase" }}>Programme Builder</div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.7)" }}>Pour <strong>{(client && client.full_name) || "—"}</strong></div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {!editMode && !savedFlash && autosavedAt > 0 ? (
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", fontStyle: "italic" }}>Brouillon auto-sauvegardé</span>
          ) : null}
          {savedFlash ? <span style={{ fontSize: 11, color: G, fontWeight: 700 }}>✓ Enregistré côté client</span> : null}
          {!editMode && (
            <button
              type="button"
              onClick={() => setShowTemplates(true)}
              style={{
                padding: "8px 14px", background: "rgba(255,255,255,0.04)",
                border: "1px solid " + BORDER, borderRadius: 10, color: "rgba(255,255,255,0.7)",
                fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", letterSpacing: 0.5,
              }}
            >📋 Templates</button>
          )}
          <button
            type="button"
            onClick={async () => {
              try { await exportProgrammePDF(programme); }
              catch (e) { console.error(e); alert("Erreur PDF : " + e.message); }
            }}
            style={{
              padding: "8px 14px", background: "rgba(255,255,255,0.04)",
              border: "1px solid " + BORDER, borderRadius: 10, color: "rgba(255,255,255,0.7)",
              fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", letterSpacing: 0.5,
            }}
          >📄 Export PDF</button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: "10px 18px",
              background: "linear-gradient(135deg, " + G + ", #0891b2)",
              border: "none", borderRadius: 10, color: "#000",
              fontSize: 12, fontWeight: 800, cursor: saving ? "wait" : "pointer",
              fontFamily: "inherit", letterSpacing: 0.5, textTransform: "uppercase",
              boxShadow: "0 6px 20px rgba(2,209,186,0.25)",
            }}
          >{saving ? "Sauvegarde…" : "💾 Sauvegarder"}</button>
        </div>
      </div>

      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 0, overflow: "hidden" }}>
        <div style={{ overflowY: "auto", padding: 22, borderRight: "1px solid " + BORDER }}>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 2, color: "rgba(2,209,186,0.6)", textTransform: "uppercase", marginBottom: 12 }}>Informations</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 22 }}>
            <TextField label="Nom du programme" value={programme.name} onChange={(v) => update("name", v)} placeholder="ex : PRISE DE MASSE 12 SEM." />
            <TextField label="Client" value={programme.clientName} onChange={(v) => update("clientName", v)} placeholder="Prénom Nom" />
            <TextField label="Durée" value={programme.duration} onChange={(v) => update("duration", v)} placeholder="ex : 12" />
            <TextField label="Objectif" value={programme.objective} onChange={(v) => update("objective", v)} placeholder="prise-de-masse" />
            <div style={{ gridColumn: "span 2" }}>
              <TextField label="Tagline" value={programme.tagline} onChange={(v) => update("tagline", v)} placeholder="ex : LA DISCIPLINE EST LA CLÉ DU SUCCÈS" />
            </div>
          </div>

          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 2, color: "rgba(2,209,186,0.6)", textTransform: "uppercase", marginBottom: 12 }}>Structure</div>
          <DndContext
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

        <div style={{ overflowY: "auto", padding: 22, background: BG_2 }}>
          <Preview programme={programme} />
        </div>
      </div>
    </div>
  );
}

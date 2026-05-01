// ProgrammeBuilder — Phase 1 MVP.
// Sidebar: meta + structure tree (semaines / séances / exercices).
// Preview: rendu live du programme tel que le client le verra.
// Save: génère le HTML format parserProgramme.js puis upsert dans programmes.
import React, { useState, useMemo, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";
import { findVideo, EXERCISE_VIDEOS } from "../data/exerciseVideos";

const G = "#02d1ba";
const G_DIM = "rgba(2,209,186,0.1)";
const BG = "#0a0a0a";
const BG_2 = "#111";
const BORDER = "rgba(255,255,255,0.06)";
const BORDER_HOVER = "rgba(255,255,255,0.14)";

const uid = () => Math.random().toString(36).slice(2, 10);
const escAttr = (s) => String(s ?? "").replace(/"/g, "&quot;").replace(/</g, "&lt;");
const escText = (s) => String(s ?? "").replace(/</g, "&lt;");

// HTML generator (matche le format parserProgramme.js)
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

// Empty state factories
const newExercise = () => ({ id: uid(), name: "", reps: "4X8-10", tempo: "3010", rir: "1", rest: "2'", group: "", vidUrl: "" });
const newSession = (n = 1) => ({ id: uid(), name: `Séance ${n}`, description: "", finisher: "", exercises: [newExercise()] });
const newWeek = (n = 1) => ({ id: uid(), name: `Semaine ${n}`, sessions: [newSession(1)] });

// Exercise picker (autocomplete sur EXERCISE_VIDEOS)
function ExercisePicker({ value, onChange, onPickVideo }) {
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
        placeholder="Nom de l'exercice (tape 'bench', 'squat', 'curl'…)"
        style={{
          width: "100%", padding: "10px 12px", background: "rgba(255,255,255,0.04)",
          border: "1px solid " + BORDER, borderRadius: 10, color: "#fff", fontSize: 13,
          fontFamily: "inherit", outline: "none", transition: "border-color .15s",
        }}
        onMouseEnter={(e) => e.target.style.borderColor = BORDER_HOVER}
        onMouseLeave={(e) => e.target.style.borderColor = BORDER}
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
              onClick={() => {
                onChange(v.title);
                onPickVideo(`https://youtu.be/${v.id}`);
                setQuery(v.title);
                setOpen(false);
              }}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: 10,
                padding: "8px 10px", background: "transparent", border: "none",
                cursor: "pointer", color: "#fff", textAlign: "left", fontFamily: "inherit",
                borderBottom: "1px solid rgba(255,255,255,0.04)",
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = "rgba(2,209,186,0.06)"}
              onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
            >
              <img
                src={`https://img.youtube.com/vi/${v.id}/default.jpg`}
                alt=""
                style={{ width: 60, height: 45, objectFit: "cover", borderRadius: 6, flexShrink: 0 }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{v.title}</div>
                {v.aliases?.length > 0 && (
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

function FieldInput({ label, value, onChange, placeholder, textarea }) {
  const Tag = textarea ? "textarea" : "input";
  return (
    <label style={{ display: "block" }}>
      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: "rgba(255,255,255,0.35)", marginBottom: 4 }}>{label}</div>
      <Tag
        type={textarea ? undefined : "text"}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={textarea ? 2 : undefined}
        style={{
          width: "100%", padding: "8px 10px", background: "rgba(255,255,255,0.03)",
          border: "1px solid " + BORDER, borderRadius: 8, color: "#fff",
          fontSize: 12, fontFamily: "inherit", outline: "none", resize: textarea ? "vertical" : "none",
          transition: "border-color .15s",
        }}
        onFocus={(e) => e.target.style.borderColor = "rgba(2,209,186,0.4)"}
        onBlur={(e) => e.target.style.borderColor = BORDER}
      />
    </label>
  );
}

function ExerciseRow({ ex, idx, onUpdate, onRemove }) {
  const update = (k, v) => onUpdate({ ...ex, [k]: v });
  const ytId = ex.vidUrl?.match(/(?:youtu\.be\/|v=)([\w-]{11})/)?.[1];

  return (
    <div style={{
      background: "rgba(255,255,255,0.025)", border: "1px solid " + BORDER,
      borderRadius: 12, padding: 12, marginBottom: 10,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <div style={{
          width: 24, height: 24, borderRadius: 6, background: G_DIM,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 11, fontWeight: 700, color: G, flexShrink: 0,
        }}>{idx + 1}</div>
        <ExercisePicker
          value={ex.name}
          onChange={(v) => update("name", v)}
          onPickVideo={(v) => onUpdate({ ...ex, name: ex.name || "", vidUrl: v })}
        />
        <button
          onClick={onRemove}
          style={{
            width: 28, height: 28, borderRadius: 8, border: "1px solid " + BORDER,
            background: "rgba(255,255,255,0.02)", color: "rgba(255,255,255,0.4)",
            cursor: "pointer", fontSize: 14, flexShrink: 0,
          }}
          title="Supprimer cet exercice"
        >×</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 6 }}>
        <FieldInput label="Reps" value={ex.reps} onChange={(v) => update("reps", v)} placeholder="4X8-10" />
        <FieldInput label="Tempo" value={ex.tempo} onChange={(v) => update("tempo", v)} placeholder="3010" />
        <FieldInput label="RIR" value={ex.rir} onChange={(v) => update("rir", v)} placeholder="1" />
        <FieldInput label="Repos" value={ex.rest} onChange={(v) => update("rest", v)} placeholder="2'" />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 6, marginTop: 6 }}>
        <FieldInput label="Groupe" value={ex.group} onChange={(v) => update("group", v)} placeholder="A1, A2…" />
        <FieldInput
          label={ytId ? `🎥 Vidéo (${ytId})` : "🎥 Vidéo URL"}
          value={ex.vidUrl}
          onChange={(v) => update("vidUrl", v)}
          placeholder="Auto-rempli si tu choisis depuis la liste ci-dessus"
        />
      </div>
    </div>
  );
}

function SessionPanel({ session, onUpdate, onRemove, idx }) {
  const update = (k, v) => onUpdate({ ...session, [k]: v });
  const updateExercise = (exIdx, ex) => onUpdate({ ...session, exercises: session.exercises.map((e, i) => i === exIdx ? ex : e) });
  const addExercise = () => onUpdate({ ...session, exercises: [...session.exercises, newExercise()] });
  const removeExercise = (exIdx) => onUpdate({ ...session, exercises: session.exercises.filter((_, i) => i !== exIdx) });

  return (
    <div style={{
      background: BG_2, border: "1px solid " + BORDER, borderRadius: 14,
      padding: 16, marginBottom: 14,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, color: "rgba(2,209,186,0.6)", textTransform: "uppercase" }}>Séance {idx + 1}</span>
        <input
          value={session.name}
          onChange={(e) => update("name", e.target.value)}
          placeholder="Nom (Push, Pull, Legs…)"
          style={{
            flex: 1, padding: "6px 10px", background: "transparent", border: "1px solid " + BORDER,
            borderRadius: 8, color: "#fff", fontSize: 14, fontWeight: 700, fontFamily: "inherit", outline: "none",
          }}
        />
        <button
          onClick={onRemove}
          style={{
            padding: "6px 10px", background: "rgba(192,57,43,0.1)", border: "1px solid rgba(192,57,43,0.25)",
            borderRadius: 8, color: "#c0392b", fontSize: 11, cursor: "pointer", fontFamily: "inherit",
          }}
        >Supprimer la séance</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
        <FieldInput label="Description" value={session.description} onChange={(v) => update("description", v)} placeholder="Pectoraux, épaules, triceps…" textarea />
        <FieldInput label="Finisher" value={session.finisher} onChange={(v) => update("finisher", v)} placeholder="3 séries de pompes lestées AMRAP…" textarea />
      </div>

      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", marginBottom: 10 }}>Exercices</div>
      {session.exercises.map((ex, i) => (
        <ExerciseRow key={ex.id} ex={ex} idx={i} onUpdate={(e) => updateExercise(i, e)} onRemove={() => removeExercise(i)} />
      ))}
      <button
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

function WeekPanel({ week, weekIdx, onUpdate, onRemove, onDuplicate }) {
  const update = (k, v) => onUpdate({ ...week, [k]: v });
  const updateSession = (sIdx, s) => onUpdate({ ...week, sessions: week.sessions.map((x, i) => i === sIdx ? s : x) });
  const addSession = () => onUpdate({ ...week, sessions: [...week.sessions, newSession(week.sessions.length + 1)] });
  const removeSession = (sIdx) => {
    if (!window.confirm(`Supprimer la séance "${week.sessions[sIdx]?.name}" et ses ${week.sessions[sIdx]?.exercises?.length || 0} exercices ?`)) return;
    onUpdate({ ...week, sessions: week.sessions.filter((_, i) => i !== sIdx) });
  };

  return (
    <div style={{
      marginBottom: 24, padding: 18,
      background: "linear-gradient(180deg, rgba(2,209,186,0.04), transparent)",
      border: "1px solid " + BORDER, borderRadius: 18,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: G, color: "#000", display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 14, fontWeight: 900, flexShrink: 0,
        }}>S{weekIdx + 1}</div>
        <input
          value={week.name}
          onChange={(e) => update("name", e.target.value)}
          placeholder={`Semaine ${weekIdx + 1}`}
          style={{
            flex: 1, padding: "8px 12px", background: "transparent", border: "1px solid " + BORDER,
            borderRadius: 10, color: "#fff", fontSize: 16, fontWeight: 800, fontFamily: "inherit", outline: "none",
          }}
        />
        <button
          onClick={onDuplicate}
          style={{
            padding: "8px 14px", background: G_DIM, border: "1px solid rgba(2,209,186,0.3)",
            borderRadius: 10, color: G, fontSize: 11, fontWeight: 700, cursor: "pointer",
            fontFamily: "inherit", letterSpacing: 0.5,
          }}
          title="Dupliquer cette semaine"
        >⎘ Dupliquer</button>
        <button
          onClick={onRemove}
          style={{
            padding: "8px 14px", background: "rgba(192,57,43,0.1)", border: "1px solid rgba(192,57,43,0.25)",
            borderRadius: 10, color: "#c0392b", fontSize: 11, fontWeight: 700, cursor: "pointer",
            fontFamily: "inherit", letterSpacing: 0.5,
          }}
        >Supprimer</button>
      </div>

      {week.sessions.map((s, i) => (
        <SessionPanel key={s.id} session={s} idx={i} onUpdate={(ns) => updateSession(i, ns)} onRemove={() => removeSession(i)} />
      ))}
      <button
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

// Live preview (côté droit)
function Preview({ programme }) {
  const totalEx = programme.weeks.reduce((a, w) => a + w.sessions.reduce((b, s) => b + s.exercises.length, 0), 0);
  const totalSessions = programme.weeks.reduce((a, w) => a + w.sessions.length, 0);

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
      {programme.tagline && <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginBottom: 16, fontStyle: "italic" }}>"{programme.tagline}"</div>}
      <div style={{ display: "flex", gap: 14, marginBottom: 24 }}>
        <Stat label="Semaines" value={programme.weeks.length} />
        <Stat label="Séances" value={totalSessions} />
        <Stat label="Exercices" value={totalEx} />
      </div>

      {programme.weeks.length === 0 && (
        <div style={{
          padding: 32, textAlign: "center",
          background: "rgba(255,255,255,0.02)", border: "1px dashed " + BORDER,
          borderRadius: 14, color: "rgba(255,255,255,0.4)",
        }}>Aucune semaine. Ajoute la première semaine à gauche.</div>
      )}

      {programme.weeks.map((w, wi) => (
        <div key={w.id} style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, color: G, textTransform: "uppercase", marginBottom: 10 }}>{w.name || `Semaine ${wi + 1}`}</div>
          {w.sessions.map((s, si) => (
            <div key={s.id} style={{ marginBottom: 14, padding: 14, background: "rgba(255,255,255,0.02)", border: "1px solid " + BORDER, borderRadius: 12 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: "#fff", marginBottom: 8 }}>{s.name || `Séance ${si + 1}`}</div>
              {s.description && <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginBottom: 8 }}>{s.description}</div>}
              {s.exercises.map((ex) => {
                const effectiveVid = ex.vidUrl || findVideo(ex.name);
                const ytId = effectiveVid?.match(/(?:youtu\.be\/|v=)([\w-]{11})/)?.[1];
                return (
                  <div key={ex.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                    {ytId ? (
                      <img src={`https://img.youtube.com/vi/${ytId}/default.jpg`} alt="" style={{ width: 40, height: 30, objectFit: "cover", borderRadius: 4 }} />
                    ) : (
                      <div style={{ width: 40, height: 30, background: "rgba(255,255,255,0.04)", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: "rgba(255,255,255,0.2)" }}>?</div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{ex.name || "[Exercice sans nom]"}</div>
                      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>
                        {[ex.reps, ex.tempo && `tempo ${ex.tempo}`, ex.rir && `RIR ${ex.rir}`, ex.rest && `repos ${ex.rest}`].filter(Boolean).join(" · ")}
                      </div>
                    </div>
                  </div>
                );
              })}
              {s.finisher && (
                <div style={{ marginTop: 10, padding: "8px 10px", background: "rgba(239,68,68,0.05)", borderLeft: "2px solid rgba(239,68,68,0.5)", borderRadius: 6, fontSize: 11, color: "rgba(255,255,255,0.7)" }}>
                  🔥 <strong>Finisher :</strong> {s.finisher}
                </div>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// Main component
export default function ProgrammeBuilder({ client, onClose, onSaved }) {
  const [programme, setProgramme] = useState({
    name: "",
    clientName: client?.full_name || "",
    duration: "",
    tagline: "",
    objective: "",
    weeks: [newWeek(1)],
  });
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  const update = (k, v) => setProgramme((p) => ({ ...p, [k]: v }));
  const updateWeek = (idx, w) => setProgramme((p) => ({ ...p, weeks: p.weeks.map((x, i) => i === idx ? w : x) }));
  const addWeek = () => setProgramme((p) => ({ ...p, weeks: [...p.weeks, newWeek(p.weeks.length + 1)] }));
  const duplicateWeek = (idx) => setProgramme((p) => {
    const orig = p.weeks[idx];
    const dup = JSON.parse(JSON.stringify(orig));
    dup.id = uid();
    dup.name = `${orig.name} (copie)`;
    dup.sessions = dup.sessions.map((s) => ({ ...s, id: uid(), exercises: s.exercises.map((e) => ({ ...e, id: uid() })) }));
    return { ...p, weeks: [...p.weeks.slice(0, idx + 1), dup, ...p.weeks.slice(idx + 1)] };
  });
  const removeWeek = (idx) => {
    const w = programme.weeks[idx];
    const nbEx = w.sessions.reduce((a, s) => a + s.exercises.length, 0);
    if (!window.confirm(`Supprimer ${w.name} (${w.sessions.length} séances, ${nbEx} exercices) ?`)) return;
    setProgramme((p) => ({ ...p, weeks: p.weeks.filter((_, i) => i !== idx) }));
  };

  const handleSave = async () => {
    if (!programme.name?.trim()) { alert("Donne un nom au programme avant de sauvegarder."); return; }
    if (!client?.id) { alert("Pas de client cible."); return; }
    setSaving(true);
    try {
      const html = buildHTML(programme);
      await supabase.from("programmes").update({ is_active: false }).eq("client_id", client.id);
      const user = (await supabase.auth.getUser()).data.user;
      const { error } = await supabase.from("programmes").insert({
        client_id: client.id,
        programme_name: programme.name,
        html_content: html,
        is_active: true,
        uploaded_by: user?.email || null,
      });
      if (error) throw error;
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2500);
      onSaved?.();
    } catch (e) {
      console.error("[ProgrammeBuilder] save error:", e);
      alert("Erreur de sauvegarde : " + (e.message || "inconnue"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ position: "absolute", inset: 0, background: BG, color: "#fff", fontFamily: "Inter,-apple-system,sans-serif", display: "flex", flexDirection: "column" }}>
      {/* Top bar */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 22px", borderBottom: "1px solid " + BORDER, background: BG_2, flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <button
            onClick={onClose}
            style={{
              padding: "8px 14px", background: "transparent", border: "1px solid " + BORDER,
              borderRadius: 10, color: "rgba(255,255,255,0.6)", fontSize: 12, cursor: "pointer", fontFamily: "inherit",
            }}
          >← Retour</button>
          <div>
            <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: 3, color: G, textTransform: "uppercase" }}>Programme Builder</div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.7)" }}>Pour <strong>{client?.full_name || "—"}</strong></div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {savedFlash && <span style={{ fontSize: 11, color: G, fontWeight: 700 }}>✓ Sauvegardé</span>}
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: "10px 18px",
              background: `linear-gradient(135deg, ${G}, #0891b2)`,
              border: "none", borderRadius: 10, color: "#000",
              fontSize: 12, fontWeight: 800, cursor: saving ? "wait" : "pointer",
              fontFamily: "inherit", letterSpacing: 0.5, textTransform: "uppercase",
              boxShadow: "0 6px 20px rgba(2,209,186,0.25)",
            }}
          >{saving ? "Sauvegarde…" : "💾 Sauvegarder"}</button>
        </div>
      </div>

      {/* Body : Sidebar + Preview */}
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 0, overflow: "hidden" }}>
        {/* Sidebar (form + tree) */}
        <div style={{ overflowY: "auto", padding: 22, borderRight: "1px solid " + BORDER }}>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 2, color: "rgba(2,209,186,0.6)", textTransform: "uppercase", marginBottom: 12 }}>Informations</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 22 }}>
            <FieldInput label="Nom du programme" value={programme.name} onChange={(v) => update("name", v)} placeholder="ex : PRISE DE MASSE 12 SEM." />
            <FieldInput label="Client" value={programme.clientName} onChange={(v) => update("clientName", v)} placeholder="Prénom Nom" />
            <FieldInput label="Durée" value={programme.duration} onChange={(v) => update("duration", v)} placeholder="ex : 12" />
            <FieldInput label="Objectif" value={programme.objective} onChange={(v) => update("objective", v)} placeholder="prise-de-masse" />
            <div style={{ gridColumn: "span 2" }}>
              <FieldInput label="Tagline" value={programme.tagline} onChange={(v) => update("tagline", v)} placeholder="ex : LA DISCIPLINE EST LA CLÉ DU SUCCÈS" />
            </div>
          </div>

          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 2, color: "rgba(2,209,186,0.6)", textTransform: "uppercase", marginBottom: 12 }}>Structure</div>
          {programme.weeks.map((w, i) => (
            <WeekPanel
              key={w.id}
              week={w}
              weekIdx={i}
              onUpdate={(nw) => updateWeek(i, nw)}
              onRemove={() => removeWeek(i)}
              onDuplicate={() => duplicateWeek(i)}
            />
          ))}
          <button
            onClick={addWeek}
            style={{
              width: "100%", padding: 16, background: G_DIM,
              border: "1px solid rgba(2,209,186,0.3)", borderRadius: 14,
              color: G, fontSize: 13, fontWeight: 800, cursor: "pointer",
              fontFamily: "inherit", letterSpacing: 0.5,
              transition: "all .15s",
            }}
            onMouseEnter={(e) => { e.target.style.background = "rgba(2,209,186,0.18)"; e.target.style.transform = "translateY(-1px)"; }}
            onMouseLeave={(e) => { e.target.style.background = G_DIM; e.target.style.transform = ""; }}
          >+ Ajouter une semaine</button>
        </div>

        {/* Preview live */}
        <div style={{ overflowY: "auto", padding: 22, background: BG_2 }}>
          <Preview programme={programme} />
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect, useRef } from "react";
import { supabase } from "../../lib/supabase";

/**
 * SessionTracker — interface plein ecran d'enregistrement de seance.
 *
 * Flow:
 *   1. INSERT sessions (status='active', started_at=now)
 *   2. Pour chaque set complete: INSERT session_sets
 *   3. Bouton "Terminer": demande RPE 1-10, UPDATE sessions
 *      (ended_at, duration_minutes, rpe_moyen, sets_completes,
 *      status='completed')
 *   4. Notif coach (best-effort via push edge fn)
 *
 * Pour rester simple, on liste 5 exercices "exemple" hardcodes —
 * une vraie implementation extrairait depuis programme.html_content
 * ou depuis la table template_exercises (futur).
 */

const DEFAULT_EXERCISES = [
  { name: "Developpe couche", sets: 4, reps: "8", target_kg: null },
  { name: "Dips lestes",       sets: 3, reps: "10", target_kg: null },
  { name: "Ecarte halteres",   sets: 4, reps: "12", target_kg: null },
  { name: "Elevations laterales", sets: 4, reps: "15", target_kg: null },
  { name: "Extensions triceps", sets: 3, reps: "12", target_kg: null },
];

export default function SessionTracker({ client, programme, accent, onClose }) {
  const [sessionId, setSessionId] = useState(null);
  const [exercises]   = useState(DEFAULT_EXERCISES);
  const [exIdx, setExIdx] = useState(0);
  const [setsDone, setSetsDone] = useState({}); // { "exIdx-setIdx": {weight, reps} }
  const [chrono, setChrono]   = useState(0);
  const [showRpe, setShowRpe] = useState(false);
  const [rpe, setRpe] = useState(7);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const startedAt = useRef(Date.now());

  // Init session
  useEffect(() => {
    if (!client?.id) return;
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("sessions")
          .insert({
            client_id: client.id,
            programme_id: programme?.id || null,
            seance_nom: programme?.programme_name || "Seance",
            started_at: new Date().toISOString(),
            status: "active",
            sets_total: exercises.reduce((sum, ex) => sum + ex.sets, 0),
          })
          .select("id")
          .single();
        if (error) throw error;
        if (!cancelled) setSessionId(data.id);
      } catch (e) {
        console.warn("[SessionTracker] init", e);
        if (!cancelled) setError("Erreur de demarrage");
      }
    })();
    return () => { cancelled = true; };
  }, [client?.id, programme?.id]);

  // Chrono
  useEffect(() => {
    if (done) return;
    const id = setInterval(() => setChrono((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [done]);

  const ex = exercises[exIdx];

  async function logSet(setIdx, weight, reps) {
    if (!sessionId) return;
    const w = parseFloat(weight);
    const r = parseInt(reps, 10);
    if (isNaN(w) || isNaN(r)) return;

    setSetsDone((s) => ({ ...s, [`${exIdx}-${setIdx}`]: { weight: w, reps: r } }));
    try {
      await supabase.from("session_sets").insert({
        session_id: sessionId,
        exercice_nom: ex.name,
        exercice_index: exIdx,
        numero_set: setIdx + 1,
        charge_kg: w,
        reps: r,
      });
    } catch (e) { console.warn("[SessionTracker] logSet", e); }
  }

  function nextExercise() {
    if (exIdx + 1 < exercises.length) setExIdx(exIdx + 1);
    else setShowRpe(true);
  }
  function prevExercise() {
    if (exIdx > 0) setExIdx(exIdx - 1);
  }

  async function finishSession() {
    if (!sessionId) return;
    try {
      const completedSets = Object.keys(setsDone).length;
      const duration = Math.floor((Date.now() - startedAt.current) / 60000);
      await supabase.from("sessions").update({
        ended_at: new Date().toISOString(),
        duration_minutes: duration,
        rpe_moyen: rpe,
        sets_completes: completedSets,
        status: "completed",
      }).eq("id", sessionId);
    } catch (e) {
      console.warn("[SessionTracker] finish", e);
    }
    setDone(true);
  }

  const fmtChrono = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  // ===== ECRAN FELICITATIONS =====
  if (done) {
    return (
      <div style={overlay}>
        <div style={{ textAlign: "center", padding: 40, animation: "capFade .4s ease both" }}>
          <div style={{ fontSize: 56, marginBottom: 14 }}>🎉</div>
          <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 28, fontWeight: 900, letterSpacing: "-1px", color: "#fff", marginBottom: 10 }}>
            Seance terminee<span style={{ color: accent }}>.</span>
          </div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,.45)", lineHeight: 1.6, marginBottom: 28 }}>
            {Object.keys(setsDone).length} sets en {fmtChrono(chrono)}<br />
            RPE moyen : <span style={{ color: accent, fontFamily: "'JetBrains Mono', monospace" }}>{rpe}/10</span>
          </div>
          <button
            onClick={onClose}
            style={{ background: accent, color: "#000", border: "none", borderRadius: 10, padding: "14px 32px", fontSize: 12, fontWeight: 900, letterSpacing: ".1em", textTransform: "uppercase", fontFamily: "'Syne', sans-serif", cursor: "pointer", boxShadow: `0 16px 40px ${accent}35` }}
          >
            Retour →
          </button>
        </div>
      </div>
    );
  }

  // ===== RPE FINAL =====
  if (showRpe) {
    return (
      <div style={overlay}>
        <div style={{ padding: 32, maxWidth: 380, textAlign: "center" }}>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: ".22em", textTransform: "uppercase", color: accent, marginBottom: 14 }}>RPE final</div>
          <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 26, fontWeight: 900, letterSpacing: "-.5px", color: "#fff", marginBottom: 8 }}>
            Comment etait ta seance ?
          </div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,.4)", marginBottom: 32 }}>1 = facile · 10 = je donne tout</div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8, marginBottom: 32 }}>
            {[1,2,3,4,5,6,7,8,9,10].map((n) => (
              <button
                key={n}
                onClick={() => setRpe(n)}
                style={{
                  padding: "16px 0",
                  background: rpe === n ? accent : "rgba(255,255,255,.04)",
                  border: ".5px solid rgba(255,255,255,.08)",
                  borderRadius: 10,
                  color: rpe === n ? "#000" : "rgba(255,255,255,.65)",
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 18, fontWeight: 600,
                  cursor: "pointer", transition: "all .12s",
                }}
              >{n}</button>
            ))}
          </div>

          <button
            onClick={finishSession}
            style={{ width: "100%", padding: "14px 20px", background: accent, color: "#000", border: "none", borderRadius: 12, fontFamily: "'Syne', sans-serif", fontSize: 13, fontWeight: 900, letterSpacing: ".1em", textTransform: "uppercase", cursor: "pointer", boxShadow: `0 16px 40px ${accent}35` }}
          >
            Terminer la seance
          </button>
        </div>
      </div>
    );
  }

  // ===== TRACKER ACTIF =====
  return (
    <div style={overlay}>
      {/* Topbar */}
      <div style={topbar}>
        <button onClick={onClose} style={closeBtn} aria-label="Quitter">×</button>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 22, fontWeight: 200, color: "#fff", letterSpacing: "-1px" }}>
          {fmtChrono(chrono)}
        </div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,.4)", letterSpacing: ".1em", textTransform: "uppercase" }}>
          {exIdx + 1} / {exercises.length}
        </div>
      </div>

      {error && <div style={{ padding: "10px 20px", background: "rgba(239,68,68,.08)", color: "#ef4444", fontSize: 12, textAlign: "center" }}>{error}</div>}

      {/* Exercice */}
      <div style={{ flex: 1, padding: "30px 22px", overflowY: "auto" }}>
        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: ".22em", textTransform: "uppercase", color: accent, marginBottom: 8 }}>
          Exercice en cours
        </div>
        <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 26, fontWeight: 900, letterSpacing: "-.5px", color: "#fff", marginBottom: 6, lineHeight: 1.1 }}>
          {ex.name}
        </div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,.4)", marginBottom: 28 }}>
          {ex.sets} series x {ex.reps} reps
        </div>

        {/* Sets */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {Array.from({ length: ex.sets }).map((_, setIdx) => {
            const key = `${exIdx}-${setIdx}`;
            const logged = setsDone[key];
            return (
              <SetRow
                key={key}
                setNum={setIdx + 1}
                logged={logged}
                onSubmit={(w, r) => logSet(setIdx, w, r)}
                accent={accent}
              />
            );
          })}
        </div>
      </div>

      {/* Bottom nav */}
      <div style={{ display: "flex", gap: 8, padding: "12px 20px calc(env(safe-area-inset-bottom, 0px) + 12px)", borderTop: ".5px solid rgba(255,255,255,.05)", background: "rgba(8,8,8,.95)" }}>
        <button onClick={prevExercise} disabled={exIdx === 0} style={{ ...navBtn, opacity: exIdx === 0 ? .3 : 1 }}>
          ←
        </button>
        <button onClick={nextExercise} style={{ ...navBtn, flex: 1, background: accent, color: "#000", fontWeight: 800 }}>
          {exIdx + 1 < exercises.length ? "Exercice suivant →" : "Terminer la seance →"}
        </button>
      </div>
    </div>
  );
}

function SetRow({ setNum, logged, onSubmit, accent }) {
  const [w, setW] = useState(logged?.weight ?? "");
  const [r, setR] = useState(logged?.reps ?? "");

  function submit() {
    if (!w || !r) return;
    onSubmit(w, r);
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 12px", background: logged ? "rgba(2,209,186,.05)" : "rgba(255,255,255,.02)", border: `.5px solid ${logged ? accent + "30" : "rgba(255,255,255,.06)"}`, borderRadius: 12 }}>
      <div style={{ width: 28, fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: "rgba(255,255,255,.45)", fontWeight: 600 }}>
        S{setNum}
      </div>
      <input
        type="text" inputMode="decimal"
        placeholder="kg"
        value={w}
        onChange={(e) => setW(e.target.value)}
        style={cellInput}
      />
      <span style={{ color: "rgba(255,255,255,.2)" }}>×</span>
      <input
        type="text" inputMode="numeric"
        placeholder="reps"
        value={r}
        onChange={(e) => setR(e.target.value)}
        style={cellInput}
      />
      <button
        onClick={submit}
        disabled={!w || !r || logged}
        style={{
          width: 38, height: 38,
          background: logged ? accent : (w && r ? accent : "rgba(255,255,255,.05)"),
          color: logged || (w && r) ? "#000" : "rgba(255,255,255,.3)",
          border: "none", borderRadius: 10,
          cursor: w && r && !logged ? "pointer" : "not-allowed",
          fontSize: 16, fontWeight: 900,
          flexShrink: 0,
        }}
      >
        ✓
      </button>
    </div>
  );
}

const overlay = {
  position: "fixed", inset: 0, zIndex: 300,
  background: "#000",
  display: "flex", flexDirection: "column",
  fontFamily: "'DM Sans', -apple-system, sans-serif",
  color: "#fff",
};
const topbar = {
  display: "flex", alignItems: "center", justifyContent: "space-between",
  padding: "calc(env(safe-area-inset-top, 12px) + 14px) 20px 14px",
  borderBottom: ".5px solid rgba(255,255,255,.05)",
};
const closeBtn = {
  width: 36, height: 36, borderRadius: "50%",
  background: "rgba(255,255,255,.05)", border: "none",
  color: "rgba(255,255,255,.7)",
  fontSize: 22, lineHeight: 1, fontFamily: "inherit",
  cursor: "pointer",
};
const navBtn = {
  height: 50, padding: "0 22px",
  background: "rgba(255,255,255,.04)", color: "#fff",
  border: "none", borderRadius: 12,
  fontFamily: "'DM Sans', sans-serif",
  fontSize: 13, fontWeight: 600,
  letterSpacing: ".05em",
  cursor: "pointer", flexShrink: 0,
};
const cellInput = {
  flex: 1,
  height: 38, padding: "0 12px",
  background: "rgba(255,255,255,.04)",
  border: ".5px solid rgba(255,255,255,.08)",
  borderRadius: 8,
  color: "#fff", fontSize: 14,
  fontFamily: "'JetBrains Mono', monospace",
  outline: "none", textAlign: "center",
  boxSizing: "border-box",
  minWidth: 0,
};

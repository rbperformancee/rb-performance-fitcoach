import React, { useState } from "react";
import { supabase } from "../../lib/supabase";
import { toast } from "../Toast";
import haptic from "../../lib/haptic";

const G = "#02d1ba";

/**
 * BaselineMaxesForm — formulaire one-shot affiché au client à sa 1ère
 * connexion. Lui demande ses charges actuelles sur les 3 mouvements
 * polyarticulaires majeurs (squat / DC / deadlift). Optionnel mais
 * encouragé : "30 secondes pour qu'on parte du bon pied".
 *
 * Effets :
 * - Crée 3 rows exercise_logs avec ex_key='_baseline_<lift>',
 *   weight, reps, sets jsonb [{weight,reps}] → la fiche client coach
 *   affiche déjà ces valeurs comme "starting point" dans Top Exercices.
 * - UPDATE clients.baseline_form_shown_at pour ne plus afficher.
 *
 * Props :
 *   open: bool, onDone: () => void, clientId: uuid
 */

const LIFTS = [
  { id: "squat",    label: "Squat",            placeholder_w: "100", placeholder_r: "5" },
  { id: "bench",    label: "Développé couché", placeholder_w: "80",  placeholder_r: "5" },
  { id: "deadlift", label: "Deadlift",         placeholder_w: "120", placeholder_r: "5" },
];

export default function BaselineMaxesForm({ open, clientId, onDone }) {
  const [values, setValues] = useState({
    squat:    { weight: "", reps: "" },
    bench:    { weight: "", reps: "" },
    deadlift: { weight: "", reps: "" },
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  function update(lift, field, value) {
    setValues((v) => ({ ...v, [lift]: { ...v[lift], [field]: value } }));
  }

  async function markShown() {
    if (!clientId) return;
    try {
      await supabase.from("clients")
        .update({ baseline_form_shown_at: new Date().toISOString() })
        .eq("id", clientId);
    } catch { /* best-effort */ }
  }

  async function submit() {
    if (!clientId) return;
    setError("");

    // Au moins UN des 3 doit être rempli (poids ET reps numériques > 0)
    const filled = LIFTS.filter((l) => {
      const v = values[l.id];
      return parseFloat(v.weight) > 0 && parseInt(v.reps, 10) > 0;
    });
    if (filled.length === 0) {
      setError("Renseigne au moins un mouvement (poids + reps).");
      return;
    }

    haptic.selection();
    setSaving(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const now = new Date().toISOString();
      const rows = filled.map((l) => {
        const w = parseFloat(values[l.id].weight);
        const r = parseInt(values[l.id].reps, 10);
        return {
          client_id: clientId,
          ex_key: `_baseline_${l.id}`,
          date: today,
          weight: w,
          reps: String(r),
          sets: [{ weight: w, reps: r }],
          logged_at: now,
        };
      });
      const { error: insErr } = await supabase.from("exercise_logs").insert(rows);
      if (insErr) throw insErr;
      await markShown();
      haptic.success();
      toast.success("Baseline enregistré — bon début !");
      onDone?.();
    } catch (e) {
      setError(e.message || "Erreur d'enregistrement");
      setSaving(false);
    }
  }

  async function skip() {
    haptic.light();
    await markShown();
    onDone?.();
  }

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1200,
      background: "rgba(0,0,0,0.85)", backdropFilter: "blur(12px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 20, overflowY: "auto",
      fontFamily: "-apple-system,'Inter',sans-serif",
    }}>
      <div style={{
        background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 20, maxWidth: 480, width: "100%", maxHeight: "90vh",
        display: "flex", flexDirection: "column", overflow: "hidden",
      }}>
        <div style={{
          padding: "30px 28px 22px",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
          background: `linear-gradient(180deg, ${G}10 0%, transparent 100%)`,
        }}>
          <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: 3.5, color: G, textTransform: "uppercase", marginBottom: 10 }}>
            Bienvenue · 30 secondes
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#fff", letterSpacing: -0.5, lineHeight: 1.2, marginBottom: 8 }}>
            Tes charges du moment.
          </div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", lineHeight: 1.55 }}>
            Pas besoin de viser le 1RM exact — un set récent que tu as poussé suffit. Ton coach utilise ces chiffres pour calibrer ton programme.
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "20px 28px 24px" }}>
          {LIFTS.map((lift, i) => {
            const v = values[lift.id];
            const hasInput = !!v.weight || !!v.reps;
            return (
              <div key={lift.id} style={{
                marginBottom: i < LIFTS.length - 1 ? 14 : 0,
                padding: "14px 16px",
                background: hasInput ? `${G}06` : "rgba(255,255,255,0.02)",
                border: `1px solid ${hasInput ? `${G}30` : "rgba(255,255,255,0.05)"}`,
                borderRadius: 12,
                transition: "all .15s",
              }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", marginBottom: 10 }}>
                  {lift.label}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <div>
                    <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: "rgba(255,255,255,0.4)", marginBottom: 4 }}>Poids (kg)</div>
                    <input
                      type="number"
                      inputMode="decimal"
                      value={v.weight}
                      onChange={(e) => update(lift.id, "weight", e.target.value)}
                      placeholder={lift.placeholder_w}
                      style={{
                        width: "100%", padding: "10px 12px",
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        borderRadius: 8,
                        color: "#fff", fontSize: 16, fontWeight: 600,
                        fontVariantNumeric: "tabular-nums",
                        outline: "none", boxSizing: "border-box",
                        fontFamily: "inherit",
                      }}
                    />
                  </div>
                  <div>
                    <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: "rgba(255,255,255,0.4)", marginBottom: 4 }}>Reps</div>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={v.reps}
                      onChange={(e) => update(lift.id, "reps", e.target.value)}
                      placeholder={lift.placeholder_r}
                      style={{
                        width: "100%", padding: "10px 12px",
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        borderRadius: 8,
                        color: "#fff", fontSize: 16, fontWeight: 600,
                        fontVariantNumeric: "tabular-nums",
                        outline: "none", boxSizing: "border-box",
                        fontFamily: "inherit",
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}

          {error && (
            <div style={{
              marginTop: 14,
              padding: "10px 14px",
              background: "rgba(239,68,68,0.06)",
              border: "1px solid rgba(239,68,68,0.2)",
              borderRadius: 8,
              fontSize: 12, color: "#ef4444",
            }}>{error}</div>
          )}
        </div>

        <div style={{ padding: "16px 28px 22px", borderTop: "1px solid rgba(255,255,255,0.05)", display: "flex", flexDirection: "column", gap: 10 }}>
          <button
            type="button"
            onClick={submit}
            disabled={saving}
            style={{
              width: "100%", padding: "14px 16px", borderRadius: 12,
              background: G, color: "#000", border: "none",
              fontSize: 13, fontWeight: 800, cursor: saving ? "wait" : "pointer",
              fontFamily: "inherit",
              textTransform: "uppercase", letterSpacing: 0.5,
              boxShadow: `0 12px 32px ${G}40`,
              opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? "Enregistrement…" : "Enregistrer"}
          </button>
          <button
            type="button"
            onClick={skip}
            disabled={saving}
            style={{
              background: "transparent", border: "none",
              color: "rgba(255,255,255,0.4)",
              fontSize: 12, cursor: "pointer",
              fontFamily: "inherit",
              textDecoration: "underline", textUnderlineOffset: 3,
              padding: "4px 0",
            }}
          >
            Je le ferai plus tard
          </button>
        </div>
      </div>
    </div>
  );
}

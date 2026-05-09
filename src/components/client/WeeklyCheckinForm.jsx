import React, { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { toast } from "../Toast";
import haptic from "../../lib/haptic";
import { notifyCoachWeeklyCheckin } from "../../lib/notifyCoach";

const G = "#02d1ba";

/**
 * WeeklyCheckinForm — bilan hebdomadaire du client (~30 secondes).
 * Capture poids + 5 mensurations + 4 niveaux de ressenti + note libre.
 *
 * UPSERT sur (client_id, week_start) — si le client soumet 2 fois, c'est
 * la dernière version qui compte. weeks_start = lundi de la semaine en cours.
 *
 * Props :
 *   open: bool
 *   onClose: () => void
 *   clientId: uuid (le client connecté)
 *   onDone?: () => void  // optionnel après soumission
 */
export default function WeeklyCheckinForm({ open, onClose, clientId, onDone }) {
  const [weight, setWeight] = useState("");
  const [waist, setWaist] = useState("");
  const [hips, setHips] = useState("");
  const [chest, setChest] = useState("");
  const [arm, setArm] = useState("");
  const [thigh, setThigh] = useState("");
  const [energy, setEnergy] = useState(null);
  const [sleep, setSleep] = useState(null);
  const [stress, setStress] = useState(null);
  const [motivation, setMotivation] = useState(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState(0); // 0=mesures, 1=ressenti, 2=note

  // Charge le checkin déjà soumis pour cette semaine (si existe) — édition
  useEffect(() => {
    if (!open || !clientId) return;
    const ws = currentWeekStart();
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("weekly_checkins")
        .select("*")
        .eq("client_id", clientId)
        .eq("week_start", ws)
        .maybeSingle();
      if (cancelled || !data) return;
      setWeight(data.weight ?? "");
      setWaist(data.waist_cm ?? "");
      setHips(data.hips_cm ?? "");
      setChest(data.chest_cm ?? "");
      setArm(data.arm_cm ?? "");
      setThigh(data.thigh_cm ?? "");
      setEnergy(data.energy_level);
      setSleep(data.sleep_quality);
      setStress(data.stress_level);
      setMotivation(data.motivation_level);
      setNote(data.note || "");
    })();
    return () => { cancelled = true; };
  }, [open, clientId]);

  if (!open) return null;

  function currentWeekStart() {
    const d = new Date();
    const day = d.getDay();
    const diff = day === 0 ? 6 : day - 1;
    d.setDate(d.getDate() - diff);
    return d.toISOString().slice(0, 10);
  }

  async function submit() {
    if (!clientId) return;
    haptic.medium();
    setSaving(true);
    const payload = {
      client_id: clientId,
      week_start: currentWeekStart(),
      weight: weight !== "" ? parseFloat(String(weight).replace(",", ".")) : null,
      waist_cm: waist !== "" ? parseFloat(String(waist).replace(",", ".")) : null,
      hips_cm: hips !== "" ? parseFloat(String(hips).replace(",", ".")) : null,
      chest_cm: chest !== "" ? parseFloat(String(chest).replace(",", ".")) : null,
      arm_cm: arm !== "" ? parseFloat(String(arm).replace(",", ".")) : null,
      thigh_cm: thigh !== "" ? parseFloat(String(thigh).replace(",", ".")) : null,
      energy_level: energy,
      sleep_quality: sleep,
      stress_level: stress,
      motivation_level: motivation,
      note: note.trim() || null,
      submitted_at: new Date().toISOString(),
    };
    try {
      const { error } = await supabase
        .from("weekly_checkins")
        .upsert(payload, { onConflict: "client_id,week_start" });
      if (error) throw error;
      // Push au coach si le client a écrit une note
      notifyCoachWeeklyCheckin(clientId, { hasNote: !!payload.note });
      toast.success("Bilan envoyé à ton coach");
      onDone?.();
      onClose?.();
    } catch (e) {
      toast.error(e.message || "Erreur lors de l'envoi");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
      style={{
        position: "fixed", inset: 0, zIndex: 1300,
        background: "rgba(0,0,0,0.92)", backdropFilter: "blur(14px)",
        display: "flex", alignItems: "flex-end", justifyContent: "center",
        fontFamily: "-apple-system,'Inter',sans-serif",
      }}
    >
      <div style={{
        background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "20px 20px 0 0",
        maxWidth: 480, width: "100%", maxHeight: "92vh",
        display: "flex", flexDirection: "column", overflow: "hidden",
      }}>
        {/* HEADER */}
        <div style={{ padding: "22px 24px 18px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: 3, color: G, textTransform: "uppercase", marginBottom: 6 }}>
                Bilan de la semaine
              </div>
              <div style={{ fontSize: 20, fontWeight: 800, color: "#fff", letterSpacing: -0.4, lineHeight: 1.2 }}>
                {step === 0 ? "Tes mesures" : step === 1 ? "Ton ressenti" : "Un mot pour ton coach ?"}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fermer"
              style={{ width: 32, height: 32, borderRadius: 10, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.7)", cursor: "pointer", fontSize: 16, lineHeight: 1, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}
            >×</button>
          </div>
          {/* Progress */}
          <div style={{ marginTop: 14, display: "flex", gap: 4 }}>
            {[0,1,2].map((s) => (
              <div key={s} style={{
                flex: 1, height: 3, borderRadius: 100,
                background: s <= step ? G : "rgba(255,255,255,0.08)",
                transition: "background .2s",
              }} />
            ))}
          </div>
        </div>

        {/* CONTENT */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px 24px" }}>
          {step === 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <NumField label="Poids" unit="kg" value={weight} onChange={setWeight} placeholder="74.5" />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <NumField label="Taille" unit="cm" value={waist} onChange={setWaist} placeholder="82" />
                <NumField label="Hanches" unit="cm" value={hips} onChange={setHips} placeholder="98" />
                <NumField label="Poitrine" unit="cm" value={chest} onChange={setChest} placeholder="102" />
                <NumField label="Bras" unit="cm" value={arm} onChange={setArm} placeholder="36" />
                <NumField label="Cuisse" unit="cm" value={thigh} onChange={setThigh} placeholder="58" />
              </div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", lineHeight: 1.5, marginTop: 4 }}>
                Tout est optionnel — remplis ce que tu veux. Le coach voit ton évolution.
              </div>
            </div>
          )}

          {step === 1 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <Scale1to5 label="Énergie cette semaine" value={energy} onChange={setEnergy} lowLabel="À plat" highLabel="Au top" />
              <Scale1to5 label="Qualité du sommeil"     value={sleep}  onChange={setSleep}  lowLabel="Mauvais" highLabel="Excellent" />
              <Scale1to5 label="Niveau de stress"        value={stress} onChange={setStress} lowLabel="Zen"     highLabel="Très stressé" />
              <Scale1to5 label="Motivation entraînement" value={motivation} onChange={setMotivation} lowLabel="Faible" highLabel="Maximale" />
            </div>
          )}

          {step === 2 && (
            <div>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Une remarque, une question, un objectif spécifique pour la semaine prochaine ?"
                rows={6}
                style={{
                  width: "100%", padding: "14px 16px",
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 12,
                  color: "#fff", fontSize: 14, fontFamily: "inherit",
                  outline: "none", boxSizing: "border-box", resize: "none",
                }}
              />
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 8, lineHeight: 1.5 }}>
                Optionnel. Ton coach lit chaque bilan en début de semaine.
              </div>
            </div>
          )}
        </div>

        {/* FOOTER NAV */}
        <div style={{ padding: "14px 20px calc(env(safe-area-inset-bottom, 0px) + 14px)", borderTop: "1px solid rgba(255,255,255,0.05)", display: "flex", gap: 10 }}>
          {step > 0 && (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              style={{
                padding: "12px 18px",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 10,
                color: "rgba(255,255,255,0.6)",
                fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
              }}
            >←</button>
          )}
          <button
            type="button"
            onClick={() => step < 2 ? setStep(step + 1) : submit()}
            disabled={saving}
            style={{
              flex: 1,
              padding: "12px 18px",
              background: G, color: "#000",
              border: "none", borderRadius: 10,
              fontSize: 12, fontWeight: 800, cursor: saving ? "wait" : "pointer",
              fontFamily: "inherit", letterSpacing: ".05em", textTransform: "uppercase",
            }}
          >
            {step < 2 ? "Suivant →" : (saving ? "Envoi…" : "Envoyer le bilan")}
          </button>
        </div>
      </div>
    </div>
  );
}

function NumField({ label, unit, value, onChange, placeholder }) {
  return (
    <label style={{ display: "block" }}>
      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase", color: "rgba(255,255,255,0.4)", marginBottom: 6 }}>{label}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <input
          type="text"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          style={{
            flex: 1,
            padding: "11px 13px",
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 10,
            color: "#fff", fontSize: 14, fontFamily: "'JetBrains Mono', monospace",
            outline: "none", boxSizing: "border-box",
          }}
        />
        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", minWidth: 22 }}>{unit}</span>
      </div>
    </label>
  );
}

function Scale1to5({ label, value, onChange, lowLabel, highLabel }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.75)", marginBottom: 8 }}>{label}</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 6 }}>
        {[1,2,3,4,5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(value === n ? null : n)}
            style={{
              padding: "12px 0",
              background: value === n ? G : "rgba(255,255,255,0.04)",
              border: `1px solid ${value === n ? G : "rgba(255,255,255,0.08)"}`,
              borderRadius: 10,
              color: value === n ? "#000" : "rgba(255,255,255,0.65)",
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 15, fontWeight: 700,
              cursor: "pointer", transition: "all .12s",
            }}
          >{n}</button>
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 9, color: "rgba(255,255,255,0.3)", letterSpacing: "1px", textTransform: "uppercase", fontWeight: 700 }}>
        <span>{lowLabel}</span><span>{highLabel}</span>
      </div>
    </div>
  );
}

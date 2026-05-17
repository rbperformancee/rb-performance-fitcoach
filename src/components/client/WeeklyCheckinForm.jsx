import React, { useState, useEffect, useRef } from "react";
import { supabase } from "../../lib/supabase";
import { toast } from "../Toast";
import haptic from "../../lib/haptic";
import { notifyCoachWeeklyCheckin } from "../../lib/notifyCoach";
import { uploadChatPhoto } from "../../lib/chatMedia";

const G = "#02d1ba";

const POSES = [
  { key: "face", label: "Face" },
  { key: "profil", label: "Profil" },
  { key: "dos", label: "Dos" },
];

/**
 * WeeklyCheckinForm — bilan hebdomadaire du client (~30 secondes).
 * Capture poids + photos de progression + ressenti + note. Les
 * mensurations ne sont demandées que si le coach les a activées pour
 * ce client (clients.checkin_measurements_enabled) : pour beaucoup de
 * clients le poids + les photos (miroir) suffisent.
 *
 * UPSERT sur (client_id, week_start) — si le client soumet 2 fois, c'est
 * la dernière version qui compte. week_start = lundi de la semaine en cours.
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
  const [photos, setPhotos] = useState({}); // { face: url, profil: url, dos: url }
  const [uploadingPose, setUploadingPose] = useState(null);
  const [measurementsEnabled, setMeasurementsEnabled] = useState(false);
  const [coachFeedback, setCoachFeedback] = useState(null); // { week_start, coach_comment, coach_status }
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState(0); // 0=poids/mesures, 1=photos, 2=ressenti, 3=note
  const fileRef = useRef(null);

  // Charge le checkin de la semaine (édition) + le réglage mensurations
  // + le dernier retour du coach.
  useEffect(() => {
    if (!open || !clientId) return;
    const ws = currentWeekStart();
    let cancelled = false;
    (async () => {
      const [{ data: cur }, { data: cl }, { data: fb }] = await Promise.all([
        supabase.from("weekly_checkins").select("*").eq("client_id", clientId).eq("week_start", ws).maybeSingle(),
        supabase.from("clients").select("checkin_measurements_enabled").eq("id", clientId).maybeSingle(),
        supabase.from("weekly_checkins")
          .select("week_start, coach_comment, coach_status")
          .eq("client_id", clientId)
          .not("coach_comment", "is", null)
          .order("week_start", { ascending: false })
          .limit(1).maybeSingle(),
      ]);
      if (cancelled) return;
      setMeasurementsEnabled(!!cl?.checkin_measurements_enabled);
      if (fb?.coach_comment) setCoachFeedback(fb);
      if (cur) {
        setWeight(cur.weight ?? "");
        setWaist(cur.waist_cm ?? "");
        setHips(cur.hips_cm ?? "");
        setChest(cur.chest_cm ?? "");
        setArm(cur.arm_cm ?? "");
        setThigh(cur.thigh_cm ?? "");
        setEnergy(cur.energy_level);
        setSleep(cur.sleep_quality);
        setStress(cur.stress_level);
        setMotivation(cur.motivation_level);
        setNote(cur.note || "");
        const p = {};
        (Array.isArray(cur.photos) ? cur.photos : []).forEach((x) => { if (x?.pose && x?.url) p[x.pose] = x.url; });
        setPhotos(p);
      }
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

  async function handlePhoto(file) {
    if (!file || !uploadingPose) return;
    const pose = uploadingPose;
    try {
      const url = await uploadChatPhoto(file, clientId);
      setPhotos((p) => ({ ...p, [pose]: url }));
      haptic.light();
    } catch (e) {
      toast.error("Photo non envoyée : " + (e?.message || "erreur"));
    } finally {
      setUploadingPose(null);
    }
  }

  async function submit() {
    if (!clientId) return;
    haptic.medium();
    setSaving(true);
    const photoArr = POSES
      .filter((p) => photos[p.key])
      .map((p) => ({ pose: p.key, url: photos[p.key] }));
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
      photos: photoArr.length ? photoArr : null,
      submitted_at: new Date().toISOString(),
    };
    try {
      const { error } = await supabase
        .from("weekly_checkins")
        .upsert(payload, { onConflict: "client_id,week_start" });
      if (error) throw error;
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

  const stepTitle = ["Ton poids", "Tes photos", "Ton ressenti", "Un mot pour ton coach ?"][step];

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
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePhoto(f); e.target.value = ""; }}
      />
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
                {stepTitle}
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
            {[0,1,2,3].map((s) => (
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
          {/* Retour du coach sur le dernier bilan */}
          {step === 0 && coachFeedback && (
            <div style={{
              marginBottom: 18, padding: "12px 14px",
              background: "rgba(2,209,186,0.06)", border: "1px solid rgba(2,209,186,0.2)",
              borderRadius: 12,
            }}>
              <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: 1.5, color: G, textTransform: "uppercase", marginBottom: 6 }}>
                Retour de ton coach
              </div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.8)", lineHeight: 1.5, fontStyle: "italic" }}>
                « {coachFeedback.coach_comment} »
              </div>
            </div>
          )}

          {step === 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <NumField label="Poids" unit="kg" value={weight} onChange={setWeight} placeholder="74.5" />
              {measurementsEnabled && (
                <>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <NumField label="Taille" unit="cm" value={waist} onChange={setWaist} placeholder="82" />
                    <NumField label="Hanches" unit="cm" value={hips} onChange={setHips} placeholder="98" />
                    <NumField label="Poitrine" unit="cm" value={chest} onChange={setChest} placeholder="102" />
                    <NumField label="Bras" unit="cm" value={arm} onChange={setArm} placeholder="36" />
                    <NumField label="Cuisse" unit="cm" value={thigh} onChange={setThigh} placeholder="58" />
                  </div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", lineHeight: 1.5, marginTop: 4 }}>
                    Tout est optionnel — remplis ce que tu veux. Ton coach voit ton évolution.
                  </div>
                </>
              )}
              {!measurementsEnabled && (
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", lineHeight: 1.5, marginTop: 4 }}>
                  Le poids et les photos suffisent — ton coach suit le reste à l'œil.
                </div>
              )}
            </div>
          )}

          {step === 1 && (
            <div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", lineHeight: 1.5, marginBottom: 14 }}>
                Prends tes photos au même endroit, même lumière, à jeun si possible.
                C'est le meilleur indicateur de ta progression.
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                {POSES.map((p) => (
                  <PhotoSlot
                    key={p.key}
                    label={p.label}
                    url={photos[p.key]}
                    uploading={uploadingPose === p.key}
                    onPick={() => { setUploadingPose(p.key); fileRef.current?.click(); }}
                    onRemove={() => setPhotos((ph) => { const n = { ...ph }; delete n[p.key]; return n; })}
                  />
                ))}
              </div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 12, lineHeight: 1.5 }}>
                Optionnel. Seul ton coach voit ces photos.
              </div>
            </div>
          )}

          {step === 2 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <Scale1to5 label="Énergie cette semaine" value={energy} onChange={setEnergy} lowLabel="À plat" highLabel="Au top" />
              <Scale1to5 label="Qualité du sommeil"     value={sleep}  onChange={setSleep}  lowLabel="Mauvais" highLabel="Excellent" />
              <Scale1to5 label="Niveau de stress"        value={stress} onChange={setStress} lowLabel="Zen"     highLabel="Très stressé" />
              <Scale1to5 label="Motivation entraînement" value={motivation} onChange={setMotivation} lowLabel="Faible" highLabel="Maximale" />
            </div>
          )}

          {step === 3 && (
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
            onClick={() => step < 3 ? setStep(step + 1) : submit()}
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
            {step < 3 ? "Suivant →" : (saving ? "Envoi…" : "Envoyer le bilan")}
          </button>
        </div>
      </div>
    </div>
  );
}

function PhotoSlot({ label, url, uploading, onPick, onRemove }) {
  return (
    <div style={{ position: "relative" }}>
      <button
        type="button"
        onClick={onPick}
        disabled={uploading}
        style={{
          width: "100%", aspectRatio: "3 / 4",
          background: url ? "#000" : "rgba(255,255,255,0.03)",
          border: `1px ${url ? "solid" : "dashed"} ${url ? "rgba(2,209,186,0.4)" : "rgba(255,255,255,0.15)"}`,
          borderRadius: 12, cursor: uploading ? "wait" : "pointer",
          overflow: "hidden", padding: 0,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6,
        }}
      >
        {url ? (
          <img src={url} alt={label} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : uploading ? (
          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.5)" }}>Envoi…</span>
        ) : (
          <>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={G} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
            <span style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.5)", letterSpacing: 1, textTransform: "uppercase" }}>{label}</span>
          </>
        )}
      </button>
      {url && !uploading && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={"Retirer " + label}
          style={{
            position: "absolute", top: 5, right: 5,
            width: 22, height: 22, borderRadius: "50%",
            background: "rgba(0,0,0,0.7)", border: "1px solid rgba(255,255,255,0.2)",
            color: "#fff", fontSize: 12, lineHeight: 1, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >×</button>
      )}
      {url && (
        <div style={{ position: "absolute", bottom: 5, left: 5, fontSize: 8, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: "#fff", background: "rgba(0,0,0,0.6)", padding: "2px 6px", borderRadius: 5 }}>
          {label}
        </div>
      )}
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

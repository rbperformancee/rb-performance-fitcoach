import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import Spinner from "./Spinner";
import haptic from "../lib/haptic";
import { useT, getLocale } from "../lib/i18n";

const fillTpl = (s, vars) => {
  let out = s;
  Object.entries(vars).forEach(([k, v]) => { out = out.split(`{${k}}`).join(String(v)); });
  return out;
};

const intlLocale = () => getLocale() === "en" ? "en-US" : "fr-FR";

// ========== CHARTE RB PERFORM ==========
const GREEN = "#02d1ba";
const BG_BLACK = "#050505";

// ========== COMPOSANTS UI PREMIUM ==========

// Input premium — fontSize 16 obligatoire pour empecher l'auto-zoom iOS Safari
const Input = ({ label, placeholder, type = "text", value, onChange, textarea = false, half = false, autoFocus = false }) => (
  <div style={{ marginBottom: 18, width: half ? "calc(50% - 8px)" : "100%" }}>
    <div style={{ fontSize: 10, letterSpacing: "2px", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", marginBottom: 8, fontWeight: 600 }}>
      {label}
    </div>
    {textarea ? (
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={3}
        autoFocus={autoFocus}
        style={{
          width: "100%",
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 14,
          color: "#fff",
          fontFamily: "-apple-system,Inter,sans-serif",
          fontSize: 16, // 16 minimum pour iOS no-zoom
          fontWeight: 400,
          lineHeight: 1.5,
          padding: "14px 16px",
          outline: "none",
          resize: "vertical",
          minHeight: 90,
          boxSizing: "border-box",
          transition: "border-color 0.2s, background 0.2s",
          WebkitAppearance: "none",
          WebkitTapHighlightColor: "transparent",
        }}
        onFocus={(e) => { e.target.style.borderColor = "rgba(2,209,186,0.4)"; e.target.style.background = "rgba(255,255,255,0.06)"; }}
        onBlur={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.08)"; e.target.style.background = "rgba(255,255,255,0.04)"; }}
      />
    ) : (
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        inputMode={type === "number" ? "decimal" : undefined}
        style={{
          width: "100%",
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 14,
          color: "#fff",
          fontFamily: "-apple-system,Inter,sans-serif",
          fontSize: 16, // 16 minimum pour iOS no-zoom
          fontWeight: 400,
          padding: "14px 16px",
          outline: "none",
          boxSizing: "border-box",
          transition: "border-color 0.2s, background 0.2s",
          WebkitAppearance: "none",
          WebkitTapHighlightColor: "transparent",
        }}
        onFocus={(e) => { e.target.style.borderColor = "rgba(2,209,186,0.4)"; e.target.style.background = "rgba(255,255,255,0.06)"; }}
        onBlur={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.08)"; e.target.style.background = "rgba(255,255,255,0.04)"; }}
      />
    )}
  </div>
);

// Scale 1-10 — pills rondes premium au lieu des cases carrees
const Scale = ({ label, value, onChange }) => (
  <div style={{ marginBottom: 24 }}>
    <div style={{ fontSize: 10, letterSpacing: "2px", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", marginBottom: 12, fontWeight: 600 }}>
      {label}
    </div>
    <div style={{ display: "flex", gap: 6 }}>
      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => {
        const active = value >= n;
        const isCurrent = value === n;
        return (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            style={{
              flex: 1,
              height: 42,
              minWidth: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: active ? GREEN : "rgba(255,255,255,0.03)",
              border: `1px solid ${active ? GREEN : "rgba(255,255,255,0.08)"}`,
              borderRadius: 12,
              color: active ? "#000" : "rgba(255,255,255,0.3)",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              transition: "all 0.18s ease",
              boxShadow: isCurrent ? `0 0 20px rgba(2,209,186,0.4)` : "none",
              transform: isCurrent ? "scale(1.04)" : "scale(1)",
              WebkitTapHighlightColor: "transparent",
              WebkitAppearance: "none",
              fontFamily: "-apple-system,Inter,sans-serif",
            }}
          >
            {n}
          </button>
        );
      })}
    </div>
  </div>
);

// Barre de progression premium
const StepBar = ({ step, total, label = "Etape" }) => (
  <div style={{ marginBottom: 28 }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
      <div style={{ fontSize: 10, letterSpacing: "3px", textTransform: "uppercase", color: "rgba(2,209,186,0.55)", fontWeight: 600 }}>
        {label} {step} <span style={{ color: "rgba(255,255,255,0.2)" }}>/ {total}</span>
      </div>
      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", fontWeight: 600, letterSpacing: "0.5px" }}>
        {Math.round((step / total) * 100)}%
      </div>
    </div>
    <div style={{ height: 3, background: "rgba(255,255,255,0.05)", borderRadius: 2, overflow: "hidden" }}>
      <div
        style={{
          height: "100%",
          width: `${(step / total) * 100}%`,
          background: `linear-gradient(90deg, ${GREEN}, #0891b2)`,
          borderRadius: 2,
          transition: "width 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
          boxShadow: `0 0 12px rgba(2,209,186,0.4)`,
        }}
      />
    </div>
  </div>
);

// ========== COMPOSANT PRINCIPAL ==========

// mode = "client" (default) : onboarding post-invitation, save dans
//                              onboarding_forms via Supabase, step 6 = booking.
// mode = "application"      : candidature high-ticket publique sur /candidature,
//                              save via POST /api/coaching-application, skip
//                              booking (Rayan contacte ensuite via WhatsApp).
export default function OnboardingFlow({ client, onComplete, mode = "client" }) {
  const t = useT();
  const isApplication = mode === "application";
  const draftKey = isApplication ? "rb_application_draft" : "rb_onboarding_draft";
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [bookedSlot, setBookedSlot] = useState(null);

  const [form, setForm] = useState(() => {
    const empty = {
      nom_prenom: client?.full_name || "",
      email: "",  // Mode application : champ public requis
      telephone: "",
      age: "", poids: "", taille: "", passe_sportif: "",
      metier: "", sommeil: "", pas_jour: "", allergies: "", repas: "", jours_entrainement: "", heures_seance: "", diet_actuelle: "",
      points_faibles: "", objectifs_6semaines: "", objectifs_3mois: "", objectifs_6mois: "",
      motivation_score: 0, freins: "", sacrifices: "", vision_physique: "",
      one_rm_bench: "", one_rm_squat: "", one_rm_traction: "",
      motivation_principale: "", risques_abandon: "", autres_infos: "",
    };
    try {
      const raw = localStorage.getItem(draftKey);
      if (!raw) return empty;
      const { form: saved, ts } = JSON.parse(raw);
      // Drafts older than 7 days expire
      if (Date.now() - ts > 7 * 24 * 3600 * 1000) { localStorage.removeItem(draftKey); return empty; }
      return { ...empty, ...saved };
    } catch { return empty; }
  });

  // Persist draft on every form change
  useEffect(() => {
    try { localStorage.setItem(draftKey, JSON.stringify({ form, ts: Date.now() })); } catch {}
  }, [form, draftKey]);

  const set = (key) => (val) => setForm((p) => ({ ...p, [key]: val }));

  useEffect(() => {
    if (step === 6 && !isApplication) fetchSlots();
  }, [step, isApplication]);

  const fetchSlots = async () => {
    const today = new Date().toISOString().split("T")[0];
    const { data } = await supabase
      .from("coach_slots")
      .select("*")
      .eq("is_available", true)
      .gte("date", today)
      .order("date")
      .order("heure")
      .limit(20);
    setSlots(data || []);
  };

  const saveForm = async () => {
    setSaving(true);
    try { localStorage.setItem(draftKey, JSON.stringify({ form, ts: Date.now() })); } catch {}

    // Mode application (publique, /candidature) : POST vers /api/coaching-application
    if (isApplication) {
      try {
        // UTM tracking depuis sessionStorage (capture sur la landing)
        let utm = {};
        try { utm = JSON.parse(sessionStorage.getItem("rb_utm") || "{}"); } catch {}
        const res = await fetch("/api/coaching-application", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...form,
            source: "instagram",
            utm_source: utm.utm_source || null,
            utm_medium: utm.utm_medium || null,
            utm_campaign: utm.utm_campaign || null,
            utm_content: utm.utm_content || null,
            referrer: utm.referrer || document.referrer || null,
          }),
        });
        const json = await res.json();
        setSaving(false);
        if (!res.ok || !json.ok) {
          console.error("[application] submit failed:", json.error);
          return { ok: false, reason: json.error || "submit_failed" };
        }
        try { localStorage.removeItem(draftKey); } catch {}
        return { ok: true };
      } catch (e) {
        console.error("[application] submit exception:", e.message);
        setSaving(false);
        return { ok: false, reason: e.message };
      }
    }

    // Mode client (onboarding post-invitation) : upsert Supabase
    if (!client?.id) {
      console.error("[onboarding] saveForm called without client.id — keeping localStorage backup");
      setSaving(false);
      return { ok: false, reason: "no_client_id" };
    }
    const { error } = await supabase
      .from("onboarding_forms")
      .upsert({ client_id: client.id, ...form, is_complete: true, submitted_at: new Date().toISOString() }, { onConflict: "client_id" });
    setSaving(false);
    if (error) {
      console.error("[onboarding] saveForm failed:", error.message);
      return { ok: false, reason: error.message };
    }
    try { localStorage.removeItem(draftKey); } catch {}
    return { ok: true };
  };

  const bookSlot = async () => {
    if (!selectedSlot) return;
    setSaving(true);
    if (client?.id) {
      await supabase.from("bookings").insert({ client_id: client.id, slot_id: selectedSlot.id });
    }
    await supabase.from("coach_slots").update({ is_available: false }).eq("id", selectedSlot.id);
    setBookedSlot(selectedSlot);
    setSaving(false);
    setStep(7);
  };

  const nextStep = async () => {
    haptic.selection();
    // En mode application : step 5 → submit → step 7 (skip booking step 6).
    // En mode client : step 5 → save → step 6 (booking).
    if (step === 5) {
      const result = await saveForm();
      if (isApplication) {
        if (!result?.ok) {
          // Erreur submit : on reste sur step 5 pour que l'user retry
          alert("Une erreur est survenue lors de l'envoi. Verifie ta connexion et reessaye.");
          return;
        }
        setStep(7);
        window.scrollTo(0, 0);
        return;
      }
    }
    setStep((s) => s + 1);
    window.scrollTo(0, 0);
  };

  // ========== STYLES PARTAGES ==========

  const S = {
    wrap: {
      minHeight: "100dvh",
      background: BG_BLACK,
      fontFamily: "-apple-system,Inter,sans-serif",
      color: "#fff",
      padding: "0 0 100px",
      WebkitTapHighlightColor: "transparent",
    },
    inner: {
      maxWidth: 480,
      margin: "0 auto",
      padding: "44px 24px 0",
      animation: "stepFadeIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) both",
    },
    eyebrow: {
      fontSize: 10,
      letterSpacing: "4px",
      textTransform: "uppercase",
      color: "rgba(2,209,186,0.55)",
      marginBottom: 10,
      fontWeight: 700,
    },
    h1: {
      fontSize: 44,
      fontWeight: 900,
      letterSpacing: "-2px",
      lineHeight: 0.92,
      color: "#fff",
      marginBottom: 28,
    },
    row: { display: "flex", gap: 16, flexWrap: "wrap" },
    btn: (active = true) => ({
      width: "100%",
      padding: 17,
      background: active ? `linear-gradient(135deg, ${GREEN}, #0891b2)` : "rgba(255,255,255,0.04)",
      border: "none",
      borderRadius: 16,
      color: active ? "#000" : "rgba(255,255,255,0.25)",
      fontSize: 14,
      fontWeight: 800,
      cursor: active ? "pointer" : "not-allowed",
      fontFamily: "-apple-system,Inter,sans-serif",
      marginTop: 28,
      letterSpacing: "0.5px",
      textTransform: "uppercase",
      boxShadow: active ? `0 8px 32px rgba(2,209,186,0.25)` : "none",
      transition: "transform 0.15s ease, box-shadow 0.2s ease",
      WebkitTapHighlightColor: "transparent",
      WebkitAppearance: "none",
    }),
    back: {
      background: "transparent",
      border: "none",
      color: "rgba(255,255,255,0.3)",
      fontSize: 12,
      cursor: "pointer",
      fontFamily: "-apple-system,Inter,sans-serif",
      marginTop: 14,
      display: "block",
      textAlign: "center",
      width: "100%",
      letterSpacing: "0.5px",
      WebkitTapHighlightColor: "transparent",
      WebkitAppearance: "none",
      padding: 6,
    },
  };

  // Background ambient — radial vert subtil + grille discrete
  const BG = (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "linear-gradient(rgba(2,209,186,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(2,209,186,0.025) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage: "radial-gradient(ellipse at top, #000 30%, transparent 80%)",
          WebkitMaskImage: "radial-gradient(ellipse at top, #000 30%, transparent 80%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 600,
          height: 600,
          top: -250,
          left: "50%",
          transform: "translateX(-50%)",
          background: "radial-gradient(circle, rgba(2,209,186,0.12), transparent 65%)",
          borderRadius: "50%",
          filter: "blur(90px)",
        }}
      />
    </div>
  );

  // Animations CSS globales injectees une seule fois
  const GLOBAL_STYLES = (
    <style>{`
      @keyframes stepFadeIn {
        from { opacity: 0; transform: translateY(16px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes checkIn {
        0% { opacity: 0; transform: scale(0.5); }
        70% { transform: scale(1.1); }
        100% { opacity: 1; transform: scale(1); }
      }
      @keyframes fadeUp {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes tealPulse {
        0%, 100% { color: ${GREEN}; }
        50% { color: #5ee8d4; text-shadow: 0 0 30px rgba(2,209,186,0.6); }
      }
      input::placeholder, textarea::placeholder {
        color: rgba(255,255,255,0.2);
      }
      /* Hide spinner buttons on number inputs */
      input[type=number]::-webkit-inner-spin-button,
      input[type=number]::-webkit-outer-spin-button {
        -webkit-appearance: none;
        margin: 0;
      }
      input[type=number] { -moz-appearance: textfield; }
      /* No tap zoom on iOS Safari for any input */
      input, textarea, select, button { -webkit-tap-highlight-color: transparent; }
    `}</style>
  );

  // ========== ETAPES ==========

  // ── ETAPE 1 — Profil ────────────────────────────────────────
  if (step === 1)
    return (
      <div style={S.wrap}>
        {GLOBAL_STYLES}
        {BG}
        <div key="step1" style={{ ...S.inner, position: "relative", zIndex: 1 }}>
          <StepBar step={1} total={isApplication ? 5 : 6} label={t("obf.step")} />
          <div style={S.eyebrow}>{isApplication ? "Candidature Coaching Premium" : t("obf.step1_eyebrow")}</div>
          <div style={S.h1}>
            {isApplication ? (
              <>5 places.<br/><span style={{ color: GREEN }}>Pas une de plus.</span></>
            ) : (
              <>{t("obf.step1_title_line1")}<br />
              <span style={{ color: GREEN }}>{t("obf.step1_title_line2")}</span></>
            )}
          </div>
          {isApplication && (
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", lineHeight: 1.7, marginBottom: 28, maxWidth: 420 }}>
              Ce questionnaire prend 8-10 min. Je le lis personnellement. Si ton profil match, je te contacte sous 48h.
            </div>
          )}
          <Input label={t("obf.name_label")} placeholder={t("obf.name_placeholder")} value={form.nom_prenom} onChange={set("nom_prenom")} />
          {isApplication && (
            <Input label="Email" placeholder="ton@email.com" type="email" value={form.email} onChange={set("email")} />
          )}
          <div style={S.row}>
            <Input label={t("obf.age_label")} placeholder={t("obf.age_placeholder")} type="number" value={form.age} onChange={set("age")} half />
            <Input label={t("obf.weight_label")} placeholder={t("obf.weight_placeholder")} type="number" value={form.poids} onChange={set("poids")} half />
          </div>
          <Input label={t("obf.height_label")} placeholder={t("obf.height_placeholder")} type="number" value={form.taille} onChange={set("taille")} />
          <Input label={t("obf.phone_label")} placeholder={t("obf.phone_placeholder")} type="tel" value={form.telephone} onChange={set("telephone")} />
          <Input label={t("obf.sport_history_label")} placeholder={t("obf.sport_history_placeholder")} value={form.passe_sportif} onChange={set("passe_sportif")} textarea />
          <button
            style={S.btn(!!form.nom_prenom && (!isApplication || /\S+@\S+\.\S+/.test(form.email)))}
            onClick={nextStep}
            disabled={isApplication && !/\S+@\S+\.\S+/.test(form.email)}
          >{t("obf.continue")}</button>
        </div>
      </div>
    );

  // ── ETAPE 2 — Mode de vie ───────────────────────────────────
  if (step === 2)
    return (
      <div style={S.wrap}>
        {GLOBAL_STYLES}
        {BG}
        <div key="step2" style={{ ...S.inner, position: "relative", zIndex: 1 }}>
          <StepBar step={2} total={6} label={t("obf.step")} />
          <div style={S.eyebrow}>{t("obf.step2_eyebrow")}</div>
          <div style={S.h1}>
            {t("obf.step2_title_line1")}<br />
            <span style={{ color: GREEN }}>{t("obf.step2_title_line2")}</span>
          </div>
          <Input label={t("obf.job_label")} placeholder={t("obf.job_placeholder")} value={form.metier} onChange={set("metier")} />
          <div style={S.row}>
            <Input label={t("obf.sleep_label")} placeholder={t("obf.sleep_placeholder")} value={form.sommeil} onChange={set("sommeil")} half />
            <Input label={t("obf.steps_label")} placeholder={t("obf.steps_placeholder")} value={form.pas_jour} onChange={set("pas_jour")} half />
          </div>
          <Input label={t("obf.allergies_label")} placeholder={t("obf.allergies_placeholder")} value={form.allergies} onChange={set("allergies")} textarea />
          <Input label={t("obf.meals_label")} placeholder={t("obf.meals_placeholder")} value={form.repas} onChange={set("repas")} textarea />
          <div style={S.row}>
            <Input label={t("obf.training_days_label")} placeholder={t("obf.training_days_placeholder")} value={form.jours_entrainement} onChange={set("jours_entrainement")} half />
            <Input label={t("obf.session_duration_label")} placeholder={t("obf.session_duration_placeholder")} value={form.heures_seance} onChange={set("heures_seance")} half />
          </div>
          <Input label={t("obf.diet_label")} placeholder={t("obf.diet_placeholder")} value={form.diet_actuelle} onChange={set("diet_actuelle")} textarea />
          <button style={S.btn()} onClick={nextStep}>{t("obf.continue")}</button>
          <button style={S.back} onClick={() => setStep(1)}>{t("obf.back")}</button>
        </div>
      </div>
    );

  // ── ETAPE 3 — Objectifs ─────────────────────────────────────
  if (step === 3)
    return (
      <div style={S.wrap}>
        {GLOBAL_STYLES}
        {BG}
        <div key="step3" style={{ ...S.inner, position: "relative", zIndex: 1 }}>
          <StepBar step={3} total={6} label={t("obf.step")} />
          <div style={S.eyebrow}>{t("obf.step3_eyebrow")}</div>
          <div style={S.h1}>
            {t("obf.step3_title_line1")}<br />
            <span style={{ color: GREEN }}>{t("obf.step3_title_line2")}</span>
          </div>
          <Input label={t("obf.weak_points_label")} placeholder={t("obf.weak_points_placeholder")} value={form.points_faibles} onChange={set("points_faibles")} textarea />
          <Input label={t("obf.goals_6w_label")} placeholder={t("obf.goals_6w_placeholder")} value={form.objectifs_6semaines} onChange={set("objectifs_6semaines")} textarea />
          <Input label={t("obf.goals_3m_label")} placeholder={t("obf.goals_3m_placeholder")} value={form.objectifs_3mois} onChange={set("objectifs_3mois")} textarea />
          <Input label={t("obf.goals_6m_label")} placeholder={t("obf.goals_6m_placeholder")} value={form.objectifs_6mois} onChange={set("objectifs_6mois")} textarea />
          <button style={S.btn()} onClick={nextStep}>{t("obf.continue")}</button>
          <button style={S.back} onClick={() => setStep(2)}>{t("obf.back")}</button>
        </div>
      </div>
    );

  // ── ETAPE 4 — Mindset ───────────────────────────────────────
  if (step === 4)
    return (
      <div style={S.wrap}>
        {GLOBAL_STYLES}
        {BG}
        <div key="step4" style={{ ...S.inner, position: "relative", zIndex: 1 }}>
          <StepBar step={4} total={6} label={t("obf.step")} />
          <div style={S.eyebrow}>{t("obf.step4_eyebrow")}</div>
          <div style={S.h1}>
            {t("obf.step4_title_line1")}<br />
            <span style={{ color: GREEN }}>{t("obf.step4_title_line2")}</span>
          </div>
          <Scale label={t("obf.motivation_scale_label")} value={form.motivation_score} onChange={set("motivation_score")} />
          <Input label={t("obf.freins_label")} placeholder={t("obf.freins_placeholder")} value={form.freins} onChange={set("freins")} textarea />
          <Input label={t("obf.sacrifices_label")} placeholder={t("obf.sacrifices_placeholder")} value={form.sacrifices} onChange={set("sacrifices")} textarea />
          <Input label={t("obf.vision_label")} placeholder={t("obf.vision_placeholder")} value={form.vision_physique} onChange={set("vision_physique")} textarea />
          <button style={S.btn()} onClick={nextStep}>{t("obf.continue")}</button>
          <button style={S.back} onClick={() => setStep(3)}>{t("obf.back")}</button>
        </div>
      </div>
    );

  // ── ETAPE 5 — Performance ───────────────────────────────────
  if (step === 5)
    return (
      <div style={S.wrap}>
        {GLOBAL_STYLES}
        {BG}
        <div key="step5" style={{ ...S.inner, position: "relative", zIndex: 1 }}>
          <StepBar step={5} total={6} label={t("obf.step")} />
          <div style={S.eyebrow}>{t("obf.step5_eyebrow")}</div>
          <div style={S.h1}>
            {t("obf.step5_title_line1")}<br />
            <span style={{ color: GREEN }}>{t("obf.step5_title_line2")}</span>
          </div>

          {/* Carte performance actuelle */}
          <div
            style={{
              background: "rgba(2,209,186,0.04)",
              border: "1px solid rgba(2,209,186,0.18)",
              borderRadius: 18,
              padding: "20px 18px 4px",
              marginBottom: 22,
            }}
          >
            <div style={{ fontSize: 10, letterSpacing: "2px", textTransform: "uppercase", color: "rgba(2,209,186,0.6)", marginBottom: 14, fontWeight: 700 }}>
              {t("obf.current_perf_label")}
            </div>
            <div style={S.row}>
              <Input label={t("obf.bench_label")} placeholder={t("obf.weight_placeholder")} type="number" value={form.one_rm_bench} onChange={set("one_rm_bench")} half />
              <Input label={t("obf.squat_label")} placeholder={t("obf.weight_placeholder")} type="number" value={form.one_rm_squat} onChange={set("one_rm_squat")} half />
            </div>
            <Input label={t("obf.traction_label")} placeholder={t("obf.traction_placeholder")} value={form.one_rm_traction} onChange={set("one_rm_traction")} />
          </div>

          <Input label={t("obf.main_motivation_label")} placeholder={t("obf.main_motivation_placeholder")} value={form.motivation_principale} onChange={set("motivation_principale")} textarea />
          <Input label={t("obf.abandon_risks_label")} placeholder={t("obf.abandon_risks_placeholder")} value={form.risques_abandon} onChange={set("risques_abandon")} textarea />
          <Input label={t("obf.other_info_label")} placeholder={t("obf.other_info_placeholder")} value={form.autres_infos} onChange={set("autres_infos")} textarea />
          <button style={S.btn()} onClick={nextStep} disabled={saving}>
            {saving ? (<span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}><Spinner variant="dots" size={18} color="#000" />{t("obf.saving")}</span>) : t("obf.book_call_btn")}
          </button>
          <button style={S.back} onClick={() => setStep(4)}>{t("obf.back")}</button>
        </div>
      </div>
    );

  // ── ETAPE 6 — Calendrier ────────────────────────────────────
  if (step === 6)
    return (
      <div style={S.wrap}>
        {GLOBAL_STYLES}
        {BG}
        <div key="step6" style={{ ...S.inner, position: "relative", zIndex: 1 }}>
          <StepBar step={6} total={6} label={t("obf.step")} />
          <div style={S.eyebrow}>{t("obf.step6_eyebrow")}</div>
          <div style={S.h1}>
            {t("obf.step6_title_line1")}<br />
            <span style={{ color: GREEN }}>{t("obf.step6_title_line2")}</span>
          </div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", lineHeight: 1.7, marginBottom: 28, maxWidth: 400 }}>
            {t("obf.book_subtitle")}
          </div>

          {slots.length === 0 ? (
            <div
              style={{
                padding: 28,
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: 18,
                textAlign: "center",
                color: "rgba(255,255,255,0.35)",
                fontSize: 13,
                lineHeight: 1.7,
              }}
            >
              {t("obf.no_slots_main")}
              <br />
              <span style={{ color: GREEN, fontSize: 11, fontWeight: 600, letterSpacing: "0.5px" }}>
                {t("obf.no_slots_sub")}
              </span>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {slots.map((slot) => {
                const date = new Date(slot.date + "T12:00:00");
                const isSelected = selectedSlot?.id === slot.id;
                return (
                  <button
                    key={slot.id}
                    type="button"
                    onClick={() => setSelectedSlot(slot)}
                    style={{
                      padding: "16px 20px",
                      background: isSelected ? "rgba(2,209,186,0.08)" : "rgba(255,255,255,0.025)",
                      border: `1.5px solid ${isSelected ? GREEN : "rgba(255,255,255,0.07)"}`,
                      borderRadius: 16,
                      cursor: "pointer",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      transition: "all 0.2s ease",
                      WebkitTapHighlightColor: "transparent",
                      WebkitAppearance: "none",
                      fontFamily: "-apple-system,Inter,sans-serif",
                      textAlign: "left",
                      width: "100%",
                      boxShadow: isSelected ? "0 4px 24px rgba(2,209,186,0.15)" : "none",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: isSelected ? GREEN : "#fff", marginBottom: 3, textTransform: "capitalize" }}>
                        {date.toLocaleDateString(intlLocale(), { weekday: "long", day: "numeric", month: "long" })}
                      </div>
                      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)" }}>{slot.heure}</div>
                    </div>
                    <div
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: "50%",
                        border: `2px solid ${isSelected ? GREEN : "rgba(255,255,255,0.15)"}`,
                        background: isSelected ? GREEN : "transparent",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 13,
                        color: "#000",
                        fontWeight: 800,
                        flexShrink: 0,
                        transition: "all 0.2s",
                      }}
                    >
                      {isSelected ? "✓" : ""}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          <button
            style={S.btn(!!selectedSlot || slots.length === 0)}
            onClick={slots.length === 0 ? () => setStep(7) : bookSlot}
            disabled={saving}
          >
            {saving ? (<span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}><Spinner variant="dots" size={18} color="#000" />{t("obf.booking")}</span>) : slots.length === 0 ? t("obf.continue") : t("obf.confirm_slot")}
          </button>
          <button style={S.back} onClick={() => setStep(5)}>{t("obf.back")}</button>
        </div>
      </div>
    );

  // ── ETAPE 7 — Confirmation ──────────────────────────────────
  return (
    <div style={{ ...S.wrap, display: "flex", alignItems: "center", justifyContent: "center" }}>
      {GLOBAL_STYLES}
      {BG}
      <div style={{ ...S.inner, position: "relative", zIndex: 1, textAlign: "center", padding: "44px 24px" }}>
        <div
          style={{
            width: 88,
            height: 88,
            borderRadius: "50%",
            background: `linear-gradient(135deg, ${GREEN}, #0891b2)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 32px",
            animation: "checkIn 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) both",
            fontSize: 36,
            color: "#000",
            boxShadow: `0 12px 48px rgba(2,209,186,0.4)`,
          }}
        >
          ✓
        </div>
        <div
          style={{
            fontSize: 10,
            letterSpacing: "5px",
            textTransform: "uppercase",
            color: "rgba(2,209,186,0.6)",
            marginBottom: 16,
            fontWeight: 700,
            animation: "fadeUp 0.6s ease 0.2s both",
          }}
        >
          {isApplication ? "Candidature reçue" : t("obf.welcome_team")}
        </div>
        <h1
          style={{
            fontSize: 44,
            fontWeight: 900,
            letterSpacing: "-2px",
            lineHeight: 0.9,
            marginBottom: 24,
            animation: "fadeUp 0.6s ease 0.3s both",
          }}
        >
          {isApplication ? (
            <>Merci.<br/><span style={{ animation: "tealPulse 3s ease-in-out infinite" }}>Je te recontacte.</span></>
          ) : (
            <>{t("obf.ready_line1")}<br />
            <span style={{ animation: "tealPulse 3s ease-in-out infinite" }}>{t("obf.ready_line2")}</span></>
          )}
        </h1>
        {bookedSlot && (
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "rgba(2,209,186,0.08)",
              border: "1px solid rgba(2,209,186,0.25)",
              borderRadius: 100,
              padding: "10px 22px",
              fontSize: 12,
              color: GREEN,
              fontWeight: 600,
              marginBottom: 24,
              animation: "fadeUp 0.6s ease 0.4s both",
              letterSpacing: "0.3px",
            }}
          >
            {fillTpl(t("obf.call_booked"), {
              date: new Date(bookedSlot.date + "T12:00:00").toLocaleDateString(intlLocale(), { day: "numeric", month: "long" }),
              time: bookedSlot.heure,
            })}
          </div>
        )}
        <p
          style={{
            fontSize: 13,
            color: "rgba(255,255,255,0.4)",
            lineHeight: 1.8,
            marginBottom: 36,
            animation: "fadeUp 0.6s ease 0.5s both",
            maxWidth: 360,
            marginLeft: "auto",
            marginRight: "auto",
          }}
        >
          {isApplication ? (
            <>Ta candidature est arrivée.<br/>Si ton profil match les 5 places ultra-premium, je te contacte sous 48h.</>
          ) : (
            <>{t("obf.sent_line1")}<br />
            {t("obf.sent_line2")}</>
          )}
        </p>
        <button
          style={{ ...S.btn(), animation: "fadeUp 0.6s ease 0.6s both", opacity: saving ? 0.7 : 1 }}
          disabled={saving}
          onClick={async () => {
            if (saving) return;
            setSaving(true);
            try {
              if (isApplication) {
                // Mode application : retour au site, pas de supabase update
                haptic.success();
                window.location.href = "/";
                return;
              }
              if (client?.id) {
                await supabase.from("clients").update({ onboarding_done: true }).eq("id", client.id);
              } else {
                const { data } = await supabase.from("clients").select("id").eq("email", client?.email || "").maybeSingle();
                if (data?.id) await supabase.from("clients").update({ onboarding_done: true }).eq("id", data.id);
              }
              haptic.success();
              onComplete();
            } catch (e) {
              console.error("Finalize onboarding:", e);
              setSaving(false);
            }
          }}
        >
          {saving ? (<span style={{ display: "inline-flex", alignItems: "center", gap: 10, justifyContent: "center" }}><Spinner variant="dots" size={18} color="#000" />{t("obf.finalizing")}</span>) : (isApplication ? "Retour au site" : t("obf.access_space"))}
        </button>
      </div>
    </div>
  );
}

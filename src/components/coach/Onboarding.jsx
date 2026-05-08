import React, { useState, useEffect, useRef } from "react";
import { supabase } from "../../lib/supabase";
import { toast } from "../Toast";
import haptic from "../../lib/haptic";
import { useT } from "../../lib/i18n";
import { usePushNotifications } from "../../hooks/usePushNotifications";

const G = "#02d1ba";

const fillTpl = (s, vars) => {
  let out = s;
  Object.entries(vars).forEach(([k, v]) => { out = out.split(`{${k}}`).join(String(v)); });
  return out;
};

// 10 specialites (selon brief)
const SPECIALITIES = [
  "Musculation", "Cardio", "CrossFit",
  "Seche", "Force", "Performance",
  "Remise en forme", "Running",
  "Arts martiaux", "Nutrition",
];

// Couleurs d'accent premium pour la brand du coach. Choisi pour bien
// passer en UI dark mode (suffisamment saturées pour ressortir).
const ACCENT_COLORS = [
  { id: "teal",    hex: "#02d1ba", label: "Teal" },
  { id: "violet",  hex: "#a78bfa", label: "Violet" },
  { id: "rose",    hex: "#f472b6", label: "Rose" },
  { id: "amber",   hex: "#fbbf24", label: "Ambre" },
  { id: "orange",  hex: "#fb923c", label: "Orange" },
  { id: "emerald", hex: "#34d399", label: "Émeraude" },
  { id: "sky",     hex: "#38bdf8", label: "Ciel" },
  { id: "red",     hex: "#ef4444", label: "Rouge" },
];

// Templates de programmes pré-faits qu'on peut copier au coach. Clé = type
// de programme, valeur = nom affiché. Le seed réel viendra plus tard ; pour
// l'onboarding on capture juste l'intention pour pré-remplir le builder.
// Initiales (2 lettres) au lieu d'emoji — premium.
const PROGRAMME_TEMPLATES = [
  { id: "ppl",       label: "Push / Pull / Legs", desc: "6 séances/sem · hypertrophie", code: "PPL" },
  { id: "fullbody",  label: "Full Body 3x",       desc: "3 séances/sem · débutants",    code: "FB" },
  { id: "powerlift", label: "Powerlifting",       desc: "4 séances/sem · force pure",   code: "PL" },
  { id: "hybrid",    label: "Hybrid Athlete",     desc: "Force + Cardio mixés",         code: "HY" },
];

/**
 * Onboarding — modal plein ecran 3 etapes (+ intro) pour nouveau coach.
 * Declenche si coaches.onboarding_done !== true ET pas en mode demo.
 *
 * Structure:
 *   Header fixe : logo RBPERFORM + progress bar 2px teal
 *   Etape 0 (2s auto) : eclair SVG scale 0→1.1→1 + 'Bienvenue sur RB Perform.'
 *   Etape 1 : first_name, last_name, specialites pills (min 1)
 *   Etape 2 : invitation premier client (email + prenom) → send-invite
 *             lien 'Passer cette etape' discret
 *   Etape 3 : checkmark SVG anime + recap + CTA 'Acceder au dashboard'
 *
 * Props:
 *   coach: { id, full_name, email, specialties? }
 *   onComplete: () => void   // apres PATCH onboarding_done=true
 */
export default function Onboarding({ coach, onComplete }) {
  const t = useT();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState("forward"); // pour animation slide
  const initFirst = coach?.full_name?.split(" ")[0] || "";
  const initLast  = coach?.full_name?.split(" ").slice(1).join(" ") || "";

  const [firstName, setFirstName] = useState(initFirst);
  const [lastName,  setLastName]  = useState(initLast);
  const [specialties, setSpecialties] = useState(coach?.specialties || []);

  const [clientEmail,  setClientEmail]  = useState("");
  const [clientPrenom, setClientPrenom] = useState("");
  const [inviteSent, setInviteSent] = useState(false);
  const [inviteSkipped, setInviteSkipped] = useState(false);

  // ── Brand step ──
  const [brandName, setBrandName] = useState(coach?.brand_name || "");
  const [accentColor, setAccentColor] = useState(coach?.accent_color || "#02d1ba");
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(coach?.logo_url || null);
  const [brandSaving, setBrandSaving] = useState(false);
  const fileInputRef = useRef(null);

  // ── Push step ──
  const { permission: pushPerm, requestPermission: requestPush } = usePushNotifications({ coachId: coach?.id });
  const [pushAttempted, setPushAttempted] = useState(false);

  // ── Programme step ──
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);

  // Total steps = 7 : 0 intro, 1 identité, 2 brand, 3 push, 4 programme,
  // 5 invite, 6 recap
  const TOTAL_STEPS = 6; // dénominateur de progress (intro non comptée)

  // Etape 0 → 1 automatique apres 2s
  useEffect(() => {
    if (step === 0) {
      const id = setTimeout(() => {
        haptic.light();
        setDirection("forward");
        setStep(1);
      }, 2000);
      return () => clearTimeout(id);
    }
  }, [step]);

  function toggleSpecialty(s) {
    haptic.selection();
    setSpecialties((arr) => arr.includes(s) ? arr.filter((x) => x !== s) : [...arr, s]);
  }

  async function saveIdentity() {
    setError("");
    if (!firstName.trim()) { setError(t("onb.error_first_required")); return; }
    if (specialties.length === 0) { setError(t("onb.error_specialty_required")); return; }
    haptic.selection();
    setSaving(true);
    try {
      const full_name = `${firstName.trim()} ${lastName.trim()}`.trim();
      const { error } = await supabase
        .from("coaches")
        .update({
          full_name,
          first_name: firstName.trim(),
          last_name:  lastName.trim(),
          specialties,
        })
        .eq("id", coach.id);
      if (error) throw error;
      // Pré-remplit brandName avec le prénom si vide (peut être édité)
      if (!brandName) setBrandName(firstName.trim());
      setDirection("forward");
      setStep(2);
    } catch (e) {
      setError(e.message || t("onb.error_save"));
    }
    setSaving(false);
  }

  // Handler upload logo : compresse via FileReader (base64 inline → bucket
  // serait plus propre mais évite la dep Storage pendant l'onboarding).
  function pickLogo(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500 * 1024) {
      setError("Logo trop lourd (max 500 Ko). Pour l'instant, choisis une image plus petite.");
      return;
    }
    setError("");
    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = () => setLogoPreview(reader.result);
    reader.readAsDataURL(file);
  }

  async function saveBrand() {
    setError("");
    haptic.selection();
    setBrandSaving(true);
    try {
      const updates = {
        brand_name: brandName.trim() || null,
        accent_color: accentColor,
      };
      // Si logo uploadé, on stocke le base64 inline dans logo_url. Pas
      // optimal pour de gros logos mais robuste & sans dep Storage.
      if (logoFile && logoPreview) {
        updates.logo_url = logoPreview;
      }
      const { error } = await supabase.from("coaches").update(updates).eq("id", coach.id);
      if (error) throw error;
      setDirection("forward");
      setStep(3);
    } catch (e) {
      setError(e.message || "Erreur sauvegarde brand");
    }
    setBrandSaving(false);
  }

  function skipBrand() {
    haptic.light();
    setDirection("forward");
    setStep(3);
  }

  async function activatePush() {
    haptic.selection();
    setPushAttempted(true);
    try {
      await requestPush();
    } catch { /* user denied or error */ }
    // On avance dans tous les cas (granted, denied ou erreur) — pas de blocage
    setTimeout(() => {
      setDirection("forward");
      setStep(4);
    }, 600);
  }

  function skipPush() {
    haptic.light();
    setDirection("forward");
    setStep(4);
  }

  function pickTemplate(id) {
    haptic.selection();
    setSelectedTemplate(id === selectedTemplate ? null : id);
  }

  async function saveTemplate() {
    haptic.selection();
    // Pour l'instant on stocke juste l'intention — le seed réel des templates
    // sera fait plus tard. On enregistre dans coaches.preferred_template
    // pour réutiliser dans le programme builder à l'ouverture.
    if (selectedTemplate) {
      try {
        await supabase.from("coaches").update({ preferred_template: selectedTemplate }).eq("id", coach.id);
      } catch { /* colonne peut ne pas exister, non critique */ }
    }
    setDirection("forward");
    setStep(5);
  }

  function skipTemplate() {
    haptic.light();
    setDirection("forward");
    setStep(5);
  }

  async function sendInvite() {
    const mail = clientEmail.trim().toLowerCase();
    setError("");
    if (!/^[^@]+@[^@]+\.[^@]+$/.test(mail)) {
      setError(t("onb.error_email_invalid")); return;
    }
    haptic.selection();
    setInviteLoading(true);
    try {
      // Cree invitation + call edge fn send-invite (meme que InviteClient.jsx)
      const { data: inv, error: insErr } = await supabase
        .from("invitations")
        .insert({
          coach_id: coach.id,
          email: mail,
          prenom: clientPrenom.trim() || null,
          status: "pending",
        })
        .select("id")
        .single();
      if (insErr) throw insErr;

      const { data: { session } } = await supabase.auth.getSession();
      const jwt = session?.access_token;
      if (jwt) {
        try {
          await fetch(`${process.env.REACT_APP_SUPABASE_URL}/functions/v1/send-invite`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${jwt}` },
            body: JSON.stringify({ invitation_id: inv.id }),
          });
        } catch (_) {}  // non-critique
      }

      toast.success(fillTpl(t("onb.toast_invite_sent"), { email: mail }));
      setInviteSent(true);
      setDirection("forward");
      setTimeout(() => setStep(6), 400); // transition naturelle apres succes
    } catch (e) {
      setError(e.message || t("onb.error_invite_send"));
    }
    setInviteLoading(false);
  }

  function skipInvite() {
    haptic.light();
    setInviteSkipped(true);
    setDirection("forward");
    setStep(6);
  }

  async function finishOnboarding() {
    haptic.success();
    setSaving(true);
    try {
      const { error } = await supabase
        .from("coaches")
        .update({
          onboarding_done: true,
          onboarding_completed_at: new Date().toISOString(),
        })
        .eq("id", coach.id);
      if (error) throw error;
      if (onComplete) onComplete();
    } catch (e) {
      setError(e.message || t("onb.error_finalize"));
      setSaving(false);
    }
  }

  // Progression bar % — 6 étapes (intro non comptée). Affiche 100% sur le
  // recap (step 6) qui marque la complétion finale.
  const progressPct = step === 0 ? 0 : Math.min(100, Math.round((step / TOTAL_STEPS) * 100));

  return (
    <div className="onboarding-overlay">
      <style>{`
        .onboarding-overlay {
          position: fixed; inset: 0;
          background: #000; z-index: 9999;
          display: flex; flex-direction: column;
          font-family: 'DM Sans', -apple-system, sans-serif;
          color: #fff;
        }
        .onb-header {
          display: flex; align-items: center; justify-content: center;
          height: 56px; padding: 0 20px;
          flex-shrink: 0;
        }
        .onb-logo {
          display: flex; align-items: center; gap: 8px;
          font-family: 'Syne', sans-serif;
          font-size: 13px; font-weight: 900;
          letter-spacing: .12em;
          color: #fff;
        }
        .onb-logo .teal { color: ${G}; }
        .onboarding-progress {
          height: 2px;
          background: rgba(255,255,255,.08);
          overflow: hidden;
        }
        .onboarding-progress-bar {
          height: 100%; background: ${G};
          transition: width .4s cubic-bezier(.22,1,.36,1);
          box-shadow: 0 0 8px rgba(2,209,186,.5);
        }
        .onboarding-content {
          flex: 1;
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          padding: 40px 24px;
          max-width: 520px;
          width: 100%;
          margin: 0 auto;
          box-sizing: border-box;
          position: relative;
        }
        .onboarding-eyebrow {
          font-size: 9px; font-weight: 700;
          letter-spacing: .25em;
          color: rgba(255,255,255,.2);
          text-transform: uppercase;
          margin-bottom: 16px;
          text-align: center;
        }
        .onboarding-title {
          font-family: 'Syne', sans-serif;
          font-size: clamp(28px, 5vw, 42px);
          font-weight: 900; color: #fff;
          letter-spacing: -1.5px;
          margin: 0 0 8px;
          text-align: center; line-height: 1.05;
        }
        .onboarding-sub {
          font-size: 14px; font-weight: 300;
          color: rgba(255,255,255,.4);
          text-align: center;
          margin: 0 0 36px;
          line-height: 1.6;
        }
        .onboarding-field { width: 100%; margin-bottom: 12px; }
        .onboarding-input {
          width: 100%; height: 48px;
          background: rgba(255,255,255,.05);
          border: .5px solid rgba(255,255,255,.1);
          border-radius: 10px;
          color: #fff; font-family: 'DM Sans', sans-serif;
          font-size: 14px; padding: 0 16px;
          outline: none; box-sizing: border-box;
          transition: border-color .2s, background .2s;
        }
        .onboarding-input:focus {
          border-color: ${G};
          background: rgba(2,209,186,.03);
        }
        .onboarding-sep {
          width: 100%;
          display: flex; align-items: center; gap: 14px;
          font-size: 10px; color: rgba(255,255,255,.25);
          letter-spacing: .2em; text-transform: uppercase;
          margin: 24px 0 12px;
        }
        .onboarding-sep::before, .onboarding-sep::after {
          content: ''; flex: 1; height: .5px;
          background: rgba(255,255,255,.08);
        }
        .onboarding-pills {
          display: flex; flex-wrap: wrap; gap: 8px;
          justify-content: center;
          margin: 4px 0 24px;
        }
        .onboarding-pill {
          padding: 8px 16px;
          border: .5px solid rgba(255,255,255,.12);
          border-radius: 100px;
          font-family: 'DM Sans', sans-serif;
          font-size: 12px; font-weight: 500;
          color: rgba(255,255,255,.5);
          cursor: pointer;
          transition: all .15s;
          background: none;
        }
        .onboarding-pill:hover {
          border-color: rgba(2,209,186,.4);
          color: rgba(255,255,255,.85);
        }
        .onboarding-pill.selected {
          border-color: ${G};
          color: ${G};
          background: rgba(2,209,186,.08);
        }
        .onboarding-btn {
          width: 100%; height: 52px;
          background: ${G}; color: #000;
          border: none; border-radius: 12px;
          font-family: 'Syne', sans-serif;
          font-size: 13px; font-weight: 700;
          letter-spacing: .1em;
          cursor: pointer;
          transition: opacity .2s, transform .15s;
          margin-top: 8px;
          box-shadow: 0 16px 40px rgba(2,209,186,.3);
        }
        .onboarding-btn:active { transform: scale(.98); }
        .onboarding-btn:disabled {
          opacity: .3; cursor: not-allowed;
          box-shadow: none;
        }
        .onboarding-skip {
          font-size: 12px;
          color: rgba(255,255,255,.3);
          background: none; border: none;
          cursor: pointer; margin-top: 16px;
          text-decoration: underline;
          text-underline-offset: 3px;
          transition: color .2s;
          font-family: inherit;
        }
        .onboarding-skip:hover { color: rgba(255,255,255,.7); }
        .onboarding-error {
          width: 100%;
          padding: 10px 14px;
          background: rgba(255,107,107,.06);
          border: .5px solid rgba(255,107,107,.2);
          border-radius: 8px;
          font-size: 12px; color: #ef4444;
          margin-bottom: 12px;
        }
        .onboarding-recap {
          width: 100%;
          margin: 24px 0 32px;
        }
        .onboarding-recap-item {
          display: flex; align-items: center;
          gap: 12px; padding: 12px 0;
          border-bottom: .5px solid rgba(255,255,255,.06);
          font-size: 13px; color: rgba(255,255,255,.65);
        }
        .onboarding-recap-item:last-child { border-bottom: none; }
        .onboarding-recap-icon {
          font-size: 14px; width: 20px;
          text-align: center; flex-shrink: 0;
        }
        .onboarding-recap-icon.done { color: ${G}; }
        .onboarding-recap-icon.skip { color: rgba(255,255,255,.25); }
        .onboarding-recap-icon.todo { color: rgba(255,255,255,.2); }
        /* Step slide transitions */
        .onb-step {
          width: 100%;
          animation: onbSlideIn .35s cubic-bezier(.22,1,.36,1) both;
        }
        @keyframes onbSlideIn {
          from { opacity: 0; transform: translateX(24px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        /* Intro etape 0 animations */
        @keyframes onbBoltPulse {
          0%   { transform: scale(0); opacity: 0; }
          50%  { transform: scale(1.1); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes onbFade {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .onb-intro-bolt {
          animation: onbBoltPulse .6s cubic-bezier(.22,1,.36,1) both;
        }
        .onb-intro-text {
          animation: onbFade .5s ease .4s both;
        }
        /* Checkmark SVG anime (step 3) */
        .onboarding-check { width: 64px; height: 64px; margin-bottom: 24px; }
        .onboarding-check circle {
          fill: none;
          stroke: rgba(2,209,186,.2);
          stroke-width: 2;
        }
        .onboarding-check path {
          fill: none;
          stroke: ${G};
          stroke-width: 2.5;
          stroke-linecap: round;
          stroke-linejoin: round;
          stroke-dasharray: 40;
          stroke-dashoffset: 40;
          animation: drawCheck .6s cubic-bezier(.22,1,.36,1) .2s forwards;
        }
        @keyframes drawCheck { to { stroke-dashoffset: 0; } }
        /* Confetti rain pour la step finale */
        @keyframes confettiFall {
          0%   { transform: translateY(-20vh) rotate(0deg);   opacity: 1; }
          100% { transform: translateY(120vh) rotate(720deg); opacity: 0; }
        }
      `}</style>

      {/* ===== HEADER ===== */}
      <div className="onb-header">
        <div className="onb-logo" aria-label="RB Perform">
          <svg viewBox="170 50 180 410" width="14" height="32" aria-hidden="true">
            <polygon points="300,60 180,280 248,280 210,450 340,220 268,220 300,60" fill={G} />
          </svg>
          <span>RB<span className="teal">PERFORM</span></span>
        </div>
      </div>

      {/* ===== PROGRESS BAR ===== */}
      <div className="onboarding-progress">
        <div className="onboarding-progress-bar" style={{ width: `${progressPct}%` }} />
      </div>

      {/* ===== CONTENT ===== */}
      <div className="onboarding-content">

        {/* ========== ETAPE 0 — INTRO ========== */}
        {step === 0 && (
          <div className="onb-step" style={{ textAlign: "center" }}>
            <div className="onb-intro-bolt" style={{ marginBottom: 28 }}>
              <svg viewBox="170 50 180 410" width="64" height="140" aria-hidden="true">
                <polygon points="300,60 180,280 248,280 210,450 340,220 268,220 300,60" fill={G} />
              </svg>
            </div>
            <div className="onb-intro-text onboarding-title" style={{
              fontSize: "clamp(32px, 6vw, 52px)",
              letterSpacing: "-2.5px",
            }}>
              {t("onb.intro_title_part1")}<br />{t("onb.intro_title_part2")}<span style={{ color: G }}>.</span>
            </div>
          </div>
        )}

        {/* ========== ETAPE 1 — IDENTITE ========== */}
        {step === 1 && (
          <div className="onb-step">
            <div className="onboarding-eyebrow">{t("onb.step1_eyebrow")}</div>
            <h1 className="onboarding-title">{t("onb.step1_title")}</h1>
            <p className="onboarding-sub">
              {t("onb.step1_sub")}
            </p>

            <div style={{ display: "flex", gap: 10, width: "100%" }}>
              <div className="onboarding-field" style={{ flex: 1, marginBottom: 0 }}>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder={t("onb.placeholder_first")}
                  className="onboarding-input"
                  autoFocus
                />
              </div>
              <div className="onboarding-field" style={{ flex: 1, marginBottom: 0 }}>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder={t("onb.placeholder_last")}
                  className="onboarding-input"
                />
              </div>
            </div>

            <div className="onboarding-sep">{t("onb.specialty_separator")}</div>

            <div className="onboarding-pills">
              {SPECIALITIES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => toggleSpecialty(s)}
                  className={`onboarding-pill ${specialties.includes(s) ? "selected" : ""}`}
                >
                  {s}
                </button>
              ))}
            </div>

            {error && <div className="onboarding-error">{error}</div>}

            <button
              onClick={saveIdentity}
              disabled={saving || specialties.length === 0 || !firstName.trim()}
              className="onboarding-btn"
              style={{ textTransform: "uppercase" }}
            >
              {saving ? "..." : t("onb.btn_continue")}
            </button>
          </div>
        )}

        {/* ========== ETAPE 2 — BRAND ========== */}
        {step === 2 && (
          <div className="onb-step">
            <div className="onboarding-eyebrow">Étape 2 sur {TOTAL_STEPS} · Identité visuelle</div>
            <h1 className="onboarding-title">Ton studio.</h1>
            <p className="onboarding-sub">
              Voici comment tes clients verront ton app. Tu peux changer plus tard.
            </p>

            {/* PREVIEW LIVE — c'est le moment dopamine : voir son brand prendre vie */}
            <div style={{
              width: "100%",
              padding: "20px 18px",
              background: `linear-gradient(180deg, ${accentColor}10 0%, rgba(255,255,255,0.02) 100%)`,
              border: `1px solid ${accentColor}40`,
              borderRadius: 16,
              marginBottom: 24,
              display: "flex", alignItems: "center", gap: 14,
              transition: "border-color .3s, background .3s",
            }}>
              {logoPreview ? (
                <img src={logoPreview} alt="logo" style={{
                  width: 48, height: 48, borderRadius: 12, objectFit: "cover",
                  border: `1px solid ${accentColor}40`, flexShrink: 0,
                }} />
              ) : (
                <div style={{
                  width: 48, height: 48, borderRadius: 12,
                  background: `${accentColor}15`,
                  border: `1px solid ${accentColor}40`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 22, fontWeight: 900, color: accentColor,
                  fontFamily: "'Syne',sans-serif", flexShrink: 0,
                }}>
                  {(brandName || firstName || "C").trim().charAt(0).toUpperCase()}
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 9, letterSpacing: 2, textTransform: "uppercase", color: "rgba(255,255,255,0.4)", fontWeight: 700, marginBottom: 4 }}>
                  Coaching by
                </div>
                <div style={{ fontSize: 18, fontWeight: 800, color: accentColor, letterSpacing: -0.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {brandName || firstName || "Ton studio"}
                </div>
              </div>
            </div>

            <div className="onboarding-field">
              <input
                type="text"
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                placeholder={`Nom de marque (ex: ${firstName || "Coach"} Performance)`}
                className="onboarding-input"
                maxLength={50}
              />
            </div>

            <div className="onboarding-sep">Couleur d'accent</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 8, width: "100%", marginBottom: 20 }}>
              {ACCENT_COLORS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => { haptic.selection(); setAccentColor(c.hex); }}
                  aria-label={c.label}
                  title={c.label}
                  style={{
                    height: 36, borderRadius: 10,
                    background: c.hex,
                    border: accentColor === c.hex ? "2px solid #fff" : "2px solid rgba(255,255,255,0.08)",
                    boxShadow: accentColor === c.hex ? `0 0 0 3px ${c.hex}40, 0 6px 20px ${c.hex}40` : "none",
                    cursor: "pointer",
                    transition: "transform .15s, box-shadow .2s, border-color .2s",
                    transform: accentColor === c.hex ? "scale(1.08)" : "scale(1)",
                  }}
                />
              ))}
            </div>

            <div className="onboarding-sep">Logo (optionnel)</div>
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              onChange={pickLogo}
              style={{ display: "none" }}
            />
            <button
              type="button"
              onClick={() => { haptic.light(); fileInputRef.current?.click(); }}
              style={{
                width: "100%", padding: "14px 16px",
                background: "rgba(255,255,255,0.04)",
                border: "1px dashed rgba(255,255,255,0.15)",
                borderRadius: 10,
                color: "rgba(255,255,255,0.7)",
                fontSize: 13, fontWeight: 600,
                cursor: "pointer", fontFamily: "inherit",
                marginBottom: 20,
              }}
            >
              {logoFile ? `✓ ${logoFile.name}` : "Choisir un logo (PNG / JPG, max 500 Ko)"}
            </button>

            {error && <div className="onboarding-error">{error}</div>}

            <button
              onClick={saveBrand}
              disabled={brandSaving}
              className="onboarding-btn"
              style={{ background: accentColor, boxShadow: `0 16px 40px ${accentColor}40`, textTransform: "uppercase" }}
            >
              {brandSaving ? "..." : "Continuer"}
            </button>
            <button onClick={skipBrand} className="onboarding-skip">Configurer plus tard</button>
          </div>
        )}

        {/* ========== ETAPE 3 — PUSH NOTIFS ========== */}
        {step === 3 && (
          <div className="onb-step" style={{ textAlign: "center" }}>
            <div className="onboarding-eyebrow">Étape 3 sur {TOTAL_STEPS} · Notifications</div>
            <h1 className="onboarding-title">Sois alerté en direct.</h1>
            <p className="onboarding-sub">
              Quand un client bat un record, abandonne, ou termine un programme — ton téléphone vibre. Tu réagis avant qu'il décroche.
            </p>

            {/* Visual : pile de notif teaser */}
            <div style={{
              width: "100%", maxWidth: 360,
              margin: "0 auto 24px",
              display: "flex", flexDirection: "column", gap: 10,
            }}>
              {[
                {
                  // Trophy SVG line icon
                  icon: <path d="M6 4h12v3a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V4Zm0 0H3v2a3 3 0 0 0 3 3m12-5h3v2a3 3 0 0 1-3 3M9 17h6m-3-6v6m-2 4h4" />,
                  title: "Marc a battu un record", body: "Squat : 100kg → 105kg (+5kg)", color: accentColor,
                },
                {
                  // Activity / pulse line icon
                  icon: <path d="M22 12h-4l-3 9L9 3l-3 9H2" />,
                  title: "Sarah a fini sa séance", body: "Jambes · 47 min · RPE 8", color: "rgba(255,255,255,0.7)",
                },
                {
                  // Warning triangle line icon
                  icon: <><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" /><path d="M12 9v4" /><path d="M12 17h.01" /></>,
                  title: "Thomas n'a pas log depuis 3j", body: "Relance recommandée", color: "rgba(255,170,0,0.85)",
                },
              ].map((n, i) => (
                <div key={i} style={{
                  display: "flex", gap: 12, alignItems: "center",
                  padding: "12px 14px",
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: 12,
                  textAlign: "left",
                  animation: `onbFade .5s ease ${0.2 + i * 0.15}s both`,
                }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: `${n.color === accentColor ? accentColor : n.color === "rgba(255,170,0,0.85)" ? "rgba(255,170,0,1)" : "rgba(255,255,255,0.7)"}10`,
                    border: `1px solid ${n.color}30`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0,
                  }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={n.color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      {n.icon}
                    </svg>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: n.color, marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{n.title}</div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", lineHeight: 1.4 }}>{n.body}</div>
                  </div>
                </div>
              ))}
            </div>

            {pushPerm === "granted" && pushAttempted ? (
              <div style={{
                width: "100%", padding: "14px 18px",
                background: `${accentColor}15`,
                border: `1px solid ${accentColor}40`,
                borderRadius: 10,
                color: accentColor,
                fontSize: 13, fontWeight: 700,
                marginBottom: 16,
              }}>
                ✓ Notifications activées
              </div>
            ) : pushPerm === "denied" && pushAttempted ? (
              <div style={{
                width: "100%", padding: "14px 18px",
                background: "rgba(255,170,0,0.08)",
                border: "1px solid rgba(255,170,0,0.25)",
                borderRadius: 10,
                color: "rgba(255,200,100,0.9)",
                fontSize: 12, fontWeight: 600,
                marginBottom: 16,
                lineHeight: 1.5,
              }}>
                Permission refusée. Tu peux la réactiver dans les réglages du navigateur quand tu veux.
              </div>
            ) : null}

            <button
              onClick={activatePush}
              disabled={pushPerm === "granted" && pushAttempted}
              className="onboarding-btn"
              style={{ background: accentColor, boxShadow: `0 16px 40px ${accentColor}40`, textTransform: "uppercase" }}
            >
              {pushPerm === "granted" && pushAttempted ? "Continuer" : "Activer les notifications"}
            </button>
            <button onClick={skipPush} className="onboarding-skip">Plus tard</button>
          </div>
        )}

        {/* ========== ETAPE 4 — TEMPLATE PROGRAMME ========== */}
        {step === 4 && (
          <div className="onb-step">
            <div className="onboarding-eyebrow">Étape 4 sur {TOTAL_STEPS} · Bibliothèque</div>
            <h1 className="onboarding-title">Ton premier programme.</h1>
            <p className="onboarding-sub">
              Pars d'un template prêt à l'emploi ou crée le tien from scratch. Tu peux tout modifier après.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%", marginBottom: 20 }}>
              {PROGRAMME_TEMPLATES.map((tpl) => {
                const selected = selectedTemplate === tpl.id;
                return (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => pickTemplate(tpl.id)}
                    style={{
                      display: "flex", alignItems: "center", gap: 14,
                      padding: "14px 16px",
                      background: selected ? `${accentColor}10` : "rgba(255,255,255,0.03)",
                      border: `1px solid ${selected ? accentColor + "60" : "rgba(255,255,255,0.06)"}`,
                      borderRadius: 12,
                      cursor: "pointer", fontFamily: "inherit",
                      textAlign: "left",
                      transition: "all .15s",
                    }}
                  >
                    <div style={{
                      width: 44, height: 44, borderRadius: 11,
                      background: selected ? `${accentColor}25` : "rgba(255,255,255,0.05)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 13, fontWeight: 800, letterSpacing: 0.5,
                      color: selected ? accentColor : "rgba(255,255,255,0.55)",
                      fontFamily: "'JetBrains Mono', 'SF Mono', monospace",
                      flexShrink: 0,
                      transition: "background .2s, color .2s",
                    }}>{tpl.code}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: selected ? accentColor : "#fff", marginBottom: 2 }}>{tpl.label}</div>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)" }}>{tpl.desc}</div>
                    </div>
                    {selected && (
                      <div style={{ color: accentColor, fontSize: 18, flexShrink: 0 }}>✓</div>
                    )}
                  </button>
                );
              })}
            </div>

            {error && <div className="onboarding-error">{error}</div>}

            <button
              onClick={saveTemplate}
              className="onboarding-btn"
              style={{ background: accentColor, boxShadow: `0 16px 40px ${accentColor}40`, textTransform: "uppercase" }}
            >
              {selectedTemplate ? "Utiliser ce template" : "Continuer sans template"}
            </button>
            <button onClick={skipTemplate} className="onboarding-skip">Je le ferai plus tard</button>
          </div>
        )}

        {/* ========== ETAPE 5 — PREMIER CLIENT ========== */}
        {step === 5 && (
          <div className="onb-step">
            <div className="onboarding-eyebrow">{t("onb.step2_eyebrow")}</div>
            <h1 className="onboarding-title">{t("onb.step2_title")}</h1>
            <p className="onboarding-sub">
              {t("onb.step2_sub_p1")}<br />{t("onb.step2_sub_p2")}
            </p>

            <div className="onboarding-field">
              <input
                type="email"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                placeholder={t("onb.placeholder_client_email")}
                className="onboarding-input"
                autoFocus
                autoCapitalize="none"
                autoComplete="email"
              />
            </div>

            <div className="onboarding-field">
              <input
                type="text"
                value={clientPrenom}
                onChange={(e) => setClientPrenom(e.target.value)}
                placeholder={t("onb.placeholder_client_first")}
                className="onboarding-input"
              />
            </div>

            {error && <div className="onboarding-error">{error}</div>}

            <button
              onClick={sendInvite}
              disabled={inviteLoading || !clientEmail.trim()}
              className="onboarding-btn"
              style={{ textTransform: "uppercase" }}
            >
              {inviteLoading ? t("onb.btn_invite_sending") : inviteSent ? t("onb.btn_invite_sent") : t("onb.btn_invite_send")}
            </button>

            <button onClick={skipInvite} className="onboarding-skip">
              {t("onb.btn_skip")}
            </button>
          </div>
        )}

        {/* ========== ETAPE 6 — PRET ========== */}
        {step === 6 && (
          <div className="onb-step" style={{ textAlign: "center", width: "100%", position: "relative" }}>
            {/* Confetti rain — DOM only, pure CSS animation */}
            <div aria-hidden="true" style={{ position: "absolute", inset: -24, pointerEvents: "none", overflow: "hidden", zIndex: 0 }}>
              {Array.from({ length: 24 }).map((_, i) => {
                const colors = [accentColor, "#fbbf24", "#f472b6", "#a78bfa", "#34d399"];
                const c = colors[i % colors.length];
                const left = (i * 4.2) % 100;
                const delay = (i % 8) * 0.15;
                const dur = 2 + (i % 5) * 0.25;
                return (
                  <span key={i} style={{
                    position: "absolute",
                    top: -20,
                    left: `${left}%`,
                    width: 8, height: 12,
                    background: c,
                    borderRadius: 2,
                    opacity: 0.85,
                    animation: `confettiFall ${dur}s linear ${delay}s infinite`,
                    transform: `rotate(${(i * 23) % 360}deg)`,
                  }} />
                );
              })}
            </div>
            {/* Checkmark anime */}
            <svg className="onboarding-check" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <circle cx="32" cy="32" r="30" />
              <path d="M18 33 L28 43 L46 24" />
            </svg>

            <div className="onboarding-eyebrow">{t("onb.step3_eyebrow")}</div>
            <h1 className="onboarding-title">{t("onb.step3_title")}</h1>

            <div className="onboarding-recap" style={{ position: "relative", zIndex: 1 }}>
              <div className="onboarding-recap-item">
                <span className="onboarding-recap-icon done" style={{ color: accentColor }}>✓</span>
                <span>{t("onb.recap_profile")}</span>
              </div>
              <div className="onboarding-recap-item">
                <span className="onboarding-recap-icon done" style={{ color: accentColor }}>✓</span>
                <span>Studio "<strong style={{ color: accentColor }}>{brandName || firstName || "Coach"}</strong>" configuré</span>
              </div>
              <div className="onboarding-recap-item">
                {pushPerm === "granted" ? (
                  <>
                    <span className="onboarding-recap-icon done" style={{ color: accentColor }}>✓</span>
                    <span>Notifications activées</span>
                  </>
                ) : (
                  <>
                    <span className="onboarding-recap-icon skip">—</span>
                    <span>Notifications à activer plus tard</span>
                  </>
                )}
              </div>
              <div className="onboarding-recap-item">
                {selectedTemplate ? (
                  <>
                    <span className="onboarding-recap-icon done" style={{ color: accentColor }}>✓</span>
                    <span>Template <strong style={{ color: accentColor }}>{(PROGRAMME_TEMPLATES.find(p => p.id === selectedTemplate) || {}).label}</strong> sélectionné</span>
                  </>
                ) : (
                  <>
                    <span className="onboarding-recap-icon skip">—</span>
                    <span>Programme à créer plus tard</span>
                  </>
                )}
              </div>
              <div className="onboarding-recap-item">
                {inviteSent ? (
                  <>
                    <span className="onboarding-recap-icon done" style={{ color: accentColor }}>✓</span>
                    <span>{t("onb.recap_invite_sent")} <strong style={{ color: accentColor }}>{clientEmail}</strong></span>
                  </>
                ) : (
                  <>
                    <span className="onboarding-recap-icon skip">—</span>
                    <span>{t("onb.recap_invite_skipped")}</span>
                  </>
                )}
              </div>
            </div>

            <p className="onboarding-sub" style={{ marginBottom: 28 }}>
              {t("onb.step3_sub")}
            </p>

            {error && <div className="onboarding-error">{error}</div>}

            <button
              onClick={finishOnboarding}
              disabled={saving}
              className="onboarding-btn"
              style={{ textTransform: "uppercase" }}
            >
              {saving ? "..." : t("onb.btn_access_dashboard")}
            </button>
          </div>
        )}

      </div>
    </div>
  );
}

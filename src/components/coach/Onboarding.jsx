import React, { useState, useEffect, useRef } from "react";
import { supabase } from "../../lib/supabase";
import { toast } from "../Toast";
import haptic from "../../lib/haptic";

const G = "#02d1ba";

// 10 specialites (selon brief)
const SPECIALITIES = [
  "Musculation", "Cardio", "CrossFit",
  "Seche", "Force", "Performance",
  "Remise en forme", "Running",
  "Arts martiaux", "Nutrition",
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

  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);

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
    if (!firstName.trim()) { setError("Prenom requis."); return; }
    if (specialties.length === 0) { setError("Choisis au moins une specialite."); return; }
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
      setDirection("forward");
      setStep(2);
    } catch (e) {
      setError(e.message || "Erreur lors de l'enregistrement.");
    }
    setSaving(false);
  }

  async function sendInvite() {
    const mail = clientEmail.trim().toLowerCase();
    setError("");
    if (!/^[^@]+@[^@]+\.[^@]+$/.test(mail)) {
      setError("Email invalide."); return;
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

      toast.success(`Invitation envoyee a ${mail}`);
      setInviteSent(true);
      setDirection("forward");
      setTimeout(() => setStep(3), 400); // transition naturelle apres succes
    } catch (e) {
      setError(e.message || "Erreur d'envoi.");
    }
    setInviteLoading(false);
  }

  function skipInvite() {
    haptic.light();
    setInviteSkipped(true);
    setDirection("forward");
    setStep(3);
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
      setError(e.message || "Erreur lors de la sauvegarde.");
      setSaving(false);
    }
  }

  // Progression bar % (1/3 pour etape 1, 2/3 etape 2, 100% etape 3)
  const progressPct = step === 0 ? 0 : step === 1 ? 33 : step === 2 ? 66 : 100;

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
          background: rgba(239,68,68,.06);
          border: .5px solid rgba(239,68,68,.2);
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
              Bienvenue sur<br />RB Perform<span style={{ color: G }}>.</span>
            </div>
          </div>
        )}

        {/* ========== ETAPE 1 — IDENTITE ========== */}
        {step === 1 && (
          <div className="onb-step">
            <div className="onboarding-eyebrow">01 / 03</div>
            <h1 className="onboarding-title">Comment tu t'appelles ?</h1>
            <p className="onboarding-sub">
              Ce nom apparaitra sur ton dashboard et chez tes clients.
            </p>

            <div style={{ display: "flex", gap: 10, width: "100%" }}>
              <div className="onboarding-field" style={{ flex: 1, marginBottom: 0 }}>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Prenom"
                  className="onboarding-input"
                  autoFocus
                />
              </div>
              <div className="onboarding-field" style={{ flex: 1, marginBottom: 0 }}>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Nom"
                  className="onboarding-input"
                />
              </div>
            </div>

            <div className="onboarding-sep">Et ta specialite ?</div>

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
              {saving ? "..." : "Continuer →"}
            </button>
          </div>
        )}

        {/* ========== ETAPE 2 — PREMIER CLIENT ========== */}
        {step === 2 && (
          <div className="onb-step">
            <div className="onboarding-eyebrow">02 / 03</div>
            <h1 className="onboarding-title">Invite ton premier athlete.</h1>
            <p className="onboarding-sub">
              Il recevra un email avec son acces a ton espace.<br />Gratuit pour lui.
            </p>

            <div className="onboarding-field">
              <input
                type="email"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                placeholder="Email du client *"
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
                placeholder="Pour personnaliser son acces"
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
              {inviteLoading ? "Envoi en cours..." : inviteSent ? "✓ Invitation envoyee" : "Envoyer l'invitation"}
            </button>

            <button onClick={skipInvite} className="onboarding-skip">
              Passer cette etape →
            </button>
          </div>
        )}

        {/* ========== ETAPE 3 — PRET ========== */}
        {step === 3 && (
          <div className="onb-step" style={{ textAlign: "center", width: "100%" }}>
            {/* Checkmark anime */}
            <svg className="onboarding-check" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <circle cx="32" cy="32" r="30" />
              <path d="M18 33 L28 43 L46 24" />
            </svg>

            <div className="onboarding-eyebrow">03 / 03</div>
            <h1 className="onboarding-title">Ton systeme est en place.</h1>

            <div className="onboarding-recap">
              <div className="onboarding-recap-item">
                <span className="onboarding-recap-icon done">✓</span>
                <span>Profil cree</span>
              </div>
              <div className="onboarding-recap-item">
                {inviteSent ? (
                  <>
                    <span className="onboarding-recap-icon done">✓</span>
                    <span>Invitation envoyee a <strong style={{ color: G }}>{clientEmail}</strong></span>
                  </>
                ) : (
                  <>
                    <span className="onboarding-recap-icon skip">⏭</span>
                    <span>Invitation ignoree pour le moment</span>
                  </>
                )}
              </div>
              <div className="onboarding-recap-item">
                <span className="onboarding-recap-icon todo">○</span>
                <span>Dashboard pret</span>
              </div>
            </div>

            <p className="onboarding-sub" style={{ marginBottom: 28 }}>
              Des que ton client accepte, il apparait ici automatiquement.
            </p>

            {error && <div className="onboarding-error">{error}</div>}

            <button
              onClick={finishOnboarding}
              disabled={saving}
              className="onboarding-btn"
              style={{ textTransform: "uppercase" }}
            >
              {saving ? "..." : "Acceder a mon dashboard →"}
            </button>
          </div>
        )}

      </div>
    </div>
  );
}

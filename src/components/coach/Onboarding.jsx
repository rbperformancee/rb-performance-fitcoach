import React, { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { toast } from "../Toast";
import AppIcon from "../AppIcon";
import haptic from "../../lib/haptic";

const G = "#02d1ba";

const SPECIALITIES = [
  "Musculation", "Cardio", "CrossFit",
  "Seche", "Performance", "Remise en forme",
];

/**
 * Onboarding — modal plein ecran 3 etapes pour nouveau coach.
 * Declenche si coach.onboarding_done !== true.
 *
 * Etape 0 : animation bienvenue 2s auto
 * Etape 1 : prenom + nom + specialite (pills, 1 obligatoire)
 * Etape 2 : invitation premier client (email + prenom, skippable)
 * Etape 3 : recap + CTA "Acceder au dashboard"
 *
 * Props:
 *   coach: {id, full_name, email, specialties?}
 *   onComplete: () => void   // appelee apres PATCH onboarding_done=true
 */
export default function Onboarding({ coach, onComplete }) {
  const [step, setStep] = useState(0);
  const [firstName, setFirstName] = useState(coach?.full_name?.split(" ")[0] || "");
  const [lastName, setLastName]   = useState(coach?.full_name?.split(" ").slice(1).join(" ") || "");
  const [specialty, setSpecialty] = useState((coach?.specialties || [])[0] || "");
  const [clientEmail, setClientEmail] = useState("");
  const [clientFirstName, setClientFirstName] = useState("");
  const [saving, setSaving] = useState(false);
  const [inviteSent, setInviteSent] = useState(false);

  // Auto-advance from step 0 → 1 after 2s
  useEffect(() => {
    if (step === 0) {
      const id = setTimeout(() => { haptic.light(); setStep(1); }, 2000);
      return () => clearTimeout(id);
    }
  }, [step]);

  async function saveIdentity() {
    if (!firstName.trim()) { toast.error("Prenom requis"); return; }
    if (!specialty) { toast.error("Choisis une specialite"); return; }
    haptic.selection();
    setSaving(true);
    try {
      const full_name = `${firstName.trim()} ${lastName.trim()}`.trim();
      const { error } = await supabase
        .from("coaches")
        .update({ full_name, specialties: [specialty] })
        .eq("id", coach.id);
      if (error) throw error;
      setStep(2);
    } catch (e) {
      toast.error("Erreur: " + e.message);
    }
    setSaving(false);
  }

  async function sendInvite() {
    if (!clientEmail.trim()) { toast.error("Email requis"); return; }
    if (!/^[^@]+@[^@]+\.[^@]+$/.test(clientEmail.trim())) { toast.error("Email invalide"); return; }
    haptic.selection();
    setSaving(true);
    try {
      // Cree une entree client avec l'email en invitation
      const { error } = await supabase.from("clients").insert({
        coach_id: coach.id,
        email: clientEmail.trim().toLowerCase(),
        full_name: clientFirstName.trim() || null,
        status: "invited",
      });
      if (error) throw error;

      // Envoie l'email via edge function send-welcome (best-effort)
      try {
        await fetch(`${process.env.REACT_APP_SUPABASE_URL}/functions/v1/send-welcome`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.REACT_APP_SUPABASE_ANON_KEY}` },
          body: JSON.stringify({ email: clientEmail.trim(), full_name: clientFirstName.trim() || null, type: "client_invitation", coach_name: firstName }),
        });
      } catch {}
      setInviteSent(true);
      setStep(3);
    } catch (e) {
      toast.error("Erreur: " + e.message);
    }
    setSaving(false);
  }

  function skipInvite() {
    haptic.light();
    setStep(3);
  }

  async function finishOnboarding() {
    haptic.success();
    setSaving(true);
    try {
      const { error } = await supabase
        .from("coaches")
        .update({ onboarding_done: true, onboarding_completed_at: new Date().toISOString() })
        .eq("id", coach.id);
      if (error) throw error;
      if (onComplete) onComplete();
    } catch (e) {
      toast.error("Erreur: " + e.message);
      setSaving(false);
    }
  }

  return (
    <div style={wrap}>
      <style>{`
        @keyframes obFade { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes obPulse { 0%,100% { opacity: 1; transform: scale(1); } 50% { opacity: .5; transform: scale(.8); } }
        @keyframes obBoltGrow {
          0% { transform: scale(.2); opacity: 0; }
          60% { transform: scale(1.1); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes obCheckmark {
          0% { stroke-dashoffset: 100; }
          100% { stroke-dashoffset: 0; }
        }
        .ob-input:focus { border-color: ${G} !important; background: rgba(2,209,186,.04) !important; outline: none; }
      `}</style>

      {/* Progress indicator (caché en étape 0) */}
      {step > 0 && (
        <div style={progressWrap}>
          {[1, 2, 3].map((n) => (
            <div key={n} style={{ ...dot, ...(n <= step ? dotActive : {}) }} />
          ))}
        </div>
      )}

      <div style={{ position: "relative", width: "100%", maxWidth: 520, padding: "0 24px" }}>

        {/* ===== ETAPE 0 — BIENVENUE ===== */}
        {step === 0 && (
          <div style={{ textAlign: "center", animation: "obFade .4s ease both" }}>
            <div style={{ animation: "obBoltGrow .8s cubic-bezier(.22,1,.36,1) both" }}>
              <svg width="64" height="140" viewBox="170 50 180 410" style={{ display: "inline-block" }}>
                <polygon points="300,60 180,280 248,280 210,450 340,220 268,220 300,60" fill={G} />
              </svg>
            </div>
            <div style={{
              fontFamily: "'Syne', sans-serif",
              fontSize: "clamp(36px, 6vw, 64px)",
              fontWeight: 900,
              letterSpacing: "-2.5px",
              lineHeight: 1,
              color: "#fff",
              marginTop: 24,
              animation: "obFade .5s ease .3s both",
            }}>
              Bienvenue sur<br />RB Perform<span style={{ color: G }}>.</span>
            </div>
          </div>
        )}

        {/* ===== ETAPE 1 — IDENTITE ===== */}
        {step === 1 && (
          <div style={{ animation: "obFade .4s ease both" }}>
            <div style={stepLabel}>Etape 1 / 3</div>
            <h1 style={stepTitle}>Comment tu t'appelles ?</h1>

            <div style={{ display: "flex", gap: 10, marginTop: 28 }}>
              <input
                type="text"
                placeholder="Prenom"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="ob-input"
                style={{ ...input, flex: 1 }}
                autoFocus
              />
              <input
                type="text"
                placeholder="Nom"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="ob-input"
                style={{ ...input, flex: 1 }}
              />
            </div>

            <div style={{ ...stepTitle, fontSize: 22, marginTop: 36 }}>
              Quelle est ta specialite principale ?
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 16 }}>
              {SPECIALITIES.map((s) => (
                <button
                  key={s}
                  onClick={() => { haptic.selection(); setSpecialty(s); }}
                  style={{
                    ...pill,
                    ...(specialty === s ? pillOn : {}),
                  }}
                >
                  {s}
                </button>
              ))}
            </div>

            <button onClick={saveIdentity} disabled={saving} style={{ ...btnPrimary, marginTop: 36, opacity: saving ? .6 : 1 }}>
              {saving ? "..." : "Continuer →"}
            </button>
          </div>
        )}

        {/* ===== ETAPE 2 — PREMIER CLIENT ===== */}
        {step === 2 && (
          <div style={{ animation: "obFade .4s ease both" }}>
            <div style={stepLabel}>Etape 2 / 3</div>
            <h1 style={stepTitle}>Invite ton premier athlete.</h1>
            <p style={stepSub}>Il recevra un email avec son acces a ton espace.</p>

            <input
              type="email"
              placeholder="Email de ton client"
              value={clientEmail}
              onChange={(e) => setClientEmail(e.target.value)}
              className="ob-input"
              style={{ ...input, marginTop: 28 }}
              autoFocus
              autoCapitalize="none"
            />
            <input
              type="text"
              placeholder="Prenom (optionnel)"
              value={clientFirstName}
              onChange={(e) => setClientFirstName(e.target.value)}
              className="ob-input"
              style={{ ...input, marginTop: 10 }}
            />

            <button onClick={sendInvite} disabled={saving} style={{ ...btnPrimary, marginTop: 28, opacity: saving ? .6 : 1 }}>
              {saving ? "..." : "Envoyer l'invitation"}
            </button>

            <button onClick={skipInvite} style={skipBtn}>
              Passer cette etape →
            </button>
          </div>
        )}

        {/* ===== ETAPE 3 — RECAP ===== */}
        {step === 3 && (
          <div style={{ animation: "obFade .4s ease both", textAlign: "center" }}>
            <div style={{ marginBottom: 24 }}>
              <svg width="68" height="68" viewBox="0 0 68 68" style={{ display: "inline-block" }}>
                <circle cx="34" cy="34" r="30" fill="none" stroke={G} strokeWidth="2" opacity=".4" />
                <path d="M20 35 L30 45 L48 26" fill="none" stroke={G} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
                  strokeDasharray="100"
                  style={{ animation: "obCheckmark .6s cubic-bezier(.22,1,.36,1) both" }}
                />
              </svg>
            </div>

            <h1 style={{ ...stepTitle, textAlign: "center", fontSize: "clamp(32px, 5vw, 48px)" }}>
              Ton systeme est en place.
            </h1>

            <div style={{ marginTop: 28, padding: 20, background: "rgba(2,209,186,.04)", border: `.5px solid rgba(2,209,186,.18)`, borderRadius: 14, textAlign: "left" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "rgba(255,255,255,.75)", marginBottom: 10 }}>
                <AppIcon name="check-circle" size={16} color={G} />
                <span>Profil cree</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "rgba(255,255,255,.75)" }}>
                <AppIcon name="check-circle" size={16} color={inviteSent ? G : "rgba(255,255,255,.3)"} />
                <span>{inviteSent ? `Invitation envoyee a ${clientEmail}` : "Invitation ignoree pour le moment"}</span>
              </div>
            </div>

            <button onClick={finishOnboarding} disabled={saving} style={{ ...btnPrimary, marginTop: 32, opacity: saving ? .6 : 1 }}>
              {saving ? "..." : "Acceder a mon dashboard →"}
            </button>
          </div>
        )}

      </div>
    </div>
  );
}

// ===== STYLES =====
const wrap = {
  position: "fixed", inset: 0, zIndex: 500,
  background: "#000",
  display: "flex", alignItems: "center", justifyContent: "center",
  fontFamily: "'DM Sans', -apple-system, sans-serif",
  color: "#fff",
  overflow: "hidden",
};

const progressWrap = {
  position: "absolute", top: "calc(env(safe-area-inset-top, 0px) + 32px)", left: 0, right: 0,
  display: "flex", justifyContent: "center", gap: 8,
};
const dot = {
  width: 8, height: 8, borderRadius: "50%",
  background: "rgba(255,255,255,.12)",
  transition: "background .3s",
};
const dotActive = { background: G, boxShadow: `0 0 8px ${G}` };

const stepLabel = {
  fontSize: 10, fontWeight: 600, letterSpacing: "3px",
  textTransform: "uppercase", color: G, opacity: .7,
  marginBottom: 14,
};
const stepTitle = {
  fontFamily: "'Syne', sans-serif",
  fontSize: "clamp(28px, 4.5vw, 44px)",
  fontWeight: 900, color: "#fff",
  letterSpacing: "-1.5px", lineHeight: 1,
  margin: 0,
};
const stepSub = {
  fontSize: 14, color: "rgba(255,255,255,.4)",
  lineHeight: 1.6, marginTop: 12, fontWeight: 300,
};
const input = {
  width: "100%", padding: "14px 16px",
  background: "rgba(255,255,255,.03)",
  border: ".5px solid rgba(255,255,255,.1)",
  borderRadius: 10,
  color: "#fff", fontSize: 15,
  fontFamily: "inherit", outline: "none",
  boxSizing: "border-box",
  transition: "all .2s",
};
const pill = {
  padding: "9px 16px",
  background: "rgba(255,255,255,.03)",
  border: ".5px solid rgba(255,255,255,.1)",
  borderRadius: 100,
  color: "rgba(255,255,255,.55)",
  fontSize: 12, fontWeight: 600, letterSpacing: ".03em",
  cursor: "pointer", fontFamily: "inherit",
  transition: "all .15s",
};
const pillOn = {
  background: "rgba(2,209,186,.1)",
  border: `1px solid ${G}`,
  color: G,
};
const btnPrimary = {
  width: "100%",
  padding: "16px 24px",
  background: G,
  color: "#000",
  border: "none",
  borderRadius: 12,
  fontFamily: "'Syne', sans-serif",
  fontSize: 13,
  fontWeight: 900,
  letterSpacing: ".1em",
  textTransform: "uppercase",
  cursor: "pointer",
  boxShadow: "0 16px 40px rgba(2,209,186,.35)",
  transition: "opacity .2s, transform .15s",
};
const skipBtn = {
  display: "block",
  margin: "16px auto 0",
  background: "transparent",
  border: "none",
  color: "rgba(255,255,255,.35)",
  fontSize: 12,
  fontFamily: "inherit",
  cursor: "pointer",
  padding: 8,
  letterSpacing: ".02em",
};

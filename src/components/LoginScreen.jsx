import React, { useState } from "react";
import { LOGO_B64 } from "../utils/logo";

import { PrivacyPolicy } from "./PrivacyPolicy";

export function LoginScreen({ onSendMagicLink, loading, error, magicSent }) {
  const [email, setEmail] = useState("");
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && accepted;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (valid && !loading && accepted) onSendMagicLink(email);
  };

  return (
    <>
      {showPrivacy && <PrivacyPolicy onClose={() => setShowPrivacy(false)} />}
      <div style={{
      minHeight: "100vh",
      background: "#0d0d0d",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "32px 24px",
      fontFamily: "'Inter', sans-serif",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');
        @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
        @keyframes spin { to { transform: rotate(360deg); } }
        .login-input:focus { border-color: #02d1ba !important; background: rgba(2,209,186,0.04) !important; }
        .login-btn:hover:not(:disabled) { opacity: 0.88; transform: translateY(-1px); box-shadow: 0 8px 28px rgba(2,209,186,0.4) !important; }
      `}</style>

      <>
      {showPrivacy && <PrivacyPolicy onClose={() => setShowPrivacy(false)} />}
      <div style={{
        width: "100%", maxWidth: 380,
        animation: "fadeUp 0.4s ease",
        display: "flex", flexDirection: "column", alignItems: "center", gap: 0,
      }}>
        {/* Logo */}
        <>
      {showPrivacy && <PrivacyPolicy onClose={() => setShowPrivacy(false)} />}
      <div style={{
          width: 52, height: 52,
          background: "#141414",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 14,
          overflow: "hidden",
          marginBottom: 20,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <img src={LOGO_B64} alt="RB Performance" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
        </div>

        {/* Titre */}
        <h1 style={{
          fontSize: 22, fontWeight: 800, color: "#f5f5f5",
          letterSpacing: "-0.5px", marginBottom: 4, textAlign: "center",
        }}>
          RB <span style={{ color: "#02d1ba" }}>Performance</span>
        </h1>
        <p style={{
          fontSize: 13, color: "#6b7280", marginBottom: 36, textAlign: "center", lineHeight: 1.6,
        }}>
          Connecte-toi pour accéder<br/>à ton programme personnalisé
        </p>

        {!magicSent ? (
          /* ── Formulaire ── */
          <form onSubmit={handleSubmit} style={{ width: "100%", display: "flex", flexDirection: "column", gap: 12 }}>
            <>
      {showPrivacy && <PrivacyPolicy onClose={() => setShowPrivacy(false)} />}
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <label style={{
                fontSize: 9.5, fontWeight: 700, letterSpacing: "1.5px",
                textTransform: "uppercase", color: "#555",
              }}>
                Adresse email
              </label>
              <input
                type="email"
                className="login-input"
                placeholder="ton@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoFocus
                autoComplete="email"
                style={{
                  padding: "13px 14px",
                  background: "#141414",
                  border: "1.5px solid rgba(255,255,255,0.08)",
                  borderRadius: 10,
                  color: "#f5f5f5",
                  fontFamily: "'Inter',sans-serif",
                  fontSize: 15,
                  outline: "none",
                  transition: "border-color 0.15s, background 0.15s",
                  width: "100%",
                  boxSizing: "border-box",
                }}
              />
            </div>

            {/* Erreur */}
            {error && (
              <>
      {showPrivacy && <PrivacyPolicy onClose={() => setShowPrivacy(false)} />}
      <div style={{
                background: "rgba(239,68,68,0.08)",
                border: "1px solid rgba(239,68,68,0.2)",
                borderRadius: 8,
                padding: "10px 12px",
                fontSize: 12, color: "#ef4444",
                lineHeight: 1.5,
              }}>
                {error}
              </div>
            )}

            {/* Case consentement RGPD */}
            <>
      {showPrivacy && <PrivacyPolicy onClose={() => setShowPrivacy(false)} />}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
              <div
                onClick={() => setAccepted(v => !v)}
                style={{
                  width: 18, height: 18, flexShrink: 0, marginTop: 1,
                  borderRadius: 5, cursor: "pointer",
                  background: accepted ? "#02d1ba" : "transparent",
                  border: `2px solid ${accepted ? "#02d1ba" : "rgba(255,255,255,0.2)"}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "all 0.15s",
                }}
              >
                {accepted && <span style={{ color: "#0d0d0d", fontSize: 11, fontWeight: 800 }}>✓</span>}
              </div>
              <p style={{ fontSize: 11, color: "#6b7280", margin: 0, lineHeight: 1.6 }}>
                J'accepte la{" "}
                <button
                  type="button"
                  onClick={() => setShowPrivacy(true)}
                  style={{ background: "none", border: "none", color: "#02d1ba", fontSize: 11, cursor: "pointer", padding: 0, textDecoration: "underline" }}
                >
                  politique de confidentialité
                </button>
                {" "}et le traitement de mes données personnelles conformément au RGPD.
              </p>
            </div>

            <button
              type="submit"
              className="login-btn"
              disabled={!accepted || !email || loading}
              style={{
                padding: "14px",
                background: valid && !loading ? "#02d1ba" : "#1a1a1a",
                border: "none",
                borderRadius: 10,
                color: valid && !loading ? "#0d0d0d" : "#444",
                fontSize: 14, fontWeight: 700,
                cursor: valid && !loading ? "pointer" : "not-allowed",
                transition: "all 0.2s",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                boxShadow: valid && !loading ? "0 4px 20px rgba(2,209,186,0.25)" : "none",
              }}
            >
              {loading ? (
                <>
                  <svg viewBox="0 0 20 20" fill="none" style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }}>
                    <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="2.5" strokeDasharray="22 10"/>
                  </svg>
                  Envoi en cours...
                </>
              ) : (
                <>
                  <svg viewBox="0 0 20 20" fill="none" style={{ width: 15, height: 15 }}>
                    <path d="M3 10l7-7 7 7M10 3v14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Recevoir mon lien de connexion
                </>
              )}
            </button>

            <p style={{ fontSize: 11, color: "#444", textAlign: "center", lineHeight: 1.6 }}>
              Un lien magique te sera envoyé par email.<br/>
              Aucun mot de passe nécessaire.
            </p>
          </form>
        ) : (
          /* ── Magic link envoyé ── */
          <>
      {showPrivacy && <PrivacyPolicy onClose={() => setShowPrivacy(false)} />}
      <div style={{
            width: "100%",
            background: "rgba(2,209,186,0.06)",
            border: "1px solid rgba(2,209,186,0.2)",
            borderRadius: 14,
            padding: "28px 24px",
            textAlign: "center",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 12,
          }}>
            <>
      {showPrivacy && <PrivacyPolicy onClose={() => setShowPrivacy(false)} />}
      <div style={{
              width: 52, height: 52,
              background: "rgba(2,209,186,0.12)",
              borderRadius: "50%",
              display: "flex", alignItems: "center", justifyContent: "center",
              animation: "pulse 2s infinite",
            }}>
              <svg viewBox="0 0 24 24" fill="none" style={{ width: 26, height: 26 }}>
                <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  stroke="#02d1ba" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
            </div>
            <div>
              <>
      {showPrivacy && <PrivacyPolicy onClose={() => setShowPrivacy(false)} />}
      <div style={{ fontSize: 16, fontWeight: 700, color: "#f5f5f5", marginBottom: 6 }}>
                Vérifie ta boîte mail !
              </div>
              <>
      {showPrivacy && <PrivacyPolicy onClose={() => setShowPrivacy(false)} />}
      <div style={{ fontSize: 12, color: "#6b7280", lineHeight: 1.6 }}>
                Un lien de connexion a été envoyé à<br/>
                <strong style={{ color: "#02d1ba" }}>{email}</strong>
              </div>
            </div>
            <>
      {showPrivacy && <PrivacyPolicy onClose={() => setShowPrivacy(false)} />}
      <div style={{ fontSize: 11, color: "#555", marginTop: 4 }}>
              Le lien expire dans 1 heure.<br/>
              Vérifie tes spams si tu ne vois rien.
            </div>
            <button
              onClick={() => window.location.reload()}
              style={{
                background: "none", border: "none", color: "#6b7280",
                fontSize: 11, cursor: "pointer", marginTop: 8, textDecoration: "underline",
              }}
            >
              Changer d'adresse email
            </button>
          </div>
        )}
      </div>
    </div>
    </>
  );
}

import React, { useState } from "react";
import { PrivacyPolicy } from "./PrivacyPolicy";
import { LOGO_B64 } from "../utils/logo";

export function LoginScreen({ onSendMagicLink, loading }) {
  const [email, setEmail]         = useState("");
  const [sent, setSent]           = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [accepted, setAccepted]   = useState(false);

  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && accepted;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (valid && !loading) {
      onSendMagicLink(email);
      setSent(true);
    }
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
        padding: "24px 20px",
        fontFamily: "'Inter', sans-serif",
      }}>
        <div style={{ width: "100%", maxWidth: 380 }}>

          {/* Logo */}
          <div style={{ textAlign: "center", marginBottom: 36 }}>
            <div style={{
              width: 120, height: 120,
              background: "#141414",
              border: "2px solid rgba(2,209,186,0.2)",
              borderRadius: 20,
              overflow: "hidden",
              margin: "0 auto 16px",
            }}>
              <img src={LOGO_B64} alt="RB Performance" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 55%" }} />
            </div>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: "#f5f5f5", margin: "0 0 6px", letterSpacing: "-0.5px" }}>
              RB <span style={{ color: "#02d1ba" }}>Performance</span>
            </h1>
            <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>
              Connecte-toi pour accéder à ton programme personnalisé
            </p>
          </div>

          {!sent ? (
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>

              {/* Champ email */}
              <div>
                <label style={{ display: "block", fontSize: 10, fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase", color: "#555", marginBottom: 6 }}>
                  Adresse email
                </label>
                <input
                  type="email"
                  placeholder="ton@email.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  autoFocus
                  style={{
                    width: "100%", boxSizing: "border-box",
                    background: "#141414",
                    border: "1.5px solid rgba(255,255,255,0.08)",
                    borderRadius: 10, padding: "12px 14px",
                    color: "#f5f5f5", fontSize: 14,
                    fontFamily: "'Inter', sans-serif",
                    outline: "none",
                    transition: "border-color 0.15s",
                  }}
                  onFocus={e => e.target.style.borderColor = "#02d1ba"}
                  onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.08)"}
                />
              </div>

              {/* Case consentement RGPD */}
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
                  {" "}et le traitement de mes données conformément au RGPD.
                </p>
              </div>

              {/* Bouton submit */}
              <button
                type="submit"
                disabled={!valid || loading}
                style={{
                  width: "100%", padding: "13px",
                  background: valid ? "#02d1ba" : "#1a1a1a",
                  border: "none", borderRadius: 10,
                  color: valid ? "#0d0d0d" : "#444",
                  fontSize: 13, fontWeight: 800,
                  cursor: valid ? "pointer" : "not-allowed",
                  transition: "all 0.15s",
                  boxShadow: valid ? "0 4px 20px rgba(2,209,186,0.3)" : "none",
                }}
              >
                {loading ? "Envoi en cours..." : "Recevoir mon lien de connexion ↑"}
              </button>

              <p style={{ fontSize: 11, color: "#444", textAlign: "center", margin: 0, lineHeight: 1.6 }}>
                Un lien magique te sera envoyé par email.<br/>
                Aucun mot de passe nécessaire.
              </p>
            </form>

          ) : (
            /* ── Magic link envoyé ── */
            <div style={{
              background: "rgba(2,209,186,0.06)",
              border: "1px solid rgba(2,209,186,0.2)",
              borderRadius: 14,
              padding: "28px 24px",
              textAlign: "center",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 12,
            }}>
              <div style={{
                width: 52, height: 52,
                background: "rgba(2,209,186,0.12)",
                borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <svg viewBox="0 0 24 24" fill="none" style={{ width: 26, height: 26 }}>
                  <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    stroke="#02d1ba" strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
              </div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#f5f5f5", marginBottom: 6 }}>
                  Vérifie ta boîte mail !
                </div>
                <div style={{ fontSize: 12, color: "#6b7280", lineHeight: 1.6 }}>
                  Un lien de connexion a été envoyé à<br/>
                  <strong style={{ color: "#f5f5f5" }}>{email}</strong>
                </div>
              </div>
              <div style={{ fontSize: 11, color: "#555" }}>
                Le lien expire dans 1 heure · Vérifie tes spams si besoin
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

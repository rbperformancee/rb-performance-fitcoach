// PackDecouverteOptin — page /pack-decouverte
//
// Lead magnet capture (Jonas-style). Pas de friction : juste email + prénom
// optionnel → mail welcome immédiat avec lien pack + séquence nurture J+1 J+7.

import React, { useState, useEffect } from "react";
import { trackCTAClick } from "../lib/analytics";

const GREEN = "#02d1ba";
const BG = "#050505";

function readQuery() {
  if (typeof window === "undefined") return {};
  try {
    const p = new URLSearchParams(window.location.search);
    return {
      utm_source: p.get("utm_source"),
      utm_medium: p.get("utm_medium"),
      utm_campaign: p.get("utm_campaign"),
      source: p.get("source") || (document.referrer ? "referrer" : "direct"),
    };
  } catch {
    return {};
  }
}

export default function PackDecouverteOptin() {
  const [email, setEmail] = useState("");
  const [nomPrenom, setNomPrenom] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    document.title = "Pack Découverte gratuit · RB Perform";
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email.trim() || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      trackCTAClick("pack_decouverte_optin_submit", "pack-decouverte-page");
      const meta = readQuery();
      const resp = await fetch("/api/pack-decouverte-optin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          nom_prenom: nomPrenom.trim() || null,
          ...meta,
        }),
      });
      const json = await resp.json();
      if (!resp.ok) {
        setError(json.error || "Erreur");
        setSubmitting(false);
        return;
      }
      setDone(true);
      setSubmitting(false);
    } catch (err) {
      setError("Problème réseau. Réessaie ?");
      setSubmitting(false);
    }
  }

  return (
    <div style={{
      minHeight: "100dvh",
      background: BG,
      color: "#fff",
      fontFamily: "-apple-system, Inter, sans-serif",
      padding: "60px 24px 80px",
    }}>
      <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <div style={{ maxWidth: 540, margin: "0 auto", textAlign: "center" }}>

        {/* Eyebrow */}
        <div style={{
          fontSize: 11,
          letterSpacing: "5px",
          textTransform: "uppercase",
          color: "rgba(2,209,186,0.7)",
          marginBottom: 16,
          fontWeight: 700,
          animation: "fadeUp 0.6s ease 0.1s both",
        }}>
          Pack Découverte · Offert
        </div>

        {!done ? (
          <>
            {/* Headline */}
            <h1 style={{
              fontSize: 44,
              fontWeight: 900,
              letterSpacing: "-2px",
              lineHeight: 0.95,
              marginBottom: 18,
              animation: "fadeUp 0.6s ease 0.2s both",
            }}>
              4 semaines.<br/>
              <span style={{ color: GREEN }}>Le protocole que j'utilise.</span>
            </h1>

            <p style={{
              fontSize: 16,
              lineHeight: 1.65,
              color: "rgba(255,255,255,0.7)",
              marginBottom: 36,
              maxWidth: 440,
              marginLeft: "auto",
              marginRight: "auto",
              animation: "fadeUp 0.6s ease 0.3s both",
            }}>
              Programme structuré sur 4 semaines, vidéos de chaque mouvement, guide nutrition simple. Sans bullshit, sans pseudo-coach, juste la méthode appliquée.
            </p>

            {/* Form */}
            <form onSubmit={handleSubmit} style={{
              display: "flex", flexDirection: "column", gap: 12,
              maxWidth: 400, marginLeft: "auto", marginRight: "auto",
              animation: "fadeUp 0.6s ease 0.4s both",
            }}>
              <input
                type="text"
                placeholder="Prénom (facultatif)"
                value={nomPrenom}
                onChange={(e) => setNomPrenom(e.target.value)}
                style={{
                  padding: "16px 20px",
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 14,
                  color: "#fff",
                  fontSize: 15,
                  fontFamily: "inherit",
                  outline: "none",
                }}
              />
              <input
                type="email"
                required
                placeholder="Ton email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  padding: "16px 20px",
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 14,
                  color: "#fff",
                  fontSize: 15,
                  fontFamily: "inherit",
                  outline: "none",
                }}
              />
              <button
                type="submit"
                disabled={!email.trim() || submitting}
                style={{
                  marginTop: 8,
                  padding: "18px 32px",
                  background: `linear-gradient(135deg, ${GREEN}, #0891b2)`,
                  color: "#000",
                  border: "none",
                  borderRadius: 16,
                  fontSize: 14,
                  fontWeight: 900,
                  letterSpacing: "1px",
                  textTransform: "uppercase",
                  cursor: email.trim() && !submitting ? "pointer" : "not-allowed",
                  opacity: email.trim() && !submitting ? 1 : 0.5,
                }}
              >
                {submitting ? "Envoi…" : "→ Recevoir le pack"}
              </button>
            </form>

            {error && (
              <div style={{ marginTop: 14, padding: "10px 16px", background: "rgba(255,107,107,0.1)", border: "1px solid rgba(255,107,107,0.4)", borderRadius: 8, fontSize: 13, color: "#ff6b6b" }}>
                {error}
              </div>
            )}

            <div style={{
              marginTop: 28,
              fontSize: 11,
              color: "rgba(255,255,255,0.35)",
              lineHeight: 1.5,
              maxWidth: 400, marginLeft: "auto", marginRight: "auto",
              animation: "fadeUp 0.6s ease 0.5s both",
            }}>
              Tu reçois le pack par mail dans la minute. Tu peux te désabonner quand tu veux — un clic, pas de friction.
            </div>
          </>
        ) : (
          <>
            <div style={{
              fontSize: 48,
              marginBottom: 12,
              animation: "fadeUp 0.6s ease 0.1s both",
            }}>
              ✓
            </div>
            <h1 style={{
              fontSize: 36,
              fontWeight: 900,
              letterSpacing: "-1.5px",
              lineHeight: 1.05,
              marginBottom: 18,
              animation: "fadeUp 0.6s ease 0.2s both",
            }}>
              Check ton mail.
            </h1>
            <p style={{
              fontSize: 15,
              color: "rgba(255,255,255,0.7)",
              lineHeight: 1.7,
              marginBottom: 28,
              maxWidth: 400,
              marginLeft: "auto", marginRight: "auto",
              animation: "fadeUp 0.6s ease 0.3s both",
            }}>
              Le Pack Découverte vient de partir sur <strong style={{ color: "#fff" }}>{email}</strong>. Si tu le vois pas, check tes spams — l'expéditeur est <em>rayan@rbperform.app</em>.
            </p>
            <p style={{
              fontSize: 13,
              color: "rgba(255,255,255,0.45)",
              lineHeight: 1.7,
              maxWidth: 420,
              marginLeft: "auto", marginRight: "auto",
              animation: "fadeUp 0.6s ease 0.4s both",
            }}>
              Tu vas recevoir 4 mails dans les jours qui viennent — pas du spam, du contenu de méthode que j'utilise sur mes athlètes.
            </p>
          </>
        )}

      </div>
    </div>
  );
}

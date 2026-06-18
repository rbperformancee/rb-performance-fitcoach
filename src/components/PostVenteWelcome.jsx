// src/components/PostVenteWelcome.jsx
//
// Page 5 du funnel RB Perform — /post-vente
// Affichée après paiement Stripe réussi.
//
// Contient :
// - Vidéo welcome 2 min (Rayan face cam)
// - Plan onboarding 30 jours visualisé
// - Lien App Store
// - Lien profil L2 (si pas déjà rempli)
// - Engagement WhatsApp direct (pas de groupe)

import React, { useEffect } from "react";
import FunnelVideoPlayer from "./FunnelVideoPlayer";
import { trackPostVenteViewed, trackPurchase } from "../lib/analytics";

const GREEN = "#02d1ba";
const BG = "#050505";

export default function PostVenteWelcome() {
  useEffect(() => {
    document.title = "Bienvenue dans RB Perform PRO";
    // Tracking : utilisateur arrive sur /post-vente = paiement confirmé
    trackPostVenteViewed();
    // Track Purchase event si Stripe a redirigé avec un plan en query
    try {
      const params = new URLSearchParams(window.location.search);
      const plan = params.get("plan");
      if (plan) trackPurchase({ plan });
    } catch {}
  }, []);

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
        @keyframes tealPulse { 0%, 100% { color: ${GREEN}; } 50% { color: #5ee8d4; } }
      `}</style>

      <div style={{ maxWidth: 640, margin: "0 auto", textAlign: "center" }}>

        {/* Pill confirmation */}
        <div style={{
          display: "inline-block",
          padding: "8px 18px",
          background: "rgba(2,209,186,0.12)",
          border: `1px solid rgba(2,209,186,0.3)`,
          borderRadius: 100,
          fontSize: 11,
          letterSpacing: "2px",
          textTransform: "uppercase",
          color: GREEN,
          fontWeight: 800,
          marginBottom: 32,
          animation: "fadeUp 0.6s ease 0.1s both",
        }}>
          ✓ Paiement confirmé
        </div>

        {/* H1 */}
        <h1 style={{
          fontSize: 48,
          fontWeight: 900,
          letterSpacing: "-2px",
          lineHeight: 1,
          marginBottom: 24,
          animation: "fadeUp 0.6s ease 0.2s both",
        }}>
          Bienvenue<br/>
          <span style={{ animation: "tealPulse 3s ease-in-out infinite" }}>
            dans RB Perform PRO.
          </span>
        </h1>

        <p style={{
          fontSize: 15,
          color: "rgba(255,255,255,0.65)",
          lineHeight: 1.7,
          marginBottom: 40,
          maxWidth: 480,
          marginLeft: "auto",
          marginRight: "auto",
          animation: "fadeUp 0.6s ease 0.3s both",
        }}>
          Tu viens de prendre une décision que la majorité des athlètes que je croise
          n'arrivent pas à prendre. Respect.
        </p>

        {/* Vidéo welcome */}
        <div style={{ animation: "fadeUp 0.6s ease 0.4s both" }}>
          <FunnelVideoPlayer
            videoKey="welcome_post_vente"
            stepLabel="Regarde ces 2 minutes"
            stepTitle="Voilà comment on démarre"
          />
        </div>

        {/* Roadmap 30 jours */}
        <div style={{
          marginTop: 48,
          marginBottom: 40,
          animation: "fadeUp 0.6s ease 0.5s both",
          textAlign: "left",
        }}>
          <div style={{
            fontSize: 11,
            letterSpacing: "3px",
            textTransform: "uppercase",
            color: "rgba(2,209,186,0.8)",
            fontWeight: 800,
            marginBottom: 20,
            textAlign: "center",
          }}>
            Tes 30 prochains jours
          </div>

          {[
            { day: "J+0", title: "Aujourd'hui — bienvenue", desc: "Je t'envoie un message WhatsApp avec tous les accès." },
            { day: "J+1", title: "Call onboarding (30 min)", desc: "Visio. Je te pose des questions précises pour calibrer ton programme." },
            { day: "J+2", title: "Livret Méthode Athlète 90", desc: "Je te livre le PDF méthodologie (110 pages)." },
            { day: "J+3", title: "Ton programme dans l'app", desc: "Programme personnalisé prêt. T'as plus qu'à ouvrir l'app et démarrer." },
            { day: "J+7", title: "Check-in semaine 1", desc: "Voice message de ma part pour faire le point sur tes 7 premiers jours." },
            { day: "J+14", title: "Premier call stratégie (45 min)", desc: "On regarde tes données ensemble, on ajuste pour les 2 semaines suivantes." },
            { day: "J+30", title: "Bilan mensuel", desc: "Photos, mesures, perfs, ressentis. On consolide la suite." },
          ].map((step, i) => (
            <div key={i} style={{
              display: "flex",
              gap: 16,
              padding: "14px 0",
              borderBottom: i < 6 ? "1px solid rgba(255,255,255,0.06)" : "none",
            }}>
              <div style={{
                flexShrink: 0,
                width: 56,
                fontSize: 12,
                letterSpacing: "1px",
                color: GREEN,
                fontWeight: 800,
                paddingTop: 2,
              }}>
                {step.day}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", marginBottom: 4 }}>
                  {step.title}
                </div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", lineHeight: 1.55 }}>
                  {step.desc}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA App Store */}
        <a
          href="https://apps.apple.com/app/id6776260337"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "block",
            padding: "16px 24px",
            background: `linear-gradient(135deg, ${GREEN}, #0891b2)`,
            color: "#000",
            textDecoration: "none",
            textAlign: "center",
            borderRadius: 14,
            fontWeight: 800,
            fontSize: 15,
            letterSpacing: "0.3px",
            marginBottom: 14,
            boxShadow: "0 8px 30px rgba(2,209,186,0.35)",
            animation: "fadeUp 0.6s ease 0.6s both",
          }}
        >
          📱 Télécharger l'app RB Perform
        </a>

        {/* CTA profil L2 (optionnel) */}
        <a
          href="/candidature/profil"
          style={{
            display: "block",
            padding: "14px 22px",
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.1)",
            color: "#fff",
            textDecoration: "none",
            textAlign: "center",
            borderRadius: 14,
            fontWeight: 600,
            fontSize: 13,
            marginBottom: 28,
            animation: "fadeUp 0.6s ease 0.7s both",
          }}
        >
          Compléter mon profil avant le call onboarding →
        </a>

        {/* Disclaimer engagement */}
        <div style={{
          padding: "16px 20px",
          background: "rgba(2,209,186,0.04)",
          border: "1px dashed rgba(2,209,186,0.25)",
          borderRadius: 12,
          fontSize: 12,
          color: "rgba(255,255,255,0.7)",
          lineHeight: 1.6,
          textAlign: "left",
          maxWidth: 480,
          marginLeft: "auto",
          marginRight: "auto",
          animation: "fadeUp 0.6s ease 0.8s both",
        }}>
          <strong style={{ color: "#fff", fontWeight: 700 }}>Ton WhatsApp direct avec moi :</strong>
          {" "}à utiliser pour toute question, doute, ou imprévu. Ligne directe, pas de groupe.
          Préfère m'écrire trop tôt que trop tard.
        </div>

      </div>
    </div>
  );
}

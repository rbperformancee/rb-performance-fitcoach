// src/components/ConfirmationPagePreview.jsx
//
// Preview de la Page 3 (confirmation post-candidature) sans avoir à
// soumettre le form. Accessible sur /candidature/preview-confirmation.
// À supprimer en prod (ou laisser, c'est juste un visuel).
//
// Reproduit exactement le rendu du step 7 d'OnboardingFlow en mode
// application.

import React, { useEffect } from "react";
import FunnelVideoPlayer from "./FunnelVideoPlayer";
import FunnelVideoPlayerCompact from "./FunnelVideoPlayerCompact";

const GREEN = "#02d1ba";
const BG = "#050505";

// Mock 3 créneaux pour l'affichage du bloc calendrier
const MOCK_SLOTS = [
  { date: "2026-06-20", time: "10:00" },
  { date: "2026-06-21", time: "14:00" },
  { date: "2026-06-22", time: "09:00" },
];

export default function ConfirmationPagePreview() {
  useEffect(() => {
    document.title = "Preview · Page 3 confirmation — RB Perform";
  }, []);

  const intlLocale = () => "fr-FR";

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

        {/* Banner preview */}
        <div style={{
          background: "rgba(255,123,0,0.15)",
          border: "1px solid rgba(255,123,0,0.4)",
          borderRadius: 8,
          padding: "10px 16px",
          fontSize: 11,
          letterSpacing: "1px",
          color: "#ff7b00",
          fontWeight: 700,
          marginBottom: 32,
          textTransform: "uppercase",
        }}>
          🔬 Mode preview — vue identique à après-soumission du form
        </div>

        {/* Eyebrow + H1 + paragraphe (= contenu step 7 actuel) */}
        <div style={{
          fontSize: 11,
          letterSpacing: "5px",
          textTransform: "uppercase",
          color: "rgba(2,209,186,0.6)",
          marginBottom: 16,
          fontWeight: 700,
          animation: "fadeUp 0.6s ease 0.2s both",
        }}>
          Candidature reçue
        </div>

        <h1 style={{
          fontSize: 44,
          fontWeight: 900,
          letterSpacing: "-2px",
          lineHeight: 0.9,
          marginBottom: 24,
          animation: "fadeUp 0.6s ease 0.3s both",
        }}>
          Merci.<br/>
          <span style={{ animation: "tealPulse 3s ease-in-out infinite" }}>Je te recontacte.</span>
        </h1>

        <p style={{
          fontSize: 13,
          color: "rgba(255,255,255,0.4)",
          lineHeight: 1.8,
          marginBottom: 36,
          animation: "fadeUp 0.6s ease 0.5s both",
          maxWidth: 360,
          marginLeft: "auto",
          marginRight: "auto",
        }}>
          Ta candidature est arrivée.<br/>Tu as un email de confirmation. Je reviens vers toi sous 24h pour caler le créneau.
        </p>

        {/* ════════ JONAS-STYLE : HERO VIDEO + PILIERS COMPACTS ════════ */}

        {/* HERO — la grosse vidéo cadrage (équivalent step 1/4 Jonas) */}
        <div style={{
          marginBottom: 56,
          animation: "fadeUp 0.6s ease 0.4s both",
          maxWidth: 720,
          marginLeft: "auto",
          marginRight: "auto",
        }}>
          <div style={{
            fontSize: 11,
            letterSpacing: "4px",
            textTransform: "uppercase",
            color: GREEN,
            fontWeight: 800,
            marginBottom: 6,
          }}>
            Étape 1 / 4
          </div>
          <div style={{
            fontSize: 22,
            fontWeight: 900,
            letterSpacing: "-0.5px",
            color: "#fff",
            marginBottom: 18,
            lineHeight: 1.2,
          }}>
            Regarde ta vidéo de confirmation
          </div>
          <FunnelVideoPlayer videoKey="cadrage_call" />
        </div>

        {/* PILIERS — grid compact (équivalent breakout videos Jonas) */}
        <div style={{ marginBottom: 48, animation: "fadeUp 0.6s ease 0.5s both" }}>
          <div style={{
            fontSize: 11,
            letterSpacing: "4px",
            textTransform: "uppercase",
            color: GREEN,
            fontWeight: 800,
            marginBottom: 6,
          }}>
            Étape 2 / 4
          </div>
          <div style={{
            fontSize: 22,
            fontWeight: 900,
            letterSpacing: "-0.5px",
            color: "#fff",
            marginBottom: 8,
            lineHeight: 1.2,
          }}>
            Regarde les 5 piliers de la méthode
          </div>
          <div style={{
            fontSize: 13,
            color: "rgba(255,255,255,0.5)",
            lineHeight: 1.5,
            marginBottom: 22,
            maxWidth: 460,
            marginLeft: "auto",
            marginRight: "auto",
          }}>
            Comment je travaille avec mes athlètes — pour gagner du temps sur l'appel.
          </div>

          <div style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 12,
            justifyContent: "center",
            maxWidth: 720,
            marginLeft: "auto",
            marginRight: "auto",
          }}>
            {[
              { key: "pilier_1_methode", num: "01", title: "Une méthode, pas dix" },
              { key: "pilier_2_app", num: "02", title: "L'app RB Perform" },
              { key: "pilier_3_accountability", num: "03", title: "L'accountability" },
              { key: "pilier_4_programme_vivant", num: "04", title: "Le programme vivant" },
              { key: "pilier_5_selection", num: "05", title: "Pourquoi 15 athlètes max" },
            ].map((p) => (
              <div key={p.key} style={{ flex: "1 1 220px", maxWidth: 232, minWidth: 220 }}>
                <FunnelVideoPlayerCompact
                  videoKey={p.key}
                  num={p.num}
                  title={p.title}
                />
              </div>
            ))}
          </div>
        </div>

        {/* ÉTAPE 3 — Attente du créneau (je choisis l'horaire, pas le prospect) */}
        <div style={{ marginBottom: 32, maxWidth: 420, marginLeft: "auto", marginRight: "auto" }}>
          <div style={{
            fontSize: 11,
            letterSpacing: "4px",
            textTransform: "uppercase",
            color: GREEN,
            fontWeight: 800,
            marginBottom: 6,
            textAlign: "center",
          }}>
            Étape 3 / 4
          </div>
          <div style={{
            fontSize: 22,
            fontWeight: 900,
            letterSpacing: "-0.5px",
            color: "#fff",
            marginBottom: 14,
            lineHeight: 1.2,
            textAlign: "center",
          }}>
            Attends ton créneau
          </div>
          <div style={{
            padding: "18px 20px",
            background: "rgba(2,209,186,0.04)",
            border: "1px solid rgba(2,209,186,0.18)",
            borderRadius: 14,
            textAlign: "left",
          }}>
            <div style={{ fontSize: 14, color: "rgba(255,255,255,0.85)", lineHeight: 1.65 }}>
              Je regarde ta candidature dans les <strong style={{ color: "#fff" }}>24h</strong>. Si je vois qu'on peut bosser ensemble,
              je te confirme par email un <strong style={{ color: "#fff" }}>créneau précis</strong>.
            </div>
            <div style={{
              marginTop: 12,
              paddingTop: 12,
              borderTop: "1px solid rgba(255,255,255,0.08)",
              fontSize: 12,
              color: "rgba(255,255,255,0.55)",
              lineHeight: 1.6,
            }}>
              Tu reçois le mail → tu cliques sur le lien → c'est ajouté à ton calendrier.<br/>
              <span style={{ color: GREEN }}>Pas de back-and-forth.</span> Je sélectionne l'horaire qui colle au mieux à tes dispos.
            </div>
          </div>
        </div>

        {/* ÉTAPE 4 — Préparation appel */}
        <div style={{ marginBottom: 36, textAlign: "left", maxWidth: 420, marginLeft: "auto", marginRight: "auto" }}>
          <div style={{
            fontSize: 11, letterSpacing: "4px", textTransform: "uppercase",
            color: GREEN, fontWeight: 800, marginBottom: 6, textAlign: "center"
          }}>
            Étape 4 / 4
          </div>
          <div style={{
            fontSize: 22,
            fontWeight: 900,
            letterSpacing: "-0.5px",
            color: "#fff",
            marginBottom: 14,
            lineHeight: 1.2,
            textAlign: "center",
          }}>
            Prépare ton appel
          </div>
          {[
            { n: "1.", t: "Réfléchis à ton vrai pourquoi", d: "Au-delà de \"être plus musclé\" : qu'est-ce qui va changer dans ta vie quand tu auras atteint cet objectif ?" },
            { n: "2.", t: "Sois dans un endroit calme", d: "Écouteurs, pas en voiture, pas pendant ton service. 30 min focus." },
            { n: "3.", t: "Prépare une seule chose : ton budget annuel forme", d: "Salle + suppléments + bouffe spéciale + coach éventuel = X€/an. On va parler chiffres au lieu de tourner autour." },
          ].map((item, i) => (
            <div key={i} style={{ display: "flex", gap: 12, marginBottom: 16, alignItems: "flex-start" }}>
              <div style={{ flexShrink: 0, color: GREEN, fontWeight: 900, fontSize: 16 }}>{item.n}</div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", marginBottom: 4 }}>{item.t}</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", lineHeight: 1.6 }}>{item.d}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Lien L2 */}
        <div style={{ marginBottom: 36, maxWidth: 420, marginLeft: "auto", marginRight: "auto" }}>
          <a href="/candidature/profil" style={{
            display: "block", padding: "16px 20px",
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.15)",
            borderRadius: 14, color: "#fff", textDecoration: "none", textAlign: "left",
          }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>
              ✨ Envoie-moi ton profil avant l'appel <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 11 }}>(facultatif)</span>
            </div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.55)" }}>
              Quelques questions pour que je découvre ton profil avant qu'on se parle.
            </div>
          </a>
        </div>

        {/* Engagement anti-no-show */}
        <div style={{
          padding: "14px 18px",
          background: "rgba(255,255,255,0.02)",
          border: "1px dashed rgba(255,255,255,0.1)",
          borderRadius: 12,
          maxWidth: 420, marginLeft: "auto", marginRight: "auto",
          fontSize: 12, color: "rgba(255,255,255,0.7)", lineHeight: 1.6, textAlign: "left",
        }}>
          <strong style={{ color: "#fff" }}>Si tu ne peux plus :</strong> préviens-moi au moins 24h avant. Je bloque exclusivement les créneaux pour des gens sérieux.
        </div>

      </div>
    </div>
  );
}

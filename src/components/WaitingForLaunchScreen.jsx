/**
 * WaitingForLaunchScreen.jsx
 *
 * Écran affiché aux coachs Founding après qu'ils aient terminé l'onboarding,
 * tant que la date de launch officiel (`APP_UNLOCK_AT`) n'est pas atteinte.
 *
 * UX :
 * - Countdown live (jours / heures / minutes / secondes)
 * - Message launch officiel + lien Instagram pour suivre les news
 * - Bouton "Se déconnecter" (l'user peut revenir quand il veut)
 * - À l'unlock auto → window.location.reload() pour entrer dans le dashboard
 *
 * Source de la date : constante APP_UNLOCK_AT (UTC). Hardcodé pour simplicité —
 * pas besoin d'env var car date one-shot Founding launch.
 *
 * Cf. cron-launch-reminder.js pour l'email J-1 envoyé automatiquement.
 */

import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

const G = "#02d1ba";

// 26 mai 2026 à 09h00 Paris (DST CEST = UTC+2 en mai) = 07h00 UTC
export const APP_UNLOCK_AT = new Date("2026-05-26T07:00:00Z");

function diffParts(deltaMs) {
  if (deltaMs <= 0) return { d: 0, h: 0, m: 0, s: 0, total: 0 };
  const total = Math.floor(deltaMs / 1000);
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return { d, h, m, s, total };
}

export default function WaitingForLaunchScreen({ coach }) {
  const [delta, setDelta] = useState(() => APP_UNLOCK_AT.getTime() - Date.now());

  useEffect(() => {
    const id = setInterval(() => {
      const d = APP_UNLOCK_AT.getTime() - Date.now();
      setDelta(d);
      if (d <= 0) {
        clearInterval(id);
        // Unlock : reload pour passer le check côté App.jsx et entrer dans le dashboard
        setTimeout(() => { window.location.reload(); }, 1500);
      }
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const { d, h, m, s, total } = diffParts(delta);
  const unlocked = total <= 0;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  const firstName = (coach?.full_name || "").split(" ")[0] || null;

  return (
    <div style={{
      minHeight: "100dvh",
      background: "#050505",
      color: "#fff",
      fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, 'Inter', sans-serif",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "40px 24px",
      position: "relative",
      overflow: "hidden",
      WebkitFontSmoothing: "antialiased",
    }}>
      {/* Ambiance gradients */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "60%", background: `radial-gradient(ellipse at 50% -10%, ${G}1f 0%, transparent 60%)`, pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "40%", background: `radial-gradient(ellipse at 50% 120%, ${G}0a 0%, transparent 60%)`, pointerEvents: "none" }} />

      {/* Logout (top right) */}
      <button
        type="button"
        onClick={handleLogout}
        style={{ position: "absolute", top: 20, right: 20, background: "transparent", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.45)", padding: "8px 14px", borderRadius: 100, fontSize: 11, fontWeight: 600, letterSpacing: "0.04em", cursor: "pointer", fontFamily: "inherit" }}
      >
        Se déconnecter
      </button>

      {/* Logo */}
      <div style={{ fontSize: 14, fontWeight: 900, letterSpacing: "0.12em", color: "#fff", marginBottom: 48, fontFamily: "'Inter', sans-serif" }}>
        RB<span style={{ color: G }}>PERFORM</span>
      </div>

      <div style={{ maxWidth: 540, width: "100%", textAlign: "center", position: "relative", zIndex: 1 }}>

        {/* Eyebrow */}
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.3em", textTransform: "uppercase", color: G, marginBottom: 18 }}>
          ● {unlocked ? "Ton accès vient d'ouvrir" : "Founding Coach Program · Ouverture imminente"}
        </div>

        {/* Titre */}
        <h1 style={{ fontSize: "clamp(34px, 6vw, 52px)", fontWeight: 900, letterSpacing: "-0.04em", lineHeight: 1.05, marginBottom: 20, color: "#fff" }}>
          {firstName ? `${firstName}, ` : ""}{unlocked ? "C'est ouvert" : "Tu y es presque"}
          <span style={{ color: G }}>.</span>
        </h1>

        {/* Sub */}
        <p style={{ fontSize: 17, color: "rgba(255,255,255,0.7)", lineHeight: 1.55, marginBottom: 44, maxWidth: 480, marginLeft: "auto", marginRight: "auto" }}>
          {unlocked
            ? "L'app vient d'ouvrir. On te redirige dans 2 secondes…"
            : <>Ton compte Founding est <strong style={{ color: "#fff" }}>prêt</strong>. L'app ouvre officiellement le <strong style={{ color: "#fff" }}>26 mai 2026 à 09h00</strong>. On t'envoie un email rappel la veille à 9h.</>
          }
        </p>

        {/* Countdown */}
        {!unlocked && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, maxWidth: 440, margin: "0 auto 44px" }}>
            {[
              { v: d, label: d > 1 ? "JOURS" : "JOUR" },
              { v: h, label: h > 1 ? "HEURES" : "HEURE" },
              { v: m, label: m > 1 ? "MIN" : "MIN" },
              { v: s, label: "SEC" },
            ].map((part, i) => (
              <div key={i} style={{ padding: "18px 10px", background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, minWidth: 0 }}>
                <div style={{ fontSize: "clamp(28px, 6vw, 38px)", fontWeight: 900, color: "#fff", letterSpacing: "-0.03em", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
                  {String(part.v).padStart(2, "0")}
                </div>
                <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.15em", color: "rgba(255,255,255,0.4)", marginTop: 6 }}>
                  {part.label}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pendant l'attente */}
        {!unlocked && (
          <div style={{ padding: "24px 22px", border: `1px solid ${G}33`, borderRadius: 16, background: `${G}0a`, textAlign: "left", marginBottom: 28 }}>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.18em", textTransform: "uppercase", color: G, marginBottom: 12 }}>
              Pendant l'attente
            </div>
            <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
              <li style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 10 }}>
                <span style={{ color: G, fontSize: 13, fontWeight: 900, flexShrink: 0, marginTop: 1 }}>→</span>
                <span style={{ fontSize: 14, color: "rgba(255,255,255,0.7)", lineHeight: 1.5 }}>
                  Tu reçois un <strong style={{ color: "#fff" }}>email rappel le 25 mai à 9h</strong> + un autre le jour J à 09h pile.
                </span>
              </li>
              <li style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 10 }}>
                <span style={{ color: G, fontSize: 13, fontWeight: 900, flexShrink: 0, marginTop: 1 }}>→</span>
                <span style={{ fontSize: 14, color: "rgba(255,255,255,0.7)", lineHeight: 1.5 }}>
                  Tu peux <strong style={{ color: "#fff" }}>te reconnecter quand tu veux</strong> — le countdown reprend en temps réel.
                </span>
              </li>
              <li style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                <span style={{ color: G, fontSize: 13, fontWeight: 900, flexShrink: 0, marginTop: 1 }}>→</span>
                <span style={{ fontSize: 14, color: "rgba(255,255,255,0.7)", lineHeight: 1.5 }}>
                  Suis <a href="https://instagram.com/rb_perform" target="_blank" rel="noopener noreferrer" style={{ color: G, fontWeight: 700, textDecoration: "none", borderBottom: `1px solid ${G}55` }}>@rb_perform</a> pour les coulisses du lancement.
                </span>
              </li>
            </ul>
          </div>
        )}

        {/* Stripe receipt info */}
        {!unlocked && (
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", lineHeight: 1.55, marginTop: 32 }}>
            Ton abonnement <strong style={{ color: "rgba(255,255,255,0.6)" }}>{coach?.subscription_plan === "founding" ? "Founding 199€/mois" : (coach?.subscription_plan || "RB Perform")}</strong> est actif depuis le paiement. Aucune facturation supplémentaire avant le 26 mai. Une question ? Réponds au mail de bienvenue, Rayan te lit perso.
          </div>
        )}

      </div>
    </div>
  );
}

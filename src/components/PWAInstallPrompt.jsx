import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { isNative } from "../lib/native";

/**
 * PWAInstallPrompt — invite à installer l'app sur l'écran d'accueil.
 *
 * Depuis les dernières versions d'iOS, « Sur l'écran d'accueil » est enterré
 * dans Safari (••• → Partager → Voir plus). Les clients ne le trouvent plus
 * seuls : ce composant les guide pas à pas.
 *
 *  - iOS Safari      → instructions étape par étape (Apple n'expose aucune API)
 *  - Android Chrome  → bouton « Installer » natif via beforeinstallprompt,
 *                       sinon instructions du menu Chrome
 *  - Déjà installé / desktop / visiteur non connecté → rien
 *
 * Bottom-sheet, non intrusif, « Plus tard » re-proposé après 10 jours.
 */

const G = "#02d1ba";
const DISMISS_KEY = "rb_pwa_install_dismissed";
const REPROMPT_MS = 10 * 24 * 3600 * 1000;

// Capture l'event Android au plus tôt (peut se déclencher avant le mount).
let deferredPrompt = null;
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
  });
}

const isStandalone = () =>
  (typeof window !== "undefined" &&
    ((window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) ||
      window.navigator.standalone === true));

function detectPlatform() {
  if (typeof navigator === "undefined") return null;
  const ua = navigator.userAgent || "";
  if (/android/i.test(ua)) return "android";
  if (/iphone|ipad|ipod/i.test(ua)) return "ios";
  // iPad récent se présente comme un Mac → détection via le tactile.
  if (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1) return "ios";
  return null;
}

export default function PWAInstallPrompt() {
  const [visible, setVisible] = useState(false);
  const platform = detectPlatform();

  useEffect(() => {
    // Conditions d'exclusion : déjà installé (PWA standalone), desktop, refusé
    // récemment, OU déjà dans l'app native Capacitor (proposer d'installer
    // l'app n'a aucun sens quand on EST DEJA dans l'app installée).
    if (isStandalone() || isNative() || !platform) return;
    try {
      const ts = Number(localStorage.getItem(DISMISS_KEY) || 0);
      if (ts && Date.now() - ts < REPROMPT_MS) return;
    } catch {}
    // On n'affiche qu'aux utilisateurs connectés (pas aux visiteurs landing).
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled || !data?.session) return;
      // Petit délai : on laisse l'app se poser avant de proposer.
      setTimeout(() => { if (!cancelled) setVisible(true); }, 2500);
    });
    return () => { cancelled = true; };
  }, [platform]);

  if (!visible) return null;

  const dismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch {}
    setVisible(false);
  };

  const androidInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    try { await deferredPrompt.userChoice; } catch {}
    deferredPrompt = null;
    dismiss();
  };

  const steps =
    platform === "ios"
      ? [
          ["Touche", " ⋯ ", "en bas à droite de Safari"],
          ["Appuie sur", " Partager", ""],
          ["Fais défiler, puis", " Voir plus", ""],
          ["Choisis", " Sur l'écran d'accueil", ""],
        ]
      : [
          ["Ouvre le menu", " ⋮ ", "en haut à droite de Chrome"],
          ["Touche", " Installer l'application", " (ou « Ajouter à l'écran d'accueil »)"],
        ];

  const canNativeInstall = platform === "android" && !!deferredPrompt;

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) dismiss(); }}
      style={{
        position: "fixed", inset: 0, zIndex: 600,
        background: "rgba(0,0,0,0.6)",
        WebkitBackdropFilter: "blur(6px)", backdropFilter: "blur(6px)",
        display: "flex", alignItems: "flex-end", justifyContent: "center",
        animation: "rbPwaFade .2s ease",
      }}
    >
      <style>{`
        @keyframes rbPwaFade { from { opacity: 0 } to { opacity: 1 } }
        @keyframes rbPwaUp { from { transform: translateY(100%) } to { transform: translateY(0) } }
      `}</style>
      <div style={{
        width: "100%", maxWidth: 460,
        background: "#0c0c0c", borderRadius: "24px 24px 0 0",
        border: "1px solid rgba(255,255,255,0.08)", borderBottom: "none",
        padding: "26px 22px calc(env(safe-area-inset-bottom,0px) + 22px)",
        animation: "rbPwaUp .28s cubic-bezier(.22,1,.36,1)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 11, flexShrink: 0,
            background: `${G}14`, border: `1px solid ${G}33`,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke={G} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="7" y="2" width="10" height="20" rx="2.5" />
              <line x1="12" y1="18" x2="12" y2="18" />
            </svg>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: 2, color: G, textTransform: "uppercase" }}>Accès rapide</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#fff", letterSpacing: "-0.3px" }}>
              Installe RB Perform
            </div>
          </div>
        </div>
        <div style={{ fontSize: 12.5, color: "rgba(255,255,255,0.45)", lineHeight: 1.5, marginBottom: 18 }}>
          Ajoute l'app à ton écran d'accueil pour l'ouvrir en plein écran, comme une vraie application.
        </div>

        {canNativeInstall ? (
          <button
            onClick={androidInstall}
            style={{
              width: "100%", padding: 15, background: G, color: "#000", border: "none",
              borderRadius: 14, fontSize: 14, fontWeight: 800, cursor: "pointer",
              letterSpacing: "-0.2px", marginBottom: 10,
            }}
          >
            Installer l'application
          </button>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 9, marginBottom: 16 }}>
            {steps.map((s, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 11 }}>
                <div style={{
                  width: 24, height: 24, borderRadius: 8, flexShrink: 0,
                  background: `${G}14`, border: `1px solid ${G}30`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontFamily: "'JetBrains Mono',monospace", fontSize: 12, fontWeight: 700, color: G,
                }}>{i + 1}</div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.75)", lineHeight: 1.4 }}>
                  {s[0]}
                  <strong style={{ color: "#fff", fontWeight: 700 }}>{s[1]}</strong>
                  {s[2]}
                </div>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={dismiss}
          style={{
            width: "100%", padding: 13, background: "transparent",
            color: "rgba(255,255,255,0.4)", border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 14, fontSize: 13, fontWeight: 600, cursor: "pointer",
          }}
        >
          Plus tard
        </button>
      </div>
    </div>
  );
}

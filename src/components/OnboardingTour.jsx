// OnboardingTour.jsx
//
// Welcome tour 3 slides pour les nouveaux clients juste après
// ClientFirstLoginFlow + BaselineMaxesForm. Explique l'app en moins
// de 30 secondes : où trouver son programme, comment valider une série,
// comment modifier après coup.
//
// One-shot : persisté dans localStorage "rb_tour_seen_v1". Pour le ré-ouvrir,
// le bouton "Revoir le tour" est dans Profile (futur build).

import React, { useState } from "react";
import haptic from "../lib/haptic";

const STORAGE_KEY = "rb_tour_seen_v1";

const SLIDES = [
  {
    eyebrow: "ÉTAPE 1 · 3",
    icon: (
      <svg viewBox="0 0 24 24" width={32} height={32} fill="none" stroke="#02d1ba" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
        <rect x="7" y="14" width="4" height="4" rx="1" fill="#02d1ba" />
      </svg>
    ),
    title: "Ton programme s'ouvre tout seul.",
    body: "À l'ouverture de l'app, RB Perform t'amène direct sur la séance du jour. Tu n'as rien à chercher — tap pour commencer, c'est tout.",
  },
  {
    eyebrow: "ÉTAPE 2 · 3",
    icon: (
      <svg viewBox="0 0 24 24" width={32} height={32} fill="none" stroke="#02d1ba" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
        <polyline points="9 12 11 14 15 10" />
      </svg>
    ),
    title: "Une coche par série.",
    body: "Tape ton poids et tes répétitions, puis valide avec la coche cyan. Le timer de repos démarre tout seul. Quand t'es prêt, la prochaine série est déjà là.",
  },
  {
    eyebrow: "ÉTAPE 3 · 3",
    icon: (
      <svg viewBox="0 0 24 24" width={32} height={32} fill="none" stroke="#02d1ba" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4z" />
      </svg>
    ),
    title: "Tu t'es trompé ? Crayon.",
    body: "Tap le crayon sur une série déjà validée pour corriger le poids ou les reps. Tes données sont synchro auto avec ton préparateur — il voit exactement ce que tu fais.",
  },
];

export default function OnboardingTour({ onClose }) {
  const [step, setStep] = useState(0);
  const slide = SLIDES[step];
  const isLast = step === SLIDES.length - 1;

  const next = () => {
    haptic.light();
    if (isLast) {
      try { localStorage.setItem(STORAGE_KEY, "1"); } catch (_) {}
      onClose?.();
    } else {
      setStep((s) => s + 1);
    }
  };

  const skip = () => {
    try { localStorage.setItem(STORAGE_KEY, "1"); } catch (_) {}
    onClose?.();
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9500,
      background: "linear-gradient(180deg, #0a0a0a 0%, #050505 100%)",
      display: "flex", flexDirection: "column",
      fontFamily: "-apple-system, Inter, sans-serif",
      color: "#fff",
    }}>
      {/* Top : skip + progress */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "calc(env(safe-area-inset-top, 0px) + 18px) 22px 0",
      }}>
        <div style={{ display: "flex", gap: 6 }}>
          {SLIDES.map((_, i) => (
            <div key={i} style={{
              width: i === step ? 28 : 8, height: 4, borderRadius: 2,
              background: i <= step ? "#02d1ba" : "rgba(255,255,255,0.12)",
              transition: "all 0.3s",
            }} />
          ))}
        </div>
        <button
          onClick={skip}
          style={{
            background: "transparent", border: "none", color: "rgba(255,255,255,0.55)",
            fontSize: 13, fontWeight: 600, cursor: "pointer", padding: 6,
            fontFamily: "inherit",
          }}
        >
          Passer
        </button>
      </div>

      {/* Center : slide content */}
      <div style={{
        flex: 1, display: "flex", flexDirection: "column", justifyContent: "center",
        alignItems: "center", padding: "32px 28px", textAlign: "center",
      }}>
        <div style={{
          width: 88, height: 88, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(2,209,186,0.18), rgba(2,209,186,0.05))",
          border: "1px solid rgba(2,209,186,0.25)",
          display: "flex", alignItems: "center", justifyContent: "center",
          marginBottom: 32,
        }}>
          {slide.icon}
        </div>
        <div style={{
          fontSize: 10, letterSpacing: 3, color: "rgba(2,209,186,0.85)",
          fontWeight: 800, textTransform: "uppercase", marginBottom: 14,
        }}>
          {slide.eyebrow}
        </div>
        <div style={{
          fontSize: 28, fontWeight: 900, letterSpacing: -0.8, lineHeight: 1.15,
          marginBottom: 16, maxWidth: 320,
        }}>
          {slide.title}
        </div>
        <div style={{
          fontSize: 15, color: "rgba(255,255,255,0.62)", lineHeight: 1.55,
          maxWidth: 340,
        }}>
          {slide.body}
        </div>
      </div>

      {/* Bottom : next button */}
      <div style={{
        padding: "0 28px calc(env(safe-area-inset-bottom, 0px) + 28px)",
      }}>
        <button
          onClick={next}
          style={{
            width: "100%", padding: "17px", borderRadius: 100,
            background: "#02d1ba", color: "#050505",
            border: "none", fontSize: 14, fontWeight: 800, letterSpacing: 0.5,
            cursor: "pointer", fontFamily: "inherit",
            boxShadow: "0 10px 30px rgba(2,209,186,0.35)",
          }}
        >
          {isLast ? "C'est parti" : "Suivant"}
        </button>
      </div>
    </div>
  );
}

// Helper exporté pour gate dans App.jsx
export function shouldShowOnboardingTour() {
  try {
    return localStorage.getItem(STORAGE_KEY) !== "1";
  } catch (_) {
    return true;
  }
}

// NotifSoftPrompt.jsx
//
// Soft-prompt iOS-style pour les notifications : on attend le 2e ou 3e open
// de l'app (pas le 1er — Apple guideline), on vérifie que la permission est
// encore "default" (jamais demandée), et on affiche un explainer avant
// de déclencher le vrai prompt système.
//
// Le pattern soft-prompt avant le prompt natif augmente le taux d'opt-in de
// 40% → 70%+ (cas étudié sur Pinterest, Wantnot, etc.) parce qu'on évite
// le "non" réflexe quand la dialog Apple arrive sans contexte.

import React, { useEffect, useState } from "react";
import { usePushNotifications } from "../hooks/usePushNotifications";
import haptic from "../lib/haptic";
import { toast } from "./Toast";

const STORAGE_OPENS_KEY = "rb_app_opens";
const STORAGE_PROMPTED_KEY = "rb_notif_soft_prompted";
const TRIGGER_OPEN = 2; // 2e ouverture authentifiée

export default function NotifSoftPrompt({ clientId }) {
  const { permission, requestPermission } = usePushNotifications(clientId);
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);

  // Incrémente le compteur d'ouvertures + check si on doit afficher.
  // Une seule fois par session (pas à chaque mount React).
  useEffect(() => {
    if (!clientId) return;
    // Skip si déjà invité (succès ou refus) ou perm déjà décidée.
    try {
      if (localStorage.getItem(STORAGE_PROMPTED_KEY) === "1") return;
    } catch (_) { return; }
    if (permission && permission !== "default") return;

    // Incrémente le compteur — une fois par session via sessionStorage
    // guard pour pas spammer à chaque re-render React.
    let opens = 1;
    try {
      const seen = sessionStorage.getItem("rb_open_counted_session");
      if (!seen) {
        const prev = parseInt(localStorage.getItem(STORAGE_OPENS_KEY) || "0", 10);
        opens = prev + 1;
        localStorage.setItem(STORAGE_OPENS_KEY, String(opens));
        sessionStorage.setItem("rb_open_counted_session", "1");
      } else {
        opens = parseInt(localStorage.getItem(STORAGE_OPENS_KEY) || "0", 10);
      }
    } catch (_) {}

    if (opens >= TRIGGER_OPEN) {
      // Petit délai pour pas claquer le prompt au moment où le user vient
      // d'arriver — il a besoin de respirer 1.5s avant qu'on lui demande
      // un consentement.
      const t = setTimeout(() => setVisible(true), 1500);
      return () => clearTimeout(t);
    }
  }, [clientId, permission]);

  if (!visible) return null;

  const dismiss = (markPrompted = true) => {
    setVisible(false);
    if (markPrompted) {
      try { localStorage.setItem(STORAGE_PROMPTED_KEY, "1"); } catch (_) {}
    }
  };

  const accept = async () => {
    haptic.medium();
    setBusy(true);
    try {
      const perm = await requestPermission();
      if (perm === "granted") {
        toast.success("Notifications activées 🔔");
      } else if (perm === "denied") {
        toast.info("Tu pourras activer plus tard dans Profile");
      }
    } catch (_) {
      toast.error("Erreur — réessaie depuis Profile");
    } finally {
      setBusy(false);
      dismiss(true);
    }
  };

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) dismiss(true); }}
      style={{
        position: "fixed", inset: 0, zIndex: 9000,
        background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)",
        display: "flex", alignItems: "flex-end", justifyContent: "center",
        padding: "0 16px calc(env(safe-area-inset-bottom, 0px) + 24px)",
      }}
    >
      <div
        style={{
          width: "100%", maxWidth: 420,
          background: "linear-gradient(180deg, #0c0c0c 0%, #050505 100%)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 22, padding: "28px 24px 22px",
          boxShadow: "0 -20px 60px rgba(0,0,0,0.5)",
          fontFamily: "-apple-system, Inter, sans-serif",
          color: "#fff",
        }}
      >
        <div style={{
          width: 56, height: 56, borderRadius: "50%",
          background: "linear-gradient(135deg, rgba(2,209,186,0.18), rgba(2,209,186,0.05))",
          border: "1px solid rgba(2,209,186,0.3)",
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 18px",
        }}>
          <svg viewBox="0 0 24 24" width={28} height={28} fill="none" stroke="#02d1ba" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
            <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
          </svg>
        </div>
        <div style={{ textAlign: "center", fontSize: 20, fontWeight: 900, letterSpacing: -0.5, marginBottom: 8 }}>
          Active les notifications
        </div>
        <div style={{ textAlign: "center", fontSize: 14, color: "rgba(255,255,255,0.62)", lineHeight: 1.45, marginBottom: 22, padding: "0 8px" }}>
          Pour que Rayan puisse t'envoyer des rappels de séance, te féliciter
          sur tes PR, et que tu reçoives ton programme à jour quand il le
          publie.
        </div>
        <button
          onClick={accept}
          disabled={busy}
          style={{
            width: "100%", padding: "15px", borderRadius: 100,
            background: "#02d1ba", color: "#050505",
            border: "none", fontSize: 14, fontWeight: 800, letterSpacing: 0.5,
            cursor: busy ? "wait" : "pointer", opacity: busy ? 0.6 : 1,
            boxShadow: "0 8px 24px rgba(2,209,186,0.3)",
            fontFamily: "inherit",
          }}
        >
          {busy ? "Activation…" : "Activer les notifications"}
        </button>
        <button
          onClick={() => dismiss(true)}
          style={{
            width: "100%", padding: "13px", marginTop: 10,
            background: "transparent", color: "rgba(255,255,255,0.5)",
            border: "none", fontSize: 13, fontWeight: 600,
            cursor: "pointer", fontFamily: "inherit",
          }}
        >
          Plus tard
        </button>
      </div>
    </div>
  );
}

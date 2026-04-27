import React from "react";
import AppIcon from "./AppIcon";
import haptic from "../lib/haptic";
import { useT } from "../lib/i18n";

const G = "#02d1ba";
const ORANGE = "#f97316";
const SALES_URL = "https://rbperform.app";

/**
 * SubscribePage — ecran qui invite a s'abonner sur le site de vente.
 * Aucun paiement n'est traite dans l'app : tout se passe sur rbperform.app.
 *
 * Cas d'usage :
 *   - Client non-connecte qui arrive sur l'app (pas encore abonne)
 *   - Client existant dont l'abonnement a expire et qui veut renouveler
 *
 * Props:
 *   client?      - le client actuel (si connecte, utilise pour pre-remplir email)
 *   onClose?     - si fourni, affiche un bouton "Retour" en haut
 *   onLogin?     - callback pour ouvrir l'ecran de login
 */
export default function SubscribePage({ client = null, onClose, onLogin }) {
  const t = useT();
  const email = client?.email || "";

  const openSalesSite = () => {
    haptic.medium();
    // Pre-remplit l'email si connecte (le site de vente peut le lire via ?email=)
    const url = email ? `${SALES_URL}/?email=${encodeURIComponent(email)}` : SALES_URL;
    // target=_blank + noopener : le site de vente s'ouvre en onglet externe,
    // l'app reste ouverte derriere pour une experience fluide au retour
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div
      role="dialog"
      aria-modal={!!onClose}
      aria-labelledby="subscribe-title"
      style={{
        position: onClose ? "fixed" : "relative",
        inset: onClose ? 0 : "auto",
        minHeight: "100vh",
        zIndex: onClose ? 300 : "auto",
        background: "#050505",
        overflowY: "auto",
        WebkitOverflowScrolling: "touch",
        fontFamily: "-apple-system, Inter, sans-serif",
        color: "#fff",
      }}
    >
      {/* Ambient glow */}
      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          top: "-20%",
          left: "50%",
          transform: "translateX(-50%)",
          width: 700,
          height: 700,
          background: `radial-gradient(ellipse at center, rgba(2,209,186,0.1), transparent 60%)`,
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      <div style={{ position: "relative", zIndex: 1, maxWidth: 520, margin: "0 auto", padding: "calc(env(safe-area-inset-top, 16px) + 24px) 24px calc(env(safe-area-inset-bottom, 16px) + 80px)" }}>
        {/* Back button */}
        {onClose && (
          <button
            onClick={() => { haptic.light(); onClose(); }}
            aria-label={t("sp.aria_back")}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              background: "none", border: "none",
              color: "rgba(255,255,255,0.4)",
              fontSize: 12, fontWeight: 600,
              cursor: "pointer", padding: 0, marginBottom: 24,
              fontFamily: "inherit",
            }}
          >
            <AppIcon name="arrow-left" size={12} color="rgba(255,255,255,0.5)" />
            {t("sp.btn_back")}
          </button>
        )}

        {/* Hero */}
        <div style={{ textAlign: "center", marginTop: 24, marginBottom: 40, animation: "subscribeFade 0.5s ease both" }}>
          <style>{`
            @keyframes subscribeFade { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
            @keyframes glow { 0%, 100% { box-shadow: 0 0 40px rgba(2,209,186,0.25); } 50% { box-shadow: 0 0 60px rgba(2,209,186,0.4); } }
          `}</style>

          {/* Logo / icon premium */}
          <div
            style={{
              width: 76, height: 76,
              margin: "0 auto 24px",
              borderRadius: 22,
              background: `linear-gradient(135deg, ${G}, #01a89a)`,
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              color: "#000",
              animation: "glow 3s ease-in-out infinite",
            }}
          >
            <AppIcon name="sparkles" size={36} color="#000" strokeWidth={2} />
          </div>

          <div style={{ fontSize: 11, letterSpacing: "4px", textTransform: "uppercase", color: `${G}cc`, fontWeight: 700, marginBottom: 12 }}>
            {t("sp.eyebrow")}
          </div>

          <h1
            id="subscribe-title"
            style={{
              fontSize: 38,
              fontWeight: 900,
              color: "#fff",
              letterSpacing: "-1.8px",
              lineHeight: 1.05,
              margin: "0 0 16px",
            }}
          >
            {t("sp.title_p1")}<br />
            <span style={{ color: G }}>{t("sp.title_p2")}</span>
          </h1>

          <p style={{ fontSize: 15, color: "rgba(255,255,255,0.55)", lineHeight: 1.55, margin: "0 auto", maxWidth: 400 }}>
            {t("sp.subtitle")}
          </p>
        </div>

        {/* Valeur proposee */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 32, animation: "subscribeFade 0.5s ease 0.1s both" }}>
          {[
            { icon: "dumbbell", title: t("sp.feat1_title"), desc: t("sp.feat1_desc") },
            { icon: "activity", title: t("sp.feat2_title"), desc: t("sp.feat2_desc") },
            { icon: "message", title: t("sp.feat3_title"), desc: t("sp.feat3_desc") },
            { icon: "trophy", title: t("sp.feat4_title"), desc: t("sp.feat4_desc") },
          ].map((item, i) => (
            <div
              key={i}
              style={{
                display: "flex", alignItems: "flex-start", gap: 14,
                padding: "14px 16px",
                background: "rgba(255,255,255,0.025)",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: 14,
              }}
            >
              <div style={{
                width: 38, height: 38, borderRadius: 10,
                background: `${G}15`,
                display: "flex", alignItems: "center", justifyContent: "center",
                color: G, flexShrink: 0,
              }}>
                <AppIcon name={item.icon} size={18} color={G} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", marginBottom: 3, letterSpacing: "-0.2px" }}>
                  {item.title}
                </div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", lineHeight: 1.55 }}>
                  {item.desc}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA principal : redirect vers site de vente */}
        <div style={{ animation: "subscribeFade 0.5s ease 0.2s both" }}>
          <button
            onClick={openSalesSite}
            className="ripple"
            style={{
              width: "100%",
              padding: "18px 24px",
              background: `linear-gradient(135deg, ${G}, #01a89a)`,
              border: "none",
              borderRadius: 16,
              color: "#000",
              fontSize: 15,
              fontWeight: 800,
              letterSpacing: "0.3px",
              cursor: "pointer",
              fontFamily: "inherit",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
              boxShadow: "0 10px 30px rgba(2,209,186,0.35)",
              textTransform: "uppercase",
              minHeight: 56,
            }}
          >
            {t("sp.btn_subscribe")}
            <AppIcon name="arrow-right" size={16} color="#000" strokeWidth={2.5} />
          </button>

          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", textAlign: "center", marginTop: 14, lineHeight: 1.5 }}>
            {t("sp.payment_secure_p1")}
            <br />
            {t("sp.payment_secure_p2")}
          </div>
        </div>

        {/* Login fallback (si non-connecte) */}
        {onLogin && !client && (
          <div style={{ textAlign: "center", marginTop: 32, paddingTop: 24, borderTop: "1px solid rgba(255,255,255,0.05)", animation: "subscribeFade 0.5s ease 0.3s both" }}>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 12 }}>
              {t("sp.already_subscribed")}
            </div>
            <button
              onClick={() => { haptic.light(); onLogin(); }}
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 12,
                padding: "11px 22px",
                color: "#fff",
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "inherit",
                letterSpacing: "0.3px",
                minHeight: 44,
              }}
            >
              {t("sp.btn_login")}
            </button>
          </div>
        )}

        {/* Footer legal */}
        <div style={{ marginTop: 32, fontSize: 10, color: "rgba(255,255,255,0.25)", textAlign: "center", lineHeight: 1.7 }}>
          <div>{t("sp.footer_address")}</div>
          <div style={{ marginTop: 2 }}>
            <a href={SALES_URL} target="_blank" rel="noopener noreferrer" style={{ color: "rgba(255,255,255,0.4)", textDecoration: "none" }}>
              rbperform.app
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

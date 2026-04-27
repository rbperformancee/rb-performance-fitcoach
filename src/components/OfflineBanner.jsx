import React, { useEffect, useState } from "react";
import AppIcon from "./AppIcon";
import { useT } from "../lib/i18n";

/**
 * OfflineBanner — indicateur discret en haut de l'ecran quand offline.
 * Se montre avec animation fadeIn quand navigator.onLine = false,
 * se retire quand on recupere la connexion.
 */
export default function OfflineBanner() {
  const t = useT();
  const [isOffline, setIsOffline] = useState(
    typeof navigator !== "undefined" ? !navigator.onLine : false
  );

  useEffect(() => {
    const on = () => setIsOffline(false);
    const off = () => setIsOffline(true);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: "fixed",
        top: "calc(env(safe-area-inset-top, 0px) + 8px)",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 9998,
        background: "rgba(239,68,68,0.95)",
        color: "#fff",
        padding: "8px 16px",
        borderRadius: 100,
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: "0.5px",
        boxShadow: "0 8px 24px rgba(239,68,68,0.35)",
        display: "flex",
        alignItems: "center",
        gap: 8,
        animation: "offFade 0.3s ease both",
        fontFamily: "-apple-system,Inter,sans-serif",
      }}
    >
      <style>{`@keyframes offFade{from{opacity:0;transform:translate(-50%,-8px)}to{opacity:1;transform:translate(-50%,0)}}`}</style>
      <AppIcon name="alert" size={13} color="#fff" strokeWidth={2.2} />
      {t("ob.offline")}
    </div>
  );
}

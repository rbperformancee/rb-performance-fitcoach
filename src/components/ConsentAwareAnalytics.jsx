import React, { useEffect, useState } from "react";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";

/**
 * ConsentAwareAnalytics
 * Charge Vercel Analytics + Speed Insights UNIQUEMENT si l'utilisateur
 * a accepte la categorie "analytics" du consent banner (RGPD).
 *
 * Lit `localStorage.rb_consent` (format: { necessary, analytics, marketing,
 * version, timestamp }) et ecoute l'event `rb:consent` emis par
 * `/cookie-consent.js` quand le user save ses choix.
 */
export default function ConsentAwareAnalytics() {
  const [allowed, setAllowed] = useState(() => {
    try {
      const c = JSON.parse(localStorage.getItem("rb_consent") || "{}");
      return c.analytics === true;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const handler = (e) => setAllowed(e.detail?.analytics === true);
    window.addEventListener("rb:consent", handler);
    return () => window.removeEventListener("rb:consent", handler);
  }, []);

  if (!allowed) return null;

  return (
    <>
      <Analytics />
      <SpeedInsights />
    </>
  );
}

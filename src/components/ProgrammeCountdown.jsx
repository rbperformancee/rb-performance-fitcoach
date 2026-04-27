import React, { useState, useEffect } from "react";
import { useT, getLocale } from "../lib/i18n";

const G = "#02d1ba";
const intlLocale = () => (getLocale() === "en" ? "en-US" : "fr-FR");
const fillTpl = (s, vars) => {
  let out = s;
  Object.entries(vars).forEach(([k, v]) => { out = out.split(`{${k}}`).join(String(v)); });
  return out;
};

const PHRASES = [
  "La discipline est la cle du succes.",
  "Chaque jour te rapproche de qui tu veux etre.",
  "Le corps accomplit ce que l'esprit croit possible.",
  "Tu ne seras jamais plus motive qu'aujourd'hui. Profite.",
  "Les champions ne sont pas nes. Ils se construisent.",
  "Un jour tu seras content d'avoir continue.",
  "La douleur d'aujourd'hui est la force de demain.",
  "Zero excuse. Maximum resultat.",
  "Le talent te fait entrer. Le travail te fait rester.",
  "Sois plus fort que ton excuse la plus forte.",
  "Le succes est la somme de petits efforts repetes chaque jour.",
  "Ton seul adversaire, c'est toi hier.",
  "Commence la ou tu es. Utilise ce que tu as.",
  "La constance bat le talent quand le talent manque de constance.",
  "Le meilleur moment pour commencer, c'etait hier. Le deuxieme meilleur, c'est maintenant.",
  "Ne compte pas les jours. Fais que les jours comptent.",
  "La sueur d'aujourd'hui est le sourire de demain.",
  "Pas de raccourci. Que du travail.",
  "Tu es a une seance de ta meilleure humeur.",
  "Ceux qui durent, ce sont ceux qui recommencent.",
  "Ton programme est pret. Et toi ?",
  "La transformation commence dans la tete.",
  "Chaque repetition ecrit ton histoire.",
  "Le fer ne ment pas. 80kg, c'est 80kg.",
  "Tu n'as pas besoin de motivation. Tu as besoin de discipline.",
  "Les resultats arrivent a ceux qui n'arretent pas.",
  "Pas de repos pour ceux qui veulent l'excellence.",
  "Ton coach croit en toi. A ton tour.",
  "La seule limite, c'est celle que tu t'imposes.",
  "Dans 3 mois tu te remercieras d'avoir commence aujourd'hui.",
];

function getPhrase() {
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
  return PHRASES[dayOfYear % PHRASES.length];
}

function pad(n) { return String(n).padStart(2, "0"); }

export default function ProgrammeCountdown({ programme }) {
  const t = useT();
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const target = new Date(programme.programme_start_date).getTime();
  const diff = Math.max(0, target - now);
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  const secs = Math.floor((diff % 60000) / 1000);

  if (diff <= 0) {
    // Le countdown est termine — le parent devrait re-render et montrer le programme
    return null;
  }

  return (
    <div style={{ minHeight: "100vh", background: "#050505", fontFamily: "-apple-system,Inter,sans-serif", color: "#fff", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, position: "relative", overflow: "hidden" }}>
      <style>{`
        @keyframes cdPulse{0%,100%{opacity:0.7}50%{opacity:1}}
        @keyframes cdFade{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
      `}</style>

      {/* Ambient */}
      <div style={{ position: "fixed", top: "-10%", left: "50%", transform: "translateX(-50%)", width: 600, height: 600, background: "radial-gradient(circle, rgba(2,209,186,0.15), transparent 65%)", borderRadius: "50%", filter: "blur(80px)", pointerEvents: "none" }} />

      <div style={{ position: "relative", zIndex: 1, textAlign: "center", maxWidth: 420 }}>
        {/* Eyebrow */}
        <div style={{ fontSize: 10, letterSpacing: "5px", textTransform: "uppercase", color: "rgba(2,209,186,0.6)", marginBottom: 20, fontWeight: 700, animation: "cdFade 0.6s ease both" }}>
          {programme.programme_name || t("pc.programme_fallback")}
        </div>

        {/* Titre */}
        <h1 style={{ fontSize: 32, fontWeight: 900, letterSpacing: "-1.5px", lineHeight: 1, marginBottom: 28, animation: "cdFade 0.6s ease 0.1s both" }}>
          {t("pc.title_p1")}<br />{t("pc.title_p2")}<span style={{ color: G }}>.</span>
        </h1>

        {/* Countdown boxes */}
        <div style={{ display: "flex", justifyContent: "center", gap: 12, marginBottom: 36, animation: "cdFade 0.6s ease 0.2s both" }}>
          {[
            { v: pad(days), l: t("pc.unit_days") },
            { v: pad(hours), l: t("pc.unit_hours") },
            { v: pad(mins), l: t("pc.unit_min") },
            { v: pad(secs), l: t("pc.unit_sec") },
          ].map((u, i) => (
            <div key={i} style={{
              background: "rgba(2,209,186,0.06)",
              border: "1px solid rgba(2,209,186,0.2)",
              borderRadius: 16,
              padding: "18px 14px 14px",
              width: 75,
              textAlign: "center",
            }}>
              <div style={{
                fontFamily: "'JetBrains Mono',monospace",
                fontSize: 34,
                fontWeight: 200,
                color: G,
                letterSpacing: "-2px",
                lineHeight: 1,
                animation: u.l === t("pc.unit_sec") ? "cdPulse 1s ease-in-out infinite" : "none",
              }}>
                {u.v}
              </div>
              <div style={{ fontSize: 8, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "2px", fontWeight: 700, marginTop: 8 }}>
                {u.l}
              </div>
            </div>
          ))}
        </div>

        {/* Date cible */}
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 32, animation: "cdFade 0.6s ease 0.3s both" }}>
          {fillTpl(t("pc.available_on"), {
            date: new Date(target).toLocaleDateString(intlLocale(), { weekday: "long", day: "numeric", month: "long" }),
            time: new Date(target).toLocaleTimeString(intlLocale(), { hour: "2-digit", minute: "2-digit" }),
          })}
        </div>

        {/* Phrase du jour */}
        <div style={{
          fontSize: 15,
          fontStyle: "italic",
          color: "rgba(255,255,255,0.5)",
          lineHeight: 1.6,
          maxWidth: 340,
          marginLeft: "auto",
          marginRight: "auto",
          padding: "20px 24px",
          background: "rgba(255,255,255,0.02)",
          border: "1px solid rgba(255,255,255,0.05)",
          borderRadius: 16,
          animation: "cdFade 0.6s ease 0.4s both",
        }}>
          "{getPhrase()}"
          <div style={{ fontSize: 9, color: "rgba(2,209,186,0.5)", marginTop: 8, fontStyle: "normal", letterSpacing: "3px", textTransform: "uppercase", fontWeight: 700 }}>
            {t("pc.phrase_label")}
          </div>
        </div>
      </div>
    </div>
  );
}

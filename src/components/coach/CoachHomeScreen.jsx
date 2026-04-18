import React from "react";

const G = "#02d1ba";

/**
 * CoachHomeScreen — écran d'accueil CEO du coach.
 * Première image de l'app. Plein écran immersif.
 * Tap n'importe où → passe au dashboard.
 *
 * Props:
 *   coachData: { full_name, brand_name }
 *   businessScore: number
 *   mrr: number
 *   clients: array
 *   urgentCount: number
 *   onDismiss: () => void
 */
export default function CoachHomeScreen({ coachData, businessScore = 0, mrr = 0, clients = [], urgentCount = 0, onDismiss }) {
  const h = new Date().getHours();
  const firstName = coachData?.full_name?.split(" ")[0] || "Coach";
  const now = new Date();
  const time = String(now.getHours()).padStart(2, "0") + ":" + String(now.getMinutes()).padStart(2, "0");
  const days = ["DIM", "LUN", "MAR", "MER", "JEU", "VEN", "SAM"];
  const months = ["JAN", "FEV", "MAR", "AVR", "MAI", "JUN", "JUL", "AOU", "SEP", "OCT", "NOV", "DEC"];
  const total = clients.length;
  const active = clients.filter(c => c.subscription_status === "active").length;
  const retention = total > 0 ? Math.round((active / total) * 100) : 0;
  const arr = Math.round(mrr * 12);

  // Citations CEO
  const quotes = [
    "LE BUSINESS NE MENT PAS. LES CHIFFRES PARLENT.",
    "CHAQUE CLIENT SAUVÉ EST UN CLIENT GAGNÉ DEUX FOIS.",
    "LA RÉTENTION EST LE NOUVEAU GROWTH.",
    "UN COACH QUI PILOTE SON MRR PILOTE SA VIE.",
    "TU N'ES PAS JUSTE UN COACH. TU ES UN CEO.",
    "LES MEILLEURS NE COACHENT PAS PLUS. ILS COACHENT MIEUX.",
    "TON SCORE BUSINESS EST TON REFLET. PAS TON EFFORT.",
  ];
  const quote = quotes[now.getDay() % quotes.length];

  // Message contextuel
  const getCtx = () => {
    if (urgentCount > 0) return { title: `${urgentCount} client${urgentCount > 1 ? "s" : ""} à risque.`, sub: "Ouvre ton dashboard. Agis maintenant.", color: "#ff6b6b" };
    if (businessScore >= 80) return { title: "Tout est sous contrôle.", sub: "Ton business tourne. Continue.", color: G };
    if (businessScore >= 60) return { title: "Ton business avance.", sub: "Quelques ajustements et tu passes au niveau supérieur.", color: "#fff" };
    if (businessScore >= 40) return { title: "Attention requise.", sub: "Ta rétention baisse. Il est temps d'agir.", color: "#f97316" };
    if (h < 6) return { title: "On grind.", sub: "Personne ne bosse à cette heure. Sauf toi.", color: G };
    if (h < 12) return { title: "La journée t'appartient.", sub: "Ouvre ton dashboard. Pilote.", color: "#fff" };
    if (h < 18) return { title: "Check tes chiffres.", sub: "Tu sais exactement où tu en es ?", color: "#fff" };
    if (h < 22) return { title: "Fin de journée.", sub: "Regarde ton score. Tu mérites de savoir.", color: "#fff" };
    return { title: "Late session.", sub: "Les meilleurs bossent quand les autres dorment.", color: G };
  };
  const ctx = getCtx();

  const dash = 2 * Math.PI * 40;
  const scoreOffset = dash * (1 - businessScore / 100);

  return (
    <div
      onClick={onDismiss}
      style={{
        position: "fixed", inset: 0, zIndex: 100,
        background: "#050505",
        display: "flex", flexDirection: "column",
        fontFamily: "'Inter', -apple-system, system-ui, sans-serif",
        cursor: "pointer", overflow: "hidden",
        animation: "chsFadeIn 0.5s ease both",
      }}
    >
      <style>{`
        @keyframes chsFadeIn{from{opacity:0}to{opacity:1}}
        @keyframes chsFadeOut{from{opacity:1}to{opacity:0;pointer-events:none}}
        @keyframes chsSlideUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
        @keyframes chsPulse{0%,100%{opacity:0.4;transform:scale(1)}50%{opacity:0.7;transform:scale(1.15)}}
        @keyframes chsGlow{0%,100%{filter:drop-shadow(0 0 8px rgba(2,209,186,0.5))}50%{filter:drop-shadow(0 0 20px rgba(2,209,186,0.8))}}
      `}</style>

      {/* Ambient glow */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "55%", background: "radial-gradient(ellipse at 50% -10%, rgba(2,209,186,0.12) 0%, transparent 60%)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "30%", background: "radial-gradient(ellipse at 50% 120%, rgba(2,209,186,0.04) 0%, transparent 60%)", pointerEvents: "none" }} />

      {/* TOP — date + heure + score ring */}
      <div style={{ padding: "calc(env(safe-area-inset-top, 44px) + 16px) 28px 0", display: "flex", justifyContent: "space-between", alignItems: "flex-start", position: "relative", zIndex: 2, animation: "chsSlideUp 0.6s ease 0.1s both" }}>
        <div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", fontWeight: 600, letterSpacing: "3px", textTransform: "uppercase", marginBottom: 14 }}>
            {days[now.getDay()]} · {now.getDate()} {months[now.getMonth()]}
          </div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", fontWeight: 400, letterSpacing: "1px", marginBottom: 8 }}>
            {h < 6 ? "On grind" : h < 12 ? "Bonjour" : h < 18 ? "Bon après-midi" : h < 22 ? "Bonsoir" : "Late session"}
          </div>
          <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: "clamp(40px, 11vw, 72px)", fontWeight: 900, letterSpacing: "-0.04em", lineHeight: 0.95, color: "#fff", margin: 0, wordBreak: "break-word", maxWidth: "55vw" }}>
            {firstName}<span style={{ color: G }}>.</span>
          </h1>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 42, fontWeight: 400, color: "rgba(255,255,255,0.8)", letterSpacing: "-1px", lineHeight: 1 }}>
            {time}
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
            <div style={{ position: "relative", width: 56, height: 56 }}>
              <svg width="56" height="56" viewBox="0 0 100 100" style={{ transform: "rotate(-90deg)", animation: "chsGlow 3s ease-in-out infinite" }}>
                <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="7" />
                <circle cx="50" cy="50" r="40" fill="none" stroke={G} strokeWidth="7" strokeLinecap="round"
                  strokeDasharray={dash} strokeDashoffset={scoreOffset}
                  style={{ transition: "stroke-dashoffset 1.5s cubic-bezier(0.16,1,0.3,1)" }} />
              </svg>
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Bebas Neue',sans-serif", fontSize: 16, fontWeight: 400, color: G }}>{businessScore}</div>
            </div>
          </div>
        </div>
      </div>

      {/* CITATION CEO */}
      <div style={{ padding: "40px 28px 0", position: "relative", zIndex: 2, animation: "chsSlideUp 0.7s ease 0.25s both" }}>
        <div style={{ fontSize: 10, color: `${G}60`, fontWeight: 800, letterSpacing: "4px", textTransform: "uppercase", marginBottom: 16 }}>Mindset du jour</div>
        <div style={{ fontFamily: "'Syne', sans-serif", fontSize: "clamp(18px, 5vw, 24px)", fontWeight: 900, color: "rgba(255,255,255,0.88)", lineHeight: 1.35, letterSpacing: "-0.3px" }}>
          {quote.split(" ").map((word, i) => (
            <span key={i} style={{ color: i === 0 ? G : "rgba(255,255,255,0.85)", marginRight: 6, display: "inline-block" }}>{word}</span>
          ))}
        </div>
      </div>

      {/* DIVIDER */}
      <div style={{ margin: "32px 28px 0", height: 1, background: `linear-gradient(90deg, ${G}40, rgba(255,255,255,0.04))`, position: "relative", zIndex: 2, animation: "chsSlideUp 0.6s ease 0.35s both" }} />

      {/* MESSAGE CONTEXTUEL */}
      <div style={{ padding: "28px 28px 0", position: "relative", zIndex: 2, animation: "chsSlideUp 0.7s ease 0.4s both" }}>
        <div style={{ fontSize: "clamp(22px, 6vw, 32px)", fontWeight: 900, color: ctx.color, letterSpacing: "-0.5px", lineHeight: 1.1, marginBottom: 6 }}>
          {ctx.title}
        </div>
        <div style={{ fontSize: 14, color: "rgba(255,255,255,0.35)", lineHeight: 1.5 }}>
          {ctx.sub}
        </div>
      </div>

      {/* 3 STATS */}
      <div style={{ display: "flex", gap: 0, margin: "auto 28px 0", padding: "0 0 20px", borderTop: "1px solid rgba(255,255,255,0.04)", position: "relative", zIndex: 2, animation: "chsSlideUp 0.7s ease 0.5s both" }}>
        {[
          { v: total, l: "CLIENTS", color: "#fff" },
          { v: mrr.toLocaleString("fr-FR") + "€", l: "MRR", color: G },
          { v: retention + "%", l: "RÉTENTION", color: retention > 80 ? G : retention > 50 ? "#fff" : "#ff6b6b" },
        ].map((s, i) => (
          <div key={i} style={{ flex: 1, paddingTop: 20, textAlign: i === 0 ? "left" : i === 2 ? "right" : "center" }}>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "clamp(28px, 7vw, 42px)", color: s.color, lineHeight: 1, letterSpacing: "-1px" }}>{s.v}</div>
            <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", color: "rgba(255,255,255,0.2)", marginTop: 6 }}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* CTA DISCRET */}
      <div style={{ textAlign: "center", padding: "0 28px calc(env(safe-area-inset-bottom, 0px) + 24px)", position: "relative", zIndex: 2, animation: "chsSlideUp 0.6s ease 0.65s both" }}>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.12)", letterSpacing: "2px", textTransform: "uppercase", fontWeight: 600 }}>
          Tap pour ouvrir ton dashboard
        </div>
      </div>
    </div>
  );
}

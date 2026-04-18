import React from "react";

const G = "#02d1ba";

export default function CoachHomeScreen({ coachData, businessScore = 0, mrr = 0, clients = [], urgentCount = 0, onDismiss, onNavigate }) {
  const _h = new Date().getHours();
  const _g = _h < 12 ? "Bonjour" : _h < 18 ? "Bon apres-midi" : "Bonsoir";
  const _fn = coachData?.full_name?.split(" ")[0] || "Coach";
  const _now = new Date();
  const _time = String(_now.getHours()).padStart(2, "0") + ":" + String(_now.getMinutes()).padStart(2, "0");
  const _days = ["DIM", "LUN", "MAR", "MER", "JEU", "VEN", "SAM"];
  const _months = ["JAN", "FEV", "MAR", "AVR", "MAI", "JUN", "JUL", "AOU", "SEP", "OCT", "NOV", "DEC"];

  const total = clients.length;
  const active = clients.filter(c => c.subscription_status === "active").length;
  const retention = total > 0 ? Math.round((active / total) * 100) : 0;

  const _quotes = [
    "LE BUSINESS NE MENT PAS. LES CHIFFRES PARLENT.",
    "CHAQUE CLIENT SAUVE EST UN CLIENT GAGNE DEUX FOIS.",
    "LA RETENTION EST LE NOUVEAU GROWTH.",
    "UN COACH QUI PILOTE SON MRR PILOTE SA VIE.",
    "TU N ES PAS JUSTE UN COACH. TU ES UN CEO.",
    "LES MEILLEURS NE COACHENT PAS PLUS. ILS COACHENT MIEUX.",
    "TON SCORE BUSINESS EST TON REFLET.",
  ];
  const _q = _quotes[_now.getDay() % _quotes.length];

  const _dash = 2 * Math.PI * 40;

  // Message contextuel
  const getCtx = () => {
    if (urgentCount > 0) return { title: `${urgentCount} client${urgentCount > 1 ? "s" : ""} a risque.`, sub: "Ouvre ton dashboard. Agis maintenant.", color: "#ff6b6b" };
    if (businessScore >= 80) return { title: "Tout est sous controle.", sub: "Ton business tourne. Continue.", color: G };
    if (businessScore >= 60) return { title: "Ton business avance.", sub: "Quelques ajustements pour passer au niveau superieur.", color: "#fff" };
    if (businessScore >= 40) return { title: "Attention requise.", sub: "Ta retention baisse. Il est temps d agir.", color: "#f97316" };
    if (_h < 6) return { title: "On grind.", sub: "Personne ne bosse a cette heure. Sauf toi.", color: G };
    if (_h < 12) return { title: "La journee t appartient.", sub: "Ouvre ton dashboard. Pilote.", color: "#fff" };
    if (_h < 18) return { title: "Check tes chiffres.", sub: "Tu sais exactement ou tu en es ?", color: "#fff" };
    return { title: "Late session.", sub: "Les meilleurs bossent quand les autres dorment.", color: G };
  };
  const _ctx = getCtx();

  return (
    <div onClick={onDismiss} style={{ minHeight: "100vh", minHeight: "100dvh", background: "#050505", display: "flex", flexDirection: "column", fontFamily: "-apple-system,Inter,sans-serif", position: "fixed", inset: 0, zIndex: 100, overflow: "hidden", cursor: "pointer" }}>

      {/* Particules d'ambiance */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "60%", background: "radial-gradient(ellipse at 50% -10%, rgba(2,209,186,0.15) 0%, transparent 60%)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "40%", background: "radial-gradient(ellipse at 50% 120%, rgba(2,209,186,0.06) 0%, transparent 60%)", pointerEvents: "none" }} />

      {/* TOP BAR — date + heure Tesla style */}
      <div style={{ padding: "calc(env(safe-area-inset-top, 44px) + 12px) 28px 0", display: "flex", justifyContent: "space-between", alignItems: "flex-start", position: "relative", zIndex: 2, gap: 8 }}>
        <div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", fontWeight: 600, letterSpacing: "3px", textTransform: "uppercase", marginBottom: 12 }}>{_days[_now.getDay()]} · {_now.getDate()} {_months[_now.getMonth()]}</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", fontWeight: 400, letterSpacing: "1px", marginBottom: 6 }}>{_g}</div>
          <div style={{ fontSize: 44, fontWeight: 800, color: "#ffffff", letterSpacing: "-2px", lineHeight: 1, wordBreak: "break-word", maxWidth: "54vw" }}>{_fn}<span style={{ color: G }}>.</span></div>
        </div>

        {/* Anneau Tesla + heure Apple */}
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 38, fontWeight: 100, color: "rgba(255,255,255,0.8)", letterSpacing: "-2px", fontVariantNumeric: "tabular-nums", lineHeight: 1, flexShrink: 0 }}>{_time}</div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
            <div style={{ position: "relative", width: 52, height: 52 }}>
              <svg width="52" height="52" viewBox="0 0 100 100" style={{ transform: "rotate(-90deg)" }}>
                <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
                <circle cx="50" cy="50" r="40" fill="none" stroke={G} strokeWidth="8" strokeLinecap="round"
                  strokeDasharray={_dash} strokeDashoffset={_dash * (1 - businessScore / 100)}
                  style={{ filter: "drop-shadow(0 0 6px rgba(2,209,186,0.8))" }} />
              </svg>
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: G }}>{businessScore}</div>
            </div>
          </div>
        </div>
      </div>

      {/* CITATION CEO */}
      <div style={{ padding: "36px 28px 0", position: "relative", zIndex: 2 }}>
        <div style={{ fontSize: 11, color: "rgba(2,209,186,0.5)", fontWeight: 700, letterSpacing: "4px", textTransform: "uppercase", marginBottom: 16 }}>Mindset du jour</div>
        <div style={{ fontSize: 22, fontWeight: 900, color: "rgba(255,255,255,0.92)", lineHeight: 1.35, letterSpacing: "-0.3px" }}>
          {_q.split(" ").map((word, i) => (
            <span key={i} style={{ color: i === 0 ? G : "rgba(255,255,255,0.9)", marginRight: "6px", display: "inline-block" }}>{word}</span>
          ))}
        </div>
      </div>

      {/* DIVIDER */}
      <div style={{ margin: "28px 28px 0", height: "1px", background: "linear-gradient(90deg, rgba(2,209,186,0.3) 0%, rgba(255,255,255,0.05) 100%)", position: "relative", zIndex: 2 }} />

      {/* MESSAGE CONTEXTUEL */}
      <div style={{ padding: "24px 28px 0", position: "relative", zIndex: 2 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", fontWeight: 600, letterSpacing: "3px", textTransform: "uppercase" }}>Situation</div>
          {urgentCount > 0 && (
            <span style={{ fontSize: 10, color: "#ff6b6b", background: "rgba(255,107,107,0.1)", border: "1px solid rgba(255,107,107,0.2)", borderRadius: 20, padding: "3px 10px", fontWeight: 600 }}>{urgentCount} URGENT{urgentCount > 1 ? "S" : ""}</span>
          )}
        </div>
        <div style={{ fontSize: 30, fontWeight: 800, color: _ctx.color, letterSpacing: "-1px" }}>{_ctx.title}</div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", lineHeight: 1.6, marginTop: 6 }}>{_ctx.sub}</div>
      </div>

      {/* STATS */}
      <div style={{ padding: "24px 28px 0", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, position: "relative", zIndex: 2 }}>
        {[
          { label: "Clients", value: total, color: "#fff" },
          { label: "MRR", value: mrr.toLocaleString("fr-FR") + "€", color: G },
          { label: "Retention", value: retention + "%", color: retention > 80 ? G : retention > 50 ? "rgba(255,255,255,0.5)" : "#ff6b6b" },
        ].map((s, i) => (
          <div key={i} style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 14 }}>
            <div style={{ fontSize: 32, fontWeight: 200, color: s.color, letterSpacing: "-1.5px", lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 9, color: "rgba(255,255,255,0.2)", fontWeight: 600, letterSpacing: "2px", textTransform: "uppercase", marginTop: 6 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ flex: 1, minHeight: 20 }} />

      {/* FLOATING PILL — identique au client */}
      <nav onClick={(e) => e.stopPropagation()} style={{ position: "fixed", bottom: "calc(env(safe-area-inset-bottom, 0px) + 28px)", left: "50%", transform: "translateX(-50%)", display: "flex", gap: 0, background: "rgba(15,15,15,0.75)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 100, padding: 5, zIndex: 101, backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)" }}>
        {[
          { id: "overview", icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ width: 20, height: 20 }}><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>, active: true },
          { id: "clients", icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ width: 20, height: 20 }}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /></svg> },
          { id: "programmes", icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ width: 20, height: 20 }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg> },
          { id: "business", icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ width: 20, height: 20 }}><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></svg> },
          { id: "more", icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ width: 20, height: 20 }}><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg> },
        ].map(tab => (
          <button key={tab.id} onClick={() => { onDismiss(); if (onNavigate) onNavigate(tab.id); }} style={{ width: 50, height: 50, borderRadius: 100, border: "none", background: tab.active ? G : "transparent", color: tab.active ? "#000" : "rgba(255,255,255,0.35)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "all 0.25s cubic-bezier(0.22,1,0.36,1)" }}>
            {tab.icon}
          </button>
        ))}
      </nav>
    </div>
  );
}

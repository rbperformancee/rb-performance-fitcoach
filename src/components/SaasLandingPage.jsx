import React, { useState, lazy, Suspense } from "react";
import { LOGO_B64 } from "../utils/logo";

// HeroBackground charge en lazy pour eviter d'alourdir le bundle principal
// avec three.js (~150kb). Fallback : rien, la hero reste lisible sans WebGL.
const HeroBackground = lazy(() => import("./HeroBackground"));

const G = "#02d1ba";
const GOLD = "#f5c842";

const FEATURES = [
  { title: "Dashboard coach premium", desc: "Vue d'ensemble de tous tes clients en temps reel. Score business, MRR, retention, alertes — tout sur un ecran.", icon: "chart" },
  { title: "Fiche client complete", desc: "Poids, nutrition, pas, sommeil, seances, RPE, progression — tu vois TOUT sur chaque athlete sans rien demander.", icon: "users" },
  { title: "Scanner code-barre", desc: "Tes clients scannent n'importe quel produit et les macros sont loguees automatiquement. Base de 3M+ produits.", icon: "scan" },
  { title: "IA Vocal nutrition", desc: "Ton client dit 'un bol de pates au saumon' et l'IA analyse les macros en 2 secondes. Precision CIQUAL.", icon: "mic" },
  { title: "Gestion abonnements", desc: "Dates de debut, duree, expiration, alertes renouvellement. Tu sais exactement ou en est chaque client.", icon: "calendar" },
  { title: "Messages en temps reel", desc: "Chat integre coach-client. Tes messages arrivent directement dans l'app de ton client.", icon: "message" },
  { title: "Programmes personnalises", desc: "Upload tes programmes HTML. Chaque client recoit son programme unique avec suivi de progression.", icon: "doc" },
  { title: "White label", desc: "Ton nom, ta marque, ta couleur. Tes clients voient TON branding, pas le notre.", icon: "brand" },
];

const STATS = [
  { value: "456", label: "Aliments dans la base locale" },
  { value: "3M+", label: "Produits scannables" },
  { value: "21", label: "Tables de donnees client" },
  { value: "<2s", label: "Analyse IA repas" },
];

function Ic({ name, size = 24 }) {
  const p = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round", strokeLinejoin: "round" };
  const m = {
    chart: <svg {...p}><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>,
    users: <svg {...p}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>,
    scan: <svg {...p}><path d="M3 7V5a2 2 0 012-2h2M17 3h2a2 2 0 012 2v2M21 17v2a2 2 0 01-2 2h-2M7 21H5a2 2 0 01-2-2v-2" /><line x1="7" y1="12" x2="17" y2="12" /></svg>,
    mic: <svg {...p}><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" /><path d="M19 10v2a7 7 0 01-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /></svg>,
    calendar: <svg {...p}><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>,
    message: <svg {...p}><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg>,
    doc: <svg {...p}><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>,
    brand: <svg {...p}><circle cx="12" cy="12" r="10" /><path d="M8 14s1.5 2 4 2 4-2 4-2" /><line x1="9" y1="9" x2="9.01" y2="9" /><line x1="15" y1="9" x2="15.01" y2="9" /></svg>,
    check: <svg {...p}><polyline points="20 6 9 17 4 12" /></svg>,
    arrow: <svg {...p}><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>,
  };
  return m[name] || null;
}

export default function SaasLandingPage({ onSignup, onBack }) {
  const [tab, setTab] = useState("pro");

  return (
    <div style={{ minHeight: "100vh", background: "#050505", fontFamily: "-apple-system,Inter,sans-serif", color: "#fff", overflowX: "hidden" }}>
      <style>{`
        @keyframes slFade{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
        @keyframes slFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
        @keyframes slGlow{0%,100%{filter:drop-shadow(0 0 20px rgba(2,209,186,0.3))}50%{filter:drop-shadow(0 0 40px rgba(2,209,186,0.6))}}
        .sl-feature:hover{border-color:rgba(2,209,186,0.3)!important;transform:translateY(-2px)}
      `}</style>

      {/* Ambient */}
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, height: "50%", background: "radial-gradient(ellipse at 50% -20%, rgba(2,209,186,0.12), transparent 60%)", pointerEvents: "none", zIndex: 0 }} />

      <div style={{ position: "relative", zIndex: 1 }}>

        {/* ===== NAV ===== */}
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "20px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <img src={LOGO_B64} alt="" style={{ width: 40, height: 40, borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)" }} />
            <div>
              <div style={{ fontSize: 16, fontWeight: 900, letterSpacing: "-0.3px" }}>RB <span style={{ color: G }}>Perform</span></div>
              <div style={{ fontSize: 8, letterSpacing: "3px", color: "rgba(255,255,255,0.3)", textTransform: "uppercase", fontWeight: 700 }}>Pour les coachs</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            {onBack && <button onClick={onBack} style={{ padding: "9px 16px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, color: "rgba(255,255,255,0.5)", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Je suis client</button>}
            <button onClick={onSignup} style={{ padding: "9px 18px", background: G, border: "none", borderRadius: 10, color: "#000", fontSize: 12, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", letterSpacing: "0.3px" }}>S'inscrire</button>
          </div>
        </div>

        {/* ===== HERO avec fond WebGL ===== */}
        <section style={{ position: "relative", minHeight: "100vh", background: "#080C14", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 60 }}>
          {/* Fond WebGL anime (lazy-load, fallback invisible) */}
          <Suspense fallback={null}>
            <HeroBackground />
          </Suspense>

          {/* Overlay gradient doux pour lisibilite du texte */}
          <div style={{
            position: "absolute", inset: 0,
            background: "radial-gradient(ellipse at center, transparent 20%, #080C14 80%)",
            pointerEvents: "none",
            zIndex: 1,
          }} />

          {/* Contenu */}
          <div style={{ position: "relative", zIndex: 2, textAlign: "center", padding: "80px 24px", maxWidth: 900, animation: "slFade 0.6s ease both" }}>
            <p style={{
              fontSize: 11, fontWeight: 700, letterSpacing: "0.2em",
              color: "#00C9A7", textTransform: "uppercase",
              marginBottom: 20, margin: "0 0 20px",
            }}>
              ✦  Alerte churn predictive · 0% commission
            </p>

            <h1 style={{
              fontSize: "clamp(60px, 11vw, 140px)",
              fontWeight: 900, color: "#FFFFFF",
              lineHeight: 0.9, letterSpacing: "-0.05em",
              margin: "0 0 28px",
              textAlign: "center",
              fontFamily: "'Syne', sans-serif",
            }}>
              <div>RB</div>
              <div>PERFORM</div>
            </h1>

            <p style={{
              fontSize: "clamp(16px, 1.8vw, 20px)",
              color: "rgba(255,255,255,0.55)",
              maxWidth: 480, margin: "0 auto 40px",
              lineHeight: 1.65,
            }}>
              Tu sais quel client va partir.<br />
              Avant qu'il parte.
            </p>

            <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
              <button onClick={onSignup} style={{
                padding: "14px 28px",
                background: "#00C9A7", color: "#080C14",
                fontWeight: 700, fontSize: 14, borderRadius: 8,
                border: "none", cursor: "pointer",
                letterSpacing: "0.02em",
                fontFamily: "inherit",
              }}>
                Rejoindre les Founding Coachs →
              </button>
              <button onClick={onSignup} style={{
                padding: "14px 28px",
                border: "1px solid rgba(255,255,255,0.15)",
                background: "transparent",
                color: "rgba(255,255,255,0.8)",
                fontWeight: 600, fontSize: 14, borderRadius: 8,
                cursor: "pointer",
                fontFamily: "inherit",
              }}>
                Voir la demo
              </button>
            </div>
          </div>
        </section>

        {/* ===== STATS BAR ===== */}
        <div style={{ maxWidth: 800, margin: "0 auto 80px", display: "flex", justifyContent: "center", gap: 40, flexWrap: "wrap", padding: "0 24px", animation: "slFade 0.6s ease 0.2s both" }}>
          {STATS.map((s, i) => (
            <div key={i} style={{ textAlign: "center" }}>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 28, fontWeight: 200, color: G, letterSpacing: "-1px" }}>{s.value}</div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "1px", fontWeight: 600, marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* ===== FEATURES GRID ===== */}
        <div style={{ maxWidth: 1000, margin: "0 auto 80px", padding: "0 24px" }}>
          <div style={{ textAlign: "center", marginBottom: 48, animation: "slFade 0.6s ease 0.3s both" }}>
            <div style={{ fontSize: 10, letterSpacing: "4px", textTransform: "uppercase", color: "rgba(2,209,186,0.55)", fontWeight: 700, marginBottom: 12 }}>Fonctionnalites</div>
            <h2 style={{ fontSize: 36, fontWeight: 900, letterSpacing: "-2px", margin: 0 }}>Tout est inclus<span style={{ color: G }}>.</span></h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14 }}>
            {FEATURES.map((f, i) => (
              <div key={i} className="sl-feature" style={{
                background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 18, padding: "22px 20px",
                transition: "all 0.2s", cursor: "default", animation: `slFade ${0.3 + i * 0.05}s ease both`,
              }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: "rgba(2,209,186,0.08)", border: "1px solid rgba(2,209,186,0.2)", display: "flex", alignItems: "center", justifyContent: "center", color: G, marginBottom: 14 }}>
                  <Ic name={f.icon} size={20} />
                </div>
                <div style={{ fontSize: 14, fontWeight: 800, color: "#fff", marginBottom: 6, letterSpacing: "-0.3px" }}>{f.title}</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", lineHeight: 1.6 }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ===== PRICING ===== */}
        <div style={{ maxWidth: 800, margin: "0 auto 80px", padding: "0 24px" }}>
          <div style={{ textAlign: "center", marginBottom: 48, animation: "slFade 0.6s ease 0.4s both" }}>
            <div style={{ fontSize: 10, letterSpacing: "4px", textTransform: "uppercase", color: "rgba(2,209,186,0.55)", fontWeight: 700, marginBottom: 12 }}>Tarifs</div>
            <h2 style={{ fontSize: 36, fontWeight: 900, letterSpacing: "-2px", margin: 0 }}>Simple et transparent<span style={{ color: G }}>.</span></h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {/* Plan Pro */}
            <div style={{
              background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 22, padding: "28px 24px",
              position: "relative", overflow: "hidden",
            }}>
              <div style={{ fontSize: 10, letterSpacing: "2px", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", fontWeight: 700, marginBottom: 10 }}>Pro</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 6 }}>
                <span style={{ fontSize: 48, fontWeight: 100, color: "#fff", letterSpacing: "-3px" }}>299</span>
                <span style={{ fontSize: 14, color: "rgba(255,255,255,0.35)" }}>€ / mois</span>
              </div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginBottom: 20 }}>Jusqu'a 30 clients</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
                {["Dashboard coach complet", "Suivi nutrition + scanner", "IA vocal analyse repas", "Messages temps reel", "Gestion abonnements", "White label"].map((f, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "rgba(255,255,255,0.5)" }}>
                    <Ic name="check" size={14} />
                    {f}
                  </div>
                ))}
              </div>
              <button onClick={onSignup} style={{ width: "100%", padding: 15, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 14, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Commencer</button>
            </div>

            {/* Plan Elite */}
            <div style={{
              background: "rgba(2,209,186,0.04)", border: `1px solid rgba(2,209,186,0.25)`, borderRadius: 22, padding: "28px 24px",
              position: "relative", overflow: "hidden",
            }}>
              <div style={{ position: "absolute", top: -30, right: -30, width: 120, height: 120, background: "radial-gradient(circle, rgba(2,209,186,0.15), transparent 70%)", pointerEvents: "none" }} />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div style={{ fontSize: 10, letterSpacing: "2px", textTransform: "uppercase", color: G, fontWeight: 700 }}>Elite</div>
                <div style={{ fontSize: 8, fontWeight: 800, color: G, background: "rgba(2,209,186,0.12)", border: "1px solid rgba(2,209,186,0.3)", borderRadius: 100, padding: "3px 10px", letterSpacing: "1px" }}>POPULAIRE</div>
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 6 }}>
                <span style={{ fontSize: 48, fontWeight: 100, color: G, letterSpacing: "-3px" }}>499</span>
                <span style={{ fontSize: 14, color: "rgba(255,255,255,0.35)" }}>€ / mois</span>
              </div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginBottom: 20 }}>Clients illimites</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
                {["Tout le plan Pro", "Clients illimites", "Super Admin analytics", "Support prioritaire", "Seance Vivante (coaching live)", "Onboarding personnalise"].map((f, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "rgba(255,255,255,0.6)" }}>
                    <div style={{ color: G }}><Ic name="check" size={14} /></div>
                    {f}
                  </div>
                ))}
              </div>
              <button onClick={onSignup} style={{ width: "100%", padding: 15, background: `linear-gradient(135deg, ${G}, #0891b2)`, border: "none", borderRadius: 14, color: "#000", fontSize: 13, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", textTransform: "uppercase", letterSpacing: "0.5px", boxShadow: "0 8px 28px rgba(2,209,186,0.3)" }}>Commencer</button>
            </div>
          </div>
        </div>

        {/* ===== FINAL CTA ===== */}
        <div style={{ maxWidth: 700, margin: "0 auto 80px", padding: "60px 24px", textAlign: "center", animation: "slFade 0.6s ease 0.5s both" }}>
          <h2 style={{ fontSize: 40, fontWeight: 900, letterSpacing: "-2px", lineHeight: 0.95, marginBottom: 16 }}>
            Pret a scaler<br />ton coaching<span style={{ color: G }}>?</span>
          </h2>
          <p style={{ fontSize: 14, color: "rgba(255,255,255,0.4)", marginBottom: 32, lineHeight: 1.6 }}>
            Rejoins les coachs qui utilisent RB Perform pour gerer leurs clients, automatiser leur suivi, et developper leur business.
          </p>
          <button onClick={onSignup} style={{ padding: "18px 40px", background: `linear-gradient(135deg, ${G}, #0891b2)`, color: "#000", border: "none", borderRadius: 16, fontSize: 16, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", textTransform: "uppercase", letterSpacing: "0.5px", boxShadow: "0 12px 48px rgba(2,209,186,0.35)" }}>
            Creer mon compte coach →
          </button>
        </div>

        {/* ===== FOOTER ===== */}
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.04)", padding: "28px 24px", textAlign: "center" }}>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", letterSpacing: "2px", textTransform: "uppercase" }}>
            RB Perform · SaaS de coaching sportif premium · SSL
          </div>
        </div>
      </div>
    </div>
  );
}

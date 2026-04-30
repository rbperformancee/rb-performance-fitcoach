import React, { useState, useEffect, lazy, Suspense } from "react";

const OnboardingFlow = lazy(() => import("./OnboardingFlow"));

const GREEN = "#02d1ba";
const GOLD = "#d4af37";
const BG = "#050505";

const KEYFRAMES = `
@keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
@keyframes shimmer { 0% { background-position: -200% center; } 100% { background-position: 200% center; } }
@keyframes pulseDot { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(1.2); } }
@keyframes ambient { 0%, 100% { transform: translate(0, 0); opacity: 0.4; } 50% { transform: translate(20px, -10px); opacity: 0.6; } }
`;

export default function CoachingApplicationLanding() {
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    document.title = "Candidature Coaching Premium · RB Perform";
    if (showForm) window.scrollTo({ top: 0, behavior: "smooth" });
  }, [showForm]);

  if (showForm) {
    return (
      <Suspense fallback={<div style={{ minHeight: "100dvh", background: BG }} />}>
        <OnboardingFlow client={null} mode="application" onComplete={() => { window.location.href = "/"; }} />
      </Suspense>
    );
  }

  return (
    <div style={{ minHeight: "100dvh", background: BG, color: "#fff", fontFamily: "-apple-system,Inter,sans-serif", overflow: "hidden", position: "relative" }}>
      <style>{KEYFRAMES}</style>

      {/* Ambient gradients */}
      <div style={{ position: "fixed", top: "-10%", left: "-10%", width: "60%", height: "60%", background: `radial-gradient(circle, rgba(212,175,55,0.08), transparent 60%)`, pointerEvents: "none", animation: "ambient 12s ease-in-out infinite" }} />
      <div style={{ position: "fixed", bottom: "-10%", right: "-10%", width: "60%", height: "60%", background: `radial-gradient(circle, rgba(2,209,186,0.06), transparent 60%)`, pointerEvents: "none", animation: "ambient 14s ease-in-out infinite reverse" }} />

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "60px 24px 100px", position: "relative", zIndex: 1 }}>

        {/* Eyebrow with live availability dot */}
        <div style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "8px 16px", background: "rgba(212,175,55,0.06)", border: "1px solid rgba(212,175,55,0.2)", borderRadius: 100, marginBottom: 32, animation: "fadeUp 0.6s ease 0.1s both" }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: GOLD, animation: "pulseDot 1.6s ease-in-out infinite" }} />
          <div style={{ fontSize: 10, letterSpacing: "3px", textTransform: "uppercase", color: GOLD, fontWeight: 700 }}>Coaching Premium · 5 places ouvertes</div>
        </div>

        {/* Hero title */}
        <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: "clamp(40px, 7vw, 72px)", fontWeight: 900, letterSpacing: "-3px", lineHeight: 0.92, marginBottom: 24, animation: "fadeUp 0.7s ease 0.2s both" }}>
          La transformation<br/>
          <span style={{ background: `linear-gradient(90deg, ${GREEN}, ${GOLD}, ${GREEN})`, backgroundSize: "200% auto", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", animation: "shimmer 6s linear infinite" }}>
            qui change tout.
          </span>
        </h1>

        {/* Subhead */}
        <p style={{ fontSize: 18, lineHeight: 1.6, color: "rgba(255,255,255,0.6)", marginBottom: 40, maxWidth: 580, animation: "fadeUp 0.7s ease 0.3s both" }}>
          90 jours. 5 places. Un suivi 24/7 qui ne ressemble à rien d'autre. Si t'es serieux, postule. Sinon ferme cet onglet.
        </p>

        {/* Photo placeholder */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 32, padding: "18px 22px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 18, animation: "fadeUp 0.7s ease 0.4s both" }}>
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: `linear-gradient(135deg, ${GREEN}, #0891b2)`, display: "flex", alignItems: "center", justifyContent: "center", color: "#000", fontSize: 20, fontWeight: 900, letterSpacing: "-0.5px", flexShrink: 0 }}>RB</div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#fff", marginBottom: 2 }}>Rayan Bonte</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", letterSpacing: "0.3px" }}>Athlète · Coach · Fondateur RB Perform</div>
          </div>
        </div>

        {/* Testimonials */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 48, animation: "fadeUp 0.7s ease 0.45s both" }}>
          {[
            {
              name: "Léo",
              meta: "21 ans · Première compétition",
              quote: "3 mois avec Rayan : +8kg de muscle sec, première compé gagnée, et une discipline que je pensais ne jamais atteindre. Le mec ne lâche rien — moi non plus du coup.",
              initial: "L",
              accent: GREEN,
            },
            {
              name: "Andy",
              meta: "34 ans · Entrepreneur",
              quote: "Je dirige ma boîte 60h/semaine. Rayan a calibré tout autour de mon emploi du temps réel. -12kg en 90 jours sans cramer mon énergie au boulot. Aucun coach n'avait su faire ça avant.",
              initial: "A",
              accent: GOLD,
            },
          ].map((tm) => (
            <div key={tm.name} style={{ padding: "20px 22px", background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16 }}>
              <div style={{ fontSize: 14, color: "rgba(255,255,255,0.75)", lineHeight: 1.65, marginBottom: 14, fontStyle: "italic" }}>
                "{tm.quote}"
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: `${tm.accent}18`, border: `1px solid ${tm.accent}40`, display: "flex", alignItems: "center", justifyContent: "center", color: tm.accent, fontSize: 14, fontWeight: 800, flexShrink: 0 }}>{tm.initial}</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{tm.name}</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>{tm.meta}</div>
                </div>
                <div style={{ marginLeft: "auto", display: "flex", gap: 2 }}>
                  {[1,2,3,4,5].map(s => (<span key={s} style={{ color: tm.accent, fontSize: 12 }}>★</span>))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Ce que tu reçois — bullets propres, sans prix */}
        <div style={{ marginBottom: 48, animation: "fadeUp 0.7s ease 0.5s both" }}>
          <div style={{ fontSize: 10, letterSpacing: "4px", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", fontWeight: 700, marginBottom: 20 }}>Ce que tu reçois</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {[
              { t: "Programme sur-mesure réajusté chaque semaine", d: "Construit autour de ton corps, ton planning, ton objectif. Pas un template recyclé." },
              { t: "WhatsApp direct 7j/7 avec moi", d: "Question, photo, vidéo. Réponse dans l'heure en semaine. Aucun assistant." },
              { t: "Appel stratégique hebdomadaire en visio", d: "30 min chaque semaine. On débloque, on ajuste, on mesure." },
              { t: "Audio review personnalisé de tes séances", d: "Tu m'envoies tes vidéos d'exécution, je te renvoie un audio détaillé sous 24h." },
              { t: "Suivi nutrition + récupération intégré", d: "Macros calibrés, sommeil tracké, supplémentation. Tout dans la même app." },
              { t: "Accès complet à RB Perform Pro", d: "L'app premium + dashboard + analyses Sentinel — comme mes coachs Founders." },
            ].map((x, i) => (
              <div key={i} style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: GOLD, marginTop: 9, flexShrink: 0, boxShadow: `0 0 12px ${GOLD}40` }} />
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#fff", marginBottom: 3 }}>{x.t}</div>
                  <div style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", lineHeight: 1.6 }}>{x.d}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pricing block — Elon clean, deux phrases qui suffisent */}
        <div style={{ padding: 32, background: `linear-gradient(135deg, rgba(212,175,55,0.06), rgba(2,209,186,0.04))`, border: "1px solid rgba(212,175,55,0.2)", borderRadius: 20, marginBottom: 48, animation: "fadeUp 0.7s ease 0.6s both" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap", marginBottom: 18 }}>
            <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 64, fontWeight: 900, color: "#fff", letterSpacing: "-2px", lineHeight: 1 }}>300€</div>
            <div style={{ fontSize: 15, color: "rgba(255,255,255,0.45)", fontWeight: 500 }}>/ mois · 3 mois min.</div>
          </div>
          <p style={{ fontSize: 15, color: "rgba(255,255,255,0.7)", lineHeight: 1.7, margin: 0 }}>
            Le prix d'une salle de sport haut de gamme, sans le coach. Sauf qu'ici tu as le coach,
            la garantie résultat à J90, et zéro carte bancaire avant que je valide ton dossier.
          </p>
        </div>

        {/* Filter / Pour qui */}
        <div style={{ marginBottom: 48, animation: "fadeUp 0.7s ease 0.7s both" }}>
          <div style={{ fontSize: 10, letterSpacing: "4px", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", fontWeight: 700, marginBottom: 16 }}>Ce coaching n'est pas pour toi si…</div>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              "Tu cherches une solution magique sans rien changer à ton hygiène",
              "Tu veux \"essayer\" sans t'engager 3 mois",
              "Tu négocies les prix",
              "Tu ne réponds pas dans les 24h aux messages WhatsApp",
            ].map((x, i) => (
              <li key={i} style={{ display: "flex", gap: 10, fontSize: 13, color: "rgba(255,255,255,0.4)", lineHeight: 1.5 }}>
                <span style={{ color: "#ef4444", flexShrink: 0 }}>✕</span>{x}
              </li>
            ))}
          </ul>
        </div>

        {/* CTA */}
        <button
          onClick={() => setShowForm(true)}
          style={{
            width: "100%",
            padding: "22px 32px",
            background: `linear-gradient(135deg, ${GOLD}, #b8941e)`,
            border: "none",
            borderRadius: 18,
            color: "#000",
            fontSize: 16,
            fontWeight: 900,
            letterSpacing: "1.5px",
            textTransform: "uppercase",
            cursor: "pointer",
            fontFamily: "-apple-system,Inter,sans-serif",
            boxShadow: `0 16px 40px rgba(212,175,55,0.25)`,
            transition: "transform 0.2s ease, box-shadow 0.2s ease",
            animation: "fadeUp 0.7s ease 0.8s both",
          }}
          onMouseOver={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = `0 20px 50px rgba(212,175,55,0.35)`; }}
          onMouseOut={(e) => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = `0 16px 40px rgba(212,175,55,0.25)`; }}
        >
          Réserve ta transformation →
        </button>

        <div style={{ textAlign: "center", marginTop: 18, fontSize: 11, color: "rgba(255,255,255,0.3)", letterSpacing: "0.3px", animation: "fadeUp 0.7s ease 0.9s both" }}>
          Questionnaire 8-10 min · Réponse sous 48h · Aucune carte bancaire requise
        </div>
      </div>
    </div>
  );
}

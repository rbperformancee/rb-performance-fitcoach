import React, { useState, useEffect, useRef, lazy, Suspense } from "react";

const OnboardingFlow = lazy(() => import("./OnboardingFlow"));

const GREEN = "#02d1ba";
const BG = "#050505";

// Pouls 60bpm = 1s cycle (rythme cardiaque au repos d'un athlete entraine).
// Subliminal — le visiteur ne voit pas l'animation consciemment, son cerveau
// capte que tout est synchronise → "ce site est calibre, premium".
// Designed pour respecter prefers-reduced-motion (a11y + Lighthouse).
const KEYFRAMES = `
@keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
@keyframes shimmer { 0% { background-position: -200% center; } 100% { background-position: 200% center; } }
@keyframes breath60 { 0%, 100% { opacity: 1; } 50% { opacity: 0.62; } }
@keyframes breath60Scale { 0%, 100% { transform: scale(1); opacity: 0.5; } 50% { transform: scale(1.04); opacity: 0.7; } }
@keyframes ambientDrift { 0%, 100% { transform: translate(0, 0); } 50% { transform: translate(20px, -10px); } }
@keyframes ctaGlow { 0%, 100% { box-shadow: 0 16px 40px rgba(2,209,186,0.22); } 50% { box-shadow: 0 16px 50px rgba(2,209,186,0.42); } }
@media (prefers-reduced-motion: reduce) {
  * { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; }
}
`;

export default function CoachingApplicationLanding() {
  const [showForm, setShowForm] = useState(false);
  const [showTransfos, setShowTransfos] = useState(false);
  const iphoneRef = useRef(null);

  useEffect(() => {
    document.title = "Candidature Accompagnement Premium · RB Perform";
    if (showForm) window.scrollTo({ top: 0, behavior: "smooth" });
  }, [showForm]);

  // Tilt 3D iPhone — suit le curseur (Apple Vision Pro style).
  // Max 8 degrees, smoothed via requestAnimationFrame.
  // Desactive si prefers-reduced-motion ou viewport mobile (touch).
  useEffect(() => {
    if (showForm || !iphoneRef.current) return;
    const el = iphoneRef.current;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isTouch = window.matchMedia("(hover: none)").matches;
    if (reduced || isTouch) return;

    let raf = 0;
    let targetX = 0, targetY = 0;
    let curX = 0, curY = 0;
    const onMove = (e) => {
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const dx = (e.clientX - cx) / (r.width / 2);  // -1 → 1
      const dy = (e.clientY - cy) / (r.height / 2);
      targetX = Math.max(-1, Math.min(1, dx)) * 8;  // 8° max
      targetY = Math.max(-1, Math.min(1, dy)) * 8;
    };
    const animate = () => {
      curX += (targetX - curX) * 0.12;
      curY += (targetY - curY) * 0.12;
      el.style.transform = `perspective(1000px) rotateY(${curX}deg) rotateX(${-curY}deg)`;
      raf = requestAnimationFrame(animate);
    };
    const onLeave = () => { targetX = 0; targetY = 0; };
    window.addEventListener("mousemove", onMove);
    el.addEventListener("mouseleave", onLeave);
    raf = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMove);
      el.removeEventListener("mouseleave", onLeave);
    };
  }, [showForm]);

  if (showForm) {
    return (
      <Suspense fallback={<div style={{ minHeight: "100dvh", background: BG }} />}>
        <OnboardingFlow client={null} mode="application" onComplete={() => { window.location.href = "/"; }} />
      </Suspense>
    );
  }

  return (
    <main style={{ minHeight: "100dvh", background: BG, color: "#fff", fontFamily: "-apple-system,Inter,sans-serif", overflow: "hidden", position: "relative" }}>
      <style>{KEYFRAMES}</style>

      {/* Ambient gradients — drift lent (12s). Breath retire ici : double
          animation (drift + scale) sur 60% viewport = compositing continu
          qui bloque le LCP. On garde le drift seul, ca suffit comme calme. */}
      <div aria-hidden="true" style={{ position: "fixed", top: "-10%", left: "-10%", width: "60%", height: "60%", background: `radial-gradient(circle, rgba(2,209,186,0.08), transparent 60%)`, pointerEvents: "none", animation: "ambientDrift 12s ease-in-out infinite", willChange: "transform" }} />
      <div aria-hidden="true" style={{ position: "fixed", bottom: "-10%", right: "-10%", width: "60%", height: "60%", background: `radial-gradient(circle, rgba(2,209,186,0.06), transparent 60%)`, pointerEvents: "none", animation: "ambientDrift 14s ease-in-out infinite reverse", willChange: "transform" }} />

      <div style={{ maxWidth: 640, margin: "0 auto", padding: "64px 24px 100px", position: "relative", zIndex: 1, textAlign: "center" }}>

        {/* Eyebrow with live availability dot */}
        <div style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "8px 16px", background: "rgba(2,209,186,0.06)", border: "1px solid rgba(2,209,186,0.2)", borderRadius: 100, marginBottom: 32, animation: "fadeUp 0.6s ease 0.1s both" }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: GREEN, animation: "breath60 1s ease-in-out infinite", boxShadow: `0 0 8px ${GREEN}80` }} />
          <div style={{ fontSize: 10, letterSpacing: "3px", textTransform: "uppercase", color: GREEN, fontWeight: 700 }}>Accompagnement Premium · 5 places ouvertes</div>
        </div>

        {/* Hero title — pas de fadeUp ici : c'est le LCP candidate. Si on
            le rend opacity:0 puis fade-in, Lighthouse mesure le LCP a la fin
            de l'animation (700ms + 200ms delay = +900ms regression). */}
        <h1 style={{ fontFamily: "'Inter',-apple-system,sans-serif", fontSize: "clamp(38px, 7vw, 60px)", fontWeight: 900, letterSpacing: "-0.03em", lineHeight: 1.05, marginBottom: 24 }}>
          La transformation<br/>
          <span style={{ background: `linear-gradient(90deg, ${GREEN}, #ffffff, ${GREEN})`, backgroundSize: "200% auto", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", animation: "shimmer 6s linear infinite" }}>
            qui change tout.
          </span>
        </h1>

        {/* Subhead */}
        <p style={{ fontSize: 17, lineHeight: 1.65, color: "rgba(255,255,255,0.6)", marginBottom: 40, maxWidth: 520, marginLeft: "auto", marginRight: "auto", animation: "fadeUp 0.7s ease 0.3s both" }}>
          90 jours. 5 places. Un suivi 24/7 qui ne ressemble à rien d'autre.
        </p>

        {/* Profile — vraie photo HD avec ring teal */}
        <div style={{ display: "inline-flex", alignItems: "center", gap: 16, marginBottom: 56, padding: "12px 22px 12px 12px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 100, animation: "fadeUp 0.7s ease 0.4s both" }}>
          <div style={{ width: 56, height: 56, borderRadius: "50%", overflow: "hidden", flexShrink: 0, border: `2px solid ${GREEN}`, boxShadow: `0 0 16px rgba(2,209,186,0.35)`, position: "relative" }}>
            <img
              src="/rayan-portrait-240.webp"
              srcSet="/rayan-portrait-240.webp 240w, /rayan-portrait-480.webp 480w"
              sizes="56px"
              alt="Rayan Bonte"
              width={240}
              height={240}
              loading="eager"
              fetchpriority="high"
              decoding="async"
              style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 25%", display: "block" }}
            />
          </div>
          <div style={{ textAlign: "left" }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", lineHeight: 1.2 }}>Rayan Bonte</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.62)", letterSpacing: "0.3px", marginTop: 2 }}>Athlète · Fondateur RB Perform</div>
          </div>
        </div>

        {/* Transformations clients — preuve réelle */}
        <div style={{ marginBottom: 56, animation: "fadeUp 0.7s ease 0.45s both" }}>
          <div style={{ fontSize: 10, letterSpacing: "4px", textTransform: "uppercase", color: "rgba(255,255,255,0.62)", fontWeight: 700, marginBottom: 28 }}>Résultats · pas des promesses</div>

          {!showTransfos && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
              {/* Stack de previews floutées — donne envie de cliquer (curiosité) */}
              <div style={{ position: "relative", width: 200, height: 120, marginBottom: 4 }}>
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    style={{
                      position: "absolute",
                      top: 0,
                      left: "50%",
                      width: 90,
                      height: 120,
                      borderRadius: 12,
                      overflow: "hidden",
                      border: "2px solid rgba(255,255,255,0.08)",
                      boxShadow: "0 8px 24px rgba(0,0,0,0.6)",
                      transform: `translateX(${(i - 1) * 56 - 45}px) rotate(${(i - 1) * 6}deg)`,
                      zIndex: 3 - i,
                    }}
                  >
                    <img
                      src={`/transfo-${i + 1}-after-400.webp`}
                      alt=""
                      aria-hidden="true"
                      loading="lazy"
                      decoding="async"
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        filter: "blur(8px) brightness(0.6) saturate(0.8)",
                      }}
                    />
                  </div>
                ))}
              </div>

              <button
                onClick={() => setShowTransfos(true)}
                style={{
                  position: "relative",
                  background: `linear-gradient(135deg, rgba(2,209,186,0.12) 0%, rgba(2,209,186,0.04) 100%)`,
                  border: `1px solid ${GREEN}`,
                  color: "#fff",
                  fontSize: 14,
                  fontWeight: 700,
                  letterSpacing: "0.5px",
                  padding: "16px 32px",
                  borderRadius: 100,
                  cursor: "pointer",
                  transition: "all 0.25s cubic-bezier(0.22, 1, 0.36, 1)",
                  boxShadow: `0 8px 24px rgba(2,209,186,0.18)`,
                  animation: "ctaGlow 2s ease-in-out infinite",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 10,
                }}
                onMouseOver={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = `0 12px 32px rgba(2,209,186,0.35)`; }}
                onMouseOut={(e) => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = `0 8px 24px rgba(2,209,186,0.18)`; }}
              >
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: GREEN, animation: "breath60Scale 1s ease-in-out infinite", boxShadow: `0 0 12px ${GREEN}` }} />
                Ils n'ont pas attendu
              </button>

              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.62)", letterSpacing: "0.5px" }}>
                3 transformations · photos privées
              </div>
            </div>
          )}

          {showTransfos && (
            <div style={{ animation: "fadeUp 0.5s ease both" }}>
              {[
                { id: 1, name: "Senan", duration: "3 mois d'accompagnement" },
                { id: 2, name: "Mael",  duration: "3 mois d'accompagnement" },
                { id: 3, name: "Léo",   duration: "12 mois d'accompagnement" },
              ].map((client) => (
                <div key={client.id} style={{ marginBottom: 28, maxWidth: 480, marginLeft: "auto", marginRight: "auto" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    {[
                      { src: "before", label: "AVANT" },
                      { src: "after",  label: "APRÈS" },
                    ].map(({ src, label }) => (
                      <div key={src} style={{ position: "relative", borderRadius: 14, overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)", aspectRatio: "3 / 4", boxShadow: "0 12px 32px rgba(0,0,0,0.5)" }}>
                        <img
                          src={`/transfo-${client.id}-${src}-400.webp`}
                          srcSet={`/transfo-${client.id}-${src}-400.webp 400w, /transfo-${client.id}-${src}-800.webp 800w`}
                          sizes="(max-width: 600px) 50vw, 240px"
                          alt={`${client.name} - ${label}`}
                          loading="lazy"
                          decoding="async"
                          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                        />
                        <div style={{ position: "absolute", top: 12, left: 12, padding: "5px 10px", background: src === "after" ? `${GREEN}` : "rgba(0,0,0,0.7)", color: src === "after" ? "#000" : "#fff", fontSize: 9, fontWeight: 800, letterSpacing: "2px", borderRadius: 100 }}>
                          {label}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: 12, fontSize: 12, color: "rgba(255,255,255,0.7)", letterSpacing: "0.3px" }}>
                    <strong style={{ color: "#fff", fontWeight: 700 }}>{client.name}</strong> · {client.duration}
                  </div>
                </div>
              ))}

              <div style={{ display: "flex", gap: 20, justifyContent: "center", alignItems: "center", flexWrap: "wrap", marginTop: 4 }}>
                <a
                  href="https://instagram.com/rb_perform"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: "inline-block", fontSize: 12, color: GREEN, textDecoration: "none", letterSpacing: "0.3px", borderBottom: "1px solid rgba(2,209,186,0.45)", paddingBottom: 1 }}
                >
                  Plus de transformations sur Instagram →
                </a>
                <button
                  onClick={() => setShowTransfos(false)}
                  style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.7)", fontSize: 12, letterSpacing: "0.3px", cursor: "pointer", padding: 0 }}
                  onMouseOver={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.9)"; }}
                  onMouseOut={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.7)"; }}
                >
                  Masquer
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Ce que tu reçois — bullets centrés */}
        <div style={{ marginBottom: 56, animation: "fadeUp 0.7s ease 0.5s both" }}>
          <div style={{ fontSize: 10, letterSpacing: "4px", textTransform: "uppercase", color: "rgba(255,255,255,0.62)", fontWeight: 700, marginBottom: 28 }}>Ce que tu reçois</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
            {[
              { t: "Programme adapté à ton niveau et tes objectifs", d: "Construit autour de ton corps, ton planning, ton niveau actuel. Pas un template recyclé." },
              { t: "Messagerie privée 7j/7 dans l'app", d: "Tu m'écris directement depuis l'app. Réponse sous 2 heures en semaine. Aucun intermédiaire." },
              { t: "Appel stratégique tous les 15 jours en visio", d: "30 min toutes les 2 semaines. On débloque, on ajuste, on mesure." },
              { t: "Suivi nutrition + récupération intégré", d: "On fixe tes macros, ton sommeil et ta supplémentation avec les outils intégrés. Tout dans la même app." },
              { t: "★ Accès à l'app premium RB PERFORM", d: "Le seul endroit où ce produit existe. Disponible uniquement pour mes clients privés.", featured: true },
            ].map((x, i) => (
              <div
                key={i}
                style={{
                  maxWidth: 480,
                  marginLeft: "auto",
                  marginRight: "auto",
                  ...(x.featured ? {
                    padding: "20px 24px",
                    background: "linear-gradient(135deg, rgba(2,209,186,0.08), rgba(2,209,186,0.02))",
                    border: "1px solid rgba(2,209,186,0.3)",
                    borderRadius: 16,
                    boxShadow: "0 0 30px rgba(2,209,186,0.08)",
                  } : {}),
                }}
              >
                <div style={{ fontSize: x.featured ? 17 : 16, fontWeight: x.featured ? 800 : 700, color: x.featured ? GREEN : "#fff", marginBottom: x.d ? 6 : 0, letterSpacing: x.featured ? "-0.2px" : 0 }}>{x.t}</div>
                {x.d && <div style={{ fontSize: 13, color: x.featured ? "rgba(255,255,255,0.78)" : "rgba(255,255,255,0.7)", lineHeight: 1.6 }}>{x.d}</div>}
              </div>
            ))}
          </div>
        </div>

        {/* App preview — meme image que la landing, lien vers /demo-client */}
        <div style={{ marginBottom: 56, animation: "fadeUp 0.7s ease 0.55s both", display: "flex", flexDirection: "column", alignItems: "center", gap: 24 }}>
          <div style={{ fontSize: 10, letterSpacing: "4px", textTransform: "uppercase", color: "rgba(255,255,255,0.62)", fontWeight: 700 }}>L'app que tu utiliseras</div>
          <img
            ref={iphoneRef}
            src="/iphone_client-720.webp"
            srcSet="/iphone_client-480.webp 480w, /iphone_client-720.webp 720w, /iphone_client-1080.webp 1080w"
            sizes="(max-width: 600px) 320px, 400px"
            alt="App client RB Perform"
            loading="lazy"
            decoding="async"
            width={2752}
            height={1536}
            style={{
              width: "100%",
              maxWidth: 380,
              height: "auto",
              display: "block",
              filter: "drop-shadow(0 24px 64px rgba(0,0,0,0.7))",
              transition: "transform 0.6s cubic-bezier(0.22, 1, 0.36, 1)",
              transformStyle: "preserve-3d",
              willChange: "transform",
            }}
          />
          <a
            href="/demo-client"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "12px 22px",
              background: "rgba(2,209,186,0.08)",
              border: "1px solid rgba(2,209,186,0.25)",
              borderRadius: 100,
              color: GREEN,
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: "0.5px",
              textTransform: "uppercase",
              textDecoration: "none",
              transition: "all 0.2s",
            }}
            onMouseOver={(e) => { e.currentTarget.style.background = "rgba(2,209,186,0.14)"; e.currentTarget.style.borderColor = "rgba(2,209,186,0.45)"; }}
            onMouseOut={(e) => { e.currentTarget.style.background = "rgba(2,209,186,0.08)"; e.currentTarget.style.borderColor = "rgba(2,209,186,0.25)"; }}
          >
            Explorer la démo →
          </a>
        </div>

        {/* FAQ — discrete, juste 3 objections silencieuses */}
        <div style={{ marginBottom: 56, animation: "fadeUp 0.7s ease 0.65s both", textAlign: "left", maxWidth: 480, marginLeft: "auto", marginRight: "auto" }}>
          <div style={{ fontSize: 9, letterSpacing: "3px", textTransform: "uppercase", color: "rgba(255,255,255,0.62)", fontWeight: 700, marginBottom: 20, textAlign: "center" }}>Avant de postuler</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {[
              {
                q: "Pourquoi 3 mois minimum ?",
                a: "La transformation prend 60 à 90 jours minimum. Vendre 1 mois serait te mentir. 3 mois = le seuil où ça se voit vraiment.",
              },
              {
                q: "Et si je dois mettre en pause ?",
                a: "Voyage, blessure, urgence pro — la vie passe. On adapte, on ralentit. Mais on n'arrête pas.",
              },
              {
                q: "Je débute / je suis avancé — c'est pour moi ?",
                a: "Le programme est calibré sur ton niveau, pas sur un standard. La méthode change, l'exigence reste.",
              },
            ].map((item, i) => (
              <div key={i} style={{ paddingTop: i === 0 ? 0 : 14, borderTop: i === 0 ? "none" : "1px solid rgba(255,255,255,0.04)" }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.85)", marginBottom: 4, letterSpacing: "-0.1px" }}>
                  {item.q}
                </div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", lineHeight: 1.55 }}>{item.a}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Process — 3 etapes pour cadrer ce qui suit le clic CTA */}
        <div style={{ marginBottom: 22, animation: "fadeUp 0.7s ease 0.68s both" }}>
          <div style={{ display: "flex", justifyContent: "center", alignItems: "stretch", gap: 8, maxWidth: 480, marginLeft: "auto", marginRight: "auto", flexWrap: "wrap" }}>
            {[
              { n: "01", t: "Questionnaire", d: "8 min" },
              { n: "02", t: "Indique tes dispos", d: "3 créneaux" },
              { n: "03", t: "Je te recontacte", d: "sous 24h" },
            ].map((step, i) => (
              <div key={i} style={{ flex: "1 1 130px", textAlign: "left", padding: "12px 14px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12 }}>
                <div style={{ fontSize: 9, color: GREEN, fontWeight: 800, letterSpacing: "1.5px", marginBottom: 4 }}>{step.n}</div>
                <div style={{ fontSize: 12, color: "#fff", fontWeight: 700, lineHeight: 1.3 }}>{step.t}</div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.62)", marginTop: 2 }}>{step.d}</div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <button
          onClick={() => setShowForm(true)}
          style={{
            width: "100%",
            maxWidth: 480,
            padding: "20px 32px",
            background: `linear-gradient(135deg, ${GREEN}, #0891b2)`,
            border: "none",
            borderRadius: 18,
            color: "#000",
            fontSize: 15,
            fontWeight: 900,
            letterSpacing: "1.5px",
            textTransform: "uppercase",
            cursor: "pointer",
            fontFamily: "-apple-system,Inter,sans-serif",
            transition: "transform 0.2s ease",
            animation: "fadeUp 0.7s ease 0.7s both, ctaGlow 1s ease-in-out infinite 0.7s",
          }}
          onMouseOver={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; }}
          onMouseOut={(e) => { e.currentTarget.style.transform = ""; }}
        >
          Réserve ta transformation →
        </button>

        <div style={{ marginTop: 18, fontSize: 11, color: "rgba(255,255,255,0.62)", letterSpacing: "0.3px", animation: "fadeUp 0.7s ease 0.8s both" }}>
          0€ aujourd'hui · Paiement uniquement après validation appel
        </div>
      </div>
    </main>
  );
}

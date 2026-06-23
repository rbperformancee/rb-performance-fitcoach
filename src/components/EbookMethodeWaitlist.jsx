// src/components/EbookMethodeWaitlist.jsx
//
// /liste — Landing waitlist méthode ATHLÈTE COMPLET (ebook fondateur).
// Format aligné sur /candidature : Inter, shimmer hero, profile pill,
// ambient drift gradients, ctaGlow.
//
// Le form POST → /api/waitlist (existant, Supabase + Zoho SMTP confirmation).
// Source taggée 'methode-athlete' pour distinguer dans la table.

import React, { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";

const GREEN = "#02d1ba";
const BG = "#050505";

const KEYFRAMES = `
@keyframes liste_fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
@keyframes liste_shimmer { 0% { background-position: -200% center; } 100% { background-position: 200% center; } }
@keyframes liste_breath60 { 0%, 100% { opacity: 1; } 50% { opacity: 0.62; } }
@keyframes liste_breath60Scale { 0%, 100% { transform: scale(1); opacity: 0.5; } 50% { transform: scale(1.04); opacity: 0.7; } }
@keyframes liste_ambientDrift { 0%, 100% { transform: translate(0, 0); } 50% { transform: translate(20px, -10px); } }
@keyframes liste_ctaGlow { 0%, 100% { box-shadow: 0 16px 40px rgba(2,209,186,0.22); } 50% { box-shadow: 0 16px 50px rgba(2,209,186,0.42); } }
@media (prefers-reduced-motion: reduce) {
  .liste-anim { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; }
}
`;

export default function EbookMethodeWaitlist() {
  // Compteurs live — vague 1 (methode-athlete) + vague 2 (methode-athlete-vague-2)
  const [signupCount, setSignupCount] = useState(null);
  const [vague2Count, setVague2Count] = useState(null);

  useEffect(() => {
    document.title = "Liste · Méthode ATHLÈTE COMPLET — RB Perform";
  }, []);

  useEffect(() => {
    let alive = true;
    fetch("/api/waitlist-count?source=methode-athlete")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (alive && d && Number.isFinite(d.count)) setSignupCount(d.count); })
      .catch(() => { /* silencieux */ });
    fetch("/api/waitlist-count?source=methode-athlete-vague-2")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (alive && d && Number.isFinite(d.count)) setVague2Count(d.count); })
      .catch(() => { /* silencieux */ });
    return () => { alive = false; };
  }, []);

  // Seuil basculé à 29 : la 30e place est réservée (beta perso), donc 29
  // inscrits = considéré sold-out → la page bascule en mode vague 2.
  const isSoldOut = (signupCount ?? 0) >= 29;

  return (
    <main
      style={{
        minHeight: "100dvh",
        background: BG,
        color: "#fff",
        fontFamily: '"Inter", -apple-system, sans-serif',
        position: "relative",
        overflowX: "hidden",
      }}
    >
      <style>{KEYFRAMES}</style>

      {/* Ambient drift gradients (cohérence /candidature) */}
      <div
        aria-hidden="true"
        className="liste-anim"
        style={{
          position: "fixed",
          top: "-10%", left: "-10%",
          width: "60%", height: "60%",
          background: "radial-gradient(circle, rgba(2,209,186,0.08), transparent 60%)",
          pointerEvents: "none",
          animation: "liste_ambientDrift 12s ease-in-out infinite",
          willChange: "transform",
          zIndex: 0,
        }}
      />
      <div
        aria-hidden="true"
        className="liste-anim"
        style={{
          position: "fixed",
          bottom: "-10%", right: "-10%",
          width: "60%", height: "60%",
          background: "radial-gradient(circle, rgba(2,209,186,0.06), transparent 60%)",
          pointerEvents: "none",
          animation: "liste_ambientDrift 14s ease-in-out infinite reverse",
          willChange: "transform",
          zIndex: 0,
        }}
      />

      <div
        style={{
          position: "relative", zIndex: 1,
          maxWidth: 640, margin: "0 auto",
          padding: "clamp(80px, 12vw, 120px) 24px 100px",
          textAlign: "center",
        }}
      >
        {/* Eyebrow pilule avec live dot */}
        <div
          className="liste-anim"
          style={{
            display: "inline-flex", alignItems: "center", gap: 10,
            padding: "8px 16px",
            background: "rgba(2,209,186,0.06)",
            border: "1px solid rgba(2,209,186,0.2)",
            borderRadius: 100, marginBottom: 32,
            animation: "liste_fadeUp 0.6s ease 0.1s both",
          }}
        >
          <div
            style={{
              width: 7, height: 7, borderRadius: "50%",
              background: GREEN,
              animation: "liste_breath60 1s ease-in-out infinite",
              boxShadow: `0 0 8px ${GREEN}80`,
            }}
          />
          <div
            style={{
              fontSize: 10, letterSpacing: "3px",
              textTransform: "uppercase",
              color: GREEN, fontWeight: 700,
            }}
          >
            {signupCount != null && signupCount > 0
              ? `${isSoldOut ? 30 : signupCount} inscrit${(isSoldOut ? 30 : signupCount) > 1 ? "s" : ""} · 30 places fondateur`
              : "Méthode signature · 30 places fondateur"}
          </div>
        </div>

        {/* Hero title — pas de fadeUp ici (LCP candidate) */}
        <h1
          style={{
            fontFamily: '"Inter", -apple-system, sans-serif',
            fontSize: "clamp(38px, 7vw, 60px)",
            fontWeight: 900,
            letterSpacing: "-0.03em",
            lineHeight: 1.05,
            marginBottom: 24,
          }}
        >
          La méthode
          <br />
          <span
            className="liste-anim"
            style={{
              background: `linear-gradient(90deg, ${GREEN}, #ffffff, ${GREEN})`,
              backgroundSize: "200% auto",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              animation: "liste_shimmer 6s linear infinite",
            }}
          >
            athlète.
          </span>
        </h1>

        {/* App-offerte badge — message critique : les 30 premiers ont l'app
            OFFERTE. Sans ça la promesse n'est pas claire à l'œil. */}
        <div
          className="liste-anim"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 20,
            padding: "10px 18px",
            background: `linear-gradient(135deg, ${GREEN}, #0891b2)`,
            borderRadius: 100,
            boxShadow: "0 4px 20px rgba(2,209,186,0.4)",
            animation: "liste_fadeUp 0.7s ease 0.25s both",
          }}
        >
          <span style={{ fontSize: 18 }}>🎁</span>
          <span
            style={{
              fontSize: 13,
              fontWeight: 800,
              color: "#000",
              letterSpacing: "0.6px",
              textTransform: "uppercase",
            }}
          >
            App RB Perform OFFERTE aux 30 premiers acheteurs
          </span>
        </div>

        {/* Subhead */}
        <p
          className="liste-anim"
          style={{
            fontSize: 17, lineHeight: 1.65,
            color: "rgba(255,255,255,0.65)",
            marginBottom: 28, maxWidth: 520,
            marginLeft: "auto", marginRight: "auto",
            animation: "liste_fadeUp 0.7s ease 0.3s both",
          }}
        >
          12 semaines · +60 séances · Livret 110 pages. <strong style={{ color: "#fff" }}>Pour les 30 premiers acheteurs de la méthode : l'app RB Perform offerte (100 jours)</strong>.
        </p>

        {/* Vague 1 sold-out → on remonte le form vague 2 tout en haut.
            Sinon on perd les leads qui scrollent pas. */}
        {isSoldOut && (
          <section className="liste-anim" style={{
            maxWidth: 540, marginLeft: "auto", marginRight: "auto",
            marginBottom: 40,
            animation: "liste_fadeUp 0.7s ease 0.22s both",
          }}>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 10,
              padding: "10px 20px", marginBottom: 18,
              background: "rgba(255,75,75,0.10)",
              border: "1px solid rgba(255,75,75,0.45)",
              borderRadius: 100,
            }}>
              <span style={{ fontSize: 14 }}>🔒</span>
              <span style={{
                fontSize: 11, letterSpacing: "2.5px", textTransform: "uppercase",
                color: "#ff9b9b", fontWeight: 800,
              }}>
                Vague 1 founders · COMPLET (30/30)
              </span>
            </div>
            <h2 style={{
              fontFamily: '"Inter", -apple-system, sans-serif',
              fontSize: "clamp(24px, 4.5vw, 32px)",
              fontWeight: 900, letterSpacing: "-0.02em",
              lineHeight: 1.1, marginBottom: 14,
            }}>
              Liste prioritaire <span style={{ color: GREEN }}>vague 2</span>.
            </h2>
            <p style={{
              maxWidth: 480, marginLeft: "auto", marginRight: "auto",
              fontSize: 14, color: "rgba(255,255,255,0.7)",
              lineHeight: 1.6, marginBottom: 18,
            }}>
              Les 30 founders sont pris. Inscris-toi : tu es contacté en premier
              dès qu'une place se libère ou que je rouvre une nouvelle cohorte.
            </p>
            {vague2Count != null && vague2Count > 0 && (
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "7px 14px", marginBottom: 16,
                background: "rgba(2,209,186,0.10)",
                border: "1px solid rgba(2,209,186,0.35)",
                borderRadius: 100,
              }}>
                <span style={{
                  width: 7, height: 7, borderRadius: "50%",
                  background: GREEN, boxShadow: `0 0 8px ${GREEN}`,
                  animation: "liste_breath60 1s ease-in-out infinite",
                }} />
                <span style={{
                  fontSize: 10, letterSpacing: "2.5px", textTransform: "uppercase",
                  color: GREEN, fontWeight: 800,
                }}>
                  {vague2Count} {vague2Count === 1 ? "inscrit" : "inscrits"} · liste prioritaire
                </span>
              </div>
            )}
            <div style={{ maxWidth: 460, marginLeft: "auto", marginRight: "auto", textAlign: "left" }}>
              <WaitlistForm source="methode-athlete-vague-2" />
            </div>
          </section>
        )}

        {/* Compteur places fondateur — visuel avec progress bar. La barre
            visualise les inscrits sur la waitlist par rapport aux 30 places
            (cap "soft" à 30 pour rester crédible). Pleine = près du sold-out. */}
        {(() => {
          const total = 30;
          const inscrits = isSoldOut ? total : (signupCount ?? 0);
          const fillPct = Math.min(100, Math.max(8, (inscrits / total) * 100));
          return (
            <div
              className="liste-anim"
              style={{
                maxWidth: 460, marginLeft: "auto", marginRight: "auto",
                marginBottom: 36, padding: "18px 22px",
                background: "rgba(2,209,186,0.05)",
                border: "1px solid rgba(2,209,186,0.22)",
                borderRadius: 16,
                animation: "liste_fadeUp 0.7s ease 0.35s both",
                textAlign: "left",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
                <div style={{ fontSize: 10, letterSpacing: "3px", textTransform: "uppercase", color: GREEN, fontWeight: 800 }}>
                  Places fondateur
                </div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.85)", fontWeight: 700 }}>
                  <span style={{ color: GREEN, fontSize: 18, fontWeight: 900 }}>{inscrits}</span>
                  <span style={{ color: "rgba(255,255,255,0.45)" }}> inscrits / {total} places</span>
                </div>
              </div>
              <div style={{ width: "100%", height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 3, overflow: "hidden" }}>
                <div
                  style={{
                    width: `${fillPct}%`,
                    height: "100%",
                    background: `linear-gradient(90deg, ${GREEN}, #5ee8d4)`,
                    boxShadow: `0 0 10px rgba(2,209,186,0.55)`,
                    transition: "width 1s ease",
                  }}
                />
              </div>
              <div style={{ marginTop: 10, fontSize: 11, color: "rgba(255,255,255,0.5)", letterSpacing: "0.2px" }}>
                Les inscrits passent en premier dès l'ouverture (juin 2026).
              </div>
            </div>
          );
        })()}

        {/* Callout "comment ça marche" — clarifie que l'ebook est payant,
            l'app est offerte EN BONUS pour les 30 premiers acheteurs.
            Évite l'ambiguïté "tout est gratuit". */}
        <div
          className="liste-anim"
          style={{
            maxWidth: 520, marginLeft: "auto", marginRight: "auto",
            marginBottom: 36, padding: "18px 22px",
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.10)",
            borderRadius: 16,
            animation: "liste_fadeUp 0.7s ease 0.37s both",
            textAlign: "left",
          }}
        >
          <div style={{
            fontSize: 10, letterSpacing: "3px", textTransform: "uppercase",
            color: "rgba(255,255,255,0.5)", fontWeight: 800, marginBottom: 10,
          }}>
            Comment ça marche
          </div>
          <div style={{ fontSize: 13.5, color: "rgba(255,255,255,0.80)", lineHeight: 1.6 }}>
            <div style={{ marginBottom: 6 }}>
              <span style={{ color: GREEN, fontWeight: 800 }}>→ Inscription waitlist :</span> gratuite, sans engagement.
            </div>
            <div style={{ marginBottom: 6 }}>
              <span style={{ color: GREEN, fontWeight: 800 }}>→ La méthode (ebook + vidéos) :</span> paiement unique à l'ouverture (juin 2026).
            </div>
            <div>
              <span style={{ color: GREEN, fontWeight: 800 }}>→ L'app RB Perform :</span> <strong style={{ color: "#fff" }}>OFFERTE 100 jours</strong> aux 30 premiers acheteurs uniquement. Sinon abonnement séparé.
            </div>
          </div>
        </div>

        {/* Formulaire waitlist — affiché UNIQUEMENT si vague 1 pas complète.
            Si complet, le form vague 2 a déjà été affiché tout en haut. */}
        {(signupCount ?? 0) < 30 && (
          <section id="form" className="liste-anim" style={{ marginBottom: 48, animation: "liste_fadeUp 0.7s ease 0.4s both" }}>
            <div style={{ fontSize: 10, letterSpacing: "4px", textTransform: "uppercase", color: "rgba(255,255,255,0.62)", fontWeight: 700, marginBottom: 14 }}>
              Inscription gratuite
            </div>
            <h2 style={{
              fontFamily: '"Inter", -apple-system, sans-serif',
              fontSize: "clamp(26px, 5vw, 34px)",
              fontWeight: 900, letterSpacing: "-0.025em",
              lineHeight: 1.1, marginBottom: 14,
            }}>
              Je rejoins la liste.
            </h2>
            <p style={{
              maxWidth: 460, marginLeft: "auto", marginRight: "auto",
              fontSize: 14, color: "rgba(255,255,255,0.65)",
              lineHeight: 1.6, marginBottom: 22,
            }}>
              Lien direct dès la mise en ligne. <strong style={{ color: GREEN }}>Les 30 premiers acheteurs de la méthode reçoivent l'app RB Perform offerte 100 jours</strong> — durée complète de la méthode, non disponible publiquement.
            </p>
            <div style={{ maxWidth: 460, marginLeft: "auto", marginRight: "auto", textAlign: "left" }}>
              <WaitlistForm />
            </div>
          </section>
        )}

        {/* Profile card */}
        <div
          className="liste-anim"
          style={{
            display: "inline-flex", alignItems: "center", gap: 16,
            marginBottom: 56,
            padding: "12px 22px 12px 12px",
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 100,
            animation: "liste_fadeUp 0.7s ease 0.4s both",
          }}
        >
          <div
            style={{
              width: 56, height: 56,
              borderRadius: "50%", overflow: "hidden",
              flexShrink: 0,
              border: `2px solid ${GREEN}`,
              boxShadow: "0 0 16px rgba(2,209,186,0.35)",
              position: "relative",
            }}
          >
            <img
              src="/rayan-portrait-240.webp"
              srcSet="/rayan-portrait-240.webp 240w, /rayan-portrait-480.webp 480w"
              sizes="56px"
              alt="Rayan Bonte"
              width={240} height={240}
              loading="eager"
              decoding="async"
              style={{
                width: "100%", height: "100%",
                objectFit: "cover", objectPosition: "center 25%",
                display: "block",
              }}
            />
          </div>
          <div style={{ textAlign: "left" }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", lineHeight: 1.2 }}>
              Rayan Bonte
            </div>
            <div
              style={{
                fontSize: 11, color: "rgba(255,255,255,0.62)",
                letterSpacing: "0.3px", marginTop: 2,
              }}
            >
              Athlète · Fondateur RB Perform
            </div>
          </div>
        </div>

        {/* Divider */}
        <div
          aria-hidden="true"
          style={{
            height: 1, width: 64,
            background: "rgba(255,255,255,0.1)",
            margin: "0 auto 56px",
          }}
        />

        {/* Ce que tu reçois */}
        <div
          className="liste-anim"
          style={{ marginBottom: 56, animation: "liste_fadeUp 0.7s ease 0.5s both" }}
        >
          <div
            style={{
              fontSize: 10, letterSpacing: "4px", textTransform: "uppercase",
              color: "rgba(255,255,255,0.62)", fontWeight: 700, marginBottom: 28,
            }}
          >
            Ce que tu reçois
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
            {[
              { t: "110 pages éditoriales premium", d: "Le book MÉTHODE ATHLÈTE COMPLET — édition 2026 numérotée." },
              { t: "Programme ATHLÈTE 90 — 12 semaines", d: "+60 séances détaillées sur 3 blocs PPG → PPS → Affûtage." },
              { t: "Nutrition athlète + 12 recettes", d: "Macros, timing, hydratation, électrolytes. Plats calculés." },
              { t: "Mobilité, récup, mindset", d: "Tout ce qui se passe en dehors de l'entraînement — et qui décide de ta progression." },
              { t: "★ Programme sur l'app RB Perform", d: "Pas un PDF figé. Tes séances dans l'app, tes charges sauvegardées. Réservé aux 30 premiers.", featured: true },
            ].map((x, i) => (
              <div
                key={i}
                style={{
                  maxWidth: 480, marginLeft: "auto", marginRight: "auto",
                  ...(x.featured ? {
                    padding: "20px 24px",
                    background: "linear-gradient(135deg, rgba(2,209,186,0.08), rgba(2,209,186,0.02))",
                    border: "1px solid rgba(2,209,186,0.3)",
                    borderRadius: 16,
                    boxShadow: "0 0 30px rgba(2,209,186,0.08)",
                  } : {}),
                }}
              >
                <div
                  style={{
                    fontSize: x.featured ? 17 : 16,
                    fontWeight: x.featured ? 800 : 700,
                    color: x.featured ? GREEN : "#fff",
                    marginBottom: x.d ? 6 : 0,
                    letterSpacing: x.featured ? "-0.2px" : 0,
                  }}
                >
                  {x.t}
                </div>
                {x.d && (
                  <div
                    style={{
                      fontSize: 13,
                      color: x.featured ? "rgba(255,255,255,0.78)" : "rgba(255,255,255,0.7)",
                      lineHeight: 1.6,
                    }}
                  >
                    {x.d}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div aria-hidden="true" style={{ height: 1, width: 64, background: "rgba(255,255,255,0.1)", margin: "0 auto 56px" }} />

        {/* Comment ça marche — 3 steps */}
        <div className="liste-anim" style={{ marginBottom: 32, animation: "liste_fadeUp 0.7s ease 0.7s both" }}>
          <div style={{ fontSize: 10, letterSpacing: "4px", textTransform: "uppercase", color: "rgba(255,255,255,0.62)", fontWeight: 700, marginBottom: 28 }}>
            Comment ça marche
          </div>
          <div
            style={{
              display: "grid", gap: 14,
              gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
              maxWidth: 540, marginLeft: "auto", marginRight: "auto",
            }}
          >
            {[
              { n: "01", t: "Tu t'inscris", d: "Email + prénom. 30 secondes." },
              { n: "02", t: "Tu reçois le lien", d: "Dès la mise en ligne · ce mois de juin." },
              { n: "03", t: "Tu prends ta place", d: "30 premiers = app disponible." },
            ].map((step) => (
              <div
                key={step.n}
                style={{
                  borderRadius: 14,
                  border: "1px solid rgba(255,255,255,0.08)",
                  background: "rgba(255,255,255,0.02)",
                  padding: 18, textAlign: "left",
                }}
              >
                <div style={{ fontSize: 11, fontWeight: 800, color: GREEN, marginBottom: 8, letterSpacing: "0.5px" }}>{step.n}</div>
                <div style={{ fontSize: 13, fontWeight: 800, color: "#fff", marginBottom: 4 }}>{step.t}</div>
                <p style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", lineHeight: 1.55 }}>{step.d}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA final glow */}
        <div className="liste-anim" style={{ marginTop: 40, marginBottom: 24, animation: "liste_fadeUp 0.7s ease 0.8s both" }}>
          <a
            href="#form"
            style={{
              display: "inline-flex", alignItems: "center", gap: 10,
              padding: "18px 36px",
              background: `linear-gradient(135deg, ${GREEN} 0%, #00A38F 100%)`,
              color: "#050505",
              fontSize: 13, fontWeight: 900, letterSpacing: "0.15em",
              textTransform: "uppercase",
              textDecoration: "none",
              borderRadius: 100,
              boxShadow: "0 16px 40px rgba(2,209,186,0.22)",
              animation: "liste_ctaGlow 2s ease-in-out infinite",
              transition: "transform 0.2s",
            }}
          >
            <span
              style={{
                width: 8, height: 8, borderRadius: "50%",
                background: "#050505", opacity: 0.85,
                animation: "liste_breath60Scale 1s ease-in-out infinite",
              }}
            />
            Rejoindre la liste
          </a>
        </div>

        <p style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginBottom: 56 }}>
          Gratuit · Aucun engagement · Désinscription en 1 clic.
        </p>

        <div aria-hidden="true" style={{ height: 1, width: 64, background: "rgba(255,255,255,0.1)", margin: "0 auto 40px" }} />

        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>
          <div style={{ fontWeight: 800, color: "#fff", marginBottom: 4 }}>
            RB Perform — Édition 2026
          </div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>
            Méthode ATHLÈTE COMPLET · Sortie ce mois
          </div>
        </div>
      </div>
    </main>
  );
}

// ─── Form intégré → POST /api/waitlist ────────────────────────────────
// source : par défaut "methode-athlete" (vague 1). "methode-athlete-vague-2"
// pour le formulaire liste prioritaire affiché quand vague 1 sold-out.
function WaitlistForm({ source = "methode-athlete" }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle"); // idle | loading | success | error
  const [errMsg, setErrMsg] = useState("");
  const formRef = useRef(null);

  async function submit(e) {
    e.preventDefault();
    if (status === "loading") return;
    setStatus("loading");
    setErrMsg("");
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim() || null;
    try {
      const { error: dbErr } = await supabase.from("waitlist").insert({
        email: cleanEmail,
        name: cleanName || "",
        source,
      });
      if (dbErr && dbErr.code !== "23505") {
        setStatus("error");
        setErrMsg("Une erreur est survenue. Réessaie.");
        return;
      }
      setStatus("success");
    } catch (_) {
      setStatus("error");
      setErrMsg("Connexion impossible. Réessaie.");
      return;
    }
    try {
      fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: cleanName, email: cleanEmail, source }),
      }).catch(() => {});
    } catch (_) { /* silent */ }
  }

  if (status === "success") {
    return (
      <div
        style={{
          borderRadius: 14,
          background: "rgba(2,209,186,0.08)",
          border: "1px solid rgba(2,209,186,0.35)",
          padding: "22px 22px 20px",
          color: "#fff",
        }}
      >
        <div style={{ fontSize: 10, fontWeight: 800, color: GREEN, letterSpacing: 3, textTransform: "uppercase", marginBottom: 8 }}>
          · Tu es dans la liste
        </div>
        <div style={{ fontSize: 20, fontWeight: 900, letterSpacing: "-0.5px", marginBottom: 8 }}>
          Inscription confirmée.
        </div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", lineHeight: 1.6 }}>
          Tu recevras le lien direct vers la méthode <strong style={{ color: "#fff" }}>dès la mise en ligne ce mois de juin</strong>.
          Les 30 premiers acheteurs ont leur programme sur l'app — ça se joue à la rapidité.
        </div>
      </div>
    );
  }

  return (
    <form ref={formRef} onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <input
        type="text"
        placeholder="Prénom (facultatif)"
        value={name}
        onChange={(e) => setName(e.target.value)}
        autoComplete="given-name"
        maxLength={80}
        style={inputStyle}
      />
      <input
        type="email"
        placeholder="ton@email.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        autoComplete="email"
        required
        maxLength={254}
        style={inputStyle}
      />
      {status === "error" && errMsg && (
        <div style={{ fontSize: 12, color: "#ef4444", fontWeight: 600, marginTop: 2 }}>
          {errMsg}
        </div>
      )}
      <button
        type="submit"
        disabled={status === "loading" || !email}
        style={{
          marginTop: 4,
          padding: "16px 24px",
          background: status === "loading" ? "rgba(2,209,186,0.5)" : `linear-gradient(135deg, ${GREEN} 0%, #00A38F 100%)`,
          color: "#050505",
          border: "none", borderRadius: 100,
          fontSize: 13, fontWeight: 900,
          letterSpacing: "0.12em", textTransform: "uppercase",
          cursor: status === "loading" || !email ? "default" : "pointer",
          boxShadow: status === "loading" ? "none" : "0 12px 32px rgba(2,209,186,0.28)",
          opacity: !email ? 0.55 : 1,
          transition: "all 0.18s",
        }}
      >
        {status === "loading" ? "Envoi…" : "Je m'inscris"}
      </button>
      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginTop: 4 }}>
        Pas de spam. Désinscription en 1 clic. Données stockées en France (Supabase EU).
      </div>
    </form>
  );
}

const inputStyle = {
  width: "100%",
  padding: "14px 16px",
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 10,
  color: "#fff",
  fontSize: 14,
  fontFamily: "inherit",
  outline: "none",
  transition: "border-color 0.18s, background 0.18s",
};

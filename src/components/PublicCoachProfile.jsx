import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

const G = "#02d1ba";
const BG = "#050505";

const KEYFRAMES = `
@keyframes fadeUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
@keyframes shimmer { 0% { background-position: -200% center; } 100% { background-position: 200% center; } }
@keyframes breath60 { 0%, 100% { opacity: 1; } 50% { opacity: 0.55; } }
@keyframes breath60Scale { 0%, 100% { transform: scale(1); opacity: 0.55; } 50% { transform: scale(1.06); opacity: 0.85; } }
@keyframes ambientDrift { 0%, 100% { transform: translate(0, 0); } 50% { transform: translate(20px, -10px); } }
@keyframes ringPulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(2,209,186,0.55), 0 12px 40px rgba(2,209,186,0.35); } 50% { box-shadow: 0 0 0 8px rgba(2,209,186,0), 0 12px 40px rgba(2,209,186,0.45); } }
@keyframes ctaGlow { 0%, 100% { box-shadow: 0 16px 40px rgba(2,209,186,0.28); } 50% { box-shadow: 0 16px 56px rgba(2,209,186,0.5); } }
@media (prefers-reduced-motion: reduce) {
  * { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; }
}
`;

export default function PublicCoachProfile({ slug }) {
  const [coach, setCoach] = useState(null);
  const [testimonials, setTestimonials] = useState([]);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: c, error: ce } = await supabase
          .from("coaches")
          .select("id, full_name, brand_name, coaching_name, public_bio, public_specialties, public_photo_url, public_city, logo_url, accent_color, public_profile_enabled")
          .eq("public_slug", slug)
          .eq("public_profile_enabled", true)
          .maybeSingle();
        if (cancelled) return;
        if (ce) throw ce;
        if (!c) { setStatus("notfound"); return; }
        setCoach(c);

        const { data: t } = await supabase
          .from("coach_testimonials")
          .select("client_name, client_photo_url, content, rating, ordre")
          .eq("coach_id", c.id)
          .eq("visible", true)
          .order("ordre", { ascending: true })
          .limit(3);
        if (!cancelled) setTestimonials(t || []);
        setStatus("ok");
      } catch (e) {
        console.error("[PublicCoachProfile]", e);
        if (!cancelled) setStatus("error");
      }
    })();
    return () => { cancelled = true; };
  }, [slug]);

  useEffect(() => {
    if (coach) {
      const brand = coach.brand_name || coach.coaching_name || coach.full_name;
      document.title = `${brand} — Coach RB Perform`;
    }
  }, [coach]);

  if (status === "loading") {
    return (
      <div style={{ minHeight: "100dvh", background: BG, display: "grid", placeItems: "center" }}>
        <style>{KEYFRAMES}</style>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: G, animation: "breath60Scale 1s ease-in-out infinite", boxShadow: `0 0 12px ${G}` }} />
          <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, letterSpacing: "0.3em", textTransform: "uppercase", fontWeight: 700 }}>
            Chargement
          </div>
        </div>
      </div>
    );
  }

  if (status === "notfound" || status === "error") {
    return (
      <div style={{ minHeight: "100dvh", background: BG, display: "grid", placeItems: "center", padding: 24, textAlign: "center" }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: "0.4em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", marginBottom: 14, fontWeight: 700 }}>404</div>
          <div style={{ fontFamily: "'Inter',-apple-system,sans-serif", fontSize: 36, fontWeight: 900, color: "#fff", letterSpacing: "-0.03em", marginBottom: 12 }}>
            Coach introuvable<span style={{ color: G }}>.</span>
          </div>
          <div style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", maxWidth: 360, lineHeight: 1.65, margin: "0 auto" }}>
            Cette vitrine n'existe pas ou a été masquée. Découvre RB Perform sur{" "}
            <a href="/" style={{ color: G, textDecoration: "none", fontWeight: 700, borderBottom: `1px solid ${G}66`, paddingBottom: 1 }}>rbperform.app</a>.
          </div>
        </div>
      </div>
    );
  }

  const accent = coach.accent_color || G;
  const accentHex = accent.startsWith("#") ? accent : G;
  const brand = coach.brand_name || coach.coaching_name || coach.full_name;
  const photo = coach.public_photo_url || coach.logo_url;
  const specialties = Array.isArray(coach.public_specialties) ? coach.public_specialties.filter(Boolean) : [];

  return (
    <main style={{ minHeight: "100dvh", background: BG, color: "#fff", fontFamily: "-apple-system,Inter,sans-serif", overflow: "hidden", position: "relative" }}>
      <style>{KEYFRAMES}</style>

      {/* Ambient gradients drift */}
      <div aria-hidden="true" style={{ position: "fixed", top: "-10%", left: "-10%", width: "60%", height: "60%", background: `radial-gradient(circle, ${accentHex}14, transparent 60%)`, pointerEvents: "none", animation: "ambientDrift 12s ease-in-out infinite", willChange: "transform" }} />
      <div aria-hidden="true" style={{ position: "fixed", bottom: "-10%", right: "-10%", width: "60%", height: "60%", background: `radial-gradient(circle, ${accentHex}0f, transparent 60%)`, pointerEvents: "none", animation: "ambientDrift 14s ease-in-out infinite reverse", willChange: "transform" }} />

      <div style={{ maxWidth: 640, margin: "0 auto", padding: "56px 24px 100px", position: "relative", zIndex: 1, textAlign: "center" }}>

        {/* Eyebrow */}
        <div style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "8px 16px", background: `${accentHex}10`, border: `1px solid ${accentHex}33`, borderRadius: 100, marginBottom: 36, animation: "fadeUp 0.6s ease 0.05s both" }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: accentHex, animation: "breath60 1s ease-in-out infinite", boxShadow: `0 0 8px ${accentHex}80` }} />
          <div style={{ fontSize: 10, letterSpacing: "3px", textTransform: "uppercase", color: accentHex, fontWeight: 700 }}>Coach Performance · Disponible</div>
        </div>

        {/* Photo hero — ring breath */}
        {photo ? (
          <div style={{ display: "inline-block", marginBottom: 28, animation: "fadeUp 0.7s ease 0.1s both" }}>
            <div style={{ width: 132, height: 132, borderRadius: "50%", overflow: "hidden", border: `2px solid ${accentHex}`, animation: "ringPulse 2.4s ease-in-out infinite" }}>
              <img
                src={photo}
                alt={brand}
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              />
            </div>
          </div>
        ) : (
          <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 132, height: 132, borderRadius: "50%", background: `linear-gradient(135deg, ${accentHex}, ${accentHex}66)`, fontSize: 46, fontWeight: 900, color: "#000", marginBottom: 28, fontFamily: "'Inter',sans-serif", letterSpacing: "-1px", animation: "fadeUp 0.7s ease 0.1s both, ringPulse 2.4s ease-in-out infinite" }}>
            {(brand || "C").slice(0, 2).toUpperCase()}
          </div>
        )}

        {/* Hero title — shimmer */}
        <h1 style={{ fontFamily: "'Inter',-apple-system,sans-serif", fontSize: "clamp(38px, 7vw, 60px)", fontWeight: 900, letterSpacing: "-0.03em", lineHeight: 1.0, marginBottom: 14 }}>
          <span style={{ background: `linear-gradient(90deg, ${accentHex}, #ffffff, ${accentHex})`, backgroundSize: "200% auto", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", animation: "shimmer 7s linear infinite" }}>
            {brand}
          </span>
          <span style={{ color: accentHex }}>.</span>
        </h1>

        {coach.public_city && (
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", letterSpacing: "0.2em", textTransform: "uppercase", fontWeight: 600, marginBottom: 8, animation: "fadeUp 0.7s ease 0.2s both" }}>
            {coach.public_city}
          </div>
        )}

        {coach.full_name && coach.full_name !== brand && (
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", marginBottom: 8, animation: "fadeUp 0.7s ease 0.25s both" }}>
            par {coach.full_name}
          </div>
        )}

        {/* BIO */}
        {coach.public_bio && (
          <div style={{ marginTop: 36, padding: "26px 28px", background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 20, textAlign: "left", animation: "fadeUp 0.7s ease 0.3s both" }}>
            <div style={{ fontSize: 9, letterSpacing: "0.4em", textTransform: "uppercase", color: `${accentHex}cc`, fontWeight: 700, marginBottom: 12 }}>
              À propos
            </div>
            <div style={{ fontSize: 15, color: "rgba(255,255,255,0.82)", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
              {coach.public_bio}
            </div>
          </div>
        )}

        {/* SPÉCIALITÉS */}
        {specialties.length > 0 && (
          <div style={{ marginTop: 36, animation: "fadeUp 0.7s ease 0.4s both" }}>
            <div style={{ fontSize: 9, letterSpacing: "0.4em", textTransform: "uppercase", color: "rgba(255,255,255,0.42)", fontWeight: 700, marginBottom: 16 }}>
              Spécialités
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
              {specialties.map((s, i) => (
                <span key={i} style={{
                  padding: "10px 16px",
                  background: `${accentHex}10`,
                  border: `1px solid ${accentHex}40`,
                  borderRadius: 100,
                  fontSize: 12,
                  fontWeight: 700,
                  color: "#fff",
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                }}>
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* TÉMOIGNAGES */}
        {testimonials.length > 0 && (
          <div style={{ marginTop: 56, animation: "fadeUp 0.7s ease 0.5s both" }}>
            <div style={{ fontSize: 9, letterSpacing: "0.4em", textTransform: "uppercase", color: "rgba(255,255,255,0.42)", fontWeight: 700, marginBottom: 20 }}>
              Ils témoignent
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {testimonials.map((t, i) => (
                <div key={i} style={{
                  padding: "22px 24px",
                  background: "linear-gradient(135deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))",
                  border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: 18,
                  textAlign: "left",
                  position: "relative",
                  overflow: "hidden",
                }}>
                  {/* Quote mark décoratif */}
                  <div aria-hidden="true" style={{ position: "absolute", top: -8, right: 14, fontSize: 90, color: `${accentHex}10`, fontFamily: "Georgia,serif", lineHeight: 1, fontWeight: 900, pointerEvents: "none" }}>
                    "
                  </div>
                  {t.rating && (
                    <div style={{ marginBottom: 12, color: "#fbbf24", fontSize: 14, letterSpacing: 3 }}>
                      {"★".repeat(Math.max(1, Math.min(5, t.rating)))}
                      <span style={{ color: "rgba(255,255,255,0.12)" }}>
                        {"★".repeat(5 - Math.max(1, Math.min(5, t.rating)))}
                      </span>
                    </div>
                  )}
                  <div style={{ fontSize: 14, color: "rgba(255,255,255,0.85)", lineHeight: 1.7, marginBottom: 16, position: "relative", zIndex: 1 }}>
                    « {t.content} »
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    {t.client_photo_url ? (
                      <img src={t.client_photo_url} alt={t.client_name} style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover", border: `1px solid ${accentHex}40` }} />
                    ) : (
                      <div style={{ width: 36, height: 36, borderRadius: "50%", background: `${accentHex}22`, display: "grid", placeItems: "center", fontSize: 13, fontWeight: 800, color: accentHex, border: `1px solid ${accentHex}40` }}>
                        {(t.client_name || "?")[0]?.toUpperCase()}
                      </div>
                    )}
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", lineHeight: 1.2 }}>
                        {t.client_name}
                      </div>
                      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", letterSpacing: "0.15em", textTransform: "uppercase", marginTop: 2, fontWeight: 600 }}>
                        Client vérifié
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CTA */}
        <div style={{ marginTop: 56, animation: "fadeUp 0.7s ease 0.6s both" }}>
          <a
            href="/candidature"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 12,
              textDecoration: "none",
              padding: "18px 32px",
              background: `linear-gradient(135deg, ${accentHex}, ${accentHex}cc)`,
              color: "#000",
              borderRadius: 100,
              fontSize: 14,
              fontWeight: 800,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              animation: "ctaGlow 2.4s ease-in-out infinite",
              transition: "transform 0.2s cubic-bezier(0.22, 1, 0.36, 1)",
              cursor: "pointer",
            }}
            onMouseDown={e => e.currentTarget.style.transform = "scale(0.97)"}
            onMouseUp={e => e.currentTarget.style.transform = "scale(1)"}
            onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
          >
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#000", animation: "breath60Scale 1s ease-in-out infinite" }} />
            Travailler avec moi
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 2 }}>
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </a>
          <div style={{ marginTop: 16, fontSize: 11, color: "rgba(255,255,255,0.42)", letterSpacing: "0.15em", textTransform: "uppercase", fontWeight: 600 }}>
            Sélection sur dossier · 5 places
          </div>
        </div>

        {/* FOOTER */}
        <div style={{ marginTop: 80, paddingTop: 28, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ fontSize: 9, letterSpacing: "0.4em", textTransform: "uppercase", color: "rgba(255,255,255,0.28)", fontWeight: 700 }}>
            Propulsé par{" "}
            <a href="/" style={{ color: "rgba(255,255,255,0.55)", textDecoration: "none", fontWeight: 800, borderBottom: "1px solid rgba(255,255,255,0.15)", paddingBottom: 1 }}>
              RB Perform
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}

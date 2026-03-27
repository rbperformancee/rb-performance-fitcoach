import React, { useState, useEffect, useRef } from "react";
import { PrivacyPolicy } from "./PrivacyPolicy";
import { LOGO_B64 } from "../utils/logo";

function Particles() {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const particles = Array.from({ length: 40 }, () => ({
      x: Math.random() * canvas.width, y: Math.random() * canvas.height,
      r: Math.random() * 1.5 + 0.3, dx: (Math.random() - 0.5) * 0.3, dy: (Math.random() - 0.5) * 0.3,
      opacity: Math.random() * 0.4 + 0.1,
    }));
    let raf;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(2,209,186,${p.opacity})`; ctx.fill();
        p.x += p.dx; p.y += p.dy;
        if (p.x < 0 || p.x > canvas.width) p.dx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.dy *= -1;
      });
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, []);
  return <canvas ref={canvasRef} style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }} />;
}

const PHRASES = [
  ["LA PERFORMANCE", "N'ATTEND PAS."],
  ["CHAQUE SÉANCE", "COMPTE."],
  ["TON CORPS.", "TON PROGRAMME."],
  ["ZERO EXCUSE.", "MAX RÉSULTAT."],
];

export function LoginScreen({ onSendMagicLink, loading }) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [focused, setFocused] = useState(false);
  const [btnHover, setBtnHover] = useState(false);
  const [btnPress, setBtnPress] = useState(false);
  const [phraseIdx] = useState(() => Math.floor(Math.random() * PHRASES.length));
  const phrase = PHRASES[phraseIdx];
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && accepted;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (valid && !loading) {
      if (navigator.vibrate) navigator.vibrate([20, 10, 40]);
      onSendMagicLink(email);
      setSent(true);
    }
  };

  return (
    <>
      {showPrivacy && <PrivacyPolicy onClose={() => setShowPrivacy(false)} />}
      <Particles />
      <div style={{ minHeight: "100vh", background: "radial-gradient(ellipse at 50% 0%, rgba(2,209,186,0.07) 0%, #0d0d0d 60%)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px 24px", fontFamily: "\'Inter\', -apple-system, sans-serif", position: "relative", zIndex: 1 }}>
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, height: 2, background: "linear-gradient(90deg, transparent 0%, #02d1ba 50%, transparent 100%)", opacity: 0.7 }} />
        <div style={{ width: "100%", maxWidth: 360 }}>
          <div style={{ textAlign: "center", marginBottom: 44 }}>
            <div style={{ display: "inline-block", position: "relative", marginBottom: 24 }}>
              <div style={{ position: "absolute", inset: -10, borderRadius: 36, background: "radial-gradient(circle, rgba(2,209,186,0.18) 0%, transparent 70%)", animation: "pulse 3s ease-in-out infinite" }} />
              <img src={LOGO_B64} alt="RB PERFORM" style={{ width: 84, height: 84, objectFit: "cover", objectPosition: "center 60%", display: "block", borderRadius: 20, boxShadow: "0 0 0 1px rgba(2,209,186,0.2), 0 20px 60px rgba(2,209,186,0.12)", position: "relative" }} />
            </div>
            <div style={{ marginBottom: 14 }}>
              {[phrase[0], phrase[1]].map((line, li) => (
                <div key={li} style={{ fontSize: 34, fontWeight: 900, letterSpacing: "-2px", lineHeight: 1.0, color: li === 0 ? "#f5f5f5" : "#02d1ba", overflow: "hidden" }}>
                  {line.split("").map((char, ci) => (
                    <span key={ci} style={{
                      display: "inline-block",
                      animation: `letterReveal 0.4s ease ${li * 0.15 + ci * 0.03}s both`,
                    }}>{char === " " ? " " : char}</span>
                  ))}
                </div>
              ))}
            </div>
            <p style={{ fontSize: 11, color: "#4b5563", fontWeight: 600, letterSpacing: "2px", textTransform: "uppercase", animation: "fadeInUp 0.5s ease 0.2s both", margin: 0 }}>Programmes d'entraînement personnalisés</p>
          </div>

          {!sent ? (
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ position: "relative", animation: "fadeInUp 0.5s ease 0.3s both" }}>
                <input type="email" placeholder="ton@email.com" value={email} onChange={e => setEmail(e.target.value)} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} autoFocus
                  style={{ width: "100%", boxSizing: "border-box", background: focused ? "rgba(2,209,186,0.04)" : "rgba(255,255,255,0.03)", border: `1.5px solid ${focused ? "rgba(2,209,186,0.5)" : "rgba(255,255,255,0.08)"}`, borderRadius: 14, padding: "16px 18px", color: "#f5f5f5", fontSize: 15, fontFamily: "inherit", outline: "none", transition: "all 0.2s", boxShadow: focused ? "0 0 0 4px rgba(2,209,186,0.08)" : "none" }} />
                {email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && (
                  <div style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", color: "#02d1ba", fontSize: 16, animation: "bounceIn 0.3s ease" }}>✓</div>
                )}
              </div>

              <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer", animation: "fadeInUp 0.5s ease 0.4s both" }}>
                <div onClick={() => { setAccepted(a => !a); if (navigator.vibrate) navigator.vibrate(10); }}
                  style={{ width: 18, height: 18, borderRadius: 5, flexShrink: 0, marginTop: 2, background: accepted ? "#02d1ba" : "transparent", border: `1.5px solid ${accepted ? "#02d1ba" : "rgba(255,255,255,0.2)"}`, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s", cursor: "pointer" }}>
                  {accepted && <span style={{ fontSize: 10, color: "#0d0d0d", fontWeight: 900 }}>✓</span>}
                </div>
                <span style={{ fontSize: 11, color: "#4b5563", lineHeight: 1.6 }}>
                  J'accepte la{" "}
                  <button type="button" onClick={() => setShowPrivacy(true)} style={{ background: "none", border: "none", color: "#02d1ba", cursor: "pointer", fontSize: 11, padding: 0, textDecoration: "underline" }}>politique de confidentialité</button>
                  {" "}et le traitement de mes données RGPD.
                </span>
              </label>

              <button type="submit" disabled={!valid || loading}
                onMouseEnter={() => setBtnHover(true)} onMouseLeave={() => { setBtnHover(false); setBtnPress(false); }}
                onMouseDown={() => setBtnPress(true)} onMouseUp={() => setBtnPress(false)}
                onTouchStart={() => setBtnPress(true)} onTouchEnd={() => setBtnPress(false)}
                style={{ marginTop: 4, width: "100%", padding: "17px", borderRadius: 14, border: "none", background: valid ? (btnPress ? "#00b5a0" : btnHover ? "#00c4b0" : "#02d1ba") : "rgba(255,255,255,0.06)", color: valid ? "#0d0d0d" : "#374151", fontSize: 14, fontWeight: 800, letterSpacing: "1px", textTransform: "uppercase", cursor: valid ? "pointer" : "not-allowed", transition: "all 0.15s", transform: btnPress && valid ? "scale(0.98)" : "scale(1)", boxShadow: valid ? (btnHover ? "0 8px 30px rgba(2,209,186,0.4)" : "0 4px 20px rgba(2,209,186,0.25)") : "none", animation: "fadeInUp 0.5s ease 0.5s both" }}>
                {loading ? <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}><div style={{ width: 14, height: 14, border: "2px solid rgba(13,13,13,0.3)", borderTopColor: "#0d0d0d", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />Envoi...</span> : "Accéder à mon programme →"}
              </button>

              <p style={{ textAlign: "center", fontSize: 11, color: "#374151", margin: "4px 0 0", animation: "fadeInUp 0.5s ease 0.6s both" }}>Lien magique par email — aucun mot de passe</p>
            </form>
          ) : (
            <div style={{ textAlign: "center", padding: "32px 0", animation: "fadeInUp 0.4s ease" }}>
              <div style={{ fontSize: 56, marginBottom: 16 }}>⚡</div>
              <h2 style={{ fontSize: 22, fontWeight: 900, color: "#f5f5f5", margin: "0 0 10px", letterSpacing: "-0.5px" }}>Check tes emails</h2>
              <p style={{ color: "#6b7280", fontSize: 13, lineHeight: 1.7, margin: 0 }}>
                Lien envoyé à<br /><span style={{ color: "#02d1ba", fontWeight: 700 }}>{email}</span><br />Clique dessus pour accéder à ton programme.
              </p>
              <div style={{ marginTop: 24, padding: "12px 16px", background: "rgba(2,209,186,0.06)", border: "1px solid rgba(2,209,186,0.12)", borderRadius: 12 }}>
                <p style={{ color: "#4b5563", fontSize: 11, margin: 0 }}>Vérifie tes spams si tu ne vois pas l'email.</p>
              </div>
            </div>
          )}
        </div>
        <div style={{ position: "fixed", bottom: 20, fontSize: 10, color: "#1f2937", letterSpacing: "1.5px", fontWeight: 600, textTransform: "uppercase" }}>RB PERFORM · SIRET 99063780300018</div>
        <style>{`
          @keyframes fadeInUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
          @keyframes letterReveal { from { opacity:0; transform:translateY(20px) skewY(3deg); } to { opacity:1; transform:translateY(0) skewY(0deg); } }
          @keyframes bounceIn { 0%{transform:translateY(-50%) scale(0);} 70%{transform:translateY(-50%) scale(1.2);} 100%{transform:translateY(-50%) scale(1);} }
          @keyframes pulse { 0%,100%{opacity:0.5;transform:scale(1);} 50%{opacity:1;transform:scale(1.05);} }
          @keyframes spin { to{transform:rotate(360deg);} }
          input::placeholder{color:#374151;}
        `}</style>
      </div>
    </>
  );
}
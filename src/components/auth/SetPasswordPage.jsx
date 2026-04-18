import React, { useState } from "react";
import { supabase } from "../../lib/supabase";

/**
 * SetPasswordPage — le coach crée son mot de passe après paiement Stripe.
 *
 * Flow :
 *   1. Coach paie sur Stripe
 *   2. Webhook crée le compte Supabase + envoie un lien recovery
 *   3. Le coach clique sur le lien → arrive ici avec un token dans l'URL
 *   4. Il définit son mot de passe
 *   5. Redirect vers le dashboard
 *
 * Supabase gère automatiquement le token dans l'URL via onAuthStateChange.
 */
export default function SetPasswordPage({ onComplete }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const valid = password.length >= 8 && password === confirm;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!valid) return;

    setLoading(true);
    setError("");

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) {
        setError(updateError.message);
        setLoading(false);
        return;
      }

      setDone(true);
      setTimeout(() => {
        onComplete?.();
      }, 2000);
    } catch (err) {
      setError(err.message || "Erreur. Réessaie.");
      setLoading(false);
    }
  };

  const G = "#02d1ba";

  if (done) {
    return (
      <div style={container}>
        <div style={{ animation: "spFade 0.5s ease both", textAlign: "center" }}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: `linear-gradient(135deg, ${G}, ${G}cc)`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px", fontSize: 28, color: "#000", boxShadow: `0 12px 40px ${G}50` }}>✓</div>
          <h1 style={title}>C'est prêt.</h1>
          <p style={sub}>Redirection vers ton dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={container}>
      <style>{`
        @keyframes spFade{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        input::placeholder{color:rgba(255,255,255,0.2)}
      `}</style>

      <div style={{ position: "fixed", top: "-10%", left: "50%", transform: "translateX(-50%)", width: 500, height: 500, background: `radial-gradient(circle, ${G}12, transparent 65%)`, borderRadius: "50%", filter: "blur(80px)", pointerEvents: "none" }} />

      <div style={{ position: "relative", zIndex: 1, maxWidth: 400, width: "100%", animation: "spFade 0.4s ease both" }}>

        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 14, fontWeight: 900, letterSpacing: ".1em", color: "#fff", marginBottom: 28 }}>
            RB<span style={{ color: G }}>PERFORM</span>
          </div>
          <h1 style={title}>Crée ton mot de passe.</h1>
          <p style={sub}>Tu l'utiliseras pour te connecter à ton dashboard.</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <div style={label}>Mot de passe</div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="8 caractères minimum"
              autoFocus
              style={input}
            />
          </div>
          <div>
            <div style={label}>Confirmer</div>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Même mot de passe"
              style={input}
            />
          </div>

          {password && confirm && password !== confirm && (
            <div style={{ fontSize: 12, color: "#ff6b6b" }}>Les mots de passe ne correspondent pas.</div>
          )}
          {password && password.length < 8 && (
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>8 caractères minimum.</div>
          )}
          {error && (
            <div style={{ fontSize: 12, color: "#ff6b6b" }}>{error}</div>
          )}

          <button
            type="submit"
            disabled={!valid || loading}
            style={{
              padding: 17,
              background: valid ? `linear-gradient(135deg, ${G}, ${G}cc)` : "rgba(255,255,255,0.04)",
              color: valid ? "#000" : "rgba(255,255,255,0.25)",
              border: "none", borderRadius: 16, fontSize: 14, fontWeight: 800,
              cursor: valid ? "pointer" : "not-allowed",
              fontFamily: "inherit", textTransform: "uppercase", letterSpacing: "0.5px",
              boxShadow: valid ? `0 8px 32px ${G}40` : "none",
              transition: "all 0.2s",
              marginTop: 8,
            }}
          >
            {loading ? "Création..." : "Créer mon mot de passe →"}
          </button>
        </form>

      </div>
    </div>
  );
}

const container = {
  minHeight: "100vh",
  background: "#050505",
  fontFamily: "-apple-system, Inter, sans-serif",
  color: "#fff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 24,
  position: "relative",
  overflow: "hidden",
};

const title = {
  fontSize: 32,
  fontWeight: 900,
  letterSpacing: "-1.5px",
  lineHeight: 1,
  marginBottom: 8,
  color: "#fff",
};

const sub = {
  fontSize: 14,
  color: "rgba(255,255,255,0.4)",
  lineHeight: 1.6,
};

const label = {
  fontSize: 10,
  letterSpacing: "2px",
  textTransform: "uppercase",
  color: "rgba(255,255,255,0.35)",
  marginBottom: 8,
  fontWeight: 600,
};

const input = {
  width: "100%",
  padding: "14px 16px",
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 14,
  color: "#fff",
  fontSize: 16,
  outline: "none",
  boxSizing: "border-box",
  fontFamily: "inherit",
};

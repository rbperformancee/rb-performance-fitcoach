import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import haptic from "../lib/haptic";
import Spinner from "./Spinner";
import { useT } from "../lib/i18n";

const G = "#02d1ba";

/**
 * CoachCodeGate — affichee a un client qui n'a pas encore de coach_id.
 * L'utilisateur entre le code 6 chiffres de son coach.
 * Le client est rattache au coach via coach_id dans la table clients.
 *
 * Props :
 *   client : { id, email, coach_id }
 *   onLinked : callback appele quand le rattachement est reussi
 */
export default function CoachCodeGate({ client, onLinked }) {
  const t = useT();
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [foundCoach, setFoundCoach] = useState(null);

  // Auto-detect si le lien d'invitation a un slug dans l'URL (?coach=slug)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const slug = params.get("coach") || params.get("c");
    if (slug && !foundCoach) {
      supabase
        .from("coaches")
        .select("id,brand_name,full_name,accent_color,coach_code")
        .eq("coach_slug", slug)
        .single()
        .then(({ data }) => {
          if (data) {
            setFoundCoach(data);
            setCode(String(data.coach_code || "").padEnd(6, " ").slice(0, 6).split(""));
          }
        });
    }
    // Run once au mount pour detecter le deep-link
  }, []); // eslint-disable-line

  const handleChange = (i, val) => {
    const digit = val.replace(/\D/g, "").slice(-1);
    const next = [...code];
    next[i] = digit;
    setCode(next);
    setError(null);
    // Auto-focus field suivant
    if (digit && i < 5) {
      const el = document.getElementById(`code-${i + 1}`);
      el?.focus();
    }
  };

  const handleKeyDown = (i, e) => {
    if (e.key === "Backspace" && !code[i] && i > 0) {
      const el = document.getElementById(`code-${i - 1}`);
      el?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = (e.clipboardData.getData("text") || "").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      setCode(pasted.split(""));
      setError(null);
    }
  };

  const validate = async () => {
    const full = code.join("");
    if (full.length !== 6) {
      setError(t("ccg.error_6digits"));
      return;
    }
    setLoading(true);
    setError(null);
    haptic.light();
    try {
      // Trouver le coach
      const { data: coach, error: coachErr } = await supabase
        .from("coaches")
        .select("id,brand_name,full_name,accent_color")
        .eq("coach_code", full)
        .maybeSingle();

      if (coachErr || !coach) {
        haptic.error();
        setError(t("ccg.error_invalid_code"));
        setLoading(false);
        return;
      }

      // Rattacher le client
      if (client?.id) {
        await supabase.from("clients").update({ coach_id: coach.id }).eq("id", client.id);
      } else if (client?.email) {
        // Si client n'existe pas encore, on le cree
        await supabase.from("clients").insert({
          email: client.email.toLowerCase().trim(),
          coach_id: coach.id,
          full_name: (client.email.split("@")[0] || "").slice(0, 40),
        });
      }

      // Tracker l'invitation
      await supabase.from("coach_invitations").insert({
        coach_id: coach.id,
        client_email: client?.email || null,
        client_id: client?.id || null,
        method: foundCoach ? "link" : "code",
        code_used: full,
        accepted_at: new Date().toISOString(),
      });

      setFoundCoach(coach);
      haptic.success();
      setTimeout(() => onLinked?.(coach), 900);
    } catch (e) {
      setError(e.message || t("ccg.error_generic"));
      setLoading(false);
    }
  };

  const accent = foundCoach?.accent_color || G;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#050505",
        color: "#fff",
        fontFamily: "-apple-system,Inter,sans-serif",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 24px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <style>{`@keyframes gFadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {/* Ambient glow */}
      <div style={{ position: "absolute", top: "-5%", left: "50%", transform: "translateX(-50%)", width: 500, height: 500, background: `radial-gradient(circle, ${accent}26, transparent 65%)`, borderRadius: "50%", filter: "blur(90px)", pointerEvents: "none" }} />

      <div style={{ position: "relative", zIndex: 1, maxWidth: 400, width: "100%", textAlign: "center", animation: "gFadeUp 0.5s ease both" }}>

        {foundCoach ? (
          // ===== ECRAN CONFIRMATION =====
          <>
            <div style={{ fontSize: 10, letterSpacing: "5px", textTransform: "uppercase", color: accent, marginBottom: 16, fontWeight: 700 }}>
              {t("ccg.linked_eyebrow")}
            </div>
            <h1 style={{ fontSize: 38, fontWeight: 900, letterSpacing: "-2px", color: "#fff", margin: "0 0 14px", lineHeight: 0.95 }}>
              {t("ccg.you_join")}<br />
              <span style={{ color: accent }}>{foundCoach.brand_name || foundCoach.full_name}.</span>
            </h1>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", lineHeight: 1.7 }}>
              {t("ccg.linked_subtitle")}
            </p>
          </>
        ) : (
          // ===== ECRAN SAISIE =====
          <>
            <div style={{ fontSize: 10, letterSpacing: "5px", textTransform: "uppercase", color: "rgba(2,209,186,0.6)", marginBottom: 16, fontWeight: 700 }}>
              {t("ccg.welcome_eyebrow")}
            </div>
            <h1 style={{ fontSize: 32, fontWeight: 900, letterSpacing: "-1.5px", color: "#fff", margin: "0 0 14px", lineHeight: 0.95 }}>
              {t("ccg.title_p1")}<br />
              <span style={{ color: accent }}>{t("ccg.title_p2")}</span>
            </h1>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", lineHeight: 1.7, marginBottom: 30 }}>
              {t("ccg.subtitle")}
            </p>

            {/* 6 champs code */}
            <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 22 }} onPaste={handlePaste}>
              {code.map((c, i) => (
                <input
                  key={i}
                  id={`code-${i}`}
                  type="tel"
                  inputMode="numeric"
                  maxLength={1}
                  autoFocus={i === 0}
                  value={c}
                  onChange={(e) => handleChange(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  style={{
                    width: 46,
                    height: 58,
                    background: "rgba(255,255,255,0.04)",
                    border: `1.5px solid ${error ? "#ef4444" : c ? accent : "rgba(255,255,255,0.1)"}`,
                    borderRadius: 12,
                    fontSize: 24,
                    fontWeight: 800,
                    textAlign: "center",
                    color: "#fff",
                    outline: "none",
                    fontFamily: "'JetBrains Mono',monospace",
                    transition: "border-color 0.15s",
                  }}
                />
              ))}
            </div>

            {error && (
              <div style={{ fontSize: 12, color: "#ef4444", marginBottom: 18, fontWeight: 600 }}>
                {error}
              </div>
            )}

            <button
              onClick={validate}
              disabled={loading || code.join("").length !== 6}
              style={{
                width: "100%",
                padding: 16,
                background: code.join("").length === 6 ? accent : "rgba(255,255,255,0.04)",
                color: code.join("").length === 6 ? "#000" : "rgba(255,255,255,0.3)",
                border: "none",
                borderRadius: 14,
                fontSize: 14,
                fontWeight: 800,
                letterSpacing: "1px",
                textTransform: "uppercase",
                cursor: code.join("").length === 6 ? "pointer" : "default",
                fontFamily: "inherit",
                transition: "all 0.2s",
                marginBottom: 20,
              }}
            >
              {loading ? (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                  <Spinner variant="dots" size={18} color="#000" />
                  {t("ccg.btn_verifying")}
                </span>
              ) : t("ccg.btn_join")}
            </button>

            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", lineHeight: 1.6 }}>
              {t("ccg.no_code_p1")}<br />{t("ccg.no_code_p2")}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

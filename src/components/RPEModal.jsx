import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import AppIcon from "./AppIcon";
import haptic from "../lib/haptic";
import { useT } from "../lib/i18n";

const GREEN = "#02d1ba";

const LABEL_KEYS = ["rpe.label_easy", "rpe.label_correct", "rpe.label_hard", "rpe.label_very_hard", "rpe.label_exhausting"];
const COLORS = ["#4ade80", "#02d1ba", "#f97316", "#ef4444", "#dc2626"];
const EMOJIS = ["😊", "💪", "😤", "😰", "🥵"];

export function RPEModal({ clientId, sessionName, onClose }) {
  const t = useT();
  const [rpe,  setRpe]  = useState(null);
  const [note, setNote] = useState("");
  const [saved, setSaved] = useState(false);

  // Escape key = fermer
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose?.(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const handleSave = async () => {
    if (!rpe || !clientId) return;
    haptic.success();
    await supabase.from("session_rpe").upsert({
      client_id: clientId,
      date: new Date().toISOString().slice(0, 10),
      rpe,
      note: note.trim() || null,
    }, { onConflict: "client_id,date" });
    setSaved(true);
    setTimeout(onClose, 1200);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="rpe-title"
      onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
      style={{
        position: "fixed", inset: 0, zIndex: 997,
        background: "rgba(0,0,0,0.85)", backdropFilter: "blur(20px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "24px", fontFamily: "'Inter',sans-serif",
      }}
    >
      <div style={{
        background: "#141414", border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 20, padding: 28, width: "100%", maxWidth: 400,
        animation: "fadeUp 0.3s ease",
      }}>
        <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}`}</style>

        {saved ? (
          <div style={{ textAlign: "center", padding: "24px 0" }}>
            <div style={{ width: 56, height: 56, borderRadius: "50%", background: `${GREEN}18`, border: `1px solid ${GREEN}40`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px", color: GREEN }}>
              <AppIcon name="check" size={28} color={GREEN} strokeWidth={2.5} />
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#f5f5f5" }}>{t("rpe.saved")}</div>
          </div>
        ) : (
          <>
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", color: GREEN, marginBottom: 8 }}>{t("rpe.eyebrow")}</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#f5f5f5" }}>{t("rpe.question")}</div>
              {sessionName && <div style={{ fontSize: 12, color: "#555", marginTop: 4 }}>{sessionName}</div>}
            </div>

            {/* Boutons RPE */}
            <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
              {[1,2,3,4,5].map(v => (
                <button key={v} onClick={() => setRpe(v)} style={{
                  flex: 1, padding: "12px 0",
                  background: rpe === v ? `${COLORS[v-1]}20` : "#1a1a1a",
                  border: `2px solid ${rpe === v ? COLORS[v-1] : "rgba(255,255,255,0.06)"}`,
                  borderRadius: 12,
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                  cursor: "pointer", transition: "all 0.15s",
                }}>
                  <span style={{ fontSize: 22 }}>{EMOJIS[v-1]}</span>
                  <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.5px", color: rpe === v ? COLORS[v-1] : "#555" }}>{v}</span>
                </button>
              ))}
            </div>
            {rpe && (
              <div style={{ textAlign: "center", marginBottom: 16, fontSize: 13, fontWeight: 600, color: COLORS[rpe-1] }}>
                {EMOJIS[rpe-1]} {t(LABEL_KEYS[rpe-1])}
              </div>
            )}

            {/* Note optionnelle */}
            <textarea
              placeholder={t("rpe.note_placeholder")}
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={2}
              style={{
                width: "100%", boxSizing: "border-box",
                background: "#1a1a1a", border: "1.5px solid rgba(255,255,255,0.07)",
                borderRadius: 10, padding: "10px 12px", color: "#f5f5f5",
                fontFamily: "'Inter',sans-serif", fontSize: 13,
                resize: "none", outline: "none", marginBottom: 16,
              }}
            />

            {/* Boutons */}
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={onClose} style={{
                flex: 1, padding: "12px", background: "none",
                border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10,
                color: "#555", fontSize: 12, fontWeight: 600, cursor: "pointer",
              }}>{t("rpe.btn_skip")}</button>
              <button onClick={handleSave} disabled={!rpe} style={{
                flex: 2, padding: "12px",
                background: rpe ? GREEN : "#1a1a1a", border: "none", borderRadius: 10,
                color: rpe ? "#0d0d0d" : "#444",
                fontSize: 13, fontWeight: 800, cursor: rpe ? "pointer" : "not-allowed",
                boxShadow: rpe ? "0 4px 16px rgba(2,209,186,0.3)" : "none",
              }}>{t("rpe.btn_save")}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

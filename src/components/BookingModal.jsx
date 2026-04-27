import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { toast } from "./Toast";
import { useT, getLocale } from "../lib/i18n";

const GREEN = "#02d1ba";
const intlLocale = () => getLocale() === "en" ? "en-US" : "fr-FR";

const fillTpl = (s, vars) => {
  let out = s;
  Object.entries(vars).forEach(([k, v]) => { out = out.split(`{${k}}`).join(String(v)); });
  return out;
};

// Modale de reservation d'un appel avec le coach.
// Reutilisable depuis :
// - OnboardingFlow etape 6 (premier appel decouverte)
// - TrainLocked Cycle accompli (appel de point / renouvellement)
// - N'importe quel autre endroit qui veut permettre une prise de rdv

export default function BookingModal({ client, onClose, onBooked, title, subtitle }) {
  const t = useT();
  const effectiveTitle = title ?? t("bm.default_title");
  const effectiveSubtitle = subtitle ?? t("bm.default_subtitle");
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [confirmedSlot, setConfirmedSlot] = useState(null);

  const fetchSlots = useCallback(async () => {
    setLoading(true);
    const today = new Date().toISOString().split("T")[0];
    const { data } = await supabase
      .from("coach_slots")
      .select("*")
      .eq("is_available", true)
      .gte("date", today)
      .order("date")
      .order("heure")
      .limit(30);
    setSlots(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSlots();
  }, [fetchSlots]);

  // Escape key = fermer
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose?.(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const bookSlot = async () => {
    if (!selectedSlot || !client?.id) return;
    setSaving(true);
    try {
      await supabase.from("bookings").insert({ client_id: client.id, slot_id: selectedSlot.id });
      await supabase.from("coach_slots").update({ is_available: false }).eq("id", selectedSlot.id);
      setConfirmedSlot(selectedSlot);
      if (onBooked) onBooked(selectedSlot);
      if (navigator.vibrate) navigator.vibrate([30, 10, 60]);
    } catch (e) {
      toast.error(fillTpl(t("bm.toast_error"), { msg: e.message || t("bm.error_unknown") }));
    }
    setSaving(false);
  };

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: "fixed", inset: 0, zIndex: 400,
        background: "rgba(0,0,0,0.88)", backdropFilter: "blur(12px)",
        display: "flex", alignItems: "flex-end", justifyContent: "center",
        fontFamily: "-apple-system,Inter,sans-serif",
      }}
    >
      <style>{`
        @keyframes bmSlideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes bmFadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <div style={{
        width: "100%", maxWidth: 480, maxHeight: "92vh",
        background: "linear-gradient(180deg, #0f0f0f 0%, #050505 100%)",
        borderRadius: "28px 28px 0 0",
        border: "1px solid rgba(2,209,186,0.15)", borderBottom: "none",
        display: "flex", flexDirection: "column", overflow: "hidden",
        animation: "bmSlideUp 0.35s cubic-bezier(0.22, 1, 0.36, 1) both",
      }}>
        {/* Handle */}
        <div style={{ width: 36, height: 4, background: "rgba(255,255,255,0.12)", borderRadius: 2, margin: "10px auto 14px" }} />

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 24px 16px", flexShrink: 0 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 9, letterSpacing: "3px", textTransform: "uppercase", color: "rgba(2,209,186,0.55)", marginBottom: 4, fontWeight: 700 }}>
              {t("bm.eyebrow")}
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#fff", letterSpacing: "-0.5px" }}>{effectiveTitle}</div>
          </div>
          <button
            onClick={onClose}
            aria-label={t("bm.close_aria")}
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 100, width: 34, height: 34, color: "rgba(255,255,255,0.5)", fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginLeft: 12, WebkitTapHighlightColor: "transparent" }}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "0 24px 24px", WebkitOverflowScrolling: "touch" }}>
          {/* ========== ETAT 1 : Confirmation apres booking ========== */}
          {confirmedSlot ? (
            <div style={{ textAlign: "center", padding: "24px 0 32px", animation: "bmFadeUp 0.5s ease both" }}>
              <div style={{
                width: 72, height: 72, borderRadius: "50%",
                background: "linear-gradient(135deg, " + GREEN + ", #0891b2)",
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 24px",
                fontSize: 32, color: "#000",
                boxShadow: "0 12px 40px rgba(2,209,186,0.4)",
              }}>✓</div>
              <div style={{ fontSize: 10, letterSpacing: "4px", textTransform: "uppercase", color: "rgba(2,209,186,0.6)", marginBottom: 12, fontWeight: 700 }}>
                {t("bm.confirmed_eyebrow")}
              </div>
              <div style={{ fontSize: 26, fontWeight: 900, color: "#fff", letterSpacing: "-1px", lineHeight: 1.1, marginBottom: 20 }}>
                {t("bm.confirmed_text_part1")}<br />
                <span style={{ color: GREEN, textTransform: "capitalize" }}>
                  {new Date(confirmedSlot.date + "T12:00:00").toLocaleDateString(intlLocale(), { weekday: "long", day: "numeric", month: "long" })}
                </span>
                <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 20, fontWeight: 700 }}> {fillTpl(t("bm.confirmed_text_part2"), { time: confirmedSlot.heure })}</span>
              </div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", lineHeight: 1.7, maxWidth: 320, margin: "0 auto 28px" }}>
                {t("bm.confirmed_note")}
              </div>
              <button
                onClick={onClose}
                style={{
                  width: "100%", maxWidth: 320, padding: 17,
                  background: "linear-gradient(135deg, " + GREEN + ", #0891b2)",
                  color: "#000", border: "none", borderRadius: 16,
                  fontSize: 14, fontWeight: 800, cursor: "pointer",
                  letterSpacing: "0.5px", textTransform: "uppercase",
                  boxShadow: "0 10px 36px rgba(2,209,186,0.35)",
                  WebkitTapHighlightColor: "transparent",
                  fontFamily: "-apple-system,Inter,sans-serif",
                }}
              >
                {t("bm.confirmed_btn")}
              </button>
            </div>
          ) : (
            <>
              {/* Subtitle */}
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", lineHeight: 1.7, marginBottom: 20, maxWidth: 400 }}>
                {effectiveSubtitle}
              </div>

              {/* Loading */}
              {loading && (
                <div style={{ display: "flex", justifyContent: "center", padding: "32px 0" }}>
                  <div style={{ display: "flex", gap: 5 }}>
                    {[0, 1, 2].map((i) => (
                      <div key={i} style={{
                        width: 7, height: 7, borderRadius: "50%", background: GREEN,
                        animation: `bmFadeUp 0.8s ease-in-out ${i * 0.15}s infinite alternate`,
                      }} />
                    ))}
                  </div>
                </div>
              )}

              {/* Empty */}
              {!loading && slots.length === 0 && (
                <div style={{ padding: 28, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 18, textAlign: "center" }}>
                  <div style={{ fontSize: 14, color: "rgba(255,255,255,0.45)", marginBottom: 6, fontWeight: 600 }}>
                    {t("bm.empty_title")}
                  </div>
                  <div style={{ fontSize: 12, color: GREEN, fontWeight: 600, letterSpacing: "0.3px" }}>
                    {t("bm.empty_subtitle")}
                  </div>
                </div>
              )}

              {/* Slots list */}
              {!loading && slots.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
                  {slots.map((slot) => {
                    const date = new Date(slot.date + "T12:00:00");
                    const isSelected = selectedSlot?.id === slot.id;
                    return (
                      <button
                        key={slot.id}
                        type="button"
                        onClick={() => setSelectedSlot(slot)}
                        style={{
                          padding: "16px 20px",
                          background: isSelected ? "rgba(2,209,186,0.08)" : "rgba(255,255,255,0.025)",
                          border: `1.5px solid ${isSelected ? GREEN : "rgba(255,255,255,0.07)"}`,
                          borderRadius: 16,
                          cursor: "pointer",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          transition: "all 0.2s ease",
                          WebkitTapHighlightColor: "transparent",
                          WebkitAppearance: "none",
                          fontFamily: "-apple-system,Inter,sans-serif",
                          textAlign: "left",
                          width: "100%",
                          boxShadow: isSelected ? "0 4px 24px rgba(2,209,186,0.15)" : "none",
                        }}
                      >
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: isSelected ? GREEN : "#fff", marginBottom: 3, textTransform: "capitalize" }}>
                            {date.toLocaleDateString(intlLocale(), { weekday: "long", day: "numeric", month: "long" })}
                          </div>
                          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)" }}>{slot.heure}</div>
                        </div>
                        <div style={{
                          width: 24, height: 24, borderRadius: "50%",
                          border: `2px solid ${isSelected ? GREEN : "rgba(255,255,255,0.15)"}`,
                          background: isSelected ? GREEN : "transparent",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 13, color: "#000", fontWeight: 800,
                          flexShrink: 0, transition: "all 0.2s",
                        }}>
                          {isSelected ? "✓" : ""}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* CTA */}
              {!loading && slots.length > 0 && (
                <button
                  onClick={bookSlot}
                  disabled={!selectedSlot || saving}
                  style={{
                    width: "100%",
                    padding: 17,
                    background: selectedSlot ? "linear-gradient(135deg, " + GREEN + ", #0891b2)" : "rgba(255,255,255,0.04)",
                    color: selectedSlot ? "#000" : "rgba(255,255,255,0.25)",
                    border: "none",
                    borderRadius: 16,
                    fontSize: 14,
                    fontWeight: 800,
                    cursor: selectedSlot ? "pointer" : "not-allowed",
                    letterSpacing: "0.5px",
                    textTransform: "uppercase",
                    boxShadow: selectedSlot ? "0 10px 36px rgba(2,209,186,0.35)" : "none",
                    fontFamily: "-apple-system,Inter,sans-serif",
                    WebkitTapHighlightColor: "transparent",
                  }}
                >
                  {saving ? t("bm.cta_saving") : t("bm.cta_confirm")}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

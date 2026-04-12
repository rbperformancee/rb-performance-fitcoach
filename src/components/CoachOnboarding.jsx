import React, { useState } from "react";
import { supabase } from "../lib/supabase";

const COLORS = [
  { id: "#02d1ba", name: "Teal" },
  { id: "#f97316", name: "Orange" },
  { id: "#a78bfa", name: "Violet" },
  { id: "#ef4444", name: "Rouge" },
  { id: "#3b82f6", name: "Bleu" },
  { id: "#f5c842", name: "Dore" },
  { id: "#ec4899", name: "Rose" },
  { id: "#22c55e", name: "Vert" },
];

export default function CoachOnboarding({ coachData, onComplete }) {
  const [step, setStep] = useState(1);
  const [brandName, setBrandName] = useState(coachData?.brand_name || "");
  const [fullName, setFullName] = useState(coachData?.full_name || "");
  const [accentColor, setAccentColor] = useState(coachData?.accent_color || "#02d1ba");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    await supabase.from("coaches").update({
      full_name: fullName.trim(),
      brand_name: brandName.trim(),
      accent_color: accentColor,
    }).eq("id", coachData.id);
    setSaving(false);
    setStep(3);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#050505", fontFamily: "-apple-system,Inter,sans-serif", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, position: "relative", overflow: "hidden" }}>
      <style>{`
        @keyframes coFade{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
        input::placeholder{color:rgba(255,255,255,0.2)}
      `}</style>

      {/* Ambient */}
      <div style={{ position: "fixed", top: "-10%", left: "50%", transform: "translateX(-50%)", width: 600, height: 600, background: `radial-gradient(circle, ${accentColor}15, transparent 65%)`, borderRadius: "50%", filter: "blur(80px)", pointerEvents: "none", transition: "background 0.5s" }} />

      <div style={{ position: "relative", zIndex: 1, maxWidth: 420, width: "100%" }}>

        {/* Progress */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <div style={{ fontSize: 10, letterSpacing: "3px", textTransform: "uppercase", color: `${accentColor}88`, fontWeight: 700 }}>Etape {step} / 3</div>
          </div>
          <div style={{ height: 3, background: "rgba(255,255,255,0.05)", borderRadius: 2, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${(step / 3) * 100}%`, background: accentColor, borderRadius: 2, transition: "width 0.5s ease" }} />
          </div>
        </div>

        {/* ===== ETAPE 1 : Identite ===== */}
        {step === 1 && (
          <div style={{ animation: "coFade 0.4s ease both" }}>
            <div style={{ fontSize: 10, letterSpacing: "4px", textTransform: "uppercase", color: `${accentColor}88`, marginBottom: 12, fontWeight: 700 }}>Bienvenue, Coach</div>
            <h1 style={{ fontSize: 40, fontWeight: 900, letterSpacing: "-2px", lineHeight: 0.95, marginBottom: 12 }}>
              Configure<br /><span style={{ color: accentColor }}>ton espace.</span>
            </h1>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", lineHeight: 1.6, marginBottom: 28 }}>
              Ces infos seront visibles par tes clients dans l'app.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 28 }}>
              <div>
                <div style={{ fontSize: 10, letterSpacing: "2px", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", marginBottom: 8, fontWeight: 600 }}>Ton nom complet</div>
                <input
                  type="text" value={fullName} onChange={e => setFullName(e.target.value)}
                  placeholder="Prenom Nom" autoFocus
                  style={{ width: "100%", padding: "14px 16px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, color: "#fff", fontSize: 16, outline: "none", boxSizing: "border-box", fontFamily: "inherit" }}
                />
              </div>
              <div>
                <div style={{ fontSize: 10, letterSpacing: "2px", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", marginBottom: 8, fontWeight: 600 }}>Nom de ta marque</div>
                <input
                  type="text" value={brandName} onChange={e => setBrandName(e.target.value)}
                  placeholder="Ex: RB Perform, FitStudio, PowerCoach..."
                  style={{ width: "100%", padding: "14px 16px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, color: "#fff", fontSize: 16, outline: "none", boxSizing: "border-box", fontFamily: "inherit" }}
                />
              </div>
            </div>

            <button onClick={() => setStep(2)} disabled={!fullName.trim() || !brandName.trim()} style={{
              width: "100%", padding: 17,
              background: fullName.trim() && brandName.trim() ? `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)` : "rgba(255,255,255,0.04)",
              color: fullName.trim() && brandName.trim() ? "#000" : "rgba(255,255,255,0.25)",
              border: "none", borderRadius: 16, fontSize: 14, fontWeight: 800, cursor: fullName.trim() && brandName.trim() ? "pointer" : "not-allowed",
              fontFamily: "inherit", textTransform: "uppercase", letterSpacing: "0.5px",
            }}>Continuer</button>
          </div>
        )}

        {/* ===== ETAPE 2 : Branding ===== */}
        {step === 2 && (
          <div style={{ animation: "coFade 0.4s ease both" }}>
            <div style={{ fontSize: 10, letterSpacing: "4px", textTransform: "uppercase", color: `${accentColor}88`, marginBottom: 12, fontWeight: 700 }}>Branding</div>
            <h1 style={{ fontSize: 40, fontWeight: 900, letterSpacing: "-2px", lineHeight: 0.95, marginBottom: 12 }}>
              Ta couleur<br /><span style={{ color: accentColor }}>d'accent.</span>
            </h1>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", lineHeight: 1.6, marginBottom: 28 }}>
              Cette couleur sera utilisee dans l'app pour tes clients. Tu peux la changer plus tard.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 32 }}>
              {COLORS.map(c => {
                const on = accentColor === c.id;
                return (
                  <button key={c.id} onClick={() => setAccentColor(c.id)} style={{
                    padding: "16px 8px", borderRadius: 14, cursor: "pointer", textAlign: "center",
                    background: on ? `${c.id}15` : "rgba(255,255,255,0.02)",
                    border: `2px solid ${on ? c.id : "rgba(255,255,255,0.06)"}`,
                    transition: "all 0.2s",
                  }}>
                    <div style={{ width: 32, height: 32, borderRadius: "50%", background: c.id, margin: "0 auto 8px", boxShadow: on ? `0 0 20px ${c.id}60` : "none" }} />
                    <div style={{ fontSize: 10, fontWeight: 700, color: on ? c.id : "rgba(255,255,255,0.4)" }}>{c.name}</div>
                  </button>
                );
              })}
            </div>

            {/* Preview */}
            <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: 18, marginBottom: 24 }}>
              <div style={{ fontSize: 9, letterSpacing: "2px", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: 10 }}>Apercu</div>
              <div style={{ fontSize: 20, fontWeight: 900, letterSpacing: "-0.5px" }}>
                <span style={{ color: "#fff" }}>{brandName || "Ta Marque"}</span>
                <span style={{ color: accentColor }}>.</span>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <div style={{ padding: "6px 14px", background: `${accentColor}15`, border: `1px solid ${accentColor}40`, borderRadius: 100, fontSize: 10, fontWeight: 700, color: accentColor }}>Programme actif</div>
                <div style={{ padding: "6px 14px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 100, fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.4)" }}>3 clients</div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setStep(1)} style={{ flex: 0, padding: "15px 20px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, color: "rgba(255,255,255,0.5)", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>←</button>
              <button onClick={save} disabled={saving} style={{
                flex: 1, padding: 17,
                background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)`,
                color: "#000", border: "none", borderRadius: 16, fontSize: 14, fontWeight: 800, cursor: "pointer",
                fontFamily: "inherit", textTransform: "uppercase", letterSpacing: "0.5px",
                boxShadow: `0 8px 32px ${accentColor}40`,
              }}>{saving ? "Sauvegarde..." : "Creer mon espace"}</button>
            </div>
          </div>
        )}

        {/* ===== ETAPE 3 : Done ===== */}
        {step === 3 && (
          <div style={{ textAlign: "center", animation: "coFade 0.5s ease both" }}>
            <div style={{ width: 80, height: 80, borderRadius: "50%", background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 28px", fontSize: 36, color: "#000", boxShadow: `0 12px 48px ${accentColor}50` }}>✓</div>
            <div style={{ fontSize: 10, letterSpacing: "5px", textTransform: "uppercase", color: `${accentColor}88`, marginBottom: 14, fontWeight: 700 }}>C'est pret</div>
            <h1 style={{ fontSize: 40, fontWeight: 900, letterSpacing: "-2px", lineHeight: 0.95, marginBottom: 16 }}>
              Bienvenue,<br /><span style={{ color: accentColor }}>{fullName.split(" ")[0]}.</span>
            </h1>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", lineHeight: 1.7, marginBottom: 32, maxWidth: 320, marginLeft: "auto", marginRight: "auto" }}>
              Ton espace <strong style={{ color: "#fff" }}>{brandName}</strong> est configure. Ajoute tes premiers clients et commence a coacher.
            </p>
            <button onClick={onComplete} style={{
              width: "100%", maxWidth: 320, padding: 17,
              background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)`,
              color: "#000", border: "none", borderRadius: 16, fontSize: 14, fontWeight: 800, cursor: "pointer",
              fontFamily: "inherit", textTransform: "uppercase", letterSpacing: "0.5px",
              boxShadow: `0 8px 32px ${accentColor}40`,
            }}>Acceder a mon dashboard →</button>
          </div>
        )}
      </div>
    </div>
  );
}

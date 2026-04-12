import React, { useState } from "react";
import { supabase } from "../lib/supabase";
import { toast } from "./Toast";
import Spinner from "./Spinner";

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
  const [activity, setActivity] = useState(coachData?.activity || "");
  const [city, setCity] = useState(coachData?.city || "");
  const [logoUrl, setLogoUrl] = useState(coachData?.logo_url || "");
  const [paymentLink, setPaymentLink] = useState(coachData?.payment_link || "");
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [saving, setSaving] = useState(false);

  const TOTAL_STEPS = 4;

  const uploadLogo = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error("Logo trop lourd (max 2MB)"); return; }
    if (!file.type.startsWith("image/")) { toast.error("Fichier image uniquement"); return; }
    setUploadingLogo(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${coachData.id}/logo.${ext}`;
      const { error: upErr } = await supabase.storage.from("coach-logos").upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("coach-logos").getPublicUrl(path);
      setLogoUrl(data.publicUrl + "?t=" + Date.now());
    } catch (err) {
      toast.error("Upload echoue. Verifier que le bucket 'coach-logos' existe.");
      console.error("Logo upload failed:", err);
    }
    setUploadingLogo(false);
  };

  const save = async () => {
    setSaving(true);
    const payload = {
      full_name: fullName.trim(),
      brand_name: brandName.trim(),
      accent_color: accentColor,
      activity: activity.trim() || null,
      city: city.trim() || null,
      logo_url: logoUrl || null,
      payment_link: paymentLink.trim() || null,
    };
    await supabase.from("coaches").update(payload).eq("id", coachData.id);
    setSaving(false);
    setStep(4);
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
            <div style={{ fontSize: 10, letterSpacing: "3px", textTransform: "uppercase", color: `${accentColor}88`, fontWeight: 700 }}>Etape {step} / {TOTAL_STEPS}</div>
          </div>
          <div style={{ height: 3, background: "rgba(255,255,255,0.05)", borderRadius: 2, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${(step / TOTAL_STEPS) * 100}%`, background: accentColor, borderRadius: 2, transition: "width 0.5s ease" }} />
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
              <button onClick={() => setStep(3)} style={{
                flex: 1, padding: 17,
                background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)`,
                color: "#000", border: "none", borderRadius: 16, fontSize: 14, fontWeight: 800, cursor: "pointer",
                fontFamily: "inherit", textTransform: "uppercase", letterSpacing: "0.5px",
                boxShadow: `0 8px 32px ${accentColor}40`,
              }}>Continuer</button>
            </div>
          </div>
        )}

        {/* ===== ETAPE 3 : Profil public + logo + paiement ===== */}
        {step === 3 && (
          <div style={{ animation: "coFade 0.4s ease both" }}>
            <div style={{ fontSize: 10, letterSpacing: "4px", textTransform: "uppercase", color: `${accentColor}88`, marginBottom: 12, fontWeight: 700 }}>Profil public</div>
            <h1 style={{ fontSize: 36, fontWeight: 900, letterSpacing: "-2px", lineHeight: 0.95, marginBottom: 12 }}>
              Logo et<br /><span style={{ color: accentColor }}>paiement.</span>
            </h1>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", lineHeight: 1.6, marginBottom: 24 }}>
              Ton logo et tes infos que verront tes clients + ton lien de paiement personnel.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 24 }}>
              {/* Activite */}
              <div>
                <div style={{ fontSize: 10, letterSpacing: "2px", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", marginBottom: 6, fontWeight: 600 }}>Activite</div>
                <input type="text" value={activity} onChange={e => setActivity(e.target.value)} placeholder="Ex: Musculation, Running, Cross-training..." style={{ width: "100%", padding: "13px 16px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, color: "#fff", fontSize: 16, outline: "none", boxSizing: "border-box", fontFamily: "inherit" }} />
              </div>

              {/* Ville */}
              <div>
                <div style={{ fontSize: 10, letterSpacing: "2px", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", marginBottom: 6, fontWeight: 600 }}>Ville</div>
                <input type="text" value={city} onChange={e => setCity(e.target.value)} placeholder="Paris, Lyon, Marseille..." style={{ width: "100%", padding: "13px 16px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, color: "#fff", fontSize: 16, outline: "none", boxSizing: "border-box", fontFamily: "inherit" }} />
              </div>

              {/* Logo upload */}
              <div>
                <div style={{ fontSize: 10, letterSpacing: "2px", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", marginBottom: 6, fontWeight: 600 }}>Logo (optionnel, max 2MB)</div>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  {logoUrl ? (
                    <img src={logoUrl} alt="logo" style={{ width: 56, height: 56, borderRadius: "50%", objectFit: "cover", border: `1px solid ${accentColor}50` }} />
                  ) : (
                    <div style={{ width: 56, height: 56, borderRadius: "50%", background: `${accentColor}22`, border: `1px dashed ${accentColor}50`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, color: accentColor, fontWeight: 800, fontFamily: "'Bebas Neue',sans-serif" }}>
                      {(fullName || brandName || "C").slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <label style={{ flex: 1, padding: "12px 14px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, cursor: "pointer", textAlign: "center", fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.7)", letterSpacing: "1px", textTransform: "uppercase" }}>
                    {uploadingLogo ? "Upload..." : (logoUrl ? "Changer" : "Choisir une image")}
                    <input type="file" accept="image/*" onChange={uploadLogo} style={{ display: "none" }} />
                  </label>
                </div>
              </div>

              {/* Payment link */}
              <div>
                <div style={{ fontSize: 10, letterSpacing: "2px", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", marginBottom: 6, fontWeight: 600 }}>Lien de paiement clients (Stripe, PayPal...)</div>
                <input type="url" value={paymentLink} onChange={e => setPaymentLink(e.target.value)} placeholder="https://buy.stripe.com/..." style={{ width: "100%", padding: "13px 16px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box", fontFamily: "'JetBrains Mono',monospace" }} />
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 6, lineHeight: 1.5 }}>Tes clients cliqueront sur ce lien pour s'abonner chez toi. Tu gardes 100% de ton chiffre.</div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setStep(2)} style={{ flex: 0, padding: "15px 20px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, color: "rgba(255,255,255,0.5)", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>←</button>
              <button onClick={save} disabled={saving} style={{
                flex: 1, padding: 17,
                background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)`,
                color: "#000", border: "none", borderRadius: 16, fontSize: 14, fontWeight: 800, cursor: saving ? "default" : "pointer",
                fontFamily: "inherit", textTransform: "uppercase", letterSpacing: "0.5px",
                boxShadow: `0 8px 32px ${accentColor}40`,
              }}>
                {saving ? (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                    <Spinner variant="dots" size={18} color="#000" />
                    Enregistrement
                  </span>
                ) : "Creer mon espace"}
              </button>
            </div>
          </div>
        )}

        {/* ===== ETAPE 4 : Done ===== */}
        {step === 4 && (
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

import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { toast } from "./Toast";
import Spinner from "./Spinner";

const COLORS = [
  { id: "#02d1ba", name: "Teal" },
  { id: "#f97316", name: "Orange" },
  { id: "#a78bfa", name: "Violet" },
  { id: "#ef4444", name: "Rouge" },
  { id: "#3b82f6", name: "Bleu" },
  { id: "#f5c842", name: "Doré" },
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
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [saving, setSaving] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [copied, setCopied] = useState(false);
  // Facturation
  const [siret, setSiret] = useState(coachData?.siret || "");
  const [businessName, setBusinessName] = useState(coachData?.business_name || "");
  const [businessAddress, setBusinessAddress] = useState(coachData?.business_address || "");
  const [tvaStatus, setTvaStatus] = useState(coachData?.tva_status || "non_applicable");

  const TOTAL_STEPS = 6;
  const firstName = fullName.split(" ")[0] || "Coach";

  // Generate invite code on step 4
  useEffect(() => {
    if (step === 5 && coachData?.id) {
      const code = String(Math.floor(100000 + Math.random() * 900000));
      setInviteCode(code);
    }
  }, [step, coachData?.id]);

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
      toast.error("Upload échoué.");
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
      siret: siret.trim() || null,
      business_name: businessName.trim() || null,
      business_address: businessAddress.trim() || null,
      tva_status: tvaStatus || "non_applicable",
    };
    await supabase.from("coaches").update(payload).eq("id", coachData.id);
    setSaving(false);
    setStep(5);
  };

  const copyCode = () => {
    navigator.clipboard.writeText(inviteCode).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const inputStyle = {
    width: "100%", padding: "14px 16px",
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 14, color: "#fff", fontSize: 16,
    outline: "none", boxSizing: "border-box", fontFamily: "inherit",
  };

  const btnPrimary = (enabled = true) => ({
    flex: 1, padding: 17,
    background: enabled ? `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)` : "rgba(255,255,255,0.04)",
    color: enabled ? "#000" : "rgba(255,255,255,0.25)",
    border: "none", borderRadius: 16, fontSize: 14, fontWeight: 800,
    cursor: enabled ? "pointer" : "not-allowed",
    fontFamily: "inherit", textTransform: "uppercase", letterSpacing: "0.5px",
    boxShadow: enabled ? `0 8px 32px ${accentColor}40` : "none",
  });

  const btnBack = {
    flex: 0, padding: "15px 20px",
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 14, color: "rgba(255,255,255,0.5)",
    fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
  };

  const label = {
    fontSize: 10, letterSpacing: "2px", textTransform: "uppercase",
    color: "rgba(255,255,255,0.35)", marginBottom: 8, fontWeight: 600,
  };

  return (
    <div style={{
      minHeight: "100vh", background: "#050505",
      fontFamily: "-apple-system,Inter,sans-serif", color: "#fff",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 24, position: "relative", overflow: "hidden",
    }}>
      <style>{`
        @keyframes coFade{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
        @keyframes coPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.05)}}
        @keyframes coCount{from{opacity:0;transform:scale(0.5)}to{opacity:1;transform:scale(1)}}
        input::placeholder{color:rgba(255,255,255,0.2)}
      `}</style>

      {/* Ambient glow */}
      <div style={{
        position: "fixed", top: "-10%", left: "50%", transform: "translateX(-50%)",
        width: 600, height: 600,
        background: `radial-gradient(circle, ${accentColor}15, transparent 65%)`,
        borderRadius: "50%", filter: "blur(80px)", pointerEvents: "none",
        transition: "background 0.5s",
      }} />

      <div style={{ position: "relative", zIndex: 1, maxWidth: 420, width: "100%" }}>

        {/* Progress */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <div style={{ fontSize: 10, letterSpacing: "3px", textTransform: "uppercase", color: `${accentColor}88`, fontWeight: 700 }}>
              {step <= TOTAL_STEPS ? `${step} / ${TOTAL_STEPS}` : ""}
            </div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.15)" }}>
              {step === 1 && "30 secondes"}
              {step === 2 && "Identité visuelle"}
              {step === 3 && "Profil public"}
              {step === 4 && "Facturation"}
              {step === 5 && "Ton premier client"}
              {step === 6 && "C'est parti"}
            </div>
          </div>
          <div style={{ height: 3, background: "rgba(255,255,255,0.05)", borderRadius: 2, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${(Math.min(step, TOTAL_STEPS) / TOTAL_STEPS) * 100}%`, background: accentColor, borderRadius: 2, transition: "width 0.5s ease" }} />
          </div>
        </div>

        {/* ===== STEP 1 : Identité ===== */}
        {step === 1 && (
          <div style={{ animation: "coFade 0.4s ease both" }}>
            <div style={{ fontSize: 10, letterSpacing: "4px", textTransform: "uppercase", color: `${accentColor}88`, marginBottom: 12, fontWeight: 700 }}>
              Bienvenue
            </div>
            <h1 style={{ fontSize: 40, fontWeight: 900, letterSpacing: "-2px", lineHeight: 0.95, marginBottom: 12 }}>
              Ton cockpit<br /><span style={{ color: accentColor }}>CEO.</span>
            </h1>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", lineHeight: 1.6, marginBottom: 28 }}>
              Dans 30 secondes, tu auras un dashboard que 99% des coachs n'ont pas.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 28 }}>
              <div>
                <div style={label}>Ton nom</div>
                <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Prénom Nom" autoFocus style={inputStyle} />
              </div>
              <div>
                <div style={label}>Le nom de ta marque</div>
                <input type="text" value={brandName} onChange={e => setBrandName(e.target.value)} placeholder="Ex: PowerCoach, FitStudio..." style={inputStyle} />
              </div>
            </div>

            <button onClick={() => setStep(2)} disabled={!fullName.trim() || !brandName.trim()} style={btnPrimary(fullName.trim() && brandName.trim())}>
              Continuer
            </button>
          </div>
        )}

        {/* ===== STEP 2 : Couleur ===== */}
        {step === 2 && (
          <div style={{ animation: "coFade 0.4s ease both" }}>
            <div style={{ fontSize: 10, letterSpacing: "4px", textTransform: "uppercase", color: `${accentColor}88`, marginBottom: 12, fontWeight: 700 }}>Identité visuelle</div>
            <h1 style={{ fontSize: 40, fontWeight: 900, letterSpacing: "-2px", lineHeight: 0.95, marginBottom: 12 }}>
              Ta couleur<br /><span style={{ color: accentColor }}>signature.</span>
            </h1>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", lineHeight: 1.6, marginBottom: 28 }}>
              Tes clients la verront partout dans leur app.
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

            {/* Live preview */}
            <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: 18, marginBottom: 24 }}>
              <div style={{ fontSize: 9, letterSpacing: "2px", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: 10 }}>Aperçu client</div>
              <div style={{ fontSize: 20, fontWeight: 900, letterSpacing: "-0.5px" }}>
                <span style={{ color: "#fff" }}>{brandName || "Ta Marque"}</span>
                <span style={{ color: accentColor }}>.</span>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <div style={{ padding: "6px 14px", background: `${accentColor}15`, border: `1px solid ${accentColor}40`, borderRadius: 100, fontSize: 10, fontWeight: 700, color: accentColor }}>Programme actif</div>
                <div style={{ padding: "6px 14px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 100, fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.4)" }}>Score 84</div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setStep(1)} style={btnBack}>←</button>
              <button onClick={() => setStep(3)} style={btnPrimary()}>Continuer</button>
            </div>
          </div>
        )}

        {/* ===== STEP 3 : Profil + Logo ===== */}
        {step === 3 && (
          <div style={{ animation: "coFade 0.4s ease both" }}>
            <div style={{ fontSize: 10, letterSpacing: "4px", textTransform: "uppercase", color: `${accentColor}88`, marginBottom: 12, fontWeight: 700 }}>Dernière étape</div>
            <h1 style={{ fontSize: 36, fontWeight: 900, letterSpacing: "-2px", lineHeight: 0.95, marginBottom: 12 }}>
              Ton profil<br /><span style={{ color: accentColor }}>public.</span>
            </h1>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", lineHeight: 1.6, marginBottom: 24 }}>
              Visible par tes clients. Tu pourras tout modifier plus tard.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 24 }}>
              <div>
                <div style={label}>Activité</div>
                <input type="text" value={activity} onChange={e => setActivity(e.target.value)} placeholder="Musculation, CrossFit, Running..." style={inputStyle} />
              </div>
              <div>
                <div style={label}>Ville</div>
                <input type="text" value={city} onChange={e => setCity(e.target.value)} placeholder="Paris, Lyon, Marseille..." style={inputStyle} />
              </div>
              <div>
                <div style={label}>Logo (optionnel)</div>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  {logoUrl ? (
                    <img src={logoUrl} alt="logo" style={{ width: 56, height: 56, borderRadius: "50%", objectFit: "cover", border: `1px solid ${accentColor}50` }} />
                  ) : (
                    <div style={{ width: 56, height: 56, borderRadius: "50%", background: `${accentColor}22`, border: `1px dashed ${accentColor}50`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, color: accentColor, fontWeight: 800, fontFamily: "'Bebas Neue',sans-serif" }}>
                      {(fullName || brandName || "C").slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <label style={{ flex: 1, padding: "12px 14px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, cursor: "pointer", textAlign: "center", fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.7)", letterSpacing: "1px", textTransform: "uppercase" }}>
                    {uploadingLogo ? "Upload..." : (logoUrl ? "Changer" : "Choisir")}
                    <input type="file" accept="image/*" onChange={uploadLogo} style={{ display: "none" }} />
                  </label>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setStep(2)} style={btnBack}>←</button>
              <button onClick={save} disabled={saving} style={btnPrimary(!saving)}>
                {saving ? (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                    <Spinner variant="dots" size={18} color="#000" />
                    Création...
                  </span>
                ) : "Continuer →"}
              </button>
            </div>
          </div>
        )}

        {/* ===== STEP 4 : Facturation ===== */}
        {step === 4 && (
          <div style={{ animation: "coFade 0.4s ease both" }}>
            <div style={{ fontSize: 10, letterSpacing: "4px", textTransform: "uppercase", color: `${accentColor}88`, marginBottom: 12, fontWeight: 700 }}>Facturation</div>
            <h1 style={{ fontSize: 36, fontWeight: 900, letterSpacing: "-2px", lineHeight: 0.95, marginBottom: 12 }}>
              Tes infos<br /><span style={{ color: accentColor }}>légales.</span>
            </h1>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", lineHeight: 1.6, marginBottom: 24 }}>
              Obligatoire pour générer des factures conformes à tes clients.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 24 }}>
              <div>
                <div style={label}>SIRET</div>
                <input type="text" value={siret} onChange={e => setSiret(e.target.value.replace(/[^0-9]/g, '').slice(0, 14))} placeholder="14 chiffres" inputMode="numeric" style={inputStyle} />
              </div>
              <div>
                <div style={label}>Raison sociale / Nom commercial</div>
                <input type="text" value={businessName} onChange={e => setBusinessName(e.target.value)} placeholder={brandName || "Nom sur la facture"} style={inputStyle} />
              </div>
              <div>
                <div style={label}>Adresse de facturation</div>
                <input type="text" value={businessAddress} onChange={e => setBusinessAddress(e.target.value)} placeholder="12 rue de la Paix, 75002 Paris" style={inputStyle} />
              </div>
              <div>
                <div style={label}>TVA</div>
                <div style={{ display: "flex", gap: 8 }}>
                  {[
                    { id: "non_applicable", label: "Non applicable (art. 293B)" },
                    { id: "applicable", label: "Assujetti TVA" },
                  ].map(t => (
                    <button key={t.id} onClick={() => setTvaStatus(t.id)} style={{
                      flex: 1, padding: "12px 8px", borderRadius: 12, cursor: "pointer",
                      background: tvaStatus === t.id ? `${accentColor}12` : "rgba(255,255,255,0.02)",
                      border: `1.5px solid ${tvaStatus === t.id ? accentColor : "rgba(255,255,255,0.06)"}`,
                      color: tvaStatus === t.id ? accentColor : "rgba(255,255,255,0.4)",
                      fontSize: 11, fontWeight: 600, fontFamily: "inherit", textAlign: "center",
                      transition: "all 0.2s",
                    }}>{t.label}</button>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setStep(3)} style={btnBack}>←</button>
              <button onClick={save} disabled={saving} style={btnPrimary(!saving)}>
                {saving ? (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                    <Spinner variant="dots" size={18} color="#000" />
                    Création...
                  </span>
                ) : "Créer mon espace →"}
              </button>
            </div>

            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", marginTop: 16, textAlign: "center" }}>
              Tu pourras compléter plus tard dans les paramètres.
            </div>
          </div>
        )}

        {/* ===== STEP 5 : Invite ton premier client ===== */}
        {step === 5 && (
          <div style={{ animation: "coFade 0.4s ease both" }}>
            <div style={{ fontSize: 10, letterSpacing: "4px", textTransform: "uppercase", color: `${accentColor}88`, marginBottom: 12, fontWeight: 700 }}>Ton premier client</div>
            <h1 style={{ fontSize: 36, fontWeight: 900, letterSpacing: "-2px", lineHeight: 0.95, marginBottom: 12 }}>
              Invite<br /><span style={{ color: accentColor }}>quelqu'un.</span>
            </h1>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", lineHeight: 1.6, marginBottom: 28 }}>
              Envoie ce code à ton premier client. Il le tape dans l'app et il est connecté à toi.
            </p>

            {/* Code display */}
            <div style={{
              background: "rgba(255,255,255,0.03)", border: `1px solid ${accentColor}30`,
              borderRadius: 20, padding: "28px 24px", textAlign: "center", marginBottom: 20,
            }}>
              <div style={{ fontSize: 9, letterSpacing: "3px", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: 14, fontWeight: 700 }}>Code d'invitation</div>
              <div style={{
                fontFamily: "'JetBrains Mono', monospace", fontSize: 48, fontWeight: 700,
                letterSpacing: "12px", color: accentColor,
                animation: "coCount 0.5s cubic-bezier(0.16,1,0.3,1) both",
                textShadow: `0 0 40px ${accentColor}40`,
              }}>
                {inviteCode}
              </div>
              <button onClick={copyCode} style={{
                marginTop: 16, padding: "10px 24px",
                background: copied ? `${accentColor}20` : "rgba(255,255,255,0.04)",
                border: `1px solid ${copied ? accentColor : "rgba(255,255,255,0.08)"}`,
                borderRadius: 100, color: copied ? accentColor : "rgba(255,255,255,0.5)",
                fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                letterSpacing: "1px", textTransform: "uppercase",
                transition: "all 0.2s",
              }}>
                {copied ? "✓ Copié" : "Copier le code"}
              </button>
            </div>

            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.25)", textAlign: "center", lineHeight: 1.6, marginBottom: 28 }}>
              Tu pourras aussi générer de nouveaux codes depuis ton dashboard.
              <br />Pas de client sous la main ? Passe cette étape.
            </p>

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setStep(6)} style={{
                ...btnPrimary(), width: "100%",
              }}>
                Accéder à mon dashboard →
              </button>
            </div>
          </div>
        )}

        {/* ===== STEP 6 : Bienvenue CEO ===== */}
        {step === 6 && (
          <div style={{ textAlign: "center", animation: "coFade 0.5s ease both" }}>
            <div style={{
              width: 80, height: 80, borderRadius: "50%",
              background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)`,
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 28px", fontSize: 36, color: "#000",
              boxShadow: `0 12px 48px ${accentColor}50`,
              animation: "coPulse 2s ease infinite",
            }}>⚡</div>
            <div style={{ fontSize: 10, letterSpacing: "5px", textTransform: "uppercase", color: `${accentColor}88`, marginBottom: 14, fontWeight: 700 }}>
              Tu es prêt
            </div>
            <h1 style={{ fontSize: 40, fontWeight: 900, letterSpacing: "-2px", lineHeight: 0.95, marginBottom: 16 }}>
              Bienvenue,<br /><span style={{ color: accentColor }}>{firstName}.</span>
            </h1>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", lineHeight: 1.7, marginBottom: 12, maxWidth: 320, marginLeft: "auto", marginRight: "auto" }}>
              Ton espace <strong style={{ color: "#fff" }}>{brandName}</strong> est en ligne.
            </p>

            {/* 3 quick stats */}
            <div style={{ display: "flex", gap: 12, justifyContent: "center", marginBottom: 32 }}>
              {[
                { num: "0→", label: "Clients" },
                { num: "84", label: "Score cible" },
                { num: "∞", label: "Potentiel" },
              ].map((s, i) => (
                <div key={i} style={{
                  padding: "12px 16px", background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, textAlign: "center",
                  animation: `coFade 0.4s ease ${0.2 + i * 0.1}s both`,
                }}>
                  <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 24, color: accentColor, lineHeight: 1 }}>{s.num}</div>
                  <div style={{ fontSize: 8, letterSpacing: "1.5px", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginTop: 4, fontWeight: 700 }}>{s.label}</div>
                </div>
              ))}
            </div>

            <button onClick={onComplete} style={{
              width: "100%", maxWidth: 320, padding: 17,
              background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)`,
              color: "#000", border: "none", borderRadius: 16, fontSize: 14, fontWeight: 800,
              cursor: "pointer", fontFamily: "inherit", textTransform: "uppercase",
              letterSpacing: "0.5px", boxShadow: `0 8px 32px ${accentColor}40`,
            }}>
              Ouvrir mon dashboard →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { toast } from "./Toast";
import Spinner from "./Spinner";
import { useT } from "../lib/i18n";

const buildColors = (t) => [
  { id: "#02d1ba", name: t("co.color_teal") },
  { id: "#f97316", name: t("co.color_orange") },
  { id: "#a78bfa", name: t("co.color_violet") },
  { id: "#ef4444", name: t("co.color_red") },
  { id: "#3b82f6", name: t("co.color_blue") },
  { id: "#f5c842", name: t("co.color_gold") },
  { id: "#ec4899", name: t("co.color_pink") },
  { id: "#22c55e", name: t("co.color_green") },
];

export default function CoachOnboarding({ coachData, onComplete }) {
  const t = useT();
  const COLORS = buildColors(t);
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
  const firstName = fullName.split(" ")[0] || t("co.coach_default");

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
    if (file.size > 2 * 1024 * 1024) { toast.error(t("co.toast_logo_too_heavy")); return; }
    if (!file.type.startsWith("image/")) { toast.error(t("co.toast_image_only")); return; }
    setUploadingLogo(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${coachData.id}/logo.${ext}`;
      const { error: upErr } = await supabase.storage.from("coach-logos").upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("coach-logos").getPublicUrl(path);
      setLogoUrl(data.publicUrl + "?t=" + Date.now());
    } catch (err) {
      toast.error(t("co.toast_upload_failed"));
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
      minHeight: "100dvh", background: "#050505",
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
              {step === 1 && t("co.step_1_label")}
              {step === 2 && t("co.step_2_label")}
              {step === 3 && t("co.step_3_label")}
              {step === 4 && t("co.step_4_label")}
              {step === 5 && t("co.step_5_label")}
              {step === 6 && t("co.step_6_label")}
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
              {t("co.s1_eyebrow")}
            </div>
            <h1 style={{ fontSize: 40, fontWeight: 900, letterSpacing: "-2px", lineHeight: 0.95, marginBottom: 12 }}>
              {t("co.s1_title_part1")}<br /><span style={{ color: accentColor }}>{t("co.s1_title_part2")}</span>
            </h1>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", lineHeight: 1.6, marginBottom: 28 }}>
              {t("co.s1_intro")}
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 28 }}>
              <div>
                <div style={label}>{t("co.s1_label_name")}</div>
                <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} placeholder={t("co.s1_ph_name")} autoFocus style={inputStyle} />
              </div>
              <div>
                <div style={label}>{t("co.s1_label_brand")}</div>
                <input type="text" value={brandName} onChange={e => setBrandName(e.target.value)} placeholder={t("co.s1_ph_brand")} style={inputStyle} />
              </div>
            </div>

            <button onClick={() => setStep(2)} disabled={!fullName.trim() || !brandName.trim()} style={btnPrimary(fullName.trim() && brandName.trim())}>
              {t("co.continue")}
            </button>
          </div>
        )}

        {/* ===== STEP 2 : Couleur ===== */}
        {step === 2 && (
          <div style={{ animation: "coFade 0.4s ease both" }}>
            <div style={{ fontSize: 10, letterSpacing: "4px", textTransform: "uppercase", color: `${accentColor}88`, marginBottom: 12, fontWeight: 700 }}>{t("co.s2_eyebrow")}</div>
            <h1 style={{ fontSize: 40, fontWeight: 900, letterSpacing: "-2px", lineHeight: 0.95, marginBottom: 12 }}>
              {t("co.s2_title_part1")}<br /><span style={{ color: accentColor }}>{t("co.s2_title_part2")}</span>
            </h1>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", lineHeight: 1.6, marginBottom: 28 }}>
              {t("co.s2_intro")}
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
              <div style={{ fontSize: 9, letterSpacing: "2px", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: 10 }}>{t("co.s2_preview_label")}</div>
              <div style={{ fontSize: 20, fontWeight: 900, letterSpacing: "-0.5px" }}>
                <span style={{ color: "#fff" }}>{brandName || t("co.s2_brand_default")}</span>
                <span style={{ color: accentColor }}>.</span>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <div style={{ padding: "6px 14px", background: `${accentColor}15`, border: `1px solid ${accentColor}40`, borderRadius: 100, fontSize: 10, fontWeight: 700, color: accentColor }}>{t("co.s2_chip_program")}</div>
                <div style={{ padding: "6px 14px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 100, fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.4)" }}>{t("co.s2_chip_score")}</div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setStep(1)} style={btnBack}>←</button>
              <button onClick={() => setStep(3)} style={btnPrimary()}>{t("co.continue")}</button>
            </div>
          </div>
        )}

        {/* ===== STEP 3 : Profil + Logo ===== */}
        {step === 3 && (
          <div style={{ animation: "coFade 0.4s ease both" }}>
            <div style={{ fontSize: 10, letterSpacing: "4px", textTransform: "uppercase", color: `${accentColor}88`, marginBottom: 12, fontWeight: 700 }}>{t("co.s3_eyebrow")}</div>
            <h1 style={{ fontSize: 36, fontWeight: 900, letterSpacing: "-2px", lineHeight: 0.95, marginBottom: 12 }}>
              {t("co.s3_title_part1")}<br /><span style={{ color: accentColor }}>{t("co.s3_title_part2")}</span>
            </h1>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", lineHeight: 1.6, marginBottom: 24 }}>
              {t("co.s3_intro")}
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 24 }}>
              <div>
                <div style={label}>{t("co.s3_label_activity")}</div>
                <input type="text" value={activity} onChange={e => setActivity(e.target.value)} placeholder={t("co.s3_ph_activity")} style={inputStyle} />
              </div>
              <div>
                <div style={label}>{t("co.s3_label_city")}</div>
                <input type="text" value={city} onChange={e => setCity(e.target.value)} placeholder={t("co.s3_ph_city")} style={inputStyle} />
              </div>
              <div>
                <div style={label}>{t("co.s3_label_logo")}</div>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  {logoUrl ? (
                    <img src={logoUrl} alt="logo" style={{ width: 56, height: 56, borderRadius: "50%", objectFit: "cover", border: `1px solid ${accentColor}50` }} />
                  ) : (
                    <div style={{ width: 56, height: 56, borderRadius: "50%", background: `${accentColor}22`, border: `1px dashed ${accentColor}50`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, color: accentColor, fontWeight: 800, fontFamily: "'Bebas Neue',sans-serif" }}>
                      {(fullName || brandName || "C").slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <label style={{ flex: 1, padding: "12px 14px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, cursor: "pointer", textAlign: "center", fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.7)", letterSpacing: "1px", textTransform: "uppercase" }}>
                    {uploadingLogo ? t("co.s3_logo_uploading") : (logoUrl ? t("co.s3_logo_change") : t("co.s3_logo_choose"))}
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
                    {t("co.creating")}
                  </span>
                ) : t("co.continue_arrow")}
              </button>
            </div>
          </div>
        )}

        {/* ===== STEP 4 : Facturation ===== */}
        {step === 4 && (
          <div style={{ animation: "coFade 0.4s ease both" }}>
            <div style={{ fontSize: 10, letterSpacing: "4px", textTransform: "uppercase", color: `${accentColor}88`, marginBottom: 12, fontWeight: 700 }}>{t("co.s4_eyebrow")}</div>
            <h1 style={{ fontSize: 36, fontWeight: 900, letterSpacing: "-2px", lineHeight: 0.95, marginBottom: 12 }}>
              {t("co.s4_title_part1")}<br /><span style={{ color: accentColor }}>{t("co.s4_title_part2")}</span>
            </h1>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", lineHeight: 1.6, marginBottom: 24 }}>
              {t("co.s4_intro")}
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 24 }}>
              <div>
                <div style={label}>{t("co.s4_label_siret")}</div>
                <input type="text" value={siret} onChange={e => setSiret(e.target.value.replace(/[^0-9]/g, '').slice(0, 14))} placeholder={t("co.s4_ph_siret")} inputMode="numeric" style={inputStyle} />
              </div>
              <div>
                <div style={label}>{t("co.s4_label_business")}</div>
                <input type="text" value={businessName} onChange={e => setBusinessName(e.target.value)} placeholder={brandName || t("co.s4_ph_business")} style={inputStyle} />
              </div>
              <div>
                <div style={label}>{t("co.s4_label_address")}</div>
                <input type="text" value={businessAddress} onChange={e => setBusinessAddress(e.target.value)} placeholder={t("co.s4_ph_address")} style={inputStyle} />
              </div>
              <div>
                <div style={label}>{t("co.s4_label_tva")}</div>
                <div style={{ display: "flex", gap: 8 }}>
                  {[
                    { id: "non_applicable", label: t("co.s4_tva_no") },
                    { id: "applicable", label: t("co.s4_tva_yes") },
                  ].map(opt => (
                    <button key={opt.id} onClick={() => setTvaStatus(opt.id)} style={{
                      flex: 1, padding: "12px 8px", borderRadius: 12, cursor: "pointer",
                      background: tvaStatus === opt.id ? `${accentColor}12` : "rgba(255,255,255,0.02)",
                      border: `1.5px solid ${tvaStatus === opt.id ? accentColor : "rgba(255,255,255,0.06)"}`,
                      color: tvaStatus === opt.id ? accentColor : "rgba(255,255,255,0.4)",
                      fontSize: 11, fontWeight: 600, fontFamily: "inherit", textAlign: "center",
                      transition: "all 0.2s",
                    }}>{opt.label}</button>
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
                    {t("co.creating")}
                  </span>
                ) : t("co.s4_create_btn")}
              </button>
            </div>

            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", marginTop: 16, textAlign: "center" }}>
              {t("co.s4_note")}
            </div>
          </div>
        )}

        {/* ===== STEP 5 : Invite ton premier client ===== */}
        {step === 5 && (
          <div style={{ animation: "coFade 0.4s ease both" }}>
            <div style={{ fontSize: 10, letterSpacing: "4px", textTransform: "uppercase", color: `${accentColor}88`, marginBottom: 12, fontWeight: 700 }}>{t("co.s5_eyebrow")}</div>
            <h1 style={{ fontSize: 36, fontWeight: 900, letterSpacing: "-2px", lineHeight: 0.95, marginBottom: 12 }}>
              {t("co.s5_title_part1")}<br /><span style={{ color: accentColor }}>{t("co.s5_title_part2")}</span>
            </h1>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", lineHeight: 1.6, marginBottom: 28 }}>
              {t("co.s5_intro")}
            </p>

            {/* Code display */}
            <div style={{
              background: "rgba(255,255,255,0.03)", border: `1px solid ${accentColor}30`,
              borderRadius: 20, padding: "28px 24px", textAlign: "center", marginBottom: 20,
            }}>
              <div style={{ fontSize: 9, letterSpacing: "3px", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: 14, fontWeight: 700 }}>{t("co.s5_code_label")}</div>
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
                {copied ? t("co.s5_copied") : t("co.s5_copy")}
              </button>
            </div>

            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.25)", textAlign: "center", lineHeight: 1.6, marginBottom: 28 }}>
              {t("co.s5_note")}
              <br />{t("co.s5_note_skip")}
            </p>

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setStep(6)} style={{
                ...btnPrimary(), width: "100%",
              }}>
                {t("co.s5_dashboard_btn")}
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
              {t("co.s6_eyebrow")}
            </div>
            <h1 style={{ fontSize: 40, fontWeight: 900, letterSpacing: "-2px", lineHeight: 0.95, marginBottom: 16 }}>
              {t("co.s6_title")}<br /><span style={{ color: accentColor }}>{firstName}.</span>
            </h1>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", lineHeight: 1.7, marginBottom: 12, maxWidth: 320, marginLeft: "auto", marginRight: "auto" }}>
              {t("co.s6_intro_part1")} <strong style={{ color: "#fff" }}>{brandName}</strong> {t("co.s6_intro_part2")}
            </p>

            {/* 3 quick stats */}
            <div style={{ display: "flex", gap: 12, justifyContent: "center", marginBottom: 32 }}>
              {[
                { num: "0→", label: t("co.s6_stat_clients") },
                { num: "84", label: t("co.s6_stat_score") },
                { num: "∞", label: t("co.s6_stat_potential") },
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
              {t("co.s6_open_btn")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

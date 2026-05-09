import React, { useState } from "react";
import { supabase } from "../../lib/supabase";
import { toast } from "../Toast";
import haptic from "../../lib/haptic";
import { useT } from "../../lib/i18n";
import DataExportSection from "./DataExportSection";
import HelpMigrationGuide from "./HelpMigrationGuide";
import CoachReferralSection from "./CoachReferralSection";

const G = "#02d1ba";
const RED = "#ff6b6b";

const fillTpl = (s, vars) => {
  let out = s;
  Object.entries(vars).forEach(([k, v]) => { out = out.split(`{${k}}`).join(String(v)); });
  return out;
};

/**
 * MonCompte — page "Qui je suis" du coach.
 * Profil personnel, abonnement SaaS, facturation, sécurité.
 *
 * Séparation avec Settings.jsx :
 *   MonCompte = QUI je suis (identité, abo, facture, sécurité)
 *   Settings  = COMMENT je bosse (plans coaching, branding, notifs)
 */
export default function MonCompte({ coachData, isDemo = false, initialTab, onClose }) {
  const t = useT();
  const [tab, setTab] = useState(initialTab || "profil");

  // Profil
  const [firstName, setFirstName] = useState(coachData?.full_name?.split(" ")[0] || "");
  const [lastName, setLastName] = useState(coachData?.full_name?.split(" ").slice(1).join(" ") || "");
  const [phone, setPhone] = useState(coachData?.phone || "");
  const [city, setCity] = useState(coachData?.city || "");
  const [savingProfile, setSavingProfile] = useState(false);

  // Facturation
  const [siret, setSiret] = useState(coachData?.siret || "");
  const [businessName, setBusinessName] = useState(coachData?.business_name || "");
  const [businessAddress, setBusinessAddress] = useState(coachData?.business_address || "");
  const [legalForm, setLegalForm] = useState(coachData?.legal_form || "");
  const [rcsCity, setRcsCity] = useState(coachData?.rcs_city || "");
  const [rcsNumber, setRcsNumber] = useState(coachData?.rcs_number || "");
  const [vatNumber, setVatNumber] = useState(coachData?.vat_number || "");
  const [capitalSocial, setCapitalSocial] = useState(coachData?.capital_social ?? "");
  const [savingBilling, setSavingBilling] = useState(false);

  // Sécurité
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  // Abonnement
  const [loadingPortal, setLoadingPortal] = useState(false);

  // Migration help guide
  const [showMigrationHelp, setShowMigrationHelp] = useState(false);

  const TABS = [
    { id: "profil", label: t("mc.tab_profil") },
    { id: "abonnement", label: t("mc.tab_abonnement") },
    { id: "facturation", label: t("mc.tab_facturation") },
    { id: "parrainage", label: "Parrainage" },
    { id: "donnees", label: "Données" },
    { id: "securite", label: t("mc.tab_securite") },
  ];

  const saveProfile = async () => {
    if (isDemo) { toast.success(t("mc.toast_demo_unavailable")); return; }
    setSavingProfile(true);
    const { error } = await supabase.from("coaches").update({
      full_name: `${firstName.trim()} ${lastName.trim()}`.trim(),
      phone: phone.trim() || null,
      city: city.trim() || null,
    }).eq("id", coachData.id);
    setSavingProfile(false);
    if (error) toast.error(t("mc.toast_error"));
    else toast.success(t("mc.toast_profile_saved"));
  };

  const saveBilling = async () => {
    if (isDemo) { toast.success(t("mc.toast_demo_unavailable")); return; }
    setSavingBilling(true);
    const capNum = capitalSocial === "" ? null : parseFloat(capitalSocial);
    const { error } = await supabase.from("coaches").update({
      siret: siret.trim() || null,
      business_name: businessName.trim() || null,
      business_address: businessAddress.trim() || null,
      legal_form: legalForm || null,
      rcs_city: rcsCity.trim() || null,
      rcs_number: rcsNumber.trim() || null,
      vat_number: vatNumber.trim().toUpperCase() || null,
      capital_social: Number.isFinite(capNum) ? capNum : null,
    }).eq("id", coachData.id);
    setSavingBilling(false);
    if (error) toast.error(t("mc.toast_error_prefix") + error.message);
    else toast.success(t("mc.toast_billing_saved"));
  };

  const changePassword = async () => {
    if (newPassword.length < 8) { toast.error(t("mc.toast_password_min")); return; }
    if (newPassword !== confirmPassword) { toast.error(t("mc.toast_password_mismatch")); return; }
    setSavingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSavingPassword(false);
    if (error) toast.error(error.message);
    else { toast.success(t("mc.toast_password_changed")); setNewPassword(""); setConfirmPassword(""); }
  };

  // RGPD art. 20 — export de toutes les données personnelles
  const exportMyData = async () => {
    if (isDemo) { toast.info(t("mc.toast_demo_unavailable")); return; }
    haptic.light?.();
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const jwt = session?.access_token;
      if (!jwt) { toast.error("Session expirée"); return; }
      toast.info("Préparation de l'export…");
      const res = await fetch("/api/gdpr-export", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${jwt}` },
      });
      if (!res.ok) { const j = await res.json().catch(()=>({})); throw new Error(j.error || "Export failed"); }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `rbperform-export-${Date.now()}.json`;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
      toast.success("Export téléchargé ✓");
    } catch (e) {
      toast.error(e.message || "Export indisponible");
    }
  };

  // RGPD art. 17 — suppression définitive du compte
  const deleteMyAccount = async () => {
    if (isDemo) { toast.info(t("mc.toast_demo_unavailable")); return; }
    const confirmation = window.prompt(
      "⚠ Suppression DÉFINITIVE de ton compte et de toutes tes données.\n\n" +
      "Cette action est IRRÉVERSIBLE. Aucune sauvegarde ne sera conservée.\n\n" +
      "Tape SUPPRIMER (en majuscules) pour confirmer :"
    );
    if (confirmation !== "SUPPRIMER") {
      if (confirmation !== null) toast.info("Suppression annulée — confirmation invalide");
      return;
    }
    haptic.medium?.();
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const jwt = session?.access_token;
      if (!jwt) { toast.error("Session expirée"); return; }
      const res = await fetch("/api/gdpr-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${jwt}` },
        body: JSON.stringify({ confirm: "SUPPRIMER" }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Suppression échouée");
      toast.success("Compte supprimé. Email de confirmation envoyé.");
      // Sign out + redirect après 3s pour laisser le toast être lu
      setTimeout(async () => {
        await supabase.auth.signOut();
        window.location.href = "/";
      }, 3000);
    } catch (e) {
      toast.error(e.message || "Suppression indisponible");
    }
  };

  const handleBillingPortal = async () => {
    if (isDemo) { toast.success(t("mc.toast_demo_unavailable")); return; }
    setLoadingPortal(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        toast.error(t("mc.toast_session_expired"));
        return;
      }

      const res = await fetch("/api/billing-portal", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (res.ok) {
        const data = await res.json();
        if (data?.url) {
          window.location.href = data.url;
          return;
        }
      }

      if (res.status === 404) {
        toast.error(t("mc.toast_no_subscription"));
      } else {
        toast.error(t("mc.toast_tech_error"));
      }
    } catch {
      toast.error(t("mc.toast_tech_error"));
    } finally {
      setLoadingPortal(false);
    }
  };

  const logout = async () => {
    if (isDemo) { toast.success(t("mc.toast_demo_logout_disabled")); return; }
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  const initials = (coachData?.full_name || "C").split(" ").map(s => s[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 600, background: "#050505", overflowY: "auto", WebkitOverflowScrolling: "touch", fontFamily: "-apple-system,Inter,sans-serif", color: "#fff" }}>
      <style>{`@media(max-width:600px){.mc-content{padding-left:16px !important;padding-right:16px !important} .mc-header{padding-left:16px !important;padding-right:16px !important}}`}</style>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "50%", background: "radial-gradient(ellipse at 50% -10%, rgba(2,209,186,0.1) 0%, transparent 60%)", pointerEvents: "none" }} />

      {/* Header */}
      <div className="mc-header" style={{ position: "sticky", top: 0, zIndex: 10, background: "rgba(5,5,5,0.95)", WebkitBackdropFilter: "blur(16px)", backdropFilter: "blur(16px)", padding: "calc(env(safe-area-inset-top, 0px) + 16px) 24px 16px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={onClose} aria-label={t("mc.aria_close")} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 100, width: 44, height: 44, color: "rgba(255,255,255,0.6)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
          </button>
          <div>
            <div style={{ fontSize: 10, color: `${G}88`, letterSpacing: "3px", textTransform: "uppercase", marginBottom: 4 }}>{t("mc.eyebrow")}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: "#fff", letterSpacing: "-1.5px" }}>
              {firstName || t("coach.coach_fallback")}<span style={{ color: G }}>.</span>
            </div>
          </div>
          <div style={{ marginLeft: "auto", width: 44, height: 44, borderRadius: "50%", background: `${G}15`, border: `1px solid ${G}30`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: G }}>
            {initials}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, marginTop: 16, overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
          {TABS.map(tb => (
            <button key={tb.id} onClick={() => setTab(tb.id)} style={{
              padding: "8px 14px", borderRadius: 100, border: "none", cursor: "pointer",
              background: tab === tb.id ? `${G}15` : "transparent",
              color: tab === tb.id ? G : "rgba(255,255,255,0.4)",
              fontSize: 12, fontWeight: 600, fontFamily: "inherit", whiteSpace: "nowrap",
              transition: "all 0.15s",
            }}>{tb.label}</button>
          ))}
        </div>
      </div>

      <div className="mc-content" style={{ position: "relative", zIndex: 1, maxWidth: 600, margin: "0 auto", padding: "24px 24px calc(env(safe-area-inset-bottom, 0px) + 100px)" }}>

        {/* ===== PROFIL ===== */}
        {tab === "profil" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={sectionTitle}>{t("mc.profile_title")}</div>
            <Field label={t("mc.field_first_name")} value={firstName} onChange={setFirstName} />
            <Field label={t("mc.field_last_name")} value={lastName} onChange={setLastName} />
            <Field label={t("mc.field_email")} value={coachData?.email || ""} disabled note={t("mc.field_email_note")} />
            <Field label={t("mc.field_phone")} value={phone} onChange={setPhone} placeholder={t("mc.field_phone_placeholder")} />
            <Field label={t("mc.field_city")} value={city} onChange={setCity} placeholder={t("mc.field_city_placeholder")} />
            <SaveButton onClick={saveProfile} loading={savingProfile} />
          </div>
        )}

        {/* ===== ABONNEMENT ===== */}
        {tab === "abonnement" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={sectionTitle}>{t("mc.subscription_title")}</div>
            <div style={card}>
              <div style={{ fontSize: 10, color: `${G}88`, letterSpacing: "2px", textTransform: "uppercase", marginBottom: 8 }}>{t("mc.subscription_current")}</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: "#fff", letterSpacing: "-1px" }}>
                {coachData?.plan === "founding" ? t("mc.plan_founding") : coachData?.plan === "starter" ? t("mc.plan_starter") : coachData?.plan === "elite" ? t("mc.plan_elite") : t("mc.plan_pro")}
              </div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginTop: 4 }}>
                {coachData?.locked_price ? fillTpl(t("mc.locked_price"), { price: coachData.locked_price }) : ""}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: G }} />
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>{t("mc.status_active")}</span>
              </div>
            </div>
            <button
              onClick={handleBillingPortal}
              disabled={loadingPortal}
              style={{ ...outlineBtn, opacity: loadingPortal ? 0.5 : 1, cursor: loadingPortal ? "wait" : "pointer" }}
            >
              {loadingPortal ? t("mc.btn_portal_loading") : t("mc.btn_portal")}
            </button>
          </div>
        )}

        {/* ===== FACTURATION ===== */}
        {tab === "facturation" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={sectionTitle}>{t("mc.billing_title")}</div>
            <Field label={t("mc.field_siret")} value={siret} onChange={v => setSiret(v.replace(/[^0-9]/g, '').slice(0, 14))} placeholder={t("mc.field_siret_placeholder")} inputMode="numeric" />
            <Field label={t("mc.field_business_name")} value={businessName} onChange={setBusinessName} placeholder={t("mc.field_business_name_placeholder")} />
            <Field label={t("mc.field_business_address")} value={businessAddress} onChange={setBusinessAddress} placeholder={t("mc.field_business_address_placeholder")} />

            <div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", marginBottom: 6, fontWeight: 600 }}>{t("mc.field_legal_form")}</div>
              <select
                value={legalForm}
                onChange={e => setLegalForm(e.target.value)}
                style={{
                  width: "100%", padding: "12px 14px",
                  background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 10, color: "#fff", fontSize: 14, outline: "none",
                  fontFamily: "inherit",
                }}
              >
                <option value="">{t("mc.legal_form_placeholder")}</option>
                <option value="auto-entrepreneur">{t("mc.legal_auto")}</option>
                <option value="EI">{t("mc.legal_ei")}</option>
                <option value="EURL">{t("mc.legal_eurl")}</option>
                <option value="SASU">{t("mc.legal_sasu")}</option>
                <option value="SAS">{t("mc.legal_sas")}</option>
                <option value="SARL">{t("mc.legal_sarl")}</option>
                <option value="autre">{t("mc.legal_other")}</option>
              </select>
            </div>

            {(legalForm === "auto-entrepreneur" || legalForm === "EI" || legalForm === "") ? (
              <div style={{ fontSize: 11, color: "rgba(2,209,186,0.7)", padding: "10px 14px", background: "rgba(2,209,186,0.05)", border: "1px solid rgba(2,209,186,0.15)", borderRadius: 10, lineHeight: 1.5 }}>
                {legalForm === "auto-entrepreneur" || legalForm === "EI"
                  ? t("mc.legal_hint_auto")
                  : t("mc.legal_hint_select")}
              </div>
            ) : (
              <>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", lineHeight: 1.5 }}>
                  {t("mc.fields_required_for_companies")}
                </div>
                <div style={{ display: "flex", gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <Field label={t("mc.field_rcs_city")} value={rcsCity} onChange={setRcsCity} placeholder={t("mc.field_rcs_city_placeholder")} />
                  </div>
                  <div style={{ flex: 1.2 }}>
                    <Field label={t("mc.field_rcs_number")} value={rcsNumber} onChange={setRcsNumber} placeholder={t("mc.field_rcs_number_placeholder")} />
                  </div>
                </div>
                <Field label={t("mc.field_vat")} value={vatNumber} onChange={setVatNumber} placeholder={t("mc.field_vat_placeholder")} />
                <Field label={t("mc.field_capital")} value={capitalSocial} onChange={setCapitalSocial} placeholder={t("mc.field_capital_placeholder")} inputMode="numeric" />
              </>
            )}

            <SaveButton onClick={saveBilling} loading={savingBilling} />
            <div style={{ marginTop: 16 }}>
              <div style={sectionTitle}>{t("mc.invoices_title")}</div>
              <button style={outlineBtn}>{t("mc.btn_invoices")}</button>
            </div>
          </div>
        )}

        {/* ===== PARRAINAGE COACH→COACH ===== */}
        {tab === "parrainage" && (
          <CoachReferralSection coachData={coachData} isDemo={isDemo} />
        )}

        {/* ===== DONNÉES (export CSV portability) ===== */}
        {tab === "donnees" && (
          <div>
            <div style={{
              marginBottom: 16,
              padding: "12px 14px",
              background: "rgba(2,209,186,0.05)",
              border: "1px solid rgba(2,209,186,0.18)",
              borderRadius: 12,
              display: "flex", alignItems: "center", gap: 12,
            }}>
              <div style={{ flex: 1, fontSize: 12, color: "rgba(255,255,255,0.7)", lineHeight: 1.5 }}>
                Tu migres depuis <strong style={{ color: "#fff" }}>Trainerize, Hexfit, Eklo, Hapyo</strong> ?
                Le guide te montre comment importer ta liste clients, leurs pesées et leurs charges en 30 min.
              </div>
              <button
                type="button"
                onClick={() => setShowMigrationHelp(true)}
                style={{
                  padding: "7px 12px",
                  background: "rgba(2,209,186,0.12)",
                  border: "1px solid rgba(2,209,186,0.3)",
                  borderRadius: 9,
                  color: G,
                  fontSize: 11, fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                }}
              >
                Guide migration →
              </button>
            </div>
            <DataExportSection coachId={coachData?.id} isDemo={isDemo} />
          </div>
        )}

        {/* ===== SÉCURITÉ ===== */}
        {tab === "securite" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={sectionTitle}>{t("mc.password_title")}</div>
            <Field label={t("mc.field_new_password")} value={newPassword} onChange={setNewPassword} type="password" placeholder={t("mc.field_new_password_placeholder")} />
            <Field label={t("mc.field_confirm_password")} value={confirmPassword} onChange={setConfirmPassword} type="password" placeholder={t("mc.field_confirm_password_placeholder")} />
            {newPassword && confirmPassword && newPassword !== confirmPassword && (
              <div style={{ fontSize: 12, color: RED }}>{t("mc.password_mismatch_inline")}</div>
            )}
            <SaveButton onClick={changePassword} loading={savingPassword} label={t("mc.btn_change_password")} disabled={newPassword.length < 8 || newPassword !== confirmPassword} />

            {/* Cookies & Confidentialité */}
            <div style={{ marginTop: 32, padding: "20px", background: "rgba(2,209,186,0.04)", border: "1px solid rgba(2,209,186,0.12)", borderRadius: 16 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", color: G, marginBottom: 8 }}>{t("mc.cookies_title")}</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", lineHeight: 1.5, marginBottom: 14 }}>{t("mc.cookies_desc")}</div>
              <button
                style={{ ...outlineBtn, borderColor: "rgba(2,209,186,0.25)", color: G }}
                onClick={() => {
                  haptic.light?.();
                  if (typeof window !== "undefined" && window.RBConsent && typeof window.RBConsent.show === "function") {
                    window.RBConsent.show();
                  } else {
                    toast.error(t("mc.cookies_unavailable"));
                  }
                }}
              >
                {t("mc.btn_manage_cookies")}
              </button>
            </div>

            {/* Zone danger */}
            <div style={{ marginTop: 40, padding: "20px", background: "rgba(255,107,107,0.04)", border: "1px solid rgba(255,107,107,0.12)", borderRadius: 16 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", color: RED, marginBottom: 16 }}>{t("mc.danger_zone")}</div>
              <button style={{ ...outlineBtn, borderColor: "rgba(2,209,186,0.25)", color: G }} onClick={exportMyData}>{t("mc.btn_export_data")}</button>
              <button style={{ ...outlineBtn, borderColor: "rgba(255,107,107,0.2)", color: RED, marginTop: 8 }} onClick={deleteMyAccount}>{t("mc.btn_delete_account")}</button>
            </div>

            {/* Déconnexion */}
            <button onClick={logout} style={{
              marginTop: 24, width: "100%", padding: 16,
              background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 14, color: RED, fontSize: 14, fontWeight: 700,
              cursor: "pointer", fontFamily: "inherit",
            }}>{t("mc.btn_logout")}</button>
          </div>
        )}

      </div>

      <HelpMigrationGuide
        open={showMigrationHelp}
        onClose={() => setShowMigrationHelp(false)}
      />
    </div>
  );
}

// ===== FIELD COMPONENT =====
function Field({ label, value, onChange, type = "text", placeholder = "", disabled = false, note, inputMode }) {
  return (
    <div>
      <div style={{ fontSize: 10, letterSpacing: "2px", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", marginBottom: 6, fontWeight: 600 }}>{label}</div>
      <input
        type={type}
        value={value}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        placeholder={placeholder}
        disabled={disabled}
        inputMode={inputMode}
        style={{
          width: "100%", padding: "14px 16px",
          background: disabled ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14,
          color: disabled ? "rgba(255,255,255,0.3)" : "#fff",
          fontSize: 16, outline: "none", boxSizing: "border-box", fontFamily: "inherit",
          opacity: disabled ? 0.6 : 1,
        }}
      />
      {note && <div style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", marginTop: 4 }}>{note}</div>}
    </div>
  );
}

// ===== SAVE BUTTON =====
function SaveButton({ onClick, loading, label, disabled = false }) {
  const t = useT();
  const lbl = label || t("mc.btn_save_default");
  return (
    <button onClick={onClick} disabled={loading || disabled} style={{
      width: "100%", padding: 16,
      background: (loading || disabled) ? "rgba(255,255,255,0.04)" : `linear-gradient(135deg, #02d1ba, #02d1bacc)`,
      color: (loading || disabled) ? "rgba(255,255,255,0.25)" : "#000",
      border: "none", borderRadius: 14, fontSize: 14, fontWeight: 800,
      cursor: (loading || disabled) ? "not-allowed" : "pointer",
      fontFamily: "inherit", textTransform: "uppercase", letterSpacing: "0.5px",
      boxShadow: (loading || disabled) ? "none" : "0 8px 24px rgba(2,209,186,0.3)",
    }}>{loading ? t("mc.btn_saving") : lbl}</button>
  );
}

// ===== STYLES =====
const sectionTitle = { fontSize: 10, fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", color: "rgba(255,255,255,0.25)", marginBottom: 4 };
const card = { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 18, padding: "20px 22px" };
const outlineBtn = { width: "100%", padding: 14, background: "transparent", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, color: "rgba(255,255,255,0.5)", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", textAlign: "center", display: "block" };

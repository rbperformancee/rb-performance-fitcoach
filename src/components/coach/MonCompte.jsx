import React, { useState } from "react";
import { supabase } from "../../lib/supabase";
import { toast } from "../Toast";
import haptic from "../../lib/haptic";

const G = "#02d1ba";
const RED = "#ff6b6b";

/**
 * MonCompte — page "Qui je suis" du coach.
 * Profil personnel, abonnement SaaS, facturation, sécurité.
 *
 * Séparation avec Settings.jsx :
 *   MonCompte = QUI je suis (identité, abo, facture, sécurité)
 *   Settings  = COMMENT je bosse (plans coaching, branding, notifs)
 */
export default function MonCompte({ coachData, isDemo = false, initialTab, onClose }) {
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
  const [savingBilling, setSavingBilling] = useState(false);

  // Sécurité
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  // Abonnement
  const [loadingPortal, setLoadingPortal] = useState(false);

  const TABS = [
    { id: "profil", label: "Profil" },
    { id: "abonnement", label: "Abonnement" },
    { id: "facturation", label: "Facturation" },
    { id: "securite", label: "Sécurité" },
  ];

  const saveProfile = async () => {
    if (isDemo) { toast.success("Disponible en version complète"); return; }
    setSavingProfile(true);
    const { error } = await supabase.from("coaches").update({
      full_name: `${firstName.trim()} ${lastName.trim()}`.trim(),
      phone: phone.trim() || null,
      city: city.trim() || null,
    }).eq("id", coachData.id);
    setSavingProfile(false);
    if (error) toast.error("Erreur");
    else toast.success("Profil mis à jour");
  };

  const saveBilling = async () => {
    if (isDemo) { toast.success("Disponible en version complète"); return; }
    setSavingBilling(true);
    const { error } = await supabase.from("coaches").update({
      siret: siret.trim() || null,
      business_name: businessName.trim() || null,
      business_address: businessAddress.trim() || null,
    }).eq("id", coachData.id);
    setSavingBilling(false);
    if (error) toast.error("Erreur");
    else toast.success("Facturation mise à jour");
  };

  const changePassword = async () => {
    if (newPassword.length < 8) { toast.error("8 caractères minimum"); return; }
    if (newPassword !== confirmPassword) { toast.error("Les mots de passe ne correspondent pas"); return; }
    setSavingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSavingPassword(false);
    if (error) toast.error(error.message);
    else { toast.success("Mot de passe changé"); setNewPassword(""); setConfirmPassword(""); }
  };

  const handleBillingPortal = async () => {
    if (isDemo) { toast.success("Disponible en version complète"); return; }
    setLoadingPortal(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        toast.error("Session expirée, reconnecte-toi.");
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
        toast.error("Aucun abonnement actif trouvé. Contacte-nous si tu penses que c'est une erreur.");
      } else {
        toast.error("Erreur technique, réessaie dans un instant");
      }
    } catch {
      toast.error("Erreur technique, réessaie dans un instant");
    } finally {
      setLoadingPortal(false);
    }
  };

  const logout = async () => {
    if (isDemo) { toast.success("Desactive en mode demo"); return; }
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  const initials = (coachData?.full_name || "C").split(" ").map(s => s[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 600, background: "#050505", overflowY: "auto", WebkitOverflowScrolling: "touch", fontFamily: "-apple-system,Inter,sans-serif", color: "#fff" }}>
      <style>{`@media(max-width:600px){.mc-content{padding-left:16px !important;padding-right:16px !important} .mc-header{padding-left:16px !important;padding-right:16px !important}}`}</style>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "50%", background: "radial-gradient(ellipse at 50% -10%, rgba(2,209,186,0.1) 0%, transparent 60%)", pointerEvents: "none" }} />

      {/* Header */}
      <div className="mc-header" style={{ position: "sticky", top: 0, zIndex: 10, background: "rgba(5,5,5,0.95)", backdropFilter: "blur(16px)", padding: "calc(env(safe-area-inset-top, 0px) + 16px) 24px 16px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={onClose} aria-label="Fermer" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 100, width: 44, height: 44, color: "rgba(255,255,255,0.6)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
          </button>
          <div>
            <div style={{ fontSize: 10, color: `${G}88`, letterSpacing: "3px", textTransform: "uppercase", marginBottom: 4 }}>Mon compte</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: "#fff", letterSpacing: "-1.5px" }}>
              {firstName || "Coach"}<span style={{ color: G }}>.</span>
            </div>
          </div>
          <div style={{ marginLeft: "auto", width: 44, height: 44, borderRadius: "50%", background: `${G}15`, border: `1px solid ${G}30`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: G }}>
            {initials}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, marginTop: 16, overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              padding: "8px 14px", borderRadius: 100, border: "none", cursor: "pointer",
              background: tab === t.id ? `${G}15` : "transparent",
              color: tab === t.id ? G : "rgba(255,255,255,0.4)",
              fontSize: 12, fontWeight: 600, fontFamily: "inherit", whiteSpace: "nowrap",
              transition: "all 0.15s",
            }}>{t.label}</button>
          ))}
        </div>
      </div>

      <div className="mc-content" style={{ position: "relative", zIndex: 1, maxWidth: 600, margin: "0 auto", padding: "24px 24px calc(env(safe-area-inset-bottom, 0px) + 100px)" }}>

        {/* ===== PROFIL ===== */}
        {tab === "profil" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={sectionTitle}>Profil personnel</div>
            <Field label="Prénom" value={firstName} onChange={setFirstName} />
            <Field label="Nom" value={lastName} onChange={setLastName} />
            <Field label="Email" value={coachData?.email || ""} disabled note="Pour changer ton email, contacte le support." />
            <Field label="Téléphone" value={phone} onChange={setPhone} placeholder="+33 6 12 34 56 78" />
            <Field label="Ville" value={city} onChange={setCity} placeholder="Paris, Lyon..." />
            <SaveButton onClick={saveProfile} loading={savingProfile} />
          </div>
        )}

        {/* ===== ABONNEMENT ===== */}
        {tab === "abonnement" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={sectionTitle}>Mon abonnement RB Perform</div>
            <div style={card}>
              <div style={{ fontSize: 10, color: `${G}88`, letterSpacing: "2px", textTransform: "uppercase", marginBottom: 8 }}>Plan actuel</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: "#fff", letterSpacing: "-1px" }}>
                {coachData?.plan === "founding" ? "Founding Coach" : coachData?.plan === "starter" ? "Starter" : coachData?.plan === "elite" ? "Elite" : "Pro"}
              </div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginTop: 4 }}>
                {coachData?.locked_price ? `${coachData.locked_price}€/mois verrouillé à vie` : ""}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: G }} />
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>Actif</span>
              </div>
            </div>
            <button
              onClick={handleBillingPortal}
              disabled={loadingPortal}
              style={{ ...outlineBtn, opacity: loadingPortal ? 0.5 : 1, cursor: loadingPortal ? "wait" : "pointer" }}
            >
              {loadingPortal ? "Ouverture…" : "Gérer mon abonnement (Stripe) →"}
            </button>
          </div>
        )}

        {/* ===== FACTURATION ===== */}
        {tab === "facturation" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={sectionTitle}>Informations de facturation</div>
            <Field label="SIRET" value={siret} onChange={v => setSiret(v.replace(/[^0-9]/g, '').slice(0, 14))} placeholder="14 chiffres" inputMode="numeric" />
            <Field label="Raison sociale" value={businessName} onChange={setBusinessName} placeholder="Nom sur la facture" />
            <Field label="Adresse de facturation" value={businessAddress} onChange={setBusinessAddress} placeholder="12 rue de la Paix, 75002 Paris" />
            <SaveButton onClick={saveBilling} loading={savingBilling} />
            <div style={{ marginTop: 16 }}>
              <div style={sectionTitle}>Historique des factures</div>
              <button style={outlineBtn}>Voir mes factures (Stripe) →</button>
            </div>
          </div>
        )}

        {/* ===== SÉCURITÉ ===== */}
        {tab === "securite" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={sectionTitle}>Changer le mot de passe</div>
            <Field label="Nouveau mot de passe" value={newPassword} onChange={setNewPassword} type="password" placeholder="8 caractères minimum" />
            <Field label="Confirmer" value={confirmPassword} onChange={setConfirmPassword} type="password" placeholder="Même mot de passe" />
            {newPassword && confirmPassword && newPassword !== confirmPassword && (
              <div style={{ fontSize: 12, color: RED }}>Les mots de passe ne correspondent pas.</div>
            )}
            <SaveButton onClick={changePassword} loading={savingPassword} label="Changer le mot de passe" disabled={newPassword.length < 8 || newPassword !== confirmPassword} />

            {/* Zone danger */}
            <div style={{ marginTop: 40, padding: "20px", background: "rgba(255,107,107,0.04)", border: "1px solid rgba(255,107,107,0.12)", borderRadius: 16 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", color: RED, marginBottom: 16 }}>Zone danger</div>
              <button style={{ ...outlineBtn, borderColor: "rgba(255,107,107,0.2)", color: RED }} onClick={() => toast.success("Contacte rb.performancee@gmail.com")}>Exporter mes données (RGPD)</button>
              <button style={{ ...outlineBtn, borderColor: "rgba(255,107,107,0.2)", color: RED, marginTop: 8 }} onClick={() => toast.error("Contacte rb.performancee@gmail.com pour supprimer ton compte")}>Supprimer mon compte</button>
            </div>

            {/* Déconnexion */}
            <button onClick={logout} style={{
              marginTop: 24, width: "100%", padding: 16,
              background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 14, color: RED, fontSize: 14, fontWeight: 700,
              cursor: "pointer", fontFamily: "inherit",
            }}>Se déconnecter</button>
          </div>
        )}

      </div>
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
function SaveButton({ onClick, loading, label = "Enregistrer", disabled = false }) {
  return (
    <button onClick={onClick} disabled={loading || disabled} style={{
      width: "100%", padding: 16,
      background: (loading || disabled) ? "rgba(255,255,255,0.04)" : `linear-gradient(135deg, #02d1ba, #02d1bacc)`,
      color: (loading || disabled) ? "rgba(255,255,255,0.25)" : "#000",
      border: "none", borderRadius: 14, fontSize: 14, fontWeight: 800,
      cursor: (loading || disabled) ? "not-allowed" : "pointer",
      fontFamily: "inherit", textTransform: "uppercase", letterSpacing: "0.5px",
      boxShadow: (loading || disabled) ? "none" : "0 8px 24px rgba(2,209,186,0.3)",
    }}>{loading ? "Enregistrement..." : label}</button>
  );
}

// ===== STYLES =====
const sectionTitle = { fontSize: 10, fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", color: "rgba(255,255,255,0.25)", marginBottom: 4 };
const card = { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 18, padding: "20px 22px" };
const outlineBtn = { width: "100%", padding: 14, background: "transparent", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, color: "rgba(255,255,255,0.5)", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", textAlign: "center", display: "block" };

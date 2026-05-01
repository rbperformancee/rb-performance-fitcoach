import React, { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { toast } from "../Toast";
import AppIcon from "../AppIcon";
import PushNotifModal from "./PushNotifModal";
import CoachPlansSettings from "./CoachPlansSettings";
import { useCoachPlans } from "../../hooks/useCoachPlans";
import { useT } from "../../lib/i18n";

const G = "#02d1ba";

/**
 * Settings — page parametres coach (stub minimaliste, onglets completes
 * a venir en session dediee).
 *
 * Accessible en mode demo: tous les champs sont interactifs mais les
 * appels Supabase sont court-circuites avec un toast 'Disponible en
 * version complete'. Un bandeau teal discret en haut signale le mode.
 *
 * Props:
 *   coachData: { id, full_name, coaching_name, logo_url, accent_color, ... }
 *   isDemo: boolean
 *   onClose: () => void
 */
export default function Settings({ coachData, isDemo = false, onClose }) {
  const t = useT();
  const [tab, setTab] = useState("plans");
  const [showPushModal, setShowPushModal] = useState(false);

  // Local state (les champs sont editables meme en demo)
  const [firstName, setFirstName] = useState(coachData?.full_name?.split(" ")[0] || "");
  const [lastName, setLastName]   = useState(coachData?.full_name?.split(" ").slice(1).join(" ") || "");
  const [coachingName, setCoachingName] = useState(coachData?.coaching_name || "");
  const [accentColor, setAccentColor]   = useState(coachData?.accent_color || G);
  const [logoUrl, setLogoUrl] = useState(coachData?.logo_url || "");
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const [saving, setSaving] = useState(false);

  async function uploadLogo(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error("Photo trop lourde (max 2 Mo)"); return; }
    if (!file.type.startsWith("image/")) { toast.error("Format image uniquement"); return; }
    if (isDemo) { toast.info(t("set.toast_demo_unavailable")); return; }
    setUploadingLogo(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${coachData.id}/logo-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("coach-logos").upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("coach-logos").getPublicUrl(path);
      const url = data.publicUrl + "?t=" + Date.now();
      setLogoUrl(url);
      // Persist immédiatement
      await supabase.from("coaches").update({ logo_url: url }).eq("id", coachData.id);
      toast.success("Photo de profil mise à jour ✓");
    } catch (err) {
      toast.error(err.message || "Erreur upload");
    }
    setUploadingLogo(false);
  }

  async function saveProfile() {
    if (isDemo) {
      toast.info(t("set.toast_demo_unavailable"));
      return;
    }
    setSaving(true);
    try {
      const full_name = `${firstName.trim()} ${lastName.trim()}`.trim();
      const { error } = await supabase
        .from("coaches")
        .update({ full_name, coaching_name: coachingName.trim() || null, accent_color: accentColor, logo_url: logoUrl || null })
        .eq("id", coachData.id);
      if (error) throw error;
      toast.success(t("set.toast_profile_saved"));
    } catch (e) {
      toast.error(e.message || t("set.toast_error"));
    }
    setSaving(false);
  }

  const { plans: coachPlans, reload: reloadPlans } = useCoachPlans(coachData?.id);

  const TABS = [
    { id: "plans", label: t("set.tab_plans") },
    { id: "branding", label: t("set.tab_branding") },
    { id: "notifications", label: t("set.tab_notifications") },
    { id: "paiements", label: t("set.tab_paiements") },
  ];

  return (
    <div style={wrap}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "50%", background: "radial-gradient(ellipse at 50% -10%, rgba(2,209,186,0.1) 0%, transparent 60%)", pointerEvents: "none", zIndex: 0 }} />
      <style>{`
        .set-input:focus { border-color: ${G} !important; background: rgba(2,209,186,.03) !important; outline: none; }
        .set-tab:hover { color: rgba(255,255,255,.75) !important; }
        @media(max-width:600px){.set-content{padding-left:16px !important;padding-right:16px !important}}
      `}</style>

      {/* Header */}
      <div className="set-header" style={header}>
        <button
          onClick={() => {
            // Smart back : si on est dans un onglet non-default, on revient à l'onglet branding (vue d'entrée).
            // Si déjà sur branding, on ferme les paramètres (retour dashboard).
            if (tab !== "branding") setTab("branding");
            else onClose?.();
          }}
          style={{ ...backBtn, padding: "8px 16px", borderRadius: 8, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", transition: "all .15s" }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(0,201,167,0.3)"; e.currentTarget.style.background = "rgba(0,201,167,0.06)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
        >
          <AppIcon name="arrow-left" size={14} color="rgba(255,255,255,.6)" />
          <span>{tab !== "branding" ? t("set.back") : t("set.back")}</span>
        </button>
        <div style={{ fontSize: 24, fontWeight: 800, color: "#fff", letterSpacing: "-1.5px" }}>
          {t("set.title")}<span style={{ color: "#00C9A7" }}>.</span>
        </div>
        <div style={{ width: 80 }} />
      </div>

      {/* Bandeau mode demo */}
      {isDemo && (
        <div style={demoBanner}>
          <AppIcon name="bell" size={12} color={G} />
          <span>
            <strong style={{ color: G, fontWeight: 700 }}>{t("set.demo_label")}</strong>
            {t("set.demo_sub")}
          </span>
        </div>
      )}

      {/* Tabs */}
      <div style={tabBar}>
        {TABS.map((tb) => (
          <button
            key={tb.id}
            onClick={() => setTab(tb.id)}
            className="set-tab"
            style={{
              ...tabBtn,
              ...(tab === tb.id ? tabBtnActive : {}),
            }}
          >
            {tb.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="set-content" style={content}>
        {tab === "branding" && (
          <Section title={t("set.coaching_title")} sub={t("set.coaching_sub")}>
            <Field label="Photo de profil" sub="Apparaît dans l'app de tes clients et sur ta vitrine publique. Max 2 Mo, JPG ou PNG.">
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                {logoUrl ? (
                  <img src={logoUrl} alt="logo" style={{ width: 64, height: 64, borderRadius: "50%", objectFit: "cover", border: `2px solid ${accentColor}55`, boxShadow: `0 0 16px ${accentColor}30` }} />
                ) : (
                  <div style={{ width: 64, height: 64, borderRadius: "50%", background: `${accentColor}1a`, border: `1px dashed ${accentColor}55`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, color: accentColor, fontWeight: 800, fontFamily: "'Bebas Neue',sans-serif" }}>
                    {((firstName + lastName) || coachingName || "RB").slice(0, 2).toUpperCase()}
                  </div>
                )}
                <label style={{ flex: 1, padding: "12px 16px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, cursor: "pointer", textAlign: "center", fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.7)", letterSpacing: "1px", textTransform: "uppercase", transition: "all .15s" }}>
                  {uploadingLogo ? "Upload…" : (logoUrl ? "Changer la photo" : "Choisir une photo")}
                  <input type="file" accept="image/*" onChange={uploadLogo} style={{ display: "none" }} />
                </label>
                {logoUrl ? (
                  <button type="button" onClick={async () => {
                    if (!window.confirm("Retirer la photo de profil ?")) return;
                    setLogoUrl("");
                    if (!isDemo) await supabase.from("coaches").update({ logo_url: null }).eq("id", coachData.id);
                    toast.success("Photo retirée");
                  }} style={{ padding: "10px 12px", background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 10, color: "#ff8888", cursor: "pointer", fontSize: 11, fontWeight: 700, fontFamily: "inherit" }}>×</button>
                ) : null}
              </div>
            </Field>
            <Field label={t("set.coaching_name_label")} sub={t("set.coaching_name_sub")}>
              <input type="text" value={coachingName} onChange={(e) => setCoachingName(e.target.value)} placeholder={t("set.coaching_name_placeholder")} style={input} className="set-input" />
            </Field>
            <Field label={t("set.color_label")}>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {["#02d1ba", "#f97316", "#a78bfa", "#ef4444", "#3b82f6", "#f5c842", "#ec4899", "#22c55e"].map((c, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setAccentColor(c)}
                    style={{
                      width: 40, height: 40, borderRadius: "50%",
                      background: c,
                      padding: 0, margin: 0,
                      border: accentColor === c ? "2px solid #fff" : ".5px solid rgba(255,255,255,.15)",
                      cursor: "pointer",
                      boxShadow: accentColor === c ? `0 0 16px ${c}, 0 0 0 4px ${c}25` : "none",
                      transition: "all .15s",
                      flexShrink: 0,
                    }}
                    aria-label={`Couleur ${c}`}
                    aria-pressed={accentColor === c}
                  />
                ))}
              </div>
            </Field>
            <button onClick={saveProfile} disabled={saving} style={{ ...btnPrimary, marginTop: 16 }}>
              {saving ? "..." : t("set.btn_save")}
            </button>

            {/* ===== VITRINE PUBLIQUE ===== */}
            <PublicProfileSection coachData={coachData} isDemo={isDemo} />

            {/* ===== PARRAINAGE ===== */}
            <ReferralSection coachData={coachData} isDemo={isDemo} />
          </Section>
        )}

        {tab === "plans" && (
          <Section>
            <CoachPlansSettings coachId={coachData?.id} plans={coachPlans} onReload={reloadPlans} />
          </Section>
        )}

        {tab === "notifications" && (
          <Section title={t("set.notif_title")} sub={t("set.notif_sub")}>
            <div style={{ marginBottom: 24 }}>
              <div style={sectionSubtitle}>{t("set.notif_email_section")}</div>
              {[
                { id: "notif_weekly_report", label: t("set.notif_weekly"), sub: t("set.notif_weekly_sub") },
                { id: "notif_churn_alert", label: t("set.notif_churn"), sub: t("set.notif_churn_sub") },
                { id: "notif_new_client", label: t("set.notif_new_client") },
                { id: "notif_expiring_sub", label: t("set.notif_expiring") },
              ].map((n) => (
                <Toggle key={n.id} label={n.label} sub={n.sub} defaultChecked />
              ))}
            </div>

            <div>
              <div style={sectionSubtitle}>{t("set.notif_push_section")}</div>
              <button
                onClick={() => setShowPushModal(true)}
                style={btnGhost}
              >
                <AppIcon name="bell" size={14} color={G} />
                {t("set.notif_enable_push_btn")}
              </button>
            </div>
          </Section>
        )}

        {tab === "paiements" && (
          <Section title={t("set.payments_title")} sub={t("set.payments_sub")}>
            <div style={{ ...planCard, background: "rgba(2,209,186,.04)", border: `.5px solid rgba(2,209,186,.2)` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(2,209,186,.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <AppIcon name="zap" size={16} color={G} />
                </div>
                <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 16, fontWeight: 900, color: "#fff" }}>{t("set.payments_card_title")}</div>
              </div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,.45)", lineHeight: 1.6, marginBottom: 14 }}>
                {t("set.payments_card_desc")}
              </div>
              <button
                onClick={() => { if (isDemo) { toast.info(t("set.toast_demo_unavailable")); return; } toast.info(t("set.toast_stripe_soon")); }}
                style={btnPrimary}
              >
                {t("set.payments_btn")}
              </button>
            </div>
          </Section>
        )}
      </div>

      <PushNotifModal
        open={showPushModal}
        onClose={() => setShowPushModal(false)}
        coachId={coachData?.id}
        isDemo={isDemo}
      />
    </div>
  );
}

// ===== VITRINE PUBLIQUE =====
function PublicProfileSection({ coachData, isDemo }) {
  const t = useT();
  const baseUrl = (typeof window !== "undefined" ? window.location.origin : "");

  const [enabled, setEnabled] = useState(coachData?.public_profile_enabled === true);
  const [slug, setSlug] = useState(coachData?.public_slug || "");
  const [bio, setBio] = useState(coachData?.public_bio || "");
  const [city, setCity] = useState(coachData?.public_city || "");
  const [photoUrl, setPhotoUrl] = useState(coachData?.public_photo_url || "");
  const [specialties, setSpecialties] = useState(Array.isArray(coachData?.public_specialties) ? coachData.public_specialties : []);
  const [newSpec, setNewSpec] = useState("");
  const [uploading, setUploading] = useState(false);
  const [savingVitrine, setSavingVitrine] = useState(false);

  const url = slug ? `${baseUrl}/coach/${slug}` : null;

  function slugify(s) {
    return (s || "")
      .toLowerCase()
      .normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40);
  }

  async function copy(text) {
    try { await navigator.clipboard.writeText(text); toast.success("Lien copié ✓"); }
    catch { toast.error("Copie impossible"); }
  }

  async function uploadPhoto(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) { toast.error("Photo trop lourde (max 3 Mo)"); return; }
    if (!file.type.startsWith("image/")) { toast.error("Format image uniquement"); return; }
    if (isDemo) { toast.info(t("set.toast_demo_unavailable")); return; }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${coachData.id}/vitrine-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("coach-logos").upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("coach-logos").getPublicUrl(path);
      const newUrl = data.publicUrl + "?t=" + Date.now();
      setPhotoUrl(newUrl);
      await supabase.from("coaches").update({ public_photo_url: newUrl }).eq("id", coachData.id);
      toast.success("Photo vitrine mise à jour ✓");
    } catch (err) {
      toast.error(err.message || "Erreur upload");
    }
    setUploading(false);
  }

  function addSpec() {
    const s = newSpec.trim();
    if (!s) return;
    if (specialties.includes(s)) { toast.info("Déjà ajouté"); return; }
    if (specialties.length >= 6) { toast.info("Max 6 spécialités"); return; }
    setSpecialties([...specialties, s]);
    setNewSpec("");
  }

  function removeSpec(i) {
    setSpecialties(specialties.filter((_, idx) => idx !== i));
  }

  async function saveVitrine() {
    if (isDemo) { toast.info(t("set.toast_demo_unavailable")); return; }
    if (!coachData?.id) return;
    const finalSlug = slug ? slugify(slug) : slugify(coachData.full_name || "coach");
    setSavingVitrine(true);
    try {
      const { error } = await supabase
        .from("coaches")
        .update({
          public_slug: finalSlug || null,
          public_bio: bio.trim() || null,
          public_city: city.trim() || null,
          public_specialties: specialties.length ? specialties : [],
          public_photo_url: photoUrl || null,
        })
        .eq("id", coachData.id);
      if (error) throw error;
      setSlug(finalSlug);
      toast.success("Vitrine enregistrée ✓");
    } catch (e) {
      if (String(e.message || "").includes("duplicate") || String(e.message || "").includes("unique")) {
        toast.error("Ce slug est déjà pris, choisis-en un autre");
      } else {
        toast.error(e.message || "Erreur enregistrement");
      }
    }
    setSavingVitrine(false);
  }

  async function toggleEnabled() {
    if (isDemo) { toast.info(t("set.toast_demo_unavailable")); return; }
    if (!coachData?.id) return;
    // Si on active sans slug, on en génère un automatiquement
    if (!enabled && !slug) {
      const auto = slugify(coachData.full_name || "coach");
      setSlug(auto);
      const { error: e1 } = await supabase
        .from("coaches")
        .update({ public_slug: auto, public_profile_enabled: true })
        .eq("id", coachData.id);
      if (e1) { toast.error(e1.message); return; }
      setEnabled(true);
      toast.success(`Vitrine en ligne sur /coach/${auto}`);
      return;
    }
    try {
      const next = !enabled;
      const { error } = await supabase
        .from("coaches")
        .update({ public_profile_enabled: next })
        .eq("id", coachData.id);
      if (error) throw error;
      setEnabled(next);
      toast.success(next ? "Vitrine en ligne ✓" : "Vitrine masquée");
    } catch (e) { toast.error(e.message); }
  }

  return (
    <div style={{ marginTop: 32, padding: "22px 22px 24px", background: "rgba(255,255,255,.025)", border: ".5px solid rgba(255,255,255,.07)", borderRadius: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".22em", textTransform: "uppercase", color: enabled ? G : "rgba(255,255,255,.35)", marginBottom: 4 }}>
            Vitrine publique {enabled && "· EN LIGNE"}
          </div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,.55)", lineHeight: 1.5 }}>
            Ta page publique partageable (Insta bio, signature email…)
          </div>
        </div>
        <button
          onClick={toggleEnabled}
          style={{
            position: "relative", flexShrink: 0,
            width: 44, height: 26, borderRadius: 100,
            background: enabled ? G : "rgba(255,255,255,.12)",
            border: "none", cursor: "pointer", padding: 0, transition: "background .2s",
          }}
          aria-label={enabled ? "Masquer la vitrine" : "Activer la vitrine"}
        >
          <div style={{
            position: "absolute", top: 3, left: enabled ? 21 : 3,
            width: 20, height: 20, borderRadius: "50%",
            background: "#fff", transition: "left .2s",
          }} />
        </button>
      </div>

      {/* URL + copy */}
      {enabled && url && (
        <div style={{ display: "flex", gap: 6, marginBottom: 18, padding: "10px 12px", background: "rgba(2,209,186,.05)", border: `.5px solid ${G}33`, borderRadius: 10 }}>
          <div style={{ flex: 1, fontSize: 12, fontFamily: "'JetBrains Mono', monospace", color: G, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", padding: "8px 0" }}>
            {url}
          </div>
          <button onClick={() => copy(url)} style={{ ...btnGhost, padding: "8px 12px", flexShrink: 0 }}>
            Copier
          </button>
          <a href={url} target="_blank" rel="noopener noreferrer" style={{ ...btnGhost, padding: "8px 12px", flexShrink: 0, textDecoration: "none" }}>
            Voir →
          </a>
        </div>
      )}

      {/* PHOTO */}
      <div style={{ marginBottom: 16 }}>
        <div style={sectionSubtitle}>Photo vitrine</div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ position: "relative", width: 72, height: 72, borderRadius: "50%", overflow: "hidden", background: "rgba(255,255,255,.04)", border: `1px solid ${G}33`, flexShrink: 0 }}>
            {photoUrl ? (
              <img src={photoUrl} alt="vitrine" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <div style={{ display: "grid", placeItems: "center", height: "100%", fontSize: 22, fontWeight: 800, color: `${G}aa` }}>
                {(coachData?.full_name || "?")[0]?.toUpperCase()}
              </div>
            )}
            {uploading && <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.6)", display: "grid", placeItems: "center", color: "#fff", fontSize: 10 }}>...</div>}
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ ...btnGhost, display: "inline-flex", cursor: "pointer" }}>
              {photoUrl ? "Changer" : "Téléverser"}
              <input type="file" accept="image/*" onChange={uploadPhoto} style={{ display: "none" }} />
            </label>
            {photoUrl && (
              <button
                onClick={async () => {
                  if (isDemo) return;
                  setPhotoUrl("");
                  await supabase.from("coaches").update({ public_photo_url: null }).eq("id", coachData.id);
                  toast.success("Photo retirée");
                }}
                style={{ ...btnGhost, marginLeft: 8, color: "#ff6b6b", borderColor: "rgba(255,107,107,.25)", background: "rgba(255,107,107,.04)" }}
              >
                Retirer
              </button>
            )}
            <div style={{ fontSize: 10, color: "rgba(255,255,255,.35)", marginTop: 8, letterSpacing: ".05em" }}>
              JPG/PNG/WebP · max 3 Mo
            </div>
          </div>
        </div>
      </div>

      {/* SLUG */}
      <div style={{ marginBottom: 16 }}>
        <div style={sectionSubtitle}>URL personnalisée</div>
        <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
          <div style={{ padding: "0 12px", height: 44, display: "flex", alignItems: "center", background: "rgba(255,255,255,.02)", border: ".5px solid rgba(255,255,255,.08)", borderRight: "none", borderRadius: "10px 0 0 10px", fontSize: 12, color: "rgba(255,255,255,.45)", fontFamily: "'JetBrains Mono', monospace" }}>
            /coach/
          </div>
          <input
            className="set-input"
            value={slug}
            onChange={e => setSlug(slugify(e.target.value))}
            placeholder="ton-nom"
            style={{ ...input, borderRadius: "0 10px 10px 0", fontFamily: "'JetBrains Mono', monospace", fontSize: 13 }}
          />
        </div>
      </div>

      {/* CITY */}
      <div style={{ marginBottom: 16 }}>
        <div style={sectionSubtitle}>Ville</div>
        <input
          className="set-input"
          value={city}
          onChange={e => setCity(e.target.value)}
          placeholder="Paris"
          style={input}
        />
      </div>

      {/* BIO */}
      <div style={{ marginBottom: 16 }}>
        <div style={sectionSubtitle}>Bio (max 500 caractères)</div>
        <textarea
          className="set-input"
          value={bio}
          onChange={e => setBio(e.target.value.slice(0, 500))}
          placeholder="Présente-toi en quelques lignes : ton parcours, ta méthode, à qui tu t'adresses…"
          rows={5}
          style={{ ...input, height: "auto", padding: "12px 14px", lineHeight: 1.6, resize: "vertical", minHeight: 120 }}
        />
        <div style={{ fontSize: 10, color: "rgba(255,255,255,.3)", textAlign: "right", marginTop: 4 }}>
          {bio.length}/500
        </div>
      </div>

      {/* SPECIALITES */}
      <div style={{ marginBottom: 18 }}>
        <div style={sectionSubtitle}>Spécialités (max 6)</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
          {specialties.map((s, i) => (
            <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 12px", background: `${G}10`, border: `.5px solid ${G}40`, borderRadius: 100, fontSize: 12, color: "#fff", fontWeight: 600 }}>
              {s}
              <button onClick={() => removeSpec(i)} style={{ background: "none", border: "none", color: `${G}aa`, cursor: "pointer", padding: 0, fontSize: 14, lineHeight: 1 }} aria-label={`Retirer ${s}`}>×</button>
            </span>
          ))}
        </div>
        {specialties.length < 6 && (
          <div style={{ display: "flex", gap: 6 }}>
            <input
              className="set-input"
              value={newSpec}
              onChange={e => setNewSpec(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addSpec(); } }}
              placeholder="Force athlétique, mobilité, perte de poids…"
              style={input}
            />
            <button onClick={addSpec} style={{ ...btnGhost, flexShrink: 0 }}>+ Ajouter</button>
          </div>
        )}
      </div>

      {/* SAVE */}
      <button
        onClick={saveVitrine}
        disabled={savingVitrine}
        style={{ ...btnPrimary, opacity: savingVitrine ? 0.5 : 1 }}
      >
        {savingVitrine ? "Enregistrement…" : "Enregistrer la vitrine"}
      </button>

      {/* TÉMOIGNAGES */}
      <TestimonialsManager coachData={coachData} isDemo={isDemo} />
    </div>
  );
}

// ===== TÉMOIGNAGES MANAGER =====
function TestimonialsManager({ coachData, isDemo }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // null | "new" | id
  const [draft, setDraft] = useState({ client_name: "", content: "", rating: 5, client_photo_url: "" });
  const [saving, setSaving] = useState(false);
  const [uploadingT, setUploadingT] = useState(false);

  async function load() {
    if (!coachData?.id) { setLoading(false); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("coach_testimonials")
        .select("*")
        .eq("coach_id", coachData.id)
        .order("ordre", { ascending: true })
        .order("created_at", { ascending: false });
      if (error) throw error;
      setItems(data || []);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [coachData?.id]);

  function startNew() {
    setDraft({ client_name: "", content: "", rating: 5, client_photo_url: "" });
    setEditing("new");
  }

  function startEdit(t) {
    setDraft({
      client_name: t.client_name || "",
      content: t.content || "",
      rating: t.rating || 5,
      client_photo_url: t.client_photo_url || "",
    });
    setEditing(t.id);
  }

  function cancel() {
    setEditing(null);
    setDraft({ client_name: "", content: "", rating: 5, client_photo_url: "" });
  }

  async function uploadPhoto(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error("Photo trop lourde (max 2 Mo)"); return; }
    if (!file.type.startsWith("image/")) { toast.error("Format image uniquement"); return; }
    if (isDemo) { toast.info("Démo : upload désactivé"); return; }
    setUploadingT(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${coachData.id}/testimonial-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("coach-logos").upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("coach-logos").getPublicUrl(path);
      setDraft(d => ({ ...d, client_photo_url: data.publicUrl + "?t=" + Date.now() }));
    } catch (err) { toast.error(err.message); }
    setUploadingT(false);
  }

  async function save() {
    if (isDemo) { toast.info("Démo : enregistrement désactivé"); return; }
    if (!draft.client_name.trim() || !draft.content.trim()) {
      toast.error("Nom + témoignage requis"); return;
    }
    setSaving(true);
    try {
      if (editing === "new") {
        const ordre = items.length;
        const { error } = await supabase.from("coach_testimonials").insert({
          coach_id: coachData.id,
          client_name: draft.client_name.trim(),
          content: draft.content.trim(),
          rating: draft.rating,
          client_photo_url: draft.client_photo_url || null,
          visible: true,
          ordre,
        });
        if (error) throw error;
        toast.success("Témoignage ajouté ✓");
      } else {
        const { error } = await supabase.from("coach_testimonials").update({
          client_name: draft.client_name.trim(),
          content: draft.content.trim(),
          rating: draft.rating,
          client_photo_url: draft.client_photo_url || null,
        }).eq("id", editing);
        if (error) throw error;
        toast.success("Témoignage modifié ✓");
      }
      cancel();
      load();
    } catch (e) { toast.error(e.message); }
    setSaving(false);
  }

  async function toggleVisible(t) {
    if (isDemo) return;
    try {
      const { error } = await supabase.from("coach_testimonials")
        .update({ visible: !t.visible }).eq("id", t.id);
      if (error) throw error;
      load();
    } catch (e) { toast.error(e.message); }
  }

  async function remove(t) {
    if (isDemo) return;
    if (!window.confirm(`Supprimer le témoignage de ${t.client_name} ?`)) return;
    try {
      const { error } = await supabase.from("coach_testimonials").delete().eq("id", t.id);
      if (error) throw error;
      toast.success("Supprimé");
      load();
    } catch (e) { toast.error(e.message); }
  }

  async function move(t, dir) {
    if (isDemo) return;
    const idx = items.findIndex(x => x.id === t.id);
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= items.length) return;
    const swap = items[newIdx];
    try {
      await Promise.all([
        supabase.from("coach_testimonials").update({ ordre: newIdx }).eq("id", t.id),
        supabase.from("coach_testimonials").update({ ordre: idx }).eq("id", swap.id),
      ]);
      load();
    } catch (e) { toast.error(e.message); }
  }

  return (
    <div style={{ marginTop: 24, paddingTop: 22, borderTop: "1px solid rgba(255,255,255,.06)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".22em", textTransform: "uppercase", color: "rgba(255,255,255,.4)", marginBottom: 4 }}>
            Témoignages clients
          </div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,.45)", lineHeight: 1.5 }}>
            Affichés sur ta vitrine (max 3 visibles)
          </div>
        </div>
        {editing === null && (
          <button onClick={startNew} style={{ ...btnGhost, flexShrink: 0 }}>+ Ajouter</button>
        )}
      </div>

      {loading && (
        <div style={{ fontSize: 12, color: "rgba(255,255,255,.35)", padding: "12px 0" }}>Chargement…</div>
      )}

      {!loading && items.length === 0 && editing === null && (
        <div style={{ padding: "20px", background: "rgba(255,255,255,.02)", border: ".5px dashed rgba(255,255,255,.1)", borderRadius: 12, fontSize: 12, color: "rgba(255,255,255,.45)", textAlign: "center", lineHeight: 1.6 }}>
          Aucun témoignage pour l'instant.<br/>
          Ajoute-en pour booster la conversion sur ta vitrine.
        </div>
      )}

      {/* LISTE */}
      {!loading && items.length > 0 && editing === null && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {items.map((t, i) => (
            <div key={t.id} style={{
              padding: "14px 14px",
              background: "rgba(255,255,255,.025)",
              border: ".5px solid rgba(255,255,255,.07)",
              borderRadius: 12,
              opacity: t.visible ? 1 : 0.5,
            }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 8 }}>
                {t.client_photo_url ? (
                  <img src={t.client_photo_url} alt={t.client_name} style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                ) : (
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: `${G}22`, display: "grid", placeItems: "center", fontSize: 13, fontWeight: 800, color: G, flexShrink: 0 }}>
                    {(t.client_name || "?")[0]?.toUpperCase()}
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", marginBottom: 2 }}>{t.client_name}</div>
                  <div style={{ fontSize: 11, color: "#fbbf24", letterSpacing: 1.5 }}>
                    {"★".repeat(t.rating || 5)}<span style={{ color: "rgba(255,255,255,.15)" }}>{"★".repeat(5 - (t.rating || 5))}</span>
                  </div>
                </div>
                {!t.visible && (
                  <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: 1.5, color: "rgba(255,255,255,.4)", padding: "3px 7px", background: "rgba(255,255,255,.05)", borderRadius: 100 }}>MASQUÉ</span>
                )}
              </div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,.7)", lineHeight: 1.55, marginBottom: 10, fontStyle: "italic" }}>
                « {t.content} »
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <button onClick={() => move(t, -1)} disabled={i === 0} style={miniBtn(i === 0)}>↑</button>
                <button onClick={() => move(t, 1)} disabled={i === items.length - 1} style={miniBtn(i === items.length - 1)}>↓</button>
                <button onClick={() => toggleVisible(t)} style={miniBtn(false)}>{t.visible ? "Masquer" : "Afficher"}</button>
                <button onClick={() => startEdit(t)} style={miniBtn(false)}>Éditer</button>
                <button onClick={() => remove(t)} style={{ ...miniBtn(false), color: "#ff6b6b", borderColor: "rgba(255,107,107,.25)" }}>Supprimer</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* FORMULAIRE */}
      {editing !== null && (
        <div style={{ padding: "16px 16px 18px", background: "rgba(2,209,186,.04)", border: `.5px solid ${G}25`, borderRadius: 12 }}>
          <div style={{ ...sectionSubtitle, color: G, marginBottom: 12 }}>
            {editing === "new" ? "Nouveau témoignage" : "Modifier"}
          </div>

          {/* Photo */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <div style={{ width: 56, height: 56, borderRadius: "50%", overflow: "hidden", background: "rgba(255,255,255,.04)", border: `1px solid ${G}33`, flexShrink: 0, display: "grid", placeItems: "center" }}>
              {draft.client_photo_url
                ? <img src={draft.client_photo_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : <div style={{ fontSize: 18, fontWeight: 800, color: `${G}aa` }}>{(draft.client_name || "?")[0]?.toUpperCase()}</div>
              }
            </div>
            <label style={{ ...btnGhost, cursor: "pointer" }}>
              {uploadingT ? "Upload…" : (draft.client_photo_url ? "Changer photo" : "Photo (optionnel)")}
              <input type="file" accept="image/*" onChange={uploadPhoto} style={{ display: "none" }} />
            </label>
            {draft.client_photo_url && (
              <button onClick={() => setDraft(d => ({ ...d, client_photo_url: "" }))} style={{ ...miniBtn(false), color: "#ff6b6b" }}>×</button>
            )}
          </div>

          <div style={{ marginBottom: 10 }}>
            <div style={sectionSubtitle}>Prénom du client</div>
            <input className="set-input" value={draft.client_name} onChange={e => setDraft(d => ({ ...d, client_name: e.target.value.slice(0, 60) }))} placeholder="Lucas" style={input} />
          </div>

          <div style={{ marginBottom: 10 }}>
            <div style={sectionSubtitle}>Note</div>
            <div style={{ display: "flex", gap: 4 }}>
              {[1, 2, 3, 4, 5].map(n => (
                <button key={n} onClick={() => setDraft(d => ({ ...d, rating: n }))} style={{
                  background: "none", border: "none", cursor: "pointer",
                  fontSize: 22, color: n <= draft.rating ? "#fbbf24" : "rgba(255,255,255,.15)",
                  padding: 0, lineHeight: 1,
                }} aria-label={`${n} étoiles`}>★</button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <div style={sectionSubtitle}>Témoignage (max 280 caractères)</div>
            <textarea
              className="set-input"
              value={draft.content}
              onChange={e => setDraft(d => ({ ...d, content: e.target.value.slice(0, 280) }))}
              placeholder="-12 kg en 4 mois sans jamais être affamé. Le suivi quotidien fait toute la différence."
              rows={4}
              style={{ ...input, height: "auto", padding: "10px 14px", lineHeight: 1.55, resize: "vertical", minHeight: 90 }}
            />
            <div style={{ fontSize: 10, color: "rgba(255,255,255,.3)", textAlign: "right", marginTop: 4 }}>
              {draft.content.length}/280
            </div>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={cancel} style={{ ...btnGhost, flex: 1 }}>Annuler</button>
            <button onClick={save} disabled={saving} style={{ ...btnPrimary, flex: 1, opacity: saving ? 0.5 : 1 }}>
              {saving ? "…" : "Enregistrer"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const miniBtn = (disabled) => ({
  padding: "6px 10px",
  background: "rgba(255,255,255,.04)",
  border: ".5px solid rgba(255,255,255,.1)",
  borderRadius: 8,
  color: "rgba(255,255,255,.7)",
  fontSize: 11, fontWeight: 600,
  cursor: disabled ? "not-allowed" : "pointer",
  opacity: disabled ? 0.4 : 1,
  fontFamily: "inherit",
  letterSpacing: ".02em",
});

// ===== PARRAINAGE COACH =====
function ReferralSection({ coachData, isDemo }) {
  // ⚠ En travaux — masqué jusqu'au launch SaaS finalisé
  return (
    <div style={{ marginTop: 16, padding: 18, background: "rgba(255,165,0,0.04)", border: "1px dashed rgba(255,165,0,0.25)", borderRadius: 14 }}>
      <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: 2, color: "rgba(255,165,0,0.85)", textTransform: "uppercase", marginBottom: 6 }}>🚧 En travaux</div>
      <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", marginBottom: 4 }}>Parrainage coach</div>
      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", lineHeight: 1.6 }}>
        Bientôt : invite d'autres coachs et reçois 1 mois offert par parrainage. Disponible pour le launch SaaS.
      </div>
    </div>
  );

  // eslint-disable-next-line no-unreachable
  /* legacy code below */
  const t = useT();
  const code = coachData?.referral_code || "";
  const baseUrl = (typeof window !== "undefined" ? window.location.origin : "");
  const link = code ? `${baseUrl}/signup?ref=${code}` : null;
  const [stats, setStats] = useState({ total: 0, active: 0, rewarded: 0 });

  useEffect(() => {
    if (!coachData?.id || isDemo) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("referrals")
        .select("status")
        .eq("referrer_id", coachData.id);
      if (!cancelled && Array.isArray(data)) {
        setStats({
          total:    data.length,
          active:   data.filter((r) => r.status === "active").length,
          rewarded: data.filter((r) => r.status === "rewarded").length,
        });
      }
    })();
    return () => { cancelled = true; };
  }, [coachData?.id, isDemo]);

  // Demo stats
  const displayStats = isDemo ? { total: 3, active: 2, rewarded: 1 } : stats;

  async function copy(text) {
    try { await navigator.clipboard.writeText(text); toast.success(t("set.toast_link_copied")); }
    catch { toast.error(t("set.toast_copy_error")); }
  }

  return (
    <div style={{ marginTop: 16, padding: "20px 22px", background: "rgba(0,201,167,.04)", border: ".5px solid rgba(0,201,167,.2)", borderRadius: 14 }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".22em", textTransform: "uppercase", color: "#00C9A7", marginBottom: 10 }}>
        {t("set.referral_eyebrow")}
      </div>
      <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 700, color: "#fff", marginBottom: 6 }}>
        {t("set.referral_title")}<span style={{ color: "#00C9A7" }}>.</span>
      </div>
      <div style={{ fontSize: 12, color: "rgba(255,255,255,.4)", marginBottom: 16, lineHeight: 1.5 }}>
        {t("set.referral_desc_prefix")}<strong style={{ color: "#00C9A7" }}>{t("set.referral_reward")}</strong>{t("set.referral_desc_suffix")}
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 16 }}>
        <ReferralStat label={t("set.referral_stat_invited")} value={displayStats.total} />
        <ReferralStat label={t("set.referral_stat_active")}  value={displayStats.active} accent="#00C9A7" />
        <ReferralStat label={t("set.referral_stat_rewarded")} value={displayStats.rewarded} accent={G} />
      </div>

      {/* Code */}
      {code && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: ".22em", textTransform: "uppercase", color: "rgba(255,255,255,.3)" }}>
            {t("set.referral_your_code")}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <div style={{ flex: 1, padding: "11px 14px", background: "rgba(0,201,167,.06)", border: ".5px solid rgba(0,201,167,.2)", borderRadius: 10, fontFamily: "'JetBrains Mono', monospace", fontSize: 14, fontWeight: 600, color: "#00C9A7", letterSpacing: ".05em", textAlign: "center" }}>
              {code}
            </div>
            <button onClick={() => copy(code)} style={{ ...btnGhost, flexShrink: 0 }} title={t("set.referral_tooltip_copy_code")}>
              <AppIcon name="check" size={14} color={G} />
            </button>
          </div>
        </div>
      )}

      {link && (
        <div style={{ display: "flex", gap: 6 }}>
          <input
            readOnly
            value={link}
            style={{ ...input, fontSize: 11, fontFamily: "'JetBrains Mono', monospace" }}
            onClick={(e) => e.target.select()}
          />
          <button onClick={() => copy(link)} style={{ ...btnGhost, flexShrink: 0 }} title={t("set.referral_tooltip_copy")}>
            <AppIcon name="arrow-right" size={14} color={G} />
          </button>
        </div>
      )}

      {!code && !isDemo && (
        <div style={{ fontSize: 11, color: "rgba(255,255,255,.4)", textAlign: "center", padding: 14 }}>
          {t("set.referral_code_pending")}
        </div>
      )}
    </div>
  );
}

function ReferralStat({ label, value, accent }) {
  return (
    <div style={{ padding: "12px 8px", background: "rgba(255,255,255,.02)", border: ".5px solid rgba(255,255,255,.05)", borderRadius: 10, textAlign: "center" }}>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 22, fontWeight: 200, color: accent || "#fff", letterSpacing: "-1px", lineHeight: 1 }}>
        {value}
      </div>
      <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: ".18em", textTransform: "uppercase", color: "rgba(255,255,255,.3)", marginTop: 6 }}>
        {label}
      </div>
    </div>
  );
}

// ===== COMPOSANTS =====
function Section({ title, sub, children }) {
  return (
    <div style={{ maxWidth: 560, margin: "0 auto", paddingBottom: 80 }}>
      <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 24, fontWeight: 900, letterSpacing: "-.5px", color: "#fff", marginBottom: 6 }}>
        {title}
      </div>
      {sub && <div style={{ fontSize: 13, color: "rgba(255,255,255,.4)", marginBottom: 24, lineHeight: 1.5 }}>{sub}</div>}
      {children}
    </div>
  );
}

function Field({ label, sub, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
        <label style={{ fontSize: 11, fontWeight: 600, letterSpacing: ".12em", textTransform: "uppercase", color: "rgba(255,255,255,.4)" }}>{label}</label>
        {sub && <span style={{ fontSize: 10, color: "rgba(255,255,255,.25)" }}>{sub}</span>}
      </div>
      {children}
    </div>
  );
}

function Toggle({ label, sub, defaultChecked = false }) {
  const [on, setOn] = useState(defaultChecked);
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 0", borderBottom: ".5px solid rgba(255,255,255,.05)" }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,.75)", fontWeight: 500 }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: "rgba(255,255,255,.3)", marginTop: 2 }}>{sub}</div>}
      </div>
      <button
        onClick={() => setOn((v) => !v)}
        style={{
          width: 40, height: 22, borderRadius: 100,
          background: on ? G : "rgba(255,255,255,.1)",
          border: "none", cursor: "pointer",
          position: "relative",
          transition: "background .2s",
          flexShrink: 0,
        }}
        aria-pressed={on}
        aria-label={label}
      >
        <div style={{
          position: "absolute",
          top: 2, left: on ? 20 : 2,
          width: 18, height: 18,
          background: "#fff", borderRadius: "50%",
          transition: "left .2s",
          boxShadow: "0 2px 4px rgba(0,0,0,.3)",
        }} />
      </button>
    </div>
  );
}

// ===== STYLES =====
const wrap = {
  position: "fixed", inset: 0, zIndex: 600,
  background: "#050505",
  fontFamily: "'Inter', -apple-system, system-ui, sans-serif",
  color: "#fff",
  overflowY: "auto",
  WebkitOverflowScrolling: "touch",
  display: "flex", flexDirection: "column",
};
const header = {
  display: "flex", alignItems: "center", justifyContent: "space-between",
  padding: "calc(env(safe-area-inset-top, 0px) + 16px) 20px 16px",
  borderBottom: ".5px solid rgba(255,255,255,.05)",
  background: "rgba(5,5,5,.95)",
  WebkitBackdropFilter: "blur(16px)", backdropFilter: "blur(16px)",
  position: "sticky", top: 0, zIndex: 10,
};
const backBtn = {
  display: "flex", alignItems: "center", gap: 6,
  background: "transparent", border: "none",
  color: "rgba(255,255,255,.6)",
  fontSize: 12, cursor: "pointer",
  fontFamily: "inherit",
  padding: "6px 10px",
  width: 80,
};
const headerTitle = {
  fontFamily: "'Syne', sans-serif",
  fontSize: 13, fontWeight: 900,
  letterSpacing: ".1em", color: "#fff",
  textTransform: "uppercase",
  display: "flex", alignItems: "center", gap: 8,
};
const demoBanner = {
  display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
  padding: "10px 20px",
  background: "rgba(2,209,186,.06)",
  borderBottom: ".5px solid rgba(2,209,186,.15)",
  fontSize: 11,
  color: "rgba(255,255,255,.7)",
  letterSpacing: ".02em",
};
const tabBar = {
  display: "flex", gap: 4,
  overflowX: "auto",
  padding: "16px 20px 0",
  borderBottom: ".5px solid rgba(255,255,255,.05)",
  scrollbarWidth: "none",
};
const tabBtn = {
  padding: "10px 16px",
  background: "transparent", border: "none",
  color: "rgba(255,255,255,.35)",
  fontSize: 12, fontWeight: 600,
  letterSpacing: ".04em",
  cursor: "pointer", fontFamily: "inherit",
  borderBottom: "2px solid transparent",
  transition: "all .15s",
  whiteSpace: "nowrap",
  marginBottom: -1,
};
const tabBtnActive = {
  color: "#fff",
  borderBottomColor: G,
};
const content = {
  padding: "32px 20px 40px",
  flex: 1,
};
const sectionSubtitle = {
  fontSize: 10, fontWeight: 700,
  letterSpacing: ".22em", textTransform: "uppercase",
  color: "rgba(255,255,255,.3)",
  marginBottom: 12,
};
const input = {
  width: "100%",
  height: 44,
  padding: "0 14px",
  background: "rgba(255,255,255,.03)",
  border: ".5px solid rgba(255,255,255,.08)",
  borderRadius: 10,
  color: "#fff",
  fontSize: 14,
  fontFamily: "inherit",
  outline: "none",
  boxSizing: "border-box",
  transition: "border-color .15s, background .15s",
};
const btnPrimary = {
  width: "100%",
  padding: "13px 20px",
  background: G, color: "#000",
  border: "none", borderRadius: 10,
  fontFamily: "'Syne', sans-serif",
  fontSize: 12, fontWeight: 900,
  letterSpacing: ".1em", textTransform: "uppercase",
  cursor: "pointer",
  transition: "opacity .15s",
  boxShadow: "0 12px 30px rgba(2,209,186,.25)",
};
const btnGhost = {
  display: "inline-flex", alignItems: "center", gap: 8,
  padding: "10px 16px",
  background: "rgba(2,209,186,.06)",
  border: `.5px solid rgba(2,209,186,.25)`,
  borderRadius: 100,
  color: G,
  fontSize: 12, fontWeight: 600,
  letterSpacing: ".03em",
  cursor: "pointer", fontFamily: "inherit",
};
const planCard = {
  padding: "20px 22px",
  background: "rgba(255,255,255,.025)",
  border: ".5px solid rgba(255,255,255,.07)",
  borderRadius: 14,
  marginBottom: 16,
};

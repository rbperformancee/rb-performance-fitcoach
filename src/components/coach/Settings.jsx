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

  const [saving, setSaving] = useState(false);

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
        .update({ full_name, coaching_name: coachingName.trim() || null, accent_color: accentColor })
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
  const slug = coachData?.public_slug;
  const enabled = coachData?.public_profile_enabled === true;
  const baseUrl = (typeof window !== "undefined" ? window.location.origin : "");
  const url = slug ? `${baseUrl}/coach/${slug}` : null;

  async function copy(text) {
    try { await navigator.clipboard.writeText(text); toast.success(t("set.toast_copied")); }
    catch { toast.error(t("set.toast_copy_error")); }
  }

  async function toggleEnabled() {
    if (isDemo) { toast.info(t("set.toast_demo_unavailable")); return; }
    if (!coachData?.id) return;
    try {
      const { error } = await supabase
        .from("coaches")
        .update({ public_profile_enabled: !enabled })
        .eq("id", coachData.id);
      if (error) throw error;
      toast.success(enabled ? t("set.toast_vitrine_hidden") : t("set.toast_vitrine_enabled"));
      setTimeout(() => window.location.reload(), 600);
    } catch (e) { toast.error(e.message); }
  }

  return (
    <div style={{ marginTop: 32, padding: "20px 22px", background: "rgba(255,255,255,.025)", border: ".5px solid rgba(255,255,255,.07)", borderRadius: 14 }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".22em", textTransform: "uppercase", color: enabled ? G : "rgba(255,255,255,.3)", marginBottom: 10 }}>
        {t("set.public_eyebrow")} {enabled && t("set.public_active_suffix")}
      </div>
      <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 700, color: "#fff", marginBottom: 6 }}>
        {coachData?.full_name || t("set.public_default_name")}<span style={{ color: G }}>.</span>
      </div>
      <div style={{ fontSize: 12, color: "rgba(255,255,255,.4)", marginBottom: 16, lineHeight: 1.5 }}>
        {t("set.public_desc")}
      </div>

      {url && (
        <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
          <input
            readOnly
            value={url}
            style={{ ...input, fontSize: 12, fontFamily: "'JetBrains Mono', monospace" }}
            onClick={(e) => e.target.select()}
          />
          <button onClick={() => copy(url)} style={{ ...btnGhost, flexShrink: 0 }} title={t("set.public_tooltip_copy")}>
            <AppIcon name="check" size={14} color={G} />
          </button>
        </div>
      )}

      <button
        onClick={toggleEnabled}
        style={{
          width: "100%",
          padding: "11px 16px",
          background: enabled ? "rgba(255,107,107,.06)" : G,
          color: enabled ? "#ff6b6b" : "#000",
          border: enabled ? ".5px solid rgba(255,107,107,.2)" : "none",
          borderRadius: 10,
          fontSize: 12, fontWeight: 800, letterSpacing: ".06em", textTransform: "uppercase",
          cursor: "pointer", fontFamily: "'Syne', sans-serif",
        }}
      >
        {enabled ? t("set.public_btn_hide") : t("set.public_btn_show")}
      </button>
    </div>
  );
}

// ===== PARRAINAGE COACH =====
function ReferralSection({ coachData, isDemo }) {
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

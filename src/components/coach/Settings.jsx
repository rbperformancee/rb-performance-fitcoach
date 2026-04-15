import React, { useState } from "react";
import { supabase } from "../../lib/supabase";
import { toast } from "../Toast";
import AppIcon from "../AppIcon";
import PushNotifModal from "./PushNotifModal";

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
  const [tab, setTab] = useState("profil");
  const [showPushModal, setShowPushModal] = useState(false);

  // Local state (les champs sont editables meme en demo)
  const [firstName, setFirstName] = useState(coachData?.full_name?.split(" ")[0] || "");
  const [lastName, setLastName]   = useState(coachData?.full_name?.split(" ").slice(1).join(" ") || "");
  const [coachingName, setCoachingName] = useState(coachData?.coaching_name || "");
  const [accentColor, setAccentColor]   = useState(coachData?.accent_color || G);

  const [saving, setSaving] = useState(false);

  async function saveProfile() {
    if (isDemo) {
      toast.info("Disponible en version complete →");
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
      toast.success("Profil sauvegarde");
    } catch (e) {
      toast.error(e.message || "Erreur");
    }
    setSaving(false);
  }

  const TABS = [
    { id: "profil", label: "Profil" },
    { id: "branding", label: "Coaching" },
    { id: "notifications", label: "Notifications" },
    { id: "abonnement", label: "Abonnement" },
    { id: "paiements", label: "Paiements" },
  ];

  return (
    <div style={wrap}>
      <style>{`
        .set-input:focus { border-color: ${G} !important; background: rgba(2,209,186,.03) !important; outline: none; }
        .set-tab:hover { color: rgba(255,255,255,.75) !important; }
      `}</style>

      {/* Header */}
      <div style={header}>
        <button onClick={onClose} style={backBtn}>
          <AppIcon name="arrow-left" size={14} color="rgba(255,255,255,.6)" />
          <span>Retour</span>
        </button>
        <div style={headerTitle}>
          <span style={{ color: "rgba(255,255,255,.3)" }}>⚙</span>
          <span>Parametres</span>
        </div>
        <div style={{ width: 80 }} />
      </div>

      {/* Bandeau mode demo */}
      {isDemo && (
        <div style={demoBanner}>
          <AppIcon name="bell" size={12} color={G} />
          <span>
            <strong style={{ color: G, fontWeight: 700 }}>MODE DEMO</strong>
            {" "}· En vrai, tes donnees sont sauvegardees automatiquement.
          </span>
        </div>
      )}

      {/* Tabs */}
      <div style={tabBar}>
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="set-tab"
            style={{
              ...tabBtn,
              ...(tab === t.id ? tabBtnActive : {}),
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={content}>
        {tab === "profil" && (
          <Section title="Mon profil" sub="Informations affichees sur ton dashboard et cote clients.">
            <Field label="Prenom">
              <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} style={input} className="set-input" />
            </Field>
            <Field label="Nom">
              <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} style={input} className="set-input" />
            </Field>
            <Field label="Email" sub="Contacte le support pour changer">
              <input type="email" value={coachData?.email || ""} disabled style={{ ...input, opacity: .5, cursor: "not-allowed" }} />
            </Field>
            <button onClick={saveProfile} disabled={saving} style={{ ...btnPrimary, marginTop: 16 }}>
              {saving ? "..." : "Sauvegarder"}
            </button>
          </Section>
        )}

        {tab === "branding" && (
          <Section title="Mon coaching" sub="Personnalise l'experience vue par tes clients.">
            <Field label="Nom du coaching" sub="Affiche a la place de 'RB Perform' dans l'app client">
              <input type="text" value={coachingName} onChange={(e) => setCoachingName(e.target.value)} placeholder="RB Perform" style={input} className="set-input" />
            </Field>
            <Field label="Couleur principale">
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {[G, "#a78bfa", "#f97316", "#ef4444", "#60a5fa", "#34d399", "#ec4899", "#eab308"].map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setAccentColor(c)}
                    style={{
                      width: 36, height: 36, borderRadius: "50%",
                      background: c,
                      border: accentColor === c ? `2px solid #fff` : `.5px solid rgba(255,255,255,.1)`,
                      cursor: "pointer",
                      boxShadow: accentColor === c ? `0 0 12px ${c}` : "none",
                      transition: "all .15s",
                    }}
                    aria-label={c}
                  />
                ))}
              </div>
            </Field>
            <button onClick={saveProfile} disabled={saving} style={{ ...btnPrimary, marginTop: 16 }}>
              {saving ? "..." : "Sauvegarder"}
            </button>
          </Section>
        )}

        {tab === "notifications" && (
          <Section title="Notifications" sub="Choisis ce que tu veux recevoir par email et push.">
            <div style={{ marginBottom: 24 }}>
              <div style={sectionSubtitle}>Par email</div>
              {[
                { id: "notif_weekly_report", label: "Rapport hebdomadaire", sub: "Chaque lundi 8h · score business + alertes" },
                { id: "notif_churn_alert", label: "Alerte client inactif", sub: "Quand un client est inactif > 5 jours" },
                { id: "notif_new_client", label: "Nouveau client inscrit" },
                { id: "notif_expiring_sub", label: "Abonnement client expirant" },
              ].map((n) => (
                <Toggle key={n.id} label={n.label} sub={n.sub} defaultChecked />
              ))}
            </div>

            <div>
              <div style={sectionSubtitle}>Par push (navigateur)</div>
              <button
                onClick={() => setShowPushModal(true)}
                style={btnGhost}
              >
                <AppIcon name="bell" size={14} color={G} />
                Activer les notifications push
              </button>
            </div>
          </Section>
        )}

        {tab === "abonnement" && (
          <Section title="Mon abonnement" sub="Gere ton plan RB Perform.">
            <div style={planCard}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".22em", textTransform: "uppercase", color: "rgba(255,255,255,.3)" }}>Plan actuel</div>
              <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 32, fontWeight: 900, letterSpacing: "-1px", color: "#fff", margin: "8px 0" }}>
                Starter<span style={{ color: G }}>.</span>
              </div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,.4)" }}>149€ / mois · Renouvelle le 14 mai 2026</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,.25)", marginTop: 12 }}>Utilisation IA ce mois : <span style={{ color: G, fontFamily: "'JetBrains Mono',monospace" }}>3/10</span></div>
            </div>
            <a
              href="https://rb-perfor.vercel.app/pricing"
              target="_blank"
              rel="noopener"
              style={{ ...btnPrimary, textDecoration: "none", textAlign: "center", marginTop: 12, display: "block" }}
              onClick={(e) => { if (isDemo) { e.preventDefault(); toast.info("Disponible en version complete →"); } }}
            >
              Changer de plan
            </a>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,.25)", textAlign: "center", marginTop: 8 }}>
              La facturation se gere sur le web (App Store compatible)
            </div>
          </Section>
        )}

        {tab === "paiements" && (
          <Section title="Paiements clients" sub="Encaisse tes clients directement via Stripe Connect.">
            <div style={{ ...planCard, background: "rgba(2,209,186,.04)", border: `.5px solid rgba(2,209,186,.2)` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(2,209,186,.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <AppIcon name="zap" size={16} color={G} />
                </div>
                <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 16, fontWeight: 900, color: "#fff" }}>Encaisse tes clients directement</div>
              </div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,.45)", lineHeight: 1.6, marginBottom: 14 }}>
                Genere un lien de paiement en 2 taps, partage-le par message — ton client paie dans son navigateur, l'argent arrive sur ton compte.
              </div>
              <button
                onClick={() => { if (isDemo) { toast.info("Disponible en version complete →"); return; } toast.info("Stripe Connect setup - a venir"); }}
                style={btnPrimary}
              >
                Activer les paiements
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
  position: "fixed", inset: 0, zIndex: 200,
  background: "#000",
  fontFamily: "'DM Sans', -apple-system, sans-serif",
  color: "#fff",
  overflowY: "auto",
  WebkitOverflowScrolling: "touch",
  display: "flex", flexDirection: "column",
};
const header = {
  display: "flex", alignItems: "center", justifyContent: "space-between",
  padding: "calc(env(safe-area-inset-top, 12px) + 16px) 20px 16px",
  borderBottom: ".5px solid rgba(255,255,255,.05)",
  background: "rgba(5,5,5,.95)",
  backdropFilter: "blur(16px)",
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

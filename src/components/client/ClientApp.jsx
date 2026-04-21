import React, { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import ClientHome from "./ClientHome";
import ClientProgramme from "./ClientProgramme";
import ClientMessages from "./ClientMessages";
import ClientSuivi from "./ClientSuivi";

const G_DEFAULT = "#02d1ba";

/**
 * ClientApp — shell mobile-first pour l'app client.
 * 4 onglets (Accueil / Programme / Messages / Suivi) via bottom nav.
 * Couleur accent dynamique depuis coaches.accent_color du coach du client.
 */
export default function ClientApp({ user }) {
  const [tab, setTab] = useState("home");
  const [client, setClient] = useState(null);
  const [coach, setCoach]   = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        // Load client row par email (la table clients n'a pas de colonne user_id)
        const { data: c } = await supabase
          .from("clients")
          .select("id, coach_id, email, full_name, subscription_start_date, onboarding_done")
          .eq("email", user.email)
          .maybeSingle();
        if (cancelled) return;
        setClient(c);

        // Load coach (pour branding: accent_color, coaching_name, logo_url)
        if (c?.coach_id) {
          const { data: co } = await supabase
            .from("coaches")
            .select("id, full_name, coaching_name, logo_url, accent_color, show_rb_badge")
            .eq("id", c.coach_id)
            .maybeSingle();
          if (!cancelled) setCoach(co);
        }
      } catch (e) {
        console.warn("[ClientApp] load", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  const accent = coach?.accent_color || G_DEFAULT;
  const showBadge = coach?.show_rb_badge !== false;

  // Inject CSS variable --accent sur le root pour que les composants
  // enfants puissent l'utiliser (futur white-label complet).
  useEffect(() => {
    document.documentElement.style.setProperty("--client-accent", accent);
    return () => { document.documentElement.style.removeProperty("--client-accent"); };
  }, [accent]);

  if (loading) {
    return (
      <div style={wrap}>
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,.3)", fontSize: 12, letterSpacing: ".2em", textTransform: "uppercase" }}>
          Chargement...
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div style={wrap}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 32, textAlign: "center", gap: 14 }}>
          <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 900, color: "#fff", letterSpacing: "-.5px" }}>
            Compte non associe<span style={{ color: accent }}>.</span>
          </div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,.45)", lineHeight: 1.5, maxWidth: 320 }}>
            Tu n'es pas encore lie a un coach. Demande un lien d'invitation a ton coach.
          </div>
          <button
            onClick={() => supabase.auth.signOut().then(() => { window.location.href = "/"; })}
            style={{ marginTop: 10, background: "transparent", border: ".5px solid rgba(255,255,255,.15)", color: "rgba(255,255,255,.6)", padding: "10px 18px", borderRadius: 100, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}
          >
            Se deconnecter
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={wrap}>
      <style>{`
        html, body { background: #000; }
        :root { --client-accent: ${accent}; }
        @keyframes capFade { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      {/* Pages (une seule visible) */}
      <div style={page}>
        {tab === "home"    && <ClientHome    client={client} coach={coach} accent={accent} onTabChange={setTab} />}
        {tab === "prog"    && <ClientProgramme client={client} coach={coach} accent={accent} />}
        {tab === "msg"     && <ClientMessages  client={client} coach={coach} accent={accent} user={user} />}
        {tab === "suivi"   && <ClientSuivi     client={client} coach={coach} accent={accent} />}
      </div>

      {/* Badge RB Perform (Starter only) */}
      {showBadge && (
        <a
          href="https://rbperform.app"
          target="_blank" rel="noopener"
          style={rbBadge}
        >
          ⚡ Propulse par RB Perform
        </a>
      )}

      {/* Bottom nav */}
      <nav style={nav} aria-label="Navigation principale">
        {TABS.map((t) => {
          const on = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                ...navBtn,
                background: on ? accent : "transparent",
                color: on ? "#000" : "rgba(255,255,255,.3)",
              }}
              aria-label={t.label}
            >
              <NavIcon name={t.icon} on={on} />
            </button>
          );
        })}
      </nav>
    </div>
  );
}

// ===== ICONES =====
function NavIcon({ name, on }) {
  const stroke = on ? "#000" : "rgba(255,255,255,.35)";
  const sw = on ? 2.4 : 2;
  const p = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke, strokeWidth: sw, strokeLinecap: "round", strokeLinejoin: "round" };
  if (name === "home") return <svg {...p}><path d="M3 12l9-9 9 9" /><path d="M5 10v10h14V10" /></svg>;
  if (name === "dumbbell") return <svg {...p}><path d="M6 4v16M18 4v16M2 12h4M18 12h4M6 8h12M6 16h12" /></svg>;
  if (name === "msg") return <svg {...p}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>;
  if (name === "chart") return <svg {...p}><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>;
  return null;
}

const TABS = [
  { id: "home",  label: "Accueil",   icon: "home" },
  { id: "prog",  label: "Programme", icon: "dumbbell" },
  { id: "msg",   label: "Messages",  icon: "msg" },
  { id: "suivi", label: "Suivi",     icon: "chart" },
];

// ===== STYLES =====
const wrap = {
  minHeight: "100svh",
  maxWidth: 430,
  margin: "0 auto",
  background: "#000",
  fontFamily: "'DM Sans', -apple-system, sans-serif",
  color: "#fff",
  display: "flex",
  flexDirection: "column",
  position: "relative",
  paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 88px)",
};
const page = {
  flex: 1,
  overflowY: "auto",
  WebkitOverflowScrolling: "touch",
};
const nav = {
  position: "fixed",
  bottom: "calc(env(safe-area-inset-bottom, 0px) + 18px)",
  left: "50%",
  transform: "translateX(-50%)",
  display: "flex",
  gap: 4,
  padding: 5,
  background: "rgba(12,12,12,.92)",
  border: ".5px solid rgba(255,255,255,.08)",
  borderRadius: 100,
  zIndex: 50,
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  boxShadow: "0 16px 40px rgba(0,0,0,.5)",
};
const navBtn = {
  width: 48, height: 40,
  border: "none",
  borderRadius: 100,
  display: "flex", alignItems: "center", justifyContent: "center",
  cursor: "pointer",
  transition: "all .25s cubic-bezier(.22,1,.36,1)",
  fontFamily: "inherit",
};
const rbBadge = {
  position: "fixed",
  bottom: "calc(env(safe-area-inset-bottom, 0px) + 74px)",
  left: "50%",
  transform: "translateX(-50%)",
  fontSize: 10,
  color: "rgba(255,255,255,.2)",
  textDecoration: "none",
  letterSpacing: ".04em",
  zIndex: 40,
  fontFamily: "'DM Sans', sans-serif",
};

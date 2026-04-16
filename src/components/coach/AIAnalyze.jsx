import React, { useState } from "react";
import { supabase } from "../../lib/supabase";
import { toast } from "../Toast";
import haptic from "../../lib/haptic";

const G = "#02d1ba";

// Reponse simulee pour la demo (sandbox)
const DEMO_RESPONSE = {
  summary: "Ce client montre des signes de desengagement progressif. RPE en baisse (-1.2 sur 3 semaines), seances moins regulieres (2/3 manquees). La derniere pesee confirme une stagnation du poids malgre un volume de travail eleve — possible plateau metabolique ou deficit d'intensite. L'adherence au programme reste bonne sur le papier, mais la qualite des seances semble se degrader.",
  actions: [
    { label: "Contact proactif cette semaine", type: "message" },
    { label: "Revoir le deficit calorique ou RM cibles", type: "programme" },
    { label: "Planifier un check-in 15 min par telephone", type: "other" },
  ],
};

/**
 * AIAnalyze — bouton + modal d'analyse IA client.
 * Appelle l'Edge Function ai-coach (type='analyze_client').
 * En isDemo: affiche DEMO_RESPONSE statique + CTA 'Demarrer mon essai'.
 *
 * Props:
 *   client: Client
 *   coachId: uuid
 *   isDemo: boolean
 *   onClose: () => void
 */
export default function AIAnalyze({ client, coachId, isDemo = false, onClose }) {
  const [loading, setLoading] = useState(!isDemo);
  const [data, setData] = useState(isDemo ? DEMO_RESPONSE : null);
  const [error, setError] = useState("");
  const [startedAt] = useState(() => Date.now());

  React.useEffect(() => {
    if (isDemo) { setData(DEMO_RESPONSE); setLoading(false); return; }
    if (!client?.id) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const jwt = session?.access_token;
        if (!jwt) throw new Error("Session expiree");

        // Context minimal pour Mistral (evite d'envoyer des PII sensibles)
        const payload = {
          client_id: client.id,
          prenom: client.full_name?.split(" ")[0] || null,
          objectif: client.objectif || null,
          programme_name: client._prog_name || null,
          semaine_actuelle: client._week || null,
          poids_debut: client._weight_start,
          poids_actuel: client._weight_now,
          inactive_days: client._inactiveDays,
          churn_score: client._churn_score,
          derniere_seance: client._last_session_at,
          rpe_moyen: client._rpe_avg,
          sessions_count_14j: client._sessions_14d,
          tags: client.tags || [],
        };

        const res = await fetch(`${process.env.REACT_APP_SUPABASE_URL}/functions/v1/ai-coach`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${jwt}` },
          body: JSON.stringify({ type: "analyze_client", payload }),
        });
        const json = await res.json();
        if (cancelled) return;
        if (!res.ok || !json.success) {
          if (json.code === "RATE_LIMIT") {
            setError(json.error || "Limite IA atteinte ce mois.");
          } else {
            setError(json.error || "Analyse indisponible");
          }
          setLoading(false);
          return;
        }
        setData({ summary: json.summary, actions: json.actions || [] });
      } catch (e) {
        if (!cancelled) setError(e.message || "Erreur reseau");
      }
      if (!cancelled) setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [client?.id, isDemo]);

  const elapsed = Math.max(0, Math.floor((Date.now() - startedAt) / 60000));

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
      style={overlay}
      role="dialog" aria-modal="true" aria-label="Analyse IA"
    >
      <style>{`
        @keyframes aiFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes aiSlide  { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes aiPulse  { 0%,100% { opacity: 1; } 50% { opacity: .5; } }
        @keyframes aiShimmer { 0% { background-position: -400px 0; } 100% { background-position: 400px 0; } }
        .ai-skel { background: linear-gradient(90deg, rgba(255,255,255,.03) 0%, rgba(255,255,255,.07) 50%, rgba(255,255,255,.03) 100%); background-size: 800px 100%; animation: aiShimmer 1.4s linear infinite; border-radius: 6px; height: 12px; margin-bottom: 10px; }
      `}</style>

      <div style={card}>
        {/* Close */}
        <button onClick={onClose} aria-label="Fermer" style={closeBtn}>×</button>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
          <div style={boltWrap}>
            <svg viewBox="170 50 180 410" width="14" height="32" aria-hidden="true">
              <polygon points="300,60 180,280 248,280 210,450 340,220 268,220 300,60" fill={G} />
            </svg>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: ".22em", textTransform: "uppercase", color: G }}>
              Analyse IA
            </div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,.7)", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {client?.full_name || client?.email || "Client"}
            </div>
          </div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,.3)", flexShrink: 0 }}>
            {loading ? "..." : `il y a ${elapsed === 0 ? "quelques secondes" : elapsed + " min"}`}
          </div>
        </div>

        {/* Bandeau legal */}
        <div style={legalBanner}>
          <AppIconLite />
          <span>
            <strong style={{ color: "rgba(255,255,255,.6)", fontWeight: 600 }}>Suggestions a valider par toi</strong>
            {" · "}non contraignantes
          </span>
        </div>

        {/* Content */}
        <div style={{ minHeight: 140 }}>
          {loading ? (
            <div style={{ padding: "20px 0" }}>
              <div className="ai-skel" style={{ width: "80%" }} />
              <div className="ai-skel" style={{ width: "100%" }} />
              <div className="ai-skel" style={{ width: "90%" }} />
              <div className="ai-skel" style={{ width: "70%" }} />
            </div>
          ) : error ? (
            <div style={errBox}>{error}</div>
          ) : (
            <>
              <p style={summary}>{data?.summary}</p>
              {Array.isArray(data?.actions) && data.actions.length > 0 && (
                <>
                  <div style={actionsLabel}>Actions suggerees</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {data.actions.map((a, i) => (
                      <div key={i} style={actionRow}>
                        <span style={{ color: G, fontSize: 12, width: 16 }}>→</span>
                        <span style={{ flex: 1, fontSize: 13, color: "rgba(255,255,255,.75)" }}>{a.label}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>

        {/* Demo CTA */}
        {isDemo && !loading && !error && (
          <div style={{ marginTop: 24, padding: "16px 20px", background: "rgba(2,209,186,.04)", border: `.5px solid rgba(2,209,186,.2)`, borderRadius: 14 }}>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,.45)", marginBottom: 12, textAlign: "center", lineHeight: 1.55 }}>
              L'IA analyse automatiquement tous tes clients en temps reel.
            </div>
            <a
              href="/signup"
              style={demoCta}
            >
              Demarrer mon essai →
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

function AppIconLite() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.3)" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8v4M12 16h0" />
    </svg>
  );
}

// ===== STYLES =====
const overlay = {
  position: "fixed", inset: 0, zIndex: 450,
  background: "rgba(0,0,0,.75)",
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
  display: "flex", alignItems: "center", justifyContent: "center",
  padding: "6vh 16px",
  animation: "aiFadeIn .18s ease both",
  fontFamily: "'Inter', -apple-system, system-ui, sans-serif",
  color: "#fff",
};
const card = {
  width: "100%", maxWidth: 500,
  background: "#0b0d0f",
  border: `.5px solid rgba(2,209,186,.2)`,
  borderRadius: 18,
  padding: "24px 26px",
  boxShadow: "0 30px 80px rgba(0,0,0,.7), 0 0 0 1px rgba(2,209,186,.05)",
  animation: "aiSlide .25s cubic-bezier(.22,1,.36,1) both",
  position: "relative",
};
const closeBtn = {
  position: "absolute", top: 14, right: 14,
  background: "rgba(255,255,255,.04)", border: "none",
  borderRadius: 8,
  width: 28, height: 28,
  display: "flex", alignItems: "center", justifyContent: "center",
  cursor: "pointer",
  color: "rgba(255,255,255,.5)",
  fontSize: 18, lineHeight: 1,
  fontFamily: "inherit",
};
const boltWrap = {
  width: 36, height: 36,
  background: "rgba(2,209,186,.08)",
  border: `.5px solid rgba(2,209,186,.18)`,
  borderRadius: 10,
  display: "flex", alignItems: "center", justifyContent: "center",
  flexShrink: 0,
};
const legalBanner = {
  display: "flex", alignItems: "center", gap: 6,
  marginBottom: 16,
  fontSize: 10, color: "rgba(255,255,255,.35)",
  padding: "6px 10px",
  background: "rgba(255,255,255,.02)",
  border: ".5px solid rgba(255,255,255,.05)",
  borderRadius: 6,
  letterSpacing: ".02em",
};
const summary = {
  fontSize: 14, fontWeight: 300,
  color: "rgba(255,255,255,.72)",
  lineHeight: 1.75,
  margin: "0 0 18px",
  letterSpacing: ".01em",
};
const actionsLabel = {
  fontSize: 10, fontWeight: 700,
  letterSpacing: ".22em", textTransform: "uppercase",
  color: "rgba(255,255,255,.35)",
  marginBottom: 10,
  paddingTop: 10,
  borderTop: ".5px solid rgba(255,255,255,.06)",
};
const actionRow = {
  display: "flex", alignItems: "center", gap: 10,
  padding: "8px 0",
  borderBottom: ".5px solid rgba(255,255,255,.04)",
};
const errBox = {
  padding: "14px 16px",
  background: "rgba(255,107,107,.06)",
  border: ".5px solid rgba(255,107,107,.2)",
  borderRadius: 10,
  fontSize: 13, color: "#ff6b6b",
};
const demoCta = {
  display: "block",
  width: "100%",
  textAlign: "center",
  padding: "12px 20px",
  background: G, color: "#000",
  textDecoration: "none",
  borderRadius: 10,
  fontFamily: "'Syne', sans-serif",
  fontSize: 12, fontWeight: 900,
  letterSpacing: ".1em", textTransform: "uppercase",
  boxShadow: `0 12px 30px rgba(2,209,186,.3)`,
};

import React, { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { useT } from "../../lib/i18n";
import SessionTracker from "./SessionTracker";

const fillTpl = (s, vars) => {
  let out = s;
  Object.entries(vars).forEach(([k, v]) => { out = out.split(`{${k}}`).join(String(v)); });
  return out;
};

/**
 * ClientProgramme — affiche le programme actif. La structure repose sur
 * l'HTML genere par le coach (table programmes.html_content) — on le rend
 * dans un iframe sandbox + on extrait les exos depuis le DOM (best-effort)
 * pour le tracker.
 *
 * Pour l'instant: simplifie a:
 *   - Programme actif: nom + uploaded_at + bouton 'Demarrer la seance'
 *   - Quand la session est lancee: SessionTracker en plein ecran
 */
export default function ClientProgramme({ client, accent }) {
  const t = useT();
  const [programme, setProgramme] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tracking, setTracking] = useState(false);

  useEffect(() => {
    if (!client?.id) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("programmes")
        .select("id, programme_name, html_content, uploaded_at, published_at")
        .eq("client_id", client.id)
        .eq("is_active", true)
        .not("published_at", "is", null)
        .lte("published_at", new Date().toISOString())
        .order("published_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cancelled) return;
      setProgramme(data);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [client?.id]);

  if (loading) {
    return (
      <div style={{ padding: 32, color: "rgba(255,255,255,.3)", textAlign: "center", fontSize: 12 }}>
        {t("cprg.loading")}
      </div>
    );
  }

  if (!programme) {
    return (
      <div style={{ padding: "32px 20px" }}>
        <div style={{ padding: "40px 20px", background: "rgba(255,255,255,.02)", border: ".5px solid rgba(255,255,255,.06)", borderRadius: 16, textAlign: "center" }}>
          <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 800, color: "#fff", marginBottom: 8 }}>
            {t("cprg.no_programme")}<span style={{ color: accent }}>.</span>
          </div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,.4)", lineHeight: 1.5 }}>
            {t("cprg.no_programme_desc")}
          </div>
        </div>
      </div>
    );
  }

  if (tracking) {
    return (
      <SessionTracker
        client={client}
        programme={programme}
        accent={accent}
        onClose={() => setTracking(false)}
      />
    );
  }

  return (
    <div style={{ padding: "32px 20px 20px" }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: ".22em", textTransform: "uppercase", color: "rgba(255,255,255,.18)", marginBottom: 10 }}>
          {t("cprg.my_programme")}
        </div>
        <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 32, fontWeight: 900, letterSpacing: "-1.5px", color: "#fff", lineHeight: 1 }}>
          {t("cprg.train")}<span style={{ color: accent }}>.</span>
        </div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,.4)", marginTop: 8 }}>
          {programme.programme_name || t("cprg.no_name")} · {fillTpl(t("cprg.created_ago"), { n: Math.floor((Date.now() - new Date(programme.uploaded_at).getTime()) / 86400000) })}
        </div>
      </div>

      {/* Bouton demarrer */}
      <button
        onClick={() => setTracking(true)}
        style={{
          width: "100%",
          padding: "16px 20px",
          background: accent,
          color: "#000",
          border: "none",
          borderRadius: 14,
          fontFamily: "'Syne', sans-serif",
          fontSize: 13, fontWeight: 900,
          letterSpacing: ".1em", textTransform: "uppercase",
          cursor: "pointer",
          boxShadow: `0 16px 40px ${accent}35`,
          marginBottom: 20,
        }}
      >
        {t("cprg.start_session")}
      </button>

      {/* Programme HTML rendered (simple) */}
      {programme.html_content ? (
        <div style={{ background: "rgba(255,255,255,.02)", border: ".5px solid rgba(255,255,255,.06)", borderRadius: 14, padding: 4, overflow: "hidden" }}>
          <iframe
            srcDoc={programme.html_content}
            title={t("cprg.iframe_title")}
            style={{ width: "100%", height: 600, border: "none", background: "#0a0a0a", borderRadius: 12 }}
            sandbox=""
          />
        </div>
      ) : (
        <div style={{ padding: "30px 20px", background: "rgba(255,255,255,.02)", border: ".5px solid rgba(255,255,255,.06)", borderRadius: 16, textAlign: "center", color: "rgba(255,255,255,.3)", fontSize: 12 }}>
          {t("cprg.content_soon")}
        </div>
      )}
    </div>
  );
}

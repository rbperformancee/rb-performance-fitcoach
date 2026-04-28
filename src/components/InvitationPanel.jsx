import React, { useState } from "react";
import haptic from "../lib/haptic";
import { useT } from "../lib/i18n";

const G = "#02d1ba";

const fillTpl = (s, vars) => {
  let out = s;
  Object.entries(vars).forEach(([k, v]) => { out = out.split(`{${k}}`).join(String(v)); });
  return out;
};

/**
 * Panneau "Inviter mes clients" — a afficher dans le CoachDashboard.
 * Props :
 *   coach : { coach_code, coach_slug, brand_name, full_name }
 */
export default function InvitationPanel({ coach }) {
  const t = useT();
  const [copied, setCopied] = useState(null); // "code" | "link" | null

  if (!coach?.coach_code) {
    return (
      <div style={{ padding: 16, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, color: "rgba(255,255,255,0.4)", fontSize: 12 }}>
        {t("ip.code_pending")}
      </div>
    );
  }

  const code = coach.coach_code;
  const slug = coach.coach_slug || "";
  const link = `https://rbperform.app/rejoindre/${slug}`;
  const displayName = coach.brand_name || coach.full_name || t("ip.fallback_coach_name");

  const shareMessage = fillTpl(t("ip.share_message"), { name: displayName, code, link });

  const copy = async (text, tag) => {
    haptic.light();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(tag);
      setTimeout(() => setCopied(null), 1800);
    } catch {
      // fallback pour anciens navigateurs
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(tag);
      setTimeout(() => setCopied(null), 1800);
    }
  };

  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: fillTpl(t("ip.share_title"), { name: displayName }),
          text: shareMessage,
          url: link,
        });
      } catch {}
    } else {
      copy(shareMessage, "share");
    }
  };

  return (
    <div style={{ background: "rgba(2,209,186,0.04)", border: "1px solid rgba(2,209,186,0.18)", borderRadius: 18, padding: "20px 22px", fontFamily: "-apple-system,Inter,sans-serif" }}>
      <div style={{ fontSize: 10, letterSpacing: "3px", textTransform: "uppercase", color: "rgba(2,209,186,0.7)", fontWeight: 700, marginBottom: 14 }}>
        {t("ip.section_title")}
      </div>

      {/* ===== CODE 6 CHIFFRES ===== */}
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", letterSpacing: "2px", textTransform: "uppercase", marginBottom: 8, fontWeight: 600 }}>
          {t("ip.coach_code_label")}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div
            style={{
              fontFamily: "'JetBrains Mono',monospace",
              fontSize: 38,
              fontWeight: 800,
              letterSpacing: "8px",
              color: G,
              background: "rgba(2,209,186,0.08)",
              border: "1px solid rgba(2,209,186,0.25)",
              borderRadius: 14,
              padding: "14px 22px",
              userSelect: "all",
              textShadow: "0 0 20px rgba(2,209,186,0.35)",
            }}
          >
            {code}
          </div>
          <button
            onClick={() => copy(code, "code")}
            aria-label={t("ip.aria_copy_code")}
            style={{
              padding: "12px 18px",
              background: copied === "code" ? G : "rgba(2,209,186,0.08)",
              color: copied === "code" ? "#000" : G,
              border: `1px solid ${copied === "code" ? G : "rgba(2,209,186,0.25)"}`,
              borderRadius: 12,
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: "1px",
              textTransform: "uppercase",
              cursor: "pointer",
              fontFamily: "inherit",
              transition: "all 0.2s",
            }}
          >
            {copied === "code" ? t("ip.btn_copied") : t("ip.btn_copy")}
          </button>
        </div>
      </div>

      {/* ===== LIEN D'INVITATION ===== */}
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", letterSpacing: "2px", textTransform: "uppercase", marginBottom: 8, fontWeight: 600 }}>
          {t("ip.invite_link_label")}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <div
            style={{
              flex: 1,
              minWidth: 200,
              fontFamily: "'JetBrains Mono',monospace",
              fontSize: 12,
              color: "rgba(255,255,255,0.7)",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 10,
              padding: "11px 14px",
              userSelect: "all",
              overflowX: "auto",
              whiteSpace: "nowrap",
            }}
          >
            {link}
          </div>
          <button
            onClick={() => copy(link, "link")}
            aria-label={t("ip.aria_copy_link")}
            style={{
              padding: "10px 16px",
              background: copied === "link" ? G : "rgba(255,255,255,0.04)",
              color: copied === "link" ? "#000" : "rgba(255,255,255,0.75)",
              border: `1px solid ${copied === "link" ? G : "rgba(255,255,255,0.1)"}`,
              borderRadius: 10,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "1px",
              textTransform: "uppercase",
              cursor: "pointer",
              fontFamily: "inherit",
              transition: "all 0.2s",
            }}
          >
            {copied === "link" ? "✓" : t("ip.btn_copy")}
          </button>
        </div>
      </div>

      {/* ===== PARTAGER ===== */}
      <button
        onClick={share}
        aria-label={t("ip.aria_share")}
        style={{
          width: "100%",
          padding: "14px 20px",
          background: `linear-gradient(135deg, ${G}, #0891b2)`,
          color: "#000",
          border: "none",
          borderRadius: 12,
          fontSize: 13,
          fontWeight: 800,
          letterSpacing: "1px",
          textTransform: "uppercase",
          cursor: "pointer",
          fontFamily: "inherit",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          boxShadow: "0 6px 20px rgba(2,209,186,0.25)",
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
        </svg>
        {copied === "share" ? t("ip.btn_share_copied") : t("ip.btn_share")}
      </button>

      <div style={{ marginTop: 14, fontSize: 11, color: "rgba(255,255,255,0.4)", lineHeight: 1.6 }}>
        {t("ip.footer_p1")}
        {" "}{t("ip.footer_p2")}
      </div>
    </div>
  );
}

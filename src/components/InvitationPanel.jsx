import React, { useState } from "react";
import haptic from "../lib/haptic";

const G = "#02d1ba";

/**
 * Panneau "Inviter mes clients" — a afficher dans le CoachDashboard.
 * Props :
 *   coach : { coach_code, coach_slug, brand_name, full_name }
 */
export default function InvitationPanel({ coach }) {
  const [copied, setCopied] = useState(null); // "code" | "link" | null

  if (!coach?.coach_code) {
    return (
      <div style={{ padding: 16, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, color: "rgba(255,255,255,0.4)", fontSize: 12 }}>
        Code d'invitation en cours de generation… Recharge la page dans quelques secondes.
      </div>
    );
  }

  const code = coach.coach_code;
  const slug = coach.coach_slug || "";
  const link = `https://rbperform.com/rejoindre/${slug}`;
  const displayName = coach.brand_name || coach.full_name || "ton coach";

  const shareMessage = `Rejoins mon espace coaching ${displayName} !\n\nTelecharge l'app RB Perform et entre le code ${code}\n\nOu clique directement : ${link}`;

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
          title: `${displayName} sur RB Perform`,
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
        Inviter mes clients
      </div>

      {/* ===== CODE 6 CHIFFRES ===== */}
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", letterSpacing: "2px", textTransform: "uppercase", marginBottom: 8, fontWeight: 600 }}>
          Code coach
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
            aria-label="Copier le code"
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
            {copied === "code" ? "✓ Copie" : "Copier"}
          </button>
        </div>
      </div>

      {/* ===== LIEN D'INVITATION ===== */}
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", letterSpacing: "2px", textTransform: "uppercase", marginBottom: 8, fontWeight: 600 }}>
          Lien d'invitation
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
            aria-label="Copier le lien"
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
            {copied === "link" ? "✓" : "Copier"}
          </button>
        </div>
      </div>

      {/* ===== PARTAGER ===== */}
      <button
        onClick={share}
        aria-label="Partager l'invitation"
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
        {copied === "share" ? "Message copie" : "Partager"}
      </button>

      <div style={{ marginTop: 14, fontSize: 11, color: "rgba(255,255,255,0.4)", lineHeight: 1.6 }}>
        Le client entre le code dans l'app a son inscription, ou clique sur le lien.
        Il est automatiquement rattache a toi.
      </div>
    </div>
  );
}

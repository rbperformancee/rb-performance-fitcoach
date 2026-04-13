import React from "react";
import { calculateBehavioralProfile, calculateAthleticLevel } from "../../lib/coachIntelligence";

/**
 * BehavioralBadge — badge pill colore affichant le profil comportemental
 * ou le niveau athletique du client. Utilise dans la liste clients.
 */
export function BehavioralBadge({ client, compact = false }) {
  const profile = calculateBehavioralProfile(client);
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: compact ? "2px 8px" : "3px 10px",
        borderRadius: 100,
        background: profile.bg,
        border: `1px solid ${profile.border}`,
        color: profile.color,
        fontSize: compact ? 9 : 10,
        fontWeight: 800,
        letterSpacing: "0.5px",
        textTransform: "uppercase",
        fontFamily: "-apple-system,Inter,sans-serif",
        whiteSpace: "nowrap",
      }}
      title={`Profil comportemental : ${profile.label}`}
    >
      {profile.label}
    </span>
  );
}

export function LevelBadge({ client, compact = false }) {
  const level = calculateAthleticLevel(client);
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: compact ? "2px 8px" : "3px 10px",
        borderRadius: 100,
        background: `${level.color}12`,
        border: `1px solid ${level.color}30`,
        color: level.color,
        fontSize: compact ? 9 : 10,
        fontWeight: 800,
        letterSpacing: "0.5px",
        textTransform: "uppercase",
        fontFamily: "-apple-system,Inter,sans-serif",
        whiteSpace: "nowrap",
      }}
      title={`Niveau athletique : ${level.label}`}
    >
      {level.label}
    </span>
  );
}

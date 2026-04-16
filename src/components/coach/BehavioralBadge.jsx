import React from "react";
import { calculateBehavioralProfile, calculateAthleticLevel } from "../../lib/coachIntelligence";

/**
 * BehavioralBadge — point colore discret indiquant le profil comportemental.
 * Vert/teal = champion/regulier, gris = irregulier, rouge = en difficulte.
 */
export function BehavioralBadge({ client }) {
  const profile = calculateBehavioralProfile(client);
  const dotColor = (profile.id === "champion" || profile.id === "regulier") ? "#00C9A7"
    : profile.id === "irregulier" ? "rgba(255,255,255,0.35)"
    : "#ff6b6b";
  return (
    <div
      title={profile.label}
      style={{
        width: 7, height: 7, borderRadius: "50%",
        background: dotColor,
        flexShrink: 0,
        boxShadow: profile.id === "difficulte" ? "0 0 6px rgba(255,107,107,0.5)" : "none",
      }}
    />
  );
}

export function LevelBadge({ client }) {
  const level = calculateAthleticLevel(client);
  return (
    <div
      title={level.label}
      style={{
        width: 7, height: 7, borderRadius: "50%",
        background: "#00C9A7",
        flexShrink: 0,
      }}
    />
  );
}

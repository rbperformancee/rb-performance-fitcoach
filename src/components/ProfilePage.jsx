import React from "react";
import AvatarPicker from "./AvatarPicker";
import { BadgeSystem } from "./BadgeSystem";
import { useStreak } from "../hooks/useStreak";
import { useWeightTracking } from "../hooks/useWeightTracking";

export default function ProfilePage({ client, onLogout }) {
  const { streak, bestStreak } = useStreak(client?.id);
  const { latest } = useWeightTracking(client?.id);
  const name = client?.full_name || client?.email?.split("@")[0] || "Athlete";
  const firstName = name.split(" ")[0];
  const email = client?.email || "";
  const pct = bestStreak ? Math.min(Math.round((streak / bestStreak) * 100), 100) : 100;
  return (
    <div style={{ minHeight: "100vh", background: "#050505", fontFamily: "-apple-system,Inter,sans-serif", paddingBottom: 40, position: "relative" }}>
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, height: "50%", background: "radial-gradient(ellipse at 50% -20%, rgba(2,209,186,0.1) 0%, transparent 60%)", pointerEvents: "none", zIndex: 0 }} />
      <div style={{ position: "relative", zIndex: 1, padding: "52px 28px 0" }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 11, color: "rgba(2,209,186,0.6)", fontWeight: 600, letterSpacing: "3px", textTransform: "uppercase", marginBottom: 10 }}>Mon profil</div>
            <div style={{ fontSize: 42, fontWeight: 800, color: "#fff", letterSpacing: "-2px", lineHeight: 1 }}>{firstName}<span style={{ color: "#02d1ba" }}>.</span></div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.2)", marginTop: 8 }}>{email}</div>
          </div>
          <AvatarPicker clientId={client?.id} name={name} size={72} />
        </div>
        <div style={{ height: "1px", background: "linear-gradient(90deg, rgba(2,209,186,0.4) 0%, rgba(255,255,255,0.05) 100%)", marginBottom: 28 }} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", marginBottom: 28 }}>
          {[
            { label: "Streak", value: streak || 0, unit: "j", color: "#f97316" },
            { label: "Record", value: bestStreak || 0, unit: "j", color: "#fbbf24" },
            { label: "Poids", value: latest?.weight || "--", unit: "kg", color: "#02d1ba" },
          ].map((s, i) => (
            <div key={i} style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 16, paddingRight: i < 2 ? 16 : 0 }}>
              <div style={{ fontSize: 34, fontWeight: 200, color: s.color, letterSpacing: "-1.5px", lineHeight: 1 }}>{s.value}<span style={{ fontSize: 14, color: "rgba(255,255,255,0.2)" }}>{s.unit}</span></div>
              <div style={{ fontSize: 9, color: "rgba(255,255,255,0.2)", fontWeight: 600, letterSpacing: "2px", textTransform: "uppercase", marginTop: 6 }}>{s.label}</div>
            </div>
          ))}
        </div>
        {streak > 0 && (
          <div style={{ marginBottom: 28 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", fontWeight: 600, letterSpacing: "2px", textTransform: "uppercase" }}>Progression streak</div>
              <div style={{ fontSize: 10, color: "#f97316", fontWeight: 600 }}>{streak} / {bestStreak || streak} j</div>
            </div>
            <div style={{ height: 2, background: "rgba(255,255,255,0.06)", borderRadius: 1 }}>
              <div style={{ height: "100%", width: pct + "%", minWidth: "4px", background: "linear-gradient(90deg, #f97316, #fbbf24)", borderRadius: 1, boxShadow: "0 0 10px rgba(249,115,22,0.5)" }} />
            </div>
          </div>
        )}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 18, fontWeight: 900, lineHeight: 1.4, textTransform: "uppercase" }}>
            <span style={{ color: "#02d1ba" }}>LA </span>
            <span style={{ color: "rgba(255,255,255,0.15)" }}>DISCIPLINE </span>
            <span style={{ color: "rgba(255,255,255,0.08)" }}>C EST </span>
            <span style={{ color: "rgba(255,255,255,0.35)" }}>LA LIBERTE.</span>
          </div>
        </div>
        <div style={{ height: "1px", background: "rgba(255,255,255,0.06)", marginBottom: 24 }} />
        <div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", fontWeight: 600, letterSpacing: "3px", textTransform: "uppercase", marginBottom: 16 }}>Mes badges</div>
          <BadgeSystem clientId={client?.id} />
        </div>

        <div style={{ marginTop: 40, height: "1px", background: "rgba(255,255,255,0.06)", marginBottom: 24 }} />

        <button onClick={onLogout} style={{ width: "100%", padding: "16px", borderRadius: 14, border: "1px solid rgba(255,255,255,0.08)", background: "transparent", color: "rgba(255,255,255,0.25)", fontSize: 13, fontWeight: 500, cursor: "pointer", letterSpacing: "0.3px" }}>
          Se déconnecter
        </button>
      </div>
    </div>
  );
}
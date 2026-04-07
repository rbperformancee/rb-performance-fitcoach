import React from "react";
import { SeanceVivante } from "./SeanceVivante";

export default function TrainingPage({ client, programme, activeWeek, setActiveWeek, activeSession, setActiveSession, getHistory, getLatest, saveLog, getDelta }) {
  if (!programme) return (
    <div style={{ minHeight: "100vh", background: "#050505", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
      <div>Chargement...</div>
    </div>
  );
  return (
    <div style={{ minHeight: "100vh", background: "#050505", color: "#fff", padding: 20 }}>
      <SeanceVivante clientId={client?.id} sessionName="Test" />
      <div style={{ fontSize: 48, fontWeight: 800 }}>Train<span style={{ color: "#02d1ba" }}>.</span></div>
      <div style={{ marginTop: 20, color: "rgba(255,255,255,0.5)" }}>{programme.name}</div>
    </div>
  );
}

import React, { useEffect, useState } from "react";
import { LOGO_B64 } from "../utils/logo";

export default function SplashScreen({ onDone }) {
  const [phase, setPhase] = useState("in"); // in → visible → out

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("out"), 1400);
    const t2 = setTimeout(() => onDone(), 1900);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onDone]);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "#0d0d0d",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      opacity: phase === "out" ? 0 : 1,
      transition: "opacity 0.5s ease",
    }}>
      <img
        src={LOGO_B64}
        alt="RB PERFORM"
        style={{
          width: 130, height: 130,
          borderRadius: 28,
          objectFit: "cover",
          objectPosition: "center 60%",
          boxShadow: "0 0 60px rgba(2,209,186,0.35), 0 0 120px rgba(2,209,186,0.15)",
          border: "1px solid rgba(2,209,186,0.2)",
          opacity: phase === "in" ? 0 : 1,
          transform: phase === "in" ? "scale(0.85)" : "scale(1)",
          transition: "opacity 0.5s ease, transform 0.5s ease",
        }}
      />
      <div style={{
        marginTop: 20,
        fontSize: 13,
        fontWeight: 600,
        letterSpacing: "0.2em",
        color: "rgba(2,209,186,0.7)",
        opacity: phase === "in" ? 0 : 1,
        transition: "opacity 0.6s ease 0.2s",
      }}>
        RB PERFORM
      </div>
    </div>
  );
}

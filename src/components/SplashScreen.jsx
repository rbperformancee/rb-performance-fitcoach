import React, { useEffect, useState } from "react";

export default function SplashScreen({ onDone }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const t1 = setTimeout(() => setVisible(false), 1500);
    const t2 = setTimeout(() => onDone(), 2000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onDone]);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "#0d0d0d",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      opacity: visible ? 1 : 0,
      transition: "opacity 0.5s ease",
    }}>
      <div style={{
        width: 130, height: 130, borderRadius: 28,
        background: "#111",
        boxShadow: "0 0 60px rgba(2,209,186,0.35), 0 0 120px rgba(2,209,186,0.15)",
        border: "1px solid rgba(2,209,186,0.2)",
        display: "flex", alignItems: "center", justifyContent: "center",
        flexDirection: "column", gap: 4,
      }}>
        <div style={{
          width: 44, height: 64,
          background: "#02d1ba",
          clipPath: "polygon(65% 0%, 20% 52%, 50% 52%, 35% 100%, 80% 48%, 50% 48%, 65% 0%)",
        }} />
        <div style={{
          color: "white", fontSize: 14, fontWeight: 900,
          letterSpacing: 1, fontFamily: "Arial Black, Arial, sans-serif",
        }}>RB</div>
        <div style={{
          color: "white", fontSize: 9, fontWeight: 800,
          letterSpacing: 3, fontFamily: "Arial, sans-serif",
        }}>PERFORM</div>
      </div>
      <div style={{
        marginTop: 20, fontSize: 12, fontWeight: 600,
        letterSpacing: 4, color: "rgba(2,209,186,0.7)",
        fontFamily: "Arial, sans-serif",
      }}>RB PERFORM</div>
    </div>
  );
}

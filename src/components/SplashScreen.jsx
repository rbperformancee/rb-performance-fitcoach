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
        width: 130, height: 130,
        borderRadius: 28,
        background: "#111",
        boxShadow: "0 0 60px rgba(2,209,186,0.35), 0 0 120px rgba(2,209,186,0.15)",
        border: "1px solid rgba(2,209,186,0.2)",
        display: "flex", alignItems: "center", justifyContent: "center",
        flexDirection: "column",
      }}>
        <svg width="56" height="68" viewBox="0 0 56 68" fill="none" xmlns="http://www.w3.org/2000/svg">
          <polygon points="36,0 12,34 28,34 20,68 44,34 28,34 36,0" fill="#02d1ba"/>
        </svg>
        <div style={{
          color: "white", fontSize: 11, fontWeight: 800,
          letterSpacing: 2, fontFamily: "Arial, sans-serif",
          marginTop: 2,
        }}>RB</div>
      </div>
      <div style={{
        marginTop: 18, fontSize: 12, fontWeight: 600,
        letterSpacing: 4, color: "rgba(2,209,186,0.7)",
        fontFamily: "Arial, sans-serif",
      }}>RB PERFORM</div>
    </div>
  );
}

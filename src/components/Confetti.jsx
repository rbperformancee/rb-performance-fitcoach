import React, { useEffect, useState } from "react";

/**
 * Confetti — animation visuelle de celebration sans dependance.
 * Affiche N particules colorees qui tombent depuis le haut.
 * Auto-cleanup apres `duration` ms.
 */
export default function Confetti({ active, duration = 2500, count = 40, colors }) {
  const [particles, setParticles] = useState([]);

  const PALETTE = colors || ["#02d1ba", "#f97316", "#a78bfa", "#fbbf24", "#818cf8"];

  useEffect(() => {
    if (!active) return;
    const next = Array.from({ length: count }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 0.5,
      duration: 1.8 + Math.random() * 1.2,
      color: PALETTE[Math.floor(Math.random() * PALETTE.length)],
      size: 6 + Math.random() * 6,
      rotate: Math.random() * 360,
      drift: -30 + Math.random() * 60,
    }));
    setParticles(next);
    const t = setTimeout(() => setParticles([]), duration);
    return () => clearTimeout(t);
  }, [active, duration, count]);

  if (particles.length === 0) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 9999,
        overflow: "hidden",
      }}
      aria-hidden="true"
    >
      <style>{`
        @keyframes cfFall {
          0% { transform: translate(0, -10vh) rotate(0deg); opacity: 1; }
          100% { transform: translate(var(--drift, 0px), 110vh) rotate(720deg); opacity: 0; }
        }
      `}</style>
      {particles.map((p) => (
        <div
          key={p.id}
          style={{
            position: "absolute",
            left: `${p.left}%`,
            top: 0,
            width: p.size,
            height: p.size,
            background: p.color,
            borderRadius: Math.random() > 0.5 ? "50%" : "2px",
            transform: `rotate(${p.rotate}deg)`,
            "--drift": `${p.drift}vw`,
            animation: `cfFall ${p.duration}s cubic-bezier(0.45, 0, 0.55, 1) ${p.delay}s forwards`,
            opacity: 0,
            boxShadow: `0 0 ${p.size}px ${p.color}80`,
          }}
        />
      ))}
    </div>
  );
}

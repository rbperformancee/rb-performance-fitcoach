import React, { useRef, useId } from "react";

/**
 * Sparkline — mini courbe animee qui se trace a l'apparition.
 * Utilise pathLength + stroke-dasharray pour l'animation de trace.
 */
export function Sparkline({ data, width = 80, height = 28, color = "#02d1ba" }) {
  const gradId = useId(); // id unique meme si plusieurs sparklines coexistent
  const pathRef = useRef(null);
  if (!data || data.length < 2) return null;
  const values = data.map(d => d.weight);
  const min = Math.min(...values) - 1, max = Math.max(...values) + 1, range = max - min || 1;
  const toX = i => (i / (values.length - 1)) * width;
  const toY = v => height - ((v - min) / range) * (height - 4) - 2;
  const pts = values.map((v, i) => `${toX(i)},${toY(v)}`).join(" ");
  const lastPt = pts.split(" ").at(-1).split(",");
  const areaPath = `M${toX(0)},${toY(values[0])} ` + values.slice(1).map((v, i) => `L${toX(i+1)},${toY(v)}`).join(" ") + ` L${width},${height} L0,${height} Z`;
  const linePath = `M${toX(0)},${toY(values[0])} ` + values.slice(1).map((v, i) => `L${toX(i+1)},${toY(v)}`).join(" ");
  const animName = `spkIn-${gradId.replace(/:/g, "-")}`;

  return (
    <svg width={width} height={height} style={{ overflow: "visible" }}>
      <style>{`
        @keyframes ${animName} {
          from { stroke-dashoffset: 300; opacity: 0; }
          to { stroke-dashoffset: 0; opacity: 1; }
        }
        @keyframes ${animName}-dot { from { r: 0; opacity: 0; } to { r: 3; opacity: 1; } }
        @keyframes ${animName}-area { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
      <defs>
        <linearGradient id={`sg-${gradId}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25"/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#sg-${gradId})`} style={{ animation: `${animName}-area 0.5s ease 0.1s both` }} />
      <path
        ref={pathRef}
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="300"
        style={{ animation: `${animName} 0.9s cubic-bezier(0.22,1,0.36,1) both` }}
      />
      <circle cx={lastPt[0]} cy={lastPt[1]} r="3" fill={color} style={{ animation: `${animName}-dot 0.3s ease 0.85s both` }} />
    </svg>
  );
}

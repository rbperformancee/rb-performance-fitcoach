import React from "react";
export function Sparkline({ data, width = 80, height = 28 }) {
  if (!data || data.length < 2) return null;
  const values = data.map(d => d.weight);
  const min = Math.min(...values) - 1, max = Math.max(...values) + 1, range = max - min || 1;
  const toX = i => (i / (values.length - 1)) * width;
  const toY = v => height - ((v - min) / range) * (height - 4) - 2;
  const pts = values.map((v, i) => `${toX(i)},${toY(v)}`).join(" ");
  const lastPt = pts.split(" ").at(-1).split(",");
  const areaPath = `M${toX(0)},${toY(values[0])} ` + values.slice(1).map((v, i) => `L${toX(i+1)},${toY(v)}`).join(" ") + ` L${width},${height} L0,${height} Z`;
  return (
    <svg width={width} height={height} style={{ overflow: "visible" }}>
      <defs>
        <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#22c55e" stopOpacity="0.25"/>
          <stop offset="100%" stopColor="#22c55e" stopOpacity="0"/>
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#sg)"/>
      <polyline fill="none" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" points={pts}/>
      <circle cx={lastPt[0]} cy={lastPt[1]} r="3" fill="#22c55e"/>
    </svg>
  );
}

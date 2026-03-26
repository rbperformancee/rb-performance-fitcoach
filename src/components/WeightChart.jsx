import React, { useState, useRef, useCallback } from "react";

const GREEN = "#02d1ba";
const GREEN_DIM = "rgba(2,209,186,0.15)";
const GREEN_STROKE = "rgba(2,209,186,0.8)";

// SVG sparkline with tooltip
function LineChart({ data, width, height, showDots = true }) {
  const [tooltip, setTooltip] = useState(null);
  const svgRef = useRef();

  if (!data || data.length < 2) return null;

  const pad = { top: 8, right: 8, bottom: 24, left: 36 };
  const W = width - pad.left - pad.right;
  const H = height - pad.top - pad.bottom;

  const weights = data.map(d => d.weight);
  const minW = Math.min(...weights) - 0.5;
  const maxW = Math.max(...weights) + 0.5;
  const range = maxW - minW || 1;

  const toX = i => (i / (data.length - 1)) * W;
  const toY = v => H - ((v - minW) / range) * H;

  const pts = data.map((d, i) => `${toX(i)},${toY(d.weight)}`).join(" ");
  const areaPath =
    `M${toX(0)},${toY(data[0].weight)} ` +
    data.slice(1).map((d, i) => `L${toX(i + 1)},${toY(d.weight)}`).join(" ") +
    ` L${W},${H + 4} L0,${H + 4} Z`;

  // Y-axis labels
  const ySteps = 4;
  const yLabels = Array.from({ length: ySteps + 1 }, (_, i) => {
    const v = minW + (range / ySteps) * i;
    return { y: toY(v), label: v.toFixed(1) };
  });

  // X-axis labels (every Nth)
  const step = Math.max(1, Math.floor(data.length / 5));
  const xLabels = data.filter((_, i) => i % step === 0 || i === data.length - 1).map((d, _, arr) => ({
    x: toX(data.indexOf(d)),
    label: new Date(d.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }),
  }));

  const handleMouseMove = (e) => {
    const rect = svgRef.current.getBoundingClientRect();
    const relX = e.clientX - rect.left - pad.left;
    const idx = Math.round((relX / W) * (data.length - 1));
    if (idx >= 0 && idx < data.length) {
      setTooltip({ idx, x: toX(idx), y: toY(data[idx].weight), d: data[idx] });
    }
  };

  return (
    <div style={{ position: "relative", userSelect: "none" }}>
      <svg
        ref={svgRef}
        width={width} height={height}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setTooltip(null)}
        onTouchMove={(e) => {
          const t = e.touches[0];
          handleMouseMove({ clientX: t.clientX, clientY: t.clientY });
        }}
        onTouchEnd={() => setTooltip(null)}
        style={{ cursor: "crosshair", display: "block" }}
      >
        <defs>
          <linearGradient id="wg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#02d1ba" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#02d1ba" stopOpacity="0" />
          </linearGradient>
        </defs>

        <g transform={`translate(${pad.left},${pad.top})`}>
          {/* Grid lines */}
          {yLabels.map((yl, i) => (
            <g key={i}>
              <line x1={0} y1={yl.y} x2={W} y2={yl.y}
                stroke="rgba(255,255,255,0.04)" strokeWidth="1" strokeDasharray="3,3" />
              <text x={-6} y={yl.y + 4} textAnchor="end"
                fill="#555" fontSize="9" fontFamily="'JetBrains Mono',monospace">
                {yl.label}
              </text>
            </g>
          ))}

          {/* X labels */}
          {xLabels.map((xl, i) => (
            <text key={i} x={xl.x} y={H + 18} textAnchor="middle"
              fill="#555" fontSize="9" fontFamily="'JetBrains Mono',monospace">
              {xl.label}
            </text>
          ))}

          {/* Area */}
          <path d={areaPath} fill="url(#wg)" />

          {/* Line */}
          <polyline
            fill="none" stroke={GREEN} strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round"
            points={pts}
          />

          {/* Dots */}
          {showDots && data.map((d, i) => (
            <circle key={i}
              cx={toX(i)} cy={toY(d.weight)} r={tooltip?.idx === i ? 5 : 2.5}
              fill={tooltip?.idx === i ? GREEN : "rgba(2,209,186,0.7)"}
              style={{ transition: "r 0.1s" }}
            />
          ))}

          {/* Tooltip line */}
          {tooltip && (
            <>
              <line
                x1={tooltip.x} y1={0} x2={tooltip.x} y2={H}
                stroke="rgba(2,209,186,0.3)" strokeWidth="1" strokeDasharray="3,3"
              />
              <circle cx={tooltip.x} cy={tooltip.y} r={5} fill={GREEN} />
            </>
          )}
        </g>
      </svg>

      {/* Tooltip popup */}
      {tooltip && (
        <div style={{
          position: "absolute",
          left: Math.min(pad.left + tooltip.x + 10, width - 110),
          top: pad.top + tooltip.y - 40,
          background: "#1a1a1a",
          border: "1px solid rgba(2,209,186,0.3)",
          borderRadius: 8,
          padding: "6px 10px",
          pointerEvents: "none",
          zIndex: 10,
        }}>
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, fontWeight: 600, color: GREEN }}>
            {tooltip.d.weight} kg
          </div>
          <div style={{ fontSize: 10, color: "#666", marginTop: 2 }}>
            {new Date(tooltip.d.date).toLocaleDateString("fr-FR", { weekday: "short", day: "2-digit", month: "short" })}
          </div>
          {tooltip.d.note && (
            <div style={{ fontSize: 10, color: "#555", marginTop: 2, maxWidth: 90 }}>{tooltip.d.note}</div>
          )}
        </div>
      )}
    </div>
  );
}

// Bar chart for weekly averages
function WeeklyBars({ data, width, height }) {
  const [hover, setHover] = useState(null);
  if (!data || data.length < 2) return null;

  const pad = { top: 8, right: 8, bottom: 24, left: 36 };
  const W = width - pad.left - pad.right;
  const H = height - pad.top - pad.bottom;

  const avgs = data.map(d => d.avg);
  const minA = Math.min(...avgs) - 0.5;
  const maxA = Math.max(...avgs) + 0.5;
  const range = maxA - minA || 1;

  const barW = Math.max(4, (W / data.length) * 0.6);
  const gap = W / data.length;

  const toH = v => ((v - minA) / range) * H;

  return (
    <svg width={width} height={height} style={{ display: "block" }}>
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#02d1ba" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#02d1ba" stopOpacity="0.3" />
        </linearGradient>
      </defs>
      <g transform={`translate(${pad.left},${pad.top})`}>
        {data.map((d, i) => {
          const bh = toH(d.avg);
          const x = gap * i + gap / 2 - barW / 2;
          const isLast = i === data.length - 1;
          return (
            <g key={i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <rect
                x={x} y={H - bh} width={barW} height={bh}
                rx={3}
                fill={hover === i || isLast ? "url(#bg)" : "rgba(2,209,186,0.25)"}
                style={{ transition: "fill 0.15s" }}
              />
              <text x={x + barW / 2} y={H + 16} textAnchor="middle"
                fill={isLast ? GREEN : "#555"} fontSize="9"
                fontFamily="'JetBrains Mono',monospace">
                {d.label}
              </text>
              {(hover === i) && (
                <text x={x + barW / 2} y={H - bh - 5} textAnchor="middle"
                  fill={GREEN} fontSize="10" fontWeight="600"
                  fontFamily="'JetBrains Mono',monospace">
                  {d.avg}
                </text>
              )}
            </g>
          );
        })}
      </g>
    </svg>
  );
}

export function WeightTracker({ entries, addEntry, removeEntry, getStats }) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [weight, setWeight] = useState("");
  const [fat, setFat] = useState("");
  const [note, setNote] = useState("");
  const [tab, setTab] = useState("curve"); // curve | bars | history
  const [range, setRange] = useState(30); // 7 | 30 | 90 | all
  const [showForm, setShowForm] = useState(false);

  const stats = getStats();

  const filteredEntries = entries.filter(e => {
    if (range === "all") return true;
    const d = new Date(); d.setDate(d.getDate() - range);
    return new Date(e.date) >= d;
  });

  const handleAdd = () => {
    if (!weight || !date) return;
    addEntry(date, weight, fat || null, note);
    setWeight(""); setFat(""); setNote("");
    setShowForm(false);
  };

  const trendColor = stats?.trend > 0 ? "#ef4444" : stats?.trend < 0 ? "#02d1ba" : "#9ca3af";
  const trendLabel = stats?.trend > 0
    ? `+${(stats.trend * 7).toFixed(2)} kg/sem`
    : stats?.trend < 0
    ? `${(stats.trend * 7).toFixed(2)} kg/sem`
    : "stable";

  const inputStyle = {
    width: "100%",
    padding: "10px 12px",
    background: "#1a1a1a",
    border: "1.5px solid rgba(255,255,255,0.08)",
    borderRadius: 8,
    color: "#f5f5f5",
    fontFamily: "'JetBrains Mono',monospace",
    fontSize: 14,
    outline: "none",
  };

  return (
    <div style={{ padding: "0 16px 24px" }}>

      {/* Section header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase", color: "#02d1ba", marginBottom: 3 }}>
            Suivi poids
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#f5f5f5", letterSpacing: "-0.3px" }}>
            Évolution corporelle
          </div>
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "8px 14px",
            background: showForm ? "rgba(2,209,186,0.15)" : "#1a1a1a",
            border: `1.5px solid ${showForm ? "rgba(2,209,186,0.4)" : "rgba(255,255,255,0.1)"}`,
            borderRadius: 8,
            color: showForm ? "#02d1ba" : "#9ca3af",
            fontSize: 12, fontWeight: 600, cursor: "pointer",
            transition: "all 0.15s",
          }}
        >
          <svg viewBox="0 0 20 20" fill="none" style={{ width: 13, height: 13 }}>
            <line x1="10" y1="4" x2="10" y2="16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <line x1="4" y1="10" x2="16" y2="10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          Ajouter
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <div style={{
          background: "#141414",
          border: "1px solid rgba(2,209,186,0.15)",
          borderRadius: 12,
          padding: 16,
          marginBottom: 16,
          animation: "cardIn 0.25s ease",
        }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
            <div>
              <label style={{ fontSize: 9, fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase", color: "#6b7280", display: "block", marginBottom: 4 }}>Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: 9, fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase", color: "#6b7280", display: "block", marginBottom: 4 }}>Poids (kg)</label>
              <input type="number" inputMode="decimal" step="0.1" placeholder="75.5" value={weight}
                onChange={e => setWeight(e.target.value)} style={inputStyle}
                onKeyDown={e => e.key === "Enter" && handleAdd()} />
            </div>
            <div>
              <label style={{ fontSize: 9, fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase", color: "#6b7280", display: "block", marginBottom: 4 }}>% Masse grasse (optionnel)</label>
              <input type="number" inputMode="decimal" step="0.1" placeholder="15.0" value={fat}
                onChange={e => setFat(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: 9, fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase", color: "#6b7280", display: "block", marginBottom: 4 }}>Note (optionnel)</label>
              <input type="text" placeholder="Après cardio..." value={note}
                onChange={e => setNote(e.target.value)} style={inputStyle} />
            </div>
          </div>
          <button
            onClick={handleAdd}
            style={{
              width: "100%", padding: "11px",
              background: weight ? "#02d1ba" : "#1e1e1e",
              border: "none", borderRadius: 8,
              color: weight ? "#0d0d0d" : "#555",
              fontFamily: "'Inter',sans-serif",
              fontSize: 13, fontWeight: 700,
              cursor: weight ? "pointer" : "not-allowed",
              transition: "all 0.15s",
            }}
          >
            Enregistrer la pesée
          </button>
        </div>
      )}

      {/* Stats cards */}
      {stats && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 16 }}>
          {[
            { label: "Actuel", value: `${stats.current} kg`, sub: null, highlight: true },
            { label: "Variation totale", value: `${stats.totalDelta > 0 ? "+" : ""}${stats.totalDelta} kg`,
              sub: `depuis début`, color: stats.totalDelta < 0 ? "#02d1ba" : stats.totalDelta > 0 ? "#ef4444" : "#9ca3af" },
            { label: "Tendance", value: trendLabel, sub: "7 derniers jours", color: trendColor },
          ].map((card, i) => (
            <div key={i} style={{
              background: "#141414",
              border: `1px solid ${card.highlight ? "rgba(2,209,186,0.2)" : "rgba(255,255,255,0.06)"}`,
              borderRadius: 10, padding: "12px 10px",
            }}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase", color: "#555", marginBottom: 4 }}>
                {card.label}
              </div>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 14, fontWeight: 600, color: card.color || "#02d1ba", lineHeight: 1.2 }}>
                {card.value}
              </div>
              {card.sub && (
                <div style={{ fontSize: 10, color: "#444", marginTop: 2 }}>{card.sub}</div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Extra stats row */}
      {stats && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8, marginBottom: 16 }}>
          {[
            { label: "Moy. 7 jours", value: stats.avg7 ? `${stats.avg7} kg` : "—" },
            { label: "Moy. 30 jours", value: stats.avg30 ? `${stats.avg30} kg` : "—" },
          ].map((c, i) => (
            <div key={i} style={{
              background: "#141414", border: "1px solid rgba(255,255,255,0.05)",
              borderRadius: 10, padding: "10px 12px",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <span style={{ fontSize: 11, color: "#555" }}>{c.label}</span>
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, fontWeight: 600, color: "#f5f5f5" }}>
                {c.value}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      {entries.length >= 2 && (
        <>
          <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
            {[["curve", "Courbe"], ["bars", "Semaines"], ["history", "Historique"]].map(([t, l]) => (
              <button key={t} onClick={() => setTab(t)} style={{
                padding: "5px 13px",
                background: tab === t ? "rgba(2,209,186,0.15)" : "transparent",
                border: `1px solid ${tab === t ? "rgba(2,209,186,0.3)" : "rgba(255,255,255,0.07)"}`,
                borderRadius: 100,
                color: tab === t ? "#02d1ba" : "#555",
                fontSize: 11, fontWeight: 600, cursor: "pointer",
                transition: "all 0.15s",
              }}>{l}</button>
            ))}
            {tab === "curve" && (
              <div style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
                {[[7,"7j"],[30,"30j"],[90,"3m"],["all","Tout"]].map(([v, l]) => (
                  <button key={v} onClick={() => setRange(v)} style={{
                    padding: "4px 10px",
                    background: range === v ? "#1e1e1e" : "transparent",
                    border: `1px solid ${range === v ? "rgba(255,255,255,0.12)" : "transparent"}`,
                    borderRadius: 100,
                    color: range === v ? "#f5f5f5" : "#444",
                    fontSize: 10, fontWeight: 500, cursor: "pointer",
                    transition: "all 0.12s",
                  }}>{l}</button>
                ))}
              </div>
            )}
          </div>

          <div style={{
            background: "#141414",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 12, overflow: "hidden",
          }}>
            {tab === "curve" && (
              <div style={{ padding: "12px 8px 4px" }}>
                {filteredEntries.length >= 2 ? (
                  <LineChart
                    data={filteredEntries}
                    width={Math.min(600, window.innerWidth - 56)}
                    height={180}
                    showDots={filteredEntries.length <= 30}
                  />
                ) : (
                  <div style={{ padding: 24, textAlign: "center", color: "#444", fontSize: 12 }}>
                    Pas assez de données pour cette période
                  </div>
                )}
              </div>
            )}

            {tab === "bars" && (
              <div style={{ padding: "12px 8px 4px" }}>
                {stats?.weeklyAvgs?.length >= 2 ? (
                  <WeeklyBars
                    data={stats.weeklyAvgs}
                    width={Math.min(600, window.innerWidth - 56)}
                    height={160}
                  />
                ) : (
                  <div style={{ padding: 24, textAlign: "center", color: "#444", fontSize: 12 }}>
                    Pas assez de semaines enregistrées
                  </div>
                )}
              </div>
            )}

            {tab === "history" && (
              <div style={{ maxHeight: 280, overflowY: "auto" }}>
                {[...entries].reverse().map((e, i) => (
                  <div key={i} style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "10px 14px",
                    borderBottom: "1px solid rgba(255,255,255,0.04)",
                  }}>
                    <div>
                      <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, fontWeight: 600, color: "#f5f5f5" }}>
                        {e.weight} kg
                        {e.fat && <span style={{ fontSize: 11, color: "#555", marginLeft: 8 }}>{e.fat}% MG</span>}
                      </div>
                      <div style={{ fontSize: 10, color: "#555", marginTop: 2 }}>
                        {new Date(e.date).toLocaleDateString("fr-FR", { weekday: "short", day: "2-digit", month: "short", year: "numeric" })}
                        {e.note && ` · ${e.note}`}
                      </div>
                    </div>
                    <button
                      onClick={() => removeEntry(e.date)}
                      style={{
                        background: "none", border: "none",
                        color: "#333", cursor: "pointer", fontSize: 16,
                        padding: "4px 6px", borderRadius: 5,
                        transition: "color 0.1s",
                      }}
                      onMouseEnter={ev => ev.target.style.color = "#ef4444"}
                      onMouseLeave={ev => ev.target.style.color = "#333"}
                    >×</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Empty state */}
      {entries.length === 0 && !showForm && (
        <div style={{
          background: "#141414",
          border: "1px dashed rgba(255,255,255,0.08)",
          borderRadius: 12,
          padding: 32,
          textAlign: "center",
        }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>⚖️</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#f5f5f5", marginBottom: 4 }}>
            Commence ton suivi
          </div>
          <div style={{ fontSize: 12, color: "#555", lineHeight: 1.6 }}>
            Enregistre ta première pesée pour suivre<br/>ton évolution semaine par semaine.
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useEffect, useState, useMemo } from "react";
import { supabase } from "../../lib/supabase";
import {
  buildActivityHeatmap,
  getPeakActivity,
  pearson,
  interpretCorrelation,
  analyzeProgrammes,
  globalWeightEvolution,
  progressionRate,
} from "../../lib/coachAnalytics";
import AppIcon from "../AppIcon";
import Spinner from "../Spinner";

const G = "#02d1ba";
const ORANGE = "#00C9A7";
const VIOLET = "#00C9A7";
const RED = "#ff6b6b";
const JOURS = ["DIM", "LUN", "MAR", "MER", "JEU", "VEN", "SAM"];

/**
 * AnalyticsSection — vue dediee analytics avancees du coach.
 * Affiche : heatmap activite, correlations, performance programmes,
 * evolution globale clientele.
 */
export default function AnalyticsSection({ coachId, clients = [], onClose }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({});
  const [period, setPeriod] = useState(90); // 30/90/180/365

  // Escape key pour fermer
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose?.(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    if (!coachId || clients.length === 0) return;
    let mounted = true;
    const load = async () => {
      setLoading(true);
      const ids = clients.map((c) => c.id);
      const sincePeriod = new Date(Date.now() - period * 86400000).toISOString();
      const since30 = new Date(Date.now() - 30 * 86400000).toISOString();

      const [sessionsRes, weightsRes, sleepRpeRes, programmesRes] = await Promise.all([
        // Toutes les sessions des 30j (pour heatmap + analytics)
        supabase.from("session_logs").select("client_id, logged_at").in("client_id", ids).gte("logged_at", since30),
        // Tous les poids sur la periode (pour evolution globale)
        supabase.from("weight_logs").select("client_id, date, weight").in("client_id", ids).gte("date", sincePeriod.split("T")[0]),
        // Daily tracking + RPE pour correlations
        supabase.from("daily_tracking").select("client_id, date, sommeil_h").in("client_id", ids).gte("date", since30.split("T")[0]),
        // Programmes pour performance
        supabase.from("programmes").select("id, client_id, programme_name, uploaded_at").in("client_id", ids),
      ]);

      const rpeRes = await supabase
        .from("session_rpe")
        .select("client_id, date, rpe")
        .in("client_id", ids)
        .gte("date", since30.split("T")[0]);

      // ===== HEATMAP =====
      const heatmap = buildActivityHeatmap((sessionsRes.data || []).map((s) => s.logged_at));
      const peak = getPeakActivity(heatmap);
      const heatmapMax = Math.max(1, ...heatmap.flat());

      // ===== CORRELATIONS =====
      // Sommeil moyen par client vs RPE moyen (scatter)
      const sleepByClient = aggregateAvg(sleepRpeRes.data || [], "client_id", "sommeil_h");
      const rpeByClient = aggregateAvg(rpeRes.data || [], "client_id", "rpe");
      const xs = [], ys = [];
      for (const cid of Object.keys(sleepByClient)) {
        if (rpeByClient[cid] !== undefined && sleepByClient[cid] > 0) {
          xs.push(sleepByClient[cid]);
          ys.push(rpeByClient[cid]);
        }
      }
      // Sommeil vs RPE : on s'attend a une correlation negative (plus de sommeil = RPE plus bas = mieux)
      const sleepRpeCorr = pearson(xs, ys);

      // ===== PROGRAMMES =====
      const sessionsByClient = groupBy(sessionsRes.data || [], "client_id");
      const programmes = analyzeProgrammes(programmesRes.data || [], sessionsByClient);

      // ===== EVOLUTION GLOBALE =====
      const evolution = globalWeightEvolution(weightsRes.data || [], period);
      const progression = progressionRate(clients, evolution);

      if (mounted) {
        setData({ heatmap, heatmapMax, peak, sleepRpeCorr, programmes, evolution, progression });
        setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [coachId, clients, period]);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 600, background: "#080C14", overflowY: "auto", WebkitOverflowScrolling: "touch", fontFamily: "-apple-system,Inter,sans-serif", color: "#fff" }}>
      <style>{`@keyframes anFade{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {/* Header sticky */}
      <div style={{ position: "sticky", top: 0, zIndex: 10, background: "rgba(8,12,20,0.95)", backdropFilter: "blur(16px)", padding: "calc(env(safe-area-inset-top, 12px) + 16px) 24px 16px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
          <button onClick={onClose} aria-label="Fermer" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 100, width: 36, height: 36, color: "rgba(255,255,255,0.6)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <AppIcon name="arrow-left" size={14} color="rgba(255,255,255,0.6)" />
          </button>
          <div>
            <div style={{ fontSize: 11, letterSpacing: ".2em", textTransform: "uppercase", color: "#4A4A5A", fontWeight: 700 }}>Analytics</div>
            <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 24, fontWeight: 900, color: "#fff", letterSpacing: "-0.03em" }}>Tes chiffres<span style={{ color: "#00C9A7" }}>.</span></div>
          </div>
        </div>
        {/* Period selector */}
        <div style={{ display: "inline-flex", background: "rgba(255,255,255,0.04)", borderRadius: 100, padding: 3 }}>
          {[30, 90, 180, 365].map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              style={{
                padding: "6px 12px", borderRadius: 100,
                background: period === p ? VIOLET : "transparent",
                color: period === p ? "#000" : "rgba(255,255,255,0.5)",
                border: "none", fontSize: 10, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", letterSpacing: "0.5px",
              }}
            >
              {p === 365 ? "1 AN" : `${p}J`}
            </button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "20px 24px 80px" }}>
        {loading ? (
          <div style={{ padding: 60, display: "flex", justifyContent: "center" }}>
            <Spinner variant="dots" size={32} color={VIOLET} label="Calcul des analytics" />
          </div>
        ) : (
          <>
            {/* ===== EVOLUTION GLOBALE ===== */}
            <Card title="Evolution clientele" subtitle={`${period === 365 ? "12 derniers mois" : `${period} derniers jours`}`} accent={G}>
              {data.evolution?.count > 0 ? (
                <div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 14 }}>
                    <Metric label="Delta poids moyen" value={`${data.evolution.avg > 0 ? "+" : ""}${data.evolution.avg} kg`} color={data.evolution.avg < 0 ? G : data.evolution.avg > 0 ? ORANGE : "rgba(255,255,255,0.5)"} />
                    <Metric label="Sur" value={`${data.evolution.count} clients`} color="rgba(255,255,255,0.6)" />
                    <Metric label="Progression" value={`${data.progression}%`} color={data.progression >= 70 ? G : data.progression >= 40 ? ORANGE : RED} />
                  </div>
                  <div style={{ display: "flex", gap: 10, fontSize: 11 }}>
                    <Tag color={G}>{data.evolution.losers} en perte de poids</Tag>
                    <Tag color="rgba(255,255,255,0.4)">{data.evolution.stable} stables</Tag>
                    <Tag color={ORANGE}>{data.evolution.gainers} en prise</Tag>
                  </div>
                </div>
              ) : (
                <Empty text="Pas assez de pesees sur la periode pour calculer l'evolution." />
              )}
            </Card>

            {/* ===== PERFORMANCE PROGRAMMES ===== */}
            <Card title="Performance programmes" subtitle="Adherence moyenne par programme" accent={VIOLET}>
              {data.programmes && data.programmes.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {data.programmes.slice(0, 6).map((p, i) => (
                    <div key={p.name + i} style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 12, padding: "12px 14px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 220 }}>{p.name}</div>
                        <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 14, fontWeight: 800, color: p.avgAdherence >= 70 ? G : p.avgAdherence >= 40 ? ORANGE : RED }}>
                          {p.avgAdherence}%
                        </div>
                      </div>
                      <div style={{ height: 4, background: "rgba(255,255,255,0.05)", borderRadius: 2, overflow: "hidden", marginBottom: 6 }}>
                        <div style={{ height: "100%", width: `${p.avgAdherence}%`, background: p.avgAdherence >= 70 ? G : p.avgAdherence >= 40 ? ORANGE : RED, borderRadius: 2 }} />
                      </div>
                      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>
                        {p.totalSessions} seances · {p.clientsCount} client{p.clientsCount > 1 ? "s" : ""}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <Empty text="Aucun programme actif a analyser." />
              )}
            </Card>

            {/* ===== HEATMAP ===== */}
            <Card title="Heatmap activite 30j" subtitle="Quand tes clients s'entrainent le plus" accent={ORANGE}>
              {data.heatmap && data.heatmapMax > 0 ? (
                <>
                  <Heatmap grid={data.heatmap} max={data.heatmapMax} />
                  {data.peak.count > 0 && (
                    <div style={{ marginTop: 12, padding: "10px 12px", background: "rgba(0,201,167,0.08)", border: "1px solid rgba(0,201,167,0.2)", borderRadius: 10, fontSize: 11, color: "rgba(255,255,255,0.7)", lineHeight: 1.5 }}>
                      <strong style={{ color: ORANGE }}>Pic d'activite :</strong> {JOURS[data.peak.day].toLowerCase()} a {String(data.peak.hour).padStart(2, "0")}h ({data.peak.count} seance{data.peak.count > 1 ? "s" : ""}). Reserve tes creneaux disponibles autour de ce moment.
                    </div>
                  )}
                </>
              ) : (
                <Empty text="Pas encore assez de seances loguees." />
              )}
            </Card>

            {/* ===== CORRELATIONS ===== */}
            <Card title="Correlation sommeil ↔ RPE" subtitle="Impact du sommeil sur la perception d'effort" accent={G}>
              {!isNaN(data.sleepRpeCorr) ? (
                <CorrelationCard
                  r={data.sleepRpeCorr}
                  hint={data.sleepRpeCorr < -0.3 ? "Tes clients qui dorment mieux ressentent moins l'effort. Continue d'insister sur le sommeil." : data.sleepRpeCorr > 0.3 ? "Pattern inverse — verifie les donnees." : "Pas de correlation claire — chaque client est different."}
                />
              ) : (
                <Empty text="Pas assez de donnees sommeil + RPE croisees." />
              )}
            </Card>
          </>
        )}
      </div>
    </div>
  );
}

// ====== Composants helpers ======

function Card({ title, subtitle, accent, children }) {
  return (
    <div style={{ marginBottom: 18, animation: "anFade 0.4s ease both" }}>
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 10, letterSpacing: "2px", textTransform: "uppercase", color: accent, opacity: 0.85, fontWeight: 700, marginBottom: 4 }}>{title}</div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>{subtitle}</div>
      </div>
      <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: "16px 18px" }}>{children}</div>
    </div>
  );
}

function Metric({ label, value, color }) {
  return (
    <div>
      <div style={{ fontSize: 9, letterSpacing: "1px", textTransform: "uppercase", color: "rgba(255,255,255,0.4)", fontWeight: 700, marginBottom: 4 }}>{label}</div>
      <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 18, fontWeight: 800, color }}>{value}</div>
    </div>
  );
}

function Tag({ color, children }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", background: `${color}15`, border: `1px solid ${color}30`, color, borderRadius: 100, fontSize: 10, fontWeight: 700, letterSpacing: "0.3px" }}>
      {children}
    </span>
  );
}

function Empty({ text }) {
  return <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", textAlign: "center", padding: "12px 0", fontStyle: "italic" }}>{text}</div>;
}

function Heatmap({ grid, max }) {
  const cellSize = 14;
  const gap = 2;
  return (
    <div>
      {/* Labels heures (axe X) */}
      <div style={{ display: "flex", gap, marginLeft: 30, marginBottom: 4 }}>
        {[0, 6, 12, 18].map((h) => (
          <div key={h} style={{ width: (cellSize + gap) * 6 - gap, fontSize: 8, color: "rgba(255,255,255,0.3)", fontWeight: 700, letterSpacing: "0.5px" }}>
            {String(h).padStart(2, "0")}h
          </div>
        ))}
      </div>
      {/* Grille jours */}
      {grid.map((row, day) => (
        <div key={day} style={{ display: "flex", gap, marginBottom: gap, alignItems: "center" }}>
          <div style={{ width: 26, fontSize: 8, color: "rgba(255,255,255,0.3)", fontWeight: 700, letterSpacing: "0.5px" }}>{JOURS[day]}</div>
          {row.map((count, hour) => {
            const intensity = count / max;
            const bg = count === 0 ? "rgba(255,255,255,0.03)" : `rgba(0,201,167,${0.2 + intensity * 0.8})`;
            return (
              <div
                key={hour}
                title={`${JOURS[day]} ${hour}h : ${count} seance${count > 1 ? "s" : ""}`}
                style={{
                  width: cellSize, height: cellSize,
                  background: bg, borderRadius: 3,
                  transition: "background 0.2s",
                }}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}

function CorrelationCard({ r, hint }) {
  const interp = interpretCorrelation(r);
  const pct = Math.round(Math.abs(r) * 100);
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 10 }}>
        <div style={{ width: 70, height: 70, borderRadius: "50%", background: `${interp.color}18`, border: `1px solid ${interp.color}40`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 18, fontWeight: 800, color: interp.color }}>
            {r > 0 ? "+" : ""}{r.toFixed(2)}
          </div>
          <div style={{ fontSize: 8, color: interp.color, opacity: 0.7, letterSpacing: "0.5px" }}>r</div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: interp.color, marginBottom: 4 }}>{interp.label}</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>{pct}% de force statistique</div>
        </div>
      </div>
      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.55)", lineHeight: 1.6, padding: "10px 12px", background: "rgba(255,255,255,0.025)", borderRadius: 10 }}>
        {hint}
      </div>
    </div>
  );
}

// ====== Helpers ======
function aggregateAvg(rows, keyField, valueField) {
  const buckets = {};
  for (const r of rows) {
    const k = r[keyField];
    if (!buckets[k]) buckets[k] = { sum: 0, count: 0 };
    if (r[valueField] != null && r[valueField] > 0) {
      buckets[k].sum += r[valueField];
      buckets[k].count++;
    }
  }
  const out = {};
  for (const k of Object.keys(buckets)) {
    if (buckets[k].count > 0) out[k] = buckets[k].sum / buckets[k].count;
  }
  return out;
}

function groupBy(arr, key) {
  return arr.reduce((acc, item) => {
    (acc[item[key]] = acc[item[key]] || []).push(item);
    return acc;
  }, {});
}

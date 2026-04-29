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
import { useT } from "../../lib/i18n";

const G = "#02d1ba";
const ORANGE = "#00C9A7";
const VIOLET = "#00C9A7";
const RED = "#ff6b6b";
const DAY_KEYS = ["an.day_dim", "an.day_lun", "an.day_mar", "an.day_mer", "an.day_jeu", "an.day_ven", "an.day_sam"];

const fillTpl = (s, vars) => {
  let out = s;
  Object.entries(vars).forEach(([k, v]) => { out = out.split(`{${k}}`).join(String(v)); });
  return out;
};

/**
 * AnalyticsSection — vue dediee analytics avancees du coach.
 * Affiche : heatmap activite, correlations, performance programmes,
 * evolution globale clientele.
 */
export default function AnalyticsSection({ coachId, clients = [], onClose }) {
  const t = useT();
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
    <div style={{ position: "fixed", inset: 0, zIndex: 600, background: "#050505", overflowY: "auto", WebkitOverflowScrolling: "touch", fontFamily: "-apple-system,Inter,sans-serif", color: "#fff" }}>
      <style>{`@keyframes anFade{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}} @media(max-width:600px){.an-header{padding-left:16px !important;padding-right:16px !important} .an-content{padding-left:16px !important;padding-right:16px !important}}`}</style>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "60%", background: "radial-gradient(ellipse at 50% -10%, rgba(2,209,186,0.15) 0%, transparent 60%)", pointerEvents: "none" }} />

      {/* Header sticky */}
      <div className="an-header" style={{ position: "sticky", top: 0, zIndex: 10, background: "rgba(8,12,20,0.95)", WebkitBackdropFilter: "blur(16px)", backdropFilter: "blur(16px)", padding: "calc(env(safe-area-inset-top, 0px) + 16px) 24px 16px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
          <button onClick={onClose} aria-label={t("an.aria_close")} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 100, width: 36, height: 36, color: "rgba(255,255,255,0.6)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <AppIcon name="arrow-left" size={14} color="rgba(255,255,255,0.6)" />
          </button>
          <div>
            <div style={{ fontSize: 10, color: "rgba(2,209,186,0.55)", letterSpacing: "3px", textTransform: "uppercase", marginBottom: 6 }}>{t("an.eyebrow")}</div>
            <div style={{ fontSize: 32, fontWeight: 800, color: "#fff", letterSpacing: "-2px", lineHeight: 0.92 }}>{t("an.title")}<span style={{ color: "#00C9A7" }}>.</span></div>
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
              {p === 365 ? t("an.period_year") : fillTpl(t("an.period_days"), { n: p })}
            </button>
          ))}
        </div>
      </div>

      <div className="an-content" style={{ maxWidth: 1100, margin: "0 auto", padding: "20px 24px 100px" }}>
        {loading ? (
          <div style={{ padding: 60, display: "flex", justifyContent: "center" }}>
            <Spinner variant="dots" size={32} color={VIOLET} label={t("an.spinner_label")} />
          </div>
        ) : (
          <>
            {/* ===== EVOLUTION GLOBALE ===== */}
            <Card title={t("an.evolution_title")} subtitle={period === 365 ? t("an.evolution_sub_year") : fillTpl(t("an.evolution_sub_days"), { n: period })} accent={G}>
              {data.evolution?.count > 0 ? (
                <div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10, marginBottom: 14 }}>
                    <Metric label={t("an.metric_avg_delta")} value={`${data.evolution.avg > 0 ? "+" : ""}${data.evolution.avg} kg`} color={data.evolution.avg < 0 ? G : data.evolution.avg > 0 ? ORANGE : "rgba(255,255,255,0.5)"} />
                    <Metric label={t("an.metric_on")} value={fillTpl(t("an.metric_clients_count"), { n: data.evolution.count })} color="rgba(255,255,255,0.6)" />
                    <Metric label={t("an.metric_progression")} value={`${data.progression}%`} color={data.progression >= 70 ? G : data.progression >= 40 ? ORANGE : RED} />
                  </div>
                  <div style={{ display: "flex", gap: 10, fontSize: 11 }}>
                    <Tag color={G}>{fillTpl(t("an.tag_losers"), { n: data.evolution.losers })}</Tag>
                    <Tag color="rgba(255,255,255,0.4)">{fillTpl(data.evolution.stable > 1 ? t("an.tag_stable_many") : t("an.tag_stable_one"), { n: data.evolution.stable })}</Tag>
                    <Tag color={ORANGE}>{fillTpl(t("an.tag_gainers"), { n: data.evolution.gainers })}</Tag>
                  </div>
                </div>
              ) : (
                <Empty text={t("an.empty_evolution")} />
              )}
            </Card>

            {/* ===== PERFORMANCE PROGRAMMES ===== */}
            <Card title={t("an.programmes_title")} subtitle={t("an.programmes_sub")} accent={VIOLET}>
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
                        {fillTpl(p.totalSessions > 1 ? t("an.sessions_many") : t("an.sessions_one"), { n: p.totalSessions })} · {fillTpl(p.clientsCount > 1 ? t("an.client_many") : t("an.client_one"), { n: p.clientsCount })}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <Empty text={t("an.empty_programmes")} />
              )}
            </Card>

            {/* ===== HEATMAP ===== */}
            <Card title={t("an.heatmap_title")} subtitle={t("an.heatmap_sub")} accent={ORANGE}>
              {data.heatmap && data.heatmapMax > 0 ? (
                <>
                  <Heatmap grid={data.heatmap} max={data.heatmapMax} />
                  {data.peak.count > 0 && (
                    <div style={{ marginTop: 12, padding: "10px 12px", background: "rgba(0,201,167,0.08)", border: "1px solid rgba(0,201,167,0.2)", borderRadius: 10, fontSize: 11, color: "rgba(255,255,255,0.7)", lineHeight: 1.5 }}>
                      <strong style={{ color: ORANGE }}>{t("an.peak_label")}</strong>{fillTpl(data.peak.count > 1 ? t("an.peak_text_many") : t("an.peak_text_one"), { day: t(DAY_KEYS[data.peak.day]).toLowerCase(), hour: String(data.peak.hour).padStart(2, "0"), n: data.peak.count })}
                    </div>
                  )}
                </>
              ) : (
                <Empty text={t("an.empty_heatmap")} />
              )}
            </Card>

            {/* ===== CORRELATIONS ===== */}
            <Card title={t("an.correlation_title")} subtitle={t("an.correlation_sub")} accent={G}>
              {!isNaN(data.sleepRpeCorr) ? (
                <CorrelationCard
                  r={data.sleepRpeCorr}
                  hint={data.sleepRpeCorr < -0.3 ? t("an.correlation_hint_negative") : data.sleepRpeCorr > 0.3 ? t("an.correlation_hint_positive") : t("an.correlation_hint_none")}
                />
              ) : (
                <Empty text={t("an.empty_correlation")} />
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
  const t = useT();
  const [cellSize, setCellSize] = React.useState(typeof window !== 'undefined' && window.innerWidth < 480 ? 10 : 14);
  React.useEffect(() => {
    const onResize = () => setCellSize(window.innerWidth < 480 ? 10 : 14);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
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
          <div style={{ width: 26, fontSize: 8, color: "rgba(255,255,255,0.3)", fontWeight: 700, letterSpacing: "0.5px" }}>{t(DAY_KEYS[day])}</div>
          {row.map((count, hour) => {
            const intensity = count / max;
            const bg = count === 0 ? "rgba(255,255,255,0.03)" : `rgba(0,201,167,${0.2 + intensity * 0.8})`;
            return (
              <div
                key={hour}
                title={fillTpl(count > 1 ? t("an.heatmap_cell_many") : t("an.heatmap_cell_one"), { day: t(DAY_KEYS[day]), hour, n: count })}
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
  const t = useT();
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
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>{fillTpl(t("an.correlation_strength"), { n: pct })}</div>
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

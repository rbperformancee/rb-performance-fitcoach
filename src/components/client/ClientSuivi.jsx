import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "../../lib/supabase";
import { useT } from "../../lib/i18n";
import { isClientDemoMode } from "../../lib/demoMode";

const fillTpl = (s, vars) => {
  let out = s;
  Object.entries(vars).forEach(([k, v]) => { out = out.split(`{${k}}`).join(String(v)); });
  return out;
};

/**
 * ClientSuivi — onglet Suivi: pesee + graphe SVG + stats transformation.
 */
export default function ClientSuivi({ client, accent }) {
  const t = useT();
  const [weight, setWeight] = useState("");
  const [saving, setSaving] = useState(false);
  const [measurements, setMeasurements] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!client?.id) return;
    loadMeasurements();
  }, [client?.id]);

  async function loadMeasurements() {
    const { data } = await supabase
      .from("client_measurements")
      .select("id, weight_kg, measured_at")
      .eq("client_id", client.id)
      .order("measured_at", { ascending: true })
      .limit(50);
    setMeasurements(data || []);
  }

  async function saveWeight() {
    const w = parseFloat(weight.replace(",", "."));
    setError("");
    if (isNaN(w) || w < 30 || w > 300) {
      setError(t("csv.invalid_weight"));
      return;
    }
    if (isClientDemoMode()) {
      setError("Desactive en mode demo");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from("client_measurements")
        .insert({ client_id: client.id, weight_kg: w });
      if (error) throw error;
      setWeight("");
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
      await loadMeasurements();
    } catch (e) {
      setError(e.message || t("csv.error"));
    }
    setSaving(false);
  }

  // Stats
  const stats = useMemo(() => {
    if (measurements.length === 0) return null;
    const first = measurements[0];
    const last = measurements[measurements.length - 1];
    const delta = (last.weight_kg - first.weight_kg);
    const startedAt = client?.subscription_start_date
      ? new Date(client.subscription_start_date)
      : new Date(first.measured_at);
    const days = Math.max(1, Math.floor((Date.now() - startedAt.getTime()) / 86400000));
    return { first: first.weight_kg, last: last.weight_kg, delta, days };
  }, [measurements, client]);

  // Graphe SVG (8 derniers points)
  const graph = useMemo(() => {
    if (measurements.length === 0) return null;
    const last8 = measurements.slice(-8);
    const ws = last8.map((m) => Number(m.weight_kg));
    const min = Math.min(...ws);
    const max = Math.max(...ws);
    const range = max - min || 1;
    const W = 320, H = 100, padX = 8, padY = 14;
    const pts = last8.map((m, i) => {
      const x = padX + (i / Math.max(1, last8.length - 1)) * (W - 2 * padX);
      const y = padY + (1 - (m.weight_kg - min) / range) * (H - 2 * padY);
      return { x, y, w: m.weight_kg };
    });
    const path = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
    const area = `${path} L ${pts[pts.length-1].x.toFixed(1)},${H} L ${pts[0].x.toFixed(1)},${H} Z`;
    return { W, H, pts, path, area };
  }, [measurements]);

  return (
    <div style={{ padding: "32px 20px 20px" }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: ".22em", textTransform: "uppercase", color: "rgba(255,255,255,.18)", marginBottom: 10 }}>
          {t("csv.my_tracking")}
        </div>
        <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 32, fontWeight: 900, letterSpacing: "-1.5px", color: "#fff", lineHeight: 1 }}>
          {t("csv.body")}<span style={{ color: accent }}>.</span>
        </div>
      </div>

      {/* ===== FORM PESEE ===== */}
      <div style={{ padding: "18px 20px", background: "rgba(2,209,186,.04)", border: `.5px solid ${accent}25`, borderRadius: 16, marginBottom: 20 }}>
        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: ".22em", textTransform: "uppercase", color: accent, marginBottom: 12 }}>
          {t("csv.new_weighing")}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            type="text"
            inputMode="decimal"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            placeholder={t("csv.weight_placeholder")}
            style={{
              flex: 1, height: 46,
              padding: "0 14px",
              background: "rgba(255,255,255,.05)",
              border: ".5px solid rgba(255,255,255,.1)",
              borderRadius: 10,
              color: "#fff", fontSize: 16,
              fontFamily: "'JetBrains Mono', monospace",
              outline: "none", boxSizing: "border-box",
            }}
            onKeyDown={(e) => e.key === "Enter" && saveWeight()}
          />
          <span style={{ display: "flex", alignItems: "center", padding: "0 12px", background: "rgba(255,255,255,.04)", border: ".5px solid rgba(255,255,255,.08)", borderRadius: 10, fontSize: 12, color: "rgba(255,255,255,.5)" }}>kg</span>
          <button
            onClick={saveWeight}
            disabled={saving || !weight.trim()}
            style={{
              padding: "0 18px", height: 46,
              background: saving || !weight.trim() ? "rgba(255,255,255,.04)" : accent,
              color: saving || !weight.trim() ? "rgba(255,255,255,.3)" : "#000",
              border: "none", borderRadius: 10,
              fontSize: 12, fontWeight: 800, letterSpacing: ".05em",
              cursor: saving ? "wait" : "pointer", fontFamily: "inherit",
              textTransform: "uppercase",
            }}
          >
            {saving ? "..." : success ? "✓" : t("csv.save_short")}
          </button>
        </div>
        {error && <div style={{ marginTop: 8, fontSize: 11, color: "#ef4444" }}>{error}</div>}
      </div>

      {/* ===== GRAPHE ===== */}
      {graph ? (
        <div style={{ padding: "18px 20px", background: "rgba(255,255,255,.02)", border: ".5px solid rgba(255,255,255,.06)", borderRadius: 16, marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: ".22em", textTransform: "uppercase", color: "rgba(255,255,255,.3)" }}>{t("csv.recent_evolution")}</div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "rgba(255,255,255,.4)" }}>
              {fillTpl(measurements.length > 1 ? t("csv.weighings_count_plural") : t("csv.weighings_count"), { n: measurements.length })}
            </div>
          </div>
          <svg viewBox={`0 0 ${graph.W} ${graph.H}`} preserveAspectRatio="none" style={{ width: "100%", height: 100, display: "block" }}>
            <defs>
              <linearGradient id="suiviG" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor={accent} stopOpacity={0.25} />
                <stop offset="100%" stopColor={accent} stopOpacity={0} />
              </linearGradient>
            </defs>
            <path d={graph.area} fill="url(#suiviG)" />
            <path d={graph.path} fill="none" stroke={accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            {graph.pts.map((p, i) => (
              <circle key={i} cx={p.x} cy={p.y} r={i === graph.pts.length - 1 ? 4 : 2} fill={accent} />
            ))}
          </svg>
        </div>
      ) : (
        <div style={{ padding: "30px 20px", background: "rgba(255,255,255,.02)", border: ".5px solid rgba(255,255,255,.06)", borderRadius: 16, marginBottom: 16, textAlign: "center", color: "rgba(255,255,255,.3)", fontSize: 12 }}>
          {t("csv.record_first")}
        </div>
      )}

      {/* ===== STATS TRANSFORMATION ===== */}
      {stats && (
        <div style={{ padding: "18px 20px", background: "rgba(255,255,255,.02)", border: ".5px solid rgba(255,255,255,.06)", borderRadius: 16 }}>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: ".22em", textTransform: "uppercase", color: "rgba(255,255,255,.3)", marginBottom: 14 }}>{t("csv.my_results")}</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Block label={t("csv.initial_weight")} value={`${stats.first} kg`} />
            <Block label={t("csv.current_weight")} value={`${stats.last} kg`} accent={accent} />
            <Block label={t("csv.variation")} value={`${stats.delta > 0 ? "+" : ""}${stats.delta.toFixed(1)} kg`} accent={stats.delta >= 0 ? "#f97316" : accent} />
            <Block label={t("csv.tracking_label")} value={fillTpl(t("csv.days_short"), { n: stats.days })} />
          </div>
        </div>
      )}
    </div>
  );
}

function Block({ label, value, accent }) {
  return (
    <div style={{ padding: "12px 14px", background: "rgba(255,255,255,.02)", border: ".5px solid rgba(255,255,255,.05)", borderRadius: 10 }}>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 18, fontWeight: 200, color: accent || "#fff", letterSpacing: "-.5px", lineHeight: 1 }}>
        {value}
      </div>
      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: ".18em", textTransform: "uppercase", color: "rgba(255,255,255,.3)", marginTop: 6 }}>
        {label}
      </div>
    </div>
  );
}

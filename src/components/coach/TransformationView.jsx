import React, { useEffect, useState } from "react";
import { fetchTransformation } from "../../lib/transformationData";
import { generateTransformationPDF } from "../../utils/transformationPDF";
import AppIcon from "../AppIcon";
import Spinner from "../Spinner";
import { toast } from "../Toast";
import haptic from "../../lib/haptic";

const G = "#02d1ba";
const ORANGE = "#f97316";
const RED = "#ef4444";
const VIOLET = "#a78bfa";
const GOLD = "#fbbf24";

/**
 * TransformationView — ecran plein ecran qui montre la transformation
 * d'un client depuis le jour 1 : poids, seances, RPE, nutrition, timeline.
 * Bouton "Generer PDF" pour partager sur reseaux sociaux.
 */
// Donnees demo statiques (Lucas Bernard-like) pour le mode sandbox
const DEMO_DATA = {
  dayOne: new Date(Date.now() - 11 * 86400000),
  daysSinceStart: 11,
  weeksSinceStart: 2,
  totalSessions: 1,
  totalWeightLogs: 5,
  weights: [
    { date: new Date(Date.now() - 11 * 86400000).toISOString(), weight: 82.0 },
    { date: new Date(Date.now() - 9 * 86400000).toISOString(),  weight: 82.2 },
    { date: new Date(Date.now() - 6 * 86400000).toISOString(),  weight: 82.4 },
    { date: new Date(Date.now() - 3 * 86400000).toISOString(),  weight: 82.6 },
    { date: new Date(Date.now() - 2 * 86400000).toISOString(),  weight: 82.8 },
  ],
  sessions: [
    { logged_at: new Date(Date.now() - 0.2 * 86400000).toISOString(), session_name: "Push — Semaine 1" },
  ],
  rpes: [
    { date: new Date(Date.now() - 0.2 * 86400000).toISOString(), rpe: 3.5 },
  ],
  before: { weight: 82.0, sessionsWeek: 0, rpe: null, nutriDays: 0, avgCharge: null },
  after:  { weight: 82.8, sessionsWeek: 1, rpe: 3.5, nutriDays: 2, avgCharge: null },
  deltas: { weight: 0.8, sessionsWeek: 1, rpe: null, nutriDays: 2, charge: null },
};

export default function TransformationView({ client, coach, onClose, isDemo = false }) {
  const [data, setData] = useState(isDemo ? DEMO_DATA : null);
  const [loading, setLoading] = useState(!isDemo);
  const [generating, setGenerating] = useState(false);

  // Escape key pour fermer
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose?.(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    // En demo, on sert les donnees statiques et on n'appelle pas Supabase
    if (isDemo) { setData(DEMO_DATA); setLoading(false); return; }
    if (!client?.id) { setLoading(false); return; }
    let mounted = true;
    setLoading(true);

    // Safety timeout — si Supabase traine/hang, on sort de loading apres 15s
    // pour afficher au moins un etat vide plutot qu'un spinner infini.
    const timeoutId = setTimeout(() => {
      if (mounted) {
        console.warn("[TransformationView] timeout: aucune donnee recue apres 15s");
        setLoading(false);
      }
    }, 15000);

    fetchTransformation(client.id, client.subscription_start_date)
      .then((d) => {
        clearTimeout(timeoutId);
        if (mounted) { setData(d); setLoading(false); }
      })
      .catch((e) => {
        clearTimeout(timeoutId);
        console.error("[TransformationView] fetch error", e);
        if (mounted) { toast.error("Donnees non chargees"); setLoading(false); }
      });
    return () => { mounted = false; clearTimeout(timeoutId); };
  }, [client?.id, client?.subscription_start_date, isDemo]);

  const downloadPdf = async () => {
    if (!data) return;
    if (isDemo) {
      haptic.light();
      toast.info("Disponible en version complete →");
      return;
    }
    setGenerating(true);
    haptic.success();
    try {
      await generateTransformationPDF(client, coach || {}, data);
      toast.success("PDF genere");
    } catch (e) {
      console.error(e);
      toast.error("Erreur generation PDF");
    }
    setGenerating(false);
  };

  const share = async () => {
    if (!data) return;
    const brand = coach?.brand_name || coach?.full_name || "RB Perform";
    const deltaStr = data.deltas.weight !== null && Math.abs(data.deltas.weight) > 0.1
      ? `${data.deltas.weight > 0 ? "+" : ""}${data.deltas.weight.toFixed(1)} kg`
      : "Transformation";
    const text = `${deltaStr} en ${data.weeksSinceStart} semaines — coaching par ${brand} 💪 #RBPerform`;
    haptic.light();
    if (navigator.share) {
      try { await navigator.share({ title: "Transformation", text }); return; } catch {}
    }
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Texte copie");
    } catch {
      toast.error("Partage indisponible");
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 260, background: "#050505", overflowY: "auto", WebkitOverflowScrolling: "touch", fontFamily: "-apple-system,Inter,sans-serif", color: "#fff" }}>
      <style>{`@keyframes tvFade{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {/* Header */}
      <div style={{ position: "sticky", top: 0, zIndex: 10, background: "rgba(5,5,5,0.95)", backdropFilter: "blur(16px)", padding: "calc(env(safe-area-inset-top, 12px) + 16px) 24px 16px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={onClose} aria-label="Fermer" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 100, width: 36, height: 36, color: "rgba(255,255,255,0.6)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <AppIcon name="arrow-left" size={14} color="rgba(255,255,255,0.6)" />
          </button>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 9, letterSpacing: "3px", textTransform: "uppercase", color: GOLD, fontWeight: 700, opacity: 0.85 }}>Transformation</div>
            <div style={{ fontSize: 17, fontWeight: 900, color: "#fff", letterSpacing: "-0.3px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {client.full_name || client.email?.split("@")[0]}
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "20px 24px 100px" }}>
        {loading ? (
          <div style={{ padding: 80, display: "flex", justifyContent: "center" }}>
            <Spinner variant="dots" size={32} color={GOLD} label="Calcul de la transformation" />
          </div>
        ) : !data || !data.dayOne ? (
          <div style={{ padding: 60, textAlign: "center", color: "rgba(255,255,255,0.4)" }}>
            <AppIcon name="alert" size={32} color="rgba(255,255,255,0.3)" />
            <div style={{ marginTop: 12, fontSize: 13 }}>Ce client n'a pas encore assez de donnees pour generer une transformation.</div>
          </div>
        ) : (
          <>
            {/* HERO BIG NUMBER */}
            <div style={{ textAlign: "center", padding: "30px 20px 36px", animation: "tvFade 0.5s ease both" }}>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", letterSpacing: "3px", textTransform: "uppercase", fontWeight: 700, marginBottom: 12 }}>
                {data.weeksSinceStart} semaines de travail
              </div>
              {data.deltas.weight !== null && Math.abs(data.deltas.weight) > 0.1 ? (
                <>
                  <div style={{
                    fontFamily: "'JetBrains Mono',monospace",
                    fontSize: 96, fontWeight: 800,
                    letterSpacing: "-4px", lineHeight: 1,
                    color: data.deltas.weight < 0 ? G : ORANGE,
                    textShadow: `0 0 40px ${data.deltas.weight < 0 ? "rgba(2,209,186,0.3)" : "rgba(0,201,167,0.3)"}`,
                  }}>
                    {data.deltas.weight > 0 ? "+" : ""}{data.deltas.weight.toFixed(1)}
                    <span style={{ fontSize: 32, color: "rgba(255,255,255,0.4)", marginLeft: 8 }}>kg</span>
                  </div>
                  <div style={{ fontSize: 14, color: "rgba(255,255,255,0.6)", marginTop: 12, letterSpacing: "0.5px", textTransform: "uppercase", fontWeight: 700 }}>
                    {data.deltas.weight < 0 ? "de perte" : "de prise"}
                  </div>
                </>
              ) : (
                <>
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 72, fontWeight: 800, letterSpacing: "-3px", color: G }}>
                    {data.totalSessions}
                  </div>
                  <div style={{ fontSize: 14, color: "rgba(255,255,255,0.6)", marginTop: 6, letterSpacing: "0.5px", textTransform: "uppercase", fontWeight: 700 }}>
                    seances totales
                  </div>
                </>
              )}
            </div>

            {/* Weight timeline */}
            {data.weights.length >= 2 && (
              <div style={{ marginBottom: 18, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 18, padding: "18px 20px", animation: "tvFade 0.5s ease 0.1s both" }}>
                <div style={{ fontSize: 10, letterSpacing: "2px", textTransform: "uppercase", color: "rgba(2,209,186,0.7)", fontWeight: 700, marginBottom: 12 }}>
                  Courbe de poids · {data.weights.length} pesees
                </div>
                <WeightCurve weights={data.weights} />
              </div>
            )}

            {/* Comparison table S1 vs maintenant */}
            <div style={{ marginBottom: 18, animation: "tvFade 0.5s ease 0.15s both" }}>
              <div style={{ fontSize: 10, letterSpacing: "2px", textTransform: "uppercase", color: VIOLET, fontWeight: 700, marginBottom: 12 }}>
                Semaine 1 → Aujourd'hui
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <CompareCard
                  label="Seances / semaine"
                  before={data.before.sessionsWeek}
                  after={data.after.sessionsWeek}
                  unit=""
                  good={(delta) => delta >= 0}
                />
                <CompareCard
                  label="Jours nutrition loguee"
                  before={data.before.nutriDays}
                  after={data.after.nutriDays}
                  unit="/ 7"
                  good={(delta) => delta >= 0}
                />
                <CompareCard
                  label="RPE moyen"
                  before={data.before.rpe?.toFixed(1)}
                  after={data.after.rpe?.toFixed(1)}
                  unit=""
                  good={(delta) => delta <= 0}
                  deltaText={(d) => `${d > 0 ? "+" : ""}${d.toFixed(1)}`}
                />
                <CompareCard
                  label="Charge moyenne"
                  before={data.before.avgCharge?.toFixed(0)}
                  after={data.after.avgCharge?.toFixed(0)}
                  unit="kg"
                  good={(delta) => delta >= 0}
                  deltaText={(d) => `${d > 0 ? "+" : ""}${d.toFixed(0)}`}
                />
              </div>
            </div>

            {/* Totaux */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 18, animation: "tvFade 0.5s ease 0.2s both" }}>
              <BigStat value={data.totalSessions} label="seances" color={G} />
              <BigStat value={data.totalWeightLogs} label="pesees" color={VIOLET} />
              <BigStat value={data.daysSinceStart} label="jours" color={ORANGE} />
            </div>

            {/* Actions */}
            <div style={{ display: "flex", gap: 10, animation: "tvFade 0.5s ease 0.25s both" }}>
              <button
                onClick={downloadPdf}
                disabled={generating}
                style={{ flex: 1, padding: 16, background: GOLD, color: "#000", border: "none", borderRadius: 14, fontSize: 13, fontWeight: 800, letterSpacing: "0.5px", textTransform: "uppercase", cursor: generating ? "default" : "pointer", fontFamily: "inherit", boxShadow: `0 8px 28px ${GOLD}30`, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 10 }}
              >
                {generating ? (
                  <><Spinner variant="dots" size={14} color="#000" /> Generation</>
                ) : (
                  <><AppIcon name="document" size={14} color="#000" strokeWidth={2.2} /> Generer PDF</>
                )}
              </button>
              <button
                onClick={share}
                style={{ flex: 1, padding: 16, background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.8)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 14, fontSize: 13, fontWeight: 800, letterSpacing: "0.5px", textTransform: "uppercase", cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 10 }}
              >
                <AppIcon name="sparkles" size={14} color="rgba(255,255,255,0.8)" /> Partager
              </button>
            </div>

            <div style={{ marginTop: 20, padding: 14, background: "rgba(2,209,186,0.04)", border: "1px solid rgba(2,209,186,0.12)", borderRadius: 12, fontSize: 11, color: "rgba(255,255,255,0.55)", lineHeight: 1.6 }}>
              <strong style={{ color: "#02d1ba" }}>Astuce :</strong> Telecharge le PDF et partage-le sur Instagram / LinkedIn comme preuve de transformation. Format A4 premium, optimise pour capture d'ecran.
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ===== COMPOSANTS HELPERS =====

function CompareCard({ label, before, after, unit, good, deltaText }) {
  const hasDelta = before !== undefined && after !== undefined && before !== null && after !== null && before !== "—" && after !== "—";
  const delta = hasDelta ? parseFloat(after) - parseFloat(before) : null;
  const isGood = delta !== null ? good(delta) : null;
  const deltaStr = delta !== null && Math.abs(delta) >= 0.01
    ? (deltaText ? deltaText(delta) : `${delta > 0 ? "+" : ""}${delta.toFixed(0)}`)
    : null;
  const col = isGood ? "#02d1ba" : "#f97316";

  return (
    <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: "14px 16px" }}>
      <div style={{ fontSize: 9, letterSpacing: "1.5px", textTransform: "uppercase", color: "rgba(255,255,255,0.45)", fontWeight: 700, marginBottom: 8 }}>{label}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 4 }}>
        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, color: "rgba(255,255,255,0.35)", fontWeight: 700 }}>
          {before ?? "—"}{unit}
        </span>
        <AppIcon name="arrow-right" size={10} color="rgba(255,255,255,0.3)" />
        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 16, color: "#fff", fontWeight: 800 }}>
          {after ?? "—"}{unit}
        </span>
      </div>
      {deltaStr && (
        <div style={{ fontSize: 10, fontWeight: 700, color: col }}>
          {deltaStr}{unit}
        </div>
      )}
    </div>
  );
}

function BigStat({ value, label, color }) {
  return (
    <div style={{ textAlign: "center", padding: "14px 10px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14 }}>
      <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 24, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 9, letterSpacing: "1px", textTransform: "uppercase", color: "rgba(255,255,255,0.4)", fontWeight: 700, marginTop: 4 }}>{label}</div>
    </div>
  );
}

function WeightCurve({ weights }) {
  const vals = weights.map((w) => w.weight);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const range = max - min || 1;
  const W = 560;
  const H = 100;
  const pad = 20;
  const inner = W - pad * 2;
  const toX = (i) => pad + (i / (vals.length - 1)) * inner;
  const toY = (v) => H - 10 - ((v - min) / range) * (H - 20);
  const path = vals.map((v, i) => `${i === 0 ? "M" : "L"} ${toX(i)} ${toY(v)}`).join(" ");
  const area = `${path} L ${toX(vals.length - 1)} ${H - 10} L ${toX(0)} ${H - 10} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} style={{ display: "block" }}>
      <defs>
        <linearGradient id="wcGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#02d1ba" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#02d1ba" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#wcGrad)" />
      <path d={path} fill="none" stroke="#02d1ba" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ filter: "drop-shadow(0 0 6px rgba(2,209,186,0.4))" }} />
      <circle cx={toX(0)} cy={toY(vals[0])} r="4" fill="#02d1ba" opacity="0.5" />
      <circle cx={toX(vals.length - 1)} cy={toY(vals[vals.length - 1])} r="5" fill="#02d1ba" />
      <text x={toX(0)} y={toY(vals[0]) - 8} fill="rgba(255,255,255,0.5)" fontSize="10" textAnchor="middle" fontFamily="'JetBrains Mono',monospace">{vals[0]} kg</text>
      <text x={toX(vals.length - 1)} y={toY(vals[vals.length - 1]) - 8} fill="#02d1ba" fontSize="11" textAnchor="middle" fontWeight="700" fontFamily="'JetBrains Mono',monospace">{vals[vals.length - 1]} kg</text>
    </svg>
  );
}

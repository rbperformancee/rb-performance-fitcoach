import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "../../lib/supabase";
import { periodStart, periodLabel, periodNoun, FREQUENCIES } from "../../lib/checkinPeriod";

/**
 * BilanPhysique — vue coach du bilan physique d'un client.
 *
 *  - Alertes automatiques (bilan en retard, poids stagnant, ressenti bas).
 *  - Évolution : courbes (sparklines) poids + mensurations avec Δ total.
 *  - Réglages : fréquence du bilan + mensurations on/off, par client.
 *  - Comparateur de photos avant/après (période X vs période Y).
 *  - Cartes de bilan avec Δ vs période précédente.
 *  - Annotation : commentaire + statut, visibles par l'athlète.
 */

const G = "#02d1ba";

const MEASURES = [
  { col: "weight", label: "Poids", unit: "kg" },
  { col: "waist_cm", label: "Taille", unit: "cm" },
  { col: "hips_cm", label: "Hanches", unit: "cm" },
  { col: "chest_cm", label: "Poitrine", unit: "cm" },
  { col: "arm_cm", label: "Bras", unit: "cm" },
  { col: "thigh_cm", label: "Cuisse", unit: "cm" },
];

const FEEL_LABELS = { 1: "Très mauvais", 2: "Mauvais", 3: "Correct", 4: "Bon", 5: "Excellent" };
const STRESS_LABELS = { 1: "Zen", 2: "Détendu", 3: "Normal", 4: "Tendu", 5: "Très stressé" };

function fmtNum(n) {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

export default function BilanPhysique({ clientId, checkins, client }) {
  const [rows, setRows] = useState(checkins || []);
  const [measEnabled, setMeasEnabled] = useState(!!client?.checkin_measurements_enabled);
  const [freq, setFreq] = useState(client?.checkin_frequency || "weekly");
  const [savingCfg, setSavingCfg] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);
  const [lightbox, setLightbox] = useState(null);

  useEffect(() => { setRows(checkins || []); }, [checkins]);
  useEffect(() => { setMeasEnabled(!!client?.checkin_measurements_enabled); }, [client?.checkin_measurements_enabled]);
  // Source de vérité des réglages (le prop client peut être stale).
  useEffect(() => {
    if (!clientId) return;
    let cancelled = false;
    supabase.from("clients").select("checkin_measurements_enabled, checkin_frequency").eq("id", clientId).maybeSingle()
      .then(({ data }) => {
        if (cancelled || !data) return;
        setMeasEnabled(!!data.checkin_measurements_enabled);
        setFreq(data.checkin_frequency || "weekly");
      });
    return () => { cancelled = true; };
  }, [clientId]);

  // rows = DESC (récent → ancien). asc = chronologique.
  const asc = useMemo(() => [...rows].reverse(), [rows]);

  // Δ de chaque bilan vs le bilan chronologiquement précédent.
  const deltaFor = (row, col) => {
    const idx = asc.findIndex((r) => r.id === row.id);
    if (idx <= 0) return null;
    const cur = row[col], prev = asc[idx - 1][col];
    if (cur == null || prev == null) return null;
    return cur - prev;
  };

  // Alertes ------------------------------------------------------------
  const alerts = useMemo(() => {
    const out = [];
    if (rows.length === 0) return out;
    if (rows[0].week_start !== periodStart(freq)) {
      out.push({ tone: "warn", text: `Bilan ${periodNoun(freq)} pas encore rempli.` });
    }
    const w = asc.map((r) => r.weight).filter((x) => x != null);
    if (w.length >= 3) {
      const last3 = w.slice(-3);
      if (Math.max(...last3) - Math.min(...last3) <= 0.3) {
        out.push({ tone: "warn", text: "Poids stable sur les 3 derniers bilans — ajuster le plan ?" });
      }
    }
    const low = (col) => rows.length >= 2 && rows[0][col] != null && rows[1][col] != null && rows[0][col] <= 2 && rows[1][col] <= 2;
    if (low("energy_level")) out.push({ tone: "bad", text: "Énergie basse sur les 2 derniers bilans." });
    if (low("motivation_level")) out.push({ tone: "bad", text: "Motivation en baisse sur les 2 derniers bilans." });
    if (rows.length >= 2 && rows[0].stress_level >= 4 && rows[1].stress_level >= 4) {
      out.push({ tone: "bad", text: "Stress élevé sur les 2 derniers bilans." });
    }
    return out;
  }, [rows, asc, freq]);

  // Séries pour les sparklines (chronologiques, valeurs non nulles).
  const series = useMemo(() => {
    return MEASURES.map((m) => {
      const pts = asc.map((r) => r[m.col]).filter((x) => x != null);
      return { ...m, pts };
    }).filter((s) => s.pts.length >= 2);
  }, [asc]);

  const photoRows = rows.filter((r) => Array.isArray(r.photos) && r.photos.length > 0);

  async function saveCfg(patch) {
    setSavingCfg(true);
    const { error } = await supabase.from("clients").update(patch).eq("id", clientId);
    setSavingCfg(false);
    return !error;
  }

  async function toggleMeasurements() {
    const next = !measEnabled;
    setMeasEnabled(next);
    if (!(await saveCfg({ checkin_measurements_enabled: next }))) setMeasEnabled(!next);
  }

  async function changeFreq(next) {
    if (next === freq) return;
    const prev = freq;
    setFreq(next);
    if (!(await saveCfg({ checkin_frequency: next }))) setFreq(prev);
  }

  async function saveAnnotation(rowId, comment, status) {
    const patch = {
      coach_comment: comment.trim() || null,
      coach_status: status || null,
      coach_reviewed_at: new Date().toISOString(),
    };
    const { error } = await supabase.from("weekly_checkins").update(patch).eq("id", rowId);
    if (!error) {
      setRows((prev) => prev.map((r) => (r.id === rowId ? { ...r, ...patch } : r)));
    }
    return !error;
  }

  return (
    <div style={{ marginBottom: 20 }}>
      <SectionLabel>Bilan physique</SectionLabel>

      {/* ALERTES */}
      {alerts.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
          {alerts.map((a, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "8px 11px", borderRadius: 9,
              background: a.tone === "bad" ? "rgba(239,68,68,0.1)" : "rgba(251,191,36,0.1)",
              border: `1px solid ${a.tone === "bad" ? "rgba(239,68,68,0.28)" : "rgba(251,191,36,0.28)"}`,
            }}>
              <span style={{ fontSize: 12 }}>{a.tone === "bad" ? "🔴" : "🟡"}</span>
              <span style={{ fontSize: 11.5, color: a.tone === "bad" ? "#fca5a5" : "#fcd34d", fontWeight: 600 }}>{a.text}</span>
            </div>
          ))}
        </div>
      )}

      {/* RÉGLAGES — fréquence + mensurations */}
      <div style={{
        padding: "11px 12px", marginBottom: 12,
        background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10,
      }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.5)", marginBottom: 7 }}>Fréquence du bilan</div>
        <div style={{ display: "flex", gap: 5, marginBottom: 10 }}>
          {FREQUENCIES.map((f) => (
            <button
              key={f}
              onClick={() => changeFreq(f)}
              disabled={savingCfg}
              style={{
                flex: 1, padding: "7px 4px", borderRadius: 7,
                fontSize: 10.5, fontWeight: 700, cursor: savingCfg ? "wait" : "pointer", fontFamily: "inherit",
                color: freq === f ? "#000" : "rgba(255,255,255,0.6)",
                background: freq === f ? G : "rgba(255,255,255,0.04)",
                border: `1px solid ${freq === f ? "transparent" : "rgba(255,255,255,0.1)"}`,
              }}
            >
              {f === "weekly" ? "Hebdo" : f === "biweekly" ? "2 sem." : "Mensuel"}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, paddingTop: 9, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: "#fff" }}>Demander les mensurations</div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginTop: 1 }}>
              Sinon le bilan se limite au poids + photos.
            </div>
          </div>
          <button
            onClick={toggleMeasurements}
            disabled={savingCfg}
            aria-label="Activer les mensurations"
            style={{
              width: 42, height: 24, borderRadius: 100, flexShrink: 0, position: "relative",
              background: measEnabled ? G : "rgba(255,255,255,0.12)",
              border: "none", cursor: savingCfg ? "wait" : "pointer", transition: "background .15s",
            }}
          >
            <span style={{
              position: "absolute", top: 2, left: measEnabled ? 20 : 2,
              width: 20, height: 20, borderRadius: "50%", background: "#fff",
              transition: "left .15s",
            }} />
          </button>
        </div>
      </div>

      {rows.length === 0 ? (
        <div style={{ textAlign: "center", padding: 18, color: "rgba(255,255,255,0.3)", fontSize: 12 }}>
          Aucun bilan reçu pour l'instant.
        </div>
      ) : (
        <>
          {/* ÉVOLUTION — sparklines */}
          {series.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {series.map((s) => {
                  const first = s.pts[0], last = s.pts[s.pts.length - 1];
                  return (
                    <div key={s.col} style={{
                      padding: "10px 12px", background: "rgba(255,255,255,0.025)",
                      border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10,
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: "rgba(255,255,255,0.4)" }}>{s.label}</span>
                        <Delta v={last - first} unit={s.unit} />
                      </div>
                      <Sparkline values={s.pts} />
                      <div style={{ fontSize: 13, fontWeight: 800, color: "#fff", fontFamily: "'JetBrains Mono', monospace", marginTop: 4 }}>
                        {fmtNum(last)}<span style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", marginLeft: 3 }}>{s.unit}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* COMPARATEUR PHOTOS */}
          {photoRows.length >= 2 && (
            <button
              onClick={() => setCompareOpen(true)}
              style={{
                width: "100%", marginBottom: 12, padding: "10px 14px",
                background: "rgba(2,209,186,0.08)", border: "1px solid rgba(2,209,186,0.28)",
                borderRadius: 10, color: G, fontSize: 12, fontWeight: 700,
                cursor: "pointer", fontFamily: "inherit",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={G} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <line x1="12" y1="3" x2="12" y2="21" />
              </svg>
              Comparer les photos avant / après
            </button>
          )}

          {/* CARTES DE BILAN */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {rows.slice(0, 8).map((c) => (
              <BilanCard
                key={c.id}
                row={c}
                freq={freq}
                measEnabled={measEnabled}
                deltaFor={deltaFor}
                onSaveAnnotation={saveAnnotation}
                onOpenPhoto={setLightbox}
              />
            ))}
          </div>
        </>
      )}

      {compareOpen && (
        <PhotoCompare rows={photoRows} freq={freq} onClose={() => setCompareOpen(false)} onOpenPhoto={setLightbox} />
      )}
      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          style={{ position: "fixed", inset: 0, zIndex: 1500, background: "rgba(0,0,0,0.94)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
        >
          <img src={lightbox} alt="" style={{ maxWidth: "100%", maxHeight: "100%", borderRadius: 12 }} />
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- */

function SectionLabel({ children }) {
  return (
    <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: 10 }}>
      {children}
    </div>
  );
}

function Delta({ v, unit }) {
  if (v == null || Math.abs(v) < 0.05) {
    return <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", fontFamily: "'JetBrains Mono', monospace" }}>—</span>;
  }
  const up = v > 0;
  return (
    <span style={{ fontSize: 10, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: up ? "#fbbf24" : "#34d399" }}>
      {up ? "▲" : "▼"} {up ? "+" : ""}{fmtNum(v)}{unit ? " " + unit : ""}
    </span>
  );
}

function Sparkline({ values }) {
  const w = 100, h = 26, pad = 3;
  const min = Math.min(...values), max = Math.max(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * (w - 2 * pad);
    const y = pad + (1 - (v - min) / span) * (h - 2 * pad);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const last = pts[pts.length - 1].split(",");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none" style={{ display: "block" }}>
      <polyline points={pts.join(" ")} fill="none" stroke={G} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={last[0]} cy={last[1]} r="2.4" fill={G} />
    </svg>
  );
}

function BilanCard({ row, freq, measEnabled, deltaFor, onSaveAnnotation, onOpenPhoto }) {
  const [editing, setEditing] = useState(false);
  const [comment, setComment] = useState(row.coach_comment || "");
  const [status, setStatus] = useState(row.coach_status || null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { setComment(row.coach_comment || ""); setStatus(row.coach_status || null); }, [row.id]);

  const cols = measEnabled ? MEASURES : MEASURES.slice(0, 1);
  const measureVals = cols.filter((m) => row[m.col] != null);

  const ressentis = [
    row.energy_level != null && { l: "Énergie", v: row.energy_level, lbl: FEEL_LABELS[row.energy_level] },
    row.sleep_quality != null && { l: "Sommeil", v: row.sleep_quality, lbl: FEEL_LABELS[row.sleep_quality] },
    row.stress_level != null && { l: "Stress", v: row.stress_level, lbl: STRESS_LABELS[row.stress_level] },
    row.motivation_level != null && { l: "Motivation", v: row.motivation_level, lbl: FEEL_LABELS[row.motivation_level] },
  ].filter(Boolean);

  const photos = Array.isArray(row.photos) ? row.photos : [];

  async function save() {
    setSaving(true);
    const ok = await onSaveAnnotation(row.id, comment, status);
    setSaving(false);
    if (ok) setEditing(false);
  }

  return (
    <div style={{ padding: "12px 14px", background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#fff", textTransform: "capitalize" }}>{periodLabel(freq, row.week_start)}</div>
        {status && (
          <span style={{
            fontSize: 8, fontWeight: 800, letterSpacing: 0.8, textTransform: "uppercase",
            padding: "2px 7px", borderRadius: 5,
            color: status === "validated" ? "#34d399" : "#fbbf24",
            background: status === "validated" ? "rgba(52,211,153,0.12)" : "rgba(251,191,36,0.12)",
            border: `1px solid ${status === "validated" ? "rgba(52,211,153,0.3)" : "rgba(251,191,36,0.3)"}`,
          }}>
            {status === "validated" ? "Validé" : "À surveiller"}
          </span>
        )}
      </div>

      {/* Mesures + Δ */}
      {measureVals.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 14px", marginBottom: 8 }}>
          {measureVals.map((m) => {
            const d = deltaFor(row, m.col);
            return (
              <span key={m.col} style={{ fontSize: 11, color: "rgba(255,255,255,0.7)", fontFamily: "'JetBrains Mono', monospace" }}>
                {m.label} {fmtNum(row[m.col])}{m.unit}
                {d != null && Math.abs(d) >= 0.05 && (
                  <span style={{ marginLeft: 4, color: d > 0 ? "#fbbf24" : "#34d399", fontWeight: 700 }}>
                    {d > 0 ? "▲+" : "▼"}{fmtNum(d)}
                  </span>
                )}
              </span>
            );
          })}
        </div>
      )}

      {/* Ressentis */}
      {ressentis.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: photos.length || row.note ? 8 : 0 }}>
          {ressentis.map((r, i) => (
            <span key={i} style={{
              padding: "2px 8px",
              background: r.v >= 4 ? "rgba(52,211,153,0.12)" : r.v <= 2 ? "rgba(239,68,68,0.12)" : "rgba(251,191,36,0.12)",
              border: `1px solid ${r.v >= 4 ? "rgba(52,211,153,0.3)" : r.v <= 2 ? "rgba(239,68,68,0.3)" : "rgba(251,191,36,0.3)"}`,
              borderRadius: 6, fontSize: 9, fontWeight: 700, letterSpacing: "0.8px", textTransform: "uppercase",
              color: r.v >= 4 ? "#34d399" : r.v <= 2 ? "#ef4444" : "#fbbf24",
            }}>
              {r.l} {r.v}/5
            </span>
          ))}
        </div>
      )}

      {/* Photos */}
      {photos.length > 0 && (
        <div style={{ display: "flex", gap: 6, marginBottom: row.note ? 8 : 0 }}>
          {photos.map((p, i) => (
            <button key={i} onClick={() => onOpenPhoto(p.url)} style={{ padding: 0, border: "none", background: "none", cursor: "pointer" }}>
              <img src={p.url} alt={p.pose} loading="lazy"
                style={{ width: 56, height: 72, objectFit: "cover", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)" }} />
            </button>
          ))}
        </div>
      )}

      {/* Note du client */}
      {row.note && (
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.65)", lineHeight: 1.5, fontStyle: "italic" }}>
          « {row.note} »
        </div>
      )}

      {/* Annotation coach */}
      <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        {!editing ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <div style={{ fontSize: 11, color: row.coach_comment ? "rgba(2,209,186,0.85)" : "rgba(255,255,255,0.3)", fontStyle: row.coach_comment ? "italic" : "normal", minWidth: 0 }}>
              {row.coach_comment ? "↳ " + row.coach_comment : "Pas encore annoté"}
            </div>
            <button onClick={() => setEditing(true)} style={{
              flexShrink: 0, fontSize: 10, fontWeight: 700, color: G,
              background: "rgba(2,209,186,0.08)", border: "1px solid rgba(2,209,186,0.25)",
              borderRadius: 7, padding: "5px 10px", cursor: "pointer", fontFamily: "inherit",
            }}>
              {row.coach_comment ? "Modifier" : "Annoter"}
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Retour pour l'athlète — visible dans son prochain bilan."
              rows={2}
              style={{
                width: "100%", padding: "9px 11px", background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.1)", borderRadius: 9, color: "#fff",
                fontSize: 12.5, fontFamily: "inherit", resize: "none", outline: "none", boxSizing: "border-box",
              }}
            />
            <div style={{ display: "flex", gap: 6 }}>
              {[
                { v: "validated", label: "Validé" },
                { v: "watch", label: "À surveiller" },
              ].map((o) => (
                <button key={o.v} onClick={() => setStatus(status === o.v ? null : o.v)} style={{
                  flex: 1, fontSize: 10, fontWeight: 700, padding: "7px 0", borderRadius: 7, cursor: "pointer", fontFamily: "inherit",
                  color: status === o.v ? "#000" : "rgba(255,255,255,0.6)",
                  background: status === o.v ? (o.v === "validated" ? "#34d399" : "#fbbf24") : "rgba(255,255,255,0.04)",
                  border: `1px solid ${status === o.v ? "transparent" : "rgba(255,255,255,0.1)"}`,
                }}>
                  {o.label}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={() => setEditing(false)} style={{
                fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.5)", padding: "8px 14px",
                background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 8, cursor: "pointer", fontFamily: "inherit",
              }}>Annuler</button>
              <button onClick={save} disabled={saving} style={{
                flex: 1, fontSize: 11, fontWeight: 800, color: "#000", padding: "8px 14px",
                background: G, border: "none", borderRadius: 8, cursor: saving ? "wait" : "pointer",
                fontFamily: "inherit", letterSpacing: 0.4, textTransform: "uppercase",
              }}>{saving ? "…" : "Enregistrer"}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PhotoCompare({ rows, freq, onClose, onOpenPhoto }) {
  // rows = DESC. Par défaut : A = plus ancien, B = plus récent.
  const [aIdx, setAIdx] = useState(rows.length - 1);
  const [bIdx, setBIdx] = useState(0);
  const a = rows[aIdx], b = rows[bIdx];
  const poseUrl = (row, pose) => (row.photos || []).find((p) => p.pose === pose)?.url;
  const POSE_LIST = [
    { key: "face", label: "Face" },
    { key: "profil", label: "Profil" },
    { key: "dos", label: "Dos" },
  ];

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: "fixed", inset: 0, zIndex: 1400, background: "rgba(0,0,0,0.92)", backdropFilter: "blur(12px)", display: "flex", alignItems: "flex-end", justifyContent: "center", fontFamily: "-apple-system,'Inter',sans-serif" }}
    >
      <div style={{ background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "20px 20px 0 0", maxWidth: 480, width: "100%", maxHeight: "92vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ padding: "18px 20px 14px", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: "#fff" }}>Comparateur photos</div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 9, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.6)", fontSize: 15, cursor: "pointer" }}>×</button>
        </div>
        <div style={{ padding: "14px 20px 24px", overflowY: "auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
            <WeekSelect rows={rows} freq={freq} value={aIdx} onChange={setAIdx} label="Avant" />
            <WeekSelect rows={rows} freq={freq} value={bIdx} onChange={setBIdx} label="Après" />
          </div>
          {POSE_LIST.map((pose) => {
            const ua = poseUrl(a, pose.key), ub = poseUrl(b, pose.key);
            if (!ua && !ub) return null;
            return (
              <div key={pose.key} style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: 1.5, textTransform: "uppercase", color: "rgba(255,255,255,0.4)", marginBottom: 6 }}>{pose.label}</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <ComparePhoto url={ua} onOpen={onOpenPhoto} />
                  <ComparePhoto url={ub} onOpen={onOpenPhoto} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function WeekSelect({ rows, freq, value, onChange, label }) {
  return (
    <label style={{ display: "block" }}>
      <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: 1.5, textTransform: "uppercase", color: G, marginBottom: 5 }}>{label}</div>
      <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{
          width: "100%", padding: "9px 10px", background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.12)", borderRadius: 9, color: "#fff",
          fontSize: 12, fontFamily: "inherit", outline: "none",
        }}
      >
        {rows.map((r, i) => (
          <option key={r.id} value={i} style={{ background: "#0a0a0a" }}>
            {periodLabel(freq, r.week_start)}
          </option>
        ))}
      </select>
    </label>
  );
}

function ComparePhoto({ url, onOpen }) {
  if (!url) {
    return (
      <div style={{ aspectRatio: "3 / 4", borderRadius: 10, background: "rgba(255,255,255,0.03)", border: "1px dashed rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "rgba(255,255,255,0.3)" }}>
        Pas de photo
      </div>
    );
  }
  return (
    <button onClick={() => onOpen(url)} style={{ padding: 0, border: "none", background: "none", cursor: "pointer" }}>
      <img src={url} alt="" loading="lazy"
        style={{ width: "100%", aspectRatio: "3 / 4", objectFit: "cover", borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)", display: "block" }} />
    </button>
  );
}

import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import EmptyState from "./EmptyState";
import Spinner from "./Spinner";
import haptic from "../lib/haptic";
import { useScheduledRuns } from "../hooks/useScheduledRuns";
import { useT, getLocale } from "../lib/i18n";

const intlLocale = () => getLocale() === "en" ? "en-US" : "fr-FR";

const GREEN = "#34d399";
const RED = "#ef4444";

export default function MovePage({ client, appData }) {
  const t = useT();
  const [runs, setRuns] = useState(appData?.runs || []);
  const [weekRuns, setWeekRuns] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [loading, setLoading] = useState(!appData || appData.loading);
  const [form, setForm] = useState({ distance: "", heures: "0", minutes: "", note: "" });
  const [saving, setSaving] = useState(false);
  // Run prescrit en cours de log (pre-remplit le form + tag programme)
  const [pendingPrescribed, setPendingPrescribed] = useState(null);

  // Runs prescrits par le coach pour la semaine en cours
  const scheduled = useScheduledRuns(client?.id);

  const today = new Date().toISOString().split("T")[0];

  const fetchAll = useCallback(async () => {
    if (!client?.id) return;
    setLoading(true);
    const runsRes = await supabase.from("run_logs").select("*").eq("client_id", client.id).order("date", { ascending: false }).limit(10);
    setRuns(runsRes.data || []);

    // Calcul km cette semaine
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekData = (runsRes.data || []).filter(r => new Date(r.date) >= weekAgo);
    setWeekRuns(weekData);
    setLoading(false);
  }, [client?.id, today]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const addRun = async () => {
    const dist = parseFloat(form.distance) || 0;
    const totalMin = (parseInt(form.heures, 10) || 0) * 60 + (parseInt(form.minutes, 10) || 0);
    // Au moins une metrique requise (distance OU duree)
    if (dist <= 0 && totalMin <= 0) return;
    // Bornes superieures realistes (200 km / 10 h)
    if (dist > 200 || totalMin > 600) {
      try {
        const { toast } = await import("./Toast");
        toast.error("Valeurs irréalistes");
      } catch (_) {
        alert("Valeurs irréalistes");
      }
      return;
    }
    setSaving(true);
    // Allure calculee uniquement si distance + duree fournies
    let allure = null;
    if (dist > 0 && totalMin > 0) {
      const allureTotalSec = Math.round((totalMin / dist) * 60);
      const allureMin = Math.floor(allureTotalSec / 60);
      const allureSec = allureTotalSec % 60;
      allure = `${allureMin}:${String(allureSec).padStart(2, "0")}`;
    }

    // Si on log un run prescrit, on tag avec le programme + cibles
    const prescribedFields = pendingPrescribed ? {
      programme_id: scheduled.programmeId,
      programme_week: scheduled.viewWeek,
      programme_session: pendingPrescribed.sessionIndex,
      programme_run_index: pendingPrescribed.runIndex,
      target_label: pendingPrescribed.name,
      target_distance: pendingPrescribed.distance,
      target_duration: pendingPrescribed.duration,
      target_bpm: pendingPrescribed.bpm,
    } : {};

    const wasPrescribed = !!pendingPrescribed;
    const insertPayload = {
      client_id: client.id,
      date: today,
      distance_km: dist > 0 ? dist : null,
      duree_min: totalMin > 0 ? totalMin : null,
      allure_min_km: allure,
      note: form.note || "",
      ...prescribedFields,
    };

    const { data, error } = await supabase.from("run_logs").insert(insertPayload).select().single();

    if (error) {
      console.error("[run-log] insert failed", error, insertPayload);
      setSaving(false);
      // toast d'erreur via window pour eviter import circulaire
      try {
        const { toast } = await import("./Toast");
        toast.error("Erreur enregistrement : " + (error.message || error.code || "inconnue"));
      } catch (_) {
        alert("Erreur enregistrement : " + (error.message || "inconnue"));
      }
      return;
    }

    if (data) setRuns(prev => [data, ...prev]);
    setForm({ distance: "", heures: "0", minutes: "", note: "" });
    setShowAdd(false);
    setPendingPrescribed(null);
    setSaving(false);
    haptic.success();

    // Si run prescrit : refresh le hook pour marquer "fait"
    if (wasPrescribed) {
      await scheduled.refresh();
    }

    // Log XP dans session_logs pour que useXP le compte.
    // Si pas de distance fournie : on n'append pas le suffixe "· 0 km".
    const sessionName = dist > 0
      ? `${t("move.run_session_label")} · ${dist} km`
      : t("move.run_session_label");
    await supabase.from("session_logs").insert({
      client_id: client.id,
      session_name: sessionName,
      programme_name: wasPrescribed ? "Move" : null,
      logged_at: new Date().toISOString(),
    }).then(() => {});
  };

  // Ouvre le formulaire pre-rempli avec un run prescrit
  const startPrescribed = (run) => {
    haptic.selection();
    // Tente de pre-remplir distance + duree depuis les cibles
    const distMatch = run.distance?.match(/(\d+(?:[.,]\d+)?)/);
    const durMatch = run.duration?.match(/(\d+)\s*h\s*(\d+)?|(\d+)\s*min/i);
    let h = "0", m = "";
    if (durMatch) {
      if (durMatch[1]) { h = durMatch[1]; m = durMatch[2] || "0"; }
      else if (durMatch[3]) { m = durMatch[3]; }
    }
    setForm({
      distance: distMatch ? distMatch[1].replace(",", ".") : "",
      heures: h,
      minutes: m,
      note: "",
    });
    setPendingPrescribed(run);
    setShowAdd(true);
  };

  const weekKm = weekRuns.reduce((a, r) => a + (r.distance_km || 0), 0);
  const avgAllure = runs.length > 0 ? runs[0].allure_min_km : "--";

  const getWeekBars = () => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split("T")[0];
      const label = ["D","L","M","M","J","V","S"][d.getDay()];
      const run = runs.find(r => r.date === key);
      days.push({ label, km: run?.distance_km || 0, isToday: key === today });
    }
    return days;
  };

  if (loading) return (
    <div style={{ minHeight: "100dvh", background: "#050505", padding: "0px 24px" }}>
      {[80, 60, 140, 100].map((h, i) => (
        <div key={i} className="skeleton" style={{ height: h, borderRadius: 16, marginBottom: 16 }} />
      ))}
    </div>
  );

  const bars = getWeekBars();
  const maxKm = Math.max(...bars.map(b => b.km), 1);

  return (
    <div style={{ minHeight: "100dvh", background: "#050505", fontFamily: "-apple-system,Inter,sans-serif", color: "#fff", paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 180px)", opacity: loading ? 0 : 1, transition: "opacity 0.4s ease" }}>

      {/* Ambient */}
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, height: "40%", background: "radial-gradient(ellipse at 50% 0%, rgba(239,68,68,0.09) 0%, transparent 55%)", pointerEvents: "none", zIndex: 0 }} />

      <div style={{ position: "relative", zIndex: 1 }}>

        {/* HERO */}
        <div style={{ padding: "8px 24px 0" }}>
          <div style={{ fontSize: 10, color: "rgba(239,68,68,0.55)", letterSpacing: "3px", textTransform: "uppercase", marginBottom: 10 }}>{t("move.activity")}</div>
          <div style={{ fontSize: 52, fontWeight: 800, color: "#fff", letterSpacing: "-3px", lineHeight: 0.92, marginBottom: 10 }}>Run<span style={{ color: RED }}>.</span></div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.2)", fontStyle: "italic" }}>
            {new Date().toLocaleDateString(intlLocale(), { weekday: "long", day: "numeric", month: "long" })}
          </div>
        </div>

        {/* Pas du jour : deplaces vers la page Body (metrique corporelle quotidienne).
            Run reste focus sur la course : km, allure, sorties, prescript coach. */}

        {/* STATS TESLA */}
        <div style={{ padding: "0 24px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", marginBottom: 4 }}>
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 14, paddingRight: 8 }}>
            <div style={{ fontSize: 26, fontWeight: 200, color: RED, letterSpacing: "-1.5px", lineHeight: 1 }}>{weekKm.toFixed(1)}<span style={{ fontSize: 12, color: "rgba(255,255,255,0.2)" }}>km</span></div>
            <div style={{ fontSize: 9, color: "rgba(255,255,255,0.18)", letterSpacing: "2px", textTransform: "uppercase", marginTop: 5 }}>{t("move.this_week")}</div>
          </div>
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 14, paddingRight: 8 }}>
            <div style={{ fontSize: 26, fontWeight: 200, color: "rgba(239,68,68,0.6)", letterSpacing: "-1.5px", lineHeight: 1 }}>{avgAllure}<span style={{ fontSize: 12, color: "rgba(255,255,255,0.2)" }}>/km</span></div>
            <div style={{ fontSize: 9, color: "rgba(255,255,255,0.18)", letterSpacing: "2px", textTransform: "uppercase", marginTop: 5 }}>{t("move.avg_pace")}</div>
          </div>
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 14 }}>
            <div style={{ fontSize: 26, fontWeight: 200, color: "rgba(239,68,68,0.4)", letterSpacing: "-1.5px", lineHeight: 1 }}>{weekRuns.length}<span style={{ fontSize: 12, color: "rgba(255,255,255,0.2)" }}> {t("move.runs_unit")}</span></div>
            <div style={{ fontSize: 9, color: "rgba(255,255,255,0.18)", letterSpacing: "2px", textTransform: "uppercase", marginTop: 5 }}>{t("move.this_week")}</div>
          </div>
        </div>

        {/* DIVIDER */}
        <div style={{ height: 1, background: "linear-gradient(90deg, rgba(239,68,68,0.3) 0%, rgba(255,255,255,0.04) 100%)", margin: "20px 24px" }} />

        {/* PRESCRITS PAR LE COACH — skeleton reserve pendant le chargement
            pour eviter le layout shift d'1s quand les runs apparaissent. */}
        {scheduled.loading && (
          <div style={{ padding: "0 24px", marginBottom: 28 }}>
            <div className="skeleton" style={{ height: 18, width: 180, marginBottom: 10, borderRadius: 6 }} />
            <div className="skeleton" style={{ height: 32, width: "100%", marginBottom: 16, borderRadius: 8 }} />
            <div className="skeleton" style={{ height: 80, width: "100%", borderRadius: 14, marginBottom: 10 }} />
            <div className="skeleton" style={{ height: 80, width: "100%", borderRadius: 14 }} />
          </div>
        )}
        {/* Variante compacte : aucun run prescrit cette semaine — on n'inflige
            pas un grand bloc vide. Une ligne avec navigation hebdo suffit. */}
        {!scheduled.loading && scheduled.totalWeeks > 0 && scheduled.runs.length === 0 && (
          <div style={{ padding: "0 24px", marginBottom: 20 }}>
            <div style={{ fontSize: 9, color: "rgba(2,209,186,0.7)", letterSpacing: "3px", textTransform: "uppercase", fontWeight: 800, marginBottom: 8 }}>{t("move.coach_prescribed")}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 12 }}>
              {scheduled.totalWeeks > 1 && (
                <button
                  onClick={() => scheduled.canGoPrev && scheduled.setViewWeek(scheduled.viewWeek - 1)}
                  disabled={!scheduled.canGoPrev}
                  aria-label="Semaine precedente"
                  style={{ width: 24, height: 24, borderRadius: 100, background: "transparent", border: "1px solid rgba(255,255,255,0.08)", color: scheduled.canGoPrev ? "#fff" : "rgba(255,255,255,0.18)", cursor: scheduled.canGoPrev ? "pointer" : "not-allowed", flexShrink: 0, fontFamily: "inherit", fontSize: 12, lineHeight: 1, padding: 0 }}
                >‹</button>
              )}
              <div style={{ flex: 1, minWidth: 0, fontSize: 12, lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                <span style={{ color: "#fff", fontWeight: 700 }}>{t("move.week_label")} {scheduled.viewWeek}<span style={{ color: "rgba(255,255,255,0.3)", fontWeight: 400 }}>/{scheduled.totalWeeks}</span></span>
                <span style={{ marginLeft: 8, color: "rgba(255,255,255,0.35)", fontStyle: "italic" }}>— aucun run prescrit</span>
              </div>
              {scheduled.totalWeeks > 1 && (
                <button
                  onClick={() => scheduled.canGoNext && scheduled.setViewWeek(scheduled.viewWeek + 1)}
                  disabled={!scheduled.canGoNext}
                  aria-label="Semaine suivante"
                  style={{ width: 24, height: 24, borderRadius: 100, background: "transparent", border: "1px solid rgba(255,255,255,0.08)", color: scheduled.canGoNext ? "#fff" : "rgba(255,255,255,0.18)", cursor: scheduled.canGoNext ? "pointer" : "not-allowed", flexShrink: 0, fontFamily: "inherit", fontSize: 12, lineHeight: 1, padding: 0 }}
                >›</button>
              )}
            </div>
          </div>
        )}

        {!scheduled.loading && scheduled.totalWeeks > 0 && scheduled.runs.length > 0 && (
          <div style={{ padding: "0 24px", marginBottom: 28 }}>
            {/* Header + week selector */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 9, color: "rgba(2,209,186,0.7)", letterSpacing: "3px", textTransform: "uppercase", fontWeight: 800, marginBottom: 8 }}>{t("move.coach_prescribed")}</div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
                  <button
                    onClick={() => scheduled.canGoPrev && scheduled.setViewWeek(scheduled.viewWeek - 1)}
                    disabled={!scheduled.canGoPrev}
                    aria-label="Semaine precedente"
                    style={{
                      width: 32, height: 32, borderRadius: 100,
                      background: scheduled.canGoPrev ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.02)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      color: scheduled.canGoPrev ? "#fff" : "rgba(255,255,255,0.2)",
                      cursor: scheduled.canGoPrev ? "pointer" : "not-allowed",
                      flexShrink: 0, fontFamily: "inherit", fontSize: 14, lineHeight: 1,
                    }}
                  >‹</button>
                  <div style={{ minWidth: 0, flex: 1, textAlign: "center" }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", letterSpacing: "-0.04em", lineHeight: 1 }}>
                      {t("move.week_label")} {scheduled.viewWeek}<span style={{ color: "rgba(255,255,255,0.25)", fontWeight: 400 }}> / {scheduled.totalWeeks}</span>
                    </div>
                    {scheduled.viewWeek !== scheduled.currentWeek && (
                      <button
                        onClick={() => scheduled.setViewWeek(scheduled.currentWeek)}
                        style={{ marginTop: 4, fontSize: 10, color: "rgba(2,209,186,0.7)", background: "transparent", border: "none", padding: 0, cursor: "pointer", fontFamily: "inherit", letterSpacing: "1.5px", textTransform: "uppercase" }}
                      >{t("move.today_link")}</button>
                    )}
                  </div>
                  <button
                    onClick={() => scheduled.canGoNext && scheduled.setViewWeek(scheduled.viewWeek + 1)}
                    disabled={!scheduled.canGoNext}
                    aria-label="Semaine suivante"
                    style={{
                      width: 32, height: 32, borderRadius: 100,
                      background: scheduled.canGoNext ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.02)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      color: scheduled.canGoNext ? "#fff" : "rgba(255,255,255,0.2)",
                      cursor: scheduled.canGoNext ? "pointer" : "not-allowed",
                      flexShrink: 0, fontFamily: "inherit", fontSize: 14, lineHeight: 1,
                    }}
                  >›</button>
                </div>
              </div>
              {/* Progress bar */}
              {scheduled.runs.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5, fontSize: 10, color: "rgba(255,255,255,0.4)", letterSpacing: "1px" }}>
                    <span>{scheduled.runs.filter(r => r.done).length}/{scheduled.runs.length} {t("move.runs_count")}</span>
                    <span style={{ color: "rgba(2,209,186,0.7)", fontWeight: 700 }}>
                      {Math.round((scheduled.runs.filter(r => r.done).length / scheduled.runs.length) * 100)}%
                    </span>
                  </div>
                  <div style={{ height: 3, background: "rgba(255,255,255,0.05)", borderRadius: 2, overflow: "hidden" }}>
                    <div style={{
                      height: "100%",
                      width: `${(scheduled.runs.filter(r => r.done).length / scheduled.runs.length) * 100}%`,
                      background: "linear-gradient(90deg, #02d1ba, rgba(2,209,186,0.5))",
                      transition: "width 0.6s cubic-bezier(.4,1.6,.5,1)",
                    }} />
                  </div>
                </div>
              )}
            </div>

            {/* Liste des runs prescrits */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {scheduled.runs.map((r, i) => {
                  const accent = r.done ? "rgba(2,209,186,0.6)" : RED;
                  return (
                    <button
                      key={i}
                      onClick={() => !r.done && startPrescribed(r)}
                      disabled={r.done}
                      style={{
                        width: "100%", textAlign: "left",
                        background: r.done ? "rgba(2,209,186,0.04)" : "rgba(255,255,255,0.025)",
                        border: `1px solid ${r.done ? "rgba(2,209,186,0.22)" : "rgba(255,255,255,0.07)"}`,
                        borderLeft: `3px solid ${accent}`,
                        borderRadius: 14,
                        padding: "14px 16px",
                        cursor: r.done ? "default" : "pointer",
                        fontFamily: "inherit",
                        color: "#fff",
                        position: "relative", overflow: "hidden",
                        transition: "border-color .15s, background .15s, transform .15s",
                      }}
                      onMouseEnter={(e) => { if (!r.done) e.currentTarget.style.transform = "translateY(-1px)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; }}
                    >
                      {/* Header : nom + statut */}
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 6 }}>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontSize: 16, fontWeight: 800, color: r.done ? "rgba(255,255,255,0.55)" : "#fff", letterSpacing: "-0.02em", lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {r.name}
                          </div>
                          {r.sessionName && (
                            <div style={{ marginTop: 3, fontSize: 9, color: "rgba(255,255,255,0.3)", letterSpacing: "1.5px", textTransform: "uppercase", fontWeight: 700 }}>
                              {r.sessionName}
                            </div>
                          )}
                        </div>
                        <div style={{
                          flexShrink: 0,
                          fontSize: 9, fontWeight: 800, letterSpacing: "1.5px", textTransform: "uppercase",
                          padding: "4px 10px", borderRadius: 100,
                          background: r.done ? "rgba(2,209,186,0.12)" : "rgba(239,68,68,0.08)",
                          color: r.done ? "#02d1ba" : RED,
                          border: `1px solid ${r.done ? "rgba(2,209,186,0.25)" : "rgba(239,68,68,0.2)"}`,
                          display: "inline-flex", alignItems: "center", gap: 4,
                        }}>
                          {r.done ? "✓" : "●"} {r.done ? t("move.done") : t("move.todo")}
                        </div>
                      </div>

                      {/* Targets — chips compactes premium */}
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                        {r.distance && (
                          <span style={chipStyle}>
                            <span style={chipLabel}>{t("move.distance")}</span>
                            <span style={chipVal}>{r.distance}</span>
                          </span>
                        )}
                        {r.duration && (
                          <span style={chipStyle}>
                            <span style={chipLabel}>{t("move.duration")}</span>
                            <span style={chipVal}>{r.duration}</span>
                          </span>
                        )}
                        {r.bpm && (
                          <span style={chipStyle}>
                            <span style={chipLabel}>{t("move.bpm")}</span>
                            <span style={chipVal}>{r.bpm}</span>
                          </span>
                        )}
                        {r.rest && (
                          <span style={chipStyle}>
                            <span style={chipLabel}>{t("move.rest")}</span>
                            <span style={chipVal}>{r.rest}</span>
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
            </div>

            {/* CTA Valider la semaine — visible uniquement quand semaine terminee + sur la viewWeek = currentWeek + pas la derniere */}
            {scheduled.weekFullyDone
              && scheduled.runs.length > 0
              && scheduled.viewWeek === scheduled.currentWeek
              && scheduled.viewWeek > scheduled.validatedUntilWeek
              && scheduled.viewWeek < scheduled.totalWeeks && (
              <button
                onClick={async () => {
                  haptic.success();
                  const ok = await scheduled.validateWeek(scheduled.viewWeek);
                  if (ok) {
                    // Le hook bump viewWeek vers la semaine suivante automatiquement
                  }
                }}
                style={{
                  width: "100%", marginTop: 14,
                  padding: "16px 20px",
                  background: "linear-gradient(135deg, #02d1ba 0%, #0891b2 100%)",
                  border: "none",
                  borderRadius: 14,
                  color: "#000",
                  fontSize: 14, fontWeight: 800,
                  letterSpacing: "0.5px", textTransform: "uppercase",
                  cursor: "pointer",
                  boxShadow: "0 12px 32px rgba(2,209,186,0.3)",
                  fontFamily: "inherit",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                }}
              >
                🎉 {t("move.validate_week")} {scheduled.viewWeek}
                <span style={{ fontSize: 16, lineHeight: 1 }}>→</span>
              </button>
            )}

            {/* Etat "semaine deja validee" — feedback subtil */}
            {scheduled.viewWeek <= scheduled.validatedUntilWeek && (
              <div style={{ marginTop: 14, padding: "10px 14px", background: "rgba(2,209,186,0.06)", border: "1px solid rgba(2,209,186,0.2)", borderRadius: 12, fontSize: 11, color: "rgba(2,209,186,0.8)", fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
                ✓ {t("move.week_validated")}
              </div>
            )}

            {/* Programme termine */}
            {scheduled.viewWeek === scheduled.totalWeeks
              && scheduled.weekFullyDone
              && scheduled.runs.length > 0
              && scheduled.validatedUntilWeek >= scheduled.totalWeeks - 1 && (
              <button
                onClick={async () => { haptic.success(); await scheduled.validateWeek(scheduled.totalWeeks); }}
                disabled={scheduled.validatedUntilWeek >= scheduled.totalWeeks}
                style={{
                  width: "100%", marginTop: 14,
                  padding: "16px 20px",
                  background: "linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)",
                  border: "none", borderRadius: 14, color: "#000",
                  fontSize: 14, fontWeight: 800, letterSpacing: "0.5px", textTransform: "uppercase",
                  cursor: "pointer", boxShadow: "0 12px 32px rgba(251,191,36,0.3)",
                  fontFamily: "inherit",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                  opacity: scheduled.validatedUntilWeek >= scheduled.totalWeeks ? 0.6 : 1,
                }}
              >
                {scheduled.validatedUntilWeek >= scheduled.totalWeeks
                  ? `🏆 ${t("move.programme_done")}`
                  : `🏆 ${t("move.finish_programme")}`}
              </button>
            )}
          </div>
        )}

        {/* RECORD PERSONNEL */}
        {(() => {
          if (runs.length === 0) return null;
          const allures = runs.filter(r => r.allure_min_km && r.allure_min_km !== "--").map(r => {
            const [m, s] = r.allure_min_km.split(":").map(Number);
            return { sec: m * 60 + s, run: r };
          });
          if (allures.length === 0) return null;
          const best = allures.reduce((a, b) => a.sec < b.sec ? a : b);
          const last = allures[0];
          const lastSec = last.sec;
          const bestSec = best.sec;
          const pct = Math.min(Math.round((bestSec / lastSec) * 100), 100);
          const isRecord = last.run.id === best.run.id;
          const bestMin = Math.floor(bestSec / 60);
          const bestS = String(bestSec % 60).padStart(2, "0");
          return (
            <div style={{ padding: "0 24px", marginBottom: 20 }}>
              <div style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${isRecord ? "rgba(239,68,68,0.4)" : "rgba(255,255,255,0.07)"}`, borderRadius: 20, padding: 20, position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", top: -30, right: -30, width: 100, height: 100, background: "radial-gradient(circle, rgba(239,68,68,0.08) 0%, transparent 70%)", pointerEvents: "none" }} />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                  <div>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", letterSpacing: "2px", textTransform: "uppercase", marginBottom: 6 }}>{t("move.personal_record")}</div>
                    <div style={{ fontSize: 44, fontWeight: 100, color: RED, letterSpacing: "-2px", lineHeight: 1 }}>{bestMin}:{bestS}<span style={{ fontSize: 14, color: "rgba(255,255,255,0.2)" }}> min/km</span></div>
                  </div>
                  {isRecord && (
                    <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 100, padding: "6px 14px", fontSize: 11, color: RED, fontWeight: 700, flexShrink: 0 }}>{t("move.new_excl")}</div>
                  )}
                </div>
                <div style={{ marginBottom: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.2)" }}>{t("move.last_vs_record")}</div>
                    <div style={{ fontSize: 11, color: pct >= 95 ? RED : "rgba(255,255,255,0.3)", fontWeight: 600 }}>{pct}%</div>
                  </div>
                  <div style={{ height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 2 }}>
                    <div style={{ height: "100%", width: pct + "%", background: pct >= 95 ? RED : "rgba(239,68,68,0.4)", borderRadius: 2, transition: "width 0.8s ease" }} />
                  </div>
                </div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", fontStyle: "italic" }}>
                  {isRecord ? t("move.record_new_subtitle") : pct >= 95 ? t("move.record_close_subtitle") : t("move.record_keep_going_subtitle")}
                </div>
              </div>
            </div>
          );
        })()}

        {/* GRAPHIQUE SEMAINE */}
        <div style={{ padding: "0 24px", marginBottom: 20 }}>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", letterSpacing: "3px", textTransform: "uppercase", marginBottom: 14 }}>{t("move.this_week_title")}</div>
          <div style={{ display: "flex", gap: 6, alignItems: "flex-end", height: 60 }}>
            {bars.map((b, i) => (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <div style={{ width: "100%", height: Math.max((b.km / maxKm) * 48, b.km > 0 ? 4 : 2) + "px", background: b.km > 0 ? (b.isToday ? RED : `rgba(239,68,68,${b.km / maxKm * 0.6 + 0.15})`) : "rgba(255,255,255,0.04)", borderRadius: "3px 3px 0 0", transition: "height 0.5s ease" }} />
                {b.km > 0 && <div style={{ fontSize: 8, color: "rgba(239,68,68,0.6)" }}>{b.km.toFixed(1)}</div>}
                <div style={{ fontSize: 8, color: "rgba(255,255,255,0.2)" }}>{b.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ height: 1, background: "rgba(255,255,255,0.05)", margin: "0 24px 20px" }} />

        {/* HISTORIQUE COURSES */}
        <div style={{ padding: "0 24px", marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", letterSpacing: "3px", textTransform: "uppercase" }}>{t("move.history")}</div>
            <button onClick={() => setShowAdd(true)} style={{ background: RED, color: "#fff", border: "none", borderRadius: 100, padding: "8px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>{t("move.add_short")}</button>
          </div>

          {runs.length === 0 ? (
            <EmptyState
              icon="activity"
              title={t("move.first_run_title")}
              subtitle={t("move.first_run_subtitle")}
              action={{ label: t("move.add_run_cta"), onClick: () => setShowAdd(true) }}
              accent={RED}
              size="md"
              style={{ padding: "24px 16px" }}
            />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {runs.map((run, i) => {
                const opacity = Math.max(1 - i * 0.15, 0.3);
                const color = `rgba(239,68,68,${opacity})`;
                return (
                  <div key={run.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 14 }}>
                    <div style={{ width: 3, height: 36, borderRadius: 2, background: color, flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, color: "rgba(255,255,255,0.7)" }}>
                        {run.note || t("move.run_default_label")}
                      </div>
                      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", marginTop: 2 }}>
                        {new Date(run.date).toLocaleDateString(intlLocale(), { weekday: "long", day: "numeric", month: "short" })} · {run.distance_km} km · {run.duree_min} min
                      </div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ fontSize: 18, color, fontWeight: 600 }}>{run.allure_min_km}</div>
                      <div style={{ fontSize: 9, color: "rgba(255,255,255,0.2)" }}>{t("move.min_per_km")}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* MODAL AJOUTER SORTIE */}
      {showAdd && (
        <div onClick={e => { if (e.target === e.currentTarget) { setShowAdd(false); } }} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 200, display: "flex", flexDirection: "column", justifyContent: "flex-end", alignItems: "center" }}>
          <div style={{ background: "#111", borderRadius: "24px 24px 0 0", padding: "24px 24px calc(env(safe-area-inset-bottom, 0px) + 24px)", width: "100%", maxWidth: 480, boxSizing: "border-box" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <div style={{ fontSize: 17, fontWeight: 700, color: "#fff" }}>{t("move.new_run")}</div>
              <button onClick={() => setShowAdd(false)} aria-label="Fermer" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, width: 44, height: 44, color: "rgba(255,255,255,0.85)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
            </div>

            <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginBottom: 8 }}>{t("move.distance_km")}</div>
                <input type="number" inputMode="decimal" step="0.1" value={form.distance} onChange={e => setForm(p => ({ ...p, distance: e.target.value }))} placeholder="6.2" style={{ width: "100%", padding: "14px 16px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 14, color: "#fff", fontSize: 18, fontWeight: 300, outline: "none", fontFamily: "-apple-system,Inter,sans-serif", boxSizing: "border-box" }} />
              </div>
              <div style={{ flex: 1, display: "flex", gap: 6 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginBottom: 8 }}>{t("move.hours")}</div>
                  <input type="number" inputMode="numeric" min="0" max="10" value={form.heures} onChange={e => setForm(p => ({ ...p, heures: e.target.value }))} placeholder="0" style={{ width: "100%", padding: "14px 10px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 14, color: "#fff", fontSize: 18, fontWeight: 300, outline: "none", fontFamily: "-apple-system,Inter,sans-serif", boxSizing: "border-box", textAlign: "center" }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginBottom: 8 }}>{t("move.minutes")}</div>
                  <input type="number" inputMode="numeric" min="0" max="59" value={form.minutes} onChange={e => setForm(p => ({ ...p, minutes: e.target.value }))} placeholder="35" style={{ width: "100%", padding: "14px 10px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 14, color: "#fff", fontSize: 18, fontWeight: 300, outline: "none", fontFamily: "-apple-system,Inter,sans-serif", boxSizing: "border-box", textAlign: "center" }} />
                </div>
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginBottom: 8 }}>{t("move.note_optional")}</div>
              <input type="text" value={form.note} onChange={e => setForm(p => ({ ...p, note: e.target.value }))} placeholder={t("move.note_placeholder")} style={{ width: "100%", padding: "14px 16px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 14, color: "#fff", fontSize: 16, outline: "none", fontFamily: "-apple-system,Inter,sans-serif", boxSizing: "border-box" }} />
            </div>

            {(() => {
              // Au moins distance OU duree (heures+minutes)
              const hasDist = parseFloat(form.distance) > 0;
              const hasDur = (parseInt(form.heures, 10) || 0) > 0 || (parseInt(form.minutes, 10) || 0) > 0;
              const canSave = !saving && (hasDist || hasDur);
              return (
                <button onClick={addRun} disabled={!canSave} style={{ width: "100%", padding: 16, background: canSave ? RED : "rgba(255,255,255,0.06)", color: canSave ? "#fff" : "rgba(255,255,255,0.2)", border: "none", borderRadius: 14, fontSize: 15, fontWeight: 700, cursor: canSave ? "pointer" : "not-allowed" }}>
                  {saving ? (<span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}><Spinner variant="dots" size={18} color="#fff" />{t("move.saving")}</span>) : t("move.save_run")}
                </button>
              );
            })()}
          </div>
        </div>
      )}

    </div>
  );
}

// Chip style for prescribed run targets (premium)
const chipStyle = {
  display: "inline-flex", alignItems: "center", gap: 6,
  padding: "5px 10px",
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.07)",
  borderRadius: 8,
  fontSize: 11,
};
const chipLabel = {
  fontSize: 9, fontWeight: 700, letterSpacing: "1.2px", textTransform: "uppercase",
  color: "rgba(255,255,255,0.35)",
};
const chipVal = {
  fontSize: 12, fontWeight: 700, color: "#fff", fontFamily: "'JetBrains Mono', monospace",
  letterSpacing: "-0.02em",
};

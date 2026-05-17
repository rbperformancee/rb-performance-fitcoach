import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import haptic from "../lib/haptic";

/**
 * FieldSessionCard — séance "terrain" (foot, rugby…) prescrite par le coach
 * pour ce jour. L'athlète la voit, la coche comme faite et donne un
 * ressenti court (RPE 1-10 + note). Stocké dans field_session_logs ;
 * remonté au coach via son feed d'activité (coach_activity_log).
 */

const G = "#02d1ba";

export default function FieldSessionCard({ field, clientId, coachId, weekIdx, sessionIdx, fieldIdx }) {
  const [log, setLog] = useState(null); // { done_at, rpe, note } | null
  const [open, setOpen] = useState(false);
  const [rpe, setRpe] = useState(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!clientId) return;
    let cancelled = false;
    supabase
      .from("field_session_logs")
      .select("done_at, rpe, note")
      .eq("client_id", clientId)
      .eq("week_idx", weekIdx)
      .eq("session_idx", sessionIdx)
      .eq("field_idx", fieldIdx)
      .maybeSingle()
      .then(({ data }) => { if (!cancelled && data) setLog(data); });
    return () => { cancelled = true; };
  }, [clientId, weekIdx, sessionIdx, fieldIdx]);

  async function validate() {
    if (saving || !clientId) return;
    setSaving(true);
    haptic.success();
    const row = {
      client_id: clientId,
      week_idx: weekIdx,
      session_idx: sessionIdx,
      field_idx: fieldIdx,
      done_at: new Date().toISOString(),
      rpe: rpe,
      note: note.trim() || null,
    };
    const { error } = await supabase
      .from("field_session_logs")
      .upsert(row, { onConflict: "client_id,week_idx,session_idx,field_idx" });
    if (!error) {
      setLog({ done_at: row.done_at, rpe: row.rpe, note: row.note });
      setOpen(false);
      // Visible côté coach dans son feed d'activité
      if (coachId) {
        const details = `Séance terrain « ${field.title || "Terrain"} » faite`
          + (rpe ? ` — RPE ${rpe}/10` : "")
          + (row.note ? ` · ${row.note}` : "");
        supabase.from("coach_activity_log").insert({
          coach_id: coachId, client_id: clientId, activity_type: "field_session", details,
        });
      }
    }
    setSaving(false);
  }

  const done = !!log;

  return (
    <div style={{
      background: done ? "rgba(2,209,186,0.05)" : "rgba(2,209,186,0.03)",
      border: `1px solid ${done ? "rgba(2,209,186,0.3)" : "rgba(2,209,186,0.15)"}`,
      borderRadius: 12, padding: "12px 14px",
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>
            🏟 {field.title || "Séance terrain"}
            {field.moment ? <span style={{ fontWeight: 500, color: "rgba(255,255,255,0.4)" }}>{" · " + field.moment}</span> : null}
          </div>
          {field.description ? (
            <div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.5)", marginTop: 3, lineHeight: 1.45 }}>{field.description}</div>
          ) : null}
        </div>
        {done && (
          <div style={{ flexShrink: 0, width: 24, height: 24, borderRadius: "50%", background: G, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#050505" strokeWidth="3" strokeLinecap="round" style={{ width: 12, height: 12 }}><polyline points="20 6 9 17 4 12" /></svg>
          </div>
        )}
      </div>

      {done ? (
        <div style={{ marginTop: 8, fontSize: 11, color: "rgba(2,209,186,0.85)" }}>
          Faite{log.rpe ? ` · RPE ${log.rpe}/10` : ""}{log.note ? ` · « ${log.note} »` : ""}
        </div>
      ) : open ? (
        <div style={{ marginTop: 10 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: "rgba(255,255,255,0.4)", marginBottom: 6 }}>
            Intensité ressentie (RPE)
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(10, 1fr)", gap: 4, marginBottom: 10 }}>
            {[1,2,3,4,5,6,7,8,9,10].map((n) => (
              <button key={n} onClick={() => setRpe(rpe === n ? null : n)} style={{
                padding: "8px 0", borderRadius: 7, cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: "inherit",
                color: rpe === n ? "#000" : "rgba(255,255,255,0.6)",
                background: rpe === n ? G : "rgba(255,255,255,0.04)",
                border: `1px solid ${rpe === n ? G : "rgba(255,255,255,0.08)"}`,
              }}>{n}</button>
            ))}
          </div>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Un mot pour ton coach (optionnel)"
            style={{
              width: "100%", boxSizing: "border-box", padding: "9px 11px", marginBottom: 8,
              background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 9, color: "#fff", fontSize: 13, fontFamily: "inherit", outline: "none",
            }}
          />
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={() => setOpen(false)} style={{
              padding: "9px 14px", borderRadius: 9, cursor: "pointer", fontFamily: "inherit",
              fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.5)",
              background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
            }}>Annuler</button>
            <button onClick={validate} disabled={saving} style={{
              flex: 1, padding: "9px 14px", borderRadius: 9, cursor: saving ? "wait" : "pointer", fontFamily: "inherit",
              fontSize: 11, fontWeight: 800, color: "#000", background: G, border: "none",
              letterSpacing: 0.4, textTransform: "uppercase",
            }}>{saving ? "…" : "Valider"}</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setOpen(true)} style={{
          width: "100%", marginTop: 10, padding: "9px 0", borderRadius: 9, cursor: "pointer", fontFamily: "inherit",
          fontSize: 11, fontWeight: 800, color: G, background: "rgba(2,209,186,0.08)",
          border: "1px solid rgba(2,209,186,0.3)", letterSpacing: 0.4, textTransform: "uppercase",
        }}>Marquer comme faite</button>
      )}
    </div>
  );
}

import React, { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { toast } from "../Toast";
import haptic from "../../lib/haptic";

const G = "#02d1ba";

/**
 * BulkAssignProgramme — modal coach pour dupliquer le programme actif d'un
 * client vers N autres clients en 1 click.
 *
 * Flow :
 *   1. Coach choisit la source (un client avec programme actif)
 *   2. Coach coche N clients cibles
 *   3. Submit : SELECT html_content source, puis INSERT N rows programmes
 *      (1 par client cible) avec is_active=true
 *
 * Pour les cibles qui ont déjà un programme actif, on désactive l'ancien
 * (UPDATE is_active=false) avant d'insérer le nouveau — comportement
 * cohérent avec uploadProg dans CoachDashboard.
 *
 * Props:
 *   open, onClose, clients (liste complète), coachId, onDone
 */
export default function BulkAssignProgramme({ open, onClose, clients, coachId, onDone }) {
  const [sourceClientId, setSourceClientId] = useState("");
  const [selectedTargets, setSelectedTargets] = useState(new Set());
  const [sourceHtml, setSourceHtml] = useState(null);
  const [sourceName, setSourceName] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Filtre : clients avec programme actif comme source possibles
  const sources = (clients || []).filter((c) => c.programmes?.some((p) => p.is_active));

  // Reset à la fermeture
  useEffect(() => {
    if (!open) {
      setSourceClientId("");
      setSelectedTargets(new Set());
      setSourceHtml(null);
      setSourceName("");
    }
  }, [open]);

  // Quand source change, fetch html_content
  useEffect(() => {
    if (!sourceClientId) { setSourceHtml(null); return; }
    let cancelled = false;
    setLoading(true);
    (async () => {
      const { data } = await supabase
        .from("programmes")
        .select("html_content, programme_name")
        .eq("client_id", sourceClientId)
        .eq("is_active", true)
        .order("uploaded_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cancelled) return;
      setSourceHtml(data?.html_content || null);
      setSourceName(data?.programme_name || "Programme");
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [sourceClientId]);

  if (!open) return null;

  const sourceClient = sources.find((c) => c.id === sourceClientId);
  const targets = (clients || []).filter((c) => c.id !== sourceClientId);

  function toggleTarget(id) {
    setSelectedTargets((s) => {
      const x = new Set(s);
      if (x.has(id)) x.delete(id); else x.add(id);
      return x;
    });
  }

  function selectAll() {
    setSelectedTargets(new Set(targets.map((c) => c.id)));
  }

  function unselectAll() {
    setSelectedTargets(new Set());
  }

  async function submit() {
    if (!sourceHtml || selectedTargets.size === 0) return;
    haptic.medium();
    setSubmitting(true);
    try {
      const targetIds = Array.from(selectedTargets);
      // 1. Désactive les programmes actifs des cibles
      await supabase.from("programmes")
        .update({ is_active: false })
        .in("client_id", targetIds)
        .eq("is_active", true);
      // 2. INSERT N nouveaux programmes
      const rows = targetIds.map((cid) => ({
        client_id: cid,
        programme_name: sourceName,
        html_content: sourceHtml,
        is_active: true,
        uploaded_at: new Date().toISOString(),
      }));
      const { error } = await supabase.from("programmes").insert(rows);
      if (error) throw error;
      toast.success(`${targetIds.length} programme${targetIds.length > 1 ? "s" : ""} assigné${targetIds.length > 1 ? "s" : ""}`);
      onDone?.();
      onClose?.();
    } catch (e) {
      toast.error(e.message || "Erreur lors de l'assignation");
    }
    setSubmitting(false);
  }

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
      style={{
        position: "fixed", inset: 0, zIndex: 1250,
        background: "rgba(0,0,0,0.85)", backdropFilter: "blur(12px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20,
        fontFamily: "-apple-system,'Inter',sans-serif",
      }}
    >
      <div style={{
        background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 20, maxWidth: 580, width: "100%", maxHeight: "90vh",
        display: "flex", flexDirection: "column", overflow: "hidden",
      }}>
        <div style={{ padding: "22px 24px 16px", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: 3, color: G, textTransform: "uppercase", marginBottom: 6 }}>
              Bulk · assignation programme
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#fff", letterSpacing: -0.3, lineHeight: 1.2 }}>
              Dupliquer un programme à plusieurs clients
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            style={{ width: 32, height: 32, borderRadius: 10, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.7)", cursor: "pointer", fontSize: 16, lineHeight: 1, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}
          >×</button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px 22px" }}>
          {/* Step 1 : source */}
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase", color: "rgba(255,255,255,0.4)", marginBottom: 8 }}>
              1. Programme source
            </div>
            {sources.length === 0 ? (
              <div style={{ padding: "12px 14px", fontSize: 12, color: "rgba(255,255,255,0.5)", background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10 }}>
                Aucun client n'a de programme actif. Upload-en un d'abord.
              </div>
            ) : (
              <select
                value={sourceClientId}
                onChange={(e) => setSourceClientId(e.target.value)}
                style={{
                  width: "100%", padding: "11px 13px",
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 10,
                  color: "#fff", fontSize: 13, fontFamily: "inherit",
                  outline: "none", boxSizing: "border-box",
                }}
              >
                <option value="">— Choisir un client source —</option>
                {sources.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.full_name || c.email}
                  </option>
                ))}
              </select>
            )}
            {sourceClientId && sourceHtml && (
              <div style={{
                marginTop: 8, padding: "8px 12px",
                background: `${G}10`, border: `1px solid ${G}30`,
                borderRadius: 8, fontSize: 11, color: G,
              }}>
                {sourceName} · {(sourceHtml.length / 1024).toFixed(1)} KB
              </div>
            )}
            {sourceClientId && loading && (
              <div style={{ marginTop: 8, fontSize: 11, color: "rgba(255,255,255,0.4)" }}>Chargement…</div>
            )}
          </div>

          {/* Step 2 : targets */}
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase", color: "rgba(255,255,255,0.4)" }}>
                2. Clients cibles ({selectedTargets.size})
              </div>
              <div style={{ display: "flex", gap: 4 }}>
                <button
                  type="button"
                  onClick={selectAll}
                  style={{ padding: "3px 8px", fontSize: 10, background: "transparent", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6, color: "rgba(255,255,255,0.55)", cursor: "pointer", fontFamily: "inherit", fontWeight: 700, letterSpacing: ".05em" }}
                >Tous</button>
                <button
                  type="button"
                  onClick={unselectAll}
                  style={{ padding: "3px 8px", fontSize: 10, background: "transparent", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6, color: "rgba(255,255,255,0.55)", cursor: "pointer", fontFamily: "inherit", fontWeight: 700, letterSpacing: ".05em" }}
                >Aucun</button>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 320, overflowY: "auto" }}>
              {targets.map((c) => {
                const checked = selectedTargets.has(c.id);
                const hasActiveProg = c.programmes?.some((p) => p.is_active);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => toggleTarget(c.id)}
                    style={{
                      display: "flex", alignItems: "center", gap: 10,
                      padding: "9px 12px",
                      background: checked ? `${G}10` : "rgba(255,255,255,0.02)",
                      border: `1px solid ${checked ? G + "35" : "rgba(255,255,255,0.05)"}`,
                      borderRadius: 9,
                      cursor: "pointer", fontFamily: "inherit", textAlign: "left",
                      transition: "all .12s",
                    }}
                  >
                    <div style={{
                      width: 18, height: 18, borderRadius: 5,
                      background: checked ? G : "transparent",
                      border: `1.5px solid ${checked ? G : "rgba(255,255,255,0.2)"}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      flexShrink: 0,
                    }}>
                      {checked && (
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {c.full_name || c.email}
                      </div>
                      {hasActiveProg && (
                        <div style={{ fontSize: 9, color: "#fbbf24", marginTop: 2, letterSpacing: ".5px", textTransform: "uppercase", fontWeight: 700 }}>
                          Programme actif sera remplacé
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: "14px 22px calc(env(safe-area-inset-bottom, 0px) + 14px)", borderTop: "1px solid rgba(255,255,255,0.05)", display: "flex", gap: 10 }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "11px 16px",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 10,
              color: "rgba(255,255,255,0.6)",
              fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
            }}
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!sourceHtml || selectedTargets.size === 0 || submitting}
            style={{
              flex: 1, padding: "11px 16px",
              background: (!sourceHtml || selectedTargets.size === 0 || submitting) ? "rgba(255,255,255,0.06)" : G,
              border: "none", borderRadius: 10,
              color: (!sourceHtml || selectedTargets.size === 0 || submitting) ? "rgba(255,255,255,0.3)" : "#000",
              fontSize: 12, fontWeight: 800,
              cursor: (!sourceHtml || selectedTargets.size === 0 || submitting) ? "not-allowed" : "pointer",
              fontFamily: "inherit", letterSpacing: ".05em", textTransform: "uppercase",
            }}
          >
            {submitting ? "Assignation…" : `Assigner à ${selectedTargets.size} client${selectedTargets.size > 1 ? "s" : ""}`}
          </button>
        </div>
      </div>
    </div>
  );
}

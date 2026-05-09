import React, { useRef, useState } from "react";
import { supabase } from "../../lib/supabase";
import { toast } from "../Toast";
import haptic from "../../lib/haptic";

const G = "#02d1ba";
const RED = "#ef4444";
const ORANGE = "#f97316";

/**
 * BulkWeightImportCSV — Import des pesées historiques d'UN client
 * depuis un export CSV (Trainerize body weight log, Hexfit pesées,
 * Withings, MyFitnessPal, Apple Health…).
 *
 * Format CSV attendu : 2 colonnes minimum
 *   - date (YYYY-MM-DD ou DD/MM/YYYY ou DD-MM-YYYY)
 *   - weight (kg, comma ou dot accepté)
 *   - note (optionnel)
 *
 * Détection auto des colonnes (regex flex). Bulk INSERT dans
 * weight_logs (RLS coach write activé via migration 054).
 *
 * Props :
 *   open: bool, onClose, clientId, clientName
 *   onDone: () => void  (refresh après succès)
 */

function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length === 0) return { headers: [], rows: [] };
  const semis = (lines[0].match(/;/g) || []).length;
  const commas = (lines[0].match(/,/g) || []).length;
  const sep = semis > commas ? ";" : ",";
  const parseLine = (line) => {
    const out = [];
    let cur = "";
    let inQuote = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuote && line[i + 1] === '"') { cur += '"'; i++; }
        else inQuote = !inQuote;
      } else if (ch === sep && !inQuote) {
        out.push(cur); cur = "";
      } else {
        cur += ch;
      }
    }
    out.push(cur);
    return out.map((s) => s.trim());
  };
  const rawHeaders = parseLine(lines[0]);
  const headers = rawHeaders.map((h) => h.toLowerCase().trim());
  const rows = lines.slice(1).map((line) => {
    const cells = parseLine(line);
    const obj = {};
    headers.forEach((h, i) => { obj[h] = cells[i] || ""; });
    return obj;
  });
  return { headers, rows };
}

function detectCols(headers) {
  const find = (regexes) => headers.find((h) => regexes.some((r) => r.test(h)));
  return {
    date: find([/^date$/i, /^day$/i, /^jour$/i, /^datetime$/i, /^when$/i, /^logged/i]),
    weight: find([/^weight$/i, /^poids$/i, /^kg$/i, /^body[\s_-]?weight$/i, /^bw$/i]),
    note: find([/^note$/i, /^notes$/i, /^comment$/i, /^commentaire$/i]),
  };
}

// Parse une date : YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY, MM/DD/YYYY
// Retourne null si ambigu ou invalide.
function parseDate(s) {
  if (!s) return null;
  const trimmed = s.trim();
  // ISO YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return trimmed.slice(0, 10);
  // DD/MM/YYYY ou DD-MM-YYYY
  const m = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (m) {
    const [_, d, mo, y] = m;
    const dn = parseInt(d, 10);
    const mn = parseInt(mo, 10);
    if (dn > 31 || mn > 12) return null;
    // Ambiguïté DD/MM vs MM/DD : on suppose DD/MM (français), si dn > 12 c'est forcément DD/MM.
    return `${y}-${String(mn).padStart(2, "0")}-${String(dn).padStart(2, "0")}`;
  }
  // Fallback : essayer Date.parse (ISO ou autre)
  const d = new Date(trimmed);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return null;
}

function parseWeight(s) {
  if (!s) return null;
  // Remplace virgule par point (format européen), retire espaces et "kg"
  const clean = String(s).replace(",", ".").replace(/\s|kg|lbs?/gi, "");
  const n = parseFloat(clean);
  if (!Number.isFinite(n) || n <= 0 || n > 400) return null;
  return Math.round(n * 10) / 10;
}

export default function BulkWeightImportCSV({ open, onClose, clientId, clientName, onDone }) {
  const fileRef = useRef(null);
  const [parsed, setParsed] = useState(null);
  const [cols, setCols] = useState({});
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function reset() { setParsed(null); setCols({}); setError(""); }

  async function handleFile(f) {
    if (!f) return;
    setError("");
    try {
      const text = await f.text();
      const p = parseCSV(text);
      if (p.rows.length === 0) { setError("CSV vide ou format non reconnu."); return; }
      const detected = detectCols(p.headers);
      if (!detected.date || !detected.weight) {
        setError("Colonnes 'date' et 'poids' requises (en-tête : date, poids/weight).");
        setParsed(p);
        return;
      }
      setParsed(p);
      setCols(detected);
    } catch (e) {
      setError("Lecture du fichier échouée : " + (e.message || e));
    }
  }

  function onDrop(e) {
    e.preventDefault();
    const f = e.dataTransfer?.files?.[0];
    if (f) handleFile(f);
  }

  // Compute valid rows : date + weight valides, dedup par date (la dernière valeur l'emporte).
  const validRows = React.useMemo(() => {
    if (!parsed || !cols.date || !cols.weight) return [];
    const byDate = new Map();
    for (const r of parsed.rows) {
      const d = parseDate(r[cols.date]);
      const w = parseWeight(r[cols.weight]);
      if (!d || w == null) continue;
      const note = cols.note ? String(r[cols.note] || "").trim() : null;
      byDate.set(d, { date: d, weight: w, note: note || null });
    }
    return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [parsed, cols]);

  const invalidCount = parsed ? parsed.rows.length - validRows.length : 0;

  async function submit() {
    if (!clientId || validRows.length === 0) return;
    haptic.selection();
    setSubmitting(true);
    try {
      // Bulk INSERT — onConflict (client_id, date) si la table a une contrainte
      // unique. Sinon INSERT simple, les doublons crééraient des rows. Pour
      // safety on fait DELETE-then-INSERT sur les dates qu'on insère.
      const dates = validRows.map((r) => r.date);
      // Delete les pesées existantes pour ce client sur les dates qu'on remonte
      // → évite les doublons si le coach re-importe.
      await supabase.from("weight_logs")
        .delete()
        .eq("client_id", clientId)
        .in("date", dates);
      const insertRows = validRows.map((r) => ({
        client_id: clientId,
        date: r.date,
        weight: r.weight,
        note: r.note,
      }));
      const { error: insErr } = await supabase.from("weight_logs").insert(insertRows);
      if (insErr) throw new Error(insErr.message || "INSERT échoué");
      toast.success(`${validRows.length} pesée${validRows.length > 1 ? "s" : ""} importée${validRows.length > 1 ? "s" : ""}`);
      if (onDone) onDone();
      setTimeout(() => { reset(); onClose?.(); }, 800);
    } catch (e) {
      setError(e.message || "Erreur d'import");
      setSubmitting(false);
    }
  }

  if (!open) return null;

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget && !submitting) { reset(); onClose?.(); } }}
      style={{
        position: "fixed", inset: 0, zIndex: 1100,
        background: "rgba(0,0,0,0.78)", backdropFilter: "blur(10px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20, overflowY: "auto",
      }}
    >
      <div style={{
        background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20,
        maxWidth: 560, width: "100%", maxHeight: "90vh",
        display: "flex", flexDirection: "column", overflow: "hidden",
        fontFamily: "-apple-system,'Inter',sans-serif",
      }}>
        <div style={{
          padding: "26px 28px 22px",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
          background: "linear-gradient(180deg, rgba(2,209,186,0.025) 0%, transparent 100%)",
          display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16,
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: 3.5, color: G, textTransform: "uppercase", marginBottom: 8 }}>
              Migration · Pesées historiques
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", letterSpacing: -0.5, lineHeight: 1.15, marginBottom: 6 }}>
              Importe les pesées de {clientName || "ce client"}
            </div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", lineHeight: 1.5 }}>
              CSV avec date + poids. Le graphe d'évolution reste continu après la migration.
            </div>
          </div>
          <button
            type="button"
            onClick={() => { if (!submitting) { reset(); onClose?.(); } }}
            disabled={submitting}
            aria-label="Fermer"
            style={{ width: 34, height: 34, borderRadius: 10, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.7)", cursor: submitting ? "not-allowed" : "pointer", fontSize: 18, lineHeight: 1, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}
          >×</button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "20px 28px 28px" }}>
          {!parsed && (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={onDrop}
              onClick={() => fileRef.current?.click()}
              style={{
                border: "2px dashed rgba(2,209,186,0.3)",
                borderRadius: 14, padding: "44px 24px", textAlign: "center",
                cursor: "pointer", background: "rgba(2,209,186,0.025)",
                transition: "border-color .15s, background .15s",
              }}
            >
              <input
                type="file"
                ref={fileRef}
                accept=".csv,text/csv,text/plain"
                onChange={(e) => handleFile(e.target.files?.[0])}
                style={{ display: "none" }}
              />
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={G} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 14 }}>
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", marginBottom: 6 }}>
                Drop ton CSV ici ou clique pour parcourir
              </div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", lineHeight: 1.5 }}>
                Colonnes : date (YYYY-MM-DD ou DD/MM/YYYY), poids (kg).<br />
                Note optionnelle. Une pesée par date.
              </div>
            </div>
          )}

          {parsed && (
            <>
              <div style={{
                display: "grid", gridTemplateColumns: "repeat(3, 1fr)",
                background: "rgba(2,209,186,0.03)",
                border: "1px solid rgba(255,255,255,0.05)",
                borderRadius: 12,
                marginBottom: 18,
              }}>
                {[
                  { label: "Lignes lues", value: parsed.rows.length, color: "#fff" },
                  { label: "Pesées valides", value: validRows.length, color: G },
                  { label: "Ignorées", value: invalidCount, color: invalidCount > 0 ? ORANGE : "rgba(255,255,255,0.3)" },
                ].map((kpi, i, arr) => (
                  <div key={i} style={{
                    padding: "14px 8px", textAlign: "center",
                    borderRight: i < arr.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                  }}>
                    <div style={{ fontSize: 8.5, fontWeight: 800, letterSpacing: 1.8, textTransform: "uppercase", color: "rgba(255,255,255,0.4)", marginBottom: 5 }}>{kpi.label}</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: kpi.color, fontVariantNumeric: "tabular-nums" }}>{kpi.value}</div>
                  </div>
                ))}
              </div>

              {validRows.length > 0 && (
                <>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: "rgba(255,255,255,0.35)", marginBottom: 10 }}>
                    Aperçu · 5 premières + 5 dernières
                  </div>
                  <div style={{
                    background: "rgba(0,0,0,0.25)",
                    border: "1px solid rgba(255,255,255,0.04)",
                    borderRadius: 10,
                    overflow: "hidden",
                    marginBottom: 18,
                  }}>
                    {[...validRows.slice(0, 5), ...(validRows.length > 10 ? [{ _separator: true }] : []), ...(validRows.length > 5 ? validRows.slice(-5) : [])].map((r, i) => (
                      r._separator ? (
                        <div key={i} style={{ padding: "8px 14px", textAlign: "center", color: "rgba(255,255,255,0.25)", fontSize: 11, borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                          … {validRows.length - 10} pesées intermédiaires
                        </div>
                      ) : (
                        <div key={i} style={{
                          padding: "10px 14px",
                          borderTop: i === 0 ? "none" : "1px solid rgba(255,255,255,0.04)",
                          fontSize: 12,
                          display: "flex", justifyContent: "space-between", gap: 10,
                        }}>
                          <div style={{ color: "rgba(255,255,255,0.7)", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                            {new Date(r.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}
                          </div>
                          <div style={{ color: G, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                            {r.weight}<span style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginLeft: 2 }}>kg</span>
                          </div>
                        </div>
                      )
                    ))}
                  </div>
                </>
              )}
            </>
          )}

          {error && (
            <div style={{
              padding: "10px 14px",
              background: "rgba(239,68,68,0.06)",
              border: "1px solid rgba(239,68,68,0.2)",
              borderRadius: 8,
              fontSize: 12, color: "#ef4444",
              marginBottom: 16,
            }}>{error}</div>
          )}
        </div>

        {parsed && validRows.length > 0 && !submitting && (
          <div style={{ padding: "16px 28px 22px", borderTop: "1px solid rgba(255,255,255,0.05)", display: "flex", gap: 10 }}>
            <button
              type="button" onClick={reset}
              style={{
                flex: 1, padding: "12px 16px", borderRadius: 12,
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "rgba(255,255,255,0.7)",
                fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
              }}
            >Recharger</button>
            <button
              type="button" onClick={submit}
              style={{
                flex: 2, padding: "12px 16px", borderRadius: 12,
                background: G, color: "#000", border: "none",
                fontSize: 13, fontWeight: 800, cursor: "pointer", fontFamily: "inherit",
                textTransform: "uppercase", letterSpacing: 0.5,
                boxShadow: `0 12px 32px ${G}40`,
              }}
            >Importer {validRows.length} pesée{validRows.length > 1 ? "s" : ""}</button>
          </div>
        )}

        {submitting && (
          <div style={{ padding: "16px 28px 22px", borderTop: "1px solid rgba(255,255,255,0.05)", textAlign: "center", color: G, fontSize: 13, fontWeight: 700 }}>
            Import en cours…
          </div>
        )}
      </div>
    </div>
  );
}

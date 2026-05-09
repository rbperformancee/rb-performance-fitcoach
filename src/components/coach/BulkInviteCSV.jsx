import React, { useRef, useState } from "react";
import { supabase } from "../../lib/supabase";
import { toast } from "../Toast";
import haptic from "../../lib/haptic";

const G = "#02d1ba";
const RED = "#ef4444";
const ORANGE = "#f97316";

/**
 * BulkInviteCSV — Modal d'import CSV de la liste clients d'un coach
 * migrant depuis une autre app (Trainerize / Hexfit / Eklo / etc.).
 *
 * Flow :
 *   1. Coach drop un CSV (auto-détection séparateur , ou ;)
 *   2. Auto-détection des colonnes (email / prénom / téléphone — flex)
 *   3. Preview des 5 premières lignes + compteur invitations valides
 *   4. Submit : INSERT bulk dans invitations (RLS fixé via migration 053),
 *      puis appel send-invite Edge function avec throttle 300ms.
 *
 * Props :
 *   open: bool
 *   onClose: () => void
 *   coachId: uuid (pour relier les invitations)
 *   onDone: () => void  (callback après succès, refresh dashboard)
 */

// Parser CSV minimal — gère quoted fields + separator , ou ;.
// Pas de dep PapaParse (30KB) — assez robuste pour les exports
// standard de Trainerize/Hexfit/etc.
function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length === 0) return { headers: [], rows: [] };
  // Sépa : on prend celui qui apparaît le plus dans la 1ère ligne
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
    const obj = { __raw: cells };
    headers.forEach((h, i) => { obj[h] = cells[i] || ""; });
    return obj;
  });
  return { headers, rawHeaders, rows };
}

// Détection souple des colonnes — couvre français + anglais + variations.
function detectCols(headers) {
  const find = (regexes) => headers.find((h) => regexes.some((r) => r.test(h)));
  return {
    email: find([/^e[\s_-]?mail$/i, /^mail$/i, /courriel/i]),
    firstName: find([/^prenom$/i, /^prénom$/i, /^first[\s_-]?name$/i, /^fname$/i, /^given[\s_-]?name$/i]),
    lastName: find([/^nom$/i, /^last[\s_-]?name$/i, /^lname$/i, /^surname$/i, /^family[\s_-]?name$/i, /^name$/i]),
    phone: find([/phone/i, /^t[eé]l$/i, /telephone/i, /téléphone/i, /^mobile$/i, /^cell/i]),
  };
}

const isValidEmail = (e) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e);

export default function BulkInviteCSV({ open, onClose, coachId, onDone }) {
  const fileRef = useRef(null);
  const [file, setFile] = useState(null);
  const [parsed, setParsed] = useState(null); // { headers, rawHeaders, rows }
  const [cols, setCols] = useState({});
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0, sent: 0, failed: 0 });

  function reset() {
    setFile(null);
    setParsed(null);
    setCols({});
    setError("");
    setProgress({ done: 0, total: 0, sent: 0, failed: 0 });
  }

  async function handleFile(f) {
    if (!f) return;
    setError("");
    setFile(f);
    try {
      const text = await f.text();
      const p = parseCSV(text);
      if (p.rows.length === 0) {
        setError("CSV vide ou format non reconnu.");
        return;
      }
      const detected = detectCols(p.headers);
      if (!detected.email) {
        setError("Aucune colonne email détectée. Vérifie l'en-tête (email, e-mail, mail…).");
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

  // Compute valid rows (email présent + valide), dedup par email
  const validRows = React.useMemo(() => {
    if (!parsed || !cols.email) return [];
    const seen = new Set();
    const out = [];
    for (const r of parsed.rows) {
      const email = String(r[cols.email] || "").toLowerCase().trim();
      if (!isValidEmail(email)) continue;
      if (seen.has(email)) continue;
      seen.add(email);
      out.push({
        email,
        prenom: cols.firstName ? String(r[cols.firstName] || "").trim() : "",
        nom: cols.lastName ? String(r[cols.lastName] || "").trim() : "",
        phone: cols.phone ? String(r[cols.phone] || "").trim() : "",
      });
    }
    return out;
  }, [parsed, cols]);

  const invalidCount = parsed ? parsed.rows.length - validRows.length : 0;

  async function submit() {
    if (!coachId || validRows.length === 0) return;
    haptic.selection();
    setSubmitting(true);
    setProgress({ done: 0, total: validRows.length, sent: 0, failed: 0 });

    try {
      // 1. Bulk INSERT invitations (un seul round-trip Supabase).
      const insertRows = validRows.map((r) => ({
        coach_id: coachId,
        email: r.email,
        prenom: r.prenom || null,
        status: "pending",
      }));
      const { data: inserted, error: insErr } = await supabase
        .from("invitations")
        .insert(insertRows)
        .select("id, email");
      if (insErr) {
        // Erreurs courantes : duplicate (email existe déjà avec status pending)
        // ou RLS si migration 053 pas appliquée.
        throw new Error(insErr.message || "INSERT bulk échoué");
      }

      // 2. Envoie les emails un par un avec throttle 300ms (Zoho SMTP rate limit).
      const { data: { session } } = await supabase.auth.getSession();
      const jwt = session?.access_token;
      if (!jwt) throw new Error("Session expirée — reconnecte-toi");

      let sent = 0, failed = 0;
      for (let i = 0; i < (inserted || []).length; i++) {
        const inv = inserted[i];
        try {
          const r = await fetch(`${process.env.REACT_APP_SUPABASE_URL}/functions/v1/send-invite`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${jwt}` },
            body: JSON.stringify({ invitation_id: inv.id }),
          });
          const j = await r.json().catch(() => ({}));
          if (r.ok && j.success) sent++;
          else failed++;
        } catch { failed++; }
        setProgress({ done: i + 1, total: inserted.length, sent, failed });
        // Throttle entre les envois
        if (i < inserted.length - 1) await new Promise((r) => setTimeout(r, 300));
      }

      toast.success(`${sent} invitation${sent > 1 ? "s" : ""} envoyée${sent > 1 ? "s" : ""}${failed > 0 ? ` · ${failed} en échec` : ""}`);
      if (onDone) onDone();
      // Léger délai pour laisser voir le succès
      setTimeout(() => { reset(); onClose?.(); }, 1500);
    } catch (e) {
      setError(e.message || "Erreur d'envoi");
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
        maxWidth: 640, width: "100%", maxHeight: "90vh",
        display: "flex", flexDirection: "column", overflow: "hidden",
        fontFamily: "-apple-system,'Inter',sans-serif",
      }}>
        {/* HEADER */}
        <div style={{
          padding: "26px 28px 22px",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
          background: "linear-gradient(180deg, rgba(2,209,186,0.025) 0%, transparent 100%)",
          display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16,
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: 3.5, color: G, textTransform: "uppercase", marginBottom: 8 }}>
              Migration · Import CSV
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", letterSpacing: -0.5, lineHeight: 1.15, marginBottom: 6 }}>
              Importe ta liste clients
            </div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", lineHeight: 1.5 }}>
              Export depuis Trainerize, Hexfit, Eklo, Hapyo… Aucun parser dédié — détection auto des colonnes.
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
          {/* DROP ZONE */}
          {!parsed && (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={onDrop}
              onClick={() => fileRef.current?.click()}
              style={{
                border: "2px dashed rgba(2,209,186,0.3)",
                borderRadius: 14,
                padding: "44px 24px",
                textAlign: "center",
                cursor: "pointer",
                background: "rgba(2,209,186,0.025)",
                transition: "border-color .15s, background .15s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(2,209,186,0.55)"; e.currentTarget.style.background = "rgba(2,209,186,0.05)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(2,209,186,0.3)"; e.currentTarget.style.background = "rgba(2,209,186,0.025)"; }}
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
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>
                Colonnes attendues : email (obligatoire), prénom, téléphone — toutes optionnelles sauf email.
              </div>
            </div>
          )}

          {/* PREVIEW */}
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
                  { label: "Invitations valides", value: validRows.length, color: G },
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

              {/* Mapping détecté */}
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: "rgba(255,255,255,0.35)", marginBottom: 10 }}>
                Colonnes détectées
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 18 }}>
                {[
                  { key: "email", label: "Email", required: true },
                  { key: "firstName", label: "Prénom" },
                  { key: "lastName", label: "Nom" },
                  { key: "phone", label: "Téléphone" },
                ].map((f) => {
                  const found = cols[f.key];
                  return (
                    <div key={f.key} style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      padding: "8px 12px",
                      background: "rgba(255,255,255,0.02)",
                      border: `1px solid ${found ? "rgba(2,209,186,0.18)" : f.required ? "rgba(239,68,68,0.25)" : "rgba(255,255,255,0.04)"}`,
                      borderRadius: 8,
                      fontSize: 12,
                    }}>
                      <div style={{ color: "rgba(255,255,255,0.7)", fontWeight: 600 }}>
                        {f.label}{f.required && <span style={{ color: RED, marginLeft: 4 }}>*</span>}
                      </div>
                      <div style={{
                        fontFamily: "'JetBrains Mono','SF Mono',monospace",
                        fontSize: 11,
                        color: found ? G : f.required ? RED : "rgba(255,255,255,0.3)",
                      }}>
                        {found ? `→ "${found}"` : f.required ? "manquant" : "—"}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Preview 5 premières lignes valides */}
              {validRows.length > 0 && (
                <>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: "rgba(255,255,255,0.35)", marginBottom: 10 }}>
                    Aperçu · {Math.min(5, validRows.length)} premières lignes
                  </div>
                  <div style={{
                    background: "rgba(0,0,0,0.25)",
                    border: "1px solid rgba(255,255,255,0.04)",
                    borderRadius: 10,
                    overflow: "hidden",
                    marginBottom: 18,
                  }}>
                    {validRows.slice(0, 5).map((r, i) => (
                      <div key={i} style={{
                        padding: "10px 14px",
                        borderTop: i === 0 ? "none" : "1px solid rgba(255,255,255,0.04)",
                        fontSize: 12,
                        display: "flex", justifyContent: "space-between", gap: 10,
                      }}>
                        <div style={{ color: "rgba(255,255,255,0.85)", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {r.email}
                        </div>
                        <div style={{ color: "rgba(255,255,255,0.4)", flexShrink: 0 }}>
                          {r.prenom || "—"}{r.phone ? ` · ${r.phone}` : ""}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}

          {/* PROGRESS pendant l'envoi */}
          {submitting && progress.total > 0 && (
            <div style={{
              padding: "14px 16px",
              background: "rgba(2,209,186,0.05)",
              border: "1px solid rgba(2,209,186,0.18)",
              borderRadius: 12,
              marginBottom: 18,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
                <div style={{ fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase", color: G, fontWeight: 700 }}>Envoi en cours</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#fff", fontVariantNumeric: "tabular-nums" }}>
                  {progress.done} / {progress.total}
                </div>
              </div>
              <div style={{ height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 100, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${(progress.done / progress.total) * 100}%`, background: G, transition: "width .3s" }} />
              </div>
              <div style={{ marginTop: 8, fontSize: 11, color: "rgba(255,255,255,0.5)" }}>
                {progress.sent} envoyés{progress.failed > 0 ? ` · ${progress.failed} en échec` : ""}
              </div>
            </div>
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

        {/* FOOTER */}
        {parsed && validRows.length > 0 && !submitting && (
          <div style={{ padding: "16px 28px 22px", borderTop: "1px solid rgba(255,255,255,0.05)", display: "flex", gap: 10 }}>
            <button
              type="button"
              onClick={reset}
              style={{
                flex: 1, padding: "12px 16px", borderRadius: 12,
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "rgba(255,255,255,0.7)",
                fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
              }}
            >Recharger un autre CSV</button>
            <button
              type="button"
              onClick={submit}
              style={{
                flex: 2, padding: "12px 16px", borderRadius: 12,
                background: G, color: "#000",
                border: "none",
                fontSize: 13, fontWeight: 800, cursor: "pointer", fontFamily: "inherit",
                textTransform: "uppercase", letterSpacing: 0.5,
                boxShadow: `0 12px 32px ${G}40`,
              }}
            >Envoyer {validRows.length} invitation{validRows.length > 1 ? "s" : ""}</button>
          </div>
        )}
      </div>
    </div>
  );
}

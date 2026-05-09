import React, { useState } from "react";
import { supabase } from "../../lib/supabase";
import { toast } from "../Toast";
import haptic from "../../lib/haptic";

const G = "#02d1ba";

/**
 * DataExportSection — Export CSV de toutes les données business du coach
 * pour data portability. Argument anti-lock-in : "tes données te suivent".
 *
 * Exports disponibles :
 *   1. Liste clients (email, nom, status, date d'invitation, dernière activité)
 *   2. Pesées de tous mes clients (client_email, date, weight, note)
 *   3. Exercise logs (client_email, date, ex_key, weight, reps)
 *   4. Programmes (programme_name, client_email, html_content)
 *
 * Export format : CSV UTF-8 avec BOM (Excel-friendly).
 * Tout côté client (pas d'API), respecte les RLS du coach.
 */

// CSV escaping : gère commas, quotes, newlines via wrapping en "..."
function csvCell(v) {
  if (v == null) return "";
  const s = String(v);
  if (/[",\n\r;]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function rowsToCsv(headers, rows) {
  const headerLine = headers.map(csvCell).join(",");
  const dataLines = rows.map((row) => headers.map((h) => csvCell(row[h])).join(","));
  // BOM UTF-8 pour qu'Excel ouvre correctement les accents
  return "﻿" + [headerLine, ...dataLines].join("\r\n");
}

function downloadCsv(filename, content) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function DataExportSection({ coachId, isDemo = false }) {
  const [busy, setBusy] = useState(null); // 'clients' | 'weights' | 'sessions' | 'programmes' | null

  async function exportClients() {
    if (isDemo) { toast.info("Export indisponible en mode démo"); return; }
    if (!coachId) return;
    haptic.light();
    setBusy("clients");
    try {
      const { data, error } = await supabase
        .from("clients")
        .select("email, full_name, phone, subscription_status, subscription_end_date, last_seen_at, onboarding_done, created_at")
        .eq("coach_id", coachId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const csv = rowsToCsv(
        ["email", "full_name", "phone", "subscription_status", "subscription_end_date", "last_seen_at", "onboarding_done", "created_at"],
        data || []
      );
      downloadCsv(`rbperform-clients-${Date.now()}.csv`, csv);
      toast.success(`${(data || []).length} client(s) exporté(s)`);
    } catch (e) {
      toast.error(e.message || "Export échoué");
    } finally { setBusy(null); }
  }

  async function exportWeights() {
    if (isDemo) { toast.info("Export indisponible en mode démo"); return; }
    if (!coachId) return;
    haptic.light();
    setBusy("weights");
    try {
      // 1. Récupère tous les clients du coach
      const { data: clients, error: clErr } = await supabase
        .from("clients").select("id, email").eq("coach_id", coachId);
      if (clErr) throw clErr;
      if (!clients || clients.length === 0) {
        toast.info("Aucun client à exporter");
        setBusy(null); return;
      }
      const idToEmail = new Map(clients.map((c) => [c.id, c.email]));
      const ids = clients.map((c) => c.id);
      // 2. Récupère toutes les pesées de ces clients
      const { data: weights, error: wErr } = await supabase
        .from("weight_logs").select("client_id, date, weight, note")
        .in("client_id", ids).order("date", { ascending: false });
      if (wErr) throw wErr;
      // 3. Map client_id → email
      const rows = (weights || []).map((w) => ({
        client_email: idToEmail.get(w.client_id) || "",
        date: w.date,
        weight: w.weight,
        note: w.note || "",
      }));
      const csv = rowsToCsv(["client_email", "date", "weight", "note"], rows);
      downloadCsv(`rbperform-weights-${Date.now()}.csv`, csv);
      toast.success(`${rows.length} pesée(s) exportée(s)`);
    } catch (e) {
      toast.error(e.message || "Export échoué");
    } finally { setBusy(null); }
  }

  async function exportSessions() {
    if (isDemo) { toast.info("Export indisponible en mode démo"); return; }
    if (!coachId) return;
    haptic.light();
    setBusy("sessions");
    try {
      const { data: clients, error: clErr } = await supabase
        .from("clients").select("id, email").eq("coach_id", coachId);
      if (clErr) throw clErr;
      if (!clients || clients.length === 0) {
        toast.info("Aucun client à exporter");
        setBusy(null); return;
      }
      const idToEmail = new Map(clients.map((c) => [c.id, c.email]));
      const ids = clients.map((c) => c.id);
      const { data: logs, error: lErr } = await supabase
        .from("exercise_logs").select("client_id, logged_at, ex_key, weight, reps, sets")
        .in("client_id", ids).order("logged_at", { ascending: false });
      if (lErr) throw lErr;
      // Si sets est jsonb, on déroule en lignes individuelles pour CSV plat.
      const rows = [];
      for (const l of logs || []) {
        const email = idToEmail.get(l.client_id) || "";
        const date = (l.logged_at || "").slice(0, 10);
        if (Array.isArray(l.sets) && l.sets.length > 0) {
          l.sets.forEach((s, i) => rows.push({
            client_email: email,
            date,
            ex_key: l.ex_key,
            set_index: i + 1,
            weight: s?.weight ?? "",
            reps: s?.reps ?? "",
          }));
        } else {
          rows.push({
            client_email: email,
            date,
            ex_key: l.ex_key,
            set_index: 1,
            weight: l.weight,
            reps: l.reps,
          });
        }
      }
      const csv = rowsToCsv(["client_email", "date", "ex_key", "set_index", "weight", "reps"], rows);
      downloadCsv(`rbperform-sessions-${Date.now()}.csv`, csv);
      toast.success(`${rows.length} série(s) exportée(s)`);
    } catch (e) {
      toast.error(e.message || "Export échoué");
    } finally { setBusy(null); }
  }

  async function exportProgrammes() {
    if (isDemo) { toast.info("Export indisponible en mode démo"); return; }
    if (!coachId) return;
    haptic.light();
    setBusy("programmes");
    try {
      const { data: clients, error: clErr } = await supabase
        .from("clients").select("id, email").eq("coach_id", coachId);
      if (clErr) throw clErr;
      if (!clients || clients.length === 0) {
        toast.info("Aucun programme à exporter");
        setBusy(null); return;
      }
      const idToEmail = new Map(clients.map((c) => [c.id, c.email]));
      const ids = clients.map((c) => c.id);
      const { data: progs, error: pErr } = await supabase
        .from("programmes").select("client_id, programme_name, html_content, is_active, uploaded_at")
        .in("client_id", ids).order("uploaded_at", { ascending: false });
      if (pErr) throw pErr;
      // CSV : on tronque html_content car dans Excel >32K caractères ça pète.
      // Si le coach veut le HTML complet, l'export JSON GDPR le contient.
      const rows = (progs || []).map((p) => ({
        client_email: idToEmail.get(p.client_id) || "",
        programme_name: p.programme_name || "",
        is_active: p.is_active ? "oui" : "non",
        uploaded_at: p.uploaded_at,
        html_size_kb: p.html_content ? Math.round((p.html_content.length || 0) / 1024) : 0,
      }));
      const csv = rowsToCsv(["client_email", "programme_name", "is_active", "uploaded_at", "html_size_kb"], rows);
      downloadCsv(`rbperform-programmes-${Date.now()}.csv`, csv);
      toast.success(`${rows.length} programme(s) listé(s)`);
    } catch (e) {
      toast.error(e.message || "Export échoué");
    } finally { setBusy(null); }
  }

  const exports = [
    { id: "clients",    label: "Liste clients",                desc: "Email, nom, statut abonnement, dernière activité, date d'inscription.", action: exportClients },
    { id: "weights",    label: "Historique pesées",           desc: "Toutes les pesées de tous tes clients (date + poids + note).",          action: exportWeights },
    { id: "sessions",   label: "Sessions d'entraînement",     desc: "Tous les sets de tous tes clients (CSV plat). 1 ligne = 1 série.",      action: exportSessions },
    { id: "programmes", label: "Liste des programmes",         desc: "Mapping client → programme (HTML complet via export JSON GDPR).",        action: exportProgrammes },
  ];

  return (
    <div>
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase", color: G, marginBottom: 6 }}>
          Tes données t'appartiennent
        </div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", lineHeight: 1.55 }}>
          Tu peux exporter toutes tes données business en CSV à tout moment. Pas de lock-in : si tu quittes RB Perform, tu pars avec.
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {exports.map((ex) => (
          <div key={ex.id} style={{
            display: "flex", alignItems: "center", gap: 14,
            padding: "14px 16px",
            background: "rgba(255,255,255,0.025)",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 12,
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", marginBottom: 3 }}>{ex.label}</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", lineHeight: 1.5 }}>{ex.desc}</div>
            </div>
            <button
              type="button"
              onClick={ex.action}
              disabled={busy != null}
              style={{
                padding: "8px 14px",
                background: busy === ex.id ? "rgba(2,209,186,0.25)" : "rgba(2,209,186,0.1)",
                border: "1px solid rgba(2,209,186,0.3)",
                borderRadius: 10,
                color: G, fontSize: 11, fontWeight: 700,
                cursor: busy != null ? "wait" : "pointer",
                fontFamily: "inherit",
                whiteSpace: "nowrap",
                opacity: busy != null && busy !== ex.id ? 0.4 : 1,
                display: "flex", alignItems: "center", gap: 6,
                flexShrink: 0,
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              {busy === ex.id ? "Export…" : "CSV"}
            </button>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 16, fontSize: 11, color: "rgba(255,255,255,0.35)", lineHeight: 1.6 }}>
        Format CSV UTF-8 avec BOM (Excel/Numbers compatible). Pour un export JSON complet (RGPD art. 20), utilise l'onglet Sécurité.
      </div>
    </div>
  );
}

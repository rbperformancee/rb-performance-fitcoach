/**
 * InvoiceHistory — historique des factures + reçus émis par le coach.
 *
 * Affiché dans Settings > Paiements. Liste paginée des 50 dernières,
 * filtrable par client, avec bouton télécharger via signed URL.
 *
 * Performance : on charge 50 factures + 50 reçus en parallèle au mount,
 * puis on filtre/trie côté client. Suffisant pour < 500 lignes total ;
 * au-delà on paginera serveur-side.
 */

import React, { useEffect, useState, useMemo } from "react";
import { useT } from "../../lib/i18n";
import { getDateLocale } from "../../lib/i18n";
import { supabase } from "../../lib/supabase";
import { toast } from "../Toast";
import haptic from "../../lib/haptic";
import { getInvoiceSignedUrl } from "../../lib/invoiceStorage";
import AppIcon from "../AppIcon";

const G = "#02d1ba";
const BORDER = "rgba(255,255,255,0.08)";

export default function InvoiceHistory({ coachId }) {
  const t = useT();
  const [invoices, setInvoices] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState(""); // recherche par nom client
  const [tab, setTab] = useState("invoices"); // "invoices" | "receipts"
  const [downloading, setDownloading] = useState(null);

  useEffect(() => {
    if (!coachId) return;
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const [invRes, recRes] = await Promise.all([
          supabase
            .from("invoices")
            .select("id, invoice_number, client_name, client_email, amount, total_ttc, status, installments_count, pdf_url, issued_at, created_at")
            .eq("coach_id", coachId)
            .order("created_at", { ascending: false })
            .limit(50),
          supabase
            .from("receipts")
            .select("id, receipt_number, amount_eur, payment_method, paid_at, pdf_url, invoice_id, clients ( full_name )")
            .eq("coach_id", coachId)
            .order("paid_at", { ascending: false })
            .limit(50),
        ]);
        if (!mounted) return;
        setInvoices(invRes.data || []);
        setReceipts(recRes.data || []);
      } catch (e) {
        console.warn("[InvoiceHistory] load failed:", e.message);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [coachId]);

  const filteredInvoices = useMemo(() => {
    if (!filter.trim()) return invoices;
    const q = filter.toLowerCase().trim();
    return invoices.filter(
      (i) =>
        (i.client_name || "").toLowerCase().includes(q) ||
        (i.invoice_number || "").toLowerCase().includes(q)
    );
  }, [invoices, filter]);

  const filteredReceipts = useMemo(() => {
    if (!filter.trim()) return receipts;
    const q = filter.toLowerCase().trim();
    return receipts.filter(
      (r) =>
        (r.clients?.full_name || "").toLowerCase().includes(q) ||
        (r.receipt_number || "").toLowerCase().includes(q)
    );
  }, [receipts, filter]);

  async function download(item, type) {
    if (!item.pdf_url) {
      toast.error("PDF non disponible pour cette pièce");
      return;
    }
    setDownloading(item.id);
    haptic.light();
    try {
      const signedUrl = await getInvoiceSignedUrl(item.pdf_url, 60);
      if (!signedUrl) throw new Error("URL signée indisponible");
      // Ouvre dans un nouvel onglet (force download via attribute)
      const a = document.createElement("a");
      a.href = signedUrl;
      a.target = "_blank";
      a.rel = "noopener";
      a.download = `${type === "invoice" ? item.invoice_number : item.receipt_number}.pdf`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => document.body.removeChild(a), 200);
    } catch (e) {
      toast.error("Téléchargement impossible : " + e.message);
    }
    setDownloading(null);
  }

  // Stats globales (haut de section)
  const totalInvoiced = invoices.reduce((s, i) => s + Number(i.total_ttc || i.amount || 0), 0);
  const totalReceived = receipts.reduce((s, r) => s + Number(r.amount_eur || 0), 0);

  if (loading) {
    return (
      <div style={{ marginTop: 22, padding: 22, textAlign: "center", color: "rgba(255,255,255,.4)", fontSize: 12 }}>
        Chargement de l'historique…
      </div>
    );
  }

  // Pas d'historique → pas d'affichage (évite le bruit pour les nouveaux coachs)
  if (invoices.length === 0 && receipts.length === 0) return null;

  return (
    <div style={{ marginTop: 22, padding: "20px 22px", background: "rgba(255,255,255,.025)", border: ".5px solid rgba(255,255,255,.07)", borderRadius: 16 }}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".22em", textTransform: "uppercase", color: G, marginBottom: 4 }}>
          Factures & reçus émis
        </div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,.55)", lineHeight: 1.5 }}>
          Toutes tes pièces comptables stockées 10 ans (obligation légale).
        </div>
      </div>

      {/* Stats compactes */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
        <div style={{ padding: "10px 12px", background: "rgba(255,255,255,.025)", border: `.5px solid ${BORDER}`, borderRadius: 10 }}>
          <div style={{ fontSize: 9, color: "rgba(255,255,255,.4)", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 4 }}>Facturé</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#fff", letterSpacing: -0.3 }}>
            {totalInvoiced.toLocaleString("fr-FR")} €
          </div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,.4)", marginTop: 2 }}>{invoices.length} facture{invoices.length > 1 ? "s" : ""}</div>
        </div>
        <div style={{ padding: "10px 12px", background: "rgba(2,209,186,.05)", border: `.5px solid ${G}33`, borderRadius: 10 }}>
          <div style={{ fontSize: 9, color: `${G}aa`, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 4 }}>Encaissé</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: G, letterSpacing: -0.3 }}>
            {totalReceived.toLocaleString("fr-FR")} €
          </div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,.4)", marginTop: 2 }}>{receipts.length} reçu{receipts.length > 1 ? "s" : ""}</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 12, padding: 4, background: "rgba(0,0,0,.3)", borderRadius: 100 }}>
        {[
          { id: "invoices", label: `Factures (${invoices.length})` },
          { id: "receipts", label: `Reçus (${receipts.length})` },
        ].map((opt) => (
          <button
            key={opt.id}
            onClick={() => setTab(opt.id)}
            style={{
              flex: 1, padding: "8px 12px",
              background: tab === opt.id ? `${G}15` : "transparent",
              border: "none", borderRadius: 100,
              color: tab === opt.id ? G : "rgba(255,255,255,.55)",
              fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
              letterSpacing: 0.4,
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Filtre */}
      <input
        type="search"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Rechercher (nom client ou numéro)…"
        style={{
          width: "100%", height: 36, padding: "0 12px", marginBottom: 12,
          background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER}`,
          borderRadius: 10, color: "#fff", fontSize: 12, fontFamily: "inherit",
          outline: "none", boxSizing: "border-box",
        }}
      />

      {/* Liste */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 380, overflowY: "auto" }}>
        {tab === "invoices" && filteredInvoices.length === 0 && (
          <div style={{ padding: 14, textAlign: "center", fontSize: 11, color: "rgba(255,255,255,.35)" }}>
            Aucune facture.
          </div>
        )}
        {tab === "invoices" && filteredInvoices.map((i) => (
          <Row
            key={i.id}
            number={i.invoice_number}
            client={i.client_name}
            amount={Number(i.total_ttc || i.amount || 0)}
            date={i.issued_at || i.created_at}
            extra={i.installments_count > 1 ? `${i.installments_count}x` : null}
            badge={i.status === "paid" ? { label: "Payée", color: G } : null}
            onDownload={() => download(i, "invoice")}
            downloading={downloading === i.id}
            hasPdf={!!i.pdf_url}
          />
        ))}

        {tab === "receipts" && filteredReceipts.length === 0 && (
          <div style={{ padding: 14, textAlign: "center", fontSize: 11, color: "rgba(255,255,255,.35)" }}>
            Aucun reçu.
          </div>
        )}
        {tab === "receipts" && filteredReceipts.map((r) => (
          <Row
            key={r.id}
            number={r.receipt_number}
            client={r.clients?.full_name}
            amount={Number(r.amount_eur || 0)}
            date={r.paid_at}
            extra={r.payment_method}
            onDownload={() => download(r, "receipt")}
            downloading={downloading === r.id}
            hasPdf={!!r.pdf_url}
          />
        ))}
      </div>

      {(invoices.length === 50 || receipts.length === 50) && (
        <div style={{ marginTop: 12, fontSize: 10, color: "rgba(255,255,255,.4)", textAlign: "center" }}>
          Affichage des 50 plus récents. Pagination complète bientôt disponible.
        </div>
      )}
    </div>
  );
}

function Row({ number, client, amount, date, extra, badge, onDownload, downloading, hasPdf }) {
  const G = "#02d1ba";
  const dStr = date ? new Date(date).toLocaleDateString(getDateLocale(), { day: "2-digit", month: "short", year: "2-digit" }) : "—";
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "10px 12px",
      background: "rgba(255,255,255,.02)",
      border: "1px solid rgba(255,255,255,.05)",
      borderRadius: 10,
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#fff", fontFamily: "'DM Sans',-apple-system,sans-serif", letterSpacing: 0.3 }}>
            {number}
          </span>
          {badge && (
            <span style={{
              fontSize: 8, padding: "2px 6px", borderRadius: 100,
              background: `${badge.color}22`, color: badge.color,
              fontWeight: 800, letterSpacing: 0.5, textTransform: "uppercase",
            }}>{badge.label}</span>
          )}
        </div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,.6)", lineHeight: 1.4 }}>
          {client || "—"}
          {extra && <span style={{ color: "rgba(255,255,255,.35)" }}> · {extra}</span>}
          <span style={{ color: "rgba(255,255,255,.35)" }}> · {dStr}</span>
        </div>
      </div>
      <div style={{ fontSize: 13, fontWeight: 800, color: "#fff", flexShrink: 0 }}>
        {amount.toLocaleString("fr-FR")} €
      </div>
      <button
        onClick={onDownload}
        disabled={downloading || !hasPdf}
        style={{
          padding: 8, background: hasPdf ? `${G}15` : "transparent",
          border: `1px solid ${hasPdf ? `${G}33` : "rgba(255,255,255,.08)"}`,
          borderRadius: 8, color: hasPdf ? G : "rgba(255,255,255,.25)",
          cursor: hasPdf ? "pointer" : "not-allowed",
          flexShrink: 0, lineHeight: 0, opacity: downloading ? 0.5 : 1,
        }}
        title={hasPdf ? "Télécharger" : "PDF non stocké"}
      >
        <AppIcon name="download" size={14} color={hasPdf ? G : "rgba(255,255,255,.25)"} />
      </button>
    </div>
  );
}

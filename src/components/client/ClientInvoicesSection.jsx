/**
 * ClientInvoicesSection — l'espace facture vu côté CLIENT.
 *
 * S'affiche dans l'app client (ClientHome ou ClientSuivi).
 * Liste les factures + reçus que le coach a émis pour CE client.
 * Téléchargement via signed URLs (le bucket coach-invoices est privé).
 *
 * Reste invisible si aucune facture/reçu n'a été émis pour ce client.
 */

import React, { useEffect, useState } from "react";
import { getDateLocale } from "../../lib/i18n";
import { supabase } from "../../lib/supabase";
import { toast } from "../Toast";
import haptic from "../../lib/haptic";
import { getInvoiceSignedUrl } from "../../lib/invoiceStorage";
import AppIcon from "../AppIcon";

const G = "#02d1ba";

export default function ClientInvoicesSection({ client, accent = G }) {
  const [invoices, setInvoices] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(null);

  useEffect(() => {
    if (!client?.id) return;
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const [invRes, recRes] = await Promise.all([
          supabase
            .from("invoices")
            .select("id, invoice_number, amount, total_ttc, status, installments_count, pdf_url, issued_at, created_at")
            .eq("client_id", client.id)
            .order("created_at", { ascending: false })
            .limit(50),
          supabase
            .from("receipts")
            .select("id, receipt_number, amount_eur, payment_method, paid_at, pdf_url")
            .eq("client_id", client.id)
            .order("paid_at", { ascending: false })
            .limit(50),
        ]);
        if (!mounted) return;
        setInvoices(invRes.data || []);
        setReceipts(recRes.data || []);
      } catch (e) {
        console.warn("[ClientInvoicesSection] load failed:", e.message);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [client?.id]);

  async function download(item, type) {
    if (!item.pdf_url) {
      toast.error("PDF non disponible");
      return;
    }
    setDownloading(item.id);
    haptic.light();
    try {
      const signedUrl = await getInvoiceSignedUrl(item.pdf_url, 60);
      if (!signedUrl) throw new Error("URL signée indisponible");
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

  if (loading) return null;
  if (invoices.length === 0 && receipts.length === 0) return null;

  return (
    <div style={{
      marginTop: 24, padding: "20px 22px",
      background: "rgba(255,255,255,.025)", border: ".5px solid rgba(255,255,255,.07)",
      borderRadius: 16,
    }}>
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".22em", textTransform: "uppercase", color: accent, marginBottom: 4 }}>
          Mes documents
        </div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,.55)", lineHeight: 1.5 }}>
          Toutes tes factures et reçus émis par ton coach.
        </div>
      </div>

      {/* Liste mêlée chronologiquement : factures + reçus dans la même timeline */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {invoices.map((i) => (
          <ClientDocRow
            key={`inv-${i.id}`}
            type="invoice"
            number={i.invoice_number}
            amount={Number(i.total_ttc || i.amount || 0)}
            date={i.issued_at || i.created_at}
            extra={i.installments_count > 1 ? `${i.installments_count}x` : "1x"}
            onDownload={() => download(i, "invoice")}
            downloading={downloading === i.id}
            hasPdf={!!i.pdf_url}
            accent={accent}
          />
        ))}
        {receipts.map((r) => (
          <ClientDocRow
            key={`rec-${r.id}`}
            type="receipt"
            number={r.receipt_number}
            amount={Number(r.amount_eur || 0)}
            date={r.paid_at}
            extra={r.payment_method || null}
            onDownload={() => download(r, "receipt")}
            downloading={downloading === r.id}
            hasPdf={!!r.pdf_url}
            accent={accent}
          />
        ))}
      </div>
    </div>
  );
}

function ClientDocRow({ type, number, amount, date, extra, onDownload, downloading, hasPdf, accent }) {
  const isInvoice = type === "invoice";
  const label = isInvoice ? "Facture" : "Reçu";
  const dStr = date ? new Date(date).toLocaleDateString(getDateLocale(), { day: "2-digit", month: "short", year: "2-digit" }) : "—";
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "10px 12px",
      background: "rgba(255,255,255,.02)",
      border: "1px solid rgba(255,255,255,.05)",
      borderRadius: 10,
    }}>
      <div style={{
        width: 28, height: 28, borderRadius: 8, flexShrink: 0,
        background: isInvoice ? `${accent}15` : "rgba(255,255,255,.06)",
        border: `1px solid ${isInvoice ? `${accent}33` : "rgba(255,255,255,.1)"}`,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <AppIcon name="file" size={13} color={isInvoice ? accent : "rgba(255,255,255,.5)"} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
          <span style={{ fontSize: 9, fontWeight: 800, color: isInvoice ? accent : "rgba(255,255,255,.55)", letterSpacing: 1, textTransform: "uppercase" }}>
            {label}
          </span>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,.5)", fontFamily: "'DM Sans',-apple-system,sans-serif" }}>
            {number}
          </span>
        </div>
        <div style={{ fontSize: 10, color: "rgba(255,255,255,.4)", lineHeight: 1.4 }}>
          {dStr}{extra && ` · ${extra}`}
        </div>
      </div>
      <div style={{ fontSize: 13, fontWeight: 800, color: "#fff", flexShrink: 0 }}>
        {amount.toLocaleString("fr-FR")} €
      </div>
      <button
        onClick={onDownload}
        disabled={downloading || !hasPdf}
        style={{
          padding: 8, background: hasPdf ? `${accent}15` : "transparent",
          border: `1px solid ${hasPdf ? `${accent}33` : "rgba(255,255,255,.08)"}`,
          borderRadius: 8, color: hasPdf ? accent : "rgba(255,255,255,.25)",
          cursor: hasPdf ? "pointer" : "not-allowed",
          flexShrink: 0, lineHeight: 0, opacity: downloading ? 0.5 : 1,
        }}
        title={hasPdf ? "Télécharger" : "PDF non stocké"}
      >
        <AppIcon name="download" size={13} color={hasPdf ? accent : "rgba(255,255,255,.25)"} />
      </button>
    </div>
  );
}

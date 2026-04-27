import React, { useMemo, useState } from "react";
import {
  calculateChurnRisk,
  churnLevel,
  churnMessage,
  calculateRenewalProbability,
  renewalColor,
  renewalAction,
  bestContactMoment,
  bestContactText,
} from "../../lib/coachIntelligence";
import AppIcon from "../AppIcon";
import { toast } from "../Toast";
import haptic from "../../lib/haptic";
import { useT } from "../../lib/i18n";

const fillTpl = (s, vars) => {
  let out = s;
  Object.entries(vars).forEach(([k, v]) => { out = out.split(`{${k}}`).join(String(v)); });
  return out;
};

const RED = "#ef4444";
const ORANGE = "#f97316";
const G = "#02d1ba";

/**
 * ChurnAlertsSection — liste prioritaire des clients a risque.
 * Affiche :
 *   - Clients avec score churn >= 40 (eleve ou critique)
 *   - Clients dont l'abonnement expire dans <=14j avec proba renouvellement
 *   - Bouton "Copier le message" de relance pre-redige
 *   - Meilleur moment pour contacter (base sur logs)
 */
export default function ChurnAlertsSection({ clients = [], onOpenClient }) {
  const t = useT();
  const [showAll, setShowAll] = useState(false);

  const atRisk = useMemo(() => {
    if (!clients) return [];
    return clients
      .map((c) => {
        const score = calculateChurnRisk(c);
        const renewalProba = calculateRenewalProbability(c);
        const daysLeft = c.subscription_end_date
          ? Math.ceil((new Date(c.subscription_end_date).getTime() - Date.now()) / 86400000)
          : null;
        const expiringSoon = daysLeft !== null && daysLeft > 0 && daysLeft <= 14;
        const subExpired = daysLeft !== null && daysLeft <= 0;
        return { ...c, _churnScore: score, _renewalProba: renewalProba, _daysLeft: daysLeft, _expiringSoon: expiringSoon, _subExpired: subExpired };
      })
      .filter((c) => c._churnScore >= 40 || c._expiringSoon || c._subExpired)
      .sort((a, b) => {
        // Priorite : expired > churn critique > expiring soon > churn eleve
        if (a._subExpired !== b._subExpired) return a._subExpired ? -1 : 1;
        return b._churnScore - a._churnScore;
      });
  }, [clients]);

  if (atRisk.length === 0) {
    return (
      <div style={{ marginBottom: 40, animation: "fadeUp 0.4s ease both" }}>
        <SectionHeader />
        <div style={{ padding: "24px 22px", background: "rgba(2,209,186,0.04)", border: "1px solid rgba(2,209,186,0.2)", borderRadius: 16, display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 42, height: 42, borderRadius: "50%", background: "rgba(2,209,186,0.12)", display: "flex", alignItems: "center", justifyContent: "center", color: G, flexShrink: 0 }}>
            <AppIcon name="check-circle" size={22} color={G} />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: "#fff", marginBottom: 2 }}>{t("ca.empty_title")}</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>{t("ca.empty_sub")}</div>
          </div>
        </div>
      </div>
    );
  }

  const visible = showAll ? atRisk : atRisk.slice(0, 5);

  return (
    <div style={{ marginBottom: 40, animation: "fadeUp 0.4s ease both" }}>
      <SectionHeader count={atRisk.length} />

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {visible.map((c) => (
          <ClientAlertCard key={c.id} client={c} onOpenClient={onOpenClient} />
        ))}
      </div>

      {atRisk.length > 5 && (
        <button
          onClick={() => { haptic.light(); setShowAll((s) => !s); }}
          style={{ marginTop: 10, width: "100%", padding: "10px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, color: "rgba(255,255,255,0.6)", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", letterSpacing: "0.5px", textTransform: "uppercase" }}
        >
          {showAll ? t("ca.see_less") : fillTpl(atRisk.length - 5 > 1 ? t("ca.see_more_many") : t("ca.see_more_one"), { n: atRisk.length - 5 })}
        </button>
      )}
    </div>
  );
}

function SectionHeader({ count }) {
  const t = useT();
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
      <div style={{ flex: 1, height: "1px", background: "linear-gradient(90deg,#f97316,transparent)" }} />
      <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "3px", textTransform: "uppercase", color: "#f97316", fontFamily: "'DM Sans',sans-serif", whiteSpace: "nowrap" }}>
        {t("ca.section_label")}
      </span>
      {count > 0 && (
        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", background: "rgba(255,255,255,0.04)", padding: "3px 10px", borderRadius: 100, fontWeight: 700 }}>
          {fillTpl(t("ca.count_to_act"), { n: count })}
        </div>
      )}
      <div style={{ flex: 1, height: "1px", background: "linear-gradient(270deg,#f97316,transparent)" }} />
    </div>
  );
}

function ClientAlertCard({ client, onOpenClient }) {
  const t = useT();
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const lvl = churnLevel(client._churnScore);
  const firstName = client.full_name?.split(" ")[0] || client.email?.split("@")[0] || "—";
  const message = churnMessage(client, client._churnScore);
  const moment = bestContactMoment(client._logTimestamps || []);
  const momentText = bestContactText(client, moment);
  const renewalCol = renewalColor(client._renewalProba);

  const copyMessage = async () => {
    try {
      await navigator.clipboard.writeText(message);
      haptic.light();
      setCopied(true);
      toast.success(t("ca.toast_copied"));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t("ca.toast_copy_error"));
    }
  };

  const isExpiring = client._expiringSoon || client._subExpired;

  return (
    <div
      style={{
        background: "rgba(255,255,255,0.025)",
        border: `1px solid ${lvl.color}25`,
        borderRadius: 14,
        padding: 16,
        overflow: "hidden",
      }}
    >
      {/* Header : nom + score + chevron */}
      <div
        onClick={() => { haptic.light(); setExpanded(!expanded); }}
        style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}
      >
        {/* Avatar colore avec initiale */}
        <div style={{ width: 38, height: 38, borderRadius: "50%", background: `${lvl.color}18`, border: `1px solid ${lvl.color}40`, display: "flex", alignItems: "center", justifyContent: "center", color: lvl.color, fontWeight: 800, fontSize: 14, flexShrink: 0 }}>
          {firstName[0]?.toUpperCase() || "?"}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {client.full_name || client.email?.split("@")[0]}
          </div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            {client._subExpired ? (
              <span style={{ color: RED, fontWeight: 700 }}>{t("ca.subscription_expired")}</span>
            ) : client._expiringSoon ? (
              <span style={{ color: ORANGE, fontWeight: 700 }}>{fillTpl(t("ca.expires_in_days"), { n: client._daysLeft })}</span>
            ) : (
              <span>{fillTpl(t("ca.days_no_activity"), { n: client._inactiveDays ?? 0 })}</span>
            )}
          </div>
        </div>
        {/* Score badge */}
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 9, letterSpacing: "1.5px", textTransform: "uppercase", fontWeight: 700, color: lvl.color, background: `${lvl.color}18`, padding: "3px 9px", borderRadius: 100, marginBottom: 4 }}>
            {lvl.label}
          </div>
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 17, fontWeight: 800, color: lvl.color, lineHeight: 1 }}>
            {client._churnScore}
          </div>
        </div>
        <AppIcon name="arrow-right" size={14} color="rgba(255,255,255,0.3)" style={{ transform: expanded ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.2s" }} />
      </div>

      {/* Content expanded */}
      {expanded && (
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.05)", display: "flex", flexDirection: "column", gap: 12, animation: "carFade 0.25s ease both" }}>
          <style>{`@keyframes carFade{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}`}</style>

          {/* Renewal probability si expiring */}
          {(client._expiringSoon || client._subExpired) && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <div style={{ fontSize: 10, letterSpacing: "1.5px", textTransform: "uppercase", color: "rgba(255,255,255,0.4)", fontWeight: 700 }}>
                  {t("ca.renewal_proba_label")}
                </div>
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 14, fontWeight: 800, color: renewalCol }}>
                  {client._renewalProba}%
                </div>
              </div>
              <div style={{ height: 4, background: "rgba(255,255,255,0.05)", borderRadius: 2, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${client._renewalProba}%`, background: renewalCol, borderRadius: 2 }} />
              </div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 6, lineHeight: 1.5 }}>
                {renewalAction(client._renewalProba, client)}
              </div>
            </div>
          )}

          {/* Message pre-redige */}
          <div>
            <div style={{ fontSize: 10, letterSpacing: "1.5px", textTransform: "uppercase", color: "rgba(255,255,255,0.4)", fontWeight: 700, marginBottom: 6 }}>
              {t("ca.message_suggested_label")}
            </div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.75)", lineHeight: 1.55, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 10, padding: "10px 12px", fontStyle: "italic" }}>
              {message}
            </div>
          </div>

          {/* Meilleur moment */}
          {moment && (
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", display: "flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.02)", padding: "8px 12px", borderRadius: 10 }}>
              <AppIcon name="clock" size={12} color="rgba(255,255,255,0.4)" />
              {momentText}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={copyMessage}
              style={{ flex: 1, padding: "11px", background: copied ? G : "rgba(2,209,186,0.08)", color: copied ? "#000" : G, border: `1px solid ${G}25`, borderRadius: 10, fontSize: 11, fontWeight: 800, letterSpacing: "0.5px", textTransform: "uppercase", cursor: "pointer", fontFamily: "inherit", minHeight: 38, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }}
            >
              <AppIcon name="message" size={12} color={copied ? "#000" : G} />
              {copied ? t("ca.copied") : t("ca.copy_message")}
            </button>
            {onOpenClient && (
              <button
                onClick={() => { haptic.light(); onOpenClient(client); }}
                style={{ flex: 1, padding: "11px", background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.75)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, fontSize: 11, fontWeight: 700, letterSpacing: "0.5px", textTransform: "uppercase", cursor: "pointer", fontFamily: "inherit", minHeight: 38 }}
              >
                {t("ca.see_profile")}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

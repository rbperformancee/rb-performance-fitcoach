import React from "react";

const G = "#02d1ba";

/**
 * HelpMigrationGuide — page d'aide / FAQ pour les coachs qui migrent
 * depuis Trainerize / Hexfit / Eklo / Hapyo. Affichée :
 *   1. Pendant l'onboarding (step "migrer mes clients" optionnel)
 *   2. À tout moment depuis MonCompte > onglet Aide ou un lien direct
 *
 * Structure : modale plein écran avec 4 sections actionables (chacune
 * pointe vers la feature correspondante de l'app).
 *
 * Props :
 *   open: bool, onClose: () => void
 *   onOpenBulkInvite: () => void
 *   onOpenWeightImport?: () => void  // optionnel — depuis l'onboarding pas dispo
 *   onOpenDataExport?: () => void
 */

export default function HelpMigrationGuide({
  open,
  onClose,
  onOpenBulkInvite,
  onOpenWeightImport,
  onOpenDataExport,
}) {
  if (!open) return null;

  const sections = [
    {
      step: "01",
      title: "Liste de tes clients",
      desc: "Exporte ta liste clients depuis Trainerize / Hexfit / Eklo en CSV (1 colonne email minimum, prénom + téléphone optionnels). Drop le fichier — on détecte les colonnes automatiquement et on envoie 20 invitations en 2 minutes.",
      cta: onOpenBulkInvite ? { label: "Importer une liste CSV", onClick: onOpenBulkInvite } : null,
      tip: "Ton ancienne app n'autorise pas l'export ? Mass-paste 30 emails séparés par des virgules dans le champ d'invitation simple, ça marche aussi.",
    },
    {
      step: "02",
      title: "Programme actuel de chaque client",
      desc: "Le builder permet de recréer un programme en 10 minutes (ou de coller un HTML existant). Pour les clients en cours, recrée juste la semaine en cours — le reste vient au fil de l'eau.",
      cta: null,
      tip: "Tu peux aussi choisir un template pré-fait (PPL, FullBody, Powerlift, Hybrid) au step 4 de ton onboarding et l'adapter à chaque client.",
    },
    {
      step: "03",
      title: "Pesées historiques (optionnel)",
      desc: "Si ton ancienne app ou la balance connectée du client (Withings, Garmin) exporte un CSV poids/date, importe-le dans la fiche client. Le graphe d'évolution reste continu — le client n'a pas l'impression de repartir à zéro.",
      cta: onOpenWeightImport ? { label: "Importer pesées (depuis fiche client)", onClick: onOpenWeightImport } : null,
      tip: null,
    },
    {
      step: "04",
      title: "Charges actuelles (1RM Squat / DC / Deadlift)",
      desc: "Pas besoin d'importer. Le client tape ses charges actuelles à sa 1ère connexion (formulaire 30 secondes). Tu as les chiffres pour calibrer son programme dès le départ.",
      cta: null,
      tip: "Tout le reste de l'historique d'entraînement (chaque rep des 6 derniers mois) est intentionnellement ignoré — aucune app n'expose ces données proprement, et 4-6 semaines de logging sur RB Perform reconstruisent ce qui compte.",
    },
  ];

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
      style={{
        position: "fixed", inset: 0, zIndex: 1200,
        background: "rgba(0,0,0,0.85)", backdropFilter: "blur(12px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20, overflowY: "auto",
        fontFamily: "-apple-system,'Inter',sans-serif",
      }}
    >
      <div style={{
        background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 20, maxWidth: 680, width: "100%", maxHeight: "90vh",
        display: "flex", flexDirection: "column", overflow: "hidden",
      }}>
        {/* HEADER */}
        <div style={{
          padding: "26px 28px 22px",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
          background: `linear-gradient(180deg, ${G}10 0%, transparent 100%)`,
          display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16,
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: 3.5, color: G, textTransform: "uppercase", marginBottom: 8 }}>
              Aide · Migrer depuis une autre app
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", letterSpacing: -0.5, lineHeight: 1.2, marginBottom: 6 }}>
              4 étapes, 30 minutes max.
            </div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", lineHeight: 1.55 }}>
              Trainerize, Hexfit, Eklo, Hapyo, Excel — peu importe d'où tu viens. On a pensé chaque étape pour minimiser ton temps.
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            style={{ width: 34, height: 34, borderRadius: 10, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.7)", cursor: "pointer", fontSize: 18, lineHeight: 1, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}
          >×</button>
        </div>

        {/* CONTENT */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 28px 28px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {sections.map((s, i) => (
              <div key={i} style={{
                padding: 18,
                background: "rgba(255,255,255,0.025)",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: 14,
              }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 8 }}>
                  <div style={{
                    fontSize: 11, fontWeight: 800, letterSpacing: 1.5, color: G,
                    fontFamily: "'JetBrains Mono','SF Mono',monospace", flexShrink: 0,
                  }}>{s.step}</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#fff", letterSpacing: -0.2 }}>{s.title}</div>
                </div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", lineHeight: 1.6, marginBottom: s.tip || s.cta ? 12 : 0 }}>
                  {s.desc}
                </div>
                {s.tip && (
                  <div style={{
                    fontSize: 11, color: "rgba(255,255,255,0.45)", lineHeight: 1.55,
                    padding: "8px 12px",
                    background: "rgba(255,255,255,0.02)",
                    borderLeft: `2px solid ${G}40`,
                    borderRadius: 4,
                    marginBottom: s.cta ? 12 : 0,
                  }}>
                    <strong style={{ color: G, fontSize: 9, letterSpacing: 1.5, textTransform: "uppercase", display: "block", marginBottom: 3 }}>Astuce</strong>
                    {s.tip}
                  </div>
                )}
                {s.cta && (
                  <button
                    type="button"
                    onClick={() => { onClose?.(); s.cta.onClick(); }}
                    style={{
                      padding: "8px 14px",
                      background: `${G}15`,
                      border: `1px solid ${G}40`,
                      borderRadius: 10,
                      color: G, fontSize: 11, fontWeight: 700,
                      cursor: "pointer", fontFamily: "inherit",
                      display: "inline-flex", alignItems: "center", gap: 6,
                    }}
                  >
                    {s.cta.label} →
                  </button>
                )}
              </div>
            ))}

            {/* CTA secondaire : data portability */}
            {onOpenDataExport && (
              <div style={{
                padding: 14,
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.05)",
                borderRadius: 12,
                fontSize: 12, color: "rgba(255,255,255,0.55)",
                display: "flex", alignItems: "center", gap: 12,
                lineHeight: 1.55,
              }}>
                <div style={{ flex: 1 }}>
                  <strong style={{ color: "rgba(255,255,255,0.85)" }}>Pas de lock-in.</strong> Tu peux exporter toutes tes données business en CSV à n'importe quel moment.
                </div>
                <button
                  type="button"
                  onClick={() => { onClose?.(); onOpenDataExport(); }}
                  style={{
                    padding: "6px 10px",
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 8,
                    color: "rgba(255,255,255,0.7)",
                    fontSize: 11, fontWeight: 700, cursor: "pointer",
                    fontFamily: "inherit", whiteSpace: "nowrap",
                  }}
                >Mes données</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

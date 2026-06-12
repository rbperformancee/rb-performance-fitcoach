import React from "react";
import { RB_SUPPORT_EMAIL } from "../lib/branding";

export function PrivacyPolicy({ onClose }) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 999,
      background: "rgba(0,0,0,0.9)", WebkitBackdropFilter: "blur(20px)", backdropFilter: "blur(20px)",
      overflowY: "auto", padding: "32px 20px",
      fontFamily: "'Inter', sans-serif",
    }}>
      <div style={{ maxWidth: 600, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", color: "#02d1ba", marginBottom: 6 }}>Politique de confidentialité</div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: "#f5f5f5", margin: 0 }}>RB Perform</h1>
          </div>
          {onClose && (
            <button onClick={onClose} style={{ background: "rgba(255,255,255,0.08)", border: "none", borderRadius: 8, width: 36, height: 36, color: "#f5f5f5", fontSize: 18, cursor: "pointer" }}>×</button>
          )}
        </div>

        <div style={{ fontSize: 12, color: "#555", marginBottom: 28 }}>Dernière mise à jour : {new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}</div>

        {[
          {
            title: "1. Qui sommes-nous ?",
            content: `RB Perform est un service de suivi sportif personnalisé exploité par Rayan Bonte (${RB_SUPPORT_EMAIL}). Dans le cadre du Règlement Général sur la Protection des Données (RGPD), Rayan Bonte agit en qualité de responsable de traitement.`
          },
          {
            title: "2. Données collectées",
            content: `Nous collectons les données suivantes :\n\n• Adresse email (identification et authentification)\n• Prénom et nom (optionnel, fourni par Rayan)\n• Données d'entraînement : exercices réalisés, charges, répétitions, séries\n• Données de composition corporelle : poids, pourcentage de masse grasse (saisie volontaire)\n• Ressenti d'entraînement (RPE) : niveau de fatigue perçu après chaque séance\n• Notes personnelles liées aux séances (optionnel)\n\nDans l'application iOS native uniquement, et SI vous accordez les permissions :\n\n• Données de localisation pendant un run (trajet GPS, distance, allure) — stockées dans votre compte\n• Données HealthKit (fréquence cardiaque, VO2max, foulée) — lues localement, non transmises sans votre consentement\n• Photos (selfie de fin de séance, story de partage) — stockées dans le cache de l'app puis partagées via le système iOS\n• Identifiant push APNs (token anonyme Apple) — pour vous envoyer les rappels de séance et messages du préparateur`
          },
          {
            title: "3. Finalités du traitement",
            content: `Vos données sont utilisées exclusivement pour :\n\n• Vous permettre d'accéder à votre programme d'entraînement personnalisé\n• Suivre votre progression et vos performances sportives\n• Permettre à Rayan de personnaliser votre accompagnement\n• Générer des rapports de progression (export PDF)\n• Vous envoyer des communications liées à votre programme`
          },
          {
            title: "4. Base légale",
            content: `Le traitement de vos données est fondé sur :\n\n• Votre consentement explicite, donné lors de la création de votre compte\n• L'exécution du contrat de suivi sportif entre vous et RB Perform\n\nLes données de santé (poids, composition corporelle, ressenti physique) sont traitées sur la base de votre consentement explicite, que vous pouvez retirer à tout moment.`
          },
          {
            title: "5. Hébergement et sous-traitants",
            content: `Vos données sont hébergées et traitées par les sous-traitants suivants :\n\n• Supabase Inc. (base de données) — serveurs en Irlande, Union Européenne ✅\n• Vercel Inc. (application web et API) — serveurs en Europe\n• Resend (envoi d'emails) — conformité RGPD garantie\n• Apple Inc. (distribution iOS et notifications push APNs) — uniquement pour l'application native iOS\n• Mistral AI (assistant FAQ) — serveurs en Europe, uniquement quand vous utilisez l'assistant\n\nAucune donnée n'est transmise à des tiers à des fins commerciales ou publicitaires.\n\nAucune donnée n'est partagée avec Apple à des fins de profilage. L'identifiant de push (APNs token) sert uniquement à acheminer les notifications.`
          },
          {
            title: "6. Permissions iOS et contrôle utilisateur (app native)",
            content: `Sur l'application iOS native, certaines fonctionnalités nécessitent votre autorisation explicite. Vous pouvez les accorder ou les révoquer à tout moment depuis Réglages iOS > RB Perform :\n\n• Localisation (Pendant l'utilisation) — pour tracker un run avec trajet GPS\n• Apple Health — pour enregistrer vos courses dans Activité et lire votre fréquence cardiaque\n• Mouvement et forme — pour mesurer la cadence et l'activité physique\n• Caméra — pour le selfie de finish et les photos de progression\n• Photos — pour partager une photo en story\n• Microphone — pour les notes vocales dans le chat\n• Notifications — pour les rappels et messages du préparateur\n\nAucune fonctionnalité ne collecte de données en arrière-plan sans permission explicite. Aucun tracking publicitaire (IDFA / SKAdNetwork) n'est utilisé.`
          },
          {
            title: "7. Durée de conservation",
            content: `Vos données sont conservées :\n\n• Pendant toute la durée de votre relation avec RB Perform\n• 3 ans après la fin de votre abonnement ou la suppression de votre compte\n\nPassé ce délai, toutes vos données personnelles sont supprimées définitivement.`
          },
          {
            title: "8. Vos droits",
            content: `Conformément au RGPD, vous disposez des droits suivants :\n\n• Droit d'accès : obtenir une copie de vos données\n• Droit de rectification : corriger des données inexactes\n• Droit à l'effacement : demander la suppression de toutes vos données\n• Droit à la portabilité : recevoir vos données dans un format structuré\n• Droit d'opposition : vous opposer au traitement de vos données\n• Droit de retrait du consentement : à tout moment, sans justification\n\nPour exercer vos droits, contactez : ${RB_SUPPORT_EMAIL}\nRéponse garantie sous 30 jours.`
          },
          {
            title: "9. Suppression du compte",
            content: `Vous pouvez demander la suppression complète de votre compte et de toutes vos données à tout moment :\n\n• Directement depuis l'application (bouton "Supprimer mes données")\n• Par email à ${RB_SUPPORT_EMAIL}\n\nLa suppression est effective sous 48 heures.`
          },
          {
            title: "10. Réclamation",
            content: `Si vous estimez que vos droits ne sont pas respectés, vous pouvez introduire une réclamation auprès de la CNIL (Commission Nationale de l'Informatique et des Libertés) :\n\nCNIL — 3 Place de Fontenoy, 75007 Paris\nwww.cnil.fr`
          },
          {
            title: "11. Contact",
            content: `Pour toute question relative à cette politique ou à vos données personnelles :\n\nRayan Bonte — RB Perform\nEmail : ${RB_SUPPORT_EMAIL}`
          },
        ].map((section, i) => (
          <div key={i} style={{ marginBottom: 28 }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: "#02d1ba", marginBottom: 10, letterSpacing: "0.3px" }}>{section.title}</h2>
            <p style={{ fontSize: 13, color: "#9ca3af", lineHeight: 1.8, margin: 0, whiteSpace: "pre-line" }}>{section.content}</p>
          </div>
        ))}

        {onClose && (
          <button onClick={onClose} style={{
            width: "100%", padding: "14px", marginTop: 12,
            background: "#02d1ba", border: "none", borderRadius: 12,
            color: "#0d0d0d", fontSize: 14, fontWeight: 800, cursor: "pointer",
          }}>
            J'ai compris — Fermer
          </button>
        )}
      </div>
    </div>
  );
}

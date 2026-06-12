import React, { useState } from "react";
import { RB_SUPPORT_EMAIL } from "../lib/branding";

const TURQUOISE = "#02d1ba";

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <h2 style={{ fontSize: 14, fontWeight: 700, color: TURQUOISE, marginBottom: 10 }}>{title}</h2>
      <div style={{ fontSize: 13, color: "#9ca3af", lineHeight: 1.8 }}>{children}</div>
    </div>
  );
}

function PageWrapper({ title, subtitle, onClose, children }) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 999,
      background: "rgba(0,0,0,0.95)", WebkitBackdropFilter: "blur(20px)", backdropFilter: "blur(20px)",
      overflowY: "auto", padding: "32px 20px",
      fontFamily: "'Inter', sans-serif",
    }}>
      <div style={{ maxWidth: 620, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", color: TURQUOISE, marginBottom: 6 }}>{subtitle}</div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: "#f5f5f5", margin: 0 }}>RB Perform</h1>
          </div>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.08)", border: "none", borderRadius: 8, width: 36, height: 36, color: "#f5f5f5", fontSize: 18, cursor: "pointer", flexShrink: 0 }}>×</button>
        </div>
        <div style={{ fontSize: 12, color: "#555", marginBottom: 28 }}>
          Dernière mise à jour : {new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}
        </div>
        {children}
        <button onClick={onClose} style={{ width: "100%", padding: "14px", marginTop: 12, background: TURQUOISE, border: "none", borderRadius: 12, color: "#0d0d0d", fontSize: 14, fontWeight: 800, cursor: "pointer" }}>
          Fermer
        </button>
      </div>
    </div>
  );
}

/* ── MENTIONS LÉGALES ── */
export function MentionsLegales({ onClose }) {
  return (
    <PageWrapper title="Mentions légales" subtitle="Mentions légales" onClose={onClose}>
      <Section title="1. Éditeur du service">
        <p>Le service RB Perform est édité par :</p>
        <br />
        <p><strong style={{ color: "#f5f5f5" }}>Rayan Bonte
        <br />Micro-entrepreneur — SIRET : 99063780300018</strong><br />
        Préparateur physique indépendant<br />
        Email : {RB_SUPPORT_EMAIL}
        <br />06 95 12 93 47
        <br />Site web : rbperform.app
        <br />Application iOS : disponible sur l'App Store (Apple Inc.)</p>
      </Section>

      <Section title="2. Hébergement et distribution">
        <p><strong style={{ color: "#f5f5f5" }}>Application web (PWA)</strong><br />
        Vercel Inc. — 340 Pine Street, Suite 900, San Francisco, CA 94104, USA<br />
        Serveurs en Europe (conformité RGPD)</p>
        <br />
        <p><strong style={{ color: "#f5f5f5" }}>Application iOS native</strong><br />
        Distribuée via l'Apple App Store par Apple Inc. — One Apple Park Way, Cupertino, CA 95014, USA</p>
        <br />
        <p><strong style={{ color: "#f5f5f5" }}>Base de données</strong><br />
        Supabase Inc. — Serveurs en Irlande, Union Européenne ✅</p>
        <br />
        <p><strong style={{ color: "#f5f5f5" }}>Notifications push iOS</strong><br />
        Apple Push Notification service (APNs) — Apple Inc.</p>
      </Section>

      <Section title="3. Propriété intellectuelle">
        <p>L'ensemble des contenus présents sur ce service (programmes d'entraînement, textes, graphiques, logo RB Perform) sont la propriété exclusive de Rayan Bonte
        <br />Micro-entrepreneur — SIRET : 99063780300018 et sont protégés par les lois françaises et internationales relatives à la propriété intellectuelle.</p>
        <br />
        <p>Toute reproduction, représentation, modification ou adaptation, même partielle, est strictement interdite sans autorisation écrite préalable.</p>
      </Section>

      <Section title="4. Données personnelles">
        <p>Le traitement des données personnelles est régi par notre Politique de Confidentialité, consultable dans l'application.</p>
        <br />
        <p>Conformément au RGPD et à la loi Informatique et Libertés, vous disposez d'un droit d'accès, de rectification, de suppression et de portabilité de vos données. Pour exercer ces droits : {RB_SUPPORT_EMAIL}
        <br />06 95 12 93 47
        <br />Hébergement : Vercel Inc., 340 Pine Street, San Francisco, CA 94104, USA</p>
      </Section>

      <Section title="5. Responsabilité">
        <p>Les programmes d'entraînement fournis sont à titre indicatif et personnalisés par un préparateur physique. RB Perform ne peut être tenu responsable des blessures résultant d'une mauvaise exécution des exercices ou d'un état de santé incompatible avec la pratique sportive.</p>
        <br />
        <p>Il est conseillé de consulter un médecin avant de débuter tout programme d'entraînement intensif.</p>
      </Section>

      <Section title="6. Droit applicable">
        <p>Les présentes mentions légales sont régies par le droit français. En cas de litige, les tribunaux français seront seuls compétents.</p>
      </Section>
    </PageWrapper>
  );
}

/* ── CGU ── */
export function CGU({ onClose }) {
  return (
    <PageWrapper title="Conditions Générales d'Utilisation" subtitle="CGU" onClose={onClose}>
      <Section title="1. Objet">
        <p>Les présentes Conditions Générales d'Utilisation (CGU) régissent l'accès et l'utilisation du service RB Perform, proposé par Rayan Bonte (micro-entrepreneur — SIRET : 99063780300018), sous deux formes :</p>
        <ul style={{ paddingLeft: 16, margin: "8px 0" }}>
          <li>Une application web progressive (PWA) accessible sur rbperform.app</li>
          <li>Une application iOS native distribuée via l'Apple App Store</li>
        </ul>
        <p>Les deux applications partagent les mêmes fonctionnalités et les mêmes données utilisateur.</p>
      </Section>

      <Section title="2. Accès au service">
        <p>L'accès au service est réservé aux personnes ayant reçu une invitation du préparateur physique RB Perform ou ayant souscrit à un programme self-serve, et ayant créé un compte via leur adresse email.</p>
        <br />
        <p>L'utilisateur s'engage à :</p>
        <ul style={{ paddingLeft: 16, margin: "8px 0" }}>
          <li>Fournir des informations exactes lors de la création du compte</li>
          <li>Maintenir la confidentialité de son lien de connexion</li>
          <li>Ne pas partager son accès avec des tiers</li>
          <li>Utiliser le service à des fins personnelles uniquement</li>
        </ul>
      </Section>

      <Section title="3. Description du service">
        <p>RB Perform fournit :</p>
        <ul style={{ paddingLeft: 16, margin: "8px 0" }}>
          <li>Un programme d'entraînement personnalisé créé par Rayan</li>
          <li>Un outil de suivi des charges et de la progression</li>
          <li>Un timer de repos automatique (avec Live Activity sur iOS 16.1+)</li>
          <li>Un suivi du poids corporel et des photos de progression</li>
          <li>Une messagerie avec Rayan</li>
          <li>L'export de rapports de progression en PDF</li>
          <li>Un tracker de course (run) avec GPS, allure et cadence (app iOS uniquement)</li>
        </ul>
        <br />
        <p><strong style={{ color: "#f5f5f5" }}>Permissions iOS (app native uniquement)</strong> — l'utilisateur peut être amené à autoriser :</p>
        <ul style={{ paddingLeft: 16, margin: "8px 0" }}>
          <li><strong>Localisation</strong> : pour tracker un run GPS (distance, allure, trajet)</li>
          <li><strong>Apple Health (HealthKit)</strong> : pour enregistrer les courses dans Activité et lire fréquence cardiaque + VO2max (optionnel)</li>
          <li><strong>Mouvement et forme</strong> : pour mesurer la cadence et détecter le type d'activité</li>
          <li><strong>Caméra et galerie</strong> : pour les photos de progression et les stories de partage</li>
          <li><strong>Microphone</strong> : pour les notes vocales dans la messagerie (optionnel)</li>
          <li><strong>Notifications</strong> : pour les rappels de séance et messages du préparateur</li>
        </ul>
        <p>Chaque permission peut être révoquée à tout moment dans Réglages iOS &gt; RB Perform.</p>
      </Section>

      <Section title="4. Obligations et responsabilité de l'utilisateur">
        <p>L'utilisateur reconnaît être en bonne condition physique pour pratiquer les exercices proposés et avoir consulté un médecin si nécessaire.</p>
        <br />
        <p>L'utilisateur s'engage à signaler immédiatement à son préparateur physique toute douleur, blessure ou contre-indication médicale.</p>
        <br />
        <p>RB Perform décline toute responsabilité en cas de blessure résultant :</p>
        <ul style={{ paddingLeft: 16, margin: "8px 0" }}>
          <li>D'une mauvaise exécution des exercices</li>
          <li>D'un état de santé non déclaré</li>
          <li>Du non-respect des consignes du coach</li>
          <li>D'une surcharge volontaire au-delà des recommandations</li>
        </ul>
      </Section>

      <Section title="5. Propriété du contenu">
        <p>Les programmes d'entraînement, conseils et contenus fournis dans l'application sont la propriété intellectuelle de Rayan Bonte
        <br />Micro-entrepreneur — SIRET : 99063780300018 — RB Perform.</p>
        <br />
        <p>L'utilisateur ne peut ni reproduire, ni diffuser, ni vendre ces contenus sans autorisation écrite préalable.</p>
      </Section>

      <Section title="6. Suspension et résiliation">
        <p>RB Perform se réserve le droit de suspendre ou supprimer un compte en cas de :</p>
        <ul style={{ paddingLeft: 16, margin: "8px 0" }}>
          <li>Non-respect des présentes CGU</li>
          <li>Comportement abusif ou irrespectueux</li>
          <li>Fin de la relation de coaching</li>
        </ul>
        <br />
        <p>L'utilisateur peut demander la suppression de son compte à tout moment via l'application ou par email.</p>
      </Section>

      <Section title="7. Modifications des CGU">
        <p>RB Perform se réserve le droit de modifier les présentes CGU à tout moment. Les utilisateurs seront informés par email en cas de modification substantielle. La poursuite de l'utilisation du service vaut acceptation des nouvelles conditions.</p>
      </Section>

      <Section title="8. Droit applicable et juridiction">
        <p>Les présentes CGU sont soumises au droit français. Tout litige sera soumis aux tribunaux compétents du ressort du domicile de Rayan Bonte
        <br />Micro-entrepreneur — SIRET : 99063780300018.</p>
      </Section>
    </PageWrapper>
  );
}

/* ── EMAIL SUPPRESSION CONFIRMATION (utilisé dans App.jsx) ── */
// RGPD art. 17 + Apple App Store Guideline 5.1.1(v) :
// la suppression doit être facile à demander MAIS difficile à déclencher par
// accident. On exige donc le typed-confirm "SUPPRIMER" (en majuscules) —
// même contrat que côté backend `api/gdpr-delete.js`.
//
// `busy` = état contrôlé par le parent pendant l'appel réseau (désactive le
// bouton, évite double-submit). Si non passé, le bouton reste actif.
export function DeleteConfirmModal({ onConfirm, onCancel, busy = false }) {
  const [typed, setTyped] = useState("");
  const ready = typed.trim().toUpperCase() === "SUPPRIMER";

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 998, background: "rgba(0,0,0,0.85)", WebkitBackdropFilter: "blur(20px)", backdropFilter: "blur(20px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ background: "#141414", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 20, padding: 28, maxWidth: 380, width: "100%", textAlign: "center", fontFamily: "'Inter',sans-serif" }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>⚠️</div>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: "#f5f5f5", marginBottom: 8 }}>Supprimer mon compte</h2>
        <p style={{ fontSize: 13, color: "#9ca3af", lineHeight: 1.7, marginBottom: 18 }}>
          Cette action supprimera définitivement ton compte et toutes tes données : programme, historique, poids, photos, messages.{" "}
          <strong style={{ color: "#f5f5f5" }}>Aucune récupération possible.</strong>
        </p>
        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", lineHeight: 1.6, marginBottom: 10 }}>
          Pour confirmer, tape <strong style={{ color: "#ef4444" }}>SUPPRIMER</strong> ci-dessous :
        </p>
        <input
          type="text"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          placeholder="SUPPRIMER"
          autoCapitalize="characters"
          autoCorrect="off"
          autoComplete="off"
          spellCheck={false}
          disabled={busy}
          style={{
            width: "100%", padding: "12px 14px", marginBottom: 18,
            background: "rgba(0,0,0,0.4)",
            border: `1px solid ${ready ? "rgba(239,68,68,0.4)" : "rgba(255,255,255,0.08)"}`,
            borderRadius: 10, color: "#f5f5f5", fontSize: 14, fontWeight: 600,
            textAlign: "center", letterSpacing: "0.12em",
            outline: "none", boxSizing: "border-box",
            fontFamily: "inherit",
          }}
        />
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={onCancel}
            disabled={busy}
            style={{ flex: 1, padding: "12px", background: "none", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, color: "#9ca3af", fontSize: 13, fontWeight: 700, cursor: busy ? "wait" : "pointer", opacity: busy ? 0.5 : 1 }}
          >
            Annuler
          </button>
          <button
            onClick={() => ready && !busy && onConfirm()}
            disabled={!ready || busy}
            style={{
              flex: 1, padding: "12px",
              background: ready && !busy ? "#ef4444" : "rgba(239,68,68,0.25)",
              border: "none", borderRadius: 10, color: "#fff",
              fontSize: 13, fontWeight: 700,
              cursor: ready && !busy ? "pointer" : "not-allowed",
              transition: "background 0.15s ease",
            }}
          >
            {busy ? "Suppression…" : "Supprimer définitivement"}
          </button>
        </div>
      </div>
    </div>
  );
}

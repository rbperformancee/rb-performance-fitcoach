import React, { useState } from "react";

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
      background: "rgba(0,0,0,0.95)", backdropFilter: "blur(20px)",
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
        Coach sportif personnel<br />
        Email : rb.performancee@gmail.com
        <br />Hébergement : Vercel Inc., 340 Pine Street, San Francisco, CA 94104, USA<br />
        Site web : rb-perfor.vercel.app</p>
      </Section>

      <Section title="2. Hébergement">
        <p><strong style={{ color: "#f5f5f5" }}>Application web</strong><br />
        Vercel Inc. — 340 Pine Street, Suite 900, San Francisco, CA 94104, USA<br />
        Serveurs en Europe (conformité RGPD)</p>
        <br />
        <p><strong style={{ color: "#f5f5f5" }}>Base de données</strong><br />
        Supabase Inc. — Serveurs en Irlande, Union Européenne ✅</p>
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
        <p>Conformément au RGPD et à la loi Informatique et Libertés, vous disposez d'un droit d'accès, de rectification, de suppression et de portabilité de vos données. Pour exercer ces droits : rb.performancee@gmail.com
        <br />Hébergement : Vercel Inc., 340 Pine Street, San Francisco, CA 94104, USA</p>
      </Section>

      <Section title="5. Responsabilité">
        <p>Les programmes d'entraînement fournis sont à titre indicatif et personnalisés par un préparateur sportif. RB Perform ne peut être tenu responsable des blessures résultant d'une mauvaise exécution des exercices ou d'un état de santé incompatible avec la pratique sportive.</p>
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
        <p>Les présentes Conditions Générales d'Utilisation (CGU) régissent l'accès et l'utilisation de l'application RB Perform, service de suivi sportif personnalisé proposé par Rayan Bonte
        <br />Micro-entrepreneur — SIRET : 99063780300018.</p>
      </Section>

      <Section title="2. Accès au service">
        <p>L'accès au service est réservé aux personnes ayant reçu une invitation de la part du coach RB Perform et ayant créé un compte via leur adresse email.</p>
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
          <li>Un timer de repos automatique</li>
          <li>Un suivi du poids corporel</li>
          <li>Une messagerie avec Rayan</li>
          <li>L'export de rapports de progression en PDF</li>
        </ul>
      </Section>

      <Section title="4. Obligations et responsabilité de l'utilisateur">
        <p>L'utilisateur reconnaît être en bonne condition physique pour pratiquer les exercices proposés et avoir consulté un médecin si nécessaire.</p>
        <br />
        <p>L'utilisateur s'engage à signaler immédiatement à son coach toute douleur, blessure ou contre-indication médicale.</p>
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
export function DeleteConfirmModal({ onConfirm, onCancel }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 998, background: "rgba(0,0,0,0.85)", backdropFilter: "blur(20px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ background: "#141414", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 20, padding: 28, maxWidth: 380, width: "100%", textAlign: "center", fontFamily: "'Inter',sans-serif" }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>⚠️</div>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: "#f5f5f5", marginBottom: 8 }}>Supprimer mes données</h2>
        <p style={{ fontSize: 13, color: "#9ca3af", lineHeight: 1.7, marginBottom: 24 }}>
          Cette action supprimera définitivement toutes tes données : programme, historique, poids, messages et compte. <strong style={{ color: "#f5f5f5" }}>Cette action est irréversible.</strong>
        </p>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onCancel} style={{ flex: 1, padding: "12px", background: "none", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, color: "#9ca3af", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
            Annuler
          </button>
          <button onClick={onConfirm} style={{ flex: 1, padding: "12px", background: "#ef4444", border: "none", borderRadius: 10, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
            Supprimer tout
          </button>
        </div>
      </div>
    </div>
  );
}

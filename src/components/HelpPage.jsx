import React, { useState } from "react";
import AppIcon from "./AppIcon";

const G = "#02d1ba";

/**
 * HelpPage — guide utilisateur in-app avec sections expandables.
 * Affichee depuis ProfilePage via bouton "Aide".
 *
 * Couvre toutes les fonctionnalites principales pour onboarding
 * et reduction du support coach.
 */

const SECTIONS = [
  {
    id: "training",
    icon: "dumbbell",
    title: "Entrainement",
    items: [
      {
        q: "Comment commencer ma seance ?",
        a: "Va dans l'onglet Entrainement, choisis la semaine et la seance du jour, puis tap sur 'Demarrer'. Tu peux logger chaque serie en validant le poids effectue. Le timer de repos demarre automatiquement entre les series.",
      },
      {
        q: "Comment valider une serie ?",
        a: "Apres ta serie, tap sur le bouton de validation. Tu sentiras une vibration courte (medium). Quand tu finis toutes les series d'un exercice, vibration plus longue de succes.",
      },
      {
        q: "Le timer de repos a-t-il un son ?",
        a: "Oui, vibration + bip a 5s, 1s et a la fin du repos. Tu peux skip le repos en tapant 'Passer le repos'.",
      },
      {
        q: "Que faire si je rate une serie ?",
        a: "Logue quand meme avec le poids effectue. Le suivi de progression valorise la regularite, pas la perfection. Ton coach voit tous tes logs.",
      },
    ],
  },
  {
    id: "nutrition",
    icon: "apple",
    title: "Nutrition",
    items: [
      {
        q: "Comment logger un aliment ?",
        a: "Onglet Fuel → '+ Ajouter' dans le repas voulu. Recherche dans 456 aliments locaux + millions de produits via Edamam. Tu peux aussi scanner un code-barre ou utiliser l'IA vocal.",
      },
      {
        q: "Comment scanner un code-barre ?",
        a: "Bouton violet a cote du '+'. Prends une photo claire du code-barre. L'app decode automatiquement et t'affiche le produit avec ses macros.",
      },
      {
        q: "Comment fonctionne l'IA vocal ?",
        a: "Bouton vert micro. Decris ton repas a voix haute (ex: 'un bol de pates au saumon'). L'IA Mistral analyse les ingredients en 2s et te propose les macros.",
      },
      {
        q: "Comment ajouter de l'eau ?",
        a: "Tap sur la carte 'Hydratation'. Choix rapides : 150ml, 250ml, 330ml, 500ml. Le total se met a jour direct.",
      },
    ],
  },
  {
    id: "weight",
    icon: "scale",
    title: "Suivi poids",
    items: [
      {
        q: "Quand peser ?",
        a: "Le matin a jeun, apres etre alle aux toilettes. Toujours dans les memes conditions pour des donnees comparables.",
      },
      {
        q: "Comment definir mon objectif ?",
        a: "Page Poids → 'Definir mon objectif'. Tape ton objectif en kg. La projection se calcule automatiquement selon ta progression.",
      },
      {
        q: "Pourquoi mon poids varie autant d'un jour a l'autre ?",
        a: "C'est normal, ca peut bouger de +/- 2kg avec l'hydratation, la digestion, le sodium. Regarde la tendance sur 7-14 jours, pas le jour J.",
      },
    ],
  },
  {
    id: "coach",
    icon: "message",
    title: "Coach",
    items: [
      {
        q: "Comment contacter mon coach ?",
        a: "Onglet Profil → section Messagerie. Ecris-lui directement, il recoit en temps reel sur son dashboard.",
      },
      {
        q: "Combien de temps pour avoir une reponse ?",
        a: "Generalement < 24h en semaine. Si urgent (douleur, blessure), precise-le dans le message.",
      },
      {
        q: "Mon coach voit-il mes donnees ?",
        a: "Oui, ton coach voit ton poids, tes seances, ta nutrition, ton sommeil et tes pas. C'est la base de l'accompagnement personnalise.",
      },
    ],
  },
  {
    id: "subscription",
    icon: "calendar",
    title: "Abonnement",
    items: [
      {
        q: "Quand mon abonnement expire ?",
        a: "Tu vois la date de fin dans ton profil. Une notification s'affiche 14 jours avant l'expiration.",
      },
      {
        q: "Comment renouveler ?",
        a: "Quand ton abonnement approche de la fin, un bouton 'Renouveler' apparait. Tu es redirige vers notre site securise rbperform.app pour finaliser le paiement.",
      },
      {
        q: "Que se passe-t-il si je ne renouvelle pas ?",
        a: "Ton acces est suspendu. Tes donnees sont conservees 30 jours, ensuite archivees. Tu peux renouveler n'importe quand pour reprendre.",
      },
    ],
  },
  {
    id: "tech",
    icon: "alert",
    title: "Technique",
    items: [
      {
        q: "Comment installer l'app sur iPhone ?",
        a: "Ouvre l'URL dans Safari → tap le bouton Partager → 'Sur l'ecran d'accueil'. L'icone RB Perform apparait comme une vraie app.",
      },
      {
        q: "Comment activer les notifications ?",
        a: "Au premier lancement, accepte la demande. Si refuse : iOS Reglages → Notifications → RB Perform → Autoriser. Indispensable pour les rappels et messages coach.",
      },
      {
        q: "L'app marche hors connexion ?",
        a: "Partiellement. Ton programme et l'app sont caches. Logger des seances en offline est limite — privilegie une connexion pour les saves.",
      },
      {
        q: "Comment supprimer mes donnees ?",
        a: "Profil → 'Supprimer mes donnees'. Conformement RGPD, tout est supprime sous 48h. Action irreversible.",
      },
    ],
  },
];

function Section({ section, isOpen, onToggle }) {
  return (
    <div style={{ marginBottom: 12, background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, overflow: "hidden" }}>
      <button
        onClick={onToggle}
        aria-expanded={isOpen}
        style={{
          width: "100%", padding: "16px 18px", background: "none", border: "none",
          color: "#fff", fontFamily: "inherit", cursor: "pointer",
          display: "flex", alignItems: "center", gap: 12, textAlign: "left",
        }}
      >
        <div style={{ width: 32, height: 32, borderRadius: 10, background: `${G}15`, display: "flex", alignItems: "center", justifyContent: "center", color: G, flexShrink: 0 }}>
          <AppIcon name={section.icon} size={16} color={G} />
        </div>
        <div style={{ flex: 1, fontSize: 14, fontWeight: 700 }}>{section.title}</div>
        <div style={{ color: "rgba(255,255,255,0.3)", transition: "transform 0.2s", transform: isOpen ? "rotate(90deg)" : "rotate(0deg)" }}>
          <AppIcon name="arrow-right" size={14} color="rgba(255,255,255,0.4)" />
        </div>
      </button>
      {isOpen && (
        <div style={{ padding: "0 18px 16px", display: "flex", flexDirection: "column", gap: 14, borderTop: "1px solid rgba(255,255,255,0.04)", paddingTop: 16, animation: "helpExpand 0.2s ease both" }}>
          <style>{`@keyframes helpExpand{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}`}</style>
          {section.items.map((item, i) => (
            <div key={i}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", marginBottom: 6, lineHeight: 1.4 }}>{item.q}</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", lineHeight: 1.6 }}>{item.a}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function HelpPage({ onClose }) {
  const [openId, setOpenId] = useState("training");

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="help-title"
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "#050505", overflowY: "auto", WebkitOverflowScrolling: "touch",
        fontFamily: "-apple-system,Inter,sans-serif", color: "#fff",
      }}
    >
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, height: "30%", background: "radial-gradient(ellipse at 50% -10%, rgba(2,209,186,0.08), transparent 65%)", pointerEvents: "none", zIndex: 0 }} />

      <div style={{ position: "relative", zIndex: 1, maxWidth: 600, margin: "0 auto", padding: "40px 24px 80px" }}>
        {/* Header */}
        <div style={{ paddingTop: "env(safe-area-inset-top, 8px)", marginBottom: 28, animation: "helpExpand 0.3s ease both" }}>
          <button
            onClick={onClose}
            aria-label="Fermer l'aide"
            style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "none", border: "none", color: "rgba(255,255,255,0.35)", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", padding: 0, marginBottom: 16 }}
          >
            <AppIcon name="arrow-left" size={12} color="rgba(255,255,255,0.5)" />
            Retour
          </button>
          <div style={{ fontSize: 10, letterSpacing: "4px", textTransform: "uppercase", color: `${G}b3`, marginBottom: 8, fontWeight: 700 }}>
            Centre d'aide
          </div>
          <h1 id="help-title" style={{ fontSize: 36, fontWeight: 900, letterSpacing: "-1.5px", margin: "0 0 12px", lineHeight: 0.95 }}>
            Comment ca<br /><span style={{ color: G }}>marche.</span>
          </h1>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", lineHeight: 1.6 }}>
            Tout ce qu'il faut savoir pour utiliser RB Perform. Une question pas dans cette liste ? Contacte ton coach via la messagerie.
          </p>
        </div>

        {/* Sections */}
        <div>
          {SECTIONS.map((s) => (
            <Section
              key={s.id}
              section={s}
              isOpen={openId === s.id}
              onToggle={() => setOpenId(openId === s.id ? null : s.id)}
            />
          ))}
        </div>

        {/* Keyboard shortcuts (desktop) */}
        <div style={{ marginTop: 28, padding: 20, background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <AppIcon name="keyboard" size={16} color="rgba(255,255,255,0.7)" />
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "2.5px", textTransform: "uppercase", color: "rgba(255,255,255,0.7)" }}>
              Raccourcis clavier
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[
              { keys: ["⌘", "K"], label: "Palette de commandes (rechercher / naviguer)" },
              { keys: ["⌘", "/"], label: "Ouvrir l'aide" },
              { keys: ["Esc"], label: "Fermer un panneau ouvert" },
              { keys: ["↑", "↓"], label: "Naviguer dans une liste" },
              { keys: ["↵"], label: "Valider l'element selectionne" },
            ].map((s, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", background: "rgba(255,255,255,0.02)", borderRadius: 8 }}>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.75)" }}>{s.label}</div>
                <div style={{ display: "flex", gap: 4 }}>
                  {s.keys.map((k, ki) => (
                    <kbd key={ki} style={{ fontSize: 10, color: "rgba(255,255,255,0.85)", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 5, padding: "2px 7px", fontFamily: "'JetBrains Mono',monospace", minWidth: 18, textAlign: "center" }}>{k}</kbd>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", marginTop: 10, lineHeight: 1.5 }}>
            Sur Windows / Linux, utilise <kbd style={{ fontSize: 9, color: "rgba(255,255,255,0.6)", background: "rgba(255,255,255,0.05)", padding: "1px 4px", borderRadius: 3 }}>Ctrl</kbd> a la place de <kbd style={{ fontSize: 9, color: "rgba(255,255,255,0.6)", background: "rgba(255,255,255,0.05)", padding: "1px 4px", borderRadius: 3 }}>⌘</kbd>.
          </div>
        </div>

        {/* Contact coach CTA */}
        <div style={{ marginTop: 28, padding: 20, background: `${G}08`, border: `1px solid ${G}25`, borderRadius: 16, textAlign: "center" }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", color: G, marginBottom: 8 }}>Pas de reponse ?</div>
          <div style={{ fontSize: 14, color: "#fff", marginBottom: 14, lineHeight: 1.5 }}>
            Pose ta question directement a ton coach via la messagerie.
          </div>
          <button
            onClick={onClose}
            style={{
              padding: "12px 24px", background: G, color: "#000", border: "none",
              borderRadius: 12, fontSize: 12, fontWeight: 800, cursor: "pointer",
              fontFamily: "inherit", letterSpacing: "0.5px", textTransform: "uppercase",
            }}
          >
            Aller a la messagerie
          </button>
        </div>
      </div>
    </div>
  );
}

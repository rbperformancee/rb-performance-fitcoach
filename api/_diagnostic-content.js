/**
 * Diagnostic Coach — Contenu source de vérité (questions + piliers + kits).
 *
 * MAJ par Rayan : pour ajouter/modifier les kits, édite KITS[piller]. Le moule
 * est strict (titre / diagnostic / action1 / action2 / action3 / rb_solves) —
 * api/diagnostic-submit.js et public/diagnostic.html consomment cette forme.
 *
 * Statut des kits au 23/05/26 :
 *   ✅ P1 Prévisibilité — kit complet (référence fournie par Rayan)
 *   ⏳ P2 Rétention     — placeholder, à remplir
 *   ⏳ P3 Robustesse    — placeholder
 *   ⏳ P4 Cash          — placeholder
 *   ⏳ P5 Pilotage      — placeholder
 */

// Tiebreak ordre survie : si plusieurs piliers ex-aequo, on prend dans cet ordre.
const PILLAR_TIEBREAK = ["P1", "P2", "P4", "P3", "P5"];

const PILLARS = {
  P1: { label: "Prévisibilité du revenu", questions: ["Q1", "Q2"] },
  P2: { label: "Rétention / anti-départ", questions: ["Q3", "Q4"] },
  P3: { label: "Robustesse de la base client", questions: ["Q5", "Q6"] },
  P4: { label: "Cash / encaissement", questions: ["Q7", "Q8"] },
  P5: { label: "Pilotage", questions: ["Q9", "Q10"] },
};

// Le texte de chaque option, dans l'ordre a → b → c (a = la plus saine = 10 pts).
const QUESTIONS = {
  Q1: {
    pillar: "P1",
    text: "Tu sais combien tu encaisses le mois prochain ?",
    options: { a: "Précisément", b: "À peu près", c: "Pas du tout" },
  },
  Q2: {
    pillar: "P1",
    text: "Tu factures plutôt…",
    options: {
      a: "Un résultat / transformation sur engagement récurrent",
      b: "Un mix",
      c: "À l'heure ou à la séance",
    },
  },
  Q3: {
    pillar: "P2",
    text: "En moyenne un client reste…",
    options: { a: "Plus de 6 mois", b: "3 à 6 mois", c: "Moins de 3 mois" },
  },
  Q4: {
    pillar: "P2",
    text: "Tu repères un client qui va partir AVANT qu'il parte ?",
    options: {
      a: "Oui, signaux clairs",
      b: "Au feeling",
      c: "Non, je le vois quand il est parti",
    },
  },
  Q5: {
    pillar: "P3",
    text: "Tes 2 plus gros clients pèsent quelle part de ton revenu ?",
    options: { a: "Moins de 25%", b: "25 à 50%", c: "Plus de 50%" },
  },
  Q6: {
    pillar: "P3",
    text: "Combien de clients actifs payants aujourd'hui ?",
    options: { a: "15 ou plus", b: "Entre 5 et 15", c: "Moins de 5" },
  },
  Q7: {
    pillar: "P4",
    text: "Tes paiements rentrent…",
    options: {
      a: "Auto à date fixe",
      b: "Je relance souvent",
      c: "C'est le bordel",
    },
  },
  Q8: {
    pillar: "P4",
    text: "Ton matelas / épargne pro couvre combien de mois de charges ?",
    options: { a: "3 mois ou plus", b: "1 à 3 mois", c: "Aucun" },
  },
  Q9: {
    pillar: "P5",
    text: "Tu regardes tes chiffres (revenu, clients actifs, départs) à quelle fréquence ?",
    options: { a: "Chaque semaine", b: "Chaque mois", c: "Quand j'y pense" },
  },
  Q10: {
    pillar: "P5",
    text: "Tu pilotes ton business avec…",
    options: {
      a: "Un outil dédié",
      b: "Un tableur que je tiens",
      c: "Je reconstitue quand j'en ai besoin",
    },
  },
};

// Bandes de score global. Choisis selon spec Rayan.
const BANDS = [
  { min: 0, max: 40, code: "sursis", title: "Ton business est en sursis",
    body: "Tu tiens par ton énergie, pas par ton système. Une mauvaise semaine et le mois bascule." },
  { min: 41, max: 70, code: "fragile", title: "Ça tient, mais ça fuit",
    body: "T'as une base. Mais une mauvaise surprise et le mois bascule. Le système est encore réparable." },
  { min: 71, max: 100, code: "solide", title: "Business solide",
    body: "Rare. T'es dans le haut du panier. Reste à protéger ce que tu as et à scaler." },
];

// =============================================================================
// KITS DE RÉPARATION — un par pilier. Format strict (consommé par le rendu HTML).
// =============================================================================

const KITS = {

  // ───────────────────────────────────────────────────────────────────────────
  // P1 — Prévisibilité du revenu (référence Rayan 23/05/26)
  // ───────────────────────────────────────────────────────────────────────────
  P1: {
    title: "Tu repars de zéro tous les 1ers du mois",
    diagnostic:
      "Ton revenu dépend de ventes one-shot ou de séances à l'heure. " +
      "Résultat : chaque mois, ton compteur revient à zéro et tu dois tout re-vendre pour manger. " +
      "Tu ne peux rien prévoir, tu ne peux pas te poser, et t'as un plafond de verre — tu ne scales pas, tu cours. " +
      "Le problème n'est pas ton nombre de clients, c'est que rien ne se reconduit tout seul.",
    actions: [
      {
        title: "Repackage ton offre en récurrent",
        body:
          "Arrête de vendre une prestation, vends une transformation sur une durée engagée (3 / 6 / 12 mois). " +
          "Même service, même prix mensuel, mais le client s'engage sur la durée au lieu de re-décider chaque mois. " +
          "Tu transformes un revenu aléatoire en revenu reconductible.",
      },
      {
        title: "Automatise l'encaissement",
        body:
          "Mets un paiement récurrent automatique (lien d'abonnement Stripe/autre) au lieu de re-facturer manuellement. " +
          "Ce que tu ne re-vends pas chaque mois ne risque pas de tomber chaque mois.",
      },
      {
        title: "Calcule ton revenu prévisible",
        body:
          "Pose le chiffre noir sur blanc : clients actifs récurrents × prix mensuel moyen × (1 − ton taux de départ mensuel). " +
          "C'est ton revenu plancher du mois prochain. Si tu ne connais pas ton taux de départ, c'est déjà ton premier trou.",
      },
    ],
    rb_solves:
      "RB Perform calcule ton revenu récurrent et ta prévision à 90 jours en temps réel, automatiquement, " +
      "à partir de tes vrais chiffres. Tu arrêtes de le reconstituer à la main une fois par mois — " +
      "tu sais en permanence combien tu vas encaisser, et quand ça menace de baisser.",
  },

  // ───────────────────────────────────────────────────────────────────────────
  // P2 — Rétention / anti-départ (PLACEHOLDER — kits brouillon, fallback P1)
  // ───────────────────────────────────────────────────────────────────────────
  // Flag `placeholder: true` détecté par resolveKit() → on envoie le kit P1
  // au lead avec un bandeau "ton kit personnalisé arrive bientôt". Évite
  // qu'un lead recoive un email truffé de "[TODO Rayan]".
  P2: { placeholder: true,
    title: "[TODO Rayan] Tes clients partent et tu le découvres trop tard",
    diagnostic: "[TODO Rayan] Placeholder rétention. Voir kit P1 pour structure.",
    actions: [
      { title: "[TODO Action 1]", body: "[TODO body]" },
      { title: "[TODO Action 2]", body: "[TODO body]" },
      { title: "[TODO Action 3]", body: "[TODO body]" },
    ],
    rb_solves: "[TODO Rayan] Anti-churn IA de RB Perform : signaux de départ détectés en amont, alertes coach.",
  },

  // ───────────────────────────────────────────────────────────────────────────
  // P3 — Robustesse base client (PLACEHOLDER, fallback P1)
  // ───────────────────────────────────────────────────────────────────────────
  P3: { placeholder: true,
    title: "[TODO Rayan] Ton business tient sur 2-3 piliers fragiles",
    diagnostic: "[TODO Rayan] Concentration client trop forte ou trop peu d'actifs.",
    actions: [
      { title: "[TODO Action 1]", body: "[TODO body]" },
      { title: "[TODO Action 2]", body: "[TODO body]" },
      { title: "[TODO Action 3]", body: "[TODO body]" },
    ],
    rb_solves: "[TODO Rayan] Dashboard concentration + diversification.",
  },

  // ───────────────────────────────────────────────────────────────────────────
  // P4 — Cash / encaissement (PLACEHOLDER, fallback P1)
  // ───────────────────────────────────────────────────────────────────────────
  P4: { placeholder: true,
    title: "[TODO Rayan] Tu cours après ton cash",
    diagnostic: "[TODO Rayan] Encaissement manuel + zéro matelas.",
    actions: [
      { title: "[TODO Action 1]", body: "[TODO body]" },
      { title: "[TODO Action 2]", body: "[TODO body]" },
      { title: "[TODO Action 3]", body: "[TODO body]" },
    ],
    rb_solves: "[TODO Rayan] Auto-débit + tracking late payments.",
  },

  // ───────────────────────────────────────────────────────────────────────────
  // P5 — Pilotage (PLACEHOLDER, fallback P1)
  // ───────────────────────────────────────────────────────────────────────────
  P5: { placeholder: true,
    title: "[TODO Rayan] Tu pilotes à l'aveugle",
    diagnostic: "[TODO Rayan] Pas d'outil, pas de routine de revue, intuition pure.",
    actions: [
      { title: "[TODO Action 1]", body: "[TODO body]" },
      { title: "[TODO Action 2]", body: "[TODO body]" },
      { title: "[TODO Action 3]", body: "[TODO body]" },
    ],
    rb_solves: "[TODO Rayan] Dashboard MRR + cohortes + alertes hebdo.",
  },
};

/**
 * resolveKit(weakPillar) — sélectionne le kit à servir.
 *
 * Si le kit du pilier faible est marqué placeholder=true (brouillon, pas
 * encore validé par Rayan), on retombe sur KIT.P1 (référence) avec un
 * bandeau qui explique au lead que son kit personnalisé arrive bientôt.
 *
 * Évite d'envoyer un email truffé de "[TODO Rayan]" tant que les 4 kits
 * P2-P5 ne sont pas finalisés. Quand un kit cesse d'être placeholder
 * (retire la propriété), le routing redevient direct, sans aucun autre
 * changement de code nécessaire.
 *
 * @returns {{
 *   kit: KitObject,           // toujours non-placeholder, servable tel quel
 *   isFallback: boolean,      // true = on a remplacé par P1
 *   originalPillar: string|null,  // 'P2' si fallback, null sinon
 *   fallbackBanner: string|null,  // texte de bandeau à afficher si fallback
 * }}
 */
function resolveKit(weakPillar) {
  const candidate = KITS[weakPillar];
  if (candidate && !candidate.placeholder) {
    return { kit: candidate, isFallback: false, originalPillar: null, fallbackBanner: null };
  }
  // Fallback : on sert P1 (référence stable) avec contexte.
  const originalLabel = PILLARS[weakPillar]?.label || weakPillar;
  return {
    kit: KITS.P1,
    isFallback: true,
    originalPillar: weakPillar,
    fallbackBanner:
      `Ton kit personnalisé "${originalLabel}" arrive très bientôt. ` +
      `En attendant, voici les fondations universelles qui s'appliquent à tous les coachs — ` +
      `commence par là, je te recontacte dès que ton kit ciblé est prêt.`,
  };
}

// Ligne d'intro qui neutralise le réflexe "il me faut plus de clients"
// (cf. argumentation reframe Acquisition, validée par Rayan).
const ACQUISITION_REFRAME =
  "Ton premier réflexe en lisant ça va peut-être être : « il me faut plus de clients ». " +
  "Mais tu ne compenseras jamais un business qui fuit en versant plus de leads dans un seau percé. " +
  "Voilà où ça fuit chez toi →";

// Ancre définitionnelle de "business sain" (Day-1, avant qu'on ait 30+ coachs RB
// pour faire un vrai benchmark sectoriel). PAS de chiffre fabriqué.
const HEALTHY_BUSINESS_ANCHOR = {
  recurring_share: "80%+ de revenu récurrent",
  retention: "Rétention moyenne > 6 mois",
  concentration: "Aucun client ne pèse plus de 25%",
  cash_buffer: "3 mois de charges en matelas",
  pilotage: "Chiffres revus chaque semaine sur un outil dédié",
};

module.exports = {
  PILLARS,
  PILLAR_TIEBREAK,
  QUESTIONS,
  BANDS,
  KITS,
  resolveKit,
  ACQUISITION_REFRAME,
  HEALTHY_BUSINESS_ANCHOR,
};

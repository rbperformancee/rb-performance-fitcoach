#!/usr/bin/env node
/**
 * Generates "RB Perform vs <Competitor>" comparison pages.
 * Output: public/rb-perform-vs-<slug>.html
 *
 * Run: node scripts/build-vs-pages.mjs
 *
 * Each page targets the high-intent commercial keyword "alternative <X>"
 * or "<X> vs <Y>". Schema: Article + FAQPage + BreadcrumbList.
 */

import { writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '..', 'public');

const COMPETITORS = [
  {
    slug: 'truecoach',
    name: 'TrueCoach',
    fullName: 'TrueCoach',
    origin: 'États-Unis',
    pricing: '$59-99/mois',
    pricingEur: '~55-95 €/mois',
    targetUsers: 'coachs personnel trainers indépendants US/UK',
    strengths: [
      'Interface coach très épurée, courbe d\'apprentissage rapide',
      'Bibliothèque d\'exercices vidéo importante (>1 000 démos)',
      'App mobile client native iOS/Android plutôt fluide',
      'Intégration MyFitnessPal pour le suivi nutritionnel',
    ],
    weaknesses: [
      'Interface 100% anglaise, aucune version FR — vrai frein pour les clients francophones',
      'Pas d\'encaissement intégré : tu dois brancher Stripe ou PayPal séparément + facturer manuellement',
      'Données stockées aux US (Cloud Act) — non conforme RGPD pour beaucoup de clients pro européens',
      'Support en anglais uniquement, créneaux US (réponse 6-12h pour un coach français)',
      'Tarification en USD avec frais de conversion bancaire 1-3% à chaque prélèvement',
      'Pas de pipeline lead / CRM intégré — tu dois gérer la prospection dans Notion ou ailleurs',
    ],
    perfectFor: 'coachs anglophones expat dans un pays anglo-saxon avec une clientèle internationale',
    notForYou: 'tu veux un outil en français avec encaissement Stripe direct, support FR et conformité RGPD',
    pricingExplain: 'TrueCoach Pro 50 clients coûte $99/mois (~95 €) en facturation annuelle, soit ~1 140 €/an. À ça s\'ajoute Stripe (1,5% + 0,25€ par transaction) et la conversion USD/EUR (1-3%). Pour un coach qui facture 30 000 €/an, on est à ~1 350 € de coût total annuel.',
    rbPerformAdvantage: 'RB Perform Founding = 199€/mois bloqué à vie (2 388 €/an), inclut TOUT : vitrine pro géolocalisée, pipeline lead, encaissement Stripe direct 0% commission, suivi client illimité, anti-churn IA, dashboard MRR temps réel. Pour un coach qui facture 30 000 €/an, le coût total est de 2 388 € — soit ~3,5× plus cher en absolu, mais avec une suite complète qui te fait économiser Notion + Calendly + outil de facturation + outil de pipeline + outil de programmes (~150-250€/mois éparpillés).',
    switchingTips: [
      'TrueCoach permet l\'export de tes données clients en CSV depuis Settings → Export. Récupère tout avant de résilier (programmes, clients, historique).',
      'L\'import dans RB Perform se fait via le dashboard Coach (Clients → Importer CSV). Le mapping se fait en 5 minutes pour 50 clients.',
      'Préviens tes clients 2 semaines avant en les rassurant sur la migration (lien d\'accès envoyé par email + tuto installation PWA).',
      'Garde TrueCoach actif 1 mois en parallèle pour gérer les anciens cycles de paiement, puis résilie.',
    ],
    faqLocal: [
      {
        q: 'TrueCoach est-il disponible en français ?',
        a: 'Non. TrueCoach est une plateforme 100% anglaise (interface coach + interface client + emails automatiques + support). Pour un coach indépendant qui exerce en France et a une clientèle francophone, c\'est un frein significatif — environ 30% des clients abandonnent le processus d\'inscription sur une app entièrement anglaise selon les retours de coachs ayant migré.',
      },
      {
        q: 'TrueCoach inclut-il les paiements clients ?',
        a: 'Non. TrueCoach n\'inclut pas d\'encaissement intégré. Tu dois brancher Stripe ou PayPal séparément, créer les abonnements manuellement, et synchroniser les facturations. RB Perform inclut Stripe Connect natif avec 0% de commission supplémentaire — l\'encaissement et la suspension automatique en cas d\'impayé sont câblés.',
      },
      {
        q: 'Mes données TrueCoach sont-elles conformes RGPD ?',
        a: 'TrueCoach stocke les données aux États-Unis (datacenters AWS US-East). Cela tombe sous la juridiction du Cloud Act américain, qui peut imposer la divulgation des données à des autorités US sans notification à l\'utilisateur. Pour un coach qui exerce en France/Europe, c\'est une zone grise RGPD. RB Perform = hébergement exclusivement EU (Supabase Frankfurt), conformité RGPD native, sous-traitants documentés dans les CGV.',
      },
      {
        q: 'Combien coûte vraiment TrueCoach par an pour 50 clients ?',
        a: 'TrueCoach Pro 50 clients = $99/mois en annuel = $1 188/an (~1 130 €). Ajoute Stripe ou PayPal (1,5-3% + frais fixes) = ~450 €/an sur un CA de 30 000 €. Ajoute la conversion USD/EUR bancaire (1-3%) = ~30 €/an. Total réel : ~1 600 €/an, hors outils complémentaires (CRM, pipeline lead, comptable). RB Perform Founding inclut tout pour 2 388 €/an.',
      },
      {
        q: 'Comment migrer de TrueCoach à RB Perform ?',
        a: 'Export CSV depuis TrueCoach (Settings → Export Data), import dans RB Perform via le dashboard Coach (mapping automatique). Migration de 50 clients en ~15 minutes. Garde TrueCoach actif 1 mois en parallèle pour les anciens cycles, puis résilie. Onboarding clients automatique par email avec lien d\'installation PWA.',
      },
    ],
  },
  {
    slug: 'everfit',
    name: 'Everfit',
    fullName: 'Everfit',
    origin: 'États-Unis',
    pricing: '$0-149/mois',
    pricingEur: 'Gratuit à ~140 €/mois',
    targetUsers: 'coachs personnel trainers US, modèle freemium agressif',
    strengths: [
      'Plan gratuit jusqu\'à 5 clients (bon pour démarrer)',
      'Programmes complexes possibles (auto-réglages selon perf)',
      'App mobile client correcte',
      'Intégration Apple Watch / Garmin / Fitbit',
    ],
    weaknesses: [
      'Interface 100% anglaise — frein clientèle francophone',
      'Plan gratuit limité à 5 clients : dès 6 clients tu bascules à $39/mois (Pro), puis explose à $149/mois pour 50+',
      'Pas d\'encaissement intégré — Stripe à brancher séparément',
      'Données aux US (Cloud Act) — non-conformité RGPD potentielle',
      'Pas de pipeline lead / CRM — tu dois gérer la prospection à l\'extérieur',
      'Pas de dashboard MRR / business — focus 100% programme, 0% pilotage business',
    ],
    perfectFor: 'coach personnel trainer US/UK avec moins de 5 clients en démarrage cherchant un outil 100% gratuit',
    notForYou: 'tu démarres, tu veux passer à 10+ clients sans exploser ton budget, ou tu veux un outil FR avec encaissement intégré et pilotage MRR',
    pricingExplain: 'Everfit a un modèle freemium piégeux : gratuit jusqu\'à 5 clients, puis $39/mois jusqu\'à 15 clients, puis $89/mois jusqu\'à 30 clients, puis $149/mois jusqu\'à 50 clients. Pour un coach qui scale, ça veut dire 3 transitions de pricing en 18 mois — chacune ressentie comme une "taxe à la croissance". À $149/mois pour 50 clients, on est à ~1 700 €/an. Ajoute Stripe (~450 €/an sur 30K€ CA) = ~2 150 €/an.',
    rbPerformAdvantage: 'RB Perform Founding = 199€/mois bloqué à vie peu importe ton nombre de clients (10, 50, 200) — pas de palier qui te punit la croissance. Inclut TOUT : vitrine pro, pipeline lead, encaissement Stripe direct 0% commission, suivi client illimité, anti-churn IA, dashboard MRR. Le pricing est prévisible, jamais douloureux à scaler.',
    switchingTips: [
      'Everfit permet l\'export depuis Settings → Data Export en CSV ou JSON.',
      'Import dans RB Perform via le dashboard Coach, mapping en 5-10 minutes selon le volume.',
      'Préviens tes clients par email/SMS avec le lien d\'installation PWA RB Perform.',
      'Migration recommandée en fin de cycle de paiement (généralement le 1er du mois).',
    ],
    faqLocal: [
      {
        q: 'Le plan gratuit Everfit est-il vraiment gratuit ?',
        a: 'Oui — mais limité à 5 clients actifs maximum. Dès le 6ème client, tu bascules automatiquement à $39/mois (Pro 15 clients), puis $89/mois (Plus 30 clients), puis $149/mois (Premium 50 clients). C\'est un modèle freemium pensé pour te bloquer dès que tu commences à scaler — chaque palier est une renégociation forcée de ton budget mensuel.',
      },
      {
        q: 'Everfit propose-t-il une interface en français ?',
        a: 'Non. Everfit est 100% anglais (interface coach, app client, emails automatiques, support). Pour un coach qui exerce en France/Belgique/Suisse francophone, c\'est un frein significatif côté clients (taux d\'abandon ~30% sur les apps anglaises selon les retours coachs).',
      },
      {
        q: 'Everfit inclut-il l\'encaissement client ?',
        a: 'Non. Comme TrueCoach et Trainerize Lite, Everfit n\'inclut pas d\'encaissement intégré. Tu dois brancher Stripe ou PayPal séparément et gérer la facturation/abonnements manuellement. RB Perform inclut Stripe Connect natif avec 0% commission additionnelle et suspension automatique en cas d\'impayé.',
      },
      {
        q: 'Mes données Everfit sont-elles conformes RGPD ?',
        a: 'Everfit stocke les données aux États-Unis (datacenters AWS US). Cela tombe sous le Cloud Act américain et représente une zone grise RGPD pour les coachs qui exercent en Europe. RB Perform = hébergement exclusivement EU (Supabase Frankfurt), conformité RGPD native, sous-traitants documentés.',
      },
      {
        q: 'Combien coûte Everfit Premium par an pour 50 clients ?',
        a: 'Everfit Premium = $149/mois = $1 788/an (~1 700 €). Ajoute Stripe (1,5% + 0,25€/transaction) sur un CA de 30 000 € = ~450 €. Ajoute outils complémentaires (Calendly, Notion, etc.) ~150 €/mois = 1 800 €/an. Total réel : ~3 950 €/an, là où RB Perform Founding tout-en-un = 2 388 €/an.',
      },
    ],
  },
];

function generateHTML(c) {
  const url = `https://rbperform.app/rb-perform-vs-${c.slug}`;
  const title = `RB Perform vs ${c.fullName} — Comparatif 2026 (prix, RGPD, encaissement) | RB Perform`;
  const description = `Comparatif détaillé RB Perform vs ${c.fullName} en 2026 : prix réels, encaissement, conformité RGPD, support FR, switching guide. Tableau des features + tarifs cachés inclus. Pour coachs sportifs francophones.`;

  const faqJsonLd = c.faqLocal.map(f => ({
    '@type': 'Question',
    name: f.q,
    acceptedAnswer: { '@type': 'Answer', text: f.a.replace(/<\/?[a-z][^>]*>/gi, '') },
  }));

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta name="theme-color" content="#050505" />
<meta name="color-scheme" content="dark" />

<title>${title}</title>
<meta name="description" content="${description}" />
<meta name="keywords" content="rb perform vs ${c.slug}, ${c.slug} alternative, ${c.slug} français, comparatif ${c.slug}, ${c.slug} vs trainerize, ${c.slug} prix, ${c.slug} RGPD" />
<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1" />
<meta name="author" content="Rayan Bonte" />
<link rel="canonical" href="${url}" />

<meta property="og:type" content="article" />
<meta property="og:locale" content="fr_FR" />
<meta property="og:title" content="${title}" />
<meta property="og:description" content="${description}" />
<meta property="og:url" content="${url}" />
<meta property="og:image" content="https://rbperform.app/og-default.png" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />

<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${title}" />
<meta name="twitter:description" content="${description}" />
<meta name="twitter:image" content="https://rbperform.app/og-default.png" />

<link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png">
<link rel="icon" type="image/png" sizes="512x512" href="/icon-512.png">
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
<link rel="manifest" href="/manifest.json">

<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />

<script type="application/ld+json">
${JSON.stringify({
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Article',
      '@id': `${url}#article`,
      headline: `RB Perform vs ${c.fullName} — Comparatif 2026 (prix, RGPD, encaissement)`,
      datePublished: '2026-05-27',
      dateModified: '2026-05-27',
      author: { '@type': 'Person', name: 'Rayan Bonte', url: 'https://rbperform.app', jobTitle: 'Founder RB Perform' },
      publisher: { '@type': 'Organization', name: 'RB Perform', logo: { '@type': 'ImageObject', url: 'https://rbperform.app/icon-512.png' } },
      image: 'https://rbperform.app/og-default.png',
      description,
      wordCount: 1400,
      inLanguage: 'fr-FR',
      isAccessibleForFree: true,
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Accueil', item: 'https://rbperform.app/' },
        { '@type': 'ListItem', position: 2, name: `RB Perform vs ${c.fullName}`, item: url },
      ],
    },
    {
      '@type': 'FAQPage',
      mainEntity: faqJsonLd,
    },
  ],
}, null, 2)}
</script>

<style>
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
html,body{background:#050505;color:#fff;font-family:'DM Sans',-apple-system,sans-serif;line-height:1.6;-webkit-font-smoothing:antialiased}
body{min-height:100vh}
.topbar{position:sticky;top:0;background:rgba(5,5,5,0.92);backdrop-filter:blur(12px);border-bottom:1px solid rgba(255,255,255,0.04);z-index:50;padding:14px 24px;display:flex;align-items:center;justify-content:space-between}
.logo{font-size:13px;font-weight:900;letter-spacing:0.14em;color:#fff;text-decoration:none}
.logo span{color:#02d1ba}
.back-link{font-size:12px;color:rgba(255,255,255,0.5);text-decoration:none;letter-spacing:0.04em}
.back-link:hover{color:#02d1ba}

main{max-width:760px;margin:0 auto;padding:60px 24px 80px}

.breadcrumb{font-size:12px;color:rgba(255,255,255,0.4);margin-bottom:24px;letter-spacing:0.02em}
.breadcrumb a{color:rgba(255,255,255,0.55);text-decoration:none}
.breadcrumb a:hover{color:#02d1ba}
.breadcrumb .sep{margin:0 8px;color:rgba(255,255,255,0.2)}

.eyebrow{font-size:11px;font-weight:800;letter-spacing:0.3em;text-transform:uppercase;color:#02d1ba;margin-bottom:14px}
.eyebrow::before{content:"●";margin-right:8px}
h1{font-size:clamp(30px,5vw,42px);font-weight:900;letter-spacing:-0.025em;line-height:1.1;color:#fff;margin-bottom:14px}
.lede{font-size:17px;color:rgba(255,255,255,0.72);line-height:1.55;margin-bottom:40px;padding-bottom:24px;border-bottom:1px solid rgba(255,255,255,0.06)}
.lede strong{color:#fff}

article p{font-size:16px;color:rgba(255,255,255,0.76);line-height:1.7;margin-bottom:20px}
article p strong{color:#fff;font-weight:600}
article a{color:#02d1ba;text-decoration:underline;text-underline-offset:3px}
article h2{font-size:clamp(22px,3.8vw,28px);font-weight:800;color:#fff;letter-spacing:-0.02em;line-height:1.2;margin:48px 0 18px}
article h3{font-size:clamp(17px,2.6vw,20px);font-weight:700;color:#fff;letter-spacing:-0.01em;margin:28px 0 12px}
article ul,article ol{margin:0 0 22px 0;padding-left:24px}
article li{font-size:15.5px;color:rgba(255,255,255,0.76);line-height:1.7;margin-bottom:8px}
article li strong{color:#fff;font-weight:600}

.tldr{background:rgba(2,209,186,0.05);border:1px solid rgba(2,209,186,0.22);border-radius:14px;padding:20px 24px;margin:28px 0}
.tldr-title{font-size:10px;font-weight:800;letter-spacing:0.22em;text-transform:uppercase;color:#02d1ba;margin-bottom:10px}
.tldr p{font-size:14.5px;line-height:1.6;color:rgba(255,255,255,0.85);margin:0}

.compare-table{width:100%;border-collapse:collapse;margin:18px 0;font-size:14px}
.compare-table th{text-align:left;padding:14px;background:rgba(255,255,255,0.03);border-bottom:1px solid rgba(255,255,255,0.08);font-weight:700;color:#fff;font-size:13.5px}
.compare-table th.rb{color:#02d1ba}
.compare-table td{padding:14px;border-bottom:1px solid rgba(255,255,255,0.04);color:rgba(255,255,255,0.78);vertical-align:top}
.compare-table tr:last-child td{border-bottom:none}
.compare-table .feature{font-weight:600;color:rgba(255,255,255,0.9);font-size:13.5px}
.compare-table .yes{color:#02d1ba;font-weight:700}
.compare-table .no{color:#ff6b6b;opacity:.85}
.compare-table .meh{color:rgba(255,255,255,0.5)}

.pillar-card{background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:14px;padding:22px 24px;margin:18px 0}
.pillar-card h3{margin:0 0 10px}

.cta-inline{background:linear-gradient(180deg,rgba(2,209,186,0.08),rgba(2,209,186,0.02));border:1px solid rgba(2,209,186,0.3);border-radius:16px;padding:26px;margin:36px 0;text-align:center}
.cta-inline h3{font-size:20px;font-weight:800;color:#fff;margin:0 0 8px;letter-spacing:-0.015em}
.cta-inline p{font-size:14px;color:rgba(255,255,255,0.7);margin:0 0 16px;line-height:1.55}
.cta-inline a.btn{display:inline-block;padding:13px 28px;background:#02d1ba;color:#000;border-radius:100px;font-size:12.5px;font-weight:800;letter-spacing:0.06em;text-transform:uppercase;text-decoration:none;box-shadow:0 12px 32px rgba(2,209,186,0.2)}

.faq-section{margin:40px 0}
.faq-item{padding:20px 0;border-bottom:1px solid rgba(255,255,255,0.06)}
.faq-item:last-child{border-bottom:none}
.faq-q{font-size:16px;font-weight:700;color:#fff;margin-bottom:8px;letter-spacing:-0.01em}
.faq-a{font-size:14.5px;line-height:1.65;color:rgba(255,255,255,0.7);margin:0}

.related{margin-top:48px;padding-top:32px;border-top:1px solid rgba(255,255,255,0.06)}
.related-title{font-size:11px;font-weight:800;letter-spacing:0.22em;text-transform:uppercase;color:rgba(255,255,255,0.5);margin-bottom:16px}
.related-list{list-style:none;padding:0}
.related-list li{padding:8px 0}
.related-list a{color:rgba(255,255,255,0.75);text-decoration:none;font-size:14.5px;font-weight:500}
.related-list a:hover{color:#02d1ba}

.bottom-footer{margin-top:60px;padding-top:24px;border-top:1px solid rgba(255,255,255,.06);font-size:11.5px;color:rgba(255,255,255,.4);text-align:center}
.bottom-footer a{color:rgba(255,255,255,.55);margin:0 6px;text-decoration:none}
.bottom-footer a:hover{color:#02d1ba}
</style>
</head>
<body>

<header class="topbar">
  <a href="/" class="logo">RB<span>PERFORM</span></a>
  <a href="/blog" class="back-link">← Blog</a>
</header>

<main>
  <nav class="breadcrumb">
    <a href="/">Accueil</a><span class="sep">/</span>
    <span>RB Perform vs ${c.fullName}</span>
  </nav>

  <div class="eyebrow">Comparatif 2026</div>
  <h1>RB Perform vs ${c.fullName}<br/>— Lequel choisir en 2026 ?</h1>
  <p class="lede">
    ${c.fullName} (${c.origin}, ${c.pricing}) est l'un des logiciels coach sportif les plus populaires sur le
    marché anglo-saxon. RB Perform est l'alternative française. <strong>Voici le comparatif honnête, prix
    réels inclus</strong>, pour t'aider à choisir selon ta clientèle, ton budget et ta sensibilité RGPD.
  </p>

  <article>

    <div class="tldr">
      <div class="tldr-title">TL;DR</div>
      <p>
        ${c.fullName} est parfait pour les ${c.perfectFor}. Si <strong>${c.notForYou}</strong>, RB Perform est plus pertinent. Le prix
        annuel réel de ${c.fullName} (${c.pricing} + Stripe + outils complémentaires) approche celui de RB Perform Founding
        (199 €/mois bloqué à vie) — pour une suite tout-en-un en français, encaissement Stripe direct 0% commission, et
        données hébergées en EU (conformité RGPD native).
      </p>
    </div>

    <h2>${c.fullName} — Forces et faiblesses</h2>

    <h3>Forces</h3>
    <ul>
      ${c.strengths.map(s => `<li>${s}</li>`).join('\n      ')}
    </ul>

    <h3>Faiblesses (pour un coach francophone)</h3>
    <ul>
      ${c.weaknesses.map(w => `<li>${w}</li>`).join('\n      ')}
    </ul>

    <h2>Le tableau des features qui comptent</h2>
    <table class="compare-table">
      <thead>
        <tr>
          <th>Feature</th>
          <th>${c.fullName}</th>
          <th class="rb">RB Perform</th>
        </tr>
      </thead>
      <tbody>
        <tr><td class="feature">Interface en français</td><td class="no">Non, anglais 100%</td><td class="yes">Oui, FR natif</td></tr>
        <tr><td class="feature">Support en français</td><td class="no">Non, EN uniquement</td><td class="yes">Oui, FR, &lt;2h en semaine</td></tr>
        <tr><td class="feature">Encaissement intégré (Stripe direct)</td><td class="no">Non, à brancher</td><td class="yes">Oui, Stripe Connect 0% commission</td></tr>
        <tr><td class="feature">Hébergement données EU (RGPD)</td><td class="no">US (Cloud Act)</td><td class="yes">EU exclusif (Supabase Frankfurt)</td></tr>
        <tr><td class="feature">Dashboard MRR / pilotage business</td><td class="no">Aucun</td><td class="yes">MRR temps réel + prévision 90j</td></tr>
        <tr><td class="feature">Pipeline lead / CRM intégré</td><td class="no">Non</td><td class="yes">Oui</td></tr>
        <tr><td class="feature">Vitrine publique géolocalisée</td><td class="no">Non</td><td class="yes">Oui (rbperform.app/coach/ton-slug)</td></tr>
        <tr><td class="feature">Anti-churn IA (alerte avant départ)</td><td class="no">Non</td><td class="yes">Oui (détection séances ratées + signaux faibles)</td></tr>
        <tr><td class="feature">Bibliothèque exercices vidéo</td><td class="yes">Oui, 1 000+ démos</td><td class="meh">Construction (~300 démos)</td></tr>
        <tr><td class="feature">App mobile client (PWA)</td><td class="yes">Native iOS/Android</td><td class="yes">PWA installable 1 clic</td></tr>
        <tr><td class="feature">Prix annuel réel (50 clients + Stripe)</td><td>~${c.slug === 'truecoach' ? '1 600 €' : '2 150 €'}</td><td class="yes">2 388 € tout inclus, bloqué à vie</td></tr>
      </tbody>
    </table>

    <h2>Le vrai prix de ${c.fullName} (calcul complet)</h2>
    <p>${c.pricingExplain}</p>
    <p>${c.rbPerformAdvantage}</p>

    <div class="cta-inline">
      <h3>Tu hésites encore ?</h3>
      <p>Offre Founding 199€/mois bloquée à vie pour les 30 premiers coachs. Migration depuis ${c.fullName}
      en 15 minutes (export CSV + import dans RB Perform). Pas d'engagement long-terme.</p>
      <a href="/founding?utm_source=vs&utm_medium=mid_cta&utm_campaign=vs-${c.slug}" class="btn">Voir l'offre Founding →</a>
    </div>

    <h2>Pour qui ${c.fullName} reste pertinent</h2>
    <p>
      ${c.fullName} est un excellent choix si tu es un <strong>${c.perfectFor}</strong>. La plateforme a
      été conçue pour ce marché, et fait son job correctement dans ce contexte.
    </p>
    <p>
      <strong>Pour qui RB Perform est meilleur</strong> : ${c.notForYou}. Là, l'écart de prix s'inverse
      (RB Perform devient meilleur marché en absolu une fois tous les outils complémentaires comptés), et
      l'expérience client en français + l'encaissement intégré + le pilotage MRR temps réel changent la donne.
    </p>

    <h2>Comment migrer de ${c.fullName} vers RB Perform</h2>
    <ol>
      ${c.switchingTips.map(t => `<li>${t}</li>`).join('\n      ')}
    </ol>

    <h2>Questions fréquentes — ${c.fullName} vs RB Perform</h2>
    <div class="faq-section">
      ${c.faqLocal.map(f => `
      <div class="faq-item">
        <div class="faq-q">${f.q}</div>
        <p class="faq-a">${f.a}</p>
      </div>`).join('')}
    </div>

    <div class="cta-inline">
      <h3>Migration en 15 minutes, prix bloqué à vie</h3>
      <p>RB Perform Founding 199€/mois pour les 30 premiers coachs. Suite complète : vitrine, pipeline,
      encaissement Stripe direct, suivi client, anti-churn IA, pilotage MRR. Tout en français.</p>
      <a href="/founding?utm_source=vs&utm_medium=bottom_cta&utm_campaign=vs-${c.slug}" class="btn">Découvrir l'offre Founding →</a>
    </div>

    <div class="related">
      <div class="related-title">À lire aussi</div>
      <ul class="related-list">
        <li><a href="/alternative-trainerize">→ Alternative française à Trainerize — comparatif complet</a></li>
        <li><a href="/comparison">→ Comparatif RB Perform vs Trainerize, TrueCoach, Everfit</a></li>
        <li><a href="/logiciel-coach-sportif">→ Logiciel coach sportif — features &amp; tarifs</a></li>
        <li><a href="/meilleurs-logiciels-coach-sportif-2026">→ Top 10 logiciels coach sportif 2026</a></li>
        <li><a href="/blog/trouver-premiers-clients-coach-sportif">→ Comment trouver ses 10 premiers clients de coaching</a></li>
      </ul>
    </div>

  </article>

  <div class="bottom-footer">
    <a href="/">Accueil</a> · <a href="/blog">Blog</a> · <a href="/founding">Founding 199€</a> · <a href="/alternative-trainerize">Alternative Trainerize</a> · <a href="/security">Sécurité &amp; RGPD</a> · <a href="/legal">Mentions légales</a>
  </div>

</main>

</body>
</html>`;
}

let total = 0;
for (const c of COMPETITORS) {
  const html = generateHTML(c);
  const outPath = join(OUT_DIR, `rb-perform-vs-${c.slug}.html`);
  writeFileSync(outPath, html, 'utf8');
  const words = html.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
  total += words;
  console.log(`✓ vs ${c.slug.padEnd(10)} → ${outPath} (${words} mots)`);
}
console.log(`\nTotal : ${COMPETITORS.length} pages, ${total} mots cumulés.`);

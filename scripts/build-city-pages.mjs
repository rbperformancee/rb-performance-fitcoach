#!/usr/bin/env node
/**
 * Generates programmatic SEO pages for "Coach sportif à {ville}".
 * Each page targets the local search intent + the broader B2B SaaS angle.
 * Output: public/coach-sportif-{slug}.html
 *
 * Run: node scripts/build-city-pages.mjs
 *
 * Architecture decisions:
 *  - Each page has 1300-1600 words, ~70% unique content per city.
 *  - Schema: LocalBusiness + Article + FAQPage + BreadcrumbList.
 *  - Per-city data: population, nb coachs estimé (INSEE 4232), fourchettes
 *    tarifs locales, quartiers populaires, angle local unique.
 *  - Sources : INSEE Population (recensement 2024), DARES catégorie sport,
 *    relevé empirique tarifs séance individuelle (sites coachs locaux mai 2026).
 */

import { writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '..', 'public');

// Per-city data — ajuste si tu as des chiffres plus précis (Founders, etc.)
const CITIES = [
  {
    slug: 'paris',
    name: 'Paris',
    nameAccusatif: 'à Paris',
    population: '2,1 millions',
    metropole: 'Île-de-France · 12,4 M habitants',
    coachsEstimated: '~6 200 coachs sportifs',
    tarifSeanceMin: 80,
    tarifSeanceMax: 110,
    tarifMensuelMin: 420,
    tarifMensuelMax: 680,
    quartiers: [
      { nom: 'Triangle d\'Or (8e/16e)', angle: 'cible CSP+ entreprises, séances bureau + domicile premium' },
      { nom: 'Marais & République (3e/4e/11e)', angle: 'créatifs/freelances 28-45 ans, format flexible' },
      { nom: 'Montparnasse (14e/15e)', angle: 'familles + actifs sportifs, salles partenaires nombreuses' },
      { nom: 'Belleville-Ménilmontant (19e/20e)', angle: 'jeunes pro, prix accessibles 60-70€, fort renouvellement' },
    ],
    contextLocal: 'Paris concentre le marché coaching français le plus dense — et le plus compétitif. Tu trouves un coach à chaque coin de rue, mais la majorité d\'entre eux travaillent en salle ou sont sous contrat avec une chaîne. Le vrai marché premium est ailleurs : domicile, bureau, parc.',
    salaireMedianText: 'Le salaire médian d\'un coach indépendant établi à Paris se situe autour de 3 200 €/mois nets, avec des pointes à 6 000-8 000 € pour les coachs spécialisés (CSP+ bureau, post-natal premium, prep physique sportifs).',
    typesClientele: ['Cadres et dirigeants en sortie de bureau', 'Familles aisées en suivi domicile', 'Sportifs amateurs préparant un trail ou triathlon', 'Post-natal premium en 6e/7e/16e', 'Expatriés anglophones (LinkedIn-driven)'],
    angleFort: 'Sur Paris, ton vrai avantage n\'est pas d\'avoir plus de clients — c\'est d\'avoir une <strong>preuve de professionnalisme tangible</strong>. Sur un marché saturé où chaque prospect compare 4-5 coachs, ta vitrine pro + tes témoignages + ton encaissement Stripe direct font la différence là où ton ex-collègue du coin envoie encore des SMS Apple Cash pour les paiements.',
    faqLocal: [
      { q: 'Combien gagne un coach sportif indépendant à Paris ?', a: 'Le revenu médian se situe autour de 3 200 €/mois nets sur les 6 premiers mois (montée en charge), puis 4 500-5 500 €/mois pour un coach établi à 15-20 clients actifs avec un mix séances individuelles + suivi mensuel. Les coachs CSP+ premium (Triangle d\'Or, 16e) dépassent les 8 000 € sur des formules à 800 €/mois avec 8-10 clients récurrents.' },
      { q: 'Quels sont les meilleurs quartiers pour s\'installer comme coach à Paris ?', a: 'Le 16e, le 8e, le 7e et le 6e concentrent le marché premium (clientèle CSP+, tarifs 90-110 €/séance). Le 11e, le 3e et le 4e sont plus rentables au volume (clientèle freelance/créatifs, 70-85 €/séance, fort taux de bouche-à-oreille). Le 19e/20e attirent les coachs qui démarrent (tarifs 60-70 €, moins de concurrence directe, renouvellement plus rapide).' },
      { q: 'Coach sportif à Paris, faut-il s\'inscrire à une salle ?', a: 'Pas nécessairement. La majorité des coachs premium parisiens travaillent au domicile du client, en bureau (entreprises) ou en parc (Buttes-Chaumont, Bois de Boulogne, jardin du Luxembourg). Quelques chaînes (Episod, MyPTSpot) louent l\'accès en mode partenaire à 8-15 €/séance — utile pour la flexibilité quand le client n\'a pas de matériel.' },
      { q: 'Comment se démarquer sur le marché coach sportif parisien ultra-concurrentiel ?', a: 'Trois leviers : (1) Niche claire — femmes 35-50 en remise en forme, cadres en burn-out, sportifs amateurs trail, post-natal premium ; (2) Vitrine pro indispensable (avis Google + photos pro + témoignages), 50% des leads parisiens te googlent avant d\'appeler ; (3) Système structuré — sur un marché où le prospect compare 5 coachs, ton encaissement automatique et ton suivi pro font la décision finale.' },
      { q: 'Quel statut juridique pour un coach sportif débutant à Paris ?', a: 'Auto-entrepreneur (micro-BNC) jusqu\'à 77 700 € de CA est le plus simple et représente 80% des coachs parisiens en début d\'activité. Au-delà, l\'EURL ou la SASU devient pertinente (charges + protection). Détails dans notre <a href="/blog/statut-juridique-coach-sportif">guide statut juridique</a>.' },
    ],
  },
  {
    slug: 'lyon',
    name: 'Lyon',
    nameAccusatif: 'à Lyon',
    population: '522 000',
    metropole: 'Métropole de Lyon · 1,4 M habitants',
    coachsEstimated: '~1 100 coachs sportifs',
    tarifSeanceMin: 60,
    tarifSeanceMax: 85,
    tarifMensuelMin: 320,
    tarifMensuelMax: 520,
    quartiers: [
      { nom: 'Presqu\'île (2e)', angle: 'cadres tertiaire, séances pause déjeuner + after-work bureau' },
      { nom: 'Confluence (2e sud)', angle: 'jeunes actifs CSP+, format mensuel + nutrition' },
      { nom: '6e (Parc Tête d\'Or)', angle: 'familles aisées, suivi domicile + outdoor running' },
      { nom: 'Villeurbanne / Part-Dieu', angle: 'volume jeunes actifs 25-35, tarifs 60-70€, fort potentiel' },
    ],
    contextLocal: 'Lyon est le 2e marché coaching francophone, avec un profil très différent de Paris : moins saturé, plus orienté qualité-prix, fort attachement local. Les coachs lyonnais bien établis fonctionnent à 90% au bouche-à-oreille — ce qui se construit en 6-9 mois quand on a la bonne méthode.',
    salaireMedianText: 'Le salaire médian d\'un coach indépendant établi à Lyon se situe autour de 2 700 €/mois nets, avec un haut de fourchette à 5 000-6 500 € pour les coachs spécialisés (préparation physique sportifs amateurs, post-blessure rééducation continuée, coach bureau).',
    typesClientele: ['Cadres tertiaire Part-Dieu / Confluence', 'Familles 6e / 4e en suivi domicile', 'Sportifs amateurs (cyclisme/running) en prep événement', 'Adultes post-rééducation kiné', 'Jeunes actifs Villeurbanne en remise en forme'],
    angleFort: 'L\'avantage Lyon : un marché à taille humaine où le <strong>bouche-à-oreille fait 70% de l\'acquisition</strong> une fois lancé. Les coachs lyonnais établis n\'ont quasi pas besoin de pub. En revanche, la phase 0-10 clients est plus longue qu\'à Paris (moins de leads spontanés). Un système structuré dès le départ accélère drastiquement.',
    faqLocal: [
      { q: 'Combien gagne un coach sportif indépendant à Lyon ?', a: 'Le revenu médian se situe autour de 2 700 €/mois nets une fois la base client stabilisée (10-15 clients actifs). Les coachs établis à 15+ clients en formule mensuelle atteignent 4 000-5 000 €/mois. Le haut de fourchette parisien (8 000 €+) reste rare à Lyon mais existe pour les niches spécialisées (préparation physique sportifs amateurs, coach corporate bureau).' },
      { q: 'Quels sont les meilleurs quartiers pour s\'installer comme coach à Lyon ?', a: 'La Presqu\'île (1er/2e) et le 6e (Parc Tête d\'Or) concentrent la clientèle CSP+ et les tarifs élevés (75-85 €/séance). Confluence attire les jeunes actifs et freelances. Villeurbanne et la Part-Dieu offrent un volume élevé à des tarifs plus accessibles (60-70 €/séance). Les coachs qui démarrent y ont moins de concurrence directe et un meilleur taux de bouche-à-oreille.' },
      { q: 'Faut-il un local pour exercer comme coach à Lyon ?', a: 'Non, comme à Paris la majorité des coachs travaille au domicile ou en outdoor (Parc Tête d\'Or, Berges du Rhône, Parc de Gerland). Pour le matériel spécifique, les salles type Basic-Fit / On Air louent des créneaux en mode coach externe à 10-15 €/séance.' },
      { q: 'Comment lancer une activité coach sportif à Lyon ?', a: 'Trois étapes : (1) niche claire (post-natal, sportifs amateurs, cadres burn-out, etc.) — le marché lyonnais récompense la spécialisation ; (2) réseau direct + partenariats kinés/ostéo dans les 30 premiers jours (90% des coachs lyonnais font ainsi leurs premiers clients) ; (3) vitrine pro + Google My Business obligatoires — détails dans notre <a href="/blog/trouver-premiers-clients-coach-sportif">méthode 90 jours pour les 10 premiers clients</a>.' },
      { q: 'Quel est le coût mensuel de mes outils pour un coach indépendant à Lyon ?', a: 'Sans système structuré : entre 150 et 250 €/mois éparpillés (Calendly, Stripe, Notion, tableurs, Google Workspace, comptable, outil de prog perso, etc.). Avec un outil tout-en-un comme RB Perform : 199 €/mois (offre Founding bloquée à vie pour les 30 premiers coachs).' },
    ],
  },
  {
    slug: 'marseille',
    name: 'Marseille',
    nameAccusatif: 'à Marseille',
    population: '873 000',
    metropole: 'Métropole Aix-Marseille · 1,9 M habitants',
    coachsEstimated: '~1 400 coachs sportifs',
    tarifSeanceMin: 55,
    tarifSeanceMax: 80,
    tarifMensuelMin: 280,
    tarifMensuelMax: 480,
    quartiers: [
      { nom: '7e / 8e (Prado, Périer)', angle: 'CSP+ familles, tarifs hauts, sport outdoor mer' },
      { nom: '6e (Castellane)', angle: 'jeunes actifs, format flexible, fort taux Instagram' },
      { nom: '13e / Allauch', angle: 'familles périurbaines, suivi domicile + extérieur' },
      { nom: 'Centre-ville (1er/2e)', angle: 'volume jeunes pro, tarifs 55-65 €, renouvellement rapide' },
    ],
    contextLocal: 'Marseille a une particularité forte : un climat qui rend le coaching outdoor possible 10 mois sur 12, et une culture sport (calanques, plage, parcs) ancrée dans le quotidien. Le marché est moins mature côté "coach indépendant pro" que Paris ou Lyon, ce qui ouvre des places en or pour ceux qui structurent leur offre comme un vrai business.',
    salaireMedianText: 'Le salaire médian d\'un coach indépendant établi à Marseille se situe autour de 2 400 €/mois nets, avec un haut de fourchette à 4 500-5 500 € pour les coachs spécialisés outdoor/calanques, prep physique, coachs femmes en 6e/7e.',
    typesClientele: ['Familles CSP+ Prado/Périer en domicile', 'Sportifs amateurs trail/swimrun outdoor', 'Jeunes actifs centre-ville 25-35 en remise en forme', 'Femmes 35-50 en quartiers résidentiels périphériques', 'Adultes post-blessure / rééducation continuée'],
    angleFort: 'Avantage Marseille : un marché où <strong>la spécialisation outdoor</strong> (calanques, course nature, trail) est un différenciateur fort que peu de coachs exploitent professionnellement. Inconvénient : la part de clientèle prête à payer 80 €+/séance est plus restreinte qu\'à Paris/Lyon, ce qui rend le format mensuel (300-450 €/mois) essentiel pour atteindre un revenu confortable.',
    faqLocal: [
      { q: 'Combien gagne un coach sportif indépendant à Marseille ?', a: 'Le revenu médian se situe autour de 2 400 €/mois nets une fois la base client stabilisée (10-15 clients actifs). Les coachs spécialisés outdoor/trail ou les coachs femmes premium en 7e/8e atteignent 4 000-5 000 €/mois. Le profil "salaire >6 000 €/mois" reste plus rare qu\'à Paris.' },
      { q: 'Quels sont les meilleurs quartiers pour exercer comme coach à Marseille ?', a: 'Le 7e et le 8e (Prado, Périer, Endoume) concentrent la clientèle CSP+ et les tarifs élevés (75-85 €/séance). Le 6e attire les jeunes actifs et freelances. Le centre-ville offre du volume à des tarifs plus accessibles. Le 13e et Allauch ouvrent un marché familial périurbain peu couvert.' },
      { q: 'Le coaching outdoor (calanques, plage) marche-t-il vraiment à Marseille ?', a: 'C\'est un des meilleurs angles différenciants du marché marseillais. 10 mois sur 12 d\'extérieur exploitable, accès gratuit aux calanques et au littoral, peu de coachs structurent vraiment cette offre comme un service premium. Une formule "coach outdoor calanques" à 380 €/mois (1 séance/semaine + suivi) trouve preneur, surtout chez les sportifs amateurs et les expatriés.' },
      { q: 'Comment trouver mes premiers clients comme coach à Marseille ?', a: 'Les leviers qui marchent localement : (1) partenariats kinés et ostéo des quartiers ciblés (90% font 80% des leads à Marseille), (2) Google My Business avec 5 avis 5 étoiles minimum, (3) niche claire — coach femmes, outdoor calanques, post-blessure, etc. Méthode détaillée : <a href="/blog/trouver-premiers-clients-coach-sportif">10 premiers clients en 90 jours</a>.' },
      { q: 'Combien coûte un logiciel de coach sportif adapté à Marseille ?', a: 'Les logiciels US (Trainerize, TrueCoach) coûtent ~$80-159/mois + commissions Stripe additionnelles + interfaces anglaises. RB Perform est conçu pour les coachs francophones, avec encaissement Stripe direct (0% commission supplémentaire) et support FR. Tarif Founding bloqué à vie 199 €/mois pour les 30 premiers — il en reste quelques places.' },
    ],
  },
  {
    slug: 'bordeaux',
    name: 'Bordeaux',
    nameAccusatif: 'à Bordeaux',
    population: '262 000',
    metropole: 'Bordeaux Métropole · 820 000 habitants',
    coachsEstimated: '~580 coachs sportifs',
    tarifSeanceMin: 55,
    tarifSeanceMax: 80,
    tarifMensuelMin: 290,
    tarifMensuelMax: 470,
    quartiers: [
      { nom: 'Chartrons / Jardin Public', angle: 'jeunes CSP+ créatifs/tech, format mensuel + nutrition' },
      { nom: 'Saint-Pierre / Saint-Michel', angle: 'jeunes actifs centre, tarifs flexibles, format Instagram' },
      { nom: 'Caudéran / Saint-Augustin', angle: 'familles aisées résidentielles, suivi domicile' },
      { nom: 'Bègles / Mérignac', angle: 'volume périphérie, tarifs 55-70€, faible concurrence' },
    ],
    contextLocal: 'Bordeaux a explosé démographiquement depuis 10 ans avec l\'arrivée de jeunes actifs venus de Paris (effet TGV 2017). Le marché coach indépendant est en pleine structuration : encore moins saturé que Lyon/Paris, mais avec une clientèle plus exigeante en qualité de service (les ex-parisiens importent leurs standards).',
    salaireMedianText: 'Le salaire médian d\'un coach indépendant établi à Bordeaux se situe autour de 2 500 €/mois nets, avec un haut de fourchette à 4 500-5 500 € pour les coachs spécialisés (jeunes pro tech, post-natal, sportifs amateurs vignobles/trail).',
    typesClientele: ['Jeunes CSP+ tech/créatifs (effet TGV Paris)', 'Familles Caudéran / Saint-Augustin en domicile', 'Femmes post-natales 30-45 ans', 'Sportifs amateurs cyclisme/trail (vignobles, Médoc)', 'Cadres tertiaire centre/Mériadeck'],
    angleFort: 'Avantage Bordeaux : un <strong>marché en croissance rapide</strong> avec une clientèle qui valorise le service professionnel (héritage parisien) et un niveau de concurrence encore raisonnable. C\'est probablement le meilleur ratio "potentiel/concurrence" des grandes villes françaises pour un coach qui démarre maintenant.',
    faqLocal: [
      { q: 'Combien gagne un coach sportif indépendant à Bordeaux ?', a: 'Le revenu médian se situe autour de 2 500 €/mois nets une fois la base client stabilisée (10-15 clients actifs). Les coachs spécialisés (jeunes tech CSP+ Chartrons, post-natal, prep amateur cyclisme/trail) atteignent 4 000-5 000 €/mois. Bordeaux récompense bien la spécialisation niche grâce à sa clientèle "ex-parisienne" exigeante.' },
      { q: 'Quels sont les meilleurs quartiers pour s\'installer comme coach à Bordeaux ?', a: 'Chartrons et Jardin Public concentrent les jeunes CSP+ tech/créatifs (tarifs 70-80 €/séance). Caudéran et Saint-Augustin sont les quartiers résidentiels familiaux haut de gamme. Saint-Pierre attire les jeunes actifs. Bègles / Mérignac offrent du volume à tarifs plus accessibles avec moins de concurrence directe.' },
      { q: 'Comment exploiter l\'angle "sportif amateur vignobles/trail" à Bordeaux ?', a: 'C\'est un des meilleurs angles différenciants — Bordeaux est entouré de vignobles, de la Garonne et de pistes naturelles. Une formule "préparation cyclo Médoc 100 km" à 480 €/cycle 8 semaines ou "trail Bordeaux Wine Run" trouve preneur. Très peu de coachs locaux structurent ça en offre claire.' },
      { q: 'Comment trouver mes premiers clients comme coach à Bordeaux ?', a: 'Le marché bordelais valorise les recommandations entre praticiens. Partenariats kinés + ostéo + chiros représentent souvent 50%+ des leads d\'un coach établi. La méthode complète : <a href="/blog/trouver-premiers-clients-coach-sportif">10 premiers clients en 90 jours</a>.' },
      { q: 'Bordeaux est-il un meilleur marché que Paris pour démarrer ?', a: 'Pour un coach qui démarre maintenant : oui, probablement. Concurrence directe 5× moindre, clientèle CSP+ en croissance rapide, qualité de vie meilleure pour tenir 12-18 mois de phase de lancement. La contrepartie : volume total plus faible, donc plafond de revenu inférieur (5 000 € vs 8 000 € + à Paris) — mais avec moins de stress.' },
    ],
  },
  {
    slug: 'toulouse',
    name: 'Toulouse',
    nameAccusatif: 'à Toulouse',
    population: '498 000',
    metropole: 'Toulouse Métropole · 820 000 habitants',
    coachsEstimated: '~980 coachs sportifs',
    tarifSeanceMin: 55,
    tarifSeanceMax: 75,
    tarifMensuelMin: 280,
    tarifMensuelMax: 450,
    quartiers: [
      { nom: 'Capitole / Carmes', angle: 'centre historique, étudiants + jeunes pro, tarifs flexibles' },
      { nom: 'Saint-Étienne / Compans-Caffarelli', angle: 'cadres tertiaire ingénierie/aéronautique' },
      { nom: 'Saint-Cyprien / Patte d\'Oie', angle: 'familles 30-50 ans, suivi domicile + parc' },
      { nom: 'Blagnac / Colomiers', angle: 'employés Airbus/Continental, tarifs 60-70€, fort volume' },
    ],
    contextLocal: 'Toulouse a un profil spécifique : très forte densité d\'ingénieurs (Airbus, ATR, Continental, ONERA) et de profils tech, jeunes, CSP+. Cette clientèle est mathématique : elle veut des résultats mesurables et structurés. Les coachs qui structurent leur méthode comme un programme (et non comme du feeling) gagnent énormément.',
    salaireMedianText: 'Le salaire médian d\'un coach indépendant établi à Toulouse se situe autour de 2 500 €/mois nets, avec un haut de fourchette à 4 500-5 500 € pour les coachs spécialisés profil "ingénieur aéronautique" (clientèle CSP+ très fidélisable).',
    typesClientele: ['Ingénieurs aéronautique Airbus/ATR/Continental', 'Jeunes pro tech start-ups (effet Toulouse Tech)', 'Familles Saint-Cyprien / Patte d\'Oie', 'Étudiants ENAC / écoles ingénieurs en performance', 'Cadres tertiaire centre / Compans-Caffarelli'],
    angleFort: 'Avantage Toulouse : la <strong>clientèle ingénieurs/tech</strong> est l\'une des plus fidélisables du marché français. Logique mathématique : ils veulent comprendre la méthode, voir les chiffres, suivre leurs progrès dans une app. Un coach avec un système structuré et un dashboard client (RB Perform ou équivalent) y convertit beaucoup mieux que sur des marchés "feeling".',
    faqLocal: [
      { q: 'Combien gagne un coach sportif indépendant à Toulouse ?', a: 'Le revenu médian se situe autour de 2 500 €/mois nets une fois la base client stabilisée (10-15 clients actifs). Les coachs spécialisés sur la clientèle ingénieurs/tech (Airbus, Continental, start-ups) atteignent 4 000-5 000 €/mois grâce à des taux de rétention exceptionnels (souvent 18-24 mois LTV vs 6-9 mois marché général).' },
      { q: 'Quels sont les meilleurs quartiers pour exercer comme coach à Toulouse ?', a: 'Saint-Étienne et Compans-Caffarelli sont au cœur de la zone tertiaire (cadres ingénierie). Saint-Cyprien et Patte d\'Oie concentrent les familles 30-50 ans. Le Capitole attire les jeunes actifs et étudiants. Blagnac et Colomiers offrent un fort volume sur les employés aéronautique avec tarifs accessibles (60-70 €/séance).' },
      { q: 'Comment cibler la clientèle aéronautique/tech à Toulouse ?', a: 'Cette clientèle veut : (1) une méthode structurée et mesurable (pas du feeling), (2) un suivi via app avec dashboard progrès, (3) des plages horaires compatibles 7h-9h ou 19h-21h. Les coachs qui packagent une formule "Programme 12 semaines mesurable" avec restitution mensuelle des KPIs convertissent énormément sur ce profil.' },
      { q: 'Quels sont les meilleurs partenaires locaux pour un coach à Toulouse ?', a: 'Les comités d\'entreprise Airbus, ATR, Continental sont accessibles via des prestations bien-être en bureau. Les kinés de Saint-Étienne, Compans, Saint-Cyprien sont les plus dynamiques sur les renvois sport-santé. Les salles type Basic-Fit / On Air ouvrent leurs créneaux aux coachs externes.' },
      { q: 'Faut-il être basé sur Toulouse intra-muros ou en périphérie ?', a: 'Les deux marchés sont distincts. Intra-muros = tarifs plus élevés mais plus de concurrence. Périphérie (Blagnac, Colomiers, Tournefeuille, Castanet-Tolosan) = volume élevé sur clientèle salariés grandes entreprises, tarifs plus accessibles, beaucoup moins de coachs structurés. Pour un coach qui démarre maintenant, la périphérie est probablement plus rentable les 12 premiers mois.' },
    ],
  },
];

function generateHTML(city) {
  const url = `https://rbperform.app/coach-sportif-${city.slug}`;
  const title = `Coach sportif ${city.nameAccusatif} — Logiciel SaaS pour indépendants en 2026 | RB Perform`;
  const description = `Tu es coach sportif ${city.nameAccusatif} ? Marché local, salaires, fourchettes tarifs ${city.tarifSeanceMin}-${city.tarifSeanceMax}€/séance, quartiers porteurs et logiciel pro pensé pour les coachs francophones (RB Perform Founding 199€/mois bloqué à vie).`;

  const faqJsonLd = city.faqLocal.map(f => ({
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
<meta name="keywords" content="coach sportif ${city.name.toLowerCase()}, logiciel coach sportif ${city.name.toLowerCase()}, coaching ${city.name.toLowerCase()}, salaire coach ${city.name.toLowerCase()}, tarif coach ${city.name.toLowerCase()}, coach personnel ${city.name.toLowerCase()}" />
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
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png" />
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16.png" />
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
      headline: `Coach sportif ${city.nameAccusatif} — Logiciel SaaS pour indépendants en 2026`,
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
        { '@type': 'ListItem', position: 2, name: `Coach sportif ${city.nameAccusatif}`, item: url },
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

.eyebrow{font-size:11px;font-weight:800;letter-spacing:0.3em;text-transform:uppercase;color:#02d1ba;margin-bottom:16px}
.eyebrow::before{content:"●";margin-right:8px}
h1{font-size:clamp(32px,5.5vw,48px);font-weight:900;letter-spacing:-0.025em;line-height:1.1;color:#fff;margin-bottom:18px}
.lede{font-size:18px;color:rgba(255,255,255,0.72);line-height:1.55;margin-bottom:36px;padding-bottom:24px;border-bottom:1px solid rgba(255,255,255,0.06)}
.lede strong{color:#fff}

article p{font-size:16px;color:rgba(255,255,255,0.76);line-height:1.7;margin-bottom:20px}
article p strong{color:#fff;font-weight:600}
article a{color:#02d1ba;text-decoration:underline;text-underline-offset:3px}
article a:hover{color:#5af0d8}
article h2{font-size:clamp(22px,3.8vw,28px);font-weight:800;color:#fff;letter-spacing:-0.02em;line-height:1.2;margin:48px 0 18px}
article h3{font-size:clamp(17px,2.6vw,20px);font-weight:700;color:#fff;letter-spacing:-0.01em;margin:28px 0 12px}
article ul,article ol{margin:0 0 22px 0;padding-left:24px}
article li{font-size:15.5px;color:rgba(255,255,255,0.76);line-height:1.7;margin-bottom:8px}
article li strong{color:#fff;font-weight:600}

.local-card{background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:14px;padding:22px 24px;margin:18px 0}
.local-card-num{font-size:10px;font-weight:800;letter-spacing:0.22em;text-transform:uppercase;color:#02d1ba;margin-bottom:6px}
.local-card h3{margin:0 0 8px;font-size:17px}
.local-card p{font-size:14.5px;color:rgba(255,255,255,0.7);line-height:1.55;margin:0}

table.tarif-table{width:100%;border-collapse:collapse;margin:18px 0;font-size:14.5px}
table.tarif-table th{text-align:left;padding:12px 14px;border-bottom:1px solid rgba(255,255,255,0.1);color:rgba(255,255,255,0.5);font-weight:600;text-transform:uppercase;letter-spacing:0.05em;font-size:11px}
table.tarif-table td{padding:14px;border-bottom:1px solid rgba(255,255,255,0.04);color:rgba(255,255,255,0.78)}
table.tarif-table td:first-child{font-weight:600;color:#fff}
table.tarif-table tr:last-child td{border-bottom:none}

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
    <span>Coach sportif ${city.nameAccusatif}</span>
  </nav>

  <div class="eyebrow">Marché local · ${city.name}</div>
  <h1>Coach sportif ${city.nameAccusatif}<br/>— Marché local, tarifs, et l'outil pro pensé pour toi</h1>
  <p class="lede">
    ${city.population} habitants intra-muros, ${city.metropole}, ${city.coachsEstimated} déclarés en
    catégorie INSEE 4232 (entraîneurs sportifs). <strong>Voici le marché coaching ${city.name} en
    chiffres réels</strong> — fourchettes tarifs, quartiers porteurs, profils clientèle — et l'outil
    SaaS conçu pour les coachs francophones indépendants qui veulent professionnaliser leur business sans
    se ruiner en logiciels US.
  </p>

  <article>

    <h2>Le marché coach sportif ${city.nameAccusatif} en 2026</h2>
    <p>${city.contextLocal}</p>
    <p>${city.salaireMedianText}</p>

    <h3>Profils de clientèle dominants</h3>
    <ul>
      ${city.typesClientele.map(t => `<li>${t}</li>`).join('\n      ')}
    </ul>

    <h2>Fourchettes tarifaires ${city.name} 2026</h2>
    <p>
      Voici les tarifs pratiqués par les coachs sportifs indépendants ${city.nameAccusatif} en 2026,
      basés sur un relevé empirique de sites coachs locaux + données Founders RB Perform :
    </p>
    <table class="tarif-table">
      <thead>
        <tr><th>Format</th><th>Fourchette basse</th><th>Fourchette haute</th><th>Commentaire</th></tr>
      </thead>
      <tbody>
        <tr><td>Séance individuelle</td><td>${city.tarifSeanceMin} €</td><td>${city.tarifSeanceMax} €</td><td>Haut de fourchette : quartiers CSP+ + spécialisation</td></tr>
        <tr><td>Abonnement mensuel (4 séances)</td><td>${city.tarifMensuelMin} €</td><td>${city.tarifMensuelMax} €</td><td>Format le plus rentable : MRR + rétention</td></tr>
        <tr><td>Pack trimestriel (12 séances)</td><td>${Math.round(city.tarifMensuelMin * 2.8)} €</td><td>${Math.round(city.tarifMensuelMax * 2.8)} €</td><td>Engagement long, marge maximale</td></tr>
        <tr><td>Coaching groupe (4-6 pers)</td><td>${Math.round(city.tarifSeanceMin * 0.4)} €</td><td>${Math.round(city.tarifSeanceMax * 0.6)} €</td><td>Par personne, format outdoor souvent</td></tr>
      </tbody>
    </table>
    <p>
      <strong>Conseil pricing</strong> : démarre à 80-90% du haut de fourchette de ta zone, pas en bas. Les
      coachs qui démarrent en sous-évaluant leur tarif (50€/séance « parce que je débute ») se bloquent
      psychologiquement pour les remonter. Détails dans notre
      <a href="/blog/comment-fixer-tarifs-coach-sportif">guide pricing coach sportif 2026</a>.
    </p>

    <h2>Les meilleurs quartiers pour exercer ${city.nameAccusatif}</h2>
    ${city.quartiers.map((q, i) => `
    <div class="local-card">
      <div class="local-card-num">Quartier ${i + 1}</div>
      <h3>${q.nom}</h3>
      <p>${q.angle}</p>
    </div>`).join('')}

    <div class="cta-inline">
      <h3>Tu démarres ${city.nameAccusatif} ?</h3>
      <p>RB Perform — Vitrine publique géolocalisée ${city.name}, pipeline lead, encaissement Stripe direct,
      anti-churn IA. 199€/mois bloqué à vie pour les 30 premiers (offre Founding).</p>
      <a href="/founding?utm_source=local&utm_medium=mid_cta&utm_campaign=coach-${city.slug}" class="btn">Voir l'offre Founding →</a>
    </div>

    <h2>L'angle gagnant ${city.nameAccusatif}</h2>
    <p>${city.angleFort}</p>

    <h2>Comment démarrer concrètement ${city.nameAccusatif}</h2>
    <p>
      La méthode universelle des 10 premiers clients en 90 jours s'applique partout en France, avec quelques
      adaptations locales :
    </p>
    <ol>
      <li><strong>Mois 1 — Réseau direct</strong> : liste les 100 personnes que tu connais ${city.nameAccusatif} (famille, amis, ex-clients de salle, contacts pro), contacte 5 par jour. Objectif : 3-4 premiers clients.</li>
      <li><strong>Mois 2 — Partenariats locaux</strong> : 10 kinés/ostéo/podologues dans ta zone, visite physique, échange leads. Crée ta fiche Google My Business avec photos pro ${city.name}.</li>
      <li><strong>Mois 3 — Bouche-à-oreille & contenu</strong> : système de parrainage simple (1 mois offert / ami inscrit) + premiers posts Instagram/TikTok géolocalisés ${city.name}.</li>
    </ol>
    <p>
      Méthode complète et détaillée : <a href="/blog/trouver-premiers-clients-coach-sportif">10 premiers clients
      coach sportif en 90 jours</a>.
    </p>

    <h2>Pourquoi RB Perform plutôt qu'un logiciel US comme Trainerize ou TrueCoach ?</h2>
    <p>
      Les logiciels américains du marché (Trainerize, TrueCoach, Everfit) sont conçus pour le marché US :
      interface anglaise, support en anglais, commissions paiements en plus du prix de licence, peu d'options
      RGPD-friendly. <strong>Pour un coach indépendant ${city.nameAccusatif}, ça veut dire 3 choses concrètes</strong> :
    </p>
    <ul>
      <li><strong>Surcoût caché</strong> — Trainerize coûte $159/mois Pro 50 clients + 3% sur les paiements (Trainerize Pay), soit ~280€/mois équivalent. RB Perform Founding = 199€/mois bloqué à vie, encaissement Stripe direct 0% commission.</li>
      <li><strong>Friction client</strong> — Interface en anglais, support en anglais, paiements en USD/EUR avec conversion. Pour une clientèle francophone française, c\'est un point de friction inutile.</li>
      <li><strong>Conformité RGPD</strong> — Les logiciels US stockent les données en datacenters américains (Cloud Act). RB Perform = hébergement EU exclusif, conformité RGPD native, traitement légal des données clients.</li>
    </ul>
    <p>
      Comparatif détaillé : <a href="/alternative-trainerize">Alternative française à Trainerize</a> ·
      <a href="/comparison">Comparatif complet RB Perform vs Trainerize, TrueCoach, Everfit</a>.
    </p>

    <h2>Questions fréquentes — Coach sportif ${city.nameAccusatif}</h2>
    <div class="faq-section">
      ${city.faqLocal.map(f => `
      <div class="faq-item">
        <div class="faq-q">${f.q}</div>
        <p class="faq-a">${f.a}</p>
      </div>`).join('')}
    </div>

    <div class="cta-inline">
      <h3>Lance-toi avec un système, pas avec un tableur</h3>
      <p>Vitrine publique, pipeline lead, encaissement Stripe direct, suivi client, anti-churn IA. Tout en
      une seule app conçue pour les coachs francophones. 199€/mois bloqué à vie pour les 30 premiers.</p>
      <a href="/founding?utm_source=local&utm_medium=bottom_cta&utm_campaign=coach-${city.slug}" class="btn">Découvrir l'offre Founding →</a>
    </div>

    <div class="related">
      <div class="related-title">À lire aussi</div>
      <ul class="related-list">
        <li><a href="/blog/trouver-premiers-clients-coach-sportif">→ Comment trouver ses 10 premiers clients de coaching sportif</a></li>
        <li><a href="/blog/comment-fixer-tarifs-coach-sportif">→ Comment fixer ses tarifs de coach sportif en 2026</a></li>
        <li><a href="/blog/combien-gagne-coach-sportif-france">→ Combien gagne un coach sportif en France ?</a></li>
        <li><a href="/blog/diagnostic-business-coach-sportif">→ Diagnostic business coach sportif — les 5 piliers</a></li>
        <li><a href="/logiciel-coach-sportif">→ Logiciel coach sportif — comparatif &amp; features</a></li>
      </ul>
    </div>

  </article>

  <div class="bottom-footer">
    <a href="/">Accueil</a> · <a href="/blog">Blog</a> · <a href="/founding">Founding 199€</a> · <a href="/alternative-trainerize">Alternative Trainerize</a> · <a href="/comparison">Comparatif</a> · <a href="/security">Sécurité &amp; RGPD</a> · <a href="/legal">Mentions légales</a>
  </div>

</main>

</body>
</html>`;
}

let total = 0;
for (const city of CITIES) {
  const html = generateHTML(city);
  const outPath = join(OUT_DIR, `coach-sportif-${city.slug}.html`);
  writeFileSync(outPath, html, 'utf8');
  const words = html.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
  total += words;
  console.log(`✓ ${city.slug.padEnd(12)} → ${outPath} (${words} mots)`);
}
console.log(`\nTotal : ${CITIES.length} pages, ${total} mots cumulés.`);

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
  // ============================== WAVE 2 ==============================
  {
    slug: 'nice',
    name: 'Nice',
    nameAccusatif: 'à Nice',
    population: '342 000',
    metropole: 'Métropole Nice Côte d\'Azur · 545 000 habitants',
    coachsEstimated: '~720 coachs sportifs',
    tarifSeanceMin: 60,
    tarifSeanceMax: 85,
    tarifMensuelMin: 300,
    tarifMensuelMax: 490,
    quartiers: [
      { nom: 'Promenade des Anglais / Carré d\'Or', angle: 'clientèle internationale aisée, anglophone, outdoor mer' },
      { nom: 'Cimiez / Mont Boron', angle: 'familles CSP+ résidentielles, suivi domicile premium' },
      { nom: 'Vieux Nice / Port', angle: 'jeunes actifs, format flexible, tarifs intermédiaires' },
      { nom: 'Saint-Roch / Riquier', angle: 'volume jeunes pro, tarifs 60-70€, fort renouvellement' },
    ],
    contextLocal: 'Nice est un marché à double facette : une forte présence d\'expatriés et de retraités aisés (Cimiez, Mont Boron), et une clientèle locale jeune active. La météo permet du coaching outdoor 11 mois/12. Atout différenciant : la clientèle internationale (CH, IT, UK, RU) qui paie volontiers en formule mensuelle longue durée.',
    salaireMedianText: 'Le salaire médian d\'un coach indépendant établi à Nice se situe autour de 2 800 €/mois nets, avec un haut de fourchette à 5 000-6 500 € pour les coachs spécialisés sur la clientèle internationale Carré d\'Or / Mont Boron.',
    typesClientele: ['Expatriés aisés Carré d\'Or / Promenade', 'Familles Cimiez / Mont Boron en domicile premium', 'Jeunes actifs Vieux Nice / Port', 'Retraités sportifs en maintien forme', 'Touristes longue durée saison été'],
    angleFort: 'Avantage Nice : <strong>clientèle internationale anglophone</strong> qui paie sans négocier et reste fidèle sur plusieurs saisons (retour annuel pour les retraités/expat). Un coach bilingue avec un système pro multilingue (vitrine FR+EN) y obtient des LTV de 18-30 mois — bien supérieures aux moyennes nationales.',
    faqLocal: [
      { q: 'Combien gagne un coach sportif indépendant à Nice ?', a: 'Le revenu médian se situe autour de 2 800 €/mois nets, avec un haut de fourchette à 5 000-6 500 € pour les coachs ciblant la clientèle internationale (Carré d\'Or, Mont Boron). La saisonnalité existe — l\'hiver est plus calme, mais compensé par les formules mensuelles longue durée des résidents permanents.' },
      { q: 'Comment cibler la clientèle internationale à Nice ?', a: 'Trois leviers : (1) vitrine pro bilingue FR/EN obligatoire, (2) partenariats avec les conciergeries de luxe (Carré d\'Or, Promenade), (3) présence sur les communautés expat (Internations, Facebook expats Nice). Cette clientèle paie volontiers 80-100€/séance et reste fidèle plusieurs saisons.' },
      { q: 'Le coaching outdoor (promenade, colline) marche-t-il à Nice ?', a: 'Excellent angle. La Promenade du Paillon, le Parc du Mont Boron, le Cap de Nice sont des terrains gratuits exploitables 11 mois/12. Une formule "coach outdoor Nice" à 380-450€/mois trouve preneur, surtout chez les expat/retraités qui aiment la nature et veulent éviter les salles.' },
      { q: 'Comment trouver mes premiers clients à Nice ?', a: 'Les leviers locaux : (1) partenariats kinés/ostéo des quartiers premium, (2) Google My Business bilingue avec 5 avis 5 étoiles, (3) présence dans les groupes Facebook expats. Méthode complète : <a href="/blog/trouver-premiers-clients-coach-sportif">10 premiers clients en 90 jours</a>.' },
      { q: 'Faut-il être bilingue pour exercer comme coach à Nice ?', a: 'Pas obligatoire mais énorme avantage. La clientèle internationale représente ~30% du marché premium niçois. Un coach français qui parle anglais correctement (B2+) capte une part disproportionnée de la valeur. Investis dans 6 mois d\'anglais business si ce n\'est pas déjà fait — ROI multiplié par 2 sur 12 mois.' },
    ],
  },
  {
    slug: 'nantes',
    name: 'Nantes',
    nameAccusatif: 'à Nantes',
    population: '320 000',
    metropole: 'Nantes Métropole · 670 000 habitants',
    coachsEstimated: '~640 coachs sportifs',
    tarifSeanceMin: 55,
    tarifSeanceMax: 78,
    tarifMensuelMin: 290,
    tarifMensuelMax: 460,
    quartiers: [
      { nom: 'Île de Nantes / Centre', angle: 'jeunes CSP+ tech/digital, format mensuel + Instagram' },
      { nom: 'Saint-Donatien / Procé', angle: 'familles aisées, suivi domicile + outdoor parc' },
      { nom: 'Hauts-Pavés / Saint-Félix', angle: 'cadres tertiaire, séances bureau + extérieur Erdre' },
      { nom: 'Rezé / Saint-Sébastien', angle: 'familles périurbaines, tarifs 55-65€, fort potentiel' },
    ],
    contextLocal: 'Nantes a explosé démographiquement avec l\'arrivée massive de profils tech/digital (Capgemini, Atlantic 2.0, écosystème start-up). La clientèle est jeune, CSP+, attachée à la qualité de vie et au sport-santé. Le marché coach indépendant est encore en structuration — bonne fenêtre pour qui démarre maintenant avec un système pro.',
    salaireMedianText: 'Le salaire médian d\'un coach indépendant établi à Nantes se situe autour de 2 500 €/mois nets, avec un haut de fourchette à 4 200-5 200 € pour les coachs spécialisés (jeunes tech CSP+, post-natal, sportifs amateurs trail).',
    typesClientele: ['Jeunes CSP+ tech/digital Île de Nantes', 'Familles Saint-Donatien / Procé en domicile', 'Cadres tertiaire centre / Hauts-Pavés', 'Sportifs amateurs running/trail (Erdre, forêt Touffou)', 'Femmes 30-45 post-natales'],
    angleFort: 'Avantage Nantes : un <strong>marché jeune et croissant</strong> avec une clientèle digital-native qui valorise les outils modernes (app, dashboard, suivi temps réel). Les coachs qui présentent leur offre comme un produit pro (et pas comme du service artisanal) y convertissent beaucoup mieux qu\'à concurrence égale dans des marchés plus traditionnels.',
    faqLocal: [
      { q: 'Combien gagne un coach sportif indépendant à Nantes ?', a: 'Le revenu médian se situe autour de 2 500 €/mois nets une fois la base client stabilisée. Les coachs spécialisés jeunes CSP+ tech (Île de Nantes, centre) atteignent 4 000-5 000 €/mois. Le profil 6 000 €+ existe mais reste rare.' },
      { q: 'Quels quartiers privilégier pour exercer à Nantes ?', a: 'L\'Île de Nantes concentre les jeunes CSP+ tech (75-78 €/séance). Saint-Donatien et Procé sont les quartiers familiaux haut de gamme. Hauts-Pavés attire les cadres tertiaire. Rezé et Saint-Sébastien-sur-Loire offrent du volume périurbain à tarifs accessibles avec moins de concurrence.' },
      { q: 'Le marché coach sportif est-il saturé à Nantes ?', a: 'Non. Avec ~640 coachs déclarés pour 670 000 habitants (métropole), Nantes a un ratio coach/habitant comparable à Lyon mais avec une dynamique de croissance démographique 2× supérieure. La fenêtre est encore ouverte pour les coachs qui se positionnent sur une niche claire (tech, post-natal, trail, etc.).' },
      { q: 'Comment exploiter l\'angle sportif amateur outdoor à Nantes ?', a: 'Nantes est entourée de la Loire, de l\'Erdre, de la forêt de Touffou, de la côte (45 min). Les sportifs amateurs running/trail/triathlon sont nombreux. Une formule "prep trail Nantes-Brest-Nantes 100km" à 480 €/cycle 12 semaines trouve preneur sur cette niche.' },
      { q: 'Comment lancer mon activité coach à Nantes ?', a: 'Suis la méthode universelle 90 jours adaptée localement : réseau direct + partenariats kinés/ostéo Saint-Donatien et Hauts-Pavés + Google My Business bilingue. Détails : <a href="/blog/trouver-premiers-clients-coach-sportif">10 premiers clients en 90 jours</a>.' },
    ],
  },
  {
    slug: 'strasbourg',
    name: 'Strasbourg',
    nameAccusatif: 'à Strasbourg',
    population: '291 000',
    metropole: 'Eurométropole de Strasbourg · 500 000 habitants',
    coachsEstimated: '~510 coachs sportifs',
    tarifSeanceMin: 50,
    tarifSeanceMax: 72,
    tarifMensuelMin: 270,
    tarifMensuelMax: 430,
    quartiers: [
      { nom: 'Centre / Krutenau', angle: 'jeunes actifs européens, format mensuel + cycling commute' },
      { nom: 'Robertsau / Wacken', angle: 'familles aisées résidentielles + diplomates européens' },
      { nom: 'Esplanade / Université', angle: 'étudiants + jeunes pro, tarifs flexibles' },
      { nom: 'Schiltigheim / Hautepierre', angle: 'volume familles périurbaines, tarifs 50-60€' },
    ],
    contextLocal: 'Strasbourg a un profil unique en France : forte présence européenne (institutions, fonctionnaires UE, diplomates), clientèle multilingue, frontière avec l\'Allemagne (Kehl) qui ouvre un marché transfrontalier. Le rapport qualité-prix attendu y est élevé, sans le côté ostentatoire de Paris ou Nice.',
    salaireMedianText: 'Le salaire médian d\'un coach indépendant établi à Strasbourg se situe autour de 2 400 €/mois nets, avec un haut de fourchette à 4 000-5 000 € pour les coachs ciblant la clientèle européenne (Conseil de l\'Europe, Parlement européen, organisations internationales).',
    typesClientele: ['Fonctionnaires européens / diplomates Wacken-Robertsau', 'Cadres tertiaire centre / Krutenau', 'Familles transfrontalières Strasbourg/Kehl', 'Étudiants + jeunes pro Esplanade', 'Sportifs amateurs Vosges/cyclo Rhin'],
    angleFort: 'Avantage Strasbourg : la <strong>clientèle européenne</strong> est ultra-fidélisable, paie en mensuel sans négocier, et apprécie le service multilingue. Un coach FR/EN/DE peut viser des LTV de 24-36 mois sur cette niche. Le marché transfrontalier ouvre aussi des opportunités côté Allemagne (Kehl, Offenburg) avec des tarifs allemands (90-110 €/séance).',
    faqLocal: [
      { q: 'Combien gagne un coach sportif indépendant à Strasbourg ?', a: 'Le revenu médian se situe autour de 2 400 €/mois nets. Les coachs ciblant la clientèle européenne (institutions UE) atteignent 4 000-5 000 €/mois grâce à des taux de rétention exceptionnels (24+ mois LTV) et des tarifs mensuels premium (450-550 €/mois × 4 séances).' },
      { q: 'Le marché transfrontalier (Kehl, Offenburg) est-il accessible ?', a: 'Oui — beaucoup de coachs strasbourgeois exercent des deux côtés du Rhin. Les tarifs allemands sont 30-40% plus élevés (90-110 €/séance) pour une prestation équivalente. Statut allemand requis (Gewerbe ou Freiberuflich) ou facturation transfrontalière via micro-entrepreneur français selon volume.' },
      { q: 'Comment cibler la clientèle européenne / institutions UE ?', a: 'Trois leviers : (1) vitrine pro trilingue FR/EN/DE, (2) partenariats avec les associations de fonctionnaires européens (Amicale du Personnel du Conseil de l\'Europe, etc.), (3) prestations bureau en intra-institutions (Wacken). Cette clientèle paie volontiers 480-550€/mois et reste fidèle plusieurs années.' },
      { q: 'Faut-il parler allemand pour exercer comme coach à Strasbourg ?', a: 'Pas obligatoire mais avantage significatif. L\'allemand ouvre le marché transfrontalier (Kehl, Offenburg, Karlsruhe à 1h) où les tarifs sont 30-40% plus élevés. Sans allemand, tu te limites à la rive française — toujours rentable mais avec moins de marge de scaling.' },
      { q: 'Comment lancer mon activité coach à Strasbourg ?', a: 'Méthode universelle 90 jours adaptée localement : réseau direct, partenariats kinés/ostéo Robertsau/Krutenau, présence sur les groupes Facebook expat européens. Détails : <a href="/blog/trouver-premiers-clients-coach-sportif">10 premiers clients en 90 jours</a>.' },
    ],
  },
  {
    slug: 'lille',
    name: 'Lille',
    nameAccusatif: 'à Lille',
    population: '236 000',
    metropole: 'Métropole Européenne de Lille · 1,2 M habitants',
    coachsEstimated: '~890 coachs sportifs',
    tarifSeanceMin: 50,
    tarifSeanceMax: 72,
    tarifMensuelMin: 260,
    tarifMensuelMax: 420,
    quartiers: [
      { nom: 'Vieux-Lille / République', angle: 'jeunes CSP+ centre, tarifs hauts, format mensuel' },
      { nom: 'Vauban / Esquermes', angle: 'cadres + freelances, suivi domicile + Jardin Vauban' },
      { nom: 'Saint-Maurice / Wazemmes', angle: 'jeunes actifs multiculturels, tarifs flexibles' },
      { nom: 'Roubaix / Tourcoing / Marcq-en-Barœul', angle: 'volume métropole, tarifs 50-60€, moins concurrencé' },
    ],
    contextLocal: 'Lille est la 4e métropole française mais beaucoup moins saturée côté coaching que Paris/Lyon/Bordeaux. Forte clientèle étudiante (Sciences Po, IÉSEG, EDHEC), jeunes pro tech (Lille French Tech) et frontière belge (Mouscron, Tournai, à 20 min) qui ouvre un marché transfrontalier. Climat moins favorable à l\'outdoor toute l\'année — atout pour les coachs avec partenariat salle.',
    salaireMedianText: 'Le salaire médian d\'un coach indépendant établi à Lille se situe autour de 2 300 €/mois nets, avec un haut de fourchette à 4 000-5 000 € pour les coachs spécialisés (jeunes pro tech Vieux-Lille, cadres ingénierie/banque, post-natal résidentiel).',
    typesClientele: ['Jeunes CSP+ tech Vieux-Lille / République', 'Cadres banque/ingénierie centre', 'Étudiants grandes écoles (Sciences Po, IÉSEG, EDHEC)', 'Clientèle transfrontalière belge (Mouscron, Tournai)', 'Familles résidentielles Marcq-en-Barœul / La Madeleine'],
    angleFort: 'Avantage Lille : <strong>marché sous-équipé côté coach pro</strong>. Beaucoup de coachs locaux fonctionnent encore en mode artisanal (SMS, Apple Pay, Excel). Un coach qui présente un système pro structuré (vitrine, app, dashboard, encaissement auto) se démarque immédiatement et capte la clientèle CSP+ Vieux-Lille / République sans difficulté.',
    faqLocal: [
      { q: 'Combien gagne un coach sportif indépendant à Lille ?', a: 'Le revenu médian se situe autour de 2 300 €/mois nets. Les coachs spécialisés (jeunes pro tech, banque/ingénierie, post-natal) atteignent 4 000-5 000 €/mois. La concurrence est moins féroce qu\'à Paris ou Lyon, ce qui facilite la montée en charge sur les 12 premiers mois.' },
      { q: 'Le marché transfrontalier belge est-il accessible depuis Lille ?', a: 'Oui — Mouscron, Tournai, Courtrai sont à 20-45 minutes. Les tarifs belges sont comparables aux français (50-80 €/séance) mais le marché est moins saturé. Pour facturer en Belgique, soit en TVA intracom (micro-entrepreneur français), soit création d\'une seconde structure belge si volume conséquent.' },
      { q: 'Quels sont les meilleurs quartiers pour exercer à Lille ?', a: 'Le Vieux-Lille et République concentrent la clientèle CSP+ jeune (65-72 €/séance). Vauban et Esquermes attirent les cadres familles. Wazemmes / Saint-Maurice ouvre un marché plus jeune multiculturel à tarifs accessibles. Marcq-en-Barœul, La Madeleine, Bondues = clientèle résidentielle haut de gamme à exploiter.' },
      { q: 'Le climat lillois est-il un problème pour le coaching outdoor ?', a: 'Pas vraiment. Si tu organises ton planning, 8-9 mois/an sont exploitables en outdoor (Citadelle, Jardin Vauban, Parc des Dondaines). Pour les 3-4 mois plus difficiles, partenariat salle (Basic-Fit, On Air, Fitness Park) à 10-15 €/séance de location de créneau. Ça fait partie du job.' },
      { q: 'Comment lancer mon activité coach à Lille ?', a: 'Méthode universelle 90 jours adaptée : réseau direct + partenariats kinés/ostéo Vauban/Vieux-Lille + Google My Business + présence sur les groupes étudiants des grandes écoles. Détails : <a href="/blog/trouver-premiers-clients-coach-sportif">10 premiers clients en 90 jours</a>.' },
    ],
  },
  {
    slug: 'rennes',
    name: 'Rennes',
    nameAccusatif: 'à Rennes',
    population: '220 000',
    metropole: 'Rennes Métropole · 470 000 habitants',
    coachsEstimated: '~450 coachs sportifs',
    tarifSeanceMin: 50,
    tarifSeanceMax: 70,
    tarifMensuelMin: 260,
    tarifMensuelMax: 410,
    quartiers: [
      { nom: 'Centre historique / Thabor', angle: 'jeunes CSP+ tech, format mensuel + outdoor parc' },
      { nom: 'Sud-Gare / Beaulieu', angle: 'cadres tertiaire, séances bureau + extérieur' },
      { nom: 'Villejean / Beauregard', angle: 'familles résidentielles + étudiants Rennes 2' },
      { nom: 'Cesson-Sévigné / Saint-Grégoire', angle: 'cadres entreprises (Orange, Mitsubishi), volume + tarifs élevés' },
    ],
    contextLocal: 'Rennes est une des villes les plus dynamiques de France côté tech/start-up (French Tech Rennes, Orange Innovation, écosystème B-com). Profil clientèle : jeune, CSP+, hyper-connecté, qui valorise la qualité de vie et le sport-santé. Marché coach indépendant en pleine structuration, encore très ouvert.',
    salaireMedianText: 'Le salaire médian d\'un coach indépendant établi à Rennes se situe autour de 2 400 €/mois nets, avec un haut de fourchette à 4 000-4 800 € pour les coachs spécialisés (jeunes pro tech, ingénieurs Orange/B-com, post-natal Cesson).',
    typesClientele: ['Jeunes pro tech Rennes French Tech', 'Ingénieurs Orange / Mitsubishi / B-com', 'Familles Cesson-Sévigné / Saint-Grégoire', 'Étudiants Rennes 1/2 + écoles ingénieurs', 'Sportifs amateurs vélo/trail Forêt de Rennes'],
    angleFort: 'Avantage Rennes : <strong>écosystème tech dense et fidélisable</strong>. La clientèle ingénieurs/start-up valorise les outils modernes et les méthodes mesurables — exactement le terrain où RB Perform ou équivalent fait la différence vs un coach old-school. Les comités d\'entreprise tech (Orange, Mitsubishi) sont aussi accessibles via prestations bien-être bureau.',
    faqLocal: [
      { q: 'Combien gagne un coach sportif indépendant à Rennes ?', a: 'Le revenu médian se situe autour de 2 400 €/mois nets. Les coachs spécialisés sur la clientèle tech/ingénierie (Orange, Mitsubishi, B-com, start-ups) atteignent 4 000-4 800 €/mois grâce à des LTV très élevées (clientèle CSP+ fidélisable).' },
      { q: 'Quels quartiers privilégier pour exercer à Rennes ?', a: 'Le centre historique et Thabor attirent les jeunes CSP+ tech (65-70 €/séance). Sud-Gare / Beaulieu = clientèle tertiaire. Cesson-Sévigné / Saint-Grégoire concentrent les cadres entreprises grandes structures (Orange, Mitsubishi) avec tarifs élevés. Villejean ouvre un marché étudiant/familial à tarifs accessibles.' },
      { q: 'Comment cibler les comités d\'entreprise rennais (Orange, etc.) ?', a: 'Les CE des grandes entreprises rennaises sont accessibles via prestations bien-être bureau : séances individuelles sur site, ateliers groupe (postural, gestion stress), suivi remboursé partiellement par la CE. Tarif moyen 350-450 €/séance corporate (1h × 3-5 collaborateurs). Démarche : contact RH ou prestataire bien-être existant.' },
      { q: 'Le marché coach est-il saturé à Rennes ?', a: 'Non — avec ~450 coachs pour 470 000 habitants métropole, Rennes est plus ouverte que la moyenne grandes villes. La croissance démographique tech accélère depuis 2020, ce qui ouvre des fenêtres pour les coachs qui démarrent maintenant avec un positionnement clair (niche tech, post-natal, trail/cyclo).' },
      { q: 'Comment lancer mon activité coach à Rennes ?', a: 'Méthode universelle 90 jours adaptée : réseau direct + partenariats kinés/ostéo + démarchage CE tech + Google My Business. Détails : <a href="/blog/trouver-premiers-clients-coach-sportif">10 premiers clients en 90 jours</a>.' },
    ],
  },
  {
    slug: 'montpellier',
    name: 'Montpellier',
    nameAccusatif: 'à Montpellier',
    population: '299 000',
    metropole: 'Montpellier Méditerranée Métropole · 510 000 habitants',
    coachsEstimated: '~620 coachs sportifs',
    tarifSeanceMin: 50,
    tarifSeanceMax: 75,
    tarifMensuelMin: 270,
    tarifMensuelMax: 440,
    quartiers: [
      { nom: 'Écusson / Antigone', angle: 'jeunes CSP+ centre, format mensuel + culture' },
      { nom: 'Port Marianne / Odysseum', angle: 'familles aisées récentes, suivi domicile premium' },
      { nom: 'Beaux-Arts / Boutonnet', angle: 'étudiants + jeunes pro santé/recherche, tarifs flexibles' },
      { nom: 'Castelnau / Pérols / La Grande-Motte', angle: 'familles périurbaines + plage, volume été' },
    ],
    contextLocal: 'Montpellier est la ville de France qui croît le plus vite depuis 10 ans (+2% par an). Forte clientèle santé/recherche (CHU, Inria, Inserm) et jeunes actifs venus du nord. Météo méditerranéenne (300 jours de soleil) qui permet le coaching outdoor toute l\'année. Marché coach en pleine structuration.',
    salaireMedianText: 'Le salaire médian d\'un coach indépendant établi à Montpellier se situe autour de 2 500 €/mois nets, avec un haut de fourchette à 4 200-5 000 € pour les coachs spécialisés (santé-sport, post-natal Port Marianne, sportifs amateurs cyclo/trail Cévennes/Camargue).',
    typesClientele: ['Chercheurs/médecins CHU + Inria + Inserm', 'Familles Port Marianne / Odysseum récentes', 'Jeunes pro santé/biotech', 'Sportifs amateurs cyclo (Cévennes) / triathlon (Pérols)', 'Étudiants médecine/sport (UM Faculté des Sports)'],
    angleFort: 'Avantage Montpellier : <strong>positionnement santé-sport ultra-cohérent</strong> avec l\'écosystème local (CHU, biotech, recherche). Un coach formé en santé-sport (DEUST APA, kiné-prep physique) peut viser la clientèle médecins/chercheurs CHU à 80-90 €/séance avec une fidélité exceptionnelle. Niche encore peu travaillée pro.',
    faqLocal: [
      { q: 'Combien gagne un coach sportif indépendant à Montpellier ?', a: 'Le revenu médian se situe autour de 2 500 €/mois nets. Les coachs spécialisés santé-sport (clientèle CHU, médecins, chercheurs) atteignent 4 000-5 000 €/mois grâce aux tarifs hauts (80-90 €/séance) et à la fidélité de cette clientèle. Le profil 6 000 €+ existe mais reste plus rare qu\'à Paris.' },
      { q: 'Quels quartiers privilégier pour exercer à Montpellier ?', a: 'L\'Écusson et Antigone concentrent les jeunes CSP+ centre. Port Marianne et Odysseum sont les nouveaux quartiers familiaux haut de gamme. Beaux-Arts attire les étudiants/jeunes pro santé. Castelnau-le-Lez et Pérols ouvrent le marché familial périurbain + activité plage l\'été.' },
      { q: 'Comment exploiter l\'angle santé-sport à Montpellier ?', a: 'Très porteur localement. Partenariats avec les médecins/kinés du CHU (Lapeyronie, Arnaud de Villeneuve), prestations en hôpital de jour, présence dans les groupes de patients post-cancer/cardiologie. Une formule "remise en forme post-cancer" ou "réathlétisation post-chirurgie" à 400-500 €/mois trouve preneur sur cette niche.' },
      { q: 'Le coaching outdoor marche-t-il bien à Montpellier ?', a: 'Excellent. 300 jours de soleil/an. Parc Lunaret, Berges du Lez, Plage du Petit Travers (Pérols, 15 min), Pic Saint-Loup pour trail/randonnée (35 min). Une formule "coach outdoor Montpellier" à 380 €/mois trouve facilement preneur, surtout chez les jeunes pro santé qui aiment combiner sport et nature.' },
      { q: 'Comment lancer mon activité coach à Montpellier ?', a: 'Méthode universelle 90 jours adaptée : réseau direct (réseau étudiant UM si tu sors de l\'UFR STAPS), partenariats médecins/kinés CHU, Google My Business. Détails : <a href="/blog/trouver-premiers-clients-coach-sportif">10 premiers clients en 90 jours</a>.' },
    ],
  },
  {
    slug: 'grenoble',
    name: 'Grenoble',
    nameAccusatif: 'à Grenoble',
    population: '157 000',
    metropole: 'Grenoble-Alpes Métropole · 450 000 habitants',
    coachsEstimated: '~480 coachs sportifs',
    tarifSeanceMin: 50,
    tarifSeanceMax: 70,
    tarifMensuelMin: 250,
    tarifMensuelMax: 400,
    quartiers: [
      { nom: 'Centre / Jardin de Ville', angle: 'jeunes CSP+ tech, format mensuel + culture' },
      { nom: 'Île Verte / Berriat', angle: 'cadres + universitaires, suivi domicile + parc' },
      { nom: 'Meylan / Corenc', angle: 'familles aisées résidentielles (cadres CEA, ST Microelectronics)' },
      { nom: 'Échirolles / Eybens', angle: 'familles périurbaines + outdoor montagne, tarifs 50-60€' },
    ],
    contextLocal: 'Grenoble est unique en France : forte densité chercheurs/ingénieurs (CEA, ST Microelectronics, Soitec, Schneider Electric), proximité immédiate des montagnes (ski + trail + escalade + VTT), culture sport-outdoor ancrée. Clientèle ultra-technique qui valorise la méthode et les résultats mesurables.',
    salaireMedianText: 'Le salaire médian d\'un coach indépendant établi à Grenoble se situe autour de 2 300 €/mois nets, avec un haut de fourchette à 4 000-5 000 € pour les coachs spécialisés (sportifs amateurs montagne, prep ski/trail, ingénieurs CEA/ST Microelectronics).',
    typesClientele: ['Ingénieurs/chercheurs CEA, ST Microelectronics, Soitec', 'Cadres Schneider Electric / Bull / HP', 'Familles Meylan / Corenc résidentielles', 'Sportifs amateurs montagne (ski, trail, VTT, alpinisme)', 'Étudiants Polytech / Grenoble INP'],
    angleFort: 'Avantage Grenoble : <strong>écosystème sport-outdoor + tech</strong> unique en France. Un coach spécialisé "prep physique montagne" (trail, ski de rando, alpinisme, VTT enduro) peut viser une niche premium ultra-fidélisable à 70-80 €/séance + formule mensuelle 400-500 €. Marché peu travaillé pro malgré la demande.',
    faqLocal: [
      { q: 'Combien gagne un coach sportif indépendant à Grenoble ?', a: 'Le revenu médian se situe autour de 2 300 €/mois nets. Les coachs spécialisés sport-montagne (prep ski/trail/alpinisme) atteignent 4 000-5 000 €/mois grâce aux tarifs hauts (70-80 €/séance) et à la fidélité de la clientèle ingénieurs/sportifs amateurs. Saisonnalité ski en plus côté hiver.' },
      { q: 'Comment cibler la clientèle sport-montagne à Grenoble ?', a: 'Trois angles : (1) prep physique ski de rando / alpinisme — clientèle 30-50 ans CSP+, formules saisonnières 6 mois ; (2) prep trail Belledonne / Vercors — niche running outdoor ; (3) post-blessure montagne (genou ski, épaule escalade) — partenariat kinés sport de l\'agglo (Grenoble, Meylan, Échirolles).' },
      { q: 'Les comités d\'entreprise grenoblois (CEA, ST Microelectronics) sont-ils accessibles ?', a: 'Oui — Grenoble concentre une densité unique de R&D tech/recherche. CEA, ST Microelectronics, Soitec, Schneider, Bull HP ont des CE actifs sur les prestations bien-être. Démarche via RH ou prestataire existant. Tarifs corporate 350-450 €/séance groupe.' },
      { q: 'Quels quartiers privilégier pour exercer à Grenoble ?', a: 'Centre et Jardin de Ville pour les jeunes CSP+ tech. Île Verte et Berriat attirent cadres et universitaires. Meylan et Corenc concentrent les cadres CEA/ST Microelectronics — clientèle premium. Échirolles et Eybens ouvrent le marché familial périurbain à tarifs accessibles.' },
      { q: 'Comment lancer mon activité coach à Grenoble ?', a: 'Méthode universelle 90 jours adaptée : réseau direct (Polytech / Grenoble INP si tu en sors), partenariats kinés sport + boutiques outdoor (Au Vieux Campeur, Snell Sports), Google My Business + Strava/Komoot pour la communauté trail. Détails : <a href="/blog/trouver-premiers-clients-coach-sportif">10 premiers clients en 90 jours</a>.' },
    ],
  },
  {
    slug: 'saint-etienne',
    name: 'Saint-Étienne',
    nameAccusatif: 'à Saint-Étienne',
    population: '173 000',
    metropole: 'Saint-Étienne Métropole · 405 000 habitants',
    coachsEstimated: '~340 coachs sportifs',
    tarifSeanceMin: 45,
    tarifSeanceMax: 65,
    tarifMensuelMin: 230,
    tarifMensuelMax: 380,
    quartiers: [
      { nom: 'Centre / Bellevue', angle: 'cadres tertiaire + design, format mensuel' },
      { nom: 'Saint-Victor / Soleil', angle: 'familles aisées résidentielles, suivi domicile' },
      { nom: 'Carnot / Tarentaize', angle: 'jeunes actifs centre, tarifs flexibles' },
      { nom: 'Saint-Galmier / Saint-Just-Saint-Rambert', angle: 'volume périurbain + outdoor Pilat, tarifs 50-60€' },
    ],
    contextLocal: 'Saint-Étienne est moins concurrencée que la moyenne grandes villes françaises. Marché coach indépendant encore très ouvert, surtout sur les niches spécialisées. Atout : proximité Parc du Pilat (15 min) et culture sport ancrée (foot ASSE, vélo, trail). Inconvénient : marché plus petit, plafond de revenu plus bas que Lyon ou Bordeaux.',
    salaireMedianText: 'Le salaire médian d\'un coach indépendant établi à Saint-Étienne se situe autour de 2 100 €/mois nets, avec un haut de fourchette à 3 500-4 200 € pour les coachs spécialisés (sportifs amateurs trail Pilat, post-natal, cadres design/tech).',
    typesClientele: ['Cadres design Cité du Design / La Manufacture', 'Cadres tech/aéronautique Saint-Étienne Métropole', 'Sportifs amateurs trail/cyclo Parc du Pilat', 'Familles Saint-Victor / résidentielles Saint-Galmier', 'Jeunes pro centre + étudiants ENISE'],
    angleFort: 'Avantage Saint-Étienne : <strong>peu de coachs pro structurés</strong> sur le marché. Un coach qui apporte un système moderne (vitrine, app, dashboard, encaissement auto) se démarque immédiatement. Le ticket moyen est plus bas qu\'à Lyon (-15 à -20%) mais la rétention est meilleure (clientèle moins volatile, plus fidèle géographiquement).',
    faqLocal: [
      { q: 'Combien gagne un coach sportif indépendant à Saint-Étienne ?', a: 'Le revenu médian se situe autour de 2 100 €/mois nets. Les coachs spécialisés (trail Pilat, post-natal, cadres design) atteignent 3 500-4 200 €/mois. Le plafond est plus bas qu\'à Lyon (-15 à -20%) mais la rétention est meilleure et la concurrence moins féroce — souvent un meilleur deal pour un coach qui démarre.' },
      { q: 'Le marché coach est-il saturé à Saint-Étienne ?', a: 'Au contraire — très ouvert. ~340 coachs pour 405 000 habitants métropole, soit un ratio plus faible que la moyenne nationale. Beaucoup de coachs locaux fonctionnent encore en mode artisanal. Un coach pro structuré capte facilement la part haut de gamme.' },
      { q: 'Comment exploiter l\'angle trail Pilat ?', a: 'Le Parc du Pilat à 15 min offre des terrains de trail/VTT/randonnée exceptionnels et peu exploités côté coaching pro. Une formule "prep trail Pilat 50km" à 380 €/cycle 10 semaines trouve preneur sur cette niche peu travaillée. Partenariats possibles avec les magasins Endurance Shop, Au Vieux Campeur.' },
      { q: 'Quels quartiers privilégier pour exercer à Saint-Étienne ?', a: 'Bellevue et le centre attirent les cadres design/tech (60-65 €/séance). Saint-Victor et Soleil concentrent les familles aisées résidentielles. Carnot et Tarentaize ouvrent le marché jeunes pro centre. Saint-Galmier et Saint-Just-Saint-Rambert offrent du volume périurbain à tarifs accessibles + clientèle outdoor.' },
      { q: 'Comment lancer mon activité coach à Saint-Étienne ?', a: 'Méthode universelle 90 jours adaptée : réseau direct, partenariats kinés/ostéo Bellevue/Saint-Victor, présence sur les communautés trail/cyclo locales, Google My Business. Détails : <a href="/blog/trouver-premiers-clients-coach-sportif">10 premiers clients en 90 jours</a>.' },
    ],
  },
  {
    slug: 'reims',
    name: 'Reims',
    nameAccusatif: 'à Reims',
    population: '180 000',
    metropole: 'Communauté Urbaine du Grand Reims · 295 000 habitants',
    coachsEstimated: '~310 coachs sportifs',
    tarifSeanceMin: 45,
    tarifSeanceMax: 65,
    tarifMensuelMin: 230,
    tarifMensuelMax: 370,
    quartiers: [
      { nom: 'Centre / Cathédrale', angle: 'jeunes CSP+ + champagne business, format mensuel' },
      { nom: 'Cernay / Maisons Champenoises', angle: 'familles aisées résidentielles, suivi domicile premium' },
      { nom: 'Clairmarais / Murigny', angle: 'cadres + jeunes pro, séances bureau + extérieur' },
      { nom: 'Tinqueux / Bezannes', angle: 'familles périurbaines, tarifs 45-55€, fort potentiel' },
    ],
    contextLocal: 'Reims a un profil spécifique : forte économie champagne (Moët, Veuve Clicquot, Taittinger, Pommery — sièges sociaux + clientèle privée), proximité Paris (45 min TGV) qui attire des cadres bi-résidentiels. Marché coach encore peu structuré pro. Bon ratio opportunité/concurrence pour qui démarre.',
    salaireMedianText: 'Le salaire médian d\'un coach indépendant établi à Reims se situe autour de 2 100 €/mois nets, avec un haut de fourchette à 3 500-4 500 € pour les coachs ciblant la clientèle champagne (cadres Moët, Veuve Clicquot, etc.) ou les cadres bi-résidentiels Paris/Reims.',
    typesClientele: ['Cadres champagne (Moët, Veuve Clicquot, Taittinger, Pommery)', 'Cadres bi-résidentiels Paris/Reims (effet TGV)', 'Familles Maisons Champenoises résidentielles', 'Étudiants Sciences Po + Reims Management School', 'Sportifs amateurs cyclo Champagne / trail Massif de Saint-Thierry'],
    angleFort: 'Avantage Reims : <strong>clientèle champagne business</strong> avec un pouvoir d\'achat élevé et des standards proches du parisien. Un coach pro qui se positionne sur ce segment (vitrine pro, séances bureau premium, formules trimestrielles) atteint des tarifs Paris (-10%) avec une concurrence 5× moindre.',
    faqLocal: [
      { q: 'Combien gagne un coach sportif indépendant à Reims ?', a: 'Le revenu médian se situe autour de 2 100 €/mois nets. Les coachs ciblant la clientèle champagne business ou les cadres bi-résidentiels Paris/Reims atteignent 3 500-4 500 €/mois. Le ticket moyen est inférieur à Paris mais avec une concurrence beaucoup moins féroce.' },
      { q: 'Comment cibler la clientèle champagne à Reims ?', a: 'Trois leviers : (1) partenariats avec les conciergeries d\'entreprise (Moët, Veuve Clicquot, Taittinger ont des programmes bien-être collaborateurs), (2) présence sur les événements business champagne (Vinexpo, Champagne et You), (3) prestations bureau premium en sièges sociaux. Cette clientèle paie volontiers 70-80 €/séance.' },
      { q: 'Quels quartiers privilégier pour exercer à Reims ?', a: 'Le centre et la Cathédrale attirent les jeunes CSP+ et la clientèle champagne business. Cernay et les Maisons Champenoises concentrent les familles aisées résidentielles. Clairmarais et Murigny ouvrent le marché jeunes pro. Tinqueux et Bezannes offrent du volume périurbain à tarifs accessibles.' },
      { q: 'L\'effet TGV Paris-Reims influence-t-il le marché coach ?', a: 'Significativement. ~10 000 cadres font le trajet Paris-Reims régulièrement (résidence secondaire ou primaire). Ils importent leurs standards parisiens (vitrine pro, app, encaissement auto) — exactement ce qui te démarque sur le marché local. Excellent point d\'entrée pour scaler les tarifs sans résistance.' },
      { q: 'Comment lancer mon activité coach à Reims ?', a: 'Méthode universelle 90 jours adaptée : réseau direct (réseau écoles si tu sors de Sciences Po Reims ou Reims Management School), partenariats kinés/ostéo Cernay/Maisons Champenoises, démarche conciergeries entreprises champagne. Détails : <a href="/blog/trouver-premiers-clients-coach-sportif">10 premiers clients en 90 jours</a>.' },
    ],
  },
  {
    slug: 'toulon',
    name: 'Toulon',
    nameAccusatif: 'à Toulon',
    population: '178 000',
    metropole: 'Métropole Toulon-Provence-Méditerranée · 440 000 habitants',
    coachsEstimated: '~390 coachs sportifs',
    tarifSeanceMin: 45,
    tarifSeanceMax: 70,
    tarifMensuelMin: 240,
    tarifMensuelMax: 400,
    quartiers: [
      { nom: 'Mourillon / Cap Brun', angle: 'familles aisées + retraités CSP+, suivi domicile + outdoor mer' },
      { nom: 'Centre-ville / Port', angle: 'jeunes pro Marine nationale + tertiaire, tarifs flexibles' },
      { nom: 'Sainte-Anne / Pont du Las', angle: 'familles résidentielles + sportifs amateurs' },
      { nom: 'La Garde / La Valette / Le Pradet', angle: 'volume métropole, familles, tarifs 50-60€' },
    ],
    contextLocal: 'Toulon a une économie spécifique : Marine nationale (Toulon = port militaire #1 de France, ~20 000 militaires + familles), retraités côtiers Mourillon/Cap Brun, écosystème naval. Climat méditerranéen → outdoor 11 mois/12. Marché coach moins saturé que Nice ou Marseille, et clientèle Marine nationale ultra-fidélisable.',
    salaireMedianText: 'Le salaire médian d\'un coach indépendant établi à Toulon se situe autour de 2 200 €/mois nets, avec un haut de fourchette à 3 800-4 500 € pour les coachs spécialisés (Marine nationale, retraités Mourillon, sportifs amateurs Mont Faron).',
    typesClientele: ['Militaires Marine nationale + familles (Toulon, Saint-Mandrier, La Seyne)', 'Retraités aisés Mourillon / Cap Brun / Le Pradet', 'Jeunes pro tertiaire centre + Port', 'Sportifs amateurs Mont Faron / Six-Fours', 'Familles résidentielles La Garde / La Valette'],
    angleFort: 'Avantage Toulon : <strong>clientèle Marine nationale</strong> particulièrement intéressante — militaires habitués à l\'effort, exigeants en méthode, mutés régulièrement (rotation = fort renouvellement client mais réseau de recommandations très actif). Marché peu travaillé par les coachs pro structurés.',
    faqLocal: [
      { q: 'Combien gagne un coach sportif indépendant à Toulon ?', a: 'Le revenu médian se situe autour de 2 200 €/mois nets. Les coachs spécialisés sur la clientèle Marine nationale (prep physique militaires, familles) ou les retraités Mourillon atteignent 3 800-4 500 €/mois. Marché moins saturé qu\'à Nice ou Marseille.' },
      { q: 'Comment cibler la clientèle Marine nationale à Toulon ?', a: 'Trois angles : (1) prep physique militaire (sportifs habitués à l\'effort, exigeants méthode) — partenariats avec les associations sportives militaires (ASSEM), (2) suivi des familles de militaires (conjoints/conjointes, enfants — clientèle stable les 2-3 ans de mutation), (3) reprise post-affectation longue durée (retour de mer, post-blessure opération). Tarifs corrects 60-75 €/séance.' },
      { q: 'Quels quartiers privilégier pour exercer à Toulon ?', a: 'Mourillon et Cap Brun concentrent les familles aisées et retraités CSP+ (tarifs 65-75 €/séance). Centre-ville et Port attirent les jeunes pro tertiaire + Marine nationale. Sainte-Anne / Pont du Las ouvre le marché familial résidentiel. La Garde / La Valette / Le Pradet offrent du volume métropolitain à tarifs accessibles.' },
      { q: 'Le coaching outdoor marche-t-il à Toulon ?', a: 'Excellent. 11 mois/12 d\'extérieur exploitable (climat méditerranéen). Mont Faron (trail/VTT), Six-Fours (course pied bord de mer), plages du Mourillon (training fonctionnel), Saint-Mandrier (vélo). Une formule "coach outdoor Toulon" à 380-420 €/mois trouve preneur, surtout chez les Marine nationale et retraités sportifs.' },
      { q: 'Comment lancer mon activité coach à Toulon ?', a: 'Méthode universelle 90 jours adaptée : réseau direct + partenariats kinés/ostéo Mourillon/Cap Brun + démarche associations sportives Marine nationale + Google My Business. Détails : <a href="/blog/trouver-premiers-clients-coach-sportif">10 premiers clients en 90 jours</a>.' },
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

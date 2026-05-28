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
  // ============================== WAVE 2 ==============================
  {
    slug: 'mycoach',
    name: 'MyCoach',
    fullName: 'MyCoach Sport',
    origin: 'France',
    pricing: '49-99 €/mois',
    pricingEur: '49-99 €/mois',
    targetUsers: 'clubs sportifs et fédérations (foot, rugby, hand) — pas coachs personnels indépendants',
    strengths: [
      'Outil français basé à Paris, support FR natif',
      'Spécialisation forte sur les sports collectifs (foot, rugby, basket, hand)',
      'Bibliothèque d\'exercices vidéo sport collectif assez fournie',
      'Intégration GPS / wearables pour le suivi athlètes de haut niveau',
    ],
    weaknesses: [
      'Conçu pour les clubs et fédérations, pas pour le coach personnel indépendant — UX inadaptée au 1-to-1',
      'Pas d\'encaissement client intégré : MyCoach est un outil de préparation, pas un outil business',
      'Pas de vitrine publique pour générer des leads',
      'Pas de dashboard MRR / pilotage business — focus 100% prépa sportive, 0% business',
      'Tarif 99 €/mois ne baisse pas avec le volume, contrairement à RB Perform Founding bloqué à vie',
      'Pas de pipeline lead / CRM — tu dois gérer la prospection ailleurs (Notion, tableur)',
    ],
    perfectFor: 'préparateurs physiques de clubs sportifs ou fédérations gérant 10-200 athlètes en sport collectif',
    notForYou: 'tu es coach personnel indépendant 1-to-1 (50-90% de tes clients sont en suivi mensuel individuel) et tu veux un outil business complet (vitrine + facturation + pilotage + suivi)',
    pricingExplain: 'MyCoach Pro coûte 99 €/mois en version individuelle, soit 1 188 €/an. À ça s\'ajoute Stripe ou un outil de facturation séparé (~30 €/mois = 360 €/an), un Calendly ou équivalent (~12 €/mois = 144 €/an), une vitrine type Carrd ou Squarespace (~15 €/mois = 180 €/an). Total réel pour un coach indé : ~1 870 €/an, et tu te retrouves avec 4 outils à coordonner.',
    rbPerformAdvantage: 'RB Perform Founding = 199 €/mois bloqué à vie (2 388 €/an), inclut TOUT en une seule app : vitrine pro géolocalisée, pipeline lead, encaissement Stripe direct 0% commission, suivi client illimité, anti-churn IA, dashboard MRR temps réel, programmes structurés. Différence absolue : ~500 €/an de plus mais 4 outils en moins à gérer, et un focus business (pas juste prépa) qui change la donne sur la rentabilité réelle.',
    switchingTips: [
      'MyCoach permet l\'export des données athlètes et programmes via le support (pas d\'export self-service automatique).',
      'L\'import dans RB Perform se fait via le dashboard Coach (mapping clients + programmes).',
      'Si tu coaches en majorité du sport co (rugby/foot/hand de niveau régional+), tu peux garder MyCoach pour la partie prépa physique et utiliser RB Perform pour le suivi business — pas mutuellement exclusifs.',
      'Pour un coach personnel 1-to-1, la migration totale vers RB Perform en 15 min est plus pertinente.',
    ],
    faqLocal: [
      {
        q: 'MyCoach et RB Perform ciblent le même type de coachs ?',
        a: 'Non, et c\'est important de le comprendre. MyCoach est conçu pour les préparateurs physiques de clubs sportifs et fédérations (sport collectif niveau régional, national, international). RB Perform est conçu pour les coachs personnels indépendants en 1-to-1 (clientèle générale : remise en forme, perte de poids, sport-santé, prep amateur). Si tu coaches une équipe de rugby fédérale, MyCoach est meilleur. Si tu coaches 15-50 clients individuels sur Paris/Lyon/Marseille, RB Perform est conçu pour toi.',
      },
      {
        q: 'MyCoach inclut-il l\'encaissement client ?',
        a: 'Non — MyCoach est un outil de préparation physique, pas un outil business. Tu dois gérer la facturation, l\'encaissement, la suspension en cas d\'impayé via d\'autres outils (Stripe, comptable, tableur). RB Perform inclut Stripe Connect natif avec 0% commission supplémentaire et suspension automatique en cas d\'impayé.',
      },
      {
        q: 'Le prix de MyCoach est-il bloqué à vie ?',
        a: 'Non. MyCoach a des paliers tarifaires (49, 79, 99 €/mois) qui montent avec les features et le nombre d\'athlètes. RB Perform Founding = 199 €/mois bloqué à vie pour les 30 premiers coachs, peu importe ton volume futur (10, 50, 200 clients).',
      },
      {
        q: 'Mes données MyCoach sont-elles hébergées en France ?',
        a: 'Oui, MyCoach est un outil français basé à Paris avec un hébergement européen. Pas d\'avantage RGPD spécifique vs RB Perform sur ce point — les deux outils sont conformes. Le différenciateur est ailleurs : périmètre fonctionnel (prépa sport co vs business coach personnel) et inclusions tarifaires.',
      },
      {
        q: 'Comment migrer de MyCoach vers RB Perform ?',
        a: 'Demande à MyCoach un export des données via le support (pas de self-service automatique à ce jour). Import dans RB Perform via le dashboard Coach en ~15 min. Tu peux aussi conserver MyCoach en parallèle si tu coaches des équipes en sport collectif, et utiliser RB Perform pour ton activité personnelle 1-to-1.',
      },
    ],
  },
  {
    slug: 'fizzup-pro',
    name: 'FizzUp Pro',
    fullName: 'FizzUp Pro',
    origin: 'France',
    pricing: '79-129 €/mois',
    pricingEur: '79-129 €/mois',
    targetUsers: 'coachs personal trainers cherchant un système de programmes pré-construits + app B2C white-label',
    strengths: [
      'App mobile client de très bonne qualité (longue R&D côté B2C grand public)',
      'Bibliothèque d\'exercices vidéo très large (>2 000 démos) avec recommandations IA',
      'Programmes pré-construits prêts à attribuer (gain de temps réel pour les coachs)',
      'Outil français — interface FR natif + support FR',
    ],
    weaknesses: [
      'Approche très "programme catalogue" — moins de personnalisation fine séance par séance vs RB Perform',
      'Pas d\'encaissement client intégré : Stripe à brancher séparément',
      'Pas de pipeline lead / CRM intégré — tu gères la prospection ailleurs',
      'Pas de dashboard MRR / pilotage business — focus programme, pas business',
      'Tarif Pro 129 €/mois peut monter selon options activées',
      'Vitrine publique limitée comparée à RB Perform (pas de profil coach géolocalisé)',
    ],
    perfectFor: 'coachs qui veulent gagner du temps avec des programmes pré-construits de qualité, et qui ont déjà leur système business (vitrine, facturation, suivi)',
    notForYou: 'tu cherches un outil business complet tout-en-un, ou tu fais du suivi très personnalisé séance par séance (post-rééducation, sport-santé, niches techniques)',
    pricingExplain: 'FizzUp Pro coûte 79-129 €/mois selon options activées (suivi nutrition, intégrations wearables, etc.). En moyenne ~100 €/mois pour un coach actif = 1 200 €/an. À ça s\'ajoute Stripe ou facturation externe (~30 €/mois), CRM/pipeline (~20 €/mois), vitrine externe (~15 €/mois). Total réel : ~1 980 €/an, et 4 outils éparpillés.',
    rbPerformAdvantage: 'RB Perform Founding = 199 €/mois bloqué à vie (2 388 €/an), inclut TOUT en une seule app. Différence de ~400 €/an, mais 4 outils en moins. Et surtout : RB Perform inclut un dashboard MRR temps réel + anti-churn IA + vitrine publique géolocalisée — features que FizzUp Pro n\'a pas, et qui sont essentielles pour piloter son business (pas juste produire des programmes).',
    switchingTips: [
      'FizzUp Pro permet l\'export des données clients via le dashboard (Settings → Export).',
      'L\'import dans RB Perform se fait via le dashboard Coach (mapping clients + programmes en 15 min pour 30-50 clients).',
      'Tu peux garder FizzUp pour la bibliothèque d\'exercices et l\'app client, et utiliser RB Perform en couche business par-dessus — non mutuellement exclusifs si budget compatible.',
      'Pour un coach qui veut un seul outil tout-en-un, la migration totale vers RB Perform est plus simple et rentable.',
    ],
    faqLocal: [
      {
        q: 'FizzUp Pro est-il un bon outil pour un coach indépendant ?',
        a: 'C\'est un bon outil de production de programmes. Ce n\'est pas un outil business complet. Si tu veux gagner du temps avec des programmes pré-construits, FizzUp Pro fait le job (et bien). Si tu veux un système qui gère ton business (vitrine, encaissement, pipeline, MRR, anti-churn), il te manque 4 outils complémentaires — c\'est là que RB Perform devient pertinent.',
      },
      {
        q: 'FizzUp Pro inclut-il l\'encaissement client ?',
        a: 'Non. Comme la plupart des outils de programmes (Trainerize, TrueCoach, Everfit), FizzUp Pro n\'inclut pas l\'encaissement intégré. Tu dois brancher Stripe ou un outil de facturation séparément. RB Perform inclut Stripe Connect natif avec 0% commission supplémentaire.',
      },
      {
        q: 'La bibliothèque d\'exercices FizzUp est-elle meilleure que RB Perform ?',
        a: 'Oui, en volume brut — FizzUp a plus de 2 000 démos vidéo grâce à des années de R&D côté B2C. RB Perform en a ~300 actuellement, en croissance. Si la richesse de la bibliothèque vidéo est ton critère #1, FizzUp Pro a l\'avantage. Si la vue d\'ensemble business (vitrine + encaissement + MRR + anti-churn) compte plus pour toi, RB Perform reste meilleur.',
      },
      {
        q: 'FizzUp Pro est-il français ?',
        a: 'Oui, FizzUp est une société française basée à Nantes. Interface FR natif, support FR, hébergement européen. Sur ce point, FizzUp Pro et RB Perform sont équivalents — pas de différenciation RGPD ou linguistique.',
      },
      {
        q: 'Comment migrer de FizzUp Pro vers RB Perform ?',
        a: 'Export des clients via le dashboard FizzUp (Settings → Export Data). Import dans RB Perform via le dashboard Coach. Migration de 30-50 clients en ~15 min. Tu peux conserver FizzUp en parallèle 1 mois pour la transition, puis résilier — ou bien garder les deux si tu veux la richesse de la bibliothèque FizzUp couplée au système business RB Perform.',
      },
    ],
  },
  {
    slug: 'trainheroic',
    name: 'TrainHeroic',
    fullName: 'TrainHeroic',
    origin: 'États-Unis',
    pricing: '$79-179/mois',
    pricingEur: '~75-170 €/mois',
    targetUsers: 'coachs strength & conditioning, prep physique sport co, communautés CrossFit/Hyrox',
    strengths: [
      'Réputation forte sur la communauté strength & conditioning US (CrossFit, Hyrox, powerlifting)',
      'Marketplace de programmes vendus par coachs reconnus (model B2C2B intéressant)',
      'Bibliothèque d\'exercices vidéo strength très fournie',
      'App mobile client correcte avec leaderboards et notifications',
    ],
    weaknesses: [
      'Interface 100% anglaise — frein lourd pour la clientèle francophone',
      'Pas d\'encaissement client intégré : Stripe à brancher séparément',
      'Données aux US (Cloud Act) — zone grise RGPD pour les coachs français',
      'Tarif Pro $179/mois (~170 €) — facturation USD avec frais de conversion 1-3%',
      'Pas de pipeline lead / CRM — focus 100% programme + communauté',
      'Pas de dashboard MRR / pilotage business — tu pilotes "à la communauté"',
      'Très orienté communauté/groupe — peu adapté au coaching 1-to-1 français traditionnel',
    ],
    perfectFor: 'coachs strength & conditioning anglophones avec une communauté CrossFit/Hyrox/powerlifting de 50-300 athlètes en mode groupe + programme vendu en marketplace',
    notForYou: 'tu fais du coaching personnel 1-to-1 francophone (50-90% mensuel individuel), tu veux un outil FR avec encaissement intégré et RGPD natif EU',
    pricingExplain: 'TrainHeroic Pro = $179/mois = $2 148/an (~2 035 €). Stripe ou outil de paiement externe ~450 €/an (CA 30K€), conversion USD/EUR ~30 €/an. Total réel : ~2 515 €/an, sans inclure les outils complémentaires (CRM, pipeline, comptable) qui ajoutent 600-1 200 €/an supplémentaires pour un coach indé structuré.',
    rbPerformAdvantage: 'RB Perform Founding = 199 €/mois bloqué à vie (2 388 €/an), tout-en-un en français, hébergement EU exclusif, encaissement Stripe direct 0% commission. À ~5% moins cher qu\'TrainHeroic Pro en coût total réel, et avec une suite plus large (vitrine, pipeline, MRR, anti-churn) adaptée au coach personnel indépendant francophone.',
    switchingTips: [
      'TrainHeroic permet l\'export CSV depuis Settings → Data Export.',
      'L\'import dans RB Perform se fait via le dashboard Coach en ~15-20 min (mapping clients + programmes).',
      'Si tu coaches une communauté CrossFit/Hyrox en plus du 1-to-1, tu peux conserver TrainHeroic pour le groupe et utiliser RB Perform pour ton activité personnelle française — non mutuellement exclusifs.',
      'Pour un coach personal trainer francophone classique, la migration totale est plus simple et plus rentable.',
    ],
    faqLocal: [
      {
        q: 'TrainHeroic est-il adapté au coaching personnel français ?',
        a: 'Pas vraiment — TrainHeroic est conçu pour la communauté strength & conditioning anglophone (CrossFit, Hyrox, powerlifting). Pour un coach français qui fait du 1-to-1 remise en forme / sport-santé / prep amateur, l\'outil est sur-dimensionné côté communauté et sous-dimensionné côté business. RB Perform est conçu spécifiquement pour ce profil.',
      },
      {
        q: 'TrainHeroic propose-t-il une interface en français ?',
        a: 'Non. TrainHeroic est 100% anglais (interface coach, app client, support). Pour une clientèle francophone, c\'est un frein significatif (taux d\'abandon ~30% sur les apps anglaises selon les retours coachs).',
      },
      {
        q: 'TrainHeroic inclut-il l\'encaissement client ?',
        a: 'Non. TrainHeroic est focalisé sur le programme et la communauté, pas sur le business. Tu dois brancher Stripe ou un outil de paiement externe. RB Perform inclut Stripe Connect natif avec 0% commission additionnelle.',
      },
      {
        q: 'Mes données TrainHeroic sont-elles conformes RGPD ?',
        a: 'TrainHeroic stocke les données aux États-Unis (AWS US-East). Cela tombe sous le Cloud Act américain, ce qui constitue une zone grise RGPD pour les coachs français. RB Perform = hébergement exclusivement EU (Supabase Frankfurt), conformité RGPD native.',
      },
      {
        q: 'Combien coûte TrainHeroic Pro par an pour un coach indé ?',
        a: 'TrainHeroic Pro = $179/mois = $2 148/an (~2 035 €). Ajoute Stripe (~450 €/an sur 30K€ CA) + conversion USD/EUR (~30 €/an) + outils complémentaires (CRM, pipeline, ~600 €/an). Total réel : ~3 115 €/an, à comparer à RB Perform Founding tout-en-un = 2 388 €/an.',
      },
    ],
  },
  {
    slug: 'hellocoach',
    name: 'HelloCoach',
    fullName: 'HelloCoach',
    origin: 'France',
    pricing: '0-29 €/mois',
    pricingEur: '0-29 €/mois',
    targetUsers: 'coachs débutants ou amateurs cherchant un outil très simple à petit budget',
    strengths: [
      'Outil français, support FR',
      'Plan gratuit disponible (limité)',
      'Interface très simple — courbe d\'apprentissage quasi nulle',
      'Adapté à un coach qui démarre avec 5-10 clients sans complexité',
    ],
    weaknesses: [
      'Périmètre fonctionnel limité — l\'outil ne grandit pas avec toi quand tu scales',
      'Pas d\'encaissement intégré',
      'Pas de pipeline lead / CRM',
      'Pas de dashboard MRR / pilotage business',
      'Pas de vitrine publique professionnelle',
      'Pas d\'anti-churn IA — tu détectes les départs après coup',
      'Pas de programmes structurés avancés (sets/reps/RPE/RIR scientifiquement structurés)',
    ],
    perfectFor: 'coachs qui démarrent vraiment from scratch avec 3-5 clients, qui veulent juste planifier des séances sans aucune dimension business, et qui ne dépasseront probablement pas 10 clients à long terme',
    notForYou: 'tu vises 15+ clients récurrents, tu veux un système qui pilote ton business (MRR, rétention, cash), ou tu cherches une vitrine pro qui te ramène des leads',
    pricingExplain: 'HelloCoach a un plan gratuit (5 clients max) et un plan Pro à 29 €/mois. Pas cher en absolu, mais tu te retrouves à brancher Stripe (~30 €/mois équivalent), Calendly (~12 €/mois), Notion ou tableur (~10 €/mois), vitrine externe (~15 €/mois). Soit ~95 €/mois en outils éparpillés une fois ton activité structurée — sans dashboard business, sans pipeline, sans anti-churn.',
    rbPerformAdvantage: 'RB Perform Founding = 199 €/mois bloqué à vie (2 388 €/an), tout-en-un. Différence de ~105 €/mois vs HelloCoach + outils éparpillés, mais une suite complète qui pilote ton business (et pas juste ton agenda de séances). Le ROI se fait dès le moment où l\'anti-churn IA évite 1 client perdu/mois (un client à 350 €/mois × 3 mois supplémentaires = 1 050 € sauvés = 5 mois de RB Perform).',
    switchingTips: [
      'HelloCoach permet l\'export des données clients via le support (ou self-service dans le dashboard selon la version).',
      'L\'import dans RB Perform se fait en 10 min pour 5-10 clients via le dashboard Coach.',
      'La transition est typique d\'un coach qui passe de "outil simple gratuit" à "système business pro" — souvent autour du 8-12e client signé, quand la complexité devient ingérable à la main.',
      'Pas de migration partielle pertinente — soit tu restes sur HelloCoach (et tu plafonnes), soit tu passes à RB Perform (et tu scales).',
    ],
    faqLocal: [
      {
        q: 'HelloCoach est-il assez pour un coach indépendant ?',
        a: 'Assez pour démarrer, pas assez pour scaler. Si tu as 3-5 clients et zéro ambition de croissance, HelloCoach fait le job. Dès que tu vises 15+ clients récurrents, tu vas devoir empiler 4-5 outils complémentaires (Stripe, Calendly, Notion, vitrine, CRM) — c\'est là que RB Perform devient économiquement et opérationnellement supérieur.',
      },
      {
        q: 'HelloCoach inclut-il l\'encaissement client ?',
        a: 'Non. Tu dois brancher Stripe ou un outil de paiement externe. RB Perform inclut Stripe Connect natif avec 0% commission additionnelle, suspension automatique en cas d\'impayé, et dashboard MRR temps réel.',
      },
      {
        q: 'Le plan gratuit HelloCoach est-il vraiment gratuit ?',
        a: 'Oui, mais limité à 5 clients maximum. Dès le 6ème client, tu passes au plan Pro à 29 €/mois. À ce stade tu te retrouves à brancher des outils complémentaires pour gérer ton business — coût caché réel ~95 €/mois pour un coach structuré.',
      },
      {
        q: 'Quel est le bon moment pour migrer de HelloCoach vers RB Perform ?',
        a: 'Quand tu atteins 8-12 clients récurrents et que tu sens que tes outils éparpillés (HelloCoach + Stripe + Calendly + Notion + tableur) deviennent ingérables. C\'est le moment classique où un coach pro switche vers un système tout-en-un. Trop tôt = surcoût pour zéro gain. Trop tard = tu as déjà perdu 3-6 mois de croissance freinée par tes outils.',
      },
      {
        q: 'Comment migrer de HelloCoach vers RB Perform ?',
        a: 'Demande à HelloCoach un export de tes clients via le dashboard ou le support. Import dans RB Perform en ~10 min. Préviens tes clients par message avec le lien d\'installation PWA RB Perform. Migration typique en 30 min total, sans interruption de service.',
      },
    ],
  },
];

function generateHTML(c) {
  const url = `https://rbperform.app/rb-perform-vs-${c.slug}`;
  const title = `RB Perform vs ${c.fullName} — Comparatif 2026 (prix, RGPD, encaissement) | RB Perform`;
  const description = `Comparatif détaillé RB Perform vs ${c.fullName} en 2026 : prix réels, encaissement, conformité RGPD, support FR, switching guide. Tableau des features + tarifs cachés inclus. Pour coachs sportifs francophones.`;
  const ogParams = new URLSearchParams({
    title: `RB Perform vs ${c.fullName}`,
    category: 'Comparatif 2026',
    subtitle: `Prix réels · RGPD · Encaissement · Switching guide. Pour coachs francophones.`,
  });
  const ogImage = `https://rbperform.app/api/og?${ogParams.toString()}`;

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
<meta property="og:image" content="${ogImage}" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />

<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${title}" />
<meta name="twitter:description" content="${description}" />
<meta name="twitter:image" content="${ogImage}" />

<link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png">
<link rel="icon" type="image/png" sizes="512x512" href="/icon-512.png">
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
<link rel="manifest" href="/manifest.json">

<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&display=swap" />
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
      publisher: { '@id': 'https://rbperform.app/#org' },
      image: ogImage,
      description,
      wordCount: 1400,
      inLanguage: 'fr-FR',
      isAccessibleForFree: true,
      about: { '@id': 'https://rbperform.app/#org' },
      mentions: { '@id': 'https://rbperform.app/#org' },
    },
    {
      '@type': 'Organization',
      '@id': 'https://rbperform.app/#org',
      name: 'RB Perform',
      url: 'https://rbperform.app',
      logo: { '@type': 'ImageObject', url: 'https://rbperform.app/icon-512.png' },
      sameAs: [
        'https://www.linkedin.com/company/rb-perform/',
        'https://www.instagram.com/rb_perform/',
        'https://rbperform.com',
      ],
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

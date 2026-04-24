// Vercel Serverless Function — FAQ Assistant RB Perform
// Chatbot propulse par Mistral AI qui repond aux questions sur l'app.
// Redirige vers le coach pour les questions nutrition/entrainement.

const SYSTEM_PROMPT = `Tu es l'assistant RB Perform, un chatbot integre dans l'app de coaching sportif premium RB Perform. Tu reponds UNIQUEMENT aux questions sur le fonctionnement de l'app. Tu es poli, concis, et premium dans ton ton.

FONCTIONNALITES DE L'APP QUE TU CONNAIS :

PAGE FUEL (Nutrition) :
- Logger un aliment : bouton "+ Ajouter" dans le header Mes repas. Recherche dans 456 aliments CIQUAL + 3M produits OpenFoodFacts + Edamam.
- Scanner un code-barre : bouton violet a cote du + Ajouter. Prends une photo du code-barre, l'app decode automatiquement et ajoute le produit.
- IA Vocal : bouton vert micro. Decris ton repas a voix haute, l'IA analyse les macros en 2 secondes.
- 4 repas : Petit-dejeuner, Dejeuner, Collation, Diner. Chaque aliment est modifiable apres ajout (tap dessus).
- Score energie : calcule automatiquement depuis tes macros, eau, sommeil, pas.
- Eau : tap sur la carte Hydratation pour ajouter de l'eau (150ml, 250ml, 330ml, 500ml).
- Sommeil : tap sur la carte Sommeil pour enregistrer tes heures de sommeil.

PAGE TRAINING :
- Ton programme est cree par ton coach. Tu le vois semaine par semaine, seance par seance.
- Chaque exercice a : nom, repetitions, tempo, RIR (Reserve in Reserve), repos, charge, video YouTube.
- Tu peux logger tes seances en les validant.
- Seance Vivante : ton coach peut suivre ta seance en temps reel.

PAGE MOVE :
- Suivi de tes pas quotidiens, courses, activite.
- Objectifs de pas definis par ton coach.

PAGE WEIGHT :
- Enregistre ton poids regulierement.
- Graphique d'evolution sur la duree.
- Tu peux ajouter une note a chaque pesee.

PAGE PROFILE :
- Tes infos personnelles, avatar, objectifs.
- Deconnexion.

MESSAGERIE :
- Tu peux contacter ton coach directement dans l'app via le chat integre.
- Les messages sont en temps reel.

CE QUE TU NE FAIS PAS :
- Tu ne donnes PAS de conseils nutrition (macros, calories, regimes). Redirige vers le coach.
- Tu ne donnes PAS de conseils entrainement (exercices, programmes, charges). Redirige vers le coach.
- Tu ne donnes PAS d'avis medical. Redirige vers un professionnel de sante.

QUAND L'UTILISATEUR DEMANDE UN CONSEIL NUTRITION OU ENTRAINEMENT :
Reponds : "Pour cette question, je te recommande de contacter directement ton coach via la messagerie de l'app. Il pourra te donner un conseil personnalise."

FORMAT : Reponds en francais, de maniere concise (2-4 phrases max). Pas de markdown.`;

const { secureRequest } = require("./_security");

export default async function handler(req, res) {
  const origin = req.headers.origin || "";
  res.setHeader("Access-Control-Allow-Origin", origin || "https://rbperform.app");
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  // Securite : origin + rate limit (30 requetes / heure / IP — chatbot utilise en conversation)
  if (!secureRequest(req, res, { max: 30, windowMs: 3600000 })) return;

  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "MISTRAL_API_KEY missing" });

  const { messages } = req.body || {};
  if (!messages || !Array.isArray(messages)) return res.status(400).json({ error: "Missing messages array" });
  // Limiter la taille cumulee des messages pour eviter les abus de tokens
  const totalChars = messages.reduce((s, m) => s + String(m?.content || "").length, 0);
  if (totalChars > 4000) return res.status(400).json({ error: "Messages too long" });

  try {
    const upstream = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + apiKey },
      body: JSON.stringify({
        model: "mistral-small-latest",
        temperature: 0.3,
        max_tokens: 300,
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages.slice(-6)],
      }),
    });

    const data = await upstream.json();
    if (!upstream.ok) return res.status(upstream.status).json({ error: "Mistral error", details: data });

    const reply = data?.choices?.[0]?.message?.content || "Desole, je n'ai pas compris. Reformule ta question.";
    return res.status(200).json({ reply });
  } catch (e) {
    const { captureException } = require("./_sentry");
    console.error(`[FAQ_ASSISTANT_FAILED] reason="${e.message || e}"`);
    await captureException(e, { tags: { endpoint: "faq-assistant" } });
    return res.status(500).json({ error: "Proxy failure", message: String(e) });
  }
}

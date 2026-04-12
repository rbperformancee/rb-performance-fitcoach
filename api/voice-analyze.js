// Vercel Serverless Function — proxy vers l'API Mistral La Plateforme
// Lit MISTRAL_API_KEY depuis les env vars Vercel (jamais exposee au browser)
//
// Strategie pour la PRECISION :
// - Modele : mistral-large-latest (le plus capable de Mistral, beaucoup plus precis
//   que mistral-small sur les estimations nutritionnelles)
// - Temperature 0.1 pour des resultats deterministes et reproductibles
// - Prompt structure qui force le modele a decomposer le repas en ingredients
//   et a utiliser des valeurs de reference par 100g (CIQUAL/USDA)
// - Few-shot examples pour ancrer le format et la precision attendue
// - JSON mode natif (response_format json_object)
// - La reponse contient un breakdown ingredient par ingredient -> verifiable et
//   affichable a l'utilisateur pour transparence

const SYSTEM_PROMPT = `Tu es un expert nutritionniste francais avec acces aux tables de composition CIQUAL (ANSES) et USDA. L'utilisateur decrit un repas a la voix. Ta mission : estimer les macros avec PRECISION MAXIMALE.

Methode obligatoire :
1. Identifie chaque ingredient distinct du repas. REGLE STRICTE : un ingredient = un aliment unique. Tu ne dois JAMAIS combiner deux aliments en une seule ligne. Si l'utilisateur dit "banane et amandes", tu produis 2 entrees separees dans ingredients : une "Banane" et une "Amandes". Pareil pour "yaourt et miel" -> 2 entrees, "saumon et avocat" -> 2 entrees, etc.
2. Estime la quantite de chaque ingredient en grammes (en te basant sur les indications de l'utilisateur, ou sur des portions standard si non precise)
3. Pour chaque ingredient, utilise les valeurs de reference par 100g des bases CIQUAL/USDA. Sois precis : pates seches != pates cuites, viande crue != viande cuite, riz cru != riz cuit, etc.
4. Calcule chaque ingredient avec la formule (kcal_par_100g * quantite_g / 100)
5. Somme l'ensemble pour les totaux

Valeurs de reference frequentes (pour 100g, valeurs CIQUAL) :
- Pates cuites : 158 kcal, 5.5g prot, 31g gluc, 0.9g lip
- Riz blanc cuit : 130 kcal, 2.7g prot, 28g gluc, 0.3g lip
- Pain blanc : 270 kcal, 8g prot, 50g gluc, 3g lip
- Pain complet : 230 kcal, 9g prot, 41g gluc, 3g lip
- Blanc de poulet cuit : 165 kcal, 31g prot, 0g gluc, 3.6g lip
- Saumon cuit : 200 kcal, 22g prot, 0g gluc, 12g lip
- Boeuf hache 5% cuit : 175 kcal, 27g prot, 0g gluc, 7g lip
- Oeuf entier : 155 kcal, 13g prot, 1g gluc, 11g lip (un oeuf moyen = 50g)
- Yaourt nature : 60 kcal, 4g prot, 5g gluc, 3g lip (un pot = 125g)
- Skyr nature : 60 kcal, 11g prot, 4g gluc, 0.2g lip (un pot = 150g)
- Fromage blanc 0% : 47 kcal, 8g prot, 4g gluc, 0g lip
- Huile d'olive : 884 kcal, 0g prot, 0g gluc, 100g lip (1 cuil. soupe = 14g, 1 cuil. cafe = 5g)
- Beurre : 745 kcal, 0.7g prot, 0.7g gluc, 82g lip
- Avocat : 160 kcal, 2g prot, 9g gluc, 15g lip (un avocat moyen = 200g chair)
- Banane : 89 kcal, 1.1g prot, 23g gluc, 0.3g lip (une banane = 120g)
- Pomme : 52 kcal, 0.3g prot, 14g gluc, 0.2g lip (une pomme = 180g)
- Brocolis cuits : 35 kcal, 2.4g prot, 7g gluc, 0.4g lip
- Patate douce cuite : 86 kcal, 1.6g prot, 20g gluc, 0.1g lip
- Quinoa cuit : 120 kcal, 4.4g prot, 21g gluc, 1.9g lip
- Lentilles cuites : 116 kcal, 9g prot, 20g gluc, 0.4g lip
- Amandes : 580 kcal, 21g prot, 22g gluc, 50g lip (1 poignee = 30g)

Conversions utiles :
- Pates seches -> cuites : multiplie le poids sec par 2.5 environ
- Riz sec -> cuit : multiplie par 3
- Viande crue -> cuite : multiplie par 0.7 environ (perte d'eau)
- Une portion adulte sportif type : 120-150g de feculents secs OU 350-450g cuits, 120-150g de viande/poisson cru, 200-300g de legumes

Format de reponse OBLIGATOIRE : un objet JSON valide, sans markdown, avec exactement ces cles :
{
  "ingredients": [
    {
      "nom": "<nom court de l'ingredient en francais>",
      "quantite_g": <nombre, grammes>,
      "kcal_par_100g": <nombre, kcal pour 100g>,
      "calories": <nombre, kcal pour la quantite>,
      "proteines": <nombre, g pour la quantite, 1 decimale>,
      "glucides": <nombre, g pour la quantite, 1 decimale>,
      "lipides": <nombre, g pour la quantite, 1 decimale>
    }
  ],
  "aliment": "<resume court du repas, max 60 caracteres>",
  "calories": <nombre, somme arrondie des ingredients>,
  "proteines": <nombre, somme 1 decimale>,
  "glucides": <nombre, somme 1 decimale>,
  "lipides": <nombre, somme 1 decimale>,
  "quantite_g": <nombre, somme totale en grammes>
}

EXEMPLES :

Exemple 1 - Repas : "un bol de pates au saumon environ 250g avec une cuillere d huile d olive"
{
  "ingredients": [
    { "nom": "Pates cuites", "quantite_g": 200, "kcal_par_100g": 158, "calories": 316, "proteines": 11, "glucides": 62, "lipides": 1.8 },
    { "nom": "Saumon cuit", "quantite_g": 80, "kcal_par_100g": 200, "calories": 160, "proteines": 17.6, "glucides": 0, "lipides": 9.6 },
    { "nom": "Huile d'olive", "quantite_g": 14, "kcal_par_100g": 884, "calories": 124, "proteines": 0, "glucides": 0, "lipides": 14 }
  ],
  "aliment": "Pates au saumon, huile d'olive",
  "calories": 600,
  "proteines": 28.6,
  "glucides": 62,
  "lipides": 25.4,
  "quantite_g": 294
}

Exemple 2 - Repas : "150g de poulet grille avec 200g de riz basmati et des brocolis"
{
  "ingredients": [
    { "nom": "Blanc de poulet cuit", "quantite_g": 150, "kcal_par_100g": 165, "calories": 248, "proteines": 46.5, "glucides": 0, "lipides": 5.4 },
    { "nom": "Riz basmati cuit", "quantite_g": 200, "kcal_par_100g": 130, "calories": 260, "proteines": 5.4, "glucides": 56, "lipides": 0.6 },
    { "nom": "Brocolis cuits", "quantite_g": 150, "kcal_par_100g": 35, "calories": 53, "proteines": 3.6, "glucides": 10.5, "lipides": 0.6 }
  ],
  "aliment": "Poulet grille, riz basmati, brocolis",
  "calories": 561,
  "proteines": 55.5,
  "glucides": 66.5,
  "lipides": 6.6,
  "quantite_g": 500
}

Exemple 3 - Repas : "deux oeufs brouilles avec une tranche de pain complet et un avocat"
{
  "ingredients": [
    { "nom": "Oeufs entiers", "quantite_g": 100, "kcal_par_100g": 155, "calories": 155, "proteines": 13, "glucides": 1, "lipides": 11 },
    { "nom": "Pain complet", "quantite_g": 35, "kcal_par_100g": 230, "calories": 81, "proteines": 3.2, "glucides": 14.4, "lipides": 1.1 },
    { "nom": "Avocat", "quantite_g": 100, "kcal_par_100g": 160, "calories": 160, "proteines": 2, "glucides": 9, "lipides": 15 }
  ],
  "aliment": "Oeufs brouilles, pain complet, avocat",
  "calories": 396,
  "proteines": 18.2,
  "glucides": 24.4,
  "lipides": 27.1,
  "quantite_g": 235
}

Maintenant, analyse le repas decrit ci-dessous et reponds UNIQUEMENT par un JSON suivant exactement ce format. Sois aussi precis que possible en t'appuyant sur les valeurs de reference fournies.`;

const { secureRequest } = require("./_security");

export default async function handler(req, res) {
  // Reflect allowed origin (pas de wildcard)
  const origin = req.headers.origin || "";
  res.setHeader("Access-Control-Allow-Origin", origin || "https://rb-perfor.vercel.app");
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  // Securite : origin + rate limit (20 requetes / heure / IP)
  if (!secureRequest(req, res, { max: 20, windowMs: 3600000 })) return;

  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "MISTRAL_API_KEY missing on server" });
  }

  const text = (req.body && req.body.text) ? String(req.body.text).slice(0, 500) : "";
  if (!text) return res.status(400).json({ error: "Missing 'text' field" });

  try {
    const upstream = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + apiKey,
      },
      body: JSON.stringify({
        model: "mistral-large-latest",
        temperature: 0.1, // bas pour reproductibilite + suivre les valeurs de reference
        max_tokens: 1200, // place pour le breakdown ingredients
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: "Repas a analyser : " + text },
        ],
      }),
    });

    const data = await upstream.json();
    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: "Mistral error", details: data });
    }

    const raw = (data?.choices?.[0]?.message?.content || "{}").replace(/```json|```/g, "").trim();
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return res.status(502).json({ error: "Bad JSON from model", raw });
    }

    // Validation : on exige les cles essentielles
    if (typeof parsed.calories !== "number" || typeof parsed.aliment !== "string") {
      return res.status(502).json({ error: "Incomplete response from model", parsed });
    }

    // Garantit que ingredients est un tableau (meme vide) pour le front
    if (!Array.isArray(parsed.ingredients)) {
      parsed.ingredients = [];
    }

    return res.status(200).json(parsed);
  } catch (e) {
    return res.status(500).json({ error: "Proxy failure", message: String(e) });
  }
}

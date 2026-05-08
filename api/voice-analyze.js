// Vercel Serverless Function — proxy vers l'API Mistral La Plateforme
// Lit MISTRAL_API_KEY depuis les env vars Vercel (jamais exposee au browser)

const nodemailer = require("nodemailer");

// Rate-limit alerte quota Mistral : max 1 email/30 min (évite spam si plusieurs
// clients hit la limite en même temps). En mémoire instance Vercel.
let lastQuotaAlertAt = 0;

function notifyMistralQuotaIssue(ctx) {
  const now = Date.now();
  if (now - lastQuotaAlertAt < 30 * 60 * 1000) return;
  lastQuotaAlertAt = now;

  const SMTP_USER = process.env.ZOHO_SMTP_USER || "rayan@rbperform.app";
  const SMTP_PASS = process.env.ZOHO_SMTP_PASS;
  const TO = process.env.MISTRAL_ALERT_EMAIL || "rb.performancee@gmail.com";
  if (!SMTP_PASS) {
    console.error("[voice-analyze] ALERT Mistral status=" + ctx.statusCode + " no SMTP to notify");
    return;
  }

  const transporter = nodemailer.createTransport({
    host: "smtp.zoho.eu", port: 465, secure: true,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });

  const isQuota = ctx.statusCode === 429;
  const subject = isQuota ? "⚠ Quota Mistral dépassé · client bloqué" : "⚠ Erreur Mistral 5xx · " + ctx.statusCode;
  const safePreview = String(ctx.textPreview || "").replace(/[<>&]/g, "").slice(0, 200);

  const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:32px 16px"><tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%">
<tr><td style="background:#111;border-radius:16px;border:1px solid rgba(239,68,68,0.3);padding:32px">
  <div style="font-size:10px;letter-spacing:3px;text-transform:uppercase;color:#ff6b6b;margin-bottom:12px;font-weight:700">${isQuota ? "⚠ Quota Mistral dépassé" : "⚠ Erreur Mistral"}</div>
  <div style="font-size:22px;font-weight:900;color:#fff;margin-bottom:14px">${isQuota ? "Tes clients ne peuvent plus logger en vocal" : "Mistral indisponible"}</div>
  <div style="font-size:14px;color:rgba(255,255,255,0.75);line-height:1.7;margin-bottom:18px">
    ${isQuota
      ? "Un client vient d'essayer l'analyse vocale d'un repas mais Mistral a renvoyé <strong>429 (quota)</strong>. Le client a un message gentil 'momentanément indispo' mais ne peut pas utiliser cette feature jusqu'à ton intervention."
      : "Mistral renvoie une erreur " + ctx.statusCode + " sur l'endpoint " + ctx.endpoint + ". Probablement temporaire (panne service)."}
  </div>
  ${isQuota ? `<div style="padding:14px 18px;background:rgba(2,209,186,0.05);border:1px solid rgba(2,209,186,0.2);border-radius:10px;margin-bottom:18px">
    <div style="font-size:11px;color:#02d1ba;font-weight:700;letter-spacing:.06em;text-transform:uppercase;margin-bottom:6px">À faire</div>
    <div style="font-size:13px;color:rgba(255,255,255,0.85);line-height:1.6">
      Va sur <a href="https://console.mistral.ai/billing" style="color:#02d1ba">console.mistral.ai/billing</a> →<br>
      • Soit attendre le reset du quota (début mois)<br>
      • Soit ajouter une carte (pay-as-you-go ~0,002€ par analyse vocale)
    </div>
  </div>` : ""}
  <div style="font-size:11px;color:rgba(255,255,255,0.45);line-height:1.6">
    <strong style="color:rgba(255,255,255,0.7)">Détails technique</strong><br>
    Endpoint : ${ctx.endpoint}<br>
    Status : ${ctx.statusCode}<br>
    Timestamp : ${new Date().toISOString()}<br>
    IP client : ${(ctx.ip || "—").slice(0, 40)}<br>
    Texte (200c) : ${safePreview}
  </div>
  <div style="margin-top:18px;padding-top:14px;border-top:1px solid rgba(255,255,255,0.06);font-size:10px;color:rgba(255,255,255,0.3)">
    Cette alerte est rate-limitée à 1/30min. D'autres clients peuvent avoir été affectés.
  </div>
</td></tr></table>
</td></tr></table></body></html>`;

  transporter.sendMail({
    from: `RB Perform Alerts <${SMTP_USER}>`,
    to: [TO],
    subject,
    html,
  }).catch((e) => console.error("[voice-analyze] alert send failed:", e.message));
}

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

Liquides courants (valeurs pour 100ml) :
- Eau : 0 kcal, 0g prot, 0g gluc, 0g lip (verre = 200ml, bouteille = 500ml ou 1.5L)
- Jus d'orange : 45 kcal, 0.7g prot, 10g gluc, 0g lip (verre = 200ml)
- Lait demi-ecreme : 47 kcal, 3.3g prot, 4.7g gluc, 1.6g lip (verre = 200ml, bol = 250ml)
- Cafe noir : 1 kcal, 0g prot, 0g gluc, 0g lip (espresso = 30ml, tasse = 200ml)
- The : 0 kcal, 0g prot, 0g gluc, 0g lip
- Coca-Cola : 42 kcal, 0g prot, 10.6g gluc, 0g lip (cannette = 330ml)
- Biere blonde 5% : 43 kcal, 0.5g prot, 3.5g gluc, 0g lip (demi = 250ml, pinte = 500ml)
- Vin rouge : 85 kcal, 0.1g prot, 0.4g gluc, 0g lip (verre = 125ml)
- Smoothie fruits : 50 kcal, 0.6g prot, 12g gluc, 0.2g lip
- Boisson proteine whey + eau : depend du dosage (1 dose 30g whey = 110 kcal, 24g prot)

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
      "quantite_g": <nombre, valeur numerique de la quantite>,
      "unit": "<g pour solide OU ml pour liquide/boisson>",
      "kcal_par_100g": <nombre, kcal pour 100g/100ml>,
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
  "quantite_g": <nombre, somme totale (grammes pour solides, ml pour liquides)>
}

REGLE IMPORTANTE pour le champ "unit" :
- "g" pour TOUT solide ou semi-solide : pates, riz, viande, fruits, yaourt, fromage, oeuf, soupe (oui meme la soupe).
- "ml" pour TOUT ce qui est liquide bu : eau, jus, lait nature dans un verre, cafe, the, soda, biere, vin, smoothie, shake proteine.
- En cas de doute, "g" par defaut.

EXEMPLES :

Exemple 1 - Repas : "un bol de pates au saumon environ 250g avec une cuillere d huile d olive"
{
  "ingredients": [
    { "nom": "Pates cuites", "quantite_g": 200, "unit": "g", "kcal_par_100g": 158, "calories": 316, "proteines": 11, "glucides": 62, "lipides": 1.8 },
    { "nom": "Saumon cuit", "quantite_g": 80, "unit": "g", "kcal_par_100g": 200, "calories": 160, "proteines": 17.6, "glucides": 0, "lipides": 9.6 },
    { "nom": "Huile d'olive", "quantite_g": 14, "unit": "g", "kcal_par_100g": 884, "calories": 124, "proteines": 0, "glucides": 0, "lipides": 14 }
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
    { "nom": "Blanc de poulet cuit", "quantite_g": 150, "unit": "g", "kcal_par_100g": 165, "calories": 248, "proteines": 46.5, "glucides": 0, "lipides": 5.4 },
    { "nom": "Riz basmati cuit", "quantite_g": 200, "unit": "g", "kcal_par_100g": 130, "calories": 260, "proteines": 5.4, "glucides": 56, "lipides": 0.6 },
    { "nom": "Brocolis cuits", "quantite_g": 150, "unit": "g", "kcal_par_100g": 35, "calories": 53, "proteines": 3.6, "glucides": 10.5, "lipides": 0.6 }
  ],
  "aliment": "Poulet grille, riz basmati, brocolis",
  "calories": 561,
  "proteines": 55.5,
  "glucides": 66.5,
  "lipides": 6.6,
  "quantite_g": 500
}

Exemple 3bis - Repas : "un grand verre de jus d'orange et un cafe noir"
{
  "ingredients": [
    { "nom": "Jus d'orange", "quantite_g": 250, "unit": "ml", "kcal_par_100g": 45, "calories": 113, "proteines": 1.8, "glucides": 25, "lipides": 0 },
    { "nom": "Cafe noir", "quantite_g": 200, "unit": "ml", "kcal_par_100g": 1, "calories": 2, "proteines": 0, "glucides": 0, "lipides": 0 }
  ],
  "aliment": "Jus d'orange + cafe",
  "calories": 115,
  "proteines": 1.8,
  "glucides": 25,
  "lipides": 0,
  "quantite_g": 450
}

Exemple 3 - Repas : "deux oeufs brouilles avec une tranche de pain complet et un avocat"
{
  "ingredients": [
    { "nom": "Oeufs entiers", "quantite_g": 100, "unit": "g", "kcal_par_100g": 155, "calories": 155, "proteines": 13, "glucides": 1, "lipides": 11 },
    { "nom": "Pain complet", "quantite_g": 35, "unit": "g", "kcal_par_100g": 230, "calories": 81, "proteines": 3.2, "glucides": 14.4, "lipides": 1.1 },
    { "nom": "Avocat", "quantite_g": 100, "unit": "g", "kcal_par_100g": 160, "calories": 160, "proteines": 2, "glucides": 9, "lipides": 15 }
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
const { getServiceClient } = require("./_supabase");

export default async function handler(req, res) {
  // Reflect allowed origin (pas de wildcard)
  const origin = req.headers.origin || "";
  res.setHeader("Access-Control-Allow-Origin", origin || "https://rbperform.app");
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  // Securite : origin + rate limit (60 requetes / heure / IP)
  if (!secureRequest(req, res, { max: 60, windowMs: 3600000 })) return;

  // ===== AUTH OBLIGATOIRE (audit ULTRA-SECURITY HIGH) =====
  // Sans cette vérif, n'importe qui pouvait piller le quota Mistral via
  // 1000 IPs distribuées → ~$2880/jour de facture sur le compte du fondateur.
  // Maintenant : token Bearer Supabase obligatoire.
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Missing auth token" });
  try {
    const { data: userData, error: userErr } = await getServiceClient().auth.getUser(token);
    if (userErr || !userData?.user) {
      return res.status(401).json({ error: "Invalid auth token" });
    }
  } catch (e) {
    return res.status(401).json({ error: "Auth check failed" });
  }

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
      // Alerte Rayan si quota Mistral dépassé (429) ou erreur grave (5xx)
      // pour qu'il puisse upgrader le plan avant que ça pénalise les clients.
      if (upstream.status === 429 || upstream.status >= 500) {
        notifyMistralQuotaIssue({
          statusCode: upstream.status,
          textPreview: text.slice(0, 200),
          ip: req.headers["x-forwarded-for"] || req.headers["x-real-ip"] || "",
          endpoint: "voice-analyze",
        });
      }
      // Réponse user-friendly côté client (pas de détail technique exposé).
      // Le client voit "indisponible momentanément" au lieu d'une erreur sèche.
      const userMsg = upstream.status === 429
        ? "Analyse vocale momentanément indisponible. Saisie manuelle dispo en attendant."
        : "Erreur d'analyse. Saisie manuelle dispo en attendant.";
      return res.status(upstream.status).json({ error: userMsg, retry: upstream.status === 429 });
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
    const { captureException } = require("./_sentry");
    console.error(`[VOICE_ANALYZE_FAILED] reason="${e.message || e}"`);
    await captureException(e, { tags: { endpoint: "voice-analyze" } });
    return res.status(500).json({ error: "Proxy failure", message: String(e) });
  }
}

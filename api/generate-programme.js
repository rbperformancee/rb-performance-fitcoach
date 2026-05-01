// POST /api/generate-programme
//
// Génère un squelette de programme de musculation via Mistral AI à partir d'un
// prompt utilisateur. Réponse strict JSON pour insertion directe dans le state
// React de ProgrammeBuilder.
//
// Garde-fous :
// - Rate limit 10/h/IP (anti-abus, coût)
// - Prompt max 2000 chars
// - Mistral en EU (Paris) → RGPD propre, pas de transfert hors UE
// - Pas de données médicales dans le prompt (filtré côté client)
// - Le coach valide TOUJOURS le résultat avant envoi au client (responsabilité)

const { secureRequest } = require("./_security");

const SYSTEM_PROMPT = `Tu es un assistant qui génère des programmes de musculation structurés pour des coachs sportifs en France.

Tu réponds UNIQUEMENT en JSON valide, sans markdown ni commentaires. Format strict obligatoire :

{
  "name": "string — nom du programme, ex: 'PPL Hypertrophie · Phase 1'",
  "clientName": "",
  "duration": "string — nombre de semaines, ex: '4'",
  "tagline": "string — 1 phrase courte de motivation",
  "objective": "string — un de : prise-de-masse | force | endurance | remise-en-forme | recuperation",
  "weeks": [
    {
      "name": "Semaine N",
      "sessions": [
        {
          "name": "string — Push | Pull | Legs | Full A | Upper | Lower | autre",
          "description": "string — 1-2 lignes sur le focus de la séance",
          "finisher": "string — optionnel, 1 ligne",
          "exercises": [
            {
              "name": "string — nom français standard, ex: 'Développé couché barre'",
              "reps": "string — format NXM-M, ex: '4X8-10' ou '5X5'",
              "tempo": "string — 4 chiffres, ex: '3010' ou 'X010' pour explosif",
              "rir": "string — '0' à '3' ou 'Échec'",
              "rest": "string — ex: '1'30', '2'', '3''",
              "group": ""
            }
          ]
        }
      ]
    }
  ]
}

Règles strictes :
1. Reps format : "NXM" ou "NXM-M" (ex: "4X8-10", "5X5", "3X12-15"). Toujours en majuscule X.
2. Tempo : exactement 4 caractères. Excentrique-pause-concentrique-pause. Ex: "3010", "2010", "4010", "X010" (X = explosif).
3. RIR : "0", "1", "2", "3" ou "Échec".
4. Repos : format minutes/secondes : "30s", "45s", "1'", "1'30", "2'", "2'30", "3'", "5'".
5. Adapter volume/intensité au niveau et objectif (force = lourd long repos / hypertrophie = volume modéré / endurance = haut volume rest court).
6. Si durée > 1 semaine : varier l'intensité (semaine 1 volume → semaine N intensité ou peak).
7. Inclure une dernière semaine de deload si durée >= 4 semaines (volume -40%, RIR +2).
8. Noms d'exercices en français standard de musculation (pas d'inventions).
9. 4 à 8 exercices par séance selon le niveau.
10. Ne JAMAIS inclure de conseil médical, de recommandation de complément, ou de référence à des pathologies.

Si le prompt utilisateur est ambigu, fais des choix raisonnables et tu peux ajouter au champ "tagline" une note "À ajuster". Réponds toujours en JSON valide.`;

module.exports = async (req, res) => {
  const origin = req.headers.origin || "";
  res.setHeader("Access-Control-Allow-Origin", origin || "https://rbperform.app");
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  // Securite : origin check + rate limit 10/h/IP
  if (!secureRequest(req, res, { max: 10, windowMs: 3600000 })) return;

  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "MISTRAL_API_KEY missing on server" });

  // Parse body avec gestion JSON malformé
  let body;
  try {
    body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    if (!body || typeof body !== "object") throw new Error("invalid body");
  } catch {
    return res.status(400).json({ error: "Malformed JSON body" });
  }

  const userPrompt = String(body.prompt || "").trim().slice(0, 2000);
  if (!userPrompt) return res.status(400).json({ error: "Missing 'prompt' field" });

  // Filtrage anti-fuite données médicales (basique). Si le prompt mentionne
  // une pathologie ou un médicament, on demande au coach de retirer.
  const medicalRe = /\b(diabète|cancer|cardiaque|hypertension|asthme|épilepsie|grossesse|hernie|scoliose|tendinite|opération|chirurgie|médicament|antidépresseur)\b/i;
  if (medicalRe.test(userPrompt)) {
    return res.status(400).json({
      error: "Prompt rejeté",
      reason: "Le prompt mentionne des informations médicales. Les programmes IA ne peuvent pas être personnalisés sur des pathologies. Contacte ton client en privé pour l'adaptation.",
    });
  }

  try {
    const upstream = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + apiKey },
      body: JSON.stringify({
        model: "mistral-large-latest",
        temperature: 0.4,
        max_tokens: 6000,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    const data = await upstream.json();
    if (!upstream.ok) {
      console.error("[generate-programme] Mistral error:", data);
      return res.status(upstream.status).json({ error: "Mistral error", details: data });
    }

    const content = data?.choices?.[0]?.message?.content;
    if (!content) return res.status(502).json({ error: "Empty Mistral response" });

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (e) {
      console.error("[generate-programme] JSON parse failed:", content);
      return res.status(502).json({ error: "Invalid JSON from Mistral", raw: content.slice(0, 500) });
    }

    // Validation basique de la structure
    if (!parsed.weeks || !Array.isArray(parsed.weeks) || parsed.weeks.length === 0) {
      return res.status(502).json({ error: "Mistral didn't return a valid weeks structure", parsed });
    }

    // Inject disclaimer obligatoire dans le tagline
    if (!parsed.tagline) parsed.tagline = "";
    parsed.aiGenerated = true;
    parsed.aiGeneratedAt = new Date().toISOString();

    return res.status(200).json({ ok: true, programme: parsed });
  } catch (err) {
    console.error("[generate-programme] unexpected:", err);
    return res.status(500).json({
      error: process.env.VERCEL_ENV === "production" ? "Generation failed" : err.message,
    });
  }
};

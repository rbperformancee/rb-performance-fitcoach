// Vercel Serverless Function — proxy vers l'API Mistral La Plateforme
// Lit MISTRAL_API_KEY depuis les env vars Vercel (jamais exposee au browser)
//
// Pourquoi Mistral plutot qu'Anthropic :
//   - Free tier genereux pour demarrer (~1M tokens/mois sur mistral-small)
//   - Heberge en UE (RGPD propre pour une app coaching francaise)
//   - Excellente qualite sur l'analyse nutritionnelle en francais
//   - API compatible OpenAI (chat completions + JSON mode natif)

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

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
        model: "mistral-small-latest",
        temperature: 0.2,
        max_tokens: 300,
        // JSON mode natif Mistral. Le prompt doit contenir "json" quelque part.
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "Tu es un expert nutritionniste francais. L'utilisateur decrit un repas a la voix. " +
              "Estime ses macros de facon realiste pour un sportif. " +
              "Tu reponds UNIQUEMENT avec un objet JSON valide, sans aucun texte autour, sans markdown, " +
              "avec exactement ces cles : " +
              '{ "aliment": string (nom court du repas, max 60 caracteres), ' +
              '"calories": number (kcal entiers), ' +
              '"proteines": number (grammes, 1 decimale), ' +
              '"glucides": number (grammes, 1 decimale), ' +
              '"lipides": number (grammes, 1 decimale), ' +
              '"quantite_g": number (estimation poids total en grammes, entier) }. ' +
              "Si la description est vague, fais une estimation moyenne pour une portion adulte sportif (~600 kcal).",
          },
          {
            role: "user",
            content: "Repas a analyser : " + text,
          },
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

    // Validation legere : on rejette si les cles essentielles manquent
    if (typeof parsed.calories !== "number" || typeof parsed.aliment !== "string") {
      return res.status(502).json({ error: "Incomplete response from model", parsed });
    }

    return res.status(200).json(parsed);
  } catch (e) {
    return res.status(500).json({ error: "Proxy failure", message: String(e) });
  }
}

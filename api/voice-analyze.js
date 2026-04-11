// Vercel Serverless Function — proxy vers l'API Anthropic
// Lit ANTHROPIC_API_KEY depuis les env vars Vercel (jamais exposée au browser)

export default async function handler(req, res) {
  // CORS basique (même origine en prod, utile en dev)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "ANTHROPIC_API_KEY missing on server" });
  }

  const text = (req.body && req.body.text) ? String(req.body.text).slice(0, 500) : "";
  if (!text) return res.status(400).json({ error: "Missing 'text' field" });

  try {
    const upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 400,
        messages: [
          {
            role: "user",
            content:
              "Tu es un expert nutrition. Analyse ce repas decrit en francais et retourne UNIQUEMENT un objet JSON valide (pas de texte autour, pas de markdown), avec les cles exactes: aliment (string), calories (number), proteines (number, en g), glucides (number, en g), lipides (number, en g), quantite_g (number, estimation en g). Repas: " +
              text,
          },
        ],
      }),
    });

    const data = await upstream.json();
    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: "Anthropic error", details: data });
    }

    const raw = (data?.content?.[0]?.text || "{}").replace(/```json|```/g, "").trim();
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return res.status(502).json({ error: "Bad JSON from model", raw });
    }

    return res.status(200).json(parsed);
  } catch (e) {
    return res.status(500).json({ error: "Proxy failure", message: String(e) });
  }
}

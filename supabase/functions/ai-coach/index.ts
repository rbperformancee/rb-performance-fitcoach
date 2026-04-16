import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const mistralKey = Deno.env.get("MISTRAL_API_KEY");
    if (!mistralKey) {
      return new Response(JSON.stringify({ success: false, error: "MISTRAL_API_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { type, payload } = await req.json();

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, error: "Missing authorization" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (type !== "analyze_client") {
      return new Response(JSON.stringify({ success: false, error: "Unknown type: " + type }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const p = payload || {};
    const systemPrompt = `Tu es un assistant IA specialise en coaching sportif et retention client.
Tu analyses les donnees d'un client et tu fournis une analyse actionnable pour le coach.
Tu reponds UNIQUEMENT en JSON valide avec cette structure exacte :
{
  "summary": "Analyse en 2-3 phrases du profil client, tendances, risques",
  "actions": [
    { "label": "Action concrete 1", "type": "message" },
    { "label": "Action concrete 2", "type": "programme" },
    { "label": "Action concrete 3", "type": "other" }
  ]
}`;

    const userPrompt = `Analyse ce client de coaching sportif :
- Prenom : ${p.prenom || "Inconnu"}
- Programme : ${p.programme_name || "Aucun"}
- Semaine actuelle : ${p.semaine_actuelle || "N/A"}
- Poids debut : ${p.poids_debut || "N/A"} kg
- Poids actuel : ${p.poids_actuel || "N/A"} kg
- Jours inactif : ${p.inactive_days ?? "N/A"}
- Score churn : ${p.churn_score ?? "N/A"}/100
- Derniere seance : ${p.derniere_seance || "N/A"}
- RPE moyen : ${p.rpe_moyen || "N/A"}
- Sessions 14j : ${p.sessions_count_14j ?? "N/A"}
- Tags : ${(p.tags || []).join(", ") || "Aucun"}

Donne une analyse precise et 3 actions concretes pour le coach.`;

    const mistralRes = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${mistralKey}`,
      },
      body: JSON.stringify({
        model: "mistral-small-latest",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
        max_tokens: 500,
        temperature: 0.3,
      }),
    });

    if (!mistralRes.ok) {
      const errText = await mistralRes.text();
      console.error("[ai-coach] Mistral error:", mistralRes.status, errText);
      return new Response(JSON.stringify({ success: false, error: "Mistral API error", code: mistralRes.status }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const mistralData = await mistralRes.json();
    const content = mistralData.choices?.[0]?.message?.content;

    if (!content) {
      return new Response(JSON.stringify({ success: false, error: "Empty Mistral response" }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let analysis;
    try { analysis = JSON.parse(content); }
    catch { analysis = { summary: content, actions: [] }; }

    return new Response(JSON.stringify({ success: true, ...analysis }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("[ai-coach] Error:", err);
    return new Response(JSON.stringify({ success: false, error: err.message || "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

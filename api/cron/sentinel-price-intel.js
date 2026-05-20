/**
 * Cron: sentinel-price-intel — Mercredi 06:00 UTC hebdo (08:00 Paris)
 *
 * Génère des cartes price_intel pour chaque coach éligible Sentinel via
 * la CONNAISSANCE MARCHÉ Mistral (et non pas via la médiane plateforme
 * comme sentinel-benchmarks, qui exige n≥10 coachs et ne fonctionne pas
 * en phase early).
 *
 * Pourquoi un cron séparé :
 * - sentinel-benchmarks dépend de la médiane plateforme → bloqué tant
 *   qu'il n'y a pas 10+ coachs Sentinel. Avec 3 founders, jamais de
 *   carte price_intel → vide vu par le coach payant qui pense être
 *   arnaqué sur la promesse Founding.
 * - Ce cron utilise les connaissances de Mistral sur le marché coaching
 *   personnel France/Europe 2026 pour produire une recommandation
 *   crédible dès le 1er coach.
 *
 * Une fois la plateforme à n≥10, sentinel-benchmarks générera des cartes
 * comparatives plateforme. Pour éviter le doublon, sentinel-benchmarks
 * ne crée plus de price_intel (uniquement ranking) — c'est ce cron qui
 * en a la responsabilité.
 */

const pLimit = require("p-limit");
const { z } = require("zod");
const {
  isAuthorizedCron,
  sb,
  getSentinelCoaches,
  isBudgetExceeded,
  callMistral,
  estimateCost,
  logMistralCall,
  insertCard,
  expireOldCards,
  weekKey,
} = require("../_sentinel-helpers");
const { captureException } = require("../_sentry");

const MISTRAL_ENABLED = !!process.env.MISTRAL_API_KEY;

// Schéma Zod stricte — on rejette tout output Mistral non conforme.
const priceIntelSchema = z.object({
  title: z.string().min(8).max(80),
  insight: z.string().min(20).max(300),
  your_avg_price: z.number().min(0),
  market_median: z.number().min(0),
  market_p10: z.number().min(0),
  market_p90: z.number().min(0),
  gap_pct: z.number(),
  recommendation: z.string().min(15).max(200),
  action: z.enum(["raise", "keep", "lower"]),
});

const limit = pLimit(3);

async function processCoach(coach) {
  // Récupère les plans actifs du coach
  const plans = await sb(
    `/rest/v1/coach_plans?coach_id=eq.${coach.id}&is_active=eq.true&select=name,price_per_month,duration_months&order=duration_months.asc`
  );
  if (!Array.isArray(plans) || plans.length === 0) {
    return { coachId: coach.id, status: "skipped_no_plans" };
  }

  const prices = plans.map((p) => parseFloat(p.price_per_month) || 0).filter((p) => p > 0);
  if (prices.length === 0) {
    return { coachId: coach.id, status: "skipped_zero_prices" };
  }
  const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;

  // Nombre de clients (contexte volume / palier de marché)
  const clientsRes = await sb(
    `/rest/v1/clients?coach_id=eq.${coach.id}&select=id&limit=1000`
  );
  const nClients = Array.isArray(clientsRes) ? clientsRes.length : 0;

  if (await isBudgetExceeded()) {
    return { coachId: coach.id, status: "budget_exceeded" };
  }

  const planSummary = plans
    .map((p) => `${p.name || "Plan"} (${p.duration_months}m) → ${p.price_per_month}€/mois`)
    .join(" · ");

  // Prompt = expertise marché coaching FR/EU 2026, pas de PII.
  const system = `Tu es un consultant pricing expert du marché du coaching sportif personnel en France/Europe en 2026 (coaching musculation, perte de poids, remise en forme, suivi en ligne ou hybride).

CONNAISSANCE MARCHÉ 2026 (coaching personal training, programmes personnalisés, suivi en ligne) :
- Coach débutant (<2 ans, peu de social proof) : 60-100 €/mois
- Coach intermédiaire (2-5 ans, suivi sérieux, 10-25 clients) : 100-180 €/mois
- Coach confirmé (5+ ans, niche définie, résultats prouvés) : 180-280 €/mois
- Coach premium / high-ticket (transformations vérifiables, brand fort) : 280-500 €/mois
- Coach elite (1-1 rapproché, contenus payants en plus) : 500-900 €/mois
- Médiane marché tous niveaux confondus : 130-160 €/mois
- p10 : 70 €/mois · p90 : 250 €/mois

Ton job : analyser le pricing du coach et donner UNE recommandation actionnable. Sois honnête et chiffré. Pas de bullshit type "monte tes prix"  sans justification.

Tu réponds en JSON STRICT (response_format json_object) conforme à ce schéma :
{
  "title": "max 80 chars, accroche claire et précise",
  "insight": "20-300 chars, ton diagnostic en 1-2 phrases",
  "your_avg_price": <number, € mensuel du coach>,
  "market_median": <number, médiane marché que tu estimes>,
  "market_p10": <number>,
  "market_p90": <number>,
  "gap_pct": <number, écart en % vs médiane (+ si au-dessus, - si en-dessous)>,
  "recommendation": "15-200 chars, action concrète",
  "action": "raise" | "keep" | "lower"
}

RÈGLES :
- Aucune mention d'autres coachs nommés, pas d'estimation au-delà de tes connaissances marché.
- Si le coach est aligné marché (gap_pct entre -10 et +10), action="keep" et tu valides son positionnement.
- Si sous-pricé (-15% ou plus), action="raise" avec un montant cible précis.
- Si sur-pricé sans justification volume/qualité visible, action="lower" avec prudence.
- Reste honnête : un coach à 100 €/mois avec 20 clients est probablement justement positionné, pas "sous-pricé".`;

  const user = `Coach (anonyme) — Plans actifs : ${planSummary}.
Prix moyen mensuel sur l'ensemble des plans : ${Math.round(avgPrice)} €.
Nombre de clients actifs : ${nClients}.

Analyse son positionnement pricing vs marché FR coaching personal training 2026 et renvoie le JSON.`;

  let resp;
  try {
    resp = await callMistral(system, user);
  } catch (e) {
    await logMistralCall({
      coachId: coach.id,
      module: "price_intel",
      promptTokens: 0,
      completionTokens: 0,
      costUsd: 0,
      status: "error",
      errorMessage: e.message,
    });
    return { coachId: coach.id, status: "mistral_error", error: e.message };
  }

  const cost = estimateCost(resp.promptTokens, resp.completionTokens);
  await logMistralCall({
    coachId: coach.id,
    module: "price_intel",
    promptTokens: resp.promptTokens,
    completionTokens: resp.completionTokens,
    costUsd: cost,
    status: "ok",
  });

  let parsed;
  try {
    const json = JSON.parse(resp.content);
    parsed = priceIntelSchema.parse(json);
  } catch (e) {
    await logMistralCall({
      coachId: coach.id,
      module: "price_intel",
      promptTokens: resp.promptTokens,
      completionTokens: resp.completionTokens,
      costUsd: cost,
      status: "validation_error",
      errorMessage: e.message,
    });
    return { coachId: coach.id, status: "validation_error", error: e.message };
  }

  // CTA + priorité = fonction de l'action recommandée
  const ctaAction = parsed.action === "keep" ? null : "open_plans_settings";
  const ctaLabel = parsed.action === "keep" ? null : "Ajuster mes tarifs";
  const priority =
    parsed.action === "raise" ? 60 : parsed.action === "lower" ? 45 : 25;
  const expiresAt = new Date(Date.now() + 14 * 86400000).toISOString();

  const wkey = weekKey();
  const body = `${parsed.insight}\n\n→ ${parsed.recommendation}`;

  const created = await insertCard({
    coachId: coach.id,
    module: "price_intel",
    priority,
    title: parsed.title,
    body,
    data: parsed,
    ctaLabel,
    ctaAction,
    expiresAt,
    dedupeKey: `price_intel_market_${coach.id}_${wkey}`,
  });

  return { coachId: coach.id, status: created ? "created" : "duplicate", action: parsed.action };
}

module.exports = async (req, res) => {
  if (!isAuthorizedCron(req)) return res.status(401).json({ error: "Unauthorized" });
  if (!MISTRAL_ENABLED) {
    return res.status(200).json({ status: "skipped", reason: "mistral_disabled" });
  }

  try {
    await expireOldCards();
    const coaches = await getSentinelCoaches();
    if (!coaches.length) {
      return res.status(200).json({ status: "ok", processed: 0, summary: { no_eligible_coaches: 0 } });
    }

    const results = await Promise.all(
      coaches.map((c) =>
        limit(() =>
          processCoach(c).catch((e) => ({
            coachId: c.id,
            status: "exception",
            error: e.message,
          }))
        )
      )
    );

    const summary = results.reduce((acc, r) => {
      acc[r.status] = (acc[r.status] || 0) + 1;
      return acc;
    }, {});

    return res.status(200).json({ status: "ok", processed: coaches.length, summary });
  } catch (e) {
    captureException(e, { tag: "sentinel-price-intel" });
    return res.status(500).json({ error: e.message });
  }
};

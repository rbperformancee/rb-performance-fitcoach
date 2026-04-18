/**
 * Cron: sentinel-weekly — 07:00 UTC Monday (09:00 Paris)
 *
 * Generates Revenue Unblocker cards (clients to upgrade) for each eligible coach.
 *
 * Mode 1 (default): Smart data-driven cards — zero Mistral, zero cout.
 * Mode 2 (MISTRAL_API_KEY set): Enhanced via Mistral AI.
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
  sanitize,
  anonymizeClient,
  weekKey,
} = require("../_sentinel-helpers");

const MISTRAL_ENABLED = !!process.env.MISTRAL_API_KEY;

const revenueUnblockerSchema = z.object({
  title: z.string().max(80),
  clients: z.array(z.object({
    client_ref: z.string().max(20),
    reason: z.string().max(200),
    suggested_plan: z.string().max(60),
    potential_eur: z.number().int().min(0).max(100000),
    cta_action: z.enum(["open_client_profile", "open_message_compose", "schedule_call"]),
    cta_payload: z.record(z.any()).optional(),
  })).min(1).max(5),
  total_potential_eur: z.number().int(),
});

const limit = pLimit(5);

// ===== DATA-DRIVEN UNBLOCKER (zero Mistral) =====
function buildSmartUnblocker({ upgradeCandidates, planArr }) {
  const topPlan = planArr[planArr.length - 1]; // Most expensive plan
  const clients = upgradeCandidates.slice(0, 5).map((c) => {
    const upgrade = parseFloat(topPlan?.price_monthly || 0) - c.currentPrice;
    return {
      client_ref: c.ref,
      reason: c.engagementScore >= 80
        ? `Tres actif (${c.engagementScore}/100) depuis ${c.monthsActive} mois — pret pour un plan superieur`
        : `Fidele depuis ${c.monthsActive} mois, engagement ${c.engagementScore}/100 — propose-lui plus de valeur`,
      suggested_plan: topPlan?.name || "Premium",
      potential_eur: Math.max(0, Math.round(upgrade)),
      cta_action: "open_client_profile",
    };
  });

  const totalPotential = clients.reduce((s, c) => s + c.potential_eur, 0);

  return {
    title: clients.length === 1
      ? "1 client pret a upgrader"
      : `${clients.length} clients prets a upgrader`,
    clients,
    total_potential_eur: totalPotential,
  };
}

export default async function handler(req, res) {
  if (!isAuthorizedCron(req)) return res.status(401).json({ error: "Unauthorized" });

  const startTime = Date.now();

  try {
    await expireOldCards();

    const coaches = await getSentinelCoaches();
    if (!coaches.length) return res.status(200).json({ status: "no_eligible_coaches" });

    const week = weekKey();
    let cardsCreated = 0;
    let errors = 0;
    let totalCost = 0;

    const tasks = coaches.map((coach) =>
      limit(async () => {
        try {
          const clients = await sb(
            `/rest/v1/clients?select=id,full_name,last_activity,subscription_end_date,subscription_plan_id,created_at&coach_id=eq.${coach.id}`,
            { headers: { Prefer: "return=representation" } }
          );
          const clientArr = Array.isArray(clients) ? clients : [];
          if (clientArr.length < 2) return;

          const plans = await sb(
            `/rest/v1/coach_plans?select=id,name,price_monthly&coach_id=eq.${coach.id}&is_active=eq.true&order=price_monthly.asc`,
            { headers: { Prefer: "return=representation" } }
          );
          const planArr = Array.isArray(plans) ? plans : [];
          if (planArr.length < 2) return;

          const now = Date.now();
          const sevenDaysAgo = now - 7 * 86400000;
          const cheapestPrice = Math.min(...planArr.map((p) => parseFloat(p.price_monthly) || 0));

          const upgradeCandidates = clientArr
            .filter((c) => c.last_activity && new Date(c.last_activity).getTime() > sevenDaysAgo)
            .map((c) => ({
              ref: anonymizeClient(c),
              clientId: c.id,
              currentPlan: planArr[0]?.name || "Standard",
              currentPrice: cheapestPrice,
              monthsActive: Math.max(1, Math.floor((now - new Date(c.created_at).getTime()) / (30 * 86400000))),
              engagementScore: c.last_activity ? Math.min(100, Math.round(100 - ((now - new Date(c.last_activity).getTime()) / 86400000) * 10)) : 0,
            }))
            .filter((c) => c.engagementScore >= 50)
            .sort((a, b) => b.engagementScore - a.engagementScore)
            .slice(0, 5);

          if (upgradeCandidates.length === 0) return;

          // Build card — smart mode or Mistral-enhanced
          let cardData;

          if (MISTRAL_ENABLED) {
            const budgetNow = await isBudgetExceeded();
            if (!budgetNow.exceeded) {
              try {
                const mrr = clientArr.length * cheapestPrice;
                const systemPrompt = `Tu es Sentinel, un agent IA business pour coachs sportifs. Tu identifies les clients qui pourraient upgrader. Reponds UNIQUEMENT en JSON valide. Langue: francais.`;
                const userPrompt = `Plans: ${planArr.map((p) => `${sanitize(p.name)} ${p.price_monthly}EUR`).join(", ")}. MRR: ${Math.round(mrr)}EUR.
Candidats: ${upgradeCandidates.map((c) => `${c.ref}: ${sanitize(c.currentPlan)} ${c.currentPrice}EUR, ${c.monthsActive}mois, engagement ${c.engagementScore}/100`).join("; ")}
JSON: {title, clients: [{client_ref, reason, suggested_plan, potential_eur, cta_action: open_client_profile|open_message_compose|schedule_call}], total_potential_eur}`;

                const result = await callMistral(systemPrompt, userPrompt);
                const cost = estimateCost(result.promptTokens, result.completionTokens);
                totalCost += cost;
                const parsed = JSON.parse(result.content);
                const validation = revenueUnblockerSchema.safeParse(parsed);
                if (validation.success) {
                  cardData = validation.data;
                  await logMistralCall({ coachId: coach.id, module: "revenue_unblocker", promptTokens: result.promptTokens, completionTokens: result.completionTokens, costUsd: cost, status: "success" });
                } else {
                  await logMistralCall({ coachId: coach.id, module: "revenue_unblocker", promptTokens: result.promptTokens, completionTokens: result.completionTokens, costUsd: cost, status: "parse_error", errorMessage: "Zod failed" });
                }
              } catch (e) {
                await logMistralCall({ coachId: coach.id, module: "revenue_unblocker", status: e.message?.includes("timeout") ? "timeout" : "mistral_error", errorMessage: e.message });
              }
            }
          }

          if (!cardData) {
            cardData = buildSmartUnblocker({ upgradeCandidates, planArr });
          }

          const created = await insertCard({
            coachId: coach.id,
            module: "revenue_unblocker",
            priority: 70,
            title: cardData.title,
            body: cardData.clients.map((c) => `• ${c.client_ref}: ${c.reason} → ${c.suggested_plan} (+${c.potential_eur}EUR)`).join("\n"),
            data: cardData,
            ctaLabel: `Debloquer +${cardData.total_potential_eur}EUR`,
            ctaAction: "open_sentinel_detail",
            expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
            dedupeKey: `weekly_${coach.id}_${week}`,
          });
          if (created) cardsCreated++;
        } catch (e) {
          console.error(`[sentinel-weekly] coach ${coach.id}:`, e.message);
          errors++;
        }
      })
    );

    await Promise.all(tasks);

    return res.status(200).json({
      status: "ok",
      mode: MISTRAL_ENABLED ? "mistral_enhanced" : "smart_data",
      coaches_processed: coaches.length,
      cards_created: cardsCreated,
      errors,
      total_cost_usd: Math.round(totalCost * 1000) / 1000,
      duration_seconds: Math.round((Date.now() - startTime) / 1000),
    });
  } catch (e) {
    console.error("[sentinel-weekly] fatal:", e);
    return res.status(500).json({ error: e.message });
  }
}

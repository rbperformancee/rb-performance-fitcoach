/**
 * Cron: sentinel-weekly — 07:00 UTC Monday (09:00 Paris)
 *
 * Generates Revenue Unblocker cards (1-5 clients to upgrade) for each eligible coach.
 * Uses Mistral AI with strict JSON output + Zod validation.
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

const revenueUnblockerSchema = z.object({
  title: z.string().max(80),
  clients: z
    .array(
      z.object({
        client_ref: z.string().max(20),
        reason: z.string().max(200),
        suggested_plan: z.string().max(60),
        potential_eur: z.number().int().min(0).max(100000),
        cta_action: z.enum(["open_client_profile", "open_message_compose", "schedule_call"]),
        cta_payload: z.record(z.any()).optional(),
      })
    )
    .min(1)
    .max(5),
  total_potential_eur: z.number().int(),
});

const limit = pLimit(5);

export default async function handler(req, res) {
  if (!isAuthorizedCron(req)) return res.status(401).json({ error: "Unauthorized" });

  const startTime = Date.now();

  try {
    await expireOldCards();

    const budget = await isBudgetExceeded();
    if (budget.exceeded) {
      return res.status(200).json({ status: "budget_exceeded", spent: budget.spent });
    }

    const coaches = await getSentinelCoaches();
    if (!coaches.length) return res.status(200).json({ status: "no_eligible_coaches" });

    const week = weekKey();
    let cardsCreated = 0;
    let errors = 0;
    let totalCost = 0;

    const tasks = coaches.map((coach) =>
      limit(async () => {
        try {
          const budgetNow = await isBudgetExceeded();
          if (budgetNow.exceeded) return;

          // Get clients
          const clients = await sb(
            `/rest/v1/clients?select=id,full_name,last_activity,subscription_end_date,subscription_plan_id,created_at&coach_id=eq.${coach.id}`,
            { headers: { Prefer: "return=representation" } }
          );
          const clientArr = Array.isArray(clients) ? clients : [];
          if (clientArr.length < 2) return; // Need at least 2 clients for upgrade analysis

          // Get coach plans
          const plans = await sb(
            `/rest/v1/coach_plans?select=id,name,price_monthly&coach_id=eq.${coach.id}&is_active=eq.true&order=price_monthly.asc`,
            { headers: { Prefer: "return=representation" } }
          );
          const planArr = Array.isArray(plans) ? plans : [];
          if (planArr.length < 2) return; // Need at least 2 plans for upgrade path

          const now = Date.now();
          const sevenDaysAgo = now - 7 * 86400000;

          // Find upgrade candidates: active clients on cheaper plans
          const cheapestPrice = Math.min(...planArr.map((p) => parseFloat(p.price_monthly) || 0));
          const upgradeCandidates = clientArr
            .filter((c) => c.last_activity && new Date(c.last_activity).getTime() > sevenDaysAgo)
            .map((c) => {
              const monthsActive = Math.max(1, Math.floor((now - new Date(c.created_at).getTime()) / (30 * 86400000)));
              const currentPrice = cheapestPrice; // Simplified: assume lowest plan
              return {
                ref: anonymizeClient(c),
                clientId: c.id,
                currentPlan: planArr[0]?.name || "Standard",
                currentPrice,
                monthsActive,
                engagementScore: c.last_activity ? Math.min(100, Math.round(100 - ((now - new Date(c.last_activity).getTime()) / 86400000) * 10)) : 0,
              };
            })
            .filter((c) => c.engagementScore >= 50)
            .sort((a, b) => b.engagementScore - a.engagementScore)
            .slice(0, 5);

          if (upgradeCandidates.length === 0) return;

          const mrr = clientArr.length * cheapestPrice;

          const systemPrompt = `Tu es Sentinel, un agent IA business pour coachs sportifs. Tu identifies les clients qui pourraient upgrader leur abonnement. Reponds UNIQUEMENT en JSON valide. Langue: francais.`;

          const userPrompt = `Voici les metriques du coach:
- Plans disponibles: ${planArr.map((p) => `${sanitize(p.name)} a ${p.price_monthly}EUR/mois`).join(", ")}
- MRR actuel: ${Math.round(mrr)}EUR/mois

Clients avec potentiel d'upgrade (anonymises):
${upgradeCandidates.map((c) => `- ${c.ref}: plan actuel ${sanitize(c.currentPlan)} a ${c.currentPrice}EUR/mois, actif depuis ${c.monthsActive} mois, engagement ${c.engagementScore}/100`).join("\n")}

Genere un JSON avec: title (max 80 chars), clients (array 1-5 avec client_ref identique a ceux fournis, reason max 200 chars, suggested_plan parmi les plans disponibles, potential_eur entier positif, cta_action parmi [open_client_profile, open_message_compose, schedule_call], cta_payload optionnel), total_potential_eur entier.`;

          let mistralResult;
          try {
            mistralResult = await callMistral(systemPrompt, userPrompt);
          } catch (e) {
            await logMistralCall({
              coachId: coach.id,
              module: "revenue_unblocker",
              status: e.message.includes("timeout") ? "timeout" : "mistral_error",
              errorMessage: e.message,
            });
            // Fallback card
            await insertCard({
              coachId: coach.id,
              module: "revenue_unblocker",
              priority: 60,
              title: "Revenus a debloquer cette semaine",
              body: `${upgradeCandidates.length} client(s) actif(s) pourraient passer a un plan superieur. Ouvre leur profil pour evaluer.`,
              data: { fallback: true },
              ctaLabel: "Voir mes clients",
              ctaAction: "open_client_list",
              expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
              dedupeKey: `weekly_${coach.id}_${week}`,
            });
            errors++;
            return;
          }

          const cost = estimateCost(mistralResult.promptTokens, mistralResult.completionTokens);
          totalCost += cost;

          let parsed;
          try {
            parsed = JSON.parse(mistralResult.content);
          } catch (e) {
            await logMistralCall({
              coachId: coach.id,
              module: "revenue_unblocker",
              promptTokens: mistralResult.promptTokens,
              completionTokens: mistralResult.completionTokens,
              costUsd: cost,
              status: "parse_error",
              errorMessage: "Invalid JSON",
            });
            errors++;
            return;
          }

          const validation = revenueUnblockerSchema.safeParse(parsed);
          if (!validation.success) {
            await logMistralCall({
              coachId: coach.id,
              module: "revenue_unblocker",
              promptTokens: mistralResult.promptTokens,
              completionTokens: mistralResult.completionTokens,
              costUsd: cost,
              status: "parse_error",
              errorMessage: "Zod: " + validation.error.issues.map((i) => i.message).join(", "),
            });
            errors++;
            return;
          }

          await logMistralCall({
            coachId: coach.id,
            module: "revenue_unblocker",
            promptTokens: mistralResult.promptTokens,
            completionTokens: mistralResult.completionTokens,
            costUsd: cost,
            status: "success",
          });

          const created = await insertCard({
            coachId: coach.id,
            module: "revenue_unblocker",
            priority: 70,
            title: validation.data.title,
            body: validation.data.clients.map((c) => `• ${c.client_ref}: ${c.reason} → ${c.suggested_plan} (+${c.potential_eur}EUR)`).join("\n"),
            data: validation.data,
            ctaLabel: `Debloquer +${validation.data.total_potential_eur}EUR`,
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

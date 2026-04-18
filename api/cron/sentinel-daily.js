/**
 * Cron: sentinel-daily — 05:30 UTC daily (07:30 Paris)
 *
 * Generates Daily Playbook cards (3 actions chiffrees) for each eligible coach.
 * Uses Mistral AI with strict JSON output + Zod validation.
 *
 * Safety:
 * - CRON_SECRET auth
 * - service_role Supabase (bypass RLS)
 * - Idempotent via dedupe_key
 * - Per-coach error isolation
 * - p-limit(5) for Mistral rate limiting
 * - 30s timeout + 2 retries with exponential backoff
 * - Daily budget cap
 * - Zero PII to Mistral
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
  todayKey,
} = require("../_sentinel-helpers");

// Zod schema for Mistral output validation
const dailyPlaybookSchema = z.object({
  title: z.string().max(80),
  actions: z
    .array(
      z.object({
        text: z.string().max(200),
        impact_eur: z.number().int().min(0).max(100000),
        cta_action: z.enum([
          "open_message_compose",
          "schedule_call",
          "block_calendar",
          "open_client_profile",
        ]),
        cta_payload: z.record(z.any()).optional(),
      })
    )
    .min(1)
    .max(3),
  total_impact_eur: z.number().int(),
});

const limit = pLimit(5); // Max 5 concurrent Mistral calls

export default async function handler(req, res) {
  if (!isAuthorizedCron(req)) return res.status(401).json({ error: "Unauthorized" });

  const startTime = Date.now();

  try {
    await expireOldCards();

    // Budget check
    const budget = await isBudgetExceeded();
    if (budget.exceeded) {
      console.warn(`[sentinel-daily] Budget exceeded: $${budget.spent.toFixed(2)}/$${budget.budget}`);
      return res.status(200).json({ status: "budget_exceeded", spent: budget.spent, budget: budget.budget });
    }

    const coaches = await getSentinelCoaches();
    if (!coaches.length) return res.status(200).json({ status: "no_eligible_coaches" });

    const today = todayKey();
    let cardsCreated = 0;
    let errors = 0;
    let totalCost = 0;

    const tasks = coaches.map((coach) =>
      limit(async () => {
        try {
          // Re-check budget before each call
          const budgetNow = await isBudgetExceeded();
          if (budgetNow.exceeded) return;

          // Get coach's clients with activity data
          const clients = await sb(
            `/rest/v1/clients?select=id,full_name,last_activity,subscription_end_date,subscription_plan_id,pipeline_status&coach_id=eq.${coach.id}`,
            { headers: { Prefer: "return=representation" } }
          );
          const clientArr = Array.isArray(clients) ? clients : [];
          if (clientArr.length === 0) return; // No clients, skip

          // Get coach plans for pricing
          const plans = await sb(
            `/rest/v1/coach_plans?select=id,name,price_monthly&coach_id=eq.${coach.id}&is_active=eq.true`,
            { headers: { Prefer: "return=representation" } }
          );
          const planArr = Array.isArray(plans) ? plans : [];
          const avgPrice = planArr.length > 0
            ? planArr.reduce((s, p) => s + (parseFloat(p.price_monthly) || 0), 0) / planArr.length
            : 0;

          // Compute metrics
          const now = Date.now();
          const sevenDaysAgo = now - 7 * 86400000;
          const activeClients = clientArr.filter((c) => c.last_activity && new Date(c.last_activity).getTime() > sevenDaysAgo);
          const inactiveClients = clientArr.filter((c) => {
            if (!c.last_activity) return true;
            return (now - new Date(c.last_activity).getTime()) > 5 * 86400000;
          });
          const expiringClients = clientArr.filter((c) => {
            if (!c.subscription_end_date) return false;
            const daysLeft = (new Date(c.subscription_end_date).getTime() - now) / 86400000;
            return daysLeft > 0 && daysLeft <= 14;
          });

          const retention7d = clientArr.length > 0 ? Math.round((activeClients.length / clientArr.length) * 100) : 0;
          const mrr = clientArr.length * avgPrice;
          const businessScore = Math.min(100, Math.round(
            retention7d * 0.4 + Math.min(100, clientArr.length * 5) * 0.3 + (inactiveClients.length === 0 ? 30 : Math.max(0, 30 - inactiveClients.length * 5))
          ));

          // Anonymize at-risk clients
          const atRiskClients = inactiveClients.slice(0, 5).map((c) => ({
            ref: anonymizeClient(c),
            inactiveDays: c.last_activity ? Math.floor((now - new Date(c.last_activity).getTime()) / 86400000) : 999,
            planName: "Standard",
            planPrice: avgPrice,
          }));

          // Build prompt
          const systemPrompt = `Tu es Sentinel, un agent IA business pour coachs sportifs. Tu generes exactement 3 actions concretes et chiffrees pour la journee du coach. Chaque action doit avoir un impact financier estime en euros. Reponds UNIQUEMENT en JSON valide. Langue: francais.`;

          const userPrompt = `Voici les metriques du coach aujourd'hui:
- MRR: ${Math.round(mrr)}EUR/mois
- Clients actifs: ${activeClients.length}/${clientArr.length}
- Clients inactifs >5j: ${inactiveClients.length}
- Abonnements expirant dans 14j: ${expiringClients.length}
- Retention 7j: ${retention7d}%
- Score business: ${businessScore}/100

Clients a risque (anonymises):
${atRiskClients.map((c) => `- ${c.ref}: inactif ${c.inactiveDays}j, plan ${sanitize(c.planName)} a ${c.planPrice}EUR/mois`).join("\n") || "Aucun"}

Genere un JSON avec: title (max 80 chars), actions (array de 1-3 objets avec text max 200 chars, impact_eur entier, cta_action parmi [open_message_compose, schedule_call, block_calendar, open_client_profile], cta_payload optionnel), total_impact_eur (somme des impacts).`;

          // Call Mistral
          let mistralResult;
          try {
            mistralResult = await callMistral(systemPrompt, userPrompt);
          } catch (e) {
            // Log failure + insert fallback card
            await logMistralCall({
              coachId: coach.id,
              module: "daily_playbook",
              status: e.message.includes("timeout") ? "timeout" : "mistral_error",
              errorMessage: e.message,
            });

            // Fallback generic card
            await insertCard({
              coachId: coach.id,
              module: "daily_playbook",
              priority: 50,
              title: "Tes actions du jour",
              body: "Sentinel n'a pas pu analyser tes donnees ce matin. Concentre-toi sur tes clients inactifs et les renouvellements proches.",
              data: { fallback: true },
              ctaLabel: "Voir mes clients",
              ctaAction: "open_client_list",
              expiresAt: new Date(Date.now() + 18 * 3600000).toISOString(), // Expires tonight
              dedupeKey: `daily_${coach.id}_${today}`,
            });
            errors++;
            return;
          }

          // Parse + validate
          const cost = estimateCost(mistralResult.promptTokens, mistralResult.completionTokens);
          totalCost += cost;

          let parsed;
          try {
            parsed = JSON.parse(mistralResult.content);
          } catch (e) {
            await logMistralCall({
              coachId: coach.id,
              module: "daily_playbook",
              promptTokens: mistralResult.promptTokens,
              completionTokens: mistralResult.completionTokens,
              costUsd: cost,
              status: "parse_error",
              errorMessage: "Invalid JSON: " + e.message,
            });
            errors++;
            return;
          }

          const validation = dailyPlaybookSchema.safeParse(parsed);
          if (!validation.success) {
            await logMistralCall({
              coachId: coach.id,
              module: "daily_playbook",
              promptTokens: mistralResult.promptTokens,
              completionTokens: mistralResult.completionTokens,
              costUsd: cost,
              status: "parse_error",
              errorMessage: "Zod: " + validation.error.issues.map((i) => i.message).join(", "),
            });
            errors++;
            return;
          }

          // Log success
          await logMistralCall({
            coachId: coach.id,
            module: "daily_playbook",
            promptTokens: mistralResult.promptTokens,
            completionTokens: mistralResult.completionTokens,
            costUsd: cost,
            status: "success",
          });

          // Insert card
          const created = await insertCard({
            coachId: coach.id,
            module: "daily_playbook",
            priority: 80, // High priority
            title: validation.data.title,
            body: validation.data.actions.map((a) => `• ${a.text} (+${a.impact_eur}EUR)`).join("\n"),
            data: validation.data,
            ctaLabel: "Lancer la premiere action",
            ctaAction: validation.data.actions[0]?.cta_action || "open_client_list",
            expiresAt: new Date(Date.now() + 18 * 3600000).toISOString(),
            dedupeKey: `daily_${coach.id}_${today}`,
          });
          if (created) cardsCreated++;
        } catch (e) {
          console.error(`[sentinel-daily] coach ${coach.id}:`, e.message);
          errors++;
        }
      })
    );

    await Promise.all(tasks);

    const duration = Math.round((Date.now() - startTime) / 1000);

    return res.status(200).json({
      status: "ok",
      coaches_processed: coaches.length,
      cards_created: cardsCreated,
      errors,
      total_cost_usd: Math.round(totalCost * 1000) / 1000,
      duration_seconds: duration,
    });
  } catch (e) {
    console.error("[sentinel-daily] fatal:", e);
    return res.status(500).json({ error: e.message });
  }
}

/**
 * Cron: sentinel-daily — 05:30 UTC daily (07:30 Paris)
 *
 * Generates Daily Playbook cards (3 actions chiffrees) for each eligible coach.
 *
 * Mode 1 (default): Smart data-driven cards — zero Mistral, zero cout.
 *   Analyse les metriques du coach et genere 3 actions concretes basees sur les data.
 *
 * Mode 2 (MISTRAL_API_KEY set): Enhanced cards via Mistral AI.
 *   Meme logique mais les textes sont affines par l'IA.
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
const { captureException } = require("../_sentry");

const MISTRAL_ENABLED = !!process.env.MISTRAL_API_KEY;

const dailyPlaybookSchema = z.object({
  title: z.string().max(80),
  actions: z.array(z.object({
    text: z.string().max(200),
    impact_eur: z.number().int().min(0).max(100000),
    cta_action: z.enum(["open_message_compose", "schedule_call", "block_calendar", "open_client_profile"]),
    cta_payload: z.record(z.any()).optional(),
  })).min(1).max(3),
  total_impact_eur: z.number().int(),
});

const limit = pLimit(5);

// ===== DATA-DRIVEN CARD BUILDER (zero Mistral) =====
function buildSmartPlaybook({ activeClients, inactiveClients, expiringClients, clientArr, retention7d, mrr, avgPrice, businessScore }) {
  const actions = [];
  const now = Date.now();

  // Action 1: Inactive clients
  if (inactiveClients.length > 0) {
    const top = inactiveClients[0];
    const days = top.last_seen_at ? Math.floor((now - new Date(top.last_seen_at).getTime()) / 86400000) : 999;
    const firstName = top.full_name?.split(" ")[0] || "Un client";
    actions.push({
      text: `${firstName} est inactif depuis ${days}j — envoie-lui un message de relance`,
      impact_eur: Math.round(avgPrice),
      cta_action: "open_message_compose",
    });
  }

  // Action 2: Expiring subscriptions
  if (expiringClients.length > 0) {
    const top = expiringClients[0];
    const daysLeft = Math.ceil((new Date(top.subscription_end_date).getTime() - now) / 86400000);
    const firstName = top.full_name?.split(" ")[0] || "Un client";
    actions.push({
      text: `L'abonnement de ${firstName} expire dans ${daysLeft}j — propose un renouvellement`,
      impact_eur: Math.round(avgPrice * 3), // 3 months value
      cta_action: "open_client_profile",
    });
  }

  // Action 3: Retention or growth
  if (retention7d < 70 && clientArr.length > 0) {
    actions.push({
      text: `Retention a ${retention7d}% — bloque 30min pour checker tes ${inactiveClients.length} clients silencieux`,
      impact_eur: Math.round(inactiveClients.length * avgPrice * 0.5),
      cta_action: "block_calendar",
    });
  } else if (actions.length < 3) {
    actions.push({
      text: businessScore >= 70
        ? "Ton business tourne bien — planifie un appel decouverte pour un prospect"
        : `Score business a ${businessScore}/100 — programme un check-up avec tes clients actifs`,
      impact_eur: Math.round(avgPrice),
      cta_action: businessScore >= 70 ? "schedule_call" : "open_client_profile",
    });
  }

  // Fill to at least 1, cap at 3
  if (actions.length === 0) {
    actions.push({
      text: "Tout est calme — profite pour planifier ta semaine et preparer du contenu",
      impact_eur: 0,
      cta_action: "block_calendar",
    });
  }

  const finalActions = actions.slice(0, 3);
  const totalImpact = finalActions.reduce((s, a) => s + a.impact_eur, 0);

  // Title based on urgency
  let title;
  if (inactiveClients.length >= 3) title = `${inactiveClients.length} clients a reactiver aujourd'hui`;
  else if (expiringClients.length > 0) title = `${expiringClients.length} renouvellement${expiringClients.length > 1 ? "s" : ""} a securiser`;
  else if (businessScore >= 80) title = "Continue sur ta lancee";
  else title = "3 actions pour booster ton business";

  return { title, actions: finalActions, total_impact_eur: totalImpact };
}

export default async function handler(req, res) {
  if (!isAuthorizedCron(req)) return res.status(401).json({ error: "Unauthorized" });

  const startTime = Date.now();

  try {
    await expireOldCards();

    const coaches = await getSentinelCoaches();
    if (!coaches.length) return res.status(200).json({ status: "no_eligible_coaches" });

    // Budget check only if Mistral enabled
    if (MISTRAL_ENABLED) {
      const budget = await isBudgetExceeded();
      if (budget.exceeded) {
        console.warn(`[sentinel-daily] Budget exceeded: $${budget.spent.toFixed(2)}/$${budget.budget}`);
        // Continue with smart cards instead of stopping
      }
    }

    const today = todayKey();
    let cardsCreated = 0;
    let errors = 0;
    let totalCost = 0;

    const tasks = coaches.map((coach) =>
      limit(async () => {
        try {
          // Get coach's clients
          const clients = await sb(
            `/rest/v1/clients?select=id,full_name,last_seen_at,subscription_end_date,subscription_plan_id,pipeline_status&coach_id=eq.${coach.id}`,
            { headers: { Prefer: "return=representation" } }
          );
          const clientArr = Array.isArray(clients) ? clients : [];
          if (clientArr.length === 0) return;

          // Get coach plans
          const plans = await sb(
            `/rest/v1/coach_plans?select=id,name,price_per_month&coach_id=eq.${coach.id}&is_active=eq.true`,
            { headers: { Prefer: "return=representation" } }
          );
          const planArr = Array.isArray(plans) ? plans : [];
          const avgPrice = planArr.length > 0
            ? planArr.reduce((s, p) => s + (parseFloat(p.price_per_month) || 0), 0) / planArr.length
            : 0;

          // Compute metrics
          const now = Date.now();
          const sevenDaysAgo = now - 7 * 86400000;
          const activeClients = clientArr.filter((c) => c.last_seen_at && new Date(c.last_seen_at).getTime() > sevenDaysAgo);
          const inactiveClients = clientArr.filter((c) => {
            if (!c.last_seen_at) return true;
            return (now - new Date(c.last_seen_at).getTime()) > 5 * 86400000;
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

          // Build card data — smart mode (default) or Mistral-enhanced
          let cardData;

          if (MISTRAL_ENABLED) {
            const budgetNow = await isBudgetExceeded();
            if (!budgetNow.exceeded) {
              try {
                const atRiskClients = inactiveClients.slice(0, 5).map((c) => ({
                  ref: anonymizeClient(c),
                  inactiveDays: c.last_seen_at ? Math.floor((now - new Date(c.last_seen_at).getTime()) / 86400000) : 999,
                  planName: "Standard",
                  planPrice: avgPrice,
                }));

                const systemPrompt = `Tu es Sentinel, un agent IA business pour coachs sportifs. Tu generes exactement 3 actions concretes et chiffrees pour la journee du coach. Chaque action doit avoir un impact financier estime en euros. Reponds UNIQUEMENT en JSON valide. Langue: francais.`;
                const userPrompt = `Metriques du coach:
- MRR: ${Math.round(mrr)}EUR/mois, Clients actifs: ${activeClients.length}/${clientArr.length}, Inactifs >5j: ${inactiveClients.length}, Expirant 14j: ${expiringClients.length}, Retention 7j: ${retention7d}%, Score: ${businessScore}/100
Clients a risque: ${atRiskClients.map((c) => `${c.ref}: inactif ${c.inactiveDays}j, ${c.planPrice}EUR/mois`).join("; ") || "Aucun"}
Genere JSON: {title, actions: [{text, impact_eur, cta_action: open_message_compose|schedule_call|block_calendar|open_client_profile}], total_impact_eur}`;

                const result = await callMistral(systemPrompt, userPrompt);
                const cost = estimateCost(result.promptTokens, result.completionTokens);
                totalCost += cost;

                const parsed = JSON.parse(result.content);
                const validation = dailyPlaybookSchema.safeParse(parsed);

                if (validation.success) {
                  cardData = validation.data;
                  await logMistralCall({ coachId: coach.id, module: "daily_playbook", promptTokens: result.promptTokens, completionTokens: result.completionTokens, costUsd: cost, status: "success" });
                } else {
                  await logMistralCall({ coachId: coach.id, module: "daily_playbook", promptTokens: result.promptTokens, completionTokens: result.completionTokens, costUsd: cost, status: "parse_error", errorMessage: "Zod validation failed" });
                }
              } catch (e) {
                await logMistralCall({ coachId: coach.id, module: "daily_playbook", status: e.message?.includes("timeout") ? "timeout" : "mistral_error", errorMessage: e.message });
              }
            }
          }

          // Fallback to smart data-driven card
          if (!cardData) {
            cardData = buildSmartPlaybook({ activeClients, inactiveClients, expiringClients, clientArr, retention7d, mrr, avgPrice, businessScore });
          }

          // Insert card
          const created = await insertCard({
            coachId: coach.id,
            module: "daily_playbook",
            priority: 80,
            title: cardData.title,
            body: cardData.actions.map((a) => `• ${a.text}${a.impact_eur > 0 ? ` (+${a.impact_eur}EUR)` : ""}`).join("\n"),
            data: cardData,
            ctaLabel: "Lancer la premiere action",
            ctaAction: cardData.actions[0]?.cta_action || "open_client_list",
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
    console.error(`[CRON_SENTINEL_DAILY_FAILED] reason="${e.message}"`);
    await captureException(e, { tags: { endpoint: "cron-sentinel-daily", stage: "uncaught" } });
    return res.status(500).json({ error: e.message });
  }
}

/**
 * Cron: sentinel-benchmarks — 02:00 UTC daily
 *
 * Computes anonymized platform-wide benchmarks:
 * - avg_price_per_client (median, p10, p90)
 * - retention_7d
 * - clients_per_coach
 * - mrr_per_coach
 *
 * Rules:
 * - Minimum 10 coaches per bucket to expose data (privacy)
 * - Never stores coach_id in platform_benchmarks
 * - Generates price_intel + ranking cards for eligible coaches
 */

const {
  isAuthorizedCron,
  sb,
  getSentinelCoaches,
  insertCard,
  expireOldCards,
  todayKey,
} = require("../_sentinel-helpers");
const { captureException } = require("../_sentry");

function percentile(arr, p) {
  if (!arr.length) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

export default async function handler(req, res) {
  if (!isAuthorizedCron(req)) return res.status(401).json({ error: "Unauthorized" });

  try {
    await expireOldCards();

    // Get ALL coaches with clients for benchmark computation
    const allCoaches = await sb(
      "/rest/v1/coaches?select=id,founding_coach,subscription_plan",
      { headers: { Prefer: "return=representation" } }
    );
    if (!Array.isArray(allCoaches) || allCoaches.length < 10) {
      return res.status(200).json({ status: "skipped", reason: "not_enough_coaches", count: allCoaches?.length || 0 });
    }

    // Get client counts + plan prices per coach
    const clients = await sb(
      "/rest/v1/clients?select=id,coach_id,last_seen_at,subscription_end_date,subscription_plan_id",
      { headers: { Prefer: "return=representation" } }
    );
    const clientArr = Array.isArray(clients) ? clients : [];

    // Get plans for price data
    const plans = await sb(
      "/rest/v1/coach_plans?select=id,coach_id,price_per_month,is_active&is_active=eq.true",
      { headers: { Prefer: "return=representation" } }
    );
    const planArr = Array.isArray(plans) ? plans : [];
    const planMap = {};
    for (const p of planArr) {
      if (!planMap[p.coach_id]) planMap[p.coach_id] = [];
      planMap[p.coach_id].push(p);
    }

    // Compute per-coach metrics
    const now = Date.now();
    const sevenDaysAgo = now - 7 * 86400000;
    const coachMetrics = {};

    for (const coach of allCoaches) {
      const myClients = clientArr.filter((c) => c.coach_id === coach.id);
      const activeClients = myClients.filter(
        (c) => c.last_seen_at && new Date(c.last_seen_at).getTime() > sevenDaysAgo
      );
      const myPlans = planMap[coach.id] || [];
      const avgPrice = myPlans.length > 0
        ? myPlans.reduce((s, p) => s + (parseFloat(p.price_per_month) || 0), 0) / myPlans.length
        : 0;

      coachMetrics[coach.id] = {
        totalClients: myClients.length,
        activeClients: activeClients.length,
        retention7d: myClients.length > 0 ? Math.round((activeClients.length / myClients.length) * 100) : 0,
        avgPrice,
        mrr: myClients.length * avgPrice,
      };
    }

    const coachIds = Object.keys(coachMetrics);

    // Compute benchmarks (anonymized)
    const metrics = {
      avg_price: coachIds.map((id) => coachMetrics[id].avgPrice).filter((v) => v > 0),
      retention_7d: coachIds.map((id) => coachMetrics[id].retention7d),
      clients_count: coachIds.map((id) => coachMetrics[id].totalClients),
      mrr: coachIds.map((id) => coachMetrics[id].mrr).filter((v) => v > 0),
    };

    const benchmarks = {};
    for (const [key, values] of Object.entries(metrics)) {
      if (values.length < 10) continue; // privacy: min 10 coaches
      benchmarks[key] = {
        p10: Math.round(percentile(values, 10) * 100) / 100,
        p50: Math.round(percentile(values, 50) * 100) / 100,
        p90: Math.round(percentile(values, 90) * 100) / 100,
        median_value: Math.round(percentile(values, 50) * 100) / 100,
        sample_size: values.length,
      };
    }

    // Store benchmarks
    const today = todayKey();
    for (const [metric, data] of Object.entries(benchmarks)) {
      try {
        await sb("/rest/v1/platform_benchmarks", {
          method: "POST",
          headers: { Prefer: "return=minimal,resolution=merge-duplicates" },
          body: JSON.stringify({
            bucket_key: "global",
            metric,
            p10: data.p10,
            p50: data.p50,
            p90: data.p90,
            median_value: data.median_value,
            top10_behavior: null,
            sample_size: data.sample_size,
            computed_at: new Date().toISOString(),
          }),
        });
      } catch (e) {
        console.error(`[sentinel-benchmarks] store ${metric}:`, e.message);
      }
    }

    // Generate price_intel + ranking cards for eligible coaches
    const sentinelCoaches = await getSentinelCoaches();
    let cardsCreated = 0;

    for (const coach of sentinelCoaches) {
      const cm = coachMetrics[coach.id];
      if (!cm) continue;

      try {
        // Price Intelligence card (if gap > 15%)
        const priceMedian = benchmarks.avg_price?.median_value;
        if (priceMedian && cm.avgPrice > 0) {
          const gapPct = Math.round(((cm.avgPrice - priceMedian) / priceMedian) * 100);
          if (Math.abs(gapPct) > 15) {
            const isAbove = gapPct > 0;
            const created = await insertCard({
              coachId: coach.id,
              module: "price_intel",
              priority: 40,
              title: isAbove ? "Tes tarifs sont au-dessus du marche" : "Tu es en dessous du marche",
              body: isAbove
                ? `Ton prix moyen (${Math.round(cm.avgPrice)}EUR) est ${gapPct}% au-dessus de la mediane plateforme (${Math.round(priceMedian)}EUR). C'est bien si ta valeur le justifie — sinon, ajuste.`
                : `Ton prix moyen (${Math.round(cm.avgPrice)}EUR) est ${Math.abs(gapPct)}% en dessous de la mediane plateforme (${Math.round(priceMedian)}EUR). Tu pourrais augmenter tes tarifs.`,
              data: { your_avg: cm.avgPrice, median: priceMedian, gap_pct: gapPct },
              ctaLabel: "Voir mes tarifs",
              ctaAction: "open_plans_settings",
              expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
              dedupeKey: `price_intel_${coach.id}_${today}`,
            });
            if (created) cardsCreated++;
          }
        }

        // Ranking card (monthly)
        const retMedian = benchmarks.retention_7d?.median_value;
        const clientsMedian = benchmarks.clients_count?.median_value;
        if (retMedian !== undefined && clientsMedian !== undefined) {
          const retLabel = cm.retention7d >= (benchmarks.retention_7d?.p90 || 90) ? "Top 10%"
            : cm.retention7d >= retMedian ? "Au-dessus de la mediane"
            : "En dessous de la mediane";

          const created = await insertCard({
            coachId: coach.id,
            module: "ranking",
            priority: 30,
            title: "Ton classement ce mois",
            body: `Retention 7j: ${cm.retention7d}% (mediane: ${Math.round(retMedian)}%). Clients: ${cm.totalClients} (mediane: ${Math.round(clientsMedian)}). ${retLabel}.`,
            data: {
              metrics: [
                { metric_name: "Retention 7j", your_value: cm.retention7d, median: retMedian, rank_label: retLabel },
                { metric_name: "Nombre de clients", your_value: cm.totalClients, median: clientsMedian, rank_label: cm.totalClients >= clientsMedian ? "Au-dessus" : "En dessous" },
              ],
            },
            ctaLabel: null,
            ctaAction: null,
            expiresAt: new Date(Date.now() + 30 * 86400000).toISOString(),
            dedupeKey: `ranking_${coach.id}_${today}`,
          });
          if (created) cardsCreated++;
        }
      } catch (e) {
        console.error(`[sentinel-benchmarks] coach ${coach.id}:`, e.message);
      }
    }

    return res.status(200).json({
      status: "ok",
      benchmarks_computed: Object.keys(benchmarks).length,
      coaches_processed: sentinelCoaches.length,
      cards_created: cardsCreated,
    });
  } catch (e) {
    console.error(`[CRON_SENTINEL_BENCHMARKS_FAILED] reason="${e.message}"`);
    await captureException(e, { tags: { endpoint: "cron-sentinel-benchmarks", stage: "uncaught" } });
    return res.status(500).json({ error: e.message });
  }
}

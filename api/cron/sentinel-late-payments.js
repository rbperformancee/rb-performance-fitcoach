/**
 * Cron: sentinel-late-payments — quotidien 08:00 UTC (10:00 Paris été)
 *
 * Détecte les payment_schedules en retard de 7 jours+ et crée une carte
 * Sentinel récapitulative + envoie un push au coach.
 *
 * Dédupe hebdo : 1 carte par coach par semaine (sinon spam quotidien dès
 * qu'un retard existe). La carte reste affichée 7 jours.
 *
 * Pas de Mistral : 100% factuel basé sur les données. Zero coût AI.
 */

const pLimit = require("p-limit");
const {
  isAuthorizedCron,
  sb,
  getSentinelCoaches,
  insertCard,
  expireOldCards,
  sendCoachPush,
  sendClientPush,
  weekKey,
} = require("../_sentinel-helpers");
const { captureException } = require("../_sentry");

// Template par défaut du message client si le coach n'en a pas saisi.
// Placeholders : {firstName}, {amount}, {days_late}
const DEFAULT_CLIENT_MESSAGE =
  "Bonjour {firstName}, une échéance de {amount}€ est en attente depuis {days_late} jours. Merci de régulariser dès que possible 🙏";

function applyTemplate(tpl, vars) {
  return Object.entries(vars).reduce(
    (s, [k, v]) => s.replaceAll(`{${k}}`, String(v)),
    tpl
  );
}

const LATE_THRESHOLD_DAYS = 7;
const limit = pLimit(5);

async function processCoach(coach) {
  // Date limite : today - 7 days
  const cutoff = new Date(Date.now() - LATE_THRESHOLD_DAYS * 86400000)
    .toISOString()
    .slice(0, 10);

  // Échéances en retard de 7j+ : pending et due_date < cutoff
  // (le status 'late' n'est jamais mis en DB explicitement, on filtre par date)
  const lateSchedules = await sb(
    `/rest/v1/payment_schedules?coach_id=eq.${coach.id}&status=eq.pending&due_date=lt.${cutoff}&select=id,client_id,due_date,expected_amount,sequence_num,total_sequence`
  );

  if (!Array.isArray(lateSchedules) || lateSchedules.length === 0) {
    return { coachId: coach.id, status: "no_late_payments" };
  }

  // Récupère les noms clients en un appel
  const clientIds = [...new Set(lateSchedules.map((s) => s.client_id))];
  const clients = await sb(
    `/rest/v1/clients?id=in.(${clientIds.join(",")})&select=id,full_name`
  );
  const nameById = new Map((clients || []).map((c) => [c.id, c.full_name || "Client"]));

  const today = Date.now();
  const totalAmount = lateSchedules.reduce(
    (s, x) => s + Number(x.expected_amount || 0),
    0
  );

  // Top 3 retards par montant pour le body (le reste est dans data)
  const enriched = lateSchedules
    .map((s) => ({
      ...s,
      client_name: nameById.get(s.client_id) || "Client",
      days_late: Math.floor((today - new Date(s.due_date).getTime()) / 86400000),
    }))
    .sort((a, b) => Number(b.expected_amount) - Number(a.expected_amount));

  const top = enriched.slice(0, 3);
  const bodyLines = top.map(
    (s) =>
      `• ${s.client_name} — ${Number(s.expected_amount).toFixed(0)} € (retard ${s.days_late}j)`
  );
  if (enriched.length > 3) {
    bodyLines.push(`+ ${enriched.length - 3} autre${enriched.length - 3 > 1 ? "s" : ""}`);
  }
  const body = `${enriched.length} échéance${enriched.length > 1 ? "s" : ""} en retard pour un total de ${Math.round(totalAmount)} €.\n\n${bodyLines.join("\n")}`;

  const title =
    enriched.length === 1
      ? `Échéance en retard — ${Math.round(totalAmount)} €`
      : `${enriched.length} échéances en retard — ${Math.round(totalAmount)} €`;

  const wkey = weekKey();
  const expiresAt = new Date(Date.now() + 7 * 86400000).toISOString();

  const created = await insertCard({
    coachId: coach.id,
    module: "late_payments",
    priority: 75, // élevé : c'est de l'argent qui dort
    title,
    body,
    data: {
      total_amount: Math.round(totalAmount),
      count: enriched.length,
      items: enriched.slice(0, 10).map((s) => ({
        client_id: s.client_id,
        client_name: s.client_name,
        amount: Number(s.expected_amount),
        days_late: s.days_late,
        sequence_num: s.sequence_num,
        total_sequence: s.total_sequence,
      })),
    },
    ctaLabel: "Voir Comptes à recevoir",
    ctaAction: "open_business_outstanding",
    expiresAt,
    dedupeKey: `late_payments_${coach.id}_${wkey}`,
  });

  // Push : best-effort si une nouvelle carte a été créée (dedupe = pas de spam)
  if (created) {
    const topItem = top[0];
    await sendCoachPush(coach.id, {
      title: "💸 Échéance en retard",
      body:
        enriched.length === 1
          ? `${topItem.client_name} — ${Math.round(Number(topItem.expected_amount))} € (retard ${topItem.days_late}j) — relance`
          : `${enriched.length} échéances en retard pour ${Math.round(totalAmount)} € au total`,
      url: "/dashboard?tab=business",
    });

    // ===== Push CLIENT optionnel (opt-in coach) =====
    // Le coach a explicitement activé la notif client. On envoie 1 push par
    // client en retard avec le template personnalisé (ou défaut). Best-effort
    // par client : un échec ne bloque pas les autres.
    if (coach.notify_client_on_late_payment === true) {
      const template = coach.late_payment_client_message || DEFAULT_CLIENT_MESSAGE;
      // 1 push par client en retard (pas par échéance — pour éviter le spam
      // si un client a plusieurs échéances en retard, on consolide)
      const byClientId = new Map();
      for (const s of enriched) {
        const cur = byClientId.get(s.client_id) || {
          client_name: s.client_name,
          amount: 0,
          max_days: 0,
        };
        cur.amount += Number(s.expected_amount);
        cur.max_days = Math.max(cur.max_days, s.days_late);
        byClientId.set(s.client_id, cur);
      }
      for (const [clientId, info] of byClientId.entries()) {
        const firstName = info.client_name.split(" ")[0] || "Bonjour";
        const body = applyTemplate(template, {
          firstName,
          amount: Math.round(info.amount),
          days_late: info.max_days,
        });
        await sendClientPush(clientId, {
          title: coach.brand_name || coach.full_name || "Rappel paiement",
          body,
          url: "/",
        });
      }
    }
  }

  return {
    coachId: coach.id,
    status: created ? "card_created" : "duplicate_dedupe",
    count: enriched.length,
    total: Math.round(totalAmount),
  };
}

module.exports = async (req, res) => {
  if (!isAuthorizedCron(req)) return res.status(401).json({ error: "Unauthorized" });

  try {
    await expireOldCards();
    const coaches = await getSentinelCoaches();
    if (!coaches.length) {
      return res.status(200).json({ status: "ok", processed: 0 });
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

    return res.status(200).json({
      status: "ok",
      processed: coaches.length,
      summary,
      cards_created: summary.card_created || 0,
    });
  } catch (e) {
    captureException(e, { tag: "sentinel-late-payments" });
    return res.status(500).json({ error: e.message });
  }
};

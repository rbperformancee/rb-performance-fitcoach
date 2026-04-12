/**
 * Systeme de relance client intelligent — RB Perform
 *
 * Envoie des push notifications aux clients selon leur situation :
 * - Inactif 3j+ → push de relance douce
 * - Inactif 7j+ → push de relance forte
 * - Abonnement expire dans 14j → push de rappel
 * - Abonnement expire → push d'urgence
 *
 * Rate limit : 1 notification par TYPE par CLIENT par JOUR (via localStorage)
 * Se declenche quand le coach ouvre le dashboard (pas un cron)
 */

import { useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabase";

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const API_KEY = "sb_publishable_WbG1gs6l7XP6aHH_UqR0Hw_XLSI50ud";

const TEMPLATES = {
  inactivity_soft: (name, days) => ({
    title: "RB PERFORM",
    body: `${name}, ca fait ${days} jours. Ton programme t'attend, reviens en force.`,
  }),
  inactivity_hard: (name, days) => ({
    title: "RB PERFORM",
    body: `${name}, ${days} jours sans seance. Le moment de reprendre c'est maintenant.`,
  }),
  sub_expiring: (name, days) => ({
    title: "RB PERFORM",
    body: `${name}, ton abonnement expire dans ${days} jours. Renouvelle pour continuer ta progression.`,
  }),
  sub_expired: (name) => ({
    title: "RB PERFORM",
    body: `${name}, ton abonnement a expire. Reviens pour ne pas perdre ta progression.`,
  }),
};

async function sendPush(clientId, title, body) {
  try {
    await fetch(`${SUPABASE_URL}/functions/v1/send-push`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: API_KEY },
      body: JSON.stringify({ client_id: clientId, title, body }),
    });
    return true;
  } catch {
    return false;
  }
}

function canSend(clientId, type) {
  const key = `relance_${type}_${clientId}`;
  const last = localStorage.getItem(key);
  const today = new Date().toISOString().split("T")[0];
  if (last === today) return false;
  localStorage.setItem(key, today);
  return true;
}

export function useClientRelance(clients, isCoach) {
  const [sent, setSent] = useState([]);

  useEffect(() => {
    if (!isCoach || !clients?.length) return;

    const run = async () => {
      const results = [];

      for (const c of clients) {
        const name = c.full_name?.split(" ")[0] || "Champion";
        const hasProg = c.programmes?.some(p => p.is_active);
        const days = c._inactiveDays;

        // Inactivite 7j+ avec programme → relance forte
        if (hasProg && days >= 7 && canSend(c.id, "inactivity_hard")) {
          const t = TEMPLATES.inactivity_hard(name, days);
          const ok = await sendPush(c.id, t.title, t.body);
          if (ok) results.push({ client: c, type: "inactivity_hard", message: t.body });
        }
        // Inactivite 3-6j avec programme → relance douce
        else if (hasProg && days >= 3 && days < 7 && canSend(c.id, "inactivity_soft")) {
          const t = TEMPLATES.inactivity_soft(name, days);
          const ok = await sendPush(c.id, t.title, t.body);
          if (ok) results.push({ client: c, type: "inactivity_soft", message: t.body });
        }

        // Abonnement expirant dans 14j
        if (c.subscription_end_date) {
          const daysLeft = Math.ceil((new Date(c.subscription_end_date) - Date.now()) / 86400000);
          if (daysLeft > 0 && daysLeft <= 14 && canSend(c.id, "sub_expiring")) {
            const t = TEMPLATES.sub_expiring(name, daysLeft);
            const ok = await sendPush(c.id, t.title, t.body);
            if (ok) results.push({ client: c, type: "sub_expiring", message: t.body });
          }
          // Abonnement expire
          if (daysLeft <= 0 && canSend(c.id, "sub_expired")) {
            const t = TEMPLATES.sub_expired(name);
            const ok = await sendPush(c.id, t.title, t.body);
            if (ok) results.push({ client: c, type: "sub_expired", message: t.body });
          }
        }
      }

      if (results.length > 0) setSent(results);
    };

    run();
  }, [clients, isCoach]);

  // Relance manuelle : le coach peut envoyer un push a un client specifique
  const sendManualPush = useCallback(async (clientId, message) => {
    const ok = await sendPush(clientId, "RB PERFORM", message);
    return ok;
  }, []);

  return { sent, sendManualPush };
}

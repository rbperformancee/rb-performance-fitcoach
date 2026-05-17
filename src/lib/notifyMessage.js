// notifyMessage.js — push notif à chaque nouveau message de la messagerie.
//
// Appelé en fire-and-forget APRÈS l'insert réussi dans la table `messages`,
// par ChatCoach (coach ↔ client) et ClientMessages (client → coach).
//
// Pattern aligné sur notifyCoach.js : on call l'Edge function send-push
// depuis le navigateur avec l'anon key. send-push cible les bonnes
// push_subscriptions (client_id OU coach_id). Si le destinataire n'a pas
// activé les notifications, 0 row → no-op silencieux.

import { supabase } from "./supabase";

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const ANON = process.env.REACT_APP_SUPABASE_ANON_KEY;

function preview(s) {
  const txt = String(s || "").replace(/\s+/g, " ").trim();
  return txt.length > 120 ? txt.slice(0, 117) + "…" : txt;
}

async function sendPush(target, title, body) {
  if (!SUPABASE_URL || !ANON) return;
  try {
    await fetch(`${SUPABASE_URL}/functions/v1/send-push`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: ANON },
      body: JSON.stringify({ ...target, title, body, url: "/app.html" }),
    });
  } catch { /* best-effort — un échec push ne doit jamais gêner l'envoi */ }
}

/**
 * Notifie le destinataire d'un nouveau message.
 *
 * @param {object}  opts
 * @param {string}  opts.clientId   - id du client de la conversation
 * @param {boolean} opts.fromCoach  - true = message du coach (→ notifie le client),
 *                                    false = message du client (→ notifie le coach)
 * @param {string}  [opts.senderName] - nom de l'expéditeur (pour le titre)
 * @param {string}  opts.content    - texte du message
 */
export async function notifyNewMessage({ clientId, fromCoach, senderName, content }) {
  if (!clientId) return;
  try {
    if (fromCoach) {
      // Message du coach → notifier le client/athlète
      await sendPush(
        { client_id: clientId },
        senderName ? `Message de ${senderName}` : "Nouveau message de ton coach",
        preview(content),
      );
    } else {
      // Message du client → notifier le coach (lookup coach_id + nom client)
      const { data } = await supabase
        .from("clients")
        .select("coach_id, full_name")
        .eq("id", clientId)
        .maybeSingle();
      if (!data?.coach_id) return;
      const name = senderName || data.full_name;
      await sendPush(
        { coach_id: data.coach_id },
        name ? `Message de ${name}` : "Nouveau message",
        preview(content),
      );
    }
  } catch { /* silent */ }
}

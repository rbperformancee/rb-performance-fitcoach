// notifyCoach.js — push notif au coach pour les signaux client critiques.
//
// Pattern fire-and-forget : on call l'Edge function send-push depuis le
// client, sans await bloquant. Si le coach n'a pas activé les push, le
// filtre côté push_subscriptions renvoie 0 row et send-push no-op.
//
// Trois events :
//   - sessionFeedbackBad  : séance terminée avec mood='bad'/'tough' OU injury
//   - weeklyCheckinNote   : bilan hebdo soumis avec note libre du client
//
// Cf. useLogs.notifyCoachPR pour le pattern original (PR battu).

import { supabase } from "./supabase";

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const ANON = process.env.REACT_APP_SUPABASE_ANON_KEY;

async function sendCoachPush({ coachId, title, body, url = "/login" }) {
  if (!coachId || !SUPABASE_URL || !ANON) return;
  try {
    await fetch(`${SUPABASE_URL}/functions/v1/send-push`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: ANON },
      body: JSON.stringify({ coach_id: coachId, title, body, url }),
    });
  } catch { /* best-effort */ }
}

async function getCoachAndClientName(clientId) {
  const { data } = await supabase
    .from("clients")
    .select("coach_id, full_name")
    .eq("id", clientId)
    .maybeSingle();
  if (!data?.coach_id) return null;
  return { coachId: data.coach_id, clientName: data.full_name || "Client" };
}

/**
 * Push au coach quand son client termine une séance avec mood dégradé
 * (tough/bad) OU une blessure signalée.
 */
export async function notifyCoachSessionFeedback(clientId, { mood, injury }) {
  const isBadMood = mood === "tough" || mood === "bad";
  if (!isBadMood && !injury) return;

  try {
    const ctx = await getCoachAndClientName(clientId);
    if (!ctx) return;

    const moodLabels = { tough: "séance dure", bad: "catastrophe" };
    const reasons = [];
    if (isBadMood) reasons.push(moodLabels[mood] || mood);
    if (injury) reasons.push(`douleur ${injury}`);

    await sendCoachPush({
      coachId: ctx.coachId,
      title: `${ctx.clientName} · signal séance`,
      body: reasons.join(" · "),
    });
  } catch { /* silent */ }
}

/**
 * Push au coach quand son client soumet un bilan hebdo avec une note libre
 * (= le client a quelque chose à dire — vaut un coup d'œil).
 */
export async function notifyCoachWeeklyCheckin(clientId, { hasNote }) {
  if (!hasNote) return;

  try {
    const ctx = await getCoachAndClientName(clientId);
    if (!ctx) return;
    await sendCoachPush({
      coachId: ctx.coachId,
      title: `${ctx.clientName} · bilan hebdo`,
      body: "Note libre du client — à lire",
    });
  } catch { /* silent */ }
}

/**
 * sentinelAI.js — Schemas Zod + helpers pour valider les outputs Mistral.
 *
 * Utilise UNIQUEMENT cote serveur (crons Vercel).
 * Exporte aussi les schemas pour les tests unitaires.
 *
 * Regles critiques :
 * - Output JSON strict via response_format: { type: "json_object" }
 * - Validation Zod avant ecriture en DB
 * - Zero PII dans les prompts (initiales + id anonymise + chiffres)
 * - Sanitize inputs texte pour eviter prompt injection
 * - Budget cap journalier via MISTRAL_DAILY_BUDGET_USD
 */

import { z } from "zod";

// ===== ZOD SCHEMAS =====

export const dailyPlaybookSchema = z.object({
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

export const revenueUnblockerSchema = z.object({
  title: z.string().max(80),
  clients: z
    .array(
      z.object({
        client_ref: z.string().max(20), // initiales + id court, pas de PII
        reason: z.string().max(200),
        suggested_plan: z.string().max(60),
        potential_eur: z.number().int().min(0).max(100000),
        cta_action: z.enum([
          "open_client_profile",
          "open_message_compose",
          "schedule_call",
        ]),
        cta_payload: z.record(z.any()).optional(),
      })
    )
    .min(1)
    .max(5),
  total_potential_eur: z.number().int(),
});

export const priceIntelSchema = z.object({
  title: z.string().max(80),
  insight: z.string().max(300),
  your_avg_price: z.number().min(0),
  platform_median: z.number().min(0),
  gap_pct: z.number(),
  recommendation: z.string().max(200),
});

export const rankingSchema = z.object({
  title: z.string().max(80),
  metrics: z
    .array(
      z.object({
        metric_name: z.string().max(60),
        your_value: z.number(),
        median: z.number(),
        rank_label: z.string().max(40), // "Top 20%", "Dans la moyenne", etc
      })
    )
    .min(1)
    .max(5),
  summary: z.string().max(200),
});

// Map module → schema
export const SCHEMAS = {
  daily_playbook: dailyPlaybookSchema,
  revenue_unblocker: revenueUnblockerSchema,
  price_intel: priceIntelSchema,
  ranking: rankingSchema,
};

// ===== PROMPT SANITIZER =====
// Strip markers qui pourraient etre utilises pour du prompt injection
const INJECTION_PATTERNS = [
  /#{2,}/g, // ## ou ###
  /<\/?prompt>/gi,
  /<\/?system>/gi,
  /<\/?user>/gi,
  /<\/?assistant>/gi,
  /\[INST\]/gi,
  /\[\/INST\]/gi,
  /<<SYS>>/gi,
  /<<\/SYS>>/gi,
];

export function sanitizeInput(text) {
  if (!text || typeof text !== "string") return "";
  let clean = text.slice(0, 500); // cap length
  for (const pattern of INJECTION_PATTERNS) {
    clean = clean.replace(pattern, "");
  }
  return clean.trim();
}

// ===== ANONYMIZE CLIENT DATA =====
// Genere un ref anonymise a partir du nom + id
export function anonymizeClient(client) {
  const initials =
    (client.full_name || "??")
      .split(" ")
      .map((s) => (s[0] || "").toUpperCase())
      .join("")
      .slice(0, 2) || "XX";
  const shortId = (client.id || "").slice(0, 4);
  return `${initials}-${shortId}`;
}

// ===== MISTRAL COST ESTIMATION =====
// Prix Mistral Large (mai 2025) : ~$2/M input, ~$6/M output
const COST_PER_1K_INPUT = 0.002;
const COST_PER_1K_OUTPUT = 0.006;

export function estimateCost(promptTokens, completionTokens) {
  return (
    (promptTokens / 1000) * COST_PER_1K_INPUT +
    (completionTokens / 1000) * COST_PER_1K_OUTPUT
  );
}

// ===== PROMPTS =====

export function buildDailyPlaybookPrompt(coachStats) {
  return {
    system: `Tu es Sentinel, un agent IA business pour coachs sportifs. Tu generes exactement 3 actions concretes et chiffrees pour la journee du coach. Chaque action doit avoir un impact financier estime en euros. Reponds UNIQUEMENT en JSON valide. Langue: francais.`,
    user: `Voici les metriques du coach aujourd'hui:
- MRR: ${coachStats.mrr}EUR/mois
- Clients actifs: ${coachStats.activeClients}/${coachStats.totalClients}
- Clients inactifs >5j: ${coachStats.inactiveClients}
- Abonnements expirant dans 14j: ${coachStats.expiringCount}
- Retention 7j: ${coachStats.retention7d}%
- Score business: ${coachStats.businessScore}/100

Clients a risque (anonymises):
${coachStats.atRiskClients
  .slice(0, 5)
  .map(
    (c) =>
      `- ${c.ref}: inactif ${c.inactiveDays}j, plan ${sanitizeInput(c.planName)} a ${c.planPrice}EUR/mois`
  )
  .join("\n")}

Genere un JSON avec: title (max 80 chars), actions (array de 1-3 objets avec text, impact_eur, cta_action parmi [open_message_compose, schedule_call, block_calendar, open_client_profile], cta_payload optionnel), total_impact_eur (somme des impacts).`,
  };
}

export function buildRevenueUnblockerPrompt(coachStats) {
  return {
    system: `Tu es Sentinel, un agent IA business pour coachs sportifs. Tu identifies les clients qui pourraient upgrader leur abonnement ou renouveler. Reponds UNIQUEMENT en JSON valide. Langue: francais.`,
    user: `Voici les metriques du coach:
- Plans disponibles: ${coachStats.plans.map((p) => `${sanitizeInput(p.name)} a ${p.price}EUR/mois`).join(", ")}
- MRR actuel: ${coachStats.mrr}EUR/mois

Clients avec potentiel d'upgrade (anonymises):
${coachStats.upgradeCandidates
  .slice(0, 5)
  .map(
    (c) =>
      `- ${c.ref}: plan actuel ${sanitizeInput(c.currentPlan)} a ${c.currentPrice}EUR/mois, actif depuis ${c.monthsActive} mois, engagement ${c.engagementScore}/100`
  )
  .join("\n")}

Genere un JSON avec: title (max 80 chars), clients (array 1-5 avec client_ref, reason max 200 chars, suggested_plan, potential_eur, cta_action parmi [open_client_profile, open_message_compose, schedule_call], cta_payload optionnel), total_potential_eur.`,
  };
}

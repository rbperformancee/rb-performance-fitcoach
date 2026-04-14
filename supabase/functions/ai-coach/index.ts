// supabase/functions/ai-coach/index.ts
//
// Edge Function Mistral pour l'Assistant IA Coach RB Perform.
//
// PRINCIPES LEGAUX (non negociables):
//   1. L'IA SUGGERE, le coach DECIDE. Toutes les reponses sont
//      destinees au coach, pas au client. Le frontend affiche le
//      bandeau "A valider par toi avant toute action".
//   2. Un programme genere par l'IA ne peut pas etre assigne
//      directement — il passe par le Programme Builder (gate UX).
//   3. Aucune recommandation medicale/nutritionnelle de sante.
//      Filtre de mots-cles qui bypasse l'appel Mistral si declenche.
//
// Body JSON:
//   { type: 'analyze_client' | 'chat' | 'generate_programme',
//     payload: {...} }
//
// Auth: JWT Supabase obligatoire (header Authorization: Bearer <jwt>).
//
// Rate limits par plan coach:
//   starter: 10 appels/mois
//   pro:     100 appels/mois
//   elite:   illimite

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const MISTRAL_API_KEY = Deno.env.get('MISTRAL_API_KEY') ?? ''
const MISTRAL_MODEL = Deno.env.get('MISTRAL_MODEL') ?? 'mistral-large-latest'

// ===== FILTRE MEDICAL =====
// Si ces mots apparaissent dans le payload, on court-circuite Mistral
// et on repond avec une redirection vers un professionnel de sante.
const MEDICAL_KEYWORDS = [
  'blessure', 'douleur', 'mal au dos', 'tendinite', 'entorse', 'fracture',
  'medicament', 'medicaments', 'ordonnance', 'diagnostic',
  'maladie', 'pathologie', 'chirurgie', 'operation', 'operee', 'opere',
  'kine', 'kinesitherapeute', 'medecin', 'cardiologue', 'orthopediste',
  'diabete', 'hypertension', 'cancer', 'depression', 'anxiete',
  'troubles alimentaires', 'anorexie', 'boulimie',
  'grossesse', 'enceinte', 'allaitement',
]
const MEDICAL_RESPONSE =
  "Pour ce sujet (sante, blessure, pathologie, medicaments, grossesse, " +
  "ou troubles alimentaires), je recommande a ton client de consulter " +
  "un professionnel de sante (medecin, kinesitherapeute, nutritionniste " +
  "diplome, psychologue). Mon role est d'aider a l'entrainement general, " +
  "pas de donner des avis medicaux."

// ===== LIMITES PAR PLAN =====
const PLAN_LIMITS: Record<string, number> = {
  free: 3,
  starter: 10,
  pro: 100,
  elite: Infinity,
}

// ===== SYSTEM PROMPTS =====
const SYSTEM_ANALYZE = `Tu es un assistant pour coachs sportifs professionnels. Ton role est d'aider le coach a mieux accompagner ses clients.
Tu fournis des observations et suggestions basees sur les donnees — jamais des prescriptions medicales ou nutritionnelles de sante.
Si le contexte mentionne une blessure, une douleur, une maladie, une grossesse ou un medicament, tu recommandes de consulter un professionnel de sante.
Tes suggestions sont destinees au coach, pas au client. Reponds en francais. Sois concret, bienveillant, max 3 paragraphes + 3 actions actionnables sous forme de liste.
Format de sortie OBLIGATOIRE (JSON strict):
{
  "summary": "2-3 paragraphes d'observations",
  "actions": [
    {"label": "action 1", "type": "message|programme|other"},
    {"label": "action 2", "type": "..."},
    {"label": "action 3", "type": "..."}
  ]
}`

const SYSTEM_CHAT = `Tu es l'Assistant RB Perform. Tu aides le coach a gerer son business coaching: retention, churn, programmes, messages.
Tu peux analyser les donnees de tous les clients du coach qu'il te partage en contexte. Tu ne parles pas au client directement.
Aucune recommandation medicale ou de sante. En cas de doute: "recommande a ton client de consulter un professionnel de sante".
Sois concis, actionnable, max 4 paragraphes. Ecris en francais.`

const SYSTEM_PROGRAMME = `Tu es un generateur de programmes sportifs pour coachs professionnels.
Produis un programme structure en JSON strict selon ce schema:
{
  "name": "nom du programme",
  "objectif": "Prise de masse | Seche | Force | Remise en forme | Performance",
  "niveau": "Debutant | Intermediaire | Avance",
  "duree_semaines": 4|6|8|12,
  "frequence_hebdo": 3|4|5,
  "weeks": [
    {
      "numero": 1,
      "sessions": [
        {
          "nom": "Push" | "Pull" | "Legs" | "Full Body" | ...,
          "exercises": [
            {"nom": "...", "series": 4, "reps": "8-12", "tempo": "30X0", "rir": 2, "rest_sec": 90, "note": "optionnel"}
          ]
        }
      ]
    }
  ]
}
Contraintes:
- Jamais de charge (kg) prescrite — le coach l'ajustera par client.
- Jamais de recommandations medicales/nutritionnelles.
- Noms d'exercices en francais, communs (developpe couche, squat, rowing, etc.).
- Respecter le niveau: Debutant = exercices polyarticulaires simples, pas de specialisation extreme.
Reponds UNIQUEMENT le JSON, sans texte avant/apres.`

function containsMedical(text: string): boolean {
  const t = text.toLowerCase()
  return MEDICAL_KEYWORDS.some((kw) => t.includes(kw))
}

async function supabase(path: string, init?: RequestInit) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    ...init,
    headers: {
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...(init?.headers || {}),
    },
  })
  return res
}

async function verifyJwt(token: string): Promise<string | null> {
  // Verifie le JWT via l'endpoint auth.getUser de Supabase.
  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: {
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${token}`,
    },
  })
  if (!res.ok) return null
  const user = await res.json()
  return user?.id || null
}

async function getCoachUsage(coachId: string): Promise<{ plan: string; used: number; limit: number }> {
  const r = await supabase(`/coaches?id=eq.${coachId}&select=subscription_plan,ai_calls_month,ai_reset_date`)
  const rows = await r.json()
  const row = rows?.[0] || {}
  const plan = row.subscription_plan || 'free'
  const limit = PLAN_LIMITS[plan] ?? 3

  // Reset mensuel si on a change de mois
  const now = new Date()
  const currentMonth = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-01`
  let used = row.ai_calls_month || 0
  if (row.ai_reset_date !== currentMonth) {
    await supabase(`/coaches?id=eq.${coachId}`, {
      method: 'PATCH',
      body: JSON.stringify({ ai_calls_month: 0, ai_reset_date: currentMonth }),
      headers: { Prefer: 'return=minimal' },
    })
    used = 0
  }
  return { plan, used, limit }
}

async function incrementUsage(coachId: string, used: number) {
  await supabase(`/coaches?id=eq.${coachId}`, {
    method: 'PATCH',
    body: JSON.stringify({ ai_calls_month: used + 1 }),
    headers: { Prefer: 'return=minimal' },
  })
}

async function logCall(coachId: string, type: string, inputTokens: number, outputTokens: number, clientId: string | null, blocked = false) {
  await supabase(`/ai_coach_logs`, {
    method: 'POST',
    body: JSON.stringify({
      coach_id: coachId,
      type,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      client_id: clientId,
      blocked_by_filter: blocked,
    }),
    headers: { Prefer: 'return=minimal' },
  })
}

async function callMistral(system: string, user: string, opts: { temperature?: number; max_tokens?: number; json?: boolean } = {}) {
  if (!MISTRAL_API_KEY) throw new Error('MISTRAL_API_KEY missing')
  const body: any = {
    model: MISTRAL_MODEL,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    temperature: opts.temperature ?? 0.5,
    max_tokens: opts.max_tokens ?? 800,
  }
  if (opts.json) body.response_format = { type: 'json_object' }

  const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${MISTRAL_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Mistral ${res.status}: ${err.slice(0, 200)}`)
  }
  const json = await res.json()
  return {
    content: json.choices?.[0]?.message?.content || '',
    inputTokens: json.usage?.prompt_tokens || 0,
    outputTokens: json.usage?.completion_tokens || 0,
  }
}

// ===== HANDLERS =====

async function handleAnalyzeClient(coachId: string, payload: any) {
  const contextStr = JSON.stringify(payload).slice(0, 8000)
  if (containsMedical(contextStr)) {
    await logCall(coachId, 'analyze_client', 0, 0, payload.client_id || null, true)
    return { summary: MEDICAL_RESPONSE, actions: [] }
  }

  const userPrompt = `Voici les donnees d'un client. Analyse-les et propose 3 actions concretes au coach.\n\nContexte:\n${contextStr}`
  const out = await callMistral(SYSTEM_ANALYZE, userPrompt, { temperature: 0.5, max_tokens: 800, json: true })
  await logCall(coachId, 'analyze_client', out.inputTokens, out.outputTokens, payload.client_id || null, false)

  try { return JSON.parse(out.content) }
  catch { return { summary: out.content, actions: [] } }
}

async function handleChat(coachId: string, payload: any) {
  const userMessage = String(payload.message || '').slice(0, 2000)
  if (containsMedical(userMessage)) {
    await logCall(coachId, 'chat', 0, 0, null, true)
    return { reply: MEDICAL_RESPONSE }
  }

  const context = payload.context ? JSON.stringify(payload.context).slice(0, 6000) : ''
  const userPrompt = context ? `${userMessage}\n\nContexte (mes clients):\n${context}` : userMessage

  const out = await callMistral(SYSTEM_CHAT, userPrompt, { temperature: 0.6, max_tokens: 600 })
  await logCall(coachId, 'chat', out.inputTokens, out.outputTokens, null, false)
  return { reply: out.content }
}

async function handleGenerateProgramme(coachId: string, payload: any) {
  // Pas de filtre medical ici — le payload est une config (objectif/niveau/frequence)
  // qui n'a aucune raison de contenir des mots medicaux. Mais on filtre quand meme
  // les notes libres au cas ou.
  if (payload.notes && containsMedical(String(payload.notes))) {
    await logCall(coachId, 'generate_programme', 0, 0, null, true)
    return { error: MEDICAL_RESPONSE }
  }

  const userPrompt = `Genere un programme selon cette config:
- Objectif: ${payload.objectif || 'Remise en forme'}
- Niveau: ${payload.niveau || 'Intermediaire'}
- Duree: ${payload.duree_semaines || 8} semaines
- Frequence: ${payload.frequence_hebdo || 3} seances/semaine
- Materiel: ${payload.materiel || 'Salle complete'}
- Notes: ${payload.notes || 'aucune'}

IMPORTANT: reponds UNIQUEMENT le JSON strict selon le schema impose. Pas de charge (kg).`

  const out = await callMistral(SYSTEM_PROGRAMME, userPrompt, { temperature: 0.8, max_tokens: 2000, json: true })
  await logCall(coachId, 'generate_programme', out.inputTokens, out.outputTokens, null, false)

  try { return { programme: JSON.parse(out.content) } }
  catch (e) { return { error: 'Parse error', raw: out.content.slice(0, 500) } }
}

// ===== SERVE =====
serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  if (req.method !== 'POST') return json({ success: false, error: 'Method not allowed' }, 405, corsHeaders)

  try {
    // Auth
    const authHeader = req.headers.get('Authorization') || ''
    const token = authHeader.replace(/^Bearer\s+/i, '')
    if (!token) return json({ success: false, error: 'Missing JWT' }, 401, corsHeaders)
    const coachId = await verifyJwt(token)
    if (!coachId) return json({ success: false, error: 'Invalid JWT' }, 401, corsHeaders)

    // Rate limit
    const usage = await getCoachUsage(coachId)
    if (usage.used >= usage.limit) {
      return json({
        success: false,
        error: `Limite atteinte. Tu as utilise tes ${usage.used} analyses IA ce mois. Plan actuel: ${usage.plan}.`,
        code: 'RATE_LIMIT',
        usage,
      }, 429, corsHeaders)
    }

    const body = await req.json()
    const { type, payload } = body || {}
    if (!type || !payload) return json({ success: false, error: 'Missing type or payload' }, 400, corsHeaders)

    let data: any
    switch (type) {
      case 'analyze_client':
        data = await handleAnalyzeClient(coachId, payload)
        break
      case 'chat':
        data = await handleChat(coachId, payload)
        break
      case 'generate_programme':
        data = await handleGenerateProgramme(coachId, payload)
        break
      default:
        return json({ success: false, error: 'Unknown type' }, 400, corsHeaders)
    }

    await incrementUsage(coachId, usage.used)
    return json({ success: true, data, usage: { ...usage, used: usage.used + 1 } }, 200, corsHeaders)
  } catch (e) {
    console.error('[ai-coach] error', e)
    return json({ success: false, error: String(e?.message || e) }, 500, corsHeaders)
  }
})

function json(payload: any, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  })
}

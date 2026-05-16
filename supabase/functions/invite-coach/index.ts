// supabase/functions/invite-coach/index.ts
//
// Crée un compte coach SANS passer par Stripe.
// Cas d'usage : comps, partenaires, Pioneer #1 (Kévin).
//
// ===================== SÉCURITÉ — NE PAS RELÂCHER =====================
// Le 15/05 la création de coach a été verrouillée au webhook Stripe
// uniquement (api/webhook-stripe.js), pour fermer le vecteur "compte
// coach gratuit forgé". Cette function est le SEUL autre chemin autorisé,
// et il est gardé par DEUX contrôles :
//   1. JWT Supabase valide (verify_jwt natif + revérif via /auth/v1/user)
//   2. L'email du caller DOIT être présent dans la table `super_admins`
// Sans le contrôle (2), n'importe quel coach/client connecté pourrait
// se créer des comptes coach gratuits → on rouvrirait exactement le
// vecteur fermé le 15/05. Ne jamais retirer la vérif super_admins.
// ======================================================================
//
// send-invite n'est PAS réutilisable ici : elle invite des CLIENTS
// (row `invitations`, lien /join), pas des coachs.
//
// Flow :
//   1. Vérifie le JWT du caller + qu'il est super admin
//   2. Valide le body (email, subscription_plan, locked_price?,
//      founding_coach, coach_notes?)
//   3. Refuse si un coach existe déjà pour cet email
//   4. Crée (ou récupère) le user dans Supabase Auth
//   5. Crée la row `coaches` (subscription_plan / locked_price /
//      founding_coach / coach_notes, is_active=true)
//   6. Génère un lien de récupération (= définition du mot de passe)
//   7. Envoie l'email de connexion via Zoho SMTP
//
// Env vars (Supabase Edge Function secrets) :
//   SUPABASE_URL                (auto)
//   SUPABASE_SERVICE_ROLE_KEY   (auto)
//   ZOHO_SMTP_USER  default rayan@rbperform.app
//   ZOHO_SMTP_PASS  Zoho app password (REQUIS)
//   APP_BASE_URL    default https://rbperform.app
//   EMAIL_FROM      default `RB Perform <${ZOHO_SMTP_USER}>`
//
// Body JSON :
//   { email, subscription_plan, locked_price?, founding_coach?, coach_notes? }
//
// Réponse :
//   { success: true, coach_id, email }
//   { success: false, error: "..." }

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? ""
const SUPABASE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
const SMTP_USER = Deno.env.get("ZOHO_SMTP_USER") ?? "rayan@rbperform.app"
const SMTP_PASS = Deno.env.get("ZOHO_SMTP_PASS") ?? ""
const EMAIL_FROM = Deno.env.get("EMAIL_FROM") ?? `RB Perform <${SMTP_USER}>`
const APP_BASE_URL = Deno.env.get("APP_BASE_URL") ?? "https://rbperform.app"

// Plans autorisés à la création manuelle. 'free' volontairement exclu :
// un coach créé hors Stripe est un comp/partenaire, il a un plan réel.
const VALID_PLANS = ["founding", "pro", "elite"]

// EdgeRuntime est un global injecté par le runtime Supabase Edge.
declare const EdgeRuntime: { waitUntil(p: Promise<unknown>): void }

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), { status, headers: corsHeaders })
}

// Requête PostgREST avec la service role key
function rest(path: string, init?: RequestInit) {
  return fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    ...init,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  })
}

// Requête GoTrue admin avec la service role key
function gotrue(path: string, init?: RequestInit) {
  return fetch(`${SUPABASE_URL}/auth/v1${path}`, {
    ...init,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  })
}

function escapeHtml(s: string) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
}

function buildEmailHtml(actionLink: string, plan: string) {
  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 16px;">
  <tr><td align="center">
    <table width="520" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%;">
      <tr><td style="text-align:center;padding-bottom:24px">
        <svg viewBox="170 50 180 410" width="18" height="40" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <polygon points="300,60 180,280 248,280 210,450 340,220 268,220 300,60" fill="#02d1ba"/>
        </svg>
      </td></tr>
      <tr><td style="background:#111;border-radius:20px;border:1px solid rgba(255,255,255,0.06);padding:40px 32px;">
        <div style="font-size:11px;letter-spacing:3px;text-transform:uppercase;color:rgba(2,209,186,0.6);margin-bottom:14px">RB Perform · Espace coach</div>
        <div style="font-size:24px;font-weight:900;color:#fff;letter-spacing:-.5px;margin-bottom:16px;line-height:1.3">
          Ton espace coach est prêt.
        </div>
        <div style="font-size:14px;color:rgba(255,255,255,0.55);line-height:1.7;margin-bottom:32px">
          Ton compte coach RB Perform (${escapeHtml(plan)}) a été ouvert. Définis ton mot de passe
          pour accéder à ton espace : programmes, suivi de tes athlètes, messagerie et analytics.
        </div>
        <div style="text-align:center;margin-bottom:20px">
          <a href="${actionLink}" style="display:inline-block;background:#02d1ba;color:#000;font-size:13px;font-weight:800;text-decoration:none;padding:14px 32px;border-radius:100px;letter-spacing:.08em;text-transform:uppercase;">
            Définir mon mot de passe →
          </a>
        </div>
        <div style="font-size:11px;color:rgba(255,255,255,0.25);text-align:center;letter-spacing:.04em">
          Ce lien est personnel et expire rapidement — clique-le depuis cet email.
        </div>
      </td></tr>
      <tr><td style="padding:24px 0 0;text-align:center;">
        <div style="font-size:11px;color:rgba(255,255,255,0.2);letter-spacing:.04em">
          RB Perform — La performance sans compromis
        </div>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })
  if (req.method !== "POST") return json({ success: false, error: "Method not allowed" }, 405)

  try {
    if (!SUPABASE_URL || !SUPABASE_KEY) {
      return json({ success: false, error: "Server misconfigured" }, 500)
    }

    // ===== 1. AUTH — JWT valide =====
    const authHeader = req.headers.get("Authorization") || ""
    const token = authHeader.replace(/^Bearer\s+/i, "").trim()
    if (!token) return json({ success: false, error: "Missing JWT" }, 401)

    const userRes = await gotrue("/user", {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!userRes.ok) return json({ success: false, error: "Invalid JWT" }, 401)
    const caller = await userRes.json()
    const callerEmail = String(caller?.email || "").toLowerCase()
    if (!callerEmail) return json({ success: false, error: "Invalid JWT" }, 401)

    // ===== 2. AUTORISATION — super admin uniquement =====
    // Garde-fou du vecteur fermé le 15/05. Voir bandeau en tête de fichier.
    const adminRes = await rest(
      `/super_admins?email=eq.${encodeURIComponent(callerEmail)}&select=id`,
    )
    const adminRows = await adminRes.json()
    if (!Array.isArray(adminRows) || adminRows.length === 0) {
      console.warn(`[invite-coach] FORBIDDEN — non-admin tried coach creation: ${callerEmail}`)
      return json({ success: false, error: "Forbidden: super admin only" }, 403)
    }

    // ===== 3. VALIDATION DU BODY =====
    let body: Record<string, unknown>
    try {
      body = await req.json()
    } catch {
      return json({ success: false, error: "Invalid JSON body" }, 400)
    }

    const email = String(body.email || "").trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json({ success: false, error: "Email invalide" }, 400)
    }

    const subscription_plan = String(body.subscription_plan || "").trim()
    if (!VALID_PLANS.includes(subscription_plan)) {
      return json({ success: false, error: `subscription_plan doit être : ${VALID_PLANS.join(", ")}` }, 400)
    }

    const founding_coach = body.founding_coach === true
    const lockedRaw = String(body.locked_price ?? "").trim()
    const locked_price = lockedRaw ? lockedRaw : null
    const notesRaw = String(body.coach_notes ?? "").trim()
    const coach_notes = notesRaw ? notesRaw : null

    // ===== 4. REFUS si un coach existe déjà =====
    const existRes = await rest(`/coaches?email=eq.${encodeURIComponent(email)}&select=id`)
    const existRows = await existRes.json()
    if (Array.isArray(existRows) && existRows.length > 0) {
      return json({ success: false, error: "Un coach existe déjà pour cet email" }, 409)
    }

    // ===== 5. CRÉER (ou récupérer) le user Auth =====
    // Crée d'abord. Si l'email existe déjà dans Auth (ex: ancien client),
    // on récupère son id pour y attacher la row coach.
    let userId: string | null = null

    const createRes = await gotrue("/admin/users", {
      method: "POST",
      body: JSON.stringify({
        email,
        email_confirm: true, // pas de double opt-in : invitation manuelle gérée
        user_metadata: { role: "coach" },
      }),
    })

    if (createRes.ok) {
      const newUser = await createRes.json()
      userId = newUser?.id || null
    } else {
      // 422 = email déjà enregistré dans Auth → on récupère le user existant
      const listRes = await gotrue("/admin/users?per_page=1000", { method: "GET" })
      if (listRes.ok) {
        const list = await listRes.json()
        const found = (list?.users || []).find(
          (u: { email?: string }) => String(u.email || "").toLowerCase() === email,
        )
        userId = found?.id || null
      }
      if (!userId) {
        const errBody = await createRes.text().catch(() => "")
        console.error(`[invite-coach] auth create failed email=${email} status=${createRes.status} body=${errBody}`)
        return json({ success: false, error: "Création du compte Auth échouée" }, 500)
      }
    }

    // ===== 6. CRÉER / METTRE À JOUR la row coaches =====
    // Le trigger `auto_create_coach_trigger` (migration 068) crée déjà une
    // row coach (subscription_plan='free') au moment où le user Auth est
    // inséré. On fait donc un UPSERT sur `id` pour écraser avec le vrai plan
    // + locked_price + founding_coach + coach_notes (même logique que
    // webhook-stripe.js qui upsert aussi sur `id`).
    const coachRes = await rest("/coaches?on_conflict=id", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify({
        id: userId,
        email,
        subscription_plan,
        locked_price,
        founding_coach,
        coach_notes,
        is_active: true,
      }),
    })
    if (!coachRes.ok) {
      const errBody = await coachRes.text().catch(() => "")
      console.error(`[invite-coach] coach upsert failed email=${email} userId=${userId} status=${coachRes.status} body=${errBody}`)
      return json({ success: false, error: "Création de la fiche coach échouée" }, 500)
    }

    // ===== 7. LIEN DE RÉCUPÉRATION (= définition du mot de passe) =====
    // redirect_to = /app.html?welcome=true :
    //  - /app.html est le vrai point d'entrée de la SPA React (vercel.json
    //    sert la landing sur `/`, l'app sur `/app.html`).
    //  - ?welcome=true est le signal de routage lu par App.jsx ; contrairement
    //    au hash, il survit au nettoyage d'URL fait par supabase-js → App.jsx
    //    affiche SetPasswordPage de façon fiable.
    //  - Supabase ajoute ensuite `#access_token=...&type=recovery` (hash
    //    propre, simple `#`) que supabase-js consomme pour ouvrir la session.
    // NB : ce domaine doit être dans la "Redirect URLs" allow-list de
    // Supabase Auth, sinon Supabase retombe sur le Site URL.
    const linkRes = await gotrue("/admin/generate_link", {
      method: "POST",
      body: JSON.stringify({
        type: "recovery",
        email,
        redirect_to: `${APP_BASE_URL}/app.html?welcome=true`,
      }),
    })
    let actionLink: string | null = null
    if (linkRes.ok) {
      const linkData = await linkRes.json()
      actionLink = linkData?.action_link || linkData?.properties?.action_link || null
    }
    if (!actionLink) {
      const errBody = await linkRes.text().catch(() => "")
      console.error(`[invite-coach] generate_link failed email=${email} status=${linkRes.status} body=${errBody}`)
      // Le coach est créé : on signale au super admin de renvoyer un lien
      // manuellement plutôt que de tout rollback.
      return json({
        success: false,
        error: "Coach créé mais lien de connexion non généré — renvoie un lien de récupération depuis Supabase Studio",
        coach_id: userId,
      }, 502)
    }

    // ===== 8. EMAIL DE CONNEXION via Zoho SMTP (tâche de fond) =====
    // denomailer laisse traîner la connexion TLS après l'envoi : le worker
    // Edge dépasse alors son budget (WORKER_RESOURCE_LIMIT) et meurt AVANT
    // de répondre — l'email part bien mais l'appelant reçoit une 546.
    // On déporte donc l'envoi dans EdgeRuntime.waitUntil() : la réponse HTTP
    // est flushée tout de suite, l'envoi se termine en arrière-plan.
    if (!SMTP_PASS) {
      return json({
        success: false,
        error: "Coach créé mais ZOHO_SMTP_PASS manquant — email non envoyé",
        coach_id: userId,
      }, 502)
    }

    const sendEmailTask = (async () => {
      const smtpClient = new SMTPClient({
        connection: {
          hostname: "smtp.zoho.eu",
          port: 465,
          tls: true,
          auth: { username: SMTP_USER, password: SMTP_PASS },
        },
      })
      try {
        await smtpClient.send({
          from: EMAIL_FROM,
          to: email,
          replyTo: SMTP_USER,
          subject: "Ton espace coach RB Perform est prêt",
          content: "auto",
          html: buildEmailHtml(actionLink!, subscription_plan),
        })
        console.log(`[invite-coach] email de connexion envoyé → ${email}`)
      } catch (e) {
        console.error("[invite-coach] SMTP error", (e as Error)?.message || e)
      } finally {
        try { await smtpClient.close() } catch { /* noop */ }
      }
    })()

    // Garde le worker en vie pour finir l'envoi après la réponse HTTP.
    EdgeRuntime.waitUntil(sendEmailTask)

    console.log(`[invite-coach] coach créé par ${callerEmail} → ${email} (${subscription_plan})`)
    return json({ success: true, coach_id: userId, email })
  } catch (e) {
    console.error("[invite-coach] error", e)
    return json({ success: false, error: String((e as Error)?.message || e) }, 500)
  }
})

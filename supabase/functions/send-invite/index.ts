// supabase/functions/send-invite/index.ts
//
// Envoie un email d'invitation client via Zoho SMTP (denomailer).
//
// Migre de Resend → Zoho SMTP pour aligner avec le reste de la stack
// (waitlist, welcome, crons utilisent tous Zoho sur rbperform.app).
//
// Appele par InviteClient.jsx apres que la row invitation a ete creee
// dans Supabase. Cette function:
//   1. Verifie le JWT coach
//   2. Retrieve l'invitation par id (avec coach_id = auth.uid())
//   3. Construit le lien /join?token=<uuid>
//   4. Envoie l'email via Zoho SMTP (smtp.zoho.eu:465 TLS)
//   5. Met a jour sent_at / last_resent_at / resend_count
//
// Env vars (Supabase Edge Function secrets) :
//   ZOHO_SMTP_USER  default rayan@rbperform.app
//   ZOHO_SMTP_PASS  Zoho app password (REQUIS)
//   APP_BASE_URL    default https://rbperform.app
//   EMAIL_FROM      default `RB Perform <${ZOHO_SMTP_USER}>` (auto)
//
// Body JSON:
//   { invitation_id: "uuid", resend?: boolean }
//
// Reponse:
//   { success: true, sent_to: "email@x" }
//   { success: false, error: "..." }

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const SMTP_USER = Deno.env.get('ZOHO_SMTP_USER') ?? 'rayan@rbperform.app'
const SMTP_PASS = Deno.env.get('ZOHO_SMTP_PASS') ?? ''
const APP_BASE_URL = Deno.env.get('APP_BASE_URL') ?? 'https://rbperform.app'
const EMAIL_FROM = Deno.env.get('EMAIL_FROM') ?? `RB Perform <${SMTP_USER}>`

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

async function supabase(path: string, init?: RequestInit) {
  return fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    ...init,
    headers: {
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  })
}

async function verifyJwt(token: string): Promise<string | null> {
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

function buildEmailHtml(opts: {
  coachName: string
  coachLogoUrl?: string | null
  prenom?: string | null
  joinUrl: string
}) {
  const { coachName, prenom, joinUrl, coachLogoUrl } = opts
  const greeting = prenom ? `Bonjour ${prenom},` : 'Bonjour,'
  const logoBlock = coachLogoUrl
    ? `<img src="${coachLogoUrl}" alt="${coachName}" height="40" style="max-width:160px;height:40px;display:block;margin:0 auto 24px" />`
    : `<div style="text-align:center;margin-bottom:24px">
         <svg viewBox="170 50 180 410" width="18" height="40" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
           <polygon points="300,60 180,280 248,280 210,450 340,220 268,220 300,60" fill="#02d1ba"/>
         </svg>
       </div>`

  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 16px;">
  <tr><td align="center">
    <table width="520" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%;">

      ${logoBlock}

      <tr><td style="background:#111;border-radius:20px;border:1px solid rgba(255,255,255,0.06);padding:40px 32px;">
        <div style="font-size:13px;color:rgba(255,255,255,0.45);margin-bottom:20px">${escapeHtml(greeting)}</div>

        <div style="font-size:24px;font-weight:900;color:#fff;letter-spacing:-.5px;margin-bottom:16px;line-height:1.3">
          <span style="color:#02d1ba">${escapeHtml(coachName)}</span> t'invite sur son espace coaching.
        </div>

        <div style="font-size:14px;color:rgba(255,255,255,0.55);line-height:1.7;margin-bottom:32px">
          Programmes personnalises, suivi quotidien et messagerie directe. Un espace premium concu pour
          t'aider a atteindre tes objectifs — sans distraction.
        </div>

        <div style="text-align:center;margin-bottom:20px">
          <a href="${joinUrl}" style="display:inline-block;background:#02d1ba;color:#000;font-size:13px;font-weight:800;text-decoration:none;padding:14px 32px;border-radius:100px;letter-spacing:.08em;text-transform:uppercase;">
            Accéder à mon espace →
          </a>
        </div>

        <div style="font-size:11px;color:rgba(255,255,255,0.25);text-align:center;letter-spacing:.04em">
          Ce lien expire dans 7 jours.
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

function escapeHtml(s: string) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function json(payload: any, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  })
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  if (req.method !== 'POST') return json({ success: false, error: 'Method not allowed' }, 405)

  try {
    // Auth
    const authHeader = req.headers.get('Authorization') || ''
    const token = authHeader.replace(/^Bearer\s+/i, '')
    if (!token) return json({ success: false, error: 'Missing JWT' }, 401)
    const coachId = await verifyJwt(token)
    if (!coachId) return json({ success: false, error: 'Invalid JWT' }, 401)

    if (!SMTP_PASS) return json({ success: false, error: 'ZOHO_SMTP_PASS missing' }, 500)

    const body = await req.json()
    const { invitation_id, resend: isResend } = body || {}
    if (!invitation_id) return json({ success: false, error: 'Missing invitation_id' }, 400)

    // Retrieve invitation (secured by coach_id = auth.uid via service role query)
    const invRes = await supabase(`/invitations?id=eq.${invitation_id}&coach_id=eq.${coachId}&select=id,email,prenom,token,resend_count`)
    const invRows = await invRes.json()
    if (!Array.isArray(invRows) || invRows.length === 0) {
      return json({ success: false, error: 'Invitation not found' }, 404)
    }
    const inv = invRows[0]

    // Retrieve coach info for email branding
    const coachRes = await supabase(`/coaches?id=eq.${coachId}&select=full_name,coaching_name,logo_url`)
    const coachRows = await coachRes.json()
    const coach = (coachRows && coachRows[0]) || {}
    const coachName = coach.coaching_name || coach.full_name || 'Ton coach'

    const joinUrl = `${APP_BASE_URL}/join?token=${inv.token}`
    const html = buildEmailHtml({
      coachName,
      coachLogoUrl: coach.logo_url || null,
      prenom: inv.prenom || null,
      joinUrl,
    })

    // Send via Zoho SMTP (denomailer)
    const subject = `${coachName} t'invite sur son espace coaching`
    const smtpClient = new SMTPClient({
      connection: {
        hostname: 'smtp.zoho.eu',
        port: 465,
        tls: true,
        auth: { username: SMTP_USER, password: SMTP_PASS },
      },
    })

    try {
      await smtpClient.send({
        from: EMAIL_FROM,
        to: inv.email,
        subject,
        content: 'auto',
        html,
      })
    } catch (e: any) {
      console.error('[send-invite] SMTP error', e?.message || e)
      return json({ success: false, error: 'Email provider error' }, 502)
    } finally {
      try { await smtpClient.close() } catch { /* noop */ }
    }

    // Mark as sent / resent
    const now = new Date().toISOString()
    const patch: Record<string, unknown> = isResend
      ? { last_resent_at: now, resend_count: (inv.resend_count || 0) + 1 }
      : { sent_at: now }

    await supabase(`/invitations?id=eq.${invitation_id}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
      headers: { Prefer: 'return=minimal' },
    })

    return json({ success: true, sent_to: inv.email })
  } catch (e: any) {
    console.error('[send-invite] error', e)
    return json({ success: false, error: String(e?.message || e) }, 500)
  }
})

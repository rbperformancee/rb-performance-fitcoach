import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const RESEND_KEY = Deno.env.get("RESEND_API_KEY") ?? ""
const SUPABASE_URL = "https://pwkajyrpldhlybavmopd.supabase.co"
const SUPABASE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
const COACH_EMAIL = "rb.performancee@gmail.com"
const APP_URL = "https://rb-perfor.vercel.app"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
}

async function sendEmail(to: string, subject: string, html: string) {
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Authorization": "Bearer " + RESEND_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ from: "RB Perform <noreply@rbperform.com>", to: [to], subject, html }),
  })
}

async function createClient(email: string) {
  if (!SUPABASE_KEY) return
  await fetch(SUPABASE_URL + "/rest/v1/clients", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_KEY,
      "Authorization": "Bearer " + SUPABASE_KEY,
      "Prefer": "resolution=ignore-duplicates",
    },
    body: JSON.stringify({ email: email, full_name: email.split("@")[0] }),
  })
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })
  try {
    const event = await req.json()
    if (event.type === "checkout.session.completed") {
      const session = event.data.object
      const email = session.customer_email || ""
      const plan = session.metadata?.planName || "RB Perform"
      const amount = ((session.amount_total || 0) / 100).toFixed(2)

      if (email) {
        await createClient(email)
        const clientHtml = "<html><body style='background:#000;color:#fff;font-family:sans-serif;padding:32px'>" +
          "<div style='max-width:520px;margin:0 auto'>" +
          "<div style='text-align:center;margin-bottom:32px'><div style='font-size:48px'>⚡</div>" +
          "<div style='font-size:9px;letter-spacing:5px;text-transform:uppercase;color:rgba(2,209,186,0.6);margin:8px 0'>Bienvenue dans l elite</div>" +
          "<div style='font-size:32px;font-weight:900;color:#fff'>RB<span style=color:#02d1ba>.</span>Perform</div></div>" +
          "<div style='background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:20px;padding:28px;text-align:center;margin-bottom:24px'>" +
          "<div style='font-size:40px;margin-bottom:12px'>✅</div>" +
          "<div style='font-size:22px;font-weight:900;color:#fff;margin-bottom:8px'>Tu fais partie de la Team.</div>" +
          "<div style='font-size:13px;color:rgba(255,255,255,0.4);line-height:1.7'>Programme <strong style=color:#02d1ba>" + plan + "</strong> active.<br>Rayan va te contacter tres prochainement.</div></div>" +
          "<div style='background:rgba(2,209,186,0.04);border:1px solid rgba(2,209,186,0.15);border-radius:16px;padding:24px;margin-bottom:24px'>" +
          "<div style='font-size:9px;letter-spacing:3px;text-transform:uppercase;color:rgba(2,209,186,0.6);margin-bottom:14px'>Prochaines etapes</div>" +
          "<div style='font-size:13px;color:rgba(255,255,255,0.4);line-height:2.2'>" +
          "<strong style=color:#fff>1.</strong> Accede a l app sur <strong style=color:#02d1ba>rb-perfor.vercel.app</strong><br>" +
          "<strong style=color:#fff>2.</strong> Remplis ton questionnaire de demarrage<br>" +
          "<strong style=color:#fff>3.</strong> Reserve ton appel avec Rayan</div></div>" +
          "<div style='background:rgba(2,209,186,0.04);border:1px solid rgba(2,209,186,0.15);border-radius:16px;padding:24px;margin-bottom:28px'>" +
          "<div style='font-size:9px;letter-spacing:3px;text-transform:uppercase;color:rgba(2,209,186,0.6);margin-bottom:14px'>Installer sur iPhone</div>" +
          "<div style='font-size:13px;color:rgba(255,255,255,0.4);line-height:2.2'>" +
          "<strong style=color:#fff>1.</strong> Ouvre Safari sur rb-perfor.vercel.app<br>" +
          "<strong style=color:#fff>2.</strong> Appuie sur Partager en bas<br>" +
          "<strong style=color:#fff>3.</strong> Selectionne Sur l ecran d accueil</div></div>" +
          "<div style='text-align:center;margin-bottom:28px'>" +
          "<a href='" + APP_URL + "' style='display:inline-block;background:linear-gradient(135deg,#02d1ba,#0891b2);color:#000;text-decoration:none;font-weight:800;font-size:14px;padding:16px 40px;border-radius:14px'>Acceder a mon espace</a></div>" +
          "<div style='text-align:center;font-size:11px;color:rgba(255,255,255,0.15)'>RB Perform · rb.performancee@gmail.com</div></div></body></html>"
        await sendEmail(email, "Bienvenue dans la Team RB Perform", clientHtml)
      }

      const coachHtml = "<html><body style='background:#000;color:#fff;font-family:sans-serif;padding:32px'>" +
        "<div style='max-width:480px;margin:0 auto'><div style='font-size:32px;margin-bottom:16px'>🔥 Nouveau client !</div>" +
        "<div style='background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:20px;margin-bottom:20px'>" +
        "<div style='margin-bottom:10px;font-size:13px;color:rgba(255,255,255,0.5)'>Email : <strong style=color:#fff>" + email + "</strong></div>" +
        "<div style='font-size:13px;color:rgba(255,255,255,0.5)'>Plan : <strong style=color:#02d1ba>" + plan + "</strong></div></div>" +
        "<a href='" + APP_URL + "' style='display:inline-block;background:#02d1ba;color:#000;text-decoration:none;font-weight:800;font-size:13px;padding:12px 24px;border-radius:10px'>Voir le dashboard</a>" +
        "</div></body></html>"
      await sendEmail(COACH_EMAIL, "Nouveau client — " + plan, coachHtml)
    }
    return new Response(JSON.stringify({ received: true }), { headers: corsHeaders })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 400, headers: corsHeaders })
  }
})

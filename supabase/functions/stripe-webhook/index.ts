import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Stripe from "https://esm.sh/stripe@14.12.0?target=deno"

const RESEND_KEY = Deno.env.get("RESEND_API_KEY") ?? ""
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "https://pwkajyrpldhlybavmopd.supabase.co"
const SUPABASE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
const STRIPE_SECRET = Deno.env.get("STRIPE_SECRET_KEY") ?? ""
const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? ""
const COACH_EMAIL = "rb.performancee@gmail.com"
const APP_URL = "https://rb-perfor.vercel.app"

// Stripe client pour la verification de signature HMAC
const stripe = STRIPE_SECRET ? new Stripe(STRIPE_SECRET, { apiVersion: "2023-10-16", httpClient: Stripe.createFetchHttpClient() }) : null
const cryptoProvider = Stripe.createSubtleCryptoProvider()

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

async function sendTypedEmail(email: string, fullName: string, type: string, extra: Record<string, any> = {}) {
  const fnUrl = SUPABASE_URL + "/functions/v1/send-welcome"
  await fetch(fnUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + SUPABASE_KEY,
    },
    body: JSON.stringify({ email, full_name: fullName, type, ...extra }),
  })
}

async function createClient(email: string) {
  if (!SUPABASE_KEY) return

  await fetch(SUPABASE_URL + "/auth/v1/admin/users", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_KEY,
      "Authorization": "Bearer " + SUPABASE_KEY,
    },
    body: JSON.stringify({
      email: email,
      email_confirm: true,
      user_metadata: {}
    }),
  })

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
    // ===== VERIFICATION SIGNATURE STRIPE =====
    // Protege contre les evenements forges (voir https://stripe.com/docs/webhooks/signatures)
    const signature = req.headers.get("stripe-signature")
    const rawBody = await req.text()

    let event: any
    if (stripe && STRIPE_WEBHOOK_SECRET && signature) {
      try {
        event = await stripe.webhooks.constructEventAsync(
          rawBody,
          signature,
          STRIPE_WEBHOOK_SECRET,
          undefined,
          cryptoProvider
        )
      } catch (err: any) {
        console.error("Invalid Stripe signature:", err.message)
        return new Response(JSON.stringify({ error: "Invalid signature" }), {
          status: 401,
          headers: corsHeaders,
        })
      }
    } else if (STRIPE_WEBHOOK_SECRET) {
      // Secret configure mais signature absente => rejet
      return new Response(JSON.stringify({ error: "Missing stripe-signature header" }), {
        status: 401,
        headers: corsHeaders,
      })
    } else {
      // SECURITY : sans secret de signature Stripe, le webhook est spoofable
      // (n'importe qui peut forger checkout.session.completed → comptes gratuits).
      // Ajouter STRIPE_WEBHOOK_SECRET dans Supabase > Edge Functions secrets.
      console.error("STRIPE_WEBHOOK_SECRET missing — webhook rejected for security")
      return new Response(JSON.stringify({ error: "Webhook signature secret not configured" }), {
        status: 500,
        headers: corsHeaders,
      })
    }

    // ===== Nouveau paiement =====
    if (event.type === "checkout.session.completed") {
      const session = event.data.object
      const email = session.customer_email || ""
      const plan = session.metadata?.planName || "RB Perform"
      const amount = ((session.amount_total || 0) / 100).toFixed(2)

      if (email) {
        await createClient(email)
        await sendTypedEmail(email, "", "checkout", { plan_name: plan, amount })
      }

      // Notif coach
      const coachHtml = `<html><body style="background:#0a0a0a;color:#fff;font-family:'Helvetica Neue',Arial,sans-serif;padding:32px;">
        <div style="max-width:480px;margin:0 auto;">
          <div style="font-size:9px;letter-spacing:5px;text-transform:uppercase;color:rgba(2,209,186,0.5);margin-bottom:6px;">Notification</div>
          <div style="font-size:28px;font-weight:900;color:#fff;margin-bottom:20px;letter-spacing:-1px;">Nouveau client</div>
          <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:20px;margin-bottom:20px;">
            <div style="margin-bottom:10px;font-size:13px;color:rgba(255,255,255,0.5);">Email : <strong style="color:#fff;">${email}</strong></div>
            <div style="font-size:13px;color:rgba(255,255,255,0.5);">Plan : <strong style="color:#02d1ba;">${plan}</strong></div>
            <div style="font-size:13px;color:rgba(255,255,255,0.5);">Montant : <strong style="color:#fff;">${amount} EUR</strong></div>
          </div>
          <a href="${APP_URL}" style="display:inline-block;background:#02d1ba;color:#000;text-decoration:none;font-weight:800;font-size:13px;padding:12px 24px;border-radius:10px;">Voir le dashboard</a>
        </div>
      </body></html>`
      await sendEmail(COACH_EMAIL, "Nouveau client — " + plan, coachHtml)
    }

    // ===== Abonnement renouvele =====
    if (event.type === "invoice.payment_succeeded") {
      const invoice = event.data.object
      const email = invoice.customer_email || ""
      if (email && invoice.billing_reason === "subscription_cycle") {
        // Renewal auto — confirmer au client
        const name = invoice.customer_name || ""
        await sendTypedEmail(email, name, "welcome", { plan_name: "RB Perform" })
      }
    }

    // ===== Paiement echoue =====
    if (event.type === "invoice.payment_failed") {
      const invoice = event.data.object
      const email = invoice.customer_email || ""
      if (email) {
        const name = invoice.customer_name || ""
        await sendTypedEmail(email, name, "renewal_reminder", { days_left: 3, plan_name: "RB Perform" })
        // Alert coach
        await sendEmail(COACH_EMAIL, "Paiement echoue — " + email,
          `<html><body style="background:#0a0a0a;color:#fff;font-family:sans-serif;padding:32px;">
            <div style="max-width:480px;margin:0 auto;">
              <div style="font-size:9px;letter-spacing:5px;text-transform:uppercase;color:#ef4444;margin-bottom:6px;">Alerte</div>
              <div style="font-size:24px;font-weight:900;color:#fff;margin-bottom:16px;">Paiement echoue</div>
              <div style="background:rgba(239,68,68,0.06);border:1px solid rgba(239,68,68,0.2);border-radius:14px;padding:20px;">
                <div style="font-size:13px;color:rgba(255,255,255,0.5);">Client : <strong style="color:#fff;">${email}</strong></div>
              </div>
            </div>
          </body></html>`)
      }
    }

    // ===== Abonnement annule/expire =====
    if (event.type === "customer.subscription.deleted") {
      const sub = event.data.object
      const customerId = sub.customer
      // Lookup customer email via Stripe metadata or stored data
      const email = sub.metadata?.email || ""
      if (email) {
        await sendTypedEmail(email, "", "subscription_expired")
        await sendEmail(COACH_EMAIL, "Abonnement expire — " + email,
          `<html><body style="background:#0a0a0a;color:#fff;font-family:sans-serif;padding:32px;">
            <div style="max-width:480px;margin:0 auto;">
              <div style="font-size:9px;letter-spacing:5px;text-transform:uppercase;color:#ef4444;margin-bottom:6px;">Alerte</div>
              <div style="font-size:24px;font-weight:900;color:#fff;margin-bottom:16px;">Abonnement expire</div>
              <div style="background:rgba(239,68,68,0.06);border:1px solid rgba(239,68,68,0.2);border-radius:14px;padding:20px;">
                <div style="font-size:13px;color:rgba(255,255,255,0.5);">Client : <strong style="color:#fff;">${email}</strong></div>
              </div>
            </div>
          </body></html>`)
      }
    }

    return new Response(JSON.stringify({ received: true }), { headers: corsHeaders })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 400, headers: corsHeaders })
  }
})

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })

  try {
    const { priceId, clientEmail, clientId, planName, planId } = await req.json()
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY") ?? ""

    const body = new URLSearchParams({
      "payment_method_types[0]": "card",
      "mode": "subscription",
      "line_items[0][price]": priceId,
      "line_items[0][quantity]": "1",
      "success_url": "https://rb-perfor.vercel.app?payment=success&plan=" + encodeURIComponent(planName) + "&email=" + encodeURIComponent(clientEmail || ""),
      "cancel_url": "https://rb-perfor.vercel.app?payment=cancelled",
      "locale": "fr",
      "allow_promotion_codes": "true",
    })

    if (clientEmail) body.append("customer_email", clientEmail)
    if (clientId) body.append("metadata[clientId]", clientId)
    if (planName) body.append("metadata[planName]", planName)
    if (planId) body.append("metadata[planId]", planId)

    const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + stripeKey,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    })

    const session = await res.json()
    if (!res.ok) throw new Error(session.error?.message ?? "Stripe error")

    return new Response(JSON.stringify({ url: session.url }), { headers: corsHeaders })
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 400, headers: corsHeaders })
  }
})

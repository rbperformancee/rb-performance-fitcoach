import { serve } from "https://deno.land/x/sift@0.6.0/mod.ts";
import Stripe from "https://esm.sh/stripe@13.11.0";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
  apiVersion: "2023-10-16",
  httpClient: Stripe.createFetchHttpClient(),
});

serve(async (req) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Content-Type": "application/json",
  };

  if (req.method === "OPTIONS") return new Response("ok", { headers });

  try {
    const { priceId, clientEmail, clientId, planName, planId } = await req.json();

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: clientEmail,
      success_url: "https://rb-perfor.vercel.app?payment=success&plan=" + encodeURIComponent(planName),
      cancel_url: "https://rb-perfor.vercel.app?payment=cancelled",
      metadata: { clientId, planName, planId },
      locale: "fr",
      allow_promotion_codes: true,
    });

    return new Response(JSON.stringify({ url: session.url }), { headers });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 400, headers });
  }
});

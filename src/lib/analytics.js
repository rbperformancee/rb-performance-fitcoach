// Self-hosted funnel analytics — remplace Plausible / GA.
// Tous les events sont POSTés à /api/track-event puis stockés dans la table
// analytics_events Supabase. Lecture super_admin only via le dashboard CRM.
//
// Convention de naming :
//   - Funnel:<étape>  pour l'entonnoir candidature
//   - Action:<nom>    pour les clics CTA spécifiques
//
// Meta Pixel reste actif EN PARALLÈLE (objectif différent : retargeting ads),
// les helpers fbq() ne sont pas supprimés.

// ════════ Session ID anonyme ════════
// Hash léger persisté 30 min dans sessionStorage. Permet d'identifier
// les unique visiteurs sans IP ni cookie persistant (RGPD-friendly).
function getSessionId() {
  if (typeof window === "undefined") return null;
  try {
    const KEY = "_rb_sid";
    const TTL_MS = 30 * 60 * 1000;
    const now = Date.now();
    const cached = sessionStorage.getItem(KEY);
    if (cached) {
      const [sid, ts] = cached.split("|");
      if (sid && Number(ts) > now - TTL_MS) return sid;
    }
    const sid =
      crypto.randomUUID
        ? crypto.randomUUID().slice(0, 16)
        : String(Math.random()).slice(2, 18);
    sessionStorage.setItem(KEY, `${sid}|${now}`);
    return sid;
  } catch {
    return null;
  }
}

function inferSource() {
  if (typeof window === "undefined") return "unknown";
  try {
    const params = new URLSearchParams(window.location.search);
    const utm = params.get("utm_source");
    if (utm) return utm.toLowerCase().slice(0, 40);
    const ref = (document.referrer || "").toLowerCase();
    if (!ref) return "direct";
    if (ref.includes("instagram") || ref.includes("ig.me")) return "instagram";
    if (ref.includes("youtube") || ref.includes("youtu.be")) return "youtube";
    if (ref.includes("tiktok")) return "tiktok";
    if (ref.includes("linkedin")) return "linkedin";
    if (ref.includes("google")) return "google";
    if (ref.includes("rbperform")) return "rbperform_internal";
    try {
      return new URL(ref).hostname.replace(/^www\./, "").slice(0, 40);
    } catch {
      return "referrer";
    }
  } catch {
    return "unknown";
  }
}

function readUtm() {
  if (typeof window === "undefined") return {};
  try {
    const p = new URLSearchParams(window.location.search);
    return {
      utm_source: p.get("utm_source") || null,
      utm_medium: p.get("utm_medium") || null,
      utm_campaign: p.get("utm_campaign") || null,
    };
  } catch {
    return {};
  }
}

// Fire-and-forget. Jamais bloquer l'UX si l'endpoint échoue.
function emit(name, props) {
  try {
    if (typeof window === "undefined") return;
    const utm = readUtm();
    const body = JSON.stringify({
      name,
      props: props || {},
      session_id: getSessionId(),
      page_path: window.location.pathname + window.location.search,
      referrer: document.referrer || null,
      source: inferSource(),
      utm_source: utm.utm_source,
      utm_medium: utm.utm_medium,
      utm_campaign: utm.utm_campaign,
    });
    // sendBeacon = plus fiable pour les events au unload de page,
    // fetch fallback pour les events en cours de session
    if (navigator.sendBeacon) {
      navigator.sendBeacon(
        "/api/track-event",
        new Blob([body], { type: "application/json" })
      );
    } else {
      fetch("/api/track-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        keepalive: true,
      }).catch(() => {});
    }
  } catch {}
}

function fbq(eventName, params) {
  try {
    if (typeof window === "undefined") return;
    if (typeof window.fbq === "function") {
      window.fbq("track", eventName, params || {});
    }
  } catch {}
}

// ════════ FUNNEL CANDIDATURE ════════

export function trackLandingViewed() {
  emit("Funnel:LandingViewed");
}

export function trackApplicationStarted() {
  emit("Funnel:ApplicationStarted");
  fbq("InitiateCheckout");
}

export function trackApplicationStep(stepNumber, stepLabel) {
  emit("Funnel:Step", { step: String(stepNumber), label: stepLabel });
}

export function trackApplicationSubmitted({ budget, timeline } = {}) {
  emit("Funnel:ApplicationSubmitted", {
    budget: budget || "unknown",
    timeline: timeline || "unknown",
  });
  fbq("Lead", {
    content_name: "coaching_application",
    content_category: inferSource(),
    value: budget,
    currency: "EUR",
  });
}

export function trackApplicationConfirmation() {
  emit("Funnel:ConfirmationViewed");
}

export function trackCallScheduled() {
  emit("Funnel:CallScheduled");
}

export function trackCallNoShow() {
  emit("Funnel:CallNoShow");
}

export function trackCheckoutOpened(plan) {
  emit("Funnel:CheckoutOpened", { plan: plan || "unknown" });
  fbq("InitiateCheckout", { content_name: plan });
}

export function trackPurchase({ plan, amount } = {}) {
  emit("Funnel:Purchase", { plan: plan || "unknown", amount: String(amount || 0) });
  fbq("Purchase", { value: amount, currency: "EUR", content_name: plan });
}

export function trackPostVenteViewed() {
  emit("Funnel:PostVenteViewed");
}

// ════════ ACTIONS DIRECTES ════════

export function trackCTAClick(ctaName, context) {
  emit("Action:CTA", { cta: ctaName, context: context || "" });
}

export function trackVideoPlay(videoKey) {
  emit("Action:VideoPlay", { video: videoKey });
}

export function trackExternalLink(url) {
  emit("Action:OutboundLink", { url });
}

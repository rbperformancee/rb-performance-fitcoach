// A/B testing helpers — client-side variant resolution + override apply.
//
// Pattern (adapté de FunnelOps lib/get-coach.ts) :
//   1. useABTest(page) → query Supabase pour un test actif sur cette page
//   2. Si trouvé : pickVariant(traffic_split) → "A" | "B" déterministe par session_id
//   3. applyVariant(baseConfig, override) → deep-merge → config finale
//   4. trackVariant() → emet event Funnel:Variant {variant, test_id, page}

import { supabase } from "./supabase";

const STORAGE_KEY_PREFIX = "_ab_";

/**
 * Pick A or B déterministe par session_id pour cohérence pendant la session.
 * Cohérent avec inferSource() dans analytics.js — utilise sessionStorage.
 */
function getOrCreateSid() {
  if (typeof window === "undefined") return null;
  try {
    const KEY = "_rb_sid";
    const cached = sessionStorage.getItem(KEY);
    if (cached) return cached.split("|")[0];
    return null;
  } catch { return null; }
}

/**
 * Décide A ou B en fonction d'un hash déterministe du session_id + test_id.
 * → cohérent : même visiteur voit toujours la même variante pendant sa session.
 */
function pickVariant(testId, trafficSplit) {
  const sid = getOrCreateSid() || String(Math.random());
  // hash simple djb2 — pas de crypto nécessaire, juste équirépartition
  let hash = 5381;
  const input = `${sid}_${testId}`;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) + hash) ^ input.charCodeAt(i);
  }
  const pct = Math.abs(hash) % 100;
  return pct < trafficSplit ? "B" : "A";
}

/**
 * Deep-merge récursif : objets fusionnés, autres valeurs override remplacent.
 * Source : applyVariant() de FunnelOps adapté en JS.
 */
export function applyVariant(base, override) {
  if (!override || typeof override !== "object") return base;
  if (!base || typeof base !== "object") return override;
  if (Array.isArray(override)) return override;

  const out = { ...base };
  for (const key of Object.keys(override)) {
    const v = override[key];
    if (v && typeof v === "object" && !Array.isArray(v) && out[key] && typeof out[key] === "object") {
      out[key] = applyVariant(out[key], v);
    } else {
      out[key] = v;
    }
  }
  return out;
}

/**
 * Récupère le test actif pour une page + résoud la variante pour ce visiteur.
 * Retourne { variant, override, testId } ou null si pas de test actif.
 *
 * @param {"landing"|"pack_decouverte"|"post_vente"|"confirmation"} page
 */
export async function resolveABTest(page) {
  try {
    const { data, error } = await supabase
      .from("ab_tests")
      .select("id, traffic_split, variant_a, variant_b")
      .eq("page", page)
      .eq("active", true)
      .limit(1)
      .maybeSingle();
    if (error || !data) return null;

    // Cache la variant choisie dans sessionStorage pour la session
    const cacheKey = `${STORAGE_KEY_PREFIX}${data.id}`;
    let variant;
    try {
      variant = sessionStorage.getItem(cacheKey);
    } catch {}
    if (!variant || (variant !== "A" && variant !== "B")) {
      variant = pickVariant(data.id, data.traffic_split);
      try { sessionStorage.setItem(cacheKey, variant); } catch {}
    }

    const override = variant === "A" ? data.variant_a : data.variant_b;
    return { variant, override: override || {}, testId: data.id };
  } catch {
    return null;
  }
}

/**
 * Track la vue de la variante (tagué dans analytics_events).
 * Fire-and-forget.
 */
export function trackABTestExposure(page, testId, variant) {
  try {
    if (typeof window === "undefined") return;
    const body = JSON.stringify({
      name: "ABTest:Exposure",
      props: { page, test_id: testId, variant },
      session_id: getOrCreateSid(),
      page_path: window.location.pathname,
    });
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/track-event", new Blob([body], { type: "application/json" }));
    } else {
      fetch("/api/track-event", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(() => {});
    }
  } catch {}
}

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL  = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_ANON = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON) {
  // eslint-disable-next-line no-console
  console.error("[supabase] REACT_APP_SUPABASE_URL ou REACT_APP_SUPABASE_ANON_KEY manquant dans .env");
}

// Storage explicite : sans ça Supabase peut tomber sur memoryStorage (perte de
// session) au cold-start du PWA iOS standalone, où window.localStorage met
// quelques ms à être accessible. On garde le storageKey par défaut pour ne pas
// invalider les sessions déjà actives.
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: typeof window !== "undefined" ? window.localStorage : undefined,
  },
});

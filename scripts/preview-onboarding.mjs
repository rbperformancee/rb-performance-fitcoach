// Crée un coach temp, génère un magic link, l'ouvre dans le navigateur sur localhost:3001.
// Tu vois le nouvel onboarding direct, en interactif. Cleanup manuel = relance le script.
import "dotenv/config";
import { execSync } from "child_process";
import { createClient } from "@supabase/supabase-js";
import { URL as NodeURL } from "url";

const SUPA_URL = process.env.REACT_APP_SUPABASE_URL;
const SUPA_SVC = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPA_URL || !SUPA_SVC) {
  console.error("Sourcer .env.local d'abord (set -a && source .env.local && set +a)");
  process.exit(1);
}
const admin = createClient(SUPA_URL, SUPA_SVC, { auth: { autoRefreshToken: false, persistSession: false } });

const EMAIL = `onb-preview-${Date.now()}@local.test`;

console.log(`[1/3] Crée coach temp ${EMAIL}`);
const { data: u, error: cErr } = await admin.auth.admin.createUser({ email: EMAIL, email_confirm: true });
if (cErr) { console.error(cErr.message); process.exit(1); }

const { error: upErr } = await admin.from("coaches").upsert({
  id: u.user.id,
  email: EMAIL,
  is_active: true,
  subscription_plan: "founding",
}, { onConflict: "id" });
if (upErr) console.warn("[warn] coaches upsert:", upErr.message);

console.log(`[2/3] Génère magic link → http://localhost:3001`);
const { data: link, error: lErr } = await admin.auth.admin.generateLink({
  type: "magiclink",
  email: EMAIL,
  options: { redirectTo: "http://localhost:3001/" },
});
if (lErr) { console.error(lErr.message); process.exit(1); }

const target = link.properties.action_link;
console.log(`[3/3] Ouvre le navigateur`);
console.log(`Compte temp: ${EMAIL}`);
console.log(`User id: ${u.user.id}`);
console.log(`→ Pour supprimer après test, relance le script ou:`);
console.log(`  supabase auth admin delete-user ${u.user.id}`);
execSync(`open "${target}"`);

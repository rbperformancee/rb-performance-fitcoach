#!/usr/bin/env node
/**
 * setup-ebook-virtual-coach.mjs — Étape 1 du flow "ebook self-serve"
 *
 * Crée (idempotent) :
 *   - Coach virtuel "RB Perform Athlètes" (eb000000-0000-4000-8000-000000000001)
 *   - Template programme placeholder       (eb000000-0000-4000-8000-000000000002)
 *
 * Utilise PostgREST + SUPABASE_SERVICE_ROLE_KEY (DML pur, pas besoin du Management API).
 *
 * Usage : node scripts/setup-ebook-virtual-coach.mjs
 *
 * Env requis :
 *   - SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Charge .env.local manuellement (CRA n'expose pas dotenv côté scripts)
const envPath = path.resolve(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY requis dans .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const COACH_ID = 'eb000000-0000-4000-8000-000000000001';
const TEMPLATE_ID = 'eb000000-0000-4000-8000-000000000002';
const COACH_EMAIL = 'athletes@rbperform.app';

const PLACEHOLDER_HTML = `<!doctype html><html><head><meta charset="utf-8"/><title>Ebook Athlète 60J</title></head><body><input id="prog-name" value="Ebook Athlète 60J"/><input id="client-name" value=""/><input id="prog-duration" value="60 jours"/><div class="week" data-week="1"><h2>Semaine 1</h2><div class="session" data-session="1"><h3>Séance 1 — Full Body</h3><div class="exercise"><input id="en-w1s1e1-name" value="Programme à compléter"/><input id="en-w1s1e1-reps" value="4X10"/><input id="en-w1s1e1-tempo" value=""/><input id="en-w1s1e1-rir" value=""/><input id="en-w1s1e1-rest" value="90s"/></div></div></div></body></html>`;

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Setup coach virtuel ebook + template placeholder');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // 1) Coach virtuel — UPSERT par email (UNIQUE)
  console.log('\n[1/2] Upsert coach virtuel athletes@rbperform.app…');
  const { data: coachData, error: coachErr } = await supabase
    .from('coaches')
    .upsert(
      {
        id: COACH_ID,
        email: COACH_EMAIL,
        full_name: 'RB Perform Athlètes',
        brand_name: 'RB Perform',
        accent_color: '#02d1ba',
        is_active: true,
      },
      { onConflict: 'email', ignoreDuplicates: false }
    )
    .select('id, email, brand_name')
    .single();

  if (coachErr) {
    console.error('  ❌ Erreur insert coach :', coachErr.message);
    process.exit(1);
  }
  console.log(`  ✅ Coach : ${coachData.brand_name} (id=${coachData.id})`);

  // Si l'email existait déjà avec un id différent, on récupère l'id réel pour le FK
  const effectiveCoachId = coachData.id;
  if (effectiveCoachId !== COACH_ID) {
    console.warn(`  ⚠️  Coach existait avec id=${effectiveCoachId} ≠ ${COACH_ID}`);
    console.warn(`     → mets EBOOK_VIRTUAL_COACH_ID=${effectiveCoachId} dans tes env vars`);
  }

  // 2) Template programme — UPSERT par id (PK)
  console.log('\n[2/2] Upsert template programme ebook 60J…');
  const { data: tplData, error: tplErr } = await supabase
    .from('coach_programme_templates')
    .upsert(
      {
        id: TEMPLATE_ID,
        coach_id: effectiveCoachId,
        name: 'Ebook Athlète 60J — Template',
        description:
          "Programme de référence dupliqué à chaque achat de l'ebook 60J. Modifier via scripts/update-ebook-template.mjs <chemin.html>.",
        html_content: PLACEHOLDER_HTML,
        weeks_count: 1,
        sessions_count: 1,
        exercises_count: 1,
      },
      { onConflict: 'id', ignoreDuplicates: false }
    )
    .select('id, name, weeks_count, sessions_count, exercises_count')
    .single();

  if (tplErr) {
    console.error('  ❌ Erreur insert template :', tplErr.message);
    process.exit(1);
  }
  console.log(`  ✅ Template : ${tplData.name} (id=${tplData.id})`);

  // Récap env vars
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  ✅ Étape 1 OK — env vars à provisionner (Vercel) :');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  EBOOK_VIRTUAL_COACH_ID=${effectiveCoachId}`);
  console.log(`  EBOOK_TEMPLATE_ID=${tplData.id}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main().catch((err) => {
  console.error('💥 Fatal :', err);
  process.exit(1);
});

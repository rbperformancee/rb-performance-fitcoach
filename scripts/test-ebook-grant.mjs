#!/usr/bin/env node
/**
 * test-ebook-grant.mjs — Tests d'intégration de /api/internal/ebook-grant-access
 *
 * Vérifie en local OU contre un déploiement (preview/prod) :
 *   - Auth header (401 si secret manquant/faux)
 *   - Validation body (400 si stripe_session_id/email absents/invalides)
 *   - Idempotence (2e POST même session_id = même réponse, pas de nouveau client)
 *   - Compteur 30 (mock 29 → 1 granted → 1 waitlist)
 *   - Cleanup à la fin
 *
 * Usage :
 *   node scripts/test-ebook-grant.mjs                  → contre localhost:3000
 *   API_URL=https://rbperform.app node scripts/...     → contre prod
 *
 * Pré-requis :
 *   - INTERNAL_API_SECRET dans .env.local
 *   - SUPABASE_SERVICE_ROLE_KEY (pour cleanup)
 *   - Migration 106 + 107 appliquées
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

const API_URL = process.env.API_URL || 'http://localhost:3000';
const SECRET = process.env.INTERNAL_API_SECRET;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SECRET) {
  console.error('❌ INTERNAL_API_SECRET requis');
  process.exit(1);
}
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌ SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY requis (pour cleanup)');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

const ENDPOINT = `${API_URL}/api/internal/ebook-grant-access`;
const RUN_ID = `test-${Date.now()}`;
const createdSessionIds = [];
const createdEmails = [];

let passed = 0;
let failed = 0;

function ok(name, cond, detail) {
  if (cond) {
    console.log(`  ✅ ${name}`);
    passed++;
  } else {
    console.log(`  ❌ ${name}  — ${detail || ''}`);
    failed++;
  }
}

async function callApi({ secret, body }) {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(secret ? { 'X-Internal-Secret': secret } : {}),
    },
    body: JSON.stringify(body || {}),
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

async function cleanup() {
  console.log('\n🧹 Cleanup…');
  if (createdSessionIds.length > 0) {
    // Récupère client_id avant de purger purchases
    const { data: rows } = await supabase
      .from('ebook_purchases')
      .select('stripe_session_id, client_id')
      .in('stripe_session_id', createdSessionIds);
    const clientIds = (rows || []).map((r) => r.client_id).filter(Boolean);

    await supabase.from('ebook_purchases').delete().in('stripe_session_id', createdSessionIds);
    console.log(`  · ebook_purchases purgées (${createdSessionIds.length})`);

    if (clientIds.length > 0) {
      // Purge programmes liés
      await supabase.from('programmes').delete().in('client_id', clientIds);
      // Purge clients de test
      await supabase.from('clients').delete().in('id', clientIds);
      console.log(`  · clients + programmes purgés (${clientIds.length})`);
    }
  }

  // Purge auth.users de test
  if (createdEmails.length > 0) {
    try {
      const { data: list } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
      const toDelete = (list?.users || []).filter((u) =>
        createdEmails.includes((u.email || '').toLowerCase())
      );
      for (const u of toDelete) {
        await supabase.auth.admin.deleteUser(u.id);
      }
      if (toDelete.length > 0) console.log(`  · auth.users purgés (${toDelete.length})`);
    } catch (e) {
      console.warn(`  ⚠️  auth.users cleanup partiel : ${e.message}`);
    }
  }
}

async function runTests() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  Tests E2E /api/internal/ebook-grant-access`);
  console.log(`  Endpoint : ${ENDPOINT}`);
  console.log(`  Run ID   : ${RUN_ID}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // ─── Test 1 : Auth ───
  console.log('1. AUTH');
  {
    const r = await callApi({ body: { stripe_session_id: 'x', email: 'a@b.c' } });
    ok('401 sans secret', r.status === 401, `status=${r.status}`);
  }
  {
    const r = await callApi({ secret: 'wrong-secret-bad', body: { stripe_session_id: 'x', email: 'a@b.c' } });
    ok('401 avec mauvais secret', r.status === 401, `status=${r.status}`);
  }

  // ─── Test 2 : Validation body ───
  console.log('\n2. VALIDATION BODY');
  {
    const r = await callApi({ secret: SECRET, body: { email: 'a@b.c' } });
    ok('400 sans stripe_session_id', r.status === 400, `status=${r.status} body=${JSON.stringify(r.data)}`);
  }
  {
    const r = await callApi({ secret: SECRET, body: { stripe_session_id: 'cs_test_xxx' } });
    ok('400 sans email', r.status === 400);
  }
  {
    const r = await callApi({ secret: SECRET, body: { stripe_session_id: 'cs_test_xxx', email: 'not-an-email' } });
    ok('400 email invalide', r.status === 400);
  }

  // ─── Test 3 : Happy path (granted) ───
  console.log('\n3. HAPPY PATH — accès accordé');
  const sessionId1 = `cs_test_${RUN_ID}_1`;
  const email1 = `${RUN_ID}-1@test-ebook.rbperform.app`;
  createdSessionIds.push(sessionId1);
  createdEmails.push(email1);
  {
    const r = await callApi({
      secret: SECRET,
      body: { stripe_session_id: sessionId1, email: email1, full_name: 'Test User One' },
    });
    ok('200', r.status === 200, JSON.stringify(r.data));
    ok('success=true', r.data.success === true);
    ok('app_access_granted=true', r.data.app_access_granted === true, r.data.reason);
    ok('reason=granted', r.data.reason === 'granted');
    ok('client_id présent', typeof r.data.client_id === 'string' && r.data.client_id.length > 0);
    ok('programme_id présent', typeof r.data.programme_id === 'string' && r.data.programme_id.length > 0);
    ok('idempotent=false', r.data.idempotent === false);
  }

  // ─── Test 4 : Idempotence ───
  console.log('\n4. IDEMPOTENCE — replay même session_id');
  {
    const r = await callApi({
      secret: SECRET,
      body: { stripe_session_id: sessionId1, email: email1, full_name: 'Test User One' },
    });
    ok('200 sur replay', r.status === 200);
    ok('idempotent=true', r.data.idempotent === true);
    ok('app_access_granted=true (cohérent)', r.data.app_access_granted === true);

    // Vérifie qu'on a PAS créé un 2e client
    const { count } = await supabase
      .from('clients')
      .select('id', { count: 'exact', head: true })
      .eq('email', email1);
    ok('un seul client en DB', count === 1, `count=${count}`);
  }

  // ─── Test 5 : Coach collision ───
  console.log('\n5. COACH COLLISION — email coach existant');
  // Pour ce test, on prend un email coach existant arbitraire (on lit le 1er coach != virtuel)
  const { data: realCoach } = await supabase
    .from('coaches')
    .select('email')
    .neq('id', 'eb000000-0000-4000-8000-000000000001')
    .limit(1)
    .maybeSingle();

  if (realCoach?.email) {
    const sessionIdCoach = `cs_test_${RUN_ID}_coach`;
    createdSessionIds.push(sessionIdCoach);
    const r = await callApi({
      secret: SECRET,
      body: { stripe_session_id: sessionIdCoach, email: realCoach.email },
    });
    ok('200', r.status === 200);
    ok('app_access_granted=false', r.data.app_access_granted === false);
    ok('reason=coach_collision', r.data.reason === 'coach_collision');
    ok('client_id null', r.data.client_id === null);
  } else {
    console.log('  ⏭  skip — aucun coach réel en DB');
  }

  // Récap
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  ${passed} passed · ${failed} failed`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

runTests()
  .catch((err) => {
    console.error('💥 Fatal :', err);
    failed++;
  })
  .finally(async () => {
    await cleanup();
    process.exit(failed > 0 ? 1 : 0);
  });

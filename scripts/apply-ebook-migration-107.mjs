#!/usr/bin/env node
/**
 * apply-ebook-migration-107.mjs
 *
 * Tente d'appliquer 107_ebook_purchases.sql via :
 *   1) Supabase Management API (si SUPABASE_ACCESS_TOKEN + SUPABASE_PROJECT_REF dispo)
 *   2) Sinon, affiche le SQL prêt à copier-coller dans le SQL Editor Supabase
 *
 * Vérifie ensuite que la table existe via PostgREST.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Charge .env.local
const envPath = path.resolve(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const SUPABASE_PROJECT_REF = process.env.SUPABASE_PROJECT_REF;

const migrationPath = path.resolve(__dirname, '..', 'supabase', 'migrations', '107_ebook_purchases.sql');
const sql = fs.readFileSync(migrationPath, 'utf8');

async function verifyTableExists() {
  const supa = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
  const { error } = await supa.from('ebook_purchases').select('stripe_session_id').limit(1);
  if (error) {
    if (error.message.includes('does not exist') || error.code === 'PGRST205') {
      return { exists: false, error: error.message };
    }
    return { exists: false, error: error.message };
  }
  return { exists: true };
}

async function applyViaManagementAPI() {
  console.log(`→ Apply via Management API (project: ${SUPABASE_PROJECT_REF})…`);
  // Découpe par statement (chaque CREATE/ALTER/COMMENT séparément — multi-stmt no-op)
  // Strip comments + split on ';' top-level
  const statements = sql
    .split(/^BEGIN;|^COMMIT;/m)
    .join('')
    .split(/;\s*\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith('--'));

  let okCount = 0;
  for (const stmt of statements) {
    const cleanStmt = stmt.replace(/^--.*$/gm, '').trim();
    if (!cleanStmt) continue;
    const res = await fetch(
      `https://api.supabase.com/v1/projects/${SUPABASE_PROJECT_REF}/database/query`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${SUPABASE_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: cleanStmt + ';' }),
      }
    );
    if (!res.ok) {
      const txt = await res.text();
      console.error(`  ❌ Statement failed:\n${cleanStmt.slice(0, 200)}…\n→ ${txt}`);
      return false;
    }
    okCount++;
  }
  console.log(`  ✅ ${okCount} statements appliqués via Management API.`);
  return true;
}

function printManualInstructions() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  ⚠️  SUPABASE_ACCESS_TOKEN absent — apply manuel requis');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  1. Ouvre https://supabase.com/dashboard');
  console.log('  2. Projet → SQL Editor → New query');
  console.log('  3. Colle le SQL ci-dessous → Run');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log(sql);
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Puis relance ce script pour vérifier : node scripts/apply-ebook-migration-107.mjs');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

async function main() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY requis');
    process.exit(1);
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Migration 107 — ebook_purchases');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // 1) Check if already applied
  const pre = await verifyTableExists();
  if (pre.exists) {
    console.log('✅ Table ebook_purchases EXISTE déjà — migration no-op.');
    process.exit(0);
  }
  console.log(`⏳ Table absente (${pre.error?.slice(0, 80)})\n`);

  // 2) Try Management API
  if (SUPABASE_ACCESS_TOKEN && SUPABASE_PROJECT_REF) {
    const ok = await applyViaManagementAPI();
    if (ok) {
      const post = await verifyTableExists();
      if (post.exists) {
        console.log('\n✅ Table ebook_purchases créée et vérifiée.');
        process.exit(0);
      }
      console.error('\n⚠️  Statements OK mais table introuvable ?');
      process.exit(1);
    }
    process.exit(1);
  }

  // 3) Manual fallback
  printManualInstructions();
  process.exit(2);
}

main().catch((err) => {
  console.error('💥 Fatal :', err);
  process.exit(1);
});

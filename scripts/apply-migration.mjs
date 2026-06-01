#!/usr/bin/env node
/**
 * apply-migration.mjs — runner générique pour migrations Supabase.
 *
 * Pourquoi : le repo n'a pas de DB password. On applique les migrations via
 * la Management API (POST /v1/projects/{ref}/database/query). Cette API
 * accepte une string SQL par appel, mais traite l'ensemble comme une seule
 * transaction implicite et "silently no-op" certains statements quand on
 * envoie du multi-stmt (cas observé sur 102_coach_diagnostics : seul le
 * CREATE TABLE passait, les INDEX et COMMENT étaient ignorés).
 *
 * Solution : on découpe la migration en statements et on les envoie un par
 * un. Le marker custom `--@SPLIT@` (présent dans 102-105) est le splitter
 * canonique. Si absent (106-108), on retombe sur split par `;` end-of-line
 * (semicolon + newline) qui suffit pour les migrations mono-statement ou
 * sans subtilité (DO blocks, etc.).
 *
 * Usage :
 *   node scripts/apply-migration.mjs 108_push_subscriptions_hygiene.sql
 *   node scripts/apply-migration.mjs --dry-run 108_push_subscriptions_hygiene.sql
 *   node scripts/apply-migration.mjs --file path/abs/to/custom.sql
 *
 * Auth :
 *   1. SUPABASE_ACCESS_TOKEN env (priorité)
 *   2. SUPABASE_ACCESS_TOKEN dans .env.local
 *   3. macOS Keychain entry "Supabase CLI" (fallback dev local)
 *
 * Project ref :
 *   1. SUPABASE_PROJECT_REF env
 *   2. Extrait de SUPABASE_URL ou REACT_APP_SUPABASE_URL (.env.local)
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// ── Args ─────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
let filePath = null;
const fileFlag = args.indexOf('--file');
if (fileFlag !== -1) {
  filePath = args[fileFlag + 1];
} else {
  const positional = args.filter((a) => !a.startsWith('--'));
  if (positional[0]) {
    filePath = path.isAbsolute(positional[0])
      ? positional[0]
      : path.join(ROOT, 'supabase', 'migrations', positional[0]);
  }
}
if (!filePath) {
  console.error('Usage : node scripts/apply-migration.mjs <NNN_name.sql> [--dry-run]');
  process.exit(1);
}
if (!fs.existsSync(filePath)) {
  console.error(`❌ Migration introuvable : ${filePath}`);
  process.exit(1);
}

// ── Env load ─────────────────────────────────────────────────────────────
const envFile = path.join(ROOT, '.env.local');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

// ── Token resolve ────────────────────────────────────────────────────────
function resolveToken() {
  if (process.env.SUPABASE_ACCESS_TOKEN) return process.env.SUPABASE_ACCESS_TOKEN;
  if (process.platform === 'darwin') {
    try {
      const raw = execSync('security find-generic-password -s "Supabase CLI" -w 2>/dev/null', {
        encoding: 'utf8',
      }).trim();
      const decoded = raw.startsWith('go-keyring-base64:')
        ? Buffer.from(raw.replace('go-keyring-base64:', ''), 'base64').toString('utf8')
        : raw;
      if (decoded) return decoded;
    } catch {
      /* keychain miss, no-op */
    }
  }
  return null;
}

function resolveProjectRef() {
  if (process.env.SUPABASE_PROJECT_REF) return process.env.SUPABASE_PROJECT_REF;
  const url = process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL || '';
  const m = url.match(/https:\/\/([a-z0-9]+)\.supabase\.co/);
  return m ? m[1] : null;
}

const ACCESS_TOKEN = resolveToken();
const PROJECT_REF = resolveProjectRef();

if (!DRY_RUN && (!ACCESS_TOKEN || !PROJECT_REF)) {
  console.error('❌ Auth manquante :');
  console.error('   SUPABASE_ACCESS_TOKEN :', ACCESS_TOKEN ? '✔ (loaded)' : '✗ MANQUANT');
  console.error('   SUPABASE_PROJECT_REF  :', PROJECT_REF || '✗ MANQUANT');
  console.error('\n   Set via : export SUPABASE_ACCESS_TOKEN=xxx');
  console.error('   Ou stocker dans macOS Keychain (service name: "Supabase CLI").');
  process.exit(2);
}

// ── Split logic ──────────────────────────────────────────────────────────
const sql = fs.readFileSync(filePath, 'utf8');
const SPLIT_MARKER = /^\s*--@SPLIT@\s*$/m;
const hasMarker = SPLIT_MARKER.test(sql);

function splitStatements(text) {
  if (hasMarker) {
    // Split canonique : marker custom inserted by author.
    return text
      .split(/^\s*--@SPLIT@\s*$/m)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }
  // Fallback legacy : split sur ";" suivi de newline. Pas idéal pour les DO
  // blocks ou les fonctions PL/pgSQL qui contiennent des ";" internes, mais
  // marche pour 95% des migrations simples (CREATE TABLE, ALTER, etc.).
  return text
    .split(/;\s*\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map((s) => (s.endsWith(';') ? s : s + ';'));
}

// Strip lignes pure-comment d'un statement pour décider s'il est "vide".
function isNonEmptyStmt(stmt) {
  const stripped = stmt
    .split('\n')
    .filter((l) => !/^\s*--/.test(l) && l.trim().length > 0)
    .join('\n')
    .trim();
  return stripped.length > 0;
}

// Filtre les BEGIN;/COMMIT;/ROLLBACK; standalone : envoyés un par un via
// l'API, ils n'ont aucun effet (chaque appel = sa propre transaction
// implicite). En les laissant on créerait juste du bruit. Si la migration
// a vraiment besoin d'une transaction multi-stmt, utiliser --@SPLIT@ et
// regrouper les stmts dans un seul bloc DO $$ ... $$.
function isTransactionPragma(stmt) {
  const s = stmt.replace(/--.*$/gm, '').trim().replace(/;$/, '').toUpperCase();
  return s === 'BEGIN' || s === 'COMMIT' || s === 'ROLLBACK' || s === 'START TRANSACTION';
}

const statements = splitStatements(sql).filter(isNonEmptyStmt).filter((s) => {
  if (isTransactionPragma(s)) {
    const stripped = s.replace(/--.*$/gm, '').trim().replace(/;$/, '');
    console.log(`  ⓘ skip transaction pragma : ${stripped}`);
    return false;
  }
  return true;
});

// ── Display plan ─────────────────────────────────────────────────────────
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`  Migration : ${path.basename(filePath)}`);
console.log(`  Splitter  : ${hasMarker ? '--@SPLIT@ marker' : 'fallback ;\\n'}`);
console.log(`  Statements: ${statements.length}`);
console.log(`  Mode      : ${DRY_RUN ? 'DRY-RUN (aucun envoi)' : 'APPLY → ' + PROJECT_REF}`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

if (DRY_RUN) {
  statements.forEach((s, i) => {
    const preview = s.split('\n').find((l) => l.trim().length > 0 && !l.trim().startsWith('--')) || s;
    console.log(`  [${String(i + 1).padStart(2, '0')}] ${preview.trim().slice(0, 110)}`);
  });
  console.log('\n✅ Dry-run OK. Relance sans --dry-run pour appliquer.');
  process.exit(0);
}

// ── Apply ────────────────────────────────────────────────────────────────
const url = `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`;
let ok = 0;
let failed = 0;

for (const [idx, stmt] of statements.entries()) {
  const preview = stmt.split('\n').find((l) => l.trim().length > 0 && !l.trim().startsWith('--')) || stmt;
  process.stdout.write(`  [${String(idx + 1).padStart(2, '0')}/${statements.length}] ${preview.trim().slice(0, 80)} … `);

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: stmt }),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => '<unreadable>');
    console.log('❌');
    console.error(`     → HTTP ${res.status} : ${txt.slice(0, 240)}`);
    failed++;
    // Fail-fast : si le stmt N rate, on n'applique pas N+1 (sécurité).
    // Pour les migrations idempotentes (IF NOT EXISTS partout) c'est OK
    // de relancer.
    break;
  } else {
    console.log('✓');
    ok++;
  }
}

console.log(`\n${failed === 0 ? '✅' : '⚠️ '} Done — ${ok} ok, ${failed} failed (${statements.length} total).`);
process.exit(failed === 0 ? 0 : 1);

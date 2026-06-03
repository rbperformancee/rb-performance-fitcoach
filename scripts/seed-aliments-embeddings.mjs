#!/usr/bin/env node
/**
 * Seed aliments_local table with embeddings from LOCAL_FOODS (CIQUAL).
 *
 * Usage :
 *   node scripts/seed-aliments-embeddings.mjs           # seed manquants
 *   node scripts/seed-aliments-embeddings.mjs --force   # re-embed tout
 *
 * Pre-requis :
 *   - Migration 043 appliquee (extension vector + table aliments_local)
 *   - SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY dans .env.local
 *   - AI_GATEWAY_API_KEY dans .env.local (Vercel AI Gateway)
 *
 * Modele : openai/text-embedding-3-small (1536 dims)
 * Batch  : 100 inputs par appel embedMany (~5s pour 456 entrees)
 * Cout   : ~0.0006$ pour 456 entrees, negligeable
 */

import { createClient } from '@supabase/supabase-js';
import { embedMany } from 'ai';
import { LOCAL_FOODS, TYPICAL_WEIGHTS_PER_PIECE } from '../src/lib/foodDatabase.js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const FORCE = process.argv.includes('--force');
const EMBEDDING_MODEL = 'openai/text-embedding-3-small';
const BATCH_SIZE = 100;

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const AI_GATEWAY_KEY = process.env.AI_GATEWAY_API_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}
if (!AI_GATEWAY_KEY) {
  console.error('Missing AI_GATEWAY_API_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// Slugify pour generer un id stable et lisible
// Gere les ligatures FR : Œ/œ -> oe, Æ/æ -> ae
function slugify(str) {
  return str
    .toLowerCase()
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// Texte enrichi pour l'embedding : nom + keywords (booste les matches semantiques)
function buildEmbeddingText(food) {
  const kw = (food._kw || []).join(', ');
  return kw ? `${food.name} (${kw})` : food.name;
}

async function existingIds() {
  const { data, error } = await supabase
    .from('aliments_local')
    .select('id, embedding_model');
  if (error) throw error;
  const map = new Map();
  for (const row of data || []) {
    map.set(row.id, row.embedding_model);
  }
  return map;
}

async function seedBatch(foods) {
  const values = foods.map(buildEmbeddingText);
  const { embeddings } = await embedMany({
    model: EMBEDDING_MODEL,
    values,
  });

  const rows = foods.map((food, i) => {
    const id = slugify(food.name);
    return {
      id,
      name: food.name,
      brand: food.brand || '',
      calories: food.calories,
      proteines: food.proteines,
      glucides: food.glucides,
      lipides: food.lipides,
      fibres: food.fibres ?? null,
      sodium: food.sodium ?? null,
      keywords: food._kw || [],
      typical_weight_g: TYPICAL_WEIGHTS_PER_PIECE[id] ?? null,
      embedding: embeddings[i],
      embedding_model: EMBEDDING_MODEL,
    };
  });

  const { error } = await supabase
    .from('aliments_local')
    .upsert(rows, { onConflict: 'id' });
  if (error) throw error;
  return rows.length;
}

async function main() {
  console.log(`[seed] ${LOCAL_FOODS.length} entrees CIQUAL a traiter`);

  const existing = await existingIds();
  console.log(`[seed] ${existing.size} deja en base`);

  // Filtrer les entrees a (re)embedder
  const todo = LOCAL_FOODS.filter((food) => {
    const id = slugify(food.name);
    if (FORCE) return true;
    if (!existing.has(id)) return true;
    if (existing.get(id) !== EMBEDDING_MODEL) return true;
    return false;
  });

  console.log(`[seed] ${todo.length} a (re)traiter ${FORCE ? '(--force)' : ''}`);
  if (todo.length === 0) {
    console.log('[seed] tout est deja a jour');
    return;
  }

  let processed = 0;
  for (let i = 0; i < todo.length; i += BATCH_SIZE) {
    const batch = todo.slice(i, i + BATCH_SIZE);
    const t0 = Date.now();
    const count = await seedBatch(batch);
    processed += count;
    const dt = Date.now() - t0;
    console.log(`[seed] ${processed}/${todo.length} (+${count} en ${dt}ms)`);
  }

  console.log(`[seed] termine, ${processed} aliments embedded`);
}

main().catch((err) => {
  console.error('[seed] ERREUR:', err);
  process.exit(1);
});

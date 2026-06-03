#!/usr/bin/env node
/**
 * Test du pipeline de parsing sans passer par l'API HTTP.
 *
 * Usage :
 *   node scripts/test-recipe-parse.mjs path/to/recipe.pdf
 *   node scripts/test-recipe-parse.mjs path/to/recipe.pdf --json   # output JSON brut
 *   node scripts/test-recipe-parse.mjs path/to/recipe.pdf --no-match  # parse only, skip ingredient matching
 *
 * Pre-requis :
 *   - npm i ai dotenv
 *   - Migration 042 + 043 appliquees
 *   - scripts/seed-aliments-embeddings.mjs deja tourne (sinon matching = 0%)
 *   - .env.local avec SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY + AI_GATEWAY_API_KEY
 *
 * Ne touche AUCUNE table : c'est juste un test du pipeline.
 */

import { readFile } from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';
import {
  parsePdfAuto,
  matchIngredient,
  computeIngredientMacros,
  computeRecipeMacros,
} from '../api/_recipe-helpers.mjs';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const args = process.argv.slice(2);
const pdfPath = args.find((a) => !a.startsWith('--'));
const wantJson = args.includes('--json');
const skipMatch = args.includes('--no-match');

if (!pdfPath) {
  console.error('Usage: node scripts/test-recipe-parse.mjs <path/to/recipe.pdf> [--json] [--no-match]');
  process.exit(1);
}

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const AI_GATEWAY_KEY = process.env.AI_GATEWAY_API_KEY;

if (!AI_GATEWAY_KEY) {
  console.error('Missing AI_GATEWAY_API_KEY in env');
  process.exit(1);
}
if (!skipMatch && (!SUPABASE_URL || !SERVICE_KEY)) {
  console.error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (use --no-match to skip)');
  process.exit(1);
}

const supabase = !skipMatch
  ? createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null;

const log = wantJson ? () => {} : (...a) => console.log(...a);

async function main() {
  log(`\n📄 Lecture du PDF : ${pdfPath}`);
  const pdfBuffer = await readFile(pdfPath);
  log(`   Taille : ${(pdfBuffer.length / 1024).toFixed(1)} KB\n`);

  log('🤖 Parsing via Claude Vision (auto-route single/plan)...');
  const result = await parsePdfAuto(pdfBuffer);

  if (!result.ok) {
    console.error(`\n❌ Parsing failed: ${result.error}`);
    process.exit(1);
  }

  log(`✅ Parse OK en ${result.durationMs}ms · mode=${result.mode} · ${result.totalPages}p · ${result.recipes.length} recette(s) · ${result.chunkCount} chunk(s) · model=${result.model}`);
  if (result.errors?.length) {
    log(`⚠️  ${result.errors.length} chunk(s) en erreur (recettes peut-etre incompletes)`);
  }
  log('');

  const allEnriched = [];
  let globalTotal = 0;
  let globalMatched = 0;

  for (let r = 0; r < result.recipes.length; r++) {
    const recipe = result.recipes[r];
    log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    log(`📌 [${r + 1}/${result.recipes.length}] ${recipe.title}`);
    if (recipe.description) log(`   ${recipe.description}`);
    log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    log(`Portions : ${recipe.servings}`);
    if (recipe.prep_time_min) log(`Prep     : ${recipe.prep_time_min} min`);
    if (recipe.cook_time_min) log(`Cuisson  : ${recipe.cook_time_min} min`);
    if (recipe.difficulty) log(`Diff.    : ${recipe.difficulty}`);
    if (recipe.meal_types?.length) log(`Repas    : ${recipe.meal_types.join(', ')}`);
    if (recipe.dietary_flags?.length) log(`Regime   : ${recipe.dietary_flags.join(', ')}`);
    if (recipe.tags?.length) log(`Tags     : ${recipe.tags.join(', ')}`);
    log('');

    log('🥘 Ingrédients :');
    const enriched = [];
    for (let i = 0; i < recipe.ingredients.length; i++) {
      const ing = recipe.ingredients[i];
      let match = null;
      let macros = { quantity_g: null, calories: null, proteines: null, glucides: null, lipides: null, fibres: null };

      if (!skipMatch) {
        match = await matchIngredient(supabase, ing.name);
        if (match) {
          macros = computeIngredientMacros(match, ing.quantity, ing.unit);
        }
      }

      enriched.push({ ...ing, match, macros });

      const conf = match ? `${(match.similarity * 100).toFixed(0)}%` : '—';
      const matchedName = match ? match.name : '(unmatched)';
      const confEmoji = !match ? '❓' : match.similarity >= 0.85 ? '🟢' : match.similarity >= 0.65 ? '🟡' : '🔴';
      const qtyStr = ing.quantity != null ? `${ing.quantity}${ing.unit ? ' ' + ing.unit : 'g'}` : '?';
      const macroStr = macros.calories != null
        ? `${macros.calories} kcal · ${macros.proteines}p ${macros.glucides}g ${macros.lipides}l`
        : '—';

      log(`  ${(i + 1).toString().padStart(2)}. ${confEmoji} ${ing.name.padEnd(38)} ${qtyStr.padStart(10)}  ${macroStr}`);
      log(`      └─ raw: "${ing.raw_text}"`);
      log(`      └─ match: ${matchedName} (${conf})`);
    }
    log('');

    if (!skipMatch) {
      const ingForCalc = enriched.filter((e) => e.macros.calories != null).map((e) => e.macros);
      const totals = computeRecipeMacros(ingForCalc, recipe.servings);
      log(`📊 Macros / portion : ${totals.calories} kcal · ${totals.proteines}g prot · ${totals.glucides}g glu · ${totals.lipides}g lip`);
      const matched = enriched.filter((e) => e.match).length;
      log(`🎯 Match : ${matched}/${enriched.length} (${Math.round(100 * matched / enriched.length)}%)`);
      globalTotal += enriched.length;
      globalMatched += matched;
    }

    if (recipe.instructions) {
      log('📝 Instructions :');
      log(recipe.instructions.split('\n').map((l) => '   ' + l).join('\n'));
    }
    log('');

    allEnriched.push({ recipe, ingredients: enriched });
  }

  if (!skipMatch && result.recipes.length > 1) {
    log('═══════════════════════════════════════════');
    log(`📈 GLOBAL : ${globalMatched}/${globalTotal} ingrédients matchés (${Math.round(100 * globalMatched / globalTotal)}%) sur ${result.recipes.length} recettes`);
    log('═══════════════════════════════════════════');
  }

  if (wantJson) {
    process.stdout.write(JSON.stringify({
      mode: result.mode,
      recipes: allEnriched,
      timing: { parse_ms: result.durationMs, model: result.model, chunks: result.chunkCount },
    }, null, 2));
  }
}

main().catch((err) => {
  console.error('\n❌ Erreur :', err);
  process.exit(1);
});

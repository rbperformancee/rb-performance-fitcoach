/**
 * PATCH /api/recipes/update?id=<recipe_id>
 *
 * Met a jour les champs editables d'une recette + optionnellement ses
 * ingredients (en bulk). Recalcule les macros si les ingredients changent.
 * Marque parsing_status='published' si fournis.
 *
 * Body :
 *   {
 *     title?, description?, servings?, prep_time_min?, cook_time_min?,
 *     difficulty?, meal_types?, tags?, dietary_flags?, instructions?,
 *     ingredients?: [{ id?, position, ingredient_name, quantity, unit, food_match_id? }]
 *     publish?: boolean
 *   }
 *
 * Auth : Bearer token coach (RLS verifie ownership).
 */

import { createClient } from '@supabase/supabase-js';
import {
  matchIngredient,
  computeIngredientMacros,
  computeRecipeMacros,
} from '../_recipe-helpers.mjs';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY;

export default async function handler(req, res) {
  if (req.method !== 'PATCH' && req.method !== 'POST') {
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const id = req.query?.id;
  if (!id) return res.status(400).json({ error: 'id_required' });

  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'no_token' });

  // 1. Verifier l'ownership via anon client + token (RLS)
  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: existing, error: ownErr } = await userClient
    .from('recipes')
    .select('id, coach_id, servings')
    .eq('id', id)
    .maybeSingle();

  if (ownErr || !existing) {
    return res.status(404).json({ error: 'not_found_or_no_access' });
  }

  // 2. Service-role pour les operations bulk (insert/update ingredients)
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const {
    title, description, servings, prep_time_min, cook_time_min, difficulty,
    meal_types, tags, dietary_flags, instructions, photo_url,
    ingredients, publish,
  } = req.body || {};

  const recipeUpdates = {};
  if (title !== undefined) recipeUpdates.title = title;
  if (description !== undefined) recipeUpdates.description = description;
  if (servings !== undefined) recipeUpdates.servings = servings;
  if (prep_time_min !== undefined) recipeUpdates.prep_time_min = prep_time_min;
  if (cook_time_min !== undefined) recipeUpdates.cook_time_min = cook_time_min;
  if (difficulty !== undefined) recipeUpdates.difficulty = difficulty;
  if (meal_types !== undefined) recipeUpdates.meal_types = meal_types;
  if (tags !== undefined) recipeUpdates.tags = tags;
  if (dietary_flags !== undefined) recipeUpdates.dietary_flags = dietary_flags;
  if (instructions !== undefined) recipeUpdates.instructions = instructions;
  if (photo_url !== undefined) recipeUpdates.photo_url = photo_url;

  // 3. Si ingredients fournis, on remplace tous (delete + insert)
  let recomputedMacros = null;
  if (Array.isArray(ingredients)) {
    // Delete existing
    await supabase.from('recipe_ingredients').delete().eq('recipe_id', id);

    // Re-match + compute macros pour chaque
    const ingRows = [];
    for (let i = 0; i < ingredients.length; i++) {
      const ing = ingredients[i];
      let match = null;
      if (ing.food_match_id) {
        // Coach a deja choisi un match precis -> on l'utilise direct
        const { data: aliment } = await supabase
          .from('aliments_local')
          .select('id, name, calories, proteines, glucides, lipides, fibres, typical_weight_g')
          .eq('id', ing.food_match_id)
          .maybeSingle();
        if (aliment) {
          match = {
            source: 'local_ciqual',
            id: aliment.id,
            name: aliment.name,
            calories: aliment.calories,
            proteines: aliment.proteines,
            glucides: aliment.glucides,
            lipides: aliment.lipides,
            fibres: aliment.fibres,
            typical_weight_g: aliment.typical_weight_g,
            similarity: 1.0,
          };
        }
      } else if (ing.ingredient_name) {
        // Re-match via embeddings
        match = await matchIngredient(supabase, ing.ingredient_name);
      }

      const macros = match
        ? computeIngredientMacros(match, ing.quantity, ing.unit)
        : { quantity_g: null, calories: null, proteines: null, glucides: null, lipides: null, fibres: null };

      ingRows.push({
        recipe_id: id,
        position: ing.position ?? i,
        raw_text: ing.raw_text ?? null,
        ingredient_name: ing.ingredient_name,
        quantity: ing.quantity ?? null,
        unit: ing.unit ?? null,
        food_match_source: match ? match.source : 'unmatched',
        food_match_id: match ? match.id : null,
        food_match_name: match ? match.name : null,
        match_confidence: match ? match.similarity : null,
        calories: macros.calories,
        proteines: macros.proteines,
        glucides: macros.glucides,
        lipides: macros.lipides,
        fibres: macros.fibres,
        coach_overridden: !!ing.food_match_id,
      });
    }

    if (ingRows.length > 0) {
      const { error: insErr } = await supabase.from('recipe_ingredients').insert(ingRows);
      if (insErr) {
        return res.status(500).json({ error: 'ingredients_insert_failed', details: insErr.message });
      }
    }

    const targetServings = servings ?? existing.servings ?? 1;
    recomputedMacros = computeRecipeMacros(ingRows, targetServings);
    recipeUpdates.macros_per_serving = recomputedMacros;
  }

  // 4. Publish ?
  if (publish === true) {
    recipeUpdates.parsing_status = 'published';
    recipeUpdates.published_at = new Date().toISOString();
  }

  // 5. Apply recipe updates
  if (Object.keys(recipeUpdates).length > 0) {
    const { error: updErr } = await supabase
      .from('recipes')
      .update(recipeUpdates)
      .eq('id', id);
    if (updErr) {
      return res.status(500).json({ error: 'recipe_update_failed', details: updErr.message });
    }
  }

  // 6. Audit
  const { data: { user } } = await userClient.auth.getUser();
  await supabase.from('recipe_audit').insert({
    recipe_id: id,
    actor_email: user?.email ?? null,
    action: publish ? 'published' : 'edited',
    diff: { ...recipeUpdates, ingredients_count: Array.isArray(ingredients) ? ingredients.length : null },
  });

  // 7. Return full recipe
  const { data: full } = await supabase
    .from('recipes')
    .select('*, recipe_ingredients(*)')
    .eq('id', id)
    .single();

  if (full?.recipe_ingredients) {
    full.recipe_ingredients.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  }

  return res.status(200).json({ recipe: full });
}

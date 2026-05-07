/**
 * POST /api/recipes/generate-variant
 *
 * Genere une variante d'une recette existante via Claude.
 * Body : { recipe_id, variant_type: 'low-carb'|'vegan'|'gluten-free'|'high-protein'|'lactose-free' }
 *
 * Le LLM recoit la recette source et reformule pour matcher le regime cible.
 * Le resultat est insere comme nouvelle recipe avec parent_recipe_id = source.
 *
 * Auth : Bearer token coach (verifie ownership via RLS).
 */

import { createClient } from '@supabase/supabase-js';
import { generateObject } from 'ai';
import {
  RecipeSchema,
  matchIngredient,
  computeIngredientMacros,
  computeRecipeMacros,
} from '../_recipe-helpers.mjs';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY;

const VARIANT_LABELS = {
  'low-carb': 'pauvre en glucides (low-carb)',
  'vegan': 'vegan (zero produit animal)',
  'gluten-free': 'sans gluten',
  'high-protein': 'haute proteines (>30g/portion)',
  'lactose-free': 'sans lactose',
  'keto': 'cetogene (keto)',
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });

  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'no_token' });

  const { recipe_id, variant_type } = req.body || {};
  if (!recipe_id || !variant_type) return res.status(400).json({ error: 'missing_fields' });
  if (!VARIANT_LABELS[variant_type]) return res.status(400).json({ error: 'invalid_variant_type' });

  // 1. Verifier ownership
  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: source, error: srcErr } = await userClient
    .from('recipes')
    .select(`
      id, coach_id, scope, title, description, servings,
      meal_types, dietary_flags,
      recipe_ingredients(position, ingredient_name, quantity, unit, raw_text)
    `)
    .eq('id', recipe_id)
    .maybeSingle();

  if (srcErr || !source) return res.status(404).json({ error: 'not_found_or_no_access' });

  const { data: { user } } = await userClient.auth.getUser();

  // 2. Build prompt + call LLM
  const sourceJson = {
    title: source.title,
    description: source.description,
    servings: source.servings,
    ingredients: (source.recipe_ingredients || [])
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
      .map((i) => ({
        name: i.ingredient_name,
        quantity: i.quantity,
        unit: i.unit,
      })),
  };

  const prompt = `Voici une recette source en JSON :
${JSON.stringify(sourceJson, null, 2)}

Mission : cree une VARIANTE ${VARIANT_LABELS[variant_type]} de cette recette.

Regles :
1. Garde le meme contexte (meme repas, meme cible nutritionnelle quand possible).
2. Substitue les ingredients incompatibles par des equivalents (ex pour vegan : oeufs -> tofu, viande -> proteine vegetale, lait -> lait d'amande...).
3. Ajuste les quantites pour conserver des macros similaires si possible.
4. Le titre doit refleter la variante : "<titre source> (${variant_type})".
5. Ajoute "${variant_type}" dans dietary_flags.
6. Tags : reprends les tags pertinents + ajoute "variante".
7. Garde des instructions coherentes avec les nouveaux ingredients.

Sors UNIQUEMENT la nouvelle recette en JSON structure.`;

  let parsed;
  try {
    const result = await generateObject({
      model: 'anthropic/claude-sonnet-4-6',
      schema: RecipeSchema,
      messages: [{ role: 'user', content: prompt }],
    });
    parsed = result.object;
  } catch (err) {
    return res.status(500).json({ error: 'llm_failed', details: err.message });
  }

  // 3. Service role pour insert
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // 4. Insert nouvelle recipe (variant)
  const { data: newRecipe, error: insErr } = await supabase
    .from('recipes')
    .insert({
      coach_id: source.coach_id,
      scope: source.scope,
      parent_recipe_id: source.id,
      title: parsed.title,
      description: parsed.description ?? null,
      source_origin: `variant_${variant_type}`,
      servings: parsed.servings,
      prep_time_min: parsed.prep_time_min ?? null,
      cook_time_min: parsed.cook_time_min ?? null,
      difficulty: parsed.difficulty ?? null,
      meal_types: parsed.meal_types ?? source.meal_types ?? [],
      tags: [...(parsed.tags ?? []), 'variante', variant_type],
      dietary_flags: Array.from(new Set([...(parsed.dietary_flags ?? []), variant_type])),
      instructions: parsed.instructions ?? null,
      parsing_status: 'needs_review',
    })
    .select('id')
    .single();

  if (insErr || !newRecipe) {
    return res.status(500).json({ error: 'insert_failed', details: insErr?.message });
  }

  // 5. Match + insert ingredients
  const ingRows = [];
  for (let i = 0; i < parsed.ingredients.length; i++) {
    const ing = parsed.ingredients[i];
    const match = await matchIngredient(supabase, ing.name);
    const macros = match
      ? computeIngredientMacros(match, ing.quantity, ing.unit)
      : { quantity_g: null, calories: null, proteines: null, glucides: null, lipides: null, fibres: null };
    ingRows.push({
      recipe_id: newRecipe.id,
      position: i,
      raw_text: ing.raw_text ?? null,
      ingredient_name: ing.name,
      quantity: ing.quantity,
      unit: ing.unit,
      food_match_source: match ? match.source : 'unmatched',
      food_match_id: match ? match.id : null,
      food_match_name: match ? match.name : null,
      match_confidence: match ? match.similarity : null,
      calories: macros.calories,
      proteines: macros.proteines,
      glucides: macros.glucides,
      lipides: macros.lipides,
      fibres: macros.fibres,
    });
  }

  if (ingRows.length > 0) {
    await supabase.from('recipe_ingredients').insert(ingRows);
  }

  // 6. Recompute macros + update recipe
  const macros = computeRecipeMacros(ingRows, parsed.servings);
  await supabase
    .from('recipes')
    .update({ macros_per_serving: macros })
    .eq('id', newRecipe.id);

  // 7. Audit
  await supabase.from('recipe_audit').insert({
    recipe_id: newRecipe.id,
    actor_email: user?.email ?? null,
    action: 'variant_generated',
    diff: { source_id: source.id, variant_type },
  });

  // 8. Return full new recipe
  const { data: full } = await supabase
    .from('recipes')
    .select('*, recipe_ingredients(*)')
    .eq('id', newRecipe.id)
    .single();

  if (full?.recipe_ingredients) {
    full.recipe_ingredients.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  }

  return res.status(200).json({ recipe: full });
}

/**
 * POST /api/recipes/create
 *
 * Coach uploads a PDF (already in Supabase Storage at recipes/<coach_id>/<slug>.pdf)
 * and we run the full parse pipeline synchronously:
 *   1. Download PDF from storage
 *   2. Claude Vision extracts structured recipe + ingredients
 *   3. Each ingredient is matched against aliments_local via cosine pgvector
 *   4. Macros are computed per ingredient + per serving
 *   5. Insert into recipes + recipe_ingredients
 *   6. Return the full recipe (parsing_status='needs_review')
 *
 * Body :
 *   {
 *     pdf_path: string  // ex: "<coach_id>/<filename>.pdf" (relative to recipes/ bucket)
 *     title?: string    // override (sinon le LLM extrait)
 *     scope?: 'coach' | 'global'  // defaut 'coach'
 *   }
 *
 * Auth : Bearer token JWT du coach. On verifie que coach.email match le JWT
 * et que pdf_path commence par <coach_id>/.
 *
 * Timeout Vercel : 300s par defaut sur Fluid Compute. Suffisant pour le parsing
 * (~10-30s).
 */

import { createClient } from '@supabase/supabase-js';
import {
  parsePdfAuto,
  matchIngredient,
  computeIngredientMacros,
  computeRecipeMacros,
} from '../_recipe-helpers.mjs';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'no_token' });

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // 1. Verify token and get coach
  const { data: userData, error: userErr } = await supabase.auth.getUser(token);
  if (userErr || !userData?.user?.email) {
    return res.status(401).json({ error: 'invalid_token' });
  }
  const email = userData.user.email.toLowerCase();

  const { data: coach, error: coachErr } = await supabase
    .from('coaches')
    .select('id, email')
    .ilike('email', email)
    .maybeSingle();

  if (coachErr || !coach) {
    return res.status(403).json({ error: 'not_a_coach' });
  }

  // 2. Validate body
  const { pdf_path, title: titleOverride, scope: requestedScope = 'coach' } = req.body || {};
  if (!pdf_path || typeof pdf_path !== 'string') {
    return res.status(400).json({ error: 'pdf_path_required' });
  }
  // Path must start with <coach_id>/
  if (!pdf_path.startsWith(`${coach.id}/`)) {
    return res.status(403).json({ error: 'pdf_path_not_owned' });
  }
  // scope='global' reserve aux admins (env RECIPE_ADMIN_EMAILS, csv)
  const adminEmails = (process.env.RECIPE_ADMIN_EMAILS || '')
    .toLowerCase()
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const scope = requestedScope === 'global' && adminEmails.includes(email)
    ? 'global'
    : 'coach';

  // 3a. Insert stub row IMMÉDIATEMENT avec parsing_status='parsing'.
  // Permet à la liste /api/recipes/list de retourner la recette en cours
  // dès maintenant — le coach voit une carte grise "Parsing..." même s'il
  // navigue ailleurs et revient avant la fin du parse.
  const stubTitle = (titleOverride
    || pdf_path.split('/').pop()?.replace(/\.pdf$/i, '').replace(/^\d+-/, '').replace(/[_-]+/g, ' ')
    || 'Analyse en cours');
  const { data: stub, error: stubErr } = await supabase
    .from('recipes')
    .insert({
      coach_id: scope === 'global' ? null : coach.id,
      scope,
      title: stubTitle,
      pdf_url: pdf_path,
      source_origin: 'pdf_upload',
      servings: 1,
      parsing_status: 'parsing',
    })
    .select('id')
    .single();
  if (stubErr || !stub) {
    return res.status(500).json({ error: 'stub_insert_failed', details: stubErr?.message });
  }
  const stubId = stub.id;

  // 3b. Download PDF from storage
  const { data: pdfBlob, error: dlErr } = await supabase.storage
    .from('recipes')
    .download(pdf_path);

  if (dlErr || !pdfBlob) {
    await supabase.from('recipes').update({ parsing_status: 'failed', parsing_error: 'pdf_download_failed' }).eq('id', stubId);
    return res.status(500).json({ error: 'pdf_download_failed', details: dlErr?.message });
  }

  const pdfBuffer = Buffer.from(await pdfBlob.arrayBuffer());

  // 4. Parse via Claude Vision (auto-route single/plan)
  const parseResult = await parsePdfAuto(pdfBuffer);
  if (!parseResult.ok) {
    await supabase.from('recipes').update({ parsing_status: 'failed', parsing_error: parseResult.error?.slice(0, 500) }).eq('id', stubId);
    return res.status(500).json({ error: 'parsing_failed', details: parseResult.error });
  }

  const isPlan = parseResult.mode === 'plan';

  // 5. Si plan : creer le parent recipe_plans
  let planId = null;
  if (isPlan) {
    const { data: plan, error: planErr } = await supabase
      .from('recipe_plans')
      .insert({
        coach_id: coach.id,
        title: titleOverride || (parseResult.recipes[0]?.title ? `Plan ${parseResult.recipes[0].title.slice(0, 40)}...` : 'Plan nutritionnel'),
        pdf_url: pdf_path,
        page_count: parseResult.totalPages,
        recipes_extracted: parseResult.recipes.length,
        parsing_status: 'completed',
        parsing_metadata: {
          model: parseResult.model,
          chunk_count: parseResult.chunkCount,
          duration_ms: parseResult.durationMs,
          chunk_errors: parseResult.errors ?? null,
        },
      })
      .select('id')
      .single();

    if (planErr || !plan) {
      return res.status(500).json({ error: 'plan_insert_failed', details: planErr?.message });
    }
    planId = plan.id;
  }

  // Si plan : on ne réutilise PAS le stub (il deviendrait une recette
  // standalone, pas une entrée de plan). On le supprime — le plan + ses
  // children seront insérés comme avant.
  if (isPlan) {
    await supabase.from('recipes').delete().eq('id', stubId);
  }

  // 6. Insert (ou UPDATE pour la 1ère recette d'un single) chaque recette + ses ingredients
  const insertedRecipes = [];
  for (let r = 0; r < parseResult.recipes.length; r++) {
    const parsed = parseResult.recipes[r];

    // 6a. Match + compute macros pour les ingredients
    const ingredientRows = [];
    for (let i = 0; i < parsed.ingredients.length; i++) {
      const ing = parsed.ingredients[i];
      const match = await matchIngredient(supabase, ing.name);
      const macros = match
        ? computeIngredientMacros(match, ing.quantity, ing.unit)
        : { quantity_g: null, calories: null, proteines: null, glucides: null, lipides: null, fibres: null };

      ingredientRows.push({
        position: i,
        raw_text: ing.raw_text,
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
        sodium: null,
      });
    }

    const macrosPerServing = computeRecipeMacros(ingredientRows, parsed.servings);

    // 6b. Insert recipe — OU update le stub si c'est un single (r=0, !isPlan)
    const recipePayload = {
      coach_id: scope === 'global' ? null : coach.id,
      scope,
      parent_plan_id: planId,
      title: isPlan ? parsed.title : (titleOverride || parsed.title),
      description: parsed.description ?? null,
      pdf_url: pdf_path,
      source_origin: isPlan ? 'pdf_plan' : 'pdf_upload',
      servings: parsed.servings,
      prep_time_min: parsed.prep_time_min ?? null,
      cook_time_min: parsed.cook_time_min ?? null,
      difficulty: parsed.difficulty ?? null,
      meal_types: parsed.meal_types ?? [],
      tags: parsed.tags ?? [],
      dietary_flags: parsed.dietary_flags ?? [],
      instructions: parsed.instructions ?? null,
      macros_per_serving: macrosPerServing,
      parsing_status: 'needs_review',
      parsing_metadata: {
        model: parseResult.model,
        duration_ms: parseResult.durationMs,
        ingredient_count: ingredientRows.length,
        avg_confidence: avgConfidence(ingredientRows),
        plan_position: isPlan ? r : null,
      },
    };

    let recipe, insertErr;
    if (!isPlan && r === 0 && stubId) {
      // Single : UPDATE le stub (pas d'INSERT nouveau)
      ({ data: recipe, error: insertErr } = await supabase
        .from('recipes')
        .update(recipePayload)
        .eq('id', stubId)
        .select('id')
        .single());
    } else {
      ({ data: recipe, error: insertErr } = await supabase
        .from('recipes')
        .insert(recipePayload)
        .select('id')
        .single());
    }

    if (insertErr || !recipe) {
      console.error(`[recipes/create] recipe ${r} insert failed:`, insertErr);
      continue; // on continue le batch, on rapporte les echecs en fin
    }

    // 6c. Insert ingredients with recipe_id
    const ingRowsWithFk = ingredientRows.map((row) => ({ ...row, recipe_id: recipe.id }));
    const { error: ingErr } = await supabase.from('recipe_ingredients').insert(ingRowsWithFk);
    if (ingErr) {
      console.error(`[recipes/create] ingredients ${r} insert failed:`, ingErr);
    }

    // 6d. Audit
    await supabase.from('recipe_audit').insert({
      recipe_id: recipe.id,
      actor_email: email,
      action: 'parsed',
      diff: {
        model: parseResult.model,
        ingredient_count: ingredientRows.length,
        plan_position: isPlan ? r : null,
      },
    });

    insertedRecipes.push(recipe.id);
  }

  // 7. Fetch all inserted with ingredients for return
  const { data: full } = await supabase
    .from('recipes')
    .select('*, recipe_ingredients(*)')
    .in('id', insertedRecipes)
    .order('created_at', { ascending: true });

  return res.status(200).json({
    mode: parseResult.mode,
    plan_id: planId,
    total_pages: parseResult.totalPages,
    recipes_count: insertedRecipes.length,
    recipes: full || [],
  });
}

function avgConfidence(rows) {
  const valid = rows.filter((r) => r.match_confidence != null);
  if (valid.length === 0) return null;
  const sum = valid.reduce((s, r) => s + r.match_confidence, 0);
  return Math.round((sum / valid.length) * 100) / 100;
}

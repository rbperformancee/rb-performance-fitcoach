/**
 * GET /api/recipes/list
 *
 * Liste les recettes du coach connecte (groupees par plan si applicable).
 * Query params:
 *   - status : 'all' (defaut) | 'needs_review' | 'published'
 *   - limit : 50 par defaut
 *
 * Auth : Bearer token coach. RLS s'applique cote Postgres.
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
const ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY;

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'method_not_allowed' });
  }
  // Pas de cache navigateur — le statut peut changer (parsing → needs_review → published)
  // et le coach doit voir l'update instantanément.
  res.setHeader('Cache-Control', 'no-store, max-age=0');

  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'no_token' });

  const supabase = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const status = req.query?.status || 'all';
  const limit = Math.min(parseInt(req.query?.limit ?? '50', 10), 200);

  // Standalone recipes (parent_plan_id IS NULL)
  let recipesQ = supabase
    .from('recipes')
    .select(`
      id, title, description, photo_url, scope, parent_plan_id,
      servings, prep_time_min, cook_time_min, difficulty,
      meal_types, tags, dietary_flags, macros_per_serving,
      parsing_status, parsing_metadata, published_at, created_at
    `)
    .is('deleted_at', null)
    .is('parent_plan_id', null)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (status !== 'all') recipesQ = recipesQ.eq('parsing_status', status);

  const { data: standalone, error: rErr } = await recipesQ;
  if (rErr) return res.status(500).json({ error: 'list_recipes_failed', details: rErr.message });

  // Plans + recipes children
  const { data: plans, error: pErr } = await supabase
    .from('recipe_plans')
    .select(`
      id, title, pdf_url, page_count, recipes_extracted,
      parsing_status, created_at,
      recipes!recipes_parent_plan_id_fkey (
        id, title, description, scope, servings, meal_types, tags,
        dietary_flags, macros_per_serving, parsing_status, created_at
      )
    `)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (pErr) return res.status(500).json({ error: 'list_plans_failed', details: pErr.message });

  return res.status(200).json({
    standalone: standalone || [],
    plans: plans || [],
  });
}

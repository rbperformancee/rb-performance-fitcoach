/**
 * GET /api/recipes/get?id=<recipe_id>
 *
 * Fetches a recipe with ingredients. RLS enforces visibility :
 *   - coach owns it
 *   - OR scope=global et published
 *   - OR client de ce coach et published
 *
 * Auth : Bearer token. On utilise le anon client + token utilisateur,
 * donc les RLS policies (cf 042) decident de l'acces.
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
const ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY;

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const id = req.query?.id;
  if (!id) return res.status(400).json({ error: 'id_required' });

  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'no_token' });

  // Anon client + user JWT => RLS s'applique
  const supabase = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase
    .from('recipes')
    .select(`
      *,
      recipe_ingredients (
        id, position, raw_text, ingredient_name, quantity, unit,
        food_match_source, food_match_id, food_match_name, match_confidence,
        calories, proteines, glucides, lipides, fibres, coach_overridden
      )
    `)
    .eq('id', id)
    .maybeSingle();

  if (error) {
    return res.status(500).json({ error: 'fetch_failed', details: error.message });
  }
  if (!data) {
    return res.status(404).json({ error: 'not_found' });
  }

  // Order ingredients by position
  if (Array.isArray(data.recipe_ingredients)) {
    data.recipe_ingredients.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  }

  return res.status(200).json({ recipe: data });
}

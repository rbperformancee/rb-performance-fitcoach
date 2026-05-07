/**
 * POST /api/recipes/favorite     -> ajoute aux favoris
 * DELETE /api/recipes/favorite   -> retire des favoris
 *
 * Body : { recipe_id }
 * Auth : Bearer token client.
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
const ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY;

export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'DELETE') {
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'no_token' });

  const supabase = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user?.email) return res.status(401).json({ error: 'invalid_token' });

  const { data: client } = await supabase
    .from('clients')
    .select('id')
    .ilike('email', userData.user.email)
    .maybeSingle();

  if (!client) return res.status(403).json({ error: 'not_a_client' });

  const { recipe_id } = req.body || {};
  if (!recipe_id) return res.status(400).json({ error: 'recipe_id_required' });

  if (req.method === 'POST') {
    const { error } = await supabase
      .from('client_recipe_favorites')
      .insert({ client_id: client.id, recipe_id })
      .select();
    if (error && !error.message.includes('duplicate')) {
      return res.status(500).json({ error: 'fav_insert_failed', details: error.message });
    }
    return res.status(200).json({ favorited: true });
  }

  // DELETE
  const { error } = await supabase
    .from('client_recipe_favorites')
    .delete()
    .eq('client_id', client.id)
    .eq('recipe_id', recipe_id);
  if (error) {
    return res.status(500).json({ error: 'fav_delete_failed', details: error.message });
  }
  return res.status(200).json({ favorited: false });
}

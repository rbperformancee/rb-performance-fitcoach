/**
 * POST /api/recipes/add-to-meal
 *
 * Client logue une recette dans son repas. On injecte N lignes dans
 * nutrition_logs (1 par ingredient avec macros pre-calculees), et on
 * cree un recipe_meal_logs pour pouvoir "remove all" plus tard.
 *
 * Body :
 *   {
 *     recipe_id: uuid,
 *     date: "YYYY-MM-DD",
 *     meal_type: "Petit-dejeuner" | "Dejeuner" | "Collation" | "Diner",
 *     servings_count: number (defaut 1)
 *   }
 *
 * Auth : Bearer token client. RLS permet la lecture de la recette si
 * scope=global ou si la recette appartient au coach du client.
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'no_token' });

  // Parse rapide du JWT (pas de verif crypto cote serverless — on verifie
  // ensuite via getUser AVANT toute mutation). Permet de paralleliser les
  // requetes SELECT pendant que getUser tourne.
  let jwtEmail = null;
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
    jwtEmail = (payload?.email || '').toLowerCase();
  } catch { /* on validera quand meme via getUser */ }

  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { recipe_id, date, meal_type, servings_count = 1, ingredient_overrides } = req.body || {};

  if (!recipe_id || !date || !meal_type) {
    return res.status(400).json({ error: 'missing_fields' });
  }
  if (servings_count <= 0) {
    return res.status(400).json({ error: 'invalid_servings' });
  }
  // ingredient_overrides : array de { id, quantity } pour overrider les
  // quantites de la recette stockee. Permet au client d'ajuster avant logging.
  const overridesMap = new Map();
  if (Array.isArray(ingredient_overrides)) {
    for (const o of ingredient_overrides) {
      if (o && o.id && Number.isFinite(Number(o.quantity)) && Number(o.quantity) >= 0) {
        overridesMap.set(o.id, Number(o.quantity));
      }
    }
  }

  // Lance les 3 queries en parallele : auth verif + client lookup + recipe load.
  // Si jwtEmail n'est pas extractible, on attend getUser.
  const [userRes, clientRes, recipeRes] = await Promise.all([
    userClient.auth.getUser(),
    jwtEmail
      ? supabase.from('clients').select('id, email').ilike('email', jwtEmail).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from('recipes').select('id, title, servings, recipe_ingredients(*)').eq('id', recipe_id).maybeSingle(),
  ]);

  if (userRes.error || !userRes.data?.user?.email) {
    return res.status(401).json({ error: 'invalid_token' });
  }
  const verifiedEmail = userRes.data.user.email.toLowerCase();
  // Securite : si le JWT email ne correspond pas a l'email verifie, on
  // re-fetch le client avec le verifiedEmail (cas rare : JWT custom claims).
  let client = clientRes.data;
  if (!client || client.email?.toLowerCase() !== verifiedEmail) {
    const r = await supabase.from('clients').select('id, email').ilike('email', verifiedEmail).maybeSingle();
    client = r.data;
  }
  if (!client) return res.status(403).json({ error: 'not_a_client' });

  const recipe = recipeRes.data;
  if (!recipe) {
    return res.status(404).json({ error: 'recipe_not_accessible' });
  }

  // Calculer le ratio (servings_count / recipe.servings)
  const baseServings = Math.max(1, recipe.servings || 1);
  const ratio = servings_count / baseServings;

  const ingsToLog = (recipe.recipe_ingredients || []).filter((i) => i.calories != null && i.calories > 0);

  if (ingsToLog.length === 0) {
    return res.status(422).json({ error: 'recipe_has_no_macros', hint: 'recipe_ingredients have no computed calories' });
  }

  // Pour chaque ingredient : applique override de quantite si fourni, recompute
  // les macros selon le ratio (qty_finale / qty_origine), puis multiplie par
  // le ratio servings (servings_count / recipe.servings).
  const logRows = ingsToLog.map((i) => {
    const origQty = Number(i.quantity || 0);
    const overrideQty = overridesMap.has(i.id) ? overridesMap.get(i.id) : origQty;
    const ingrRatio = origQty > 0 ? overrideQty / origQty : 0;
    const finalRatio = ingrRatio * ratio;
    return {
      client_id: client.id,
      date,
      repas: meal_type,
      aliment: `${i.ingredient_name} (recette: ${recipe.title})`,
      calories: Math.round((i.calories || 0) * finalRatio),
      proteines: Number(((i.proteines || 0) * finalRatio).toFixed(2)),
      glucides: Number(((i.glucides || 0) * finalRatio).toFixed(2)),
      lipides: Number(((i.lipides || 0) * finalRatio).toFixed(2)),
      quantite_g: i.unit === 'g' || i.unit === 'ml' ? Number((overrideQty * ratio).toFixed(1)) : null,
      unit: i.unit === 'ml' ? 'ml' : 'g',
    };
  }).filter((r) => r.calories > 0); // skip ingredients à 0g

  // Pre-compute les totaux (avant l'INSERT pour pouvoir repondre vite).
  const totals = ingsToLog.reduce((acc, i) => {
    const origQty = Number(i.quantity || 0);
    const overrideQty = overridesMap.has(i.id) ? overridesMap.get(i.id) : origQty;
    const ingrRatio = origQty > 0 ? overrideQty / origQty : 0;
    const finalRatio = ingrRatio * ratio;
    return {
      calories: acc.calories + (i.calories || 0) * finalRatio,
      proteines: acc.proteines + (i.proteines || 0) * finalRatio,
      glucides: acc.glucides + (i.glucides || 0) * finalRatio,
      lipides: acc.lipides + (i.lipides || 0) * finalRatio,
    };
  }, { calories: 0, proteines: 0, glucides: 0, lipides: 0 });

  const { data: insertedLogs, error: logErr } = await supabase
    .from('nutrition_logs')
    .insert(logRows)
    .select('*');

  if (logErr) {
    return res.status(500).json({ error: 'logs_insert_failed', details: logErr.message });
  }

  // Repond au client TOUT DE SUITE — la recette s'affiche immediatement dans
  // l'app. Le bundle recipe_meal_logs (utilise pour "remove all" plus tard)
  // est insere en arriere-plan : non critique pour l'affichage.
  res.status(200).json({
    nutrition_log_ids: (insertedLogs || []).map((l) => l.id),
    inserted_logs: insertedLogs || [],
    totals: {
      calories: Math.round(totals.calories),
      proteines: Number(totals.proteines.toFixed(1)),
      glucides: Number(totals.glucides.toFixed(1)),
      lipides: Number(totals.lipides.toFixed(1)),
    },
  });

  // Fire-and-forget : le runtime serverless tient ce promise jusqu'a son
  // execution. waitUntil() serait plus correct mais la promesse est
  // suffisamment rapide pour que Vercel la termine avant l'eviction.
  supabase
    .from('recipe_meal_logs')
    .insert({
      client_id: client.id,
      recipe_id,
      date,
      meal_type,
      servings_count,
      recipe_title_snapshot: recipe.title,
      total_calories: Math.round(totals.calories),
      total_proteines: Number(totals.proteines.toFixed(1)),
      total_glucides: Number(totals.glucides.toFixed(1)),
      total_lipides: Number(totals.lipides.toFixed(1)),
      nutrition_log_ids: (insertedLogs || []).map((l) => l.id),
    })
    .then(({ error: bundleErr }) => {
      if (bundleErr) console.warn('[add-to-meal] bundle insert failed:', bundleErr.message);
    })
    .catch((e) => console.warn('[add-to-meal] bundle insert threw:', e?.message));
}

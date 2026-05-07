/**
 * Helpers cote serveur pour le parsing de recettes PDF.
 *
 * Pipeline :
 *   1. parsePdfToRecipe(pdfBuffer)        -> JSON structure Zod via Claude Vision
 *   2. matchIngredient(name)              -> recherche cosine pgvector (+ fallback Edamam)
 *   3. computeIngredientMacros(match, qty, unit) -> macros pour la quantite donnee
 *   4. computeRecipeMacros(ingredients, servings) -> macros par portion (cache cote DB)
 *
 * Modeles :
 *   - Vision : anthropic/claude-sonnet-4-6 (fallback opus-4-7 si echec)
 *   - Embeddings : openai/text-embedding-3-small (1536 dims)
 *
 * Erreurs : on renvoie systematiquement { ok, error } pour un handling propre
 * cote API. Pas de throw silencieux.
 */

import { generateObject, embed } from 'ai';
import { z } from 'zod';
import { PDFDocument } from 'pdf-lib';

const VISION_MODEL = 'anthropic/claude-sonnet-4-6';
const VISION_FALLBACK = 'anthropic/claude-opus-4-7';
const EMBEDDING_MODEL = 'openai/text-embedding-3-small';

// Au-dela de SINGLE_RECIPE_MAX_PAGES on traite le PDF comme un plan multi-recettes
// (1 PDF -> N recettes). Chunked par CHUNK_PAGES si la totalite ne tient pas dans
// la fenetre context Claude.
const SINGLE_RECIPE_MAX_PAGES = 2;
const CHUNK_PAGES = 4;

// =====================================================
// Schemas Zod (output structure du LLM)
// =====================================================

export const IngredientSchema = z.object({
  raw_text: z.string().describe("Le texte brut tel qu'ecrit dans le PDF, ex: '150g de blanc de poulet roti'"),
  name: z.string().describe("Nom normalise de l'ingredient sans la quantite, ex: 'Blanc de poulet roti'"),
  quantity: z.number().nullable().describe("Quantite numerique. null si non specifiee."),
  unit: z.string().nullable().describe("Unite : g, ml, piece, cuillere_soupe, cuillere_cafe, tasse, pincee, gousse. null si non specifiee."),
});

export const RecipeSchema = z.object({
  title: z.string(),
  description: z.string().nullable().optional(),
  servings: z.number().int().positive().describe("Nombre de portions. Defaut 1 si non specifie."),
  prep_time_min: z.number().int().nullable().optional(),
  cook_time_min: z.number().int().nullable().optional(),
  difficulty: z.enum(['facile', 'moyen', 'difficile']).nullable().optional(),
  meal_types: z.array(z.enum(['petit-dejeuner', 'dejeuner', 'collation', 'diner'])).default([]),
  tags: z.array(z.string()).default([]).describe("Tags libres : 'high-protein', 'meal-prep', 'rapide', 'post-workout'..."),
  dietary_flags: z.array(z.enum(['vegan', 'vegetarian', 'gluten-free', 'lactose-free', 'low-carb', 'high-protein', 'keto'])).default([]),
  ingredients: z.array(IngredientSchema).min(1),
  instructions: z.string().nullable().optional().describe("Instructions de preparation (markdown)"),
});

// Multi-recettes : un plan nutritionnel = N recettes
export const RecipePlanSchema = z.object({
  recipes: z.array(RecipeSchema).default([]).describe("Toutes les recettes/repas distincts trouves dans le document."),
});

// =====================================================
// 1. Parse PDF via Claude Vision
// =====================================================

const SYSTEM_PROMPT = `Tu es un expert en analyse de recettes culinaires francaises. Le coach uploade un PDF de recette ; tu extrais la structure complete avec PRECISION MAXIMALE.

REGLES STRICTES :
1. Chaque ingredient = UNE ligne distincte. Jamais "poulet et riz" sur la meme ligne.
2. Quantites en metrique (g, ml, piece, cuillere_soupe, cuillere_cafe, tasse, pincee, gousse). Si la recette dit "1 oignon", quantity=1, unit="piece".
3. Si une quantite est ambigue ("un peu de sel", "selon gout"), mets quantity=null et unit=null.
4. raw_text = copie EXACTE du texte tel qu'ecrit dans le PDF (utile pour audit / re-match).
5. Pour servings, cherche "Pour X personnes" / "X portions" / "Serves X". Defaut 1 si introuvable.
6. dietary_flags : deduits du contenu. "vegan" si zero produit animal. "keto" si tres pauvre en glucides. Sois conservateur, ne devine pas.
7. meal_types : choix multiple parmi les 4. Tu peux en choisir plusieurs (ex: ['dejeuner', 'diner']).
8. Si le PDF est foireux/illisible/n'est pas une recette, sors quand meme un objet valide avec un titre "RECETTE NON RECONNUE" et ingredients=[].`;

const PLAN_SYSTEM_PROMPT = `Tu es un expert en plans nutritionnels francais. Le coach uploade un PDF qui contient PLUSIEURS recettes / repas (plan nutritionnel hebdo, livret recettes, etc.).

Ta mission : extraire CHAQUE recette distincte comme un objet separe dans le tableau "recipes". Ne fusionne JAMAIS deux recettes. Si une page contient le petit-dejeuner ET le dejeuner, ce sont 2 recettes distinctes. Si une recette s'etale sur 2 pages, c'est une SEULE recette.

Pour chaque recette, applique les regles standard :
1. Chaque ingredient = UNE ligne distincte. Jamais "poulet et riz" sur la meme ligne.
2. Quantites en metrique (g, ml, piece, cuillere_soupe, cuillere_cafe, tasse, pincee, gousse).
3. raw_text = copie EXACTE du texte tel qu'ecrit dans le PDF.
4. servings : cherche "Pour X personnes" / portions. Defaut 1 si introuvable.
5. meal_types : selon le contexte du repas dans le plan (petit-dej, dejeuner, etc.).
6. tags : "snack", "post-workout", "rapide" si pertinent dans le contexte du plan.
7. dietary_flags : sois conservateur.

Si le document n'est pas un plan recettes (sommaire, contrat, page intro), retourne recipes=[].`;

/**
 * @param {Buffer|Uint8Array} pdfBuffer
 * @param {object} [opts]
 * @param {string} [opts.model] - override du modele
 * @returns {Promise<{ok: true, recipe: z.infer<typeof RecipeSchema>, model: string, durationMs: number} | {ok: false, error: string}>}
 */
export async function parsePdfToRecipe(pdfBuffer, opts = {}) {
  const t0 = Date.now();
  const pdfBase64 = Buffer.from(pdfBuffer).toString('base64');
  const model = opts.model || VISION_MODEL;

  try {
    const { object: recipe } = await generateObject({
      model,
      schema: RecipeSchema,
      system: SYSTEM_PROMPT,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'file',
            data: pdfBase64,
            mediaType: 'application/pdf',
          },
          {
            type: 'text',
            text: 'Extrais la structure complete de cette recette en JSON.',
          },
        ],
      }],
    });
    return { ok: true, recipe, model, durationMs: Date.now() - t0 };
  } catch (err) {
    // Fallback Opus si Sonnet a echoue (et qu'on n'avait pas deja Opus)
    if (model === VISION_MODEL && !opts._fallbackAttempted) {
      console.warn('[recipe-parser] Sonnet failed, fallback Opus:', err.message);
      return parsePdfToRecipe(pdfBuffer, { model: VISION_FALLBACK, _fallbackAttempted: true });
    }
    return { ok: false, error: err.message || 'parse failed', model, durationMs: Date.now() - t0 };
  }
}

// =====================================================
// 1bis. Multi-recipe plan parsing (PDF >= 3 pages)
// =====================================================

/**
 * Split un PDF en chunks de N pages chacun (N pdf-lib documents distincts).
 * Necessaire pour les plans multi-recettes qui depassent la fenetre Claude.
 *
 * @param {Buffer} pdfBuffer
 * @param {number} chunkSize - pages par chunk (defaut CHUNK_PAGES=4)
 * @returns {Promise<{chunks: Buffer[], totalPages: number}>}
 */
export async function splitPdfIntoChunks(pdfBuffer, chunkSize = CHUNK_PAGES) {
  const src = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
  const totalPages = src.getPageCount();
  const chunks = [];

  for (let start = 0; start < totalPages; start += chunkSize) {
    const end = Math.min(start + chunkSize, totalPages);
    const chunk = await PDFDocument.create();
    const indices = [];
    for (let i = start; i < end; i++) indices.push(i);
    const copied = await chunk.copyPages(src, indices);
    copied.forEach((p) => chunk.addPage(p));
    const bytes = await chunk.save();
    chunks.push(Buffer.from(bytes));
  }

  return { chunks, totalPages };
}

/**
 * Parse un plan multi-recettes : split en chunks, parse chaque chunk avec
 * RecipePlanSchema, merge les arrays de recettes.
 *
 * @param {Buffer} pdfBuffer
 * @param {object} [opts]
 * @param {string} [opts.model]
 * @param {number} [opts.chunkSize=CHUNK_PAGES]
 * @returns {Promise<{ok: true, recipes: z.infer<typeof RecipeSchema>[], totalPages: number, chunkCount: number, model: string, durationMs: number} | {ok: false, error: string}>}
 */
export async function parsePdfToPlan(pdfBuffer, opts = {}) {
  const t0 = Date.now();
  const model = opts.model || VISION_MODEL;
  const chunkSize = opts.chunkSize || CHUNK_PAGES;

  let totalPages, chunks;
  try {
    ({ chunks, totalPages } = await splitPdfIntoChunks(pdfBuffer, chunkSize));
  } catch (err) {
    return { ok: false, error: `split failed: ${err.message}`, durationMs: Date.now() - t0 };
  }

  const allRecipes = [];
  const errors = [];

  // Parse les chunks en sequence (eviter rate-limit + ordre preserve)
  for (let i = 0; i < chunks.length; i++) {
    const chunkBase64 = chunks[i].toString('base64');
    try {
      const { object: plan } = await generateObject({
        model,
        schema: RecipePlanSchema,
        system: PLAN_SYSTEM_PROMPT,
        messages: [{
          role: 'user',
          content: [
            { type: 'file', data: chunkBase64, mediaType: 'application/pdf' },
            { type: 'text', text: `Pages ${i * chunkSize + 1} a ${Math.min((i + 1) * chunkSize, totalPages)} sur ${totalPages}. Extrais TOUTES les recettes presentes.` },
          ],
        }],
      });
      if (plan.recipes && plan.recipes.length > 0) {
        allRecipes.push(...plan.recipes);
      }
    } catch (err) {
      errors.push({ chunk: i, error: err.message });
      // Si Sonnet plante sur un chunk, on tente Opus une fois
      if (model === VISION_MODEL && !opts._fallbackAttempted) {
        try {
          const { object: plan } = await generateObject({
            model: VISION_FALLBACK,
            schema: RecipePlanSchema,
            system: PLAN_SYSTEM_PROMPT,
            messages: [{
              role: 'user',
              content: [
                { type: 'file', data: chunkBase64, mediaType: 'application/pdf' },
                { type: 'text', text: `Pages ${i * chunkSize + 1} a ${Math.min((i + 1) * chunkSize, totalPages)} sur ${totalPages}.` },
              ],
            }],
          });
          if (plan.recipes && plan.recipes.length > 0) {
            allRecipes.push(...plan.recipes);
          }
        } catch (err2) {
          errors.push({ chunk: i, error: `fallback opus: ${err2.message}` });
        }
      }
    }
  }

  if (allRecipes.length === 0) {
    return {
      ok: false,
      error: errors.length ? `all chunks failed: ${errors.map((e) => `chunk ${e.chunk}: ${e.error}`).join('; ')}` : 'no recipes extracted',
      totalPages,
      chunkCount: chunks.length,
      durationMs: Date.now() - t0,
    };
  }

  return {
    ok: true,
    recipes: allRecipes,
    totalPages,
    chunkCount: chunks.length,
    errors: errors.length ? errors : undefined,
    model,
    durationMs: Date.now() - t0,
  };
}

/**
 * Auto-route : single-recipe vs plan selon le nombre de pages.
 *
 * @param {Buffer} pdfBuffer
 * @returns {Promise<{ok: true, mode: 'single'|'plan', recipes: any[], totalPages: number, ...} | {ok: false, error: string}>}
 */
export async function parsePdfAuto(pdfBuffer) {
  let totalPages;
  try {
    const doc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
    totalPages = doc.getPageCount();
  } catch (err) {
    return { ok: false, error: `pdf load failed: ${err.message}` };
  }

  if (totalPages <= SINGLE_RECIPE_MAX_PAGES) {
    const single = await parsePdfToRecipe(pdfBuffer);
    if (!single.ok) return single;
    return {
      ok: true,
      mode: 'single',
      recipes: [single.recipe],
      totalPages,
      chunkCount: 1,
      model: single.model,
      durationMs: single.durationMs,
    };
  }

  const plan = await parsePdfToPlan(pdfBuffer);
  if (!plan.ok) return plan;
  return { ...plan, mode: 'plan' };
}

// =====================================================
// 2. Match ingredient via embeddings + Edamam fallback
// =====================================================

/**
 * Cherche le meilleur match dans aliments_local via cosine pgvector.
 * Si confidence < THRESHOLD, fallback Edamam.
 *
 * @param {object} supabase - service-role client
 * @param {string} ingredientName
 * @param {object} [opts]
 * @param {number} [opts.threshold=0.65] - similarite cosine minimum acceptable
 * @returns {Promise<{source, id, name, calories, proteines, glucides, lipides, fibres, similarity} | null>}
 */
export async function matchIngredient(supabase, ingredientName, opts = {}) {
  const threshold = opts.threshold ?? 0.65;
  if (!ingredientName || !ingredientName.trim()) return null;

  // 1. Embed le nom de l'ingredient
  const { embedding } = await embed({
    model: EMBEDDING_MODEL,
    value: ingredientName,
  });

  // 2. Cosine search dans aliments_local
  const { data: matches, error } = await supabase.rpc('match_aliment', {
    query_embedding: embedding,
    match_threshold: 0.4,
    match_count: 1,
  });

  if (error) {
    console.error('[recipe-parser] match_aliment RPC failed:', error.message);
    return null;
  }

  if (matches && matches.length > 0) {
    const m = matches[0];
    return {
      source: 'local_ciqual',
      id: m.id,
      name: m.name,
      calories: m.calories,
      proteines: m.proteines,
      glucides: m.glucides,
      lipides: m.lipides,
      fibres: m.fibres,
      typical_weight_g: m.typical_weight_g,
      similarity: m.similarity,
      // _belowThreshold est utile cote review UI pour signaler "a verifier"
      _belowThreshold: m.similarity < threshold,
    };
  }

  // Fallback Edamam si pas de match local (TODO si besoin)
  return null;
}

// =====================================================
// 3. Convert quantity+unit to grams
// =====================================================

// Approximations standard FR (CIQUAL portions).
// Pour les unites volumetriques type cuillere/tasse, on assume densite eau (1g/ml)
// par defaut. Le coach pourra corriger dans le review UI.
const UNIT_TO_GRAMS = {
  g: 1,
  gramme: 1,
  grammes: 1,
  kg: 1000,
  ml: 1,
  millilitre: 1,
  millilitres: 1,
  cl: 10,
  l: 1000,
  litre: 1000,
  litres: 1000,
  cuillere_soupe: 15,
  cuillere_cafe: 5,
  pincee: 0.5,
  tasse: 240,
  bol: 250,
  verre: 200,
  gousse: 5,         // gousse d'ail moyenne
  piece: null,       // depend de l'aliment, on ne convertit pas par defaut
  unite: null,
};

/**
 * @param {number} quantity
 * @param {string} unit
 * @param {number} [typicalWeightG] - poids moyen d'une piece (utilise si unit='piece' / 'unite')
 * @returns {number|null} grams (null si conversion impossible)
 */
export function unitToGrams(quantity, unit, typicalWeightG) {
  if (quantity == null) return null;
  if (!unit) return quantity; // pas d'unite = on assume grammes
  const k = String(unit).toLowerCase().replace(/\s+/g, '_');

  // Cas piece/unite : on utilise le typical_weight_g de l'aliment matche
  if (k === 'piece' || k === 'unite' || k === 'unites' || k === 'pieces') {
    if (typicalWeightG && typicalWeightG > 0) {
      return Math.round(quantity * typicalWeightG * 100) / 100;
    }
    return null; // pas de typical_weight_g connu
  }

  const factor = UNIT_TO_GRAMS[k];
  if (factor == null) return null;
  return Math.round(quantity * factor * 100) / 100;
}

// =====================================================
// 4. Compute macros at given quantity
// =====================================================

/**
 * Macros (par 100g) du match * quantite en grammes / 100.
 *
 * @param {object} match - retour de matchIngredient
 * @param {number} quantity
 * @param {string} unit
 * @returns {object} { quantity_g, calories, proteines, glucides, lipides, fibres }
 */
export function computeIngredientMacros(match, quantity, unit) {
  const q = unitToGrams(quantity, unit, match?.typical_weight_g);
  if (!match || q == null || q <= 0) {
    return { quantity_g: q, calories: null, proteines: null, glucides: null, lipides: null, fibres: null };
  }
  const f = q / 100;
  return {
    quantity_g: q,
    calories: round(match.calories * f),
    proteines: round(match.proteines * f),
    glucides: round(match.glucides * f),
    lipides: round(match.lipides * f),
    fibres: match.fibres != null ? round(match.fibres * f) : null,
  };
}

/**
 * Somme les macros de tous les ingredients, divise par servings = par portion.
 */
export function computeRecipeMacros(ingredients, servings) {
  const tot = ingredients.reduce((acc, ing) => ({
    calories: acc.calories + (ing.calories || 0),
    proteines: acc.proteines + (ing.proteines || 0),
    glucides: acc.glucides + (ing.glucides || 0),
    lipides: acc.lipides + (ing.lipides || 0),
    fibres: acc.fibres + (ing.fibres || 0),
  }), { calories: 0, proteines: 0, glucides: 0, lipides: 0, fibres: 0 });

  const n = Math.max(1, servings || 1);
  return {
    calories: round(tot.calories / n),
    proteines: round(tot.proteines / n),
    glucides: round(tot.glucides / n),
    lipides: round(tot.lipides / n),
    fibres: round(tot.fibres / n),
  };
}

function round(n) {
  if (n == null || isNaN(n)) return null;
  return Math.round(n * 10) / 10;
}

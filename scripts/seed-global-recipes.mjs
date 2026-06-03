#!/usr/bin/env node
/**
 * Seed 15 recettes globales (scope='global', visibles par tous les coachs)
 * couvrant petit-dej, dejeuner, diner, collation, post-workout.
 *
 * Usage : node scripts/seed-global-recipes.mjs
 *
 * Idempotent : ne re-insere pas si une recette globale du meme titre existe deja.
 *
 * Pre-requis : migration 044 + seed embeddings deja appliques.
 */

import { createClient } from '@supabase/supabase-js';
import {
  matchIngredient,
  computeIngredientMacros,
  computeRecipeMacros,
} from '../api/_recipe-helpers.mjs';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY || !process.env.AI_GATEWAY_API_KEY) {
  console.error('Missing env vars (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, AI_GATEWAY_API_KEY)');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// =====================================================
// 15 recettes curees CIQUAL-aligned
// =====================================================
const RECIPES = [
  // ===== PETIT-DEJ =====
  {
    title: "Bowl flocons d'avoine banane",
    description: "Petit-dej rapide, riche en glucides complexes et fibres.",
    servings: 1, prep_time_min: 5, difficulty: 'facile',
    meal_types: ['petit-dejeuner'],
    tags: ['high-fiber', 'rapide'],
    dietary_flags: ['vegetarian'],
    instructions: '1. Faire chauffer le lait avec les flocons 3 min.\n2. Ajouter banane, miel et beurre d\'amande.\n3. Servir tiede.',
    ingredients: [
      { name: 'Flocons d\'avoine', quantity: 50, unit: 'g' },
      { name: 'Lait demi-ecreme', quantity: 200, unit: 'ml' },
      { name: 'Banane', quantity: 1, unit: 'piece' },
      { name: 'Beurre d\'amande', quantity: 15, unit: 'g' },
      { name: 'Miel', quantity: 10, unit: 'g' },
    ],
  },
  {
    title: "Omelette aux blancs d'oeufs et legumes",
    description: "Haute proteines, faible en lipides. Ideal post-WO matinal.",
    servings: 1, prep_time_min: 10, difficulty: 'facile',
    meal_types: ['petit-dejeuner', 'dejeuner'],
    tags: ['high-protein', 'low-fat', 'post-workout'],
    dietary_flags: ['high-protein', 'vegetarian', 'gluten-free'],
    instructions: '1. Battre les blancs avec sel et poivre.\n2. Revenir l\'epinard et la tomate 2 min.\n3. Verser les blancs, cuire 4 min a feu doux.',
    ingredients: [
      { name: 'Blanc d\'oeuf', quantity: 200, unit: 'g' },
      { name: 'Epinards frais', quantity: 50, unit: 'g' },
      { name: 'Tomate', quantity: 1, unit: 'piece' },
      { name: 'Huile d\'olive', quantity: 5, unit: 'g' },
    ],
  },
  {
    title: "Toast complet avocat saumon fume",
    description: "Petit-dej salee, omega-3 et fibres.",
    servings: 1, prep_time_min: 5, difficulty: 'facile',
    meal_types: ['petit-dejeuner'],
    tags: ['high-protein', 'omega3'],
    dietary_flags: ['high-protein'],
    instructions: '1. Toaster le pain.\n2. Ecraser l\'avocat dessus avec sel et citron.\n3. Deposer le saumon fume.',
    ingredients: [
      { name: 'Pain complet', quantity: 60, unit: 'g' },
      { name: 'Avocat', quantity: 0.5, unit: 'piece' },
      { name: 'Saumon fume', quantity: 60, unit: 'g' },
    ],
  },

  // ===== DEJEUNER =====
  {
    title: "Bowl poulet riz brocoli",
    description: "Repas equilibre classique, prep facile, freezer-friendly.",
    servings: 1, prep_time_min: 15, cook_time_min: 20, difficulty: 'facile',
    meal_types: ['dejeuner', 'diner'],
    tags: ['meal-prep', 'high-protein'],
    dietary_flags: ['high-protein', 'gluten-free', 'lactose-free'],
    instructions: '1. Cuire le riz selon paquet.\n2. Vapeur le brocoli 8 min.\n3. Griller le poulet assaisonne 6-8 min.\n4. Assembler dans un bol.',
    ingredients: [
      { name: 'Blanc de poulet cru', quantity: 150, unit: 'g' },
      { name: 'Riz blanc cuit', quantity: 200, unit: 'g' },
      { name: 'Brocoli cuit', quantity: 150, unit: 'g' },
      { name: 'Huile d\'olive', quantity: 8, unit: 'g' },
    ],
  },
  {
    title: "Salade quinoa pois chiches feta",
    description: "Vegetarien, fibres + proteines vegetales.",
    servings: 1, prep_time_min: 15, difficulty: 'facile',
    meal_types: ['dejeuner'],
    tags: ['meal-prep', 'high-fiber'],
    dietary_flags: ['vegetarian', 'gluten-free'],
    instructions: '1. Cuire le quinoa.\n2. Egoutter les pois chiches.\n3. Couper concombre, tomate, feta.\n4. Melanger avec huile, citron, persil.',
    ingredients: [
      { name: 'Quinoa cuit', quantity: 150, unit: 'g' },
      { name: 'Pois chiches cuits', quantity: 100, unit: 'g' },
      { name: 'Feta', quantity: 50, unit: 'g' },
      { name: 'Concombre', quantity: 80, unit: 'g' },
      { name: 'Tomate', quantity: 1, unit: 'piece' },
      { name: 'Huile d\'olive', quantity: 10, unit: 'g' },
    ],
  },
  {
    title: "Pates completes thon tomate",
    description: "Pates rapides, omega-3 + glucides complexes.",
    servings: 1, prep_time_min: 5, cook_time_min: 12, difficulty: 'facile',
    meal_types: ['dejeuner', 'diner'],
    tags: ['rapide', 'meal-prep'],
    dietary_flags: ['high-protein'],
    instructions: '1. Cuire les pates.\n2. Faire revenir oignon et ail.\n3. Ajouter sauce tomate et thon.\n4. Servir avec basilic frais.',
    ingredients: [
      { name: 'Pates completes cuites', quantity: 200, unit: 'g' },
      { name: 'Thon naturel', quantity: 100, unit: 'g' },
      { name: 'Sauce tomate', quantity: 100, unit: 'g' },
      { name: 'Oignon', quantity: 0.5, unit: 'piece' },
    ],
  },

  // ===== DINER =====
  {
    title: "Saumon roti patate douce epinards",
    description: "Diner premium, omega-3 + glucides lents.",
    servings: 1, prep_time_min: 10, cook_time_min: 30, difficulty: 'facile',
    meal_types: ['diner'],
    tags: ['high-protein', 'omega3'],
    dietary_flags: ['gluten-free', 'lactose-free', 'high-protein'],
    instructions: '1. Four 200°C, cuire la patate douce 25 min.\n2. Saumon a la poele 8 min.\n3. Faire revenir epinards 2 min.',
    ingredients: [
      { name: 'Saumon cru', quantity: 150, unit: 'g' },
      { name: 'Patate douce cuite', quantity: 200, unit: 'g' },
      { name: 'Epinards frais', quantity: 100, unit: 'g' },
      { name: 'Huile d\'olive', quantity: 8, unit: 'g' },
    ],
  },
  {
    title: "Wrap poulet legumes",
    description: "Diner leger ou en transport. Tortilla complete.",
    servings: 1, prep_time_min: 10, difficulty: 'facile',
    meal_types: ['diner', 'dejeuner'],
    tags: ['rapide', 'meal-prep'],
    dietary_flags: ['high-protein'],
    instructions: '1. Reveiller la tortilla 10s.\n2. Garnir poulet, salade, tomate, fromage.\n3. Rouler et trancher.',
    ingredients: [
      { name: 'Tortilla', quantity: 1, unit: 'piece' },
      { name: 'Blanc de poulet cuit', quantity: 100, unit: 'g' },
      { name: 'Salade verte', quantity: 30, unit: 'g' },
      { name: 'Tomate', quantity: 1, unit: 'piece' },
      { name: 'Fromage rape', quantity: 20, unit: 'g' },
    ],
  },
  {
    title: "Curry de lentilles vegan",
    description: "Vegan, riche en fibres et fer.",
    servings: 2, prep_time_min: 10, cook_time_min: 25, difficulty: 'moyen',
    meal_types: ['diner', 'dejeuner'],
    tags: ['meal-prep', 'high-fiber'],
    dietary_flags: ['vegan', 'gluten-free', 'lactose-free'],
    instructions: '1. Revenir oignon, ail, gingembre.\n2. Ajouter epices et tomate, mijoter 5 min.\n3. Lentilles + lait coco, mijoter 20 min.\n4. Servir avec coriandre.',
    ingredients: [
      { name: 'Lentilles vertes cuites', quantity: 250, unit: 'g' },
      { name: 'Lait de coco', quantity: 200, unit: 'ml' },
      { name: 'Tomate', quantity: 2, unit: 'piece' },
      { name: 'Oignon', quantity: 1, unit: 'piece' },
      { name: 'Curry en poudre', quantity: 5, unit: 'g' },
      { name: 'Huile d\'olive', quantity: 10, unit: 'g' },
    ],
  },

  // ===== COLLATIONS / POST-WORKOUT =====
  {
    title: "Smoothie post-WO whey banane",
    description: "Recovery rapide, 30g proteines en 1 minute.",
    servings: 1, prep_time_min: 2, difficulty: 'facile',
    meal_types: ['collation'],
    tags: ['post-workout', 'high-protein', 'rapide'],
    dietary_flags: ['high-protein'],
    instructions: '1. Mixer tous les ingredients 30 sec.\n2. Boire dans les 30 min post-entrainement.',
    ingredients: [
      { name: 'Whey protéine', quantity: 30, unit: 'g' },
      { name: 'Banane', quantity: 1, unit: 'piece' },
      { name: 'Lait demi-ecreme', quantity: 250, unit: 'ml' },
      { name: 'Beurre de cacahuete', quantity: 15, unit: 'g' },
    ],
  },
  {
    title: "Yaourt grec myrtilles miel",
    description: "Snack rapide, proteines + antioxydants.",
    servings: 1, prep_time_min: 2, difficulty: 'facile',
    meal_types: ['collation', 'petit-dejeuner'],
    tags: ['rapide', 'high-protein'],
    dietary_flags: ['high-protein', 'vegetarian', 'gluten-free'],
    instructions: '1. Verser le yaourt.\n2. Ajouter myrtilles et miel.',
    ingredients: [
      { name: 'Yaourt grec', quantity: 150, unit: 'g' },
      { name: 'Myrtilles', quantity: 50, unit: 'g' },
      { name: 'Miel', quantity: 10, unit: 'g' },
    ],
  },
  {
    title: "Pancakes proteines avoine",
    description: "Pancakes haute proteine, idee post-WO ou petit-dej weekend.",
    servings: 2, prep_time_min: 10, difficulty: 'facile',
    meal_types: ['petit-dejeuner', 'collation'],
    tags: ['high-protein', 'post-workout'],
    dietary_flags: ['high-protein', 'vegetarian'],
    instructions: '1. Mixer tous les ingredients 30 sec.\n2. Cuire en petites portions 2 min de chaque cote.',
    ingredients: [
      { name: 'Flocons d\'avoine', quantity: 80, unit: 'g' },
      { name: 'Banane', quantity: 1, unit: 'piece' },
      { name: 'Œuf entier cuit', quantity: 2, unit: 'piece' },
      { name: 'Whey protéine', quantity: 30, unit: 'g' },
    ],
  },
  {
    title: "Houmous crudites",
    description: "Snack vegan, riche en fibres.",
    servings: 1, prep_time_min: 5, difficulty: 'facile',
    meal_types: ['collation'],
    tags: ['rapide', 'high-fiber'],
    dietary_flags: ['vegan', 'gluten-free', 'lactose-free'],
    instructions: '1. Couper carotte, concombre et poivron en batonnets.\n2. Tremper dans le houmous.',
    ingredients: [
      { name: 'Houmous', quantity: 60, unit: 'g' },
      { name: 'Carotte', quantity: 1, unit: 'piece' },
      { name: 'Concombre', quantity: 100, unit: 'g' },
      { name: 'Poivron', quantity: 0.5, unit: 'piece' },
    ],
  },
  {
    title: "Bowl skyr fruits rouges granola",
    description: "Petit-dej proteine sans whey.",
    servings: 1, prep_time_min: 3, difficulty: 'facile',
    meal_types: ['petit-dejeuner', 'collation'],
    tags: ['high-protein', 'rapide'],
    dietary_flags: ['vegetarian', 'high-protein'],
    instructions: '1. Verser le skyr.\n2. Ajouter granola et fruits rouges.',
    ingredients: [
      { name: 'Skyr', quantity: 200, unit: 'g' },
      { name: 'Granola', quantity: 30, unit: 'g' },
      { name: 'Fruits rouges mélange', quantity: 80, unit: 'g' },
      { name: 'Miel', quantity: 5, unit: 'g' },
    ],
  },
  {
    title: "Salade thon oeuf dur",
    description: "Salade composee, proteines simples.",
    servings: 1, prep_time_min: 10, difficulty: 'facile',
    meal_types: ['dejeuner', 'collation'],
    tags: ['rapide', 'high-protein'],
    dietary_flags: ['high-protein', 'gluten-free', 'lactose-free'],
    instructions: '1. Faire bouillir les oeufs 9 min.\n2. Decortiquer et trancher.\n3. Melanger avec salade, thon, tomate, olives, vinaigrette.',
    ingredients: [
      { name: 'Salade verte', quantity: 100, unit: 'g' },
      { name: 'Thon naturel', quantity: 80, unit: 'g' },
      { name: 'Œuf dur', quantity: 2, unit: 'piece' },
      { name: 'Tomate', quantity: 1, unit: 'piece' },
      { name: 'Olives noires', quantity: 30, unit: 'g' },
      { name: 'Huile d\'olive', quantity: 10, unit: 'g' },
    ],
  },
];

async function seedRecipe(rec) {
  // Check si deja en base
  const { data: existing } = await supabase
    .from('recipes')
    .select('id')
    .eq('scope', 'global')
    .eq('title', rec.title)
    .maybeSingle();

  if (existing) {
    return { skipped: true, id: existing.id };
  }

  // Match + compute pour chaque ingredient
  const ingRows = [];
  for (let i = 0; i < rec.ingredients.length; i++) {
    const ing = rec.ingredients[i];
    const match = await matchIngredient(supabase, ing.name);
    const macros = match
      ? computeIngredientMacros(match, ing.quantity, ing.unit)
      : { quantity_g: null, calories: null, proteines: null, glucides: null, lipides: null, fibres: null };
    ingRows.push({
      position: i,
      raw_text: `${ing.quantity}${ing.unit ? ' ' + ing.unit : ''} ${ing.name}`,
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

  const macrosPerServing = computeRecipeMacros(ingRows, rec.servings);

  const { data: newRec, error } = await supabase
    .from('recipes')
    .insert({
      coach_id: null,
      scope: 'global',
      title: rec.title,
      description: rec.description,
      source_origin: 'global_seed',
      servings: rec.servings,
      prep_time_min: rec.prep_time_min ?? null,
      cook_time_min: rec.cook_time_min ?? null,
      difficulty: rec.difficulty ?? null,
      meal_types: rec.meal_types ?? [],
      tags: rec.tags ?? [],
      dietary_flags: rec.dietary_flags ?? [],
      instructions: rec.instructions ?? null,
      macros_per_serving: macrosPerServing,
      parsing_status: 'published',
      published_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (error || !newRec) throw error || new Error('insert failed');

  const ingsWithFk = ingRows.map((r) => ({ ...r, recipe_id: newRec.id }));
  const { error: ingErr } = await supabase.from('recipe_ingredients').insert(ingsWithFk);
  if (ingErr) throw ingErr;

  return { skipped: false, id: newRec.id, macros: macrosPerServing, matched: ingRows.filter((r) => r.match_confidence != null).length, total: ingRows.length };
}

async function main() {
  console.log(`[seed-global] ${RECIPES.length} recettes a traiter`);
  let inserted = 0, skipped = 0;
  for (const rec of RECIPES) {
    try {
      const r = await seedRecipe(rec);
      if (r.skipped) {
        console.log(`  ⊝ ${rec.title} (deja en base)`);
        skipped++;
      } else {
        console.log(`  ✓ ${rec.title} (${r.macros.calories} kcal/portion, ${r.matched}/${r.total} matched)`);
        inserted++;
      }
    } catch (err) {
      console.error(`  ✗ ${rec.title}: ${err.message}`);
    }
  }
  console.log(`\n[seed-global] ${inserted} insertions, ${skipped} deja presentes`);
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});

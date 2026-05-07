import React, { useEffect, useState, useMemo, useCallback } from "react";
import { supabase } from "../../lib/supabase";
import haptic from "../../lib/haptic";
import { toast } from "../Toast";

const G = "#02d1ba";
const ORANGE = "#f97316";

/**
 * ClientRecipesBrowser — Modal cote client pour browser les recettes
 * publiees par son coach + globales, filtrer, et "Ajouter au repas".
 *
 * Props :
 *   - onClose: () => void
 *   - defaultDate: "YYYY-MM-DD"
 *   - defaultMealType: string
 *   - onAdded: (bundle) => void   // callback apres add-to-meal success
 */
// Cache module-level pour eviter le refetch a chaque ouverture du modal.
// Permet aussi le preload depuis FuelPage avant meme l'ouverture.
const _recipesCache = { data: null, favorites: null, loadedAt: 0, inflight: null };
const RECIPES_CACHE_TTL = 5 * 60 * 1000; // 5 min

export async function preloadRecipes() {
  const now = Date.now();
  if (_recipesCache.data && now - _recipesCache.loadedAt < RECIPES_CACHE_TTL) return _recipesCache;
  if (_recipesCache.inflight) return _recipesCache.inflight;
  _recipesCache.inflight = (async () => {
    const [{ data: published }, { data: favs }] = await Promise.all([
      supabase.from('recipes').select(`
        id, title, description, photo_url, scope, servings,
        prep_time_min, cook_time_min, difficulty,
        meal_types, tags, dietary_flags, macros_per_serving,
        recipe_ingredients(id, ingredient_name, quantity, unit, calories, proteines, glucides, lipides)
      `).eq('parsing_status', 'published').is('deleted_at', null).order('created_at', { ascending: false }),
      supabase.from('client_recipe_favorites').select('recipe_id'),
    ]);
    _recipesCache.data = published || [];
    _recipesCache.favorites = new Set((favs || []).map((f) => f.recipe_id));
    _recipesCache.loadedAt = Date.now();
    _recipesCache.inflight = null;
    return _recipesCache;
  })();
  return _recipesCache.inflight;
}

export default function ClientRecipesBrowser({ onClose, defaultDate, defaultMealType, onAdded }) {
  // Hydrate depuis le cache si dispo : si pre-loaded depuis FuelPage, le
  // modal s'ouvre AVEC les recettes deja affichees, plus de "Chargement...".
  const cacheFresh = _recipesCache.data && Date.now() - _recipesCache.loadedAt < RECIPES_CACHE_TTL;
  const [recipes, setRecipes] = useState(() => cacheFresh ? _recipesCache.data : []);
  const [favorites, setFavorites] = useState(() => cacheFresh ? new Set(_recipesCache.favorites) : new Set());
  const [loading, setLoading] = useState(!cacheFresh);
  const [search, setSearch] = useState("");
  const [filterMeal, setFilterMeal] = useState("all"); // 'all' | 'petit-dejeuner' | ...
  const [filterDietary, setFilterDietary] = useState("all");
  const [showFavOnly, setShowFavOnly] = useState(false);
  const [selected, setSelected] = useState(null);

  const load = useCallback(async () => {
    try {
      const cache = await preloadRecipes();
      setRecipes(cache.data || []);
      setFavorites(new Set(cache.favorites || []));
    } catch (err) {
      try { toast.error(`Erreur: ${err.message}`); } catch {}
    } finally {
      setLoading(false);
    }
  }, []);

  // Si on a deja le cache au mount, pas besoin de re-fetch (sauf cache stale).
  useEffect(() => {
    if (cacheFresh) return;
    load();
  }, [load, cacheFresh]);

  const filtered = useMemo(() => {
    const s = search.toLowerCase().trim();
    return recipes.filter((r) => {
      if (showFavOnly && !favorites.has(r.id)) return false;
      if (filterMeal !== 'all' && !(r.meal_types || []).includes(filterMeal)) return false;
      if (filterDietary !== 'all' && !(r.dietary_flags || []).includes(filterDietary)) return false;
      if (s) {
        const hay = (r.title + ' ' + (r.description || '') + ' ' + (r.tags || []).join(' ')).toLowerCase();
        if (!hay.includes(s)) return false;
      }
      return true;
    });
  }, [recipes, search, filterMeal, filterDietary, showFavOnly, favorites]);

  // Si une recette est selectionnee, on rend UNIQUEMENT le detail. Avant on
  // empilait detail-au-dessus-de-liste (deux backdrops superposes), ce qui
  // donnait un effet "ouverture en deux temps". Maintenant le detail prend
  // toute la place direct, sans transition perceptible.
  if (selected) {
    return (
      <RecipeDetail
        recipe={selected}
        isFavorite={favorites.has(selected.id)}
        defaultDate={defaultDate}
        defaultMealType={defaultMealType}
        onClose={() => setSelected(null)}
        onToggleFav={() => toggleFavorite(selected.id, favorites, setFavorites)}
        onAdded={(bundle) => {
          if (onAdded) { try { onAdded(bundle); } catch {} }
          setSelected(null);
          onClose();
        }}
      />
    );
  }

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      zIndex: 1000,
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: '#0f0f0f', width: '100%', maxWidth: 720, maxHeight: '92vh',
        borderRadius: '20px 20px 0 0', display: 'flex', flexDirection: 'column',
        border: '1px solid rgba(255,255,255,0.08)',
      }}>
        {/* Header */}
        <div style={{ padding: '18px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: '#fff', margin: 0 }}>Recettes</h2>
            <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: 24, cursor: 'pointer', padding: 0 }}>×</button>
          </div>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher une recette..."
            style={{
              width: '100%', padding: '10px 12px', borderRadius: 10,
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
              color: '#fff', fontSize: 14, outline: 'none',
              fontFamily: 'inherit', marginBottom: 10,
            }}
          />
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <Filter icon={<IconAll />} label="Tous" active={filterMeal === 'all'} onClick={() => setFilterMeal('all')} />
            <Filter icon={<IconSunrise />} label="Matin" active={filterMeal === 'petit-dejeuner'} onClick={() => setFilterMeal('petit-dejeuner')} />
            <Filter icon={<IconUtensils />} label="Midi" active={filterMeal === 'dejeuner'} onClick={() => setFilterMeal('dejeuner')} />
            <Filter icon={<IconSnack />} label="Snack" active={filterMeal === 'collation'} onClick={() => setFilterMeal('collation')} />
            <Filter icon={<IconMoon />} label="Soir" active={filterMeal === 'diner'} onClick={() => setFilterMeal('diner')} />
            <Filter icon={<IconHeart filled={showFavOnly} />} label="Favoris" active={showFavOnly} onClick={() => setShowFavOnly((v) => !v)} />
          </div>
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>Chargement...</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>
              {recipes.length === 0 ? 'Pas encore de recettes publiees par ton coach.' : 'Aucune recette ne matche tes filtres.'}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8 }}>
              {filtered.map((r) => (
                <RecipeRow
                  key={r.id}
                  recipe={r}
                  isFavorite={favorites.has(r.id)}
                  onClick={() => { haptic.selection(); setSelected(r); }}
                  onToggleFav={async (e) => {
                    e.stopPropagation();
                    await toggleFavorite(r.id, favorites, setFavorites);
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}

async function toggleFavorite(recipeId, favorites, setFavorites) {
  const isFav = favorites.has(recipeId);
  haptic.selection();
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const r = await fetch('/api/recipes/favorite', {
      method: isFav ? 'DELETE' : 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ recipe_id: recipeId }),
    });
    if (!r.ok) throw new Error('fav toggle failed');
    setFavorites((s) => {
      const next = new Set(s);
      if (isFav) next.delete(recipeId); else next.add(recipeId);
      return next;
    });
  } catch (err) {
    try { toast.error(`Erreur favori: ${err.message}`); } catch {}
  }
}

function Filter({ icon, label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '6px 12px', borderRadius: 999, fontSize: 12, fontWeight: 600,
        background: active ? G : 'rgba(255,255,255,0.05)',
        color: active ? '#0a0a0a' : 'rgba(255,255,255,0.7)',
        border: `1px solid ${active ? G : 'rgba(255,255,255,0.1)'}`,
        cursor: 'pointer', whiteSpace: 'nowrap',
        display: 'inline-flex', alignItems: 'center', gap: 5,
      }}
    >{icon}{label}</button>
  );
}

// === Icones SVG (au lieu d'emojis OS qui detonnent) ===
const sw = "1.6";
function IconAll() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}
function IconSunrise() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 18a5 5 0 0 0-10 0" /><line x1="12" y1="2" x2="12" y2="9" /><line x1="4.22" y1="10.22" x2="5.64" y2="11.64" /><line x1="1" y1="18" x2="3" y2="18" /><line x1="21" y1="18" x2="23" y2="18" /><line x1="18.36" y1="11.64" x2="19.78" y2="10.22" /><line x1="23" y1="22" x2="1" y2="22" /><polyline points="8 6 12 2 16 6" />
    </svg>
  );
}
function IconUtensils() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" /><line x1="7" y1="2" x2="7" y2="22" /><path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" />
    </svg>
  );
}
function IconSnack() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5" /><path d="M8.5 8.5v.01" /><path d="M16 15.5v.01" /><path d="M12 12v.01" /><path d="M11 17v.01" /><path d="M7 14v.01" />
    </svg>
  );
}
function IconMoon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}
function IconHeart({ filled }) {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}
function IconChef({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 13.87A4 4 0 0 1 7.41 6a5.11 5.11 0 0 1 1.05-1.54 5 5 0 0 1 7.08 0A5.11 5.11 0 0 1 16.59 6 4 4 0 0 1 18 13.87V21H6Z" /><line x1="6" y1="17" x2="18" y2="17" />
    </svg>
  );
}

function RecipeRow({ recipe, isFavorite, onClick, onToggleFav }) {
  const m = recipe.macros_per_serving || {};
  return (
    <button onClick={onClick} style={{
      textAlign: 'left', padding: 12, borderRadius: 12,
      background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)',
      color: '#fff', cursor: 'pointer', fontFamily: 'inherit',
      display: 'flex', alignItems: 'center', gap: 12,
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: 10, flexShrink: 0,
        background: recipe.photo_url ? `url(${recipe.photo_url}) center/cover` : 'rgba(2,209,186,0.08)',
        border: recipe.photo_url ? 'none' : '1px solid rgba(2,209,186,0.18)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: G,
      }}>{!recipe.photo_url && <IconChef />}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 3 }}>{recipe.title}</div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {m.calories != null && <span>{Math.round(m.calories)} kcal</span>}
          {m.proteines != null && <span>· {Math.round(m.proteines)}g prot</span>}
          {recipe.prep_time_min != null && <span>· {recipe.prep_time_min} min</span>}
        </div>
      </div>
      <button onClick={onToggleFav} style={{
        background: 'transparent', border: 'none', cursor: 'pointer',
        padding: 6, color: isFavorite ? '#ef4444' : 'rgba(255,255,255,0.3)',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      }}><IconHeart filled={isFavorite} /></button>
    </button>
  );
}

function RecipeDetail({ recipe, isFavorite, defaultDate, defaultMealType, onClose, onToggleFav, onAdded }) {
  const [servings, setServings] = useState(1);
  const [date, setDate] = useState(defaultDate || new Date().toISOString().slice(0, 10));
  const [mealType, setMealType] = useState(defaultMealType || 'Dejeuner');
  const [adding, setAdding] = useState(false);

  // Quantites editables : initialisees depuis recipe.recipe_ingredients,
  // recalculent les macros locales en temps reel et passees au backend.
  const baseIngredients = recipe.recipe_ingredients || [];
  const [quantities, setQuantities] = useState(() => {
    const init = {};
    baseIngredients.forEach((i) => { init[i.id] = Number(i.quantity || 0); });
    return init;
  });

  const baseServings = Math.max(1, recipe.servings || 1);
  const servRatio = servings / baseServings;

  // Macros recalculees : pour chaque ingredient, ratio = qty_edited / qty_origine
  // Les macros stockees correspondent à qty_origine, donc on multiplie par ce ratio.
  const mScaled = baseIngredients.reduce(
    (acc, i) => {
      const origQty = Number(i.quantity || 0);
      const newQty = Number(quantities[i.id] ?? origQty);
      const ingrRatio = origQty > 0 ? newQty / origQty : 0;
      const finalRatio = ingrRatio * servRatio;
      acc.calories += (i.calories || 0) * finalRatio;
      acc.proteines += (i.proteines || 0) * finalRatio;
      acc.glucides += (i.glucides || 0) * finalRatio;
      acc.lipides += (i.lipides || 0) * finalRatio;
      return acc;
    },
    { calories: 0, proteines: 0, glucides: 0, lipides: 0 }
  );
  mScaled.calories = Math.round(mScaled.calories);
  mScaled.proteines = Math.round(mScaled.proteines);
  mScaled.glucides = Math.round(mScaled.glucides);
  mScaled.lipides = Math.round(mScaled.lipides);

  const addToMeal = async () => {
    if (adding) return;
    setAdding(true);
    haptic.medium();
    let result = null;
    let success = false;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const ingredient_overrides = baseIngredients
        .filter((i) => Number(quantities[i.id]) !== Number(i.quantity))
        .map((i) => ({ id: i.id, quantity: Number(quantities[i.id]) }));
      const r = await fetch('/api/recipes/add-to-meal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          recipe_id: recipe.id, date, meal_type: mealType,
          servings_count: servings,
          ingredient_overrides: ingredient_overrides.length ? ingredient_overrides : undefined,
        }),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${r.status}`);
      }
      result = await r.json();
      success = true;
      toast.success(`Recette ajoutée : +${result.totals.calories} kcal`);
    } catch (err) {
      try { toast.error(`Erreur: ${err.message}`); } catch {}
    } finally {
      setAdding(false);
    }
    if (success) {
      try { onAdded?.(result); } catch {}
      try { onClose?.(); } catch {}
    }
  };

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1100, padding: 16,
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: '#0f0f0f', borderRadius: 16, maxWidth: 520, width: '100%',
        maxHeight: '88vh', overflowY: 'auto',
        border: '1px solid rgba(255,255,255,0.08)',
      }}>
        <div style={{ padding: 22 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <h3 style={{ fontSize: 20, fontWeight: 800, color: '#fff', margin: 0, flex: 1 }}>{recipe.title}</h3>
            <button onClick={onToggleFav} style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              padding: 6, color: isFavorite ? '#ef4444' : 'rgba(255,255,255,0.3)',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill={isFavorite ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </button>
            <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: 24, cursor: 'pointer', padding: 0, marginLeft: 8 }}>×</button>
          </div>

          {recipe.description && (
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.5, margin: '0 0 16px 0' }}>{recipe.description}</p>
          )}

          {/* Macros scaled */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginBottom: 18 }}>
            {[
              { k: 'kcal', v: mScaled.calories },
              { k: 'prot', v: mScaled.proteines, suffix: 'g' },
              { k: 'glu', v: mScaled.glucides, suffix: 'g' },
              { k: 'lip', v: mScaled.lipides, suffix: 'g' },
            ].map((s) => (
              <div key={s.k} style={{
                padding: '8px 10px', borderRadius: 10, textAlign: 'center',
                background: 'rgba(2,209,186,0.06)', border: '1px solid rgba(2,209,186,0.15)',
              }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>{s.v}{s.suffix || ''}</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>{s.k}</div>
              </div>
            ))}
          </div>

          {/* Ingredients — quantites editables (recompute macros en live) */}
          {baseIngredients.length > 0 && (
            <div style={{ marginBottom: 18 }}>
              <h4 style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.55)', margin: '0 0 10px 0' }}>Ingrédients</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {baseIngredients.map((i) => (
                  <div key={i.id} style={{
                    fontSize: 13, color: 'rgba(255,255,255,0.85)',
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 10px',
                    background: 'rgba(255,255,255,0.025)',
                    border: '1px solid rgba(255,255,255,0.05)',
                    borderRadius: 10,
                  }}>
                    <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{i.ingredient_name}</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      value={quantities[i.id] === '' || quantities[i.id] == null ? '' : quantities[i.id]}
                      onFocus={(e) => {
                        // Place le curseur en fin du champ et selectionne tout
                        // pour que taper un chiffre remplace direct (cas typique
                        // : input affiche "0" -> on tape "80" sans devoir effacer).
                        const len = String(e.target.value).length;
                        try { e.target.setSelectionRange(len, len); } catch {}
                        try { e.target.select(); } catch {}
                      }}
                      onChange={(e) => {
                        // Garde la string vide telle quelle pour ne pas afficher "0"
                        // quand le client efface ; les calculs traitent "" = 0.
                        const v = e.target.value;
                        setQuantities((q) => ({ ...q, [i.id]: v === '' ? '' : parseFloat(v) }));
                      }}
                      onBlur={(e) => {
                        // Si reste vide au blur, on remet 0 pour que la qte
                        // serialisee soit explicite (sinon NaN cote backend).
                        if (e.target.value === '') {
                          setQuantities((q) => ({ ...q, [i.id]: 0 }));
                        }
                      }}
                      style={{
                        width: 64, padding: '6px 8px', borderRadius: 8,
                        background: 'rgba(2,209,186,0.06)',
                        border: '1px solid rgba(2,209,186,0.18)',
                        color: '#fff', fontSize: 13, fontWeight: 700,
                        textAlign: 'right', fontFamily: 'inherit', outline: 'none',
                        WebkitAppearance: 'none', MozAppearance: 'textfield',
                      }}
                    />
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', width: 30 }}>{i.unit || 'g'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Servings slider */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase' }}>Portions</span>
              <span style={{ fontSize: 14, fontWeight: 800, color: G }}>{servings}x</span>
            </div>
            <input
              type="range" min={0.5} max={4} step={0.5}
              value={servings}
              onChange={(e) => setServings(parseFloat(e.target.value))}
              style={{ width: '100%', accentColor: G }}
            />
          </div>

          {/* Date + meal selector */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 18 }}>
            <select value={mealType} onChange={(e) => setMealType(e.target.value)} style={{
              padding: '10px 12px', borderRadius: 10,
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
              color: '#fff', fontSize: 13, fontFamily: 'inherit',
            }}>
              <option value="Petit-dejeuner">Petit-déj</option>
              <option value="Dejeuner">Déjeuner</option>
              <option value="Collation">Collation</option>
              <option value="Diner">Dîner</option>
            </select>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{
              padding: '10px 12px', borderRadius: 10,
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
              color: '#fff', fontSize: 13, fontFamily: 'inherit',
            }} />
          </div>

          <button onClick={addToMeal} disabled={adding} style={{
            width: '100%', padding: 14, borderRadius: 12,
            background: G, color: '#0a0a0a', border: 'none',
            fontWeight: 800, fontSize: 14, cursor: adding ? 'wait' : 'pointer',
          }}>
            {adding ? 'Ajout...' : `Ajouter au repas (+${mScaled.calories} kcal)`}
          </button>
        </div>
      </div>
    </div>
  );
}

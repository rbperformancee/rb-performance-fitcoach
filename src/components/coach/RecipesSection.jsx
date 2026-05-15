import React, { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "../../lib/supabase";
import AppIcon from "../AppIcon";
import haptic from "../../lib/haptic";
import { toast } from "../Toast";

const G = "#02d1ba";
const RED = "#ef4444";
const YELLOW = "#fbbf24";

/**
 * RecipesSection — UI coach review pour les recettes parsees.
 *
 * Workflow :
 *   1. Liste : standalone + plans groupes (cards)
 *   2. Upload : bouton "+ Nouvelle recette" -> file picker -> upload Storage
 *      -> POST /api/recipes/create -> insert recipes en DB -> refresh
 *   3. Review : click sur une recette -> modal split (infos | ingredients
 *      avec confidence colors). Inline edit + bouton "Publier".
 *
 * Statuts :
 *   parsing -> spinner gris
 *   needs_review -> badge orange (a verifier coach)
 *   published -> badge vert
 *   failed -> badge rouge + bouton retry
 */
export default function RecipesSection({ coachId }) {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState({ standalone: [], plans: [] });
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [reviewRecipe, setReviewRecipe] = useState(null);
  const fileInputRef = useRef();
  const pollRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const r = await fetch("/api/recipes/list", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!r.ok) throw new Error(`list failed ${r.status}`);
      const data = await r.json();
      setItems(data);
      return data;
    } catch (err) {
      toast(`Erreur: ${err.message}`, "error");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Polling : pendant qu'une recette est en cours de parse, refresh toutes
  // les 5s pour voir son statut changer (parsing → needs_review).
  useEffect(() => { load(); }, [load]);
  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);
  useEffect(() => {
    const hasParsing = items.standalone?.some((r) => r.parsing_status === "parsing");
    if (!hasParsing) {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      return;
    }
    if (pollRef.current) return; // déjà actif
    pollRef.current = setInterval(() => { load(); }, 5000);
  }, [items.standalone, load]);

  const deleteRecipe = async (recipe) => {
    if (!recipe?.id) return;
    if (!window.confirm(`Supprimer "${recipe.title}" ?\nCette action est irréversible.`)) return;
    haptic.medium();
    try {
      const { error } = await supabase.from("recipes").delete().eq("id", recipe.id);
      if (error) throw error;
      toast("Recette supprimée", "success");
      await load();
    } catch (err) {
      toast(`Erreur suppression: ${err.message}`, "error");
    }
  };

  const handleFile = async (file) => {
    if (!file || file.type !== "application/pdf") {
      toast("Seuls les PDF sont acceptes", "error");
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      toast("PDF trop gros (max 50 MB)", "error");
      return;
    }
    haptic.medium();
    setUploading(true);
    setUploadProgress("Upload du PDF...");

    try {
      // 1. Upload to Storage at recipes/<coach_id>/<timestamp>-<filename>
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${coachId}/${Date.now()}-${safeName}`;
      const { error: upErr } = await supabase.storage
        .from("recipes")
        .upload(path, file, { upsert: false });
      if (upErr) throw upErr;

      // 2. Call /api/recipes/create — le backend INSERT un stub
      // (parsing_status='parsing') immédiatement, puis continue le parse.
      // On refresh la liste tout de suite pour voir le stub.
      setUploadProgress("Parsing en cours (peut prendre 1-2 min)...");
      const { data: { session } } = await supabase.auth.getSession();
      // Refresh la liste après ~1s pour attraper le stub backend
      setTimeout(() => { load(); }, 1500);
      const r = await fetch("/api/recipes/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ pdf_path: path }),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.error || `parse failed ${r.status}`);
      }
      const result = await r.json();
      toast(`${result.recipes_count} recette(s) extraite(s)`, "success");
      await load();
    } catch (err) {
      toast(`Erreur: ${err.message}`, "error");
      // Le polling continuera à refresh tant qu'il y a un stub en parsing.
    } finally {
      setUploading(false);
      setUploadProgress(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div style={{ marginBottom: 28 }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: "#fff", margin: 0 }}>Recettes</h2>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginTop: 4 }}>
            Upload tes PDFs, l'IA extrait + matche les ingredients automatiquement.
          </div>
        </div>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "10px 16px", borderRadius: 12,
            background: uploading ? "rgba(2,209,186,0.2)" : G,
            color: uploading ? "rgba(255,255,255,0.5)" : "#0a0a0a",
            border: "none", fontWeight: 800, fontSize: 13, cursor: uploading ? "wait" : "pointer",
            transition: "all 0.2s",
          }}
        >
          <AppIcon name={uploading ? "refresh" : "plus"} size={16} />
          {uploading ? "Parsing..." : "Nouvelle recette / plan"}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          style={{ display: "none" }}
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </header>

      {uploadProgress && (
        <div style={{
          padding: 12, marginBottom: 18, borderRadius: 10,
          background: "rgba(2,209,186,0.08)", border: `1px solid rgba(2,209,186,0.3)`,
          fontSize: 13, color: G, fontWeight: 600,
        }}>
          ⏳ {uploadProgress}
        </div>
      )}

      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: "rgba(255,255,255,0.4)" }}>
          Chargement...
        </div>
      ) : (
        <>
          {/* Plans */}
          {items.plans?.length > 0 && (
            <section style={{ marginBottom: 24 }}>
              <h3 style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(255,255,255,0.5)", marginBottom: 12 }}>
                Plans nutritionnels ({items.plans.length})
              </h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10 }}>
                {items.plans.map((p) => (
                  <PlanCard key={p.id} plan={p} onSelectRecipe={setReviewRecipe} />
                ))}
              </div>
            </section>
          )}

          {/* Standalone recipes */}
          {items.standalone?.length > 0 && (
            <section>
              <h3 style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(255,255,255,0.5)", marginBottom: 12 }}>
                Recettes individuelles ({items.standalone.length})
              </h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
                {items.standalone.map((r) => (
                  <RecipeCard key={r.id} recipe={r} onClick={() => setReviewRecipe(r)} onDelete={() => deleteRecipe(r)} />
                ))}
              </div>
            </section>
          )}

          {!items.plans?.length && !items.standalone?.length && (
            <div style={{
              padding: 60, textAlign: "center", borderRadius: 16,
              border: "1px dashed rgba(255,255,255,0.1)",
              color: "rgba(255,255,255,0.5)", fontSize: 14,
            }}>
              Pas encore de recettes. Upload un PDF pour commencer.
            </div>
          )}
        </>
      )}

      {reviewRecipe && (
        <RecipeReviewModal
          recipeId={reviewRecipe.id}
          onClose={() => setReviewRecipe(null)}
          onSaved={async (published) => {
            // Update optimiste : badge passe en vert "Publiée" instantanément
            if (published) {
              setItems((prev) => ({
                ...prev,
                standalone: (prev.standalone || []).map((r) =>
                  r.id === reviewRecipe.id ? { ...r, parsing_status: "published", published_at: new Date().toISOString() } : r
                ),
              }));
            }
            setReviewRecipe(null);
            await load();
          }}
        />
      )}
    </div>
  );
}

// =====================================================
// PlanCard
// =====================================================
function PlanCard({ plan, onSelectRecipe }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div style={{ padding: 16, borderRadius: 14, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", cursor: "pointer" }}
        onClick={() => { haptic.light(); setExpanded((e) => !e); }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, color: "#fff", marginBottom: 4 }}>
            {plan.title || "Plan sans titre"}
          </div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>
            {plan.recipes_extracted} recettes · {plan.page_count}p · {new Date(plan.created_at).toLocaleDateString("fr-FR")}
          </div>
        </div>
        <span style={{ fontSize: 14, color: "rgba(255,255,255,0.4)", marginLeft: 12 }}>{expanded ? "▲" : "▼"}</span>
      </div>
      {expanded && plan.recipes && (
        <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 8 }}>
          {plan.recipes.map((r) => (
            <RecipeCard key={r.id} recipe={r} onClick={() => onSelectRecipe(r)} compact />
          ))}
        </div>
      )}
    </div>
  );
}

// =====================================================
// RecipeCard
// =====================================================
function RecipeCard({ recipe, onClick, onDelete, compact }) {
  const status = recipe.parsing_status;
  const statusColor =
    status === "published" ? G :
    status === "needs_review" ? YELLOW :
    status === "failed" ? RED :
    "rgba(255,255,255,0.4)";
  const statusLabel =
    status === "published" ? "Publiee" :
    status === "needs_review" ? "A verifier" :
    status === "failed" ? "Echec" :
    status === "parsing" ? "Parsing..." :
    "Brouillon";

  const m = recipe.macros_per_serving || {};

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => { haptic.selection(); onClick(); }}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { haptic.selection(); onClick(); } }}
      style={{
        position: "relative",
        textAlign: "left", padding: compact ? 12 : 14, borderRadius: 12,
        background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)",
        color: "#fff", cursor: "pointer", fontFamily: "inherit",
        transition: "background 0.15s, border-color 0.15s",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.07)"; e.currentTarget.style.borderColor = "rgba(2,209,186,0.3)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"; }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
        <div style={{ fontSize: compact ? 13 : 14, fontWeight: 700, lineHeight: 1.2, flex: 1, paddingRight: 6 }}>
          {recipe.title}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          <span style={{
            fontSize: 9, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase",
            padding: "3px 7px", borderRadius: 6,
            color: statusColor, background: `${statusColor}20`, border: `1px solid ${statusColor}40`,
          }}>{statusLabel}</span>
          {onDelete && (
            <button
              type="button"
              aria-label="Supprimer"
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              style={{
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                width: 24, height: 24, borderRadius: 6,
                background: "transparent", border: "1px solid rgba(255,255,255,0.08)",
                color: "rgba(255,255,255,0.4)", cursor: "pointer", padding: 0,
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.12)"; e.currentTarget.style.borderColor = "rgba(239,68,68,0.4)"; e.currentTarget.style.color = "#ef4444"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; e.currentTarget.style.color = "rgba(255,255,255,0.4)"; }}
            >
              <AppIcon name="trash" size={12} />
            </button>
          )}
        </div>
      </div>
      {m.calories != null && (
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.55)", display: "flex", gap: 8, flexWrap: "wrap" }}>
          <span>{Math.round(m.calories)} kcal</span>
          <span>·</span>
          <span>{Math.round(m.proteines || 0)}g prot</span>
          <span>·</span>
          <span>{Math.round(m.glucides || 0)}g glu</span>
          <span>·</span>
          <span>{Math.round(m.lipides || 0)}g lip</span>
        </div>
      )}
      {recipe.tags?.length > 0 && (
        <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 4 }}>
          {recipe.tags.slice(0, 3).map((t) => (
            <span key={t} style={{
              fontSize: 9, padding: "2px 6px", borderRadius: 4,
              background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.6)",
            }}>{t}</span>
          ))}
        </div>
      )}
    </div>
  );
}

// =====================================================
// RecipeReviewModal — split-screen edit + publish
// =====================================================
function RecipeReviewModal({ recipeId, onClose, onSaved }) {
  const [recipe, setRecipe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [edits, setEdits] = useState({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const r = await fetch(`/api/recipes/get?id=${recipeId}`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (!r.ok) throw new Error(`fetch ${r.status}`);
        const { recipe } = await r.json();
        if (!cancelled) setRecipe(recipe);
      } catch (err) {
        toast(`Erreur: ${err.message}`, "error");
        onClose();
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [recipeId, onClose]);

  const [generatingVariant, setGeneratingVariant] = useState(null);

  const generateVariant = async (variantType) => {
    if (!confirm(`Generer une variante "${variantType}" via IA ? La nouvelle recette sera creee en mode 'a verifier'.`)) return;
    setGeneratingVariant(variantType);
    haptic.medium();
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const r = await fetch('/api/recipes/generate-variant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ recipe_id: recipeId, variant_type: variantType }),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.error || `gen ${r.status}`);
      }
      toast(`Variante "${variantType}" creee !`, 'success');
      onSaved();
    } catch (err) {
      toast(`Erreur: ${err.message}`, 'error');
    } finally {
      setGeneratingVariant(null);
    }
  };

  const updateField = (key, val) => setEdits((e) => ({ ...e, [key]: val }));
  const updateIngredient = (idx, key, val) => {
    setEdits((e) => {
      const ings = e.ingredients ?? recipe.recipe_ingredients.map((i) => ({ ...i }));
      ings[idx] = { ...ings[idx], [key]: val };
      return { ...e, ingredients: ings };
    });
  };
  const removeIngredient = (idx) => {
    setEdits((e) => {
      const ings = (e.ingredients ?? recipe.recipe_ingredients.map((i) => ({ ...i }))).filter((_, i) => i !== idx);
      return { ...e, ingredients: ings };
    });
  };

  const save = async (publish) => {
    setSaving(true);
    haptic.medium();
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const body = { ...edits };
      if (publish) body.publish = true;
      const r = await fetch(`/api/recipes/update?id=${recipeId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(body),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.error || `save ${r.status}`);
      }
      toast(publish ? "Recette publiee !" : "Sauvegarde", "success");
      onSaved(publish === true);
    } catch (err) {
      toast(`Erreur: ${err.message}`, "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading || !recipe) {
    return (
      <Modal onClose={onClose}>
        <div style={{ padding: 60, textAlign: "center", color: "rgba(255,255,255,0.5)" }}>Chargement...</div>
      </Modal>
    );
  }

  const ings = edits.ingredients ?? recipe.recipe_ingredients;
  const m = recipe.macros_per_serving || {};

  return (
    <Modal onClose={onClose}>
      <div style={{ padding: 24, maxHeight: "85vh", overflowY: "auto" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
          <input
            value={edits.title ?? recipe.title}
            onChange={(e) => updateField("title", e.target.value)}
            style={{
              fontSize: 20, fontWeight: 800, color: "#fff", background: "transparent",
              border: "none", outline: "none", flex: 1, minWidth: 0,
              borderBottom: "1px solid transparent", paddingBottom: 4,
            }}
            onFocus={(e) => e.target.style.borderBottomColor = "rgba(2,209,186,0.4)"}
            onBlur={(e) => e.target.style.borderBottomColor = "transparent"}
          />
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.5)", fontSize: 22, cursor: "pointer", padding: 4 }}>×</button>
        </div>

        {/* Macros header */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 20 }}>
          {[
            { label: "kcal", val: m.calories },
            { label: "prot", val: m.proteines },
            { label: "glu", val: m.glucides },
            { label: "lip", val: m.lipides },
          ].map((stat) => (
            <div key={stat.label} style={{
              padding: "10px 12px", borderRadius: 10,
              background: "rgba(2,209,186,0.06)", border: "1px solid rgba(2,209,186,0.15)",
              textAlign: "center",
            }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: "#fff" }}>{Math.round(stat.val || 0)}</div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Description + meta */}
        <Field label="Description" >
          <textarea
            value={edits.description ?? recipe.description ?? ""}
            onChange={(e) => updateField("description", e.target.value)}
            rows={2}
            style={fieldStyle("textarea")}
          />
        </Field>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 16 }}>
          <Field label="Portions">
            <input
              type="number" min={1}
              value={edits.servings ?? recipe.servings}
              onChange={(e) => updateField("servings", parseInt(e.target.value, 10) || 1)}
              style={fieldStyle()}
            />
          </Field>
          <Field label="Prep (min)">
            <input
              type="number" min={0}
              value={edits.prep_time_min ?? recipe.prep_time_min ?? ""}
              onChange={(e) => updateField("prep_time_min", e.target.value ? parseInt(e.target.value, 10) : null)}
              style={fieldStyle()}
            />
          </Field>
          <Field label="Cuisson (min)">
            <input
              type="number" min={0}
              value={edits.cook_time_min ?? recipe.cook_time_min ?? ""}
              onChange={(e) => updateField("cook_time_min", e.target.value ? parseInt(e.target.value, 10) : null)}
              style={fieldStyle()}
            />
          </Field>
        </div>

        {/* Ingredients */}
        <h3 style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(255,255,255,0.55)", marginBottom: 10 }}>
          Ingrédients ({ings.length})
        </h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 20 }}>
          {ings.map((ing, i) => {
            const conf = ing.match_confidence;
            const confColor = !conf ? RED : conf >= 0.85 ? G : conf >= 0.65 ? YELLOW : RED;
            return (
              <div key={ing.id ?? i} style={{
                display: "grid", gridTemplateColumns: "8px 1fr 60px 80px 1fr 28px",
                gap: 8, alignItems: "center", padding: "8px 10px",
                borderRadius: 8, background: "rgba(255,255,255,0.03)",
              }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: confColor }} />
                <input
                  value={ing.ingredient_name}
                  onChange={(e) => updateIngredient(i, "ingredient_name", e.target.value)}
                  style={fieldStyle("inline")}
                />
                <input
                  type="number" step="any"
                  value={ing.quantity ?? ""}
                  onChange={(e) => updateIngredient(i, "quantity", e.target.value ? parseFloat(e.target.value) : null)}
                  style={fieldStyle("inline")}
                />
                <input
                  value={ing.unit ?? ""}
                  onChange={(e) => updateIngredient(i, "unit", e.target.value || null)}
                  placeholder="g"
                  style={fieldStyle("inline")}
                />
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>
                  → {ing.food_match_name || "(unmatched)"}
                  {conf != null && <span style={{ color: confColor, marginLeft: 6 }}>{Math.round(conf * 100)}%</span>}
                </div>
                <button
                  onClick={() => removeIngredient(i)}
                  style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", fontSize: 16 }}
                >×</button>
              </div>
            );
          })}
        </div>

        {/* Instructions */}
        <Field label="Instructions">
          <textarea
            value={edits.instructions ?? recipe.instructions ?? ""}
            onChange={(e) => updateField("instructions", e.target.value)}
            rows={5}
            style={fieldStyle("textarea")}
          />
        </Field>

        {/* Variantes IA */}
        <div style={{ marginTop: 20, padding: 14, borderRadius: 12, background: "rgba(167,139,250,0.05)", border: "1px solid rgba(167,139,250,0.15)" }}>
          <div style={{ fontSize: 11, color: "rgba(167,139,250,0.9)", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8 }}>
            Générer une variante · IA
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {['low-carb', 'vegan', 'gluten-free', 'high-protein', 'lactose-free'].map((vt) => (
              <button
                key={vt}
                onClick={() => generateVariant(vt)}
                disabled={!!generatingVariant || saving}
                style={{
                  padding: "6px 12px", borderRadius: 999, fontSize: 11, fontWeight: 700,
                  background: generatingVariant === vt ? "rgba(167,139,250,0.3)" : "rgba(167,139,250,0.1)",
                  border: "1px solid rgba(167,139,250,0.3)",
                  color: "#a78bfa", cursor: generatingVariant ? "wait" : "pointer",
                }}
              >{generatingVariant === vt ? "..." : vt}</button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: "flex", gap: 10, marginTop: 24, justifyContent: "flex-end" }}>
          <button
            onClick={onClose}
            disabled={saving}
            style={{
              padding: "10px 16px", borderRadius: 10, fontWeight: 700, fontSize: 13,
              background: "transparent", border: "1px solid rgba(255,255,255,0.15)",
              color: "rgba(255,255,255,0.7)", cursor: "pointer",
            }}
          >Annuler</button>
          <button
            onClick={() => save(false)}
            disabled={saving}
            style={{
              padding: "10px 16px", borderRadius: 10, fontWeight: 700, fontSize: 13,
              background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
              color: "#fff", cursor: saving ? "wait" : "pointer",
            }}
          >Sauvegarder</button>
          <button
            onClick={() => save(true)}
            disabled={saving}
            style={{
              padding: "10px 16px", borderRadius: 10, fontWeight: 800, fontSize: 13,
              background: G, border: "none", color: "#0a0a0a",
              cursor: saving ? "wait" : "pointer",
            }}
          >{saving ? "..." : "Publier"}</button>
        </div>
      </div>
    </Modal>
  );
}

// Modal wrapper
function Modal({ children, onClose }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 1000, padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#0f0f0f", borderRadius: 16, maxWidth: 720, width: "100%",
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
        }}
      >
        {children}
      </div>
    </div>
  );
}

// Helpers UI
function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</div>
      {children}
    </div>
  );
}

function fieldStyle(variant) {
  const base = {
    width: "100%",
    padding: variant === "inline" ? "6px 8px" : "8px 10px",
    borderRadius: 8,
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    color: "#fff",
    fontSize: variant === "inline" ? 12 : 13,
    fontFamily: "inherit",
    outline: "none",
  };
  if (variant === "textarea") {
    base.resize = "vertical";
    base.minHeight = 60;
    base.fontFamily = "'Inter', sans-serif";
  }
  return base;
}

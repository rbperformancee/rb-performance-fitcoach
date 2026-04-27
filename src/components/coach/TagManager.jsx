import React, { useState } from "react";
import { supabase } from "../../lib/supabase";
import AppIcon from "../AppIcon";
import { toast } from "../Toast";
import haptic from "../../lib/haptic";
import { useT } from "../../lib/i18n";

// Palette de couleurs assignees automatiquement selon le hash du tag
const COLORS = [
  "#02d1ba", "#f97316", "#a78bfa", "#fbbf24", "#ef4444",
  "#34d399", "#ec4899", "#818cf8", "#06b6d4", "#f59e0b",
];

/**
 * Hash stable : mappe un tag string a une couleur (consistante).
 */
export function tagColor(tag) {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) hash = (hash * 31 + tag.charCodeAt(i)) | 0;
  return COLORS[Math.abs(hash) % COLORS.length];
}

/**
 * TagBadge — simple pill colore pour afficher un tag.
 */
export function TagBadge({ tag, onRemove, compact = false }) {
  const t = useT();
  const color = tagColor(tag);
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: compact ? "2px 8px" : "4px 10px",
      background: `${color}15`,
      border: `1px solid ${color}35`,
      borderRadius: 100,
      color,
      fontSize: compact ? 9 : 10,
      fontWeight: 700,
      letterSpacing: "0.3px",
      fontFamily: "-apple-system,Inter,sans-serif",
      whiteSpace: "nowrap",
    }}>
      {tag}
      {onRemove && (
        <button
          onClick={(e) => { e.stopPropagation(); haptic.light(); onRemove(tag); }}
          aria-label={t("tg.aria_remove").replace("{tag}", tag)}
          style={{ background: "none", border: "none", color, cursor: "pointer", padding: 0, display: "flex", alignItems: "center", opacity: 0.7 }}
        >
          <AppIcon name="x" size={10} color={color} strokeWidth={2.5} />
        </button>
      )}
    </span>
  );
}

/**
 * TagManager — edition des tags d'un client.
 * Affiche les tags existants + input pour en ajouter de nouveaux.
 * Sauvegarde directement dans clients.tags.
 */
export default function TagManager({ client, onUpdate }) {
  const t = useT();
  const [tags, setTags] = useState(client.tags || []);
  const [input, setInput] = useState("");
  const [saving, setSaving] = useState(false);

  // Direct add (sans dependre du state input — evite race avec setTimeout)
  const addTagDirect = async (rawTag) => {
    const tag = (rawTag || "").trim();
    if (!tag || tags.includes(tag) || saving) return;
    if (tag.length > 30) { toast.error(t("tg.toast_too_long")); return; }
    const next = [...tags, tag];
    setTags(next);
    setInput("");
    haptic.light();
    setSaving(true);
    const { error } = await supabase.from("clients").update({ tags: next }).eq("id", client.id);
    setSaving(false);
    if (error) {
      toast.error(t("tg.toast_save_error"));
      setTags(tags); // rollback
      return;
    }
    onUpdate?.(next);
  };

  const addTag = () => addTagDirect(input);

  const removeTag = async (tag) => {
    const next = tags.filter((x) => x !== tag);
    setTags(next);
    const { error } = await supabase.from("clients").update({ tags: next }).eq("id", client.id);
    if (error) { toast.error(t("tg.toast_error")); return; }
    onUpdate?.(next);
  };

  // Suggestions courantes
  const SUGGESTIONS = ["Prise de masse", "Perte de poids", "Performance", "Blessure", "VIP", "Debutant", "Avance", "Competition"];
  const unusedSuggestions = SUGGESTIONS.filter((s) => !tags.includes(s));

  return (
    <div>
      {/* Tags existants */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
        {tags.length > 0 ? (
          tags.map((tag) => <TagBadge key={tag} tag={tag} onRemove={removeTag} />)
        ) : (
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", fontStyle: "italic" }}>{t("tg.empty")}</div>
        )}
      </div>

      {/* Input + bouton add */}
      <div style={{ display: "flex", gap: 8 }}>
        <input
          type="text"
          maxLength={30}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
          placeholder={t("tg.input_placeholder")}
          style={{
            flex: 1, padding: "10px 14px",
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 10, color: "#fff",
            fontSize: 13, outline: "none",
            fontFamily: "-apple-system,Inter,sans-serif",
          }}
        />
        <button
          onClick={addTag}
          disabled={!input.trim() || saving}
          style={{
            padding: "10px 16px",
            background: input.trim() ? "#02d1ba" : "rgba(255,255,255,0.04)",
            color: input.trim() ? "#000" : "rgba(255,255,255,0.3)",
            border: "none", borderRadius: 10,
            fontSize: 11, fontWeight: 800, letterSpacing: "0.5px", textTransform: "uppercase",
            cursor: input.trim() ? "pointer" : "default",
            minWidth: 60, fontFamily: "inherit",
          }}
        >
          <AppIcon name="plus" size={14} color={input.trim() ? "#000" : "rgba(255,255,255,0.3)"} strokeWidth={2.5} />
        </button>
      </div>

      {/* Suggestions */}
      {unusedSuggestions.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <div style={{ fontSize: 9, letterSpacing: "1.5px", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", fontWeight: 700, marginBottom: 6 }}>{t("tg.suggestions_label")}</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
            {unusedSuggestions.slice(0, 5).map((s) => (
              <button
                key={s}
                onClick={() => addTagDirect(s)}
                aria-label={t("tg.aria_add_suggestion").replace("{s}", s)}
                style={{
                  padding: "6px 12px",
                  background: "rgba(255,255,255,0.03)",
                  border: "1px dashed rgba(255,255,255,0.12)",
                  borderRadius: 100,
                  color: "rgba(255,255,255,0.5)",
                  fontSize: 10, fontWeight: 600, cursor: "pointer",
                  fontFamily: "inherit",
                  minHeight: 32,
                }}
              >
                + {s}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

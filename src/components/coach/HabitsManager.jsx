import React, { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { toast } from "../Toast";
import haptic from "../../lib/haptic";

const G = "#02d1ba";

const PRESET_HABITS = [
  { name: "8h de sommeil",    icon: "ZZ" },
  { name: "2L d'eau",         icon: "H2O" },
  { name: "10 min étirement", icon: "ST" },
  { name: "Créatine",         icon: "CR" },
  { name: "Protéines 1.8g/kg", icon: "PR" },
  { name: "10 000 pas",       icon: "10K" },
  { name: "Pas d'écran 1h avant dodo", icon: "OFF" },
  { name: "Méditation 5 min", icon: "ZN" },
];

const COLORS = ["#02d1ba", "#a78bfa", "#f472b6", "#fbbf24", "#34d399", "#fb923c"];

/**
 * HabitsManager — modal coach pour gérer les habitudes d'un client.
 *
 * Le coach peut :
 *   - Ajouter une habitude (preset ou custom)
 *   - Renommer / changer la couleur / désactiver
 *   - Réordonner (drag-like via boutons up/down)
 *
 * Limite soft à 5 habitudes actives (UI hint, pas un check DB).
 */
export default function HabitsManager({ open, onClose, onChange, client }) {
  const notify = () => { if (typeof onChange === "function") onChange(); };
  const [habits, setHabits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customIcon, setCustomIcon] = useState("");

  useEffect(() => {
    if (!open || !client?.id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("habits")
        .select("id, name, icon, color, ordre, active")
        .eq("client_id", client.id)
        .order("ordre", { ascending: true });
      if (cancelled) return;
      if (error) toast.error("Erreur chargement");
      setHabits(data || []);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [open, client?.id]);

  if (!open) return null;

  async function addHabit(name, icon) {
    if (!name.trim()) return;
    haptic.light();
    const ordre = habits.length;
    const color = COLORS[ordre % COLORS.length];
    const { data, error } = await supabase.from("habits").insert({
      client_id: client.id,
      name: name.trim().slice(0, 40),
      icon: (icon || "").trim().slice(0, 4) || null,
      color,
      ordre,
      active: true,
    }).select("id, name, icon, color, ordre, active").single();
    if (error) { toast.error("Erreur ajout"); return; }
    setHabits((h) => [...h, data]);
    setCustomName(""); setCustomIcon("");
    setShowAdd(false);
    toast.success("Habitude ajoutée");
    notify();
  }

  async function toggleActive(habit) {
    haptic.light();
    const next = !habit.active;
    const { error } = await supabase.from("habits").update({ active: next }).eq("id", habit.id);
    if (error) { toast.error("Erreur"); return; }
    setHabits((hs) => hs.map((h) => h.id === habit.id ? { ...h, active: next } : h));
    notify();
  }

  async function renameHabit(habit, newName) {
    if (!newName.trim() || newName === habit.name) return;
    const trimmed = newName.trim().slice(0, 40);
    const { error } = await supabase.from("habits").update({ name: trimmed }).eq("id", habit.id);
    if (error) { toast.error("Erreur"); return; }
    setHabits((hs) => hs.map((h) => h.id === habit.id ? { ...h, name: trimmed } : h));
    notify();
  }

  async function changeColor(habit, color) {
    haptic.light();
    const { error } = await supabase.from("habits").update({ color }).eq("id", habit.id);
    if (error) { toast.error("Erreur"); return; }
    setHabits((hs) => hs.map((h) => h.id === habit.id ? { ...h, color } : h));
    notify();
  }

  async function deleteHabit(habit) {
    if (!window.confirm(`Supprimer "${habit.name}" et tout son historique ?`)) return;
    haptic.medium();
    const { error } = await supabase.from("habits").delete().eq("id", habit.id);
    if (error) { toast.error("Erreur"); return; }
    setHabits((hs) => hs.filter((h) => h.id !== habit.id));
    toast.success("Supprimée");
  }

  async function move(habit, direction) {
    const idx = habits.findIndex((h) => h.id === habit.id);
    const swapIdx = idx + direction;
    if (swapIdx < 0 || swapIdx >= habits.length) return;
    haptic.light();
    const swap = habits[swapIdx];
    // Swap les ordre values des deux habits
    await Promise.all([
      supabase.from("habits").update({ ordre: swapIdx }).eq("id", habit.id),
      supabase.from("habits").update({ ordre: idx }).eq("id", swap.id),
    ]);
    const next = [...habits];
    next[idx] = { ...swap, ordre: idx };
    next[swapIdx] = { ...habit, ordre: swapIdx };
    setHabits(next);
  }

  const activeCount = habits.filter((h) => h.active).length;

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
      style={{
        position: "fixed", inset: 0, zIndex: 1250,
        background: "rgba(0,0,0,0.85)", backdropFilter: "blur(12px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20,
        fontFamily: "-apple-system,'Inter',sans-serif",
      }}
    >
      <div style={{
        background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 20, maxWidth: 580, width: "100%", maxHeight: "90vh",
        display: "flex", flexDirection: "column", overflow: "hidden",
      }}>
        {/* HEADER */}
        <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: 3, color: G, textTransform: "uppercase", marginBottom: 6 }}>
              Habitudes quotidiennes
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#fff", letterSpacing: -0.3, lineHeight: 1.2 }}>
              {client?.full_name || client?.email}
            </div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 4 }}>
              {activeCount} active{activeCount !== 1 ? "s" : ""} · idéal 3-5 max pour pas saturer
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            style={{ width: 32, height: 32, borderRadius: 10, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.7)", cursor: "pointer", fontSize: 16, lineHeight: 1, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}
          >×</button>
        </div>

        {/* CONTENT */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px 22px" }}>
          {loading && <div style={{ textAlign: "center", padding: 30, color: "rgba(255,255,255,0.4)", fontSize: 12 }}>Chargement…</div>}

          {!loading && habits.length === 0 && (
            <div style={{ padding: "30px 20px", textAlign: "center" }}>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginBottom: 14 }}>
                Aucune habitude assignée. Choisis-en 3-5 pour engager ton client les jours OFF.
              </div>
            </div>
          )}

          {!loading && habits.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 18 }}>
              {habits.map((h, i) => (
                <HabitRow
                  key={h.id}
                  habit={h}
                  onRename={(name) => renameHabit(h, name)}
                  onToggleActive={() => toggleActive(h)}
                  onChangeColor={(c) => changeColor(h, c)}
                  onDelete={() => deleteHabit(h)}
                  onMoveUp={i > 0 ? () => move(h, -1) : null}
                  onMoveDown={i < habits.length - 1 ? () => move(h, +1) : null}
                />
              ))}
            </div>
          )}

          {/* Presets + custom */}
          {!showAdd ? (
            <button
              type="button"
              onClick={() => setShowAdd(true)}
              style={{
                width: "100%",
                padding: "12px 16px",
                background: `${G}12`,
                border: `1px dashed ${G}40`,
                borderRadius: 12,
                color: G, fontSize: 12, fontWeight: 700,
                cursor: "pointer", fontFamily: "inherit",
                letterSpacing: ".05em", textTransform: "uppercase",
              }}
            >
              + Ajouter une habitude
            </button>
          ) : (
            <div style={{ padding: 14, background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12 }}>
              <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: "1.5px", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", marginBottom: 10 }}>
                Presets fréquents
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
                {PRESET_HABITS.filter((p) => !habits.some((h) => h.name === p.name)).map((p) => (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => addHabit(p.name, p.icon)}
                    style={{
                      padding: "7px 11px",
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: 8,
                      color: "rgba(255,255,255,0.75)", fontSize: 11, fontWeight: 600,
                      cursor: "pointer", fontFamily: "inherit",
                      display: "inline-flex", alignItems: "center", gap: 6,
                    }}
                  >
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 800, color: G, padding: "2px 5px", background: `${G}15`, borderRadius: 4 }}>{p.icon}</span>
                    {p.name}
                  </button>
                ))}
              </div>
              <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: "1.5px", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", marginBottom: 8 }}>
                Ou custom
              </div>
              <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
                <input
                  type="text"
                  value={customIcon}
                  onChange={(e) => setCustomIcon(e.target.value.slice(0, 4))}
                  placeholder="2-4 lettres"
                  maxLength={4}
                  style={{
                    width: 80, padding: "9px 10px",
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 8,
                    color: G, fontSize: 11, fontFamily: "'JetBrains Mono', monospace",
                    outline: "none", textAlign: "center", letterSpacing: "1px",
                    fontWeight: 700, textTransform: "uppercase",
                    boxSizing: "border-box",
                  }}
                />
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value.slice(0, 40))}
                  placeholder="Nom de l'habitude (ex: 5 min méditation)"
                  maxLength={40}
                  style={{
                    flex: 1, padding: "9px 11px",
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 8,
                    color: "#fff", fontSize: 12, fontFamily: "inherit",
                    outline: "none", boxSizing: "border-box",
                  }}
                />
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  type="button"
                  onClick={() => addHabit(customName, customIcon)}
                  disabled={!customName.trim()}
                  style={{
                    flex: 1, padding: "9px 14px",
                    background: customName.trim() ? G : "rgba(255,255,255,0.06)",
                    border: "none", borderRadius: 8,
                    color: customName.trim() ? "#000" : "rgba(255,255,255,0.3)",
                    fontSize: 11, fontWeight: 800, cursor: customName.trim() ? "pointer" : "not-allowed",
                    fontFamily: "inherit", letterSpacing: ".05em", textTransform: "uppercase",
                  }}
                >
                  Ajouter
                </button>
                <button
                  type="button"
                  onClick={() => { setShowAdd(false); setCustomName(""); setCustomIcon(""); }}
                  style={{
                    padding: "9px 14px",
                    background: "transparent", border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 8, color: "rgba(255,255,255,0.5)",
                    fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                  }}
                >Annuler</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function HabitRow({ habit, onRename, onToggleActive, onChangeColor, onDelete, onMoveUp, onMoveDown }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(habit.name);

  function commit() {
    if (name.trim() && name !== habit.name) onRename(name);
    else setName(habit.name);
    setEditing(false);
  }

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "10px 12px",
      background: habit.active ? "rgba(255,255,255,0.025)" : "rgba(255,255,255,0.01)",
      border: `1px solid ${habit.active ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.03)"}`,
      borderRadius: 10,
      opacity: habit.active ? 1 : 0.5,
    }}>
      {/* Move buttons */}
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <button type="button" onClick={onMoveUp} disabled={!onMoveUp} style={moveBtn(!!onMoveUp)}>↑</button>
        <button type="button" onClick={onMoveDown} disabled={!onMoveDown} style={moveBtn(!!onMoveDown)}>↓</button>
      </div>
      {/* Icon (cliquable → cycle color) */}
      <button
        type="button"
        onClick={() => {
          const next = COLORS[(COLORS.indexOf(habit.color) + 1) % COLORS.length];
          onChangeColor(next);
        }}
        title="Cliquer pour changer la couleur"
        style={{
          width: 30, height: 30, borderRadius: 8,
          background: `${habit.color}18`, border: `1px solid ${habit.color}45`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 9, fontWeight: 800, color: habit.color,
          letterSpacing: ".5px",
          cursor: "pointer", flexShrink: 0,
        }}
      >
        {habit.icon || "—"}
      </button>
      {/* Name */}
      {editing ? (
        <input
          type="text"
          value={name}
          autoFocus
          onChange={(e) => setName(e.target.value.slice(0, 40))}
          onBlur={commit}
          onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") { setName(habit.name); setEditing(false); } }}
          style={{
            flex: 1, padding: "6px 8px",
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.15)",
            borderRadius: 6,
            color: "#fff", fontSize: 13, fontFamily: "inherit", outline: "none",
            boxSizing: "border-box",
          }}
        />
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          style={{
            flex: 1, padding: "6px 4px", textAlign: "left",
            background: "transparent", border: "none",
            color: "#fff", fontSize: 13, fontWeight: 600,
            cursor: "text", fontFamily: "inherit",
            textDecoration: !habit.active ? "line-through" : "none",
          }}
        >
          {habit.name}
        </button>
      )}
      {/* Active toggle */}
      <button
        type="button"
        onClick={onToggleActive}
        title={habit.active ? "Désactiver" : "Réactiver"}
        style={{
          padding: "4px 10px",
          background: habit.active ? `${G}15` : "rgba(255,255,255,0.04)",
          border: `1px solid ${habit.active ? G + "40" : "rgba(255,255,255,0.1)"}`,
          borderRadius: 6,
          color: habit.active ? G : "rgba(255,255,255,0.4)",
          fontSize: 9, fontWeight: 800, cursor: "pointer", fontFamily: "inherit",
          letterSpacing: "1px", textTransform: "uppercase",
        }}
      >
        {habit.active ? "ON" : "OFF"}
      </button>
      {/* Delete */}
      <button
        type="button"
        onClick={onDelete}
        title="Supprimer"
        style={{
          width: 26, height: 26, borderRadius: 6,
          background: "transparent", border: "1px solid rgba(255,255,255,0.06)",
          color: "rgba(239,68,68,0.6)", fontSize: 14, lineHeight: 1,
          cursor: "pointer", fontFamily: "inherit",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >×</button>
    </div>
  );
}

const moveBtn = (enabled) => ({
  width: 18, height: 14,
  background: "transparent", border: "none",
  color: enabled ? "rgba(255,255,255,0.45)" : "rgba(255,255,255,0.1)",
  fontSize: 10, lineHeight: 1, cursor: enabled ? "pointer" : "default",
  fontFamily: "inherit", padding: 0,
});

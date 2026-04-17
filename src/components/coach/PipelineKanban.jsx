import React, { useState, useMemo, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import AppIcon from "../AppIcon";
import { toast } from "../Toast";
import haptic from "../../lib/haptic";
import { calculateChurnRisk } from "../../lib/coachIntelligence";

const COLUMNS = [
  { id: "new",       label: "Nouveau",       color: "#818cf8", icon: "sparkles" },
  { id: "active",    label: "Actif",         color: "#02d1ba", icon: "check-circle" },
  { id: "at_risk",   label: "A risque",      color: "#00C9A7", icon: "alert" },
  { id: "to_renew",  label: "A renouveler",  color: "#fbbf24", icon: "calendar" },
  { id: "completed", label: "Termine",       color: "rgba(255,255,255,0.4)", icon: "check" },
];

/**
 * PipelineKanban — vue Kanban des clients par statut.
 * Drag and drop entre colonnes (supporte aussi tap pour mobile via menu).
 */
export default function PipelineKanban({ clients = [], onOpenClient, onClose }) {
  const [dragged, setDragged] = useState(null);
  const [hoveredCol, setHoveredCol] = useState(null);
  const [localStatuses, setLocalStatuses] = useState({}); // id -> status (optimistic)
  const [search, setSearch] = useState("");

  // Escape key pour fermer
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose?.(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const getStatus = (c) => localStatuses[c.id] || c.pipeline_status || "new";

  const grouped = useMemo(() => {
    const g = { new: [], active: [], at_risk: [], to_renew: [], completed: [] };
    const q = search.trim().toLowerCase();
    clients.forEach((c) => {
      // Filtre search par nom/email/tag
      if (q) {
        const haystack = [c.full_name, c.email, ...(c.tags || [])].filter(Boolean).join(" ").toLowerCase();
        if (!haystack.includes(q)) return;
      }
      const s = getStatus(c);
      if (g[s]) g[s].push(c);
      else g.new.push(c);
    });
    return g;
  }, [clients, localStatuses, search]); // eslint-disable-line

  const moveClient = async (client, newStatus) => {
    if (getStatus(client) === newStatus) return;
    // Optimistic update
    setLocalStatuses((prev) => ({ ...prev, [client.id]: newStatus }));
    haptic.success();
    const { error } = await supabase.from("clients").update({ pipeline_status: newStatus }).eq("id", client.id);
    if (error) {
      toast.error("Deplacement impossible");
      setLocalStatuses((prev) => { const n = { ...prev }; delete n[client.id]; return n; });
      return;
    }
    // Log activity
    await supabase.from("coach_activity_log").insert({
      coach_id: client.coach_id,
      client_id: client.id,
      activity_type: "pipeline",
      details: `Deplace vers ${COLUMNS.find((c) => c.id === newStatus)?.label}`,
    });
    toast.success(`${client.full_name?.split(" ")[0] || "Client"} → ${COLUMNS.find((c) => c.id === newStatus)?.label}`);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Pipeline clients"
      style={{ position: "fixed", inset: 0, zIndex: 600, background: "#080C14", overflowY: "auto", WebkitOverflowScrolling: "touch", fontFamily: "-apple-system,Inter,sans-serif", color: "#fff" }}
    >
      <style>{`@keyframes kanFade{from{opacity:0}to{opacity:1}} @keyframes kanSlide{from{transform:translateY(8px);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>

      {/* Header */}
      <div style={{ position: "sticky", top: 0, zIndex: 10, background: "rgba(8,12,20,0.95)", backdropFilter: "blur(16px)", padding: "calc(env(safe-area-inset-top, 12px) + 16px) 24px 16px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            onClick={onClose}
            aria-label="Fermer"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 100, width: 36, height: 36, color: "rgba(255,255,255,0.6)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <AppIcon name="arrow-left" size={14} color="rgba(255,255,255,0.6)" />
          </button>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, letterSpacing: ".2em", textTransform: "uppercase", color: "#4A4A5A", fontWeight: 700 }}>Pipeline</div>
            <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 24, fontWeight: 900, color: "#fff", letterSpacing: "-0.03em" }}>Ton pipeline<span style={{ color: "#00C9A7" }}>.</span></div>
          </div>
        </div>
        {/* Search input */}
        <div style={{ marginTop: 12, position: "relative" }}>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un client, email, tag..."
            style={{ width: "100%", boxSizing: "border-box", padding: "10px 14px 10px 38px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, color: "#fff", fontSize: 14, outline: "none", fontFamily: "-apple-system,Inter,sans-serif" }}
          />
          <div style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.3)", pointerEvents: "none" }}>
            <AppIcon name="search" size={14} color="rgba(255,255,255,0.4)" />
          </div>
        </div>
      </div>

      {/* Kanban columns (horizontal scroll mobile) */}
      <div style={{ display: "flex", gap: 14, padding: "20px 16px 60px", overflowX: "auto", WebkitOverflowScrolling: "touch", minHeight: "calc(100vh - 100px)" }}>
        {COLUMNS.map((col) => {
          const items = grouped[col.id] || [];
          const isHovered = hoveredCol === col.id && dragged;
          return (
            <div
              key={col.id}
              onDragOver={(e) => { e.preventDefault(); setHoveredCol(col.id); }}
              onDragLeave={() => setHoveredCol(null)}
              onDrop={(e) => {
                e.preventDefault();
                setHoveredCol(null);
                if (dragged) moveClient(dragged, col.id);
                setDragged(null);
              }}
              style={{
                flex: "0 0 260px",
                background: isHovered ? `${col.color}12` : "rgba(255,255,255,0.02)",
                border: isHovered ? `2px dashed ${col.color}` : "1px solid rgba(255,255,255,0.05)",
                borderRadius: 16,
                padding: 14,
                transition: "background 0.15s, border 0.15s",
                animation: "kanFade 0.3s ease both",
              }}
            >
              {/* Column header */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: `${col.color}15`, display: "flex", alignItems: "center", justifyContent: "center", color: col.color }}>
                    <AppIcon name={col.icon} size={14} color={col.color} />
                  </div>
                  <div style={{ fontSize: 11, letterSpacing: "1px", textTransform: "uppercase", color: col.color, fontWeight: 800 }}>{col.label}</div>
                </div>
                <div style={{ fontSize: 12, fontWeight: 800, color: col.color, background: `${col.color}15`, padding: "2px 10px", borderRadius: 100 }}>{items.length}</div>
              </div>

              {/* Cards */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {items.length === 0 ? (
                  <div style={{ padding: 20, textAlign: "center", color: "rgba(255,255,255,0.2)", fontSize: 11, border: "1px dashed rgba(255,255,255,0.06)", borderRadius: 10 }}>
                    Vide
                  </div>
                ) : (
                  items.map((c) => <KanbanCard key={c.id} client={c} onOpen={onOpenClient} onMoveTo={(st) => moveClient(c, st)} onDragStart={() => setDragged(c)} onDragEnd={() => setDragged(null)} />)
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function KanbanCard({ client, onOpen, onMoveTo, onDragStart, onDragEnd }) {
  const [showMenu, setShowMenu] = useState(false);
  const firstName = client.full_name?.split(" ")[0] || client.email?.split("@")[0] || "—";
  const churn = calculateChurnRisk(client);
  const daysLeft = client.subscription_end_date
    ? Math.ceil((new Date(client.subscription_end_date).getTime() - Date.now()) / 86400000)
    : null;
  const activity = client._inactiveDays ?? null;

  return (
    <div
      draggable
      onDragStart={(e) => { onDragStart?.(); e.dataTransfer.setData("text/plain", client.id); }}
      onDragEnd={onDragEnd}
      onClick={() => { haptic.light(); onOpen?.(client); }}
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: 12,
        padding: 12,
        cursor: "grab",
        position: "relative",
        animation: "kanSlide 0.2s ease both",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(2,209,186,0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "#02d1ba", fontSize: 12, fontWeight: 800, flexShrink: 0 }}>
          {firstName[0]?.toUpperCase() || "?"}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{firstName}</div>
          <div style={{ fontSize: 9, color: "rgba(255,255,255,0.4)" }}>{activity !== null ? `${activity}j` : "Jamais connecte"}</div>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); setShowMenu((s) => !s); }}
          aria-label="Menu actions client"
          style={{ background: "none", border: "none", color: "rgba(255,255,255,0.3)", cursor: "pointer", padding: 0, display: "flex", alignItems: "center", justifyContent: "center", minWidth: 32, minHeight: 32 }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>
        </button>
      </div>

      {/* Stats ligne */}
      <div style={{ display: "flex", gap: 6, fontSize: 9, color: "rgba(255,255,255,0.5)", flexWrap: "wrap" }}>
        <span style={{ padding: "2px 6px", background: `${churn >= 40 ? "rgba(255,107,107,0.12)" : "rgba(255,255,255,0.04)"}`, color: churn >= 40 ? "#ff6b6b" : "rgba(255,255,255,0.5)", borderRadius: 6, fontWeight: 700 }}>
          Risque {churn}
        </span>
        {daysLeft !== null && (
          <span style={{ padding: "2px 6px", background: daysLeft <= 0 ? "rgba(255,107,107,0.12)" : daysLeft <= 14 ? "rgba(0,201,167,0.12)" : "rgba(255,255,255,0.04)", color: daysLeft <= 0 ? "#ff6b6b" : daysLeft <= 14 ? "#00C9A7" : "rgba(255,255,255,0.5)", borderRadius: 6, fontWeight: 700 }}>
            {daysLeft <= 0 ? "Expire" : `${daysLeft}j`}
          </span>
        )}
      </div>

      {/* Menu mobile (deplacer) */}
      {showMenu && (
        <div style={{ position: "absolute", right: 6, top: 36, zIndex: 20, background: "#0d0d0d", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: 5, boxShadow: "0 8px 24px rgba(0,0,0,0.4)", minWidth: 150 }} onClick={(e) => e.stopPropagation()}>
          <div style={{ fontSize: 9, letterSpacing: "1px", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", fontWeight: 700, padding: "6px 10px 4px" }}>Deplacer vers</div>
          {COLUMNS.map((col) => (
            <button
              key={col.id}
              onClick={() => { setShowMenu(false); onMoveTo(col.id); }}
              style={{ width: "100%", padding: "8px 10px", background: "none", border: "none", color: col.color, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", textAlign: "left", display: "flex", alignItems: "center", gap: 7, borderRadius: 6 }}
            >
              <AppIcon name={col.icon} size={11} color={col.color} />
              {col.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

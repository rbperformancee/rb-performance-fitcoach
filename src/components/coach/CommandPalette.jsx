import React, { useState, useEffect, useMemo, useRef } from "react";
import AppIcon from "../AppIcon";
import haptic from "../../lib/haptic";
import { useT } from "../../lib/i18n";

const G = "#02d1ba";

/**
 * CommandPalette — palette de commandes globale (Cmd+K / Ctrl+K).
 * - Recherche fuzzy sur clients + actions
 * - Navigation clavier (fleches + Entree + Escape)
 * - Haptic feedback iOS
 *
 * Props:
 *   open: boolean
 *   onClose: () => void
 *   clients: Client[]
 *   commands: { id, label, desc?, icon?, group?, run: () => void, keywords?: string[] }[]
 */
export default function CommandPalette({ open, onClose, clients = [], commands = [] }) {
  const t = useT();
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // Compile client items
  const items = useMemo(() => {
    const clientItems = clients.map((c) => ({
      id: `client_${c.id}`,
      label: c.full_name || c.email || "__client_fallback__",
      desc: c.email || "",
      icon: "user",
      group: "__group_clients__",
      keywords: [c.full_name, c.email, ...(c.tags || [])].filter(Boolean),
      run: () => {
        const cmd = commands.find((x) => x.id === "open_client");
        cmd?.run?.(c);
      },
    }));
    return [...commands.filter((c) => c.id !== "open_client"), ...clientItems];
  }, [commands, clients]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items.slice(0, 30);
    return items.filter((it) => {
      const hay = [it.label, it.desc, ...(it.keywords || [])].join(" ").toLowerCase();
      return q.split(" ").every((token) => hay.includes(token));
    }).slice(0, 30);
  }, [items, query]);

  // Group by "group"
  const grouped = useMemo(() => {
    const map = new Map();
    filtered.forEach((it) => {
      const g = it.group || "__group_actions__";
      if (!map.has(g)) map.set(g, []);
      map.get(g).push(it);
    });
    return Array.from(map.entries());
  }, [filtered]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIdx(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => { setActiveIdx(0); }, [query]);

  // Scroll active item into view
  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current.querySelector(`[data-idx="${activeIdx}"]`);
    if (el) el.scrollIntoView({ block: "nearest" });
  }, [activeIdx]);

  if (!open) return null;

  const onKeyDown = (e) => {
    if (e.key === "Escape") { e.preventDefault(); onClose(); }
    else if (e.key === "ArrowDown") { e.preventDefault(); setActiveIdx((i) => Math.min(filtered.length - 1, i + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActiveIdx((i) => Math.max(0, i - 1)); }
    else if (e.key === "Enter") {
      e.preventDefault();
      const it = filtered[activeIdx];
      if (it) { haptic.selection(); it.run?.(); onClose(); }
    }
  };

  let flatIdx = -1;

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: "fixed", inset: 0, zIndex: 400,
        background: "rgba(0,0,0,0.65)", backdropFilter: "blur(10px)",
        display: "flex", alignItems: "flex-start", justifyContent: "center",
        padding: "12vh 16px 16px",
        animation: "cpFadeIn 0.15s ease both",
      }}
    >
      <style>{`
        @keyframes cpFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes cpSlide { from { transform: translateY(-8px) scale(0.98); opacity: 0; } to { transform: translateY(0) scale(1); opacity: 1; } }
      `}</style>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("cp.aria_label")}
        style={{
          width: "100%", maxWidth: 560,
          background: "#0f0f0f",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 16,
          boxShadow: "0 24px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(2,209,186,0.08)",
          overflow: "hidden",
          animation: "cpSlide 0.2s cubic-bezier(0.22,1,0.36,1) both",
        }}
      >
        {/* Search input + X button */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <AppIcon name="search" size={16} color="rgba(255,255,255,0.5)" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={t("cp.placeholder")}
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              color: "#fff",
              fontSize: 15,
              fontFamily: "inherit",
              fontWeight: 500,
            }}
          />
          <button onClick={onClose} aria-label={t("cp.aria_close")} style={{ width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, cursor: "pointer", color: "rgba(255,255,255,0.6)", flexShrink: 0, fontFamily: "inherit" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        {/* Results */}
        <div ref={listRef} style={{ maxHeight: "60vh", overflowY: "auto", padding: "6px 6px 10px" }}>
          {filtered.length === 0 ? (
            <div style={{ padding: "40px 20px", textAlign: "center", color: "rgba(255,255,255,0.4)", fontSize: 13 }}>
              {t("cp.empty_for_query").replace("{q}", query)}
            </div>
          ) : (
            grouped.map(([groupName, groupItems]) => (
              <div key={groupName} style={{ marginBottom: 6 }}>
                <div style={{ fontSize: 9, letterSpacing: "2px", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", fontWeight: 700, padding: "8px 14px 4px" }}>
                  {groupName === "__group_clients__" ? t("cp.group_clients") : groupName === "__group_actions__" ? t("cp.group_actions") : groupName}
                </div>
                {groupItems.map((it) => {
                  flatIdx++;
                  const isActive = flatIdx === activeIdx;
                  const myIdx = flatIdx;
                  return (
                    <button
                      key={it.id}
                      data-idx={myIdx}
                      onMouseEnter={() => setActiveIdx(myIdx)}
                      onClick={() => { haptic.selection(); it.run?.(); onClose(); }}
                      style={{
                        width: "100%",
                        display: "flex", alignItems: "center", gap: 12,
                        padding: "10px 12px",
                        background: isActive ? "rgba(2,209,186,0.1)" : "transparent",
                        border: "none",
                        borderRadius: 10,
                        cursor: "pointer",
                        fontFamily: "inherit",
                        color: "#fff",
                        textAlign: "left",
                        transition: "background 0.1s",
                      }}
                    >
                      <div style={{ width: 28, height: 28, borderRadius: 8, background: isActive ? "rgba(2,209,186,0.15)" : "rgba(255,255,255,0.04)", display: "flex", alignItems: "center", justifyContent: "center", color: isActive ? G : "rgba(255,255,255,0.55)", flexShrink: 0 }}>
                        <AppIcon name={it.icon || "zap"} size={14} color={isActive ? G : "rgba(255,255,255,0.55)"} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it.label === "__client_fallback__" ? t("cp.client_fallback") : it.label}</div>
                        {it.desc && <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it.desc}</div>}
                      </div>
                      {isActive && <AppIcon name="arrow-right" size={12} color={G} />}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "8px 14px", borderTop: "1px solid rgba(255,255,255,0.05)", fontSize: 10, color: "rgba(255,255,255,0.35)" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            <kbd style={kbdStyle}>↑</kbd><kbd style={kbdStyle}>↓</kbd> {t("cp.kbd_navigate")}
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            <kbd style={kbdStyle}>↵</kbd> {t("cp.kbd_open")}
          </span>
          <span style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 4 }}>
            <kbd style={kbdStyle}>⌘K</kbd>
          </span>
        </div>
      </div>
    </div>
  );
}

const kbdStyle = { fontSize: 9, color: "rgba(255,255,255,0.5)", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 4, padding: "1px 5px", fontFamily: "'JetBrains Mono',monospace" };

import React, { useState, useEffect, useRef } from "react";
import AppIcon from "./AppIcon";
import haptic from "../lib/haptic";
import { getStoredTheme, setTheme, watchSystemTheme, resolveTheme } from "../lib/theme";

const G = "#02d1ba";

const OPTIONS = [
  { id: "dark", label: "Sombre", icon: "moon" },
  { id: "light", label: "Clair", icon: "sun" },
  { id: "auto", label: "Auto", icon: "monitor" },
];

/**
 * ThemeSwitcher — bouton compact qui ouvre un mini-menu pour changer
 * le theme (sombre / clair / auto). La preference est persistee dans localStorage.
 */
export default function ThemeSwitcher() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState(() => getStoredTheme());
  const ref = useRef(null);

  useEffect(() => {
    const off = watchSystemTheme(() => {
      if (mode === "auto") setTheme("auto");
    });
    return off;
  }, [mode]);

  // Click-outside to close
  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("touchstart", onDoc);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("touchstart", onDoc);
    };
  }, [open]);

  const choose = (id) => {
    haptic.selection();
    setMode(id);
    setTheme(id);
    setOpen(false);
  };

  const current = OPTIONS.find((o) => o.id === mode) || OPTIONS[0];
  const resolved = resolveTheme(mode);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => { haptic.light(); setOpen((v) => !v); }}
        aria-label={`Theme : ${current.label}`}
        title={`Theme : ${current.label}`}
        style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 100,
          width: 36, height: 36,
          color: "rgba(255,255,255,0.7)",
          cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: "inherit",
        }}
      >
        <AppIcon name={current.icon} size={14} color="rgba(255,255,255,0.7)" />
      </button>

      {open && (
        <div
          role="menu"
          style={{
            position: "absolute",
            top: 44,
            right: 0,
            background: "#0f0f0f",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 12,
            padding: 6,
            minWidth: 160,
            boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
            zIndex: 360,
            animation: "tsFade 0.15s ease both",
          }}
        >
          <style>{`@keyframes tsFade { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }`}</style>
          {OPTIONS.map((o) => {
            const active = o.id === mode;
            return (
              <button
                key={o.id}
                role="menuitemradio"
                aria-checked={active}
                onClick={() => choose(o.id)}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  width: "100%",
                  padding: "8px 10px",
                  background: active ? "rgba(2,209,186,0.1)" : "transparent",
                  border: "none",
                  borderRadius: 8,
                  color: active ? G : "rgba(255,255,255,0.75)",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  fontSize: 12,
                  fontWeight: 600,
                  textAlign: "left",
                }}
              >
                <AppIcon name={o.icon} size={14} color={active ? G : "rgba(255,255,255,0.55)"} />
                <span style={{ flex: 1 }}>{o.label}</span>
                {o.id === "auto" && (
                  <span style={{ fontSize: 9, color: "rgba(255,255,255,0.35)" }}>
                    ({resolved === "dark" ? "sombre" : "clair"})
                  </span>
                )}
                {active && <AppIcon name="check" size={12} color={G} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

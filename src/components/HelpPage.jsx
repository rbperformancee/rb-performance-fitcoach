import React, { useState } from "react";
import AppIcon from "./AppIcon";
import { useT } from "../lib/i18n";

const G = "#02d1ba";

/**
 * HelpPage — guide utilisateur in-app avec sections expandables.
 * Affichee depuis ProfilePage via bouton "Aide".
 *
 * Couvre toutes les fonctionnalites principales pour onboarding
 * et reduction du support coach.
 */

const buildSections = (t) => [
  {
    id: "training",
    icon: "dumbbell",
    title: t("hp.section_training"),
    items: [
      { q: t("hp.training_q1"), a: t("hp.training_a1") },
      { q: t("hp.training_q2"), a: t("hp.training_a2") },
      { q: t("hp.training_q3"), a: t("hp.training_a3") },
      { q: t("hp.training_q4"), a: t("hp.training_a4") },
    ],
  },
  {
    id: "nutrition",
    icon: "apple",
    title: t("hp.section_nutrition"),
    items: [
      { q: t("hp.nutrition_q1"), a: t("hp.nutrition_a1") },
      { q: t("hp.nutrition_q2"), a: t("hp.nutrition_a2") },
      { q: t("hp.nutrition_q3"), a: t("hp.nutrition_a3") },
      { q: t("hp.nutrition_q4"), a: t("hp.nutrition_a4") },
    ],
  },
  {
    id: "weight",
    icon: "scale",
    title: t("hp.section_weight"),
    items: [
      { q: t("hp.weight_q1"), a: t("hp.weight_a1") },
      { q: t("hp.weight_q2"), a: t("hp.weight_a2") },
      { q: t("hp.weight_q3"), a: t("hp.weight_a3") },
    ],
  },
  {
    id: "coach",
    icon: "message",
    title: t("hp.section_coach"),
    items: [
      { q: t("hp.coach_q1"), a: t("hp.coach_a1") },
      { q: t("hp.coach_q2"), a: t("hp.coach_a2") },
      { q: t("hp.coach_q3"), a: t("hp.coach_a3") },
    ],
  },
  {
    id: "subscription",
    icon: "calendar",
    title: t("hp.section_subscription"),
    items: [
      { q: t("hp.sub_q1"), a: t("hp.sub_a1") },
      { q: t("hp.sub_q2"), a: t("hp.sub_a2") },
      { q: t("hp.sub_q3"), a: t("hp.sub_a3") },
    ],
  },
  {
    id: "tech",
    icon: "alert",
    title: t("hp.section_tech"),
    items: [
      { q: t("hp.tech_q1"), a: t("hp.tech_a1") },
      { q: t("hp.tech_q2"), a: t("hp.tech_a2") },
      { q: t("hp.tech_q3"), a: t("hp.tech_a3") },
      { q: t("hp.tech_q4"), a: t("hp.tech_a4") },
    ],
  },
];

function Section({ section, isOpen, onToggle }) {
  return (
    <div style={{ marginBottom: 12, background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, overflow: "hidden" }}>
      <button
        onClick={onToggle}
        aria-expanded={isOpen}
        style={{
          width: "100%", padding: "16px 18px", background: "none", border: "none",
          color: "#fff", fontFamily: "inherit", cursor: "pointer",
          display: "flex", alignItems: "center", gap: 12, textAlign: "left",
        }}
      >
        <div style={{ width: 32, height: 32, borderRadius: 10, background: `${G}15`, display: "flex", alignItems: "center", justifyContent: "center", color: G, flexShrink: 0 }}>
          <AppIcon name={section.icon} size={16} color={G} />
        </div>
        <div style={{ flex: 1, fontSize: 14, fontWeight: 700 }}>{section.title}</div>
        <div style={{ color: "rgba(255,255,255,0.3)", transition: "transform 0.2s", transform: isOpen ? "rotate(90deg)" : "rotate(0deg)" }}>
          <AppIcon name="arrow-right" size={14} color="rgba(255,255,255,0.4)" />
        </div>
      </button>
      {isOpen && (
        <div style={{ padding: "0 18px 16px", display: "flex", flexDirection: "column", gap: 14, borderTop: "1px solid rgba(255,255,255,0.04)", paddingTop: 16, animation: "helpExpand 0.2s ease both" }}>
          <style>{`@keyframes helpExpand{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}`}</style>
          {section.items.map((item, i) => (
            <div key={i}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", marginBottom: 6, lineHeight: 1.4 }}>{item.q}</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", lineHeight: 1.6 }}>{item.a}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function HelpPage({ onClose }) {
  const t = useT();
  const [openId, setOpenId] = useState("training");
  const SECTIONS = buildSections(t);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="help-title"
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "#050505", overflowY: "auto", WebkitOverflowScrolling: "touch",
        fontFamily: "-apple-system,Inter,sans-serif", color: "#fff",
      }}
    >
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, height: "30%", background: "radial-gradient(ellipse at 50% -10%, rgba(2,209,186,0.08), transparent 65%)", pointerEvents: "none", zIndex: 0 }} />

      <div style={{ position: "relative", zIndex: 1, maxWidth: 600, margin: "0 auto", padding: "calc(env(safe-area-inset-top, 12px) + 28px) 24px 80px" }}>
        {/* Header */}
        <div style={{ paddingTop: "env(safe-area-inset-top, 8px)", marginBottom: 28, animation: "helpExpand 0.3s ease both" }}>
          <button
            onClick={onClose}
            aria-label={t("hp.close_aria")}
            style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "none", border: "none", color: "rgba(255,255,255,0.35)", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", padding: 0, marginBottom: 16 }}
          >
            <AppIcon name="arrow-left" size={12} color="rgba(255,255,255,0.5)" />
            {t("hp.back")}
          </button>
          <div style={{ fontSize: 10, letterSpacing: "4px", textTransform: "uppercase", color: `${G}b3`, marginBottom: 8, fontWeight: 700 }}>
            {t("hp.eyebrow")}
          </div>
          <h1 id="help-title" style={{ fontSize: 36, fontWeight: 900, letterSpacing: "-1.5px", margin: "0 0 12px", lineHeight: 0.95 }}>
            {t("hp.title_part1")}<br /><span style={{ color: G }}>{t("hp.title_part2")}</span>
          </h1>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", lineHeight: 1.6 }}>
            {t("hp.intro")}
          </p>
        </div>

        {/* Sections */}
        <div>
          {SECTIONS.map((s) => (
            <Section
              key={s.id}
              section={s}
              isOpen={openId === s.id}
              onToggle={() => setOpenId(openId === s.id ? null : s.id)}
            />
          ))}
        </div>

        {/* Keyboard shortcuts (desktop) */}
        <div style={{ marginTop: 28, padding: 20, background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <AppIcon name="keyboard" size={16} color="rgba(255,255,255,0.7)" />
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "2.5px", textTransform: "uppercase", color: "rgba(255,255,255,0.7)" }}>
              {t("hp.shortcuts_title")}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[
              { keys: ["⌘", "K"], label: t("hp.shortcut_palette") },
              { keys: ["⌘", "/"], label: t("hp.shortcut_help") },
              { keys: ["Esc"], label: t("hp.shortcut_esc") },
              { keys: ["↑", "↓"], label: t("hp.shortcut_navigate") },
              { keys: ["↵"], label: t("hp.shortcut_validate") },
            ].map((s, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", background: "rgba(255,255,255,0.02)", borderRadius: 8 }}>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.75)" }}>{s.label}</div>
                <div style={{ display: "flex", gap: 4 }}>
                  {s.keys.map((k, ki) => (
                    <kbd key={ki} style={{ fontSize: 10, color: "rgba(255,255,255,0.85)", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 5, padding: "2px 7px", fontFamily: "'JetBrains Mono',monospace", minWidth: 18, textAlign: "center" }}>{k}</kbd>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", marginTop: 10, lineHeight: 1.5 }}>
            {t("hp.shortcuts_note_prefix")} <kbd style={{ fontSize: 9, color: "rgba(255,255,255,0.6)", background: "rgba(255,255,255,0.05)", padding: "1px 4px", borderRadius: 3 }}>Ctrl</kbd> {t("hp.shortcuts_note_middle")} <kbd style={{ fontSize: 9, color: "rgba(255,255,255,0.6)", background: "rgba(255,255,255,0.05)", padding: "1px 4px", borderRadius: 3 }}>⌘</kbd>{t("hp.shortcuts_note_suffix")}
          </div>
        </div>

        {/* Contact coach CTA */}
        <div style={{ marginTop: 28, padding: 20, background: `${G}08`, border: `1px solid ${G}25`, borderRadius: 16, textAlign: "center" }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", color: G, marginBottom: 8 }}>{t("hp.cta_eyebrow")}</div>
          <div style={{ fontSize: 14, color: "#fff", marginBottom: 14, lineHeight: 1.5 }}>
            {t("hp.cta_text")}
          </div>
          <button
            onClick={onClose}
            style={{
              padding: "12px 24px", background: G, color: "#000", border: "none",
              borderRadius: 12, fontSize: 12, fontWeight: 800, cursor: "pointer",
              fontFamily: "inherit", letterSpacing: "0.5px", textTransform: "uppercase",
            }}
          >
            {t("hp.cta_button")}
          </button>
        </div>
      </div>
    </div>
  );
}

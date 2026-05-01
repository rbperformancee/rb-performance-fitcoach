import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { useT } from "../lib/i18n";
import { isClientDemoMode } from "../lib/demoMode";

const fillTpl = (s, vars) => {
  let out = s;
  Object.entries(vars).forEach(([k, v]) => { out = out.split(`{${k}}`).join(String(v)); });
  return out;
};

const GREEN = "#02d1ba";

const BADGES = [
  { id: "first_session",   xp: 50,  color: GREEN,       labelKey: "bs.label_first_session",   descKey: "bs.desc_first_session",   sessions: 1,  icon: "bolt" },
  { id: "five_sessions",   xp: 80,  color: "#f97316",   labelKey: "bs.label_five_sessions",   descKey: "bs.desc_five_sessions",   sessions: 5,  icon: "fire" },
  { id: "ten_sessions",    xp: 120, color: "#a78bfa",   labelKey: "bs.label_ten_sessions",    descKey: "bs.desc_ten_sessions",    sessions: 10, icon: "dumbbell" },
  { id: "twenty_sessions", xp: 200, color: "#fbbf24",   labelKey: "bs.label_twenty_sessions", descKey: "bs.desc_twenty_sessions", sessions: 20, icon: "trophy" },
  { id: "fifty_sessions",  xp: 400, color: "#ef4444",   labelKey: "bs.label_fifty_sessions",  descKey: "bs.desc_fifty_sessions",  sessions: 50, icon: "crown" },
  { id: "streak_7",        xp: 100, color: "#34d399",   labelKey: "bs.label_streak_7",        descKey: "bs.desc_streak_7",        streak: 7,    icon: "calendar" },
  { id: "streak_30",       xp: 300, color: "#818cf8",   labelKey: "bs.label_streak_30",       descKey: "bs.desc_streak_30",       streak: 30,   icon: "star" },
  { id: "weight_logged",   xp: 30,  color: "#60a5fa",   labelKey: "bs.label_weight_logged",   descKey: "bs.desc_weight_logged",   weights: 1,   icon: "scale" },
  { id: "first_run",       xp: 40,  color: "#ef4444",   labelKey: "bs.label_first_run",       descKey: "bs.desc_first_run",       runs: 1,      icon: "run" },
  { id: "five_runs",       xp: 80,  color: "#f97316",   labelKey: "bs.label_five_runs",       descKey: "bs.desc_five_runs",       runs: 5,      icon: "fire" },
  { id: "hundred_km",      xp: 200, color: "#fbbf24",   labelKey: "bs.label_hundred_km",      descKey: "bs.desc_hundred_km",      km: 100,      icon: "crown" },
];

const ICON = ({ name, color, size = 20 }) => {
  const s = { width: size, height: size };
  const p = { fill: "none", stroke: color, strokeWidth: 2.5, strokeLinecap: "round", strokeLinejoin: "round" };
  if (name === "bolt")     return <svg viewBox="0 0 24 24" style={s}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" {...p}/></svg>;
  if (name === "fire")     return <svg viewBox="0 0 24 24" style={s}><path d="M12 2c0 6-6 8-6 14a6 6 0 0012 0c0-6-6-8-6-14z" {...p}/><path d="M12 12c0 3-2 4-2 6a2 2 0 004 0c0-2-2-3-2-6z" {...p}/></svg>;
  if (name === "dumbbell") return <svg viewBox="0 0 24 24" style={s}><path d="M6 4v16M18 4v16M2 12h4M18 12h4M6 8h12M6 16h12" {...p}/></svg>;
  if (name === "trophy")   return <svg viewBox="0 0 24 24" style={s}><path d="M12 15l-2 5h8l-2-5" {...p}/><path d="M8 5H5L3 9c0 2.2 1.8 4 4 4" {...p}/><path d="M16 5h3l2 4c0 2.2-1.8 4-4 4" {...p}/><path d="M8 5a4 4 0 008 0H8z" {...p}/></svg>;
  if (name === "crown")    return <svg viewBox="0 0 24 24" style={s}><path d="M2 20h20M5 20V10l7-6 7 6v10" {...p}/><path d="M9 20v-5h6v5" {...p}/></svg>;
  if (name === "calendar") return <svg viewBox="0 0 24 24" style={s}><rect x="3" y="4" width="18" height="18" rx="2" {...p}/><line x1="16" y1="2" x2="16" y2="6" {...p}/><line x1="8" y1="2" x2="8" y2="6" {...p}/><line x1="3" y1="10" x2="21" y2="10" {...p}/><path d="M9 16l2 2 4-4" {...p}/></svg>;
  if (name === "star")     return <svg viewBox="0 0 24 24" style={s}><circle cx="12" cy="8" r="6" {...p}/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11" {...p}/></svg>;
  if (name === "scale")    return <svg viewBox="0 0 24 24" style={s}><path d="M12 3v18M3 9l9-6 9 6" {...p}/><path d="M3 15h6a3 3 0 006 0h6" {...p}/></svg>;
  return null;
};

export function BadgeSystem({ clientId, sessions = 0, streak = 0, weights = 0, runs = 0, km = 0 }) {
  const t = useT();
  const [earned, setEarned] = useState([]);
  const [newBadge, setNewBadge] = useState(null);

  const checkAndSave = useCallback(async () => {
    if (!clientId) return;
    const { data: existing } = await supabase.from("client_badges").select("badge_id").eq("client_id", clientId);
    const earnedIds = new Set((existing || []).map(b => b.badge_id));

    const toEarn = BADGES.filter(b => {
      if (earnedIds.has(b.id)) return true;
      if (b.sessions && sessions >= b.sessions) return true;
      if (b.streak && streak >= b.streak) return true;
      if (b.weights && weights >= b.weights) return true;
      if (b.runs && runs >= b.runs) return true;
      if (b.km && km >= b.km) return true;
      return false;
    });

    const newlyEarned = toEarn.filter(b => !earnedIds.has(b.id));
    if (newlyEarned.length > 0) {
      // Skip l'upsert en mode demo client (RLS bloque + pas de persistance attendue)
      if (!isClientDemoMode()) {
        await supabase.from("client_badges").upsert(
          newlyEarned.map(b => ({ client_id: clientId, badge_id: b.id })),
          { onConflict: "client_id,badge_id" }
        );
      }
      setNewBadge(newlyEarned[0]);
      if (navigator.vibrate) navigator.vibrate([50, 30, 50, 30, 100]);
      setTimeout(() => setNewBadge(null), 3500);
    }
    setEarned(toEarn.map(b => b.id));
  }, [clientId, sessions, streak, weights, runs, km]);

  useEffect(() => { checkAndSave(); }, [checkAndSave]);

  const earnedCount = earned.length;
  const nextBadge = BADGES.find(b => !earned.includes(b.id));

  return (
    <div>
      {newBadge && (
        <div style={{ marginBottom: 14, padding: "14px 16px", background: `rgba(${newBadge.color === GREEN ? "2,209,186" : "249,115,22"},0.08)`, border: `1px solid ${newBadge.color}40`, borderRadius: 14, display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: `${newBadge.color}15`, border: `1px solid ${newBadge.color}40`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <ICON name={newBadge.icon} color={newBadge.color} size={18} />
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: newBadge.color }}>{t('bs.unlocked')}</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 2 }}>{t(newBadge.labelKey)} · +{newBadge.xp} XP</div>
          </div>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", fontWeight: 600, letterSpacing: "3px", textTransform: "uppercase" }}>{t('bs.eyebrow')}</div>
        <div style={{ fontSize: 11, color: "rgba(2,209,186,0.6)", fontWeight: 500 }}>{earnedCount} / {BADGES.length}</div>
      </div>

      <div style={{ display: "flex", gap: 10, overflowX: "auto", scrollbarWidth: "none", paddingBottom: 4, margin: "0 -24px", padding: "0 24px 8px" }}>
        {BADGES.map(b => {
          const has = earned.includes(b.id);
          const isNew = newBadge?.id === b.id;
          const circumference = 2 * Math.PI * 22;
          const offset = has ? 0 : circumference * 0.7;
          return (
            <div key={b.id} style={{ flexShrink: 0, width: 88, background: isNew ? `${b.color}08` : has ? "rgba(255,255,255,0.025)" : "rgba(255,255,255,0.01)", border: `1px solid ${isNew ? b.color + "40" : has ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.05)"}`, borderRadius: 20, padding: "16px 10px", textAlign: "center", position: "relative", opacity: has ? 1 : 0.35, transition: "all 0.3s" }}>
              {isNew && <div style={{ position: "absolute", top: 9, right: 9, width: 6, height: 6, borderRadius: "50%", background: b.color }} />}
              <div style={{ width: 52, height: 52, margin: "0 auto 10px", position: "relative" }}>
                <svg width="52" height="52" viewBox="0 0 52 52" style={{ position: "absolute", inset: 0 }}>
                  <circle cx="26" cy="26" r="22" fill="none" stroke={`${b.color}18`} strokeWidth="3" />
                  <circle cx="26" cy="26" r="22" fill="none" stroke={b.color} strokeWidth="3" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset} transform="rotate(-90 26 26)" style={{ transition: "stroke-dashoffset 0.8s ease" }} />
                </svg>
                <div style={{ position: "absolute", inset: 6, borderRadius: "50%", background: `${b.color}12`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <ICON name={b.icon} color={b.color} size={22} />
                </div>
              </div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#fff", lineHeight: 1.2, marginBottom: 3 }}>{t(b.labelKey)}</div>
              {has
                ? <div style={{ fontSize: 9, fontWeight: 700, color: `${b.color}99`, letterSpacing: "0.5px" }}>+{b.xp} XP</div>
                : <div style={{ fontSize: 9, color: "rgba(255,255,255,0.2)" }}>{t(b.descKey)}</div>
              }
            </div>
          );
        })}
        <div style={{ flexShrink: 0, width: 24 }} />
      </div>

      {nextBadge && (
        <div style={{ marginTop: 12, padding: "12px 14px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ fontSize: 22, fontWeight: 200, color: GREEN, letterSpacing: "-1px", flexShrink: 0 }}>
            {nextBadge.sessions ? `${sessions}/${nextBadge.sessions}` : nextBadge.streak ? `${streak}/${nextBadge.streak}j` : nextBadge.runs ? `${runs}/${nextBadge.runs}` : nextBadge.km ? `${Math.round(km)}/${nextBadge.km}km` : `${weights}/1`}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", marginBottom: 5 }}>{fillTpl(t('bs.next'), { label: t(nextBadge.labelKey) })}</div>
            <div style={{ height: 2, background: "rgba(255,255,255,0.06)", borderRadius: 1 }}>
              <div style={{ height: "100%", width: `${Math.min(Math.round((nextBadge.sessions ? sessions / nextBadge.sessions : nextBadge.streak ? streak / nextBadge.streak : weights) * 100), 100)}%`, background: nextBadge.color, borderRadius: 1 }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import React from "react";

/**
 * AppIcon — bibliotheque SVG centralisee pour remplacer les emojis.
 * Usage: <AppIcon name="flame" size={20} color="#fb923c" />
 *
 * Toutes les icones sont en stroke 1.8 pour finesse, compatible premium.
 */
export default function AppIcon({ name, size = 20, color = "currentColor", strokeWidth = 1.8, style }) {
  const p = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: color,
    strokeWidth,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    style,
    "aria-hidden": "true",
  };

  const map = {
    // ===== FEEDBACK / VALIDATION =====
    check: <svg {...p}><polyline points="20 6 9 17 4 12" /></svg>,
    "check-circle": <svg {...p}><circle cx="12" cy="12" r="10" /><polyline points="8 12 11 15 16 9" /></svg>,
    x: <svg {...p}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>,
    alert: <svg {...p}><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>,

    // ===== SPORT / TRAINING =====
    flame: <svg {...p}><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" /></svg>,
    lightning: <svg {...p}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>,
    dumbbell: <svg {...p}><rect x="5" y="10" width="2" height="4" rx="1" /><rect x="17" y="10" width="2" height="4" rx="1" /><line x1="3" y1="11" x2="3" y2="13" /><line x1="2" y1="11" x2="4" y2="11" /><line x1="2" y1="13" x2="4" y2="13" /><line x1="21" y1="11" x2="21" y2="13" /><line x1="20" y1="11" x2="22" y2="11" /><line x1="20" y1="13" x2="22" y2="13" /><line x1="7" y1="12" x2="17" y2="12" /></svg>,
    trophy: <svg {...p}><path d="M7 4V2h10v2" /><path d="M7 4h10a2 2 0 012 2v3a5 5 0 01-5 5h-4a5 5 0 01-5-5V6a2 2 0 012-2z" /><path d="M4 4v1a3 3 0 003 3" /><path d="M20 4v1a3 3 0 01-3 3" /><path d="M12 14v4" /><path d="M10 18h4a2 2 0 012 2v2H8v-2a2 2 0 012-2z" /></svg>,
    target: <svg {...p}><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></svg>,
    shoe: <svg {...p}><path d="M3 18h18a0 0 0 0 1 0 0v2H3v-2z" /><path d="M3 18c0-3 2-5 5-6 1.5-0.5 3-2 4-4 1.5-1 3-1 4 0 1 1 2 3 4 3h1v7" /><circle cx="7" cy="18" r="0.5" fill={color} /></svg>,
    run: <svg {...p}><circle cx="16" cy="4" r="1.5" /><path d="M7 18l2-5-3-2 2-4h4l1 3 3 1" /><path d="M7 13l-2 2 1 5" /><path d="M13 12l2 1v5" /></svg>,
    scale: <svg {...p}><rect x="3" y="15" width="18" height="5" rx="2" /><line x1="12" y1="15" x2="12" y2="9" /><path d="M8 9h8" /><path d="M6 9a6 6 0 0 1 12 0" /></svg>,

    // ===== COMMUNICATION =====
    message: <svg {...p}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>,
    "chat-bubble": <svg {...p}><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" /></svg>,
    bell: <svg {...p}><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>,

    // ===== DATA / STATS =====
    chart: <svg {...p}><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>,
    "trending-up": <svg {...p}><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></svg>,
    users: <svg {...p}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>,
    activity: <svg {...p}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>,
    heart: <svg {...p}><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>,

    // ===== TIME =====
    timer: <svg {...p}><circle cx="12" cy="13" r="8" /><polyline points="12 9 12 13 15 15" /><line x1="9" y1="2" x2="15" y2="2" /><line x1="12" y1="2" x2="12" y2="5" /></svg>,
    clock: <svg {...p}><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>,

    // ===== INTERACTIONS =====
    wave: <svg {...p}><path d="M9 11V8a2 2 0 1 1 4 0v6" /><path d="M13 11V5a2 2 0 1 1 4 0v7" /><path d="M17 11V7a2 2 0 1 1 4 0v7a7 7 0 0 1-7 7h-2a7 7 0 0 1-7-7v-3a2 2 0 1 1 4 0v2" /></svg>,
    edit: <svg {...p}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>,
    plus: <svg {...p}><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>,
    smile: <svg {...p}><circle cx="12" cy="12" r="10" /><path d="M8 14s1.5 2 4 2 4-2 4-2" /><line x1="9" y1="9" x2="9.01" y2="9" /><line x1="15" y1="9" x2="15.01" y2="9" /></svg>,
    sparkles: <svg {...p}><path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5z" /><path d="M19 17l1 3 3 1-3 1-1 3-1-3-3-1 3-1z" /></svg>,

    // ===== STATUS =====
    zzz: <svg {...p}><path d="M4 8h6l-6 8h6" /><path d="M14 5h6l-6 7h6" /></svg>,
  };

  return map[name] || null;
}

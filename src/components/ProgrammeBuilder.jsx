import React, { useState, useCallback, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";
import { toast } from "./Toast";

const G      = "#02d1ba";              // accent teal principal (raccord dashboard)
const G_DIM  = "rgba(2,209,186,0.08)";
const G_BDR  = "rgba(2,209,186,0.22)";
const RED    = "#ef4444";              // garder pour les erreurs uniquement
const ORANGE = "#f97316";
const DESKTOP_MIN = 1024;

let _uid = Date.now();
const uid = () => "id_" + (++_uid);

const LEVELS = ["Debutant", "Intermediaire", "Avance", "Elite"];
const RIR_OPTS = ["—", "0", "1", "2", "3", "4", "5"];
const GROUP_TYPES = ["", "Superset", "Bi-set", "Tri-set"];

const emptyEx = () => ({
  id: uid(), name: "", reps: "", tempo: "", rir: "—", rest: "",
  charge: "", group: "", groupType: "", note: "", motivNote: "",
  vidUrl: "", thumbUrl: "",
});

const emptySeance = () => ({
  id: uid(), name: "", desc: "", warmup: "", finisher: "", open: true,
  exercises: [emptyEx()],
});

const emptyWeek = () => ({
  id: uid(), open: true,
  seances: [emptySeance()],
});

// ===== Styles editeur =====
const S = {
  wrap: {
    height: "100vh",
    background: "#080808",
    fontFamily: "'DM Sans', -apple-system, sans-serif",
    color: "#fff",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  topbar: {
    background: "#0d0d0d",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 20px",
    height: 56,
    borderBottom: "1px solid rgba(255,255,255,0.06)",
    flexShrink: 0,
    gap: 10,
  },
  mainContainer: {
    flex: 1,
    display: "flex",
    minHeight: 0,
  },
  tabsBar: {
    display: "flex",
    background: "#0d0d0d",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
    flexShrink: 0,
    padding: "0 4px",
    gap: 4,
  },
  tabBtn: {
    flex: 1,
    padding: "12px 16px",
    background: "transparent",
    border: "none",
    color: "rgba(255,255,255,0.35)",
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "1.5px",
    textTransform: "uppercase",
    cursor: "pointer",
    fontFamily: "inherit",
    borderBottom: "2px solid transparent",
    transition: "all 0.2s",
    borderRadius: "100px",
  },
  tabBtnActive: {
    color: "#000",
    background: "#02d1ba",
    borderBottomColor: "transparent",
  },
  leftPane: {
    flex: "1 1 50%",
    minWidth: 0,
    overflowY: "auto",
    WebkitOverflowScrolling: "touch",
    background: "#080808",
  },
  rightPane: {
    flex: "1 1 50%",
    minWidth: 0,
    overflowY: "hidden",
    background: "#050505",
    borderLeft: "1px solid rgba(255,255,255,0.06)",
    display: "flex",
    flexDirection: "column",
  },
  previewHeader: {
    padding: "10px 20px",
    borderBottom: "1px solid rgba(255,255,255,0.05)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexShrink: 0,
  },
  previewLabel: {
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: "2.5px",
    textTransform: "uppercase",
    color: "rgba(2,209,186,0.6)",
  },
  previewIframe: {
    flex: 1,
    width: "100%",
    border: "none",
    background: "#f4f2ef",
  },
  form: {
    padding: "24px 24px 100px",
    maxWidth: 640,
    margin: "0 auto",
  },
  label: {
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: "2px",
    textTransform: "uppercase",
    color: "rgba(255,255,255,0.35)",
    marginBottom: 6,
  },
  input: {
    width: "100%",
    padding: "11px 14px",
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 12,
    color: "#fff",
    fontSize: 14,
    outline: "none",
    boxSizing: "border-box",
    fontFamily: "inherit",
    transition: "border-color 0.2s",
  },
  textarea: {
    width: "100%",
    padding: "11px 14px",
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 12,
    color: "#fff",
    fontSize: 13,
    outline: "none",
    boxSizing: "border-box",
    fontFamily: "inherit",
    resize: "vertical",
    minHeight: 60,
    transition: "border-color 0.2s",
  },
  select: {
    width: "100%",
    padding: "11px 14px",
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 12,
    color: "#fff",
    fontSize: 13,
    outline: "none",
    fontFamily: "inherit",
    cursor: "pointer",
  },
  sectionLabel: {
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: "3px",
    textTransform: "uppercase",
    color: "rgba(2,209,186,0.6)",
    marginBottom: 12,
    paddingBottom: 8,
    borderBottom: "1px solid rgba(255,255,255,0.05)",
  },
  weekHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 16px",
    background: "rgba(255,255,255,0.02)",
    cursor: "pointer",
    borderRadius: "12px 12px 0 0",
  },
  seanceHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "10px 14px",
    background: "rgba(255,255,255,0.02)",
    cursor: "pointer",
    borderRadius: "10px 10px 0 0",
  },
  exCard: {
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: 14,
    padding: "14px 16px",
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  btnRed: {
    padding: "11px 20px",
    background: "#02d1ba",
    color: "#000",
    border: "none",
    borderRadius: 100,
    fontSize: 11,
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "inherit",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    whiteSpace: "nowrap",
    minHeight: 38,
  },
  btnGhost: {
    padding: "9px 16px",
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 100,
    color: "rgba(255,255,255,0.5)",
    fontSize: 11,
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "inherit",
    whiteSpace: "nowrap",
    transition: "all 0.2s",
  },
  btnAdd: {
    width: "100%",
    padding: "11px",
    background: "none",
    border: "1.5px dashed rgba(2,209,186,0.2)",
    borderRadius: 12,
    color: "rgba(2,209,186,0.5)",
    fontSize: 10,
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "inherit",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    minHeight: 40,
    transition: "all 0.2s",
  },
  btnRemove: {
    background: "none",
    border: "none",
    color: "rgba(255,255,255,0.2)",
    fontSize: 16,
    cursor: "pointer",
    padding: "4px 8px",
    borderRadius: 6,
    lineHeight: 1,
    transition: "color 0.2s",
  },
  row2: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
    gap: 10,
  },
  row4: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(90px, 1fr))",
    gap: 8,
  },
};

// ===== Hook : isDesktop responsive =====
function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(() => typeof window !== "undefined" && window.innerWidth >= DESKTOP_MIN);
  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${DESKTOP_MIN}px)`);
    const h = (e) => setIsDesktop(e.matches);
    // Safari < 14 compat
    if (mq.addEventListener) mq.addEventListener("change", h);
    else mq.addListener(h);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener("change", h);
      else mq.removeListener(h);
    };
  }, []);
  return isDesktop;
}

export default function ProgrammeBuilder({ client, coachData, onClose, onSaved }) {
  const draftKey = "pb_draft_" + (client?.id || "new");

  // Load draft from localStorage
  const loadDraft = () => {
    try {
      const raw = localStorage.getItem(draftKey);
      if (raw) return JSON.parse(raw);
    } catch (_) {}
    return null;
  };
  const draft = useRef(loadDraft());

  const [progName, setProgName] = useState(draft.current?.progName || "");
  const [tagline, setTagline] = useState(draft.current?.tagline || "LA DISCIPLINE EST LA CLE DU SUCCES");
  const [duration, setDuration] = useState(draft.current?.duration || "");
  const [objective, setObjective] = useState(draft.current?.objective || "");
  const [level, setLevel] = useState(draft.current?.level || "Intermediaire");
  const [weeks, setWeeks] = useState(draft.current?.weeks || [emptyWeek()]);
  const [saving, setSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [savedTick, setSavedTick] = useState(0);
  useEffect(() => {
    if (!lastSavedAt) return;
    const id = setInterval(() => setSavedTick((t) => t + 1), 15000);
    return () => clearInterval(id);
  }, [lastSavedAt]);
  const [accessMode, setAccessMode] = useState(draft.current?.accessMode || "immediate");
  const [scheduledDate, setScheduledDate] = useState(draft.current?.scheduledDate || "");

  // Auto-save draft every 5 seconds when content changes
  const draftTimer = useRef(null);
  useEffect(() => {
    if (draftTimer.current) clearTimeout(draftTimer.current);
    draftTimer.current = setTimeout(() => {
      try {
        const data = { progName, tagline, duration, objective, level, weeks, accessMode, scheduledDate };
        localStorage.setItem(draftKey, JSON.stringify(data));
      } catch (_) {}
    }, 5000);
    return () => { if (draftTimer.current) clearTimeout(draftTimer.current); };
  }, [progName, tagline, duration, objective, level, weeks, accessMode, scheduledDate, draftKey]);

  const isDesktop = useIsDesktop();
  const [mobileTab, setMobileTab] = useState("edit"); // edit | preview
  const [previewHTML, setPreviewHTML] = useState("");
  const previewTimer = useRef(null);

  // ===== Helpers mutation state =====
  const updateWeek = useCallback((wid, fn) => setWeeks(ws => ws.map(w => w.id === wid ? fn(w) : w)), []);
  const updateSeance = useCallback((wid, sid, fn) => updateWeek(wid, w => ({ ...w, seances: w.seances.map(s => s.id === sid ? fn(s) : s) })), [updateWeek]);
  const updateEx = useCallback((wid, sid, eid, fn) => updateSeance(wid, sid, s => ({ ...s, exercises: s.exercises.map(e => e.id === eid ? fn(e) : e) })), [updateSeance]);

  const addWeek = () => setWeeks(ws => [...ws, emptyWeek()]);
  const rmWeek = (wid) => setWeeks(ws => ws.filter(w => w.id !== wid));
  const dupWeek = (wid) => setWeeks(ws => {
    const src = ws.find(w => w.id === wid);
    if (!src) return ws;
    const copy = JSON.parse(JSON.stringify(src));
    copy.id = uid();
    copy.seances.forEach(s => { s.id = uid(); s.exercises.forEach(e => { e.id = uid(); }); });
    return [...ws, copy];
  });
  const addSeance = (wid) => updateWeek(wid, w => ({ ...w, seances: [...w.seances, emptySeance()] }));
  const rmSeance = (wid, sid) => updateWeek(wid, w => ({ ...w, seances: w.seances.filter(s => s.id !== sid) }));
  const addEx = (wid, sid) => updateSeance(wid, sid, s => ({ ...s, exercises: [...s.exercises, emptyEx()] }));
  const rmEx = (wid, sid, eid) => updateSeance(wid, sid, s => ({ ...s, exercises: s.exercises.filter(e => e.id !== eid) }));

  // ===== Auto-thumbnail YouTube =====
  const ytId = (url) => { try { const u = new URL(url); if (u.hostname.includes("youtube.com")) { if (u.pathname.includes("/shorts/")) return u.pathname.split("/shorts/")[1].split("?")[0]; return u.searchParams.get("v"); } if (u.hostname.includes("youtu.be")) return u.pathname.slice(1).split("?")[0]; } catch {} return null; };

  // ===== GENERER HTML du programme =====
  const generateHTML = useCallback(() => {
    const clientName = client?.full_name || "Athlete";
    const pName = (progName || "PROGRAMME").toUpperCase();
    const totalSeances = weeks.reduce((a, w) => a + w.seances.length, 0);

    const exCardHTML = (ex, n) => {
      const noteHtml = ex.note ? `<div style="margin-top:6px;font-size:10px;color:#928e89;font-style:italic">${ex.note}</div>` : "";
      const motivHtml = ex.motivNote ? `<div style="margin-top:4px;font-size:10px;color:#c0392b;font-weight:600">${ex.motivNote}</div>` : "";
      const chargeHtml = ex.charge ? `<div><span style="font-size:8px;color:#928e89;text-transform:uppercase;letter-spacing:1px;display:block">Charge</span><span style="font-size:13px;font-weight:700;color:#c0392b">${ex.charge} kg</span></div>` : "";
      const vid = ex.vidUrl
        ? (ex.thumbUrl
          ? `<a href="${ex.vidUrl}" target="_blank" style="display:block;width:120px;height:68px;border-radius:6px;overflow:hidden;position:relative"><img src="${ex.thumbUrl}" style="width:100%;height:100%;object-fit:cover" onerror="this.style.display='none'"/></a>`
          : `<a href="${ex.vidUrl}" target="_blank" style="color:#c0392b;font-size:10px;font-weight:700">Voir la video</a>`)
        : "";
      return `<div style="background:#faf9f7;border-radius:10px;border:1px solid #e8e5e2;padding:14px 16px;margin-bottom:8px;display:flex;gap:14px;align-items:flex-start">
        <div style="flex:1">
          <div style="font-size:8px;font-weight:700;letter-spacing:2px;color:#928e89;text-transform:uppercase;margin-bottom:4px">Exercice ${String(n).padStart(2, "0")}</div>
          <div style="font-size:14px;font-weight:700;color:#1d1b1b;margin-bottom:8px">${ex.name || "[Exercice]"}</div>
          <div style="display:flex;gap:12px;flex-wrap:wrap">
            <div><span style="font-size:8px;color:#928e89;text-transform:uppercase;letter-spacing:1px;display:block">Rep.</span><span style="font-size:13px;font-weight:700;color:#1d1b1b">${ex.reps || "—"}</span></div>
            <div><span style="font-size:8px;color:#928e89;text-transform:uppercase;letter-spacing:1px;display:block">Tempo</span><span style="font-size:13px;font-weight:700;color:#1d1b1b">${ex.tempo || "—"}</span></div>
            <div><span style="font-size:8px;color:#928e89;text-transform:uppercase;letter-spacing:1px;display:block">RIR</span><span style="font-size:13px;font-weight:700;color:#1d1b1b">${ex.rir}</span></div>
            ${chargeHtml}
            <div><span style="font-size:8px;color:#928e89;text-transform:uppercase;letter-spacing:1px;display:block">Repos</span><span style="font-size:13px;font-weight:700;color:#1d1b1b">${ex.rest || "—"}</span></div>
          </div>
          ${noteHtml}${motivHtml}
        </div>
        ${vid ? `<div style="flex-shrink:0">${vid}</div>` : ""}
      </div>`;
    };

    let html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<input type="hidden" id="prog-name" value="${progName}">
<title>${pName}</title>
<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Inter,-apple-system,sans-serif;background:#1a1818;color:#1d1b1b}</style></head><body>`;

    // Cover page
    html += `<div style="min-height:100vh;background:#1d1b1b;color:#faf9f7;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px;text-align:center">
      <div style="font-size:8px;letter-spacing:4px;color:rgba(255,255,255,0.4);text-transform:uppercase;margin-bottom:24px">Programme Officiel · ${coachData?.brand_name || "Coaching"}</div>
      <div style="font-size:48px;font-weight:900;letter-spacing:-3px;line-height:0.95;margin-bottom:16px">${pName}</div>
      ${objective ? `<div style="font-size:13px;color:rgba(255,255,255,0.5);margin-bottom:20px">Objectif : ${objective}</div>` : ""}
      <div style="font-size:18px;font-weight:700;margin-bottom:24px">${clientName}</div>
      <div style="display:flex;gap:24px">
        <div><span style="font-size:24px;font-weight:200;color:#c0392b">${weeks.length}</span><br/><span style="font-size:9px;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:1px">Semaines</span></div>
        <div><span style="font-size:24px;font-weight:200;color:#c0392b">${totalSeances}</span><br/><span style="font-size:9px;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:1px">Seances</span></div>
        ${duration ? `<div><span style="font-size:18px;font-weight:200;color:#c0392b">${duration}</span><br/><span style="font-size:9px;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:1px">Duree</span></div>` : ""}
      </div>
      <div style="margin-top:32px;font-size:10px;letter-spacing:3px;color:rgba(255,255,255,0.3);text-transform:uppercase">${tagline}</div>
    </div>`;

    weeks.forEach((w, wi) => {
      w.seances.forEach((s, si) => {
        html += `<div style="min-height:100vh;background:#f4f2ef;padding:24px 20px">
          <div style="font-size:8px;letter-spacing:3px;color:#c0392b;text-transform:uppercase;font-weight:700;margin-bottom:4px">SEMAINE ${wi + 1} · SEANCE ${si + 1}</div>
          <div style="font-size:22px;font-weight:800;color:#1d1b1b;letter-spacing:-0.5px;margin-bottom:4px">${(s.name || "SEANCE " + (si + 1)).toUpperCase()}</div>
          ${s.desc ? `<div style="font-size:12px;color:#5a5653;margin-bottom:12px">${s.desc}</div>` : ""}
          ${s.warmup ? `<div style="background:#fff;border:1px solid #e8e5e2;border-radius:10px;padding:12px 14px;margin-bottom:12px"><div style="font-size:8px;letter-spacing:2px;color:#c0392b;text-transform:uppercase;font-weight:700;margin-bottom:6px">ECHAUFFEMENT</div><div style="font-size:12px;color:#1d1b1b;line-height:1.5;white-space:pre-wrap">${s.warmup}</div></div>` : ""}
          ${s.exercises.map((ex, ei) => exCardHTML(ex, ei + 1)).join("")}
          ${s.finisher ? `<div style="background:#fff;border:1px solid #e8e5e2;border-radius:10px;padding:12px 14px;margin-top:12px"><div style="font-size:8px;letter-spacing:2px;color:#c0392b;text-transform:uppercase;font-weight:700;margin-bottom:6px">FINISHER</div><div style="font-size:12px;color:#1d1b1b;line-height:1.5;white-space:pre-wrap">${s.finisher}</div></div>` : ""}
        </div>`;
      });
    });

    html += "</body></html>";
    return html;
  }, [client, progName, tagline, duration, objective, weeks, coachData]);

  // ===== Preview live : debounce 400ms pour pas regenerer a chaque touche =====
  useEffect(() => {
    if (previewTimer.current) clearTimeout(previewTimer.current);
    previewTimer.current = setTimeout(() => setPreviewHTML(generateHTML()), 400);
    return () => { if (previewTimer.current) clearTimeout(previewTimer.current); };
  }, [generateHTML]);

  // ===== SAUVEGARDER =====
  const handleSave = async () => {
    if (!progName.trim()) { toast.error("Donne un nom au programme"); return; }
    if (weeks.length === 0) { toast.error("Ajoute au moins une semaine"); return; }
    setSaving(true);
    try {
      const html = generateHTML();
      await supabase.from("programmes").update({ is_active: false }).eq("client_id", client.id);
      const insertData = {
        client_id: client.id,
        html_content: html,
        programme_name: progName.trim(),
        is_active: true,
        uploaded_by: coachData?.email || "coach",
      };
      if (accessMode === "scheduled" && scheduledDate) {
        insertData.programme_start_date = scheduledDate;
      }
      const { error } = await supabase.from("programmes").insert(insertData);
      if (error) throw error;

      // Push notification au client
      try {
        await fetch(`${process.env.REACT_APP_SUPABASE_URL}/functions/v1/send-push`, {
          method: "POST",
          headers: { "Content-Type": "application/json", apikey: process.env.REACT_APP_SUPABASE_ANON_KEY },
          body: JSON.stringify({ client_id: client.id, title: "RB PERFORM", body: "Ton programme est pret. C'est parti !" }),
        });
      } catch {}

      // Email "programme pret" au client
      try {
        await fetch(`${process.env.REACT_APP_SUPABASE_URL}/functions/v1/send-welcome`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.REACT_APP_SUPABASE_ANON_KEY}` },
          body: JSON.stringify({ email: client.email, full_name: client.full_name, type: "programme_ready", programme_name: progName.trim() }),
        });
      } catch {}

      toast.success("Programme enregistre pour " + (client.full_name || client.email));
      setLastSavedAt(Date.now());
      try { localStorage.removeItem(draftKey); } catch (_) {}
      if (onSaved) onSaved();
      if (onClose) onClose();
    } catch (e) {
      toast.error("Erreur : " + e.message);
    }
    setSaving(false);
  };

  // ===== RENDER form =====
  const renderForm = () => (
    <div style={S.form}>
      {/* ===== INFOS PROGRAMME ===== */}
      <div style={{ marginBottom: 24 }}>
        <div style={S.sectionLabel}>Programme</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div><div style={S.label}>Nom du programme</div><input style={S.input} value={progName} onChange={e => setProgName(e.target.value)} placeholder="PUSH PULL LEGS" /></div>
          <div style={S.row2}>
            <div><div style={S.label}>Objectif</div><input style={S.input} value={objective} onChange={e => setObjective(e.target.value)} placeholder="Prise de masse, seche..." /></div>
            <div><div style={S.label}>Duree</div><input style={S.input} value={duration} onChange={e => setDuration(e.target.value)} placeholder="6 semaines" /></div>
          </div>
          <div style={S.row2}>
            <div><div style={S.label}>Niveau</div><select style={S.select} value={level} onChange={e => setLevel(e.target.value)}>{LEVELS.map(l => <option key={l} value={l}>{l}</option>)}</select></div>
            <div><div style={S.label}>Tagline</div><input style={S.input} value={tagline} onChange={e => setTagline(e.target.value)} /></div>
          </div>
        </div>
      </div>

      {/* Client (auto) */}
      <div style={{ marginBottom: 24, padding: "12px 14px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10 }}>
        <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", letterSpacing: "2px", textTransform: "uppercase", marginBottom: 6, fontWeight: 700 }}>Client</div>
        <div style={{ fontSize: 14, fontWeight: 700 }}>{client?.full_name || client?.email || "—"}</div>
      </div>

      {/* Acces programme */}
      <div style={{ marginBottom: 24 }}>
        <div style={S.sectionLabel}>Acces au programme</div>
        <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
          {[{ id: "immediate", label: "Acces immediat" }, { id: "scheduled", label: "Date programmee" }].map(m => (
            <button key={m.id} onClick={() => setAccessMode(m.id)} style={{ ...S.btnGhost, background: accessMode === m.id ? G_DIM : "rgba(255,255,255,0.03)", borderColor: accessMode === m.id ? G_BDR : "rgba(255,255,255,0.08)", color: accessMode === m.id ? G : "rgba(255,255,255,0.5)" }}>{m.label}</button>
          ))}
        </div>
        {accessMode === "scheduled" && (
          <div><div style={S.label}>Date d'acces</div><input type="datetime-local" style={S.input} value={scheduledDate} onChange={e => setScheduledDate(e.target.value)} /></div>
        )}
      </div>

      {/* ===== SEMAINES ===== */}
      <div style={S.sectionLabel}>Semaines</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {weeks.map((w, wi) => (
          <div key={w.id} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, overflow: "hidden" }}>
            <div style={S.weekHeader} onClick={() => updateWeek(w.id, wk => ({ ...wk, open: !wk.open }))}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ background: "rgba(2,209,186,0.12)", color: "#02d1ba", border: "1px solid rgba(2,209,186,0.25)", fontSize: 8, fontWeight: 700, letterSpacing: "1.5px", padding: "3px 8px", borderRadius: 5, textTransform: "uppercase" }}>S{wi + 1}</span>
                <span style={{ fontSize: 12, fontWeight: 600 }}>Semaine {wi + 1}</span>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <button onClick={(e) => { e.stopPropagation(); dupWeek(w.id); }} style={S.btnRemove} title="Dupliquer">⧉</button>
                <button onClick={(e) => { e.stopPropagation(); rmWeek(w.id); }} style={S.btnRemove} title="Supprimer">×</button>
                <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 12 }}>{w.open ? "▾" : "▸"}</span>
              </div>
            </div>

            {w.open && (
              <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
                {w.seances.map((s, si) => (
                  <div key={s.id} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 8, overflow: "hidden" }}>
                    <div style={S.seanceHeader} onClick={() => updateSeance(w.id, s.id, sn => ({ ...sn, open: !sn.open }))}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0, flex: 1 }}>
                        <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: "2px", color: G, textTransform: "uppercase", flexShrink: 0 }}>Seance {si + 1}</span>
                        <span style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.6)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name ? "— " + s.name.toUpperCase() : ""}</span>
                      </div>
                      <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
                        <button onClick={(e) => { e.stopPropagation(); rmSeance(w.id, s.id); }} style={S.btnRemove}>×</button>
                        <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 10 }}>{s.open ? "▾" : "▸"}</span>
                      </div>
                    </div>

                    {s.open && (
                      <div style={{ padding: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                        <div style={S.row2}>
                          <div><div style={S.label}>Nom</div><input style={S.input} value={s.name} onChange={e => updateSeance(w.id, s.id, sn => ({ ...sn, name: e.target.value }))} placeholder="PUSH / JAMBES / etc." /></div>
                          <div><div style={S.label}>Description</div><input style={S.input} value={s.desc} onChange={e => updateSeance(w.id, s.id, sn => ({ ...sn, desc: e.target.value }))} placeholder="Description..." /></div>
                        </div>
                        <div><div style={S.label}>Echauffement</div><textarea style={S.textarea} value={s.warmup} onChange={e => updateSeance(w.id, s.id, sn => ({ ...sn, warmup: e.target.value }))} placeholder="5 min rameur, mobilite epaules..." rows={2} /></div>

                        {s.exercises.map((ex, ei) => (
                          <div key={ex.id} style={S.exCard}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <span style={{ background: "#1d1b1b", color: "#fff", fontSize: 8, fontWeight: 700, padding: "2px 8px", borderRadius: 4, letterSpacing: "1px" }}>EX {ei + 1}</span>
                              <button onClick={() => rmEx(w.id, s.id, ex.id)} style={S.btnRemove}>×</button>
                            </div>
                            <div><div style={S.label}>Exercice</div><input style={S.input} value={ex.name} onChange={e => updateEx(w.id, s.id, ex.id, x => ({ ...x, name: e.target.value }))} placeholder="Developpe couche halteres" /></div>
                            <div style={S.row4}>
                              <div><div style={S.label}>Rep.</div><input style={S.input} value={ex.reps} onChange={e => updateEx(w.id, s.id, ex.id, x => ({ ...x, reps: e.target.value }))} placeholder="4x8" /></div>
                              <div><div style={S.label}>Tempo</div><input style={S.input} value={ex.tempo} onChange={e => updateEx(w.id, s.id, ex.id, x => ({ ...x, tempo: e.target.value }))} placeholder="30X0" /></div>
                              <div><div style={S.label}>RIR</div><select style={S.select} value={ex.rir} onChange={e => updateEx(w.id, s.id, ex.id, x => ({ ...x, rir: e.target.value }))}>{RIR_OPTS.map(o => <option key={o} value={o}>{o}</option>)}</select></div>
                              <div><div style={S.label}>Repos</div><input style={S.input} value={ex.rest} onChange={e => updateEx(w.id, s.id, ex.id, x => ({ ...x, rest: e.target.value }))} placeholder="2 min" /></div>
                            </div>
                            <div style={S.row2}>
                              <div><div style={S.label}>Charge (kg)</div><input style={S.input} value={ex.charge} onChange={e => updateEx(w.id, s.id, ex.id, x => ({ ...x, charge: e.target.value }))} placeholder="80" /></div>
                              <div><div style={S.label}>Groupe</div><input style={{ ...S.input, textTransform: "uppercase" }} value={ex.group} onChange={e => updateEx(w.id, s.id, ex.id, x => ({ ...x, group: e.target.value }))} placeholder="A" maxLength={3} /></div>
                              <div><div style={S.label}>Type</div><select style={S.select} value={ex.groupType} onChange={e => updateEx(w.id, s.id, ex.id, x => ({ ...x, groupType: e.target.value }))}>{GROUP_TYPES.map(t => <option key={t} value={t}>{t || "Isole"}</option>)}</select></div>
                            </div>
                            <div><div style={S.label}>Lien video YouTube</div><input style={S.input} value={ex.vidUrl} onChange={e => { const url = e.target.value; updateEx(w.id, s.id, ex.id, x => { const id = ytId(url); return { ...x, vidUrl: url, thumbUrl: id && !x.thumbUrl ? "https://img.youtube.com/vi/" + id + "/hqdefault.jpg" : x.thumbUrl }; }); }} placeholder="https://youtube.com/..." /></div>
                            <div><div style={S.label}>Note technique</div><input style={S.input} value={ex.note} onChange={e => updateEx(w.id, s.id, ex.id, x => ({ ...x, note: e.target.value }))} placeholder="Coudes a 45 degres..." /></div>
                            <div><div style={S.label}>Note motivation</div><input style={{ ...S.input, borderColor: "rgba(192,57,43,0.2)" }} value={ex.motivNote} onChange={e => updateEx(w.id, s.id, ex.id, x => ({ ...x, motivNote: e.target.value }))} placeholder="Tu peux faire mieux que la semaine derniere" /></div>
                          </div>
                        ))}
                        <button style={S.btnAdd} onClick={() => addEx(w.id, s.id)}>+ Exercice</button>
                        <div><div style={S.label}>Finisher (optionnel)</div><textarea style={S.textarea} value={s.finisher} onChange={e => updateSeance(w.id, s.id, sn => ({ ...sn, finisher: e.target.value }))} placeholder="AMRAP 5 min : 10 burpees, 15 KB swings..." rows={2} /></div>
                      </div>
                    )}
                  </div>
                ))}
                <button style={S.btnAdd} onClick={() => addSeance(w.id)}>+ Seance</button>
              </div>
            )}
          </div>
        ))}
        <button style={{ ...S.btnGhost, width: "100%", padding: 12, marginTop: 8, minHeight: 44 }} onClick={addWeek}>+ Ajouter une semaine</button>
      </div>
    </div>
  );

  // ===== RENDER preview =====
  const renderPreview = () => (
    <div style={S.rightPane}>
      <div style={S.previewHeader}>
        <div style={S.previewLabel}>Preview en direct</div>
        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)" }}>
          {weeks.length} sem · {weeks.reduce((a, w) => a + w.seances.length, 0)} seances
        </div>
      </div>
      {previewHTML ? (
        <iframe
          title="Preview du programme"
          srcDoc={previewHTML}
          style={S.previewIframe}
          sandbox="allow-same-origin"
        />
      ) : (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.3)", fontSize: 12 }}>
          Generation de la preview...
        </div>
      )}
    </div>
  );

  // ===== RENDER main =====
  const totalSeances = weeks.reduce((a, w) => a + w.seances.length, 0);

  return (
    <div style={S.wrap}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800;900&family=DM+Sans:wght@300;400;500;600;700&display=swap');
        input:focus, textarea:focus, select:focus {
          border-color: rgba(2,209,186,0.5) !important;
          box-shadow: 0 0 0 3px rgba(2,209,186,0.08) !important;
        }
        button:hover { opacity: 0.85; }
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
      `}</style>
      {/* Topbar */}
      <div style={S.topbar}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <button onClick={onClose} style={{ ...S.btnGhost, padding: "6px 12px" }}>← Retour</button>
          <div style={{
            fontFamily: "'Syne', sans-serif",
            fontSize: 15,
            fontWeight: 900,
            letterSpacing: ".1em",
            color: "#fff",
            whiteSpace: "nowrap",
          }}>
            RB<span style={{ color: "#02d1ba" }}>BUILDER</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {isDesktop && (
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", whiteSpace: "nowrap" }}>
              {weeks.length} sem · {totalSeances} seances
            </span>
          )}
          {/* Indicateur de sauvegarde */}
          {(saving || lastSavedAt) && (
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              fontSize: 10, fontWeight: 600,
              letterSpacing: ".04em",
              color: saving ? "rgba(255,255,255,.5)" : "rgba(2,209,186,.75)",
              whiteSpace: "nowrap",
              padding: "4px 10px",
              background: saving ? "rgba(255,255,255,.04)" : "rgba(2,209,186,.06)",
              border: `1px solid ${saving ? "rgba(255,255,255,.08)" : "rgba(2,209,186,.18)"}`,
              borderRadius: 100,
            }} aria-live="polite">
              <span style={{
                width: 6, height: 6, borderRadius: "50%",
                background: saving ? "#f97316" : "#02d1ba",
                boxShadow: saving ? "0 0 6px #f97316" : "0 0 6px rgba(2,209,186,.6)",
                animation: saving ? "pulse 1.2s ease-in-out infinite" : "none",
              }} />
              {savedTick >= 0 && (saving
                ? "En cours..."
                : (() => {
                    const s = Math.floor((Date.now() - (lastSavedAt || 0)) / 1000);
                    if (s < 10) return "Sauvegarde";
                    if (s < 60) return `Sauvegarde il y a ${s}s`;
                    const m = Math.floor(s / 60);
                    return `Sauvegarde il y a ${m} min`;
                  })()
              )}
            </span>
          )}
          <button onClick={handleSave} disabled={saving} style={{ ...S.btnRed, opacity: saving ? 0.6 : 1 }}>
            {saving ? "..." : (isDesktop ? "Enregistrer le programme" : "Enregistrer")}
          </button>
        </div>
      </div>

      {/* Mobile : tabs Edit / Preview */}
      {!isDesktop && (
        <div style={S.tabsBar} role="tablist">
          <button
            role="tab"
            aria-selected={mobileTab === "edit"}
            onClick={() => setMobileTab("edit")}
            style={{ ...S.tabBtn, ...(mobileTab === "edit" ? S.tabBtnActive : {}) }}
          >
            Edition
          </button>
          <button
            role="tab"
            aria-selected={mobileTab === "preview"}
            onClick={() => setMobileTab("preview")}
            style={{ ...S.tabBtn, ...(mobileTab === "preview" ? S.tabBtnActive : {}) }}
          >
            Preview
          </button>
        </div>
      )}

      {/* Split content */}
      <div style={S.mainContainer}>
        {isDesktop ? (
          <>
            <div style={S.leftPane}>{renderForm()}</div>
            {renderPreview()}
          </>
        ) : mobileTab === "edit" ? (
          <div style={{ ...S.leftPane, flex: 1 }}>{renderForm()}</div>
        ) : (
          <div style={{ ...S.rightPane, flex: 1, borderLeft: "none" }}>
            <div style={S.previewHeader}>
              <div style={S.previewLabel}>Preview en direct</div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)" }}>
                {weeks.length} sem · {totalSeances} seances
              </div>
            </div>
            {previewHTML ? (
              <iframe
                title="Preview du programme"
                srcDoc={previewHTML}
                style={S.previewIframe}
                sandbox="allow-same-origin"
              />
            ) : (
              <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.3)", fontSize: 12 }}>
                Generation de la preview...
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

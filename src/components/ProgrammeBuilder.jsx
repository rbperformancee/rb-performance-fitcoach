import React, { useState, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { LOGO_B64 } from "../utils/logo";

const RED = "#c0392b";

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

// ===== Styles editeur (dark pro, meme feeling que le HTML original) =====
const S = {
  wrap: { minHeight: "100vh", background: "#1d1b1b", fontFamily: "-apple-system,Inter,sans-serif", color: "#faf9f7" },
  topbar: { background: "#1d1b1b", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px", height: 56, borderBottom: "1px solid rgba(255,255,255,0.06)", position: "sticky", top: 0, zIndex: 50 },
  sidebar: { padding: "16px 16px 80px", maxWidth: 600, margin: "0 auto" },
  label: { fontSize: 9, fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", color: "rgba(255,255,255,0.4)", marginBottom: 6 },
  input: { width: "100%", padding: "10px 12px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#faf9f7", fontSize: 14, outline: "none", boxSizing: "border-box", fontFamily: "inherit" },
  textarea: { width: "100%", padding: "10px 12px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#faf9f7", fontSize: 13, outline: "none", boxSizing: "border-box", fontFamily: "inherit", resize: "vertical", minHeight: 60 },
  select: { width: "100%", padding: "10px 12px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#faf9f7", fontSize: 13, outline: "none", fontFamily: "inherit", cursor: "pointer" },
  sectionLabel: { fontSize: 9, fontWeight: 700, letterSpacing: "3px", textTransform: "uppercase", color: RED, marginBottom: 10, paddingBottom: 8, borderBottom: "1px solid rgba(255,255,255,0.06)" },
  weekHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: "#1d1b1b", cursor: "pointer", borderRadius: "10px 10px 0 0" },
  seanceHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", background: "rgba(255,255,255,0.03)", cursor: "pointer", borderRadius: "8px 8px 0 0" },
  exCard: { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8 },
  btnRed: { padding: "10px 20px", background: RED, color: "#fff", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", textTransform: "uppercase", letterSpacing: "0.5px" },
  btnGhost: { padding: "8px 14px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "rgba(255,255,255,0.6)", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" },
  btnAdd: { width: "100%", padding: "8px", background: "none", border: "1.5px dashed rgba(255,255,255,0.1)", borderRadius: 8, color: "rgba(255,255,255,0.4)", fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", textTransform: "uppercase", letterSpacing: "0.5px" },
  btnRemove: { background: "none", border: "none", color: "rgba(255,255,255,0.3)", fontSize: 18, cursor: "pointer", padding: "2px 6px", borderRadius: 4 },
  row2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 },
  row4: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8 },
};

export default function ProgrammeBuilder({ client, coachData, onClose, onSaved }) {
  const [progName, setProgName] = useState("");
  const [tagline, setTagline] = useState("LA DISCIPLINE EST LA CLE DU SUCCES");
  const [duration, setDuration] = useState("");
  const [objective, setObjective] = useState("");
  const [level, setLevel] = useState("Intermediaire");
  const [weeks, setWeeks] = useState([emptyWeek()]);
  const [saving, setSaving] = useState(false);
  const [accessMode, setAccessMode] = useState("immediate"); // immediate | scheduled
  const [scheduledDate, setScheduledDate] = useState("");

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

  // ===== GENERER HTML du programme (meme format que l'original) =====
  const generateHTML = useCallback(() => {
    const clientName = client?.full_name || "Athlete";
    const pName = (progName || "PROGRAMME").toUpperCase();
    const totalSeances = weeks.reduce((a, w) => a + w.seances.length, 0);

    // Exercise card HTML
    const exCardHTML = (ex, n) => {
      const chargeHtml = ex.charge ? `<div class="stat-it"><span class="stat-lbl">Charge</span><span class="stat-val">${ex.charge} kg</span></div><div class="stat-sep"></div>` : "";
      const noteHtml = ex.note ? `<div style="margin-top:6px;font-size:10px;color:#928e89;font-style:italic">${ex.note}</div>` : "";
      const motivHtml = ex.motivNote ? `<div style="margin-top:4px;font-size:10px;color:#c0392b;font-weight:600">${ex.motivNote}</div>` : "";
      let vid = ex.vidUrl
        ? (ex.thumbUrl
          ? `<a href="${ex.vidUrl}" target="_blank" style="display:block;width:120px;height:68px;border-radius:6px;overflow:hidden;position:relative"><img src="${ex.thumbUrl}" style="width:100%;height:100%;object-fit:cover" onerror="this.style.display='none'"/></a>`
          : `<a href="${ex.vidUrl}" target="_blank" style="color:${RED};font-size:10px;font-weight:700">Voir la video</a>`)
        : "";
      return `<div style="background:#faf9f7;border-radius:10px;border:1px solid #e8e5e2;padding:14px 16px;margin-bottom:8px;display:flex;gap:14px;align-items:flex-start">
        <div style="flex:1">
          <div style="font-size:8px;font-weight:700;letter-spacing:2px;color:#928e89;text-transform:uppercase;margin-bottom:4px">Exercice ${String(n).padStart(2, "0")}</div>
          <div style="font-size:14px;font-weight:700;color:#1d1b1b;margin-bottom:8px">${ex.name || "[Exercice]"}</div>
          <div style="display:flex;gap:12px;flex-wrap:wrap">
            <div><span style="font-size:8px;color:#928e89;text-transform:uppercase;letter-spacing:1px;display:block">Rep.</span><span style="font-size:13px;font-weight:700;color:#1d1b1b">${ex.reps || "—"}</span></div>
            <div><span style="font-size:8px;color:#928e89;text-transform:uppercase;letter-spacing:1px;display:block">Tempo</span><span style="font-size:13px;font-weight:700;color:#1d1b1b">${ex.tempo || "—"}</span></div>
            <div><span style="font-size:8px;color:#928e89;text-transform:uppercase;letter-spacing:1px;display:block">RIR</span><span style="font-size:13px;font-weight:700;color:#1d1b1b">${ex.rir}</span></div>
            ${chargeHtml ? `<div><span style="font-size:8px;color:#928e89;text-transform:uppercase;letter-spacing:1px;display:block">Charge</span><span style="font-size:13px;font-weight:700;color:${RED}">${ex.charge} kg</span></div>` : ""}
            <div><span style="font-size:8px;color:#928e89;text-transform:uppercase;letter-spacing:1px;display:block">Repos</span><span style="font-size:13px;font-weight:700;color:#1d1b1b">${ex.rest || "—"}</span></div>
          </div>
          ${noteHtml}${motivHtml}
        </div>
        ${vid ? `<div style="flex-shrink:0">${vid}</div>` : ""}
      </div>`;
    };

    // Build seance pages
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
        <div><span style="font-size:24px;font-weight:200;color:${RED}">${weeks.length}</span><br/><span style="font-size:9px;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:1px">Semaines</span></div>
        <div><span style="font-size:24px;font-weight:200;color:${RED}">${totalSeances}</span><br/><span style="font-size:9px;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:1px">Seances</span></div>
        ${duration ? `<div><span style="font-size:18px;font-weight:200;color:${RED}">${duration}</span><br/><span style="font-size:9px;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:1px">Duree</span></div>` : ""}
      </div>
      <div style="margin-top:32px;font-size:10px;letter-spacing:3px;color:rgba(255,255,255,0.3);text-transform:uppercase">${tagline}</div>
    </div>`;

    // Seance pages
    weeks.forEach((w, wi) => {
      w.seances.forEach((s, si) => {
        html += `<div style="min-height:100vh;background:#f4f2ef;padding:24px 20px">
          <div style="font-size:8px;letter-spacing:3px;color:${RED};text-transform:uppercase;font-weight:700;margin-bottom:4px">SEMAINE ${wi + 1} · SEANCE ${si + 1}</div>
          <div style="font-size:22px;font-weight:800;color:#1d1b1b;letter-spacing:-0.5px;margin-bottom:4px">${(s.name || "SEANCE " + (si + 1)).toUpperCase()}</div>
          ${s.desc ? `<div style="font-size:12px;color:#5a5653;margin-bottom:12px">${s.desc}</div>` : ""}
          ${s.warmup ? `<div style="background:#fff;border:1px solid #e8e5e2;border-radius:10px;padding:12px 14px;margin-bottom:12px"><div style="font-size:8px;letter-spacing:2px;color:${RED};text-transform:uppercase;font-weight:700;margin-bottom:6px">ECHAUFFEMENT</div><div style="font-size:12px;color:#1d1b1b;line-height:1.5;white-space:pre-wrap">${s.warmup}</div></div>` : ""}
          ${s.exercises.map((ex, ei) => exCardHTML(ex, ei + 1)).join("")}
          ${s.finisher ? `<div style="background:#fff;border:1px solid #e8e5e2;border-radius:10px;padding:12px 14px;margin-top:12px"><div style="font-size:8px;letter-spacing:2px;color:${RED};text-transform:uppercase;font-weight:700;margin-bottom:6px">FINISHER</div><div style="font-size:12px;color:#1d1b1b;line-height:1.5;white-space:pre-wrap">${s.finisher}</div></div>` : ""}
        </div>`;
      });
    });

    html += "</body></html>";
    return html;
  }, [client, progName, tagline, duration, objective, weeks]);

  // ===== SAUVEGARDER =====
  const handleSave = async () => {
    if (!progName.trim()) { alert("Donne un nom au programme"); return; }
    if (weeks.length === 0) { alert("Ajoute au moins une semaine"); return; }
    setSaving(true);
    try {
      const html = generateHTML();
      // Desactiver les anciens programmes
      await supabase.from("programmes").update({ is_active: false }).eq("client_id", client.id);
      // Inserer le nouveau
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
          headers: { "Content-Type": "application/json", apikey: "sb_publishable_WbG1gs6l7XP6aHH_UqR0Hw_XLSI50ud" },
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

      alert("Programme enregistre pour " + (client.full_name || client.email));
      if (onSaved) onSaved();
      if (onClose) onClose();
    } catch (e) {
      alert("Erreur : " + e.message);
    }
    setSaving(false);
  };

  // ===== RENDER =====
  return (
    <div style={S.wrap}>
      {/* Topbar */}
      <div style={S.topbar}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={onClose} style={{ ...S.btnGhost, padding: "6px 12px" }}>← Retour</button>
          <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: "1px", color: "rgba(255,255,255,0.7)" }}>RB <span style={{ color: RED }}>Builder</span></span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", alignSelf: "center" }}>
            {weeks.length} sem · {weeks.reduce((a, w) => a + w.seances.length, 0)} seances
          </span>
          <button onClick={handleSave} disabled={saving} style={S.btnRed}>
            {saving ? "Enregistrement..." : "Enregistrer le programme"}
          </button>
        </div>
      </div>

      <div style={S.sidebar}>
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
          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            {[{ id: "immediate", label: "Acces immediat" }, { id: "scheduled", label: "Date programmee" }].map(m => (
              <button key={m.id} onClick={() => setAccessMode(m.id)} style={{ ...S.btnGhost, background: accessMode === m.id ? "rgba(192,57,43,0.12)" : undefined, borderColor: accessMode === m.id ? RED : undefined, color: accessMode === m.id ? RED : undefined }}>{m.label}</button>
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
              {/* Week header */}
              <div style={S.weekHeader} onClick={() => updateWeek(w.id, wk => ({ ...wk, open: !wk.open }))}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ background: RED, color: "#fff", fontSize: 8, fontWeight: 700, letterSpacing: "1.5px", padding: "3px 8px", borderRadius: 5, textTransform: "uppercase" }}>S{wi + 1}</span>
                  <span style={{ fontSize: 12, fontWeight: 600 }}>Semaine {wi + 1}</span>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <button onClick={(e) => { e.stopPropagation(); dupWeek(w.id); }} style={S.btnRemove} title="Dupliquer">⧉</button>
                  <button onClick={(e) => { e.stopPropagation(); rmWeek(w.id); }} style={S.btnRemove}>×</button>
                  <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 12 }}>{w.open ? "▾" : "▸"}</span>
                </div>
              </div>

              {/* Week body */}
              {w.open && (
                <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
                  {w.seances.map((s, si) => (
                    <div key={s.id} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 8, overflow: "hidden" }}>
                      {/* Seance header */}
                      <div style={S.seanceHeader} onClick={() => updateSeance(w.id, s.id, sn => ({ ...sn, open: !sn.open }))}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: "2px", color: RED, textTransform: "uppercase" }}>Seance {si + 1}</span>
                          <span style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.6)" }}>{s.name ? "— " + s.name.toUpperCase() : ""}</span>
                        </div>
                        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                          <button onClick={(e) => { e.stopPropagation(); rmSeance(w.id, s.id); }} style={S.btnRemove}>×</button>
                          <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 10 }}>{s.open ? "▾" : "▸"}</span>
                        </div>
                      </div>

                      {/* Seance body */}
                      {s.open && (
                        <div style={{ padding: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                          <div style={S.row2}>
                            <div><div style={S.label}>Nom</div><input style={S.input} value={s.name} onChange={e => updateSeance(w.id, s.id, sn => ({ ...sn, name: e.target.value }))} placeholder="PUSH / JAMBES / etc." /></div>
                            <div><div style={S.label}>Description</div><input style={S.input} value={s.desc} onChange={e => updateSeance(w.id, s.id, sn => ({ ...sn, desc: e.target.value }))} placeholder="Description..." /></div>
                          </div>
                          <div><div style={S.label}>Echauffement</div><textarea style={S.textarea} value={s.warmup} onChange={e => updateSeance(w.id, s.id, sn => ({ ...sn, warmup: e.target.value }))} placeholder="5 min rameur, mobilite epaules..." rows={2} /></div>

                          {/* Exercises */}
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
                                <div style={S.row2}>
                                  <div><div style={S.label}>Groupe</div><input style={{ ...S.input, textTransform: "uppercase" }} value={ex.group} onChange={e => updateEx(w.id, s.id, ex.id, x => ({ ...x, group: e.target.value }))} placeholder="A" maxLength={3} /></div>
                                  <div><div style={S.label}>Type</div><select style={S.select} value={ex.groupType} onChange={e => updateEx(w.id, s.id, ex.id, x => ({ ...x, groupType: e.target.value }))}>{GROUP_TYPES.map(t => <option key={t} value={t}>{t || "Isole"}</option>)}</select></div>
                                </div>
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
          <button style={{ ...S.btnGhost, width: "100%", padding: 12, marginTop: 8 }} onClick={addWeek}>+ Ajouter une semaine</button>
        </div>
      </div>
    </div>
  );
}

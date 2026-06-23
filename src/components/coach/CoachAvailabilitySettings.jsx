import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { toast } from "../Toast";

const G = "#02d1ba";

const DAYS = [
  { v: 1, l: "Lundi" },
  { v: 2, l: "Mardi" },
  { v: 3, l: "Mercredi" },
  { v: 4, l: "Jeudi" },
  { v: 5, l: "Vendredi" },
  { v: 6, l: "Samedi" },
  { v: 0, l: "Dimanche" },
];

const dayLabel = (v) => DAYS.find((d) => d.v === v)?.l || "?";

const input = {
  width: "100%",
  padding: "10px 12px",
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 10,
  color: "#fff",
  fontSize: 13,
  fontFamily: "inherit",
  outline: "none",
};

const btnPrimary = {
  padding: "10px 18px",
  background: G,
  border: 0,
  borderRadius: 10,
  color: "#000",
  fontWeight: 800,
  fontSize: 12,
  letterSpacing: "0.5px",
  textTransform: "uppercase",
  cursor: "pointer",
  fontFamily: "inherit",
};

const btnGhost = {
  padding: "6px 10px",
  background: "rgba(239,68,68,0.06)",
  border: "1px solid rgba(239,68,68,0.2)",
  borderRadius: 8,
  color: "#ff8888",
  fontSize: 11,
  fontWeight: 700,
  fontFamily: "inherit",
  cursor: "pointer",
};

const itemCard = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "12px 14px",
  background: "rgba(255,255,255,0.025)",
  border: "1px solid rgba(255,255,255,0.07)",
  borderRadius: 10,
  marginBottom: 8,
  fontSize: 13,
  color: "rgba(255,255,255,0.85)",
};

const sectionSubtitle = {
  fontSize: 11,
  color: "rgba(255,255,255,0.45)",
  letterSpacing: "1.5px",
  textTransform: "uppercase",
  fontWeight: 700,
  marginBottom: 12,
};

function fmtDate(iso) {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

export default function CoachAvailabilitySettings({ isDemo }) {
  const [periods, setPeriods] = useState([]);
  const [recurring, setRecurring] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form plages
  const [pStart, setPStart] = useState("");
  const [pEnd, setPEnd] = useState("");
  const [pLabel, setPLabel] = useState("");

  // Form récurrents
  const [rDay, setRDay] = useState(1);
  const [rStart, setRStart] = useState("09:00");
  const [rEnd, setREnd] = useState("12:00");
  const [rLabel, setRLabel] = useState("");

  useEffect(() => {
    (async () => {
      const [{ data: ps }, { data: rs }] = await Promise.all([
        supabase.from("coach_off_periods").select("*").order("date_start", { ascending: true }),
        supabase.from("coach_recurring_off").select("*").order("day_of_week").order("hour_start"),
      ]);
      setPeriods(ps || []);
      setRecurring(rs || []);
      setLoading(false);
    })();
  }, []);

  const addPeriod = async () => {
    if (!pStart || !pEnd) return toast.error("Indique les 2 dates");
    if (pEnd < pStart) return toast.error("Date de fin avant date de début");
    if (isDemo) return toast.info("Mode démo : pas d'écriture");
    const { data, error } = await supabase
      .from("coach_off_periods")
      .insert({ date_start: pStart, date_end: pEnd, label: pLabel || null })
      .select()
      .single();
    if (error) return toast.error("Erreur : " + error.message);
    setPeriods((arr) => [...arr, data].sort((a, b) => a.date_start.localeCompare(b.date_start)));
    setPStart(""); setPEnd(""); setPLabel("");
    toast.success("Plage ajoutée");
  };

  const removePeriod = async (id) => {
    if (isDemo) return;
    if (!window.confirm("Supprimer cette plage off ?")) return;
    const { error } = await supabase.from("coach_off_periods").delete().eq("id", id);
    if (error) return toast.error("Erreur : " + error.message);
    setPeriods((arr) => arr.filter((p) => p.id !== id));
  };

  const addRecurring = async () => {
    if (rEnd <= rStart) return toast.error("Heure de fin avant le début");
    if (isDemo) return toast.info("Mode démo : pas d'écriture");
    const { data, error } = await supabase
      .from("coach_recurring_off")
      .insert({
        day_of_week: rDay,
        hour_start: rStart,
        hour_end: rEnd,
        label: rLabel || null,
      })
      .select()
      .single();
    if (error) return toast.error("Erreur : " + error.message);
    setRecurring((arr) => [...arr, data]);
    setRLabel("");
    toast.success("Récurrence ajoutée");
  };

  const removeRecurring = async (id) => {
    if (isDemo) return;
    if (!window.confirm("Supprimer cette récurrence ?")) return;
    const { error } = await supabase.from("coach_recurring_off").delete().eq("id", id);
    if (error) return toast.error("Erreur : " + error.message);
    setRecurring((arr) => arr.filter((r) => r.id !== id));
  };

  if (loading) {
    return <div style={{ padding: 16, color: "rgba(255,255,255,0.5)", fontSize: 13 }}>Chargement…</div>;
  }

  return (
    <div>
      {/* ═══════ PLAGES OFF (vacances, stage) ═══════ */}
      <div style={{ marginBottom: 32 }}>
        <div style={sectionSubtitle}>Périodes off (vacances, stage…)</div>
        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginBottom: 14, lineHeight: 1.5 }}>
          Les dates dans ces plages ne seront pas proposées aux candidats du formulaire /candidature.
        </p>

        {periods.length === 0 && (
          <div style={{ ...itemCard, color: "rgba(255,255,255,0.4)", fontStyle: "italic" }}>
            Aucune période off
          </div>
        )}
        {periods.map((p) => (
          <div key={p.id} style={itemCard}>
            <div>
              <strong style={{ color: "#fff" }}>
                Du {fmtDate(p.date_start)} au {fmtDate(p.date_end)}
              </strong>
              {p.label && (
                <span style={{ color: "rgba(255,255,255,0.55)", marginLeft: 10 }}>· {p.label}</span>
              )}
            </div>
            <button type="button" onClick={() => removePeriod(p.id)} style={btnGhost}>
              Supprimer
            </button>
          </div>
        ))}

        <div
          style={{
            marginTop: 14,
            padding: 14,
            background: "rgba(2,209,186,0.04)",
            border: "1px solid rgba(2,209,186,0.18)",
            borderRadius: 12,
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 10,
          }}
        >
          <div>
            <label style={{ display: "block", fontSize: 10, color: "rgba(255,255,255,0.55)", marginBottom: 5, letterSpacing: "1px", textTransform: "uppercase" }}>
              Du
            </label>
            <input type="date" value={pStart} onChange={(e) => setPStart(e.target.value)} style={input} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 10, color: "rgba(255,255,255,0.55)", marginBottom: 5, letterSpacing: "1px", textTransform: "uppercase" }}>
              Au
            </label>
            <input type="date" value={pEnd} onChange={(e) => setPEnd(e.target.value)} style={input} />
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={{ display: "block", fontSize: 10, color: "rgba(255,255,255,0.55)", marginBottom: 5, letterSpacing: "1px", textTransform: "uppercase" }}>
              Libellé (optionnel)
            </label>
            <input
              type="text"
              value={pLabel}
              onChange={(e) => setPLabel(e.target.value)}
              placeholder="Vacances été, Stage Italie…"
              style={input}
            />
          </div>
          <div style={{ gridColumn: "1 / -1", textAlign: "right" }}>
            <button type="button" onClick={addPeriod} style={btnPrimary}>
              + Ajouter
            </button>
          </div>
        </div>
      </div>

      {/* ═══════ INDISPOS RÉCURRENTES HEBDO ═══════ */}
      <div>
        <div style={sectionSubtitle}>Indispos récurrentes (chaque semaine)</div>
        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginBottom: 14, lineHeight: 1.5 }}>
          Ex : tous les mardis 9h–12h. Ces créneaux ne seront pas proposés.
        </p>

        {recurring.length === 0 && (
          <div style={{ ...itemCard, color: "rgba(255,255,255,0.4)", fontStyle: "italic" }}>
            Aucune indispo récurrente
          </div>
        )}
        {recurring.map((r) => (
          <div key={r.id} style={itemCard}>
            <div>
              <strong style={{ color: "#fff" }}>
                {dayLabel(r.day_of_week)} {r.hour_start.slice(0, 5)}–{r.hour_end.slice(0, 5)}
              </strong>
              {r.label && (
                <span style={{ color: "rgba(255,255,255,0.55)", marginLeft: 10 }}>· {r.label}</span>
              )}
            </div>
            <button type="button" onClick={() => removeRecurring(r.id)} style={btnGhost}>
              Supprimer
            </button>
          </div>
        ))}

        <div
          style={{
            marginTop: 14,
            padding: 14,
            background: "rgba(2,209,186,0.04)",
            border: "1px solid rgba(2,209,186,0.18)",
            borderRadius: 12,
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 10,
          }}
        >
          <div>
            <label style={{ display: "block", fontSize: 10, color: "rgba(255,255,255,0.55)", marginBottom: 5, letterSpacing: "1px", textTransform: "uppercase" }}>
              Jour
            </label>
            <select value={rDay} onChange={(e) => setRDay(Number(e.target.value))} style={input}>
              {DAYS.map((d) => (
                <option key={d.v} value={d.v}>{d.l}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: "block", fontSize: 10, color: "rgba(255,255,255,0.55)", marginBottom: 5, letterSpacing: "1px", textTransform: "uppercase" }}>
              De
            </label>
            <input type="time" value={rStart} onChange={(e) => setRStart(e.target.value)} style={input} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 10, color: "rgba(255,255,255,0.55)", marginBottom: 5, letterSpacing: "1px", textTransform: "uppercase" }}>
              À
            </label>
            <input type="time" value={rEnd} onChange={(e) => setREnd(e.target.value)} style={input} />
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={{ display: "block", fontSize: 10, color: "rgba(255,255,255,0.55)", marginBottom: 5, letterSpacing: "1px", textTransform: "uppercase" }}>
              Libellé (optionnel)
            </label>
            <input
              type="text"
              value={rLabel}
              onChange={(e) => setRLabel(e.target.value)}
              placeholder="Entraînement perso, séance club…"
              style={input}
            />
          </div>
          <div style={{ gridColumn: "1 / -1", textAlign: "right" }}>
            <button type="button" onClick={addRecurring} style={btnPrimary}>
              + Ajouter
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

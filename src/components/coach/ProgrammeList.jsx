import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "../../lib/supabase";
import { toast } from "../Toast";
import AppIcon from "../AppIcon";
import haptic from "../../lib/haptic";
import { useT, getLocale, t as tStatic } from "../../lib/i18n";

const intlLocale = () => (getLocale() === "en" ? "en-US" : "fr-FR");
const fillTpl = (s, vars) => {
  let out = s;
  Object.entries(vars).forEach(([k, v]) => { out = out.split(`{${k}}`).join(String(v)); });
  return out;
};

// Avatar inline (simple, utilise pour eviter import circulaire avec CoachDashboard)
function Avatar({ name, size = 28 }) {
  const initials = (name || "?").split(" ").map((s) => s[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: "rgba(2,209,186,0.08)",
      border: "1px solid rgba(2,209,186,0.15)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'Syne', sans-serif",
      fontSize: size * 0.36, fontWeight: 900,
      color: "#02d1ba",
      flexShrink: 0,
    }}>{initials}</div>
  );
}

const G = "#02d1ba";
const G_BDR = "rgba(2,209,186,0.22)";
const G_DIM = "rgba(2,209,186,0.08)";
const RED = "#ff6b6b";
const ORANGE = "#00C9A7";

/**
 * ProgrammeList — Vue liste des programmes actifs du coach.
 * Lit la table `programmes` (is_active=true) joinee avec `clients`.
 * Chaque card = un programme assigne a un client. Actions:
 *   - Editer (ouvre ProgrammeBuilder pour ce client)
 *   - Dupliquer vers un autre client (TODO assign modal)
 *   - Archiver (is_active = false)
 *
 * Props:
 *   coachId: uuid
 *   clients: Client[]  (pour resolution nom)
 *   onEdit: (client) => void   // ouvre le builder
 *   onAssign: (programme) => void  // assigner a d'autres clients
 */
export default function ProgrammeList({ coachId, clients = [], onEdit, onAssign }) {
  const t = useT();
  const [loading, setLoading] = useState(true);
  const [programmes, setProgrammes] = useState([]);
  const [filter, setFilter] = useState("all"); // all / active / archived
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        // On charge les programmes des clients du coach (RLS filtre par coach_id)
        const clientIds = clients.map((c) => c.id);
        if (clientIds.length === 0) { setProgrammes([]); return; }
        const { data, error } = await supabase
          .from("programmes")
          .select("id, client_id, programme_name, is_active, uploaded_at, programme_start_date")
          .in("client_id", clientIds)
          .order("uploaded_at", { ascending: false });
        if (error) throw error;
        if (!cancelled) setProgrammes(data || []);
      } catch (e) {
        console.error("[ProgrammeList] load error", e);
        toast.error(tStatic("prog.toast_load_error"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [clients]);

  const clientsById = useMemo(() => {
    const m = {};
    clients.forEach((c) => { m[c.id] = c; });
    return m;
  }, [clients]);

  const filtered = useMemo(() => {
    let list = programmes;
    if (filter === "active") list = list.filter((p) => p.is_active);
    else if (filter === "archived") list = list.filter((p) => !p.is_active);
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((p) => {
        const client = clientsById[p.client_id];
        const hay = `${p.programme_name || ""} ${client?.full_name || ""} ${client?.email || ""}`.toLowerCase();
        return hay.includes(q);
      });
    }
    return list;
  }, [programmes, filter, search, clientsById]);

  const counts = useMemo(() => ({
    total: programmes.length,
    active: programmes.filter((p) => p.is_active).length,
    archived: programmes.filter((p) => !p.is_active).length,
  }), [programmes]);

  async function handleArchive(prog) {
    if (!window.confirm(fillTpl(tStatic("prog.confirm_archive"), { name: prog.programme_name }))) return;
    haptic.light();
    const { error } = await supabase
      .from("programmes")
      .update({ is_active: false })
      .eq("id", prog.id);
    if (error) { toast.error(tStatic("prog.toast_error_prefix") + error.message); return; }
    toast.success(tStatic("prog.toast_archived"));
    setProgrammes((list) => list.map((p) => p.id === prog.id ? { ...p, is_active: false } : p));
  }

  async function handleDelete(prog) {
    const client = clientsById[prog.client_id];
    const name = prog.programme_name || tStatic("prog.this_program");
    const msg = client
      ? fillTpl(tStatic("prog.confirm_delete_with_client"), { name, who: client.full_name || client.email })
      : fillTpl(tStatic("prog.confirm_delete"), { name });
    if (!window.confirm(msg)) return;
    haptic.heavy();
    const { error } = await supabase.from("programmes").delete().eq("id", prog.id);
    if (error) { toast.error(tStatic("prog.toast_error_prefix") + error.message); return; }
    toast.success(tStatic("prog.toast_deleted"));
    setProgrammes((list) => list.filter((p) => p.id !== prog.id));
  }

  function handleEdit(prog) {
    const client = clientsById[prog.client_id];
    if (client && onEdit) { haptic.selection(); onEdit(client); }
  }

  function handleDuplicate(prog) {
    haptic.selection();
    // Ouvre un assign modal externe (passe via onAssign)
    if (onAssign) onAssign(prog);
    else toast.info(tStatic("prog.toast_assign_soon"));
  }

  return (
    <div style={{ padding: "0 4px", animation: "fadeUp .35s ease both" }}>
      {/* HEADER */}
      <div style={{ padding: "8px 0 20px" }}>
        <div style={{ fontSize: 10, color: `${G}88`, letterSpacing: "3px", textTransform: "uppercase", marginBottom: 10 }}>
          {t("prog.title_eyebrow")}
        </div>
        <h1 style={{ fontSize: 52, fontWeight: 800, color: "#fff", letterSpacing: "-3px", lineHeight: 0.92, margin: 0, marginBottom: 8 }}>
          {t("prog.title")}<span style={{ color: G }}>.</span>
        </h1>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,.35)", letterSpacing: ".02em" }}>
          {fillTpl(counts.total > 1 ? t("prog.count_many") : t("prog.count_one"), { n: counts.total })}
          {counts.active > 0 && <> · <span style={{ color: G }}>{fillTpl(counts.active > 1 ? t("prog.active_many") : t("prog.active_one"), { n: counts.active })}</span></>}
          {counts.archived > 0 && <> · <span style={{ color: "rgba(255,255,255,.4)" }}>{fillTpl(counts.archived > 1 ? t("prog.archived_many") : t("prog.archived_one"), { n: counts.archived })}</span></>}
        </div>
      </div>

      {/* FILTRES + SEARCH */}
      <div style={{ display: "flex", gap: 8, marginBottom: 18, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 6, background: "rgba(255,255,255,.02)", border: ".5px solid rgba(255,255,255,.06)", borderRadius: 100, padding: 4 }}>
          {[
            { id: "all", label: t("prog.filter_all"), count: counts.total },
            { id: "active", label: t("prog.filter_active"), count: counts.active },
            { id: "archived", label: t("prog.filter_archived"), count: counts.archived },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => { haptic.selection(); setFilter(f.id); }}
              style={{
                padding: "6px 14px",
                background: filter === f.id ? G_DIM : "transparent",
                border: filter === f.id ? `1px solid ${G_BDR}` : "1px solid transparent",
                color: filter === f.id ? G : "rgba(255,255,255,.4)",
                borderRadius: 100,
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: ".04em",
                cursor: "pointer",
                fontFamily: "inherit",
                transition: "all .18s ease",
              }}
            >
              {f.label} <span style={{ opacity: .6 }}>{f.count}</span>
            </button>
          ))}
        </div>
        <div style={{ flex: 1, position: "relative", minWidth: 220 }}>
          <div style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,.3)", pointerEvents: "none" }}>
            <AppIcon name="search" size={14} />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("prog.search_placeholder")}
            style={{
              width: "100%",
              padding: "10px 14px 10px 38px",
              background: "rgba(255,255,255,.02)",
              border: ".5px solid rgba(255,255,255,.06)",
              borderRadius: 100,
              color: "#fff",
              fontSize: 13,
              fontFamily: "inherit",
              outline: "none",
              letterSpacing: ".02em",
            }}
            onFocus={(e) => { e.target.style.borderColor = G_BDR; e.target.style.background = G_DIM; }}
            onBlur={(e) => { e.target.style.borderColor = "rgba(255,255,255,.06)"; e.target.style.background = "rgba(255,255,255,.02)"; }}
          />
        </div>
      </div>

      {/* LISTE */}
      {loading ? (
        <div style={{ display: "grid", gap: 10 }}>
          {[1,2,3,4].map((i) => (
            <div key={i} className="skel" style={{ height: 92 }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 20px", background: "rgba(255,255,255,.02)", border: ".5px solid rgba(255,255,255,.06)", borderRadius: 16 }}>
          <div style={{ fontSize: 14, color: "rgba(255,255,255,.5)", marginBottom: 6 }}>
            {search ? fillTpl(t("prog.empty_query"), { q: search }) : programmes.length === 0 ? t("prog.empty_none") : t("prog.empty_filter")}
          </div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,.25)" }}>
            {programmes.length === 0 ? t("prog.empty_none_sub") : t("prog.empty_filter_sub")}
          </div>
        </div>
      ) : (
        <div className="dash-stagger" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 12 }}>
          {filtered.map((prog) => {
            const client = clientsById[prog.client_id];
            const clientName = client?.full_name || client?.email || t("prog.unknown_client");
            const isActive = prog.is_active;
            const daysSince = prog.uploaded_at ? Math.floor((Date.now() - new Date(prog.uploaded_at).getTime()) / 86400000) : null;
            const startDate = prog.programme_start_date ? new Date(prog.programme_start_date) : null;
            const isFuture = startDate && startDate > new Date();
            return (
              <div
                key={prog.id}
                style={{
                  background: isActive ? "rgba(255,255,255,.03)" : "rgba(255,255,255,.015)",
                  border: `.5px solid ${isActive ? "rgba(255,255,255,.08)" : "rgba(255,255,255,.04)"}`,
                  borderRadius: 16,
                  padding: 18,
                  position: "relative",
                  overflow: "hidden",
                  transition: "all .18s ease",
                }}
                onMouseEnter={(e) => { if (isActive) { e.currentTarget.style.borderColor = G_BDR; e.currentTarget.style.background = "rgba(2,209,186,.03)"; e.currentTarget.style.transform = "translateY(-1px)"; } }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = isActive ? "rgba(255,255,255,.08)" : "rgba(255,255,255,.04)"; e.currentTarget.style.background = isActive ? "rgba(255,255,255,.03)" : "rgba(255,255,255,.015)"; e.currentTarget.style.transform = "translateY(0)"; }}
              >
                {isActive && (
                  <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, transparent, ${G_BDR}, transparent)` }} />
                )}

                {/* Header: status dot + status label */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: isActive ? G : "rgba(255,255,255,.2)", boxShadow: isActive ? `0 0 8px ${G}` : "none" }} />
                  <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: ".2em", textTransform: "uppercase", color: isActive ? G : "rgba(255,255,255,.3)" }}>
                    {isFuture ? t("prog.status_planned") : isActive ? t("prog.status_active") : t("prog.status_archived")}
                  </div>
                  {isFuture && (
                    <div style={{ marginLeft: "auto", fontSize: 10, color: ORANGE, fontWeight: 600 }}>
                      {fillTpl(t("prog.starts_on"), { date: startDate.toLocaleDateString(intlLocale(), { day: "numeric", month: "short" }) })}
                    </div>
                  )}
                </div>

                {/* Nom programme */}
                <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 700, color: "#fff", letterSpacing: "-.3px", marginBottom: 10, lineHeight: 1.2 }}>
                  {prog.programme_name || t("prog.no_name")}
                </div>

                {/* Client row */}
                <div
                  onClick={() => handleEdit(prog)}
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderTop: ".5px solid rgba(255,255,255,.04)", cursor: "pointer" }}
                >
                  <Avatar name={clientName} size={28} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 500, color: "rgba(255,255,255,.8)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {clientName}
                    </div>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,.25)", marginTop: 1 }}>
                      {daysSince != null ? fillTpl(t("prog.created_days_ago"), { n: daysSince }) : ""}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: "flex", gap: 6, marginTop: 12, paddingTop: 10, borderTop: ".5px solid rgba(255,255,255,.04)" }}>
                  <button
                    onClick={() => handleEdit(prog)}
                    style={actionBtnStyle(true)}
                    title={t("prog.tooltip_edit")}
                  >
                    <AppIcon name="edit" size={11} color={G} /> {t("prog.action_edit")}
                  </button>
                  <button
                    onClick={() => handleDuplicate(prog)}
                    style={actionBtnStyle(false)}
                    title={t("prog.tooltip_duplicate")}
                  >
                    <AppIcon name="plus" size={11} color="rgba(255,255,255,.55)" /> {t("prog.action_duplicate")}
                  </button>
                  {isActive ? (
                    <button
                      onClick={() => handleArchive(prog)}
                      style={actionBtnStyle(false)}
                      title={t("prog.tooltip_archive")}
                    >
                      <AppIcon name="x" size={11} color="rgba(255,255,255,.55)" />
                    </button>
                  ) : (
                    <button
                      onClick={() => handleDelete(prog)}
                      style={{ ...actionBtnStyle(false), color: RED, borderColor: "rgba(255,107,107,.2)" }}
                      title={t("prog.tooltip_delete")}
                    >
                      <AppIcon name="x" size={11} color={RED} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function actionBtnStyle(primary) {
  return {
    flex: primary ? 1 : "0 0 auto",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    padding: "7px 12px",
    background: primary ? "rgba(2,209,186,.06)" : "rgba(255,255,255,.03)",
    border: primary ? `1px solid ${G_BDR}` : ".5px solid rgba(255,255,255,.08)",
    borderRadius: 8,
    color: primary ? G : "rgba(255,255,255,.55)",
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: ".03em",
    cursor: "pointer",
    fontFamily: "inherit",
    transition: "all .15s ease",
  };
}

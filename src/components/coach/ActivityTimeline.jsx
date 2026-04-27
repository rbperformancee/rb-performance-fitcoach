import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import AppIcon from "../AppIcon";
import { useT, getLocale, t as tStatic } from "../../lib/i18n";

const intlLocale = () => (getLocale() === "en" ? "en-US" : "fr-FR");
const fillTpl = (s, vars) => {
  let out = s;
  Object.entries(vars).forEach(([k, v]) => { out = out.split(`{${k}}`).join(String(v)); });
  return out;
};

/**
 * ActivityTimeline — timeline agregee de toutes les interactions
 * coach-client (notes, messages, programmes, pipeline moves).
 * Se base sur coach_activity_log + messages + programmes + coach_notes.
 */
export default function ActivityTimeline({ clientId, coachId }) {
  const t = useT();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clientId) return;
    const loadFeed = async () => {
      setLoading(true);
      const [logRes, msgRes, progRes, noteRes] = await Promise.all([
        supabase.from("coach_activity_log").select("*").eq("client_id", clientId).order("created_at", { ascending: false }).limit(20),
        supabase.from("messages").select("id, content, from_coach, created_at").eq("client_id", clientId).order("created_at", { ascending: false }).limit(20),
        supabase.from("programmes").select("id, programme_name, uploaded_at").eq("client_id", clientId).order("uploaded_at", { ascending: false }).limit(10),
        supabase.from("coach_notes").select("id, content, created_at").eq("client_id", clientId).order("created_at", { ascending: false }).limit(20),
      ]);

      const feed = [];
      (logRes.data || []).forEach((a) => feed.push({
        id: "log_" + a.id,
        type: a.activity_type,
        label: a.details || a.activity_type,
        when: a.created_at,
      }));
      (msgRes.data || []).forEach((m) => feed.push({
        id: "msg_" + m.id,
        type: "message",
        label: (m.from_coach ? tStatic("at.message_from_coach") : tStatic("at.message_from_client")) + m.content.slice(0, 60) + (m.content.length > 60 ? "…" : ""),
        when: m.created_at,
      }));
      (progRes.data || []).forEach((p) => feed.push({
        id: "prog_" + p.id,
        type: "programme",
        label: fillTpl(tStatic("at.programme_uploaded"), { name: p.programme_name || tStatic("at.programme_no_name") }),
        when: p.uploaded_at,
      }));
      (noteRes.data || []).forEach((n) => feed.push({
        id: "note_" + n.id,
        type: "note",
        label: tStatic("at.note_prefix") + n.content.slice(0, 60) + (n.content.length > 60 ? "…" : ""),
        when: n.created_at,
      }));

      feed.sort((a, b) => new Date(b.when).getTime() - new Date(a.when).getTime());
      setItems(feed.slice(0, 25));
      setLoading(false);
    };
    loadFeed();
  }, [clientId]);

  const iconFor = (type) => {
    switch (type) {
      case "message": return { icon: "message", color: "#02d1ba" };
      case "programme": return { icon: "document" === "document" ? "check-circle" : "check", color: "#a78bfa" };
      case "note": return { icon: "edit", color: "#fbbf24" };
      case "pipeline": return { icon: "target", color: "#f97316" };
      case "tag": return { icon: "sparkles", color: "#818cf8" };
      case "call": return { icon: "bell", color: "#ef4444" };
      default: return { icon: "activity", color: "rgba(255,255,255,0.5)" };
    }
  };

  if (loading) {
    return <div style={{ padding: "16px 0", textAlign: "center", color: "rgba(255,255,255,0.3)", fontSize: 11 }}>{t("at.loading")}</div>;
  }

  if (items.length === 0) {
    return <div style={{ padding: "14px 0", textAlign: "center", color: "rgba(255,255,255,0.3)", fontSize: 11, fontStyle: "italic" }}>{t("at.empty")}</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, position: "relative" }}>
      {/* Ligne verticale de timeline */}
      <div style={{ position: "absolute", left: 15, top: 6, bottom: 6, width: 1, background: "rgba(255,255,255,0.05)" }} />
      {items.map((it) => {
        const { icon, color } = iconFor(it.type);
        return (
          <div key={it.id} style={{ display: "flex", gap: 12, alignItems: "flex-start", position: "relative" }}>
            <div style={{ width: 30, height: 30, borderRadius: "50%", background: "#0d0d0d", border: `1px solid ${color}40`, display: "flex", alignItems: "center", justifyContent: "center", color, flexShrink: 0, zIndex: 1 }}>
              <AppIcon name={icon} size={13} color={color} />
            </div>
            <div style={{ flex: 1, minWidth: 0, paddingTop: 4 }}>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.8)", lineHeight: 1.5, overflow: "hidden", textOverflow: "ellipsis" }}>{it.label}</div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", marginTop: 2 }}>{formatWhen(it.when)}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function formatWhen(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const diffMs = Date.now() - d.getTime();
  const diffH = Math.floor(diffMs / 3600000);
  const diffD = Math.floor(diffMs / 86400000);
  if (diffH < 1) return tStatic("coach.activity_just_now");
  if (diffH < 24) return tStatic("coach.activity_hours_ago").replace("{n}", diffH);
  if (diffD === 1) return tStatic("coach.activity_yesterday");
  if (diffD < 7) return tStatic("coach.activity_days_ago").replace("{n}", diffD);
  return d.toLocaleDateString(intlLocale(), { day: "numeric", month: "short" });
}

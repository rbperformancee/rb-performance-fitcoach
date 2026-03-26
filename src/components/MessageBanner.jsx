import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

const GREEN = "#22c55e";

export function MessageBanner({ clientId }) {
  const [messages, setMessages] = useState([]);
  const [current, setCurrent] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!clientId) return;
    const load = async () => {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("client_id", clientId)
        .eq("read", false)
        .eq("from_coach", true)
        .order("created_at", { ascending: false })
        .limit(5);
      if (data?.length) { setMessages(data); setVisible(true); }
    };
    load();
    // Écoute temps réel
    const channel = supabase
      .channel("messages_" + clientId)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "messages",
        filter: `client_id=eq.${clientId}`,
      }, payload => {
        setMessages(prev => [payload.new, ...prev]);
        setCurrent(0);
        setVisible(true);
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [clientId]);

  const markRead = async (id) => {
    await supabase.from("messages").update({ read: true }).eq("id", id);
    const remaining = messages.filter(m => m.id !== id);
    setMessages(remaining);
    if (!remaining.length) setVisible(false);
    else setCurrent(Math.min(current, remaining.length - 1));
  };

  if (!visible || !messages.length) return null;
  const msg = messages[current];

  return (
    <div style={{
      background: "linear-gradient(135deg, rgba(34,197,94,0.1), rgba(34,197,94,0.05))",
      border: "1px solid rgba(34,197,94,0.25)",
      borderRadius: 14, padding: "14px 16px", margin: "0 0 16px",
      display: "flex", alignItems: "flex-start", gap: 12,
      animation: "slideDown 0.3s ease",
      position: "relative", overflow: "hidden",
    }}>
      <style>{`@keyframes slideDown{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}`}</style>
      {/* Ligne verte gauche */}
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, background: GREEN, borderRadius: "14px 0 0 14px" }} />

      {/* Icône */}
      <div style={{
        width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
        background: "rgba(34,197,94,0.15)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 16,
      }}>💬</div>

      {/* Contenu */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase", color: GREEN, marginBottom: 4 }}>
          Message de ton coach
        </div>
        <div style={{ fontSize: 13, color: "#f5f5f5", lineHeight: 1.55 }}>{msg.content}</div>
        <div style={{ fontSize: 10, color: "#555", marginTop: 5 }}>
          {new Date(msg.created_at).toLocaleDateString("fr-FR", { weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
          {messages.length > 1 && <span style={{ marginLeft: 8, color: "#444" }}>· {current + 1}/{messages.length}</span>}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", flexDirection: "column", gap: 4, flexShrink: 0 }}>
        <button onClick={() => markRead(msg.id)} style={{
          background: GREEN, border: "none", borderRadius: 7,
          padding: "5px 12px", color: "#0d0d0d", fontSize: 10, fontWeight: 700, cursor: "pointer",
        }}>Lu ✓</button>
        {messages.length > 1 && (
          <button onClick={() => setCurrent((current + 1) % messages.length)} style={{
            background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 7, padding: "5px 12px", color: "#9ca3af", fontSize: 10, fontWeight: 600, cursor: "pointer",
          }}>Suivant</button>
        )}
      </div>
    </div>
  );
}

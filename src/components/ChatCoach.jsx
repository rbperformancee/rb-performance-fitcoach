import React, { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { toast } from "./Toast";

const GREEN = "#02d1ba";

// Formatage horaire premium : heure si aujourd'hui, "Hier" si hier, date sinon
function formatTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) {
    return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  }
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) {
    return "Hier " + d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" }) + " " + d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

// Groupement des messages par jour pour afficher un separateur
function groupByDay(messages) {
  const groups = [];
  let currentKey = null;
  for (const m of messages) {
    const d = new Date(m.created_at);
    const key = d.toDateString();
    if (key !== currentKey) {
      currentKey = key;
      const now = new Date();
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      let label;
      if (key === now.toDateString()) label = "AUJOURD'HUI";
      else if (key === yesterday.toDateString()) label = "HIER";
      else label = d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }).toUpperCase();
      groups.push({ type: "sep", key: "sep-" + key, label });
    }
    groups.push({ type: "msg", key: m.id || "m-" + m.created_at, msg: m });
  }
  return groups;
}

export default function ChatCoach({ clientId, coachEmail, isCoach, coachName = "Ton coach" }) {
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef(null);
  const scrollRef = useRef(null);

  const fetchMessages = useCallback(async () => {
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("client_id", clientId)
      .order("created_at", { ascending: true })
      .limit(100);
    setMessages(data || []);
    setLoading(false);
  }, [clientId]);

  useEffect(() => {
    if (!clientId) return;
    fetchMessages();
    const channel = supabase
      .channel("chat_" + clientId)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: "client_id=eq." + clientId },
        () => fetchMessages()
      )
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [clientId, fetchMessages]);

  useEffect(() => {
    // Scroll smooth vers le bas apres ajout de message
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  const sendMessage = async () => {
    const content = newMsg.trim();
    if (!content) return;
    setSending(true);

    // Optimistic update : on ajoute le message au state local IMMEDIATEMENT
    // pour qu'il apparaisse tout de suite dans le chat, sans attendre le
    // realtime channel qui peut avoir du lag. On tag avec _optimistic pour
    // pouvoir le remplacer par le row reel quand l'insert Supabase resoud.
    const tempId = "temp-" + Date.now();
    const createdAt = new Date().toISOString();
    const optimisticMsg = {
      id: tempId,
      client_id: clientId,
      content,
      from_coach: isCoach,
      read: false,
      created_at: createdAt,
      _optimistic: true,
    };
    setMessages((prev) => [...prev, optimisticMsg]);
    setNewMsg("");

    const { data, error } = await supabase
      .from("messages")
      .insert({
        client_id: clientId,
        content,
        from_coach: isCoach,
        read: false,
        created_at: createdAt,
      })
      .select()
      .single();

    if (error) {
      console.error("sendMessage error:", error);
      toast.error("Message non envoye : " + (error.message || "erreur"));
      // Rollback : on retire le message optimiste
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setNewMsg(content); // remettre le texte dans l'input pour retenter
    } else if (data) {
      // Remplacer le temp message par le vrai row (avec le bon id de la DB)
      setMessages((prev) => prev.map((m) => (m.id === tempId ? data : m)));
      if (navigator.vibrate) navigator.vibrate(10);
    }
    setSending(false);
  };

  const groups = groupByDay(messages);
  const isEmpty = !loading && messages.length === 0;

  return (
    <div style={{
      flex: 1,
      minHeight: 0,
      display: "flex",
      flexDirection: "column",
      background: "#050505",
      fontFamily: "-apple-system,Inter,sans-serif",
      position: "relative",
    }}>
      <style>{`
        @keyframes msgIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes dotPulse { 0%, 80%, 100% { opacity: 0.25; transform: scale(0.8); } 40% { opacity: 1; transform: scale(1); } }
        .cc-msg-in { animation: msgIn 0.3s cubic-bezier(0.22, 1, 0.36, 1) both; }
      `}</style>

      {/* Ambient glow subtil en haut */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 120,
        background: "radial-gradient(ellipse at 50% 0%, rgba(2,209,186,0.07), transparent 70%)",
        pointerEvents: "none",
      }} />

      {/* ZONE MESSAGES */}
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          overflowX: "hidden",
          padding: "20px 20px 12px",
          display: "flex",
          flexDirection: "column",
          gap: 4,
          position: "relative",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {/* Loading state */}
        {loading && (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", gap: 5 }}>
              {[0, 1, 2].map((i) => (
                <div key={i} style={{
                  width: 6, height: 6, borderRadius: "50%", background: GREEN,
                  animation: `dotPulse 1.2s ease-in-out ${i * 0.15}s infinite`,
                }} />
              ))}
            </div>
          </div>
        )}

        {/* Empty state premium */}
        {isEmpty && (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", padding: "24px 16px", textAlign: "center" }}>
            <div style={{
              width: 72, height: 72, borderRadius: 20,
              background: "rgba(2,209,186,0.06)",
              border: "1px solid rgba(2,209,186,0.18)",
              display: "flex", alignItems: "center", justifyContent: "center",
              marginBottom: 20,
              boxShadow: "0 0 40px rgba(2,209,186,0.15)",
            }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={GREEN} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
              </svg>
            </div>
            <div style={{ fontSize: 9, letterSpacing: "3px", textTransform: "uppercase", color: "rgba(2,209,186,0.6)", marginBottom: 10, fontWeight: 700 }}>
              Messagerie directe
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#fff", letterSpacing: "-0.5px", marginBottom: 10 }}>
              Ton echange avec<br />
              <span style={{ color: GREEN }}>{coachName}.</span>
            </div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", lineHeight: 1.6, maxWidth: 260 }}>
              Pose tes questions, envoie une video, partage tes sensations. {coachName} te repond directement ici.
            </div>
          </div>
        )}

        {/* Messages groupes par jour */}
        {!loading && groups.map((g) => {
          if (g.type === "sep") {
            return (
              <div key={g.key} style={{
                display: "flex", alignItems: "center", gap: 10,
                margin: "16px 0 8px",
              }}>
                <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.05)" }} />
                <div style={{ fontSize: 9, letterSpacing: "2px", color: "rgba(255,255,255,0.25)", fontWeight: 700 }}>
                  {g.label}
                </div>
                <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.05)" }} />
              </div>
            );
          }
          const msg = g.msg;
          const fromCoach = !!msg.from_coach;
          const isMine = isCoach ? fromCoach : !fromCoach;
          return (
            <div key={g.key} className="cc-msg-in" style={{
              display: "flex",
              justifyContent: isMine ? "flex-end" : "flex-start",
              marginBottom: 4,
            }}>
              <div style={{ maxWidth: "78%", display: "flex", flexDirection: "column", alignItems: isMine ? "flex-end" : "flex-start" }}>
                <div style={{
                  background: isMine
                    ? "linear-gradient(135deg, rgba(2,209,186,0.22), rgba(8,145,178,0.18))"
                    : "rgba(255,255,255,0.045)",
                  border: isMine
                    ? "1px solid rgba(2,209,186,0.35)"
                    : "1px solid rgba(255,255,255,0.08)",
                  borderRadius: isMine ? "18px 18px 6px 18px" : "18px 18px 18px 6px",
                  padding: "11px 14px 9px",
                  boxShadow: isMine ? "0 4px 16px rgba(2,209,186,0.08)" : "none",
                }}>
                  <div style={{ fontSize: 14, color: "#fff", lineHeight: 1.45, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                    {msg.content}
                  </div>
                </div>
                <div style={{
                  fontSize: 9,
                  color: "rgba(255,255,255,0.25)",
                  marginTop: 4,
                  padding: "0 6px",
                  letterSpacing: "0.3px",
                }}>
                  {formatTime(msg.created_at)}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} style={{ height: 1 }} />
      </div>

      {/* ZONE INPUT */}
      <div style={{
        padding: "12px 16px calc(env(safe-area-inset-bottom, 0px) + 14px)",
        borderTop: "1px solid rgba(255,255,255,0.05)",
        background: "rgba(10,10,10,0.6)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        display: "flex",
        alignItems: "flex-end",
        gap: 10,
        flexShrink: 0,
      }}>
        <div style={{
          flex: 1,
          minWidth: 0,
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 22,
          padding: "11px 16px",
          transition: "border-color 0.2s, background 0.2s",
        }}>
          <textarea
            value={newMsg}
            onChange={(e) => setNewMsg(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            onFocus={(e) => {
              e.target.parentElement.style.borderColor = "rgba(2,209,186,0.4)";
              e.target.parentElement.style.background = "rgba(255,255,255,0.06)";
              setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }), 300);
            }}
            onBlur={(e) => {
              e.target.parentElement.style.borderColor = "rgba(255,255,255,0.08)";
              e.target.parentElement.style.background = "rgba(255,255,255,0.04)";
            }}
            placeholder={isCoach ? "Message a ton client..." : `Message a ${coachName}...`}
            rows={1}
            style={{
              width: "100%",
              background: "transparent",
              border: "none",
              outline: "none",
              color: "#fff",
              fontFamily: "-apple-system,Inter,sans-serif",
              fontSize: 16, // iOS no-zoom
              fontWeight: 400,
              lineHeight: 1.4,
              resize: "none",
              padding: 0,
              maxHeight: 100,
              overflow: "auto",
              display: "block",
              WebkitAppearance: "none",
              WebkitTapHighlightColor: "transparent",
            }}
          />
        </div>

        <button
          onClick={sendMessage}
          disabled={sending || !newMsg.trim()}
          style={{
            width: 44,
            height: 44,
            flexShrink: 0,
            borderRadius: "50%",
            border: "none",
            background: newMsg.trim()
              ? "linear-gradient(135deg, #02d1ba, #0891b2)"
              : "rgba(255,255,255,0.05)",
            color: newMsg.trim() ? "#000" : "rgba(255,255,255,0.25)",
            cursor: newMsg.trim() ? "pointer" : "default",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0.2s",
            boxShadow: newMsg.trim() ? "0 6px 20px rgba(2,209,186,0.35)" : "none",
            WebkitTapHighlightColor: "transparent",
            WebkitAppearance: "none",
          }}
          aria-label="Envoyer le message"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>
    </div>
  );
}

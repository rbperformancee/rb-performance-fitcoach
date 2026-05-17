import React, { useState, useEffect, useRef } from "react";
import { supabase } from "../../lib/supabase";
import { useT, getLocale } from "../../lib/i18n";
import { isClientDemoMode } from "../../lib/demoMode";
import { notifyNewMessage } from "../../lib/notifyMessage";

const intlLocale = () => getLocale() === "en" ? "en-US" : "fr-FR";

/**
 * ClientMessages — chat client ↔ coach via la table `messages` existante.
 * Bulles teal (du coach) et grey (du client).
 */
export default function ClientMessages({ client, coach, accent, user }) {
  const t = useT();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (!client?.id) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("messages")
        .select("id, content, from_coach, created_at, read")
        .eq("client_id", client.id)
        .order("created_at", { ascending: true })
        .limit(200);
      if (!cancelled) {
        setMessages(data || []);
        setLoading(false);
        setTimeout(() => scrollToBottom(), 50);
        // Marque automatiquement les messages du coach comme lus → la bannière
        // MessageBanner et les éventuelles notifs push système disparaîtront.
        const unreadIds = (data || [])
          .filter(m => m.from_coach && !m.read)
          .map(m => m.id);
        if (unreadIds.length > 0) {
          supabase.from("messages").update({ read: true }).in("id", unreadIds);
          // Signal au Service Worker de fermer les notifs push système
          // qui correspondent à ces messages (Mac/iOS notification center).
          try {
            if (navigator.serviceWorker?.controller) {
              navigator.serviceWorker.controller.postMessage({
                type: "CLOSE_MESSAGE_NOTIFS",
                clientId: client.id,
              });
            }
          } catch {}
        }
      }
    })();

    // Realtime subscription
    const channel = supabase
      .channel(`messages:${client.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `client_id=eq.${client.id}` },
        (payload) => {
          setMessages((m) => [...m, payload.new]);
          setTimeout(() => scrollToBottom(), 50);
        }
      )
      .subscribe();

    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, [client?.id]);

  function scrollToBottom() {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }

  async function handleSend() {
    const content = text.trim();
    if (!content) return;
    if (isClientDemoMode()) { setText(""); return; }
    setSending(true);
    try {
      const { error } = await supabase.from("messages").insert({
        client_id: client.id,
        content,
        from_coach: false,
      });
      if (error) throw error;
      setText("");
      // Push notif au coach (fire-and-forget).
      notifyNewMessage({
        clientId: client.id,
        fromCoach: false,
        senderName: client.full_name,
        content,
      });
    } catch (e) {
      console.warn("[ClientMessages] send", e);
    }
    setSending(false);
  }

  const coachName = coach?.coaching_name || coach?.full_name || t("cm.your_coach");
  const firstName = (client?.full_name || "").split(" ")[0] || t("cm.you");

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100svh - 88px)" }}>
      {/* Header */}
      <div style={{ padding: "32px 20px 14px", borderBottom: ".5px solid rgba(255,255,255,.05)" }}>
        <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: ".22em", textTransform: "uppercase", color: "rgba(255,255,255,.18)", marginBottom: 8 }}>
          {t("cm.conversation")}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: `${accent}15`, border: `.5px solid ${accent}30`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Syne', sans-serif", fontSize: 13, fontWeight: 900, color: accent, flexShrink: 0 }}>
            {(coach?.full_name || coachName).split(" ").map((s) => s[0]).join("").slice(0, 2).toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 16, fontWeight: 800, color: "#fff", letterSpacing: "-.3px" }}>{coachName}</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,.3)", marginTop: 1 }}>{t("cm.usual_reply")}</div>
          </div>
        </div>
      </div>

      {/* Messages list */}
      <div
        ref={scrollRef}
        style={{ flex: 1, overflowY: "auto", padding: "16px 16px 20px", display: "flex", flexDirection: "column", gap: 8 }}
      >
        {loading ? (
          <div style={{ textAlign: "center", padding: 30, color: "rgba(255,255,255,.3)", fontSize: 12 }}>{t("cm.loading")}</div>
        ) : messages.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40, color: "rgba(255,255,255,.3)", fontSize: 12 }}>
            {t("cm.no_messages")}<br />{t("cm.send_first")}
          </div>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              style={{
                alignSelf: m.from_coach ? "flex-start" : "flex-end",
                maxWidth: "82%",
                padding: "10px 14px",
                background: m.from_coach ? `${accent}12` : "rgba(255,255,255,.04)",
                border: `.5px solid ${m.from_coach ? accent + "30" : "rgba(255,255,255,.06)"}`,
                borderRadius: m.from_coach ? "14px 14px 14px 4px" : "14px 14px 4px 14px",
                color: "#fff",
                fontSize: 13.5,
                lineHeight: 1.45,
                animation: "capFade .25s ease both",
              }}
            >
              <div>{m.content}</div>
              <div style={{ fontSize: 9, color: "rgba(255,255,255,.3)", marginTop: 4, letterSpacing: ".02em", textAlign: m.from_coach ? "left" : "right" }}>
                {m.from_coach ? coachName.split(" ")[0] : firstName} · {fmtTime(m.created_at)}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Input */}
      <div style={{ padding: "12px 16px 16px", borderTop: ".5px solid rgba(255,255,255,.05)", background: "rgba(8,8,8,.95)", display: "flex", gap: 8 }}>
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t("cm.input_placeholder")}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
          style={{
            flex: 1, height: 42,
            padding: "0 14px",
            background: "rgba(255,255,255,.04)",
            border: ".5px solid rgba(255,255,255,.08)",
            borderRadius: 100,
            color: "#fff", fontSize: 14,
            fontFamily: "inherit", outline: "none",
            boxSizing: "border-box",
          }}
          autoCapitalize="sentences"
        />
        <button
          onClick={handleSend}
          disabled={sending || !text.trim()}
          style={{
            width: 42, height: 42,
            background: text.trim() ? accent : "rgba(255,255,255,.04)",
            border: "none", borderRadius: "50%",
            color: text.trim() ? "#000" : "rgba(255,255,255,.3)",
            cursor: sending || !text.trim() ? "not-allowed" : "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}
          aria-label={t("cm.send")}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>
    </div>
  );
}

function fmtTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleTimeString(intlLocale(), { hour: "2-digit", minute: "2-digit" });
}

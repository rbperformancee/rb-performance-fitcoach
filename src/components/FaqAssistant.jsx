import React, { useState, useRef, useEffect } from "react";

const G = "#02d1ba";

export default function FaqAssistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    const userMsg = { role: "user", content: text };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/faq-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updated.map(m => ({ role: m.role, content: m.content })) }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: "assistant", content: data.reply || "Erreur" }]);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "Desole, une erreur est survenue." }]);
    }
    setLoading(false);
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        aria-label="Aide"
        style={{
          position: "fixed", bottom: "calc(env(safe-area-inset-bottom, 0px) + 90px)", right: 18,
          width: 44, height: 44, borderRadius: "50%",
          background: "rgba(2,209,186,0.12)", border: `1px solid rgba(2,209,186,0.3)`,
          color: G, display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", zIndex: 90, boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
          backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
          transition: "transform 0.2s",
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      </button>
    );
  }

  return (
    <div style={{ position: "fixed", bottom: "calc(env(safe-area-inset-bottom, 0px) + 80px)", right: 16, width: 320, maxHeight: "60vh", borderRadius: 20, background: "#0a0a0a", border: "1px solid rgba(2,209,186,0.2)", boxShadow: "0 16px 48px rgba(0,0,0,0.6)", zIndex: 200, display: "flex", flexDirection: "column", overflow: "hidden", fontFamily: "-apple-system,Inter,sans-serif" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,0.05)", flexShrink: 0 }}>
        <div>
          <div style={{ fontSize: 9, letterSpacing: "2px", textTransform: "uppercase", color: "rgba(2,209,186,0.5)", fontWeight: 700 }}>Assistant</div>
          <div style={{ fontSize: 14, fontWeight: 800, color: "#fff" }}>RB Perform</div>
        </div>
        <button onClick={() => setOpen(false)} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 100, width: 28, height: 28, color: "rgba(255,255,255,0.4)", fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8, WebkitOverflowScrolling: "touch" }}>
        {messages.length === 0 && (
          <div style={{ textAlign: "center", padding: "20px 10px", color: "rgba(255,255,255,0.3)", fontSize: 12, lineHeight: 1.6 }}>
            Pose-moi une question sur l'app.<br />
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.2)" }}>Ex: Comment scanner un produit ?</span>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
            <div style={{
              maxWidth: "85%", padding: "10px 13px", borderRadius: m.role === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
              background: m.role === "user" ? "rgba(2,209,186,0.15)" : "rgba(255,255,255,0.04)",
              border: `1px solid ${m.role === "user" ? "rgba(2,209,186,0.3)" : "rgba(255,255,255,0.06)"}`,
              fontSize: 13, color: "#fff", lineHeight: 1.5,
            }}>{m.content}</div>
          </div>
        ))}
        {loading && (
          <div style={{ display: "flex", gap: 4, padding: "8px 12px" }}>
            {[0, 1, 2].map(i => <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: G, opacity: 0.4, animation: `dotP 1s ease ${i * 0.15}s infinite alternate` }} />)}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ padding: "10px 12px", borderTop: "1px solid rgba(255,255,255,0.05)", display: "flex", gap: 8, flexShrink: 0 }}>
        <style>{`@keyframes dotP{from{opacity:0.3;transform:translateY(0)}to{opacity:1;transform:translateY(-3px)}}`}</style>
        <input
          value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && send()}
          placeholder="Ta question..."
          style={{ flex: 1, padding: "10px 14px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, color: "#fff", fontSize: 14, outline: "none", fontFamily: "inherit" }}
        />
        <button onClick={send} disabled={!input.trim() || loading} style={{
          width: 38, height: 38, borderRadius: "50%", flexShrink: 0, border: "none",
          background: input.trim() ? G : "rgba(255,255,255,0.04)",
          color: input.trim() ? "#000" : "rgba(255,255,255,0.2)",
          display: "flex", alignItems: "center", justifyContent: "center", cursor: input.trim() ? "pointer" : "default",
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
        </button>
      </div>
    </div>
  );
}

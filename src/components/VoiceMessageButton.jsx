import React, { useState, useRef } from "react";

/**
 * VoiceMessageButton — bouton micro pour la messagerie.
 *
 * Tap → démarre l'enregistrement (MediaRecorder). Pendant l'enregistrement,
 * affiche un chrono + bouton envoyer + annuler. À l'envoi, appelle
 * onSend(blob). Autonome — toute la logique micro est ici.
 *
 * Props :
 *   onSend(blob)  - callback avec le Blob audio enregistré
 *   disabled      - désactive le bouton
 *   accent        - couleur d'accent (defaut teal)
 */

const RED = "#ef4444";

function fmt(s) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

export default function VoiceMessageButton({ onSend, disabled, accent = "#02d1ba" }) {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  const timerRef = useRef(null);

  function cleanup() {
    clearInterval(timerRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    recorderRef.current = null;
    setRecording(false);
    setSeconds(0);
  }

  async function start() {
    if (disabled || recording) return;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      alert("L'enregistrement audio n'est pas supporté sur cet appareil.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data && e.data.size) chunksRef.current.push(e.data); };
      mr.start();
      recorderRef.current = mr;
      setRecording(true);
      setSeconds(0);
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } catch {
      alert("Micro non autorisé.");
      cleanup();
    }
  }

  function stopAndSend() {
    const mr = recorderRef.current;
    if (!mr) { cleanup(); return; }
    mr.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mr.mimeType || "audio/webm" });
      chunksRef.current = [];
      cleanup();
      if (blob.size > 0) onSend(blob);
    };
    try { mr.stop(); } catch { cleanup(); }
  }

  function cancel() {
    const mr = recorderRef.current;
    chunksRef.current = [];
    if (mr) {
      mr.onstop = () => cleanup();
      try { mr.stop(); } catch { cleanup(); }
    } else {
      cleanup();
    }
  }

  const circle = {
    width: 44, height: 44, flexShrink: 0, borderRadius: "50%",
    display: "flex", alignItems: "center", justifyContent: "center",
    cursor: disabled ? "not-allowed" : "pointer",
  };

  if (!recording) {
    return (
      <button
        onClick={start}
        disabled={disabled}
        title="Message vocal"
        style={{ ...circle, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)" }}
      >
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          <line x1="12" y1="19" x2="12" y2="23" />
        </svg>
      </button>
    );
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
      <button onClick={cancel} title="Annuler" style={{ ...circle, width: 38, height: 38, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.6)" }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
      <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: "'JetBrains Mono',monospace", fontSize: 13, color: RED, fontWeight: 700 }}>
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: RED, animation: "vmPulse 1s ease-in-out infinite" }} />
        {fmt(seconds)}
      </div>
      <button onClick={stopAndSend} title="Envoyer" style={{ ...circle, border: "none", background: `linear-gradient(135deg, ${accent}, #0891b2)` }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
        </svg>
      </button>
      <style>{`@keyframes vmPulse{0%,100%{opacity:1}50%{opacity:0.3}}`}</style>
    </div>
  );
}

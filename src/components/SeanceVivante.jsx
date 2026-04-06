import React, { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";

const GREEN = "#02d1ba";

export function SeanceVivante({ clientId, sessionName }) {
  const [message, setMessage] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [visible, setVisible] = useState(false);
  const audioRef = useRef(null);
  const intervalRef = useRef(null);

  // Notifier le coach que la seance a commence
  useEffect(() => {
    if (!clientId) return;
    supabase.from("session_live").upsert({
      client_id: clientId,
      session_name: sessionName || "Seance",
      started_at: new Date().toISOString(),
      active: true,
    }, { onConflict: "client_id" });

    return () => {
      supabase.from("session_live").upsert({
        client_id: clientId,
        active: false,
      }, { onConflict: "client_id" });
    };
  }, [clientId, sessionName]);

  // Ecouter les messages flash du coach
  useEffect(() => {
    if (!clientId) return;

    const checkMessages = async () => {
      const { data } = await supabase
        .from("coach_messages_flash")
        .select("*")
        .eq("client_id", clientId)
        .is("read_at", null)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (data) {
        setMessage(data);
        setVisible(true);
        if (navigator.vibrate) navigator.vibrate([100, 50, 100, 50, 200]);
        // Marquer comme lu apres 3 secondes
        setTimeout(async () => {
          await supabase.from("coach_messages_flash")
            .update({ read_at: new Date().toISOString() })
            .eq("id", data.id);
        }, 3000);
      }
    };

    // Verifier toutes les 5 secondes
    intervalRef.current = setInterval(checkMessages, 5000);
    checkMessages();

    return () => clearInterval(intervalRef.current);
  }, [clientId]);

  const playAudio = () => {
    if (!message?.audio_url) return;
    if (!audioRef.current) audioRef.current = new Audio(message.audio_url);
    audioRef.current.play();
    setPlaying(true);
    audioRef.current.onended = () => setPlaying(false);
  };

  if (!visible || !message) return null;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 500,
      background: "rgba(0,0,0,0.92)",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: 32, animation: "fadeIn 0.3s ease",
    }}>
      {/* Logo RB PERFORM */}
      <div style={{ fontSize: 10, color: "rgba(2,209,186,0.5)", letterSpacing: "3px", textTransform: "uppercase", marginBottom: 20 }}>Message de ton coach</div>

      {/* Avatar coach */}
      <div style={{ width: 72, height: 72, borderRadius: "50%", background: "rgba(2,209,186,0.1)", border: "2px solid rgba(2,209,186,0.3)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 24, fontSize: 28 }}>R</div>

      {/* Message texte */}
      {message.text_message && (
        <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", textAlign: "center", letterSpacing: "-1px", lineHeight: 1.3, marginBottom: 24, maxWidth: 300 }}>
          {message.text_message}
        </div>
      )}

      {/* Bouton play audio */}
      {message.audio_url && (
        <button onClick={playAudio} style={{
          width: 72, height: 72, borderRadius: "50%",
          background: playing ? "rgba(2,209,186,0.2)" : GREEN,
          border: "none", cursor: "pointer", marginBottom: 24,
          display: "flex", alignItems: "center", justifyContent: "center",
          transition: "all 0.2s",
        }}>
          {playing ? (
            <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
              {[1,2,3].map(i => (
                <div key={i} style={{ width: 4, height: 16 + i * 4, background: GREEN, borderRadius: 2, animation: `wave${i} 0.8s ease-in-out infinite` }} />
              ))}
            </div>
          ) : (
            <svg viewBox="0 0 24 24" fill="#000" style={{ width: 28, height: 28, marginLeft: 4 }}>
              <polygon points="5,3 19,12 5,21"/>
            </svg>
          )}
        </button>
      )}

      <button onClick={() => setVisible(false)} style={{
        background: "transparent", border: "1px solid rgba(255,255,255,0.15)",
        borderRadius: 100, padding: "10px 24px", color: "rgba(255,255,255,0.4)",
        fontSize: 13, cursor: "pointer",
      }}>
        Fermer
      </button>
    </div>
  );
}

import React, { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";
import AppIcon from "./AppIcon";
import { useT } from "../lib/i18n";

const G = "#02d1ba";

export function SeanceVivante({ clientId, sessionName }) {
  const t = useT();
  const [message, setMessage] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [visible, setVisible] = useState(false);
  const audioRef = useRef(null);
  const lastMessageIdRef = useRef(null);
  const mountedAtRef = useRef(new Date().toISOString());

  // Notifier le coach que la seance a commence
  useEffect(() => {
    if (!clientId) return;
    supabase.from("session_live").upsert({
      client_id: clientId,
      session_name: sessionName || t("svc.session_fallback"),
      started_at: new Date().toISOString(),
      active: true,
    }, { onConflict: "client_id" }).then(({ error }) => {
      if (error) console.warn("[session_live] upsert START failed:", error.message, error.code, error.details);
      else console.log("[session_live] upsert START ok");
    });
    return () => {
      supabase.from("session_live").upsert({
        client_id: clientId, active: false,
      }, { onConflict: "client_id" }).then(({ error }) => {
        if (error) console.warn("[session_live] upsert STOP failed:", error.message, error.code);
      });
    };
  }, [clientId, sessionName]);

  // Ecouter les messages flash en REALTIME
  useEffect(() => {
    if (!clientId) return;

    // Verifier les messages non lus au montage
    const checkExisting = async () => {
      const { data } = await supabase
        .from("coach_messages_flash")
        .select("*")
        .eq("client_id", clientId)
        .is("read_at", null)
        .gt("expires_at", new Date().toISOString())
        .gt("created_at", mountedAtRef.current)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) showMessage(data);
    };
    checkExisting();

    // Polling toutes les 2s + visibilitychange pour iOS
    const poll = setInterval(checkExisting, 2000);
    
    // Verifier immediatement au retour sur l app
    const onVisible = () => {
      if (document.visibilityState === "visible") checkExisting();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      clearInterval(poll);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [clientId]);

  const showMessage = (data) => {
    // Ne pas afficher si deja vu
    if (lastMessageIdRef.current === data.id) return;
    lastMessageIdRef.current = data.id;
    setMessage(data);
    setVisible(true);
    if (navigator.vibrate) navigator.vibrate([100, 50, 100, 50, 200]);
    // Marquer comme lu immediatement
    supabase.from("coach_messages_flash")
      .update({ read_at: new Date().toISOString() })
      .eq("id", data.id);
  };

  const playAudio = async () => {
    if (message?.audio_url) {
      try {
        // Web Audio API - bypass restrictions iOS Safari
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        const ctx = new AudioCtx();
        await ctx.resume();
        const resp = await fetch(message.audio_url);
        const arrayBuffer = await resp.arrayBuffer();
        const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(ctx.destination);
        source.onended = () => setPlaying(false);
        source.start(0);
        setPlaying(true);
        return;
      } catch(e) {
        console.log("Web Audio failed, fallback speech:", e);
        speakText();
      }
    } else {
      speakText();
    }
  };

  const speakText = () => {
    if (!message?.text_message) return;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(message.text_message);
    utt.lang = t("svc.tts_lang");
    utt.rate = 1.0;
    utt.onstart = () => setPlaying(true);
    utt.onend = () => setPlaying(false);
    window.speechSynthesis.speak(utt);
  };

  const dismiss = () => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    setPlaying(false);
    setVisible(false);
    setMessage(null);
  };

  // Le composant a 2 modes :
  //   1) Indicateur "LIVE" discret en haut tant que la seance tourne (pas de message coach).
  //   2) Overlay plein ecran quand un message flash arrive (visible && message).
  // Avant : early-return null tant qu il n y avait pas de message -> aucun DOM monte
  // -> impossible pour le client de "voir" que SeanceVivante etait actif.
  if (!visible || !message) {
    return (
      <div data-seance-vivante="live" style={{ position: "fixed", top: "calc(env(safe-area-inset-top, 0px) + 8px)", left: "50%", transform: "translateX(-50%)", zIndex: 400, display: "flex", alignItems: "center", gap: 8, background: "rgba(2,209,186,0.08)", border: "1px solid rgba(2,209,186,0.25)", borderRadius: 100, padding: "6px 14px", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", pointerEvents: "none" }}>
        <style>{`@keyframes svPulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
        <div style={{ width: 7, height: 7, borderRadius: "50%", background: G, animation: "svPulse 1.4s ease-in-out infinite" }} />
        <div style={{ fontSize: 9, color: G, letterSpacing: "2px", textTransform: "uppercase", fontWeight: 700 }}>{t("svc.eyebrow")}</div>
      </div>
    );
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 500, background: "rgba(0,0,0,0.95)", WebkitBackdropFilter: "blur(20px)", backdropFilter: "blur(20px)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 32, animation: "svFadeIn 0.4s ease" }}>
      <style>{`@keyframes svFadeIn { from { opacity:0; transform:scale(0.95); } to { opacity:1; transform:scale(1); } } @keyframes svWave { 0%,100%{transform:scaleY(1)} 50%{transform:scaleY(1.8)} }`}</style>

      {/* Badge coach */}
      <div style={{ fontSize: 9, color: "rgba(2,209,186,0.5)", letterSpacing: "4px", textTransform: "uppercase", marginBottom: 24 }}>{t("svc.eyebrow")}</div>

      {/* Avatar */}
      <div style={{ width: 80, height: 80, borderRadius: "50%", background: "rgba(2,209,186,0.08)", border: "2px solid rgba(2,209,186,0.3)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 28, color: G, boxShadow: "0 0 40px rgba(2,209,186,0.15)" }}>
        <AppIcon name="dumbbell" size={36} color={G} strokeWidth={1.6} />
      </div>

      {/* Message texte */}
      {message.text_message && (
        <div style={{ fontSize: 24, fontWeight: 800, color: "#fff", textAlign: "center", letterSpacing: "-1px", lineHeight: 1.3, marginBottom: 28, maxWidth: 300 }}>
          {message.text_message}
        </div>
      )}

      {/* Bouton play audio */}
      {(message.audio_url || message.text_message) && (
        <button onClick={playAudio} style={{ width: 80, height: 80, borderRadius: "50%", background: playing ? "rgba(2,209,186,0.15)" : G, border: playing ? "2px solid " + G : "none", cursor: "pointer", marginBottom: 28, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s", boxShadow: playing ? "0 0 30px rgba(2,209,186,0.4)" : "none" }}>
          {playing ? (
            <div style={{ display: "flex", gap: 4, alignItems: "center", height: 28 }}>
              {[1,2,3,2,1].map((h, i) => (
                <div key={i} style={{ width: 4, height: h * 8, background: G, borderRadius: 2, animation: `svWave ${0.6 + i * 0.1}s ease-in-out infinite`, animationDelay: i * 0.1 + "s" }} />
              ))}
            </div>
          ) : (
            <svg viewBox="0 0 24 24" fill="#000" style={{ width: 30, height: 30, marginLeft: 4 }}>
              <polygon points="5,3 19,12 5,21"/>
            </svg>
          )}
        </button>
      )}

      {/* Bouton fermer */}
      <button onClick={dismiss} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 100, padding: "12px 28px", color: "rgba(255,255,255,0.4)", fontSize: 13, cursor: "pointer", letterSpacing: "0.5px" }}>
        {t("svc.btn_continue")}
      </button>
    </div>
  );
}

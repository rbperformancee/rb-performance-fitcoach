import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "./supabase";

/**
 * useTyping — indicateur « en train d'écrire » pour le chat coach ↔ athlète.
 *
 * Utilise le canal Realtime *broadcast* de Supabase (pub/sub léger,
 * indépendant des postgres_changes / de la base).
 *
 * @param {string} conversationId  id de la conversation (= client.id)
 * @param {"coach"|"client"} role  rôle de l'utilisateur courant
 * @returns {{ peerTyping: boolean, notifyTyping: () => void }}
 *   peerTyping  : l'autre partie est en train d'écrire
 *   notifyTyping: à appeler à chaque frappe (throttlé en interne)
 */
export function useTyping(conversationId, role) {
  const [peerTyping, setPeerTyping] = useState(false);
  const channelRef = useRef(null);
  const lastSentRef = useRef(0);
  const hideTimerRef = useRef(null);

  useEffect(() => {
    if (!conversationId) return;
    setPeerTyping(false);
    const ch = supabase.channel(`typing:${conversationId}`, {
      config: { broadcast: { self: false } },
    });
    ch.on("broadcast", { event: "typing" }, ({ payload }) => {
      if (!payload || payload.role === role) return; // ignore soi-même
      setPeerTyping(true);
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = setTimeout(() => setPeerTyping(false), 3500);
    });
    ch.subscribe();
    channelRef.current = ch;
    return () => {
      clearTimeout(hideTimerRef.current);
      supabase.removeChannel(ch);
      channelRef.current = null;
    };
  }, [conversationId, role]);

  const notifyTyping = useCallback(() => {
    const now = Date.now();
    if (now - lastSentRef.current < 1800) return; // throttle
    lastSentRef.current = now;
    try {
      channelRef.current?.send({ type: "broadcast", event: "typing", payload: { role } });
    } catch { /* canal pas encore prêt — sans gravité */ }
  }, [role]);

  return { peerTyping, notifyTyping };
}

/**
 * useAuth.js — Gestion auth Supabase + profil client
 */
import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";

const COACH_EMAIL = 'rb.performancee@gmail.com';

export function useAuth() {
  const [user,        setUser]        = useState(null);
  const [client,      setClient]      = useState(null);  // profil clients table
  const [programme,   setProgramme]   = useState(null);  // HTML du programme
  const [loading,     setLoading]     = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [error,       setError]       = useState(null);
  const [magicSent,   setMagicSent]   = useState(false);

  /* ── Charger le profil + programme depuis Supabase ── */
  const loadClientData = useCallback(async (authUser) => {
    if (!authUser) { setLoading(false); return; }
    // Le coach n'a pas de profil client — skip
    if (authUser.email === COACH_EMAIL) { setLoading(false); return; }
    try {
      // 1. Récupérer le profil client
      const { data: clientData, error: cErr } = await supabase
        .from("clients")
        .select("*")
        .eq("email", authUser.email)
        .single();

      if (cErr || !clientData) {
        setLoading(false);
        return;
      }
      setClient(clientData);

      // 2. Récupérer le programme actif
      const { data: progData, error: pErr } = await supabase
        .from("programmes")
        .select("*")
        .eq("client_id", clientData.id)
        .eq("is_active", true)
        .order("uploaded_at", { ascending: false })
        .limit(1)
        .single();

      if (pErr || !progData) {
        setLoading(false);
        return;
      }

      setProgramme(progData.html_content);
    } catch (e) {
      setError("Erreur de connexion. Réessaie.");
    } finally {
      setLoading(false);
    }
  }, []);

  /* ── Écouter les changements auth ── */
  useEffect(() => {
    // Session au démarrage
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) loadClientData(u);
      else setLoading(false);
    });

    // Changements en temps réel (magic link callback)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (event === "SIGNED_IN" && u) {
        setLoading(true);
        loadClientData(u);
      }
      if (event === "SIGNED_OUT") {
        setClient(null);
        setProgramme(null);
        setError(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [loadClientData]);

  /* ── Envoyer le magic link ── */
  const sendMagicLink = useCallback(async (email) => {
    setAuthLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: {
          emailRedirectTo: window.location.origin,
        },
      });
      if (error) throw error;
      setMagicSent(true);
    } catch (e) {
      setError(e.message || "Erreur lors de l'envoi du lien.");
    } finally {
      setAuthLoading(false);
    }
  }, []);

  /* ── Déconnexion ── */
  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  return {
    user, client, programme,
    loading, authLoading, error, magicSent,
    sendMagicLink, signOut,
  };
}

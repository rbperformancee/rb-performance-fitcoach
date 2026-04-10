import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";

const COACH_EMAIL = 'rb.performancee@gmail.com';

export function useAuth() {
  const [user,        setUser]        = useState(null);
  const [client,      setClient]      = useState(null);
  const [programme,   setProgramme]   = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [error,       setError]       = useState(null);
  const [magicSent,   setMagicSent]   = useState(false);

  const loadClientData = useCallback(async (authUser) => {
    try {
      if (!authUser) return;
      if (authUser.email === COACH_EMAIL) return;
      const { data: clientData } = await supabase
        .from("clients").select("*").eq("email", authUser.email).single();
      setClient(clientData || null);
      if (!clientData) return;
      startPolling(clientData);
      const { data: progData } = await supabase
        .from("programmes").select("*").eq("client_id", clientData.id)
        .eq("is_active", true).order("uploaded_at", { ascending: false }).limit(1).single();
      if (progData) setProgramme(progData.html_content);
    } catch (e) {
      console.error("loadClientData:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) loadClientData(u);
      else setLoading(false);
    });

    // Polling — vérifie le programme toutes les 5 secondes si pas encore chargé
    let pollInterval = null;
    const startPolling = (clientData) => {
      if (!clientData?.id) return;
      if (pollInterval) clearInterval(pollInterval);
      pollInterval = setInterval(async () => {
        const { data } = await supabase
          .from('programmes')
          .select('html_content')
          .eq('client_id', clientData.id)
          .eq('is_active', true)
          .order('uploaded_at', { ascending: false })
          .limit(1)
          .single();
        if (data?.html_content) {
          setProgramme(data.html_content);
          clearInterval(pollInterval);
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('RB Perform 🔥', {
              body: 'Ton programme est prêt ! Lance-toi.',
              icon: '/icon-192.png',
            });
          }
        }
      }, 5000);
    };

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
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [loadClientData]);

  const sendMagicLink = useCallback(async (email) => {
    setAuthLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: { emailRedirectTo: window.location.origin },
      });
      if (error) throw error;
      setMagicSent(true);
    } catch (e) {
      setError(e.message || "Erreur lors de l'envoi du lien.");
    } finally {
      setAuthLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  return { user, client, programme, loading, authLoading, error, magicSent, sendMagicLink, signOut };
}

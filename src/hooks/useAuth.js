import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../lib/supabase";

export function useAuth() {
  const [user,        setUser]        = useState(null);
  const [client,      setClient]      = useState(null);
  const [programme,   setProgramme]   = useState(null);
  const [programmeMeta, setProgrammeMeta] = useState(null); // { id, programme_name, programme_accepted_at, programme_start_date, accepted_by }
  const [coachInfo,   setCoachInfo]   = useState(null); // { full_name, brand_name, accent_color, email, logo_url }
  const [loading,     setLoading]     = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [error,       setError]       = useState(null);
  const [magicSent,   setMagicSent]   = useState(false);
  const pollRef = useRef(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const startPolling = useCallback((clientId) => {
    if (!clientId) return;
    stopPolling();
    pollRef.current = setInterval(async () => {
      const { data } = await supabase
        .from('programmes')
        .select('html_content')
        .eq('client_id', clientId)
        .eq('is_active', true)
        .order('uploaded_at', { ascending: false })
        .limit(1)
        .single();
      if (data?.html_content) {
        setProgramme(data.html_content);
        stopPolling();
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('Programme pret', {
            body: 'Ton programme est pret ! Lance-toi.',
            icon: '/icon-192.png',
          });
        }
        setTimeout(() => window.location.reload(), 500);
      }
    }, 5000);
  }, [stopPolling]);

  const loadClientData = useCallback(async (authUser) => {
    try {
      if (!authUser) return;
      // Check if user is a coach first
      const { data: coachCheck } = await supabase.from("coaches").select("id").eq("email", authUser.email).single();
      if (coachCheck) return; // Coach — skip client loading
      const { data: clientData } = await supabase
        .from("clients").select("*").eq("email", authUser.email).single();
      setClient(clientData || null);
      if (!clientData) return;
      // Fetch coach branding for this client
      if (clientData.coach_id) {
        const { data: coach } = await supabase
          .from("coaches").select("full_name,brand_name,accent_color,email,logo_url")
          .eq("id", clientData.coach_id).single();
        if (coach) setCoachInfo(coach);
      }
      const { data: progData } = await supabase
        .from("programmes").select("*").eq("client_id", clientData.id)
        .eq("is_active", true).order("uploaded_at", { ascending: false }).limit(1).single();
      if (progData?.html_content) {
        setProgramme(progData.html_content);
        setProgrammeMeta({ id: progData.id, programme_name: progData.programme_name, programme_accepted_at: progData.programme_accepted_at, programme_start_date: progData.programme_start_date, accepted_by: progData.accepted_by });
      } else {
        startPolling(clientData.id);
      }
    } catch (e) {
      console.error("loadClientData:", e);
    } finally {
      setLoading(false);
    }
  }, [startPolling]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) loadClientData(u);
      else setLoading(false);
    });

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
        stopPolling();
      }
    });

    return () => {
      subscription.unsubscribe();
      stopPolling();
    };
  }, [loadClientData, stopPolling]);

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

  return { user, client, programme, programmeMeta, coachInfo, loading, authLoading, error, magicSent, sendMagicLink, signOut };
}

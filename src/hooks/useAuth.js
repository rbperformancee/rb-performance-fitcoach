import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../lib/supabase";
import { setSentryUser } from "../lib/sentry";
import { setProgrammeHtml } from "../lib/offline";

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
        .or(`published_at.lte.${new Date().toISOString()},published_at.is.null`)
        .order('published_at', { ascending: false, nullsFirst: false })
        .order('uploaded_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data?.html_content) {
        setProgramme(data.html_content);
        stopPolling();
        // Cache offline — abstraction Wave 6 : SW postMessage en web,
        // @capacitor/preferences en natif iOS. Idempotent et non bloquant.
        setProgrammeHtml(data.html_content);
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('Programme pret', {
            body: 'Ton programme est pret ! Lance-toi.',
            icon: '/icon-192.png',
          });
        }
        // Reload pour forcer le rechargement du programme. Guard :
        // ne reload PAS si l'app est passée background (iOS WebView le
        // ferait apparaître comme un crash au foreground) OU si l'user
        // s'est sign-out entre temps. Sinon UX = "l'app crash toute seule".
        setTimeout(() => {
          if (document.visibilityState === 'hidden') return;
          window.location.reload();
        }, 500);
      }
    }, 5000);
  }, [stopPolling]);

  const loadClientData = useCallback(async (authUser) => {
    try {
      if (!authUser) return;
      // Coach check + client load en parallèle (les deux dépendent juste du email)
      const [coachRes, clientRes] = await Promise.all([
        supabase.from("coaches").select("id").eq("email", authUser.email).maybeSingle(),
        supabase.from("clients").select("*").eq("email", authUser.email).maybeSingle(),
      ]);
      if (coachRes.data) return; // Coach — skip client loading
      const clientData = clientRes.data;
      setClient(clientData || null);
      if (!clientData) return;
      // Coach branding + programme en parallèle (les deux ne dépendent que de clientData)
      const branding = clientData.coach_id
        ? supabase.from("coaches").select("full_name,brand_name,accent_color,email,logo_url,coach_code,coach_slug,payment_link").eq("id", clientData.coach_id).maybeSingle()
        : Promise.resolve({ data: null });
      // File d'attente de blocs : le programme actif = le bloc dont published_at
      // est le plus récent parmi ceux déjà arrivés (<= maintenant). Les blocs
      // futurs (published_at > now) attendent. NULL = programme legacy → actif.
      const prog = supabase.from("programmes").select("*").eq("client_id", clientData.id).eq("is_active", true).or(`published_at.lte.${new Date().toISOString()},published_at.is.null`).order("published_at", { ascending: false, nullsFirst: false }).order("uploaded_at", { ascending: false }).limit(1).maybeSingle();
      const [{ data: coach }, { data: progData }] = await Promise.all([branding, prog]);
      if (coach) setCoachInfo(coach);
      if (progData?.html_content) {
        setProgramme(progData.html_content);
        setProgrammeMeta({ id: progData.id, programme_name: progData.programme_name, programme_accepted_at: progData.programme_accepted_at, programme_start_date: progData.programme_start_date, accepted_by: progData.accepted_by, start_date: progData.start_date, training_days: progData.training_days, skipped_dates: progData.skipped_dates || [] });
        // Cache programme pour acces offline (web SW ou Capacitor Preferences)
        setProgrammeHtml(progData.html_content);
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
    // Si getSession() reject (SecureStorage Capacitor corrompue après update
    // app sur iOS — vu plusieurs fois), il faut absolument setLoading(false)
    // sinon white screen of death : l'app reste bloquée sur le spinner et
    // l'utilisateur doit désinstaller-réinstaller. catch obligatoire.
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null;
      setUser(u);
      setSentryUser(u);
      if (u) {
        loadClientData(u);
        // Track last_seen_at (best-effort, ignore RLS errors si user pas en clients)
        if (u.email) {
          supabase.from("clients")
            .update({ last_seen_at: new Date().toISOString() })
            .eq("email", u.email)
            .then(() => {}, () => {});
        }
      }
      else setLoading(false);
    }, (e) => {
      console.error("getSession failed:", e);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      setSentryUser(u);
      if (event === "SIGNED_IN" && u) {
        setLoading(true);
        loadClientData(u);
        if (u.email) {
          supabase.from("clients")
            .update({ last_seen_at: new Date().toISOString() })
            .eq("email", u.email)
            .then(() => {}, () => {});
        }
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
        options: { emailRedirectTo: window.location.origin, shouldCreateUser: false },
      });
      if (error) throw error;
      setMagicSent(true);
    } catch (e) {
      // Email pas dans la base → afficher un message clair plutot que
      // l'erreur Supabase brute "Signups not allowed for otp".
      if (e.message === 'Signups not allowed for otp') {
        setError("Aucun compte trouve avec cet email. Contacte ton coach pour recevoir une invitation.");
      } else {
        setError(e.message || "Erreur lors de l'envoi du lien.");
      }
    } finally {
      setAuthLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  return { user, client, programme, programmeMeta, coachInfo, loading, authLoading, error, magicSent, sendMagicLink, signOut };
}

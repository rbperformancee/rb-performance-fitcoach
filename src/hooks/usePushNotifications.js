import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { isNative, isIOSNative } from '../lib/native';

// ──────────────────────────────────────────────────────────────────────────
// usePushNotifications — hook unifié push web (VAPID) + push natif (APNs)
//
// Le hook expose un contrat unique `{ permission, subscribed,
// requestPermission, resetSubscription }`. À l'intérieur, on branche selon
// `isNative()` :
//   - web      → flow Web Push (service worker + pushManager.subscribe +
//                row endpoint+subscription dans push_subscriptions)
//   - native   → flow Capacitor PushNotifications + APNs token →
//                row apns_token dans push_subscriptions
//
// Important : sur web on n'importe JAMAIS @capacitor/push-notifications
// (sinon le bundle alourdit la PWA pour rien). L'import est dynamique et
// gated par `isNative()`.
//
// Roadmap : APP_STORE_ROADMAP.md (Wave 5).
// ──────────────────────────────────────────────────────────────────────────

const VAPID_PUBLIC_KEY = process.env.REACT_APP_VAPID_PUBLIC_KEY;
if (!VAPID_PUBLIC_KEY && !isNative()) {
  // Sur natif on n'utilise pas VAPID, donc on ne loggue l'erreur QUE en web.
  console.error('REACT_APP_VAPID_PUBLIC_KEY missing in env vars');
}

function urlB64ToUint8Array(b) {
  const pad = '='.repeat((4 - b.length % 4) % 4);
  const base64 = (b + pad).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}
function arraysEqual(a, b) {
  if (!a || !b || a.byteLength !== b.byteLength) return false;
  const va = new Uint8Array(a), vb = new Uint8Array(b);
  for (let i = 0; i < va.length; i++) if (va[i] !== vb[i]) return false;
  return true;
}

// Cache module-level pour éviter d'attacher les listeners Capacitor 2x
// quand plusieurs composants utilisent le hook simultanément.
let _nativeListenersAttached = false;

// Permission native mappée vers les mêmes valeurs que `Notification.permission`
// pour que les consommers du hook n'aient pas à brancher.
function mapNativePerm(receive) {
  if (receive === 'granted') return 'granted';
  if (receive === 'denied') return 'denied';
  return 'default'; // 'prompt' | 'prompt-with-rationale'
}

// ──────────────────────────────────────────────────────────────────────────
// Hook unifié : prend EITHER un clientId OR un coachId. Persiste la sub
// dans push_subscriptions avec le bon champ (cf. CHECK constraint migration
// 048 : exactement un des deux est set).
//
// Sur natif, le coach n'est jamais consommer de ce hook (le coach reste
// web only) — on garde quand même la branche coachId pour symétrie.
// ──────────────────────────────────────────────────────────────────────────
export function usePushNotifications(arg) {
  // Rétrocompatibilité : si on passe une string, c'est un clientId.
  // Sinon objet { clientId } ou { coachId }.
  const clientId = typeof arg === 'string' ? arg : arg?.clientId || null;
  const coachId = typeof arg === 'object' && arg ? arg.coachId || null : null;

  const [permission, setPermission] = useState('default');
  const [subscribed, setSubscribed] = useState(false);

  // Ref pour stocker le token APNs reçu via event listener, pour qu'on
  // puisse le réutiliser dans resetSubscription sans relancer register().
  const apnsTokenRef = useRef(null);
  // Dernière erreur d'enregistrement / persist — exposée pour qu'un
  // toast UI puisse la montrer (sinon les échecs RLS / réseau étaient
  // silencieux et l'utilisateur ne savait jamais pourquoi rien ne marchait).
  const [lastError, setLastError] = useState(null);

  // Init : récupère l'état de permission au mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (isNative()) {
        try {
          const { PushNotifications } = await import('@capacitor/push-notifications');
          const status = await PushNotifications.checkPermissions();
          if (!cancelled) setPermission(mapNativePerm(status.receive));
        } catch (e) {
          // Plugin absent ou erreur — on dégrade silencieusement
          if (!cancelled) setPermission('default');
        }
      } else if (typeof Notification !== 'undefined') {
        setPermission(Notification.permission);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // ─── Subscribe : enregistre la sub et la persiste en DB ────────────────
  const subscribe = useCallback(async () => {
    try {
      if (!clientId && !coachId) return;

      if (isNative()) {
        // ─── BRANCHE NATIVE (APNs / FCM via Capacitor) ──────────────────
        const { PushNotifications } = await import('@capacitor/push-notifications');

        // Attache les listeners une seule fois pour toute la session.
        if (!_nativeListenersAttached) {
          _nativeListenersAttached = true;

          await PushNotifications.addListener('registration', async (token) => {
            // token.value = le token APNs (ou FCM sur Android). On le
            // persiste dans push_subscriptions.
            apnsTokenRef.current = token.value;
            try {
              await persistNativeToken({ token: token.value, clientId, coachId });
              setSubscribed(true);
              setLastError(null);

              // Purge des web push subs Apple PWA pour CE client : si
              // l'athlète avait installé la PWA iOS avant l'app native, la
              // sub Apple PWA est encore vivante côté DB → il recevrait
              // chaque notif en double. On les supprime côté DB.
              if (isIOSNative() && clientId) {
                await supabase
                  .from('push_subscriptions')
                  .delete()
                  .eq('client_id', clientId)
                  .like('endpoint', 'https://web.push.apple.com/%');
              }
            } catch (e) {
              console.error('[apns] persist failed:', e);
              setLastError(`persist_failed: ${e.message || e.code || 'unknown'}`);
            }
          });

          await PushNotifications.addListener('registrationError', (err) => {
            console.error('[apns] registration error:', err);
            setLastError(`registration_error: ${err?.error || err?.message || JSON.stringify(err)}`);
          });

          // pushNotificationReceived : notif arrive QUAND l'app est au
          // foreground. Apple ne l'affiche pas automatiquement dans ce cas
          // → on pourrait afficher un toast custom, mais pour la wave 5 on
          // se contente de logger.
          await PushNotifications.addListener('pushNotificationReceived', (notif) => {
            if (process.env.NODE_ENV !== 'production') {
              console.log('[apns] foreground notif:', notif);
            }
          });

          // pushNotificationActionPerformed : l'utilisateur a tapé une
          // notif (app était background ou closed). À enrichir Wave 6+
          // avec un deep link vers la séance / message du jour.
          await PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
            if (process.env.NODE_ENV !== 'production') {
              console.log('[apns] tap action:', action);
            }
          });
        }

        // Lance le register : déclenche l'event 'registration' avec le token.
        await PushNotifications.register();
        return;
      }

      // ─── BRANCHE WEB (Web Push / VAPID) — inchangée ─────────────────
      if (!VAPID_PUBLIC_KEY) return;
      const reg = await navigator.serviceWorker.ready;
      const expectedKey = urlB64ToUint8Array(VAPID_PUBLIC_KEY);
      let sub = await reg.pushManager.getSubscription();
      // Re-subscribe si la VAPID key a change (sinon push silent fail)
      if (sub) {
        const currentKey = sub.options?.applicationServerKey;
        if (!currentKey || !arraysEqual(currentKey, expectedKey)) {
          try { await sub.unsubscribe(); } catch {}
          sub = null;
        }
      }
      if (!sub) {
        sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: expectedKey });
      }
      const row = coachId
        ? { coach_id: coachId, client_id: null, endpoint: sub.endpoint, subscription: sub.toJSON() }
        : { client_id: clientId, coach_id: null, endpoint: sub.endpoint, subscription: sub.toJSON() };
      const onConflict = coachId ? 'coach_id,endpoint' : 'client_id,endpoint';
      const { error: upsertErr } = await supabase.from('push_subscriptions').upsert(row, { onConflict });
      if (upsertErr) {
        console.warn('[push] subscription upsert failed:', upsertErr.message);
      }
      setSubscribed(true);
    } catch(e) { console.error('Push:', e); }
  }, [clientId, coachId]);

  // ─── Request permission : prompt natif iOS ou prompt navigateur ───────
  const requestPermission = useCallback(async () => {
    if (isNative()) {
      try {
        const { PushNotifications } = await import('@capacitor/push-notifications');
        const status = await PushNotifications.requestPermissions();
        const mapped = mapNativePerm(status.receive);
        setPermission(mapped);
        if (mapped === 'granted') await subscribe();
        return mapped;
      } catch (e) {
        console.error('[apns] requestPermissions failed:', e);
        setPermission('denied');
        return 'denied';
      }
    }

    if (typeof window === 'undefined' || !('Notification' in window)) {
      setPermission('denied');
      return 'denied';
    }
    const perm = await Notification.requestPermission();
    setPermission(perm);
    if (perm === 'granted') await subscribe();
    return perm;
  }, [subscribe]);

  // ─── resetSubscription : force la régénération d'une sub neuve ────────
  // Use case : la sub a été silently invalidée par Apple Push Service.
  // L'utilisateur ne reçoit plus rien sans erreur côté serveur. Sur web on
  // unsubscribe + re-subscribe. Sur natif, on n'a pas accès à l'unregister
  // côté Capacitor PushNotifications — la rotation du token APNs est gérée
  // par iOS lui-même. On supprime juste la row DB et on re-register : iOS
  // renverra soit le même token (encore valide) soit un nouveau.
  const resetSubscription = useCallback(async () => {
    try {
      if (isNative()) {
        const oldToken = apnsTokenRef.current;
        if (oldToken && (clientId || coachId)) {
          await supabase
            .from('push_subscriptions')
            .delete()
            .eq('apns_token', oldToken);
        }
        apnsTokenRef.current = null;
        const { PushNotifications } = await import('@capacitor/push-notifications');
        await PushNotifications.register(); // re-trigger l'event 'registration'
        return { ok: true, oldEndpoint: oldToken };
      }

      // Web push reset — inchangé
      if (!('serviceWorker' in navigator) || !VAPID_PUBLIC_KEY) {
        return { ok: false, reason: 'unsupported' };
      }
      const reg = await navigator.serviceWorker.ready;
      const oldSub = await reg.pushManager.getSubscription();
      const oldEndpoint = oldSub?.endpoint;
      if (oldSub) {
        try { await oldSub.unsubscribe(); } catch {}
      }
      if (oldEndpoint) {
        await supabase.from('push_subscriptions').delete().eq('endpoint', oldEndpoint);
      }
      await subscribe();
      return { ok: true, oldEndpoint };
    } catch (e) {
      console.error('[push] resetSubscription failed:', e);
      return { ok: false, reason: e.message };
    }
  }, [subscribe, clientId, coachId]);

  // Auto-subscribe quand on a déjà la permission au mount (couvre le cas
  // où l'utilisateur a déjà accordé la permission lors d'une précédente
  // session).
  useEffect(() => {
    if (permission === 'granted' && (clientId || coachId)) subscribe();
  }, [clientId, coachId, permission, subscribe]);

  // Diagnostic : compte des subs natives (apns_token non-null) en DB pour
  // cet owner. Utilisé pour afficher "X device(s) enregistré(s)" dans Profil
  // et confirmer visuellement que la persist a fonctionné.
  const [deviceCount, setDeviceCount] = useState(null);
  const refreshDeviceCount = useCallback(async () => {
    if (!clientId && !coachId) return;
    const col = coachId ? 'coach_id' : 'client_id';
    const id = coachId || clientId;
    const { count } = await supabase
      .from('push_subscriptions')
      .select('id', { count: 'exact', head: true })
      .eq(col, id)
      .not('apns_token', 'is', null);
    setDeviceCount(typeof count === 'number' ? count : null);
  }, [clientId, coachId]);
  useEffect(() => { refreshDeviceCount(); }, [refreshDeviceCount, subscribed]);

  // Diagnostic : envoie une push de test à TOUS les devices natifs du user.
  // Permet à l'athlète de confirmer "j'ai bien reçu" sans attendre un cron.
  const sendTestPush = useCallback(async () => {
    if (!clientId && !coachId) return { ok: false, reason: 'no_owner' };
    const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
    const ANON = process.env.REACT_APP_SUPABASE_ANON_KEY;
    if (!SUPABASE_URL || !ANON) return { ok: false, reason: 'no_env' };
    try {
      // Appelle l'edge function send-push (web + native) avec la session JWT
      // du user — l'edge function décide qui peut envoyer à quel destinataire.
      const session = await supabase.auth.getSession();
      const jwt = session?.data?.session?.access_token;
      if (!jwt) return { ok: false, reason: 'no_session' };
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/send-push`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: ANON, Authorization: `Bearer ${jwt}` },
        body: JSON.stringify({
          client_id: clientId, coach_id: coachId,
          title: 'RB Perform',
          body: 'Test push reçu — tout fonctionne 🎉',
          url: '/',
        }),
      });
      const data = await resp.json().catch(() => ({}));
      return { ok: resp.ok, status: resp.status, ...data };
    } catch (e) {
      return { ok: false, reason: e.message };
    }
  }, [clientId, coachId]);

  return { permission, subscribed, requestPermission, resetSubscription, lastError, deviceCount, refreshDeviceCount, sendTestPush };
}

// ─── Helper : persiste le token APNs/FCM en DB ────────────────────────────
// On évite l'upsert PostgREST avec partial unique index (pas supporté
// proprement) → on fait un dedup manuel : si même token déjà présent, no-op.
// Sinon on remplace les autres tokens du même client (réinstallation app =
// nouveau token, l'ancien est dead).
async function persistNativeToken({ token, clientId, coachId }) {
  if (!token) throw new Error('empty_token');
  const owner = coachId ? { coach_id: coachId, col: 'coach_id' } : { client_id: clientId, col: 'client_id' };
  const ownerId = coachId || clientId;
  if (!ownerId) throw new Error('no_owner_id');

  // 1. Token identique déjà présent ? → idempotent
  const { data: existing } = await supabase
    .from('push_subscriptions')
    .select('id')
    .eq(owner.col, ownerId)
    .eq('apns_token', token)
    .maybeSingle();
  if (existing) return;

  // 2. Wipe les anciens tokens natifs pour ce même owner (un device = un token vivant)
  await supabase
    .from('push_subscriptions')
    .delete()
    .eq(owner.col, ownerId)
    .not('apns_token', 'is', null)
    .neq('apns_token', token);

  // 3. Insère la nouvelle row APNs (endpoint et subscription restent NULL)
  const row = coachId
    ? { coach_id: coachId, client_id: null, apns_token: token, endpoint: null, subscription: null }
    : { client_id: clientId, coach_id: null, apns_token: token, endpoint: null, subscription: null };
  const { error } = await supabase.from('push_subscriptions').insert(row);
  if (error) {
    // Re-throw pour que le caller puisse exposer l'erreur via lastError →
    // toast UI. Avant on swallow silencieusement et le user ne savait
    // jamais pourquoi il ne recevait rien (RLS / réseau / session expirée).
    console.error('[apns] insert failed:', error.message, error.code);
    throw new Error(`db_${error.code || 'insert'}: ${error.message}`);
  }
}

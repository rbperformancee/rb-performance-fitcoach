import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
const VAPID_PUBLIC_KEY = process.env.REACT_APP_VAPID_PUBLIC_KEY;
if (!VAPID_PUBLIC_KEY) console.error('REACT_APP_VAPID_PUBLIC_KEY missing in env vars');
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
// Hook unifié : prend EITHER un clientId OR un coachId. Persiste la sub
// dans push_subscriptions avec le bon champ (cf. CHECK constraint migration
// 048 : exactement un des deux est set).
export function usePushNotifications(arg) {
  // Rétrocompatibilité : si on passe une string, c'est un clientId.
  // Sinon objet { clientId } ou { coachId }.
  const clientId = typeof arg === 'string' ? arg : arg?.clientId || null;
  const coachId = typeof arg === 'object' && arg ? arg.coachId || null : null;
  const [permission, setPermission] = useState(typeof Notification !== 'undefined' ? Notification.permission : 'default');
  const [subscribed, setSubscribed] = useState(false);
  const subscribe = useCallback(async () => {
    try {
      if (!VAPID_PUBLIC_KEY) return;
      if (!clientId && !coachId) return;
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
  const requestPermission = useCallback(async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setPermission('denied');
      return 'denied';
    }
    const perm = await Notification.requestPermission();
    setPermission(perm);
    if (perm === 'granted') await subscribe();
    return perm;
  }, [subscribe]);
  // resetSubscription : force la régénération d'une sub neuve côté Apple/FCM.
  // Use case : la sub a été silently invalidée par Apple Push Service (cas
  // connu sur iOS où Apple accepte sent:1 mais ne délivre plus). L'utilisateur
  // ne reçoit plus rien sans erreur côté serveur. Un simple re-subscribe ne
  // suffit pas car getSubscription() retourne la vieille sub valide côté JS.
  // → On unsubscribe explicitement, on supprime la row côté DB, puis on
  //   refait subscribe() qui génère un endpoint neuf.
  const resetSubscription = useCallback(async () => {
    try {
      if (!('serviceWorker' in navigator) || !VAPID_PUBLIC_KEY) {
        return { ok: false, reason: 'unsupported' };
      }
      const reg = await navigator.serviceWorker.ready;
      const oldSub = await reg.pushManager.getSubscription();
      const oldEndpoint = oldSub?.endpoint;
      // 1) Unsubscribe côté SW
      if (oldSub) {
        try { await oldSub.unsubscribe(); } catch {}
      }
      // 2) Supprime la row côté DB (matching endpoint pour pas wiper d'autres devices)
      if (oldEndpoint) {
        await supabase.from('push_subscriptions').delete().eq('endpoint', oldEndpoint);
      }
      // 3) Re-subscribe (génère un endpoint neuf si Apple/FCM coopèrent)
      await subscribe();
      return { ok: true, oldEndpoint };
    } catch (e) {
      console.error('[push] resetSubscription failed:', e);
      return { ok: false, reason: e.message };
    }
  }, [subscribe]);
  useEffect(() => {
    if (permission === 'granted' && (clientId || coachId)) subscribe();
  }, [clientId, coachId, permission, subscribe]);
  return { permission, subscribed, requestPermission, resetSubscription };
}

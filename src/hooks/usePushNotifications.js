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
export function usePushNotifications(clientId) {
  const [permission, setPermission] = useState(typeof Notification !== 'undefined' ? Notification.permission : 'default');
  const [subscribed, setSubscribed] = useState(false);
  const subscribe = useCallback(async () => {
    try {
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
      // onConflict (client_id, endpoint) — multi-device support
      await supabase.from('push_subscriptions').upsert(
        { client_id: clientId, endpoint: sub.endpoint, subscription: sub.toJSON() },
        { onConflict: 'client_id,endpoint' }
      );
      setSubscribed(true);
    } catch(e) { console.error('Push:', e); }
  }, [clientId]);
  const requestPermission = useCallback(async () => {
    // iOS Safari (WebKit) n'expose pas toujours Notification — guard avant acces.
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setPermission('denied');
      return 'denied';
    }
    const perm = await Notification.requestPermission();
    setPermission(perm);
    if (perm === 'granted') await subscribe();
    return perm;
  }, [subscribe]);
  useEffect(() => { if (permission === 'granted' && clientId) subscribe(); }, [clientId, permission, subscribe]);
  return { permission, subscribed, requestPermission };
}

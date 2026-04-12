import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
const VAPID_PUBLIC_KEY = process.env.REACT_APP_VAPID_PUBLIC_KEY || 'BB6pE7PejIcg-c6yu-7WTKenzorzP6ygGUr59ab1lYTDftfHsM2Fp-xCfSvc1CWotq5PId1Y8gM6TUeuHcnJTAw';
function urlB64ToUint8Array(b) {
  const pad = '='.repeat((4 - b.length % 4) % 4);
  const base64 = (b + pad).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}
export function usePushNotifications(clientId) {
  const [permission, setPermission] = useState(typeof Notification !== 'undefined' ? Notification.permission : 'default');
  const [subscribed, setSubscribed] = useState(false);
  const subscribe = useCallback(async () => {
    try {
      const reg = await navigator.serviceWorker.ready;
      const existing = await reg.pushManager.getSubscription();
      const sub = existing || await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlB64ToUint8Array(VAPID_PUBLIC_KEY) });
      await supabase.from('push_subscriptions').upsert({ client_id: clientId, subscription: sub.toJSON() }, { onConflict: 'client_id' });
      setSubscribed(true);
    } catch(e) { console.error('Push:', e); }
  }, [clientId]);
  const requestPermission = useCallback(async () => {
    const perm = await Notification.requestPermission();
    setPermission(perm);
    if (perm === 'granted') await subscribe();
    return perm;
  }, [subscribe]);
  useEffect(() => { if (permission === 'granted' && clientId) subscribe(); }, [clientId, permission, subscribe]);
  return { permission, subscribed, requestPermission };
}

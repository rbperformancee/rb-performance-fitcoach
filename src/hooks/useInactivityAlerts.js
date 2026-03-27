import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export function useInactivityAlerts(clients, isCoach) {
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    if (!isCoach || !clients?.length) return;
    
    const inactive = clients.filter(c => c._inactive && c._inactiveDays >= 3);
    setAlerts(inactive);

    // Envoyer notif push aux clients inactifs (max 1x par jour)
    const sendAlerts = async () => {
      for (const client of inactive) {
        const lastKey = `alert_sent_${client.id}`;
        const lastSent = localStorage.getItem(lastKey);
        const today = new Date().toISOString().split('T')[0];
        if (lastSent === today) continue;

        const { data: subs } = await supabase
          .from('push_subscriptions')
          .select('*')
          .eq('client_id', client.id);

        if (subs?.length > 0) {
          const firstName = client.full_name?.split(' ')[0] || '';
          await fetch(`${process.env.REACT_APP_SUPABASE_URL}/functions/v1/send-push`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': process.env.REACT_APP_SUPABASE_ANON_KEY,
            },
            body: JSON.stringify({
              client_id: client.id,
              title: 'RB PERFORM 💪',
              body: `${firstName}, ça fait ${client._inactiveDays} jours ! Ton programme t'attend.`,
            }),
          });
          localStorage.setItem(lastKey, today);
        }
      }
    };

    sendAlerts();
  }, [clients, isCoach]);

  return alerts;
}

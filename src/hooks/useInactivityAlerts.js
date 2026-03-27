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
          await fetch('https://pwkajyrpldhlybavmopd.supabase.co/functions/v1/send-push', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB3a2FqeXJwbGRobHliYXZtb3BkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA1ODY3ODAsImV4cCI6MjA1NjE2Mjc4MH0.LpNQcBpMJz7iFXGi6sVy6kYpHJhJMVgFJkGZjUoE8Q8',
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

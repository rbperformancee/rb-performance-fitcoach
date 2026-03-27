import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export function useStreak(clientId) {
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);

  useEffect(() => {
    if (!clientId) return;
    const fetchStreak = async () => {
      const { data } = await supabase
        .from('session_logs')
        .select('logged_at')
        .eq('client_id', clientId)
        .order('logged_at', { ascending: false })
        .limit(60);
      
      if (!data || data.length === 0) return;
      
      const dates = [...new Set(data.map(d => d.logged_at?.split('T')[0]))].sort().reverse();
      let current = 0;
      let best = 0;
      let temp = 1;
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      
      if (dates[0] === today || dates[0] === yesterday) {
        current = 1;
        for (let i = 1; i < dates.length; i++) {
          const diff = (new Date(dates[i-1]) - new Date(dates[i])) / 86400000;
          if (diff === 1) { current++; temp++; }
          else { best = Math.max(best, temp); temp = 1; }
        }
      }
      best = Math.max(best, temp, current);
      setStreak(current);
      setBestStreak(best);
    };
    fetchStreak();
  }, [clientId]);

  return { streak, bestStreak };
}

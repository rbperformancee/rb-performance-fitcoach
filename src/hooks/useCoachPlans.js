import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export function useCoachPlans(coachId) {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const reload = useCallback(async () => {
    if (!coachId) return;
    setLoading(true);
    const { data, error: err } = await supabase
      .from('coach_plans')
      .select('*')
      .eq('coach_id', coachId)
      .eq('is_active', true)
      .order('display_order', { ascending: true });
    setPlans(data || []);
    setError(err);
    setLoading(false);
  }, [coachId]);

  useEffect(() => { reload(); }, [reload]);

  return { plans, loading, error, reload };
}

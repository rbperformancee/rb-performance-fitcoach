import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export function useWeightTracking(clientId) {
  const [weights, setWeights] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchWeights = useCallback(async () => {
    if (!clientId) return;
    setLoading(true);
    const { data } = await supabase
      .from('weight_logs')
      .select('weight, date, note, fat_pct')
      .eq('client_id', clientId)
      .order('date', { ascending: true })
      .limit(30);
    setWeights(data || []);
    setLoading(false);
  }, [clientId]);

  const addWeight = useCallback(async (weight, note = '') => {
    if (!clientId) return;
    const today = new Date();
    const date = today.getFullYear() + '-' + String(today.getMonth()+1).padStart(2,'0') + '-' + String(today.getDate()).padStart(2,'0');
    const { error } = await supabase.from('weight_logs').upsert({
      client_id: clientId,
      weight: parseFloat(weight),
      note,
      date,
    }, { onConflict: 'client_id,date' });
    if (error) { console.error('Weight error:', error.message); return { error }; }
    fetchWeights();
    return { success: true };
  }, [clientId, fetchWeights]);

  const saveGoal = async (goal) => {
    if (!clientId) return;
    const { error } = await supabase.from('clients').update({ weight_goal: parseFloat(goal) }).eq('id', clientId);
    if (error) console.error('saveGoal error:', error.message);
    return { error };
  };

  useEffect(() => { fetchWeights(); }, [fetchWeights]);

  const latest = weights[weights.length - 1];
  const first = weights[0];
  const diff = latest && first ? (latest.weight - first.weight).toFixed(1) : null;

  const deleteWeight = useCallback(async (date) => {
    if (!clientId) return;
    await supabase.from('weight_logs').delete().eq('client_id', clientId).eq('date', date);
    fetchWeights();
  }, [clientId, fetchWeights]);

  return { weights, loading, addWeight, deleteWeight, latest, diff, saveGoal };
}

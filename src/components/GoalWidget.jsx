import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import AppIcon from './AppIcon';
import haptic from '../lib/haptic';

const GOALS = [
  { key: 'weight_target', label: 'Objectif poids', icon: 'scale', unit: 'kg', color: '#02d1ba' },
  { key: 'sessions_week', label: 'Séances/semaine', icon: 'dumbbell', unit: 'séances', color: '#a78bfa' },
  { key: 'steps_day', label: 'Pas/jour', icon: 'shoe', unit: 'pas', color: '#fb923c' },
];
export default function GoalWidget({ clientId }) {
  const [goals, setGoals] = useState({});
  const [editing, setEditing] = useState(null);
  const [val, setVal] = useState('');
  const load = useCallback(async () => {
    if (!clientId) return;
    const { data } = await supabase.from('client_goals').select('*').eq('client_id', clientId);
    const map = {}; (data||[]).forEach(g => map[g.goal_type] = g); setGoals(map);
  }, [clientId]);
  useEffect(() => { load(); }, [load]);
  const save = async (key) => {
    if (!val) return;
    await supabase.from('client_goals').upsert({ client_id: clientId, goal_type: key, target_value: parseFloat(val), updated_at: new Date().toISOString() }, { onConflict: 'client_id,goal_type' });
    setEditing(null); setVal('');
    haptic.success();
    load();
  };
  return (
    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '14px 16px', marginBottom: 16 }}>
      <div style={{ fontSize: 10, color: '#6b7280', fontWeight: 700, letterSpacing: 1.5, marginBottom: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <AppIcon name="target" size={12} color="#6b7280" />
        OBJECTIFS
      </div>
      {GOALS.map(g => {
        const goal = goals[g.key]; const isEdit = editing === g.key;
        return (
          <div key={g.key} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12, marginBottom: 8 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: `${g.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <AppIcon name={g.icon} size={18} color={g.color} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, color: '#6b7280', fontWeight: 700 }}>{g.label.toUpperCase()}</div>
              {isEdit ? (
                <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                  <input autoFocus type="number" inputMode="decimal" value={val} maxLength={8} onChange={e => setVal(e.target.value)} onKeyDown={e => { if (e.key==='Enter') save(g.key); if (e.key==='Escape') setEditing(null); }} style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(2,209,186,0.4)', borderRadius: 8, padding: '8px 10px', color: '#f5f5f5', fontSize: 16 }} />
                  <button aria-label="Valider" onClick={() => save(g.key)} style={{ background: g.color, color: '#0d0d0d', border: 'none', borderRadius: 8, padding: '6px 14px', fontWeight: 900, cursor: 'pointer', minHeight: 36, minWidth: 44, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                    <AppIcon name="check" size={16} color="#0d0d0d" strokeWidth={2.5} />
                  </button>
                </div>
              ) : <div style={{ fontSize: 20, fontWeight: 900, color: goal ? '#f5f5f5' : '#374151' }}>{goal ? Number(goal.target_value).toLocaleString('fr-FR') + ' ' + g.unit : '—'}</div>}
            </div>
            {!isEdit && (
              <button onClick={() => { haptic.light(); setEditing(g.key); setVal(goal?.target_value||''); }} aria-label={goal ? 'Modifier' : 'Definir objectif'} style={{ background: g.color+'20', border: '1px solid '+g.color+'40', borderRadius: 10, padding: '8px 12px', color: g.color, fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5, minHeight: 36 }}>
                {goal ? <AppIcon name="edit" size={12} color={g.color} /> : <><AppIcon name="plus" size={12} color={g.color} />Definir</>}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

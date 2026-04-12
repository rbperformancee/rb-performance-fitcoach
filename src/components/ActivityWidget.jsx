import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from './Toast';

const METRICS = [
  { key: 'steps',    label: 'Pas',      icon: '👟', unit: '',    color: '#02d1ba', target: 10000, hint: 'Ouvre Santé → Activité → Pas' },
  { key: 'calories', label: 'Calories', icon: '🔥', unit: 'kcal', color: '#fb923c', target: 2500,  hint: 'Ouvre Santé → Activité → Calories actives' },
  { key: 'sleep',    label: 'Sommeil',  icon: '🌙', unit: 'h',   color: '#a78bfa', target: 8,     hint: 'Ouvre Santé → Sommeil' },
];

function RingProgress({ value, target, color, size = 56 }) {
  const pct = Math.min(value / target, 1);
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct);
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={6} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={6}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.34,1.56,0.64,1)' }} />
    </svg>
  );
}

export default function ActivityWidget({ clientId }) {
  const [today, setToday] = useState({});
  const [editing, setEditing] = useState(null);
  const [inputVal, setInputVal] = useState('');
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState([]);

  const todayStr = new Date().toISOString().split('T')[0];

  const fetchData = useCallback(async () => {
    if (!clientId) return;
    const { data } = await supabase
      .from('activity_logs')
      .select('*')
      .eq('client_id', clientId)
      .gte('logged_at', new Date(Date.now() - 7 * 86400000).toISOString())
      .order('logged_at', { ascending: false });
    if (!data) return;
    const todayData = {};
    const hist = {};
    data.forEach(row => {
      const d = row.logged_at?.split('T')[0];
      if (d === todayStr) todayData[row.metric] = row.value;
      if (!hist[row.metric]) hist[row.metric] = [];
      if (hist[row.metric].length < 7) hist[row.metric].push(row.value);
    });
    setToday(todayData);
    setHistory(hist);
  }, [clientId, todayStr]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openHealthApp = (hint) => {
    window.open('x-apple-health://', '_blank');
    setTimeout(() => toast.info(hint), 500);
  };

  const saveMetric = async (key) => {
    if (!inputVal || isNaN(parseFloat(inputVal))) return;
    setSaving(true);
    await supabase.from('activity_logs').upsert({
      client_id: clientId,
      metric: key,
      value: parseFloat(inputVal),
      logged_at: new Date().toISOString().split('T')[0] + 'T12:00:00Z',
    }, { onConflict: 'client_id,metric,logged_at' });
    setInputVal('');
    setEditing(null);
    setSaving(false);
    if (navigator.vibrate) navigator.vibrate([20, 10, 40]);
    fetchData();
  };

  // Mini sparkline SVG
  const Sparkline = ({ data, color }) => {
    if (!data || data.length < 2) return null;
    const W = 60, H = 20;
    const min = Math.min(...data), max = Math.max(...data);
    const range = max - min || 1;
    const pts = data.slice().reverse().map((v, i) =>
      `${(i / (data.length - 1)) * W},${H - ((v - min) / range) * (H - 4) - 2}`
    ).join(' ');
    return (
      <svg width={W} height={H}>
        <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.7" />
      </svg>
    );
  };

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ fontSize: 10, color: '#6b7280', fontWeight: 700, letterSpacing: 1.5 }}>⚡ ACTIVITÉ DU JOUR</div>
        <button
          onClick={() => window.open('x-apple-health://', '_blank')}
          style={{
            background: 'rgba(255,45,85,0.1)', border: '1px solid rgba(255,45,85,0.2)',
            borderRadius: 8, padding: '5px 10px', color: '#ff2d55',
            fontSize: 10, fontWeight: 700, cursor: 'pointer', letterSpacing: 0.5,
            display: 'flex', alignItems: 'center', gap: 5,
          }}>
          ❤️ Ouvrir Santé
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {METRICS.map((m, idx) => {
          const val = today[m.key];
          const pct = val ? Math.min(val / m.target, 1) : 0;
          const isEditing = editing === m.key;

          return (
            <div key={m.key} style={{
              background: 'rgba(255,255,255,0.03)',
              border: `1px solid ${isEditing ? m.color + '40' : 'rgba(255,255,255,0.06)'}`,
              borderRadius: 16, padding: '14px 16px',
              transition: 'border-color 0.2s',
              animation: `fadeInUp 0.4s ease ${idx * 0.08}s both`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {/* Ring progress */}
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <RingProgress value={val || 0} target={m.target} color={m.color} size={52} />
                  <div style={{
                    position: 'absolute', inset: 0, display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    fontSize: 18,
                  }}>{m.icon}</div>
                </div>

                {/* Infos */}
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontSize: 10, color: '#6b7280', fontWeight: 700, letterSpacing: 1, marginBottom: 2 }}>{m.label.toUpperCase()}</div>
                      <div style={{ fontSize: 22, fontWeight: 900, color: val ? '#f5f5f5' : '#374151', lineHeight: 1 }}>
                        {val ? val.toLocaleString('fr-FR') : '--'}
                        <span style={{ fontSize: 11, color: '#6b7280', fontWeight: 500, marginLeft: 4 }}>{m.unit}</span>
                      </div>
                      <div style={{ fontSize: 10, color: m.color, marginTop: 2, fontWeight: 600 }}>
                        {val ? `${Math.round(pct * 100)}% de l'objectif` : `Objectif: ${m.target.toLocaleString('fr-FR')} ${m.unit}`}
                      </div>
                    </div>
                    <Sparkline data={history[m.key]} color={m.color} />
                  </div>

                  {/* Barre de progression */}
                  <div style={{ height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 2, marginTop: 8, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', width: `${pct * 100}%`,
                      background: m.color, borderRadius: 2,
                      transition: 'width 0.8s cubic-bezier(0.34,1.56,0.64,1)',
                      boxShadow: `0 0 8px ${m.color}60`,
                    }} />
                  </div>
                </div>
              </div>

              {/* Input ou boutons */}
              {isEditing ? (
                <div style={{ display: 'flex', gap: 8, marginTop: 12, animation: 'fadeInUp 0.2s ease' }}>
                  <input
                    autoFocus
                    type="number"
                    placeholder={`Ex: ${m.key === 'steps' ? '8500' : m.key === 'calories' ? '2200' : '7.5'}`}
                    value={inputVal}
                    onChange={e => setInputVal(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') saveMetric(m.key); if (e.key === 'Escape') setEditing(null); }}
                    style={{
                      flex: 1, background: 'rgba(255,255,255,0.05)',
                      border: `1px solid ${m.color}60`, borderRadius: 10,
                      padding: '10px 14px', color: '#f5f5f5', fontSize: 16,
                      outline: 'none',
                    }}
                  />
                  <button onClick={() => saveMetric(m.key)} disabled={saving} style={{
                    background: m.color, color: '#0d0d0d',
                    border: 'none', borderRadius: 10, padding: '10px 16px',
                    fontWeight: 900, cursor: 'pointer', fontSize: 16,
                  }}>{saving ? '...' : '✓'}</button>
                  <button onClick={() => setEditing(null)} style={{
                    background: 'rgba(255,255,255,0.05)', border: 'none',
                    borderRadius: 10, padding: '10px 12px',
                    color: '#6b7280', cursor: 'pointer', fontSize: 16,
                  }}>✕</button>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  <button
                    onClick={() => openHealthApp(m.hint)}
                    style={{
                      flex: 1, background: 'rgba(255,45,85,0.08)',
                      border: '1px solid rgba(255,45,85,0.15)',
                      borderRadius: 10, padding: '8px', color: '#ff2d55',
                      fontSize: 11, fontWeight: 700, cursor: 'pointer',
                    }}>❤️ Voir dans Santé</button>
                  <button
                    onClick={() => { setEditing(m.key); setInputVal(''); }}
                    style={{
                      flex: 1, background: `${m.color}15`,
                      border: `1px solid ${m.color}30`,
                      borderRadius: 10, padding: '8px', color: m.color,
                      fontSize: 11, fontWeight: 700, cursor: 'pointer',
                    }}>+ Saisir</button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

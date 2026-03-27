import React, { useState } from 'react';
import { useWeightTracking } from '../hooks/useWeightTracking';

export default function WeightChart({ clientId }) {
  const { weights, addWeight, latest, diff } = useWeightTracking(clientId);
  const [showInput, setShowInput] = useState(false);
  const [newWeight, setNewWeight] = useState('');
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    if (!newWeight || isNaN(parseFloat(newWeight))) return;
    setSaving(true);
    await addWeight(newWeight);
    setNewWeight('');
    setShowInput(false);
    setSaving(false);
    if (navigator.vibrate) navigator.vibrate([20, 10, 40]);
  };

  // Calcul du graphique SVG
  const W = 320, H = 100, pad = 12;
  const vals = weights.map(w => w.weight);
  const minV = Math.min(...vals) - 1;
  const maxV = Math.max(...vals) + 1;
  const toX = (i) => pad + (i / Math.max(vals.length - 1, 1)) * (W - pad * 2);
  const toY = (v) => H - pad - ((v - minV) / (maxV - minV)) * (H - pad * 2);
  
  const points = vals.map((v, i) => `${toX(i)},${toY(v)}`).join(' ');
  const area = vals.length > 1 ? 
    `M${toX(0)},${H - pad} ` + vals.map((v, i) => `L${toX(i)},${toY(v)}`).join(' ') + ` L${toX(vals.length-1)},${H - pad} Z` : '';

  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: 16, padding: '16px',
      marginBottom: 16,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, letterSpacing: 1, marginBottom: 2 }}>POIDS</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontSize: 24, fontWeight: 900, color: '#f5f5f5' }}>
              {latest?.weight ?? '--'} <span style={{ fontSize: 13, color: '#6b7280' }}>kg</span>
            </span>
            {diff !== null && (
              <span style={{ fontSize: 12, fontWeight: 700, color: parseFloat(diff) < 0 ? '#02d1ba' : '#ff6b6b' }}>
                {parseFloat(diff) > 0 ? '+' : ''}{diff} kg
              </span>
            )}
          </div>
        </div>
        <button onClick={() => setShowInput(!showInput)} style={{
          background: 'rgba(2,209,186,0.12)',
          border: '1px solid rgba(2,209,186,0.25)',
          borderRadius: 10, padding: '8px 14px',
          color: '#02d1ba', cursor: 'pointer', fontSize: 13, fontWeight: 700,
        }}>+ Ajouter</button>
      </div>

      {showInput && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, animation: 'fadeInUp 0.3s ease' }}>
          <input
            type="number" step="0.1" placeholder="Ex: 75.5"
            value={newWeight}
            onChange={e => setNewWeight(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            style={{
              flex: 1, background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(2,209,186,0.3)',
              borderRadius: 10, padding: '10px 14px',
              color: '#f5f5f5', fontSize: 15,
            }}
          />
          <button onClick={handleAdd} disabled={saving} style={{
            background: '#02d1ba', color: '#0d0d0d',
            border: 'none', borderRadius: 10, padding: '10px 18px',
            fontWeight: 800, cursor: 'pointer', fontSize: 14,
          }}>{saving ? '...' : '✓'}</button>
        </div>
      )}

      {vals.length > 1 ? (
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 80 }}>
          <defs>
            <linearGradient id="wgrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#02d1ba" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#02d1ba" stopOpacity="0" />
            </linearGradient>
          </defs>
          {area && <path d={area} fill="url(#wgrad)" />}
          <polyline points={points} fill="none" stroke="#02d1ba" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          {vals.map((v, i) => (
            <circle key={i} cx={toX(i)} cy={toY(v)} r={i === vals.length - 1 ? 4 : 2.5}
              fill={i === vals.length - 1 ? '#02d1ba' : '#0d0d0d'}
              stroke="#02d1ba" strokeWidth="1.5" />
          ))}
        </svg>
      ) : (
        <div style={{ textAlign: 'center', padding: '16px 0', color: '#4b5563', fontSize: 12 }}>
          Ajoute ton premier poids pour voir l'évolution 📈
        </div>
      )}
    </div>
  );
}

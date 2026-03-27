import React from 'react';
import AvatarPicker from './AvatarPicker';
import { BadgeSystem } from './BadgeSystem';
import { useStreak } from '../hooks/useStreak';
import { useWeightTracking } from '../hooks/useWeightTracking';

export default function ProfilePage({ client }) {
  const { streak, bestStreak } = useStreak(client?.id);
  const { latest, diff } = useWeightTracking(client?.id);
  const name = client?.full_name || client?.email?.split('@')[0] || 'Athlète';
  const firstName = name.split(' ')[0];

  return (
    <div style={{ padding: '16px', animation: 'fadeInUp 0.3s ease' }}>
      {/* Header profil */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24, padding: '20px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20 }}>
        <AvatarPicker clientId={client?.id} name={name} size={72} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#f5f5f5', letterSpacing: '-0.5px' }}>{firstName}</div>
          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{client?.email}</div>
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <div style={{ background: 'rgba(255,140,0,0.12)', border: '1px solid rgba(255,140,0,0.25)', borderRadius: 8, padding: '4px 10px', fontSize: 11, color: '#ff8c00', fontWeight: 700 }}>
              🔥 {streak} jours
            </div>
            {latest && <div style={{ background: 'rgba(2,209,186,0.1)', border: '1px solid rgba(2,209,186,0.2)', borderRadius: 8, padding: '4px 10px', fontSize: 11, color: '#02d1ba', fontWeight: 700 }}>
              ⚖️ {latest.weight} kg
            </div>}
          </div>
        </div>
      </div>

      {/* Stats rapides */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        {[
          { label: 'STREAK', value: streak, unit: 'j', icon: '🔥', color: '#ff8c00' },
          { label: 'RECORD', value: bestStreak, unit: 'j', icon: '🏆', color: '#fbbf24' },
          { label: 'POIDS', value: latest?.weight || '--', unit: 'kg', icon: '⚖️', color: '#02d1ba' },
        ].map((s, i) => (
          <div key={i} style={{ flex: 1, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '12px 10px', textAlign: 'center', animation: `fadeInUp 0.35s ease ${i * 0.07}s both` }}>
            <div style={{ fontSize: 20 }}>{s.icon}</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: s.color, lineHeight: 1.2 }}>{s.value}<span style={{ fontSize: 10, color: '#6b7280' }}>{s.unit}</span></div>
            <div style={{ fontSize: 9, color: '#6b7280', fontWeight: 700, letterSpacing: 1 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Badges */}
      <BadgeSystem clientId={client?.id} />
    </div>
  );
}

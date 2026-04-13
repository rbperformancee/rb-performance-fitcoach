import React from 'react';
import AppIcon from './AppIcon';

export default function StreakBadge({ streak, bestStreak }) {
  if (!streak && !bestStreak) return null;

  const streakIcon = streak > 5 ? 'flame' : streak > 2 ? 'lightning' : 'dumbbell';
  const streakColor = streak > 0 ? '#ff8c00' : '#6b7280';

  return (
    <div style={{
      display: 'flex', gap: 10, alignItems: 'center',
      marginBottom: 16,
    }}>
      <div style={{
        background: streak > 0 ? 'rgba(255,140,0,0.12)' : 'rgba(255,255,255,0.05)',
        border: `1px solid ${streak > 0 ? 'rgba(255,140,0,0.3)' : 'rgba(255,255,255,0.08)'}`,
        borderRadius: 12, padding: '8px 14px',
        display: 'flex', alignItems: 'center', gap: 9,
        animation: streak > 2 ? 'fadeInUp 0.4s ease forwards' : 'none',
      }}>
        <AppIcon name={streakIcon} size={18} color={streakColor} />
        <div>
          <div style={{ fontSize: 18, fontWeight: 900, color: streakColor, lineHeight: 1 }}>
            {streak}
          </div>
          <div style={{ fontSize: 9, color: '#6b7280', fontWeight: 600, letterSpacing: 1 }}>STREAK</div>
        </div>
      </div>
      {bestStreak > 0 && (
        <div style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 12, padding: '8px 14px',
          display: 'flex', alignItems: 'center', gap: 9,
        }}>
          <AppIcon name="trophy" size={16} color="#fbbf24" />
          <div>
            <div style={{ fontSize: 18, fontWeight: 900, color: '#f5f5f5', lineHeight: 1 }}>{bestStreak}</div>
            <div style={{ fontSize: 9, color: '#6b7280', fontWeight: 600, letterSpacing: 1 }}>RECORD</div>
          </div>
        </div>
      )}
    </div>
  );
}

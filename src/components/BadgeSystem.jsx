import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

const BADGES = [
  { id: 'first_session', icon: '⚡', label: 'Premier pas', desc: '1ère séance validée', condition: (s) => s >= 1, color: '#02d1ba' },
  { id: 'five_sessions', icon: '🔥', label: 'En feu', desc: '5 séances complétées', condition: (s) => s >= 5, color: '#fb923c' },
  { id: 'ten_sessions', icon: '💪', label: 'Warrior', desc: '10 séances complétées', condition: (s) => s >= 10, color: '#a78bfa' },
  { id: 'twenty_sessions', icon: '🏆', label: 'Champion', desc: '20 séances complétées', condition: (s) => s >= 20, color: '#fbbf24' },
  { id: 'streak_7', icon: '🗓️', label: 'Semaine parfaite', desc: '7 jours de streak', condition: (s, streak) => streak >= 7, color: '#34d399' },
  { id: 'streak_30', icon: '👑', label: 'Légende', desc: '30 jours de streak', condition: (s, streak) => streak >= 30, color: '#f59e0b' },
  { id: 'weight_logged', icon: '⚖️', label: 'Suivi poids', desc: 'Premier poids enregistré', condition: (s, streak, w) => w >= 1, color: '#60a5fa' },
  { id: 'goal_set', icon: '🎯', label: 'Objectif fixé', desc: 'Premier objectif défini', condition: (s, streak, w, g) => g >= 1, color: '#f472b6' },
];

export function BadgeSystem({ clientId, compact = false }) {
  const [earned, setEarned] = useState([]);
  const [stats, setStats] = useState({ sessions: 0, streak: 0, weights: 0, goals: 0 });
  const [newBadge, setNewBadge] = useState(null);

  const fetchStats = useCallback(async () => {
    if (!clientId) return;
    const [s, w, g] = await Promise.all([
      supabase.from('session_logs').select('id', { count: 'exact', head: true }).eq('client_id', clientId),
      supabase.from('weight_logs').select('id', { count: 'exact', head: true }).eq('client_id', clientId),
      supabase.from('client_goals').select('id', { count: 'exact', head: true }).eq('client_id', clientId),
    ]);
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
    const { count: recentCount } = await supabase.from('session_logs').select('id', { count: 'exact', head: true }).eq('client_id', clientId).gte('logged_at', weekAgo);
    const streak = recentCount || 0;
    const newStats = { sessions: s.count || 0, streak, weights: w.count || 0, goals: g.count || 0 };
    setStats(newStats);
    const earnedBadges = BADGES.filter(b => b.condition(newStats.sessions, newStats.streak, newStats.weights, newStats.goals));
    const prevEarned = earned.map(e => e.id);
    const justEarned = earnedBadges.filter(b => !prevEarned.includes(b.id));
    if (justEarned.length > 0 && earned.length > 0) {
      setNewBadge(justEarned[0]);
      setTimeout(() => setNewBadge(null), 3000);
      if (navigator.vibrate) navigator.vibrate([50, 30, 50, 30, 100]);
    }
    setEarned(earnedBadges);
  }, [clientId, earned]);

  useEffect(() => { fetchStats(); }, [clientId]);

  if (compact) {
    return (
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
        {BADGES.map(b => {
          const has = earned.find(e => e.id === b.id);
          return (
            <div key={b.id} title={b.label} style={{
              width: 36, height: 36, borderRadius: 10,
              background: has ? `${b.color}15` : 'rgba(255,255,255,0.03)',
              border: `1px solid ${has ? b.color + '40' : 'rgba(255,255,255,0.06)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, opacity: has ? 1 : 0.3,
              transition: 'all 0.3s',
              animation: has ? 'bounceIn 0.4s ease' : 'none',
            }}>{b.icon}</div>
          );
        })}
      </div>
    );
  }

  return (
    <div style={{ marginBottom: 16 }}>
      {newBadge && (
        <div style={{
          position: 'fixed', top: 80, left: '50%', transform: 'translateX(-50%)',
          background: '#111', border: `1px solid ${newBadge.color}`,
          borderRadius: 16, padding: '12px 20px', zIndex: 9999,
          display: 'flex', alignItems: 'center', gap: 12,
          boxShadow: `0 8px 32px ${newBadge.color}40`,
          animation: 'badgePopup 0.5s cubic-bezier(0.34,1.56,0.64,1)',
        }}>
          <span style={{ fontSize: 28 }}>{newBadge.icon}</span>
          <div>
            <div style={{ fontSize: 11, color: newBadge.color, fontWeight: 700, letterSpacing: 1 }}>BADGE DÉBLOQUÉ !</div>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#f5f5f5' }}>{newBadge.label}</div>
          </div>
        </div>
      )}
      <div style={{ fontSize: 10, color: '#6b7280', fontWeight: 700, letterSpacing: 1.5, marginBottom: 12 }}>🏅 BADGES</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
        {BADGES.map((b, i) => {
          const has = earned.find(e => e.id === b.id);
          return (
            <div key={b.id} style={{
              background: has ? `${b.color}10` : 'rgba(255,255,255,0.02)',
              border: `1px solid ${has ? b.color + '30' : 'rgba(255,255,255,0.05)'}`,
              borderRadius: 14, padding: '12px 8px', textAlign: 'center',
              opacity: has ? 1 : 0.4, transition: 'all 0.3s',
              animation: has ? `bounceIn 0.4s ease ${i * 0.05}s both` : 'none',
            }}>
              <div style={{ fontSize: 24, marginBottom: 4 }}>{b.icon}</div>
              <div style={{ fontSize: 9, fontWeight: 700, color: has ? '#f5f5f5' : '#6b7280', lineHeight: 1.3 }}>{b.label}</div>
              <div style={{ fontSize: 8, color: '#4b5563', marginTop: 2, lineHeight: 1.3 }}>{b.desc}</div>
            </div>
          );
        })}
      </div>
      <style>{'@keyframes badgePopup { from { opacity:0; transform:translateX(-50%) translateY(-20px) scale(0.8); } to { opacity:1; transform:translateX(-50%) translateY(0) scale(1); } }'}</style>
    </div>
  );
}

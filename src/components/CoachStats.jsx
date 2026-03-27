import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function CoachStats({ clients }) {
  const [weeklyLogs, setWeeklyLogs] = useState([]);
  const [msgCount, setMsgCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const since = new Date(Date.now() - 30 * 86400000).toISOString();
      const { data: logs } = await supabase.from('session_logs').select('logged_at,client_id').gte('logged_at', since).order('logged_at', { ascending: true });
      const { count } = await supabase.from('messages').select('*', { count: 'exact', head: true }).gte('created_at', since);
      setWeeklyLogs(logs || []);
      setMsgCount(count || 0);
      setLoading(false);
    };
    fetch();
  }, [clients]);

  const total = clients?.length || 0;
  const active = clients?.filter(c => !c._inactive)?.length || 0;
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(Date.now() - (6 - i) * 86400000).toISOString().split('T')[0];
    return weeklyLogs.filter(l => l.logged_at?.startsWith(d)).length;
  });
  const total7j = last7.reduce((a, b) => a + b, 0);
  const maxBar = Math.max(...last7, 1);
  const days = ['L','M','M','J','V','S','D'];

  if (loading) return <div style={{ color: '#6b7280', fontSize: 12, padding: '8px 0' }}>Chargement stats...</div>;

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 10, color: '#6b7280', fontWeight: 700, letterSpacing: 1.5, marginBottom: 12 }}>📊 VUE D'ENSEMBLE</div>
      
      {/* Cartes stats */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        {[
          { label: 'CLIENTS ACTIFS', value: active, sub: `${total - active} inactifs`, icon: '👥', color: '#02d1ba' },
          { label: 'SÉANCES 7J', value: total7j, sub: `${(total7j/7).toFixed(1)}/jour`, icon: '💪', color: '#a78bfa' },
          { label: 'MESSAGES 30J', value: msgCount, sub: 'échanges', icon: '💬', color: '#fb923c' },
          { label: 'TAUX ACTIVITÉ', value: `${total > 0 ? Math.round((active/total)*100) : 0}%`, sub: 'ce mois', icon: '📈', color: '#34d399' },
        ].map((s, i) => (
          <div key={i} style={{
            flex: '1 1 120px', background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '12px 14px',
            animation: `fadeInUp 0.4s ease ${i * 0.07}s both`,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <div style={{ fontSize: 9, color: '#6b7280', fontWeight: 700, letterSpacing: 1 }}>{s.label}</div>
              <span style={{ fontSize: 16 }}>{s.icon}</span>
            </div>
            <div style={{ fontSize: 26, fontWeight: 900, color: '#f5f5f5', lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 10, color: s.color, fontWeight: 600, marginTop: 2 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Graphique barres 7j */}
      <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '12px 14px', marginBottom: 12 }}>
        <div style={{ fontSize: 9, color: '#6b7280', fontWeight: 700, letterSpacing: 1, marginBottom: 10 }}>SÉANCES PAR JOUR — 7 DERNIERS JOURS</div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 56 }}>
          {last7.map((v, i) => {
            const dayIdx = (new Date().getDay() + 6 - (6 - i)) % 7;
            return (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                <div style={{ fontSize: 9, color: '#02d1ba', fontWeight: 700, opacity: v > 0 ? 1 : 0 }}>{v}</div>
                <div style={{
                  width: '100%',
                  height: `${Math.max((v / maxBar) * 32, v > 0 ? 6 : 2)}px`,
                  background: i === 6 ? '#02d1ba' : `rgba(2,209,186,${0.15 + (v/maxBar) * 0.55})`,
                  borderRadius: 4,
                  boxShadow: i === 6 && v > 0 ? '0 0 8px rgba(2,209,186,0.4)' : 'none',
                  transition: 'height 0.6s cubic-bezier(0.34,1.56,0.64,1)',
                }} />
                <div style={{ fontSize: 9, color: '#4b5563', fontWeight: 600 }}>{days[dayIdx]}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Classement clients */}
      <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '12px 14px' }}>
        <div style={{ fontSize: 9, color: '#6b7280', fontWeight: 700, letterSpacing: 1, marginBottom: 10 }}>🏆 CLASSEMENT ACTIVITÉ SEMAINE</div>
        {[...( clients || [])].sort((a, b) => (b._weekSessions || 0) - (a._weekSessions || 0)).slice(0, 5).map((c, i) => {
          const maxS = Math.max(...(clients || []).map(x => x._weekSessions || 0), 1);
          const medals = ['🥇','🥈','🥉'];
          return (
            <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: i < 4 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
              <span style={{ fontSize: 14, width: 20, textAlign: 'center' }}>{medals[i] || i + 1}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#f5f5f5' }}>{c.full_name || c.email?.split('@')[0]}</div>
                <div style={{ fontSize: 10, color: '#6b7280' }}>{c._weekSessions || 0} séance{(c._weekSessions||0) !== 1 ? 's' : ''}</div>
              </div>
              <div style={{ width: 50, height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 2 }}>
                <div style={{ height: '100%', width: `${((c._weekSessions||0)/maxS)*100}%`, background: '#02d1ba', borderRadius: 2 }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

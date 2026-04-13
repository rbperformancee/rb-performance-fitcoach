import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import AppIcon from './AppIcon';

function BarChart({ data, color = '#02d1ba', label }) {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data.map(d => d.value), 1);
  const days = ['L','M','M','J','V','S','D'];
  return (
    <div>
      <div style={{ fontSize: 10, color: '#6b7280', fontWeight: 700, letterSpacing: 1, marginBottom: 8 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 56 }}>
        {data.map((d, i) => (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
            {d.value > 0 && <div style={{ fontSize: 8, color, fontWeight: 700 }}>{d.value}</div>}
            <div style={{
              width: '100%',
              height: `${Math.max((d.value / max) * 40, d.value > 0 ? 4 : 1)}px`,
              background: i === data.length - 1 ? color : `${color}${Math.round(0.3 + (d.value/max)*0.7 * 255).toString(16).padStart(2,'0')}`,
              borderRadius: 3, transition: 'height 0.5s cubic-bezier(0.34,1.56,0.64,1)',
            }} />
            <div style={{ fontSize: 8, color: '#4b5563', fontWeight: 600 }}>{d.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function LineChart({ data, color = '#02d1ba', unit = '' }) {
  if (!data || data.length < 2) return <div style={{ textAlign:'center', padding: 16, color:'#4b5563', fontSize:12 }}>Pas assez de données</div>;
  const W = 300, H = 80, pad = 12;
  const vals = data.map(d => d.value);
  const min = Math.min(...vals) - 0.5;
  const max = Math.max(...vals) + 0.5;
  const toX = (i) => pad + (i / (vals.length - 1)) * (W - pad * 2);
  const toY = (v) => H - pad - ((v - min) / (max - min || 1)) * (H - pad * 2);
  const points = vals.map((v, i) => `${toX(i)},${toY(v)}`).join(' ');
  const area = `M${toX(0)},${H} ` + vals.map((v,i) => `L${toX(i)},${toY(v)}`).join(' ') + ` L${toX(vals.length-1)},${H} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width:'100%', height:80 }}>
      <defs>
        <linearGradient id="lg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25"/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </linearGradient>
      </defs>
      <path d={area} fill="url(#lg)"/>
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      {vals.map((v,i) => i === vals.length-1 && (
        <g key={i}>
          <circle cx={toX(i)} cy={toY(v)} r="4" fill={color}/>
          <text x={toX(i)} y={toY(v)-8} textAnchor="middle" fontSize="9" fill={color} fontWeight="700">{v}{unit}</text>
        </g>
      ))}
    </svg>
  );
}

export default function ClientAnalytics({ clientId, period = 30 }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('sessions');

  const fetch = useCallback(async () => {
    if (!clientId) return;
    setLoading(true);
    const since = new Date(Date.now() - period * 86400000).toISOString();
    const [sessions, weights, rpe, activity] = await Promise.all([
      supabase.from('session_logs').select('logged_at').eq('client_id', clientId).gte('logged_at', since).order('logged_at'),
      supabase.from('weight_logs').select('weight,logged_at').eq('client_id', clientId).gte('logged_at', since).order('logged_at'),
      supabase.from('session_rpe').select('rpe,logged_at').eq('client_id', clientId).gte('logged_at', since).order('logged_at'),
      supabase.from('activity_logs').select('metric,value,logged_at').eq('client_id', clientId).gte('logged_at', since).order('logged_at'),
    ]);

    // Séances par jour (7 derniers jours)
    const last7 = Array.from({length:7}, (_,i) => {
      const d = new Date(Date.now()-(6-i)*86400000);
      const str = d.toISOString().split('T')[0];
      const dayIdx = (d.getDay()+6)%7;
      const days = ['L','M','M','J','V','S','D'];
      return { label: days[dayIdx], value: (sessions.data||[]).filter(s=>s.logged_at?.startsWith(str)).length };
    });

    // Poids sur la période
    const weightData = (weights.data||[]).map((w,i) => ({
      value: parseFloat(w.weight),
      label: new Date(w.logged_at).toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit'}),
    }));

    // Pas (activité)
    const stepsData = (activity.data||[]).filter(a=>a.metric==='steps').map(a=>({
      value: Math.round(a.value/1000*10)/10,
      label: new Date(a.logged_at).toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit'}),
    }));

    // Score de performance (0-100)
    const sessionScore = Math.min((sessions.data?.length||0) / (period/7*3) * 40, 40);
    const weightScore = weightData.length > 0 ? 20 : 0;
    const rpeScore = rpe.data?.length > 0 ? 20 : 0;
    const activityScore = stepsData.length > 0 ? 20 : 0;
    const perfScore = Math.round(sessionScore + weightScore + rpeScore + activityScore);

    setData({ last7, weightData, stepsData, perfScore, totalSessions: sessions.data?.length||0, avgRpe: rpe.data?.length ? (rpe.data.reduce((a,r)=>a+r.rpe,0)/rpe.data.length).toFixed(1) : null });
    setLoading(false);
  }, [clientId, period]);

  useEffect(() => { fetch(); }, [fetch]);

  if (loading) return <div style={{padding:16}}>{[...Array(3)].map((_,i)=><div key={i} className="skeleton" style={{height:60,borderRadius:12,marginBottom:8}}/>)}</div>;
  if (!data) return null;

  const scoreColor = data.perfScore >= 75 ? '#02d1ba' : data.perfScore >= 50 ? '#fbbf24' : '#ef4444';

  return (
    <div style={{ padding: '0 0 16px', animation: 'fadeInUp 0.3s ease' }}>
      {/* Score de performance */}
      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '16px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ position: 'relative', width: 64, height: 64, flexShrink: 0 }}>
          <svg viewBox="0 0 64 64" style={{ width: 64, height: 64, transform: 'rotate(-90deg)' }}>
            <circle cx="32" cy="32" r="26" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6"/>
            <circle cx="32" cy="32" r="26" fill="none" stroke={scoreColor} strokeWidth="6"
              strokeDasharray={`${2*Math.PI*26}`}
              strokeDashoffset={`${2*Math.PI*26*(1-data.perfScore/100)}`}
              strokeLinecap="round" style={{transition:'stroke-dashoffset 1s ease'}}/>
          </svg>
          <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:900, color:scoreColor }}>{data.perfScore}</div>
        </div>
        <div>
          <div style={{ fontSize: 10, color: '#6b7280', fontWeight: 700, letterSpacing: 1, marginBottom: 4 }}>SCORE DE PERFORMANCE</div>
          <div style={{ fontSize: 20, fontWeight: 900, color: '#f5f5f5', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <AppIcon name={data.perfScore >= 75 ? 'flame' : data.perfScore >= 50 ? 'lightning' : 'dumbbell'} size={18} color={scoreColor} />
            {data.perfScore >= 75 ? 'Excellent' : data.perfScore >= 50 ? 'Bien' : 'A ameliorer'}
          </div>
          <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{data.totalSessions} séances sur {period} jours{data.avgRpe ? ` · RPE moy. ${data.avgRpe}` : ''}</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        {[['sessions','dumbbell','Seances'],['weight','scale','Poids'],['steps','shoe','Pas']].map(([t,ic,l]) => (
          <button key={t} onClick={() => setTab(t)} style={{
            flex: 1, padding: '10px 4px', borderRadius: 10, border: 'none',
            background: tab===t ? 'rgba(2,209,186,0.12)' : 'rgba(255,255,255,0.03)',
            color: tab===t ? '#02d1ba' : '#6b7280',
            fontSize: 11, fontWeight: 700, cursor: 'pointer',
            borderBottom: tab===t ? '2px solid #02d1ba' : '2px solid transparent',
            transition: 'all 0.2s',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 36,
          }}>
            <AppIcon name={ic} size={12} color={tab===t ? '#02d1ba' : '#6b7280'} />
            {l}
          </button>
        ))}
      </div>

      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '14px' }}>
        {tab === 'sessions' && <BarChart data={data.last7} color="#02d1ba" label="SÉANCES PAR JOUR — 7 DERNIERS JOURS" />}
        {tab === 'weight' && <LineChart data={data.weightData} color="#a78bfa" unit=" kg" />}
        {tab === 'steps' && <LineChart data={data.stepsData} color="#fb923c" unit="k" />}
      </div>
    </div>
  );
}

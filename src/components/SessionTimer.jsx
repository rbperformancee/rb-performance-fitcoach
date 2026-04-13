import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import AppIcon from './AppIcon';

function formatTime(secs) {
  const m = Math.floor(secs / 60).toString().padStart(2, '0');
  const s = (secs % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function CircleTimer({ value, max, size = 120, color = '#02d1ba', children }) {
  const r = (size - 10) / 2;
  const circ = 2 * Math.PI * r;
  const pct = max > 0 ? Math.max(0, value / max) : 1;
  const offset = circ * (1 - pct);
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', position: 'absolute', top: 0, left: 0 }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={8} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={8}
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.5s ease', filter: `drop-shadow(0 0 8px ${color}80)` }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
        {children}
      </div>
    </div>
  );
}

export default function SessionTimer({ clientId, onClose }) {
  const [phase, setPhase] = useState('idle'); // idle | active | rest | done
  const [sessionSecs, setSessionSecs] = useState(0);
  const [restSecs, setRestSecs] = useState(0);
  const [restTotal, setRestTotal] = useState(90);
  const [exercises, setExercises] = useState(0);
  const [sets, setSets] = useState(0);
  const [startTime, setStartTime] = useState(null);
  const [pulse, setPulse] = useState(false);
  const intervalRef = useRef(null);
  const restRef = useRef(null);

  const playBeep = useCallback((count = 1) => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      for (let i = 0; i < count; i++) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.frequency.value = i === count - 1 ? 880 : 660;
        gain.gain.setValueAtTime(0.4, ctx.currentTime + i * 0.2);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.2 + 0.15);
        osc.start(ctx.currentTime + i * 0.2);
        osc.stop(ctx.currentTime + i * 0.2 + 0.2);
      }
    } catch(e) {}
    if (navigator.vibrate) navigator.vibrate(count === 1 ? 30 : [50, 30, 50, 30, 100]);
  }, []);

  // Chrono séance
  useEffect(() => {
    if (phase === 'active') {
      intervalRef.current = setInterval(() => {
        setSessionSecs(s => s + 1);
        setPulse(p => !p);
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [phase]);

  // Timer repos
  useEffect(() => {
    if (phase === 'rest') {
      restRef.current = setInterval(() => {
        setRestSecs(s => {
          if (s <= 1) {
            clearInterval(restRef.current);
            setPhase('active');
            playBeep(3);
            return 0;
          }
          if (s === 4) playBeep(1);
          return s - 1;
        });
      }, 1000);
    } else {
      clearInterval(restRef.current);
    }
    return () => clearInterval(restRef.current);
  }, [phase, playBeep]);

  const startSession = () => {
    setPhase('active');
    setStartTime(Date.now());
    setSessionSecs(0);
    setExercises(0);
    setSets(0);
    if (navigator.vibrate) navigator.vibrate([50, 30, 100]);
  };

  const logSet = () => {
    setSets(s => s + 1);
    if (navigator.vibrate) navigator.vibrate(20);
    setPulse(p => !p);
  };

  const logExercise = () => {
    setExercises(e => e + 1);
    setSets(0);
    if (navigator.vibrate) navigator.vibrate([30, 20, 30]);
  };

  const startRest = (duration = 90) => {
    setRestTotal(duration);
    setRestSecs(duration);
    setPhase('rest');
    if (navigator.vibrate) navigator.vibrate(30);
  };

  const endSession = async () => {
    setPhase('done');
    clearInterval(intervalRef.current);
    clearInterval(restRef.current);
    playBeep(3);
    if (clientId) {
      await supabase.from('session_logs').insert({
        client_id: clientId,
        duration_seconds: sessionSecs,
        exercises_count: exercises,
        sets_count: sets,
        logged_at: new Date().toISOString(),
      });
    }
  };

  if (phase === 'done') {
    const mins = Math.floor(sessionSecs / 60);
    const secs = sessionSecs % 60;
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 8000, background: '#0d0d0d', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ width: 88, height: 88, borderRadius: "50%", background: "rgba(251,191,36,0.12)", border: "1px solid rgba(251,191,36,0.3)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20, animation: 'bounceIn 0.5s ease', boxShadow: "0 0 40px rgba(251,191,36,0.2)" }}>
          <AppIcon name="trophy" size={40} color="#fbbf24" strokeWidth={1.6} />
        </div>
        <h2 style={{ fontSize: 28, fontWeight: 900, color: '#f5f5f5', margin: '0 0 8px' }}>Seance terminee.</h2>
        <p style={{ color: '#6b7280', fontSize: 14, margin: '0 0 32px' }}>Excellent travail.</p>
        <div style={{ display: 'flex', gap: 12, marginBottom: 40 }}>
          {[
            { label: 'DUREE', value: `${mins}m${secs < 10 ? '0' : ''}${secs}s`, icon: 'clock', color: '#02d1ba' },
            { label: 'EXERCICES', value: exercises, icon: 'dumbbell', color: '#a78bfa' },
            { label: 'SERIES', value: sets, icon: 'flame', color: '#fb923c' },
          ].map((s, i) => (
            <div key={i} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '14px 18px', textAlign: 'center', animation: `fadeInUp 0.4s ease ${i*0.1}s both` }}>
              <div style={{ marginBottom: 6, display: 'flex', justifyContent: 'center', color: s.color }}><AppIcon name={s.icon} size={20} color={s.color} /></div>
              <div style={{ fontSize: 24, fontWeight: 900, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 9, color: '#6b7280', fontWeight: 700, letterSpacing: 1 }}>{s.label}</div>
            </div>
          ))}
        </div>
        <button onClick={onClose} style={{ background: '#02d1ba', color: '#0d0d0d', border: 'none', borderRadius: 14, padding: '16px 48px', fontSize: 16, fontWeight: 900, cursor: 'pointer', boxShadow: '0 4px 20px rgba(2,209,186,0.3)' }}>
          Fermer
        </button>
      </div>
    );
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 8000, background: '#0d0d0d', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '48px 24px 32px', overflowY: 'auto' }}>
      {/* Header */}
      <div style={{ width: '100%', maxWidth: 360, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <div>
          <div style={{ fontSize: 10, color: '#6b7280', fontWeight: 700, letterSpacing: 1.5 }}>SÉANCE EN COURS</div>
          <div style={{ fontSize: 14, color: '#02d1ba', fontWeight: 700 }}>{exercises} exercice{exercises !== 1 ? 's' : ''} · {sets} série{sets !== 1 ? 's' : ''}</div>
        </div>
        {phase === 'active' && (
          <button onClick={endSession} style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 10, padding: '8px 14px', color: '#ef4444', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
            Terminer
          </button>
        )}
      </div>

      {phase === 'idle' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24, width: '100%', maxWidth: 360 }}>
          <div style={{ width: 96, height: 96, borderRadius: "50%", background: "rgba(2,209,186,0.12)", border: "1px solid rgba(2,209,186,0.3)", display: "flex", alignItems: "center", justifyContent: "center", animation: 'pulse 2s ease infinite', boxShadow: "0 0 40px rgba(2,209,186,0.25)" }}>
            <AppIcon name="lightning" size={44} color="#02d1ba" strokeWidth={1.6} />
          </div>
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ fontSize: 26, fontWeight: 900, color: '#f5f5f5', margin: '0 0 8px' }}>Pret a performer ?</h2>
            <p style={{ color: '#6b7280', fontSize: 14, margin: 0 }}>Lance le timer pour demarrer ta seance</p>
          </div>
          <button onClick={startSession} style={{ background: '#02d1ba', color: '#0d0d0d', border: 'none', borderRadius: 16, padding: '18px 56px', fontSize: 17, fontWeight: 900, cursor: 'pointer', boxShadow: '0 4px 24px rgba(2,209,186,0.35)', letterSpacing: 0.5, display: 'inline-flex', alignItems: 'center', gap: 10 }}>
            Demarrer
            <AppIcon name="lightning" size={18} color="#0d0d0d" strokeWidth={2.5} />
          </button>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#4b5563', fontSize: 13, cursor: 'pointer' }}>Annuler</button>
        </div>
      )}

      {phase === 'active' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28, width: '100%', maxWidth: 360 }}>
          <CircleTimer value={sessionSecs} max={3600} size={160} color='#02d1ba'>
            <div style={{ fontSize: 32, fontWeight: 900, color: '#f5f5f5', fontVariantNumeric: 'tabular-nums', filter: pulse ? 'none' : 'brightness(0.8)', transition: 'filter 0.5s' }}>
              {formatTime(sessionSecs)}
            </div>
            <div style={{ fontSize: 10, color: '#6b7280', fontWeight: 600, letterSpacing: 1 }}>EN COURS</div>
          </CircleTimer>

          <div style={{ display: 'flex', gap: 10, width: '100%' }}>
            <button onClick={logSet} style={{ flex: 1, background: 'rgba(167,139,250,0.12)', border: '1px solid rgba(167,139,250,0.25)', borderRadius: 14, padding: '14px', color: '#a78bfa', fontWeight: 800, fontSize: 14, cursor: 'pointer', transition: 'all 0.15s' }}>
              ✓ Série validée
            </button>
            <button onClick={logExercise} style={{ flex: 1, background: 'rgba(251,146,60,0.12)', border: '1px solid rgba(251,146,60,0.25)', borderRadius: 14, padding: '14px', color: '#fb923c', fontWeight: 800, fontSize: 14, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <AppIcon name="dumbbell" size={14} color="#fb923c" />
              Exercice suivant
            </button>
          </div>

          <div style={{ width: '100%' }}>
            <div style={{ fontSize: 10, color: '#6b7280', fontWeight: 700, letterSpacing: 1.5, marginBottom: 10, textAlign: 'center' }}>TEMPS DE REPOS</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {[30, 60, 90, 120].map(d => (
                <button key={d} onClick={() => startRest(d)} style={{ flex: 1, background: 'rgba(2,209,186,0.08)', border: '1px solid rgba(2,209,186,0.15)', borderRadius: 12, padding: '12px 4px', color: '#02d1ba', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                  {d < 60 ? `${d}s` : `${d/60}m${d%60 ? d%60+'s' : ''}`}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {phase === 'rest' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 28 }}>
          <div style={{ fontSize: 13, color: '#6b7280', fontWeight: 700, letterSpacing: 2 }}>REPOS</div>
          <CircleTimer value={restSecs} max={restTotal} size={180} color={restSecs <= 5 ? '#ef4444' : restSecs <= 15 ? '#fb923c' : '#02d1ba'}>
            <div style={{ fontSize: 44, fontWeight: 900, color: restSecs <= 5 ? '#ef4444' : '#f5f5f5', fontVariantNumeric: 'tabular-nums', transition: 'color 0.3s' }}>
              {restSecs}
            </div>
            <div style={{ fontSize: 10, color: '#6b7280', fontWeight: 600, letterSpacing: 1 }}>secondes</div>
          </CircleTimer>
          <p style={{ color: '#4b5563', fontSize: 13, textAlign: 'center', display: 'inline-flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
            <AppIcon name={restSecs <= 5 ? 'flame' : restSecs <= 15 ? 'lightning' : 'zzz'} size={14} color={restSecs <= 5 ? '#ef4444' : restSecs <= 15 ? '#fb923c' : '#4b5563'} />
            {restSecs <= 5 ? 'Prepare-toi !' : restSecs <= 15 ? 'Bientot !' : 'Recupere bien'}
          </p>
          <button onClick={() => { setPhase('active'); setRestSecs(0); }} style={{ background: 'rgba(2,209,186,0.12)', border: '1px solid rgba(2,209,186,0.25)', borderRadius: 12, padding: '12px 28px', color: '#02d1ba', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
            Passer le repos →
          </button>
        </div>
      )}
    </div>
  );
}

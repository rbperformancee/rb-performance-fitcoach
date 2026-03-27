import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { LOGO_B64 } from '../utils/logo';

export default function CoachLoginScreen({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [focused, setFocused] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError('Email ou mot de passe incorrect');
    } else {
      onLogin && onLogin();
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: '100vh', background: 'radial-gradient(ellipse at 50% 0%, rgba(2,209,186,0.07) 0%, #0d0d0d 60%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 24px', fontFamily: 'Inter, -apple-system, sans-serif' }}>
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, transparent 0%, #02d1ba 50%, transparent 100%)', opacity: 0.7 }} />
      <div style={{ width: '100%', maxWidth: 360 }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <img src={LOGO_B64} alt="RB PERFORM" style={{ width: 88, height: 88, objectFit: 'cover', objectPosition: 'center 60%', display: 'block', margin: '0 auto 20px', borderRadius: 22, boxShadow: '0 0 0 1px rgba(2,209,186,0.2), 0 20px 60px rgba(2,209,186,0.12)' }} />
          <div style={{ fontSize: 10, color: '#6b7280', fontWeight: 700, letterSpacing: 2, marginBottom: 6 }}>ESPACE COACH</div>
          <h1 style={{ fontSize: 28, fontWeight: 900, color: '#f5f5f5', margin: 0, letterSpacing: '-1px' }}>RB <span style={{ color: '#02d1ba' }}>PERFORM</span></h1>
        </div>
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: 1.5, color: '#6b7280', marginBottom: 6, textTransform: 'uppercase' }}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} onFocus={() => setFocused('email')} onBlur={() => setFocused('')} placeholder="coach@email.com" autoFocus
              style={{ width: '100%', boxSizing: 'border-box', background: focused === 'email' ? 'rgba(2,209,186,0.04)' : 'rgba(255,255,255,0.03)', border: focused === 'email' ? '1.5px solid rgba(2,209,186,0.5)' : '1.5px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '15px 18px', color: '#f5f5f5', fontSize: 15, fontFamily: 'inherit', outline: 'none', transition: 'all 0.2s' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: 1.5, color: '#6b7280', marginBottom: 6, textTransform: 'uppercase' }}>Mot de passe</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} onFocus={() => setFocused('password')} onBlur={() => setFocused('')} placeholder="••••••••"
              style={{ width: '100%', boxSizing: 'border-box', background: focused === 'password' ? 'rgba(2,209,186,0.04)' : 'rgba(255,255,255,0.03)', border: focused === 'password' ? '1.5px solid rgba(2,209,186,0.5)' : '1.5px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '15px 18px', color: '#f5f5f5', fontSize: 15, fontFamily: 'inherit', outline: 'none', transition: 'all 0.2s' }} />
          </div>
          {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#ef4444', textAlign: 'center' }}>{error}</div>}
          <button type="submit" disabled={loading || !email || !password}
            style={{ marginTop: 4, width: '100%', padding: '17px', borderRadius: 14, border: 'none', background: email && password ? '#02d1ba' : 'rgba(255,255,255,0.06)', color: email && password ? '#0d0d0d' : '#374151', fontSize: 14, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase', cursor: email && password ? 'pointer' : 'not-allowed', transition: 'all 0.15s' }}>
            {loading ? 'Connexion...' : 'Acceder au dashboard'}
          </button>
        </form>
      </div>
      <div style={{ position: 'fixed', bottom: 20, fontSize: 10, color: '#1f2937', letterSpacing: '1.5px', fontWeight: 600, textTransform: 'uppercase' }}>RB PERFORM · SIRET 99063780300018</div>
      <style>{'input::placeholder { color: #374151; }'}</style>
    </div>
  );
}
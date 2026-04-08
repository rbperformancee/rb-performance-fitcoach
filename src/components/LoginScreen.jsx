import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { PrivacyPolicy } from './PrivacyPolicy';
import { LOGO_B64 } from '../utils/logo';

function Particles() {
  const canvasRef = React.useRef(null);
  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const particles = Array.from({ length: 40 }, () => ({
      x: Math.random() * canvas.width, y: Math.random() * canvas.height,
      r: Math.random() * 1.5 + 0.3, dx: (Math.random() - 0.5) * 0.3, dy: (Math.random() - 0.5) * 0.3,
      opacity: Math.random() * 0.4 + 0.1,
    }));
    let raf;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(2,209,186,' + p.opacity + ')'; ctx.fill();
        p.x += p.dx; p.y += p.dy;
        if (p.x < 0 || p.x > canvas.width) p.dx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.dy *= -1;
      });
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, []);
  return React.createElement('canvas', { ref: canvasRef, style: { position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 } });
}

const PHRASES = [
  ['LA PERFORMANCE', "N'ATTEND PAS."],
  ['CHAQUE SÉANCE', 'COMPTE.'],
  ['TON CORPS.', 'TON PROGRAMME.'],
  ['ZERO EXCUSE.', 'MAX RÉSULTAT.'],
];

export function LoginScreen({ onSendMagicLink, loading }) {
  const [email, setEmail] = useState('');
  const [step, setStep] = useState('email'); // email | otp
  const [otp, setOtp] = useState('');
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [focused, setFocused] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const [phraseIdx] = useState(() => Math.floor(Math.random() * PHRASES.length));
  const [coachMode, setCoachMode] = useState(false);
  const [password, setPassword] = useState('');
  const [pwdFocused, setPwdFocused] = useState(false);
  const [coachError, setCoachError] = useState('');
  const [coachLoading, setCoachLoading] = useState(false);
  const otpRefs = React.useRef([]);
  const phrase = PHRASES[phraseIdx];
  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  // Envoyer le code OTP
  const handleSendOTP = async () => {
    if (!validEmail || !accepted) return;
    setSending(true);
    setError('');
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: { shouldCreateUser: false }
      });
      if (error) throw error;
      setStep('otp');
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } catch(e) {
      setError(e.message || 'Erreur envoi du code');
    }
    setSending(false);
  };

  const handleOtpChange = (val) => {
    const cleaned = val.replace(/[^0-9]/g, '').substring(0, 8);
    setOtp(cleaned);
    if (cleaned.length >= 6) verifyOTP(cleaned);
  };

  // Vérifier le code OTP
  const verifyOTP = async (code) => {
    if (code.length < 6) return;
    setVerifying(true);
    setError('');
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: email.trim().toLowerCase(),
        token: code,
        type: 'email',
        options: {
          // Session longue si "Se souvenir de moi"
          ...(rememberMe ? {} : {})
        }
      });
      if (error) {
        setError('Code incorrect ou expiré. Réessaie.');
        setOtp(['', '', '', '', '', '']);
        setTimeout(() => otpRefs.current[0]?.focus(), 100);
      }
      // Si succès → Supabase met à jour la session automatiquement
    } catch(e) {
      setError('Erreur de vérification');
    }
    setVerifying(false);
  };

  const handleCoachLogin = async (e) => {
    e.preventDefault();
    setCoachLoading(true);
    setCoachError('');
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setCoachError('Email ou mot de passe incorrect');
    } catch(err) {
      setCoachError('Erreur de connexion');
    }
    setCoachLoading(false);
  };

  return (
    <>
      {showPrivacy && React.createElement(PrivacyPolicy, { onClose: () => setShowPrivacy(false) })}
      {React.createElement(Particles)}
      <div style={{ minHeight: '100vh', background: 'radial-gradient(ellipse at 50% 0%, rgba(2,209,186,0.07) 0%, #0d0d0d 60%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 24px', fontFamily: 'Inter, -apple-system, sans-serif', position: 'relative', zIndex: 1 }}>
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, transparent 0%, #02d1ba 50%, transparent 100%)', opacity: 0.7 }} />
        
        <div style={{ width: '100%', maxWidth: 360 }}>
          {/* Logo + Phrase */}
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            {onBack && (
            <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.25)', fontSize: 12, cursor: 'pointer', fontFamily: '-apple-system,Inter,sans-serif', marginBottom: 28, letterSpacing: '0.3px' }}>
              <span style={{ fontSize: 16 }}>←</span>
              <span>Découvrir les offres</span>
            </button>
          )}
          <img src={LOGO_B64} alt="RB PERFORM" style={{ width: 88, height: 88, objectFit: 'cover', objectPosition: 'center 60%', display: 'block', margin: '0 auto 20px', borderRadius: 22, boxShadow: '0 0 0 1px rgba(2,209,186,0.2), 0 20px 60px rgba(2,209,186,0.12)' }} />
            {[phrase[0], phrase[1]].map((line, li) => (
              <div key={li} style={{ fontSize: 30, fontWeight: 900, letterSpacing: '-1.5px', lineHeight: 1.05, color: li === 0 ? '#f5f5f5' : '#02d1ba' }}>{line}</div>
            ))}
            <p style={{ fontSize: 10, color: '#4b5563', fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase', margin: '8px 0 0' }}>Programmes d entraînement personnalisés</p>
          </div>

          {/* Step Email */}
          {step === 'email' && !coachMode && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input type="email" placeholder="ton@email.com" value={email}
                onChange={e => setEmail(e.target.value)} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
                onKeyDown={e => e.key === 'Enter' && handleSendOTP()}
                autoFocus
                style={{ width: '100%', boxSizing: 'border-box', background: focused ? 'rgba(2,209,186,0.04)' : 'rgba(255,255,255,0.03)', border: '1.5px solid ' + (focused ? 'rgba(2,209,186,0.5)' : 'rgba(255,255,255,0.08)'), borderRadius: 14, padding: '16px 18px', color: '#f5f5f5', fontSize: 15, fontFamily: 'inherit', outline: 'none', transition: 'all 0.2s' }} />

              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
                <div onClick={() => setAccepted(a => !a)} style={{ width: 18, height: 18, borderRadius: 5, flexShrink: 0, marginTop: 2, background: accepted ? '#02d1ba' : 'transparent', border: '1.5px solid ' + (accepted ? '#02d1ba' : 'rgba(255,255,255,0.2)'), display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }}>
                  {accepted && <span style={{ fontSize: 10, color: '#0d0d0d', fontWeight: 900 }}>✓</span>}
                </div>
                <span style={{ fontSize: 11, color: '#4b5563', lineHeight: 1.6 }}>
                  J accepte la <button type="button" onClick={() => setShowPrivacy(true)} style={{ background: 'none', border: 'none', color: '#02d1ba', cursor: 'pointer', fontSize: 11, padding: 0, textDecoration: 'underline' }}>politique de confidentialité</button> et le traitement de mes données RGPD.
                </span>
              </label>

              {/* Se souvenir de moi */}
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                <div onClick={() => setRememberMe(r => !r)} style={{ width: 18, height: 18, borderRadius: 5, flexShrink: 0, background: rememberMe ? '#02d1ba' : 'transparent', border: '1.5px solid ' + (rememberMe ? '#02d1ba' : 'rgba(255,255,255,0.2)'), display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }}>
                  {rememberMe && <span style={{ fontSize: 10, color: '#0d0d0d', fontWeight: 900 }}>✓</span>}
                </div>
                <span style={{ fontSize: 11, color: '#4b5563' }}>Se souvenir de moi sur cet appareil</span>
              </label>

              {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '10px 14px', fontSize: 12, color: '#ef4444', textAlign: 'center' }}>{error}</div>}

              <button onClick={handleSendOTP} disabled={!validEmail || !accepted || sending}
                style={{ marginTop: 4, width: '100%', padding: '17px', borderRadius: 14, border: 'none', background: validEmail && accepted ? '#02d1ba' : 'rgba(255,255,255,0.06)', color: validEmail && accepted ? '#0d0d0d' : '#374151', fontSize: 14, fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase', cursor: validEmail && accepted ? 'pointer' : 'not-allowed', transition: 'all 0.15s' }}>
                {sending ? 'Envoi...' : 'Recevoir mon code →'}
              </button>
              <p style={{ textAlign: 'center', fontSize: 11, color: '#374151', margin: '4px 0 0' }}>Code à 6 chiffres par email — sans mot de passe</p>
            </div>
          )}

          {/* Step OTP */}
          {step === 'otp' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20, alignItems: 'center' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>📬</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#f5f5f5', marginBottom: 4 }}>Code envoyé !</div>
                <div style={{ fontSize: 12, color: '#6b7280' }}>Vérifie <span style={{ color: '#02d1ba' }}>{email}</span></div>
              </div>

              {/* Input OTP unique */}
              <input
                type="text" inputMode="numeric" pattern="[0-9]*"
                value={otp} onChange={e => handleOtpChange(e.target.value)}
                placeholder="_ _ _ _ _ _" maxLength={8} autoFocus
                style={{ width: '100%', boxSizing: 'border-box', textAlign: 'center', fontSize: 32, fontWeight: 900, letterSpacing: 12, fontFamily: 'monospace', background: otp.length >= 6 ? 'rgba(2,209,186,0.08)' : 'rgba(255,255,255,0.04)', border: '2px solid ' + (otp.length >= 6 ? 'rgba(2,209,186,0.5)' : 'rgba(255,255,255,0.1)'), borderRadius: 16, padding: '20px 16px', color: '#02d1ba', outline: 'none', transition: 'all 0.2s' }}
              />

              {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '10px 14px', fontSize: 12, color: '#ef4444', textAlign: 'center', width: '100%', boxSizing: 'border-box' }}>{error}</div>}

              {verifying && <div style={{ fontSize: 13, color: '#02d1ba' }}>Vérification...</div>}

              <button onClick={() => { setStep('email'); setOtp(''); setError(''); }}
                style={{ background: 'none', border: 'none', color: '#374151', fontSize: 12, cursor: 'pointer', textDecoration: 'underline' }}>
                ← Changer d email
              </button>

              <button onClick={handleSendOTP} disabled={sending}
                style={{ background: 'none', border: 'none', color: '#02d1ba', fontSize: 12, cursor: 'pointer' }}>
                {sending ? 'Envoi...' : 'Renvoyer le code'}
              </button>
            </div>
          )}

          {/* Espace Coach */}
          {coachMode && (
            <form onSubmit={handleCoachLogin} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input type="email" placeholder="coach@email.com" value={email} onChange={e => setEmail(e.target.value)} autoFocus
                style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.03)', border: '1.5px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '15px 18px', color: '#f5f5f5', fontSize: 15, fontFamily: 'inherit', outline: 'none' }} />
              <input type="password" placeholder="Mot de passe" value={password} onChange={e => setPassword(e.target.value)} onFocus={() => setPwdFocused(true)} onBlur={() => setPwdFocused(false)}
                style={{ width: '100%', boxSizing: 'border-box', background: pwdFocused ? 'rgba(2,209,186,0.04)' : 'rgba(255,255,255,0.03)', border: '1.5px solid ' + (pwdFocused ? 'rgba(2,209,186,0.5)' : 'rgba(255,255,255,0.08)'), borderRadius: 14, padding: '15px 18px', color: '#f5f5f5', fontSize: 15, fontFamily: 'inherit', outline: 'none', transition: 'all 0.2s' }} />
              {coachError && <div style={{ fontSize: 12, color: '#ef4444', textAlign: 'center', background: 'rgba(239,68,68,0.1)', padding: '8px', borderRadius: 8 }}>{coachError}</div>}
              <button type="submit" disabled={!password || !email || coachLoading}
                style={{ width: '100%', padding: '16px', borderRadius: 14, border: 'none', background: password && email ? '#02d1ba' : 'rgba(255,255,255,0.06)', color: password && email ? '#0d0d0d' : '#374151', fontSize: 14, fontWeight: 800, cursor: password && email ? 'pointer' : 'not-allowed', letterSpacing: '1px', textTransform: 'uppercase', transition: 'all 0.15s' }}>
                {coachLoading ? 'Connexion...' : 'Accéder au dashboard →'}
              </button>
            </form>
          )}

          {step === 'email' && (
            <button onClick={() => { setCoachMode(m => !m); setCoachError(''); setError(''); }}
              style={{ background: 'none', border: 'none', color: coachMode ? '#02d1ba' : '#374151', fontSize: 11, cursor: 'pointer', margin: '16px auto 0', display: 'block', textDecoration: 'underline' }}>
              {coachMode ? '← Retour client' : 'Espace Coach'}
            </button>
          )}
        </div>

        <div style={{ position: 'fixed', bottom: 20, fontSize: 10, color: '#1f2937', letterSpacing: '1.5px', fontWeight: 600, textTransform: 'uppercase' }}>RB PERFORM · SIRET 99063780300018</div>
        <style>{'input::placeholder { color: #374151; }'}</style>
      </div>
    </>
  );
}
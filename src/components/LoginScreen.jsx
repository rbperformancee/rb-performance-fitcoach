import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

const G = '#02d1ba';

/**
 * LoginScreen — page de connexion unifiee RB Perform.
 *
 * Vue par defaut : CLIENT (OTP 6 chiffres par email)
 * Vue secondaire : COACH (email + mot de passe)
 *
 * Design coherent avec la landing (fond noir, typo Syne/Inter, accent teal).
 */
export function LoginScreen({ onBack }) {
  const [mode, setMode] = useState('client'); // client | coach
  const [email, setEmail] = useState('');
  const [step, setStep] = useState('email'); // email | otp
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const otpRef = useRef(null);

  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  // Auto-redirect si deja connecte
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data?.session?.user) {
        window.location.href = '/app.html';
      }
    });
  }, []);

  // ===== CLIENT : envoyer OTP =====
  const sendOTP = async () => {
    if (!validEmail) return;
    setLoading(true);
    setError('');
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: { shouldCreateUser: true },
      });
      if (error) throw error;
      setStep('otp');
      setSuccess('Code envoye a ' + email);
      setTimeout(() => otpRef.current?.focus(), 100);
    } catch (e) {
      setError(e.message === 'Signups not allowed for otp'
        ? 'Aucun compte trouve avec cet email. Contacte ton coach.'
        : e.message || 'Erreur lors de l\'envoi du code.');
    }
    setLoading(false);
  };

  // ===== CLIENT : verifier OTP =====
  const verifyingRef = useRef(false);
  const verifiedRef = useRef(false);
  const verifyOTP = async (code) => {
    if (code.length < 6) return;
    // Bloque les appels concurrents (auto-verify au 6e chiffre + click bouton)
    // et les retries apres succes (le 1er appel consomme le token).
    if (verifyingRef.current || verifiedRef.current) return;
    verifyingRef.current = true;
    setLoading(true);
    setError('');
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: email.trim().toLowerCase(),
        token: code,
        type: 'email',
      });
      if (error) {
        console.error('[OTP]', error.code, error.message);
        setError('Code incorrect ou expire. Reessaie.');
        setOtp('');
        setTimeout(() => otpRef.current?.focus(), 100);
      } else {
        // Succes → Supabase met a jour la session, App.jsx detecte et redirige.
        // On lock la verification pour empecher tout retry qui ferait 403 sur
        // le token deja consomme.
        console.log('[OTP] success, redirecting...');
        verifiedRef.current = true;
        setSuccess('Connexion reussie, redirection...');
        // Filet de securite : si onAuthStateChange ne redirige pas en 1.5s,
        // on force un reload pour relire la session.
        setTimeout(() => {
          if (window.location.pathname.includes('login') || document.body.contains(otpRef.current)) {
            window.location.href = '/';
          }
        }, 1500);
      }
    } catch (e) {
      console.error('[OTP] exception', e);
      setError('Erreur de verification');
    }
    verifyingRef.current = false;
    setLoading(false);
  };

  const handleOtpChange = (val) => {
    const cleaned = val.replace(/[^0-9]/g, '').substring(0, 6);
    setOtp(cleaned);
    if (cleaned.length === 6) verifyOTP(cleaned);
  };

  // ===== COACH : login password =====
  const handleCoachLogin = async (e) => {
    e.preventDefault();
    if (!validEmail || !password) return;
    setLoading(true);
    setError('');
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (error) {
        setError('Email ou mot de passe incorrect.');
      } else {
        // Redirect vers app.html, App.jsx detecte le role et affiche le dashboard
        window.location.href = '/app.html';
      }
    } catch (e) {
      setError('Erreur de connexion.');
    }
    setLoading(false);
  };

  // ===== COACH : mot de passe oublie =====
  const handleForgotPassword = async () => {
    if (!validEmail) { setError('Entre ton email d\'abord.'); return; }
    setLoading(true);
    setError('');
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        email.trim().toLowerCase(),
        { redirectTo: window.location.origin + '/#type=recovery' }
      );
      if (error) throw error;
      setSuccess('Email de reinitialisation envoye.');
    } catch (e) {
      setError(e.message || 'Erreur');
    }
    setLoading(false);
  };

  return (
    <div style={{
      minHeight: '100vh', background: '#050505',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '32px 24px', fontFamily: "'Inter', -apple-system, sans-serif", position: 'relative',
    }}>
      {/* Ambiance */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '50%', background: 'radial-gradient(ellipse at 50% -10%, rgba(2,209,186,0.08) 0%, transparent 60%)', pointerEvents: 'none' }} />

      <div style={{ width: '100%', maxWidth: 380, position: 'relative', zIndex: 1 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 900, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.2)' }}>
            RB<span style={{ color: 'rgba(2,209,186,0.4)' }}>PERFORM</span>
          </div>
        </div>

        {/* Titre — style dashboard coach */}
        <div style={{ marginBottom: 36 }}>
          <div style={{ fontSize: 10, color: 'rgba(2,209,186,0.55)', letterSpacing: '3px', textTransform: 'uppercase', marginBottom: 10 }}>
            {mode === 'client' ? 'Espace client' : 'Espace coach'}
          </div>
          <div style={{ fontSize: 52, fontWeight: 800, color: '#fff', letterSpacing: '-3px', lineHeight: 0.92, marginBottom: 10 }}>
            {mode === 'client' ? 'Connexion' : 'Coach'}
            <span style={{ color: G }}>.</span>
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)', fontStyle: 'italic' }}>
            {mode === 'client'
              ? 'Entre ton email pour recevoir ton code de connexion.'
              : 'Connecte-toi avec ton email et ton mot de passe.'}
          </div>
        </div>

        {/* ===== CLIENT MODE ===== */}
        {mode === 'client' && (
          <>
            {step === 'email' ? (
              <div>
                <label style={labelStyle}>Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendOTP()}
                  placeholder="ton@email.com"
                  autoFocus
                  style={inputStyle}
                />
                <button
                  onClick={sendOTP}
                  disabled={!validEmail || loading}
                  style={{
                    ...btnStyle,
                    opacity: (!validEmail || loading) ? 0.4 : 1,
                    cursor: (!validEmail || loading) ? 'not-allowed' : 'pointer',
                  }}
                >
                  {loading ? 'Envoi...' : 'Recevoir mon code'}
                </button>
              </div>
            ) : (
              <div>
                <label style={labelStyle}>Code a 6 chiffres</label>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', margin: '0 0 12px' }}>
                  Envoye a {email}
                </p>
                <input
                  ref={otpRef}
                  type="text"
                  inputMode="numeric"
                  value={otp}
                  onChange={(e) => handleOtpChange(e.target.value)}
                  placeholder="------"
                  maxLength={6}
                  autoFocus
                  style={{
                    ...inputStyle,
                    textAlign: 'center',
                    letterSpacing: '8px',
                    fontSize: 24,
                    fontFamily: "'JetBrains Mono', monospace",
                  }}
                />
                <button
                  onClick={() => verifyOTP(otp)}
                  disabled={otp.length < 6 || loading}
                  style={{
                    ...btnStyle,
                    opacity: (otp.length < 6 || loading) ? 0.4 : 1,
                    cursor: (otp.length < 6 || loading) ? 'not-allowed' : 'pointer',
                  }}
                >
                  {loading ? 'Verification...' : 'Me connecter'}
                </button>
                <button
                  onClick={() => { setStep('email'); setOtp(''); setError(''); setSuccess(''); }}
                  style={linkBtnStyle}
                >
                  Changer d'email
                </button>
              </div>
            )}
          </>
        )}

        {/* ===== COACH MODE ===== */}
        {mode === 'coach' && (
          <form onSubmit={handleCoachLogin}>
            <label style={labelStyle}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="coach@email.com"
              autoFocus
              style={inputStyle}
            />
            <label style={{ ...labelStyle, marginTop: 16 }}>Mot de passe</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Ton mot de passe"
              style={inputStyle}
            />
            <button
              type="submit"
              disabled={!validEmail || !password || loading}
              style={{
                ...btnStyle,
                opacity: (!validEmail || !password || loading) ? 0.4 : 1,
                cursor: (!validEmail || !password || loading) ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? 'Connexion...' : 'Me connecter'}
            </button>
            <button type="button" onClick={handleForgotPassword} style={linkBtnStyle}>
              Mot de passe oublie ?
            </button>
          </form>
        )}

        {/* Erreur / Succes */}
        {error && (
          <div style={{ marginTop: 16, padding: '12px 16px', background: 'rgba(255,107,107,0.08)', border: '1px solid rgba(255,107,107,0.2)', borderRadius: 12, fontSize: 13, color: '#ff6b6b', textAlign: 'center' }}>
            {error}
          </div>
        )}
        {success && !error && (
          <div style={{ marginTop: 16, padding: '12px 16px', background: 'rgba(2,209,186,0.08)', border: `1px solid rgba(2,209,186,0.2)`, borderRadius: 12, fontSize: 13, color: G, textAlign: 'center' }}>
            {success}
          </div>
        )}

        {/* Switch mode */}
        <div style={{ textAlign: 'center', marginTop: 40 }}>
          {mode === 'client' ? (
            <button onClick={() => { setMode('coach'); setError(''); setSuccess(''); }} style={switchStyle}>
              Tu es coach ? Espace coach
            </button>
          ) : (
            <button onClick={() => { setMode('client'); setStep('email'); setError(''); setSuccess(''); }} style={switchStyle}>
              Retour espace client
            </button>
          )}
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: 32, fontSize: 11, color: 'rgba(255,255,255,0.12)' }}>
          RB Perform — rbperform.app
        </div>
      </div>
    </div>
  );
}

// ===== STYLES =====
const labelStyle = {
  display: 'block',
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: '2px',
  textTransform: 'uppercase',
  color: 'rgba(255,255,255,0.35)',
  marginBottom: 8,
};

const inputStyle = {
  width: '100%',
  padding: '14px 16px',
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 12,
  color: '#fff',
  fontSize: 16,
  fontFamily: 'inherit',
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 0.2s',
};

const btnStyle = {
  width: '100%',
  padding: '16px',
  marginTop: 20,
  background: `linear-gradient(135deg, #02d1ba, #02d1bacc)`,
  color: '#000',
  border: 'none',
  borderRadius: 14,
  fontSize: 14,
  fontWeight: 800,
  fontFamily: "inherit",
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  boxShadow: '0 8px 24px rgba(2,209,186,0.3)',
};

const linkBtnStyle = {
  display: 'block',
  width: '100%',
  marginTop: 12,
  background: 'none',
  border: 'none',
  color: 'rgba(255,255,255,0.3)',
  fontSize: 12,
  cursor: 'pointer',
  fontFamily: 'inherit',
  textAlign: 'center',
};

const switchStyle = {
  background: 'none',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 100,
  padding: '10px 24px',
  color: 'rgba(255,255,255,0.4)',
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: 'inherit',
  transition: 'all 0.15s',
};

export default LoginScreen;

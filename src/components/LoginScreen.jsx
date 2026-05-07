import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useT } from '../lib/i18n';

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
  const t = useT();
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
        // shouldCreateUser: false — un client ne peut pas s'inscrire seul.
        // Seul le coach peut creer un compte client via "Inviter" dans le
        // dashboard. Si l'email n'existe pas, Supabase renvoie l'erreur
        // "Signups not allowed for otp" → on affiche le message no_account
        // OU on detecte une invitation pending et on offre le lien /join.
        options: { shouldCreateUser: false },
      });
      if (error) throw error;
      setStep('otp');
      setSuccess(t('login.code_sent_success') + ' ' + email);
      setTimeout(() => otpRef.current?.focus(), 100);
    } catch (e) {
      if (e.message === 'Signups not allowed for otp') {
        // Pas d'auth.users mais peut-etre une row clients (le coach a ajoute
        // le client via le dashboard mais aucun auth.users n'a ete cree —
        // cas frequent puisque addClient INSERT clients sans creer auth).
        // L'endpoint cree auth.users a la volee si clients existe ; on
        // retente immediatement signInWithOtp pour envoyer le code.
        try {
          const r = await fetch('/api/auth/check-invitation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email.trim().toLowerCase() }),
          });
          if (r.ok) {
            const data = await r.json();
            if (data.status === 'ready') {
              const { error: retryErr } = await supabase.auth.signInWithOtp({
                email: email.trim().toLowerCase(),
                options: { shouldCreateUser: false },
              });
              if (!retryErr) {
                setStep('otp');
                setSuccess(t('login.code_sent_success') + ' ' + email);
                setTimeout(() => otpRef.current?.focus(), 100);
                setLoading(false);
                return;
              }
              // Si meme apres creation auth ca echoue, message generique
              setError(retryErr.message || t('login.send_error'));
              setLoading(false);
              return;
            }
            // status: 'unknown' → vraiment pas de compte
          }
        } catch { /* fallback to no_account error */ }
        setError(t('login.no_account'));
      } else {
        setError(e.message || t('login.send_error'));
      }
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
        setError(t('login.code_invalid'));
        setOtp('');
        setTimeout(() => otpRef.current?.focus(), 100);
      } else {
        // Succes → Supabase met a jour la session, App.jsx detecte et redirige.
        // On lock la verification pour empecher tout retry qui ferait 403 sur
        // le token deja consomme.
        console.log('[OTP] success, redirecting...');
        verifiedRef.current = true;
        setSuccess(t('login.success_redirect'));
        // Filet de securite : si onAuthStateChange ne redirige pas en 1.5s,
        // on reload la page actuelle pour que React relise la session
        // (et reste sur /app.html, pas sur la landing).
        setTimeout(() => {
          if (document.body.contains(otpRef.current)) {
            window.location.reload();
          }
        }, 1500);
      }
    } catch (e) {
      console.error('[OTP] exception', e);
      setError(t('login.verify_error'));
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
        setError(t('login.bad_credentials'));
      } else {
        // Redirect vers app.html, App.jsx detecte le role et affiche le dashboard
        window.location.href = '/app.html';
      }
    } catch (e) {
      setError(t('login.connect_error'));
    }
    setLoading(false);
  };

  // ===== COACH : mot de passe oublie =====
  const handleForgotPassword = async () => {
    if (!validEmail) { setError(t('login.email_first')); return; }
    setLoading(true);
    setError('');
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        email.trim().toLowerCase(),
        { redirectTo: window.location.origin + '/#type=recovery' }
      );
      if (error) throw error;
      setSuccess(t('login.reset_email_sent'));
    } catch (e) {
      setError(e.message || t('login.error_generic'));
    }
    setLoading(false);
  };

  return (
    <div style={{
      minHeight: '100dvh', background: '#050505',
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
            {mode === 'client' ? t('login.client_zone') : t('login.coach_zone')}
          </div>
          <div style={{ fontSize: 52, fontWeight: 800, color: '#fff', letterSpacing: '-3px', lineHeight: 0.92, marginBottom: 10 }}>
            {mode === 'client' ? t('login.connection') : t('login.coach')}
            <span style={{ color: G }}>.</span>
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)', fontStyle: 'italic' }}>
            {mode === 'client' ? t('login.client_subtitle') : t('login.coach_subtitle')}
          </div>
        </div>

        {/* ===== CLIENT MODE ===== */}
        {mode === 'client' && (
          <>
            {step === 'email' ? (
              <div>
                <label style={labelStyle}>{t('login.email_label')}</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendOTP()}
                  placeholder={t('login.email_placeholder')}
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
                  {loading ? t('login.sending') : t('login.send_code')}
                </button>
              </div>
            ) : (
              <div>
                <label style={labelStyle}>{t('login.code_label')}</label>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', margin: '0 0 12px' }}>
                  {t('login.code_sent_to')} {email}
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
                  {loading ? t('login.verifying') : t('login.connect')}
                </button>
                <button
                  onClick={() => { setStep('email'); setOtp(''); setError(''); setSuccess(''); }}
                  style={linkBtnStyle}
                >
                  {t('login.change_email')}
                </button>
              </div>
            )}
          </>
        )}

        {/* ===== COACH MODE ===== */}
        {mode === 'coach' && (
          <form onSubmit={handleCoachLogin}>
            <label style={labelStyle}>{t('login.email_label')}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('login.coach_email_placeholder')}
              autoFocus
              style={inputStyle}
            />
            <label style={{ ...labelStyle, marginTop: 16 }}>{t('login.password_label')}</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('login.password_placeholder')}
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
              {loading ? t('login.connecting') : t('login.connect')}
            </button>
            <button type="button" onClick={handleForgotPassword} style={linkBtnStyle}>
              {t('login.forgot_password')}
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
              {t('login.coach_switch')}
            </button>
          ) : (
            <button onClick={() => { setMode('client'); setStep('email'); setError(''); setSuccess(''); }} style={switchStyle}>
              {t('login.client_switch')}
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

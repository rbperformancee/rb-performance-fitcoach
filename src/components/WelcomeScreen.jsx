import React, { useState } from 'react';
import { LOGO_B64 } from '../utils/logo';
import AppIcon from './AppIcon';
import haptic from '../lib/haptic';
import { useT } from '../lib/i18n';

export default function WelcomeScreen({ client, onContinue }) {
  const t = useT();
  const [visible, setVisible] = useState(true);
  const QUOTE_KEYS = ["ws.quote_1", "ws.quote_2", "ws.quote_3", "ws.quote_4"];
  const quote = t(QUOTE_KEYS[Math.floor(Math.random() * QUOTE_KEYS.length)]);

  const handleContinue = () => {
    haptic.success();
    setVisible(false);
    setTimeout(onContinue, 400);
    localStorage.setItem(`welcome_shown_${client?.id}`, '1');
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 8888,
      background: '#0d0d0d',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: 32,
      opacity: visible ? 1 : 0,
      transition: 'opacity 0.4s ease',
    }}>
      <img src={LOGO_B64} alt="RB PERFORM" style={{
        width: 80, height: 80, borderRadius: 20,
        objectFit: 'cover', objectPosition: 'center 60%',
        boxShadow: '0 0 40px rgba(2,209,186,0.3)',
        marginBottom: 32,
        animation: 'bounceIn 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards',
      }} />
      <div style={{ fontSize: 13, color: '#02d1ba', fontWeight: 700, letterSpacing: 4, marginBottom: 12 }}>
        {t("ws.eyebrow")}
      </div>
      <h1 style={{
        fontSize: 32, fontWeight: 900, color: '#f5f5f5',
        marginBottom: 8, textAlign: 'center', lineHeight: 1.2,
      }}>
        {client?.prenom || client?.name || t("ws.fallback_name")}<span style={{ color: '#02d1ba' }}>.</span>
      </h1>
      <p style={{
        fontSize: 14, color: '#6b7280', marginBottom: 40,
        textAlign: 'center', lineHeight: 1.6, maxWidth: 280,
      }}>
        {t("ws.subtitle_p1")}<br />{t("ws.subtitle_p2")}
      </p>
      <div style={{
        background: 'rgba(2,209,186,0.06)',
        border: '1px solid rgba(2,209,186,0.15)',
        borderRadius: 14, padding: '16px 20px',
        marginBottom: 40, maxWidth: 320, textAlign: 'center',
      }}>
        <p style={{ fontSize: 13, color: 'rgba(2,209,186,0.8)', fontStyle: 'italic', lineHeight: 1.6 }}>
          "{quote}"
        </p>
      </div>
      <button onClick={handleContinue} style={{
        background: '#02d1ba', color: '#0d0d0d',
        border: 'none', borderRadius: 14,
        padding: '16px 48px', fontSize: 15, fontWeight: 800,
        cursor: 'pointer', letterSpacing: 0.5,
        boxShadow: '0 4px 20px rgba(2,209,186,0.35)',
        display: 'inline-flex', alignItems: 'center', gap: 10,
      }}>
        {t("ws.cta")}
        <AppIcon name="lightning" size={16} color="#0d0d0d" strokeWidth={2.5} />
      </button>
    </div>
  );
}

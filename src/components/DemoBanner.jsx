import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

/**
 * DemoBanner — barre teal en haut quand un visiteur explore le dashboard
 * via la route /demo (compte sandbox demo@rbperform.app).
 *
 * - Compte a rebours 15 minutes
 * - A 0 : signOut + redirect vers /?demo_expired=true
 * - Bouton CTA "Demarrer mon essai" pour conversion
 * - Auto-hide quand une modale ([role="dialog"]) est ouverte, pour ne pas
 *   chevaucher le close button (bug mobile).
 *
 * Affiche par CoachDashboard quand prop isDemo === true.
 */
export default function DemoBanner({ onSignup }) {
  const [timeLeft, setTimeLeft] = useState(15 * 60);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timer);
          supabase.auth.signOut().then(() => {
            window.location.href = '/?demo_expired=true';
          });
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Hide banner while any [role="dialog"] is mounted in the DOM. Toutes
  // les modales du repo respectent deja cette convention ARIA.
  useEffect(() => {
    const check = () => setModalOpen(!!document.querySelector('[role="dialog"]'));
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.body, { childList: true, subtree: true });
    return () => obs.disconnect();
  }, []);

  if (modalOpen) return null;

  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  const timeStr = `${mins}:${secs.toString().padStart(2, '0')}`;

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0,
      zIndex: 9999,
      background: '#00C9A7',
      color: '#000',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '8px 16px',
      fontFamily: "'Inter', -apple-system, system-ui, sans-serif",
      fontSize: 11,
      fontWeight: 600,
      gap: 8,
    }}>
      <style>{`@media(max-width:768px){.demo-banner-long{display:none !important}.demo-banner-cta{display:none !important}}`}</style>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{
          background: 'rgba(0,0,0,0.15)',
          borderRadius: 100,
          padding: '2px 8px',
          fontSize: 9,
          fontWeight: 800,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          whiteSpace: 'nowrap',
        }}>
          Démo
        </div>
        <span className="demo-banner-long" style={{ opacity: 0.8, fontSize: 11 }}>
          Dashboard fictif — toutes les features actives.
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <span style={{
          opacity: 0.6,
          fontSize: 10,
          fontFamily: "'JetBrains Mono', monospace",
          whiteSpace: 'nowrap',
        }}>
          {timeStr}
        </span>
        <button
          className="demo-banner-cta"
          onClick={onSignup}
          style={{
            background: '#000',
            color: '#00C9A7',
            border: 'none',
            borderRadius: 100,
            padding: '5px 14px',
            fontSize: 9,
            fontWeight: 700,
            cursor: 'pointer',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            whiteSpace: 'nowrap',
            fontFamily: 'inherit',
          }}
        >
          Rejoindre →
        </button>
      </div>
    </div>
  );
}

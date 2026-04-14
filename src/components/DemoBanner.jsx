import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

/**
 * DemoBanner — barre teal en haut quand un visiteur explore le dashboard
 * via la route /demo (compte sandbox demo@rbperform.app).
 *
 * - Compte a rebours 15 minutes
 * - A 0 : signOut + redirect vers /?demo_expired=true
 * - Bouton CTA "Demarrer mon essai" pour conversion
 *
 * Affiche par CoachDashboard quand prop isDemo === true.
 */
export default function DemoBanner({ onSignup }) {
  const [timeLeft, setTimeLeft] = useState(15 * 60);

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

  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  const timeStr = `${mins}:${secs.toString().padStart(2, '0')}`;

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0,
      zIndex: 9999,
      background: '#02d1ba',
      color: '#000',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '10px 24px',
      fontFamily: "'DM Sans', -apple-system, sans-serif",
      fontSize: 12,
      fontWeight: 600,
      gap: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          background: 'rgba(0,0,0,0.15)',
          borderRadius: 100,
          padding: '3px 10px',
          fontSize: 9,
          fontWeight: 800,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          whiteSpace: 'nowrap',
        }}>
          Mode Démo
        </div>
        <span style={{ opacity: 0.8 }}>
          Tu explores le dashboard d'un coach fictif — toutes les features sont actives.
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
        <span style={{
          opacity: 0.6,
          fontSize: 11,
          fontFamily: "'JetBrains Mono', monospace",
          whiteSpace: 'nowrap',
        }}>
          {timeStr} restantes
        </span>
        <button
          onClick={onSignup}
          style={{
            background: '#000',
            color: '#02d1ba',
            border: 'none',
            borderRadius: 100,
            padding: '7px 18px',
            fontSize: 10,
            fontWeight: 700,
            cursor: 'pointer',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            whiteSpace: 'nowrap',
            fontFamily: 'inherit',
          }}
        >
          Démarrer mon essai →
        </button>
      </div>
    </div>
  );
}

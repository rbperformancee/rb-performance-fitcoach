import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { LOGO_B64 } from '../utils/logo';

const STEPS = [
  {
    id: 'welcome',
    title: (name) => `Bienvenue ${name} 👋`,
    subtitle: "Tu rejoins RB PERFORM. Prêt à performer ?",
    cta: "C'est parti ⚡",
    icon: null,
  },
  {
    id: 'goal',
    title: () => "Quel est ton objectif ?",
    subtitle: "Ton coach adaptera ton programme en fonction.",
    cta: "Continuer →",
    icon: '🎯',
    options: ['Prise de masse 💪', 'Perte de poids 🔥', 'Performance ⚡', 'Remise en forme 🏃', 'Autre 📋'],
  },
  {
    id: 'level',
    title: () => "Ton niveau actuel ?",
    subtitle: "Pour calibrer l'intensité de tes séances.",
    cta: "Continuer →",
    icon: '📊',
    options: ['Débutant', 'Intermédiaire', 'Avancé', 'Athlète'],
  },
  {
    id: 'sessions',
    title: () => "Combien de séances par semaine ?",
    subtitle: "Ton coach optimisera la charge de travail.",
    cta: "Continuer →",
    icon: '📅',
    options: ['2 séances', '3 séances', '4 séances', '5+ séances'],
  },
  {
    id: 'ready',
    title: (name) => `${name}, c'est parti ! 🚀`,
    subtitle: "Ton profil est configuré. Ton coach va préparer ton programme.",
    cta: "Accéder à mon programme",
    icon: '🏆',
  },
];

export default function OnboardingFlow({ client, onComplete }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [selected, setSelected] = useState(null);
  const [animating, setAnimating] = useState(false);

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;
  const name = client?.full_name?.split(' ')[0] || client?.prenom || 'Athlète';
  const progress = ((step) / (STEPS.length - 1)) * 100;

  const next = async () => {
    if (animating) return;
    if (current.options && !selected && step !== 0 && !isLast) return;

    if (selected) {
      setAnswers(prev => ({ ...prev, [current.id]: selected }));
    }

    if (isLast) {
      // Sauvegarder les réponses
      await supabase.from('clients').update({
        onboarding_done: true,
        onboarding_data: { ...answers, [current.id]: selected },
      }).eq('id', client.id);
      localStorage.setItem(`welcome_shown_${client.id}`, '1');
      onComplete();
      return;
    }

    setAnimating(true);
    setTimeout(() => {
      setStep(s => s + 1);
      setSelected(null);
      setAnimating(false);
    }, 300);
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9000,
      background: '#0d0d0d',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '24px 20px',
      opacity: animating ? 0 : 1,
      transition: 'opacity 0.3s ease',
    }}>
      {/* Progress bar */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'rgba(255,255,255,0.06)' }}>
        <div style={{ height: '100%', width: `${progress}%`, background: '#02d1ba', transition: 'width 0.5s ease', boxShadow: '0 0 10px rgba(2,209,186,0.5)' }} />
      </div>

      {/* Step indicator */}
      <div style={{ position: 'absolute', top: 16, right: 20, fontSize: 11, color: '#6b7280', fontWeight: 600 }}>
        {step + 1} / {STEPS.length}
      </div>

      {/* Logo */}
      <img src={LOGO_B64} alt="RB PERFORM" style={{
        width: step === 0 ? 90 : 48, height: step === 0 ? 90 : 48,
        borderRadius: step === 0 ? 22 : 12,
        objectFit: 'cover', objectPosition: 'center 60%',
        boxShadow: '0 0 30px rgba(2,209,186,0.25)',
        marginBottom: 28, transition: 'all 0.4s ease',
      }} />

      {/* Icon */}
      {current.icon && (
        <div style={{ fontSize: 44, marginBottom: 16, animation: 'bounceIn 0.4s ease' }}>{current.icon}</div>
      )}

      {/* Title */}
      <h1 style={{
        fontSize: step === 0 ? 30 : 24, fontWeight: 900, color: '#f5f5f5',
        textAlign: 'center', marginBottom: 10, lineHeight: 1.2,
        animation: 'fadeInUp 0.4s ease',
      }}>{current.title(name)}</h1>

      <p style={{
        fontSize: 14, color: '#6b7280', textAlign: 'center',
        marginBottom: 32, lineHeight: 1.6, maxWidth: 300,
        animation: 'fadeInUp 0.4s ease 0.05s both',
      }}>{current.subtitle}</p>

      {/* Options */}
      {current.options && (
        <div style={{ width: '100%', maxWidth: 340, display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 32 }}>
          {current.options.map((opt, i) => (
            <button key={i} onClick={() => { setSelected(opt); if (navigator.vibrate) navigator.vibrate(10); }}
              style={{
                padding: '14px 18px', borderRadius: 14, textAlign: 'left',
                background: selected === opt ? 'rgba(2,209,186,0.12)' : 'rgba(255,255,255,0.04)',
                border: `1.5px solid ${selected === opt ? '#02d1ba' : 'rgba(255,255,255,0.08)'}`,
                color: selected === opt ? '#02d1ba' : '#f5f5f5',
                fontSize: 14, fontWeight: selected === opt ? 700 : 500,
                cursor: 'pointer', transition: 'all 0.2s',
                animation: `fadeInUp 0.35s ease ${i * 0.06}s both`,
                boxShadow: selected === opt ? '0 0 20px rgba(2,209,186,0.15)' : 'none',
              }}>
              {selected === opt && <span style={{ marginRight: 8 }}>✓</span>}
              {opt}
            </button>
          ))}
        </div>
      )}

      {/* CTA Button */}
      <button onClick={next}
        disabled={current.options && !selected && step !== 0}
        style={{
          background: (!current.options || selected || step === 0) ? '#02d1ba' : 'rgba(255,255,255,0.08)',
          color: (!current.options || selected || step === 0) ? '#0d0d0d' : '#4b5563',
          border: 'none', borderRadius: 16,
          padding: '16px 48px', fontSize: 16, fontWeight: 900,
          cursor: (!current.options || selected || step === 0) ? 'pointer' : 'not-allowed',
          width: '100%', maxWidth: 340,
          boxShadow: (!current.options || selected || step === 0) ? '0 4px 20px rgba(2,209,186,0.3)' : 'none',
          transition: 'all 0.3s',
          letterSpacing: 0.5,
        }}>
        {current.cta}
      </button>

      {/* Skip */}
      {step > 0 && !isLast && (
        <button onClick={onComplete} style={{
          marginTop: 16, background: 'none', border: 'none',
          color: '#4b5563', fontSize: 12, cursor: 'pointer',
        }}>Passer l'onboarding</button>
      )}
    </div>
  );
}

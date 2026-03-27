import React, { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { supabase } from '../lib/supabase';

const stripePromise = loadStripe('pk_test_51T6ePLPFn8e7Xxh2JMIdug1cOOv0JKCl8t3UxDgIQM8hJ7P8fNVGGkwcY6cdHYUdxv78yKIVp7GdvMDhzR6Y5bSs00CMCKSBho');

const PLANS = [
  { id: '6w', name: '6 Semaines', price: 120, priceId: 'price_1TFci5PFn8e7Xxh2SR2c7IwF', color: '#02d1ba', popular: false,
    features: ["Programme complet 6 semaines", "Suivi dans l'app", "Messagerie avec Rayan", "Accès aux outils"] },
  { id: '3m', name: '3 Mois', price: 220, priceId: 'price_1TFciXPFn8e7Xxh29EG0h22o', color: '#a78bfa', popular: true,
    features: ["Programme complet 3 mois", "Suivi dans l'app", "Messagerie avec Rayan", "Accès aux outils", "Ajustements mensuels"] },
  { id: '6m', name: '6 Mois', price: 400, priceId: 'price_1TFcjEPFn8e7Xxh2LTH3GAnJ', color: '#fbbf24', popular: false,
    features: ["Programme complet 6 mois", "Suivi dans l'app", "Messagerie avec Rayan", "Accès aux outils", "Ajustements mensuels", "Bilan final complet"] },
];

export default function PricingPage({ client, onClose }) {
  const [loading, setLoading] = useState(null);

  const handleCheckout = async (plan) => {
    setLoading(plan.id);
    if (navigator.vibrate) navigator.vibrate(20);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('https://pwkajyrpldhlybavmopd.supabase.co/functions/v1/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}`, 'apikey': process.env.REACT_APP_SUPABASE_ANON_KEY },
        body: JSON.stringify({ priceId: plan.priceId, clientEmail: client?.email, clientId: client?.id, planName: plan.name }),
      });
      const { url, error } = await res.json();
      if (error) throw new Error(error);
      window.location.href = url;
    } catch(e) { alert('Erreur: ' + e.message); }
    setLoading(null);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9000, background: '#0d0d0d', overflowY: 'auto', padding: '24px 20px 40px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <h1 style={{ fontSize: 26, fontWeight: 900, color: '#f5f5f5', letterSpacing: '-1px' }}>Choisis ton programme</h1>
        {onClose && <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 10, padding: '8px 14px', color: '#6b7280', cursor: 'pointer' }}>✕</button>}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 380, margin: '0 auto' }}>
        {PLANS.map((plan, i) => (
          <div key={plan.id} style={{ background: plan.popular ? 'rgba(167,139,250,0.06)' : 'rgba(255,255,255,0.03)', border: `1.5px solid ${plan.popular ? 'rgba(167,139,250,0.3)' : 'rgba(255,255,255,0.07)'}`, borderRadius: 20, padding: '20px', position: 'relative', animation: `fadeInUp 0.4s ease ${i * 0.1}s both` }}>
            {plan.popular && <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: '#a78bfa', color: '#0d0d0d', fontSize: 10, fontWeight: 900, padding: '4px 14px', borderRadius: 20, whiteSpace: 'nowrap' }}>⭐ LE PLUS POPULAIRE</div>}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 900, color: '#f5f5f5' }}>{plan.name}</div>
                <div style={{ fontSize: 11, color: '#6b7280' }}>Accès {plan.name.toLowerCase()}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 32, fontWeight: 900, color: plan.color }}>{plan.price}€</div>
                <div style={{ fontSize: 10, color: '#6b7280' }}>TTC · paiement unique</div>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 18 }}>
              {plan.features.map((f, fi) => (
                <div key={fi} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 16, height: 16, borderRadius: '50%', background: plan.color + '20', border: '1px solid ' + plan.color + '40', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: plan.color }}>✓</div>
                  <span style={{ fontSize: 13, color: '#9ca3af' }}>{f}</span>
                </div>
              ))}
            </div>
            <button onClick={() => handleCheckout(plan)} disabled={loading === plan.id}
              style={{ width: '100%', padding: '15px', background: plan.popular ? plan.color : 'transparent', border: `1.5px solid ${plan.color}`, borderRadius: 14, color: plan.popular ? '#0d0d0d' : plan.color, fontSize: 14, fontWeight: 800, cursor: 'pointer' }}>
              {loading === plan.id ? 'Chargement...' : `Commencer — ${plan.price}€`}
            </button>
          </div>
        ))}
      </div>
      <p style={{ textAlign: 'center', fontSize: 11, color: '#374151', marginTop: 24 }}>🔒 Paiement sécurisé par Stripe · TVA non applicable art. 293B CGI</p>
    </div>
  );
}
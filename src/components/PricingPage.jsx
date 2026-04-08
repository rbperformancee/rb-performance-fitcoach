import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { supabase } from '../lib/supabase';

const stripePromise = loadStripe('pk_test_51T6ePLPFn8e7Xxh2JMIdug1cOOv0JKCl8t3UxDgIQM8hJ7P8fNVGGkwcY6cdHYUdxv78yKIVp7GdvMDhzR6Y5bSs00CMCKSBho');

const PLANS = [
  { id: '3m', name: '3 Mois', duration: '3 mois', price: 120, total: 360, priceId: 'price_1TJtzFPFn8e7Xxh2TSniccr6', color: '#02d1ba', popular: false, savings: null, badge: null,
    features: ["Programme personnalisé 3 mois","Séance Vivante — coach en direct","Suivi poids · nutrition · cardio","Messagerie avec Rayan","App mobile premium"] },
  { id: '6m', name: '6 Mois', duration: '6 mois', price: 110, total: 660, priceId: 'price_1TJtzaPFn8e7Xxh21ah74mco', color: '#a78bfa', popular: true, savings: 'Économise 60€', badge: '⭐ Le plus populaire',
    features: ["Programme personnalisé 6 mois","Séance Vivante — coach en direct","Suivi poids · nutrition · cardio","Messagerie prioritaire avec Rayan","Ajustements mensuels garantis","App mobile premium"] },
  { id: '12m', name: '12 Mois', duration: '12 mois', price: 100, total: 1200, priceId: 'price_1TJu06PFn8e7Xxh2IOJFQx6t', color: '#fbbf24', popular: false, savings: 'Économise 240€', badge: '🏆 Meilleure valeur',
    features: ["Programme personnalisé 12 mois","Séance Vivante — coach en direct","Suivi poids · nutrition · cardio","Messagerie VIP 7j/7 avec Rayan","Ajustements mensuels garantis","Bilan transformation complet","App mobile premium"] },
];

const GENERAL = { id: 'general', name: 'Programme 8 Semaines', price: 39, priceId: 'price_1TJu3fPFn8e7Xxh2aBOJshzr',
  features: ["Programme général 8 semaines","Accès complet à l'app premium","Suivi poids · nutrition · cardio","Sans engagement · résiliable à tout moment"] };

const TESTIMONIALS = [
  { quote: "Je n'aurais jamais cru voir ces résultats aussi vite. L'app change tout.", name: "Thomas, 24 ans", result: "− 12 kg en 3 mois", color: "#02d1ba" },
  { quote: "La Séance Vivante c'est dingue. Rayan est là comme si il était dans la salle.", name: "Léa, 28 ans", result: "+ 8 kg de muscle", color: "#a78bfa" },
  { quote: "L'app la plus premium que j'ai utilisée. Rien ne lui ressemble sur le marché.", name: "Mehdi, 31 ans", result: "Record battu S4", color: "#fbbf24" },
];

const CSS = `
  @keyframes orb1{0%,100%{transform:translate(0,0) scale(1)}25%{transform:translate(40px,-30px) scale(1.08)}50%{transform:translate(-20px,40px) scale(0.95)}75%{transform:translate(30px,20px) scale(1.05)}}
  @keyframes orb2{0%,100%{transform:translate(0,0)}33%{transform:translate(-50px,30px)}66%{transform:translate(30px,-40px)}}
  @keyframes orb3{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(20px,30px) scale(1.1)}}
  @keyframes scan{0%{transform:translateY(-100%)}100%{transform:translateY(2000%)}}
  @keyframes blink{0%,100%{opacity:1}50%{opacity:0.2}}
  @keyframes shine{0%{left:-150%}100%{left:200%}}
  @keyframes gradShift{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}
  .rbcard{transition:transform 0.4s cubic-bezier(0.34,1.56,0.64,1);}
  .rbcard:hover{transform:translateY(-8px) scale(1.015)!important}
  .rbcard:active{transform:scale(0.97)!important}
  .rbbtn{transition:all 0.35s cubic-bezier(0.34,1.56,0.64,1);}
  .rbbtn:hover{transform:scale(1.02)!important;opacity:0.95}
  .rbbtn:active{transform:scale(0.97)!important}
`;

export default function PricingPage({ client, onClose, showGeneral = false }) {
  const [loading, setLoading] = useState(null);
  const [tab, setTab] = useState(showGeneral ? 'general' : 'team');
  const [cd, setCd] = useState({ h: 23, m: 47, s: 12 });

  useEffect(() => {
    const t = setInterval(() => setCd(p => {
      let { h, m, s } = p;
      s--; if (s < 0) { s = 59; m--; } if (m < 0) { m = 59; h--; } if (h < 0) { h = 23; m = 59; s = 59; }
      return { h, m, s };
    }), 1000);
    return () => clearInterval(t);
  }, []);

  const pad = n => String(n).padStart(2, '0');

  const handleCheckout = async (plan) => {
    setLoading(plan.id);
    if (navigator.vibrate) navigator.vibrate([20, 10, 20]);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('https://pwkajyrpldhlybavmopd.supabase.co/functions/v1/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}`, 'apikey': 'sb_publishable_WbG1gs6l7XP6aHH_UqR0Hw_XLSI50ud' },
        body: JSON.stringify({ priceId: plan.priceId, clientEmail: client?.email, clientId: client?.id, planName: plan.name, planId: plan.id }),
      });
      const { url, error } = await res.json();
      if (error) throw new Error(error);
      window.location.href = url;
    } catch(e) { alert('Erreur: ' + e.message); }
    setLoading(null);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9000, overflowY: 'auto', background: '#000', fontFamily: '-apple-system,Inter,sans-serif', color: '#fff' }}>
      <style>{CSS}</style>

      {/* BG */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(2,209,186,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(2,209,186,0.04) 1px,transparent 1px)', backgroundSize: '44px 44px' }} />
        {[{ w: 600, h: 600, t: -200, l: '50%', ml: '-300px', c: 'rgba(2,209,186,0.2)', a: 'orb1 14s' },
          { w: 450, h: 450, t: 150, l: '-120px', c: 'rgba(167,139,250,0.12)', a: 'orb2 18s' },
          { w: 380, h: 380, t: 300, r: '-100px', c: 'rgba(251,191,36,0.09)', a: 'orb3 22s' }].map((o, i) => (
          <div key={i} style={{ position: 'absolute', width: o.w, height: o.h, top: o.t, left: o.l, right: o.r, marginLeft: o.ml, background: `radial-gradient(circle,${o.c},transparent 65%)`, borderRadius: '50%', filter: 'blur(90px)', animation: `${o.a} ease-in-out infinite` }} />
        ))}
        <div style={{ position: 'absolute', left: 0, right: 0, height: 1, background: 'linear-gradient(90deg,transparent,rgba(2,209,186,0.3),transparent)', animation: 'scan 10s linear infinite' }} />
      </div>

      <div style={{ position: 'relative', zIndex: 10, maxWidth: 440, margin: '0 auto', padding: '0 0 60px' }}>

        {/* HERO */}
        <div style={{ textAlign: 'center', padding: '44px 24px 32px', position: 'relative' }}>
          {onClose && <button onClick={onClose} style={{ position: 'absolute', top: 20, right: 20, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '50%', width: 36, height: 36, color: 'rgba(255,255,255,0.4)', fontSize: 16, cursor: 'pointer' }}>✕</button>}

          <h1 style={{ fontSize: 'clamp(44px,10vw,72px)', fontWeight: 900, lineHeight: 0.85, letterSpacing: -4, marginBottom: 22 }}>
            <span style={{ display: 'block', color: '#fff' }}>La Performance</span>
            <span style={{ display: 'block', background: 'linear-gradient(135deg,#02d1ba,#a78bfa,#fbbf24,#02d1ba)', backgroundSize: '300%', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', animation: 'gradShift 4s ease infinite' }}>N'Attend Pas.</span>
          </h1>

          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.28)', maxWidth: 280, margin: '0 auto 24px', lineHeight: 1.9 }}>Un coach. Une app unique. Des résultats qui parlent d'eux-mêmes.</p>

          {/* STATS */}
          <div style={{ display: 'flex', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 16, overflow: 'hidden', maxWidth: 340, margin: '0 auto 24px' }}>
            {[{ n: '47+', l: 'Athlètes', c: '#02d1ba' }, { n: '94%', l: 'Résultats', c: '#a78bfa' }, { n: '4.9★', l: 'Satisfaction', c: '#fbbf24' }].map((s, i) => (
              <div key={i} style={{ flex: 1, padding: '14px 12px', textAlign: 'center', borderRight: i < 2 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                <div style={{ fontSize: 22, fontWeight: 100, letterSpacing: -1, color: s.c }}>{s.n}</div>
                <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', letterSpacing: 1.5, marginTop: 3 }}>{s.l}</div>
              </div>
            ))}
          </div>

          {/* PROOF */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 28 }}>
            <div style={{ display: 'flex' }}>
              {['#02d1ba','#a78bfa','#fbbf24','#ef4444','#34d399'].map((c, i) => (
                <div key={i} style={{ width: 32, height: 32, borderRadius: '50%', border: '2px solid rgba(0,0,0,0.8)', marginLeft: i ? -10 : 0, background: `linear-gradient(135deg,${c},${c}88)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: '#000' }}>
                  {['T','L','M','S','K'][i]}
                </div>
              ))}
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', lineHeight: 1.5, textAlign: 'left' }}>
              <span style={{ color: '#02d1ba', display: 'block', fontWeight: 700 }}>+47 transformations réelles</span>
              cette année avec RB Perform
            </div>
          </div>

          {/* TABS */}
          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 100, padding: 4, maxWidth: 340, margin: '0 auto 28px', gap: 4 }}>
            {[{ id: 'team', label: 'Team RB Perform', g: '#02d1ba,#0891b2' }, { id: 'general', label: 'Programme Général', g: '#34d399,#10b981' }].map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{ flex: 1, padding: '12px 8px', borderRadius: 100, border: 'none', background: tab === t.id ? `linear-gradient(135deg,${t.g})` : 'transparent', color: tab === t.id ? '#000' : 'rgba(255,255,255,0.25)', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: '-apple-system,Inter,sans-serif', transition: 'all 0.4s cubic-bezier(0.34,1.56,0.64,1)' }}>{t.label}</button>
            ))}
          </div>

          {/* COUNTDOWN */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 4 }}>
            {[{ v: pad(cd.h), l: 'heures' }, { v: pad(cd.m), l: 'min' }, { v: pad(cd.s), l: 'sec' }].map((d, i) => (
              <React.Fragment key={i}>
                {i > 0 && <span style={{ fontSize: 18, color: 'rgba(239,68,68,0.3)', fontWeight: 100 }}>:</span>}
                <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 10, padding: '8px 12px', textAlign: 'center', minWidth: 48 }}>
                  <div style={{ fontSize: 20, fontWeight: 100, color: '#ef4444', letterSpacing: -1 }}>{d.v}</div>
                  <div style={{ fontSize: 7, color: 'rgba(239,68,68,0.4)', textTransform: 'uppercase', letterSpacing: 1.5, marginTop: 2 }}>{d.l}</div>
                </div>
              </React.Fragment>
            ))}
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.18)', letterSpacing: 1, marginLeft: 4 }}>avant fermeture</span>
          </div>
        </div>

        {/* TEAM */}
        {tab === 'team' && (
          <div>
            <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              {PLANS.map((plan, pi) => (
                <div key={plan.id} className="rbcard" style={{ borderRadius: 26, padding: '26px 22px', position: 'relative', overflow: 'hidden', cursor: 'pointer', background: plan.popular ? 'rgba(167,139,250,0.04)' : 'rgba(255,255,255,0.02)', border: plan.popular ? '2px solid rgba(167,139,250,0.35)' : '1px solid rgba(255,255,255,0.07)' }}>
                  {plan.popular && <div style={{ position: 'absolute', inset: -2, borderRadius: 28, background: 'linear-gradient(135deg,rgba(167,139,250,0.4),rgba(139,92,246,0.2),rgba(167,139,250,0.4))', zIndex: -1, filter: 'blur(8px)', opacity: 0.5 }} />}
                  <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse at 90% -10%,${plan.color}18,transparent 55%)`, pointerEvents: 'none' }} />
                  <div style={{ position: 'absolute', top: 0, bottom: 0, width: 80, background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.025),transparent)', pointerEvents: 'none', animation: `shine ${4 + pi * 1.5}s ease-in-out infinite`, animationDelay: `${-pi * 1.5}s` }} />

                  {plan.badge && (
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, borderRadius: 100, padding: '5px 14px', fontSize: 9, fontWeight: 800, letterSpacing: 2, marginBottom: 18, textTransform: 'uppercase', background: plan.popular ? 'linear-gradient(135deg,rgba(167,139,250,0.15),rgba(139,92,246,0.1))' : 'rgba(251,191,36,0.08)', border: plan.popular ? '1px solid rgba(167,139,250,0.35)' : '1px solid rgba(251,191,36,0.2)', color: plan.popular ? '#c4b5fd' : '#fde68a' }}>
                      {plan.badge}
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, position: 'relative' }}>
                    <div>
                      <div style={{ fontSize: 19, fontWeight: 800, color: '#fff', letterSpacing: -0.5, marginBottom: 5 }}>{plan.name}</div>
                      <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.18)', letterSpacing: 2, textTransform: 'uppercase' }}>{plan.duration} · engagement</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: 52, fontWeight: 100, color: plan.color, letterSpacing: -3, lineHeight: 0.82 }}>{plan.price}</span>
                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.22)', display: 'block', marginTop: 8 }}>€ par mois</span>
                      <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.12)', display: 'block', marginTop: 3 }}>soit {plan.total}€ au total</span>
                      {plan.savings && <span style={{ fontSize: 10, fontWeight: 700, color: plan.color, display: 'block', marginTop: 5 }}>{plan.savings}</span>}
                    </div>
                  </div>

                  <div style={{ height: 1, background: `linear-gradient(90deg,${plan.color}50,transparent)`, opacity: 0.35, margin: '0 0 20px' }} />

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 11, marginBottom: 22 }}>
                    {plan.features.map((f, fi) => (
                      <div key={fi} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: 'rgba(255,255,255,0.42)' }}>
                        <div style={{ width: 20, height: 20, borderRadius: '50%', background: `${plan.color}18`, border: `1px solid ${plan.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, color: plan.color, flexShrink: 0 }}>✓</div>
                        {f}
                      </div>
                    ))}
                  </div>

                  <button className="rbbtn" onClick={() => handleCheckout(plan)} disabled={loading === plan.id} style={{ width: '100%', padding: 17, borderRadius: 16, fontSize: 14, fontWeight: 800, cursor: 'pointer', letterSpacing: -0.3, position: 'relative', overflow: 'hidden', fontFamily: '-apple-system,Inter,sans-serif', border: 'none', background: plan.popular ? 'linear-gradient(135deg,#a78bfa,#8b5cf6,#7c3aed)' : 'transparent', color: plan.popular ? '#fff' : plan.color, boxShadow: plan.popular ? '0 8px 30px rgba(139,92,246,0.3)' : 'none', outline: plan.popular ? 'none' : `1.5px solid ${plan.color}40` }}>
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg,rgba(255,255,255,0.12) 0%,transparent 60%)', pointerEvents: 'none' }} />
                    {loading === plan.id ? 'Chargement...' : `Commencer — ${plan.price}€/mois →`}
                  </button>

                  {plan.popular && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 12 }}>
                      <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#ef4444', animation: 'blink 1.2s ease-in-out infinite' }} />
                      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>Plus que <span style={{ color: '#ef4444', fontWeight: 700 }}>3 places</span> ce mois</div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div style={{ padding: '24px 16px 0' }}>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.15)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 14, textAlign: 'center' }}>Ce qu'ils disent</div>
              <div style={{ display: 'flex', gap: 12, overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: 4 }}>
                {TESTIMONIALS.map((t, i) => (
                  <div key={i} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 18, padding: 16, minWidth: 220, flexShrink: 0 }}>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 1.7, marginBottom: 12, fontStyle: 'italic' }}>"{t.quote}"</div>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>{t.name}</div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: t.color, marginTop: 2 }}>{t.result}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ margin: '20px 16px 0', padding: '18px 20px', background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 18, display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 42, height: 42, borderRadius: '50%', background: 'rgba(2,209,186,0.07)', border: '1px solid rgba(2,209,186,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>🔒</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.22)', lineHeight: 1.7 }}>
                <strong style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12, display: 'block', marginBottom: 2 }}>Paiement 100% sécurisé par Stripe</strong>
                SSL · Sans engagement caché · TVA non applicable art. 293B CGI
              </div>
            </div>
            <div style={{ textAlign: 'center', padding: '16px 24px 28px', fontSize: 9, color: 'rgba(255,255,255,0.08)', letterSpacing: 2, textTransform: 'uppercase' }}>Stripe · SSL · Visa · Mastercard · Apple Pay</div>
          </div>
        )}

        {/* GENERAL */}
        {tab === 'general' && (
          <div style={{ padding: '0 16px' }}>
            <div style={{ background: 'rgba(52,211,153,0.02)', border: '1.5px solid rgba(52,211,153,0.15)', borderRadius: 26, padding: '26px 22px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 90% -10%,rgba(52,211,153,0.14),transparent 55%)', pointerEvents: 'none' }} />
              <div style={{ position: 'relative' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                  <div>
                    <div style={{ fontSize: 19, fontWeight: 800, color: '#fff', letterSpacing: -0.5, marginBottom: 5 }}>{GENERAL.name}</div>
                    <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.18)', letterSpacing: 2, textTransform: 'uppercase' }}>2 mois · sans engagement</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: 52, fontWeight: 100, color: '#34d399', letterSpacing: -3, lineHeight: 0.82 }}>39</span>
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.22)', display: 'block', marginTop: 8 }}>€ par mois</span>
                    <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.12)', display: 'block', marginTop: 3 }}>accès coupé après 8 sem.</span>
                  </div>
                </div>
                <div style={{ height: 1, background: 'linear-gradient(90deg,rgba(52,211,153,0.4),transparent)', opacity: 0.3, margin: '0 0 20px' }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 11, marginBottom: 22 }}>
                  {GENERAL.features.map((f, fi) => (
                    <div key={fi} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: 'rgba(255,255,255,0.42)' }}>
                      <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, color: '#34d399', flexShrink: 0 }}>✓</div>
                      {f}
                    </div>
                  ))}
                </div>
                <button className="rbbtn" onClick={() => handleCheckout(GENERAL)} disabled={loading === GENERAL.id} style={{ width: '100%', padding: 17, borderRadius: 16, background: 'linear-gradient(135deg,#34d399,#10b981)', border: 'none', color: '#000', fontSize: 14, fontWeight: 800, cursor: 'pointer', fontFamily: '-apple-system,Inter,sans-serif', position: 'relative', overflow: 'hidden', boxShadow: '0 8px 30px rgba(52,211,153,0.2)' }}>
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg,rgba(255,255,255,0.15),transparent 50%)', pointerEvents: 'none' }} />
                  {loading === GENERAL.id ? 'Chargement...' : 'Commencer — 39€/mois →'}
                </button>
              </div>
            </div>

            <div onClick={() => setTab('team')} style={{ marginTop: 12, padding: '16px 18px', background: 'rgba(2,209,186,0.02)', border: '1px solid rgba(2,209,186,0.08)', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#02d1ba', marginBottom: 3 }}>Prêt pour l'élite ?</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.18)' }}>Coaching perso avec Rayan — résultats garantis</div>
              </div>
              <div style={{ color: '#02d1ba', fontSize: 22 }}>→</div>
            </div>

            <div style={{ margin: '12px 0 0', padding: '18px 20px', background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 18, display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 42, height: 42, borderRadius: '50%', background: 'rgba(2,209,186,0.07)', border: '1px solid rgba(2,209,186,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>🔒</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.22)', lineHeight: 1.7 }}>
                <strong style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12, display: 'block', marginBottom: 2 }}>Paiement 100% sécurisé</strong>
                SSL · Sans engagement · Résiliable à tout moment
              </div>
            </div>
            <div style={{ textAlign: 'center', padding: '16px 24px 28px', fontSize: 9, color: 'rgba(255,255,255,0.08)', letterSpacing: 2, textTransform: 'uppercase' }}>Stripe · SSL · Paiement sécurisé</div>
          </div>
        )}
      </div>
    </div>
  );
}

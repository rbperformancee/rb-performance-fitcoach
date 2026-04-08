import React, { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { supabase } from '../lib/supabase';

const stripePromise = loadStripe('pk_test_51T6ePLPFn8e7Xxh2JMIdug1cOOv0JKCl8t3UxDgIQM8hJ7P8fNVGGkwcY6cdHYUdxv78yKIVp7GdvMDhzR6Y5bSs00CMCKSBho');

const PLANS = [
  { id: '3m', name: '3 Mois', duration: '3 mois', price: 120, total: 360, priceId: 'price_1TJtzFPFn8e7Xxh2TSniccr6', color: '#02d1ba', btnClass: 'b1', popular: false, savings: null, badge: null,
    features: ["Programme sur mesure 3 mois","Séance Vivante — coach en direct","Suivi complet dans l'app","Messagerie avec Rayan"] },
  { id: '6m', name: '6 Mois', duration: '6 mois', price: 110, total: 660, priceId: 'price_1TJtzaPFn8e7Xxh21ah74mco', color: '#a78bfa', btnClass: 'b2', popular: true, savings: '− 60€ vs 3 mois', badge: 'Le plus populaire',
    features: ["Programme sur mesure 6 mois","Séance Vivante — coach en direct","Suivi complet dans l'app","Messagerie prioritaire avec Rayan","Ajustements mensuels garantis"] },
  { id: '12m', name: '12 Mois', duration: '12 mois', price: 100, total: 1200, priceId: 'price_1TJu06PFn8e7Xxh2IOJFQx6t', color: '#fbbf24', btnClass: 'b3', popular: false, savings: '− 240€ vs 3 mois', badge: null,
    features: ["Programme sur mesure 12 mois","Séance Vivante — coach en direct","Suivi complet dans l'app","Messagerie VIP 7j/7","Ajustements mensuels garantis","Bilan transformation complet"] },
];

const GENERAL = { id: 'general', name: '8 Semaines', price: 39, priceId: 'price_1TJu3fPFn8e7Xxh2aBOJshzr',
  features: ["Programme général 8 semaines","Accès complet à l'app premium","Suivi poids · nutrition · cardio","Résiliable à tout moment"] };

const TESTIMONIALS = [
  { quote: "Je n'aurais jamais cru voir ces résultats aussi vite. L'app change tout.", name: "Thomas, 24 ans", result: "− 12 kg en 3 mois", color: "#02d1ba" },
  { quote: "La Séance Vivante c'est dingue. Rayan est là comme si il était dans la salle.", name: "Léa, 28 ans", result: "+ 8 kg de muscle", color: "#a78bfa" },
  { quote: "L'app la plus premium que j'ai utilisée. Rien ne lui ressemble sur le marché.", name: "Mehdi, 31 ans", result: "Record battu S4", color: "#fbbf24" },
];

const CSS = `
  @keyframes orb1{0%,100%{transform:translate(-50%,0)}50%{transform:translate(-50%,-20px)}}
  @keyframes orb2{0%,100%{transform:translate(0,0)}50%{transform:translate(-20px,20px)}}
  @keyframes gradShift{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}
  @keyframes tealPulse{0%{color:#02d1ba;text-shadow:0 0 0px rgba(2,209,186,0)}15%{color:#5ee8d4;text-shadow:0 0 30px rgba(2,209,186,0.8),0 0 60px rgba(2,209,186,0.4),0 0 100px rgba(2,209,186,0.2)}30%{color:#02d1ba;text-shadow:0 0 10px rgba(2,209,186,0.2)}50%{color:#7ff5e8;text-shadow:0 0 40px rgba(2,209,186,1),0 0 80px rgba(2,209,186,0.5),0 0 120px rgba(2,209,186,0.3)}70%{color:#02d1ba;text-shadow:0 0 5px rgba(2,209,186,0.1)}85%{color:#3de0cf;text-shadow:0 0 20px rgba(2,209,186,0.5),0 0 40px rgba(2,209,186,0.2)}100%{color:#02d1ba;text-shadow:0 0 0px rgba(2,209,186,0)}}
  @keyframes shine{0%{left:-100%}100%{left:200%}}
  @keyframes fadeUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}
  .rbcard{transition:transform 0.4s cubic-bezier(0.34,1.56,0.64,1),box-shadow 0.4s;}
  .rbcard:hover{transform:translateY(-5px)!important}
  .rbbtn{transition:all 0.3s;display:block;width:100%;padding:17px;font-size:13px;font-weight:800;cursor:pointer;font-family:-apple-system,Inter,sans-serif;letter-spacing:0.5px;text-transform:uppercase;border:none;text-align:center;position:relative;overflow:hidden;}
  .rbbtn::before{content:'';position:absolute;inset:0;background:linear-gradient(135deg,rgba(255,255,255,0.12),transparent 50%);pointer-events:none;}
  .rbbtn:hover{opacity:0.9;}
  .rbbtn:active{opacity:0.8;transform:scale(0.99);}
  .b1{background:linear-gradient(135deg,#02d1ba,#0891b2);color:#000;border-radius:0 0 18px 18px;}
  .b2{background:linear-gradient(135deg,#a78bfa,#7c3aed);color:#fff;border-radius:0 0 18px 18px;}
  .b3{background:linear-gradient(135deg,#fbbf24,#f59e0b);color:#000;border-radius:0 0 18px 18px;}
  .bgn{background:linear-gradient(135deg,#34d399,#10b981);color:#000;border-radius:0 0 18px 18px;width:100%;padding:17px;font-size:13px;font-weight:800;cursor:pointer;font-family:-apple-system,Inter,sans-serif;letter-spacing:0.5px;text-transform:uppercase;border:none;text-align:center;display:block;transition:all 0.3s;}
  .bgn:hover{opacity:0.9;}
  .shine{position:absolute;top:0;bottom:0;width:60px;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.02),transparent);pointer-events:none;animation:shine 6s ease-in-out infinite;}
`;

export default function PricingPage({ client, onClose, onLogin }) {
  const [loading, setLoading] = useState(null);
  const [tab, setTab] = useState('team');

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

  const S = {
    wrap: { position: 'fixed', inset: 0, zIndex: 9000, overflowY: 'auto', background: '#000', fontFamily: '-apple-system,Inter,sans-serif', color: '#fff' },
    inner: { position: 'relative', zIndex: 10, maxWidth: 400, margin: '0 auto', padding: '56px 24px 80px' },
    plan: (bg, border) => ({ background: bg, border, borderRadius: 20, overflow: 'hidden', cursor: 'pointer', marginBottom: 16, position: 'relative' }),
    planBody: { padding: '24px 24px 20px' },
    sep: (c) => ({ height: 1, background: `linear-gradient(90deg,${c},transparent)`, opacity: 0.25, marginBottom: 20 }),
    feat: { display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: 'rgba(255,255,255,0.35)', marginBottom: 11 },
    dot: (c) => ({ width: 4, height: 4, borderRadius: '50%', background: c, flexShrink: 0 }),
  };

  return (
    <div style={S.wrap}>
      <style>{CSS}</style>

      {/* BG orbs */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(2,209,186,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(2,209,186,0.04) 1px,transparent 1px)', backgroundSize: '44px 44px' }} />
        <div style={{ position: 'absolute', width: 700, height: 700, top: -300, left: '50%', background: 'radial-gradient(circle,rgba(2,209,186,0.12),transparent 60%)', borderRadius: '50%', filter: 'blur(100px)', animation: 'orb1 20s ease-in-out infinite' }} />
        <div style={{ position: 'absolute', width: 400, height: 400, top: 400, right: -150, background: 'radial-gradient(circle,rgba(167,139,250,0.07),transparent 60%)', borderRadius: '50%', filter: 'blur(80px)', animation: 'orb2 25s ease-in-out infinite' }} />
      </div>

      <div style={S.inner}>
        {onClose && <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '50%', width: 36, height: 36, color: 'rgba(255,255,255,0.4)', fontSize: 16, cursor: 'pointer' }}>✕</button>}

        {/* HERO */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 9, letterSpacing: 5, textTransform: 'uppercase', color: 'rgba(2,209,186,0.5)', marginBottom: 24 }}>RB Perform · Programme d'élite</div>
          <h1 style={{ fontSize: 'clamp(44px,10vw,64px)', fontWeight: 900, lineHeight: 0.88, letterSpacing: -4, marginBottom: 20 }}>
            <span style={{ display: 'block', color: '#fff' }}>La Performance</span>
            <span style={{ display: 'block', animation: 'tealPulse 4s cubic-bezier(0.45,0,0.55,1) infinite' }}>N'Attend Pas.</span>
          </h1>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.28)', lineHeight: 1.9, marginBottom: 28 }}>
            Un athlète de haut niveau. Une app unique.<br />Des résultats qui parlent d'eux-mêmes.
          </p>

          {/* PROOF */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, marginBottom: 32 }}>
            <div style={{ display: 'flex' }}>
              {['#02d1ba','#a78bfa','#fbbf24','#ef4444','#34d399'].map((c, i) => (
                <div key={i} style={{ width: 32, height: 32, borderRadius: '50%', border: '2px solid rgba(0,0,0,0.8)', marginLeft: i ? -10 : 0, background: `linear-gradient(135deg,${c},${c}88)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: '#000', flexShrink: 0 }}>
                  {['T','L','M','S','K'][i]}
                </div>
              ))}
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', lineHeight: 1.6, textAlign: 'left' }}>
              <span style={{ color: '#02d1ba', display: 'block', fontWeight: 700 }}>+30 transformations réelles</span>
              cette année avec RB Perform
            </div>
          </div>
        </div>

        <div style={{ height: 1, background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.08),transparent)', marginBottom: 32 }} />

        {/* TABS */}
        <div style={{ display: 'flex', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, overflow: 'hidden', marginBottom: 40 }}>
          {[{ id: 'team', label: 'Team RB Perform' }, { id: 'general', label: 'Programme Général' }].map((t, i) => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ flex: 1, padding: 14, background: tab === t.id ? 'rgba(255,255,255,0.04)' : 'transparent', border: 'none', borderRight: i === 0 ? '1px solid rgba(255,255,255,0.07)' : 'none', color: tab === t.id ? '#fff' : 'rgba(255,255,255,0.25)', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: '-apple-system,Inter,sans-serif', transition: 'all 0.3s' }}>{t.label}</button>
          ))}
        </div>

        {/* TEAM */}
        {tab === 'team' && (
          <div>
            {PLANS.map((plan, pi) => (
              <div key={plan.id} className="rbcard" style={S.plan(
                plan.popular ? 'rgba(167,139,250,0.03)' : pi === 2 ? 'rgba(251,191,36,0.02)' : 'rgba(255,255,255,0.02)',
                plan.popular ? '1px solid rgba(167,139,250,0.2)' : pi === 2 ? '1px solid rgba(251,191,36,0.1)' : '1px solid rgba(255,255,255,0.06)'
              )}>
                <div className="shine" style={{ animationDelay: `${-pi * 2}s` }} />
                <div style={S.planBody}>
                  {plan.badge && <div style={{ display: 'inline-block', fontSize: 8, letterSpacing: 2, textTransform: 'uppercase', color: plan.color, background: `${plan.color}12`, border: `1px solid ${plan.color}25`, borderRadius: 100, padding: '4px 12px', marginBottom: 16 }}>{plan.badge}</div>}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                    <div>
                      <div style={{ fontSize: 20, fontWeight: 800, color: '#fff', letterSpacing: -0.5 }}>{plan.name}</div>
                      <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', letterSpacing: 2, textTransform: 'uppercase', marginTop: 5 }}>{plan.duration} · engagement</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: 48, fontWeight: 100, color: plan.color, letterSpacing: -3, lineHeight: 0.85 }}>{plan.price}</span>
                      <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', display: 'block', marginTop: 6 }}>€ / mois</span>
                      {plan.savings && <span style={{ fontSize: 10, fontWeight: 600, color: plan.color, display: 'block', marginTop: 4 }}>{plan.savings}</span>}
                    </div>
                  </div>
                  <div style={S.sep(plan.color)} />
                  <div style={{ marginBottom: 4 }}>
                    {plan.features.map((f, fi) => (
                      <div key={fi} style={S.feat}><div style={S.dot(plan.color)} />{f}</div>
                    ))}
                  </div>
                </div>
                <button className={`rbbtn ${plan.btnClass}`} onClick={() => handleCheckout(plan)} disabled={loading === plan.id}>
                  {loading === plan.id ? 'Chargement...' : `Commencer — ${plan.price}€/mois →`}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* GENERAL */}
        {tab === 'general' && (
          <div>
            <div className="rbcard" style={{ background: 'rgba(52,211,153,0.02)', border: '1px solid rgba(52,211,153,0.1)', borderRadius: 20, overflow: 'hidden', position: 'relative', marginBottom: 16 }}>
              <div className="shine" />
              <div style={S.planBody}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: '#fff', letterSpacing: -0.5 }}>8 Semaines</div>
                    <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', letterSpacing: 2, textTransform: 'uppercase', marginTop: 5 }}>2 mois · sans engagement</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: 48, fontWeight: 100, color: '#34d399', letterSpacing: -3, lineHeight: 0.85 }}>39</span>
                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', display: 'block', marginTop: 6 }}>€ / mois</span>
                  </div>
                </div>
                <div style={S.sep('rgba(52,211,153,0.4)')} />
                <div style={{ marginBottom: 4 }}>
                  {GENERAL.features.map((f, fi) => (
                    <div key={fi} style={S.feat}><div style={S.dot('#34d399')} />{f}</div>
                  ))}
                </div>
              </div>
              <button className="bgn" onClick={() => handleCheckout(GENERAL)} disabled={loading === GENERAL.id}>
                {loading === GENERAL.id ? 'Chargement...' : 'Commencer — 39€/mois →'}
              </button>
            </div>
            <div onClick={() => setTab('team')} style={{ padding: '20px 24px', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', marginBottom: 16, transition: 'all 0.3s' }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>Prêt pour le coaching perso ?</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.18)' }}>Team RB Perform avec Rayan</div>
              </div>
              <div style={{ color: 'rgba(2,209,186,0.5)', fontSize: 20 }}>→</div>
            </div>
          </div>
        )}

        {/* TESTIMONIALS */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.15)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 16, textAlign: 'center' }}>Ce qu'ils disent</div>
          <div style={{ display: 'flex', gap: 12, overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: 4 }}>
            {TESTIMONIALS.map((t, i) => (
              <div key={i} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 16, padding: 16, minWidth: 210, flexShrink: 0 }}>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', lineHeight: 1.7, marginBottom: 12, fontStyle: 'italic' }}>"{t.quote}"</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>{t.name}</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: t.color, marginTop: 2 }}>{t.result}</div>
              </div>
            ))}
          </div>
        </div>

        {/* FOOTER */}
        <div style={{ height: 1, background: 'rgba(255,255,255,0.04)', marginBottom: 24 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <div style={{ fontSize: 18, opacity: 0.3 }}>🔒</div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.18)', lineHeight: 1.7 }}>
            <strong style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, display: 'block', marginBottom: 1 }}>Paiement sécurisé Stripe</strong>
            SSL · Sans engagement caché · TVA non applicable art. 293B CGI
          </div>
        </div>
        <button onClick={onLogin} style={{ width: '100%', padding: 16, background: 'transparent', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, color: 'rgba(255,255,255,0.2)', fontSize: 12, cursor: 'pointer', fontFamily: '-apple-system,Inter,sans-serif', transition: 'all 0.3s' }}>
          Déjà membre ? <span style={{ color: '#02d1ba' }}>Se connecter →</span>
        </button>
        <div style={{ textAlign: 'center', marginTop: 16, fontSize: 9, color: 'rgba(255,255,255,0.06)', letterSpacing: 2, textTransform: 'uppercase' }}>Stripe · SSL · Visa · Mastercard · Apple Pay</div>
      </div>
    </div>
  );
}

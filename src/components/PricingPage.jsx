import React, { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { supabase } from '../lib/supabase';
import { isRbPerformOwner, getBrandLabel } from '../lib/branding';
import { CoachLogo } from './CoachBranding';
import { toast } from './Toast';
import Spinner from './Spinner';

// Guard : si la cle n'est pas configuree, on ne tente pas de charger Stripe
// (eviter "Expected publishable key to be of type string" en console)
const STRIPE_PK = process.env.REACT_APP_STRIPE_PUBLIC_KEY;
const stripePromise = STRIPE_PK ? loadStripe(STRIPE_PK) : null;
if (!STRIPE_PK && process.env.NODE_ENV === "development") {
  // eslint-disable-next-line no-console
  console.warn("[Stripe] REACT_APP_STRIPE_PUBLIC_KEY non defini — checkout disabled");
}

const PLANS = [
  { id: '3m', name: '3 Mois', duration: '3 mois', price: 120, total: 360, priceId: 'price_1TK3RzApr7mMXwrlSqOA12aP', color: '#02d1ba', btnClass: 'b1', popular: false, savings: null, badge: null,
    features: ["Programme sur mesure 3 mois","Séance Vivante — coach en direct","Suivi complet dans l'app","Messagerie directe avec ton coach"] },
  { id: '6m', name: '6 Mois', duration: '6 mois', price: 110, total: 660, priceId: 'price_1TK3RIApr7mMXwrlZkRvrGFC', color: '#a78bfa', btnClass: 'b2', popular: true, savings: '− 60€ vs 3 mois', badge: 'Le plus populaire',
    features: ["Programme sur mesure 6 mois","Séance Vivante — coach en direct","Suivi complet dans l'app","Messagerie prioritaire avec ton coach","Ajustements mensuels garantis"] },
  { id: '12m', name: '12 Mois', duration: '12 mois', price: 100, total: 1200, priceId: 'price_1TK3R3Apr7mMXwrlFdO0Sl0a', color: '#fbbf24', btnClass: 'b3', popular: false, savings: '− 240€ vs 3 mois', badge: null,
    features: ["Programme sur mesure 12 mois","Séance Vivante — coach en direct","Suivi complet dans l'app","Messagerie VIP 7j/7","Ajustements mensuels garantis","Bilan transformation complet"] },
];

const GENERAL = { id: 'general', name: '8 Semaines', price: 39, priceId: 'price_1TK3QjApr7mMXwrloye23gi2',
  features: ["Programme général 8 semaines","Accès complet à l'app premium","Suivi poids · nutrition · cardio","Résiliable à tout moment"] };

const TESTIMONIALS = [
  { quote: "Je n'aurais jamais cru voir ces résultats aussi vite. L'app change tout.", name: "Thomas, 24 ans", result: "− 12 kg en 3 mois", color: "#02d1ba" },
  { quote: "La Seance Vivante c'est dingue. Mon coach est la comme si il etait dans la salle.", name: "Lea, 28 ans", result: "+ 8 kg de muscle", color: "#a78bfa" },
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

export default function PricingPage({ client, coachInfo, onClose, onLogin }) {
  const [loading, setLoading] = useState(null);
  const [tab, setTab] = useState('team');

  // ===== WHITE LABEL : client de coach tiers → pas d'acces aux offres RB Perform =====
  // Au lieu de Stripe RB, on affiche le payment_link du coach.
  if (coachInfo && !isRbPerformOwner(coachInfo)) {
    const brand = getBrandLabel(coachInfo);
    const accent = coachInfo.accent_color || '#02d1ba';
    const paymentLink = coachInfo.payment_link;

    return (
      <div style={{ minHeight: '100vh', background: '#050505', color: '#fff', fontFamily: '-apple-system,Inter,sans-serif', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px', position: 'relative', overflow: 'hidden' }}>
        <style>{`@keyframes wlFade{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}`}</style>
        <div style={{ position: 'absolute', top: '-5%', left: '50%', transform: 'translateX(-50%)', width: 500, height: 500, background: `radial-gradient(circle, ${accent}2A, transparent 65%)`, borderRadius: '50%', filter: 'blur(90px)', pointerEvents: 'none' }} />

        {onClose && (
          <button onClick={onClose} aria-label="Fermer" style={{ position: 'absolute', top: 'calc(env(safe-area-inset-top, 16px))', right: 16, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '50%', width: 36, height: 36, color: 'rgba(255,255,255,0.45)', fontSize: 16, cursor: 'pointer' }}>✕</button>
        )}

        <div style={{ position: 'relative', zIndex: 1, maxWidth: 400, textAlign: 'center', animation: 'wlFade 0.5s ease both' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 22 }}>
            <CoachLogo coachInfo={coachInfo} size={72} />
          </div>
          <div style={{ fontSize: 10, letterSpacing: '4px', textTransform: 'uppercase', color: accent, opacity: 0.75, marginBottom: 14, fontWeight: 700 }}>
            Abonnement coaching
          </div>
          <h1 style={{ fontSize: 34, fontWeight: 900, letterSpacing: '-1.5px', color: '#fff', margin: '0 0 16px', lineHeight: 0.95 }}>
            Renouvelle avec<br /><span style={{ color: accent }}>{brand}.</span>
          </h1>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', lineHeight: 1.7, marginBottom: 28, maxWidth: 320, margin: '0 auto 28px' }}>
            Pour poursuivre ton accompagnement, finalise ton abonnement directement avec ton coach.
          </p>

          {paymentLink ? (
            <a
              href={paymentLink}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-block',
                width: '100%',
                padding: 18,
                background: `linear-gradient(135deg, ${accent}, ${accent}CC)`,
                color: '#000',
                textDecoration: 'none',
                borderRadius: 14,
                fontSize: 14,
                fontWeight: 800,
                letterSpacing: '0.5px',
                textTransform: 'uppercase',
                boxShadow: `0 8px 30px ${accent}55`,
              }}
            >
              Continuer avec {brand} →
            </a>
          ) : (
            <div style={{ padding: 20, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>
              Contacte directement {brand} pour les modalites d'abonnement et de paiement.
            </div>
          )}

          <div style={{ marginTop: 28, fontSize: 10, color: 'rgba(255,255,255,0.18)', letterSpacing: '2px', textTransform: 'uppercase', fontWeight: 600 }}>
            Propulse par <span style={{ color: 'rgba(255,255,255,0.32)' }}>RB Perform</span>
          </div>
        </div>
      </div>
    );
  }

  // IMPORTANT : on accepte directement un planId (string) et on resout le plan
  // depuis PLANS/GENERAL a l'interieur de la fonction. Evite tout risque de
  // closure stale ou d'objet mute entre le onClick et l'envoi fetch.
  const handleCheckout = async (planId) => {
    const allPlans = [...PLANS, GENERAL];
    const plan = allPlans.find((p) => p.id === planId);
    if (!plan) {
      toast.error("Plan introuvable (" + planId + ")");
      return;
    }

    // Diagnostic visible : confirmation de l'offre choisie avant le redirect.
    // Si l'utilisateur voit "3 Mois - 120€" ici mais que Stripe affiche
    // "8 Semaines - 39€" apres, ca prouve que le priceId dans le code ne
    // correspond pas au bon prix dans le dashboard Stripe (probleme cote
    // config Stripe, pas cote app).
    const confirmed = window.confirm(
      "Confirmer l'offre :\n\n" +
      plan.name + " — " + plan.price + " €/mois\n" +
      (plan.total ? "Total : " + plan.total + " €\n" : "") +
      "\nOK pour aller sur Stripe ?"
    );
    if (!confirmed) return;

    setLoading(plan.id);
    if (navigator.vibrate) navigator.vibrate([20, 10, 20]);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('https://pwkajyrpldhlybavmopd.supabase.co/functions/v1/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}`, 'apikey': process.env.REACT_APP_SUPABASE_ANON_KEY },
        body: JSON.stringify({ priceId: plan.priceId, clientEmail: client?.email, clientId: client?.id, planName: plan.name, planId: plan.id }),
      });
      const json = await res.json().catch(() => ({ error: 'Reponse non-JSON du serveur' }));
      if (!res.ok || json.error) {
        const msg = json.error || ('HTTP ' + res.status);
        console.error('create-checkout failed:', msg, json);
        throw new Error(msg);
      }
      if (!json.url) throw new Error('Stripe n\'a pas renvoye d\'URL de checkout');
      window.location.href = json.url;
    } catch (e) {
      toast.error('Paiement indisponible. Contacte ton coach si ca persiste.');
      console.error('Checkout error:', e);
    }
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
          <div style={{ fontSize: 9, letterSpacing: 5, textTransform: 'uppercase', color: 'rgba(2,209,186,0.5)', marginBottom: 24 }}>Programme d'elite</div>
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
              cette annee
            </div>
          </div>
        </div>

        <div style={{ height: 1, background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.08),transparent)', marginBottom: 32 }} />

        {/* TABS */}
        <div style={{ display: 'flex', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, overflow: 'hidden', marginBottom: 40 }}>
          {[{ id: 'team', label: 'Coaching Premium' }, { id: 'general', label: 'Programme General' }].map((t, i) => (
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
                <button
                  className={`rbbtn ${plan.btnClass}`}
                  onClick={() => handleCheckout(plan.id)}
                  disabled={loading === plan.id}
                  data-plan-id={plan.id}
                  data-plan-price={plan.price}
                >
                  {loading === plan.id ? (<span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}><Spinner variant="dots" size={18} color={plan.id === '6m' ? '#fff' : '#000'} />Redirection</span>) : `Commencer — ${plan.price}€/mois →`}
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
              <button
                className="bgn"
                onClick={() => handleCheckout(GENERAL.id)}
                disabled={loading === GENERAL.id}
                data-plan-id={GENERAL.id}
                data-plan-price={GENERAL.price}
              >
                {loading === GENERAL.id ? (<span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}><Spinner variant="dots" size={18} color="#000" />Redirection</span>) : 'Commencer — 39€/mois →'}
              </button>
            </div>
            <div onClick={() => setTab('team')} style={{ padding: '20px 24px', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', marginBottom: 16, transition: 'all 0.3s' }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>Prêt pour le coaching perso ?</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.18)' }}>Coaching Premium</div>
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

        <div style={{ textAlign: 'center', marginTop: 16, fontSize: 9, color: 'rgba(255,255,255,0.06)', letterSpacing: 2, textTransform: 'uppercase' }}>Stripe · SSL · Visa · Mastercard · Apple Pay</div>
      </div>
    </div>
  );
}

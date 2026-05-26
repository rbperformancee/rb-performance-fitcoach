import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';

const G = '#02d1ba';
const DURATION_DAYS = 100;

/**
 * EbookStartScreen — affiché aux athlètes ebook avant qu'ils n'aient cliqué
 * "Démarrer". L'achat réserve la place (cf table ebook_purchases) mais les
 * 100 jours d'accès app ne débutent qu'au clic ici.
 *
 * Rationale produit : l'athlète peut acheter à J-15 et démarrer à J0 sans
 * brûler une partie de son accès. Le clic est explicit (1 fois) → on bascule
 * subscription_status pending_start → active + dates +100j.
 *
 * Visible uniquement si client.subscription_status === 'pending_start'.
 */
export default function EbookStartScreen({ client, onStarted }) {
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleStart = async () => {
    if (!client?.id) return;
    setLoading(true);
    setError('');
    try {
      const startDate = new Date();
      const endDate = new Date(startDate.getTime() + DURATION_DAYS * 24 * 60 * 60 * 1000);

      const { error: updErr } = await supabase
        .from('clients')
        .update({
          subscription_status: 'active',
          subscription_start_date: startDate.toISOString(),
          subscription_end_date: endDate.toISOString(),
        })
        .eq('id', client.id);

      if (updErr) throw updErr;

      // Trigger re-fetch côté parent
      if (onStarted) onStarted({ start: startDate, end: endDate });
      // Reload pour que App.jsx relise la session + le client à jour
      window.location.reload();
    } catch (e) {
      console.error('[EbookStartScreen] start failed:', e);
      setError(e?.message || 'Erreur — réessaie dans un instant');
      setLoading(false);
      setConfirming(false);
    }
  };

  const firstName = (client?.full_name || '').split(' ')[0] || 'Athlète';

  return (
    <div
      style={{
        minHeight: '100dvh',
        background: '#050505',
        color: '#fff',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '32px 24px',
        fontFamily: '"DM Sans", -apple-system, "Helvetica Neue", Arial, sans-serif',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          fontSize: 10,
          letterSpacing: 5,
          textTransform: 'uppercase',
          color: G,
          fontWeight: 800,
          marginBottom: 18,
        }}
      >
        Ebook Athlète · 100 jours
      </div>

      <h1
        style={{
          fontSize: 'clamp(28px, 8vw, 46px)',
          fontWeight: 900,
          letterSpacing: -1.5,
          lineHeight: 1.05,
          margin: '0 0 14px',
          maxWidth: 560,
        }}
      >
        Bienvenue {firstName}<span style={{ color: G }}>.</span>
      </h1>

      <p
        style={{
          fontSize: 16,
          color: 'rgba(255,255,255,0.72)',
          lineHeight: 1.55,
          margin: '0 auto 36px',
          maxWidth: 460,
        }}
      >
        Ton programme est prêt. <strong style={{ color: '#fff' }}>Quand tu cliques sur "Démarrer", tes 100 jours d'accès à l'app commencent</strong>. Pas avant.
      </p>

      <div
        style={{
          padding: '20px 22px',
          background: 'rgba(2,209,186,0.06)',
          border: `1px solid ${G}33`,
          borderRadius: 14,
          maxWidth: 460,
          width: '100%',
          marginBottom: 30,
          textAlign: 'left',
        }}
      >
        <div
          style={{
            fontSize: 9,
            letterSpacing: 3,
            color: G,
            fontWeight: 800,
            textTransform: 'uppercase',
            marginBottom: 10,
          }}
        >
          Ce que tu débloques aujourd'hui
        </div>
        <ul
          style={{
            margin: 0,
            padding: 0,
            listStyle: 'none',
            fontSize: 13.5,
            color: 'rgba(255,255,255,0.85)',
            lineHeight: 1.85,
          }}
        >
          <li>· Ton programme complet semaine par semaine</li>
          <li>· Suivi des charges + historique automatique</li>
          <li>· Bibliothèque vidéo pour chaque exercice</li>
          <li>· Bilans hebdo + tracker de progression</li>
        </ul>
      </div>

      {!confirming ? (
        <button
          onClick={() => setConfirming(true)}
          disabled={loading}
          style={{
            background: G,
            color: '#04201d',
            border: 'none',
            padding: '17px 38px',
            borderRadius: 12,
            fontWeight: 800,
            fontSize: 14,
            letterSpacing: 0.5,
            textTransform: 'uppercase',
            cursor: loading ? 'wait' : 'pointer',
            fontFamily: 'inherit',
            transition: 'transform 0.15s',
          }}
          onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.97)')}
          onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        >
          Démarrer mes 100 jours 💪
        </button>
      ) : (
        <div style={{ maxWidth: 460, width: '100%' }}>
          <div
            style={{
              padding: '14px 18px',
              background: 'rgba(255,170,0,0.08)',
              border: '1px solid rgba(255,170,0,0.3)',
              borderRadius: 10,
              fontSize: 13,
              color: 'rgba(255,255,255,0.85)',
              marginBottom: 16,
              lineHeight: 1.5,
            }}
          >
            ⚠️ Une fois démarré, le compteur 100 jours est <strong>irréversible</strong>. Tu veux vraiment commencer maintenant ?
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button
              onClick={() => setConfirming(false)}
              disabled={loading}
              style={{
                background: 'transparent',
                color: 'rgba(255,255,255,0.65)',
                border: '1px solid rgba(255,255,255,0.18)',
                padding: '13px 22px',
                borderRadius: 10,
                fontWeight: 700,
                fontSize: 13,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              Plus tard
            </button>
            <button
              onClick={handleStart}
              disabled={loading}
              style={{
                background: G,
                color: '#04201d',
                border: 'none',
                padding: '13px 26px',
                borderRadius: 10,
                fontWeight: 800,
                fontSize: 13,
                cursor: loading ? 'wait' : 'pointer',
                fontFamily: 'inherit',
              }}
            >
              {loading ? '…' : 'Oui, démarrer'}
            </button>
          </div>
        </div>
      )}

      {error && (
        <div
          style={{
            marginTop: 18,
            padding: '10px 14px',
            background: 'rgba(255,80,80,0.1)',
            border: '1px solid rgba(255,80,80,0.3)',
            borderRadius: 8,
            color: '#ff9090',
            fontSize: 12.5,
            maxWidth: 460,
          }}
        >
          {error}
        </div>
      )}

      <div
        style={{
          marginTop: 36,
          fontSize: 11,
          color: 'rgba(255,255,255,0.4)',
          maxWidth: 460,
        }}
      >
        Une question ? Réponds simplement au mail de bienvenue, on te répond sous 24h.
      </div>
    </div>
  );
}

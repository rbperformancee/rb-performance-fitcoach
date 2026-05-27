/**
 * GET /api/og?title=...&category=...&subtitle=...
 *
 * Génère dynamiquement une image OG 1200x630 pour les partages sociaux
 * (LinkedIn, Twitter, Facebook, WhatsApp). Booste le CTR sur partage en
 * remplaçant l'image OG générique par une image personnalisée par page.
 *
 * Plain .mjs (pas de JSX) pour rester compatible avec le runtime Vercel
 * de ce projet CRA — on construit l'arbre Satori via un helper `el()`.
 * Approche alignée avec api/og-coach.mjs (le pattern OG existant du repo).
 *
 * Edge runtime obligatoire pour @vercel/og.
 *
 * Cache : public, immutable 7 jours (variantes par URL = autant de PNG en
 * cache CDN Vercel).
 */

import { ImageResponse } from '@vercel/og';

export const config = { runtime: 'edge' };

const TEAL = '#02d1ba';
const BG = '#050505';
const TEXT = '#ffffff';
const MUTED = 'rgba(255,255,255,0.6)';

function el(type, props, ...children) {
  const flat = children.length === 1 && Array.isArray(children[0]) ? children[0] : children;
  const filtered = flat.filter((c) => c !== false && c !== null && c !== undefined);
  const finalChildren = filtered.length === 0 ? undefined
    : filtered.length === 1 ? filtered[0]
    : filtered;
  return { type, props: { ...(props || {}), ...(finalChildren !== undefined ? { children: finalChildren } : {}) }, key: null };
}

function ogCard({ title, category, subtitle }) {
  // Taille adaptative selon longueur du titre
  const titleSize = title.length > 70 ? 60 : title.length > 45 ? 72 : 88;

  return el('div', {
    style: {
      width: '1200px',
      height: '630px',
      background: BG,
      color: TEXT,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      padding: '64px 72px',
      fontFamily: 'Inter, sans-serif',
      position: 'relative',
      overflow: 'hidden',
    },
  },
    // Glow décoratif teal en arrière-plan
    el('div', {
      style: {
        position: 'absolute',
        top: '-200px',
        right: '-200px',
        width: '600px',
        height: '600px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(2,209,186,0.18) 0%, rgba(2,209,186,0) 70%)',
        display: 'flex',
      },
    }),

    // Header : eyebrow + branding
    el('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' } },
      el('div', {
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          fontSize: '20px',
          fontWeight: 800,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: TEAL,
        },
      },
        el('div', {
          style: {
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            background: TEAL,
            display: 'flex',
          },
        }),
        category,
      ),
      el('div', {
        style: {
          fontSize: '22px',
          fontWeight: 900,
          letterSpacing: '0.14em',
          display: 'flex',
          gap: '6px',
        },
      },
        el('span', { style: { color: TEXT } }, 'RB'),
        el('span', { style: { color: TEAL } }, 'PERFORM'),
      ),
    ),

    // Bloc central : titre + sous-titre
    el('div', { style: { display: 'flex', flexDirection: 'column', gap: '18px', maxWidth: '1000px' } },
      el('div', {
        style: {
          fontSize: `${titleSize}px`,
          fontWeight: 900,
          lineHeight: 1.05,
          letterSpacing: '-0.025em',
          color: TEXT,
          display: 'flex',
        },
      }, title),
      subtitle && el('div', {
        style: {
          fontSize: '26px',
          lineHeight: 1.4,
          color: MUTED,
          display: 'flex',
          maxWidth: '900px',
        },
      }, subtitle),
    ),

    // Footer : domaine + tagline
    el('div', {
      style: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        paddingTop: '24px',
      },
    },
      el('div', { style: { fontSize: '22px', color: MUTED, display: 'flex' } }, 'rbperform.app'),
      el('div', {
        style: {
          fontSize: '18px',
          color: TEAL,
          fontWeight: 700,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          display: 'flex',
        },
      }, 'SaaS coach sportif · France'),
    ),
  );
}

export default async function handler(req) {
  try {
    const { searchParams } = new URL(req.url);
    const title = (searchParams.get('title') || 'RB Perform').slice(0, 120);
    const category = (searchParams.get('category') || 'RB Perform').slice(0, 40);
    const subtitle = (searchParams.get('subtitle') || '').slice(0, 140);

    return new ImageResponse(ogCard({ title, category, subtitle }), {
      width: 1200,
      height: 630,
      headers: {
        'Cache-Control': 'public, max-age=604800, s-maxage=604800, immutable',
      },
    });
  } catch (e) {
    return new Response(`OG generation error: ${e.message}`, { status: 500 });
  }
}

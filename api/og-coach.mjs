/**
 * GET /api/og-coach?slug=:slug
 *
 * Génère un OG image PNG 1200x630 dynamique pour la vitrine coach.
 * Edge runtime via @vercel/og (Satori → SVG → PNG via Resvg).
 *
 * Plain .js (pas de JSX) pour rester compatible avec le runtime Vercel
 * de ce projet CRA : on construit l'arbre d'éléments avec un mini-helper
 * `el()` qui produit la forme attendue par Satori : { type, props, key }.
 *
 * Cache : 1h CDN + stale-while-revalidate 12h.
 */

import { ImageResponse } from '@vercel/og';

export const config = { runtime: 'edge' };

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL || 'https://pwkajyrpldhlybavmopd.supabase.co';
const SUPABASE_ANON = process.env.SUPABASE_ANON_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY || 'sb_publishable_WbG1gs6l7XP6aHH_UqR0Hw_XLSI50ud';

const G = '#02d1ba';
const BG = '#050505';

async function fetchCoach(slug) {
  const url = `${SUPABASE_URL}/rest/v1/coaches?public_slug=eq.${encodeURIComponent(slug)}&public_profile_enabled=eq.true&select=full_name,brand_name,public_specialties,public_photo_url,public_city,logo_url,accent_color`;
  const r = await fetch(url, { headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` } });
  if (!r.ok) return null;
  const rows = await r.json();
  return Array.isArray(rows) && rows[0] ? rows[0] : null;
}

// Mini hyperscript helper — construit un node compatible Satori.
// Children variadic : `el('div', {style}, child1, child2, ...)`
// ou flatten d'un array : `el('div', {style}, [c1, c2, ...])`.
function el(type, props, ...children) {
  const flat = children.length === 1 && Array.isArray(children[0]) ? children[0] : children;
  const filtered = flat.filter(c => c !== false && c !== null && c !== undefined);
  const finalChildren = filtered.length === 0 ? undefined
    : filtered.length === 1 ? filtered[0]
    : filtered;
  return { type, props: { ...(props || {}), ...(finalChildren !== undefined ? { children: finalChildren } : {}) }, key: null };
}

function fallbackCard() {
  return el('div', {
    style: { width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: BG, color: '#fff', fontFamily: 'Inter, sans-serif' },
  },
    el('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'center' } },
      el('div', { style: { fontSize: 14, letterSpacing: 8, color: 'rgba(255,255,255,0.4)', marginBottom: 18, textTransform: 'uppercase' } }, '404'),
      el('div', { style: { fontSize: 64, fontWeight: 900, letterSpacing: -2, display: 'flex' } },
        'Coach introuvable',
        el('span', { style: { color: G } }, '.'),
      ),
      el('div', { style: { fontSize: 22, color: 'rgba(255,255,255,0.5)', marginTop: 14 } }, 'rbperform.app'),
    ),
  );
}

function coachCard(coach) {
  const accent = (coach.accent_color && String(coach.accent_color).startsWith('#')) ? coach.accent_color : G;
  const brand = coach.brand_name || coach.full_name || 'Coach';
  const city = coach.public_city || '';
  const specialties = Array.isArray(coach.public_specialties) ? coach.public_specialties.filter(Boolean).slice(0, 3) : [];
  // Satori (moteur de @vercel/og) ne supporte pas WebP. Si l'URL pointe
  // vers .webp, on tente la version .jpg équivalente same-origin.
  const rawPhoto = coach.public_photo_url || coach.logo_url || '';
  const photo = rawPhoto.endsWith('.webp') ? rawPhoto.replace(/\.webp(\?.*)?$/, '.jpg$1') : rawPhoto;
  const initials = (brand || 'C').split(' ').map(w => (w[0] || '')).join('').slice(0, 2).toUpperCase();

  // Photo or initials
  const photoNode = photo
    ? el('img', { src: photo, width: 240, height: 240, style: { width: 240, height: 240, objectFit: 'cover', objectPosition: '50% 25%' } })
    : el('div', { style: { fontSize: 90, fontWeight: 900, color: '#000', fontFamily: 'Inter, sans-serif', letterSpacing: -3, display: 'flex' } }, initials);

  // Specialty chips
  const chips = specialties.length === 0 ? null
    : el('div', {
        style: { display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginTop: 22 },
      },
        specialties.map(s => el('div', {
          style: { padding: '10px 18px', background: `${accent}14`, border: `2px solid ${accent}55`, borderRadius: 999, fontSize: 18, fontWeight: 700, color: '#fff', letterSpacing: 1, textTransform: 'uppercase', display: 'flex' },
        }, s))
      );

  return el('div', {
    style: {
      width: '100%', height: '100%',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      position: 'relative', background: BG, color: '#fff',
      fontFamily: 'Inter, sans-serif', overflow: 'hidden',
      padding: '50px 60px',
    },
  },
    // Top accent line
    el('div', { style: { position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: `linear-gradient(90deg, transparent, ${accent}, transparent)`, display: 'flex' } }),
    // Ambient gradients
    el('div', { style: { position: 'absolute', top: -200, right: -200, width: 800, height: 800, background: `radial-gradient(circle, ${accent}33, transparent 60%)`, display: 'flex' } }),
    el('div', { style: { position: 'absolute', bottom: -200, left: -200, width: 700, height: 700, background: `radial-gradient(circle, ${accent}22, transparent 60%)`, display: 'flex' } }),

    // Photo (top, centered)
    el('div', {
      style: { width: 240, height: 240, borderRadius: 9999, border: `4px solid ${accent}`, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 20px 60px ${accent}40`, background: `linear-gradient(135deg, ${accent}, ${accent}66)`, marginBottom: 28, position: 'relative', zIndex: 1 },
    }, photoNode),

    // Eyebrow centered
    el('div', {
      style: { display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, letterSpacing: 6, textTransform: 'uppercase', color: accent, fontWeight: 700, marginBottom: 18, position: 'relative', zIndex: 1 },
    },
      el('div', { style: { width: 10, height: 10, borderRadius: 5, background: accent, marginRight: 10, display: 'flex' } }),
      'RB Perform · Disponible',
    ),

    // Brand name centered
    el('div', {
      style: { fontSize: brand.length > 22 ? 56 : 76, fontWeight: 900, letterSpacing: -2, lineHeight: 1.0, color: '#fff', textAlign: 'center', display: 'flex', justifyContent: 'center', position: 'relative', zIndex: 1 },
    },
      el('span', null, brand),
      el('span', { style: { color: accent } }, '.'),
    ),

    // City centered
    city ? el('div', {
      style: { fontSize: 18, color: 'rgba(255,255,255,0.55)', letterSpacing: 4, textTransform: 'uppercase', fontWeight: 600, marginTop: 14, textAlign: 'center', display: 'flex', position: 'relative', zIndex: 1 },
    }, city) : null,

    // Chips centered
    chips,

    // Footer brand bottom-center
    el('div', {
      style: { position: 'absolute', bottom: 28, left: 0, right: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2 },
    },
      el('div', {
        style: { fontSize: 14, fontWeight: 800, letterSpacing: 6, color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', display: 'flex' },
      }, 'rbperform.app'),
    ),
  );
}

export default async function handler(req) {
  try {
    const { searchParams } = new URL(req.url);
    const slug = String(searchParams.get('slug') || '').trim().toLowerCase();

    if (!slug || !/^[a-z0-9-]{2,40}$/.test(slug)) {
      return new ImageResponse(fallbackCard(), {
        width: 1200, height: 630,
        headers: { 'Cache-Control': 'public, max-age=60' },
      });
    }

    const coach = await fetchCoach(slug);
    if (!coach) {
      return new ImageResponse(fallbackCard(), {
        width: 1200, height: 630,
        headers: { 'Cache-Control': 'public, max-age=300' },
      });
    }

    return new ImageResponse(coachCard(coach), {
      width: 1200, height: 630,
      headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=43200' },
    });
  } catch (e) {
    console.error('[og-coach]', e);
    return new ImageResponse(fallbackCard(), {
      width: 1200, height: 630,
      headers: { 'Cache-Control': 'no-store' },
      status: 500,
    });
  }
}

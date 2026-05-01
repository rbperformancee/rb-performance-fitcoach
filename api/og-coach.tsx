/**
 * GET /api/og-coach?slug=:slug
 *
 * Génère un OG image PNG 1200x630 dynamique pour la vitrine coach.
 * Edge runtime via @vercel/og (Satori → SVG → PNG via Resvg).
 *
 * Layout :
 *   - Fond noir avec ambient gradient teal qui drift
 *   - Photo circulaire à gauche (avec ring teal)
 *   - À droite : eyebrow "COACH PERFORMANCE", nom en Inter 900,
 *     ville, jusqu'à 3 spécialités en chips
 *   - Footer : "RB PERFORM" + lightning bolt
 *
 * Branche dans coach-vitrine.js : og:image = /api/og-coach?slug=X
 *
 * Cache : 1h CDN + stale-while-revalidate 12h.
 */

import { ImageResponse } from '@vercel/og';

export const config = { runtime: 'edge' };

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL || 'https://pwkajyrpldhlybavmopd.supabase.co';
const SUPABASE_ANON = process.env.SUPABASE_ANON_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY || 'sb_publishable_WbG1gs6l7XP6aHH_UqR0Hw_XLSI50ud';

async function fetchCoach(slug) {
  const url = `${SUPABASE_URL}/rest/v1/coaches?public_slug=eq.${encodeURIComponent(slug)}&public_profile_enabled=eq.true&select=full_name,brand_name,public_specialties,public_photo_url,public_city,logo_url,accent_color`;
  const r = await fetch(url, { headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` } });
  if (!r.ok) return null;
  const rows = await r.json();
  return Array.isArray(rows) && rows[0] ? rows[0] : null;
}

const G = '#02d1ba';
const BG = '#050505';

function FallbackCard() {
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: BG, color: '#fff', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ fontSize: 14, letterSpacing: 8, color: 'rgba(255,255,255,0.4)', marginBottom: 18, textTransform: 'uppercase' }}>404</div>
        <div style={{ fontSize: 64, fontWeight: 900, letterSpacing: -2 }}>Coach introuvable<span style={{ color: G }}>.</span></div>
        <div style={{ fontSize: 22, color: 'rgba(255,255,255,0.5)', marginTop: 14 }}>rbperform.app</div>
      </div>
    </div>
  );
}

function CoachCard({ coach }) {
  const accent = (coach.accent_color && coach.accent_color.startsWith('#')) ? coach.accent_color : G;
  const brand = coach.brand_name || coach.full_name || 'Coach';
  const city = coach.public_city || '';
  const specialties = Array.isArray(coach.public_specialties) ? coach.public_specialties.filter(Boolean).slice(0, 3) : [];
  const photo = coach.public_photo_url || coach.logo_url || '';
  const initials = (brand || 'C').split(' ').map(w => (w[0] || '')).join('').slice(0, 2).toUpperCase();

  return (
    <div style={{
      width: '100%', height: '100%', display: 'flex', position: 'relative',
      background: BG, color: '#fff', fontFamily: 'Inter, sans-serif',
      overflow: 'hidden',
    }}>
      {/* Ambient gradient drift accent */}
      <div style={{
        position: 'absolute', top: -200, right: -200, width: 800, height: 800,
        background: `radial-gradient(circle, ${accent}33, transparent 60%)`,
        display: 'flex',
      }} />
      <div style={{
        position: 'absolute', bottom: -200, left: -200, width: 700, height: 700,
        background: `radial-gradient(circle, ${accent}22, transparent 60%)`,
        display: 'flex',
      }} />

      {/* Left : photo */}
      <div style={{
        width: 480, height: '100%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative', zIndex: 1,
      }}>
        <div style={{
          width: 380, height: 380, borderRadius: 9999,
          border: `4px solid ${accent}`,
          overflow: 'hidden',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 30px 80px ${accent}40`,
          background: `linear-gradient(135deg, ${accent}, ${accent}66)`,
        }}>
          {photo ? (
            <img
              src={photo}
              alt=""
              width={380}
              height={380}
              style={{ width: 380, height: 380, objectFit: 'cover' }}
            />
          ) : (
            <div style={{
              fontSize: 140, fontWeight: 900, color: '#000',
              fontFamily: 'Inter, sans-serif', letterSpacing: -4,
              display: 'flex',
            }}>
              {initials}
            </div>
          )}
        </div>
      </div>

      {/* Right : content */}
      <div style={{
        flex: 1, padding: '60px 64px 60px 0',
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        position: 'relative', zIndex: 1,
      }}>
        {/* Eyebrow */}
        <div style={{
          display: 'flex', alignItems: 'center',
          fontSize: 16, letterSpacing: 6, textTransform: 'uppercase',
          color: accent, fontWeight: 700, marginBottom: 22,
        }}>
          <div style={{ width: 12, height: 12, borderRadius: 6, background: accent, marginRight: 12, display: 'flex' }} />
          Coach Performance
        </div>

        {/* Name */}
        <div style={{
          fontSize: brand.length > 18 ? 70 : 92,
          fontWeight: 900, letterSpacing: -3, lineHeight: 1.0,
          color: '#fff', marginBottom: 18,
          display: 'flex', flexWrap: 'wrap',
        }}>
          <span>{brand}</span>
          <span style={{ color: accent }}>.</span>
        </div>

        {/* City */}
        {city && (
          <div style={{
            fontSize: 22, color: 'rgba(255,255,255,0.55)',
            letterSpacing: 4, textTransform: 'uppercase', fontWeight: 600,
            marginBottom: 28,
          }}>
            {city}
          </div>
        )}

        {/* Specialities */}
        {specialties.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 8 }}>
            {specialties.map((s, i) => (
              <div key={i} style={{
                padding: '10px 18px',
                background: `${accent}14`,
                border: `2px solid ${accent}55`,
                borderRadius: 999,
                fontSize: 18, fontWeight: 700, color: '#fff',
                letterSpacing: 1, textTransform: 'uppercase',
                display: 'flex',
              }}>
                {s}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer brand */}
      <div style={{
        position: 'absolute', bottom: 32, right: 64,
        display: 'flex', alignItems: 'center', gap: 12,
        zIndex: 2,
      }}>
        <svg width="22" height="38" viewBox="170 50 180 410" style={{ display: 'block' }}>
          <polygon points="300,60 180,280 248,280 210,450 340,220 268,220 300,60" fill={accent}/>
        </svg>
        <div style={{
          fontSize: 18, fontWeight: 800, letterSpacing: 6,
          color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase',
          display: 'flex',
        }}>
          RB Perform
        </div>
      </div>

      {/* Top-left subtle line accent */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 4,
        background: `linear-gradient(90deg, transparent, ${accent}, transparent)`,
        display: 'flex',
      }} />
    </div>
  );
}

export default async function handler(req) {
  try {
    const { searchParams } = new URL(req.url);
    const slug = String(searchParams.get('slug') || '').trim().toLowerCase();

    if (!slug || !/^[a-z0-9-]{2,40}$/.test(slug)) {
      return new ImageResponse(<FallbackCard />, {
        width: 1200, height: 630,
        headers: { 'Cache-Control': 'public, max-age=60' },
      });
    }

    const coach = await fetchCoach(slug);
    if (!coach) {
      return new ImageResponse(<FallbackCard />, {
        width: 1200, height: 630,
        headers: { 'Cache-Control': 'public, max-age=300' },
      });
    }

    return new ImageResponse(<CoachCard coach={coach} />, {
      width: 1200, height: 630,
      headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=43200' },
    });
  } catch (e) {
    console.error('[og-coach]', e);
    return new ImageResponse(<FallbackCard />, {
      width: 1200, height: 630,
      headers: { 'Cache-Control': 'no-store' },
      status: 500,
    });
  }
}

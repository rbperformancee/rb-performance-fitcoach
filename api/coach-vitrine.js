/**
 * GET /api/coach-vitrine?slug=:slug
 *
 * SSR de la vitrine publique d'un coach.
 *
 * Fetch coach + témoignages cote serveur (RLS public), retourne HTML
 * complet avec :
 *   - <head> contenant les vraies OG meta tags (titre, description, image)
 *     dynamiques par coach → previews Insta/WhatsApp/FB/Twitter propres
 *   - <body> design premium (matching la PublicCoachProfile React component)
 *
 * Branche via vercel.json rewrite : /coach/:slug → /api/coach-vitrine?slug=:slug
 *
 * RLS : on utilise la clé publishable (anon) — Supabase RLS protege les
 * coaches non-publics (public_profile_enabled = true requis).
 */

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL || 'https://pwkajyrpldhlybavmopd.supabase.co';
const SUPABASE_ANON = process.env.SUPABASE_ANON_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY || 'sb_publishable_WbG1gs6l7XP6aHH_UqR0Hw_XLSI50ud';
const SITE = 'https://rbperform.app';

const escHtml = (s) => String(s ?? '').replace(/[&<>"'`=\/]/g, (c) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;',
  "'": '&#39;', '`': '&#96;', '=': '&#61;', '/': '&#47;',
}[c]));

const escAttr = (s) => String(s ?? '').replace(/[<>"'&]/g, (c) => ({
  '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '&': '&amp;',
}[c]));

async function fetchCoach(slug) {
  const url = `${SUPABASE_URL}/rest/v1/coaches?public_slug=eq.${encodeURIComponent(slug)}&public_profile_enabled=eq.true&select=id,full_name,brand_name,public_bio,public_specialties,public_photo_url,public_city,logo_url,accent_color`;
  const r = await fetch(url, { headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` } });
  if (!r.ok) return null;
  const rows = await r.json();
  return Array.isArray(rows) && rows[0] ? rows[0] : null;
}

async function fetchTestimonials(coachId) {
  const url = `${SUPABASE_URL}/rest/v1/coach_testimonials?coach_id=eq.${coachId}&visible=eq.true&select=client_name,client_photo_url,content,rating&order=ordre.asc&limit=3`;
  const r = await fetch(url, { headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` } });
  if (!r.ok) return [];
  const rows = await r.json();
  return Array.isArray(rows) ? rows : [];
}

function render404() {
  return `<!DOCTYPE html><html lang="fr"><head>
<meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>Coach introuvable · RB Perform</title>
<meta name="robots" content="noindex"/>
<meta name="theme-color" content="#050505"/>
<meta property="og:title" content="Coach introuvable · RB Perform"/>
<meta property="og:image" content="${SITE}/og-image.png"/>
<style>html,body{margin:0;background:#050505;color:#fff;font-family:-apple-system,Inter,sans-serif;min-height:100vh;display:grid;place-items:center;text-align:center;padding:24px}h1{font-size:36px;font-weight:900;letter-spacing:-1px;margin:0 0 12px}h1 span{color:#02d1ba}p{color:rgba(255,255,255,.5);max-width:340px;line-height:1.6;margin:0 0 18px}a{color:#02d1ba;text-decoration:none;font-weight:700;border-bottom:1px solid rgba(2,209,186,.4)}</style>
</head><body><div><div style="font-size:11px;letter-spacing:.4em;text-transform:uppercase;color:rgba(255,255,255,.35);margin-bottom:14px;font-weight:700">404</div><h1>Coach introuvable<span>.</span></h1><p>Cette vitrine n'existe pas ou a été masquée.</p><a href="/">Découvrir RB Perform →</a></div></body></html>`;
}

function renderPage(coach, testimonials, slug) {
  const accent = (coach.accent_color && coach.accent_color.startsWith('#')) ? coach.accent_color : '#02d1ba';
  const brand = coach.brand_name || coach.full_name || 'Coach';
  const photo = coach.public_photo_url || coach.logo_url || '';
  const specialties = Array.isArray(coach.public_specialties) ? coach.public_specialties.filter(Boolean) : [];
  const city = coach.public_city || '';
  const bio = coach.public_bio || '';
  const url = `${SITE}/coach/${slug}`;
  // OG image stylisée 1200x630 générée dynamiquement par /api/og-coach
  // (photo + nom + spécialités + branding RB Perform). Évite le crop bizarre
  // d'une photo carrée en preview sociale.
  const ogImage = `${SITE}/api/og-coach?slug=${encodeURIComponent(slug)}`;

  // OG description : bio courte ou fallback
  const ogDesc = bio
    ? bio.replace(/\s+/g, ' ').trim().slice(0, 200)
    : `${brand}${city ? ' · ' + city : ''} — RB Perform.${specialties.length ? ' ' + specialties.slice(0, 3).join(' · ') + '.' : ''}`;

  const initials = (brand || 'C').split(' ').map(w => (w[0] || '')).join('').slice(0, 2).toUpperCase();

  const photoHtml = photo
    ? `<img src="${escAttr(photo)}" alt="${escAttr(brand)}" style="width:100%;height:100%;object-fit:cover;display:block"/>`
    : `<div style="display:grid;place-items:center;height:100%;font-size:46px;font-weight:900;color:#000;font-family:Inter,sans-serif;letter-spacing:-1px">${escHtml(initials)}</div>`;

  const photoBg = photo ? '' : `background:linear-gradient(135deg,${accent},${accent}66);`;

  const specsHtml = specialties.length ? `
    <div style="margin-top:36px;animation:fadeUp .7s ease .4s both">
      <div style="font-size:9px;letter-spacing:.4em;text-transform:uppercase;color:rgba(255,255,255,.42);font-weight:700;margin-bottom:16px">Spécialités</div>
      <div style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center">
        ${specialties.map(s => `<span style="padding:10px 16px;background:${accent}10;border:1px solid ${accent}40;border-radius:100px;font-size:12px;font-weight:700;color:#fff;letter-spacing:.04em;text-transform:uppercase">${escHtml(s)}</span>`).join('')}
      </div>
    </div>` : '';

  const testimonialsHtml = testimonials.length ? `
    <div style="margin-top:56px;animation:fadeUp .7s ease .5s both">
      <div style="font-size:9px;letter-spacing:.4em;text-transform:uppercase;color:rgba(255,255,255,.42);font-weight:700;margin-bottom:20px">Ils témoignent</div>
      <div style="display:flex;flex-direction:column;gap:14px">
        ${testimonials.map(t => {
          const rating = Math.max(1, Math.min(5, t.rating || 5));
          const stars = '★'.repeat(rating) + `<span style="color:rgba(255,255,255,.12)">${'★'.repeat(5 - rating)}</span>`;
          const tInit = (t.client_name || '?')[0].toUpperCase();
          const avatar = t.client_photo_url
            ? `<img src="${escAttr(t.client_photo_url)}" alt="${escAttr(t.client_name)}" style="width:36px;height:36px;border-radius:50%;object-fit:cover;border:1px solid ${accent}40"/>`
            : `<div style="width:36px;height:36px;border-radius:50%;background:${accent}22;display:grid;place-items:center;font-size:13px;font-weight:800;color:${accent};border:1px solid ${accent}40">${escHtml(tInit)}</div>`;
          return `
          <div style="padding:22px 24px;background:linear-gradient(135deg,rgba(255,255,255,.03),rgba(255,255,255,.01));border:1px solid rgba(255,255,255,.07);border-radius:18px;text-align:left;position:relative;overflow:hidden">
            <div aria-hidden="true" style="position:absolute;top:-8px;right:14px;font-size:90px;color:${accent}10;font-family:Georgia,serif;line-height:1;font-weight:900;pointer-events:none">"</div>
            <div style="margin-bottom:12px;color:#fbbf24;font-size:14px;letter-spacing:3px">${stars}</div>
            <div style="font-size:14px;color:rgba(255,255,255,.85);line-height:1.7;margin-bottom:16px;position:relative;z-index:1">« ${escHtml(t.content)} »</div>
            <div style="display:flex;align-items:center;gap:10px">${avatar}<div><div style="font-size:13px;font-weight:700;color:#fff;line-height:1.2">${escHtml(t.client_name)}</div><div style="font-size:10px;color:rgba(255,255,255,.4);letter-spacing:.15em;text-transform:uppercase;margin-top:2px;font-weight:600">Client vérifié</div></div></div>
          </div>`;
        }).join('')}
      </div>
    </div>` : '';

  const bioHtml = bio ? `
    <div style="margin-top:36px;padding:26px 28px;background:rgba(255,255,255,.025);border:1px solid rgba(255,255,255,.07);border-radius:20px;text-align:left;animation:fadeUp .7s ease .3s both">
      <div style="font-size:9px;letter-spacing:.4em;text-transform:uppercase;color:${accent}cc;font-weight:700;margin-bottom:12px">À propos</div>
      <div style="font-size:15px;color:rgba(255,255,255,.82);line-height:1.7;white-space:pre-wrap">${escHtml(bio)}</div>
    </div>` : '';

  const cityHtml = city ? `<div style="font-size:12px;color:rgba(255,255,255,.5);letter-spacing:.2em;text-transform:uppercase;font-weight:600;margin-bottom:8px;animation:fadeUp .7s ease .2s both">${escHtml(city)}</div>` : '';
  const fullNameHtml = (coach.full_name && coach.full_name !== brand) ? `<div style="font-size:13px;color:rgba(255,255,255,.45);margin-bottom:8px;animation:fadeUp .7s ease .25s both">par ${escHtml(coach.full_name)}</div>` : '';

  // JSON-LD schema.org Person — pour rich results Google
  const ldPerson = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: brand,
    ...(coach.full_name && coach.full_name !== brand ? { alternateName: coach.full_name } : {}),
    // jobTitle volontairement omis : qualification CQP ALS, pas BPJEPS.
    // Le titre exact est déclaré dans la bio par le coach.
    description: ogDesc,
    url,
    ...(photo ? { image: photo } : {}),
    ...(specialties.length ? { knowsAbout: specialties } : {}),
    ...(city ? { address: { '@type': 'PostalAddress', addressLocality: city, addressCountry: 'FR' } } : {}),
    worksFor: { '@type': 'Organization', name: 'RB Perform', url: SITE },
    ...(testimonials.length ? {
      review: testimonials.map(t => ({
        '@type': 'Review',
        author: { '@type': 'Person', name: t.client_name },
        reviewBody: t.content,
        reviewRating: { '@type': 'Rating', ratingValue: t.rating || 5, bestRating: 5 },
      })),
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: (testimonials.reduce((s, t) => s + (t.rating || 5), 0) / testimonials.length).toFixed(1),
        reviewCount: testimonials.length,
        bestRating: 5,
      },
    } : {}),
  };

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0,viewport-fit=cover"/>
<title>${escHtml(brand)} — RB Perform</title>
<meta name="description" content="${escAttr(ogDesc)}"/>
<meta name="theme-color" content="#050505"/>
<meta name="color-scheme" content="dark"/>
<meta name="robots" content="index,follow"/>
<link rel="canonical" href="${escAttr(url)}"/>

<!-- JSON-LD Person + Reviews pour rich results Google -->
<script type="application/ld+json">${JSON.stringify(ldPerson).replace(/</g, '\\u003c')}</script>

<!-- Open Graph -->
<meta property="og:type" content="profile"/>
<meta property="og:title" content="${escAttr(brand + ' — RB Perform')}"/>
<meta property="og:description" content="${escAttr(ogDesc)}"/>
<meta property="og:url" content="${escAttr(url)}"/>
<meta property="og:image" content="${escAttr(ogImage)}"/>
<meta property="og:image:width" content="1200"/>
<meta property="og:image:height" content="630"/>
<meta property="og:image:type" content="image/png"/>
<meta property="og:image:alt" content="${escAttr(brand + ' — RB Perform')}"/>
<meta property="og:site_name" content="RB Perform"/>
<meta property="og:locale" content="fr_FR"/>
<meta property="profile:first_name" content="${escAttr((coach.full_name || brand).split(' ')[0] || '')}"/>

<!-- Twitter Cards -->
<meta name="twitter:card" content="summary_large_image"/>
<meta name="twitter:title" content="${escAttr(brand + ' — RB Perform')}"/>
<meta name="twitter:description" content="${escAttr(ogDesc)}"/>
<meta name="twitter:image" content="${escAttr(ogImage)}"/>

<!-- Icons -->
<link rel="icon" type="image/svg+xml" href="/icon.svg"/>
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png"/>
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png"/>

<!-- Fonts -->
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700;800;900&display=swap" rel="stylesheet"/>

<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{background:#050505;color:#fff;min-height:100vh;min-height:100dvh;font-family:-apple-system,'Inter',sans-serif;-webkit-font-smoothing:antialiased}
@keyframes fadeUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
@keyframes shimmer{0%{background-position:-200% center}100%{background-position:200% center}}
@keyframes breath60{0%,100%{opacity:1}50%{opacity:.55}}
@keyframes breath60Scale{0%,100%{transform:scale(1);opacity:.55}50%{transform:scale(1.06);opacity:.85}}
@keyframes ambientDrift{0%,100%{transform:translate(0,0)}50%{transform:translate(20px,-10px)}}
@keyframes ringPulse{0%,100%{box-shadow:0 0 0 0 ${accent}8c,0 12px 40px ${accent}59}50%{box-shadow:0 0 0 8px ${accent}00,0 12px 40px ${accent}73}}
@keyframes ctaGlow{0%,100%{box-shadow:0 16px 40px ${accent}47}50%{box-shadow:0 16px 56px ${accent}80}}
@media (prefers-reduced-motion:reduce){*{animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important}}
.cta-btn{transition:transform .2s cubic-bezier(.22,1,.36,1)}
.cta-btn:active{transform:scale(.97)}
</style>
</head>
<body>

<div aria-hidden="true" style="position:fixed;top:-10%;left:-10%;width:60%;height:60%;background:radial-gradient(circle,${accent}14,transparent 60%);pointer-events:none;animation:ambientDrift 12s ease-in-out infinite;will-change:transform"></div>
<div aria-hidden="true" style="position:fixed;bottom:-10%;right:-10%;width:60%;height:60%;background:radial-gradient(circle,${accent}0f,transparent 60%);pointer-events:none;animation:ambientDrift 14s ease-in-out infinite reverse;will-change:transform"></div>

<main style="position:relative;z-index:1">
  <div style="max-width:640px;margin:0 auto;padding:56px 24px 100px;text-align:center">

    <div style="display:inline-flex;align-items:center;gap:10px;padding:8px 16px;background:${accent}10;border:1px solid ${accent}33;border-radius:100px;margin-bottom:36px;animation:fadeUp .6s ease .05s both">
      <div style="width:7px;height:7px;border-radius:50%;background:${accent};animation:breath60 1s ease-in-out infinite;box-shadow:0 0 8px ${accent}80"></div>
      <div style="font-size:10px;letter-spacing:3px;text-transform:uppercase;color:${accent};font-weight:700">RB Perform · Disponible</div>
    </div>

    <div style="display:inline-block;margin-bottom:28px;animation:fadeUp .7s ease .1s both">
      <div style="${photoBg}width:132px;height:132px;border-radius:50%;overflow:hidden;border:2px solid ${accent};animation:ringPulse 2.4s ease-in-out infinite">
        ${photoHtml}
      </div>
    </div>

    <h1 style="font-family:'Inter',-apple-system,sans-serif;font-size:clamp(38px,7vw,60px);font-weight:900;letter-spacing:-.03em;line-height:1;margin-bottom:14px">
      <span style="background:linear-gradient(90deg,${accent},#fff,${accent});background-size:200% auto;-webkit-background-clip:text;-webkit-text-fill-color:transparent;animation:shimmer 7s linear infinite">${escHtml(brand)}</span><span style="color:${accent}">.</span>
    </h1>
    ${cityHtml}
    ${fullNameHtml}

    ${bioHtml}
    ${specsHtml}
    ${testimonialsHtml}

    <div style="margin-top:56px;animation:fadeUp .7s ease .6s both">
      <a href="/candidature" class="cta-btn" style="display:inline-flex;align-items:center;gap:12px;text-decoration:none;padding:18px 32px;background:linear-gradient(135deg,${accent},${accent}cc);color:#000;border-radius:100px;font-size:14px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;animation:ctaGlow 2.4s ease-in-out infinite">
        <span style="width:8px;height:8px;border-radius:50%;background:#000;animation:breath60Scale 1s ease-in-out infinite"></span>
        Travailler avec moi
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="margin-left:2px"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
      </a>
      <div style="margin-top:16px;font-size:11px;color:rgba(255,255,255,.42);letter-spacing:.15em;text-transform:uppercase;font-weight:600">Sélection sur dossier · 5 places</div>
    </div>

    <div style="margin-top:80px;padding-top:28px;border-top:1px solid rgba(255,255,255,.06)">
      <div style="font-size:9px;letter-spacing:.4em;text-transform:uppercase;color:rgba(255,255,255,.28);font-weight:700">
        Propulsé par <a href="/" style="color:rgba(255,255,255,.55);text-decoration:none;font-weight:800;border-bottom:1px solid rgba(255,255,255,.15);padding-bottom:1px">RB Perform</a>
      </div>
    </div>

  </div>
</main>

</body>
</html>`;
}

module.exports = async (req, res) => {
  try {
    const slug = String(req.query?.slug || '').trim().toLowerCase();

    if (!slug || !/^[a-z0-9-]{2,40}$/.test(slug)) {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=60');
      res.end(render404());
      return;
    }

    const coach = await fetchCoach(slug);
    if (!coach) {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=60');
      res.end(render404());
      return;
    }

    const testimonials = await fetchTestimonials(coach.id);

    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    // Cache court (60s edge, 300s CDN) — la vitrine peut changer souvent
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
    res.end(renderPage(coach, testimonials, slug));
  } catch (e) {
    console.error('[coach-vitrine]', e);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(render404());
  }
};

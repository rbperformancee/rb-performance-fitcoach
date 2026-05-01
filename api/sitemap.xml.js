/**
 * GET /api/sitemap.xml
 *
 * Sitemap dynamique pour Google. Inclut :
 *   - Les pages statiques principales (/, /candidature, /founding, /security)
 *   - Toutes les vitrines coach publiques (public_profile_enabled = true)
 *
 * Branche via vercel.json rewrite : /sitemap.xml → /api/sitemap.xml
 *
 * Cache : 1h edge + stale-while-revalidate 12h. Rafraîchi rapidement
 * quand un coach active sa vitrine ou la masque.
 */

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL || 'https://pwkajyrpldhlybavmopd.supabase.co';
const SUPABASE_ANON = process.env.SUPABASE_ANON_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY || 'sb_publishable_WbG1gs6l7XP6aHH_UqR0Hw_XLSI50ud';
const SITE = 'https://rbperform.app';

const STATIC_PAGES = [
  { loc: '/',             changefreq: 'weekly',  priority: 1.0 },
  { loc: '/candidature',  changefreq: 'monthly', priority: 0.9 },
  { loc: '/founding',     changefreq: 'monthly', priority: 0.7 },
  { loc: '/security',     changefreq: 'yearly',  priority: 0.4 },
  { loc: '/comparison',   changefreq: 'monthly', priority: 0.5 },
  { loc: '/legal',        changefreq: 'yearly',  priority: 0.3 },
];

async function fetchPublicCoaches() {
  try {
    const url = `${SUPABASE_URL}/rest/v1/coaches?public_profile_enabled=eq.true&select=public_slug,updated_at&limit=1000`;
    const r = await fetch(url, { headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` } });
    if (!r.ok) return [];
    const rows = await r.json();
    return Array.isArray(rows) ? rows.filter(r => r.public_slug && /^[a-z0-9-]{2,40}$/.test(r.public_slug)) : [];
  } catch {
    return [];
  }
}

const escXml = (s) => String(s ?? '').replace(/[<>&'"]/g, (c) => ({
  '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;'
}[c]));

module.exports = async (req, res) => {
  try {
    const coaches = await fetchPublicCoaches();
    const now = new Date().toISOString().slice(0, 10);

    const urls = [
      ...STATIC_PAGES.map(p => `  <url><loc>${SITE}${p.loc}</loc><lastmod>${now}</lastmod><changefreq>${p.changefreq}</changefreq><priority>${p.priority}</priority></url>`),
      ...coaches.map(c => {
        const lastmod = c.updated_at ? String(c.updated_at).slice(0, 10) : now;
        return `  <url><loc>${SITE}/coach/${escXml(c.public_slug)}</loc><lastmod>${lastmod}</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>`;
      }),
    ].join('\n');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=43200');
    res.end(xml);
  } catch (e) {
    console.error('[sitemap]', e);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'text/plain');
    res.end('sitemap error');
  }
};

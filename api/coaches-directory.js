/**
 * GET /api/coaches-directory
 *
 * Page SSR listant TOUS les coachs avec public_profile_enabled = true.
 * Filtres optionnels via query params : ?city=Paris&specialty=force
 *
 * Branché via vercel.json rewrite : /coaches → /api/coaches-directory
 *
 * Pourquoi : SEO + acquisition organique. Les prospects qui cherchent un
 * coach à Lyon spécialisé en force tombent sur la page → leads pour les
 * coachs RB Perform.
 */

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL || "https://pwkajyrpldhlybavmopd.supabase.co";
const SUPABASE_ANON = process.env.SUPABASE_ANON_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY || "sb_publishable_WbG1gs6l7XP6aHH_UqR0Hw_XLSI50ud";
const SITE = "https://rbperform.app";

const escHtml = (s) => String(s ?? "").replace(/[&<>"'`=\/]/g, (c) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;",
  "'": "&#39;", "`": "&#96;", "=": "&#61;", "/": "&#47;",
}[c]));

const escAttr = (s) => String(s ?? "").replace(/[<>"'&]/g, (c) => ({
  "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;", "&": "&amp;",
}[c]));

async function fetchCoaches() {
  // SELECT cols safe (existent depuis migration 010 + 064)
  const cols = "id,full_name,brand_name,public_slug,public_bio,public_specialties,public_photo_url,public_city,logo_url,accent_color";
  const url = `${SUPABASE_URL}/rest/v1/coaches?public_profile_enabled=eq.true&public_slug=not.is.null&select=${cols}&order=full_name.asc`;
  const r = await fetch(url, {
    headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` },
  });
  if (!r.ok) return [];
  const rows = await r.json();
  return Array.isArray(rows) ? rows : [];
}

function applyFilters(coaches, { city, specialty }) {
  let out = coaches;
  if (city) {
    const cityLow = city.toLowerCase();
    out = out.filter((c) => (c.public_city || "").toLowerCase().includes(cityLow));
  }
  if (specialty) {
    const specLow = specialty.toLowerCase();
    out = out.filter((c) => Array.isArray(c.public_specialties) && c.public_specialties.some((s) => String(s).toLowerCase().includes(specLow)));
  }
  return out;
}

function renderCard(coach) {
  const accent = (coach.accent_color && coach.accent_color.startsWith("#")) ? coach.accent_color : "#02d1ba";
  const brand = coach.brand_name || coach.full_name || "Coach";
  const photo = coach.public_photo_url || coach.logo_url || "";
  const specs = Array.isArray(coach.public_specialties) ? coach.public_specialties.filter(Boolean).slice(0, 3) : [];
  const city = coach.public_city || "";
  const initials = (brand || "C").split(" ").map((w) => (w[0] || "")).join("").slice(0, 2).toUpperCase();

  const photoHtml = photo
    ? `<img src="${escAttr(photo)}" alt="${escAttr(brand)}" loading="lazy" style="width:100%;height:100%;object-fit:cover;object-position:50% 25%;display:block"/>`
    : `<div style="display:grid;place-items:center;height:100%;font-size:24px;font-weight:900;color:#000;letter-spacing:-1px;background:linear-gradient(135deg,${accent},${accent}66);">${escHtml(initials)}</div>`;

  const bioPreview = (coach.public_bio || "").replace(/\s+/g, " ").trim().slice(0, 120);

  return `
  <a href="/coach/${encodeURIComponent(coach.public_slug)}" style="display:block;text-decoration:none;color:inherit;">
    <div style="background:rgba(255,255,255,0.025);border:1px solid rgba(255,255,255,0.07);border-radius:18px;padding:18px;transition:all .2s;height:100%;display:flex;flex-direction:column;gap:14px;">
      <div style="display:flex;gap:14px;align-items:center;">
        <div style="width:60px;height:60px;border-radius:50%;overflow:hidden;border:2px solid ${accent}40;flex-shrink:0;">
          ${photoHtml}
        </div>
        <div style="flex:1;min-width:0;">
          <div style="font-size:16px;font-weight:800;color:#fff;letter-spacing:-0.3px;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escHtml(brand)}</div>
          ${city ? `<div style="font-size:11px;color:${accent};letter-spacing:1.5px;text-transform:uppercase;font-weight:700;margin-top:4px;">${escHtml(city)}</div>` : ""}
        </div>
      </div>
      ${bioPreview ? `<div style="font-size:12px;color:rgba(255,255,255,0.55);line-height:1.55;flex:1;">${escHtml(bioPreview)}${(coach.public_bio || "").length > 120 ? "…" : ""}</div>` : ""}
      ${specs.length > 0 ? `
      <div style="display:flex;flex-wrap:wrap;gap:5px;">
        ${specs.map((s) => `<span style="padding:4px 10px;background:${accent}15;border:1px solid ${accent}30;border-radius:100px;font-size:9px;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:${accent};">${escHtml(s)}</span>`).join("")}
      </div>` : ""}
    </div>
  </a>`;
}

function uniqueValues(coaches, field) {
  const set = new Set();
  coaches.forEach((c) => {
    const v = c[field];
    if (Array.isArray(v)) v.forEach((x) => x && set.add(x));
    else if (v) set.add(v);
  });
  return Array.from(set).sort();
}

function renderPage(allCoaches, filtered, filters) {
  const cities = uniqueValues(allCoaches, "public_city");
  const specialties = uniqueValues(allCoaches, "public_specialties");
  const total = filtered.length;
  const totalAll = allCoaches.length;
  const isFiltered = !!filters.city || !!filters.specialty;

  const filterChip = (label, link, active) => `
    <a href="${escAttr(link)}" style="padding:7px 14px;background:${active ? "#02d1ba" : "rgba(255,255,255,0.04)"};border:1px solid ${active ? "transparent" : "rgba(255,255,255,0.08)"};border-radius:100px;font-size:11px;font-weight:700;color:${active ? "#000" : "rgba(255,255,255,0.65)"};text-decoration:none;letter-spacing:.05em;display:inline-block;">${escHtml(label)}</a>
  `;

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0,viewport-fit=cover"/>
<title>Coachs RB Perform${filters.city ? " · " + filters.city : ""}${filters.specialty ? " · " + filters.specialty : ""}</title>
<meta name="description" content="${escAttr(`${totalAll} coachs sportifs sur RB Perform. Trouve un coach pour la performance, la force, la silhouette, le hybrid athlete.`)}"/>
<meta name="theme-color" content="#050505"/>
<meta name="robots" content="index,follow"/>
<link rel="canonical" href="${SITE}/coaches"/>

<meta property="og:type" content="website"/>
<meta property="og:title" content="Coachs RB Perform"/>
<meta property="og:description" content="${escAttr(`${totalAll} coachs sportifs disponibles. Choisis ton expertise.`)}"/>
<meta property="og:url" content="${SITE}/coaches"/>
<meta property="og:image" content="${SITE}/og-image.png"/>

<link rel="icon" type="image/svg+xml" href="/icon.svg"/>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700;800;900&display=swap" rel="stylesheet"/>

<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{background:#050505;color:#fff;min-height:100vh;font-family:-apple-system,'Inter',sans-serif;-webkit-font-smoothing:antialiased}
a{color:inherit}
@keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
.coach-card{animation:fadeUp .5s ease both}
.coach-card:hover > div{background:rgba(255,255,255,0.04) !important;border-color:rgba(2,209,186,0.25) !important;}
@media (prefers-reduced-motion:reduce){*{animation-duration:.01ms!important}}
</style>
</head>
<body>

<main style="max-width:1100px;margin:0 auto;padding:48px 24px 80px;">
  <header style="margin-bottom:36px;">
    <div style="font-size:10px;letter-spacing:3px;text-transform:uppercase;color:rgba(2,209,186,0.65);font-weight:800;margin-bottom:12px;">Annuaire</div>
    <h1 style="font-size:clamp(36px,7vw,56px);font-weight:900;letter-spacing:-0.03em;line-height:1;margin-bottom:14px;">
      Trouve ton coach<span style="color:#02d1ba;">.</span>
    </h1>
    <p style="font-size:15px;color:rgba(255,255,255,0.55);line-height:1.6;max-width:580px;">
      ${totalAll} coachs sportifs sur RB Perform. Performance pure, sans bullshit.
    </p>
  </header>

  ${(cities.length > 0 || specialties.length > 0) ? `
  <div style="margin-bottom:32px;display:flex;flex-direction:column;gap:14px;">
    ${cities.length > 0 ? `
    <div>
      <div style="font-size:9px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,0.35);margin-bottom:8px;">Ville</div>
      <div style="display:flex;flex-wrap:wrap;gap:6px;">
        ${filterChip("Toutes", filters.specialty ? `?specialty=${encodeURIComponent(filters.specialty)}` : "/coaches", !filters.city)}
        ${cities.map((c) => filterChip(c, `?city=${encodeURIComponent(c)}${filters.specialty ? `&specialty=${encodeURIComponent(filters.specialty)}` : ""}`, filters.city === c)).join("")}
      </div>
    </div>` : ""}
    ${specialties.length > 0 ? `
    <div>
      <div style="font-size:9px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,0.35);margin-bottom:8px;">Spécialité</div>
      <div style="display:flex;flex-wrap:wrap;gap:6px;">
        ${filterChip("Toutes", filters.city ? `?city=${encodeURIComponent(filters.city)}` : "/coaches", !filters.specialty)}
        ${specialties.map((s) => filterChip(s, `?specialty=${encodeURIComponent(s)}${filters.city ? `&city=${encodeURIComponent(filters.city)}` : ""}`, filters.specialty === s)).join("")}
      </div>
    </div>` : ""}
  </div>` : ""}

  ${isFiltered ? `<div style="font-size:12px;color:rgba(255,255,255,0.45);margin-bottom:18px;">${total} résultat${total > 1 ? "s" : ""}</div>` : ""}

  ${total === 0 ? `
  <div style="padding:80px 24px;text-align:center;background:rgba(255,255,255,0.025);border:1px solid rgba(255,255,255,0.06);border-radius:18px;">
    <div style="font-size:18px;font-weight:700;color:#fff;margin-bottom:8px;">Aucun coach trouvé</div>
    <div style="font-size:13px;color:rgba(255,255,255,0.5);margin-bottom:20px;">Essaye sans filtres ou avec d'autres critères.</div>
    <a href="/coaches" style="padding:10px 20px;background:rgba(2,209,186,0.12);border:1px solid rgba(2,209,186,0.3);border-radius:10px;color:#02d1ba;font-size:11px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;text-decoration:none;display:inline-block;">Voir tous les coachs</a>
  </div>
  ` : `
  <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px;">
    ${filtered.map((c, i) => `<div class="coach-card" style="animation-delay:${i * 0.04}s;">${renderCard(c)}</div>`).join("")}
  </div>`}

  <footer style="margin-top:64px;padding-top:24px;border-top:1px solid rgba(255,255,255,0.06);text-align:center;">
    <div style="font-size:9px;letter-spacing:.4em;text-transform:uppercase;color:rgba(255,255,255,0.28);font-weight:700;margin-bottom:10px;">Tu es coach ?</div>
    <a href="/" style="font-size:13px;color:#02d1ba;text-decoration:none;font-weight:800;border-bottom:1px solid rgba(2,209,186,0.4);padding-bottom:1px;">Rejoindre RB Perform →</a>
  </footer>
</main>

</body>
</html>`;
}

module.exports = async (req, res) => {
  try {
    const url = new URL(req.url, "https://rbperform.app");
    const filters = {
      city: (url.searchParams.get("city") || "").trim(),
      specialty: (url.searchParams.get("specialty") || "").trim(),
    };
    const allCoaches = await fetchCoaches();
    const filtered = applyFilters(allCoaches, filters);

    res.statusCode = 200;
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=600");
    res.end(renderPage(allCoaches, filtered, filters));
  } catch (e) {
    console.error("[coaches-directory]", e);
    res.statusCode = 500;
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.end(`<!DOCTYPE html><html><body style="background:#050505;color:#fff;font-family:sans-serif;text-align:center;padding:80px;"><h1>Erreur</h1></body></html>`);
  }
};

/*!
 * RB Perform — Cookie Consent Banner
 * GDPR + ePrivacy compliant. Vanilla JS, zero deps.
 *
 * Behavior:
 *   - On first load, if no consent stored → show banner.
 *   - Three categories: necessary (always on), analytics, marketing.
 *   - Refusal as easy as acceptance ("Refuser tout" + "Tout accepter").
 *   - "Personnaliser" expands granular toggles.
 *   - Stores choice with version + timestamp in localStorage `rb_consent`.
 *   - Bilingual FR/EN (reads `rb_lang` / `rbperf_locale`, falls back to navigator.language).
 *
 * Public API (window.RBConsent):
 *   .show()                     → reopen banner (e.g. footer "Manage cookies").
 *   .hasConsent('analytics')    → bool.
 *   .hasConsent('marketing')    → bool.
 *   .getConsent()               → full stored object or null.
 *   .CONSENT_VERSION            → bump to invalidate stored consent on policy change.
 */
(function () {
  'use strict';
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (window.RBConsent && window.RBConsent.__loaded) return;

  var STORAGE_KEY = 'rb_consent';
  var CONSENT_VERSION = 1;

  // ---------- i18n ----------
  var I18N = {
    fr: {
      title: 'Cookies',
      body: 'On utilise des cookies pour améliorer ton expérience. Tu peux choisir.',
      learn: 'Lire la politique cookies',
      accept_all: 'Tout accepter',
      reject_all: 'Refuser',
      customize: 'Personnaliser',
      save: 'Enregistrer mes choix',
      back: '← Retour',
      cat_necessary_title: 'Strictement nécessaires',
      cat_necessary_desc: 'Indispensables au fonctionnement (session, sécurité). Toujours actifs.',
      cat_analytics_title: 'Mesure d\'audience',
      cat_analytics_desc: 'Statistiques anonymes pour améliorer le produit (pages vues, performance).',
      cat_marketing_title: 'Marketing',
      cat_marketing_desc: 'Personnalisation des contenus et mesure de campagnes.',
      always_on: 'Toujours actif',
      aria_label: 'Bandeau de consentement aux cookies',
      aria_close: 'Fermer le bandeau'
    },
    en: {
      title: 'Cookies',
      body: 'We use cookies to improve your experience. You choose.',
      learn: 'Read cookie policy',
      accept_all: 'Accept all',
      reject_all: 'Reject',
      customize: 'Customize',
      save: 'Save my choices',
      back: '← Back',
      cat_necessary_title: 'Strictly necessary',
      cat_necessary_desc: 'Required to run the service (session, security). Always on.',
      cat_analytics_title: 'Analytics',
      cat_analytics_desc: 'Anonymous stats to improve the product (page views, performance).',
      cat_marketing_title: 'Marketing',
      cat_marketing_desc: 'Content personalization and campaign measurement.',
      always_on: 'Always on',
      aria_label: 'Cookie consent banner',
      aria_close: 'Close banner'
    }
  };

  function detectLang() {
    try {
      var saved = localStorage.getItem('rb_lang') || localStorage.getItem('rbperf_locale');
      if (saved === 'fr' || saved === 'en') return saved;
    } catch (e) {}
    var nav = (navigator.language || navigator.userLanguage || 'fr').toLowerCase();
    return nav.indexOf('fr') === 0 ? 'fr' : 'en';
  }

  function t(key) {
    var dict = I18N[detectLang()] || I18N.fr;
    return dict[key] != null ? dict[key] : key;
  }

  // ---------- storage ----------
  function readConsent() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      var obj = JSON.parse(raw);
      if (!obj || typeof obj !== 'object') return null;
      if (obj.version !== CONSENT_VERSION) return null; // outdated → re-ask
      return obj;
    } catch (e) {
      return null;
    }
  }

  function writeConsent(analytics, marketing) {
    var payload = {
      necessary: true,
      analytics: !!analytics,
      marketing: !!marketing,
      version: CONSENT_VERSION,
      timestamp: Date.now()
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (e) {}
    try {
      window.dispatchEvent(new CustomEvent('rb:consent', { detail: payload }));
    } catch (e) {}
    // Charge Vercel Analytics + Speed Insights uniquement si analytics=true.
    // Pour les pages HTML statiques (landing, founding, etc.) ou React n'est
    // pas monte. La SPA React utilise <ConsentAwareAnalytics /> a la place.
    if (payload.analytics) {
      loadVercelAnalytics();
    }
    return payload;
  }

  // Injecte les scripts Vercel (Analytics + Speed Insights) une seule fois.
  // Idempotent : safe si appele plusieurs fois ou apres un re-consent.
  // Skip en dev local : /_vercel/* n'existe pas → CRA renvoie le HTML SPA
  // que le browser essaie de parser comme JS → SyntaxError + overlay erreur.
  function loadVercelAnalytics() {
    try {
      if (window.__rbVercelAnalyticsLoaded) return;
      var host = window.location.hostname;
      var isLocal = host === 'localhost' || host === '127.0.0.1' || host.endsWith('.local');
      if (isLocal) {
        window.__rbVercelAnalyticsLoaded = true;
        return; // Vercel scripts n'existent qu'en prod/preview
      }
      window.__rbVercelAnalyticsLoaded = true;
      var head = document.head || document.getElementsByTagName('head')[0];
      if (!head) return;
      var sources = [
        '/_vercel/insights/script.js',
        '/_vercel/speed-insights/script.js'
      ];
      sources.forEach(function (src) {
        if (document.querySelector('script[src="' + src + '"]')) return;
        var s = document.createElement('script');
        s.defer = true;
        s.src = src;
        s.onerror = function () { /* prod : Vercel server hiccup, on ignore silencieusement */ };
        head.appendChild(s);
      });
    } catch (e) {}
  }

  function hasConsent(category) {
    if (category === 'necessary') return true;
    var c = readConsent();
    if (!c) return false;
    return !!c[category];
  }

  // ---------- DOM ----------
  var ROOT_ID = 'rb-consent-root';

  function ensureStyles() {
    if (document.getElementById('rb-consent-style')) return;
    var css = '' +
      '#' + ROOT_ID + '{position:fixed;left:0;right:0;bottom:0;z-index:99998;font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif;color:#fff;pointer-events:none;}' +
      '#' + ROOT_ID + ' *{box-sizing:border-box;}' +
      '#' + ROOT_ID + ' .rb-consent-card{pointer-events:auto;background:rgba(8,12,20,0.96);-webkit-backdrop-filter:blur(20px) saturate(140%);backdrop-filter:blur(20px) saturate(140%);border-top:1px solid rgba(2,209,186,0.2);box-shadow:0 -20px 60px rgba(0,0,0,0.45);padding:18px 22px calc(18px + env(safe-area-inset-bottom)) 22px;animation:rbConsentUp .42s cubic-bezier(.22,1,.36,1) both;}' +
      '@keyframes rbConsentUp{from{transform:translateY(100%);opacity:0;}to{transform:translateY(0);opacity:1;}}' +
      '#' + ROOT_ID + ' .rb-consent-inner{max-width:1180px;margin:0 auto;display:flex;align-items:center;gap:24px;flex-wrap:wrap;}' +
      '#' + ROOT_ID + ' .rb-consent-text{flex:1 1 380px;min-width:240px;}' +
      '#' + ROOT_ID + ' .rb-consent-eyebrow{font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:rgba(2,209,186,0.85);margin-bottom:6px;}' +
      '#' + ROOT_ID + ' .rb-consent-body{font-size:14px;line-height:1.5;color:rgba(255,255,255,0.78);}' +
      '#' + ROOT_ID + ' .rb-consent-body a{color:rgba(2,209,186,0.85);text-decoration:none;border-bottom:1px solid rgba(2,209,186,0.25);}' +
      '#' + ROOT_ID + ' .rb-consent-body a:hover{color:#02d1ba;border-bottom-color:#02d1ba;}' +
      '#' + ROOT_ID + ' .rb-consent-actions{display:flex;gap:10px;flex-wrap:wrap;}' +
      '#' + ROOT_ID + ' button{font-family:inherit;cursor:pointer;border-radius:12px;border:1px solid transparent;font-size:13px;font-weight:700;letter-spacing:.3px;padding:12px 18px;transition:transform .15s ease,background .2s ease,border-color .2s ease,color .2s ease;-webkit-tap-highlight-color:transparent;}' +
      '#' + ROOT_ID + ' button:hover{transform:translateY(-1px);}' +
      '#' + ROOT_ID + ' button:active{transform:translateY(0);}' +
      '#' + ROOT_ID + ' .rb-btn-primary{background:#FF6B35;color:#0A0A0A;border-color:#FF6B35;box-shadow:0 8px 24px rgba(255,107,53,0.28);}' +
      '#' + ROOT_ID + ' .rb-btn-primary:hover{background:#ff8055;}' +
      '#' + ROOT_ID + ' .rb-btn-ghost{background:transparent;color:rgba(255,255,255,0.78);border-color:rgba(255,255,255,0.16);}' +
      '#' + ROOT_ID + ' .rb-btn-ghost:hover{background:rgba(255,255,255,0.06);color:#fff;border-color:rgba(255,255,255,0.28);}' +
      '#' + ROOT_ID + ' .rb-btn-link{background:transparent;color:rgba(255,255,255,0.6);border-color:transparent;text-decoration:underline;text-underline-offset:3px;padding:12px 4px;}' +
      '#' + ROOT_ID + ' .rb-btn-link:hover{color:#fff;}' +
      '#' + ROOT_ID + ' .rb-consent-cats{margin-top:14px;display:flex;flex-direction:column;gap:10px;}' +
      '#' + ROOT_ID + ' .rb-consent-cat{display:flex;align-items:flex-start;gap:14px;padding:14px 16px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:14px;}' +
      '#' + ROOT_ID + ' .rb-consent-cat-text{flex:1;}' +
      '#' + ROOT_ID + ' .rb-consent-cat-title{font-size:13px;font-weight:700;color:#fff;margin-bottom:3px;display:flex;align-items:center;gap:10px;}' +
      '#' + ROOT_ID + ' .rb-consent-cat-desc{font-size:12px;line-height:1.45;color:rgba(255,255,255,0.55);}' +
      '#' + ROOT_ID + ' .rb-consent-cat .rb-pill{font-size:9px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;padding:3px 8px;border-radius:100px;background:rgba(2,209,186,0.12);color:rgba(2,209,186,0.9);border:1px solid rgba(2,209,186,0.18);}' +
      '#' + ROOT_ID + ' .rb-toggle{position:relative;width:42px;height:24px;flex-shrink:0;background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.12);border-radius:100px;cursor:pointer;transition:background .2s ease,border-color .2s ease;margin-top:2px;}' +
      '#' + ROOT_ID + ' .rb-toggle::after{content:"";position:absolute;top:2px;left:2px;width:18px;height:18px;border-radius:50%;background:#fff;transition:transform .2s ease,background .2s ease;}' +
      '#' + ROOT_ID + ' .rb-toggle[aria-checked="true"]{background:rgba(2,209,186,0.55);border-color:rgba(2,209,186,0.7);}' +
      '#' + ROOT_ID + ' .rb-toggle[aria-checked="true"]::after{transform:translateX(18px);background:#02d1ba;}' +
      '#' + ROOT_ID + ' .rb-toggle[aria-disabled="true"]{cursor:not-allowed;opacity:.6;}' +
      '@media (max-width:680px){' +
      '#' + ROOT_ID + ' .rb-consent-card{padding:16px 16px calc(16px + env(safe-area-inset-bottom)) 16px;}' +
      '#' + ROOT_ID + ' .rb-consent-inner{gap:14px;}' +
      '#' + ROOT_ID + ' .rb-consent-actions{width:100%;}' +
      '#' + ROOT_ID + ' .rb-consent-actions button{flex:1 1 auto;min-width:0;}' +
      '#' + ROOT_ID + ' .rb-btn-link{flex:1 0 100%;text-align:center;}' +
      '}' +
      '@media (prefers-reduced-motion:reduce){' +
      '#' + ROOT_ID + ' .rb-consent-card{animation:none;}' +
      '#' + ROOT_ID + ' button{transition:none;}' +
      '}';
    var s = document.createElement('style');
    s.id = 'rb-consent-style';
    s.appendChild(document.createTextNode(css));
    document.head.appendChild(s);
  }

  // Padding management : banner sits over bottom CTAs. We push body content up
  // by the banner height so primary CTAs (cache, signup, etc.) stay tappable.
  // Restored on destroy().
  var PREV_BODY_PADDING = null;
  var BODY_RESIZE_OBSERVER = null;

  function applyBodyPadding() {
    try {
      var card = document.querySelector('#' + ROOT_ID + ' .rb-consent-card');
      if (!card || !document.body) return;
      var h = Math.ceil(card.getBoundingClientRect().height);
      if (!h) return;
      // 16px breathing room above the banner.
      document.body.style.paddingBottom = (h + 16) + 'px';
    } catch (e) {}
  }

  function restoreBodyPadding() {
    try {
      if (!document.body) return;
      if (PREV_BODY_PADDING == null) {
        document.body.style.removeProperty('padding-bottom');
      } else {
        document.body.style.paddingBottom = PREV_BODY_PADDING;
      }
      PREV_BODY_PADDING = null;
      if (BODY_RESIZE_OBSERVER) {
        try { BODY_RESIZE_OBSERVER.disconnect(); } catch (e) {}
        BODY_RESIZE_OBSERVER = null;
      }
      try { window.removeEventListener('resize', applyBodyPadding); } catch (e) {}
    } catch (e) {}
  }

  function destroy() {
    var el = document.getElementById(ROOT_ID);
    if (el && el.parentNode) el.parentNode.removeChild(el);
    restoreBodyPadding();
  }

  function buildSimpleView(root, state) {
    root.innerHTML = '';
    var card = document.createElement('div');
    card.className = 'rb-consent-card';
    card.setAttribute('role', 'dialog');
    card.setAttribute('aria-live', 'polite');
    card.setAttribute('aria-label', t('aria_label'));

    var inner = document.createElement('div');
    inner.className = 'rb-consent-inner';

    var text = document.createElement('div');
    text.className = 'rb-consent-text';
    var eyebrow = document.createElement('div');
    eyebrow.className = 'rb-consent-eyebrow';
    eyebrow.textContent = t('title');
    var body = document.createElement('div');
    body.className = 'rb-consent-body';
    body.innerHTML = escapeText(t('body')) +
      ' <a href="/legal.html#rgpd" target="_blank" rel="noopener">' + escapeText(t('learn')) + '</a>';
    text.appendChild(eyebrow);
    text.appendChild(body);

    var actions = document.createElement('div');
    actions.className = 'rb-consent-actions';

    var customizeBtn = document.createElement('button');
    customizeBtn.type = 'button';
    customizeBtn.className = 'rb-btn-link';
    customizeBtn.textContent = t('customize');
    customizeBtn.addEventListener('click', function () { buildDetailedView(root, state); });

    var rejectBtn = document.createElement('button');
    rejectBtn.type = 'button';
    rejectBtn.className = 'rb-btn-ghost';
    rejectBtn.textContent = t('reject_all');
    rejectBtn.addEventListener('click', function () {
      writeConsent(false, false);
      destroy();
    });

    var acceptBtn = document.createElement('button');
    acceptBtn.type = 'button';
    acceptBtn.className = 'rb-btn-primary';
    acceptBtn.textContent = t('accept_all');
    acceptBtn.addEventListener('click', function () {
      writeConsent(true, true);
      destroy();
    });

    actions.appendChild(customizeBtn);
    actions.appendChild(rejectBtn);
    actions.appendChild(acceptBtn);

    inner.appendChild(text);
    inner.appendChild(actions);
    card.appendChild(inner);
    root.appendChild(card);
  }

  function buildDetailedView(root, state) {
    root.innerHTML = '';
    var card = document.createElement('div');
    card.className = 'rb-consent-card';
    card.setAttribute('role', 'dialog');
    card.setAttribute('aria-label', t('aria_label'));

    var inner = document.createElement('div');
    inner.className = 'rb-consent-inner';
    inner.style.flexDirection = 'column';
    inner.style.alignItems = 'stretch';

    var text = document.createElement('div');
    text.className = 'rb-consent-text';
    var eyebrow = document.createElement('div');
    eyebrow.className = 'rb-consent-eyebrow';
    eyebrow.textContent = t('title') + ' · ' + t('customize');
    var body = document.createElement('div');
    body.className = 'rb-consent-body';
    body.innerHTML = escapeText(t('body')) +
      ' <a href="/legal.html#rgpd" target="_blank" rel="noopener">' + escapeText(t('learn')) + '</a>';
    text.appendChild(eyebrow);
    text.appendChild(body);

    var cats = document.createElement('div');
    cats.className = 'rb-consent-cats';

    cats.appendChild(buildCategory({
      title: t('cat_necessary_title'),
      desc: t('cat_necessary_desc'),
      pill: t('always_on'),
      checked: true,
      disabled: true
    }, function () { /* locked */ }));

    var analyticsToggle = buildCategory({
      title: t('cat_analytics_title'),
      desc: t('cat_analytics_desc'),
      checked: !!state.analytics
    }, function (val) { state.analytics = val; });
    cats.appendChild(analyticsToggle);

    var marketingToggle = buildCategory({
      title: t('cat_marketing_title'),
      desc: t('cat_marketing_desc'),
      checked: !!state.marketing
    }, function (val) { state.marketing = val; });
    cats.appendChild(marketingToggle);

    var actions = document.createElement('div');
    actions.className = 'rb-consent-actions';
    actions.style.justifyContent = 'space-between';
    actions.style.marginTop = '4px';

    var backBtn = document.createElement('button');
    backBtn.type = 'button';
    backBtn.className = 'rb-btn-link';
    backBtn.textContent = t('back');
    backBtn.addEventListener('click', function () { buildSimpleView(root, state); });

    var rightActions = document.createElement('div');
    rightActions.style.display = 'flex';
    rightActions.style.gap = '10px';
    rightActions.style.flexWrap = 'wrap';

    var rejectBtn = document.createElement('button');
    rejectBtn.type = 'button';
    rejectBtn.className = 'rb-btn-ghost';
    rejectBtn.textContent = t('reject_all');
    rejectBtn.addEventListener('click', function () {
      writeConsent(false, false);
      destroy();
    });

    var saveBtn = document.createElement('button');
    saveBtn.type = 'button';
    saveBtn.className = 'rb-btn-primary';
    saveBtn.textContent = t('save');
    saveBtn.addEventListener('click', function () {
      writeConsent(state.analytics, state.marketing);
      destroy();
    });

    rightActions.appendChild(rejectBtn);
    rightActions.appendChild(saveBtn);

    actions.appendChild(backBtn);
    actions.appendChild(rightActions);

    inner.appendChild(text);
    inner.appendChild(cats);
    inner.appendChild(actions);
    card.appendChild(inner);
    root.appendChild(card);
  }

  function buildCategory(opts, onChange) {
    var row = document.createElement('div');
    row.className = 'rb-consent-cat';

    var txt = document.createElement('div');
    txt.className = 'rb-consent-cat-text';
    var title = document.createElement('div');
    title.className = 'rb-consent-cat-title';
    var titleSpan = document.createElement('span');
    titleSpan.textContent = opts.title;
    title.appendChild(titleSpan);
    if (opts.pill) {
      var pill = document.createElement('span');
      pill.className = 'rb-pill';
      pill.textContent = opts.pill;
      title.appendChild(pill);
    }
    var desc = document.createElement('div');
    desc.className = 'rb-consent-cat-desc';
    desc.textContent = opts.desc;
    txt.appendChild(title);
    txt.appendChild(desc);

    var toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'rb-toggle';
    toggle.setAttribute('role', 'switch');
    toggle.setAttribute('aria-checked', opts.checked ? 'true' : 'false');
    if (opts.disabled) toggle.setAttribute('aria-disabled', 'true');
    toggle.setAttribute('aria-label', opts.title);
    toggle.addEventListener('click', function () {
      if (opts.disabled) return;
      var next = toggle.getAttribute('aria-checked') !== 'true';
      toggle.setAttribute('aria-checked', next ? 'true' : 'false');
      onChange(next);
    });

    row.appendChild(txt);
    row.appendChild(toggle);
    return row;
  }

  function escapeText(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function show() {
    ensureStyles();
    destroy();
    var existing = readConsent();
    var state = {
      analytics: existing ? !!existing.analytics : false,
      marketing: existing ? !!existing.marketing : false
    };
    var root = document.createElement('div');
    root.id = ROOT_ID;
    document.body.appendChild(root);
    buildSimpleView(root, state);

    // Push page content above the banner so bottom CTAs remain accessible.
    try {
      PREV_BODY_PADDING = document.body.style.paddingBottom || '';
    } catch (e) { PREV_BODY_PADDING = ''; }
    // Initial measure (next frame so layout has settled post-append).
    if (window.requestAnimationFrame) {
      window.requestAnimationFrame(applyBodyPadding);
    } else {
      setTimeout(applyBodyPadding, 16);
    }
    // Track height changes (simple ↔ detailed view, viewport rotate).
    if (typeof ResizeObserver !== 'undefined') {
      try {
        BODY_RESIZE_OBSERVER = new ResizeObserver(applyBodyPadding);
        BODY_RESIZE_OBSERVER.observe(root);
      } catch (e) {}
    }
    window.addEventListener('resize', applyBodyPadding);
  }

  function init() {
    // Pages premium sans tracking : on bypass le banner (only-strictly-necessary
    // = pas de consent requis sous RGPD, le draft localStorage est fonctionnel).
    var bypassPaths = ['/candidature'];
    if (bypassPaths.indexOf(window.location.pathname) !== -1) {
      return;
    }
    var existing = readConsent();
    if (!existing) {
      // Defer slightly so the banner never blocks LCP / first paint.
      var schedule = window.requestIdleCallback || function (cb) { return setTimeout(cb, 250); };
      schedule(function () { show(); });
    } else if (existing.analytics) {
      // L'utilisateur a deja consenti dans une visite precedente : on
      // charge Vercel Analytics au boot (deferred pour ne pas bloquer LCP).
      var schedule2 = window.requestIdleCallback || function (cb) { return setTimeout(cb, 500); };
      schedule2(function () { loadVercelAnalytics(); });
    }
    // React to lang switch on the same page → re-render banner if open.
    window.addEventListener('storage', function (e) {
      if (e.key === 'rb_lang' || e.key === 'rbperf_locale') {
        if (document.getElementById(ROOT_ID)) show();
      }
    });
  }

  window.RBConsent = {
    __loaded: true,
    CONSENT_VERSION: CONSENT_VERSION,
    show: show,
    hasConsent: hasConsent,
    getConsent: readConsent
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

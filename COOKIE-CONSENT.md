# Cookie Consent — RB Perform

GDPR + ePrivacy compliant cookie banner. Vanilla JS, zero dependencies, bilingual FR/EN.

## How it works

`/public/cookie-consent.js` is loaded with `defer` on every public marketing page
(`landing.html`, `founding.html`, `waitlist.html`, `welcome.html`, `404.html`)
and on the React shell (`public/index.html`). On first load, if no consent is
stored in `localStorage.rb_consent`, it shows a slide-up banner anchored to the
bottom of the viewport.

The banner exposes three categories:

| Category    | State            | Notes                                                |
|-------------|------------------|------------------------------------------------------|
| `necessary` | always `true`    | Session, security. Cannot be toggled off.            |
| `analytics` | opt-in           | Anonymous stats, performance.                        |
| `marketing` | opt-in           | Personalization, campaigns.                          |

User actions:

- **Accept all** → `analytics: true, marketing: true`.
- **Reject** → `analytics: false, marketing: false` (refusal as easy as acceptance).
- **Customize** → granular toggles, then **Save**.

Refusal is symmetrical to acceptance (one click, same prominence) — required by
CNIL guidelines from 17 September 2020.

## Storage format

```js
localStorage.getItem('rb_consent')
// → JSON string:
// {
//   "necessary": true,
//   "analytics": false,
//   "marketing": false,
//   "version": 1,
//   "timestamp": 1745712000000
// }
```

`timestamp` is `Date.now()` at the moment the user submitted their choice.
`version` is `RBConsent.CONSENT_VERSION` at the time the choice was made.

## Public API

The script attaches `window.RBConsent` once loaded:

```js
window.RBConsent.show()                       // (re)open the banner
window.RBConsent.hasConsent('analytics')      // boolean
window.RBConsent.hasConsent('marketing')      // boolean
window.RBConsent.hasConsent('necessary')      // always true
window.RBConsent.getConsent()                 // full object or null
window.RBConsent.CONSENT_VERSION              // current version (number)
```

A `rb:consent` `CustomEvent` fires on `window` whenever the user saves a choice;
`event.detail` is the full payload. Use it to gate analytics/marketing scripts:

```js
window.addEventListener('rb:consent', (e) => {
  if (e.detail.analytics) loadPlausible();
});

if (window.RBConsent && window.RBConsent.hasConsent('analytics')) {
  loadPlausible();
}
```

## Reopening the banner

Every public page footer has a "Gérer mes cookies" / "Manage cookies" link that
calls `window.RBConsent.show()`. Inside the React app, the same control lives
in **MonCompte → Sécurité → Cookies & confidentialité**.

## Bilingual

Reads `localStorage.rb_lang` (HTML pages) or `localStorage.rbperf_locale` (React)
and falls back to `navigator.language`. Detection is identical to the lang
bridge used by the rest of the site, so a user who picked EN on the landing
gets the EN banner.

## Versioning the policy

Bump `CONSENT_VERSION` at the top of `/public/cookie-consent.js` whenever the
cookie policy materially changes (new category, scope change, retention bump).
Stored consents from older versions are treated as missing and the banner is
re-shown.

```js
// /public/cookie-consent.js
var CONSENT_VERSION = 2; // was 1 — re-prompt all users
```

## Wiring analytics later

The banner does **not** load analytics. It only records consent. When wiring
Plausible / Vercel Analytics / Mistral / etc., gate the loader on
`window.RBConsent.hasConsent('analytics')` and listen to `rb:consent` so the
script can spin up immediately if the user opts in after the first load.

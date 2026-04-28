/**
 * i18n — FR (default) + EN avec lazy loading par locale (wave 5.7).
 *
 * Avant : 4670+ lignes, dico FR+EN inline dans le main bundle (~150KB).
 * Maintenant : chaque locale est un chunk separe (webpack code splitting),
 * charge dynamiquement via `import()`. Le main bundle ne contient plus
 * que la logique (~2KB).
 *
 * Usage (inchange) :
 *   import { useT, setLocale, getLocale } from "../lib/i18n";
 *   const t = useT();
 *   <h1>{t("nav.training")}</h1>
 *
 * IMPORTANT : avant le premier render React, l'app doit appeler
 *   await preloadActiveLocale();
 * sinon t() retourne la cle (fallback). Voir src/index.js.
 */

import { useState, useEffect } from "react";

const STORAGE_KEY = "rbperf_locale";
// Bridge avec les pages HTML statiques (landing.html, founding.html, etc.)
// qui utilisent la cle "rb_lang". On synchronise les deux dans les 2 sens.
const STORAGE_KEY_BRIDGE = "rb_lang";
const DEFAULT_LOCALE = "fr";
const SUPPORTED = ["fr", "en"];

// ===== STATE =====
// Cache des dicos charges. Initialement vide — populated par loadLocale().
const dicts = Object.create(null);
const inflight = Object.create(null); // promesses en cours pour eviter les double-loads
let currentLocale = DEFAULT_LOCALE;
const subscribers = new Set();

function detectInitialLocale() {
  // 1. localStorage — d'abord la cle React, puis la cle bridge HTML
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && SUPPORTED.includes(saved)) return saved;
    const savedBridge = localStorage.getItem(STORAGE_KEY_BRIDGE);
    if (savedBridge && SUPPORTED.includes(savedBridge)) return savedBridge;
  } catch {}
  // 2. navigator.language
  if (typeof navigator !== "undefined") {
    const lang = (navigator.language || "fr").toLowerCase().slice(0, 2);
    if (SUPPORTED.includes(lang)) return lang;
  }
  return DEFAULT_LOCALE;
}

currentLocale = typeof window !== "undefined" ? detectInitialLocale() : DEFAULT_LOCALE;

// ===== LAZY LOADER =====

/**
 * Charge le chunk d'une locale (idempotent).
 * webpackChunkName fait que le bundle final s'appelle `i18n-fr.[hash].chunk.js`,
 * cle pour le caching CDN long-term.
 */
function loadLocale(locale) {
  if (!SUPPORTED.includes(locale)) return Promise.resolve();
  if (dicts[locale]) return Promise.resolve(dicts[locale]);
  if (inflight[locale]) return inflight[locale];

  const promise =
    locale === "en"
      ? import(/* webpackChunkName: "i18n-en" */ "./i18n/en")
      : import(/* webpackChunkName: "i18n-fr" */ "./i18n/fr");

  inflight[locale] = promise.then(
    (mod) => {
      dicts[locale] = mod.default || mod;
      delete inflight[locale];
      return dicts[locale];
    },
    (err) => {
      delete inflight[locale];
      console.error(`[i18n] failed to load locale=${locale}`, err);
      throw err;
    }
  );
  return inflight[locale];
}

/**
 * A appeler une seule fois au boot, AVANT ReactDOM.render(),
 * pour que le premier paint ait deja les traductions.
 */
export function preloadActiveLocale() {
  return loadLocale(currentLocale);
}

// ===== API =====

/** Retourne la locale courante */
export function getLocale() {
  return currentLocale;
}

/** Change la locale + persiste + load le chunk + notify */
export function setLocale(locale) {
  if (!SUPPORTED.includes(locale)) return;
  currentLocale = locale;
  try {
    localStorage.setItem(STORAGE_KEY, locale);
    // Bridge: synchroniser avec la cle utilisee par les pages HTML statiques
    localStorage.setItem(STORAGE_KEY_BRIDGE, locale);
  } catch {}
  // Update html lang attribute
  if (typeof document !== "undefined") {
    document.documentElement.lang = locale;
  }
  // Charge le chunk si pas deja en cache, puis notifie les subscribers
  // une fois pret (sinon premier render apres switch = cles brutes).
  loadLocale(locale).finally(() => {
    subscribers.forEach((cb) => cb(locale));
  });
}

/** Liste des locales supportees */
export function getSupportedLocales() {
  return [...SUPPORTED];
}

/**
 * Translation function — pure (pour usage hors React).
 * Si le dict n'est pas encore charge, retourne la cle (fallback graceful).
 */
export function t(key, fallback) {
  const dict = dicts[currentLocale] || dicts[DEFAULT_LOCALE];
  if (!dict) return fallback || key;
  return dict[key] || fallback || key;
}

/** Hook React — re-render quand la locale change */
export function useT() {
  const [locale, setLoc] = useState(currentLocale);
  useEffect(() => {
    const cb = (newLoc) => setLoc(newLoc);
    subscribers.add(cb);
    return () => subscribers.delete(cb);
  }, []);
  return (key, fallback) => {
    const dict = dicts[locale] || dicts[DEFAULT_LOCALE];
    if (!dict) return fallback || key;
    return dict[key] || fallback || key;
  };
}

/** Hook + setter — pour le toggle UI */
export function useLocale() {
  const [locale, setLoc] = useState(currentLocale);
  useEffect(() => {
    const cb = (newLoc) => setLoc(newLoc);
    subscribers.add(cb);
    return () => subscribers.delete(cb);
  }, []);
  return [locale, setLocale];
}

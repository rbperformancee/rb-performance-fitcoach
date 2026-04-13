/**
 * i18n simple — FR (default) + EN.
 * Pas de dependance externe, juste un dictionnaire + hook React.
 *
 * Usage :
 *   import { useT, setLocale, getLocale } from "../lib/i18n";
 *   const t = useT();
 *   <h1>{t("nav.training")}</h1>
 *
 * Pour ajouter une langue :
 *   1. Ajoute la cle dans MESSAGES.fr ET MESSAGES.en
 *   2. Optionnel : ajoute "es", "de" etc.
 *
 * Pour switch :
 *   setLocale("en")  // persistant via localStorage
 */

import { useState, useEffect } from "react";

const STORAGE_KEY = "rbperf_locale";
const DEFAULT_LOCALE = "fr";
const SUPPORTED = ["fr", "en"];

// ===== DICTIONNAIRE =====
const MESSAGES = {
  fr: {
    // Navigation
    "nav.training": "Entrainement",
    "nav.weight": "Poids",
    "nav.move": "Mouvement",
    "nav.fuel": "Nutrition",
    "nav.profile": "Profil",
    // Auth
    "auth.welcome": "Bienvenue",
    "auth.email_placeholder": "Ton email",
    "auth.send_link": "Recevoir mon code",
    "auth.sending": "Envoi",
    "auth.resend": "Renvoyer le code",
    "auth.logout": "Se deconnecter",
    "auth.login": "Se connecter",
    "auth.signup": "S'inscrire",
    // Common
    "common.loading": "Chargement",
    "common.save": "Enregistrer",
    "common.saving": "Enregistrement",
    "common.cancel": "Annuler",
    "common.delete": "Supprimer",
    "common.edit": "Modifier",
    "common.continue": "Continuer",
    "common.back": "Retour",
    "common.confirm": "Confirmer",
    "common.close": "Fermer",
    "common.send": "Envoyer",
    "common.copy": "Copier",
    "common.copied": "Copie",
    "common.share": "Partager",
    "common.retry": "Reessayer",
    "common.error": "Erreur",
    "common.success": "Succes",
    // Training
    "training.start": "Demarrer",
    "training.session_done": "Seance terminee",
    "training.set_validated": "Serie validee",
    "training.next_exercise": "Exercice suivant",
    "training.rest": "Repos",
    // Coach
    "coach.invite_clients": "Inviter mes clients",
    "coach.coach_code": "Code coach",
    "coach.invite_link": "Lien d'invitation",
    "coach.no_clients": "Ton premier client t'attend.",
    "coach.add_client": "Ajouter un client",
    // Status
    "status.offline": "Hors ligne",
    "status.online": "En ligne",
  },
  en: {
    // Navigation
    "nav.training": "Training",
    "nav.weight": "Weight",
    "nav.move": "Move",
    "nav.fuel": "Nutrition",
    "nav.profile": "Profile",
    // Auth
    "auth.welcome": "Welcome",
    "auth.email_placeholder": "Your email",
    "auth.send_link": "Get my code",
    "auth.sending": "Sending",
    "auth.resend": "Resend code",
    "auth.logout": "Sign out",
    "auth.login": "Sign in",
    "auth.signup": "Sign up",
    // Common
    "common.loading": "Loading",
    "common.save": "Save",
    "common.saving": "Saving",
    "common.cancel": "Cancel",
    "common.delete": "Delete",
    "common.edit": "Edit",
    "common.continue": "Continue",
    "common.back": "Back",
    "common.confirm": "Confirm",
    "common.close": "Close",
    "common.send": "Send",
    "common.copy": "Copy",
    "common.copied": "Copied",
    "common.share": "Share",
    "common.retry": "Retry",
    "common.error": "Error",
    "common.success": "Success",
    // Training
    "training.start": "Start",
    "training.session_done": "Session done",
    "training.set_validated": "Set logged",
    "training.next_exercise": "Next exercise",
    "training.rest": "Rest",
    // Coach
    "coach.invite_clients": "Invite my clients",
    "coach.coach_code": "Coach code",
    "coach.invite_link": "Invite link",
    "coach.no_clients": "Your first client is waiting.",
    "coach.add_client": "Add a client",
    // Status
    "status.offline": "Offline",
    "status.online": "Online",
  },
};

// ===== STATE =====
let currentLocale = DEFAULT_LOCALE;
const subscribers = new Set();

function detectInitialLocale() {
  // 1. localStorage
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && SUPPORTED.includes(saved)) return saved;
  } catch {}
  // 2. navigator.language
  if (typeof navigator !== "undefined") {
    const lang = (navigator.language || "fr").toLowerCase().slice(0, 2);
    if (SUPPORTED.includes(lang)) return lang;
  }
  return DEFAULT_LOCALE;
}

currentLocale = typeof window !== "undefined" ? detectInitialLocale() : DEFAULT_LOCALE;

// ===== API =====

/** Retourne la locale courante */
export function getLocale() {
  return currentLocale;
}

/** Change la locale + persiste + notify */
export function setLocale(locale) {
  if (!SUPPORTED.includes(locale)) return;
  currentLocale = locale;
  try { localStorage.setItem(STORAGE_KEY, locale); } catch {}
  // Update html lang attribute
  if (typeof document !== "undefined") {
    document.documentElement.lang = locale;
  }
  subscribers.forEach((cb) => cb(locale));
}

/** Liste des locales supportees */
export function getSupportedLocales() {
  return [...SUPPORTED];
}

/** Translation function — pure (pour usage hors React) */
export function t(key, fallback) {
  const dict = MESSAGES[currentLocale] || MESSAGES[DEFAULT_LOCALE];
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
    const dict = MESSAGES[locale] || MESSAGES[DEFAULT_LOCALE];
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

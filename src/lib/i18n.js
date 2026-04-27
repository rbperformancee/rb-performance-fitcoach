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
    // Login screen
    "login.client_zone": "Espace client",
    "login.coach_zone": "Espace coach",
    "login.connection": "Connexion",
    "login.coach": "Coach",
    "login.client_subtitle": "Entre ton email pour recevoir ton code de connexion.",
    "login.coach_subtitle": "Connecte-toi avec ton email et ton mot de passe.",
    "login.email_label": "Email",
    "login.email_placeholder": "ton@email.com",
    "login.coach_email_placeholder": "coach@email.com",
    "login.password_label": "Mot de passe",
    "login.password_placeholder": "Ton mot de passe",
    "login.code_label": "Code a 6 chiffres",
    "login.code_sent_to": "Envoye a",
    "login.send_code": "Recevoir mon code",
    "login.sending": "Envoi...",
    "login.verifying": "Verification...",
    "login.connecting": "Connexion...",
    "login.connect": "Me connecter",
    "login.change_email": "Changer d'email",
    "login.forgot_password": "Mot de passe oublie ?",
    "login.coach_switch": "Tu es coach ? Espace coach",
    "login.client_switch": "Retour espace client",
    "login.code_sent_success": "Code envoye a",
    "login.no_account": "Aucun compte trouve avec cet email. Contacte ton coach.",
    "login.send_error": "Erreur lors de l'envoi du code.",
    "login.code_invalid": "Code incorrect ou expire. Reessaie.",
    "login.success_redirect": "Connexion reussie, redirection...",
    "login.verify_error": "Erreur de verification",
    "login.bad_credentials": "Email ou mot de passe incorrect.",
    "login.connect_error": "Erreur de connexion.",
    "login.email_first": "Entre ton email d'abord.",
    "login.reset_email_sent": "Email de reinitialisation envoye.",
    "login.error_generic": "Erreur",
    // Profile
    "profile.title": "Profil",
    "profile.level": "Niveau",
    "profile.xp": "XP",
    "profile.streak": "Streak",
    "profile.best_streak": "Meilleur",
    "profile.recent_activity": "Activite recente",
    "profile.no_activity": "Aucune activite recente",
    "profile.language": "Langue",
    "profile.help_center": "Centre d'aide",
    "profile.logout": "Se deconnecter",
    "profile.confidentiality": "Confidentialite",
    "profile.legal_notice": "Mentions legales",
    "profile.cgu": "CGU",
    "profile.delete_data": "Supprimer mes donnees",
    "profile.coach_label": "Ton coach",
    "profile.message_coach": "Message a ton coach...",
    "profile.book_session": "Reserver un creneau",
    "profile.send_message": "Envoyer un message",
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
    // Login screen
    "login.client_zone": "Client area",
    "login.coach_zone": "Coach area",
    "login.connection": "Sign in",
    "login.coach": "Coach",
    "login.client_subtitle": "Enter your email to receive your sign-in code.",
    "login.coach_subtitle": "Sign in with your email and password.",
    "login.email_label": "Email",
    "login.email_placeholder": "your@email.com",
    "login.coach_email_placeholder": "coach@email.com",
    "login.password_label": "Password",
    "login.password_placeholder": "Your password",
    "login.code_label": "6-digit code",
    "login.code_sent_to": "Sent to",
    "login.send_code": "Get my code",
    "login.sending": "Sending...",
    "login.verifying": "Verifying...",
    "login.connecting": "Signing in...",
    "login.connect": "Sign in",
    "login.change_email": "Change email",
    "login.forgot_password": "Forgot password?",
    "login.coach_switch": "Are you a coach? Coach area",
    "login.client_switch": "Back to client area",
    "login.code_sent_success": "Code sent to",
    "login.no_account": "No account found with this email. Contact your coach.",
    "login.send_error": "Error sending code.",
    "login.code_invalid": "Wrong or expired code. Try again.",
    "login.success_redirect": "Sign-in successful, redirecting...",
    "login.verify_error": "Verification error",
    "login.bad_credentials": "Wrong email or password.",
    "login.connect_error": "Sign-in error.",
    "login.email_first": "Enter your email first.",
    "login.reset_email_sent": "Reset email sent.",
    "login.error_generic": "Error",
    // Profile
    "profile.title": "Profile",
    "profile.level": "Level",
    "profile.xp": "XP",
    "profile.streak": "Streak",
    "profile.best_streak": "Best",
    "profile.recent_activity": "Recent activity",
    "profile.no_activity": "No recent activity",
    "profile.language": "Language",
    "profile.help_center": "Help center",
    "profile.logout": "Sign out",
    "profile.confidentiality": "Privacy",
    "profile.legal_notice": "Legal notice",
    "profile.cgu": "Terms",
    "profile.delete_data": "Delete my data",
    "profile.coach_label": "Your coach",
    "profile.message_coach": "Message your coach...",
    "profile.book_session": "Book a session",
    "profile.send_message": "Send message",
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

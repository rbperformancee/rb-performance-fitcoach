import React from "react";
import { useT } from "../../lib/i18n";

export const G = "#02d1ba";

export function AuthVisual({ quote }) {
  const t = useT();
  const text = quote || t("as.default_quote");
  return (
    <div className="auth-visual">
      <div className="auth-logo" aria-label={t("as.logo_aria")}>
        <svg viewBox="170 50 180 410" width="20" height="44" aria-hidden="true">
          <polygon points="300,60 180,280 248,280 210,450 340,220 268,220 300,60" fill={G} />
        </svg>
        <span>RB<span style={{ color: G }}>PERFORM</span></span>
      </div>
      <div className="auth-quote">
        {text.split("\n").map((l, i) => <React.Fragment key={i}>{l}<br /></React.Fragment>)}
      </div>
      <div className="auth-version">{t("as.beta_label")}</div>
    </div>
  );
}

// Styles CSS communs injectes une seule fois
export const AuthStyles = () => (
  <style>{`
    .auth-page {
      display: grid;
      grid-template-columns: 1fr 1fr;
      min-height: 100dvh;
      min-height: 100svh;
      background: #000;
      color: #fff;
      font-family: 'DM Sans', -apple-system, sans-serif;
    }
    .auth-visual {
      background: radial-gradient(ellipse at 30% 50%, rgba(2,209,186,.12) 0%, transparent 70%), #000;
      border-right: .5px solid rgba(255,255,255,.06);
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      gap: 24px; padding: 60px;
      position: relative;
    }
    .auth-logo {
      display: flex; align-items: center; gap: 10px;
      font-family: 'Syne', sans-serif;
      font-size: 20px; font-weight: 900;
      letter-spacing: .1em; color: #fff;
    }
    .auth-quote {
      font-size: 15px; font-weight: 300;
      color: rgba(255,255,255,.4);
      text-align: center; line-height: 1.6;
      max-width: 300px;
      font-style: italic;
    }
    .auth-version {
      position: absolute; bottom: 40px;
      font-size: 10px; font-weight: 600;
      letter-spacing: .2em; text-transform: uppercase;
      color: rgba(255,255,255,.2);
    }
    .auth-form-panel {
      display: flex; flex-direction: column;
      justify-content: center;
      padding: 60px 80px;
      max-width: 560px;
      margin: 0 auto; width: 100%;
      box-sizing: border-box;
    }
    .auth-back {
      position: absolute; top: 24px; left: 24px;
      background: transparent; border: none;
      color: rgba(255,255,255,.4);
      font-family: inherit; font-size: 12px;
      cursor: pointer; padding: 8px 12px;
      letter-spacing: .02em;
    }
    .auth-back:hover { color: rgba(255,255,255,.7); }
    .auth-title {
      font-family: 'Syne', sans-serif;
      font-size: 32px; font-weight: 900;
      color: #fff; letter-spacing: -1px;
      margin: 0 0 6px;
    }
    .auth-subtitle {
      font-size: 14px; font-weight: 300;
      color: rgba(255,255,255,.35);
      margin: 0 0 36px;
    }
    .auth-subtitle.accent { color: ${G}; opacity: .85; }
    .auth-field { margin-bottom: 16px; }
    .auth-label-row {
      display: flex; justify-content: space-between;
      align-items: baseline; margin-bottom: 8px;
    }
    .auth-label {
      font-size: 11px; font-weight: 600;
      letter-spacing: .1em; text-transform: uppercase;
      color: rgba(255,255,255,.35);
    }
    .auth-link {
      font-size: 11px; color: ${G};
      text-decoration: none; opacity: .7;
      transition: opacity .15s;
    }
    .auth-link:hover { opacity: 1; }
    .auth-input {
      width: 100%; height: 48px;
      background: rgba(255,255,255,.04);
      border: .5px solid rgba(255,255,255,.1);
      border-radius: 10px;
      color: #fff;
      font-family: 'DM Sans', sans-serif;
      font-size: 14px;
      padding: 0 16px; outline: none;
      transition: border-color .2s, background .2s;
      box-sizing: border-box;
    }
    .auth-input:focus {
      border-color: ${G};
      background: rgba(2,209,186,.03);
    }
    .auth-input.err {
      border-color: rgba(239,68,68,.5);
      background: rgba(239,68,68,.04);
    }
    .auth-btn {
      width: 100%; height: 48px;
      background: ${G}; color: #000;
      border: none; border-radius: 10px;
      font-family: 'Syne', sans-serif;
      font-size: 13px; font-weight: 700;
      letter-spacing: .1em;
      cursor: pointer; margin-top: 8px;
      transition: opacity .2s, transform .15s;
      box-shadow: 0 16px 40px rgba(2,209,186,.3);
    }
    .auth-btn:hover { opacity: .88; }
    .auth-btn:active { transform: scale(.98); }
    .auth-btn:disabled {
      opacity: .4; cursor: not-allowed;
      box-shadow: none;
    }
    .auth-btn-ghost {
      width: 100%; height: 48px;
      background: rgba(255,255,255,.04);
      border: .5px solid rgba(255,255,255,.1);
      border-radius: 10px;
      color: rgba(255,255,255,.75);
      font-family: 'DM Sans', sans-serif;
      font-size: 13px; font-weight: 500;
      cursor: pointer;
      transition: background .15s;
      display: flex; align-items: center; justify-content: center; gap: 10px;
    }
    .auth-btn-ghost:hover {
      background: rgba(255,255,255,.06);
      color: #fff;
    }
    .auth-sep {
      display: flex; align-items: center; gap: 14px;
      margin: 20px 0;
      font-size: 10px; color: rgba(255,255,255,.25);
      letter-spacing: .2em; text-transform: uppercase;
    }
    .auth-sep::before, .auth-sep::after {
      content: ''; flex: 1; height: .5px;
      background: rgba(255,255,255,.1);
    }
    .auth-error {
      margin-top: 14px;
      padding: 10px 14px;
      background: rgba(239,68,68,.06);
      border: .5px solid rgba(239,68,68,.2);
      border-radius: 8px;
      font-size: 12px; color: #ef4444;
      letter-spacing: .02em;
    }
    .auth-foot {
      margin-top: 32px;
      font-size: 13px;
      color: rgba(255,255,255,.4);
      text-align: center;
    }
    .auth-foot a {
      color: ${G}; text-decoration: none;
      font-weight: 600;
    }
    .auth-foot a:hover { opacity: .8; }
    .auth-checkbox-row {
      display: flex; align-items: flex-start; gap: 10px;
      margin-top: 12px;
      font-size: 12px; color: rgba(255,255,255,.55);
      line-height: 1.5;
    }
    .auth-checkbox {
      width: 18px; height: 18px; flex-shrink: 0;
      accent-color: ${G};
      margin-top: 1px;
      cursor: pointer;
    }
    .auth-checkbox-row a {
      color: ${G}; text-decoration: none;
    }
    .auth-checkbox-row a:hover { text-decoration: underline; }
    .auth-strength {
      display: flex; gap: 4px; margin-top: 8px;
    }
    .auth-strength-bar {
      flex: 1; height: 3px;
      background: rgba(255,255,255,.08);
      border-radius: 2px;
      transition: background .2s;
    }
    .auth-strength-bar.on-1 { background: #ef4444; }
    .auth-strength-bar.on-2 { background: #f97316; }
    .auth-strength-bar.on-3 { background: ${G}; }
    .auth-strength-label {
      font-size: 10px;
      color: rgba(255,255,255,.35);
      margin-top: 6px;
      letter-spacing: .02em;
    }

    /* Confirmation email screen */
    .auth-confirm {
      text-align: center; padding: 40px 20px;
    }
    .auth-confirm-icon {
      width: 64px; height: 64px;
      border-radius: 50%;
      background: rgba(2,209,186,.08);
      border: .5px solid rgba(2,209,186,.25);
      display: inline-flex; align-items: center; justify-content: center;
      margin-bottom: 24px;
    }
    .auth-confirm-title {
      font-family: 'Syne', sans-serif;
      font-size: 26px; font-weight: 900;
      letter-spacing: -.5px; color: #fff;
      margin-bottom: 10px;
    }
    .auth-confirm-sub {
      font-size: 14px;
      color: rgba(255,255,255,.45);
      line-height: 1.6;
      max-width: 360px; margin: 0 auto;
    }
    .auth-confirm-email {
      color: ${G};
      font-weight: 600;
    }

    @media (max-width: 768px) {
      .auth-page { grid-template-columns: 1fr; }
      .auth-visual { display: none; }
      .auth-form-panel { padding: 60px 24px 40px; }
      .auth-title { font-size: 28px; }
    }
  `}</style>
);

export function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

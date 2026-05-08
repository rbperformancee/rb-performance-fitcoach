import React from 'react';
import { useT, t as tStatic, getLocale } from '../lib/i18n';
import { RB_SUPPORT_EMAIL } from '../lib/branding';

const fillTpl = (s, vars) => {
  let out = s;
  Object.entries(vars).forEach(([k, v]) => { out = out.split(`{${k}}`).join(String(v)); });
  return out;
};

const intlLocale = () => getLocale() === "en" ? "en-US" : "fr-FR";

export function exportProgramPDF(client, programme) {
  const name = client?.full_name || client?.email?.split('@')[0] || tStatic('ppdf.client_fallback');
  const date = new Date().toLocaleDateString(intlLocale());
  const html = programme?.html_content || '';
  const lang = getLocale() === 'en' ? 'en' : 'fr';
  const titleTxt = fillTpl(tStatic('ppdf.doc_title'), { name });
  const subtitle = tStatic('ppdf.subtitle');
  const generatedOn = fillTpl(tStatic('ppdf.generated_on'), { date });
  const noProgram = tStatic('ppdf.no_program');

  const page = `<!DOCTYPE html>
<html lang="${lang}">
<head>
<meta charset="utf-8"/>
<title>${titleTxt}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: -apple-system, Arial, sans-serif; background: #fff; color: #111; }
  .header { background: #0d0d0d; padding: 32px; display: flex; align-items: center; justify-content: space-between; }
  .header-left h1 { font-size: 28px; font-weight: 900; color: #fff; letter-spacing: -1px; }
  .header-left h1 span { color: #02d1ba; }
  .header-left p { font-size: 12px; color: #6b7280; margin-top: 4px; letter-spacing: 2px; }
  .header-right { text-align: right; }
  .header-right .client-name { font-size: 18px; font-weight: 800; color: #f5f5f5; }
  .header-right .date { font-size: 11px; color: #6b7280; margin-top: 4px; }
  .accent-bar { height: 3px; background: linear-gradient(90deg, #02d1ba, transparent); }
  .content { padding: 32px; }
  .watermark { position: fixed; bottom: 20px; right: 20px; font-size: 10px; color: #ccc; letter-spacing: 1px; }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style>
</head>
<body>
<div class="header">
  <div class="header-left">
    <h1>RB <span>PERFORM</span></h1>
    <p>${subtitle}</p>
  </div>
  <div class="header-right">
    <div class="client-name">${name}</div>
    <div class="date">${generatedOn}</div>
  </div>
</div>
<div class="accent-bar"></div>
<div class="content">${html || `<p style="color:#666;text-align:center;padding:40px">${noProgram}</p>`}</div>
<div class="watermark">RB PERFORM · SIRET 99063780300018 · ${RB_SUPPORT_EMAIL}</div>
</body>
</html>`;

  const blob = new Blob([page], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, '_blank');
  if (win) {
    win.onload = () => {
      setTimeout(() => { win.print(); }, 500);
    };
  }
  if (navigator.vibrate) navigator.vibrate([20, 10, 40]);
}

export default function ProgramPDFButton({ client, programme }) {
  const t = useT();
  if (!programme?.html_content) return null;
  return (
    <button
      onClick={() => exportProgramPDF(client, programme)}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        background: 'rgba(2,209,186,0.1)',
        border: '1px solid rgba(2,209,186,0.25)',
        borderRadius: 10, padding: '8px 14px',
        color: '#02d1ba', fontSize: 12, fontWeight: 700,
        cursor: 'pointer', transition: 'all 0.15s',
      }}
      onMouseEnter={e => e.currentTarget.style.background = 'rgba(2,209,186,0.18)'}
      onMouseLeave={e => e.currentTarget.style.background = 'rgba(2,209,186,0.1)'}
    >
      {t('ppdf.btn_export')}
    </button>
  );
}

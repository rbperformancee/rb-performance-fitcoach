/**
 * Messages log helper + email templates rendering.
 *
 * Inspiré de FunnelOps lib/email.ts + log structure.
 * Usage :
 *   const tpl = await loadTemplate('pre_call_d_minus_1');
 *   const html = renderTemplate(tpl.html_body, { first_name: 'Rayan' });
 *   const subject = renderTemplate(tpl.subject, { first_name: 'Rayan' });
 *   await sendAndLog({ to, subject, html, template_key: 'pre_call_d_minus_1', ref_type, ref_id });
 */

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function sbFetch(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  if (!res.ok && res.status !== 204) {
    const text = await res.text();
    throw new Error(`SB ${res.status}: ${text.slice(0, 200)}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

/**
 * Charge un template depuis email_templates par key.
 */
async function loadTemplate(key) {
  const data = await sbFetch(
    `/rest/v1/email_templates?key=eq.${encodeURIComponent(key)}&active=eq.true&select=id,key,subject,html_body,vars&limit=1`
  );
  if (!Array.isArray(data) || data.length === 0) return null;
  return data[0];
}

/**
 * Interpole un template avec des variables {{var}}.
 * Helpers spéciaux :
 *   - {{first_name_comma}} → ", {{first_name}}" si défini, "" sinon
 *   - {{var_or:Anonyme}}   → "{{var}}" si défini, "Anonyme" sinon (TODO)
 */
function renderTemplate(template, vars) {
  if (!template) return '';
  const v = vars || {};
  let out = String(template);

  // Helper "_comma" : ajoute la virgule si la var existe
  out = out.replace(/\{\{(\w+)_comma\}\}/g, (_, name) => {
    const val = v[name];
    return val ? `, ${escHtml(String(val))}` : '';
  });

  // Variables standards
  out = out.replace(/\{\{(\w+)\}\}/g, (_, name) => {
    const val = v[name];
    if (val == null) return '';
    return escHtml(String(val));
  });

  return out;
}

const escHtml = (s) => String(s ?? '').replace(/[&<>"'`=\/]/g, (c) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;',
  "'": '&#39;', '`': '&#96;', '=': '&#61;', '/': '&#47;',
}[c]));

/**
 * Log un message envoyé dans la table messages. Best-effort.
 */
async function logMessage({
  ref_type,         // 'coaching_application' | 'pack_decouverte_optin' | 'manual' | 'other'
  ref_id,
  email,
  direction = 'out',
  channel = 'email',
  template_key,
  subject,
  body_preview,
  status = 'sent',
  provider,
  provider_id,
  error_message,
  meta,
}) {
  try {
    await sbFetch('/rest/v1/funnel_messages', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({
        ref_type: ref_type || 'other',
        ref_id: ref_id || null,
        email: email || null,
        direction,
        channel,
        template_key: template_key || null,
        subject: subject || null,
        body_preview: body_preview ? String(body_preview).slice(0, 500) : null,
        status,
        provider: provider || null,
        provider_id: provider_id || null,
        error_message: error_message || null,
        meta: meta || {},
      }),
    });
  } catch (e) {
    console.error('[logMessage] failed:', e.message);
  }
}

/**
 * Wrapper : envoie via nodemailer transporter ET log dans messages.
 * Si template_key + vars sont fournis, charge le template et l'interpole.
 */
async function sendAndLog({
  transporter,
  from,
  to,
  replyTo,
  // Soit subject + html directs, soit template_key + vars
  subject,
  html,
  template_key,
  vars,
  // Pour le log
  ref_type,
  ref_id,
  provider = 'zoho',
}) {
  let finalSubject = subject;
  let finalHtml = html;

  if (template_key && !finalSubject && !finalHtml) {
    const tpl = await loadTemplate(template_key);
    if (!tpl) {
      throw new Error(`Template '${template_key}' not found or inactive`);
    }
    finalSubject = renderTemplate(tpl.subject, vars);
    finalHtml = renderTemplate(tpl.html_body, vars);
  }

  try {
    const info = await transporter.sendMail({
      from,
      to: [to],
      replyTo: replyTo || undefined,
      subject: finalSubject,
      html: finalHtml,
    });
    await logMessage({
      ref_type,
      ref_id,
      email: to,
      direction: 'out',
      channel: 'email',
      template_key,
      subject: finalSubject,
      body_preview: finalHtml,
      status: 'sent',
      provider,
      provider_id: info?.messageId,
    });
    return { ok: true, info };
  } catch (err) {
    await logMessage({
      ref_type,
      ref_id,
      email: to,
      direction: 'out',
      channel: 'email',
      template_key,
      subject: finalSubject,
      body_preview: finalHtml,
      status: 'failed',
      provider,
      error_message: err.message,
    });
    throw err;
  }
}

module.exports = {
  loadTemplate,
  renderTemplate,
  logMessage,
  sendAndLog,
};

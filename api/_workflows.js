/**
 * Workflows engine — adapté de FunnelOps lib/workflows.ts pour RB Perform.
 *
 * Usage : appeler runWorkflows(triggerType, context) depuis les endpoints
 * qui déclenchent un événement business (candidature reçue, outcome changé,
 * etc.). Fire-and-forget : ne bloque pas la réponse principale.
 *
 * Le moteur charge tous les workflows actifs matching le trigger, et
 * exécute leurs actions en séquence. Chaque run est tracé dans workflow_runs
 * avec log array pour debugging.
 */

const nodemailer = require('nodemailer');
const { loadTemplate, renderTemplate, logMessage } = require('./_messages');
const { pushMetaEvent } = require('./_meta-pixel');

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SMTP_USER = process.env.ZOHO_SMTP_USER || 'rayan@rbperform.app';
const SMTP_PASS = process.env.ZOHO_SMTP_PASS;
const RB_SUPPORT_EMAIL = 'rb.performancee@gmail.com';

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

function getTransporter() {
  if (!SMTP_PASS) return null;
  return nodemailer.createTransport({
    host: 'smtp.zoho.eu',
    port: 465,
    secure: true,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
}

/**
 * Trigger filter pour `coaching_application_outcome_set` :
 * trigger.config.to peut filtrer sur l'outcome final.
 */
function triggerMatches(wf, triggerType, context) {
  if (wf.trigger?.type !== triggerType) return false;
  const cfg = wf.trigger?.config || {};
  if (triggerType === 'coaching_application_outcome_set') {
    if (cfg.to && cfg.to !== context.newOutcome) return false;
    if (cfg.from && cfg.from !== context.oldOutcome) return false;
  }
  return true;
}

/**
 * Exécute une action selon son type. Throw si erreur (catchée par runWorkflows).
 */
async function executeAction(action, ctx, transporter) {
  switch (action.type) {
    case 'send_email': {
      const { template_key, vars = {}, to: toTarget } = action.config || {};
      const targetEmail = toTarget === 'rayan' ? RB_SUPPORT_EMAIL : ctx.email;
      if (!targetEmail) throw new Error('No target email');
      if (!template_key) throw new Error('Missing template_key');
      if (!transporter) throw new Error('No SMTP transporter');

      const tpl = await loadTemplate(template_key);
      if (!tpl) throw new Error(`Template '${template_key}' not found`);

      const mergedVars = { ...ctx, ...vars };
      const subject = renderTemplate(tpl.subject, mergedVars);
      const html = renderTemplate(tpl.html_body, mergedVars);

      const info = await transporter.sendMail({
        from: `Rayan · RB Perform <${SMTP_USER}>`,
        to: [targetEmail],
        replyTo: SMTP_USER,
        subject,
        html,
      });
      await logMessage({
        ref_type: ctx.ref_type,
        ref_id: ctx.ref_id,
        email: targetEmail,
        direction: 'out',
        channel: 'email',
        template_key,
        subject,
        body_preview: html,
        status: 'sent',
        provider: 'zoho',
        provider_id: info?.messageId,
        meta: { workflow_action: 'send_email', target: toTarget || 'lead' },
      });
      return { ok: true, message_id: info?.messageId };
    }

    case 'send_email_inline': {
      const { subject: subjTpl, html_body: bodyTpl, to: toTarget } = action.config || {};
      const targetEmail = toTarget === 'rayan' ? RB_SUPPORT_EMAIL : ctx.email;
      if (!targetEmail) throw new Error('No target email');
      if (!transporter) throw new Error('No SMTP transporter');

      const subject = renderTemplate(subjTpl, ctx);
      const html = renderTemplate(bodyTpl, ctx);

      const info = await transporter.sendMail({
        from: `Rayan · RB Perform <${SMTP_USER}>`,
        to: [targetEmail],
        replyTo: SMTP_USER,
        subject,
        html,
      });
      await logMessage({
        ref_type: ctx.ref_type,
        ref_id: ctx.ref_id,
        email: targetEmail,
        direction: 'out',
        channel: 'email',
        subject,
        body_preview: html,
        status: 'sent',
        provider: 'zoho',
        provider_id: info?.messageId,
        meta: { workflow_action: 'send_email_inline', target: toTarget || 'lead' },
      });
      return { ok: true, message_id: info?.messageId };
    }

    case 'set_call_outcome': {
      const { outcome } = action.config || {};
      if (!ctx.application_id) throw new Error('No application_id in context');
      if (!outcome) throw new Error('Missing outcome config');
      await sbFetch(`/rest/v1/coaching_applications?id=eq.${ctx.application_id}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ call_outcome: outcome, call_completed_at: new Date().toISOString() }),
      });
      return { ok: true, outcome };
    }

    case 'set_crm_stage': {
      const { stage } = action.config || {};
      if (!ctx.email) throw new Error('No email in context for CRM stage');
      if (!stage) throw new Error('Missing stage config');
      await sbFetch('/rest/v1/crm_contacts', {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates' },
        body: JSON.stringify({
          email: String(ctx.email).toLowerCase(),
          stage,
          last_contacted_at: new Date().toISOString(),
        }),
      });
      return { ok: true, stage };
    }

    case 'add_tag': {
      const { tag } = action.config || {};
      if (!ctx.email || !tag) throw new Error('Missing email/tag');
      await sbFetch('/rest/v1/crm_tags', {
        method: 'POST',
        headers: { Prefer: 'resolution=ignore-duplicates' },
        body: JSON.stringify({ email: String(ctx.email).toLowerCase(), tag }),
      });
      return { ok: true, tag };
    }

    case 'webhook': {
      const { url, method = 'POST', headers = {} } = action.config || {};
      if (!url) throw new Error('Missing webhook url');
      const resp = await fetch(url, {
        method,
        headers: { 'content-type': 'application/json', ...headers },
        body: JSON.stringify(ctx),
      });
      if (!resp.ok) throw new Error(`Webhook ${resp.status}`);
      return { ok: true, status: resp.status };
    }

    case 'meta_event': {
      const { event_name, value } = action.config || {};
      if (!event_name) throw new Error('Missing meta event_name');
      const res = await pushMetaEvent({
        event_name,
        email: ctx.email,
        phone: ctx.phone,
        value: value || ctx.value || undefined,
        custom_data: { workflow_triggered: true, ref_id: ctx.ref_id },
      });
      return { ok: res?.ok !== false, event_name };
    }

    case 'internal_alert': {
      const { subject: subjTpl, body: bodyTpl } = action.config || {};
      if (!transporter) throw new Error('No SMTP');
      const subject = renderTemplate(subjTpl || 'Alerte workflow', ctx);
      const body = renderTemplate(bodyTpl || '', ctx);
      const info = await transporter.sendMail({
        from: `RB Perform Workflows <${SMTP_USER}>`,
        to: [RB_SUPPORT_EMAIL],
        replyTo: SMTP_USER,
        subject,
        html: `<pre style="font-family:monospace;font-size:13px;background:#0d0d0d;color:#fff;padding:16px;border-radius:8px">${body}</pre>`,
      });
      return { ok: true, message_id: info?.messageId };
    }

    case 'delay': {
      // Stub MVP : on log juste. Pour vraie attente, faut une queue (Vercel
      // Queues / Upstash). Pour l'instant, l'action suivante exécute immédiatement.
      const { minutes } = action.config || {};
      return { ok: true, skipped: 'delay_not_implemented', minutes };
    }

    default:
      throw new Error(`Unknown action type: ${action.type}`);
  }
}

/**
 * Charge les workflows actifs pour ce trigger + exécute chacun en séquence.
 * Fire-and-forget : ne propage pas les erreurs au caller.
 *
 * @param {string} triggerType - voir migration 125 pour liste
 * @param {Object} context - { ref_type, ref_id, email, phone, application_id, oldOutcome, newOutcome, ... }
 */
async function runWorkflows(triggerType, context) {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('[runWorkflows] Missing Supabase env');
    return;
  }

  try {
    const workflows = await sbFetch(
      `/rest/v1/workflows?active=eq.true&trigger->>type=eq.${encodeURIComponent(triggerType)}&select=id,name,trigger,actions`
    );
    if (!Array.isArray(workflows) || workflows.length === 0) return;

    const transporter = getTransporter();

    for (const wf of workflows) {
      if (!triggerMatches(wf, triggerType, context)) continue;

      // Crée un workflow_runs row
      let runId = null;
      try {
        const inserted = await sbFetch('/rest/v1/workflow_runs', {
          method: 'POST',
          headers: { Prefer: 'return=representation' },
          body: JSON.stringify({
            workflow_id: wf.id,
            ref_type: context.ref_type || null,
            ref_id: context.ref_id || null,
            status: 'running',
            context: context,
          }),
        });
        runId = Array.isArray(inserted) && inserted[0]?.id;
      } catch (e) {
        console.error(`[runWorkflows] failed to create run for wf=${wf.id}:`, e.message);
        continue;
      }

      const log = [];
      let runStatus = 'done';
      try {
        const actions = Array.isArray(wf.actions) ? wf.actions : [];
        for (const action of actions) {
          const startedAt = new Date().toISOString();
          try {
            const result = await executeAction(action, context, transporter);
            log.push({ at: startedAt, action: action.type, ok: true, result });
          } catch (actErr) {
            log.push({ at: startedAt, action: action.type, ok: false, error: actErr.message });
            // On continue les autres actions même si une échoue
            runStatus = 'failed';
          }
        }
      } catch (e) {
        log.push({ error: e.message });
        runStatus = 'failed';
      }

      // Update run final
      if (runId) {
        try {
          await sbFetch(`/rest/v1/workflow_runs?id=eq.${runId}`, {
            method: 'PATCH',
            headers: { Prefer: 'return=minimal' },
            body: JSON.stringify({
              status: runStatus,
              log,
              finished_at: new Date().toISOString(),
            }),
          });
        } catch (e) {
          console.error(`[runWorkflows] failed to finalize run ${runId}:`, e.message);
        }
      }
    }
  } catch (err) {
    console.error('[runWorkflows] unexpected:', err.message);
  }
}

module.exports = { runWorkflows, executeAction };

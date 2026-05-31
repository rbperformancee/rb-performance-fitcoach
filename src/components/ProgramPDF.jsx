import React from 'react';
import { useT, t as tStatic, getLocale } from '../lib/i18n';
import { RB_SUPPORT_EMAIL } from '../lib/branding';
import { parseProgrammeHTML, expandProgrammeWeeks } from '../utils/parserProgramme';
import { findVideo } from '../data/exerciseVideos';
import { findFallbackVideo } from '../data/fallbackVideos';

const fillTpl = (s, vars) => {
  let out = s;
  Object.entries(vars).forEach(([k, v]) => { out = out.split(`{${k}}`).join(String(v)); });
  return out;
};

const intlLocale = () => getLocale() === "en" ? "en-US" : "fr-FR";

function esc(v) {
  return String(v ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

// YouTube ID extraction
function ytIdFromUrl(url) {
  if (!url) return null;
  const u = String(url);
  let m = u.match(/youtu\.be\/([\w-]{11})/);
  if (m) return m[1];
  m = u.match(/[?&]v=([\w-]{11})/);
  if (m) return m[1];
  m = u.match(/youtube\.com\/(?:shorts|embed)\/([\w-]{11})/);
  if (m) return m[1];
  return null;
}

function resolveExoVideoUrl(ex) {
  if (!ex) return null;
  if (ex.vidUrl) return ex.vidUrl;
  const own = findVideo(ex.name);
  if (own) return own;
  const fb = findFallbackVideo(ex.name);
  if (fb && fb.url) return fb.url;
  return null;
}

// Détecte le type de séance (UPPER/LOWER/PUSH/PULL/LEGS/EXTRA…) depuis le nom
function detectSessionType(name) {
  const n = String(name || '').toUpperCase();
  if (/EXTRA|BONUS|FACULTATIF|OPTIONNEL/.test(n)) return { label: 'EXTRA', color: '#a855f7', bg: 'rgba(168,85,247,0.12)', bdr: 'rgba(168,85,247,0.32)' };
  if (/PUSH/.test(n))           return { label: 'PUSH',  color: '#f97316', bg: 'rgba(249,115,22,0.12)', bdr: 'rgba(249,115,22,0.32)' };
  if (/PULL/.test(n))           return { label: 'PULL',  color: '#3b82f6', bg: 'rgba(59,130,246,0.12)', bdr: 'rgba(59,130,246,0.32)' };
  if (/LEGS?|JAMBES?|LOWER/.test(n)) return { label: /LOWER/.test(n) ? 'LOWER' : 'LEGS', color: '#22c55e', bg: 'rgba(34,197,94,0.12)', bdr: 'rgba(34,197,94,0.32)' };
  if (/UPPER/.test(n))          return { label: 'UPPER', color: '#06b6d4', bg: 'rgba(6,182,212,0.12)', bdr: 'rgba(6,182,212,0.32)' };
  if (/BENCH/.test(n))          return { label: 'BENCH', color: '#ef4444', bg: 'rgba(239,68,68,0.12)', bdr: 'rgba(239,68,68,0.32)' };
  if (/COURSE|RUN|FOOTING|SEUIL|VO2|ENDURANCE|SORTIE/.test(n)) return { label: 'RUN', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', bdr: 'rgba(245,158,11,0.32)' };
  return null;
}

/**
 * renderProgramPrintableHTML — version premium éditoriale.
 *
 * Structure :
 *   1. Cover (page 1) — black full-bleed, branding + titre + stats + athlete
 *   2. Sommaire (page 2) — liste de toutes les semaines + séances
 *   3. Pour chaque semaine :
 *      a. Page de garde (full-bleed dark) avec SEMAINE 0X + count séances
 *      b. Une page par séance (ou plus si beaucoup d'exos), avec running header
 *   4. Back cover (page finale) — signature coach + motivation
 *
 * Typographie : DM Sans pour les titres (variable), Inter pour le body.
 * Téléchargées via Google Fonts inline pour rendu print parfait.
 */
export function renderProgramPrintableHTML(client, programme) {
  const name = client?.full_name || client?.email?.split('@')[0] || tStatic('ppdf.client_fallback');
  const dateLong = new Date().toLocaleDateString(intlLocale(), { day: 'numeric', month: 'long', year: 'numeric' });
  const lang = getLocale() === 'en' ? 'en' : 'fr';
  const titleTxt = fillTpl(tStatic('ppdf.doc_title'), { name });
  const noProgram = tStatic('ppdf.no_program');

  let parsed = null;
  try {
    if (programme?.html_content) {
      parsed = expandProgrammeWeeks(parseProgrammeHTML(programme.html_content));
    }
  } catch (e) {
    console.warn('[exportProgramPDF] parse error', e);
  }

  // ===== Stats globales =====
  const stats = parsed ? (() => {
    let totalExos = 0, withVideo = 0, distinctExoNames = new Set();
    let amrapCount = 0, ergoCount = 0, runCount = 0, bonusCount = 0;
    (parsed.weeks || []).forEach((w) => {
      (w.sessions || []).forEach((s) => {
        totalExos += (s.exercises || []).length;
        (s.exercises || []).forEach((ex) => {
          if (ex.name) distinctExoNames.add(ex.name.toLowerCase().trim());
          if (resolveExoVideoUrl(ex)) withVideo++;
        });
        amrapCount += (s.amraps || []).length;
        ergoCount += (s.ergos || []).length;
        runCount += (s.runs || []).length;
        if (s.bonus) bonusCount++;
      });
    });
    return { totalExos, withVideo, distinctExos: distinctExoNames.size, amrapCount, ergoCount, runCount, bonusCount };
  })() : null;

  // ===== Chip prescription =====
  const chip = (label, value, color, bg, bdr) => (
    value
      ? `<span style="display:inline-flex;align-items:baseline;gap:5px;padding:4px 10px;background:${bg};border:1px solid ${bdr};border-radius:100px;font-size:10px;white-space:nowrap;line-height:1.3;">
           <span style="font-size:7.5px;font-weight:800;letter-spacing:1.2px;text-transform:uppercase;color:${color};opacity:.7;">${esc(label)}</span>
           <span style="font-weight:700;color:${color};">${esc(value)}</span>
         </span>`
      : ''
  );

  // ===== Exercice (carte avec miniature) =====
  const renderExo = (ex, eIdx) => {
    const vidUrl = resolveExoVideoUrl(ex);
    const vidId = ytIdFromUrl(vidUrl);
    const thumb = vidId ? `https://img.youtube.com/vi/${vidId}/mqdefault.jpg` : null;
    const reps = ex.rawReps || (ex.sets && ex.reps ? `${ex.sets}×${ex.reps}` : (ex.reps || ''));

    const leadBadge = ex.group
      ? `<div style="position:absolute;top:6px;left:6px;width:24px;height:24px;border-radius:6px;background:#7c3aed;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:11px;letter-spacing:-.3px;box-shadow:0 2px 6px rgba(124,58,237,.4);">${esc(ex.group)}</div>`
      : '';

    const thumbBlock = thumb
      ? `<div style="width:114px;height:82px;flex-shrink:0;border-radius:11px;overflow:hidden;background:#0a0a0a;position:relative;border:1px solid #e2e8f0;">
           <img src="${esc(thumb)}" alt="" style="width:100%;height:100%;object-fit:cover;display:block;" crossorigin="anonymous" />
           <div style="position:absolute;inset:0;background:linear-gradient(180deg,transparent 50%,rgba(0,0,0,.7) 100%);"></div>
           ${leadBadge}
           <div style="position:absolute;bottom:5px;right:6px;font-size:8.5px;color:#fff;font-weight:800;letter-spacing:1.3px;text-transform:uppercase;display:flex;align-items:center;gap:3px;">
             <svg width="9" height="9" viewBox="0 0 24 24" fill="#02d1ba"><polygon points="6 4 22 12 6 20"/></svg>
             Démo
           </div>
         </div>`
      : `<div style="width:114px;height:82px;flex-shrink:0;border-radius:11px;background:#f8fafc;border:1px dashed #cbd5e1;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#94a3b8;position:relative;">
           ${leadBadge}
           <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="opacity:.45;margin-bottom:3px;"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>
           <div style="font-size:8.5px;letter-spacing:1.2px;text-transform:uppercase;font-weight:700;">Pas de démo</div>
         </div>`;

    const numLabel = `<span style="display:inline-block;font-family:ui-monospace,'SF Mono',Menlo,monospace;font-size:11px;color:#cbd5e1;font-weight:700;margin-right:8px;">${String(eIdx + 1).padStart(2, '0')}</span>`;

    return `<div class="exo-row" style="display:flex;gap:14px;padding:13px;background:#fff;border:1px solid #e5e7eb;border-radius:13px;margin-top:8px;box-shadow:0 1px 3px rgba(15,23,42,.04);">
      ${thumbBlock}
      <div style="flex:1;min-width:0;display:flex;flex-direction:column;justify-content:center;">
        <div style="font-family:'DM Sans',inherit;font-size:14.5px;font-weight:800;color:#0f172a;line-height:1.2;letter-spacing:-0.35px;margin-bottom:8px;">${numLabel}${esc(ex.name)}</div>
        <div style="display:flex;flex-wrap:wrap;gap:5px;">
          ${chip('Séries × Reps', reps, '#02544a', '#ecfdf5', '#a7f3d0')}
          ${ex.charge ? chip('Charge', ex.charge, '#92400e', '#fef3c7', '#fde68a') : ''}
          ${ex.tempo ? chip('Tempo', ex.tempo, '#475569', '#f8fafc', '#e2e8f0') : ''}
          ${ex.rir != null && ex.rir !== '' ? chip('RIR', ex.rir, '#475569', '#f8fafc', '#e2e8f0') : ''}
          ${ex.rest ? chip('Repos', ex.rest, '#9a3412', '#fff7ed', '#fed7aa') : ''}
        </div>
      </div>
    </div>`;
  };

  // ===== Séance =====
  const renderSession = (s, sIdx, weekIdx, weekTotal) => {
    const type = detectSessionType(s.name);
    const bonus = s.bonus
      ? '<span class="badge-bonus" style="font-size:8.5px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;color:#7c3aed;background:#f3e8ff;padding:3px 9px;border-radius:100px;margin-left:8px;border:1px solid #ddd6fe;">EXTRA</span>'
      : '';
    const typeBadge = type
      ? `<span style="display:inline-flex;align-items:center;gap:5px;font-size:9px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;color:${type.color};background:${type.bg};padding:4px 10px;border-radius:100px;border:1px solid ${type.bdr};">
          <span style="width:6px;height:6px;border-radius:50%;background:${type.color};"></span>${type.label}
        </span>`
      : '';

    const exos = (s.exercises || []).map(renderExo).join('');
    const desc = s.description ? `<div style="font-size:11.5px;color:#64748b;margin-top:6px;font-style:italic;line-height:1.45;max-width:88%;">${esc(s.description)}</div>` : '';

    // ÉCHAUFFEMENT — bloc éditorial sobre en tête de séance, avant les exos.
    // Typographie magazine : trait fin, numéros mono, no gradient bling-bling.
    const w = s.warmup;
    const warmupBlock = (w && Array.isArray(w.movements) && w.movements.length > 0) ? `
      <div class="warmup-block" style="margin-top:12px;padding:12px 14px;background:#fafaf5;border:1px solid #e8e4d8;border-radius:11px;break-inside:avoid;">
        <div style="display:flex;align-items:flex-end;justify-content:space-between;padding-bottom:9px;border-bottom:1px solid #e8e4d8;margin-bottom:9px;">
          <div>
            <div style="font-family:'DM Sans',inherit;font-size:9.5px;font-weight:800;letter-spacing:2.8px;text-transform:uppercase;color:#92837a;">Échauffement · Circuit</div>
            <div style="font-size:10.5px;color:#a8998a;margin-top:2px;font-style:italic;">En boucle · ${w.rounds || 3} tour${(w.rounds || 3) > 1 ? 's' : ''}${w.restBetween ? ` · ${esc(w.restBetween)} entre tours` : ''}</div>
          </div>
          <div style="font-family:ui-monospace,'SF Mono',Menlo,monospace;font-size:22px;font-weight:200;color:#92837a;letter-spacing:-1px;line-height:1;">×${w.rounds || 3}</div>
        </div>
        ${w.movements.map((m, mi) => `
          <div style="display:flex;align-items:baseline;gap:10px;padding:5px 0;${mi < w.movements.length - 1 ? 'border-bottom:1px dashed #e8e4d8;' : ''}">
            <span style="font-family:ui-monospace,'SF Mono',Menlo,monospace;font-size:10px;font-weight:700;color:#cbc4b3;width:22px;">${String(mi + 1).padStart(2, '0')}</span>
            <span style="flex:1;font-size:12px;font-weight:600;color:#0f172a;letter-spacing:-0.15px;">${esc(m.name || '')}</span>
            <span style="font-family:ui-monospace,'SF Mono',Menlo,monospace;font-size:11px;font-weight:700;color:#92837a;letter-spacing:-0.2px;">${esc(m.spec || '')}</span>
          </div>`).join('')}
        ${w.notes ? `<div style="margin-top:9px;padding-top:8px;border-top:1px dashed #e8e4d8;font-size:10.5px;color:#92837a;font-style:italic;line-height:1.4;">— ${esc(w.notes)}</div>` : ''}
      </div>` : '';

    const runs = (s.runs || []).map((r) => {
      const isFrac = (r.repeats != null && r.repeats >= 2) || !!r.work;
      const isTimePattern = (v) => /^\s*\d+\s*(s|sec|secondes|min|m|'[\d]*|"|)\s*$|^\s*\d+\s*'\s*\d{0,2}\s*$/i.test(v || '');
      const isTimeBased = isFrac && isTimePattern(r.work) && isTimePattern(r.rest);
      const tag = isFrac
        ? `<span style="background:#fee2e2;color:#dc2626;font-size:8.5px;font-weight:800;letter-spacing:1.3px;text-transform:uppercase;padding:2px 8px;border-radius:100px;">${isTimeBased ? 'HIIT' : 'Frac'}</span>`
        : `<span style="background:#dbeafe;color:#1e40af;font-size:8.5px;font-weight:800;letter-spacing:1.3px;text-transform:uppercase;padding:2px 8px;border-radius:100px;">Cardio</span>`;
      const big = isFrac
        ? (isTimeBased
            ? `${esc(r.repeats || '?')} × ${esc(r.work || '?')} <span style="color:#cbd5e1;">/</span> ${esc(r.rest || '?')}`
            : `${esc(r.repeats || '?')} × ${esc(r.work || '?')}`)
        : null;
      const meta = [r.distance, r.duration, r.bpm ? `${r.bpm} bpm` : null, !isFrac ? r.rest : null].filter(Boolean).join(' · ');
      return `<div class="run-block" style="margin-top:8px;padding:13px 15px;background:linear-gradient(135deg,#fff8ed,#fff);border-left:3px solid #f59e0b;border-radius:10px;border:1px solid #fde68a;border-left-width:3px;">
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:5px;">${tag}<strong style="font-family:'DM Sans',inherit;color:#0f172a;font-size:13.5px;letter-spacing:-0.2px;">${esc(r.name || 'Run')}</strong></div>
        ${big ? `<div style="font-family:ui-monospace,'SF Mono',Menlo,monospace;font-size:17px;font-weight:800;color:#dc2626;letter-spacing:-0.3px;line-height:1.2;">${big}${r.target ? ` <span style="color:#64748b;font-weight:600;font-size:12px;">@ ${esc(r.target)}</span>` : ''}${!isTimeBased && r.rest ? ` <span style="color:#94a3b8;font-weight:500;font-size:12px;">· R ${esc(r.rest)}</span>` : ''}</div>` : ''}
        ${meta ? `<div style="font-size:11px;color:#64748b;margin-top:3px;">${esc(meta)}</div>` : ''}
      </div>`;
    }).join('');

    const amraps = (s.amraps || []).map((a) => `<div class="amrap-block" style="margin-top:8px;padding:15px 17px;background:linear-gradient(135deg,#fef2f2 0%,#ffffff 100%);border:1px solid #fecaca;border-left:3px solid #ef4444;border-radius:10px;">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:7px;">
        <strong style="font-family:'DM Sans',inherit;color:#dc2626;font-size:12px;letter-spacing:2.5px;text-transform:uppercase;">${esc(a.title || 'AMRAP')}</strong>
        ${a.minutes ? `<span style="font-family:ui-monospace,'SF Mono',Menlo,monospace;font-size:17px;font-weight:800;color:#dc2626;letter-spacing:-0.5px;">${esc(a.minutes)}<span style="font-size:11px;font-weight:700;opacity:.7;margin-left:3px;">min</span></span>` : ''}
      </div>
      ${a.description ? `<div style="font-size:12px;color:#334155;white-space:pre-wrap;line-height:1.6;font-family:ui-monospace,'SF Mono',Menlo,monospace;">${esc(a.description)}</div>` : ''}
    </div>`).join('');

    const ergos = (s.ergos || []).map((e) => {
      const meta = [e.goal, e.minutes ? `${e.minutes} min` : null].filter(Boolean).join(' · ');
      return `<div class="ergo-block" style="margin-top:8px;padding:13px 15px;background:linear-gradient(135deg,#ecfeff,#fff);border:1px solid #bae6fd;border-left:3px solid #38bdf8;border-radius:10px;">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
          <strong style="font-family:'DM Sans',inherit;color:#0369a1;font-size:13px;letter-spacing:-0.2px;">${esc(e.machine || 'Ergo')}</strong>
          ${meta ? `<span style="font-family:ui-monospace,'SF Mono',Menlo,monospace;font-size:13px;font-weight:700;color:#0369a1;">${esc(meta)}</span>` : ''}
        </div>
        ${e.notes ? `<div style="margin-top:5px;font-size:11px;color:#475569;line-height:1.45;">${esc(e.notes)}</div>` : ''}
      </div>`;
    }).join('');

    const fields = (s.fieldSessions || []).map((f) => `<div class="field-block" style="margin-top:8px;padding:13px 15px;background:linear-gradient(135deg,#f0fdf4,#fff);border:1px solid #bbf7d0;border-left:3px solid #22c55e;border-radius:10px;">
      <strong style="font-family:'DM Sans',inherit;color:#166534;font-size:13px;letter-spacing:-0.2px;">${esc(f.title || 'Séance terrain')}</strong>
      ${f.moment ? `<span style="color:#64748b;font-size:11px;margin-left:6px;">· ${esc(f.moment)}</span>` : ''}
      ${f.description ? `<div style="margin-top:5px;font-size:11.5px;color:#334155;line-height:1.45;">${esc(f.description)}</div>` : ''}
    </div>`).join('');

    const fin = s.finisher ? `
      <div class="finisher-block" style="margin-top:10px;padding:13px 15px;background:linear-gradient(135deg,#1e293b,#0f172a);border-radius:10px;color:#fff;">
        <strong style="font-family:'DM Sans',inherit;font-size:9.5px;font-weight:800;letter-spacing:2.2px;text-transform:uppercase;color:#fbbf24;display:block;margin-bottom:6px;">⚡ Finisher</strong>
        <div style="font-size:12px;color:rgba(255,255,255,0.92);line-height:1.55;white-space:pre-wrap;">${esc(s.finisher)}</div>
      </div>` : '';

    const sessionNumber = String(sIdx + 1).padStart(2, '0');
    return `<article class="session-card" style="margin-top:14px;padding:18px;background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;box-shadow:0 2px 4px rgba(15,23,42,.04);">
      <header class="session-header" style="padding-bottom:13px;border-bottom:1px solid #f1f5f9;">
        <div style="display:flex;align-items:flex-start;gap:13px;">
          <div style="width:44px;height:44px;border-radius:12px;background:linear-gradient(135deg,#0f172a,#1e293b);color:#02d1ba;display:flex;flex-direction:column;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 4px 10px rgba(15,23,42,.15);">
            <div style="font-size:7px;font-weight:800;letter-spacing:1.4px;opacity:.6;">SÉANCE</div>
            <div style="font-size:15px;font-weight:900;letter-spacing:-0.5px;font-family:ui-monospace,'SF Mono',Menlo,monospace;">${sessionNumber}</div>
          </div>
          <div style="flex:1;min-width:0;">
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:4px;">
              ${typeBadge}${bonus}
            </div>
            <div style="font-family:'DM Sans',inherit;font-size:17px;font-weight:900;color:#0f172a;letter-spacing:-0.7px;line-height:1.15;">${esc(s.name)}</div>
            ${desc}
            <div style="margin-top:7px;font-size:10px;color:#94a3b8;letter-spacing:0.5px;font-weight:500;">
              ${(s.exercises || []).length} exercice${(s.exercises || []).length > 1 ? 's' : ''}
              ${(s.runs || []).length > 0 ? ` · ${(s.runs || []).length} cardio` : ''}
              ${(s.amraps || []).length > 0 ? ` · ${(s.amraps || []).length} AMRAP` : ''}
              ${(s.ergos || []).length > 0 ? ` · ${(s.ergos || []).length} ergo` : ''}
              ${s.finisher ? ' · finisher' : ''}
            </div>
          </div>
        </div>
      </header>
      ${warmupBlock}${exos}${runs}${amraps}${ergos}${fields}${fin}
    </article>`;
  };

  // ===== Page de garde semaine (full-bleed dark) =====
  const renderWeekIntro = (w, wIdx) => {
    const wNum = String(wIdx + 1).padStart(2, '0');
    return `<section class="week-intro" style="min-height:297mm;max-height:297mm;padding:60mm 22mm 28mm;background:linear-gradient(180deg,#0a0a0a 0%,#0f172a 100%);color:#fff;position:relative;overflow:hidden;break-before:page;page-break-before:always;break-after:page;page-break-after:always;box-sizing:border-box;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;">
      <div style="position:absolute;top:-100px;right:-100px;width:380px;height:380px;background:radial-gradient(circle,rgba(2,209,186,.18) 0%,transparent 65%);"></div>
      <div style="position:absolute;bottom:-120px;left:-100px;width:340px;height:340px;background:radial-gradient(circle,rgba(8,145,178,.12) 0%,transparent 65%);"></div>
      <div style="position:relative;">
        <div style="font-size:11.5px;letter-spacing:6px;font-weight:800;color:rgba(255,255,255,.4);text-transform:uppercase;margin-bottom:10px;">Programme officiel · RB Performance</div>
        <div style="width:48px;height:3px;background:#02d1ba;margin:24px auto;border-radius:2px;"></div>
        <h1 style="font-family:'DM Sans',inherit;font-size:84px;font-weight:900;letter-spacing:-4px;line-height:.9;color:#fff;margin:0;">SEMAINE <span style="color:#02d1ba;">${wNum}</span></h1>
        <div style="width:48px;height:3px;background:#02d1ba;margin:24px auto;border-radius:2px;"></div>
        <div style="font-size:11px;letter-spacing:3px;font-weight:700;color:rgba(255,255,255,.6);text-transform:uppercase;margin-top:18px;">
          ${w.sessions.length} séance${w.sessions.length > 1 ? 's' : ''} · Entraînement structuré
        </div>
      </div>
    </section>`;
  };

  // ===== Render d'une semaine entière (intro + sessions) =====
  const renderWeek = (w, wIdx) => {
    const sessions = w.sessions.map((s, si) => renderSession(s, si, wIdx, w.sessions.length)).join('');
    return `${renderWeekIntro(w, wIdx)}<section class="week-section" style="padding-top:0;">${sessions}</section>`;
  };

  // ===== Cover page (page 1) =====
  const cover = parsed ? `
    <section class="cover" style="min-height:297mm;max-height:297mm;padding:30mm 22mm;display:flex;flex-direction:column;justify-content:space-between;background:#0a0a0a;color:#fff;position:relative;overflow:hidden;break-after:page;page-break-after:always;box-sizing:border-box;">
      <div style="position:absolute;top:-120px;right:-120px;width:420px;height:420px;background:radial-gradient(circle,rgba(2,209,186,.22) 0%,transparent 65%);"></div>
      <div style="position:absolute;bottom:-130px;left:-110px;width:360px;height:360px;background:radial-gradient(circle,rgba(8,145,178,.18) 0%,transparent 65%);"></div>

      <div style="position:relative;display:flex;align-items:center;justify-content:space-between;">
        <div>
          <div style="font-size:10px;letter-spacing:6px;font-weight:800;color:#02d1ba;text-transform:uppercase;margin-bottom:10px;">Programme officiel</div>
          <div style="font-family:'DM Sans',inherit;font-size:30px;font-weight:900;letter-spacing:-1.5px;line-height:.95;">
            RB <span style="color:#02d1ba;">PERFORM</span>
          </div>
        </div>
        <div style="text-align:right;font-size:9px;letter-spacing:2.5px;font-weight:700;color:rgba(255,255,255,.45);text-transform:uppercase;">
          Édition ${esc(dateLong)}
        </div>
      </div>

      <div style="position:relative;">
        <div style="font-size:10.5px;letter-spacing:4px;font-weight:700;color:rgba(255,255,255,.4);text-transform:uppercase;margin-bottom:14px;">Programme d'entraînement personnalisé</div>
        <h1 style="font-family:'DM Sans',inherit;font-size:54px;font-weight:900;letter-spacing:-3px;line-height:1;color:#fff;margin:0 0 18px 0;">${esc(parsed.name)}<span style="color:#02d1ba;">.</span></h1>
        ${parsed.tagline ? `<div style="font-size:15px;color:rgba(255,255,255,.72);line-height:1.55;max-width:80%;margin-bottom:14px;">${esc(parsed.tagline)}</div>` : ''}
        ${parsed.objective ? `<div style="font-size:13px;color:rgba(255,255,255,.58);line-height:1.6;max-width:80%;padding-left:14px;border-left:2px solid #02d1ba;"><strong style="color:#02d1ba;letter-spacing:0.5px;">Objectif —</strong> ${esc(parsed.objective)}</div>` : ''}
      </div>

      <div style="position:relative;">
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:28px;">
          ${[
            { v: parsed.totalWeeks, l: parsed.totalWeeks > 1 ? 'Semaines' : 'Semaine' },
            { v: parsed.totalSessions, l: parsed.totalSessions > 1 ? 'Séances' : 'Séance' },
            { v: stats?.distinctExos || 0, l: (stats?.distinctExos || 0) > 1 ? 'Exos uniques' : 'Exo unique' },
            { v: stats?.withVideo || 0, l: 'Avec démo' },
          ].map((st) => `
            <div style="padding:14px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:13px;">
              <div style="font-family:ui-monospace,'SF Mono',Menlo,monospace;font-size:30px;font-weight:900;color:#02d1ba;letter-spacing:-1.5px;line-height:1;">${st.v}</div>
              <div style="font-size:8px;letter-spacing:1.5px;text-transform:uppercase;color:rgba(255,255,255,.5);font-weight:700;margin-top:6px;">${st.l}</div>
            </div>
          `).join('')}
        </div>

        <div style="display:flex;align-items:flex-end;justify-content:space-between;padding-top:22px;border-top:1px solid rgba(255,255,255,.08);">
          <div>
            <div style="font-size:9px;letter-spacing:2.5px;color:#02d1ba;text-transform:uppercase;font-weight:800;margin-bottom:5px;">Pour</div>
            <div style="font-family:'DM Sans',inherit;font-size:26px;font-weight:900;color:#fff;letter-spacing:-0.9px;">${esc(name)}</div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:9px;letter-spacing:2.5px;color:rgba(255,255,255,.45);text-transform:uppercase;font-weight:700;margin-bottom:5px;">Coach</div>
            <div style="font-family:'DM Sans',inherit;font-size:14px;color:rgba(255,255,255,.85);font-weight:700;letter-spacing:-0.2px;">Rayan Bonte</div>
            <div style="font-size:9.5px;color:rgba(255,255,255,.4);margin-top:2px;">${esc(RB_SUPPORT_EMAIL)}</div>
          </div>
        </div>
      </div>
    </section>` : '';

  // ===== Sommaire (page 2) =====
  const toc = parsed ? `
    <section class="toc" style="padding:18mm 14mm;break-after:page;page-break-after:always;min-height:297mm;box-sizing:border-box;">
      <div style="padding-bottom:14px;margin-bottom:18px;border-bottom:2px solid #02d1ba;">
        <div style="font-size:10px;letter-spacing:4px;font-weight:800;color:#02d1ba;text-transform:uppercase;margin-bottom:4px;">Plan d'entraînement</div>
        <h2 style="font-family:'DM Sans',inherit;font-size:36px;font-weight:900;letter-spacing:-1.5px;color:#0f172a;margin:0;line-height:1;">Sommaire</h2>
      </div>
      <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:14px;">
        ${parsed.weeks.map((w, wi) => {
          const items = w.sessions.map((s, si) => {
            const type = detectSessionType(s.name);
            const badge = type
              ? `<span style="font-size:8px;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:${type.color};background:${type.bg};padding:2px 6px;border-radius:4px;border:1px solid ${type.bdr};margin-left:6px;">${type.label}</span>`
              : '';
            const bonus = s.bonus
              ? '<span style="font-size:8px;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:#7c3aed;background:#f3e8ff;padding:2px 6px;border-radius:4px;margin-left:4px;">EXTRA</span>'
              : '';
            return `<li style="display:flex;align-items:center;gap:6px;padding:5px 0;border-bottom:1px dashed #e2e8f0;font-size:11.5px;color:#334155;">
              <span style="font-family:ui-monospace,'SF Mono',Menlo,monospace;font-size:10px;color:#94a3b8;font-weight:700;">S${String(si + 1).padStart(2, '0')}</span>
              <span style="flex:1;min-width:0;font-weight:600;color:#0f172a;letter-spacing:-0.1px;">${esc(s.name)}</span>${badge}${bonus}
            </li>`;
          }).join('');
          return `<div style="padding:16px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;break-inside:avoid;">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
              <div>
                <div style="font-size:8.5px;letter-spacing:2px;font-weight:800;color:#02d1ba;text-transform:uppercase;margin-bottom:2px;">Bloc ${wi + 1}</div>
                <div style="font-family:'DM Sans',inherit;font-size:18px;font-weight:900;color:#0f172a;letter-spacing:-0.6px;">${esc(w.name)}</div>
              </div>
              <div style="font-family:ui-monospace,'SF Mono',Menlo,monospace;font-size:20px;font-weight:900;color:#02d1ba;letter-spacing:-0.8px;">${w.sessions.length}<span style="font-size:9px;color:#94a3b8;font-weight:700;letter-spacing:0.5px;margin-left:3px;">SÉANCES</span></div>
            </div>
            <ul style="list-style:none;margin:0;padding:0;">${items}</ul>
          </div>`;
        }).join('')}
      </div>
      <div style="margin-top:32px;padding:14px 16px;background:linear-gradient(135deg,#f8fafc,#fff);border:1px solid #e2e8f0;border-radius:12px;">
        <div style="font-size:9px;letter-spacing:2px;font-weight:800;color:#94a3b8;text-transform:uppercase;margin-bottom:8px;">Comment lire ce programme</div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;font-size:10.5px;color:#475569;line-height:1.5;">
          <div><strong style="color:#0f172a;">Chips de prescription</strong> — Séries × Reps · Charge · Tempo · RIR · Repos.</div>
          <div><strong style="color:#0f172a;">Lettres A1/A2, B1/B2…</strong> — Mouvements groupés en superset (à enchaîner sans repos).</div>
          <div><strong style="color:#0f172a;">Badge EXTRA</strong> — Séance optionnelle, ne bloque pas la progression hebdo.</div>
        </div>
      </div>
    </section>` : '';

  // ===== Back cover =====
  const backCover = parsed ? `
    <section class="back-cover" style="min-height:297mm;max-height:297mm;padding:60mm 22mm;background:#0a0a0a;color:#fff;position:relative;overflow:hidden;break-before:page;page-break-before:always;box-sizing:border-box;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;">
      <div style="position:absolute;top:-100px;left:-100px;width:380px;height:380px;background:radial-gradient(circle,rgba(2,209,186,.16) 0%,transparent 65%);"></div>
      <div style="position:absolute;bottom:-120px;right:-100px;width:340px;height:340px;background:radial-gradient(circle,rgba(8,145,178,.12) 0%,transparent 65%);"></div>
      <div style="position:relative;max-width:420px;">
        <div style="font-size:11px;letter-spacing:5px;font-weight:800;color:#02d1ba;text-transform:uppercase;margin-bottom:24px;">La discipline est la clé du succès</div>
        <div style="font-family:'DM Sans',inherit;font-size:36px;font-weight:900;letter-spacing:-1.5px;line-height:1.05;color:#fff;margin-bottom:30px;">Donne tout sur chaque séance.<span style="color:#02d1ba;">.</span></div>
        <div style="font-size:13px;color:rgba(255,255,255,.65);line-height:1.65;margin-bottom:48px;">
          Une question, un blocage, un PR à fêter ? Écris-moi directement dans l'app — on adapte si besoin. Reste régulier, sois patient, fais confiance au process.
        </div>
        <div style="padding-top:24px;border-top:1px solid rgba(255,255,255,.1);">
          <div style="font-family:'DM Sans',inherit;font-size:20px;font-weight:900;color:#fff;letter-spacing:-0.5px;">Rayan Bonte</div>
          <div style="font-size:10px;letter-spacing:2.5px;color:#02d1ba;text-transform:uppercase;font-weight:700;margin-top:5px;">Coach · RB Perform</div>
          <div style="font-size:11px;color:rgba(255,255,255,.45);margin-top:10px;">${esc(RB_SUPPORT_EMAIL)}</div>
        </div>
      </div>
      <div style="position:absolute;bottom:14mm;left:0;right:0;text-align:center;font-size:9px;color:rgba(255,255,255,.25);letter-spacing:1px;">
        © ${new Date().getFullYear()} RB Perform · SIRET 99063780300018 · Tous droits réservés
      </div>
    </section>` : '';

  const body = parsed && parsed.weeks.length > 0
    ? cover + toc + parsed.weeks.map(renderWeek).join('') + backCover
    : `<div style="padding:60px 40px;text-align:center;color:#94a3b8;">${esc(noProgram)}</div>`;

  // ===== Wrapping HTML — fonts embed, page rules, running header =====
  const page = `<!DOCTYPE html>
<html lang="${lang}">
<head>
<meta charset="utf-8"/>
<title>${esc(titleTxt)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com" crossorigin>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800;900&family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
  @page { size: A4; margin: 0; }
  @page :first { margin: 0; }
  * { margin:0; padding:0; box-sizing:border-box; }
  html, body { background: #fff; }
  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
    color: #0f172a;
    -webkit-font-smoothing: antialiased;
    font-feature-settings: 'kern' 1, 'liga' 1;
    orphans: 3; widows: 3;
  }
  h1, h2, h3, h4 { font-family: 'DM Sans', 'Inter', inherit; break-after: avoid; page-break-after: avoid; }
  img { -webkit-print-color-adjust: exact; print-color-adjust: exact; max-width: 100%; }

  .cover, .toc, .week-intro, .back-cover { /* full-bleed pages */ }

  /* Contenu courant des semaines : padding interne (cover & intros = full-bleed) */
  .week-section { padding: 14mm 12mm 16mm; }
  .week-section:first-of-type { padding-top: 8mm; }

  .week-header  { break-after: avoid; page-break-after: avoid; }
  .session-card { break-inside: auto; page-break-inside: auto; }
  .session-header { break-after: avoid; page-break-after: avoid; }
  .exo-row, .amrap-block, .ergo-block, .run-block, .field-block, .finisher-block {
    break-inside: avoid; page-break-inside: avoid;
  }

  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style>
</head>
<body>${body}</body>
</html>`;

  return page;
}

/**
 * exportProgramPDF — ouvre une fenêtre imprimable et lance window.print().
 * `preOpenedWindow` doit être ouvert synchrone par le caller pour éviter
 * les pop-ups bloquées. On attend `load` (images YouTube + Google Fonts)
 * avant de print pour que tout apparaisse dans le PDF.
 */
export function exportProgramPDF(client, programme, preOpenedWindow = null) {
  const html = renderProgramPrintableHTML(client, programme);
  const win = preOpenedWindow || window.open('', '_blank');
  if (!win) return false;
  try {
    win.document.open();
    win.document.write(html);
    win.document.close();
    const triggerPrint = () => setTimeout(() => { try { win.print(); } catch (_) {} }, 1100);
    if (win.document.readyState === 'complete') triggerPrint();
    else win.addEventListener('load', triggerPrint);
  } catch (e) {
    console.error('[exportProgramPDF] write failed', e);
    return false;
  }
  if (navigator.vibrate) navigator.vibrate([20, 10, 40]);
  return true;
}

export default function ProgramPDFButton({ client, programme }) {
  const t = useT();
  if (!programme?.html_content) return null;
  return (
    <button
      onClick={() => {
        const win = window.open('', '_blank');
        exportProgramPDF(client, programme, win);
      }}
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

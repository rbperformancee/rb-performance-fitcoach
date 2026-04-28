#!/usr/bin/env node
/**
 * Email Deliverability Auditor
 *
 * Vérifie l'état des records DNS deliverability d'un domaine :
 *   - SPF
 *   - DMARC
 *   - DKIM (selectors Resend)
 *   - MTA-STS
 *   - TLS-RPT
 *   - BIMI
 *
 * Usage :
 *   node scripts/check-email-deliverability.js [domain]
 *   node scripts/check-email-deliverability.js rbperform.com
 *
 * Default domain : rbperform.com
 *
 * Aucune dépendance npm. Utilise dns/promises (Node 18+).
 */

const dns = require('dns/promises');

const DOMAIN = process.argv[2] || 'rbperform.com';

const C = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  gray: '\x1b[90m',
  bold: '\x1b[1m',
  cyan: '\x1b[36m',
};

function ok(msg) { console.log(`  ${C.green}✓${C.reset} ${msg}`); }
function warn(msg) { console.log(`  ${C.yellow}⚠${C.reset} ${msg}`); }
function fail(msg) { console.log(`  ${C.red}✗${C.reset} ${msg}`); }
function info(msg) { console.log(`  ${C.gray}·${C.reset} ${msg}`); }
function section(title) { console.log(`\n${C.bold}${C.cyan}${title}${C.reset}`); }

let warnings = 0;
let failures = 0;

async function resolveTxt(host) {
  try {
    const records = await dns.resolveTxt(host);
    return records.map((r) => r.join(''));
  } catch (e) {
    if (e.code === 'ENOTFOUND' || e.code === 'ENODATA') return [];
    throw e;
  }
}

async function resolveCname(host) {
  try {
    return await dns.resolveCname(host);
  } catch (e) {
    if (e.code === 'ENOTFOUND' || e.code === 'ENODATA') return [];
    throw e;
  }
}

// ===== SPF =====
async function checkSPF() {
  section('1. SPF (Sender Policy Framework)');
  const records = await resolveTxt(DOMAIN);
  const spf = records.find((r) => r.startsWith('v=spf1'));
  if (!spf) {
    fail(`Aucun record SPF trouvé sur ${DOMAIN}`);
    info(`Ajoute : TXT @ "v=spf1 include:_spf.resend.com -all"`);
    failures++;
    return;
  }
  ok(`SPF présent : ${spf}`);

  if (!spf.includes('include:_spf.resend.com') && !spf.includes('include:amazonses.com')) {
    warn('Resend / SES non inclus dans le SPF — emails Resend pourraient échouer SPF');
    info('Ajoute include:_spf.resend.com');
    warnings++;
  }
  if (spf.endsWith('-all')) {
    ok('Mode strict (-all) — recommandé en production');
  } else if (spf.endsWith('~all')) {
    warn('Mode soft fail (~all) — moins strict, OK en transition');
    warnings++;
  } else if (spf.endsWith('?all')) {
    warn('Mode neutral (?all) — quasi inutile pour la deliverability');
    warnings++;
  } else if (spf.endsWith('+all')) {
    fail('Mode pass (+all) — autorise N\'IMPORTE QUI à envoyer pour ton domaine. CRITIQUE.');
    failures++;
  }

  // Check pour multiples records SPF (interdit par RFC)
  const spfRecords = records.filter((r) => r.startsWith('v=spf1'));
  if (spfRecords.length > 1) {
    fail(`${spfRecords.length} records SPF trouvés — RFC interdit, conserve UN seul`);
    failures++;
  }
}

// ===== DMARC =====
async function checkDMARC() {
  section('2. DMARC (Domain Message Authentication)');
  const records = await resolveTxt(`_dmarc.${DOMAIN}`);
  const dmarc = records.find((r) => r.startsWith('v=DMARC1'));
  if (!dmarc) {
    fail(`Aucun record DMARC trouvé sur _dmarc.${DOMAIN}`);
    info(`Ajoute : TXT _dmarc "v=DMARC1; p=none; rua=mailto:rb.performancee@gmail.com; fo=1"`);
    failures++;
    return;
  }
  ok(`DMARC présent`);
  info(dmarc);

  // Parse policy
  const tags = {};
  dmarc.split(';').forEach((seg) => {
    const [k, v] = seg.split('=').map((s) => s && s.trim());
    if (k && v) tags[k] = v;
  });

  const policy = tags['p'];
  if (policy === 'none') {
    warn('Policy = none (monitor only) — passe à quarantine puis reject quand stable');
    warnings++;
  } else if (policy === 'quarantine') {
    ok('Policy = quarantine — bon');
    const pct = parseInt(tags['pct'] || '100', 10);
    if (pct < 100) info(`Appliqué à ${pct}% — peux durcir progressivement`);
  } else if (policy === 'reject') {
    ok('Policy = reject — niveau leader');
  }

  if (!tags['rua']) {
    warn('Aucun rua= défini — tu ne reçois pas de rapports DMARC');
    warnings++;
  } else {
    ok(`Rapports envoyés à : ${tags['rua']}`);
  }

  if (tags['sp']) info(`Sub-policy explicite : sp=${tags['sp']}`);
  if (tags['adkim']) info(`Alignement DKIM : ${tags['adkim']} (s=strict, r=relaxed)`);
  if (tags['aspf']) info(`Alignement SPF : ${tags['aspf']} (s=strict, r=relaxed)`);
}

// ===== DKIM =====
async function checkDKIM() {
  section('3. DKIM (DomainKeys Identified Mail)');

  const selectors = ['resend', 'selector1', 'selector2', 'rb1', 'rb2', 'default'];
  let found = false;
  for (const sel of selectors) {
    const host = `${sel}._domainkey.${DOMAIN}`;
    const cnames = await resolveCname(host);
    const txts = await resolveTxt(host);
    if (cnames.length > 0) {
      ok(`DKIM ${sel} (CNAME) → ${cnames[0]}`);
      found = true;
    } else if (txts.length > 0 && txts.some((t) => t.includes('v=DKIM1'))) {
      ok(`DKIM ${sel} (TXT) configuré`);
      found = true;
    }
  }
  if (!found) {
    fail(`Aucun DKIM trouvé (selectors testés : ${selectors.join(', ')})`);
    info('Va sur Resend → Domains → Add Domain pour générer les records');
    failures++;
  }
}

// ===== MTA-STS =====
async function checkMTASTS() {
  section('4. MTA-STS (TLS strict pour les emails entrants)');
  const records = await resolveTxt(`_mta-sts.${DOMAIN}`);
  const mta = records.find((r) => r.startsWith('v=STSv1'));
  if (!mta) {
    warn(`Pas de MTA-STS — bonus deliverability manqué (non-bloquant)`);
    info(`Ajoute : TXT _mta-sts "v=STSv1; id=$(date +%Y%m%d%H%M%S)"`);
    info(`Plus créer https://mta-sts.${DOMAIN}/.well-known/mta-sts.txt`);
    warnings++;
    return;
  }
  ok(`MTA-STS présent : ${mta}`);
}

// ===== TLS-RPT =====
async function checkTLSRPT() {
  section('5. TLS-RPT (TLS Reporting)');
  const records = await resolveTxt(`_smtp._tls.${DOMAIN}`);
  const rpt = records.find((r) => r.startsWith('v=TLSRPTv1'));
  if (!rpt) {
    warn(`Pas de TLS-RPT — bonus, non-bloquant`);
    info(`Ajoute : TXT _smtp._tls "v=TLSRPTv1; rua=mailto:tls-reports@${DOMAIN}"`);
    warnings++;
    return;
  }
  ok(`TLS-RPT présent : ${rpt}`);
}

// ===== BIMI =====
async function checkBIMI() {
  section('6. BIMI (logo dans Gmail mobile)');
  const records = await resolveTxt(`default._bimi.${DOMAIN}`);
  const bimi = records.find((r) => r.startsWith('v=BIMI1'));
  if (!bimi) {
    info(`Pas de BIMI configuré (advanced — nécessite DMARC quarantine/reject d'abord)`);
    return;
  }
  ok(`BIMI présent : ${bimi}`);
  if (!bimi.includes('a=')) {
    warn('Pas de VMC (a=) — Gmail n\'affichera pas le logo sans VMC depuis 2024');
    warnings++;
  }
}

// ===== MX (basic check) =====
async function checkMX() {
  section('7. MX (Mail Exchanger)');
  try {
    const mx = await dns.resolveMx(DOMAIN);
    if (!mx.length) {
      warn(`Aucun MX — domaine ne peut pas recevoir d'emails`);
      warnings++;
      return;
    }
    mx.forEach((m) => ok(`MX ${m.priority} → ${m.exchange}`));
  } catch (e) {
    warn(`Pas de MX : ${e.code}`);
    warnings++;
  }
}

// ===== Main =====
(async () => {
  console.log(`\n${C.bold}Email Deliverability Audit${C.reset} — ${C.cyan}${DOMAIN}${C.reset}`);
  console.log(`${C.gray}${new Date().toISOString()}${C.reset}`);

  await checkSPF();
  await checkDMARC();
  await checkDKIM();
  await checkMTASTS();
  await checkTLSRPT();
  await checkBIMI();
  await checkMX();

  console.log(`\n${'='.repeat(50)}`);
  if (failures === 0 && warnings === 0) {
    console.log(`${C.green}${C.bold}✓ AUDIT PASSED — leader-grade${C.reset}\n`);
    process.exit(0);
  }
  if (failures === 0) {
    console.log(`${C.yellow}${C.bold}⚠ AUDIT PASSED WITH ${warnings} WARNINGS${C.reset}`);
    console.log(`${C.gray}Voir EMAIL-DELIVERABILITY.md pour les actions${C.reset}\n`);
    process.exit(0);
  }
  console.log(`${C.red}${C.bold}✗ AUDIT FAILED — ${failures} failures, ${warnings} warnings${C.reset}`);
  console.log(`${C.gray}Action immédiate requise — voir EMAIL-DELIVERABILITY.md${C.reset}\n`);
  process.exit(1);
})().catch((e) => {
  console.error(`\n${C.red}Fatal error :${C.reset}`, e);
  process.exit(2);
});

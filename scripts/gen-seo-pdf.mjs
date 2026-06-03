// Génère un PDF propre à partir de SEO-RECAP.md via Playwright.
// Charge marked depuis CDN cdnjs (autorisé par CSP existante du projet).

import { chromium } from 'playwright';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const MD_PATH = '/Users/rayan/fitcoach_updated/SEO-RECAP.md';
const OUT_PATH = '/Users/rayan/fitcoach_updated/SEO-RECAP.pdf';

const md = await readFile(MD_PATH, 'utf-8');

// HTML template stylé pour impression PDF
const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>SEO Recap RB Perform</title>
<script src="https://cdnjs.cloudflare.com/ajax/libs/marked/9.1.6/marked.min.js"></script>
<style>
  @page { size: A4; margin: 18mm 16mm; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif;
    color: #1a1a1a;
    line-height: 1.55;
    font-size: 11pt;
    max-width: 100%;
  }
  h1 { font-size: 26pt; font-weight: 800; letter-spacing: -0.02em; margin: 0 0 14pt; color: #02554d; border-bottom: 3px solid #02d1ba; padding-bottom: 8pt; page-break-after: avoid; }
  h2 { font-size: 17pt; font-weight: 800; margin: 22pt 0 10pt; color: #0a3a36; letter-spacing: -0.01em; page-break-after: avoid; }
  h3 { font-size: 13pt; font-weight: 700; margin: 16pt 0 8pt; color: #1a1a1a; page-break-after: avoid; }
  p { margin: 0 0 10pt; }
  strong { color: #000; font-weight: 700; }
  em { color: #555; }
  ul, ol { margin: 0 0 12pt; padding-left: 22pt; }
  li { margin-bottom: 4pt; }
  a { color: #02554d; text-decoration: none; border-bottom: 1px solid rgba(2,209,186,0.4); }
  hr { border: none; border-top: 1px solid #e5e5e5; margin: 24pt 0; }
  blockquote {
    border-left: 3px solid #02d1ba;
    background: rgba(2,209,186,0.06);
    padding: 10pt 14pt;
    margin: 12pt 0;
    border-radius: 0 6pt 6pt 0;
    font-size: 10.5pt;
  }
  blockquote p { margin: 0; }
  code {
    font-family: 'SF Mono', Menlo, Monaco, Consolas, monospace;
    font-size: 9.5pt;
    background: #f4f4f4;
    padding: 1pt 4pt;
    border-radius: 3pt;
    color: #c7254e;
  }
  pre {
    background: #f6f8fa;
    border: 1px solid #e5e5e5;
    border-radius: 6pt;
    padding: 10pt 12pt;
    overflow-x: auto;
    font-family: 'SF Mono', Menlo, Monaco, Consolas, monospace;
    font-size: 9pt;
    line-height: 1.45;
    margin: 10pt 0 14pt;
    page-break-inside: avoid;
  }
  pre code { background: none; padding: 0; color: #24292e; }
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 12pt 0 16pt;
    font-size: 10pt;
    page-break-inside: avoid;
  }
  th, td {
    padding: 7pt 9pt;
    text-align: left;
    border-bottom: 1px solid #e5e5e5;
    vertical-align: top;
  }
  th {
    background: #f4f4f4;
    font-weight: 700;
    font-size: 9pt;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #555;
    border-bottom: 2px solid #c5c5c5;
  }
  tr:last-child td { border-bottom: none; }
  .footer-doc {
    margin-top: 40pt;
    padding-top: 14pt;
    border-top: 1px solid #e5e5e5;
    font-size: 9pt;
    color: #888;
    text-align: center;
    font-style: italic;
  }
  /* Marker styling */
  h1::before, h2::before, h3::before { content: none !important; }
  /* Avoid breaking inside tables and blockquotes */
  table, blockquote, pre { page-break-inside: avoid; }
  h1, h2, h3 { page-break-after: avoid; }
</style>
</head>
<body>
<div id="root">Chargement…</div>
<script>
  const raw = ${JSON.stringify(md)};
  marked.setOptions({ gfm: true, breaks: false });
  document.getElementById('root').innerHTML = marked.parse(raw);
  document.title = 'SEO Recap RB Perform';
  window.__ready__ = true;
</script>
</body>
</html>`;

const tmpHtml = '/tmp/seo-recap-render.html';
await writeFile(tmpHtml, html, 'utf-8');

const browser = await chromium.launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();
await page.goto('file://' + tmpHtml, { waitUntil: 'networkidle' });
await page.waitForFunction(() => window.__ready__ === true, { timeout: 10000 });
// Petit délai pour s'assurer que marked a rendu
await page.waitForTimeout(400);

await page.pdf({
  path: OUT_PATH,
  format: 'A4',
  printBackground: true,
  margin: { top: '18mm', bottom: '18mm', left: '16mm', right: '16mm' },
  displayHeaderFooter: true,
  headerTemplate: '<div></div>',
  footerTemplate: `<div style="font-size:8pt;color:#888;width:100%;text-align:center;font-family:sans-serif;padding:0 10mm">SEO Recap RB Perform — 21 mai 2026 — page <span class="pageNumber"></span>/<span class="totalPages"></span></div>`,
});

await browser.close();
console.log('OK', OUT_PATH);

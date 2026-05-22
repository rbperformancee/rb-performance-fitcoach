// Convertit un fichier Markdown en PDF stylé (réutilisable pour SEO-RECAP, AI-SEO-PLAYBOOK, etc.)
// Usage : node scripts/gen-pdf.mjs <input.md> <output.pdf> [title]

import { chromium } from 'playwright';
import { readFile, writeFile } from 'node:fs/promises';
import { basename } from 'node:path';

const args = process.argv.slice(2);
if (args.length < 2) {
  console.error('Usage: node scripts/gen-pdf.mjs <input.md> <output.pdf> [title]');
  process.exit(1);
}
const [MD_PATH, OUT_PATH, customTitle] = args;
const docTitle = customTitle || basename(MD_PATH, '.md');

const md = await readFile(MD_PATH, 'utf-8');

const html = `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"><title>${docTitle}</title>
<script src="https://cdnjs.cloudflare.com/ajax/libs/marked/9.1.6/marked.min.js"></script>
<style>
  @page { size: A4; margin: 18mm 16mm; }
  *{box-sizing:border-box}
  html,body{margin:0;padding:0}
  body{font-family:-apple-system,BlinkMacSystemFont,'Inter','Segoe UI',sans-serif;color:#1a1a1a;line-height:1.55;font-size:11pt}
  h1{font-size:26pt;font-weight:800;letter-spacing:-.02em;margin:0 0 14pt;color:#02554d;border-bottom:3px solid #02d1ba;padding-bottom:8pt;page-break-after:avoid}
  h2{font-size:17pt;font-weight:800;margin:22pt 0 10pt;color:#0a3a36;letter-spacing:-.01em;page-break-after:avoid}
  h3{font-size:13pt;font-weight:700;margin:16pt 0 8pt;color:#1a1a1a;page-break-after:avoid}
  p{margin:0 0 10pt}
  strong{color:#000;font-weight:700}
  em{color:#555}
  ul,ol{margin:0 0 12pt;padding-left:22pt}
  li{margin-bottom:4pt}
  a{color:#02554d;text-decoration:none;border-bottom:1px solid rgba(2,209,186,.4)}
  hr{border:none;border-top:1px solid #e5e5e5;margin:24pt 0}
  blockquote{border-left:3px solid #02d1ba;background:rgba(2,209,186,.06);padding:10pt 14pt;margin:12pt 0;border-radius:0 6pt 6pt 0;font-size:10.5pt}
  blockquote p{margin:0}
  code{font-family:'SF Mono',Menlo,Monaco,Consolas,monospace;font-size:9.5pt;background:#f4f4f4;padding:1pt 4pt;border-radius:3pt;color:#c7254e}
  pre{background:#f6f8fa;border:1px solid #e5e5e5;border-radius:6pt;padding:10pt 12pt;overflow-x:auto;font-family:'SF Mono',Menlo,Monaco,Consolas,monospace;font-size:9pt;line-height:1.45;margin:10pt 0 14pt;page-break-inside:avoid}
  pre code{background:none;padding:0;color:#24292e}
  table{width:100%;border-collapse:collapse;margin:12pt 0 16pt;font-size:10pt;page-break-inside:avoid}
  th,td{padding:7pt 9pt;text-align:left;border-bottom:1px solid #e5e5e5;vertical-align:top}
  th{background:#f4f4f4;font-weight:700;font-size:9pt;text-transform:uppercase;letter-spacing:.05em;color:#555;border-bottom:2px solid #c5c5c5}
  tr:last-child td{border-bottom:none}
  table,blockquote,pre{page-break-inside:avoid}
</style></head>
<body>
<div id="root">Chargement…</div>
<script>
  const raw = ${JSON.stringify(md)};
  marked.setOptions({gfm:true,breaks:false});
  document.getElementById('root').innerHTML = marked.parse(raw);
  window.__ready__ = true;
</script>
</body></html>`;

const tmpHtml = '/tmp/pdf-render-' + Date.now() + '.html';
await writeFile(tmpHtml, html, 'utf-8');

const browser = await chromium.launch();
const page = await (await browser.newContext()).newPage();
await page.goto('file://' + tmpHtml, { waitUntil: 'networkidle' });
await page.waitForFunction(() => window.__ready__ === true, { timeout: 10000 });
await page.waitForTimeout(400);

await page.pdf({
  path: OUT_PATH,
  format: 'A4',
  printBackground: true,
  margin: { top: '18mm', bottom: '18mm', left: '16mm', right: '16mm' },
  displayHeaderFooter: true,
  headerTemplate: '<div></div>',
  footerTemplate: `<div style="font-size:8pt;color:#888;width:100%;text-align:center;font-family:sans-serif;padding:0 10mm">${docTitle} — RB Perform — page <span class="pageNumber"></span>/<span class="totalPages"></span></div>`,
});

await browser.close();
console.log('OK', OUT_PATH);

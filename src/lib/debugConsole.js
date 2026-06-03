// Debug overlay : capture les console.log/warn/error qui matchent un prefix
// (ex: "[recipe-add]") et les rend visibles dans un panneau flottant in-app.
// Utile sur PWA iOS ou la console Safari distante n'est pas toujours dispo.

const PREFIX_FILTER = /\[recipe-add\]/;
const MAX_ENTRIES = 80;

const buffer = [];
const listeners = new Set();

function notify() { listeners.forEach((fn) => { try { fn([...buffer]); } catch {} }); }

function record(level, args) {
  const flat = args.map((a) => {
    if (a == null) return String(a);
    if (typeof a === 'string') return a;
    try { return JSON.stringify(a); } catch { return String(a); }
  }).join(' ');
  if (!PREFIX_FILTER.test(flat)) return;
  buffer.push({
    t: new Date().toLocaleTimeString('fr-FR', { hour12: false }) + '.' + String(Date.now() % 1000).padStart(3, '0'),
    level,
    msg: flat,
  });
  while (buffer.length > MAX_ENTRIES) buffer.shift();
  notify();
}

let installed = false;
export function installDebugCapture() {
  if (installed || typeof window === 'undefined') return;
  installed = true;
  const origLog = console.log;
  const origWarn = console.warn;
  const origErr = console.error;
  console.log = (...a) => { record('log', a); origLog.apply(console, a); };
  console.warn = (...a) => { record('warn', a); origWarn.apply(console, a); };
  console.error = (...a) => { record('error', a); origErr.apply(console, a); };
}

export function subscribeDebug(fn) {
  listeners.add(fn);
  fn([...buffer]);
  return () => listeners.delete(fn);
}

export function clearDebug() {
  buffer.length = 0;
  notify();
}

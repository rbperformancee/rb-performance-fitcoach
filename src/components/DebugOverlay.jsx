import React, { useEffect, useState } from 'react';
import { subscribeDebug, clearDebug } from '../lib/debugConsole';

// Overlay flottant qui s'affiche automatiquement quand des logs [recipe-add]
// arrivent. Bouton "X" pour fermer, "Effacer" pour vider, "Copier" pour
// envoyer le contenu dans le presse-papier.
export default function DebugOverlay() {
  const [logs, setLogs] = useState([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const unsub = subscribeDebug((entries) => {
      setLogs(entries);
      if (entries.length > 0) setOpen(true);
    });
    return unsub;
  }, []);

  if (!open || logs.length === 0) return null;

  const copyAll = async () => {
    const text = logs.map((l) => `[${l.t}] ${l.level.toUpperCase()} ${l.msg}`).join('\n');
    try { await navigator.clipboard.writeText(text); } catch {}
  };

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 'calc(env(safe-area-inset-bottom, 0px) + 90px)',
        left: 12, right: 12,
        zIndex: 99999,
        background: 'rgba(10,10,10,0.96)',
        border: '1px solid rgba(2,209,186,0.35)',
        borderRadius: 12,
        boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
        fontFamily: '-apple-system,Inter,monospace',
        color: '#fff',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        maxHeight: '40vh',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{ fontSize: 10, fontWeight: 800, color: '#02d1ba', letterSpacing: 1.5, textTransform: 'uppercase' }}>
          Debug · {logs.length}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={copyAll} style={btn}>Copier</button>
          <button onClick={() => { clearDebug(); setOpen(false); }} style={btn}>Effacer</button>
          <button onClick={() => setOpen(false)} style={{ ...btn, padding: '4px 8px' }}>×</button>
        </div>
      </div>
      <div style={{
        flex: 1, overflowY: 'auto', padding: '6px 10px',
        fontSize: 10, lineHeight: 1.45,
      }}>
        {logs.map((l, i) => (
          <div
            key={i}
            style={{
              padding: '3px 0',
              color: l.level === 'error' ? '#ff6b6b' : l.level === 'warn' ? '#fbbf24' : 'rgba(255,255,255,0.85)',
              borderBottom: i < logs.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
              wordBreak: 'break-all',
              fontFamily: 'monospace',
            }}
          >
            <span style={{ color: 'rgba(255,255,255,0.35)' }}>{l.t}</span> {l.msg}
          </div>
        ))}
      </div>
    </div>
  );
}

const btn = {
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 6,
  color: '#fff',
  fontSize: 10,
  fontWeight: 700,
  padding: '4px 10px',
  cursor: 'pointer',
  fontFamily: 'inherit',
  letterSpacing: 0.3,
};

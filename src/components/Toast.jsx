import React, { useState, useEffect, useCallback } from 'react';

let toastFn = null;
export const toast = {
  success: (msg) => toastFn && toastFn({ msg, type: 'success' }),
  error: (msg) => toastFn && toastFn({ msg, type: 'error' }),
  info: (msg) => toastFn && toastFn({ msg, type: 'info' }),
};

export function ToastProvider() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    toastFn = ({ msg, type }) => {
      const id = Date.now();
      if (navigator.vibrate) navigator.vibrate(type === 'error' ? [50, 30, 50] : 20);
      setToasts(prev => [...prev, { id, msg, type }]);
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
    };
  }, []);

  const colors = { success: '#02d1ba', error: '#ef4444', info: '#a78bfa' };
  const icons = { success: '✓', error: '✕', info: 'ℹ' };

  return (
    <div style={{ position: 'fixed', top: 72, left: '50%', transform: 'translateX(-50%)', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8, pointerEvents: 'none', width: '90%', maxWidth: 340 }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          background: '#111', border: `1px solid ${colors[t.type]}40`,
          borderRadius: 14, padding: '12px 16px',
          display: 'flex', alignItems: 'center', gap: 10,
          boxShadow: `0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px ${colors[t.type]}20`,
          animation: 'toastIn 0.4s cubic-bezier(0.34,1.56,0.64,1)',
          backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        }}>
          <div style={{ width: 24, height: 24, borderRadius: '50%', background: `${colors[t.type]}20`, border: `1px solid ${colors[t.type]}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: colors[t.type], fontWeight: 900, flexShrink: 0 }}>{icons[t.type]}</div>
          <span style={{ fontSize: 13, color: '#f5f5f5', fontWeight: 500 }}>{t.msg}</span>
        </div>
      ))}
      <style>{'@keyframes toastIn { from { opacity:0; transform:translateY(-12px) scale(0.9); } to { opacity:1; transform:translateY(0) scale(1); } }'}</style>
    </div>
  );
}

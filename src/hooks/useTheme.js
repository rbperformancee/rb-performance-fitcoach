import { useState, useEffect } from 'react';
export function useTheme() {
  const [theme, setTheme] = useState(() => localStorage.getItem('rb_theme') || 'dark');
  useEffect(() => { localStorage.setItem('rb_theme', theme); }, [theme]);
  const toggle = () => { if (navigator.vibrate) navigator.vibrate(10); setTheme(t => t === 'dark' ? 'light' : 'dark'); };
  const isDark = theme === 'dark';
  const colors = isDark ? { bg: '#0d0d0d', surface: 'rgba(255,255,255,0.03)', border: 'rgba(255,255,255,0.07)', text: '#f5f5f5', subtext: '#6b7280', accent: '#02d1ba' } : { bg: '#f0f0f0', surface: 'rgba(0,0,0,0.04)', border: 'rgba(0,0,0,0.08)', text: '#111827', subtext: '#6b7280', accent: '#00b5a0' };
  return { theme, toggle, colors, isDark };
}

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import haptic from '../lib/haptic';

export default function AvatarPicker({ clientId, name, size = 72 }) {
  const [url, setUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef();

  useEffect(() => {
    if (!clientId) return;
    supabase.from('clients').select('avatar_url').eq('id', clientId).single()
      .then(({ data }) => { if (data?.avatar_url) setUrl(data.avatar_url); });
  }, [clientId]);

  const upload = async (file) => {
    if (!file) return;
    setLoading(true);
    const ext = file.name.split('.').pop();
    const path = 'avatars/' + clientId + '.' + ext;
    await supabase.storage.from('avatars').upload(path, file, { upsert: true });
    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
    await supabase.from('clients').update({ avatar_url: publicUrl }).eq('id', clientId);
    setUrl(publicUrl);
    setLoading(false);
    haptic.success();
  };

  const initials = (name||'?').split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2);

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }} onClick={() => inputRef.current?.click()}>
      {/* Anneau extérieur premium */}
      <svg width={size} height={size} viewBox='0 0 100 100' style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)' }}>
        <circle cx='50' cy='50' r='46' fill='none' stroke='rgba(255,255,255,0.05)' strokeWidth='1.5'/>
        <circle cx='50' cy='50' r='46' fill='none' stroke='#02d1ba' strokeWidth='1.5' strokeLinecap='round'
          strokeDasharray='289' strokeDashoffset={url ? '0' : '200'}
          style={{ transition: 'stroke-dashoffset 1s ease', filter: 'drop-shadow(0 0 4px rgba(2,209,186,0.6))' }}/>
      </svg>
      {/* Photo ou initiales */}
      <div style={{ position: 'absolute', inset: '6px', borderRadius: '50%', overflow: 'hidden', background: url ? 'transparent' : 'rgba(2,209,186,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
        {url
          ? <img src={url} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <span style={{ fontSize: size * 0.28, fontWeight: 700, color: 'rgba(2,209,186,0.8)', letterSpacing: '-1px' }}>{initials}</span>
        }
        {loading && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%' }}>
            <div style={{ width: 18, height: 18, border: '1.5px solid #02d1ba', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          </div>
        )}
      </div>
      {/* Bouton edit premium */}
      <div style={{ position: 'absolute', bottom: 2, right: 2, width: 20, height: 20, borderRadius: '50%', background: '#050505', border: '1px solid rgba(2,209,186,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
        <svg viewBox='0 0 24 24' fill='none' stroke='#02d1ba' strokeWidth='2' strokeLinecap='round' style={{ width: 10, height: 10 }}>
          <path d='M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7'/>
          <path d='M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z'/>
        </svg>
      </div>
      <input ref={inputRef} type='file' accept='image/*' style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) upload(f); }} />
      <style>{'@keyframes spin { to { transform: rotate(360deg); } }'}</style>
    </div>
  );
}

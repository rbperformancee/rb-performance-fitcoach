import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export function useAvatar(clientId) {
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [uploading, setUploading] = useState(false);

  const fetchAvatar = useCallback(async () => {
    if (!clientId) return;
    const { data } = await supabase
      .from('clients')
      .select('avatar_url')
      .eq('id', clientId)
      .single();
    if (data?.avatar_url) setAvatarUrl(data.avatar_url);
  }, [clientId]);

  const uploadAvatar = useCallback(async (file) => {
    if (!file || !clientId) return;
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `avatars/${clientId}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
      await supabase.from('clients').update({ avatar_url: publicUrl }).eq('id', clientId);
      setAvatarUrl(publicUrl);
      if (navigator.vibrate) navigator.vibrate([20, 10, 40]);
    } catch(e) { console.error(e); }
    setUploading(false);
  }, [clientId]);

  return { avatarUrl, uploading, fetchAvatar, uploadAvatar };
}

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export default function ChatCoach({ clientId, coachEmail, isCoach }) {
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);
  const COACH_EMAIL = coachEmail;

  const fetchMessages = useCallback(async () => {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: true })
      .limit(50);
    setMessages(data || []);
  }, [clientId]);

  useEffect(() => {
    if (!clientId) return;
    fetchMessages();
    const channel = supabase
      .channel(`chat_${clientId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `client_id=eq.${clientId}` },
        () => fetchMessages())
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [clientId, fetchMessages]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const sendMessage = async () => {
    if (!newMsg.trim()) return;
    setSending(true);
    await supabase.from('messages').insert({
      client_id: clientId,
      content: newMsg.trim(),
      sender: isCoach ? 'coach' : 'client',
      created_at: new Date().toISOString(),
    });
    setNewMsg('');
    setSending(false);
    if (navigator.vibrate) navigator.vibrate(10);
  };

  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: 16, overflow: 'hidden',
      marginBottom: 16, display: 'flex', flexDirection: 'column',
      height: 320,
    }}>
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        fontSize: 12, fontWeight: 700, color: '#6b7280', letterSpacing: 1,
      }}>💬 MESSAGE DU COACH</div>
      
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', color: '#4b5563', fontSize: 12, marginTop: 40 }}>
            Aucun message pour le moment
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} style={{
            display: 'flex',
            justifyContent: msg.sender === 'coach' ? 'flex-start' : 'flex-end',
          }}>
            <div style={{
              maxWidth: '75%',
              background: msg.sender === 'coach' ? 'rgba(2,209,186,0.1)' : 'rgba(255,255,255,0.08)',
              border: `1px solid ${msg.sender === 'coach' ? 'rgba(2,209,186,0.2)' : 'rgba(255,255,255,0.1)'}`,
              borderRadius: msg.sender === 'coach' ? '4px 14px 14px 14px' : '14px 4px 14px 14px',
              padding: '8px 12px',
            }}>
              <p style={{ fontSize: 13, color: '#f5f5f5', margin: 0, lineHeight: 1.5 }}>{msg.content}</p>
              <p style={{ fontSize: 10, color: '#6b7280', margin: '4px 0 0', textAlign: 'right' }}>
                {new Date(msg.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div style={{
        padding: '10px 12px',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', gap: 8,
      }}>
        <input
          value={newMsg}
          onChange={e => setNewMsg(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
          placeholder={isCoach ? "Message à ton client..." : "Message à ton coach..."}
          style={{
            flex: 1, background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 10, padding: '10px 14px',
            color: '#f5f5f5', fontSize: 13,
          }}
        />
        <button onClick={sendMessage} disabled={sending || !newMsg.trim()} style={{
          background: newMsg.trim() ? '#02d1ba' : 'rgba(255,255,255,0.05)',
          border: 'none', borderRadius: 10, padding: '10px 14px',
          color: newMsg.trim() ? '#0d0d0d' : '#4b5563',
          cursor: newMsg.trim() ? 'pointer' : 'default',
          fontWeight: 800, fontSize: 16, transition: 'all 0.2s',
        }}>➤</button>
      </div>
    </div>
  );
}

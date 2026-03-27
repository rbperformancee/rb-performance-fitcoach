import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import webpush from 'npm:web-push@3.6.7'

const VAPID_PUBLIC = 'BDsvGYLlUUX3tNPCN0AyRbCKN4h_IBY1bpfZB_AFOVyGE7o_4iLPEJ8Yrg9lCVEUJHg3IOLhxM09N3iiaCuf_dM'
const VAPID_PRIVATE = 'tBlamzhjULOtfA_nr_lO_qdNrX_94G-WskGL3pVDDyc'
webpush.setVapidDetails('mailto:rb.performancee@gmail.com', VAPID_PUBLIC, VAPID_PRIVATE)

serve(async () => {
  const sUrl = Deno.env.get('SUPABASE_URL')!
  const sKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const headers = { apikey: sKey, Authorization: `Bearer ${sKey}`, 'Content-Type': 'application/json' }
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString()

  const { data: clients } = await (await fetch(`${sUrl}/rest/v1/clients?select=id,full_name`, { headers })).json() || {}
  
  let sent = 0
  for (const client of (clients || [])) {
    const { data: logs } = await (await fetch(`${sUrl}/rest/v1/session_logs?client_id=eq.${client.id}&logged_at=gte.${weekAgo}&select=id`, { headers })).json() || {}
    const sessions = logs?.length || 0
    
    const { data: subs } = await (await fetch(`${sUrl}/rest/v1/push_subscriptions?client_id=eq.${client.id}`, { headers })).json() || {}
    
    for (const sub of (subs || [])) {
      try {
        const msg = sessions === 0
          ? { title: '💪 RB PERFORM', body: 'Cette semaine c'était calme. On repart fort lundi !' }
          : { title: '🔥 Bilan semaine', body: `${sessions} séance${sessions > 1 ? 's' : ''} cette semaine. Continue comme ça ${client.full_name?.split(' ')[0] || ''} !` }
        await webpush.sendNotification(sub.subscription, JSON.stringify(msg))
        sent++
      } catch(e) {}
    }
  }
  return new Response(JSON.stringify({ sent }), { headers: { 'Content-Type': 'application/json' } })
})

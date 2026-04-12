import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import webpush from 'npm:web-push@3.6.7'

const VAPID_PUBLIC = Deno.env.get('VAPID_PUBLIC_KEY') ?? ''
const VAPID_PRIVATE = Deno.env.get('VAPID_PRIVATE_KEY') ?? ''
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:rb.performancee@gmail.com'
if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
  console.error('VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY missing in Edge Function secrets')
}
webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE)

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
        const firstName = client.full_name?.split(' ')[0] || ''
        const msg = sessions === 0
          ? { title: 'RB PERFORM', body: 'Cette semaine etait calme. On repart fort lundi !' }
          : { title: 'Bilan semaine', body: `${sessions} seance${sessions > 1 ? 's' : ''} cette semaine. Continue comme ca ${firstName} !` }
        await webpush.sendNotification(sub.subscription, JSON.stringify(msg))
        sent++
      } catch(e) {}
    }
  }
  return new Response(JSON.stringify({ sent }), { headers: { 'Content-Type': 'application/json' } })
})

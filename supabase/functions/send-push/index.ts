import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import webpush from 'npm:web-push@3.6.7'

const VAPID_PUBLIC = Deno.env.get('VAPID_PUBLIC_KEY') ?? ''
const VAPID_PRIVATE = Deno.env.get('VAPID_PRIVATE_KEY') ?? ''
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:rb.performancee@gmail.com'

if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
  console.error('VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY missing in Edge Function secrets')
}
webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE)
const cors = {'Access-Control-Allow-Origin':'*','Content-Type':'application/json'}
serve(async (req) => {
  if (req.method==='OPTIONS') return new Response('ok',{headers:cors})
  try {
    // Auth interne : on accepte SOIT l'anon key (sb_publishable_* ou JWT
    // legacy) SOIT la service role (sb_secret_* ou JWT legacy) via le
    // header apikey OR Authorization Bearer. Le verify_jwt natif Supabase
    // est désactivé sur cette function (config.toml) car il refuse les
    // nouveaux opaque tokens sb_*. On gère donc l'auth ici.
    const ANON = Deno.env.get('SUPABASE_ANON_KEY')!
    const SR = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const auth = req.headers.get('authorization') || ''
    const apikey = req.headers.get('apikey') || ''
    const bearer = auth.startsWith('Bearer ') ? auth.slice(7) : ''
    const presented = bearer || apikey
    if (!presented || (presented !== ANON && presented !== SR)) {
      return new Response(JSON.stringify({error:'unauthorized'}), {status:401, headers:cors})
    }

    const {client_id, coach_id, title, body, url} = await req.json()
    if (!client_id && !coach_id) {
      return new Response(JSON.stringify({error:'client_id or coach_id required'}), {status:400, headers:cors})
    }
    const sUrl = Deno.env.get('SUPABASE_URL')!
    const sKey = SR
    // Filtre exclusif : on cible soit les subs client soit les subs coach
    const filter = coach_id
      ? `coach_id=eq.${coach_id}`
      : `client_id=eq.${client_id}`
    const res = await fetch(`${sUrl}/rest/v1/push_subscriptions?${filter}`,{headers:{apikey:sKey,Authorization:`Bearer ${sKey}`}})
    const subs = await res.json()
    let sent = 0, dead = 0
    const errors: Array<{status?:number; message?:string; body?:string}> = []
    await Promise.all(subs.map(async (r:any) => {
      try {
        await webpush.sendNotification(r.subscription, JSON.stringify({title, body, url: url || '/'}))
        sent++
      } catch (e:any) {
        const status = e?.statusCode
        if (status === 410 || status === 404) {
          dead++
          const endpoint = r.endpoint || r.subscription?.endpoint
          if (endpoint) {
            await fetch(`${sUrl}/rest/v1/push_subscriptions?endpoint=eq.${encodeURIComponent(endpoint)}`, {
              method: 'DELETE',
              headers: {apikey: sKey, Authorization: `Bearer ${sKey}`}
            }).catch(() => {})
          }
        } else {
          console.error('push send failed:', status, e?.message, e?.body)
          errors.push({ status, message: String(e?.message || ''), body: String(e?.body || '').slice(0, 300) })
        }
      }
    }))
    return new Response(JSON.stringify({sent, total: subs.length, dead, errors}), {headers: cors})
  } catch(e) { return new Response(JSON.stringify({error:String(e)}),{status:500,headers:cors}) }
})

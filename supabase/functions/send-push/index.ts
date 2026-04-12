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
    const {client_id,title,body,url} = await req.json()
    const sUrl = Deno.env.get('SUPABASE_URL')!
    const sKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const res = await fetch(`${sUrl}/rest/v1/push_subscriptions?client_id=eq.${client_id}`,{headers:{apikey:sKey,Authorization:`Bearer ${sKey}`}})
    const subs = await res.json()
    const results = await Promise.allSettled(subs.map((r:any)=>webpush.sendNotification(r.subscription,JSON.stringify({title,body,url:url||'/'}))))
    return new Response(JSON.stringify({sent:results.filter((r:any)=>r.status==='fulfilled').length}),{headers:cors})
  } catch(e) { return new Response(JSON.stringify({error:String(e)}),{status:500,headers:cors}) }
})

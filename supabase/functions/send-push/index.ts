import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import webpush from 'npm:web-push@3.6.7'
webpush.setVapidDetails('mailto:rb.performancee@gmail.com','BDsvGYLlUUX3tNPCN0AyRbCKN4h_IBY1bpfZB_AFOVyGE7o_4iLPEJ8Yrg9lCVEUJHg3IOLhxM09N3iiaCuf_dM','tBlamzhjULOtfA_nr_lO_qdNrX_94G-WskGL3pVDDyc')
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

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { DOMParser } from 'https://deno.land/x/deno_dom@v0.1.45/deno-dom-wasm.ts'

/**
 * daily-reminder — notification du matin (8h Paris).
 *
 * Pour chaque client avec un programme actif : si une séance est prévue
 * aujourd'hui, envoie une push motivante listant ce qui l'attend (muscu,
 * run, séance terrain) + une citation qui tourne chaque jour.
 *
 * Déclenché par pg_cron à 06:00 et 07:00 UTC ; la function n'agit que si
 * l'heure de Paris est 8h (robuste au changement d'heure).
 */

const cors = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }

// Citations motivantes — tournent par jour (index = jour julien % longueur),
// donc aucune répétition avant d'avoir épuisé toute la liste.
const QUOTES = [
  "La discipline bat la motivation, tous les jours.",
  "Ce n'est pas la montagne qu'on dompte, mais soi-même.",
  "Le corps accomplit ce que l'esprit croit.",
  "Chaque répétition te rapproche de la version que tu vises.",
  "La douleur d'aujourd'hui, c'est la force de demain.",
  "On ne devient pas fort en évitant l'effort.",
  "Le seul entraînement raté, c'est celui que tu n'as pas fait.",
  "Sois plus fort que ton excuse préférée.",
  "Les résultats arrivent à ceux qui restent quand c'est dur.",
  "Tu n'as pas à être extrême, juste régulier.",
  "Un jour, ou jour un. À toi de choisir.",
  "Le progrès, c'est la somme de petits efforts répétés.",
  "Ton futur toi te regarde t'entraîner aujourd'hui.",
  "La constance transforme l'ordinaire en exceptionnel.",
  "Fais-le fatigué. Fais-le quand même.",
  "La sueur, c'est le résultat qui pleure de joie.",
  "Personne n'a jamais regretté sa séance une fois finie.",
  "Le confort est l'ennemi du progrès.",
  "Tu es à une séance d'une meilleure humeur.",
  "Gagne la journée, gagne la semaine.",
  "Le talent ouvre la porte, le travail la franchit.",
  "Sois patient avec les résultats, exigeant avec les efforts.",
  "L'excellence n'est pas un acte, mais une habitude.",
  "Ce qui te coûte aujourd'hui te rapportera demain.",
  "Décide, engage-toi, recommence.",
  "Les champions s'entraînent, les légendes ne s'arrêtent jamais.",
  "Le plus dur, c'est de commencer. Tu es déjà là.",
  "Force et honneur : fais ta part.",
  "Chaque goutte de sueur écrit ton histoire.",
  "Tu ne grandis pas dans ta zone de confort.",
  "La régularité est le vrai super-pouvoir.",
  "Entraîne-toi comme si ton rival ne dormait jamais.",
  "Un corps fort construit un esprit solide.",
  "Le succès aime les gens occupés à travailler.",
  "Avance, même lentement, mais avance.",
  "L'effort d'aujourd'hui est le souvenir fier de demain.",
  "Tu es capable de bien plus que tu ne le crois.",
  "Transforme le « je ne peux pas » en « pas encore ».",
  "La motivation te lance, la discipline te tient.",
  "Rien ne change si tu ne changes rien.",
  "Sois la personne que tu admirerais.",
  "Le meilleur moment pour s'y mettre, c'est maintenant.",
  "Petit à petit, la bête devient forte.",
  "L'entraînement dur rend les compétitions faciles.",
  "Donne-toi une raison d'être fier ce soir.",
  "Ce n'est jamais le bon moment : c'est juste le moment.",
  "Les limites n'existent que dans la tête.",
  "Travaille en silence, laisse les résultats faire le bruit.",
  "Repousse aujourd'hui ce que tu croyais impossible hier.",
  "L'énergie vient en bougeant, pas en attendant.",
  "Une heure d'effort, vingt-trois heures de fierté.",
  "Tu construis bien plus qu'un physique : un mental.",
  "Le sacrifice d'aujourd'hui est la liberté de demain.",
  "Continue. C'est là que les autres abandonnent.",
  "La meilleure version de toi se gagne, elle ne s'attend pas.",
  "Sois constant quand c'est ennuyeux, c'est là que ça compte.",
  "Le doute tue plus de rêves que l'échec.",
  "Aujourd'hui compte. Ne le laisse pas filer.",
  "Fort de corps, calme d'esprit.",
  "On récolte ce qu'on répète.",
  "Le progrès silencieux finit toujours par se voir.",
  "Chaque séance est un vote pour la personne que tu deviens.",
  "L'inconfort, c'est juste la croissance qui frappe.",
  "Ne compte pas les jours, fais que les jours comptent.",
  "Ta seule limite, c'est toi — et tu peux la déplacer.",
  "Le feu intérieur ne s'éteint que si tu cesses de l'alimenter.",
  "Sois affamé, reste humble, travaille dur.",
  "L'effort n'est jamais perdu, il s'accumule.",
  "Aujourd'hui, dépasse celui que tu étais hier.",
  "La force ne vient pas de ce que tu peux faire, mais de ce que tu surmontes.",
  "Mérite ton repos en méritant ton effort.",
  "Un pas de plus, toujours un pas de plus.",
  "Le corps suit là où l'esprit décide.",
  "Le succès, c'est l'addition de séances que personne n'a vues.",
]

function parseDurationWeeks(d: string): number | null {
  if (!d) return null
  const m = String(d).match(/(\d+)/)
  if (!m) return null
  const n = parseInt(m[1], 10)
  if (!n) return null
  return /mois/i.test(d) ? n * 4 : n
}

function parseProgramme(html: string) {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  if (!doc) return []
  const weeks = [...doc.querySelectorAll('.week-block')].map((w) =>
    [...w.querySelectorAll('.seance-block')].map((s) => ({
      ex: s.querySelectorAll('.exercise-item').length,
      runs: s.querySelectorAll('.run-item').length,
      fields: s.querySelectorAll('.field-item').length,
    }))
  )
  if (weeks.length === 0) return weeks
  // Répète les semaines pour couvrir la durée (semaine-type répétée).
  const durEl = doc.getElementById('prog-duration')
  const durW = parseDurationWeeks(durEl?.getAttribute('value') || '')
  if (durW && durW > weeks.length) {
    return Array.from({ length: durW }, (_, i) => weeks[i % weeks.length])
  }
  return weeks
}

// Réplique de computeTodaysSession (TrainingPage) : la séance prévue aujourd'hui.
function todaysSession(weeks: any[], startDate: string, trainingDays: number[], skippedDates: string[]) {
  if (!startDate || !trainingDays?.length || !weeks.length) return null
  const start = new Date(startDate + 'T00:00:00Z')
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)
  const msPerDay = 86400000
  const daysSinceStart = Math.floor((today.getTime() - start.getTime()) / msPerDay)
  if (daysSinceStart < 0) return null
  const skipped = new Set(skippedDates || [])
  const todayStr = today.toISOString().slice(0, 10)
  if (skipped.has(todayStr)) return null
  const weekday = ((today.getUTCDay() + 6) % 7) + 1
  const td = [...trainingDays].sort((a, b) => a - b)
  if (!td.includes(weekday)) return null
  let eff = -1
  for (let d = 0; d <= daysSinceStart; d++) {
    const date = new Date(start.getTime() + d * msPerDay)
    const dws = ((date.getUTCDay() + 6) % 7) + 1
    if (td.includes(dws) && !skipped.has(date.toISOString().slice(0, 10))) eff++
  }
  if (eff < 0) return null
  const spw = td.length
  const wIdx = Math.floor(eff / spw)
  const sIdx = eff % spw
  if (wIdx >= weeks.length) return null
  return weeks[wIdx]?.[sIdx] || null
}

function buildMessage(sess: { ex: number; runs: number; fields: number }, firstName: string) {
  const parts: string[] = []
  if (sess.ex > 0) parts.push('muscu')
  if (sess.runs > 0) parts.push('run')
  if (sess.fields > 0) parts.push('séance terrain')
  if (parts.length === 0) return null

  const hi = firstName ? `${firstName}, ` : ''
  let title: string
  if (parts.length === 1) {
    title = `${hi}aujourd'hui c'est ${parts[0]} 💪`
  } else if (parts.length === 2) {
    title = `${hi}2 entraînements t'attendent 💪`
  } else {
    title = `${hi}grosse journée : 3 entraînements 🔥`
  }
  const list = parts.length === 1
    ? parts[0]
    : parts.slice(0, -1).join(', ') + ' et ' + parts[parts.length - 1]
  const dayNum = Math.floor(Date.now() / 86400000)
  const quote = QUOTES[dayNum % QUOTES.length]
  const body = `Au programme : ${list}.\n« ${quote} »`
  return { title: title.charAt(0).toUpperCase() + title.slice(1), body }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const ANON = Deno.env.get('SUPABASE_ANON_KEY')!
    const SR = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const auth = req.headers.get('authorization') || ''
    const apikey = req.headers.get('apikey') || ''
    const presented = (auth.startsWith('Bearer ') ? auth.slice(7) : '') || apikey
    if (!presented || (presented !== ANON && presented !== SR)) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: cors })
    }

    // N'agit qu'à 8h, heure de Paris (le cron tape à 06:00 et 07:00 UTC).
    const parisHour = Number(
      new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', hour12: false }).format(new Date())
    )
    const force = new URL(req.url).searchParams.get('force') === '1'
    if (parisHour !== 8 && !force) {
      return new Response(JSON.stringify({ skipped: 'not 8h Paris', parisHour }), { headers: cors })
    }

    const sUrl = Deno.env.get('SUPABASE_URL')!
    const h = { apikey: SR, Authorization: `Bearer ${SR}` }

    const [progRes, cliRes] = await Promise.all([
      fetch(`${sUrl}/rest/v1/programmes?is_active=eq.true&select=client_id,html_content,start_date,training_days,skipped_dates`, { headers: h }),
      fetch(`${sUrl}/rest/v1/clients?select=id,full_name`, { headers: h }),
    ])
    const programmes = await progRes.json()
    const clients = await cliRes.json()
    const nameById = new Map<string, string>(
      (clients || []).map((c: any) => [c.id, (c.full_name || '').split(' ')[0] || ''])
    )

    let sent = 0, skipped = 0
    for (const p of programmes || []) {
      try {
        const weeks = parseProgramme(p.html_content || '')
        const sess = todaysSession(weeks, p.start_date, p.training_days || [], p.skipped_dates || [])
        if (!sess) { skipped++; continue }
        const msg = buildMessage(sess, nameById.get(p.client_id) || '')
        if (!msg) { skipped++; continue }
        await fetch(`${sUrl}/functions/v1/send-push`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', apikey: SR, Authorization: `Bearer ${SR}` },
          body: JSON.stringify({ client_id: p.client_id, title: msg.title, body: msg.body, url: '/app.html' }),
        })
        sent++
      } catch (_e) {
        skipped++
      }
    }
    return new Response(JSON.stringify({ ok: true, sent, skipped }), { headers: cors })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), { status: 500, headers: cors })
  }
})

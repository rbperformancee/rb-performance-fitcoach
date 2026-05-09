import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts"

const SMTP_USER = Deno.env.get("ZOHO_SMTP_USER") ?? "rayan@rbperform.app"
const SMTP_PASS = Deno.env.get("ZOHO_SMTP_PASS") ?? ""
const APP_URL = Deno.env.get("APP_BASE_URL") ?? "https://rbperform.app"
const EMAIL_FROM = Deno.env.get("EMAIL_FROM") ?? `RB Perform <${SMTP_USER}>`

// ===== DESIGN TOKENS =====
const BG = "#0a0a0a"
const CARD = "#111111"
const G = "#02d1ba"
const G_DIM = "rgba(2,209,186,0.08)"
const G_BORDER = "rgba(2,209,186,0.2)"
const BORDER = "rgba(255,255,255,0.06)"
const TEXT = "#f0f0f0"
const TEXT_DIM = "rgba(255,255,255,0.45)"
const TEXT_MUTED = "#6b7280"

// ===== LAYOUT HELPERS =====
function wrap(inner: string) {
  return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:${BG};font-family:'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:${BG};padding:40px 16px;">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
  <tr><td align="center" style="padding-bottom:28px;">
    <div style="font-size:9px;letter-spacing:5px;text-transform:uppercase;color:rgba(2,209,186,0.5);margin-bottom:6px;">Coaching Premium</div>
    <div style="font-size:28px;font-weight:900;color:${TEXT};letter-spacing:-1px;">RB<span style="color:${G}">.</span>Perform</div>
  </td></tr>
  ${inner}
  <tr><td style="padding:24px 0 0;text-align:center;">
    <div style="font-size:11px;color:rgba(255,255,255,0.2);">RB Perform — rb.performancee@gmail.com</div>
  </td></tr>
</table>
</td></tr></table></body></html>`
}

function card(content: string) {
  return `<tr><td style="background:${CARD};border-radius:20px;border:1px solid ${BORDER};padding:32px;">${content}</td></tr>`
}

function cta(label: string, href = APP_URL) {
  return `<table width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;">
    <tr><td align="center">
      <a href="${href}" style="display:inline-block;background:${G};color:#000;font-size:14px;font-weight:800;text-decoration:none;padding:15px 36px;border-radius:12px;letter-spacing:0.3px;">${label}</a>
    </td></tr></table>`
}

function infoBox(title: string, content: string, accent = G) {
  return `<tr><td style="padding:16px 0 0;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:${accent}08;border:1px solid ${accent}20;border-radius:14px;padding:20px 24px;">
    <tr><td>
      <div style="font-size:9px;letter-spacing:3px;text-transform:uppercase;color:${accent};opacity:0.7;margin-bottom:10px;font-weight:700;">${title}</div>
      <div style="font-size:13px;color:${TEXT_DIM};line-height:2;">${content}</div>
    </td></tr></table>
  </td></tr>`
}

// ===== EMAIL TEMPLATES =====

function welcomeEmail(name: string) {
  const greeting = name ? `Salut ${name},` : "Bienvenue,"
  const features = [
    ["Programme personnalise", "Seances, exercices, sets, reps, tempo, RIR — tout est la"],
    ["Suivi nutrition", "Scanne tes produits, logue tes repas, suis tes macros"],
    ["Progression en temps reel", "Tes charges evoluent, tu le vois seance apres seance"],
    ["Installable sur iPhone", "Ajoute l'app sur ton ecran d'accueil comme une vraie app"],
  ]
  return wrap(
    card(`
      <div style="font-size:11px;font-weight:700;color:${G};letter-spacing:2px;text-transform:uppercase;margin-bottom:8px;">Bienvenue</div>
      <div style="font-size:22px;font-weight:900;color:${TEXT};margin-bottom:6px;">${greeting}</div>
      <p style="font-size:14px;color:${TEXT_DIM};line-height:1.7;margin:0 0 24px;">
        Ton espace coaching est pret. Connecte-toi a l'application pour acceder a tes seances, suivre tes charges et visualiser ta progression.
      </p>
      <div style="height:1px;background:${BORDER};margin-bottom:24px;"></div>
      <table width="100%" cellpadding="0" cellspacing="0">
        ${features.map(([t, d]) => `<tr><td style="padding:8px 0;">
          <div style="font-size:13px;font-weight:700;color:${TEXT};margin-bottom:2px;">${t}</div>
          <div style="font-size:12px;color:${TEXT_MUTED};">${d}</div>
        </td></tr>`).join("")}
      </table>
      ${cta("Acceder a mon espace")}
    `) +
    infoBox("Comment se connecter",
      `<strong style="color:${TEXT}">1.</strong> Ouvre <strong style="color:${TEXT}">${APP_URL}</strong><br>
       <strong style="color:${TEXT}">2.</strong> Entre ton adresse email<br>
       <strong style="color:${TEXT}">3.</strong> Recois un lien magique dans ta boite mail<br>
       <strong style="color:${TEXT}">4.</strong> Clique sur le lien — tu es connecte`) +
    infoBox("Installer sur iPhone",
      `<strong style="color:${TEXT}">1.</strong> Ouvre Safari sur ${APP_URL}<br>
       <strong style="color:${TEXT}">2.</strong> Appuie sur Partager en bas<br>
       <strong style="color:${TEXT}">3.</strong> Selectionne "Sur l'ecran d'accueil"`) +
    infoBox("Installer sur Android",
      `<strong style="color:${TEXT}">1.</strong> Ouvre Chrome sur ${APP_URL}<br>
       <strong style="color:${TEXT}">2.</strong> Appuie sur les 3 points en haut a droite<br>
       <strong style="color:${TEXT}">3.</strong> Selectionne "Ajouter a l'ecran d'accueil"`)
  )
}

function programmeReadyEmail(name: string, programmeName?: string) {
  const greeting = name ? `${name},` : ""
  const progLabel = programmeName || "ton nouveau programme"
  return wrap(
    card(`
      <div style="font-size:11px;font-weight:700;color:${G};letter-spacing:2px;text-transform:uppercase;margin-bottom:8px;">Programme Pret</div>
      <div style="font-size:22px;font-weight:900;color:${TEXT};margin-bottom:6px;">${greeting} ${progLabel} t'attend.</div>
      <p style="font-size:14px;color:${TEXT_DIM};line-height:1.7;margin:0 0 24px;">
        Ton coach vient de publier ton programme. Connecte-toi pour le decouvrir, signer et commencer.
      </p>
      <div style="background:${G_DIM};border:1px solid ${G_BORDER};border-radius:14px;padding:20px;margin-bottom:4px;">
        <div style="font-size:9px;letter-spacing:3px;text-transform:uppercase;color:${G};opacity:0.7;margin-bottom:10px;font-weight:700;">Prochaines etapes</div>
        <div style="font-size:13px;color:${TEXT_DIM};line-height:2.2;">
          <strong style="color:${TEXT}">1.</strong> Ouvre l'application<br>
          <strong style="color:${TEXT}">2.</strong> Signe ton programme<br>
          <strong style="color:${TEXT}">3.</strong> Demarre ta premiere seance
        </div>
      </div>
      ${cta("Voir mon programme")}
    `)
  )
}

function renewalReminderEmail(name: string, daysLeft: number, planName?: string) {
  const greeting = name ? `${name},` : ""
  const plan = planName || "ton abonnement"
  return wrap(
    card(`
      <div style="font-size:11px;font-weight:700;color:#f97316;letter-spacing:2px;text-transform:uppercase;margin-bottom:8px;">Renouvellement</div>
      <div style="font-size:22px;font-weight:900;color:${TEXT};margin-bottom:6px;">${greeting} ${plan} expire dans ${daysLeft} jour${daysLeft > 1 ? "s" : ""}.</div>
      <p style="font-size:14px;color:${TEXT_DIM};line-height:1.7;margin:0 0 24px;">
        Pour continuer a acceder a ton programme, tes stats et ton suivi personnalise, pense a renouveler ton abonnement.
      </p>
      <div style="background:rgba(249,115,22,0.06);border:1px solid rgba(249,115,22,0.2);border-radius:14px;padding:20px;margin-bottom:4px;">
        <div style="font-size:9px;letter-spacing:3px;text-transform:uppercase;color:#f97316;opacity:0.7;margin-bottom:10px;font-weight:700;">Ce que tu gardes</div>
        <div style="font-size:13px;color:${TEXT_DIM};line-height:2;">
          Ton programme personnalise<br>
          Ton historique de progression<br>
          Tes donnees nutrition et poids<br>
          L'acces a ton coach
        </div>
      </div>
      ${cta("Renouveler maintenant")}
    `)
  )
}

function subscriptionExpiredEmail(name: string, planName?: string) {
  const greeting = name ? `${name},` : ""
  const plan = planName || "Ton abonnement"
  return wrap(
    card(`
      <div style="font-size:11px;font-weight:700;color:#ef4444;letter-spacing:2px;text-transform:uppercase;margin-bottom:8px;">Abonnement expire</div>
      <div style="font-size:22px;font-weight:900;color:${TEXT};margin-bottom:6px;">${greeting} ${plan} a expire.</div>
      <p style="font-size:14px;color:${TEXT_DIM};line-height:1.7;margin:0 0 24px;">
        Ton acces au programme et au suivi est suspendu. Renouvelle pour reprendre la ou tu en etais — toute ta progression est conservee.
      </p>
      <div style="background:rgba(239,68,68,0.06);border:1px solid rgba(239,68,68,0.2);border-radius:14px;padding:20px;margin-bottom:4px;">
        <div style="font-size:13px;color:${TEXT_DIM};line-height:1.7;">
          Tes donnees sont conservees pendant <strong style="color:${TEXT}">30 jours</strong>. Passe ce delai, elles seront archivees. Renouvelle pour tout retrouver instantanement.
        </div>
      </div>
      ${cta("Renouveler mon abonnement")}
    `)
  )
}

function checkoutConfirmEmail(name: string, planName: string, amount: string) {
  const greeting = name || "Champion"
  return wrap(
    card(`
      <div style="font-size:11px;font-weight:700;color:${G};letter-spacing:2px;text-transform:uppercase;margin-bottom:8px;">Paiement confirme</div>
      <div style="font-size:22px;font-weight:900;color:${TEXT};margin-bottom:6px;">${greeting}, tu fais partie de la Team.</div>
      <p style="font-size:14px;color:${TEXT_DIM};line-height:1.7;margin:0 0 24px;">
        Programme <strong style="color:${G}">${planName}</strong> active. Ton coach va te contacter tres prochainement.
      </p>
      <div style="background:${G_DIM};border:1px solid ${G_BORDER};border-radius:14px;padding:20px;margin-bottom:4px;">
        <div style="font-size:9px;letter-spacing:3px;text-transform:uppercase;color:${G};opacity:0.7;margin-bottom:10px;font-weight:700;">Prochaines etapes</div>
        <div style="font-size:13px;color:${TEXT_DIM};line-height:2.2;">
          <strong style="color:${TEXT}">1.</strong> Accede a l'app sur <strong style="color:${G}">${APP_URL}</strong><br>
          <strong style="color:${TEXT}">2.</strong> Remplis ton questionnaire de demarrage<br>
          <strong style="color:${TEXT}">3.</strong> Reserve ton appel avec ton coach
        </div>
      </div>
      ${cta("Acceder a mon espace")}
    `) +
    infoBox("Installer sur iPhone",
      `<strong style="color:${TEXT}">1.</strong> Ouvre Safari sur ${APP_URL}<br>
       <strong style="color:${TEXT}">2.</strong> Appuie sur Partager en bas<br>
       <strong style="color:${TEXT}">3.</strong> Selectionne "Sur l'ecran d'accueil"`)
  )
}

function deletionEmailHTML(name: string) {
  return wrap(
    card(`
      <div style="font-size:11px;font-weight:700;color:#ef4444;letter-spacing:2px;text-transform:uppercase;margin-bottom:8px;">Confirmation de suppression</div>
      <div style="font-size:22px;font-weight:900;color:${TEXT};margin-bottom:6px;">${name ? name + ", vos" : "Vos"} donnees ont ete supprimees</div>
      <p style="font-size:14px;color:${TEXT_DIM};line-height:1.7;margin:0 0 20px;">
        Conformement a votre demande et au RGPD (droit a l'effacement — article 17), toutes vos donnees personnelles ont ete definitivement supprimees de nos systemes le <strong style="color:${TEXT}">${new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}</strong>.
      </p>
      <div style="background:rgba(255,255,255,0.03);border-radius:12px;padding:16px 20px;margin-bottom:20px;">
        <div style="font-size:9px;letter-spacing:3px;text-transform:uppercase;color:rgba(255,255,255,0.3);margin-bottom:10px;font-weight:700;">Donnees supprimees</div>
        <div style="font-size:13px;color:${TEXT_MUTED};line-height:2;">
          Compte et informations personnelles<br>
          Programme d'entrainement<br>
          Historique des seances et charges<br>
          Donnees de poids et composition corporelle<br>
          Messages et communications
        </div>
      </div>
      <p style="margin:0;font-size:12px;color:${TEXT_MUTED};line-height:1.7;">
        Conservez cet email comme preuve de la suppression. Pour reprendre le coaching, contactez votre coach.
      </p>
    `)
  )
}

// ===== SUBJECTS =====
const SUBJECTS: Record<string, (name: string, extra?: any) => string> = {
  welcome: (name) => `${name ? name + ", ton" : "Ton"} espace RB Perform est pret`,
  checkout: (name, e) => `Bienvenue dans la Team RB Perform`,
  programme_ready: (name, e) => `${name ? name + ", ton" : "Ton"} nouveau programme est pret`,
  renewal_reminder: (name, e) => `${name ? name + ", ton" : "Ton"} abonnement expire bientot`,
  subscription_expired: (name) => `${name ? name + ", ton" : "Ton"} abonnement a expire`,
  deletion: (name) => `Confirmation de suppression de vos donnees`,
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" } })
  }

  try {
    const body = await req.json()
    const { email, full_name, type = "welcome", plan_name, amount, days_left, programme_name } = body
    const name = full_name || ""

    let html: string
    let subject: string

    switch (type) {
      case "checkout":
        html = checkoutConfirmEmail(name, plan_name || "RB Perform", amount || "")
        break
      case "programme_ready":
        html = programmeReadyEmail(name, programme_name)
        break
      case "renewal_reminder":
        html = renewalReminderEmail(name, days_left || 7, plan_name)
        break
      case "subscription_expired":
        html = subscriptionExpiredEmail(name, plan_name)
        break
      case "deletion":
        html = deletionEmailHTML(name)
        break
      default:
        html = welcomeEmail(name)
        break
    }

    subject = (SUBJECTS[type] || SUBJECTS.welcome)(name, body)

    if (!SMTP_PASS) {
      return new Response(JSON.stringify({ error: "ZOHO_SMTP_PASS missing" }), { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } })
    }
    const smtpClient = new SMTPClient({
      connection: {
        hostname: "smtp.zoho.eu",
        port: 465,
        tls: true,
        auth: { username: SMTP_USER, password: SMTP_PASS },
      },
    })
    try {
      await smtpClient.send({
        from: EMAIL_FROM,
        to: email,
        replyTo: SMTP_USER,
        subject,
        content: "auto",
        html,
      })
    } catch (smtpErr: any) {
      console.error("[send-welcome] SMTP error", smtpErr?.message || smtpErr)
      return new Response(JSON.stringify({ error: "Email provider error" }), { status: 502, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } })
    } finally {
      try { await smtpClient.close() } catch { /* noop */ }
    }
    return new Response(JSON.stringify({ success: true, sent_to: email }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 400,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    })
  }
})

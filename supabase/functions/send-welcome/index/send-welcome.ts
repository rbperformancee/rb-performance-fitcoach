import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")
const APP_URL = "https://rb-perfor.vercel.app"

const emailHTML = (clientName: string) => `
<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Bienvenue chez RB Performance</title>
</head>
<body style="margin:0;padding:0;background:#0d0d0d;font-family:'Helvetica Neue',Arial,sans-serif;">

<table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0d0d;padding:40px 20px;">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

  <!-- Logo + Header -->
  <tr>
    <td align="center" style="padding-bottom:32px;">
      <div style="width:64px;height:64px;background:#141414;border:2px solid rgba(2,209,186,0.3);border-radius:18px;display:inline-flex;align-items:center;justify-content:center;font-size:28px;margin-bottom:20px;">
        💪
      </div>
      <h1 style="margin:0;font-size:28px;font-weight:800;color:#f5f5f5;letter-spacing:-0.5px;">
        RB <span style="color:#02d1ba;">Performance</span>
      </h1>
    </td>
  </tr>

  <!-- Card principale -->
  <tr>
    <td style="background:#141414;border-radius:20px;border:1px solid rgba(255,255,255,0.08);padding:36px 32px;">

      <!-- Accueil -->
      <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#02d1ba;letter-spacing:2px;text-transform:uppercase;">Bienvenue 👋</p>
      <h2 style="margin:0 0 16px;font-size:22px;font-weight:800;color:#f5f5f5;letter-spacing:-0.3px;">
        ${clientName ? `Salut ${clientName} !` : "Bienvenue !"}
      </h2>
      <p style="margin:0 0 24px;font-size:14px;color:#9ca3af;line-height:1.7;">
        Ton programme personnalisé est prêt. Connecte-toi à l'application pour accéder à tes séances, suivre tes charges et visualiser ta progression.
      </p>

      <!-- Séparateur -->
      <div style="height:1px;background:rgba(255,255,255,0.07);margin:0 0 24px;"></div>

      <!-- Features -->
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
        ${[
          ["📋", "Programme personnalisé", "Séances, exercices, sets, reps — tout est là"],
          ["⏱", "Timer de repos", "Chrono automatique entre chaque série"],
          ["📈", "Suivi de progression", "Tes charges évoluent, tu le vois en temps réel"],
          ["📱", "Installable sur iPhone", "Ajoute l'app sur ton écran d'accueil"],
        ].map(([icon, title, desc]) => `
        <tr>
          <td style="padding:8px 0;">
            <table cellpadding="0" cellspacing="0">
              <tr>
                <td style="width:40px;vertical-align:top;padding-top:2px;font-size:20px;">${icon}</td>
                <td style="vertical-align:top;">
                  <div style="font-size:13px;font-weight:700;color:#f5f5f5;margin-bottom:2px;">${title}</div>
                  <div style="font-size:12px;color:#6b7280;">${desc}</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>`).join("")}
      </table>

      <!-- CTA Button -->
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td align="center">
            <a href="${APP_URL}" style="display:inline-block;background:#02d1ba;color:#0d0d0d;font-size:15px;font-weight:800;text-decoration:none;padding:15px 40px;border-radius:12px;letter-spacing:0.3px;">
              Accéder à mon programme →
            </a>
          </td>
        </tr>
      </table>

    </td>
  </tr>

  <!-- Comment se connecter -->
  <tr>
    <td style="padding:24px 0 0;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#141414;border-radius:14px;border:1px solid rgba(2,209,186,0.15);padding:20px 24px;">
        <tr>
          <td>
            <p style="margin:0 0 12px;font-size:10px;font-weight:700;color:#02d1ba;letter-spacing:2px;text-transform:uppercase;">Comment se connecter</p>
            <ol style="margin:0;padding:0 0 0 18px;color:#9ca3af;font-size:13px;line-height:2;">
              <li>Ouvre <strong style="color:#f5f5f5;">${APP_URL}</strong></li>
              <li>Entre ton adresse email</li>
              <li>Reçois un lien magique dans ta boîte mail</li>
              <li>Clique sur le lien — tu es directement connecté ✅</li>
            </ol>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- Installer sur iPhone -->
  <tr>
    <td style="padding:16px 0 0;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#141414;border-radius:14px;border:1px solid rgba(255,255,255,0.06);padding:20px 24px;">
        <tr>
          <td>
            <p style="margin:0 0 8px;font-size:10px;font-weight:700;color:#9ca3af;letter-spacing:2px;text-transform:uppercase;">📱 Installer sur iPhone</p>
            <p style="margin:0;font-size:12px;color:#6b7280;line-height:1.7;">
              Safari → visite le lien → icône <strong style="color:#f5f5f5;">⬆️ Partager</strong> → <strong style="color:#f5f5f5;">"Sur l'écran d'accueil"</strong> → l'icône RB Performance apparaît comme une vraie app.
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- Footer -->
  <tr>
    <td style="padding:28px 0 0;text-align:center;">
      <p style="margin:0 0 4px;font-size:12px;color:#444;">Une question ? Réponds à cet email ou contacte ton coach.</p>
      <p style="margin:0;font-size:12px;color:#02d1ba;font-weight:600;">rb.performancee@gmail.com</p>
    </td>
  </tr>

</table>
</td></tr>
</table>
</body>
</html>
`


const deletionEmailHTML = (clientName) => `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#0d0d0d;font-family:'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0d0d;padding:40px 20px;">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
<tr><td align="center" style="padding-bottom:24px;">
<h1 style="margin:0;font-size:24px;font-weight:800;color:#f5f5f5;">RB <span style="color:#02d1ba;">Performance</span></h1>
</td></tr>
<tr><td style="background:#141414;border-radius:20px;border:1px solid rgba(255,255,255,0.08);padding:32px;">
<p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#ef4444;letter-spacing:2px;text-transform:uppercase;">Confirmation de suppression</p>
<h2 style="margin:0 0 16px;font-size:20px;font-weight:800;color:#f5f5f5;">${clientName ? clientName + ", vos" : "Vos"} données ont été supprimées</h2>
<p style="margin:0 0 20px;font-size:14px;color:#9ca3af;line-height:1.7;">
Conformément à votre demande et au RGPD (droit à l'effacement — article 17), toutes vos données personnelles ont été définitivement supprimées de nos systèmes le <strong style="color:#f5f5f5;">${new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</strong>.
</p>
<div style="background:#1a1a1a;border-radius:12px;padding:16px 20px;margin-bottom:20px;">
<p style="margin:0 0 8px;font-size:11px;font-weight:700;color:#555;letter-spacing:1.5px;text-transform:uppercase;">Données supprimées</p>
<ul style="margin:0;padding:0 0 0 16px;color:#6b7280;font-size:13px;line-height:2;">
<li>Compte et informations personnelles</li>
<li>Programme d'entraînement</li>
<li>Historique des séances et charges</li>
<li>Données de poids et composition corporelle</li>
<li>Messages et communications</li>
</ul>
</div>
<p style="margin:0;font-size:12px;color:#6b7280;line-height:1.7;">
Conservez cet email comme preuve de la suppression. Si vous souhaitez reprendre le coaching avec RB Performance, n'hésitez pas à recontacter votre coach.
</p>
</td></tr>
<tr><td style="padding:20px 0 0;text-align:center;">
<p style="margin:0;font-size:12px;color:#444;">Contact : rb.performancee@gmail.com</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" } })
  }

  const { email, full_name } = await req.json()

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: "RB Performance <noreply@rbperform.com>",
      to: [email],
      subject: `${full_name ? full_name + ", ton" : "Ton"} programme RB Performance est prêt 💪`,
      html: emailHTML(full_name),
    }),
  })

  const data = await res.json()
  return new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  })
})

-- 126 — Seed des 5 workflows essentiels (mode mail uniquement).
-- Tous envoient un internal_alert à rb.performancee@gmail.com (RB_SUPPORT_EMAIL).
-- Tu peux les éditer / désactiver via Supabase Studio à tout moment.

-- ════════════════════════════════════════════════════════════════════
-- 1. Nouveau candidat reçu — alerte instantanée
-- ════════════════════════════════════════════════════════════════════
INSERT INTO workflows (name, description, trigger, actions) VALUES (
  '🟢 Alerte nouveau candidat',
  'Mail à Rayan dès qu''une candidature high-ticket arrive. Tu peux agir dans la fenêtre psychologique de 2h.',
  '{"type":"coaching_application_received"}'::jsonb,
  '[
    {
      "type": "internal_alert",
      "config": {
        "subject": "🟢 Nouveau candidat : {{first_name}}",
        "body": "Tu viens de recevoir une candidature.\n\nNom        : {{nom_prenom}}\nEmail      : {{email}}\nTéléphone  : {{phone}}\nBudget     : {{budget_mensuel}}€/mois\nTimeline   : {{commitment_timeline}}\nObjectif   : {{objectif}}\n\n→ Va dans le CRM pour confirmer le créneau."
      }
    }
  ]'::jsonb
)
ON CONFLICT DO NOTHING;

-- ════════════════════════════════════════════════════════════════════
-- 2. Pack Découverte opt-in — track des leads "front-funnel"
-- ════════════════════════════════════════════════════════════════════
INSERT INTO workflows (name, description, trigger, actions) VALUES (
  '🟡 Track Pack Découverte opt-in',
  'Mail à Rayan dès qu''un visiteur opt-in au Pack Découverte. Permet de tracer les leads "non encore prêts".',
  '{"type":"pack_decouverte_optin"}'::jsonb,
  '[
    {
      "type": "internal_alert",
      "config": {
        "subject": "🟡 Pack Découverte : {{first_name}} ({{email}})",
        "body": "Nouvel opt-in lead magnet.\n\nPrénom : {{first_name}}\nEmail  : {{email}}\n\n→ Le mail welcome part automatiquement, séquence nurture J+1 à J+7 enclenchée."
      }
    },
    {
      "type": "add_tag",
      "config": { "tag": "pack_decouverte" }
    }
  ]'::jsonb
)
ON CONFLICT DO NOTHING;

-- ════════════════════════════════════════════════════════════════════
-- 3. Athlète signé (closed_won) — celebration + alerte
-- ════════════════════════════════════════════════════════════════════
INSERT INTO workflows (name, description, trigger, actions) VALUES (
  '🎉 Athlète signé',
  'Mail à Rayan + ajoute tag "signé" quand un closed_won est marqué dans le CRM.',
  '{"type":"coaching_application_outcome_set","config":{"to":"closed_won"}}'::jsonb,
  '[
    {
      "type": "internal_alert",
      "config": {
        "subject": "🎉 {{first_name}} a signé",
        "body": "BRAVO. Un athlète vient de signer RB Perform PRO.\n\nNom        : {{first_name}}\nEmail      : {{email}}\nTéléphone  : {{phone}}\nValeur     : ~{{value}}€/mois (best estimate)\nApplication ID : {{application_id}}\n\n→ Pense à coller le lien Stripe Payment au prospect si pas déjà fait.\n→ Préparer son premier programme sous 48h."
      }
    },
    {
      "type": "add_tag",
      "config": { "tag": "signé_pro" }
    }
  ]'::jsonb
)
ON CONFLICT DO NOTHING;

-- ════════════════════════════════════════════════════════════════════
-- 4. Athlète perdu (closed_lost) — alerte pour analyse + tag pour relance
-- ════════════════════════════════════════════════════════════════════
INSERT INTO workflows (name, description, trigger, actions) VALUES (
  '🟠 Athlète à relancer',
  'Mail à Rayan + tag "à relancer" quand closed_lost. La séquence J+1/J+3/J+7 démarre automatiquement.',
  '{"type":"coaching_application_outcome_set","config":{"to":"closed_lost"}}'::jsonb,
  '[
    {
      "type": "internal_alert",
      "config": {
        "subject": "🟠 {{first_name}} pas signé — séquence relance lancée",
        "body": "Le call avec {{first_name}} ({{email}}) s''est terminé sur ''je réfléchis'' ou similaire.\n\n→ Le cron cron-coaching-call-followup va envoyer auto les mails J+1, J+3, J+7.\n→ Tu n''as RIEN à faire de plus, sauf si tu veux relancer manuellement par WhatsApp.\n\nID candidature : {{application_id}}"
      }
    },
    {
      "type": "add_tag",
      "config": { "tag": "à_relancer" }
    }
  ]'::jsonb
)
ON CONFLICT DO NOTHING;

-- ════════════════════════════════════════════════════════════════════
-- 5. No-show — alerte + tag pour rappel manuel
-- ════════════════════════════════════════════════════════════════════
INSERT INTO workflows (name, description, trigger, actions) VALUES (
  '⏰ No-show',
  'Mail à Rayan + tag "no_show" quand un candidat ne se présente pas au call.',
  '{"type":"coaching_application_outcome_set","config":{"to":"no_show"}}'::jsonb,
  '[
    {
      "type": "internal_alert",
      "config": {
        "subject": "⏰ No-show : {{first_name}}",
        "body": "{{first_name}} ({{email}}) n''est pas venu au call.\n\nNuméro : {{phone}}\n\n→ Penser à le rappeler ou WhatsApp ce soir.\n→ Pas de séquence auto pour les no-show (volonté Rayan, contact direct préféré).\n\nID candidature : {{application_id}}"
      }
    },
    {
      "type": "add_tag",
      "config": { "tag": "no_show" }
    }
  ]'::jsonb
)
ON CONFLICT DO NOTHING;

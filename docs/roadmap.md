# Post-launch priorities

## Push notifications (BUG 7 — reporté)

Le système de push est en place côté client (subscribe + VAPID + service worker)
mais aucun backend n'envoie les notifications quand un coach envoie un message.

### Ce qui existe :
- `src/hooks/usePushNotifications.js` : subscribe côté client
- `public/sw.js` : service worker qui écoute les events push
- Table `push_subscriptions` : stocke les tokens push des clients
- VAPID keys configurées

### Ce qui manque :
- Un trigger côté serveur quand un message est inséré dans la table `messages`
- Options : Supabase Database Webhook → Edge Function → web-push API
- Ou : un cron qui poll les messages non-lus toutes les 30s

### Estimation : 2h de dev

## Scan food photo IA (feature V2)

Scan photo de repas → estimation macros via Mistral Vision.
Reporté pour raison de coût ($225/mois à 50 coachs).

## Questionnaire onboarding client

Le OnboardingFlow (7 étapes) est désactivé dans App.jsx.
À réactiver quand le flow coach sera ajusté pour pré-remplir les données.

## Gating Sentinel

Sentinel est activé pour tous pendant la beta.
À réactiver le plan check (Pro/Elite/Founding) après validation.

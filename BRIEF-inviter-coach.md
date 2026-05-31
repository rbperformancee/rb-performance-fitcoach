# Brief — Feature "Inviter un coach" (SuperAdminDashboard)

Je veux ajouter une feature "Inviter un coach" dans le SuperAdminDashboard. Contexte :

- **But** : créer un compte coach sans passer par Stripe (cas : Kévin, Pioneer #1, et futurs comps/partenaires).
- **Champs du form** : email, subscription_plan (founding/pro/elite), locked_price (optionnel), founding_coach (bool), coach_notes.
- **Sécurité — non négociable** : le 15/05 la création de coach a été verrouillée au stripe-webhook uniquement. Cette feature doit passer par une Edge Function dédiée qui vérifie que l'appelant est super admin (JWT + rôle), sinon je rouvre le vecteur de compte coach gratuit que j'ai fermé exprès.
- La fonction doit : créer le user Auth, créer la row coach, envoyer un email de connexion.
- `send-invite` n'est PAS réutilisable : elle invite des clients, pas des coachs.
- **Avant de coder** : lis `SuperAdminDashboard.jsx`, le `stripe-webhook` (pour réutiliser sa logique de création coach), et le schéma de la table `coaches`.
- **Test obligatoire** avec `infosgreenclean@gmail.com` avant de toucher au compte de Kévin.

## Points à valider (suggestions, à confirmer)

- **Idempotence** : si l'email existe déjà (user Auth ou row `coaches`), refuser proprement — ne pas créer de doublon.
- **Cohérence pricing B2B** : `subscription_plan` + `locked_price` doivent rester alignés avec la grille (Founding 199€ jusqu'au 26 mai, Pro 299€ après). Kévin = Pioneer : `founding_coach=true` + `locked_price` custom.

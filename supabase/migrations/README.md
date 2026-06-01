# Migrations Supabase — workflow

Pas de DB password sur ce projet. Les migrations passent par la **Management
API** (`POST /v1/projects/{ref}/database/query`) qui accepte une string SQL
par appel. ⚠️ Cette API traite tout l'appel comme une transaction implicite
et **silently no-op certains statements** quand on envoie du multi-stmt
(observé sur 102 : seul le `CREATE TABLE` passait, INDEX et COMMENT étaient
ignorés sans erreur). On envoie donc **un statement à la fois**.

## Runner générique

```bash
# Apply (lit le marker --@SPLIT@ ou fallback sur ;\n)
npm run migrate 108_push_subscriptions_hygiene.sql

# Dry-run : affiche les statements qui seraient envoyés, sans appel API
npm run migrate:dry 108_push_subscriptions_hygiene.sql

# Fichier hors supabase/migrations/ (chemin absolu)
node scripts/apply-migration.mjs --file /tmp/quickfix.sql
```

### Auth

Le script cherche `SUPABASE_ACCESS_TOKEN` dans cet ordre :

1. Env var directe
2. `.env.local`
3. macOS Keychain entry `Supabase CLI` (auto sur dev local Rayan)

`SUPABASE_PROJECT_REF` est extrait de `SUPABASE_URL` / `REACT_APP_SUPABASE_URL`
si absent.

## Convention `--@SPLIT@`

Pour les migrations multi-statements, place une ligne `--@SPLIT@` (seul, sans
indentation) entre chaque statement. Le runner split sur cette marker. Tu peux
mettre des comments avant/après — ils sont stockés en doc mais le statement
envoyé exclut les lignes pure-comment.

```sql
CREATE TABLE foo (...);

--@SPLIT@

CREATE INDEX foo_a_idx ON foo (a);

--@SPLIT@

COMMENT ON TABLE foo IS 'doc';
```

### Sans marker (legacy)

Le runner fallback sur split par `;\n` (semicolon + newline). Marche pour les
migrations simples (CREATE/ALTER/COMMENT mono-stmt). **Ne marche pas** pour les
`DO $$ … $$` ou fonctions PL/pgSQL contenant des `;` internes — dans ce cas,
ajoute le marker `--@SPLIT@`.

Les `BEGIN;` / `COMMIT;` / `ROLLBACK;` standalone sont automatiquement skipped
(chaque appel API étant déjà sa propre transaction implicite). Si tu as
vraiment besoin d'une transaction multi-stmt, regroupe dans un seul bloc
`DO $$ … $$` et utilise `--@SPLIT@` pour isoler ce bloc.

## Idempotence recommandée

Toutes les nouvelles migrations devraient être idempotentes :

- `CREATE TABLE IF NOT EXISTS`
- `CREATE INDEX IF NOT EXISTS`
- `ALTER TABLE … ADD COLUMN IF NOT EXISTS`
- `INSERT … ON CONFLICT DO NOTHING/UPDATE`

Permet de relancer sans crainte si un statement a foiré au milieu.

## État appliqué

Les migrations 100-108 sont toutes appliquées en remote (vérifié via
`information_schema.columns` 31/05/26). Une migration committée ici est par
défaut considérée comme appliquée — si tu en ajoutes une nouvelle, lance
`npm run migrate <file>` AVANT le commit, puis push.

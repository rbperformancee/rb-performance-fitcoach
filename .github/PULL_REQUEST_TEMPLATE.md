<!--
  RB Perform — PR checklist
  Remplis les sections applicables. Supprime celles qui ne le sont pas.
-->

## Résumé

<!-- 1-2 phrases. Commence par un verbe. "Add, fix, refactor, chore…" -->

## Pourquoi

<!-- Problème résolu, lien vers une issue, décision produit… -->

## Type

- [ ] feat — nouvelle capacité utilisateur
- [ ] fix — corrige un bug
- [ ] perf — amélioration performance
- [ ] refactor — code équivalent, mieux structuré
- [ ] chore — outillage / deps / docs
- [ ] security — durcissement / CVE / secret

## Test plan

- [ ] Build local `npm run build` OK
- [ ] E2E `npx playwright test` OK (ou explicite que non-applicable)
- [ ] Smoke prod après déploiement (liste les URLs vérifiées)
- [ ] Sentry — pas de nouveau type d'erreur en prod pendant 15 min

## Impact observabilité

- [ ] Pas de nouveau silent-fail (chaque catch capture Sentry + log structuré)
- [ ] Pas de régression sur `/api/health?deep=1`
- [ ] `/status` reflète bien l'état

## Breaking changes

<!-- Listing + migration path si oui. -->

## Checklist sécurité

- [ ] Pas d'eval / new Function ajoutés
- [ ] Pas de dangerouslySetInnerHTML ajouté
- [ ] Endpoints `/api/*` nouveaux ont `secureRequest` ou `rateLimit`
- [ ] Pas de secret hardcodé (vérifier `git diff`)
- [ ] Inputs utilisateur validés/échappés

## Déploiement

- [ ] Peut être déployé sans action humaine (env vars déjà set)
- [ ] Documenté dans `CHANGELOG.md` si user-facing

🤖 Generated with [Claude Code](https://claude.com/claude-code)

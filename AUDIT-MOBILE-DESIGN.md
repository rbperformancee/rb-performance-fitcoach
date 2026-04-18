# AUDIT MOBILE DESIGN — RB Perform

> 18 avril 2026 — Audit + fixes design system

## Scores

| Écran | Score | BG | Gradient | Safe-area | Cards | Fonts |
|---|---|---|---|---|---|---|
| CoachHomeScreen | 5/5 | ✓ #050505 | ✓ Radial top+bottom | ✓ | ✓ | ✓ |
| TransformationView | 5/5 | ✓ #050505 | ✓ Radial top+bottom | ✓ | ✓ | ✓ |
| CoachDashboard | 4/5 | ❌ #080C14 | Partial (top only) | ✓ | ✓ | ✓ |
| Settings | 3/5 | ❌ #080C14 | ❌ None | ✓ top | ✓ | ✓ |
| AnalyticsSection | 3/5 | ❌ #080C14 | ❌ None | ✓ top | ✓ | ✓ |
| BusinessSection | 3/5 | inherited | Linear (not radial) | ⚠️ parent | ✓ | ✓ |
| PipelineKanban | 3/5 | ❌ #080C14 | ❌ None | ✓ top | ✓ | ✓ |
| ProgrammeList | 2/5 | inherited | ❌ None | ❌ parent | ✓ | ✓ |
| ChurnAlertsSection | 2/5 | inherited | ❌ None | ❌ parent | ✓ | ✓ |
| AchievementsSection | 2/5 | inherited | ❌ None | ❌ parent | ✓ | ✓ |

## Fixes appliqués

- CoachDashboard: BG → #050505, gradient bottom ajouté
- Settings: BG → #050505, gradient top ajouté
- AnalyticsSection: BG → #050505, gradient top ajouté
- PipelineKanban: BG → #050505, gradient top ajouté
- Tous les hardcoded safe-area-bottom → env()

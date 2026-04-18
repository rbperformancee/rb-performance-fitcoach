# AUDIT OVERLAYS — RB Perform

> 18 avril 2026 — Read-only audit + fixes

## Phase 1 — Inventaire

| # | Composant | Type | X visible? | Taille X | Backdrop click? | Swipe? | Safe-area top? | Safe-area bottom? | Sévérité |
|---|-----------|------|-----------|----------|----------------|--------|---------------|-------------------|----------|
| 1 | NotificationBell | Drawer | ✓ | 30×30 | ✓ | ✗ | ✓ | ✗ | 🟠 X<44px |
| 2 | InviteClient | Modal | ✓ | 28×28 | ✓ | ✗ | ✗ | ✗ | 🟠 X<44px |
| 3 | CommandPalette | Modal | ✗ (ESC only) | — | ✓ | ✗ | ✗ | ✗ | 🔴 Pas de X mobile |
| 4 | AIAnalyze | Modal | ✓ | 28×28 | ✓ | ✗ | ✗ | ✗ | 🟠 X<44px |
| 5 | CoachPlansSettings modal | Modal | ✗ | — | ✓ | ✗ | ✗ | ✗ | 🟠 Pas de X |
| 6 | FuelPage — Food Add | Bottom Sheet | ✓ | 34×34 | ✓ | ✗ | ✗ | ✓ | 🟠 X<44px, no swipe |
| 7 | FuelPage — Voice | Bottom Sheet | ✗ | — | ✓ | ✗ | ✗ | ✓ | 🟠 Pas de X |
| 8 | FuelPage — Scan | Modal | ✓ | 34×34 | ✓ | ✗ | ✗ | ✗ | 🟠 X<44px |
| 9 | FuelPage — Water | Modal | ✗ | — | ✓ | ✗ | ✗ | ✗ | 🟡 OK (petit modal) |
| 10 | FuelPage — Sleep | Modal | ✗ | — | ✓ | ✗ | ✗ | ✗ | 🟡 OK (petit modal) |
| 11 | FuelPage — Food Edit | Bottom Sheet | ✓ | 34×34 | ✓ | ✗ | ✗ | ✓ | 🟠 X<44px, no swipe |
| 12 | TrainingPage — Options | Bottom Sheet | ✗ (Annuler) | — | ✓ | ✗ | ✗ | ✓ | 🟡 OK (Annuler btn) |
| 13 | TrainingPage — Confirm | Bottom Sheet | ✗ (Continuer) | — | ✓ | ✗ | ✗ | ✓ | 🟡 OK |
| 14 | TrainingPage — RPE | Bottom Sheet | ✗ | — | ✗ | ✗ | ✗ | ✓ | 🟡 Ferme via action |
| 15 | MovePage — Add Run | Bottom Sheet | ✓ | 30×30 | ✓ | ✗ | ✗ | ✓ | 🟠 X<44px |
| 16 | MovePage — Steps | Modal | ✗ | — | ✓ | ✗ | ✗ | ✗ | 🟡 OK (petit modal) |
| 17 | FaqAssistant | Floating panel | ✓ | 36×36 | ✗ | ✗ | ✗ | ✗ | 🟡 OK |

## Phase 2 — Composants à fixer

### 🔴 Bloquant
- **CommandPalette** : aucun X visible sur mobile, ESC seul

### 🟠 Grave (X < 44px)
- NotificationBell : X 30×30
- InviteClient : X 28×28
- AIAnalyze : X 28×28
- CoachPlansSettings : pas de X
- FuelPage Food Add : X 34×34
- FuelPage Voice : pas de X
- FuelPage Scan : X 34×34
- FuelPage Food Edit : X 34×34
- MovePage Add Run : X 30×30

# Sentinel — Agent IA Business

## Architecture

```
Browser (Sentinel.jsx)
  └─ SELECT sentinel_cards WHERE coach_id = auth.uid() AND status = 'active'
  └─ UPDATE sentinel_cards SET status = 'completed'/'dismissed'

Vercel Crons (service_role — bypass RLS)
  ├─ sentinel-benchmarks (02:00 UTC daily)
  │   └─ Computes platform_benchmarks (anonymized, min 10 coaches/bucket)
  │   └─ Generates price_intel + ranking cards
  ├─ sentinel-daily (05:30 UTC daily = 07:30 Paris)
  │   └─ Generates daily_playbook cards via Mistral AI
  │   └─ 3 actions chiffrees par coach
  └─ sentinel-weekly (07:00 UTC Monday = 09:00 Paris)
      └─ Generates revenue_unblocker cards via Mistral AI
      └─ 1-5 clients a upgrader
```

## Tables

| Table | RLS | Description |
|-------|-----|-------------|
| sentinel_cards | coach_id = auth.uid() (SELECT/UPDATE only) | Feed cards per coach |
| platform_benchmarks | SELECT for all (anonymized) | Platform-wide metrics |
| sentinel_mistral_logs | No policy (service_role only) | Cost tracking + debug |

## Cron Schedule (UTC)

| Cron | Schedule | What |
|------|----------|------|
| sentinel-benchmarks | 02:00 daily | Platform benchmarks + price_intel + ranking cards |
| sentinel-daily | 05:30 daily | Daily Playbook (Mistral AI) |
| sentinel-weekly | 07:00 Monday | Revenue Unblockers (Mistral AI) |

## Access Control

- **Founding coaches**: Full access (is_founding = true)
- **Pro/Elite**: Full access (subscription_plan IN ('pro', 'elite'))
- **Starter**: Teaser modal with upgrade CTA
- **Feature flag**: REACT_APP_SENTINEL_ENABLED=true OR coach.features.sentinel_beta=true

## Mistral Safety

1. **JSON strict**: response_format: { type: "json_object" }
2. **Zod validation**: Every output validated before DB write
3. **Zero PII**: Prompts use initials + short ID only (e.g., "JD-a1b2")
4. **Prompt injection defense**: sanitizeInput() strips ##, </prompt>, [INST], <<SYS>>
5. **Budget cap**: MISTRAL_DAILY_BUDGET_USD (default $50), checked before each call
6. **Rate limiting**: p-limit(5) concurrent Mistral calls
7. **Timeout**: 30s per call
8. **Retry**: 2 retries with exponential backoff (1s, 3s)
9. **Fallback**: Generic card if Mistral fails

## Idempotency

All cards use dedupe_key format: `{type}_{coachId}_{date}` (e.g., `daily_abc123_2026-04-18`).
UNIQUE constraint on (coach_id, dedupe_key) prevents duplicate cards if cron runs twice.

## Environment Variables

```
REACT_APP_SENTINEL_ENABLED=false    # Feature flag (default off)
MISTRAL_API_KEY=xxx                  # Required for AI cards
MISTRAL_DAILY_BUDGET_USD=50          # Cost cap (default $50/day)
CRON_SECRET=xxx                      # Vercel cron auth
SUPABASE_SERVICE_ROLE_KEY=xxx        # Bypass RLS for crons
```

## Rollout Plan

1. Deploy with SENTINEL_ENABLED=false (zero user impact)
2. Enable for 3-5 beta coaches via DB: `UPDATE coaches SET features = jsonb_set(features, '{sentinel_beta}', 'true') WHERE id IN (...)`
3. Monitor 3-5 days: check sentinel_mistral_logs for costs, Sentry for errors
4. Flip SENTINEL_ENABLED=true for global launch

## Runbook

### Mistral costs too high
1. Check sentinel_mistral_logs: `SELECT SUM(cost_usd), COUNT(*) FROM sentinel_mistral_logs WHERE created_at > NOW() - INTERVAL '24h'`
2. If budget exceeded, crons auto-stop
3. Reduce MISTRAL_DAILY_BUDGET_USD if needed

### Cards not appearing
1. Check cron logs in Vercel dashboard
2. Verify CRON_SECRET matches between Vercel env and cron config
3. Check sentinel_mistral_logs for errors
4. Manually invoke: `curl -H "Authorization: Bearer $CRON_SECRET" https://rb-perfor.vercel.app/api/cron/sentinel-daily`

### RLS leak suspected
1. Run: `SELECT coach_id, COUNT(*) FROM sentinel_cards GROUP BY coach_id`
2. Test with 2 different coach tokens: each should only see their own cards
3. platform_benchmarks should never contain coach_id column

### Rollback
1. Set SENTINEL_ENABLED=false
2. Sentinel UI disappears immediately
3. Crons still run but cards won't be visible
4. To fully disable crons: remove entries from vercel.json crons array

-- 129_coach_availability.sql
-- Disponibilités du coach (mono-coach Rayan) pour le form /candidature de
-- rbperform.com. Deux types : périodes off (plages de dates) et indispos
-- récurrentes hebdo (ex: mardi matin off).
--
-- Pas de coach_id : système mono-tenant à date.

-- ────────────────────────────────────────────────────────────
-- Plages off (vacances, stage, compétition...)
-- ────────────────────────────────────────────────────────────
create table if not exists public.coach_off_periods (
  id          uuid primary key default gen_random_uuid(),
  date_start  date not null,
  date_end    date not null,
  label       text,
  created_at  timestamptz not null default now(),
  check (date_end >= date_start)
);

create index if not exists idx_coach_off_periods_dates
  on public.coach_off_periods (date_start, date_end);

-- ────────────────────────────────────────────────────────────
-- Indispos récurrentes hebdo
-- day_of_week : 0=dim, 1=lun, ..., 6=sam (ISO JS Date#getDay)
-- hour_start/hour_end stockés en "HH:MM" (UTC ou local — local ici, FR)
-- ────────────────────────────────────────────────────────────
create table if not exists public.coach_recurring_off (
  id            uuid primary key default gen_random_uuid(),
  day_of_week   smallint not null check (day_of_week between 0 and 6),
  hour_start    time not null,
  hour_end      time not null,
  label         text,
  created_at    timestamptz not null default now(),
  check (hour_end > hour_start)
);

create index if not exists idx_coach_recurring_off_day
  on public.coach_recurring_off (day_of_week);

-- ────────────────────────────────────────────────────────────
-- RLS — lecture publique (le form /candidature anon doit pouvoir lire),
-- écriture restreinte au coach via service role / authenticated.
-- ────────────────────────────────────────────────────────────
alter table public.coach_off_periods enable row level security;
alter table public.coach_recurring_off enable row level security;

-- Lecture publique anon + auth
create policy coach_off_periods_select_all
  on public.coach_off_periods for select
  using (true);

create policy coach_recurring_off_select_all
  on public.coach_recurring_off for select
  using (true);

-- Écriture : authenticated only (la PWA fitcoach utilise une session coach)
create policy coach_off_periods_insert_auth
  on public.coach_off_periods for insert
  to authenticated
  with check (true);

create policy coach_off_periods_update_auth
  on public.coach_off_periods for update
  to authenticated
  using (true)
  with check (true);

create policy coach_off_periods_delete_auth
  on public.coach_off_periods for delete
  to authenticated
  using (true);

create policy coach_recurring_off_insert_auth
  on public.coach_recurring_off for insert
  to authenticated
  with check (true);

create policy coach_recurring_off_update_auth
  on public.coach_recurring_off for update
  to authenticated
  using (true)
  with check (true);

create policy coach_recurring_off_delete_auth
  on public.coach_recurring_off for delete
  to authenticated
  using (true);

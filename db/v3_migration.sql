-- KIS v3 migration. Idempotent — safe to run on a v2 DB or a fresh one.
-- Renames profiles → user_preferences and introduces the athletes / memberships
-- / invite_codes model. Existing impact_logs are backfilled with athlete_id.

-- ---------------------------------------------------------------
-- 1. New tables
-- ---------------------------------------------------------------

create table if not exists public.athletes (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  sport text not null,
  weight_class text,
  baseline_threshold numeric not null default 1000,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint athletes_sport_check
    check (sport in ('combat_sports', 'american_football'))
);

create table if not exists public.memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  athlete_id uuid not null references public.athletes(id) on delete cascade,
  role text not null,
  created_at timestamptz not null default now(),
  unique (user_id, athlete_id),
  constraint memberships_role_check check (role in ('owner', 'coach'))
);

create index if not exists memberships_user_id_idx
  on public.memberships(user_id);
create index if not exists memberships_athlete_id_idx
  on public.memberships(athlete_id);

create table if not exists public.invite_codes (
  code text primary key,
  athlete_id uuid not null references public.athletes(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null,
  used_at timestamptz,
  used_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists invite_codes_athlete_idx
  on public.invite_codes(athlete_id);

-- ---------------------------------------------------------------
-- 2. Extend impact_logs
-- ---------------------------------------------------------------

alter table public.impact_logs
  add column if not exists athlete_id uuid references public.athletes(id) on delete cascade;
alter table public.impact_logs
  add column if not exists impact_type text;
alter table public.impact_logs
  add column if not exists author_role text default 'self';
alter table public.impact_logs
  add column if not exists observer_notes text;

do $$
begin
  begin
    alter table public.impact_logs add constraint impact_logs_impact_type_check
      check (impact_type is null or impact_type in ('linear', 'rotational'));
  exception when duplicate_object then null;
  end;
  begin
    alter table public.impact_logs add constraint impact_logs_author_role_check
      check (author_role in ('self', 'third_party'));
  exception when duplicate_object then null;
  end;
end $$;

create index if not exists impact_logs_athlete_id_idx
  on public.impact_logs(athlete_id, created_at desc);

-- ---------------------------------------------------------------
-- 3. Backfill: for each existing user with a v2 profile row, create
--    one athlete + owner membership. Then attach their impact_logs.
-- ---------------------------------------------------------------

do $$
declare
  rec record;
  new_athlete_id uuid;
begin
  -- Only backfill if the legacy 'profiles' table is still present
  -- (i.e. this migration is running against a v2 DB).
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'profiles'
  ) then
    for rec in (
      select p.user_id, u.email, p.sport, p.weight_class
      from public.profiles p
      join auth.users u on u.id = p.user_id
      where not exists (
        select 1 from public.memberships m
        where m.user_id = p.user_id and m.role = 'owner'
      )
    ) loop
      insert into public.athletes (full_name, sport, weight_class, baseline_threshold)
      values (
        coalesce(split_part(rec.email, '@', 1), 'Athlete'),
        coalesce(rec.sport, 'combat_sports'),
        rec.weight_class,
        1000
      )
      returning id into new_athlete_id;

      insert into public.memberships (user_id, athlete_id, role)
      values (rec.user_id, new_athlete_id, 'owner');
    end loop;
  end if;
end $$;

-- Attach existing logs to their owner's athlete.
update public.impact_logs il
set athlete_id = m.athlete_id
from public.memberships m
where m.user_id = il.user_id
  and m.role = 'owner'
  and il.athlete_id is null;

-- ---------------------------------------------------------------
-- 4. Rename profiles → user_preferences and shed migrated columns.
--    Old policies will be dropped (we'll create fresh ones below).
-- ---------------------------------------------------------------

do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'profiles'
  ) then
    alter table public.profiles rename to user_preferences;
  end if;
end $$;

-- Migrated columns now live on `athletes`. Drop from user_preferences.
alter table public.user_preferences drop column if exists sport;
alter table public.user_preferences drop column if exists sub_type;
alter table public.user_preferences drop column if exists weight_class;

-- Placeholder columns for future UI prefs.
alter table public.user_preferences add column if not exists theme text;

-- ---------------------------------------------------------------
-- 5. Touch-updated_at trigger for athletes
-- ---------------------------------------------------------------

create or replace function public.touch_athletes_updated_at()
returns trigger language plpgsql as $fn$
begin
  new.updated_at = now();
  return new;
end;
$fn$;

drop trigger if exists athletes_touch_updated_at on public.athletes;
create trigger athletes_touch_updated_at
  before update on public.athletes
  for each row execute function public.touch_athletes_updated_at();

-- ---------------------------------------------------------------
-- 6. RLS
-- ---------------------------------------------------------------

alter table public.athletes enable row level security;
alter table public.memberships enable row level security;
alter table public.invite_codes enable row level security;
alter table public.user_preferences enable row level security;
alter table public.impact_logs enable row level security;

-- user_preferences policies (old names from v2 may still exist; drop both old and v3 names)
drop policy if exists "select_own_profile" on public.user_preferences;
drop policy if exists "insert_own_profile" on public.user_preferences;
drop policy if exists "update_own_profile" on public.user_preferences;
drop policy if exists "select_own_prefs" on public.user_preferences;
drop policy if exists "insert_own_prefs" on public.user_preferences;
drop policy if exists "update_own_prefs" on public.user_preferences;

create policy "select_own_prefs" on public.user_preferences
  for select using (auth.uid() = user_id);
create policy "insert_own_prefs" on public.user_preferences
  for insert with check (auth.uid() = user_id);
create policy "update_own_prefs" on public.user_preferences
  for update using (auth.uid() = user_id);

-- athletes: visible to any member; only owner can update.
drop policy if exists "select_athletes_with_membership" on public.athletes;
drop policy if exists "insert_own_athlete" on public.athletes;
drop policy if exists "update_athlete_owner" on public.athletes;

create policy "select_athletes_with_membership" on public.athletes
  for select using (
    exists (
      select 1 from public.memberships m
      where m.athlete_id = athletes.id and m.user_id = auth.uid()
    )
  );

-- Allow any authenticated user to create an athlete; the owner-membership
-- insert that follows is what links them to it.
create policy "insert_athlete_authenticated" on public.athletes
  for insert with check (auth.uid() is not null);

create policy "update_athlete_owner" on public.athletes
  for update using (
    exists (
      select 1 from public.memberships m
      where m.athlete_id = athletes.id
        and m.user_id = auth.uid()
        and m.role = 'owner'
    )
  );

-- memberships: see your own; insert yourself as owner only. Coach memberships
-- are created through consume_invite_code() (SECURITY DEFINER).
drop policy if exists "select_own_membership" on public.memberships;
drop policy if exists "insert_own_membership_owner" on public.memberships;

create policy "select_own_membership" on public.memberships
  for select using (user_id = auth.uid());

create policy "insert_own_membership_owner" on public.memberships
  for insert with check (user_id = auth.uid() and role = 'owner');

-- invite_codes: owner-only visibility and creation for their athlete.
drop policy if exists "select_own_invite_codes" on public.invite_codes;
drop policy if exists "insert_invite_code_owner" on public.invite_codes;
drop policy if exists "delete_invite_code_owner" on public.invite_codes;

create policy "select_own_invite_codes" on public.invite_codes
  for select using (
    exists (
      select 1 from public.memberships m
      where m.athlete_id = invite_codes.athlete_id
        and m.user_id = auth.uid()
        and m.role = 'owner'
    )
  );

create policy "insert_invite_code_owner" on public.invite_codes
  for insert with check (
    created_by = auth.uid()
    and exists (
      select 1 from public.memberships m
      where m.athlete_id = invite_codes.athlete_id
        and m.user_id = auth.uid()
        and m.role = 'owner'
    )
  );

create policy "delete_invite_code_owner" on public.invite_codes
  for delete using (
    exists (
      select 1 from public.memberships m
      where m.athlete_id = invite_codes.athlete_id
        and m.user_id = auth.uid()
        and m.role = 'owner'
    )
  );

-- impact_logs: drop v2 user_id-keyed policies, rebuild around memberships.
drop policy if exists "select_own_logs" on public.impact_logs;
drop policy if exists "insert_own_logs" on public.impact_logs;
drop policy if exists "update_own_logs" on public.impact_logs;
drop policy if exists "delete_own_logs" on public.impact_logs;
drop policy if exists "select_athlete_logs" on public.impact_logs;
drop policy if exists "insert_athlete_logs_owner" on public.impact_logs;
drop policy if exists "delete_athlete_logs_owner" on public.impact_logs;

create policy "select_athlete_logs" on public.impact_logs
  for select using (
    exists (
      select 1 from public.memberships m
      where m.athlete_id = impact_logs.athlete_id
        and m.user_id = auth.uid()
    )
  );

-- Tier 1: only owners may insert logs. Tier 2 will broaden to coaches with
-- author_role='third_party'.
create policy "insert_athlete_logs_owner" on public.impact_logs
  for insert with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.memberships m
      where m.athlete_id = impact_logs.athlete_id
        and m.user_id = auth.uid()
        and m.role = 'owner'
    )
  );

create policy "delete_athlete_logs_owner" on public.impact_logs
  for delete using (
    exists (
      select 1 from public.memberships m
      where m.athlete_id = impact_logs.athlete_id
        and m.user_id = auth.uid()
        and m.role = 'owner'
    )
  );

-- ---------------------------------------------------------------
-- 7. consume_invite_code(code) — creates a coach membership atomically.
--    SECURITY DEFINER so the caller doesn't need a broad insert policy.
-- ---------------------------------------------------------------

create or replace function public.consume_invite_code(code_input text)
returns uuid
language plpgsql
security definer
set search_path = public
as $fn$
declare
  invite record;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select * into invite from public.invite_codes
    where code = code_input
      and used_at is null
      and expires_at > now()
    for update;

  if not found then
    raise exception 'Invalid or expired invite code';
  end if;

  if exists (
    select 1 from public.memberships
    where user_id = auth.uid() and athlete_id = invite.athlete_id
  ) then
    raise exception 'You are already linked to this athlete';
  end if;

  insert into public.memberships (user_id, athlete_id, role)
  values (auth.uid(), invite.athlete_id, 'coach');

  update public.invite_codes
    set used_at = now(), used_by = auth.uid()
    where code = code_input;

  return invite.athlete_id;
end $fn$;

grant execute on function public.consume_invite_code(text) to authenticated;

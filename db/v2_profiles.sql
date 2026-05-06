-- KIS v2: athlete profile. Run in Supabase SQL editor after v1's schema.sql.
-- One row per user. RLS scopes reads/writes to the owner.

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  sport text not null,
  sub_type text not null,
  weight_class text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_sport_check
    check (sport in ('combat_sports', 'american_football')),
  constraint profiles_sub_type_check
    check (sub_type in ('sparring', 'competition', 'drills', 'lineman_work', 'skill_position'))
);

alter table public.profiles enable row level security;

drop policy if exists "select_own_profile" on public.profiles;
create policy "select_own_profile"
  on public.profiles for select
  using (auth.uid() = user_id);

drop policy if exists "insert_own_profile" on public.profiles;
create policy "insert_own_profile"
  on public.profiles for insert
  with check (auth.uid() = user_id);

drop policy if exists "update_own_profile" on public.profiles;
create policy "update_own_profile"
  on public.profiles for update
  using (auth.uid() = user_id);

-- Touch updated_at on update.
create or replace function public.touch_profiles_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_profiles_updated_at();

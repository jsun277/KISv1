-- KIS v1 schema. Run in Supabase SQL editor.

create table if not exists public.impact_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tags jsonb not null,
  raw_text text,
  analysis jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists impact_logs_user_id_created_at_idx
  on public.impact_logs (user_id, created_at desc);

alter table public.impact_logs enable row level security;

drop policy if exists "select_own_logs" on public.impact_logs;
create policy "select_own_logs"
  on public.impact_logs for select
  using (auth.uid() = user_id);

drop policy if exists "insert_own_logs" on public.impact_logs;
create policy "insert_own_logs"
  on public.impact_logs for insert
  with check (auth.uid() = user_id);

drop policy if exists "update_own_logs" on public.impact_logs;
create policy "update_own_logs"
  on public.impact_logs for update
  using (auth.uid() = user_id);

drop policy if exists "delete_own_logs" on public.impact_logs;
create policy "delete_own_logs"
  on public.impact_logs for delete
  using (auth.uid() = user_id);

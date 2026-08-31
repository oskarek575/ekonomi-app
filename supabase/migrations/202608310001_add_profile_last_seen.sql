alter table if exists public.profile
  add column if not exists last_seen_at timestamptz;

create index if not exists profile_last_seen_idx
  on public.profile (last_seen_at desc);

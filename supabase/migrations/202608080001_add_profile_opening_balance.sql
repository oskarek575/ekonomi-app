alter table if exists public.profile
  add column if not exists opening_balance numeric not null default 0;

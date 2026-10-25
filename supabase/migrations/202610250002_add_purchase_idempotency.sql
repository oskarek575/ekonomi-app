alter table public.kop
  add column if not exists idempotency_key text;

create unique index if not exists kop_user_id_idempotency_key_unique
  on public.kop (user_id, idempotency_key);

comment on column public.kop.idempotency_key is
  'Optional retry-safe key used when one logical purchase must only be created once.';

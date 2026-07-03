alter table public.kop
add column if not exists source text not null default 'budget'
check (source in ('budget', 'free'));

update public.kop
set source = case
  when kategori = 'Fria köp' then 'free'
  else 'budget'
end;

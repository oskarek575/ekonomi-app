alter table if exists public.budgets enable row level security;
alter table if exists public.kop enable row level security;
alter table if exists public.categories enable row level security;
alter table if exists public.subscriptions enable row level security;
alter table if exists public.goals enable row level security;
alter table if exists public.savings_accounts enable row level security;
alter table if exists public.profile enable row level security;
alter table if exists public.travel_budgets enable row level security;
alter table if exists public.travel_purchases enable row level security;

create index if not exists budgets_user_id_idx on public.budgets (user_id);
create index if not exists kop_user_created_idx on public.kop (user_id, created_at desc);
create index if not exists categories_user_name_idx on public.categories (user_id, lower(name));
create index if not exists subscriptions_user_day_idx on public.subscriptions (user_id, day_of_month);
create index if not exists goals_user_created_idx on public.goals (user_id, created_at);
create index if not exists savings_accounts_user_id_idx on public.savings_accounts (user_id);
create index if not exists profile_user_id_idx on public.profile (user_id);
create index if not exists travel_budgets_user_id_idx on public.travel_budgets (user_id);
create index if not exists travel_purchases_user_id_idx on public.travel_purchases (user_id);

drop policy if exists "Users can insert their own travel purchases" on public.travel_purchases;
drop policy if exists "Users can update their own travel purchases" on public.travel_purchases;

create policy "Users can insert their own travel purchases" on public.travel_purchases for insert with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.travel_budgets
    where travel_budgets.id = travel_purchases.travel_budget_id
      and travel_budgets.user_id = auth.uid()
  )
);

create policy "Users can update their own travel purchases" on public.travel_purchases for update using (auth.uid() = user_id) with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.travel_budgets
    where travel_budgets.id = travel_purchases.travel_budget_id
      and travel_budgets.user_id = auth.uid()
  )
);

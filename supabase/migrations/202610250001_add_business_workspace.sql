create extension if not exists pgcrypto;

create table if not exists public.business_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  name text not null,
  company_form text not null,
  business_start date,
  fiscal_year_start_month smallint not null default 1,
  vat_registered boolean not null default true,
  vat_period text not null default 'quarterly',
  accounting_method text not null default 'cash',
  licensed_healthcare_profile boolean not null default false,
  bank_balance_ore bigint,
  balance_date date,
  opening_receivables_ore bigint not null default 0,
  opening_payables_ore bigint not null default 0,
  prior_year_revenue_ore bigint not null default 0,
  prior_year_costs_ore bigint not null default 0,
  paid_tax_ore bigint not null default 0,
  birth_year smallint,
  municipality text,
  tax_table smallint,
  tax_column smallint,
  other_annual_income_ore bigint not null default 0,
  withheld_tax_ore bigint not null default 0,
  desired_private_monthly_ore bigint not null default 0,
  buffer_ore bigint not null default 0,
  buffer_months numeric(5,2) not null default 0,
  pension_ore bigint not null default 0,
  weeks_off smallint not null default 0,
  manual_annual_income_tax_ore bigint,
  manual_verified_tax_debt_ore bigint,
  manual_tax_adjustment_ore bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  constraint business_profiles_name_check check (length(trim(name)) between 1 and 100),
  constraint business_profiles_company_form_check check (company_form in ('sole_trader', 'limited_company')),
  constraint business_profiles_fiscal_month_check check (fiscal_year_start_month between 1 and 12),
  constraint business_profiles_vat_period_check check (vat_period in ('monthly', 'quarterly', 'yearly')),
  constraint business_profiles_accounting_method_check check (accounting_method in ('cash', 'invoice')),
  constraint business_profiles_nonnegative_check check (
    opening_receivables_ore >= 0 and opening_payables_ore >= 0 and paid_tax_ore >= 0
    and desired_private_monthly_ore >= 0 and buffer_ore >= 0 and buffer_months >= 0
    and pension_ore >= 0 and weeks_off between 0 and 52
  )
);

create table if not exists public.business_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  profile_id uuid not null,
  occurred_on date not null,
  kind text not null,
  category text not null,
  description text not null default '',
  vat_treatment text,
  vat_rate_basis_points smallint not null default 0,
  amount_entry text not null default 'inclusive',
  entered_amount_ore bigint not null,
  net_amount_ore bigint not null,
  vat_amount_ore bigint not null default 0,
  gross_amount_ore bigint not null,
  deductible_vat_ore bigint not null default 0,
  income_tax_deductible_ore bigint not null default 0,
  payment_status text not null default 'paid',
  paid_amount_ore bigint not null default 0,
  due_date date,
  paid_on date,
  purchase_vat_scope text,
  vat_deduction_percent numeric(5,2) not null default 0,
  allocation_basis text,
  recurring_cost_id uuid,
  linked_private_purchase_id bigint,
  rule_year smallint not null default 2026,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_transactions_profile_owner_fkey foreign key (profile_id, user_id)
    references public.business_profiles(id, user_id) on delete cascade,
  constraint business_transactions_kind_check check (kind in (
    'sale','expense','investment','interest','loan_received','loan_repayment',
    'owner_deposit','owner_withdrawal','tax_payment','salary_payment'
  )),
  constraint business_transactions_vat_treatment_check check (vat_treatment is null or vat_treatment in ('healthcare_exempt','taxable')),
  constraint business_transactions_vat_rate_check check (vat_rate_basis_points in (0,600,1200,2500)),
  constraint business_transactions_amount_entry_check check (amount_entry in ('inclusive','exclusive')),
  constraint business_transactions_payment_status_check check (payment_status in ('paid','unpaid','partial')),
  constraint business_transactions_purchase_scope_check check (purchase_vat_scope is null or purchase_vat_scope in ('taxable','exempt','mixed')),
  constraint business_transactions_amounts_check check (
    entered_amount_ore >= 0 and net_amount_ore >= 0 and vat_amount_ore >= 0
    and gross_amount_ore >= 0 and deductible_vat_ore >= 0 and income_tax_deductible_ore >= 0
    and paid_amount_ore >= 0 and vat_deduction_percent between 0 and 100
  )
);

create table if not exists public.business_service_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  profile_id uuid not null,
  name text not null,
  category text not null,
  default_amount_ore bigint not null default 0,
  vat_treatment text not null,
  vat_rate_basis_points smallint not null default 0,
  amount_entry text not null default 'inclusive',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_service_templates_profile_owner_fkey foreign key (profile_id, user_id)
    references public.business_profiles(id, user_id) on delete cascade,
  constraint business_service_templates_vat_treatment_check check (vat_treatment in ('healthcare_exempt','taxable')),
  constraint business_service_templates_vat_rate_check check (vat_rate_basis_points in (0,600,1200,2500)),
  constraint business_service_templates_amount_entry_check check (amount_entry in ('inclusive','exclusive'))
);

create table if not exists public.business_recurring_costs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  profile_id uuid not null,
  name text not null,
  category text not null,
  amount_ore bigint not null default 0,
  frequency_months smallint not null default 1,
  next_due_date date not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_recurring_costs_profile_owner_fkey foreign key (profile_id, user_id)
    references public.business_profiles(id, user_id) on delete cascade,
  constraint business_recurring_costs_values_check check (amount_ore >= 0 and frequency_months between 1 and 60)
);

create table if not exists public.business_scenarios (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  profile_id uuid not null,
  name text not null,
  assumptions jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_scenarios_profile_owner_fkey foreign key (profile_id, user_id)
    references public.business_profiles(id, user_id) on delete cascade
);

create index if not exists business_profiles_user_idx on public.business_profiles(user_id, created_at desc);
create index if not exists business_transactions_profile_date_idx on public.business_transactions(user_id, profile_id, occurred_on desc);
create index if not exists business_transactions_due_idx on public.business_transactions(user_id, profile_id, due_date) where payment_status <> 'paid';
create index if not exists business_service_templates_profile_idx on public.business_service_templates(user_id, profile_id);
create index if not exists business_recurring_costs_profile_idx on public.business_recurring_costs(user_id, profile_id, next_due_date);
create index if not exists business_scenarios_profile_idx on public.business_scenarios(user_id, profile_id);

alter table public.business_profiles enable row level security;
alter table public.business_transactions enable row level security;
alter table public.business_service_templates enable row level security;
alter table public.business_recurring_costs enable row level security;
alter table public.business_scenarios enable row level security;

do $$
declare table_name text;
begin
  foreach table_name in array array['business_profiles','business_transactions','business_service_templates','business_recurring_costs','business_scenarios'] loop
    execute format('drop policy if exists "Users manage own %1$s" on public.%1$I', table_name);
    execute format(
      'create policy "Users manage own %1$s" on public.%1$I for all using (auth.uid() = user_id) with check (auth.uid() = user_id)',
      table_name
    );
  end loop;
end $$;

create or replace function public.touch_business_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare table_name text;
begin
  foreach table_name in array array['business_profiles','business_transactions','business_service_templates','business_recurring_costs','business_scenarios'] loop
    execute format('drop trigger if exists touch_updated_at on public.%I', table_name);
    execute format('create trigger touch_updated_at before update on public.%I for each row execute function public.touch_business_updated_at()', table_name);
  end loop;
end $$;

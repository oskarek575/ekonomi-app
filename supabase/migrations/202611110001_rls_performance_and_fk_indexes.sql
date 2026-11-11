-- 1) RLS-prestanda: utvärdera auth.uid() en gång per fråga istället för per rad.
--    Samma regler som innan, bara snabbare. Se Supabase-lint 0003_auth_rls_initplan.
do $$
declare
  p record;
  new_qual text;
  new_check text;
  stmt text;
begin
  for p in
    select schemaname, tablename, policyname, qual, with_check
    from pg_policies
    where schemaname = 'public'
      and (qual like '%auth.uid()%' or with_check like '%auth.uid()%')
  loop
    new_qual := replace(replace(p.qual, '( SELECT auth.uid() AS uid)', 'auth.uid()'), 'auth.uid()', '(select auth.uid())');
    new_check := replace(replace(p.with_check, '( SELECT auth.uid() AS uid)', 'auth.uid()'), 'auth.uid()', '(select auth.uid())');
    stmt := format('alter policy %I on %I.%I', p.policyname, p.schemaname, p.tablename);
    if new_qual is not null then
      stmt := stmt || format(' using (%s)', new_qual);
    end if;
    if new_check is not null then
      stmt := stmt || format(' with check (%s)', new_check);
    end if;
    execute stmt;
  end loop;
end $$;

-- 2) Index för främmande nycklar i företagsdelen.
create index if not exists business_recurring_costs_profile_owner_idx on public.business_recurring_costs (profile_id, user_id);
create index if not exists business_scenarios_profile_owner_idx on public.business_scenarios (profile_id, user_id);
create index if not exists business_service_templates_profile_owner_idx on public.business_service_templates (profile_id, user_id);
create index if not exists business_transactions_profile_owner_idx on public.business_transactions (profile_id, user_id);

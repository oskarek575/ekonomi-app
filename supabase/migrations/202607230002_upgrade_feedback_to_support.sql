alter table if exists public.feedback
  drop constraint if exists feedback_type_check;

alter table if exists public.feedback
  add constraint feedback_type_check check (type in ('bug', 'idea', 'question', 'other'));

drop policy if exists "Admins can select all feedback" on public.feedback;
drop policy if exists "Admins can update all feedback" on public.feedback;

create policy "Admins can select all feedback" on public.feedback for select using (
  lower(auth.jwt() ->> 'email') in ('oskarek575@gmail.com', 'oskarcool1337@gmail.com')
);

create policy "Admins can update all feedback" on public.feedback for update using (
  lower(auth.jwt() ->> 'email') in ('oskarek575@gmail.com', 'oskarcool1337@gmail.com')
) with check (
  lower(auth.jwt() ->> 'email') in ('oskarek575@gmail.com', 'oskarcool1337@gmail.com')
);

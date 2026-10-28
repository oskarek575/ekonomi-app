-- The habit tracker was removed from the product. Drop only its dedicated
-- tables, in foreign-key order, and intentionally avoid CASCADE so unexpected
-- dependencies cannot be removed silently.
drop table if exists public.habit_checks;
drop table if exists public.habit_pauses;
drop table if exists public.journal_entries;
drop table if exists public.habits;

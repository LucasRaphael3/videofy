-- Videofy: accounts, plans and the Founder waitlist.
-- Run once in Supabase: Dashboard > SQL Editor > New query > paste > Run.

-- 1. One profile per account. The plan is changed only by you (dashboard)
--    or by the payment webhook with the service role key, never by the browser.
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  plan text not null default 'free' check (plan in ('free', 'creator', 'agency', 'founder')),
  plan_expires_at timestamptz,          -- null = no expiry (founder, or managed by webhook)
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "read own profile" on public.profiles;
create policy "read own profile" on public.profiles
  for select using (auth.uid() = id);
-- No insert/update/delete policy: the browser cannot change its own plan.

-- Create the profile when someone signs up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 2. Founder waitlist from the landing page. Anyone can add an e-mail; nobody can read the list from the browser.
create table if not exists public.waitlist (
  id bigint generated always as identity primary key,
  email text not null unique check (email ~* '^[^\s@]+@[^\s@]+\.[^\s@]+$'),
  weekly_cuts text check (weekly_cuts in ('ate-10', '10-50', '50-200', '200+')),
  source text check (char_length(source) <= 64),
  created_at timestamptz not null default now()
);

alter table public.waitlist enable row level security;

drop policy if exists "anyone can join" on public.waitlist;
create policy "anyone can join" on public.waitlist
  for insert to anon, authenticated with check (true);

-- To give someone a plan by hand while the webhook does not exist yet:
--   update public.profiles set plan = 'creator', plan_expires_at = now() + interval '1 month'
--   where email = 'cliente@exemplo.com';

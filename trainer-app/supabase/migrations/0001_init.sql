-- Trainer profiles, one row per auth.users entry.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'trainer' check (role in ('trainer', 'client')),
  full_name text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles: read own" on public.profiles
  for select using (auth.uid() = id);

create policy "profiles: update own" on public.profiles
  for update using (auth.uid() = id);

create policy "profiles: insert own" on public.profiles
  for insert with check (auth.uid() = id);

-- Auto-create a profile row whenever a new auth user signs up.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- App event log: every client-side action lands here for later analytics.
create table public.events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  event_name text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index events_user_id_created_at_idx on public.events (user_id, created_at desc);
create index events_event_name_idx on public.events (event_name);

alter table public.events enable row level security;

create policy "events: insert own" on public.events
  for insert with check (auth.uid() = user_id);

create policy "events: read own" on public.events
  for select using (auth.uid() = user_id);

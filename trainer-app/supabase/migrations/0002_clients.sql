-- Athletes/clients managed by a trainer.
create table public.clients (
  id bigint generated always as identity primary key,
  trainer_id uuid not null references auth.users (id) on delete cascade,
  full_name text not null,
  gender text not null check (gender in ('male', 'female')),
  age smallint not null check (age > 0 and age < 120),
  height_cm smallint not null check (height_cm > 0 and height_cm < 260),
  weight_kg numeric(5, 1) not null check (weight_kg > 0 and weight_kg < 400),
  created_at timestamptz not null default now()
);

create index clients_trainer_id_created_at_idx on public.clients (trainer_id, created_at desc);

alter table public.clients enable row level security;

create policy "clients: read own" on public.clients
  for select using (auth.uid() = trainer_id);

create policy "clients: insert own" on public.clients
  for insert with check (auth.uid() = trainer_id);

create policy "clients: update own" on public.clients
  for update using (auth.uid() = trainer_id);

create policy "clients: delete own" on public.clients
  for delete using (auth.uid() = trainer_id);

-- Exercise library, owned per-trainer.
create table public.exercises (
  id bigint generated always as identity primary key,
  trainer_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create unique index exercises_trainer_id_name_idx on public.exercises (trainer_id, lower(name));

alter table public.exercises enable row level security;

create policy "exercises: read own" on public.exercises
  for select using (auth.uid() = trainer_id);

create policy "exercises: insert own" on public.exercises
  for insert with check (auth.uid() = trainer_id);

create policy "exercises: update own" on public.exercises
  for update using (auth.uid() = trainer_id);

create policy "exercises: delete own" on public.exercises
  for delete using (auth.uid() = trainer_id);

-- A single training session for one client.
create table public.workouts (
  id bigint generated always as identity primary key,
  trainer_id uuid not null references auth.users (id) on delete cascade,
  client_id bigint not null references public.clients (id) on delete cascade,
  workout_date date not null default current_date,
  status text not null default 'planned' check (status in ('planned', 'done')),
  notes text,
  created_at timestamptz not null default now()
);

create index workouts_client_id_date_idx on public.workouts (client_id, workout_date desc);

alter table public.workouts enable row level security;

create policy "workouts: read own" on public.workouts
  for select using (auth.uid() = trainer_id);

create policy "workouts: insert own" on public.workouts
  for insert with check (auth.uid() = trainer_id);

create policy "workouts: update own" on public.workouts
  for update using (auth.uid() = trainer_id);

create policy "workouts: delete own" on public.workouts
  for delete using (auth.uid() = trainer_id);

-- One exercise slot within a workout, ordered.
create table public.workout_exercises (
  id bigint generated always as identity primary key,
  workout_id bigint not null references public.workouts (id) on delete cascade,
  exercise_id bigint not null references public.exercises (id) on delete restrict,
  position smallint not null default 0
);

create index workout_exercises_workout_id_position_idx
  on public.workout_exercises (workout_id, position);

alter table public.workout_exercises enable row level security;

create policy "workout_exercises: read via workout" on public.workout_exercises
  for select using (
    exists (
      select 1 from public.workouts w
      where w.id = workout_id and w.trainer_id = auth.uid()
    )
  );

create policy "workout_exercises: insert via workout" on public.workout_exercises
  for insert with check (
    exists (
      select 1 from public.workouts w
      where w.id = workout_id and w.trainer_id = auth.uid()
    )
  );

create policy "workout_exercises: update via workout" on public.workout_exercises
  for update using (
    exists (
      select 1 from public.workouts w
      where w.id = workout_id and w.trainer_id = auth.uid()
    )
  );

create policy "workout_exercises: delete via workout" on public.workout_exercises
  for delete using (
    exists (
      select 1 from public.workouts w
      where w.id = workout_id and w.trainer_id = auth.uid()
    )
  );

-- A planned or completed set within an exercise slot.
create table public.workout_sets (
  id bigint generated always as identity primary key,
  workout_exercise_id bigint not null references public.workout_exercises (id) on delete cascade,
  position smallint not null default 0,
  plan_weight_kg numeric(6, 2),
  plan_reps smallint,
  fact_weight_kg numeric(6, 2),
  fact_reps smallint
);

create index workout_sets_workout_exercise_id_position_idx
  on public.workout_sets (workout_exercise_id, position);

alter table public.workout_sets enable row level security;

create policy "workout_sets: read via workout" on public.workout_sets
  for select using (
    exists (
      select 1 from public.workout_exercises we
      join public.workouts w on w.id = we.workout_id
      where we.id = workout_exercise_id and w.trainer_id = auth.uid()
    )
  );

create policy "workout_sets: insert via workout" on public.workout_sets
  for insert with check (
    exists (
      select 1 from public.workout_exercises we
      join public.workouts w on w.id = we.workout_id
      where we.id = workout_exercise_id and w.trainer_id = auth.uid()
    )
  );

create policy "workout_sets: update via workout" on public.workout_sets
  for update using (
    exists (
      select 1 from public.workout_exercises we
      join public.workouts w on w.id = we.workout_id
      where we.id = workout_exercise_id and w.trainer_id = auth.uid()
    )
  );

create policy "workout_sets: delete via workout" on public.workout_sets
  for delete using (
    exists (
      select 1 from public.workout_exercises we
      join public.workouts w on w.id = we.workout_id
      where we.id = workout_exercise_id and w.trainer_id = auth.uid()
    )
  );

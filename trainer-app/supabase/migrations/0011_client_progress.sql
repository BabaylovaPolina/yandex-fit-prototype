-- Client progress tracking: weight and body measurements
create table public.client_progress (
  id bigint generated always as identity primary key,
  client_id bigint not null references public.clients (id) on delete cascade,
  recorded_date date not null,
  weight_kg numeric(5, 1),
  chest_cm smallint,
  waist_cm smallint,
  hip_cm smallint,
  notes text,
  created_at timestamptz not null default now(),

  constraint unique_client_date unique (client_id, recorded_date)
);

create index client_progress_client_id_idx on public.client_progress (client_id);
create index client_progress_date_idx on public.client_progress (recorded_date);

alter table public.client_progress enable row level security;

create policy "client_progress: read own" on public.client_progress
  for select using (
    exists (
      select 1 from public.clients
      where id = client_id and trainer_id = auth.uid()
    )
  );

create policy "client_progress: insert own" on public.client_progress
  for insert with check (
    exists (
      select 1 from public.clients
      where id = client_id and trainer_id = auth.uid()
    )
  );

create policy "client_progress: update own" on public.client_progress
  for update using (
    exists (
      select 1 from public.clients
      where id = client_id and trainer_id = auth.uid()
    )
  );

create policy "client_progress: delete own" on public.client_progress
  for delete using (
    exists (
      select 1 from public.clients
      where id = client_id and trainer_id = auth.uid()
    )
  );

-- Custom metrics per client
create table public.client_custom_metrics (
  id bigint generated always as identity primary key,
  client_id bigint not null references public.clients (id) on delete cascade,
  metric_name text not null,
  metric_unit text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),

  constraint unique_client_metric unique (client_id, metric_name)
);

create index custom_metrics_client_id_idx on public.client_custom_metrics (client_id);

alter table public.client_custom_metrics enable row level security;

create policy "custom_metrics: read own" on public.client_custom_metrics
  for select using (
    exists (
      select 1 from public.clients
      where id = client_id and trainer_id = auth.uid()
    )
  );

create policy "custom_metrics: insert own" on public.client_custom_metrics
  for insert with check (
    exists (
      select 1 from public.clients
      where id = client_id and trainer_id = auth.uid()
    )
  );

create policy "custom_metrics: update own" on public.client_custom_metrics
  for update using (
    exists (
      select 1 from public.clients
      where id = client_id and trainer_id = auth.uid()
    )
  );

create policy "custom_metrics: delete own" on public.client_custom_metrics
  for delete using (
    exists (
      select 1 from public.clients
      where id = client_id and trainer_id = auth.uid()
    )
  );

-- Custom metric values
create table public.client_progress_custom (
  id bigint generated always as identity primary key,
  custom_metric_id bigint not null references public.client_custom_metrics (id) on delete cascade,
  recorded_date date not null,
  value numeric(8, 2),
  created_at timestamptz not null default now(),

  constraint unique_metric_date unique (custom_metric_id, recorded_date)
);

create index progress_custom_metric_id_idx on public.client_progress_custom (custom_metric_id);
create index progress_custom_date_idx on public.client_progress_custom (recorded_date);

alter table public.client_progress_custom enable row level security;

create policy "progress_custom: read own" on public.client_progress_custom
  for select using (
    exists (
      select 1 from public.client_custom_metrics ccm
      join public.clients c on ccm.client_id = c.id
      where ccm.id = custom_metric_id and c.trainer_id = auth.uid()
    )
  );

create policy "progress_custom: insert own" on public.client_progress_custom
  for insert with check (
    exists (
      select 1 from public.client_custom_metrics ccm
      join public.clients c on ccm.client_id = c.id
      where ccm.id = custom_metric_id and c.trainer_id = auth.uid()
    )
  );

create policy "progress_custom: update own" on public.client_progress_custom
  for update using (
    exists (
      select 1 from public.client_custom_metrics ccm
      join public.clients c on ccm.client_id = c.id
      where ccm.id = custom_metric_id and c.trainer_id = auth.uid()
    )
  );

create policy "progress_custom: delete own" on public.client_progress_custom
  for delete using (
    exists (
      select 1 from public.client_custom_metrics ccm
      join public.clients c on ccm.client_id = c.id
      where ccm.id = custom_metric_id and c.trainer_id = auth.uid()
    )
  );

#!/usr/bin/env bash
set -e

# ─── Podman machine check ─────────────────────────────────────────────────────
if ! podman machine inspect > /dev/null 2>&1; then
  echo "❌ Podman machine not found. Run: podman machine init --rootful && podman machine start"
  exit 1
fi

if ! podman machine inspect --format '{{.State}}' | grep -q "running"; then
  echo "🦭 Starting Podman machine..."
  podman machine start
fi

# ─── Supabase local DB ────────────────────────────────────────────────────────
echo "🔍 Checking Supabase local status..."

if ! supabase status > /dev/null 2>&1; then
  echo "🚀 Starting local Supabase..."
  supabase start
else
  echo "✅ Supabase already running"
fi

echo "📦 Applying pending migrations..."
supabase migration up --local 2>/dev/null || true

# Гранты не сохраняются между перезапусками в локальном Supabase — применяем каждый раз
echo "🔑 Applying table grants..."
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -q -c "
  grant usage on schema public to anon, authenticated;
  grant select, insert, update, delete on public.profiles to authenticated;
  grant select, insert, update, delete on public.events to anon, authenticated;
  grant select, insert, update, delete on public.clients to authenticated;
  grant select, insert, update, delete on public.workouts to authenticated;
  grant select, insert, update, delete on public.workout_exercises to authenticated;
  grant select, insert, update, delete on public.workout_sets to authenticated;
  grant select, insert, update, delete on public.exercises to authenticated;
  grant usage, select on all sequences in schema public to authenticated;
" && echo "✅ Grants applied"

# ─── Vite dev server ──────────────────────────────────────────────────────────
echo "⚡ Starting Vite..."
npx vite

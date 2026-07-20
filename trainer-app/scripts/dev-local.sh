#!/usr/bin/env bash
set -e

echo "📦 Linking Supabase project..."
doppler run -- sh -c 'supabase link --project-ref $SUPABASE_PROJECT_REF'

echo "📦 Applying pending migrations to remote Supabase..."
doppler run -- sh -c 'supabase db push --password $SUPABASE_DB_PASSWORD'

echo "⚡ Starting Vite..."
doppler run -- vite

# CoachSpace — trainer app (MVP)

Mobile-first web app for trainers. Backend is Supabase (Postgres + Auth) so the
same project can later back a native iOS client without a rewrite — keep
business logic in Postgres/RLS, keep this app as a thin UI layer over the
Supabase client.

## Setup

1. Create a project at [supabase.com](https://supabase.com).
2. In the SQL editor, run `supabase/migrations/0001_init.sql` — it creates:
   - `profiles` (one row per user, auto-created on sign-up)
   - `events` (append-only action log for future analytics)
3. `npm install`
4. Get the Supabase URL and anon key into your shell via Doppler (see below),
   then `npm run dev`.

### Secrets (Doppler)

Env vars (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) are shared through
[Doppler](https://doppler.com) instead of passing `.env` files around.
`npm run dev` runs `doppler run -- vite`, which injects them automatically —
there's no `.env.local` to create or copy.

**One-time, project owner:**
1. Sign up at doppler.com, install the CLI (`brew install dopplerhq/cli/doppler`).
2. `doppler login`
3. `doppler projects create trainer-app`
4. `doppler secrets set VITE_SUPABASE_URL VITE_SUPABASE_ANON_KEY --config dev`
   (paste the values from Supabase Project Settings → API)
5. Invite collaborators to the `trainer-app` project on the Doppler dashboard
   (Project → Access).

**Each collaborator, once:**
1. Install the CLI, `doppler login`.
2. From `trainer-app/`, run `doppler setup` and pick project `trainer-app`,
   config `dev`. This writes a local `doppler.yaml` (gitignored, no secrets in it).
3. `npm run dev` now has the real Supabase credentials injected.

## Structure

- `src/lib/supabase.ts` — Supabase client, reads config from env
- `src/lib/AuthContext.tsx` — session state, exposed via `useAuth()`
- `src/lib/analytics.ts` — `logEvent(name, payload)` writes to the `events` table
- `src/pages/AuthPage.tsx` — email/password sign in & sign up
- `src/pages/HomePage.tsx` — placeholder screen shown after login

Auth is currently email + password. Sign-up currently requires disabling
"Confirm email" in Supabase Auth settings for a friction-free MVP test, or
users need to click the confirmation link from their inbox.

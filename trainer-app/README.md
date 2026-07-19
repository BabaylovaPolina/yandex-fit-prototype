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
3. Copy `.env.example` to `.env.local` and fill in your project's URL and anon key
   (Project Settings → API).
4. `npm install`
5. `npm run dev`

## Structure

- `src/lib/supabase.ts` — Supabase client, reads config from env
- `src/lib/AuthContext.tsx` — session state, exposed via `useAuth()`
- `src/lib/analytics.ts` — `logEvent(name, payload)` writes to the `events` table
- `src/pages/AuthPage.tsx` — email/password sign in & sign up
- `src/pages/HomePage.tsx` — placeholder screen shown after login

Auth is currently email + password. Sign-up currently requires disabling
"Confirm email" in Supabase Auth settings for a friction-free MVP test, or
users need to click the confirmation link from their inbox.

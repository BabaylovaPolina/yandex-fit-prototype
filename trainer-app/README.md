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

Auth supports email + password, and Google sign-in. Sign-up via email
currently requires disabling "Confirm email" in Supabase Auth settings for a
friction-free MVP test, or users need to click the confirmation link from
their inbox.

### Enabling Google sign-in

Google login goes through Supabase's OAuth provider — no extra npm package
needed, `supabase.auth.signInWithOAuth({ provider: 'google' })` handles the
redirect.

1. In [Google Cloud Console](https://console.cloud.google.com/apis/credentials),
   create an OAuth 2.0 Client ID (type: Web application).
2. Add the Supabase callback URL as an authorized redirect URI:
   `https://<your-project-ref>.supabase.co/auth/v1/callback`.
3. In the Supabase dashboard, go to Authentication → Providers → Google,
   enable it, and paste the Client ID and Client Secret from step 1.
4. Add the app's own URLs (e.g. `http://localhost:5173`, and the deployed
   URL) to Authentication → URL Configuration → Redirect URLs, so Supabase
   is allowed to send users back to the app after login.

## iOS build (Capacitor)

The web app is wrapped as a native iOS shell via
[Capacitor](https://capacitorjs.com) — no code fork, the same React app runs
inside a WKWebView. Native project lives in `ios/` (committed, minus build
output/Pods — see `ios/.gitignore`).

1. Install Xcode and CocoaPods (`brew install cocoapods`) if you don't have
   them.
2. `npm install`
3. Make sure `.env.local` has real Supabase credentials — the iOS build
   bakes them in at build time same as the web build, and the app renders
   blank with no error if they're missing.
4. `npm run ios:open` — builds the web app, syncs it into `ios/`, and opens
   the Xcode project. Run from Xcode onto a simulator or device from there.
5. After any change to `src/`, rerun `npm run ios:sync` (or `ios:open`) to
   refresh the native project — Xcode does not rebuild the web bundle on its
   own.

**Known limitation:** Google sign-in does not currently work in the iOS
build. Google blocks OAuth inside embedded WebViews
(`disallowed_useragent`), so `signInWithOAuth` needs to be re-routed through
the system browser (`@capacitor/browser`) with a custom URL scheme
redirect back into the app — not implemented yet. Email/password sign-in
works normally.

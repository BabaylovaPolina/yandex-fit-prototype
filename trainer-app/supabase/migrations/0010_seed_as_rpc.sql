-- Drop the trigger and function that created the profile and seeded exercises
-- on signup. Profile creation and exercise seeding are now done explicitly
-- from the app after sign-up (see AuthPage.tsx).
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();

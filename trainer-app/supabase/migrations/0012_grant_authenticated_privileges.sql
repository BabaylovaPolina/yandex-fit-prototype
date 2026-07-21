-- Explicit table/sequence privileges for the `authenticated` role.
--
-- None of the prior migrations grant these: on Supabase Cloud the platform
-- bootstraps default privileges when a project is created, so this was never
-- visible there. Replaying only this repo's migrations against a fresh
-- database (local dev, CI, disaster recovery) fails with "permission denied"
-- for every table, because RLS policies are evaluated only after the
-- table-level privilege check passes. This migration makes those grants
-- explicit and forward-only, matching AGENTS.md's privilege requirement.
grant usage on schema public to authenticated;

grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;

alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public
  grant usage, select on sequences to authenticated;

alter table public.profiles
  add column first_name text,
  add column last_name text;

update public.profiles set first_name = full_name where first_name is null;

alter table public.exercises
  add column muscle_group text not null default 'other'
    check (muscle_group in ('legs', 'chest', 'back', 'shoulders', 'arms', 'core', 'cardio', 'other'));

-- Seed a starter exercise library for every new trainer, same trigger
-- that creates their profile row.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name');

  insert into public.exercises (trainer_id, name, muscle_group) values
    (new.id, 'Присед со штангой', 'legs'),
    (new.id, 'Жим ногами', 'legs'),
    (new.id, 'Румынская тяга', 'legs'),
    (new.id, 'Выпады', 'legs'),
    (new.id, 'Сгибание ног', 'legs'),
    (new.id, 'Разгибание ног', 'legs'),
    (new.id, 'Жим лёжа', 'chest'),
    (new.id, 'Жим гантелей лёжа', 'chest'),
    (new.id, 'Разводка гантелей', 'chest'),
    (new.id, 'Отжимания', 'chest'),
    (new.id, 'Тяга штанги в наклоне', 'back'),
    (new.id, 'Подтягивания', 'back'),
    (new.id, 'Тяга верхнего блока', 'back'),
    (new.id, 'Тяга нижнего блока', 'back'),
    (new.id, 'Становая тяга', 'back'),
    (new.id, 'Жим штанги стоя', 'shoulders'),
    (new.id, 'Жим гантелей сидя', 'shoulders'),
    (new.id, 'Разводка в стороны', 'shoulders'),
    (new.id, 'Тяга к подбородку', 'shoulders'),
    (new.id, 'Сгибание на бицепс', 'arms'),
    (new.id, 'Молоток', 'arms'),
    (new.id, 'Французский жим', 'arms'),
    (new.id, 'Разгибание на трицепс', 'arms'),
    (new.id, 'Планка', 'core'),
    (new.id, 'Скручивания', 'core'),
    (new.id, 'Подъём ног', 'core'),
    (new.id, 'Бег', 'cardio'),
    (new.id, 'Велотренажёр', 'cardio'),
    (new.id, 'Прыжки со скакалкой', 'cardio'),
    (new.id, 'Эллипс', 'cardio');

  return new;
end;
$$;

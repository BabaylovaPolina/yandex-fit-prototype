-- Cardio exercises need duration/distance/reps instead of weight × reps.
alter table public.exercises
  add column input_kind text check (input_kind in ('distance', 'reps'));

alter table public.workout_sets
  add column plan_duration_min numeric(6, 2),
  add column plan_distance_km numeric(6, 2),
  add column fact_duration_min numeric(6, 2),
  add column fact_distance_km numeric(6, 2);

update public.exercises
  set input_kind = 'distance'
  where muscle_group = 'cardio' and name in ('Бег', 'Велотренажёр', 'Эллипс');

update public.exercises
  set input_kind = 'reps'
  where muscle_group = 'cardio' and name = 'Прыжки со скакалкой';

-- Extend the starter seed for every new trainer with more exercises
-- and mark cardio exercises with their input kind.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name');

  insert into public.exercises (trainer_id, name, muscle_group, input_kind) values
    (new.id, 'Присед со штангой', 'legs', null),
    (new.id, 'Фронтальный присед', 'legs', null),
    (new.id, 'Жим ногами', 'legs', null),
    (new.id, 'Румынская тяга', 'legs', null),
    (new.id, 'Становая тяга на прямых ногах', 'legs', null),
    (new.id, 'Выпады', 'legs', null),
    (new.id, 'Болгарский присед', 'legs', null),
    (new.id, 'Сгибание ног', 'legs', null),
    (new.id, 'Разгибание ног', 'legs', null),
    (new.id, 'Подъём на носки', 'legs', null),
    (new.id, 'Гиперэкстензия', 'legs', null),
    (new.id, 'Жим лёжа', 'chest', null),
    (new.id, 'Жим гантелей лёжа', 'chest', null),
    (new.id, 'Жим на наклонной скамье', 'chest', null),
    (new.id, 'Разводка гантелей', 'chest', null),
    (new.id, 'Отжимания', 'chest', null),
    (new.id, 'Отжимания на брусьях', 'chest', null),
    (new.id, 'Сведение в тренажёре (бабочка)', 'chest', null),
    (new.id, 'Тяга штанги в наклоне', 'back', null),
    (new.id, 'Тяга гантели в наклоне', 'back', null),
    (new.id, 'Подтягивания', 'back', null),
    (new.id, 'Тяга верхнего блока', 'back', null),
    (new.id, 'Тяга нижнего блока', 'back', null),
    (new.id, 'Становая тяга', 'back', null),
    (new.id, 'Гудмонинг', 'back', null),
    (new.id, 'Жим штанги стоя', 'shoulders', null),
    (new.id, 'Жим гантелей сидя', 'shoulders', null),
    (new.id, 'Разводка в стороны', 'shoulders', null),
    (new.id, 'Разводка в наклоне (задняя дельта)', 'shoulders', null),
    (new.id, 'Тяга к подбородку', 'shoulders', null),
    (new.id, 'Шраги', 'shoulders', null),
    (new.id, 'Сгибание на бицепс', 'arms', null),
    (new.id, 'Молоток', 'arms', null),
    (new.id, 'Подъём штанги на бицепс', 'arms', null),
    (new.id, 'Французский жим', 'arms', null),
    (new.id, 'Разгибание на трицепс', 'arms', null),
    (new.id, 'Отжимания узким хватом', 'arms', null),
    (new.id, 'Планка', 'core', null),
    (new.id, 'Скручивания', 'core', null),
    (new.id, 'Подъём ног', 'core', null),
    (new.id, 'Русский твист', 'core', null),
    (new.id, 'Боковая планка', 'core', null),
    (new.id, 'Бег', 'cardio', 'distance'),
    (new.id, 'Велотренажёр', 'cardio', 'distance'),
    (new.id, 'Эллипс', 'cardio', 'distance'),
    (new.id, 'Гребной тренажёр', 'cardio', 'distance'),
    (new.id, 'Ходьба', 'cardio', 'distance'),
    (new.id, 'Прыжки со скакалкой', 'cardio', 'reps'),
    (new.id, 'Берпи', 'cardio', 'reps');

  return new;
end;
$$;

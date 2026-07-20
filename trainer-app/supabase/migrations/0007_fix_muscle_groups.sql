-- Existing trainers had every exercise created before the muscle_group
-- column existed default to 'other'. Reclassify the ones we recognize
-- by name, and backfill new exercises from the expanded seed list for
-- trainers who signed up before it was added.

update public.exercises set muscle_group = 'legs' where muscle_group = 'other' and name in (
  'Присед со штангой', 'Фронтальный присед', 'Жим ногами', 'Румынская тяга',
  'Становая тяга на прямых ногах', 'Выпады', 'Болгарский присед',
  'Сгибание ног', 'Разгибание ног', 'Подъём на носки', 'Гиперэкстензия'
);

update public.exercises set muscle_group = 'chest' where muscle_group = 'other' and name in (
  'Жим лёжа', 'Жим гантелей лёжа', 'Жим на наклонной скамье', 'Разводка гантелей',
  'Отжимания', 'Отжимания на брусьях', 'Сведение в тренажёре (бабочка)'
);

update public.exercises set muscle_group = 'back' where muscle_group = 'other' and name in (
  'Тяга штанги в наклоне', 'Тяга гантели в наклоне', 'Подтягивания',
  'Тяга верхнего блока', 'Тяга нижнего блока', 'Становая тяга', 'Гудмонинг'
);

update public.exercises set muscle_group = 'shoulders' where muscle_group = 'other' and name in (
  'Жим штанги стоя', 'Жим гантелей сидя', 'Разводка в стороны',
  'Разводка в наклоне (задняя дельта)', 'Тяга к подбородку', 'Шраги'
);

update public.exercises set muscle_group = 'arms' where muscle_group = 'other' and name in (
  'Сгибание на бицепс', 'Молоток', 'Подъём штанги на бицепс',
  'Французский жим', 'Разгибание на трицепс', 'Отжимания узким хватом'
);

update public.exercises set muscle_group = 'core' where muscle_group = 'other' and name in (
  'Планка', 'Скручивания', 'Подъём ног', 'Русский твист', 'Боковая планка'
);

update public.exercises set muscle_group = 'cardio', input_kind = 'distance'
  where muscle_group = 'other' and name in ('Бег', 'Велотренажёр', 'Эллипс', 'Гребной тренажёр', 'Ходьба');

update public.exercises set muscle_group = 'cardio', input_kind = 'reps'
  where muscle_group = 'other' and name in ('Прыжки со скакалкой', 'Берпи');

-- Backfill the expanded seed list for trainers who already existed
-- before it was added, skipping exercises they already have by name.
insert into public.exercises (trainer_id, name, muscle_group, input_kind)
select t.id, seed.name, seed.muscle_group, seed.input_kind
from auth.users t
cross join (values
  ('Присед со штангой', 'legs', null::text),
  ('Фронтальный присед', 'legs', null),
  ('Жим ногами', 'legs', null),
  ('Румынская тяга', 'legs', null),
  ('Становая тяга на прямых ногах', 'legs', null),
  ('Выпады', 'legs', null),
  ('Болгарский присед', 'legs', null),
  ('Сгибание ног', 'legs', null),
  ('Разгибание ног', 'legs', null),
  ('Подъём на носки', 'legs', null),
  ('Гиперэкстензия', 'legs', null),
  ('Жим лёжа', 'chest', null),
  ('Жим гантелей лёжа', 'chest', null),
  ('Жим на наклонной скамье', 'chest', null),
  ('Разводка гантелей', 'chest', null),
  ('Отжимания', 'chest', null),
  ('Отжимания на брусьях', 'chest', null),
  ('Сведение в тренажёре (бабочка)', 'chest', null),
  ('Тяга штанги в наклоне', 'back', null),
  ('Тяга гантели в наклоне', 'back', null),
  ('Подтягивания', 'back', null),
  ('Тяга верхнего блока', 'back', null),
  ('Тяга нижнего блока', 'back', null),
  ('Становая тяга', 'back', null),
  ('Гудмонинг', 'back', null),
  ('Жим штанги стоя', 'shoulders', null),
  ('Жим гантелей сидя', 'shoulders', null),
  ('Разводка в стороны', 'shoulders', null),
  ('Разводка в наклоне (задняя дельта)', 'shoulders', null),
  ('Тяга к подбородку', 'shoulders', null),
  ('Шраги', 'shoulders', null),
  ('Сгибание на бицепс', 'arms', null),
  ('Молоток', 'arms', null),
  ('Подъём штанги на бицепс', 'arms', null),
  ('Французский жим', 'arms', null),
  ('Разгибание на трицепс', 'arms', null),
  ('Отжимания узким хватом', 'arms', null),
  ('Планка', 'core', null),
  ('Скручивания', 'core', null),
  ('Подъём ног', 'core', null),
  ('Русский твист', 'core', null),
  ('Боковая планка', 'core', null),
  ('Бег', 'cardio', 'distance'),
  ('Велотренажёр', 'cardio', 'distance'),
  ('Эллипс', 'cardio', 'distance'),
  ('Гребной тренажёр', 'cardio', 'distance'),
  ('Ходьба', 'cardio', 'distance'),
  ('Прыжки со скакалкой', 'cardio', 'reps'),
  ('Берпи', 'cardio', 'reps')
) as seed(name, muscle_group, input_kind)
where not exists (
  select 1 from public.exercises e
  where e.trainer_id = t.id and lower(e.name) = lower(seed.name)
);

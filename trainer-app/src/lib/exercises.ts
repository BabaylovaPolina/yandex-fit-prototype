import { supabase } from './supabase'

export type MuscleGroup =
  | 'legs'
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'arms'
  | 'core'
  | 'cardio'
  | 'other'

export const MUSCLE_GROUP_LABELS: Record<MuscleGroup, string> = {
  legs: 'Ноги',
  chest: 'Грудь',
  back: 'Спина',
  shoulders: 'Плечи',
  arms: 'Руки',
  core: 'Кор',
  cardio: 'Кардио',
  other: 'Другое',
}

export const MUSCLE_GROUPS: MuscleGroup[] = [
  'legs',
  'chest',
  'back',
  'shoulders',
  'arms',
  'core',
  'cardio',
]

export type InputKind = 'distance' | 'reps' | null

export const INPUT_KIND_LABELS: Record<NonNullable<InputKind>, string> = {
  distance: 'Время + дистанция',
  reps: 'Время + прыжки',
}

export type Exercise = {
  id: number
  trainer_id: string
  name: string
  muscle_group: MuscleGroup
  input_kind: InputKind
  created_at: string
}

export async function listExercises(): Promise<Exercise[]> {
  const { data, error } = await supabase.from('exercises').select('*').order('name')
  if (error) throw error
  return data
}

export async function createExercise(
  name: string,
  muscleGroup: MuscleGroup,
  inputKind: InputKind = null,
): Promise<Exercise> {
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError) throw userError
  const trainerId = userData.user?.id
  if (!trainerId) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('exercises')
    .insert({
      name: name.trim(),
      muscle_group: muscleGroup,
      input_kind: inputKind,
      trainer_id: trainerId,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

const DEFAULT_EXERCISES: { name: string; muscle_group: MuscleGroup; input_kind: InputKind }[] = [
  { name: 'Присед со штангой',              muscle_group: 'legs',      input_kind: null },
  { name: 'Фронтальный присед',              muscle_group: 'legs',      input_kind: null },
  { name: 'Жим ногами',                      muscle_group: 'legs',      input_kind: null },
  { name: 'Румынская тяга',                  muscle_group: 'legs',      input_kind: null },
  { name: 'Становая тяга на прямых ногах',   muscle_group: 'legs',      input_kind: null },
  { name: 'Выпады',                          muscle_group: 'legs',      input_kind: null },
  { name: 'Болгарский присед',               muscle_group: 'legs',      input_kind: null },
  { name: 'Сгибание ног',                    muscle_group: 'legs',      input_kind: null },
  { name: 'Разгибание ног',                  muscle_group: 'legs',      input_kind: null },
  { name: 'Подъём на носки',                 muscle_group: 'legs',      input_kind: null },
  { name: 'Гиперэкстензия',                  muscle_group: 'legs',      input_kind: null },
  { name: 'Жим лёжа',                        muscle_group: 'chest',     input_kind: null },
  { name: 'Жим гантелей лёжа',               muscle_group: 'chest',     input_kind: null },
  { name: 'Жим на наклонной скамье',         muscle_group: 'chest',     input_kind: null },
  { name: 'Разводка гантелей',               muscle_group: 'chest',     input_kind: null },
  { name: 'Отжимания',                       muscle_group: 'chest',     input_kind: null },
  { name: 'Отжимания на брусьях',            muscle_group: 'chest',     input_kind: null },
  { name: 'Сведение в тренажёре (бабочка)',  muscle_group: 'chest',     input_kind: null },
  { name: 'Тяга штанги в наклоне',           muscle_group: 'back',      input_kind: null },
  { name: 'Тяга гантели в наклоне',          muscle_group: 'back',      input_kind: null },
  { name: 'Подтягивания',                    muscle_group: 'back',      input_kind: null },
  { name: 'Тяга верхнего блока',             muscle_group: 'back',      input_kind: null },
  { name: 'Тяга нижнего блока',              muscle_group: 'back',      input_kind: null },
  { name: 'Становая тяга',                   muscle_group: 'back',      input_kind: null },
  { name: 'Гудмонинг',                       muscle_group: 'back',      input_kind: null },
  { name: 'Жим штанги стоя',                 muscle_group: 'shoulders', input_kind: null },
  { name: 'Жим гантелей сидя',               muscle_group: 'shoulders', input_kind: null },
  { name: 'Разводка в стороны',              muscle_group: 'shoulders', input_kind: null },
  { name: 'Разводка в наклоне (задняя дельта)', muscle_group: 'shoulders', input_kind: null },
  { name: 'Тяга к подбородку',               muscle_group: 'shoulders', input_kind: null },
  { name: 'Шраги',                           muscle_group: 'shoulders', input_kind: null },
  { name: 'Сгибание на бицепс',              muscle_group: 'arms',      input_kind: null },
  { name: 'Молоток',                         muscle_group: 'arms',      input_kind: null },
  { name: 'Подъём штанги на бицепс',         muscle_group: 'arms',      input_kind: null },
  { name: 'Французский жим',                 muscle_group: 'arms',      input_kind: null },
  { name: 'Разгибание на трицепс',           muscle_group: 'arms',      input_kind: null },
  { name: 'Отжимания узким хватом',          muscle_group: 'arms',      input_kind: null },
  { name: 'Планка',                          muscle_group: 'core',      input_kind: null },
  { name: 'Скручивания',                     muscle_group: 'core',      input_kind: null },
  { name: 'Подъём ног',                      muscle_group: 'core',      input_kind: null },
  { name: 'Русский твист',                   muscle_group: 'core',      input_kind: null },
  { name: 'Боковая планка',                  muscle_group: 'core',      input_kind: null },
  { name: 'Бег',                             muscle_group: 'cardio',    input_kind: 'distance' },
  { name: 'Велотренажёр',                    muscle_group: 'cardio',    input_kind: 'distance' },
  { name: 'Эллипс',                          muscle_group: 'cardio',    input_kind: 'distance' },
  { name: 'Гребной тренажёр',                muscle_group: 'cardio',    input_kind: 'distance' },
  { name: 'Ходьба',                          muscle_group: 'cardio',    input_kind: 'distance' },
  { name: 'Прыжки со скакалкой',             muscle_group: 'cardio',    input_kind: 'reps' },
  { name: 'Берпи',                           muscle_group: 'cardio',    input_kind: 'reps' },
]

/**
 * Seeds the default exercise library for the current trainer.
 * Safe to call multiple times — uses upsert with ignoreDuplicates.
 */
export async function seedDefaultExercises(trainerId: string): Promise<void> {
  const rows = DEFAULT_EXERCISES.map((ex) => ({ ...ex, trainer_id: trainerId }))
  // ignoreDuplicates: true → ON CONFLICT DO NOTHING (safe with functional unique index)
  const { error } = await supabase
    .from('exercises')
    .upsert(rows, { ignoreDuplicates: true })
  if (error) throw error
}

export async function findOrCreateExercise(name: string): Promise<Exercise> {
  const trimmed = name.trim()
  const { data: existing, error: findError } = await supabase
    .from('exercises')
    .select('*')
    .ilike('name', trimmed)
    .maybeSingle()

  if (findError) throw findError
  if (existing) return existing

  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError) throw userError
  const trainerId = userData.user?.id
  if (!trainerId) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('exercises')
    .insert({ name: trimmed, trainer_id: trainerId })
    .select()
    .single()

  if (error) throw error
  return data
}

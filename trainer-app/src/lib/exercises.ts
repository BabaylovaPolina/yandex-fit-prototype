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
  'other',
]

export type Exercise = {
  id: number
  trainer_id: string
  name: string
  muscle_group: MuscleGroup
  created_at: string
}

export async function listExercises(): Promise<Exercise[]> {
  const { data, error } = await supabase.from('exercises').select('*').order('name')
  if (error) throw error
  return data
}

export async function createExercise(name: string, muscleGroup: MuscleGroup): Promise<Exercise> {
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError) throw userError
  const trainerId = userData.user?.id
  if (!trainerId) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('exercises')
    .insert({ name: name.trim(), muscle_group: muscleGroup, trainer_id: trainerId })
    .select()
    .single()

  if (error) throw error
  return data
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

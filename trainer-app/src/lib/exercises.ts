import { supabase } from './supabase'

export type Exercise = {
  id: number
  trainer_id: string
  name: string
  created_at: string
}

export async function listExercises(): Promise<Exercise[]> {
  const { data, error } = await supabase.from('exercises').select('*').order('name')
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

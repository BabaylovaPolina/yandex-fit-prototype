import { supabase } from './supabase'

export type Gender = 'male' | 'female'

export type Client = {
  id: number
  trainer_id: string
  full_name: string
  gender: Gender
  age: number
  height_cm: number
  weight_kg: number
  goal: string | null
  note: string | null
  created_at: string
}

export type NewClient = {
  full_name: string
  gender: Gender
  age: number
  height_cm: number
  weight_kg: number
  goal: string | null
  note: string | null
}

export async function listClients(): Promise<Client[]> {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export async function createClientRecord(input: NewClient): Promise<Client> {
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError) throw userError
  const trainerId = userData.user?.id
  if (!trainerId) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('clients')
    .insert({ ...input, trainer_id: trainerId })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateClientRecord(id: number, input: NewClient): Promise<Client> {
  const { data, error } = await supabase
    .from('clients')
    .update(input)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getClient(id: number): Promise<Client> {
  const { data, error } = await supabase.from('clients').select('*').eq('id', id).single()
  if (error) throw error
  return data
}

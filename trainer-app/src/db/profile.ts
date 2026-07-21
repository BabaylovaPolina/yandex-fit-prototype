import { supabase } from '../lib/supabase'

export type Profile = {
  id: string
  first_name: string | null
  last_name: string | null
}

export async function createProfile(userId: string, fullName: string | null): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .insert({ id: userId, full_name: fullName })

  // Ignore duplicate — profile may already exist (e.g. Google OAuth)
  if (error && error.code !== '23505') throw error
}

export async function getProfile(): Promise<Profile> {
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError) throw userError
  const userId = userData.user?.id
  if (!userId) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('profiles')
    .select('id, first_name, last_name')
    .eq('id', userId)
    .single()

  if (error) throw error
  return data
}

export async function updateProfile(input: {
  first_name: string | null
  last_name: string | null
}): Promise<Profile> {
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError) throw userError
  const userId = userData.user?.id
  if (!userId) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('profiles')
    .update(input)
    .eq('id', userId)
    .select('id, first_name, last_name')
    .single()

  if (error) throw error
  return data
}

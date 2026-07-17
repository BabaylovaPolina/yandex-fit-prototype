import { supabase } from './supabase'

export async function logEvent(eventName: string, payload: Record<string, unknown> = {}) {
  const { data } = await supabase.auth.getUser()
  const userId = data.user?.id
  if (!userId) return

  const { error } = await supabase.from('events').insert({
    user_id: userId,
    event_name: eventName,
    payload,
  })

  if (error) console.error('logEvent failed', eventName, error)
}

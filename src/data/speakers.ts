import { supabase } from '../lib/supabaseClient'
import type { Gender, Speaker } from '../types/db'

export type SpeakerInput = {
  name: string
  gender: Gender
}

export async function listSpeakers(): Promise<Speaker[]> {
  const { data, error } = await supabase
    .from('speakers')
    .select('*')
    .order('id', { ascending: true })
  if (error) throw error
  return data as Speaker[]
}

export async function createSpeaker(input: SpeakerInput): Promise<Speaker> {
  const { data, error } = await supabase
    .from('speakers')
    .insert(input)
    .select()
    .single()
  if (error) throw error
  return data as Speaker
}

export async function updateSpeaker(
  id: number,
  input: SpeakerInput,
): Promise<Speaker> {
  const { data, error } = await supabase
    .from('speakers')
    .update(input)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as Speaker
}

export async function deleteSpeaker(id: number): Promise<void> {
  const { error } = await supabase.from('speakers').delete().eq('id', id)
  if (error) throw error
}

/** Bulk-insert speakers (used by CSV/Excel import). Returns the inserted rows. */
export async function createSpeakers(
  inputs: SpeakerInput[],
): Promise<Speaker[]> {
  if (inputs.length === 0) return []
  const { data, error } = await supabase
    .from('speakers')
    .insert(inputs)
    .select()
  if (error) throw error
  return data as Speaker[]
}

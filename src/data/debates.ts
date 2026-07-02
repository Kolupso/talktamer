import { supabase } from '../lib/supabaseClient'
import type { Debate } from '../types/db'

export async function listDebates(): Promise<Debate[]> {
  const { data, error } = await supabase
    .from('debates')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data as Debate[]
}

export async function createDebate(name: string): Promise<Debate> {
  const { data, error } = await supabase
    .from('debates')
    .insert({ name })
    .select()
    .single()
  if (error) throw error
  return data as Debate
}

/** Atomically make one debate active (see set_active_debate SQL function). */
export async function switchActiveDebate(id: number): Promise<void> {
  const { error } = await supabase.rpc('set_active_debate', { target: id })
  if (error) throw error
}

/** Patch settings on a debate. Returns the updated row. */
export async function updateDebate(
  id: number,
  patch: Partial<Debate>,
): Promise<Debate> {
  const { data, error } = await supabase
    .from('debates')
    .update(patch)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as Debate
}

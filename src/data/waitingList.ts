import { supabase } from '../lib/supabaseClient'
import type { Speaker, WaitingListEntry } from '../types/db'

/** A waiting-list row enriched with the speaker and their first/multiple status. */
export type WaitingEntry = WaitingListEntry & {
  speaker: Speaker
  speak_count: number
  is_first_time: boolean
}

export async function fetchWaiting(debateId: number): Promise<WaitingEntry[]> {
  const { data: rows, error } = await supabase
    .from('waiting_list')
    .select('*, speaker:speakers(*)')
    .eq('debate_id', debateId)
    .order('entered_at', { ascending: true })
    .order('id', { ascending: true }) // stable tiebreak
  if (error) throw error

  const { data: parts, error: pErr } = await supabase
    .from('debate_participation')
    .select('speaker_id, speak_count')
    .eq('debate_id', debateId)
  if (pErr) throw pErr

  const countBySpeaker = new Map<number, number>(
    (parts ?? []).map((p) => [p.speaker_id, p.speak_count]),
  )

  return (rows as unknown as (WaitingListEntry & { speaker: Speaker })[]).map(
    (r) => {
      const speak_count = countBySpeaker.get(r.speaker_id) ?? 0
      return { ...r, speak_count, is_first_time: speak_count === 0 }
    },
  )
}

/** Add a speaker to the waiting list, ensuring a participation row exists. */
export async function addToWaiting(
  debateId: number,
  speakerId: number,
): Promise<void> {
  // Ensure a participation row without clobbering an existing speak_count.
  const { error: pErr } = await supabase.from('debate_participation').upsert(
    { debate_id: debateId, speaker_id: speakerId },
    { onConflict: 'debate_id,speaker_id', ignoreDuplicates: true },
  )
  if (pErr) throw pErr

  const { error } = await supabase
    .from('waiting_list')
    .insert({ debate_id: debateId, speaker_id: speakerId })
  if (error) {
    if (error.code === '23505') {
      throw new Error('That speaker is already on the waiting list.')
    }
    throw error
  }
}

export async function removeFromWaiting(entryId: number): Promise<void> {
  const { error } = await supabase
    .from('waiting_list')
    .delete()
    .eq('id', entryId)
  if (error) throw error
}

/**
 * Reorder by swapping the entry times of two adjacent entries.
 * (Ordering is by entered_at; swapping moves one past the other.)
 */
export async function swapOrder(
  a: WaitingEntry,
  b: WaitingEntry,
): Promise<void> {
  const { error: e1 } = await supabase
    .from('waiting_list')
    .update({ entered_at: b.entered_at })
    .eq('id', a.id)
  if (e1) throw e1
  const { error: e2 } = await supabase
    .from('waiting_list')
    .update({ entered_at: a.entered_at })
    .eq('id', b.id)
  if (e2) throw e2
}

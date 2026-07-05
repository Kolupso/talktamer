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
    .order('position', { ascending: true })
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

  // Append to the end: position = current max + 1.
  const { data: last } = await supabase
    .from('waiting_list')
    .select('position')
    .eq('debate_id', debateId)
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle()
  const nextPosition = (last?.position ?? 0) + 1

  const { error } = await supabase
    .from('waiting_list')
    .insert({ debate_id: debateId, speaker_id: speakerId, position: nextPosition })
  if (error) {
    if (error.code === '23505') {
      throw new Error('That speaker is already on the waiting list.')
    }
    throw error
  }
}

/** Fully remove an entry from the waiting list. */
export async function removeFromWaiting(entryId: number): Promise<void> {
  const { error } = await supabase
    .from('waiting_list')
    .delete()
    .eq('id', entryId)
  if (error) throw error
}

/** Rule 3: mark an entry skipped (stays visible) or restore it. */
export async function setSkipped(
  entryId: number,
  skipped: boolean,
): Promise<void> {
  const { error } = await supabase
    .from('waiting_list')
    .update({ skipped })
    .eq('id', entryId)
  if (error) {
    // Restoring collides with the partial unique index when the speaker already
    // has an active (re-added) entry on the list.
    if (!skipped && error.code === '23505') {
      throw new Error(
        'That speaker already has an active entry on the waiting list. ' +
          'Delete their active entry first.',
      )
    }
    throw error
  }
}

/** Persist a computed order (waiting_list ids in the desired sequence). */
export async function reorderWaiting(
  debateId: number,
  orderedIds: number[],
): Promise<void> {
  const { error } = await supabase.rpc('reorder_waiting', {
    p_debate_id: debateId,
    p_ids: orderedIds,
  })
  if (error) throw error
}

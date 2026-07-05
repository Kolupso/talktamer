import { supabase } from '../lib/supabaseClient'
import type { SpeechLogEntry } from '../types/db'

/** A speech-log row flattened with its debate name, ready for export. */
export type StatRow = {
  debate_id: number
  debate_name: string
  speaker_id: number | null
  speaker_name: string
  speaker_gender: string
  was_first_time: boolean
  allotted_seconds: number
  spoke_seconds: number
  removed: boolean
  created_at: string
}

type Joined = SpeechLogEntry & { debate: { name: string } | null }

/** Fetch the speech log (optionally for one debate), with debate names joined. */
export async function fetchStats(debateId?: number): Promise<StatRow[]> {
  let query = supabase
    .from('speech_log')
    .select('*, debate:debates(name)')
    .order('created_at', { ascending: true })
  if (debateId != null) query = query.eq('debate_id', debateId)

  const { data, error } = await query
  if (error) throw error

  return (data as unknown as Joined[]).map((r) => ({
    debate_id: r.debate_id,
    debate_name: r.debate?.name ?? '',
    speaker_id: r.speaker_id,
    speaker_name: r.speaker_name,
    speaker_gender: r.speaker_gender,
    was_first_time: r.was_first_time,
    allotted_seconds: r.allotted_seconds,
    spoke_seconds: Number(r.spoke_seconds),
    removed: r.removed,
    created_at: r.created_at,
  }))
}

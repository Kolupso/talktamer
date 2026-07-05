import { supabase } from '../lib/supabaseClient'
import type { Speaker, TimerState } from '../types/db'

export type TimerWithSpeaker = TimerState & { speaker: Speaker | null }

export async function fetchTimer(
  debateId: number,
): Promise<TimerWithSpeaker | null> {
  const { data, error } = await supabase
    .from('timer_state')
    .select('*, speaker:speakers(*)')
    .eq('debate_id', debateId)
    .maybeSingle()
  if (error) throw error
  return data as TimerWithSpeaker | null
}

export async function startTimer(debateId: number): Promise<void> {
  const { error } = await supabase.rpc('timer_start', { p_debate_id: debateId })
  if (error) throw error
}

export async function pauseTimer(debateId: number): Promise<void> {
  const { error } = await supabase.rpc('timer_pause', { p_debate_id: debateId })
  if (error) throw error
}

export async function resetTimer(debateId: number): Promise<void> {
  const { error } = await supabase.rpc('timer_reset', { p_debate_id: debateId })
  if (error) throw error
}

export async function advanceSpeaker(debateId: number): Promise<void> {
  const { error } = await supabase.rpc('advance_speaker', {
    p_debate_id: debateId,
  })
  if (error) throw error
}

/** Remaining seconds, computed locally from timer state (can go negative). */
export function computeRemaining(t: TimerState | null): number {
  if (!t) return 0
  const banked = Number(t.accumulated_seconds)
  // Clamp the running segment to >= 0 so client/server clock skew can never make
  // remaining briefly exceed the full duration (which flashed "11" on start).
  const running =
    t.status === 'running' && t.started_at
      ? Math.max(0, (Date.now() - new Date(t.started_at).getTime()) / 1000)
      : 0
  return t.duration_seconds - banked - running
}

/** Format a positive duration as h:mm:ss (dropping the hours part when zero). */
export function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.round(seconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  const pad = (n: number) => n.toString().padStart(2, '0')
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`
}

/**
 * Format remaining seconds as m:ss (or -m:ss when over time).
 * Uses ceil so a countdown shows "N" for the whole Nth second — this keeps the
 * displayed number in step with the colour thresholds (yellow at 5 shows on 5).
 */
export function formatClock(remaining: number): string {
  const total = Math.ceil(remaining)
  const neg = total < 0
  const s = Math.abs(total)
  const m = Math.floor(s / 60)
  const rem = s % 60
  return `${neg ? '-' : ''}${m}:${rem.toString().padStart(2, '0')}`
}

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
  const running =
    t.status === 'running' && t.started_at
      ? (Date.now() - new Date(t.started_at).getTime()) / 1000
      : 0
  return t.duration_seconds - banked - running
}

/** Format seconds as m:ss (or -m:ss when over time). */
export function formatClock(seconds: number): string {
  const neg = seconds < 0
  const s = Math.floor(Math.abs(seconds))
  const m = Math.floor(s / 60)
  const rem = s % 60
  return `${neg ? '-' : ''}${m}:${rem.toString().padStart(2, '0')}`
}

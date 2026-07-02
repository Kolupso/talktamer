import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import {
  computeRemaining,
  fetchTimer,
  type TimerWithSpeaker,
} from '../data/timer'

/**
 * Live timer for a debate: subscribes to timer_state via Realtime and ticks a
 * locally-computed `remaining` value ~4x/second while running.
 */
export function useTimer(debateId: number | null) {
  const [timer, setTimer] = useState<TimerWithSpeaker | null>(null)
  const [remaining, setRemaining] = useState(0)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!debateId) {
      setTimer(null)
      setLoading(false)
      return
    }
    try {
      const t = await fetchTimer(debateId)
      setTimer(t)
      setRemaining(computeRemaining(t))
    } finally {
      setLoading(false)
    }
  }, [debateId])

  // Fetch + subscribe to server-side changes.
  useEffect(() => {
    refresh()
    if (!debateId) return
    const channel = supabase
      .channel(`timer-${debateId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'timer_state',
          filter: `debate_id=eq.${debateId}`,
        },
        () => refresh(),
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [debateId, refresh])

  // Local tick so the display counts down smoothly between server updates.
  useEffect(() => {
    if (timer?.status !== 'running') {
      setRemaining(computeRemaining(timer))
      return
    }
    const id = setInterval(() => setRemaining(computeRemaining(timer)), 250)
    return () => clearInterval(id)
  }, [timer])

  return { timer, remaining, loading, refresh }
}

export type TimerColor = 'normal' | 'yellow' | 'red'

export function timerColor(
  remaining: number,
  yellowAt: number,
  redAt: number,
): TimerColor {
  if (remaining <= redAt) return 'red'
  if (remaining <= yellowAt) return 'yellow'
  return 'normal'
}

export const COLOR_HEX: Record<TimerColor, string> = {
  normal: 'var(--text-h)',
  yellow: '#eab308',
  red: '#dc2626',
}

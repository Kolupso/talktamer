import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { fetchWaiting, type WaitingEntry } from '../data/waitingList'

/**
 * Load the waiting list for a debate and keep it live via Realtime.
 * Re-fetches whenever waiting_list or debate_participation changes.
 */
export function useWaitingList(debateId: number | null) {
  const [entries, setEntries] = useState<WaitingEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!debateId) {
      setEntries([])
      setLoading(false)
      return
    }
    try {
      setEntries(await fetchWaiting(debateId))
      setError(null)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [debateId])

  useEffect(() => {
    refresh()
    if (!debateId) return

    const channel = supabase
      .channel(`waiting-${debateId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'waiting_list',
          filter: `debate_id=eq.${debateId}`,
        },
        () => refresh(),
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'debate_participation',
          filter: `debate_id=eq.${debateId}`,
        },
        () => refresh(),
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [debateId, refresh])

  return { entries, loading, error, refresh }
}

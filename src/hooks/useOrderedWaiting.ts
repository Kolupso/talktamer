import { useEffect, useMemo } from 'react'
import { useWaitingList } from './useWaitingList'
import { reorderWaiting, type WaitingEntry } from '../data/waitingList'
import { computeOrder, type OrderOptions } from '../lib/ordering'

export type OrderedEntry = WaitingEntry & { gender: WaitingEntry['speaker']['gender'] }

function sameIds(a: { id: number }[], b: { id: number }[]) {
  if (a.length !== b.length) return false
  return a.every((x, i) => x.id === b[i].id)
}

/**
 * Waiting list ordered by the active rules. When `reconcile` is true (the
 * manager), the computed order is persisted back as positions so that
 * advance_speaker and the display windows agree.
 */
export function useOrderedWaiting(
  debateId: number | null,
  opts: OrderOptions,
  reconcile = false,
) {
  const { entries, loading, error, refresh } = useWaitingList(debateId)

  const ordered = useMemo<OrderedEntry[]>(() => {
    const inputs = entries.map((e) => ({ ...e, gender: e.speaker.gender }))
    return computeOrder(inputs, { rule1: opts.rule1, rule2: opts.rule2 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries, opts.rule1, opts.rule2])

  useEffect(() => {
    if (!reconcile || !debateId || entries.length === 0) return
    // `entries` come back in stored-position order; if the rules want a
    // different order, persist it once (idempotent → converges, no loop).
    if (!sameIds(entries, ordered)) {
      reorderWaiting(
        debateId,
        ordered.map((e) => e.id),
      ).catch(() => {})
    }
  }, [reconcile, debateId, entries, ordered])

  return { entries: ordered, loading, error, refresh }
}

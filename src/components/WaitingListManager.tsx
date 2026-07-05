import { useEffect, useMemo, useState } from 'react'
import { useActiveDebate } from '../debate/ActiveDebateProvider'
import { useOrderedWaiting, type OrderedEntry } from '../hooks/useOrderedWaiting'
import { listSpeakers } from '../data/speakers'
import {
  addToWaiting,
  removeFromWaiting,
  reorderWaiting,
  setSkipped,
} from '../data/waitingList'
import WaitingRows from './WaitingRows'
import { formatDuration } from '../data/timer'
import type { Speaker } from '../types/db'

export default function WaitingListManager() {
  const { activeDebate } = useActiveDebate()
  const debateId = activeDebate?.id ?? null
  const rule1 = activeDebate?.rule1_enabled ?? false
  const rule2 = activeDebate?.rule2_enabled ?? false
  const rule3 = activeDebate?.rule3_enabled ?? false

  const { entries, loading, error, refresh } = useOrderedWaiting(
    debateId,
    { rule1, rule2 },
    true, // manager persists the computed order
  )

  const [speakers, setSpeakers] = useState<Speaker[]>([])
  const [search, setSearch] = useState('')
  const [actionError, setActionError] = useState<string | null>(null)

  useEffect(() => {
    listSpeakers()
      .then(setSpeakers)
      .catch((e) => setActionError((e as Error).message))
  }, [])

  // Only an ACTIVE (non-skipped) row blocks re-adding — a speaker whose only
  // row is skipped can be added again as a fresh entry.
  const activeSpeakerIds = useMemo(
    () => new Set(entries.filter((e) => !e.skipped).map((e) => e.speaker_id)),
    [entries],
  )

  const results = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return []
    return speakers
      .filter((s) => s.name.toLowerCase().includes(q) || String(s.id) === q)
      .slice(0, 8)
  }, [speakers, search])

  // Estimated remaining debate time: sum of each non-skipped waiting speaker's
  // allotted time (first-time vs multiple-time).
  const estimateSeconds = useMemo(() => {
    if (!activeDebate) return 0
    return entries
      .filter((e) => !e.skipped)
      .reduce(
        (sum, e) =>
          sum +
          (e.is_first_time
            ? activeDebate.first_time_seconds
            : activeDebate.multi_time_seconds),
        0,
      )
  }, [entries, activeDebate])

  async function run(fn: () => Promise<void>) {
    setActionError(null)
    try {
      await fn()
      await refresh()
    } catch (e) {
      setActionError((e as Error).message)
    }
  }

  async function handleAdd(speakerId: number) {
    if (!debateId) return
    await run(async () => {
      await addToWaiting(debateId, speakerId)
      setSearch('')
    })
  }

  async function move(index: number, dir: -1 | 1) {
    if (!debateId) return
    const j = index + dir
    if (j < 0 || j >= entries.length) return
    const ids = entries.map((e) => e.id)
    ;[ids[index], ids[j]] = [ids[j], ids[index]]
    await run(() => reorderWaiting(debateId, ids))
  }

  const rulesControlOrder = rule1 || rule2

  function actions(e: OrderedEntry, i: number) {
    return (
      <span style={{ whiteSpace: 'nowrap' }}>
        {!rulesControlOrder && (
          <>
            <button type="button" disabled={i === 0} onClick={() => move(i, -1)}>
              ↑
            </button>{' '}
            <button
              type="button"
              disabled={i === entries.length - 1}
              onClick={() => move(i, 1)}
            >
              ↓
            </button>{' '}
          </>
        )}
        {rule3 ? (
          e.skipped ? (
            <>
              <button type="button" onClick={() => run(() => setSkipped(e.id, false))}>
                Restore
              </button>{' '}
              <button type="button" className="danger" onClick={() => run(() => removeFromWaiting(e.id))}>
                Delete
              </button>
            </>
          ) : (
            <>
              <button type="button" onClick={() => run(() => setSkipped(e.id, true))}>
                Skip
              </button>{' '}
              <button type="button" className="danger" onClick={() => run(() => removeFromWaiting(e.id))}>
                Delete
              </button>
            </>
          )
        ) : (
          <button type="button" className="danger" onClick={() => run(() => removeFromWaiting(e.id))}>
            Remove
          </button>
        )}
      </span>
    )
  }

  if (!activeDebate) {
    return (
      <section style={panel}>
        <h2>Waiting list</h2>
        <p style={{ color: 'var(--text-muted)' }}>
          Select or create a debate to manage its waiting list.
        </p>
      </section>
    )
  }

  return (
    <section style={panel}>
      <h2>
        Waiting list
        {activeDebate.list_closed && (
          <span title="List closed to new sign-ups" style={{ marginLeft: '0.5rem' }}>
            🚫
          </span>
        )}
      </h2>
      <p style={{ color: 'var(--text-muted)', marginTop: 0 }}>
        Estimated remaining debate time:{' '}
        <strong>{formatDuration(estimateSeconds)}</strong>
      </p>
      {error && <p style={{ color: 'var(--danger)' }}>{error}</p>}
      {actionError && <p style={{ color: 'var(--danger)' }}>{actionError}</p>}

      <div style={{ marginBottom: '0.75rem' }}>
        <input
          placeholder="Add speaker — search register by name or id"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: '100%', maxWidth: 420 }}
        />
        {results.length > 0 && (
          <ul style={{ listStyle: 'none', padding: 0, margin: '0.5rem 0', maxWidth: 420 }}>
            {results.map((s) => {
              const already = activeSpeakerIds.has(s.id)
              return (
                <li
                  key={s.id}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.25rem 0' }}
                >
                  <span>
                    <code>{s.id}</code> {s.name}{' '}
                    <span style={{ color: 'var(--text-muted)' }}>({s.gender})</span>
                  </span>
                  <button type="button" className="primary" disabled={already} onClick={() => handleAdd(s.id)}>
                    {already ? 'On list' : 'Add'}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {loading ? (
        <p>Loading…</p>
      ) : entries.length === 0 ? (
        <p style={{ color: 'var(--text-muted)' }}>The waiting list is empty.</p>
      ) : (
        <WaitingRows
          entries={entries}
          rule1={rule1}
          showGender={rule2}
          renderActions={actions}
        />
      )}
    </section>
  )
}

const panel: React.CSSProperties = {
  border: '1px solid var(--border)',
  borderRadius: 8,
  padding: '1rem 1.25rem',
  marginBottom: '1rem',
}

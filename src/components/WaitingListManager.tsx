import { useEffect, useMemo, useState } from 'react'
import { useActiveDebate } from '../debate/ActiveDebateProvider'
import { useWaitingList } from '../hooks/useWaitingList'
import { listSpeakers } from '../data/speakers'
import {
  addToWaiting,
  removeFromWaiting,
  swapOrder,
} from '../data/waitingList'
import type { Speaker } from '../types/db'

export default function WaitingListManager() {
  const { activeDebate } = useActiveDebate()
  const debateId = activeDebate?.id ?? null
  const { entries, loading, error, refresh } = useWaitingList(debateId)

  const [speakers, setSpeakers] = useState<Speaker[]>([])
  const [search, setSearch] = useState('')
  const [actionError, setActionError] = useState<string | null>(null)

  useEffect(() => {
    listSpeakers()
      .then(setSpeakers)
      .catch((e) => setActionError((e as Error).message))
  }, [])

  const onListSpeakerIds = useMemo(
    () => new Set(entries.map((e) => e.speaker_id)),
    [entries],
  )

  const results = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return []
    return speakers
      .filter((s) => s.name.toLowerCase().includes(q) || String(s.id) === q)
      .slice(0, 8)
  }, [speakers, search])

  async function handleAdd(speakerId: number) {
    if (!debateId) return
    setActionError(null)
    try {
      await addToWaiting(debateId, speakerId)
      setSearch('')
      await refresh()
    } catch (e) {
      setActionError((e as Error).message)
    }
  }

  async function handleRemove(entryId: number) {
    setActionError(null)
    try {
      await removeFromWaiting(entryId)
      await refresh()
    } catch (e) {
      setActionError((e as Error).message)
    }
  }

  async function move(index: number, dir: -1 | 1) {
    const other = index + dir
    if (other < 0 || other >= entries.length) return
    setActionError(null)
    try {
      await swapOrder(entries[index], entries[other])
      await refresh()
    } catch (e) {
      setActionError((e as Error).message)
    }
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
      <h2>Waiting list</h2>
      {error && <p style={{ color: 'var(--danger)' }}>{error}</p>}
      {actionError && <p style={{ color: 'var(--danger)' }}>{actionError}</p>}

      {/* Search the register and add by name or id */}
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
              const already = onListSpeakerIds.has(s.id)
              return (
                <li
                  key={s.id}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.25rem 0' }}
                >
                  <span>
                    <code>{s.id}</code> {s.name}{' '}
                    <span style={{ color: 'var(--text-muted)' }}>({s.gender})</span>
                  </span>
                  <button
                    type="button"
                    className="primary"
                    disabled={already}
                    onClick={() => handleAdd(s.id)}
                  >
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
        <table>
          <thead>
            <tr>
              <th style={{ width: 40 }}>#</th>
              <th>Speaker</th>
              <th style={{ width: 90 }}>Status</th>
              <th style={{ width: 170 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e, i) => (
              <tr key={e.id}>
                <td>{i + 1}</td>
                <td>
                  <code>{e.speaker_id}</code> {e.speaker.name}
                </td>
                <td>
                  <span
                    style={{
                      fontSize: '0.8rem',
                      padding: '0.1rem 0.4rem',
                      borderRadius: 4,
                      background: 'var(--code-bg)',
                    }}
                  >
                    {e.is_first_time ? '1st time' : 'multiple'}
                  </span>
                </td>
                <td>
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
                  <button type="button" className="danger" onClick={() => handleRemove(e.id)}>
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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

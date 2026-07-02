import {
  ActiveDebateProvider,
  useActiveDebate,
} from '../debate/ActiveDebateProvider'
import { useWaitingList } from '../hooks/useWaitingList'

function WaitingInner() {
  const { activeDebate, loading: debateLoading } = useActiveDebate()
  const { entries, loading } = useWaitingList(activeDebate?.id ?? null)

  if (debateLoading) {
    return <Centered>Loading…</Centered>
  }
  if (!activeDebate) {
    return <Centered>No active debate.</Centered>
  }

  return (
    <div style={{ padding: '2rem', maxWidth: 800, margin: '0 auto' }}>
      <h1 style={{ textAlign: 'center' }}>{activeDebate.name}</h1>
      {loading ? (
        <Centered>Loading…</Centered>
      ) : entries.length === 0 ? (
        <Centered>No speakers waiting.</Centered>
      ) : (
        <ol style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {entries.map((e, i) => (
            <li
              key={e.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                padding: '0.75rem 1rem',
                borderBottom: '1px solid var(--border)',
                fontSize: '1.5rem',
              }}
            >
              <span
                style={{
                  minWidth: '2ch',
                  textAlign: 'right',
                  color: 'var(--text-muted)',
                }}
              >
                {i + 1}
              </span>
              <span style={{ flex: 1 }}>{e.speaker.name}</span>
              <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>
                {e.is_first_time ? '1st time' : 'multiple'}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        minHeight: '60vh',
        display: 'grid',
        placeItems: 'center',
        fontSize: '1.5rem',
        color: 'var(--text-muted)',
      }}
    >
      {children}
    </div>
  )
}

export default function Waiting() {
  return (
    <ActiveDebateProvider>
      <WaitingInner />
    </ActiveDebateProvider>
  )
}

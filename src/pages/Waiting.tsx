import {
  ActiveDebateProvider,
  useActiveDebate,
} from '../debate/ActiveDebateProvider'
import { useOrderedWaiting } from '../hooks/useOrderedWaiting'
import WaitingRows from '../components/WaitingRows'

function WaitingInner() {
  const { activeDebate, loading: debateLoading } = useActiveDebate()
  const rule1 = activeDebate?.rule1_enabled ?? false
  const rule2 = activeDebate?.rule2_enabled ?? false
  const { entries, loading } = useOrderedWaiting(activeDebate?.id ?? null, {
    rule1,
    rule2,
  })

  if (debateLoading) return <Centered>Loading…</Centered>
  if (!activeDebate) return <Centered>No active debate.</Centered>

  // Gender indicators show only when rule 2 is on AND the manager left them on.
  const showGender = rule2 && activeDebate.show_gender_indicators

  return (
    <div style={{ padding: '2rem', maxWidth: 800, margin: '0 auto' }}>
      <h1 style={{ textAlign: 'center' }}>
        {activeDebate.name}
        {activeDebate.list_closed && (
          <span title="List closed to new sign-ups" style={{ marginLeft: '0.75rem' }}>
            🚫
          </span>
        )}
      </h1>
      {loading ? (
        <Centered>Loading…</Centered>
      ) : entries.length === 0 ? (
        <Centered>No speakers waiting.</Centered>
      ) : (
        <WaitingRows
          entries={entries}
          rule1={rule1}
          showGender={showGender}
          fontSize="1.5rem"
        />
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

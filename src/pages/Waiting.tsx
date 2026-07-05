import {
  ActiveDebateProvider,
  useActiveDebate,
} from '../debate/ActiveDebateProvider'
import { useOrderedWaiting } from '../hooks/useOrderedWaiting'
import { useTimer, timerColor, COLOR_HEX } from '../hooks/useTimer'
import { formatClock } from '../data/timer'
import WaitingRows from '../components/WaitingRows'

function WaitingCountdown() {
  const { activeDebate } = useActiveDebate()
  const { timer, remaining } = useTimer(activeDebate?.id ?? null)
  if (!activeDebate || !timer?.current_speaker_id) return null

  const color = activeDebate.show_color_indicators
    ? timerColor(
        remaining,
        activeDebate.yellow_threshold_seconds,
        activeDebate.red_threshold_seconds,
      )
    : 'normal'

  return (
    <div
      style={{
        textAlign: 'center',
        marginBottom: '1.5rem',
        padding: '0.75rem',
        borderBottom: '1px solid var(--border)',
      }}
    >
      <span style={{ color: 'var(--text-muted)', marginRight: '1rem' }}>
        {timer.speaker?.name}
      </span>
      <span
        style={{
          fontSize: 'clamp(2.5rem, 8vw, 6rem)',
          fontWeight: 800,
          fontVariantNumeric: 'tabular-nums',
          color: COLOR_HEX[color],
        }}
      >
        {formatClock(remaining)}
      </span>
    </div>
  )
}

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
    <div style={{ padding: '2rem', maxWidth: 1100, margin: '0 auto' }}>
      <h1
        style={{
          textAlign: 'center',
          fontSize: 'clamp(1.75rem, 5vw, 3.5rem)',
        }}
      >
        {activeDebate.name}
        {activeDebate.list_closed && (
          <span title="List closed to new sign-ups" style={{ marginLeft: '0.75rem' }}>
            🚫
          </span>
        )}
      </h1>
      {activeDebate.show_countdown_on_waiting && <WaitingCountdown />}
      {loading ? (
        <Centered>Loading…</Centered>
      ) : entries.length === 0 ? (
        <Centered>No speakers waiting.</Centered>
      ) : (
        <WaitingRows
          entries={entries}
          rule1={rule1}
          showGender={showGender}
          fontSize="clamp(1.25rem, 3vw, 2.25rem)"
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

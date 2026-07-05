import {
  ActiveDebateProvider,
  useActiveDebate,
} from '../debate/ActiveDebateProvider'
import { useTimer, timerColor, COLOR_HEX } from '../hooks/useTimer'
import { formatClock } from '../data/timer'

function CountdownInner() {
  const { activeDebate, loading: debateLoading } = useActiveDebate()
  const { timer, remaining } = useTimer(activeDebate?.id ?? null)

  if (debateLoading) return <Centered muted>Loading…</Centered>
  if (!activeDebate) return <Centered muted>No active debate.</Centered>

  const hasSpeaker = Boolean(timer?.current_speaker_id)
  if (!hasSpeaker) return <Centered muted>Waiting for the next speaker…</Centered>

  // Page 3 colour indication can be turned off by the manager.
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
        minHeight: '100svh',
        display: 'grid',
        placeItems: 'center',
        gap: '1rem',
        textAlign: 'center',
      }}
    >
      <div>
        <div
          style={{
            fontSize: 'clamp(1.5rem, 6vw, 4rem)',
            color: 'var(--text-muted)',
            marginBottom: '1rem',
          }}
        >
          {timer?.speaker?.name}
        </div>
        <div
          style={{
            fontSize: 'min(34vw, 22rem)',
            lineHeight: 1,
            fontWeight: 800,
            fontVariantNumeric: 'tabular-nums',
            color: COLOR_HEX[color],
          }}
        >
          {formatClock(remaining)}
        </div>
      </div>
    </div>
  )
}

function Centered({
  children,
  muted,
}: {
  children: React.ReactNode
  muted?: boolean
}) {
  return (
    <div
      style={{
        minHeight: '100svh',
        display: 'grid',
        placeItems: 'center',
        fontSize: '2rem',
        color: muted ? 'var(--text-muted)' : 'var(--text-h)',
      }}
    >
      {children}
    </div>
  )
}

export default function Countdown() {
  return (
    <ActiveDebateProvider>
      <CountdownInner />
    </ActiveDebateProvider>
  )
}

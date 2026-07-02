import { useState } from 'react'
import { useActiveDebate } from '../debate/ActiveDebateProvider'
import { useTimer, timerColor, COLOR_HEX } from '../hooks/useTimer'
import {
  advanceSpeaker,
  formatClock,
  pauseTimer,
  resetTimer,
  startTimer,
} from '../data/timer'

export default function TimerController() {
  const { activeDebate } = useActiveDebate()
  const debateId = activeDebate?.id ?? null
  const { timer, remaining, refresh } = useTimer(debateId)
  const [error, setError] = useState<string | null>(null)

  if (!activeDebate) {
    return (
      <section style={panel}>
        <h2>Countdown</h2>
        <p style={{ color: 'var(--text-muted)' }}>Select or create a debate.</p>
      </section>
    )
  }

  const hasSpeaker = Boolean(timer?.current_speaker_id)
  const running = timer?.status === 'running'
  const color = timerColor(
    remaining,
    activeDebate.yellow_threshold_seconds,
    activeDebate.red_threshold_seconds,
  )

  async function run(fn: () => Promise<void>) {
    setError(null)
    try {
      await fn()
      await refresh()
    } catch (e) {
      setError((e as Error).message)
    }
  }

  return (
    <section style={panel}>
      <h2>Countdown</h2>
      {error && <p style={{ color: 'var(--danger)' }}>{error}</p>}

      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
        <div
          style={{
            fontSize: '3rem',
            fontVariantNumeric: 'tabular-nums',
            fontWeight: 700,
            color: hasSpeaker ? COLOR_HEX[color] : 'var(--text-muted)',
            minWidth: '4ch',
          }}
        >
          {formatClock(hasSpeaker ? remaining : 0)}
        </div>
        <div>
          <div style={{ fontSize: '1.25rem', color: 'var(--text-h)' }}>
            {timer?.speaker ? timer.speaker.name : 'No current speaker'}
          </div>
          {hasSpeaker && (
            <div style={{ color: 'var(--text-muted)' }}>
              {timer?.current_is_first_time ? 'First-time speaker' : 'Multiple-time speaker'}
              {' · '}
              {timer?.duration_seconds}s allotted
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
        <button type="button" className="primary" onClick={() => run(() => advanceSpeaker(activeDebate.id))}>
          Next speaker →
        </button>
        <button type="button" disabled={!hasSpeaker || running} onClick={() => run(() => startTimer(activeDebate.id))}>
          Start
        </button>
        <button type="button" disabled={!running} onClick={() => run(() => pauseTimer(activeDebate.id))}>
          Pause
        </button>
        <button type="button" disabled={!hasSpeaker} onClick={() => run(() => resetTimer(activeDebate.id))}>
          Reset
        </button>
      </div>
    </section>
  )
}

const panel: React.CSSProperties = {
  border: '1px solid var(--border)',
  borderRadius: 8,
  padding: '1rem 1.25rem',
  marginBottom: '1rem',
}

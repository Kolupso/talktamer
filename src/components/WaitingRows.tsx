import type { ReactNode } from 'react'
import { LOCKED_COUNT } from '../lib/ordering'
import type { OrderedEntry } from '../hooks/useOrderedWaiting'
import GenderBadge from './GenderBadge'

type Props = {
  entries: OrderedEntry[]
  rule1: boolean
  showGender: boolean
  fontSize?: string
  /** Optional per-row controls (manager only). */
  renderActions?: (entry: OrderedEntry, index: number) => ReactNode
}

/**
 * Renders the ordered waiting list with: position numbers, a lock marker on the
 * pinned top-2, gender badges (when enabled), skipped styling, and — when rule 1
 * is on — a visual split between first-time and multiple-time speakers.
 */
export default function WaitingRows({
  entries,
  rule1,
  showGender,
  fontSize = '1rem',
  renderActions,
}: Props) {
  // Index in `entries` at which the multiple-time group begins (after the two
  // locked slots), used to place the rule-1 divider.
  const rest = entries.slice(LOCKED_COUNT)
  const firstMultiIndexInRest = rest.findIndex((e) => !e.is_first_time)
  const multiStart =
    firstMultiIndexInRest === -1 ? -1 : LOCKED_COUNT + firstMultiIndexInRest
  const restStart = LOCKED_COUNT

  return (
    <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize }}>
      {entries.map((e, i) => (
        <div key={e.id}>
          {rule1 && i === restStart && rest.some((r) => r.is_first_time) && (
            <Header>First-time speakers</Header>
          )}
          {rule1 && i === multiStart && <Header>Multiple-time speakers</Header>}
          <li
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.5rem 0.25rem',
              borderBottom: '1px solid var(--border)',
              opacity: e.skipped ? 0.5 : 1,
              textDecoration: e.skipped ? 'line-through' : 'none',
            }}
          >
            <span
              style={{ minWidth: '2ch', textAlign: 'right', color: 'var(--text-muted)' }}
            >
              {i + 1}
            </span>
            {i < LOCKED_COUNT && <span title="Locked (cannot be overtaken)">🔒</span>}
            {showGender && <GenderBadge gender={e.gender} />}
            <span style={{ flex: 1 }}>{e.speaker.name}</span>
            {!rule1 && (
              <span style={{ fontSize: '0.8em', color: 'var(--text-muted)' }}>
                {e.is_first_time ? '1st time' : 'multiple'}
              </span>
            )}
            {e.skipped && (
              <span style={{ fontSize: '0.8em', color: 'var(--text-muted)' }}>skipped</span>
            )}
            {renderActions?.(e, i)}
          </li>
        </div>
      ))}
    </ul>
  )
}

function Header({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        fontSize: '0.75rem',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        color: 'var(--text-muted)',
        margin: '0.75rem 0 0.25rem',
        fontWeight: 600,
      }}
    >
      {children}
    </div>
  )
}

import { useEffect, useState } from 'react'
import { useActiveDebate } from '../debate/ActiveDebateProvider'
import type { Debate } from '../types/db'

// Numeric fields edited via a local form and saved together.
type NumericField = {
  key: keyof Pick<
    Debate,
    | 'first_time_seconds'
    | 'multi_time_seconds'
    | 'yellow_threshold_seconds'
    | 'red_threshold_seconds'
  >
  label: string
}

const NUMERIC_FIELDS: NumericField[] = [
  { key: 'first_time_seconds', label: 'First-time speak time (s)' },
  { key: 'multi_time_seconds', label: 'Multiple-time speak time (s)' },
  { key: 'yellow_threshold_seconds', label: 'Yellow at (s remaining)' },
  { key: 'red_threshold_seconds', label: 'Red at (s remaining)' },
]

// Boolean toggles saved immediately on change.
type ToggleField = { key: keyof Debate; label: string }

const RULE_TOGGLES: ToggleField[] = [
  { key: 'rule1_enabled', label: 'Rule 1 — first-time speakers before multiple-time' },
  { key: 'rule2_enabled', label: 'Rule 2 — zebra striping (alternate woman/enby)' },
  { key: 'rule3_enabled', label: 'Rule 3 — removed speakers stay visible but skipped' },
]

const DISPLAY_TOGGLES: ToggleField[] = [
  { key: 'show_color_indicators', label: 'Show yellow/red on countdown (page 3)' },
  { key: 'show_gender_indicators', label: 'Show gender indicators (page 2)' },
  { key: 'show_countdown_on_waiting', label: 'Show countdown on waiting list (page 2)' },
  { key: 'list_closed', label: 'List closed — show "no more sign-ups" icon' },
]

export default function DebateSettings() {
  const { activeDebate, updateSettings } = useActiveDebate()

  const [numbers, setNumbers] = useState<Record<string, number>>({})
  const [saved, setSaved] = useState(false)

  // Reset the numeric form whenever the active debate changes.
  useEffect(() => {
    if (!activeDebate) return
    setNumbers({
      first_time_seconds: activeDebate.first_time_seconds,
      multi_time_seconds: activeDebate.multi_time_seconds,
      yellow_threshold_seconds: activeDebate.yellow_threshold_seconds,
      red_threshold_seconds: activeDebate.red_threshold_seconds,
    })
  }, [activeDebate])

  if (!activeDebate) {
    return (
      <section
        style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '1rem 1.25rem', marginBottom: '1rem' }}
      >
        <h2>Debate settings</h2>
        <p style={{ color: 'var(--text-muted)' }}>
          Create or select a debate to edit its settings.
        </p>
      </section>
    )
  }

  async function saveNumbers() {
    await updateSettings(numbers as Partial<Debate>)
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  return (
    <section
      style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '1rem 1.25rem', marginBottom: '1rem' }}
    >
      <h2>Debate settings — {activeDebate.name}</h2>

      <div
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', marginBottom: '0.75rem' }}
      >
        {NUMERIC_FIELDS.map((f) => (
          <label key={f.key} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.9rem' }}>
            {f.label}
            <input
              type="number"
              min={0}
              value={numbers[f.key] ?? 0}
              onChange={(e) =>
                setNumbers((prev) => ({ ...prev, [f.key]: Number(e.target.value) }))
              }
            />
          </label>
        ))}
      </div>
      <button type="button" className="primary" onClick={saveNumbers}>
        Save times & thresholds
      </button>
      {saved && <span style={{ color: 'var(--accent)', marginLeft: '0.5rem' }}>Saved</span>}

      <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', marginTop: '1rem' }}>
        <fieldset style={{ border: '1px solid var(--border)', borderRadius: 8, minWidth: 260 }}>
          <legend>Special rules</legend>
          {RULE_TOGGLES.map((t) => (
            <label key={t.key} style={{ display: 'block', margin: '0.35rem 0' }}>
              <input
                type="checkbox"
                checked={Boolean(activeDebate[t.key])}
                onChange={(e) => updateSettings({ [t.key]: e.target.checked })}
              />{' '}
              {t.label}
            </label>
          ))}
        </fieldset>

        <fieldset style={{ border: '1px solid var(--border)', borderRadius: 8, minWidth: 260 }}>
          <legend>Display</legend>
          {DISPLAY_TOGGLES.map((t) => (
            <label key={t.key} style={{ display: 'block', margin: '0.35rem 0' }}>
              <input
                type="checkbox"
                checked={Boolean(activeDebate[t.key])}
                onChange={(e) => updateSettings({ [t.key]: e.target.checked })}
              />{' '}
              {t.label}
            </label>
          ))}
        </fieldset>
      </div>
    </section>
  )
}

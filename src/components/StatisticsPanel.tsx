import { useState } from 'react'
import { useActiveDebate } from '../debate/ActiveDebateProvider'
import { fetchStats } from '../data/stats'
import { downloadStatistics } from '../lib/spreadsheet'

export default function StatisticsPanel() {
  const { activeDebate } = useActiveDebate()
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function download(scope: 'current' | 'all') {
    setError(null)
    setBusy(true)
    try {
      const debateId = scope === 'current' ? activeDebate?.id : undefined
      const rows = await fetchStats(debateId)
      if (rows.length === 0) {
        setError('No speeches logged yet for this selection.')
        return
      }
      const name =
        scope === 'current'
          ? `talktamer-stats-${activeDebate?.name ?? 'debate'}.xlsx`
          : 'talktamer-stats-all.xlsx'
      await downloadStatistics(rows, name)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section style={panel}>
      <h2>Statistics</h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
        A log of every speech: speaker, gender, first-time or not, allotted and
        actual seconds, and removed (skipped) speakers. Exported as Excel.
      </p>
      {error && <p style={{ color: 'var(--danger)' }}>{error}</p>}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <button
          type="button"
          disabled={busy || !activeDebate}
          onClick={() => download('current')}
        >
          Download current debate
        </button>
        <button type="button" disabled={busy} onClick={() => download('all')}>
          Download all debates
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

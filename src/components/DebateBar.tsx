import { useActiveDebate } from '../debate/ActiveDebateProvider'

export default function DebateBar() {
  const { debates, activeDebate, switchDebate, createDebate } = useActiveDebate()

  async function handleNew() {
    const name = prompt('Name for the new debate?')?.trim()
    if (!name) return
    await createDebate(name)
  }

  return (
    <section
      style={{
        display: 'flex',
        gap: '0.75rem',
        alignItems: 'center',
        flexWrap: 'wrap',
        border: '1px solid var(--border)',
        borderRadius: 8,
        padding: '0.75rem 1rem',
        marginBottom: '1rem',
      }}
    >
      <strong>Debate:</strong>
      {debates.length === 0 ? (
        <span style={{ color: 'var(--text-muted)' }}>none yet</span>
      ) : (
        <select
          value={activeDebate?.id ?? ''}
          onChange={(e) => switchDebate(Number(e.target.value))}
        >
          {debates.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
              {d.is_active ? ' (active)' : ''}
            </option>
          ))}
        </select>
      )}
      <button type="button" className="primary" onClick={handleNew}>
        + New debate
      </button>
    </section>
  )
}

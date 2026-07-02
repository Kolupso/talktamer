import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import type { Gender, Speaker } from '../types/db'
import {
  createSpeaker,
  createSpeakers,
  deleteSpeaker,
  listSpeakers,
  updateSpeaker,
} from '../data/speakers'
import { downloadSpeakers, parseSpeakerFile } from '../lib/spreadsheet'

const GENDERS: Gender[] = ['man', 'woman', 'enby']

export default function SpeakerRegister() {
  const [speakers, setSpeakers] = useState<Speaker[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const [search, setSearch] = useState('')

  // New-speaker form
  const [newName, setNewName] = useState('')
  const [newGender, setNewGender] = useState<Gender>('man')

  // Inline editing
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editName, setEditName] = useState('')
  const [editGender, setEditGender] = useState<Gender>('man')

  const fileInputRef = useRef<HTMLInputElement>(null)

  async function refresh() {
    setLoading(true)
    try {
      setSpeakers(await listSpeakers())
      setError(null)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return speakers
    return speakers.filter(
      (s) => s.name.toLowerCase().includes(q) || String(s.id) === q,
    )
  }, [speakers, search])

  async function handleAdd(e: FormEvent) {
    e.preventDefault()
    if (!newName.trim()) return
    try {
      await createSpeaker({ name: newName.trim(), gender: newGender })
      setNewName('')
      setNewGender('man')
      setNotice(null)
      await refresh()
    } catch (e) {
      setError((e as Error).message)
    }
  }

  function startEdit(s: Speaker) {
    setEditingId(s.id)
    setEditName(s.name)
    setEditGender(s.gender)
  }

  async function saveEdit(id: number) {
    try {
      await updateSpeaker(id, { name: editName.trim(), gender: editGender })
      setEditingId(null)
      await refresh()
    } catch (e) {
      setError((e as Error).message)
    }
  }

  async function handleDelete(s: Speaker) {
    if (!confirm(`Delete ${s.name} (id ${s.id}) from the register?`)) return
    try {
      await deleteSpeaker(s.id)
      await refresh()
    } catch (e) {
      setError((e as Error).message)
    }
  }

  async function handleImport(e: FormEvent) {
    e.preventDefault()
    const file = fileInputRef.current?.files?.[0]
    if (!file) return
    setNotice(null)
    setError(null)
    try {
      const { rows, errors } = await parseSpeakerFile(file)
      if (rows.length > 0) await createSpeakers(rows)
      if (fileInputRef.current) fileInputRef.current.value = ''
      const parts: string[] = []
      if (rows.length) parts.push(`Imported ${rows.length} speaker(s).`)
      if (errors.length)
        parts.push(`Skipped ${errors.length}: ${errors.join('; ')}`)
      setNotice(parts.join(' ') || 'Nothing to import.')
      await refresh()
    } catch (e) {
      setError((e as Error).message)
    }
  }

  return (
    <section
      style={{
        border: '1px solid var(--border)',
        borderRadius: 8,
        padding: '1rem 1.25rem',
      }}
    >
      <h2>Speaker register</h2>

      {error && <p style={{ color: 'var(--danger)' }}>{error}</p>}
      {notice && <p style={{ color: 'var(--accent)' }}>{notice}</p>}

      {/* Add + search + import/export controls */}
      <form
        onSubmit={handleAdd}
        style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}
      >
        <input
          placeholder="New speaker name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
        <select
          value={newGender}
          onChange={(e) => setNewGender(e.target.value as Gender)}
        >
          {GENDERS.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
        <button type="submit" className="primary">
          Add speaker
        </button>
      </form>

      <div
        style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem', alignItems: 'center' }}
      >
        <input
          placeholder="Search by name or id"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: '1 1 200px' }}
        />
        <button type="button" onClick={() => downloadSpeakers(speakers)}>
          Download register
        </button>
        <form onSubmit={handleImport} style={{ display: 'flex', gap: '0.5rem' }}>
          <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" />
          <button type="submit">Import</button>
        </form>
      </div>

      {loading ? (
        <p>Loading…</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th style={{ width: 60 }}>ID</th>
              <th>Name</th>
              <th style={{ width: 100 }}>Gender</th>
              <th style={{ width: 140 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s) => (
              <tr key={s.id}>
                <td>{s.id}</td>
                <td>
                  {editingId === s.id ? (
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                    />
                  ) : (
                    s.name
                  )}
                </td>
                <td>
                  {editingId === s.id ? (
                    <select
                      value={editGender}
                      onChange={(e) => setEditGender(e.target.value as Gender)}
                    >
                      {GENDERS.map((g) => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ))}
                    </select>
                  ) : (
                    s.gender
                  )}
                </td>
                <td>
                  {editingId === s.id ? (
                    <>
                      <button
                        type="button"
                        className="primary"
                        onClick={() => saveEdit(s.id)}
                      >
                        Save
                      </button>{' '}
                      <button type="button" onClick={() => setEditingId(null)}>
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button type="button" onClick={() => startEdit(s)}>
                        Edit
                      </button>{' '}
                      <button
                        type="button"
                        className="danger"
                        onClick={() => handleDelete(s)}
                      >
                        Delete
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={4} style={{ color: 'var(--text-muted)' }}>
                  {speakers.length === 0
                    ? 'No speakers yet. Add one above or import a file.'
                    : 'No speakers match your search.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </section>
  )
}

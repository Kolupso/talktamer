import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import SpeakerRegister from '../components/SpeakerRegister'

export default function Manager() {
  const { user, signOut } = useAuth()

  return (
    <main style={{ padding: '1.5rem', maxWidth: 900, margin: '0 auto' }}>
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1rem',
          gap: '1rem',
        }}
      >
        <h1 style={{ margin: 0 }}>Manager dashboard</h1>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          <Link to="/">Home</Link> · {user?.email}{' '}
          <button type="button" onClick={signOut}>
            Sign out
          </button>
        </span>
      </header>

      <SpeakerRegister />
    </main>
  )
}

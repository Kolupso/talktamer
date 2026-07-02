import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'

export default function Home() {
  const { user, signOut } = useAuth()

  return (
    <main style={{ padding: '2rem' }}>
      <h1>TalkTamer</h1>
      <p>
        Signed in as {user?.email}.{' '}
        <button type="button" onClick={signOut}>
          Sign out
        </button>
      </p>
      <p>Choose a window:</p>
      <ul>
        <li>
          <Link to="/manager">Manager dashboard</Link>
        </li>
        <li>
          <Link to="/waiting">Waiting list display</Link>
        </li>
        <li>
          <Link to="/countdown">Countdown display</Link>
        </li>
      </ul>
    </main>
  )
}

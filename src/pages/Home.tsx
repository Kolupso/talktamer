import { Link } from 'react-router-dom'

export default function Home() {
  return (
    <main style={{ padding: '2rem' }}>
      <h1>TalkTamer</h1>
      <p>Debate management. Choose a window:</p>
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

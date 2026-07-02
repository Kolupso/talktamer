import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Manager from './pages/Manager'
import Waiting from './pages/Waiting'
import Countdown from './pages/Countdown'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/manager" element={<Manager />} />
        <Route path="/waiting" element={<Waiting />} />
        <Route path="/countdown" element={<Countdown />} />
      </Routes>
    </BrowserRouter>
  )
}

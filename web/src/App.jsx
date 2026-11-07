// @ts-check
import { useEffect } from 'react'
import { Navigate, Route, Routes } from 'react-router'
import { Home } from './screens/Home.jsx'
import { Join } from './screens/Join.jsx'
import { Move } from './screens/Move.jsx'
import { NewPlayer } from './screens/NewPlayer.jsx'
import { Players } from './screens/Players.jsx'
import { Session } from './screens/Session.jsx'
import { Settings } from './screens/Settings.jsx'
import { setSoundMuted } from './sound.js'
import { useCurrentPlayer } from './store.js'

/**
 * A screen that needs the current player; without one, back to "Who's playing?".
 * @param {{ screen: (props: { player: import('./store.js').Player }) => any }} props
 */
function WithPlayer({ screen: Screen }) {
  const player = useCurrentPlayer()
  useEffect(() => setSoundMuted(Boolean(player?.muted)), [player?.muted])
  if (!player) return <Navigate to="/" replace />
  return <Screen player={player} />
}

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Players />} />
      <Route path="/new" element={<NewPlayer />} />
      <Route path="/join" element={<Join />} />
      <Route path="/play" element={<WithPlayer screen={Home} />} />
      <Route path="/play/:gameId" element={<WithPlayer screen={Session} />} />
      <Route path="/move" element={<WithPlayer screen={Move} />} />
      <Route path="/settings" element={<WithPlayer screen={Settings} />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

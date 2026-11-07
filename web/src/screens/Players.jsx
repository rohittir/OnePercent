// @ts-check
// "Who's playing?": every player on this device.
import { Link, Navigate, useNavigate } from 'react-router'
import { selectPlayer, usePlayers } from '../store.js'
import { themeFor, useTheme } from '../themes/index.js'

export function Players() {
  const players = usePlayers()
  const navigate = useNavigate()
  useTheme(undefined)
  if (!players.length) return <Navigate to="/new" replace />
  return (
    <div className="setup">
      <h1>Who's playing?</h1>
      <div className="who">
        {players.map((p) => {
          const { Face } = themeFor(p.age)
          return (
            <button key={p.localId} className="who-card" onClick={() => { selectPlayer(p.localId); navigate('/play') }}>
              <Face /><b>{p.name}</b>
            </button>
          )
        })}
      </div>
      <Link className="cta" to="/new">Add a player</Link>
      <Link className="ghost" to="/join">Join from another device</Link>
    </div>
  )
}

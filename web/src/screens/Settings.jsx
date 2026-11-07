// @ts-check
// Sound, another device, the PIN, and deleting the player.
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { changePin, deletePlayer } from '../api.js'
import { removePlayer, setMuted, setPin } from '../store.js'
import { requestSync } from '../sync.js'
import { useTheme } from '../themes/index.js'

/** @param {{ player: import('../store.js').Player }} props */
export function Settings({ player }) {
  useTheme(player.age)
  const navigate = useNavigate()
  const [note, setNote] = useState('')

  /** @param {import('react').FormEvent<HTMLFormElement>} e */
  async function savePin(e) {
    e.preventDefault()
    const form = e.currentTarget
    const pin = String(new FormData(form).get('pin'))
    try {
      // Not online yet: the new PIN goes with the first sync.
      if (player.code && player.token) await changePin(player.code, player.token, pin)
      setPin(player.localId, pin)
      form.reset()
      setNote('PIN changed.')
    } catch {
      setNote('You need the internet to change the PIN.')
    }
  }

  async function remove() {
    if (!confirm(`Delete ${player.name} and all their progress, here and online? This can't be undone.`)) return
    try {
      if (player.code && player.token && !player.unlinked) await deletePlayer(player.code, player.token)
    } catch {
      setNote('You need the internet to delete the online copy.')
      return
    }
    removePlayer(player.localId)
    navigate('/', { replace: true })
  }

  return (
    <div className="setup">
      <h1>Settings</h1>
      <div className="card">
        <div className="row">
          <b>Sound</b>
          <button className="pill" onClick={() => { setMuted(player.localId, !player.muted); requestSync() }}>{player.muted ? '🔇 Off' : '🔊 On'}</button>
        </div>
        <Link className="cta" to="/move">Play on another device</Link>
        {player.unlinked && <Link className="ghost" to="/join">This player isn't online any more. Join again</Link>}
      </div>
      <form className="card" onSubmit={savePin}>
        <label className="field">New PIN
          <input name="pin" className="pin" required inputMode="numeric" pattern="\d{4}" maxLength={4} autoComplete="off" />
        </label>
        <button className="chunk">Change PIN</button>
      </form>
      {note && <p className="muted" role="status">{note}</p>}
      <button className="ghost danger" onClick={() => void remove()}>Delete {player.name}</button>
      <Link className="ghost" to="/play">Back</Link>
    </div>
  )
}

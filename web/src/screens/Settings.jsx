// @ts-check
// Sound, another device, the PIN, and deleting the player.
// No window.confirm: in-app browsers and some webviews never show it (it returns false at once), so deleting asks in the page.
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { changePin } from '../api.js'
import { removePlayer, setMuted, setPin } from '../store.js'
import { requestSync, syncAll } from '../sync.js'
import { useTheme } from '../themes/index.js'

/** @param {{ player: import('../store.js').Player }} props */
export function Settings({ player }) {
  useTheme(player.age)
  const navigate = useNavigate()
  const [note, setNote] = useState('')
  const [confirming, setConfirming] = useState(false)

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

  // Gone from this device at once; the online copy is deleted now, or by the first sync once the device is online.
  function remove() {
    removePlayer(player.localId)
    void syncAll()
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
      {confirming ? (
        <div className="card" role="alertdialog" aria-labelledby="delete-q">
          <p id="delete-q"><b>Delete {player.name} and all their progress, here and online?</b> This can't be undone.</p>
          <button className="chunk danger-fill" onClick={remove}>Yes, delete {player.name}</button>
          <button className="ghost" onClick={() => setConfirming(false)}>Keep {player.name}</button>
        </div>
      ) : (
        <button className="ghost danger" onClick={() => setConfirming(true)}>Delete {player.name}</button>
      )}
      <Link className="ghost" to="/play">Back</Link>
    </div>
  )
}

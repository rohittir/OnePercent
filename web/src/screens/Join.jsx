// @ts-check
// Join from another device: type the ID and PIN, or open a QR link (/join#brave-otter-27.4821), which joins at once.
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { normalizeCode } from '@onepercent/shared/ids.js'
import { claimPlayer } from '../api.js'
import { sound } from '../sound.js'
import { importPlayer } from '../store.js'
import { useTheme } from '../themes/index.js'

const SAYS = { 401: "That ID and PIN don't match.", 429: 'Too many tries. Wait 15 minutes, then try again.', 0: 'You need the internet to join.' }

export function Join() {
  useTheme(undefined)
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [code, setCode] = useState('')
  const [pin, setPin] = useState('')

  /** @param {string} rawCode @param {string} rawPin */
  async function join(rawCode, rawPin) {
    setBusy(true)
    setError('')
    try {
      const id = normalizeCode(rawCode)
      const res = await claimPlayer(id, rawPin)
      importPlayer({ ...res, code: id, pin: rawPin })
      sound('good')
      navigate('/play', { replace: true })
    } catch (err) {
      setError(SAYS[/** @type {keyof typeof SAYS} */ (/** @type {any} */ (err).status)] ?? 'Something went wrong. Try again.')
      setBusy(false)
    }
  }

  useEffect(() => {
    const [linkCode, linkPin] = decodeURIComponent(location.hash.slice(1)).split('.')
    if (!linkCode || !linkPin) return
    history.replaceState(null, '', location.pathname) // the PIN leaves the address bar
    setCode(linkCode)
    setPin(linkPin)
    void join(linkCode, linkPin)
  }, []) // once, on open; StrictMode's second run finds the fragment already gone

  return (
    <div className="setup">
      <h1>Join from another device</h1>
      <p className="muted">On your other device, open Settings, then "Play on another device".</p>
      <form className="card" onSubmit={(e) => { e.preventDefault(); void join(code, pin) }}>
        <label className="field">Your ID
          <input name="code" required value={code} onChange={(e) => setCode(e.target.value)} placeholder="brave-otter-27"
            autoComplete="off" autoCapitalize="none" spellCheck={false} />
        </label>
        <label className="field">Your PIN
          <input name="pin" className="pin" required inputMode="numeric" pattern="\d{4}" maxLength={4} value={pin}
            onChange={(e) => setPin(e.target.value)} autoComplete="off" />
        </label>
        {error && <p className="error" role="alert">{error}</p>}
        <button className="cta" disabled={busy}>{busy ? 'Joining…' : 'Join'}</button>
      </form>
      <Link className="ghost" to="/">Back</Link>
    </div>
  )
}

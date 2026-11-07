// @ts-check
// A new player on this device: name, age (which picks the theme) and a PIN for moving to another device later.
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { AGES } from '@onepercent/shared/bands.js'
import { addPlayer } from '../store.js'
import { requestSync } from '../sync.js'
import { sound } from '../sound.js'
import { useTheme } from '../themes/index.js'

const AGE_LIST = Array.from({ length: AGES[1] - AGES[0] + 1 }, (_, i) => AGES[0] + i)

export function NewPlayer() {
  const [age, setAge] = useState(/** @type {number | undefined} */ (undefined))
  const theme = useTheme(age)
  const navigate = useNavigate()

  /** @param {import('react').FormEvent<HTMLFormElement>} e */
  const submit = (e) => {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    addPlayer({ name: String(form.get('name')), age: Number(form.get('age')), pin: String(form.get('pin')) })
    sound('good')
    requestSync()
    navigate('/play')
  }

  return (
    <div className="setup">
      <div className="buddy">{theme.id === 'percy' ? <theme.Face /> : <div className="big-rocket" aria-hidden="true"><span>🚀</span></div>}</div>
      <h1>OnePercent</h1>
      <p className="muted">Play for 3 minutes a day. Every day you do well, the games get 1% harder, so you grow a little every day.</p>
      <form className="card" onSubmit={submit}>
        <label className="field">What's your name?
          <input name="name" required maxLength={20} pattern=".*\S.*" autoComplete="off" autoCapitalize="words" />
        </label>
        <fieldset>
          <legend>How old are you?</legend>
          <div className="ages">
            {AGE_LIST.map((a) => (
              <label key={a} className="age">
                <input type="radio" name="age" value={a} required onChange={() => setAge(a)} /><span>{a}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <label className="field">Pick a 4-digit PIN
          <input name="pin" className="pin" required inputMode="numeric" pattern="\d{4}" maxLength={4} autoComplete="off" />
          <small>You'll need it to play on another device. A grown-up can find it in Settings.</small>
        </label>
        <button className="cta">Let's go!</button>
      </form>
      <Link className="ghost" to="/join">Already playing on another device? Join here</Link>
    </div>
  )
}

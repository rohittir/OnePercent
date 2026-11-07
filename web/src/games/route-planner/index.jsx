// @ts-check
// Planning: lay down arrows to walk to the star, then press Go and watch the plan run. A bump or a short stop lights up the
// shortest route. Coding without code: plan first, then run.
import { useEffect, useMemo, useState } from 'react'
import { demoNext, useLater } from '../util.js'
import { makeRoute, MOVES } from './rules.js'

/** @param {{ settings: { size: number, rocks: number, slack: number }, say: (text: string) => void, onDone: (ok: boolean) => void }} props */
function Round({ settings, say, onDone }) {
  const { n, rocks, start, goal, best } = useMemo(() => makeRoute(settings), [settings])
  const limit = best.moves.length + settings.slack
  const [plan, setPlan] = useState(/** @type {string[]} */ ([]))
  const [me, setMe] = useState(start)
  const [trail, setTrail] = useState(/** @type {number[]} */ ([]))
  const [at, setAt] = useState(-1)
  const [running, setRunning] = useState(false)
  const [end, setEnd] = useState(/** @type {{ ok: boolean, bonk?: number, why: string } | null} */ (null))
  const later = useLater()
  useEffect(() => say(`Plan a way to the ⭐ in ${limit} moves or fewer, then Go!`), [say, limit])

  const go = () => {
    if (!plan.length || running) return
    setRunning(true)
    let [r, c] = start
    let i = 0
    /** @param {boolean} ok @param {string} [why] @param {number} [bonk] */
    const stop = (ok, why = '', bonk) => {
      setAt(-1)
      setEnd({ ok, why: ok ? '' : `${why} A ${best.moves.length}-move route: ${best.moves.join(' ')}`, bonk })
      onDone(ok)
    }
    const step = () => {
      if (i === plan.length) return stop(r === goal[0] && c === goal[1], 'Percy stopped short of the star.')
      const [dr, dc] = MOVES[plan[i]]
      const nr = r + dr, nc = c + dc
      setAt(i)
      const off = nr < 0 || nc < 0 || nr >= n || nc >= n
      if (off || rocks.has(nr * n + nc)) return stop(false, off ? 'Bonk! That is the edge.' : 'Bonk! A rock.', r * n + c)
      const from = r * n + c
      setTrail((t) => [...t, from])
      r = nr
      c = nc
      setMe([r, c])
      i++
      later(step, 320)
    }
    later(step, 320)
  }

  const onTrack = plan.every((m, i) => m === best.moves[i])
  const nextMove = onTrack && plan.length < best.moves.length ? best.moves[plan.length] : null
  const shortCells = new Set(end && !end.ok ? best.cells.map(([r, c]) => r * n + c) : [])
  const locked = running || end !== null
  return (
    <>
      <div className="route" style={{ gridTemplateColumns: `repeat(${n}, 1fr)` }}>
        {Array.from({ length: n * n }, (_, k) => (
          <div key={k} className={`sq${rocks.has(k) ? ' rock' : ''}${trail.includes(k) ? ' trail' : ''}${shortCells.has(k) ? ' short' : ''}${end?.bonk === k ? ' bonk' : ''}`}>
            {rocks.has(k) ? '🪨' : k === me[0] * n + me[1] ? <span className="me" aria-label="Percy">🐥</span> : k === goal[0] * n + goal[1] ? '⭐' : ''}
          </div>
        ))}
      </div>
      <div className="plan" aria-label={`plan: ${plan.join(' ') || 'empty'}`}>
        {Array.from({ length: limit }, (_, i) => <span key={i} className={`slot${i === at ? ' now' : ''}`}>{plan[i] ?? ''}</span>)}
      </div>
      <div className="pad">
        {Object.keys(MOVES).map((m) => (
          <button key={m} aria-label={`move ${m}`} disabled={locked} {...demoNext(!locked && m === nextMove)}
            onClick={() => setPlan((p) => (p.length < limit ? [...p, m] : p))}>{m}</button>
        ))}
        <button aria-label="undo" disabled={locked} onClick={() => setPlan((p) => p.slice(0, -1))}>⌫</button>
        <button className="go" disabled={locked} {...demoNext(!locked && onTrack && plan.length === best.moves.length)} onClick={go}>Go ▶</button>
      </div>
      <p className="why" aria-live="polite">{end?.why ?? ''}</p>
    </>
  )
}

export default {
  id: 'route-planner', name: 'Route Planner', icon: '🧭', skill: 'plan', ages: /** @type {[number, number]} */ ([7, 14]), rounds: 3,
  color: ['#6366f1', '#4338ca', '#c7d2fe'],
  how: 'Plan the way to the star with the arrows, then press Go and watch your plan run.',
  /** A bigger field every 20 levels, a rock more every 8, fewer spare moves every 20. @param {number} level */
  settings: (level) => ({ size: Math.min(6, 4 + Math.floor(level / 20)), rocks: Math.min(9, 2 + Math.floor(level / 8)), slack: Math.max(0, 2 - Math.floor(level / 20)) }),
  Round,
}

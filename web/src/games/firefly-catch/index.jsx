// @ts-check
// Self-control: tap every ladybug, leave the bees (and, from level 20, the look-alike beetles) alone. Most bugs are ladybugs, so
// tapping becomes a habit and each bee is the moment to stop ("go/no-go"). A round is a wave of ten bugs, scored as a fraction.
import { useContext, useEffect, useMemo, useRef, useState } from 'react'
import { demoNext, rand, RoundContext, shrink } from '../util.js'

const LOOK = { bug: '🐞', bee: '🐝', beetle: '🪲' }
const NAME = { bug: 'ladybug', bee: 'bee', beetle: 'beetle' }

/**
 * @param {{ settings: { life: number, gap: number, bees: number, beetles: boolean }, say: (text: string) => void,
 *   onDone: (score: number) => void, demo?: boolean }} props
 */
function Round({ settings: { life, gap, bees, beetles }, say, onDone, demo = false }) {
  const { settleMs } = useContext(RoundContext)
  const wave = useMemo(() => {
    if (demo) return /** @type {(keyof typeof LOOK)[]} */ (['bug', 'bee', 'bug'])
    const w = Array.from({ length: 10 }, () => /** @type {keyof typeof LOOK} */ (Math.random() < bees ? 'bee' : beetles && Math.random() < 0.2 ? 'beetle' : 'bug'))
    if (!w.includes('bee')) w[rand(w.length)] = 'bee'
    if (!w.includes('bug')) w[w.indexOf('bee') === 0 ? 1 : 0] = 'bug'
    return w
  }, [demo, bees, beetles])
  // The demo goes slowly, so the ghost hand can show each bug.
  const stay = demo ? 2600 : life
  const every = demo ? 1600 : gap
  const [bugs, setBugs] = useState(/** @type {{ id: number, kind: keyof typeof LOOK, x: number, y: number, state: string }[]} */ ([]))
  const [tally, setTally] = useState({ good: 0, bad: 0 })
  const over = useRef(new Set())
  const score = useRef({ good: 0, done: 0 })
  const finish = useRef(onDone)
  finish.current = onDone
  useEffect(() => say(demo ? 'Tap the ladybugs, let the bees fly away' : 'Tap the ladybugs 🐞, never the bees 🐝'), [say, demo])

  /** @param {number} id @param {string} state @param {boolean} good */
  const settle = (id, state, good) => {
    if (over.current.has(id)) return
    over.current.add(id)
    setBugs((all) => all.map((b) => (b.id === id ? { ...b, state } : b)))
    const s = score.current
    if (good) s.good++
    s.done++
    setTally({ good: s.good, bad: s.done - s.good })
    if (s.done === wave.length) finish.current(s.good / wave.length)
  }

  useEffect(() => {
    /** @type {ReturnType<typeof setTimeout>[]} */
    const timers = []
    wave.forEach((kind, id) => {
      timers.push(setTimeout(() => {
        setBugs((all) => [...all, { id, kind, x: 14 + rand(72), y: 14 + rand(62), state: 'live' }])
        // Left alone: a ladybug got away (wrong); a bee or a beetle was rightly not touched.
        timers.push(setTimeout(() => settle(id, 'gone', kind !== 'bug'), stay))
      }, settleMs + 300 + id * every))
    })
    return () => timers.forEach(clearTimeout)
  }, [wave]) // once per wave

  const next = bugs.find((b) => b.state === 'live' && b.kind === 'bug')
  const done = tally.good + tally.bad === wave.length
  return (
    <>
      <div className="meadow">
        {bugs.map((b) => (
          <button key={b.id} className={`bug ${b.state}`} style={{ left: `${b.x}%`, top: `${b.y}%` }} disabled={b.state !== 'live'} aria-label={NAME[b.kind]}
            {...demoNext(b === next)} onClick={() => settle(b.id, b.kind === 'bug' ? 'hit' : 'oops', b.kind === 'bug')}>{LOOK[b.kind]}</button>
        ))}
      </div>
      <div className="tally" aria-live="polite"><span>✓ {tally.good}</span><span>✗ {tally.bad}</span></div>
      <p className="why">{done ? `${tally.good} of ${wave.length} right.` : ''}</p>
    </>
  )
}

export default {
  id: 'firefly-catch', name: 'Firefly Catch', icon: '🐞', skill: 'stop', ages: /** @type {[number, number]} */ ([7, 14]), rounds: 3,
  color: ['#22c55e', '#15803d', '#bbf7d0'],
  how: 'Tap every ladybug before it flies off. Leave the bees alone!',
  /** Bugs stay 1% shorter and come 1% faster per level; bees get rarer (harder to stop for); beetles from level 20. @param {number} level */
  settings: (level) => ({ life: Math.round(shrink(1500, level, 600)), gap: Math.round(shrink(650, level, 280)), bees: Math.max(0.15, 0.3 - level * 0.0025), beetles: level >= 20 }),
  Round,
}

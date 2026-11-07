// @ts-check
// Pattern and logic: find the rule in the numbers and pick what comes next.
import { useEffect, useMemo, useState } from 'react'
import { mark } from '../util.js'
import { choices, makeSequence } from './rules.js'

/** @param {{ settings: { level: number }, say: (text: string) => void, onDone: (ok: boolean) => void }} props */
function Round({ settings: { level }, say, onDone }) {
  const [shown, answer, options] = useMemo(() => {
    const seq = makeSequence(level)
    const last = /** @type {number} */ (seq.pop())
    return [seq, last, choices(last)]
  }, [level])
  const [pick, setPick] = useState(/** @type {number | null} */ (null))
  useEffect(() => say('What comes next?'), [say])
  /** @param {number} n */
  const choose = (n) => {
    if (pick !== null) return
    setPick(n)
    onDone(n === answer)
  }
  return (
    <>
      <div className="seq">
        {shown.map((n, i) => <span key={i} className="chip">{n}</span>)}
        <span className={`chip q${pick !== null ? ' filled' : ''}`}>{pick !== null ? answer : '?'}</span>
      </div>
      <div className="choices">
        {options.map((n) => <button key={n} className={`chunk${mark(n, pick, answer)}`} disabled={pick !== null} onClick={() => choose(n)}>{n}</button>)}
      </div>
      <p className="why" aria-live="polite">{pick !== null && pick !== answer ? `It was ${answer}.` : ''}</p>
    </>
  )
}

export default {
  id: 'whats-next', name: "What's Next?", icon: '🧩', skill: 'logic', ages: /** @type {[number, number]} */ ([7, 14]), rounds: 5,
  color: ['#f59e0b', '#b45309', '#fde68a'],
  how: 'Find the rule in the numbers and pick what comes next.',
  /** @param {number} level */
  settings: (level) => ({ level }),
  Round,
}

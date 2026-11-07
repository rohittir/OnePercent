// @ts-check
// Working memory: tiles light up in order; tap them back.
import { useEffect, useMemo, useRef, useState } from 'react'
import { tone } from '../../sound.js'
import { demoNext, rand, shrink, useLater } from '../util.js'

/** @param {{ settings: { len: number, flash: number }, say: (text: string) => void, onDone: (ok: boolean) => void }} props */
function Round({ settings: { len, flash }, say, onDone }) {
  const seq = useMemo(() => {
    const s = []
    while (s.length < len) {
      const t = rand(9)
      if (t !== s.at(-1)) s.push(t)
    }
    return s
  }, [len])
  const [lit, setLit] = useState(-1)
  const [turn, setTurn] = useState(false)
  // Once answered: the last tile tapped, whether it was right, and the tile that was due.
  const [pick, setPick] = useState(/** @type {{ at: number, ok: boolean, due: number } | null} */ (null))
  const pos = useRef(0)
  const later = useLater()

  useEffect(() => {
    say('Watch the glow… 👀')
    /** @type {ReturnType<typeof setTimeout>[]} */
    const timers = []
    let t = 600
    for (const i of seq) {
      timers.push(setTimeout(() => { setLit(i); tone(i) }, t))
      t += flash
      timers.push(setTimeout(() => setLit(-1), t))
      t += flash / 3
    }
    timers.push(setTimeout(() => { setTurn(true); say('Your turn! Tap them in order') }, t))
    return () => timers.forEach(clearTimeout)
  }, [seq, flash, say])

  /** @param {number} i */
  const tap = (i) => {
    if (pick) return
    tone(i)
    const due = seq[pos.current]
    // Answered: no tile stays lit (a quick earlier tap's highlight may still be on).
    if (i !== due) {
      setLit(-1)
      setPick({ at: i, ok: false, due })
      return onDone(false)
    }
    if (++pos.current === seq.length) {
      setLit(-1)
      setPick({ at: i, ok: true, due })
      return onDone(true)
    }
    setLit(i)
    later(() => setLit(-1), 180)
  }

  /** @param {number} i */
  const mark = (i) => (!pick ? '' : i === pick.at ? (pick.ok ? ' picked-right' : ' picked-wrong') : !pick.ok && i === pick.due ? ' reveal' : '')
  return (
    <>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        {Array.from({ length: 9 }, (_, i) => (
          <button key={i} className={`cell${lit === i ? ' lit' : ''}${mark(i)}`} disabled={!turn || pick !== null} aria-label={`tile ${i + 1}`}
            {...demoNext(turn && pick === null && i === seq[pos.current])} onClick={() => tap(i)} />
        ))}
      </div>
      <p className="why" aria-live="polite">{pick && !pick.ok ? 'This one was next.' : ''}</p>
    </>
  )
}

export default {
  id: 'echo', name: 'Echo', icon: '🧠', skill: 'memory', ages: /** @type {[number, number]} */ ([7, 14]), rounds: 5,
  color: ['#8b5cf6', '#6d28d9', '#ddd6fe'],
  how: 'Tiles light up one by one. Tap them back in the same order.',
  /** One more tile every 10 levels, up to 9; each flash 1% quicker per level. @param {number} level */
  settings: (level) => ({ len: Math.min(9, 3 + Math.floor(level / 10)), flash: shrink(800, level, 350) }),
  Round,
}

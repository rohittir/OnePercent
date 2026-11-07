// @ts-check
// Processing speed: are the two the same? Answer before the bar runs out.
import { useEffect, useMemo, useState } from 'react'
import { mark, pairFor, rand, shrink, shuffle, TimerBar } from '../util.js'

/** @param {{ settings: { level: number, ms: number }, content: { a: string, b: string, level: number }[], say: (text: string) => void, onDone: (ok: boolean) => void }} props */
function Round({ settings: { level, ms }, content, say, onDone }) {
  const [left, right, same] = useMemo(() => {
    const pair = pairFor(content, level)
    const [a, b] = shuffle([pair.a, pair.b])
    const isSame = rand(2) === 0
    return [a, isSame ? a : b, isSame]
  }, [content, level])
  const [pick, setPick] = useState(/** @type {'same' | 'different' | 'timeout' | null} */ (null))
  const truth = same ? 'same' : 'different'
  useEffect(() => say('Same or not? Be quick!'), [say])
  /** @param {'same' | 'different' | 'timeout'} choice */
  const choose = (choice) => {
    if (pick !== null) return
    setPick(choice)
    onDone(choice === truth)
  }
  return (
    <>
      <TimerBar ms={ms} onTimeout={() => choose('timeout')} />
      <div className="pair"><span>{left}</span><span>{right}</span></div>
      <div className="yn">
        <button className={`chunk yes${mark('same', pick, truth)}`} disabled={pick !== null} onClick={() => choose('same')}>✓ Same</button>
        <button className={`chunk nope${mark('different', pick, truth)}`} disabled={pick !== null} onClick={() => choose('different')}>✗ Different</button>
      </div>
      <p className="why" aria-live="polite">{pick !== null && pick !== truth ? `They were ${truth}.` : ''}</p>
    </>
  )
}

export default {
  id: 'same-or-not', name: 'Same or Not?', icon: '⚡', skill: 'speed', ages: /** @type {[number, number]} */ ([7, 14]), rounds: 10,
  color: ['#ec4899', '#be185d', '#fbcfe8'], content: 'pairs',
  how: 'Are the two the same? Answer fast!',
  /** 1% less time per level. @param {number} level */
  settings: (level) => ({ level, ms: shrink(3_000, level, 800) }),
  Round,
}

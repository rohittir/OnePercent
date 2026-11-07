// @ts-check
// Processing speed: are the two the same? Answer before the bar runs out.
import { useEffect, useMemo } from 'react'
import { pairFor, rand, shrink, shuffle, TimerBar } from '../util.js'

/** @param {{ settings: { level: number, ms: number }, content: { a: string, b: string, level: number }[], say: (text: string) => void, onDone: (ok: boolean) => void }} props */
function Round({ settings: { level, ms }, content, say, onDone }) {
  const [left, right, same] = useMemo(() => {
    const pair = pairFor(content, level)
    const [a, b] = shuffle([pair.a, pair.b])
    const isSame = rand(2) === 0
    return [a, isSame ? a : b, isSame]
  }, [content, level])
  useEffect(() => say('Same or not? Be quick!'), [say])
  return (
    <>
      <TimerBar ms={ms} onTimeout={() => onDone(false)} />
      <div className="pair"><span>{left}</span><span>{right}</span></div>
      <div className="yn">
        <button className="chunk yes" onClick={() => onDone(same)}>✓ Same</button>
        <button className="chunk nope" onClick={() => onDone(!same)}>✗ Different</button>
      </div>
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

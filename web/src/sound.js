// @ts-check
// Synthesized sounds (no files) and haptics. The current player's mute setting is pushed in by setSoundMuted.

/** @type {AudioContext | undefined} */
let audio
let muted = false

/** @param {boolean} value */
export const setSoundMuted = (value) => {
  muted = value
}

/** @param {[number, number][]} notes frequency in Hz, duration in seconds */
function play(notes) {
  if (muted) return
  try {
    audio ??= new AudioContext()
    void audio.resume()
    let t = audio.currentTime
    for (const [freq, dur] of notes) {
      const osc = audio.createOscillator()
      const gain = audio.createGain()
      osc.type = 'triangle'
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0.2, t)
      gain.gain.exponentialRampToValueAtTime(0.001, t + dur)
      osc.connect(gain).connect(audio.destination)
      osc.start(t)
      osc.stop(t + dur)
      t += dur * 0.85
    }
  } catch { /* no sound is fine */ }
}

const SOUNDS = /** @type {const} */ ({
  tap: [[660, 0.06]],
  good: [[523, 0.09], [784, 0.14]],
  bad: [[220, 0.12], [175, 0.2]],
  win: [[523, 0.12], [659, 0.12], [784, 0.12], [1047, 0.4]],
})

/** @param {keyof typeof SOUNDS} name */
export const sound = (name) => play(/** @type {[number, number][]} */ ([...SOUNDS[name]]))
/** Each Echo tile has its own note. @param {number} i */
export const tone = (i) => play([[330 + i * 55, 0.2]])
/** Android only; iOS browsers ignore it. @param {number | number[]} pattern */
export const buzz = (pattern) => navigator.vibrate?.(pattern)

// @ts-check
// One game: its intro, its rounds, then its result. A pass (80%+) unlocks the next level at once ("Next level"); a miss offers
// "Try again". Retries have no limit, and each play is saved as it ends (shared/merge.js keeps the best of the day).
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router'
import { PASS, passed, starsFor } from '@onepercent/shared/levels.js'
import { progress } from '@onepercent/shared/progress.js'
import { contentFor } from '../content.js'
import { GAMES, gamesToday, SKILL_NAMES } from '../games/index.js'
import { rand, RoundContext, useLater } from '../games/util.js'
import { buzz, sound } from '../sound.js'
import { recordResult, today } from '../store.js'
import { requestSync } from '../sync.js'
import { useTheme } from '../themes/index.js'
import { Confetti, Stars } from './parts.jsx'

/** @typedef {import('../games/index.js').Game} Game */

// Between rounds (docs/ARCHITECTURE.md, "Between rounds"): the answer shows on the card for HOLD_MS, the card slides out in
// LEAVE_MS, the next slides in in ENTER_MS (styles.css), and only then does a timer start.
const HOLD_MS = { right: 700, wrong: 1600 }
const LEAVE_MS = 250
const ENTER_MS = 320
// "Watch me first": the round number of the demo round, and how long the ghost hand takes to reach a move and press it.
const DEMO = -1
const HAND_MS = 700

/** @param {{ player: import('../store.js').Player }} props */
export function Session({ player }) {
  const { gameId = '' } = useParams()
  // Keyed, so moving to another game starts it fresh.
  return <GameFlow key={gameId} player={player} gameId={gameId} />
}

/** @param {{ player: import('../store.js').Player, gameId: string }} props */
function GameFlow({ player, gameId }) {
  const theme = useTheme(player.age)
  const navigate = useNavigate()
  const date = useMemo(() => today(), [])
  const [run, setRun] = useState(0)
  const [result, setResult] = useState(/** @type {{ score: number, level: number } | null} */ (null))
  const game = GAMES.find((g) => g.id === gameId && player.age >= g.ages[0] && player.age <= g.ages[1])
  if (!game) return <Navigate to="/play" replace />

  const prog = progress(player, date)
  const level = prog.levels[game.skill] ?? 0
  // A game never played before opens with a demo round.
  const firstTime = !Object.values(player.days).some((results) => results[game.id])

  if (result) {
    const set = gamesToday(player, date)
    const passedToday = (/** @type {Game} */ g) => (player.days[date]?.[g.id]?.top ?? -1) >= 0
    const at = set.indexOf(game)
    const next = [...set.slice(at + 1), ...set.slice(0, Math.max(at, 0))].find((g) => g !== game && !passedToday(g))
    return <Result game={game} result={result} theme={theme} grown={prog.gained} next={next} onAgain={() => { setResult(null); setRun(run + 1) }} />
  }
  return (
    <GameRun key={run} game={game} level={level} theme={theme} grown={prog.gained} firstTime={firstTime}
      content={game.content ? contentFor(game.content, player.age) : undefined}
      onQuit={() => navigate('/play')}
      onFinish={(score) => {
        recordResult(player.localId, date, game.id, { skill: game.skill, best: score, top: passed(score) ? level : -1, playedAt: Date.now() })
        requestSync()
        setResult({ score, level })
      }} />
  )
}

/**
 * @param {{ game: Game, level: number, theme: import('../themes/index.js').Theme, grown: number, content: any, firstTime: boolean,
 *   onFinish: (score: number) => void, onQuit: () => void }} props
 */
function GameRun({ game, level, theme, grown, content, firstTime, onFinish, onQuit }) {
  const [round, setRound] = useState(0) // 0: the intro; DEMO: Watch me first; then 1 to game.rounds
  const [say, setSay] = useState('')
  const [feedback, setFeedback] = useState(/** @type {'right' | 'wrong' | null} */ (null))
  const [cheer, setCheer] = useState('')
  const [leaving, setLeaving] = useState(false)
  const [combo, setCombo] = useState(0)
  const [hand, setHand] = useState(/** @type {{ x: number, y: number, press: boolean } | null} */ (null))
  const correct = useRef(0)
  const answered = useRef(false)
  const playRef = useRef(/** @type {HTMLDivElement | null} */ (null))
  const cardRef = useRef(/** @type {HTMLDivElement | null} */ (null))
  const later = useLater()
  const demo = round === DEMO

  // Watch me first: Percy's ghost hand glides to the move the round marks as next (demoNext in games/util.js) and taps it.
  useEffect(() => {
    if (!demo) {
      setHand(null)
      return
    }
    let busy = false
    /** @type {ReturnType<typeof setTimeout>[]} */
    const timers = []
    const id = setInterval(() => {
      const target = /** @type {HTMLElement | null | undefined} */ (cardRef.current?.querySelector('[data-demo-next]:not(:disabled)'))
      if (busy || answered.current || !target || !playRef.current) return
      busy = true
      const box = playRef.current.getBoundingClientRect()
      const at = target.getBoundingClientRect()
      setHand({ x: at.left - box.left + at.width / 2 - 14, y: at.top - box.top + at.height / 2 - 8, press: false })
      timers.push(setTimeout(() => {
        setHand((h) => h && { ...h, press: true })
        target.click()
        timers.push(setTimeout(() => { busy = false; setHand((h) => h && { ...h, press: false }) }, 350))
      }, HAND_MS))
    }, 200)
    return () => { clearInterval(id); timers.forEach(clearTimeout) }
  }, [demo])
  const settings = useMemo(() => game.settings(level), [game, level])
  const vars = /** @type {any} */ ({ '--c': game.color[0], '--e': game.color[1], '--l': game.color[2] })
  // Finished plays are saved, so leaving needs no warning.
  const quit = <button className="pill" aria-label="Stop playing" onClick={onQuit}>✕</button>

  if (round === 0) {
    return (
      <div className="play" style={vars}>
        <div className="topbar">{quit}<span className="pill">Level {level}</span></div>
        <div className="intro">
          <div className="badge" aria-hidden="true">{game.icon}</div>
          <h1>{game.name}</h1>
          <p className="muted">{SKILL_NAMES[game.skill]} · Level {level}</p>
          <p className="how">{game.how}</p>
        </div>
        <button className="cta" id="go" autoFocus onClick={() => { sound('tap'); setRound(firstTime ? DEMO : 1) }}>Start</button>
        <button className="ghost" id="demo" onClick={() => { sound('tap'); setRound(firstTime ? 1 : DEMO) }}>{firstTime ? 'Skip the demo' : 'Show me how 👀'}</button>
      </div>
    )
  }

  /** @param {boolean | number} result right or wrong, or a score from 0 to 1 */
  const done = (result) => {
    if (answered.current) return // a timer that runs out after an answer, or a second tap
    answered.current = true
    if (demo) {
      setFeedback('right')
      setCheer("That's how! Your turn 👍")
      sound('good')
      later(() => {
        setLeaving(true)
        later(() => {
          answered.current = false
          setFeedback(null)
          setCheer('')
          setLeaving(false)
          setRound(1)
        }, LEAVE_MS)
      }, 1400)
      return
    }
    const credit = typeof result === 'number' ? result : result ? 1 : 0
    const ok = credit >= PASS
    correct.current += credit
    const streak = ok ? combo + 1 : 0
    const lines = theme.words[ok ? 'good' : 'bad']
    setCombo(streak)
    setFeedback(ok ? 'right' : 'wrong')
    // The instruction stays in the bubble; the cheer floats over the card.
    setCheer(ok && streak >= 3 ? `🔥 ${streak} in a row!` : lines[rand(lines.length)])
    sound(ok ? 'good' : 'bad')
    buzz(ok ? 15 : [60, 40, 60])
    later(() => {
      setLeaving(true)
      later(() => {
        answered.current = false
        setFeedback(null)
        setCheer('')
        setLeaving(false)
        if (round === game.rounds) onFinish(correct.current / game.rounds)
        else setRound(round + 1)
      }, LEAVE_MS)
    }, HOLD_MS[ok ? 'right' : 'wrong'])
  }

  return (
    <div className="play" style={vars} ref={playRef}>
      <div className="topbar">
        {quit}
        <div className="dots" aria-hidden="true">
          {Array.from({ length: game.rounds }, (_, j) => <i key={j} className={j < round - 1 ? 'on' : j === round - 1 ? (leaving ? 'on pop' : 'on cur') : ''} />)}
        </div>
        <span className="pill" aria-hidden="true">{game.icon}</span>
      </div>
      <div className="coach">
        {theme.Coach && <theme.Coach grown={grown} mood={feedback} />}
        <div className="bubble" id="say" aria-live="polite">{say}</div>
      </div>
      <section className={`board${feedback ? ` ${feedback}` : ''}`} id="area">
        {/* One card per round: it slides in, holds the answer, and slides out (styles.css, .qcard). */}
        <div key={round} ref={cardRef} className={`qcard ${leaving ? 'leave' : 'enter'}${demo ? ' demo' : ''}`}>
          {demo && !cheer && <div className="watch" role="status">👀 Watch me first</div>}
          {cheer && <div className={`cheer ${demo ? 'demo' : feedback === 'right' ? 'ok' : 'no'}`} role="status">{feedback === 'right' && !demo ? '✓ ' : ''}{cheer}</div>}
          {/* In the demo the timer holds still: no rush while watching. */}
          <RoundContext.Provider value={{ answered: feedback !== null || demo, settleMs: ENTER_MS }}>
            <game.Round settings={settings} content={content} say={setSay} onDone={done} round={demo ? 1 : round} demo={demo} />
          </RoundContext.Provider>
        </div>
      </section>
      <div className="foot">{demo ? '👀 Watch me first' : `${game.name} · question ${round} of ${game.rounds}`}{combo >= 2 ? ` · 🔥 ${combo} in a row` : ''}</div>
      {hand && <div className={`hand${hand.press ? ' press' : ''}`} style={{ transform: `translate(${hand.x}px, ${hand.y}px)` }} aria-hidden="true">👆</div>}
    </div>
  )
}

/**
 * @param {{ game: Game, result: { score: number, level: number }, theme: import('../themes/index.js').Theme, grown: number,
 *   next: Game | undefined, onAgain: () => void }} props
 */
function Result({ game, result: { score, level }, theme, grown, next, onAgain }) {
  const ok = passed(score)
  useEffect(() => {
    sound(ok ? 'win' : 'bad')
    buzz(ok ? [30, 50, 30] : 80)
  }, [ok])
  const vars = /** @type {any} */ ({ '--c': game.color[0], '--e': game.color[1], '--l': game.color[2] })
  return (
    <>
      {ok && <Confetti />}
      <div className="done result" style={vars}>
        <theme.Cheer grown={grown} ok={ok} />
        <h1>{ok ? `Level ${level + 1} unlocked!` : 'So close!'}</h1>
        <Stars n={starsFor(score)} />
        <p className="muted">
          {ok ? theme.words.grew : `${game.name}: ${Math.round(score * 100)}%. Get 80% to unlock the next 1%. Try as many times as you like.`}
        </p>
        <button className="cta" id="again" autoFocus onClick={() => { sound('tap'); onAgain() }}>{ok ? 'Next level ▶' : 'Try again ↻'}</button>
        {next && <Link className="chunk" id="next-game" to={`/play/${next.id}`}>Next game: {next.icon} {next.name}</Link>}
        <Link className="ghost" id="home" to="/play">Home</Link>
      </div>
    </>
  )
}

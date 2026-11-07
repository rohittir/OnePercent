// @ts-check
// Plays today's unfinished games in order. Each game's result is saved as it ends, so stopping keeps the finished ones.
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { progress } from '@onepercent/shared/progress.js'
import { pickToday } from '@onepercent/shared/today.js'
import { contentFor } from '../content.js'
import { GAMES, SKILL_NAMES } from '../games/index.js'
import { rand, useLater } from '../games/util.js'
import { buzz, sound } from '../sound.js'
import { recordResult, today } from '../store.js'
import { requestSync } from '../sync.js'
import { useTheme } from '../themes/index.js'

/** @param {{ player: import('../store.js').Player }} props */
export function Session({ player }) {
  const theme = useTheme(player.age)
  const navigate = useNavigate()
  const date = useMemo(() => today(), [])
  const set = useMemo(() => pickToday(GAMES, { age: player.age, date }), [player.age, date])
  // Today's levels come from the days before today, so they hold still while today's results arrive.
  const { levels, daysPlayed } = useMemo(() => progress(player, date), [player.startLevels, date])
  const todo = set.filter((g) => !player.days[date]?.[g.id])

  useEffect(() => {
    if (!todo.length) navigate('/done', { replace: true })
  }, [todo.length, navigate])
  if (!todo.length) return null

  const game = todo[0]
  const level = levels[game.skill] ?? 0
  return (
    <GameRun key={game.id} game={game} index={set.indexOf(game)} total={set.length} level={level} theme={theme} days={daysPlayed}
      content={game.content ? contentFor(game.content, player.age) : undefined}
      onQuit={() => navigate('/play')}
      onFinish={(score) => {
        recordResult(player.localId, date, game.id, { skill: game.skill, score, level, rounds: game.rounds, playedAt: Date.now() })
        requestSync()
      }} />
  )
}

/**
 * One game: its intro, then its rounds with feedback between them.
 * @param {{ game: import('../games/index.js').Game, index: number, total: number, level: number, theme: import('../themes/index.js').Theme,
 *   days: number, content: any, onFinish: (score: number) => void, onQuit: () => void }} props
 */
function GameRun({ game, index, total, level, theme, days, content, onFinish, onQuit }) {
  const [round, setRound] = useState(0)
  const [say, setSay] = useState('')
  const [feedback, setFeedback] = useState(/** @type {'right' | 'wrong' | null} */ (null))
  const [combo, setCombo] = useState(0)
  const correct = useRef(0)
  const answered = useRef(false)
  const later = useLater()
  const settings = useMemo(() => game.settings(level), [game, level])
  const vars = /** @type {any} */ ({ '--c': game.color[0], '--e': game.color[1], '--l': game.color[2] })
  const quit = <button className="pill" aria-label="Stop playing" onClick={() => { if (confirm('Stop for now? Finished games are saved.')) onQuit() }}>✕</button>

  if (round === 0) {
    return (
      <div className="play" style={vars}>
        <div className="topbar">{quit}<span className="pill">Game {index + 1} of {total}</span></div>
        <div className="intro">
          <div className="badge" aria-hidden="true">{game.icon}</div>
          <h1>{game.name}</h1>
          <p className="muted">{SKILL_NAMES[game.skill]}</p>
          <p className="how">{game.how}</p>
        </div>
        <button className="cta" id="go" autoFocus onClick={() => { sound('tap'); setRound(1) }}>Start</button>
      </div>
    )
  }

  /** @param {boolean} ok */
  const done = (ok) => {
    if (answered.current) return // a timer that runs out after an answer, or a second tap
    answered.current = true
    if (ok) correct.current++
    const streak = ok ? combo + 1 : 0
    const lines = theme.words[ok ? 'good' : 'bad']
    setCombo(streak)
    setFeedback(ok ? 'right' : 'wrong')
    setSay(ok && streak >= 3 ? `🔥 ${streak} in a row!` : lines[rand(lines.length)])
    sound(ok ? 'good' : 'bad')
    buzz(ok ? 15 : [60, 40, 60])
    later(() => {
      answered.current = false
      setFeedback(null)
      if (round === game.rounds) onFinish(correct.current / game.rounds)
      else setRound(round + 1)
    }, ok ? 700 : 1100)
  }

  return (
    <div className="play" style={vars}>
      <div className="topbar">
        {quit}
        <div className="dots" aria-hidden="true">
          {Array.from({ length: game.rounds }, (_, j) => <i key={j} className={j < round - 1 ? 'on' : j === round - 1 ? 'on cur' : ''} />)}
        </div>
        <span className="pill" aria-hidden="true">{game.icon}</span>
      </div>
      <div className="coach">
        {theme.Coach && <theme.Coach days={days} mood={feedback} />}
        <div className="bubble" id="say" aria-live="polite">{say}</div>
      </div>
      <section className={`board${feedback ? ` ${feedback}` : ''}`} id="area">
        <game.Round key={round} settings={settings} content={content} say={setSay} onDone={done} />
      </section>
      <div className="foot">{game.name} · round {round} of {game.rounds}{combo >= 2 ? ` · 🔥 ${combo} in a row` : ''}</div>
    </div>
  )
}

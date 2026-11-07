// @ts-check
// Today's games in the player's theme. Every game can be played again at any time; a pass (80%+) unlocks its next level at once.
import { Link } from 'react-router'
import { starsFor } from '@onepercent/shared/levels.js'
import { progress } from '@onepercent/shared/progress.js'
import { GAMES, gamesToday } from '../games/index.js'
import { setMuted, today } from '../store.js'
import { requestSync } from '../sync.js'
import { sound } from '../sound.js'
import { useTheme } from '../themes/index.js'
import { Stars, SyncStatus } from './parts.jsx'

/** @param {{ player: import('../store.js').Player }} props */
export function Home({ player }) {
  const theme = useTheme(player.age)
  const date = today()
  const set = gamesToday(player, date)
  // Every other game that fits the age stays one tap away.
  const more = GAMES.filter((g) => !set.includes(g) && player.age >= g.ages[0] && player.age <= g.ages[1])
  const prog = progress(player, date)
  const results = player.days[date] ?? {}
  const passedToday = (/** @type {import('../games/index.js').Game} */ g) => (results[g.id]?.top ?? -1) >= 0
  const done = set.every(passedToday)
  const next = set.find((g) => !passedToday(g)) ?? set[0]
  const day = Object.keys(results).length ? prog.daysPlayed : prog.daysPlayed + 1
  const games = set.map((game) => ({
    game,
    to: `/play/${game.id}`,
    status: <>Level {prog.levels[game.skill]}{results[game.id] && <> · <Stars n={starsFor(results[game.id].best)} /></>}</>,
  }))

  return (
    <div className="home">
      <div className="topbar">
        <span className="pill" aria-label={`${prog.streak} day streak`}>🔥 {prog.streak}</span>
        <span className="topbar">
          <Link className="pill" to="/" aria-label="Who's playing">👥</Link>
          <button className="pill" aria-label={player.muted ? 'Turn sound on' : 'Turn sound off'}
            onClick={() => { setMuted(player.localId, !player.muted); requestSync() }}>{player.muted ? '🔇' : '🔊'}</button>
          <Link className="pill" to="/settings" aria-label="Settings">⚙️</Link>
          <span className="pill">{theme.stat(prog)}</span>
        </span>
      </div>
      <div className="cols">
        <section className="hero"><theme.HomeHero name={player.name} prog={prog} day={day} done={done} count={set.length} /></section>
        <section className="sheet">
          <theme.HomeGames games={games} day={day} done={done} />
          {done && <p className="muted center">{theme.words.allDone}</p>}
          <Link className="cta" id="play" to={`/play/${next.id}`} onClick={() => sound('tap')}>{done ? theme.words.again : theme.words.start}</Link>
          {more.length > 0 && (
            <nav className="more" aria-label="More games">
              <b>More games</b>
              <div className="more-list">{more.map((g) => <Link key={g.id} className="pill" to={`/play/${g.id}`}>{g.icon} {g.name}</Link>)}</div>
            </nav>
          )}
          <SyncStatus player={player} />
        </section>
      </div>
    </div>
  )
}

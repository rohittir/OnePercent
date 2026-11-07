// The four prototype games for design/new-games.html. Each: render(card, ctx) draws one round and calls ctx.answer(score, why, picked, right)
// once; demo(card, hand, ctx) plays the round the way Percy's ghost hand shows it; dial(level) is the 1% dial.

// ---------- Sort Switch: changing rules ----------
GAMES.sort = {
  name: 'Sort Switch', icon: '🔀', skill: 'Switch: changing rules (cognitive flexibility)', ages: 'ages 7–14', rounds: 6,
  about: `<p>Sort each card into the basket it matches. The banner shows the rule: by <b>colour</b> or by <b>shape</b>. When the rule changes, the banner flashes "Switch!".
    Every card matches one basket by colour and the other by shape, so the child must follow the rule, not the habit.</p>
    <p>Based on the card-sorting task used to study flexible thinking in children. Galaxy version: cargo crates loaded onto two ships.</p>`,
  dial: (level) => ({ every: Math.max(1, 3 - Math.floor(level / 15)), mixed: level >= 45 }),
  dialText(level) {
    const d = this.dial(level)
    return d.mixed ? 'The rule can change on any card (level 45 and up).' : `The rule switches every ${d.every} card${d.every > 1 ? 's' : ''}: every 3 at first, every 2 from level 15, every card from level 30, at random from level 45.`
  },
  render(card, ctx) {
    const d = this.dial(ctx.level)
    const rule = ctx.demo ? 'colour' : d.mixed ? pick(['colour', 'shape']) : Math.floor(ctx.round / d.every) % 2 ? 'shape' : 'colour'
    const [sa, sb] = shuffle(SHAPES)
    const [ca, cb] = shuffle(Object.keys(COLORS))
    // The card always matches one basket by colour and the other by shape.
    const test = rand(2) ? { s: sa, c: cb } : { s: sb, c: ca }
    const right = rule === 'colour' ? (test.c === ca ? 0 : 1) : (test.s === sa ? 0 : 1)
    const switched = !ctx.demo && ctx.state.rule && ctx.state.rule !== rule
    if (!ctx.demo) ctx.state.rule = rule
    ctx.say(rule === 'colour' ? 'Sort by colour 🎨' : 'Sort by shape 🔷')
    card.insertAdjacentHTML('beforeend', `
      <div class="rule ${rule}${switched ? ' flash' : ''}">${switched ? '🔄 Switch! ' : ''}${rule === 'colour' ? '🎨 Colour' : '🔷 Shape'}</div>
      <div class="sort-card">${shape(test.s, test.c, 76)}</div>
      <div class="baskets">${[[sa, ca], [sb, cb]].map(([s, c], k) => `<button class="basket" data-k="${k}" aria-label="basket ${k + 1}">${shape(s, c, 44)}<span>🧺</span></button>`).join('')}</div>
      <p class="why"></p>`)
    const baskets = card.querySelectorAll('.basket')
    const why = rule === 'colour' ? `Colour rule: ${test.c} goes with ${test.c}.` : `Shape rule: the ${test.s} goes with the ${test.s}.`
    baskets.forEach((b) => { b.onclick = () => ctx.answer(+b.dataset.k === right ? 1 : 0, +b.dataset.k === right ? '' : why, b, baskets[right]) })
    card.rightEl = baskets[right]
  },
  async demo(card, hand, ctx) {
    ctx.say('Colour rule: same colour, same basket')
    await hand.tap(card.rightEl, ctx.run)
  },
}

// ---------- Firefly Catch: holding back ----------
GAMES.firefly = {
  name: 'Firefly Catch', icon: '🐞', skill: 'Stop: holding back (inhibitory control)', ages: 'ages 7–14', rounds: 3,
  about: `<p>Ladybugs and bees pop up in the meadow. Tap every ladybug 🐞 before it flies off, and leave every bee 🐝 alone.
    Most bugs are ladybugs, so tapping becomes a habit, and each bee is the moment to stop. A round is a wave of ten bugs.</p>
    <p>From level 20, beetles 🪲 sneak in: they look like ladybugs but must be left alone too. Galaxy version: catch stars, dodge asteroids.</p>`,
  dial: (level) => ({ life: Math.round(shrink(1500, level, 600)), gap: Math.round(shrink(650, level, 280)), bees: Math.max(0.15, 0.3 - level * 0.0025), beetles: level >= 20 }),
  dialText(level) {
    const d = this.dial(level)
    return `Each bug stays ${(d.life / 1000).toFixed(2)} s, and a new one comes every ${(d.gap / 1000).toFixed(2)} s. Bees are ${Math.round(d.bees * 100)}% of the bugs: the rarer they are, the harder it is to stop for one${d.beetles ? '. Beetles 🪲 join as look-alikes.' : '.'}`
  },
  render(card, ctx) {
    const d = this.dial(ctx.level)
    const kinds = ctx.demo ? ['bug', 'bee'] : Array.from({ length: 10 }, () => (Math.random() < d.bees ? 'bee' : d.beetles && Math.random() < 0.2 ? 'beetle' : 'bug'))
    if (!ctx.demo && !kinds.includes('bee')) kinds[rand(kinds.length)] = 'bee'
    // In the demo each bug waits longer, so the ghost hand has time to show it.
    const life = ctx.demo ? 2600 : d.life
    const gap = ctx.demo ? 2900 : d.gap
    card.insertAdjacentHTML('beforeend', `<div class="meadow"></div>
      <div class="tally"><span>✓ <b class="good">0</b></span><span>✗ <b class="bad">0</b></span></div><p class="why"></p>`)
    ctx.say('Tap the ladybugs 🐞, never the bees 🐝')
    const meadow = card.querySelector('.meadow')
    let good = 0, bad = 0, done = 0
    const settle = (ok, x, y, text) => {
      ok ? good++ : bad++
      card.querySelector('.good').textContent = good
      card.querySelector('.bad').textContent = bad
      meadow.insertAdjacentHTML('beforeend', `<span class="mark ${ok ? 'ok' : 'no'}" style="left:${x}%;top:${y}%">${text}</span>`)
      if (++done === kinds.length) ctx.answer(good / kinds.length, ctx.demo ? '' : `${good} of ${kinds.length} right.`)
    }
    kinds.forEach((kind, i) => ctx.later(() => {
      if (ctx.run !== run) return
      const x = 14 + rand(72), y = 14 + rand(62)
      const b = document.createElement('button')
      b.className = 'bug'
      b.dataset.kind = kind
      b.textContent = { bug: '🐞', bee: '🐝', beetle: '🪲' }[kind]
      b.style.left = `${x}%`
      b.style.top = `${y}%`
      meadow.append(b)
      let over = false
      b.onclick = () => {
        if (over) return
        over = true
        b.classList.add(kind === 'bug' ? 'hit' : 'oops')
        settle(kind === 'bug', x, y, kind === 'bug' ? '+1' : 'Ouch!')
        later(() => b.remove(), 400)
      }
      ctx.later(() => {
        if (over) return
        over = true
        b.classList.add('gone')
        settle(kind !== 'bug', x, y, kind === 'bug' ? 'Missed' : 'Good stop!')
        later(() => b.remove(), 400)
      }, life)
    }, 300 + i * gap))
  },
  async demo(card, hand, ctx) {
    ctx.say('A ladybug: tap it!')
    await hand.tap(card.querySelector('.bug[data-kind=bug]'), ctx.run)
    await wait(2500)
    const bee = card.querySelector('.bug[data-kind=bee]')
    if (!bee) return
    ctx.say('A bee: hands off! Let it fly away.')
    await hand.to(bee, ctx.run)
    hand.hide()
  },
}

// ---------- Route Planner: thinking ahead ----------
const MOVES = { '←': [0, -1], '↑': [-1, 0], '↓': [1, 0], '→': [0, 1] }

/** Shortest route by breadth-first search: { moves, cells } or null. Cells are [row, col]. */
function shortest(n, rocks, start, goal) {
  const key = (r, c) => r * n + c
  const prev = new Map([[key(...start), null]])
  const queue = [start]
  while (queue.length) {
    const [r, c] = queue.shift()
    if (r === goal[0] && c === goal[1]) break
    for (const [m, [dr, dc]] of Object.entries(MOVES)) {
      const nr = r + dr, nc = c + dc
      if (nr < 0 || nc < 0 || nr >= n || nc >= n || rocks.has(key(nr, nc)) || prev.has(key(nr, nc))) continue
      prev.set(key(nr, nc), [r, c, m])
      queue.push([nr, nc])
    }
  }
  if (!prev.has(key(...goal))) return null
  const moves = [], cells = []
  for (let cur = goal; prev.get(key(...cur)); ) {
    const [r, c, m] = prev.get(key(...cur))
    moves.unshift(m)
    cells.unshift(cur)
    cur = [r, c]
  }
  return { moves, cells }
}

GAMES.route = {
  name: 'Route Planner', icon: '🧭', skill: 'Plan: thinking ahead (planning)', ages: 'ages 7–14', rounds: 3,
  about: `<p>Plan Percy's walk to the star with the arrow buttons, then press <b>Go</b> and watch the plan run. Rocks block the way.
    If Percy bumps into something or stops short, the shortest route lights up, so the child sees a better plan.</p>
    <p>Coding without code: plan first, then run. Galaxy version: steer the rocket around asteroids.</p>`,
  dial: (level) => ({ size: Math.min(6, 4 + Math.floor(level / 20)), rocks: Math.min(9, 2 + Math.floor(level / 8)), slack: Math.max(0, 2 - Math.floor(level / 20)) }),
  dialText(level) {
    const d = this.dial(level)
    return `A ${d.size}×${d.size} field with ${d.rocks} rocks, and ${d.slack ? `${d.slack} spare move${d.slack > 1 ? 's' : ''}` : 'no spare moves'} beyond the shortest route.`
  },
  puzzle(d) {
    const n = d.size
    for (;;) {
      const start = [n - 1, rand(2)], goal = [rand(2), n - 1 - rand(2)]
      const rocks = new Set()
      while (rocks.size < d.rocks) {
        const k = rand(n * n)
        if (k !== start[0] * n + start[1] && k !== goal[0] * n + goal[1]) rocks.add(k)
      }
      const best = shortest(n, rocks, start, goal)
      // A puzzle worth planning: solvable, and longer than a straight line.
      if (best && best.moves.length >= n) return { n, rocks, start, goal, best }
    }
  },
  render(card, ctx) {
    const d = this.dial(ctx.level)
    const { n, rocks, start, goal, best } = this.puzzle(d)
    const limit = best.moves.length + d.slack
    const plan = []
    ctx.say(`Plan a way to the ⭐ in ${limit} moves or fewer, then Go!`)
    card.insertAdjacentHTML('beforeend', `
      <div class="route" style="grid-template-columns:repeat(${n},1fr)">${Array.from({ length: n * n }, (_, k) =>
        `<div class="sq${rocks.has(k) ? ' rock' : ''}" data-k="${k}">${rocks.has(k) ? '🪨' : k === goal[0] * n + goal[1] ? '⭐' : ''}</div>`).join('')}</div>
      <div class="plan"></div>
      <div class="pad">${Object.keys(MOVES).map((m) => `<button data-m="${m}" aria-label="move ${m}">${m}</button>`).join('')}
        <button class="undo" aria-label="undo">⌫</button><button class="go">Go ▶</button></div>
      <p class="why"></p>`)
    const sq = (r, c) => card.querySelector(`.sq[data-k="${r * n + c}"]`)
    const me = document.createElement('span')
    me.innerHTML = PERCY.replace('<svg', '<svg class="me"')
    sq(...start).append(me)
    const drawPlan = (at = -1) => {
      card.querySelector('.plan').innerHTML = Array.from({ length: limit }, (_, i) => `<span class="slot${i === at ? ' now' : ''}">${plan[i] ?? ''}</span>`).join('')
    }
    drawPlan()
    card.querySelectorAll('[data-m]').forEach((b) => { b.onclick = () => { if (plan.length < limit) { plan.push(b.dataset.m); drawPlan() } } })
    card.querySelector('.undo').onclick = () => { plan.pop(); drawPlan() }
    const fail = (why) => {
      best.cells.forEach(([r, c]) => sq(r, c).classList.add('short'))
      ctx.answer(0, `${why} A ${best.moves.length}-move route: ${best.moves.join(' ')}`)
    }
    card.querySelector('.go').onclick = async () => {
      if (!plan.length) return
      card.querySelectorAll('.pad button').forEach((b) => { b.disabled = true })
      let [r, c] = start
      for (const [i, m] of plan.entries()) {
        drawPlan(i)
        await wait(320)
        const [dr, dc] = MOVES[m]
        const nr = r + dr, nc = c + dc
        if (nr < 0 || nc < 0 || nr >= n || nc >= n || rocks.has(nr * n + nc)) {
          sq(r, c).classList.add('bonk')
          return fail(nr < 0 || nc < 0 || nr >= n || nc >= n ? 'Bonk! That is the edge.' : 'Bonk! A rock.')
        }
        sq(r, c).classList.add('trail')
        r = nr; c = nc
        sq(r, c).append(me)
      }
      if (r === goal[0] && c === goal[1]) ctx.answer(1, '')
      else fail('Percy stopped short of the star.')
    }
    card.best = best
  },
  async demo(card, hand, ctx) {
    ctx.say('First I plan every step, then I press Go')
    for (const m of card.best.moves) await hand.tap(card.querySelector(`[data-m="${m}"]`), ctx.run)
    await hand.tap(card.querySelector('.go'), ctx.run)
  },
}

// ---------- Pattern Grid: finding the rule ----------
const ATTRS = { shape: SHAPES, colour: Object.keys(COLORS), count: [1, 2, 3] }
const tile = (t) => Array.from({ length: t.count }, () => shape(t.shape, t.colour, [0, 40, 28, 22][t.count])).join('')

GAMES.pattern = {
  name: 'Pattern Grid', icon: '🔳', skill: 'Logic: finding the rule (reasoning)', ages: 'ages 7–14', rounds: 5,
  about: `<p>Every row and column of the grid follows a rule. Tap the tile that fits the empty square. No words or numbers, so it works at any age and in any language.</p>
    <p>The kind of puzzle used in reasoning tests: one rule at first, more as the level rises. Galaxy version: star-map tiles.</p>`,
  dial: (level) => ({ rules: 1 + Math.min(2, Math.floor(level / 15)), latin: level >= 25, options: level >= 40 ? 6 : 4 }),
  dialText(level) {
    const d = this.dial(level)
    return `${d.rules} of shape, colour and count change across the grid${d.latin ? ', some as "once in every row and column"' : ''}; ${d.options} tiles to choose from.`
  },
  puzzle(d) {
    const varying = shuffle(Object.keys(ATTRS)).slice(0, d.rules)
    const rules = {}
    for (const a of Object.keys(ATTRS)) {
      const perm = shuffle(ATTRS[a])
      const kind = varying.includes(a) ? pick(d.latin ? ['row', 'col', 'latin'] : ['row', 'col']) : 'same'
      rules[a] = { kind, at: (r, c) => perm[kind === 'row' ? r : kind === 'col' ? c : kind === 'latin' ? (r + c) % 3 : 0] }
    }
    const cell = (r, c) => Object.fromEntries(Object.keys(ATTRS).map((a) => [a, rules[a].at(r, c)]))
    const answer = cell(2, 2)
    const seen = new Set([JSON.stringify(answer)])
    const options = [answer]
    for (let tries = 0; options.length < d.options && tries < 200; tries++) {
      const a = tries < 100 ? pick(varying) : pick(Object.keys(ATTRS))
      const other = { ...answer, [a]: pick(ATTRS[a].filter((v) => v !== answer[a])) }
      if (!seen.has(JSON.stringify(other))) { seen.add(JSON.stringify(other)); options.push(other) }
    }
    const words = { row: (a) => `each row keeps one ${a}`, col: (a) => `each column keeps one ${a}`, latin: (a) => `every ${a} appears once in each row and column` }
    const why = varying.map((a) => words[rules[a].kind](a)).join('; ')
    return { cell, answer, options: shuffle(options), why: why[0].toUpperCase() + why.slice(1) + '.' }
  },
  render(card, ctx) {
    const d = this.dial(ctx.level)
    const { cell, answer, options, why } = this.puzzle(d)
    ctx.say('Which tile fits the empty square?')
    card.insertAdjacentHTML('beforeend', `
      <div class="matrix">${Array.from({ length: 9 }, (_, k) => k === 8 ? '<div class="mcell gap">?</div>' : `<div class="mcell">${tile(cell(Math.floor(k / 3), k % 3))}</div>`).join('')}</div>
      <div class="opts${options.length > 4 ? ' six' : ''}">${options.map((o, i) => `<button class="mcell" data-i="${i}" aria-label="tile ${i + 1}">${tile(o)}</button>`).join('')}</div>
      <p class="why"></p>`)
    const buttons = card.querySelectorAll('.opts button')
    const right = options.indexOf(answer)
    buttons.forEach((b) => {
      b.onclick = () => {
        const gap = card.querySelector('.gap')
        gap.innerHTML = tile(answer)
        gap.classList.add('filled')
        ctx.answer(+b.dataset.i === right ? 1 : 0, +b.dataset.i === right ? '' : why, b, buttons[right])
      }
    })
    card.rightEl = buttons[right]
    card.why = why
  },
  async demo(card, hand, ctx) {
    ctx.say(card.why)
    await wait(1600)
    await hand.tap(card.rightEl, ctx.run)
  },
}

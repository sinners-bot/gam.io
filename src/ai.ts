// ===== AI opponents =====
type Level = "easy" | "medium" | "hard";
const rnd = <T,>(a: T[]): T => a[Math.floor(Math.random() * a.length)];
const clone = (s: any) => structuredClone(s);

// Generic alpha-beta over a game module. Works with "move again" games because it checks whose turn it is at each node.
function minimax(mod: Mod, s: any, bot: number, depth: number, a: number, b: number, moves: (s: any) => any[], ev: (s: any, bot: number) => number, budget: { n: number }): number {
  const t = mod.turn(s);
  if (depth <= 0 || t == null || budget.n <= 0) return ev(s, bot);
  const ms = moves(s);
  if (!ms.length) return ev(s, bot);
  const max = t === bot;
  let best = max ? -Infinity : Infinity;
  for (const m of ms) {
    budget.n--;
    const c = clone(s), r = mod.move(c, t, m);
    if (r.err) continue;
    const v = r.done ? (r.winner == null ? 0 : r.winner === bot ? 1e6 + depth : -1e6 - depth) : minimax(mod, c, bot, depth - 1, a, b, moves, ev, budget);
    if (max) { if (v > best) best = v; if (best > a) a = best; } else { if (v < best) best = v; if (best < b) b = best; }
    if (a >= b) break;
  }
  return best === Infinity || best === -Infinity ? ev(s, bot) : best;
}
function bestBySearch(mod: Mod, s: any, bot: number, depth: number, moves: (s: any) => any[], ev: (s: any, bot: number) => number, nodes = 60000) {
  const budget = { n: nodes };
  let best: any[] = [], bestV = -Infinity;
  for (const m of shuffle(moves(s).slice())) {
    const c = clone(s), r = mod.move(c, bot, m);
    if (r.err) continue;
    const v = r.done ? (r.winner === bot ? 2e6 : r.winner == null ? 0 : -2e6) : minimax(mod, c, bot, depth - 1, -Infinity, Infinity, moves, ev, budget);
    if (v > bestV) { bestV = v; best = [m]; } else if (v === bestV) best.push(m);
  }
  return best.length ? rnd(best) : null;
}
// Difficulty: depth per level, and how often easier bots just play a random legal move.
function pickSearch(mod: Mod, s: any, bot: number, level: Level, depths: [number, number, number], moves: (s: any) => any[], ev: (s: any, bot: number) => number, nodes?: number) {
  const ms = moves(s);
  if (!ms.length) return null;
  const blunder = level === "easy" ? 0.45 : level === "medium" ? 0.08 : 0;
  if (Math.random() < blunder) return rnd(ms);
  const d = depths[level === "easy" ? 0 : level === "medium" ? 1 : 2];
  return bestBySearch(mod, s, bot, d, moves, ev, nodes);
}

// --- per-game move lists and evaluations ---
const tttMoves = (s: any) => s.board.map((v: number, i: number) => (v ? -1 : i)).filter((i: number) => i >= 0).map((i: number) => ({ i }));
const c4Moves = (s: any) => [3, 2, 4, 1, 5, 0, 6].filter((c) => s.board[c] === 0).map((col) => ({ col }));
function c4Eval(s: any, bot: number) {
  const b = s.board, me = bot + 1, op = 2 - bot; let sc = 0;
  for (let r = 0; r < 6; r++) if (b[r * 7 + 3] === me) sc += 3; else if (b[r * 7 + 3] === op) sc -= 3;
  for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]) for (let r = 0; r < 6; r++) for (let c = 0; c < 7; c++) {
    let m = 0, o = 0, ok = true;
    for (let k = 0; k < 4; k++) { const rr = r + dr * k, cc = c + dc * k; if (rr < 0 || rr > 5 || cc < 0 || cc > 6) { ok = false; break; } const v = b[rr * 7 + cc]; if (v === me) m++; else if (v === op) o++; }
    if (!ok || (m && o)) continue;
    sc += m === 3 ? 50 : m === 2 ? 5 : 0; sc -= o === 3 ? 60 : o === 2 ? 5 : 0;
  }
  return sc;
}
function utttMoves(s: any) {
  const out: any[] = [];
  for (let b = 0; b < 9; b++) if (!s.small[b] && (s.next < 0 || s.next === b)) for (let c = 0; c < 9; c++) if (!s.cells[b * 9 + c]) out.push({ b, c });
  return out;
}
function utttEval(s: any, bot: number) {
  const me = bot + 1, op = 2 - bot; let sc = 0;
  s.small.forEach((v: number, i: number) => { const w = i === 4 ? 150 : i % 2 === 0 ? 120 : 100; if (v === me) sc += w; else if (v === op) sc -= w; });
  for (const l of LINES3) { const vs = l.map((i) => s.small[i]); const m = vs.filter((v) => v === me).length, o = vs.filter((v) => v === op).length; if (!o && m === 2) sc += 200; if (!m && o === 2) sc -= 200; }
  for (let b = 0; b < 9; b++) if (!s.small[b]) { const c = s.cells[b * 9 + 4]; if (c === me) sc += 6; else if (c === op) sc -= 6; }
  return sc;
}
const RV_W = [120, -20, 20, 5, 5, 20, -20, 120, -20, -40, -5, -5, -5, -5, -40, -20, 20, -5, 15, 3, 3, 15, -5, 20, 5, -5, 3, 3, 3, 3, -5, 5, 5, -5, 3, 3, 3, 3, -5, 5, 20, -5, 15, 3, 3, 15, -5, 20, -20, -40, -5, -5, -5, -5, -40, -20, 120, -20, 20, 5, 5, 20, -20, 120];
const rvMv = (s: any) => rvMoves(s.board, s.turn + 1).map((i) => ({ i }));
function rvEval(s: any, bot: number) {
  const me = bot + 1; let sc = 0;
  s.board.forEach((v: number, i: number) => { if (v === me) sc += RV_W[i]; else if (v) sc -= RV_W[i]; });
  return sc + 8 * (rvMoves(s.board, me).length - rvMoves(s.board, 3 - me).length);
}
const ckMv = (s: any) => ckMoves(s, s.turn).map(([from, to]) => ({ from, to }));
function ckEval(s: any, bot: number) {
  let sc = 0;
  s.board.forEach((v: number, i: number) => {
    if (!v) return;
    const mine = ckOwn(v, bot), king = v === 2 || v === 4, r = i >> 3;
    const adv = v === 1 ? 7 - r : v === 3 ? r : 0;
    const val = (king ? 165 : 100) + adv * 3 + ((i & 7) > 1 && (i & 7) < 6 ? 4 : 0);
    sc += mine ? val : -val;
  });
  return sc;
}
const PV: Record<string, number> = { P: 100, N: 320, B: 335, R: 500, Q: 900, K: 0 };
function chMv(s: any) {
  const col = s.turn === 0 ? "w" : "b";
  return chLegal(s, col).map((m) => ({ from: m.from, to: m.to, promo: "Q", cap: s.board[m.to] ? PV[s.board[m.to][1]] : 0 })).sort((a, b) => b.cap - a.cap);
}
function chEval(s: any, bot: number) {
  const me = bot === 0 ? "w" : "b"; let sc = 0;
  s.board.forEach((p: string, i: number) => {
    if (!p) return;
    const r = i >> 3, c = i & 7, center = 3.5 - Math.max(Math.abs(r - 3.5), Math.abs(c - 3.5));
    let v = PV[p[1]] + (p[1] === "N" || p[1] === "B" ? center * 8 : p[1] === "P" ? (p[0] === "w" ? 6 - r : r - 1) * 6 + (c > 1 && c < 6 ? center * 4 : 0) : 0);
    sc += p[0] === me ? v : -v;
  });
  return s.check ? sc + (s.turn === bot ? -30 : 30) : sc;
}
const mcMv = (s: any) => [0, 1, 2, 3, 4, 5].filter((k) => s.pits[s.turn * 7 + k] > 0).reverse().map((pit) => ({ pit }));
function mcEval(s: any, bot: number) {
  const p = s.pits, side = (q: number) => p.slice(q * 7, q * 7 + 6).reduce((a: number, b: number) => a + b, 0);
  return (p[bot * 7 + 6] - p[(1 - bot) * 7 + 6]) * 10 + (side(bot) - side(1 - bot));
}

// --- Dots & Boxes heuristics ---
function dbSides(s: any, b: number) { const r = Math.floor(b / DB), c = b % DB; return [s.h[r * DB + c], s.h[(r + 1) * DB + c], s.v[r * (DB + 1) + c], s.v[r * (DB + 1) + c + 1]].filter((x: number) => x >= 0).length; }
function dbAdj(kind: string, i: number) {
  const out: number[] = [];
  if (kind === "h") { const r = Math.floor(i / DB), c = i % DB; if (r > 0) out.push((r - 1) * DB + c); if (r < DB) out.push(r * DB + c); }
  else { const r = Math.floor(i / (DB + 1)), c = i % (DB + 1); if (c > 0) out.push(r * DB + c - 1); if (c < DB) out.push(r * DB + c); }
  return out;
}
function dbLines(s: any) { const o: any[] = []; s.h.forEach((v: number, i: number) => v < 0 && o.push({ line: "h", i })); s.v.forEach((v: number, i: number) => v < 0 && o.push({ line: "v", i })); return o; }
function dbGreedyRun(s: any, seat: number) { // how many boxes a greedy player grabs in a row
  let n = 0;
  for (let guard = 0; guard < 30; guard++) {
    const take = dbLines(s).find((m) => dbAdj(m.line, m.i).some((b) => s.box[b] < 0 && dbSides(s, b) === 3));
    if (!take) break;
    const before = s.score[seat]; dots.move(s, seat, take); n += s.score[seat] - before;
    if (s.box.every((x: number) => x >= 0)) break;
  }
  return n;
}
function dotsAI(s: any, seat: number, level: Level) {
  const ls = dbLines(s);
  if (level === "easy" && Math.random() < 0.5) return rnd(ls);
  const completing = ls.filter((m) => dbAdj(m.line, m.i).some((b) => s.box[b] < 0 && dbSides(s, b) === 3));
  if (completing.length) return rnd(completing);
  const safe = ls.filter((m) => dbAdj(m.line, m.i).every((b) => dbSides(s, b) < 2));
  if (safe.length) return rnd(safe);
  if (level !== "hard") return rnd(ls);
  let best: any[] = [], bestN = Infinity; // give away the fewest boxes
  for (const m of ls) {
    const c = clone(s); const opp = (seat + 1) % s.score.length;
    dots.move(c, seat, m); const n = dbGreedyRun(c, opp);
    if (n < bestN) { bestN = n; best = [m]; } else if (n === bestN) best.push(m);
  }
  return rnd(best);
}

// --- Sea Battle: hunt / target / probability density ---
function seaAI(s: any, seat: number, level: Level) {
  const shots: number[] = s.shots[seat], opp = 1 - seat;
  const free = shots.map((v, i) => (v ? -1 : i)).filter((i) => i >= 0);
  if (level === "easy") return { action: "fire", cell: rnd(free) };
  const sunk = sunkShips(s.ships[opp], shots), sunkCells = new Set(sunk.flat());
  const openHits = shots.map((v, i) => (v === 2 && !sunkCells.has(i) ? i : -1)).filter((i) => i >= 0);
  const nb = (i: number) => [i - 10, i + 10, i % 10 ? i - 1 : -1, i % 10 < 9 ? i + 1 : -1].filter((j) => j >= 0 && j < 100);
  if (level === "medium") {
    const t = openHits.flatMap(nb).filter((j) => !shots[j]);
    if (t.length) return { action: "fire", cell: rnd(t) };
    const par = free.filter((i) => ((i % 10) + Math.floor(i / 10)) % 2 === 0);
    return { action: "fire", cell: rnd(par.length ? par : free) };
  }
  const left = FLEET.slice(); for (const sh of sunk) left.splice(left.indexOf(sh.length), 1);
  const score = Array(100).fill(0);
  for (const len of left) for (const horiz of [true, false]) for (let r = 0; r < (horiz ? 10 : 11 - len); r++) for (let c = 0; c < (horiz ? 11 - len : 10); c++) {
    const cells = Array.from({ length: len }, (_, k) => (horiz ? r * 10 + c + k : (r + k) * 10 + c));
    if (cells.some((x) => shots[x] === 1 || sunkCells.has(x))) continue;
    const hits = cells.filter((x) => shots[x] === 2).length;
    const w = hits ? 1 + hits * 40 : 1;
    for (const x of cells) if (!shots[x]) score[x] += w;
  }
  const top = Math.max(...free.map((i) => score[i]));
  return { action: "fire", cell: rnd(free.filter((i) => score[i] === top)) };
}

// --- Crazy 8s ---
function c8AI(s: any, seat: number, level: Level) {
  const hand: string[] = s.hands[seat], top = s.discard[s.discard.length - 1];
  const ok = hand.filter((c) => c[0] === "8" || c[1] === s.suit || c[0] === top[0]);
  if (!ok.length) return s.drew ? { action: "pass" } : { action: "draw" };
  const suitCount = (x: string) => hand.filter((c) => c[1] === x && c[0] !== "8").length;
  const bestSuit = () => SUITS.slice().sort((a, b) => suitCount(b) - suitCount(a))[0];
  if (level === "easy") { const c = rnd(ok); return { action: "play", card: c, suit: rnd(SUITS) }; }
  const plain = ok.filter((c) => c[0] !== "8");
  const nextCount = s.hands[(seat + 1) % s.hands.length].length;
  let pick: string;
  if (plain.length) {
    pick = plain.slice().sort((a, b) => suitCount(b[1]) - suitCount(a[1]) || (level === "hard" && nextCount <= 2 ? (b[1] !== s.suit ? 1 : 0) - (a[1] !== s.suit ? 1 : 0) : 0))[0];
    if (level === "medium" && Math.random() < 0.25) pick = rnd(ok);
  } else pick = ok[0];
  return { action: "play", card: pick, suit: bestSuit() };
}

// --- Lucky Dice ---
const DICE_BASE: Record<string, number> = { ones: 2, twos: 5, threes: 8, fours: 11, fives: 14, sixes: 17, three: 16, four: 8, full: 12, small: 16, large: 12, yacht: 10, chance: 22 };
function diceCatValue(card: any, dice: number[], cat: string, level: Level) {
  const sc = diceScore(dice, cat);
  if (level === "easy") return sc;
  let v = sc - DICE_BASE[cat];
  const up = CATS.indexOf(cat);
  if (up >= 0 && up < 6 && sc >= 3 * (up + 1)) v += 6;
  return v;
}
function bestCat(card: any, dice: number[], level: Level) {
  const open = CATS.filter((c) => card[c] == null);
  return open.sort((a, b) => diceCatValue(card, dice, b, level) - diceCatValue(card, dice, a, level))[0];
}
function holdCandidates(d: number[]) {
  const cnt = [0, 0, 0, 0, 0, 0, 0]; d.forEach((x) => cnt[x]++);
  const out: boolean[][] = [d.map(() => false)];
  for (let v = 1; v <= 6; v++) if (cnt[v] >= 2) out.push(d.map((x) => x === v));
  const keepRun = (vals: number[]) => { const used = new Set<number>(); return d.map((x) => (vals.includes(x) && !used.has(x) ? (used.add(x), true) : false)); };
  for (const run of [[1, 2, 3, 4], [2, 3, 4, 5], [3, 4, 5, 6], [2, 3, 4], [3, 4, 5], [4, 5, 6]]) if (run.every((x) => cnt[x])) out.push(keepRun(run));
  out.push(d.map((x) => x >= 5));
  return out;
}
function diceAI(s: any, seat: number, level: Level) {
  const card = s.cards[seat];
  if (s.rolls === 0) return { action: "roll" };
  const now = bestCat(card, s.dice, level), nowV = diceCatValue(card, s.dice, now, level);
  if (s.rolls >= 3 || (level !== "easy" && nowV >= 20)) return { action: "score", cat: now };
  let hold: boolean[];
  if (level === "easy") {
    const cnt = [0, 0, 0, 0, 0, 0, 0]; s.dice.forEach((x: number) => cnt[x]++);
    const v = cnt.indexOf(Math.max(...cnt)); hold = s.dice.map((x: number) => x === v);
  } else {
    let bestH = holdCandidates(s.dice)[0], bestE = -Infinity;
    const samples = level === "hard" ? 60 : 12;
    for (const h of holdCandidates(s.dice)) {
      let tot = 0;
      for (let k = 0; k < samples; k++) {
        const d = s.dice.map((x: number, i: number) => (h[i] ? x : 1 + Math.floor(Math.random() * 6)));
        tot += diceCatValue(card, d, bestCat(card, d, level), level);
      }
      if (tot / samples > bestE) { bestE = tot / samples; bestH = h; }
    }
    if (bestE < nowV) return { action: "score", cat: now };
    hold = bestH;
  }
  s.held = hold; // the bot sets its holds directly, then rolls
  return { action: "roll" };
}

function botMove(type: string, s: any, seat: number, level: Level): any {
  switch (type) {
    case "ttt": return pickSearch(ttt, s, seat, level, [1, 3, 9], tttMoves, () => 0);
    case "connect4": return pickSearch(connect4, s, seat, level, [2, 4, 6], c4Moves, c4Eval, 80000);
    case "uttt": return pickSearch(uttt, s, seat, level, [1, 2, 4], utttMoves, utttEval, 60000);
    case "reversi": return pickSearch(reversi, s, seat, level, [1, 3, 4], rvMv, rvEval, 40000);
    case "checkers": return pickSearch(checkers, s, seat, level, [2, 4, 6], ckMv, ckEval, 60000);
    case "chess": return pickSearch(chess, s, seat, level, [1, 2, 3], chMv, chEval, 25000);
    case "mancala": return pickSearch(mancala, s, seat, level, [1, 4, 8], mcMv, mcEval, 80000);
    case "dots": return dotsAI(s, seat, level);
    case "battleship": return seaAI(s, seat, level);
    case "crazy8": return c8AI(s, seat, level);
    case "dice": return diceAI(s, seat, level);
  }
  return null;
}

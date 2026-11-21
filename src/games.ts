// ===== game modules =====
type Res = { err?: string; done?: boolean; winner?: number | null; winners?: number[] };
type Mod = { name: string; min: number; max: number; init(n: number): any; move(s: any, seat: number, m: any): Res; view(s: any, seat: number): any; turn(s: any): number | null };

function shuffle<T>(a: T[]): T[] { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

// ---- Connect 4 ----
function c4Win(b: number[], idx: number): boolean {
  const p = b[idx], r0 = Math.floor(idx / 7), c0 = idx % 7;
  for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]) {
    let n = 1;
    for (const s of [1, -1]) {
      let r = r0 + dr * s, c = c0 + dc * s;
      while (r >= 0 && r < 6 && c >= 0 && c < 7 && b[r * 7 + c] === p) { n++; r += dr * s; c += dc * s; }
    }
    if (n >= 4) return true;
  }
  return false;
}
const connect4: Mod = {
  name: "Connect 4", min: 2, max: 2,
  init: () => ({ board: Array(42).fill(0), turn: 0, last: -1 }),
  turn: (s) => s.turn,
  view: (s) => s,
  move(s, seat, m) {
    if (s.turn !== seat) return { err: "Not your turn" };
    const col = Number(m.col);
    if (!(col >= 0 && col < 7)) return { err: "Bad column" };
    let idx = -1;
    for (let r = 5; r >= 0; r--) if (s.board[r * 7 + col] === 0) { idx = r * 7 + col; break; }
    if (idx < 0) return { err: "Column is full" };
    s.board[idx] = seat + 1; s.last = idx;
    if (c4Win(s.board, idx)) return { done: true, winner: seat };
    if (s.board.every((x: number) => x)) return { done: true, winner: null };
    s.turn = 1 - seat; return {};
  },
};

// ---- Crazy 8s ----
const SUITS = ["S", "H", "D", "C"], RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K"];
const crazy8: Mod = {
  name: "Crazy 8s", min: 2, max: 6,
  init(n) {
    const deck = shuffle(SUITS.flatMap((s) => RANKS.map((r) => r + s)));
    const per = n === 2 ? 7 : 5;
    const hands = Array.from({ length: n }, () => deck.splice(0, per));
    let top = deck.shift()!;
    while (top[0] === "8") { deck.push(top); top = deck.shift()!; }
    return { deck, discard: [top], hands, turn: 0, suit: top[1], drew: false, log: "" };
  },
  turn: (s) => s.turn,
  view: (s, seat) => ({ top: s.discard[s.discard.length - 1], suit: s.suit, turn: s.turn, drew: s.drew, deck: s.deck.length, counts: s.hands.map((h: string[]) => h.length), hand: seat >= 0 ? s.hands[seat] : null, log: s.log }),
  move(s, seat, m) {
    if (s.turn !== seat) return { err: "Not your turn" };
    const hand: string[] = s.hands[seat], n = s.hands.length;
    const top = s.discard[s.discard.length - 1];
    if (m.action === "play") {
      const i = hand.indexOf(m.card);
      if (i < 0) return { err: "You don't have that card" };
      if (!(m.card[0] === "8" || m.card[1] === s.suit || m.card[0] === top[0])) return { err: "That card doesn't match" };
      if (m.card[0] === "8" && !SUITS.includes(m.suit)) return { err: "Pick a suit" };
      hand.splice(i, 1); s.discard.push(m.card);
      s.suit = m.card[0] === "8" ? m.suit : m.card[1];
      s.log = "played " + m.card + (m.card[0] === "8" ? " → " + m.suit : "");
      if (!hand.length) return { done: true, winner: seat };
      s.turn = (seat + 1) % n; s.drew = false; return {};
    }
    if (m.action === "draw") {
      if (s.drew) return { err: "You already drew — play or pass" };
      if (!s.deck.length && s.discard.length > 1) { const t = s.discard.pop(); s.deck = shuffle(s.discard); s.discard = [t]; }
      if (s.deck.length) hand.push(s.deck.shift());
      s.drew = true; s.log = "drew a card"; return {};
    }
    if (m.action === "pass") {
      if (!s.drew) return { err: "Draw first" };
      s.turn = (seat + 1) % n; s.drew = false; s.log = "passed"; return {};
    }
    return { err: "Bad move" };
  },
};

// ---- Chess ---- (index 0 = a8, white at the bottom; seat 0 = white)
const N_OFF = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
const DIAG = [[-1, -1], [-1, 1], [1, -1], [1, 1]], ORTH = [[-1, 0], [1, 0], [0, -1], [0, 1]];
function chAttacked(b: string[], sq: number, by: string): boolean {
  const r = sq >> 3, c = sq & 7, at = (rr: number, cc: number) => (rr >= 0 && rr < 8 && cc >= 0 && cc < 8 ? b[rr * 8 + cc] : null);
  const pr = by === "w" ? r + 1 : r - 1;
  if (at(pr, c - 1) === by + "P" || at(pr, c + 1) === by + "P") return true;
  for (const [dr, dc] of N_OFF) if (at(r + dr, c + dc) === by + "N") return true;
  for (const [dr, dc] of [...DIAG, ...ORTH]) if (at(r + dr, c + dc) === by + "K") return true;
  for (const [dirs, kinds] of [[DIAG, "BQ"], [ORTH, "RQ"]] as const) {
    for (const [dr, dc] of dirs) {
      let rr = r + dr, cc = c + dc;
      while (rr >= 0 && rr < 8 && cc >= 0 && cc < 8) {
        const p = b[rr * 8 + cc];
        if (p) { if (p[0] === by && kinds.includes(p[1])) return true; break; }
        rr += dr; cc += dc;
      }
    }
  }
  return false;
}
type CMove = { from: number; to: number; flag: string };
function chPseudo(s: any, sq: number, out: CMove[]) {
  const b: string[] = s.board, p = b[sq], col = p[0], t = p[1], r = sq >> 3, c = sq & 7, opp = col === "w" ? "b" : "w";
  const add = (to: number, flag = "") => out.push({ from: sq, to, flag });
  const slide = (dirs: number[][], one: boolean) => {
    for (const [dr, dc] of dirs) {
      let rr = r + dr, cc = c + dc;
      while (rr >= 0 && rr < 8 && cc >= 0 && cc < 8) {
        const t2 = rr * 8 + cc;
        if (!b[t2]) add(t2); else { if (b[t2][0] === opp) add(t2); break; }
        if (one) break; rr += dr; cc += dc;
      }
    }
  };
  if (t === "P") {
    const d = col === "w" ? -1 : 1, start = col === "w" ? 6 : 1, nr = r + d;
    if (nr < 0 || nr > 7) return;
    if (!b[nr * 8 + c]) { add(nr * 8 + c); if (r === start && !b[(r + 2 * d) * 8 + c]) add((r + 2 * d) * 8 + c, "dbl"); }
    for (const dc of [-1, 1]) {
      const cc = c + dc; if (cc < 0 || cc > 7) continue;
      const t2 = nr * 8 + cc;
      if (b[t2] && b[t2][0] === opp) add(t2); else if (t2 === s.ep) add(t2, "ep");
    }
  } else if (t === "N") slide(N_OFF, true);
  else if (t === "B") slide(DIAG, false);
  else if (t === "R") slide(ORTH, false);
  else if (t === "Q") slide([...DIAG, ...ORTH], false);
  else if (t === "K") {
    slide([...DIAG, ...ORTH], true);
    const home = col === "w" ? 60 : 4, [kc, qc] = col === "w" ? ["K", "Q"] : ["k", "q"];
    if (sq === home && !chAttacked(b, home, opp)) {
      if (s.castle.includes(kc) && !b[home + 1] && !b[home + 2] && b[home + 3] === col + "R" && !chAttacked(b, home + 1, opp) && !chAttacked(b, home + 2, opp)) add(home + 2, "ck");
      if (s.castle.includes(qc) && !b[home - 1] && !b[home - 2] && !b[home - 3] && b[home - 4] === col + "R" && !chAttacked(b, home - 1, opp) && !chAttacked(b, home - 2, opp)) add(home - 2, "cq");
    }
  }
}
function chApply(b0: string[], mv: CMove, promo = "Q"): string[] {
  const b = b0.slice(), p = b[mv.from];
  b[mv.to] = p; b[mv.from] = "";
  if (mv.flag === "ep") b[mv.to + (p[0] === "w" ? 8 : -8)] = "";
  if (mv.flag === "ck") { b[mv.to - 1] = b[mv.to + 1]; b[mv.to + 1] = ""; }
  if (mv.flag === "cq") { b[mv.to + 1] = b[mv.to - 2]; b[mv.to - 2] = ""; }
  if (p[1] === "P" && (mv.to < 8 || mv.to >= 56)) b[mv.to] = p[0] + ("QRBN".includes(promo) ? promo : "Q");
  return b;
}
function chLegal(s: any, col: string): CMove[] {
  const out: CMove[] = [];
  for (let i = 0; i < 64; i++) if (s.board[i] && s.board[i][0] === col) chPseudo(s, i, out);
  const opp = col === "w" ? "b" : "w";
  return out.filter((mv) => { const nb = chApply(s.board, mv); return !chAttacked(nb, nb.indexOf(col + "K"), opp); });
}
const chess: Mod = {
  name: "Chess", min: 2, max: 2,
  init() {
    const b = Array(64).fill(""), back = "RNBQKBNR";
    for (let c = 0; c < 8; c++) { b[c] = "b" + back[c]; b[8 + c] = "bP"; b[48 + c] = "wP"; b[56 + c] = "w" + back[c]; }
    return { board: b, turn: 0, castle: "KQkq", ep: -1, last: null, check: false, quiet: 0 };
  },
  turn: (s) => s.turn,
  view(s, seat) {
    const v: any = { board: s.board, turn: s.turn, last: s.last, check: s.check };
    if (seat === s.turn) v.moves = chLegal(s, seat === 0 ? "w" : "b").map((m) => [m.from, m.to]);
    return v;
  },
  move(s, seat, m) {
    if (s.turn !== seat) return { err: "Not your turn" };
    const col = seat === 0 ? "w" : "b", opp = col === "w" ? "b" : "w";
    const mv = chLegal(s, col).find((x) => x.from === Number(m.from) && x.to === Number(m.to));
    if (!mv) return { err: "Illegal move" };
    const moved = s.board[mv.from], captured = s.board[mv.to] || mv.flag === "ep";
    s.board = chApply(s.board, mv, m.promo);
    for (const [sq, right] of [[60, "KQ"], [4, "kq"], [63, "K"], [56, "Q"], [7, "k"], [0, "q"]] as const)
      if (mv.from === sq || mv.to === sq) for (const ch of right) s.castle = s.castle.replace(ch, "");
    s.ep = mv.flag === "dbl" ? (mv.from + mv.to) / 2 : -1;
    s.quiet = moved[1] === "P" || captured ? 0 : s.quiet + 1;
    s.last = [mv.from, mv.to];
    s.turn = 1 - seat;
    s.check = chAttacked(s.board, s.board.indexOf(opp + "K"), col);
    if (!chLegal(s, opp).length) return { done: true, winner: s.check ? seat : null };
    if (s.quiet >= 100) return { done: true, winner: null };
    const left = s.board.filter((p: string) => p && p[1] !== "K");
    if (!left.length || (left.length === 1 && "NB".includes(left[0][1]))) return { done: true, winner: null };
    return {};
  },
};

// ---- Sea Battle ----
const FLEET = [5, 4, 3, 3, 2];
function placeFleet(): number[][] {
  for (;;) {
    const used = new Set<number>(), ships: number[][] = [];
    let ok = true;
    for (const len of FLEET) {
      let placed = false;
      for (let tries = 0; tries < 200 && !placed; tries++) {
        const horiz = Math.random() < 0.5, r = Math.floor(Math.random() * (horiz ? 10 : 11 - len)), c = Math.floor(Math.random() * (horiz ? 11 - len : 10));
        const cells = Array.from({ length: len }, (_, k) => (horiz ? r * 10 + c + k : (r + k) * 10 + c));
        if (cells.some((x) => used.has(x))) continue;
        cells.forEach((x) => used.add(x)); ships.push(cells); placed = true;
      }
      if (!placed) { ok = false; break; }
    }
    if (ok) return ships;
  }
}
const sunkShips = (ships: number[][], shots: number[]) => ships.filter((sh) => sh.every((x) => shots[x] === 2));
const battleship: Mod = {
  name: "Sea Battle", min: 2, max: 2,
  init: () => ({ phase: "setup", ships: [placeFleet(), placeFleet()], shots: [Array(100).fill(0), Array(100).fill(0)], ready: [false, false], turn: 0, last: -1 }),
  turn: (s) => (s.phase === "play" ? s.turn : null),
  view(s, seat) {
    const me = seat >= 0 ? seat : 0, opp = 1 - me;
    return {
      phase: s.phase, ready: s.ready, turn: s.turn, last: s.last, spectator: seat < 0,
      mine: { ships: seat >= 0 ? s.ships[me] : sunkShips(s.ships[me], s.shots[opp]), incoming: s.shots[opp] },
      enemy: { shots: s.shots[me], sunk: sunkShips(s.ships[opp], s.shots[me]) },
      left: [0, 1].map((i) => FLEET.length - sunkShips(s.ships[i], s.shots[1 - i]).length),
    };
  },
  move(s, seat, m) {
    if (s.phase === "setup") {
      if (m.action === "shuffle") { if (s.ready[seat]) return { err: "You're already ready" }; s.ships[seat] = placeFleet(); return {}; }
      if (m.action === "ready") { s.ready[seat] = true; if (s.ready[0] && s.ready[1]) s.phase = "play"; return {}; }
      return { err: "Get your fleet ready first" };
    }
    if (m.action !== "fire") return { err: "Bad move" };
    if (s.turn !== seat) return { err: "Not your turn" };
    const cell = Number(m.cell), opp = 1 - seat;
    if (!(cell >= 0 && cell < 100)) return { err: "Bad cell" };
    if (s.shots[seat][cell]) return { err: "Already fired there" };
    const hit = s.ships[opp].some((sh: number[]) => sh.includes(cell));
    s.shots[seat][cell] = hit ? 2 : 1; s.last = cell;
    if (sunkShips(s.ships[opp], s.shots[seat]).length === FLEET.length) return { done: true, winner: seat };
    if (!hit) s.turn = opp; // a hit earns another shot
    return {};
  },
};

// ---- Dots & Boxes ---- (5x5 boxes)
const DB = 5;
const dots: Mod = {
  name: "Dots & Boxes", min: 2, max: 4,
  init: (n) => ({ h: Array((DB + 1) * DB).fill(-1), v: Array(DB * (DB + 1)).fill(-1), box: Array(DB * DB).fill(-1), score: Array(n).fill(0), turn: 0, last: null }),
  turn: (s) => s.turn,
  view: (s) => s,
  move(s, seat, m) {
    if (s.turn !== seat) return { err: "Not your turn" };
    const kind = m.line === "h" ? "h" : m.line === "v" ? "v" : null, i = Number(m.i);
    if (!kind || !(i >= 0 && i < s[kind].length)) return { err: "Bad line" };
    if (s[kind][i] >= 0) return { err: "Line already drawn" };
    s[kind][i] = seat; s.last = [kind, i];
    const cand: number[][] = [];
    if (kind === "h") { const r = Math.floor(i / DB), c = i % DB; cand.push([r - 1, c], [r, c]); }
    else { const r = Math.floor(i / (DB + 1)), c = i % (DB + 1); cand.push([r, c - 1], [r, c]); }
    let scored = false;
    for (const [r, c] of cand) {
      if (r < 0 || r >= DB || c < 0 || c >= DB) continue;
      const b = r * DB + c;
      if (s.box[b] < 0 && s.h[r * DB + c] >= 0 && s.h[(r + 1) * DB + c] >= 0 && s.v[r * (DB + 1) + c] >= 0 && s.v[r * (DB + 1) + c + 1] >= 0) { s.box[b] = seat; s.score[seat]++; scored = true; }
    }
    if (s.box.every((x: number) => x >= 0)) {
      const best = Math.max(...s.score), tops = s.score.map((x: number, k: number) => (x === best ? k : -1)).filter((k: number) => k >= 0);
      return { done: true, winner: tops.length === 1 ? tops[0] : null };
    }
    if (!scored) s.turn = (seat + 1) % s.score.length;
    return {};
  },
};


// ---- Tic-Tac-Toe ----
const LINES3 = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
function line3(b: number[]): number[] | null { for (const l of LINES3) if (b[l[0]] && b[l[0]] < 3 && b[l[0]] === b[l[1]] && b[l[0]] === b[l[2]]) return l; return null; }
const ttt: Mod = {
  name: "Tic-Tac-Toe", min: 2, max: 2,
  init: () => ({ board: Array(9).fill(0), turn: 0, line: null }),
  turn: (s) => s.turn,
  view: (s) => s,
  move(s, seat, m) {
    if (s.turn !== seat) return { err: "Not your turn" };
    const i = Number(m.i);
    if (!(i >= 0 && i < 9) || s.board[i]) return { err: "Pick an empty square" };
    s.board[i] = seat + 1;
    const l = line3(s.board);
    if (l) { s.line = l; return { done: true, winner: seat }; }
    if (s.board.every((x: number) => x)) return { done: true, winner: null };
    s.turn = 1 - seat; return {};
  },
};

// ---- Ultimate Tic-Tac-Toe ---- (small[b]: 0 open, 1/2 won, 3 drawn)
const uttt: Mod = {
  name: "Ultimate Tic-Tac-Toe", min: 2, max: 2,
  init: () => ({ cells: Array(81).fill(0), small: Array(9).fill(0), next: -1, turn: 0, last: -1, line: null }),
  turn: (s) => s.turn,
  view: (s) => s,
  move(s, seat, m) {
    if (s.turn !== seat) return { err: "Not your turn" };
    const b = Number(m.b), c = Number(m.c);
    if (!(b >= 0 && b < 9 && c >= 0 && c < 9)) return { err: "Bad move" };
    if (s.small[b]) return { err: "That board is finished" };
    if (s.next >= 0 && s.next !== b) return { err: "Play in the highlighted board" };
    if (s.cells[b * 9 + c]) return { err: "Square taken" };
    s.cells[b * 9 + c] = seat + 1; s.last = b * 9 + c;
    const sub = s.cells.slice(b * 9, b * 9 + 9);
    if (line3(sub)) s.small[b] = seat + 1; else if (sub.every((x: number) => x)) s.small[b] = 3;
    const big = line3(s.small);
    if (big) { s.line = big; return { done: true, winner: seat }; }
    if (s.small.every((x: number) => x)) return { done: true, winner: null };
    s.next = s.small[c] ? -1 : c; s.turn = 1 - seat; return {};
  },
};

// ---- Reversi ---- (1 = seat 0 / black, 2 = seat 1 / white)
const RDIR = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
function rvFlips(b: number[], i: number, p: number): number[] {
  if (b[i]) return [];
  const r0 = i >> 3, c0 = i & 7, o = 3 - p, out: number[] = [];
  for (const [dr, dc] of RDIR) {
    let r = r0 + dr, c = c0 + dc; const line: number[] = [];
    while (r >= 0 && r < 8 && c >= 0 && c < 8 && b[r * 8 + c] === o) { line.push(r * 8 + c); r += dr; c += dc; }
    if (line.length && r >= 0 && r < 8 && c >= 0 && c < 8 && b[r * 8 + c] === p) out.push(...line);
  }
  return out;
}
function rvMoves(b: number[], p: number) { const m: number[] = []; for (let i = 0; i < 64; i++) if (rvFlips(b, i, p).length) m.push(i); return m; }
const rvCount = (b: number[]) => [b.filter((x) => x === 1).length, b.filter((x) => x === 2).length];
const reversi: Mod = {
  name: "Reversi", min: 2, max: 2,
  init() { const b = Array(64).fill(0); b[27] = 2; b[36] = 2; b[28] = 1; b[35] = 1; return { board: b, turn: 0, last: -1, passed: false }; },
  turn: (s) => s.turn,
  view: (s, seat) => ({ ...s, moves: seat === s.turn ? rvMoves(s.board, seat + 1) : [], count: rvCount(s.board) }),
  move(s, seat, m) {
    if (s.turn !== seat) return { err: "Not your turn" };
    const i = Number(m.i), p = seat + 1;
    const f = i >= 0 && i < 64 ? rvFlips(s.board, i, p) : [];
    if (!f.length) return { err: "That move doesn't flip anything" };
    s.board[i] = p; for (const x of f) s.board[x] = p; s.last = i; s.passed = false;
    const o = 1 - seat;
    if (rvMoves(s.board, o + 1).length) { s.turn = o; return {}; }
    if (rvMoves(s.board, p).length) { s.passed = true; return {}; }
    const [a, b] = rvCount(s.board);
    return { done: true, winner: a === b ? null : a > b ? 0 : 1 };
  },
};

// ---- Checkers ---- (1/2 = seat 0 man/king at the bottom, 3/4 = seat 1 man/king)
const ckOwn = (v: number, seat: number) => !!v && (seat === 0 ? v <= 2 : v >= 3);
const isJump = (a: number, t: number) => Math.abs((t >> 3) - (a >> 3)) === 2;
function ckMoves(s: any, seat: number): number[][] {
  const b: number[] = s.board, jumps: number[][] = [], steps: number[][] = [];
  const from = s.chain >= 0 ? [s.chain] : [...Array(64).keys()];
  for (const i of from) {
    const v = b[i]; if (!ckOwn(v, seat)) continue;
    const r = i >> 3, c = i & 7, king = v === 2 || v === 4;
    const dirs = king ? [[-1, -1], [-1, 1], [1, -1], [1, 1]] : seat === 0 ? [[-1, -1], [-1, 1]] : [[1, -1], [1, 1]];
    for (const [dr, dc] of dirs) {
      const r1 = r + dr, c1 = c + dc, r2 = r + 2 * dr, c2 = c + 2 * dc;
      if (r1 < 0 || r1 > 7 || c1 < 0 || c1 > 7) continue;
      const v1 = b[r1 * 8 + c1];
      if (!v1) { if (s.chain < 0) steps.push([i, r1 * 8 + c1]); }
      else if (!ckOwn(v1, seat) && r2 >= 0 && r2 <= 7 && c2 >= 0 && c2 <= 7 && !b[r2 * 8 + c2]) jumps.push([i, r2 * 8 + c2]);
    }
  }
  return jumps.length ? jumps : steps;
}
const ckCount = (b: number[]) => [b.filter((v) => v === 1 || v === 2).length, b.filter((v) => v >= 3).length];
const checkers: Mod = {
  name: "Checkers", min: 2, max: 2,
  init() {
    const b = Array(64).fill(0);
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) if ((r + c) % 2) { if (r < 3) b[r * 8 + c] = 3; else if (r > 4) b[r * 8 + c] = 1; }
    return { board: b, turn: 0, chain: -1, last: null, quiet: 0 };
  },
  turn: (s) => s.turn,
  view: (s, seat) => ({ ...s, moves: seat === s.turn ? ckMoves(s, seat) : [], count: ckCount(s.board) }),
  move(s, seat, m) {
    if (s.turn !== seat) return { err: "Not your turn" };
    const from = Number(m.from), to = Number(m.to), legal = ckMoves(s, seat);
    if (!legal.some(([a, t]) => a === from && t === to)) return { err: legal.length && isJump(legal[0][0], legal[0][1]) ? "You must capture" : "Illegal move" };
    const b: number[] = s.board, v = b[from], jump = isJump(from, to);
    b[to] = v; b[from] = 0; s.last = [from, to];
    let crowned = false;
    if (v === 1 && to >> 3 === 0) { b[to] = 2; crowned = true; }
    if (v === 3 && to >> 3 === 7) { b[to] = 4; crowned = true; }
    if (jump) {
      b[(from + to) / 2] = 0; s.quiet = 0;
      if (!crowned) { s.chain = to; if (ckMoves(s, seat).some(([a, t]) => isJump(a, t))) return {}; }
    } else s.quiet++;
    s.chain = -1;
    const o = 1 - seat;
    if (!b.some((x) => ckOwn(x, o)) || !ckMoves(s, o).length) return { done: true, winner: seat };
    if (s.quiet >= 80) return { done: true, winner: null };
    s.turn = o; return {};
  },
};

// ---- Mancala (Kalah) ---- pits 0-5 + store 6 for seat 0, pits 7-12 + store 13 for seat 1
const mancala: Mod = {
  name: "Mancala", min: 2, max: 2,
  init: () => ({ pits: [4, 4, 4, 4, 4, 4, 0, 4, 4, 4, 4, 4, 4, 0], turn: 0, last: -1, from: -1, log: "" }),
  turn: (s) => s.turn,
  view: (s) => s,
  move(s, seat, m) {
    if (s.turn !== seat) return { err: "Not your turn" };
    const k = Number(m.pit);
    if (!(k >= 0 && k < 6)) return { err: "Bad pit" };
    const p: number[] = s.pits, start = seat * 7 + k;
    if (!p[start]) return { err: "That pit is empty" };
    let n = p[start], i = start;
    p[start] = 0;
    const myStore = seat * 7 + 6, oppStore = (1 - seat) * 7 + 6;
    while (n > 0) { i = (i + 1) % 14; if (i === oppStore) continue; p[i]++; n--; }
    s.last = i; s.from = start; s.log = "";
    if (i >= seat * 7 && i < seat * 7 + 6 && p[i] === 1 && p[12 - i] > 0) { p[myStore] += p[12 - i] + 1; p[12 - i] = 0; p[i] = 0; s.log = "capture"; }
    const side = (q: number) => p.slice(q * 7, q * 7 + 6).reduce((a, b) => a + b, 0);
    if (side(0) === 0 || side(1) === 0) {
      for (const q of [0, 1]) { p[q * 7 + 6] += side(q); for (let j = 0; j < 6; j++) p[q * 7 + j] = 0; }
      return { done: true, winner: p[6] === p[13] ? null : p[6] > p[13] ? 0 : 1 };
    }
    if (i === myStore) { s.log = "extra"; return {}; }
    s.turn = 1 - seat; return {};
  },
};

// ---- Lucky Dice ---- (Yacht-style scorecard)
const CATS = ["ones", "twos", "threes", "fours", "fives", "sixes", "three", "four", "full", "small", "large", "yacht", "chance"];
function diceScore(d: number[], cat: string): number {
  const cnt = [0, 0, 0, 0, 0, 0, 0]; for (const x of d) cnt[x]++;
  const sum = d.reduce((a, b) => a + b, 0), mx = Math.max(...cnt), has = (a: number[]) => a.every((x) => cnt[x] > 0);
  const upper = CATS.indexOf(cat);
  if (upper >= 0 && upper < 6) return cnt[upper + 1] * (upper + 1);
  switch (cat) {
    case "three": return mx >= 3 ? sum : 0;
    case "four": return mx >= 4 ? sum : 0;
    case "full": return cnt.includes(3) && cnt.includes(2) ? 25 : 0;
    case "small": return has([1, 2, 3, 4]) || has([2, 3, 4, 5]) || has([3, 4, 5, 6]) ? 30 : 0;
    case "large": return has([1, 2, 3, 4, 5]) || has([2, 3, 4, 5, 6]) ? 40 : 0;
    case "yacht": return mx === 5 ? 50 : 0;
    case "chance": return sum;
  }
  return 0;
}
function diceTotal(card: Record<string, number>) {
  let up = 0, t = 0;
  CATS.forEach((c, i) => { const v = card[c]; if (v != null) { t += v; if (i < 6) up += v; } });
  const bonus = up >= 63 ? 35 : 0;
  return { upper: up, bonus, total: t + bonus };
}
const NOHOLD = () => [false, false, false, false, false];
const dice: Mod = {
  name: "Lucky Dice", min: 2, max: 6,
  init: (n) => ({ dice: [1, 2, 3, 4, 5], held: NOHOLD(), rolls: 0, turn: 0, round: 1, cards: Array.from({ length: n }, () => ({})) }),
  turn: (s) => s.turn,
  view: (s, seat) => ({ ...s, totals: s.cards.map(diceTotal), preview: seat === s.turn && s.rolls > 0 ? Object.fromEntries(CATS.filter((c) => s.cards[seat][c] == null).map((c) => [c, diceScore(s.dice, c)])) : null }),
  move(s, seat, m) {
    if (s.turn !== seat) return { err: "Not your turn" };
    if (m.action === "roll") {
      if (s.rolls >= 3) return { err: "No rolls left — pick a category" };
      if (s.rolls === 0) s.held = NOHOLD();
      s.dice = s.dice.map((d: number, i: number) => (s.held[i] ? d : 1 + Math.floor(Math.random() * 6)));
      s.rolls++; return {};
    }
    if (m.action === "hold") {
      const i = Number(m.i);
      if (!s.rolls || s.rolls >= 3 || !(i >= 0 && i < 5)) return { err: "You can hold dice between rolls" };
      s.held[i] = !s.held[i]; return {};
    }
    if (m.action === "score") {
      if (!s.rolls) return { err: "Roll first" };
      if (!CATS.includes(m.cat) || s.cards[seat][m.cat] != null) return { err: "Pick an open category" };
      s.cards[seat][m.cat] = diceScore(s.dice, m.cat);
      s.rolls = 0; s.held = NOHOLD();
      s.turn = (seat + 1) % s.cards.length;
      if (s.turn === 0) s.round++;
      if (s.round > 13) {
        const t = s.cards.map((c: any) => diceTotal(c).total), best = Math.max(...t), tops = t.map((x: number, k: number) => (x === best ? k : -1)).filter((k: number) => k >= 0);
        return { done: true, winner: tops.length === 1 ? tops[0] : null };
      }
      return {};
    }
    return { err: "Bad move" };
  },
};

const GAMES: Record<string, Mod> = { chess, connect4, crazy8, battleship, dots, ttt, uttt, reversi, checkers, mancala, dice };

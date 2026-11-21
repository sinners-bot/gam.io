// GAM.IO — a Plato-style Discord Activity hub. Runs as a single Railway Function (Bun).
import { DiscordSDK } from "@discord/embedded-app-sdk";
void DiscordSDK; // imported so the runtime installs the SDK; it is bundled for the browser below

// The UI (client JS + CSS) is served by separate UI functions (ASSETS_URLS, comma-separated) to stay under
// Railway's per-function size limit; this server concatenates them in order and caches for 30 seconds.
const ASSET_BASES = (Bun.env.ASSETS_URLS || "").split(",").map((u) => u.trim().replace(/\/$/, "")).filter(Boolean);
let A = { js: "", css: "", ver: "0", at: 0 };
async function assets() {
  if (A.js && Date.now() - A.at < 30_000) return A;
  try {
    const parts = await Promise.all(ASSET_BASES.map(async (b) => {
      const [js, css] = await Promise.all([fetch(b + "/client.js"), fetch(b + "/style.css")]);
      if (!js.ok || !css.ok) throw new Error("asset fetch " + b + " " + js.status + "/" + css.status);
      return { js: await js.text(), css: await css.text() };
    }));
    const js = parts.map((p) => p.js).join("\n"), css = parts.map((p) => p.css).join("\n");
    A = { js, css, ver: Bun.hash(js + css).toString(36), at: Date.now() };
  } catch (e) { console.error("assets failed", e); if (A.js) A.at = Date.now() - 20_000; }
  return A;
}

const CLIENT_ID = Bun.env.DISCORD_CLIENT_ID || "";
const CLIENT_SECRET = Bun.env.DISCORD_CLIENT_SECRET || "";
const PORT = Number(Bun.env.PORT || 3000);

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


// ---------- game plugins (PLUGIN_URLS, comma-separated; each serves /games.ts) ----------
for (const b of (Bun.env.PLUGIN_URLS || "").split(",").map((u) => u.trim().replace(/\/$/, "")).filter(Boolean)) {
  try {
    const r = await fetch(b + "/games.ts");
    if (!r.ok) throw new Error("HTTP " + r.status);
    const file = "/tmp/plugin-" + Bun.hash(b).toString(36) + ".ts";
    await Bun.write(file, await r.text());
    const mod = await import(file);
    const added = await mod.default({ shuffle });
    Object.assign(GAMES, added);
    console.log("plugin loaded", b, Object.keys(added).join(","));
  } catch (e) { console.error("plugin failed", b, e); }
}
if (GAMES.clash) (GAMES.clash as any).name = "Juno";

// ---------- browser bundle of the Discord SDK ----------
let SDK_JS = "";
try {
  const entry = import.meta.dir + "/sdk-entry.ts";
  await Bun.write(entry, 'export { DiscordSDK, patchUrlMappings } from "@discord/embedded-app-sdk";\n');
  const out = await Bun.build({ entrypoints: [entry], target: "browser", format: "esm", minify: true });
  if (out.success) { SDK_JS = await out.outputs[0].text(); console.log("SDK bundled", SDK_JS.length); } else console.error("SDK bundle failed", out.logs);
} catch (e) { console.error("SDK bundle error", e); }

// ---------- storage (Postgres if DATABASE_URL, else memory) ----------
type User = { id: string; name: string; avatar: string | null; guest?: boolean; bot?: boolean; level?: Level };
const sql: any = Bun.env.DATABASE_URL ? (Bun as any).sql : null;
const mem: { user_id: string; name: string; game: string; won: boolean; at: number; guest?: boolean }[] = [];
if (sql) {
  try {
    await sql`CREATE TABLE IF NOT EXISTS stats (user_id text NOT NULL, game text NOT NULL, name text NOT NULL DEFAULT '', wins int NOT NULL DEFAULT 0, played int NOT NULL DEFAULT 0, PRIMARY KEY (user_id, game))`;
    await sql`CREATE TABLE IF NOT EXISTS results (id bigserial PRIMARY KEY, user_id text NOT NULL, game text NOT NULL, won boolean NOT NULL, at timestamptz NOT NULL DEFAULT now())`;
    await sql`CREATE INDEX IF NOT EXISTS results_user_at ON results (user_id, at DESC)`;
    console.log("Postgres ready");
  } catch (e) { console.error("Postgres init failed", e); }
}
async function recordResult(game: string, players: User[], winnerId: string | null, winners?: string[]) {
  for (const p of players) {
    const won = winners && winners.length ? winners.includes(p.id) : p.id === winnerId, w = won ? 1 : 0;
    try {
      if (sql && !p.guest) {
        await sql`INSERT INTO stats (user_id, game, name, wins, played) VALUES (${p.id}, ${game}, ${p.name}, ${w}, 1)
          ON CONFLICT (user_id, game) DO UPDATE SET wins = stats.wins + ${w}, played = stats.played + 1, name = ${p.name}`;
        await sql`INSERT INTO results (user_id, game, won) VALUES (${p.id}, ${game}, ${won})`;
      } else mem.push({ user_id: p.id, name: p.name, game, won, at: Date.now(), guest: p.guest });
    } catch (e) { console.error("stat write failed", e); }
  }
}
async function leaderboard() {
  try {
    if (sql) return [...(await sql`SELECT max(name) AS name, sum(wins)::int AS wins, sum(played)::int AS played FROM stats GROUP BY user_id ORDER BY wins DESC, played ASC LIMIT 10`)];
  } catch (e) { console.error("leaderboard failed", e); }
  const agg = new Map<string, { name: string; wins: number; played: number }>();
  for (const r of mem) { if (r.guest) continue; const a = agg.get(r.user_id) || { name: r.name, wins: 0, played: 0 }; a.wins += +r.won; a.played++; agg.set(r.user_id, a); }
  return [...agg.values()].sort((a, b) => b.wins - a.wins || a.played - b.played).slice(0, 10);
}
const XP_PER_LEVEL = 300;
const TITLES: [number, string][] = [[15, "Legend"], [10, "Champion"], [6, "Pro"], [3, "Rising Star"], [1, "Rookie"]];
async function profile(u: User) {
  let per: Record<string, { wins: number; played: number }> = {}, recent: any[] = [], today = 0;
  const dayStart = new Date(); dayStart.setUTCHours(0, 0, 0, 0);
  try {
    if (sql && !u.guest) {
      for (const r of await sql`SELECT game, wins, played FROM stats WHERE user_id = ${u.id}`) per[r.game] = { wins: r.wins, played: r.played };
      recent = [...(await sql`SELECT game, won, extract(epoch from at)*1000 AS at FROM results WHERE user_id = ${u.id} ORDER BY at DESC LIMIT 4`)].map((r: any) => ({ game: r.game, won: r.won, at: Number(r.at) }));
      today = Number((await sql`SELECT count(*)::int AS n FROM results WHERE user_id = ${u.id} AND won AND at >= ${dayStart}`)[0].n);
    } else {
      const mine = mem.filter((r) => r.user_id === u.id);
      for (const r of mine) { const p = per[r.game] || (per[r.game] = { wins: 0, played: 0 }); p.played++; p.wins += +r.won; }
      recent = mine.slice(-4).reverse().map((r) => ({ game: r.game, won: r.won, at: r.at }));
      today = mine.filter((r) => r.won && r.at >= dayStart.getTime()).length;
    }
  } catch (e) { console.error("profile failed", e); }
  let wins = 0, played = 0;
  for (const p of Object.values(per)) { wins += p.wins; played += p.played; }
  const xp = played * 20 + wins * 80, level = Math.floor(xp / XP_PER_LEVEL) + 1;
  return { xp, level, into: xp % XP_PER_LEVEL, need: XP_PER_LEVEL, title: TITLES.find(([l]) => level >= l)![1], wins, played, per, recent, today, goal: 3 };
}

// ---------- auth ----------
const tokenCache = new Map<string, { user: User; at: number }>();
async function userFromToken(token: string): Promise<User | null> {
  const c = tokenCache.get(token);
  if (c && Date.now() - c.at < 10 * 60_000) return c.user;
  const r = await fetch("https://discord.com/api/v10/users/@me", { headers: { Authorization: "Bearer " + token } });
  if (!r.ok) return null;
  const u: any = await r.json();
  const user: User = { id: u.id, name: u.global_name || u.username, avatar: u.avatar ? `/avatar/${u.id}/${u.avatar}` : null };
  tokenCache.set(token, { user, at: Date.now() });
  for (const [k, v] of tokenCache) if (Date.now() - v.at > 10 * 60_000) tokenCache.delete(k);
  return user;
}

// ---------- rooms ----------
type Game = { id: number; type: string; phase: "lobby" | "playing" | "over"; hostId: string; seats: string[]; state: any; winner: string | null; winners?: string[]; names: Record<string, User>; seq?: number; afkKey?: string; afkSeat?: number; turnDeadline?: number };
type Room = { id: string; members: Map<string, { user: User; sockets: Set<any> }>; game: Game | null; guild?: string; vis?: "call" | "server" | "public" };
// A Discord call is a "hub" room; every game lobby in it is its own table room "<hub>#<n>", so several games can run at once.
const hubOf = (id: string) => id.startsWith("mm:") ? id : id.split("#")[0];
const isTable = (id: string) => id.includes("#");
const callRooms = (hub: string) => [...rooms.values()].filter((r) => hubOf(r.id) === hub);
let tableSeq = 0;
const rooms = new Map<string, Room>();
let gameSeq = 0;
const isBot = (id: string) => id.startsWith("bot:");
const BOT_NAMES: Record<string, string> = { easy: "Easy Bot", medium: "Medium Bot", hard: "Hard Bot" };
let botSeq = 0;
const botTimers = new Map<string, any>();
// Plays bot turns one at a time with a short "thinking" delay so humans can follow along.
function scheduleBots(room: Room) {
  const g = room.game;
  if (!g || g.phase !== "playing" || !g.state) return;
  const mod = GAMES[g.type];
  if (g.type === "battleship" && g.state.phase === "setup") {
    g.seats.forEach((id, i) => { if (isBot(id) && !g.state.ready[i]) mod.move(g.state, i, { action: "ready" }); });
  }
  const actor = (st: any): number | null => {
    const t0 = mod.turn(st);
    if (t0 != null) return t0;
    const p: number[] = (mod as any).pending ? (mod as any).pending(st) : [];
    const b = p.find((i) => isBot(g.seats[i]));
    return b == null ? null : b;
  };
  const t = actor(g.state);
  if (t == null || !isBot(g.seats[t]) || botTimers.has(room.id)) return;
  const st = g.state, id = g.seats[t];
  botTimers.set(room.id, setTimeout(() => {
    botTimers.delete(room.id);
    const g2 = room.game;
    if (!g2 || g2.state !== st || g2.phase !== "playing" || actor(st) !== t) return;
    let res: Res = { err: "no move" };
    const lvl = g2.names[id].level || "medium";
    try { const m = (mod as any).bot ? (mod as any).bot(st, t, lvl) : botMove(g2.type, st, t, lvl); if (m) res = mod.move(st, t, m); } catch (e) { console.error("bot error", e); }
    if (res.err) { console.error("bot move failed", g2.type, res.err); if (g2.seats.length === 2) { finish(room, g2.seats[1 - t]); return; } }
    g2.seq = (g2.seq || 0) + 1;
    if (res.done) { endGame(room, res); return; }
    scheduleAfk(room); broadcast(room); scheduleBots(room); scheduleTick(room);
  }, 650 + Math.random() * 600));
}
// Timed games (party games) expose state.deadline and mod.tick(); this fires the tick when the deadline passes.
const tickTimers = new Map<string, any>();
function scheduleTick(room: Room) {
  clearTimeout(tickTimers.get(room.id)); tickTimers.delete(room.id);
  const g = room.game;
  if (!g || g.phase !== "playing" || !g.state) return;
  const mod: any = GAMES[g.type];
  if (!mod.tick || !g.state.deadline) return;
  const st = g.state, dl = st.deadline;
  tickTimers.set(room.id, setTimeout(() => {
    tickTimers.delete(room.id);
    const g2 = room.game;
    if (!g2 || g2.state !== st || g2.phase !== "playing") return;
    if (st.deadline !== dl) return scheduleTick(room);
    let res: Res = {};
    try { res = mod.tick(st); } catch (e) { console.error("tick error", e); }
    g2.seq = (g2.seq || 0) + 1;
    if (res.done) { endGame(room, res); return; }
    scheduleAfk(room); broadcast(room); scheduleTick(room); scheduleBots(room);
  }, Math.max(0, dl - Date.now()) + 50));
}
function endGame(room: Room, res: Res) {
  const g = room.game!;
  g.winners = (res.winners || (res.winner != null ? [res.winner] : [])).map((i) => g.seats[i]);
  finish(room, res.winner == null ? null : g.seats[res.winner]);
}
// Idle-turn timer: if a human doesn't act within AFK_SECONDS, a medium bot plays that one move for them.
const AFK_MS = Number(Bun.env.AFK_SECONDS || 60) * 1000;
// Seconds per turn; when it runs out a medium bot makes that one move. Games not listed use AFK_SECONDS.
const TURN_SECS: Record<string, number> = { ttt: 15, connect4: 20, uttt: 25, dots: 20, reversi: 30, checkers: 40, chess: 60, mancala: 25, dice: 40, battleship: 25, crazy8: 25, clash: 20, hearts: 30, spades: 30, poker: 30, liars: 30, cheat: 30, ludo: 20, pool: 45 };
function turnMs(g: Game) { if (g.type === "battleship" && g.state?.phase === "setup") return 60_000; return (TURN_SECS[g.type] || AFK_MS / 1000) * 1000; }
function yourTurn(g: Game, seat: number) {
  if (seat < 0 || g.phase !== "playing" || !g.state) return false;
  const mod: any = GAMES[g.type], st = g.state;
  if (g.type === "battleship" && st.phase === "setup") return !st.ready[seat];
  if (mod.turn(st) === seat) return true;
  return mod.pending ? mod.pending(st).includes(seat) : false;
}
const afkTimers = new Map<string, any>();
function humanActor(g: Game): number | null {
  const mod: any = GAMES[g.type], st = g.state;
  if (g.type === "battleship" && st.phase === "setup") { const i = g.seats.findIndex((id, k) => !isBot(id) && !st.ready[k]); return i < 0 ? null : i; }
  const t = mod.turn(st);
  if (t != null) return isBot(g.seats[t]) ? null : t;
  const p: number[] = mod.pending ? mod.pending(st) : [];
  const h = p.find((i) => !isBot(g.seats[i]));
  return h == null ? null : h;
}
function scheduleAfk(room: Room) {
  const g = room.game;
  if (!g || g.phase !== "playing" || !g.state || (GAMES[g.type] as any).noBots) { if (g) { g.turnDeadline = 0; g.afkSeat = -1; } return; }
  const t = humanActor(g);
  if (t == null) { g.turnDeadline = 0; g.afkSeat = -1; clearTimeout(afkTimers.get(room.id)); afkTimers.delete(room.id); return; }
  const key = g.id + ":" + t + ":" + (g.seq || 0);
  if (g.afkKey === key && afkTimers.has(room.id)) return;
  clearTimeout(afkTimers.get(room.id));
  g.afkKey = key; g.afkSeat = t; g.turnDeadline = Date.now() + turnMs(g);
  afkTimers.set(room.id, setTimeout(() => {
    afkTimers.delete(room.id);
    const g2 = room.game;
    if (!g2 || g2 !== g || g2.phase !== "playing" || g2.afkKey !== key) return;
    const mod: any = GAMES[g2.type], st = g2.state;
    let res: Res = { err: "no move" };
    try {
      const m = g2.type === "battleship" && st.phase === "setup" ? { action: "ready" } : mod.bot ? mod.bot(st, t, "medium") : botMove(g2.type, st, t, "medium");
      if (m) res = mod.move(st, t, m);
    } catch (e) { console.error("afk move error", e); }
    g2.seq = (g2.seq || 0) + 1;
    if (res.err) { console.error("afk move failed", g2.type, res.err); if (g2.seats.length === 2) { finish(room, g2.seats[1 - t]); return; } }
    for (const m of room.members.values()) sendTo(room, m.user.id, { t: "err", msg: g2.names[g2.seats[t]].name + " ran out of time, so a move was made for them" });
    if (res.done) { endGame(room, res); return; }
    broadcast(room); scheduleBots(room); scheduleTick(room); scheduleAfk(room);
  }, turnMs(g)));
}
// ---------- Discord-wide play: quick match, public lobbies, emotes ----------
const userGuild = new Map<string, string>();      // user id -> Discord server (guild) id, sent by the client
const homeRoom = new Map<string, string>();       // user id -> their own call's room while they play elsewhere
const queues = new Map<string, { user: User; at: number }[]>(); // game type -> waiting players
const lastEmote = new Map<string, number>();
const EMOTES = ["👍", "😂", "😮", "😡", "❤️", "🔥", "GG!", "Nice move!", "Oops 😅", "Hurry up! ⏱", "Good luck!", "Well played!"];
let matchSeq = 0;
function moveUser(user: User, fromId: string, toId: string) {
  if (fromId === toId) return;
  const from = rooms.get(fromId), to = getRoom(toId);
  const m = from?.members.get(user.id);
  const sockets: Set<any> = m ? m.sockets : new Set();
  if (from) {
    const g = from.game;
    if (g && g.phase === "lobby" && g.seats.includes(user.id)) handle(from, user, { t: "stand" });
    from.members.delete(user.id);
    if (!from.members.size && !(from.game && from.game.phase === "playing")) rooms.delete(fromId); else broadcast(from);
  }
  for (const ws of sockets) ws.data.room = toId;
  const ex = to.members.get(user.id);
  if (ex) for (const ws of sockets) ex.sockets.add(ws); else to.members.set(user.id, { user, sockets });
}
function leaveQueues(uid: string) { for (const [k, q] of queues) { const i = q.findIndex((x) => x.user.id === uid); if (i >= 0) { q.splice(i, 1); notifyQueue(k); } } }
function notifyQueue(type: string) {
  const q = queues.get(type) || [], need = matchNeed(type);
  for (const x of q) for (const r of rooms.values()) if (r.members.has(x.user.id)) sendTo(r, x.user.id, { t: "queue", game: type, n: q.length, need });
}
const matchNeed = (type: string) => { const mod: any = GAMES[type]; return mod.noBots ? mod.min : 2; };
function roomOf(uid: string) { for (const r of rooms.values()) if (r.members.has(uid)) return r; return null; }
function tryMatch(type: string) {
  const q = queues.get(type) || [], mod: any = GAMES[type], need = matchNeed(type);
  if (q.length < need) return;
  const take = q.splice(0, Math.min(q.length, mod.max));
  const id = "mm:" + ++matchSeq;
  for (const x of take) {
    const cur = roomOf(x.user.id);
    if (!cur) continue;
    if (!cur.id.startsWith("mm:") && !homeRoom.has(x.user.id)) homeRoom.set(x.user.id, hubOf(cur.id));
    moveUser(x.user, cur.id, id);
  }
  const room = getRoom(id), players = take.map((x) => x.user).filter((u) => room.members.has(u.id));
  if (players.length < need) { for (const u of players) returnHome(u); return; }
  const g: Game = { id: ++gameSeq, type, phase: "lobby", hostId: players[0].id, seats: players.map((u) => u.id), state: null, winner: null, names: Object.fromEntries(players.map((u) => [u.id, u])) };
  room.game = g; room.vis = "call";
  while (g.seats.length < mod.min && !mod.noBots) { const bid = "bot:medium:" + ++botSeq; g.seats.push(bid); g.names[bid] = { id: bid, name: "Medium Bot" + (g.seats.length > 2 ? " " + (g.seats.length - 1) : ""), avatar: null, guest: true, bot: true, level: "medium" }; }
  g.state = mod.init(g.seats.length); g.phase = "playing"; g.winners = [];
  for (const u of players) sendTo(room, u.id, { t: "queue", game: type, n: 0, need, matched: true });
  broadcast(room); scheduleBots(room); scheduleTick(room); scheduleAfk(room);
}
function returnHome(user: User) {
  const cur = roomOf(user.id), home = homeRoom.get(user.id);
  if (!cur || !home) return;
  homeRoom.delete(user.id);
  moveUser(user, cur.id, home);
  const r = rooms.get(home); if (r) broadcast(r);
}
function lobbiesFor(user: User, here: string) {
  const guild = userGuild.get(user.id), out: any[] = [];
  for (const r of rooms.values()) {
    const g = r.game;
    if (hubOf(r.id) === hubOf(here) || !g || g.phase !== "lobby" || !r.vis || r.vis === "call") continue;
    if (r.vis === "server" && (!guild || r.guild !== guild)) continue;
    if (g.seats.length >= GAMES[g.type].max) continue;
    out.push({ room: r.id, game: g.type, name: GAMES[g.type].name, host: g.names[g.hostId]?.name || "?", seats: g.seats.length, max: GAMES[g.type].max, vis: r.vis, sameServer: !!guild && r.guild === guild });
  }
  return out.sort((a, b) => +b.sameServer - +a.sameServer).slice(0, 40);
}
// Online actions; returns true when handled.
function online(room: Room, user: User, m: any): boolean {
  switch (m.t) {
    case "meta":
      if (typeof m.guild === "string" && /^\d{5,25}$/.test(m.guild)) { userGuild.set(user.id, m.guild); if (!room.id.startsWith("mm:") && !homeRoom.has(user.id)) room.guild = room.guild || m.guild; }
      return true;
    case "emote": {
      const i = Number(m.e), now = Date.now();
      if (!(i >= 0 && i < EMOTES.length) || now - (lastEmote.get(user.id) || 0) < 800) return true;
      lastEmote.set(user.id, now);
      for (const mm of room.members.values()) sendTo(room, mm.user.id, { t: "emote", from: user.id, name: user.name, e: EMOTES[i] });
      return true;
    }
    case "vis": {
      const g = room.game;
      if (!g || g.phase !== "lobby" || g.hostId !== user.id || !["call", "server", "public"].includes(m.v)) return true;
      room.vis = m.v; broadcast(room); return true;
    }
    case "browse":
      sendTo(room, user.id, { t: "online", lobbies: lobbiesFor(user, room.id), queues: Object.fromEntries([...queues].filter(([, q]) => q.length).map(([k, q]) => [k, q.length])) });
      return true;
    case "joinroom": {
      const target = rooms.get(String(m.room)), g = target?.game;
      if (!target || !g || g.phase !== "lobby") { sendTo(room, user.id, { t: "err", msg: "That lobby is gone" }); return true; }
      if (!lobbiesFor(user, room.id).some((l) => l.room === target.id)) { sendTo(room, user.id, { t: "err", msg: "Can't join that lobby" }); return true; }
      const mine = room.game;
      if (mine && mine.phase === "playing" && mine.seats.includes(user.id)) { sendTo(room, user.id, { t: "err", msg: "Finish your current game first" }); return true; }
      leaveQueues(user.id);
      if (!homeRoom.has(user.id)) homeRoom.set(user.id, hubOf(room.id));
      moveUser(user, room.id, target.id);
      handle(target, user, { t: "sit" });
      broadcast(target); return true;
    }
    case "qm": {
      if (!GAMES[m.game]) return true;
      const mine = room.game;
      if (mine && mine.phase === "playing" && mine.seats.includes(user.id)) { sendTo(room, user.id, { t: "err", msg: "Finish your current game first" }); return true; }
      leaveQueues(user.id);
      const q = queues.get(m.game) || []; q.push({ user, at: Date.now() }); queues.set(m.game, q);
      notifyQueue(m.game); tryMatch(m.game); return true;
    }
    case "jointable": {
      const target = rooms.get(String(m.room)), hub = hubOf(room.id);
      if (!target || !isTable(target.id) || hubOf(target.id) !== hub || !target.game) { sendTo(room, user.id, { t: "err", msg: "That table is gone" }); return true; }
      if (target === room) { if (m.sit && room.game?.phase === "lobby") { const e = handle(room, user, { t: "sit" }); if (e) sendTo(room, user.id, { t: "err", msg: e }); broadcast(room); } return true; }
      const mine = room.game;
      if (mine && mine.phase === "playing" && mine.seats.includes(user.id) && isTable(room.id)) { sendTo(room, user.id, { t: "err", msg: "Finish your current game first" }); return true; }
      leaveQueues(user.id);
      if (isTable(room.id)) leaveTable(room, user, false);
      if (!homeRoom.has(user.id)) homeRoom.set(user.id, hub);
      moveUser(user, room.id, target.id);
      if (m.sit && target.game && target.game.phase === "lobby") { const e = handle(target, user, { t: "sit" }); if (e) sendTo(target, user.id, { t: "err", msg: e }); }
      broadcast(target); return true;
    }
    case "leavetable": {
      if (!isTable(room.id)) { const g = room.game; if (room.id.startsWith("mm:")) return online(room, user, { t: "home" }); if (g && g.phase !== "playing") { handle(room, user, { t: g.phase === "lobby" ? "stand" : "back" }); broadcast(room); } return true; }
      leaveTable(room, user, true); return true;
    }
    case "qmcancel": leaveQueues(user.id); sendTo(room, user.id, { t: "queue", game: "", n: 0, need: 0 }); return true;
    case "home": {
      const g = room.game;
      if (g && g.phase === "playing" && g.seats.includes(user.id) && g.seats.filter((x) => !isBot(x)).length > 1) { sendTo(room, user.id, { t: "err", msg: "Finish or resign this game first" }); return true; }
      returnHome(user); return true;
    }
  }
  return false;
}
// Leaving a table: in a lobby you give up your seat; mid-game a bot takes over your seat if other people are still playing.
function leaveTable(room: Room, user: User, goHome: boolean) {
  const g = room.game, i = g ? g.seats.indexOf(user.id) : -1;
  if (g && g.phase === "playing" && i >= 0) {
    const others = g.seats.some((id, k) => k !== i && !isBot(id) && room.members.has(id));
    if (others) {
      const bid = "bot:medium:" + ++botSeq;
      g.seats[i] = bid; g.names[bid] = { id: bid, name: user.name + " (bot)", avatar: null, guest: true, bot: true, level: "medium" };
      for (const mm of room.members.values()) if (mm.user.id !== user.id) sendTo(room, mm.user.id, { t: "err", msg: user.name + " left, so a bot took over their seat" });
      g.seq = (g.seq || 0) + 1;
    } else room.game = null;
  }
  if (goHome) {
    const hub = hubOf(room.id);
    homeRoom.delete(user.id);
    moveUser(user, room.id, hub);
    if (room.game && room.members.size === 0 && room.game.phase !== "playing") rooms.delete(room.id);
    if (!room.members.size && (!room.game || !room.game.seats.some((id) => !isBot(id)))) rooms.delete(room.id);
    const h = rooms.get(hub); if (h) broadcast(h);
  }
  if (rooms.has(room.id)) { scheduleBots(room); scheduleAfk(room); scheduleTick(room); broadcast(room); cleanupTable(room); }
}
// a table whose game was closed sends anyone still there back to the call
function cleanupTable(room: Room) {
  if (!isTable(room.id) || room.game || !rooms.has(room.id)) return;
  const hub = hubOf(room.id);
  for (const m of [...room.members.values()]) { homeRoom.delete(m.user.id); moveUser(m.user, room.id, hub); }
  rooms.delete(room.id);
  const h = rooms.get(hub); if (h) broadcast(h);
}
function inviteCall(table: Room, host: User) {
  const g = table.game; if (!g) return;
  for (const r of callRooms(hubOf(table.id))) if (r !== table) for (const m of r.members.values()) if (m.user.id !== host.id) sendTo(r, m.user.id, { t: "invite", room: table.id, game: g.type, name: GAMES[g.type].name, host: host.name, id: g.id });
}
function getRoom(id: string): Room { let r = rooms.get(id); if (!r) { r = { id, members: new Map(), game: null }; rooms.set(id, r); } return r; }

function status(room: Room, uid: string) {
  room = roomOf(uid) || room;
  const g = room.game;
  if (g && g.seats.includes(uid)) return g.phase === "lobby" ? "In lobby · " + GAMES[g.type].name : "Playing " + GAMES[g.type].name;
  return "Hanging out";
}
function view(room: Room, uid: string) {
  const g = room.game;
  let game: any = null;
  if (g) {
    const mod = GAMES[g.type], seat = g.seats.indexOf(uid);
    game = { id: g.id, type: g.type, name: mod.name, phase: g.phase, hostId: g.hostId, seat, winner: g.winner, winners: g.winners || (g.winner ? [g.winner] : []), min: mod.min, max: mod.max,
      seats: g.seats.map((id) => ({ ...g.names[id], online: isBot(id) || room.members.has(id) })),
      state: g.state ? mod.view(g.state, seat) : null, turn: g.state && g.phase === "playing" ? mod.turn(g.state) : null,
      turnDeadline: g.phase === "playing" ? g.turnDeadline || 0 : 0, turnTotal: g.phase === "playing" && g.turnDeadline ? turnMs(g) : 0, afkSeat: g.phase === "playing" ? (g.afkSeat ?? -1) : -1, now: Date.now(), yourTurn: yourTurn(g, seat) };
  }
  const hub = hubOf(room.id), call = room.id.startsWith("mm:") ? [room] : callRooms(hub), seen = new Set<string>(), members: any[] = [];
  for (const r of call) for (const m of r.members.values()) if (!seen.has(m.user.id)) { seen.add(m.user.id); members.push({ ...m.user, status: status(r, m.user.id) }); }
  const tables = room.id.startsWith("mm:") ? [] : call.filter((r) => isTable(r.id) && r.game).map((r) => { const t = r.game!; return { room: r.id, id: t.id, type: t.type, name: GAMES[t.type].name, phase: t.phase, host: t.names[t.hostId]?.name || "?", seats: t.seats.map((id) => ({ name: t.names[id]?.name || "?", bot: isBot(id), id })), max: GAMES[t.type].max, watchers: [...r.members.keys()].filter((id) => !t.seats.includes(id)).length }; });
  const home = homeRoom.get(uid);
  return { t: "state", you: uid, members, game, tables, table: isTable(room.id) ? room.id : "", away: !!home && hubOf(room.id) !== home, vis: room.vis || "call", match: room.id.startsWith("mm:") };
}
const sendTo = (room: Room, uid: string, msg: any) => { const m = room.members.get(uid); if (m) for (const ws of m.sockets) ws.send(JSON.stringify(msg)); };
function broadcast(room: Room) {
  const list = room.id.startsWith("mm:") ? [room] : callRooms(hubOf(room.id));
  for (const r of list) for (const m of r.members.values()) for (const ws of m.sockets) ws.send(JSON.stringify(view(r, m.user.id)));
}

async function finish(room: Room, winner: string | null) {
  const g = room.game!; g.phase = "over"; g.winner = winner;
  broadcast(room);
  const players = g.seats.map((id) => g.names[id]);
  await recordResult(g.type, players, winner, g.winners);
  const rows = await leaderboard();
  for (const m of room.members.values()) sendTo(room, m.user.id, { t: "lb", rows });
  for (const p of players) if (room.members.has(p.id)) sendTo(room, p.id, { t: "me", profile: await profile(p) });
}

function handle(room: Room, user: User, m: any): string | void {
  const g = room.game;
  switch (m.t) {
    case "pick":
      if (!GAMES[m.game]) return "Unknown game";
      if (!isTable(room.id) && !room.id.startsWith("mm:")) {
        const id = room.id + "#" + ++tableSeq, t = getRoom(id);
        t.guild = room.guild; t.vis = "call";
        if (!homeRoom.has(user.id)) homeRoom.set(user.id, room.id);
        moveUser(user, room.id, id);
        t.game = { id: ++gameSeq, type: m.game, phase: "lobby", hostId: user.id, seats: [user.id], state: null, winner: null, names: { [user.id]: user } };
        inviteCall(t, user); broadcast(t); return "__done";
      }
      if (g && g.phase !== "over") return g.phase === "lobby" ? "A lobby is already open" : "A game is already running";
      room.game = { id: ++gameSeq, type: m.game, phase: "lobby", hostId: user.id, seats: [user.id], state: null, winner: null, names: { [user.id]: user } };
      return;
    case "sit":
      if (!g || g.phase !== "lobby") return "Can't join now";
      if (g.seats.includes(user.id)) return;
      if (g.seats.length >= GAMES[g.type].max) return "Game is full";
      g.seats.push(user.id); g.names[user.id] = user; return;
    case "addbot": {
      if (!g || g.phase !== "lobby") return;
      if (!g.seats.includes(user.id)) return "Join the game first";
      if (g.seats.length >= GAMES[g.type].max) return "Game is full";
      if ((GAMES[g.type] as any).noBots) return "This one needs real people — invite friends from the call!";
      const level = (["easy", "medium", "hard"].includes(m.level) ? m.level : "medium") as Level;
      const id = "bot:" + level + ":" + ++botSeq;
      let bname = BOT_NAMES[level];
      const same = g.seats.filter((x) => g.names[x] && g.names[x].name.startsWith(bname)).length;
      if (same) bname += " " + (same + 1);
      g.seats.push(id); g.names[id] = { id, name: bname, avatar: null, guest: true, bot: true, level }; return;
    }
    case "kick":
      if (!g || g.phase !== "lobby" || !g.seats.includes(user.id)) return;
      if (typeof m.id === "string" && isBot(m.id)) g.seats = g.seats.filter((x) => x !== m.id);
      return;
    case "stand":
      if (!g || g.phase !== "lobby") return;
      g.seats = g.seats.filter((id) => id !== user.id);
      if (!g.seats.some((id) => !isBot(id))) { room.game = null; return; }
      if (g.hostId === user.id) g.hostId = g.seats.find((id) => !isBot(id))!;
      return;
    case "start":
    case "rematch": {
      if (!g) return;
      if (m.t === "start" && g.phase !== "lobby") return;
      if (m.t === "rematch" && g.phase !== "over") return;
      if (!g.seats.includes(user.id)) return "Only players can start";
      const mod = GAMES[g.type];
      if (m.t === "rematch") { g.seats = g.seats.filter((id) => isBot(id) || room.members.has(id)); g.seats.push(g.seats.shift()!); }
      if (g.seats.length < mod.min) return "Need at least " + mod.min + " players";
      g.state = mod.init(g.seats.length); g.phase = "playing"; g.winner = null; g.winners = []; return;
    }
    case "back":
      if (!g) return;
      if (isTable(room.id)) { leaveTable(room, user, true); return "__done"; }
      if (g.phase === "playing" && !g.seats.includes(user.id)) return "Only players can end the game";
      if (g.phase === "lobby" && g.hostId !== user.id) return "Only the host can close the lobby";
      room.game = null; return;
    case "resign": {
      if (!g || g.phase !== "playing") return;
      const seat = g.seats.indexOf(user.id);
      if (seat < 0) return;
      if (g.seats.length === 2) { finish(room, g.seats[1 - seat]); return "__done"; }
      return "Resign is only for 2-player games";
    }
    case "move": {
      if (!g || g.phase !== "playing") return;
      const seat = g.seats.indexOf(user.id);
      if (seat < 0) return "You're spectating";
      const res = GAMES[g.type].move(g.state, seat, m);
      if (res.err) return res.err;
      g.seq = (g.seq || 0) + 1;
      if (res.done) { endGame(room, res); return "__done"; }
      return;
    }
  }
  return "Unknown action";
}

// ---------- http + websocket ----------
const NOCACHE = { "Cache-Control": "no-cache, no-store, must-revalidate" };
const html = (a: typeof A) => `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>GAM.IO</title><style>${a.css}</style></head><body><div id="app"><div class="splash"><div class="logo">🎲</div><p id="status">Loading…</p></div></div><script type="module" src="/client.js?v=${a.ver}"></script></body></html>`;
const json = (d: any, status = 200) => new Response(JSON.stringify(d), { status, headers: { "Content-Type": "application/json" } });

const server = Bun.serve({
  port: PORT,
  async fetch(req, server) {
    const url = new URL(req.url);
    const path = url.pathname.replace(/^\/\.proxy/, "");
    if (path === "/ws") {
      let user: User | null = null;
      const token = url.searchParams.get("token"), guest = url.searchParams.get("guest");
      if (token) user = await userFromToken(token);
      else if (guest) user = { id: "guest:" + (url.searchParams.get("gid") || crypto.randomUUID()).slice(0, 40), name: guest.slice(0, 24) || "Guest", avatar: null, guest: true };
      if (!user) return new Response("unauthorized", { status: 401 });
      const room = (url.searchParams.get("room") || "lobby").slice(0, 100);
      if (server.upgrade(req, { data: { user, room } })) return undefined as any;
      return new Response("upgrade failed", { status: 400 });
    }
    if (path === "/" || path === "/index.html") return new Response(html(await assets()), { headers: { "Content-Type": "text/html; charset=utf-8", ...NOCACHE } });
    if (path === "/client.js") return new Response((await assets()).js, { headers: { "Content-Type": "text/javascript", ...NOCACHE } });
    if (path === "/sdk.js") return SDK_JS ? new Response(SDK_JS, { headers: { "Content-Type": "text/javascript", "Cache-Control": "max-age=3600" } }) : new Response("sdk unavailable", { status: 503 });
    if (path === "/api/config") return json({ clientId: CLIENT_ID });
    if (path === "/api/token" && req.method === "POST") {
      const { code } = (await req.json().catch(() => ({}))) as any;
      if (!code) return json({ error: "missing code" }, 400);
      const r = await fetch("https://discord.com/api/oauth2/token", {
        method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ client_id: CLIENT_ID, client_secret: CLIENT_SECRET, grant_type: "authorization_code", code }),
      });
      const d: any = await r.json();
      if (!r.ok) { console.error("token exchange failed", d); return json({ error: "token exchange failed" }, 400); }
      return json({ access_token: d.access_token });
    }
    const av = path.match(/^\/avatar\/(\d+)\/(\w+)$/);
    if (av) {
      const r = await fetch(`https://cdn.discordapp.com/avatars/${av[1]}/${av[2]}.png?size=128`);
      return new Response(r.body, { status: r.status, headers: { "Content-Type": "image/png", "Cache-Control": "max-age=86400" } });
    }
    if (path === "/health") { const a = await assets(); return json({ ok: true, ver: a.ver, ui: a.js.length, rooms: rooms.size, sdk: !!SDK_JS, db: !!sql, games: Object.keys(GAMES) }); }
    return new Response("not found", { status: 404 });
  },
  websocket: {
    async open(ws: any) {
      const { user } = ws.data;
      const home = homeRoom.get(user.id);
      if (home) { // they were playing elsewhere: put them back there if it still exists
        const away = [...rooms.values()].find((r) => r.id !== home && r.game && r.game.seats.includes(user.id) && r.game.phase !== "over");
        if (away) ws.data.room = away.id; else homeRoom.delete(user.id);
      }
      const rid = ws.data.room; const room = getRoom(rid);
      let m = room.members.get(user.id);
      if (!m) { m = { user, sockets: new Set() }; room.members.set(user.id, m); }
      m.sockets.add(ws);
      broadcast(room);
      ws.send(JSON.stringify({ t: "lb", rows: await leaderboard() }));
      ws.send(JSON.stringify({ t: "me", profile: await profile(user) }));
    },
    message(ws: any, raw) {
      const { user, room: rid } = ws.data; const room = getRoom(rid);
      let msg: any; try { msg = JSON.parse(String(raw)); } catch { return; }
      if (msg.t === "ping") return;
      if (online(room, user, msg)) return;
      const err = handle(room, user, msg);
      if (err === "__done") return;
      if (err) ws.send(JSON.stringify({ t: "err", msg: err }));
      scheduleBots(room); scheduleTick(room); scheduleAfk(room);
      broadcast(room); cleanupTable(room);
    },
    close(ws: any) {
      const { user, room: rid } = ws.data; const room = rooms.get(rid); if (!room) return;
      const m = room.members.get(user.id); if (!m) return;
      m.sockets.delete(ws);
      if (m.sockets.size) return;
      room.members.delete(user.id);
      leaveQueues(user.id);
      const g = room.game;
      if (g && g.phase === "lobby") { handle(room, user, { t: "stand" }); cleanupTable(room); if (!rooms.has(rid)) return; }
      if (!room.members.size) {
        // keep a running game around for a few minutes so a dropped player can reconnect
        if (!g || g.phase !== "playing") { rooms.delete(rid); return; }
        setTimeout(() => { const r = rooms.get(rid); if (r && !r.members.size) rooms.delete(rid); }, 5 * 60_000);
        return;
      }
      broadcast(room);
    },
  },
});
console.log("GAM.IO listening on", server.port);

// Game Night plugin: card pack (Color Clash, Hearts, Spades, Hold'em Poker) with bots. Loaded by the game server at startup.
// No template literals in this file: it is embedded in a String.raw block by the service that serves it.
export default function register(api: any) {
  const shuffle: (a: any[]) => any[] = api.shuffle;
  const rnd = (a: any[]) => a[Math.floor(Math.random() * a.length)];
  const now = () => Date.now();
  const RK = "23456789TJQKA";
  const rv = (c: string) => RK.indexOf(c[0]);
  const deck52 = () => shuffle("SHDC".split("").flatMap((s) => RK.split("").map((r) => r + s)));
  const sortHand = (h: string[]) => h.sort((a, b) => "CDSH".indexOf(a[1]) - "CDSH".indexOf(b[1]) || rv(a) - rv(b));
  const lowest = (cs: string[]) => cs.slice().sort((a, b) => rv(a) - rv(b))[0];
  const highest = (cs: string[]) => cs.slice().sort((a, b) => rv(b) - rv(a))[0];
  const TRICK_MS = 1400, HAND_MS = 6000;

  // ================= Color Clash (Uno-style) =================
  // cards: color R/G/B/Y + value 0-9, S skip, R reverse, D draw two; wilds: "KW" wild, "KF" wild draw four
  function clashDeck() {
    const d: string[] = [];
    for (const c of "RGBY") { d.push(c + "0"); for (const v of "123456789SRD") d.push(c + v, c + v); }
    for (let i = 0; i < 4; i++) d.push("KW", "KF");
    return shuffle(d);
  }
  const clashOk = (s: any, c: string) => c[0] === "K" || c[0] === s.color || c[1] === s.discard[s.discard.length - 1][1];
  function clashDraw(s: any, seat: number, k: number) {
    for (let i = 0; i < k; i++) {
      if (!s.deck.length) { const t = s.discard.pop(); s.deck = shuffle(s.discard); s.discard = [t]; }
      if (s.deck.length) s.hands[seat].push(s.deck.shift());
    }
  }
  const clashNext = (s: any, k: number) => { const n = s.hands.length; return (((s.turn + s.dir * k) % n) + n) % n; };
  const clash = {
    name: "Color Clash", min: 2, max: 6,
    init(n: number) {
      const deck = clashDeck(), hands = Array.from({ length: n }, () => deck.splice(0, 7));
      let i = deck.findIndex((c) => /[0-9]/.test(c[1]));
      const top = deck.splice(i, 1)[0];
      return { deck, discard: [top], hands, turn: 0, dir: 1, color: top[0], drew: false, log: "" };
    },
    turn: (s: any) => s.turn,
    view: (s: any, seat: number) => ({ top: s.discard[s.discard.length - 1], color: s.color, turn: s.turn, dir: s.dir, drew: s.drew, deck: s.deck.length, counts: s.hands.map((h: string[]) => h.length), hand: seat >= 0 ? s.hands[seat] : null, log: s.log }),
    move(s: any, seat: number, m: any) {
      if (s.turn !== seat) return { err: "Not your turn" };
      const hand: string[] = s.hands[seat], n = hand.length;
      if (m.action === "play") {
        const i = hand.indexOf(m.card);
        if (i < 0) return { err: "You don't have that card" };
        if (!clashOk(s, m.card)) return { err: "That card doesn't match" };
        if (m.card[0] === "K" && !"RGBY".includes(m.color)) return { err: "Pick a color" };
        hand.splice(i, 1); s.discard.push(m.card);
        s.color = m.card[0] === "K" ? m.color : m.card[0];
        s.log = "{" + seat + "} played " + m.card + (m.card[0] === "K" ? ">" + m.color : "");
        s.drew = false;
        if (!hand.length) return { done: true, winner: seat };
        const v = m.card[1], np = s.hands.length;
        if (v === "R") { s.dir = -s.dir; s.turn = clashNext(s, np === 2 ? 2 : 1); return {}; }
        if (v === "S") { s.turn = clashNext(s, 2); return {}; }
        if (v === "D" || v === "F") { const vic = clashNext(s, 1); clashDraw(s, vic, v === "D" ? 2 : 4); s.log += " · {" + vic + "} draws " + (v === "D" ? 2 : 4); s.turn = clashNext(s, 2); return {}; }
        s.turn = clashNext(s, 1); return {};
      }
      if (m.action === "draw") {
        if (s.drew) return { err: "You already drew — play or pass" };
        clashDraw(s, seat, 1); s.drew = true; s.log = "{" + seat + "} drew a card"; return {};
      }
      if (m.action === "pass") {
        if (!s.drew) return { err: "Draw first" };
        s.drew = false; s.turn = clashNext(s, 1); s.log = "{" + seat + "} passed"; return {};
      }
      void n;
      return { err: "Bad move" };
    },
    bot(s: any, seat: number, level: string) {
      const hand: string[] = s.hands[seat], ok = hand.filter((c) => clashOk(s, c));
      const colorCount = (c: string) => hand.filter((x) => x[0] === c).length;
      const bestColor = () => "RGBY".split("").sort((a, b) => colorCount(b) - colorCount(a))[0];
      if (!ok.length) return s.drew ? { action: "pass" } : { action: "draw" };
      if (level === "easy") { const c = rnd(ok); return { action: "play", card: c, color: rnd("RGBY".split("")) }; }
      const nextLeft = s.hands[clashNext(s, 1)].length;
      const score = (c: string) => {
        let v = 0;
        if (c[0] === "K") v -= 30; // save wilds
        else v += colorCount(c[0]) * 3;
        if ("SDR".includes(c[1])) v += level === "hard" && nextLeft <= 3 ? 40 : 2;
        if (c[1] === "F" && level === "hard" && nextLeft <= 2) v += 80;
        if (/[0-9]/.test(c[1])) v += Number(c[1]) * 0.3; // dump high numbers
        return v;
      };
      let pick = ok.slice().sort((a, b) => score(b) - score(a))[0];
      if (level === "medium" && Math.random() < 0.2) pick = rnd(ok);
      return { action: "play", card: pick, color: bestColor() };
    },
  };

  // ================= trick-taking helpers =================
  function trickWinner(trick: any[], trump: string | null) {
    const led = trick[0].card[1];
    let best = trick[0];
    for (const t of trick.slice(1)) {
      const c = t.card, b = best.card;
      if (trump && c[1] === trump && b[1] !== trump) best = t;
      else if (c[1] === b[1] && rv(c) > rv(b)) best = t;
    }
    void led;
    return best.seat;
  }
  // cards still unseen by this seat (for "boss card" reasoning)
  const unseen = (s: any, seat: number) => deck52().filter((c) => !s.played.includes(c) && !s.hands[seat].includes(c));
  const isBoss = (s: any, seat: number, c: string) => !unseen(s, seat).some((x) => x[1] === c[1] && rv(x) > rv(c));

  // ================= Hearts =================
  const PASS_DIR = [1, 3, 2, 0]; // left, right, across, hold
  const PASS_NAME = ["left", "right", "across", "none"];
  const hPts = (c: string) => (c[1] === "H" ? 1 : c === "QS" ? 13 : 0);
  function heartsDeal(s: any) {
    const d = deck52();
    s.hands = [0, 1, 2, 3].map((i) => sortHand(d.slice(i * 13, i * 13 + 13)));
    s.pts = [0, 0, 0, 0]; s.trick = []; s.played = []; s.broken = false; s.tricks = 0; s.last = null; s.deadline = 0;
    s.dirIdx = s.hand % 4; s.passed = [null, null, null, null]; s.got = null;
    if (PASS_DIR[s.dirIdx] === 0) heartsStartPlay(s); else { s.phase = "pass"; s.turn = -1; }
  }
  function heartsStartPlay(s: any) {
    s.phase = "play"; s.turn = s.hands.findIndex((h: string[]) => h.includes("2C")); s.leader = s.turn;
  }
  function heartsLegal(s: any, seat: number): string[] {
    const h: string[] = s.hands[seat];
    if (!s.trick.length) {
      if (s.tricks === 0) return h.includes("2C") ? ["2C"] : h;
      const non = h.filter((c) => c[1] !== "H");
      return s.broken || !non.length ? h : non;
    }
    const led = s.trick[0].card[1], follow = h.filter((c) => c[1] === led);
    if (follow.length) return follow;
    if (s.tricks === 0) { const safe = h.filter((c) => !hPts(c)); if (safe.length) return safe; }
    return h;
  }
  const hearts = {
    name: "Hearts", min: 4, max: 4,
    init() { const s: any = { scores: [0, 0, 0, 0], hand: 0, history: [] }; heartsDeal(s); return s; },
    turn: (s: any) => (s.phase === "play" ? s.turn : null),
    pending: (s: any) => (s.phase === "pass" ? [0, 1, 2, 3].filter((i) => !s.passed[i]) : []),
    view(s: any, seat: number) {
      return { phase: s.phase, hand: seat >= 0 ? s.hands[seat] : null, counts: s.hands.map((h: string[]) => h.length), trick: s.trick, last: s.last, turn: s.turn, scores: s.scores, pts: s.pts, broken: s.broken,
        passDir: PASS_NAME[s.dirIdx], passedMe: seat >= 0 ? !!s.passed[seat] : false, passedN: s.passed.filter(Boolean).length, got: seat >= 0 && s.got ? s.got[seat] : null,
        legal: seat >= 0 && s.phase === "play" && s.turn === seat ? heartsLegal(s, seat) : [], history: s.history, deadline: s.deadline, now: now(), handNo: s.hand + 1, tricks: s.tricks };
    },
    move(s: any, seat: number, m: any) {
      if (s.phase === "pass") {
        if (s.passed[seat]) return { err: "Already passed — waiting for others" };
        const cs: string[] = Array.isArray(m.cards) ? m.cards : [];
        if (cs.length !== 3 || new Set(cs).size !== 3 || !cs.every((c) => s.hands[seat].includes(c))) return { err: "Pick exactly 3 cards to pass" };
        s.passed[seat] = cs; s.hands[seat] = s.hands[seat].filter((c: string) => !cs.includes(c));
        if (s.passed.every(Boolean)) {
          const d = PASS_DIR[s.dirIdx]; s.got = [[], [], [], []];
          for (let i = 0; i < 4; i++) { const to = (i + d) % 4; s.hands[to].push(...s.passed[i]); s.got[to] = s.passed[i]; sortHand(s.hands[to]); }
          heartsStartPlay(s);
        }
        return {};
      }
      if (s.phase !== "play") return { err: "Wait a moment" };
      if (s.turn !== seat) return { err: "Not your turn" };
      const c = m.card;
      if (!heartsLegal(s, seat).includes(c)) return { err: s.trick.length ? "You must follow suit" : s.tricks === 0 ? "Lead the 2♣" : "Hearts aren't broken yet" };
      s.hands[seat] = s.hands[seat].filter((x: string) => x !== c); s.trick.push({ seat, card: c }); s.played.push(c);
      if (c[1] === "H" || c === "QS") s.broken = s.broken || c[1] === "H";
      if (s.trick.length < 4) { s.turn = (seat + 1) % 4; return {}; }
      const w = trickWinner(s.trick, null);
      s.pts[w] += s.trick.reduce((a: number, t: any) => a + hPts(t.card), 0);
      s.last = { trick: s.trick, winner: w }; s.tricks++; s.turn = w;
      s.phase = "trick"; s.deadline = now() + TRICK_MS;
      return {};
    },
    tick(s: any) {
      if (s.phase === "trick") {
        s.trick = [];
        if (s.tricks < 13) { s.phase = "play"; s.deadline = 0; return {}; }
        const moon = s.pts.indexOf(26), add = moon >= 0 ? s.pts.map((_: number, i: number) => (i === moon ? 0 : 26)) : s.pts.slice();
        s.scores = s.scores.map((x: number, i: number) => x + add[i]);
        s.history.push({ add, moon });
        s.phase = "handover"; s.deadline = now() + HAND_MS;
        return {};
      }
      if (s.phase === "handover") {
        if (Math.max(...s.scores) >= 100) {
          const lo = Math.min(...s.scores), ws = [0, 1, 2, 3].filter((i) => s.scores[i] === lo);
          s.phase = "done"; s.deadline = 0;
          return { done: true, winner: ws.length === 1 ? ws[0] : null, winners: ws };
        }
        s.hand++; heartsDeal(s); return {};
      }
      return {};
    },
    bot(s: any, seat: number, level: string) {
      const h: string[] = s.hands[seat];
      if (s.phase === "pass") {
        if (level === "easy") return { action: "pass", cards: shuffle(h.slice()).slice(0, 3) };
        const spades = h.filter((c) => c[1] === "S").length;
        const danger = (c: string) => {
          let v = rv(c);
          if (c === "QS") v += spades >= 5 ? -20 : 30;
          if ((c === "AS" || c === "KS") && !h.includes("QS") && spades < 4) v += 20;
          if (c[1] === "H") v += 4;
          if (level === "hard") { const n = h.filter((x) => x[1] === c[1]).length; if (c[1] !== "S" && n <= 3) v += 6 - n; }
          return v;
        };
        return { action: "pass", cards: h.slice().sort((a, b) => danger(b) - danger(a)).slice(0, 3) };
      }
      const legal = heartsLegal(s, seat);
      if (legal.length === 1) return { card: legal[0] };
      if (level === "easy" && Math.random() < 0.5) return { card: rnd(legal) };
      if (!s.trick.length) { // lead: low card from a suit where we are not stuck with high ones
        const hard = level === "hard";
        if (hard && !h.some((c) => c === "QS" || c === "KS" || c === "AS") && legal.some((c) => c[1] === "S") && !s.played.includes("QS")) return { card: lowest(legal.filter((c) => c[1] === "S")) };
        const pool = legal.filter((c) => c !== "QS" && !(c[1] === "H" && rv(c) > 8));
        const src = pool.length ? pool : legal;
        return { card: src.slice().sort((a, b) => rv(a) - rv(b) + (a[1] === "H" ? 3 : 0) - (b[1] === "H" ? 3 : 0))[0] };
      }
      const led = s.trick[0].card[1], following = legal[0][1] === led;
      const winCard = s.trick.reduce((b: any, t: any) => (t.card[1] === led && rv(t.card) > rv(b) ? t.card : b), s.trick[0].card);
      const ptsOnTable = s.trick.reduce((a: number, t: any) => a + hPts(t.card), 0);
      const lastToPlay = s.trick.length === 3;
      if (following) {
        const under = legal.filter((c) => rv(c) < rv(winCard));
        if (lastToPlay && !ptsOnTable && !(led === "S" && legal.includes("QS"))) return { card: highest(legal.filter((c) => c !== "QS")) || highest(legal) };
        if (under.length) return { card: highest(under) };
        if (led === "S" && legal.includes("QS") && legal.length > 1) return { card: highest(legal.filter((c) => c !== "QS")) };
        return { card: lastToPlay ? highest(legal) : lowest(legal) };
      }
      // void in the led suit: dump the worst card
      if (legal.includes("QS")) return { card: "QS" };
      if (level === "hard" && (legal.includes("AS") || legal.includes("KS")) && !s.played.includes("QS")) return { card: legal.includes("AS") ? "AS" : "KS" };
      const hs = legal.filter((c) => c[1] === "H");
      if (hs.length) return { card: highest(hs) };
      return { card: highest(legal) };
    },
  };

  // ================= Spades (partners: seats 0+2 vs 1+3) =================
  function spadesDeal(s: any) {
    const d = deck52();
    s.hands = [0, 1, 2, 3].map((i) => sortHand(d.slice(i * 13, i * 13 + 13)));
    s.bids = [null, null, null, null]; s.won = [0, 0, 0, 0]; s.trick = []; s.played = []; s.broken = false; s.tricks = 0; s.last = null; s.deadline = 0;
    s.phase = "bid"; s.turn = (s.dealer + 1) % 4; s.summary = null;
  }
  function spadesLegal(s: any, seat: number): string[] {
    const h: string[] = s.hands[seat];
    if (!s.trick.length) { const non = h.filter((c) => c[1] !== "S"); return s.broken || !non.length ? h : non; }
    const f = h.filter((c) => c[1] === s.trick[0].card[1]);
    return f.length ? f : h;
  }
  function spadesScore(s: any) {
    const sum: any[] = [];
    for (const t of [0, 1]) {
      const a = t, b = t + 2; let pts = 0, bags = 0; const notes: string[] = [];
      for (const p of [a, b]) if (s.bids[p] === 0) { if (s.won[p] === 0) { pts += 100; notes.push("nil made +100"); } else { pts -= 100; notes.push("nil failed −100"); } }
      const bid = (s.bids[a] || 0) + (s.bids[b] || 0), took = s.won[a] + s.won[b];
      if (bid > 0) { if (took >= bid) { pts += bid * 10; bags = took - bid; pts += bags; } else { pts -= bid * 10; notes.push("set!"); } }
      else bags = took;
      s.bags[t] += bags;
      if (s.bags[t] >= 10) { s.bags[t] -= 10; pts -= 100; notes.push("10 bags −100"); }
      s.score[t] += pts;
      sum.push({ bid, took, pts, notes });
    }
    return sum;
  }
  function estTricks(h: string[], played: string[] = []) {
    let t = 0;
    for (const su of "HDC") {
      const cs = h.filter((c) => c[1] === su), n = cs.length;
      if (cs.some((c) => c[0] === "A")) t += n <= 5 ? 1 : 0.7;
      if (cs.some((c) => c[0] === "K") && n >= 2 && n <= 5) t += 0.75;
      if (cs.some((c) => c[0] === "Q") && n >= 3 && n <= 4) t += 0.3;
    }
    const sp = h.filter((c) => c[1] === "S"), ns = sp.length;
    for (const c of sp) { const r = rv(c); if (r === 12) t += 1; else if (r === 11 && ns >= 2) t += 0.9; else if (r === 10 && ns >= 3) t += 0.7; }
    t += Math.max(0, ns - 3) * 0.8;
    for (const su of "HDC") { const n = h.filter((c) => c[1] === su).length; if (ns >= 3 && n === 0) t += 0.6; else if (ns >= 3 && n === 1) t += 0.3; }
    void played;
    return t;
  }
  const spades = {
    name: "Spades", min: 4, max: 4,
    init() { const s: any = { score: [0, 0], bags: [0, 0], dealer: 3, hand: 0 }; spadesDeal(s); return s; },
    turn: (s: any) => (s.phase === "bid" || s.phase === "play" ? s.turn : null),
    view(s: any, seat: number) {
      return { phase: s.phase, hand: seat >= 0 ? s.hands[seat] : null, counts: s.hands.map((h: string[]) => h.length), trick: s.trick, last: s.last, turn: s.turn, bids: s.bids, won: s.won, score: s.score, bags: s.bags, broken: s.broken,
        legal: seat >= 0 && s.phase === "play" && s.turn === seat ? spadesLegal(s, seat) : [], summary: s.summary, deadline: s.deadline, now: now(), handNo: s.hand + 1, dealer: s.dealer, tricks: s.tricks };
    },
    move(s: any, seat: number, m: any) {
      if (s.turn !== seat || (s.phase !== "bid" && s.phase !== "play")) return { err: "Not your turn" };
      if (s.phase === "bid") {
        const b = Number(m.bid);
        if (!(Number.isInteger(b) && b >= 0 && b <= 13)) return { err: "Bid 0 (nil) to 13" };
        s.bids[seat] = b; s.turn = (seat + 1) % 4;
        if (s.bids.every((x: any) => x !== null)) { s.phase = "play"; s.turn = (s.dealer + 1) % 4; }
        return {};
      }
      const c = m.card;
      if (!spadesLegal(s, seat).includes(c)) return { err: s.trick.length ? "You must follow suit" : "Spades aren't broken yet" };
      s.hands[seat] = s.hands[seat].filter((x: string) => x !== c); s.trick.push({ seat, card: c }); s.played.push(c);
      if (c[1] === "S") s.broken = true;
      if (s.trick.length < 4) { s.turn = (seat + 1) % 4; return {}; }
      const w = trickWinner(s.trick, "S");
      s.won[w]++; s.last = { trick: s.trick, winner: w }; s.tricks++; s.turn = w;
      s.phase = "trick"; s.deadline = now() + TRICK_MS;
      return {};
    },
    tick(s: any) {
      if (s.phase === "trick") {
        s.trick = [];
        if (s.tricks < 13) { s.phase = "play"; s.deadline = 0; return {}; }
        s.summary = spadesScore(s); s.phase = "handover"; s.deadline = now() + HAND_MS; return {};
      }
      if (s.phase === "handover") {
        const [a, b] = s.score;
        if (a >= 300 || b >= 300 || a <= -200 || b <= -200) {
          if (a !== b) { const t = a > b ? 0 : 1; s.phase = "done"; s.deadline = 0; return { done: true, winner: null, winners: [t, t + 2] }; }
        }
        s.hand++; s.dealer = (s.dealer + 1) % 4; spadesDeal(s); return {};
      }
      return {};
    },
    bot(s: any, seat: number, level: string) {
      const h: string[] = s.hands[seat], partner = (seat + 2) % 4;
      if (s.phase === "bid") {
        let e = estTricks(h);
        if (level === "easy") return { bid: Math.max(1, Math.round(e + (Math.random() * 2 - 1))) };
        if (level === "hard" && e < 1.2 && !h.some((c) => c[1] === "S" && rv(c) >= 9) && h.filter((c) => c[1] === "S").length <= 3 && s.bids[partner] !== 0) return { bid: 0 };
        // hard: adjust toward 13 total
        if (level === "hard") { const known = s.bids.filter((x: any) => x !== null).reduce((a: number, x: number) => a + x, 0); if (known + e > 14) e -= 0.5; }
        return { bid: Math.max(1, Math.min(13, Math.round(e))) };
      }
      const legal = spadesLegal(s, seat);
      if (legal.length === 1) return { card: legal[0] };
      if (level === "easy" && Math.random() < 0.45) return { card: rnd(legal) };
      const iNil = s.bids[seat] === 0, partnerNil = s.bids[partner] === 0;
      const teamNeed = (s.bids[seat] || 0) + (s.bids[partner] || 0) - s.won[seat] - s.won[partner];
      const beats = (c: string, w: string) => (c[1] === w[1] ? rv(c) > rv(w) : c[1] === "S");
      if (!s.trick.length) {
        if (iNil) return { card: lowest(legal) };
        const boss = legal.filter((c) => c[1] !== "S" && isBoss(s, seat, c));
        if (boss.length && teamNeed > 0) return { card: rnd(boss) };
        if (level === "hard" && legal.some((c) => c[1] === "S" && isBoss(s, seat, c)) && teamNeed > 0) return { card: highest(legal.filter((c) => c[1] === "S")) };
        const nonS = legal.filter((c) => c[1] !== "S");
        return { card: lowest(nonS.length ? nonS : legal) };
      }
      let win = s.trick[0];
      for (const t of s.trick.slice(1)) if (beats(t.card, win.card)) win = t;
      const canWin = legal.filter((c) => beats(c, win.card));
      const loses = legal.filter((c) => !beats(c, win.card));
      if (iNil) return { card: loses.length ? highest(loses) : lowest(legal) };
      const partnerWinning = win.seat === partner && (s.trick.length === 3 || (win.card[1] === "S" ? rv(win.card) >= 10 : isBoss(s, seat, win.card)));
      if (partnerNil && win.seat === partner && canWin.length) return { card: canWin.slice().sort((a, b) => (a[1] === "S" ? 20 : 0) + rv(a) - ((b[1] === "S" ? 20 : 0) + rv(b)))[0] };
      if (partnerWinning || (teamNeed <= 0 && level === "hard")) return { card: lowest(loses.length ? loses : legal) };
      if (canWin.length) {
        const cheapest = canWin.slice().sort((a, b) => (a[1] === "S" ? 20 : 0) + rv(a) - ((b[1] === "S" ? 20 : 0) + rv(b)))[0];
        if (s.trick.length === 3 || level !== "hard") return { card: cheapest };
        const strong = canWin.filter((c) => isBoss(s, seat, c) || c[1] === "S");
        return { card: strong.length ? strong.sort((a, b) => rv(a) - rv(b))[0] : cheapest };
      }
      return { card: lowest(legal.filter((c) => c[1] !== "S").length ? legal.filter((c) => c[1] !== "S") : legal) };
    },
  };

  // ================= Texas Hold'em (chips only) =================
  const HAND_NAMES = ["High card", "Pair", "Two pair", "Three of a kind", "Straight", "Flush", "Full house", "Four of a kind", "Straight flush"];
  function eval5(cs: string[]) {
    const r = cs.map((c) => rv(c) + 2).sort((a, b) => b - a), fl = cs.every((c) => c[1] === cs[0][1]);
    const cnt: Record<number, number> = {}; for (const x of r) cnt[x] = (cnt[x] || 0) + 1;
    const groups = Object.keys(cnt).map(Number).sort((a, b) => cnt[b] - cnt[a] || b - a);
    const u = [...new Set(r)];
    let st = 0;
    if (u.length === 5) { if (r[0] - r[4] === 4) st = r[0]; else if (r[0] === 14 && r[1] === 5) st = 5; }
    let cat: number, tb: number[];
    if (st && fl) { cat = 8; tb = [st]; }
    else if (cnt[groups[0]] === 4) { cat = 7; tb = groups; }
    else if (cnt[groups[0]] === 3 && cnt[groups[1]] === 2) { cat = 6; tb = groups; }
    else if (fl) { cat = 5; tb = r; }
    else if (st) { cat = 4; tb = [st]; }
    else if (cnt[groups[0]] === 3) { cat = 3; tb = groups; }
    else if (cnt[groups[0]] === 2 && cnt[groups[1]] === 2) { cat = 2; tb = groups; }
    else if (cnt[groups[0]] === 2) { cat = 1; tb = groups; }
    else { cat = 0; tb = r; }
    let v = cat; for (let i = 0; i < 5; i++) v = v * 15 + (tb[i] || 0);
    return v;
  }
  function best7(cs: string[]) {
    let b = -1;
    const n = cs.length;
    for (let a = 0; a < n; a++) for (let c = a + 1; c < n; c++) { // drop two cards
      const five = cs.filter((_, i) => i !== a && i !== c);
      if (five.length === 5) { const v = eval5(five); if (v > b) b = v; }
    }
    if (n === 5) b = eval5(cs);
    if (n === 6) for (let a = 0; a < 6; a++) { const v = eval5(cs.filter((_, i) => i !== a)); if (v > b) b = v; }
    return b;
  }
  const handName = (v: number) => HAND_NAMES[Math.floor(v / Math.pow(15, 5))];
  const START = 1000, MAX_HANDS = 30;
  const live = (s: any) => s.stacks.map((_: number, i: number) => i).filter((i: number) => !s.out[i]);
  const inHand = (s: any) => live(s).filter((i: number) => !s.folded[i]);
  const nextLive = (s: any, i: number) => { const n = s.stacks.length; for (let k = 1; k <= n; k++) { const j = (i + k) % n; if (!s.out[j]) return j; } return i; };
  const needs = (s: any, j: number) => !s.out[j] && !s.folded[j] && s.stacks[j] > 0 && (!s.acted[j] || s.bets[j] < s.toCall);
  const nextNeed = (s: any, i: number) => { const n = s.stacks.length; for (let k = 1; k <= n; k++) { const j = (i + k) % n; if (needs(s, j)) return j; } return -1; };
  const nextToAct = (s: any, i: number) => { const n = s.stacks.length; for (let k = 1; k <= n; k++) { const j = (i + k) % n; if (!s.out[j] && !s.folded[j] && s.stacks[j] > 0) return j; } return -1; };
  function blinds(s: any) { const lv = Math.floor(s.hand / 6); return [10 << lv, 20 << lv]; }
  function pkDeal(s: any) {
    const d = deck52(), n = s.stacks.length;
    s.deck = d; s.board = []; s.holes = Array.from({ length: n }, (_, i) => (s.out[i] ? null : [d.pop(), d.pop()]));
    s.folded = Array(n).fill(false); s.bets = Array(n).fill(0); s.contrib = Array(n).fill(0); s.acted = Array(n).fill(false);
    s.street = 0; s.result = null; s.phase = "bet"; s.deadline = 0; s.log = [];
    s.dealer = nextLive(s, s.dealer);
    const players = live(s), [sb, bb] = blinds(s);
    const sbSeat = players.length === 2 ? s.dealer : nextLive(s, s.dealer), bbSeat = nextLive(s, sbSeat);
    const post = (i: number, amt: number) => { const a = Math.min(amt, s.stacks[i]); s.stacks[i] -= a; s.bets[i] += a; s.contrib[i] += a; };
    post(sbSeat, sb); post(bbSeat, bb);
    s.toCall = bb; s.minRaise = bb; s.sb = sbSeat; s.bb = bbSeat;
    s.turn = nextToAct(s, bbSeat);
    s.log.push("Hand " + (s.hand + 1) + " · blinds " + sb + "/" + bb);
    pkSettle(s);
  }
  const potTotal = (s: any) => s.contrib.reduce((a: number, b: number) => a + b, 0);
  function roundDone(s: any) {
    const act = inHand(s).filter((i: number) => s.stacks[i] > 0);
    return act.every((i: number) => s.acted[i] && s.bets[i] === s.toCall) || (act.length === 1 && s.bets[act[0]] >= s.toCall) || act.length === 0;
  }
  function pkSettle(s: any): any {
    if (inHand(s).length === 1) return pkAward(s, false);
    if (s.turn >= 0 && !roundDone(s)) return {};
    // next street (or run out the board when nobody can bet)
    for (;;) {
      if (s.street === 3) return pkAward(s, true);
      s.street++; s.deck.pop();
      if (s.street === 1) s.board.push(s.deck.pop(), s.deck.pop(), s.deck.pop()); else s.board.push(s.deck.pop());
      s.bets = s.bets.map(() => 0); s.toCall = 0; s.minRaise = blinds(s)[1]; s.acted = s.acted.map(() => false);
      const canBet = inHand(s).filter((i: number) => s.stacks[i] > 0);
      if (canBet.length >= 2) { s.turn = nextToAct(s, s.dealer); return {}; }
    }
  }
  function pkAward(s: any, showdown: boolean) {
    const hands = inHand(s), shown: Record<number, any> = {}, gains = Array(s.stacks.length).fill(0);
    if (!showdown) { gains[hands[0]] = potTotal(s); s.result = { winners: [hands[0]], text: "{" + hands[0] + "} wins " + potTotal(s) + " — everyone else folded", shown }; }
    else {
      const val: Record<number, number> = {};
      for (const i of hands) { val[i] = best7(s.holes[i].concat(s.board)); shown[i] = { cards: s.holes[i], name: handName(val[i]) }; }
      const levels = [...new Set(s.contrib.filter((x: number) => x > 0))].sort((a: any, b: any) => a - b) as number[];
      let prev = 0; const texts: string[] = [];
      for (const lv of levels) {
        const amt = s.contrib.reduce((a: number, c: number) => a + Math.max(0, Math.min(c, lv) - prev), 0);
        const elig = hands.filter((i: number) => s.contrib[i] >= lv);
        if (amt > 0 && elig.length) {
          const b = Math.max(...elig.map((i: number) => val[i])), ws = elig.filter((i: number) => val[i] === b);
          ws.forEach((i: number, k: number) => (gains[i] += Math.floor(amt / ws.length) + (k === 0 ? amt % ws.length : 0)));
        } else if (amt > 0) { // only folded money above everyone: give back to biggest contributor still in
          const i = hands.slice().sort((a: number, b: number) => s.contrib[b] - s.contrib[a])[0]; gains[i] += amt;
        }
        prev = lv;
      }
      const ws = gains.map((g: number, i: number) => (g > 0 ? i : -1)).filter((i: number) => i >= 0);
      for (const i of ws) texts.push("{" + i + "} wins " + gains[i] + " with " + shown[i].name.toLowerCase());
      s.result = { winners: ws, text: texts.join(" · "), shown };
    }
    gains.forEach((g: number, i: number) => (s.stacks[i] += g));
    s.lastGains = gains;
    s.stacks.forEach((x: number, i: number) => { if (x <= 0 && !s.out[i]) s.out[i] = true; });
    s.phase = "result"; s.turn = -1; s.deadline = now() + (showdown ? 6500 : 3500);
    return {};
  }
  const poker = {
    name: "Hold'em Poker", min: 2, max: 8,
    init(n: number) { const s: any = { stacks: Array(n).fill(START), out: Array(n).fill(false), dealer: n - 1, hand: 0 }; pkDeal(s); return s; },
    turn: (s: any) => (s.phase === "bet" ? s.turn : null),
    view(s: any, seat: number) {
      const me = seat >= 0 && s.phase === "bet" && s.turn === seat;
      const call = me ? Math.min(s.toCall - s.bets[seat], s.stacks[seat]) : 0;
      return { phase: s.phase, stacks: s.stacks, bets: s.bets, pot: potTotal(s), board: s.board, hole: seat >= 0 ? s.holes[seat] : null, folded: s.folded, out: s.out, dealer: s.dealer, sb: s.sb, bb: s.bb, turn: s.turn,
        toCall: s.toCall, call, minTo: seat >= 0 ? Math.min(s.toCall + s.minRaise, s.bets[seat] + s.stacks[seat]) : 0, maxTo: seat >= 0 ? s.bets[seat] + s.stacks[seat] : 0, result: s.result, gains: s.phase === "result" ? s.lastGains : null,
        handNo: s.hand + 1, maxHands: MAX_HANDS, blinds: blinds(s), deadline: s.deadline, now: now(), log: s.log.slice(-6), cards: s.holes.map((h: any) => !!h) };
    },
    move(s: any, seat: number, m: any) {
      if (s.phase !== "bet" || s.turn !== seat) return { err: "Not your turn" };
      const owe = s.toCall - s.bets[seat];
      const put = (a: number) => { a = Math.min(a, s.stacks[seat]); s.stacks[seat] -= a; s.bets[seat] += a; s.contrib[seat] += a; };
      const a = m.action;
      if (a === "fold") { s.folded[seat] = true; s.log.push("{" + seat + "} folds"); }
      else if (a === "check") { if (owe > 0) return { err: "You need to call or fold" }; s.log.push("{" + seat + "} checks"); }
      else if (a === "call") { if (owe <= 0) return { err: "Nothing to call — check" }; put(owe); s.log.push("{" + seat + "} calls" + (s.stacks[seat] ? "" : " (all-in)")); }
      else if (a === "allin" && s.bets[seat] + s.stacks[seat] <= s.toCall) { put(owe); s.log.push("{" + seat + "} calls all-in"); }
      else if (a === "raise" || a === "allin") {
        const max = s.bets[seat] + s.stacks[seat];
        let to = a === "allin" ? max : Math.floor(Number(m.to));
        if (!(to > s.toCall)) return { err: owe > 0 ? "Raise must be more than the call" : "Bet must be more than 0" };
        if (to > max) return { err: "Not enough chips" };
        if (to < s.toCall + s.minRaise && to < max) return { err: "Minimum raise is to " + (s.toCall + s.minRaise) };
        const inc = to - s.toCall;
        if (inc >= s.minRaise) { s.minRaise = inc; s.acted = s.acted.map(() => false); }
        put(to - s.bets[seat]); s.toCall = Math.max(s.toCall, to);
        s.log.push("{" + seat + "} " + (s.stacks[seat] ? (owe > 0 || s.street === 0 ? "raises to " : "bets ") + to : "goes all-in (" + to + ")"));
      } else return { err: "Bad move" };
      s.acted[seat] = true;
      s.turn = nextNeed(s, seat);
      pkSettle(s);
      return {};
    },
    tick(s: any) {
      if (s.phase !== "result") return {};
      const alive = live(s);
      if (alive.length <= 1 || s.hand + 1 >= MAX_HANDS) {
        const b = Math.max(...s.stacks), ws = s.stacks.map((x: number, i: number) => (x === b ? i : -1)).filter((i: number) => i >= 0);
        s.phase = "done"; s.deadline = 0;
        return { done: true, winner: ws.length === 1 ? ws[0] : null, winners: ws };
      }
      s.hand++; pkDeal(s); return {};
    },
    bot(s: any, seat: number, level: string) {
      const owe = s.toCall - s.bets[seat], stack = s.stacks[seat], pot = potTotal(s), bb = blinds(s)[1];
      const opp = inHand(s).length - 1;
      const sims = Math.max(60, Math.round((level === "easy" ? 60 : level === "medium" ? 200 : 450) * 2 / (opp + 1)));
      // Monte Carlo equity against random hands
      const known = s.holes[seat].concat(s.board), rest = deck52().filter((c) => !known.includes(c));
      let wins = 0;
      for (let k = 0; k < sims; k++) {
        const d = shuffle(rest.slice()), board = s.board.concat(d.splice(0, 5 - s.board.length));
        const mine = best7(s.holes[seat].concat(board));
        let res = 1;
        for (let o = 0; o < opp; o++) { const v = best7([d.pop(), d.pop()].concat(board)); if (v > mine) { res = 0; break; } if (v === mine) res = Math.min(res, 0.5); }
        wins += res;
      }
      const eq = wins / sims, odds = owe > 0 ? owe / (pot + owe) : 0;
      const raiseTo = (frac: number) => { const t = s.toCall + Math.max(s.minRaise, Math.round((pot * frac) / bb) * bb); return t >= s.bets[seat] + stack ? { action: "allin" } : { action: "raise", to: t }; };
      if (level === "easy") {
        if (owe > 0 && eq < 0.2 && owe > bb * 3) return { action: "fold" };
        if (eq > 0.7 && Math.random() < 0.5) return raiseTo(0.5);
        return owe > 0 ? { action: "call" } : { action: "check" };
      }
      const fair = 1 / (opp + 1), bluff = level === "hard" ? 0.08 : 0.03;
      if (eq > fair * 1.9 && eq > 0.55) { if (Math.random() < 0.75 || owe === 0) return raiseTo(eq > 0.8 ? 1 : 0.6); return owe > 0 ? { action: "call" } : { action: "check" }; }
      if (owe === 0) { if (Math.random() < bluff * (opp === 1 ? 2 : 1)) return raiseTo(0.5); if (eq > fair * 1.3 && Math.random() < 0.4) return raiseTo(0.4); return { action: "check" }; }
      const margin = level === "hard" ? 0.02 : 0.06;
      if (eq > odds + margin) return { action: "call" };
      if (level === "hard" && owe <= bb && eq > odds - 0.05) return { action: "call" };
      return { action: "fold" };
    },
  };

  return { clash, hearts, spades, poker };
}

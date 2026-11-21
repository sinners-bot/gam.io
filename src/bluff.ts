// Game Night plugin: bluffing pack (Liar's Dice, Cheat, Spymaster). Loaded by the game server at startup.
// No template literals in this file: it is embedded in a String.raw block by the service that serves it.
export default function register(api: any) {
  const shuffle: (a: any[]) => any[] = api.shuffle;
  const rnd = (a: any[]) => a[Math.floor(Math.random() * a.length)];
  const now = () => Date.now();
  const d6 = () => 1 + Math.floor(Math.random() * 6);

  // ======================= Liar's Dice =======================
  // Everyone rolls 5 hidden dice. Bid "at least Q dice show F" (1s are wild, faces 2-6); raise or call "Liar!".
  const alive = (s: any) => s.dice.map((d: number[], i: number) => (d.length ? i : -1)).filter((i: number) => i >= 0);
  const nextAlive = (s: any, i: number) => { const n = s.dice.length; for (let k = 1; k <= n; k++) { const j = (i + k) % n; if (s.dice[j].length) return j; } return i; };
  const countFace = (s: any, f: number) => s.dice.reduce((a: number, d: number[]) => a + d.filter((x) => x === f || x === 1).length, 0);
  const higher = (q: number, f: number, b: any) => !b || q > b.q || (q === b.q && f > b.f);
  function ldRoll(s: any) { s.dice = s.dice.map((d: number[]) => d.map(d6)); s.bid = null; s.phase = "bid"; s.reveal = null; s.deadline = 0; s.round++; }
  // P(at least k successes in n trials, p) — binomial tail
  function atLeast(k: number, n: number, p: number) {
    if (k <= 0) return 1; if (k > n) return 0;
    let tot = 0, c = 1;
    for (let i = 0; i <= n; i++) { if (i > 0) c = (c * (n - i + 1)) / i; if (i >= k) tot += c * Math.pow(p, i) * Math.pow(1 - p, n - i); }
    return tot;
  }
  const liars = {
    name: "Liar's Dice", min: 2, max: 6,
    init(n: number) { const s: any = { dice: Array.from({ length: n }, () => [0, 0, 0, 0, 0]), turn: 0, bid: null, phase: "bid", round: 0, log: "", reveal: null, deadline: 0 }; ldRoll(s); return s; },
    turn: (s: any) => (s.phase === "bid" ? s.turn : null),
    view(s: any, seat: number) {
      return { turn: s.turn, bid: s.bid, phase: s.phase, round: s.round, log: s.log, deadline: s.deadline, now: now(), counts: s.dice.map((d: number[]) => d.length),
        mine: seat >= 0 ? s.dice[seat] : null, all: s.phase === "reveal" ? s.dice : null, reveal: s.reveal, total: s.dice.reduce((a: number, d: number[]) => a + d.length, 0) };
    },
    move(s: any, seat: number, m: any) {
      if (s.phase !== "bid" || s.turn !== seat) return { err: "Not your turn" };
      if (m.action === "bid") {
        const q = Math.floor(Number(m.q)), f = Math.floor(Number(m.f)), total = s.dice.reduce((a: number, d: number[]) => a + d.length, 0);
        if (!(f >= 2 && f <= 6 && q >= 1 && q <= total)) return { err: "Bid a quantity and a face from 2 to 6" };
        if (!higher(q, f, s.bid)) return { err: "Raise the quantity, or keep it and pick a higher face" };
        s.bid = { q, f, by: seat }; s.log = "{" + seat + "} bids " + q + " × " + f; s.turn = nextAlive(s, seat); return {};
      }
      if (m.action === "liar") {
        if (!s.bid) return { err: "Nobody has bid yet" };
        const actual = countFace(s, s.bid.f), bidder = s.bid.by, loser = actual >= s.bid.q ? seat : bidder;
        s.reveal = { caller: seat, bidder, q: s.bid.q, f: s.bid.f, actual, loser };
        s.log = "{" + seat + "} calls Liar! There were " + actual + " × " + s.bid.f + " — {" + loser + "} loses a die";
        s.dice[loser].pop(); s.phase = "reveal"; s.deadline = now() + 5500; s.turn = loser;
        return {};
      }
      return { err: "Bad move" };
    },
    tick(s: any) {
      if (s.phase !== "reveal") return {};
      const left = alive(s);
      if (left.length === 1) { s.phase = "done"; s.deadline = 0; return { done: true, winner: left[0] }; }
      if (!s.dice[s.turn].length) s.turn = nextAlive(s, s.turn);
      ldRoll(s); return {};
    },
    bot(s: any, seat: number, level: string) {
      const mine: number[] = s.dice[seat], total = s.dice.reduce((a: number, d: number[]) => a + d.length, 0), unknown = total - mine.length;
      const own = (f: number) => mine.filter((x) => x === f || x === 1).length;
      const prob = (q: number, f: number) => atLeast(q - own(f), unknown, 1 / 3);
      const pTrue = s.bid ? prob(s.bid.q, s.bid.f) : 1;
      if (s.bid && level === "easy" && pTrue < 0.15 + Math.random() * 0.3) return { action: "liar" };
      // smallest raise for each face, pick the most believable (hard also likes faces it holds)
      const opts: any[] = [];
      for (let f = 2; f <= 6; f++) {
        let q = s.bid ? (f > s.bid.f ? s.bid.q : s.bid.q + 1) : Math.max(1, Math.round(total / 3) - 1);
        if (q > total) continue;
        opts.push({ q, f, p: prob(q, f) + (level === "hard" ? own(f) * 0.02 : 0) + (level === "easy" ? Math.random() * 0.4 : 0) });
      }
      if (!opts.length) return { action: "liar" };
      opts.sort((a, b) => b.p - a.p);
      if (s.bid && level !== "easy") {
        // calling loses if the bid is true; raising loses if our raise is false and gets called
        const loseCall = pTrue, loseRaise = (1 - Math.min(1, opts[0].p)) * (level === "hard" ? 0.8 : 0.7) + (level === "medium" ? (Math.random() - 0.5) * 0.15 : 0);
        if (loseCall < loseRaise) return { action: "liar" };
      }
      return { action: "bid", q: opts[0].q, f: opts[0].f };
    },
  };

  // ======================= Cheat =======================
  // Play 1-4 cards face down claiming the required rank (A, 2, 3 ... K, then A again). Anyone can call "Cheat!".
  const RK = "A23456789TJQK";
  function cheatDeal(n: number) {
    const deck = shuffle("SHDC".split("").flatMap((s) => RK.split("").map((r) => r + s)));
    const hands: string[][] = Array.from({ length: n }, () => []);
    deck.forEach((c: string, i: number) => hands[i % n].push(c));
    hands.forEach((h) => h.sort((a, b) => RK.indexOf(a[0]) - RK.indexOf(b[0])));
    return hands;
  }
  const cheat = {
    name: "Cheat", min: 3, max: 6,
    init(n: number) { return { hands: cheatDeal(n), pile: [], turn: 0, rank: 0, phase: "play", last: null, passed: [], deadline: 0, log: "", reveal: null, plays: 0 }; },
    turn: (s: any) => (s.phase === "play" ? s.turn : null),
    pending: (s: any) => { // players who may still call, starting with the one after the claimer
      if (s.phase !== "challenge") return [];
      const n = s.hands.length, out: number[] = [];
      for (let k = 1; k < n; k++) { const i = (s.last.by + k) % n; if (!s.passed.includes(i)) out.push(i); }
      return out;
    },
    view(s: any, seat: number) {
      return { turn: s.turn, rank: RK[s.rank], phase: s.phase, pile: s.pile.length, counts: s.hands.map((h: string[]) => h.length), hand: seat >= 0 ? s.hands[seat] : null,
        last: s.last ? { by: s.last.by, n: s.last.cards.length, rank: s.last.rank } : null, passed: s.passed, deadline: s.deadline, now: now(), log: s.log, reveal: s.reveal, canCall: s.phase === "challenge" && seat >= 0 && s.last && seat !== s.last.by && !s.passed.includes(seat) };
    },
    move(s: any, seat: number, m: any) {
      if (m.action === "play") {
        if (s.phase !== "play" || s.turn !== seat) return { err: "Not your turn" };
        const cs: string[] = Array.isArray(m.cards) ? m.cards : [];
        if (cs.length < 1 || cs.length > 4 || new Set(cs).size !== cs.length || !cs.every((c) => s.hands[seat].includes(c))) return { err: "Pick 1 to 4 of your cards" };
        s.hands[seat] = s.hands[seat].filter((c: string) => !cs.includes(c));
        s.pile.push(...cs); s.last = { by: seat, cards: cs, rank: RK[s.rank] }; s.plays++;
        s.log = "{" + seat + "} plays " + cs.length + " × " + RK[s.rank];
        s.phase = "challenge"; s.passed = []; s.deadline = now() + 6000; s.reveal = null;
        return {};
      }
      if (s.phase !== "challenge" || seat === s.last.by || s.passed.includes(seat)) return { err: "Nothing to call right now" };
      if (m.action === "pass") { s.passed.push(seat); if (cheat.pending(s).length === 0) s.deadline = now(); return {}; }
      if (m.action === "call") {
        const lie = s.last.cards.some((c: string) => c[0] !== s.last.rank);
        const taker = lie ? s.last.by : seat;
        s.hands[taker].push(...s.pile); s.hands[taker].sort((a: string, b: string) => RK.indexOf(a[0]) - RK.indexOf(b[0]));
        s.reveal = { caller: seat, by: s.last.by, cards: s.last.cards, lie, taker, took: s.pile.length };
        s.log = "{" + seat + "} calls Cheat! " + (lie ? "It was a lie — {" + s.last.by + "}" : "It was true — {" + seat + "}") + " takes the pile (" + s.pile.length + ")";
        s.pile = []; s.phase = "reveal"; s.deadline = now() + 3500;
        return {};
      }
      return { err: "Bad move" };
    },
    tick(s: any) {
      if (s.phase === "challenge" || s.phase === "reveal") {
        const by = s.last.by;
        if (!s.hands[by].length && !(s.reveal && s.reveal.lie)) { s.phase = "done"; s.deadline = 0; return { done: true, winner: by }; }
        if (s.plays >= 250) { // long stalemate: fewest cards wins
          const lo = Math.min(...s.hands.map((h: string[]) => h.length)), ws = s.hands.map((h: string[], i: number) => (h.length === lo ? i : -1)).filter((i: number) => i >= 0);
          s.phase = "done"; s.deadline = 0; return { done: true, winner: ws.length === 1 ? ws[0] : null, winners: ws };
        }
        s.phase = "play"; s.deadline = 0; s.rank = (s.rank + 1) % 13; s.turn = (by + 1) % s.hands.length; s.passed = [];
        if (s.phase === "play" && !s.reveal) s.log += " — nobody called it";
      }
      return {};
    },
    bot(s: any, seat: number, level: string) {
      const h: string[] = s.hands[seat];
      if (s.phase === "challenge") {
        const r = s.last.rank, mine = h.filter((c) => c[0] === r).length, n = s.last.cards.length;
        if (mine + n > 4) return { action: "call" }; // impossible claim
        if (!s.hands[s.last.by].length) return { action: "call" }; // they'd win with this play
        if (level === "easy") return Math.random() < 0.15 ? { action: "call" } : { action: "pass" };
        // chance their hand really held n copies: hypergeometric over the cards we can't see
        const unseen = 52 - h.length, copies = 4 - mine, hand = s.hands[s.last.by].length + n;
        // honest players put down every copy they hold; bluffers mostly put down a single card
        const px = (x: number) => comb(copies, x) * comb(unseen - copies, hand - x) / comb(unseen, hand);
        const truthW = px(n), lieW = (1 - px(n)) * (n === 1 ? 0.5 : n === 2 ? 0.12 : 0.01);
        const lie = lieW / (lieW + truthW || 1), thr = level === "hard" ? 0.55 : 0.5 + (Math.random() - 0.5) * 0.3;
        return lie > thr ? { action: "call" } : { action: "pass" };
      }
      const r = RK[s.rank], truth = h.filter((c) => c[0] === r);
      if (truth.length) {
        return { action: "play", cards: truth.slice(0, 4) };
      }
      // must bluff: dump the card we'd need furthest in the future
      const k = level === "easy" && h.length > 4 && Math.random() < 0.4 ? 2 : 1;
      const out: string[] = []; let pool = h.slice();
      for (let i = 0; i < k && pool.length; i++) { const c = farthest(pool, s.rank); out.push(c); pool = pool.filter((x) => x !== c); }
      return { action: "play", cards: out };
    },
  };
  function comb(n: number, k: number) { if (k < 0 || k > n) return 0; let r = 1; for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i; return r; }
  function farthest(cards: string[], rank: number) {
    let best = cards[0], bd = -1;
    for (const c of cards) { const d = (RK.indexOf(c[0]) - rank + 13) % 13; if (d > bd) { bd = d; best = c; } }
    return best;
  }

  // ======================= Spymaster (Codenames-style) =======================
  const WORDS = ("APPLE,ANCHOR,ANGEL,ARMY,BALL,BAND,BANK,BAR,BAT,BEACH,BEAR,BED,BELL,BERRY,BOARD,BOLT,BOMB,BOND,BOOT,BOTTLE,BOW,BOX,BRIDGE,BRUSH,BUCK,BUG,CAKE,CANDLE,CAP,CAR,CARD,CASTLE,CAT,CELL,CHAIR,CHECK,CHEST,CHURCH,CIRCLE,CLOCK,CLOUD,CLUB,CODE,COLD,COMIC,COPPER,COTTON,COURT,COVER,CRANE,CRASH,CROWN,CYCLE,DANCE,DATE,DECK,DIAMOND,DICE,DOCTOR,DOG,DRAFT,DRAGON,DRESS,DRILL,DROP,DRUM,DUCK,EAGLE,EGG,ENGINE,EYE,FACE,FAIR,FALL,FAN,FIELD,FILE,FILM,FIRE,FISH,FLAG,FLUTE,FLY,FOOT,FORK,FROG,GAME,GHOST,GIANT,GLASS,GLOVE,GOLD,GRASS,GREEN,HAND,HAWK,HEAD,HEART,HELMET,HOLE,HONEY,HOOK,HORN,HORSE,HOTEL,ICE,JACK,JAM,JET,KEY,KING,KITE,KNIFE,LAB,LAMP,LAWYER,LEAD,LEMON,LIGHT,LINE,LION,LOCK,LOG,MAIL,MAPLE,MARCH,MASK,MATCH,MERCURY,MINE,MINT,MOON,MOUSE,MOUTH,NAIL,NET,NIGHT,NOTE,NURSE,OCEAN,OIL,OPERA,ORANGE,PALM,PAN,PANDA,PAPER,PARK,PEN,PIANO,PILOT,PIN,PIPE,PIRATE,PIT,PLANE,PLATE,PLOT,POINT,POLE,POOL,PORT,POUND,PRESS,PRINCE,PUMPKIN,QUEEN,RABBIT,RACE,RAY,RING,ROBOT,ROCK,ROOT,ROSE,ROUND,RULER,SAIL,SALT,SATURN,SCALE,SCHOOL,SCREEN,SEAL,SHADOW,SHARK,SHIP,SHOE,SHOT,SINK,SKATE,SLIP,SNAKE,SNOW,SOCK,SOLDIER,SPACE,SPELL,SPIDER,SPIKE,SPOT,SPRING,SPY,SQUARE,STAR,STATE,STICK,STRING,SUB,SUIT,SWING,TABLE,TAIL,TAP,TEACHER,TICK,TIME,TOOTH,TORCH,TOWER,TRACK,TRAIN,TRIANGLE,TRIP,TRUNK,TUBE,TURKEY,UNICORN,VAN,VET,WAKE,WALL,WATCH,WATER,WAVE,WEB,WHALE,WHIP,WIND,WITCH,WORM,YARD").split(",");
  const team = (seat: number) => seat % 2; // 0 red, 1 blue. Seats 0 and 1 are the spymasters.
  const spymaster = {
    name: "Spymaster", min: 4, max: 8, noBots: true,
    init(n: number) {
      const words = shuffle(WORDS.slice()).slice(0, 25);
      const key = shuffle([...Array(9).fill(0), ...Array(8).fill(1), ...Array(7).fill(2), 3]); // 0 red, 1 blue, 2 neutral, 3 assassin
      return { words, key, open: Array(25).fill(false), turn: 0, phase: "clue", clue: null, guesses: 0, log: "", n, history: [] };
    },
    turn: (s: any) => (s.phase === "clue" ? s.turn : s.turn + 2 < s.n ? s.turn + 2 : s.turn),
    view(s: any, seat: number) {
      const master = seat === 0 || seat === 1;
      return { words: s.words, open: s.open, key: s.key.map((k: number, i: number) => (master || s.open[i] ? k : -1)), team: s.turn, phase: s.phase, clue: s.clue, guesses: s.guesses, log: s.log, history: s.history.slice(-8),
        left: [0, 1].map((t) => s.key.filter((k: number, i: number) => k === t && !s.open[i]).length), master, myTeam: seat >= 0 ? team(seat) : -1 };
    },
    move(s: any, seat: number, m: any) {
      const t = team(seat), master = seat === 0 || seat === 1;
      if (m.action === "clue") {
        if (s.phase !== "clue" || seat !== s.turn) return { err: "Only the active spymaster gives clues" };
        const w = String(m.word || "").trim().toUpperCase(), n = Math.floor(Number(m.n));
        if (!/^[A-Z][A-Z'-]{1,19}$/.test(w)) return { err: "Clue must be one word" };
        if (s.words.some((x: string, i: number) => !s.open[i] && (x === w || x.includes(w) || w.includes(x)))) return { err: "Clue can't be (part of) a word on the board" };
        if (!(n >= 0 && n <= 9)) return { err: "Number must be 0 to 9" };
        s.clue = { word: w, n }; s.guesses = 0; s.phase = "guess"; s.log = (s.turn ? "Blue" : "Red") + " clue: " + w + " " + n;
        s.history.push({ team: s.turn, word: w, n }); return {};
      }
      if (s.phase !== "guess" || master || t !== s.turn) return { err: "It's not your team's turn to guess" };
      if (m.action === "end") { s.phase = "clue"; s.turn = 1 - s.turn; s.log = "{" + seat + "} ended the turn"; return {}; }
      if (m.action === "guess") {
        const i = Number(m.i);
        if (!(i >= 0 && i < 25) || s.open[i]) return { err: "Pick a hidden word" };
        s.open[i] = true; s.guesses++;
        const k = s.key[i];
        s.log = "{" + seat + "} picked " + s.words[i] + (k === 3 ? " — the ASSASSIN!" : k === s.turn ? " ✓" : k === 2 ? " (neutral)" : " — the other team's word");
        if (k === 3) return { done: true, winner: 1 - s.turn, winners: [...Array(s.n).keys()].filter((x) => team(x) === 1 - s.turn) };
        for (const tt of [0, 1]) if (!s.key.some((kk: number, j: number) => kk === tt && !s.open[j])) return { done: true, winner: tt, winners: [...Array(s.n).keys()].filter((x) => team(x) === tt) };
        if (k !== s.turn || (s.clue.n > 0 && s.guesses > s.clue.n)) { s.phase = "clue"; s.turn = 1 - s.turn; }
        return {};
      }
      return { err: "Bad move" };
    },
  };

  return { liars, cheat, spymaster };
}

// GAM.IO plugin: Bomb Party, Typing Race, Minesweeper Battle, Snake Party, Backgammon, Gin Rummy (with bots).
// No template literals in this file: it is embedded in a String.raw block by the service that serves it.
export default async function register(api: any) {
  const shuffle: (a: any[]) => any[] = api.shuffle;
  const rnd = (a: any[]) => a[Math.floor(Math.random() * a.length)];
  const now = () => Date.now();
  const LV: Record<string, number> = { easy: 0, medium: 1, hard: 2 };
  const lv = (s: any, i: number) => (s.bots && s.bots[i] != null ? s.bots[i] : -1);

  // ---------- shared dictionary (same list Word Hunt uses) ----------
  let WORDS: string[] = [], DICT: Set<string> | null = null;
  (async () => {
    try {
      const t = await (await fetch("https://raw.githubusercontent.com/dwyl/english-words/master/words_alpha.txt")).text();
      WORDS = t.split(/\r?\n/).map((w) => w.trim().toUpperCase()).filter((w) => w.length >= 3 && w.length <= 14 && /^[A-Z]+$/.test(w));
      DICT = new Set(WORDS);
    } catch (e) { console.error("more: word list failed", e); }
  })();

  // ================= Bomb Party =================
  // Type a word containing the letters before the bomb goes off. Last player standing wins.
  const SYL = "AN ER IN ON AT EN OR ES TI TE AR AL LE RE ST ING ION ENT TER PER CON PRO COM ATE IST ACK OUT ART ORE EAR TRA INE ICE ANT IGH EST AND ACH OUN ABL OMP UST ULT OCK ITE ARD ILL OLD ASH IGHT".split(" ");
  const ALPHA = "ABCDEFGHIJKLMNOPRSTUVWY";
  const bombNext = (s: any) => { const n = s.lives.length; for (let k = 1; k <= n; k++) { const j = (s.cur + k) % n; if (s.lives[j] > 0) return j; } return s.cur; };
  function bombTurn(s: any, who: number) {
    s.cur = who; s.syl = rnd(SYL); s.typed = {}; s.phase = "play";
    s.fuse = now() + 7000 + Math.floor(Math.random() * 9000);
    const l = lv(s, who);
    s.botAt = l >= 0 ? now() + [5200, 3600, 2200][l] + Math.random() * 2500 : 0;
    s.deadline = s.botAt ? Math.min(s.botAt, s.fuse) : s.fuse;
  }
  function bombWord(s: any, w: string) {
    if (w.length < 3 || !/^[A-Z]+$/.test(w)) return "Words need at least 3 letters";
    if (!w.includes(s.syl)) return "It has to contain " + s.syl;
    if (s.used.includes(w)) return "Already used!";
    if (DICT && !DICT.has(w)) return w + " isn't in the dictionary";
    return "";
  }
  function bombAccept(s: any, seat: number, w: string) {
    s.used.push(w); s.last = { seat, w, syl: s.syl };
    for (const ch of w) if (!s.letters[seat].includes(ch) && ALPHA.includes(ch)) s.letters[seat] += ch;
    if (s.letters[seat].length >= ALPHA.length) { s.letters[seat] = ""; s.lives[seat] = Math.min(s.max + 1, s.lives[seat] + 1); s.log = "{" + seat + "} used every letter: +1 life!"; }
    else s.log = "{" + seat + "} played " + w;
    bombTurn(s, bombNext(s));
  }
  const bomb = {
    name: "Bomb Party", min: 2, max: 8,
    init(n: number, o: any = {}) {
      const L = [2, 3, 4].includes(o.lives) ? o.lives : 3;
      const s: any = { lives: Array(n).fill(L), max: L, letters: Array(n).fill(""), used: [], cur: Math.floor(Math.random() * n), typed: {}, log: "", last: null, bots: o.bots || {}, boomAt: 0 };
      bombTurn(s, s.cur); return s;
    },
    turn: () => null,
    isTurn: (s: any, seat: number) => s.phase === "play" && s.cur === seat,
    live: (a: string) => (a === "type" ? "relay" : ""),
    view: (s: any, seat: number) => ({ lives: s.lives, max: s.max, cur: s.cur, syl: s.syl, phase: s.phase, typed: s.typed, log: s.log, last: s.last, letters: seat >= 0 ? s.letters[seat] : "", alpha: ALPHA, fuse: s.fuse, now: now(), boom: s.boom || null, used: s.used.length }),
    move(s: any, seat: number, m: any) {
      if (s.phase !== "play") return { err: "Wait for the next turn" };
      if (m.action === "type") { if (seat === s.cur) s.typed[seat] = String(m.v || "").toUpperCase().replace(/[^A-Z]/g, "").slice(0, 20); return {}; }
      if (m.action === "word") {
        if (seat !== s.cur) return { err: "It's not your turn" };
        const w = String(m.w || "").toUpperCase().replace(/[^A-Z]/g, ""), e = bombWord(s, w);
        if (e) return { err: e };
        bombAccept(s, seat, w); return {};
      }
      return { err: "Bad move" };
    },
    tick(s: any) {
      if (s.phase === "boom") { // after the explosion: next player, or game over
        const alive = s.lives.map((l: number, i: number) => (l > 0 ? i : -1)).filter((i: number) => i >= 0);
        if (alive.length <= 1) { s.phase = "done"; s.deadline = 0; return { done: true, winner: alive[0] ?? null }; }
        bombTurn(s, bombNext(s)); return {};
      }
      if (s.botAt && now() >= s.botAt - 30 && now() < s.fuse) { // a bot answers (or fumbles)
        const l = lv(s, s.cur); s.botAt = 0;
        const miss = [0.35, 0.15, 0.05][l] ?? 0.2;
        if (WORDS.length && Math.random() > miss) {
          const pool = WORDS.filter((w) => w.includes(s.syl) && w.length <= [7, 9, 12][l] && !s.used.includes(w));
          if (pool.length) { const w = l === 2 ? pool.filter((x) => new Set(x).size > 5)[0] || rnd(pool) : rnd(pool.slice(0, 4000)); bombAccept(s, s.cur, w); return {}; }
        }
        s.deadline = s.fuse; return {};
      }
      // the bomb goes off
      s.lives[s.cur] = Math.max(0, s.lives[s.cur] - 1); s.boom = { seat: s.cur, syl: s.syl, at: now() };
      s.log = "💥 {" + s.cur + "} lost a life on " + s.syl; s.phase = "boom"; s.deadline = now() + 1800; return {};
    },
  };

  // ================= Typing Race =================
  const TEXTS = [
    "The quick brown fox jumps over the lazy dog while the moon rises slowly above the quiet hills.",
    "Every great game night starts with snacks, a full voice call and at least one friend who never reads the rules.",
    "She packed her bag, grabbed the map and walked out into the rain without looking back once.",
    "Practice does not make perfect, but it does make you a lot faster than you were yesterday.",
    "A small robot rolled across the kitchen floor, beeping happily every time it found a crumb.",
    "Thunder rolled over the valley as the last train pulled into the empty station at midnight.",
    "If you can read this sentence quickly and without mistakes, you are probably winning this race.",
    "The library was silent except for the soft sound of pages turning and someone sneezing in the corner.",
    "Bright lights, loud music and a crowd that would not stop cheering until the final whistle blew.",
    "He forgot the password again, so he wrote it on a sticky note and hid it under the keyboard.",
    "Penguins cannot fly, but they swim faster than most fish and look great in formal wear.",
    "The best pizza in town is made by a tiny shop that only opens on rainy Tuesday evenings.",
    "Clouds drifted lazily across the sky, shaped like dragons, castles and one very confused giraffe.",
    "Never trust an atom, because they make up literally everything you can see around you.",
    "The team worked through the night, fixing bugs and drinking far too much coffee before launch day.",
    "A gentle breeze carried the smell of fresh bread from the bakery across the sleepy town square.",
    "Speed matters, but accuracy wins races; one typo can cost you more time than you think.",
    "The old lighthouse keeper told stories of ships, storms and treasure buried beneath the dunes.",
    "Quietly, the cat watched the bird from the windowsill, its tail flicking back and forth with interest.",
    "Galaxies far away spin slowly through the dark, each one holding billions of distant shining stars.",
  ];
  const WPM = [38, 62, 96];
  const typing = {
    name: "Typing Race", min: 1, max: 8,
    init(n: number, o: any = {}) {
      const k = o.len === "short" ? 1 : o.len === "long" ? 4 : 2;
      const text = shuffle(TEXTS.slice()).slice(0, k).join(" ");
      return { text, phase: "count", deadline: now() + 3500, start: now() + 3500, prog: Array(n).fill(0), err: Array(n).fill(0), fin: Array(n).fill(0), order: [], bots: o.bots || {}, end: 0, bwpm: Array.from({ length: n }, (_, i) => (lv({ bots: o.bots || {} }, i) >= 0 ? WPM[lv({ bots: o.bots || {} }, i)] * (0.85 + Math.random() * 0.3) : 0)) };
    },
    turn: () => null,
    live: (a: string) => (a === "prog" ? "relay" : ""),
    view: (s: any) => ({ text: s.text, phase: s.phase, start: s.start, now: now(), prog: s.prog, err: s.err, fin: s.fin, order: s.order, end: s.end }),
    move(s: any, seat: number, m: any) {
      if (s.phase !== "race") return { err: "Wait for the start" };
      if (s.fin[seat]) return {};
      if (m.action === "prog") {
        const n = Math.max(s.prog[seat], Math.min(s.text.length, Math.floor(+m.n || 0)));
        const maxChars = ((now() - s.start) / 60000) * 260 * 5 + 10; // nobody types 260 wpm
        if (n > maxChars) { s.prog[seat] = Math.max(s.prog[seat], Math.floor(maxChars)); return {}; } // too fast to be real: count only what is humanly possible, the client re-sends the rest
        s.prog[seat] = n; s.err[seat] = Math.max(0, Math.floor(+m.e || 0));
        if (n >= s.text.length) return typingFinish(s, seat);
        return {};
      }
      return { err: "Bad move" };
    },
    tick(s: any) {
      if (s.phase === "count") { s.phase = "race"; s.start = now(); s.end = now() + Math.max(45000, s.text.length * 600); s.deadline = now() + 400; return {}; }
      if (s.phase !== "race") return {};
      for (const k of Object.keys(s.bots)) {
        const i = +k; if (s.fin[i]) continue;
        const cps = (s.bwpm[i] * 5) / 60, n = Math.min(s.text.length, Math.round(cps * ((now() - s.start) / 1000) * (0.9 + Math.random() * 0.2)));
        s.prog[i] = Math.max(s.prog[i], n);
        if (s.prog[i] >= s.text.length) { const r = typingFinish(s, i); if (r.done) return r; }
      }
      if (now() >= s.end) return typingEnd(s);
      s.deadline = now() + 400; return {};
    },
  };
  function typingFinish(s: any, seat: number) {
    s.fin[seat] = now() - s.start; s.order.push(seat);
    if (s.order.length >= s.prog.length) return typingEnd(s);
    return {};
  }
  function typingEnd(s: any) {
    s.phase = "done"; s.deadline = 0;
    const best = s.order.length ? s.order[0] : s.prog.indexOf(Math.max(...s.prog));
    return { done: true, winner: best };
  }

  // ================= Minesweeper Battle =================
  const MSZ: Record<string, [number, number, number]> = { small: [9, 9, 10], medium: [16, 16, 40], large: [22, 16, 70] };
  function nbrs(w: number, h: number, i: number) { const x = i % w, y = Math.floor(i / w), out: number[] = []; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { if (!dx && !dy) continue; const X = x + dx, Y = y + dy; if (X >= 0 && Y >= 0 && X < w && Y < h) out.push(Y * w + X); } return out; }
  function flood(s: any, rev: number[], i: number) {
    const st = [i];
    while (st.length) { const c = st.pop()!; if (rev[c]) continue; rev[c] = 1; if (s.num[c] === 0) for (const n of nbrs(s.w, s.h, c)) if (!rev[n] && !s.mine[n]) st.push(n); }
  }
  const safeLeft = (s: any, p: number) => s.safe - s.rev[p].reduce((a: number, v: number) => a + (v === 1 ? 1 : 0), 0);
  const mines = {
    name: "Minesweeper Battle", min: 1, max: 6,
    init(n: number, o: any = {}) {
      const [w, h, k] = MSZ[o.size] || MSZ.medium, N = w * h;
      const start = Math.floor(h / 2) * w + Math.floor(w / 2), keep = new Set([start, ...nbrs(w, h, start)]);
      const cells = shuffle([...Array(N).keys()].filter((i) => !keep.has(i))).slice(0, k), mine = Array(N).fill(0);
      for (const c of cells) mine[c] = 1;
      const num = mine.map((m, i) => (m ? -1 : nbrs(w, h, i).filter((j) => mine[j]).length));
      const s: any = { w, h, k, mine, num, safe: N - k, rev: [], flag: [], pen: Array(n).fill(0), done: Array(n).fill(0), boom: Array(n).fill(0), order: [], start: now(), end: now() + 6 * 60000, bots: o.bots || {}, deadline: 0 };
      for (let p = 0; p < n; p++) { s.rev.push(Array(N).fill(0)); s.flag.push(Array(N).fill(0)); flood(s, s.rev[p], start); }
      s.deadline = now() + 700; return s;
    },
    turn: () => null,
    view(s: any, seat: number) {
      const me = seat >= 0 ? seat : 0, over = s.order.length >= s.rev.length || now() >= s.end;
      const cells = s.rev[me].map((r: number, i: number) => (r === 1 ? s.num[i] : r === 2 ? -2 : s.flag[me][i] ? -3 : over && s.mine[i] ? -4 : -1));
      return { w: s.w, h: s.h, k: s.k, cells, pen: s.pen[me], now: now(), end: s.end, left: s.rev.map((_: any, p: number) => safeLeft(s, p)), safe: s.safe, done: s.done, order: s.order, booms: s.boom, flags: s.flag[me].reduce((a: number, v: number) => a + v, 0) };
    },
    move(s: any, seat: number, m: any) {
      if (s.done[seat]) return { err: "You already cleared it!" };
      const i = Math.floor(+m.i), N = s.w * s.h;
      if (!(i >= 0 && i < N)) return { err: "Bad cell" };
      if (m.action === "flag") { if (!s.rev[seat][i]) s.flag[seat][i] = s.flag[seat][i] ? 0 : 1; return {}; }
      if (m.action !== "open") return { err: "Bad move" };
      if (now() < s.pen[seat]) return { err: "Frozen! Wait a moment" };
      if (s.flag[seat][i] || s.rev[seat][i]) return {};
      return minesOpen(s, seat, i);
    },
    tick(s: any) {
      if (now() >= s.end) return minesEnd(s);
      for (const k of Object.keys(s.bots)) {
        const p = +k, l = s.bots[k]; if (s.done[p] || now() < s.pen[p]) continue;
        if (Math.random() > [0.45, 0.7, 0.95][l]) continue; // thinking time
        const N = s.w * s.h, rev = s.rev[p];
        const frontier = [...Array(N).keys()].filter((i) => !rev[i] && nbrs(s.w, s.h, i).some((j) => rev[j] === 1));
        const pickFrom = frontier.length ? frontier : [...Array(N).keys()].filter((i) => !rev[i]);
        let cell = -1;
        if (Math.random() < [0.07, 0.03, 0.006][l]) cell = pickFrom.find((i) => s.mine[i]) ?? -1; // a slip
        if (cell < 0) { const safe = pickFrom.filter((i) => !s.mine[i]); if (safe.length) cell = rnd(safe); }
        if (cell >= 0) { const r = minesOpen(s, p, cell); if (r.done) return r; }
      }
      s.deadline = now() + 700; return {};
    },
  };
  function minesOpen(s: any, seat: number, i: number): any {
    if (s.mine[i]) { s.rev[seat][i] = 2; s.boom[seat]++; s.pen[seat] = now() + 5000; return {}; }
    flood(s, s.rev[seat], i);
    if (safeLeft(s, seat) <= 0) { s.done[seat] = now() - s.start; s.order.push(seat); if (s.order.length === 1 || s.order.length >= s.rev.length) return minesEnd(s); }
    return {};
  }
  function minesEnd(s: any) {
    s.deadline = 0; s.end = Math.min(s.end, now());
    let best = s.order.length ? s.order[0] : -1;
    if (best < 0) { let lo = 1e9; s.rev.forEach((_: any, p: number) => { const L = safeLeft(s, p); if (L < lo) { lo = L; best = p; } }); }
    return { done: true, winner: best };
  }

  // ================= Snake Party =================
  const SW = 36, SH = 24, STEP = 125, DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];
  const free = (s: any, occ: Set<number>) => { for (let t = 0; t < 200; t++) { const c = Math.floor(Math.random() * SW * SH); if (!occ.has(c)) return c; } return 0; };
  function snakeOcc(s: any) { const o = new Set<number>(); for (const sn of s.sn) if (sn.alive) for (const c of sn.body) o.add(c); return o; }
  function spawn(s: any, i: number) {
    const occ = snakeOcc(s);
    for (let t = 0; t < 100; t++) {
      const x = 4 + Math.floor(Math.random() * (SW - 8)), y = 4 + Math.floor(Math.random() * (SH - 8)), d = Math.floor(Math.random() * 4);
      const body = [0, 1, 2].map((k) => (y - DIRS[d][1] * k) * SW + (x - DIRS[d][0] * k));
      if (body.every((c) => !occ.has(c))) { s.sn[i] = { ...s.sn[i], body, dir: d, next: d, alive: true, grow: 0 }; return; }
    }
  }
  function snakeBot(s: any, i: number) {
    const sn = s.sn[i], l = s.bots[i], head = sn.body[0], occ = snakeOcc(s);
    const ok = (c: number, x: number, y: number) => x >= 0 && y >= 0 && x < SW && y < SH && !occ.has(c);
    const opts = [0, 1, 2, 3].filter((d) => d !== (sn.dir + 2) % 4).map((d) => { const x = (head % SW) + DIRS[d][0], y = Math.floor(head / SW) + DIRS[d][1]; return { d, x, y, c: y * SW + x }; }).filter((o) => ok(o.c, o.x, o.y));
    if (!opts.length) return;
    if (l === 0 && Math.random() < 0.25) { sn.next = rnd(opts).d; return; }
    // BFS from the head to the nearest food
    const prev = new Map<number, number>(), q = [head]; prev.set(head, -1); let goal = -1;
    const foods = new Set(s.food);
    while (q.length && goal < 0) { const c = q.shift()!; for (const d of [0, 1, 2, 3]) { const x = (c % SW) + DIRS[d][0], y = Math.floor(c / SW) + DIRS[d][1], n = y * SW + x; if (x < 0 || y < 0 || x >= SW || y >= SH || prev.has(n) || occ.has(n)) continue; prev.set(n, c); if (foods.has(n)) { goal = n; break; } q.push(n); } }
    let target = -1;
    if (goal >= 0) { let c = goal; while (prev.get(c) !== head && prev.get(c) !== -1 && prev.get(c) != null) c = prev.get(c)!; target = c; }
    const space = (c: number) => { const seen = new Set([c]), st = [c]; let n = 0; while (st.length && n < 60) { const x = st.pop()!; n++; for (const d of [0, 1, 2, 3]) { const X = (x % SW) + DIRS[d][0], Y = Math.floor(x / SW) + DIRS[d][1], m = Y * SW + X; if (X < 0 || Y < 0 || X >= SW || Y >= SH || seen.has(m) || occ.has(m)) continue; seen.add(m); st.push(m); } } return n; };
    let best = opts.find((o) => o.c === target);
    if (!best || (l === 2 && space(best.c) < 20)) best = opts.slice().sort((a, b) => space(b.c) - space(a.c))[0];
    sn.next = best.d;
  }
  const snake = {
    name: "Snake Party", min: 1, max: 8,
    init(n: number, o: any = {}) {
      const T = [60, 90, 120].includes(o.time) ? o.time : 90;
      const s: any = { sn: Array.from({ length: n }, () => ({ body: [], dir: 1, next: 1, alive: false, score: 0, kills: 0, grow: 0, respawn: 0 })), food: [], bots: o.bots || {}, phase: "count", start: now() + 3000, end: now() + 3000 + T * 1000, deadline: now() + 3000, w: SW, h: SH, tick: 0 };
      for (let i = 0; i < n; i++) spawn(s, i);
      const occ = snakeOcc(s); for (let k = 0; k < Math.max(4, n + 2); k++) { const c = free(s, occ); s.food.push(c); occ.add(c); }
      return s;
    },
    turn: () => null,
    live: (a: string) => (a === "dir" ? "quiet" : ""),
    view: (s: any) => ({ w: s.w, h: s.h, sn: s.sn.map((x: any) => ({ body: x.body, alive: x.alive, score: x.score, kills: x.kills, dir: x.dir })), food: s.food, phase: s.phase, start: s.start, end: s.end, now: now(), tick: s.tick }),
    move(s: any, seat: number, m: any) {
      if (m.action !== "dir") return { err: "Bad move" };
      const d = Math.floor(+m.d), sn = s.sn[seat];
      if (d >= 0 && d < 4 && sn && d !== (sn.dir + 2) % 4) sn.next = d;
      return {};
    },
    tick(s: any) {
      if (s.phase === "count") { s.phase = "run"; s.deadline = now() + STEP; return {}; }
      if (now() >= s.end) {
        s.phase = "done"; s.deadline = 0;
        const top = Math.max(...s.sn.map((x: any) => x.score)), ws = s.sn.map((x: any, i: number) => (x.score === top ? i : -1)).filter((i: number) => i >= 0);
        return { done: true, winner: ws.length === 1 ? ws[0] : null, winners: ws };
      }
      s.tick++;
      for (const k of Object.keys(s.bots)) { const sn = s.sn[+k]; if (sn.alive) snakeBot(s, +k); }
      for (let i = 0; i < s.sn.length; i++) { const sn = s.sn[i]; if (!sn.alive && sn.respawn && now() >= sn.respawn) { spawn(s, i); sn.respawn = 0; } }
      const heads: Record<number, number[]> = {}, dead = new Set<number>();
      s.sn.forEach((sn: any, i: number) => {
        if (!sn.alive) return;
        sn.dir = sn.next; const h = sn.body[0], x = (h % SW) + DIRS[sn.dir][0], y = Math.floor(h / SW) + DIRS[sn.dir][1];
        if (x < 0 || y < 0 || x >= SW || y >= SH) { dead.add(i); return; }
        const n = y * SW + x; sn.nh = n; (heads[n] = heads[n] || []).push(i);
      });
      const bodies = new Map<number, number>();
      s.sn.forEach((sn: any, i: number) => { if (sn.alive) sn.body.forEach((c: number, k: number) => { if (k < sn.body.length - 1 || sn.grow) bodies.set(c, i); }); });
      s.sn.forEach((sn: any, i: number) => {
        if (!sn.alive || dead.has(i)) return;
        if (heads[sn.nh].length > 1) { dead.add(i); return; }
        if (bodies.has(sn.nh)) { dead.add(i); const killer = bodies.get(sn.nh)!; if (killer !== i) { s.sn[killer].score += 5; s.sn[killer].kills++; } }
      });
      const occ = snakeOcc(s);
      s.sn.forEach((sn: any, i: number) => {
        if (!sn.alive) return;
        if (dead.has(i)) { sn.alive = false; sn.respawn = now() + 2500; sn.score = Math.max(0, sn.score - 3); for (const c of sn.body.filter((_: any, k: number) => k % 2 === 0).slice(0, 8)) if (!s.food.includes(c)) s.food.push(c); sn.body = []; return; }
        sn.body.unshift(sn.nh);
        const f = s.food.indexOf(sn.nh);
        if (f >= 0) { s.food.splice(f, 1); sn.score++; sn.grow += 1; }
        if (sn.grow > 0) sn.grow--; else sn.body.pop();
      });
      while (s.food.length < Math.max(4, s.sn.length + 2)) { const c = free(s, occ); if (!s.food.includes(c)) s.food.push(c); }
      s.deadline = now() + STEP; return {};
    },
  };

  // ================= Backgammon =================
  // board[i] > 0: player 0's checkers, < 0: player 1's. Player 0 moves 23 → 0, player 1 moves 0 → 23.
  // Moves work in each player's own "relative" numbering: 24 is the bar, 0-5 the home board, -1 borne off.
  const rel = (p: number, i: number) => (p === 0 ? i : 23 - i);
  const abs = rel; // the mapping is its own inverse
  const own = (s: any, p: number, i: number) => (p === 0 ? Math.max(0, s.b[i]) : Math.max(0, -s.b[i]));
  const opp = (s: any, p: number, i: number) => own(s, 1 - p, i);
  function bgCanStep(s: any, p: number, r: number, d: number) {
    if (s.bar[p] > 0 && r !== 24) return false;
    if (r === 24) { if (!s.bar[p]) return false; } else if (!own(s, p, abs(p, r))) return false;
    const t = r - d;
    if (t >= 0) return opp(s, p, abs(p, t)) < 2;
    // bearing off: everything must be home
    if (s.bar[p]) return false;
    for (let x = 6; x < 24; x++) if (own(s, p, abs(p, x))) return false;
    if (t === -1) return true;
    for (let x = r + 1; x < 6; x++) if (own(s, p, abs(p, x))) return false; // a higher checker must use it first
    return true;
  }
  function bgStep(s: any, p: number, r: number, d: number) {
    const sg = p === 0 ? 1 : -1, t = r - d;
    if (r === 24) s.bar[p]--; else s.b[abs(p, r)] -= sg;
    if (t < 0) { s.off[p]++; return { r, t: -1, hit: false }; }
    const ai = abs(p, t);
    let hit = false;
    if (opp(s, p, ai) === 1) { s.b[ai] = 0; s.bar[1 - p]++; hit = true; }
    s.b[ai] += sg; return { r, t, hit };
  }
  const bgClone = (s: any) => ({ b: s.b.slice(), bar: s.bar.slice(), off: s.off.slice() });
  // every legal way to play the dice: lists of [from, die] in relative numbering, all of maximal length
  function bgSeqs(s: any, p: number, dice: number[]) {
    let out: { seq: number[][]; st: any }[] = [], best = 0;
    const seen = new Set<string>();
    const rec = (st: any, left: number[], seq: number[][]) => {
      let moved = false;
      const tried = new Set<number>();
      for (let k = 0; k < left.length; k++) {
        const d = left[k]; if (tried.has(d)) continue; tried.add(d);
        const froms = st.bar[p] ? [24] : [...Array(24).keys()].filter((r) => own(st, p, abs(p, r)));
        for (const r of froms) {
          if (!bgCanStep(st, p, r, d)) continue;
          const n2 = bgClone(st); bgStep(n2, p, r, d); moved = true;
          rec(n2, left.slice(0, k).concat(left.slice(k + 1)), seq.concat([[r, d]]));
        }
      }
      if (!moved) {
        const key = seq.map((x) => x.join(":")).join("|");
        if (seen.has(key)) return; seen.add(key);
        if (seq.length > best) { best = seq.length; out = []; }
        if (seq.length === best) out.push({ seq, st });
      }
    };
    rec(bgClone(s), dice.slice(), []);
    if (best === 1 && dice.length === 2 && dice[0] !== dice[1]) { // if only one die can be used, it must be the higher one when possible
      const hi = Math.max(...dice), withHi = out.filter((o) => o.seq[0][1] === hi);
      if (withHi.length) out = withHi;
    }
    return out;
  }
  function pip(st: any, p: number) { let n = st.bar[p] * 25; for (let r = 0; r < 24; r++) n += own(st, p, abs(p, r)) * (r + 1); return n; }
  function bgEval(st: any, p: number, l: number) {
    const q = 1 - p;
    let v = (pip(st, q) - pip(st, p)) * 1.0 + st.off[p] * 6 + st.bar[q] * (l === 2 ? 14 : 10);
    for (let r = 0; r < 24; r++) {
      const c = own(st, p, abs(p, r));
      if (c >= 2) v += r < 6 ? 6 : r < 12 ? 3 : 1.5; // made points, especially at home
      if (c === 1) { // a blot: how many enemy checkers could hit it?
        let shots = st.bar[q] ? 2 : 0;
        for (let x = r + 1; x <= Math.min(23, r + 12); x++) if (own(st, q, abs(q, 23 - x))) shots++;
        v -= (l === 2 ? 2.5 : 1.5) * Math.min(6, shots) * (r < 12 ? 1.4 : 1);
      }
    }
    if (l === 2) { let run = 0, bestRun = 0; for (let r = 0; r < 12; r++) { if (own(st, p, abs(p, r)) >= 2) { run++; bestRun = Math.max(bestRun, run); } else run = 0; } v += bestRun * bestRun * 1.5; }
    return v;
  }
  function bgRoll(s: any) { const a = 1 + Math.floor(Math.random() * 6), b = 1 + Math.floor(Math.random() * 6); s.dice = [a, b]; s.left = a === b ? [a, a, a, a] : [a, b]; s.phase = "move"; s.moved = []; bgAuto(s); }
  function bgAuto(s: any) { // no legal move left → pass the turn
    if (s.phase !== "move") return;
    const seqs = bgSeqs(s, s.turn, s.left);
    if (!seqs.length || !seqs[0].seq.length) { s.log = (s.left.length === s.dice.length && !s.moved.length ? "{" + s.turn + "} can't move" : s.log); s.turn = 1 - s.turn; s.phase = "roll"; s.left = []; }
  }
  function bgNewGame(s: any) {
    s.b = Array(24).fill(0);
    const put = (p: number, r: number, n: number) => { s.b[abs(p, r)] += p === 0 ? n : -n; };
    for (const p of [0, 1]) { put(p, 23, 2); put(p, 12, 5); put(p, 7, 3); put(p, 5, 5); }
    s.bar = [0, 0]; s.off = [0, 0]; s.dice = []; s.left = []; s.moved = [];
    let a = 0, b = 0; while (a === b) { a = 1 + Math.floor(Math.random() * 6); b = 1 + Math.floor(Math.random() * 6); }
    s.turn = a > b ? 0 : 1; s.dice = [a, b]; s.left = [a, b]; s.phase = "move"; s.log = "Opening roll: " + a + " vs " + b; bgAuto(s);
  }
  const backgammon = {
    name: "Backgammon", min: 2, max: 2,
    init(_n: number, o: any = {}) { const s: any = { score: [0, 0], to: [1, 3, 5].includes(o.points) ? o.points : 1, log: "", game: 1, last: null }; bgNewGame(s); return s; },
    turn: (s: any) => (s.phase === "done" || s.phase === "between" ? null : s.turn),
    view(s: any, seat: number) {
      let moves: number[][] = [];
      const ck = s.phase + s.turn + s.b.join(",") + s.bar.join(",") + s.left.join(",");
      if (s._ck === ck && seat === s.turn) moves = s._cv;
      else if (seat === s.turn && s.phase === "move") { const seen = new Set<string>(); for (const o of bgSeqs(s, s.turn, s.left)) { const [r, d] = o.seq[0]; const t = r - d < 0 ? -1 : r - d; const key = r + ":" + t; if (!seen.has(key)) { seen.add(key); moves.push([r === 24 ? 24 : abs(s.turn, r), t < 0 ? -1 : abs(s.turn, t), d]); } } s._ck = ck; s._cv = moves; }
      return { b: s.b, bar: s.bar, off: s.off, dice: s.dice, left: s.left, phase: s.phase, turn: s.turn, moves, score: s.score, to: s.to, log: s.log, pips: [pip(s, 0), pip(s, 1)], last: s.last, deadline: s.deadline || 0, now: now() };
    },
    move(s: any, seat: number, m: any) {
      if (seat !== s.turn) return { err: "Not your turn" };
      if (m.action === "roll") { if (s.phase !== "roll") return { err: "Move your checkers first" }; bgRoll(s); s.log = "{" + seat + "} rolled " + s.dice.join("-"); return {}; }
      if (m.action !== "move" || s.phase !== "move") return { err: "Roll first" };
      // from/to arrive in absolute numbering (24 = bar, -1 = off); find the matching first step of a legal sequence
      const fromR = m.from === 24 ? 24 : rel(seat, Math.floor(+m.from)), seqs = bgSeqs(s, seat, s.left);
      const cand = seqs.map((o) => o.seq[0]).filter((x) => x[0] === fromR && (m.to === -1 ? x[0] - x[1] < 0 : x[0] - x[1] === rel(seat, Math.floor(+m.to))));
      if (!cand.length) return { err: "You can't move there" };
      const d = cand.sort((a, b) => a[1] - b[1])[0][1];
      const r = bgStep(s, seat, fromR, d); s.left.splice(s.left.indexOf(d), 1); s.moved.push([fromR, d]);
      s.last = { p: seat, from: m.from, to: m.to, hit: r.hit };
      if (s.off[seat] >= 15) { // game over: 1 point, 2 for a gammon, 3 for a backgammon
        const q = 1 - seat; let pts = 1;
        if (!s.off[q]) { pts = 2; let deep = s.bar[q] > 0; for (let x = 0; x < 6; x++) if (own(s, q, abs(seat, x))) deep = true; if (deep) pts = 3; }
        s.score[seat] += pts; s.log = "{" + seat + "} wins the game" + (pts === 3 ? " with a backgammon!" : pts === 2 ? " with a gammon!" : "") + " (+" + pts + ")";
        if (s.score[seat] >= s.to) { s.phase = "done"; return { done: true, winner: seat }; }
        s.phase = "between"; s.deadline = now() + 4000; return {};
      }
      if (!s.left.length) { s.turn = 1 - seat; s.phase = "roll"; return {}; }
      bgAuto(s); return {};
    },
    tick(s: any) { if (s.phase === "between") { s.game++; bgNewGame(s); s.deadline = 0; } return {}; },
    bot(s: any, seat: number, level: string) {
      if (s.phase === "roll") return { action: "roll" };
      const l = LV[level] ?? 1, seqs = bgSeqs(s, seat, s.left);
      if (!seqs.length || !seqs[0].seq.length) return null;
      let pick = rnd(seqs);
      if (l > 0) { let best = -1e9; for (const o of seqs) { const v = bgEval(o.st, seat, l) + (l === 1 ? Math.random() * 4 : 0); if (v > best) { best = v; pick = o; } } }
      const [r, d] = pick.seq[0], t = r - d;
      return { action: "move", from: r === 24 ? 24 : abs(seat, r), to: t < 0 ? -1 : abs(seat, t) };
    },
  };

  // ================= Gin Rummy =================
  const GR = "A23456789TJQK", gv = (c: string) => Math.min(10, GR.indexOf(c[0]) + 1), gi = (c: string) => GR.indexOf(c[0]);
  const ginDeck = () => shuffle("SHDC".split("").flatMap((su) => GR.split("").map((r) => r + su)));
  function allMelds(hand: string[]) {
    const out: string[][] = [];
    for (const r of GR) { const same = hand.filter((c) => c[0] === r); if (same.length >= 3) { out.push(same.slice()); if (same.length === 4) for (let i = 0; i < 4; i++) out.push(same.filter((_, k) => k !== i)); } }
    for (const su of "SHDC") {
      const cs = hand.filter((c) => c[1] === su).sort((a, b) => gi(a) - gi(b));
      for (let i = 0; i < cs.length; i++) for (let j = i + 2; j < cs.length; j++) {
        const run = cs.slice(i, j + 1); let ok = true;
        for (let k = 1; k < run.length; k++) if (gi(run[k]) !== gi(run[k - 1]) + 1) { ok = false; break; }
        if (ok) out.push(run);
      }
    }
    return out;
  }
  // the meld arrangement with the least deadwood
  function bestMelds(hand: string[]) {
    const ms = allMelds(hand); let best = { melds: [] as string[][], dead: hand.slice(), dw: hand.reduce((a, c) => a + gv(c), 0) };
    const rec = (i: number, used: Set<string>, chosen: string[][]) => {
      const dead = hand.filter((c) => !used.has(c)), dw = dead.reduce((a, c) => a + gv(c), 0);
      if (dw < best.dw) best = { melds: chosen.slice(), dead, dw };
      for (let k = i; k < ms.length; k++) { const m = ms[k]; if (m.some((c) => used.has(c))) continue; m.forEach((c) => used.add(c)); chosen.push(m); rec(k + 1, used, chosen); chosen.pop(); m.forEach((c) => used.delete(c)); }
    };
    rec(0, new Set(), []);
    return best;
  }
  function layOff(melds: string[][], dead: string[]) { // defender adds their deadwood to the knocker's melds where it fits
    const ms = melds.map((m) => m.slice()); let left = dead.slice(), changed = true;
    while (changed) {
      changed = false;
      for (const c of left.slice()) for (const m of ms) {
        const isSet = m.every((x) => x[0] === m[0][0]);
        let fits = false;
        if (isSet) fits = c[0] === m[0][0] && m.length < 4;
        else if (c[1] === m[0][1]) { const lo = Math.min(...m.map(gi)), hi = Math.max(...m.map(gi)); fits = gi(c) === lo - 1 || gi(c) === hi + 1; }
        if (fits) { m.push(c); left = left.filter((x) => x !== c); changed = true; break; }
      }
    }
    return left;
  }
  function ginDeal(s: any) {
    const d = ginDeck(); s.hands = [d.splice(0, 10), d.splice(0, 10)]; s.discard = [d.shift()]; s.stock = d;
    s.dealer = 1 - s.dealer; s.turn = 1 - s.dealer; s.phase = "draw"; s.show = null; s.seen = [[], []];
  }
  function ginResolve(s: any, knocker: number) {
    const def = 1 - knocker, K = bestMelds(s.hands[knocker]), D = bestMelds(s.hands[def]);
    const gin = K.dw === 0, defDead = gin ? D.dead : layOff(K.melds, D.dead), dDw = defDead.reduce((a, c) => a + gv(c), 0);
    let who = knocker, pts = 0, kind = "knock";
    if (gin) { pts = 25 + dDw; kind = "gin"; }
    else if (dDw <= K.dw) { who = def; pts = 25 + (K.dw - dDw); kind = "undercut"; }
    else pts = dDw - K.dw;
    s.score[who] += pts;
    s.show = { knocker, who, pts, kind, kMelds: K.melds, kDead: K.dead, dMelds: D.melds, dDead: defDead, kDw: K.dw, dDw };
    s.log = "{" + who + "} scores " + pts + (kind === "gin" ? " for gin!" : kind === "undercut" ? " with an undercut!" : "");
    s.phase = "show"; s.deadline = now() + 7000;
  }
  const gin = {
    name: "Gin Rummy", min: 2, max: 2,
    init(_n: number, o: any = {}) { const s: any = { score: [0, 0], target: o.target === 50 ? 50 : 100, dealer: 1, log: "", hand: 1 }; ginDeal(s); return s; },
    turn: (s: any) => (s.phase === "draw" || s.phase === "discard" ? s.turn : null),
    view(s: any, seat: number) {
      const me = seat >= 0 ? s.hands[seat] : null, bm = me ? bestMelds(me) : null;
      return { hand: me, melds: bm ? bm.melds : [], dw: bm ? bm.dw : 0, opp: s.show ? null : s.hands.map((h: string[]) => h.length), top: s.discard[s.discard.length - 1] || null, stock: s.stock.length, phase: s.phase, turn: s.turn, score: s.score, target: s.target, show: s.show, log: s.log, hands: s.show ? s.hands : null, drew: s.drew || null, deadline: s.deadline || 0, now: now() };
    },
    move(s: any, seat: number, m: any) {
      if (seat !== s.turn) return { err: "Not your turn" };
      const hand: string[] = s.hands[seat];
      if (s.phase === "draw") {
        if (m.action !== "draw") return { err: "Draw a card first" };
        if (m.from === "discard") { if (!s.discard.length) return { err: "The discard pile is empty" }; const c = s.discard.pop(); hand.push(c); s.drew = c; s.seen[seat].push(c); s.log = "{" + seat + "} took " + c; }
        else { if (s.stock.length <= 2) { s.log = "The stock ran out, so the hand is a draw"; s.phase = "show"; s.show = { kind: "void", pts: 0, who: -1 }; s.deadline = now() + 4000; return {}; } const c = s.stock.shift(); hand.push(c); s.drew = null; s.log = "{" + seat + "} drew from the stock"; }
        s.phase = "discard"; return {};
      }
      if (s.phase === "discard") {
        const c = m.card, i = hand.indexOf(c);
        if (i < 0) return { err: "You don't have that card" };
        if (m.action === "knock") {
          const rest = hand.filter((x) => x !== c), b = bestMelds(rest);
          if (b.dw > 10) return { err: "You need 10 or less deadwood to knock" };
          hand.splice(i, 1); s.discard.push(c); ginResolve(s, seat);
          if (Math.max(...s.score) >= s.target) { s.phase = "over"; return { done: true, winner: s.score[0] >= s.score[1] ? 0 : 1 }; }
          return {};
        }
        if (m.action !== "discard") return { err: "Discard a card" };
        if (s.drew === c) return { err: "You can't throw back the card you just took" };
        hand.splice(i, 1); s.discard.push(c); s.drew = null; s.turn = 1 - seat; s.phase = "draw"; s.log = "{" + seat + "} discarded " + c; return {};
      }
      return { err: "Wait for the next hand" };
    },
    tick(s: any) { if (s.phase === "show") { s.hand++; ginDeal(s); s.deadline = 0; } return {}; },
    bot(s: any, seat: number, level: string) {
      const l = LV[level] ?? 1, hand: string[] = s.hands[seat];
      if (s.phase === "draw") {
        const top = s.discard[s.discard.length - 1];
        if (top && l > 0) {
          const now0 = bestMelds(hand), with_ = bestMelds(hand.concat([top]));
          const inMeld = with_.melds.some((m) => m.includes(top));
          const drop = with_.dead.filter((x) => x !== top).sort((a, b) => gv(b) - gv(a))[0];
          const after = drop ? bestMelds(hand.concat([top]).filter((x) => x !== drop)).dw : with_.dw;
          if ((l === 2 && inMeld) || after < now0.dw - (l === 2 ? 0 : 2)) return { action: "draw", from: "discard" };
        }
        if (top && l === 0 && Math.random() < 0.3) return { action: "draw", from: "discard" };
        return { action: "draw", from: "stock" };
      }
      // choose the discard that leaves the least deadwood
      let best: any = null;
      for (const c of hand) {
        if (c === s.drew) continue;
        const b = bestMelds(hand.filter((x) => x !== c));
        let v = b.dw * 10 - gv(c);
        if (l === 2) { const theirs = s.seen[1 - seat]; if (theirs.some((x: string) => x[0] === c[0] || (x[1] === c[1] && Math.abs(gi(x) - gi(c)) <= 2))) v += 25; } // don't feed their melds
        if (l === 0) v += Math.random() * 60;
        if (!best || v < best.v) best = { c, v, dw: b.dw };
      }
      const knockAt = 10;
      if (best.dw <= knockAt && (l > 0 || Math.random() < 0.5)) return { action: "knock", card: best.c };
      return { action: "discard", card: best.c };
    },
  };

  return { bomb, typing, mines, snake, backgammon, gin };
}

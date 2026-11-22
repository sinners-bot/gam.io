// Game Night plugin: party games (Mafia, Who's the Spy, Trivia, Word Hunt, Draw & Guess). Loaded by the game server at startup.
// No template literals in this file: it is embedded in a String.raw block by the service that serves it.
export default function register(api: any) {
  const shuffle: (a: any[]) => any[] = api.shuffle;
  const rnd = (a: any[]) => a[Math.floor(Math.random() * a.length)];
  const now = () => Date.now();
  const top = (score: number[]) => { const b = Math.max(...score); const w = score.map((x, i) => (x === b ? i : -1)).filter((i) => i >= 0); return w; };
  const done = (winners: number[]) => ({ done: true, winner: winners.length === 1 ? winners[0] : null, winners });

  // ---------------- Trivia ----------------
  const FALLBACK_Q = [
    ["What is the largest planet in our solar system?", "Jupiter", "Saturn", "Neptune", "Earth"], ["Which element has the chemical symbol O?", "Oxygen", "Gold", "Osmium", "Iron"],
    ["How many continents are there?", "7", "5", "6", "8"], ["Who painted the Mona Lisa?", "Leonardo da Vinci", "Michelangelo", "Raphael", "Van Gogh"],
    ["What is the capital of Japan?", "Tokyo", "Kyoto", "Osaka", "Seoul"], ["Which animal is known as the King of the Jungle?", "Lion", "Tiger", "Elephant", "Gorilla"],
    ["How many legs does a spider have?", "8", "6", "10", "12"], ["What is the boiling point of water at sea level in °C?", "100", "90", "80", "120"],
    ["Which ocean is the largest?", "Pacific", "Atlantic", "Indian", "Arctic"], ["What gas do plants absorb from the air?", "Carbon dioxide", "Oxygen", "Nitrogen", "Helium"],
    ["Which country hosts the city of Rio de Janeiro?", "Brazil", "Argentina", "Portugal", "Mexico"], ["How many sides does a hexagon have?", "6", "5", "7", "8"],
    ["Which planet is known as the Red Planet?", "Mars", "Venus", "Mercury", "Jupiter"], ["What is the hardest natural substance?", "Diamond", "Granite", "Iron", "Quartz"],
    ["In which game would you checkmate?", "Chess", "Checkers", "Go", "Poker"], ["What is the longest river in Africa?", "Nile", "Congo", "Niger", "Zambezi"],
    ["Which language has the most native speakers?", "Mandarin Chinese", "English", "Spanish", "Hindi"], ["What is 12 × 12?", "144", "124", "132", "154"],
    ["Which instrument has 88 keys?", "Piano", "Organ", "Accordion", "Harp"], ["What is the smallest prime number?", "2", "1", "3", "0"],
  ].map((r) => ({ q: r[0], right: r[1], wrong: r.slice(2), cat: "General" }));
  let pool: any[] = [];
  async function refill() {
    try {
      const r = await fetch("https://opentdb.com/api.php?amount=50&type=multiple&encode=url3986");
      const d: any = await r.json();
      for (const x of d.results || []) pool.push({ q: decodeURIComponent(x.question), right: decodeURIComponent(x.correct_answer), wrong: x.incorrect_answers.map(decodeURIComponent), cat: decodeURIComponent(x.category) });
    } catch (e) { console.error("trivia fetch failed", e); }
  }
  refill();
  const QN = 10, QT = 15000;
  function tqReveal(s: any) {
    const q = s.qs[s.i];
    for (const k of Object.keys(s.ans)) { const a = s.ans[k]; if (a.a === q.c) { const pts = 500 + Math.round(500 * Math.max(0, a.left) / QT); s.score[+k] += pts; a.pts = pts; } else a.pts = 0; }
    s.phase = "reveal"; s.deadline = now() + 4500;
  }
  const trivia = {
    name: "Trivia", min: 1, max: 10, noBots: true,
    init(n: number, o: any = {}) {
      const QN2 = [10, 15, 20].includes(o.count) ? o.count : QN;
      const src = pool.length >= QN2 ? pool.splice(0, QN2) : shuffle(FALLBACK_Q.slice()).slice(0, QN2);
      if (pool.length < 20) refill();
      const qs = src.map((x) => { const a = shuffle([x.right].concat(x.wrong)); return { q: x.q, a, c: a.indexOf(x.right), cat: x.cat }; });
      return { qs, i: 0, phase: "q", deadline: now() + QT, ans: {}, score: Array(n).fill(0) };
    },
    turn: () => null,
    view(s: any, seat: number) {
      const q = s.qs[s.i], rev = s.phase === "reveal";
      return { i: s.i, n: s.qs.length, q: q.q, cat: q.cat, a: q.a, c: rev ? q.c : -1, phase: s.phase, deadline: s.deadline, now: now(), score: s.score,
        answered: Object.keys(s.ans).map(Number), mine: s.ans[seat] ? s.ans[seat].a : -1, picks: rev ? s.ans : null };
    },
    move(s: any, seat: number, m: any) {
      if (s.phase !== "q") return { err: "Wait for the next question" };
      if (s.ans[seat]) return { err: "You already answered" };
      const a = Number(m.a); if (!(a >= 0 && a < 4)) return { err: "Bad answer" };
      s.ans[seat] = { a, left: s.deadline - now() };
      if (Object.keys(s.ans).length >= s.score.length) tqReveal(s);
      return {};
    },
    tick(s: any) {
      if (s.phase === "q") { tqReveal(s); return {}; }
      s.i++; if (s.i >= s.qs.length) return done(top(s.score));
      s.phase = "q"; s.ans = {}; s.deadline = now() + QT; return {};
    },
  };

  // ---------------- Word Hunt ----------------
  const DICE = ["AAEEGN", "ABBJOO", "ACHOPS", "AFFKPS", "AOOTTW", "CIMOTU", "DEILRX", "DELRVY", "DISTTY", "EEGHNW", "EEINSU", "EHRTVW", "EIOSST", "ELRTTY", "HIMNUQ", "HLNNRZ"];
  let DICT: Set<string> | null = null;
  (async () => {
    try {
      const t = await (await fetch("https://raw.githubusercontent.com/dwyl/english-words/master/words_alpha.txt")).text();
      DICT = new Set(t.split(/\r?\n/).map((w) => w.trim().toUpperCase()).filter((w) => w.length >= 3 && w.length <= 16));
      console.log("word list loaded", DICT.size);
    } catch (e) { console.error("word list failed", e); }
  })();
  function trace(grid: string[], w: string) {
    const used = Array(16).fill(false);
    const go = (i: number, k: number): boolean => {
      const t = grid[i];
      if (w.substr(k, t.length) !== t) return false;
      if (k + t.length === w.length) return true;
      used[i] = true;
      const r = i >> 2, c = i & 3;
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
        const rr = r + dr, cc = c + dc, j = rr * 4 + cc;
        if ((dr || dc) && rr >= 0 && rr < 4 && cc >= 0 && cc < 4 && !used[j] && go(j, k + t.length)) { used[i] = false; return true; }
      }
      used[i] = false; return false;
    };
    for (let i = 0; i < 16; i++) if (go(i, 0)) return true;
    return false;
  }
  const whPts = (n: number) => (n <= 3 ? 100 : n === 4 ? 400 : n === 5 ? 800 : n === 6 ? 1400 : n === 7 ? 1800 : 2200 + (n - 8) * 400);
  const wordhunt = {
    name: "Word Hunt", min: 1, max: 8, noBots: true,
    init(n: number) {
      const grid = shuffle(DICE.slice()).map((d) => { const ch = rnd(d.split("")); return ch === "Q" ? "QU" : ch; });
      return { grid, phase: "play", deadline: now() + 80000, found: Array.from({ length: n }, () => []), score: Array(n).fill(0) };
    },
    turn: () => null,
    view(s: any, seat: number) {
      const over = s.phase !== "play";
      return { grid: s.grid, phase: s.phase, deadline: s.deadline, now: now(), score: s.score, counts: s.found.map((f: any[]) => f.length),
        mine: seat >= 0 ? s.found[seat] : [], all: over ? s.found : null, dict: !!DICT };
    },
    move(s: any, seat: number, m: any) {
      if (s.phase !== "play") return { err: "Time's up" };
      const w = String(m.w || "").toUpperCase().replace(/[^A-Z]/g, "");
      if (w.length < 3) return { err: "Words need 3+ letters" };
      if (s.found[seat].some((f: any) => f.w === w)) return { err: "Already found " + w };
      if (!trace(s.grid, w)) return { err: w + " isn't on the board" };
      if (DICT && !DICT.has(w)) return { err: w + " isn't in the dictionary" };
      const p = whPts(w.length);
      s.found[seat].unshift({ w, p }); s.score[seat] += p;
      return {};
    },
    tick(s: any) { s.phase = "over"; return done(top(s.score)); },
  };

  // ---------------- Who's the Spy ----------------
  const LOCS = ["Airplane", "Bank", "Beach", "Casino", "Cathedral", "Circus", "Cruise ship", "Day spa", "Embassy", "Hospital", "Hotel", "Military base", "Movie studio", "Pirate ship", "Polar station", "Police station", "Restaurant", "School", "Space station", "Submarine", "Supermarket", "Theater", "University", "Zoo", "Train", "Museum", "Amusement park", "Library"];
  const spy = {
    name: "Who's the Spy?", min: 3, max: 10, noBots: true,
    init(n: number) {
      return { spy: Math.floor(Math.random() * n), loc: rnd(LOCS), phase: "talk", deadline: now() + 300000, first: Math.floor(Math.random() * n), votes: {}, n, result: "" };
    },
    turn: () => null,
    view(s: any, seat: number) {
      const over = s.phase === "over";
      return { phase: s.phase, deadline: s.deadline, now: now(), first: s.first, locs: LOCS, votes: s.phase === "vote" ? Object.keys(s.votes).map(Number) : s.votes,
        role: seat < 0 ? "watch" : seat === s.spy ? "spy" : "agent", loc: (seat >= 0 && seat !== s.spy) || over ? s.loc : null, spy: over ? s.spy : -1, result: s.result, myVote: s.votes[seat] };
    },
    move(s: any, seat: number, m: any) {
      const town = () => [...Array(s.n).keys()].filter((i) => i !== s.spy);
      if (m.action === "guess") {
        if (seat !== s.spy) return { err: "Only the spy can guess" };
        if (!(s.phase === "talk" || s.phase === "spyguess")) return { err: "Not now" };
        s.phase = "over";
        if (m.loc === s.loc) { s.result = "The spy guessed the location!"; return done([s.spy]); }
        s.result = "The spy guessed " + String(m.loc) + " — wrong!"; return done(town());
      }
      if (m.action === "callvote") { if (s.phase !== "talk") return { err: "Not now" }; s.phase = "vote"; s.votes = {}; s.deadline = now() + 60000; return {}; }
      if (m.action === "vote") {
        if (s.phase !== "vote") return { err: "Voting hasn't started" };
        const t = Number(m.target); if (!(t >= 0 && t < s.n) || t === seat) return { err: "Pick someone else" };
        s.votes[seat] = t;
        if (Object.keys(s.votes).length >= s.n) return spyResolve(s, town);
        return {};
      }
      return { err: "Bad move" };
    },
    tick(s: any) {
      const town = () => [...Array(s.n).keys()].filter((i) => i !== s.spy);
      if (s.phase === "talk") { s.phase = "vote"; s.votes = {}; s.deadline = now() + 60000; return {}; }
      if (s.phase === "vote") return spyResolve(s, town);
      if (s.phase === "spyguess") { s.phase = "over"; s.result = "The spy ran out of time to guess."; return done(town()); }
      return {};
    },
  };
  function spyResolve(s: any, town: () => number[]) {
    const tally: Record<string, number> = {};
    for (const v of Object.values(s.votes) as number[]) tally[v] = (tally[v] || 0) + 1;
    const best = Math.max(0, ...Object.values(tally)), tops = Object.keys(tally).filter((k) => tally[k] === best).map(Number);
    if (tops.length === 1 && tops[0] === s.spy) { s.phase = "spyguess"; s.deadline = now() + 30000; s.result = "Caught! The spy gets one guess at the location."; return {}; }
    s.phase = "over"; s.result = tops.length === 1 ? "Wrong person accused — the spy escapes!" : "The vote was tied — the spy escapes!";
    return done([s.spy]);
  }

  // ---------------- Mafia ----------------
  const NIGHT = 40000, DAY = 150000;
  const mafia = {
    name: "Mafia", min: 4, max: 12, noBots: true,
    init(n: number) {
      const m = Math.max(1, Math.floor(n / 4));
      const roles = shuffle(Array(m).fill("mafia").concat(["doctor"], n >= 5 ? ["detective"] : [], Array(Math.max(0, n - m - (n >= 5 ? 2 : 1))).fill("villager")));
      return { roles, alive: Array(n).fill(true), phase: "night", day: 1, deadline: now() + NIGHT, kill: {}, save: -1, check: -1, checks: [], votes: {}, log: ["Night 1 falls. Mafia, choose your target…"] };
    },
    turn: () => null,
    view(s: any, seat: number) {
      const me = s.roles[seat], over = s.phase === "over";
      return { phase: s.phase, day: s.day, deadline: s.deadline, now: now(), alive: s.alive, log: s.log.slice(-12), role: me || "watch", me: seat,
        team: me === "mafia" || over ? s.roles.map((r: string, i: number) => (r === "mafia" ? i : -1)).filter((i: number) => i >= 0) : [],
        roles: over ? s.roles : s.roles.map((r: string, i: number) => (!s.alive[i] ? r : null)),
        checks: me === "detective" ? s.checks : [], myKill: me === "mafia" ? s.kill[seat] : undefined, mySave: me === "doctor" ? s.save : undefined, myCheck: me === "detective" ? s.check : undefined,
        votes: s.phase === "day" ? s.votes : {}, killVotes: me === "mafia" ? s.kill : {} };
    },
    move(s: any, seat: number, m: any) {
      if (!s.alive[seat]) return { err: "You're out — watch the rest of the game" };
      const t = Number(m.target), role = s.roles[seat], okT = t >= 0 && t < s.roles.length && s.alive[t];
      if (s.phase === "night") {
        if (m.action === "kill" && role === "mafia") { if (!okT || s.roles[t] === "mafia") return { err: "Pick a town player" }; s.kill[seat] = t; }
        else if (m.action === "save" && role === "doctor") { if (!okT) return { err: "Pick a living player" }; s.save = t; }
        else if (m.action === "check" && role === "detective") { if (!okT || t === seat) return { err: "Pick someone else" }; s.check = t; }
        else return { err: "Nothing to do now" };
        if (nightReady(s)) return endNight(s);
        return {};
      }
      if (s.phase === "day" && m.action === "vote") {
        if (!(t === -1 || okT)) return { err: "Pick a living player" };
        s.votes[seat] = t;
        if (s.alive.every((a: boolean, i: number) => !a || s.votes[i] !== undefined)) return endDay(s);
        return {};
      }
      return { err: "Nothing to do now" };
    },
    tick(s: any) { return s.phase === "night" ? endNight(s) : s.phase === "day" ? endDay(s) : {}; },
  };
  const aliveWith = (s: any, r: string) => s.roles.map((x: string, i: number) => (x === r && s.alive[i] ? i : -1)).filter((i: number) => i >= 0);
  function nightReady(s: any) {
    const mafiaDone = aliveWith(s, "mafia").every((i: number) => s.kill[i] !== undefined);
    const docDone = !aliveWith(s, "doctor").length || s.save >= 0;
    const detDone = !aliveWith(s, "detective").length || s.check >= 0;
    return mafiaDone && docDone && detDone;
  }
  function mafiaWin(s: any) {
    const m = aliveWith(s, "mafia").length, t = s.alive.filter((a: boolean) => a).length - m;
    if (!m) { s.phase = "over"; s.log.push("All mafia are gone — the town wins! 🎉"); return done(s.roles.map((r: string, i: number) => (r !== "mafia" ? i : -1)).filter((i: number) => i >= 0)); }
    if (m >= t) { s.phase = "over"; s.log.push("The mafia outnumber the town — mafia wins! 🔪"); return done(s.roles.map((r: string, i: number) => (r === "mafia" ? i : -1)).filter((i: number) => i >= 0)); }
    return null;
  }
  function endNight(s: any) {
    const tally: Record<string, number> = {};
    for (const v of Object.values(s.kill) as number[]) tally[v] = (tally[v] || 0) + 1;
    const keys = Object.keys(tally), target = keys.length ? Number(keys.sort((a, b) => tally[b] - tally[a])[0]) : -1;
    if (s.check >= 0) s.checks.push({ t: s.check, mafia: s.roles[s.check] === "mafia", day: s.day });
    if (target >= 0 && target !== s.save) { s.alive[target] = false; s.log.push("☀️ Day " + s.day + ": {" + target + "} was found dead. They were a " + s.roles[target] + "."); }
    else s.log.push("☀️ Day " + s.day + ": " + (target >= 0 ? "The doctor saved someone — nobody died!" : "A quiet night — nobody died."));
    s.kill = {}; s.save = -1; s.check = -1;
    const w = mafiaWin(s); if (w) return w;
    s.phase = "day"; s.votes = {}; s.deadline = now() + DAY; return {};
  }
  function endDay(s: any) {
    const tally: Record<string, number> = {};
    for (const v of Object.values(s.votes) as number[]) if (v >= 0) tally[v] = (tally[v] || 0) + 1;
    const best = Math.max(0, ...Object.values(tally)), tops = Object.keys(tally).filter((k) => tally[k] === best).map(Number);
    if (best > 0 && tops.length === 1) { const t = tops[0]; s.alive[t] = false; s.log.push("⚖️ The town voted out {" + t + "}. They were a " + s.roles[t] + "."); }
    else s.log.push("⚖️ No majority — nobody was voted out.");
    const w = mafiaWin(s); if (w) return w;
    s.day++; s.phase = "night"; s.deadline = now() + NIGHT; s.log.push("🌙 Night " + s.day + " falls…"); return {};
  }

  // ---------------- Draw & Guess ----------------
  const PACKS: Record<string, string[]> = {
    animals: "cat dog lion tiger zebra giraffe elephant monkey gorilla panda koala kangaroo penguin owl eagle parrot flamingo peacock swan duck chicken rooster cow pig sheep goat horse donkey camel llama deer moose bear wolf fox rabbit squirrel hedgehog mouse rat bat frog turtle snake lizard crocodile shark whale dolphin octopus jellyfish crab lobster snail butterfly bee ant spider ladybug dragonfly seahorse starfish walrus polar_bear sloth hippo rhino".split(" "),
    food: "pizza burger hotdog taco sushi pasta spaghetti sandwich salad soup pancake waffle donut cupcake cookie cake pie icecream popcorn pretzel croissant bagel cheese egg bacon sausage steak chicken fries noodles dumpling burrito omelette cereal toast honey jam chocolate candy lollipop banana apple orange lemon cherry strawberry grapes watermelon pineapple coconut avocado carrot broccoli corn potato tomato onion garlic mushroom pepper cucumber peanut".split(" "),
    objects: "chair table lamp clock phone laptop keyboard mouse camera television remote fridge toaster kettle oven spoon fork knife plate cup bottle umbrella backpack suitcase wallet key lock door window ladder hammer screwdriver scissors stapler pencil eraser book glasses watch ring necklace shoe sock hat glove scarf pillow blanket bed mirror toothbrush comb candle broom bucket shovel bicycle skateboard kite balloon trophy guitar drum".split(" "),
    hard: "gravity democracy nostalgia echo shadow reflection evolution electricity friendship procrastination jealousy wifi password deadline inflation recycling meditation sarcasm teamwork karaoke traffic jam homework hiccup sunburn jetlag blackout firework avalanche eclipse earthquake tide fog rainbow mirage marathon tournament auction elevator escalator vaccine algorithm satellite fossil compass".split(" "),
    deutsch: "Apfel Banane Hund Katze Haus Baum Auto Fahrrad Schule Lehrer Buch Stift Tisch Stuhl Lampe Uhr Handy Brille Hut Schuh Regenschirm Sonne Mond Stern Wolke Regen Schnee Berg Fluss See Meer Strand Insel Schiff Flugzeug Zug Bahnhof Brücke Burg Schloss Kirche Krone König Drache Ritter Pirat Schatz Schlange Pferd Kuh Schwein Ente Biene Schmetterling Spinne Frosch Igel Eichhörnchen Bär Löwe Elefant Giraffe Affe Pinguin Brezel Würstchen Kuchen Eis Pizza Käse Brot Kaffee Tee Geburtstag Weihnachten Schneemann Rakete Roboter Gitarre Trommel Ballon Kerze".split(" "),
  };
  const WORDS = "apple banana guitar rocket castle dragon pizza volcano robot penguin rainbow camera island bridge snowman pirate spider ladder candle diamond tornado unicorn jellyfish backpack lighthouse umbrella butterfly octopus helicopter skateboard cactus hamburger mermaid dinosaur telescope compass anchor kangaroo giraffe pyramid igloo waterfall treasure ghost wizard vampire astronaut parachute crown trophy balloon cupcake popcorn sandwich toothbrush keyboard headphones microphone violin drum trumpet bicycle tractor submarine airplane train scissors hammer magnet clock lantern mountain river desert jungle moon star comet planet sun cloud lightning snowflake fire tree flower mushroom leaf pumpkin carrot cherry lemon grapes watermelon cookie donut icecream cheese egg bee owl fish shark whale turtle snail frog rabbit horse cow pig chicken duck lion tiger zebra elephant monkey bear fox wolf bat crab lobster dolphin".split(" ");
  const DRAW_T = 80000;
  function dgStart(s: any) {
    s.drawer = s.order[s.ri % s.order.length]; s.phase = "pick"; s.choices = shuffle((PACKS[s.pack] || WORDS).slice()).slice(0, 3).map((w: string) => w.replace(/_/g, " ")); s.word = "";
    s.strokes = []; s.total = 0; s.v = (s.v || 0) + 1; s.guessed = {}; s.deadline = now() + 12000; s.pts = 0;
  }
  function dgDraw(s: any, i: number) { s.word = s.choices[i] || s.choices[0]; s.phase = "draw"; s.deadline = now() + DRAW_T; s.chat.push({ sys: "{" + s.drawer + "} is drawing!" }); }
  function dgReveal(s: any) { s.phase = "reveal"; s.deadline = now() + 5000; s.chat.push({ sys: "The word was " + s.word.toUpperCase() + "." }); }
  const draw = {
    name: "Draw & Guess", min: 2, max: 8, noBots: true,
    init(n: number, o: any = {}) {
      const r = [2, 3, 4].includes(o.rounds) ? o.rounds : 0;
      const s: any = { order: shuffle([...Array(n).keys()]), ri: 0, rounds: r ? Math.min(24, n * r) : n <= 3 ? n * 2 : n, score: Array(n).fill(0), chat: [], pack: o.pack || "classic" };
      dgStart(s); return s;
    },
    turn: () => null,
    view(s: any, seat: number) {
      const know = seat === s.drawer || s.guessed[seat] !== undefined || s.phase === "reveal";
      let mask = "";
      if (s.phase !== "pick") {
        const frac = 1 - Math.max(0, s.deadline - now()) / DRAW_T, show = frac > 0.75 ? 2 : frac > 0.5 ? 1 : 0;
        const idx: number[] = []; for (let k = 0; k < s.word.length && idx.length < show; k += 3) idx.push(k);
        mask = s.word.split("").map((ch: string, k: number) => (ch === " " ? " " : idx.includes(k) ? ch : "_")).join("");
      }
      return { phase: s.phase, drawer: s.drawer, round: s.ri + 1, rounds: s.rounds, deadline: s.deadline, now: now(), strokes: s.strokes, v: s.v || 0, score: s.score,
        guessed: Object.keys(s.guessed).map(Number), chat: s.chat.slice(-40), word: know ? s.word : "", mask, len: s.word.length,
        choices: seat === s.drawer && s.phase === "pick" ? s.choices : null };
    },
    move(s: any, seat: number, m: any) {
      if (m.action === "pick") { if (seat !== s.drawer || s.phase !== "pick") return { err: "Not now" }; dgDraw(s, Number(m.i)); return {}; }
      if (m.action === "stroke" || m.action === "clear" || m.action === "undo") {
        if (seat !== s.drawer || s.phase !== "draw") return { err: "Only the drawer can draw" };
        // v changes whenever strokes are removed, so clients know to repaint from scratch
        if (m.action === "clear") { s.strokes = []; s.v = (s.v || 0) + 1; return {}; }
        if (m.action === "undo") { const last = s.strokes[s.strokes.length - 1]; if (last) { const sid = last.sid; while (s.strokes.length && s.strokes[s.strokes.length - 1].sid === sid) s.strokes.pop(); } s.v = (s.v || 0) + 1; return {}; }
        const st = m.s || {}, p = Array.isArray(st.p) ? st.p.slice(0, 400).map((x: any) => Math.max(0, Math.min(1000, Math.round(+x || 0)))) : [];
        s.total = s.total || 0;
        if (p.length < 2 || s.total > 60000) return {};
        s.total += p.length;
        s.strokes.push({ c: /^#[0-9a-f]{6}$/i.test(st.c) ? st.c : "#111111", w: [3, 8, 18, 40, 70].includes(+st.w) ? +st.w : 8, p, sid: Math.floor(+st.sid || 0) }); return {};
      }
      if (m.action === "guess") {
        const text = String(m.text || "").trim().slice(0, 60);
        if (!text) return {};
        if (s.phase !== "draw" || seat === s.drawer || s.guessed[seat] !== undefined) { s.chat.push({ seat, text }); return {}; }
        if (text.toLowerCase() === s.word.toLowerCase()) {
          const left = Math.max(0, s.deadline - now()), pts = 100 + Math.round((300 * left) / DRAW_T);
          s.guessed[seat] = pts; s.score[seat] += pts; s.score[s.drawer] += 60; s.chat.push({ seat, ok: true, pts });
          if (Object.keys(s.guessed).length >= s.score.length - 1) dgReveal(s);
        } else s.chat.push({ seat, text, close: Math.abs(text.length - s.word.length) <= 1 && text[0].toLowerCase() === s.word[0] });
        return {};
      }
      return { err: "Bad move" };
    },
    tick(s: any) {
      if (s.phase === "pick") { dgDraw(s, 0); return {}; }
      if (s.phase === "draw") { dgReveal(s); return {}; }
      s.ri++; if (s.ri >= s.rounds) return done(top(s.score));
      dgStart(s); return {};
    },
  };

  return { mafia, spy, trivia, wordhunt, draw };
}

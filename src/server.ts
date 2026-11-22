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

__GAMES__

__AI__

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
type User = { id: string; name: string; avatar: string | null; guest?: boolean; bot?: boolean; level?: Level; frame?: string };
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
  const pg = await loadProg(u);
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
  const xp = played * 20 + wins * 80 + pg.bonus, level = Math.floor(xp / XP_PER_LEVEL) + 1;
  const day = dayKey(), dd = pg.daily.day === day ? pg.daily : { day, done: [] as string[], c: {} as Record<string, number>, seen: [] as string[], all: false };
  const daily = dailyIds(day).map((id) => { const d = DAILY.find((x) => x.id === id)!; return { id, text: d.text, n: d.n, xp: d.xp, have: Math.min(d.n, dd.c[id] || 0), done: dd.done.includes(id) }; });
  const achievements = ACH.map((a) => ({ id: a.id, name: a.name, desc: a.desc, icon: a.icon, xp: a.xp, at: pg.ach[a.id] || 0, prog: a.prog ? a.prog(pg) : null }));
  const ranks: Record<string, any> = {};
  for (const gid of RANKED) { if (!GAMES[gid]) continue; const r = await getRating(u.id, gid); if (r.games) ranks[gid] = { ...r, tier: tierOf(r.rating) }; }
  const endsIn = new Date(day + "T00:00:00Z").getTime() + 86400000 - Date.now();
  return { xp, level, into: xp % XP_PER_LEVEL, need: XP_PER_LEVEL, title: TITLES.find(([l]) => level >= l)![1], wins, played, per, recent, today, goal: 3,
    daily, dailyAll: !!dd.all, dailyBonus: DAILY_ALL_XP, dailyEnds: endsIn, achievements, cosmetics: cosmeticsFor(pg), settings: pg.settings || {}, ranks, streak: pg.streak, best: pg.best, season: season(),
    emotes: ALL_EMOTES.map((x, i) => ({ i, e: x.e, pack: x.pack })).filter((x) => owns(pg, COSMETICS.find((c) => c.kind === "emotes" && c.id === x.pack)!)) };
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
type Game = { id: number; type: string; phase: "lobby" | "playing" | "over"; hostId: string; seats: string[]; state: any; winner: string | null; winners?: string[]; names: Record<string, User>; seq?: number; afkKey?: string; afkSeat?: number; turnDeadline?: number; opts?: any };
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
const TURN_MULT: Record<string, number> = { normal: 1, fast: 0.6, relaxed: 2, off: 0 };
function turnMs(g: Game) { const k = TURN_MULT[g.opts?.turn ?? "normal"] ?? 1; if (g.type === "battleship" && g.state?.phase === "setup") return k ? 60_000 : 0; return Math.round((TURN_SECS[g.type] || AFK_MS / 1000) * 1000 * k); }
// lobby rules the host can set; the first value in each list is the default
const GAME_OPTS: Record<string, Record<string, any[]>> = {
  clash: { stack: [false, true], drawTo: [false, true] }, draw: { rounds: [3, 2, 4], pack: ["classic", "animals", "food", "objects", "hard", "deutsch"] },
  trivia: { count: [10, 15, 20] }, hearts: { target: [100, 50] }, bomb: { lives: [3, 2, 4] }, typing: { len: ["medium", "short", "long"] },
  snake: { time: [90, 60, 120] }, mines: { size: ["medium", "small", "large"] }, gin: { target: [100, 50] }, backgammon: { points: [1, 3, 5] },
};
function optSchema(g: Game) { const o: Record<string, any[]> = { turn: ["normal", "fast", "relaxed", "off"], ...(GAME_OPTS[g.type] || {}) }; if (RANKED.has(g.type) && GAMES[g.type].max === 2) o.ranked = [false, true]; return o; }
function defaultOpts(g: Game) { const o: any = {}; for (const [k, v] of Object.entries(optSchema(g))) o[k] = v[0]; return o; }
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
  if (!g || g.phase !== "playing" || !g.state || (GAMES[g.type] as any).noBots || !turnMs(g)) { if (g) { g.turnDeadline = 0; g.afkSeat = -1; } clearTimeout(afkTimers.get(room.id)); afkTimers.delete(room.id); return; }
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
  room.game = g; room.vis = "call"; g.opts = { ...defaultOpts(g), ranked: RANKED.has(type) };
  while (g.seats.length < mod.min && !mod.noBots) { const bid = "bot:medium:" + ++botSeq; g.seats.push(bid); g.names[bid] = { id: bid, name: "Medium Bot" + (g.seats.length > 2 ? " " + (g.seats.length - 1) : ""), avatar: null, guest: true, bot: true, level: "medium" }; }
  g.state = mod.init(g.seats.length, g.opts); g.phase = "playing"; g.winners = [];
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
// ---------- progression: daily challenges, achievements, cosmetics, ranked play, tournaments ----------
const CAT: Record<string, string> = {};
for (const g of ["clash", "hearts", "spades", "poker", "crazy8", "cheat", "gin"]) CAT[g] = "cards";
for (const g of ["chess", "checkers", "connect4", "reversi", "mancala", "dots", "ttt", "uttt", "battleship", "ludo", "backgammon"]) CAT[g] = "board";
for (const g of ["mafia", "spy", "trivia", "wordhunt", "draw", "spymaster", "bomb", "typing"]) CAT[g] = "party";
for (const g of ["dice", "liars", "pool", "mines", "snake"]) CAT[g] = "arcade";
type Prog = {
  bonus: number; ach: Record<string, number>; eq: Record<string, string>; settings: any;
  daily: { day: string; done: string[]; c: Record<string, number>; seen: string[]; all?: boolean };
  streak: number; best: number; friends: string[]; hosted: number; dailies: number; tourWins: number;
  winCats: string[]; seenGames: string[]; hardWins: number; ranked: number; peak: number; wins: number; played: number;
};
const blankProg = (): Prog => ({ bonus: 0, ach: {}, eq: {}, settings: {}, daily: { day: "", done: [], c: {}, seen: [] }, streak: 0, best: 0, friends: [], hosted: 0, dailies: 0, tourWins: 0, winCats: [], seenGames: [], hardWins: 0, ranked: 0, peak: 0, wins: 0, played: 0 });
const progCache = new Map<string, Prog>();
if (sql) {
  try {
    await sql`CREATE TABLE IF NOT EXISTS prog (user_id text PRIMARY KEY, name text NOT NULL DEFAULT '', data jsonb NOT NULL DEFAULT '{}'::jsonb)`;
    await sql`CREATE TABLE IF NOT EXISTS ratings (user_id text NOT NULL, game text NOT NULL, season text NOT NULL, name text NOT NULL DEFAULT '', rating int NOT NULL, games int NOT NULL DEFAULT 0, wins int NOT NULL DEFAULT 0, PRIMARY KEY (user_id, game, season))`;
    await sql`CREATE TABLE IF NOT EXISTS tournaments (id text PRIMARY KEY, guild text NOT NULL, data jsonb NOT NULL, updated timestamptz NOT NULL DEFAULT now())`;
  } catch (e) { console.error("progression tables failed", e); }
}
async function loadProg(u: User): Promise<Prog> {
  const c = progCache.get(u.id); if (c) return c;
  let p: Prog | null = null;
  try {
    if (sql && !u.guest) {
      const r = await sql`SELECT data FROM prog WHERE user_id = ${u.id}`;
      if (r.length) p = { ...blankProg(), ...r[0].data };
      else { // first visit since progression launched: start from their existing stats
        p = blankProg();
        for (const s of await sql`SELECT game, wins, played FROM stats WHERE user_id = ${u.id}`) { p.wins += s.wins; p.played += s.played; p.seenGames.push(s.game); if (s.wins && CAT[s.game] && !p.winCats.includes(CAT[s.game])) p.winCats.push(CAT[s.game]); }
      }
    }
  } catch (e) { console.error("prog load failed", e); }
  p = p || blankProg();
  progCache.set(u.id, p);
  return p;
}
async function saveProg(u: User, p: Prog) {
  progCache.set(u.id, p);
  try { if (sql && !u.guest) await sql`INSERT INTO prog (user_id, name, data) VALUES (${u.id}, ${u.name}, ${p}) ON CONFLICT (user_id) DO UPDATE SET data = ${p}, name = ${u.name}`; }
  catch (e) { console.error("prog save failed", e); }
}
const dayKey = () => new Date().toISOString().slice(0, 10);
type Ev = { game: string; won: boolean; humans: number; hard: boolean; ranked: boolean; others: string[] };
const DAILY: { id: string; text: string; n: number; xp: number; inc: (e: Ev, p: Prog) => number }[] = [
  { id: "play5", text: "Play 5 games", n: 5, xp: 100, inc: () => 1 },
  { id: "win3", text: "Win 3 games", n: 3, xp: 120, inc: (e) => +e.won },
  { id: "variety", text: "Play 3 different games", n: 3, xp: 100, inc: (e, p) => +!p.daily.seen.includes(e.game) },
  { id: "cards", text: "Win a card game", n: 1, xp: 100, inc: (e) => +(e.won && CAT[e.game] === "cards") },
  { id: "board", text: "Win a board game", n: 1, xp: 100, inc: (e) => +(e.won && CAT[e.game] === "board") },
  { id: "party", text: "Play 2 party games", n: 2, xp: 100, inc: (e) => +(CAT[e.game] === "party") },
  { id: "friends", text: "Play 2 games with friends", n: 2, xp: 120, inc: (e) => +(e.humans >= 2) },
  { id: "hard", text: "Beat a Hard bot", n: 1, xp: 150, inc: (e) => +(e.won && e.hard) },
  { id: "arcade", text: "Win a dice or arcade game", n: 1, xp: 100, inc: (e) => +(e.won && CAT[e.game] === "arcade") },
  { id: "ranked", text: "Play a ranked match", n: 1, xp: 150, inc: (e) => +e.ranked },
];
const DAILY_ALL_XP = 150;
function dailyIds(day: string) {
  let h = 0; for (const ch of day) h = (h * 131 + ch.charCodeAt(0)) >>> 0;
  const ids = DAILY.map((d) => d.id), out = ["play5"];
  while (out.length < 3) { h = (h * 1103515245 + 12345) >>> 0; const id = ids[h % ids.length]; if (!out.includes(id) && !(id === "hard" && out.includes("ranked")) && !(id === "ranked" && out.includes("hard"))) out.push(id); }
  return out;
}
const ACH: { id: string; name: string; desc: string; icon: string; xp: number; ok: (p: Prog, lvl: number) => boolean; prog?: (p: Prog) => [number, number] }[] = [
  { id: "first_win", name: "First Victory", desc: "Win your first game", icon: "🥇", xp: 50, ok: (p) => p.wins >= 1, prog: (p) => [p.wins, 1] },
  { id: "wins_10", name: "Winner", desc: "Win 10 games", icon: "🏅", xp: 100, ok: (p) => p.wins >= 10, prog: (p) => [p.wins, 10] },
  { id: "wins_50", name: "Veteran", desc: "Win 50 games", icon: "🎖️", xp: 250, ok: (p) => p.wins >= 50, prog: (p) => [p.wins, 50] },
  { id: "wins_100", name: "Legend", desc: "Win 100 games", icon: "👑", xp: 500, ok: (p) => p.wins >= 100, prog: (p) => [p.wins, 100] },
  { id: "played_25", name: "Regular", desc: "Play 25 games", icon: "🎮", xp: 100, ok: (p) => p.played >= 25, prog: (p) => [p.played, 25] },
  { id: "variety_10", name: "Explorer", desc: "Play 10 different games", icon: "🧭", xp: 150, ok: (p) => p.seenGames.length >= 10, prog: (p) => [p.seenGames.length, 10] },
  { id: "variety_all", name: "Completionist", desc: "Play every game at least once", icon: "📚", xp: 400, ok: (p) => p.seenGames.length >= Object.keys(GAMES).length, prog: (p) => [p.seenGames.length, Object.keys(GAMES).length] },
  { id: "allround", name: "All-Rounder", desc: "Win a card, board, party and arcade game", icon: "🌈", xp: 200, ok: (p) => p.winCats.length >= 4, prog: (p) => [p.winCats.length, 4] },
  { id: "hard_1", name: "Bot Slayer", desc: "Beat a Hard bot", icon: "🤖", xp: 100, ok: (p) => p.hardWins >= 1, prog: (p) => [p.hardWins, 1] },
  { id: "hard_10", name: "Machine Breaker", desc: "Beat Hard bots 10 times", icon: "⚙️", xp: 250, ok: (p) => p.hardWins >= 10, prog: (p) => [p.hardWins, 10] },
  { id: "streak_3", name: "Hot Streak", desc: "Win 3 games in a row", icon: "🔥", xp: 100, ok: (p) => p.best >= 3, prog: (p) => [p.best, 3] },
  { id: "streak_5", name: "Unstoppable", desc: "Win 5 games in a row", icon: "☄️", xp: 250, ok: (p) => p.best >= 5, prog: (p) => [p.best, 5] },
  { id: "friends_5", name: "Social Butterfly", desc: "Play with 5 different people", icon: "🦋", xp: 150, ok: (p) => p.friends.length >= 5, prog: (p) => [p.friends.length, 5] },
  { id: "host_10", name: "Host with the Most", desc: "Open 10 tables", icon: "🎪", xp: 100, ok: (p) => p.hosted >= 10, prog: (p) => [p.hosted, 10] },
  { id: "daily_1", name: "Daily Grind", desc: "Finish all 3 daily challenges", icon: "📅", xp: 100, ok: (p) => p.dailies >= 1, prog: (p) => [p.dailies, 1] },
  { id: "daily_7", name: "Dedicated", desc: "Finish the daily challenges on 7 days", icon: "🗓️", xp: 300, ok: (p) => p.dailies >= 7, prog: (p) => [p.dailies, 7] },
  { id: "ranked_1", name: "Contender", desc: "Play a ranked match", icon: "⚔️", xp: 50, ok: (p) => p.ranked >= 1, prog: (p) => [p.ranked, 1] },
  { id: "gold", name: "Gold Rank", desc: "Reach 1400 rating in any ranked game", icon: "🥇", xp: 300, ok: (p) => p.peak >= 1400, prog: (p) => [Math.max(p.peak, 1000), 1400] },
  { id: "diamond", name: "Diamond Rank", desc: "Reach 1550 rating in any ranked game", icon: "💎", xp: 400, ok: (p) => p.peak >= 1550, prog: (p) => [Math.max(p.peak, 1000), 1550] },
  { id: "tour_win", name: "Champion", desc: "Win a tournament", icon: "🏆", xp: 500, ok: (p) => p.tourWins >= 1, prog: (p) => [p.tourWins, 1] },
  { id: "level_10", name: "Double Digits", desc: "Reach level 10", icon: "⭐", xp: 200, ok: (_p, l) => l >= 10 },
];
// cosmetics: kind, id, name, how it unlocks (level n or an achievement)
const COSMETICS: { kind: string; id: string; name: string; level?: number; ach?: string }[] = [
  { kind: "back", id: "classic", name: "Classic", level: 1 }, { kind: "back", id: "ocean", name: "Ocean", level: 2 }, { kind: "back", id: "ember", name: "Ember", level: 4 },
  { kind: "back", id: "galaxy", name: "Galaxy", level: 6 }, { kind: "back", id: "neon", name: "Neon Grid", level: 8 }, { kind: "back", id: "gold", name: "Gold Leaf", ach: "wins_50" }, { kind: "back", id: "royal", name: "Royal", ach: "tour_win" },
  { kind: "board", id: "walnut", name: "Walnut", level: 1 }, { kind: "board", id: "marble", name: "Marble", level: 3 }, { kind: "board", id: "ocean", name: "Deep Sea", level: 5 },
  { kind: "board", id: "neon", name: "Neon", level: 7 }, { kind: "board", id: "candy", name: "Candy", ach: "variety_10" }, { kind: "board", id: "obsidian", name: "Obsidian", ach: "gold" },
  { kind: "frame", id: "none", name: "No frame", level: 1 }, { kind: "frame", id: "silver", name: "Silver", level: 2 }, { kind: "frame", id: "gold", name: "Gold", level: 5 },
  { kind: "frame", id: "neon", name: "Neon", level: 7 }, { kind: "frame", id: "rainbow", name: "Rainbow", level: 10 }, { kind: "frame", id: "flame", name: "Flame", ach: "streak_5" },
  { kind: "frame", id: "diamond", name: "Diamond", ach: "diamond" }, { kind: "frame", id: "crown", name: "Crown", ach: "tour_win" },
  { kind: "emotes", id: "base", name: "Basics", level: 1 }, { kind: "emotes", id: "party", name: "Party Pack", level: 3 }, { kind: "emotes", id: "spicy", name: "Spicy Pack", level: 6 }, { kind: "emotes", id: "gg", name: "Champion Pack", ach: "wins_10" },
];
const EMOTE_PACKS: Record<string, string[]> = { base: EMOTES, party: ["🥳", "🎊", "🕺", "💃", "🍕", "🎵"], spicy: ["🌶️", "💀", "😤", "🫡", "🤯", "🫠"], gg: ["🏆", "👑", "💎", "⚡", "🎯", "🐐"] };
const ALL_EMOTES: { e: string; pack: string }[] = Object.entries(EMOTE_PACKS).flatMap(([pack, list]) => list.map((e) => ({ e, pack })));
const levelOf = (p: Prog) => Math.floor((p.played * 20 + p.wins * 80 + p.bonus) / XP_PER_LEVEL) + 1;
const owns = (p: Prog, c: { level?: number; ach?: string }) => (c.level ? levelOf(p) >= c.level : !!p.ach[c.ach!]);
function checkAch(p: Prog, notes: any[]) {
  for (let pass = 0; pass < 3; pass++) { // XP from one achievement can level you into another
    let any = false;
    for (const a of ACH) if (!p.ach[a.id] && a.ok(p, levelOf(p))) { p.ach[a.id] = Date.now(); p.bonus += a.xp; notes.push({ kind: "ach", icon: a.icon, title: a.name, sub: a.desc + " · +" + a.xp + " XP" }); any = true; }
    if (!any) break;
  }
}
// called for every human player when a game ends
async function award(u: User, e: Ev) {
  const p = await loadProg(u), notes: any[] = [], lvl0 = levelOf(p), had = new Set(COSMETICS.filter((c) => owns(p, c)).map((c) => c.kind + ":" + c.id));
  p.played++; if (e.won) { p.wins++; p.streak++; p.best = Math.max(p.best, p.streak); } else p.streak = 0;
  if (!p.seenGames.includes(e.game)) p.seenGames.push(e.game);
  if (e.won && CAT[e.game] && !p.winCats.includes(CAT[e.game])) p.winCats.push(CAT[e.game]);
  if (e.won && e.hard) p.hardWins++;
  if (e.ranked) p.ranked++;
  for (const o of e.others) if (!p.friends.includes(o) && p.friends.length < 60) p.friends.push(o);
  const day = dayKey();
  if (p.daily.day !== day) p.daily = { day, done: [], c: {}, seen: [] };
  for (const id of dailyIds(day)) {
    const d = DAILY.find((x) => x.id === id)!;
    if (p.daily.done.includes(id)) continue;
    p.daily.c[id] = (p.daily.c[id] || 0) + d.inc(e, p);
    if (p.daily.c[id] >= d.n) { p.daily.done.push(id); p.bonus += d.xp; notes.push({ kind: "daily", icon: "✅", title: "Daily challenge done", sub: d.text + " · +" + d.xp + " XP" }); }
  }
  if (!p.daily.seen.includes(e.game)) p.daily.seen.push(e.game);
  if (!p.daily.all && p.daily.done.length >= 3) { p.daily.all = true; p.bonus += DAILY_ALL_XP; p.dailies++; notes.push({ kind: "daily", icon: "🎁", title: "All daily challenges done!", sub: "Bonus +" + DAILY_ALL_XP + " XP" }); }
  checkAch(p, notes);
  const lvl1 = levelOf(p);
  if (lvl1 > lvl0) notes.push({ kind: "level", icon: "⭐", title: "Level " + lvl1 + "!", sub: "You levelled up" });
  for (const c of COSMETICS) if (owns(p, c) && !had.has(c.kind + ":" + c.id)) notes.push({ kind: "unlock", icon: "🎁", title: "New " + ({ back: "card back", board: "board theme", frame: "profile frame", emotes: "emote pack" } as any)[c.kind] + " unlocked", sub: c.name + " · equip it in your Locker" });
  await saveProg(u, p);
  return notes;
}
function cosmeticsFor(p: Prog) {
  const eq = { back: "classic", board: "walnut", frame: "none", ...p.eq };
  return { eq, items: COSMETICS.map((c) => ({ ...c, owned: owns(p, c) })) };
}

// ----- ranked play (Elo, monthly seasons) -----
const RANKED = new Set(["chess", "checkers", "connect4", "reversi", "battleship", "uttt", "mancala", "backgammon", "dots"]);
const season = () => new Date().toISOString().slice(0, 7);
const memRatings = new Map<string, { rating: number; games: number; wins: number; name: string }>();
const TIERS: [number, string][] = [[1550, "Diamond"], [1400, "Platinum"], [1250, "Gold"], [1100, "Silver"], [0, "Bronze"]];
const tierOf = (r: number) => TIERS.find(([n]) => r >= n)![1];
async function getRating(uid: string, game: string) {
  const k = uid + "|" + game + "|" + season();
  if (memRatings.has(k)) return memRatings.get(k)!;
  let v = { rating: 1000, games: 0, wins: 0, name: "" };
  try { if (sql) { const r = await sql`SELECT rating, games, wins, name FROM ratings WHERE user_id = ${uid} AND game = ${game} AND season = ${season()}`; if (r.length) v = { rating: r[0].rating, games: r[0].games, wins: r[0].wins, name: r[0].name }; } } catch (e) { console.error("rating load", e); }
  memRatings.set(k, v); return v;
}
async function setRating(u: User, game: string, v: { rating: number; games: number; wins: number }) {
  memRatings.set(u.id + "|" + game + "|" + season(), { ...v, name: u.name });
  try { if (sql && !u.guest) await sql`INSERT INTO ratings (user_id, game, season, name, rating, games, wins) VALUES (${u.id}, ${game}, ${season()}, ${u.name}, ${v.rating}, ${v.games}, ${v.wins}) ON CONFLICT (user_id, game, season) DO UPDATE SET rating = ${v.rating}, games = ${v.games}, wins = ${v.wins}, name = ${u.name}`; } catch (e) { console.error("rating save", e); }
}
const isRankedGame = (g: Game) => !!(g.opts && g.opts.ranked) && RANKED.has(g.type) && g.seats.length === 2 && g.seats.every((id) => !isBot(id) && !g.names[id].guest);
async function rankedResult(room: Room, g: Game, winner: string | null) {
  if (!isRankedGame(g)) return;
  const [a, b] = g.seats.map((id) => g.names[id]);
  const ra = await getRating(a.id, g.type), rb = await getRating(b.id, g.type);
  const sa = winner === a.id ? 1 : winner === b.id ? 0 : 0.5, ea = 1 / (1 + Math.pow(10, (rb.rating - ra.rating) / 400));
  const ka = ra.games < 10 ? 40 : 24, kb = rb.games < 10 ? 40 : 24;
  const na = Math.round(ra.rating + ka * (sa - ea)), nb = Math.round(rb.rating + kb * ((1 - sa) - (1 - ea)));
  await setRating(a, g.type, { rating: na, games: ra.games + 1, wins: ra.wins + (sa === 1 ? 1 : 0) });
  await setRating(b, g.type, { rating: nb, games: rb.games + 1, wins: rb.wins + (sa === 0 ? 1 : 0) });
  for (const [u, o, n] of [[a, ra.rating, na], [b, rb.rating, nb]] as [User, number, number][]) {
    const p = await loadProg(u); if (n > p.peak) { p.peak = n; const notes: any[] = []; checkAch(p, notes); await saveProg(u, p); for (const x of notes) sendTo(room, u.id, { t: "note", ...x }); }
    sendTo(room, u.id, { t: "rank", game: g.type, name: GAMES[g.type].name, old: o, now: n, tier: tierOf(n) });
  }
}
async function ladder(game: string, me: User) {
  let rows: any[] = [];
  try {
    if (sql) rows = [...(await sql`SELECT user_id, name, rating, games, wins FROM ratings WHERE game = ${game} AND season = ${season()} ORDER BY rating DESC LIMIT 25`)];
    else rows = [...memRatings].filter(([k]) => k.endsWith("|" + game + "|" + season())).map(([k, v]) => ({ user_id: k.split("|")[0], ...v })).filter((r) => r.games > 0).sort((x, y) => y.rating - x.rating).slice(0, 25);
  } catch (e) { console.error("ladder", e); }
  const mine = await getRating(me.id, game);
  return { t: "ladder", game, season: season(), rows: rows.map((r) => ({ id: r.user_id, name: r.name, rating: r.rating, games: r.games, wins: r.wins, tier: tierOf(r.rating) })), me: { ...mine, tier: tierOf(mine.rating) } };
}

// ----- tournaments (one list per Discord server) -----
type TMatch = { a: string | null; b: string | null; w: string | null; dl: number };
type Tour = { id: string; guild: string; game: string; name: string; size: number; host: string; hostName: string; players: { id: string; name: string; avatar: string | null }[]; status: "open" | "running" | "done"; rounds: TMatch[][]; champion: string | null; created: number };
const tours = new Map<string, Tour>();
const TOUR_GAMES = ["chess", "checkers", "connect4", "reversi", "battleship", "uttt", "mancala", "dots", "ttt", "backgammon", "gin", "pool"];
const MATCH_MS = 6 * 60_000;
if (sql) {
  try { for (const r of await sql`SELECT data FROM tournaments WHERE updated > now() - interval '14 days'`) tours.set(r.data.id, r.data); console.log("tournaments loaded", tours.size); } catch (e) { console.error("tournament load", e); }
}
async function saveTour(t: Tour) { try { if (sql) await sql`INSERT INTO tournaments (id, guild, data) VALUES (${t.id}, ${t.guild}, ${t}) ON CONFLICT (id) DO UPDATE SET data = ${t}, updated = now()`; } catch (e) { console.error("tournament save", e); } }
const guildKey = (u: User, room: Room) => userGuild.get(u.id) || room.guild || "call:" + hubOf(room.id);
function guildRooms(key: string) { return [...rooms.values()].filter((r) => (r.guild || "call:" + hubOf(r.id)) === key || [...r.members.keys()].some((id) => userGuild.get(id) === key)); }
function tourNotify(t: Tour, msg: any, only?: string[]) {
  if (only) { for (const id of only) { const r = roomOf(id); if (r) sendTo(r, id, msg); } return; }
  for (const r of guildRooms(t.guild)) for (const m of r.members.values()) sendTo(r, m.user.id, msg);
}
const tourSummary = (t: Tour) => ({ ...t, gameName: GAMES[t.game]?.name || t.game });
function tourList(key: string) { return [...tours.values()].filter((t) => t.guild === key).sort((a, b) => b.created - a.created).slice(0, 20).map(tourSummary); }
function tourRefresh(t: Tour) { saveTour(t); for (const r of guildRooms(t.guild)) for (const m of r.members.values()) sendTo(r, m.user.id, { t: "tours", list: tourList(t.guild) }); }
const matchRoomId = (t: Tour, ri: number, mi: number) => "mm:t" + t.id + "r" + ri + "m" + mi;
function tourAdvance(t: Tour) {
  for (;;) {
    const ri = t.rounds.length - 1, round = t.rounds[ri];
    for (const m of round) if (!m.w && (!m.a || !m.b) && (m.a || m.b)) m.w = (m.a || m.b)!; // byes
    if (!round.every((m) => m.w || (!m.a && !m.b))) break;
    const ws = round.map((m) => m.w);
    if (ws.filter(Boolean).length <= 1) {
      t.status = "done"; t.champion = ws.find(Boolean) || null;
      if (t.champion) { const pl = t.players.find((p) => p.id === t.champion)!; tourNotify(t, { t: "note", kind: "tour", icon: "🏆", title: pl.name + " won " + t.name, sub: GAMES[t.game].name + " tournament" });
        const u: User = { id: pl.id, name: pl.name, avatar: pl.avatar }; loadProg(u).then(async (p) => { p.tourWins++; const notes: any[] = []; checkAch(p, notes); await saveProg(u, p); const r = roomOf(u.id); if (r) for (const x of notes) sendTo(r, u.id, { t: "note", ...x }); }); }
      break;
    }
    const next: TMatch[] = []; const dl = Date.now() + MATCH_MS;
    for (let i = 0; i < ws.length; i += 2) next.push({ a: ws[i], b: ws[i + 1] ?? null, w: null, dl });
    t.rounds.push(next);
    notifyMatches(t);
  }
  tourRefresh(t);
}
function notifyMatches(t: Tour) {
  const ri = t.rounds.length - 1;
  t.rounds[ri].forEach((m, mi) => { if (m.a && m.b && !m.w) { const pa = t.players.find((p) => p.id === m.a)!, pb = t.players.find((p) => p.id === m.b)!;
    tourNotify(t, { t: "tmatch", id: t.id, name: t.name, opp: pb.name, round: ri + 1 }, [m.a]); tourNotify(t, { t: "tmatch", id: t.id, name: t.name, opp: pa.name, round: ri + 1 }, [m.b]); } });
}
function myMatch(t: Tour, uid: string) {
  const ri = t.rounds.length - 1; if (ri < 0) return null;
  const mi = t.rounds[ri].findIndex((m) => !m.w && (m.a === uid || m.b === uid));
  return mi < 0 ? null : { ri, mi, m: t.rounds[ri][mi] };
}
function tourPlay(t: Tour, user: User, from: Room) {
  const mm = myMatch(t, user.id); if (!mm || !mm.m.a || !mm.m.b) return "You have no match to play right now";
  const id = matchRoomId(t, mm.ri, mm.mi);
  const room = getRoom(id);
  if (!room.game) {
    const names: Record<string, User> = {};
    for (const pid of [mm.m.a, mm.m.b]) { const p = t.players.find((x) => x.id === pid)!; names[pid] = { id: pid, name: p.name, avatar: p.avatar }; }
    room.game = { id: ++gameSeq, type: t.game, phase: "lobby", hostId: mm.m.a, seats: [mm.m.a, mm.m.b], state: null, winner: null, names, opts: { ranked: true, tour: t.id } };
  }
  if (from.id !== id) { const mine = from.game; if (mine && mine.phase === "playing" && mine.seats.includes(user.id)) return "Finish your current game first"; leaveQueues(user.id); if (!homeRoom.has(user.id)) homeRoom.set(user.id, hubOf(from.id)); if (isTable(from.id)) leaveTable(from, user, false); moveUser(user, from.id, id); }
  room.game.names[user.id] = { ...room.game.names[user.id], ...user };
  const g = room.game;
  if (g.phase === "lobby" && g.seats.every((s) => room.members.has(s))) { g.state = GAMES[g.type].init(2, g.opts || {}); g.phase = "playing"; g.winners = []; scheduleBots(room); scheduleTick(room); scheduleAfk(room); }
  broadcast(room); return null;
}
async function tourResult(room: Room, winner: string | null) {
  const m = room.id.match(/^mm:t(.+)r(\d+)m(\d+)$/); if (!m) return;
  const t = tours.get(m[1]); if (!t || t.status !== "running") return;
  const match = t.rounds[+m[2]]?.[+m[3]]; if (!match || match.w) return;
  if (!winner) { // a draw: play again
    setTimeout(() => { const g = room.game; if (g && g.phase === "over") { g.state = GAMES[g.type].init(2, g.opts || {}); g.phase = "playing"; g.winner = null; g.winners = []; for (const mm of room.members.values()) sendTo(room, mm.user.id, { t: "err", msg: "It's a draw, so the match is replayed" }); broadcast(room); scheduleBots(room); scheduleAfk(room); } }, 2500);
    return;
  }
  match.w = winner; tourAdvance(t);
}
setInterval(() => { // forfeits: a player who doesn't show up for their match in time loses it
  for (const t of tours.values()) {
    if (t.status !== "running") continue;
    const ri = t.rounds.length - 1; let changed = false;
    t.rounds[ri].forEach((m, mi) => {
      if (m.w || !m.a || !m.b || Date.now() < m.dl) return;
      const room = rooms.get(matchRoomId(t, ri, mi));
      if (room && room.game && room.game.phase === "playing") { m.dl = Date.now() + 60_000; return; }
      const inA = !!room && room.members.has(m.a), inB = !!room && room.members.has(m.b);
      m.w = inA && !inB ? m.a : inB && !inA ? m.b : Math.random() < 0.5 ? m.a : m.b; changed = true;
      if (room) { for (const mm of room.members.values()) sendTo(room, mm.user.id, { t: "err", msg: "Your opponent didn't show up, so you advance" }); room.game = null; broadcast(room); }
    });
    if (changed) tourAdvance(t);
  }
}, 15_000);
function tourAction(room: Room, user: User, m: any): boolean {
  const key = guildKey(user, room), t = m.id ? tours.get(String(m.id)) : undefined;
  const reply = (msg: any) => sendTo(room, user.id, msg), err = (msg: string) => reply({ t: "err", msg });
  switch (m.t) {
    case "tlist": reply({ t: "tours", list: tourList(key) }); return true;
    case "tcreate": {
      if (!TOUR_GAMES.includes(m.game) || !GAMES[m.game]) { err("Pick a 1-on-1 game"); return true; }
      if ([...tours.values()].some((x) => x.host === user.id && x.status !== "done")) { err("You already have a tournament running"); return true; }
      const size = [4, 8, 16].includes(+m.size) ? +m.size : 8;
      const name = String(m.name || "").trim().slice(0, 40) || GAMES[m.game].name + " Cup";
      const nt: Tour = { id: Math.random().toString(36).slice(2, 9), guild: key, game: m.game, name, size, host: user.id, hostName: user.name, players: [{ id: user.id, name: user.name, avatar: user.avatar }], status: "open", rounds: [], champion: null, created: Date.now() };
      tours.set(nt.id, nt);
      tourNotify(nt, { t: "note", kind: "tour", icon: "🏆", title: user.name + " started " + name, sub: GAMES[m.game].name + " tournament, " + size + " players · join in Compete" });
      tourRefresh(nt); return true;
    }
    case "tjoin": if (!t || t.guild !== key) { err("That tournament is gone"); return true; }
      if (t.status !== "open") { err("Sign-ups are closed"); return true; }
      if (t.players.length >= t.size) { err("The tournament is full"); return true; }
      if (!t.players.some((p) => p.id === user.id)) t.players.push({ id: user.id, name: user.name, avatar: user.avatar });
      tourRefresh(t); return true;
    case "tleave": if (!t || t.status !== "open") return true;
      t.players = t.players.filter((p) => p.id !== user.id);
      if (!t.players.length || t.host === user.id) { tours.delete(t.id); try { if (sql) sql`DELETE FROM tournaments WHERE id = ${t.id}`.catch(() => {}); } catch {} for (const r of guildRooms(key)) for (const mm of r.members.values()) sendTo(r, mm.user.id, { t: "tours", list: tourList(key) }); return true; }
      tourRefresh(t); return true;
    case "tstart": {
      if (!t || t.host !== user.id || t.status !== "open") return true;
      if (t.players.length < 2) { err("Need at least 2 players"); return true; }
      const ps = t.players.map((p) => p.id).sort(() => Math.random() - 0.5);
      let n = 2; while (n < ps.length) n *= 2;
      const slots: (string | null)[] = [...ps, ...Array(n - ps.length).fill(null)];
      // spread byes so no one plays a bye against a bye
      const pairs: TMatch[] = [], dl = Date.now() + MATCH_MS, half = n / 2;
      for (let i = 0; i < half; i++) pairs.push({ a: slots[i], b: slots[n - 1 - i], w: null, dl });
      t.rounds = [pairs]; t.status = "running";
      notifyMatches(t); tourAdvance(t); return true;
    }
    case "tplay": { if (!t) { err("That tournament is gone"); return true; } const e = tourPlay(t, user, room); if (e) err(e); return true; }
  }
  return false;
}

// Online actions; returns true when handled.
function online(room: Room, user: User, m: any): boolean {
  switch (m.t) {
    case "meta":
      if (typeof m.guild === "string" && /^\d{5,25}$/.test(m.guild)) { userGuild.set(user.id, m.guild); if (!room.id.startsWith("mm:") && !homeRoom.has(user.id)) room.guild = room.guild || m.guild; }
      return true;
    case "emote": {
      const i = Number(m.e), now = Date.now(), em = ALL_EMOTES[i];
      if (!em || now - (lastEmote.get(user.id) || 0) < 800) return true;
      if (em.pack !== "base") { const p = progCache.get(user.id), c = COSMETICS.find((x) => x.kind === "emotes" && x.id === em.pack)!; if (!p || !owns(p, c)) return true; }
      lastEmote.set(user.id, now);
      for (const mm of room.members.values()) sendTo(room, mm.user.id, { t: "emote", from: user.id, name: user.name, e: em.e });
      return true;
    }
    case "equip": {
      loadProg(user).then(async (p) => {
        const c = COSMETICS.find((x) => x.kind === m.kind && x.id === m.id);
        if (!c || !owns(p, c)) return sendTo(room, user.id, { t: "err", msg: "That's still locked" });
        p.eq = { ...p.eq, [c.kind]: c.id }; await saveProg(user, p);
        if (c.kind === "frame") { user.frame = c.id; for (const r of rooms.values()) { const mm = r.members.get(user.id); if (mm) mm.user.frame = c.id; if (r.game && r.game.names[user.id]) r.game.names[user.id].frame = c.id; } broadcast(room); }
        sendTo(room, user.id, { t: "me", profile: await profile(user) });
      });
      return true;
    }
    case "settings": loadProg(user).then((p) => { const s = m.s || {}; p.settings = { sound: !!s.sound, music: !!s.music, motion: !!s.motion, cb: !!s.cb, lang: ["auto", "en", "de"].includes(s.lang) ? s.lang : "auto" }; saveProg(user, p); }); return true;
    case "ladder": if (RANKED.has(m.game) && GAMES[m.game]) ladder(m.game, user).then((x) => sendTo(room, user.id, x)); return true;
    case "tlist": case "tcreate": case "tjoin": case "tleave": case "tstart": case "tplay": return tourAction(room, user, m);
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
      opts: { ...defaultOpts(g), ...(g.opts || {}) }, optSchema: optSchema(g), ranked: isRankedGame(g), tour: g.opts?.tour || null, turnDeadline: g.phase === "playing" ? g.turnDeadline || 0 : 0, turnTotal: g.phase === "playing" && g.turnDeadline ? turnMs(g) : 0, afkSeat: g.phase === "playing" ? (g.afkSeat ?? -1) : -1, now: Date.now(), yourTurn: yourTurn(g, seat) };
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
  try {
    const humans = players.filter((p) => !p.bot), hard = g.seats.some((id) => id.startsWith("bot:hard")), ranked = isRankedGame(g);
    for (const p of humans) {
      const won = g.winners && g.winners.length ? g.winners.includes(p.id) : p.id === winner;
      const notes = await award(p, { game: g.type, won, humans: humans.length, hard, ranked, others: humans.filter((x) => x.id !== p.id && !x.guest).map((x) => x.id) });
      for (const x of notes) sendTo(room, p.id, { t: "note", ...x });
    }
    await rankedResult(room, g, winner);
    if (room.id.startsWith("mm:t")) await tourResult(room, winner);
  } catch (e) { console.error("progression failed", e); }
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
        t.game.opts = defaultOpts(t.game);
        if (!user.guest) loadProg(user).then(async (p) => { p.hosted++; const notes: any[] = []; checkAch(p, notes); await saveProg(user, p); for (const x of notes) sendTo(t, user.id, { t: "note", ...x }); });
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
      g.state = mod.init(g.seats.length, { ...defaultOpts(g), ...(g.opts || {}) }); g.phase = "playing"; g.winner = null; g.winners = []; return;
    }
    case "opts": {
      if (!g || g.phase !== "lobby") return;
      if (g.hostId !== user.id) return "Only the host can change the rules";
      const sch = optSchema(g), o = { ...defaultOpts(g), ...(g.opts || {}) };
      for (const [k, v] of Object.entries(m.o || {})) if (sch[k] && sch[k].some((x) => x === v)) o[k] = v;
      g.opts = o; return;
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
      if (!user.guest) { try { const p = await loadProg(user); user.frame = p.eq.frame || "none"; } catch {} }
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
      // Draw & Guess pen strokes: apply and relay just the new stroke, instead of re-sending the whole game to everyone
      if (msg.t === "move" && msg.action === "stroke" && room.game && room.game.type === "draw" && room.game.phase === "playing") {
        const g = room.game, seat = g.seats.indexOf(user.id), st = g.state, n = st.strokes.length;
        if (seat < 0) return;
        const res = GAMES.draw.move(st, seat, msg);
        if (res.err) { ws.send(JSON.stringify({ t: "err", msg: res.err })); return; }
        if (st.strokes.length > n) { const ink = JSON.stringify({ t: "ink", gid: g.id, n: st.strokes.length, s: st.strokes[st.strokes.length - 1] }); for (const m of room.members.values()) if (m.user.id !== user.id) for (const s2 of m.sockets) s2.send(ink); }
        return;
      }
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

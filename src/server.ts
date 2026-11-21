// Game Night — a Plato-style Discord Activity hub. Runs as a single Railway Function (Bun).
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
type Room = { id: string; members: Map<string, { user: User; sockets: Set<any> }>; game: Game | null };
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
  g.afkKey = key; g.afkSeat = t; g.turnDeadline = Date.now() + AFK_MS;
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
    for (const m of room.members.values()) sendTo(room, m.user.id, { t: "err", msg: g2.names[g2.seats[t]].name + " ran out of time — a move was made for them" });
    if (res.done) { endGame(room, res); return; }
    broadcast(room); scheduleBots(room); scheduleTick(room); scheduleAfk(room);
  }, AFK_MS));
}
function getRoom(id: string): Room { let r = rooms.get(id); if (!r) { r = { id, members: new Map(), game: null }; rooms.set(id, r); } return r; }

function status(room: Room, uid: string) {
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
      turnDeadline: g.phase === "playing" ? g.turnDeadline || 0 : 0, afkSeat: g.phase === "playing" ? (g.afkSeat ?? -1) : -1, now: Date.now() };
  }
  return { t: "state", you: uid, members: [...room.members.values()].map((m) => ({ ...m.user, status: status(room, m.user.id) })), game };
}
const sendTo = (room: Room, uid: string, msg: any) => { const m = room.members.get(uid); if (m) for (const ws of m.sockets) ws.send(JSON.stringify(msg)); };
function broadcast(room: Room) { for (const m of room.members.values()) for (const ws of m.sockets) ws.send(JSON.stringify(view(room, m.user.id))); }

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
      if (g && g.phase !== "over") return g.phase === "lobby" ? "A lobby is already open" : "A game is already running";
      if (!GAMES[m.game]) return "Unknown game";
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
const html = (a: typeof A) => `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Game Night</title><style>${a.css}</style></head><body><div id="app"><div class="splash"><div class="logo">🎲</div><p id="status">Loading…</p></div></div><script type="module" src="/client.js?v=${a.ver}"></script></body></html>`;
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
      const { user, room: rid } = ws.data; const room = getRoom(rid);
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
      const err = handle(room, user, msg);
      if (err === "__done") return;
      if (err) ws.send(JSON.stringify({ t: "err", msg: err }));
      scheduleBots(room); scheduleTick(room); scheduleAfk(room);
      broadcast(room);
    },
    close(ws: any) {
      const { user, room: rid } = ws.data; const room = rooms.get(rid); if (!room) return;
      const m = room.members.get(user.id); if (!m) return;
      m.sockets.delete(ws);
      if (m.sockets.size) return;
      room.members.delete(user.id);
      const g = room.game;
      if (g && g.phase === "lobby") handle(room, user, { t: "stand" });
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
console.log("Game Night listening on", server.port);

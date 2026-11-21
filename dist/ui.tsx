// Game Night UI service — serves the browser code and styles that the game server stitches into the Activity page.
const JS: string = String.raw`// Game Night client (vanilla JS, no build step)
var params = new URLSearchParams(location.search);
var inDiscord = params.has("frame_id");
var app = document.getElementById("app");
var sdk = null;
var S = { you: null, members: [], game: null, lb: [], me: null, view: "home", sel: -1, dismissed: 0, watching: 0, pendingEight: null };
var ws = null, wsUrl = "", retry = 0;

var COLORS = ["#ff4d8d", "#4dd4ff", "#ffd84d", "#6dff9a", "#c084fc", "#ff9f43"];
var SUIT = { S: "♠", H: "♥", D: "♦", C: "♣" };
var GAMES = [
  { id: "chess", name: "Chess", cat: "Strategy", players: "2 players", tag: "Popular", icon: "♛" },
  { id: "crazy8", name: "Crazy 8s", cat: "Cards", players: "2–6 players", tag: "Popular", icon: "🃏" },
  { id: "battleship", name: "Sea Battle", cat: "Strategy", players: "2 players", tag: "New", icon: "🚢" },
  { id: "dots", name: "Dots & Boxes", cat: "Party", players: "2–4 players", tag: "New", icon: "✏️" },
  { id: "connect4", name: "Connect 4", cat: "Classic", players: "2 players", icon: "🔴" },
  { id: "dice", name: "Lucky Dice", cat: "Dice", players: "2–6 players", tag: "New", icon: "🎲" },
  { id: "reversi", name: "Reversi", cat: "Strategy", players: "2 players", tag: "New", icon: "⚫" },
  { id: "checkers", name: "Checkers", cat: "Classic", players: "2 players", tag: "New", icon: "🏁" },
  { id: "uttt", name: "Ultimate Tic-Tac-Toe", cat: "Strategy", players: "2 players", tag: "New", icon: "#️⃣" },
  { id: "ttt", name: "Tic-Tac-Toe", cat: "Classic", players: "2 players", icon: "❌" },
  { id: "mancala", name: "Mancala", cat: "Strategy", players: "2 players", tag: "New", icon: "💎" },
  { id: "pool", name: "8-Ball Pool", cat: "Arcade", players: "Coming soon", soon: true, icon: "🎱" },
  { id: "mafia", name: "Mafia", cat: "Party", players: "Coming soon", soon: true, icon: "🕵️" },
  { id: "wordhunt", name: "Word Hunt", cat: "Word", players: "Coming soon", soon: true, icon: "🔤" }
];
function meta(id) { for (var i = 0; i < GAMES.length; i++) if (GAMES[i].id === id) return GAMES[i]; return { id: id, name: id, icon: "🎲" }; }

var ICON = {
  home: '<svg viewBox="0 0 24 24"><path d="M3 11 12 3l9 8v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/></svg>',
  games: '<svg viewBox="0 0 24 24"><path d="M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zm2.5 3a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zm9 0a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zM12 10.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zM7.5 15a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zm9 0a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z"/></svg>',
  leaders: '<svg viewBox="0 0 24 24"><path d="M4 21V11h4v10zm6 0V4h4v17zm6 0v-7h4v7z"/></svg>',
  profile: '<svg viewBox="0 0 24 24"><path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10zm0 2c-5 0-9 2.5-9 6v2h18v-2c0-3.5-4-6-9-6z"/></svg>',
  invite: '<svg viewBox="0 0 24 24"><path d="M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm0 2c-4 0-7 2-7 5v2h14v-2c0-3-3-5-7-5zm10-5V5h-2v3h-3v2h3v3h2v-3h3V8z"/></svg>'
};
var NAV = [["home", "Home"], ["games", "Games"], ["leaders", "Leaderboard"], ["profile", "Profile"]];

function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
function status(t) { var el = document.getElementById("status"); if (el) el.textContent = t; }
function avatar(u, size, ring) {
  size = size || 36;
  if (u && u.bot) return '<span class="av bot" style="width:' + size + "px;height:" + size + "px;font-size:" + Math.round(size * 0.55) + "px" + (ring ? ";box-shadow:0 0 0 2px " + ring : "") + '">🤖</span>';
  var st = "width:" + size + "px;height:" + size + "px" + (ring ? ";box-shadow:0 0 0 2px " + ring : "");
  if (u && u.avatar) return '<img class="av" style="' + st + '" src="' + esc(u.avatar) + '" alt="">';
  var name = (u && u.name) || "?", h = 0;
  for (var i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
  return '<span class="av" style="' + st + ";background:linear-gradient(135deg,hsl(" + h + ",80%,62%),hsl(" + ((h + 50) % 360) + ",80%,48%));font-size:" + Math.round(size * 0.42) + 'px">' + esc(name[0].toUpperCase()) + "</span>";
}
function ago(t) {
  var s = Math.max(1, Math.round((Date.now() - t) / 1000));
  if (s < 60) return "just now"; if (s < 3600) return Math.round(s / 60) + "m ago"; if (s < 86400) return Math.round(s / 3600) + "h ago"; return Math.round(s / 86400) + "d ago";
}
function art(id, small) { var m = meta(id); return '<div class="art art-' + id + (small ? " sm" : "") + '"><span class="art-i">' + m.icon + "</span></div>"; }

// ---------- boot ----------
async function boot() {
  try {
    var room, q;
    if (inDiscord) {
      status("Connecting to Discord…");
      var mod = await import("/sdk.js");
      var cfg = await (await fetch("/api/config")).json();
      sdk = new mod.DiscordSDK(cfg.clientId);
      await sdk.ready();
      status("Signing you in…");
      var auth = await sdk.commands.authorize({ client_id: cfg.clientId, response_type: "code", state: "", prompt: "none", scope: ["identify"] });
      var tr = await fetch("/api/token", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: auth.code }) });
      var tok = await tr.json();
      if (!tok.access_token) throw new Error("Sign-in failed");
      await sdk.commands.authenticate({ access_token: tok.access_token });
      room = sdk.instanceId;
      q = "token=" + encodeURIComponent(tok.access_token);
    } else {
      var name = lsGet("gn_name");
      if (!name) { name = await askName(); }
      var gid = lsGet("gn_gid") || Math.random().toString(36).slice(2);
      lsSet("gn_gid", gid);
      room = params.get("room") || "lobby";
      q = "guest=" + encodeURIComponent(name) + "&gid=" + gid;
    }
    var proto = location.protocol === "https:" ? "wss://" : "ws://";
    wsUrl = proto + location.host + "/ws?" + q + "&room=" + encodeURIComponent(room);
    connect();
  } catch (e) {
    console.error(e);
    app.innerHTML = '<div class="splash"><div class="logo">😵</div><p>Couldn\'t start: ' + esc(e.message || e) + '</p><button class="btn primary" onclick="location.reload()">Retry</button></div>';
  }
}
function askName() {
  return new Promise(function (res) {
    app.innerHTML = '<div class="splash"><div class="logo">🎲</div><h1>Game Night</h1><p>Browser test mode — pick a name</p><form id="nf"><input id="nm" maxlength="24" placeholder="Your name" autofocus><button class="btn primary">Play</button></form></div>';
    document.getElementById("nf").onsubmit = function (e) {
      e.preventDefault();
      var v = document.getElementById("nm").value.trim() || "Guest";
      lsSet("gn_name", v);
      res(v);
    };
  });
}
function connect() {
  ws = new WebSocket(wsUrl);
  ws.onopen = function () { retry = 0; };
  ws.onmessage = function (ev) {
    var m = JSON.parse(ev.data);
    if (m.t === "state") { S.you = m.you; S.members = m.members; S.game = m.game; S.sel = -1; render(); }
    else if (m.t === "lb") { S.lb = m.rows; render(); }
    else if (m.t === "me") { S.me = m.profile; render(); }
    else if (m.t === "err") { toast(m.msg); }
  };
  ws.onclose = function () {
    retry = Math.min(retry + 1, 6);
    status("Reconnecting…");
    setTimeout(connect, 500 * retry);
  };
}
setInterval(function () { if (ws && ws.readyState === 1) ws.send('{"t":"ping"}'); }, 25000);
function send(m) { if (ws && ws.readyState === 1) ws.send(JSON.stringify(m)); }
var toastTimer;
function toast(t) {
  var el = document.getElementById("toast");
  if (!el) { el = document.createElement("div"); el.id = "toast"; document.body.appendChild(el); }
  el.textContent = t; el.className = "show";
  clearTimeout(toastTimer); toastTimer = setTimeout(function () { el.className = ""; }, 2200);
}
function meUser() { for (var i = 0; i < S.members.length; i++) if (S.members[i].id === S.you) return S.members[i]; return { name: "You" }; }
function prof() { return S.me || { xp: 0, level: 1, into: 0, need: 300, title: "Rookie", wins: 0, played: 0, per: {}, recent: [], today: 0, goal: 3 }; }

// ---------- shell ----------
function sidebar() {
  var p = prof(), u = meUser();
  return '<aside class="side"><div class="brand"><div class="brand-i">🎮</div><div class="brand-t">GAME<span>NIGHT</span></div></div><nav class="snav">' +
    NAV.map(function (n) { return '<button class="ni' + (S.view === n[0] && !gameShown() ? " on" : "") + '" data-act="nav" data-view="' + n[0] + '">' + ICON[n[0]] + "<span>" + n[1] + "</span></button>"; }).join("") +
    '</nav><div class="lvl" data-act="nav" data-view="profile">' + avatar(u, 46, "#ffd84d") + '<div><b>Level ' + p.level + "</b><small>" + esc(p.title) + '</small></div><div class="bar"><i style="width:' + Math.round((p.into / p.need) * 100) + '%"></i></div><em>' + p.into + " / " + p.need + ' XP</em></div><div class="pill"><i></i>In call · ' + S.members.length + "</div></aside>";
}
function bottomNav() {
  return '<nav class="bnav">' + NAV.map(function (n) { return '<button class="' + (S.view === n[0] && !gameShown() ? "on" : "") + '" data-act="nav" data-view="' + n[0] + '">' + ICON[n[0]] + "<span>" + n[1] + "</span></button>"; }).join("") + "</nav>";
}
function rightPanel() {
  var list = S.members.map(function (u) {
    return '<div class="fr">' + avatar(u, 42) + '<i class="on"></i><div><b>' + esc(u.name) + (u.id === S.you ? ' <small>(you)</small>' : "") + '</b><span>' + esc(u.status || "Hanging out") + "</span></div></div>";
  }).join("");
  return '<aside class="right"><div class="panel"><h3><i class="dot-on"></i>In this call</h3>' + list + '<button class="btn primary wide" data-act="invite">' + ICON.invite + " Invite Friends</button></div>" +
    '<div class="panel promo"><div class="crown">👑</div><h4>Reach new levels!</h4><p>Earn XP every game, win to level up and climb the leaderboard.</p><button class="btn primary" data-act="nav" data-view="profile">View Profile</button></div></aside>';
}
function gameShown() {
  var g = S.game;
  if (!g) return false;
  if (g.seat >= 0) return true;
  if (g.phase === "lobby") return S.dismissed !== g.id;
  return S.watching === g.id;
}
function render() {
  var shown = gameShown(), u = meUser();
  var titles = { home: "", games: "All games", leaders: "Leaderboard", profile: "Your profile" };
  var top = '<header class="top"><h2>' + (shown ? "" : titles[S.view]) + '</h2><div class="me">' + avatar(u, 34) + "<b>" + esc(u.name) + "</b></div></header>";
  app.innerHTML = '<div class="shell' + (shown ? " ingame" : "") + '">' + sidebar() + '<main class="main">' + top + '<div class="content">' + (shown ? gameScreen(S.game) : page()) + "</div></main>" + (shown ? "" : rightPanel()) + "</div>" + bottomNav();
}

// ---------- pages ----------
function liveBanner() {
  var g = S.game;
  if (!g || gameShown()) return "";
  var names = g.seats.map(function (s) { return esc(s.name); }).join(" vs ");
  if (g.phase === "lobby") return '<div class="live">' + art(g.type, true) + '<div><b>' + esc(g.seats[0] ? g.seats[0].name : "Someone") + " opened a " + esc(g.name) + ' lobby</b><span>' + g.seats.length + " / " + g.max + ' seats taken</span></div><button class="btn primary" data-act="sit">Join</button></div>';
  return '<div class="live"><i class="rec"></i><div><b>Live: ' + esc(g.name) + "</b><span>" + names + '</span></div><button class="btn dark" data-act="watch">Watch</button></div>';
}
function gcard(m) {
  return '<button class="gcard' + (m.soon ? " soon" : "") + '" ' + (m.soon ? "disabled" : 'data-act="pick" data-game="' + m.id + '"') + ">" + art(m.id) + '<div class="gc-b"><b>' + m.name + "</b><span>" + m.cat + " • " + m.players + "</span>" + (m.tag ? '<em class="tag t-' + m.tag.toLowerCase() + '">' + m.tag + "</em>" : "") + "</div></button>";
}
function page() {
  var p = prof();
  if (S.view === "games") return liveBanner() + '<div class="grid all">' + GAMES.map(gcard).join("") + "</div>";
  if (S.view === "leaders") {
    var rows = S.lb.length ? S.lb.map(function (r, i) { return '<li><span class="rk">' + (i + 1) + '</span><span class="nm">' + esc(r.name) + '</span><span class="w">' + r.wins + " wins</span><span class=\"pl\">" + r.played + " played</span></li>"; }).join("") : '<li class="empty">No games played yet — be the first!</li>';
    return '<div class="panel"><ol class="lb">' + rows + "</ol></div>";
  }
  if (S.view === "profile") {
    var u = meUser();
    var per = GAMES.filter(function (m) { return !m.soon; }).map(function (m) { var s = p.per[m.id] || { wins: 0, played: 0 }; return '<div class="stat">' + art(m.id, true) + "<div><b>" + m.name + "</b><span>" + s.wins + " wins · " + s.played + " played</span></div></div>"; }).join("");
    return '<div class="panel prof">' + avatar(u, 84, "#ffd84d") + '<div class="pi"><h2>' + esc(u.name) + '</h2><p class="gold">Level ' + p.level + " · " + esc(p.title) + '</p><div class="bar big"><i style="width:' + Math.round((p.into / p.need) * 100) + '%"></i></div><small>' + p.into + " / " + p.need + " XP to level " + (p.level + 1) + '</small></div><div class="nums"><div><b>' + p.wins + "</b><span>Wins</span></div><div><b>" + p.played + "</b><span>Played</span></div><div><b>" + p.xp + '</b><span>Total XP</span></div></div></div><h3 class="sec">Per game</h3><div class="stats">' + per + '</div><p class="note">+20 XP for every game, +80 XP more for a win.' + (u.guest ? " Guest stats in browser mode aren't saved." : "") + "</p>";
  }
  // home
  var feat = ["chess", "crazy8", "battleship", "dots"].map(function (id) { return gcard(meta(id)); }).join("");
  var pct = Math.min(100, Math.round((p.today / p.goal) * 100)), done = p.today >= p.goal;
  var recent = p.recent.length ? p.recent.map(function (r) { return '<div class="rg">' + art(r.game, true) + '<b>' + meta(r.game).name + "</b><span>" + ago(r.at) + ' · <em class="' + (r.won ? "win" : "loss") + '">' + (r.won ? "Won" : "Played") + "</em></span></div>"; }).join("") : '<p class="muted">Your games will show up here.</p>';
  return liveBanner() +
    '<section class="hero"><div class="hero-art"><i class="neon a"></i><i class="neon b"></i><i class="neon c"></i><span class="die">🎲</span><span class="pawn">♟︎</span></div><div class="hero-t"><h1>Your game night<br><em>starts here.</em></h1><p>Pick a game and play together with everyone in your call.</p><div class="hero-b"><button class="btn primary lg" data-act="nav" data-view="games">▶&nbsp; Play with friends</button><button class="btn dark lg" data-act="quick">⤮&nbsp; Quick match</button></div></div></section>' +
    '<div class="sh"><h3>⭐ Featured Games</h3><button class="link" data-act="nav" data-view="games">View all →</button></div><div class="grid">' + feat + "</div>" +
    '<div class="row"><div class="panel daily"><div><h3>🏆 Daily Challenge</h3><p>Win ' + p.goal + ' games today</p><div class="prog"><div class="bar gold"><i style="width:' + pct + '%"></i></div><b>' + Math.min(p.today, p.goal) + " / " + p.goal + "</b></div>" + (done ? '<p class="gold">Completed — nice!</p>' : "") + '</div><div class="chest">' + (done ? "🎉" : "🎁") + "</div></div>" +
    '<div class="panel recent"><div class="sh"><h3>🕒 Your Recent Games</h3><button class="link" data-act="nav" data-view="profile">See all →</button></div><div class="rgs">' + recent + "</div></div></div>";
}

// ---------- game screens ----------
function playerBar(g, extra) {
  return '<div class="players">' + g.seats.map(function (s, i) {
    return '<div class="plc' + (g.turn === i ? " turn" : "") + (s.online ? "" : " off") + '">' + avatar(s, 32, COLORS[i]) + "<span>" + esc(s.name) + (s.id === S.you ? " (you)" : "") + "</span>" + (extra ? extra(i) : "") + "</div>";
  }).join("") + "</div>";
}
function waitText(g, mine, my) { return mine ? my : g.seat < 0 ? "Spectating" : "Waiting for " + esc(g.seats[g.turn] ? g.seats[g.turn].name : "…") + "…"; }
function gameScreen(g) {
  var right = "";
  if (g.phase === "playing" && g.seat >= 0 && g.seats.length === 2) right = '<button class="ghost" data-act="resign">🏳 Resign</button>';
  var head = '<div class="ghead"><button class="ghost" data-act="leave">← ' + (g.seat >= 0 ? (g.phase === "lobby" ? "Leave" : "Back") : "Games") + "</button><h2>" + art(g.type, true) + esc(g.name) + '</h2><div class="gr">' + right + "</div></div>";
  if (g.phase === "lobby") return head + lobby(g);
  var R = { connect4: c4, crazy8: c8, chess: chess, battleship: sea, dots: dots, ttt: ttt, uttt: uttt, reversi: reversi, checkers: checkers, mancala: mancala, dice: diceGame };
  var body = (R[g.type] || function () { return '<p class="hint">Update the activity to play this game.</p>'; })(g);
  var over = "";
  if (g.phase === "over") {
    var w = null; g.seats.forEach(function (s) { if (s.id === g.winner) w = s; });
    var won = w && w.id === S.you;
    over = '<div class="modal"><div class="box"><div class="big">' + (w ? (won ? "🏆" : "🏅") : "🤝") + "</div><h2>" + (w ? (won ? "You win!" : esc(w.name) + " wins!") : "It's a draw") + "</h2>" + (g.seat >= 0 ? '<p class="xp">+' + (won ? 100 : 20) + " XP</p>" : "") + '<div class="actions">' + (g.seat >= 0 ? '<button class="btn primary" data-act="rematch">Rematch</button>' : "") + '<button class="btn dark" data-act="back">Back to games</button></div></div></div>';
  }
  return head + '<div class="gbody g-' + g.type + '">' + body + "</div>" + over;
}
function lobby(g) {
  var seated = g.seat >= 0, seats = "";
  for (var i = 0; i < g.max; i++) {
    var s = g.seats[i];
    seats += s ? '<div class="seat on' + (s.bot ? " lv-" + s.level : "") + '">' + (s.bot && seated ? '<button class="kick" data-act="kick" data-id="' + esc(s.id) + '" title="Remove bot">✕</button>' : "") + avatar(s, 64, COLORS[i]) + "<b>" + esc(s.name) + "</b><small>" + (s.id === g.hostId ? "👑 Host" : s.bot ? "Computer" : "Ready") + "</small></div>" : '<div class="seat"><div class="es">+</div><b>Open seat</b><small>&nbsp;</small></div>';
  }
  var canStart = seated && g.seats.length >= g.min;
  return '<div class="lobby">' + art(g.type) + '<p class="muted">' + g.min + (g.max > g.min ? "–" + g.max : "") + " players · " + (seated ? "share the call and wait for friends to join" : "a seat is open — jump in!") + '</p><div class="seats">' + seats + '</div><div class="actions">' +
    (seated ? '<button class="btn dark" data-act="stand">Leave seat</button>' : g.seats.length < g.max ? '<button class="btn primary lg" data-act="sit">Join game</button>' : "") +
    (seated ? '<button class="btn primary lg" data-act="start"' + (canStart ? "" : " disabled") + ">" + (canStart ? "Start game" : "Waiting for players…") + "</button>" : "") +
    (seated ? '<button class="btn dark" data-act="invite">' + ICON.invite + " Invite</button>" : "") + "</div>" +
    (seated && g.seats.length < g.max ? '<div class="botrow"><span>🤖 Play against the computer:</span><button class="lvb easy" data-act="addbot" data-level="easy">Easy</button><button class="lvb medium" data-act="addbot" data-level="medium">Medium</button><button class="lvb hard" data-act="addbot" data-level="hard">Hard</button></div>' : "") + "</div>";
}
function c4(g) {
  var st = g.state, myTurn = g.phase === "playing" && g.turn === g.seat, cells = "";
  for (var r = 0; r < 6; r++) for (var c = 0; c < 7; c++) {
    var v = st.board[r * 7 + c];
    cells += '<div class="cell" data-act="col" data-col="' + c + '">' + (v ? '<i class="disc" style="--pc:' + COLORS[v - 1] + '"' + (r * 7 + c === st.last ? ' data-new="1"' : "") + "></i>" : "") + "</div>";
  }
  return playerBar(g, function (i) { return '<i class="dot" style="background:' + COLORS[i] + '"></i>'; }) + '<p class="hint">' + (g.phase === "playing" ? waitText(g, myTurn, "Your turn — tap a column") : "") + '</p><div class="c4' + (myTurn ? " mine" : "") + '">' + cells + "</div>";
}
function cardHtml(c, extra) {
  var red = c[1] === "H" || c[1] === "D", rank = c[0] === "T" ? "10" : c[0];
  return '<div class="card' + (red ? " red" : "") + (extra || "") + '" data-card="' + c + '"><span>' + rank + "</span><b>" + SUIT[c[1]] + "</b></div>";
}
function c8(g) {
  var st = g.state, myTurn = g.phase === "playing" && g.turn === g.seat, top = st.top;
  var table = '<div class="felt"><div class="pile' + (myTurn && !st.drew ? " can" : "") + '" data-act="draw"><div class="card back"></div><small>' + st.deck + ' left</small></div><div class="pile">' + cardHtml(top) + '<small>Suit <b class="' + (st.suit === "H" || st.suit === "D" ? "redt" : "") + '">' + SUIT[st.suit] + "</b></small></div></div>";
  var log = st.log ? ' <span class="log">· last: ' + esc(st.log.replace(/([2-9TJQKA])([SHDC])/g, function (_, r, s) { return (r === "T" ? "10" : r) + SUIT[s]; })) + "</span>" : "";
  var hand = "";
  if (st.hand) {
    hand = '<div class="hand">' + st.hand.map(function (c) { var ok = myTurn && (c[0] === "8" || c[1] === st.suit || c[0] === top[0]); return cardHtml(c, ok ? " ok" : myTurn ? " dim" : ""); }).join("") + "</div>";
    if (myTurn && st.drew) hand += '<div class="actions"><button class="btn dark" data-act="pass">Pass</button></div>';
  }
  var picker = S.pendingEight ? '<div class="modal"><div class="box"><h2>Choose a suit</h2>' + ["S", "H", "D", "C"].map(function (s) { return '<button class="suit' + (s === "H" || s === "D" ? " redt" : "") + '" data-act="suit" data-suit="' + s + '">' + SUIT[s] + "</button>"; }).join("") + "</div></div>" : "";
  return playerBar(g, function (i) { return '<em class="cnt">🂠 ' + st.counts[i] + "</em>"; }) + table + '<p class="hint">' + (g.phase === "playing" ? waitText(g, myTurn, st.drew ? "Play a card or pass" : "Play a matching card or draw") : "") + log + "</p>" + hand + picker;
}
var PIECE = { K: "♚", Q: "♛", R: "♜", B: "♝", N: "♞", P: "♟" };
function chess(g) {
  var st = g.state, myTurn = g.phase === "playing" && g.turn === g.seat, flip = g.seat === 1, moves = st.moves || [], cells = "";
  var targets = {};
  moves.forEach(function (m) { if (m[0] === S.sel) targets[m[1]] = 1; });
  var checkSq = st.check ? st.board.indexOf((g.turn === 0 ? "w" : "b") + "K") : -1;
  for (var vr = 0; vr < 8; vr++) for (var vc = 0; vc < 8; vc++) {
    var sq = flip ? (7 - vr) * 8 + (7 - vc) : vr * 8 + vc, r = sq >> 3, c = sq & 7, p = st.board[sq];
    var cls = "sq" + ((r + c) % 2 ? " dk" : " lt") + (st.last && (st.last[0] === sq || st.last[1] === sq) ? " last" : "") + (S.sel === sq ? " sel" : "") + (targets[sq] ? (p ? " cap" : " tgt") : "") + (sq === checkSq ? " chk" : "");
    var coord = (vc === 0 ? '<i class="rk">' + (8 - r) + "</i>" : "") + (vr === 7 ? '<i class="fl">' + "abcdefgh"[c] + "</i>" : "");
    cells += '<div class="' + cls + '" data-act="sq" data-sq="' + sq + '">' + coord + (p ? '<span class="pc ' + p[0] + '">' + PIECE[p[1]] + "︎</span>" : "") + "</div>";
  }
  var hint = g.phase === "playing" ? (myTurn ? (st.check ? "Check! Protect your king" : "Your move" + (g.seat === 0 ? " (white)" : " (black)")) : waitText(g, false, "")) + (st.check && !myTurn ? " · Check!" : "") : "";
  return playerBar(g, function (i) { return '<i class="kc ' + (i === 0 ? "w" : "b") + '">' + PIECE.K + "︎</i>"; }) + '<p class="hint">' + hint + '</p><div class="chess' + (myTurn ? " mine" : "") + '">' + cells + "</div>";
}
function sea(g) {
  var st = g.state, me = g.seat, myTurn = st.phase === "play" && g.phase === "playing" && g.turn === me;
  function board(kind) {
    var ships = {}, sunk = {}, shots, out = "";
    if (kind === "mine") { st.mine.ships.forEach(function (sh) { sh.forEach(function (x) { ships[x] = 1; }); }); shots = st.mine.incoming; }
    else { st.enemy.sunk.forEach(function (sh) { sh.forEach(function (x) { sunk[x] = 1; }); }); shots = st.enemy.shots; }
    for (var i = 0; i < 100; i++) {
      var s = shots[i], cls = "bc" + (ships[i] ? " ship" : "") + (sunk[i] ? " sunk" : "") + (s === 2 ? " hit" : s === 1 ? " miss" : "") + (i === st.last ? " last" : "");
      var act = kind === "enemy" && myTurn && !s ? ' data-act="fire" data-cell="' + i + '"' : "";
      out += '<div class="' + cls + (act ? " aim" : "") + '"' + act + "></div>";
    }
    return out;
  }
  var opp = me >= 0 ? g.seats[1 - me] : g.seats[1], self = me >= 0 ? g.seats[me] : g.seats[0];
  var hint, ctrl = "";
  if (st.phase === "setup") {
    if (me >= 0 && !st.ready[me]) { hint = "Place your fleet — shuffle until you like it, then lock in"; ctrl = '<div class="actions"><button class="btn dark" data-act="shuffle">⤮ Shuffle</button><button class="btn primary" data-act="ready">⚓ Ready</button></div>'; }
    else hint = me >= 0 ? "Fleet locked in — waiting for " + esc(opp ? opp.name : "opponent") + "…" : "Players are placing their fleets…";
  } else hint = g.phase === "playing" ? waitText(g, myTurn, "Your turn — fire at enemy waters (hits fire again)") : "";
  return playerBar(g, function (i) { return st.phase === "setup" ? '<em class="cnt">' + (st.ready[i] ? "✅ ready" : "⏳ placing") + "</em>" : '<em class="cnt">🚢 ' + st.left[i] + " left</em>"; }) + '<p class="hint">' + hint + "</p>" + ctrl +
    '<div class="seas"><div><h4>' + (me >= 0 ? "Your fleet" : esc(self.name) + "'s fleet") + '</h4><div class="sea">' + board("mine") + '</div></div><div><h4>' + (me >= 0 ? "Enemy waters" : esc(opp.name) + "'s waters") + '</h4><div class="sea enemy' + (myTurn ? " live" : "") + '">' + board("enemy") + "</div></div></div>";
}
function dots(g) {
  var st = g.state, myTurn = g.phase === "playing" && g.turn === g.seat, N = 5, sp = 80, pd = 26, sz = pd * 2 + sp * N, out = "";
  for (var b = 0; b < N * N; b++) if (st.box[b] >= 0) {
    var br = Math.floor(b / N), bc = b % N, own = g.seats[st.box[b]];
    out += '<rect class="bx" x="' + (pd + bc * sp + 4) + '" y="' + (pd + br * sp + 4) + '" width="' + (sp - 8) + '" height="' + (sp - 8) + '" rx="10" fill="' + COLORS[st.box[b]] + '"/><text x="' + (pd + bc * sp + sp / 2) + '" y="' + (pd + br * sp + sp / 2 + 9) + '" text-anchor="middle">' + esc(own ? own.name[0].toUpperCase() : "") + "</text>";
  }
  function line(kind, i, x1, y1, x2, y2) {
    var o = st[kind][i], last = st.last && st.last[0] === kind && st.last[1] === i;
    var s = '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" class="ln' + (o >= 0 ? " drawn" : "") + (last ? " last" : "") + '"' + (o >= 0 ? ' style="stroke:' + COLORS[o] + ';color:' + COLORS[o] + '"' : "") + "/>";
    if (o < 0 && myTurn) s += '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" class="hitln" data-act="line" data-line="' + kind + '" data-i="' + i + '"/>';
    return s;
  }
  for (var r = 0; r <= N; r++) for (var c = 0; c < N; c++) out += line("h", r * N + c, pd + c * sp, pd + r * sp, pd + (c + 1) * sp, pd + r * sp);
  for (r = 0; r < N; r++) for (c = 0; c <= N; c++) out += line("v", r * (N + 1) + c, pd + c * sp, pd + r * sp, pd + c * sp, pd + (r + 1) * sp);
  for (r = 0; r <= N; r++) for (c = 0; c <= N; c++) out += '<circle cx="' + (pd + c * sp) + '" cy="' + (pd + r * sp) + '" r="7"/>';
  return playerBar(g, function (i) { return '<em class="cnt score">' + st.score[i] + "</em>"; }) + '<p class="hint">' + (g.phase === "playing" ? waitText(g, myTurn, "Your turn — draw a line (close a box to go again)") : "") + '</p><svg class="dots' + (myTurn ? " mine" : "") + '" viewBox="0 0 ' + sz + " " + sz + '">' + out + "</svg>";
}


function myTurnOf(g) { return g.phase === "playing" && g.turn === g.seat; }
function mark(v) { return v === 1 ? '<b class="mk x">✕</b>' : v === 2 ? '<b class="mk o">◯</b>' : ""; }
function ttt(g) {
  var st = g.state, mt = myTurnOf(g), cells = "";
  for (var i = 0; i < 9; i++) cells += '<div class="tc' + (st.line && st.line.indexOf(i) >= 0 ? " win" : "") + (mt && !st.board[i] ? " open" : "") + '"' + (mt && !st.board[i] ? ' data-act="ttt" data-i="' + i + '"' : "") + ">" + mark(st.board[i]) + "</div>";
  return playerBar(g, function (i) { return mark(i + 1); }) + '<p class="hint">' + (g.phase === "playing" ? waitText(g, mt, "Your turn") : "") + '</p><div class="ttt">' + cells + "</div>";
}
function uttt(g) {
  var st = g.state, mt = myTurnOf(g), out = "";
  for (var b = 0; b < 9; b++) {
    var live = !st.small[b] && (st.next < 0 || st.next === b), inner = "";
    for (var c = 0; c < 9; c++) {
      var v = st.cells[b * 9 + c], can = mt && live && !v;
      inner += '<div class="uc' + (b * 9 + c === st.last ? " last" : "") + (can ? " open" : "") + '"' + (can ? ' data-act="uttt" data-b="' + b + '" data-c="' + c + '"' : "") + ">" + mark(v) + "</div>";
    }
    out += '<div class="ub' + (live && g.phase === "playing" ? " live" : "") + (st.small[b] ? " done" : "") + (st.line && st.line.indexOf(b) >= 0 ? " win" : "") + '">' + inner + (st.small[b] ? '<div class="ubw">' + (st.small[b] === 3 ? "—" : mark(st.small[b])) + "</div>" : "") + "</div>";
  }
  return playerBar(g, function (i) { return mark(i + 1); }) + '<p class="hint">' + (g.phase === "playing" ? waitText(g, mt, st.next < 0 ? "Your turn — play in any open board" : "Your turn — play in the glowing board") : "") + '</p><div class="uttt">' + out + "</div>";
}
function reversi(g) {
  var st = g.state, mt = myTurnOf(g), out = "", ok = {};
  (st.moves || []).forEach(function (i) { ok[i] = 1; });
  for (var i = 0; i < 64; i++) out += '<div class="rc' + (ok[i] ? " open" : "") + '"' + (ok[i] ? ' data-act="rv" data-i="' + i + '"' : "") + ">" + (st.board[i] ? '<i class="rd p' + st.board[i] + (i === st.last ? " new" : "") + '"></i>' : "") + "</div>";
  var hint = g.phase === "playing" ? waitText(g, mt, "Your turn — place a disc to flip") + (st.passed ? " · opponent had no move" : "") : "";
  return playerBar(g, function (i) { return '<i class="rd mini p' + (i + 1) + '"></i><em class="cnt score">' + st.count[i] + "</em>"; }) + '<p class="hint">' + hint + '</p><div class="rv">' + out + "</div>";
}
function checkers(g) {
  var st = g.state, mt = myTurnOf(g), flip = g.seat === 1, moves = st.moves || [], tg = {}, out = "";
  moves.forEach(function (m) { if (m[0] === S.sel) tg[m[1]] = 1; });
  for (var vr = 0; vr < 8; vr++) for (var vc = 0; vc < 8; vc++) {
    var sq = flip ? (7 - vr) * 8 + (7 - vc) : vr * 8 + vc, r = sq >> 3, c = sq & 7, v = st.board[sq];
    var cls = "sq" + ((r + c) % 2 ? " dk" : " lt") + (st.last && (st.last[0] === sq || st.last[1] === sq) ? " last" : "") + (S.sel === sq ? " sel" : "") + (tg[sq] ? " tgt" : "");
    out += '<div class="' + cls + '" data-act="ck" data-sq="' + sq + '">' + (v ? '<i class="ckp p' + (v <= 2 ? 0 : 1) + '" style="--pc:' + COLORS[v <= 2 ? 0 : 1] + '">' + (v === 2 || v === 4 ? "👑" : "") + "</i>" : "") + "</div>";
  }
  var hint = g.phase === "playing" ? waitText(g, mt, st.chain >= 0 ? "Keep jumping!" : moves.length && Math.abs((moves[0][1] >> 3) - (moves[0][0] >> 3)) === 2 ? "You must capture" : "Your move — pick a piece") : "";
  return playerBar(g, function (i) { return '<i class="dot" style="background:' + COLORS[i] + '"></i><em class="cnt score">' + st.count[i] + "</em>"; }) + '<p class="hint">' + hint + '</p><div class="chess checkers' + (mt ? " mine" : "") + '">' + out + "</div>";
}
function mancala(g) {
  var st = g.state, mt = myTurnOf(g), me = g.seat >= 0 ? g.seat : 0, op = 1 - me, p = st.pits;
  function pit(idx, mine) {
    var k = idx - me * 7, can = mine && mt && p[idx] > 0, dots = "";
    for (var j = 0; j < Math.min(p[idx], 12); j++) dots += "<i></i>";
    return '<div class="pit' + (can ? " open" : "") + (idx === st.last ? " last" : "") + '"' + (can ? ' data-act="pit" data-k="' + k + '"' : "") + '><div class="stones">' + dots + "</div><b>" + p[idx] + "</b></div>";
  }
  var top = "", bot = "";
  for (var j = 5; j >= 0; j--) top += pit(op * 7 + j, false);
  for (j = 0; j < 6; j++) bot += pit(me * 7 + j, true);
  var hint = g.phase === "playing" ? waitText(g, mt, "Your turn — pick a pit on your side") + (st.log === "extra" ? " · landed in a store: extra turn!" : st.log === "capture" ? " · capture!" : "") : "";
  return playerBar(g, function (i) { return '<em class="cnt score">' + p[i * 7 + 6] + "</em>"; }) + '<p class="hint">' + hint + '</p><div class="mancala"><div class="store"><b>' + p[op * 7 + 6] + "</b><small>" + esc(g.seats[op] ? g.seats[op].name : "") + '</small></div><div class="pits"><div class="row-p">' + top + '</div><div class="row-p">' + bot + '</div></div><div class="store mine"><b>' + p[me * 7 + 6] + "</b><small>" + (g.seat >= 0 ? "You" : esc(g.seats[me].name)) + "</small></div></div>";
}
var CATN = { ones: "Ones", twos: "Twos", threes: "Threes", fours: "Fours", fives: "Fives", sixes: "Sixes", three: "3 of a kind", four: "4 of a kind", full: "Full house", small: "Small straight", large: "Large straight", yacht: "Lucky 5!", chance: "Chance" };
var PIPS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
function die(v, held, i, can) {
  var pips = ""; for (var k = 0; k < 9; k++) pips += "<i" + (PIPS[v].indexOf(k) >= 0 ? ' class="on"' : "") + "></i>";
  return '<div class="dface' + (held ? " held" : "") + (can ? " can" : "") + '"' + (can ? ' data-act="hold" data-i="' + i + '"' : "") + ">" + pips + "</div>";
}
function diceGame(g) {
  var st = g.state, mt = myTurnOf(g), canHold = mt && st.rolls > 0 && st.rolls < 3;
  var dice = '<div class="dicebox">' + st.dice.map(function (v, i) { return die(v, st.held[i], i, canHold); }).join("") + "</div>";
  var ctrl = mt ? '<div class="actions"><button class="btn primary lg" data-act="roll"' + (st.rolls >= 3 ? " disabled" : "") + ">🎲 Roll" + (st.rolls ? " again" : "") + " (" + (3 - st.rolls) + " left)</button></div>" : "";
  var head = "<tr><th>Round " + Math.min(st.round, 13) + "/13</th>" + g.seats.map(function (s, i) { return '<th class="' + (g.turn === i ? "cur" : "") + '">' + esc(s.name) + "</th>"; }).join("") + "</tr>";
  var rows = Object.keys(CATN).map(function (cat, ri) {
    var tds = g.seats.map(function (s, i) {
      var v = st.cards[i][cat];
      if (v != null) return "<td>" + v + "</td>";
      if (i === g.seat && st.preview && cat in st.preview) return '<td class="pick" data-act="cat" data-cat="' + cat + '">' + st.preview[cat] + "</td>";
      return '<td class="na">·</td>';
    }).join("");
    return (ri === 6 ? '<tr class="sub"><td>Bonus (63+ up top)</td>' + g.seats.map(function (s, i) { return "<td>" + (st.totals[i].bonus ? "+35" : st.totals[i].upper + "/63") + "</td>"; }).join("") + "</tr>" : "") + "<tr><td>" + CATN[cat] + "</td>" + tds + "</tr>";
  }).join("");
  var foot = '<tr class="tot"><td>Total</td>' + g.seats.map(function (s, i) { return "<td>" + st.totals[i].total + "</td>"; }).join("") + "</tr>";
  var hint = g.phase === "playing" ? waitText(g, mt, st.rolls === 0 ? "Roll the dice!" : st.rolls < 3 ? "Tap dice to hold, roll again or pick a score" : "Pick a score on the card") : "";
  return playerBar(g, function (i) { return '<em class="cnt score">' + st.totals[i].total + "</em>"; }) + '<p class="hint">' + hint + "</p>" + dice + ctrl + '<div class="panel card-tbl"><table class="sc">' + head + rows + foot + "</table></div>";
}

// ---------- input ----------
var leaveArmed = 0;
function confirmTwice(msg) { if (Date.now() - leaveArmed < 3000) { leaveArmed = 0; return true; } leaveArmed = Date.now(); toast(msg); return false; }
app.addEventListener("click", function (e) {
  var cardEl = e.target.closest(".hand .card");
  if (cardEl) {
    var c = cardEl.getAttribute("data-card");
    if (c[0] === "8") { S.pendingEight = c; render(); } else send({ t: "move", action: "play", card: c });
    return;
  }
  var el = e.target.closest("[data-act]");
  if (!el || el.disabled) return;
  var act = el.getAttribute("data-act"), g = S.game;
  if (act === "nav") { S.view = el.getAttribute("data-view"); if (g && g.seat < 0) { S.dismissed = g.id; S.watching = 0; } render(); }
  else if (act === "pick") { if (g && g.phase === "lobby") { toast(g.name + " lobby is open — join it or wait"); S.dismissed = 0; render(); } else send({ t: "pick", game: el.getAttribute("data-game") }); }
  else if (act === "quick") {
    if (g && g.phase === "lobby") { send({ t: "sit" }); S.dismissed = 0; render(); }
    else { var pool = GAMES.filter(function (m) { return !m.soon; }); send({ t: "pick", game: pool[Math.floor(Math.random() * pool.length)].id }); }
  }
  else if (act === "addbot") send({ t: "addbot", level: el.getAttribute("data-level") });
  else if (act === "kick") send({ t: "kick", id: el.getAttribute("data-id") });
  else if (act === "sit") { S.dismissed = 0; send({ t: "sit" }); }
  else if (act === "watch") { S.watching = g.id; render(); }
  else if (act === "leave") {
    if (!g) return;
    if (g.seat < 0) { S.dismissed = g.id; S.watching = 0; render(); }
    else if (g.phase === "lobby") send({ t: g.hostId === S.you && g.seats.length === 1 ? "back" : "stand" });
    else if (g.phase === "over") send({ t: "back" });
    else if (confirmTwice("Tap again to end the game for everyone")) send({ t: "back" });
  }
  else if (act === "resign") { if (confirmTwice("Tap Resign again to give up")) send({ t: "resign" }); }
  else if (act === "invite") {
    if (sdk) sdk.commands.openInviteDialog().catch(function () { toast("Couldn't open invites"); });
    else { try { navigator.clipboard.writeText(location.href); toast("Link copied"); } catch (er) { toast(location.href); } }
  }
  else if (act === "col") send({ t: "move", col: Number(el.getAttribute("data-col")) });
  else if (act === "draw") send({ t: "move", action: "draw" });
  else if (act === "pass") send({ t: "move", action: "pass" });
  else if (act === "suit") { send({ t: "move", action: "play", card: S.pendingEight, suit: el.getAttribute("data-suit") }); S.pendingEight = null; render(); }
  else if (act === "shuffle" || act === "ready") send({ t: "move", action: act });
  else if (act === "fire") send({ t: "move", action: "fire", cell: Number(el.getAttribute("data-cell")) });
  else if (act === "line") send({ t: "move", line: el.getAttribute("data-line"), i: Number(el.getAttribute("data-i")) });
  else if (act === "ttt") send({ t: "move", i: Number(el.getAttribute("data-i")) });
  else if (act === "uttt") send({ t: "move", b: Number(el.getAttribute("data-b")), c: Number(el.getAttribute("data-c")) });
  else if (act === "rv") send({ t: "move", i: Number(el.getAttribute("data-i")) });
  else if (act === "pit") send({ t: "move", pit: Number(el.getAttribute("data-k")) });
  else if (act === "hold") send({ t: "move", action: "hold", i: Number(el.getAttribute("data-i")) });
  else if (act === "roll") send({ t: "move", action: "roll" });
  else if (act === "cat") send({ t: "move", action: "score", cat: el.getAttribute("data-cat") });
  else if (act === "ck") {
    var cq = Number(el.getAttribute("data-sq")), cm = g.state.moves || [];
    if (!myTurnOf(g)) return;
    if (S.sel >= 0 && cm.some(function (m) { return m[0] === S.sel && m[1] === cq; })) { send({ t: "move", from: S.sel, to: cq }); S.sel = -1; return; }
    S.sel = cm.some(function (m) { return m[0] === cq; }) ? (S.sel === cq ? -1 : cq) : -1;
    render();
  }
  else if (act === "sq") {
    var sq = Number(el.getAttribute("data-sq")), st = g.state, moves = st.moves || [];
    if (!(g.phase === "playing" && g.turn === g.seat)) return;
    if (S.sel >= 0 && moves.some(function (m) { return m[0] === S.sel && m[1] === sq; })) { send({ t: "move", from: S.sel, to: sq, promo: "Q" }); S.sel = -1; return; }
    S.sel = moves.some(function (m) { return m[0] === sq; }) ? (S.sel === sq ? -1 : sq) : -1;
    render();
  }
  else if (act === "back" || act === "rematch" || act === "stand" || act === "start") send({ t: act });
});

boot();
`;
const CSS: string = String.raw`*{box-sizing:border-box;margin:0;padding:0}
:root{--bg:#0f0c29;--panel:#1b1642;--panel2:#231c55;--line:#a78bfa26;--txt:#f4f1ff;--mut:#a9a3d6;--acc:#7c4dff;--acc2:#b05cff;--gold:#ffc83d;--green:#3ddc84}
html,body{height:100%}
body{font-family:"Nunito","Baloo 2",ui-rounded,"SF Pro Rounded",system-ui,sans-serif;background:radial-gradient(1200px 600px at 30% -10%,#3a1f8a55,transparent),radial-gradient(900px 500px at 110% 110%,#5b1fa855,transparent),var(--bg);color:var(--txt);overflow-x:hidden;-webkit-user-select:none;user-select:none}
#app{min-height:100%}
button{font:inherit;cursor:pointer;border:0;color:inherit;background:none}
svg{fill:currentColor}
.muted{color:var(--mut)}.gold{color:var(--gold);font-weight:800}
.splash{min-height:100vh;display:flex;flex-direction:column;gap:14px;align-items:center;justify-content:center;text-align:center;padding:24px}
.logo{font-size:64px;animation:bob 1.6s ease-in-out infinite;filter:drop-shadow(0 0 24px #b05cff)}
@keyframes bob{50%{transform:translateY(-8px) rotate(8deg)}}
.splash input{padding:12px 16px;border-radius:14px;border:1px solid var(--line);background:var(--panel);color:#fff;font:inherit;font-size:16px;margin-right:8px}
/* shell */
.shell{display:grid;grid-template-columns:230px 1fr 300px;gap:18px;padding:16px;min-height:100vh}
.shell.ingame{grid-template-columns:230px 1fr}
.side{background:linear-gradient(180deg,#1d1748,#151137);border:1px solid var(--line);border-radius:24px;padding:20px 14px;display:flex;flex-direction:column;gap:18px;position:sticky;top:16px;height:calc(100vh - 32px)}
.brand{text-align:center}.brand-i{font-size:44px;filter:drop-shadow(0 0 18px #9d5cff)}
.brand-t{font-weight:900;font-size:22px;letter-spacing:1px}.brand-t span{color:var(--acc2);margin-left:4px}
.snav{display:flex;flex-direction:column;gap:6px}
.ni{display:flex;align-items:center;gap:14px;padding:12px 16px;border-radius:16px;font-weight:700;color:#d9d4ff;transition:.15s}
.ni svg{width:22px;height:22px;opacity:.85}
.ni:hover{background:#ffffff0d}
.ni.on{background:linear-gradient(90deg,var(--acc),var(--acc2));color:#fff;box-shadow:0 8px 24px #7c4dff66}
.lvl{margin-top:auto;background:#ffffff0a;border:1px solid var(--line);border-radius:18px;padding:14px;display:grid;grid-template-columns:auto 1fr;gap:6px 12px;align-items:center;cursor:pointer}
.lvl b{color:var(--gold);font-size:17px;display:block}.lvl small{color:var(--mut);font-size:13px}
.lvl .bar,.lvl em{grid-column:1/3}.lvl em{font-style:normal;text-align:center;font-size:13px;color:var(--mut)}
.bar{height:9px;border-radius:99px;background:#ffffff14;overflow:hidden}
.bar i{display:block;height:100%;border-radius:99px;background:linear-gradient(90deg,#8b5cff,#d06bff);box-shadow:0 0 12px #b05cff}
.bar.gold i{background:linear-gradient(90deg,#ffb300,#ffd84d);box-shadow:0 0 12px #ffc83d88}
.bar.big{height:12px}
.pill{display:flex;align-items:center;gap:10px;background:#ffffff0a;border:1px solid var(--line);border-radius:14px;padding:11px 14px;font-weight:700}
.pill i,.dot-on{width:10px;height:10px;border-radius:50%;background:var(--green);box-shadow:0 0 10px var(--green);display:inline-block}
.main{min-width:0;display:flex;flex-direction:column}
.top{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;min-height:46px}
.top h2{font-size:24px;font-weight:900}
.me{display:flex;align-items:center;gap:10px;background:var(--panel);border:1px solid var(--line);padding:5px 16px 5px 5px;border-radius:99px}
.av{border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-weight:900;object-fit:cover;flex:none;color:#fff}
.right{display:flex;flex-direction:column;gap:18px}
.panel{background:linear-gradient(180deg,var(--panel),#17123b);border:1px solid var(--line);border-radius:22px;padding:18px}
.panel h3{font-size:18px;font-weight:900;display:flex;align-items:center;gap:10px;margin-bottom:14px}
.fr{display:flex;align-items:center;gap:12px;padding:8px 0;position:relative}
.fr .on{position:absolute;left:31px;top:38px;width:12px;height:12px;border-radius:50%;background:var(--green);border:2px solid var(--panel)}
.fr b{display:block;font-size:15px}.fr b small{color:var(--mut);font-weight:600}.fr span{color:var(--green);font-size:13px;font-weight:700}
.promo{text-align:center;background:radial-gradient(circle at 50% 0%,#7c4dff66,transparent 70%),linear-gradient(180deg,#2a1a6b,#1a1145)}
.crown{font-size:52px;filter:drop-shadow(0 0 20px #ffc83d)}.promo h4{font-size:19px;font-weight:900;margin:6px 0}.promo p{color:#cfc8ff;font-size:14px;margin-bottom:14px}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:11px 20px;border-radius:14px;font-weight:800;transition:transform .1s,box-shadow .2s}
.btn svg{width:20px;height:20px}
.btn.primary{background:linear-gradient(90deg,var(--acc),var(--acc2));box-shadow:0 8px 22px #7c4dff66}
.btn.primary:hover{box-shadow:0 8px 30px #b05cffaa}
.btn.dark{background:#ffffff12;border:1px solid #ffffff24;backdrop-filter:blur(6px)}
.btn.lg{padding:14px 26px;font-size:17px}.btn.wide{width:100%;margin-top:12px}
.btn:active{transform:translateY(2px)}.btn:disabled{opacity:.45;cursor:default;box-shadow:none}
.ghost{background:#ffffff10;border:1px solid var(--line);padding:9px 15px;border-radius:12px;font-weight:800}
.link{color:#b9a6ff;font-weight:800}
/* home */
.hero{position:relative;overflow:hidden;border-radius:26px;min-height:250px;display:grid;grid-template-columns:42% 1fr;align-items:center;background:radial-gradient(circle at 25% 60%,#8b5cff88,transparent 55%),linear-gradient(120deg,#3b1d9a,#24145e 55%,#2d1878);border:1px solid #a78bfa44;box-shadow:0 20px 50px #0007,inset 0 0 60px #9d5cff33}
.hero-art{position:relative;height:100%;min-height:250px}
.die{position:absolute;left:12%;top:22%;font-size:120px;transform:rotate(-14deg);filter:drop-shadow(0 18px 30px #000a) drop-shadow(0 0 30px #b05cff99)}
.pawn{position:absolute;left:52%;top:6%;font-size:170px;line-height:1;background:linear-gradient(160deg,#e3d2ff,#8f5bff 45%,#3b1d9a);-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 0 24px #b05cff) drop-shadow(0 18px 20px #000a);font-family:"Segoe UI Symbol","DejaVu Sans",serif}
.neon{position:absolute;border:3px solid #4de1ff;border-radius:8px;box-shadow:0 0 14px #4de1ff,inset 0 0 10px #4de1ff;opacity:.8}
.neon.a{width:34px;height:34px;left:6%;top:10%;transform:rotate(20deg)}.neon.b{width:22px;height:22px;left:40%;top:78%;border-color:#ff5ce1;box-shadow:0 0 14px #ff5ce1;transform:rotate(-15deg)}.neon.c{width:18px;height:18px;left:88%;top:70%;transform:rotate(35deg)}
.hero-t{padding:28px 30px 28px 0}
.hero h1{font-size:clamp(28px,3.6vw,46px);line-height:1.05;font-weight:900;letter-spacing:-.5px}
.hero h1 em{font-style:normal;background:linear-gradient(90deg,#c9a6ff,#9d6bff);-webkit-background-clip:text;background-clip:text;color:transparent}
.hero p{color:#cfc8ff;margin:12px 0 20px;font-size:17px}
.hero-b{display:flex;gap:12px;flex-wrap:wrap}
.sh{display:flex;justify-content:space-between;align-items:center;margin:24px 2px 12px}.sh h3{font-size:20px;font-weight:900}
.panel .sh{margin:0 0 12px}.panel .sh h3{margin:0}
.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}
.grid.all{grid-template-columns:repeat(auto-fill,minmax(190px,1fr))}
.gcard{position:relative;text-align:left;background:var(--panel);border:1px solid var(--line);border-radius:20px;overflow:hidden;transition:transform .15s,box-shadow .2s;display:flex;flex-direction:column}
.gcard:hover{transform:translateY(-4px);box-shadow:0 14px 34px #7c4dff55;border-color:#a78bfa66}
.gcard.soon{opacity:.45;filter:grayscale(.6);cursor:default;transform:none;box-shadow:none}
.gc-b{padding:12px 14px 14px;position:relative}.gc-b b{display:block;font-size:17px;font-weight:900}.gc-b span{color:var(--mut);font-size:13px}
.tag{position:absolute;right:10px;top:10px;z-index:2;box-shadow:0 4px 10px #0006;font-style:normal;font-size:11px;font-weight:900;padding:3px 9px;border-radius:99px;background:#23c26b;color:#04210f}
.tag.t-new{background:#4de1ff;color:#032430}
.art{height:120px;position:relative;display:flex;align-items:center;justify-content:center;overflow:hidden}
.art-i{font-size:64px;filter:drop-shadow(0 10px 18px #000b) drop-shadow(0 0 20px #ffffff44);position:relative;z-index:1}
.art.sm{height:auto;width:40px;height:40px;border-radius:12px;flex:none}.art.sm .art-i{font-size:22px}
.art-chess{background:radial-gradient(circle at 50% 40%,#7c4dff99,transparent 65%),conic-gradient(#2a2160 25%,#3d2f8c 0 50%,#2a2160 0 75%,#3d2f8c 0) 0 0/32px 32px}
.art-chess .art-i{color:#e9dcff;font-family:"Segoe UI Symbol","DejaVu Sans",serif;font-size:76px;text-shadow:0 0 20px #b05cff}
.art-crazy8{background:radial-gradient(circle at 50% 50%,#ff6bb588,transparent 60%),linear-gradient(135deg,#5b1d8f,#2b1665)}
.art-battleship{background:radial-gradient(circle at 50% 60%,#29c6ff77,transparent 60%),linear-gradient(#ffffff0d 1px,transparent 1px) 0 0/16px 16px,linear-gradient(90deg,#ffffff0d 1px,transparent 1px) 0 0/16px 16px,linear-gradient(160deg,#0e3a7a,#141a55)}
.art-dots{background:radial-gradient(circle,#ffffff55 2px,transparent 3px) 0 0/22px 22px,radial-gradient(circle at 50% 50%,#ffd84d66,transparent 60%),linear-gradient(135deg,#7a2a8f,#33176b)}
.art-connect4{background:radial-gradient(circle,#0f0c29 9px,transparent 10px) 0 0/28px 28px,radial-gradient(circle at 50% 50%,#ff4d8d88,transparent 65%),linear-gradient(135deg,#3949d6,#252e99)}
.art-dice{background:radial-gradient(circle at 50% 50%,#ff9f4366,transparent 60%),linear-gradient(135deg,#8f2a5b,#3a1665)}
.art-reversi{background:radial-gradient(circle,#ffffff22 10px,transparent 11px) 0 0/30px 30px,radial-gradient(circle at 50% 50%,#3ddc8455,transparent 60%),linear-gradient(135deg,#1f6b4f,#14204a)}
.art-checkers{background:radial-gradient(circle at 50% 50%,#ff4d8d66,transparent 60%),conic-gradient(#3a2b85 25%,#5b47b8 0 50%,#3a2b85 0 75%,#5b47b8 0) 0 0/32px 32px}
.art-uttt{background:linear-gradient(#ffffff14 2px,transparent 2px) 0 0/40px 40px,linear-gradient(90deg,#ffffff14 2px,transparent 2px) 0 0/40px 40px,radial-gradient(circle at 50% 50%,#4dd4ff55,transparent 60%),linear-gradient(135deg,#2a2fa0,#1a1450)}
.art-ttt{background:radial-gradient(circle at 50% 50%,#ff4d8d55,transparent 60%),linear-gradient(135deg,#3b1d9a,#1a1145)}
.art-mancala{background:radial-gradient(circle,#0f0c2988 12px,transparent 13px) 0 0/34px 34px,radial-gradient(circle at 50% 50%,#b05cff66,transparent 60%),linear-gradient(135deg,#5b3df0,#2a1886)}
.art-pool{background:radial-gradient(circle at 50% 50%,#3ddc8466,transparent 60%),linear-gradient(135deg,#0f6b45,#0a3d2a)}
.art-mafia{background:radial-gradient(circle at 50% 50%,#ff4d4d55,transparent 60%),linear-gradient(135deg,#3a1240,#160b2c)}
.art-wordhunt{background:radial-gradient(circle at 50% 50%,#ffd84d55,transparent 60%),linear-gradient(135deg,#7a4a12,#3a1d55)}
.row{display:grid;grid-template-columns:1fr 1.25fr;gap:14px;margin-top:18px}
.daily{display:flex;justify-content:space-between;align-items:center;gap:10px;background:radial-gradient(circle at 85% 50%,#ffc83d33,transparent 50%),linear-gradient(180deg,var(--panel),#17123b)}
.daily p{color:#ddd8ff;margin-bottom:12px}.daily .gold{margin:10px 0 0}
.prog{display:flex;align-items:center;gap:12px}.prog .bar{width:170px;height:12px}.prog b{font-size:18px}
.chest{font-size:68px;filter:drop-shadow(0 0 22px #ffc83d99);animation:bob 2.4s ease-in-out infinite}
.rgs{display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:10px}
.rg{background:#ffffff0a;border-radius:14px;padding:10px;display:flex;flex-direction:column;gap:6px}
.rg b{font-size:14px}.rg span{font-size:12px;color:var(--mut)}.rg em{font-style:normal;font-weight:800}.rg em.win{color:var(--green)}
.live{display:flex;align-items:center;gap:14px;background:linear-gradient(90deg,#3b1d9a,#2a1a6b);border:1px solid #a78bfa55;border-radius:18px;padding:12px 14px;margin-bottom:16px;box-shadow:0 0 30px #7c4dff44}
.live div{flex:1}.live b{display:block}.live span{color:var(--mut);font-size:13px}
.rec{width:12px;height:12px;border-radius:50%;background:#ff3b5c;box-shadow:0 0 12px #ff3b5c;animation:pulse 1.2s infinite}
@keyframes pulse{50%{opacity:.35}}
.lb{list-style:none}.lb li{display:flex;gap:14px;padding:12px 10px;border-radius:14px;align-items:center}.lb li:nth-child(odd){background:#ffffff06}
.lb .rk{width:30px;height:30px;border-radius:50%;background:#ffffff1a;display:inline-flex;align-items:center;justify-content:center;font-weight:900}
.lb li:nth-child(1) .rk{background:linear-gradient(#ffe27a,#ffb300);color:#3a2600;box-shadow:0 0 14px #ffc83d}.lb li:nth-child(2) .rk{background:#d5dcef;color:#222}.lb li:nth-child(3) .rk{background:#e0985a;color:#2b1300}
.lb .nm{flex:1;font-weight:800}.lb .w{color:var(--gold);font-weight:800}.lb .pl{color:var(--mut);font-size:13px;width:80px;text-align:right}
.empty{color:var(--mut);justify-content:center}
.prof{display:flex;align-items:center;gap:22px;flex-wrap:wrap}.pi{flex:1;min-width:200px}.pi h2{font-size:26px;font-weight:900}.pi small{color:var(--mut)}.pi .bar{margin:10px 0 6px}
.nums{display:flex;gap:10px}.nums div{background:#ffffff0a;border-radius:16px;padding:12px 18px;text-align:center}.nums b{display:block;font-size:24px;font-weight:900}.nums span{color:var(--mut);font-size:13px}
.sec{margin:22px 2px 12px;font-size:19px;font-weight:900}
.stats{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:10px}
.stat{display:flex;align-items:center;gap:12px;background:var(--panel);border:1px solid var(--line);border-radius:16px;padding:12px}.stat b{display:block}.stat span{color:var(--mut);font-size:13px}
.note{color:var(--mut);font-size:13px;margin-top:14px}
/* games */
.ghead{display:flex;align-items:center;gap:12px;margin-bottom:6px}
.ghead h2{flex:1;display:flex;align-items:center;justify-content:center;gap:10px;font-size:22px;font-weight:900}
.gr{min-width:90px;display:flex;justify-content:flex-end}
.gbody{display:flex;flex-direction:column;align-items:center}
.players{display:flex;gap:8px;flex-wrap:wrap;justify-content:center}
.plc{display:flex;align-items:center;gap:8px;background:var(--panel);border:2px solid var(--line);padding:5px 14px 5px 5px;border-radius:99px;font-size:14px;font-weight:800;transition:.2s}
.plc.turn{border-color:var(--gold);box-shadow:0 0 18px #ffc83d66}.plc.off{opacity:.4}
.dot{width:14px;height:14px;border-radius:50%;display:inline-block;box-shadow:0 0 8px currentColor}
.cnt{font-style:normal;color:var(--mut);font-size:13px}.cnt.score{color:var(--gold);font-size:18px;font-weight:900;min-width:18px;text-align:center}
.hint{margin:14px 0;color:#ddd8ff;font-weight:700;text-align:center}.log{color:var(--mut);font-weight:600}
.lobby{text-align:center;display:flex;flex-direction:column;align-items:center;gap:14px;padding:10px}
.lobby>.art{width:min(420px,90%);border-radius:22px;height:150px;border:1px solid var(--line)}.lobby>.art .art-i{font-size:84px}
.seats{display:flex;gap:14px;flex-wrap:wrap;justify-content:center;margin:8px 0}
.seat{width:124px;padding:16px 8px;border-radius:20px;background:var(--panel);border:1px dashed #a78bfa44;display:flex;flex-direction:column;align-items:center;gap:6px}
.seat.on{border:1px solid #a78bfa66;background:linear-gradient(180deg,#2a2070,var(--panel));animation:pop .25s;box-shadow:0 10px 26px #0006}
.seat b{font-size:14px;max-width:110px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.seat small{color:var(--gold);font-weight:800;font-size:12px}
.seat:not(.on) b{color:var(--mut)}
@keyframes pop{from{transform:scale(.8);opacity:0}}
.es{width:64px;height:64px;border-radius:50%;border:2px dashed #a78bfa66;display:flex;align-items:center;justify-content:center;font-size:26px;color:var(--mut)}
.av.bot{background:linear-gradient(135deg,#3a3f7a,#1f2350);line-height:1}
.seat{position:relative}.seat.lv-easy small{color:#6dff9a}.seat.lv-medium small{color:#ffd84d}.seat.lv-hard small{color:#ff4d8d}
.kick{position:absolute;top:6px;right:8px;width:24px;height:24px;border-radius:50%;background:#ffffff14;font-size:12px;color:var(--mut)}.kick:hover{background:#ff4d8d55;color:#fff}
.botrow{display:flex;align-items:center;gap:8px;flex-wrap:wrap;justify-content:center;background:var(--panel);border:1px solid var(--line);padding:10px 14px;border-radius:16px;color:#cfc8ff;font-weight:700;font-size:14px}
.lvb{padding:8px 14px;border-radius:12px;font-weight:900;border:1px solid}.lvb.easy{color:#6dff9a;border-color:#6dff9a66;background:#6dff9a14}.lvb.medium{color:#ffd84d;border-color:#ffd84d66;background:#ffd84d14}.lvb.hard{color:#ff4d8d;border-color:#ff4d8d66;background:#ff4d8d14}
.lvb:hover{filter:brightness(1.3)}
.actions{display:flex;gap:10px;justify-content:center;margin:6px 0 10px;flex-wrap:wrap}
/* connect 4 */
.c4{display:grid;grid-template-columns:repeat(7,1fr);gap:7px;background:linear-gradient(180deg,#5b3df0,#3a22b8);padding:12px;border-radius:22px;box-shadow:0 10px 0 #2a1886,0 22px 40px #000a,0 0 40px #7c4dff55;width:min(92vw,480px)}
.cell{aspect-ratio:1;background:#0f0c29;border-radius:50%;display:flex;overflow:hidden;box-shadow:inset 0 4px 8px #000a}
.c4.mine .cell{cursor:pointer}.c4.mine .cell:hover{background:#221a52}
.disc{flex:1;border-radius:50%;background:radial-gradient(circle at 35% 30%,#fff9,var(--pc) 45%);box-shadow:0 0 14px var(--pc)}
.disc[data-new]{animation:drop .35s cubic-bezier(.5,0,.75,1.3)}
@keyframes drop{from{transform:translateY(-320%)}}
/* crazy 8s */
.felt{display:flex;gap:30px;margin-top:20px;padding:22px 34px;background:radial-gradient(#4b2aa8,#2a1670);border-radius:30px;box-shadow:inset 0 0 0 6px #ffffff10,0 0 40px #7c4dff55,0 14px 30px #0008}
.pile{display:flex;flex-direction:column;align-items:center;gap:6px}.pile small{font-size:12px;color:#cfc8ff}
.pile.can .card{cursor:pointer;box-shadow:0 0 0 3px var(--gold),0 0 20px #ffc83d88}
.card{width:66px;height:96px;border-radius:11px;background:#fff;color:#1b1b2f;display:flex;flex-direction:column;align-items:center;justify-content:center;box-shadow:0 6px 12px #0008;font-weight:900;flex:none;transition:transform .12s}
.card span{font-size:20px}.card b{font-size:30px;line-height:1}
.card.red,.redt{color:#e8335a}
.card.back{background:radial-gradient(circle,#b05cff 20%,transparent 21%) 0 0/12px 12px,linear-gradient(135deg,#7c4dff,#4b1fb8);border:4px solid #fff}
.hand{display:flex;flex-wrap:wrap;justify-content:center;gap:6px;max-width:760px}
.hand .card{cursor:pointer}.hand .card.ok{transform:translateY(-8px);box-shadow:0 0 0 3px var(--gold),0 0 18px #ffc83d88}.hand .card.ok:hover{transform:translateY(-14px)}.hand .card.dim{opacity:.5}
/* chess */
.chess{display:grid;grid-template-columns:repeat(8,1fr);width:min(92vw,540px);border-radius:16px;overflow:hidden;box-shadow:0 0 0 8px #2a1f66,0 0 0 9px #a78bfa55,0 24px 50px #000a,0 0 50px #7c4dff44}
.sq{aspect-ratio:1;position:relative;display:flex;align-items:center;justify-content:center}
.chess .sq.lt{background:#cbbdf5}.chess .sq.dk{background:#6a52c7}
.chess .sq.last{box-shadow:inset 0 0 0 100px #ffd84d55}.chess .sq.sel{box-shadow:inset 0 0 0 100px #4de1ff77}
.chess .sq.tgt::after{content:"";width:26%;height:26%;border-radius:50%;background:#1b1642aa}
.chess .sq.cap::after{content:"";position:absolute;inset:4px;border-radius:50%;border:5px solid #1b1642aa}
.chess .sq.chk{background:radial-gradient(#ff3b5c,#ff3b5c66 60%,transparent)!important}
.chess.mine .sq{cursor:pointer}
.pc{font-size:min(9vw,52px);line-height:1;font-family:"Segoe UI Symbol","DejaVu Sans",serif;position:relative;z-index:1}
.pc.w{color:#fff;text-shadow:0 0 1px #000,0 2px 0 #3a2a88,0 3px 6px #0008}.pc.b{color:#1b1238;text-shadow:0 0 1px #fff8,0 2px 6px #0006}
.sq i{position:absolute;font-style:normal;font-size:11px;font-weight:900;opacity:.7;color:#1b1642}.sq i.rk{left:4px;top:3px}.sq i.fl{right:5px;bottom:2px}
.kc{font-style:normal;font-size:20px;font-family:"Segoe UI Symbol","DejaVu Sans",serif}.kc.w{color:#fff}.kc.b{color:#0b0820;text-shadow:0 0 2px #fff}
/* sea battle */
.seas{display:flex;gap:24px;flex-wrap:wrap;justify-content:center}.seas h4{text-align:center;margin-bottom:8px;color:#cfc8ff}
.sea{display:grid;grid-template-columns:repeat(10,1fr);gap:3px;width:min(88vw,340px);padding:8px;border-radius:16px;background:linear-gradient(160deg,#0e3a7a,#141a55);box-shadow:0 0 30px #29c6ff33,0 14px 30px #0008}
.sea.enemy.live{box-shadow:0 0 0 2px var(--gold),0 0 30px #ffc83d55}
.bc{aspect-ratio:1;border-radius:5px;background:#ffffff12;position:relative}
.bc.ship{background:linear-gradient(135deg,#b9c3e6,#7d89b8)}
.bc.miss::after{content:"";position:absolute;inset:34%;border-radius:50%;background:#ffffff88}
.bc.hit{background:radial-gradient(circle,#ffd84d,#ff4d4d 60%,#8a1a2a);box-shadow:0 0 10px #ff4d4d}
.bc.sunk{background:radial-gradient(circle,#ff8a4d,#5a1222)}
.bc.last{outline:2px solid #fff}
.bc.aim{cursor:crosshair}.bc.aim:hover{background:#ffc83d88}
/* dots */
.dots{width:min(92vw,480px);background:radial-gradient(circle at 50% 30%,#2e2275,#1a1445);border-radius:22px;border:1px solid var(--line);box-shadow:0 0 40px #7c4dff44,0 18px 40px #0009}
.dots circle{fill:#fff;filter:drop-shadow(0 0 4px #b05cff)}
.dots .ln{stroke:#ffffff17;stroke-width:7;stroke-linecap:round}.dots .ln.drawn{stroke-width:8;filter:drop-shadow(0 0 5px currentColor)}
.dots .ln.last{stroke-width:11}
.dots .hitln{stroke:transparent;stroke-width:26;cursor:pointer}.dots .hitln:hover{stroke:#ffffff30}
.dots .bx{opacity:.35}.dots text{fill:#fff;font-weight:900;font-size:26px;font-family:inherit}
/* tic-tac-toe */
.mk{font-weight:900;font-style:normal;display:inline-block;line-height:1}.mk.x{color:#ff4d8d;text-shadow:0 0 12px #ff4d8d}.mk.o{color:#4dd4ff;text-shadow:0 0 12px #4dd4ff}
.plc .mk{font-size:16px}
.ttt{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;width:min(86vw,360px)}
.tc{aspect-ratio:1;border-radius:20px;background:var(--panel);border:1px solid var(--line);display:flex;align-items:center;justify-content:center;font-size:min(16vw,72px);box-shadow:inset 0 0 20px #0006}
.tc.open{cursor:pointer}.tc.open:hover{background:#2a2070}.tc.win{background:#3b1d9a;box-shadow:0 0 24px #b05cff88}
.uttt{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;width:min(92vw,520px)}
.ub{position:relative;display:grid;grid-template-columns:repeat(3,1fr);gap:4px;padding:6px;border-radius:14px;background:var(--panel);border:1px solid var(--line);transition:.2s}
.ub.live{border-color:var(--gold);box-shadow:0 0 18px #ffc83d55}.ub.win{background:#3b1d9a}
.uc{aspect-ratio:1;border-radius:7px;background:#ffffff0c;display:flex;align-items:center;justify-content:center;font-size:min(4.5vw,22px)}
.uc.open{cursor:pointer}.uc.open:hover{background:#ffc83d44}.uc.last{outline:2px solid #fff8}
.ub.done .uc{opacity:.25}
.ubw{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:min(20vw,96px);color:var(--mut)}
/* reversi */
.rv{display:grid;grid-template-columns:repeat(8,1fr);gap:3px;padding:8px;width:min(92vw,520px);border-radius:18px;background:linear-gradient(160deg,#1f6b4f,#123d34);box-shadow:0 0 0 6px #2a1f66,0 0 40px #3ddc8433,0 20px 40px #000a}
.rc{aspect-ratio:1;border-radius:6px;background:#ffffff10;display:flex;align-items:center;justify-content:center;position:relative}
.rc.open{cursor:pointer}.rc.open::after{content:"";width:22%;height:22%;border-radius:50%;background:#ffffff55}.rc.open:hover{background:#ffffff26}
.rd{width:82%;height:82%;border-radius:50%;display:block;transition:background .3s}
.rd.p1{background:radial-gradient(circle at 35% 30%,#5a5470,#0d0b1a 60%);box-shadow:0 3px 6px #000a}
.rd.p2{background:radial-gradient(circle at 35% 30%,#fff,#cfc8ff 70%);box-shadow:0 3px 6px #0008}
.rd.new{animation:pop .3s}.rd.mini{width:16px;height:16px}
/* checkers */
.checkers .sq.lt{background:#cbbdf5}.checkers .sq.dk{background:#3a2b85}
.ckp{width:76%;height:76%;border-radius:50%;display:flex;align-items:center;justify-content:center;font-style:normal;font-size:min(4vw,22px);background:radial-gradient(circle at 35% 30%,#fff8,var(--pc) 45%);box-shadow:0 4px 0 #0006,0 0 12px var(--pc),inset 0 0 0 4px #ffffff33}
.checkers .sq.tgt::after{background:#ffc83daa}
/* mancala */
.mancala{display:flex;align-items:stretch;gap:12px;padding:16px;border-radius:30px;background:linear-gradient(160deg,#5b3df0,#2a1886);box-shadow:0 0 40px #7c4dff55,0 20px 40px #000a;width:min(96vw,760px)}
.store{width:84px;border-radius:40px;background:#0f0c29;box-shadow:inset 0 6px 14px #000;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px}
.store b{font-size:30px;font-weight:900;color:var(--gold)}.store small{color:var(--mut);font-size:12px;max-width:76px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pits{flex:1;display:flex;flex-direction:column;gap:12px}.row-p{display:grid;grid-template-columns:repeat(6,1fr);gap:10px}
.pit{aspect-ratio:1;border-radius:50%;background:#0f0c29;box-shadow:inset 0 5px 12px #000;display:flex;flex-direction:column;align-items:center;justify-content:center;position:relative}
.pit b{position:absolute;bottom:-2px;font-size:13px;color:#cfc8ff}
.pit.open{cursor:pointer;box-shadow:inset 0 5px 12px #000,0 0 0 2px var(--gold)}.pit.open:hover{background:#221a52}.pit.last{box-shadow:inset 0 5px 12px #000,0 0 0 2px #4de1ff}
.stones{display:flex;flex-wrap:wrap;justify-content:center;gap:2px;width:70%}
.stones i{width:9px;height:9px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#fff,#b05cff);box-shadow:0 0 6px #b05cff}
/* dice */
.dicebox{display:flex;gap:12px;flex-wrap:wrap;justify-content:center;margin:4px 0 6px}
.dface{width:68px;height:68px;border-radius:16px;background:linear-gradient(145deg,#fff,#ddd6ff);display:grid;grid-template-columns:repeat(3,1fr);padding:9px;gap:3px;box-shadow:0 6px 0 #9b8fd6,0 10px 18px #0008;transition:transform .15s}
.dface i{border-radius:50%}.dface i.on{background:#2a1f66}
.dface.can{cursor:pointer}.dface.can:hover{transform:translateY(-3px)}
.dface.held{transform:translateY(-8px);box-shadow:0 0 0 3px var(--gold),0 0 20px #ffc83d88}
.card-tbl{margin-top:12px;padding:10px;max-width:100%;overflow-x:auto}
.sc{border-collapse:collapse;font-size:14px;min-width:300px}.sc th,.sc td{padding:6px 12px;text-align:center;border-bottom:1px solid #ffffff10}
.sc td:first-child,.sc th:first-child{text-align:left;color:#cfc8ff;font-weight:700}.sc th.cur{color:var(--gold)}
.sc td.pick{cursor:pointer;color:var(--gold);font-weight:900;background:#ffc83d14;border-radius:8px}.sc td.pick:hover{background:#ffc83d44}
.sc td.na{color:#ffffff30}.sc tr.sub td{color:var(--mut);font-size:12px}.sc tr.tot td{font-weight:900;font-size:16px;border:0}
/* modals */
.modal{position:fixed;inset:0;background:#07051acc;display:flex;align-items:center;justify-content:center;animation:fade .2s;z-index:5;backdrop-filter:blur(3px)}
@keyframes fade{from{opacity:0}}
.box{background:linear-gradient(180deg,#2a1f6e,#1b1642);border:1px solid #a78bfa55;padding:28px 34px;border-radius:26px;text-align:center;box-shadow:0 0 60px #7c4dff66,0 30px 60px #000a;animation:pop .25s}
.box .big{font-size:64px;filter:drop-shadow(0 0 20px #ffc83d)}.box h2{font-size:26px;font-weight:900;margin:8px 0}.xp{color:var(--gold);font-weight:900;font-size:18px;margin-bottom:6px}
.suit{font-size:34px;background:#fff;color:#1b1b2f;width:62px;height:62px;border-radius:16px;margin:10px 5px 0}.suit.redt{color:#e8335a}
#toast{position:fixed;bottom:84px;left:50%;transform:translate(-50%,160px);background:#1b1642f0;border:1px solid #a78bfa55;padding:10px 18px;border-radius:12px;font-weight:800;transition:.25s;z-index:9}
#toast.show{transform:translate(-50%,0)}
.bnav{display:none}
/* responsive */
@media(max-width:1180px){.shell{grid-template-columns:210px 1fr}.right{display:none}.grid{grid-template-columns:repeat(2,1fr)}}
@media(max-width:760px){
 .shell,.shell.ingame{grid-template-columns:1fr;padding:12px 12px 84px}.side{display:none}
 .bnav{display:flex;position:fixed;left:0;right:0;bottom:0;background:#120e33f2;border-top:1px solid var(--line);backdrop-filter:blur(10px);z-index:4}
 .bnav button{flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;padding:9px 0 11px;font-size:12px;font-weight:700;color:var(--mut)}
 .bnav svg{width:22px;height:22px}.bnav .on{color:#fff}.bnav .on svg{filter:drop-shadow(0 0 8px #b05cff);color:#c9a6ff}
 .hero{grid-template-columns:1fr}.hero-art{min-height:150px}.die{font-size:80px;left:18%;top:12%}.pawn{font-size:120px;left:52%}.hero-t{padding:0 20px 24px}
 .row{grid-template-columns:1fr}.top h2{font-size:20px}
}
`;
const h = (t: string) => new Bun.CryptoHasher("sha256").update(t).digest("hex").slice(0, 16);
Bun.serve({
  port: Number(Bun.env.PORT || 3000),
  fetch(req) {
    const p = new URL(req.url).pathname;
    if (p === "/client.js") return new Response(JS, { headers: { "Content-Type": "text/javascript; charset=utf-8", "Cache-Control": "no-cache" } });
    if (p === "/style.css") return new Response(CSS, { headers: { "Content-Type": "text/css; charset=utf-8", "Cache-Control": "no-cache" } });
    if (p === "/health") return Response.json({ ok: true, js: h(JS), css: h(CSS) });
    return new Response("not found", { status: 404 });
  },
});

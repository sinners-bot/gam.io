// GAM.IO client (vanilla JS, no build step)
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
      var auth;
      // rpc.activities.write lets GAM.IO show what you're playing on your Discord profile (rich presence)
      try { auth = await sdk.commands.authorize({ client_id: cfg.clientId, response_type: "code", state: "", prompt: "none", scope: ["identify", "rpc.activities.write"] }); }
      catch (e1) { auth = await sdk.commands.authorize({ client_id: cfg.clientId, response_type: "code", state: "", prompt: "none", scope: ["identify"] }); }
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
    app.innerHTML = '<div class="splash"><div class="logo">🎲</div><h1>GAM.IO</h1><p>Browser test mode — pick a name</p><form id="nf"><input id="nm" maxlength="24" placeholder="Your name" autofocus><button class="btn primary">Play</button></form></div>';
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
  return '<aside class="side"><div class="brand"><div class="brand-i">🎮</div><div class="brand-t">GAM<span>.IO</span></div></div><nav class="snav">' +
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
    '<section class="hero"><div class="hero-art"><i class="neon a"></i><i class="neon b"></i><i class="neon c"></i><span class="die">🎲</span><span class="pawn">♟︎</span></div><div class="hero-t"><h1>Your next game<br><em>starts here.</em></h1><p>Pick a game and play together with everyone in your call.</p><div class="hero-b"><button class="btn primary lg" data-act="nav" data-view="games">▶&nbsp; Play with friends</button><button class="btn dark lg" data-act="quick">⤮&nbsp; Quick match</button></div></div></section>' +
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

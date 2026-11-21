// Game Night bluff pack (Liar's Dice, Cheat, Spymaster) + online play — serves the games' browser code, styles and server-side game logic (a plugin the game server loads).
const JS: string = String.raw`// ---------- Game Night UI plugin: bluffing pack + online play + quick chat ----------
(function () {
  var MINE = { liars: 1, cheat: 1, spymaster: 1 };
  GAMES = GAMES.filter(function (m) { return !MINE[m.id]; });
  GAMES.splice(1, 0,
    { id: "liars", name: "Liar's Dice", cat: "Party", players: "2–6 players", tag: "New", icon: "🎲" },
    { id: "cheat", name: "Cheat", cat: "Cards", players: "3–6 players", tag: "New", icon: "🤥" },
    { id: "spymaster", name: "Spymaster", cat: "Party", players: "4–8 players · teams", tag: "New", icon: "🕵️" });
  function nm(g, i) { return g.seats[i] ? esc(g.seats[i].name) + (g.seats[i].id === S.you ? " (you)" : "") : "?"; }
  function names(g, txt) { return esc(txt || "").replace(/\{(\d+)\}/g, function (_, i) { return "<b>" + nm(g, +i) + "</b>"; }); }
  function myTurn(g) { return g.phase === "playing" && g.seat >= 0 && g.turn === g.seat; }
  var skew = 0;
  function secs(dl) { return Math.max(0, Math.ceil((dl - (Date.now() + skew)) / 1000)); }
  function clock(dl) { return dl ? '<span class="clock" data-bdl="' + dl + '">⏱ ' + secs(dl) + "s</span>" : ""; }
  setInterval(function () { document.querySelectorAll("[data-bdl]").forEach(function (el) { el.textContent = "⏱ " + secs(+el.getAttribute("data-bdl")) + "s"; }); }, 250);

  // ======================= Liar's Dice =======================
  var PIPS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
  function die3d(v, cls) { var h = ""; for (var i = 0; i < 9; i++) h += "<i" + ((PIPS[v] || []).indexOf(i) >= 0 ? ' class="on"' : "") + "></i>"; return '<div class="ld' + (cls || "") + (v === 1 ? " wild" : "") + '">' + h + "</div>"; }
  var bidQ = 0, bidF = 0, bidKey = "";
  function liarsView(g) {
    var st = g.state, mine = myTurn(g), rv = st.reveal;
    var key = g.id + ":" + st.round + ":" + (st.bid ? st.bid.q + "x" + st.bid.f : "");
    if (key !== bidKey) { bidKey = key; bidQ = st.bid ? st.bid.q : Math.max(1, Math.round(st.total / 3) - 1); bidF = st.bid ? st.bid.f : 2; if (st.bid) { if (bidF < 6) bidF++; else { bidQ++; bidF = 2; } } }
    var players = g.seats.map(function (s, i) {
      var dice = "";
      if (st.all) dice = st.all[i].map(function (v) { return die3d(v, rv && (v === rv.f || v === 1) ? " hit" : ""); }).join("");
      else for (var k = 0; k < st.counts[i]; k++) dice += '<div class="ld cup"></div>';
      var bid = st.bid && st.bid.by === i ? '<span class="bidtag">' + st.bid.q + " × " + die3d(st.bid.f, " tiny") + "</span>" : "";
      return '<div class="lseat' + (g.turn === i && st.phase === "bid" ? " turn" : "") + (!st.counts[i] && !st.all ? " out" : "") + (rv && rv.loser === i ? " lost" : "") + '">' + avatar(s, 38, COLORS[i % COLORS.length]) + "<b>" + nm(g, i) + "</b>" + bid + '<div class="ldice">' + (st.counts[i] || st.all ? dice : '<span class="muted">out</span>') + "</div></div>";
    }).join("");
    var center = '<div class="ldmid">' + (st.bid ? '<div class="curbid"><small>Current bid</small><b>' + st.bid.q + " ×</b>" + die3d(st.bid.f, " big") + "<small>by " + nm(g, st.bid.by) + "</small></div>" : '<div class="curbid"><small>No bid yet</small><b>Open the bidding</b></div>') +
      (rv ? '<div class="rvbox ' + (rv.actual >= rv.q ? "true" : "lie") + '"><b>' + rv.actual + " × " + rv.f + "</b> on the table — " + (rv.actual >= rv.q ? "the bid was good!" : "it was a bluff!") + "<br>" + nm(g, rv.loser) + " loses a die " + clock(st.deadline) + "</div>" : "") + "</div>";
    var myDice = st.mine && st.mine.length ? '<div class="mydice"><small>Your dice (1s are wild)</small><div>' + st.mine.map(function (v) { return die3d(v, " big"); }).join("") + "</div></div>" : "";
    var ctl = "";
    if (mine) {
      var faces = ""; for (var f = 2; f <= 6; f++) faces += '<button class="fbtn' + (f === bidF ? " on" : "") + '" data-act="ldf" data-f="' + f + '">' + die3d(f, " tiny") + "</button>";
      ctl = '<div class="ldctl"><div class="qty"><button class="lvb" data-act="ldq" data-d="-1">−</button><b>' + bidQ + '</b><button class="lvb" data-act="ldq" data-d="1">+</button></div><div class="faces">' + faces + '</div><button class="btn primary" data-act="ldbid">Bid ' + bidQ + " × " + bidF + "</button>" + (st.bid ? '<button class="btn hot" data-act="ldliar">Liar! 🤥</button>' : "") + "</div>";
    }
    var hint = g.phase !== "playing" ? "" : st.phase === "reveal" ? "" : mine ? (st.bid ? "Raise the bid, or call Liar!" : "Make the first bid") : g.seat < 0 ? "Spectating" : "Waiting for " + nm(g, g.turn) + "…";
    return '<div class="tinfo"><span>Round ' + st.round + "</span><span>" + st.total + " dice in play</span><span>1s are wild</span></div>" + '<div class="ldtable">' + center + '<div class="lseats">' + players + "</div></div>" + myDice + '<p class="hint">' + hint + '</p><p class="pmsg">' + names(g, st.log) + "</p>" + ctl;
  }

  // ======================= Cheat =======================
  var csel = [], ckey = "";
  function cheatView(g) {
    var st = g.state, mine = myTurn(g) && st.phase === "play", rv = st.reveal;
    var key = g.id + ":" + st.counts.join(",") + ":" + st.phase;
    if (key !== ckey) { ckey = key; if (!mine) csel = []; csel = csel.filter(function (c) { return st.hand && st.hand.indexOf(c) >= 0; }); }
    var seats = g.seats.map(function (s, i) {
      return '<div class="cseat' + (g.turn === i && st.phase === "play" ? " turn" : "") + (st.last && st.last.by === i && st.phase !== "play" ? " claim" : "") + '">' + avatar(s, 36, COLORS[i % COLORS.length]) + "<b>" + nm(g, i) + '</b><em>🂠 ' + st.counts[i] + "</em>" + (st.phase === "challenge" && st.passed.indexOf(i) >= 0 ? '<span class="ok">✓</span>' : "") + "</div>";
    }).join("");
    var pile = '<div class="cpile">' + (st.pile ? '<div class="stack">' + '<div class="card back"></div>'.repeat(Math.min(st.pile, 6)) + "</div><b>" + st.pile + " in the pile</b>" : '<b class="muted">Pile is empty</b>') + "</div>";
    var claim = "";
    if (rv) claim = '<div class="rvbox ' + (rv.lie ? "lie" : "true") + '"><div class="flip">' + rv.cards.map(function (c) { return cardHtml(c); }).join("") + "</div>" + (rv.lie ? "Busted! " + nm(g, rv.by) + " was lying" : "Honest! " + nm(g, rv.caller) + " was wrong") + " — " + nm(g, rv.taker) + " takes " + rv.took + " cards " + clock(st.deadline) + "</div>";
    else if (st.phase === "challenge" && st.last) claim = '<div class="claimbox"><b>' + nm(g, st.last.by) + "</b> says: <big>" + st.last.n + " × " + st.last.rank.replace("T", "10") + "</big> " + clock(st.deadline) + (st.canCall ? '<div class="actions"><button class="btn hot" data-act="ccall">Cheat! 🚨</button><button class="btn dark" data-act="cpass">Let it go</button></div>' : "") + "</div>";
    var hand = "";
    if (st.hand) hand = '<div class="hand thand chand">' + st.hand.map(function (c) { return cardHtml(c, csel.indexOf(c) >= 0 ? " sel" : st.hand && c[0] === st.rank ? " hint" : ""); }).join("") + "</div>";
    var ctl = mine ? '<div class="actions"><button class="btn primary" data-act="cplay"' + (csel.length ? "" : " disabled") + ">Play " + (csel.length || "") + " as " + st.rank.replace("T", "10") + (csel.length > 1 ? "s" : "") + "</button></div>" : "";
    var hint = g.phase !== "playing" ? "" : mine ? "Your turn — play 1–4 cards and claim they're " + st.rank.replace("T", "10") + "s (true or not!)" : st.phase === "play" ? (g.seat < 0 ? "Spectating" : "Waiting for " + nm(g, g.turn) + "…") : "";
    return '<div class="tinfo"><span>Now playing: <b>' + st.rank.replace("T", "10") + "s</b></span><span>Empty your hand to win</span></div>" + '<div class="cseats">' + seats + "</div>" + '<div class="ctable">' + pile + claim + "</div>" + '<p class="hint">' + hint + '</p><p class="pmsg">' + names(g, st.log) + "</p>" + hand + ctl;
  }

  // ======================= Spymaster =======================
  var TEAM = ["Red", "Blue"];
  function spyView(g) {
    var st = g.state, me = g.seat, master = st.master, myTeam = st.myTeam, active = g.phase === "playing";
    var canGuess = active && st.phase === "guess" && !master && me >= 0 && myTeam === st.team;
    var grid = '<div class="spygrid' + (master ? " master" : "") + '">' + st.words.map(function (w, i) {
      var k = st.key[i], cls = st.open[i] ? " open k" + k : master ? " peek k" + k : "";
      return '<button class="spw' + cls + (canGuess && !st.open[i] ? " can" : "") + '"' + (canGuess && !st.open[i] ? ' data-act="sguess" data-i="' + i + '"' : "") + ">" + (st.open[i] && k === 3 ? "💀 " : "") + esc(w) + "</button>";
    }).join("") + "</div>";
    var roster = function (t) {
      return g.seats.map(function (s, i) { return i % 2 === t ? '<span class="rm' + (i < 2 ? " sm" : "") + '">' + (i < 2 ? "🕶️ " : "") + nm(g, i) + "</span>" : ""; }).join("");
    };
    var teams = '<div class="spyteams">' + [0, 1].map(function (t) {
      return '<div class="steam t' + t + (st.team === t && active ? " on" : "") + '"><b>' + TEAM[t] + '</b><big>' + st.left[t] + "</big><small>words left</small><div>" + roster(t) + "</div></div>";
    }).join("") + "</div>";
    var bar = "";
    if (active && st.phase === "clue") {
      if (me === st.team) bar = '<form class="clueform" data-form="sclue"><input id="spy-w" maxlength="20" placeholder="One-word clue" autocomplete="off"><select id="spy-n">' + [1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map(function (n) { return "<option>" + n + "</option>"; }).join("") + '</select><button class="btn primary">Give clue</button></form>';
      else bar = '<p class="hint">' + TEAM[st.team] + " spymaster " + nm(g, st.team) + " is thinking of a clue…</p>";
    } else if (active && st.phase === "guess") {
      bar = '<div class="cluebar t' + st.team + '"><span>' + TEAM[st.team] + " clue</span><b>" + esc(st.clue.word) + " · " + st.clue.n + "</b><small>" + st.guesses + " guessed" + (st.clue.n ? " · up to " + (st.clue.n + 1) : "") + "</small>" + (canGuess ? '<button class="btn dark" data-act="send">End turn</button>' : "") + "</div>";
    }
    var role = me < 0 ? "Spectating" : master ? "You're the " + TEAM[myTeam] + " spymaster — you see the colors. Give one-word clues." : "You're on team " + TEAM[myTeam] + " — guess your team's words from the clues.";
    return teams + '<p class="hint">' + role + "</p>" + bar + grid + '<p class="pmsg">' + names(g, st.log) + "</p>";
  }

  var V = { liars: liarsView, cheat: cheatView, spymaster: spyView };
  var baseScreen = gameScreen;
  gameScreen = function (g) {
    if (!MINE[g.type] || g.phase === "lobby" || !g.state) return baseScreen(g);
    if (g.state.now) skew = g.state.now - Date.now();
    var head = '<div class="ghead"><button class="ghost" data-act="leave">← ' + (g.seat >= 0 ? "Back" : "Games") + "</button><h2>" + art(g.type, true) + esc(g.name) + '</h2><div class="gr"></div></div>';
    var over = "";
    if (g.phase === "over") {
      var ws = g.winners || [], you = ws.indexOf(S.you) >= 0, nameOf = function (id) { var s = g.seats.filter(function (x) { return x.id === id; })[0]; return s ? esc(s.name) : "?"; };
      var title = g.type === "spymaster" ? (ws.length ? (g.seats[0] && ws.indexOf(g.seats[0].id) >= 0 ? "🔴 Red" : "🔵 Blue") + " team wins!" : "Game over") : you ? "You win!" : ws.length ? ws.map(nameOf).join(", ") + (ws.length > 1 ? " tie!" : " wins!") : "Game over";
      over = '<div class="modal"><div class="box"><div class="big">' + (you ? "🏆" : "🎭") + "</div><h2>" + title + "</h2>" + (g.seat >= 0 ? '<p class="xp">+' + (you ? 100 : 20) + " XP</p>" : "") +
        '<div class="actions">' + (g.seat >= 0 ? '<button class="btn primary" data-act="rematch">Play again</button>' : "") + '<button class="btn dark" data-act="back">Back to games</button></div></div></div>';
    }
    return head + '<div class="gbody g-' + g.type + '">' + V[g.type](g) + "</div>" + over;
  };

  // ======================= online play + quick chat =======================
  var ON = { open: false, lobbies: [], queues: {}, queue: null }, chatOpen = false;
  var EMO = ["👍", "😂", "😮", "😡", "❤️", "🔥", "GG!", "Nice move!", "Oops 😅", "Hurry up! ⏱", "Good luck!", "Well played!"];
  function onMsg(m) {
    if (m.t === "state") { S.away = m.away; S.vis = m.vis; S.match = m.match; return false; }
    if (m.t === "emote") { showEmote(m); return true; }
    if (m.t === "online") { ON.lobbies = m.lobbies; ON.queues = m.queues; if (ON.open) drawOnline(); return true; }
    if (m.t === "queue") {
      ON.queue = m.game && !m.matched ? m : null;
      if (m.matched) { toast("Match found! 🎉"); ON.open = false; drawOnline(); }
      drawFab(); if (ON.open) drawOnline(); return true;
    }
    return false;
  }
  function hook(sock) {
    if (!sock || sock.__gn) return; sock.__gn = 1;
    var base = sock.onmessage;
    sock.onmessage = function (ev) { var m; try { m = JSON.parse(ev.data); } catch (e) { return; } if (!onMsg(m) && base) base.call(sock, ev); };
    var meta = function () { if (typeof sdk !== "undefined" && sdk && sdk.guildId) send({ t: "meta", guild: sdk.guildId }); };
    if (sock.readyState === 1) meta(); else sock.addEventListener("open", meta);
  }
  var baseConnect = connect;
  connect = function () { baseConnect(); hook(ws); };
  if (typeof ws !== "undefined" && ws) hook(ws);
  // emote bubbles
  function showEmote(m) {
    var box = document.getElementById("emo-feed");
    if (!box) { box = document.createElement("div"); box.id = "emo-feed"; document.body.appendChild(box); }
    var el = document.createElement("div"); el.className = "emo" + (m.e.length <= 2 ? " big" : "");
    el.innerHTML = "<b>" + esc(m.name) + "</b><span>" + esc(m.e) + "</span>";
    box.appendChild(el); setTimeout(function () { el.classList.add("out"); }, 2600); setTimeout(function () { el.remove(); }, 3200);
    if (m.e.length <= 2) { var f = document.createElement("div"); f.className = "emofloat"; f.textContent = m.e; f.style.left = (20 + Math.random() * 60) + "vw"; document.body.appendChild(f); setTimeout(function () { f.remove(); }, 2200); }
  }
  // floating buttons: 💬 quick chat (in games) and 🌍 online
  function drawFab() {
    var fab = document.getElementById("gn-fab");
    if (!fab) { fab = document.createElement("div"); fab.id = "gn-fab"; document.body.appendChild(fab); }
    var inGame = !!(S.game && S.game.phase !== "lobby");
    var q = ON.queue;
    fab.innerHTML = (q ? '<button class="fab q" data-gn="online">🔎 ' + q.n + "/" + q.need + "</button>" : '<button class="fab" data-gn="online" title="Play online">🌍</button>') +
      (S.members && S.members.length > 1 || inGame ? '<button class="fab" data-gn="chat" title="Quick chat">💬</button>' : "") +
      (chatOpen ? '<div class="chatpop">' + EMO.map(function (e, i) { return '<button data-gn="emo" data-i="' + i + '"' + (e.length <= 2 ? ' class="e"' : "") + ">" + e + "</button>"; }).join("") + "</div>" : "");
    var ban = document.getElementById("gn-away");
    if (S.away) {
      if (!ban) { ban = document.createElement("div"); ban.id = "gn-away"; document.body.appendChild(ban); }
      ban.innerHTML = "🌍 Playing online" + (S.match ? " (quick match)" : "") + ' <button data-gn="home">Back to my call</button>';
    } else if (ban) ban.remove();
  }
  function gname(id) { var x = GAMES.filter(function (m) { return m.id === id; })[0]; return x ? x.name : id; }
  function gicon(id) { var x = GAMES.filter(function (m) { return m.id === id; })[0]; return x ? x.icon : "🎮"; }
  var QM = ["chess", "connect4", "pool", "reversi", "checkers", "ttt", "uttt", "battleship", "dots", "mancala", "crazy8", "clash", "dice", "liars", "ludo", "poker", "hearts", "spades", "cheat", "trivia", "wordhunt", "draw", "spy", "spymaster", "mafia"];
  function drawOnline() {
    var el = document.getElementById("gn-online");
    if (!ON.open) { if (el) el.remove(); return; }
    if (!el) { el = document.createElement("div"); el.id = "gn-online"; el.className = "modal"; document.body.appendChild(el); }
    var q = ON.queue;
    var lob = ON.lobbies.length ? ON.lobbies.map(function (l) {
      return '<div class="olob"><span class="oi">' + gicon(l.game) + "</span><div><b>" + esc(l.name) + "</b><small>" + esc(l.host) + "'s lobby · " + l.seats + "/" + l.max + " · " + (l.sameServer ? "🏠 your server" : "🌍 public") + '</small></div><button class="btn primary" data-gn="join" data-room="' + esc(l.room) + '">Join</button></div>';
    }).join("") : '<p class="muted">No open lobbies right now — start one and set it to “Everyone”, or use quick match.</p>';
    var qm = QM.filter(function (id) { return GAMES.some(function (m) { return m.id === id; }); }).map(function (id) {
      var waiting = ON.queues[id] || 0, me = q && q.game === id;
      return '<button class="qmb' + (me ? " on" : "") + '" data-gn="' + (me ? "qmcancel" : "qm") + '" data-g="' + id + '"><span>' + gicon(id) + "</span><b>" + esc(gname(id)) + "</b><small>" + (me ? "Searching " + q.n + "/" + q.need + " · tap to cancel" : waiting ? waiting + " waiting" : "Quick match") + "</small></button>";
    }).join("");
    el.innerHTML = '<div class="box online"><button class="x" data-gn="close">✕</button><h2>🌍 Play online</h2><p class="muted">Match with players from any Discord server. You can go back to your call any time.</p>' +
      "<h3>Open lobbies</h3>" + lob + "<h3>Quick match</h3><div class=\"qmgrid\">" + qm + "</div></div>";
  }
  document.addEventListener("click", function (e) {
    var el = e.target.closest("[data-gn]"); if (!el) return;
    var a = el.getAttribute("data-gn");
    if (a === "online") { ON.open = true; send({ t: "browse" }); drawOnline(); }
    else if (a === "close") { ON.open = false; drawOnline(); }
    else if (a === "chat") { chatOpen = !chatOpen; drawFab(); }
    else if (a === "emo") { send({ t: "emote", e: Number(el.getAttribute("data-i")) }); chatOpen = false; drawFab(); }
    else if (a === "qm") send({ t: "qm", game: el.getAttribute("data-g") });
    else if (a === "qmcancel") send({ t: "qmcancel" });
    else if (a === "join") { send({ t: "joinroom", room: el.getAttribute("data-room") }); ON.open = false; drawOnline(); }
    else if (a === "home") send({ t: "home" });
    else if (a === "vis") send({ t: "vis", v: el.getAttribute("data-v") });
  });
  setInterval(function () { if (ON.open) send({ t: "browse" }); }, 4000);
  var baseRender = render;
  render = function () { baseRender.apply(this, arguments); drawFab(); };

  // lobby: visibility switch for the host + tips for the new games
  var baseLobby = lobby;
  lobby = function (g) {
    var h = baseLobby(g);
    var vis = S.vis || "call", host = g.hostId === S.you;
    var opts = [["call", "📞 This call"], ["server", "🏠 My server"], ["public", "🌍 Everyone"]];
    var sw = S.match ? "" : '<div class="vissw"><small>Who can join?</small>' + opts.map(function (o) { return host ? '<button class="' + (vis === o[0] ? "on" : "") + '" data-gn="vis" data-v="' + o[0] + '">' + o[1] + "</button>" : vis === o[0] ? "<span class=on>" + o[1] + "</span>" : ""; }).join("") + "</div>";
    var tips = { liars: "Everyone rolls 5 hidden dice. Bid how many of a face are on the whole table (1s are wild) — raise or call Liar! The loser of a challenge drops a die.", cheat: "Play cards face down claiming the rank in sequence (A, 2, 3…). Lie if you must — anyone can call Cheat! and the loser takes the pile.", spymaster: "Seats 1 & 2 are the Red and Blue spymasters; everyone else alternates Red / Blue. Spymasters give one-word clues, teams guess their words — avoid the 💀 assassin!" };
    var tip = MINE[g.type] ? '<p class="hint tip">💡 ' + tips[g.type] + "</p>" : "";
    return h.replace(/<\/div>$/, sw + tip + "</div>");
  };

  // game input
  app.addEventListener("click", function (e) {
    var el = e.target.closest("[data-act]"); if (!el || el.disabled) return;
    var a = el.getAttribute("data-act"), g = S.game; if (!g || !MINE[g.type]) return;
    if (a === "ldq") { bidQ = Math.max(1, Math.min(g.state.total, bidQ + Number(el.getAttribute("data-d")))); render(); }
    else if (a === "ldf") { bidF = Number(el.getAttribute("data-f")); render(); }
    else if (a === "ldbid") send({ t: "move", action: "bid", q: bidQ, f: bidF });
    else if (a === "ldliar") send({ t: "move", action: "liar" });
    else if (a === "cplay") { if (csel.length) { send({ t: "move", action: "play", cards: csel.slice() }); csel = []; } }
    else if (a === "ccall") send({ t: "move", action: "call" });
    else if (a === "cpass") send({ t: "move", action: "pass" });
    else if (a === "sguess") send({ t: "move", action: "guess", i: Number(el.getAttribute("data-i")) });
    else if (a === "send") send({ t: "move", action: "end" });
  });
  app.addEventListener("click", function (e) { // Cheat: pick cards (capture so the base hand handler doesn't play them)
    var g = S.game; if (!g || g.type !== "cheat" || !g.state) return;
    var el = e.target.closest(".chand .card"); if (!el) return;
    e.stopPropagation();
    if (!(myTurn(g) && g.state.phase === "play")) return;
    var c = el.getAttribute("data-card"), i = csel.indexOf(c);
    if (i >= 0) csel.splice(i, 1); else if (csel.length < 4) csel.push(c); else toast("You can play up to 4 cards");
    render();
  }, true);
  app.addEventListener("submit", function (e) {
    var f = e.target.closest("[data-form=sclue]"); if (!f) return;
    e.preventDefault();
    var w = document.getElementById("spy-w").value.trim(), n = Number(document.getElementById("spy-n").value);
    if (w) send({ t: "move", action: "clue", word: w, n: n });
  }, true);
})();
`;
const CSS: string = String.raw`/* ---------- bluffing pack + online + quick chat ---------- */
.art-liars{background:radial-gradient(circle at 50% 50%,#ff4d8d55,transparent 60%),linear-gradient(135deg,#5a1d8f,#1d1456)}
.art-cheat{background:radial-gradient(circle at 50% 50%,#ffc83d55,transparent 60%),linear-gradient(135deg,#7a2d5a,#1d1456)}
.art-spymaster{background:linear-gradient(135deg,#e8335a66 0 50%,#2f7bff66 50%),linear-gradient(135deg,#2a1660,#120d33)}
/* Liar's Dice */
.ld{width:34px;height:34px;background:linear-gradient(145deg,#fff,#e6e1ff);border-radius:8px;display:grid;grid-template-columns:repeat(3,1fr);padding:5px;gap:2px;box-shadow:0 3px 0 #b9b0e6,0 5px 10px #0006;flex:none}
.ld i{border-radius:50%}.ld i.on{background:#2b1665}.ld.wild i.on{background:#ff4d8d}
.ld.big{width:52px;height:52px;padding:8px;gap:3px;border-radius:12px}.ld.tiny{width:20px;height:20px;padding:3px;gap:1px;border-radius:5px;box-shadow:0 2px 0 #b9b0e6;display:inline-grid;vertical-align:middle}
.ld.cup{background:radial-gradient(circle at 40% 30%,#c07dff,#5a1d9f);box-shadow:0 3px 0 #3a1170,0 5px 10px #0006}
.ld.hit{outline:3px solid #6dff9a;outline-offset:1px}
.ldtable{border-radius:28px;background:radial-gradient(ellipse at center,#6a2a8f 0,#3a1670 60%,#22104a 100%);border:6px solid #3b2a7a;box-shadow:inset 0 0 50px #000a,0 10px 30px #0008;padding:18px;max-width:900px;margin:0 auto}
.ldmid{display:flex;gap:14px;justify-content:center;align-items:center;flex-wrap:wrap;margin-bottom:14px}
.curbid{display:flex;flex-direction:column;align-items:center;gap:4px;background:#0006;border-radius:18px;padding:10px 22px}.curbid b{font-size:26px}.curbid small{color:#cfc8ff;font-size:11px}
.rvbox{border-radius:16px;padding:10px 16px;text-align:center;font-size:14px;max-width:360px}.rvbox.true{background:#1f9e6a55;border:1px solid #6dff9a}.rvbox.lie{background:#ff4d8d44;border:1px solid #ff4d8d}
.lseats{display:flex;flex-wrap:wrap;gap:10px;justify-content:center}
.lseat{background:#120d2fe6;border:1px solid var(--line);border-radius:16px;padding:8px 12px;display:flex;flex-direction:column;align-items:center;gap:4px;min-width:150px;font-size:13px}
.lseat.turn{box-shadow:0 0 0 2px var(--gold),0 0 16px #ffc83d88}.lseat.lost{box-shadow:0 0 0 2px #ff4d8d,0 0 16px #ff4d8d88}.lseat.out{opacity:.4}
.ldice{display:flex;gap:4px;flex-wrap:wrap;justify-content:center;min-height:36px}.ldice .ld{width:26px;height:26px;padding:4px}
.bidtag{background:#ffc83d22;border:1px solid #ffc83d88;border-radius:99px;padding:1px 8px;font-weight:800;font-size:12px;display:flex;gap:4px;align-items:center}
.mydice{text-align:center;margin:14px 0 4px}.mydice small{color:#cfc8ff}.mydice>div{display:flex;gap:10px;justify-content:center;margin-top:6px}
.ldctl{display:flex;gap:10px;justify-content:center;align-items:center;flex-wrap:wrap}
.qty{display:flex;align-items:center;gap:8px;background:#ffffff0d;border-radius:99px;padding:4px}.qty b{font-size:22px;min-width:30px;text-align:center}
.faces{display:flex;gap:4px}.fbtn{background:#ffffff0d;border:2px solid transparent;border-radius:10px;padding:5px;cursor:pointer}.fbtn.on{border-color:var(--gold);background:#ffc83d22}
/* Cheat */
.cseats{display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-bottom:10px}
.cseat{display:flex;align-items:center;gap:6px;background:#ffffff0d;border:1px solid var(--line);border-radius:99px;padding:4px 12px 4px 4px;font-size:13px}
.cseat em{font-style:normal;color:#cfc8ff}.cseat.turn{box-shadow:0 0 0 2px var(--gold),0 0 14px #ffc83d88}.cseat.claim{box-shadow:0 0 0 2px #ff4d8d,0 0 14px #ff4d8d88}.cseat .ok{color:#6dff9a;font-weight:900}
.ctable{display:flex;gap:18px;justify-content:center;align-items:center;flex-wrap:wrap;min-height:170px;border-radius:28px;background:radial-gradient(ellipse at center,#2f7a58 0,#18503b 60%,#103a2b 100%);border:6px solid #3b2a7a;box-shadow:inset 0 0 40px #0009;padding:16px;max-width:820px;margin:0 auto}
.cpile{display:flex;flex-direction:column;align-items:center;gap:8px}.cpile .stack{position:relative;width:80px;height:110px}.cpile .stack .card{position:absolute;left:0;top:0}
.cpile .stack .card:nth-child(2){transform:rotate(6deg) translate(3px,-2px)}.cpile .stack .card:nth-child(3){transform:rotate(-7deg)}.cpile .stack .card:nth-child(4){transform:rotate(12deg) translate(5px,0)}.cpile .stack .card:nth-child(5){transform:rotate(-12deg)}.cpile .stack .card:nth-child(6){transform:rotate(3deg) translate(-4px,2px)}
.claimbox{background:#120d2fe6;border:1px solid var(--line);border-radius:18px;padding:12px 18px;text-align:center}.claimbox big{display:block;font-size:30px;font-weight:900;color:var(--gold);margin:4px 0}
.rvbox .flip{display:flex;gap:6px;justify-content:center;margin-bottom:8px}
.card.hint{box-shadow:0 0 0 2px #6dff9a88}
/* Spymaster */
.spyteams{display:flex;gap:12px;justify-content:center;margin-bottom:8px}
.steam{flex:1;max-width:300px;border-radius:16px;padding:8px 14px;display:grid;grid-template-columns:auto 1fr;column-gap:10px;align-items:center;opacity:.75}
.steam.t0{background:linear-gradient(135deg,#e8335a55,#e8335a22);border:1px solid #e8335a}.steam.t1{background:linear-gradient(135deg,#2f7bff55,#2f7bff22);border:1px solid #2f7bff}
.steam.on{opacity:1;box-shadow:0 0 18px #ffffff33}.steam big{font-size:28px;font-weight:900;grid-row:1/3;grid-column:2;justify-self:end}.steam small{font-size:11px;color:#ddd}
.steam div{grid-column:1/3;display:flex;flex-wrap:wrap;gap:4px;margin-top:4px}.rm{font-size:11px;background:#0004;border-radius:99px;padding:1px 8px}.rm.sm{font-weight:800}
.spygrid{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;width:min(760px,100%);margin:10px auto}
.spw{aspect-ratio:1.7;border-radius:12px;border:none;background:linear-gradient(160deg,#f6f1e3,#e2d9bf);color:#2b1d0e;font-weight:900;font-size:clamp(10px,1.6vw,15px);letter-spacing:.02em;box-shadow:0 4px 0 #b3a57d,0 6px 12px #0006;cursor:default;transition:transform .12s}
.spw.can{cursor:pointer}.spw.can:hover{transform:translateY(-3px)}
.spw.peek.k0{box-shadow:inset 0 0 0 4px #e8335a,0 4px 0 #b3a57d}.spw.peek.k1{box-shadow:inset 0 0 0 4px #2f7bff,0 4px 0 #b3a57d}.spw.peek.k3{box-shadow:inset 0 0 0 4px #111,0 4px 0 #b3a57d}
.spw.open{color:#fff;box-shadow:0 2px 0 #0006}.spw.open.k0{background:linear-gradient(160deg,#ff5c7f,#c41d43)}.spw.open.k1{background:linear-gradient(160deg,#5c9dff,#1c55c9)}.spw.open.k2{background:linear-gradient(160deg,#c9bfa3,#9c916f);color:#2b1d0e}.spw.open.k3{background:#111}
.clueform{display:flex;gap:8px;justify-content:center;flex-wrap:wrap}.clueform input{background:#ffffff10;border:1px solid var(--line);color:#fff;border-radius:12px;padding:10px 14px;font-weight:700;text-transform:uppercase}
.clueform select{background:#1b1140;color:#fff;border:1px solid var(--line);border-radius:12px;padding:0 10px}
.cluebar{display:flex;gap:12px;justify-content:center;align-items:center;flex-wrap:wrap;border-radius:16px;padding:8px 14px;max-width:700px;margin:0 auto}.cluebar.t0{background:#e8335a33}.cluebar.t1{background:#2f7bff33}.cluebar b{font-size:22px;letter-spacing:.06em}.cluebar small{color:#ddd}
/* online + chat */
#gn-fab{position:fixed;right:18px;bottom:18px;z-index:70;display:flex;flex-direction:column-reverse;gap:10px;align-items:flex-end}
.fab{width:52px;height:52px;border-radius:50%;border:none;background:linear-gradient(135deg,#b05cff,#ff4d8d);color:#fff;font-size:22px;box-shadow:0 8px 22px #0009;cursor:pointer}
.fab.q{width:auto;padding:0 16px;border-radius:99px;font-size:14px;font-weight:800;animation:gnpulse 1.2s ease-in-out infinite}
.chatpop{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;background:#1b1140f5;border:1px solid var(--line);border-radius:18px;padding:10px;width:260px;box-shadow:0 12px 30px #000a}
.chatpop button{background:#ffffff10;border:none;color:#fff;border-radius:10px;padding:8px 4px;font-weight:700;font-size:12px;cursor:pointer}.chatpop button.e{font-size:22px}.chatpop button:hover{background:#b05cff55}
#emo-feed{position:fixed;top:70px;right:18px;z-index:75;display:flex;flex-direction:column;gap:6px;align-items:flex-end;pointer-events:none}
.emo{background:#1b1140f2;border:1px solid var(--line);border-radius:16px;padding:6px 12px;font-size:13px;box-shadow:0 8px 20px #0008;animation:emoin .25s ease-out;transition:opacity .5s,transform .5s}
.emo b{color:#cfc8ff;margin-right:6px}.emo.big span{font-size:22px}.emo.out{opacity:0;transform:translateX(30px)}
@keyframes emoin{from{opacity:0;transform:translateX(30px)}}
.emofloat{position:fixed;bottom:80px;font-size:54px;z-index:74;pointer-events:none;animation:emofl 2.2s ease-out forwards}
@keyframes emofl{0%{transform:translateY(0) scale(.6);opacity:0}15%{opacity:1;transform:translateY(-40px) scale(1.2)}100%{transform:translateY(-55vh) scale(1);opacity:0}}
#gn-away{position:fixed;top:0;left:50%;transform:translateX(-50%);z-index:72;background:linear-gradient(90deg,#4d9dff,#b05cff);color:#fff;font-weight:800;font-size:13px;padding:7px 8px 7px 16px;border-radius:0 0 16px 16px;box-shadow:0 6px 20px #0008}
#gn-away button{margin-left:10px;background:#fff;color:#2b1665;border:none;border-radius:99px;padding:5px 12px;font-weight:800;cursor:pointer}
#gn-online .box.online{max-width:720px;width:94vw;max-height:86vh;overflow:auto;text-align:left;position:relative}
#gn-online h3{margin:16px 0 8px}#gn-online .x{position:absolute;right:14px;top:12px;background:none;border:none;color:#fff;font-size:20px;cursor:pointer}
.olob{display:flex;align-items:center;gap:12px;background:#ffffff0d;border:1px solid var(--line);border-radius:14px;padding:8px 10px;margin-bottom:6px}.olob div{flex:1}.olob small{display:block;color:#cfc8ff}.olob .oi{font-size:26px}
.qmgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:8px}
.qmb{background:#ffffff0d;border:1px solid var(--line);border-radius:14px;padding:10px 6px;color:#fff;display:flex;flex-direction:column;align-items:center;gap:2px;cursor:pointer}
.qmb span{font-size:26px}.qmb b{font-size:13px}.qmb small{font-size:11px;color:#cfc8ff}.qmb:hover{border-color:#b05cff}.qmb.on{border-color:var(--gold);background:#ffc83d22;animation:gnpulse 1.2s ease-in-out infinite}
.vissw{display:flex;gap:6px;justify-content:center;align-items:center;flex-wrap:wrap;margin:14px auto 0}.vissw small{color:#cfc8ff;margin-right:4px}
.vissw button,.vissw span{background:#ffffff0d;border:1px solid var(--line);color:#fff;border-radius:99px;padding:6px 12px;font-weight:700;font-size:12px;cursor:pointer}.vissw .on{border-color:var(--gold);background:#ffc83d22}
@media (max-width:640px){
  #gn-fab{bottom:84px;right:12px}.fab{width:46px;height:46px;font-size:20px}
  .lseat{min-width:0;width:calc(50% - 6px)}.ld.big{width:44px;height:44px}
  .spygrid{gap:5px}.spw{font-size:10px;border-radius:8px}
  .ctable{min-height:140px}
}
@keyframes gnpulse{50%{transform:scale(1.06)}}
.chand{flex-wrap:wrap;justify-content:center;row-gap:8px}
#gn-online{position:fixed;inset:0;z-index:90}
`;
const GAMES_TS: string = String.raw`// Game Night plugin: bluffing pack (Liar's Dice, Cheat, Spymaster). Loaded by the game server at startup.
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
`;
const h = (t: string) => new Bun.CryptoHasher("sha256").update(t).digest("hex").slice(0, 16);
Bun.serve({
  port: Number(Bun.env.PORT || 3000),
  fetch(req) {
    const p = new URL(req.url).pathname;
    if (p === "/client.js") return new Response(JS, { headers: { "Content-Type": "text/javascript; charset=utf-8", "Cache-Control": "no-cache" } });
    if (p === "/style.css") return new Response(CSS, { headers: { "Content-Type": "text/css; charset=utf-8", "Cache-Control": "no-cache" } });
    if (p === "/games.ts") return new Response(GAMES_TS, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-cache" } });
    if (p === "/health") return Response.json({ ok: true, js: h(JS), css: h(CSS), games: h(GAMES_TS) });
    return new Response("not found", { status: 404 });
  },
});

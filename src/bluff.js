// ---------- Game Night UI plugin: bluffing pack + online play + quick chat ----------
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

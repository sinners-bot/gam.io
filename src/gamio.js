// ---------- GAM.IO pack: tables + invites, turn timer + your-turn glow, Juno card table, animations (loads last) ----------
(function () {
  // ===== branding =====
  document.title = "GAM.IO";
  GAMES.forEach(function (m) { if (m.id === "clash") { m.name = "Juno"; m.icon = "🎴"; m.tag = "Hot"; } });
  var nf = document.getElementById("nf"); if (nf) { var h1 = app.querySelector(".splash h1"); if (h1) h1.textContent = "GAM.IO"; }
  var baseSidebar = sidebar;
  sidebar = function () { return baseSidebar.apply(this, arguments).replace("GAME<span>NIGHT</span>", "GAM<span>.IO</span>"); };

  S.tables = []; S.table = ""; S.peek = false;
  var lastTable = "", arrived = false;
  function nmOf(g, i) { return g.seats[i] ? esc(g.seats[i].name) + (g.seats[i].id === S.you ? " (you)" : "") : "?"; }
  function humansElse(g) { return g.seats.some(function (s, i) { return i !== g.seat && !s.bot; }); }

  // ===== socket: tables + invites =====
  function onMsg(m) {
    if (m.t === "state") {
      S.tables = m.tables || []; S.table = m.table || "";
      if (S.table !== lastTable) { S.peek = false; lastTable = S.table; }
      if (!arrived) { // just joined the call's activity (e.g. from the voice channel): offer the open tables
        arrived = true;
        setTimeout(function () { (S.tables || []).forEach(function (t) { if (t.phase === "lobby" && t.room !== S.table && t.seats.length < t.max && !t.seats.some(function (x) { return x.id === S.you; })) addInvite({ room: t.room, game: t.type, name: t.name, host: t.host }); }); }, 400);
      }
      return false;
    }
    if (m.t === "invite") { addInvite(m); return true; }
    return false;
  }
  function hook(sock) {
    if (!sock || sock.__gx) return; sock.__gx = 1;
    var base = sock.onmessage;
    sock.onmessage = function (ev) { var m; try { m = JSON.parse(ev.data); } catch (e) { return; } if (!onMsg(m) && base) base.call(sock, ev); };
  }
  var baseConnect = connect;
  connect = function () { baseConnect(); hook(ws); };
  if (typeof ws !== "undefined" && ws) hook(ws);

  // ===== invites =====
  var invites = [];
  function addInvite(m) {
    invites = invites.filter(function (x) { return x.room !== m.room; });
    invites.unshift({ room: m.room, game: m.game, name: m.name, host: m.host, at: Date.now() });
    invites = invites.slice(0, 3); drawInvites(); chime(520, 0.05);
  }
  function drawInvites() {
    var box = document.getElementById("gx-inv");
    if (!box) { box = document.createElement("div"); box.id = "gx-inv"; document.body.appendChild(box); }
    invites = invites.filter(function (x) { var age = Date.now() - x.at; return age < 20000 && S.table !== x.room && (age < 3000 || S.tables.some(function (t) { return t.room === x.room && t.phase === "lobby"; })); });
    box.innerHTML = invites.map(function (x) {
      return '<div class="gx-iv">' + art(x.game, true) + '<div class="gx-ivt"><b>' + esc(x.host) + "</b> opened a <b>" + esc(x.name) + "</b> table</div>" +
        '<button class="btn primary" data-gx="tjoin" data-room="' + esc(x.room) + '">Join</button><button class="gx-ivx" data-gx="ivx" data-room="' + esc(x.room) + '">✕</button></div>';
    }).join("");
  }
  setInterval(function () { if (invites.length) drawInvites(); }, 1000);

  // ===== tables list on Home / Games =====
  function tablesPanel() {
    var ts = S.tables || [];
    if (!ts.length) return S.view === "games" ? '<div class="gx-hint">💡 Pick a game to open your own table. Everyone in the call gets an invite, and several tables can run at once.</div>' : "";
    return '<section class="gx-tables"><div class="sh"><h3>🎲 Tables in this call</h3></div><div class="gx-tl">' + ts.map(function (t) {
      var full = t.seats.length >= t.max, me = t.seats.some(function (s) { return s.id === S.you; });
      var who = t.seats.map(function (s) { return '<span class="gx-chip' + (s.bot ? " bot" : "") + '">' + (s.bot ? "🤖 " : "") + esc(s.name) + "</span>"; }).join("");
      var btn = me || t.room === S.table ? '<button class="btn primary" data-gx="treturn">Return</button>'
        : t.phase === "lobby" && !full ? '<button class="btn primary" data-gx="tjoin" data-room="' + esc(t.room) + '">Join</button><button class="btn dark" data-gx="twatch" data-room="' + esc(t.room) + '">Watch</button>'
        : '<button class="btn dark" data-gx="twatch" data-room="' + esc(t.room) + '">Watch</button>';
      return '<div class="gx-t gx-' + t.phase + '">' + art(t.type) + '<div class="gx-tb"><b>' + esc(t.name) + '</b><span class="gx-ph">' + (t.phase === "lobby" ? "Open · " + t.seats.length + "/" + t.max + " seats" : t.phase === "playing" ? "● Playing" : "Finished") + (t.watchers ? " · 👀 " + t.watchers : "") + '</span><div class="gx-who">' + who + '</div></div><div class="gx-tbtn">' + btn + "</div></div>";
    }).join("") + "</div></section>";
  }
  var basePage = page;
  page = function () {
    var h = basePage.apply(this, arguments).replace("Your game night<br><em>starts here.</em>", "Your next game<br><em>starts here.</em>");
    if (S.view === "home" || S.view === "games") {
      var tp = tablesPanel();
      if (S.view === "home") { var i = h.indexOf('<div class="sh">'); h = i >= 0 ? h.slice(0, i) + tp + h.slice(i) : tp + h; } else h = tp + h;
    }
    return h;
  };
  var baseLive = liveBanner;
  liveBanner = function () { return S.table ? "" : baseLive.apply(this, arguments); };
  var baseShown = gameShown;
  gameShown = function () { if (!S.game) return false; if (S.table) return !S.peek; return baseShown(); };

  // ===== clicks =====
  function goTable(room, sit) { S.peek = false; send({ t: "jointable", room: room, sit: !!sit }); }
  document.addEventListener("click", function (e) {
    var el = e.target.closest("[data-gx]"); if (!el) return;
    var a = el.getAttribute("data-gx"), room = el.getAttribute("data-room");
    if (a === "tjoin" || a === "twatch") { invites = invites.filter(function (x) { return x.room !== room; }); drawInvites(); goTable(room, a === "tjoin"); }
    else if (a === "ivx") { invites = invites.filter(function (x) { return x.room !== room; }); drawInvites(); }
    else if (a === "treturn") { S.peek = false; render(); }
  });
  app.addEventListener("click", function (e) {
    var el = e.target.closest("[data-act]"); if (!el || el.disabled) return;
    var a = el.getAttribute("data-act"), g = S.game;
    if (a === "jdraw" || a === "jpass" || a === "jcolor" || a === "jpeek") { e.stopPropagation(); junoAct(a, el); return; }
    if (!S.table || !g) return;
    if (a === "nav") { S.peek = true; return; }
    if (a === "pick" || a === "quick") {
      e.stopPropagation();
      if (g.phase === "playing" && g.seat >= 0 && humansElse(g)) { toast("Finish or leave your current game first"); return; }
      var id = a === "pick" ? el.getAttribute("data-game") : (function () { var p = GAMES.filter(function (m) { return !m.soon; }); return p[Math.floor(Math.random() * p.length)].id; })();
      send({ t: "leavetable" }); send({ t: "pick", game: id }); S.peek = false; return;
    }
    if (a === "leave" || a === "back") {
      e.stopPropagation();
      if (a === "leave" && g.phase === "playing" && g.seat >= 0 && humansElse(g) && !confirmTwice("Tap again to leave. A bot will take your seat")) return;
      send({ t: "leavetable" }); return;
    }
  }, true);

  // ===== sound / haptics =====
  var actx = null;
  function chime(f, vol) {
    if (window.__gxMute) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      var t = actx.currentTime;
      [f, f * 1.5].forEach(function (fr, k) {
        var o = actx.createOscillator(), gn = actx.createGain();
        o.type = "sine"; o.frequency.value = fr; o.connect(gn); gn.connect(actx.destination);
        gn.gain.setValueAtTime(0, t + k * 0.11); gn.gain.linearRampToValueAtTime(vol || 0.07, t + k * 0.11 + 0.02); gn.gain.exponentialRampToValueAtTime(0.0001, t + k * 0.11 + 0.35);
        o.start(t + k * 0.11); o.stop(t + k * 0.11 + 0.4);
      });
    } catch (er) {}
  }

  // ===== turn timer + your-turn glow =====
  var skew = 0, wasMine = false;
  function timerHtml(g) {
    if (!g || g.phase !== "playing" || !g.turnDeadline || !g.turnTotal || g.afkSeat == null || g.afkSeat < 0) return "";
    var mine = g.afkSeat === g.seat;
    return '<div class="gx-timer' + (mine ? " mine" : "") + '" data-gxdl="' + g.turnDeadline + '" data-gxtot="' + g.turnTotal + '"><div class="gx-tw"><b>' + (mine ? "Your turn" : nmOf(g, g.afkSeat)) + '</b><span>⏱ <em>' + Math.ceil(g.turnTotal / 1000) + "</em>s</span></div><i><u></u></i></div>";
  }
  function tickTimer() {
    var el = document.querySelector(".gx-timer"); if (!el) return;
    var dl = +el.getAttribute("data-gxdl"), tot = +el.getAttribute("data-gxtot"), left = Math.max(0, dl - (Date.now() + skew));
    var bar = el.querySelector("u"), sec = el.querySelector("em");
    if (bar) bar.style.width = Math.max(0, Math.min(100, (left / tot) * 100)) + "%";
    var s = Math.ceil(left / 1000);
    if (sec && sec.textContent !== String(s)) { sec.textContent = s; if (s <= 5 && s > 0 && el.classList.contains("mine")) chime(880, 0.025); }
    el.classList.toggle("urgent", left < 6000);
  }
  setInterval(tickTimer, 100);
  function turnFx(g) {
    var mine = !!(g && gameShown() && g.yourTurn);
    document.body.classList.toggle("gx-myturn", mine);
    if (mine && !wasMine && !window.__gxCalm) {
      var f = document.createElement("div"); f.className = "gx-yt"; f.innerHTML = "<b>YOUR TURN</b>";
      document.body.appendChild(f); setTimeout(function () { f.remove(); }, 1300);
      chime(660, 0.06); try { if (navigator.vibrate) navigator.vibrate(60); } catch (er) {}
    }
    wasMine = mine;
  }

  // ===== Discord rich presence (shows on your profile; friends can "Ask to Join") =====
  var PR = { key: "", at: 0, timer: null, start: 0, gid: "" };
  function presence() {
    if (typeof sdk === "undefined" || !sdk || !sdk.commands || !sdk.commands.setActivity) return;
    var g = S.game, a;
    if (g) {
      var humans = g.seats.filter(function (x) { return !x.bot; }).length, bots = g.seats.length - humans;
      if (g.phase === "lobby") a = { details: "Setting up " + g.name, state: "Waiting for players", party: { size: [Math.max(1, g.seats.length), g.max] } };
      else if (g.phase === "playing" && g.seat < 0) a = { details: "Watching " + g.name, state: "Spectating" };
      else if (g.phase === "playing") a = { details: "Playing " + g.name, state: humans > 1 ? (bots ? "With friends and bots" : "With friends") : "Against the computer", party: { size: [g.seats.length, g.max] } };
      else a = { details: "Just finished " + g.name, state: "Choosing the next game" };
    } else {
      var open = (S.tables || []).filter(function (t) { return t.phase === "lobby"; }).length;
      a = { details: "Picking a game", state: open ? open + (open === 1 ? " open table" : " open tables") + " in the call" : "In the lobby" };
    }
    var gid = g ? g.id + ":" + g.phase : "hub";
    if (gid !== PR.gid) { PR.gid = gid; PR.start = Math.floor(Date.now() / 1000); }
    a.type = 0; a.timestamps = { start: PR.start };
    // art uploaded under Rich Presence > Art Assets: one image per game (key = game id) plus "gamio" (the logo)
    a.assets = g ? { large_image: g.type, large_text: g.name, small_image: "gamio", small_text: "GAM.IO" } : { large_image: "gamio", large_text: "GAM.IO" };
    var key = JSON.stringify(a);
    if (key === PR.key) return;
    PR.key = key; clearTimeout(PR.timer);
    PR.timer = setTimeout(function () { // Discord rate-limits presence updates, so send at most one every 4 seconds
      PR.at = Date.now();
      try { sdk.commands.setActivity({ activity: JSON.parse(PR.key) }).catch(function (e) { console.warn("presence", e && e.message); }); } catch (e) {}
    }, Math.max(0, PR.at + 4000 - Date.now()));
  }

  // ===== Juno (rebuilt Color Clash) =====
  var JSYM = { S: "⊘", R: "⇄", D: "+2", W: "", F: "+4" }, JCN = { R: "Red", G: "Green", B: "Blue", Y: "Yellow" };
  var J = { gid: 0, sig: "", pile: [], hand: [], counts: [], myRect: null, wild: null, peek: 0 };
  function jcard(c, cls, attrs) {
    var v = c[1], sym = JSYM[v] != null ? JSYM[v] : v, wild = c[0] === "K";
    var mid = wild ? '<span class="jmid jw">' + (v === "F" ? "<b>+4</b>" : "") + "</span>" : '<span class="jmid"><b>' + sym + "</b></span>";
    var corner = wild ? (v === "F" ? "+4" : "★") : sym;
    return '<div class="jc j' + c[0] + (cls || "") + '"' + (attrs || "") + '><span class="jtl">' + corner + "</span>" + mid + '<span class="jbr">' + corner + "</span></div>";
  }
  function jback(cls) { return '<div class="jc jback' + (cls || "") + '"><span class="jlogo">JUNO</span></div>'; }
  function jlog(g, t) {
    return esc(t).replace(/\{(\d+)\}/g, function (_, i) { return "<b>" + nmOf(g, +i) + "</b>"; })
      .replace(/\b([RGBYK])([0-9SRDWF])(&gt;([RGBY]))?/g, function (_, c, v, x, to) { return '<span class="jl j' + c + '">' + (c === "K" ? (v === "F" ? "+4" : "Wild") : JSYM[v] || v) + "</span>" + (to ? ' → <span class="jl j' + to + '">' + JCN[to] + "</span>" : ""); });
  }
  function junoScreen(g) {
    var st = g.state, n = g.seats.length, me = g.seat >= 0 ? g.seat : 0, mine = g.phase === "playing" && g.turn === g.seat && g.seat >= 0, top = st.top;
    if (J.gid !== g.id) { J = { gid: g.id, sig: "", pile: [{ c: top, r: 0 }], plog: st.log, hand: [], counts: st.counts.slice(), myRect: null, wild: null, peek: 0 }; }
    if (J.pile[J.pile.length - 1].c !== top || (st.log !== J.plog && /^\{\d+\} played/.test(st.log || ""))) { J.pile.push({ c: top, r: Math.round(Math.random() * 30 - 15) }); if (J.pile.length > 5) J.pile.shift(); }
    J.plog = st.log;
    var ok = function (c) { if (st.pend) return c === "KF" || (top[1] === "D" && c[1] === "D"); return c[0] === "K" || c[0] === st.color || c[1] === top[1]; };
    var seats = "";
    for (var k = 1; k < n; k++) {
      var i = (me + k) % n, a = (180 + (180 * k) / n) * Math.PI / 180, x = 50 + 44 * Math.cos(a), y = 54 + 46 * Math.sin(a), cnt = st.counts[i], m = Math.min(cnt, 12), fan = "";
      for (var j = 0; j < m; j++) fan += '<i style="--o:' + (j - (m - 1) / 2).toFixed(2) + '"></i>';
      seats += '<div class="jseat' + (g.turn === i && g.phase === "playing" ? " turn" : "") + (cnt === 1 ? " one" : "") + '" data-seat="' + i + '" style="left:' + x.toFixed(1) + "%;top:" + y.toFixed(1) + '%"><div class="jfan">' + fan + "</div>" + avatar(g.seats[i], 38, COLORS[i]) + '<div class="jsn"><b>' + nmOf(g, i) + '</b><em>' + cnt + "</em></div></div>";
    }
    var pile = J.pile.map(function (p, idx) { return '<div class="jpc" style="--r:' + p.r + 'deg">' + jcard(p.c, idx === J.pile.length - 1 ? " jtop" : "") + "</div>"; }).join("");
    var deck = '<div class="jdeck' + (mine && (!st.drew || st.pend) ? " can" : "") + '" data-act="jdraw">' + jback(" d3") + jback(" d2") + jback(" d1") + "<small>" + st.deck + "</small></div>";
    var center = '<div class="jcenter"><div class="jring ' + (st.dir > 0 ? "cw" : "ccw") + '" style="--jc:var(--j' + st.color + ')"></div>' + deck + '<div class="jpile">' + pile + '</div><div class="jcol j' + st.color + '">' + JCN[st.color] + "</div>" + (st.pend ? '<div class="jpend">+' + st.pend + "</div>" : "") + "</div>";
    var hand = "";
    if (st.hand) {
      var hn = st.hand.length, occ = {}, vw = window.innerWidth || 1000, cw = vw < 640 ? 70 : 96;
      var avail = vw < 640 ? vw - 24 : Math.min(760, vw - 330), step = Math.min(cw * 0.62, (avail - cw) / Math.max(hn - 1, 1));
      var rot = Math.min(3, 26 / Math.max(hn, 1)), gap = Math.max(3, step - 400 * Math.sin(rot * Math.PI / 180));
      hand = '<div class="jhand' + (mine ? " mine" : "") + '" style="--gap:' + gap.toFixed(1) + "px;--rot:" + rot.toFixed(2) + 'deg">' + st.hand.map(function (c, idx) {
        occ[c] = (occ[c] || 0) + 1;
        return '<div class="jslot" style="--o:' + (idx - (hn - 1) / 2).toFixed(2) + ";z-index:" + idx + '">' + jcard(c, mine ? (ok(c) ? " ok" : " dim") : "", ' data-jcard="' + c + '" data-fk="j:' + c + "#" + occ[c] + '" data-noenter="1" data-noexit="1"') + "</div>";
      }).join("") + "</div>";
    } else if (g.seat < 0) hand = '<p class="hint">Spectating</p>';
    var hint = g.phase === "playing" ? (mine && st.pend ? "+" + st.pend + " is coming your way! Stack another, or draw " + st.pend : mine ? (st.drew ? "Play the card you drew, or pass" : "Your turn! Match the color or symbol, or draw") : g.seat < 0 ? "" : "Waiting for " + nmOf(g, g.turn) + "…") : "";
    var ctrl = mine && st.drew ? '<div class="actions"><button class="btn dark" data-act="jpass">Pass</button></div>' : "";
    var picker = J.wild ? '<div class="modal"><div class="box jpick"><h2>Pick a color</h2><div class="jwheel">' + "RGBY".split("").map(function (c) { return '<button class="j' + c + '" data-act="jcolor" data-c="' + c + '">' + JCN[c] + "</button>"; }).join("") + '</div><button class="btn dark" data-act="jcolor" data-c="">Cancel</button></div></div>' : "";
    return '<div class="jtable">' + seats + center + (st.log ? '<div class="jlog">' + jlog(g, st.log) + "</div>" : "") + "</div>" + '<p class="hint jhint">' + hint + "</p>" + hand + ctrl + picker;
  }
  function junoOver(g) {
    var w = null; g.seats.forEach(function (s) { if (s.id === g.winner) w = s; });
    var won = w && w.id === S.you;
    return '<div class="modal"><div class="box"><div class="big">' + (won ? "🏆" : "🎴") + "</div><h2>" + (w ? (won ? "You win!" : esc(w.name) + " wins!") : "Game over") + "</h2>" + (g.seat >= 0 ? '<p class="xp">+' + (won ? 100 : 20) + " XP</p>" : "") +
      '<div class="actions">' + (g.seat >= 0 ? '<button class="btn primary" data-act="rematch">Play again</button>' : "") + '<button class="btn dark" data-act="back">Back to games</button><button class="btn dark" data-act="jpeek">See table</button></div></div></div>';
  }
  function junoAct(a, el) {
    var g = S.game; if (!g || g.type !== "clash" || !g.state) return;
    var mine = g.phase === "playing" && g.turn === g.seat;
    if (a === "jdraw") { if (mine && (!g.state.drew || g.state.pend)) send({ t: "move", action: "draw" }); else if (mine) toast("You already drew. Play it or pass"); }
    else if (a === "jpass") send({ t: "move", action: "pass" });
    else if (a === "jcolor") { var c = el.getAttribute("data-c"); if (c && J.wild) send({ t: "move", action: "play", card: J.wild, color: c }); else J.myRect = null; J.wild = null; render(); }
    else if (a === "jpeek") { J.peek = g.id; render(); }
  }
  app.addEventListener("click", function (e) {
    var el = e.target.closest(".jhand .jc"); if (!el) return;
    e.stopPropagation();
    var g = S.game; if (!g || g.type !== "clash" || !g.state) return;
    if (!(g.phase === "playing" && g.turn === g.seat)) { el.animate([{ transform: "translateX(0)" }, { transform: "translateX(-6px)" }, { transform: "translateX(6px)" }, { transform: "translateX(0)" }], { duration: 260 }); return; }
    var c = el.getAttribute("data-jcard"), st = g.state;
    if (!(st.pend ? c === "KF" || (st.top[1] === "D" && c[1] === "D") : c[0] === "K" || c[0] === st.color || c[1] === st.top[1])) { el.animate([{ transform: "translateX(0)" }, { transform: "translateX(-6px)" }, { transform: "translateX(6px)" }, { transform: "translateX(0)" }], { duration: 260 }); toast("That card doesn't match"); return; }
    J.myRect = el.getBoundingClientRect();
    if (c[0] === "K") { J.wild = c; render(); } else send({ t: "move", action: "play", card: c });
  }, true);
  var baseScreen = gameScreen;
  gameScreen = function (g) {
    if (g.type === "clash" && g.phase !== "lobby" && g.state) {
      if (g.now) skew = g.now - Date.now();
      var head = '<div class="ghead"><button class="ghost" data-act="leave">← ' + (g.seat >= 0 ? "Back" : "Games") + "</button><h2>" + art(g.type, true) + "Juno</h2><div class=\"gr\"></div></div>";
      return head + '<div class="gbody g-juno">' + junoScreen(g) + "</div>" + (g.phase === "over" && J.peek !== g.id ? junoOver(g) : "");
    }
    return baseScreen(g);
  };

  // ===== animation engine =====
  var EASE = "cubic-bezier(.2,.85,.25,1)";
  function rectOf(el) { return el ? el.getBoundingClientRect() : null; }
  function fly(el, from, opts) { // animate el from a previous rect to where it is now
    if (!el || !from || window.__gxCalm) return;
    var to = el.getBoundingClientRect(), dx = from.left + from.width / 2 - (to.left + to.width / 2), dy = from.top + from.height / 2 - (to.top + to.height / 2);
    var sc = opts && opts.scale != null ? opts.scale : from.width && to.width ? from.width / to.width : 1;
    var base = getComputedStyle(el).transform; base = base === "none" ? "" : base;
    var kf = [{ transform: "translate(" + dx + "px," + dy + "px) scale(" + sc + ") rotate(" + ((opts && opts.rot) || 0) + "deg) " + base }];
    if (opts && opts.arc) kf.push({ transform: "translate(" + dx / 2 + "px," + (dy / 2 - opts.arc) + "px) scale(" + (sc + 1) / 2 + ") " + base, offset: 0.5 });
    kf.push({ transform: base || "none" });
    el.animate(kf, { duration: (opts && opts.dur) || 420, easing: EASE, delay: (opts && opts.delay) || 0, fill: "backwards" });
  }
  function pop(el, delay, dur) { if (el && !window.__gxCalm) el.animate([{ transform: "scale(.3)", opacity: 0 }, { transform: "scale(1.15)", opacity: 1, offset: 0.65 }, { transform: "scale(1)", opacity: 1 }], { duration: dur || 340, easing: "ease-out", delay: delay || 0, fill: "backwards" }); }
  function burst(host, txt, cls) {
    if (!host || window.__gxCalm) return; var b = document.createElement("div"); b.className = "gx-burst " + (cls || ""); b.innerHTML = txt; host.appendChild(b); setTimeout(function () { b.remove(); }, 1100);
  }
  function ghostFly(fromRect, toEl, html, delay) { // a temporary card flying between two places on screen
    if (!fromRect || !toEl || window.__gxCalm) return;
    var to = toEl.getBoundingClientRect(), d = document.createElement("div");
    d.className = "gx-ghost"; d.innerHTML = html; d.style.left = fromRect.left + "px"; d.style.top = fromRect.top + "px";
    document.body.appendChild(d);
    var dx = to.left + to.width / 2 - (fromRect.left + 30), dy = to.top + to.height / 2 - (fromRect.top + 42);
    var an = d.animate([{ transform: "translate(0,0) scale(1) rotate(0)", opacity: 1 }, { transform: "translate(" + dx + "px," + dy + "px) scale(.45) rotate(" + (dx > 0 ? 20 : -20) + "deg)", opacity: 0.85 }], { duration: 480, easing: EASE, delay: delay || 0, fill: "both" });
    an.onfinish = function () { d.remove(); };
  }
  function confetti() {
    if (window.__gxCalm) return;
    var box = document.createElement("div"); box.className = "gx-confetti";
    for (var i = 0; i < 70; i++) { var p = document.createElement("i"); p.style.left = Math.random() * 100 + "%"; p.style.background = COLORS[i % COLORS.length]; p.style.animationDelay = Math.random() * 0.6 + "s"; p.style.animationDuration = 1.6 + Math.random() * 1.4 + "s"; p.style.transform = "rotate(" + Math.random() * 360 + "deg)"; box.appendChild(p); }
    document.body.appendChild(box); setTimeout(function () { box.remove(); }, 3600);
  }
  // give stable keys to things that move, so the engine can slide them between renders
  function keyAll() {
    var occ = {};
    app.querySelectorAll(".card[data-card]").forEach(function (el) { if (el.closest(".jtable,.jhand")) return; var c = el.getAttribute("data-card"); occ[c] = (occ[c] || 0) + 1; el.setAttribute("data-fk", "c:" + c + "#" + occ[c]); });
    var tk = {};
    app.querySelectorAll(".tok").forEach(function (el) { var c = (el.className.match(/\bc(\w+)/) || [])[1] || "x"; tk[c] = (tk[c] || 0) + 1; el.setAttribute("data-fk", "t:" + c + ":" + tk[c]); });
  }
  function snapshot() {
    var m = {}, n = 0;
    app.querySelectorAll("[data-fk]").forEach(function (el) { var k = el.getAttribute("data-fk"); (m[k] = m[k] || []).push({ r: el.getBoundingClientRect(), node: el }); n++; });
    return { map: m, n: n };
  }
  function flipAll(old, same) {
    var news = 0;
    app.querySelectorAll("[data-fk]").forEach(function (el) {
      var k = el.getAttribute("data-fk"), list = old.map[k];
      if (list && list.length) {
        var o = list.shift(), r = el.getBoundingClientRect();
        if (Math.abs(o.r.left - r.left) + Math.abs(o.r.top - r.top) > 3) fly(el, o.r, { scale: 1, arc: k[0] === "t" ? 26 : 0, dur: k[0] === "t" ? 520 : 440 });
      } else if (same && !el.hasAttribute("data-noenter") && news++ < 24) pop(el, news * 40, 380);
    });
    if (!same) return;
    var exits = 0;
    Object.keys(old.map).forEach(function (k) {
      old.map[k].forEach(function (o) {
        if (o.node.hasAttribute("data-noexit") || exits++ > 16 || !o.r.width) return;
        var gh = o.node.cloneNode(true); gh.removeAttribute("data-fk"); gh.classList.add("gx-exit");
        gh.style.cssText += ";position:fixed;margin:0;left:" + o.r.left + "px;top:" + o.r.top + "px;width:" + o.r.width + "px;height:" + o.r.height + "px;z-index:70;pointer-events:none";
        document.body.appendChild(gh);
        var an = gh.animate([{ opacity: 1, transform: "none" }, { opacity: 0, transform: "translateY(-18px) scale(.7)" }], { duration: 420, easing: "ease-in", fill: "forwards" });
        an.onfinish = function () { gh.remove(); };
      });
    });
  }
  // per-game effects, driven by what changed since the last render
  var P = { key: "", st: null, phase: "" };
  function q(sel) { return app.querySelector(sel); }
  function sqEl(i) { return q('[data-sq="' + i + '"]'); }
  function boardFx(g, st, pv) {
    var t = g.type, J2 = JSON.stringify;
    if ((t === "chess" || t === "checkers") && st.last && J2(st.last) !== J2(pv.last)) {
      var to = sqEl(st.last[1]), from = sqEl(st.last[0]), pc = to && to.querySelector(".pc,.ckp");
      if (pc && from) fly(pc, from.getBoundingClientRect(), { scale: 1, dur: 380, arc: t === "checkers" ? 18 : 0 });
    }
    if (t === "connect4" && st.last >= 0 && st.last !== pv.last) {
      var d = q(".c4 .disc[data-new]");
      if (d) { var cell = d.parentNode, dy = cell.offsetTop + cell.offsetHeight + 10; d.animate([{ transform: "translateY(" + -dy + "px)" }, { transform: "translateY(0)", offset: 0.7, easing: "ease-in" }, { transform: "translateY(-10%)", offset: 0.85 }, { transform: "translateY(0)" }], { duration: 360 + dy * 0.6, easing: "ease-in" }); }
    }
    if (t === "ttt" && pv.board) st.board.forEach(function (v, i) { if (v && !pv.board[i]) { var c = app.querySelectorAll(".ttt .tc")[i]; pop(c && c.querySelector(".mk")); } });
    if (t === "uttt" && st.last >= 0 && st.last !== pv.last) { var u = q(".uttt .uc.last .mk"); pop(u); }
    if (t === "reversi" && pv.board) {
      var cells = app.querySelectorAll(".rv .rc"), lr = Math.floor(st.last / 8), lc = st.last % 8;
      st.board.forEach(function (v, i) {
        var dsk = cells[i] && cells[i].querySelector(".rd"); if (!dsk) return;
        var dist = Math.max(Math.abs(Math.floor(i / 8) - lr), Math.abs((i % 8) - lc));
        if (i === st.last && !pv.board[i]) pop(dsk, 0, 300);
        else if (v && pv.board[i] && v !== pv.board[i]) dsk.animate([{ transform: "rotateY(0) scale(1)" }, { transform: "rotateY(90deg) scale(1.15)", offset: 0.5 }, { transform: "rotateY(0) scale(1)" }], { duration: 420, delay: 120 + dist * 70, easing: "ease-in-out", fill: "backwards" });
      });
    }
    if (t === "dots" && st.last && J2(st.last) !== J2(pv.last)) {
      var ln = q(".dots line.ln.last");
      if (ln) { var L = 90; ln.style.strokeDasharray = L; ln.animate([{ strokeDashoffset: L }, { strokeDashoffset: 0 }], { duration: 300, easing: "ease-out" }); }
      if (pv.box) { var bxs = app.querySelectorAll(".dots rect.bx"), kb = 0; st.box.forEach(function (v, i) { if (v < 0) return; if (pv.box[i] < 0) pop(bxs[kb], 200, 420); kb++; }); }
    }
    if (t === "mancala" && pv.pits && J2(st.pits) !== J2(pv.pits)) {
      var me = g.seat >= 0 ? g.seat : 0, op = 1 - me, map = {};
      var tops = app.querySelectorAll(".mancala .row-p:first-child .pit"), bots = app.querySelectorAll(".mancala .row-p:last-child .pit"), stores = app.querySelectorAll(".mancala .store");
      tops.forEach(function (el, k) { map[op * 7 + 5 - k] = el; }); bots.forEach(function (el, k) { map[me * 7 + k] = el; });
      if (stores[0]) map[op * 7 + 6] = stores[0]; if (stores[1]) map[me * 7 + 6] = stores[1];
      var start = st.from >= 0 ? st.from : 0;
      for (var s = 1; s <= 14; s++) {
        var idx = (start + s) % 14, el = map[idx];
        if (el && st.pits[idx] !== pv.pits[idx]) el.animate([{ transform: "scale(1)", filter: "brightness(1)" }, { transform: "scale(1.1)", filter: "brightness(1.6)" }, { transform: "scale(1)", filter: "brightness(1)" }], { duration: 360, delay: s * 90, easing: "ease-out" });
      }
    }
    if (t === "dice" && (st.rolls !== pv.rolls || J2(st.dice) !== J2(pv.dice)) && st.rolls > 0) {
      app.querySelectorAll(".dicebox .dface").forEach(function (d, i) { if (st.held && st.held[i]) return; d.animate([{ transform: "translateY(0) rotate(0)" }, { transform: "translateY(-40px) rotate(200deg) scale(1.1)", offset: 0.45 }, { transform: "translateY(0) rotate(360deg)" }], { duration: 560, delay: i * 60, easing: "cubic-bezier(.3,.7,.4,1)" }); });
    }
    if (t === "battleship" && st.last >= 0 && st.last !== pv.last && pv.phase === "battle") {
      var seas = app.querySelectorAll(".sea"), myShot = pv.turn === g.seat, board = myShot ? seas[1] : seas[0];
      var cell2 = board && board.querySelectorAll(".bc")[st.last];
      if (cell2) {
        cell2.animate([{ transform: "scale(2.2)", opacity: 0 }, { transform: "scale(.9)", opacity: 1, offset: 0.6 }, { transform: "scale(1)", opacity: 1 }], { duration: 420, easing: "ease-out" });
        if (cell2.classList.contains("hit") || cell2.classList.contains("sunk")) board.animate([{ transform: "translate(0,0)" }, { transform: "translate(-5px,3px)" }, { transform: "translate(5px,-3px)" }, { transform: "translate(-3px,2px)" }, { transform: "translate(0,0)" }], { duration: 380, delay: 200 });
      }
    }
    if (t === "liars" && (st.round !== pv.round)) app.querySelectorAll(".mydice .ld, .mydice .dface, .mydice > div > *").forEach(function (d, i) { d.animate([{ transform: "rotate(0)" }, { transform: "rotate(-25deg) translateY(-12px)" }, { transform: "rotate(20deg) translateY(-6px)" }, { transform: "rotate(0)" }], { duration: 520, delay: i * 50 }); });
  }
  function junoFx(g, st, pv) {
    var me = g.seat >= 0 ? g.seat : 0;
    var sig = st.log + "|" + st.deck + "|" + st.counts.join(",") + "|" + st.top;
    if (!J.sig) { J.sig = sig; J.hand = (st.hand || []).slice(); J.counts = st.counts.slice(); return; }
    if (sig === J.sig) return;
    J.sig = sig;
    var played = /^\{(\d+)\} played (\w\w)/.exec(st.log || ""), deckEl = q(".jdeck");
    var topEl = q(".jpile .jpc:last-child .jc");
    if (played && st.top === played[2] && (pv.log !== st.log || pv.top !== st.top)) {
      var p = +played[1], c = played[2];
      var src = p === g.seat && J.myRect ? J.myRect : rectOf(q('.jseat[data-seat="' + p + '"] .jfan'));
      if (topEl && src) fly(topEl, src, { dur: 520, rot: p === g.seat ? 0 : 160, arc: 40 });
      J.myRect = null;
      var v = c[1], center = q(".jcenter");
      setTimeout(function () {
        if (v === "S") burst(center, "⊘<small>SKIP</small>", "j" + c[0]);
        else if (v === "R") burst(center, "⇄<small>REVERSE</small>", "j" + c[0]);
        else if (v === "D") burst(center, "+2", "j" + c[0]);
        else if (v === "F") burst(center, "+4", "j" + st.color);
        else if (v === "W") burst(center, "★<small>" + JCN[st.color].toUpperCase() + "</small>", "j" + st.color);
      }, 380);
      if (st.counts[p] === 1) setTimeout(function () { var se = p === g.seat ? q(".jhand") : q('.jseat[data-seat="' + p + '"]'); burst(se, "JUNO!", "juno"); chime(990, 0.05); }, 600);
    }
    // cards drawn
    st.counts.forEach(function (cnt, i) {
      var was = J.counts[i] == null ? cnt : J.counts[i], add = cnt - was;
      if (add <= 0) return;
      if (i === g.seat && st.hand) {
        var prev = {}; J.hand.forEach(function (c) { prev[c] = (prev[c] || 0) + 1; });
        var k2 = 0;
        app.querySelectorAll(".jhand .jc").forEach(function (el) { var c = el.getAttribute("data-jcard"); if (prev[c]) prev[c]--; else if (deckEl) fly(el, deckEl.getBoundingClientRect(), { dur: 520, delay: 380 + k2++ * 110, rot: -12, arc: 30 }); });
      } else {
        var seat = q('.jseat[data-seat="' + i + '"] .jfan');
        for (var k = 0; k < Math.min(add, 6); k++) ghostFly(rectOf(deckEl), seat, jback(""), 380 + k * 110);
      }
    });
    J.hand = (st.hand || []).slice(); J.counts = st.counts.slice();
    void me;
  }

  // ===== render wrapper: snapshot -> render -> decorate -> animate =====
  var baseRender = render;
  render = function () {
    var old = snapshot(), g = S.game, shown = !!(g && gameShown());
    baseRender.apply(this, arguments);
    var key = shown ? g.id + ":" + g.type + ":" + (g.phase === "lobby" ? "lobby" : "game") : "page:" + S.view;
    var same = key === P.key;
    try {
      if (shown && g.phase !== "lobby") {
        if (g.now) skew = g.now - Date.now();
        var hd = q(".ghead"); if (hd) hd.insertAdjacentHTML("afterend", timerHtml(g));
        tickTimer();
      }
      keyAll();
      if (shown) { var gb = q(".gbody"); if (gb) gb.classList.add("g-" + g.type); }
      if (!same) { var ct = q(".content"); if (ct) ct.animate([{ opacity: 0, transform: "translateY(14px)" }, { opacity: 1, transform: "none" }], { duration: 320, easing: "ease-out" }); }
      flipAll(old, same && old.n < 120);
      if (shown && g.state && same && P.st) {
        if (g.type === "clash" && g.phase !== "lobby") junoFx(g, g.state, P.st); else boardFx(g, g.state, P.st);
      } else if (shown && g.type === "clash" && g.state) junoFx(g, g.state, {});
      if (shown && g.phase === "over" && P.phase === "playing") {
        var box = q(".modal .box"); pop(box, 250, 420);
        if (g.winner === S.you || (g.winners || []).indexOf(S.you) >= 0) confetti();
      }
      var ret = document.getElementById("gx-ret");
      if (S.table && S.peek && g) {
        if (!ret) { ret = document.createElement("div"); ret.id = "gx-ret"; document.body.appendChild(ret); }
        ret.innerHTML = art(g.type, true) + "<span>You're at the <b>" + esc(g.name) + "</b> table</span>" + '<button class="btn primary" data-gx="treturn">Return</button>';
      } else if (ret) ret.remove();
      turnFx(g);
      drawInvites();
      presence();
    } catch (er) { console.error("gamio fx", er); }
    P.key = key; P.phase = g ? g.phase : ""; P.st = g && g.state ? JSON.parse(JSON.stringify(g.state)) : null;
  };
})();

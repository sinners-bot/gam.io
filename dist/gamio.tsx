// GAM.IO pack: tables and invites, turn timers, your-turn glow, Juno table, animations. Loads last.
const JS: string = String.raw`// ---------- GAM.IO pack: tables + invites, turn timer + your-turn glow, Juno card table, animations (loads last) ----------
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
    var mine = !!(g && gameShown() && g.yourTurn && g.phase === "playing");
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

// ---------- GAM.IO look: illustrated game logos, brand mark, nicer pages (loads after the GAM.IO pack) ----------
(function () {
  // ===== small SVG helpers =====
  function L(id, a, b, x2, y2) { return '<linearGradient id="' + id + '" x1="0" y1="0" x2="' + (x2 == null ? 0 : x2) + '" y2="' + (y2 == null ? 1 : y2) + '"><stop offset="0" stop-color="' + a + '"/><stop offset="1" stop-color="' + b + '"/></linearGradient>'; }
  function R(id, a, b) { return '<radialGradient id="' + id + '" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="' + a + '"/><stop offset="1" stop-color="' + b + '"/></radialGradient>'; }
  // every logo gets the same finish: a soft bevel lit from the top left, a crisp rim and a contact shadow
  var FIN = '<filter id="gxFin" x="-15%" y="-15%" width="130%" height="135%" color-interpolation-filters="sRGB">' +
    '<feGaussianBlur in="SourceAlpha" stdDeviation="1.6" result="b"/>' +
    '<feSpecularLighting in="b" surfaceScale="2.6" specularConstant=".85" specularExponent="22" lighting-color="#ffffff" result="sp"><fePointLight x="24" y="-30" z="70"/></feSpecularLighting>' +
    '<feComposite in="sp" in2="SourceAlpha" operator="in" result="sp2"/>' +
    '<feGaussianBlur in="SourceAlpha" stdDeviation="2.2" result="ib"/><feOffset in="ib" dx="0" dy="-2.2" result="io"/><feComposite in="SourceAlpha" in2="io" operator="out" result="edge"/>' +
    '<feFlood flood-color="#000" flood-opacity=".28"/><feComposite in2="edge" operator="in" result="shade"/>' +
    '<feComposite in="SourceGraphic" in2="sp2" operator="arithmetic" k2="1" k3=".5" result="lit"/>' +
    '<feMerge result="m"><feMergeNode in="lit"/><feMergeNode in="shade"/></feMerge>' +
    '<feComposite in="m" in2="SourceAlpha" operator="in" result="clip"/>' +
    '<feDropShadow in="clip" dx="0" dy="2.5" stdDeviation="1.8" flood-color="#08051a" flood-opacity=".55"/></filter>';
  function svg(defs, body) {
    var sh = ""; if (body.indexOf(SH) === 0) { sh = '<ellipse cx="60" cy="110" rx="38" ry="6" fill="#000" opacity=".35" filter="blur(2px)"/>'; body = body.slice(SH.length); }
    return '<svg class="gx-ic" viewBox="0 0 120 120" aria-hidden="true"><defs>' + defs + FIN + "</defs>" + sh + '<g filter="url(#gxFin)">' + body + "</g></svg>";
  }
  var SH = '<ellipse cx="60" cy="109" rx="36" ry="5.5" fill="#000" opacity=".3"/>';
  var GL = function (x, y, rx, ry, rot) { return '<ellipse cx="' + x + '" cy="' + y + '" rx="' + rx + '" ry="' + ry + '" fill="#fff" opacity=".35"' + (rot ? ' transform="rotate(' + rot + " " + x + " " + y + ')"' : "") + "/>"; };
  var PIPS = { 1: [[0, 0]], 2: [[-1, -1], [1, 1]], 3: [[-1, -1], [0, 0], [1, 1]], 4: [[-1, -1], [1, -1], [-1, 1], [1, 1]], 5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]], 6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]] };
  function die(cx, cy, s, rot, fill, pip, n) {
    var h = s / 2, d = s * 0.27, out = '<g transform="rotate(' + rot + " " + cx + " " + cy + ')"><rect x="' + (cx - h) + '" y="' + (cy - h + 4) + '" width="' + s + '" height="' + s + '" rx="' + s * 0.2 + '" fill="#000" opacity=".25"/><rect x="' + (cx - h) + '" y="' + (cy - h) + '" width="' + s + '" height="' + s + '" rx="' + s * 0.2 + '" fill="url(#' + fill + ')"/>';
    PIPS[n].forEach(function (p) { out += '<circle cx="' + (cx + p[0] * d) + '" cy="' + (cy + p[1] * d) + '" r="' + s * 0.085 + '" fill="' + pip + '"/>'; });
    return out + '<rect x="' + (cx - h + 3) + '" y="' + (cy - h + 3) + '" width="' + (s - 6) + '" height="' + s * 0.3 + '" rx="' + s * 0.14 + '" fill="#fff" opacity=".25"/></g>';
  }
  function card(x, y, w, h, rot, fill, inner, stroke) {
    return '<g transform="rotate(' + rot + " " + (x + w / 2) + " " + (y + h / 2) + ')"><rect x="' + x + '" y="' + (y + 3) + '" width="' + w + '" height="' + h + '" rx="7" fill="#000" opacity=".28"/><rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="7" fill="' + fill + '"' + (stroke ? ' stroke="' + stroke + '" stroke-width="3"' : "") + "/>" + inner + "</g>";
  }
  var HEART = function (cx, cy, s, fill) { return '<path transform="translate(' + cx + " " + cy + ") scale(" + s + ')" d="M0 9C-9 2-14-3-14-9-14-14-10-17-6.5-17-3.5-17-1-15 0-12 1-15 3.5-17 6.5-17 10-17 14-14 14-9 14-3 9 2 0 9Z" fill="' + fill + '"/>'; };
  var SPADE = function (cx, cy, s, fill) { return '<path transform="translate(' + cx + " " + cy + ") scale(" + s + ')" d="M0-16C-5-9-14-4-14 3-14 8-10 11-6 11-3.5 11-1.5 10 0 8-.5 12-2 15-5 17H5C2 15 .5 12 0 8 1.5 10 3.5 11 6 11 10 11 14 8 14 3 14-4 5-9 0-16Z" fill="' + fill + '"/>'; };
  function chip(cx, cy, col) { return '<g><ellipse cx="' + cx + '" cy="' + (cy + 5) + '" rx="20" ry="7" fill="#000" opacity=".25"/><path d="M' + (cx - 20) + " " + cy + "v5a20 7 0 0 0 40 0v-5Z\" fill=\"" + col + '" filter="brightness(.7)"/><ellipse cx="' + cx + '" cy="' + cy + '" rx="20" ry="7" fill="' + col + '"/><ellipse cx="' + cx + '" cy="' + cy + '" rx="13" ry="4.5" fill="none" stroke="#fff" stroke-width="2.4" stroke-dasharray="4 4"/></g>'; }

  // ===== the logos =====
  var IC = {
    chess: function () {
      return svg(L("ch1", "#ffffff", "#cbbcf2") + L("ch2", "#5b4aa8", "#1b1340") + L("ch3", "#ffe27a", "#f0a72c"),
        SH + '<g transform="translate(26 14) scale(.78)"><path d="M78 92C80 78 84 72 84 68H92C92 72 96 78 98 92Z" fill="url(#ch2)"/><circle cx="88" cy="58" r="11" fill="url(#ch2)"/><rect x="72" y="91" width="32" height="10" rx="4" fill="url(#ch2)"/></g>' +
        '<rect x="34" y="92" width="52" height="12" rx="5" fill="url(#ch1)"/><ellipse cx="60" cy="90" rx="22" ry="5" fill="#e8defc"/><path d="M45 88C47 72 51 60 53 50H67C69 60 73 72 75 88Z" fill="url(#ch1)"/><ellipse cx="60" cy="50" rx="13" ry="4" fill="#efe7ff"/>' +
        '<path d="M46 46 42 26 52 36 60 19 68 36 78 26 74 46Z" fill="url(#ch1)"/><circle cx="42" cy="24" r="4.5" fill="url(#ch3)"/><circle cx="60" cy="17" r="5" fill="url(#ch3)"/><circle cx="78" cy="24" r="4.5" fill="url(#ch3)"/>' + GL(54, 66, 3, 14, 8));
    },
    checkers: function () {
      function pc(cx, cy, top, side, crown) {
        return '<path d="M' + (cx - 28) + " " + cy + "v11a28 10 0 0 0 56 0v-11Z\" fill=\"" + side + '"/><ellipse cx="' + cx + '" cy="' + cy + '" rx="28" ry="10" fill="url(#' + top + ')"/><ellipse cx="' + cx + '" cy="' + cy + '" rx="20" ry="7" fill="none" stroke="#fff" stroke-opacity=".3" stroke-width="2"/><ellipse cx="' + cx + '" cy="' + cy + '" rx="12" ry="4" fill="none" stroke="#000" stroke-opacity=".2" stroke-width="2"/>' + (crown ? '<path d="M' + (cx - 9) + " " + (cy + 1) + "l-2-8 6 4 5-7 5 7 6-4-2 8Z\" fill=\"#ffd84d\"/>" : "");
      }
      return svg(R("ck1", "#ff8aa0", "#d81e4a") + R("ck2", "#5d5878", "#16131f"), SH + pc(76, 78, "ck2", "#0c0a14") + pc(46, 86, "ck1", "#8f0f2c") + pc(46, 70, "ck1", "#8f0f2c") + pc(46, 54, "ck1", "#8f0f2c", 1));
    },
    connect4: function () {
      var holes = "", cols = ["#ff3b4f", "#ffcc33", 0, "#ffcc33", "#ff3b4f", "#ff3b4f", 0, "#ffcc33", "#ffcc33", "#ff3b4f", "#ff3b4f", "#ffcc33"];
      for (var r = 0; r < 3; r++) for (var c = 0; c < 4; c++) { var x = 32 + c * 19, y = 56 + r * 17, f = cols[r * 4 + c]; holes += '<circle cx="' + x + '" cy="' + y + '" r="7.5" fill="' + (f || "#141038") + '"/>' + (f ? '<circle cx="' + (x - 2) + '" cy="' + (y - 2.5) + '" r="2.5" fill="#fff" opacity=".45"/>' : ""); }
      return svg(L("c41", "#5b7bff", "#1f2fbf"), SH + '<rect x="18" y="44" width="84" height="58" rx="11" fill="url(#c41)"/><rect x="18" y="44" width="84" height="10" rx="6" fill="#fff" opacity=".18"/>' + holes +
        '<circle cx="51" cy="25" r="9" fill="#ffcc33"/><circle cx="48.5" cy="22" r="3" fill="#fff" opacity=".5"/><path d="M51 6v6M44 9l2 5M58 9l-2 5" stroke="#ffcc33" stroke-width="2.5" stroke-linecap="round" opacity=".7"/>');
    },
    reversi: function () {
      return svg(R("rv1", "#6b6780", "#0e0c16") + R("rv2", "#ffffff", "#cfcae0") + L("rv3", "#ffd84d", "#ff9f43"), SH +
        '<ellipse cx="46" cy="80" rx="30" ry="12" fill="#2a2638"/><ellipse cx="46" cy="74" rx="30" ry="12" fill="url(#rv1)"/>' + GL(38, 70, 10, 3) +
        '<g transform="rotate(-20 84 58)"><ellipse cx="84" cy="58" rx="9" ry="26" fill="#14121c"/><ellipse cx="81" cy="58" rx="9" ry="26" fill="url(#rv2)"/></g>' +
        '<path d="M28 46C38 22 66 16 84 28" fill="none" stroke="url(#rv3)" stroke-width="5" stroke-linecap="round"/><path d="M78 20l10 8-12 4Z" fill="#ff9f43"/>');
    },
    ttt: function () {
      return svg("", '<g stroke="#b05cff" stroke-width="5" stroke-linecap="round" opacity=".9"><path d="M46 18V102M74 18V102M18 46H102M18 74H102"/></g>' +
        '<g stroke="#ff4d8d" stroke-width="7" stroke-linecap="round" filter="drop-shadow(0 0 4px #ff4d8d)"><path d="M23 23 39 39M39 23 23 39M53 51 67 67M67 51 53 67"/></g>' +
        '<circle cx="88" cy="32" r="9" fill="none" stroke="#4dd4ff" stroke-width="6" style="filter:drop-shadow(0 0 4px #4dd4ff)"/><circle cx="32" cy="88" r="9" fill="none" stroke="#4dd4ff" stroke-width="6"/><path d="M81 81 95 95M95 81 81 95" stroke="#ff4d8d" stroke-width="7" stroke-linecap="round"/>' +
        '<path d="M22 22 98 98" stroke="#ffd84d" stroke-width="4" stroke-linecap="round" opacity=".85"/>');
    },
    uttt: function () {
      function mini(x, y, marks) {
        var s = '<g stroke="#ffffff" stroke-opacity=".55" stroke-width="1.6"><path d="M' + (x + 8) + " " + y + "v24M" + (x + 16) + " " + y + "v24M" + x + " " + (y + 8) + "h24M" + x + " " + (y + 16) + 'h24"/></g>';
        marks.forEach(function (m) { var cx = x + 4 + m[0] * 8, cy = y + 4 + m[1] * 8; s += m[2] ? '<circle cx="' + cx + '" cy="' + cy + '" r="2.6" fill="none" stroke="#4dd4ff" stroke-width="1.8"/>' : '<path d="M' + (cx - 2.5) + " " + (cy - 2.5) + "l5 5m0-5-5 5\" stroke=\"#ff4d8d\" stroke-width=\"1.8\" stroke-linecap=\"round\"/>"; });
        return s;
      }
      return svg("", '<g stroke="#ffd84d" stroke-width="4.5" stroke-linecap="round"><path d="M47 14V106M73 14V106M14 47H106M14 73H106"/></g>' +
        mini(18, 18, [[0, 0], [1, 1, 1], [2, 2]]) + mini(48, 48, [[1, 0, 1], [1, 1], [0, 2, 1]]) + mini(78, 78, [[2, 0], [0, 1, 1], [1, 2]]) + mini(78, 18, [[0, 0, 1]]) + mini(18, 78, [[2, 2]]));
    },
    dots: function () {
      var d = "", P = [24, 48, 72, 96];
      d += '<rect x="48" y="48" width="24" height="24" rx="3" fill="#ff4d8d" opacity=".85"/><text x="60" y="66" text-anchor="middle" font-size="15" font-weight="900" fill="#fff" font-family="system-ui">A</text>';
      d += '<g stroke-width="5" stroke-linecap="round"><path d="M48 48H72V72H48Z" stroke="#ff4d8d" fill="none"/><path d="M24 24H48M72 24V48M24 72V96M72 96H96" stroke="#4dd4ff"/><path d="M96 48V72" stroke="#ffd84d"/></g>';
      P.forEach(function (y) { P.forEach(function (x) { d += '<circle cx="' + x + '" cy="' + y + '" r="5" fill="#fff"/>'; }); });
      return svg("", d); 
    },
    mancala: function () {
      var m = ["#4dd4ff", "#ff4d8d", "#ffd84d", "#6dff9a", "#b05cff"], pits = "";
      for (var r = 0; r < 2; r++) for (var c = 0; c < 3; c++) {
        var x = 42 + c * 18, y = 52 + r * 22; pits += '<ellipse cx="' + x + '" cy="' + y + '" rx="7.5" ry="7" fill="#2a1409"/>';
        for (var k = 0; k < 2 + ((r + c) % 2); k++) pits += '<circle cx="' + (x - 2.5 + k * 3) + '" cy="' + (y + 1 - (k % 2) * 3) + '" r="2.6" fill="' + m[(r * 3 + c + k) % 5] + '"/>';
      }
      return svg(L("mc1", "#a8693b", "#5e3317"), SH + '<g transform="rotate(-8 60 63)"><rect x="12" y="38" width="96" height="50" rx="25" fill="#3a1d0b"/><rect x="12" y="34" width="96" height="50" rx="25" fill="url(#mc1)"/><rect x="18" y="38" width="84" height="12" rx="6" fill="#fff" opacity=".12"/>' +
        '<rect x="19" y="44" width="13" height="30" rx="6.5" fill="#2a1409"/><rect x="88" y="44" width="13" height="30" rx="6.5" fill="#2a1409"/><circle cx="25" cy="66" r="3" fill="#ffd84d"/><circle cx="94" cy="54" r="3" fill="#4dd4ff"/><circle cx="95" cy="62" r="3" fill="#ff4d8d"/>' + pits + "</g>");
    },
    dice: function () {
      return svg(L("dc1", "#ffffff", "#ddd5ff") + L("dc2", "#ff6b81", "#d0173f"), SH + die(44, 70, 42, -14, "dc1", "#2b1d63", 5) + die(80, 56, 36, 16, "dc2", "#fff", 3) + '<path d="M96 22l3 7 7 3-7 3-3 7-3-7-7-3 7-3Z" fill="#ffd84d"/>');
    },
    liars: function () {
      return svg(L("lc1", "#b8432f", "#5e1610") + L("lc2", "#ffffff", "#ddd5ff"), SH + die(30, 92, 22, -18, "lc2", "#2b1d63", 6) + die(90, 94, 20, 20, "lc2", "#2b1d63", 2) +
        '<path d="M34 34H86L96 96H24Z" fill="url(#lc1)"/><ellipse cx="60" cy="34" rx="26" ry="6" fill="#d9634c"/><ellipse cx="60" cy="96" rx="36" ry="7" fill="#7a2115"/><path d="M36 52H84M33 70H87" stroke="#ffd84d" stroke-width="3" opacity=".7"/><path d="M40 40 33 92" stroke="#fff" stroke-width="5" opacity=".18" stroke-linecap="round"/>' +
        '<circle cx="92" cy="22" r="13" fill="#fff"/><path d="M86 33l-4 6 9-4Z" fill="#fff"/><text x="92" y="28" text-anchor="middle" font-size="18" font-weight="900" fill="#7c4dff" font-family="system-ui">?</text>');
    },
    battleship: function () {
      return svg(L("bs1", "#cfd6e8", "#7d89a6") + L("bs2", "#2f8cff", "#0b3d91"), '<path d="M6 92Q18 86 30 92T54 92T78 92T102 92T126 92V116H6Z" fill="url(#bs2)"/>' +
        '<path d="M12 74H108L96 92H22Z" fill="url(#bs1)"/><path d="M22 92H96L99 87H19Z" fill="#c23a45"/><rect x="44" y="56" width="30" height="18" rx="3" fill="#e9edf6"/><rect x="52" y="44" width="12" height="14" rx="2" fill="#bcc5da"/><rect x="56" y="32" width="3" height="14" fill="#6b7896"/><path d="M59 32h12l-4 4 4 4H59Z" fill="#ff4d8d"/>' +
        '<g fill="#59647f"><rect x="24" y="66" width="14" height="8" rx="3"/><rect x="80" y="66" width="14" height="8" rx="3"/></g><path d="M37 69H48M93 69h10" stroke="#3b4459" stroke-width="3"/>' +
        '<g stroke="#ff4d6d" stroke-width="3" fill="none" opacity=".95"><circle cx="94" cy="24" r="12"/><path d="M94 6v10M94 32v10M76 24h10M102 24h10"/></g><circle cx="94" cy="24" r="3" fill="#ff4d6d"/><path d="M14 100Q30 96 40 100" stroke="#fff" stroke-width="2.5" opacity=".5" fill="none"/>');
    },
    crazy8: function () {
      var c1 = '<text x="42" y="70" text-anchor="middle" font-size="40" font-weight="900" fill="#1b1442" font-family="Georgia,serif">8</text>' + SPADE(42, 84, 0.5, "#1b1442") + '<text x="25" y="44" font-size="11" font-weight="900" fill="#1b1442" font-family="system-ui">8</text>';
      var c2 = '<text x="78" y="70" text-anchor="middle" font-size="40" font-weight="900" fill="#e8335a" font-family="Georgia,serif">8</text>' + HEART(78, 84, 0.5, "#e8335a") + '<text x="61" y="44" font-size="11" font-weight="900" fill="#e8335a" font-family="system-ui">8</text>';
      return svg("", SH + card(20, 30, 44, 66, -14, "#fff", c1) + card(56, 28, 44, 66, 12, "#fff8ec", c2));
    },
    clash: function () {
      function jc(x, y, rot, col, sym) {
        return card(x, y, 40, 60, rot, col, '<rect x="' + (x + 3) + '" y="' + (y + 3) + '" width="34" height="54" rx="5" fill="none" stroke="#fff" stroke-width="2.5"/><rect x="' + (x + 9) + '" y="' + (y + 19) + '" width="22" height="22" rx="6" fill="#fff" transform="rotate(45 ' + (x + 20) + " " + (y + 30) + ')"/>' + sym);
      }
      return svg('<linearGradient id="jw" x1="0" y1="0" x2="1" y2="1"><stop offset=".25" stop-color="#ff3b4f"/><stop offset=".25" stop-color="#2f7dff"/><stop offset=".5" stop-color="#2f7dff"/><stop offset=".5" stop-color="#21c45e"/><stop offset=".75" stop-color="#21c45e"/><stop offset=".75" stop-color="#ffbf1a"/></linearGradient>',
        SH + jc(16, 34, -20, "#2f7dff", '<text x="36" y="70" text-anchor="middle" font-size="18" font-weight="900" fill="#2f7dff" font-family="system-ui">7</text>') +
        jc(70, 34, 18, "#ffbf1a", '<text x="90" y="70" text-anchor="middle" font-size="17" font-weight="900" fill="#e09a00" font-family="system-ui">⇄</text>') +
        jc(40, 26, 0, "#ff3b4f", '<text x="60" y="62" text-anchor="middle" font-size="17" font-weight="900" fill="#ff3b4f" font-family="system-ui">+2</text>'));
    },
    hearts: function () {
      return svg(R("hh1", "#ff8aa8", "#e0103f"), SH + card(30, 26, 54, 76, -8, "#fff", HEART(57, 66, 1.35, "url(#hh1)") + '<text x="37" y="42" font-size="13" font-weight="900" fill="#e8335a" font-family="system-ui">A</text>') +
        HEART(96, 30, 0.7, "#ff4d8d") + HEART(22, 22, 0.45, "#ff8ab0"));
    },
    spades: function () {
      return svg(L("sp1", "#5a5a7a", "#0f0d1c"), SH + card(16, 34, 40, 60, -14, "#3a2a8f", '<rect x="21" y="39" width="30" height="50" rx="4" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="2"/>') +
        card(38, 24, 54, 78, 8, "#fff", SPADE(65, 64, 1.35, "url(#sp1)") + '<text x="45" y="40" font-size="13" font-weight="900" fill="#1b1442" font-family="system-ui">A</text>'));
    },
    poker: function () {
      return svg("", SH + card(48, 18, 40, 58, 14, "#fff", '<text x="56" y="36" font-size="12" font-weight="900" fill="#e8335a" font-family="system-ui">K</text>' + HEART(68, 52, 0.75, "#e8335a")) +
        card(30, 20, 40, 58, -10, "#fff", '<text x="37" y="38" font-size="12" font-weight="900" fill="#1b1442" font-family="system-ui">A</text>' + SPADE(50, 52, 0.75, "#1b1442")) +
        chip(40, 96, "#ff3b4f") + chip(40, 88, "#2f7dff") + chip(40, 80, "#ff3b4f") + chip(80, 98, "#21c45e") + chip(80, 90, "#ffbf1a"));
    },
    cheat: function () {
      return svg(L("ct1", "#5b3df0", "#2a1886") + L("ct2", "#ffe27a", "#f0a72c"), SH + card(58, 30, 42, 62, 14, "#fff", '<text x="79" y="70" text-anchor="middle" font-size="26" font-weight="900" fill="#e8335a" font-family="Georgia,serif">Q</text>') +
        card(22, 28, 44, 66, -10, "url(#ct1)", '<text x="44" y="72" text-anchor="middle" font-size="34" font-weight="900" fill="#fff" font-family="system-ui">?</text>') +
        '<path d="M28 18C40 10 54 14 60 20 66 14 80 10 92 18 90 30 78 34 68 30 64 28 62 26 60 26 58 26 56 28 52 30 42 34 30 30 28 18Z" fill="url(#ct2)"/><ellipse cx="44" cy="22" rx="7" ry="4" fill="#1b1442"/><ellipse cx="76" cy="22" rx="7" ry="4" fill="#1b1442"/>');
    },
    pool: function () {
      return svg(R("pl1", "#5a5a6a", "#050508") + R("pl2", "#ffffff", "#d9d4e8") + L("pl3", "#f3d39a", "#8a5a2b", 1, 0) + '<clipPath id="pl4"><circle cx="84" cy="54" r="19"/></clipPath>', SH +
        '<rect x="-4" y="90" width="92" height="6" rx="3" fill="url(#pl3)" transform="rotate(-32 40 93)"/>' +
        '<circle cx="84" cy="54" r="19" fill="url(#pl2)"/><rect x="62" y="44" width="44" height="20" fill="#ffbf1a" clip-path="url(#pl4)"/><circle cx="84" cy="54" r="6.5" fill="#fff"/><text x="84" y="58" text-anchor="middle" font-size="9" font-weight="900" fill="#1b1442" font-family="system-ui">9</text>' +
        '<circle cx="50" cy="66" r="26" fill="url(#pl1)"/><circle cx="50" cy="64" r="11" fill="#fff"/><text x="50" y="69.5" text-anchor="middle" font-size="15" font-weight="900" fill="#111" font-family="system-ui">8</text>' + GL(40, 52, 8, 4, -30));
    },
    ludo: function () {
      return svg(R("ld1", "#ff8aa0", "#c8102e"), SH + '<g transform="rotate(-6 60 66)"><rect x="18" y="26" width="84" height="80" rx="10" fill="#f3efff"/>' +
        '<rect x="22" y="30" width="32" height="32" rx="6" fill="#ff4d6d"/><rect x="66" y="30" width="32" height="32" rx="6" fill="#21c45e"/><rect x="22" y="70" width="32" height="32" rx="6" fill="#2f7dff"/><rect x="66" y="70" width="32" height="32" rx="6" fill="#ffbf1a"/>' +
        '<path d="M54 62 60 56 66 62 60 68Z" fill="#7c4dff"/><circle cx="38" cy="46" r="8" fill="#fff" opacity=".85"/><circle cx="82" cy="86" r="8" fill="#fff" opacity=".85"/></g>' +
        '<path d="M48 96C50 78 55 70 55 64H65C65 70 70 78 72 96Z" fill="url(#ld1)"/><circle cx="60" cy="54" r="11" fill="url(#ld1)"/><ellipse cx="60" cy="96" rx="14" ry="4.5" fill="#8f0f2c"/>' + GL(56, 50, 3.5, 2.5));
    },
    spymaster: function () {
      var t = "", C = ["#ff4d6d", "#f1e4c8", "#2f7dff", "#2f7dff", "#ff4d6d", "#f1e4c8", "#f1e4c8", "#2f7dff", "#ff4d6d"];
      for (var i = 0; i < 9; i++) t += '<rect x="' + (20 + (i % 3) * 28) + '" y="' + (46 + Math.floor(i / 3) * 20) + '" width="24" height="16" rx="4" fill="' + C[i] + '"/>';
      return svg(L("sm1", "#3b3650", "#14121e"), SH + t + '<ellipse cx="60" cy="40" rx="40" ry="8" fill="url(#sm1)"/><path d="M38 40C38 24 44 14 60 14S82 24 82 40Z" fill="url(#sm1)"/><path d="M38 34H82V40H38Z" fill="#c8102e"/>' + GL(52, 22, 6, 3, -20));
    },
    spy: function () {
      return svg(L("sy1", "#3b3650", "#100e18") + L("sy2", "#b49bff", "#6b4fd8"), SH + '<path d="M26 108C28 86 40 78 60 78S92 86 94 108Z" fill="url(#sy1)"/><path d="M50 78 60 96 70 78Z" fill="#f1e4c8"/>' +
        '<ellipse cx="60" cy="58" rx="20" ry="23" fill="url(#sy2)"/><ellipse cx="60" cy="36" rx="38" ry="7" fill="url(#sy1)"/><path d="M40 36C40 20 46 10 60 10S80 20 80 36Z" fill="url(#sy1)"/><path d="M40 30H80V36H40Z" fill="#7c4dff"/>' +
        '<rect x="40" y="52" width="17" height="10" rx="4" fill="#111"/><rect x="63" y="52" width="17" height="10" rx="4" fill="#111"/><path d="M57 55h6" stroke="#111" stroke-width="3"/><path d="M43 54l6 0" stroke="#fff" stroke-width="2" opacity=".6"/><path d="M66 54h6" stroke="#fff" stroke-width="2" opacity=".6"/>');
    },
    mafia: function () {
      return svg(L("mf1", "#ff4d6d", "#8f0f2c") + R("mf2", "#fff3b0", "#f0b52c"), '<path d="M86 12A26 26 0 1 0 108 48 20 20 0 1 1 86 12Z" fill="url(#mf2)"/><path d="M20 22l1.5 4 4 1.5-4 1.5L20 33l-1.5-4-4-1.5 4-1.5ZM40 14l1 3 3 1-3 1-1 3-1-3-3-1 3-1Z" fill="#fff" opacity=".8"/>' + SH +
        '<path d="M14 66C24 52 46 52 60 62 74 52 96 52 106 66 102 84 84 90 72 82 66 78 62 76 60 76 58 76 54 78 48 82 36 90 18 84 14 66Z" fill="url(#mf1)"/><path d="M14 66C24 52 46 52 60 62 74 52 96 52 106 66" fill="none" stroke="#ffd84d" stroke-width="3"/>' +
        '<ellipse cx="38" cy="70" rx="10" ry="6" fill="#140b1e"/><ellipse cx="82" cy="70" rx="10" ry="6" fill="#140b1e"/><path d="M104 64 114 58M106 70 116 72" stroke="#ffd84d" stroke-width="3" stroke-linecap="round"/>');
    },
    draw: function () {
      return svg(L("dr1", "#fff6e6", "#e8d2a8") + L("dr2", "#ffd84d", "#ff9f43", 1, 0), SH + '<path d="M60 22C88 22 106 40 104 60 103 74 90 72 84 76 76 82 86 96 72 102 46 110 16 92 16 64 16 40 34 22 60 22Z" fill="url(#dr1)"/><circle cx="48" cy="86" r="8" fill="#2a1a40" opacity=".2"/>' +
        '<circle cx="40" cy="46" r="8" fill="#ff3b4f"/><circle cx="62" cy="38" r="8" fill="#ffbf1a"/><circle cx="84" cy="48" r="8" fill="#21c45e"/><circle cx="34" cy="68" r="8" fill="#2f7dff"/><circle cx="56" cy="62" r="7" fill="#b05cff"/>' +
        '<g transform="rotate(38 84 82)"><rect x="80" y="54" width="9" height="42" rx="4" fill="url(#dr2)"/><rect x="80" y="92" width="9" height="8" fill="#c9ccd8"/><path d="M80 100h9l-4.5 14Z" fill="#ff4d8d"/></g>');
    },
    trivia: function () {
      return svg(R("tv1", "#fffbe0", "#ffc83d"), '<g stroke="#ffd84d" stroke-width="4" stroke-linecap="round" opacity=".8"><path d="M60 6v9M24 20l7 6M96 20l-7 6M12 54h9M99 54h9"/></g>' + SH +
        '<path d="M60 22C78 22 90 36 90 52 90 64 82 70 78 78 76 82 76 86 76 88H44C44 86 44 82 42 78 38 70 30 64 30 52 30 36 42 22 60 22Z" fill="url(#tv1)" style="filter:drop-shadow(0 0 12px #ffd84daa)"/>' +
        '<rect x="44" y="88" width="32" height="8" rx="3" fill="#a8a6c0"/><rect x="46" y="96" width="28" height="7" rx="3" fill="#8c8aa6"/><rect x="52" y="103" width="16" height="5" rx="2.5" fill="#6d6b88"/>' +
        '<text x="60" y="68" text-anchor="middle" font-size="34" font-weight="900" fill="#7c4dff" font-family="system-ui">?</text>' + GL(46, 38, 6, 10, 30));
    },
    wordhunt: function () {
      var L3 = ["W", "O", "R", "A", "D", "S", "H", "U", "N"], t = "", path = [0, 1, 2, 5];
      for (var i = 0; i < 9; i++) { var x = 18 + (i % 3) * 30, y = 22 + Math.floor(i / 3) * 30, on = path.indexOf(i) >= 0; t += '<rect x="' + x + '" y="' + (y + 3) + '" width="26" height="26" rx="6" fill="#000" opacity=".25"/><rect x="' + x + '" y="' + y + '" width="26" height="26" rx="6" fill="' + (on ? "#ffd84d" : "#f6ecd6") + '"/><text x="' + (x + 13) + '" y="' + (y + 19) + '" text-anchor="middle" font-size="16" font-weight="900" fill="' + (on ? "#7a3d00" : "#5b4a8f") + '" font-family="system-ui">' + L3[i] + "</text>"; }
      return svg("", t + '<path d="M100 92l10 4-6 3-2 6Z" fill="#ff4d8d"/>');
    },
    bomb: function () {
      return svg(R("bm1", "#6b6780", "#0e0c16") + L("bm2", "#ffd84d", "#ff7a2f"), SH + '<circle cx="56" cy="70" r="34" fill="url(#bm1)"/><rect x="66" y="26" width="18" height="16" rx="4" fill="#3b3650" transform="rotate(35 75 34)"/><path d="M82 26q10-16 22-10" fill="none" stroke="#c9a46a" stroke-width="4" stroke-linecap="round"/>' +
        '<g><circle cx="104" cy="16" r="7" fill="url(#bm2)"/><path d="M104 3v6M104 23v6M91 16h6M111 16h6M95 7l4 4M113 25l-4-4M113 7l-4 4M95 25l4-4" stroke="#ffd84d" stroke-width="2.5" stroke-linecap="round"/></g>' + GL(42, 54, 10, 6, -30) +
        '<rect x="30" y="62" width="52" height="22" rx="8" fill="#fff" transform="rotate(-6 56 73)"/><text x="56" y="79" text-anchor="middle" font-size="16" font-weight="900" fill="#ff4d6d" font-family="system-ui" transform="rotate(-6 56 73)">ING</text>');
    },
    typing: function () {
      var k = "", rows = [[0, 9], [6, 9], [14, 8]];
      rows.forEach(function (r, ri) { for (var i = 0; i < r[1]; i++) k += '<rect x="' + (16 + r[0] + i * 10) + '" y="' + (58 + ri * 12) + '" width="8" height="9" rx="2" fill="' + ((ri * 9 + i) % 7 === 3 ? "#ffd84d" : "#e8e1ff") + '"/>'; });
      return svg(L("ty1", "#4a3aa8", "#1d1452"), SH + '<rect x="10" y="50" width="100" height="50" rx="10" fill="url(#ty1)"/><rect x="10" y="50" width="100" height="8" rx="4" fill="#fff" opacity=".15"/>' + k + '<rect x="34" y="90" width="52" height="7" rx="3" fill="#e8e1ff"/>' +
        '<g stroke="#4dd4ff" stroke-width="4" stroke-linecap="round"><path d="M18 24h30M10 34h22M24 42h16"/></g><path d="M62 16l30 0-4 10h-30z" fill="#ff4d8d"/><text x="77" y="25" text-anchor="middle" font-size="9" font-weight="900" fill="#fff" font-family="system-ui">WPM</text>');
    },
    mines: function () {
      var g = "";
      for (var i = 0; i < 16; i++) { var x = 14 + (i % 4) * 24, y = 22 + Math.floor(i / 4) * 22, open = [1, 2, 5, 6, 9, 13].indexOf(i) >= 0; g += '<rect x="' + x + '" y="' + y + '" width="22" height="20" rx="4" fill="' + (open ? "#1d1452" : "#7c6bdb") + '"/>' + (open ? '<text x="' + (x + 11) + '" y="' + (y + 15) + '" text-anchor="middle" font-size="12" font-weight="900" fill="' + ["#4dd4ff", "#3ddc84", "#ff6b81"][i % 3] + '" font-family="system-ui">' + (1 + (i % 3)) + "</text>" : ""); }
      return svg(R("mn1", "#5d5878", "#0d0b16"), SH + g + '<g transform="translate(78 74)"><path d="M0-24V24M-24 0H24M-17-17 17 17M-17 17 17-17" stroke="#2b2840" stroke-width="5" stroke-linecap="round"/><circle r="16" fill="url(#mn1)"/><circle cx="-5" cy="-5" r="4" fill="#fff" opacity=".6"/></g><path d="M30 28v26" stroke="#3b3650" stroke-width="3"/><path d="M31 28l16 6-16 6z" fill="#ff4d6d"/>');
    },
    snake: function () {
      return svg(L("snk", "#6dff9a", "#1fb86a") + R("sna", "#ff8aa0", "#d81e4a"), SH + '<path d="M24 92C14 92 14 74 26 74H84C98 74 98 54 84 54H40C26 54 26 34 40 34H70" fill="none" stroke="url(#snk)" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"/>' +
        '<circle cx="74" cy="34" r="12" fill="#3ddc84"/><circle cx="78" cy="30" r="3.5" fill="#fff"/><circle cx="79" cy="30" r="1.8" fill="#111"/><path d="M86 36l8 2-8 3" fill="none" stroke="#ff4d6d" stroke-width="2.5" stroke-linecap="round"/>' +
        '<circle cx="96" cy="92" r="12" fill="url(#sna)"/><path d="M96 80c0-6 4-8 8-8" stroke="#3ddc84" stroke-width="3" fill="none"/><ellipse cx="91" cy="88" rx="3" ry="4" fill="#fff" opacity=".4"/>');
    },
    backgammon: function () {
      var t = ""; for (var i = 0; i < 6; i++) { t += '<path d="M' + (16 + i * 15) + ' 26l7.5 30 7.5-30z" fill="' + (i % 2 ? "#b0422f" : "#e8c890") + '"/><path d="M' + (16 + i * 15) + ' 98l7.5-30 7.5 30z" fill="' + (i % 2 ? "#e8c890" : "#b0422f") + '"/>'; }
      return svg(R("bgw", "#ffffff", "#bfb6e0") + R("bgb", "#7a6bb8", "#120d2e"), SH + '<rect x="10" y="20" width="100" height="84" rx="10" fill="#5c3a20"/><rect x="14" y="24" width="92" height="76" rx="6" fill="#1f5a3a"/>' + t +
        '<circle cx="31" cy="90" r="7" fill="url(#bgw)"/><circle cx="31" cy="78" r="7" fill="url(#bgw)"/><circle cx="76" cy="34" r="7" fill="url(#bgb)"/><circle cx="76" cy="46" r="7" fill="url(#bgb)"/>' +
        '<g transform="rotate(-12 58 62)"><rect x="46" y="50" width="22" height="22" rx="5" fill="#fff"/><circle cx="52" cy="56" r="2.4" fill="#2b1d63"/><circle cx="62" cy="66" r="2.4" fill="#2b1d63"/><circle cx="57" cy="61" r="2.4" fill="#2b1d63"/></g>');
    },
    gin: function () {
      return svg("", SH + card(14, 36, 36, 54, -18, "#fff", '<text x="22" y="52" font-size="11" font-weight="900" fill="#e8335a" font-family="system-ui">7</text>' + HEART(32, 70, 0.6, "#e8335a")) +
        card(34, 30, 36, 54, -6, "#fff", '<text x="42" y="46" font-size="11" font-weight="900" fill="#e8335a" font-family="system-ui">8</text>' + HEART(52, 64, 0.6, "#e8335a")) +
        card(54, 28, 36, 54, 6, "#fff", '<text x="62" y="44" font-size="11" font-weight="900" fill="#e8335a" font-family="system-ui">9</text>' + HEART(72, 62, 0.6, "#e8335a")) +
        '<rect x="52" y="88" width="56" height="22" rx="11" fill="#3ddc84"/><text x="80" y="104" text-anchor="middle" font-size="14" font-weight="900" fill="#06301a" font-family="system-ui">GIN!</text>');
    },
  };
  // ===== redrawn logos: chunkier, more depth =====
  function slab(x, y, w, h, r, top, side, d) { return '<rect x="' + x + '" y="' + (y + d) + '" width="' + w + '" height="' + h + '" rx="' + r + '" fill="' + side + '"/><rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="' + r + '" fill="' + top + '"/>'; }
  function bigX(cx, cy, s, g) { return '<g transform="translate(' + cx + " " + cy + ") scale(" + s + ')"><path d="M-14-20 0-6 14-20 20-14 6 0 20 14 14 20 0 6-14 20-20 14-6 0-20-14Z" fill="#a3124a" transform="translate(0 3)"/><path d="M-14-20 0-6 14-20 20-14 6 0 20 14 14 20 0 6-14 20-20 14-6 0-20-14Z" fill="url(#' + g + ')"/></g>'; }
  function bigO(cx, cy, s, g) { return '<g transform="translate(' + cx + " " + cy + ") scale(" + s + ')"><circle cy="3" r="15" fill="none" stroke="#0b6f8f" stroke-width="10"/><circle r="15" fill="none" stroke="url(#' + g + ')" stroke-width="10"/></g>'; }
  IC.ttt = function () {
    return svg(L("t1", "#4a3aa8", "#24185e") + L("tx", "#ff8ab5", "#ff2f74") + L("to", "#8af0ff", "#1fb8e6"),
      SH + slab(14, 16, 92, 86, 18, "url(#t1)", "#140c3a", 7) +
      '<g stroke="#8f7cff" stroke-width="5" stroke-linecap="round" opacity=".9"><path d="M45 24v70M75 24v70M22 47h76M22 71h76"/></g>' +
      bigX(33, 35, 0.62, "tx") + bigO(87, 35, 0.6, "to") + bigX(60, 59, 0.62, "tx") + bigO(33, 83, 0.6, "to") + bigX(87, 83, 0.62, "tx") +
      '<path d="M24 25 96 93" stroke="#ffd84d" stroke-width="5" stroke-linecap="round" opacity=".95"/>');
  };
  IC.uttt = function () {
    var g = "", k, i;
    for (k = 0; k < 9; k++) {
      var bx = 16 + (k % 3) * 30, by = 14 + Math.floor(k / 3) * 30;
      g += slab(bx, by, 26, 26, 6, k === 4 ? "url(#u2)" : "url(#u1)", "#0d0a2e", 3);
      g += '<g stroke="#ffffff38" stroke-width="1.4"><path d="M' + (bx + 9) + " " + (by + 3) + "v20M" + (bx + 17) + " " + (by + 3) + "v20M" + (bx + 3) + " " + (by + 9) + "h20M" + (bx + 3) + " " + (by + 17) + 'h20"/></g>';
      for (i = 0; i < 9; i++) if ((k * 7 + i * 3) % 5 === 0) { var cx = bx + 5 + (i % 3) * 8, cy = by + 5 + Math.floor(i / 3) * 8; g += (i + k) % 2 ? '<circle cx="' + cx + '" cy="' + cy + '" r="2.3" fill="none" stroke="#5ee0ff" stroke-width="1.6"/>' : '<path d="M' + (cx - 2) + " " + (cy - 2) + "l4 4m0-4-4 4" + '" stroke="#ff5c93" stroke-width="1.8" stroke-linecap="round"/>'; }
    }
    return svg(L("u1", "#3b2f8f", "#1d1652") + L("u2", "#ffe27a", "#f0a72c") + L("ux", "#ff8ab5", "#ff2f74"), SH + g + bigX(60, 57, 0.68, "ux"));
  };
  IC.dots = function () {
    var d = "", x, y;
    for (y = 0; y < 4; y++) for (x = 0; x < 4; x++) d += '<circle cx="' + (24 + x * 24) + '" cy="' + (20 + y * 24) + '" r="5.5" fill="url(#dd)"/>';
    return svg(R("dd", "#ffffff", "#b9b0e8") + L("db1", "#ff7aa8", "#e8336d") + L("db2", "#7ae6ff", "#1fa8e6"),
      SH + '<rect x="24" y="20" width="24" height="24" fill="url(#db1)"/><rect x="72" y="44" width="24" height="24" fill="url(#db2)"/><rect x="48" y="68" width="24" height="24" fill="url(#db1)"/>' +
      '<text x="36" y="38" text-anchor="middle" font-size="15" font-weight="900" fill="#fff" font-family="system-ui">A</text><text x="84" y="62" text-anchor="middle" font-size="15" font-weight="900" fill="#fff" font-family="system-ui">B</text><text x="60" y="86" text-anchor="middle" font-size="15" font-weight="900" fill="#fff" font-family="system-ui">A</text>' +
      '<g stroke-width="6" stroke-linecap="round" fill="none"><path d="M24 20H48V44H24Z M48 68H72V92H48Z" stroke="#ff4d8d"/><path d="M72 44H96V68H72Z M24 68V92 M72 20H96" stroke="#2ec8ff"/><path d="M48 44V68" stroke="#ffd84d" stroke-dasharray="3 7"/></g>' + d);
  };
  IC.typing = function () {
    var k = "", r, i, rows = [[22, 9, 0], [26, 8, 1], [32, 7, 2]];
    rows.forEach(function (rw) { for (i = 0; i < rw[1]; i++) { var x = rw[0] + i * 9.4, y = 58 + rw[2] * 11, hot = (rw[2] === 1 && i === 3) || (rw[2] === 0 && i === 6); k += '<rect x="' + x + '" y="' + (y + 2.2) + '" width="8" height="8.5" rx="2" fill="' + (hot ? "#c77a00" : "#9d93cf") + '"/><rect x="' + x + '" y="' + y + '" width="8" height="8.5" rx="2" fill="' + (hot ? "#ffd84d" : "#f4f1ff") + '"/>'; } });
    return svg(L("kb", "#5b4ad0", "#2b1f7a") + L("bolt", "#fff3a6", "#ffb800"),
      SH + '<g transform="rotate(-8 60 74)">' + slab(14, 50, 92, 48, 11, "url(#kb)", "#160f45", 7) + k + '<rect x="40" y="91" width="40" height="5" rx="2.5" fill="#f4f1ff"/></g>' +
      '<path d="M74 6 50 42h14l-8 26 28-38H70l10-24Z" fill="#c77a00" transform="translate(1 3)"/><path d="M74 6 50 42h14l-8 26 28-38H70l10-24Z" fill="url(#bolt)"/>' +
      '<g stroke="#7ae6ff" stroke-width="4" stroke-linecap="round"><path d="M14 22h22M8 32h24M16 42h14"/></g>');
  };
  IC.mines = function () {
    var t = "", i;
    for (i = 0; i < 9; i++) { var x = 14 + (i % 3) * 31, y = 40 + Math.floor(i / 3) * 22, open = [0, 1, 3].indexOf(i) >= 0; t += open ? '<rect x="' + x + '" y="' + y + '" width="28" height="19" rx="4" fill="#1a1446"/><text x="' + (x + 14) + '" y="' + (y + 15) + '" text-anchor="middle" font-size="14" font-weight="900" fill="' + ["#4dd4ff", "#3ddc84", "#ff6b81", "", ""][i % 3] + '" font-family="system-ui">' + (1 + (i % 3)) + "</text>" : slab(x, y, 28, 17, 4, "url(#mt)", "#3b2c9f", 3); }
    var spikes = ""; for (i = 0; i < 8; i++) { var a = i * Math.PI / 4; spikes += '<path d="M' + (82 + Math.cos(a) * 12).toFixed(1) + " " + (36 + Math.sin(a) * 12).toFixed(1) + "L" + (82 + Math.cos(a) * 24).toFixed(1) + " " + (36 + Math.sin(a) * 24).toFixed(1) + '" stroke="#2b2840" stroke-width="6" stroke-linecap="round"/>'; }
    return svg(L("mt", "#a89bff", "#6f5ce6") + R("mb", "#6e6a8a", "#0b0a14") + L("mf", "#ff6b81", "#e8203f"),
      SH + t + spikes + '<circle cx="82" cy="36" r="17" fill="url(#mb)"/><circle cx="76" cy="30" r="5" fill="#fff" opacity=".7"/><circle cx="88" cy="42" r="3" fill="#ff3b5c"/>' +
      '<path d="M26 12v34" stroke="#d9d2ff" stroke-width="4" stroke-linecap="round"/><path d="M28 12 50 20 28 29Z" fill="url(#mf)"/>');
  };
  IC.gin = function () {
    function c(x, rot, n) { return card(x, 24, 40, 58, rot, "#fff", '<text x="' + (x + 6) + '" y="' + 40 + '" font-size="13" font-weight="900" fill="#e8335a" font-family="system-ui">' + n + "</text>" + HEART(x + 20, 58, 0.75, "#e8335a")); }
    return svg(L("gr", "#5dffa8", "#13b866"), SH + c(12, -20, "7") + c(40, -4, "8") + c(66, 12, "9") +
      '<g transform="rotate(-6 60 96)"><path d="M18 88h84l-6 9 6 9H18l6-9Z" fill="#0b7a45" transform="translate(0 3)"/><path d="M18 88h84l-6 9 6 9H18l6-9Z" fill="url(#gr)"/><text x="60" y="102" text-anchor="middle" font-size="15" font-weight="900" fill="#053d22" font-family="system-ui" letter-spacing="2">GIN!</text></g>');
  };
  IC.snake = function () {
    return svg(L("sk1", "#8cffb4", "#16a35c") + R("sa1", "#ff9db0", "#d81e4a") + '<pattern id="skp" width="10" height="10" patternUnits="userSpaceOnUse"><circle cx="5" cy="5" r="2.2" fill="#0b6b38" opacity=".45"/></pattern>',
      SH + '<path d="M22 94C10 94 10 74 26 74H82C98 74 98 52 82 52H40C24 52 24 32 40 32H66" fill="none" stroke="#0b6b38" stroke-width="18" stroke-linecap="round" stroke-linejoin="round" transform="translate(0 3)"/>' +
      '<path d="M22 94C10 94 10 74 26 74H82C98 74 98 52 82 52H40C24 52 24 32 40 32H66" fill="none" stroke="url(#sk1)" stroke-width="18" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<path d="M22 94C10 94 10 74 26 74H82C98 74 98 52 82 52H40C24 52 24 32 40 32H66" fill="none" stroke="url(#skp)" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<ellipse cx="72" cy="31" rx="15" ry="12" fill="#2ed47a"/><circle cx="74" cy="25" r="5" fill="#fff"/><circle cx="75.5" cy="25" r="2.6" fill="#111"/><path d="M86 33l9 1-7 4m7-4-6-4" fill="none" stroke="#ff4d6d" stroke-width="2.5" stroke-linecap="round"/>' +
      '<circle cx="98" cy="96" r="13" fill="url(#sa1)"/><path d="M98 83c0-6 4-8 9-8" stroke="#3ddc84" stroke-width="3.5" fill="none" stroke-linecap="round"/><ellipse cx="93" cy="91" rx="3.5" ry="5" fill="#fff" opacity=".45"/>');
  };
  // each logo sits on its own colour tile: [top colour, bottom colour, glow]
  var TILE = {
    chess: ["#4b2fb8", "#1d1450", "#9d7bff"], checkers: ["#7a1f45", "#2a0f2e", "#ff4d8d"], connect4: ["#21307f", "#0f1640", "#4d7bff"], reversi: ["#1d6b4c", "#0b2a26", "#3ddc84"],
    ttt: ["#2d1a6b", "#120b33", "#ff4d8d"], uttt: ["#1d2a6b", "#0b1033", "#ffd84d"], dots: ["#5a2a8f", "#1f0f3d", "#4dd4ff"], mancala: ["#6b3a1d", "#2a140b", "#ffb36b"],
    dice: ["#8f1d4f", "#2e0b2a", "#ff6b81"], liars: ["#7a2a1d", "#2a0f12", "#ff8a5c"], battleship: ["#0f4c8f", "#06183d", "#4dc4ff"], crazy8: ["#6b1d8f", "#240b3d", "#ff6bcb"],
    clash: ["#8f1d2f", "#2a0b1a", "#ffbf1a"], hearts: ["#8f1d45", "#2e0b1d", "#ff4d8d"], spades: ["#2d2d5a", "#0d0d24", "#8f9dff"], poker: ["#0f6b45", "#062a1d", "#3ddc84"],
    cheat: ["#6b4a0f", "#2a1a06", "#ffd84d"], pool: ["#0f5c3d", "#062218", "#3ddc84"], ludo: ["#3a1d8f", "#160b3d", "#ffbf1a"], spymaster: ["#5a1d2a", "#1d0b1f", "#ff4d6d"],
    spy: ["#1d3a6b", "#0b1530", "#4dd4ff"], mafia: ["#3a0f2a", "#120614", "#ff4d6d"], draw: ["#8f4a1d", "#2e1a0b", "#ffd84d"], trivia: ["#4a2a8f", "#1a0f3d", "#ffd84d"],
    wordhunt: ["#6b5a1d", "#2a200b", "#ffd84d"],
    bomb: ["#8f2a1d", "#2a0b0b", "#ff9f43"], typing: ["#1d4a8f", "#0b1a3d", "#4dd4ff"], mines: ["#3a2a8f", "#120b3d", "#ff4d6d"],
    snake: ["#1d6b3a", "#0b2a16", "#6dff9a"], backgammon: ["#6b3a1d", "#2a140b", "#e8c890"], gin: ["#1d6b5a", "#0b2a24", "#3ddc84"],
  };
  var cache = {};
  function logo(id) { if (!IC[id]) return null; if (!cache[id]) cache[id] = IC[id](); return cache[id]; }
  window.__gxLogo = logo; window.__gxTile = TILE;
  var baseArt = art;
  art = function (id, small) {
    var l = logo(id); if (!l) return baseArt(id, small);
    var t = TILE[id] || ["#3a2b85", "#151137", "#b05cff"];
    return '<div class="art gx-art art-' + id + (small ? " sm" : "") + '" style="--ta:' + t[0] + ";--tb:" + t[1] + ";--tg:" + t[2] + '">' + l + "</div>";
  };

  // ===== brand mark =====
  var LOGO = "data:image/webp;base64,UklGRlAgAABXRUJQVlA4WAoAAAAQAAAAvwAAvwAAQUxQSMIBAAABkFvbtmo3+8KHTEMVaKgDyllqhakSiqRy0HYojM0vln787z13B5+TbfaLCEZu2ziyk5nZXj4gnzHSLgJozG9dXH3sGEXYOh+vLrbmGwCiw4R2AfDL5y9dCnL35XzZA2GyRQCm9+/7/nW2okTFspHk/f40ECba2zr+SpY07JiWQ6mQX49b4+/0wOYDmY3CbJl82AT8mKc1T8hUKM4lkSfNsc6KmL2jGQXajHeziGP0YsVEkU6sFkdWwPJrr3XW6zLCiF54Y6ZQZ74tDC2PmarXWquaGfIcF1ofBo8qPfihFdzgvtNe661ThIFeZSp6VRJX+8r59gszBTvzpe1dbz7s36d41yECnJuqimmWlWrKuYi9/n2ad+0huvjcm1VPz9FhiYWyXbgEnDPpVuI5ms803TI+N+e6lO7u3HZvVj5tXzIrV+bltfrh+hOLchV+6lC8O6Ze8pus/Vftv2r/Vfuv2n/V/utPsUx+6+fm6OcW6edG6ed26eem6efW6ecG6uc26udmyueW/gC4sfq5vfK5yfq51fK54fK57fq5+fJzC8jPjSA/t4P83BTyc2vIzw0iP7eJ/Nws6nPL/GBy48jP7QNWUDggaB4AAPBlAJ0BKsAAwAA+MRaIQyIhIRVbhZQgAwSzBEjGABdBUMq6+k/Lj2hq7/YfwV/d/266vOl/K95p/6X9m/KX5j/8L1O/nv/w+4J+mf+S/uX5Jd1/91fUP/Vv9D+5/vDf8z9jPdX/jvUM/wn+6///YfegX+2/pw/ul8JP9Y/337tfAf+vn/y9gD//+3BeV3j/1X+g/Lz1/dF/YlqQfMvw5+u/Mjk1+S+oR+Lfzb/H/lL+ZnOKWY/4/qHe3P2//bccP2R/3PuA/mByFlAX9D/9b+9fkd9Mv9r/7v876Cfzz/K/+z/LfAT/Nv6x/yf7x+Svzr+yL0cf2yHUn6NGKMht86XJeiG4x/BMFpeWnLNZpVifyikPYp1zIAIk8YvfoLuVcLcOvWXM5O1dZPTC6dR1Y6/LvXMl4qBmEciR87kDJYt/PURmtnV3gI6x3PdOXvFtw5X3h2/uqoLncTppRXqGfIN7IuQm/NhiFbX5LRFaUVWtNmmR39aX4EX0H33Vb182njUlqr//MZrNTjD8bJqJSbFdWQn+/wAAyH9JtD6Eq+ZOClNFCAn6AO/941MLi/MSmUG2Pc5F3TU2SvTp6FdTYZWS7rYfSv5b0N/5do9KQJ5mZkES970ZrlN3r/cQQCt3zMu3lV5tntDw/ZKA4VONVdgi+jWCysBGRa4GD6zHCn+ZOU0CDfjbYCCv4WhIMRXUUn7d+1bxSMi1Zymu86Ti88cAIvXg9KDpzrmLnKJD9/2d0lyR3g6oFVOoI95kd51PjI9lT1egQNM0vhmLmiw1npROWy39ZhalKzp9pxAzNrXnXREmUNUwVRi+tDnDxQVswkEuI5LmONr2wunziXXDPztPNif+gHyhB+OsXCXCT0kwhGrwXiim07X/VYllVcSTOdIzgsmaJLdJRKWc/ciX3L2gUsQItQpmclQp36HDSSvPtIDqpQ04/uKFh5xy9rQzyKmZ9zFvGsKAqlJ85kd949GlZhwE536mcfJIdYZG9vopCs4wpABPlushzBrfrODIosPgTI8NI6rgWBtXMTysie0leD7u21b0VTSsRVE8Cyuk1J2OW06+NHSUTpkS2DraN2vzeTJTB6kAAP7ouN+TZ5Xau/+DvtViN9/j8jNTsy71z9R3LRH8S497o483mTuu4qN9wH7mfHiIAfhZLjHdigtsvQ1KkBO/CxQpVJmnnLuzMQH5Ic+i+RY10BUhSFdXooKrP3JCQLI2V9SBfygV76Pjzw6tcpWO16hvV6TpLQc17BtYKMnEDtGEoZxMLlOrkYgbSzAGSmuDBoEQYNpaf5/B4N6Xi6R2mx5NykZ8K4ePlyCiCX6gaAd/9XLar8lN3CRkJIq2pyx3b9eNupSo0y0gcIjFU+DcuHlUznblVHW5HOUaGafgH7wTs6kPx3vQCp1FoVfTPnGVzjPePO52GO1MU7OPqL9F5YDglQ0Onixtg+5KnhmFE8uSourxcdRsjG7N1heN++IjlwmNbAoQhXE+yHoc57vFW07oHMaIjmDeIhUtgmkpPo0+7v+ZknPTlQI70zpg+sfdxexcRg1OoIm7ZKoqalnbT1kn+tGcJvnTEPc+CM4E0+S33nZpEl5fonfDrq26bICbbQODjPdrWb9NcbP+CYmqA1WZpWDG5Rm1UhQFeFw6S4CoD/Ww3OQAVwSmn/MgsMcEOFyuwZF5Rdba1xWFgtb63NyorVnPYCPeBmM8GcjJGGJMbN0ULVeyBIFLB4Elna9GN5zY3AekvYvzZqL9d6k9U70o6OW4qmI2cxfJJB8idCj3kfWSY6YFVasqjZ7VzUinWCQdgumPnD41+WRiNHI/GhJI1jRu0ZQpBUThAQXsSCo91VA+J6KhS4f0ecEEbAN5Ej2N+4zWZTYU7Nbu+vl1kZcaem5l1zM/X/yqV5hbckDJ+o0mQZCSYsn15KXal3Fzoy4C25Lnb0/rYqmOYXIO9aqVBYc+VO6abDDXkLg6AJnbUu0ya4Qk7jJrkMfydi8DcW6u+KkCUdpeKR7Yfa8s8tP58aNUuFqs5un/tywDWhO6XLQ8Sa4iAl7EXOKlvSDrJVQi8bEqpnuindeeyyAba8okwsZUHWUs+icwWyzxk0L1M96lGCozD9W7mjfJ9HDLimnZ9g/uhhhYPdortQLxTZYQCj7NSGbmBy9R4El5zEIAjveHhRVF1YItRZVjryPPUShUFBZ3BLmNKlY0eG+WsA8zf8BtBx4U6CtdiihPIOMgQwWzcJroNF/R3JIAraQigAoT4c2afUIO9WVkiNm3N6YQH9FWGyxmAPgBJO/Aje16Yw2vZizvoD06WhWWgx8Id/17LSihBSTWBvFadWGKxZuFRJKSDR6WNk0d22pE9H0RXjX4GAeUWs+hAR8gWlFQy31HBJMhh4PmS+crfeHBRqcEJLndSfwZoSSNd9/XknLqGTcwB2QXRKG5fAlnYdIrjj0Gc/fRJanFEWVsiBkB371kf1mRIrkVkLK1k5SkD50N3xPDtQEPlWUDIjxhhy3kb8hDDzHmP+dlyu50UH5myv9rpc1cD0ySSU4CKqTBQrGRnx3qBdGMG7G6uUjB9h/hvFphuyRCm0JjywsaW6OXGoOMSz9Hi2ziy96JI943eRO/DC0j7voFTeYCpYtolMfNIr4djwm2ldnaxmMdXbWSkIj15eVboy1BC7FnohryqRAOxKFDMe43wSgK3h/MYxq9NTRM1iCWzL3rki49L7mGkyAYFvcbQpKSY9cBc7aVY9rDoy7BuybYES9MB6PwqEx8pVFJFP/ifLExddNHhrCuSTYcP3/K3Z5xId+ghupbaQ+Mo0JkCCmPffKrksxZNVSZRtS5KiE07+6a+QxvLr20Cxzto/6RQJw+mhK0KktPL/IpBSTllzf+RxYL/V/RQURvSz81sV3+cv8v0X5jIovxQMY9EYf6sN81GOlqve0BxyEWk58FEhqWWo6sgGBL6D4h8m4jvtboLDg6vzoDHPOMVQlipnk9jrSN2GNSzz0lllGoLfSUJeQcmgyhz+O5IVtYz+KEMc4LHwpJTsKpaVE1zg/5mAs0WZlrFf9QcWeiqY58v3XALH3yEht0EZS//HQ37Gj80WUQ4AXfyJhqSmrde/T2DECn/svhOxwwgob7kmi6qp5HRuA9s1ygXsF3QPMW5XKRcsUZDzzkJfcumY27cNnjj3pPp4a8kxPP69865yT41+VMF8LdypDj7HDUwQkYnPnAOZ8nNhrDvt1ZlBCWOxOZ4+du7izCfJgJuXewun4LUTBYlhdG8TB3igOxIsJTSf76vgQJEQopEIAWtyJmYrwEmvfvwXXZUrxp4dNCEVo7hktSTDGXJB6RES212zZidpg6VbolPouEbpRfxgzwHd9MZOPIA9OdKdR1HXuD8SKmYVOmVNeD92fnMJB5Scdbfp8EuaZ0XfxYgH6tRvHNHI/qROl9vkgDNXttZDIR7v/vUeRYfem4N2ZdNhAJ9KFnaj9kflLNnNShNp1CE5Js97TwQIEbc5ECR7T7VhprKW/GRYn1dYQdnwR0cbNvbvAiO8/Mu8meQ2UxFgY2z+ZsPQ4330q95RP61ilLmI2RSoitOynmErGWlfnqbAu6j3gq++fvHFsO0yb1t2to00cJHuIA+BHT0xxfLvA+mi7HtEs/1tXcgUt+yZFufcu6goZqAw7yhWVuIsgVksRNCpQqW9KIeG0VANfs9BM0JNqqgNp1RVJTLB8hu9NKFXAE10zS76q0+7Shf/WDvXkWRDS59SL5WZUhClivwA565RXr5/9v28L6gguImGJr8urrz1hMtPKnUso53VWT9gG7k0hE3M6yhu7kod0b19oy0MSXs7kc3Wj3zyCjG86C8haQoG8AnOt6zJJ4jWcMRydItSztnx/nrxSV8leVuJ6WHFxNEywRKhFcCZNn8gcxaMV8Y+zfH3KajxxD6TGcclo5K0dcX6bhcCCWmNwmFBm7XBX44E2OEW7gZssl2BeA8C/zUZh9dsN1n71ZNzB9GNPfKXF69VGiYeXPM3a62GwKyTFmd6Zngcc+rqerni0x8R3/2g7LsanlLmPSNqS9+51b+ltWYROihEDR2OZe+V9XT1Sr+X109os+rZrNuYfYUIqNz0pnPZ0uo7dD8hpHPBv/+70EuDsyD1wC17qvF4r9Kga4mqMbrDImsB34I7+mEAzFbFjJwaPEs95vyiIp42+VeVm/GagHR66BGAZYR1WXoWGbtMr4C2x9bxmeZY55/E3+pMBnDunU9/CfODPAIsMOB2K07sXyqXqX26Wkd51TGGA0rBC+GZ1TWYNFiuCrY6Wq7qr/B0XH043zYvMEio0JVd3f+tXNvNUKhpHsNKgk/TCLFC2wWyv5lenEQnCu7jftQVuZe+KdOmSAPRFWmHRleUp6SoDf+BKb9s6yrRlvLw5D7jagnTInKNDzBdmJmamFsFLaQa4BbcCqKSAxG3IMPfDjr5aaPbnGL2mfgtfyvjZXKbuiizrtOipwsJ5HD3PMOdJGw8Kqcc2KjjZ+DbwL0/mYuUdo1WqB/B0P1O4K1UIFZc5UlXi9TVCjRjv96+9Q2JYNw9q9RPP+JP9nbD5VooyWQbedNbOvTAsoPTCtki9J4G648326AdPtv/042t/XJpPfmGS9EWgoahCSyn0Kla9WqnLvdsvWV03W4Ka6LndZf7wRnNE6HGVpxXuc1UtSliUfh+DC8NMbpxBsfEy0vEPFabon6Mg+WyD2XUIP/pB6HHWY5+mhB2u3OSG2UJvaAuomEGjejB4jaK75odvLSSFIkltV1o6uUzmVcRcfoVTkFLVGghrZ10tIBSGHceqXcKQRqJqaxCDKZIjXjx33SnsVpfzrbSFPyBa21ZH6L90RdcKPwN0ZXpqZFK24Q1X33cFq6mYMRXHz3V9420hhi/emNqvQf7xij2gY8T/u2ED6AFjPeccop07Zgsbs9L+UMCVfmSPldJkH7QQ4Cq8MoiC8dB5+vIqFFee5jqCYWOvTHNCT6yTbTTYj5hdpTGus3QGUwJQXEnxkYKa7KMFfLknnGhp8vSsxqNrjv+2JNm8nhWRxc42MdQu9gaBIu9RdZl1Pqu2jHauzZKHB2Hv6Jlvd4a3GZaJyLFKVmk7mNTN0XveR40ZzAIQw9NatBFkwXl7aHxHwGrWO4KRRJ9ZChCxzlXindba9GwufZB5WWCKt+RUha29CP1+OTdDyXDtIqOvdKLD7+vL8mYsDLKazrp7rFYuRwruGolx+qWHt196Qfc84UmsBRPC8iNyrikigiaNGbt9JFk3+1UAhd/AFkyeGuUw0CfuIOIjZewlKz12IaMdN0Yak3Pi2sg0QNvCteC6Eu4ajt/moP5aDf21PvpoaytTfZRwifYC5zSfvgL+t3rYJTpZItksqWcQ9lhR5ssQhvapuQOpenhpXx35JcGYV49zumh9sJL1UqT0X3HaSygg5EU94zPyTUkmbLGK4xTq7wByf5BML3K6+plpmmxw8BkWIMoVwGUsp9hzgHS+2u4v+v+7YvNB//s/nyjBwn060RNDnOuQgcWElpzB4if73qsNdQtT/KpvAzAQrIHahnKGCr3QGr7+Y1nctndbv+/Vkr+HW1yEZEyiuY4oB7uRo/LGj7CLwj+l+3jashAf/qg/+qKKWa18VQ3gFl0BU1tAikzoeaPBs9lbk3dqwUzNVVmdC4wHGu1/32Oih/+Wr0U1j7v5/WfwwKS3V5Y1z3iiuMf5uVYEz/bEm4TUYoOhizf3/hUc2c0wzLxF4nifp43DSWjM7SR5jIuQC45miwoB1LWqOU1+m4GwTFqdt/h+bILY1TSSl9+RKcCAxXy9J/99bV32AIeXmIuR+wNB7OQfV6AD1la4pSzsfLKiw298ihh/O2LorHnLVpb0UebsHQFB7pmpYtQ+FtG3T+9AuvIwzQmMSs1y6aWzeiddGOxf6nEzZccfiC1rW3yqnXnXrXc0X0X7d+h5GMRsp/QEDsFyE8ulyXTXCYKxKYluJqyFHAVWptjPvT+0S/APpTsR/UJsBGF4s2Qt4Dw1+lOV2UxbjghO2aAHI72i6urUVpGwtp7TqYqj+k6PiZHUSB+0x4DoFFMmHCov/dmvouWl3zgbD6n3LsIQ3Y/zuct/I+HJnHTUAhhFkNSLQ1E9+35B+Rldf0sfuMvTqbfTQT3OH4pfzPtCJ7kw8S6vyduoTQYDVTQ4tT7Y2kXLZ+CK9Dd6u2rIrvjX5bz1S1C8LBmHg+AAWiR/+DZFC/wT69y2HjOssDPuqUXoAlEJsz4182C2TNHNGJwgxWfzmaInom4XAGiSGXnkSQVbPMp/mnJIUTBCjo1+fej225FbJCq6S8QHkHDM21fxDN+s29ZnLWiAEOnDLf4nb/HSYYwj9U40Z/gJM8XEyLt37mDhgEAVyX6Pqltz5UgLZ2p9jscX8FO3D6EO8HqiDyg9sucOcfcy32GchctffxNgP60OB7UIat5F9LMyS/8XkbOYJwvK9RSDrxcdLYIy71RVjIkVgVDw6SPSNGO+k77mEdI+v9N9pgVes7l2mzm4k/59bNov8U6cRjdvhXRJNpXZVPl4i+YMTAZWc9GP6LPka2suXvU9FhkjNfSyrforRwElaNAbOVPwEL0dQilgMyI3fCatAgRIIBfU2Spr8rNk/bkjfhRC5vFYlu7FIV95bZVAFVLOrjJwQ7OjqC/LcRLlvXhNMloRVFOyiG6wGI0zzwVoHQpIFQDnn/yEhtlQ9Mp0Wt3EbPG+jUtJ10jZNXlNUfmBwGt0pm1jn78sMG3QMvZ+I7qlbBCJHl4DdHuGP99xSAccxj/3TRyw80ePGbYu9x3UXkTvmE4OsEDodHnbob2MpVLXgDnMR1yHQlNxwqcepTgTbAW9q+8kg9MAikTCpSa0d9xByJmeaArWf/woDqW3rPRU6kLuvGkWph4hS3m8iHEROD7CJ5P+YXc/grzjrHtLtyrOLZJg0RB4uuguknZyXbFamyGWtd/ser0YUHEqWs1N7SRBt/TuvEibL+zwb2+FF8TjC1emQKBgkF3nxF+AcmWZlR1mNJLpcNRSYbLNCwWUgto/hIVONkrmF8Yrbwr852VM6rHD6f8RUI07oJceDtcWCh9xd0Q1sZovTKyEXVEbWAwCxrSNIaq3sVQxPdxvCJ8xqcjA1+OMNKXCOrRMk4VH8Llbi7B2OSd+CDHQL+AH8bBIZLKVgJN6wN16OTwXzwynNPksBJuRzjA/4vvi9paTVCuVqxtQlgM/xzogg6ey1Js6bJtpDSoAy4AwFoWq0fWAxxdspLSarsJUH9AVOqFfB25AsLWobEx9sE13P8w6rRXGPUChqMdzIGNeZBhZKrdR301c83y2P2jCidMGiEsm+3mf8miXwA0Q8DkRDcNuwwQ4oObjzX4ixVXIrxXv8Q3Dcpe9X+y47NHCuuFEdf6JCXDfsPefWFHn7Po6wJ+bvYTbn+wHZZXfktKfhvFiI+dY092RCe0Qja86JUAkpBC+amaym4bZRjhITFfE2gocW3PWh6NOsgxjHg19Xk85+Hs8IH8k+saBsbqzZKbZAUhOkkRycAem7wWbnViS7Ngw3EJQ90aeq5zYp+dmPG6mykATa9UZWBTAW+LqnG88HUmd9vJU4aYodES9AK4HML5Na8bWL/JKjMhmTBgjwZV5iMAdPHUUJ+rJWCJ4J42cxyvXZcZh9CFjtPo4m2TYsG/BdJ+vP3z1qgyfMCxK594iPb+tUuTO//pcTp3XMP8WoRFIHva4UdebRJjFthM/GWlZ3bJ0C0Ki3jokIFkSgFt+UL+rKBq0r4MWNyg6C99+SjCBgQSZcVnnO8W3Hb/n0MRkLVX0MBkj/ewEYIIkiIoGJcwk9jdmDuZS6py+aNx7SXHYtGDQo7eoC+0U8tcx9RB8TD9eljXtYqJ/yomdJCbe0iXsny51X8uMfm0cONtnITTx6vu+ruK25M1LJihbaHSRosxBA5oKtpDHXuPJd5Abh5EzsEVxZH1ZPf6KxSbCKSAVklTiU7uZC0FbBuRK3I5FM1GUZL3b5474kf2HHUjmZlVxSCkZff1DJAjeTGTM49r9UeBMrzeXeJaftYYl2bGYFqoP9nW+yuK4Yui5jIwuLC7U5uLFeMQXr7vd/bvvqbyq83qliQOEzx15kJgntfPCGtNf80NwG/UUVkp8x7fb58uT1Bhzb4L3wKK6DRiqwNjOthSqfYN61MINmGLFqfzsxtISWNRC82H9yZJkT2CoKWdNdQigWwbfP+z4Joc2xS3k+9B02oG3+z0vdxLTSncICm/Y9omRQUEzwVMz63cVBLMZAFKXEpv9LJjnJExWqnOKSSXhRaVhxp42ejxTw511hoCreV0oIx5eICvQGzsOwKMB/N2Fhh/M2GiBp3+1ObMCuYppqrWboS+an7Gq4SUPDlnzUEWCj47pyArzgLH7heM4R+AV95nAvJJ3spZ3bMEV1EggftSMrf2+lPUDSfCGeBYHs7sM9hBsf61XUGwdD+RUHQ7ahpNkXPiHW7CxHuFdp5gcEKZfjwrMMDFp0xwIH5RyyB4dCJl3/87wtX5RJfVto4YJnhybVQ2LKync4cPsSH5FXcN/zXMV93xy17gyjtzs/uXOFAWqDJpZS2Xfr0n2bH+t6A2890S/UukAZy6UmRL0PV6c7v8U+UYAYVf5usTC8PV0eXQmEv3vmMlfnh4TPs9jpYCdcupix3jUye0dTOkE8RGGJxi/k6IN1AXWRGFVUtLydtem/9/+CtiEITPvx9JmXuln7n6Vfqqdtkb88PmgefhibL588vRKl2+Dg0UMv2dUd02gp4c+Vznk8YLyTIfmsXKm9mj2zlSPCc/49PICeRIPfGMe1LvAI46vlkvAdEMtR+QF+ipNZiJ/RUhC225+p62ZNFytqi5lkSbgPqKNAC1z+z3l6FeT/ngwVz25Hx7/tuH17YQikXisfmcYEg7e6rIyFYMuJT9WNJo5h+Dm07MGNMUOxQdwbRYF2cCA4cgIYvENkHDxJXei3vcUI7QP8lDotNwQpwWJGcfkpXMDQSL3yn7G1CaLkK7yHe1ZYyUpT58N6llscNsjJByLd9Ers20zSHoqoZZ4aZeK9lEJKnSb8pPYLZA5a+bkWLHKdZh1Zquu6HICIQDgOO9epL8ozZZ7HZ7hjD+5BkO730E655UX+Eg1jYJ9/GKH038FgDaROWmvbvuZsx48eQVj8Wk8waOSg0oBCC0JZM0vLYvfutF6w/YQEVV1VZ1+VimnVzFbZmJI3IdzasrIkJUXf2vDOOo+W342SeiJ8q3rzEEgx+hrzjo6hnvxCQfJBJK77djyXfoIHWU520aNRa6USoPqt5xnXelDLMl/kuLD/SgwSspxq5xu43CN10wRxw0vKjqTHrlxYnTxzi3m0Dxa/XarTOFveNyxDCR32/z0/N8d1J/Yp11DboxCrXtrBreb/L8eQSjZhI7NqMIC66k9I+Wmj8b0wb33FSf7Tp0+Id3DJSiC7SUl8GLSspkfbBtHWf4GOTZt2e4zH+0dALZYKfuNgG2163fRJ5aTHM8hrjWpVqIZSvRZCJG9ETKopWaQdDrqH0ldrOyCZkrMKDsM3DZCLO0DOBwYFJJsvi0zc1LPfKLLnZSODxBiiCM3b94XPs7HnYjwLq1rQEJt3nEu5R9tG4r3e8Sl2RruHpDuYkAIq8NBelTtB2zYFMD6/u9qGJPq+u5n18JQyjzHnIoLX4BsomT9unwOwaGL9B8RkHkXBuyIXCbGkZSzCwZRrdLmYcBknJ/hsSZz9WBwWka3SeYMc7jts8p8blzoEEbk8bdKvk7yDN4htTvV9IJity7z+RYf6CprjOikHomGQZaBufJENgT8KAAB09tlXS9UAcD3/HQqAk4/omI3h4drOMr76aQuc1cciWhHkRVlXLgJahHkmgJuZBs9ifUzHeCg9+mSAdijHWQ7hpj3Be0Hua0avzamMqe5W+k96Xm9G/t/2Plu6IpY/hDbK/oDxTpKX3vIYW2xxhxvN+1bbT/4PtQKYPuEtSm5wc654B2OkmPOm6T0YGaPl0aP0XY3kuu4eMyeQdQ7sOTS7tdJxvzYRUBo6VZ8tujzO7dS6lGQUgAc8opF8V0I6uaisHbunOCYxWE7hU+WBjUMLjp2WsYQi8GwV2Ogg9zOucXOQeCWnq5ugX231DdIa/FIelnDIWN9GllOHreFVdC1sGC+FgAiOwSkLxLW8lE3CdynoGqvmM1sraviVfaVWXHQL6XCVfOkuE8K7Q8uklgRtvbCv493sxlJqA3y76IrF1lyw3YOpESWv/nv4cWwIGPGp5C+aGm+7mc0ueex2t2Bi3SdkaSVCHj9y8aODBLP1+xyoSmpo/0wDCXf3U2cCFG+Mf7xD19YTsReqvHjCu8MNpAeOGrE0yJgEAAAA";
  window.__gxBrand = LOGO;
  var MARK = '<img class="gx-mark" src="' + LOGO + '" alt="GAM.IO">';
  try { var fav = document.querySelector('link[rel="icon"]') || document.head.appendChild(Object.assign(document.createElement("link"), { rel: "icon" })); fav.href = LOGO; } catch (e) {}
  var baseSide = sidebar;
  sidebar = function () { return baseSide.apply(this, arguments).replace('<div class="brand-i">🎮</div>', '<div class="brand-i">' + MARK + "</div>"); };

  // ===== Games page: category filter =====
  var CATS = [["all", "All"], ["Cards", "Cards"], ["Party", "Party"], ["Strategy", "Strategy"], ["Classic", "Classic"], ["Dice", "Dice & Board"], ["Word", "Word & Quiz"], ["Sports", "Arcade"]];
  var CATMAP = { Board: "Dice", Quiz: "Word", Arcade: "Sports" };
  S.cat = "all";
  function catOf(m) { return CATMAP[m.cat] || m.cat; }
  var basePage = page;
  page = function () {
    var h = basePage.apply(this, arguments);
    if (S.view === "games") {
      var chips = '<div class="gx-cats">' + CATS.map(function (c) { var n = c[0] === "all" ? GAMES.filter(function (m) { return !m.soon; }).length : GAMES.filter(function (m) { return !m.soon && catOf(m) === c[0]; }).length; return n ? '<button class="gx-cat' + (S.cat === c[0] ? " on" : "") + '" data-gxc="' + c[0] + '">' + c[1] + " <em>" + n + "</em></button>" : ""; }).join("") + "</div>";
      if (S.cat !== "all") {
        var list = GAMES.filter(function (m) { return catOf(m) === S.cat; }).map(gcard).join("");
        h = h.replace(/<div class="grid all">[\s\S]*$/, '<div class="grid all">' + list + "</div>");
      }
      var at = h.indexOf('<div class="grid all">'); if (at >= 0) h = h.slice(0, at) + chips + h.slice(at);
    }
    if (S.view === "home") {
      var hero = '<div class="hero-art gx-hero">' + ["clash", "chess", "dice", "pool", "trivia"].map(function (id, i) { return '<div class="gx-fl f' + i + '">' + logo(id) + "</div>"; }).join("") + "</div>";
      h = h.replace(/<div class="hero-art">[\s\S]*?<\/div><div class="hero-t">/, hero + '<div class="hero-t">');
      h = h.replace("<h3>⭐ Featured Games</h3>", "<h3>Featured games</h3>"); }
    h = h.replace("<h3>🎲 Tables in this call</h3>", "<h3>Tables in this call</h3>");
    return h;
  };
  document.addEventListener("click", function (e) { var b = e.target.closest("[data-gxc]"); if (!b) return; S.cat = b.getAttribute("data-gxc"); render(); });
  // featured games: a livelier pick
  var baseG = gcard;
  gcard = function (m) {
    var h = baseG(m);
    var who = (m.players || "").replace(" players", "").replace(" player", "");
    return h.replace(/<span>([^<]*) • ([^<]*)<\/span>/, '<span class="gx-meta"><i>' + esc(m.cat) + '</i><i class="pl">👥 ' + esc(who) + "</i></span>");
  };
})();

// ---------- GAM.IO progression UI: Compete page (ranked + tournaments), challenges, achievements, locker, lobby rules ----------
(function () {
  var RANKED_GAMES = ["chess", "checkers", "connect4", "reversi", "battleship", "uttt", "mancala", "dots", "backgammon"];
  var TOUR_GAMES = ["chess", "checkers", "connect4", "reversi", "battleship", "uttt", "mancala", "dots", "ttt", "backgammon", "gin", "pool"];
  NAV.splice(2, 0, ["compete", "Compete"]);
  ICON.compete = '<svg viewBox="0 0 24 24"><path d="M7 3h10v2h3v3a5 5 0 0 1-4.6 5A5 5 0 0 1 13 15.9V18h3v3H8v-3h3v-2.1A5 5 0 0 1 8.6 13 5 5 0 0 1 4 8V5h3zm0 4H6v1a3 3 0 0 0 1.3 2.5A7 7 0 0 1 7 8zm10 0v1a7 7 0 0 1-.3 2.5A3 3 0 0 0 18 8V7z"/></svg>';
  S.tours = []; S.ladders = {}; S.lgame = "chess"; S.locker = "back"; S.tmatch = null;
  function has(id) { return GAMES.some(function (m) { return m.id === id && !m.soon; }); }
  function gname(id) { var m = GAMES.filter(function (x) { return x.id === id; })[0]; return m ? m.name : id; }

  // ===== socket =====
  function onMsg(m) {
    if (m.t === "note") { toastBig(m); return true; }
    if (m.t === "rank") { toastBig({ kind: "rank", icon: m.now >= m.old ? "📈" : "📉", title: m.name + " rating " + m.old + " → " + m.now, sub: m.tier + " · " + (m.now >= m.old ? "+" : "") + (m.now - m.old) }); if (S.ladders[m.game]) send({ t: "ladder", game: m.game }); return true; }
    if (m.t === "ladder") { S.ladders[m.game] = m; if (S.view === "compete") render(); return true; }
    if (m.t === "tours") { S.tours = m.list || []; if (S.view === "compete") render(); return true; }
    if (m.t === "tmatch") { S.tmatch = m; drawTmatch(); chime2(); return true; }
    if (m.t === "me") { applyCosmetics(m.profile); return false; }
    return false;
  }
  function hook(sock) {
    if (!sock || sock.__meta) return; sock.__meta = 1;
    var base = sock.onmessage;
    sock.onmessage = function (ev) { var m; try { m = JSON.parse(ev.data); } catch (e) { return; } if (!onMsg(m) && base) base.call(sock, ev); };
    var hello = function () { send({ t: "tlist" }); };
    if (sock.readyState === 1) hello(); else sock.addEventListener("open", hello);
  }
  var baseConnect = connect;
  connect = function () { baseConnect(); hook(ws); };
  if (typeof ws !== "undefined" && ws) hook(ws);
  function chime2() { if (window.__gxMute) return; try { var a = new (window.AudioContext || window.webkitAudioContext)(), t = a.currentTime; [660, 880, 1100].forEach(function (f, k) { var o = a.createOscillator(), g = a.createGain(); o.frequency.value = f; o.connect(g); g.connect(a.destination); g.gain.setValueAtTime(0, t + k * 0.1); g.gain.linearRampToValueAtTime(window.__gxVol == null ? 0.05 : window.__gxVol * 0.05, t + k * 0.1 + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + k * 0.1 + 0.4); o.start(t + k * 0.1); o.stop(t + k * 0.1 + 0.45); }); } catch (e) {} }

  // ===== big toasts (achievements, dailies, unlocks, ranks) =====
  var tq = [];
  function toastBig(n) {
    var box = document.getElementById("gx-notes");
    if (!box) { box = document.createElement("div"); box.id = "gx-notes"; document.body.appendChild(box); }
    var el = document.createElement("div"); el.className = "gx-note k-" + (n.kind || "x");
    el.innerHTML = '<i>' + esc(n.icon || "✨") + "</i><div><b>" + esc(n.title || "") + "</b><span>" + esc(n.sub || "") + "</span></div>";
    box.appendChild(el); tq.push(el); chime2();
    setTimeout(function () { el.classList.add("out"); setTimeout(function () { el.remove(); }, 400); }, 5200);
    while (tq.length > 4) tq.shift().remove();
  }
  function drawTmatch() {
    var el = document.getElementById("gx-tm"), m = S.tmatch;
    if (!m || (S.game && S.game.tour === m.id && S.game.phase === "playing")) { if (el) el.remove(); return; }
    if (!el) { el = document.createElement("div"); el.id = "gx-tm"; document.body.appendChild(el); }
    el.innerHTML = '<i>🏆</i><span><b>' + esc(m.name) + "</b> · round " + m.round + ": your match vs <b>" + esc(m.opp) + '</b> is ready</span><button class="btn primary" data-gm="tplay" data-id="' + esc(m.id) + '">Play</button><button class="gx-ivx" data-gm="tmx">✕</button>';
  }

  // ===== cosmetics on this device =====
  var EQ = { back: "classic", board: "walnut", frame: "none" };
  function applyCosmetics(p) {
    if (!p || !p.cosmetics) return;
    EQ = p.cosmetics.eq;
    var b = document.body; b.className = b.className.replace(/\b(back|board)-\w+/g, "").trim();
    b.classList.add("back-" + EQ.back, "board-" + EQ.board);
  }
  var baseAv = avatar;
  avatar = function (u, size, ring) {
    var h = baseAv(u, size, ring), fr = u ? (u.id === S.you ? EQ.frame : u.frame) : null;
    return fr && fr !== "none" && !(u && u.bot) ? '<span class="gfr gfr-' + fr + '" style="--fs:' + (size || 36) + 'px">' + h + "</span>" : h;
  };

  // ===== emote packs: add unlocked emotes to the chat popup =====
  new MutationObserver(function () {
    var pop = document.querySelector(".chatpop:not([data-packs])"); if (!pop || !S.me || !S.me.emotes) return;
    pop.setAttribute("data-packs", "1");
    var extra = S.me.emotes.filter(function (x) { return x.i >= 12; });
    if (extra.length) pop.insertAdjacentHTML("beforeend", '<div class="gx-packs">' + extra.map(function (x) { return '<button data-gn="emo" data-i="' + x.i + '" class="e">' + x.e + "</button>"; }).join("") + "</div>");
  }).observe(document.body, { childList: true, subtree: true });

  // ===== pages =====
  function bar(have, n, cls) { return '<div class="bar ' + (cls || "") + '"><i style="width:' + Math.min(100, Math.round((have / Math.max(1, n)) * 100)) + '%"></i></div>'; }
  function hrs(ms) { var h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000); return h + "h " + m + "m"; }
  function dailyPanel(p, compact) {
    if (!p.daily) return "";
    var rows = p.daily.map(function (d) { return '<div class="gx-dc' + (d.done ? " done" : "") + '"><span class="ck">' + (d.done ? "✓" : "") + '</span><div><b>' + esc(d.text) + "</b>" + bar(d.have, d.n, "gold") + "</div><em>" + (d.done ? "Done" : d.have + "/" + d.n) + '</em><small>+' + d.xp + " XP</small></div>"; }).join("");
    return '<div class="panel gx-daily' + (compact ? " compact" : "") + '"><div class="sh"><h3>Daily challenges</h3><span class="gx-reset">Resets in ' + hrs(p.dailyEnds || 0) + "</span></div>" + rows +
      '<div class="gx-dall' + (p.dailyAll ? " done" : "") + '">' + (p.dailyAll ? "🎉 All done! Bonus +" + p.dailyBonus + " XP collected" : "🎁 Finish all three for a +" + p.dailyBonus + " XP bonus") + "</div></div>";
  }
  function achPanel(p) {
    if (!p.achievements) return "";
    var got = p.achievements.filter(function (a) { return a.at; }).length;
    return '<div class="sh"><h3>Achievements</h3><span class="gx-reset">' + got + " / " + p.achievements.length + '</span></div><div class="gx-achs">' + p.achievements.map(function (a) {
      return '<div class="gx-ach' + (a.at ? " on" : "") + '"><i>' + a.icon + "</i><b>" + esc(a.name) + "</b><span>" + esc(a.desc) + "</span>" + (a.at ? '<em>+' + a.xp + " XP</em>" : a.prog ? bar(a.prog[0], a.prog[1]) + "<small>" + Math.min(a.prog[0], a.prog[1]) + " / " + a.prog[1] + "</small>" : "<small>+" + a.xp + " XP</small>") + "</div>";
    }).join("") + "</div>";
  }
  var KINDS = [["back", "Card backs"], ["board", "Board themes"], ["frame", "Profile frames"], ["emotes", "Emote packs"]];
  var PACKS = { base: "👍 😂 🔥 GG!", party: "🥳 🎊 🕺 🍕", spicy: "🌶️ 💀 🤯 🫠", gg: "🏆 👑 💎 🐐" };
  function preview(c) {
    if (c.kind === "back") return '<div class="gx-pv-back back-' + c.id + '"><div class="card back"></div></div>';
    if (c.kind === "board") { var sq = ""; for (var i = 0; i < 16; i++) sq += '<i class="sq ' + ((i + Math.floor(i / 4)) % 2 ? "dk" : "lt") + '"></i>'; return '<div class="gx-pv-board board-' + c.id + '"><div class="chess gx-mini">' + sq + "</div></div>"; }
    if (c.kind === "frame") return '<div class="gx-pv-frame">' + (c.id === "none" ? baseAv(meUser(), 54) : '<span class="gfr gfr-' + c.id + '" style="--fs:54px">' + baseAv(meUser(), 54) + "</span>") + "</div>";
    return '<div class="gx-pv-emo">' + (PACKS[c.id] || "") + "</div>";
  }
  function lockerPanel(p) {
    if (!p.cosmetics) return "";
    var eq = p.cosmetics.eq, items = p.cosmetics.items.filter(function (c) { return c.kind === S.locker; });
    var achName = {}; (p.achievements || []).forEach(function (a) { achName[a.id] = a.name; });
    return '<div class="sh"><h3>Locker</h3></div><div class="gx-cats">' + KINDS.map(function (k) { return '<button class="gx-cat' + (S.locker === k[0] ? " on" : "") + '" data-gm="locker" data-k="' + k[0] + '">' + k[1] + "</button>"; }).join("") + '</div><div class="gx-lock">' +
      items.map(function (c) {
        var on = c.kind === "emotes" ? c.owned : eq[c.kind] === c.id;
        var btn = !c.owned ? '<small class="req">🔒 ' + (c.level ? "Level " + c.level : esc(achName[c.ach] || c.ach)) + "</small>" : c.kind === "emotes" ? '<small class="ok">Unlocked</small>' : on ? '<small class="ok">Equipped</small>' : '<button class="btn dark" data-gm="equip" data-k="' + c.kind + '" data-id="' + c.id + '">Equip</button>';
        return '<div class="gx-item' + (c.owned ? "" : " locked") + (on && c.kind !== "emotes" ? " on" : "") + '">' + preview(c) + "<b>" + esc(c.name) + "</b>" + btn + "</div>";
      }).join("") + "</div>";
  }
  function tierBadge(t) { return '<span class="gx-tier t-' + (t || "Bronze").toLowerCase() + '">' + esc(t || "Bronze") + "</span>"; }
  function competePage() {
    var games = RANKED_GAMES.filter(has); if (games.indexOf(S.lgame) < 0) S.lgame = games[0];
    var L = S.ladders[S.lgame];
    if (!L && !S.__lreq) { S.__lreq = 1; setTimeout(function () { S.__lreq = 0; send({ t: "ladder", game: S.lgame }); }, 0); }
    var me = L ? L.me : { rating: 1000, games: 0, wins: 0, tier: "Bronze" };
    var rows = L && L.rows.length ? L.rows.map(function (r, i) { return '<li class="' + (r.id === S.you ? "me" : "") + '"><span class="rk">' + (i + 1) + '</span><span class="nm">' + esc(r.name) + "</span>" + tierBadge(r.tier) + '<span class="w">' + r.rating + '</span><span class="pl">' + r.wins + "W · " + r.games + " games</span></li>"; }).join("") : '<li class="empty">No ranked games this season yet. Be the first!</li>';
    var ranked = '<div class="sh"><h3>Ranked</h3><span class="gx-reset">Season ' + esc((L && L.season) || (S.me && S.me.season) || "") + " · resets monthly</span></div>" +
      '<div class="gx-cats">' + games.map(function (g) { return '<button class="gx-cat' + (S.lgame === g ? " on" : "") + '" data-gm="lgame" data-g="' + g + '">' + gname(g) + "</button>"; }).join("") + "</div>" +
      '<div class="gx-rk"><div class="panel gx-mine">' + art(S.lgame, true) + '<div><small>Your ' + esc(gname(S.lgame)) + ' rating</small><b>' + me.rating + "</b>" + tierBadge(me.tier) + '<span>' + me.wins + " wins · " + me.games + ' ranked games</span></div><button class="btn primary" data-gm="rq" data-g="' + S.lgame + '">⚔️ Find ranked match</button><p class="muted">Quick matches against other players count as ranked. You can also switch on <b>Ranked</b> in a 1-on-1 table\'s rules.</p></div>' +
      '<div class="panel"><ol class="lb">' + rows + "</ol></div></div>";
    var create = '<div class="panel gx-tnew"><b>Host a tournament</b><select id="gx-tg">' + TOUR_GAMES.filter(has).map(function (g) { return "<option value=\"" + g + "\">" + gname(g) + "</option>"; }).join("") + '</select><select id="gx-ts"><option value="4">4 players</option><option value="8" selected>8 players</option><option value="16">16 players</option></select><input id="gx-tn" maxlength="40" placeholder="Name (optional)"><button class="btn primary" data-gm="tcreate">Create</button></div>';
    var list = S.tours.length ? S.tours.map(tourCard).join("") : '<p class="muted">No tournaments on this server yet. Host one and everyone here gets notified.</p>';
    return '<div class="gx-compete">' + ranked + '<div class="sh"><h3>Tournaments</h3><span class="gx-reset">This server</span></div>' + create + '<div class="gx-tours">' + list + "</div></div>";
  }
  function pname(t, id) { var p = t.players.filter(function (x) { return x.id === id; })[0]; return p ? p.name : id ? "?" : "Bye"; }
  function tourCard(t) {
    var mine = t.players.some(function (p) { return p.id === S.you; }), host = t.host === S.you, btns = "";
    if (t.status === "open") btns = (mine ? '<button class="btn dark" data-gm="tleave" data-id="' + t.id + '">' + (host ? "Cancel" : "Leave") + "</button>" : t.players.length < t.size ? '<button class="btn primary" data-gm="tjoin" data-id="' + t.id + '">Join</button>' : "") + (host ? '<button class="btn primary" data-gm="tstart" data-id="' + t.id + '"' + (t.players.length < 2 ? " disabled" : "") + ">Start</button>" : "");
    var ri = t.rounds.length - 1, myM = ri >= 0 && t.status === "running" ? t.rounds[ri].filter(function (m) { return !m.w && (m.a === S.you || m.b === S.you) && m.a && m.b; })[0] : null;
    if (myM) btns = '<button class="btn primary" data-gm="tplay" data-id="' + t.id + '">▶ Play your match</button>';
    var bracket = t.rounds.length ? '<div class="gx-br">' + t.rounds.map(function (r, i) { return '<div class="col"><small>' + (i === t.rounds.length - 1 && t.status === "done" ? "Final" : "Round " + (i + 1)) + "</small>" + r.map(function (m) {
      var cls = function (id) { return (m.w && m.w === id ? "w" : m.w ? "l" : "") + (id === S.you ? " me" : ""); };
      return '<div class="m"><span class="' + cls(m.a) + '">' + esc(pname(t, m.a)) + '</span><span class="' + cls(m.b) + '">' + esc(pname(t, m.b)) + "</span></div>"; }).join("") + "</div>"; }).join("") +
      (t.champion ? '<div class="col champ"><small>Champion</small><div class="m"><span class="w">🏆 ' + esc(pname(t, t.champion)) + "</span></div></div>" : "") + "</div>" : "";
    var st = t.status === "open" ? "Sign-ups open · " + t.players.length + "/" + t.size : t.status === "running" ? "● Round " + t.rounds.length + " in progress" : "Finished";
    return '<div class="panel gx-tour s-' + t.status + '"><div class="gx-th">' + art(t.game, true) + '<div><b>' + esc(t.name) + "</b><span>" + esc(t.gameName) + " · hosted by " + esc(t.hostName) + " · " + st + '</span></div><div class="gx-tbtn">' + btns + "</div></div>" +
      (t.status === "open" ? '<div class="gx-who">' + t.players.map(function (p) { return '<span class="gx-chip">' + esc(p.name) + "</span>"; }).join("") + "</div>" : "") + bracket + "</div>";
  }
  var basePage = page;
  page = function () {
    if (S.view === "compete") return competePage();
    var h = basePage.apply(this, arguments), p = S.me;
    if (!p) return h;
    if (S.view === "home") {
      var i = h.indexOf('<div class="panel daily">'), j = h.indexOf('<div class="panel recent">');
      if (i >= 0 && j > i) h = h.slice(0, i) + dailyPanel(p, true) + h.slice(j);
    }
    if (S.view === "profile") {
      var k = h.indexOf('<h3 class="sec">Per game</h3>');
      var ranks = p.ranks && Object.keys(p.ranks).length ? '<div class="sh"><h3>Ranked this season</h3></div><div class="gx-myranks">' + Object.keys(p.ranks).map(function (g) { var r = p.ranks[g]; return '<div class="panel">' + art(g, true) + "<div><b>" + esc(gname(g)) + "</b><span>" + r.rating + " · " + r.wins + "W / " + r.games + "</span></div>" + tierBadge(r.tier) + "</div>"; }).join("") + "</div>" : "";
      var extra = dailyPanel(p) + achPanel(p) + lockerPanel(p) + ranks;
      h = k >= 0 ? h.slice(0, k) + extra + h.slice(k) : h + extra;
    }
    return h;
  };

  // ===== lobby rules =====
  var OPT = {
    turn: ["Turn timer", { normal: "Normal", fast: "Fast", relaxed: "Relaxed", off: "Off" }], ranked: ["Ranked", { "false": "Off", "true": "On" }],
    stack: ["Stack +2 / +4", { "false": "Off", "true": "On" }], drawTo: ["Draw until you can play", { "false": "Off", "true": "On" }],
    rounds: ["Rounds", null], pack: ["Word pack", { classic: "Classic", animals: "Animals", food: "Food", objects: "Things", hard: "Hard", deutsch: "Deutsch" }],
    count: ["Questions", null], target: ["Play to", null, " points"], lives: ["Lives", null], len: ["Text length", { short: "Short", medium: "Medium", long: "Long" }],
    time: ["Round length", null, " s"], size: ["Board", { small: "Small", medium: "Medium", large: "Large" }], points: ["Match to", null, " pt"],
  };
  function rulesPanel(g) {
    if (!g.optSchema) return "";
    var host = g.seats.length && g.hostId === S.you, keys = Object.keys(g.optSchema);
    return '<div class="gx-rules"><div class="gx-rh">⚙️ Rules' + (host ? "" : ' <small>set by the host</small>') + "</div>" + keys.map(function (k) {
      var d = OPT[k] || [k, null], vals = g.optSchema[k];
      return '<div class="gx-rr"><span>' + d[0] + "</span><div>" + vals.map(function (v) {
        var lab = d[1] ? d[1][String(v)] || String(v) : String(v) + (d[2] || "");
        var on = g.opts && g.opts[k] === v;
        return host ? '<button class="gx-ro' + (on ? " on" : "") + '" data-gm="opt" data-k="' + k + '" data-v=\'' + JSON.stringify(v) + "'>" + lab + "</button>" : on ? '<b class="gx-ro on">' + lab + "</b>" : "";
      }).join("") + "</div></div>";
    }).join("") + "</div>";
  }
  var baseLobby = lobby;
  lobby = function (g) {
    var h = baseLobby(g);
    if (g.tour) return h.replace('<div class="actions">', '<p class="gx-tl8">🏆 Tournament match: it starts when both players are here.</p><div class="actions">');
    var i = h.lastIndexOf("</div>");
    return h.slice(0, i) + rulesPanel(g) + h.slice(i);
  };
  var baseScreen = gameScreen;
  gameScreen = function (g) {
    var h = baseScreen(g);
    if (g.phase !== "lobby" && (g.ranked || g.tour)) h = h.replace("</h2>", '<span class="gx-rb">' + (g.tour ? "🏆 Tournament" : "⚔️ Ranked") + "</span></h2>");
    return h;
  };

  // ===== clicks =====
  document.addEventListener("click", function (e) {
    var el = e.target.closest("[data-gm]"); if (!el || el.disabled) return;
    var a = el.getAttribute("data-gm"), id = el.getAttribute("data-id");
    if (a === "locker") { S.locker = el.getAttribute("data-k"); render(); }
    else if (a === "equip") send({ t: "equip", kind: el.getAttribute("data-k"), id: id });
    else if (a === "lgame") { S.lgame = el.getAttribute("data-g"); send({ t: "ladder", game: S.lgame }); render(); }
    else if (a === "rq") { send({ t: "qm", game: el.getAttribute("data-g") }); toast("Looking for a ranked opponent… you'll be moved when one is found"); }
    else if (a === "tcreate") { var gEl = document.getElementById("gx-tg"), sEl = document.getElementById("gx-ts"), nEl = document.getElementById("gx-tn"); send({ t: "tcreate", game: gEl.value, size: +sEl.value, name: nEl.value }); }
    else if (a === "tjoin" || a === "tleave" || a === "tstart") send({ t: a, id: id });
    else if (a === "tplay") { send({ t: "tplay", id: id }); S.tmatch = null; drawTmatch(); }
    else if (a === "tmx") { S.tmatch = null; drawTmatch(); }
    else if (a === "opt") { var o = {}; o[el.getAttribute("data-k")] = JSON.parse(el.getAttribute("data-v")); send({ t: "opts", o: o }); }
  });
  app.addEventListener("click", function (e) { var el = e.target.closest('[data-act="nav"][data-view="compete"]'); if (el) send({ t: "tlist" }); }, true);
  var baseRender = render;
  render = function () {
    baseRender.apply(this, arguments);
    try { drawTmatch(); var h2 = app.querySelector(".top h2"); if (h2 && S.view === "compete" && !gameShown()) h2.textContent = "Compete"; } catch (er) {}
  };
  window.__gxToast = toastBig;
})();

// ---------- GAM.IO fit: the activity fills the window like an app, on any screen size (loads last) ----------
(function () {
  // 1) big screens: scale the whole interface up so it doesn't look like a small website in a huge window
  var lastZ = 0;
  function rootZoom() {
    var w = window.innerWidth, h = window.innerHeight, z = 1;
    if (w >= 1000) z = Math.max(1, Math.min(w / 1440, h / 860, 2.2));
    z = Math.round(z * 20) / 20;
    if (z !== lastZ) { lastZ = z; document.body.style.zoom = z === 1 ? "" : String(z); document.documentElement.style.setProperty("--uiz", z); }
  }
  // 2) in a game: zoom the board area so it fills the space between the header and the bottom of the window
  var NOFIT = { draw: 1, pool: 1 }; // these size their own canvas to the window already
  function fitGame() {
    var gb = app.querySelector(".shell.ingame .gbody"), g = S.game;
    if (!gb || !g) return;
    gb.style.zoom = "";
    if (g.phase === "lobby" || NOFIT[g.type]) return;
    var main = app.querySelector(".main"); if (!main) return;
    var mr = main.getBoundingClientRect(), r = gb.getBoundingClientRect();
    if (!r.width) return;
    var top = r.top, bottom = top, w0 = 0, kids = gb.children;
    for (var i = 0; i < kids.length; i++) {
      var k = kids[i], cr = k.getBoundingClientRect(), cs = getComputedStyle(k);
      if (cs.position === "fixed" || cs.position === "absolute" || !cr.height) continue;
      bottom = Math.max(bottom, cr.bottom + (parseFloat(cs.marginBottom) || 0));
      if (cr.width < r.width - 2) w0 = Math.max(w0, cr.width); // things that stretch to full width don't limit the zoom
    }
    if (!w0) w0 = r.width;
    var h0 = bottom - top, availH = mr.bottom - top - 10, availW = r.width;
    if (h0 < 20) return;
    var s = Math.max(0.35, Math.min(availW / w0, availH / h0, 1.9));
    if (Math.abs(s - 1) < 0.04) return;
    gb.style.zoom = String(Math.round(s * 100) / 100);
    // layouts can reflow at the new size (e.g. two boards fit side by side), so measure again and adjust
    for (var it = 0; it < 3; it++) {
      var m = measure(gb); if (!m) return;
      var r2 = gb.getBoundingClientRect(), k2 = Math.min(r2.width / (m.w || r2.width), (mr.bottom - r2.top - 10) / m.h);
      if (Math.abs(k2 - 1) < 0.03) return;
      s = Math.max(0.35, Math.min(s * k2, 1.9)); gb.style.zoom = String(Math.round(s * 100) / 100);
    }
  }
  function measure(gb) {
    var r = gb.getBoundingClientRect(), bottom = r.top, w0 = 0, kids = gb.children;
    for (var i = 0; i < kids.length; i++) {
      var k = kids[i], cr = k.getBoundingClientRect(), cs = getComputedStyle(k);
      if (cs.position === "fixed" || cs.position === "absolute" || !cr.height) continue;
      bottom = Math.max(bottom, cr.bottom);
      if (cr.width < r.width - 2) w0 = Math.max(w0, cr.width);
    }
    return bottom > r.top ? { h: bottom - r.top, w: w0 } : null;
  }
  var baseRender = render;
  render = function () {
    rootZoom();
    baseRender.apply(this, arguments);
    try { fitGame(); } catch (e) { console.error("fit", e); }
  };
  var rt = null;
  window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(function () { rootZoom(); render(); }, 120); });
  rootZoom();
  window.__fitGame = fitGame;
})();

// ---------- GAM.IO settings: sound, music, reduced motion, colour-blind mode, language (English / Deutsch) ----------
(function () {
  var SET = { sound: true, music: false, motion: false, cb: false, lang: "auto" };
  try { var saved = JSON.parse(localStorage.getItem("gx_settings") || "null"); if (saved) SET = Object.assign(SET, saved); } catch (e) {}
  var fromServer = false;
  function lang() { return SET.lang === "auto" ? (/^de\b/i.test(navigator.language || "") ? "de" : "en") : SET.lang; }
  function apply() {
    window.__gxMute = !SET.sound; window.__gxVol = SET.sound ? 1 : 0; window.__gxCalm = !!SET.motion;
    document.body.classList.toggle("gx-calm", !!SET.motion);
    document.body.classList.toggle("gx-cb", !!SET.cb);
    document.documentElement.lang = lang();
    if (SET.music) music.start(); else music.stop();
  }
  function save() {
    try { localStorage.setItem("gx_settings", JSON.stringify(SET)); } catch (e) {}
    try { send({ t: "settings", s: SET }); } catch (e) {}
    apply(); render();
  }

  // ===== background music: a soft generated chord loop (no files to download) =====
  var music = (function () {
    var ctx = null, gain = null, timer = null, on = false, step = 0;
    var CH = [[220, 277.2, 329.6, 415.3], [196, 246.9, 293.7, 370], [174.6, 220, 261.6, 329.6], [196, 246.9, 329.6, 392]];
    function tick() {
      if (!on) return;
      var t = ctx.currentTime, ch = CH[step % CH.length]; step++;
      ch.forEach(function (f, i) {
        var o = ctx.createOscillator(), g = ctx.createGain();
        o.type = i % 2 ? "triangle" : "sine"; o.frequency.value = f / (i === 0 ? 2 : 1);
        o.connect(g); g.connect(gain);
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.06, t + 1.2); g.gain.linearRampToValueAtTime(0, t + 4.2);
        o.start(t); o.stop(t + 4.4);
      });
      // a gentle melody note
      var m = ctx.createOscillator(), mg = ctx.createGain(); m.type = "sine"; m.frequency.value = ch[1 + (step % 3)] * 2;
      m.connect(mg); mg.connect(gain); mg.gain.setValueAtTime(0, t + 1); mg.gain.linearRampToValueAtTime(0.025, t + 1.3); mg.gain.exponentialRampToValueAtTime(0.0001, t + 3);
      m.start(t + 1); m.stop(t + 3.2);
    }
    return {
      start: function () {
        if (on) return;
        try {
          ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
          if (!gain) { gain = ctx.createGain(); var lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 1400; gain.connect(lp); lp.connect(ctx.destination); }
          gain.gain.value = 0.6; on = true; if (ctx.state === "suspended") ctx.resume(); tick(); timer = setInterval(tick, 4000);
        } catch (e) {}
      },
      stop: function () { on = false; clearInterval(timer); if (gain) gain.gain.value = 0; },
    };
  })();
  // browsers only allow sound after a tap, so start music on the first click if it's switched on
  document.addEventListener("pointerdown", function () { if (SET.music) music.start(); }, { once: true });

  // ===== settings panel =====
  var open = false;
  function row(key, title, sub) { return '<label class="gx-set"><div><b>' + title + "</b><small>" + sub + '</small></div><button class="gx-sw' + (SET[key] ? " on" : "") + '" data-gs="tog" data-k="' + key + '"><i></i></button></label>'; }
  function panel() {
    if (!open) return "";
    return '<div class="modal gx-setm" data-gs="bg"><div class="box"><h2>Settings</h2>' +
      row("sound", "Sound effects", "Chimes for your turn, invites and rewards") +
      row("music", "Music", "Soft background music while you play") +
      row("motion", "Reduce motion", "Turns off flying cards, bursts and other animations") +
      row("cb", "Colour-blind mode", "Adds shapes to card and piece colours") +
      '<div class="gx-set"><div><b>Language</b><small>Sprache</small></div><div class="gx-langs">' + [["auto", "Auto"], ["en", "English"], ["de", "Deutsch"]].map(function (l) { return '<button class="gx-ro' + (SET.lang === l[0] ? " on" : "") + '" data-gs="lang" data-l="' + l[0] + '">' + l[1] + "</button>"; }).join("") + "</div></div>" +
      '<button class="btn primary" data-gs="close">Done</button></div></div>';
  }
  function drawPanel() {
    var el = document.getElementById("gx-setp"); if (!el) { el = document.createElement("div"); el.id = "gx-setp"; document.body.appendChild(el); }
    el.innerHTML = panel(); translate(el);
  }
  var GEAR = '<svg viewBox="0 0 24 24"><path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zm9 4.6v-2.2l-2.4-.5a7 7 0 0 0-.7-1.7l1.4-2-1.6-1.6-2 1.4a7 7 0 0 0-1.7-.7L13.5 3h-2.2l-.5 2.4a7 7 0 0 0-1.7.7l-2-1.4-1.6 1.6 1.4 2a7 7 0 0 0-.7 1.7L3 10.9v2.2l2.4.5c.2.6.4 1.2.7 1.7l-1.4 2 1.6 1.6 2-1.4c.5.3 1.1.5 1.7.7l.5 2.4h2.2l.5-2.4c.6-.2 1.2-.4 1.7-.7l2 1.4 1.6-1.6-1.4-2c.3-.5.5-1.1.7-1.7z"/></svg>';
  var baseSide = sidebar;
  sidebar = function () { return baseSide.apply(this, arguments).replace('</nav>', '<button class="ni" data-gs="open">' + GEAR + "<span>Settings</span></button></nav>"); };
  document.addEventListener("click", function (e) {
    var el = e.target.closest("[data-gs]"); if (!el) return;
    var a = el.getAttribute("data-gs");
    if (a === "bg" && e.target !== el) return;
    e.preventDefault();
    if (a === "open") { open = true; drawPanel(); }
    else if (a === "close" || a === "bg") { open = false; drawPanel(); }
    else if (a === "tog") { var k = el.getAttribute("data-k"); SET[k] = !SET[k]; save(); drawPanel(); }
    else if (a === "lang") { SET.lang = el.getAttribute("data-l"); save(); drawPanel(); }
  });
  // phones: a gear in the top bar
  var baseRender = render;
  render = function () {
    if (!fromServer && S.me && S.me.settings && Object.keys(S.me.settings).length && !localStorage.getItem("gx_settings")) { fromServer = true; SET = Object.assign(SET, S.me.settings); apply(); }
    baseRender.apply(this, arguments);
    try {
      var top = app.querySelector(".top .me"); if (top && !top.querySelector(".gx-gear")) top.insertAdjacentHTML("beforebegin", '<button class="gx-gear" data-gs="open" aria-label="Settings">' + GEAR + "</button>");
      if (SET.cb) app.querySelectorAll(".c4 .disc").forEach(function (d) { var c = d.style.getPropertyValue("--pc").trim(); d.setAttribute("data-cb", c === COLORS[0] ? "●" : "✕"); });
    } catch (er) {}
  };

  // ===== German =====
  var DE = {
    "Home": "Start", "Games": "Spiele", "Compete": "Wettkampf", "Leaderboard": "Bestenliste", "Profile": "Profil", "Settings": "Einstellungen", "Done": "Fertig",
    "All games": "Alle Spiele", "Your profile": "Dein Profil", "In this call": "In diesem Anruf", "Invite Friends": "Freunde einladen", "Invite": "Einladen",
    "Your next game": "Dein nächstes Spiel", "starts here.": "beginnt hier.", "Pick a game and play together with everyone in your call.": "Such dir ein Spiel aus und spiel mit allen in deinem Anruf.",
    "Play with friends": "Mit Freunden spielen", "Quick match": "Schnelles Spiel", "Featured games": "Empfohlene Spiele", "View all →": "Alle ansehen →", "See all →": "Alle ansehen →",
    "Your Recent Games": "Deine letzten Spiele", "Your games will show up here.": "Deine Spiele erscheinen hier.", "Reach new levels!": "Erreiche neue Level!", "View Profile": "Profil ansehen",
    "Earn XP every game, win to level up and climb the leaderboard.": "Sammle in jedem Spiel XP, gewinne, steig im Level auf und klettere in der Bestenliste.",
    "Hanging out": "Chillt", "Rookie": "Neuling", "Rising Star": "Aufsteiger", "Pro": "Profi", "Champion": "Champion", "Legend": "Legende",
    "Tables in this call": "Tische in diesem Anruf", "Join": "Beitreten", "Watch": "Zuschauen", "Return": "Zurück", "● Playing": "● Läuft", "Finished": "Beendet",
    "All": "Alle", "Cards": "Karten", "Party": "Party", "Strategy": "Strategie", "Classic": "Klassisch", "Dice & Board": "Würfel & Brett", "Word & Quiz": "Wort & Quiz", "Arcade": "Arcade", "Board": "Brett", "Dice": "Würfel", "Word": "Wort", "Quiz": "Quiz", "Sports": "Sport",
    "Popular": "Beliebt", "Hot": "Heiß", "New": "Neu",
    "Chess": "Schach", "Checkers": "Dame", "Connect 4": "Vier gewinnt", "Dots & Boxes": "Käsekästchen", "Sea Battle": "Schiffe versenken", "Draw & Guess": "Zeichnen & Raten", "Word Hunt": "Wortjagd",
    "Lucky Dice": "Glückswürfel", "Liar's Dice": "Lügenwürfel", "Cheat": "Mogeln", "Who's the Spy?": "Wer ist der Spion?", "Tic-Tac-Toe": "Tic-Tac-Toe", "Ultimate Tic-Tac-Toe": "Ultimate Tic-Tac-Toe",
    "Hold'em Poker": "Hold'em Poker", "8-Ball Pool": "8-Ball Billard", "Crazy 8s": "Verrückte 8", "Hearts": "Hearts", "Spades": "Spades", "Bomb Party": "Bombenparty", "Typing Race": "Tipp-Rennen", "Backgammon": "Backgammon", "Gin Rummy": "Gin Rommé", "Minesweeper Battle": "Minensucher-Duell", "Snake Party": "Snake-Party",
    "← Back": "← Zurück", "← Leave": "← Verlassen", "← Games": "← Spiele", "Back": "Zurück", "Leave": "Verlassen", "Resign": "Aufgeben", "Tap Resign again to give up": "Tippe nochmal auf Aufgeben",
    "Leave seat": "Platz verlassen", "Start game": "Spiel starten", "Join game": "Mitspielen", "Waiting for players…": "Warte auf Spieler…", "Host": "Gastgeber", "Computer": "Computer", "Open seat": "Freier Platz",
    "🤖 Play against the computer:": "🤖 Gegen den Computer spielen:", "Easy": "Leicht", "Medium": "Mittel", "Hard": "Schwer",
    "Who can join?": "Wer darf beitreten?", "This call": "Dieser Anruf", "My server": "Mein Server", "Everyone": "Alle",
    "⚙️ Rules": "⚙️ Regeln", "set by the host": "legt der Gastgeber fest", "Turn timer": "Zugzeit", "Normal": "Normal", "Fast": "Schnell", "Relaxed": "Entspannt", "Off": "Aus", "On": "An",
    "Ranked": "Gewertet", "Stack +2 / +4": "+2 / +4 stapeln", "Draw until you can play": "Ziehen, bis du legen kannst", "Rounds": "Runden", "Word pack": "Wortpaket", "Animals": "Tiere", "Food": "Essen", "Things": "Dinge",
    "Questions": "Fragen", "Play to": "Spielen bis", "Lives": "Leben", "Text length": "Textlänge", "Short": "Kurz", "Long": "Lang", "Round length": "Rundenlänge", "Small": "Klein", "Large": "Groß", "Match to": "Match bis",
    "Your turn": "Du bist dran", "YOUR TURN": "DU BIST DRAN", "Play again": "Nochmal spielen", "Back to games": "Zurück zu den Spielen", "See table": "Tisch ansehen", "You win!": "Du gewinnst!", "Game over": "Spiel vorbei", "Spectating": "Zuschauer",
    "Pass": "Passen", "Pick a color": "Wähle eine Farbe", "Cancel": "Abbrechen", "Red": "Rot", "Green": "Grün", "Blue": "Blau", "Yellow": "Gelb",
    "Your turn! Match the color or symbol, or draw": "Du bist dran! Passe Farbe oder Symbol an, oder ziehe", "Play the card you drew, or pass": "Spiel die gezogene Karte oder passe",
    "Your move (white)": "Dein Zug (Weiß)", "Your move (black)": "Dein Zug (Schwarz)", "Your turn — tap a column": "Du bist dran: tippe auf eine Spalte", "Your fleet": "Deine Flotte", "Enemy waters": "Feindliche Gewässer",
    "Shuffle": "Mischen", "Ready": "Bereit", "Place your fleet — shuffle until you like it, then lock in": "Platziere deine Flotte: mische, bis sie dir gefällt, dann bestätige",
    "Daily challenges": "Tägliche Herausforderungen", "Achievements": "Erfolge", "Locker": "Spind", "Card backs": "Kartenrücken", "Board themes": "Brett-Designs", "Profile frames": "Profilrahmen", "Emote packs": "Emote-Pakete",
    "Equip": "Ausrüsten", "Equipped": "Ausgerüstet", "Unlocked": "Freigeschaltet", "Per game": "Pro Spiel", "Wins": "Siege", "Played": "Gespielt", "Total XP": "XP gesamt",
    "Play 5 games": "Spiele 5 Partien", "Win 3 games": "Gewinne 3 Partien", "Play 3 different games": "Spiele 3 verschiedene Spiele", "Win a card game": "Gewinne ein Kartenspiel", "Win a board game": "Gewinne ein Brettspiel",
    "Play 2 party games": "Spiele 2 Partyspiele", "Play 2 games with friends": "Spiele 2 Partien mit Freunden", "Beat a Hard bot": "Besiege einen schweren Bot", "Win a dice or arcade game": "Gewinne ein Würfel- oder Arcadespiel", "Play a ranked match": "Spiele ein gewertetes Match",
    "First Victory": "Erster Sieg", "Win your first game": "Gewinne dein erstes Spiel", "Winner": "Gewinner", "Win 10 games": "Gewinne 10 Spiele", "Veteran": "Veteran", "Win 50 games": "Gewinne 50 Spiele", "Win 100 games": "Gewinne 100 Spiele",
    "Regular": "Stammgast", "Play 25 games": "Spiele 25 Partien", "Explorer": "Entdecker", "Play 10 different games": "Spiele 10 verschiedene Spiele", "Completionist": "Komplettierer", "Play every game at least once": "Spiele jedes Spiel mindestens einmal",
    "All-Rounder": "Allrounder", "Win a card, board, party and arcade game": "Gewinne ein Karten-, Brett-, Party- und Arcadespiel", "Bot Slayer": "Bot-Bezwinger", "Machine Breaker": "Maschinenbrecher", "Beat Hard bots 10 times": "Besiege 10-mal schwere Bots",
    "Hot Streak": "Siegesserie", "Win 3 games in a row": "Gewinne 3 Spiele in Folge", "Unstoppable": "Unaufhaltsam", "Win 5 games in a row": "Gewinne 5 Spiele in Folge", "Social Butterfly": "Geselliger Typ", "Play with 5 different people": "Spiele mit 5 verschiedenen Leuten",
    "Host with the Most": "Bester Gastgeber", "Open 10 tables": "Eröffne 10 Tische", "Daily Grind": "Täglicher Fleiß", "Finish all 3 daily challenges": "Schließe alle 3 Tagesaufgaben ab", "Dedicated": "Hingebungsvoll", "Finish the daily challenges on 7 days": "Schließe die Tagesaufgaben an 7 Tagen ab",
    "Contender": "Herausforderer", "Gold Rank": "Goldrang", "Reach 1400 rating in any ranked game": "Erreiche 1400 Wertung in einem gewerteten Spiel", "Diamond Rank": "Diamantrang", "Reach 1550 rating in any ranked game": "Erreiche 1550 Wertung in einem gewerteten Spiel",
    "Win a tournament": "Gewinne ein Turnier", "Double Digits": "Zweistellig", "Reach level 10": "Erreiche Level 10",
    "Tournaments": "Turniere", "This server": "Dieser Server", "Host a tournament": "Turnier veranstalten", "Create": "Erstellen", "4 players": "4 Spieler", "8 players": "8 Spieler", "16 players": "16 Spieler", "Name (optional)": "Name (optional)",
    "Start": "Starten", "▶ Play your match": "▶ Spiel dein Match", "Final": "Finale", "Champion": "Champion", "Bye": "Freilos", "⚔️ Find ranked match": "⚔️ Gewertetes Match suchen", "⚔️ Ranked": "⚔️ Gewertet", "🏆 Tournament": "🏆 Turnier",
    "No tournaments on this server yet. Host one and everyone here gets notified.": "Auf diesem Server gibt es noch keine Turniere. Veranstalte eins, dann bekommen alle hier Bescheid.", "No ranked games this season yet. Be the first!": "Diese Saison gab es noch keine gewerteten Spiele. Sei der Erste!",
    "Ranked this season": "Gewertet in dieser Saison", "Sound effects": "Soundeffekte", "Music": "Musik", "Reduce motion": "Weniger Bewegung", "Colour-blind mode": "Farbenblind-Modus", "Language": "Sprache",
    "Chimes for your turn, invites and rewards": "Töne für deinen Zug, Einladungen und Belohnungen", "Soft background music while you play": "Leise Hintergrundmusik beim Spielen",
    "Turns off flying cards, bursts and other animations": "Schaltet fliegende Karten, Effekte und andere Animationen aus", "Adds shapes to card and piece colours": "Fügt Karten- und Steinfarben Formen hinzu",
    "Daily challenge done": "Tagesaufgabe geschafft", "All daily challenges done!": "Alle Tagesaufgaben geschafft!", "You levelled up": "Du bist aufgestiegen", "Spectate": "Zuschauen",
    "Pick a game to open your own table. Everyone in the call gets an invite, and several tables can run at once.": "Wähle ein Spiel, um deinen eigenen Tisch zu eröffnen. Alle im Anruf bekommen eine Einladung, und mehrere Tische können gleichzeitig laufen.",
    "💡 Pick a game to open your own table. Everyone in the call gets an invite, and several tables can run at once.": "💡 Wähle ein Spiel, um deinen eigenen Tisch zu eröffnen. Alle im Anruf bekommen eine Einladung, und mehrere Tische können gleichzeitig laufen.",
    "share the call and wait for friends to join": "teile den Anruf und warte auf Freunde", "a seat is open — jump in!": "ein Platz ist frei, spring rein!",
    "Your Recent Games": "Deine letzten Spiele", "Find ranked match": "Gewertetes Match suchen", "Play your match": "Spiel dein Match", "Tournament": "Turnier",
    "Match the color or symbol. ⊘ skips, ⇄ reverses, +2 and +4 make the next player draw. First to empty their hand wins.": "Passe Farbe oder Symbol an. ⊘ setzt aus, ⇄ dreht um, +2 und +4 lassen den Nächsten ziehen. Wer zuerst keine Karten mehr hat, gewinnt.",
    "Type your guess...": "Dein Tipp...", "Type your guess…": "Dein Tipp…", "Undo": "Rückgängig", "Clear": "Löschen", "↶ Undo": "↶ Rückgängig", "🗑 Clear": "🗑 Löschen",
  };
  var RX = [
    [/^Waiting for (.+)…$/, "Warte auf $1…"], [/^(.+) wins!$/, "$1 gewinnt!"], [/^(.+) opened a$/, "$1 hat einen"], [/^ table$/, " Tisch eröffnet"],
    [/^Level (\d+)$/, "Level $1"], [/^(\d+) wins · (\d+) played$/, "$1 Siege · $2 gespielt"], [/^Resets in (.+)$/, "Neu in $1"], [/^In call · (\d+)$/, "Im Anruf · $1"],
    [/^Open · (\d+)\/(\d+) seats$/, "Offen · $1/$2 Plätze"], [/^(\d+) players · (.+)$/, "$1 Spieler · $2"], [/^(\d+)–(\d+) players · (.+)$/, "$1–$2 Spieler · $3"],
    [/^Round (\d+)$/, "Runde $1"], [/^Sign-ups open · (\d+)\/(\d+)$/, "Anmeldung offen · $1/$2"], [/^● Round (\d+) in progress$/, "● Runde $1 läuft"],
    [/^(.+) ran out of time, so a move was made for them$/, "$1 hatte keine Zeit mehr, also wurde für sie gezogen"], [/^(.+) left, so a bot took over their seat$/, "$1 ist gegangen, ein Bot hat den Platz übernommen"],
    [/^(\d+) \/ (\d+) XP$/, "$1 / $2 XP"], [/^Your (.+) rating$/, "Deine $1-Wertung"], [/^(\d+) wins · (\d+) ranked games$/, "$1 Siege · $2 gewertete Spiele"],
    [/^🎁 Finish all three for a \+(\d+) XP bonus$/, "🎁 Schaffe alle drei für +$1 XP Bonus"], [/^🎉 All done! Bonus \+(\d+) XP collected$/, "🎉 Alles geschafft! +$1 XP Bonus kassiert"],
    [/^\+(\d+) is coming your way! Stack another, or draw (\d+)$/, "+$1 kommt auf dich zu! Leg noch eine drauf oder zieh $2"], [/^You're at the$/, "Du bist am"],
    [/^Season (.+) · resets monthly$/, "Saison $1 · monatlicher Reset"], [/^Level (\d+)!$/, "Level $1!"], [/^New (.+) unlocked$/, "Neues Item freigeschaltet"],
  ];
  function tr(t) {
    var k = t.trim(); if (!k) return null;
    if (DE.hasOwnProperty(k)) return t.replace(k, DE[k]);
    var m = k.match(/^([^A-Za-z0-9]+)(.+)$/); // leading icons, arrows or spaces
    if (m && DE.hasOwnProperty(m[2].trim())) return t.replace(k, m[1] + DE[m[2].trim()]);
    for (var i = 0; i < RX.length; i++) if (RX[i][0].test(k)) return t.replace(k, k.replace(RX[i][0], RX[i][1]));
    return null;
  }
  var busy = false;
  function translate(root) {
    if (lang() !== "de" || !root) return;
    busy = true;
    try {
      var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: function (n) { var p = n.parentNode; return p && /^(SCRIPT|STYLE|TEXTAREA)$/.test(p.nodeName) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT; } }), n, list = [];
      while ((n = w.nextNode())) list.push(n);
      list.forEach(function (x) { var r = tr(x.nodeValue); if (r != null && r !== x.nodeValue) x.nodeValue = r; });
      (root.querySelectorAll ? root.querySelectorAll("[placeholder],[title]") : []).forEach(function (el) { ["placeholder", "title"].forEach(function (a) { var v = el.getAttribute(a); if (v) { var r = tr(v); if (r != null) el.setAttribute(a, r); } }); });
    } catch (e) {}
    busy = false;
  }
  new MutationObserver(function (muts) {
    if (busy || lang() !== "de") return;
    muts.forEach(function (m) { m.addedNodes.forEach(function (n) { if (n.nodeType === 1) translate(n); else if (n.nodeType === 3) { var r = tr(n.nodeValue); if (r != null && r !== n.nodeValue) { busy = true; n.nodeValue = r; busy = false; } } }); });
  }).observe(document.body, { childList: true, subtree: true });
  window.__gxT = function (s) { return lang() === "de" ? tr(s) || s : s; };
  apply();
  setTimeout(function () { translate(document.body); }, 0);
})();

// ---------- GAM.IO polish: drawn chess pieces, neon marks, dice tumbles, sparks, confetti (loads after the game packs) ----------
(function () {
  // ===== shared gradients for drawn pieces =====
  try {
    var defs = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    defs.setAttribute("width", "0"); defs.setAttribute("height", "0"); defs.setAttribute("aria-hidden", "true"); defs.style.position = "absolute";
    defs.innerHTML = '<defs>' +
      '<linearGradient id="gxPw" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="#ffffff"/><stop offset=".38" stop-color="#f6f2ff"/><stop offset="1" stop-color="#b8aee0"/></linearGradient>' +
      '<linearGradient id="gxPb" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="#77709c"/><stop offset=".35" stop-color="#2d2748"/><stop offset="1" stop-color="#0c0a18"/></linearGradient>' +
      '<linearGradient id="gxPg" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#fff2a8"/><stop offset="1" stop-color="#f0a72c"/></linearGradient>' +
      "</defs>";
    document.body.appendChild(defs);
  } catch (e) {}

  // ===== chess pieces (original drawings) =====
  var BASE = "M22 95v-3c0-3 2-5 5-5h2l3-6h36l3 6h2c3 0 5 2 5 5v3Z";
  var P = {
    "♟": '<path d="M50 17a12 12 0 0 1 8 21h3a3 3 0 0 1 0 6h-5c2 12 7 23 12 37H32c5-14 10-25 12-37h-5a3 3 0 0 1 0-6h3a12 12 0 0 1 8-21Z"/>',
    "♜": '<path d="M27 15h10v8h7v-8h12v8h7v-8h10v17l-7 5v35l5 9H29l5-9V37l-7-5Z"/><path class="ln" d="M34 37h32"/>',
    "♝": '<path d="M50 7a5 5 0 0 1 3 9c9 5 15 14 15 24 0 8-5 13-10 16h4a3 3 0 0 1 0 6h-4c1 7 4 13 9 19H33c5-6 8-12 9-19h-4a3 3 0 0 1 0-6h4c-5-3-10-8-10-16 0-10 6-19 15-24a5 5 0 0 1 3-9Z"/><path class="ln" d="M56 27 46 43"/>',
    "♞": '<path d="M29 81c0-15 6-23 15-29-7 1-12 5-17 3-5-2-6-7-3-11l15-17c3-4 4-8 4-13 5 2 8 6 9 9 15 3 26 18 26 38 0 7-2 13-3 20Z"/><path class="ln" d="M58 24c7 4 11 12 12 22"/><circle class="eye" cx="46" cy="32" r="3"/><circle class="eye" cx="29" cy="47" r="1.6"/>',
    "♛": '<path d="M29 81 20 32 34 52 35 25 44 50 50 21 56 50 65 25 66 52 80 32 71 81Z"/><path class="ln" d="M31 70h38"/><circle class="gem" cx="20" cy="29" r="5"/><circle class="gem" cx="35" cy="22" r="5"/><circle class="gem" cx="50" cy="17" r="5.5"/><circle class="gem" cx="65" cy="22" r="5"/><circle class="gem" cx="80" cy="29" r="5"/>',
    "♚": '<path d="M50 31c15 0 27 6 27 16 0 9-6 14-8 22l2 12H29l2-12c-2-8-8-13-8-22 0-10 12-16 27-16Z"/><path class="ln" d="M31 68h38M50 33v34"/><path class="gem" d="M46 5h8v7h7v8h-7v9h-8v-9h-7v-8h7Z"/>',
  };
  function piece(sym, side) {
    return '<svg class="gxp ' + side + '" viewBox="0 0 100 100" aria-hidden="true"><g class="body">' + P[sym] + '<path d="' + BASE + '"/></g></svg>';
  }
  var RX_PC = /<span class="pc ([wb])">([♚♛♜♝♞♟])︎?<\/span>/g;
  var RX_KC = /<i class="kc ([wb])">♚︎?<\/i>/g;
  // ===== tic-tac-toe marks drawn as neon strokes =====
  var MX = '<b class="mk x"><svg viewBox="0 0 40 40"><path d="M11 11 29 29M29 11 11 29"/></svg></b>';
  var MO = '<b class="mk o"><svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="10.5"/></svg></b>';

  var baseScreen = gameScreen;
  gameScreen = function (g) {
    var h = baseScreen.apply(this, arguments);
    if (!g || !g.type) return h;
    if (g.type === "chess") h = h.replace(RX_PC, function (_, s, sym) { return '<span class="pc ' + s + '">' + piece(sym, s) + "</span>"; }).replace(RX_KC, function (_, s) { return '<i class="kc ' + s + '">' + piece("♚", s) + "</i>"; });
    if (g.type === "ttt" || g.type === "uttt") h = h.replace(/<b class="mk x">✕<\/b>/g, MX).replace(/<b class="mk o">◯<\/b>/g, MO);
    if (g.type === "draw" && g.state) h = h.replace(/<b class="?word( mask)?"?>[^<]*<\/b>( <small>\(\d+\)<\/small>)?/, function () { return tiles(g.state); });
    return h;
  };

  // ===== Draw & Guess: the word as letter tiles =====
  function tiles(st) {
    var w = st.word ? st.word.toUpperCase() : (st.mask || "").replace(/ /g, "\u00a0"), out = "", k = 0;
    if (st.word) w = w.replace(/ /g, "\u00a0");
    for (var i = 0; i < w.length; i++) {
      var ch = w[i];
      if (ch === "\u00a0") { out += '<i class="dt sp"></i>'; continue; }
      var open = st.word || ch !== "_";
      out += '<i class="dt' + (open ? " on" : "") + (st.word ? " gold" : "") + '" style="--d:' + (k++ * 45) + 'ms">' + (open ? (ch === "_" ? "" : ch) : "") + "</i>";
    }
    return '<span class="dtiles">' + out + "</span>";
  }
  // a brush-sized cursor over the drawing canvas
  var brush = document.createElement("div"); brush.id = "gx-brush"; document.documentElement.appendChild(brush);
  document.addEventListener("pointermove", function (e) {
    var cvs = e.target && e.target.id === "dgc" ? e.target : null, slot = cvs && cvs.closest(".dgslot.mine");
    if (!slot || e.pointerType === "touch") { brush.style.display = "none"; return; }
    var szb = app.querySelector(".tools .sz.on"), swb = app.querySelector(".tools .sw.on");
    var w = szb ? +szb.getAttribute("data-w") : 8, col = swb ? swb.getAttribute("data-c") : "#000", r = cvs.getBoundingClientRect(), d = Math.max(4, w * r.width / 1000);
    brush.style.cssText = "display:block;width:" + d + "px;height:" + d + "px;left:" + (e.clientX - d / 2) + "px;top:" + (e.clientY - d / 2) + "px;border-color:" + (col === "#ffffff" ? "#999" : col);
  });

  // ===== effects canvas: sparks and confetti =====
  var cv = null, ctx = null, parts = [], raf = 0;
  function ensure() {
    if (cv && cv.isConnected) return;
    cv = document.createElement("canvas"); cv.id = "gx-fx"; document.documentElement.appendChild(cv); // outside the zoomed body, so screen pixels map 1:1 ctx = cv.getContext("2d"); size();
  }
  function size() { if (!cv) return; var d = Math.min(2, window.devicePixelRatio || 1); cv.width = innerWidth * d; cv.height = innerHeight * d; ctx.setTransform(d, 0, 0, d, 0, 0); }
  window.addEventListener("resize", size);
  function loop() {
    raf = 0; if (!ctx) return;
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    var now = performance.now();
    parts = parts.filter(function (p) { return now - p.t0 < p.life; });
    parts.forEach(function (p) {
      var t = (now - p.t0) / 1000, k = 1 - (now - p.t0) / p.life;
      var x = p.x + p.vx * t, y = p.y + p.vy * t + 0.5 * p.g * t * t;
      ctx.globalAlpha = Math.max(0, Math.min(1, k * 1.6));
      ctx.fillStyle = p.c;
      if (p.kind === "conf") { ctx.save(); ctx.translate(x, y); ctx.rotate(p.r + t * p.vr); ctx.scale(1, Math.cos(t * p.flip)); ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); ctx.restore(); }
      else { ctx.shadowColor = p.c; ctx.shadowBlur = 10; ctx.beginPath(); ctx.arc(x, y, p.s * (0.4 + k * 0.6), 0, 7); ctx.fill(); ctx.shadowBlur = 0; }
    });
    ctx.globalAlpha = 1;
    if (parts.length) raf = requestAnimationFrame(loop);
  }
  function kick() { if (!raf) raf = requestAnimationFrame(loop); }
  function center(el) { var r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width }; }
  function burst(el, color, n) {
    if (window.__gxCalm || !el) return; ensure();
    var c = center(el), t0 = performance.now(), cnt = n || 14;
    for (var i = 0; i < cnt; i++) { var a = (i / cnt) * Math.PI * 2 + Math.random() * 0.4, sp = 90 + Math.random() * 140; parts.push({ kind: "spark", x: c.x, y: c.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: 260, s: 2.2 + Math.random() * 2.5, c: color || "#ffd84d", t0: t0, life: 420 + Math.random() * 300 }); }
    kick();
  }
  var CONF = ["#ffd84d", "#ff4d8d", "#4dd4ff", "#3ddc84", "#b05cff", "#ff9f43", "#ffffff"];
  function confetti(big) {
    if (window.__gxCalm) return; ensure();
    var t0 = performance.now(), W = innerWidth, n = big ? 170 : 70;
    for (var i = 0; i < n; i++) {
      var left = i % 2 === 0, a = (left ? -60 : -120) * Math.PI / 180 + (Math.random() - 0.5) * 0.9, sp = 520 + Math.random() * 520;
      parts.push({ kind: "conf", x: left ? -10 : W + 10, y: innerHeight * 0.75, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: 900, s: 7 + Math.random() * 7, r: Math.random() * 6, vr: (Math.random() - 0.5) * 14, flip: 4 + Math.random() * 8, c: CONF[i % CONF.length], t0: t0 + Math.random() * 250, life: 2600 + Math.random() * 1200 });
    }
    kick();
  }
  window.__gxFx = { burst: burst, confetti: confetti };
  window.__gxRender = function () { render(); };

  // ===== after every render: animate only what actually changed =====
  var prev = {}, lastGid = null, lastPhase = null;
  function sig(el, kind) {
    if (kind === "mark") { var m = el.querySelector(".mk"); return m ? m.className : ""; }
    if (kind === "die") return el.querySelectorAll(".on").length + "";
    return "";
  }
  var WATCH = [
    { sel: ".ttt .tc", kind: "mark", fx: function (el) { el.classList.add("nw"); burst(el, el.querySelector(".mk.x") ? "#ff4d8d" : "#4dd4ff", 12); } },
    { sel: ".uttt .uc", kind: "mark", fx: function (el) { el.classList.add("nw"); } },
    { sel: ".dicebox .dface", kind: "die", fx: function (el) { if (!el.classList.contains("held")) el.classList.add("tumble"); } },
    { sel: ".ldie", kind: "die", fx: function (el) { el.classList.add("tumble"); } },
    { sel: ".bg-dice .bg-d", kind: "die", fx: function (el) { el.classList.add("tumble"); } },
  ];
  function afterRender() {
    var g = S.game, gid = g ? g.id + ":" + g.type : null;
    if (gid !== lastGid) { prev = {}; lastGid = gid; lastPhase = g ? g.phase : null; }
    if (!g || g.phase === "lobby") { lastPhase = g ? g.phase : null; return; }
    WATCH.forEach(function (w) {
      var els = app.querySelectorAll(w.sel), old = prev[w.sel], now = [];
      for (var i = 0; i < els.length; i++) { now.push(sig(els[i], w.kind)); if (old && old.length === els.length && old[i] !== now[i] && now[i]) w.fx(els[i]); }
      prev[w.sel] = now;
    });
    // Draw & Guess: someone guessed it
    var oks = app.querySelectorAll("#dg-msgs p.ok"); if (prev.__ok != null && oks.length > prev.__ok) { var lastOk = oks[oks.length - 1]; lastOk.classList.add("fresh"); burst(lastOk, "#3ddc84", 18); var tl = app.querySelector(".dtiles"); if (tl) burst(tl, "#ffd84d", 10); } prev.__ok = oks.length;
    // pieces that just landed
    var d = app.querySelector(".c4 .disc[data-new]"); if (d && d.__fx !== 1) { d.__fx = 1; var col = getComputedStyle(d).getPropertyValue("--pc"); setTimeout(function () { burst(d, col.trim() || "#ffd84d", 16); }, 320); }
    var rd = app.querySelector(".rv .rd.new"); if (rd && rd.__fx !== 1) { rd.__fx = 1; burst(rd, rd.classList.contains("p1") ? "#b9b2d8" : "#ffffff", 12); }
    var bx = app.querySelectorAll(".dots rect.bx"); if (prev.__bx != null && bx.length > prev.__bx) burst(bx[bx.length - 1], bx[bx.length - 1].getAttribute("fill"), 22); prev.__bx = bx.length;
    // the end of a game
    if (g.phase === "over") document.querySelectorAll(".gx-yt").forEach(function (f) { f.remove(); });
    if (g.phase === "over" && lastPhase && lastPhase !== "over") {
      var ws = g.winners || (g.winner ? [g.winner] : []), won = ws.indexOf(S.you) >= 0;
      if (won) confetti(true); else if (!ws.length) confetti(false);
      var box = app.querySelector(".modal .box"); if (box) box.classList.add(won ? "gx-won" : ws.length ? "gx-lost" : "gx-draw");
    } else if (g.phase === "over") { var b2 = app.querySelector(".modal .box"); if (b2) { var ws2 = g.winners || (g.winner ? [g.winner] : []); b2.classList.add(ws2.indexOf(S.you) >= 0 ? "gx-won" : ws2.length ? "gx-lost" : "gx-draw"); } }
    lastPhase = g.phase;
  }
  var baseRender = render;
  render = function () {
    baseRender.apply(this, arguments);
    try { afterRender(); } catch (e) { console.error("polish", e); }
  };
})();

// ---------- GAM.IO card motion: cards fly between hands, the table, piles and the trick winner ----------
// Cards are animated as fixed-position "ghost" copies flying between real screen rectangles,
// so the motion lands exactly even when the game view is zoomed to fit the window.
(function () {
  var layer = null;
  function L() { if (!layer || !layer.isConnected) { layer = document.createElement("div"); layer.id = "gx-cardfx"; document.documentElement.appendChild(layer); } return layer; }
  function R(el) { if (!el) return null; var r = el.getBoundingClientRect(); if (!r.width) return null; return { x: r.left, y: r.top, w: r.width, h: r.height, bw: el.offsetWidth || r.width, bh: el.offsetHeight || r.height }; }
  function centerOf(r, w, h) { return { x: r.x + r.w / 2 - w / 2, y: r.y + r.h / 2 - h / 2, w: w, h: h, bw: r.bw, bh: r.bh }; }
  var EASE = "cubic-bezier(.22,.8,.24,1)";
  // fly a copy of the card html from rect a to rect b; hide the target until it lands
  function ghost(html, a, b, o) {
    if (window.__gxCalm || !a || !b) return;
    o = o || {};
    var g = document.createElement("div"); g.className = "gx-ghost"; g.innerHTML = html;
    var bw = b.bw || b.w, bh = b.bh || b.h;
    g.style.cssText = "position:fixed;left:0;top:0;width:" + bw + "px;height:" + bh + "px;transform-origin:0 0;pointer-events:none;z-index:80";
    L().appendChild(g);
    var t = o.target;
    if (t) { t.getAnimations && t.getAnimations().forEach(function (an) { an.cancel(); }); t.style.visibility = "hidden"; }
    var s0 = a.w / bw, s1 = b.w / bw, r0 = o.rot || 0, r1 = o.endRot || 0, arc = o.arc == null ? 40 : o.arc;
    var kf = [
      { transform: "translate(" + a.x + "px," + a.y + "px) scale(" + s0 + ") rotate(" + r0 + "deg)", opacity: o.fadeIn ? 0 : 1 },
      { transform: "translate(" + (a.x + b.x) / 2 + "px," + ((a.y + b.y) / 2 - arc) + "px) scale(" + ((s0 + s1) / 2) * (o.lift || 1.08) + ") rotate(" + (r0 + r1) / 2 + "deg)", opacity: 1, offset: 0.5 },
      { transform: "translate(" + b.x + "px," + b.y + "px) scale(" + s1 + ") rotate(" + r1 + "deg)", opacity: o.fadeOut ? 0 : 1 },
    ];
    var an = g.animate(kf, { duration: o.dur || 480, delay: o.delay || 0, easing: EASE, fill: "both" });
    var done = function () { g.remove(); if (t) { t.style.visibility = ""; if (o.flip && t.animate) t.animate([{ transform: "perspective(600px) rotateY(90deg)" }, { transform: "none" }], { duration: 220, easing: "ease-out" }); else if (o.land !== false && t.animate) t.animate([{ transform: "scale(1.06)" }, { transform: "none" }], { duration: 160, easing: "ease-out" }); } if (o.done) o.done(); };
    an.onfinish = done; an.oncancel = done;
    if (o.sfx && window.__gxSfx) setTimeout(window.__gxSfx, (o.delay || 0) + (o.dur || 480) * 0.85);
  }
  // the engine fades out cards that left the screen; drop those copies when we fly the card somewhere instead
  function killExit(card) { document.querySelectorAll('.gx-exit[data-card="' + card + '"],.gx-exit [data-card="' + card + '"]').forEach(function (e) { (e.classList.contains("gx-exit") ? e : e.closest(".gx-exit")).remove(); }); }
  var BACK = '<div class="card back"></div>';
  function html(el) { var c = el.cloneNode(true); c.removeAttribute("data-fk"); c.style.visibility = ""; c.classList.remove("sel", "new", "play", "can"); return c.outerHTML; }
  // a soft card "snap" sound
  window.__gxSfx = function () {
    if (window.__gxMute) return;
    try {
      var A = window.__gxAC || (window.__gxAC = new (window.AudioContext || window.webkitAudioContext)()), n = A.sampleRate * 0.05, b = A.createBuffer(1, n, A.sampleRate), d = b.getChannelData(0);
      for (var i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3);
      var s = A.createBufferSource(), f = A.createBiquadFilter(), v = A.createGain(); s.buffer = b; f.type = "bandpass"; f.frequency.value = 2400; v.gain.value = 0.18 * (window.__gxVol == null ? 1 : window.__gxVol);
      s.connect(f); f.connect(v); v.connect(A.destination); s.start();
    } catch (e) {}
  };

  // ===================== Hearts / Spades =====================
  function snapTable(g) {
    var t = app.querySelector(".t4"); if (!t) return null;
    var seats = {}; ["s", "w", "n", "e"].forEach(function (k) { seats[k] = R(t.querySelector(".ts-" + k)); });
    var trick = [];
    t.querySelectorAll(".tmid .tc").forEach(function (tc) { var c = tc.querySelector(".card[data-card]"); if (c) trick.push({ card: c.getAttribute("data-card"), r: R(c), html: html(c), rel: (tc.className.match(/tc-(\w)/) || [])[1], win: tc.classList.contains("win") }); });
    var winRel = null; trick.forEach(function (x) { if (x.win) winRel = x.rel; });
    var hand = app.querySelectorAll(".thand .card[data-card]").length;
    return { seats: seats, trick: trick, winRel: winRel, hand: hand, mid: R(t.querySelector(".tmid")) || R(t), gid: g.id };
  }
  function animTable(p, g) {
    var t = app.querySelector(".t4"); if (!t || !p || p.gid !== g.id) return;
    var now = {}; t.querySelectorAll(".tmid .card[data-card]").forEach(function (c) { now[c.getAttribute("data-card")] = c; });
    var had = {}; p.trick.forEach(function (x) { had[x.card] = 1; });
    // opponents' cards fly in from their seat
    Object.keys(now).forEach(function (card) {
      if (had[card]) return;
      var el = now[card], rel = (el.closest(".tc").className.match(/tc-(\w)/) || [])[1];
      if (rel === "s") return; // my own card: the engine already slides it from my hand
      var to = R(el), from = p.seats[rel] || R(t.querySelector(".ts-" + rel)); if (!to || !from) return;
      ghost(html(el), centerOf(from, to.w * 0.55, to.h * 0.55), to, { target: el, rot: { w: -70, e: 70, n: 180, s: 0 }[rel] || 0, endRot: 0, dur: 460, arc: 26, sfx: 1 });
    });
    // a finished trick sweeps to whoever took it
    var gone = p.trick.filter(function (x) { return !now[x.card]; });
    if (gone.length && p.winRel) {
      var dest = R(t.querySelector(".ts-" + p.winRel)) || p.seats[p.winRel];
      gone.forEach(function (x, i) {
        killExit(x.card);
        if (!dest || !x.r) return;
        ghost(x.html, x.r, centerOf(dest, x.r.w * 0.38, x.r.h * 0.38), { delay: i * 70, dur: 520, arc: 18, fadeOut: true, rot: 0, endRot: { w: -90, e: 90, n: 0, s: 0 }[p.winRel] || 0, lift: 1 });
      });
    }
    // a new hand is dealt from the middle of the table
    var hand = app.querySelectorAll(".thand .card[data-card]");
    if (hand.length >= 8 && hand.length - p.hand >= 5) {
      var mid = p.mid || R(t);
      hand.forEach(function (el, i) { var to = R(el); if (!to || !mid) return; ghost(BACK, centerOf(mid, to.w * 0.7, to.h * 0.7), to, { target: el, flip: 1, delay: i * 55, dur: 420, arc: 60, rot: -25 + Math.random() * 50, sfx: i % 3 === 0 }); });
    }
  }

  // ===================== Gin Rummy =====================
  var GM = null; // the Gin state as it was last drawn (S.game is already the new state when render starts)
  function memoGin(g) { var st = g && g.state; GM = st && g.type === "gin" ? { gid: g.id, stock: st.stock, top: st.top, opp: st.opp ? st.opp[g.seat >= 0 ? 1 - g.seat : 1] : 0, phase: st.phase } : null; }
  function snapGin(g) {
    var st = GM; if (!st || st.gid !== g.id || !app.querySelector(".g-gin")) return null;
    var hand = {}; app.querySelectorAll(".gn-hand .card[data-card]").forEach(function (c) { hand[c.getAttribute("data-card")] = 1; });
    var top = app.querySelector(".gn-disc .card[data-card]");
    var backs = app.querySelectorAll(".gn-opp .card");
    return { gid: g.id, stock: st.stock, top: st.top, topR: R(top), topHtml: top ? html(top) : "", opp: st.opp, oppR: R(backs[backs.length - 1]) || R(app.querySelector(".gn-opp")), stockR: R(app.querySelector(".gn-stock .card")), hand: hand, n: Object.keys(hand).length, phase: st.phase };
  }
  function animGin(p, g) {
    var st = g.state; if (!p || p.gid !== g.id || !st || !app.querySelector(".g-gin")) return;
    var oppNow = st.opp ? st.opp[g.seat >= 0 ? 1 - g.seat : 1] : 0;
    var backs = app.querySelectorAll(".gn-opp .card"), oppR = R(backs[backs.length - 1]) || p.oppR, stockR = R(app.querySelector(".gn-stock .card")) || p.stockR;
    var handEls = app.querySelectorAll(".gn-hand .card[data-card]");
    // a fresh deal
    if (handEls.length >= 10 && (p.n === 0 || p.phase === "show")) {
      handEls.forEach(function (el, i) { var to = R(el); ghost(BACK, stockR, to, { target: el, flip: 1, delay: i * 60, dur: 420, arc: 50, sfx: i % 3 === 0 }); });
      backs.forEach(function (el, i) { var to = R(el); ghost(BACK, stockR, to, { target: el, delay: i * 60 + 30, dur: 420, arc: 30 }); });
      return;
    }
    // I drew from the stock
    handEls.forEach(function (el) { var c = el.getAttribute("data-card"); if (!p.hand[c] && c !== p.top && st.stock === p.stock - 1) ghost(html(el), stockR, R(el), { target: el, rot: -12, dur: 520, arc: 70, sfx: 1 }); });
    // the opponent drew
    if (oppNow === p.opp + 1 && oppR) {
      if (st.stock === p.stock - 1) ghost(BACK, stockR, oppR, { target: backs[backs.length - 1], dur: 480, arc: 40, sfx: 1 });
      else if (p.top && p.topR) { killExit(p.top); ghost(p.topHtml, p.topR, oppR, { target: backs[backs.length - 1], dur: 480, arc: 40, endRot: 180, sfx: 1 }); }
    }
    // the opponent discarded
    if (oppNow === p.opp - 1 && st.top && st.top !== p.top) {
      var topEl = app.querySelector(".gn-disc .card[data-card]");
      if (topEl && p.oppR) ghost(html(topEl), p.oppR, R(topEl), { target: topEl, rot: 160, endRot: 0, dur: 520, arc: 50, sfx: 1 });
    }
  }

  // ===================== wire into render =====================
  var baseRender = render;
  render = function () {
    var g = S.game, p = null, kind = null, fresh = false;
    try {
      if (g && g.state && g.phase !== "lobby") {
        if (g.type === "hearts" || g.type === "spades") { kind = "t"; p = snapTable(g); if (!p) fresh = true; }
        else if (g.type === "gin") { kind = "g"; p = snapGin(g); }
      }
    } catch (e) { p = null; }
    baseRender.apply(this, arguments);
    try {
      var g2 = S.game;
      if (kind === "t" && fresh && g2 && g2.state) { var tt = app.querySelector(".t4"); if (tt) animTable({ seats: {}, trick: [], winRel: null, hand: 0, mid: R(tt.querySelector(".tmid")) || R(tt), gid: g2.id }, g2); }
      if (p && g2 && g2.state) { if (kind === "t") animTable(p, g2); else animGin(p, g2); }
      if (kind === "g" || (g2 && g2.type === "gin")) { if (kind === "g" && !p && g2 && g2.state && app.querySelector(".g-gin") && (!GM || GM.gid !== g2.id)) animGin({ gid: g2.id, stock: 99, top: null, opp: 0, phase: "show", n: 0, hand: {}, stockR: null, oppR: null }, g2); memoGin(g2); }
    } catch (e) { console.error("cardfx", e); }
  };
})();

// ---------- GAM.IO share cards: a picture of the result, shared to a Discord channel (or saved in a browser) ----------
(function () {
  var LOWER_BETTER = { hearts: 1 };
  function seatName(s) { return s ? String(s.name || "?") : "?"; }
  function scoresOf(g) {
    var st = g.state || {}, n = g.seats.length, arr = null;
    if (Array.isArray(st.scores) && st.scores.length === n) arr = st.scores;
    else if (Array.isArray(st.score) && st.score.length === n) arr = st.score;
    else if (Array.isArray(st.sn) && st.sn.length === n) arr = st.sn.map(function (x) { return x.score; });
    if (arr && arr.every(function (x) { return typeof x === "number"; })) return arr;
    return null;
  }
  function summary(g) {
    var ws = g.winners || (g.winner ? [g.winner] : []), sc = scoresOf(g), lower = LOWER_BETTER[g.type];
    var rows = g.seats.map(function (s, i) { return { i: i, name: seatName(s), bot: !!(s && s.bot), id: s && s.id, win: ws.indexOf(s && s.id) >= 0, score: sc ? sc[i] : null }; });
    rows.sort(function (a, b) { if (a.win !== b.win) return a.win ? -1 : 1; if (sc) return lower ? a.score - b.score : b.score - a.score; return 0; });
    var me = rows.filter(function (r) { return r.id === S.you; })[0], game = g.name || g.type;
    var others = rows.filter(function (r) { return r !== me; }), bots = others.filter(function (r) { return r.bot; }).length;
    var who = others.length === 1 ? others[0].name : bots === others.length ? others.length + " bots" : others.length + " players";
    var head, sub = "";
    if (me && me.win && ws.length === 1) head = me.name + " beat " + who + " at " + game;
    else if (me && me.win) head = me.name + " tied for the win at " + game;
    else if (!ws.length) head = "A draw at " + game + "!";
    else head = rows[0].name + " won " + game;
    if (me && sc) sub = me.score + (g.type === "hearts" ? " points (lowest wins)" : " points");
    return { head: head, sub: sub, rows: rows.slice(0, 6), hasScore: !!sc, me: me };
  }
  function img(src) { return new Promise(function (res) { var i = new Image(); i.onload = function () { res(i); }; i.onerror = function () { res(null); }; i.src = src; }); }
  function svgImg(svg) { if (!svg) return Promise.resolve(null); if (svg.indexOf("xmlns=") < 0) svg = svg.replace("<svg ", '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" '); return img("data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg)); }
  function rr(c, x, y, w, h, r) { c.beginPath(); c.roundRect(x, y, w, h, r); }
  var FONT = "Inter, 'Segoe UI', system-ui, sans-serif";
  function fit(c, text, max, size, weight) { var s = size; do { c.font = (weight || 900) + " " + s + "px " + FONT; s -= 2; } while (c.measureText(text).width > max && s > 18); return s + 2; }
  async function drawCard(g) {
    var W = 1200, H = 630, cv = document.createElement("canvas"); cv.width = W; cv.height = H; var c = cv.getContext("2d"), sm = summary(g);
    // background
    var bg = c.createLinearGradient(0, 0, W, H); bg.addColorStop(0, "#2a1670"); bg.addColorStop(0.55, "#1a0f4a"); bg.addColorStop(1, "#0e0830"); c.fillStyle = bg; c.fillRect(0, 0, W, H);
    var glow = c.createRadialGradient(300, 250, 20, 300, 250, 420); glow.addColorStop(0, "rgba(176,92,255,.45)"); glow.addColorStop(1, "rgba(176,92,255,0)"); c.fillStyle = glow; c.fillRect(0, 0, W, H);
    var glow2 = c.createRadialGradient(1050, 560, 10, 1050, 560, 380); glow2.addColorStop(0, "rgba(255,77,141,.3)"); glow2.addColorStop(1, "rgba(255,77,141,0)"); c.fillStyle = glow2; c.fillRect(0, 0, W, H);
    for (var k = 0; k < 90; k++) { c.fillStyle = "rgba(255,255,255," + (0.08 + Math.random() * 0.3) + ")"; c.beginPath(); c.arc(Math.random() * W, Math.random() * H, Math.random() * 1.6, 0, 7); c.fill(); }
    if (sm.me && sm.me.win) { c.save(); c.translate(300, 300); for (var r = 0; r < 24; r++) { c.rotate(Math.PI / 12); c.fillStyle = "rgba(255,216,77,.07)"; c.beginPath(); c.moveTo(0, 0); c.lineTo(520, -40); c.lineTo(520, 40); c.closePath(); c.fill(); } c.restore(); }
    // game logo on its tile
    var tile = (window.__gxTile && window.__gxTile[g.type]) || ["#4a3aa8", "#1d1452", "#b05cff"];
    c.save(); c.shadowColor = "rgba(0,0,0,.55)"; c.shadowBlur = 40; c.shadowOffsetY = 16;
    var tg = c.createLinearGradient(130, 120, 470, 460); tg.addColorStop(0, tile[0]); tg.addColorStop(1, tile[1]); c.fillStyle = tg; rr(c, 130, 130, 340, 340, 70); c.fill(); c.restore();
    c.strokeStyle = tile[2] || "#b05cff"; c.globalAlpha = 0.6; c.lineWidth = 4; rr(c, 132, 132, 336, 336, 68); c.stroke(); c.globalAlpha = 1;
    var gl = c.createLinearGradient(0, 130, 0, 300); gl.addColorStop(0, "rgba(255,255,255,.18)"); gl.addColorStop(1, "rgba(255,255,255,0)"); c.fillStyle = gl; rr(c, 130, 130, 340, 170, 70); c.fill();
    var gi = await svgImg(window.__gxLogo ? window.__gxLogo(g.type) : null); if (gi) c.drawImage(gi, 160, 160, 280, 280);
    if (sm.me && sm.me.win) { c.font = "120px " + FONT; c.textAlign = "center"; c.fillText("🏆", 455, 175); }
    // headline
    c.textAlign = "left"; c.fillStyle = "#fff"; var X = 540, MAXW = W - X - 60;
    c.font = "800 26px " + FONT; c.fillStyle = sm.me && sm.me.win ? "#ffd84d" : "#b9b0ff"; c.fillText(sm.me && sm.me.win ? "VICTORY" : (g.winners || []).length || g.winner ? "GAME OVER" : "DRAW", X, 150);
    var words = sm.head.split(" "), lines = [], cur = "";
    var size = 58; c.font = "900 " + size + "px " + FONT;
    words.forEach(function (w) { var t = cur ? cur + " " + w : w; if (c.measureText(t).width > MAXW && cur) { lines.push(cur); cur = w; } else cur = t; }); lines.push(cur);
    if (lines.length > 3) { size = 44; c.font = "900 " + size + "px " + FONT; lines = []; cur = ""; words.forEach(function (w) { var t = cur ? cur + " " + w : w; if (c.measureText(t).width > MAXW && cur) { lines.push(cur); cur = w; } else cur = t; }); lines.push(cur); lines = lines.slice(0, 3); }
    c.fillStyle = "#fff"; c.shadowColor = "rgba(0,0,0,.4)"; c.shadowBlur = 12; lines.forEach(function (l, i) { c.fillText(l, X, 212 + i * (size + 8)); }); c.shadowBlur = 0;
    var y = 212 + lines.length * (size + 8) + 4;
    if (sm.sub) { c.font = "700 28px " + FONT; c.fillStyle = "#ffd84d"; c.fillText(sm.sub, X, y); y += 22; }
    // standings
    y += 22; var medals = ["🥇", "🥈", "🥉"];
    sm.rows.slice(0, Math.min(sm.rows.length, y > 380 ? 3 : 4)).forEach(function (r, i) {
      var rowY = y + i * 50; c.fillStyle = r === sm.me ? "rgba(255,216,77,.16)" : "rgba(255,255,255,.07)"; rr(c, X, rowY, MAXW, 42, 14); c.fill();
      c.font = "26px " + FONT; c.fillText(r.win ? "🏆" : medals[i] || "·", X + 12, rowY + 31);
      var nm = r.name + (r.bot ? " 🤖" : ""); c.fillStyle = "#fff"; fit(c, nm, MAXW - 190, 24, 800); c.fillText(nm, X + 56, rowY + 30);
      if (r.score != null) { c.textAlign = "right"; c.font = "900 24px " + FONT; c.fillStyle = "#ffd84d"; c.fillText(String(r.score), X + MAXW - 16, rowY + 30); c.textAlign = "left"; }
    });
    // footer
    var brand = window.__gxBrand ? await img(window.__gxBrand) : null;
    c.fillStyle = "rgba(0,0,0,.25)"; c.fillRect(0, H - 74, W, 74);
    if (brand) c.drawImage(brand, 40, H - 62, 50, 50);
    c.font = "900 30px " + FONT; c.fillStyle = "#fff"; c.fillText("GAM.IO", brand ? 102 : 40, H - 26);
    c.font = "600 22px " + FONT; c.fillStyle = "#cfc8ff"; c.textAlign = "right"; c.fillText("Play free in your Discord call · Activities → GAM.IO", W - 40, H - 28); c.textAlign = "left";
    return cv;
  }
  function toast(t) { var n = document.createElement("div"); n.className = "gx-sharetoast"; n.textContent = t; document.documentElement.appendChild(n); setTimeout(function () { n.remove(); }, 3200); }
  function tokenOf() { try { return new URLSearchParams(String(wsUrl).split("?")[1]).get("token"); } catch (e) { return null; } }
  var busy = false;
  async function share(btn) {
    var g = S.game; if (!g || busy) return; busy = true; var label = btn.innerHTML; btn.innerHTML = "⏳ Making your card…"; btn.disabled = true;
    try {
      var cv = await drawCard(g), blob = await new Promise(function (r) { cv.toBlob(r, "image/png"); }), tok = tokenOf();
      if (typeof sdk !== "undefined" && sdk && sdk.commands && sdk.commands.openShareMomentDialog && tok) {
        var r = await fetch("/api/share", { method: "POST", headers: { Authorization: "Bearer " + tok, "Content-Type": "image/png" }, body: blob });
        var d = await r.json().catch(function () { return {}; });
        if (!d.url) throw new Error(d.error || "upload failed");
        await sdk.commands.openShareMomentDialog({ mediaUrl: d.url });
      } else {
        var file = new File([blob], "gamio-result.png", { type: "image/png" });
        if (navigator.canShare && navigator.canShare({ files: [file] })) await navigator.share({ files: [file], title: "GAM.IO" });
        else { var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "gamio-result.png"; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000); toast("Saved your result card"); }
      }
    } catch (e) {
      console.warn("share", e);
      toast(/not supported|unsupported|platform/i.test(String(e && e.message)) ? "Sharing works from Discord on a computer" : "Couldn't share right now");
    }
    btn.innerHTML = label; btn.disabled = false; busy = false;
  }
  window.__gxShareCard = drawCard;
  var baseRender = render;
  render = function () {
    baseRender.apply(this, arguments);
    try {
      var g = S.game; if (!g || g.phase !== "over" || g.seat < 0) return;
      var acts = app.querySelector(".modal .box .actions"); if (!acts || acts.querySelector("[data-gxshare]")) return;
      var b = document.createElement("button"); b.className = "btn gx-share"; b.setAttribute("data-gxshare", "1");
      b.innerHTML = typeof sdk !== "undefined" && sdk ? "📸 Share result" : "📸 Save result card";
      b.addEventListener("click", function (e) { e.stopPropagation(); share(b); });
      acts.insertBefore(b, acts.firstChild);
    } catch (e) { console.error("share", e); }
  };
})();
`;
const CSS: string = String.raw`/* ================= GAM.IO pack (loads last) ================= */
.brand-t span{margin-left:0}
/* let the engine drive these instead of replaying on every update */
.mk{animation:none}.rd.new{animation:none}.c4 .disc[data-new]{animation:none}.sea .bc.miss::after{animation:none}
.dots rect.bx{transform-box:fill-box;transform-origin:center}
.afkbar{display:none!important}

/* ----- tables in this call ----- */
.gx-tables{margin:4px 0 18px}
.gx-tl{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:12px}
.gx-t{display:flex;align-items:center;gap:12px;background:linear-gradient(135deg,#251c5e,#1a1446);border:1px solid var(--line);border-radius:18px;padding:10px 12px;position:relative;overflow:hidden;animation:gx-in .35s ease-out}
.gx-t.gx-lobby{border-color:#ffc83d66;box-shadow:0 0 0 1px #ffc83d22,0 8px 24px #0006}
.gx-t.gx-lobby::before{content:"";position:absolute;inset:0;background:linear-gradient(100deg,transparent 30%,#ffffff10 50%,transparent 70%);background-size:250% 100%;animation:gx-shine 3s linear infinite;pointer-events:none}
@keyframes gx-shine{from{background-position:150% 0}to{background-position:-100% 0}}
@keyframes gx-in{from{opacity:0;transform:translateY(10px)}}
.gx-t .art{width:64px;height:64px;flex:none;border-radius:14px}
.gx-tb{flex:1;min-width:0;display:flex;flex-direction:column;gap:3px}
.gx-tb b{font-size:16px}.gx-ph{font-size:12px;color:var(--mut);font-weight:700}
.gx-t.gx-playing .gx-ph{color:#ff6b9a}
.gx-who{display:flex;flex-wrap:wrap;gap:4px}
.gx-chip{font-size:11px;font-weight:800;background:#ffffff12;border-radius:99px;padding:2px 8px}.gx-chip.bot{opacity:.7}
.gx-tbtn{display:flex;flex-direction:column;gap:6px}.gx-tbtn .btn{padding:8px 14px}
.gx-hint{background:#ffffff0a;border:1px dashed var(--line);border-radius:14px;padding:10px 14px;margin:0 0 14px;color:var(--mut);font-weight:700;font-size:14px}

/* ----- invite toasts ----- */
#gx-inv{position:fixed;top:70px;right:14px;z-index:95;display:flex;flex-direction:column;gap:8px;max-width:min(380px,92vw)}
.gx-iv{display:flex;align-items:center;gap:10px;background:linear-gradient(135deg,#2c2170f5,#1b1440f5);border:1px solid #ffc83d88;border-radius:16px;padding:8px 8px 8px 10px;box-shadow:0 12px 30px #000a,0 0 30px #7c4dff44;animation:gx-slide .45s cubic-bezier(.2,.9,.3,1.2)}
@keyframes gx-slide{from{transform:translateX(120%);opacity:0}}
.gx-iv .art{width:40px;height:40px;flex:none;border-radius:10px}
.gx-ivt{flex:1;font-size:13px;line-height:1.3}
.gx-iv .btn{padding:8px 14px}
.gx-ivx{width:28px;height:28px;border-radius:50%;background:#ffffff14;font-size:12px}
#gx-ret{position:fixed;left:50%;bottom:20px;transform:translateX(-50%);z-index:80;display:flex;align-items:center;gap:10px;background:#1b1440f5;border:1px solid var(--gold);border-radius:99px;padding:6px 6px 6px 8px;box-shadow:0 10px 30px #000a;animation:gx-in .3s}
#gx-ret .art{width:32px;height:32px;border-radius:50%}#gx-ret span{font-size:14px}#gx-ret .btn{padding:8px 16px}

/* ----- turn timer ----- */
.gx-timer{width:min(560px,100%);margin:2px auto 8px;display:flex;flex-direction:column;gap:4px;animation:gx-in .3s}
.gx-tw{display:flex;justify-content:space-between;font-size:13px;font-weight:800;color:var(--mut)}
.gx-timer.mine .gx-tw{color:var(--gold)}
.gx-timer i{display:block;height:8px;border-radius:99px;background:#ffffff14;overflow:hidden}
.gx-timer u{display:block;height:100%;width:100%;border-radius:99px;background:linear-gradient(90deg,#4dd4ff,#7c4dff);transition:width .1s linear}
.gx-timer.mine u{background:linear-gradient(90deg,#ffc83d,#ff9f43);box-shadow:0 0 12px #ffc83d}
.gx-timer.urgent u{background:linear-gradient(90deg,#ff4d8d,#ff2d55);animation:gx-blink .5s ease-in-out infinite}
.gx-timer.urgent .gx-tw{color:#ff6b9a}
@keyframes gx-blink{50%{opacity:.55}}

/* ----- your turn: the whole screen lights up ----- */
body::after{content:"";position:fixed;inset:0;pointer-events:none;z-index:85;opacity:0;transition:opacity .35s;
  box-shadow:inset 0 0 0 4px #ffc83d,inset 0 0 60px 10px #ffc83d88,inset 0 0 180px 40px #ff9f4333}
body.gx-myturn::after{opacity:1;animation:gx-breathe 1.8s ease-in-out infinite}
@keyframes gx-breathe{50%{box-shadow:inset 0 0 0 3px #ffc83dcc,inset 0 0 40px 6px #ffc83d55,inset 0 0 120px 20px #ff9f4322}}
body.gx-myturn .plc.turn{animation:gx-chip 1.2s ease-in-out infinite}
@keyframes gx-chip{50%{box-shadow:0 0 26px #ffc83daa}}
.gx-yt{position:fixed;inset:0;z-index:96;pointer-events:none;display:flex;align-items:center;justify-content:center}
.gx-yt b{font-size:clamp(34px,8vw,76px);font-weight:900;letter-spacing:3px;color:#fff;text-shadow:0 0 20px #ffc83d,0 0 50px #ff9f43,0 6px 0 #b35a00;animation:gx-yt 1.25s cubic-bezier(.2,.9,.3,1) forwards}
@keyframes gx-yt{0%{transform:scale(.3);opacity:0}25%{transform:scale(1.1);opacity:1}70%{transform:scale(1);opacity:1}100%{transform:scale(1.4);opacity:0}}

/* ----- effects ----- */
.gx-burst{position:absolute;left:50%;top:50%;z-index:30;pointer-events:none;font-size:64px;font-weight:900;color:#fff;display:flex;flex-direction:column;align-items:center;line-height:1;
  text-shadow:0 0 18px var(--bc,#b05cff),0 4px 0 #0008;animation:gx-burst 1.05s cubic-bezier(.2,.9,.3,1) forwards}
.gx-burst small{font-size:16px;letter-spacing:3px;margin-top:4px}
.gx-burst.jR{--bc:#ff3b4f}.gx-burst.jG{--bc:#2bd46a}.gx-burst.jB{--bc:#2f8cff}.gx-burst.jY{--bc:#ffc61a}
.gx-burst.juno{font-size:34px;color:#ffe14a;--bc:#ff3b4f;top:0}
@keyframes gx-burst{0%{transform:translate(-50%,-50%) scale(.2) rotate(-15deg);opacity:0}30%{transform:translate(-50%,-50%) scale(1.15) rotate(3deg);opacity:1}75%{transform:translate(-50%,-50%) scale(1);opacity:1}100%{transform:translate(-50%,-70%) scale(1.1);opacity:0}}
.gx-ghost{position:fixed;z-index:75;pointer-events:none;width:60px}
.gx-ghost .jc{--cw:60px}
.gx-confetti{position:fixed;inset:0;pointer-events:none;z-index:99;overflow:hidden}
.gx-confetti i{position:absolute;top:-20px;width:9px;height:14px;border-radius:2px;animation:gx-fall linear forwards}
@keyframes gx-fall{to{top:110%;transform:rotate(720deg) translateX(60px)}}
.modal .box{animation:gx-pop2 .35s cubic-bezier(.2,.9,.3,1.3)}
@keyframes gx-pop2{from{transform:scale(.8);opacity:0}}
.plc{transition:transform .25s,box-shadow .25s,border-color .25s}.plc.turn{transform:translateY(-2px)}
.hand .card,.thand .card{transition:transform .18s cubic-bezier(.2,.9,.3,1.2)}
.hand .card.ok:hover,.thand .card.ok:hover{transform:translateY(-12px)}
.btn{transition:transform .12s,box-shadow .2s,filter .2s}.btn:active{transform:scale(.95)}

/* ================= Juno ================= */
:root{--jR:#ff3b4f;--jG:#21c45e;--jB:#2f7dff;--jY:#ffbf1a;--jK:#26213b}
.g-juno{width:100%;align-items:stretch}
.jtable{position:relative;width:min(900px,100%);height:clamp(300px,46vh,430px);margin:6px auto 0;border-radius:50% / 42%;
  background:radial-gradient(ellipse at 50% 40%,#3c2a8f 0%,#24196a 55%,#160f45 100%);
  box-shadow:inset 0 0 0 10px #120b38,inset 0 0 0 13px #ffc83d55,inset 0 20px 60px #0008,0 24px 60px #000a,0 0 70px #7c4dff33}
.jtable::before{content:"";position:absolute;inset:13px;border-radius:inherit;background:repeating-radial-gradient(circle at 50% 50%,#ffffff05 0 2px,transparent 2px 6px);pointer-events:none}
.jseat{position:absolute;transform:translate(-50%,-50%);display:flex;flex-direction:column;align-items:center;gap:2px;z-index:3;transition:transform .3s}
.jseat .av{position:relative;z-index:2;transition:box-shadow .3s}
.jseat.turn{transform:translate(-50%,-50%) scale(1.08)}
.jseat.turn .av{box-shadow:0 0 0 3px var(--gold),0 0 22px #ffc83d!important;animation:gx-chip 1.2s infinite}
.jsn{display:flex;align-items:center;gap:6px;background:#0f0b2bd9;border:1px solid var(--line);border-radius:99px;padding:2px 4px 2px 10px;font-size:12px;white-space:nowrap;max-width:150px}
.jsn b{overflow:hidden;text-overflow:ellipsis}
.jsn em{font-style:normal;font-weight:900;background:#fff;color:#1b1442;border-radius:99px;min-width:22px;text-align:center;padding:1px 6px;transition:transform .2s}
.jseat.one .jsn em{background:#ff3b4f;color:#fff;animation:gx-blink .7s infinite}
.jfan{position:relative;height:46px;width:90px;margin-bottom:-14px}
.jfan i{position:absolute;left:50%;bottom:0;width:30px;height:44px;margin-left:-15px;border-radius:5px;transform-origin:50% 130%;transform:rotate(calc(var(--o) * 9deg));
  background:radial-gradient(ellipse at 50% 50%,#ff3b4f 0 30%,transparent 31%),linear-gradient(135deg,#2a1f63,#140e38);border:2px solid #fff;box-shadow:0 2px 4px #0008;transition:transform .3s}
.jcenter{position:absolute;left:50%;top:56%;transform:translate(-50%,-50%);display:flex;align-items:center;gap:26px;z-index:2}
.jring{position:absolute;left:50%;top:50%;width:300px;height:170px;margin:-85px 0 0 -150px;border-radius:50%;border:3px dashed var(--jc);opacity:.55;filter:drop-shadow(0 0 8px var(--jc));transition:border-color .5s}
.jring.cw{animation:gx-spin 14s linear infinite}.jring.ccw{animation:gx-spin 14s linear infinite reverse}
@keyframes gx-spin{to{transform:rotate(360deg)}}
.jring::before,.jring::after{content:"➤";position:absolute;color:var(--jc);font-size:18px}
.jring::before{top:-12px;left:50%}.jring::after{bottom:-12px;left:50%;transform:rotate(180deg)}
.jring.ccw::before{transform:rotate(180deg)}.jring.ccw::after{transform:none}
.jdeck{position:relative;width:var(--cw);height:calc(var(--cw) * 1.45);--cw:74px;cursor:default}
.jdeck .jc{position:absolute;left:0;top:0}
.jdeck .d2{transform:translate(-3px,-3px)}.jdeck .d1{transform:translate(-6px,-6px)}
.jdeck small{position:absolute;bottom:-20px;left:0;right:0;text-align:center;font-size:11px;font-weight:800;color:var(--mut)}
.jdeck.can{cursor:pointer}.jdeck.can .d1{animation:gx-nudge 1.4s ease-in-out infinite;box-shadow:0 0 0 3px var(--gold),0 0 24px #ffc83d}
@keyframes gx-nudge{50%{transform:translate(-6px,-12px) rotate(-3deg)}}
.jpile{position:relative;width:86px;height:calc(86px * 1.45);--cw:86px}
.jpc{position:absolute;inset:0;transform:rotate(var(--r))}
.jpc .jc{box-shadow:0 4px 10px #0009}
.jcol{position:absolute;top:calc(100% + 6px);left:calc(50% + 56px);transform:translateX(-50%);font-size:11px;font-weight:900;letter-spacing:1px;padding:2px 10px;border-radius:99px;color:#fff;text-transform:uppercase;transition:background .4s}
.jcol.jR{background:var(--jR)}.jcol.jG{background:var(--jG)}.jcol.jB{background:var(--jB)}.jcol.jY{background:var(--jY);color:#2b1d00}
.jlog{position:absolute;left:50%;bottom:16px;transform:translateX(-50%);font-size:12px;color:#ddd6ff;background:#0f0b2bb3;border-radius:99px;padding:3px 12px;white-space:nowrap;max-width:92%;overflow:hidden;text-overflow:ellipsis;z-index:4}
.jl{display:inline-block;font-weight:900;color:#fff;border-radius:5px;padding:0 5px}
.jl.jR{background:var(--jR)}.jl.jG{background:var(--jG)}.jl.jB{background:var(--jB)}.jl.jY{background:var(--jY);color:#2b1d00}.jl.jK{background:conic-gradient(var(--jR) 0 25%,var(--jB) 0 50%,var(--jG) 0 75%,var(--jY) 0)}
.jhint{margin:10px 0 0}

/* card face */
.g-juno,.jtable{--cw:84px}
.jc{position:relative;width:var(--cw);height:calc(var(--cw) * 1.45);border-radius:calc(var(--cw) * .12);background:var(--cc);
  box-shadow:inset 0 0 0 calc(var(--cw) * .05) #fff,inset 0 0 0 calc(var(--cw) * .065) #0002,0 3px 8px #0007;color:#fff;font-weight:900;overflow:hidden;flex:none;user-select:none}
.jc::before{content:"";position:absolute;inset:0;background:linear-gradient(150deg,#ffffff38 0%,transparent 40%,#00000020 100%);pointer-events:none}
.jR{--cc:var(--jR)}.jG{--cc:var(--jG)}.jB{--cc:var(--jB)}.jY{--cc:var(--jY)}.jK{--cc:var(--jK)}
.jmid{position:absolute;left:50%;top:50%;width:62%;height:44%;transform:translate(-50%,-50%) rotate(45deg);border-radius:22%;background:#fff;box-shadow:0 2px 6px #0004;display:flex;align-items:center;justify-content:center}
.jmid b{transform:rotate(-45deg);font-size:calc(var(--cw) * .42);color:var(--cc);text-shadow:2px 2px 0 #0003;letter-spacing:-1px}
.jmid.jw{background:conic-gradient(from 45deg,var(--jR) 0 25%,var(--jB) 0 50%,var(--jG) 0 75%,var(--jY) 0)}
.jmid.jw b{color:#fff;text-shadow:0 2px 0 #000a,0 0 8px #000}
.jtl,.jbr{position:absolute;font-size:calc(var(--cw) * .2);line-height:1;text-shadow:1px 1px 0 #0005}
.jtl{left:calc(var(--cw) * .1);top:calc(var(--cw) * .09)}.jbr{right:calc(var(--cw) * .1);bottom:calc(var(--cw) * .09);transform:rotate(180deg)}
.jback{--cc:#1a1240;background:radial-gradient(ellipse at 50% 50%,#ff3b4f 0 34%,transparent 35%),linear-gradient(135deg,#2c2070,#150e3c)}
.jlogo{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%) rotate(-28deg);font-size:calc(var(--cw) * .25);font-style:italic;letter-spacing:1px;color:#ffe14a;text-shadow:2px 2px 0 #7a0016,0 0 6px #0008}

/* my hand: fanned like you're holding it */
.jhand{position:relative;height:190px;width:100%;margin-top:6px;display:flex;justify-content:center}
.jslot{position:absolute;bottom:14px;left:50%;width:0;transform:translateX(calc(var(--o) * var(--gap))) rotate(calc(var(--o) * var(--rot)));transform-origin:0 400px;transition:transform .35s cubic-bezier(.2,.85,.25,1)}
.jslot .jc{position:absolute;bottom:0;left:calc(var(--cw) / -2);--cw:96px;transition:transform .18s cubic-bezier(.2,.9,.3,1.3),filter .2s,box-shadow .2s;cursor:pointer}
.jhand.mine .jc.ok{transform:translateY(-16px);box-shadow:inset 0 0 0 calc(var(--cw) * .05) #fff,0 0 0 3px var(--gold),0 0 22px #ffc83daa,0 8px 14px #0008}
.jhand.mine .jc.ok:hover{transform:translateY(-34px) scale(1.06)}
.jhand .jc:hover{transform:translateY(-10px)}
.jhand.mine .jc.dim{filter:brightness(.55) saturate(.6)}
.jpick h2{margin-bottom:14px}
.jwheel{display:grid;grid-template-columns:1fr 1fr;gap:10px;width:240px;margin:0 auto 14px}
.jwheel button{height:90px;border-radius:18px;font-weight:900;font-size:18px;color:#fff;background:var(--cc);box-shadow:inset 0 -6px 0 #0003,0 6px 16px #0007;transition:transform .15s}
.jwheel button:hover{transform:scale(1.06)}
.jwheel button:nth-child(1){border-top-left-radius:120px}.jwheel button:nth-child(2){border-top-right-radius:120px}.jwheel button:nth-child(3){border-bottom-left-radius:120px}.jwheel button:nth-child(4){border-bottom-right-radius:120px}
.jwheel .jY{color:#2b1d00}

@media (max-width:640px){
  .jtable{height:300px;border-radius:44% / 36%}
  .jfan{transform:scale(.75);margin-bottom:-20px}
  .jcenter{gap:16px}.jdeck{--cw:56px}.jpile{--cw:64px;width:64px;height:calc(64px * 1.45)}
  .jring{width:220px;height:130px;margin:-65px 0 0 -110px}
  .jslot .jc{--cw:70px}.jhand{height:150px}
  .jcol{left:calc(50% + 40px)}
  .gx-burst{font-size:46px}
  #gx-inv{top:auto;bottom:80px;right:8px;left:8px;max-width:none}
}
.jpend{position:absolute;right:-64px;top:-14px;font-size:30px;font-weight:900;color:#fff;background:linear-gradient(135deg,#ff3b4f,#b3123a);border-radius:16px;padding:4px 12px;box-shadow:0 0 22px #ff3b4f;animation:gx-blink .8s infinite}

/* ================= GAM.IO look: logos, cards, pages (loads last) ================= */
html{background:#0f0c29}body{background-attachment:fixed!important}
/* ---- logo tiles ---- */
.art.gx-art{background:
  radial-gradient(120% 90% at 50% 115%,color-mix(in srgb,var(--tg) 45%,transparent),transparent 60%),
  radial-gradient(60% 60% at 20% 10%,#ffffff22,transparent 70%),
  linear-gradient(160deg,var(--ta),var(--tb))!important;isolation:isolate}
.art.gx-art::before{content:"";position:absolute;inset:0;background:repeating-linear-gradient(135deg,#ffffff07 0 2px,transparent 2px 14px);z-index:-1}
.art.gx-art::after{content:"";position:absolute;left:50%;top:55%;width:70%;height:70%;transform:translate(-50%,-50%);background:radial-gradient(circle,color-mix(in srgb,var(--tg) 55%,transparent),transparent 65%);filter:blur(10px);z-index:-1;opacity:.75}
.gx-ic{height:88%;max-height:118px;width:auto;filter:drop-shadow(0 8px 10px #0008);transition:transform .35s cubic-bezier(.2,.9,.3,1.3)}
.art.sm.gx-art{border-radius:12px;box-shadow:inset 0 0 0 1px #ffffff1a}
.art.sm .gx-ic{height:96%;filter:drop-shadow(0 2px 3px #0008)}
.brand-i{font-size:0}.brand-i .gx-mark{width:72px;height:72px;display:block;margin:0 auto;border-radius:18px;filter:drop-shadow(0 8px 20px #9d5cff99);animation:gx-float 4s ease-in-out infinite}
@keyframes gx-float{50%{transform:translateY(-4px)}}
.brand-t{font-size:24px;letter-spacing:2px;background:linear-gradient(90deg,#fff,#e4d6ff);-webkit-background-clip:text;background-clip:text;color:transparent}
.brand-t span{background:linear-gradient(90deg,#c58bff,#7c4dff);-webkit-background-clip:text;background-clip:text;color:transparent}

/* ---- game cards ---- */
.gcard{background:linear-gradient(180deg,#221a55,#181243);border:1px solid #ffffff14;border-radius:22px;box-shadow:0 10px 24px #0005;transition:transform .25s cubic-bezier(.2,.9,.3,1.2),box-shadow .25s,border-color .25s}
.gcard .art{height:132px;border-radius:0}
.gcard:hover{transform:translateY(-6px);border-color:#ffffff33;box-shadow:0 18px 40px #0008,0 0 0 1px #ffffff22,0 0 40px color-mix(in srgb,var(--tg,#7c4dff) 30%,transparent)}
.gcard:hover .gx-ic{transform:scale(1.08) rotate(-3deg)}
.gcard:active{transform:translateY(-2px) scale(.98)}
.gc-b{padding:12px 14px 14px}
.gc-b b{font-size:16px;letter-spacing:.2px}
.gx-meta{display:flex;gap:6px;margin-top:6px;flex-wrap:wrap}
.gx-meta i{font-style:normal;font-size:11px;font-weight:800;color:#cfc6ff;background:#ffffff10;border-radius:99px;padding:3px 8px}
.gx-meta i.pl{color:#9fe8ff}
.tag{top:10px;right:10px;font-size:10px;letter-spacing:.6px;text-transform:uppercase;padding:4px 9px;backdrop-filter:blur(4px)}
.tag.t-popular{background:linear-gradient(90deg,#3ddc84,#1fb86a);color:#03210f}
.tag.t-new{background:linear-gradient(90deg,#4de1ff,#2fa8ff);color:#031a30}
.tag.t-hot{background:linear-gradient(90deg,#ff8a3d,#ff3b6b);color:#fff}
.gc-b .tag{top:-12px}

/* ---- category chips ---- */
.gx-cats{display:flex;gap:8px;flex-wrap:wrap;margin:4px 0 16px}
.gx-cat{padding:8px 14px;border-radius:99px;background:#ffffff0d;border:1px solid #ffffff14;font-weight:800;font-size:14px;color:#d9d2ff;transition:.2s}
.gx-cat em{font-style:normal;font-size:11px;opacity:.6;margin-left:2px}
.gx-cat:hover{background:#ffffff18}
.gx-cat.on{background:linear-gradient(90deg,var(--acc),var(--acc2));color:#fff;border-color:transparent;box-shadow:0 6px 18px #7c4dff66}

/* ---- hero ---- */
.hero{background:radial-gradient(60% 90% at 22% 60%,#9d5cff66,transparent 60%),radial-gradient(50% 70% at 95% 0%,#ff4d8d33,transparent 60%),linear-gradient(135deg,#3a1f99,#24136b 55%,#1a1050)!important;border:1px solid #ffffff1f;box-shadow:0 20px 50px #0007,inset 0 1px 0 #ffffff22}
.gx-hero{position:relative}
.gx-fl{position:absolute;filter:drop-shadow(0 14px 18px #0009)}
.gx-fl .gx-ic{height:100%;width:100%;max-height:none;filter:none}
.gx-fl.f0{left:22%;top:16%;width:46%;height:62%;animation:gx-bob 5s ease-in-out infinite}
.gx-fl.f1{left:2%;top:8%;width:28%;height:44%;animation:gx-bob 6s ease-in-out -1s infinite}
.gx-fl.f2{left:4%;top:56%;width:28%;height:40%;animation:gx-bob 5.5s ease-in-out -2s infinite}
.gx-fl.f3{left:64%;top:52%;width:28%;height:42%;animation:gx-bob 6.5s ease-in-out -3s infinite}
.gx-fl.f4{left:66%;top:4%;width:24%;height:38%;animation:gx-bob 7s ease-in-out -1.5s infinite}
@keyframes gx-bob{50%{transform:translateY(-10px) rotate(3deg)}}
.hero h1{letter-spacing:-1px}
.hero h1 em{background:linear-gradient(90deg,#ffd84d,#ff8ad8 50%,#b28bff);-webkit-background-clip:text;background-clip:text}

/* ---- shell ---- */
.side{background:linear-gradient(180deg,#201856f2,#120d33f2);box-shadow:0 20px 50px #0006,inset 0 1px 0 #ffffff14}
.ni{position:relative}
.ni.on{background:linear-gradient(90deg,#7c4dff,#b05cff);box-shadow:0 10px 26px #7c4dff66,inset 0 1px 0 #ffffff33}
.ni:not(.on):hover{background:#ffffff10;transform:translateX(2px)}
.sh h3{font-size:19px;letter-spacing:.2px;display:flex;align-items:center;gap:10px}
.sh h3::before{content:"";width:6px;height:20px;border-radius:3px;background:linear-gradient(180deg,#ffd84d,#ff4d8d)}
.panel{box-shadow:0 14px 34px #0005}
.btn.primary{background:linear-gradient(90deg,#7c4dff,#b05cff);box-shadow:0 8px 22px #7c4dff66,inset 0 1px 0 #ffffff40}
.btn.primary:hover{filter:brightness(1.1);box-shadow:0 10px 28px #9d5cff88,inset 0 1px 0 #ffffff40}

/* ---- tables list uses the logos ---- */
.gx-t .art{width:70px;height:70px;border-radius:16px;box-shadow:0 6px 16px #0007}
.gx-iv .art{border-radius:10px}

/* ---- lobby ---- */
.lobby>.art{height:190px;width:min(560px,94%);border-radius:26px;box-shadow:0 20px 50px #0008,inset 0 0 0 1px #ffffff1f}
.lobby>.art .gx-ic{max-height:170px}
.seat{background:linear-gradient(180deg,#221a55,#181243);transition:transform .2s}
.seat.on{box-shadow:0 12px 28px #0007,0 0 0 1px #ffffff1f}
.seat:not(.on){border:2px dashed #a78bfa33;background:#ffffff06}
.seat:not(.on):hover{border-color:#a78bfa77}
.botrow{background:linear-gradient(90deg,#ffffff0a,#ffffff05);border-radius:18px}
.ghead h2 .art.sm{width:44px;height:44px}
.ghead h2{font-size:24px;letter-spacing:.3px}

/* ---- phones ---- */
@media (max-width:760px){
  .grid,.grid.all{grid-template-columns:repeat(2,1fr)!important;gap:10px}
  .gcard .art{height:108px}
  .gc-b{padding:10px 11px 12px}.gc-b b{font-size:14px}
  .gx-meta i{font-size:10px;padding:2px 7px}
  .gx-cats{flex-wrap:nowrap;overflow-x:auto;padding-bottom:4px;margin-right:-12px}
  .gx-cat{flex:none}
  .hero{grid-template-columns:1fr!important}
  .gx-hero{height:170px;min-height:170px}
  .gx-fl.f0{left:30%;width:40%;height:80%;top:6%}.gx-fl.f1{left:6%;width:24%;height:52%}.gx-fl.f2{left:10%;top:52%;width:22%;height:46%}.gx-fl.f3{left:70%;top:48%;width:24%;height:50%}.gx-fl.f4{left:72%;top:2%;width:20%;height:44%}
  .lobby>.art{height:150px}
}
.tag.t-new{display:none}

/* ================= GAM.IO progression UI ================= */
/* toasts */
#gx-notes{position:fixed;right:16px;bottom:96px;z-index:97;display:flex;flex-direction:column;gap:10px;align-items:flex-end;pointer-events:none}
.gx-note{display:flex;align-items:center;gap:12px;min-width:280px;max-width:min(380px,92vw);padding:12px 16px 12px 12px;border-radius:18px;background:linear-gradient(135deg,#3a2794f5,#1d1452f5);border:1px solid #ffd84d88;box-shadow:0 14px 34px #000a,0 0 30px #ffc83d33;animation:gx-noteIn .5s cubic-bezier(.2,.9,.3,1.3);transition:opacity .4s,transform .4s}
.gx-note.out{opacity:0;transform:translateX(40px)}
.gx-note>i{font-style:normal;font-size:30px;width:48px;height:48px;flex:none;display:flex;align-items:center;justify-content:center;border-radius:14px;background:radial-gradient(circle,#ffd84d55,#ffd84d11);animation:gx-spinIn .7s ease-out}
.gx-note b{display:block;font-size:15px}.gx-note span{font-size:12px;color:#d9d0ff}
.gx-note.k-ach{border-color:#ffd84d}.gx-note.k-unlock{border-color:#4dd4ff}.gx-note.k-level{border-color:#b05cff}.gx-note.k-rank{border-color:#3ddc84}.gx-note.k-tour{border-color:#ff9f43}
@keyframes gx-noteIn{from{transform:translateX(120%) scale(.9);opacity:0}}
@keyframes gx-spinIn{from{transform:rotate(-180deg) scale(.2)}}
#gx-tm{position:fixed;left:50%;top:14px;transform:translateX(-50%);z-index:96;display:flex;align-items:center;gap:10px;padding:8px 8px 8px 14px;border-radius:99px;background:linear-gradient(90deg,#ff9f43,#ff4d8d);box-shadow:0 12px 30px #000a;animation:gx-in .4s;max-width:94vw}
#gx-tm i{font-style:normal;font-size:22px}#gx-tm span{font-size:14px}#gx-tm .btn{padding:7px 16px;background:#fff;color:#7a1d3f}
/* daily challenges */
.gx-daily{display:flex;flex-direction:column;gap:10px;margin-bottom:16px}
.gx-daily .sh{margin:0}
.gx-reset{font-size:12px;font-weight:800;color:var(--mut)}
.gx-dc{display:grid;grid-template-columns:28px 1fr auto auto;gap:10px;align-items:center}
.gx-dc .ck{width:24px;height:24px;border-radius:50%;border:2px solid #ffffff33;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:13px}
.gx-dc.done .ck{background:#3ddc84;border-color:#3ddc84;color:#06301a}
.gx-dc b{font-size:14px;display:block;margin-bottom:4px}.gx-dc.done b{color:#9fe8b9}
.gx-dc em{font-style:normal;font-weight:900;font-size:13px}.gx-dc small{font-size:11px;font-weight:800;color:var(--gold);background:#ffd84d1a;border-radius:99px;padding:2px 8px}
.gx-dc .bar{height:7px}
.gx-dall{font-size:13px;font-weight:800;color:#ffd84d;background:#ffd84d12;border:1px dashed #ffd84d55;border-radius:12px;padding:8px 12px}
.gx-dall.done{color:#3ddc84;border-color:#3ddc8455;background:#3ddc8412}
.row .gx-daily.compact{margin:0}
/* achievements */
.gx-achs{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:10px;margin-bottom:18px}
.gx-ach{position:relative;padding:12px;border-radius:16px;background:#ffffff08;border:1px solid #ffffff14;display:flex;flex-direction:column;gap:4px;opacity:.75}
.gx-ach i{font-style:normal;font-size:26px;filter:grayscale(1) opacity(.6)}
.gx-ach b{font-size:14px}.gx-ach span{font-size:12px;color:var(--mut);min-height:30px}
.gx-ach small{font-size:11px;color:var(--mut);font-weight:800}.gx-ach .bar{height:6px}
.gx-ach.on{opacity:1;background:linear-gradient(160deg,#3a2a7a,#221a55);border-color:#ffd84d66;box-shadow:0 0 20px #ffd84d22}
.gx-ach.on i{filter:none}
.gx-ach em{font-style:normal;font-size:11px;font-weight:900;color:#ffd84d}
/* locker */
.gx-lock{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:10px;margin-bottom:18px}
.gx-item{display:flex;flex-direction:column;align-items:center;gap:6px;padding:12px 8px;border-radius:16px;background:#ffffff08;border:1px solid #ffffff14;text-align:center}
.gx-item.on{border-color:var(--gold);box-shadow:0 0 0 1px var(--gold),0 0 22px #ffd84d33}
.gx-item.locked>div{filter:grayscale(.8) brightness(.55)}
.gx-item b{font-size:13px}.gx-item .btn{padding:5px 14px;font-size:12px}
.gx-item small{font-size:11px;font-weight:800}.gx-item .req{color:var(--mut)}.gx-item .ok{color:#3ddc84}
.gx-pv-back .card.back{width:52px;height:74px;border-radius:8px}.gx-pv-back .card.back::after{font-size:16px}
.gx-mini{display:grid!important;grid-template-columns:repeat(4,16px);width:auto!important;padding:0!important;gap:0!important;box-shadow:0 0 0 3px #4a2c17!important;border-radius:4px!important;overflow:hidden}
.gx-mini .sq{width:16px;height:16px;display:block}
.gx-pv-frame{height:66px;display:flex;align-items:center}
.gx-pv-emo{height:66px;display:flex;align-items:center;font-size:20px;letter-spacing:2px}
.gx-packs{grid-column:1/-1;display:flex;flex-wrap:wrap;gap:6px;border-top:1px solid #ffffff1a;padding-top:6px;margin-top:2px}
/* compete */
.gx-rk{display:grid;grid-template-columns:minmax(260px,340px) 1fr;gap:14px;margin-bottom:22px;align-items:start}
.gx-mine{display:flex;flex-direction:column;gap:10px;align-items:flex-start}
.gx-mine>div{display:flex;flex-direction:column;gap:3px}
.gx-mine .art.sm{width:56px;height:56px}
.gx-mine small{color:var(--mut);font-weight:800}.gx-mine b{font-size:44px;line-height:1;font-weight:900}
.gx-mine span{font-size:13px;color:var(--mut)}.gx-mine p{font-size:12px}
.gx-tier{display:inline-block;font-size:11px;font-weight:900;letter-spacing:.5px;text-transform:uppercase;border-radius:99px;padding:3px 9px;color:#1b1442;width:max-content}
.t-bronze{background:linear-gradient(90deg,#e0a370,#b8733f)}.t-silver{background:linear-gradient(90deg,#f1f3f8,#a9b0c2)}.t-gold{background:linear-gradient(90deg,#ffe27a,#f0a72c)}
.t-platinum{background:linear-gradient(90deg,#9ff3e9,#4fc0d0)}.t-diamond{background:linear-gradient(90deg,#c6b6ff,#7cc4ff);box-shadow:0 0 12px #9d8bff}
.lb li.me{background:#ffd84d1a;outline:1px solid #ffd84d55}
.lb li .gx-tier{margin-left:auto;margin-right:8px}
.gx-tnew{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-bottom:12px}
.gx-tnew b{margin-right:6px}
.gx-tnew select,.gx-tnew input{background:#ffffff10;border:1px solid #ffffff22;color:#fff;border-radius:12px;padding:9px 12px;font:inherit;font-weight:700}
.gx-tnew select option{background:#1d1452}
.gx-tnew input{flex:1;min-width:140px}
.gx-tours{display:flex;flex-direction:column;gap:12px}
.gx-tour{display:flex;flex-direction:column;gap:10px}
.gx-tour.s-running{border-color:#ff9f4377;box-shadow:0 0 24px #ff9f4322}
.gx-th{display:flex;align-items:center;gap:12px}.gx-th>div{flex:1;min-width:0;display:flex;flex-direction:column}
.gx-th .art.sm{width:48px;height:48px}.gx-th span{font-size:12px;color:var(--mut);font-weight:700}
.gx-br{display:flex;gap:18px;overflow-x:auto;padding:4px 2px 8px}
.gx-br .col{display:flex;flex-direction:column;justify-content:space-around;gap:10px;min-width:150px}
.gx-br small{font-size:11px;font-weight:900;color:var(--mut);text-transform:uppercase;letter-spacing:.6px}
.gx-br .m{display:flex;flex-direction:column;border-radius:12px;overflow:hidden;border:1px solid #ffffff1f;background:#ffffff08}
.gx-br .m span{padding:6px 10px;font-size:13px;font-weight:700}.gx-br .m span+span{border-top:1px solid #ffffff14}
.gx-br .m .w{background:#3ddc8422;color:#9fe8b9;font-weight:900}.gx-br .m .l{opacity:.45;text-decoration:line-through}.gx-br .m .me{color:#ffd84d}
.gx-br .champ .m{border-color:#ffd84d;box-shadow:0 0 18px #ffd84d44}.gx-br .champ .w{background:#ffd84d22;color:#ffd84d}
.gx-myranks{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:10px;margin-bottom:18px}
.gx-myranks .panel{display:flex;align-items:center;gap:10px;padding:10px}.gx-myranks .panel>div{flex:1;display:flex;flex-direction:column}.gx-myranks span{font-size:12px;color:var(--mut)}
.gx-myranks .art.sm{width:40px;height:40px}
/* lobby rules + badges */
.gx-rules{width:min(620px,100%);margin-top:14px;padding:12px 14px;border-radius:18px;background:#ffffff08;border:1px solid #ffffff14;display:flex;flex-direction:column;gap:8px}
.gx-rh{font-weight:900;font-size:14px}.gx-rh small{font-weight:700;color:var(--mut);font-size:12px;margin-left:6px}
.gx-rr{display:flex;align-items:center;gap:10px;flex-wrap:wrap}.gx-rr>span{min-width:150px;font-size:13px;font-weight:800;color:#d9d2ff}
.gx-rr>div{display:flex;gap:6px;flex-wrap:wrap}
.gx-ro{padding:6px 12px;border-radius:99px;background:#ffffff0d;border:1px solid #ffffff1a;font-size:13px;font-weight:800;color:#d9d2ff}
.gx-ro.on{background:linear-gradient(90deg,var(--acc),var(--acc2));color:#fff;border-color:transparent}
.gx-rb{font-size:12px;font-weight:900;margin-left:10px;padding:3px 10px;border-radius:99px;background:linear-gradient(90deg,#ff9f43,#ff4d8d);vertical-align:middle}
.gx-tl8{font-weight:800;color:#ffb36b}
/* profile frames */
.gfr{position:relative;display:inline-flex;border-radius:50%;flex:none}
.gfr::after{content:"";position:absolute;inset:-4px;border-radius:50%;pointer-events:none}
.gfr-silver::after{border:3px solid #d9dde8;box-shadow:0 0 8px #ffffff66}
.gfr-gold::after{border:3px solid #ffd84d;box-shadow:0 0 12px #ffc83d99}
.gfr-neon::after{border:3px solid #4dd4ff;box-shadow:0 0 12px #4dd4ff,0 0 24px #b05cff88}
.gfr-rainbow::after{inset:-5px;padding:3px;background:conic-gradient(#ff3b4f,#ffbf1a,#21c45e,#2f7dff,#b05cff,#ff3b4f);-webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask-composite:exclude;animation:gx-spin 4s linear infinite}
.gfr-flame::after{border:3px solid #ff7a2f;box-shadow:0 0 10px #ff7a2f,0 -6px 16px #ffcf4d99;animation:gx-flick 1s ease-in-out infinite alternate}
@keyframes gx-flick{to{box-shadow:0 0 16px #ff7a2f,0 -10px 22px #ffcf4dcc}}
.gfr-diamond::after{border:3px solid #c6b6ff;box-shadow:0 0 14px #9d8bff,inset 0 0 6px #fff}
.gfr-crown::after{border:3px solid #ffd84d;box-shadow:0 0 14px #ffc83d}
.gfr-crown::before{content:"👑";position:absolute;left:50%;top:calc(var(--fs) * -.42);transform:translateX(-50%) rotate(-8deg);font-size:calc(var(--fs) * .42);z-index:2;filter:drop-shadow(0 2px 2px #0008)}
/* card backs */
body.back-ocean .card.back,body.back-ocean .jback,body.back-ocean .jfan i{background:repeating-linear-gradient(45deg,#ffffff14 0 6px,transparent 6px 12px),radial-gradient(circle at 50% 50%,#4dd4ff,#0b3d91 75%)!important}
body.back-ember .card.back,body.back-ember .jback,body.back-ember .jfan i{background:repeating-linear-gradient(-45deg,#ffffff12 0 5px,transparent 5px 10px),radial-gradient(circle at 50% 60%,#ffcf4d,#ff5a2f 45%,#6b0f1a 90%)!important}
body.back-galaxy .card.back,body.back-galaxy .jback,body.back-galaxy .jfan i{background:radial-gradient(circle at 30% 25%,#fff 0 1px,transparent 2px),radial-gradient(circle at 70% 60%,#fff 0 1px,transparent 2px),radial-gradient(circle at 45% 80%,#fff 0 1px,transparent 2px),radial-gradient(ellipse at 40% 40%,#ff6bcb88,transparent 50%),radial-gradient(ellipse at 60% 60%,#4d7bff99,transparent 55%),#140b3a!important}
body.back-neon .card.back,body.back-neon .jback,body.back-neon .jfan i{background:linear-gradient(#ff4d8d55 1px,transparent 1px) 0 0/10px 10px,linear-gradient(90deg,#4dd4ff55 1px,transparent 1px) 0 0/10px 10px,#0d0a24!important}
body.back-gold .card.back,body.back-gold .jback,body.back-gold .jfan i{background:repeating-linear-gradient(45deg,#fff3 0 3px,transparent 3px 9px),linear-gradient(135deg,#ffe27a,#c98a12 55%,#7a4a00)!important}
body.back-royal .card.back,body.back-royal .jback,body.back-royal .jfan i{background:radial-gradient(circle at 50% 50%,#ffd84d 0 14%,transparent 15%),repeating-conic-gradient(#6b1d8f 0 10deg,#4a1266 10deg 20deg)!important}
/* board themes (chess + checkers + reversi) */
body.board-marble .chess:not(.checkers) .sq.lt,body.board-marble .gx-mini .sq.lt{background:linear-gradient(135deg,#f7f7fa,#dcdde5)!important}
body.board-marble .chess:not(.checkers) .sq.dk,body.board-marble .gx-mini .sq.dk{background:linear-gradient(135deg,#7d8597,#525a6b)!important}
body.board-marble .chess.checkers .sq.lt{background:linear-gradient(135deg,#7d8597,#525a6b)!important}body.board-marble .chess.checkers .sq.dk{background:#ecedf2!important}
body.board-ocean .chess:not(.checkers) .sq.lt,body.board-ocean .gx-mini .sq.lt{background:#bfe6ff!important}body.board-ocean .chess:not(.checkers) .sq.dk,body.board-ocean .gx-mini .sq.dk{background:#2f7dbf!important}
body.board-ocean .chess.checkers .sq.lt{background:#2f7dbf!important}body.board-ocean .chess.checkers .sq.dk{background:#bfe6ff!important}body.board-ocean .rv{background:linear-gradient(160deg,#1f6fd1,#0b2f75)!important}
body.board-neon .chess:not(.checkers) .sq.lt,body.board-neon .gx-mini .sq.lt{background:#2a1f66!important;box-shadow:inset 0 0 0 1px #b05cff55}body.board-neon .chess:not(.checkers) .sq.dk,body.board-neon .gx-mini .sq.dk{background:#120d33!important;box-shadow:inset 0 0 0 1px #4dd4ff44}
body.board-neon .chess.checkers .sq.lt{background:#120d33!important}body.board-neon .chess.checkers .sq.dk{background:#2a1f66!important}body.board-neon .rv{background:#120d33!important;box-shadow:0 0 0 3px #b05cff,0 0 30px #b05cff88!important}
body.board-neon .pc.w{-webkit-text-stroke:1.2px #4dd4ff}body.board-neon .pc.b{color:#ff4d8d;-webkit-text-stroke:1px #fff6}
body.board-candy .chess:not(.checkers) .sq.lt,body.board-candy .gx-mini .sq.lt{background:#ffe0f0!important}body.board-candy .chess:not(.checkers) .sq.dk,body.board-candy .gx-mini .sq.dk{background:#ff8ac4!important}
body.board-candy .chess.checkers .sq.lt{background:#ff8ac4!important}body.board-candy .chess.checkers .sq.dk{background:#ffe0f0!important}body.board-candy .rv{background:linear-gradient(160deg,#ff8ac4,#c04d8f)!important}
body.board-obsidian .chess:not(.checkers) .sq.lt,body.board-obsidian .gx-mini .sq.lt{background:linear-gradient(135deg,#4a4a5a,#33333f)!important}body.board-obsidian .chess:not(.checkers) .sq.dk,body.board-obsidian .gx-mini .sq.dk{background:linear-gradient(135deg,#17171f,#0a0a10)!important}
body.board-obsidian .chess.checkers .sq.lt{background:#0f0f16!important}body.board-obsidian .chess.checkers .sq.dk{background:#3a3a48!important}body.board-obsidian .rv{background:linear-gradient(160deg,#2a2a36,#0a0a10)!important}
body.board-obsidian .chess:not(.checkers){box-shadow:0 0 0 10px #0a0a10,0 0 0 12px #ffd84d88,0 24px 50px #000a!important}
@media (max-width:760px){.gx-rk{grid-template-columns:1fr}.gx-rr>span{min-width:100%}#gx-notes{bottom:84px;left:8px;right:8px;align-items:stretch}.gx-note{max-width:none}#gx-tm{top:8px}}
.gx-mine p b{font-size:inherit;line-height:inherit}
.row:has(.gx-daily){grid-template-columns:1.35fr 1fr!important}
@media (max-width:900px){.row:has(.gx-daily){grid-template-columns:1fr!important}}

/* ================= GAM.IO fit: app-style full-window layout ================= */
html,body{height:100%;overflow:hidden;overscroll-behavior:none}
body{margin:0}
.shell.ingame .top{display:none}
#app{height:100%}
.splash{min-height:100%}
.shell{height:100%;min-height:0!important;box-sizing:border-box;align-items:stretch}
.side{position:relative!important;top:0!important;height:auto!important;min-height:0;overflow-y:auto;scrollbar-width:none}
.side::-webkit-scrollbar{display:none}
.main{min-height:0;overflow-y:auto;overflow-x:hidden;padding-right:4px;scrollbar-width:thin;scrollbar-color:#ffffff22 transparent}
.main::-webkit-scrollbar{width:8px}.main::-webkit-scrollbar-thumb{background:#ffffff22;border-radius:8px}
.right{min-height:0;overflow-y:auto;scrollbar-width:none}.right::-webkit-scrollbar{display:none}
/* in a game the board is zoomed to fit, so the game column never needs to scroll */
.shell.ingame .main{overflow:hidden}
.shell.ingame .content{flex:1;min-height:0;display:flex;flex-direction:column}
.shell.ingame .gbody{flex:none;transform-origin:top center}
.shell.ingame .g-draw,.shell.ingame .g-pool{flex:1;min-height:0}
.shell.ingame .main:has(.g-draw),.shell.ingame .main:has(.g-pool),.shell.ingame .main:has(.lobby){overflow-y:auto}
.ghead{flex:none}
.top{flex:none}
@media (max-width:760px),(max-height:500px){
  .shell,.shell.ingame{grid-template-columns:1fr!important;padding:10px 10px 76px!important;gap:10px}
  .shell.ingame{padding-bottom:10px!important}
  .side,.right{display:none!important}
  .bnav{display:flex!important;position:fixed;left:0;right:0;bottom:0;z-index:4}
  .shell.ingame~.bnav{display:none!important}
  .top{margin-bottom:8px;min-height:40px}
}
@media (max-height:560px) and (min-width:761px){
  .side{padding:12px 10px;gap:10px}.brand-i .gx-mark{width:48px;height:48px}.brand-t{font-size:18px}
  .ni{padding:9px 12px}
  .shell{padding:10px;gap:12px}
}
@media (max-width:760px){.ghead h2{font-size:18px;white-space:nowrap;gap:8px}.ghead h2 .art.sm{width:34px;height:34px}.ghead .ghost{padding:8px 10px;font-size:14px}}

/* ================= settings ================= */
.gx-setm .box{width:min(460px,94vw);text-align:left;display:flex;flex-direction:column;gap:12px}
.gx-setm h2{text-align:center}
.gx-set{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:10px 12px;border-radius:14px;background:#ffffff08;cursor:pointer}
.gx-set b{display:block;font-size:15px}.gx-set small{font-size:12px;color:var(--mut)}
.gx-sw{width:48px;height:28px;border-radius:99px;background:#ffffff22;position:relative;flex:none;transition:background .2s}
.gx-sw i{position:absolute;left:3px;top:3px;width:22px;height:22px;border-radius:50%;background:#fff;transition:transform .2s;box-shadow:0 2px 6px #0006}
.gx-sw.on{background:linear-gradient(90deg,var(--acc),var(--acc2))}.gx-sw.on i{transform:translateX(20px)}
.gx-langs{display:flex;gap:6px}
.gx-gear{display:none;width:38px;height:38px;border-radius:50%;background:#ffffff10;align-items:center;justify-content:center;margin-right:8px}
.gx-gear svg,.ni svg{fill:currentColor}.gx-gear svg{width:20px;height:20px}
@media (max-width:760px),(max-height:500px){.gx-gear{display:inline-flex}}
.top .me{display:flex}.top{gap:0}
/* reduced motion */
body.gx-calm *,body.gx-calm *::before,body.gx-calm *::after{animation:none!important;transition:none!important}
body.gx-calm.gx-myturn::after{opacity:1}
/* colour-blind shapes */
body.gx-cb .jc.jR::after,body.gx-cb .jc.jG::after,body.gx-cb .jc.jB::after,body.gx-cb .jc.jY::after{position:absolute;right:calc(var(--cw) * .09);top:calc(var(--cw) * .07);font-size:calc(var(--cw) * .17);color:#fff;text-shadow:0 1px 2px #000a;z-index:2}
body.gx-cb .jc.jR::after{content:"▲"}body.gx-cb .jc.jG::after{content:"■"}body.gx-cb .jc.jB::after{content:"●"}body.gx-cb .jc.jY::after{content:"★"}
body.gx-cb .jcol.jR::before{content:"▲ "}body.gx-cb .jcol.jG::before{content:"■ "}body.gx-cb .jcol.jB::before{content:"● "}body.gx-cb .jcol.jY::before{content:"★ "}
body.gx-cb .jwheel .jR::before{content:"▲ "}body.gx-cb .jwheel .jG::before{content:"■ "}body.gx-cb .jwheel .jB::before{content:"● "}body.gx-cb .jwheel .jY::before{content:"★ "}
body.gx-cb .c4 .disc[data-cb]::after{content:attr(data-cb);position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:60%;font-weight:900;color:#000a}
body.gx-cb .c4 .disc{position:relative}
body.gx-cb .tok.c0::after,body.gx-cb .tok.c1::after,body.gx-cb .tok.c2::after,body.gx-cb .tok.c3::after{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:900;color:#fff;text-shadow:0 1px 2px #000}
body.gx-cb .tok.c0::after{content:"▲"}body.gx-cb .tok.c1::after{content:"■"}body.gx-cb .tok.c2::after{content:"●"}body.gx-cb .tok.c3::after{content:"★"}

/* ================= GAM.IO polish ================= */
#gx-fx{position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:9999}
.btn:active,.lvb:active,button.ghost:active{transform:scale(.96)}

/* ---- Chess: drawn pieces ---- */
.chess:not(.checkers) .pc{width:88%;height:88%;display:flex;align-items:center;justify-content:center;font-size:0}
.gxp{width:100%;height:100%;overflow:visible;filter:drop-shadow(0 4px 2px #0006) drop-shadow(0 1px 0 #0004)}
.gxp .body>*{stroke-linejoin:round;stroke-linecap:round}
.gxp.w .body>path{fill:url(#gxPw);stroke:#3b2313;stroke-width:3.2}
.gxp.b .body>path{fill:url(#gxPb);stroke:#050310;stroke-width:3.2}
.gxp .body>path.ln{fill:none;stroke-width:2.6}
.gxp.w .body>path.ln{stroke:#a08970}.gxp.b .body>path.ln{stroke:#8a80b8}
.gxp .gem{fill:url(#gxPg)!important;stroke:#7a4a0a!important;stroke-width:2.4!important}
.gxp .eye{fill:#2a1a0e}.gxp.b .eye{fill:#cfc6ff}
.chess.mine .sq:hover .gxp{filter:drop-shadow(0 9px 4px #0006) drop-shadow(0 1px 0 #0004)}
.kc{display:inline-flex;width:20px;height:20px;vertical-align:middle;font-size:0}
.kc .gxp{filter:drop-shadow(0 1px 1px #0008)}

/* ---- Tic-Tac-Toe and Ultimate: glass slab, neon marks ---- */
.mk svg{width:1em;height:1em;overflow:visible;display:block}
.mk svg *{fill:none;stroke-linecap:round;stroke-width:6.5}
.mk.x svg path{stroke:#ff4d8d;filter:drop-shadow(0 0 4px #ff4d8d) drop-shadow(0 3px 0 #9d0f45)}
.mk.o svg circle{stroke:#38d6ff;filter:drop-shadow(0 0 4px #38d6ff) drop-shadow(0 3px 0 #0b6f8f)}
.nw .mk svg path{stroke-dasharray:28;animation:gx-draw .32s ease-out both}
.nw .mk svg path+path{animation-delay:.12s}
.nw .mk.x svg path{stroke-dasharray:26 26;animation:gx-drawx .4s ease-out both}
.nw .mk.o svg circle{stroke-dasharray:66;animation:gx-drawo .38s ease-out both}
@keyframes gx-drawx{from{stroke-dashoffset:26}to{stroke-dashoffset:0}}
@keyframes gx-drawo{from{stroke-dashoffset:66;transform:rotate(-90deg);transform-origin:center}to{stroke-dashoffset:0}}
.nw .mk{animation:gx-thump .35s cubic-bezier(.2,.9,.3,1.5)}
@keyframes gx-thump{0%{transform:scale(.6)}100%{transform:none}}
.ttt{background:linear-gradient(180deg,#3a2c94,#22186a);box-shadow:0 10px 0 #120b3d,0 26px 46px #000b,0 0 0 2px #8f7cff66,0 0 60px #7c4dff44,inset 0 2px 0 #ffffff33;border-radius:28px;padding:14px}
.ttt .tc{font-size:min(15vw,78px);border-color:#a594ff55!important}
.ttt .tc.open:hover{background:radial-gradient(circle,#ffffff18,transparent 70%)}
.ttt .tc.win{background:radial-gradient(circle,#ffd84d44,transparent 72%)!important;box-shadow:none!important}
.ttt .tc.win .mk{animation:gx-winpulse 1s ease-in-out infinite}
@keyframes gx-winpulse{50%{transform:scale(1.12);filter:brightness(1.3)}}
.uttt{gap:12px}
.uttt .ub{background:linear-gradient(180deg,#33278a,#1d1560);box-shadow:0 6px 0 #110a38,0 14px 24px #0009,inset 0 2px 0 #ffffff26;border:0;border-radius:16px}
.uttt .ub.live{box-shadow:0 6px 0 #6b4a0a,0 0 0 3px #ffd84d,0 0 26px #ffc83d88,inset 0 2px 0 #ffffff26}
.uttt .uc{background:#0d0930aa!important;box-shadow:inset 0 2px 4px #0008;font-size:min(4.5vw,24px)!important}
.uttt .ub.done .uc{opacity:.18}
.uttt .ubw{font-size:min(16vw,84px)}
.uttt .ubw .mk svg *{stroke-width:5}

/* ---- Connect 4: deeper frame, polished discs ---- */
.c4 .disc{background:radial-gradient(circle at 50% 50%,transparent 0 44%,#00000026 45% 49%,#ffffff22 50% 52%,transparent 53%),radial-gradient(circle at 34% 26%,#ffffffd9,transparent 34%),radial-gradient(circle at 50% 60%,var(--pc),color-mix(in srgb,var(--pc) 62%,#000) 100%)!important}
.c4 .disc[data-new]{animation:gx-drop .5s cubic-bezier(.45,0,.6,1) both}
@keyframes gx-drop{0%{transform:translateY(-520%)}62%{transform:translateY(0)}76%{transform:translateY(-14%)}88%{transform:translateY(0)}94%{transform:translateY(-4%)}100%{transform:none}}
.c4.mine .cell:hover{background:radial-gradient(circle at 50% 35%,#24244f,#1a1a48)}

/* ---- Reversi: felt, bevelled discs, flip ---- */
.rv{background:radial-gradient(ellipse at 50% 30%,#2a9a69,#13573b 75%),#145238}
.rd{transform-style:preserve-3d}
.rd.p1{background:radial-gradient(circle at 34% 28%,#8d86ab,#2a2540 45%,#07060e)!important;box-shadow:0 4px 0 #000,0 6px 10px #000a,inset 0 0 0 2px #ffffff14!important}
.rd.p2{background:radial-gradient(circle at 34% 28%,#ffffff,#eeeaff 45%,#b5acdc)!important;box-shadow:0 4px 0 #8c82b6,0 6px 10px #0008,inset 0 0 0 2px #fff!important}
.rd.new{animation:gx-flip .45s ease-out}
@keyframes gx-flip{0%{transform:rotateY(90deg) scale(1.15)}60%{transform:rotateY(-12deg) scale(1.05)}100%{transform:none}}
.rc.open::after{content:"";width:28%;height:28%;border-radius:50%;background:#ffffff55;box-shadow:0 0 10px #fff8;animation:gx-breathe 1.4s ease-in-out infinite}
@keyframes gx-breathe{50%{transform:scale(1.35);opacity:.6}}

/* ---- Checkers: ridged pieces ---- */
.ckp{background:repeating-radial-gradient(circle at 50% 50%,transparent 0 22%,#0000001f 23% 25%,transparent 26% 30%),radial-gradient(circle at 34% 28%,#ffffffb0,transparent 38%),radial-gradient(circle,var(--pc),color-mix(in srgb,var(--pc) 58%,#000))!important;box-shadow:0 5px 0 color-mix(in srgb,var(--pc) 45%,#000),0 8px 12px #000a,inset 0 0 0 3px #ffffff30!important}

/* ---- Dots & Boxes ---- */
.dots{background:radial-gradient(circle at 50% 0%,#3a2c94,#160f45 80%);box-shadow:0 10px 0 #0d0830,0 26px 46px #000b,0 0 0 2px #8f7cff55,0 0 60px #7c4dff44}
.dots circle{fill:#fff;filter:drop-shadow(0 0 5px #b05cff) drop-shadow(0 2px 0 #6b4ad0)}
.dots .ln.drawn{stroke-width:9;filter:drop-shadow(0 0 6px currentColor)}
.dots .ln.last{animation:gx-lnflash .8s ease-out}
@keyframes gx-lnflash{0%{stroke:#fff;stroke-width:14}}
.dots .bx{opacity:.62!important;animation:gx-boxin .4s cubic-bezier(.2,.9,.3,1.4)}
.dots text{fill:#fff;font-weight:900;font-size:30px;paint-order:stroke;stroke:#0005;stroke-width:4px}
@keyframes gx-boxin{from{transform:scale(.2);opacity:0}}
.dots.mine .hitln:hover+circle,.dots.mine .hitln:hover{stroke:#ffd84d55}

/* ---- Dice: real tumbling ---- */
.dface.tumble,.ldie.tumble,.bg-d.tumble{animation:gx-tumble .6s cubic-bezier(.2,.8,.3,1.2)}
@keyframes gx-tumble{0%{transform:translateY(-40px) rotate(-260deg) scale(.7);filter:blur(1.5px)}55%{transform:translateY(4px) rotate(18deg) scale(1.08);filter:none}75%{transform:translateY(-6px) rotate(-6deg)}100%{transform:none}}
.dface i.on{transform:scale(.92)}
.sc tr:nth-child(even) td{background:#ffffff05}
.sc td,.sc th{padding:5px 10px}
.sc th.cur{color:var(--gold);text-shadow:0 0 10px #ffc83d88}
.sc td.pick{animation:gx-glowpick 1.4s ease-in-out infinite}
@keyframes gx-glowpick{50%{background:#ffc83d33;box-shadow:inset 0 0 0 1px #ffd84d88}}
.sc tr.tot td{font-size:17px;font-weight:900;color:#fff;border-top:2px solid #ffffff22}

/* ---- Mancala: glossy gem stones ---- */
.stones i{background:radial-gradient(circle at 35% 30%,#fff,var(--sc,#4dd4ff) 45%,color-mix(in srgb,var(--sc,#4dd4ff) 55%,#000))!important;box-shadow:0 2px 2px #0008!important}
.stones i:nth-child(4n+1){--sc:#ff4d8d}.stones i:nth-child(4n+2){--sc:#3ddc84}.stones i:nth-child(4n+3){--sc:#ffd84d}.stones i:nth-child(4n){--sc:#4dd4ff}
.pit.last{box-shadow:inset 0 8px 16px #000c,0 0 0 3px #ffd84d,0 0 18px #ffc83d88!important}

/* ---- Sea Battle: moving water, explosions ---- */
.sea{background:repeating-linear-gradient(115deg,#ffffff07 0 6px,transparent 6px 22px),linear-gradient(160deg,#0f4a9a,#0b1f66);background-size:60px 60px,100% 100%;animation:gx-water 6s linear infinite}
@keyframes gx-water{to{background-position:60px 0,0 0}}
.bc{background:#ffffff0e;box-shadow:inset 0 0 0 1px #ffffff0a}
.bc.hit{animation:gx-hit .5s ease-out}
@keyframes gx-hit{0%{transform:scale(1.8);filter:brightness(2)}100%{transform:none}}
.bc.miss::after{animation:gx-splash .5s ease-out}
@keyframes gx-splash{0%{transform:scale(2.4);opacity:0}}
.sea.enemy.live .bc.aim:hover{background:#ff4d6d55;box-shadow:inset 0 0 0 2px #ff4d6d}

/* ---- Crazy 8s: real card table ---- */
.felt{background:radial-gradient(ellipse at 50% 35%,#5b37c8,#2a1670 70%,#1b0f50);box-shadow:inset 0 0 0 8px #ffffff10,inset 0 0 60px #0008,0 0 0 10px #2a1a12,0 0 0 13px #b2875a,0 22px 44px #000b;border-radius:120px;padding:26px 54px}
.felt .pile.can .card{animation:gx-nudge 1.4s infinite}

/* ---- Ludo: bigger board, 3D pawns ---- */
.ludo{flex-wrap:nowrap;width:max-content;max-width:100%;margin:0 auto}
@media (max-width:760px){.ludo{flex-wrap:wrap}}
.lboard{width:min(600px,92vw);background:#fff;box-shadow:0 0 0 8px #2a1a66,0 0 0 11px #b05cff88,0 26px 50px #000b,0 0 60px #7c4dff44;border-radius:18px}
.lc{box-shadow:inset 0 0 0 1px #0000000f,inset 0 -2px 0 #0000000a}
.yard{border-radius:18px;opacity:1;box-shadow:inset 0 0 0 6px #ffffff40,inset 0 -8px 16px #0003}
.lc.spot{background:#ffffffee;box-shadow:inset 0 3px 7px #0004}
.tok{border:0!important;margin:8%;box-shadow:0 4px 0 #0005,0 6px 8px #0006,inset 0 0 0 3px #ffffffcc!important;position:relative}
.tok::after{content:"";position:absolute;left:28%;top:18%;width:30%;height:26%;border-radius:50%;background:#ffffffaa;filter:blur(.5px)}
.tok.mv{animation:gx-tokhop .9s ease-in-out infinite!important;box-shadow:0 0 0 3px #ffd84d,0 0 16px 4px #ffc83d,0 6px 8px #0006!important}
@keyframes gx-tokhop{50%{transform:translateY(-14%) scale(1.06)}}
.ldie{background:radial-gradient(circle at 30% 25%,#fff,#f1eeff 55%,#d8d0ff);box-shadow:0 7px 0 #8f80d0,0 12px 20px #0009;border-radius:16px}
.ldie i.on{background:radial-gradient(circle at 40% 35%,#5a4a9e,#1b1240);box-shadow:inset 0 1px 2px #000a}

/* ---- Minesweeper Battle ---- */
.ms-c:not(.open){background:linear-gradient(160deg,#9a8cf0,#6a57d8);box-shadow:inset 0 -3px 0 #0003,inset 0 2px 0 #ffffff66,0 1px 2px #0006}
.ms-c.open{background:#120e36;box-shadow:inset 0 1px 3px #000a}
.ms-c.boom{animation:gx-hit .5s ease-out}
.ms-board{background:linear-gradient(180deg,#33278a,#1d1560);box-shadow:0 8px 0 #110a38,0 20px 36px #000a,inset 0 2px 0 #ffffff26}

/* ---- Snake ---- */
.sn-cv{box-shadow:0 0 0 4px #2a1a66,0 0 0 6px #6dff9a55,0 0 60px #3ddc8433,0 20px 40px #000a}

/* ---- Game over: trophy rays ---- */
.modal .box{position:relative;overflow:hidden}
.modal .box.gx-won::before{content:"";position:absolute;left:50%;top:70px;width:520px;height:520px;margin:-260px 0 0 -260px;background:repeating-conic-gradient(from 0deg,#ffd84d26 0 10deg,transparent 10deg 20deg);border-radius:50%;animation:gx-rays 12s linear infinite;z-index:-1;mask:radial-gradient(circle,#000 20%,transparent 65%);-webkit-mask:radial-gradient(circle,#000 20%,transparent 65%)}
.modal .box.gx-won .big{animation:gx-trophy .8s cubic-bezier(.2,.9,.3,1.5) both}
.modal .box.gx-won h2{background:linear-gradient(90deg,#fff6c2,#ffd84d,#ffb84d);-webkit-background-clip:text;background-clip:text;color:transparent}
.modal .box.gx-lost .big{filter:grayscale(.3) drop-shadow(0 0 12px #8f7cff)}
@keyframes gx-rays{to{transform:rotate(360deg)}}
@keyframes gx-trophy{0%{transform:scale(.2) rotate(-30deg);opacity:0}100%{transform:none;opacity:1}}

/* ---- Player bar pills: a little more depth ---- */
.players .pl,.pbar .pl{box-shadow:0 3px 0 #0004,inset 0 1px 0 #ffffff1a}
@media (prefers-reduced-motion:reduce){.nw .mk,.nw .mk svg *,.dface.tumble,.ldie.tumble,.bg-d.tumble,.c4 .disc[data-new],.rd.new,.tok.mv{animation:none!important}}
body.gx-calm .nw .mk,body.gx-calm .nw .mk svg *,body.gx-calm .tumble,body.gx-calm .c4 .disc[data-new],body.gx-calm .rd.new{animation:none!important}

/* ---- Card tables: wood rail, felt grain, warm light from above ---- */
.t4,.pktable,.ctable,.ldtable{border:0!important;box-shadow:inset 0 0 0 6px #ffffff0d,inset 0 0 70px #000b,0 0 0 10px #3a2212,0 0 0 13px #b2875a,0 0 0 15px #2a170b,0 26px 50px #000b!important;
  background-image:radial-gradient(ellipse at 50% 0%,#ffffff1f,transparent 55%),repeating-radial-gradient(circle at 30% 40%,#ffffff05 0 1px,transparent 1px 3px)!important;background-blend-mode:normal}
.t4,.pktable,.ctable{background-color:#17603f!important}
.ldtable{background-color:#4a1d7a!important}
.t4 .card,.ctable .card{box-shadow:0 8px 14px #0009}
.ts,.ps,.lseat{box-shadow:0 4px 0 #0005,0 10px 18px #0006}
/* ---- Trivia: answers with weight ---- */
.answers .ta{box-shadow:0 5px 0 #0006,0 10px 18px #0005;transition:transform .12s,box-shadow .12s,filter .2s}
.answers .ta[data-act]:hover{transform:translateY(-3px);box-shadow:0 8px 0 #0006,0 16px 24px #0006;filter:brightness(1.12)}
.answers .ta[data-act]:active{transform:translateY(3px);box-shadow:0 2px 0 #0006}
.answers .ta.right{animation:gx-right .6s cubic-bezier(.2,.9,.3,1.4);box-shadow:0 0 0 3px #3ddc84,0 0 30px #3ddc84aa!important}
.answers .ta.wrong{animation:gx-shake .35s 2}
@keyframes gx-right{0%{transform:scale(.9)}60%{transform:scale(1.06)}100%{transform:none}}
.gain{animation:gx-pop2 .5s cubic-bezier(.2,.9,.3,1.5)}
/* ---- Word Hunt tiles ---- */
.wt{transition:transform .1s}.wt:active{transform:translateY(3px);box-shadow:0 2px 0 #b09060}
@media (max-width:640px){.t4,.pktable,.ctable,.ldtable{width:calc(100% - 28px)!important;margin-left:auto!important;margin-right:auto!important;box-shadow:inset 0 0 0 4px #ffffff0d,inset 0 0 50px #000b,0 0 0 6px #3a2212,0 0 0 8px #b2875a,0 16px 30px #000b!important}}

/* ---- Draw & Guess ---- */
.dtiles{display:inline-flex;gap:4px;flex-wrap:wrap;justify-content:center;vertical-align:middle}
.dt{font-style:normal;width:26px;height:32px;border-radius:7px;background:#ffffff12;box-shadow:inset 0 -3px 0 #0004,0 0 0 1px #ffffff22;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:17px;color:#fff}
.dt.sp{width:12px;background:none;box-shadow:none}
.dt.on{background:linear-gradient(180deg,#8f7cff,#5b45d6);box-shadow:inset 0 -3px 0 #0005,0 2px 6px #0006;animation:gx-tileflip .45s var(--d) both}
.dt.gold{background:linear-gradient(180deg,#ffe27a,#f0a72c);color:#3a2200;box-shadow:inset 0 -3px 0 #a0600a,0 0 14px #ffc83d88}
@keyframes gx-tileflip{0%{transform:perspective(300px) rotateX(90deg)}100%{transform:none}}
.dgslot{position:relative;padding:14px 14px 18px;border-radius:22px;background:linear-gradient(180deg,#8a5a34,#5b3519);box-shadow:inset 0 2px 0 #ffffff33,inset 0 -6px 0 #0004,0 18px 40px #000a,0 0 40px #7c4dff33}
.dgslot::before{content:"";position:absolute;left:50%;top:-6px;width:96px;height:17px;margin-left:-48px;border-radius:8px 8px 12px 12px;background:linear-gradient(180deg,#e8e4f2,#9b95b0);box-shadow:0 3px 0 #5d5870,0 6px 10px #0007;z-index:2}
.dgslot #dgc{border:0;border-radius:6px;box-shadow:inset 0 0 0 1px #0002,0 3px 10px #0006;background:#fff}
.dgslot.mine #dgc{cursor:none}
#gx-brush{position:fixed;display:none;border:2px solid #000;border-radius:50%;pointer-events:none;z-index:9998;box-shadow:0 0 0 1px #fff}
.tools{background:#ffffff0d;border:1px solid #ffffff1a;border-radius:18px;padding:8px 12px;box-shadow:0 6px 16px #0006}
.tools .sw{width:32px;height:32px;border:0;border-radius:50% 50% 46% 54%/56% 48% 52% 44%;box-shadow:inset -3px -4px 0 #0003,inset 3px 3px 0 #ffffff55,0 3px 6px #0007;transition:transform .12s}
.tools .sw:hover{transform:translateY(-3px) scale(1.08)}
.tools .sw.on{transform:translateY(-4px) scale(1.15);box-shadow:inset -3px -4px 0 #0003,inset 3px 3px 0 #ffffff55,0 0 0 3px #fff,0 0 16px #fff9}
.tools .sz{background:#ffffff14}.tools .sz.on{background:#ffffff33;box-shadow:0 0 0 2px #ffd84d}
.dgchat .msgs p.ok{background:#3ddc8424;border-radius:10px;padding:4px 8px}
.dgchat .msgs p.ok.fresh{animation:gx-right .6s cubic-bezier(.2,.9,.3,1.4)}
.dghead .clock{transition:color .2s}
.dg .actions .btn.primary{padding:14px 22px;font-size:17px;border-radius:16px;box-shadow:0 6px 0 #4a1d8f,0 12px 22px #0008;text-transform:capitalize}
.dg .actions .btn.primary:hover{transform:translateY(-3px) rotate(-1deg)}

/* ---- share button ---- */
.btn.gx-share{background:linear-gradient(135deg,#5865f2,#8a5cff);color:#fff;box-shadow:0 5px 0 #2f3699,0 10px 20px #0007}
.btn.gx-share:hover{filter:brightness(1.1);transform:translateY(-2px)}
.gx-sharetoast{position:fixed;left:50%;bottom:28px;transform:translateX(-50%);z-index:10000;background:#1b1140f5;border:1px solid #ffffff2a;color:#fff;font-weight:800;padding:10px 18px;border-radius:99px;box-shadow:0 10px 30px #000a;animation:gx-pop2 .35s ease-out}
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

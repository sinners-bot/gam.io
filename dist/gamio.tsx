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
    if (mine && !wasMine) {
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
    var ok = function (c) { return c[0] === "K" || c[0] === st.color || c[1] === top[1]; };
    var seats = "";
    for (var k = 1; k < n; k++) {
      var i = (me + k) % n, a = (180 + (180 * k) / n) * Math.PI / 180, x = 50 + 44 * Math.cos(a), y = 54 + 46 * Math.sin(a), cnt = st.counts[i], m = Math.min(cnt, 12), fan = "";
      for (var j = 0; j < m; j++) fan += '<i style="--o:' + (j - (m - 1) / 2).toFixed(2) + '"></i>';
      seats += '<div class="jseat' + (g.turn === i && g.phase === "playing" ? " turn" : "") + (cnt === 1 ? " one" : "") + '" data-seat="' + i + '" style="left:' + x.toFixed(1) + "%;top:" + y.toFixed(1) + '%"><div class="jfan">' + fan + "</div>" + avatar(g.seats[i], 38, COLORS[i]) + '<div class="jsn"><b>' + nmOf(g, i) + '</b><em>' + cnt + "</em></div></div>";
    }
    var pile = J.pile.map(function (p, idx) { return '<div class="jpc" style="--r:' + p.r + 'deg">' + jcard(p.c, idx === J.pile.length - 1 ? " jtop" : "") + "</div>"; }).join("");
    var deck = '<div class="jdeck' + (mine && !st.drew ? " can" : "") + '" data-act="jdraw">' + jback(" d3") + jback(" d2") + jback(" d1") + "<small>" + st.deck + "</small></div>";
    var center = '<div class="jcenter"><div class="jring ' + (st.dir > 0 ? "cw" : "ccw") + '" style="--jc:var(--j' + st.color + ')"></div>' + deck + '<div class="jpile">' + pile + '</div><div class="jcol j' + st.color + '">' + JCN[st.color] + "</div></div>";
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
    var hint = g.phase === "playing" ? (mine ? (st.drew ? "Play the card you drew, or pass" : "Your turn! Match the color or symbol, or draw") : g.seat < 0 ? "" : "Waiting for " + nmOf(g, g.turn) + "…") : "";
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
    if (a === "jdraw") { if (mine && !g.state.drew) send({ t: "move", action: "draw" }); else if (mine) toast("You already drew. Play it or pass"); }
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
    if (!(c[0] === "K" || c[0] === st.color || c[1] === st.top[1])) { el.animate([{ transform: "translateX(0)" }, { transform: "translateX(-6px)" }, { transform: "translateX(6px)" }, { transform: "translateX(0)" }], { duration: 260 }); toast("That card doesn't match"); return; }
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
    if (!el || !from) return;
    var to = el.getBoundingClientRect(), dx = from.left + from.width / 2 - (to.left + to.width / 2), dy = from.top + from.height / 2 - (to.top + to.height / 2);
    var sc = opts && opts.scale != null ? opts.scale : from.width && to.width ? from.width / to.width : 1;
    var base = getComputedStyle(el).transform; base = base === "none" ? "" : base;
    var kf = [{ transform: "translate(" + dx + "px," + dy + "px) scale(" + sc + ") rotate(" + ((opts && opts.rot) || 0) + "deg) " + base }];
    if (opts && opts.arc) kf.push({ transform: "translate(" + dx / 2 + "px," + (dy / 2 - opts.arc) + "px) scale(" + (sc + 1) / 2 + ") " + base, offset: 0.5 });
    kf.push({ transform: base || "none" });
    el.animate(kf, { duration: (opts && opts.dur) || 420, easing: EASE, delay: (opts && opts.delay) || 0, fill: "backwards" });
  }
  function pop(el, delay, dur) { if (el) el.animate([{ transform: "scale(.3)", opacity: 0 }, { transform: "scale(1.15)", opacity: 1, offset: 0.65 }, { transform: "scale(1)", opacity: 1 }], { duration: dur || 340, easing: "ease-out", delay: delay || 0, fill: "backwards" }); }
  function burst(host, txt, cls) {
    if (!host) return; var b = document.createElement("div"); b.className = "gx-burst " + (cls || ""); b.innerHTML = txt; host.appendChild(b); setTimeout(function () { b.remove(); }, 1100);
  }
  function ghostFly(fromRect, toEl, html, delay) { // a temporary card flying between two places on screen
    if (!fromRect || !toEl) return;
    var to = toEl.getBoundingClientRect(), d = document.createElement("div");
    d.className = "gx-ghost"; d.innerHTML = html; d.style.left = fromRect.left + "px"; d.style.top = fromRect.top + "px";
    document.body.appendChild(d);
    var dx = to.left + to.width / 2 - (fromRect.left + 30), dy = to.top + to.height / 2 - (fromRect.top + 42);
    var an = d.animate([{ transform: "translate(0,0) scale(1) rotate(0)", opacity: 1 }, { transform: "translate(" + dx + "px," + dy + "px) scale(.45) rotate(" + (dx > 0 ? 20 : -20) + "deg)", opacity: 0.85 }], { duration: 480, easing: EASE, delay: delay || 0, fill: "both" });
    an.onfinish = function () { d.remove(); };
  }
  function confetti() {
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
  function svg(defs, body) { return '<svg class="gx-ic" viewBox="0 0 120 120" aria-hidden="true"><defs>' + defs + "</defs>" + body + "</svg>"; }
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
  };
  var cache = {};
  function logo(id) { if (!IC[id]) return null; if (!cache[id]) cache[id] = IC[id](); return cache[id]; }
  window.__gxLogo = logo;
  var baseArt = art;
  art = function (id, small) {
    var l = logo(id); if (!l) return baseArt(id, small);
    var t = TILE[id] || ["#3a2b85", "#151137", "#b05cff"];
    return '<div class="art gx-art art-' + id + (small ? " sm" : "") + '" style="--ta:' + t[0] + ";--tb:" + t[1] + ";--tg:" + t[2] + '">' + l + "</div>";
  };

  // ===== brand mark =====
  var LOGO = "data:image/webp;base64,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";
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

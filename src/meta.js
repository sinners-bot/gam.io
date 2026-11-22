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

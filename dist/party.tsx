// Game Night party pack — serves the party games' browser code, styles and server-side game logic (a plugin the game server loads).
const JS: string = String.raw`// ---------- Game Night UI plugin: party games ----------
(function () {
  var PARTY = { mafia: 1, spy: 1, trivia: 1, wordhunt: 1, draw: 1 };
  GAMES = GAMES.filter(function (m) { return m.id !== "mafia" && m.id !== "wordhunt"; });
  GAMES.splice(4, 0,
    { id: "mafia", name: "Mafia", cat: "Party", players: "4–12 players", tag: "New", icon: "🕵️" },
    { id: "draw", name: "Draw & Guess", cat: "Party", players: "2–8 players", tag: "New", icon: "🎨" },
    { id: "trivia", name: "Trivia", cat: "Quiz", players: "1–10 players", tag: "New", icon: "🧠" },
    { id: "wordhunt", name: "Word Hunt", cat: "Word", players: "1–8 players", tag: "New", icon: "🔤" },
    { id: "spy", name: "Who's the Spy?", cat: "Party", players: "3–10 players", tag: "New", icon: "🕶️" });
  var skew = 0, pending = null, pen = { c: "#111111", w: 8 }, drawing = false;
  function left(st) { return Math.max(0, Math.ceil((st.deadline - (Date.now() + skew)) / 1000)); }
  function clock(st) { return '<span class="clock" data-dl="' + st.deadline + '">⏱ ' + left(st) + "s</span>"; }
  setInterval(function () { document.querySelectorAll("[data-dl]").forEach(function (el) { el.textContent = "⏱ " + Math.max(0, Math.ceil((+el.getAttribute("data-dl") - (Date.now() + skew)) / 1000)) + "s"; }); }, 250);
  function nm(g, i) { return g.seats[i] ? esc(g.seats[i].name) : "?"; }
  function names(g, txt) { return esc(txt).replace(/\{(\d+)\}/g, function (_, i) { return "<b>" + nm(g, +i) + "</b>"; }); }
  function ptile(g, i, extra, act) {
    var s = g.seats[i];
    return '<button class="pt' + (extra.cls || "") + '"' + (act ? ' data-act="' + act + '" data-t="' + i + '"' : " disabled") + ">" + avatar(s, 46, COLORS[i % COLORS.length]) + "<b>" + esc(s.name) + (s.id === S.you ? " (you)" : "") + "</b>" + (extra.sub ? "<small>" + extra.sub + "</small>" : "") + "</button>";
  }
  function scoreBar(g, score) {
    var order = g.seats.map(function (s, i) { return i; }).sort(function (a, b) { return score[b] - score[a]; });
    return '<div class="players">' + order.map(function (i) { return '<div class="plc">' + avatar(g.seats[i], 28, COLORS[i % COLORS.length]) + "<span>" + nm(g, i) + '</span><em class="cnt score">' + score[i] + "</em></div>"; }).join("") + "</div>";
  }

  var R = {
    trivia: function (g) {
      var st = g.state, rev = st.phase === "reveal", L = "ABCD";
      var btns = st.a.map(function (a, i) {
        var cls = "ta a" + i + (st.mine === i ? " mine" : "") + (rev ? (i === st.c ? " right" : st.mine === i ? " wrong" : " dim") : "");
        var who = rev && st.picks ? Object.keys(st.picks).filter(function (k) { return st.picks[k].a === i; }).map(function (k) { return avatar(g.seats[+k], 22); }).join("") : "";
        return '<button class="' + cls + '"' + (!rev && st.mine < 0 && g.seat >= 0 ? ' data-act="tq" data-a="' + i + '"' : "") + "><i>" + L[i] + "</i><span>" + esc(a) + '</span><div class="who">' + who + "</div></button>";
      }).join("");
      var mine = rev && st.picks && st.picks[g.seat] ? (st.picks[g.seat].pts ? '<p class="gain">+' + st.picks[g.seat].pts + "</p>" : '<p class="miss">No points this time</p>') : "";
      return scoreBar(g, st.score) + '<div class="qcard"><div class="qtop"><span>Question ' + (st.i + 1) + " / " + st.n + " · " + esc(st.cat) + "</span>" + (g.phase === "playing" ? clock(st) : "") + '</div><h3>' + esc(st.q) + '</h3><div class="answers">' + btns + "</div>" + mine +
        '<p class="hint">' + (rev ? "" : st.mine >= 0 ? "Locked in! " + st.answered.length + "/" + g.seats.length + " answered" : "Faster answers score more") + "</p></div>";
    },
    wordhunt: function (g) {
      var st = g.state, play = st.phase === "play" && g.phase === "playing";
      var tiles = st.grid.map(function (t, i) { return '<button class="wt"' + (play ? ' data-act="wtile" data-l="' + t + '"' : "") + ">" + (t === "QU" ? "Qu" : t) + "</button>"; }).join("");
      var mine = (st.mine || []).map(function (f) { return "<li><b>" + f.w + "</b><em>+" + f.p + "</em></li>"; }).join("") || '<li class="muted">Type words you can trace on the board</li>';
      var all = st.all ? '<div class="allw">' + st.all.map(function (ws, i) { return "<div><h4>" + nm(g, i) + " · " + st.score[i] + "</h4><p>" + ws.map(function (f) { return f.w; }).join(", ") + "</p></div>"; }).join("") + "</div>" : "";
      return scoreBar(g, st.score) + '<div class="wh"><div><div class="whead">' + (play ? clock(st) : "<b>Time's up!</b>") + (st.dict ? "" : '<small class="muted"> dictionary loading — any traceable word counts</small>') + '</div><div class="wgrid">' + tiles + "</div>" +
        (play && g.seat >= 0 ? '<form class="wform" data-form="wh"><input id="wh-in" autocomplete="off" placeholder="Type a word and press Enter" maxlength="16"><button class="btn primary">Go</button></form>' : "") +
        '</div><div class="panel wlist"><h3>Your words (' + (st.mine || []).length + ")</h3><ul>" + mine + "</ul></div></div>" + all;
    },
    spy: function (g) {
      var st = g.state, me = g.seat, ph = st.phase;
      var card = st.role === "spy" ? '<div class="rcard spy"><div class="big">🕶️</div><h3>You are the spy!</h3><p>Blend in and figure out the location.</p></div>'
        : st.role === "agent" ? '<div class="rcard"><div class="big">📍</div><h3>' + esc(st.loc) + "</h3><p>Find the spy without saying the location outright.</p></div>" : '<div class="rcard"><div class="big">👀</div><h3>Spectating</h3></div>';
      var info = ph === "talk" ? "<b>" + nm(g, st.first) + "</b> asks the first question. Take turns asking each other questions in voice. " + clock(st)
        : ph === "vote" ? "🗳️ Vote for who you think the spy is! " + clock(st) + " · " + st.votes.length + "/" + g.seats.length + " voted"
        : ph === "spyguess" ? "🎯 " + esc(st.result) + " " + clock(st) : esc(st.result);
      var tiles = g.seats.map(function (s, i) {
        var canVote = ph === "vote" && me >= 0 && i !== me && st.myVote === undefined;
        return ptile(g, i, { cls: (st.myVote === i ? " sel" : "") + (st.spy === i ? " spy" : ""), sub: st.spy === i ? "the spy" : ph === "vote" && st.votes.indexOf(i) >= 0 ? "voted" : "" }, canVote ? "spyvote" : "");
      }).join("");
      var canGuess = st.role === "spy" && (ph === "talk" || ph === "spyguess");
      var locs = '<div class="locs">' + st.locs.map(function (l) { return '<button class="loc' + (canGuess ? " can" : "") + (st.loc === l && ph === "over" ? " right" : "") + '"' + (canGuess ? ' data-act="spyguess" data-loc="' + esc(l) + '"' : " disabled") + ">" + esc(l) + "</button>"; }).join("") + "</div>";
      return card + '<p class="hint">' + info + '</p><div class="ptiles">' + tiles + "</div>" + (ph === "talk" && me >= 0 ? '<div class="actions"><button class="btn primary" data-act="callvote">🗳️ Call a vote now</button></div>' : "") +
        '<h3 class="sec">Possible locations' + (canGuess ? " — tap one to guess (ends the game!)" : "") + "</h3>" + locs;
    },
    mafia: function (g) {
      var st = g.state, me = g.seat, alive = me >= 0 && st.alive[me], ph = st.phase;
      var RI = { mafia: ["🔪", "Mafia", "Each night, agree with your team on who to eliminate."], doctor: ["🩺", "Doctor", "Each night, pick one player to protect."], detective: ["🔎", "Detective", "Each night, investigate one player."], villager: ["🧑‍🌾", "Villager", "Find the mafia and vote them out by day."], watch: ["👀", "Spectating", ""] };
      var ri = RI[st.role] || RI.watch;
      var card = '<div class="rcard ' + st.role + (alive || me < 0 ? "" : " dead") + '"><div class="big">' + (alive || me < 0 ? ri[0] : "💀") + "</div><h3>" + (alive || me < 0 ? ri[1] : "You're out (" + ri[1] + ")") + "</h3><p>" + ri[2] + "</p>" +
        (st.team.length > 1 && st.role === "mafia" ? "<p>Team: " + st.team.map(function (i) { return nm(g, i); }).join(", ") + "</p>" : "") +
        (st.checks.length ? "<p>" + st.checks.map(function (c) { return nm(g, c.t) + (c.mafia ? " is <b class=redt>MAFIA</b>" : " is innocent"); }).join(" · ") + "</p>" : "") + "</div>";
      var act = "", prompt = "";
      if (ph === "night" && alive) {
        if (st.role === "mafia") { act = "mkill"; prompt = st.myKill !== undefined ? "Target chosen — waiting for the night to end" : "🌙 Pick someone to eliminate"; }
        else if (st.role === "doctor") { act = "msave"; prompt = st.mySave >= 0 ? "Protecting " + nm(g, st.mySave) : "🌙 Pick someone to protect (you can pick yourself)"; }
        else if (st.role === "detective") { act = "mcheck"; prompt = st.myCheck >= 0 ? "Investigating " + nm(g, st.myCheck) : "🌙 Pick someone to investigate"; }
        else prompt = "🌙 The town sleeps… mafia are choosing a target.";
      } else if (ph === "day") { prompt = alive ? (st.votes[me] !== undefined ? "Vote cast — you can change it until everyone has voted" : "☀️ Discuss in voice, then vote someone out") : "☀️ The town is voting"; if (alive) act = "mvote"; }
      else if (ph === "night") prompt = "🌙 Night " + st.day;
      var tally = {}; Object.keys(st.votes).forEach(function (k) { var v = st.votes[k]; tally[v] = (tally[v] || 0) + 1; });
      var tiles = g.seats.map(function (s, i) {
        var dead = !st.alive[i], role = st.roles[i], mate = st.team.indexOf(i) >= 0 && st.role === "mafia";
        var can = act && !dead && !(act === "mkill" && mate) && !(act === "mcheck" && i === me);
        var picked = (act === "mkill" && st.myKill === i) || (act === "msave" && st.mySave === i) || (act === "mcheck" && st.myCheck === i) || (act === "mvote" && st.votes[me] === i);
        var sub = dead ? "💀 " + (role || "") : mate ? "🔪 teammate" : ph === "day" && tally[i] ? "🗳️ " + tally[i] : "";
        return ptile(g, i, { cls: (dead ? " dead" : "") + (picked ? " sel" : ""), sub: sub }, can ? act : "");
      }).join("");
      var log = '<div class="panel mlog">' + st.log.slice().reverse().map(function (l) { return "<p>" + names(g, l) + "</p>"; }).join("") + "</div>";
      return card + '<p class="hint">' + prompt + (g.phase === "playing" ? " " + clock(st) : "") + '</p><div class="ptiles">' + tiles + "</div>" + (ph === "day" && alive ? '<div class="actions"><button class="btn dark" data-act="mvote" data-t="-1">Skip vote</button></div>' : "") + log;
    },
    draw: function (g) {
      var st = g.state, me = g.seat, drawer = st.drawer === me, ph = st.phase;
      var top = ph === "pick" ? (drawer ? "Pick a word to draw:" : nm(g, st.drawer) + " is choosing a word…") : drawer || st.word ? "<b class=word>" + esc(st.word.toUpperCase()) + "</b>" : '<b class="word mask">' + st.mask.split("").join(" ") + "</b> <small>(" + st.len + ")</small>";
      var choices = st.choices ? '<div class="actions">' + st.choices.map(function (w, i) { return '<button class="btn primary" data-act="dpick" data-i="' + i + '">' + esc(w) + "</button>"; }).join("") + "</div>" : "";
      var tools = drawer && ph === "draw" ? '<div class="tools">' + PALETTE.map(function (c) { return '<button class="sw' + (pen.c === c ? " on" : "") + '" style="background:' + c + '" data-act="pen" data-c="' + c + '"></button>'; }).join("") +
        '<button class="sw er' + (pen.c === "#ffffff" ? " on" : "") + '" data-act="pen" data-c="#ffffff" title="Eraser">🧽</button>' +
        [3, 8, 18, 40].map(function (w) { return '<button class="sz' + (pen.w === w ? " on" : "") + '" data-act="pen" data-w="' + w + '"><i style="width:' + Math.min(w, 24) + "px;height:" + Math.min(w, 24) + "px;background:" + (pen.c === "#ffffff" ? "#ccc" : pen.c) + '"></i></button>'; }).join("") +
        '<button class="ghost" data-act="dundo">↶ Undo</button><button class="ghost" data-act="dclear">🗑 Clear</button></div>' : "";
      var chat = st.chat.map(function (c) {
        if (c.sys) return '<p class="sys">' + names(g, c.sys) + "</p>";
        if (c.ok) return '<p class="ok">✅ <b>' + nm(g, c.seat) + "</b> guessed it! +" + c.pts + "</p>";
        return "<p><b>" + nm(g, c.seat) + ":</b> " + esc(c.text) + (c.close ? ' <em class="close">so close!</em>' : "") + "</p>";
      }).join("");
      var canGuess = me >= 0 && !drawer;
      return scoreBar(g, st.score) + '<div class="dg"><div class="dgmain"><div class="dghead"><span>Round ' + Math.min(st.round, st.rounds) + "/" + st.rounds + " · ✏️ " + nm(g, st.drawer) + "</span><span>" + top + "</span>" + (g.phase === "playing" && ph !== "reveal" ? clock(st) : "<span></span>") + "</div>" + choices +
        '<div id="dgc-slot" class="dgslot' + (drawer && ph === "draw" ? " mine" : "") + '"></div>' + tools + '</div><div class="panel dgchat"><div class="msgs" id="dg-msgs">' + chat + "</div>" +
        (canGuess ? '<form class="wform" data-form="dg"><input id="dg-in" autocomplete="off" maxlength="60" placeholder="' + (st.guessed.indexOf(me) >= 0 ? "You got it! Chat…" : "Type your guess…") + '"><button class="btn primary">↵</button></form>' : "") + "</div></div>";
    },
  };

  function head(g) {
    return '<div class="ghead"><button class="ghost" data-act="leave">← ' + (g.seat >= 0 ? (g.phase === "lobby" ? "Leave" : "Back") : "Games") + "</button><h2>" + art(g.type, true) + esc(g.name) + '</h2><div class="gr"></div></div>';
  }
  function overModal(g) {
    var ws = g.winners || [], youWon = ws.indexOf(S.you) >= 0, st = g.state, title;
    if (g.type === "mafia") title = ws.length && st && st.roles && st.roles[g.seats.indexOf(ws[0])] === "mafia" ? "🔪 The mafia win!" : "🎉 The town wins!";
    else if (g.type === "spy") title = ws.length === 1 ? "🕶️ The spy wins!" : "🕵️ The agents win!";
    else title = ws.length === 1 ? esc((g.seats.filter(function (s) { return s.id === ws[0]; })[0] || {}).name) + " wins!" : ws.length ? "It's a tie!" : "Game over";
    var who = ws.length ? '<p class="muted">' + ws.map(function (id) { var s = g.seats.filter(function (x) { return x.id === id; })[0]; return s ? esc(s.name) : ""; }).join(", ") + "</p>" : "";
    return '<div class="modal"><div class="box"><div class="big">' + (youWon ? "🏆" : "🎲") + "</div><h2>" + title + "</h2>" + who + (g.seat >= 0 ? '<p class="xp">+' + (youWon ? 100 : 20) + " XP</p>" : "") +
      '<div class="actions">' + (g.seat >= 0 ? '<button class="btn primary" data-act="rematch">Play again</button>' : "") + '<button class="btn dark" data-act="back">Back to games</button><button class="btn dark" data-act="peek">See board</button></div></div></div>';
  }
  var peek = 0;
  var baseScreen = gameScreen;
  gameScreen = function (g) {
    if (!PARTY[g.type] || g.phase === "lobby") return baseScreen(g);
    if (g.state && g.state.now) skew = g.state.now - Date.now();
    return head(g) + '<div class="gbody g-' + g.type + '">' + R[g.type](g) + "</div>" + (g.phase === "over" && peek !== g.id ? overModal(g) : "");
  };
  var baseLobby = lobby;
  lobby = function (g) {
    var h = baseLobby(g);
    if (!PARTY[g.type]) return h;
    var tips = { mafia: "Secret roles: mafia, doctor, detective and villagers. Talk it out in voice by day, act in secret by night.", spy: "Everyone but one sees the same location. Ask questions, find the spy — or, as the spy, guess the place.", trivia: "10 questions, 15 seconds each. Faster correct answers score more.", wordhunt: "80 seconds. Trace words through neighbouring letters. Longer words score way more.", draw: "Take turns drawing a secret word while everyone races to guess it." };
    return h.replace(/<div class="botrow">[\s\S]*?<\/div>/, '<div class="botrow">💡 ' + tips[g.type] + "</div>");
  };

  // keep typed text and focus across re-renders; redraw the canvas after every render
  var baseRender = render;
  render = function () {
    var a = document.activeElement, keep = a && a.id && a.tagName === "INPUT" ? { id: a.id, v: a.value, s: a.selectionStart } : null;
    var msgs = document.getElementById("dg-msgs"), stick = !msgs || msgs.scrollTop + msgs.clientHeight >= msgs.scrollHeight - 30;
    baseRender();
    if (keep) { var el = document.getElementById(keep.id); if (el) { el.value = keep.v; el.focus(); try { el.setSelectionRange(keep.s, keep.s); } catch (e) {} } }
    var m2 = document.getElementById("dg-msgs"); if (m2 && stick) m2.scrollTop = m2.scrollHeight;
    attachCanvas();
  };
  // ---- Draw & Guess canvas: one persistent white canvas; strokes are painted incrementally ----
  var PALETTE = ["#111111", "#7a7a7a", "#ff3b4f", "#ff9f43", "#ffd84d", "#21c45e", "#2f7dff", "#7c4dff", "#ff6bcb", "#8b5a2b"];
  var CV = null, CTX = null, cvGid = 0, drawnN = 0, drawnV = -1, sid = 0, last = null, sent = 0;
  function strokeOn(ctx, st) {
    var p = st.p; if (!p || p.length < 2) return;
    ctx.strokeStyle = st.c; ctx.lineWidth = st.w; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.beginPath();
    ctx.moveTo(p[0], p[1] * 0.7);
    if (p.length === 2) ctx.lineTo(p[0] + 0.1, p[1] * 0.7);
    else {
      for (var i = 2; i < p.length - 2; i += 2) ctx.quadraticCurveTo(p[i], p[i + 1] * 0.7, (p[i] + p[i + 2]) / 2, ((p[i + 1] + p[i + 3]) / 2) * 0.7);
      ctx.lineTo(p[p.length - 2], p[p.length - 1] * 0.7);
    }
    ctx.stroke();
  }
  var shown = []; // strokes currently painted on the canvas
  function repaint(st) { CTX.fillStyle = "#ffffff"; CTX.fillRect(0, 0, 1000, 700); st.strokes.forEach(function (x) { strokeOn(CTX, x); }); shown = st.strokes.slice(); drawnN = shown.length; drawnV = st.v || 0; }
  function attachCanvas() {
    var slot = document.getElementById("dgc-slot"), g = S.game;
    if (!slot || !g || g.type !== "draw" || !g.state) return;
    if (!CV || cvGid !== g.id) { CV = document.createElement("canvas"); CV.id = "dgc"; CV.width = 1000; CV.height = 700; CTX = CV.getContext("2d"); cvGid = g.id; drawnN = 0; drawnV = -1; shown = []; }
    CV.className = slot.classList.contains("mine") ? "mine" : "";
    slot.appendChild(CV);
    var st = g.state;
    if (drawing) return; // the drawer's own canvas is already up to date while drawing
    var amDrawer = g.seat >= 0 && st.drawer === g.seat;
    if ((st.v || 0) !== drawnV) repaint(st);
    else if (st.strokes.length < shown.length) { if (amDrawer) st.strokes = shown.slice(); else repaint(st); } // my last chunks are still on their way to the server
    else { for (var i = shown.length; i < st.strokes.length; i++) strokeOn(CTX, st.strokes[i]); shown = st.strokes.slice(); drawnN = shown.length; }
  }
  // strokes from the drawer arrive as small "ink" messages and are painted straight away, without a re-render
  function hookInk(sock) {
    if (!sock || sock.__ink) return; sock.__ink = 1;
    var base = sock.onmessage;
    sock.onmessage = function (ev) {
      var m; try { m = JSON.parse(ev.data); } catch (e) { return; }
      if (m.t === "ink") {
        var g = S.game; if (!g || g.id !== m.gid || !g.state || !g.state.strokes) return;
        g.state.strokes.push(m.s);
        if (CV && cvGid === g.id && shown.length === g.state.strokes.length - 1) { strokeOn(CTX, m.s); shown.push(m.s); drawnN = shown.length; }
        return;
      }
      if (base) base.call(sock, ev);
    };
  }
  var baseConnect = connect;
  connect = function () { baseConnect(); hookInk(ws); };
  if (typeof ws !== "undefined" && ws) hookInk(ws);
  function pos(e) { var r = CV.getBoundingClientRect(); return [Math.max(0, Math.min(1000, Math.round(((e.clientX - r.left) / r.width) * 1000))), Math.max(0, Math.min(1000, Math.round(((e.clientY - r.top) / r.height) * 1000)))]; }
  function flush(end) {
    var g = S.game;
    if (pending && pending.p.length >= 4) {
      var chunk = { c: pending.c, w: pending.w, p: pending.p, sid: pending.sid };
      send({ t: "move", action: "stroke", s: chunk });
      shown.push(chunk); drawnN = shown.length; if (g && g.state && g.state.strokes) g.state.strokes = shown.slice(); // already on screen
      var lx = pending.p[pending.p.length - 2], ly = pending.p[pending.p.length - 1];
      pending = end ? null : { c: pending.c, w: pending.w, p: [lx, ly], sid: pending.sid };
    } else if (end && pending && pending.p.length === 2) {
      pending.p.push(pending.p[0], pending.p[1]); flush(true); return; // a single dot
    } else if (end) pending = null;
  }
  setInterval(function () { if (drawing) flush(false); }, 50);
  app.addEventListener("pointerdown", function (e) {
    if (e.target.id !== "dgc" || !e.target.classList.contains("mine")) return;
    drawing = true; sid++; var p = pos(e); last = p; pending = { c: pen.c, w: pen.w, p: [p[0], p[1]], sid: Date.now() % 1e9 + sid };
    CTX.fillStyle = pen.c; CTX.beginPath(); CTX.arc(p[0], p[1] * 0.7, pen.w / 2, 0, Math.PI * 2); CTX.fill();
    try { e.target.setPointerCapture(e.pointerId); } catch (er) {}
    e.preventDefault();
  });
  document.addEventListener("pointermove", function (e) {
    if (!drawing || !CV) return;
    var evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e]; if (!evs.length) evs = [e];
    CTX.strokeStyle = pending.c; CTX.lineWidth = pending.w; CTX.lineCap = "round"; CTX.lineJoin = "round"; CTX.beginPath(); CTX.moveTo(last[0], last[1] * 0.7);
    evs.forEach(function (ev) { var p = pos(ev); if (Math.abs(p[0] - last[0]) + Math.abs(p[1] - last[1]) < 2) return; CTX.lineTo(p[0], p[1] * 0.7); pending.p.push(p[0], p[1]); last = p; });
    CTX.stroke();
    if (pending.p.length > 360) flush(false);
  });
  document.addEventListener("pointerup", function () { if (drawing) { drawing = false; flush(true); attachCanvas(); } });
  document.addEventListener("pointercancel", function () { if (drawing) { drawing = false; flush(true); } });

  app.addEventListener("submit", function (e) {
    var f = e.target.getAttribute("data-form"); if (!f) return;
    e.preventDefault();
    var inp = e.target.querySelector("input"), v = inp.value.trim(); if (!v) return;
    if (f === "wh") send({ t: "move", action: "word", w: v });
    if (f === "dg") send({ t: "move", action: "guess", text: v });
    inp.value = "";
  });
  var armed = "";
  app.addEventListener("click", function (e) {
    var el = e.target.closest("[data-act]"); if (!el || el.disabled) return;
    var a = el.getAttribute("data-act"), t = Number(el.getAttribute("data-t"));
    if (a === "tq") send({ t: "move", a: Number(el.getAttribute("data-a")) });
    else if (a === "wtile") { var inp = document.getElementById("wh-in"); if (inp) { inp.value += el.getAttribute("data-l"); inp.focus(); } }
    else if (a === "spyvote") send({ t: "move", action: "vote", target: t });
    else if (a === "callvote") send({ t: "move", action: "callvote" });
    else if (a === "spyguess") { var l = el.getAttribute("data-loc"); if (armed === l) { send({ t: "move", action: "guess", loc: l }); armed = ""; } else { armed = l; toast("Tap " + l + " again to lock in your guess"); } }
    else if (a === "mkill") send({ t: "move", action: "kill", target: t });
    else if (a === "msave") send({ t: "move", action: "save", target: t });
    else if (a === "mcheck") send({ t: "move", action: "check", target: t });
    else if (a === "mvote") send({ t: "move", action: "vote", target: t });
    else if (a === "dpick") send({ t: "move", action: "pick", i: Number(el.getAttribute("data-i")) });
    else if (a === "dclear") send({ t: "move", action: "clear" });
    else if (a === "dundo") send({ t: "move", action: "undo" });
    else if (a === "pen") { if (el.getAttribute("data-c")) pen.c = el.getAttribute("data-c"); if (el.getAttribute("data-w")) pen.w = +el.getAttribute("data-w"); render(); }
    else if (a === "peek") { peek = S.game ? S.game.id : 0; render(); }
  });
})();
`;
const CSS: string = String.raw`/* party games */
.art-mafia{background:radial-gradient(circle at 50% 50%,#ff4d4d55,transparent 60%),linear-gradient(135deg,#3a1240,#160b2c)}
.art-spy{background:radial-gradient(circle at 50% 50%,#4dd4ff44,transparent 60%),linear-gradient(135deg,#1d2b55,#120d33)}
.art-trivia{background:radial-gradient(circle at 50% 50%,#ffd84d55,transparent 60%),linear-gradient(135deg,#6b2fb3,#2a1670)}
.art-draw{background:radial-gradient(circle at 30% 40%,#ff4d8d55,transparent 40%),radial-gradient(circle at 70% 60%,#4dd4ff55,transparent 40%),linear-gradient(135deg,#3b1d9a,#1a1145)}
.art-wordhunt{background:linear-gradient(#ffffff12 2px,transparent 2px) 0 0/30px 30px,linear-gradient(90deg,#ffffff12 2px,transparent 2px) 0 0/30px 30px,radial-gradient(circle at 50% 50%,#ffd84d55,transparent 60%),linear-gradient(135deg,#7a4a12,#3a1d55)}
.clock{display:inline-block;background:#ffffff14;border:1px solid var(--line);padding:3px 10px;border-radius:99px;font-weight:900;color:var(--gold);margin-left:6px}
.rcard{background:linear-gradient(160deg,#2a1f6e,#1b1642);border:1px solid #a78bfa55;border-radius:22px;padding:16px 22px;text-align:center;box-shadow:0 0 30px #7c4dff33;max-width:520px;width:100%;margin:6px 0}
.rcard .big{font-size:46px}.rcard h3{font-size:24px;font-weight:900;margin:4px 0}.rcard p{color:#cfc8ff;font-size:14px;margin-top:4px}
.rcard.spy,.rcard.mafia{background:linear-gradient(160deg,#5a1230,#1b1642);border-color:#ff4d8d66}.rcard.dead{filter:grayscale(.8);opacity:.8}
.ptiles{display:flex;flex-wrap:wrap;gap:10px;justify-content:center;max-width:760px}
.pt{width:112px;padding:12px 6px;border-radius:18px;background:var(--panel);border:2px solid var(--line);display:flex;flex-direction:column;align-items:center;gap:5px;transition:.15s}
.pt b{font-size:13px;max-width:100px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.pt small{font-size:11px;color:var(--gold);font-weight:800}
.pt:not([disabled]){cursor:pointer}.pt:not([disabled]):hover{border-color:var(--gold);transform:translateY(-2px)}
.pt.sel{border-color:var(--gold);box-shadow:0 0 18px #ffc83d66}.pt.dead{opacity:.4}.pt.spy{border-color:#ff4d8d;box-shadow:0 0 18px #ff4d8d66}
.mlog{max-width:640px;width:100%;margin-top:14px;max-height:200px;overflow:auto}.mlog p{padding:5px 0;border-bottom:1px solid #ffffff0d;font-size:14px}
.locs{display:flex;flex-wrap:wrap;gap:6px;justify-content:center;max-width:760px}
.loc{padding:7px 12px;border-radius:12px;background:#ffffff0d;border:1px solid var(--line);font-size:13px;font-weight:700;color:#cfc8ff}.loc.can{cursor:pointer}.loc.can:hover{border-color:var(--gold);color:#fff}.loc.right{background:#3ddc8433;border-color:var(--green);color:#fff}
.qcard{background:linear-gradient(160deg,#2a1f6e,#1b1642);border:1px solid #a78bfa55;border-radius:24px;padding:20px;max-width:720px;width:100%;margin-top:14px;box-shadow:0 0 40px #7c4dff33}
.qtop{display:flex;justify-content:space-between;align-items:center;color:var(--mut);font-size:13px;font-weight:700}.qcard h3{font-size:22px;font-weight:900;margin:14px 0;text-align:center}
.answers{display:grid;grid-template-columns:1fr 1fr;gap:10px}@media(max-width:560px){.answers{grid-template-columns:1fr}}
.ta{display:flex;align-items:center;gap:10px;padding:14px;border-radius:16px;text-align:left;font-weight:800;font-size:15px;border:2px solid transparent;position:relative;min-height:60px}
.ta i{font-style:normal;width:30px;height:30px;border-radius:9px;background:#0004;display:flex;align-items:center;justify-content:center;flex:none}
.ta.a0{background:#ff4d8d33}.ta.a1{background:#4dd4ff33}.ta.a2{background:#ffd84d33}.ta.a3{background:#6dff9a33}
.ta[data-act]{cursor:pointer}.ta[data-act]:hover{filter:brightness(1.3)}.ta.mine{border-color:#fff}
.ta.right{background:#3ddc84aa;border-color:#3ddc84;box-shadow:0 0 20px #3ddc8488}.ta.wrong{background:#ff3b5c88}.ta.dim{opacity:.4}
.ta .who{position:absolute;right:8px;display:flex;gap:2px}
.gain{color:var(--green);font-weight:900;font-size:22px;text-align:center;margin-top:10px}.miss{color:var(--mut);text-align:center;margin-top:10px}
.wh{display:flex;gap:18px;flex-wrap:wrap;justify-content:center;margin-top:14px;align-items:flex-start}
.whead{text-align:center;margin-bottom:10px}
.wgrid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;width:min(86vw,340px);padding:10px;border-radius:20px;background:linear-gradient(160deg,#7a4a12,#3a1d55);box-shadow:0 0 30px #ffd84d33}
.wt{aspect-ratio:1;border-radius:14px;background:linear-gradient(145deg,#fff6e0,#e8d3a8);color:#3a2050;font-size:30px;font-weight:900;box-shadow:0 5px 0 #b09060}
.wt[data-act]{cursor:pointer}.wt[data-act]:active{transform:translateY(3px);box-shadow:0 2px 0 #b09060}
.wform{display:flex;gap:8px;margin-top:12px}.wform input{flex:1;padding:12px 14px;border-radius:14px;border:1px solid var(--line);background:var(--panel);color:#fff;font:inherit;font-size:16px;min-width:0}
.wlist{width:240px;max-height:420px;overflow:auto}.wlist ul{list-style:none}.wlist li{display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid #ffffff0d}.wlist em{font-style:normal;color:var(--gold);font-weight:800}
.allw{display:flex;flex-wrap:wrap;gap:10px;justify-content:center;margin-top:14px;max-width:900px}.allw div{background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:10px 14px;max-width:280px}.allw p{color:#cfc8ff;font-size:13px}
.dg{display:flex;gap:14px;flex-wrap:wrap;justify-content:center;margin-top:12px;width:100%}
.dgmain{flex:1;min-width:300px;max-width:760px;display:flex;flex-direction:column;gap:8px}
.dghead{display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:8px 12px;font-weight:700;font-size:14px}
.word{font-size:20px;letter-spacing:2px;color:var(--gold)}.word.mask{color:#fff;letter-spacing:3px}
#dgc{display:block;width:100%;aspect-ratio:10/7;border-radius:18px;border:3px solid #ffffff22;background:#fff;touch-action:none;box-shadow:0 10px 30px #0008,0 0 30px #7c4dff33}#dgc.mine{cursor:crosshair;border-color:var(--gold)}.dgslot{width:100%}
.sw.er{background:#fff;font-size:15px;display:flex;align-items:center;justify-content:center}
.tools{display:flex;gap:6px;flex-wrap:wrap;align-items:center;justify-content:center}
.sw{width:30px;height:30px;border-radius:50%;border:3px solid #ffffff33}.sw.on{border-color:#fff;box-shadow:0 0 10px #fff}
.sz{width:36px;height:36px;border-radius:10px;background:#ffffff10;display:flex;align-items:center;justify-content:center}.sz i{background:#fff;border-radius:50%;display:block}.sz.on{background:#ffffff30}
.dgchat{width:280px;display:flex;flex-direction:column;max-height:560px}.msgs{flex:1;overflow:auto;font-size:14px;min-height:200px}
.msgs p{padding:4px 0}.msgs .sys{color:var(--mut);font-style:italic}.msgs .ok{color:var(--green);font-weight:800}.msgs .close{color:var(--gold);font-style:normal;font-size:12px}
@media(max-width:760px){.dgchat,.wlist{width:100%}}
`;
const GAMES_TS: string = String.raw`// Game Night plugin: party games (Mafia, Who's the Spy, Trivia, Word Hunt, Draw & Guess). Loaded by the game server at startup.
// No template literals in this file: it is embedded in a String.raw block by the service that serves it.
export default function register(api: any) {
  const shuffle: (a: any[]) => any[] = api.shuffle;
  const rnd = (a: any[]) => a[Math.floor(Math.random() * a.length)];
  const now = () => Date.now();
  const top = (score: number[]) => { const b = Math.max(...score); const w = score.map((x, i) => (x === b ? i : -1)).filter((i) => i >= 0); return w; };
  const done = (winners: number[]) => ({ done: true, winner: winners.length === 1 ? winners[0] : null, winners });

  // ---------------- Trivia ----------------
  const FALLBACK_Q = [
    ["What is the largest planet in our solar system?", "Jupiter", "Saturn", "Neptune", "Earth"], ["Which element has the chemical symbol O?", "Oxygen", "Gold", "Osmium", "Iron"],
    ["How many continents are there?", "7", "5", "6", "8"], ["Who painted the Mona Lisa?", "Leonardo da Vinci", "Michelangelo", "Raphael", "Van Gogh"],
    ["What is the capital of Japan?", "Tokyo", "Kyoto", "Osaka", "Seoul"], ["Which animal is known as the King of the Jungle?", "Lion", "Tiger", "Elephant", "Gorilla"],
    ["How many legs does a spider have?", "8", "6", "10", "12"], ["What is the boiling point of water at sea level in °C?", "100", "90", "80", "120"],
    ["Which ocean is the largest?", "Pacific", "Atlantic", "Indian", "Arctic"], ["What gas do plants absorb from the air?", "Carbon dioxide", "Oxygen", "Nitrogen", "Helium"],
    ["Which country hosts the city of Rio de Janeiro?", "Brazil", "Argentina", "Portugal", "Mexico"], ["How many sides does a hexagon have?", "6", "5", "7", "8"],
    ["Which planet is known as the Red Planet?", "Mars", "Venus", "Mercury", "Jupiter"], ["What is the hardest natural substance?", "Diamond", "Granite", "Iron", "Quartz"],
    ["In which game would you checkmate?", "Chess", "Checkers", "Go", "Poker"], ["What is the longest river in Africa?", "Nile", "Congo", "Niger", "Zambezi"],
    ["Which language has the most native speakers?", "Mandarin Chinese", "English", "Spanish", "Hindi"], ["What is 12 × 12?", "144", "124", "132", "154"],
    ["Which instrument has 88 keys?", "Piano", "Organ", "Accordion", "Harp"], ["What is the smallest prime number?", "2", "1", "3", "0"],
  ].map((r) => ({ q: r[0], right: r[1], wrong: r.slice(2), cat: "General" }));
  let pool: any[] = [];
  async function refill() {
    try {
      const r = await fetch("https://opentdb.com/api.php?amount=50&type=multiple&encode=url3986");
      const d: any = await r.json();
      for (const x of d.results || []) pool.push({ q: decodeURIComponent(x.question), right: decodeURIComponent(x.correct_answer), wrong: x.incorrect_answers.map(decodeURIComponent), cat: decodeURIComponent(x.category) });
    } catch (e) { console.error("trivia fetch failed", e); }
  }
  refill();
  const QN = 10, QT = 15000;
  function tqReveal(s: any) {
    const q = s.qs[s.i];
    for (const k of Object.keys(s.ans)) { const a = s.ans[k]; if (a.a === q.c) { const pts = 500 + Math.round(500 * Math.max(0, a.left) / QT); s.score[+k] += pts; a.pts = pts; } else a.pts = 0; }
    s.phase = "reveal"; s.deadline = now() + 4500;
  }
  const trivia = {
    name: "Trivia", min: 1, max: 10, noBots: true,
    init(n: number) {
      const src = pool.length >= QN ? pool.splice(0, QN) : shuffle(FALLBACK_Q.slice()).slice(0, QN);
      if (pool.length < 20) refill();
      const qs = src.map((x) => { const a = shuffle([x.right].concat(x.wrong)); return { q: x.q, a, c: a.indexOf(x.right), cat: x.cat }; });
      return { qs, i: 0, phase: "q", deadline: now() + QT, ans: {}, score: Array(n).fill(0) };
    },
    turn: () => null,
    view(s: any, seat: number) {
      const q = s.qs[s.i], rev = s.phase === "reveal";
      return { i: s.i, n: s.qs.length, q: q.q, cat: q.cat, a: q.a, c: rev ? q.c : -1, phase: s.phase, deadline: s.deadline, now: now(), score: s.score,
        answered: Object.keys(s.ans).map(Number), mine: s.ans[seat] ? s.ans[seat].a : -1, picks: rev ? s.ans : null };
    },
    move(s: any, seat: number, m: any) {
      if (s.phase !== "q") return { err: "Wait for the next question" };
      if (s.ans[seat]) return { err: "You already answered" };
      const a = Number(m.a); if (!(a >= 0 && a < 4)) return { err: "Bad answer" };
      s.ans[seat] = { a, left: s.deadline - now() };
      if (Object.keys(s.ans).length >= s.score.length) tqReveal(s);
      return {};
    },
    tick(s: any) {
      if (s.phase === "q") { tqReveal(s); return {}; }
      s.i++; if (s.i >= s.qs.length) return done(top(s.score));
      s.phase = "q"; s.ans = {}; s.deadline = now() + QT; return {};
    },
  };

  // ---------------- Word Hunt ----------------
  const DICE = ["AAEEGN", "ABBJOO", "ACHOPS", "AFFKPS", "AOOTTW", "CIMOTU", "DEILRX", "DELRVY", "DISTTY", "EEGHNW", "EEINSU", "EHRTVW", "EIOSST", "ELRTTY", "HIMNUQ", "HLNNRZ"];
  let DICT: Set<string> | null = null;
  (async () => {
    try {
      const t = await (await fetch("https://raw.githubusercontent.com/dwyl/english-words/master/words_alpha.txt")).text();
      DICT = new Set(t.split(/\r?\n/).map((w) => w.trim().toUpperCase()).filter((w) => w.length >= 3 && w.length <= 16));
      console.log("word list loaded", DICT.size);
    } catch (e) { console.error("word list failed", e); }
  })();
  function trace(grid: string[], w: string) {
    const used = Array(16).fill(false);
    const go = (i: number, k: number): boolean => {
      const t = grid[i];
      if (w.substr(k, t.length) !== t) return false;
      if (k + t.length === w.length) return true;
      used[i] = true;
      const r = i >> 2, c = i & 3;
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
        const rr = r + dr, cc = c + dc, j = rr * 4 + cc;
        if ((dr || dc) && rr >= 0 && rr < 4 && cc >= 0 && cc < 4 && !used[j] && go(j, k + t.length)) { used[i] = false; return true; }
      }
      used[i] = false; return false;
    };
    for (let i = 0; i < 16; i++) if (go(i, 0)) return true;
    return false;
  }
  const whPts = (n: number) => (n <= 3 ? 100 : n === 4 ? 400 : n === 5 ? 800 : n === 6 ? 1400 : n === 7 ? 1800 : 2200 + (n - 8) * 400);
  const wordhunt = {
    name: "Word Hunt", min: 1, max: 8, noBots: true,
    init(n: number) {
      const grid = shuffle(DICE.slice()).map((d) => { const ch = rnd(d.split("")); return ch === "Q" ? "QU" : ch; });
      return { grid, phase: "play", deadline: now() + 80000, found: Array.from({ length: n }, () => []), score: Array(n).fill(0) };
    },
    turn: () => null,
    view(s: any, seat: number) {
      const over = s.phase !== "play";
      return { grid: s.grid, phase: s.phase, deadline: s.deadline, now: now(), score: s.score, counts: s.found.map((f: any[]) => f.length),
        mine: seat >= 0 ? s.found[seat] : [], all: over ? s.found : null, dict: !!DICT };
    },
    move(s: any, seat: number, m: any) {
      if (s.phase !== "play") return { err: "Time's up" };
      const w = String(m.w || "").toUpperCase().replace(/[^A-Z]/g, "");
      if (w.length < 3) return { err: "Words need 3+ letters" };
      if (s.found[seat].some((f: any) => f.w === w)) return { err: "Already found " + w };
      if (!trace(s.grid, w)) return { err: w + " isn't on the board" };
      if (DICT && !DICT.has(w)) return { err: w + " isn't in the dictionary" };
      const p = whPts(w.length);
      s.found[seat].unshift({ w, p }); s.score[seat] += p;
      return {};
    },
    tick(s: any) { s.phase = "over"; return done(top(s.score)); },
  };

  // ---------------- Who's the Spy ----------------
  const LOCS = ["Airplane", "Bank", "Beach", "Casino", "Cathedral", "Circus", "Cruise ship", "Day spa", "Embassy", "Hospital", "Hotel", "Military base", "Movie studio", "Pirate ship", "Polar station", "Police station", "Restaurant", "School", "Space station", "Submarine", "Supermarket", "Theater", "University", "Zoo", "Train", "Museum", "Amusement park", "Library"];
  const spy = {
    name: "Who's the Spy?", min: 3, max: 10, noBots: true,
    init(n: number) {
      return { spy: Math.floor(Math.random() * n), loc: rnd(LOCS), phase: "talk", deadline: now() + 300000, first: Math.floor(Math.random() * n), votes: {}, n, result: "" };
    },
    turn: () => null,
    view(s: any, seat: number) {
      const over = s.phase === "over";
      return { phase: s.phase, deadline: s.deadline, now: now(), first: s.first, locs: LOCS, votes: s.phase === "vote" ? Object.keys(s.votes).map(Number) : s.votes,
        role: seat < 0 ? "watch" : seat === s.spy ? "spy" : "agent", loc: (seat >= 0 && seat !== s.spy) || over ? s.loc : null, spy: over ? s.spy : -1, result: s.result, myVote: s.votes[seat] };
    },
    move(s: any, seat: number, m: any) {
      const town = () => [...Array(s.n).keys()].filter((i) => i !== s.spy);
      if (m.action === "guess") {
        if (seat !== s.spy) return { err: "Only the spy can guess" };
        if (!(s.phase === "talk" || s.phase === "spyguess")) return { err: "Not now" };
        s.phase = "over";
        if (m.loc === s.loc) { s.result = "The spy guessed the location!"; return done([s.spy]); }
        s.result = "The spy guessed " + String(m.loc) + " — wrong!"; return done(town());
      }
      if (m.action === "callvote") { if (s.phase !== "talk") return { err: "Not now" }; s.phase = "vote"; s.votes = {}; s.deadline = now() + 60000; return {}; }
      if (m.action === "vote") {
        if (s.phase !== "vote") return { err: "Voting hasn't started" };
        const t = Number(m.target); if (!(t >= 0 && t < s.n) || t === seat) return { err: "Pick someone else" };
        s.votes[seat] = t;
        if (Object.keys(s.votes).length >= s.n) return spyResolve(s, town);
        return {};
      }
      return { err: "Bad move" };
    },
    tick(s: any) {
      const town = () => [...Array(s.n).keys()].filter((i) => i !== s.spy);
      if (s.phase === "talk") { s.phase = "vote"; s.votes = {}; s.deadline = now() + 60000; return {}; }
      if (s.phase === "vote") return spyResolve(s, town);
      if (s.phase === "spyguess") { s.phase = "over"; s.result = "The spy ran out of time to guess."; return done(town()); }
      return {};
    },
  };
  function spyResolve(s: any, town: () => number[]) {
    const tally: Record<string, number> = {};
    for (const v of Object.values(s.votes) as number[]) tally[v] = (tally[v] || 0) + 1;
    const best = Math.max(0, ...Object.values(tally)), tops = Object.keys(tally).filter((k) => tally[k] === best).map(Number);
    if (tops.length === 1 && tops[0] === s.spy) { s.phase = "spyguess"; s.deadline = now() + 30000; s.result = "Caught! The spy gets one guess at the location."; return {}; }
    s.phase = "over"; s.result = tops.length === 1 ? "Wrong person accused — the spy escapes!" : "The vote was tied — the spy escapes!";
    return done([s.spy]);
  }

  // ---------------- Mafia ----------------
  const NIGHT = 40000, DAY = 150000;
  const mafia = {
    name: "Mafia", min: 4, max: 12, noBots: true,
    init(n: number) {
      const m = Math.max(1, Math.floor(n / 4));
      const roles = shuffle(Array(m).fill("mafia").concat(["doctor"], n >= 5 ? ["detective"] : [], Array(Math.max(0, n - m - (n >= 5 ? 2 : 1))).fill("villager")));
      return { roles, alive: Array(n).fill(true), phase: "night", day: 1, deadline: now() + NIGHT, kill: {}, save: -1, check: -1, checks: [], votes: {}, log: ["Night 1 falls. Mafia, choose your target…"] };
    },
    turn: () => null,
    view(s: any, seat: number) {
      const me = s.roles[seat], over = s.phase === "over";
      return { phase: s.phase, day: s.day, deadline: s.deadline, now: now(), alive: s.alive, log: s.log.slice(-12), role: me || "watch", me: seat,
        team: me === "mafia" || over ? s.roles.map((r: string, i: number) => (r === "mafia" ? i : -1)).filter((i: number) => i >= 0) : [],
        roles: over ? s.roles : s.roles.map((r: string, i: number) => (!s.alive[i] ? r : null)),
        checks: me === "detective" ? s.checks : [], myKill: me === "mafia" ? s.kill[seat] : undefined, mySave: me === "doctor" ? s.save : undefined, myCheck: me === "detective" ? s.check : undefined,
        votes: s.phase === "day" ? s.votes : {}, killVotes: me === "mafia" ? s.kill : {} };
    },
    move(s: any, seat: number, m: any) {
      if (!s.alive[seat]) return { err: "You're out — watch the rest of the game" };
      const t = Number(m.target), role = s.roles[seat], okT = t >= 0 && t < s.roles.length && s.alive[t];
      if (s.phase === "night") {
        if (m.action === "kill" && role === "mafia") { if (!okT || s.roles[t] === "mafia") return { err: "Pick a town player" }; s.kill[seat] = t; }
        else if (m.action === "save" && role === "doctor") { if (!okT) return { err: "Pick a living player" }; s.save = t; }
        else if (m.action === "check" && role === "detective") { if (!okT || t === seat) return { err: "Pick someone else" }; s.check = t; }
        else return { err: "Nothing to do now" };
        if (nightReady(s)) return endNight(s);
        return {};
      }
      if (s.phase === "day" && m.action === "vote") {
        if (!(t === -1 || okT)) return { err: "Pick a living player" };
        s.votes[seat] = t;
        if (s.alive.every((a: boolean, i: number) => !a || s.votes[i] !== undefined)) return endDay(s);
        return {};
      }
      return { err: "Nothing to do now" };
    },
    tick(s: any) { return s.phase === "night" ? endNight(s) : s.phase === "day" ? endDay(s) : {}; },
  };
  const aliveWith = (s: any, r: string) => s.roles.map((x: string, i: number) => (x === r && s.alive[i] ? i : -1)).filter((i: number) => i >= 0);
  function nightReady(s: any) {
    const mafiaDone = aliveWith(s, "mafia").every((i: number) => s.kill[i] !== undefined);
    const docDone = !aliveWith(s, "doctor").length || s.save >= 0;
    const detDone = !aliveWith(s, "detective").length || s.check >= 0;
    return mafiaDone && docDone && detDone;
  }
  function mafiaWin(s: any) {
    const m = aliveWith(s, "mafia").length, t = s.alive.filter((a: boolean) => a).length - m;
    if (!m) { s.phase = "over"; s.log.push("All mafia are gone — the town wins! 🎉"); return done(s.roles.map((r: string, i: number) => (r !== "mafia" ? i : -1)).filter((i: number) => i >= 0)); }
    if (m >= t) { s.phase = "over"; s.log.push("The mafia outnumber the town — mafia wins! 🔪"); return done(s.roles.map((r: string, i: number) => (r === "mafia" ? i : -1)).filter((i: number) => i >= 0)); }
    return null;
  }
  function endNight(s: any) {
    const tally: Record<string, number> = {};
    for (const v of Object.values(s.kill) as number[]) tally[v] = (tally[v] || 0) + 1;
    const keys = Object.keys(tally), target = keys.length ? Number(keys.sort((a, b) => tally[b] - tally[a])[0]) : -1;
    if (s.check >= 0) s.checks.push({ t: s.check, mafia: s.roles[s.check] === "mafia", day: s.day });
    if (target >= 0 && target !== s.save) { s.alive[target] = false; s.log.push("☀️ Day " + s.day + ": {" + target + "} was found dead. They were a " + s.roles[target] + "."); }
    else s.log.push("☀️ Day " + s.day + ": " + (target >= 0 ? "The doctor saved someone — nobody died!" : "A quiet night — nobody died."));
    s.kill = {}; s.save = -1; s.check = -1;
    const w = mafiaWin(s); if (w) return w;
    s.phase = "day"; s.votes = {}; s.deadline = now() + DAY; return {};
  }
  function endDay(s: any) {
    const tally: Record<string, number> = {};
    for (const v of Object.values(s.votes) as number[]) if (v >= 0) tally[v] = (tally[v] || 0) + 1;
    const best = Math.max(0, ...Object.values(tally)), tops = Object.keys(tally).filter((k) => tally[k] === best).map(Number);
    if (best > 0 && tops.length === 1) { const t = tops[0]; s.alive[t] = false; s.log.push("⚖️ The town voted out {" + t + "}. They were a " + s.roles[t] + "."); }
    else s.log.push("⚖️ No majority — nobody was voted out.");
    const w = mafiaWin(s); if (w) return w;
    s.day++; s.phase = "night"; s.deadline = now() + NIGHT; s.log.push("🌙 Night " + s.day + " falls…"); return {};
  }

  // ---------------- Draw & Guess ----------------
  const WORDS = "apple banana guitar rocket castle dragon pizza volcano robot penguin rainbow camera island bridge snowman pirate spider ladder candle diamond tornado unicorn jellyfish backpack lighthouse umbrella butterfly octopus helicopter skateboard cactus hamburger mermaid dinosaur telescope compass anchor kangaroo giraffe pyramid igloo waterfall treasure ghost wizard vampire astronaut parachute crown trophy balloon cupcake popcorn sandwich toothbrush keyboard headphones microphone violin drum trumpet bicycle tractor submarine airplane train scissors hammer magnet clock lantern mountain river desert jungle moon star comet planet sun cloud lightning snowflake fire tree flower mushroom leaf pumpkin carrot cherry lemon grapes watermelon cookie donut icecream cheese egg bee owl fish shark whale turtle snail frog rabbit horse cow pig chicken duck lion tiger zebra elephant monkey bear fox wolf bat crab lobster dolphin".split(" ");
  const DRAW_T = 80000;
  function dgStart(s: any) {
    s.drawer = s.order[s.ri % s.order.length]; s.phase = "pick"; s.choices = shuffle(WORDS.slice()).slice(0, 3); s.word = "";
    s.strokes = []; s.total = 0; s.v = (s.v || 0) + 1; s.guessed = {}; s.deadline = now() + 12000; s.pts = 0;
  }
  function dgDraw(s: any, i: number) { s.word = s.choices[i] || s.choices[0]; s.phase = "draw"; s.deadline = now() + DRAW_T; s.chat.push({ sys: "{" + s.drawer + "} is drawing!" }); }
  function dgReveal(s: any) { s.phase = "reveal"; s.deadline = now() + 5000; s.chat.push({ sys: "The word was " + s.word.toUpperCase() + "." }); }
  const draw = {
    name: "Draw & Guess", min: 2, max: 8, noBots: true,
    init(n: number) {
      const s: any = { order: shuffle([...Array(n).keys()]), ri: 0, rounds: n <= 3 ? n * 2 : n, score: Array(n).fill(0), chat: [] };
      dgStart(s); return s;
    },
    turn: () => null,
    view(s: any, seat: number) {
      const know = seat === s.drawer || s.guessed[seat] !== undefined || s.phase === "reveal";
      let mask = "";
      if (s.phase !== "pick") {
        const frac = 1 - Math.max(0, s.deadline - now()) / DRAW_T, show = frac > 0.75 ? 2 : frac > 0.5 ? 1 : 0;
        const idx: number[] = []; for (let k = 0; k < s.word.length && idx.length < show; k += 3) idx.push(k);
        mask = s.word.split("").map((ch: string, k: number) => (ch === " " ? " " : idx.includes(k) ? ch : "_")).join("");
      }
      return { phase: s.phase, drawer: s.drawer, round: s.ri + 1, rounds: s.rounds, deadline: s.deadline, now: now(), strokes: s.strokes, v: s.v || 0, score: s.score,
        guessed: Object.keys(s.guessed).map(Number), chat: s.chat.slice(-40), word: know ? s.word : "", mask, len: s.word.length,
        choices: seat === s.drawer && s.phase === "pick" ? s.choices : null };
    },
    move(s: any, seat: number, m: any) {
      if (m.action === "pick") { if (seat !== s.drawer || s.phase !== "pick") return { err: "Not now" }; dgDraw(s, Number(m.i)); return {}; }
      if (m.action === "stroke" || m.action === "clear" || m.action === "undo") {
        if (seat !== s.drawer || s.phase !== "draw") return { err: "Only the drawer can draw" };
        // v changes whenever strokes are removed, so clients know to repaint from scratch
        if (m.action === "clear") { s.strokes = []; s.v = (s.v || 0) + 1; return {}; }
        if (m.action === "undo") { const last = s.strokes[s.strokes.length - 1]; if (last) { const sid = last.sid; while (s.strokes.length && s.strokes[s.strokes.length - 1].sid === sid) s.strokes.pop(); } s.v = (s.v || 0) + 1; return {}; }
        const st = m.s || {}, p = Array.isArray(st.p) ? st.p.slice(0, 400).map((x: any) => Math.max(0, Math.min(1000, Math.round(+x || 0)))) : [];
        s.total = s.total || 0;
        if (p.length < 2 || s.total > 60000) return {};
        s.total += p.length;
        s.strokes.push({ c: /^#[0-9a-f]{6}$/i.test(st.c) ? st.c : "#111111", w: [3, 8, 18, 40, 70].includes(+st.w) ? +st.w : 8, p, sid: Math.floor(+st.sid || 0) }); return {};
      }
      if (m.action === "guess") {
        const text = String(m.text || "").trim().slice(0, 60);
        if (!text) return {};
        if (s.phase !== "draw" || seat === s.drawer || s.guessed[seat] !== undefined) { s.chat.push({ seat, text }); return {}; }
        if (text.toLowerCase() === s.word.toLowerCase()) {
          const left = Math.max(0, s.deadline - now()), pts = 100 + Math.round((300 * left) / DRAW_T);
          s.guessed[seat] = pts; s.score[seat] += pts; s.score[s.drawer] += 60; s.chat.push({ seat, ok: true, pts });
          if (Object.keys(s.guessed).length >= s.score.length - 1) dgReveal(s);
        } else s.chat.push({ seat, text, close: Math.abs(text.length - s.word.length) <= 1 && text[0].toLowerCase() === s.word[0] });
        return {};
      }
      return { err: "Bad move" };
    },
    tick(s: any) {
      if (s.phase === "pick") { dgDraw(s, 0); return {}; }
      if (s.phase === "draw") { dgReveal(s); return {}; }
      s.ri++; if (s.ri >= s.rounds) return done(top(s.score));
      dgStart(s); return {};
    },
  };

  return { mafia, spy, trivia, wordhunt, draw };
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

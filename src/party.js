// ---------- Game Night UI plugin: party games ----------
(function () {
  var PARTY = { mafia: 1, spy: 1, trivia: 1, wordhunt: 1, draw: 1 };
  GAMES = GAMES.filter(function (m) { return m.id !== "mafia" && m.id !== "wordhunt"; });
  GAMES.splice(4, 0,
    { id: "mafia", name: "Mafia", cat: "Party", players: "4–12 players", tag: "New", icon: "🕵️" },
    { id: "draw", name: "Draw & Guess", cat: "Party", players: "2–8 players", tag: "New", icon: "🎨" },
    { id: "trivia", name: "Trivia", cat: "Quiz", players: "1–10 players", tag: "New", icon: "🧠" },
    { id: "wordhunt", name: "Word Hunt", cat: "Word", players: "1–8 players", tag: "New", icon: "🔤" },
    { id: "spy", name: "Who's the Spy?", cat: "Party", players: "3–10 players", tag: "New", icon: "🕶️" });
  var skew = 0, pending = null, pen = { c: "#ffffff", w: 8 }, drawing = false;
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
      var tools = drawer && ph === "draw" ? '<div class="tools">' + ["#ffffff", "#ff4d8d", "#ffd84d", "#6dff9a", "#4dd4ff", "#b05cff", "#ff9f43", "#111111"].map(function (c) { return '<button class="sw' + (pen.c === c ? " on" : "") + '" style="background:' + c + '" data-act="pen" data-c="' + c + '"></button>'; }).join("") +
        [3, 8, 18, 40].map(function (w) { return '<button class="sz' + (pen.w === w ? " on" : "") + '" data-act="pen" data-w="' + w + '"><i style="width:' + Math.min(w, 24) + "px;height:" + Math.min(w, 24) + 'px"></i></button>'; }).join("") +
        '<button class="ghost" data-act="dundo">↶ Undo</button><button class="ghost" data-act="dclear">🗑 Clear</button></div>' : "";
      var chat = st.chat.map(function (c) {
        if (c.sys) return '<p class="sys">' + names(g, c.sys) + "</p>";
        if (c.ok) return '<p class="ok">✅ <b>' + nm(g, c.seat) + "</b> guessed it! +" + c.pts + "</p>";
        return "<p><b>" + nm(g, c.seat) + ":</b> " + esc(c.text) + (c.close ? ' <em class="close">so close!</em>' : "") + "</p>";
      }).join("");
      var canGuess = me >= 0 && !drawer;
      return scoreBar(g, st.score) + '<div class="dg"><div class="dgmain"><div class="dghead"><span>Round ' + Math.min(st.round, st.rounds) + "/" + st.rounds + " · ✏️ " + nm(g, st.drawer) + "</span><span>" + top + "</span>" + (g.phase === "playing" && ph !== "reveal" ? clock(st) : "<span></span>") + "</div>" + choices +
        '<canvas id="dgc" width="1000" height="700" class="' + (drawer && ph === "draw" ? "mine" : "") + '"></canvas>' + tools + '</div><div class="panel dgchat"><div class="msgs" id="dg-msgs">' + chat + "</div>" +
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
    paint();
  };
  function paint() {
    var cv = document.getElementById("dgc"), g = S.game;
    if (!cv || !g || !g.state) return;
    var ctx = cv.getContext("2d"); ctx.fillStyle = "#14112f"; ctx.fillRect(0, 0, cv.width, cv.height);
    var all = g.state.strokes.concat(pending && pending.p.length > 3 ? [pending] : []);
    all.forEach(function (s) {
      ctx.strokeStyle = s.c; ctx.lineWidth = s.w; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.beginPath();
      for (var i = 0; i < s.p.length; i += 2) { var x = s.p[i], y = s.p[i + 1] * 0.7; if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
      if (s.p.length === 2) ctx.lineTo(s.p[0] + 0.1, s.p[1] * 0.7);
      ctx.stroke();
    });
  }
  function pos(e) { var cv = document.getElementById("dgc"), r = cv.getBoundingClientRect(); return [Math.round(((e.clientX - r.left) / r.width) * 1000), Math.round(((e.clientY - r.top) / r.height) * 1000)]; }
  function flush(end) {
    if (!pending || pending.p.length < 4) { if (end) pending = null; return; }
    send({ t: "move", action: "stroke", s: { c: pending.c, w: pending.w, p: pending.p } });
    var lx = pending.p[pending.p.length - 2], ly = pending.p[pending.p.length - 1];
    pending = end ? null : { c: pen.c, w: pen.w, p: [lx, ly] };
  }
  setInterval(function () { if (drawing) flush(false); }, 90);
  app.addEventListener("pointerdown", function (e) {
    if (e.target.id !== "dgc" || !e.target.classList.contains("mine")) return;
    drawing = true; var p = pos(e); pending = { c: pen.c, w: pen.w, p: [p[0], p[1]] }; e.preventDefault();
  });
  document.addEventListener("pointermove", function (e) {
    if (!drawing) return; var p = pos(e); pending.p.push(Math.max(0, Math.min(1000, p[0])), Math.max(0, Math.min(1000, p[1]))); paint();
  });
  document.addEventListener("pointerup", function () { if (drawing) { drawing = false; flush(true); } });

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

// GAM.IO "more games" pack: Bomb Party, Typing Race, Minesweeper Battle, Snake Party, Backgammon, Gin Rummy (browser code, styles and the server-side game logic plugin).
const JS: string = String.raw`// ---------- GAM.IO: Bomb Party, Typing Race, Minesweeper Battle, Snake Party, Backgammon, Gin Rummy ----------
(function () {
  var MINE = { bomb: 1, typing: 1, mines: 1, snake: 1, backgammon: 1, gin: 1 };
  GAMES = GAMES.filter(function (m) { return !MINE[m.id]; });
  GAMES.splice(2, 0,
    { id: "bomb", name: "Bomb Party", cat: "Word", players: "2–8 players", tag: "New", icon: "💣" },
    { id: "snake", name: "Snake Party", cat: "Arcade", players: "1–8 players", tag: "New", icon: "🐍" },
    { id: "typing", name: "Typing Race", cat: "Word", players: "1–8 players", tag: "New", icon: "⌨️" },
    { id: "backgammon", name: "Backgammon", cat: "Classic", players: "2 players", tag: "New", icon: "🎲" },
    { id: "gin", name: "Gin Rummy", cat: "Cards", players: "2 players", tag: "New", icon: "🃏" },
    { id: "mines", name: "Minesweeper Battle", cat: "Arcade", players: "1–6 players", tag: "New", icon: "💣" });
  var TIPS = {
    bomb: "Type a word that contains the letters on the bomb before it explodes. Use every letter of the alphabet to win back a life. Last one standing wins.",
    typing: "Type the text as fast as you can. Mistakes stop your car until you fix them. First to the finish line wins.",
    mines: "Everyone gets the same minefield. Clear all safe squares first. Hitting a mine freezes you for 5 seconds.",
    snake: "Steer with the arrow keys, WASD or by swiping. Eat to grow, make others crash into you for +5. Highest score when time runs out wins.",
    backgammon: "Race all 15 checkers around the board and bear them off. Land on a lone enemy checker to send it back to the bar.",
    gin: "Make sets and runs. Knock when your unmatched cards add up to 10 or less, or go Gin with none at all. First to the target score wins.",
  };
  window.__gxState = function () { return S; };
  var skew = 0;
  function nowS() { return Date.now() + skew; }
  function nm(g, i) { return g.seats[i] ? esc(g.seats[i].name) + (g.seats[i].id === S.you ? " (you)" : "") : "?"; }
  function names(g, txt) { return esc(txt || "").replace(/\{(\d+)\}/g, function (_, i) { return "<b>" + nm(g, +i) + "</b>"; }); }
  function secs(dl) { return Math.max(0, Math.ceil((dl - nowS()) / 1000)); }
  function flyFrom(el, from, dur) {
    if (!el || !from || window.__gxCalm) return;
    var to = el.getBoundingClientRect(), dx = from.left + from.width / 2 - (to.left + to.width / 2), dy = from.top + from.height / 2 - (to.top + to.height / 2);
    el.animate([{ transform: "translate(" + dx + "px," + dy + "px)" }, { transform: "translate(" + dx / 2 + "px," + (dy / 2 - 30) + "px)", offset: 0.5 }, { transform: "none" }], { duration: dur || 420, easing: "cubic-bezier(.2,.85,.25,1)" });
  }
  // a text box that survives re-renders (so typing never loses focus)
  var INPUTS = {};
  function persistentInput(key, ph, onInput, onEnter) {
    var el = INPUTS[key];
    if (!el) {
      el = document.createElement("input"); el.className = "gx-pin"; el.autocomplete = "off"; el.spellcheck = false; el.setAttribute("autocapitalize", "off"); el.setAttribute("autocorrect", "off");
      el.addEventListener("input", function () { onInput(el); });
      el.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); onEnter && onEnter(el); } });
      INPUTS[key] = el;
    }
    el.placeholder = ph; return el;
  }
  function mountInput(key, slotSel, focus) {
    var el = INPUTS[key], slot = app.querySelector(slotSel); if (!el || !slot) return;
    var had = document.activeElement === el, pos = el.selectionStart;
    slot.appendChild(el);
    if (had || focus) { try { el.focus({ preventScroll: true }); if (pos != null) el.setSelectionRange(pos, pos); } catch (e) {} }
  }

  // ===================== Bomb Party =====================
  var bombSent = 0, bombLastCur = -1;
  function bombView(g) {
    var st = g.state, n = g.seats.length, me = g.seat, mine = st.phase === "play" && st.cur === me;
    var seats = "";
    for (var i = 0; i < n; i++) {
      var a = (-90 + (360 * i) / n) * Math.PI / 180, x = 50 + 40 * Math.cos(a), y = 50 + 38 * Math.sin(a), hearts = "";
      for (var k = 0; k < Math.max(st.max, st.lives[i]); k++) hearts += '<i class="' + (k < st.lives[i] ? "on" : "") + '">♥</i>';
      seats += '<div class="bp-seat' + (st.cur === i && st.phase === "play" ? " cur" : "") + (st.lives[i] <= 0 ? " out" : "") + (st.boom && st.boom.seat === i && st.phase === "boom" ? " hit" : "") + '" style="left:' + x.toFixed(1) + "%;top:" + y.toFixed(1) + '%">' + avatar(g.seats[i], 46, COLORS[i % COLORS.length]) + "<b>" + nm(g, i) + '</b><div class="bp-hearts">' + hearts + '</div><div class="bp-typed" data-bt="' + i + '">' + esc((st.typed && st.typed[i]) || "") + "</div></div>";
    }
    var ang = (360 * st.cur) / n;
    var bombSvg = '<svg viewBox="0 0 120 120" class="bp-bomb"><defs><radialGradient id="bpb" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#6b6780"/><stop offset="1" stop-color="#0e0c16"/></radialGradient></defs><circle cx="58" cy="66" r="40" fill="url(#bpb)"/><rect x="66" y="18" width="18" height="16" rx="4" fill="#3b3650" transform="rotate(35 75 26)"/><path d="M82 18q10-14 22-8" fill="none" stroke="#c9a46a" stroke-width="4" stroke-linecap="round"/><g class="bp-spark"><circle cx="104" cy="10" r="6" fill="#ffd84d"/><path d="M104 0v6M104 14v6M94 10h6M108 10h6" stroke="#ff9f43" stroke-width="3" stroke-linecap="round"/></g><ellipse cx="42" cy="48" rx="10" ry="6" fill="#fff" opacity=".25" transform="rotate(-30 42 48)"/></svg>';
    var center = '<div class="bp-center' + (st.phase === "boom" ? " boom" : "") + '"><div class="bp-arrow" style="transform:rotate(' + ang + 'deg)"></div>' + bombSvg + '<div class="bp-syl">' + esc(st.syl) + "</div>" + (st.phase === "boom" ? '<div class="bp-kaboom">💥</div>' : "") + "</div>";
    var alpha = st.alpha.split("").map(function (c) { return '<i class="' + (st.letters.indexOf(c) >= 0 ? "on" : "") + '">' + c + "</i>"; }).join("");
    var last = st.last ? '<div class="bp-last">' + nm(g, st.last.seat) + ": <b>" + st.last.w.replace(st.last.syl, "<u>" + st.last.syl + "</u>") + "</b></div>" : "";
    var ctl = "";
    if (me >= 0 && st.lives[me] > 0) ctl = '<div class="bp-ctl' + (mine ? " mine" : "") + '"><div id="bp-slot"></div><div class="bp-alpha">' + alpha + "</div></div>";
    return '<div class="bp-ring">' + seats + center + "</div>" + last + '<p class="hint">' + (mine ? "Your turn! Type a word with <b>" + esc(st.syl) + "</b> and press Enter" : st.phase === "boom" ? names(g, st.log) : "Waiting for " + nm(g, st.cur) + "…") + "</p>" + ctl;
  }
  function bombAfter(g) {
    var st = g.state, mine = st.phase === "play" && st.cur === g.seat;
    var el = persistentInput("bomb", "Type a word…", function (inp) {
      inp.value = inp.value.toUpperCase().replace(/[^A-Z]/g, "");
      var t = Date.now(); if (t - bombSent > 70) { bombSent = t; send({ t: "move", action: "type", v: inp.value }); }
      var me = app.querySelector('[data-bt="' + S.game.seat + '"]'); if (me) me.textContent = inp.value;
    }, function (inp) { if (inp.value.length >= 3) { send({ t: "move", action: "word", w: inp.value }); inp.select(); } });
    if (st.cur !== bombLastCur) { bombLastCur = st.cur; el.value = ""; }
    el.disabled = !mine; el.placeholder = mine ? "Type a word with " + st.syl + "…" : "Wait for your turn";
    mountInput("bomb", "#bp-slot", mine);
  }

  // ===================== Typing Race =====================
  var TR = { gid: 0, done: 0, err: 0, sent: 0, wrong: false };
  function trWords(text, done) { var rest = text.slice(done), i = rest.indexOf(" "); return i < 0 ? rest : rest.slice(0, i + 1); }
  function trLanes(g) {
    var st = g.state, L = st.text.length, el = (nowS() - st.start) / 60000;
    return g.seats.map(function (s, i) {
      var p = Math.min(1, st.prog[i] / L), wpm = st.fin[i] ? Math.round((L / 5) / (st.fin[i] / 60000)) : el > 0.02 ? Math.round(st.prog[i] / 5 / el) : 0, place = st.order.indexOf(i);
      return '<div class="tr-lane"><span class="tr-nm">' + nm(g, i) + '</span><div class="tr-road"><div class="tr-car" data-tr="' + i + '" style="left:calc(' + (p * 100).toFixed(1) + '% - ' + (p * 46).toFixed(1) + 'px);--c:' + COLORS[i % COLORS.length] + '"><svg viewBox="0 0 60 28"><rect x="4" y="8" width="52" height="14" rx="6" fill="var(--c)"/><path d="M14 8l8-6h16l8 6z" fill="var(--c)" opacity=".85"/><rect x="22" y="3" width="15" height="5" rx="1" fill="#bde4ff"/><circle cx="16" cy="23" r="5" fill="#222"/><circle cx="44" cy="23" r="5" fill="#222"/></svg></div><i class="tr-flag">🏁</i></div><b class="tr-wpm" data-trw="' + i + '">' + (place >= 0 ? ["🥇", "🥈", "🥉"][place] || "#" + (place + 1) : "") + " " + wpm + " wpm</b></div>";
    }).join("");
  }
  function trText(g) {
    var st = g.state, t = st.text, d = TR.done, inp = INPUTS.typing ? INPUTS.typing.value : "", w = trWords(t, d), ok = w.indexOf(inp) === 0;
    var good = ok ? inp.length : 0, out = "";
    for (var i = 0; i < t.length; i++) {
      var c = t[i] === " " ? " " : esc(t[i]), cls = i < d + good ? "ok" : i === d + good ? (ok ? "cur" : "bad") : i < d + inp.length && !ok ? "bad" : "";
      out += cls ? '<span class="' + cls + '">' + c + "</span>" : c;
    }
    return out;
  }
  function typingView(g) {
    var st = g.state;
    if (TR.gid !== g.id) { TR = { gid: g.id, done: 0, err: 0, sent: 0, wrong: false }; if (INPUTS.typing) INPUTS.typing.value = ""; }
    var count = st.phase === "count" ? '<div class="tr-count">' + Math.max(1, secs(st.start)) + "</div>" : "";
    var me = g.seat >= 0 && !st.fin[g.seat] && st.phase === "race";
    return '<div class="tr-wrap"><div class="tr-lanes">' + trLanes(g) + '</div><div class="tr-text" id="tr-text">' + trText(g) + "</div>" + (g.seat >= 0 ? '<div id="tr-slot" class="tr-slot"></div>' : "") +
      '<p class="hint" id="tr-hint">' + (st.phase === "count" ? "Get ready…" : st.fin[g.seat] ? "Finished! Waiting for the others…" : me ? "Type the text above. Press space after each word." : "") + "</p>" + count + "</div>";
  }
  function typingAfter(g) {
    var st = g.state, me = g.seat >= 0 && !st.fin[g.seat] && st.phase === "race";
    var el = persistentInput("typing", "Start typing…", function (inp) {
      var gg = S.game; if (!gg || gg.type !== "typing") return;
      var t = gg.state.text, w = trWords(t, TR.done), v = inp.value;
      var ok = w.indexOf(v) === 0 || (v === w.trim() && TR.done + w.length >= t.length);
      if (!ok && !TR.wrong) TR.err++;
      TR.wrong = !ok;
      if (ok && (v === w || (TR.done + v.length >= t.length && v === w.trim()))) { TR.done += v.length; inp.value = ""; }
      var n = TR.done + (ok ? inp.value.length : 0); TR.n = n;
      inp.classList.toggle("bad", !ok);
      var tx = document.getElementById("tr-text"); if (tx) tx.innerHTML = trText(gg);
      var tnow = Date.now(); if (tnow - TR.sent > 120 || n >= t.length) { TR.sent = tnow; send({ t: "move", action: "prog", n: n, e: TR.err }); }
    }, null);
    el.disabled = !me; el.placeholder = st.phase === "count" ? "Get ready…" : me ? "Type here…" : "";
    mountInput("typing", "#tr-slot", me);
  }
  setInterval(function () {
    var g = S.game; if (!g || g.type !== "typing" || !g.state || g.state.phase !== "race" || g.seat < 0 || g.state.fin[g.seat]) return;
    if (TR.gid === g.id && TR.n > g.state.prog[g.seat] && Date.now() - TR.sent > 350) { TR.sent = Date.now(); send({ t: "move", action: "prog", n: TR.n, e: TR.err }); }
  }, 400);
  function typingLite(g) {
    var st = g.state, L = st.text.length;
    g.seats.forEach(function (s, i) { var car = app.querySelector('[data-tr="' + i + '"]'); if (car) { var p = Math.min(1, st.prog[i] / L); car.style.left = "calc(" + (p * 100).toFixed(1) + "% - " + (p * 46).toFixed(1) + "px)"; } });
    var lanes = app.querySelector(".tr-lanes"); if (lanes) { var el = (nowS() - st.start) / 60000; g.seats.forEach(function (s, i) { var w = app.querySelector('[data-trw="' + i + '"]'); if (w) { var place = st.order.indexOf(i), wpm = st.fin[i] ? Math.round((L / 5) / (st.fin[i] / 60000)) : el > 0.02 ? Math.round(st.prog[i] / 5 / el) : 0; w.textContent = (place >= 0 ? ["🥇", "🥈", "🥉"][place] || "#" + (place + 1) : "") + " " + wpm + " wpm"; } }); }
    var h = document.getElementById("tr-hint"); if (h && st.fin[g.seat]) h.textContent = "Finished! Waiting for the others…";
    if (st.fin[g.seat] && INPUTS.typing) INPUTS.typing.disabled = true;
    return true;
  }

  // ===================== Minesweeper Battle =====================
  var flagMode = false;
  function minesView(g) {
    var st = g.state, me = g.seat, cells = "", frozen = st.pen > nowS();
    for (var i = 0; i < st.cells.length; i++) {
      var v = st.cells[i];
      cells += v >= 0 ? '<div class="ms-c open n' + v + '">' + (v || "") + "</div>" : v === -2 ? '<div class="ms-c boom">💥</div>' : v === -3 ? '<div class="ms-c flag" data-act="ms" data-i="' + i + '">🚩</div>' : v === -4 ? '<div class="ms-c mine">💣</div>' : '<div class="ms-c" data-act="ms" data-i="' + i + '"></div>';
    }
    var bars = g.seats.map(function (s, i) { var p = 1 - st.left[i] / st.safe, place = st.order.indexOf(i); return '<div class="ms-p' + (i === me ? " me" : "") + '"><span>' + nm(g, i) + '</span><div class="bar"><i style="width:' + Math.round(p * 100) + '%"></i></div><b>' + (place >= 0 ? "🏁 #" + (place + 1) : Math.round(p * 100) + "%") + "</b>" + (st.booms[i] ? '<small>💥' + st.booms[i] + "</small>" : "") + "</div>"; }).join("");
    return '<div class="ms-wrap"><div class="ms-side"><div class="ms-time">⏱ <b data-msend="' + st.end + '">' + fmt(secs(st.end)) + '</b></div>' + bars + (me >= 0 ? '<button class="btn ' + (flagMode ? "primary" : "dark") + '" data-act="msflag">🚩 Flag mode: ' + (flagMode ? "On" : "Off") + "</button>" : "") + '<p class="muted">' + st.k + " mines · right-click or long-press to flag</p></div>" +
      '<div class="ms-board' + (frozen ? " frozen" : "") + '" style="grid-template-columns:repeat(' + st.w + ',1fr);--w:' + st.w + '">' + cells + (frozen ? '<div class="ms-freeze">🥶 Frozen <b data-mspen="' + st.pen + '">' + secs(st.pen) + "</b>s</div>" : "") + "</div></div>";
  }
  function fmt(s) { return Math.floor(s / 60) + ":" + ("0" + (s % 60)).slice(-2); }
  setInterval(function () {
    document.querySelectorAll("[data-msend]").forEach(function (el) { el.textContent = fmt(secs(+el.getAttribute("data-msend"))); });
    document.querySelectorAll("[data-mspen]").forEach(function (el) { var s = secs(+el.getAttribute("data-mspen")); el.textContent = s; if (!s) { var b = el.closest(".ms-board"); if (b) { b.classList.remove("frozen"); var f = el.closest(".ms-freeze"); if (f) f.remove(); } } });
    document.querySelectorAll("[data-sncount]").forEach(function (el) { el.textContent = Math.max(1, secs(+el.getAttribute("data-sncount"))); });
  }, 250);

  // ===================== Snake Party =====================
  var SN = { cv: null, gid: 0, prev: null, cur: null, at: 0 };
  function snakeView(g) {
    var st = g.state;
    return '<div class="sn-wrap"><div class="sn-stage"><div id="sn-slot"></div>' + (st.phase === "count" ? '<div class="tr-count" data-sncount="' + st.start + '">' + Math.max(1, secs(st.start)) + "</div>" : "") + '</div><div class="sn-side"><div class="ms-time">⏱ <b data-msend="' + st.end + '">' + fmt(secs(st.end)) + '</b></div><ol class="sn-board" id="sn-board">' + snBoard(g) + "</ol>" +
      (g.seat >= 0 ? '<div class="sn-pad"><button data-act="snd" data-d="0">▲</button><button data-act="snd" data-d="3">◀</button><button data-act="snd" data-d="1">▶</button><button data-act="snd" data-d="2">▼</button></div>' : "") + "</div></div>";
  }
  function snBoard(g) {
    var st = g.state;
    return g.seats.map(function (s, i) { return { i: i, sc: st.sn[i].score, k: st.sn[i].kills, alive: st.sn[i].alive }; }).sort(function (a, b) { return b.sc - a.sc; }).map(function (r) {
      return '<li class="' + (r.alive ? "" : "dead") + '"><i style="background:' + COLORS[r.i % COLORS.length] + '"></i><span>' + nm(g, r.i) + "</span><b>" + r.sc + "</b>" + (r.k ? "<small>⚔" + r.k + "</small>" : "") + "</li>";
    }).join("");
  }
  function snakeAfter(g) {
    var slot = document.getElementById("sn-slot"); if (!slot) return;
    if (!SN.cv || SN.gid !== g.id) { SN.cv = document.createElement("canvas"); SN.cv.width = 36 * 22; SN.cv.height = 24 * 22; SN.cv.className = "sn-cv"; SN.gid = g.id; SN.prev = null; }
    slot.appendChild(SN.cv); snakeFrame(g);
  }
  function snakeFrame(g) {
    SN.prev = SN.cur; SN.cur = g.state; SN.at = performance.now();
    if (!SN.raf) SN.raf = requestAnimationFrame(snakeDraw);
  }
  function snakeDraw() {
    SN.raf = 0; var st = SN.cur, cv = SN.cv; if (!st || !cv || !cv.isConnected) return;
    var c = cv.getContext("2d"), Z = 22, W = st.w, t = Math.min(1, (performance.now() - SN.at) / 125);
    c.fillStyle = "#120d33"; c.fillRect(0, 0, cv.width, cv.height);
    c.fillStyle = "#ffffff08"; for (var y = 0; y < st.h; y++) for (var x = (y % 2); x < W; x += 2) c.fillRect(x * Z, y * Z, Z, Z);
    st.food.forEach(function (f) { var x = (f % W) * Z + Z / 2, y = Math.floor(f / W) * Z + Z / 2, r = Z * 0.32 + Math.sin(performance.now() / 200 + f) * 1.5; c.fillStyle = "#ff4d6d"; c.shadowColor = "#ff4d6d"; c.shadowBlur = 12; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill(); c.shadowBlur = 0; c.fillStyle = "#3ddc84"; c.fillRect(x - 1, y - r - 4, 3, 5); });
    st.sn.forEach(function (sn, i) {
      if (!sn.alive || !sn.body.length) return;
      var col = COLORS[i % COLORS.length], prevSn = SN.prev && SN.prev.sn[i];
      sn.body.forEach(function (cell, k) {
        var x = (cell % W) * Z, y = Math.floor(cell / W) * Z;
        if (k === 0 && prevSn && prevSn.alive && prevSn.body.length && !window.__gxCalm) { var px = (prevSn.body[0] % W) * Z, py = Math.floor(prevSn.body[0] / W) * Z; if (Math.abs(px - x) <= Z && Math.abs(py - y) <= Z) { x = px + (x - px) * t; y = py + (y - py) * t; } }
        c.fillStyle = col; c.globalAlpha = k === 0 ? 1 : Math.max(0.55, 1 - k * 0.02);
        var p = k === 0 ? 1 : 2.5; roundRect(c, x + p, y + p, Z - p * 2, Z - p * 2, 7); c.fill(); c.globalAlpha = 1;
        if (k === 0) { c.fillStyle = "#fff"; var dx = [0, 1, 0, -1][sn.dir], dy = [-1, 0, 1, 0][sn.dir]; [-1, 1].forEach(function (sd) { var ex = x + Z / 2 + dx * 4 + dy * sd * 5, ey = y + Z / 2 + dy * 4 - dx * sd * 5; c.beginPath(); c.arc(ex, ey, 3.2, 0, 7); c.fill(); c.fillStyle = "#111"; c.beginPath(); c.arc(ex + dx * 1.2, ey + dy * 1.2, 1.6, 0, 7); c.fill(); c.fillStyle = "#fff"; }); }
      });
      if (S.game && S.game.seat === i) { var h = sn.body[0]; c.strokeStyle = "#fff"; c.lineWidth = 2; c.strokeRect((h % W) * Z + 0.5, Math.floor(h / W) * Z + 0.5, Z - 1, Z - 1); }
    });
    if (t < 1) SN.raf = requestAnimationFrame(snakeDraw);
  }
  function roundRect(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  function snakeLite(g) { snakeFrame(g); var b = document.getElementById("sn-board"); if (b) b.innerHTML = snBoard(g); return true; }
  function snDir(d) { var g = S.game; if (!g || g.type !== "snake" || g.seat < 0) return; send({ t: "move", action: "dir", d: d }); }
  document.addEventListener("keydown", function (e) {
    var g = S.game; if (!g || g.type !== "snake" || g.phase !== "playing" || e.target.tagName === "INPUT") return;
    var k = { ArrowUp: 0, w: 0, W: 0, ArrowRight: 1, d: 1, D: 1, ArrowDown: 2, s: 2, S: 2, ArrowLeft: 3, a: 3, A: 3 }[e.key];
    if (k != null) { e.preventDefault(); snDir(k); }
  });
  var touch0 = null;
  document.addEventListener("touchstart", function (e) { if (e.target.closest && e.target.closest(".sn-cv")) touch0 = [e.touches[0].clientX, e.touches[0].clientY]; }, { passive: true });
  document.addEventListener("touchmove", function (e) {
    if (!touch0) return; var dx = e.touches[0].clientX - touch0[0], dy = e.touches[0].clientY - touch0[1];
    if (Math.abs(dx) + Math.abs(dy) < 24) return;
    snDir(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : 3) : dy > 0 ? 2 : 0); touch0 = [e.touches[0].clientX, e.touches[0].clientY];
  }, { passive: true });
  document.addEventListener("touchend", function () { touch0 = null; });

  // ===================== Backgammon =====================
  var BG = { sel: null, last: "" };
  function bgDisp(g) { return g.seat === 1 ? function (i) { return 23 - i; } : function (i) { return i; }; }
  function chk(p, k) { return '<i class="bg-ck p' + p + '" style="--k:' + k + '"></i>'; }
  function bgPoint(g, ai, top) {
    var st = g.state, v = st.b[ai], p = v > 0 ? 0 : 1, n = Math.abs(v), mine = g.seat >= 0;
    var srcs = mine ? st.moves.filter(function (m) { return m[0] === ai; }) : [], dst = BG.sel != null && st.moves.some(function (m) { return m[0] === BG.sel && m[1] === ai; });
    var cks = ""; for (var k = 0; k < Math.min(n, 5); k++) cks += chk(p, k);
    if (n > 5) cks += '<b class="bg-n">' + n + "</b>";
    return '<div class="bg-pt ' + (top ? "bg-top" : "bg-bot") + (ai % 2 ? " odd" : "") + (srcs.length ? " can" : "") + (BG.sel === ai ? " sel" : "") + (dst ? " dst" : "") + '" data-act="bgp" data-pt="' + ai + '"><svg viewBox="0 0 40 160" preserveAspectRatio="none"><path d="' + (top ? "M0 0h40L20 150z" : "M0 160h40L20 10z") + '"/></svg><div class="bg-stack">' + cks + "</div></div>";
  }
  function backgammonView(g) {
    var st = g.state, D = bgDisp(g), me = g.seat, mine = me >= 0 && st.turn === me && g.phase === "playing";
    var key = g.id + ":" + st.b.join(",") + st.left.join(",") + st.turn;
    if (BG.last !== key) { BG.last = key; BG.sel = null; }
    // display order: top row is my 12..23 from left to right, bottom row my 11..0 from left to right (home bottom right)
    var top = "", bot = "";
    for (var r = 12; r <= 23; r++) { top += bgPoint(g, D(r), true); if (r === 17) top += '<div class="bg-bar" data-act="bgbar" data-p="' + (1 - Math.max(0, me)) + '">' + barCks(st, 1 - Math.max(0, me)) + "</div>"; }
    for (var r2 = 11; r2 >= 0; r2--) { bot += bgPoint(g, D(r2), false); if (r2 === 6) bot += '<div class="bg-bar' + (mine && st.bar[me] && st.moves.some(function (m) { return m[0] === 24; }) ? " can" : "") + (BG.sel === 24 ? " sel" : "") + '" data-act="bgbar" data-p="' + Math.max(0, me) + '">' + barCks(st, Math.max(0, me)) + "</div>"; }
    var canOff = BG.sel != null && st.moves.some(function (m) { return m[0] === BG.sel && m[1] === -1; });
    var myP = Math.max(0, me), off = '<div class="bg-off' + (canOff ? " dst" : "") + '" data-act="bgoff"><div class="bg-tray p' + (1 - myP) + '"><b>' + st.off[1 - myP] + '</b></div><div class="bg-tray p' + myP + '"><b>' + st.off[myP] + "</b></div></div>";
    var dice = st.dice.map(function (d, i) { var used = st.left.length < (st.dice[0] === st.dice[1] ? 4 : 2) && (st.dice[0] === st.dice[1] ? false : st.left.indexOf(d) < 0); return '<div class="dface bg-d' + (used ? " used" : "") + '">' + pips(d) + "</div>"; }).join("");
    if (st.dice[0] === st.dice[1] && st.dice.length) dice += '<small class="bg-dbl">×' + st.left.length + " left</small>";
    var ctl = mine && st.phase === "roll" ? '<button class="btn primary lg" data-act="bgroll">🎲 Roll</button>' : "";
    var info = '<div class="bg-info"><span>' + nm(g, 0) + ' <i class="bg-ck p0 mini"></i> ' + st.score[0] + "</span><b>Match to " + st.to + '</b><span>' + st.score[1] + ' <i class="bg-ck p1 mini"></i> ' + nm(g, 1) + '</span></div><div class="bg-pips">Pips: ' + st.pips[myP] + " vs " + st.pips[1 - myP] + "</div>";
    var hint = g.phase !== "playing" ? "" : st.phase === "between" ? names(g, st.log) : mine ? (st.phase === "roll" ? "Roll the dice" : BG.sel != null ? "Now tap where to move it" : "Tap a highlighted checker to move it") : "Waiting for " + nm(g, st.turn) + "…";
    return info + '<div class="bg-board"><div class="bg-half">' + top + '</div><div class="bg-mid"><div class="bg-dice">' + dice + "</div>" + ctl + '</div><div class="bg-half">' + bot + "</div>" + off + "</div>" + '<p class="hint">' + hint + "</p>" + (st.log && st.phase !== "between" ? '<p class="muted bg-log">' + names(g, st.log) + "</p>" : "");
  }
  function barCks(st, p) { var s = ""; for (var k = 0; k < Math.min(st.bar[p], 4); k++) s += chk(p, k); return s + (st.bar[p] > 4 ? '<b class="bg-n">' + st.bar[p] + "</b>" : ""); }
  var PIPS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
  function pips(v) { var h = ""; for (var i = 0; i < 9; i++) h += "<i" + ((PIPS[v] || []).indexOf(i) >= 0 ? ' class="on"' : "") + "></i>"; return h; }
  var bgLastMove = "";
  function backgammonAfter(g) {
    var st = g.state, k = st.last ? JSON.stringify(st.last) + st.b.join("") : "";
    if (k && k !== bgLastMove && bgLastMove) {
      var to = st.last.to === -1 ? app.querySelector(".bg-tray.p" + st.last.p) : app.querySelector('.bg-pt[data-pt="' + st.last.to + '"] .bg-ck:last-of-type');
      var from = st.last.from === 24 ? app.querySelector(".bg-bar") : app.querySelector('.bg-pt[data-pt="' + st.last.from + '"]');
      if (to && from) flyFrom(to, from.getBoundingClientRect(), 380);
    }
    bgLastMove = k;
  }

  // ===================== Gin Rummy =====================
  var GN = { sel: null };
  function ginView(g) {
    var st = g.state, me = g.seat, mine = me >= 0 && st.turn === me && g.phase === "playing";
    var oppI = me >= 0 ? 1 - me : 1, backs = "";
    if (st.opp) for (var k = 0; k < st.opp[oppI]; k++) backs += '<div class="card back mini" style="--o:' + (k - st.opp[oppI] / 2).toFixed(1) + '"></div>';
    var piles = '<div class="gn-piles"><div class="gn-stock' + (mine && st.phase === "draw" ? " can" : "") + '" data-act="gnstock"><div class="card back"></div><small>' + st.stock + '</small></div><div class="gn-disc' + (mine && st.phase === "draw" && st.top ? " can" : "") + '" data-act="gndisc">' + (st.top ? cardHtml(st.top) : '<div class="card slot"></div>') + "<small>Discard</small></div></div>";
    var hand = "";
    if (st.hand) {
      var inMeld = {}; st.melds.forEach(function (m, mi) { m.forEach(function (c) { inMeld[c] = mi + 1; }); });
      var groups = st.melds.map(function (m) { return '<div class="gn-meld">' + m.slice().sort(gsort).map(function (c) { return gcard(c, st, mine); }).join("") + "</div>"; }).join("");
      var dead = st.hand.filter(function (c) { return !inMeld[c]; }).sort(gsort).map(function (c) { return gcard(c, st, mine); }).join("");
      hand = '<div class="gn-hand">' + groups + (dead ? '<div class="gn-dead">' + dead + "</div>" : "") + "</div>";
    }
    var sel = GN.sel && st.hand && st.hand.indexOf(GN.sel) >= 0 ? GN.sel : null;
    var ctl = "";
    if (mine && st.phase === "discard") {
      ctl = '<div class="actions"><button class="btn dark" data-act="gndis"' + (sel ? "" : " disabled") + ">Discard" + (sel ? " " + sel[0].replace("T", "10") + { S: "♠", H: "♥", D: "♦", C: "♣" }[sel[1]] : "") + "</button>" +
        '<button class="btn primary" data-act="gnknock"' + (sel ? "" : " disabled") + ">Knock</button></div>";
    }
    var score = '<div class="bg-info"><span>' + nm(g, 0) + " · <b>" + st.score[0] + "</b></span><b>to " + st.target + "</b><span><b>" + st.score[1] + "</b> · " + nm(g, 1) + "</span></div>";
    var show = "";
    if (st.show && st.show.kind !== "void") {
      var sh = st.show, kname = nm(g, sh.knocker), dname = nm(g, 1 - sh.knocker);
      show = '<div class="gn-show"><h3>' + (sh.kind === "gin" ? "🎉 Gin!" : sh.kind === "undercut" ? "😮 Undercut!" : "✊ Knock") + "</h3><p>" + nm(g, sh.who) + " scores <b>" + sh.pts + "</b></p>" +
        '<div class="gn-sh"><small>' + kname + " · deadwood " + sh.kDw + "</small>" + sh.kMelds.map(function (m) { return '<div class="gn-meld">' + m.map(function (c) { return cardHtml(c, " mini"); }).join("") + "</div>"; }).join("") + '<div class="gn-dead">' + sh.kDead.map(function (c) { return cardHtml(c, " mini"); }).join("") + "</div></div>" +
        '<div class="gn-sh"><small>' + dname + " · deadwood " + sh.dDw + "</small>" + sh.dMelds.map(function (m) { return '<div class="gn-meld">' + m.map(function (c) { return cardHtml(c, " mini"); }).join("") + "</div>"; }).join("") + '<div class="gn-dead">' + sh.dDead.map(function (c) { return cardHtml(c, " mini"); }).join("") + "</div></div></div>";
    }
    var hint = g.phase !== "playing" ? "" : st.phase === "show" ? names(g, st.log) : mine ? (st.phase === "draw" ? "Draw from the stock or take the discard" : "Pick a card to discard" + (st.dw <= 10 ? ", or knock" : "")) : "Waiting for " + nm(g, st.turn) + "…";
    return score + '<div class="gn-opp">' + backs + "</div>" + piles + show + '<p class="hint">' + hint + '</p><div class="gn-dw">Deadwood: <b>' + (st.hand ? st.dw : "-") + "</b></div>" + hand + ctl;
  }
  function gsort(a, b) { return "SHDC".indexOf(a[1]) - "SHDC".indexOf(b[1]) || "A23456789TJQK".indexOf(a[0]) - "A23456789TJQK".indexOf(b[0]); }
  function gcard(c, st, mine) { return cardHtml(c, (GN.sel === c ? " sel" : "") + (st.drew === c ? " new" : "")).replace('class="card', 'data-act="gncard" class="card'); }

  // ===================== screens =====================
  var V = { bomb: bombView, typing: typingView, mines: minesView, snake: snakeView, backgammon: backgammonView, gin: ginView };
  var AFTER = { bomb: bombAfter, typing: typingAfter, snake: snakeAfter, backgammon: backgammonAfter };
  var LITE = { typing: typingLite, snake: snakeLite };
  var baseScreen = gameScreen;
  gameScreen = function (g) {
    if (!MINE[g.type] || g.phase === "lobby" || !g.state) {
      var h0 = baseScreen(g);
      if (MINE[g.type] && g.phase === "lobby" && TIPS[g.type]) h0 = h0.replace('<div class="actions">', '<p class="tip">💡 ' + TIPS[g.type] + '</p><div class="actions">');
      return h0;
    }
    if (g.state.now) skew = g.state.now - Date.now();
    var head = '<div class="ghead"><button class="ghost" data-act="leave">← ' + (g.seat >= 0 ? "Back" : "Games") + "</button><h2>" + art(g.type, true) + esc(g.name) + '</h2><div class="gr">' + (g.seat >= 0 && g.seats.length === 2 && g.phase === "playing" && (g.type === "backgammon" || g.type === "gin") ? '<button class="ghost" data-act="resign">🏳 Resign</button>' : "") + "</div></div>";
    var over = "";
    if (g.phase === "over") {
      var ws = g.winners || (g.winner ? [g.winner] : []), you = ws.indexOf(S.you) >= 0, nameOf = function (id) { var s = g.seats.filter(function (x) { return x.id === id; })[0]; return s ? esc(s.name) : "?"; };
      over = '<div class="modal"><div class="box"><div class="big">' + (you ? "🏆" : "🎮") + "</div><h2>" + (you ? "You win!" : ws.length ? ws.map(nameOf).join(", ") + (ws.length > 1 ? " tie!" : " wins!") : "Game over") + "</h2>" + (g.seat >= 0 ? '<p class="xp">+' + (you ? 100 : 20) + " XP</p>" : "") +
        '<div class="actions">' + (g.seat >= 0 ? '<button class="btn primary" data-act="rematch">Play again</button>' : "") + '<button class="btn dark" data-act="back">Back to games</button></div></div></div>';
    }
    return head + '<div class="gbody g-' + g.type + '">' + V[g.type](g) + "</div>" + over;
  };
  var baseRender = render;
  render = function () {
    baseRender.apply(this, arguments);
    var g = S.game;
    try { if (g && MINE[g.type] && g.state && g.phase !== "lobby" && AFTER[g.type] && app.querySelector(".g-" + g.type)) AFTER[g.type](g); } catch (e) { console.error("more", e); }
  };

  // ===================== socket: live updates without a full redraw =====================
  function onMsg(m) {
    if (m.t === "live") {
      var g = S.game; if (!g || g.id !== m.gid || !g.state) return true;
      if (g.type === "bomb" && m.m.action === "type") { g.state.typed[m.seat] = m.m.v; var el = app.querySelector('[data-bt="' + m.seat + '"]'); if (el) el.textContent = m.m.v; }
      if (g.type === "typing" && m.m.action === "prog") { g.state.prog[m.seat] = Math.max(g.state.prog[m.seat], +m.m.n || 0); typingLite(g); }
      return true;
    }
    if (m.t === "state" && m.game && LITE[m.game.type] && S.game && S.game.id === m.game.id && m.game.phase === "playing" && S.game.phase === "playing" && m.game.state && S.game.state && m.game.state.phase === S.game.state.phase && app.querySelector(".g-" + m.game.type)) {
      S.game = m.game; S.you = m.you; if (m.game.state.now) skew = m.game.state.now - Date.now();
      return LITE[m.game.type](m.game);
    }
    return false;
  }
  function hook(sock) {
    if (!sock || sock.__more) return; sock.__more = 1;
    var base = sock.onmessage;
    sock.onmessage = function (ev) { var m; try { m = JSON.parse(ev.data); } catch (e) { return; } if (!onMsg(m) && base) base.call(sock, ev); };
  }
  var baseConnect = connect;
  connect = function () { baseConnect(); hook(ws); };
  if (typeof ws !== "undefined" && ws) hook(ws);

  // ===================== clicks =====================
  var lp = null;
  app.addEventListener("contextmenu", function (e) { var c = e.target.closest('[data-act="ms"]'); if (c) { e.preventDefault(); send({ t: "move", action: "flag", i: +c.getAttribute("data-i") }); } });
  app.addEventListener("pointerdown", function (e) { var c = e.target.closest('[data-act="ms"]'); if (c && e.pointerType === "touch") lp = setTimeout(function () { lp = "done"; send({ t: "move", action: "flag", i: +c.getAttribute("data-i") }); }, 420); });
  app.addEventListener("pointerup", function () { if (lp && lp !== "done") clearTimeout(lp); setTimeout(function () { lp = null; }, 0); });
  app.addEventListener("click", function (e) {
    var el = e.target.closest("[data-act]"); if (!el) return;
    var a = el.getAttribute("data-act"), g = S.game;
    if (!g || !MINE[g.type]) return;
    var act = { ms: 1, msflag: 1, snd: 1, bgp: 1, bgbar: 1, bgoff: 1, bgroll: 1, gnstock: 1, gndisc: 1, gncard: 1, gndis: 1, gnknock: 1 };
    if (!act[a]) return;
    e.stopPropagation();
    if (a === "ms") { if (lp === "done") return; send({ t: "move", action: flagMode ? "flag" : "open", i: +el.getAttribute("data-i") }); }
    else if (a === "msflag") { flagMode = !flagMode; render(); }
    else if (a === "snd") snDir(+el.getAttribute("data-d"));
    else if (a === "bgroll") send({ t: "move", action: "roll" });
    else if (a === "bgp" || a === "bgbar") {
      var st = g.state, pt = a === "bgbar" ? 24 : +el.getAttribute("data-pt");
      if (BG.sel != null && a === "bgp" && st.moves.some(function (m) { return m[0] === BG.sel && m[1] === pt; })) { send({ t: "move", action: "move", from: BG.sel, to: pt }); BG.sel = null; return; }
      if (st.moves.some(function (m) { return m[0] === pt; })) { BG.sel = BG.sel === pt ? null : pt; render(); }
    }
    else if (a === "bgoff") { if (BG.sel != null) { send({ t: "move", action: "move", from: BG.sel, to: -1 }); BG.sel = null; } }
    else if (a === "gnstock") send({ t: "move", action: "draw", from: "stock" });
    else if (a === "gndisc") send({ t: "move", action: "draw", from: "discard" });
    else if (a === "gncard") { var c = el.getAttribute("data-card"); GN.sel = GN.sel === c ? null : c; render(); }
    else if (a === "gndis" && GN.sel) { send({ t: "move", action: "discard", card: GN.sel }); GN.sel = null; }
    else if (a === "gnknock" && GN.sel) { send({ t: "move", action: "knock", card: GN.sel }); GN.sel = null; }
  }, true);
})();
`;
const CSS: string = String.raw`/* ================= GAM.IO new games ================= */
.gx-pin{width:min(420px,100%);font:inherit;font-size:22px;font-weight:900;letter-spacing:2px;text-align:center;padding:12px 16px;border-radius:16px;border:2px solid #ffffff2a;background:#0f0b2b;color:#fff;outline:none;text-transform:uppercase}
.gx-pin:focus{border-color:var(--gold);box-shadow:0 0 0 4px #ffd84d33}
.gx-pin:disabled{opacity:.5}
.gx-pin.bad{border-color:#ff4d6d;box-shadow:0 0 0 4px #ff4d6d33;animation:gx-shake .25s}
@keyframes gx-shake{25%{transform:translateX(-5px)}75%{transform:translateX(5px)}}
.tip{max-width:560px;text-align:center;color:#d9d2ff;font-size:14px}
/* ---- Bomb Party ---- */
.g-bomb{width:100%;align-items:center}
.bp-ring{position:relative;width:min(620px,100%);aspect-ratio:1.35;margin:0 auto}
.bp-seat{position:absolute;transform:translate(-50%,-50%);display:flex;flex-direction:column;align-items:center;gap:2px;width:130px;text-align:center;transition:transform .3s}
.bp-seat b{font-size:13px}.bp-seat.cur{transform:translate(-50%,-50%) scale(1.12)}
.bp-seat.cur .av{box-shadow:0 0 0 3px var(--gold),0 0 22px #ffc83d!important}
.bp-seat.out{opacity:.35;filter:grayscale(1)}
.bp-seat.hit{animation:gx-shake .3s 3}
.bp-hearts i{font-style:normal;color:#ffffff22;font-size:14px}.bp-hearts i.on{color:#ff4d6d;text-shadow:0 0 6px #ff4d6d}
.bp-typed{min-height:22px;font-weight:900;letter-spacing:1.5px;font-size:15px;color:#ffd84d}
.bp-center{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:150px;height:150px;display:flex;align-items:center;justify-content:center}
.bp-bomb{width:150px;height:150px;animation:bp-wobble 1.1s ease-in-out infinite;filter:drop-shadow(0 10px 18px #000a)}
@keyframes bp-wobble{50%{transform:rotate(-4deg) scale(1.03)}}
.bp-spark{transform-origin:104px 10px;animation:bp-spark .25s linear infinite alternate}
@keyframes bp-spark{to{transform:scale(1.35) rotate(20deg);opacity:.7}}
.bp-syl{position:absolute;left:50%;top:58%;transform:translate(-55%,-50%);font-size:34px;font-weight:900;letter-spacing:2px;color:#fff;text-shadow:0 2px 0 #000,0 0 14px #ff9f43}
.bp-arrow{position:absolute;left:50%;top:50%;width:0;height:0;transition:transform .45s cubic-bezier(.2,.9,.3,1.3)}
.bp-arrow::before{content:"";position:absolute;left:-10px;top:-110px;border:10px solid transparent;border-bottom:22px solid #ffd84d;filter:drop-shadow(0 0 6px #ffd84d)}
.bp-center.boom .bp-bomb{animation:bp-pop .5s forwards}
@keyframes bp-pop{to{transform:scale(1.6);opacity:0}}
.bp-kaboom{position:absolute;font-size:110px;animation:gx-burst 1.2s forwards}
.bp-last{text-align:center;font-size:14px;color:#d9d2ff}.bp-last u{text-decoration:none;color:#ffd84d}
.bp-ctl{display:flex;flex-direction:column;align-items:center;gap:10px;width:100%}
.bp-alpha{display:flex;flex-wrap:wrap;gap:3px;justify-content:center;max-width:520px}
.bp-alpha i{font-style:normal;font-size:12px;font-weight:900;width:20px;height:22px;display:flex;align-items:center;justify-content:center;border-radius:5px;background:#ffffff0d;color:#ffffff55}
.bp-alpha i.on{background:#3ddc84;color:#06301a}
/* ---- Typing Race ---- */
.tr-wrap{position:relative;width:min(820px,100%);display:flex;flex-direction:column;gap:14px;align-items:center}
.tr-lanes{width:100%;display:flex;flex-direction:column;gap:6px;padding:10px;border-radius:18px;background:repeating-linear-gradient(90deg,#ffffff06 0 40px,transparent 40px 80px),#140f38}
.tr-lane{display:grid;grid-template-columns:110px 1fr 110px;align-items:center;gap:10px}
.tr-nm{font-size:13px;font-weight:800;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.tr-road{position:relative;height:34px;border-radius:10px;background:#ffffff0a;border-bottom:2px dashed #ffffff22}
.tr-car{position:absolute;top:3px;width:46px;height:26px;transition:left .45s linear;filter:drop-shadow(0 3px 3px #0008)}
.tr-car svg{width:100%;height:100%}
.tr-flag{position:absolute;right:-6px;top:4px;font-style:normal;font-size:20px}
.tr-wpm{font-size:13px;text-align:right}
.tr-text{font-size:21px;line-height:1.7;font-weight:600;color:#a9a3c9;padding:16px 20px;border-radius:18px;background:#ffffff08;border:1px solid #ffffff14;max-width:100%;user-select:none;font-family:ui-monospace,SFMono-Regular,Menlo,monospace}
.tr-text .ok{color:#3ddc84}.tr-text .cur{background:#ffd84d;color:#1b1442;border-radius:3px}.tr-text .bad{background:#ff4d6d;color:#fff;border-radius:3px}
.tr-slot .gx-pin{text-transform:none;letter-spacing:0;font-family:ui-monospace,SFMono-Regular,Menlo,monospace}
.tr-count{position:absolute;left:50%;top:40%;transform:translate(-50%,-50%);font-size:120px;font-weight:900;color:#fff;text-shadow:0 0 30px #b05cff,0 8px 0 #0008;animation:gx-pop2 .5s;pointer-events:none;z-index:5}
/* ---- Minesweeper Battle ---- */
.ms-wrap{display:flex;gap:18px;align-items:flex-start;justify-content:center;width:100%;flex-wrap:wrap}
.ms-side{display:flex;flex-direction:column;gap:8px;min-width:200px;max-width:260px}
.ms-time{font-size:20px;font-weight:900}
.ms-p{display:grid;grid-template-columns:1fr auto;gap:2px 8px;font-size:13px;padding:6px 8px;border-radius:10px;background:#ffffff08}
.ms-p.me{outline:1px solid #ffd84d66}.ms-p .bar{grid-column:1/-1;height:6px}.ms-p small{color:#ff9f43}
.ms-board{position:relative;display:grid;gap:2px;padding:8px;border-radius:14px;background:#2a2166;width:min(calc(var(--w) * 32px),92vw)}
.ms-c{aspect-ratio:1;border-radius:4px;background:linear-gradient(160deg,#7c6bdb,#5a49c2);box-shadow:inset 0 -2px 0 #0003,inset 0 1px 0 #ffffff44;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:clamp(10px,1.6vw,16px);cursor:pointer;user-select:none}
.ms-c[data-act]:hover{filter:brightness(1.2)}
.ms-c.open{background:#16123d;box-shadow:inset 0 0 0 1px #ffffff0d;cursor:default}
.ms-c.boom{background:#ff4d6d}.ms-c.mine{background:#3a2a5a}.ms-c.flag{font-size:clamp(9px,1.4vw,15px)}
.n1{color:#4dd4ff}.n2{color:#3ddc84}.n3{color:#ff6b81}.n4{color:#b28bff}.n5{color:#ffb36b}.n6{color:#4de1c1}.n7{color:#fff}.n8{color:#aaa}
.ms-board.frozen .ms-c{filter:saturate(.3) brightness(.7)}
.ms-freeze{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;gap:8px;font-size:26px;font-weight:900;color:#bde4ff;background:#4dd4ff22;border-radius:14px;backdrop-filter:blur(2px)}
/* ---- Snake ---- */
.sn-wrap{display:flex;gap:16px;align-items:flex-start;justify-content:center;width:100%;flex-wrap:wrap}
.sn-stage{position:relative}
.sn-cv{display:block;width:min(792px,94vw);height:auto;border-radius:16px;box-shadow:0 0 0 3px #b05cff55,0 0 40px #7c4dff44,0 16px 40px #000a;touch-action:none}
.sn-side{display:flex;flex-direction:column;gap:10px;min-width:190px}
.sn-board{list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:5px}
.sn-board li{display:flex;align-items:center;gap:8px;padding:6px 10px;border-radius:10px;background:#ffffff08;font-size:14px}
.sn-board li i{width:14px;height:14px;border-radius:4px}.sn-board li span{flex:1}.sn-board li small{color:#ff9f43;font-size:11px}
.sn-board li.dead{opacity:.5}
.sn-pad{display:grid;grid-template-columns:repeat(3,52px);grid-template-rows:repeat(2,52px);gap:6px;justify-content:center}
.sn-pad button{border-radius:14px;background:#ffffff14;font-size:20px}
.sn-pad button:nth-child(1){grid-column:2}.sn-pad button:nth-child(2){grid-column:1;grid-row:2}.sn-pad button:nth-child(3){grid-column:3;grid-row:2}.sn-pad button:nth-child(4){grid-column:2;grid-row:2}
/* ---- Backgammon ---- */
.g-backgammon{width:100%}
.bg-info{display:flex;align-items:center;justify-content:center;gap:18px;font-size:14px;font-weight:800}
.bg-info>b{color:var(--mut);font-size:12px}
.bg-pips{text-align:center;font-size:12px;color:var(--mut);margin:2px 0 6px}
.bg-board{position:relative;width:min(860px,100%);margin:0 auto;padding:12px 64px 12px 12px;border-radius:20px;background:linear-gradient(160deg,#5c3a20,#3a2212);box-shadow:inset 0 0 0 6px #2a170b,0 20px 50px #000a;display:grid;grid-template-rows:1fr auto 1fr;gap:6px;aspect-ratio:1.55}
.bg-half{display:flex;gap:2px;background:#1f5a3a;border-radius:10px;padding:0 4px;min-height:0}
.bg-pt{position:relative;flex:1;display:flex;min-width:0;cursor:default}
.bg-pt svg{position:absolute;inset:0;width:100%;height:100%}
.bg-pt svg path{fill:#e8c890}.bg-pt.odd svg path{fill:#b0422f}
.bg-pt.can{cursor:pointer}.bg-pt.can svg path{filter:brightness(1.15)}
.bg-pt.sel svg path{fill:#ffd84d}
.bg-pt.dst::after{content:"";position:absolute;left:50%;width:30%;aspect-ratio:1;transform:translateX(-50%);border-radius:50%;background:#ffd84d;box-shadow:0 0 14px #ffd84d;animation:gx-blink .8s infinite}
.bg-pt.bg-top.dst::after{bottom:6%}.bg-pt.bg-bot.dst::after{top:6%}
.bg-pt.dst{cursor:pointer}
.bg-stack{position:relative;z-index:1;width:100%;display:flex;flex-direction:column;align-items:center}
.bg-pt.bg-top .bg-stack{justify-content:flex-start}.bg-pt.bg-bot .bg-stack{justify-content:flex-end;flex-direction:column-reverse}
.bg-ck{width:86%;aspect-ratio:1;border-radius:50%;display:block;margin:-3% 0;box-shadow:inset 0 -3px 0 #0005,0 2px 4px #0008;flex:none}
.bg-ck.p0{background:radial-gradient(circle at 35% 30%,#fff,#e8e1ff 55%,#bfb6e0)}
.bg-ck.p1{background:radial-gradient(circle at 35% 30%,#7a6bb8,#2a1f5a 60%,#120d2e)}
.bg-ck.mini{width:12px;height:12px;display:inline-block;vertical-align:middle;margin:0}
.bg-pt.can .bg-stack .bg-ck:last-of-type,.bg-pt.sel .bg-ck:last-of-type{box-shadow:0 0 0 3px #ffd84d,0 0 12px #ffd84d}
.bg-n{position:absolute;font-size:12px;font-weight:900;color:#ffd84d;text-shadow:0 1px 2px #000}
.bg-pt.bg-top .bg-n{bottom:-14px}.bg-pt.bg-bot .bg-n{top:-14px}
.bg-bar{width:42px;flex:none;background:#3a2212;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;border-radius:6px;cursor:default}
.bg-bar.can{cursor:pointer;box-shadow:inset 0 0 0 2px #ffd84d}.bg-bar.sel{background:#6b4a1f}
.bg-bar .bg-ck{width:30px}
.bg-mid{display:flex;align-items:center;justify-content:center;gap:12px;min-height:58px}
.bg-dice{display:flex;gap:10px;align-items:center}
.bg-d.dface{width:46px;height:46px;border-radius:10px}
.bg-d.used{opacity:.3;transform:scale(.85)}
.bg-dbl{font-weight:900;color:#ffd84d}
.bg-off{position:absolute;right:10px;top:12px;bottom:12px;width:44px;display:flex;flex-direction:column;justify-content:space-between;border-radius:8px;background:#2a170b;padding:4px}
.bg-tray{flex:1;margin:2px 0;border-radius:6px;display:flex;align-items:center;justify-content:center;background:repeating-linear-gradient(0deg,#ffffff10 0 4px,transparent 4px 8px)}
.bg-tray b{font-size:16px;color:#ffd84d}.bg-tray.p0{border-left:4px solid #e8e1ff}.bg-tray.p1{border-left:4px solid #4a3a8f}
.bg-off.dst{box-shadow:0 0 0 3px #ffd84d,0 0 18px #ffd84d;cursor:pointer}
.bg-log{text-align:center;font-size:13px}
/* ---- Gin Rummy ---- */
.g-gin{width:100%}
.gn-opp{display:flex;justify-content:center;height:56px}
.gn-opp .card.back.mini{margin-left:-22px;transform:rotate(calc(var(--o) * 3deg)) translateY(calc(var(--o) * var(--o) * .6px))}
.gn-piles{display:flex;gap:26px;justify-content:center;align-items:flex-end}
.gn-piles>div{display:flex;flex-direction:column;align-items:center;gap:4px}
.gn-piles small{font-size:11px;color:var(--mut);font-weight:800}
.gn-piles .can .card{box-shadow:0 0 0 3px var(--gold),0 0 22px #ffc83d;cursor:pointer;animation:gx-nudge 1.4s infinite}
.gn-dw{text-align:center;font-size:14px}.gn-dw b{color:#ffd84d;font-size:18px}
.gn-hand{display:flex;flex-wrap:wrap;gap:12px;justify-content:center;align-items:flex-end}
.gn-meld,.gn-dead{display:flex;padding:6px 6px 6px 26px;border-radius:14px}
.gn-meld{background:#3ddc841a;border:1px solid #3ddc8455}.gn-dead{background:#ff4d6d12;border:1px dashed #ff4d6d44}
.gn-meld .card,.gn-dead .card{margin-left:-20px;cursor:pointer;transition:transform .15s}
.gn-hand .card:hover{transform:translateY(-8px)}
.gn-hand .card.sel{transform:translateY(-16px);box-shadow:0 0 0 3px var(--gold),0 8px 18px #000a}
.gn-hand .card.new{box-shadow:0 0 0 2px #4dd4ff}
.gn-show{width:min(720px,100%);margin:0 auto;padding:12px;border-radius:18px;background:#ffffff0a;border:1px solid #ffd84d55;text-align:center}
.gn-show h3{font-size:22px}.gn-sh{display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:center;margin-top:8px}
.gn-sh small{width:100%;font-weight:800;color:var(--mut)}
.gn-sh .gn-meld,.gn-sh .gn-dead{padding:4px 4px 4px 18px}.gn-sh .card{margin-left:-14px}
@media (max-width:760px){.tr-lane{grid-template-columns:70px 1fr 70px}.tr-text{font-size:16px}.bp-ring{aspect-ratio:1}.bg-board{padding-right:56px;aspect-ratio:1.2}.sn-side{width:100%}.ms-side{max-width:none;width:100%}}
`;
const GAMES_TS: string = String.raw`// GAM.IO plugin: Bomb Party, Typing Race, Minesweeper Battle, Snake Party, Backgammon, Gin Rummy (with bots).
// No template literals in this file: it is embedded in a String.raw block by the service that serves it.
export default async function register(api: any) {
  const shuffle: (a: any[]) => any[] = api.shuffle;
  const rnd = (a: any[]) => a[Math.floor(Math.random() * a.length)];
  const now = () => Date.now();
  const LV: Record<string, number> = { easy: 0, medium: 1, hard: 2 };
  const lv = (s: any, i: number) => (s.bots && s.bots[i] != null ? s.bots[i] : -1);

  // ---------- shared dictionary (same list Word Hunt uses) ----------
  let WORDS: string[] = [], DICT: Set<string> | null = null;
  (async () => {
    try {
      const t = await (await fetch("https://raw.githubusercontent.com/dwyl/english-words/master/words_alpha.txt")).text();
      WORDS = t.split(/\r?\n/).map((w) => w.trim().toUpperCase()).filter((w) => w.length >= 3 && w.length <= 14 && /^[A-Z]+$/.test(w));
      DICT = new Set(WORDS);
    } catch (e) { console.error("more: word list failed", e); }
  })();

  // ================= Bomb Party =================
  // Type a word containing the letters before the bomb goes off. Last player standing wins.
  const SYL = "AN ER IN ON AT EN OR ES TI TE AR AL LE RE ST ING ION ENT TER PER CON PRO COM ATE IST ACK OUT ART ORE EAR TRA INE ICE ANT IGH EST AND ACH OUN ABL OMP UST ULT OCK ITE ARD ILL OLD ASH IGHT".split(" ");
  const ALPHA = "ABCDEFGHIJKLMNOPRSTUVWY";
  const bombNext = (s: any) => { const n = s.lives.length; for (let k = 1; k <= n; k++) { const j = (s.cur + k) % n; if (s.lives[j] > 0) return j; } return s.cur; };
  function bombTurn(s: any, who: number) {
    s.cur = who; s.syl = rnd(SYL); s.typed = {}; s.phase = "play";
    s.fuse = now() + 7000 + Math.floor(Math.random() * 9000);
    const l = lv(s, who);
    s.botAt = l >= 0 ? now() + [5200, 3600, 2200][l] + Math.random() * 2500 : 0;
    s.deadline = s.botAt ? Math.min(s.botAt, s.fuse) : s.fuse;
  }
  function bombWord(s: any, w: string) {
    if (w.length < 3 || !/^[A-Z]+$/.test(w)) return "Words need at least 3 letters";
    if (!w.includes(s.syl)) return "It has to contain " + s.syl;
    if (s.used.includes(w)) return "Already used!";
    if (DICT && !DICT.has(w)) return w + " isn't in the dictionary";
    return "";
  }
  function bombAccept(s: any, seat: number, w: string) {
    s.used.push(w); s.last = { seat, w, syl: s.syl };
    for (const ch of w) if (!s.letters[seat].includes(ch) && ALPHA.includes(ch)) s.letters[seat] += ch;
    if (s.letters[seat].length >= ALPHA.length) { s.letters[seat] = ""; s.lives[seat] = Math.min(s.max + 1, s.lives[seat] + 1); s.log = "{" + seat + "} used every letter: +1 life!"; }
    else s.log = "{" + seat + "} played " + w;
    bombTurn(s, bombNext(s));
  }
  const bomb = {
    name: "Bomb Party", min: 2, max: 8,
    init(n: number, o: any = {}) {
      const L = [2, 3, 4].includes(o.lives) ? o.lives : 3;
      const s: any = { lives: Array(n).fill(L), max: L, letters: Array(n).fill(""), used: [], cur: Math.floor(Math.random() * n), typed: {}, log: "", last: null, bots: o.bots || {}, boomAt: 0 };
      bombTurn(s, s.cur); return s;
    },
    turn: () => null,
    isTurn: (s: any, seat: number) => s.phase === "play" && s.cur === seat,
    live: (a: string) => (a === "type" ? "relay" : ""),
    view: (s: any, seat: number) => ({ lives: s.lives, max: s.max, cur: s.cur, syl: s.syl, phase: s.phase, typed: s.typed, log: s.log, last: s.last, letters: seat >= 0 ? s.letters[seat] : "", alpha: ALPHA, fuse: s.fuse, now: now(), boom: s.boom || null, used: s.used.length }),
    move(s: any, seat: number, m: any) {
      if (s.phase !== "play") return { err: "Wait for the next turn" };
      if (m.action === "type") { if (seat === s.cur) s.typed[seat] = String(m.v || "").toUpperCase().replace(/[^A-Z]/g, "").slice(0, 20); return {}; }
      if (m.action === "word") {
        if (seat !== s.cur) return { err: "It's not your turn" };
        const w = String(m.w || "").toUpperCase().replace(/[^A-Z]/g, ""), e = bombWord(s, w);
        if (e) return { err: e };
        bombAccept(s, seat, w); return {};
      }
      return { err: "Bad move" };
    },
    tick(s: any) {
      if (s.phase === "boom") { // after the explosion: next player, or game over
        const alive = s.lives.map((l: number, i: number) => (l > 0 ? i : -1)).filter((i: number) => i >= 0);
        if (alive.length <= 1) { s.phase = "done"; s.deadline = 0; return { done: true, winner: alive[0] ?? null }; }
        bombTurn(s, bombNext(s)); return {};
      }
      if (s.botAt && now() >= s.botAt - 30 && now() < s.fuse) { // a bot answers (or fumbles)
        const l = lv(s, s.cur); s.botAt = 0;
        const miss = [0.35, 0.15, 0.05][l] ?? 0.2;
        if (WORDS.length && Math.random() > miss) {
          const pool = WORDS.filter((w) => w.includes(s.syl) && w.length <= [7, 9, 12][l] && !s.used.includes(w));
          if (pool.length) { const w = l === 2 ? pool.filter((x) => new Set(x).size > 5)[0] || rnd(pool) : rnd(pool.slice(0, 4000)); bombAccept(s, s.cur, w); return {}; }
        }
        s.deadline = s.fuse; return {};
      }
      // the bomb goes off
      s.lives[s.cur] = Math.max(0, s.lives[s.cur] - 1); s.boom = { seat: s.cur, syl: s.syl, at: now() };
      s.log = "💥 {" + s.cur + "} lost a life on " + s.syl; s.phase = "boom"; s.deadline = now() + 1800; return {};
    },
  };

  // ================= Typing Race =================
  const TEXTS = [
    "The quick brown fox jumps over the lazy dog while the moon rises slowly above the quiet hills.",
    "Every great game night starts with snacks, a full voice call and at least one friend who never reads the rules.",
    "She packed her bag, grabbed the map and walked out into the rain without looking back once.",
    "Practice does not make perfect, but it does make you a lot faster than you were yesterday.",
    "A small robot rolled across the kitchen floor, beeping happily every time it found a crumb.",
    "Thunder rolled over the valley as the last train pulled into the empty station at midnight.",
    "If you can read this sentence quickly and without mistakes, you are probably winning this race.",
    "The library was silent except for the soft sound of pages turning and someone sneezing in the corner.",
    "Bright lights, loud music and a crowd that would not stop cheering until the final whistle blew.",
    "He forgot the password again, so he wrote it on a sticky note and hid it under the keyboard.",
    "Penguins cannot fly, but they swim faster than most fish and look great in formal wear.",
    "The best pizza in town is made by a tiny shop that only opens on rainy Tuesday evenings.",
    "Clouds drifted lazily across the sky, shaped like dragons, castles and one very confused giraffe.",
    "Never trust an atom, because they make up literally everything you can see around you.",
    "The team worked through the night, fixing bugs and drinking far too much coffee before launch day.",
    "A gentle breeze carried the smell of fresh bread from the bakery across the sleepy town square.",
    "Speed matters, but accuracy wins races; one typo can cost you more time than you think.",
    "The old lighthouse keeper told stories of ships, storms and treasure buried beneath the dunes.",
    "Quietly, the cat watched the bird from the windowsill, its tail flicking back and forth with interest.",
    "Galaxies far away spin slowly through the dark, each one holding billions of distant shining stars.",
  ];
  const WPM = [38, 62, 96];
  const typing = {
    name: "Typing Race", min: 1, max: 8,
    init(n: number, o: any = {}) {
      const k = o.len === "short" ? 1 : o.len === "long" ? 4 : 2;
      const text = shuffle(TEXTS.slice()).slice(0, k).join(" ");
      return { text, phase: "count", deadline: now() + 3500, start: now() + 3500, prog: Array(n).fill(0), err: Array(n).fill(0), fin: Array(n).fill(0), order: [], bots: o.bots || {}, end: 0, bwpm: Array.from({ length: n }, (_, i) => (lv({ bots: o.bots || {} }, i) >= 0 ? WPM[lv({ bots: o.bots || {} }, i)] * (0.85 + Math.random() * 0.3) : 0)) };
    },
    turn: () => null,
    live: (a: string) => (a === "prog" ? "relay" : ""),
    view: (s: any) => ({ text: s.text, phase: s.phase, start: s.start, now: now(), prog: s.prog, err: s.err, fin: s.fin, order: s.order, end: s.end }),
    move(s: any, seat: number, m: any) {
      if (s.phase !== "race") return { err: "Wait for the start" };
      if (s.fin[seat]) return {};
      if (m.action === "prog") {
        const n = Math.max(s.prog[seat], Math.min(s.text.length, Math.floor(+m.n || 0)));
        const maxChars = ((now() - s.start) / 60000) * 260 * 5 + 10; // nobody types 260 wpm
        if (n > maxChars) { s.prog[seat] = Math.max(s.prog[seat], Math.floor(maxChars)); return {}; } // too fast to be real: count only what is humanly possible, the client re-sends the rest
        s.prog[seat] = n; s.err[seat] = Math.max(0, Math.floor(+m.e || 0));
        if (n >= s.text.length) return typingFinish(s, seat);
        return {};
      }
      return { err: "Bad move" };
    },
    tick(s: any) {
      if (s.phase === "count") { s.phase = "race"; s.start = now(); s.end = now() + Math.max(45000, s.text.length * 600); s.deadline = now() + 400; return {}; }
      if (s.phase !== "race") return {};
      for (const k of Object.keys(s.bots)) {
        const i = +k; if (s.fin[i]) continue;
        const cps = (s.bwpm[i] * 5) / 60, n = Math.min(s.text.length, Math.round(cps * ((now() - s.start) / 1000) * (0.9 + Math.random() * 0.2)));
        s.prog[i] = Math.max(s.prog[i], n);
        if (s.prog[i] >= s.text.length) { const r = typingFinish(s, i); if (r.done) return r; }
      }
      if (now() >= s.end) return typingEnd(s);
      s.deadline = now() + 400; return {};
    },
  };
  function typingFinish(s: any, seat: number) {
    s.fin[seat] = now() - s.start; s.order.push(seat);
    if (s.order.length >= s.prog.length) return typingEnd(s);
    return {};
  }
  function typingEnd(s: any) {
    s.phase = "done"; s.deadline = 0;
    const best = s.order.length ? s.order[0] : s.prog.indexOf(Math.max(...s.prog));
    return { done: true, winner: best };
  }

  // ================= Minesweeper Battle =================
  const MSZ: Record<string, [number, number, number]> = { small: [9, 9, 10], medium: [16, 16, 40], large: [22, 16, 70] };
  function nbrs(w: number, h: number, i: number) { const x = i % w, y = Math.floor(i / w), out: number[] = []; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { if (!dx && !dy) continue; const X = x + dx, Y = y + dy; if (X >= 0 && Y >= 0 && X < w && Y < h) out.push(Y * w + X); } return out; }
  function flood(s: any, rev: number[], i: number) {
    const st = [i];
    while (st.length) { const c = st.pop()!; if (rev[c]) continue; rev[c] = 1; if (s.num[c] === 0) for (const n of nbrs(s.w, s.h, c)) if (!rev[n] && !s.mine[n]) st.push(n); }
  }
  const safeLeft = (s: any, p: number) => s.safe - s.rev[p].reduce((a: number, v: number) => a + (v === 1 ? 1 : 0), 0);
  const mines = {
    name: "Minesweeper Battle", min: 1, max: 6,
    init(n: number, o: any = {}) {
      const [w, h, k] = MSZ[o.size] || MSZ.medium, N = w * h;
      const start = Math.floor(h / 2) * w + Math.floor(w / 2), keep = new Set([start, ...nbrs(w, h, start)]);
      const cells = shuffle([...Array(N).keys()].filter((i) => !keep.has(i))).slice(0, k), mine = Array(N).fill(0);
      for (const c of cells) mine[c] = 1;
      const num = mine.map((m, i) => (m ? -1 : nbrs(w, h, i).filter((j) => mine[j]).length));
      const s: any = { w, h, k, mine, num, safe: N - k, rev: [], flag: [], pen: Array(n).fill(0), done: Array(n).fill(0), boom: Array(n).fill(0), order: [], start: now(), end: now() + 6 * 60000, bots: o.bots || {}, deadline: 0 };
      for (let p = 0; p < n; p++) { s.rev.push(Array(N).fill(0)); s.flag.push(Array(N).fill(0)); flood(s, s.rev[p], start); }
      s.deadline = now() + 700; return s;
    },
    turn: () => null,
    view(s: any, seat: number) {
      const me = seat >= 0 ? seat : 0, over = s.order.length >= s.rev.length || now() >= s.end;
      const cells = s.rev[me].map((r: number, i: number) => (r === 1 ? s.num[i] : r === 2 ? -2 : s.flag[me][i] ? -3 : over && s.mine[i] ? -4 : -1));
      return { w: s.w, h: s.h, k: s.k, cells, pen: s.pen[me], now: now(), end: s.end, left: s.rev.map((_: any, p: number) => safeLeft(s, p)), safe: s.safe, done: s.done, order: s.order, booms: s.boom, flags: s.flag[me].reduce((a: number, v: number) => a + v, 0) };
    },
    move(s: any, seat: number, m: any) {
      if (s.done[seat]) return { err: "You already cleared it!" };
      const i = Math.floor(+m.i), N = s.w * s.h;
      if (!(i >= 0 && i < N)) return { err: "Bad cell" };
      if (m.action === "flag") { if (!s.rev[seat][i]) s.flag[seat][i] = s.flag[seat][i] ? 0 : 1; return {}; }
      if (m.action !== "open") return { err: "Bad move" };
      if (now() < s.pen[seat]) return { err: "Frozen! Wait a moment" };
      if (s.flag[seat][i] || s.rev[seat][i]) return {};
      return minesOpen(s, seat, i);
    },
    tick(s: any) {
      if (now() >= s.end) return minesEnd(s);
      for (const k of Object.keys(s.bots)) {
        const p = +k, l = s.bots[k]; if (s.done[p] || now() < s.pen[p]) continue;
        if (Math.random() > [0.45, 0.7, 0.95][l]) continue; // thinking time
        const N = s.w * s.h, rev = s.rev[p];
        const frontier = [...Array(N).keys()].filter((i) => !rev[i] && nbrs(s.w, s.h, i).some((j) => rev[j] === 1));
        const pickFrom = frontier.length ? frontier : [...Array(N).keys()].filter((i) => !rev[i]);
        let cell = -1;
        if (Math.random() < [0.07, 0.03, 0.006][l]) cell = pickFrom.find((i) => s.mine[i]) ?? -1; // a slip
        if (cell < 0) { const safe = pickFrom.filter((i) => !s.mine[i]); if (safe.length) cell = rnd(safe); }
        if (cell >= 0) { const r = minesOpen(s, p, cell); if (r.done) return r; }
      }
      s.deadline = now() + 700; return {};
    },
  };
  function minesOpen(s: any, seat: number, i: number): any {
    if (s.mine[i]) { s.rev[seat][i] = 2; s.boom[seat]++; s.pen[seat] = now() + 5000; return {}; }
    flood(s, s.rev[seat], i);
    if (safeLeft(s, seat) <= 0) { s.done[seat] = now() - s.start; s.order.push(seat); if (s.order.length === 1 || s.order.length >= s.rev.length) return minesEnd(s); }
    return {};
  }
  function minesEnd(s: any) {
    s.deadline = 0; s.end = Math.min(s.end, now());
    let best = s.order.length ? s.order[0] : -1;
    if (best < 0) { let lo = 1e9; s.rev.forEach((_: any, p: number) => { const L = safeLeft(s, p); if (L < lo) { lo = L; best = p; } }); }
    return { done: true, winner: best };
  }

  // ================= Snake Party =================
  const SW = 36, SH = 24, STEP = 125, DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];
  const free = (s: any, occ: Set<number>) => { for (let t = 0; t < 200; t++) { const c = Math.floor(Math.random() * SW * SH); if (!occ.has(c)) return c; } return 0; };
  function snakeOcc(s: any) { const o = new Set<number>(); for (const sn of s.sn) if (sn.alive) for (const c of sn.body) o.add(c); return o; }
  function spawn(s: any, i: number) {
    const occ = snakeOcc(s);
    for (let t = 0; t < 100; t++) {
      const x = 4 + Math.floor(Math.random() * (SW - 8)), y = 4 + Math.floor(Math.random() * (SH - 8)), d = Math.floor(Math.random() * 4);
      const body = [0, 1, 2].map((k) => (y - DIRS[d][1] * k) * SW + (x - DIRS[d][0] * k));
      if (body.every((c) => !occ.has(c))) { s.sn[i] = { ...s.sn[i], body, dir: d, next: d, alive: true, grow: 0 }; return; }
    }
  }
  function snakeBot(s: any, i: number) {
    const sn = s.sn[i], l = s.bots[i], head = sn.body[0], occ = snakeOcc(s);
    const ok = (c: number, x: number, y: number) => x >= 0 && y >= 0 && x < SW && y < SH && !occ.has(c);
    const opts = [0, 1, 2, 3].filter((d) => d !== (sn.dir + 2) % 4).map((d) => { const x = (head % SW) + DIRS[d][0], y = Math.floor(head / SW) + DIRS[d][1]; return { d, x, y, c: y * SW + x }; }).filter((o) => ok(o.c, o.x, o.y));
    if (!opts.length) return;
    if (l === 0 && Math.random() < 0.25) { sn.next = rnd(opts).d; return; }
    // BFS from the head to the nearest food
    const prev = new Map<number, number>(), q = [head]; prev.set(head, -1); let goal = -1;
    const foods = new Set(s.food);
    while (q.length && goal < 0) { const c = q.shift()!; for (const d of [0, 1, 2, 3]) { const x = (c % SW) + DIRS[d][0], y = Math.floor(c / SW) + DIRS[d][1], n = y * SW + x; if (x < 0 || y < 0 || x >= SW || y >= SH || prev.has(n) || occ.has(n)) continue; prev.set(n, c); if (foods.has(n)) { goal = n; break; } q.push(n); } }
    let target = -1;
    if (goal >= 0) { let c = goal; while (prev.get(c) !== head && prev.get(c) !== -1 && prev.get(c) != null) c = prev.get(c)!; target = c; }
    const space = (c: number) => { const seen = new Set([c]), st = [c]; let n = 0; while (st.length && n < 60) { const x = st.pop()!; n++; for (const d of [0, 1, 2, 3]) { const X = (x % SW) + DIRS[d][0], Y = Math.floor(x / SW) + DIRS[d][1], m = Y * SW + X; if (X < 0 || Y < 0 || X >= SW || Y >= SH || seen.has(m) || occ.has(m)) continue; seen.add(m); st.push(m); } } return n; };
    let best = opts.find((o) => o.c === target);
    if (!best || (l === 2 && space(best.c) < 20)) best = opts.slice().sort((a, b) => space(b.c) - space(a.c))[0];
    sn.next = best.d;
  }
  const snake = {
    name: "Snake Party", min: 1, max: 8,
    init(n: number, o: any = {}) {
      const T = [60, 90, 120].includes(o.time) ? o.time : 90;
      const s: any = { sn: Array.from({ length: n }, () => ({ body: [], dir: 1, next: 1, alive: false, score: 0, kills: 0, grow: 0, respawn: 0 })), food: [], bots: o.bots || {}, phase: "count", start: now() + 3000, end: now() + 3000 + T * 1000, deadline: now() + 3000, w: SW, h: SH, tick: 0 };
      for (let i = 0; i < n; i++) spawn(s, i);
      const occ = snakeOcc(s); for (let k = 0; k < Math.max(4, n + 2); k++) { const c = free(s, occ); s.food.push(c); occ.add(c); }
      return s;
    },
    turn: () => null,
    live: (a: string) => (a === "dir" ? "quiet" : ""),
    view: (s: any) => ({ w: s.w, h: s.h, sn: s.sn.map((x: any) => ({ body: x.body, alive: x.alive, score: x.score, kills: x.kills, dir: x.dir })), food: s.food, phase: s.phase, start: s.start, end: s.end, now: now(), tick: s.tick }),
    move(s: any, seat: number, m: any) {
      if (m.action !== "dir") return { err: "Bad move" };
      const d = Math.floor(+m.d), sn = s.sn[seat];
      if (d >= 0 && d < 4 && sn && d !== (sn.dir + 2) % 4) sn.next = d;
      return {};
    },
    tick(s: any) {
      if (s.phase === "count") { s.phase = "run"; s.deadline = now() + STEP; return {}; }
      if (now() >= s.end) {
        s.phase = "done"; s.deadline = 0;
        const top = Math.max(...s.sn.map((x: any) => x.score)), ws = s.sn.map((x: any, i: number) => (x.score === top ? i : -1)).filter((i: number) => i >= 0);
        return { done: true, winner: ws.length === 1 ? ws[0] : null, winners: ws };
      }
      s.tick++;
      for (const k of Object.keys(s.bots)) { const sn = s.sn[+k]; if (sn.alive) snakeBot(s, +k); }
      for (let i = 0; i < s.sn.length; i++) { const sn = s.sn[i]; if (!sn.alive && sn.respawn && now() >= sn.respawn) { spawn(s, i); sn.respawn = 0; } }
      const heads: Record<number, number[]> = {}, dead = new Set<number>();
      s.sn.forEach((sn: any, i: number) => {
        if (!sn.alive) return;
        sn.dir = sn.next; const h = sn.body[0], x = (h % SW) + DIRS[sn.dir][0], y = Math.floor(h / SW) + DIRS[sn.dir][1];
        if (x < 0 || y < 0 || x >= SW || y >= SH) { dead.add(i); return; }
        const n = y * SW + x; sn.nh = n; (heads[n] = heads[n] || []).push(i);
      });
      const bodies = new Map<number, number>();
      s.sn.forEach((sn: any, i: number) => { if (sn.alive) sn.body.forEach((c: number, k: number) => { if (k < sn.body.length - 1 || sn.grow) bodies.set(c, i); }); });
      s.sn.forEach((sn: any, i: number) => {
        if (!sn.alive || dead.has(i)) return;
        if (heads[sn.nh].length > 1) { dead.add(i); return; }
        if (bodies.has(sn.nh)) { dead.add(i); const killer = bodies.get(sn.nh)!; if (killer !== i) { s.sn[killer].score += 5; s.sn[killer].kills++; } }
      });
      const occ = snakeOcc(s);
      s.sn.forEach((sn: any, i: number) => {
        if (!sn.alive) return;
        if (dead.has(i)) { sn.alive = false; sn.respawn = now() + 2500; sn.score = Math.max(0, sn.score - 3); for (const c of sn.body.filter((_: any, k: number) => k % 2 === 0).slice(0, 8)) if (!s.food.includes(c)) s.food.push(c); sn.body = []; return; }
        sn.body.unshift(sn.nh);
        const f = s.food.indexOf(sn.nh);
        if (f >= 0) { s.food.splice(f, 1); sn.score++; sn.grow += 1; }
        if (sn.grow > 0) sn.grow--; else sn.body.pop();
      });
      while (s.food.length < Math.max(4, s.sn.length + 2)) { const c = free(s, occ); if (!s.food.includes(c)) s.food.push(c); }
      s.deadline = now() + STEP; return {};
    },
  };

  // ================= Backgammon =================
  // board[i] > 0: player 0's checkers, < 0: player 1's. Player 0 moves 23 → 0, player 1 moves 0 → 23.
  // Moves work in each player's own "relative" numbering: 24 is the bar, 0-5 the home board, -1 borne off.
  const rel = (p: number, i: number) => (p === 0 ? i : 23 - i);
  const abs = rel; // the mapping is its own inverse
  const own = (s: any, p: number, i: number) => (p === 0 ? Math.max(0, s.b[i]) : Math.max(0, -s.b[i]));
  const opp = (s: any, p: number, i: number) => own(s, 1 - p, i);
  function bgCanStep(s: any, p: number, r: number, d: number) {
    if (s.bar[p] > 0 && r !== 24) return false;
    if (r === 24) { if (!s.bar[p]) return false; } else if (!own(s, p, abs(p, r))) return false;
    const t = r - d;
    if (t >= 0) return opp(s, p, abs(p, t)) < 2;
    // bearing off: everything must be home
    if (s.bar[p]) return false;
    for (let x = 6; x < 24; x++) if (own(s, p, abs(p, x))) return false;
    if (t === -1) return true;
    for (let x = r + 1; x < 6; x++) if (own(s, p, abs(p, x))) return false; // a higher checker must use it first
    return true;
  }
  function bgStep(s: any, p: number, r: number, d: number) {
    const sg = p === 0 ? 1 : -1, t = r - d;
    if (r === 24) s.bar[p]--; else s.b[abs(p, r)] -= sg;
    if (t < 0) { s.off[p]++; return { r, t: -1, hit: false }; }
    const ai = abs(p, t);
    let hit = false;
    if (opp(s, p, ai) === 1) { s.b[ai] = 0; s.bar[1 - p]++; hit = true; }
    s.b[ai] += sg; return { r, t, hit };
  }
  const bgClone = (s: any) => ({ b: s.b.slice(), bar: s.bar.slice(), off: s.off.slice() });
  // every legal way to play the dice: lists of [from, die] in relative numbering, all of maximal length
  function bgSeqs(s: any, p: number, dice: number[]) {
    let out: { seq: number[][]; st: any }[] = [], best = 0;
    const seen = new Set<string>();
    const rec = (st: any, left: number[], seq: number[][]) => {
      let moved = false;
      const tried = new Set<number>();
      for (let k = 0; k < left.length; k++) {
        const d = left[k]; if (tried.has(d)) continue; tried.add(d);
        const froms = st.bar[p] ? [24] : [...Array(24).keys()].filter((r) => own(st, p, abs(p, r)));
        for (const r of froms) {
          if (!bgCanStep(st, p, r, d)) continue;
          const n2 = bgClone(st); bgStep(n2, p, r, d); moved = true;
          rec(n2, left.slice(0, k).concat(left.slice(k + 1)), seq.concat([[r, d]]));
        }
      }
      if (!moved) {
        const key = seq.map((x) => x.join(":")).join("|");
        if (seen.has(key)) return; seen.add(key);
        if (seq.length > best) { best = seq.length; out = []; }
        if (seq.length === best) out.push({ seq, st });
      }
    };
    rec(bgClone(s), dice.slice(), []);
    if (best === 1 && dice.length === 2 && dice[0] !== dice[1]) { // if only one die can be used, it must be the higher one when possible
      const hi = Math.max(...dice), withHi = out.filter((o) => o.seq[0][1] === hi);
      if (withHi.length) out = withHi;
    }
    return out;
  }
  function pip(st: any, p: number) { let n = st.bar[p] * 25; for (let r = 0; r < 24; r++) n += own(st, p, abs(p, r)) * (r + 1); return n; }
  function bgEval(st: any, p: number, l: number) {
    const q = 1 - p;
    let v = (pip(st, q) - pip(st, p)) * 1.0 + st.off[p] * 6 + st.bar[q] * (l === 2 ? 14 : 10);
    for (let r = 0; r < 24; r++) {
      const c = own(st, p, abs(p, r));
      if (c >= 2) v += r < 6 ? 6 : r < 12 ? 3 : 1.5; // made points, especially at home
      if (c === 1) { // a blot: how many enemy checkers could hit it?
        let shots = st.bar[q] ? 2 : 0;
        for (let x = r + 1; x <= Math.min(23, r + 12); x++) if (own(st, q, abs(q, 23 - x))) shots++;
        v -= (l === 2 ? 2.5 : 1.5) * Math.min(6, shots) * (r < 12 ? 1.4 : 1);
      }
    }
    if (l === 2) { let run = 0, bestRun = 0; for (let r = 0; r < 12; r++) { if (own(st, p, abs(p, r)) >= 2) { run++; bestRun = Math.max(bestRun, run); } else run = 0; } v += bestRun * bestRun * 1.5; }
    return v;
  }
  function bgRoll(s: any) { const a = 1 + Math.floor(Math.random() * 6), b = 1 + Math.floor(Math.random() * 6); s.dice = [a, b]; s.left = a === b ? [a, a, a, a] : [a, b]; s.phase = "move"; s.moved = []; bgAuto(s); }
  function bgAuto(s: any) { // no legal move left → pass the turn
    if (s.phase !== "move") return;
    const seqs = bgSeqs(s, s.turn, s.left);
    if (!seqs.length || !seqs[0].seq.length) { s.log = (s.left.length === s.dice.length && !s.moved.length ? "{" + s.turn + "} can't move" : s.log); s.turn = 1 - s.turn; s.phase = "roll"; s.left = []; }
  }
  function bgNewGame(s: any) {
    s.b = Array(24).fill(0);
    const put = (p: number, r: number, n: number) => { s.b[abs(p, r)] += p === 0 ? n : -n; };
    for (const p of [0, 1]) { put(p, 23, 2); put(p, 12, 5); put(p, 7, 3); put(p, 5, 5); }
    s.bar = [0, 0]; s.off = [0, 0]; s.dice = []; s.left = []; s.moved = [];
    let a = 0, b = 0; while (a === b) { a = 1 + Math.floor(Math.random() * 6); b = 1 + Math.floor(Math.random() * 6); }
    s.turn = a > b ? 0 : 1; s.dice = [a, b]; s.left = [a, b]; s.phase = "move"; s.log = "Opening roll: " + a + " vs " + b; bgAuto(s);
  }
  const backgammon = {
    name: "Backgammon", min: 2, max: 2,
    init(_n: number, o: any = {}) { const s: any = { score: [0, 0], to: [1, 3, 5].includes(o.points) ? o.points : 1, log: "", game: 1, last: null }; bgNewGame(s); return s; },
    turn: (s: any) => (s.phase === "done" || s.phase === "between" ? null : s.turn),
    view(s: any, seat: number) {
      let moves: number[][] = [];
      const ck = s.phase + s.turn + s.b.join(",") + s.bar.join(",") + s.left.join(",");
      if (s._ck === ck && seat === s.turn) moves = s._cv;
      else if (seat === s.turn && s.phase === "move") { const seen = new Set<string>(); for (const o of bgSeqs(s, s.turn, s.left)) { const [r, d] = o.seq[0]; const t = r - d < 0 ? -1 : r - d; const key = r + ":" + t; if (!seen.has(key)) { seen.add(key); moves.push([r === 24 ? 24 : abs(s.turn, r), t < 0 ? -1 : abs(s.turn, t), d]); } } s._ck = ck; s._cv = moves; }
      return { b: s.b, bar: s.bar, off: s.off, dice: s.dice, left: s.left, phase: s.phase, turn: s.turn, moves, score: s.score, to: s.to, log: s.log, pips: [pip(s, 0), pip(s, 1)], last: s.last, deadline: s.deadline || 0, now: now() };
    },
    move(s: any, seat: number, m: any) {
      if (seat !== s.turn) return { err: "Not your turn" };
      if (m.action === "roll") { if (s.phase !== "roll") return { err: "Move your checkers first" }; bgRoll(s); s.log = "{" + seat + "} rolled " + s.dice.join("-"); return {}; }
      if (m.action !== "move" || s.phase !== "move") return { err: "Roll first" };
      // from/to arrive in absolute numbering (24 = bar, -1 = off); find the matching first step of a legal sequence
      const fromR = m.from === 24 ? 24 : rel(seat, Math.floor(+m.from)), seqs = bgSeqs(s, seat, s.left);
      const cand = seqs.map((o) => o.seq[0]).filter((x) => x[0] === fromR && (m.to === -1 ? x[0] - x[1] < 0 : x[0] - x[1] === rel(seat, Math.floor(+m.to))));
      if (!cand.length) return { err: "You can't move there" };
      const d = cand.sort((a, b) => a[1] - b[1])[0][1];
      const r = bgStep(s, seat, fromR, d); s.left.splice(s.left.indexOf(d), 1); s.moved.push([fromR, d]);
      s.last = { p: seat, from: m.from, to: m.to, hit: r.hit };
      if (s.off[seat] >= 15) { // game over: 1 point, 2 for a gammon, 3 for a backgammon
        const q = 1 - seat; let pts = 1;
        if (!s.off[q]) { pts = 2; let deep = s.bar[q] > 0; for (let x = 0; x < 6; x++) if (own(s, q, abs(seat, x))) deep = true; if (deep) pts = 3; }
        s.score[seat] += pts; s.log = "{" + seat + "} wins the game" + (pts === 3 ? " with a backgammon!" : pts === 2 ? " with a gammon!" : "") + " (+" + pts + ")";
        if (s.score[seat] >= s.to) { s.phase = "done"; return { done: true, winner: seat }; }
        s.phase = "between"; s.deadline = now() + 4000; return {};
      }
      if (!s.left.length) { s.turn = 1 - seat; s.phase = "roll"; return {}; }
      bgAuto(s); return {};
    },
    tick(s: any) { if (s.phase === "between") { s.game++; bgNewGame(s); s.deadline = 0; } return {}; },
    bot(s: any, seat: number, level: string) {
      if (s.phase === "roll") return { action: "roll" };
      const l = LV[level] ?? 1, seqs = bgSeqs(s, seat, s.left);
      if (!seqs.length || !seqs[0].seq.length) return null;
      let pick = rnd(seqs);
      if (l > 0) { let best = -1e9; for (const o of seqs) { const v = bgEval(o.st, seat, l) + (l === 1 ? Math.random() * 4 : 0); if (v > best) { best = v; pick = o; } } }
      const [r, d] = pick.seq[0], t = r - d;
      return { action: "move", from: r === 24 ? 24 : abs(seat, r), to: t < 0 ? -1 : abs(seat, t) };
    },
  };

  // ================= Gin Rummy =================
  const GR = "A23456789TJQK", gv = (c: string) => Math.min(10, GR.indexOf(c[0]) + 1), gi = (c: string) => GR.indexOf(c[0]);
  const ginDeck = () => shuffle("SHDC".split("").flatMap((su) => GR.split("").map((r) => r + su)));
  function allMelds(hand: string[]) {
    const out: string[][] = [];
    for (const r of GR) { const same = hand.filter((c) => c[0] === r); if (same.length >= 3) { out.push(same.slice()); if (same.length === 4) for (let i = 0; i < 4; i++) out.push(same.filter((_, k) => k !== i)); } }
    for (const su of "SHDC") {
      const cs = hand.filter((c) => c[1] === su).sort((a, b) => gi(a) - gi(b));
      for (let i = 0; i < cs.length; i++) for (let j = i + 2; j < cs.length; j++) {
        const run = cs.slice(i, j + 1); let ok = true;
        for (let k = 1; k < run.length; k++) if (gi(run[k]) !== gi(run[k - 1]) + 1) { ok = false; break; }
        if (ok) out.push(run);
      }
    }
    return out;
  }
  // the meld arrangement with the least deadwood
  function bestMelds(hand: string[]) {
    const ms = allMelds(hand); let best = { melds: [] as string[][], dead: hand.slice(), dw: hand.reduce((a, c) => a + gv(c), 0) };
    const rec = (i: number, used: Set<string>, chosen: string[][]) => {
      const dead = hand.filter((c) => !used.has(c)), dw = dead.reduce((a, c) => a + gv(c), 0);
      if (dw < best.dw) best = { melds: chosen.slice(), dead, dw };
      for (let k = i; k < ms.length; k++) { const m = ms[k]; if (m.some((c) => used.has(c))) continue; m.forEach((c) => used.add(c)); chosen.push(m); rec(k + 1, used, chosen); chosen.pop(); m.forEach((c) => used.delete(c)); }
    };
    rec(0, new Set(), []);
    return best;
  }
  function layOff(melds: string[][], dead: string[]) { // defender adds their deadwood to the knocker's melds where it fits
    const ms = melds.map((m) => m.slice()); let left = dead.slice(), changed = true;
    while (changed) {
      changed = false;
      for (const c of left.slice()) for (const m of ms) {
        const isSet = m.every((x) => x[0] === m[0][0]);
        let fits = false;
        if (isSet) fits = c[0] === m[0][0] && m.length < 4;
        else if (c[1] === m[0][1]) { const lo = Math.min(...m.map(gi)), hi = Math.max(...m.map(gi)); fits = gi(c) === lo - 1 || gi(c) === hi + 1; }
        if (fits) { m.push(c); left = left.filter((x) => x !== c); changed = true; break; }
      }
    }
    return left;
  }
  function ginDeal(s: any) {
    const d = ginDeck(); s.hands = [d.splice(0, 10), d.splice(0, 10)]; s.discard = [d.shift()]; s.stock = d;
    s.dealer = 1 - s.dealer; s.turn = 1 - s.dealer; s.phase = "draw"; s.show = null; s.seen = [[], []];
  }
  function ginResolve(s: any, knocker: number) {
    const def = 1 - knocker, K = bestMelds(s.hands[knocker]), D = bestMelds(s.hands[def]);
    const gin = K.dw === 0, defDead = gin ? D.dead : layOff(K.melds, D.dead), dDw = defDead.reduce((a, c) => a + gv(c), 0);
    let who = knocker, pts = 0, kind = "knock";
    if (gin) { pts = 25 + dDw; kind = "gin"; }
    else if (dDw <= K.dw) { who = def; pts = 25 + (K.dw - dDw); kind = "undercut"; }
    else pts = dDw - K.dw;
    s.score[who] += pts;
    s.show = { knocker, who, pts, kind, kMelds: K.melds, kDead: K.dead, dMelds: D.melds, dDead: defDead, kDw: K.dw, dDw };
    s.log = "{" + who + "} scores " + pts + (kind === "gin" ? " for gin!" : kind === "undercut" ? " with an undercut!" : "");
    s.phase = "show"; s.deadline = now() + 7000;
  }
  const gin = {
    name: "Gin Rummy", min: 2, max: 2,
    init(_n: number, o: any = {}) { const s: any = { score: [0, 0], target: o.target === 50 ? 50 : 100, dealer: 1, log: "", hand: 1 }; ginDeal(s); return s; },
    turn: (s: any) => (s.phase === "draw" || s.phase === "discard" ? s.turn : null),
    view(s: any, seat: number) {
      const me = seat >= 0 ? s.hands[seat] : null, bm = me ? bestMelds(me) : null;
      return { hand: me, melds: bm ? bm.melds : [], dw: bm ? bm.dw : 0, opp: s.show ? null : s.hands.map((h: string[]) => h.length), top: s.discard[s.discard.length - 1] || null, stock: s.stock.length, phase: s.phase, turn: s.turn, score: s.score, target: s.target, show: s.show, log: s.log, hands: s.show ? s.hands : null, drew: s.drew || null, deadline: s.deadline || 0, now: now() };
    },
    move(s: any, seat: number, m: any) {
      if (seat !== s.turn) return { err: "Not your turn" };
      const hand: string[] = s.hands[seat];
      if (s.phase === "draw") {
        if (m.action !== "draw") return { err: "Draw a card first" };
        if (m.from === "discard") { if (!s.discard.length) return { err: "The discard pile is empty" }; const c = s.discard.pop(); hand.push(c); s.drew = c; s.seen[seat].push(c); s.log = "{" + seat + "} took " + c; }
        else { if (s.stock.length <= 2) { s.log = "The stock ran out, so the hand is a draw"; s.phase = "show"; s.show = { kind: "void", pts: 0, who: -1 }; s.deadline = now() + 4000; return {}; } const c = s.stock.shift(); hand.push(c); s.drew = null; s.log = "{" + seat + "} drew from the stock"; }
        s.phase = "discard"; return {};
      }
      if (s.phase === "discard") {
        const c = m.card, i = hand.indexOf(c);
        if (i < 0) return { err: "You don't have that card" };
        if (m.action === "knock") {
          const rest = hand.filter((x) => x !== c), b = bestMelds(rest);
          if (b.dw > 10) return { err: "You need 10 or less deadwood to knock" };
          hand.splice(i, 1); s.discard.push(c); ginResolve(s, seat);
          if (Math.max(...s.score) >= s.target) { s.phase = "over"; return { done: true, winner: s.score[0] >= s.score[1] ? 0 : 1 }; }
          return {};
        }
        if (m.action !== "discard") return { err: "Discard a card" };
        if (s.drew === c) return { err: "You can't throw back the card you just took" };
        hand.splice(i, 1); s.discard.push(c); s.drew = null; s.turn = 1 - seat; s.phase = "draw"; s.log = "{" + seat + "} discarded " + c; return {};
      }
      return { err: "Wait for the next hand" };
    },
    tick(s: any) { if (s.phase === "show") { s.hand++; ginDeal(s); s.deadline = 0; } return {}; },
    bot(s: any, seat: number, level: string) {
      const l = LV[level] ?? 1, hand: string[] = s.hands[seat];
      if (s.phase === "draw") {
        const top = s.discard[s.discard.length - 1];
        if (top && l > 0) {
          const now0 = bestMelds(hand), with_ = bestMelds(hand.concat([top]));
          const inMeld = with_.melds.some((m) => m.includes(top));
          const drop = with_.dead.filter((x) => x !== top).sort((a, b) => gv(b) - gv(a))[0];
          const after = drop ? bestMelds(hand.concat([top]).filter((x) => x !== drop)).dw : with_.dw;
          if ((l === 2 && inMeld) || after < now0.dw - (l === 2 ? 0 : 2)) return { action: "draw", from: "discard" };
        }
        if (top && l === 0 && Math.random() < 0.3) return { action: "draw", from: "discard" };
        return { action: "draw", from: "stock" };
      }
      // choose the discard that leaves the least deadwood
      let best: any = null;
      for (const c of hand) {
        if (c === s.drew) continue;
        const b = bestMelds(hand.filter((x) => x !== c));
        let v = b.dw * 10 - gv(c);
        if (l === 2) { const theirs = s.seen[1 - seat]; if (theirs.some((x: string) => x[0] === c[0] || (x[1] === c[1] && Math.abs(gi(x) - gi(c)) <= 2))) v += 25; } // don't feed their melds
        if (l === 0) v += Math.random() * 60;
        if (!best || v < best.v) best = { c, v, dw: b.dw };
      }
      const knockAt = 10;
      if (best.dw <= knockAt && (l > 0 || Math.random() < 0.5)) return { action: "knock", card: best.c };
      return { action: "discard", card: best.c };
    },
  };

  return { bomb, typing, mines, snake, backgammon, gin };
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

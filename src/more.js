// ---------- GAM.IO: Bomb Party, Typing Race, Minesweeper Battle, Snake Party, Backgammon, Gin Rummy ----------
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

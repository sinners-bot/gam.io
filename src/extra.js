// ---------- Game Night UI plugin: 8-Ball Pool and Ludo ----------
(function () {
  var MINE = { pool: 1, ludo: 1 };
  GAMES = GAMES.filter(function (m) { return !MINE[m.id]; });
  GAMES.splice(3, 0,
    { id: "pool", name: "8-Ball Pool", cat: "Sports", players: "2 players", tag: "New", icon: "🎱" },
    { id: "ludo", name: "Ludo", cat: "Board", players: "2–4 players", tag: "New", icon: "🎯" });
  function nm(g, i) { return g.seats[i] ? esc(g.seats[i].name) + (g.seats[i].id === S.you ? " (you)" : "") : "?"; }
  function names(g, txt) { return esc(txt || "").replace(/\{(\d+)\}/g, function (_, i) { return "<b>" + nm(g, +i) + "</b>"; }); }
  function myTurn(g) { return g.phase === "playing" && g.seat >= 0 && g.turn === g.seat; }

  // ======================= Pool =======================
  var TW = 1000, TH = 500, BR = 13, M = 34;
  var POCK = [[0, 0], [500, -4], [1000, 0], [0, 500], [500, 504], [1000, 500]];
  var BCOL = ["#fff", "#f5c518", "#2f6bff", "#e8335a", "#7b3fe4", "#ff8a1f", "#1fa860", "#8a1f2d", "#111"];
  var aim = 0, locked = false, power = 60, anim = null, animShot = 0, lastG = null, hover = null;
  function ballColor(i) { return BCOL[i > 8 ? i - 8 : i]; }
  function vert() { return window.innerWidth < 640; }
  function poolView(g) {
    lastG = g;
    var st = g.state, mine = myTurn(g) && st.phase === "aim";
    if (st.replay && st.replay.shot > animShot) { animShot = st.replay.shot; anim = { frames: st.replay.frames, t0: performance.now() }; }
    if (!anim && st.shot > animShot) animShot = st.shot;
    var tag = function (i) {
      var gr = st.groups[i], t = st.target[i];
      return (gr ? '<span class="grp ' + gr + '">' + (gr === "solid" ? "● Solids " + st.left.solid : "◐ Stripes " + st.left.stripe) + "</span>" : '<span class="grp">Open table</span>') + (t === "eight" ? ' <span class="grp eight">🎱 on the 8</span>' : "");
    };
    var bar = '<div class="poolbar">' + [0, 1].map(function (i) {
      return '<div class="pp' + (g.turn === i && g.phase === "playing" ? " turn" : "") + '">' + avatar(g.seats[i], 36, COLORS[i]) + "<b>" + nm(g, i) + "</b>" + tag(i) + "</div>";
    }).join('<span class="vs">VS</span>') + "</div>";
    var hint = g.phase !== "playing" ? "" : st.phase === "rolling" ? "…" : mine ? (st.inHand ? "Ball in hand — tap the table to place the cue ball" + (st.kitchen ? " (behind the line)" : "") + ", then aim and shoot" : "Move to aim · click to lock · set power and shoot") : g.seat < 0 ? "Spectating" : "Waiting for " + nm(g, g.turn) + "…";
    var ctl = mine ? '<div class="poolctl"><button class="lvb" data-act="paim" data-d="-1">◀</button><button class="lvb" data-act="paim" data-d="1">▶</button><label>Power <input type="range" id="pool-pw" min="5" max="100" value="' + power + '"></label><button class="btn primary" data-act="pshoot">Shoot 🎱</button></div>' : "";
    return bar + '<div class="poolwrap"><canvas id="pool-cv" class="' + (vert() ? "vert" : "") + '" width="' + (vert() ? TH + 2 * M : TW + 2 * M) + '" height="' + (vert() ? TW + 2 * M : TH + 2 * M) + '"></canvas></div><p class="hint">' + hint + '</p><p class="pmsg">' + names(g, st.msg) + "</p>" + ctl;
  }
  function curBalls() {
    if (anim) {
      var fi = (performance.now() - anim.t0) / (1000 / 30), f = anim.frames, i = Math.floor(fi);
      if (i >= f.length - 1) { anim = null; render(); }
      else {
        var a = f[i], b = f[i + 1], k = fi - i, out = [];
        for (var j = 0; j < 16; j++) out.push(a[2 * j] < 0 ? null : b[2 * j] < 0 ? [a[2 * j], a[2 * j + 1]] : [a[2 * j] + (b[2 * j] - a[2 * j]) * k, a[2 * j + 1] + (b[2 * j + 1] - a[2 * j + 1]) * k]);
        return out;
      }
    }
    return lastG && lastG.state ? lastG.state.balls : [];
  }
  function rayHit(balls, cx, cy, a) {
    var dx = Math.cos(a), dy = Math.sin(a), best = null;
    for (var i = 1; i < 16; i++) {
      var p = balls[i]; if (!p) continue;
      var fx = p[0] - cx, fy = p[1] - cy, t = fx * dx + fy * dy; if (t <= 0) continue;
      var d2 = fx * fx + fy * fy - t * t, r2 = 4 * BR * BR; if (d2 > r2) continue;
      var th = t - Math.sqrt(r2 - d2); if (!best || th < best.t) best = { t: th, i: i };
    }
    var tw = Infinity;
    if (dx > 0) tw = Math.min(tw, (TW - BR - cx) / dx); if (dx < 0) tw = Math.min(tw, (BR - cx) / dx);
    if (dy > 0) tw = Math.min(tw, (TH - BR - cy) / dy); if (dy < 0) tw = Math.min(tw, (BR - cy) / dy);
    if (best && best.t < tw) return { x: cx + dx * best.t, y: cy + dy * best.t, ball: best.i };
    return { x: cx + dx * tw, y: cy + dy * tw, ball: -1 };
  }
  function drawBall(c, i, x, y, V) {
    c.save(); c.translate(x, y);
    c.beginPath(); c.arc(2, 3, BR, 0, 7); c.fillStyle = "rgba(0,0,0,.35)"; c.fill();
    c.beginPath(); c.arc(0, 0, BR, 0, 7); c.fillStyle = i > 8 ? "#fff" : ballColor(i); c.fill();
    if (i > 8) { c.save(); c.clip(); c.fillStyle = ballColor(i); c.fillRect(-BR, -BR * 0.55, 2 * BR, BR * 1.1); c.restore(); }
    if (i > 0) { c.beginPath(); c.arc(0, 0, BR * 0.5, 0, 7); c.fillStyle = "#fff"; c.fill(); c.save(); if (V) c.rotate(-Math.PI / 2); c.fillStyle = "#111"; c.font = "bold 10px Inter,sans-serif"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(String(i), 0, 0.5); c.restore(); }
    var gr = c.createRadialGradient(-4, -5, 1, 0, 0, BR); gr.addColorStop(0, "rgba(255,255,255,.55)"); gr.addColorStop(0.4, "rgba(255,255,255,0)"); gr.addColorStop(1, "rgba(0,0,0,.25)");
    c.beginPath(); c.arc(0, 0, BR, 0, 7); c.fillStyle = gr; c.fill();
    c.restore();
  }
  function drawPool() {
    requestAnimationFrame(drawPool);
    var cv = document.getElementById("pool-cv"); if (!cv || !lastG || !lastG.state) return;
    var c = cv.getContext("2d"), st = lastG.state, V = cv.width < cv.height;
    c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, cv.width, cv.height);
    if (V) { c.translate(cv.width, 0); c.rotate(Math.PI / 2); }
    var LW = TW + 2 * M, LH = TH + 2 * M;
    var wood = c.createLinearGradient(0, 0, 0, LH); wood.addColorStop(0, "#4b2a8a"); wood.addColorStop(1, "#2a1660");
    c.fillStyle = wood; c.beginPath(); c.roundRect(0, 0, LW, LH, 26); c.fill();
    c.translate(M, M);
    var felt = c.createRadialGradient(TW / 2, TH / 2, 60, TW / 2, TH / 2, TW * 0.6); felt.addColorStop(0, "#1f9e6a"); felt.addColorStop(1, "#11654a");
    c.fillStyle = felt; c.fillRect(-6, -6, TW + 12, TH + 12);
    c.strokeStyle = "rgba(255,255,255,.18)"; c.setLineDash([6, 8]); c.beginPath(); c.moveTo(250, 0); c.lineTo(250, TH); c.stroke(); c.setLineDash([]);
    c.fillStyle = "rgba(255,255,255,.25)"; c.beginPath(); c.arc(750, 250, 3, 0, 7); c.fill();
    POCK.forEach(function (p) { c.beginPath(); c.arc(p[0], p[1], 24, 0, 7); c.fillStyle = "#07040f"; c.fill(); c.strokeStyle = "#b05cff88"; c.lineWidth = 2; c.stroke(); });
    var balls = curBalls(), mine = myTurn(lastG) && st.phase === "aim" && !anim, cue = balls[0];
    if (mine && cue) {
      var h = rayHit(balls, cue[0], cue[1], aim);
      c.strokeStyle = "rgba(255,255,255,.7)"; c.lineWidth = 2; c.setLineDash([8, 6]); c.beginPath(); c.moveTo(cue[0], cue[1]); c.lineTo(h.x, h.y); c.stroke(); c.setLineDash([]);
      c.beginPath(); c.arc(h.x, h.y, BR, 0, 7); c.strokeStyle = "rgba(255,255,255,.8)"; c.stroke();
      if (h.ball > 0) { var b = balls[h.ball], nx = b[0] - h.x, ny = b[1] - h.y, L = Math.hypot(nx, ny) || 1; c.strokeStyle = ballColor(h.ball); c.lineWidth = 3; c.beginPath(); c.moveTo(b[0], b[1]); c.lineTo(b[0] + nx / L * 90, b[1] + ny / L * 90); c.stroke(); }
      var back = 18 + power * 0.9;
      c.save(); c.translate(cue[0], cue[1]); c.rotate(aim);
      var stick = c.createLinearGradient(-back - 300, 0, -back, 0); stick.addColorStop(0, "#3b2412"); stick.addColorStop(0.8, "#d9a066"); stick.addColorStop(1, "#f2e6d0");
      c.fillStyle = stick; c.fillRect(-back - 300, -4, 300, 8); c.fillStyle = "#4dd4ff"; c.fillRect(-back - 4, -4, 4, 8); c.restore();
    }
    if (mine && st.inHand && hover) { c.beginPath(); c.arc(hover[0], hover[1], BR, 0, 7); c.strokeStyle = "#ffd84d"; c.setLineDash([4, 4]); c.stroke(); c.setLineDash([]); }
    for (var i = 15; i >= 0; i--) if (balls[i]) drawBall(c, i, balls[i][0], balls[i][1], V);
  }
  requestAnimationFrame(drawPool);
  function tablePt(e) {
    var cv = document.getElementById("pool-cv"), r = cv.getBoundingClientRect(), k = cv.width / r.width;
    var p = e.touches ? e.touches[0] : e, sx = (p.clientX - r.left) * k, sy = (p.clientY - r.top) * k;
    if (cv.width < cv.height) return [sy - M, cv.width - sx - M];
    return [sx - M, sy - M];
  }
  function poolActive() { var g = S.game; return g && g.type === "pool" && g.state && myTurn(g) && g.state.phase === "aim" && !anim; }
  app.addEventListener("mousemove", function (e) {
    if (e.target.id !== "pool-cv" || !poolActive()) return;
    var p = tablePt(e), cue = S.game.state.balls[0];
    hover = p;
    if (!locked && cue && !S.game.state.inHand) aim = Math.atan2(p[1] - cue[1], p[0] - cue[0]);
    if (S.game.state.inHand && cue && !locked) aim = Math.atan2(p[1] - cue[1], p[0] - cue[0]);
  });
  app.addEventListener("click", function (e) {
    if (e.target.id !== "pool-cv" || !poolActive()) return;
    var p = tablePt(e), st = S.game.state, cue = st.balls[0];
    if (st.inHand && (!cue || Math.hypot(p[0] - cue[0], p[1] - cue[1]) > BR * 2.5)) { send({ t: "move", action: "place", x: Math.round(p[0]), y: Math.round(p[1]) }); locked = false; return; }
    if (cue) { aim = Math.atan2(p[1] - cue[1], p[0] - cue[0]); locked = !locked; }
  });
  app.addEventListener("input", function (e) { if (e.target.id === "pool-pw") power = +e.target.value; });
  app.addEventListener("click", function (e) {
    var el = e.target.closest("[data-act]"); if (!el) return;
    var a = el.getAttribute("data-act");
    if (a === "paim") { aim += Number(el.getAttribute("data-d")) * 0.004; locked = true; }
    else if (a === "pshoot" && poolActive()) { send({ t: "move", action: "shoot", angle: aim, power: power / 100 }); locked = false; }
    else if (a === "lroll") send({ t: "move", action: "roll" });
    else if (a === "lmove") send({ t: "move", action: "move", token: Number(el.getAttribute("data-k")) });
  });

  // ======================= Ludo =======================
  var LC = ["#ff4d6d", "#3ddc84", "#ffd84d", "#4d9dff"], LN = ["Red", "Green", "Yellow", "Blue"];
  var PATH = [];
  (function () {
    var seg = function (r0, c0, dr, dc, n) { for (var i = 0; i < n; i++) PATH.push([r0 + dr * i, c0 + dc * i]); };
    seg(6, 1, 0, 1, 5); seg(5, 6, -1, 0, 6); PATH.push([0, 7], [0, 8]); seg(1, 8, 1, 0, 5); seg(6, 9, 0, 1, 6); PATH.push([7, 14], [8, 14]);
    seg(8, 13, 0, -1, 5); seg(9, 8, 1, 0, 6); PATH.push([14, 7], [14, 6]); seg(13, 6, -1, 0, 5); seg(8, 5, 0, -1, 6); PATH.push([7, 0], [6, 0]);
  })();
  var HOME = [[[7, 1], [7, 2], [7, 3], [7, 4], [7, 5]], [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7]], [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9]], [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7]]];
  var GOAL = [[7, 6], [6, 7], [7, 8], [8, 7]], YARD0 = [[0, 0], [0, 9], [9, 9], [9, 0]], SPOTS = [[1, 1], [1, 4], [4, 1], [4, 4]];
  var SAFE = [0, 8, 13, 21, 26, 34, 39, 47];
  function cellOf(color, p, k) {
    if (p === -1) return [YARD0[color][0] + SPOTS[k][0], YARD0[color][1] + SPOTS[k][1]];
    if (p <= 50) return PATH[(color * 13 + p) % 52];
    if (p <= 55) return HOME[color][p - 51];
    return GOAL[color];
  }
  var BOARD = null;
  function boardCells() {
    if (BOARD) return BOARD;
    var cls = {}, key = function (r, c) { return r + "," + c; };
    PATH.forEach(function (rc, i) { cls[key(rc[0], rc[1])] = "tr" + (SAFE.indexOf(i) >= 0 ? (i % 13 === 0 ? " st c" + i / 13 : " star") : ""); });
    HOME.forEach(function (col, ci) { col.forEach(function (rc) { cls[key(rc[0], rc[1])] = "hm c" + ci; }); });
    var h = "";
    for (var r = 0; r < 15; r++) for (var c = 0; c < 15; c++) {
      var k = cls[key(r, c)], y = -1;
      for (var q = 0; q < 4; q++) if (r >= YARD0[q][0] && r < YARD0[q][0] + 6 && c >= YARD0[q][1] && c < YARD0[q][1] + 6) y = q;
      if (k) h += '<div class="lc ' + k + '" style="grid-area:' + (r + 1) + "/" + (c + 1) + '">' + (k.indexOf("star") >= 0 ? "★" : "") + "</div>";
      else if (y >= 0 && SPOTS.some(function (s) { return s[0] === r - YARD0[y][0] && s[1] === c - YARD0[y][1]; })) h += '<div class="lc spot c' + y + '" style="grid-area:' + (r + 1) + "/" + (c + 1) + '"></div>';
    }
    YARD0.forEach(function (o, q) { h = '<div class="yard c' + q + '" style="grid-area:' + (o[0] + 1) + "/" + (o[1] + 1) + "/span 6/span 6" + '"></div>' + h; });
    h += '<div class="lcenter" style="grid-area:7/7/span 3/span 3"></div>';
    return (BOARD = h);
  }
  var DOTS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
  function die(n, rolling) { var h = ""; for (var i = 0; i < 9; i++) h += "<i" + ((DOTS[n] || []).indexOf(i) >= 0 ? ' class="on"' : "") + "></i>"; return '<div class="ldie' + (rolling ? " roll" : "") + '">' + h + "</div>"; }
  var lastRolls = -1;
  function ludoView(g) {
    var st = g.state, mine = myTurn(g), movable = st.moves || [];
    var stack = {}, toks = "";
    st.tokens.forEach(function (ts, seat) {
      var color = st.colors[seat];
      ts.forEach(function (p, k) {
        var rc = cellOf(color, p, k), key = rc[0] + "," + rc[1], n = stack[key] = (stack[key] || 0) + 1;
        var off = n > 1 ? "transform:translate(" + ((n - 1) % 2 ? 7 : -7) + "px," + (n > 2 ? 7 : -7) + "px) scale(.8)" : "";
        var mv = mine && seat === g.seat && movable.indexOf(k) >= 0;
        var moved = st.last && st.last.seat === seat && st.last.k === k;
        toks += '<div class="tok c' + color + (mv ? " mv" : "") + (moved ? " moved" : "") + '" style="grid-area:' + (rc[0] + 1) + "/" + (rc[1] + 1) + ";" + off + '"' + (mv ? ' data-act="lmove" data-k="' + k + '"' : "") + "></div>";
      });
    });
    var rolling = st.rolls !== lastRolls; lastRolls = st.rolls;
    var side = g.seats.map(function (s, i) {
      var color = st.colors[i], home = st.tokens[i].filter(function (p) { return p === 56; }).length;
      return '<div class="lp' + (g.turn === i && g.phase === "playing" ? " turn" : "") + '"><span class="sw" style="background:' + LC[color] + '"></span>' + avatar(s, 30, LC[color]) + "<b>" + nm(g, i) + "</b><em>" + home + "/4 home</em></div>";
    }).join("");
    var hint = g.phase !== "playing" ? "" : mine ? (st.phase === "roll" ? "Your turn — roll the die" : "Pick a glowing token to move " + st.die) : g.seat < 0 ? "Spectating" : "Waiting for " + nm(g, g.turn) + "…";
    var rollBtn = mine && st.phase === "roll" ? '<button class="btn primary" data-act="lroll">🎲 Roll</button>' : "";
    return '<div class="ludo"><div class="lboard">' + boardCells() + toks + '</div><div class="lside">' + side + '<div class="ldiebox">' + (st.die ? die(st.die, rolling) : die(0)) + rollBtn + '</div><p class="hint">' + hint + '</p><p class="pmsg">' + names(g, st.log) + "</p><p class=\"muted small\">Roll a 6 to leave the yard. 6s, captures and getting home earn another roll. ★ and start squares are safe.</p></div></div>";
  }

  var V = { pool: poolView, ludo: ludoView };
  var baseScreen = gameScreen;
  gameScreen = function (g) {
    if (!MINE[g.type] || g.phase === "lobby" || !g.state) return baseScreen(g);
    var head = '<div class="ghead"><button class="ghost" data-act="leave">← ' + (g.seat >= 0 ? "Back" : "Games") + "</button><h2>" + art(g.type, true) + esc(g.name) + '</h2><div class="gr">' + (g.seat >= 0 && g.phase === "playing" && g.type === "pool" ? '<button class="ghost" data-act="resign">Resign</button>' : "") + "</div></div>";
    var over = "";
    if (g.phase === "over" && !anim) {
      var w = g.winners && g.winners[0], you = w === S.you, wn = g.seats.filter(function (x) { return x.id === w; })[0];
      over = '<div class="modal"><div class="box"><div class="big">' + (you ? "🏆" : g.type === "pool" ? "🎱" : "🎯") + "</div><h2>" + (you ? "You win!" : wn ? esc(wn.name) + " wins!" : "Game over") + "</h2>" + (g.seat >= 0 ? '<p class="xp">+' + (you ? 100 : 20) + " XP</p>" : "") +
        '<div class="actions">' + (g.seat >= 0 ? '<button class="btn primary" data-act="rematch">Play again</button>' : "") + '<button class="btn dark" data-act="back">Back to games</button></div></div></div>';
    }
    return head + '<div class="gbody g-' + g.type + '">' + V[g.type](g) + "</div>" + over;
  };
  // ---- idle-turn countdown (all turn-based games) ----
  var afkSkew = 0, innerScreen = gameScreen;
  gameScreen = function (g) {
    var h = innerScreen(g);
    if (!g || g.phase !== "playing" || !g.turnDeadline || g.afkSeat == null || g.afkSeat < 0) return h;
    if (g.now) afkSkew = g.now - Date.now();
    var mine = g.afkSeat === g.seat;
    return h + '<div class="afkbar' + (mine ? " mine" : "") + '" data-afk="' + g.turnDeadline + '" data-mine="' + (mine ? 1 : 0) + '" data-who="' + esc(g.seats[g.afkSeat] ? g.seats[g.afkSeat].name : "") + '"></div>';
  };
  function afkTick() {
    document.querySelectorAll("[data-afk]").forEach(function (el) {
      var left = Math.max(0, Math.ceil((+el.getAttribute("data-afk") - (Date.now() + afkSkew)) / 1000)), mine = el.getAttribute("data-mine") === "1";
      var show = left <= (mine ? 30 : 15);
      el.style.display = show ? "" : "none";
      if (show) el.textContent = mine ? "⏱ " + left + "s to make your move — then one is played for you" : "⏱ " + el.getAttribute("data-who") + " has " + left + "s";
      el.classList.toggle("urgent", left <= 10);
    });
  }
  setInterval(afkTick, 250);
  // ---- connection banner ----
  var baseStatus = status, banner = null;
  status = function (t) {
    baseStatus(t);
    if (/reconnect/i.test(t || "")) { if (!banner) { banner = document.createElement("div"); banner.className = "netbanner"; document.body.appendChild(banner); } banner.textContent = "📡 Connection lost — reconnecting…"; banner.style.display = ""; }
  };
  var baseRender2 = render;
  render = function () { if (banner) banner.style.display = "none"; baseRender2.apply(this, arguments); afkTick(); };
  var lastVert = vert();
  window.addEventListener("resize", function () { if (vert() !== lastVert) { lastVert = vert(); render(); } });

  var baseLobby = lobby;
  lobby = function (g) {
    var h = baseLobby(g);
    if (!MINE[g.type]) return h;
    var tips = { pool: "Classic 8-ball: pot all your solids or stripes, then sink the 8. Scratch or hit the wrong ball first and your opponent gets ball in hand.", ludo: "Race all four tokens home. Roll a 6 to leave the yard, land on rivals to send them back, and stay on ★ squares to be safe." };
    return h.replace(/<\/div>$/, '<p class="hint tip">💡 ' + tips[g.type] + "</p></div>");
  };
})();

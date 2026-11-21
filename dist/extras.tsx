// Game Night extras pack (8-Ball Pool, Ludo) — serves the games' browser code, styles and server-side game logic (a plugin the game server loads).
const JS: string = String.raw`// ---------- Game Night UI plugin: 8-Ball Pool and Ludo ----------
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
`;
const CSS: string = String.raw`/* ---------- Pool + Ludo ---------- */
.art-pool{background:radial-gradient(circle at 50% 55%,#1f9e6a88,transparent 60%),linear-gradient(135deg,#11654a,#2a1660)}
.art-ludo{background:conic-gradient(from 45deg,#ff4d6d66 0 25%,#3ddc8466 0 50%,#ffd84d66 0 75%,#4d9dff66 0),linear-gradient(135deg,#3b1d8f,#1d1456)}
.poolbar{display:flex;align-items:center;justify-content:center;gap:14px;flex-wrap:wrap;margin-bottom:10px}
.pp{display:flex;align-items:center;gap:8px;background:#ffffff0d;border:1px solid var(--line);border-radius:99px;padding:5px 14px 5px 5px;font-size:14px}
.pp.turn{box-shadow:0 0 0 2px var(--gold),0 0 16px #ffc83d88}.vs{font-weight:900;color:#cfc8ff}
.grp{font-size:11px;background:#ffffff14;border-radius:99px;padding:2px 9px;color:#cfc8ff}.grp.solid{background:#f5c51833;color:#ffe27a}.grp.stripe{background:#2f6bff33;color:#a9c4ff}.grp.eight{background:#000;color:#fff}
.poolwrap{max-width:980px;margin:0 auto}#pool-cv{width:100%;height:auto;display:block;border-radius:22px;box-shadow:0 14px 40px #0009,0 0 0 2px #b05cff44;cursor:crosshair;touch-action:manipulation}
.pmsg{text-align:center;color:#cfc8ff;font-size:13px;min-height:18px;margin:4px 0}
.poolctl{display:flex;gap:10px;justify-content:center;align-items:center;flex-wrap:wrap}.poolctl label{display:flex;gap:8px;align-items:center;font-weight:700;background:#ffffff0d;border-radius:99px;padding:6px 14px}
.poolctl input[type=range]{width:200px;accent-color:#ff4d8d}
.ludo{display:flex;gap:20px;justify-content:center;align-items:flex-start;flex-wrap:wrap}
.lboard{display:grid;grid-template-columns:repeat(15,1fr);grid-template-rows:repeat(15,1fr);width:min(540px,92vw);aspect-ratio:1;background:#f4f1ff;border-radius:16px;padding:6px;gap:2px;box-shadow:0 14px 40px #0009,0 0 0 4px #3b2a7a;position:relative}
.lc{background:#fff;border-radius:3px;display:flex;align-items:center;justify-content:center;font-size:12px;color:#b7a9e8;box-shadow:inset 0 0 0 1px #00000014}
.lc.c0,.yard.c0{background:#ff4d6d}.lc.c1,.yard.c1{background:#3ddc84}.lc.c2,.yard.c2{background:#ffd84d}.lc.c3,.yard.c3{background:#4d9dff}
.lc.st{box-shadow:inset 0 0 0 2px #fff}
.yard{border-radius:14px;opacity:.9;margin:2px}
.lc.spot{background:#ffffffd9;border-radius:50%;margin:3px;z-index:1;box-shadow:inset 0 2px 6px #0003}
.lcenter{background:conic-gradient(from 225deg,#ff4d6d 0 25%,#3ddc84 0 50%,#ffd84d 0 75%,#4d9dff 0);border-radius:6px;margin:1px}
.tok{z-index:3;border-radius:50%;margin:12%;border:3px solid #fff;box-shadow:0 3px 6px #0007;transition:transform .2s}
.tok.c0{background:radial-gradient(circle at 35% 30%,#ff9db0,#d81b47)}.tok.c1{background:radial-gradient(circle at 35% 30%,#a8f5c8,#16a35b)}.tok.c2{background:radial-gradient(circle at 35% 30%,#fff1a8,#d9a400)}.tok.c3{background:radial-gradient(circle at 35% 30%,#b3d4ff,#1c63d9)}
.tok.mv{cursor:pointer;animation:tokpulse .8s ease-in-out infinite;z-index:4}.tok.moved{box-shadow:0 0 0 3px #b05cff,0 3px 6px #0007}
@keyframes tokpulse{0%,100%{box-shadow:0 0 0 3px #fff,0 0 14px 4px #ffc83d}50%{box-shadow:0 0 0 3px #ffc83d,0 0 22px 8px #ffc83dcc}}
.lside{display:flex;flex-direction:column;gap:8px;min-width:230px;max-width:300px}
.lp{display:flex;align-items:center;gap:8px;background:#ffffff0d;border:1px solid var(--line);border-radius:14px;padding:6px 10px;font-size:14px}.lp.turn{box-shadow:0 0 0 2px var(--gold),0 0 14px #ffc83d88}
.lp .sw{width:10px;height:28px;border-radius:4px}.lp em{margin-left:auto;font-style:normal;font-size:12px;color:#cfc8ff}
.ldiebox{display:flex;align-items:center;justify-content:center;gap:14px;margin-top:8px}
.ldie{width:64px;height:64px;background:#fff;border-radius:14px;display:grid;grid-template-columns:repeat(3,1fr);padding:9px;gap:3px;box-shadow:0 6px 16px #0008,inset 0 -4px 0 #ddd}
.ldie i{border-radius:50%}.ldie i.on{background:#2b1665}.ldie.roll{animation:dieroll .5s ease-out}
@keyframes dieroll{0%{transform:rotate(-200deg) scale(.6)}70%{transform:rotate(15deg) scale(1.1)}100%{transform:none}}
.muted.small{font-size:12px}
/* ---- idle timer + connection banner ---- */
.afkbar{position:fixed;left:50%;bottom:22px;transform:translateX(-50%);z-index:60;background:#1b1140f2;border:1px solid var(--line);color:#ddd8ff;font-weight:700;font-size:13px;padding:8px 16px;border-radius:99px;box-shadow:0 8px 24px #0009;white-space:nowrap}
.afkbar.mine{border-color:var(--gold);color:#ffe27a}.afkbar.urgent{background:#5a1030f2;border-color:#ff4d8d;color:#fff;animation:afkp .8s ease-in-out infinite}
@keyframes afkp{50%{transform:translateX(-50%) scale(1.05)}}
.netbanner{position:fixed;top:0;left:0;right:0;z-index:80;background:#ff4d8d;color:#fff;text-align:center;font-weight:800;padding:8px;font-size:13px}
#pool-cv.vert{width:auto;max-width:100%;max-height:62vh;margin:0 auto}
/* ---- phones ---- */
@media (max-width:640px){
  .gbody{padding-bottom:96px}
  .afkbar{bottom:84px;font-size:12px;max-width:94vw;white-space:normal;text-align:center}
  .thand{flex-wrap:wrap;justify-content:center;row-gap:8px;padding:0 4px}
  .thand .card{width:46px;height:66px;border-radius:8px}.thand .card span{font-size:14px}.thand .card b{font-size:18px}
  .thand .card+.card{margin-left:-16px}
  .uhand .uc{width:52px;height:76px}.uhand .uc b{font-size:20px}.uhand .uc+.uc{margin-left:-14px}
  .t4{height:250px}.tc .card{transform:scale(.7)}
  .teams{gap:6px;margin-bottom:22px}.team{min-width:0;flex:1;padding:6px 10px}.team b{font-size:22px}
  .bids .lvb{min-width:38px;padding:6px 0}
  .pktable{border-radius:24px;padding:10px}.board{gap:4px}.board .card{width:46px;height:66px}
  .pseats{gap:6px}.ps{min-width:0;width:calc(50% - 6px)}
  .pkact .raise{width:100%;justify-content:center}.pkact input[type=range]{width:120px}
  .poolbar{gap:6px}.pp{font-size:12px}.poolctl input[type=range]{width:130px}
  .ludo{gap:12px}.lside{min-width:0;width:100%;max-width:none}
}
`;
const GAMES_TS: string = String.raw`// Game Night plugin: 8-Ball Pool and Ludo, with bots. Loaded by the game server at startup.
// No template literals in this file: it is embedded in a String.raw block by the service that serves it.
export default function register(api: any) {
  const shuffle: (a: any[]) => any[] = api.shuffle;
  const rnd = (a: any[]) => a[Math.floor(Math.random() * a.length)];
  const now = () => Date.now();

  // ======================= 8-Ball Pool =======================
  // Table 1000 x 500. Ball 0 = cue, 1-7 solids, 8 = eight, 9-15 stripes.
  const W = 1000, H = 500, R = 13, HEAD_X = 250, FOOT_X = 750;
  const POCKETS = [[0, 0, 30], [500, -6, 28], [1000, 0, 30], [0, 500, 30], [500, 506, 28], [1000, 500, 30]];
  const MAXV = 42, SUB = 4, FRAME_EVERY = 2, MAX_TICKS = 1100;
  const kind = (id: number) => (id === 0 ? "cue" : id === 8 ? "eight" : id < 8 ? "solid" : "stripe");
  function rack() {
    const b: any[] = Array.from({ length: 16 }, () => ({ x: 0, y: 0, in: false }));
    b[0] = { x: HEAD_X, y: H / 2, in: false };
    const rest = shuffle([1, 2, 3, 4, 5, 6, 7, 9, 10, 11, 12, 13, 14, 15]);
    // back corners: one solid and one stripe; 8 in the middle of row 3
    const solid = rest.find((i: number) => i < 8), stripe = rest.find((i: number) => i > 8);
    const others = rest.filter((i: number) => i !== solid && i !== stripe);
    const order: number[] = [];
    let k = 0;
    for (let r = 0; r < 5; r++) for (let i = 0; i <= r; i++) {
      if (r === 2 && i === 1) order.push(8);
      else if (r === 4 && i === 0) order.push(solid);
      else if (r === 4 && i === 4) order.push(stripe);
      else order.push(others[k++]);
    }
    let n = 0;
    for (let r = 0; r < 5; r++) for (let i = 0; i <= r; i++) {
      const id = order[n++];
      b[id] = { x: FOOT_X + r * (2 * R * 0.866 + 0.6), y: H / 2 + (i - r / 2) * (2 * R + 0.6), in: false };
    }
    return b;
  }
  // Runs one shot. Returns the replay frames, potted balls in order, and the first ball the cue touched.
  function simulate(balls0: any[], angle: number, power: number, record: boolean) {
    const b = balls0.map((p: any) => ({ x: p.x, y: p.y, in: p.in, vx: 0, vy: 0 }));
    const sp = Math.max(0.05, Math.min(1, power)) * MAXV;
    b[0].vx = Math.cos(angle) * sp; b[0].vy = Math.sin(angle) * sp;
    const frames: number[][] = [], potted: number[] = [];
    let first = -1, rails = 0;
    const snap = () => { const f: number[] = []; for (const p of b) { f.push(p.in ? -1 : Math.round(p.x), p.in ? -1 : Math.round(p.y)); } frames.push(f); };
    if (record) snap();
    for (let t = 0; t < MAX_TICKS; t++) {
      let moving = false;
      for (let s = 0; s < SUB; s++) {
        for (let i = 0; i < 16; i++) {
          const p = b[i]; if (p.in || (!p.vx && !p.vy)) continue;
          p.x += p.vx / SUB; p.y += p.vy / SUB;
          let gone = false;
          for (const [px, py, pr] of POCKETS) if ((p.x - px) ** 2 + (p.y - py) ** 2 < pr * pr) { p.in = true; p.vx = p.vy = 0; potted.push(i); gone = true; break; }
          if (gone) continue;
          if (p.x < R) { p.x = R; p.vx = -p.vx * 0.82; rails++; } else if (p.x > W - R) { p.x = W - R; p.vx = -p.vx * 0.82; rails++; }
          if (p.y < R) { p.y = R; p.vy = -p.vy * 0.82; rails++; } else if (p.y > H - R) { p.y = H - R; p.vy = -p.vy * 0.82; rails++; }
        }
        for (let i = 0; i < 16; i++) {
          const p = b[i]; if (p.in) continue;
          for (let j = i + 1; j < 16; j++) {
            const q = b[j]; if (q.in) continue;
            const dx = q.x - p.x, dy = q.y - p.y, d2 = dx * dx + dy * dy;
            if (d2 >= 4 * R * R || d2 === 0) continue;
            const d = Math.sqrt(d2), nx = dx / d, ny = dy / d, ov = (2 * R - d) / 2;
            p.x -= nx * ov; p.y -= ny * ov; q.x += nx * ov; q.y += ny * ov;
            const vn = (p.vx - q.vx) * nx + (p.vy - q.vy) * ny;
            if (vn > 0) {
              const e = vn * 0.97;
              p.vx -= e * nx; p.vy -= e * ny; q.vx += e * nx; q.vy += e * ny;
              if (first < 0 && (i === 0 || j === 0)) first = i === 0 ? j : i;
            }
          }
        }
      }
      for (const p of b) {
        if (p.in) continue;
        const v = Math.hypot(p.vx, p.vy);
        if (v < 0.06) { p.vx = p.vy = 0; continue; }
        const nv = Math.max(0, v * 0.987 - 0.012);
        p.vx *= nv / v; p.vy *= nv / v; moving = true;
      }
      if (record && t % FRAME_EVERY === 0) snap();
      if (!moving) break;
    }
    if (record) snap();
    return { balls: b.map((p) => ({ x: p.x, y: p.y, in: p.in })), frames, potted, first, rails };
  }
  const freeSpot = (balls: any[], x: number, y: number, skip = 0) => x >= R && x <= W - R && y >= R && y <= H - R && balls.every((p: any, i: number) => i === skip || p.in || (p.x - x) ** 2 + (p.y - y) ** 2 >= 4 * R * R + 1);
  function placeNear(balls: any[], x: number, y: number, skip: number) {
    for (let r = 0; r < 400; r += 4) for (let a = 0; a < 16; a++) {
      const px = x + Math.cos(a * Math.PI / 8) * r, py = y + Math.sin(a * Math.PI / 8) * r;
      if (freeSpot(balls, px, py, skip)) return [px, py];
    }
    return [x, y];
  }
  const groupOf = (s: any, seat: number) => s.groups[seat];
  const remaining = (s: any, g: string) => s.balls.filter((p: any, i: number) => !p.in && kind(i) === g).length;
  const targetKind = (s: any, seat: number) => { const g = groupOf(s, seat); if (!g) return "open"; return remaining(s, g) ? g : "eight"; };
  const pool = {
    name: "8-Ball Pool", min: 2, max: 2,
    init() { return { balls: rack(), turn: 0, groups: [null, null], inHand: true, kitchen: true, broke: false, phase: "aim", shot: 0, replay: null, msg: "Break! Place the cue ball behind the line, then shoot.", deadline: 0 }; },
    turn: (s: any) => (s.phase === "aim" ? s.turn : null),
    view(s: any, seat: number) {
      return { balls: s.balls.map((p: any) => (p.in ? null : [Math.round(p.x * 10) / 10, Math.round(p.y * 10) / 10])), turn: s.turn, groups: s.groups, inHand: s.inHand, kitchen: s.kitchen, phase: s.phase, shot: s.shot,
        replay: s.phase === "rolling" ? s.replay : null, msg: s.msg, deadline: s.deadline, now: now(), target: [targetKind(s, 0), targetKind(s, 1)], left: { solid: remaining(s, "solid"), stripe: remaining(s, "stripe") }, me: seat };
    },
    move(s: any, seat: number, m: any) {
      if (s.phase !== "aim") return { err: "Wait for the balls to stop" };
      if (s.turn !== seat) return { err: "Not your turn" };
      if (m.action === "place") {
        if (!s.inHand) return { err: "You don't have ball in hand" };
        const x = Number(m.x), y = Number(m.y);
        if (!(x >= R && x <= W - R && y >= R && y <= H - R)) return { err: "Place it on the table" };
        if (s.kitchen && x > HEAD_X) return { err: "Place the cue ball behind the line for the break" };
        if (!freeSpot(s.balls, x, y)) return { err: "Too close to another ball" };
        s.balls[0] = { x, y, in: false }; return {};
      }
      if (m.action !== "shoot") return { err: "Bad move" };
      const angle = Number(m.angle), power = Number(m.power);
      if (!isFinite(angle) || !(power > 0 && power <= 1)) return { err: "Bad shot" };
      const before = targetKind(s, seat), opp = 1 - seat;
      const r = simulate(s.balls, angle, power, true);
      s.balls = r.balls; s.shot++;
      s.replay = { frames: r.frames, shot: s.shot, by: seat };
      s.phase = "rolling"; s.deadline = now() + Math.round((r.frames.length / 30) * 1000) + 600;
      const wasBreak = !s.broke; s.broke = true; s.kitchen = false; s.inHand = false;
      const potted = r.potted, scratch = potted.includes(0), eight = potted.includes(8);
      let foul = "";
      if (scratch) foul = "Scratch — the cue ball went in";
      else if (r.first < 0) foul = "No ball was hit";
      else if (before === "open" && r.first === 8 && !wasBreak) foul = "You can't hit the 8 first on an open table";
      else if (before !== "open" && kind(r.first) !== before) foul = "Wrong ball hit first";
      const names = potted.filter((i) => i !== 0);
      s.msg = names.length ? "Potted " + names.join(", ") + "." : "";
      if (eight) {
        if (wasBreak) { // re-spot the 8 on the break
          const [x, y] = placeNear(s.balls, FOOT_X, H / 2, 8); s.balls[8] = { x, y, in: false };
          s.msg += " The 8 is re-spotted.";
        } else {
          s.endRes = before === "eight" && !foul ? { winner: seat } : { winner: opp };
          s.msg = before === "eight" && !foul ? "{" + seat + "} sinks the 8 and wins!" : "{" + seat + "} " + (foul ? "fouled on the 8" : "sank the 8 too early") + " — {" + opp + "} wins!";
          return {};
        }
      }
      if (scratch) { s.balls[0] = { x: HEAD_X, y: H / 2, in: false }; const [x, y] = placeNear(s.balls, HEAD_X, H / 2, 0); s.balls[0] = { x, y, in: false }; }
      if (foul) { s.turn = opp; s.inHand = true; s.msg = (s.msg + " Foul: " + foul + ". {" + opp + "} has ball in hand.").trim(); return {}; }
      const legal = names.filter((i) => i !== 8);
      if (before === "open" && legal.length && !wasBreak) {
        const g = kind(legal[0]); s.groups[seat] = g; s.groups[opp] = g === "solid" ? "stripe" : "solid";
        s.msg += " {" + seat + "} is " + g + "s.";
        return {};
      }
      const own = before === "open" ? legal.length > 0 : legal.some((i) => kind(i) === before);
      if (!own) { s.turn = opp; s.msg = (s.msg + " {" + opp + "} to shoot.").trim(); }
      else s.msg += " Shoot again!";
      return {};
    },
    tick(s: any) {
      if (s.phase !== "rolling") return {};
      s.phase = "aim"; s.replay = null; s.deadline = 0;
      if (s.endRes) { s.phase = "done"; return { done: true, winner: s.endRes.winner }; }
      return {};
    },
    bot(s: any, seat: number, level: string) {
      const tk = targetKind(s, seat);
      const ok = (i: number) => !s.balls[i].in && i !== 0 && (tk === "open" ? i !== 8 : kind(i) === tk);
      const targets = [...Array(16).keys()].filter(ok);
      const noise = level === "easy" ? 0.05 : level === "medium" ? 0.02 : 0.009;
      // ball in hand: put the cue in a good spot for the easiest shot
      if (s.inHand) {
        let best: any = null;
        for (const t of targets) for (const [px, py] of POCKETS) {
          const bx = s.balls[t].x, by = s.balls[t].y, dl = Math.hypot(px - bx, py - by), ux = (px - bx) / dl, uy = (py - by) / dl;
          for (const back of [120, 200, 80]) {
            const cx = bx - ux * (2 * R + back), cy = by - uy * (2 * R + back);
            if (s.kitchen && cx > HEAD_X) continue;
            if (!freeSpot(s.balls, cx, cy, 0)) continue;
            const sc = -dl - back * 0.3;
            if (!best || sc > best.sc) best = { sc, cx, cy };
          }
        }
        let cx = best ? best.cx : HEAD_X, cy = best ? best.cy : H / 2;
        if (!freeSpot(s.balls, cx, cy, 0)) [cx, cy] = placeNear(s.balls, cx, cy, 0);
        if (s.kitchen) { cx = Math.min(cx, HEAD_X); if (!freeSpot(s.balls, cx, cy, 0)) [cx, cy] = [HEAD_X - 30, H / 2 + (Math.random() - 0.5) * 200]; }
        const valid = freeSpot(s.balls, cx, cy, 0) && !(s.kitchen && cx > HEAD_X);
        if (valid && Math.hypot(cx - s.balls[0].x, cy - s.balls[0].y) > 1) return { action: "place", x: cx, y: cy };
      }
      const cue = s.balls[0];
      if (!s.broke) return { action: "shoot", angle: Math.atan2(H / 2 - cue.y, FOOT_X - cue.x) + (Math.random() - 0.5) * 0.02, power: 1 };
      const blocked = (x1: number, y1: number, x2: number, y2: number, skip: number[]) => s.balls.some((p: any, i: number) => {
        if (p.in || skip.includes(i)) return false;
        const dx = x2 - x1, dy = y2 - y1, L = dx * dx + dy * dy, t = Math.max(0, Math.min(1, ((p.x - x1) * dx + (p.y - y1) * dy) / L));
        return (p.x - x1 - t * dx) ** 2 + (p.y - y1 - t * dy) ** 2 < (2 * R - 1) ** 2;
      });
      const cands: any[] = [];
      for (const t of targets) for (const [px, py] of POCKETS) {
        const bx = s.balls[t].x, by = s.balls[t].y, dl = Math.hypot(px - bx, py - by), ux = (px - bx) / dl, uy = (py - by) / dl;
        const gx = bx - ux * 2 * R, gy = by - uy * 2 * R, dc = Math.hypot(gx - cue.x, gy - cue.y);
        const ax = (gx - cue.x) / dc, ay = (gy - cue.y) / dc, cut = Math.acos(Math.max(-1, Math.min(1, ax * ux + ay * uy)));
        if (cut > 1.35) continue;
        if (blocked(cue.x, cue.y, gx, gy, [0, t]) || blocked(bx, by, px, py, [t])) continue;
        const power = Math.min(1, 0.25 + (dc + dl) / 1500 + cut * 0.25);
        cands.push({ angle: Math.atan2(ay, ax), power, sc: -(dc + dl * 1.2) - cut * 400, t });
      }
      cands.sort((a, b) => b.sc - a.sc);
      if (level === "hard" && cands.length && Math.random() < 0.8) { // verify by simulating, keep the first shot that pots our ball without fouling
        for (const c of cands.slice(0, 4)) for (const dp of [0, 0.12, -0.08]) {
          const r = simulate(s.balls, c.angle, Math.min(1, c.power + dp), false);
          const good = !r.potted.includes(0) && r.first >= 0 && (tk === "open" ? r.first !== 8 : kind(r.first) === tk) && r.potted.some((i) => i !== 8 && i !== 0 && (tk === "open" || kind(i) === tk || tk === "eight")) && (!r.potted.includes(8) || tk === "eight");
          const good8 = tk === "eight" && r.potted.includes(8) && !r.potted.includes(0) && r.first === 8;
          if (good || good8) return { action: "shoot", angle: c.angle + (Math.random() - 0.5) * noise, power: Math.min(1, c.power + dp) };
        }
      }
      if (cands.length && !(level === "easy" && Math.random() < 0.25)) {
        const c = level === "easy" ? rnd(cands.slice(0, 4)) : cands[0];
        return { action: "shoot", angle: c.angle + (Math.random() - 0.5) * noise * 2, power: c.power };
      }
      // no clean pot: hit the nearest legal ball softly
      const t = targets.sort((a, b) => Math.hypot(s.balls[a].x - cue.x, s.balls[a].y - cue.y) - Math.hypot(s.balls[b].x - cue.x, s.balls[b].y - cue.y))[0];
      if (t == null) return { action: "shoot", angle: Math.random() * 6.28, power: 0.4 };
      return { action: "shoot", angle: Math.atan2(s.balls[t].y - cue.y, s.balls[t].x - cue.x) + (Math.random() - 0.5) * noise, power: 0.45 };
    },
  };

  // ======================= Ludo =======================
  // Track squares 0-51 (global); a token's progress p: -1 yard, 0-50 on the track, 51-55 home column, 56 finished.
  const SAFE = [0, 8, 13, 21, 26, 34, 39, 47];
  const colorsFor = (n: number) => (n === 2 ? [0, 2] : n === 3 ? [0, 1, 2] : [0, 1, 2, 3]);
  const glob = (color: number, p: number) => (p >= 0 && p <= 50 ? (color * 13 + p) % 52 : -1);
  function ludoMoves(s: any, seat: number) {
    const d = s.die, out: number[] = [];
    s.tokens[seat].forEach((p: number, k: number) => {
      if (p === -1) { if (d === 6) out.push(k); }
      else if (p < 56 && p + d <= 56) out.push(k);
    });
    return out;
  }
  function ludoNext(s: any) { s.turn = (s.turn + 1) % s.tokens.length; s.sixes = 0; }
  function ludoTarget(s: any, seat: number, k: number) { const p = s.tokens[seat][k]; return p === -1 ? 0 : p + s.die; }
  const occupants = (s: any, g: number) => { const o: number[][] = []; s.tokens.forEach((ts: number[], seat: number) => ts.forEach((p, k) => { if (glob(s.colors[seat], p) === g) o.push([seat, k]); })); return o; };
  const ludo = {
    name: "Ludo", min: 2, max: 4,
    init(n: number) { return { colors: colorsFor(n), tokens: Array.from({ length: n }, () => [-1, -1, -1, -1]), turn: 0, die: 0, phase: "roll", sixes: 0, rolls: 0, log: "", last: null }; },
    turn: (s: any) => s.turn,
    view(s: any, seat: number) { return { ...s, moves: seat === s.turn && s.phase === "move" ? ludoMoves(s, seat) : [] }; },
    move(s: any, seat: number, m: any) {
      if (s.turn !== seat) return { err: "Not your turn" };
      if (m.action === "roll") {
        if (s.phase !== "roll") return { err: "Move a token first" };
        s.die = 1 + Math.floor(Math.random() * 6); s.rolls++; s.last = null;
        if (s.die === 6) s.sixes++;
        if (s.sixes === 3) { s.log = "{" + seat + "} rolled three 6s — turn over"; ludoNext(s); return {}; }
        if (!ludoMoves(s, seat).length) { s.log = "{" + seat + "} rolled " + s.die + " — no moves"; ludoNext(s); s.phase = "roll"; return {}; }
        s.phase = "move"; s.log = "{" + seat + "} rolled " + s.die; return {};
      }
      if (m.action === "move") {
        if (s.phase !== "move") return { err: "Roll first" };
        const k = Number(m.token);
        if (!ludoMoves(s, seat).includes(k)) return { err: "That token can't move" };
        const from = s.tokens[seat][k], to = ludoTarget(s, seat, k);
        s.tokens[seat][k] = to; s.last = { seat, k, from, to };
        let extra = s.die === 6, note = "";
        const g = glob(s.colors[seat], to);
        if (g >= 0 && !SAFE.includes(g)) {
          for (const [os, ok] of occupants(s, g)) if (os !== seat) { s.tokens[os][ok] = -1; extra = true; note = " and captured {" + os + "}!"; }
        }
        if (to === 56) { extra = true; note = " and got a token home!"; }
        s.log = "{" + seat + "} moved" + note;
        if (s.tokens[seat].every((p: number) => p === 56)) return { done: true, winner: seat };
        s.phase = "roll";
        if (!extra) ludoNext(s);
        return {};
      }
      return { err: "Bad move" };
    },
    bot(s: any, seat: number, level: string) {
      if (s.phase === "roll") return { action: "roll" };
      const ms = ludoMoves(s, seat);
      if (level === "easy" && Math.random() < 0.6) return { action: "move", token: rnd(ms) };
      const color = s.colors[seat];
      // squares opponents could reach next turn (within 6 behind on the track)
      const threat = (g: number) => s.tokens.some((ts: number[], os: number) => os !== seat && ts.some((p) => { const og = glob(s.colors[os], p); if (og < 0) return p === -1 && g === s.colors[os] * 13; const dist = (g - og + 52) % 52; return dist >= 1 && dist <= 6 && p + dist <= 50; }));
      let best = ms[0], bestV = -Infinity;
      for (const k of ms) {
        const from = s.tokens[seat][k], to = ludoTarget(s, seat, k), g = glob(color, to), gf = glob(color, from);
        let v = to * 0.5;
        if (to === 56) v += 80;
        if (from === -1) v += 45;
        if (g >= 0 && !SAFE.includes(g) && occupants(s, g).some(([os]) => os !== seat)) v += 100;
        if (g >= 0 && SAFE.includes(g)) v += 15;
        if (to > 50) v += 25;
        if (level === "hard") {
          if (gf >= 0 && !SAFE.includes(gf) && threat(gf)) v += 30 + from * 0.3;
          if (g >= 0 && !SAFE.includes(g) && threat(g)) v -= 40 + to * 0.4;
        } else v += Math.random() * 20;
        if (v > bestV) { bestV = v; best = k; }
      }
      return { action: "move", token: best };
    },
  };

  return { pool, ludo };
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

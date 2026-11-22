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
    return bar + '<div class="poolwrap"><canvas id="pool-cv" class="' + (vert() ? "vert" : "") + '" width="' + Q * (vert() ? TH + 2 * M : TW + 2 * M) + '" height="' + Q * (vert() ? TW + 2 * M : TH + 2 * M) + '"></canvas></div><p class="hint">' + hint + '</p><p class="pmsg">' + names(g, st.msg) + "</p>" + ctl;
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
  // ---- rendering: drawn at 2x for sharp edges, balls roll, pocketed balls sink ----
  var Q = 2, ROLL = {}, SINK = [], FELT = null;
  function feltTex() {
    if (FELT) return FELT;
    FELT = document.createElement("canvas"); FELT.width = 256; FELT.height = 256; var f = FELT.getContext("2d"), d = f.createImageData(256, 256);
    for (var k = 0; k < d.data.length; k += 4) { var v = Math.random() * 255; d.data[k] = d.data[k + 1] = d.data[k + 2] = v; d.data[k + 3] = 14; }
    f.putImageData(d, 0, 0); return FELT;
  }
  function rollOf(i, x, y) {
    var r = ROLL[i];
    if (!r) r = ROLL[i] = { x: x, y: y, ph: 0, dx: 1, dy: 0 };
    var mx = x - r.x, my = y - r.y, d = Math.hypot(mx, my);
    if (d > 0.01 && d < 200) { r.ph += d / BR; r.dx = mx / d; r.dy = my / d; }
    r.x = x; r.y = y; return r;
  }
  function drawBall(c, i, x, y, V, sc) {
    var r = rollOf(i, x, y), s = sc == null ? 1 : sc;
    c.save(); c.translate(x, y); c.scale(s, s);
    // contact shadow, cast away from the lamp over the table centre
    var sx = (x - TW / 2) / TW * 6, sy = (y - TH / 2) / TH * 6 + 3;
    var sh = c.createRadialGradient(sx, sy, 2, sx, sy, BR * 1.25); sh.addColorStop(0, "rgba(0,0,0,.5)"); sh.addColorStop(1, "rgba(0,0,0,0)");
    c.fillStyle = sh; c.beginPath(); c.arc(sx, sy, BR * 1.25, 0, 7); c.fill();
    c.beginPath(); c.arc(0, 0, BR, 0, 7); c.save(); c.clip();
    c.fillStyle = i > 8 ? "#f4f1e8" : ballColor(i); c.fillRect(-BR, -BR, 2 * BR, 2 * BR);
    var off = Math.sin(r.ph), front = Math.cos(r.ph), ox = r.dx * off * BR * 0.62, oy = r.dy * off * BR * 0.62;
    if (i > 8) { // the stripe band rolls with the ball
      c.save(); c.translate(ox * 0.5, oy * 0.5); c.rotate(Math.atan2(r.dy, r.dx) + Math.PI / 2); c.fillStyle = ballColor(i); c.fillRect(-BR * 2, -BR * 0.56, BR * 4, BR * 1.12); c.restore();
    }
    if (i > 0 && front > -0.5) { // the number spot travels over the ball and hides behind it
      var k = 0.45 + 0.55 * Math.max(0, front);
      c.save(); c.translate(ox, oy); c.scale(k, k);
      c.beginPath(); c.arc(0, 0, BR * 0.5, 0, 7); c.fillStyle = "#fff"; c.fill();
      if (V) c.rotate(-Math.PI / 2);
      c.fillStyle = "#15121f"; c.font = "800 10px Inter,system-ui,sans-serif"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(String(i), 0, 0.6);
      c.restore();
    } else if (i === 0) { c.beginPath(); c.arc(ox, oy, 2.2, 0, 7); c.fillStyle = "rgba(220,40,60,.55)"; c.fill(); }
    c.restore();
    // shading: soft core shadow plus a sharp specular from the lamp
    var gr = c.createRadialGradient(-BR * 0.35, -BR * 0.4, BR * 0.1, 0, 0, BR * 1.05);
    gr.addColorStop(0, "rgba(255,255,255,.35)"); gr.addColorStop(0.35, "rgba(255,255,255,0)"); gr.addColorStop(0.8, "rgba(0,0,0,.12)"); gr.addColorStop(1, "rgba(0,0,0,.45)");
    c.beginPath(); c.arc(0, 0, BR, 0, 7); c.fillStyle = gr; c.fill();
    c.beginPath(); c.ellipse(-BR * 0.38, -BR * 0.45, BR * 0.26, BR * 0.17, -0.6, 0, 7); c.fillStyle = "rgba(255,255,255,.9)"; c.fill();
    c.restore();
  }
  var prevBalls = null;
  function trackSinks(balls) {
    if (prevBalls && anim) for (var i = 0; i < 16; i++) if (prevBalls[i] && !balls[i]) {
      var p = prevBalls[i], best = POCK[0], bd = 1e9; POCK.forEach(function (q) { var d = Math.hypot(q[0] - p[0], q[1] - p[1]); if (d < bd) { bd = d; best = q; } });
      if (bd < 90) SINK.push({ i: i, x: p[0], y: p[1], px: best[0], py: best[1], t0: performance.now() });
    }
    prevBalls = balls.map(function (b) { return b ? [b[0], b[1]] : null; });
  }
  function drawRails(c, LW, LH) {
    // outer wooden rail
    var wood = c.createLinearGradient(0, 0, 0, LH); wood.addColorStop(0, "#7a4523"); wood.addColorStop(0.5, "#5a2f16"); wood.addColorStop(1, "#3d1d0c");
    c.fillStyle = wood; c.beginPath(); c.roundRect(0, 0, LW, LH, 28); c.fill();
    c.save(); c.beginPath(); c.roundRect(0, 0, LW, LH, 28); c.clip(); c.globalAlpha = 0.18; c.strokeStyle = "#1e0d04"; c.lineWidth = 1.2;
    for (var g = 0; g < 26; g++) { var yy = g * (LH / 26) + 3; c.beginPath(); c.moveTo(0, yy); for (var xx = 0; xx <= LW; xx += 40) c.lineTo(xx, yy + Math.sin(xx / 90 + g) * 3); c.stroke(); }
    c.restore();
    c.strokeStyle = "rgba(255,220,180,.35)"; c.lineWidth = 2; c.beginPath(); c.roundRect(2, 2, LW - 4, LH - 4, 27); c.stroke();
    // diamond sights
    c.fillStyle = "#f3e3c0";
    for (var k = 1; k < 8; k++) { if (k === 4) continue; var dx = M + (TW * k) / 8; [M / 2, LH - M / 2].forEach(function (yy) { c.save(); c.translate(dx, yy); c.rotate(Math.PI / 4); c.fillRect(-3, -3, 6, 6); c.restore(); }); }
    for (var k2 = 1; k2 < 4; k2++) { var dy = M + (TH * k2) / 4; [M / 2, LW - M / 2].forEach(function (xx) { c.save(); c.translate(xx, dy); c.rotate(Math.PI / 4); c.fillRect(-3, -3, 6, 6); c.restore(); }); }
  }
  function drawPool() {
    requestAnimationFrame(drawPool);
    var cv = document.getElementById("pool-cv"); if (!cv || !lastG || !lastG.state) return;
    var c = cv.getContext("2d"), st = lastG.state, V = cv.width < cv.height, LW = TW + 2 * M, LH = TH + 2 * M;
    c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, cv.width, cv.height); c.scale(Q, Q);
    if (V) { c.translate(LH, 0); c.rotate(Math.PI / 2); }
    drawRails(c, LW, LH);
    c.translate(M, M);
    // cushions and felt under a lamp
    c.fillStyle = "#0d5a3c"; c.beginPath(); c.roundRect(-10, -10, TW + 20, TH + 20, 8); c.fill();
    var felt = c.createRadialGradient(TW / 2, TH / 2, 40, TW / 2, TH / 2, TW * 0.62); felt.addColorStop(0, "#27b57a"); felt.addColorStop(0.6, "#178a5b"); felt.addColorStop(1, "#0e6343");
    c.fillStyle = felt; c.fillRect(0, 0, TW, TH);
    c.save(); c.globalCompositeOperation = "overlay"; c.fillStyle = c.createPattern(feltTex(), "repeat"); c.fillRect(0, 0, TW, TH); c.restore();
    var edge = c.createLinearGradient(0, 0, 0, 14); edge.addColorStop(0, "rgba(0,0,0,.35)"); edge.addColorStop(1, "rgba(0,0,0,0)"); c.fillStyle = edge; c.fillRect(0, 0, TW, 14);
    c.strokeStyle = "rgba(255,255,255,.2)"; c.setLineDash([6, 8]); c.beginPath(); c.moveTo(250, 0); c.lineTo(250, TH); c.stroke(); c.setLineDash([]);
    c.fillStyle = "rgba(255,255,255,.3)"; c.beginPath(); c.arc(750, 250, 3, 0, 7); c.fill();
    // pockets with brass liners
    POCK.forEach(function (p) {
      var br = c.createRadialGradient(p[0] - 6, p[1] - 6, 4, p[0], p[1], 30); br.addColorStop(0, "#ffe7a3"); br.addColorStop(0.6, "#c8902e"); br.addColorStop(1, "#6b4210");
      c.beginPath(); c.arc(p[0], p[1], 29, 0, 7); c.fillStyle = br; c.fill();
      var hole = c.createRadialGradient(p[0], p[1], 4, p[0], p[1], 24); hole.addColorStop(0, "#000"); hole.addColorStop(1, "#1a1208");
      c.beginPath(); c.arc(p[0], p[1], 23, 0, 7); c.fillStyle = hole; c.fill();
    });
    var balls = curBalls(), mine = myTurn(lastG) && st.phase === "aim" && !anim, cue = balls[0];
    trackSinks(balls);
    if (mine && cue) {
      var h = rayHit(balls, cue[0], cue[1], aim);
      c.save(); c.shadowColor = "#fff"; c.shadowBlur = 6; c.strokeStyle = "rgba(255,255,255,.85)"; c.lineWidth = 2; c.setLineDash([8, 6]); c.beginPath(); c.moveTo(cue[0], cue[1]); c.lineTo(h.x, h.y); c.stroke(); c.setLineDash([]);
      c.beginPath(); c.arc(h.x, h.y, BR, 0, 7); c.strokeStyle = "rgba(255,255,255,.9)"; c.stroke(); c.restore();
      if (h.ball > 0) { var b = balls[h.ball], nx = b[0] - h.x, ny = b[1] - h.y, Ln = Math.hypot(nx, ny) || 1; c.save(); c.strokeStyle = ballColor(h.ball); c.shadowColor = ballColor(h.ball); c.shadowBlur = 8; c.lineWidth = 3; c.beginPath(); c.moveTo(b[0], b[1]); c.lineTo(b[0] + nx / Ln * 90, b[1] + ny / Ln * 90); c.stroke(); c.restore(); }
    }
    if (mine && st.inHand && hover) { c.beginPath(); c.arc(hover[0], hover[1], BR, 0, 7); c.strokeStyle = "#ffd84d"; c.setLineDash([4, 4]); c.stroke(); c.setLineDash([]); }
    var now = performance.now();
    SINK = SINK.filter(function (k) { return now - k.t0 < 260; });
    SINK.forEach(function (k) { var t = (now - k.t0) / 260; drawBall(c, k.i, k.x + (k.px - k.x) * t, k.y + (k.py - k.y) * t, V, 1 - t * 0.7); });
    for (var i = 15; i >= 0; i--) if (balls[i]) drawBall(c, i, balls[i][0], balls[i][1], V);
    if (mine && cue) { // the cue, drawn over the balls with its own shadow
      var back = 20 + power * 0.9;
      c.save(); c.translate(cue[0], cue[1]); c.rotate(aim);
      c.fillStyle = "rgba(0,0,0,.28)"; c.beginPath(); c.moveTo(-back - 4, 4); c.lineTo(-back - 420, 10); c.lineTo(-back - 420, 0); c.closePath(); c.fill();
      var L0 = -back, L1 = -back - 420;
      var shaft = c.createLinearGradient(0, -6, 0, 6); shaft.addColorStop(0, "#f6e7c9"); shaft.addColorStop(0.5, "#e0b77c"); shaft.addColorStop(1, "#9c6a35");
      c.fillStyle = shaft; c.beginPath(); c.moveTo(L0, -2.6); c.lineTo(L1, -6.5); c.lineTo(L1, 6.5); c.lineTo(L0, 2.6); c.closePath(); c.fill();
      c.fillStyle = "#2a1408"; c.beginPath(); c.moveTo(L0 - 260, -4.9); c.lineTo(L1, -6.5); c.lineTo(L1, 6.5); c.lineTo(L0 - 260, 4.9); c.closePath(); c.fill(); // butt
      c.fillStyle = "#b05cff"; c.fillRect(L0 - 262, -5, 6, 10); c.fillRect(L0 - 300, -5.3, 3, 10.6); // inlay rings
      c.fillStyle = "#fffaf0"; c.fillRect(L0 - 10, -2.6, 10, 5.2); // ferrule
      c.fillStyle = "#4dd4ff"; c.fillRect(L0 - 1, -2.6, 3, 5.2); // tip chalk
      c.restore();
    }
  }
  requestAnimationFrame(drawPool);
  function tablePt(e) {
    var cv = document.getElementById("pool-cv"), r = cv.getBoundingClientRect(), k = cv.width / Q / r.width;
    var p = e.touches ? e.touches[0] : e, sx = (p.clientX - r.left) * k, sy = (p.clientY - r.top) * k;
    if (cv.width < cv.height) return [sy - M, cv.width / Q - sx - M];
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

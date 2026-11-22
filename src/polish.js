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
    return h;
  };

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

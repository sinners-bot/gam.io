// ---------- GAM.IO card motion: cards fly between hands, the table, piles and the trick winner ----------
// Cards are animated as fixed-position "ghost" copies flying between real screen rectangles,
// so the motion lands exactly even when the game view is zoomed to fit the window.
(function () {
  var layer = null;
  function L() { if (!layer || !layer.isConnected) { layer = document.createElement("div"); layer.id = "gx-cardfx"; document.documentElement.appendChild(layer); } return layer; }
  function R(el) { if (!el) return null; var r = el.getBoundingClientRect(); if (!r.width) return null; return { x: r.left, y: r.top, w: r.width, h: r.height, bw: el.offsetWidth || r.width, bh: el.offsetHeight || r.height }; }
  function centerOf(r, w, h) { return { x: r.x + r.w / 2 - w / 2, y: r.y + r.h / 2 - h / 2, w: w, h: h, bw: r.bw, bh: r.bh }; }
  var EASE = "cubic-bezier(.22,.8,.24,1)";
  // fly a copy of the card html from rect a to rect b; hide the target until it lands
  function ghost(html, a, b, o) {
    if (window.__gxCalm || !a || !b) return;
    o = o || {};
    var g = document.createElement("div"); g.className = "gx-ghost"; g.innerHTML = html;
    var bw = b.bw || b.w, bh = b.bh || b.h;
    g.style.cssText = "position:fixed;left:0;top:0;width:" + bw + "px;height:" + bh + "px;transform-origin:0 0;pointer-events:none;z-index:80";
    L().appendChild(g);
    var t = o.target;
    if (t) { t.getAnimations && t.getAnimations().forEach(function (an) { an.cancel(); }); t.style.visibility = "hidden"; }
    var s0 = a.w / bw, s1 = b.w / bw, r0 = o.rot || 0, r1 = o.endRot || 0, arc = o.arc == null ? 40 : o.arc;
    var kf = [
      { transform: "translate(" + a.x + "px," + a.y + "px) scale(" + s0 + ") rotate(" + r0 + "deg)", opacity: o.fadeIn ? 0 : 1 },
      { transform: "translate(" + (a.x + b.x) / 2 + "px," + ((a.y + b.y) / 2 - arc) + "px) scale(" + ((s0 + s1) / 2) * (o.lift || 1.08) + ") rotate(" + (r0 + r1) / 2 + "deg)", opacity: 1, offset: 0.5 },
      { transform: "translate(" + b.x + "px," + b.y + "px) scale(" + s1 + ") rotate(" + r1 + "deg)", opacity: o.fadeOut ? 0 : 1 },
    ];
    var an = g.animate(kf, { duration: o.dur || 480, delay: o.delay || 0, easing: EASE, fill: "both" });
    var done = function () { g.remove(); if (t) { t.style.visibility = ""; if (o.flip && t.animate) t.animate([{ transform: "perspective(600px) rotateY(90deg)" }, { transform: "none" }], { duration: 220, easing: "ease-out" }); else if (o.land !== false && t.animate) t.animate([{ transform: "scale(1.06)" }, { transform: "none" }], { duration: 160, easing: "ease-out" }); } if (o.done) o.done(); };
    an.onfinish = done; an.oncancel = done;
    if (o.sfx && window.__gxSfx) setTimeout(window.__gxSfx, (o.delay || 0) + (o.dur || 480) * 0.85);
  }
  // the engine fades out cards that left the screen; drop those copies when we fly the card somewhere instead
  function killExit(card) { document.querySelectorAll('.gx-exit[data-card="' + card + '"],.gx-exit [data-card="' + card + '"]').forEach(function (e) { (e.classList.contains("gx-exit") ? e : e.closest(".gx-exit")).remove(); }); }
  var BACK = '<div class="card back"></div>';
  function html(el) { var c = el.cloneNode(true); c.removeAttribute("data-fk"); c.style.visibility = ""; c.classList.remove("sel", "new", "play", "can"); return c.outerHTML; }
  // a soft card "snap" sound
  window.__gxSfx = function () {
    if (window.__gxMute) return;
    try {
      var A = window.__gxAC || (window.__gxAC = new (window.AudioContext || window.webkitAudioContext)()), n = A.sampleRate * 0.05, b = A.createBuffer(1, n, A.sampleRate), d = b.getChannelData(0);
      for (var i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3);
      var s = A.createBufferSource(), f = A.createBiquadFilter(), v = A.createGain(); s.buffer = b; f.type = "bandpass"; f.frequency.value = 2400; v.gain.value = 0.18 * (window.__gxVol == null ? 1 : window.__gxVol);
      s.connect(f); f.connect(v); v.connect(A.destination); s.start();
    } catch (e) {}
  };

  // ===================== Hearts / Spades =====================
  function snapTable(g) {
    var t = app.querySelector(".t4"); if (!t) return null;
    var seats = {}; ["s", "w", "n", "e"].forEach(function (k) { seats[k] = R(t.querySelector(".ts-" + k)); });
    var trick = [];
    t.querySelectorAll(".tmid .tc").forEach(function (tc) { var c = tc.querySelector(".card[data-card]"); if (c) trick.push({ card: c.getAttribute("data-card"), r: R(c), html: html(c), rel: (tc.className.match(/tc-(\w)/) || [])[1], win: tc.classList.contains("win") }); });
    var winRel = null; trick.forEach(function (x) { if (x.win) winRel = x.rel; });
    var hand = app.querySelectorAll(".thand .card[data-card]").length;
    return { seats: seats, trick: trick, winRel: winRel, hand: hand, mid: R(t.querySelector(".tmid")) || R(t), gid: g.id };
  }
  function animTable(p, g) {
    var t = app.querySelector(".t4"); if (!t || !p || p.gid !== g.id) return;
    var now = {}; t.querySelectorAll(".tmid .card[data-card]").forEach(function (c) { now[c.getAttribute("data-card")] = c; });
    var had = {}; p.trick.forEach(function (x) { had[x.card] = 1; });
    // opponents' cards fly in from their seat
    Object.keys(now).forEach(function (card) {
      if (had[card]) return;
      var el = now[card], rel = (el.closest(".tc").className.match(/tc-(\w)/) || [])[1];
      if (rel === "s") return; // my own card: the engine already slides it from my hand
      var to = R(el), from = p.seats[rel] || R(t.querySelector(".ts-" + rel)); if (!to || !from) return;
      ghost(html(el), centerOf(from, to.w * 0.55, to.h * 0.55), to, { target: el, rot: { w: -70, e: 70, n: 180, s: 0 }[rel] || 0, endRot: 0, dur: 460, arc: 26, sfx: 1 });
    });
    // a finished trick sweeps to whoever took it
    var gone = p.trick.filter(function (x) { return !now[x.card]; });
    if (gone.length && p.winRel) {
      var dest = R(t.querySelector(".ts-" + p.winRel)) || p.seats[p.winRel];
      gone.forEach(function (x, i) {
        killExit(x.card);
        if (!dest || !x.r) return;
        ghost(x.html, x.r, centerOf(dest, x.r.w * 0.38, x.r.h * 0.38), { delay: i * 70, dur: 520, arc: 18, fadeOut: true, rot: 0, endRot: { w: -90, e: 90, n: 0, s: 0 }[p.winRel] || 0, lift: 1 });
      });
    }
    // a new hand is dealt from the middle of the table
    var hand = app.querySelectorAll(".thand .card[data-card]");
    if (hand.length >= 8 && hand.length - p.hand >= 5) {
      var mid = p.mid || R(t);
      hand.forEach(function (el, i) { var to = R(el); if (!to || !mid) return; ghost(BACK, centerOf(mid, to.w * 0.7, to.h * 0.7), to, { target: el, flip: 1, delay: i * 55, dur: 420, arc: 60, rot: -25 + Math.random() * 50, sfx: i % 3 === 0 }); });
    }
  }

  // ===================== Gin Rummy =====================
  var GM = null; // the Gin state as it was last drawn (S.game is already the new state when render starts)
  function memoGin(g) { var st = g && g.state; GM = st && g.type === "gin" ? { gid: g.id, stock: st.stock, top: st.top, opp: st.opp ? st.opp[g.seat >= 0 ? 1 - g.seat : 1] : 0, phase: st.phase } : null; }
  function snapGin(g) {
    var st = GM; if (!st || st.gid !== g.id || !app.querySelector(".g-gin")) return null;
    var hand = {}; app.querySelectorAll(".gn-hand .card[data-card]").forEach(function (c) { hand[c.getAttribute("data-card")] = 1; });
    var top = app.querySelector(".gn-disc .card[data-card]");
    var backs = app.querySelectorAll(".gn-opp .card");
    return { gid: g.id, stock: st.stock, top: st.top, topR: R(top), topHtml: top ? html(top) : "", opp: st.opp, oppR: R(backs[backs.length - 1]) || R(app.querySelector(".gn-opp")), stockR: R(app.querySelector(".gn-stock .card")), hand: hand, n: Object.keys(hand).length, phase: st.phase };
  }
  function animGin(p, g) {
    var st = g.state; if (!p || p.gid !== g.id || !st || !app.querySelector(".g-gin")) return;
    var oppNow = st.opp ? st.opp[g.seat >= 0 ? 1 - g.seat : 1] : 0;
    var backs = app.querySelectorAll(".gn-opp .card"), oppR = R(backs[backs.length - 1]) || p.oppR, stockR = R(app.querySelector(".gn-stock .card")) || p.stockR;
    var handEls = app.querySelectorAll(".gn-hand .card[data-card]");
    // a fresh deal
    if (handEls.length >= 10 && (p.n === 0 || p.phase === "show")) {
      handEls.forEach(function (el, i) { var to = R(el); ghost(BACK, stockR, to, { target: el, flip: 1, delay: i * 60, dur: 420, arc: 50, sfx: i % 3 === 0 }); });
      backs.forEach(function (el, i) { var to = R(el); ghost(BACK, stockR, to, { target: el, delay: i * 60 + 30, dur: 420, arc: 30 }); });
      return;
    }
    // I drew from the stock
    handEls.forEach(function (el) { var c = el.getAttribute("data-card"); if (!p.hand[c] && c !== p.top && st.stock === p.stock - 1) ghost(html(el), stockR, R(el), { target: el, rot: -12, dur: 520, arc: 70, sfx: 1 }); });
    // the opponent drew
    if (oppNow === p.opp + 1 && oppR) {
      if (st.stock === p.stock - 1) ghost(BACK, stockR, oppR, { target: backs[backs.length - 1], dur: 480, arc: 40, sfx: 1 });
      else if (p.top && p.topR) { killExit(p.top); ghost(p.topHtml, p.topR, oppR, { target: backs[backs.length - 1], dur: 480, arc: 40, endRot: 180, sfx: 1 }); }
    }
    // the opponent discarded
    if (oppNow === p.opp - 1 && st.top && st.top !== p.top) {
      var topEl = app.querySelector(".gn-disc .card[data-card]");
      if (topEl && p.oppR) ghost(html(topEl), p.oppR, R(topEl), { target: topEl, rot: 160, endRot: 0, dur: 520, arc: 50, sfx: 1 });
    }
  }

  // ===================== wire into render =====================
  var baseRender = render;
  render = function () {
    var g = S.game, p = null, kind = null, fresh = false;
    try {
      if (g && g.state && g.phase !== "lobby") {
        if (g.type === "hearts" || g.type === "spades") { kind = "t"; p = snapTable(g); if (!p) fresh = true; }
        else if (g.type === "gin") { kind = "g"; p = snapGin(g); }
      }
    } catch (e) { p = null; }
    baseRender.apply(this, arguments);
    try {
      var g2 = S.game;
      if (kind === "t" && fresh && g2 && g2.state) { var tt = app.querySelector(".t4"); if (tt) animTable({ seats: {}, trick: [], winRel: null, hand: 0, mid: R(tt.querySelector(".tmid")) || R(tt), gid: g2.id }, g2); }
      if (p && g2 && g2.state) { if (kind === "t") animTable(p, g2); else animGin(p, g2); }
      if (kind === "g" || (g2 && g2.type === "gin")) { if (kind === "g" && !p && g2 && g2.state && app.querySelector(".g-gin") && (!GM || GM.gid !== g2.id)) animGin({ gid: g2.id, stock: 99, top: null, opp: 0, phase: "show", n: 0, hand: {}, stockR: null, oppR: null }, g2); memoGin(g2); }
    } catch (e) { console.error("cardfx", e); }
  };
})();

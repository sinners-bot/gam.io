// ---------- GAM.IO fit: the activity fills the window like an app, on any screen size (loads last) ----------
(function () {
  // 1) big screens: scale the whole interface up so it doesn't look like a small website in a huge window
  var lastZ = 0;
  function rootZoom() {
    var w = window.innerWidth, h = window.innerHeight, z = 1;
    if (w >= 1000) z = Math.max(1, Math.min(w / 1440, h / 860, 2.2));
    z = Math.round(z * 20) / 20;
    if (z !== lastZ) { lastZ = z; document.body.style.zoom = z === 1 ? "" : String(z); document.documentElement.style.setProperty("--uiz", z); }
  }
  // 2) in a game: zoom the board area so it fills the space between the header and the bottom of the window
  var NOFIT = { draw: 1, pool: 1 }; // these size their own canvas to the window already
  function fitGame() {
    var gb = app.querySelector(".shell.ingame .gbody"), g = S.game;
    if (!gb || !g) return;
    gb.style.zoom = "";
    if (g.phase === "lobby" || NOFIT[g.type]) return;
    var main = app.querySelector(".main"); if (!main) return;
    var mr = main.getBoundingClientRect(), r = gb.getBoundingClientRect();
    if (!r.width) return;
    var top = r.top, bottom = top, w0 = 0, kids = gb.children;
    for (var i = 0; i < kids.length; i++) {
      var k = kids[i], cr = k.getBoundingClientRect(), cs = getComputedStyle(k);
      if (cs.position === "fixed" || cs.position === "absolute" || !cr.height) continue;
      bottom = Math.max(bottom, cr.bottom + (parseFloat(cs.marginBottom) || 0));
      if (cr.width < r.width - 2) w0 = Math.max(w0, cr.width); // things that stretch to full width don't limit the zoom
    }
    if (!w0) w0 = r.width;
    var h0 = bottom - top, availH = mr.bottom - top - 10, availW = r.width;
    if (h0 < 20) return;
    var s = Math.max(0.35, Math.min(availW / w0, availH / h0, 1.9));
    if (Math.abs(s - 1) < 0.04) return;
    gb.style.zoom = String(Math.round(s * 100) / 100);
    // layouts can reflow at the new size (e.g. two boards fit side by side), so measure again and adjust
    for (var it = 0; it < 3; it++) {
      var m = measure(gb); if (!m) return;
      var r2 = gb.getBoundingClientRect(), k2 = Math.min(r2.width / (m.w || r2.width), (mr.bottom - r2.top - 10) / m.h);
      if (Math.abs(k2 - 1) < 0.03) return;
      s = Math.max(0.35, Math.min(s * k2, 1.9)); gb.style.zoom = String(Math.round(s * 100) / 100);
    }
  }
  function measure(gb) {
    var r = gb.getBoundingClientRect(), bottom = r.top, w0 = 0, kids = gb.children;
    for (var i = 0; i < kids.length; i++) {
      var k = kids[i], cr = k.getBoundingClientRect(), cs = getComputedStyle(k);
      if (cs.position === "fixed" || cs.position === "absolute" || !cr.height) continue;
      bottom = Math.max(bottom, cr.bottom);
      if (cr.width < r.width - 2) w0 = Math.max(w0, cr.width);
    }
    return bottom > r.top ? { h: bottom - r.top, w: w0 } : null;
  }
  var baseRender = render;
  render = function () {
    rootZoom();
    baseRender.apply(this, arguments);
    try { fitGame(); } catch (e) { console.error("fit", e); }
  };
  var rt = null;
  window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(function () { rootZoom(); render(); }, 120); });
  rootZoom();
  window.__fitGame = fitGame;
})();

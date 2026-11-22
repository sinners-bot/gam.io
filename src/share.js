// ---------- GAM.IO share cards: a picture of the result, shared to a Discord channel (or saved in a browser) ----------
(function () {
  var LOWER_BETTER = { hearts: 1 };
  function seatName(s) { return s ? String(s.name || "?") : "?"; }
  function scoresOf(g) {
    var st = g.state || {}, n = g.seats.length, arr = null;
    if (Array.isArray(st.scores) && st.scores.length === n) arr = st.scores;
    else if (Array.isArray(st.score) && st.score.length === n) arr = st.score;
    else if (Array.isArray(st.sn) && st.sn.length === n) arr = st.sn.map(function (x) { return x.score; });
    if (arr && arr.every(function (x) { return typeof x === "number"; })) return arr;
    return null;
  }
  function summary(g) {
    var ws = g.winners || (g.winner ? [g.winner] : []), sc = scoresOf(g), lower = LOWER_BETTER[g.type];
    var rows = g.seats.map(function (s, i) { return { i: i, name: seatName(s), bot: !!(s && s.bot), id: s && s.id, win: ws.indexOf(s && s.id) >= 0, score: sc ? sc[i] : null }; });
    rows.sort(function (a, b) { if (a.win !== b.win) return a.win ? -1 : 1; if (sc) return lower ? a.score - b.score : b.score - a.score; return 0; });
    var me = rows.filter(function (r) { return r.id === S.you; })[0], game = g.name || g.type;
    var others = rows.filter(function (r) { return r !== me; }), bots = others.filter(function (r) { return r.bot; }).length;
    var who = others.length === 1 ? others[0].name : bots === others.length ? others.length + " bots" : others.length + " players";
    var head, sub = "";
    if (me && me.win && ws.length === 1) head = me.name + " beat " + who + " at " + game;
    else if (me && me.win) head = me.name + " tied for the win at " + game;
    else if (!ws.length) head = "A draw at " + game + "!";
    else head = rows[0].name + " won " + game;
    if (me && sc) sub = me.score + (g.type === "hearts" ? " points (lowest wins)" : " points");
    return { head: head, sub: sub, rows: rows.slice(0, 6), hasScore: !!sc, me: me };
  }
  function img(src) { return new Promise(function (res) { var i = new Image(); i.onload = function () { res(i); }; i.onerror = function () { res(null); }; i.src = src; }); }
  function svgImg(svg) { if (!svg) return Promise.resolve(null); if (svg.indexOf("xmlns=") < 0) svg = svg.replace("<svg ", '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" '); return img("data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg)); }
  function rr(c, x, y, w, h, r) { c.beginPath(); c.roundRect(x, y, w, h, r); }
  var FONT = "Inter, 'Segoe UI', system-ui, sans-serif";
  function fit(c, text, max, size, weight) { var s = size; do { c.font = (weight || 900) + " " + s + "px " + FONT; s -= 2; } while (c.measureText(text).width > max && s > 18); return s + 2; }
  async function drawCard(g) {
    var W = 1200, H = 630, cv = document.createElement("canvas"); cv.width = W; cv.height = H; var c = cv.getContext("2d"), sm = summary(g);
    // background
    var bg = c.createLinearGradient(0, 0, W, H); bg.addColorStop(0, "#2a1670"); bg.addColorStop(0.55, "#1a0f4a"); bg.addColorStop(1, "#0e0830"); c.fillStyle = bg; c.fillRect(0, 0, W, H);
    var glow = c.createRadialGradient(300, 250, 20, 300, 250, 420); glow.addColorStop(0, "rgba(176,92,255,.45)"); glow.addColorStop(1, "rgba(176,92,255,0)"); c.fillStyle = glow; c.fillRect(0, 0, W, H);
    var glow2 = c.createRadialGradient(1050, 560, 10, 1050, 560, 380); glow2.addColorStop(0, "rgba(255,77,141,.3)"); glow2.addColorStop(1, "rgba(255,77,141,0)"); c.fillStyle = glow2; c.fillRect(0, 0, W, H);
    for (var k = 0; k < 90; k++) { c.fillStyle = "rgba(255,255,255," + (0.08 + Math.random() * 0.3) + ")"; c.beginPath(); c.arc(Math.random() * W, Math.random() * H, Math.random() * 1.6, 0, 7); c.fill(); }
    if (sm.me && sm.me.win) { c.save(); c.translate(300, 300); for (var r = 0; r < 24; r++) { c.rotate(Math.PI / 12); c.fillStyle = "rgba(255,216,77,.07)"; c.beginPath(); c.moveTo(0, 0); c.lineTo(520, -40); c.lineTo(520, 40); c.closePath(); c.fill(); } c.restore(); }
    // game logo on its tile
    var tile = (window.__gxTile && window.__gxTile[g.type]) || ["#4a3aa8", "#1d1452", "#b05cff"];
    c.save(); c.shadowColor = "rgba(0,0,0,.55)"; c.shadowBlur = 40; c.shadowOffsetY = 16;
    var tg = c.createLinearGradient(130, 120, 470, 460); tg.addColorStop(0, tile[0]); tg.addColorStop(1, tile[1]); c.fillStyle = tg; rr(c, 130, 130, 340, 340, 70); c.fill(); c.restore();
    c.strokeStyle = tile[2] || "#b05cff"; c.globalAlpha = 0.6; c.lineWidth = 4; rr(c, 132, 132, 336, 336, 68); c.stroke(); c.globalAlpha = 1;
    var gl = c.createLinearGradient(0, 130, 0, 300); gl.addColorStop(0, "rgba(255,255,255,.18)"); gl.addColorStop(1, "rgba(255,255,255,0)"); c.fillStyle = gl; rr(c, 130, 130, 340, 170, 70); c.fill();
    var gi = await svgImg(window.__gxLogo ? window.__gxLogo(g.type) : null); if (gi) c.drawImage(gi, 160, 160, 280, 280);
    if (sm.me && sm.me.win) { c.font = "120px " + FONT; c.textAlign = "center"; c.fillText("🏆", 455, 175); }
    // headline
    c.textAlign = "left"; c.fillStyle = "#fff"; var X = 540, MAXW = W - X - 60;
    c.font = "800 26px " + FONT; c.fillStyle = sm.me && sm.me.win ? "#ffd84d" : "#b9b0ff"; c.fillText(sm.me && sm.me.win ? "VICTORY" : (g.winners || []).length || g.winner ? "GAME OVER" : "DRAW", X, 150);
    var words = sm.head.split(" "), lines = [], cur = "";
    var size = 58; c.font = "900 " + size + "px " + FONT;
    words.forEach(function (w) { var t = cur ? cur + " " + w : w; if (c.measureText(t).width > MAXW && cur) { lines.push(cur); cur = w; } else cur = t; }); lines.push(cur);
    if (lines.length > 3) { size = 44; c.font = "900 " + size + "px " + FONT; lines = []; cur = ""; words.forEach(function (w) { var t = cur ? cur + " " + w : w; if (c.measureText(t).width > MAXW && cur) { lines.push(cur); cur = w; } else cur = t; }); lines.push(cur); lines = lines.slice(0, 3); }
    c.fillStyle = "#fff"; c.shadowColor = "rgba(0,0,0,.4)"; c.shadowBlur = 12; lines.forEach(function (l, i) { c.fillText(l, X, 212 + i * (size + 8)); }); c.shadowBlur = 0;
    var y = 212 + lines.length * (size + 8) + 4;
    if (sm.sub) { c.font = "700 28px " + FONT; c.fillStyle = "#ffd84d"; c.fillText(sm.sub, X, y); y += 22; }
    // standings
    y += 22; var medals = ["🥇", "🥈", "🥉"];
    sm.rows.slice(0, Math.min(sm.rows.length, y > 380 ? 3 : 4)).forEach(function (r, i) {
      var rowY = y + i * 50; c.fillStyle = r === sm.me ? "rgba(255,216,77,.16)" : "rgba(255,255,255,.07)"; rr(c, X, rowY, MAXW, 42, 14); c.fill();
      c.font = "26px " + FONT; c.fillText(r.win ? "🏆" : medals[i] || "·", X + 12, rowY + 31);
      var nm = r.name + (r.bot ? " 🤖" : ""); c.fillStyle = "#fff"; fit(c, nm, MAXW - 190, 24, 800); c.fillText(nm, X + 56, rowY + 30);
      if (r.score != null) { c.textAlign = "right"; c.font = "900 24px " + FONT; c.fillStyle = "#ffd84d"; c.fillText(String(r.score), X + MAXW - 16, rowY + 30); c.textAlign = "left"; }
    });
    // footer
    var brand = window.__gxBrand ? await img(window.__gxBrand) : null;
    c.fillStyle = "rgba(0,0,0,.25)"; c.fillRect(0, H - 74, W, 74);
    if (brand) c.drawImage(brand, 40, H - 62, 50, 50);
    c.font = "900 30px " + FONT; c.fillStyle = "#fff"; c.fillText("GAM.IO", brand ? 102 : 40, H - 26);
    c.font = "600 22px " + FONT; c.fillStyle = "#cfc8ff"; c.textAlign = "right"; c.fillText("Play free in your Discord call · Activities → GAM.IO", W - 40, H - 28); c.textAlign = "left";
    return cv;
  }
  function toast(t) { var n = document.createElement("div"); n.className = "gx-sharetoast"; n.textContent = t; document.documentElement.appendChild(n); setTimeout(function () { n.remove(); }, 3200); }
  function tokenOf() { try { return new URLSearchParams(String(wsUrl).split("?")[1]).get("token"); } catch (e) { return null; } }
  var busy = false;
  async function share(btn) {
    var g = S.game; if (!g || busy) return; busy = true; var label = btn.innerHTML; btn.innerHTML = "⏳ Making your card…"; btn.disabled = true;
    try {
      var cv = await drawCard(g), blob = await new Promise(function (r) { cv.toBlob(r, "image/png"); }), tok = tokenOf();
      if (typeof sdk !== "undefined" && sdk && sdk.commands && sdk.commands.openShareMomentDialog && tok) {
        var r = await fetch("/api/share", { method: "POST", headers: { Authorization: "Bearer " + tok, "Content-Type": "image/png" }, body: blob });
        var d = await r.json().catch(function () { return {}; });
        if (!d.url) throw new Error(d.error || "upload failed");
        await sdk.commands.openShareMomentDialog({ mediaUrl: d.url });
      } else {
        var file = new File([blob], "gamio-result.png", { type: "image/png" });
        if (navigator.canShare && navigator.canShare({ files: [file] })) await navigator.share({ files: [file], title: "GAM.IO" });
        else { var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "gamio-result.png"; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000); toast("Saved your result card"); }
      }
    } catch (e) {
      console.warn("share", e);
      toast(/not supported|unsupported|platform/i.test(String(e && e.message)) ? "Sharing works from Discord on a computer" : "Couldn't share right now");
    }
    btn.innerHTML = label; btn.disabled = false; busy = false;
  }
  window.__gxShareCard = drawCard;
  var baseRender = render;
  render = function () {
    baseRender.apply(this, arguments);
    try {
      var g = S.game; if (!g || g.phase !== "over" || g.seat < 0) return;
      var acts = app.querySelector(".modal .box .actions"); if (!acts || acts.querySelector("[data-gxshare]")) return;
      var b = document.createElement("button"); b.className = "btn gx-share"; b.setAttribute("data-gxshare", "1");
      b.innerHTML = typeof sdk !== "undefined" && sdk ? "📸 Share result" : "📸 Save result card";
      b.addEventListener("click", function (e) { e.stopPropagation(); share(b); });
      acts.insertBefore(b, acts.firstChild);
    } catch (e) { console.error("share", e); }
  };
})();

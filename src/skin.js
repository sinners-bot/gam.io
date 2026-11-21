// ---------- Game Night visual pack: card faces, Sea Battle ships (loads last) ----------
(function () {
  // ----- playing cards: corner indexes, face cards -----
  function dressCards(root) {
    var cs = (root || document).querySelectorAll(".card[data-card]:not(.gx):not(.back)");
    for (var i = 0; i < cs.length; i++) {
      var el = cs[i], c = el.getAttribute("data-card");
      if (!c || c.length !== 2 || "SHDC".indexOf(c[1]) < 0) continue;
      var r = c[0] === "T" ? "10" : c[0], s = SUIT[c[1]];
      el.classList.add("gx");
      if ("JQK".indexOf(c[0]) >= 0) { el.classList.add("face"); el.insertAdjacentHTML("afterbegin", '<i class="fl">' + r + "</i>"); }
      if (c[0] === "A") el.classList.add("ace");
      el.insertAdjacentHTML("beforeend", '<i class="cr tl">' + r + "<small>" + s + '</small></i><i class="cr br">' + r + "<small>" + s + "</small></i>");
    }
  }

  // ----- Sea Battle: draw each ship as a vessel over its cells -----
  var HULL = {
    5: { name: "carrier", deck: function (L) { var d = '<rect x="40" y="26" width="' + (L - 70) + '" height="48" rx="6" fill="#5d6a86"/>'; for (var x = 70; x < L - 60; x += 46) d += '<rect x="' + x + '" y="47" width="26" height="6" rx="2" fill="#e8ecf5" opacity=".75"/>'; return d + '<rect x="' + (L - 150) + '" y="8" width="44" height="26" rx="5" fill="#9aa6c2"/><rect x="' + (L - 142) + '" y="2" width="8" height="12" fill="#c9d1e6"/>'; } },
    4: { name: "battleship", deck: function (L) { return turret(90, 50) + turret(170, 50) + '<rect x="' + (L / 2 - 40) + '" y="30" width="80" height="40" rx="8" fill="#dfe5f2" stroke="#59647f" stroke-width="3"/><rect x="' + (L / 2 - 12) + '" y="18" width="24" height="22" rx="4" fill="#f4f6fb" stroke="#59647f" stroke-width="3"/>' + turret(L - 170, 50, 1) + turret(L - 100, 50, 1); } },
    3: { name: "cruiser", deck: function (L) { return turret(80, 50) + '<rect x="' + (L / 2 - 34) + '" y="32" width="68" height="36" rx="8" fill="#dfe5f2" stroke="#59647f" stroke-width="3"/><circle cx="' + (L / 2) + '" cy="50" r="9" fill="#c9d1e6"/>' + turret(L - 90, 50, 1); } },
    2: { name: "destroyer", deck: function (L) { return '<rect x="' + (L / 2 - 30) + '" y="34" width="50" height="32" rx="7" fill="#dfe5f2" stroke="#59647f" stroke-width="3"/>' + turret(L - 60, 50, 1) + '<rect x="40" y="44" width="30" height="12" rx="3" fill="#6b7896"/>'; } },
  };
  function turret(x, y, back) { return '<g transform="translate(' + x + " " + y + (back ? ") rotate(180)" : ")") + '"><rect x="8" y="-7" width="38" height="6" rx="2" fill="#3b4459"/><rect x="8" y="2" width="38" height="6" rx="2" fill="#3b4459"/><circle r="22" fill="#59647f" stroke="#2b3245" stroke-width="3"/><circle r="11" fill="#9aa5bf"/></g>'; }
  function shipSvg(len, vertical, wreck) {
    var L = len * 100, kind = HULL[Math.max(2, Math.min(5, len))] || HULL[3];
    var defs = '<defs><linearGradient id="gxh" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c3ccdf"/><stop offset=".55" stop-color="#8994ad"/><stop offset=".56" stop-color="#b8343f"/><stop offset="1" stop-color="#7a1f2a"/></linearGradient></defs>';
    var hull = '<path d="M6 50 Q12 6 70 5 L' + (L - 70) + " 6 Q" + (L - 10) + " 12 " + (L - 2) + " 50 Q" + (L - 10) + " 88 " + (L - 70) + " 94 L70 95 Q12 94 6 50 Z" + '" fill="' + (wreck ? "#3d3434" : "url(#gxh)") + '" stroke="#1f2433" stroke-width="5"/>' +
      '<path d="M22 50 Q26 22 72 20 L' + (L - 74) + " 22 Q" + (L - 26) + " 26 " + (L - 16) + ' 50" fill="none" stroke="#ffffff22" stroke-width="3"/>';
    var g = defs + hull + kind.deck(L) + (wreck ? '<path d="M' + (L * 0.3) + " 20 L" + (L * 0.45) + " 80 M" + (L * 0.62) + " 16 L" + (L * 0.55) + ' 86" stroke="#000" stroke-width="7" opacity=".55"/>' : "");
    if (vertical) return '<svg viewBox="0 0 100 ' + L + '" preserveAspectRatio="none"><g transform="rotate(90) translate(0 -100)">' + g + "</g></svg>";
    return '<svg viewBox="0 0 ' + L + ' 100" preserveAspectRatio="none">' + g + "</svg>";
  }
  function drawShips(board, ships, wreck) {
    if (!board) return;
    var cells = board.querySelectorAll(".bc");
    if (cells.length !== 100) return;
    board.querySelectorAll(".gx-ship").forEach(function (x) { x.remove(); });
    ships.forEach(function (sh) {
      if (!sh || !sh.length) return;
      var a = Math.min.apply(null, sh), z = Math.max.apply(null, sh), first = cells[a], last = cells[z];
      var vertical = sh.length > 1 && sh[1] - sh[0] === 10;
      var el = document.createElement("div");
      el.className = "gx-ship" + (wreck ? " wreck" : "");
      el.style.left = first.offsetLeft + "px"; el.style.top = first.offsetTop + "px";
      el.style.width = last.offsetLeft + last.offsetWidth - first.offsetLeft + "px";
      el.style.height = last.offsetTop + last.offsetHeight - first.offsetTop + "px";
      el.innerHTML = shipSvg(sh.length, vertical, wreck);
      board.appendChild(el);
    });
  }
  function seaShips() {
    var g = S.game; if (!g || g.type !== "battleship" || !g.state) return;
    var boards = document.querySelectorAll(".sea"), st = g.state;
    if (boards.length < 2) return;
    var sunkMine = {}; // my ships that were sunk show as wrecks
    st.mine.ships.forEach(function (sh) { if (sh.every(function (x) { return st.mine.incoming[x] === 2; })) sunkMine[sh.join(",")] = 1; });
    drawShips(boards[0], st.mine.ships.filter(function (sh) { return !sunkMine[sh.join(",")]; }), false);
    var wrecks = st.mine.ships.filter(function (sh) { return sunkMine[sh.join(",")]; });
    drawShipsAppend(boards[0], wrecks);
    boards[1].querySelectorAll(".gx-ship").forEach(function (x) { x.remove(); });
    drawShipsAppend(boards[1], st.enemy.sunk);
  }
  function drawShipsAppend(board, ships) { // like drawShips but keeps what's already there
    if (!board) return;
    var cells = board.querySelectorAll(".bc"); if (cells.length !== 100) return;
    ships.forEach(function (sh) {
      var a = Math.min.apply(null, sh), z = Math.max.apply(null, sh), first = cells[a], last = cells[z];
      var el = document.createElement("div"); el.className = "gx-ship wreck";
      el.style.left = first.offsetLeft + "px"; el.style.top = first.offsetTop + "px";
      el.style.width = last.offsetLeft + last.offsetWidth - first.offsetLeft + "px";
      el.style.height = last.offsetTop + last.offsetHeight - first.offsetTop + "px";
      el.innerHTML = shipSvg(sh.length, sh.length > 1 && sh[1] - sh[0] === 10, true);
      board.appendChild(el);
    });
  }

  function dress() { try { dressCards(document); seaShips(); } catch (e) { console.error("skin", e); } }
  var baseRender = render;
  render = function () { baseRender.apply(this, arguments); dress(); };
  window.addEventListener("resize", function () { if (S.game && S.game.type === "battleship") seaShips(); });
  window.__extraTick = dress; // used by the screenshot tests
})();

// Game Night visual pack — serves the visual upgrade (card faces, ships, boards) and cross-pack style fixes. Loads last.
const JS: string = String.raw`// ---------- Game Night visual pack: card faces, Sea Battle ships (loads last) ----------
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
`;
const CSS: string = String.raw`/* ================= Game Night visual pack (loads last) ================= */
/* --- fixes for class names shared between packs --- */
.ttt .tc{position:relative;left:auto;top:auto;transform:none;transition:background .15s}
.uttt .uc{width:auto;height:auto;border:0;padding:0;color:inherit;font-weight:inherit;flex:initial;flex-direction:row;justify-content:center;overflow:visible;box-shadow:none;transition:background .15s}
.uttt .uc::before{content:none}.uttt .uc i,.uttt .uc b{all:unset}
.bc.miss{margin-top:0;text-align:initial;color:inherit}
#gn-online{position:fixed;inset:0;z-index:90}

/* --- shared --- */
@keyframes gx-pop{0%{transform:scale(.4);opacity:0}70%{transform:scale(1.12)}100%{transform:scale(1);opacity:1}}
@keyframes gx-glow{50%{filter:brightness(1.25)}}

/* --- playing cards: corner indexes, big centre pip, face cards, nicer backs --- */
.card.gx{position:relative;background:linear-gradient(160deg,#fff 0%,#f7f4ff 70%,#ece6ff 100%);border:1px solid #00000014;justify-content:center}
.card.gx>span{display:none}
.card.gx>b{font-size:34px;filter:drop-shadow(0 1px 0 #0002)}
.card.gx .cr{position:absolute;font-style:normal;font-size:13px;font-weight:900;line-height:.95;text-align:center;display:flex;flex-direction:column;align-items:center}
.card.gx .cr small{font-size:11px}
.card.gx .cr.tl{left:5px;top:5px}.card.gx .cr.br{right:5px;bottom:5px;transform:rotate(180deg)}
.card.gx.face{background:linear-gradient(160deg,#fff8e6,#ffe9b8);}
.card.gx.face::before{content:"";position:absolute;inset:14px 11px;border-radius:7px;border:2px solid currentColor;opacity:.25}
.card.gx.face>b{font-size:30px}
.card.gx.face .fl{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:34px;font-weight:900;font-family:Georgia,serif;opacity:.16}
.card.gx.ace>b{font-size:44px}
.card.mini.gx .cr{display:none}.card.mini.gx>b{font-size:20px}.card.mini.gx .fl{font-size:20px}
.card.back{background:repeating-linear-gradient(45deg,#ffffff1a 0 6px,transparent 6px 12px),repeating-linear-gradient(-45deg,#ffffff1a 0 6px,transparent 6px 12px),radial-gradient(circle at 50% 50%,#c07dff,#5a1d9f 70%)!important;border:4px solid #fff!important;position:relative}
.card.back::after{content:"🎲";position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:22px;filter:drop-shadow(0 2px 3px #0008)}
.card.mini.back::after{font-size:14px}

/* --- Chess: walnut + maple board, carved pieces --- */
.chess:not(.checkers){box-shadow:0 0 0 10px #4a2c17,0 0 0 12px #c89b6a,0 24px 50px #000a,0 0 60px #7c4dff33;border-radius:10px}
.chess:not(.checkers) .sq.lt{background:linear-gradient(135deg,#f3dfb8,#e6c895)}
.chess:not(.checkers) .sq.dk{background:linear-gradient(135deg,#b07a4c,#8c5a33)}
.chess:not(.checkers) .sq i{color:#3b2313;opacity:.55}
.chess:not(.checkers) .sq.last{box-shadow:inset 0 0 0 100px #f6e35a66}
.chess:not(.checkers) .sq.sel{box-shadow:inset 0 0 0 100px #7ce4ff88}
.chess:not(.checkers) .sq.tgt::after{background:#2b160a55;width:28%;height:28%}
.chess:not(.checkers) .sq.cap::after{border-color:#2b160a66}
.pc{font-size:min(9.5vw,56px);transition:transform .15s}
.pc.w{color:#fffdf6;-webkit-text-stroke:1.2px #3b2313;text-shadow:0 3px 0 #c7a47a,0 6px 10px #000a}
.pc.b{color:#24160c;-webkit-text-stroke:1px #d9b98f;text-shadow:0 3px 0 #000,0 6px 10px #000c}
.chess.mine .sq:hover .pc{transform:translateY(-3px) scale(1.05)}

/* --- Checkers: ridged 3D pieces on a classic board --- */
.chess.checkers{box-shadow:0 0 0 10px #3a1f10,0 0 0 12px #b2875a,0 24px 50px #000a;border-radius:10px}
.chess.checkers .sq.dk{background:#f1d9b0}.chess.checkers .sq.lt{background:linear-gradient(135deg,#9a6a40,#7a4f2c)}
.ckp{width:78%;height:78%;color:#ffd84d;font-size:min(4vw,22px);
  background:repeating-radial-gradient(circle at 50% 50%,#0000 0 9%,#0003 9% 11%,#0000 11% 20%),radial-gradient(circle at 35% 30%,#fff6,transparent 45%),var(--pc)!important;
  box-shadow:0 5px 0 color-mix(in srgb,var(--pc) 55%,#000),0 8px 12px #000a,inset 0 0 0 3px #ffffff30!important}
.ckp.p0{--pc:#e8335a!important}.ckp.p1{--pc:#22222e!important;outline:2px solid #ffffff55;outline-offset:-2px}

/* --- Connect 4: glossy plastic frame and chunky discs --- */
.c4{background:radial-gradient(circle at 30% 0%,#7b6bff,transparent 60%),linear-gradient(180deg,#3d5cff,#2238c9);box-shadow:0 12px 0 #172694,0 24px 40px #000a,0 0 50px #3d5cff55,inset 0 2px 0 #ffffff55;border-radius:24px}
.c4 .cell{background:radial-gradient(circle at 50% 35%,#0a0a24,#14143a);box-shadow:inset 0 6px 10px #000c,0 1px 0 #ffffff33}
.c4 .disc{background:radial-gradient(circle at 50% 50%,transparent 0 46%,#0002 47% 50%,transparent 51%),radial-gradient(circle at 35% 28%,#fffb,transparent 40%),var(--pc);box-shadow:inset 0 -4px 0 #0004,inset 0 0 0 3px #ffffff40,0 0 12px var(--pc)}

/* --- Reversi: felt with grid lines, 3D flipping discs --- */
.rv{background:linear-gradient(160deg,#1f7a52,#145238);gap:2px;box-shadow:0 0 0 8px #3a1f10,0 0 0 10px #b2875a,0 20px 40px #000a}
.rc{background:#ffffff08;border-radius:3px;box-shadow:inset 0 0 0 1px #0003}
.rd{width:84%;height:84%}
.rd.p1{background:radial-gradient(circle at 35% 30%,#5d5d6e,#111 55%);box-shadow:0 4px 0 #000,0 6px 10px #000a}
.rd.p2{background:radial-gradient(circle at 35% 30%,#fff,#e8e4f2 60%);box-shadow:0 4px 0 #a9a3bd,0 6px 10px #000a}
.rd.new{animation:gx-flip .45s ease-out}
@keyframes gx-flip{0%{transform:rotateY(90deg) scale(.6)}100%{transform:none}}

/* --- Mancala: carved walnut board with glass marbles --- */
.mancala{background:radial-gradient(ellipse at 30% 0%,#ffffff22,transparent 60%),repeating-linear-gradient(95deg,#6b3d1f 0 14px,#77462a 14px 22px,#5f3519 22px 34px);box-shadow:0 0 0 4px #3a1f10,0 14px 0 #2b160a,0 30px 50px #000b;border-radius:40px}
.pit,.store{background:radial-gradient(circle at 50% 30%,#3a200f,#24130a);box-shadow:inset 0 8px 16px #000c,0 2px 0 #ffffff22}
.pit b{color:#ffe2b8}.store b{color:#ffd84d}.store small{color:#ffe2b8aa}
.stones{gap:3px}
.stones i{width:11px;height:11px;background:radial-gradient(circle at 35% 30%,#fff,var(--mc,#4dd4ff) 55%,#0006);box-shadow:0 1px 2px #000a}
.stones i:nth-child(6n+1){--mc:#4dd4ff}.stones i:nth-child(6n+2){--mc:#ff4d8d}.stones i:nth-child(6n+3){--mc:#ffd84d}.stones i:nth-child(6n+4){--mc:#3ddc84}.stones i:nth-child(6n+5){--mc:#b05cff}.stones i:nth-child(6n){--mc:#ff8a4d}

/* --- Tic-Tac-Toe & Ultimate: neon arcade --- */
.ttt{gap:0;width:min(86vw,380px);padding:12px;border-radius:26px;background:radial-gradient(circle at 50% 0%,#2e2275,#140f38);box-shadow:0 0 0 2px #b05cff55,0 0 50px #7c4dff44,0 20px 40px #000a}
.ttt .tc{border-radius:0;background:transparent;border:0;box-shadow:none}
.ttt .tc:nth-child(3n+1),.ttt .tc:nth-child(3n+2){border-right:4px solid #b05cff66}
.ttt .tc:nth-child(-n+6){border-bottom:4px solid #b05cff66}
.ttt .tc.open:hover{background:#ffffff0d}.ttt .tc.win{background:#b05cff33;box-shadow:inset 0 0 30px #b05cff88}
.mk{animation:gx-pop .3s ease-out}
.mk.x{color:#ff4d8d;text-shadow:0 0 10px #ff4d8d,0 0 30px #ff4d8d88}.mk.o{color:#4dd4ff;text-shadow:0 0 10px #4dd4ff,0 0 30px #4dd4ff88}
.uttt .ub{background:radial-gradient(circle at 50% 0%,#2a1f66,#140f38)}
.uttt .uc{aspect-ratio:1;border-radius:7px;background:#ffffff0c;display:flex;align-items:center;justify-content:center;font-size:min(4.5vw,22px)}
.uttt .uc.open{cursor:pointer}.uttt .uc.open:hover{background:#ffc83d44}.uttt .uc.last{outline:2px solid #fff8}

/* --- Dots & Boxes: graph-paper notebook --- */
.dots{background:linear-gradient(#ffffff0a 1px,transparent 1px) 0 0/20px 20px,linear-gradient(90deg,#ffffff0a 1px,transparent 1px) 0 0/20px 20px,radial-gradient(circle at 50% 30%,#2e2275,#1a1445)}
.dots .bx{opacity:.55}.dots text{font-size:30px}

/* --- Lucky Dice: rounded 3D dice --- */
.dface{background:radial-gradient(circle at 30% 25%,#fff,#f1eeff 50%,#d8d0ff);border-radius:18px;box-shadow:0 7px 0 #8f80d0,0 12px 20px #0009,inset 0 -3px 6px #0001}
.dface i.on{background:radial-gradient(circle at 40% 35%,#5a4a9e,#1b1240);box-shadow:inset 0 1px 2px #000a}

/* --- Sea Battle: animated ocean, real ships, explosions and splashes --- */
.seas{gap:28px;align-items:flex-start}
.sea{position:relative;gap:2px;width:min(88vw,360px);padding:8px;border-radius:16px;
  background:repeating-linear-gradient(170deg,#ffffff07 0 10px,transparent 10px 22px),radial-gradient(ellipse at 50% 0%,#1f6fd1,#0b2f75 60%,#071a46);
  background-size:200% 200%,100% 100%;animation:gx-waves 8s linear infinite;box-shadow:0 0 0 3px #ffffff1a,0 0 30px #29c6ff33,0 14px 30px #0008}
@keyframes gx-waves{to{background-position:200% 100%,0 0}}
.sea .bc{background:transparent;border-radius:3px;box-shadow:inset 0 0 0 1px #ffffff12;z-index:2}
.sea .bc.ship{background:transparent}
.sea.enemy .bc.aim:hover{background:#ffd84d33;box-shadow:inset 0 0 0 2px #ffd84d}
.sea .bc.miss::after{content:"";position:absolute;inset:22%;border-radius:50%;background:none;border:2px solid #ffffffcc;box-shadow:0 0 0 3px #ffffff33,inset 0 0 0 3px #ffffff33;animation:gx-pop .35s ease-out}
.sea .bc.hit{background:transparent;box-shadow:none}
.sea .bc.hit::after{content:"";position:absolute;inset:8%;border-radius:50%;background:radial-gradient(circle,#fff6b0 0 15%,#ffb02e 35%,#ff4d2e 60%,#ff4d2e00 72%);animation:gx-fire 1s ease-in-out infinite alternate;z-index:3}
@keyframes gx-fire{0%{transform:scale(.85);filter:brightness(1)}100%{transform:scale(1.08);filter:brightness(1.3)}}
.sea .bc.sunk{background:#00000040}
.sea .bc.sunk::after{content:"";position:absolute;inset:18%;border-radius:50%;background:radial-gradient(circle,#ff8a4d 0 20%,#5a1222 70%,transparent 72%);z-index:3}
.sea .bc.last{box-shadow:inset 0 0 0 2px #fff}
.gx-ship{position:absolute;pointer-events:none;z-index:1;filter:drop-shadow(0 3px 2px #0009)}
.gx-ship svg{width:100%;height:100%;display:block}
.gx-ship.wreck{filter:grayscale(.6) brightness(.6) drop-shadow(0 2px 2px #000a);opacity:.9}

/* --- party games --- */
.rolecard,.role{box-shadow:0 0 0 2px #ffffff14,0 18px 40px #000a,0 0 60px #b05cff33}
.mancala{width:min(100%,760px);max-width:100%;box-sizing:border-box}.mancala .store{flex:none;width:76px}
.mancala .pits{min-width:0}
`;
const h = (t: string) => new Bun.CryptoHasher("sha256").update(t).digest("hex").slice(0, 16);
Bun.serve({
  port: Number(Bun.env.PORT || 3000),
  fetch(req) {
    const p = new URL(req.url).pathname;
    if (p === "/client.js") return new Response(JS, { headers: { "Content-Type": "text/javascript; charset=utf-8", "Cache-Control": "no-cache" } });
    if (p === "/style.css") return new Response(CSS, { headers: { "Content-Type": "text/css; charset=utf-8", "Cache-Control": "no-cache" } });
    if (p === "/health") return Response.json({ ok: true, js: h(JS), css: h(CSS) });
    return new Response("not found", { status: 404 });
  },
});

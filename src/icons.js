// ---------- GAM.IO look: illustrated game logos, brand mark, nicer pages (loads after the GAM.IO pack) ----------
(function () {
  // ===== small SVG helpers =====
  function L(id, a, b, x2, y2) { return '<linearGradient id="' + id + '" x1="0" y1="0" x2="' + (x2 == null ? 0 : x2) + '" y2="' + (y2 == null ? 1 : y2) + '"><stop offset="0" stop-color="' + a + '"/><stop offset="1" stop-color="' + b + '"/></linearGradient>'; }
  function R(id, a, b) { return '<radialGradient id="' + id + '" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="' + a + '"/><stop offset="1" stop-color="' + b + '"/></radialGradient>'; }
  function svg(defs, body) { return '<svg class="gx-ic" viewBox="0 0 120 120" aria-hidden="true"><defs>' + defs + "</defs>" + body + "</svg>"; }
  var SH = '<ellipse cx="60" cy="109" rx="36" ry="5.5" fill="#000" opacity=".3"/>';
  var GL = function (x, y, rx, ry, rot) { return '<ellipse cx="' + x + '" cy="' + y + '" rx="' + rx + '" ry="' + ry + '" fill="#fff" opacity=".35"' + (rot ? ' transform="rotate(' + rot + " " + x + " " + y + ')"' : "") + "/>"; };
  var PIPS = { 1: [[0, 0]], 2: [[-1, -1], [1, 1]], 3: [[-1, -1], [0, 0], [1, 1]], 4: [[-1, -1], [1, -1], [-1, 1], [1, 1]], 5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]], 6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]] };
  function die(cx, cy, s, rot, fill, pip, n) {
    var h = s / 2, d = s * 0.27, out = '<g transform="rotate(' + rot + " " + cx + " " + cy + ')"><rect x="' + (cx - h) + '" y="' + (cy - h + 4) + '" width="' + s + '" height="' + s + '" rx="' + s * 0.2 + '" fill="#000" opacity=".25"/><rect x="' + (cx - h) + '" y="' + (cy - h) + '" width="' + s + '" height="' + s + '" rx="' + s * 0.2 + '" fill="url(#' + fill + ')"/>';
    PIPS[n].forEach(function (p) { out += '<circle cx="' + (cx + p[0] * d) + '" cy="' + (cy + p[1] * d) + '" r="' + s * 0.085 + '" fill="' + pip + '"/>'; });
    return out + '<rect x="' + (cx - h + 3) + '" y="' + (cy - h + 3) + '" width="' + (s - 6) + '" height="' + s * 0.3 + '" rx="' + s * 0.14 + '" fill="#fff" opacity=".25"/></g>';
  }
  function card(x, y, w, h, rot, fill, inner, stroke) {
    return '<g transform="rotate(' + rot + " " + (x + w / 2) + " " + (y + h / 2) + ')"><rect x="' + x + '" y="' + (y + 3) + '" width="' + w + '" height="' + h + '" rx="7" fill="#000" opacity=".28"/><rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="7" fill="' + fill + '"' + (stroke ? ' stroke="' + stroke + '" stroke-width="3"' : "") + "/>" + inner + "</g>";
  }
  var HEART = function (cx, cy, s, fill) { return '<path transform="translate(' + cx + " " + cy + ") scale(" + s + ')" d="M0 9C-9 2-14-3-14-9-14-14-10-17-6.5-17-3.5-17-1-15 0-12 1-15 3.5-17 6.5-17 10-17 14-14 14-9 14-3 9 2 0 9Z" fill="' + fill + '"/>'; };
  var SPADE = function (cx, cy, s, fill) { return '<path transform="translate(' + cx + " " + cy + ") scale(" + s + ')" d="M0-16C-5-9-14-4-14 3-14 8-10 11-6 11-3.5 11-1.5 10 0 8-.5 12-2 15-5 17H5C2 15 .5 12 0 8 1.5 10 3.5 11 6 11 10 11 14 8 14 3 14-4 5-9 0-16Z" fill="' + fill + '"/>'; };
  function chip(cx, cy, col) { return '<g><ellipse cx="' + cx + '" cy="' + (cy + 5) + '" rx="20" ry="7" fill="#000" opacity=".25"/><path d="M' + (cx - 20) + " " + cy + "v5a20 7 0 0 0 40 0v-5Z\" fill=\"" + col + '" filter="brightness(.7)"/><ellipse cx="' + cx + '" cy="' + cy + '" rx="20" ry="7" fill="' + col + '"/><ellipse cx="' + cx + '" cy="' + cy + '" rx="13" ry="4.5" fill="none" stroke="#fff" stroke-width="2.4" stroke-dasharray="4 4"/></g>'; }

  // ===== the logos =====
  var IC = {
    chess: function () {
      return svg(L("ch1", "#ffffff", "#cbbcf2") + L("ch2", "#5b4aa8", "#1b1340") + L("ch3", "#ffe27a", "#f0a72c"),
        SH + '<g transform="translate(26 14) scale(.78)"><path d="M78 92C80 78 84 72 84 68H92C92 72 96 78 98 92Z" fill="url(#ch2)"/><circle cx="88" cy="58" r="11" fill="url(#ch2)"/><rect x="72" y="91" width="32" height="10" rx="4" fill="url(#ch2)"/></g>' +
        '<rect x="34" y="92" width="52" height="12" rx="5" fill="url(#ch1)"/><ellipse cx="60" cy="90" rx="22" ry="5" fill="#e8defc"/><path d="M45 88C47 72 51 60 53 50H67C69 60 73 72 75 88Z" fill="url(#ch1)"/><ellipse cx="60" cy="50" rx="13" ry="4" fill="#efe7ff"/>' +
        '<path d="M46 46 42 26 52 36 60 19 68 36 78 26 74 46Z" fill="url(#ch1)"/><circle cx="42" cy="24" r="4.5" fill="url(#ch3)"/><circle cx="60" cy="17" r="5" fill="url(#ch3)"/><circle cx="78" cy="24" r="4.5" fill="url(#ch3)"/>' + GL(54, 66, 3, 14, 8));
    },
    checkers: function () {
      function pc(cx, cy, top, side, crown) {
        return '<path d="M' + (cx - 28) + " " + cy + "v11a28 10 0 0 0 56 0v-11Z\" fill=\"" + side + '"/><ellipse cx="' + cx + '" cy="' + cy + '" rx="28" ry="10" fill="url(#' + top + ')"/><ellipse cx="' + cx + '" cy="' + cy + '" rx="20" ry="7" fill="none" stroke="#fff" stroke-opacity=".3" stroke-width="2"/><ellipse cx="' + cx + '" cy="' + cy + '" rx="12" ry="4" fill="none" stroke="#000" stroke-opacity=".2" stroke-width="2"/>' + (crown ? '<path d="M' + (cx - 9) + " " + (cy + 1) + "l-2-8 6 4 5-7 5 7 6-4-2 8Z\" fill=\"#ffd84d\"/>" : "");
      }
      return svg(R("ck1", "#ff8aa0", "#d81e4a") + R("ck2", "#5d5878", "#16131f"), SH + pc(76, 78, "ck2", "#0c0a14") + pc(46, 86, "ck1", "#8f0f2c") + pc(46, 70, "ck1", "#8f0f2c") + pc(46, 54, "ck1", "#8f0f2c", 1));
    },
    connect4: function () {
      var holes = "", cols = ["#ff3b4f", "#ffcc33", 0, "#ffcc33", "#ff3b4f", "#ff3b4f", 0, "#ffcc33", "#ffcc33", "#ff3b4f", "#ff3b4f", "#ffcc33"];
      for (var r = 0; r < 3; r++) for (var c = 0; c < 4; c++) { var x = 32 + c * 19, y = 56 + r * 17, f = cols[r * 4 + c]; holes += '<circle cx="' + x + '" cy="' + y + '" r="7.5" fill="' + (f || "#141038") + '"/>' + (f ? '<circle cx="' + (x - 2) + '" cy="' + (y - 2.5) + '" r="2.5" fill="#fff" opacity=".45"/>' : ""); }
      return svg(L("c41", "#5b7bff", "#1f2fbf"), SH + '<rect x="18" y="44" width="84" height="58" rx="11" fill="url(#c41)"/><rect x="18" y="44" width="84" height="10" rx="6" fill="#fff" opacity=".18"/>' + holes +
        '<circle cx="51" cy="25" r="9" fill="#ffcc33"/><circle cx="48.5" cy="22" r="3" fill="#fff" opacity=".5"/><path d="M51 6v6M44 9l2 5M58 9l-2 5" stroke="#ffcc33" stroke-width="2.5" stroke-linecap="round" opacity=".7"/>');
    },
    reversi: function () {
      return svg(R("rv1", "#6b6780", "#0e0c16") + R("rv2", "#ffffff", "#cfcae0") + L("rv3", "#ffd84d", "#ff9f43"), SH +
        '<ellipse cx="46" cy="80" rx="30" ry="12" fill="#2a2638"/><ellipse cx="46" cy="74" rx="30" ry="12" fill="url(#rv1)"/>' + GL(38, 70, 10, 3) +
        '<g transform="rotate(-20 84 58)"><ellipse cx="84" cy="58" rx="9" ry="26" fill="#14121c"/><ellipse cx="81" cy="58" rx="9" ry="26" fill="url(#rv2)"/></g>' +
        '<path d="M28 46C38 22 66 16 84 28" fill="none" stroke="url(#rv3)" stroke-width="5" stroke-linecap="round"/><path d="M78 20l10 8-12 4Z" fill="#ff9f43"/>');
    },
    ttt: function () {
      return svg("", '<g stroke="#b05cff" stroke-width="5" stroke-linecap="round" opacity=".9"><path d="M46 18V102M74 18V102M18 46H102M18 74H102"/></g>' +
        '<g stroke="#ff4d8d" stroke-width="7" stroke-linecap="round" filter="drop-shadow(0 0 4px #ff4d8d)"><path d="M23 23 39 39M39 23 23 39M53 51 67 67M67 51 53 67"/></g>' +
        '<circle cx="88" cy="32" r="9" fill="none" stroke="#4dd4ff" stroke-width="6" style="filter:drop-shadow(0 0 4px #4dd4ff)"/><circle cx="32" cy="88" r="9" fill="none" stroke="#4dd4ff" stroke-width="6"/><path d="M81 81 95 95M95 81 81 95" stroke="#ff4d8d" stroke-width="7" stroke-linecap="round"/>' +
        '<path d="M22 22 98 98" stroke="#ffd84d" stroke-width="4" stroke-linecap="round" opacity=".85"/>');
    },
    uttt: function () {
      function mini(x, y, marks) {
        var s = '<g stroke="#ffffff" stroke-opacity=".55" stroke-width="1.6"><path d="M' + (x + 8) + " " + y + "v24M" + (x + 16) + " " + y + "v24M" + x + " " + (y + 8) + "h24M" + x + " " + (y + 16) + 'h24"/></g>';
        marks.forEach(function (m) { var cx = x + 4 + m[0] * 8, cy = y + 4 + m[1] * 8; s += m[2] ? '<circle cx="' + cx + '" cy="' + cy + '" r="2.6" fill="none" stroke="#4dd4ff" stroke-width="1.8"/>' : '<path d="M' + (cx - 2.5) + " " + (cy - 2.5) + "l5 5m0-5-5 5\" stroke=\"#ff4d8d\" stroke-width=\"1.8\" stroke-linecap=\"round\"/>"; });
        return s;
      }
      return svg("", '<g stroke="#ffd84d" stroke-width="4.5" stroke-linecap="round"><path d="M47 14V106M73 14V106M14 47H106M14 73H106"/></g>' +
        mini(18, 18, [[0, 0], [1, 1, 1], [2, 2]]) + mini(48, 48, [[1, 0, 1], [1, 1], [0, 2, 1]]) + mini(78, 78, [[2, 0], [0, 1, 1], [1, 2]]) + mini(78, 18, [[0, 0, 1]]) + mini(18, 78, [[2, 2]]));
    },
    dots: function () {
      var d = "", P = [24, 48, 72, 96];
      d += '<rect x="48" y="48" width="24" height="24" rx="3" fill="#ff4d8d" opacity=".85"/><text x="60" y="66" text-anchor="middle" font-size="15" font-weight="900" fill="#fff" font-family="system-ui">A</text>';
      d += '<g stroke-width="5" stroke-linecap="round"><path d="M48 48H72V72H48Z" stroke="#ff4d8d" fill="none"/><path d="M24 24H48M72 24V48M24 72V96M72 96H96" stroke="#4dd4ff"/><path d="M96 48V72" stroke="#ffd84d"/></g>';
      P.forEach(function (y) { P.forEach(function (x) { d += '<circle cx="' + x + '" cy="' + y + '" r="5" fill="#fff"/>'; }); });
      return svg("", d); 
    },
    mancala: function () {
      var m = ["#4dd4ff", "#ff4d8d", "#ffd84d", "#6dff9a", "#b05cff"], pits = "";
      for (var r = 0; r < 2; r++) for (var c = 0; c < 3; c++) {
        var x = 42 + c * 18, y = 52 + r * 22; pits += '<ellipse cx="' + x + '" cy="' + y + '" rx="7.5" ry="7" fill="#2a1409"/>';
        for (var k = 0; k < 2 + ((r + c) % 2); k++) pits += '<circle cx="' + (x - 2.5 + k * 3) + '" cy="' + (y + 1 - (k % 2) * 3) + '" r="2.6" fill="' + m[(r * 3 + c + k) % 5] + '"/>';
      }
      return svg(L("mc1", "#a8693b", "#5e3317"), SH + '<g transform="rotate(-8 60 63)"><rect x="12" y="38" width="96" height="50" rx="25" fill="#3a1d0b"/><rect x="12" y="34" width="96" height="50" rx="25" fill="url(#mc1)"/><rect x="18" y="38" width="84" height="12" rx="6" fill="#fff" opacity=".12"/>' +
        '<rect x="19" y="44" width="13" height="30" rx="6.5" fill="#2a1409"/><rect x="88" y="44" width="13" height="30" rx="6.5" fill="#2a1409"/><circle cx="25" cy="66" r="3" fill="#ffd84d"/><circle cx="94" cy="54" r="3" fill="#4dd4ff"/><circle cx="95" cy="62" r="3" fill="#ff4d8d"/>' + pits + "</g>");
    },
    dice: function () {
      return svg(L("dc1", "#ffffff", "#ddd5ff") + L("dc2", "#ff6b81", "#d0173f"), SH + die(44, 70, 42, -14, "dc1", "#2b1d63", 5) + die(80, 56, 36, 16, "dc2", "#fff", 3) + '<path d="M96 22l3 7 7 3-7 3-3 7-3-7-7-3 7-3Z" fill="#ffd84d"/>');
    },
    liars: function () {
      return svg(L("lc1", "#b8432f", "#5e1610") + L("lc2", "#ffffff", "#ddd5ff"), SH + die(30, 92, 22, -18, "lc2", "#2b1d63", 6) + die(90, 94, 20, 20, "lc2", "#2b1d63", 2) +
        '<path d="M34 34H86L96 96H24Z" fill="url(#lc1)"/><ellipse cx="60" cy="34" rx="26" ry="6" fill="#d9634c"/><ellipse cx="60" cy="96" rx="36" ry="7" fill="#7a2115"/><path d="M36 52H84M33 70H87" stroke="#ffd84d" stroke-width="3" opacity=".7"/><path d="M40 40 33 92" stroke="#fff" stroke-width="5" opacity=".18" stroke-linecap="round"/>' +
        '<circle cx="92" cy="22" r="13" fill="#fff"/><path d="M86 33l-4 6 9-4Z" fill="#fff"/><text x="92" y="28" text-anchor="middle" font-size="18" font-weight="900" fill="#7c4dff" font-family="system-ui">?</text>');
    },
    battleship: function () {
      return svg(L("bs1", "#cfd6e8", "#7d89a6") + L("bs2", "#2f8cff", "#0b3d91"), '<path d="M6 92Q18 86 30 92T54 92T78 92T102 92T126 92V116H6Z" fill="url(#bs2)"/>' +
        '<path d="M12 74H108L96 92H22Z" fill="url(#bs1)"/><path d="M22 92H96L99 87H19Z" fill="#c23a45"/><rect x="44" y="56" width="30" height="18" rx="3" fill="#e9edf6"/><rect x="52" y="44" width="12" height="14" rx="2" fill="#bcc5da"/><rect x="56" y="32" width="3" height="14" fill="#6b7896"/><path d="M59 32h12l-4 4 4 4H59Z" fill="#ff4d8d"/>' +
        '<g fill="#59647f"><rect x="24" y="66" width="14" height="8" rx="3"/><rect x="80" y="66" width="14" height="8" rx="3"/></g><path d="M37 69H48M93 69h10" stroke="#3b4459" stroke-width="3"/>' +
        '<g stroke="#ff4d6d" stroke-width="3" fill="none" opacity=".95"><circle cx="94" cy="24" r="12"/><path d="M94 6v10M94 32v10M76 24h10M102 24h10"/></g><circle cx="94" cy="24" r="3" fill="#ff4d6d"/><path d="M14 100Q30 96 40 100" stroke="#fff" stroke-width="2.5" opacity=".5" fill="none"/>');
    },
    crazy8: function () {
      var c1 = '<text x="42" y="70" text-anchor="middle" font-size="40" font-weight="900" fill="#1b1442" font-family="Georgia,serif">8</text>' + SPADE(42, 84, 0.5, "#1b1442") + '<text x="25" y="44" font-size="11" font-weight="900" fill="#1b1442" font-family="system-ui">8</text>';
      var c2 = '<text x="78" y="70" text-anchor="middle" font-size="40" font-weight="900" fill="#e8335a" font-family="Georgia,serif">8</text>' + HEART(78, 84, 0.5, "#e8335a") + '<text x="61" y="44" font-size="11" font-weight="900" fill="#e8335a" font-family="system-ui">8</text>';
      return svg("", SH + card(20, 30, 44, 66, -14, "#fff", c1) + card(56, 28, 44, 66, 12, "#fff8ec", c2));
    },
    clash: function () {
      function jc(x, y, rot, col, sym) {
        return card(x, y, 40, 60, rot, col, '<rect x="' + (x + 3) + '" y="' + (y + 3) + '" width="34" height="54" rx="5" fill="none" stroke="#fff" stroke-width="2.5"/><rect x="' + (x + 9) + '" y="' + (y + 19) + '" width="22" height="22" rx="6" fill="#fff" transform="rotate(45 ' + (x + 20) + " " + (y + 30) + ')"/>' + sym);
      }
      return svg('<linearGradient id="jw" x1="0" y1="0" x2="1" y2="1"><stop offset=".25" stop-color="#ff3b4f"/><stop offset=".25" stop-color="#2f7dff"/><stop offset=".5" stop-color="#2f7dff"/><stop offset=".5" stop-color="#21c45e"/><stop offset=".75" stop-color="#21c45e"/><stop offset=".75" stop-color="#ffbf1a"/></linearGradient>',
        SH + jc(16, 34, -20, "#2f7dff", '<text x="36" y="70" text-anchor="middle" font-size="18" font-weight="900" fill="#2f7dff" font-family="system-ui">7</text>') +
        jc(70, 34, 18, "#ffbf1a", '<text x="90" y="70" text-anchor="middle" font-size="17" font-weight="900" fill="#e09a00" font-family="system-ui">⇄</text>') +
        jc(40, 26, 0, "#ff3b4f", '<text x="60" y="62" text-anchor="middle" font-size="17" font-weight="900" fill="#ff3b4f" font-family="system-ui">+2</text>'));
    },
    hearts: function () {
      return svg(R("hh1", "#ff8aa8", "#e0103f"), SH + card(30, 26, 54, 76, -8, "#fff", HEART(57, 66, 1.35, "url(#hh1)") + '<text x="37" y="42" font-size="13" font-weight="900" fill="#e8335a" font-family="system-ui">A</text>') +
        HEART(96, 30, 0.7, "#ff4d8d") + HEART(22, 22, 0.45, "#ff8ab0"));
    },
    spades: function () {
      return svg(L("sp1", "#5a5a7a", "#0f0d1c"), SH + card(16, 34, 40, 60, -14, "#3a2a8f", '<rect x="21" y="39" width="30" height="50" rx="4" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="2"/>') +
        card(38, 24, 54, 78, 8, "#fff", SPADE(65, 64, 1.35, "url(#sp1)") + '<text x="45" y="40" font-size="13" font-weight="900" fill="#1b1442" font-family="system-ui">A</text>'));
    },
    poker: function () {
      return svg("", SH + card(48, 18, 40, 58, 14, "#fff", '<text x="56" y="36" font-size="12" font-weight="900" fill="#e8335a" font-family="system-ui">K</text>' + HEART(68, 52, 0.75, "#e8335a")) +
        card(30, 20, 40, 58, -10, "#fff", '<text x="37" y="38" font-size="12" font-weight="900" fill="#1b1442" font-family="system-ui">A</text>' + SPADE(50, 52, 0.75, "#1b1442")) +
        chip(40, 96, "#ff3b4f") + chip(40, 88, "#2f7dff") + chip(40, 80, "#ff3b4f") + chip(80, 98, "#21c45e") + chip(80, 90, "#ffbf1a"));
    },
    cheat: function () {
      return svg(L("ct1", "#5b3df0", "#2a1886") + L("ct2", "#ffe27a", "#f0a72c"), SH + card(58, 30, 42, 62, 14, "#fff", '<text x="79" y="70" text-anchor="middle" font-size="26" font-weight="900" fill="#e8335a" font-family="Georgia,serif">Q</text>') +
        card(22, 28, 44, 66, -10, "url(#ct1)", '<text x="44" y="72" text-anchor="middle" font-size="34" font-weight="900" fill="#fff" font-family="system-ui">?</text>') +
        '<path d="M28 18C40 10 54 14 60 20 66 14 80 10 92 18 90 30 78 34 68 30 64 28 62 26 60 26 58 26 56 28 52 30 42 34 30 30 28 18Z" fill="url(#ct2)"/><ellipse cx="44" cy="22" rx="7" ry="4" fill="#1b1442"/><ellipse cx="76" cy="22" rx="7" ry="4" fill="#1b1442"/>');
    },
    pool: function () {
      return svg(R("pl1", "#5a5a6a", "#050508") + R("pl2", "#ffffff", "#d9d4e8") + L("pl3", "#f3d39a", "#8a5a2b", 1, 0) + '<clipPath id="pl4"><circle cx="84" cy="54" r="19"/></clipPath>', SH +
        '<rect x="-4" y="90" width="92" height="6" rx="3" fill="url(#pl3)" transform="rotate(-32 40 93)"/>' +
        '<circle cx="84" cy="54" r="19" fill="url(#pl2)"/><rect x="62" y="44" width="44" height="20" fill="#ffbf1a" clip-path="url(#pl4)"/><circle cx="84" cy="54" r="6.5" fill="#fff"/><text x="84" y="58" text-anchor="middle" font-size="9" font-weight="900" fill="#1b1442" font-family="system-ui">9</text>' +
        '<circle cx="50" cy="66" r="26" fill="url(#pl1)"/><circle cx="50" cy="64" r="11" fill="#fff"/><text x="50" y="69.5" text-anchor="middle" font-size="15" font-weight="900" fill="#111" font-family="system-ui">8</text>' + GL(40, 52, 8, 4, -30));
    },
    ludo: function () {
      return svg(R("ld1", "#ff8aa0", "#c8102e"), SH + '<g transform="rotate(-6 60 66)"><rect x="18" y="26" width="84" height="80" rx="10" fill="#f3efff"/>' +
        '<rect x="22" y="30" width="32" height="32" rx="6" fill="#ff4d6d"/><rect x="66" y="30" width="32" height="32" rx="6" fill="#21c45e"/><rect x="22" y="70" width="32" height="32" rx="6" fill="#2f7dff"/><rect x="66" y="70" width="32" height="32" rx="6" fill="#ffbf1a"/>' +
        '<path d="M54 62 60 56 66 62 60 68Z" fill="#7c4dff"/><circle cx="38" cy="46" r="8" fill="#fff" opacity=".85"/><circle cx="82" cy="86" r="8" fill="#fff" opacity=".85"/></g>' +
        '<path d="M48 96C50 78 55 70 55 64H65C65 70 70 78 72 96Z" fill="url(#ld1)"/><circle cx="60" cy="54" r="11" fill="url(#ld1)"/><ellipse cx="60" cy="96" rx="14" ry="4.5" fill="#8f0f2c"/>' + GL(56, 50, 3.5, 2.5));
    },
    spymaster: function () {
      var t = "", C = ["#ff4d6d", "#f1e4c8", "#2f7dff", "#2f7dff", "#ff4d6d", "#f1e4c8", "#f1e4c8", "#2f7dff", "#ff4d6d"];
      for (var i = 0; i < 9; i++) t += '<rect x="' + (20 + (i % 3) * 28) + '" y="' + (46 + Math.floor(i / 3) * 20) + '" width="24" height="16" rx="4" fill="' + C[i] + '"/>';
      return svg(L("sm1", "#3b3650", "#14121e"), SH + t + '<ellipse cx="60" cy="40" rx="40" ry="8" fill="url(#sm1)"/><path d="M38 40C38 24 44 14 60 14S82 24 82 40Z" fill="url(#sm1)"/><path d="M38 34H82V40H38Z" fill="#c8102e"/>' + GL(52, 22, 6, 3, -20));
    },
    spy: function () {
      return svg(L("sy1", "#3b3650", "#100e18") + L("sy2", "#b49bff", "#6b4fd8"), SH + '<path d="M26 108C28 86 40 78 60 78S92 86 94 108Z" fill="url(#sy1)"/><path d="M50 78 60 96 70 78Z" fill="#f1e4c8"/>' +
        '<ellipse cx="60" cy="58" rx="20" ry="23" fill="url(#sy2)"/><ellipse cx="60" cy="36" rx="38" ry="7" fill="url(#sy1)"/><path d="M40 36C40 20 46 10 60 10S80 20 80 36Z" fill="url(#sy1)"/><path d="M40 30H80V36H40Z" fill="#7c4dff"/>' +
        '<rect x="40" y="52" width="17" height="10" rx="4" fill="#111"/><rect x="63" y="52" width="17" height="10" rx="4" fill="#111"/><path d="M57 55h6" stroke="#111" stroke-width="3"/><path d="M43 54l6 0" stroke="#fff" stroke-width="2" opacity=".6"/><path d="M66 54h6" stroke="#fff" stroke-width="2" opacity=".6"/>');
    },
    mafia: function () {
      return svg(L("mf1", "#ff4d6d", "#8f0f2c") + R("mf2", "#fff3b0", "#f0b52c"), '<path d="M86 12A26 26 0 1 0 108 48 20 20 0 1 1 86 12Z" fill="url(#mf2)"/><path d="M20 22l1.5 4 4 1.5-4 1.5L20 33l-1.5-4-4-1.5 4-1.5ZM40 14l1 3 3 1-3 1-1 3-1-3-3-1 3-1Z" fill="#fff" opacity=".8"/>' + SH +
        '<path d="M14 66C24 52 46 52 60 62 74 52 96 52 106 66 102 84 84 90 72 82 66 78 62 76 60 76 58 76 54 78 48 82 36 90 18 84 14 66Z" fill="url(#mf1)"/><path d="M14 66C24 52 46 52 60 62 74 52 96 52 106 66" fill="none" stroke="#ffd84d" stroke-width="3"/>' +
        '<ellipse cx="38" cy="70" rx="10" ry="6" fill="#140b1e"/><ellipse cx="82" cy="70" rx="10" ry="6" fill="#140b1e"/><path d="M104 64 114 58M106 70 116 72" stroke="#ffd84d" stroke-width="3" stroke-linecap="round"/>');
    },
    draw: function () {
      return svg(L("dr1", "#fff6e6", "#e8d2a8") + L("dr2", "#ffd84d", "#ff9f43", 1, 0), SH + '<path d="M60 22C88 22 106 40 104 60 103 74 90 72 84 76 76 82 86 96 72 102 46 110 16 92 16 64 16 40 34 22 60 22Z" fill="url(#dr1)"/><circle cx="48" cy="86" r="8" fill="#2a1a40" opacity=".2"/>' +
        '<circle cx="40" cy="46" r="8" fill="#ff3b4f"/><circle cx="62" cy="38" r="8" fill="#ffbf1a"/><circle cx="84" cy="48" r="8" fill="#21c45e"/><circle cx="34" cy="68" r="8" fill="#2f7dff"/><circle cx="56" cy="62" r="7" fill="#b05cff"/>' +
        '<g transform="rotate(38 84 82)"><rect x="80" y="54" width="9" height="42" rx="4" fill="url(#dr2)"/><rect x="80" y="92" width="9" height="8" fill="#c9ccd8"/><path d="M80 100h9l-4.5 14Z" fill="#ff4d8d"/></g>');
    },
    trivia: function () {
      return svg(R("tv1", "#fffbe0", "#ffc83d"), '<g stroke="#ffd84d" stroke-width="4" stroke-linecap="round" opacity=".8"><path d="M60 6v9M24 20l7 6M96 20l-7 6M12 54h9M99 54h9"/></g>' + SH +
        '<path d="M60 22C78 22 90 36 90 52 90 64 82 70 78 78 76 82 76 86 76 88H44C44 86 44 82 42 78 38 70 30 64 30 52 30 36 42 22 60 22Z" fill="url(#tv1)" style="filter:drop-shadow(0 0 12px #ffd84daa)"/>' +
        '<rect x="44" y="88" width="32" height="8" rx="3" fill="#a8a6c0"/><rect x="46" y="96" width="28" height="7" rx="3" fill="#8c8aa6"/><rect x="52" y="103" width="16" height="5" rx="2.5" fill="#6d6b88"/>' +
        '<text x="60" y="68" text-anchor="middle" font-size="34" font-weight="900" fill="#7c4dff" font-family="system-ui">?</text>' + GL(46, 38, 6, 10, 30));
    },
    wordhunt: function () {
      var L3 = ["W", "O", "R", "A", "D", "S", "H", "U", "N"], t = "", path = [0, 1, 2, 5];
      for (var i = 0; i < 9; i++) { var x = 18 + (i % 3) * 30, y = 22 + Math.floor(i / 3) * 30, on = path.indexOf(i) >= 0; t += '<rect x="' + x + '" y="' + (y + 3) + '" width="26" height="26" rx="6" fill="#000" opacity=".25"/><rect x="' + x + '" y="' + y + '" width="26" height="26" rx="6" fill="' + (on ? "#ffd84d" : "#f6ecd6") + '"/><text x="' + (x + 13) + '" y="' + (y + 19) + '" text-anchor="middle" font-size="16" font-weight="900" fill="' + (on ? "#7a3d00" : "#5b4a8f") + '" font-family="system-ui">' + L3[i] + "</text>"; }
      return svg("", t + '<path d="M100 92l10 4-6 3-2 6Z" fill="#ff4d8d"/>');
    },
  };
  // each logo sits on its own colour tile: [top colour, bottom colour, glow]
  var TILE = {
    chess: ["#4b2fb8", "#1d1450", "#9d7bff"], checkers: ["#7a1f45", "#2a0f2e", "#ff4d8d"], connect4: ["#21307f", "#0f1640", "#4d7bff"], reversi: ["#1d6b4c", "#0b2a26", "#3ddc84"],
    ttt: ["#2d1a6b", "#120b33", "#ff4d8d"], uttt: ["#1d2a6b", "#0b1033", "#ffd84d"], dots: ["#5a2a8f", "#1f0f3d", "#4dd4ff"], mancala: ["#6b3a1d", "#2a140b", "#ffb36b"],
    dice: ["#8f1d4f", "#2e0b2a", "#ff6b81"], liars: ["#7a2a1d", "#2a0f12", "#ff8a5c"], battleship: ["#0f4c8f", "#06183d", "#4dc4ff"], crazy8: ["#6b1d8f", "#240b3d", "#ff6bcb"],
    clash: ["#8f1d2f", "#2a0b1a", "#ffbf1a"], hearts: ["#8f1d45", "#2e0b1d", "#ff4d8d"], spades: ["#2d2d5a", "#0d0d24", "#8f9dff"], poker: ["#0f6b45", "#062a1d", "#3ddc84"],
    cheat: ["#6b4a0f", "#2a1a06", "#ffd84d"], pool: ["#0f5c3d", "#062218", "#3ddc84"], ludo: ["#3a1d8f", "#160b3d", "#ffbf1a"], spymaster: ["#5a1d2a", "#1d0b1f", "#ff4d6d"],
    spy: ["#1d3a6b", "#0b1530", "#4dd4ff"], mafia: ["#3a0f2a", "#120614", "#ff4d6d"], draw: ["#8f4a1d", "#2e1a0b", "#ffd84d"], trivia: ["#4a2a8f", "#1a0f3d", "#ffd84d"],
    wordhunt: ["#6b5a1d", "#2a200b", "#ffd84d"],
  };
  var cache = {};
  function logo(id) { if (!IC[id]) return null; if (!cache[id]) cache[id] = IC[id](); return cache[id]; }
  window.__gxLogo = logo;
  var baseArt = art;
  art = function (id, small) {
    var l = logo(id); if (!l) return baseArt(id, small);
    var t = TILE[id] || ["#3a2b85", "#151137", "#b05cff"];
    return '<div class="art gx-art art-' + id + (small ? " sm" : "") + '" style="--ta:' + t[0] + ";--tb:" + t[1] + ";--tg:" + t[2] + '">' + l + "</div>";
  };

  // ===== brand mark =====
  var MARK = '<svg class="gx-mark" viewBox="0 0 64 64" aria-hidden="true"><defs><linearGradient id="gm1" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#c58bff"/><stop offset="1" stop-color="#6b3dff"/></linearGradient></defs>' +
    '<path d="M18 18h28c9 0 14 6 15 14l2 13c1 7-6 11-11 6l-6-6H18l-6 6c-5 5-12 1-11-6l2-13c1-8 6-14 15-14Z" fill="url(#gm1)"/><path d="M14 30h10M19 25v10" stroke="#fff" stroke-width="4" stroke-linecap="round"/><circle cx="44" cy="27" r="3.2" fill="#ffd84d"/><circle cx="51" cy="33" r="3.2" fill="#4dd4ff"/><circle cx="44" cy="39" r="3.2" fill="#ff4d8d"/><circle cx="37" cy="33" r="3.2" fill="#6dff9a"/><path d="M20 21h24" stroke="#fff" stroke-width="2.5" stroke-linecap="round" opacity=".35"/></svg>';
  var baseSide = sidebar;
  sidebar = function () { return baseSide.apply(this, arguments).replace('<div class="brand-i">🎮</div>', '<div class="brand-i">' + MARK + "</div>"); };

  // ===== Games page: category filter =====
  var CATS = [["all", "All"], ["Cards", "Cards"], ["Party", "Party"], ["Strategy", "Strategy"], ["Classic", "Classic"], ["Dice", "Dice & Board"], ["Word", "Word & Quiz"], ["Sports", "Arcade"]];
  var CATMAP = { Board: "Dice", Quiz: "Word", Arcade: "Sports" };
  S.cat = "all";
  function catOf(m) { return CATMAP[m.cat] || m.cat; }
  var basePage = page;
  page = function () {
    var h = basePage.apply(this, arguments);
    if (S.view === "games") {
      var chips = '<div class="gx-cats">' + CATS.map(function (c) { var n = c[0] === "all" ? GAMES.filter(function (m) { return !m.soon; }).length : GAMES.filter(function (m) { return !m.soon && catOf(m) === c[0]; }).length; return n ? '<button class="gx-cat' + (S.cat === c[0] ? " on" : "") + '" data-gxc="' + c[0] + '">' + c[1] + " <em>" + n + "</em></button>" : ""; }).join("") + "</div>";
      if (S.cat !== "all") {
        var list = GAMES.filter(function (m) { return catOf(m) === S.cat; }).map(gcard).join("");
        h = h.replace(/<div class="grid all">[\s\S]*$/, '<div class="grid all">' + list + "</div>");
      }
      var at = h.indexOf('<div class="grid all">'); if (at >= 0) h = h.slice(0, at) + chips + h.slice(at);
    }
    if (S.view === "home") {
      var hero = '<div class="hero-art gx-hero">' + ["clash", "chess", "dice", "pool", "trivia"].map(function (id, i) { return '<div class="gx-fl f' + i + '">' + logo(id) + "</div>"; }).join("") + "</div>";
      h = h.replace(/<div class="hero-art">[\s\S]*?<\/div><div class="hero-t">/, hero + '<div class="hero-t">');
      h = h.replace("<h3>⭐ Featured Games</h3>", "<h3>Featured games</h3>"); }
    h = h.replace("<h3>🎲 Tables in this call</h3>", "<h3>Tables in this call</h3>");
    return h;
  };
  document.addEventListener("click", function (e) { var b = e.target.closest("[data-gxc]"); if (!b) return; S.cat = b.getAttribute("data-gxc"); render(); });
  // featured games: a livelier pick
  var baseG = gcard;
  gcard = function (m) {
    var h = baseG(m);
    var who = (m.players || "").replace(" players", "").replace(" player", "");
    return h.replace(/<span>([^<]*) • ([^<]*)<\/span>/, '<span class="gx-meta"><i>' + esc(m.cat) + '</i><i class="pl">👥 ' + esc(who) + "</i></span>");
  };
})();

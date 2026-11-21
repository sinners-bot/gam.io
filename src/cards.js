// ---------- Game Night UI plugin: card pack (Color Clash, Hearts, Spades, Hold'em Poker) ----------
(function () {
  var CARD = { clash: 1, hearts: 1, spades: 1, poker: 1 };
  GAMES = GAMES.filter(function (m) { return !CARD[m.id]; });
  GAMES.splice(2, 0,
    { id: "clash", name: "Color Clash", cat: "Cards", players: "2–6 players", tag: "New", icon: "🌈" },
    { id: "poker", name: "Hold'em Poker", cat: "Cards", players: "2–8 players", tag: "New", icon: "💰" },
    { id: "hearts", name: "Hearts", cat: "Cards", players: "4 players", tag: "New", icon: "♥️" },
    { id: "spades", name: "Spades", cat: "Cards", players: "4 players · teams", tag: "New", icon: "♠️" });
  var skew = 0, hsel = [], hkey = "", wildCard = null, peek = 0;
  var CN = { R: "Red", G: "Green", B: "Blue", Y: "Yellow" };
  function secs(dl) { return Math.max(0, Math.ceil((dl - (Date.now() + skew)) / 1000)); }
  function cclock(dl) { return dl ? '<span class="clock" data-cdl="' + dl + '">⏱ ' + secs(dl) + "s</span>" : ""; }
  setInterval(function () { document.querySelectorAll("[data-cdl]").forEach(function (el) { el.textContent = "⏱ " + secs(+el.getAttribute("data-cdl")) + "s"; }); }, 250);
  function nm(g, i) { return g.seats[i] ? esc(g.seats[i].name) + (g.seats[i].id === S.you ? " (you)" : "") : "?"; }
  function prettyCards(t) { return t.replace(/\b([2-9TJQKA])([SHDC])\b/g, function (_, r, s) { return (r === "T" ? "10" : r) + SUIT[s]; }); }
  function names(g, txt) { return esc(txt).replace(/\{(\d+)\}/g, function (_, i) { return "<b>" + nm(g, +i) + "</b>"; }); }
  function myTurn(g) { return g.phase === "playing" && g.seat >= 0 && g.turn === g.seat; }
  function waiting(g, t) { return g.seat < 0 ? "Spectating" : t != null && t >= 0 ? "Waiting for " + nm(g, t) + "…" : ""; }

  // ---------- Color Clash ----------
  var USYM = { S: "⊘", R: "⇄", D: "+2", W: "★", F: "+4" };
  function ucard(c, extra) {
    var v = c[1], sym = USYM[v] || v;
    return '<div class="uc c' + c[0] + (extra || "") + '" data-card="' + c + '"><i>' + sym + "</i><b>" + sym + "</b><i>" + sym + "</i></div>";
  }
  function clashLog(g, t) { return names(g, t).replace(/\b([RGBYK])([0-9SRDWF])(&gt;([RGBY]))?/g, function (_, c, v, x, to) { return '<span class="ul c' + c + '">' + (USYM[v] || v) + "</span>" + (to ? ' → <span class="ul c' + to + '">' + CN[to] + "</span>" : ""); }); }
  function clashView(g) {
    var st = g.state, mine = myTurn(g), top = st.top[1];
    var ok = function (c) { return c[0] === "K" || c[0] === st.color || c[1] === top; };
    var table = '<div class="felt clash"><div class="pile' + (mine && !st.drew ? " can" : "") + '" data-act="udraw"><div class="uc back"><b>🌈</b></div><small>' + st.deck + ' left</small></div><div class="pile">' + ucard(st.top) +
      '<small>Color <span class="ul c' + st.color + '">' + CN[st.color] + '</span></small></div><div class="dir">' + (st.dir > 0 ? "↻" : "↺") + "</div></div>";
    var hand = "";
    if (st.hand) {
      hand = '<div class="hand uhand">' + st.hand.map(function (c) { return ucard(c, mine ? (ok(c) ? " ok" : " dim") : ""); }).join("") + "</div>";
      if (mine && st.drew) hand += '<div class="actions"><button class="btn dark" data-act="upass">Pass</button></div>';
    }
    var picker = wildCard ? '<div class="modal"><div class="box"><h2>Choose a color</h2><div class="cpick">' + "RGBY".split("").map(function (c) { return '<button class="uc c' + c + '" data-act="ucolor" data-c="' + c + '"><b>' + CN[c] + "</b></button>"; }).join("") + "</div></div></div>" : "";
    var bar = playerBar(g, function (i) { return '<em class="cnt' + (st.counts[i] === 1 ? " last1" : "") + '">🂠 ' + st.counts[i] + "</em>"; });
    return bar + table + '<p class="hint">' + (g.phase === "playing" ? (mine ? (st.drew ? "Play a matching card or pass" : "Play a matching card or draw") : waiting(g, g.turn)) : "") + (st.log ? ' <span class="log">· ' + clashLog(g, st.log) + "</span>" : "") + "</p>" + hand + picker;
  }

  // ---------- 4-seat card table (Hearts, Spades) ----------
  function rel(g, i) { var me = g.seat >= 0 ? g.seat : 0; return ["s", "w", "n", "e"][(i - me + 4) % 4]; }
  function table4(g, st, info) {
    var trick = st.phase === "trick" && st.last ? st.last.trick : st.trick, win = st.phase === "trick" && st.last ? st.last.winner : -1;
    var seats = g.seats.map(function (s, i) {
      return '<div class="ts ts-' + rel(g, i) + (g.turn === i && g.phase === "playing" ? " turn" : "") + (win === i ? " won" : "") + '">' + avatar(s, 40, COLORS[i]) + "<div><b>" + nm(g, i) + "</b><small>" + info(i) + "</small></div></div>";
    }).join("");
    var played = trick.map(function (t) { return '<div class="tc tc-' + rel(g, t.seat) + (t.seat === win ? " win" : "") + '">' + cardHtml(t.card) + "</div>"; }).join("");
    return '<div class="t4">' + seats + '<div class="tmid">' + played + "</div></div>";
  }
  function handRow(g, st, act, selected) {
    if (!st.hand) return "";
    var mine = myTurn(g), legal = st.legal || [];
    return '<div class="hand thand">' + st.hand.map(function (c) {
      var cls = selected ? (selected.indexOf(c) >= 0 ? " sel" : "") : mine ? (legal.indexOf(c) >= 0 ? " ok" : " dim") : "";
      return cardHtml(c, cls);
    }).join("") + "</div>";
  }

  // ---------- Hearts ----------
  function heartsView(g) {
    var st = g.state, me = g.seat;
    var key = g.id + ":" + st.handNo + ":" + st.phase;
    if (key !== hkey) { hkey = key; if (st.phase !== "pass") hsel = []; else if (st.passedMe) hsel = []; }
    var hint = "";
    if (st.phase === "pass") hint = me < 0 ? "Players are passing cards" : st.passedMe ? "Waiting for the others to pass (" + st.passedN + "/4)…" : "Pick 3 cards to pass <b>" + st.passDir + "</b> (" + hsel.length + "/3)";
    else if (st.phase === "play") hint = myTurn(g) ? (st.tricks === 0 && !st.trick.length ? "You have the 2♣ — lead it" : st.trick.length ? "Your turn — follow suit if you can" : "Your turn — lead a card" + (st.broken ? "" : " (hearts not broken)")) : waiting(g, g.turn);
    else if (st.phase === "trick" && st.last) hint = nm(g, st.last.winner) + " takes the trick";
    var got = st.got && st.got.length && st.tricks < 2 ? ' <span class="log">· you received ' + st.got.map(function (c) { return prettyCards(c); }).join(" ") + "</span>" : "";
    var info = function (i) { return st.scores[i] + " pts" + (st.pts[i] ? ' · <span class="redt">+' + st.pts[i] + "</span>" : "") + " · 🂠" + st.counts[i]; };
    var passBtn = st.phase === "pass" && me >= 0 && !st.passedMe ? '<div class="actions"><button class="btn primary" data-act="hpass"' + (hsel.length === 3 ? "" : " disabled") + ">Pass " + st.passDir + " →</button></div>" : "";
    var summary = "";
    if (st.phase === "handover" && st.history.length) {
      var h = st.history[st.history.length - 1];
      summary = '<div class="hsum panel"><h3>Hand ' + (st.handNo) + " results " + cclock(st.deadline) + "</h3>" + (h.moon >= 0 ? '<p class="gain">🌙 ' + nm(g, h.moon) + " shot the moon!</p>" : "") +
        '<table class="sc"><tr><th></th>' + g.seats.map(function (s, i) { return "<th>" + nm(g, i) + "</th>"; }).join("") + "</tr><tr><td>This hand</td>" + h.add.map(function (x) { return "<td>+" + x + "</td>"; }).join("") + "</tr><tr><td>Total</td>" + st.scores.map(function (x) { return "<td><b>" + x + "</b></td>"; }).join("") + "</tr></table><p class=muted>First to 100 ends the game — lowest score wins.</p></div>";
    }
    return '<div class="tinfo"><span>Hand ' + st.handNo + "</span><span>" + (st.broken ? "♥ broken" : "♥ not broken") + "</span><span>Lowest score wins at 100</span></div>" + table4(g, st, info) + '<p class="hint">' + hint + got + "</p>" + summary +
      handRow(g, st, st.phase === "pass" && !st.passedMe ? "hsel" : "hplay", st.phase === "pass" ? hsel : null) + passBtn;
  }

  // ---------- Spades ----------
  function spadesView(g) {
    var st = g.state, me = g.seat, mt = me >= 0 ? me % 2 : 0;
    var info = function (i) { var b = st.bids[i]; return (b === null ? "bidding…" : b === 0 ? "<b class=redt>NIL</b>" : "bid " + b) + " · won " + st.won[i]; };
    var team = function (t) { return nm(g, t) + " & " + nm(g, t + 2); };
    var board = '<div class="teams">' + [mt, 1 - mt].map(function (t) {
      var bid = (st.bids[t] || 0) + (st.bids[t + 2] || 0);
      return '<div class="team' + (t === mt && me >= 0 ? " us" : "") + '"><small>' + (t === mt && me >= 0 ? "Your team" : "Opponents") + "</small><b>" + st.score[t] + "</b><span>" + team(t) + "</span><em>bid " + bid + " · won " + (st.won[t] + st.won[t + 2]) + " · bags " + st.bags[t] + "</em></div>";
    }).join("") + "</div>";
    var hint = "", bid = "";
    if (st.phase === "bid") {
      if (myTurn(g)) {
        hint = "How many tricks will you take? Your bid adds to your partner's.";
        bid = '<div class="bids">' + [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13].map(function (n) { return '<button class="lvb' + (n === 0 ? " nil" : "") + '" data-act="sbid" data-b="' + n + '">' + (n === 0 ? "Nil" : n) + "</button>"; }).join("") + "</div>";
      } else hint = waiting(g, g.turn);
    } else if (st.phase === "play") hint = myTurn(g) ? (st.trick.length ? "Your turn — follow suit, or trump with a spade" : "Your turn — lead a card" + (st.broken ? "" : " (spades not broken)")) : waiting(g, g.turn);
    else if (st.phase === "trick" && st.last) hint = nm(g, st.last.winner) + " takes the trick";
    var summary = "";
    if (st.phase === "handover" && st.summary) {
      summary = '<div class="hsum panel"><h3>Hand ' + st.handNo + " results " + cclock(st.deadline) + "</h3>" + [0, 1].map(function (t) {
        var x = st.summary[t]; return "<p><b>" + team(t) + "</b>: bid " + x.bid + ", took " + x.took + ' → <b class="' + (x.pts >= 0 ? "gaint" : "redt") + '">' + (x.pts >= 0 ? "+" : "") + x.pts + "</b>" + (x.notes.length ? " · " + x.notes.join(", ") : "") + "</p>";
      }).join("") + "<p class=muted>First team to 300 wins.</p></div>";
    }
    return board + table4(g, st, info) + '<p class="hint">' + hint + "</p>" + bid + summary + handRow(g, st, "splay", null);
  }

  // ---------- Hold'em Poker ----------
  function pokerView(g) {
    var st = g.state, me = g.seat, mine = myTurn(g), res = st.phase === "result" ? st.result : null;
    var seats = g.seats.map(function (s, i) {
      var shown = res && res.shown[i], cards = "";
      if (st.out[i]) cards = '<span class="muted">out</span>';
      else if (shown) cards = shown.cards.map(function (c) { return cardHtml(c, " mini"); }).join("") + "<small>" + esc(shown.name) + "</small>";
      else if (i === me && st.hole) cards = st.hole.map(function (c) { return cardHtml(c, " mini"); }).join("");
      else if (st.cards[i] && !st.folded[i]) cards = '<div class="card back mini"></div><div class="card back mini"></div>';
      var chips = (i === st.dealer ? '<i class="chip d">D</i>' : "") + (i === st.sb && st.phase === "bet" ? '<i class="chip">SB</i>' : "") + (i === st.bb && st.phase === "bet" ? '<i class="chip">BB</i>' : "");
      var gain = st.gains && st.gains[i] ? '<em class="gain">+' + st.gains[i] + "</em>" : "";
      return '<div class="ps' + (g.turn === i && st.phase === "bet" ? " turn" : "") + (st.folded[i] || st.out[i] ? " fold" : "") + (res && res.winners.indexOf(i) >= 0 ? " won" : "") + '">' + avatar(s, 40, COLORS[i % COLORS.length]) + chips +
        "<b>" + nm(g, i) + "</b><span class=stack>🪙 " + st.stacks[i] + "</span>" + (st.bets[i] ? '<span class="bet">bet ' + st.bets[i] + "</span>" : "") + gain + '<div class="hole">' + cards + "</div></div>";
    }).join("");
    var board = "";
    for (var k = 0; k < 5; k++) board += st.board[k] ? cardHtml(st.board[k]) : '<div class="card slot"></div>';
    var center = '<div class="pkmid"><div class="pot">Pot 🪙 ' + st.pot + '</div><div class="board">' + board + "</div>" + (res ? '<p class="pres">' + names(g, res.text) + " " + cclock(st.deadline) + "</p>" : "") + "</div>";
    var actions = "";
    if (mine) {
      var step = st.blinds[1], minTo = st.minTo, maxTo = st.maxTo, canRaise = maxTo > st.toCall;
      actions = '<div class="pkact"><button class="btn dark" data-act="pk" data-a="fold">Fold</button>' +
        (st.call > 0 ? '<button class="btn primary" data-act="pk" data-a="call">Call ' + st.call + "</button>" : '<button class="btn primary" data-act="pk" data-a="check">Check</button>') +
        (canRaise && minTo < maxTo ? '<div class="raise"><input type="range" id="pk-r" min="' + minTo + '" max="' + maxTo + '" step="' + step + '" value="' + minTo + '"><button class="btn gold" data-act="pk" data-a="raise">' + (st.toCall > 0 ? "Raise to " : "Bet ") + '<span id="pk-v">' + minTo + "</span></button></div>" : "") +
        (canRaise ? '<button class="btn hot" data-act="pk" data-a="allin">All-in ' + maxTo + "</button>" : "") + "</div>";
    }
    var log = '<div class="pklog">' + st.log.map(function (l) { return "<span>" + names(g, l) + "</span>"; }).join("") + "</div>";
    var hint = st.phase === "bet" ? (mine ? (st.call > 0 ? "Your move — " + st.call + " to call" : "Your move — check or bet") : waiting(g, g.turn)) : "";
    return '<div class="tinfo"><span>Hand ' + st.handNo + " / " + st.maxHands + "</span><span>Blinds " + st.blinds[0] + "/" + st.blinds[1] + "</span><span>Chips only — just for fun</span></div>" +
      '<div class="pktable">' + center + '<div class="pseats">' + seats + "</div></div>" + '<p class="hint">' + hint + "</p>" + actions + log;
  }

  var R = { clash: clashView, hearts: heartsView, spades: spadesView, poker: pokerView };
  function head(g) {
    return '<div class="ghead"><button class="ghost" data-act="leave">← ' + (g.seat >= 0 ? (g.phase === "lobby" ? "Leave" : "Back") : "Games") + "</button><h2>" + art(g.type, true) + esc(g.name) + '</h2><div class="gr"></div></div>';
  }
  function overModal(g) {
    var ws = g.winners || [], youWon = ws.indexOf(S.you) >= 0, title;
    var nameOf = function (id) { var s = g.seats.filter(function (x) { return x.id === id; })[0]; return s ? esc(s.name) : "?"; };
    if (g.type === "spades") title = youWon ? "🏆 Your team wins!" : g.seat >= 0 ? "The other team wins" : ws.map(nameOf).join(" & ") + " win!";
    else if (ws.length === 1) title = youWon ? "You win!" : nameOf(ws[0]) + " wins!";
    else title = ws.length ? "It's a tie!" : "Game over";
    var sub = g.type === "hearts" && g.state ? "Final scores: " + g.state.scores.map(function (x, i) { return nm(g, i) + " " + x; }).join(" · ") : g.type === "poker" && g.state ? "Chips: " + g.state.stacks.map(function (x, i) { return nm(g, i) + " " + x; }).join(" · ") : g.type === "spades" && g.state ? "Final: " + g.state.score.join(" – ") : "";
    return '<div class="modal"><div class="box"><div class="big">' + (youWon ? "🏆" : "🃏") + "</div><h2>" + title + "</h2>" + (ws.length > 1 && g.type !== "spades" ? '<p class="muted">' + ws.map(nameOf).join(", ") + "</p>" : "") + '<p class="muted">' + sub + "</p>" + (g.seat >= 0 ? '<p class="xp">+' + (youWon ? 100 : 20) + " XP</p>" : "") +
      '<div class="actions">' + (g.seat >= 0 ? '<button class="btn primary" data-act="rematch">Play again</button>' : "") + '<button class="btn dark" data-act="back">Back to games</button><button class="btn dark" data-act="cpeek">See table</button></div></div></div>';
  }
  var baseScreen = gameScreen;
  gameScreen = function (g) {
    if (!CARD[g.type] || g.phase === "lobby" || !g.state) return baseScreen(g);
    if (g.state.now) skew = g.state.now - Date.now();
    if (g.type !== "clash") wildCard = null;
    return head(g) + '<div class="gbody g-' + g.type + '">' + R[g.type](g) + "</div>" + (g.phase === "over" && peek !== g.id ? overModal(g) : "");
  };
  var baseLobby = lobby;
  lobby = function (g) {
    var h = baseLobby(g);
    if (!CARD[g.type]) return h;
    var tips = { clash: "Match the color or symbol. ⊘ skips, ⇄ reverses, +2 and +4 make the next player draw. First to empty their hand wins.", hearts: "Avoid hearts (1 point each) and the Q♠ (13). Take them all to shoot the moon! Lowest score at 100 wins.", spades: "Partners sit across from each other. Bid your tricks, spades are trump. First team to 300 wins.", poker: "Texas Hold'em with play chips — nothing real at stake. Everyone starts with 1,000; blinds rise every 6 hands." };
    return h.replace(/<\/div>$/, '<p class="hint tip">💡 ' + tips[g.type] + "</p></div>");
  };

  app.addEventListener("input", function (e) { if (e.target.id === "pk-r") { var v = document.getElementById("pk-v"); if (v) v.textContent = e.target.value; } });
  app.addEventListener("click", function (e) {
    var el = e.target.closest("[data-act]"); if (!el || el.disabled) return;
    var a = el.getAttribute("data-act"), g = S.game;
    if (a === "cpeek") { peek = g ? g.id : 0; render(); return; }
    if (!g || !CARD[g.type]) return;
    if (a === "udraw") { if (myTurn(g) && !g.state.drew) send({ t: "move", action: "draw" }); }
    else if (a === "upass") send({ t: "move", action: "pass" });
    else if (a === "ucolor") { if (wildCard) send({ t: "move", action: "play", card: wildCard, color: el.getAttribute("data-c") }); wildCard = null; render(); }
    else if (a === "hpass") { if (hsel.length === 3) send({ t: "move", action: "pass", cards: hsel.slice() }); }
    else if (a === "sbid") send({ t: "move", bid: Number(el.getAttribute("data-b")) });
    else if (a === "pk") {
      var act = el.getAttribute("data-a"), m = { t: "move", action: act };
      if (act === "raise") { var r = document.getElementById("pk-r"); m.to = r ? Number(r.value) : 0; }
      send(m);
    }
  });
  // hand taps for the card pack are handled here (capture phase) so the base Crazy 8s hand handler never sees them
  app.addEventListener("click", function (e) {
    var g = S.game; if (!g || !CARD[g.type] || !g.state) return;
    var el = e.target.closest(".hand .card, .hand .uc"); if (!el) return;
    e.stopPropagation();
    var c = el.getAttribute("data-card"), st = g.state;
    if (g.type === "hearts" && st.phase === "pass" && !st.passedMe && g.seat >= 0) {
      var i = hsel.indexOf(c); if (i >= 0) hsel.splice(i, 1); else if (hsel.length < 3) hsel.push(c); else toast("You can only pass 3 cards");
      render(); return;
    }
    if (!myTurn(g)) return;
    if (g.type === "clash") { if (c[0] === "K") { wildCard = c; render(); } else send({ t: "move", action: "play", card: c }); }
    else send({ t: "move", card: c });
  }, true);
})();

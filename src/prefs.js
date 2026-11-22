// ---------- GAM.IO settings: sound, music, reduced motion, colour-blind mode, language (English / Deutsch) ----------
(function () {
  var SET = { sound: true, music: false, motion: false, cb: false, lang: "auto" };
  try { var saved = JSON.parse(localStorage.getItem("gx_settings") || "null"); if (saved) SET = Object.assign(SET, saved); } catch (e) {}
  var fromServer = false;
  function lang() { return SET.lang === "auto" ? (/^de\b/i.test(navigator.language || "") ? "de" : "en") : SET.lang; }
  function apply() {
    window.__gxMute = !SET.sound; window.__gxVol = SET.sound ? 1 : 0; window.__gxCalm = !!SET.motion;
    document.body.classList.toggle("gx-calm", !!SET.motion);
    document.body.classList.toggle("gx-cb", !!SET.cb);
    document.documentElement.lang = lang();
    if (SET.music) music.start(); else music.stop();
  }
  function save() {
    try { localStorage.setItem("gx_settings", JSON.stringify(SET)); } catch (e) {}
    try { send({ t: "settings", s: SET }); } catch (e) {}
    apply(); render();
  }

  // ===== background music: a soft generated chord loop (no files to download) =====
  var music = (function () {
    var ctx = null, gain = null, timer = null, on = false, step = 0;
    var CH = [[220, 277.2, 329.6, 415.3], [196, 246.9, 293.7, 370], [174.6, 220, 261.6, 329.6], [196, 246.9, 329.6, 392]];
    function tick() {
      if (!on) return;
      var t = ctx.currentTime, ch = CH[step % CH.length]; step++;
      ch.forEach(function (f, i) {
        var o = ctx.createOscillator(), g = ctx.createGain();
        o.type = i % 2 ? "triangle" : "sine"; o.frequency.value = f / (i === 0 ? 2 : 1);
        o.connect(g); g.connect(gain);
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.06, t + 1.2); g.gain.linearRampToValueAtTime(0, t + 4.2);
        o.start(t); o.stop(t + 4.4);
      });
      // a gentle melody note
      var m = ctx.createOscillator(), mg = ctx.createGain(); m.type = "sine"; m.frequency.value = ch[1 + (step % 3)] * 2;
      m.connect(mg); mg.connect(gain); mg.gain.setValueAtTime(0, t + 1); mg.gain.linearRampToValueAtTime(0.025, t + 1.3); mg.gain.exponentialRampToValueAtTime(0.0001, t + 3);
      m.start(t + 1); m.stop(t + 3.2);
    }
    return {
      start: function () {
        if (on) return;
        try {
          ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
          if (!gain) { gain = ctx.createGain(); var lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 1400; gain.connect(lp); lp.connect(ctx.destination); }
          gain.gain.value = 0.6; on = true; if (ctx.state === "suspended") ctx.resume(); tick(); timer = setInterval(tick, 4000);
        } catch (e) {}
      },
      stop: function () { on = false; clearInterval(timer); if (gain) gain.gain.value = 0; },
    };
  })();
  // browsers only allow sound after a tap, so start music on the first click if it's switched on
  document.addEventListener("pointerdown", function () { if (SET.music) music.start(); }, { once: true });

  // ===== settings panel =====
  var open = false;
  function row(key, title, sub) { return '<label class="gx-set"><div><b>' + title + "</b><small>" + sub + '</small></div><button class="gx-sw' + (SET[key] ? " on" : "") + '" data-gs="tog" data-k="' + key + '"><i></i></button></label>'; }
  function panel() {
    if (!open) return "";
    return '<div class="modal gx-setm" data-gs="bg"><div class="box"><h2>Settings</h2>' +
      row("sound", "Sound effects", "Chimes for your turn, invites and rewards") +
      row("music", "Music", "Soft background music while you play") +
      row("motion", "Reduce motion", "Turns off flying cards, bursts and other animations") +
      row("cb", "Colour-blind mode", "Adds shapes to card and piece colours") +
      '<div class="gx-set"><div><b>Language</b><small>Sprache</small></div><div class="gx-langs">' + [["auto", "Auto"], ["en", "English"], ["de", "Deutsch"]].map(function (l) { return '<button class="gx-ro' + (SET.lang === l[0] ? " on" : "") + '" data-gs="lang" data-l="' + l[0] + '">' + l[1] + "</button>"; }).join("") + "</div></div>" +
      '<button class="btn primary" data-gs="close">Done</button></div></div>';
  }
  function drawPanel() {
    var el = document.getElementById("gx-setp"); if (!el) { el = document.createElement("div"); el.id = "gx-setp"; document.body.appendChild(el); }
    el.innerHTML = panel(); translate(el);
  }
  var GEAR = '<svg viewBox="0 0 24 24"><path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zm9 4.6v-2.2l-2.4-.5a7 7 0 0 0-.7-1.7l1.4-2-1.6-1.6-2 1.4a7 7 0 0 0-1.7-.7L13.5 3h-2.2l-.5 2.4a7 7 0 0 0-1.7.7l-2-1.4-1.6 1.6 1.4 2a7 7 0 0 0-.7 1.7L3 10.9v2.2l2.4.5c.2.6.4 1.2.7 1.7l-1.4 2 1.6 1.6 2-1.4c.5.3 1.1.5 1.7.7l.5 2.4h2.2l.5-2.4c.6-.2 1.2-.4 1.7-.7l2 1.4 1.6-1.6-1.4-2c.3-.5.5-1.1.7-1.7z"/></svg>';
  var baseSide = sidebar;
  sidebar = function () { return baseSide.apply(this, arguments).replace('</nav>', '<button class="ni" data-gs="open">' + GEAR + "<span>Settings</span></button></nav>"); };
  document.addEventListener("click", function (e) {
    var el = e.target.closest("[data-gs]"); if (!el) return;
    var a = el.getAttribute("data-gs");
    if (a === "bg" && e.target !== el) return;
    e.preventDefault();
    if (a === "open") { open = true; drawPanel(); }
    else if (a === "close" || a === "bg") { open = false; drawPanel(); }
    else if (a === "tog") { var k = el.getAttribute("data-k"); SET[k] = !SET[k]; save(); drawPanel(); }
    else if (a === "lang") { SET.lang = el.getAttribute("data-l"); save(); drawPanel(); }
  });
  // phones: a gear in the top bar
  var baseRender = render;
  render = function () {
    if (!fromServer && S.me && S.me.settings && Object.keys(S.me.settings).length && !localStorage.getItem("gx_settings")) { fromServer = true; SET = Object.assign(SET, S.me.settings); apply(); }
    baseRender.apply(this, arguments);
    try {
      var top = app.querySelector(".top .me"); if (top && !top.querySelector(".gx-gear")) top.insertAdjacentHTML("beforebegin", '<button class="gx-gear" data-gs="open" aria-label="Settings">' + GEAR + "</button>");
      if (SET.cb) app.querySelectorAll(".c4 .disc").forEach(function (d) { var c = d.style.getPropertyValue("--pc").trim(); d.setAttribute("data-cb", c === COLORS[0] ? "●" : "✕"); });
    } catch (er) {}
  };

  // ===== German =====
  var DE = {
    "Home": "Start", "Games": "Spiele", "Compete": "Wettkampf", "Leaderboard": "Bestenliste", "Profile": "Profil", "Settings": "Einstellungen", "Done": "Fertig",
    "All games": "Alle Spiele", "Your profile": "Dein Profil", "In this call": "In diesem Anruf", "Invite Friends": "Freunde einladen", "Invite": "Einladen",
    "Your next game": "Dein nächstes Spiel", "starts here.": "beginnt hier.", "Pick a game and play together with everyone in your call.": "Such dir ein Spiel aus und spiel mit allen in deinem Anruf.",
    "Play with friends": "Mit Freunden spielen", "Quick match": "Schnelles Spiel", "Featured games": "Empfohlene Spiele", "View all →": "Alle ansehen →", "See all →": "Alle ansehen →",
    "Your Recent Games": "Deine letzten Spiele", "Your games will show up here.": "Deine Spiele erscheinen hier.", "Reach new levels!": "Erreiche neue Level!", "View Profile": "Profil ansehen",
    "Earn XP every game, win to level up and climb the leaderboard.": "Sammle in jedem Spiel XP, gewinne, steig im Level auf und klettere in der Bestenliste.",
    "Hanging out": "Chillt", "Rookie": "Neuling", "Rising Star": "Aufsteiger", "Pro": "Profi", "Champion": "Champion", "Legend": "Legende",
    "Tables in this call": "Tische in diesem Anruf", "Join": "Beitreten", "Watch": "Zuschauen", "Return": "Zurück", "● Playing": "● Läuft", "Finished": "Beendet",
    "All": "Alle", "Cards": "Karten", "Party": "Party", "Strategy": "Strategie", "Classic": "Klassisch", "Dice & Board": "Würfel & Brett", "Word & Quiz": "Wort & Quiz", "Arcade": "Arcade", "Board": "Brett", "Dice": "Würfel", "Word": "Wort", "Quiz": "Quiz", "Sports": "Sport",
    "Popular": "Beliebt", "Hot": "Heiß", "New": "Neu",
    "Chess": "Schach", "Checkers": "Dame", "Connect 4": "Vier gewinnt", "Dots & Boxes": "Käsekästchen", "Sea Battle": "Schiffe versenken", "Draw & Guess": "Zeichnen & Raten", "Word Hunt": "Wortjagd",
    "Lucky Dice": "Glückswürfel", "Liar's Dice": "Lügenwürfel", "Cheat": "Mogeln", "Who's the Spy?": "Wer ist der Spion?", "Tic-Tac-Toe": "Tic-Tac-Toe", "Ultimate Tic-Tac-Toe": "Ultimate Tic-Tac-Toe",
    "Hold'em Poker": "Hold'em Poker", "8-Ball Pool": "8-Ball Billard", "Crazy 8s": "Verrückte 8", "Hearts": "Hearts", "Spades": "Spades", "Bomb Party": "Bombenparty", "Typing Race": "Tipp-Rennen", "Backgammon": "Backgammon", "Gin Rummy": "Gin Rommé", "Minesweeper Battle": "Minensucher-Duell", "Snake Party": "Snake-Party",
    "← Back": "← Zurück", "← Leave": "← Verlassen", "← Games": "← Spiele", "Back": "Zurück", "Leave": "Verlassen", "Resign": "Aufgeben", "Tap Resign again to give up": "Tippe nochmal auf Aufgeben",
    "Leave seat": "Platz verlassen", "Start game": "Spiel starten", "Join game": "Mitspielen", "Waiting for players…": "Warte auf Spieler…", "Host": "Gastgeber", "Computer": "Computer", "Open seat": "Freier Platz",
    "🤖 Play against the computer:": "🤖 Gegen den Computer spielen:", "Easy": "Leicht", "Medium": "Mittel", "Hard": "Schwer",
    "Who can join?": "Wer darf beitreten?", "This call": "Dieser Anruf", "My server": "Mein Server", "Everyone": "Alle",
    "⚙️ Rules": "⚙️ Regeln", "set by the host": "legt der Gastgeber fest", "Turn timer": "Zugzeit", "Normal": "Normal", "Fast": "Schnell", "Relaxed": "Entspannt", "Off": "Aus", "On": "An",
    "Ranked": "Gewertet", "Stack +2 / +4": "+2 / +4 stapeln", "Draw until you can play": "Ziehen, bis du legen kannst", "Rounds": "Runden", "Word pack": "Wortpaket", "Animals": "Tiere", "Food": "Essen", "Things": "Dinge",
    "Questions": "Fragen", "Play to": "Spielen bis", "Lives": "Leben", "Text length": "Textlänge", "Short": "Kurz", "Long": "Lang", "Round length": "Rundenlänge", "Small": "Klein", "Large": "Groß", "Match to": "Match bis",
    "Your turn": "Du bist dran", "YOUR TURN": "DU BIST DRAN", "Play again": "Nochmal spielen", "Back to games": "Zurück zu den Spielen", "See table": "Tisch ansehen", "You win!": "Du gewinnst!", "Game over": "Spiel vorbei", "Spectating": "Zuschauer",
    "Pass": "Passen", "Pick a color": "Wähle eine Farbe", "Cancel": "Abbrechen", "Red": "Rot", "Green": "Grün", "Blue": "Blau", "Yellow": "Gelb",
    "Your turn! Match the color or symbol, or draw": "Du bist dran! Passe Farbe oder Symbol an, oder ziehe", "Play the card you drew, or pass": "Spiel die gezogene Karte oder passe",
    "Your move (white)": "Dein Zug (Weiß)", "Your move (black)": "Dein Zug (Schwarz)", "Your turn — tap a column": "Du bist dran: tippe auf eine Spalte", "Your fleet": "Deine Flotte", "Enemy waters": "Feindliche Gewässer",
    "Shuffle": "Mischen", "Ready": "Bereit", "Place your fleet — shuffle until you like it, then lock in": "Platziere deine Flotte: mische, bis sie dir gefällt, dann bestätige",
    "Daily challenges": "Tägliche Herausforderungen", "Achievements": "Erfolge", "Locker": "Spind", "Card backs": "Kartenrücken", "Board themes": "Brett-Designs", "Profile frames": "Profilrahmen", "Emote packs": "Emote-Pakete",
    "Equip": "Ausrüsten", "Equipped": "Ausgerüstet", "Unlocked": "Freigeschaltet", "Per game": "Pro Spiel", "Wins": "Siege", "Played": "Gespielt", "Total XP": "XP gesamt",
    "Play 5 games": "Spiele 5 Partien", "Win 3 games": "Gewinne 3 Partien", "Play 3 different games": "Spiele 3 verschiedene Spiele", "Win a card game": "Gewinne ein Kartenspiel", "Win a board game": "Gewinne ein Brettspiel",
    "Play 2 party games": "Spiele 2 Partyspiele", "Play 2 games with friends": "Spiele 2 Partien mit Freunden", "Beat a Hard bot": "Besiege einen schweren Bot", "Win a dice or arcade game": "Gewinne ein Würfel- oder Arcadespiel", "Play a ranked match": "Spiele ein gewertetes Match",
    "First Victory": "Erster Sieg", "Win your first game": "Gewinne dein erstes Spiel", "Winner": "Gewinner", "Win 10 games": "Gewinne 10 Spiele", "Veteran": "Veteran", "Win 50 games": "Gewinne 50 Spiele", "Win 100 games": "Gewinne 100 Spiele",
    "Regular": "Stammgast", "Play 25 games": "Spiele 25 Partien", "Explorer": "Entdecker", "Play 10 different games": "Spiele 10 verschiedene Spiele", "Completionist": "Komplettierer", "Play every game at least once": "Spiele jedes Spiel mindestens einmal",
    "All-Rounder": "Allrounder", "Win a card, board, party and arcade game": "Gewinne ein Karten-, Brett-, Party- und Arcadespiel", "Bot Slayer": "Bot-Bezwinger", "Machine Breaker": "Maschinenbrecher", "Beat Hard bots 10 times": "Besiege 10-mal schwere Bots",
    "Hot Streak": "Siegesserie", "Win 3 games in a row": "Gewinne 3 Spiele in Folge", "Unstoppable": "Unaufhaltsam", "Win 5 games in a row": "Gewinne 5 Spiele in Folge", "Social Butterfly": "Geselliger Typ", "Play with 5 different people": "Spiele mit 5 verschiedenen Leuten",
    "Host with the Most": "Bester Gastgeber", "Open 10 tables": "Eröffne 10 Tische", "Daily Grind": "Täglicher Fleiß", "Finish all 3 daily challenges": "Schließe alle 3 Tagesaufgaben ab", "Dedicated": "Hingebungsvoll", "Finish the daily challenges on 7 days": "Schließe die Tagesaufgaben an 7 Tagen ab",
    "Contender": "Herausforderer", "Gold Rank": "Goldrang", "Reach 1400 rating in any ranked game": "Erreiche 1400 Wertung in einem gewerteten Spiel", "Diamond Rank": "Diamantrang", "Reach 1550 rating in any ranked game": "Erreiche 1550 Wertung in einem gewerteten Spiel",
    "Win a tournament": "Gewinne ein Turnier", "Double Digits": "Zweistellig", "Reach level 10": "Erreiche Level 10",
    "Tournaments": "Turniere", "This server": "Dieser Server", "Host a tournament": "Turnier veranstalten", "Create": "Erstellen", "4 players": "4 Spieler", "8 players": "8 Spieler", "16 players": "16 Spieler", "Name (optional)": "Name (optional)",
    "Start": "Starten", "▶ Play your match": "▶ Spiel dein Match", "Final": "Finale", "Champion": "Champion", "Bye": "Freilos", "⚔️ Find ranked match": "⚔️ Gewertetes Match suchen", "⚔️ Ranked": "⚔️ Gewertet", "🏆 Tournament": "🏆 Turnier",
    "No tournaments on this server yet. Host one and everyone here gets notified.": "Auf diesem Server gibt es noch keine Turniere. Veranstalte eins, dann bekommen alle hier Bescheid.", "No ranked games this season yet. Be the first!": "Diese Saison gab es noch keine gewerteten Spiele. Sei der Erste!",
    "Ranked this season": "Gewertet in dieser Saison", "Sound effects": "Soundeffekte", "Music": "Musik", "Reduce motion": "Weniger Bewegung", "Colour-blind mode": "Farbenblind-Modus", "Language": "Sprache",
    "Chimes for your turn, invites and rewards": "Töne für deinen Zug, Einladungen und Belohnungen", "Soft background music while you play": "Leise Hintergrundmusik beim Spielen",
    "Turns off flying cards, bursts and other animations": "Schaltet fliegende Karten, Effekte und andere Animationen aus", "Adds shapes to card and piece colours": "Fügt Karten- und Steinfarben Formen hinzu",
    "Daily challenge done": "Tagesaufgabe geschafft", "All daily challenges done!": "Alle Tagesaufgaben geschafft!", "You levelled up": "Du bist aufgestiegen", "Spectate": "Zuschauen",
    "Pick a game to open your own table. Everyone in the call gets an invite, and several tables can run at once.": "Wähle ein Spiel, um deinen eigenen Tisch zu eröffnen. Alle im Anruf bekommen eine Einladung, und mehrere Tische können gleichzeitig laufen.",
    "💡 Pick a game to open your own table. Everyone in the call gets an invite, and several tables can run at once.": "💡 Wähle ein Spiel, um deinen eigenen Tisch zu eröffnen. Alle im Anruf bekommen eine Einladung, und mehrere Tische können gleichzeitig laufen.",
    "share the call and wait for friends to join": "teile den Anruf und warte auf Freunde", "a seat is open — jump in!": "ein Platz ist frei, spring rein!",
    "Your Recent Games": "Deine letzten Spiele", "Find ranked match": "Gewertetes Match suchen", "Play your match": "Spiel dein Match", "Tournament": "Turnier",
    "Match the color or symbol. ⊘ skips, ⇄ reverses, +2 and +4 make the next player draw. First to empty their hand wins.": "Passe Farbe oder Symbol an. ⊘ setzt aus, ⇄ dreht um, +2 und +4 lassen den Nächsten ziehen. Wer zuerst keine Karten mehr hat, gewinnt.",
    "Type your guess...": "Dein Tipp...", "Type your guess…": "Dein Tipp…", "Undo": "Rückgängig", "Clear": "Löschen", "↶ Undo": "↶ Rückgängig", "🗑 Clear": "🗑 Löschen",
  };
  var RX = [
    [/^Waiting for (.+)…$/, "Warte auf $1…"], [/^(.+) wins!$/, "$1 gewinnt!"], [/^(.+) opened a$/, "$1 hat einen"], [/^ table$/, " Tisch eröffnet"],
    [/^Level (\d+)$/, "Level $1"], [/^(\d+) wins · (\d+) played$/, "$1 Siege · $2 gespielt"], [/^Resets in (.+)$/, "Neu in $1"], [/^In call · (\d+)$/, "Im Anruf · $1"],
    [/^Open · (\d+)\/(\d+) seats$/, "Offen · $1/$2 Plätze"], [/^(\d+) players · (.+)$/, "$1 Spieler · $2"], [/^(\d+)–(\d+) players · (.+)$/, "$1–$2 Spieler · $3"],
    [/^Round (\d+)$/, "Runde $1"], [/^Sign-ups open · (\d+)\/(\d+)$/, "Anmeldung offen · $1/$2"], [/^● Round (\d+) in progress$/, "● Runde $1 läuft"],
    [/^(.+) ran out of time, so a move was made for them$/, "$1 hatte keine Zeit mehr, also wurde für sie gezogen"], [/^(.+) left, so a bot took over their seat$/, "$1 ist gegangen, ein Bot hat den Platz übernommen"],
    [/^(\d+) \/ (\d+) XP$/, "$1 / $2 XP"], [/^Your (.+) rating$/, "Deine $1-Wertung"], [/^(\d+) wins · (\d+) ranked games$/, "$1 Siege · $2 gewertete Spiele"],
    [/^🎁 Finish all three for a \+(\d+) XP bonus$/, "🎁 Schaffe alle drei für +$1 XP Bonus"], [/^🎉 All done! Bonus \+(\d+) XP collected$/, "🎉 Alles geschafft! +$1 XP Bonus kassiert"],
    [/^\+(\d+) is coming your way! Stack another, or draw (\d+)$/, "+$1 kommt auf dich zu! Leg noch eine drauf oder zieh $2"], [/^You're at the$/, "Du bist am"],
    [/^Season (.+) · resets monthly$/, "Saison $1 · monatlicher Reset"], [/^Level (\d+)!$/, "Level $1!"], [/^New (.+) unlocked$/, "Neues Item freigeschaltet"],
  ];
  function tr(t) {
    var k = t.trim(); if (!k) return null;
    if (DE.hasOwnProperty(k)) return t.replace(k, DE[k]);
    var m = k.match(/^([^A-Za-z0-9]+)(.+)$/); // leading icons, arrows or spaces
    if (m && DE.hasOwnProperty(m[2].trim())) return t.replace(k, m[1] + DE[m[2].trim()]);
    for (var i = 0; i < RX.length; i++) if (RX[i][0].test(k)) return t.replace(k, k.replace(RX[i][0], RX[i][1]));
    return null;
  }
  var busy = false;
  function translate(root) {
    if (lang() !== "de" || !root) return;
    busy = true;
    try {
      var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: function (n) { var p = n.parentNode; return p && /^(SCRIPT|STYLE|TEXTAREA)$/.test(p.nodeName) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT; } }), n, list = [];
      while ((n = w.nextNode())) list.push(n);
      list.forEach(function (x) { var r = tr(x.nodeValue); if (r != null && r !== x.nodeValue) x.nodeValue = r; });
      (root.querySelectorAll ? root.querySelectorAll("[placeholder],[title]") : []).forEach(function (el) { ["placeholder", "title"].forEach(function (a) { var v = el.getAttribute(a); if (v) { var r = tr(v); if (r != null) el.setAttribute(a, r); } }); });
    } catch (e) {}
    busy = false;
  }
  new MutationObserver(function (muts) {
    if (busy || lang() !== "de") return;
    muts.forEach(function (m) { m.addedNodes.forEach(function (n) { if (n.nodeType === 1) translate(n); else if (n.nodeType === 3) { var r = tr(n.nodeValue); if (r != null && r !== n.nodeValue) { busy = true; n.nodeValue = r; busy = false; } } }); });
  }).observe(document.body, { childList: true, subtree: true });
  window.__gxT = function (s) { return lang() === "de" ? tr(s) || s : s; };
  apply();
  setTimeout(function () { translate(document.body); }, 0);
})();

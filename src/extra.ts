// Game Night plugin: 8-Ball Pool and Ludo, with bots. Loaded by the game server at startup.
// No template literals in this file: it is embedded in a String.raw block by the service that serves it.
export default function register(api: any) {
  const shuffle: (a: any[]) => any[] = api.shuffle;
  const rnd = (a: any[]) => a[Math.floor(Math.random() * a.length)];
  const now = () => Date.now();

  // ======================= 8-Ball Pool =======================
  // Table 1000 x 500. Ball 0 = cue, 1-7 solids, 8 = eight, 9-15 stripes.
  const W = 1000, H = 500, R = 13, HEAD_X = 250, FOOT_X = 750;
  const POCKETS = [[0, 0, 30], [500, -6, 28], [1000, 0, 30], [0, 500, 30], [500, 506, 28], [1000, 500, 30]];
  const MAXV = 42, SUB = 4, FRAME_EVERY = 2, MAX_TICKS = 1100;
  const kind = (id: number) => (id === 0 ? "cue" : id === 8 ? "eight" : id < 8 ? "solid" : "stripe");
  function rack() {
    const b: any[] = Array.from({ length: 16 }, () => ({ x: 0, y: 0, in: false }));
    b[0] = { x: HEAD_X, y: H / 2, in: false };
    const rest = shuffle([1, 2, 3, 4, 5, 6, 7, 9, 10, 11, 12, 13, 14, 15]);
    // back corners: one solid and one stripe; 8 in the middle of row 3
    const solid = rest.find((i: number) => i < 8), stripe = rest.find((i: number) => i > 8);
    const others = rest.filter((i: number) => i !== solid && i !== stripe);
    const order: number[] = [];
    let k = 0;
    for (let r = 0; r < 5; r++) for (let i = 0; i <= r; i++) {
      if (r === 2 && i === 1) order.push(8);
      else if (r === 4 && i === 0) order.push(solid);
      else if (r === 4 && i === 4) order.push(stripe);
      else order.push(others[k++]);
    }
    let n = 0;
    for (let r = 0; r < 5; r++) for (let i = 0; i <= r; i++) {
      const id = order[n++];
      b[id] = { x: FOOT_X + r * (2 * R * 0.866 + 0.6), y: H / 2 + (i - r / 2) * (2 * R + 0.6), in: false };
    }
    return b;
  }
  // Runs one shot. Returns the replay frames, potted balls in order, and the first ball the cue touched.
  function simulate(balls0: any[], angle: number, power: number, record: boolean) {
    const b = balls0.map((p: any) => ({ x: p.x, y: p.y, in: p.in, vx: 0, vy: 0 }));
    const sp = Math.max(0.05, Math.min(1, power)) * MAXV;
    b[0].vx = Math.cos(angle) * sp; b[0].vy = Math.sin(angle) * sp;
    const frames: number[][] = [], potted: number[] = [];
    let first = -1, rails = 0;
    const snap = () => { const f: number[] = []; for (const p of b) { f.push(p.in ? -1 : Math.round(p.x), p.in ? -1 : Math.round(p.y)); } frames.push(f); };
    if (record) snap();
    for (let t = 0; t < MAX_TICKS; t++) {
      let moving = false;
      for (let s = 0; s < SUB; s++) {
        for (let i = 0; i < 16; i++) {
          const p = b[i]; if (p.in || (!p.vx && !p.vy)) continue;
          p.x += p.vx / SUB; p.y += p.vy / SUB;
          let gone = false;
          for (const [px, py, pr] of POCKETS) if ((p.x - px) ** 2 + (p.y - py) ** 2 < pr * pr) { p.in = true; p.vx = p.vy = 0; potted.push(i); gone = true; break; }
          if (gone) continue;
          if (p.x < R) { p.x = R; p.vx = -p.vx * 0.82; rails++; } else if (p.x > W - R) { p.x = W - R; p.vx = -p.vx * 0.82; rails++; }
          if (p.y < R) { p.y = R; p.vy = -p.vy * 0.82; rails++; } else if (p.y > H - R) { p.y = H - R; p.vy = -p.vy * 0.82; rails++; }
        }
        for (let i = 0; i < 16; i++) {
          const p = b[i]; if (p.in) continue;
          for (let j = i + 1; j < 16; j++) {
            const q = b[j]; if (q.in) continue;
            const dx = q.x - p.x, dy = q.y - p.y, d2 = dx * dx + dy * dy;
            if (d2 >= 4 * R * R || d2 === 0) continue;
            const d = Math.sqrt(d2), nx = dx / d, ny = dy / d, ov = (2 * R - d) / 2;
            p.x -= nx * ov; p.y -= ny * ov; q.x += nx * ov; q.y += ny * ov;
            const vn = (p.vx - q.vx) * nx + (p.vy - q.vy) * ny;
            if (vn > 0) {
              const e = vn * 0.97;
              p.vx -= e * nx; p.vy -= e * ny; q.vx += e * nx; q.vy += e * ny;
              if (first < 0 && (i === 0 || j === 0)) first = i === 0 ? j : i;
            }
          }
        }
      }
      for (const p of b) {
        if (p.in) continue;
        const v = Math.hypot(p.vx, p.vy);
        if (v < 0.06) { p.vx = p.vy = 0; continue; }
        const nv = Math.max(0, v * 0.987 - 0.012);
        p.vx *= nv / v; p.vy *= nv / v; moving = true;
      }
      if (record && t % FRAME_EVERY === 0) snap();
      if (!moving) break;
    }
    if (record) snap();
    return { balls: b.map((p) => ({ x: p.x, y: p.y, in: p.in })), frames, potted, first, rails };
  }
  const freeSpot = (balls: any[], x: number, y: number, skip = 0) => x >= R && x <= W - R && y >= R && y <= H - R && balls.every((p: any, i: number) => i === skip || p.in || (p.x - x) ** 2 + (p.y - y) ** 2 >= 4 * R * R + 1);
  function placeNear(balls: any[], x: number, y: number, skip: number) {
    for (let r = 0; r < 400; r += 4) for (let a = 0; a < 16; a++) {
      const px = x + Math.cos(a * Math.PI / 8) * r, py = y + Math.sin(a * Math.PI / 8) * r;
      if (freeSpot(balls, px, py, skip)) return [px, py];
    }
    return [x, y];
  }
  const groupOf = (s: any, seat: number) => s.groups[seat];
  const remaining = (s: any, g: string) => s.balls.filter((p: any, i: number) => !p.in && kind(i) === g).length;
  const targetKind = (s: any, seat: number) => { const g = groupOf(s, seat); if (!g) return "open"; return remaining(s, g) ? g : "eight"; };
  const pool = {
    name: "8-Ball Pool", min: 2, max: 2,
    init() { return { balls: rack(), turn: 0, groups: [null, null], inHand: true, kitchen: true, broke: false, phase: "aim", shot: 0, replay: null, msg: "Break! Place the cue ball behind the line, then shoot.", deadline: 0 }; },
    turn: (s: any) => (s.phase === "aim" ? s.turn : null),
    view(s: any, seat: number) {
      return { balls: s.balls.map((p: any) => (p.in ? null : [Math.round(p.x * 10) / 10, Math.round(p.y * 10) / 10])), turn: s.turn, groups: s.groups, inHand: s.inHand, kitchen: s.kitchen, phase: s.phase, shot: s.shot,
        replay: s.phase === "rolling" ? s.replay : null, msg: s.msg, deadline: s.deadline, now: now(), target: [targetKind(s, 0), targetKind(s, 1)], left: { solid: remaining(s, "solid"), stripe: remaining(s, "stripe") }, me: seat };
    },
    move(s: any, seat: number, m: any) {
      if (s.phase !== "aim") return { err: "Wait for the balls to stop" };
      if (s.turn !== seat) return { err: "Not your turn" };
      if (m.action === "place") {
        if (!s.inHand) return { err: "You don't have ball in hand" };
        const x = Number(m.x), y = Number(m.y);
        if (!(x >= R && x <= W - R && y >= R && y <= H - R)) return { err: "Place it on the table" };
        if (s.kitchen && x > HEAD_X) return { err: "Place the cue ball behind the line for the break" };
        if (!freeSpot(s.balls, x, y)) return { err: "Too close to another ball" };
        s.balls[0] = { x, y, in: false }; return {};
      }
      if (m.action !== "shoot") return { err: "Bad move" };
      const angle = Number(m.angle), power = Number(m.power);
      if (!isFinite(angle) || !(power > 0 && power <= 1)) return { err: "Bad shot" };
      const before = targetKind(s, seat), opp = 1 - seat;
      const r = simulate(s.balls, angle, power, true);
      s.balls = r.balls; s.shot++;
      s.replay = { frames: r.frames, shot: s.shot, by: seat };
      s.phase = "rolling"; s.deadline = now() + Math.round((r.frames.length / 30) * 1000) + 600;
      const wasBreak = !s.broke; s.broke = true; s.kitchen = false; s.inHand = false;
      const potted = r.potted, scratch = potted.includes(0), eight = potted.includes(8);
      let foul = "";
      if (scratch) foul = "Scratch — the cue ball went in";
      else if (r.first < 0) foul = "No ball was hit";
      else if (before === "open" && r.first === 8 && !wasBreak) foul = "You can't hit the 8 first on an open table";
      else if (before !== "open" && kind(r.first) !== before) foul = "Wrong ball hit first";
      const names = potted.filter((i) => i !== 0);
      s.msg = names.length ? "Potted " + names.join(", ") + "." : "";
      if (eight) {
        if (wasBreak) { // re-spot the 8 on the break
          const [x, y] = placeNear(s.balls, FOOT_X, H / 2, 8); s.balls[8] = { x, y, in: false };
          s.msg += " The 8 is re-spotted.";
        } else {
          s.endRes = before === "eight" && !foul ? { winner: seat } : { winner: opp };
          s.msg = before === "eight" && !foul ? "{" + seat + "} sinks the 8 and wins!" : "{" + seat + "} " + (foul ? "fouled on the 8" : "sank the 8 too early") + " — {" + opp + "} wins!";
          return {};
        }
      }
      if (scratch) { s.balls[0] = { x: HEAD_X, y: H / 2, in: false }; const [x, y] = placeNear(s.balls, HEAD_X, H / 2, 0); s.balls[0] = { x, y, in: false }; }
      if (foul) { s.turn = opp; s.inHand = true; s.msg = (s.msg + " Foul: " + foul + ". {" + opp + "} has ball in hand.").trim(); return {}; }
      const legal = names.filter((i) => i !== 8);
      if (before === "open" && legal.length && !wasBreak) {
        const g = kind(legal[0]); s.groups[seat] = g; s.groups[opp] = g === "solid" ? "stripe" : "solid";
        s.msg += " {" + seat + "} is " + g + "s.";
        return {};
      }
      const own = before === "open" ? legal.length > 0 : legal.some((i) => kind(i) === before);
      if (!own) { s.turn = opp; s.msg = (s.msg + " {" + opp + "} to shoot.").trim(); }
      else s.msg += " Shoot again!";
      return {};
    },
    tick(s: any) {
      if (s.phase !== "rolling") return {};
      s.phase = "aim"; s.replay = null; s.deadline = 0;
      if (s.endRes) { s.phase = "done"; return { done: true, winner: s.endRes.winner }; }
      return {};
    },
    bot(s: any, seat: number, level: string) {
      const tk = targetKind(s, seat);
      const ok = (i: number) => !s.balls[i].in && i !== 0 && (tk === "open" ? i !== 8 : kind(i) === tk);
      const targets = [...Array(16).keys()].filter(ok);
      const noise = level === "easy" ? 0.05 : level === "medium" ? 0.02 : 0.009;
      // ball in hand: put the cue in a good spot for the easiest shot
      if (s.inHand) {
        let best: any = null;
        for (const t of targets) for (const [px, py] of POCKETS) {
          const bx = s.balls[t].x, by = s.balls[t].y, dl = Math.hypot(px - bx, py - by), ux = (px - bx) / dl, uy = (py - by) / dl;
          for (const back of [120, 200, 80]) {
            const cx = bx - ux * (2 * R + back), cy = by - uy * (2 * R + back);
            if (s.kitchen && cx > HEAD_X) continue;
            if (!freeSpot(s.balls, cx, cy, 0)) continue;
            const sc = -dl - back * 0.3;
            if (!best || sc > best.sc) best = { sc, cx, cy };
          }
        }
        let cx = best ? best.cx : HEAD_X, cy = best ? best.cy : H / 2;
        if (!freeSpot(s.balls, cx, cy, 0)) [cx, cy] = placeNear(s.balls, cx, cy, 0);
        if (s.kitchen) { cx = Math.min(cx, HEAD_X); if (!freeSpot(s.balls, cx, cy, 0)) [cx, cy] = [HEAD_X - 30, H / 2 + (Math.random() - 0.5) * 200]; }
        const valid = freeSpot(s.balls, cx, cy, 0) && !(s.kitchen && cx > HEAD_X);
        if (valid && Math.hypot(cx - s.balls[0].x, cy - s.balls[0].y) > 1) return { action: "place", x: cx, y: cy };
      }
      const cue = s.balls[0];
      if (!s.broke) return { action: "shoot", angle: Math.atan2(H / 2 - cue.y, FOOT_X - cue.x) + (Math.random() - 0.5) * 0.02, power: 1 };
      const blocked = (x1: number, y1: number, x2: number, y2: number, skip: number[]) => s.balls.some((p: any, i: number) => {
        if (p.in || skip.includes(i)) return false;
        const dx = x2 - x1, dy = y2 - y1, L = dx * dx + dy * dy, t = Math.max(0, Math.min(1, ((p.x - x1) * dx + (p.y - y1) * dy) / L));
        return (p.x - x1 - t * dx) ** 2 + (p.y - y1 - t * dy) ** 2 < (2 * R - 1) ** 2;
      });
      const cands: any[] = [];
      for (const t of targets) for (const [px, py] of POCKETS) {
        const bx = s.balls[t].x, by = s.balls[t].y, dl = Math.hypot(px - bx, py - by), ux = (px - bx) / dl, uy = (py - by) / dl;
        const gx = bx - ux * 2 * R, gy = by - uy * 2 * R, dc = Math.hypot(gx - cue.x, gy - cue.y);
        const ax = (gx - cue.x) / dc, ay = (gy - cue.y) / dc, cut = Math.acos(Math.max(-1, Math.min(1, ax * ux + ay * uy)));
        if (cut > 1.35) continue;
        if (blocked(cue.x, cue.y, gx, gy, [0, t]) || blocked(bx, by, px, py, [t])) continue;
        const power = Math.min(1, 0.25 + (dc + dl) / 1500 + cut * 0.25);
        cands.push({ angle: Math.atan2(ay, ax), power, sc: -(dc + dl * 1.2) - cut * 400, t });
      }
      cands.sort((a, b) => b.sc - a.sc);
      if (level === "hard" && cands.length && Math.random() < 0.8) { // verify by simulating, keep the first shot that pots our ball without fouling
        for (const c of cands.slice(0, 4)) for (const dp of [0, 0.12, -0.08]) {
          const r = simulate(s.balls, c.angle, Math.min(1, c.power + dp), false);
          const good = !r.potted.includes(0) && r.first >= 0 && (tk === "open" ? r.first !== 8 : kind(r.first) === tk) && r.potted.some((i) => i !== 8 && i !== 0 && (tk === "open" || kind(i) === tk || tk === "eight")) && (!r.potted.includes(8) || tk === "eight");
          const good8 = tk === "eight" && r.potted.includes(8) && !r.potted.includes(0) && r.first === 8;
          if (good || good8) return { action: "shoot", angle: c.angle + (Math.random() - 0.5) * noise, power: Math.min(1, c.power + dp) };
        }
      }
      if (cands.length && !(level === "easy" && Math.random() < 0.25)) {
        const c = level === "easy" ? rnd(cands.slice(0, 4)) : cands[0];
        return { action: "shoot", angle: c.angle + (Math.random() - 0.5) * noise * 2, power: c.power };
      }
      // no clean pot: hit the nearest legal ball softly
      const t = targets.sort((a, b) => Math.hypot(s.balls[a].x - cue.x, s.balls[a].y - cue.y) - Math.hypot(s.balls[b].x - cue.x, s.balls[b].y - cue.y))[0];
      if (t == null) return { action: "shoot", angle: Math.random() * 6.28, power: 0.4 };
      return { action: "shoot", angle: Math.atan2(s.balls[t].y - cue.y, s.balls[t].x - cue.x) + (Math.random() - 0.5) * noise, power: 0.45 };
    },
  };

  // ======================= Ludo =======================
  // Track squares 0-51 (global); a token's progress p: -1 yard, 0-50 on the track, 51-55 home column, 56 finished.
  const SAFE = [0, 8, 13, 21, 26, 34, 39, 47];
  const colorsFor = (n: number) => (n === 2 ? [0, 2] : n === 3 ? [0, 1, 2] : [0, 1, 2, 3]);
  const glob = (color: number, p: number) => (p >= 0 && p <= 50 ? (color * 13 + p) % 52 : -1);
  function ludoMoves(s: any, seat: number) {
    const d = s.die, out: number[] = [];
    s.tokens[seat].forEach((p: number, k: number) => {
      if (p === -1) { if (d === 6) out.push(k); }
      else if (p < 56 && p + d <= 56) out.push(k);
    });
    return out;
  }
  function ludoNext(s: any) { s.turn = (s.turn + 1) % s.tokens.length; s.sixes = 0; }
  function ludoTarget(s: any, seat: number, k: number) { const p = s.tokens[seat][k]; return p === -1 ? 0 : p + s.die; }
  const occupants = (s: any, g: number) => { const o: number[][] = []; s.tokens.forEach((ts: number[], seat: number) => ts.forEach((p, k) => { if (glob(s.colors[seat], p) === g) o.push([seat, k]); })); return o; };
  const ludo = {
    name: "Ludo", min: 2, max: 4,
    init(n: number) { return { colors: colorsFor(n), tokens: Array.from({ length: n }, () => [-1, -1, -1, -1]), turn: 0, die: 0, phase: "roll", sixes: 0, rolls: 0, log: "", last: null }; },
    turn: (s: any) => s.turn,
    view(s: any, seat: number) { return { ...s, moves: seat === s.turn && s.phase === "move" ? ludoMoves(s, seat) : [] }; },
    move(s: any, seat: number, m: any) {
      if (s.turn !== seat) return { err: "Not your turn" };
      if (m.action === "roll") {
        if (s.phase !== "roll") return { err: "Move a token first" };
        s.die = 1 + Math.floor(Math.random() * 6); s.rolls++; s.last = null;
        if (s.die === 6) s.sixes++;
        if (s.sixes === 3) { s.log = "{" + seat + "} rolled three 6s — turn over"; ludoNext(s); return {}; }
        if (!ludoMoves(s, seat).length) { s.log = "{" + seat + "} rolled " + s.die + " — no moves"; ludoNext(s); s.phase = "roll"; return {}; }
        s.phase = "move"; s.log = "{" + seat + "} rolled " + s.die; return {};
      }
      if (m.action === "move") {
        if (s.phase !== "move") return { err: "Roll first" };
        const k = Number(m.token);
        if (!ludoMoves(s, seat).includes(k)) return { err: "That token can't move" };
        const from = s.tokens[seat][k], to = ludoTarget(s, seat, k);
        s.tokens[seat][k] = to; s.last = { seat, k, from, to };
        let extra = s.die === 6, note = "";
        const g = glob(s.colors[seat], to);
        if (g >= 0 && !SAFE.includes(g)) {
          for (const [os, ok] of occupants(s, g)) if (os !== seat) { s.tokens[os][ok] = -1; extra = true; note = " and captured {" + os + "}!"; }
        }
        if (to === 56) { extra = true; note = " and got a token home!"; }
        s.log = "{" + seat + "} moved" + note;
        if (s.tokens[seat].every((p: number) => p === 56)) return { done: true, winner: seat };
        s.phase = "roll";
        if (!extra) ludoNext(s);
        return {};
      }
      return { err: "Bad move" };
    },
    bot(s: any, seat: number, level: string) {
      if (s.phase === "roll") return { action: "roll" };
      const ms = ludoMoves(s, seat);
      if (level === "easy" && Math.random() < 0.6) return { action: "move", token: rnd(ms) };
      const color = s.colors[seat];
      // squares opponents could reach next turn (within 6 behind on the track)
      const threat = (g: number) => s.tokens.some((ts: number[], os: number) => os !== seat && ts.some((p) => { const og = glob(s.colors[os], p); if (og < 0) return p === -1 && g === s.colors[os] * 13; const dist = (g - og + 52) % 52; return dist >= 1 && dist <= 6 && p + dist <= 50; }));
      let best = ms[0], bestV = -Infinity;
      for (const k of ms) {
        const from = s.tokens[seat][k], to = ludoTarget(s, seat, k), g = glob(color, to), gf = glob(color, from);
        let v = to * 0.5;
        if (to === 56) v += 80;
        if (from === -1) v += 45;
        if (g >= 0 && !SAFE.includes(g) && occupants(s, g).some(([os]) => os !== seat)) v += 100;
        if (g >= 0 && SAFE.includes(g)) v += 15;
        if (to > 50) v += 25;
        if (level === "hard") {
          if (gf >= 0 && !SAFE.includes(gf) && threat(gf)) v += 30 + from * 0.3;
          if (g >= 0 && !SAFE.includes(g) && threat(g)) v -= 40 + to * 0.4;
        } else v += Math.random() * 20;
        if (v > bestV) { bestV = v; best = k; }
      }
      return { action: "move", token: best };
    },
  };

  return { pool, ludo };
}

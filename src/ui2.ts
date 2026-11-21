// Game Night party pack — serves the party games' browser code, styles and server-side game logic (a plugin the game server loads).
const JS: string = __CLIENT_JS__;
const CSS: string = __CSS__;
const GAMES_TS: string = __GAMES_TS__;
const h = (t: string) => new Bun.CryptoHasher("sha256").update(t).digest("hex").slice(0, 16);
Bun.serve({
  port: Number(Bun.env.PORT || 3000),
  fetch(req) {
    const p = new URL(req.url).pathname;
    if (p === "/client.js") return new Response(JS, { headers: { "Content-Type": "text/javascript; charset=utf-8", "Cache-Control": "no-cache" } });
    if (p === "/style.css") return new Response(CSS, { headers: { "Content-Type": "text/css; charset=utf-8", "Cache-Control": "no-cache" } });
    if (p === "/games.ts") return new Response(GAMES_TS, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-cache" } });
    if (p === "/health") return Response.json({ ok: true, js: h(JS), css: h(CSS), games: h(GAMES_TS) });
    return new Response("not found", { status: 404 });
  },
});

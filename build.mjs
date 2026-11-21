// Builds the Railway Function bundles in dist/ from src/.
// Each bundle is a single .tsx file; paste it into the matching Railway Function (see README).
import fs from "fs";
const src = (f) => fs.readFileSync("src/" + f, "utf8");
// browser/plugin files are embedded with String.raw, so they must not contain backticks or "${"
const raw = (f) => { const t = src(f); if (t.includes("`") || t.includes("${")) throw new Error(f + " has backtick/${"); return "String.raw`" + t + "`"; };
const out = (f, s) => { fs.writeFileSync("dist/" + f, s); console.log(f.padEnd(12), (s.length / 1024).toFixed(1) + " KB" + (s.length > 95000 ? "  ⚠ near Railway's ~100 KB function limit" : "")); };
fs.mkdirSync("dist", { recursive: true });
out("server.tsx", src("server.ts").replace("__GAMES__", () => src("games.ts")).replace("__AI__", () => src("ai.ts")));
out("ui.tsx", src("ui.ts").replace("__CLIENT_JS__", () => raw("client.js")).replace("__CSS__", () => raw("style.css")));
const pack = (tpl, js, css, games) => src(tpl).replace("__CLIENT_JS__", () => raw(js)).replace("__CSS__", () => raw(css)).replace("__GAMES_TS__", () => raw(games));
out("party.tsx", pack("ui2.ts", "party.js", "party.css", "party.ts"));
out("cards.tsx", pack("ui3.ts", "cards.js", "cards.css", "cards.ts"));
out("extras.tsx", pack("ui4.ts", "extra.js", "extra.css", "extra.ts"));
out("bluff.tsx", pack("ui5.ts", "bluff.js", "bluff.css", "bluff.ts"));
out("gamio.tsx", src("ui7.ts").replace("__CLIENT_JS__", () => raw("gamio.js")).replace("__CSS__", () => raw("gamio.css")));
out("skin.tsx", src("ui6.ts").replace("__CLIENT_JS__", () => raw("skin.js")).replace("__CSS__", () => raw("skin.css")));
fs.copyFileSync("legal/legal.tsx", "dist/legal.tsx"); console.log("legal.tsx    copied");

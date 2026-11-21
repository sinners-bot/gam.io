# 🎲 GAM.IO

A Plato-style **Discord Activity**: a hub of 22 multiplayer games you play together inside Discord voice calls, with bots at three difficulty levels, XP and levels, a leaderboard, and a neon-purple lobby. Everything runs on **Railway Functions** (single-file Bun services) plus Postgres.

## Games

| Pack | Games | Bots |
|---|---|---|
| Core (`src/games.ts`, `src/ai.ts`) | Chess, Connect 4, Crazy 8s, Sea Battle, Dots & Boxes, Tic-Tac-Toe, Ultimate Tic-Tac-Toe, Reversi, Checkers, Mancala, Lucky Dice | Easy / Medium / Hard |
| Party (`src/party.*`) | Mafia, Who's the Spy, Trivia, Word Hunt, Draw & Guess | People only |
| Cards (`src/cards.*`) | Color Clash (Uno-style), Hearts, Spades, Hold'em Poker (play chips only) | Easy / Medium / Hard |
| Extras (`src/extra.*`) | 8-Ball Pool, Ludo | Easy / Medium / Hard |

## How it fits together

```
Discord client ──► game-night (server.tsx)
                     ├─ serves the page, /client.js (all UI packs concatenated) and the Discord SDK bundle
                     ├─ OAuth token exchange (/api/token), WebSocket rooms (/ws), one room per Activity instance
                     ├─ game logic + bots, idle-turn timer, stats in Postgres
                     ├─ fetches UI from ASSETS_URLS  ──► game-night-ui, -party, -cards, -extras, -bluff, -skin, -gamio  (/client.js, /style.css)
                     └─ loads plugins from PLUGIN_URLS ─► game-night-party, -cards, -extras, -bluff  (/games.ts)
game-night-legal (legal.tsx) ─ /terms and /privacy for Discord verification
```

Railway Functions are capped at ~100 KB of source, so the UI and the later game packs live in separate functions. The server loads them at startup.

- **Server-authoritative.** Every move is validated on the server, and clients only render state. In pool, the server runs the physics and sends each shot as a replay.
- **Plugins.** A plugin's `/games.ts` default-exports `register(api)` and returns game modules:
  - Required: `{ name, min, max, init, move, view, turn }`.
  - Optional: `bot(state, seat, level)` for AI, `tick(state)` + `state.deadline` for timers, `pending(state)` for simultaneous actions such as the Hearts pass, and `noBots`.
- **UI plugins** run in the same module scope as `client.js`. They extend it by wrapping `gameScreen`, `lobby` and `render`, and by adding entries to `GAMES`.
- **Idle turns.** After `AFK_SECONDS` (default 60) without a move, a medium bot plays that move for the idle human. Running games survive everyone disconnecting for 5 minutes.

## Repo layout

```
src/        sources: server.ts (+ games.ts, ai.ts spliced in), client.js/style.css, party.*, cards.*, extra.*,
            ui*.ts = templates for the UI/plugin functions
legal/      Terms of Service + Privacy Policy function
dist/       built single-file bundles, ready to paste into Railway (committed on purpose)
tests/      bot-vs-bot simulations and a poker chip-conservation check
build.mjs   builds dist/ from src/      check.mjs   parses each bundle as TSX like Railway does
```

## Build and test

```bash
npm install        # only TypeScript, for the check
npm run build      # src/ -> dist/*.tsx
npm run check      # every bundle must parse as TSX (Railway runs the code as index.tsx; write generics as <T,>)
npm test           # bot-vs-bot games for the card, pool and Ludo packs
```

Rules for files in `src/` that get embedded (`client.js`, `*.css`, and the party/cards/extra files): **no backticks and no `${`**. The build fails if it finds them, because they are embedded with `String.raw`.

## Deploy (Railway)

There is one Railway Function per bundle. Paste the contents of the `dist/` file into the matching service's source and deploy.

| dist file | Railway service | Public URL |
|---|---|---|
| `server.tsx` | game-night | game-night-production-e0d5fead.up.railway.app |
| `ui.tsx` | game-night-ui | game-night-ui-production.up.railway.app |
| `party.tsx` | game-night-party | game-night-party-production.up.railway.app |
| `cards.tsx` | game-night-cards | game-night-cards-production.up.railway.app |
| `extras.tsx` | game-night-extras | game-night-extras-production.up.railway.app |
| `bluff.tsx` | game-night-bluff | game-night-bluff-production.up.railway.app |
| `skin.tsx` | game-night-skin | game-night-skin-production.up.railway.app |
| `gamio.tsx` | game-night-gamio | game-night-gamio-production.up.railway.app |
| `legal.tsx` | game-night-legal | game-night-legal-production.up.railway.app |

**Deploy order:** UI and plugin services first, then the server. The server fetches plugins only at startup, and UI assets every 30 s. After a plugin's game logic (`*.ts`) changes, redeploy or restart the server.

**Environment variables**

| Service | Variable | Notes |
|---|---|---|
| game-night | `DISCORD_CLIENT_ID` | `1573456130699428090` |
| game-night | `DISCORD_CLIENT_SECRET` | from the Discord Developer Portal. **Never commit it.** |
| game-night | `DATABASE_URL` | reference to the Postgres service |
| game-night | `ASSETS_URLS` | comma-separated UI service URLs, in load order: ui, party, cards, extras, bluff, skin, gamio (skin then gamio last) |
| game-night | `PLUGIN_URLS` | comma-separated plugin URLs: party, cards, extras, bluff |
| game-night | `AFK_SECONDS` | optional, default 60 |
| game-night-legal | `OPERATOR_NAME`, `CONTACT_EMAIL`, `GOVERNING_COUNTRY` | shown on the Terms and Privacy pages |

## Discord setup

In the Discord Developer Portal, for application `1573456130699428090`:

1. **Activities → Settings:** enable Activities.
2. **Activities → URL Mappings:** map `/` to `game-night-production-e0d5fead.up.railway.app`.
3. **OAuth2:** add the redirect `https://127.0.0.1`.
4. **General Information:** set Terms of Service URL `https://game-night-legal-production.up.railway.app/terms` and Privacy Policy URL `https://game-night-legal-production.up.railway.app/privacy`.

Outside Discord, opening the server URL in a browser gives a guest mode that's handy for testing.

## Online play

Players can quick-match or browse open lobbies across Discord servers (🌍 button). Lobby hosts choose who can join: this call, their server, or everyone. Matched games run in `mm:N` rooms and fill with Medium bots up to the minimum player count. `AFK_SECONDS` (default 60) on game-night sets the idle-turn timer.

## Tables

Each Discord call is a hub. Picking a game opens a separate table (`<call>#<n>`), so several games, even of the same type, can run at once. Others in the call get an invite and can join or watch from the Tables list. If someone leaves mid-game while other people are still playing, a Medium bot takes their seat. Per-game turn times are in `TURN_SECS` in `src/server.ts`.

# PACIFY — Dev Guide

Everything you can open, run, or poke while developing. For architecture and gotchas, see `AGENTS.md`; for project state and decisions, see `HANDOFF.md`.

## Running the stack

```bash
# terminal 1 — backend (Fastify, port 3001)
npm run dev --workspace=@pacify/server

# terminal 2 — game (Expo web, port 8081)
npm run web --workspace=@pacify/web
```

- The server only reads `.env` **at boot** → restart it after changing `apps/server/.env`. tsx watch does restart on source changes.
- Typecheck anything: `npx tsc --noEmit -p apps/web` (or `apps/server`, `packages/engine`...). Note: `apps/web` tsc has pre-existing errors in `menu.tsx` / `options.tsx` / `shame.tsx` / `P5Back.tsx` — it is NOT a build gate; keep your own files clean.
- Tests: `npm run test` in `packages/engine`; `npm run test` (fast unit) and `npm run test:sim` (slow duel suites) in `packages/ai-brain`.

---

## 1. The main app — http://localhost:8081

Expo Router web app (P5-styled, designed as a fixed 1600×900 stage scaled to fit).

| Route | What it is |
|---|---|
| `/start` | Title / start screen |
| `/login` | Login / enrollment (silent on purpose — audio unlock happens on submit) |
| `/load` | Loading screen (BGM preloads here without blocking) |
| `/menu` | Main menu |
| `/campaign` | Campaign map |
| `/duel` | **The duel screen** — main gameplay. Params: `?student=1..3` picks the opponent (SEAT I/II/III, ranks 2♣/3♣/4♣) |
| `/duel?demo=…` | **ANIM LAB** — animation debug mode, see below |
| `/dossier` | Character dossier |
| `/howto` | How-to-play |
| `/multiplayer` | Multiplayer (stub) |
| `/options` | Settings (MAIN/SFX/BGM volume etc.) |
| `/profile` | Profile |
| `/sfx-test` | **SFX debug page** — tap-to-unlock then play each sound (hover, click, slider, card pop) |
| `/shame` | Hall of Shame |

## 2. The AI prototype — http://localhost:8081/duel-prototype.html

Standalone single-file testbed at `apps/web/public/duel-prototype.html` — open it directly in a browser, **no build needed** (it's served as a static file from `apps/web/public/`). This is the fastest way to debug brain behavior:

- Mirrors the engine (`resolveRound`) AND the brain (solver) in plain JS — dev-tool replica of production.
- Calls the server's `/ai-pick` first (real LLM persona path); the inline brain is only the offline fallback — so a green LLM badge means the server is actually in the loop.
- Side panel shows the brain's internals: winning pool, pick reasoning, and the raw payload sent/received (collapsible accordions).
- ⚠️ **Keep it in sync** when engine rules or the brain change (per AGENTS.md).
- Sits next to `duel-live-state.json` in the same folder.

## 3. The ANIM LAB — http://localhost:8081/duel?demo=all

Interaction/animation debug mode built into the real duel screen. Open with:

- `?demo=all` → full **playlist** of every scenario, auto-advancing
- `?demo=1` → single-scenario **loop** mode
- The collapsible ANIM LAB panel (folds down to a pill so it never covers the felt) lets you pick a scenario, toggle LOOP, and re-fire.

Each scenario **runs the real `doReveal`** — what you judge here is exactly what ships. 24 scenarios cover every beat:

- Numbers: countdown diff, same-type shield, same-type with shields off, tie, R7 ×2 clash, R7 + Echo ×3
- Tricks, both sides: Void (yours / Klein's), Echo (yours / Klein's / +Eclipse / carry ×2 / wasted), Ward (yours / block), Eclipse, Reversal, Executioner (+ fail case, exec vs reversal), Oracle peek (yours / Klein's)
- Shield timer edge cases: tickdown, last turn

## 4. Server — http://localhost:3001

Fastify API. Quick liveness check: `curl http://localhost:3001/health` → `{"ok":true,...}`.

| Endpoint | Purpose |
|---|---|
| `POST /ai-pick` | Brain + LLM persona pick (what the prototype and duel call) |
| `GET/POST /campaign`, `POST /campaign/result` | Campaign state and results |
| `POST /auth/guest`, `/auth/register`, `/auth/login`, `/auth/google`, `/auth/username`, `/auth/logout`, `GET /auth/me`, `/auth/profile` | Auth |
| `GET /progress/:userId`, `PUT /progress` | Per-student progress |
| `GET /shame` | Hall of Shame wall |
| `POST /dialogue`, `POST /match-result` | Stubs |

LLM config lives in `apps/server/.env` (`GEMINI_API_KEY`, `LLM_PROVIDER=gemini-interactions`, `GEMINI_MODEL`, `GEMINI_EFFORT`) — internals in `apps/server/src/llm/providers.ts`.

## 5. Packages & tooling

- **`packages/engine`** — pure TS game engine, `npm run test` (deterministic seeds, `vitest run`).
- **`packages/ai-brain`**
  - `npm run test` — fast solver/EV unit tests.
  - `npm run test:sim` — slower engine-duel suites.
  - `npm run sim -- [seeds]` (default 60) — **win-rate table**: brain config × human model (random/greedy/modeled/blindMaximin/clairvoyant), W/D/L, margins, solve times, plus the deal-value distribution. Use this to answer "does a brain change actually win more?"
- **`packages/db`** — Drizzle + Postgres. `npm run db:generate` after schema changes, `npm run db:migrate`, and `npm run db:studio` for a GUI into the data.
- **`packages/ui-kit`** — theme tokens (crimson/yellow/black/paper, Anton/Oswald) and P5 global keyframes.

## 6. Reference docs in the repo

- `AGENTS.md` — architecture facts, commands, gotchas (trick priority, singleton dealing, R7 ×2, prototype sync rule).
- `HANDOFF.md` — session handoff: project state, key decisions (LLM integration details, Gemma quirks), and your standing directives.
- `music-sets.md` — single source of truth for which BGM track plays on which route (read by `apps/web/lib/bgm.ts`).
- Sounds live in `apps/web/public/sfx/` (+ `/hover.wav`), music in `apps/web/assets/musics/`, portraits in `public/students/`.

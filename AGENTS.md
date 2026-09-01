# pacify — Agent Instructions

## Project Overview
Monorepo (npm workspaces) for a card game called "PACIFY" with three packages and two apps:
- **packages/engine** — Pure TS game engine (19 cards, 7 rounds, deterministic replay). Zero deps, zero I/O.
- **packages/ai-brain** — AI opponent logic (god EV + character personalities). Depends on `@pacify/engine`.
- **packages/db** — Drizzle ORM + Postgres schema/migrations.
- **apps/server** — Fastify backend (auth, campaign, dialogue proxy, AI pick, match verification). Depends on `@pacify/db`, `@pacify/ai-brain`.
- **apps/web** — Expo React Native web app. Depends on `@pacify/ui-kit`.

## Commands

### Root
```bash
npm install                    # install all workspaces
npm run dev                    # runs dev in all workspaces that have it
npm run build                  # typechecks all workspaces
npm run db:generate            # drizzle-kit generate (packages/db)
npm run db:migrate             # runs migrations (packages/db)
```

### packages/engine
```bash
npm run test                   # vitest run
npm run build                  # tsc --noEmit
```

### packages/ai-brain
```bash
npm run test                   # vitest run
npm run test:sim               # vitest with sim config
npm run sim                    # npx tsx src/sim.ts
npm run build                  # tsc --noEmit
```

### packages/db
```bash
npm run db:generate            # drizzle-kit generate
npm run db:migrate             # tsx src/migrate.ts
npm run db:studio              # drizzle-kit studio
```

### apps/server
```bash
npm run dev                    # tsx watch src/index.ts
npm run build                  # tsc (emits to dist/)
npm run start                  # node dist/index.js
```

### apps/web
```bash
npm run start                  # expo start --web --port 8081
npm run web                    # same as start
```

## Environment
- Copy `.env.example` → `.env` at root and in `apps/server/.env`, `packages/db/.env`
- Required: `DATABASE_URL` (Postgres), `GEMINI_API_KEY` (optional, for dialogue), `PORT` (default 3001)

## Key Architecture Facts

### Engine (packages/engine)
- **19 cards**: 12 Number (1–12 power, aligned good/bad) + 7 Tricks (Void, Oracle, Reversal, Ward, Echo, Executioner, Eclipse)
- **Config C**: 7-card hands, 7 rounds, max 3 tricks/hand, singleton rule (no dupes across both hands)
- **Scoring**: Opposite alignments → diff; Same alignment → 0 (shield). Eclipse disables shields for 2 rounds.
- **Trick priority**: Void > Eclipse > Ward > Echo > Reversal > Executioner > Oracle
- **Deterministic**: All RNG from seed. `replayDuel(seed, studentId, actions)` reconstructs exact state.
- **Entry points**: `createDuel()`, `dispatch(state, action)`, `replayDuel()`

### AI Brain (packages/ai-brain)
- **God AI**: `rankMoves(view, config)` returns EV-ranked moves using `expectedDifferential()`
- **Characters**: Each has `skill` (0–1) and personality prompt. LLM picks from god's pool.
- **View passed to AI**: `{ studentId, round, phase, myScore, oppScore, myHand, burned, peeked, shieldOff, echoNext, rngState }`

### Server (apps/server)
- **Routes**: `/health`, `/auth/guest`, `/progress/:userId`, `PUT /progress`, `POST /dialogue`, `POST /match-result`, `POST /ai-pick`
- **Deploy**: Render (see `render.yaml`). Build: `npm run build --workspace=@pacify/server`, Start: `npm start --workspace=@pacify/server`
- **Node 22**

### Database (packages/db)
- **Drizzle** with Postgres. Migrations in `drizzle/`.
- Run `db:generate` after schema changes, then `db:migrate`.

## Testing
- Engine: `vitest run` (packages/engine) — pure unit tests, deterministic seeds
- AI Brain: `vitest run` (packages/ai-brain) — tests EV pricing of tricks (e.g., Reversal swap)
- No integration/e2e tests yet

## Common Gotchas
- Engine uses **ESM** (`"type": "module"`). Import with `.js` extensions in source.
- Engine `main`/`types` point to `src/index.ts` — no build step, TypeScript compiles on import.
- Server imports AI brain via relative path: `../../../packages/ai-brain/src/index.js` (not package alias)
- Expo web runs on port 8081, server on 3001 — CORS configured for credentials
- Singleton dealing: 14 unique cards dealt from 19-card catalogue per duel
- R7 is climax (×2 multiplier), not R5. Echo adds +1 to multiplier (cap 3).

## File Conventions
- Types in `types.ts`, data in `cards.ts`, logic in `resolve.ts`/`duel.ts`/`deck.ts`/`rng.ts`
- Tests mirror source structure: `test/engine.test.ts`, `test/reversal.test.ts`
- No lint/format config — rely on `tsc --noEmit` for type safety
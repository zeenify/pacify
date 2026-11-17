# pacify — Agent Instructions

## Project Overview
Monorepo (npm workspaces) for a card game called "PACIFY" with three packages and two apps:
- **packages/engine** — Pure TS game engine (19 cards, 7 rounds, deterministic replay). Zero deps, zero I/O.
- **packages/ai-brain** — AI opponent logic (full-depth solver brain + character personalities). Depends on `@pacify/engine`.
- **packages/db** — Drizzle ORM + Postgres schema/migrations.
- **apps/server** — Fastify backend (auth, campaign, dialogue proxy, AI pick, match verification). Depends on `@pacify/db`, `@pacify/ai-brain`.
- **apps/web** — Ionic React web app (Ionic 9 + react-router 6 + Vite). Depends on `@pacify/engine`. (Ported from Expo/React-Native-Web in 2026-10; `packages/ui-kit` is no longer consumed.)

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
npm run dev                    # vite dev server on port 8081
npm run start                  # same as dev
npm run build                  # tsc --noEmit && vite build -> dist/ (static SPA)
npm run preview                # serve the production build
```

## Environment
- Copy `.env.example` → `.env` at root and in `apps/server/.env`, `packages/db/.env`
- Required: `DATABASE_URL` (Postgres), `GEMINI_API_KEY` (optional, for dialogue), `PORT` (default 3001)
- Web env (`apps/web/.env`): `VITE_API_URL` (server origin; baked into the bundle at build time), `VITE_GOOGLE_CLIENT_ID` (Google sign-in)

## Key Architecture Facts

### Engine (packages/engine)
- **19 cards**: 12 Number (1–12 power, aligned good/bad) + 7 Tricks (Void, Oracle, Reversal, Ward, Echo, Executioner, Eclipse)
- **Config C**: 7-card hands, 7 rounds, max 3 tricks/hand, singleton rule (no dupes across both hands)
- **Scoring**: Opposite alignments → diff; Same alignment → 0 (shield). Eclipse disables shields for 2 rounds.
- **Trick priority**: Void > Eclipse > Ward > Echo > Reversal > Executioner > Oracle
- **Deterministic**: All RNG from seed. `replayDuel(seed, studentId, actions)` reconstructs exact state.
- **Entry points**: `createDuel()`, `dispatch(state, action)`, `replayDuel()`

### AI Brain (packages/ai-brain)
- **Solver** (`src/solver.ts`): exact deep search over the remaining game. Each move scored on a worst-case floor (maximin — outcome guaranteed if the human counters perfectly) blended with model EV: `v = kappa*floor + (1-kappa)*ev`. Grid cache exploits that round outcomes are score-independent.
- **God AI**: `rankMoves(view, config)` returns the winning pool (moves within 2% of best) ranked by solver value. Full vision (`view.oppHand`) solves the exact game; partial vision marginalizes over hand completions. `expectedDifferential()` remains 1-round EV for tests/UI.
- **Characters**: Each has `skill` (0–1) and personality prompt. LLM picks from god's pool. `skill` also raises default robustness kappa via `defaultRobustness()`.
- **Arena/Sim**: `src/arena.ts` plays full engine duels vs human models (random/greedy/modeled/blindMaximin/clairvoyant); `npm run sim -- [seeds]` prints the win-rate table + deal-value distribution.
- **View passed to AI**: `{ studentId, round, phase, myScore, oppScore, myHand, burned, peeked, shieldOff, echoNext, rngState, oppHand? }` — `oppHand` = full vision (production sends it).

### Server (apps/server)
- **Routes**: `/health`, `/auth/guest`, `/progress/:userId`, `PUT /progress`, `POST /dialogue`, `POST /match-result`, `POST /ai-pick`, `/campaign/encounters*` (scene/read/reply/start/round/reactions/result/epilogue)
- **Dialogue pipeline**: strategy (card pick) and speech (voice line) are separate LLM calls — speech never sees hands or the pick, so commit lines can't leak. The speech call gets a one-word tone tell (`recent`-aware; "smug"/"performing"/"confident"/"guarded"/"even" derived from the decision in `ai-pick.decide`) and the duel's recent lines (anti-repetition; an exhausted fallback bank returns `""` = silence, never a repeat). Thinking-time varies with solver-pool spread (close calls and round 7 pause longer). Provider roles: `story` (preludes/epilogues/memories, high effort) vs `dialogue` (live lines/reactions, light effort) via `OPENAI_STORY_MODEL` / `OPENAI_DIALOGUE_MODEL` on the River (openai-compatible) provider. All speech surfaces read `kleinMemoryBrief` prose (name, time, verified memories, player replies) — never a JSON policy wall. Memory generation is perspective-guarded: `result` is the PLAYER's outcome; a deterministic winner-direction check (`wrongWinnerClaims`) rejects flipped-voice memories before the audit and again on write.
- **Story state**: finished duels finalize server-side: epilogue scene + exactly one `character_memories` row per encounter (claimed `pending` in the completion tx, written after commit, `ready` only when replay-backed). Canned transport-fallback speech is shown but never persisted as memory. A stored scene marked `fallback` regenerates on the next pre-duel visit (before start), so rematches don't open on canned text. Reply exchanges are optional: the VOICE prompt omits `exchange` unless the final line genuinely asks a question (`kleinAsksForReply`), and `kleinPlayerScene` strips stale exchanges at validation, on stored-scene projection (`publicScene`), and at web scene ingestion — statements never trap the player in a reply. `encounter-store.record()` normalizes rows persisted before a field existed (e.g. `replies`), so history/reply/speech reads never crash on legacy data.
- **Deploy**: Render (see `render.yaml`). Build: `npm run build --workspace=@pacify/server`, Start: `npm start --workspace=@pacify/server`
- **Node 22**

### Database (packages/db)
- **Drizzle** with Postgres. Migrations in `drizzle/`.
- Run `db:generate` after schema changes, then `db:migrate`.

### Web (apps/web)
- **Screens**: `src/screens/*.tsx` (one file per route) + a co-located `*.module.css`. Routes are declared explicitly in `src/App.tsx` (IonReactRouter + IonRouterOutlet, transitions disabled, same paths as always). Every screen wraps in `<IonPage>`.
- **Styling**: the UI was ported 1:1 from react-native-web. `src/theme/global.css` defines `.v` / `.t` / `.ti` / `.press` base classes that replicate RNW's default styles (flex column, border-box, pre-wrap text, etc.) — keep using them when converting any remaining RN-style code. Keyframes live in global.css (shared) or injected per-screen via `<style>` (duel/dossier/campaign).
- **Navigation**: use `import { router } from "../lib/nav"` (stable module-level push/replace, mirrors expo-router). Do NOT put `useNavigate()` in effect deps — its identity changes and would re-run once-per-mount effects. Every navigation plays the "HEIST TAKEOVER" screen transition (`components/NavTransition.tsx` + `lib/transition.ts`, ported from the frame-verified smart-agent prototype): forward = lock-on (scan/reticle/claws) → slab marquee avalanche → covered swap (460ms) → scrolling marquee hold → diagonal cut (900ms) → split reveal (380ms tail, 1400ms total); story→duel gets "VERSUS SLAM" (YOU vs the target panels, VS letters, DUEL! stamp, 1800ms); →story gets the curtain tuned for contact (destination word in the slabs via `payload.word`); utility routes (options/howto/sfx-test) run a compact tier (1000ms); the login flow steps (login→load→start) swap plainly with NO transition — the heist plays on menu arrival; the back shutter "SHUTTER RETREAT" (750ms) plays when an exit lands on `/menu` or when a screen passes `{ back: true }` (refusal/epilogue exits — `P5Back` routes through the nav bridge so its default `/menu` target gets it); other replaces into hubs resolve forward by route. Duplicate navigations to the same destination are ignored while a transition plays, so a second exit click cannot replay the heist. The overlay is driven entirely by the Web Animations API off the plan's beat anchors; route swap happens at `coveredMs` under full cover, and `reveal()` only starts after `nav.tsx` confirms the destination IonPage is visible + paint-aligned (bounded 1500ms fallback). At the receiving cut the overlay backdrop turns transparent, so the split/panels/bars open over the live destination instead of a black stage; teardown cancels animations and scheduled audio. Sound rides the same beats via `scheduleTimeline()` in `lib/sfx.ts` (entrance whoosh + stamp at cover, blade + split at the reveal commit). Screens can hand the transition route content via `router.push(to, payload)` (`NavPayload` in `lib/transition.ts` — marquee `word`, battle `vs` panels); defaults derive from the destination path. Variant resolution, beat plans and audio cue derivation are data (tested in `test/transition.test.ts`); `window.__navScale = N` stretches every timing N× for frame-by-frame QA capture (`tools/story-e2e/v4gamecap.mjs` captures the real game).
- **AI-wait beats (real-game pacing)**: the duel (`screens/duel.tsx`) never reveals instantly — when Klein's pick already arrived in the background, `onPick` re-shows the thinking dots + `duel.thinking` for `KLEIN_RESPONSE_MS` (700ms) before `doReveal`; without a background pick the reveal waits for `/ai-pick` commit as before. The story screen's loading state (`screens/story.tsx`) is a rolling wait — a 3D-flipping card-back + bouncing dots under steady text ("KLEIN IS SETTING THE TABLE") — because every CHALLENGE consumes a fresh encounter id and the server generates the prelude scene live (LLM, tens of seconds); it rolls as long as generation takes, with a 650ms minimum beat so cached scenes don't flash, and a 90s `AbortController` guard turns a truly hung server into "REQUEST TIMED OUT" + RETRY (the server keeps generating and caches, so the retry lands fast). Reply exchanges show "KLEIN IS THINKING…" while the choice posts; duel start shows "KLEIN TAKES HIS SEAT…" — both block advancing until the server answers. The reply menu only exists when Klein's final line genuinely asks a question (statements advance straight to the duel): it floats ABOVE the bubble's top-right (`.choices` in `story.module.css`) — skewed red "YOUR RESPONSE" tag over vertically staggered angular white cards with red edges and hard shadows; the line counter hides while it's open, SKIP lifts via `controlsWithChoices`, and the bubble hint reads "CHOOSE A RESPONSE ABOVE". Replies are server-owned (client sends only `choiceId`) and the displayed response is the server's returned one — the first reply sticks on replays; a failed reply strips the exchange instead of trapping the player.
- **Images**: use `src/components/P5Image.tsx` (replica of the RNW Image model: user styles on the root, bitmap painted as a centered CSS background-image). A plain `<img>` renders subtly different geometry.
- **Audio**: `src/lib/sfx.ts` (SFX + BGM buses, gesture unlock) and `src/lib/bgm.ts` (route→track map via `PAGE_BGM`; keep `music-sets.md` in sync).

## Testing
- Engine: `vitest run` (packages/engine) — pure unit tests, deterministic seeds
- AI Brain: `vitest run` (packages/ai-brain) — fast unit tests (solver endgames, EV pricing). `npm run test:sim` — engine-duel suites (slower; single-fork). `npm run sim -- [seeds]` — win-rate table vs human models.
- No integration/e2e tests yet

## Common Gotchas
- Engine uses **ESM** (`"type": "module"`). Import with `.js` extensions in source.
- Engine `main`/`types` point to `src/index.ts` — no build step, TypeScript compiles on import.
- Server imports AI brain via relative path: `../../../packages/ai-brain/src/index.js` (not package alias)
- Web runs on port 8081 (Vite), server on 3001 — CORS configured for credentials
- Vite resolves the engine's `.js`-extension imports via the `jsToTs` plugin in `apps/web/vite.config.ts` (the old metro.config resolver shim, ported)
- Singleton dealing: 14 unique cards dealt from 19-card catalogue per duel
- R7 is climax (×2 multiplier), not R5. Echo adds +1 to multiplier (cap 3).
- `apps/web/public/duel-prototype.html` mirrors the engine (`resolveRound`) AND the brain (solver) in plain JS — keep it in sync when rules/brain change. It calls the server's `/ai-pick` first; the inline brain is only the offline fallback.
- Trick priority in the engine: Void → Ward → rest. Eclipse sets up before Ward but a Ward block cancels it; Echo/Eclipse/Oracle effects fire alongside each other (only Void/Ward hard-block).

## File Conventions
- Types in `types.ts`, data in `cards.ts`, logic in `resolve.ts`/`duel.ts`/`deck.ts`/`rng.ts`
- Tests mirror source structure: `test/engine.test.ts`, `test/reversal.test.ts`
- No lint/format config — rely on `tsc --noEmit` for type safety
# PACIFY — Session Handoff (2026-09-03)

Read this first if you're continuing in a fresh conversation. It captures where the
project is, why key decisions were made, and what's next. The user's directives live
here too — they override generic instincts.

## What PACIFY is

A Persona-5-styled card duel game (web-first landscape PWA). Monorepo (npm workspaces):

- `packages/engine` — pure TS game engine: 19 cards (12 numbers 1–12 good/bad + 7 tricks),
  7-card hands, 7 rounds, threshold 20 wins, deterministic seed. Zero deps.
- `packages/ai-brain` — full-depth **solver** brain (maximin floor blended with EV,
  `v = kappa*floor + (1-kappa)*ev`) + character personas. `rankMoves(view, config)`
  returns the winning pool (within 2% of optimal) — the LLM can never weaken Klein.
- `packages/db` — Drizzle + Postgres (Neon). Tables: users, progress (per-student),
  stats (global).
- `apps/server` — Fastify (port 3001). Routes: `/ai-pick` (LLM persona picker),
  `/campaign`, `/campaign/result`, `/auth/*`, plus stubs (`/dialogue`, `/match-result`).
- `apps/web` — Expo Router web app (port 8081). Screens: campaign, dossier, **duel**,
  menu, login, etc. Also `public/duel-prototype.html` (standalone AI testbed, kept).
- `packages/ui-kit` — theme tokens (`theme.color.crimson/yellow/black/paper`,
  `theme.font.display/body` = Anton/Oswald), P5 global keyframes in ThemeProvider.

## How to run

```bash
# terminal 1 — backend
npm run dev --workspace=@pacify/server          # tsx watch, port 3001
# terminal 2 — game
npm run web --workspace=@pacify/web             # expo, port 8081
# prototype (AI testbed, no build needed)
# open apps/web/public/duel-prototype.html in a browser
```

- `apps/server/.env` (gitignored): `DATABASE_URL`, `JWT_SECRET`, `GEMINI_API_KEY` (AI
  Studio key — currently `AIzaSyCAFRRvG0VzEGTH0_B7EdMR43UPYe1OxN0`), `LLM_PROVIDER=gemini-interactions`,
  `GEMINI_MODEL=gemma-4-31b-it`, `GEMINI_EFFORT=minimal`.
- Server only reads `.env` at boot → restart after changes. tsx watch DOES restart on
  src file changes.
- Typecheck: `npx tsc --noEmit -p apps/server` and `-p apps/web`. NOTE: apps/web tsc has
  pre-existing errors in `menu.tsx`/`options.tsx`/`shame.tsx`/`P5Back.tsx` — it is NOT a
  build gate; only keep YOUR files clean. Engine/ai-brain: `npm run test` per package.

## LLM integration (stateful Gemini)

- `apps/server/src/llm/providers.ts` — provider abstraction. `gemini-interactions` calls
  `POST https://generativelanguage.googleapis.com/v1beta/interactions` with
  `x-goog-api-key`, chaining via `previous_interaction_id`. **Google holds the
  conversation**; the client echoes back the chain head (`interactionId`) per pick, so
  the server stays stateless. Per-round payload is a ~1.3KB delta vs ~8.9KB full prompt.
- KLEIN persona (`packages/ai-brain/src/characters/klein.ts`) + rules
  (`apps/server/src/gameRules.ts`) are the SYSTEM prompt. Gemma models REJECT
  `system_instruction` (400 "Developer instruction is not enabled") → for `gemma-*`
  models the system text is folded into the FIRST input turn; server-side history keeps
  it for later rounds. Gemini-family models get the native field.
- `thinking_level` (generation_config): gemma-4 models only accept **"minimal"** (no
  thinking, ~3x faster) or **"high"**. `GEMINI_EFFORT` env controls it. Do not send
  low/medium → 400.
- Round results: the client sends `roundResults` (who played what, points, flags,
  running score) and the server renders a `RESULTS OF PREVIOUS ROUNDS` block — this is
  how the persona LLM learns what happened in earlier rounds.
- Old key's project had ZERO quota in asia-east1 (429 quota_limit_value 0) — the working
  key is the one currently in `.env`.

## The real game loop (shipped this session)

- Campaign map (`apps/web/app/campaign.tsx`): 13 seats, first 3 unlocked; CHALLENGE →
  `router.push("/duel?student=N")`.
- `/duel` (`apps/web/app/duel.tsx`, ~900 lines — THE gameplay screen):
  - Fixed **1600×900 design canvas** scaled to fit the window (`stageScale =
    min(winW/1600, winH/900)`). All sizes are design-space px. THIS fixed every
    "small/broken/out of place" report — never use % zones with fixed px again.
  - Async two-lock flow: round starts immediately, Klein picks in the BACKGROUND
    (interactionId chain), the player can lock whenever; the round resolves the moment
    both cards exist (`p1Lock` ref bridges the async gap). No waiting on Klein.
  - Klein's chat bubble sits beside his portrait with a tail; bouncing dots while
    thinking; his message appears the moment it arrives (not at reveal) and auto-hides
    after 8s (`MSG_MS`).
  - Reveal = choreographed step sequence (`SeqStep[]` + driver effect in the component):
    SHOWDOWN 3..2..1 (3s) → flip → **power countdown** that STOPS when the weaker power
    hits 0 (tally plates beside each card; winner pulses via `dWinPulse`; a `+N` badge
    then flies into the winner's corner chip via `dFlyYou`/`dFlyKlein` keyframes) →
    per-trick cinematics: Reversal (totals swap across the table), Executioner (shards,
    score → 0), Ward (BLOCKED +5), Void/Echo/Eclipse (nullify + status), Oracle (flips
    2 of Klein's real remaining cards). NEXT ROUND appears only after the sequence.
  - Score chips: fixed 116×116 circles (bottom-left YOU, top-right KLEIN) as overlays on
    the table zone — NOT children of the felt (the felt has a clip-path that eats
    anything near its edges; round marker + chips live as siblings of the rim).
  - Status tokens on the felt (`CLASH ×N`, `SHIELDS OFF · n`) — press → info modal with
    the full rule (`MULT_INFO` / `SHIELD_INFO` constants).
  - Table extends to the bottom of the screen; the hand overlays its near edge.
  - `public/table.png` auto-overlays the CSS felt if present (user may generate an
    asset; prompt for it was provided in chat: trapezoid perspective, dark crimson felt,
    wood rim, P5 style, white bg for cutout, 16:9).
- `POST /campaign/result` (`apps/server/src/campaign.ts`): upserts `progress`
  (attempts/wins/losses/draws/bestScore/cleared/firstClearedAt via raw sql) and `stats`
  (incl. streak reset on loss). Verified end-to-end with a registered test user.
- Browser-verified by the user iteratively — **the user screenshots and judges UI;
  the agent's own in-app-browser screenshots glitched mid-animation, so ask the user
  for screenshots instead.**

## Gotchas that cost us time

- Metro can't resolve the engine's Node-ESM `.js`→`.ts` imports — fixed with a custom
  resolver shim in `apps/web/metro.config.js`. Engine source must KEEP `.js` extensions
  (server tsc output depends on them).
- `@pacify/engine` was added to apps/web deps for the duel screen.
- expo-router typed routes lag behind new screens → cast `router.push(...  as any)`.
- The duel screen's opponent-zone/table/player-zone are NOT % of window anymore — they
  are % of the fixed 900px stage. Position overlays (chips, marker, stamps) inside the
  stage coordinate space; the flying-badge keyframes (`dFlyYou/dFlyKlein`) bake in
  design-space px deltas.
- Anything rendered as a child of `tableRim`/`tableFelt` gets clipped by their
  clip-path trapezoids — overlays go one level up (tableZone).
- Klein's view args order: `startRound(roundNo, kleinHand, youHand, kleinScore,
  youScore, ...)` — this was swapped once (Klein read the player's score as his own);
  double-check when touching `lockAi`/`startRound`/`doReveal` call sites.
- Score state applies at SEQUENCE steps (award / reversal / executioner), not at
  doReveal — keep it that way or the teaching animations lose their story.
- The 4 tracked `tsconfig.tsbuildinfo` files churn on every build; ignore in review.

## Known rough edges (user-acknowledged, unfinished)

1. Reveal sequence is "half decent" per user — he wants to keep fixing it **one beat at
   a time, verified by his screenshots**. Next candidates he named: general polish of
   the countdown/award flow ("main issue: both numbers falling to 0" is FIXED, needs
   his re-verification), and whatever he flags next on showdown/clash/tricks.
2. Klein's hand fan above his head still reads "crown-ish" — user hasn't re-judged it.
3. `table.png` painted asset not generated yet (CSS felt is the fallback, auto-swap ready).
4. Klein's dossier (`/dossier`) and other seats (2/3) still reuse Klein's persona —
   only Student #1 Klein exists (campaign seats map: seat 1 = 2♣ Klein).
5. `/dialogue` (goal-directed post-win lines) and `/match-result` replay verification are
   stubs. SPEC.md lists stats-aware AI + intro scene as locked-but-unbuilt.
6. Multiplayer screen is a placeholder.

## User preferences (learned this session)

- Wants to be shown, not told: "let me test it if i like it". Launch servers for him,
  open the page, keep changes small and verifiable.
- Go big on P5 UI: skewed stamps, hard shadows, crimson/yellow/black. "Go wild… make
  everything feel custom made" — but everything must stay readable (he rejected faint
  gray labels and tiny fonts twice).
- He will paste API keys in chat; remind him to rotate (the current Gemini key was).
- He likes being asked direction questions when genuinely forked, but for gameplay
  polish he decides by playing — build first, small increments.
- Commit checkpoints when he says so; conventional-ish messages, straight to `main`.

## Where things stand (commits)

- `7f6d625` solver brain (other agent) — full-depth solver, same `rankMoves` API.
- `51114dc` stateful Gemini Interactions API provider + prototype wiring.
- `df48de7` **this checkpoint** — playable /duel screen, campaign loop, staged reveals.
- Handoff file: `HANDOFF.md` (this file).

## Suggested next steps

1. Let the user re-verify the new countdown/fly-into-chip flow and fix whatever beat he
   flags next (one at a time, he'll screenshot).
2. Klein's fan restyle; consider `table.png` asset when he generates it.
3. `/match-result`: replay seed through the engine to verify posted scores (anti-cheat).
4. Stats-aware persona prompt (feed player's stored tendencies into `roundResults`-style
   context) and the post-win `/dialogue` line.
5. Author Student #2 persona + seat 2 unlock flow.

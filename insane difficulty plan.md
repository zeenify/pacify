# Insane Difficulty Plan — "Klein reads hasty players"

**Status: PLANNED — server/client wiring not yet implemented.** The read core
(`bestCounter` + schedule) IS implemented in `packages/ai-brain/src/read.ts`,
tested in `test/sim/read.test.ts`, and measured — see "Verification results".
Written 2026-10-24; mechanic renamed peek → read same day (see Terminology).

## Terminology (important)

- **Peek** = the game's existing Oracle mechanic: the PLAYER looks at cards
  (`peeked` / `oppPeeked` fields in the brain view). Never reuse this word for
  the cheat.
- **The read** = Klein seeing the human's LOCKED card for the current round and
  playing the game-optimal reply. All code, tests, and docs use read/readChance/
  READ_SCHEDULE/bestCounter. (`leakscan.ts` is the earlier flat-probability
  precursor scan and keeps its historical "leak" wording.)

## Goal

Make the AI opponent win ~90%+ of matches without changing any game rules, without
touching the engine, and without the player being able to tell anything changed.
Target audience: average-paced play. Design constraints agreed in discussion:

- No always-on clairvoyance (AI seeing the lock 100% of the time felt/played wrong).
- No timing trigger the player fully controls (the original "locks within 5s" idea was
  dropped — exploitable by just waiting).
- No game-design changes (multi-card rounds, boss-lock-first mode, trick rebalances all
  rejected). Best-of-three duels per match is already planned separately and compounds
  with this plan.
- Neural-network AI project: postponed, separate track, not part of this plan.

## Why per-round read probabilities (the measurements)

All numbers from the scan tools in `packages/ai-brain/src/`. Small samples — treat as
directional; the per-round value table is the solid part.

1. **The game has no safety floor.** Deal scan (`dealscan.ts`): with full vision and
   perfect robust play, ~100% of deals are still losable, ~0% force a win, ~0% even
   force a draw. Every card has a counter; pure safety mode (kappa=1 maximin) walks
   into guaranteed defeat. There is no "unbeatable" configuration — the only path to
   difficulty is information advantage + prediction.

2. **Read value by round** (`readscan.ts`, 22 duels, win-probability points gained by
   seeing the locked card, averaged):

   | Round | R1 | R2 | R3 | R4 | R5 | R6 | R7 |
   |---|---|---|---|---|---|---|---|
   | Read value | 0 | 15.9 | **22.7** | **20.5** | 13.6 | 15.9 | 0 |
   | P(read changes the move) | 0% | 18% | 23% | 27% | 32% | 18% | 0% |

   - R1: nothing has diverged; the robust blind pick already covers every card. Dead round.
   - R7: one card left in each hand — no choice to inform. Dead round (self-exempting
     climax: no "stolen R7" feel-bad risk).
   - Mid-game (R3–R4 peak) is where reads flip decisions and swing games.

3. **End-to-end effect** (`leakscan.ts`, `readscan.ts`): always-read ≈ 92–93% win vs
   average-style play (from ~54–79% no-read baseline depending on run); 3-round read
   windows reached 88%. Vs a strong deliberate player, even 100% read only reached 57% —
   **reads punish punishable picks**, which is exactly the self-aiming behavior we want.

4. **Best-of-three compounding**: match win ≈ p²(3−2p). 80% duel → ~90% match;
   ~86% duel → ~95% match. The planned Bo3 structure is the biggest free multiplier.

## Verification results (test/sim/read.test.ts — all passing)

- **Soundness**: across 42 real rounds, the read counter was never worse than the
  blind pick against the known card; it flipped Klein's move in 26% of rounds.
- **Game-optimal, not round-greedy**: found 5 rounds where the counter deliberately
  scored fewer round points for a better whole-game outcome.
- **Head-to-head (12 seeds)**: blind 79% → read 88% (W10 D1 L1, ~3.3 reads/duel,
  margin 7.8 → 10.2).
- **Wider run (24 duels/cell)**: no read 75% / shipping schedule **83%** / always 92%.
  Baseline wanders ±4 between runs; the stable statistic is the same-seed delta:
  **the shipping schedule adds +8–9 win points over blind play.**

## The read schedule

| Round | R1 | R2 | R3 | R4 | R5 | R6 | R7 |
|---|---|---|---|---|---|---|---|
| Read chance | 0% | 50% | 80% | 80% | 80% | 50% | 0% |

≈ 3.4 nominal reads/duel. Projected ~83–88% duel win vs average-paced play → ~93–95%
of Bo3 matches. Note: nominal ≠ effective — a read only fires if the player actually
locks during a live window, so slow players donate fewer reads (acceptable: deliberate
players are also the ones reads help least against).

Lives in `packages/ai-brain/src/read.ts` as `READ_SCHEDULE` (single source of truth;
tests and `readscan.ts` import it). Tuning knob: R2/R6 at 50 vs 60 — start at 50,
re-price with `readscan.ts` before shipping if curious.

## Round flow (the spec)

Current flow: client calls `POST /ai-pick` → server runs `rankMoves` (god pool) → LLM
persona (`pickFromPool`) picks from the pool + writes the chat message.

New flow per round:

1. **Round start** — client calls `/ai-pick` with the view and `p1Locked: null`.
2. **Server**: compute the god pool ONCE (cache for the whole round — reuse across all
   stall cycles this round), roll the round's read chance (`readChance(round)`).
   - **Miss** → (maybe bluff-stall, see below) → return normal pool pick + message.
   - **Hit** → return `{ move: null, message }` — a chat-only "thinking" beat. No card.
3. **Player locks during the live window** → client re-calls `/ai-pick` with `p1Locked`
   set → server sees live window + lock → **the read fires**:
   - Call `bestCounter(baseState, lockedCard)` (already implemented in
     `packages/ai-brain/src/read.ts`, exported from the package): the game-optimal
     reply — a FULL-GAME solver evaluation (all remaining rounds), not a round-greedy
     counter. It will shield/dump/sacrifice a round when that wins the game (e.g.
     waste the player's 12 with a cheap shield while saving its own 12 for the ×2
     climax). Cheap: ~7 memo-shared solver evaluations, sub-second.
   - Wrap the chosen card as a **one-card pool** through `pickFromPool` so the
     personality/LLM narration path runs unchanged. The LLM is not choosing anymore —
     the solver already chose; the LLM only narrates.
4. **Player hasn't locked when the interval expires (5–7s)** → client re-calls
   (attempt+1) → server re-rolls. Hit again → another chat-only beat (only the roll +
   LLM re-run; the pool stays cached). Miss → play the cached pool pick immediately
   (feels instant — the solver already ran).
5. **Hard cap** of 2–3 stall cycles (slightly varied) — a player who never moves first
   just sees Klein "make up his mind." No deadlock, no clockwork rhythm.

### Bluff stalls (critical — masks the tell)

Without bluffs, "Klein chats instead of playing" proves a live window, and a sharp
player stalls out every window → mechanic fully disarmed (the reborn 5-second exploit).

Fix: on **~20–30% of miss rounds**, Klein also chats and waits a beat, then plays his
normal blind move. Now chatting carries no information. Knob: exact bluff %.

Natural camouflage already in the data: even when read, the game-optimal counter
equals the blind pick ~70–80% of the time (flip rates 18–32%) — read rounds rarely
look suspicious; the read mostly confirms rather than flips.

### LLM safety rules

- Never pass the player's locked card or the reason to the LLM. It receives only its
  own pick (the one-card pool). Prevents dialogue leaks ("ah, the Executioner…").
- Read-round messages stay personality-flavored and knowledge-neutral.

## Integration changes

**Server (`apps/server/src/index.ts`, `/ai-pick` at line 59):**
- Accept `p1Locked?: CardId | null` in the payload.
- Add a chat-only response type (`move: null, message`) for stall beats.
- Add the roll + window state + read path (call `bestCounter` from `@pacify/ai-brain`)
  + bluff branch; schedule constant lives server-side hidden — the client never sees
  rates or window state (it already can't: everything ships in `src/read.ts` +
  server logic).
- Trick: the read path just swaps the pool for `[counterCard]` — everything downstream
  (`pickFromPool`) is unchanged.

**Client (`apps/web` duel loop):**
- Handle `move: null` responses: show the chat beat, wait the interval, re-call
  `/ai-pick` with `p1Locked` if the player locked meanwhile, track attempt count.
- Send the player's lock to the server as soon as it happens (before requesting the
  AI move, when the player moved first).

**Engine (`packages/engine`): ZERO changes.** It already requires AI-first dispatch
(`duel.ts` — `lockPlayer` auto-plays AI's first card if unlocked, so real-time
who-locked-first is invisible to the engine). The read is pure server-side knowledge
ordering.

**Determinism / future verification:** `/match-result` is currently a stub. When replay
verification gets implemented, the read roll must be a pure function of replay-known
inputs: duel seed / rng state + round + attempt count (log attempts with the match
record) so replays reproduce the same AI cards.

## Not doing (rejected in discussion — do not re-litigate)

- Timing-based triggers (player-controllable → exploitable).
- Always-on clairvoyance; any visible "AI sees your card" fiction beyond the lore line.
- Game-design changes (multi-card rounds, AI-locks-first boss mode, trick rebalances).
- Neural network opponent (separate future project; the same per-round move logs it
  would train on are also what a personalized opponent model would use later).

## Measurement tools (already in repo)

Run from `packages/ai-brain/`:

```bash
npx tsx src/dealscan.ts 120        # deal-difficulty ceiling (forced win/draw/loss %)
npx tsx src/leakscan.ts 14         # flat per-round read probability → win-rate table
npx tsx src/readscan.ts 22 12      # per-round read value + end-to-end schedules
```

`readscan.ts` part 2 prices the shipping schedule straight from `READ_SCHEDULE`
(single source of truth). All three re-measure after any future rule/card change.

## Build order (when implementation starts)

1. `/ai-pick` protocol: `p1Locked` field + chat-only response type + read path calling
   `bestCounter()` (already provided by `packages/ai-brain/src/read.ts`; no bluffs
   yet). Testable via direct API calls.
2. Client wait-loop: chat beats, interval re-calls, lock-first payload.
3. Bluff stalls + hard cap + varied timing.
4. Tuning pass: R2/R6 50-vs-60, bluff %, interval length; re-run `readscan.ts`.
5. Determinism: attempt logging for future `/match-result` replay verification.

## Lore framing (if it ever surfaces)

Klein's character line: **he reads players who commit too eagerly.** If the mechanic is
ever discovered, this converts it from scandal to canon.

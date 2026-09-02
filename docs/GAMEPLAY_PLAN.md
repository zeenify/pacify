# PACIFY — Gameplay Implementation Plan (v1)

> **STATUS (2026-09): HISTORICAL — superseded by what actually shipped.**
> This was the original vertical-slice plan, written against the old 13-card /
> 5-round ruleset. The slice is long done, and the rules since grew into
> **config C** (19-card catalogue, 7 cards / 7 rounds, score threshold 20 —
> see `docs/SPEC.md` §2). What diverged from this plan:
>
> - **Cards:** 13 → 19 (numbers 1–12, 7 tricks incl. Executioner + Eclipse);
>   5 rounds → 7; climax multiplier moved R5 → **R7** (×2); Echo +1 additive, cap ×3.
> - **Brain:** the LLM *does* pick the final card (D2 reversed) — but only from
>   the deterministic solver's winning pool, so it can never weaken play. The
>   brain itself is a full-depth **solver** with full vision of your hand
>   (`packages/ai-brain/src/solver.ts`), not the belief-EV policy planned in P2.
> - **Dealing:** trick-count distributions per seat (config C), not "30% trick rule".
> - **Files:** `duel.tsx` became the `campaign` flow + `public/duel-prototype.html`;
>   AI picks go through the server's `/ai-pick` (LLM persona picker + fallback brain).
>
> The phase breakdown below is kept for archaeology. Source of truth for
> rules: `docs/SPEC.md` §2 (v0.4).

---

## Decisions locked before we start

| # | Decision | Call |
|---|---|---|
| D1 | No round timer in PvE | Reveal fires when player locks. AI pre-locks at round start. Timer returns later as MP host-policy / optional Blitz modifier. |
| D2 | Card pick | Brain (deterministic TS) only in v1. LLM never picks. Hybrid override = post-v1 spice. |
| D3 | Player hand v1 | Random 5 uniques from catalogue (30% trick rule). Deckbuilding UI later. |
| D4 | Dialogue | Event-driven (round_start / dwell / hover / lock / reveal-aftermath / streak / trick). Filter: chattiness + cooldown + dedup + max 2/round. No speech during reveal cinematic; aftermath gloating allowed. |
| LLM | Challenge/mid-duel/post-win via `/dialogue` proxy. Gate tables evaluated in code; LLM writes the line for the outcome. 8s timeout → canned fallback. Never blocks. |
| D5 | One duel page for all 13 | Per-student uniqueness = content modules (persona + policy + gate table + gimmick plugin). Engine exposes hooks + modifier vocabulary; per-student UI renders in a "student stage" slot. |
| D6 | AI card lock timing | Brain decides at round start (transcript records it then — replay-safe). *Presentation* of the face-down card is tempo-theater (cocky slams early, careful hovers). |
| D7 | First student | Klein Pierce — 2♣, codename KLEIN. Baseline brutal, no gimmick. |

---

## Phase 0 — Card catalogue + rules constants (half day)

**Files:** `packages/engine/src/cards.ts`, `packages/engine/src/rules.ts`

- 13-card catalogue as data: `{ id, name, power, align: "good"|"bad"|"trick", effect? }`
  - Bandit 1 Bad · Paladin 2 Good · Ogre 3 Bad · Knight 4 Good · Witch 5 Bad ·
    Wizard 6 Good · Demon 7 Bad · Angel 8 Good
  - Tricks (neutral): Void `null` · Oracle 3 · Reversal 4 · Ward 3 · Echo `null`
- Rules constants: trick priority order, Round 5 ×2, Echo→next ×2 (×3 cap if next is R5), floor 0, singleton rule, 30% trick-per-hand draw weight.

**Exit:** catalogue + rules exported, typed, no logic yet.

## Phase 1 — Engine core (~2 days) ← everything depends on this

**Files:** `packages/engine/src/{duel.ts, rng.ts, events.ts, index.ts}` + `*.test.ts`

- `createDuel({ seed, studentId, playerDeck? })` → `DuelState`
  - mulberry32 seeded RNG; deal 5 uniques per side from catalogue, no dup across hands
- `dispatch(state, action)` → `{ state, events[] }`
  - actions: `LockPlayer {cardId}`, `LockAI {cardId}`, `NextRound`
  - engine resolves a round only when **both** locks present (no timer — reveal waits for player)
- Trick resolution order: Void → Ward → others (Oracle/Reversal/Echo) → number clash
- Scoring: alignment-diff rule, R5 ×2, Echo next-round ×2 (×3 cap), floor 0
- Transcript: append-only action/event log (replay = re-dispatch from seed)
- `replay(seed, transcript)` → final state (used by server validation)

**Exit:** vitest green — deal uniqueness · every trick pair · Echo→R5 cap ·
Ward-blocks-trick · full 5-round sim · replay determinism (same seed+actions = same state).

## Phase 2 — Brain v0 (~1 day)

**Files:** `packages/ai-brain/src/{belief.ts, ev.ts, policy.ts}` + Klein policy JSON

- Belief: `catalogue − burned − own hand = player possibles` (+ probabilities)
- EV per own card = Σ P(opp card) × points(my, theirs) using engine rules
- Opponent model v0: played-cards histogram only
- Klein policy JSON: near-rational + small noise (tuned to lose believably later, `SPEC.md:129`)
- Headless sim: Brain vs random ×1k → Brain winrate sanity check

**Exit:** Brain picks legal cards, beats random decisively, fully deterministic given seed+state.

## Phase 3 — Duel page + placeholder cards (~2 days)

**Files:** `apps/web/app/duel.tsx`, placeholder card component in `packages/ui-kit` or local

- Layout (landscape): AI hand top (face-down) · your hand bottom · center reveal slots ·
  score plates · round pips · dialogue box docked bottom-left
- Placeholder cards: themed Views — power number, name, Good/Bad/Trick color coding
- Flow: `createDuel` on mount → tap card → lock → flip reveal (simple) → tally →
  next round → VICTORY/BREAKDOWN → retry
- AI lock: Brain at round start; face-down card *presentation* delayed by tempo profile (theater only)
- No speech yet — dialogue box renders placeholder "..." state

**Exit (M2 gate):** you can lose to Klein end-to-end on the web build.

## Phase 4 — Dialogue controller, canned only (~1 day)

**Files:** `apps/web/lib/dialogue/controller.ts`, `students/klein.lines.ts`

- Event stream: `round_start, dwell(5s/15s/30s), card_hover, tracker_open, player_lock,
  reveal_aftermath, streak, trick_played, match_end`
- Filter: chattiness weight → cooldown (~10s) → max 2/round → dedup vs last 6 lines
- Klein canned pools ~20 lines across templates: tempo taunt, lock reaction, trick tease,
  post-reveal gloat/tilt, stall mock
- VN box: typing effect, one line at a time

**Exit:** Klein talks during your deliberation, reacts to locks/tricks, never during reveal, never spams.

## Phase 5 — Server wiring (~1–2 days)

**Files:** `apps/server/src/duel.ts`, `packages/db` (check existing schema from campaign)

- `POST /duel/start` → `{ duelId, seed }` (auth'd; offline client falls back to local seed + queue)
- `POST /match-result` → body `{duelId, seed, transcript, result}`:
  - server replays via **same** `packages/engine` → verify final state matches claimed result
  - sanity: `wins ≤ old+1`, score plausible → persist `progress`, `matches`, `stats`
  - reject → ignore write (client's local copy corrected on next sync)
- Client: optimistic local update on match end; background POST with retry queue
- Wager note (future 3♣): bets/bans recorded server-side here

**Exit:** win a duel → progress row updates in Postgres; tampered transcript rejected.

## Phase 6 — LLM dialogue (~2 days)

**Files:** `apps/server/src/dialogue.ts`, `apps/web/lib/dialogue/llm.ts`, `students/klein.persona.ts`

- `POST /dialogue` proxy: Gemini 3.5 Flash Lite, key server-side only
  - budget (≤12/match, daily cap), response cache (student+template+state-bucket), 8s timeout
- Klein persona sheet (voice rules, dark tone locked per `SPEC.md:203`)
- **Challenge gate table** (code-evaluated on campaign page):
  - `games == 0` → deny · beaten-2♣? accept · losses vs 2♣ ≥ N → accept_ridicule · default accept
  - outcome + context → prompt → line; fallback pool covers timeout/refusal
- Mid-duel batched call (talk rounds only): 3 variants + state JSON
  `{round, scores, my_locked_card, burned[], your_tempo, template}`
  — `my_locked_card` included so Persona can bluff/truth-tease; lies have zero mechanical effect
- Post-win directed line (goal: hint next student / lore / psyche crack)

**Exit:** challenge plays a varied in-character beat; mid-duel lines vary; dead API = canned lines, game unaffected.

## Phase 7 — Klein polish pass

- Playtest-tune policy (target: beatable-but-likely-to-win first encounter)
- Reveal cinematic juice (diagonal wipe, slam, ransom damage numbers)
- Count-tracker UI (burned / possible-remaining) — feasible because no timer
- Fill taunt variety; intro scene (first encounter) vs rematch skip
- **Then** student #2 (3♣ wager gimmick) to prove the plugin/hook API before mass-producing

## Explicitly NOT in this plan

Card art (placeholders until loop feels good) · students 3–13 · deckbuilding ·
Blitz mode · multiplayer · how-to-play screen (last, per your call) · TTS.

---

## Dependency chain (strict)

```
P0 ─► P1 ─► P2 ─► P3 ─► P4 ─► P5 ─► P6 ─► P7
     engine  brain  page  canned  server  LLM   polish
```

P3 can start in parallel with P2 (page vs random AI) if desired, but Brain lands before polish.

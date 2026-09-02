# PACIFY — Technical + Design Spec (v0.4)

Title: **PACIFY** (locked). Successor to "Pacifist" (2021-ish, `multiP card game`).

> **IMPLEMENTATION STATUS (2026-09):** the game rules in §2 are **shipped** in
> `packages/engine` (config C — 19-card catalogue, 7-card hands, 7 rounds) and
> match the code exactly. The AI architecture in §3 is **shipped**: a full-depth
> solver brain + Gemini persona picker (`packages/ai-brain`, `apps/server`).
> Campaign framing (13 Students, economy, multiplayer) remains **design vision**
> — only Student #2 "Klein" exists. Where this doc and the code disagree, the
> code wins; file an issue to sync the doc.

Status: v0.4. Locked: hidden hands · simultaneous reveal · web-first landscape PWA (no Store) · 7 cards / 7 rounds · score-based (not HP) · 7 trick cards with assigned powers · score threshold 20 · intro scene on first fight + goal-directed post-win AI dialogue · stats-aware AI · Gemini persona picker. Remaining **[OPEN]** live in §12.

---

## 0. Product Pillars

1. **Every fight is a mind game.** The AI doesn't just play cards — it talks, bluffs, threatens, and adapts. Psychology is a mechanic, not flavor text.
2. **Hard from minute one.** Student #1 can beat you. There is no tutorial-shaped first boss. Losing is the intended first experience; adaptation is the progression.
3. **Style is content.** Persona-grade UI motion and sound design is a feature with its own milestone, not polish at the end.
4. **One codebase, everywhere.** Mobile (iOS/Android) + web from a single React Native codebase.
5. **Rebuild debt-free.** No plaintext passwords, no flat-file DB, no client-authoritative logic, no dumb-relay server.

---

## 1. Old Game Post-Mortem ("Pacifist")

What the old game actually was (from reading `index.js` + `index.html`):

- 2–4 players per room; lobby system (create/join tables), room chat, coin bets, ready-up countdown.
- Deck = 9 unique card types: Bandit(1,Bad) Paladin(2,Good) Ogre(3,Bad) Knight(4,Good) Witch(5,Bad) Wizard(6,Good) Demon(7,Bad) Angel(8,Good) Ace(0,SEER).
- Each player dealt 5 random cards; 5 rounds; each round everyone secretly picks 1 of their 5 cards; simultaneous reveal.
- Scoring vs each opponent's revealed card:
  - Equal power, or any Ace involved → nothing.
  - Your power higher: opposite alignment → +(power diff); same alignment → 0.
  - Your power lower: opposite alignment → −1 (flat).
  - Round 5 doubles everything. Score floored at 0. Highest score takes the pot.

### What died with v1 (and why)

| Problem | Consequence |
|---|---|
| Alignment = parity of power (even=good, odd=bad) | Zero hidden info, zero bluffing space. Reads are trivial. |
| Simultaneous reveal with no other decisions | Pure draw luck after the pick. |
| Opaque scoring (flat −1, x2 final round) | Players can't reason about outcomes → feels random. |
| All logic client-side, server = dumb relay | Trivially cheatable; desync bugs. |
| Plaintext passwords in JSON; socket listeners re-registered every event (leak); race conditions on coins | Security/correctness disasters. |
| Generic AI-generated fantasy JPGs | No art direction, inconsistent style. |

### What survives into CLASS WAR

- The skeleton: numbered cards + good/bad alignment + secret commitment + simultaneous reveal + round-based match. This DNA is genuinely good — it just needs depth bolted on (see §3).
- Coins/economy concept, leaderboard concept, lobby chat concept (returns later with multiplayer).

---

## 2. Game Design — PACIFY

The card game is a self-contained game with its own cast (original dark-fantasy roster — NO school retheme; the Delinquent/Valedictorian idea is dead). Framing: 13 AI **Students** play this game against you, campaign-style. Each has their own deck, habits, and mouth.

### 2.1 Core loop (config C — SHIPPED, matches `packages/engine`)

- Duel = you vs one Student. **7 rounds, 7 cards each** (one card per round, no refill — `hand == deck` for that duel). First to **20 points** wins immediately (`SCORE_THRESHOLD`); otherwise highest total after Round 7 wins.
- **Hands are hidden.** 14 of the 19 catalogue cards are dealt (7 per side, singleton rule below); 5 stay undealt — so hidden hands allow counting/deduction (poker reads), not blind luck.
- Per round, COMMIT phase: each side locks ONE card face-down (number or trick). Simultaneous reveal. The AI pre-locks at round start; the reveal waits for the player.
- **Singleton rule:** each card type appears at most **once per match** across both hands (no duplicates). Reversal vs Reversal can never happen; same for any other trick/number.
- Dealing (config C): each hand's trick COUNT is sampled from a distribution (you: 10% 1 / 50% 2 / 40% 3 tricks; the Student nudged higher: 7% / 43% / 50%), then filled with that many tricks + numbers drawn from a shuffled pool. Max 3 tricks/hand.
- SCORING (score, not damage):
  - Numbers have power 1–12; tricks have fixed powers (Oracle 5 / Reversal 6 / Ward 5 / Executioner 0, Void/Echo/Eclipse `null`).
  - Normal clash: higher power wins, winner gains `winnerPower − loserPower` **only if** alignments differ (Good vs Bad). Same alignment → 0 (**the shield**). Tie → 0.
  - **Round multiplier:** Round 7 is **×2**; an active Echo adds +1 (additive, **cap ×3**). Floor 0.
- TRICK PRIORITY: **1. Void** (voids everything, no exceptions) → **2. Ward** (blocks an opponent trick — it never activates, Eclipse included — + flat 5 × mult points) → **3. Rest** (Eclipse / Echo / Oracle / Reversal / Executioner + the clash, firing independently). Ward vs a number falls through to a normal 5-power clash.
- **Eclipse** is a *soft* void: it zeroes this round's clash and opens a 2-round shields-off window, but other tricks still fire alongside it (Ward can still block it). While `shieldOff > 0`, same-alignment clashes score normally (shields disabled).

### 2.2 Cards — the roster (19 cards)

Number cards (12, alternating alignment — odd Bad, even Good):

| Card | Power | Align | | Card | Power | Align |
|---|---|---|---|---|---|---|
| Bandit | 1 | Bad | | Vampire | 7 | Bad |
| Paladin | 2 | Good | | Valkyrie | 8 | Good |
| Ogre | 3 | Bad | | Leviathan | 9 | Bad |
| Knight | 4 | Good | | Seraph | 10 | Good |
| Witch | 5 | Bad | | Demon | 11 | Bad |
| Wizard | 6 | Good | | Angel | 12 | Good |

Tricks (7, neutral alignment — tricks ignore the same-alignment shield and always score the full diff):

| Trick | Power | Effect | Counterplay |
|---|---|---|---|
| **Void** | `null` | **Top priority.** Voids the entire round regardless of the opponent's card. 0 points to anyone. | Bait it against a low commit |
| **Oracle** | **5** | Peek 2 random cards from the opponent's remaining hand (they learn you peeked). Also clashes as a 5-power card. | It's just a 5 — loses to 6+ |
| **Reversal** | **6** | Scores as a 6-power clash, then **swaps both players' total match scores** (after adding round points). | Terrible to play while ahead; the owner loses their own lead |
| **Ward** | **5** | If the opponent played a trick: it is **blocked completely** (no effects) + Ward holder gains **flat 5 × mult**. vs a number: normal 5-power clash. | Opponent plays a number that round and beats your 5 |
| **Echo** | `null` | Voids this round (0 pts) but **doubles next round's points** (additive with Round 7, cap ×3). Other tricks still fire alongside it. | It's a wasted round — punish the tempo loss |
| **Executioner** | **0** | If the opponent committed a **number 7+**: their **total score is executed to 0**. Body is power 0 (loses every clash). | Never commit a 7+ number when it's live; force it out early |
| **Eclipse** | `null` | **Soft void:** zeroes this round's clash, and for the **next 2 rounds alignment shields are disabled** (same-alignment clashes now score). Other tricks still fire. | Shields return — spend big numbers during the window |

> **Multiplier stacking (locked):** `mult = 1 + (round 7 ? 1 : 0) + (echo active ? 1 : 0)`, capped ×3. Round 7 + Echo = ×3, never ×4.

Suits (♠♣♦♥ from the cover art) remain future design space: damage types / resistances. Not v1.

### 2.3 Decks & loadouts

- Each duel: **7-card hand = your deck for that duel**, dealt from config C (§2.1). No duplicates across both players; 5 catalogue cards stay undealt each match.
- Numbers 1–12 plus the 7 tricks are the full catalogue. Students have authored tendencies that express personality (a gambler favors Reversal+Echo, a control player favors Ward+Oracle). Counting which cards are still unseen is the core read — for the human. The AI, by design, sees more (§2.6, §3).

### 2.4 Dialogue & psychology

**Pre-fight intro scene (first encounter only):** each Student gets a short VN-style intro (portrait, 2–3 lines) before their first duel — sets the goal of the confrontation. Subsequent rematches skip to "FIGHT."

**Mid-duel taunts:** the AI talks *during* commits. Taunts are flavor + pressure, no separate HP bar. Scoring stays the single source of truth (per your call — no damage/heal).

**Post-win directed dialogue:** when you beat a Student, Gemini generates a **unique, goal-directed** line each time — not generic trash talk, but conveying something specific: a hint about the next Student, a crack showing their psyche, lore about the school. Prompt includes the directed goal + the Student's persona sheet. Canned fallback pools cover offline/rate-limit.

**Stats-aware AI (alive feel):** the server tracks per-player, per-Student stats — matches played, wins/losses, average round score, trick usage, streaks, which card you play most — and feeds a compact summary into every dialogue prompt. Example: Student 5 can sneer *"Still spamming Angel after three losses, huh?"* because the Brain actually knows you do.

Player taunts: quick-select menu (6–8 canned claims + target card), not free text in v1.

### 2.5 Campaign — the 13 Students

- Linear ladder on a campaign map (Persona-style: venue cards, web-first landscape layout).
- Every Student = distinct (a) portrait, (b) accent color, (c) dialogue persona sheet for the LLM, (d) 7-card hand + dealing weights, (e) AI skill/robustness params, (f) **one gimmick rule modifier** — like Balatro bosses:
  1. *The Freshman* — baseline brutal: heuristic + aggressive taunts. (No gimmick; hardness comes from policy.)
  2. *The Mimic* — copies your last played card's effect each round.
  3. *The Counting House* — gains +1 bonus point whenever any tie occurs.
  4. *The Snitch* — sees your locked card 50% of rounds (telegraphed: "someone told me...").
  5. *The Idol Wannabe* — +1 point on her wins AND your losses.
  6. *The Exchange Student* — swaps one card with you each round (declared).
  ... through 13. Final student breaks a core rule (e.g., can peek your whole hand once).
- **First encounter:** intro scene (see §2.4). **On clear:** unique goal-directed post-win line. Losing: retry freely. Winning unlocks next Student + coins + cosmetics.

### 2.6 Difficulty philosophy (updated 2026-09: full vision is the design)

- **The AI plays with FULL VISION — it sees your entire hand from round 1.** This is a deliberate "cheating gimmick" per design (mirrored in the engine's `BrainView.oppHand`). The knowledge edge is the point: the human gets hidden information and psychology; the AI gets perfect information and search. Neither sees the other's *locked card* before reveal — the commit stays simultaneous, which is what keeps the game winnable.
- Why simultaneous commit matters: with one-way vision the AI still cannot know your lock, so no line through the game tree is safe — it optimizes a blend of "worst case if you counter perfectly" and "expected value against how humans actually play" (§3). Simulation shows a perfect lock-reader would beat even the solver in ~every deal; real players can't do that.
- Difficulty scales by **opponent-model skill + robustness** (how much the AI trusts its model of you vs hedges against your best reply), not by cheating more or less. The persona layer can never weaken the AI — the LLM only picks among the solver's winning moves.
- Practice/sparring vs unlocked Students so grinding reads is possible.

### 2.7 Economy

- Coins earned per win (first-clear bonuses big, repeat clears small).
- Spend on: card frame cosmetics, table/skyline skins, dossier entries (lore), maybe alternate card art variants. No pay-to-win. **[OPEN]** monetization вообще? (premium app / free+cosmetics / none for now — recommend NONE until there's a game).

### 2.8 Multiplayer (locked)

- Visible "COMING SOON" menu tile, tappable → teaser screen + "notify me" (collect emails = marketing list).
- Not built in v1. Architecture still prepares for it: authoritative server engine (same TS engine package runs server-side), deterministic + seeded shuffles, all state via events (replayable), transport abstraction so Socket.io/Colyseus can slot in without touching game code.

---

## 3. AI Opponent Architecture (SHIPPED — `packages/ai-brain`)

Two strictly separated layers:

```
┌──────────────────────────────────────────────────┐
│ LAYER 2: PERSONA (Gemini, server-side proxy)     │
│  - in-character pick MESSAGE + reasoning         │
│  - PICKS THE FINAL CARD — but only from the      │
│    solver's winning pool (within 2% of best),    │
│    so personality can never weaken the brain     │
│  - input: persona sheet + pool ids + board state │
│    + round results (stateful conversation chain) │
│  - output: picked card id + 1-2 sentences        │
├──────────────────────────────────────────────────┤
│ LAYER 1: SOLVER BRAIN (deterministic TS)         │
│  - FULL VISION: sees the opponent's entire       │
│    remaining hand (BrainView.oppHand)            │
│  - exact deep search of the remaining game:      │
│    per move, a worst-case FLOOR (maximin — the   │
│    outcome guaranteed even against a perfect     │
│    counter-picker) + EV under a calibrated       │
│    blind-human model (uniform ⊕ swing softmax)   │
│    v = κ·floor + (1−κ)·ev, κ from character skill│
│  - ~2.5s cold at round 1, ~free afterwards       │
│    (memoized, ~222k states; grids cached —       │
│    round math is score-independent)              │
│  - never sees the opponent's current lock        │
│    (simultaneous commit is what keeps it beatable)│
│  - partial vision (no oppHand): marginalizes     │
│    over consistent hand completions              │
└──────────────────────────────────────────────────┘
```

Shipped modules: `solver.ts` (the search), `god.ts` (`rankMoves` → winning pool, `chooseGodCard` seeded mix), `belief.ts` (fair-info belief pool, used for partial vision + 1-round EV), `characters/` (per-Student persona sheets + skill). Validation lives in `arena.ts` + `sim.ts`: full-engine duels vs human models (random / greedy / modeled / perfect-blind / clairvoyant) — the solver beats the old EV brain vs every human-like model (93% vs 80% vs the modeled human) and the κ=1 mode is verified against a clairvoyant adversary by reproducing the deal's game value exactly.

### 3.1 Per-Student tuning

Each Student = `{ name, skill, personality }` in `characters/`. `skill` feeds both the human model's rationality and the default robustness κ (`defaultRobustness: 0.25 + 0.35·skill`); `personality` is natural-language prose the LLM picker uses to choose among winning moves — adding a Student means editing prose, not magic numbers. Per-Student trick playstyles (data-driven JSON) remain a future layer.

### 3.2 Memory, gossip & one-way random speech

- **Per-account, per-Student history:** every AI line is stored as `dialogue_history(user_id, student_id, line, goal, created_at)`. 13 Students × N players = isolated threads. No cross-player leakage.
- **Gossip peek:** any Student's prompt can include a *summary* of another Student's history with the same player (e.g. Student 5 can read Student 1's thread). Used sparingly via a `gossip` flag in the persona sheet — line feels like intel: *"Heard you needed 15 tries to beat #1. Pathetic — he hasn't even taken a point off me."*
- **Stats in prompt:** `stats` + `progress` injected as compact JSON every call — enables the example you gave verbatim. No "favorite card" (hands are random 5 uniques). Instead we track *playstyle* + per-AI records:
  - overall: wins, losses, draws, streak
  - per-Student: attempts vs AI-N, wins vs AI-N, losses vs AI-N, best score
  - behavioral tags derived: saves tricks late / plays high cards early / safe vs risky (e.g. Ward hold rate, Reversal frequency, Echo timing)
- **Context window:** Gemini has high TPM, so we send last **15 turns** of *this* Student's thread + gossip snippet (if flagged) + stats/playstyle block + current board state. No summary truncation needed; we can add other stats as we deem necessary without hitting limits. Stays under 500 RPD via caching.
- **One-way, random timing:** player cannot chat back. AI speech is an independent timer, not tied to moves: 20–40% chance each round, plus guaranteed intro (first fight) and post-win goal-directed line. A cooldown prevents spam. Feels like a person who talks when they want to, not a bot that replies on cue.

Why split:
- Correctness: move legality/scoring never depends on an LLM's mood or hallucination.
- Latency: Brain answers in <1ms locally. LLM lines stream in async; the reveal animation (2–3s of juice) hides generation time. If LLM is slow/down → canned line pools per Student (also required for offline mode).
- Cost: free tier is **500 requests/day** on Gemini 3.5 Flash Lite (AI Studio key). Budget design: ≤12 LLM calls per match, each call asks for **3 line variants** (batching), responses cached by (student, event-template, state-bucket). That yields ~40 matches/day across all players — plenty for beta; paid tier is trivial when scaling. Never block gameplay on the LLM.

Safety rails (non-negotiable):
- Server-side proxy only — **API keys never ship in the client binary.**
- Output length cap; response cache; per-user daily budget; refusal/timeout → hand-written dark fallback lines.
- Tone is LOCKED dark, no in-fiction ceiling. Remaining practical constraints (not taste): store content-rating disclosure (Mature), and Google's safety filters may refuse the most extreme generations — fallback pools cover those cases so the mask never slips.

Offline mode: engine + canned dialogues work with zero network; progress queues locally (SQLite/MMKV), syncs on reconnect.

**Client cache (your idea — correct for Pacify):** fetch once on launch (progress/stats/15-turn history/loadout) into Zustand + persisted MMKV, then play entirely from local var. Every mutation updates local var *immediately* (feels native) + async write-through to Render with retry queue. No per-second reads. Revalidate only on cold start / resume. Server sanity check `new_wins <= old_wins + 1` (and same for losses/draws/best_score) runs async in background — rejects `15 -> 100` jumps without blocking UI; ignored writes are overwritten next launch.

---

## 4. Tech Stack

| Layer | Choice | Rationale |
|---|---|---|
| App | **Expo (React Native, SDK 54+) + expo-router** | One codebase → iOS/Android/web. Currently web-first (`apps/web`, port 8081). |
| UI/motion | react-native-reanimated 3 + @shopify/react-native-skia (+ moti) | Skia for jagged masks/halftone/particles; Reanimated for kinetic transitions. Works on web via RN Web. |
| State | zustand + typed event bus; engine state machine is pure reducer | Engine stays portable to server for MP later. |
| Language | TypeScript everywhere | One language across app/engine/server. |
| Game engine | **`packages/engine`** pure TS: seeded RNG (mulberry32), reducer state machine, event-sourced actions | Unit-testable, replayable, server-authoritative-ready. |
| Server | Node + **Fastify** (REST) on **Render** | vs-AI needs NO realtime server in v1. REST: auth, progress/stats, dialogue proxy, **`/ai-pick`** (brain pool + persona pick). Socket.io OFF for v1, enabled on same Render service for future PvP. |
| DB | **Postgres on NeonDB** + **Drizzle ORM** | As requested. Drizzle: TS-first, migrations, edge-friendly. |
| Auth | better-auth (email+password, bcrypt/argon2) + guest mode | Fixes v1's plaintext disaster. Guest-first onboarding (play before signup), silent upgrade path. |
| LLM | **Gemini via AI Studio key** behind server proxies (`/dialogue`, `/ai-pick`); stateful Interactions chains so persona + rules are never resent | Cache + budget live server-side; provider adapter keeps swap-in of paid tiers/models trivial. |
| TTS | v1: OS voices (expo-speech). Later: server-proxied premium TTS | Free + offline-capable first; robotic voice is acceptable for v1 mood, arguably thematic. |
| Monorepo | **npm workspaces** | `npm run build` typechecks all workspaces; see layout below. |
| Quality | Vitest (engine + brain), brain sim arena (`npm run sim` in ai-brain), Sentry, EAS Update (OTA fixes) | Balance-by-simulation is how 13 Students stay tunable solo. |

Repo layout (actual):

```
pacify/
├─ apps/
│  ├─ web/             # Expo app — web-first (iOS/Android later)
│  └─ server/          # Fastify API: auth, progress, /dialogue, /ai-pick
├─ packages/
│  ├─ engine/          # PURE game rules. Zero I/O, zero React.
│  ├─ ai-brain/        # solver brain + personas + sim arena (uses engine)
│  ├─ db/              # Drizzle schema + migrations (Neon)
│  └─ ui-kit/          # Persona-styled primitives (WedgeButton, RansomTitle...)
└─ docs/
```

**[OPEN]** Honest tradeoff note: a heavy-CSS stylized UI is faster to iterate on the web (Next.js + Capacitor wrap) than RN Web. RN is viable and chosen per your requirement, but expect to lean on Reanimated/Skia rather than CSS for the wildest effects. If we ever feel blocked, fallback plan exists.

---

## 5. Data Model (Neon/Postgres, Drizzle — schema in `packages/db`, migrations in `drizzle/`; some tables below are still planned)

```sql
users           (id uuid pk, email citext unique, password_hash, display_name,
                 is_guest bool, coins int default 0, created_at, last_seen_at)
progress        (user_id fk, student_id int, cleared bool, attempts int,
                 wins int, losses int, draws int, best_score int, first_cleared_at,
                 primary key (user_id, student_id))
stats           (user_id fk, wins int, losses int, draws int, streak int,
                 playstyle jsonb, -- {saves_tricks_late:0.7, high_early:0.2, risky:0.6}
                 updated_at)
loadouts        (user_id fk, name, deck_json jsonb, is_active bool, updated_at)
matches         (id pk, user_id fk, student_id int, result enum(win/lose),
                 total_score int, opp_score int, seed bigint, created_at)
cosmetics       (user_id fk, item_id, acquired_at, primary key(user_id,item_id))
dialogue_history(id uuid pk, user_id fk, student_id int, role text, line text, goal text, created_at)
dialogue_cache  (key text pk, line text, created_at) -- LLM cache (prompt hash → 3 variants)
```

Server endpoints — **shipped**: `GET /health`, `POST /auth/guest`, `GET /progress/:userId`, `PUT /progress`, `POST /dialogue` (Gemini proxy, per-Student memory), `POST /match-result` (seed-replay validation — TODO stub), `POST /ai-pick` (solver pool → persona pick). **Planned (v1 spec)**: `POST /auth/register|login`, `GET /me`, `GET/PUT /loadout`, `GET /leaderboard`, `POST /notify`.

Anti-cheat note: client sends match transcript + seed; server re-simulates through `packages/engine` and rejects mismatches. Cheap and bulletproof since the engine is deterministic.

---

## 6. Screens / UX Flow

1. Boot → Title (logo sting, BGM, "PRESS START" energy)
2. Main Menu: CAMPAIGN / PRACTICE / COMING SOON (locked MP tile) / OPTIONS
3. Auth: guest-first, upgrade prompt after first win (loss-leader friction removal)
4. Campaign Map: 13 venue nodes, lock icons, current target looming large
5. Pre-duel: Student dossier card slams in (portrait, accent color washes screen, gimmick hint, "FIGHT")
6. Duel screen (the whole game): arena center, hands bottom (yours open) / top (theirs open), Resolve hearts left, PSYCHE gauge right, dialogue box (VN style) docked bottom-left, commit timer ring, taunt button
7. Reveal cinematic: diagonal wipe, cards slam center-screen, damage numbers in ransom-lettering, psyche-break special FX
8. Results: VICTORY/BREAKDOWN splash, coins tally, unlock reveals, retry prompt
9. Options: audio sliders, TTS toggle, text speed, reset progress, account

Mobile-first layout rules: portrait-capable duel layout (hands fan vertically), thumb-zone buttons, safe-area aware, 60fps target on mid Android (motion budget §8).

---

## 7. Visual Design Language (Persona-derived, original execution)

Primary palette: crimson `#D40000`, near-black `#111111`, paper-white `#FAFAF5`. **Each Student gets an accent hue** that recolors the duel UI when they take the stage (P3=blue, P4=yellow, P5=red — we do ×13). Halftone dots + paper grain textures throughout. Thick black comic borders everywhere.

Core pattern kit (to build in `ui-kit`):
- **RansomNote text**: mixed serif/sans glyphs, per-letter tilt/scale, 1–2 letters inverted in boxes (per official P5 style guide rules)
- **Wedge buttons**: slanted triangles pointing at the active element; single-point-perspective stacks
- **ZigZag tears** as section dividers/screen wipes; starburst + splatter accents
- **Central diagonal line** composition guiding eye to active info (Atlus CEDEC technique)
- **Offset red/black silhouette** behind focused character
- **Kinetic transitions**: stripe wipes, polygon-wiggle menus, pose-snap character intros
- **UI SFX discipline**: hover tick / confirm slash / cancel thud / reveal sting (sound IS half the Persona feel)
- Halftone dot fields, speed-line backgrounds, ゴゴゴ-style ambient glyphs (original ones)

References found for you to pick from (combine across several):

| Ref | What it does best |
|---|---|
| `ffaneto/persona5-website-theme` | wiggle-polygon keyframes, stripe page transitions, keyboard nav, BGM/SFX wiring |
| `Omicron69/persona5-style-portfolio` | MVC separation, ransom lettering impl, animated cursor strips, wipe transition, menu sfx files |
| `bruhdev1290/persona-5-style-portfolio` | React+TS+Tailwind red/black base, responsive layout patterns |
| `d0rich/nuxt-design-system` (+ live demo design.d0rich.me) | formalized SHAPE system, XRay effect, P5 font pairings, atomic background animations |
| `kenwuqianghao.github.io` | JoJo×P5 fusion shrine: halftone + speed-lines + ambient glyph text done tastefully |
| Sega Retro **official P5 Style Guide PDF** | ransom-note typography RULES, zigzag usage, splatter/star dos/don'ts — treat as the lawbook |
| Siliconera CEDEC writeup | gaze-guidance via central lines; single-accent-color discipline |

Legal note: inspired-by OK; no Atlus assets/fonts/logos ripped. All art original (AI-assisted + cleanup), fonts free-licensed (e.g., Archivo Black / Bebas Neue / Special Elite mixes for the ransom effect).

---

## 8. Motion & Performance Budget

- Every screen transition ≤ 450ms; reveal cinematic ≤ 2.5s (skippable after first view).
- Cap concurrent particles (Skia) at ~40 on mobile; halftone via pre-rendered textures not live shaders on low-end.
- Idle micro-motion everywhere (menu bg shapes, breathing portraits) — cheap transforms only (translate/scale/rotate), no blur chains on Android.
- Target: 60fps mid-range Android, graceful 30fps floor mode.

---

## 9. Asset Production Plan (ChatGPT image prompts)

Process: generate ONE style-anchor image first; reuse its exact style wording in every later prompt for consistency. Generate at consistent aspect ratio (cards 3:4, portraits 1:1, backgrounds 16:9 / 9:16 both orientations for mobile+web). Ask for "simple dark background" (true transparency unreliable) and cut out in post.

**Master style clause (prepend to everything):**
> Flat 2D vector illustration, bold thick black ink outlines, limited palette: crimson red #D40000, black, off-white paper, [ACCENT COLOR]; halftone dot shading, subtle paper grain texture, dramatic diagonal composition, punk pop-art collage style inspired by modern JRPG UI art, high contrast, no text, no watermark.

**Card archetype example (Tyrant):**
> [MASTER STYLE] Single character bust portrait of an arrogant school tyrant in a disheveled uniform, arms crossed, cruel smirk, long shadow cast diagonally behind them, centered composition, simple black background, trading card art.

**Student portrait example (accent-colored):**
> [MASTER STYLE] Full-body dynamic pose of a teenage chess prodigy holding a king piece like a dagger, wind-blown coat, menacing grin, accent teal #00B3A4 rim light, offset red silhouette copy behind them, simple dark background, visual-novel character art.

**Card back:**
> Symmetric ornate playing card back, spade/club/diamond/heart motifs woven with zigzag tears and starbursts, crimson and black, halftone texture, thin white border frame, flat vector.

**Backgrounds (menu / duel arena):**
> Crumpled off-white paper wall covered in faint newspaper scraps and spray-paint splatter, torn zigzag edges, large empty center area reserved for UI, vignette corners, [MOOD COLOR] wash.

**Logo:** generate wordmark concepts as reference ONLY — rebuild real logo as vector text with per-letter ransom styling (AI text rendering unreliable).

Also needed (non-AI): BGM (royalty-free search terms: "jazz-hop battle", "acid jazz boss"), UI SFX pack (itch.io / freesound), fonts listed in §7.

---

## 10. Milestones (solo-dev realistic)

| M | Scope | Exit criteria |
|---|---|---|
| M0 (wk 1) | Repo, tooling, CI, Expo init, Fastify skeleton, Neon connected | hello-world on device+web+deployed API |
| M1 (wk 2–4) | `engine`: rules, seeded RNG, tests, AI-vs-AI sim harness | 10k sims run green; balance CSV out |
| M2 (wk 5–8) | Vertical slice: duel loop vs Student #1, placeholder art, canned lines, local persistence | you can lose to The Freshman end-to-end on a phone |
| M3 (wk 9–12) | Persona UI pass: ui-kit, transitions, reveal cinematic, SFX/BGM | slice looks like the pitch deck |
| M4 (wk 11–14) | Dialogue service: LLM proxy, taunt system, safety rails, caching | taunts resolve mechanically + read in-character |
| M5 (wk 13–17) | Campaign: 13 students data-driven, economy, auth+sync, leaderboard | full ladder playable online+offline |
| M6 (wk 17–20) | Polish: perf budget, accessibility, analytics, crash reporting, EAS builds | TestFlight/Play internal track + web beta |

Multiplayer: post-v1, separate spec (transport + matchmaking + server-authoritative rooms reusing `engine` unchanged).

---

## 11. Risks

| Risk | Mitigation |
|---|---|
| LLM latency/cost/offline | async + cache + canned fallbacks + daily budgets; LLM never blocks gameplay |
| Solo scope (13 unique students!) | everything data-driven (personas/decks/gimmicks = JSON); sim harness balances without playtesting each |
| RN Web animation ceiling | Skia/Reanimated-first effects; Next.js+Capacitor fallback documented |
| Persona UI perf on cheap Android | motion budget §8, low-spec mode flag |
| IP similarity complaints | original assets/fonts, "inspired by" naming avoided in store listing |
| Burnout | milestones cut vertically (M2 slice > M5 breadth); 13th student may ship as 13 identical-mechanics-different-flavor if needed |

---

## 12. Decisions LOCKED v0.3 + remaining OPEN

Locked: hidden hands · simultaneous reveal · **PACIFY** · score-based · 19-card catalogue (12 numbers 1–12 + 7 tricks: Void null / Oracle 5 / Reversal 6 entire-score swap after scoring / Ward 5 anti-trick flat +5 / Echo null void+double-next / Executioner 0 beheads 7+ / Eclipse null soft-void + shields-off ×2 rounds) · 7 cards / 7 rounds · Round 7 ×2 · Echo additive cap ×3 · score threshold 20 · full-vision AI (§2.6) · web-first landscape PWA (no Store) + downloadable file · first-fight intro scene + goal-directed post-win AI dialogue · stats-aware AI (wins, avg score, trick usage fed to prompts) · Gemini persona picker behind server proxies.

Still open:

1. Monetization: recommend **none** in v1. Confirm?
   *(Echo + Round 7 stacking locked to **×3 cap** per your call.)*

---

## Appendix A — v1 scoring math (reference, preserved from old code)

```
per-opponent resolution (old):
  if myPower == oppPower || either == 0: skip
  elif myPower > oppPower:
      points += (myAlignment == oppAlignment) ? 0 : (myPower - oppPower)
  else:
      if myAlignment != oppAlignment: deduction += 1
score += (points - deduction) * (round == 5 ? 2 : 1), floor 0
winner(s): highest score splits pot bet*N/winners
```

Appendix B — glossary: SCORE (match points, Round 7 ×2, threshold 20), TRICK (neutral, not Good/Bad), `null` power (Void/Echo/Eclipse void the round's clash), SHIELD (same-alignment number clash scores 0; disabled during the Eclipse window), Student (campaign AI opponent), yomi (reading gameplay).

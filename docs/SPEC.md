# PACIFY — Technical + Design Spec (v0.2 draft)

Title: **PACIFY** (locked). Successor to "Pacifist" (2021-ish, `multiP card game`).

Status: DRAFT v0.3. Locked: hidden hands · simultaneous reveal · web-first landscape PWA (no Store) · 5 cards / 5 rounds · score-based (not HP) · 5 trick cards with assigned powers · intro scene on first fight + goal-directed post-win AI dialogue · stats-aware AI · Gemini 3.5 Flash Lite (AI Studio, 500 RPD). Remaining **[OPEN]** live in §12.

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

### 2.1 Core loop (v0.3 — LOCKED: hidden hands + simultaneous reveal · score-based)

- Duel = you vs one Student. **5 rounds, 5 cards each** (one card per round, no refill — `hand == deck` for that duel). First to highest total score after Round 5 wins.
- **Hands are hidden.** Both sides' 5-card pools share the SAME known composition catalogue (§2.2) — so hidden hands allow counting/deduction (poker reads), not blind luck.
- Per round, COMMIT phase (~15–20s): each side plays ONE card face-down (number or trick). Simultaneous reveal.
- **Singleton rule:** each card type appears at most **once per match** across both hands (no duplicates). Reversal vs Reversal can never happen; same for any other trick/number.
- SCORING (score, not damage):
  - Both cards have a `power` (numbers 1–8, tricks: Oracle 3 / Reversal 4 / Ward 3, Void/Echo = `null`).
  - If Void is played → that round is **voided**: 0 points to anyone, regardless of the other card. Void is top priority over every trick.
  - Else if Echo is played → that round is 0 points, but **next round's points are doubled** (capped to ×3 if next is Round 5). Echo does not block the opponent's trick — both effects happen unless blocked by Void/Ward.
  - Else compare powers. Higher power wins. Winner gains `winnerPower − loserPower` points **only if** alignments differ (one Good, one Bad). Same alignment → 0 (v1 rule). Tricks are neutral → always score normally. Tie → 0.
  - Round 5 is **×2 points** (v1 rule, kept). Floor 0.
- TRICK PRIORITY: **1. Void** (voids everything) → **2. Ward** (if opponent played a trick: blocks it + Ward holder gets flat 3 pts, blocked trick does not activate) → **3. Rest** (both tricks activate independently — e.g. Reversal 4 + Oracle 3 = Reversal wins clash `1 pt` after scoring, then swaps totals, *and* Oracle peeks 2).

### 2.2 Cards — the roster

Number cards (originals, kept as-is):

| Card | Power | Align | Note |
|---|---|---|---|
| Bandit | 1 | Bad | |
| Paladin | 2 | Good | |
| Ogre | 3 | Bad | |
| Knight | 4 | Good | |
| Witch | 5 | Bad | |
| Wizard | 6 | Good | |
| Demon | 7 | Bad | |
| Angel | 8 | Good | |

Tricks (neutral alignment — ignores good/bad tie rule, **30% draw chance** per 5-card hand — ~1-2 tricks/hand to avoid all-trick hands):

| Trick | Power | Effect | Counterplay |
|---|---|---|---|
| **Void** | `null` | **Top priority.** Voids the entire round regardless of opponent's card/trick. 0 points to anyone. Both cards burn. | Waste it against a low commit |
| **Oracle** *(Seer)* | **3** | Peek 2 random cards from opponent's hidden hand. Scores normally as a 3-power card (no void). | It's just a 3 — loses to 4+ normally |
| **Reversal** *(Swap)* | **4** | **After** the round is scored normally using power 4, swap the two players' *total accumulated* match scores (even on win/lose/tie). | You may be swapping into a worse total; opponent can play low to minimize round points before swap |
| **Ward** *(Anti-Trick)* | **3** | If opponent played a trick this round: block their trick completely + you gain **flat 3 points** (not power diff). If opponent played a number: normal clash as a 3-power card. | Opponent avoids trick that round and just beats your 3 |
| **Echo** *(Double Take)* | `null` | Voids current round (0 points, like Void) but **doubles the points earned next round.** | See note below on Round 5 stacking |

> **Round 5 ×2 interaction:** `Echo` on Round 4 would make Round 5 worth ×4 if stacks multiplied (`×2 Echo × ×2 Round 5`). That's intentionally capped: if Echo targets Round 5, that round is **×3, not ×4** (additive: base 1 +1 Round5 +1 Echo). Prevents astronomical swing while keeping Echo powerful. Alternative we can discuss: forbid playing Echo on Round 4 entirely.

Suits (♠♣♦♥ from the cover art) remain future design space: damage types / resistances. Not v1.

### 2.3 Decks & loadouts

- Each duel: **5-card hand = your deck for that duel.** 5 unique cards dealt/built, no duplicates across both players for that match. Example: you `Angel 8, Demon 7, Knight 4, Void null, Ward 3` vs Student `Reversal 4, Echo null, Oracle 3, Paladin 2, Bandit 1`.
- Numbers 1–8 plus the 5 tricks above are the full catalogue. Students have authored tendencies that express personality (a gambler favors Reversal+Echo, a control player favors Ward+Oracle). Counting which cards are still unseen is the core read.

### 2.4 Dialogue & psychology

**Pre-fight intro scene (first encounter only):** each Student gets a short VN-style intro (portrait, 2–3 lines) before their first duel — sets the goal of the confrontation. Subsequent rematches skip to "FIGHT."

**Mid-duel taunts:** the AI talks *during* commits. Taunts are flavor + pressure, no separate HP bar. Scoring stays the single source of truth (per your call — no damage/heal).

**Post-win directed dialogue:** when you beat a Student, Gemini generates a **unique, goal-directed** line each time — not generic trash talk, but conveying something specific: a hint about the next Student, a crack showing their psyche, lore about the school. Prompt includes the directed goal + the Student's persona sheet. Canned fallback pools cover offline/rate-limit.

**Stats-aware AI (alive feel):** the server tracks per-player, per-Student stats — matches played, wins/losses, average round score, trick usage, streaks, which card you play most — and feeds a compact summary into every dialogue prompt. Example: Student 5 can sneer *"Still spamming Angel after three losses, huh?"* because the Brain actually knows you do.

Player taunts: quick-select menu (6–8 canned claims + target card), not free text in v1.

### 2.5 Campaign — the 13 Students

- Linear ladder on a campaign map (Persona-style: venue cards, web-first landscape layout).
- Every Student = distinct (a) portrait, (b) accent color, (c) dialogue persona sheet for the LLM, (d) 5-card hand, (e) AI policy params, (f) **one gimmick rule modifier** — like Balatro bosses:
  1. *The Freshman* — baseline brutal: heuristic + aggressive taunts. (No gimmick; hardness comes from policy.)
  2. *The Mimic* — copies your last played card's effect each round.
  3. *The Counting House* — gains +1 bonus point whenever any tie occurs.
  4. *The Snitch* — sees your locked card 50% of rounds (telegraphed: "someone told me...").
  5. *The Idol Wannabe* — +1 point on her wins AND your losses.
  6. *The Exchange Student* — swaps one card with you each round (declared).
  ... through 13. Final student breaks a core rule (e.g., can peek your whole hand once).
- **First encounter:** intro scene (see §2.4). **On clear:** unique goal-directed post-win line. Losing: retry freely. Winning unlocks next Student + coins + cosmetics.

### 2.6 Difficulty philosophy

- Student #1 must be beatable-but-likely-to-win vs a new player (target: ~70% AI winrate on first encounter, dropping as you learn reads).
- AI strength comes from: belief-state tracking over the hidden enemy hand + personality noise + deliberate player-modeling (tracks your patterns: "you Ward whenever you hold Oracle"). NOT from cheating — it reads only what a human at that seat could legally know, except explicitly telegraphed gimmicks.
- Practice/sparring vs unlocked Students so grinding reads is possible.

### 2.7 Economy

- Coins earned per win (first-clear bonuses big, repeat clears small).
- Spend on: card frame cosmetics, table/skyline skins, dossier entries (lore), maybe alternate card art variants. No pay-to-win. **[OPEN]** monetization вообще? (premium app / free+cosmetics / none for now — recommend NONE until there's a game).

### 2.8 Multiplayer (locked)

- Visible "COMING SOON" menu tile, tappable → teaser screen + "notify me" (collect emails = marketing list).
- Not built in v1. Architecture still prepares for it: authoritative server engine (same TS engine package runs server-side), deterministic + seeded shuffles, all state via events (replayable), transport abstraction so Socket.io/Colyseus can slot in without touching game code.

---

## 3. AI Opponent Architecture

Two strictly separated layers:

```
┌─────────────────────────────────────────────┐
│ LAYER 2: PERSONA (Gemini 3.5 Flash Lite)    │
│  - goal-directed lines + mid-duel taunts    │
│  - HYBRID PICKER: receives candidates +     │
│    picks the final card with reasoning      │
│  - input: persona sheet + stats summary     │
│    + directed goal + candidates (top +      │
│    risky) + belief-state summary            │
│  - output: chosen card + 1-2 sentences      │
├─────────────────────────────────────────────┤
│ LAYER 1: BRAIN (deterministic TS)           │
│  - belief-state over hidden enemy hand      │
│  - generates CANDIDATES: top 2 EV moves +   │
│    2 tricky/unorthodox sensible moves       │
│    (4 total max — hand is only 5 cards)     │
│  - per-Student trick playstyles (see §3.1)  │
│  - opponent modeling (histograms, trick     │
│    tendencies, avg score)                   │
│  - never sees the opponent's current lock   │
│    (fair simultaneous)                      │
└─────────────────────────────────────────────┘
```

### 3.1 Per-Student trick playstyles (fair, no peek)

Each Student's Brain has a weighted profile for *when* to play its tricks — Oracle included. Examples:

- **The Freshman (baseline):** holds tricks for Round 5 ×2; Oracle early (Round 1-2) to gather info.
- **The Gambler:** favors Reversal + Echo — will Echo Round 3 to set up a big Round 4, Reversal only when losing total.
- **The Warden:** favors Ward — holds it specifically to snipe expected Reversal/Oracle, not to throw early.
- **The Librarian (Oracle specialist):** Oracle's 2 peeked cards are chosen by heuristic: highest-EV hidden cards (the ones that most change the belief-state), not random.

Tuning is data-driven JSON per Student; hybrid lets Gemini override the heuristic with a risky line and justify it in the taunt.

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
| App | **Expo (React Native, SDK 54+) + expo-router** | One codebase → iOS/Android/web. EAS builds. Dev client for native modules. |
| UI/motion | react-native-reanimated 3 + @shopify/react-native-skia (+ moti) | Skia for jagged masks/halftone/particles; Reanimated for kinetic transitions. Works on web via RN Web. |
| State | zustand + typed event bus; engine state machine is pure reducer | Engine stays portable to server for MP later. |
| Language | TypeScript everywhere | One language across app/engine/server. |
| Game engine | **`packages/engine`** pure TS: seeded RNG (mulberry32), reducer state machine, event-sourced actions | Unit-testable, replayable, server-authoritative-ready. |
| Server | Node + **Fastify** (REST) on **Render** | vs-AI needs NO realtime server in v1. REST: auth, progress/stats, dialogue proxy (Gemini key hidden), history. Socket.io OFF for v1, enabled on same Render service for future PvP. |
| DB | **Postgres on NeonDB** + **Drizzle ORM** | As requested. Drizzle: TS-first, migrations, edge-friendly. |
| Auth | better-auth (email+password, bcrypt/argon2) + guest mode | Fixes v1's plaintext disaster. Guest-first onboarding (play before signup), silent upgrade path. |
| LLM | **Gemini 3.5 Flash Lite** via AI Studio key behind own `/dialogue` proxy | Free 500 RPD covers beta; provider adapter keeps swap-in of paid tiers/models trivial; cache + budget live server-side. |
| TTS | v1: OS voices (expo-speech). Later: server-proxied premium TTS | Free + offline-capable first; robotic voice is acceptable for v1 mood, arguably thematic. |
| Monorepo | pnpm workspaces + Turborepo | See layout below. |
| Quality | Vitest (engine), Monte-Carlo sim harness (balance), Sentry, EAS Update (OTA fixes) | Balance-by-simulation is how 13 Students stay tunable solo. |

Repo layout:

```
pacify/
├─ apps/
│  ├─ mobile/          # Expo app (iOS/Android/web)
│  └─ server/          # Fastify API + dialogue proxy
├─ packages/
│  ├─ engine/          # PURE game rules. Zero I/O, zero React.
│  ├─ ai-brain/        # policies/personas/opponent modeling (uses engine)
│  ├─ db/              # Drizzle schema + migrations (Neon)
│  ├─ shared/          # types, event contracts, zod schemas
│  └─ ui-kit/          # Persona-styled primitives (WedgeButton, RansomTitle...)
└─ docs/
```

**[OPEN]** Honest tradeoff note: a heavy-CSS stylized UI is faster to iterate on the web (Next.js + Capacitor wrap) than RN Web. RN is viable and chosen per your requirement, but expect to lean on Reanimated/Skia rather than CSS for the wildest effects. If we ever feel blocked, fallback plan exists.

---

## 5. Data Model (Neon/Postgres, Drizzle)

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

Server endpoints (v1): `POST /auth/register|login|guest`, `GET /me`, `GET/PUT /progress`, `GET/PUT /loadout`, `POST /match-result` (server validates via seed replay — anti-cheat), `GET /leaderboard`, `POST /dialogue`, `POST /notify`.

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

Locked: hidden hands · simultaneous reveal · **PACIFY** · score-based · 5 trick cards (Void null / Oracle 3 / Reversal 4 entire-score swap after scoring / Ward 3 anti-trick flat +3 / Echo null void+double-next) with Round 5 ×2 · web-first landscape PWA (no Store) + downloadable file · first-fight intro scene + goal-directed post-win AI dialogue · stats-aware AI (wins, avg score, trick usage fed to prompts) · Gemini 3.5 Flash Lite (500 RPD).

Still open:

1. Monetization: recommend **none** in v1. Confirm?
   *(Echo + Round 5 stacking locked to **×3 cap** per your call.)*

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

Appendix B — glossary: SCORE (match points, Round 5 ×2), TRICK (neutral, not Good/Bad), `null` power (Void/Echo void the round, no clash), Student (campaign AI opponent), STACK (legacy term — now just one card per round), yomi (reading gameplay).

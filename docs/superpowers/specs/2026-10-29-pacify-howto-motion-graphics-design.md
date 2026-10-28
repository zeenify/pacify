# PACIFY — "How To Play" 3D Motion Graphics

**Date:** 2026-10-29
**Status:** Approved, ready for implementation
**Deliverable:** Narrated MP4, 1920×1080, ~2:40

## 1. Goal

A cinematic 3D motion-graphics introduction that teaches a new player the complete
PACIFY ruleset, in the game's own Persona 5 visual language, scored and narrated.

This is a competitive entry: another model is producing the same artifact from the
same brief. Its output lives at `apps/web/public/how-to-play/` and is **out of bounds** —
no file in that directory may be read, diffed, or referenced. This work is built
independently from the engine source and the brand tokens only.

## 2. Hard constraints

| Constraint | Value |
| --- | --- |
| Resolution | 1920×1080 |
| Runtime | 1:30–3:00 target window; aim ~2:40 |
| Frame rate | 30 fps baseline; 60 fps if capture throughput allows |
| Narration voice | fish.audio reference `94ab6e0626ab4a2a8c5b202cd3c16905` (JJK narrator) |
| Rules source of truth | `packages/engine/src/` — never `apps/web/app/howto.tsx` |
| Output location | `apps/web/public/how-to-play-qoder/` |

## 3. Rules accuracy

`apps/web/app/howto.tsx` is **stale** and must not be used as a content source. It
claims 5 rounds, 5 tricks, Ward +3, and Oracle power 3. The engine says otherwise.
All figures below are verified against `cards.ts`, `types.ts`, `resolve.ts`, `duel.ts`.

### Structure
- 19-card catalogue: 12 Number + 7 Trick
- 7-card hands, **7 rounds**, max **3 tricks** per hand
- Singleton dealing: 14 unique cards drawn from the 19-card catalogue per duel
- Commit is **simultaneous**, then reveal
- **First to 20** (`SCORE_THRESHOLD`) wins immediately; otherwise highest total after
  round 7. Equal totals → draw.

### Number cards
Power 1–12, each aligned `good` or `bad`.

| Bad | Power | Good | Power |
| --- | --- | --- | --- |
| Bandit | 1 | Paladin | 2 |
| Ogre | 3 | Knight | 4 |
| Witch | 5 | Wizard | 6 |
| Vampire | 7 | Valkyrie | 8 |
| Leviathan | 9 | Seraph | 10 |
| Demon | 11 | Angel | 12 |

### Scoring (`clashPoints`)
- Opposite alignments → winner scores the **difference** (`aEff - bEff`), loser 0
- Same alignment → **0** for both. This is the *shield*
- Equal power → 0 for both
- Shield applies **only** Number vs Number, and only while no Eclipse window is active

### Tricks (priority order)
`Void > Eclipse > Ward > Echo > Reversal > Executioner > Oracle`

| Trick | Power | Effect |
| --- | --- | --- |
| Void | null | Top priority. Voids the round entirely — kills everything, no exceptions, including the opponent's trick |
| Eclipse | null | Soft void: zeroes this round's clash points and opens a shields-off window of **2 rounds** (`ECLIPSE_ROUNDS`). Other trick effects still fire. A Ward block cancels it |
| Ward | 5 | Blocks an opponent trick and scores **5 flat** × multiplier (`WARD_FLAT_POINTS`). The blocked trick does **not** activate. Ward vs Number falls through to a plain power clash |
| Echo | null | Voids this round's points, sets `echoNext` so the next round's multiplier increases by 1. Other tricks still fire alongside it |
| Reversal | 6 | Score the round normally **first**, then swap both totals |
| Executioner | 0 | If the opponent committed a **Number of power ≥ 7** (`EXECUTIONER_THRESHOLD`), their entire total is wiped to **0**. Power-0 body loses normal clashes |
| Oracle | 5 | Peeks **2** random cards from the opponent's hand (`ORACLE_PEEK_COUNT`). Fires even through an Echo/Eclipse void |

### Multiplier (`roundMultiplier`)
- Base ×1
- Round **7** (the climax, not round 5) adds +1
- A carried Echo adds +1
- Additive, **capped at ×3**

## 4. Approach

Rejected: AI video generation (illegible text, no numeric guarantees, ~30s clips).
Rejected: pure 2.5D DOM (not genuinely 3D).

**Chosen — hybrid WebGL + DOM, frame-stepped.**
A real `three.js` scene (beveled card slabs, physical materials, spline camera moves,
lighting) renders to a canvas; a DOM layer draws Anton/Oswald typography with hard
offset shadows. Puppeteer screenshots the *composited page*, so a single capture pass
records both layers in register.

### Deterministic frame-stepping
The scene is a **pure function of frame index**. `seek(n)` sets every transform and
DOM property, then exactly one screenshot is taken. No real-time capture.

Consequences this buys:
- **No dropped frames, no drift.** Playback speed is irrelevant to output correctness.
- **Audio-first timing.** Narration is generated and *measured* before the timeline is
  authored, so visual beats land on specific words rather than approximations.
- **Supersampling.** Render at 2× and downscale for clean edges.
- **Shot-level iteration.** Any single frame re-renders in isolation.

## 5. Visual language

Sourced from `packages/ui-kit/src/tokens.ts`.

- Crimson `#E60012` (deep `#A3000C`, mid `#C00010`) · Yellow `#FCEE21` ·
  Black `#0A0A0A` · Paper `#FFFFFF`
- Anton for display, Oswald for body
- `skewX(-8deg)` on titles and panels
- Hard shadows: 8px black offset, zero blur; 6px crimson variant for emphasis
- Halftone dot screens `rgba(230,0,18,0.18)`, manga speed-lines, `stripe` overlays
- Zero border radius — the brand is all sharp corners

Music bed from `apps/web/public/musics/`. Card impacts use `apps/web/public/sfx/card.wav`.

## 6. Structure

| Act | Time | Content |
| --- | --- | --- |
| I — Cold open | 0:00–0:15 | Black. Halftone builds. One card slams into 3D space spinning. Crimson slash. **PACIFY** title lands skewed with a hard shadow |
| II — Shape of a duel | 0:15–0:40 | Two hands fan out face-down in 3D, 7 cards each. Round counter ticks 1→7. Simultaneous commit. **First to 20** |
| III — The clash | 0:40–1:15 | The ladder builds: Bandit(1)→Demon(11) bad, Paladin(2)→Angel(12) good. Two cards collide; higher wins the **difference**. Then the shield beat: same alignment, barrier flashes, damage collapses to **0** |
| IV — Seven tricks | 1:15–2:05 | One signature 3D beat per trick (below) |
| V — Priority & multipliers | 2:05–2:25 | Priority chain as a stacked 3D totem. R7 ×2, Echo +1, **cap ×3** |
| VI — Stinger | 2:25–2:40 | All 19 cards assemble into a rotating monolith. "Learn the lie." End card |

### Act IV signature beats
- **VOID** — the entire scene dissolves to black; geometry is deleted mid-flight
- **WARD** — a barrier slams down and absorbs the incoming trick; +5 banks
- **ECHO** — this round zeros out, a ghost of it carries forward and doubles next round
- **ECLIPSE** — lighting dies, sky goes black, shield icons crack and go offline for 2 rounds
- **ORACLE** — an eye opens; 2 enemy cards flip face-up in the hidden hand
- **REVERSAL** — the two scorebars physically swap sides across the screen
- **EXECUTIONER** — a blade drops; the opponent's whole total executes to zero

## 7. Narration script

Written for the JJK-narrator register: measured, portentous, declarative.
Approximately 340 words → ~2:30–2:45 at a dramatic pace with pauses.
Line breaks are TTS chunk boundaries; each chunk is timed individually.

**I — Cold open**
> Nineteen cards. Seven rounds. One liar survives.
> This... is PACIFY.

**II — Shape of a duel**
> You and your opponent each hold seven cards. Faces hidden. Intentions... worse.
> Every round, you both commit one card — simultaneously. No turns. No waiting. Only the reveal.
> Seven rounds. First to twenty wins outright. If nobody breaks twenty, the higher total takes it.

**III — The clash**
> Twelve of the nineteen cards bear a number. One to twelve. Power.
> They are aligned. Good... or Bad. Paladin to Angel. Bandit to Demon.
> When two numbers clash, the higher power wins — and scores only the difference. Angel twelve against Ogre three? Nine points. Not twelve.
> But here is the lie. If both cards share the same alignment, the shield holds. The score is zero. Nothing passes.

**IV — Seven tricks**
> The remaining seven cards are Tricks. And Tricks... do not play fair.
> VOID. The highest priority. It kills the round entirely. Even your opponent's trick dies with it.
> WARD. A barrier. It eats the incoming trick — and banks five flat points.
> ECHO. This round scores nothing. The next round... doubles.
> ECLIPSE. The sky goes dark. For two rounds, every shield is offline. Same alignment will bleed.
> ORACLE. An eye opens. Two cards from your enemy's hand turn face-up.
> REVERSAL. Score the round normally. Then swap both totals. Their victory... becomes yours.
> EXECUTIONER. The comeback. If your opponent committed a number of seven or higher, their entire score is executed. Down to zero.

**V — Priority**
> When tricks collide, order is law. Void. Eclipse. Ward. Echo. Reversal. Executioner. Oracle.
> A Ward blocks the trick before it fires. Nothing else is guaranteed.
> And in round seven, everything doubles. Echo stacks it further — but the multiplier never exceeds three.

**VI — Stinger**
> You cannot out-power them. You can only out-think them.
> PACIFY. Learn the lie.

## 8. Pipeline

```
apps/web/public/how-to-play-qoder/
  scene/       three.js world, card geometry, procedural P5 textures, shaders
  timeline/    act definitions + deterministic seek(frame) clock
  capture/     puppeteer-core frame-stepper -> PNG sequence
  audio/       narration script, fish.audio TTS client, ffmpeg mix
  render.mjs   orchestrator -> final MP4
```

Stages:
1. **TTS** — POST each chunk to fish.audio, save WAV/MP3, measure duration with ffmpeg
2. **Timeline build** — measured chunk durations become act boundaries; write `timeline.json`
3. **Capture** — puppeteer-core drives Chrome, `seek(n)` + screenshot per frame
4. **Encode** — PNG sequence → H.264 via `ffmpeg-static`
5. **Mix** — narration + music bed (ducked) + SFX → AAC, muxed into the MP4

Tooling already present: `three`, `@react-three/fiber`, `puppeteer-core`, Chrome,
`ffmpeg-static` 6.1.1 (libx264 + libmp3lame).

## 9. Open item

**The fish.audio API key is not in any `.env` file** in this repo (checked root,
`apps/web`, `apps/server`, `packages/db`) and must be supplied by the user. Until then,
stage 1 runs against a stub that emits correctly-timed silence, so stages 2–5 are fully
buildable and testable. TTS is a drop-in replacement once the key arrives.

## 10. Risks

| Risk | Mitigation |
| --- | --- |
| Capture throughput (≈4800 frames at 30 fps, ≈9600 at 60 fps) | Benchmark early; fall back to 30 fps. Frames are independent, so capture parallelises across Chrome tabs |
| Anton/Oswald not installed locally | Load from Google Fonts in the capture page and gate the first frame on `document.fonts.ready` |
| TTS chunk durations shift the timeline | Timeline is *derived from* measured audio, never hardcoded — re-running stage 2 reflows every act |
| Procedural card art looks cheap | Beveled geometry + real PBR materials + halftone shader, not flat planes |

# PACIFY — Gameplay Sound Design

**Date:** 2026-11-04
**Status:** approved design, pre-implementation
**Scope:** full app coverage, duel-first. **~110 cue names backed by ≤ 75 rendered assets**
(cues deliberately share files — see §5.5).

---

## 1. Goal

The duel screen currently has exactly **one** gameplay sound: `playCardPop()` on card
commit ([duel.tsx:726](../../../apps/web/src/screens/duel.tsx)). Every other beat — the
3-second showdown countdown, the card flip, all seven trick cinematics, the guillotine,
the multiplier mash, the round wipe, victory — is silent.

This spec adds a designed soundtrack to those beats. Two outcomes matter equally:

1. **It works** — every cue fires, nothing fails to decode, nothing clips, nothing
   machine-guns, polyphony stays bounded during the heavy cinematics.
2. **It fits** — each sound lands on the exact frame its animation starts, and the
   palette is coherent enough that the trick cinematics are identifiable blind.

Non-goal: music composition. BGM already exists; we only add a `/duel` route mapping and
mixer ducking (§9).

---

## 2. Sonic identity

The visuals are Persona-5-grade — crimson slabs, ink stamps, chaos letters, a guillotine,
a black hole, star charts, a watcher eye. The BGM library is city-pop / Lupin III. The
palette therefore is:

> **Dry, close-miked organics (felt, card stock, paper, ink) sitting under cinematic
> hybrid impacts (sub-drop + metallic transient + short hall tail), with one distinct
> tonal signature per trick.**

Design rules that follow from this:

- **Restraint over coverage.** Not every visual micro-beat gets a unique sound. All seven
  verdict stamps share one ink-stamp asset at different pitch/reverb. All chip flights
  share one pitch-bent whoosh. ~110 cue names, ≤ 75 files (§5.5).
- **Silence is a cue.** The `idle` step (500 ms) is deliberately silent. So is the
  "YOUR MOVE" infinite pulse — a looping sound there would fatigue the player.
- **Dryness means emptiness.** VOID gets *no* reverb send. ORACLE gets the longest one.
  Reverb is used semantically, not decoratively.
- **No synthetic beeps.** Every cue is layered: at minimum a transient plus a body plus a
  tail. Single-oscillator sounds are rejected by the studio self-check (§10).

### Trick signatures

| Trick | Signature | Reverb |
|---|---|---|
| VOID | detuned downward sub-glide, granular suck, abrupt silence after the devour | **none** |
| ECHO | literal pitch-delay doubling — second hit a fifth down, 120 ms later | short plate |
| ECLIPSE | lowpassed brown-noise drone; bright metallic corona cuts through at the top | medium hall |
| WARD | ritual bell/gong partial for the seal, then **real sourced fire crackle** sustained across the 2650→4550 ms burn | medium hall |
| REVERSAL | samples played **backwards** (reversed envelope) + doppler pan swap | medium hall |
| EXECUTIONER | mechanical and dry-ish: rope fibre creak, resonant steel blade ring, sourced metal-on-wood chop | short plate |
| ORACLE | celesta/bell arpeggio; star glints as high sine pings | **longest** hall |

---

## 3. Architecture

Four pieces. The cue-name table (§7) is the contract that lets pieces 1 and 3 be built in
parallel.

```
tools/sfx-studio/            (1) OFFLINE — Node/tsx renderer, no native deps
  src/dsp/*.ts                   oscillators, noise, biquads, envelopes, waveshaper,
                                 delay, procedural convolution IRs, resample pitch,
                                 pan, gain automation, lookahead limiter
  src/recipes/*.ts               one typed recipe per asset (layers + offsets + sends)
  src/render.ts                  CLI: render all, or --only <name>
  src/check.ts                   objective self-check -> report (§10)
  sources/provenance.json        every downloaded CC0 layer: url, author, license, sha256
        |
        v  writes 16-bit mono WAV
apps/web/assets/sfx/*.wav        source of truth (existing repo convention)
apps/web/public/sfx/*.wav        served copy
        ^
        |  referenced by
apps/web/src/lib/sfx-manifest.ts (2) THE CONTRACT — cue name -> file + mix params
apps/web/src/lib/sfx.ts          (3) RUNTIME — Web Audio engine, voice pool
apps/web/src/lib/duel-cues.ts    (4) TIMELINES — SeqStep -> [{cue, at}]
```

### 3.1 Why the runtime engine must change

`sfx.ts` today holds four hardcoded `HTMLAudioElement` singletons
([sfx.ts:94-102](../../../apps/web/src/lib/sfx.ts)). That design cannot support gameplay:

- **A sound cannot overlap itself.** `playX()` does `currentTime = 0` then `play()`, so a
  retrigger *restarts* the one element. `duel.clash.tick` fires every 500 ms and
  `score.drain.tick` every 90–400 ms — they would cut themselves off mid-body.
- **No pitch variation**, so any repeated sound machine-guns.
- **No precise scheduling.** `setTimeout` drifts and is throttled in background tabs.

Replaced with: `fetch(url) → arrayBuffer → decodeAudioData → AudioBuffer` cached in a
`Map`, and a **fresh `AudioBufferSourceNode` per voice**. This gives unlimited polyphony,
`playbackRate` pitch randomisation, per-voice gain and pan, and — the part that matters
most — sample-accurate scheduling via `source.start(ctx.currentTime + offset)`.

**BGM stays `HTMLAudioElement`.** That is correct for a long streaming loop; converting it
would force decoding a 4-minute mp3 into RAM. Only `duckBgm()` is added (§9).

**Backwards compatibility is mandatory.** Thirteen modules import from `sfx.ts` — eleven
screens/components via `../lib/sfx` (`P5Back`, `campaign`, `dossier`, `duel`, `load`,
`login`, `menu`, `options`, `sfx-test`, `shame`, `start`) plus `lib/bgm.ts` and
`lib/options.ts` via the relative `./sfx`. All existing exports keep their names and
signatures: `initSfx`, `unlockSfx`, `playHover`, `playClick`,
`playSliderTick`, `playCardPop`, `sfxReady`, `setVolumes`, `setSfxEnabled`, `initBgm`,
`unlockBgm`, `playBgm`, `stopBgm`, `getCurrentBgm`, `bgmReady`, `getBgmLevel`,
`getBgmMuted`. The four legacy UI sounds are re-rendered **in place at the same filenames**
so no path changes.

### 3.2 Autoplay policy

`AudioContext` must be constructed and resumed inside a user gesture. The repo already has
exactly one such path and it must be reused, not duplicated:

- `initSfx()` runs behind the Load screen progress bar ([load.tsx:32](../../../apps/web/src/screens/load.tsx)) — fetch + decode buffers here, **do not** create the context.
- `unlockSfx()` runs inside gesture handlers in login/start/load/sfx-test — create + `resume()` the context here.

Behaviour when not yet unlocked must stay identical to today: cue calls are silent no-ops,
never throws.

---

## 4. The offline studio

`tools/sfx-studio/` — Node + tsx (both already used by the repo: `packages/db` and
`packages/ai-brain` run tsx). **No native dependencies, no ffmpeg, no sox** — none are
installed on this machine.

### 4.1 DSP toolkit

Minimum viable set — build only what the recipes actually use:

| Primitive | Notes |
|---|---|
| Oscillator | sine, triangle, sawtooth, square; frequency glide (linear + exponential) |
| Noise | white, pink (Voss), brown (integrated white) |
| Biquad | RBJ Audio EQ Cookbook: lowpass, highpass, bandpass, notch, peaking; cutoff/resonance automation |
| Envelope | AD, ADSR, exponential decay, and **reversed** (for REVERSAL) |
| Waveshaper | tanh / soft-clip curves for distortion and saturation |
| Delay | fixed + feedback, for ECHO doubling |
| Convolution reverb | **procedurally generated IRs** — exponentially decaying noise, with named presets `hall`, `plate`, `metal`, `cathedral` |
| Pitch | resample-based (rate change = pitch + duration). Acceptable here; no need for phase-vocoder time-stretch |
| Pan / gain automation | per-layer, per-sample |
| Limiter | lookahead peak limiter on the master bus |

### 4.2 Recipe format

A recipe is a typed, deterministic description. **No `Math.random()` without a seeded PRNG**
— rendering the same recipe twice must produce byte-identical WAVs, so diffs stay clean and
regressions are detectable.

```ts
type Layer =
  | { kind: "osc"; wave: Wave; f: number; fEnd?: number; glide?: "lin" | "exp";
      dur: number; at: number; gain?: number; env: Env;
      filter?: FilterSpec; pan?: number; pitch?: number }
  | { kind: "noise"; color: "white" | "pink" | "brown"; dur: number; at: number;
      gain?: number; env: Env; filter?: FilterSpec; pan?: number; pitch?: number }
  | { kind: "sample"; src: string; at: number; gain?: number; env?: Env;
      filter?: FilterSpec; pan?: number; pitch?: number; reverse?: boolean;
      trimStart?: number; trimEnd?: number }
  | { kind: "silence"; dur: number };

type Recipe = {
  name: string;          // asset filename stem
  layers: Layer[];
  reverb?: { preset: IRPreset; send: number; preDelayMs?: number };
  master?: { gain?: number; normalizeTo?: number };  // dBFS target
  sampleRate?: 44100 | 22050;                        // default 44100
};
```

### 4.3 CC0 sourcing

Verified reachable from this machine: `kenney.nl` (200), `freesound.org` (200, but
**downloads need an OAuth/API key we do not have** — treat as browse-only unless the user
supplies a key), `opengameart.org` (200), `github.com` (200). `pixabay.com` returns **403**
— do not plan around it.

Hard rules:

- **CC0 only.** No CC-BY, no attribution-required licenses. This keeps the repo free of
  attribution obligations.
- Every downloaded layer is recorded in `sources/provenance.json` with url, author,
  license string, download date, and sha256 of the file.
- Downloaded audio is **never shipped raw**. It is always processed inside a recipe
  (trimmed, filtered, pitched, reverberated, layered) — both for quality and so the result
  is genuinely our design.
- Prefer WAV sources. If a required asset only exists as ogg/mp3, add a pure-JS or WASM
  decoder to `tools/sfx-studio/package.json` (candidates to verify: `audio-decode`,
  `@wasm-audio-decoders/ogg-vorbis`, `mpg123-decoder`). Never add one to `apps/web`.
- Studio deps live in `tools/sfx-studio/package.json` only, so the app bundle is untouched.

What we source vs. synthesise:

| Sourced (organic, hard to fake) | Synthesised (designed) |
|---|---|
| card stock flick, felt thud, paper slap | all sub-drops and risers |
| glass shatter debris (SHIELD BREAK) | VOID in its entirety |
| resonant metal: blade ring, gong, clang | ECLIPSE drone + corona |
| wood/metal chop impact (guillotine) | ORACLE bells and glints |
| fire crackle (WARD burn) | all stamp/verdict bodies |
| rope/fibre creak (EXECUTIONER) | all chip-flight whooshes |

### 4.4 Output format

16-bit PCM mono. 44.1 kHz default; 22.05 kHz permitted for sub-heavy cues with no bright
content (VOID sub-glide, ECLIPSE drone) to halve their size. Leading and trailing silence
trimmed by the renderer (see the head-silence check, §10) — **head silence is a timing bug,
not a nicety**, because the runtime schedules by offset.

Asset budget: **≤ 14 MB total** in `public/sfx/` (≤ 75 files ⇒ ~190 KB average). Typical cue
40–250 KB; sustained ones (WARD fire, ECLIPSE drone) up to ~600 KB. If the budget is
breached, the first lever is dropping sub-only cues to 22.05 kHz, **not** shortening tails —
a truncated reverb tail is audible as a click.

**Storage: plain git blobs, not LFS.** Verified: there is no `.gitattributes` anywhere in the
repo and `git lfs track` lists nothing, so the existing 20 BGM mp3s and 4 SFX wavs are
already committed as ordinary objects. New assets follow that convention — introducing LFS
for these files only would be an unmotivated change to the repo's storage model.

---

## 5. Runtime engine

### 5.1 `sfx-manifest.ts`

Single source of truth. Typed so a cue-name typo is a compile error, not a silent no-op.

```ts
export const SFX = {
  "ui.hover":        { src: "/hover.wav",            gain: 0.35, pitch: [0.97, 1.04] },
  "duel.stamp":      { src: "/sfx/duel-stamp.wav",   gain: 1.00, pitch: [0.98, 1.02], reverb: 0.25 },
  "duel.clash.tick": { src: "/sfx/duel-clash-tick.wav", gain: 0.9, maxVoices: 2, cooldownMs: 60 },
  // ...
} as const satisfies Record<string, SfxDef>;

export type SfxName = keyof typeof SFX;

type SfxDef = {
  src: string;
  gain?: number;              // default 1
  pitch?: [number, number];   // random per voice
  pan?: number | [number, number];
  reverb?: number;            // send amount 0..1 (0 = dry, e.g. VOID)
  reverbIR?: "hall" | "cathedral";  // default "hall"; ORACLE uses "cathedral"
  maxVoices?: number;         // concurrency cap; oldest voice is stolen
  cooldownMs?: number;        // anti-machine-gun for the same cue name
  loop?: boolean;             // WARD fire only
};
```

Naming convention: cue `duel.intro.slam` → file `/sfx/duel-intro-slam.wav`. Dots become
hyphens. **Multiple cue names may share one file** with different mix params — that is the
intended mechanism for the shared stamp and shared chip-flight assets.

### 5.2 Graph

```
voice: AudioBufferSourceNode -> voiceGain -> panner -> sfxBusGain -> mainGain -> destination
                                                          |
                                              +-----------+-----------+
                                              |                       |
                                         sendHall                sendCathedral
                                              |                       |
                                       ConvolverNode(hall)   ConvolverNode(cathedral)
                                              |                       |
                                              +----------> mainGain <-+

bgm:   HTMLAudioElement (unchanged, duckable) -> own gain, separate of the SFX bus
```

**Two** shared `ConvolverNode`s with procedurally generated IRs — a short `hall` and a long
`cathedral` — fed by per-voice send gains. Two, not one, because §2 uses reverb
*semantically*: VOID sends 0.0 (dryness is emptiness), most cues sit on `hall`, and ORACLE
sits on `cathedral`. A single IR could not express that. IRs are generated at context init
from the same decaying-noise algorithm the studio uses, so browser and rendered assets
agree.

`sfxBusGain` and `mainGain` mirror the existing three-bus mixer so `setVolumes()` keeps
working unchanged.

Per-cue gain tiers are preserved: today hover is bus × 0.25 and the loud sounds bus × 0.92
([sfx.ts:32-51](../../../apps/web/src/lib/sfx.ts)). Those multipliers move into the
manifest's per-cue `gain` so the mixer stays a pure bus.

### 5.3 Public API

```ts
play(name: SfxName, opts?: { gain?: number; pitch?: number; pan?: number; at?: number }): void
playAt(name: SfxName, delayMs: number, opts?): void     // scheduled on the ctx clock
scheduleTimeline(events: { cue: SfxName; at: number; opts? }[]): CancelHandle
cancelTimeline(handle: CancelHandle): void              // stops not-yet-finished voices
duckBgm(multiplier: number, attackMs?: number, releaseMs?: number): void
listSfx(): SfxName[]                                    // for the /sfx-test bench
debugAudio(): { decoded: number; failed: string[]; liveVoices: number; ctxState: string }
```

`scheduleTimeline` is the key primitive. A whole `SeqStep`'s cue list is scheduled in one
call against the AudioContext clock, so internal beats (crack at 950, shatter at 1350,
stamp at 1800) are drift-free. `cancelTimeline` is called from the driver's effect cleanup.

`debugAudio()` exists specifically so the verifier can assert "all 62 buffers decoded, 0
failures" from the browser console instead of guessing.

### 5.4 Voice budget

Hard cap of **24 simultaneous voices**, oldest-stolen. Per-cue `maxVoices` (default 8) plus
`cooldownMs` on the tick-like cues. Rationale: the densest moment is EXECUTIONER's chaos
letters (8 letters at 55 ms spacing) landing on top of a camera shake and a chop — that is
~11 voices, comfortably inside budget.

### 5.5 Deliberate file sharing

~110 cue names resolve to ≤ 75 files. These cue names **must** point at the same asset,
differing only by manifest `gain` / `pitch` / `reverb` — that is the mechanism, not an
accident of budget:

| Shared asset | Cue names using it | How they differ |
|---|---|---|
| `duel-stamp.wav` (ink stamp) | the 7 verdicts — SHIELDS DOWN, NULLIFIED, TIE, ROUND VOIDED (void), CLASH VOIDED (echo), BURNED, SWAPPED — plus THRESHOLD MET, SPARED, PEEKED, ×N, and the two shieldbreak sub-lines | pitch, gain, `reverbIR`, send amount |
| `score-chip-fly.wav` (pitch-bent whoosh) | mult chip, echo lob, eclipse lob, reversal ×2, R7 arrival, oracle glints | pan, pitch, duration vs. the `offset-path` length |
| `score-chip-pop.wav` | echo chip, R7 arrival chip, oracle glint pop | pitch, pan |
| `duel-card-shatter.wav` | clash loser, both tie sides, shieldbreak debris | pitch, pan (10 debris voices per shatter) |
| `trick-exec-rise.wav` | executioner entry **and** execfail entry | identical — same panel animation |
| `trick-exec-meter.wav` | executioner (resolves) **and** execfail (stalls) | pitch: execfail is detuned down and left unresolved |
| `trick-exec-exit.wav` | executioner **and** execfail panel-out | gain |
| `round-burst.wav` | 3 starburst seals, `round.burstOut`, `score.chip.fuse` | pitch, pan |
| `duel-clash-tick.wav` | countdown clash ticks **and** `duel.showdown.tick` | pitch ramp: showdown is a steeper rise |
| `ui-hover.wav` → `/hover.wav` | `ui.hover`, plus every screen's hover call site | pitch (randomised per voice) |

Anything **not** on this list gets its own asset. In particular the seven trick signatures
(§2) are never shared with each other — their identifiability depends on being distinct.

---

## 6. Where cues attach in `duel.tsx`

### 6.1 The choke point

[duel.tsx:607-711](../../../apps/web/src/screens/duel.tsx) is a single `useEffect` keyed on
`[seqIdx, seqSteps]` that drives every reveal beat. It already:

- reads the step: `const step = seqSteps[seqIdx]`
- runs per-beat sub-tickers (`clashTick` at :618, `drainPops` at :649, `seqSubTick` at :661)
- has a cleanup at :709 — `return () => { clearTimeout(timer); if (interval) clearInterval(interval); }`

The integration is therefore additive and local:

```ts
const step = seqSteps[seqIdx];
if (!step) return;
const audio = scheduleTimeline(cuesForStep(step, seqIdx));   // <-- new
// ...existing sub-ticker and setTimeout logic untouched...
return () => { clearTimeout(timer); if (interval) clearInterval(interval); cancelTimeline(audio); };
```

`cuesForStep(step, seqIdx)` lives in `duel-cues.ts` and is a pure function — no React, no
side effects — which makes it unit-testable in isolation.

Cancellation matters: the ANIM LAB (`/duel?demo=all`) rapid-fires 24 scenarios with 1700 ms
gaps ([duel.tsx:581-603](../../../apps/web/src/screens/duel.tsx)). Without it, a skipped
beat's tail bleeds into the next scenario.

### 6.2 Sub-ticker cues

Three beats are driven by `setInterval` inside the driver, so their per-tick sounds fire
from those intervals rather than from a pre-scheduled timeline (the tick count is data
dependent):

| Interval | Location | Cue |
|---|---|---|
| `clashTick`, 500 ms | :618 | `duel.clash.tick`, pitch ramping with `t` |
| `drainPops`, `step.tickMs` | :649 | `score.drain.tick` |
| `seqSubTick`, 1000 ms | :661 | `duel.showdown.tick`, pitch ramping 3→2→1 |

### 6.3 Event-driven beats (not in the driver)

These attach at their own state-change sites:

| Beat | Site |
|---|---|
| intro splash + panel sweep | :839-842 render; fire on mount of the intro element |
| deal, 7 cards at 55 ms stagger | `deal()` :293-310 |
| card pick | `onPick()` :724 (replaces the bare `playCardPop()`) |
| table impact shake + portrait lunge | `revealed` flip :890-894 / :848-854 |
| Klein bubble arrival | `/ai-pick` return :353-358 |
| Klein thinking dots | `setKleinThinking(true)` |
| SIGNAL LOST error | :1492-1498 |
| round wipe | `onNextRound()` :745 |
| R7 ×2 arrival (waiting → flying → landed) | `onNextRound()` :748-754 |
| R7+Echo → ×3 fuse | :1427-1431 |
| echo / shield chip death | driver :690-697 |
| corner-rack reflow slide | `claimCorner`/`releaseCorner` :269-274 |
| info modal open/close | `setStatusInfo` |
| victory / defeat / draw | `setPhase("over")` :700 |

---

## 7. The cue table

Offsets are **milliseconds from the start of the containing step**, taken from the CSS
animation delays in `duel.tsx` / `duel-keyframes.ts`. `pitch` overrides are for rising
tension within a repeated cue.

### 7.1 `showdown` — 3000 ms

| at | cue | note |
|---|---|---|
| 0 / 1000 / 2000 | `duel.showdown.tick` | pitch 1.00 / 1.12 / 1.26 — the 3-2-1 slam, `dNumSlam 0.5s` |

### 7.2 `flip` — 900 ms

| at | cue | note |
|---|---|---|
| 0 | `duel.flip.whoosh` | `dFlipBack 260ms` — back swings away |
| 210 | `duel.flip.snap` | `dFlipFace 380ms @210` — face lands |

### 7.3 `shieldbreak` — 3200 ms

| at | cue | note |
|---|---|---|
| 0 | `trick.shieldbreak.slam` | `dShieldSlam 460ms` crimson shield in |
| 950 / 1100 / 1250 | `trick.shieldbreak.crack` | 3 `dCrackIn`, pitch rising |
| 1350 | `trick.shieldbreak.shatter` | `dShieldBreak` + 8 shards + `dNullFlash` |
| 1800 | `duel.stamp` | "SHIELDS DOWN" `dStampIn` |
| 2150 | `duel.stamp` | sub-line `dNumSlam`, gain 0.5, pitch 0.9 |

### 7.4 `clash` mode `shield` — 3600 ms

| at | cue | note |
|---|---|---|
| 100 / 220 | `duel.shield.pop` | both power plates `dShieldPop` |
| 380 | `duel.clash.vs` | "VS" `dNumSlam` |
| 850 | `duel.shield.banner` | "SAME TYPE!" `dShieldPop` |
| 1500 | `duel.nullify.smash` | `dNullSmash` + white `dNullFlash` |
| 1800 | `duel.stamp` | "NULLIFIED" |
| 1900 | `duel.nullify.ring` | `dShieldWave` |

### 7.5 `clash` mode `power` — `500·ticks + 700` ms · mode `tie` — `500·(p+1) + 700` ms

`ticks = min(you, klein) + 1`; the driver's `maxTick = min(you, klein)` (:616).

| at | cue | note |
|---|---|---|
| 500·i, i = 1…maxTick | `duel.clash.tick` | `dTickPulse 280ms`, pitch ramping up with i |
| 500·maxTick (0 if maxTick = 0, per :617) | `duel.clash.lockIn` | winner `dLockIn 480ms` + glow |
| same | `duel.clash.lockOut` | loser `dLockOut 450ms` |
| same | `duel.card.win` | `dCardWinY/R 520ms` |
| same + 40 | `duel.card.shatter` | `dCardLose 650ms`; then 10 `dShardOut` at +45·i, random pitch/pan |
| **tie only:** same | `duel.card.shatter` ×2 | `clashWinner === "both"`, opposite pans |
| **tie only:** same + 120 | `duel.stamp` | "TIE!" `dStampIn 620ms` |

> **Calibration note.** The exact tick count vs. the visible countdown must be confirmed
> against `/duel?demo=countdown` (SERAPH 10 vs VAMPIRE 7 → `maxTick = 7`, `ticks = 8`,
> step duration `500·8 + 700 = 4700` ms). The ANIM LAB is the calibration rig for every
> number in this table — its header comment says "what you judge here is what ships"
> ([duel.tsx:67-68](../../../apps/web/src/screens/duel.tsx)).

### 7.6 `multmash` — 2400 ms

| at | cue | note |
|---|---|---|
| 0 | `score.chip.fly` | chip on `offset-path` (`muChipFlyPathYou/Klein`), 1500 ms, pitch bend down-then-up following the curve |
| 60 | `score.mult.charge` | base number `dNumSlam` |
| 1500 | `score.mult.impact` | `dMultImpact` + `dMuRing` + `dMultFinIn` |
| 1500 | `duel.stamp` | "×N" `dStampIn`, gain 1.2 |

### 7.7 `award` — 1400 ms (ward path) / 1500 ms (clash path)

| at | cue | note |
|---|---|---|
| 0 | `score.award.fly` | "+N" badge `dFlyYou`/`dFlyKlein` 1.3 s, panned to the winner's side |
| 1300 | `score.award.land` | score state lands at step end (:667-670) — the chip ding |

### 7.8 `drain` — `tickMs·from + 700` ms

| at | cue | note |
|---|---|---|
| tickMs·i, i = 0…from-1 | `score.drain.tick` | one point per tick; `dDrainPop 850ms`, `dChipTick 380ms`. `tickMs` is adaptive 90–400 ms (:507) so this must come from the interval, not a fixed timeline |

### 7.9 `trick: void` — 4800 ms

| at | cue | note |
|---|---|---|
| 0 | `trick.void.open` | canvas iris opens 0–500 ms |
| 0 | `trick.void.mutate` | `dVdMutate 620ms` — the card becomes a maw |
| 500 | `trick.void.reality` | `dVoidReality 2400ms` ring |
| 1200 | `trick.void.suck` | `dVdDevourDown/Up 1150ms` — victim dragged |
| 2280 | `trick.void.devour` | **the money beat** — canvas devour shock (t = 2280) |
| 2600 | `duel.stamp` | "ROUND VOIDED" plaque |
| 4100 | `trick.void.die` | maw collapses; hard cut to silence (no reverb tail) |

20 `dVoidImplode` motes are visual-only — no per-mote sound.

### 7.10 `trick: echo` — 4000 ms

| at | cue | note |
|---|---|---|
| 0 | `trick.echo.shock` | `dEchoShockfield 1500ms` |
| 120 / 250 / 380 | `trick.echo.ring` | 3 `dEchoShock`, each a fifth lower than the last |
| 400 | `duel.stamp` | "CLASH VOIDED / NEXT ROUND ×2" |
| 420 / 600 | `trick.echo.ghost` | 2 `dEchoAfterimage` |
| 800 | `score.chip.pop` | `dEsChipPop` |
| 900 | `score.chip.fly` | `dEsChipFly 1200ms` along `lobPath()` |

### 7.11 `trick: eclipse` — 4000 ms

| at | cue | note |
|---|---|---|
| 0 | `trick.eclipse.drone` | `dEclipseNight 3600ms` — night falls |
| 300 | `trick.eclipse.corona` | `dEclipseCorona 1700ms`, 2 crack flashes inside |
| 400 | `duel.stamp` | "ROUND VOIDED / SHIELDS DOWN // 2 ROUNDS" |
| 1450 / 1540 | `trick.eclipse.glyph` | 2 broken-shield glyphs drop |
| 1600 | `trick.eclipse.crack` | chip CRACKs (`dEsCrackL/R` + `dEsCrackFlash`) |
| 1900 | `score.chip.fly` | `dEsChipFly` lob |

### 7.12 `trick: ward` — 6200 ms

| at | cue | note |
|---|---|---|
| 180 | `trick.ward.seal` | `dWardSealSlam 720ms` — ritual bell/gong |
| 500 | `trick.ward.eye` | `dWdEyeOpen 620ms` + SVG `wdIrisDart` |
| 650 | `trick.ward.projectile` | `dWardProjectileDown/Up 620ms` |
| 800 | `trick.ward.flare` | `dWdEyeFlare` |
| 1100 | `trick.ward.impact` | `dWardImpact` ring |
| 2400 | `trick.ward.fire` | **looping** sourced fire crackle; `fireOn` timer (:2555), particle fire climbs 2650→4550 ms. **Stop the loop at 4550** so the ash at 4700 reads clearly |
| 4700 | `trick.ward.ash` | `dWdAshIn` |
| 4900 | `duel.stamp` | "BURNED" |

`dWdBurn 6200ms linear` is the card eroding under the fire — covered by the fire loop, no
separate cue.

### 7.13 `trick: reversal` — 4600 ms

| at | cue | note |
|---|---|---|
| 0 | `trick.reversal.vortex` | `RevVortex` streams spiral in (reversed-envelope layers) |
| 1100 | `trick.reversal.burst` | spin flips (`BURST` const :2285) + shockwave |
| 1100 | `score.chip.fly` ×2 | both score numbers cross on `rvFlyPathYou/Klein`, `dEsChipFly 1050ms`, hard-panned opposite |
| 2300 | `duel.stamp` | "SWAPPED" |

### 7.14 `trick: executioner` — 4400 ms

| at | cue | note |
|---|---|---|
| 0 | `trick.exec.rise` | `dTkPanelL/R 340ms` + white `dTkSlashIn @180` |
| 520 | `trick.exec.meter` | victim number `dNumSlam`; `dMeterFill 900ms @620` sentencing meter |
| 820 | `trick.exec.target` | `dTkTargetIn` — target card flies in |
| 1560 | `trick.exec.zone` | `dZonePulse` ×3, crimson threshold |
| 1600 | `duel.stamp` | "THRESHOLD MET" |
| 1650 | `trick.exec.bladeHold` | `dTkBladeHold` — the pause that sells the drop |
| 2160 | `trick.exec.rope` | `dTkRopeSlack 190ms` — fibre creak |
| 2350 | `trick.exec.bladeDrop` | **the money beat** — `dTkBladeDrop 190ms` |
| 2500 | `trick.exec.chop` | `dTkCutFlash`; halves split `dTkHalfA/B @2530`, target splits `@2520` |
| 2530 | `trick.exec.shake` | `dTkShake 460ms` + camera `dCameraExec 4200ms` |
| 2880 + 55·i | `trick.exec.letters` | "EXECUTED" chaos letters, `dLetterSlam`, 8 letters |
| 3280 | `trick.exec.scoreZero` | "SCORE → 0" `dNumSlam` |
| 3820 | `trick.exec.exit` | panels out |

### 7.15 `trick: execfail` — 3700 ms

| at | cue | note |
|---|---|---|
| 0 | `trick.exec.rise` | same panel entry |
| 620 | `trick.exec.meter` | meter **stalls short** (`met = false`) — shorter, unresolved variant |
| 1560 | `trick.exec.strain` | `dTkBladeStrain 900ms` + `dTkRopeStrain` — metal creak under load, **never drops** |
| 2210 | `duel.stamp` | "SPARED" letters |
| 2560 | `trick.exec.sub` | "SCORES BELOW 7 ESCAPE THE BLADE" |
| 3300 | `trick.exec.exit` | panels out |

### 7.16 `trick: oracle` — 4600 ms

| at | cue | note |
|---|---|---|
| 0 | `trick.oracle.veil` | night veil |
| 0 | `trick.oracle.lens` | `dOracleLens 1450ms` + `dOracleSpin` dashed ring |
| 350 | `trick.oracle.scan` | `dOracleScan 1350ms` beam |
| 600 | `trick.oracle.constellation` | canvas lines draw 600→1800 ms |
| 2100 | `duel.stamp` | "PEEKED" / "HAND SEEN" |
| 2100 + 240·i | `trick.oracle.face` | peeked faces burn through `dOcFace 700ms` (yours only, i = 0,1) |
| 3000 + 200·i | `trick.oracle.glint` | `dOcPop` star glints |
| 3450 + 200·i | `score.chip.fly` | glints fly to the dock |

Longest reverb send in the game (0.6+).

### 7.17 `idle` — 500 ms

**Silent.** Deliberate rest before the round turns.

### 7.18 Round wipe — driven from `onNextRound()` :745, 2300 ms window

| at | cue | note |
|---|---|---|
| 0 | `round.sweep` | `dRwBack` + `dRwLead` + `dRwPanel` 2200 ms staggered sweeps |
| 480 | `round.next` | "NEXT" `dNumSlam` |
| 560 / 710 / 860 | `round.bars` | 3 yellow `dRwBar` @560 + 150·i |
| 580 / 615 / 650 | `round.burst` | `dRwBurst` starburst seal ×3 |
| 700 | `round.letters` | "ROUND" chaos letters |
| 760 | `round.number` | huge `dRwNumSlam` |
| 980 | `round.plate` | count plate `dStampIn` ("N / 7 — CLIMAX ×2" on R7) |
| 1480 | `round.cutFlash` | `dTkCutFlash` |
| 1500 | `round.burstOut` | `dRwBurstOut` |
| 1520 | `round.split` | number halves split `dRwHalfA/B` |

### 7.19 R7 ×2 arrival — `onNextRound()` :748-754

Fires 1950 ms after the wipe starts, then flies 1500 ms.

| at | cue | note |
|---|---|---|
| +1950 + 100 | `score.chip.pop` | `dEsChipPop` |
| +1950 + 400 | `score.chip.fly` | `dEsChipFly 1100ms` along `r7ArrivalPath()` |
| +1950 + 1350 | `score.chip.land` | `dVdFadeOut` — chip takes its seat |
| on fuse (:1427) | `score.chip.fuse` | R7×2 + ECHO → ×3, `dEsWave 650ms` |

### 7.20 Commit phase + match end

| Beat | Cue | Timing |
|---|---|---|
| "DUEL START" text slam | `duel.intro.slam` | `dIntroT 1250ms`, at 0 |
| red panel sweep-out | `duel.intro.panel` | `dIntroPanel 500ms`, at **1150** |
| hand fly-in | `duel.deal` | `dHandIn 420ms`, at 55·i for i = 0…6, pitch ramping up |
| card commit | `duel.pick` | replaces bare `playCardPop()` at :726 |
| table impact shake | `duel.table.impact` | `dImpact 380ms`, on `revealed` flip |
| portrait lunge | `duel.lunge` | `dLunge 500ms`, on `revealed` flip |
| Klein thinking dots | `duel.thinking` | single soft tick on `setKleinThinking(true)` — **not** a loop |
| Klein bubble | `duel.bubble` | `dBubbleIn 420ms`, on `/ai-pick` message |
| SIGNAL LOST | `duel.error` | :1492 |
| echo chip death | `score.chip.death` | `dChipDeath 650ms`, driver :690-693 |
| shield chip death | `score.chip.shieldDeath` | `dShieldDeathL/R 650ms`, driver :694-697 |
| corner-rack reflow | `score.chip.slide` | `transition: left 450ms` |
| info modal | `ui.modal.in` / `ui.modal.out` | `dInfoFade 200ms` / `dInfoPop 440ms` |
| result panels | `round.panelIn` | `dPanelL/R 380ms` |
| PACIFIED! | `duel.victory` | `dTitleSlam 520ms`, at 380 |
| DEFEAT | `duel.defeat` | same |
| DRAW | `duel.draw` | same |

### 7.21 Non-duel screens

| Screen | Cues |
|---|---|
| `campaign.tsx` | `campaign.ticket.pick` (replaces `playCardPop` :112), `campaign.ticket.claim`. **Conditional:** add `campaign.win` only if the screen actually has a win/complete state — the implementer must confirm by reading the file, not assume it |
| `shame.tsx` | `shame.enter`, `shame.stamp` |
| `profile.tsx` | currently **no SFX import at all** — add `ui.hover`/`ui.click`. **Conditional:** `profile.stat.up` only if a stat-increment animation exists |
| `howto.tsx` | `howto.page.turn`, `ui.hover`/`ui.click`. Do **not** touch `public/how-to-play/audio/*.mp3` — those belong to the standalone `how-to-play.html`, not this screen |
| `multiplayer.tsx` | stub screen — `ui.hover`/`ui.click` only |
| `gate.tsx` | `ui.hover`/`ui.click` |
| `dossier.tsx` | already covered by `ui.*`; add `dossier.card.tilt` for the 3D drag-tilt ID card |
| `options.tsx` | keep `playSliderTick` (already throttled 45 ms) |

Non-duel work is deliberately thin: `ui.*` coverage plus at most one or two bespoke cues per
screen. The duel is where the effort goes.

### 7.22 Legacy sounds

`/hover.wav`, `/sfx/click.wav`, `/sfx/slider.wav`, `/sfx/card.wav` are **re-rendered in
place at the same filenames** to match the new palette. Paths do not change, so no importer
breaks. Git history retains the originals.

---

## 8. BGM

`/duel` is **absent** from `PAGE_BGM` ([bgm.ts:14-27](../../../apps/web/src/lib/bgm.ts)), so
`playBgmForRoute` returns early and the campaign jazz keeps playing through the whole fight.

Fix: map `/duel` → `RISING.mp3`. Alternate candidates from the currently-unused pool:
`Lightning Moment.mp3`, `PRDR.mp3`, `Acceleration.mp3`. **This is a one-line change and the
user should pick by ear** — we cannot audition music.

Ducking: `duckBgm(0.5, 250, 600)` on entry to any `trick` step and any `multmash` step;
`duckBgm(1.0, 400, 800)` on exit. Applied from the same driver hook, so it inherits the
same cancellation semantics.

`music-sets.md` at the repo root is the documented source of truth for the route map and
must be updated in the same change.

---

## 9. Verification

### 9.1 Objective, runnable

**(a) Studio self-check** (`tools/sfx-studio/src/check.ts`), run after every render:

| Assertion | Threshold | Why |
|---|---|---|
| peak | ≤ −1.0 dBFS | no clipping after the limiter |
| **leading silence** | **< 5 ms** | head silence is a *timing bug* — the runtime schedules by offset |
| duration | within the step budget | a cue longer than its beat bleeds into the next |
| RMS | inside a per-family band | keeps the mix coherent; catches one cue shouting |
| layer count | ≥ 2 | enforces §2's "no single-oscillator beeps" rule |
| determinism | re-render → identical sha256 | catches unseeded `Math.random()` |

Emits a report table committed alongside the assets.

**(b) Manifest integrity test** (vitest in `apps/web`):
every cue name in `SFX` resolves to a file that exists in `public/sfx/`; every file in
`public/sfx/` is referenced by at least one cue; every cue named in `duel-cues.ts` exists in
`SFX`. A typo becomes a failing test, not a silent no-op.

**(c) Browser pass** (browser-use MCP):
- `/sfx-test` — rebuilt bench fires **every** cue individually, then each step's full
  timeline. Assert `debugAudio().failed` is empty and `decoded` equals the asset count.
- `/duel?demo=all` — the ANIM LAB playlist auto-cycles all **24** scenarios
  (`DEMO_SCENARIOS`, [duel.tsx:74-99](../../../apps/web/src/screens/duel.tsx)). Watch
  `list_console_messages` for decode errors, unhandled rejections, and AudioContext
  warnings. Confirm `liveVoices` never exceeds 24.
- Verify the unlock path still works from a cold load: `/login` → gesture → `/duel`.

**(d) Timing audit** — a table pairing each CSS animation delay against its cue offset,
committed to `sfx-sets.md`. Catches "the sound is right but it's on the wrong frame".

**(e) Type + test gates** — `npm run build` (all workspaces typecheck), `vitest run` in
`packages/engine` and `packages/ai-brain` must stay green (nothing in this change should
touch them, and if it does, that's a bug).

### 9.2 The honest limit

**Nobody on this team can hear.** Everything in §9.1 proves the audio is clean, in-phase,
correctly timed, and free of decode failures. None of it proves the guillotine hits hard
enough, that the WARD fire isn't annoying over 6 seconds, or that `RISING.mp3` is the right
duel track.

Mitigations, in order of value:

1. The rebuilt `/sfx-test` bench lets the user audition **every** cue and **every** step
   timeline in one place, with gain/pitch controls, without playing a match.
2. `/duel?demo=all` plays all 24 scenarios unattended — the fastest way to judge the mix in
   context.
3. Every mix parameter lives in one manifest, so "make the stamp quieter" is a one-number
   change, not a re-render.
4. **Final taste approval is explicitly the user's.** No agent may report this work as
   "sounds good". Completion claims are limited to what §9.1 actually measured.

---

## 10. Delegation

The cue-name table (§7) plus the manifest shape (§5.1) form the contract, which lets the
first two roles run **in parallel** against disjoint files.

| Role | Owns | Must not touch |
|---|---|---|
| **SFX Specialist** | `tools/sfx-studio/**`, `apps/web/assets/sfx/**`, `apps/web/public/sfx/**`, `sources/provenance.json`, the self-check report, `sfx-sets.md` asset column | anything under `apps/web/src/` |
| **Runtime Audio Engineer** | `apps/web/src/lib/sfx.ts`, `sfx-manifest.ts`, `duel-cues.ts`, `bgm.ts`, all screen wiring, `/sfx-test` bench, `music-sets.md`, the integrity test | `tools/sfx-studio/**`, the asset files |
| **Verifier** (fresh eyes) | runs §9.1 (a)–(e), writes the timing audit, reports findings | fixes nothing — reports only |

The Runtime Engineer can build and unit-test the entire engine against the **four existing
WAVs** before a single new asset lands, because the contract is the manifest, not the files.
Integration is then just assets appearing at the paths the manifest already names.

Sequencing:

1. Spec approved + committed (this document).
2. **Parallel:** Specialist builds studio and renders; Runtime Engineer builds engine + wiring.
3. Integration — assets land at manifest paths; integrity test goes green.
4. Verifier runs §9.1, files findings.
5. Findings fixed by the owning role.
6. User auditions on `/sfx-test` and `/duel?demo=all` and gives taste approval.

---

## 11. Risks

| Risk | Mitigation |
|---|---|
| **Cannot hear the result** | §9.2 — objective checks plus a user-facing audition bench; no agent claims "sounds good" |
| Asset bloat | ≤ 12 MB budget, mono 16-bit, aggressive trimming, 22.05 kHz for sub-only cues |
| Licensing contamination | CC0 only, `provenance.json` with sha256, nothing ships raw |
| Autoplay policy blocks audio | reuse the existing `unlockSfx()` gesture path (§3.2); never construct the context at module scope |
| Polyphony blowup in cinematics | 24-voice hard cap, per-cue `maxVoices`, `cooldownMs` on ticks |
| ANIM LAB tail bleed | `cancelTimeline` in the driver's existing effect cleanup (:709) |
| Breaking the 11 existing `sfx.ts` importers | all exports preserved; legacy files re-rendered at identical paths |
| No ffmpeg/sox/python on this machine | pure-Node WAV I/O; WASM decoder added to the *studio* only, and only if a required CC0 source is ogg/mp3 |
| freesound downloads need an API key we lack | browse-only; rely on Kenney + OpenGameArt + GitHub CC0 repos |
| `pixabay.com` returns 403 | excluded from sourcing plan |
| Tick-count mismatch vs. the visible countdown | calibrate every number in §7.5 against `/duel?demo=countdown` in the ANIM LAB |
| Scope creep past "full coverage" | §7.21 non-duel work is explicitly `ui.*` + one or two bespoke cues per screen, nothing more |
| **Dirty working tree at start** | 20 tracked files are modified but uncommitted — including `duel.tsx` and `duel-keyframes.ts`, the two files this spec cites line numbers from. The line references here are against that *modified* state. Implementers must **not** `git checkout`/`restore`/`reset` anything, must not sweep these into their own commits, and should re-verify a line number before editing it. Commit only files this work actually touches |

---

## 12. Open items

These need a human decision and must not be guessed at by an implementer:

1. **The duel BGM track.** `RISING.mp3` is proposed in §8 purely on the strength of its
   name. Nobody on this team can audition music. Alternates already in
   `apps/web/public/musics/` and currently unused: `Lightning Moment.mp3`, `PRDR.mp3`,
   `Acceleration.mp3`, `Altair.mp3`, `Kizu.mp3`, `STAY TUNE.mp3`. Changing it later is a
   one-line edit in `bgm.ts`.
2. **Duck depth.** §8 proposes the music bus dropping to 0.5× during trick cinematics. The
   right number is a taste call; it is one constant.
3. **A freesound.org API key**, if the user wants that library in play. Without it the
   sourcing plan is Kenney + OpenGameArt + GitHub CC0 repos only (§4.3). This is optional —
   the plan is complete without it.
4. **Final taste approval** (§9.2). Every objective gate can pass and the mix can still be
   wrong. Sign-off on `/sfx-test` and `/duel?demo=all` is a required step, not a formality.

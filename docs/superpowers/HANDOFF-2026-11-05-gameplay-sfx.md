# HANDOFF — PACIFY gameplay sound effects

**Written:** 2026-11-05. **Branch:** `ionic-migration`. **HEAD:** `c672a99`.
**Status:** 4 of 23 implementation tasks complete. Studio foundation built and tested.
Zero assets rendered yet. Zero app code changed yet.

This document is self-contained. Read it, then read the two authoritative documents it points
at. Do not re-derive anything already decided here.

---

## 1. The mission

The duel screen in `apps/web` has exactly **one** gameplay sound today: `playCardPop()` on card
commit. Every other beat is silent — the 3-second showdown countdown, the card flip, all seven
trick cinematics (VOID / ECHO / ECLIPSE / WARD / REVERSAL / EXECUTIONER / ORACLE), the
guillotine, the multiplier mash, the round wipe, victory.

The job: give ~110 cue names backed by ~101 rendered WAV assets, sample-accurately synced to the
existing CSS animation choreography.

The user's stated bar: *"i want good sfx, not something thats just simple."* They also said:
*"make sure that the sfx actually works and fits well."*

**The single most important constraint on this project: nobody working on it can hear.** Every
quality claim must be objective and measured. No agent may ever write "sounds good" or "the SFX
fit well". Final taste sign-off belongs to the user, via the `/sfx-test` audition bench that
Task 18 builds.

## 2. Authoritative documents (read these before doing anything)

| Document | Path | Role |
|---|---|---|
| **Spec** | `docs/superpowers/specs/2026-11-04-gameplay-sfx-design.md` | Binding authority. §7 (the cue table) is normative for every animation offset. §12 lists the four decisions only the user can make. |
| **Plan** | `docs/superpowers/plans/2026-11-04-gameplay-sfx.md` | 23 tasks, 4800 lines, complete code for all infrastructure. **Argues from the spec** — where they disagree, the spec wins. |
| **Ledger** | `.superpowers/sdd/2026-11-04-gameplay-sfx/progress.md` | Progress + all 16 rulings + deferred minors. **Gitignored**, so it will not travel with a clone — copy it separately if needed. |
| **Task reports** | `.superpowers/sdd/2026-11-04-gameplay-sfx/task-N-report.md` | Per-task implementer reports with TDD evidence. Also gitignored. |

**The plan has known-stale sections.** Rulings in §5 below override it. Read those first.

## 3. What is already built and verified

All of this is committed and tested. Studio suite: **37/37 passing**
(`npm test --prefix tools/sfx-studio`).

```
tools/sfx-studio/
  prng.mjs        mulberry32 seeded PRNG + range(). Determinism is non-negotiable.
  wav.mjs         float32 <-> 16-bit PCM mono WAV. Chunk-walking reader with guards for
                  too-short files, fmt chunk < 16 bytes, and data chunk past EOF.
                  writeWav uses Math.round (NOT truncation) — see Ruling 6.
  dsp.mjs         osc (sine/tri/saw/square + freq glide), noise (white/pink/brown),
                  applyEnv (breakpoint, lin/exp), biquad (RBJ cookbook, 5 types, cutoff
                  automation), shape, delay (proper feedback semantics — see Ruling 9),
                  pitch (resample), panGain, limit (lookahead + hard clamp), normalize,
                  trimSilence, mixInto, stats. NOTE: stats() returns `.samples`, NOT
                  `.duration` (Ruling 11).
  fft.mjs         radix-2 in-place FFT + frequency-domain convolve(). Validated against a
                  naive O(n*m) reference element-by-element.
  ir.mjs          makeIR() with 4 procedural presets: hall / plate / metal / cathedral.
                  Buffer is always exactly `seconds` long; `decay` sets envelope fall time;
                  pre-delay shifts within the fixed length (see Ruling 12).
  render.mjs      renderRecipe(recipe, { outDir, keepSilence, wet }) + CLI.
                  RENDERS DRY BY DEFAULT (Ruling 13). --wet is an audition preview only.
                  --clean is opt-in (the wipe used to be unconditional). Entry point is
                  guarded so the module is importable without side effects.
                  MASTER_CEILING_DBFS = -1 clamps normalizeTo so a recipe cannot push the
                  peak back over the limiter's ceiling.
  sources.mjs     CC0 download -> ffmpeg normalise -> provenance.json. License guard fails
                  closed on anything that is not exactly "cc0" case-insensitively.
                  Handles Kenney's per-run signed zip links via a dependency-free zip reader.
  recipes/ui.mjs  ONE real recipe so far: `click`.
  recipes/index.mjs  aggregates RECIPES; has commented-out imports for the 10 families
                     that Tasks 9-14 will add. That comment block is a deliberate checklist.
  check.mjs       DOES NOT EXIST YET — this is Task 5.

  sources/normalised/   7 CC0 textures, all committed-pending (see Ruling 16):
                        card-flick, paper-slap, metal-clang, glass-shatter,
                        wood-hit, rope-creak, fire-crackle
                        44100 Hz mono 16-bit, 0.60-8.00s, 1.45 MB total
  sources/provenance.json   COMMITTED. 7 entries, all license CC0, with url/page/author/
                        downloadedAt/sha256/role/note. A reviewer independently fetched all
                        six source pages and verified every CC0 claim.
  sources/raw/        12 MB, gitignored, local only
```

**Nothing under `apps/web/` has been touched yet.** No manifest, no engine, no wiring, no
assets in `apps/web/assets/sfx/` (that directory does not exist yet).

## 4. Commit history for this work

```
c672a99 feat(sfx-studio): CC0 source pipeline with license guard and provenance     <- Task 4
adbee64 test(sfx-studio): make render tests independent of assets/sfx tree state    <- Task 3 r2
0df4952 fix(sfx-studio): make render.mjs importable, render dry by default, clamp   <- Task 3 r1
69296d4 feat(sfx-studio): FFT convolution, procedural IR presets, renderer + CLI    <- Task 3
7bdf91d fix(sfx-studio): delay feedback semantics, limiter ceiling clamp, samples   <- Task 2 r1
8f45420 feat(sfx-studio): DSP primitives                                            <- Task 2
efad394 fix(sfx-studio): guard readWav against malformed WAVs; pin clamp test       <- Task 1 r1
5e50f99 feat(sfx-studio): scaffold — seeded PRNG, WAV I/O, probe                    <- Task 1
aa62a5c feat(web): landscape-phone responsive pass across screens                   <- USER'S OWN WORK
86ea3fc chore: gitignore the subagent-driven-development scratch workspace
0e0998a docs: gameplay SFX implementation plan — 23 tasks
5fbdf9e docs: gameplay sound design spec
```

`aa62a5c` is **the user's own uncommitted work** (1356 lines, a landscape-phone responsive pass
across 20 files), committed at their explicit instruction so that every SFX commit stays
SFX-only. Do not touch or revert it.

## 5. RULINGS THAT OVERRIDE THE PLAN TEXT

These were made during execution and the plan was **not** updated for all of them. If the plan
and this section disagree, **this section wins**.

- **Ruling 1 — the seven source ids are a hard contract.** Tasks 9–14 reference sample layers by
  filename. The required ids are exactly `card-flick`, `paper-slap`, `metal-clang`,
  `glass-shatter`, `wood-hit`, `rope-creak`, `fire-crackle`. **SATISFIED** — all seven exist.
  The plan's prose also mentions "felt thud", which no recipe consumes; it is not required.

- **Ruling 6 — `writeWav` uses `Math.round`.** The plan's verbatim code used `setInt16`, which
  truncates toward zero; combined with the asymmetric `0x7fff`/`32768` scaling the round-trip
  error exceeded the plan's own test tolerance. The implementation was fixed, not the assertion.

- **Ruling 7 — the canonical aggregate test command is `npm test --prefix tools/sfx-studio`.**
  **Node on PATH is v22.19.0, not the v24 the plan assumed.** On v22, `node --test <directory>`
  (with OR without a trailing slash) fails with `MODULE_NOT_FOUND` — it tries to load the
  directory as a module. Working forms: explicit file path, glob
  (`node --test "tools/sfx-studio/*.test.mjs"`), `cd` then `node --test`, or the npm script.
  **The plan's Task 23 Step 1 uses the broken form and must be substituted.**

- **Ruling 9 — `delay()` semantics were fixed.** The plan's version fed the delay line's own
  output back into itself regardless of `feedback`, so at `mix: 1` echoes never decayed. Now only
  dry enters the line (`buf[i+d] += data[i]*mix`) and recirculation is solely through `feedback`.
  **This mattered enormously:** `makeIR()` calls `delay(..., { ms: 11, feedback: diffusion, mix: 1 })`,
  so the bug would have turned all four IR presets into 11ms unity-gain comb rings and corrupted
  every reverberated asset.

- **Ruling 10 — `limit()` ends with a hard clamp to `±ceiling`.** The lookahead smoother alone
  breached the ceiling on transients sharper than its window (peak 40.53 with `lookahead: 4`).
  The clamp is a safety net; at `lookahead >= 16` it never engages.

- **Ruling 11 — `stats()` returns `.samples`, not `.duration`.** The field holds a sample count.
  Grep for `.duration` — there must be zero field reads by that name.

- **Ruling 12 — `makeIR()` was rewritten.** The plan's version computed
  `dur = Math.min(seconds, p.decay * 1.6)` and then *padded* by pre-delay, which broke its own
  tests (metal truncated to 0.8s; hall and cathedral near-identical at 3.0s). Now: buffer is
  always exactly `seconds`, `decay` sets envelope fall time, pre-delay shifts within the fixed
  length. **The four preset tunings are verbatim from the plan** — verified field-by-field, not
  retuned to pass a test. Measured hall 1.815s vs cathedral 3.010s = 1.66x.
  **Consequence for Task 7:** the browser-side `makeIrBuffer()` in `sfx.ts` must mirror `ir.mjs`
  **as landed**, not the plan's original code.

- **Ruling 13 — RENDER DRY. Reverb is applied live in the browser.** The plan had the studio
  baking reverb into assets *and* the browser applying live sends from the manifest — every
  reverberated cue (~60 of 101) would have gotten its tail **twice**. Now `render.mjs` emits dry
  audio by default; `recipe.reverb` remains as the designer's statement of intent and drives
  `--wet` previews; the manifest's `reverb`/`reverbIR` fields are the single runtime authority.
  Verified: a probe recipe renders dry = 0.0449s vs wet = 0.6118s.
  **Residual risk to report to the user:** recipe `reverb` blocks and manifest `reverb` values
  must agree by hand, and nothing enforces it automatically.

- **Ruling 16 — NOT YET APPLIED.** `sources/normalised/` must be **committed** (currently
  gitignored). Those seven files are the inputs every recipe in Tasks 9–14 loads, and the Kenney
  zip URLs are signed per-run, so as-is a fresh clone cannot re-render anything. 1.45 MB — trivial
  next to the 150.7 MB already in `public/musics/`. `sources/raw/` (12 MB) stays gitignored.
  **This is the first thing to do.** Fix: remove the `sources/normalised/` line from
  `tools/sfx-studio/.gitignore`, then `git add tools/sfx-studio/sources/normalised`.

## 6. Environment gotchas (hard-won — do not rediscover)

- **Node is v22.19.0** on PATH, not v24. See Ruling 7 for the `node --test` consequence.
- **ffmpeg IS available** — `ffmpeg-static@5.3.0` is a root devDependency resolving to
  `node_modules/ffmpeg-static/ffmpeg.exe` (ffmpeg 6.1.1). It is **not on PATH**, so
  `ffmpeg -version` in a shell fails and looks like ffmpeg is absent. Import the existing
  wrapper: `import { ffmpegPath, run, probeDuration } from "../motion/encode.mjs"`.
  Never shell out to a bare `ffmpeg`. `tools/motion/mix.mjs` shows the filter-graph house style.
- **No sox, no python.** Not installed. Not needed.
- **`puppeteer-core` is a root dependency** and `tools/motion/` already has a working harness:
  `startServer({ root, port })` from `serve.mjs`, `findChrome()` from `capture.mjs`.
  Task 21 must **reuse** these, not reinvent. Note `tools/motion/smoke.mjs` launches with
  `--mute-audio`; **Task 21 must NOT**, or it cannot exercise real playback.
- **Network reachability (already probed):** `kenney.nl` 200, `opengameart.org` 200,
  `github.com` 200, `freesound.org` 200 for browsing but **downloads need an OAuth key we do not
  have**, `pixabay.com` **403 — do not use**.
- **`core.autocrlf=true`** — git warns "LF will be replaced by CRLF" constantly. Normal, not an error.
- **No LFS.** There is no `.gitattributes` anywhere and `git lfs track` is empty. The existing 20
  BGM mp3s are plain git blobs. New WAVs follow suit.
- **`tools/` is NOT in the root `workspaces` array** (`["apps/*", "packages/*"]`) and must not be
  added. `tools/sfx-studio/package.json` has empty `dependencies`/`devDependencies` — keep it that
  way; no audio dependency may ever be added to `apps/web`.
- **`.superpowers/` is gitignored.** Never stage anything under it.
- **Untracked files belonging to the user** that must never be staged or deleted: `.zcode/`,
  `vibe_videos/`, `tools/motion/pelican.test.mjs`, `tools/motion/src/pelican.{css,html,js}`.

## 7. Repo facts the plan relies on

- Monorepo, npm workspaces: `packages/engine` (pure TS game engine), `packages/ai-brain`,
  `packages/db`, `apps/server` (Fastify), `apps/web` (Ionic React 9 + react-router 6 + Vite 8).
- `apps/web` dev server is **port 8081**; server is 3001.
- **`apps/web` has no test runner yet.** Task 6 adds `vitest.config.ts` + a `test` script +
  `vitest` devDep. `packages/engine` and `packages/ai-brain` already use vitest 3, hoisted to
  root `node_modules/.bin`. `apps/web/tsconfig.json` `include` is `["src", "vite.config.ts"]`, so
  a `test/` directory is NOT typechecked by `npm run build` — that is intentional and matches
  how `packages/engine` handles its `test/`.
- **The duel's animation driver** is a single `useEffect` in `apps/web/src/screens/duel.tsx` at
  **lines 607–711**, keyed on `[seqIdx, seqSteps]`, with a cleanup at line 709. This is the choke
  point that sounds the entire reveal choreography. Line numbers verified accurate at `aa62a5c`.
- **`SeqStep`** is the step union at `duel.tsx:21`. Task 8 adds the word `export` to it.
- **The ANIM LAB** is the calibration rig: `/duel?demo=1` loops one scenario, `/duel?demo=all`
  cycles all **24** (`DEMO_SCENARIOS` at `duel.tsx:74-99`). Its header comment says *"what you
  judge here is what ships"*. Every timing question gets answered here, not by guessing.
  `DEMO_SCENARIOS` is **not exported** and Task 18 must not export it.
- **`/duel` is missing from `PAGE_BGM`** in `apps/web/src/lib/bgm.ts:14-27`, so campaign jazz
  currently plays under the whole fight. Task 17 fixes it. `/sfx-test` and `/gate` are also
  unmapped and should be `null` (you cannot audition SFX over music).
- **Legacy audio paths must not change:** `/hover.wav` (at `public/` root, not in `public/sfx/`),
  `/sfx/click.wav`, `/sfx/slider.wav`, `/sfx/card.wav`. Task 9 re-renders them **in place at the
  same filenames**. Note `hover.wav`'s source lives at `apps/web/assets/audio/hover.wav`, which is
  why `render.mjs` grew per-recipe `outDir` support.
- **Thirteen modules import from `sfx.ts`** — eleven via `../lib/sfx` (`P5Back`, `campaign`,
  `dossier`, `duel`, `load`, `login`, `menu`, `options`, `sfx-test`, `shame`, `start`) plus
  `lib/bgm.ts` and `lib/options.ts` via relative `./sfx`. Task 7 must preserve every export.
- `music-sets.md` at the repo root is the documented source of truth for the BGM route map and
  must be updated by Task 17.

## 8. The process being followed

**superpowers:subagent-driven-development.** Per task: generate a brief
(`scripts/task-brief PLAN N`), record BASE (`git rev-parse HEAD`), dispatch a fresh implementer
with the brief path + report path + context + resolved ambiguities, then generate a review package
(`scripts/review-package PLAN BASE HEAD`) and dispatch a task reviewer, then run a fix loop
(max 5 rounds) with a scoped re-review after each round. Append every outcome to the ledger.

Scripts live at:
`C:/Users/EDRICK/.qoder/plugins/cache/qoder-marketplace/superpowers/6.3.0/skills/subagent-driven-development/scripts/`
(`sdd-workspace`, `task-brief`, `review-package`).

Two harness limitations, recorded rather than worked around silently:
- **No model selection.** The `Agent` tool has no model parameter, so every subagent inherits the
  session model. The skill's cost tiering cannot be applied.
- **No subagent resume.** Fix rounds cannot resume the original implementer; each round dispatches
  a fresh agent carrying the brief path, the report-file path, and the findings verbatim. The
  report file is the persistent memory.

**Working agreements that have been holding and should continue:**
- Implementers never spawn subagents, especially never a reviewer.
- Implementers never touch the shared task list.
- Stage files by explicit name. **Never** `git add -A` or `git add .`. Never
  `git checkout`/`restore`/`reset`/`clean`.
- Do not weaken an assertion to make a test pass. Fix the code, or tighten the test.
- Every gate must be **seen to fail** at least once, or it is not a gate.
- The user asked for **frequent commits** so any step can be rolled back. One commit per task
  minimum; the plan already does this.

## 9. What is next, in order

**Immediately:** apply Ruling 16 (commit `sources/normalised/`).

Then the plan's remaining tasks. Track A (studio) and Track B (runtime) are independent by design
and share only the manifest contract — but run them **sequentially**, not in parallel, because
both commit to the same branch.

| Task | What | Notes |
|---|---|---|
| **5** | `tools/sfx-studio/check.mjs` + `check.test.mjs` (12 tests) | The objective quality gate: peak ≤ −1 dBFS, **leading silence < 5 ms**, RMS band per family with per-asset overrides, duration vs step budget +15% tail grace, ≥ 2 layers, DC offset. `RMS_BANDS`/`BUDGET_MS` must include **all** families: `ui`, `stamp`, `table`, `clash`, `shield`, `score`, `round`, `screens`, and the seven `trick-*`. An unknown family must be a **hard failure**, not a silent skip (Ruling 2). `RMS_OVERRIDES` covers deliberately-quiet assets: `duel-thinking`, `duel-bubble`, `score-chip-slide`, `dossier-card-tilt`, `trick-exec-bladehold`. |
| **6** | `apps/web/vitest.config.ts`, `test/sfx-manifest.test.ts`, `src/lib/sfx-manifest.ts` | **THE CONTRACT.** 108 cue names → 101 distinct files. Complete manifest code is in the plan. The file-existence test is deliberately deferred to Task 20 because the assets do not exist yet. |
| **7** | Rewrite `apps/web/src/lib/sfx.ts` | Replace lines 1–204 (the SFX half) with the Web Audio engine; **keep lines 206–433 (BGM half) with three surgical edits**. Must mirror `ir.mjs` as landed (Ruling 12). Preserve all exports for the thirteen importers. `decodeAudioData` in `initSfx`, `ctx.resume()` in `unlockSfx`. 24-voice cap, per-cue `maxVoices`, `cooldownMs`. |
| **8** | `apps/web/src/lib/duel-cues.ts` + `test/duel-cues.test.ts` | Pure `cuesForStep(step) -> CueEvent[]`. Every offset from spec §7, unit-tested. Add `export` to `SeqStep` at `duel.tsx:21`. **Improvement over spec §6.2:** all sub-ticker cues are pre-scheduled from step data, not hooked into the `setInterval` loops. |
| **9–14** | Render the 101 assets | Six tasks, each: write recipes → render → pass `check.mjs` → audition against a named ANIM LAB scenario → commit. Design tables with per-asset layer specs are in the plan. Counts: 16 + 15 + 24 + 19 + 22 + 5 = 101. **Task 9 no longer needs to add the `--clean` flag** (already landed in Task 3's fix round). |
| **15** | Hook the sequence driver | ~4 added lines at `duel.tsx:607-711` + a separate duck-restore-on-unmount effect. This one hook sounds the entire reveal. |
| **16** | Hook ~14 event-driven duel beats | **Line numbers in the plan are stale by now** because Task 15 inserted ~15 lines. Locate each site by its enclosing function name (Ruling 4). |
| **17** | `bgm.ts`: add `/duel` → `RISING.mp3`, `/sfx-test` → null, `/gate` → null | Verify the mp3 exists first. Update `music-sets.md`. **The track choice is a guess from its name — flag to the user.** |
| **18** | Rebuild `/sfx-test` as the audition bench | The user's primary tool for taste sign-off. 17 step-timeline buttons + a button per cue + `debugAudio()` header. |
| **19** | Wire the non-duel screens | `profile.tsx`, `howto.tsx`, `multiplayer.tsx`, `gate.tsx` have **no sfx import at all** today. Delete any manifest cue left with no call site rather than orphaning it. **Do not touch `public/how-to-play/audio/*.mp3`** — those belong to the standalone HTML. |
| **20** | Integration | Add the file-existence + orphan + 16 MB budget tests deferred from Task 6. Add `sfx:sync`/`sfx:render` npm scripts. Copy `assets/sfx/` → `public/sfx/`. |
| **21** | `tools/sfx-studio/smoke.mjs` | Headless puppeteer audit reusing `tools/motion`'s harness. **Two flagged assumptions to verify:** the `import("/src/lib/sfx.ts")` trick only works against the Vite dev server, and `/duel` may need a real auth precondition (Ruling 5). Prove it can fail by renaming an asset. |
| **22** | `docs/sfx-sets.md` | The timing audit. Dump cue offsets mechanically via `npx tsx`, never transcribe by hand. Pair every CSS animation delay against its cue offset. **Any disagreement is a bug in `duel-cues.ts`, not in the doc.** |
| **23** | Final report | Re-run every gate, report **measured** facts only, surface spec §12's open items. Forbidden to claim anything sounds good. |

After all 23: a final whole-branch review on the most capable model, pointed at the ledger's
deferred-minor list, then `superpowers:finishing-a-development-branch`.

## 10. Outstanding work NOT yet done

**A Task 4 fix round was about to be dispatched and never was.** It should cover:

1. **Ruling 16** — commit `sources/normalised/` (remove the gitignore line, `git add` the dir).
2. **Minor:** `sources.mjs:286` cache key is too narrow. For pack sources `spec.url` is the pack
   *page*, so changing `packFile` or editing `normalise` leaves `url` unchanged and the stale
   output is silently kept as `= <id> (cached)`. A recipe author in Tasks 9–14 tuning a trim value
   will be bitten. Fix: key the cache on a hash of the whole spec.
3. **Minor:** a mid-run `--force` failure can leave a partial output that a later run caches as
   valid, and provenance is written once after the whole loop. Fix: write to a temp file and
   rename on success, and persist provenance per entry.

Deferred, do not fix opportunistically: no `Content-Length` cross-check on downloads; hardcoded
OpenGameArt `Referer` for all direct sources.

## 11. Deferred minors accumulated so far (for the final review to triage)

- **Task 1:** NaN silently becomes digital silence in `writeWav` (caught late by Task 5's rms
  floor, with a confusing message). `prng` test asserts determinism but no golden value. Brief
  declared `writeWav => Promise<void>` but it returns `path`.
- **Task 2:** no NaN/invalid-parameter validation — `osc` with `f:0, fEnd>0, glide:"exp"` yields
  `Math.pow(Infinity)` → NaN; `biquadCoefs` with `q:0` yields NaN coefficients; `delay` with
  missing `ms` silently passes audio through. Brown/pink noise practically but not provably
  bounded. `applyEnv` silently clamps negative levels to the `1e-4` floor. Test gaps: `panGain`,
  tri/saw/square, non-lowpass biquad types, `fEnd` automation, `glide:"lin"`, delay feedback.
  `osc` integrates phase before evaluating so sample 0 is offset.
- **Task 3:** the entry guard at `render.mjs:252` compares `import.meta.url` to
  `pathToFileURL(process.argv[1])`; invocation through a symlink/junction would silently no-op.
  `--keepSilence` is camelCase while other flags are lowercase. The import-side-effects test
  snapshots only `.wav` names + existence (would miss an overwrite of an existing name or a
  non-`.wav` artifact). That test also depends on being the first importer of the memoised module
  promise. Test 2's title/comment still claims it exercises the `DEFAULT_OUT` leg, which it does
  not. **Ruling 15:** the bare `DEFAULT_OUT` fallback branch at `render.mjs:115` is untested —
  accepted because the failure mode is a loud `TypeError`, not silence. Revisit via a pure
  `resolveDest(recipe, opts)` helper at the final review if desired.
- **Task 4:** see §10.
- **Deferred to the final review, in `fft.mjs` and `ir.mjs`:** the power-of-two validator
  `n & (n - 1)` admits `n === 0`; `ir.mjs`'s pre-delay `shifted.set()` throws `RangeError` if the
  delay exceeds the buffer length.

## 12. Open items only the user can decide (spec §12)

1. **The duel BGM track.** `RISING.mp3` is proposed purely on the strength of its name. Alternates
   already in `public/musics/` and currently unused: `Lightning Moment.mp3`, `PRDR.mp3`,
   `Acceleration.mp3`, `Altair.mp3`, `Kizu.mp3`, `STAY TUNE.mp3`. One-line change in `bgm.ts`.
2. **Duck depth.** Currently proposed 0.5× during trick cinematics. One constant.
3. **A freesound.org API key**, if they want that library in play. Optional — the sourcing plan is
   complete without it.
4. **Final taste sign-off** on `/sfx-test` and `/duel?demo=all`. Every objective gate can pass and
   the mix can still be wrong.

## 13. Things to tell the user when reporting

- `rope-creak` is a **tree-trunk fibre creak, not rope** — no CC0 rope recording was found. It is
  used for the guillotine's rope slack and the misfire's metal strain. If the EXECUTIONER beat
  sounds wrong on audition, this is the first asset to suspect.
- Recipe `reverb` blocks and manifest `reverb` values must agree **by hand**; nothing enforces it
  (Ruling 13's residual risk).
- Nobody can hear the result. Report measured facts only.

---

# STATUS UPDATE — 2026-11-05, later

**HEAD is now `f9ca92b`.** Tasks 1–9 of 23 are complete. Tasks 10–23 remain.

## Completed since the handoff was written

| Task | Commit(s) | What |
|---|---|---|
| 4 | `c672a99` + `1fd7d15` | CC0 pipeline; all 7 textures CC0-sourced, none synthesized; `sources/normalised/` committed (Ruling 16 applied) |
| 5 | `55248f9` + `b73ada2` | Quality gate. **Ruling 17 replaced the per-family RMS band with a global crest check [2,30] dB + a −45 dBFS floor** — the band was invented and failed the first real asset |
| 6 | `3a0bf56` | Manifest contract: 108 cue names → 101 distinct files, verified value-by-value against the plan |
| 7 | `376507f`,`106f776`,`c376f8b`,`d28128e` | Web Audio engine. Five dispatches (two hit output-token limits). Real bugs fixed: `muteSfx` leaked reverb; timeline voice leak; two vacuous tests |
| 8 | `3436aac` + `d09f6e3` | `duel-cues.ts`. 14/14 spot-checked offsets match spec §7. Fixed a stretched shard fan and an inverted stereo pan polarity |
| 9 | `f9ca92b` | 16 assets (ui/stamp/table) rendered, gate green, 0.23 MB, determinism verified |

## New rulings that override the plan (add to §5 of this document)

- **Ruling 17 — no `RMS_BANDS` / `RMS_OVERRIDES`.** The gate checks crest factor [2,30] dB, an RMS floor of −45 dBFS, peak ≤ −1 dBFS, head silence < 5ms, ≥2 layers, duration vs `BUDGET_MS` +15%, and DC offset. **The plan's Task 10–14 text still tells you to add `RMS_OVERRIDES` entries — ignore that.**
- **Ruling 19 — the browser IR matches the studio preset *parameters*, not its algorithm.** Assets ship dry, so the studio IRs only serve `--wet` previews.
- **Ruling 21 — Tasks 9–13 may be accepted on the objective gate without a separate review**, since their deliverable is measured WAVs plus declarative recipes. Do **not** extend that to any code task.
- **Task 7 environment trap:** a root `npm run build` rewrites tracked
  `packages/{engine,ai-brain}/tsconfig.tsbuildinfo`. Restore with
  `git show HEAD:<path> > <path>` (never `git checkout`) before committing.

## Lessons that will save you a lot of time

1. **Large dispatches hit the model's output-token limit and produce nothing.** Task 7 failed twice that way. Fix: split by deliverable, and put a hard line cap on the expected response ("keep your response under N lines").
2. **For transcription-shaped tasks, extract the code, don't retype it.** Task 8's implementation and test both sat in fenced blocks in the brief; the implementer pulled them out with `awk`, which is byte-exact and nearly free. Use the same trick for Tasks 10–14 (their design tables are prose, but any full recipe blocks can be extracted).
3. **Focused, bounded review prompts work; sprawling ones hit the limit.** The reviews that succeeded asked 4–6 numbered questions with a hard output cap and told the reviewer which facts were already verified.
4. **This plan's verbatim code has contained real bugs in six of nine tasks.** Always assume a failing test means the code is wrong, never the assertion.

## What to do next

1. Task 10 (clash+shield, 15 assets) → Task 11 (score+round, 24) → Task 12 (tricks I, 19) → Task 13 (tricks II, 22) → Task 14 (screens, 5).
   - **Before placing any sourced sample at offset 0, check its actual onset with `trimStart`.** Task 9 found `card-flick` had 67ms of dead air — the head-silence rule would otherwise fail every asset using it.
2. Tasks 15–16 (wire the driver and event beats) — the first point at which the ANIM LAB actually produces audio, so that is when the timing can finally be judged against the visuals.
3. Tasks 17–23 as written.

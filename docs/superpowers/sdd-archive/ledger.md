# SDD ledger — plan: docs/superpowers/plans/2026-11-04-gameplay-sfx.md

Spec: docs/superpowers/specs/2026-11-04-gameplay-sfx-design.md (reachable, read — it is the
binding authority; the plan argues from it).

Base commit at execution start: `aa62a5c` (branch `ionic-migration`).
Prior commits this session: `5fbdf9e` spec, `0e0998a` plan, `86ea3fc` gitignore scratch,
`aa62a5c` the user's landscape-phone responsive pass (committed at their instruction so every
SFX commit stays SFX-only).

Standing instruction from the user: **commit often so any step can be rolled back.** The plan
already commits per task; do not batch tasks into one commit.

---

## Pre-flight conflict scan

### Rows: tasks sharing a file or an interface

| Tasks | Producer → consumer | Found |
|---|---|---|
| 3 → 9,10,11,12,13,14 | `renderRecipe`, `RECIPES`, the `Recipe` typedef | Clean. Task 9 adds `outDir` to the typedef and to `render.mjs`; recorded in Task 9's own text |
| **4 → 9,10,11,12,13,14** | **normalised source ids → `kind:"sample"` layers** | **CONFLICT — see Ruling 1** |
| 5 → 9,10,11,12,13,14 | `checkBuffer`, `RMS_BANDS`, `BUDGET_MS`, `RMS_OVERRIDES` | Clean after Ruling 2 |
| 6 → 7,8,10,18,19,20 | `SFX`, `SfxName`, `SFX_NAMES`, `cueFile`, `resolvePitch`, `resolvePan` | Clean. Task 10 amends one entry (`duel.clash.vs` pan) and says so |
| 7 → 15,16,18,19,21 | `play`, `playAt`, `scheduleTimeline`, `cancelTimeline`, `duckBgm`, `listSfx`, `debugAudio` | Clean |
| 8 → 15,18,22 | `cuesForStep`, `shouldDuckBgm`, `DUCK_TO/ATTACK/RELEASE`, `CueEvent` | Clean |
| 3,9,10,11,12,13,14 → `recipes/index.mjs` | 7 tasks append to one aggregator file | Manageable — sequential execution. See Ruling 3 |
| 6,20 → `test/sfx-manifest.test.ts` | Task 20 appends the file-existence suite Task 6 deliberately omitted | Clean, and Task 6 says so explicitly |
| 6,20 → `apps/web/package.json` | vitest devDep+script, then `sfx:sync`/`sfx:render` scripts | Clean — different keys |
| 8,15,16 → `duel.tsx` | Task 8 adds one word on line 21; 15 inserts ~15 lines before 609; 16 edits ~14 sites | **Line-number drift — see Ruling 4** |
| 1,21 → `tools/sfx-studio/package.json` | Task 1 already declares `"smoke": "node smoke.mjs"` | Task 21 Step 4 stages this file but specifies no change to it. Harmless; the script pre-exists |

### Rows: does each task's own text agree with itself?

| Task | Self-consistency |
|---|---|
| 1 | Clean. Test asserts 3 cases; implementation provides all three exports. `probe.mjs` created then deleted in Step 7 — intentional, stated |
| 2 | Clean. 14 tests, all against exports the implementation defines. The `delay` two-pass is flagged as the likely failure point |
| 3 | Clean. 8 tests. The `clashTicks`-style dead helper that an earlier draft carried was removed before commit |
| 4 | **Prose describes textures but never fixes their filenames — Ruling 1** |
| 5 | Clean after Ruling 2. 12 tests; `checkBuffer` signature takes `name` and every call site passes it |
| 6 | Clean. 10 tests. The manifest's 108 cue names resolve to 101 distinct files, matching the amended spec budget |
| 7 | Clean. 10 tests. The voice-cap test was rewritten to play all distinct cues — the original played one cue 200× and its own cooldown would have made it pass vacuously |
| 8 | Clean. `clashTicks()` helper returns `CueEvent[]` and the `case "clash"` branch calls it (an earlier draft had it returning a malformed object) |
| 9–14 | Design tables give layer specs; step cycles are complete. Family counts 16+15+24+19+22+5 = 101, matching the manifest |
| 15 | Clean. The duck-restore lives in a separate unmount effect, with the reason stated (avoiding pump between consecutive trick steps) |
| 16 | **Cites original line numbers that Task 15 has already shifted — Ruling 4** |
| 17 | Clean. Requires verifying `RISING.mp3` exists before mapping it |
| 18 | Clean. Deliberately does not export `DEMO_SCENARIOS` from duel.tsx, and says why |
| 19 | Clean. Requires deleting any cue left with no call site, which Task 20's orphan test then enforces |
| 20 | Clean. `__dirname` ESM caveat flagged with a working fallback |
| 21 | **Two stated assumptions, both flagged inline: the `/src/lib/sfx.ts` dev-server import, and the `/duel` headless auth precondition. See Ruling 5** |
| 22 | Clean after the broken first bash block was replaced with a single `npx tsx -e` dump |
| 23 | Clean. Forbids any "sounds good" claim, per spec §9.2 |

---

## Rulings

**Ruling 1 — Task 4 must produce exactly these seven source ids.**
Tasks 9–14 reference `kind:"sample"` layers by filename, and the union across all six tasks is
exactly seven ids: `card-flick`, `paper-slap`, `metal-clang`, `glass-shatter`, `wood-hit`,
`rope-creak`, `fire-crackle`. Task 4 Step 2 describes the *textures* in prose ("card stock
flick, felt thud, paper slap…") without fixing filenames, so a specialist choosing its own
naming would break every downstream recipe. **Decided:** Task 4 must write normalised files at
exactly those seven ids (`sources/normalised/<id>.wav`); it may add more, but those seven are
mandatory and must exist even if several come from the same upstream pack. Note the prose list
includes "felt thud", which no recipe consumes — `card-flick` covers it — so it is not a
required id. **Cost if wrong:** every recipe in Tasks 9–14 fails at `loadSample` with a
missing-file error; caught immediately, cheap to fix, but it would stall six tasks.

**Ruling 2 — unknown families are a hard failure, not a silent skip.**
`check.mjs` looks up `RMS_BANDS[family]` and `BUDGET_MS[family]`. An unlisted family made both
lookups undefined, which silently skipped the rms *and* duration checks — a whole batch could
pass unaudited. Task 9 introduces family `stamp` and Task 14 family `screens`. **Decided:**
both families are declared in Task 5's tables from the start, `checkBuffer` emits a `family`
violation when either lookup misses, and a test asserts the two tables have identical key sets.
**Cost if wrong:** none — this is strictly additive rigour.

**Ruling 3 — `recipes/index.mjs` is append-only across seven tasks.**
Tasks 3, 9, 10, 11, 12, 13 and 14 each add an import and a spread to one aggregator file.
**Decided:** each dispatch carries the instruction to preserve every existing import and
spread, adding only its own. Task 14's step verifies the final count is 101 assets, which is
the backstop if one got dropped. **Cost if wrong:** a dropped family renders nothing and
Task 14's count check or Task 20's orphan test catches it.

**Ruling 4 — Task 16's line numbers are anchors, not addresses.**
Task 8 adds one word to line 21 (no shift). Task 15 inserts roughly 15 lines before line 609,
so every Task 16 site below that point (`:726`, `:745`, `:748-754`, `:839`, `:890`, `:1427`,
`:1492`) is stale by then. **Decided:** Task 16's dispatch instructs the implementer to locate
each site by its content (the function name or state setter named in the table), using the
line numbers only as an approximate neighbourhood. The table already names the enclosing
function for every site, which is sufficient. **Cost if wrong:** an edit lands in the wrong
place; `npm run build` and the Task 21 browser audit would both catch a broken hook, though a
correctly-typed hook in the wrong place could slip through — so the Task 16 browser step is
load-bearing.

**Ruling 5 — Task 21's two assumptions are verified at Task 21, not before.**
The plan states plainly that `import("/src/lib/sfx.ts")` only works against the Vite dev
server, and that reaching `/duel` headlessly may need an auth precondition it guessed at
(a localStorage key). **Decided:** rather than stall, Task 21's implementer reads
`apps/web/src/App.tsx` and the gate logic first and substitutes the real precondition; if
module import proves unusable, the fallback is to expose `debugAudio`/`listSfx` on `window`
from the `/sfx-test` bench (a dev-only affordance) and audit through that. **Cost if wrong:**
Task 21 needs rework, and in the worst case the browser audit is weaker than specified — which
would have to be reported honestly to the user rather than papered over.

---

## Progress

**Model selection unavailable in this harness.** The `Agent` tool exposes `subagent_type` but
no model parameter, so every subagent inherits the session model. Recorded per the skill's
instruction rather than silently ignored: cost tiering (cheap model for transcription tasks,
capable model for the final review) cannot be applied here.

**Worktree decision.** No separate worktree was created. The user's 1356 lines of uncommitted
work overlapped `duel.tsx`, `shame.tsx` and `profile.tsx`, so a worktree from HEAD would have
diverged from the state the plan's line numbers cite. At the user's instruction that work was
committed as `aa62a5c` instead, giving a clean base on the existing `ionic-migration` branch.
Not main/master, so no consent gate was crossed.

### Task 1: Studio scaffold — PRNG, WAV I/O, probe render

BASE `aa62a5c`. Brief `task-1-brief.md`. Implementer reported DONE_WITH_CONCERNS, commit `5e50f99`.

**Ruling 6 — `Math.round` in `writeWav` is ACCEPTED.** The plan's verbatim code failed its own
test: `DataView.setInt16` truncates toward zero, and combined with the asymmetric scaling
(positives × `0x7fff` = 32767, read back ÷ 32768) the round-trip error reached 4.575e-5 against
a tolerance of 1/32767 ≈ 3.05e-5. The implementer fixed the implementation and left the
assertion alone, which is the correct direction — weakening the tolerance would have hidden a
real quantisation error in the foundation every later asset is rendered through. Verified
independently: 3/3 pass. **Cost if wrong:** none observed; round-to-nearest is standard.

**Ruling 7 — the canonical aggregate test command is `npm test --prefix tools/sfx-studio`.**
Node on PATH here is **v22.19.0**, not the v24 the plan assumed. On v22, `node --test <dir>`
(both with and without a trailing slash) fails with `MODULE_NOT_FOUND` — it tries to load the
directory as a module entry rather than searching it. Working forms, all verified:
`npm test --prefix tools/sfx-studio`, `node --test "tools/sfx-studio/*.test.mjs"`,
`cd tools/sfx-studio && node --test`, and explicit per-file paths.
**Task 23 Step 1's `node --test tools/sfx-studio/` is therefore broken and must be
substituted** in that dispatch. Per-file invocations in Tasks 1, 2 and 5 are unaffected.
Node 22 still supports `node --test` (stable since 20) and matches the server's stated
runtime, so no version change is warranted. **Cost if wrong:** a spurious failure in the final
gate run, which could be misread as a real regression.

**Noted, not a defect:** the implementer's `readWav` trusts the `data` chunk's size field, so a
malformed third-party WAV could throw a raw `RangeError` instead of a clear message. That is
exactly what the plan specifies, and Task 4 normalises every download through ffmpeg before
`readWav` ever sees it, so untrusted input never reaches this path. Carried as a deferred
minor for the final review.

Review package: `review-aa62a5c..5e50f99.diff`. Reviewer verdict: **Spec ✅, Task quality
Approved**, with two Important findings — both labelled plan-mandated, i.e. defects in the
plan's own verbatim code rather than in the implementation.

**Ruling 8 — fix both Important findings now, in Task 1, not later.**

*Finding 1 (`readWav` trusts chunk sizes, throws raw `RangeError` on malformed input).*
The reviewer is right that Task 4 normalises every download through ffmpeg before `readWav`
sees it, so the malformed path may never be exercised in practice. Fixing it now anyway:
downloaded third-party files are a genuine system boundary even with ffmpeg in front of them,
a raw `RangeError` with no path context is useless when debugging a batch of 14 downloads, and
deferring would make Task 4's implementer modify a file it does not own. Three small guards:
minimum file length, `data` chunk extent clamped to the real buffer, `fmt` chunk size ≥ 16.

*Finding 2 (the clamp test cannot distinguish clamping from wrapping).* Verified the
reviewer's arithmetic independently: `+3.0 × 0x7fff = 98301`, `98301 mod 65536 = 32765`, reads
back `0.99991` — passes the `> 0.99` assertion. `−3.0 × 0x8000 = −98304` wraps to exactly
`−32768` → `−1.0` — passes the `< −0.99` assertion. So an implementation with the clamp
deleted entirely would pass this test. That is the "test asserts nothing" category, and the
fix is one character per value: `±3.0` → `±2.0`, which wraps to ≈ `−0.00006` and fails.
Also tightening the assertions to exact full-scale values so the test pins the behaviour
rather than a range.

**Cost if wrong:** both fixes are additive and covered by tests, so the downside is a wasted
round. Leaving them would mean shipping a foundation whose clamping behaviour is unverified
and whose reader produces undiagnosable errors on bad input.

**Deferred minors (for the final whole-branch review to triage):**
- `Task 1: minor (deferred): NaN silently becomes digital silence in writeWav (Math.max/min
  propagate NaN, setInt16(NaN) stores 0). Downstream Task 5 check.mjs has an rms floor that
  flags an all-zero asset as "buffer is silent", so it is caught, just late and with a
  confusing message.`
- `Task 1: minor (deferred): prng test asserts determinism and range but no golden value, so
  an accidental algorithm swap in a later task would pass.`
- `Task 1: minor (deferred): brief declared writeWav => Promise<void> but the code returns
  path. Harmless doc inconsistency; the shipped signature is the one to trust.`

**Harness fallback recorded:** the `Agent` tool exposes no resume/continue parameter, so
fix-loop rounds cannot resume the original implementer as the skill prefers. Per the skill's
stated fallback, each round dispatches a fresh implementer carrying the brief path, the report
file path, and the open findings verbatim — the report file is the persistent memory.

Fix round 1 dispatched. FIX_BASE `5e50f99`.

Task 1: fix round 1/5 (2 addressed, 0 open — readWav malformed-input guards; clamp test now
discriminates clamp from wrap; commit `efad394`)
Task 1: minor (deferred): a `fmt ` chunk declaring size >= 16 in a file truncated mid-fmt-body
still throws a raw RangeError at wav.mjs:52-53. Predates the fix, was not among the three
mandated guards, and Task 4 normalises every download through ffmpeg first so the path is
unlikely to be reached. Non-blocking.
Task 1: complete (commits aa62a5c..efad394, review clean after 1 fix round)

### Task 2: DSP primitives

BASE `efad394`. Implementer reported DONE_WITH_CONCERNS, commit `8f45420`. Controller verified
independently: 19/19 across the studio suite, all 15 exports present, both authorised dead-code
removals applied, no `Math.random`. Reviewer verdict: **Spec ✅, Task quality Needs fixes** —
two Important findings, both plan-mandated (defects in the plan's verbatim code).

**Ruling 9 — fix `delay()` self-oscillation. This is the most consequential defect found so far.**
The plan's `wet = buf[i] + data[i]` then `buf[i + d] += wet * mix` feeds the delay line's own
output back into itself regardless of the `feedback` parameter, so at `mix: 1` the repeats never
decay and total loop gain becomes `mix + feedback`. The reviewer confirmed empirically: one
impulse in a 500ms buffer with `{ms: 50, feedback: 0, mix: 1}` produced nine full-amplitude
echoes. The plan's own test masked it — a 100ms buffer with a 50ms delay only fits one echo.
**Why this matters more than a primitive-level nit:** Task 3's `makeIR()` calls
`delayLine(ir, sampleRate, { ms: 11, feedback: p.diffusion, mix: 1 })` to smear early
reflections into a tail. With this bug every procedural impulse response becomes an 11ms
comb ring at unity gain, which would corrupt all four IR presets and therefore every
reverberated asset in the game — roughly 60 of the 101. **Decided:** only the dry signal
enters the line (`buf[i + d] += data[i] * mix`), and the delayed signal recirculates solely
through `feedback` (`if (feedback) buf[i + d] += buf[i] * feedback`). Requires a new test with
a buffer ≥ 3×`ms` asserting no echo at 2×`ms` when `feedback: 0`, plus an assertion on `out[0]`
so a dry double-count cannot slip through. **Cost if wrong:** a mis-set feedback path would make
reverb tails decay at the wrong rate — audible, and caught by Task 12's IR decay tests.

**Ruling 10 — `limit()` gets a post-pass hard clamp to the ceiling.** Confirmed breach: a unit
impulse of amplitude 100 with `{ceiling: -1dB, lookahead: 4}` peaks at 1.906, i.e. +5.6 dBFS
over a ceiling of 0.891, because the attack smoother moves only 60% toward the target per
sample and cannot pre-cover a transient sharper than the lookahead window. With the default
`lookahead: 64` it is exact. The spec's "Peak ≤ −1.0 dBFS" is this function's entire job, so
**decided:** add a final pass clamping every sample to `±ceiling`. Chosen over enforcing a
minimum lookahead (changes the API contract) and over documenting the limitation (not a fix).
The clamp is a safety net, not the primary mechanism — at `lookahead ≥ 16` the smoother settles
before the peak, so the clamp never engages and introduces no distortion. Requires a test at a
small lookahead asserting the ceiling holds. **Cost if wrong:** on pathological input the clamp
hard-clips a transient, which is audible distortion — strictly better than a spec breach, and
unreachable at the lookahead the renderer actually uses.

**Ruling 11 — rename `stats().duration` to `stats().samples`.** The reviewer flagged as ⚠️ that
the field returns a sample count, not seconds, and that the brief never states the units. Task 3
consumes it as `res.stats.duration / res.sampleRate * 1000`, i.e. as samples — so the behaviour
is right and only the name lies. Resolved now rather than after Task 3 exists, because no test
references the field and Task 3 is still unwritten: renaming is a one-line change with zero
blast radius today and a confusing-units bug if deferred. The Task 3 dispatch must use
`res.stats.samples`. **Cost if wrong:** none; a compile-time-visible rename.

**Deferred minors (for the final whole-branch review to triage):**
- `Task 2: minor (deferred): no NaN/invalid-parameter validation — osc with f:0 + fEnd>0 +
  glide:"exp" yields Math.pow(Infinity) -> NaN; biquadCoefs with q:0 yields NaN coefficients;
  delay with missing ms silently passes audio through. All caller errors, but a thrown Error
  would beat silent NaN in a renderer nobody listens to.`
- `Task 2: minor (deferred): brown/pink noise are practically but not provably bounded (brown's
  leaky integrator has a theoretical worst case of 3.5 for an adversarial all-ones rand
  stream). Deterministic seeded rand keeps real excursions near 0.8; a comment would help
  recipe authors in Tasks 9-14.`
- `Task 2: minor (deferred): applyEnv's exp curve silently clamps negative levels to the 1e-4
  floor with no error or comment saying levels must be >= 0.`
- `Task 2: minor (deferred): test gaps in the brief-mandated suite — panGain, tri/saw/square,
  biquad types other than lowpass, cutoff automation via fEnd, glide:"lin", and delay feedback
  are all unexercised.`
- `Task 2: minor (deferred): osc integrates phase before evaluating, so sample 0 is
  sin(2*pi*f/SR + phase*2*pi) rather than sin(phase*2*pi). Cosmetic; no recipe depends on it.`

Fix round 1 dispatched. FIX_BASE `8f45420`.

Task 2: fix round 1/5 (3 addressed, 0 open — delay self-oscillation, limiter ceiling breach,
stats.samples rename; commit `7bdf91d`). Re-reviewer traced every new test against the OLD
buggy implementation to confirm each genuinely discriminates: the feedback-0 test fails on old
code (`buf[d]=buf[2d]=buf[3d]=1`), the decay test fails on old loop gain `mix+feedback=1.4`
(`1, 1.4, 1.96, 2.744` is not strictly decreasing), and the limit test fails without the clamp
(smoother reaches only 40.5% of target gain at i=0, so `out[0]=40.53`).
Task 2: minor (deferred): the clamp-pass comment at dsp.mjs:200 claims "at lookahead >= 16 this
never engages", which is false for an impulse at index 0 (no pre-roll) — the clamp does engage
and is what produces the reported 0.89125. Documentation-only; behaviour is correct. Fix the
comment if anything else touches that function.
Task 2: complete (commits efad394..7bdf91d, review clean after 1 fix round)

**Carried into Task 3 (Ruling 11):** `render.mjs` must read `res.stats.samples`, not
`res.stats.duration` — the field was renamed in `7bdf91d`. Task 3's plan text still shows the
old name.

**Carried into Task 3 (Ruling 9 consequence, positive):** `makeIR()`'s diffusion call
`delayLine(ir, sampleRate, { ms: 11, feedback: p.diffusion, mix: 1 })` now behaves as designed.
Under the old bug it would have produced an 11ms unity-gain comb ring in all four IR presets;
with the fix, `feedback` is the actual decay per 11ms period (`hall` 0.35, `plate` 0.55,
`metal` 0.15, `cathedral` 0.45). Task 3's IR decay tests are therefore meaningful.

### Task 3: FFT convolution, IR presets, recipe renderer + CLI

BASE `7bdf91d`. Implementer reported DONE_WITH_CONCERNS, commit `69296d4`. Controller verified:
29/29 across the studio suite, all four amendments applied, zero `.duration` field reads, zero
`Math.random`.

**Ruling 12 — the brief's `makeIR` was wrong; the implementer's rewrite is ACCEPTED.**
The plan's version computed `dur = Math.min(seconds, p.decay * 1.6)` and then *padded* the
buffer by `preDelayMs`. Both broke the plan's own tests: for `seconds: 1.0`, `metal`
(decay 0.5) truncated to 0.8s so `ir.length` was 35280 not 44100; `hall` grew to 44894 by the
same padding; and at `seconds: 3.0` hall (2.88s) and cathedral (3.0s) were near-identical so
the "cathedral outlasts hall by >1.4x" assertion could not pass. The implementer diagnosed all
three and rewrote it so the buffer is **always exactly `seconds`**, `p.decay` sets the envelope
fall time rather than the length, and pre-delay shifts content right *within* the fixed buffer.
Preset tuning table kept verbatim. Measured hall 1.815s vs cathedral 3.010s = 1.66x. Correct
call, and fixing the recipe rather than loosening the assertions was the right direction.

**Carried into Task 7 (consequence of Ruling 12):** the browser-side `makeIrBuffer()` in
`sfx.ts` must mirror `ir.mjs` **as landed**, not the plan's original code. The plan's Task 7
version allocates `pre + tail` and uses `Math.pow(1 - t, p.decay)`; the landed studio version
allocates exactly `seconds`, uses `applyEnv` with an exponential breakpoint at `p.decay`, then
hp/lp biquads, an 11ms diffusion delay mixed 0.6/0.4, and normalises to −6 then −3 dB. If the
two diverge, the browser's live reverb will not match what the assets were designed against.
`Math.random()` is acceptable browser-side (a live IR needs no determinism) but the *shape*
must match.

**Ruling 13 — render DRY; reverb is applied live in the browser. This supersedes spec §4's
implicit assumption and resolves a conflict with spec §5.2.**
`render.mjs:125-135` convolves the dry mix with an IR and bakes the result into the shipping
asset. But the manifest carries per-cue `reverb` and `reverbIR` fields, and Task 7's browser
graph feeds every voice through a send into a live `ConvolverNode`. Both cannot be right: as
planned, every reverberated cue (roughly 60 of 101) would receive its tail **twice** — once
baked, once live. **Decided:** the renderer emits dry audio by default. `recipe.reverb` stays
in the recipe format as the designer's statement of intent and drives a new `--wet` flag for
auditioning previews, but shipping renders never bake. The manifest's `reverb`/`reverbIR`
become the single runtime authority.

Why dry rather than baked:
- Correctness — eliminates the double tail.
- Spec §9.2 mitigation 3 promises "every mix parameter lives in one manifest, so 'make the
  stamp quieter' is a one-number change, not a re-render". Baked reverb breaks that promise
  for the wettest parameter in the mix; live reverb keeps it.
- Assets shrink substantially (no 3.2s tails), which buys headroom against the 16MB budget.
- `check.mjs`'s duration budget then measures the dry transient, which is what actually has to
  fit inside the animation beat. A live tail bleeding past the beat is natural and inaudible as
  an error; a baked one is not.

**Cost if wrong:** recipe `reverb` blocks and manifest `reverb` values must agree by hand, and
nothing enforces that automatically — a cue could be designed for `cathedral` and shipped
sending to `hall`. Mitigation: Task 22's `docs/sfx-sets.md` records both columns side by side
so the disagreement is visible, and the `/sfx-test` bench lets the user hear it immediately.
This is a real residual risk and is reported to the user in Task 23.

Review package: `review-7bdf91d..69296d4.diff`. Reviewer verdict: **Spec ✅, Task quality
Approved** with one Important finding (import-time side effects making `renderRecipe`
unimportable) plus Minors. Reviewer independently confirmed the Ruling 12 diagnosis against the
brief's original code and verified the four IR preset tunings were **not** retuned to make a
test pass (field-by-field against the brief). Controller resolved the reviewer's ⚠️ item: no
`build/` or `apps/web/assets/sfx/` directory exists and the tree holds only the user's
pre-existing untracked files — no artifact leaked.

Task 3: fix round 1/5 (6 addressed, 0 open — entry guard + opts threading, dry-by-default per
Ruling 13, dead imports, SilenceLayer typedef, accurate multi-target header, normalizeTo
ceiling clamp; commit `0df4952`, 8 new tests in render.test.mjs, suite 37/37). Re-reviewer
traced every new test against the pre-fix code to confirm each discriminates, and separately
verified the Windows entry-guard semantics under path-casing variance.

**Ruling 14 — fix the brittle `DEFAULT_OUT` assertion now; it is load-bearing for Task 9.**
The re-review found that `render.test.mjs:49` asserts `stat(DEFAULT_OUT)` *rejects*, i.e. that
`apps/web/assets/sfx` does not exist. That is true today and becomes false the moment Task 9
renders and commits the first asset batch — at which point the studio suite fails permanently
for a legitimate tree state, blocking Tasks 9–14 and every later gate run. Real and
load-bearing, so it is fixed in this loop rather than parked. **Decided:** the test must
capture the directory's pre-import state and then assert the import created no new `.wav`,
rather than asserting non-existence; and the defaults test must render into a `mkdtemp` dir,
asserting default-directory *resolution* by comparing the `res.path` string, so no probe ever
lands in the shipping assets directory. **Cost if wrong:** a suite that fails for the wrong
reason from Task 9 onward, which would waste a debugging cycle at best and get "fixed" by
weakening an assertion at worst.

Task 3: minor (deferred): the entry-point guard at render.mjs:252 compares
`import.meta.url` to `pathToFileURL(process.argv[1])`; invoking through a symlink or junction
would make the CLI silently no-op, because Node resolves the entry to its realpath while
argv[1] keeps the link path. Not reachable in the current layout.
Task 3: minor (deferred): CLI flag style is inconsistent — `--keepSilence` is camelCase while
`--only`/`--family`/`--clean`/`--wet` are lowercase. Cosmetic, predates the fix round.

Fix round 2 dispatched. FIX_BASE `0df4952`.

Task 3: fix round 2/5 (2 addressed, 0 open — import-side-effects test now snapshots tree state
instead of asserting absence; defaults test relocated to mkdtemp; commit `adbee64`).
Re-reviewer verified numerically that dry-by-default is genuinely constrained: the probe recipe
renders dry = 0.0449s vs wet = 0.6118s, so the `< 0.5` assertion discriminates and flipping
`wet` to true fails two independent tests.

**Ruling 15 — accept the `DEFAULT_OUT` coverage gap; do not extract a helper.** The reviewer
corrected the controller's own framing: `main()` always calls
`renderRecipe(r, { outDir: targetOf(r) })`, so the bare `DEFAULT_OUT` leg at `render.mjs:115`
is reachable only by a library caller passing neither `opts.outDir` nor `recipe.outDir` — the
CLI does not cover it either. Accepted anyway, on the reviewer's reasoning: the failure mode is
loud (`dest` would be `undefined` → `mkdir(undefined)` throws TypeError on first call), and the
`DEFAULT_OUT` *constant* is exercised on every no-`--out` run and printed in the render header,
so Task 9 surfaces a wrong path in its very first invocation before any asset is committed.
Extracting a pure `resolveDest(recipe, opts)` is a source change forbidden in a test-only round
and would cost a full extra loop for a one-link expression that cannot fail quietly.
**Revisit at the final whole-branch review** together with the three nits below.
**Cost if wrong:** a silent mis-target of shipping assets — judged unreachable, and Task 9 is
the first real exercise.

Task 3: minor (deferred): the import-side-effects snapshot compares only `.wav` names plus
directory existence, so it would miss an overwrite of an already-present name (post-Task 9,
`click.wav` will exist), a non-`.wav` artifact, or a size/mtime change. A directory created
without a `.wav` IS caught, and a `--clean` wipe IS caught. Cheap hardening: snapshot all
entries with size+mtimeMs.
Task 3: minor (deferred): test 1 depends on being the first importer of the memoised module
promise; if a test calling `loadRenderModule()` were ever added above it, test 1 degrades to a
no-op that still passes. One-line fix: assert the memo is undefined at the top of test 1.
Task 3: minor (deferred): test 2's title still advertises "default dir" and its comment claims
the bare call exercises the full `opts.outDir ?? recipe.outDir ?? DEFAULT_OUT` chain, when it
reaches only the first two links. Misleading about what is covered.
Task 3: complete (commits 7bdf91d..adbee64, review clean after 2 fix rounds)

### Task 4: CC0 source pipeline and provenance

BASE `adbee64`. Implementer reported DONE, commit `c672a99`. Controller verified independently:
all seven mandatory ids exist at the exact contracted paths, 1.45 MB normalised vs 12 MB raw,
`provenance.json` has exactly 7 entries and **zero non-CC0 licenses**, suite 37/37, tree clean.
Sourced from Kenney (card-flick, metal-clang, wood-hit) and OpenGameArt CC0 (paper-slap,
glass-shatter, rope-creak, fire-crackle). No substitutes had to be synthesized.

**Ruling 16 — commit `sources/normalised/`, keep `sources/raw/` gitignored.** The plan gitignored
both. That is wrong for `normalised/`: those seven files are the inputs every recipe in Tasks
9–14 loads by filename, and the Kenney zip URLs are signed per-run (`download-link/<hex>` plus a
Referer), so the committed provenance URLs are pack *pages*, not re-downloadable files. As
planned, a fresh clone could not re-render a single asset — the studio would be buildable only
on this machine. `normalised/` is 1.45 MB across 7 files, which is trivial next to the 150.7 MB
already in `public/musics/`. `raw/` stays ignored at 12 MB: it is as-downloaded originals,
needed only for re-normalising, and provenance records where each came from.
**Cost if wrong:** 1.45 MB of binary in git history permanently. Accepted deliberately — the
alternative is a renderer that cannot be run by anyone else.

**Deferred to Task 9+ (noted, not a defect):** `rope-creak` is a tree-trunk fibre creak, not
actual rope, because the implementer reports no CC0 rope recording exists. It is used for
`trick-exec-rope` (the guillotine's rope slack) and `trick-exec-strain`. A dry fibre creak under
tension is a reasonable stand-in and will be pitched/filtered in the recipe, but if the
executioner's mechanical beat sounds wrong on audition, this is the first asset to suspect.

Also noted: the raw `glass-shatter` peaks above 1.0 float; the normalised output is
true-peak-limited to 0.77 by the `loudnorm=TP=-2` stage, so nothing downstream clips.

Review package: `review-adbee64..c672a99.diff`. Reviewer dispatched.


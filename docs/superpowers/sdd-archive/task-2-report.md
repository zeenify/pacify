# Task 2 Report: DSP primitives

**Status:** DONE_WITH_CONCERNS (concerns are documentation-level only; all tests pass)
**Commit:** `8f45420` — feat(sfx-studio): DSP primitives — osc, noise, env, biquad, delay, pitch, limiter

## What was implemented

- `tools/sfx-studio/dsp.mjs` — the full synthesis toolkit, transcribed verbatim from the brief with the two authorized dead-code removals (see below). Exports: `osc`, `noise`, `applyEnv`, `biquad`, `shape`, `delay`, `pitch`, `panGain`, `limit`, `normalize`, `trimSilence`, `mixInto`, `stats`, `dbToLin`, `linToDb`. No extra helpers, no module split, no I/O, no module-level mutable state, no `Math.random()` (all randomness flows through the injected `rand`).
- `tools/sfx-studio/dsp.test.mjs` — the brief's test file, byte-identical (verified by `diff` against the brief's code block).

### Authorized deviations from the brief's code (both applied exactly as instructed)

1. `delay()`: removed the no-op `out[i] = data[i] + wet * 0;` from the first pass and moved the `const out = new Float32Array(data.length)` allocation down to just before the second pass. First pass now only accumulates into `buf`. The `delay adds an echo at the right offset` test passes (ok 11).
2. `applyEnv()`: removed the redundant trailing `if (t > points[points.length - 1][0]) { v = points[points.length - 1][1]; }` inside the segment loop — `v` is already initialized to that value before the loop.

A mechanical `diff` of the committed `dsp.mjs` against the brief's code block shows **only** these two changes and nothing else.

## TDD evidence

### RED

Command: `node --test tools/sfx-studio/dsp.test.mjs` (run after writing only the test file, before `dsp.mjs` existed)

Relevant output:

```
#   code: 'ERR_MODULE_NOT_FOUND',
#   url: 'file:///C:/Users/EDRICK/Desktop/pacify/tools/sfx-studio/dsp.mjs'
# }
# Node.js v22.19.0
# Subtest: tools\\sfx-studio\\dsp.test.mjs
not ok 1 - tools\\sfx-studio\\dsp.test.mjs
...
# tests 1
# pass 0
# fail 1
```

Why expected: the test file imports `./dsp.mjs`, which did not exist yet — exactly the failure mode the brief's Step 2 predicts (`Cannot find module './dsp.mjs'`; Node 22 reports this as `ERR_MODULE_NOT_FOUND` with the resolved URL of `dsp.mjs`).

### GREEN

Command: `node --test tools/sfx-studio/dsp.test.mjs` (after writing `dsp.mjs`)

```
ok 1 - osc sine at 440Hz has the right period and stays in range
ok 2 - osc exponential glide reaches fEnd
ok 3 - noise colours differ and all stay bounded
ok 4 - applyEnv exponential decay is monotonic and hits the floor
ok 5 - biquad lowpass attenuates highs and passes lows
ok 6 - limit holds the ceiling
ok 7 - normalize hits the target
ok 8 - trimSilence removes leading silence (the <5ms rule)
ok 9 - mixInto places a layer at an offset without clipping
ok 10 - pitch raises pitch and shortens duration
ok 11 - delay adds an echo at the right offset
ok 12 - shape applies the transfer function
ok 13 - db helpers round-trip
# tests 13
# pass 13
# fail 0
```

No iteration was needed — the implementation passed on the first run after transcription.

### Full studio suite (Task 1 regression check)

Command: `npm test --prefix tools/sfx-studio`

```
1..19
# tests 19
# pass 19
# fail 0
```

19 = 13 dsp tests + 6 `wav.test.mjs` tests from Task 1. Task 1 not regressed; `prng.mjs`, `wav.mjs`, `wav.test.mjs`, and `package.json` untouched (confirmed via `git status` — the commit contains only the two new files; `dependencies`/`devDependencies` remain empty).

## Files changed

- `tools/sfx-studio/dsp.mjs` (new, committed)
- `tools/sfx-studio/dsp.test.mjs` (new, committed)

Nothing else staged or modified. Nothing under `.superpowers/` staged. No asset files written, `apps/web/` untouched.

## Self-review findings

- Diffed both committed files against the brief's code blocks with `diff`: test file byte-identical; `dsp.mjs` differs only by the two authorized removals. All load-bearing constants verified present verbatim: RBJ coefficient sets, Paul Kellet pink coefficients (0.99886/0.0555179 … 0.115926, ×0.11 output scale), brown integration constants (0.02 / 1.02 / ×3.5), envelope `FLOOR = 1e-4`, limiter smoothing `0.6` / `0.002`, `Math.SQRT2` in `panGain`.
- Purity: every export returns a new `Float32Array` except `mixInto`, which is in-place **by design** per the brief's interface list ("in-place additive mix, clipping-safe") and mutates only the `dest` argument passed by the caller.
- Note on `osc`'s first sample: phase is integrated *before* the waveform evaluation, so sample 0 is `sin(2πf/SR)` rather than `sin(phase)`. This is inherent to the brief's code as written (the `phase` parameter acts as a pre-offset, not the value at i=0). Tests pass and behaviour is deterministic; left unchanged per instructions to use the brief's code verbatim.

## Concerns

1. **Brief's test count is off by one:** Step 4 says "PASS — 14 tests", but the brief's own test file contains 13 `test()` blocks. Actual result: 13/13 pass. Nothing is missing from my transcription (byte-identical diff); the "14" in the brief is a miscount — possibly a dropped `panGain` test during drafting.
2. **`panGain` is exported but untested** by the brief's suite. Task 3 imports the export list, and `panGain` is trivial (two lines), so this is low risk, but it joins tri/saw/square as uncovered surface. Flagged, not fixed, per instructions.
3. **Oscillator waveform formulas:** per instruction I reviewed but did not change them. I found no defect — the tri formula `4*|u − floor(u+0.75) + 0.25| − 1` does produce a proper 0→1→0→−1→0 cycle, and the saw `2*(u − floor(u+0.5))` is a valid ±1 sawtooth phase-shifted by half a cycle relative to the sine (starts at −1 ramping up through 0 at u=0.5 rather than starting at 0). The phase offset is cosmetic for SFX use and matches what the controller pre-verified. No silent fixes made.

---

# Task 2 Fix Report: review findings 1–3 (new commit on top of `8f45420`)

**Status:** DONE
**Scope:** three controller-ruled review findings. No other changes; the deferred Minor findings were NOT touched.

## What was changed

### Finding 1 — `delay()` self-oscillation at `feedback: 0` (dsp.mjs, `delay`)

Applied the reviewer's fix exactly: only the dry signal enters the delay line, scaled by `mix`; the delayed signal recirculates solely through `feedback`. The now-meaningless `wet` variable was removed.

```js
for (let i = 0; i < data.length; i++) {
  // only the dry signal enters the delay line (scaled by mix); the delayed
  // signal recirculates solely through feedback
  buf[i + d] += data[i] * mix;
  if (feedback) buf[i + d] += buf[i] * feedback;
}
```

Tests added (`dsp.test.mjs`):
- `delay at feedback:0 produces exactly one echo, never repeats` — 500 ms buffer (10× the 50 ms delay), single impulse, `feedback: 0, mix: 1`: echo present at 1×ms, absent (< 0.01) at 2×ms and 3×ms.
- `delay feedback repeats decay strictly` — same buffer, `feedback: 0.4`: echo present at 2×ms and `e1 > e2 > e3 > e4` strictly.
- Existing `delay adds an echo at the right offset` gained `assert.equal(out[0], 1, ...)` — dry at index 0 must equal the dry input exactly (no double-count). The rest of that test is unchanged and still passes.

### Finding 2 — `limit()` ceiling breach at small `lookahead` (dsp.mjs, `limit`)

Per ruling: added a final safety pass hard-clamping every output sample to `±ceiling`, after the smoothing loop. The attack/release constants `0.6`/`0.002` are untouched; the API contract is unchanged.

```js
// final safety pass: on transients sharper than the lookahead can pre-cover
// (small lookahead), the attack smoother cannot reach the target in time —
// hard-clamp every sample to ±ceiling. At lookahead >= 16 this never engages.
for (let i = 0; i < n; i++) {
  if (out[i] > ceiling) out[i] = ceiling;
  else if (out[i] < -ceiling) out[i] = -ceiling;
}
```

Test added: `limit holds the ceiling even with a tiny lookahead` — a 64-sample buffer with a single sample of amplitude 100, limited at `{ceiling: dbToLin(-1), lookahead: 4}`; asserts peak ≤ ceiling. Same assertion repeated with the default `lookahead: 64`. The pre-existing `limit holds the ceiling` test (lookahead 64) is unchanged and still passes.

### Finding 3 — `stats().duration` naming (dsp.mjs, `stats`)

Renamed the field to `samples` and added a clarifying comment (`// \`samples\` is the buffer length in samples (not seconds)`). Grep confirmed nothing else in `dsp.mjs`, `dsp.test.mjs`, `wav.mjs`, `wav.test.mjs`, or `prng.mjs` read `.duration` (the only other hit was the word "duration" inside a test *name*).

## Empirical reproduction (evidence)

Single impulse in a 500 ms buffer through `delay(d, SR, {ms: 50, feedback: 0, mix: 1})`; amplitude printed at 50/100/150/200 ms.

**Before fix** (infinite non-decaying repeats — the reviewer's observation, reproduced):

```
delay pre-fix  amp at 50ms = 1
delay pre-fix  amp at 100ms = 1
delay pre-fix  amp at 150ms = 1
delay pre-fix  amp at 200ms = 1
```

**After fix** (exactly one echo):

```
delay post-fix  amp at 50ms = 1
delay post-fix  amp at 100ms = 0
delay post-fix  amp at 150ms = 0
delay post-fix  amp at 200ms = 0
```

Amplitude-100 impulse (64-sample buffer) through `limit(..., {ceiling: dbToLin(-1), lookahead: 4})`, peak of output (ceiling = 0.8912509381337456):

**Before fix:** `peak (lookahead 4) = 40.534751892089844` (the attack smoother at i=0 only reaches 0.4053 of the way to the target gain, so out[0] = 100 × 0.4053; same defect class as the reviewer's 1.906 case, sharper here because the impulse sits at index 0 with zero pre-roll).

**After fix:**

```
limit post-fix  peak (lookahead 4) = 0.8912509083747864   (<= ceiling; float32 rounding)
limit post-fix  peak (lookahead 64) = 0.8912509083747864
stats fields = peak,peakDbfs,rms,rmsDbfs,samples
```

## Test runs (exact commands)

1. `node -e "import('./dsp.mjs')..."` repro scripts (run from `tools/sfx-studio`) — outputs above, pre- and post-fix.
2. `npm test --prefix tools/sfx-studio`:

```
ok 1 - osc sine at 440Hz has the right period and stays in range
ok 2 - osc exponential glide reaches fEnd
ok 3 - noise colours differ and all stay bounded
ok 4 - applyEnv exponential decay is monotonic and hits the floor
ok 5 - biquad lowpass attenuates highs and passes lows
ok 6 - limit holds the ceiling
ok 7 - limit holds the ceiling even with a tiny lookahead
ok 8 - normalize hits the target
ok 9 - trimSilence removes leading silence (the <5ms rule)
ok 10 - mixInto places a layer at an offset without clipping
ok 11 - pitch raises pitch and shortens duration
ok 12 - delay adds an echo at the right offset
ok 13 - delay at feedback:0 produces exactly one echo, never repeats
ok 14 - delay feedback repeats decay strictly
ok 15 - shape applies the transfer function
ok 16 - db helpers round-trip
ok 17 - writeWav/readWav round-trips a sine within 16-bit quantisation
ok 18 - writeWav clamps out-of-range floats instead of wrapping
ok 19 - readWav rejects a file shorter than 12 bytes
ok 20 - readWav rejects a fmt chunk declaring size < 16
ok 21 - readWav rejects a data chunk that extends past end of file
ok 22 - prng is deterministic for a seed and differs across seeds
1..22
# tests 22
# pass 22
# fail 0
```

22 = 16 dsp tests (13 original + 3 new) + 6 Task 1 tests. Task 1 (`wav.test.mjs`, `prng.mjs`) not regressed and not modified.

## Constraints honoured

- No `Math.random()` introduced; no new dependencies (`package.json` untouched).
- All functions remain pure; `mixInto` left as the one in-place exception.
- No assertion weakened — the existing delay test gained an assertion and otherwise runs unchanged; the smoothing constants 0.6/0.002 untouched.
- Minor findings deliberately NOT addressed. (Opinion, not action: none of them rise to "serious" — the NaN-validation gap is the closest, since a bad recipe param in Tasks 9–14 would render silent/corrupt WAVs rather than throw, but the Task 5 quality gate would catch it.)
- Staged only `tools/sfx-studio/dsp.mjs` and `tools/sfx-studio/dsp.test.mjs` by explicit name; nothing under `.superpowers/` staged. New commit on top of `8f45420`, no amend/rewrite.

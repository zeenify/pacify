# Task 1 Report — Studio scaffold: PRNG, WAV I/O, end-to-end probe render

**Status:** DONE_WITH_CONCERNS
**Commit:** `5e50f99` — `feat(sfx-studio): scaffold — seeded PRNG, WAV I/O, end-to-end probe` (branch `ionic-migration`, parent `aa62a5c`)
**Test summary:** 3/3 passing, output pristine (via both explicit path and the `package.json` `test` script).

---

## What I implemented

Created `tools/sfx-studio/` from nothing as a plain-Node ESM script directory (NOT a workspace — `tools/` correctly stays out of the root `workspaces` array; `dependencies`/`devDependencies` left empty as instructed).

- **`prng.mjs`** — `prng(seed) => () => number` (mulberry32, floats in `[0,1)` via `/2^32`), plus `range(rand, lo, hi)`. Verbatim from the brief. This is the determinism mechanism every later task depends on.
- **`wav.mjs`** — `makeBuffer(seconds, sampleRate=44100)`, `writeWav(path, buf)` (16-bit PCM mono, clamps to `[-1,1]`), `readWav(path)` (chunk-walking reader that throws clear errors on any non-PCM / non-mono / non-16-bit input). Byte layout, quantisation constants, and reader all verbatim from the brief — **except one bug fix** (see Deviation below).
- **`wav.test.mjs`** — 3 tests. Verbatim **minus the two dead-code lines** in the prng test (`const a = ...` and `void a;`) per ambiguity resolution #1.
- **`package.json`** — `@pacify/sfx-studio`, `type: module`, scripts `test`/`render`/`check`/`smoke`, empty deps. Verbatim.
- **`.gitignore`** — `build/`, `sources/raw/`, `sources/normalised/`. Committed per ambiguity resolution #2.
- **`probe.mjs`** — throwaway end-to-end probe. Created, run (evidence below), then **deleted** in Step 7 and **never committed**, per ambiguity resolution #3.

House style followed: ESM, `node:`-prefixed imports, `HERE` anchoring via `fileURLToPath` (in the probe), matching sibling `tools/motion/encode.mjs`.

---

## TDD evidence

### RED #1 — Step 2, before any implementation existed
Command: `node --test tools/sfx-studio/wav.test.mjs`
```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module
  'C:\Users\EDRICK\Desktop\pacify\tools\sfx-studio\wav.mjs'
  imported from ...\tools\sfx-studio\wav.test.mjs
  code: 'ERR_MODULE_NOT_FOUND'
not ok 1 - tools\sfx-studio\wav.test.mjs
# tests 1  # pass 0  # fail 1     (exit code 1)
```
**Why expected:** the test imports `./wav.mjs` and `./prng.mjs`, which did not exist yet, so the test module cannot even load. This is exactly the failure the brief's Step 2 predicts (`Cannot find module './wav.mjs'`).

### Intermediate failure — Step 4, first run with the brief's VERBATIM implementation
Command: `node --test tools/sfx-studio/wav.test.mjs`
```
not ok 1 - writeWav/readWav round-trips a sine within 16-bit quantisation
  error: 'quantisation error too large: 0.000045746564865112305'
ok 2 - writeWav clamps out-of-range floats instead of wrapping
ok 3 - prng is deterministic for a seed and differs across seeds
# tests 3  # pass 2  # fail 1     (exit code 1)
```
The brief's Step 4 predicted "PASS — 3 tests", but test 1 failed. I diagnosed it (see Deviation) rather than shipping a red suite.

**Root cause (verified empirically, inline, no files created):** `DataView.setInt16` **truncates toward zero** — it does not round:
```
setInt16(16383.5)  -> 16383    (truncate, not 16384)
setInt16(-16383.5) -> -16383   (truncate toward zero)
threshold 1/32767 = 0.00003051850947599719
maxErr truncate   = 0.00004575298022724272   FAIL
maxErr round      = 0.000030390707068395084  PASS
```
Truncation adds up to ~1 LSB of error on top of the write(`0x7fff`)/read(`32768`) asymmetry on the positive half, pushing the round-trip error to `4.575e-5` — above the test's own `1/32767 ≈ 3.052e-5` tolerance. The brief's code assumed `setInt16` rounds; it does not.

### GREEN — Step 4, after the rounding fix
Command: `node --test tools/sfx-studio/wav.test.mjs`
```
ok 1 - writeWav/readWav round-trips a sine within 16-bit quantisation
ok 2 - writeWav clamps out-of-range floats instead of wrapping
ok 3 - prng is deterministic for a seed and differs across seeds
1..3
# tests 3  # suites 0  # pass 3  # fail 0     (exit code 0)
```
Also re-verified from the final committed state via the package script (`cd tools/sfx-studio && node --test`): 3/3 pass, exit 0 — confirms `package.json`'s `test` script discovers `*.test.mjs` for later tasks.

### End-to-end probe — Step 5
Command: `node tools/sfx-studio/probe.mjs`
```
probe.wav  sr=44100  frames=11025  dur=250.0ms
  peak -7.57 dBFS   rms -19.39 dBFS
PROBE OK            (exit code 0)
```
Proves synthesise → write → read → measure works end to end. Peak `-7.57 dBFS` is well under the `-1.0 dBFS` ceiling (0.891 linear). Output file was 22094 bytes = 44-byte header + 11025×2 samples (correct). `probe.mjs` and the `build/` scratch dir were then deleted (Step 7); neither is committed.

---

## Deviation from the brief (the one intentional change)

`wav.mjs` `writeWav` quantisation line. Brief verbatim:
```js
v.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
```
Shipped:
```js
// Math.round is required: DataView.setInt16 truncates toward zero, which
// adds up to ~1 LSB of extra error and breaks the round-trip tolerance.
v.setInt16(44 + i * 2, Math.round(s < 0 ? s * 0x8000 : s * 0x7fff), true);
```
**Rationale:** the brief's own Step 4 requires this test to pass, and the test assertion (`maxErr < 1/32767`) is the spec — I was instructed not to change test assertions or the quantisation constants. The minimal fix that satisfies both is round-to-nearest during the float→int16 conversion (the standard way to quantise). **Every specified value is preserved:** constants `0x8000`/`0x7fff`/`32768`, the WAV header byte layout, the chunk-walking reader, and all test assertions are unchanged. `Math.round` is pure/deterministic, so the byte-identical-re-render guarantee (sha256) later tasks rely on still holds. No assets have shipped yet, so there is no backward-compat concern with the changed bytes.

---

## Files changed (commit `5e50f99`, 5 files, 146 insertions)
- `tools/sfx-studio/.gitignore` (new)
- `tools/sfx-studio/package.json` (new)
- `tools/sfx-studio/prng.mjs` (new)
- `tools/sfx-studio/wav.mjs` (new)
- `tools/sfx-studio/wav.test.mjs` (new)

`probe.mjs` created then deleted, never staged. `build/` never staged (gitignored). Pre-existing untracked files (`.zcode/`, `vibe_videos/`, `tools/motion/pelican.*`) left untouched and NOT staged — only the 5 files above were committed. Working tree for `tools/sfx-studio/` is clean.

---

## Self-review findings
- Header byte layout re-checked field by field against the RIFF/WAVE PCM spec: all offsets/sizes correct for 16-bit mono.
- `readWav` builds its `DataView` with `raw.byteOffset`/`raw.byteLength` — correct and important, since Node `Buffer`s share a pooled `ArrayBuffer`; ignoring `byteOffset` would mis-parse.
- Chunk walk is word-aligned (`off += 8 + size + size%2`); encoding/channel/bit-depth guards give clear errors as required for third-party inputs.
- `makeBuffer` uses `Math.max(1, ceil(...))` so a zero/near-zero duration still yields a valid ≥1-sample buffer.
- Round-trip introduces no leading silence (it faithfully reproduces whatever the caller puts in `data`; `makeBuffer` zero-fills but that is the caller's content to overwrite). The <5ms rule is a content concern for later render tasks, not something this I/O layer adds.

## Concerns
1. **(Non-blocking) Reader trusts the `data` chunk `size` field.** `n = Math.floor(dataLen/2)`; a malformed third-party WAV with an overstated data size would make `getInt16` throw a raw `RangeError` instead of one of the clear custom errors. Fine for well-formed files (our writer, ffmpeg). Left as specified (brief says don't redesign the reader), but the later task that ingests downloaded sources may want a `dataOff + dataLen <= byteLength` guard.
2. **(Informational) Probe peak vs brief estimate.** Brief estimated peak ≈ `-3.1 dBFS`; actual `-7.57 dBFS` because the `exp(-t*18)` envelope decay and the 220/660 Hz component phase reduce the true peak. Still clears the `-1.0 dBFS` gate — `PROBE OK`. The estimate was rough, not a defect.
3. **(Informational) Node version.** Context said Node v24 on PATH; the machine has v22.19.0. `node --test` behaves identically here (verified) — no impact. `setInt16` truncation semantics are spec-defined and identical across versions, so the RED/rounding finding is not version-specific.
4. **(Flag for controller) The deviation above.** I changed one line from the brief's verbatim code to make the brief's own predicted-passing test actually pass. If the controller prefers the literal verbatim line, the alternative is loosening the test tolerance — but I was explicitly told not to change test assertions, so I fixed the implementation instead.

---

# Fix Report — review findings 1 & 2 (new commit, `5e50f99` untouched)

**Status:** DONE
**Scope:** two Important, plan-mandated findings from review. No refactors, no Minor findings touched, `prng.mjs` untouched, all pre-existing error messages preserved verbatim, quantisation constants (`0x8000`, `0x7fff`, `32768`) unchanged.

## Finding 1 — `readWav` malformed-input guards

Added exactly three guards to `tools/sfx-studio/wav.mjs` `readWav`, per the controller's ruling (throw, do not clamp — Task 4's provenance log must distinguish "bad source" from "fine"):

1. `if (raw.byteLength < 12) throw new Error(`${path}: too short to be a WAV`)` — first statement after `readFile`, before `tag(0)` can raise a raw `RangeError`.
2. `if (size < 16) throw new Error(`${path}: fmt chunk too small`)` — fires the moment a `fmt ` chunk is encountered, before any field is read from bytes that may not belong to it.
3. `if (dataOff + dataLen > raw.byteLength) throw new Error(`${path}: data chunk extends past end of file`)` — after the existing fmt/data validation chain (so pre-existing errors keep their precedence), before the sample loop; replaces the raw `RangeError` from `getInt16` on a lying `data` size.

Nothing else in `readWav`/`writeWav` changed (verified by `git diff`: the `wav.mjs` diff is exactly these three added lines).

### New covering tests (`wav.test.mjs`, following existing `mkdtemp`/`rm` style)

Malformed inputs are hand-built with `DataView`/`Buffer` via a small in-test helper `wavHeaderBytes({ fmtSize, dataSize, totalBytes })` and written to a temp dir (`readWav` takes a path):

- `readWav rejects a file shorter than 12 bytes` — writes an 8-byte `RIFFabcd` buffer; asserts exact message `${p}: too short to be a WAV` via `assert.rejects`.
- `readWav rejects a fmt chunk declaring size < 16` — header with `fmtSize: 12`; asserts `${p}: fmt chunk too small`.
- `readWav rejects a data chunk that extends past end of file` — 44-byte file whose `data` chunk claims 1000 bytes; asserts `${p}: data chunk extends past end of file`.

(The test file gained one import: `writeFile` from `node:fs/promises`.)

## Finding 2 — clamp test now discriminates

Changed the clamp test input from ±3.0 to ±2.0 and tightened the assertions from loose bounds (`> 0.99` / `< -0.99`) to exact full-scale values:

```js
buf.data[0] = 2.0; buf.data[1] = -2.0;
assert.equal(back.data[0], 32767 / 32768, ...);   // exact positive full scale
assert.equal(back.data[1], -1, ...);              // exact negative full scale
```

This is a strict tightening, not a weakening: exact equality on the clamped output, plus input values whose ToInt16 wrap lands nowhere near full scale (+2.0*0x7fff = 65534 wraps to -2 → -0.00006103515625; -2.0*0x8000 = -65536 wraps to 0).

### Discrimination proof (clamp removed → FAIL, clamp restored → PASS)

**Observation A — clamp temporarily removed** (`const s = Math.max(-1, Math.min(1, data[i]))` → `const s = data[i];`), command `node --test tools/sfx-studio/wav.test.mjs`:

```
not ok 2 - writeWav clamps out-of-range floats instead of wrapping
  error: |-
    expected exact positive full scale, got -0.00006103515625
    + actual - expected
    + -0.00006103515625
    - 0.999969482421875
  code: 'ERR_ASSERTION'
# tests 6  # pass 5  # fail 1     (exit code 1)
```

+2.0 wrapped to `-0.00006103515625` exactly as the reviewer predicted — the test genuinely fails without the clamp.

**Observation B — clamp restored**, same command:

```
1..6
# tests 6
# suites 0
# pass 6
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 127.6136
```

Also verified via the package script: `npm test --prefix tools/sfx-studio` → 6/6 pass, fail 0, exit 0. `git diff` after restoration shows `wav.mjs` contains only the three guard lines relative to `5e50f99` — the clamp line is byte-identical to the committed version.

## Commands run

- `node --test tools/sfx-studio/wav.test.mjs` (full suite, clamp in place: 6/6 pass)
- `node --test tools/sfx-studio/wav.test.mjs` (clamp removed: fail 1 — Observation A)
- `node --test tools/sfx-studio/wav.test.mjs` (clamp restored: 6/6 pass — Observation B)
- `npm test --prefix tools/sfx-studio` (6/6 pass)

## Files changed in the fix commit

- `tools/sfx-studio/wav.mjs` — three guard lines added to `readWav`; nothing else.
- `tools/sfx-studio/wav.test.mjs` — clamp test fixed (±2.0, exact assertions); three new malformed-input tests; `wavHeaderBytes` test helper; `writeFile` import added.

Staged by explicit name only; nothing under `.superpowers/` staged; pre-existing untracked files (`.zcode/`, `vibe_videos/`, `tools/motion/pelican.*`) untouched.

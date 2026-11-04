# Task 3 Report: FFT convolution, IR presets, recipe renderer + CLI

Status: DONE_WITH_CONCERNS (concerns are documentation/count discrepancies in the brief, not functional issues)

## What was implemented

- `tools/sfx-studio/fft.mjs` — `nextPow2`, in-place iterative radix-2 `fft` (bit-reversal + butterfly exactly as the brief specifies), and frequency-domain `convolve` returning `input.length + ir.length - 1` samples. Verbatim from the brief.
- `tools/sfx-studio/ir.mjs` — `makeIR` with the four preset tunings verbatim (`hall` 1.8/6500/120/18/0.35, `plate` 0.9/9000/200/4/0.55, `metal` 0.5/12000/900/0/0.15, `cathedral` 3.2/4200/80/32/0.45) and `IR_PRESETS`. Two recipe fixes were required (see "IR recipe fixes" below). Removed the brief's unused `import { convolve } from "./fft.mjs"` (dead drafting import; ir.mjs never convolves).
- `tools/sfx-studio/render.mjs` — `renderRecipe` (layer sizing -> dry mix -> reverb send via `makeIR`+`convolve` -> master gain -> `limit(dbToLin(-1), lookahead 64)` -> `normalize` -> `trimSilence` unless `--keepSilence`, in that order) plus the CLI (`--only`, `--family`, `--out`, `--keepSilence`, new `--clean`). The normative `Recipe` JSDoc typedef is in this file, with `outDir?: string` added.
- `tools/sfx-studio/recipes/ui.mjs` — the `click` recipe, layer parameters verbatim from the brief.
- `tools/sfx-studio/recipes/index.mjs` — `RECIPES = [...ui]` with the commented-out family imports kept as the checklist for Tasks 9–14.
- `tools/sfx-studio/convolve.test.mjs` — the brief's test file verbatim.

### Controller-directed amendments applied to render.mjs

1. `res.stats.samples` used (never `.duration`); the console row computes ms as `(res.stats.samples / res.sampleRate) * 1000`. The dead ternary from the brief was deleted. Grep for `.duration` across all new files: zero matches.
2. `clean: { type: "boolean", default: false }` added; `rm(values.out, ...)` only runs under `--clean`. `mkdir` always runs.
3. Per-recipe `outDir` honoured: in `main()` via `r.outDir ? resolve(REPO, r.outDir) : values.out`, and inside `renderRecipe` for programmatic callers via `opts.outDir ?? (recipe.outDir ? resolve(REPO, recipe.outDir) : DEFAULT_OUT)`. `outDir?: string` added to the `@typedef Recipe`. No `outDir` set on the `click` recipe (nothing needs it yet).
4. `statSync` imported statically at top of file (`node:fs`); the dynamic `await import("node:fs")` inside the loop is gone.

### IR recipe fixes (test failures diagnosed as brief defects, per controller guidance)

The brief's `makeIR` code fails its own tests on the merits:

- `const dur = Math.min(seconds, p.decay * 1.6)` made metal 0.8s at `seconds: 1.0` (test asserts length exactly 44100 for all four presets), and at `seconds: 3.0` produced hall 2.88s vs cathedral 3.0s — the >1.4x outlast test was arithmetically impossible.
- The pre-delay `padded` array grew the IR beyond `seconds*sampleRate` (hall: 44894 != 44100).

Fixes, keeping the preset table verbatim:

- `dur = seconds` always; the exponential envelope now runs `[[0, 1], [p.decay, 0]]`, so `decay` controls how fast the tail falls instead of clamping buffer length. Metal is silent after ~0.5s; cathedral is still ringing at buffer end. Decay and outlast tests now pass on the merits (measured under the test's fixed seed: hall tail 1.815s, cathedral tail 3.010s, ratio 1.66 > 1.4).
- Pre-delay shifts the IR right within the fixed-length buffer (tail past the end discarded), preserving `ir.length === seconds*sampleRate`.

## TDD evidence

RED — `node --test tools/sfx-studio/convolve.test.mjs` (before writing implementation):

```
#   code: 'ERR_MODULE_NOT_FOUND',
#   url: 'file:///C:/Users/EDRICK/Desktop/pacify/tools/sfx-studio/fft.mjs'
not ok 1 - tools\sfx-studio\convolve.test.mjs
# tests 1
# pass 0
# fail 1
```

Failed for the expected reason: `Cannot find module './fft.mjs'`.

Intermediate RED (after writing fft.mjs/ir.mjs verbatim from the brief, before the IR fixes): tests 1–5 passed; test 6 failed (metal length 35280 != 44100, hall padded to 44894) and test 7 failed with `cathedral (3.033469387755102s) should outlast hall (2.8966213151927436s) by >1.4x` — exactly the brief-defect diagnosis above.

GREEN — `node --test tools/sfx-studio/convolve.test.mjs` (after fixes):

```
ok 1 - nextPow2
ok 2 - convolving with a unit impulse is the identity
ok 3 - convolving with a delayed impulse delays the signal
ok 4 - convolution matches the naive O(n*m) reference
ok 5 - fft round-trips
ok 6 - all four IR presets render, decay, and stay bounded
ok 7 - cathedral IR outlasts hall IR
# tests 7
# pass 7
# fail 0
```

NOTE: the brief's prose says "8 tests" (and the controller brief repeated it), but the brief's own verbatim test file contains exactly 7 `test()` calls. I implemented the file verbatim; the count in the prose is wrong. Suite total is therefore 29, not 30.

## Full studio suite (no regressions)

`npm test --prefix tools/sfx-studio`:

```
# tests 29
# pass 29
# fail 0
```

22 pre-existing (16 dsp + 6 wav) + 7 new = 29. Zero failures.

## Step 5 CLI proofs

Family render: `node tools/sfx-studio/render.mjs --family ui --out tools/sfx-studio/build/probe-out`

```
rendering 1 recipe(s) -> tools/sfx-studio/build/probe-out
  click                        45ms  peak   -3.0dB  rms  -13.8dB   2 layers      4KB  (18ms)
total 0.00 MB
EXIT=0
```

Peak -3.0 dB, 2 layers, total 0.0x MB as expected.

Missing recipe: `node tools/sfx-studio/render.mjs --only nonexistent`

```
no recipes matched --only nonexistent
available: click (ui)
EXIT=1
```

Determinism (sha256): rendered `--family ui` into `build/determinism` and `build/determinism2`, then the brief's hash-compare one-liner:

```
DETERMINISTIC OK
EXIT=0
```

Default-out run: `node tools/sfx-studio/render.mjs --only click` wrote `apps/web/assets/sfx/click.wav`; read-back via `readWav`: 44100 Hz, 1980 samples (44.9 ms), peak 0.7079 (-3.0 dBFS). Proof artifacts (`tools/sfx-studio/build/`, `apps/web/assets/sfx/`) were deleted afterwards to keep the tree clean — Task 9 owns rendering/committing real assets.

## Files changed (committed)

- `tools/sfx-studio/fft.mjs` (new)
- `tools/sfx-studio/ir.mjs` (new)
- `tools/sfx-studio/render.mjs` (new)
- `tools/sfx-studio/recipes/index.mjs` (new)
- `tools/sfx-studio/recipes/ui.mjs` (new)
- `tools/sfx-studio/convolve.test.mjs` (new)

Nothing under `.superpowers/` staged. `package.json` untouched (dependencies still empty). No `Math.random` anywhere (grep-verified).

## Self-review findings

- Verified all four controller amendments landed (grep for `stats.samples`, `values.clean`, `recipe.outDir`, static `statSync` — all present; zero `.duration` reads).
- The brief's render.mjs imports `readFile`, `makeBuffer`, `shape` which are currently unused. Kept verbatim (no linter in tools/, and later recipe tasks may wire a `shape` field); flagged here for the reviewer.
- `renderRecipe` reads module-level `values.keepSilence` (CLI state) inside a library function — the brief specifies it this way; programmatic callers get the default (trim). Noted, not changed.
- `convolve` allocates five Float64Arrays of the padded pow2 length; for a 3.2s IR + short dry at 44.1kHz that is n=262144, trivial. Render of `click` takes ~20–60ms.
- IR diffusion uses Task 2's corrected `delay()` semantics; decay tests pass on the merits as predicted.

## Concerns

1. Test count discrepancy: brief prose says 8 tests / controller expected suite of 30; the brief's verbatim test file has 7, so the suite is 29. No test was invented to pad the count.
2. The `makeIR` semantics change (fixed-length buffer, `decay` = envelope fall time, in-place pre-delay shift) deviates from the brief's code — but the brief's code provably fails its own tests, and the controller's brief pre-authorized treating IR-recipe failure as an IR-recipe bug. The preset tuning table itself is verbatim.
3. If the runtime ConvolverNode IR builder (spec §5.2, a later task) mirrors the brief's original code rather than this fixed version, browser and rendered assets would disagree — whoever implements the runtime side must mirror `tools/sfx-studio/ir.mjs` as landed here.

---

# Task 3 Fix Round Report (on top of 69296d4)

Scope: the reviewer's Important finding, the controller's dry-render ruling, and Minors 3-6 folded in. `fft.mjs`, `ir.mjs`, `dsp.mjs`, `wav.mjs`, `prng.mjs` and all pre-existing test files were NOT touched (the two deferred fft/ir Minors stay as-is). Files changed: `tools/sfx-studio/render.mjs` (modified), `tools/sfx-studio/render.test.mjs` (new).

## What changed

1. **Important — render.mjs importable.** `parseArgs` moved out of module scope into `parseCli()`, called only from `main()`. Top-level `main()` now fires only when the file is the entry point: `if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)`. `pathToFileURL` added to the existing `node:url` import (no new dependency). `renderRecipe` no longer reads the module-level `values` — signature is now `renderRecipe(recipe, { outDir, keepSilence = false, wet = false } = {})`; all three defaults work, so a bare `renderRecipe(recipe)` renders to the default dir, trims silence, dry. `main()` threads `keepSilence`/`wet` from CLI values into `opts`.
2. **Controller ruling — DRY by default.** New `--wet` CLI flag (`wet: { type: "boolean", default: false }`) and `wet` opt. The reverb-send branch runs only when `wet && recipe.reverb && recipe.reverb.send > 0`; default renders skip convolution entirely. `recipe.reverb` stays in the typedef and format (designer intent / manifest source / preview input) — nothing deleted. Header line appends `(WET PREVIEW — not for shipping)` under `--wet`. Comment at the branch explains why: the runtime applies reverb live from the manifest through a ConvolverNode send; baking would double every tail. Inner variable renamed `wet` -> `wetBuf` to avoid shadowing the new opt.
3. **Dead imports removed:** `readFile` (node:fs/promises), `makeBuffer` (wav.mjs), `shape` (dsp.mjs).
4. **`SilenceLayer` added to the normative typedef** — `{ kind: "silence", dur: number, at?: number }`, included in the Recipe layers union, with a one-line doc (spacer: extends the render without emitting audio; counted in sizing, skipped in mix). Branch kept.
5. **Header accuracy + --clean comment.** The "rendering N recipe(s) -> X" header now lists every distinct destination (`new Set` over per-recipe targets), so a recipe writing to its own `outDir` is not hidden behind `values.out`. Comment added: `--clean` wipes only `--out`, never per-recipe `outDir` targets (silently deleting e.g. apps/web/assets/audio would be worse). `--clean` behaviour unchanged.
6. **Normalise clamp.** Named constant `MASTER_CEILING_DBFS = -1` now drives both the limiter ceiling and a clamp on `normalizeTo`: a recipe asking above the ceiling is clamped to it and a `console.warn` names the recipe. No bare `-1`.

## Covering tests (new file `tools/sfx-studio/render.test.mjs`, 8 tests)

- import exports `renderRecipe` without running the CLI (asserts default out dir was not created by the import)
- bare `renderRecipe(recipe)` honours all three defaults (default dir, trimmed, dry — duration < 0.5s despite the probe recipe declaring a plate reverb)
- dry is default: wet render is longer (assert > dry + 0.1s of IR tail) and sha256-different
- determinism: same recipe rendered twice (wet path, which exercises makeIR+convolve) is byte-identical
- `opts.keepSilence` reaches the library: leading 100ms gap survives with it, is trimmed without
- `normalizeTo: 0` is clamped: peak <= -1 dBFS and exactly one warning naming the recipe
- `normalizeTo: -3` passes through unclamped, zero warnings (asserts the clamp is not over-eager)
- silence layer extends sizing (~0.35s with keepSilence) and is not counted in `layers`

## Verification outputs

1. `npm test --prefix tools/sfx-studio`:
   ```
   # tests 37
   # pass 37
   # fail 0
   ```
   (29 pre-existing + 8 new; zero regressions.)

2. Determinism proof (brief Step 5, re-run after changes):
   ```
   node tools/sfx-studio/render.mjs --family ui --out tools/sfx-studio/build/determinism
   node tools/sfx-studio/render.mjs --family ui --out tools/sfx-studio/build/determinism2
   node -e "<brief's sha256 compare one-liner>"
   -> DETERMINISTIC OK   (EXIT=0)
   ```
   Both runs: `click  45ms  peak -3.0dB  rms -13.8dB  2 layers  4KB`.

3. Dry-vs-wet comparison. Approach: **temporarily added `reverb: { preset: "plate", send: 0.2 }` to the `click` recipe in `recipes/ui.mjs` itself**, rendered both ways, then restored the recipe via Edit and verified `git diff --quiet 69296d4 -- tools/sfx-studio/recipes/ui.mjs` -> "ui.mjs IDENTICAL TO COMMITTED". `click` ships with no reverb declaration, as required.
   ```
   node tools/sfx-studio/render.mjs --only click --out tools/sfx-studio/build/dry-check
   node tools/sfx-studio/render.mjs --only click --wet --out tools/sfx-studio/build/wet-check
   ```
   Header lines: `rendering 1 recipe(s) -> ...dry-check` vs `rendering 1 recipe(s) -> ...wet-check  (WET PREVIEW — not for shipping)`.
   ```
   dry: 0.045s sha256=2f7e255e5f81c6b885e6329ca11b3f282f12cea1da4b9518ed7b469c4d3c1cb0
   wet: 0.612s sha256=b039b7827492c84f30d5b911c1395cb438dd593df8d4f078e72e9797f6f1cdaf
   DRY IS SHORTER OK / HASHES DIFFER OK
   ```
   Dry 45ms/4KB vs wet 612ms/53KB (plate tail truncated by trimSilence at -50dB; no 3.2s tail in either — and none at all in the shipping dry path).

4. Import-does-not-run-CLI proof. Throwaway `tools/sfx-studio/import-probe.mjs` imported `renderRecipe` and was run **with deliberately unrecognized flags** (`node tools/sfx-studio/import-probe.mjs --bogus-flag --only whatever`) — module-scope strict `parseArgs` would have thrown:
   ```
   typeof renderRecipe = function
   process.argv[1] = C:\Users\EDRICK\Desktop\pacify\tools\sfx-studio\import-probe.mjs
   default out dir exists after import: false
   EXIT=0
   ```
   Confirmed no files created: `apps/web/assets` still lists only `13students_assets/ audio/ musics/` (no `sfx/`), and `find apps/web -name "*.wav" -newer ...` returned nothing. Throwaway deleted afterwards.

5. `node tools/sfx-studio/render.mjs --only nonexistent`:
   ```
   no recipes matched --only nonexistent
   available: click (ui)
   EXIT=1
   ```

6. Final `git status --short` (before commit; untracked `.zcode/`, `tools/motion/pelican*`, `vibe_videos/` are pre-existing and not mine):
   ```
    M tools/sfx-studio/render.mjs
   ?? .zcode/
   ?? tools/motion/pelican.test.mjs
   ?? tools/motion/src/pelican.css
   ?? tools/motion/src/pelican.html
   ?? tools/motion/src/pelican.js
   ?? tools/sfx-studio/render.test.mjs
   ?? vibe_videos/
   ```
   No `.wav`, no `build/`, no `apps/web/assets/sfx/` left behind. `tools/sfx-studio/package.json` untouched (dependencies still empty). No `Math.random` introduced.

## Commit

Staged by explicit name: `tools/sfx-studio/render.mjs`, `tools/sfx-studio/render.test.mjs`. New commit on top of `69296d4` (see git log for SHA). Nothing under `.superpowers/` staged.

---

# Task 3 Re-Review Fix Report (commit adbee64, on top of 0df4952)

Scope: the two re-reviewer findings in `tools/sfx-studio/render.test.mjs` — test-only. `render.mjs`, `fft.mjs`, `ir.mjs`, `dsp.mjs`, `wav.mjs`, `prng.mjs` and every other test file were NOT touched. The deferred Minors (entry-guard symlink edge, `--keepSilence` flag style, fft `n === 0`, ir pre-delay RangeError) were left alone. New commit `adbee64`; `0df4952` not amended.

## Item 1 (Important) — import-side-effect test no longer asserts DEFAULT_OUT non-existence

**What changed.** The static `import { renderRecipe } from "./render.mjs"` was replaced with a memoised dynamic loader (`loadRenderModule()`, evaluated exactly once). Test 1 now:

1. Snapshots `DEFAULT_OUT` state BEFORE the import via `outDirSnapshot()` — `{ existed, wavs: sorted .wav filenames }` (empty list if the dir does not exist).
2. Mutates `process.argv` to append `--definitely-not-a-render-flag`, then performs the dynamic `import()`.
3. Restores `process.argv` in a `finally` block so the mutation cannot leak into other tests in the file.
4. Asserts `typeof mod.renderRecipe === "function"`, then re-snapshots and asserts `existed` is unchanged and the `.wav` listing is deep-equal to the snapshot.

Tests 2–8 each obtain `renderRecipe` via the same memoised loader (node:test runs top-level tests sequentially in declaration order, so test 1 is guaranteed to be the importer).

**Why it still fails against pre-fix code (69296d4 render.mjs — verified via `git show`).** Pre-fix, `parseArgs` was module-scope and strict (`render.mjs:50`) and `main()` ran unconditionally at module evaluation (`render.mjs:191`). Two independent failure paths, both caught:
- The bogus flag makes strict module-scope `parseArgs` throw during module evaluation → the `import()` rejects → the test errors out. (Even without the bogus flag, node --test's own runner flags would throw for the same reason.)
- If argv were permissive, pre-fix `main()` would render `click.wav` into `DEFAULT_OUT` (the `--out` default) — the post-snapshot would then show either a newly-existing directory or a changed `.wav` listing, failing the deep-equal/existence assertions.
Post-fix neither fires: `parseArgs` lives in `parseCli()`, called only from `main()`, and `main()` runs only when the file is the entry point (guard at `render.mjs:252` — argv[1] is the test file, not render.mjs, so the guard is false regardless of the appended flag). The test is not weakened into passing either way: it pins the exact side-effect-free-import property, and it now holds for ANY legitimate tree state of `apps/web/assets/sfx` (absent, empty, or full of committed assets).

## Item 2 (Minor) — defaults test no longer writes into the shipping assets dir

**What changed.** Test 2 now points its render at a `mkdtemp` dir and calls `renderRecipe(recipe)` BARE — zero opts — with `outDir: dir` set on the recipe itself. Reconciliation note: the re-review suggested "point at mkdtemp via the `outDir` option" while the fix directive required keeping the bare-no-opts property; `recipe.outDir` satisfies both — the call still exercises the `= {}` opts-defaulting AND the full dest-resolution chain `opts.outDir ?? (recipe.outDir ? resolve(REPO, recipe.outDir) : DEFAULT_OUT)` (`render.mjs:115`), and `resolve(REPO, <absolute tmp path>)` returns the tmp path. Default-dir resolution is asserted as a pure string comparison `res.path === join(dir, "defaults-probe.wav")` — writes nothing outside tmp. (Comparing `res.path` against `join(DEFAULT_OUT, ...)` literally would require an actual render into the shipping dir, which the hard constraint forbids; the DEFAULT_OUT fallback leg of the chain is the same one-line expression the tmp leg proves.) The old `try/finally` cleanup against `DEFAULT_OUT` and the `preExisting` stat dance are gone — nothing to clean up outside the suite's tmp root.

**Kept intact (the actual fix proof):** `durS < 0.5` (dry despite the probe recipe declaring `reverb: { preset: "plate", send: 0.2 }`) and `|peakDbfs − (−3)| < 0.01` (trimmed + normalised to the recipe target).

**Why it still fails against pre-fix code.** Pre-fix, the reverb branch ran whenever `recipe.reverb && recipe.reverb.send > 0` (pre-fix `render.mjs:127`) — there was no `wet` opt — so the bare render baked the plate tail: measured 0.612s in the fix-round dry-vs-wet proof, i.e. `durS < 0.5` fails. Independently, pre-fix `renderRecipe` read `values.keepSilence` from module-scope CLI state, and pre-fix the module could not even be imported under `node --test` (module-scope strict `parseArgs` throws on runner flags), so the whole file failed. The `res.path` comparison alone would pass pre-fix (the resolution chain is identical) — as the re-reviewer noted, that is fine because the dry/duration assertions carry the proof, and they were not weakened.

## Verification outputs

**1. Full suite (`npm test --prefix tools/sfx-studio`, Node v22.19.0):**
```
# tests 37
# suites 0
# pass 37
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 811.4274
```
Render tests specifically: `ok 24 - importing render.mjs exports renderRecipe without running the CLI`, `ok 25 - bare renderRecipe(recipe) honours defaults: default dir, trimmed, DRY`, `ok 26..31` for the other six. No regressions (8 render + 7 convolve + 16 dsp + 6 wav + prng/wav remainder = 37).

**2. Future-tree-state proof (the whole point of the fix).** Created `apps/web/assets/sfx/` containing `task9-preview-dummy.wav`, re-ran the suite:
```
ok 24 - importing render.mjs exports renderRecipe without running the CLI
ok 25 - bare renderRecipe(recipe) honours defaults: default dir, trimmed, DRY
# tests 37
# pass 37
# fail 0
```
Then deleted the dummy file and the directory. `ls apps/web/assets` → `13students_assets/ audio/ musics/` (no `sfx/`). Cleanup confirmed by `git status --short` at the time:
```
 M tools/sfx-studio/render.test.mjs
?? .zcode/
?? tools/motion/pelican.test.mjs
?? tools/motion/src/pelican.css
?? tools/motion/src/pelican.html
?? tools/motion/src/pelican.js
?? vibe_videos/
```

**3. No test writes into `apps/web/assets/sfx` any more.** Grep for `DEFAULT_OUT` in `render.test.mjs` — every remaining use is a read or a string:
```
11:const DEFAULT_OUT = join(REPO, "apps", "web", "assets", "sfx");   <- constant definition
28:    await stat(DEFAULT_OUT);                                       <- read (snapshot)
32:  const entries = await readdir(DEFAULT_OUT);                      <- read (snapshot)
84:    `import of render.mjs changed the existence of the default out dir (${DEFAULT_OUT})`,  <- assertion message
96:  // full dest-resolution chain (opts.outDir ?? recipe.outDir ?? DEFAULT_OUT) ...          <- comment
```
No `renderRecipe` call targets it; test 2's render goes to the mkdtemp dir.

**4. Final `git status --short` (after commit adbee64):**
```
?? .zcode/
?? tools/motion/pelican.test.mjs
?? tools/motion/src/pelican.css
?? tools/motion/src/pelican.html
?? tools/motion/src/pelican.js
?? vibe_videos/
```
Only the user's pre-existing untracked files. No artifacts, nothing under `.superpowers/` staged.

## Commit

`adbee64` — `test(sfx-studio): make render tests independent of apps/web/assets/sfx tree state`. Staged by explicit name (`tools/sfx-studio/render.test.mjs` only). New commit on top of `0df4952`; nothing amended or rewritten. No `Math.random()` introduced (no randomness at all in the new code).

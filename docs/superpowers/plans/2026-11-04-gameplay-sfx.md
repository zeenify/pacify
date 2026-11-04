# PACIFY Gameplay Sound Design — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give every gameplay beat in PACIFY a designed sound — ~110 cues across the duel's full reveal choreography plus the rest of the app — replacing today's single `playCardPop()`.

**Architecture:** Two parallel tracks joined by one contract. Track A builds an offline renderer at `tools/sfx-studio/` (plain `.mjs`, DSP in JS, ffmpeg for source decoding) that emits 16-bit mono WAVs. Track B rebuilds `apps/web/src/lib/sfx.ts` from four `HTMLAudioElement` singletons into an `AudioContext` voice pool driven by `sfx-manifest.ts`, with `duel-cues.ts` mapping each `SeqStep` to a pre-scheduled cue timeline. The manifest is the contract: Track B can be built and tested entirely against the four existing WAVs before a single new asset lands.

**Tech Stack:** Node ESM `.mjs`, `ffmpeg-static` 6.1 (already a root devDep), `puppeteer-core` (already a root dep), vitest 3 (already hoisted to root `.bin`), Web Audio API, Ionic React 9 + Vite 8.

**Spec:** [docs/superpowers/specs/2026-11-04-gameplay-sfx-design.md](../specs/2026-11-04-gameplay-sfx-design.md) — the plan argues from the spec; read both. Spec §7 (the cue table) is normative for every offset.

## Global Constraints

Copied verbatim from the spec. Every task's requirements implicitly include these.

- **CC0 sources only.** No CC-BY, no attribution-required licenses (spec §4.3).
- **≤ 16 MB** total and **≤ 110 asset files** in `apps/web/public/sfx/`, **~110 cue names** (spec §4.4, §5.5). For scale, `public/musics/` already carries 150.7 MB — this budget exists for preload speed and mix discipline, not repo weight.
- **16-bit PCM mono.** 44.1 kHz default; 22.05 kHz permitted for sub-heavy cues with no bright content (spec §4.4).
- **Peak ≤ −1.0 dBFS. Leading silence < 5 ms. ≥ 2 layers per asset** (spec §9.1a). Head silence is a *timing bug*, not a nicety — the runtime schedules by offset.
- **No `Math.random()` in the studio without the seeded PRNG.** Re-rendering must produce byte-identical WAVs (spec §4.2).
- **Preserve all existing `sfx.ts` exports** — thirteen modules import them (spec §3.1). Legacy files re-render **at identical paths**.
- **24-voice hard cap**, per-cue `maxVoices` default 8, `cooldownMs` on tick-like cues (spec §5.4).
- **Never construct the real `AudioContext` at module scope.** Create/decode in `initSfx()`, `resume()` in `unlockSfx()` (spec §3.2).
- **ffmpeg is a node module, not on PATH.** Import `{ ffmpegPath, run, probeDuration }` from `../motion/encode.mjs`; never shell out to a bare `ffmpeg` (spec §11).
- **No audio dependency may be added to `apps/web`.** Studio-only deps live in `tools/sfx-studio/package.json`, and none are expected (spec §4.3).
- **Plain git blobs, not LFS** (spec §4.4).
- **Dirty working tree:** 20 tracked files are modified-but-uncommitted, including `duel.tsx` and `duel-keyframes.ts`. Every line number in this plan is against that modified state. **Never** `git checkout`/`restore`/`reset`/`clean`. Stage files by explicit name; never `git add -A` or `git add .` (spec §11).
- **Nobody can hear the result.** No task may claim "sounds good". Completion claims are limited to what the objective gates measured (spec §9.2).

## File Structure

```
tools/sfx-studio/                  TRACK A — offline renderer (ESM .mjs, not typechecked)
  package.json                         studio-only deps; "render" / "check" / "smoke" scripts
  prng.mjs                             mulberry32 seeded PRNG
  wav.mjs                              float32 buffer <-> 16-bit PCM mono WAV
  dsp.mjs                              osc, noise, biquad, env, shape, delay, IR, FFT
                                       convolution, pitch, limiter, normalise, trimSilence
  sources.mjs                          CC0 download -> ffmpeg normalise -> provenance.json
  recipes/index.mjs                    aggregates every family module into one list
  recipes/ui.mjs  table.mjs  clash.mjs  score.mjs  round.mjs
  recipes/trick-void.mjs  trick-echo.mjs  trick-eclipse.mjs  trick-ward.mjs
  recipes/trick-reversal.mjs  trick-exec.mjs  trick-oracle.mjs
  render.mjs                           CLI: all, or --only <name>, --family <f>
  check.mjs                            objective gate -> build/check-report.md
  smoke.mjs                            headless puppeteer audit (Task 21)
  sources/provenance.json              url, author, license, date, sha256 per download
  sources/raw/                         as-downloaded           (gitignored)
  sources/normalised/                  44.1k mono float wavs   (gitignored)

apps/web/src/lib/                  TRACK B — runtime (TypeScript, typechecked by npm run build)
  sfx.ts                               REWRITTEN — AudioContext engine + BGM (BGM section kept)
  sfx-manifest.ts                      NEW — the contract: cue name -> src + mix params
  duel-cues.ts                         NEW — pure SeqStep -> CueEvent[] timeline

apps/web/
  vitest.config.ts                     NEW — include: ["test/*.test.ts"]
  test/sfx-manifest.test.ts            NEW — integrity gate (Task 6)
  test/duel-cues.test.ts               NEW — timeline unit tests (Task 8)
  src/screens/sfx-test.tsx             REBUILT — full audition bench (Task 18)
  src/screens/duel.tsx                 MODIFIED — driver hook + event beats (Tasks 15, 16)
  src/lib/bgm.ts                       MODIFIED — /duel, /sfx-test, /gate (Task 17)

apps/web/assets/sfx/                 rendered source of truth (existing repo convention)
apps/web/public/sfx/                 served copy
docs/sfx-sets.md                     NEW — cue -> asset -> provenance -> animation beat
music-sets.md                        MODIFIED — add the /duel route
```

**Why the split.** The studio is a build tool judged by `check.mjs`; the runtime is app code
judged by `tsc` and vitest. They share nothing but filenames, which is exactly why they can
be built in parallel and why a reviewer can reject one track's output without touching the
other.

**Testing the studio.** `tools/` is not typechecked and has no test framework, so the studio
uses Node's built-in runner — `node --test tools/sfx-studio/`. Node 24 is on PATH; no new
dependency. Every studio task below is TDD against that.

**A note on the render tasks (10–13).** Those tasks specify *design parameters* — layer
lists, frequencies, envelope shapes, durations, and which sourced sample fills which role —
rather than 75 verbatim recipe files. That is deliberate, not a gap: the recipes are the
specialist's deliverable and must be iterated against `check.mjs`, and Task 3 Step 3 plus
Task 9 Step 1 write three complete exemplar recipes that establish the pattern the rest
follow. Every number in spec §7 is binding.

---

# TRACK A — The offline studio

Tasks 1–5 build the renderer. Tasks 10–13 use it to author assets. **Track A and Track B are
independent and may run in parallel from Task 6 onward** — the only thing they share is the
set of filenames in `sfx-manifest.ts`.

### Task 1: Studio scaffold — PRNG, WAV I/O, end-to-end probe render

Proves the whole path (synthesise → write → read back → measure) before any real asset is
authored. Renders to a scratch dir; **ships nothing**.

**Files:**
- Create: `tools/sfx-studio/package.json`
- Create: `tools/sfx-studio/prng.mjs`
- Create: `tools/sfx-studio/wav.mjs`
- Test: `tools/sfx-studio/wav.test.mjs`
- Create: `tools/sfx-studio/probe.mjs`

**Interfaces:**
- Consumes: nothing — this is the foundation.
- Produces:
  - `prng(seed: number) => () => number` — returns floats in `[0,1)`, deterministic per seed.
  - `makeBuffer(seconds: number, sampleRate?: number) => { sampleRate: number, data: Float32Array }` — `sampleRate` defaults to `44100`.
  - `writeWav(path: string, buf: { sampleRate, data }) => Promise<void>` — 16-bit PCM mono.
  - `readWav(path: string) => Promise<{ sampleRate: number, data: Float32Array }>` — chunk-walking, handles 16-bit PCM mono; throws a clear error on any other encoding.

- [ ] **Step 1: Write the failing test**

`tools/sfx-studio/wav.test.mjs`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { makeBuffer, writeWav, readWav } from "./wav.mjs";
import { prng } from "./prng.mjs";

test("writeWav/readWav round-trips a sine within 16-bit quantisation", async () => {
  const dir = await mkdtemp(join(tmpdir(), "sfx-"));
  try {
    const sr = 44100;
    const buf = makeBuffer(0.05, sr);
    for (let i = 0; i < buf.data.length; i++) buf.data[i] = Math.sin((2 * Math.PI * 440 * i) / sr) * 0.5;
    const p = join(dir, "sine.wav");
    await writeWav(p, buf);
    const back = await readWav(p);
    assert.equal(back.sampleRate, sr);
    assert.equal(back.data.length, buf.data.length);
    let maxErr = 0;
    for (let i = 0; i < buf.data.length; i++) maxErr = Math.max(maxErr, Math.abs(back.data[i] - buf.data[i]));
    assert.ok(maxErr < 1 / 32767, `quantisation error too large: ${maxErr}`);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test("writeWav clamps out-of-range floats instead of wrapping", async () => {
  const dir = await mkdtemp(join(tmpdir(), "sfx-"));
  try {
    const buf = makeBuffer(0.001, 44100);
    buf.data[0] = 3.0; buf.data[1] = -3.0;
    const p = join(dir, "hot.wav");
    await writeWav(p, buf);
    const back = await readWav(p);
    assert.ok(back.data[0] > 0.99, `expected near +1, got ${back.data[0]}`);
    assert.ok(back.data[1] < -0.99, `expected near -1, got ${back.data[1]}`);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test("prng is deterministic for a seed and differs across seeds", () => {
  const a = Array.from({ length: 8 }, () => 0).map((_, i) => [prng(42), i]);
  const r1 = prng(42), r2 = prng(42), r3 = prng(43);
  const s1 = Array.from({ length: 5 }, () => r1());
  const s2 = Array.from({ length: 5 }, () => r2());
  const s3 = Array.from({ length: 5 }, () => r3());
  assert.deepEqual(s1, s2, "same seed must give the same stream");
  assert.notDeepEqual(s1, s3, "different seeds must diverge");
  for (const v of s1) { assert.ok(v >= 0 && v < 1, `out of range: ${v}`); }
  void a;
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test tools/sfx-studio/wav.test.mjs`
Expected: FAIL — `Cannot find module './wav.mjs'`

- [ ] **Step 3: Write the implementation**

`tools/sfx-studio/prng.mjs`:

```js
/* mulberry32 — small, fast, seedable. Every random choice in a recipe MUST come
   from here so re-rendering produces byte-identical WAVs (spec §4.2). */
export function prng(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Convenience: a float in [lo, hi]. */
export function range(rand, lo, hi) {
  return lo + (hi - lo) * rand();
}
```

`tools/sfx-studio/wav.mjs`:

```js
import { writeFile, readFile } from "node:fs/promises";

/** Mono float32 buffer. `data` values are nominal [-1, 1]. */
export function makeBuffer(seconds, sampleRate = 44100) {
  return { sampleRate, data: new Float32Array(Math.max(1, Math.ceil(seconds * sampleRate))) };
}

export async function writeWav(path, buf) {
  const { sampleRate, data } = buf;
  const n = data.length;
  const bytes = 44 + n * 2;
  const ab = new ArrayBuffer(bytes);
  const v = new DataView(ab);
  const str = (off, s) => { for (let i = 0; i < s.length; i++) v.setUint8(off + i, s.charCodeAt(i)); };
  str(0, "RIFF");
  v.setUint32(4, bytes - 8, true);
  str(8, "WAVE");
  str(12, "fmt ");
  v.setUint32(16, 16, true);      // PCM fmt chunk size
  v.setUint16(20, 1, true);       // 1 = PCM
  v.setUint16(22, 1, true);       // mono
  v.setUint32(24, sampleRate, true);
  v.setUint32(28, sampleRate * 2, true);  // byte rate: sr * channels * bytes/sample
  v.setUint16(32, 2, true);       // block align
  v.setUint16(34, 16, true);      // bits per sample
  str(36, "data");
  v.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) {
    const s = Math.max(-1, Math.min(1, data[i]));
    v.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  await writeFile(path, Buffer.from(ab));
  return path;
}

/** Walks chunks rather than assuming a 44-byte header — real-world WAVs from
    ffmpeg and from library downloads carry LIST/JUNK/fact chunks. */
export async function readWav(path) {
  const raw = await readFile(path);
  const v = new DataView(raw.buffer, raw.byteOffset, raw.byteLength);
  const tag = (off) => String.fromCharCode(v.getUint8(off), v.getUint8(off + 1), v.getUint8(off + 2), v.getUint8(off + 3));
  if (tag(0) !== "RIFF" || tag(8) !== "WAVE") throw new Error(`${path}: not a RIFF/WAVE file`);
  let off = 12, fmt = null, dataOff = -1, dataLen = 0;
  while (off + 8 <= raw.byteLength) {
    const id = tag(off);
    const size = v.getUint32(off + 4, true);
    if (id === "fmt ") {
      fmt = { encoding: v.getUint16(off + 8, true), channels: v.getUint16(off + 10, true),
              sampleRate: v.getUint32(off + 12, true), bits: v.getUint16(off + 22, true) };
    } else if (id === "data") { dataOff = off + 8; dataLen = size; }
    off += 8 + size + (size % 2);   // chunks are word-aligned
  }
  if (!fmt) throw new Error(`${path}: no fmt chunk`);
  if (dataOff < 0) throw new Error(`${path}: no data chunk`);
  if (fmt.encoding !== 1) throw new Error(`${path}: encoding ${fmt.encoding}, expected 1 (PCM)`);
  if (fmt.channels !== 1) throw new Error(`${path}: ${fmt.channels} channels, expected 1 (mono)`);
  if (fmt.bits !== 16) throw new Error(`${path}: ${fmt.bits} bits, expected 16`);
  const n = Math.floor(dataLen / 2);
  const data = new Float32Array(n);
  for (let i = 0; i < n; i++) data[i] = v.getInt16(dataOff + i * 2, true) / 32768;
  return { sampleRate: fmt.sampleRate, data };
}
```

`tools/sfx-studio/package.json`:

```json
{
  "name": "@pacify/sfx-studio",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "description": "Offline renderer for PACIFY gameplay SFX. See docs/superpowers/specs/2026-11-04-gameplay-sfx-design.md",
  "scripts": {
    "test": "node --test",
    "render": "node render.mjs",
    "check": "node check.mjs",
    "smoke": "node smoke.mjs"
  },
  "dependencies": {},
  "devDependencies": {}
}
```

Note: `tools/` is **not** in the root `package.json` `workspaces` array (`["apps/*", "packages/*"]`)
and must not be added — this package is a script directory, not a workspace. Its
`dependencies` stay empty; `ffmpeg-static` and `puppeteer-core` are already at the repo root
and resolve upward through `node_modules`.

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test tools/sfx-studio/wav.test.mjs`
Expected: PASS — 3 tests

- [ ] **Step 5: Write the end-to-end probe and run it**

`tools/sfx-studio/probe.mjs` — a throwaway that proves synthesise → write → read → measure.
Deleted in Step 7.

```js
import { mkdir, rm } from "node:fs/promises";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { makeBuffer, writeWav, readWav } from "./wav.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "build", "probe");

await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });

const sr = 44100;
const buf = makeBuffer(0.25, sr);
for (let i = 0; i < buf.data.length; i++) {
  const t = i / sr;
  const env = Math.exp(-t * 18);
  buf.data[i] = (Math.sin(2 * Math.PI * 220 * t) * 0.6 + Math.sin(2 * Math.PI * 660 * t) * 0.25) * env * 0.7;
}
const p = join(OUT, "probe.wav");
await writeWav(p, buf);
const back = await readWav(p);

let peak = 0, sum = 0;
for (const x of back.data) { peak = Math.max(peak, Math.abs(x)); sum += x * x; }
const rms = Math.sqrt(sum / back.data.length);
const db = (x) => (x > 0 ? 20 * Math.log10(x) : -Infinity);

console.log(`probe.wav  sr=${back.sampleRate}  frames=${back.data.length}  dur=${(back.data.length / back.sampleRate * 1000).toFixed(1)}ms`);
console.log(`  peak ${db(peak).toFixed(2)} dBFS   rms ${db(rms).toFixed(2)} dBFS`);
if (peak > 0.891) throw new Error(`probe clipped or too hot: ${db(peak).toFixed(2)} dBFS (ceiling -1.0)`);
if (back.sampleRate !== sr) throw new Error("sample rate mismatch");
console.log("PROBE OK");
```

Run: `node tools/sfx-studio/probe.mjs`
Expected: prints `PROBE OK` with peak below −1.0 dBFS. `0.7` amplitude ⇒ peak ≈ −3.1 dBFS,
so the `0.891` linear threshold (= −1.0 dBFS) is the same constant `check.mjs` will use.

- [ ] **Step 6: Commit**

```bash
git add tools/sfx-studio/package.json tools/sfx-studio/prng.mjs tools/sfx-studio/wav.mjs tools/sfx-studio/wav.test.mjs
git commit -m "feat(sfx-studio): scaffold — seeded PRNG, WAV I/O, end-to-end probe"
```

Do **not** commit `probe.mjs` or `build/`. Add to `tools/sfx-studio/.gitignore` in the same
commit if one does not exist:

```
build/
sources/raw/
sources/normalised/
```

- [ ] **Step 7: Delete the probe**

Run: `rm tools/sfx-studio/probe.mjs`
It is throwaway — its job was to prove the path, and Step 5 did. `check.mjs` (Task 5) is the
permanent version of that measurement.

---

### Task 2: DSP primitives

The synthesis toolkit. Everything here operates on `Float32Array` at a fixed sample rate —
pure functions, no I/O, trivially testable.

**Files:**
- Create: `tools/sfx-studio/dsp.mjs`
- Test: `tools/sfx-studio/dsp.test.mjs`

**Interfaces:**
- Consumes: `prng(seed)`, `range(rand, lo, hi)` from `./prng.mjs`.
- Produces (all exported from `dsp.mjs`):
  - `osc({ wave, f, fEnd, glide, dur, sampleRate, phase }) => Float32Array` — `wave` ∈ `"sine"|"tri"|"saw"|"square"`; `glide` ∈ `"lin"|"exp"`, ignored when `fEnd` is absent.
  - `noise({ color, dur, sampleRate, rand }) => Float32Array` — `color` ∈ `"white"|"pink"|"brown"`.
  - `applyEnv(data, sampleRate, points, { curve }) => Float32Array` — `points` is `[[sec, level], …]` ascending from `0`; `curve` ∈ `"lin"|"exp"`, default `"exp"`.
  - `biquad(data, sampleRate, { type, f, fEnd, q, gainDb }) => Float32Array` — `type` ∈ `"lowpass"|"highpass"|"bandpass"|"notch"|"peaking"`; `fEnd` automates cutoff linearly across the buffer.
  - `shape(data, fn) => Float32Array` — applies a transfer function sample-wise.
  - `delay(data, sampleRate, { ms, feedback, mix }) => Float32Array` — same length as input.
  - `pitch(data, rate) => Float32Array` — linear-interpolated resample; `rate > 1` raises pitch **and shortens** duration.
  - `panGain(pan) => { l: number, r: number }` — equal-power, `pan` ∈ `[-1, 1]`. (Mono assets carry `pan` as metadata for the runtime `StereoPannerNode`; the studio uses it only to widen stereo IRs.)
  - `limit(data, { ceiling, lookahead }) => Float32Array`
  - `normalize(data, targetDbfs) => Float32Array`
  - `trimSilence(data, sampleRate, { thresholdDb, keepMs }) => Float32Array`
  - `mixInto(dest, src, atSec, sampleRate, gain)` — in-place additive mix, clipping-safe.
  - `stats(data) => { peak, peakDbfs, rms, rmsDbfs, duration }`
  - `dbToLin(db)`, `linToDb(lin)`

- [ ] **Step 1: Write the failing test**

`tools/sfx-studio/dsp.test.mjs`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  osc, noise, applyEnv, biquad, shape, delay, pitch,
  limit, normalize, trimSilence, mixInto, stats, dbToLin, linToDb,
} from "./dsp.mjs";
import { prng } from "./prng.mjs";

const SR = 44100;

test("osc sine at 440Hz has the right period and stays in range", () => {
  const d = osc({ wave: "sine", f: 440, dur: 0.05, sampleRate: SR });
  assert.equal(d.length, Math.ceil(0.05 * SR));
  let peak = 0;
  for (const x of d) peak = Math.max(peak, Math.abs(x));
  assert.ok(peak > 0.98 && peak <= 1.0, `sine peak should be ~1, got ${peak}`);
  // zero crossings: 440Hz over 50ms => ~22 crossings
  let crossings = 0;
  for (let i = 1; i < d.length; i++) if (d[i - 1] < 0 && d[i] >= 0) crossings++;
  assert.ok(crossings >= 20 && crossings <= 24, `unexpected crossings: ${crossings}`);
});

test("osc exponential glide reaches fEnd", () => {
  const up = osc({ wave: "sine", f: 100, fEnd: 400, glide: "exp", dur: 0.2, sampleRate: SR });
  // measure instantaneous period in the last 10% vs the first 10%
  const period = (from, to) => {
    let c = 0, first = -1, last = -1;
    for (let i = Math.floor(from * up.length); i < Math.floor(to * up.length); i++) {
      if (up[i - 1] < 0 && up[i] >= 0) { c++; if (first < 0) first = i; last = i; }
    }
    return c > 1 ? (last - first) / (c - 1) : Infinity;
  };
  const pStart = period(0, 0.1), pEnd = period(0.9, 1.0);
  assert.ok(pEnd < pStart * 0.5, `expected period to shrink >2x, ${pStart} -> ${pEnd}`);
});

test("noise colours differ and all stay bounded", () => {
  for (const color of ["white", "pink", "brown"]) {
    const d = noise({ color, dur: 0.1, sampleRate: SR, rand: prng(7) });
    let peak = 0;
    for (const x of d) peak = Math.max(peak, Math.abs(x));
    assert.ok(peak <= 1.0, `${color} exceeded 1.0: ${peak}`);
    assert.ok(peak > 0.05, `${color} is silent`);
  }
  const w = noise({ color: "white", dur: 0.1, sampleRate: SR, rand: prng(7) });
  const b = noise({ color: "brown", dur: 0.1, sampleRate: SR, rand: prng(7) });
  // brown noise is integrated white => far more low energy => lower zero-crossing rate
  const zc = (d) => { let c = 0; for (let i = 1; i < d.length; i++) if (d[i - 1] < 0 && d[i] >= 0) c++; return c; };
  assert.ok(zc(b) < zc(w) * 0.5, `brown should be much darker: ${zc(b)} vs ${zc(w)}`);
});

test("applyEnv exponential decay is monotonic and hits the floor", () => {
  const d = new Float32Array(SR / 10).fill(1);
  const e = applyEnv(d, SR, [[0, 1], [0.1, 0]], { curve: "exp" });
  assert.ok(e[0] > 0.9, `attack should start near 1, got ${e[0]}`);
  for (let i = 1; i < e.length; i++) assert.ok(e[i] <= e[i - 1] + 1e-6, "decay must be monotonic");
  assert.ok(e[e.length - 1] < 0.02, `tail should approach 0, got ${e[e.length - 1]}`);
});

test("biquad lowpass attenuates highs and passes lows", () => {
  const bright = osc({ wave: "square", f: 6000, dur: 0.05, sampleRate: SR });
  const dark = osc({ wave: "sine", f: 80, dur: 0.05, sampleRate: SR });
  const rmsBefore = (d) => stats(d).rms;
  const lpBright = biquad(bright, SR, { type: "lowpass", f: 500, q: 0.707 });
  const lpDark = biquad(dark, SR, { type: "lowpass", f: 500, q: 0.707 });
  // skip the first 10% to ignore filter settling
  const tail = (d) => d.subarray(Math.floor(d.length * 0.1));
  assert.ok(rmsBefore(tail(lpBright)) < rmsBefore(tail(bright)) * 0.25, "6kHz should be crushed by a 500Hz LP");
  assert.ok(rmsBefore(tail(lpDark)) > rmsBefore(tail(dark)) * 0.7, "80Hz should pass a 500Hz LP");
});

test("limit holds the ceiling", () => {
  const d = new Float32Array(SR / 20);
  for (let i = 0; i < d.length; i++) d[i] = Math.sin((2 * Math.PI * 300 * i) / SR) * 8;
  const l = limit(d, { ceiling: dbToLin(-1), lookahead: 64 });
  const { peakDbfs } = stats(l);
  assert.ok(peakDbfs <= -0.99, `limiter breached ceiling: ${peakDbfs} dBFS`);
  assert.ok(peakDbfs > -6, `limiter over-compressed: ${peakDbfs} dBFS`);
});

test("normalize hits the target", () => {
  const d = osc({ wave: "sine", f: 440, dur: 0.05, sampleRate: SR });
  const n = normalize(d, -3);
  assert.ok(Math.abs(stats(n).peakDbfs - -3) < 0.05, `expected -3 dBFS, got ${stats(n).peakDbfs}`);
});

test("trimSilence removes leading silence (the <5ms rule)", () => {
  const d = new Float32Array(SR / 4);            // 250ms
  const sig = osc({ wave: "sine", f: 440, dur: 0.1, sampleRate: SR });
  d.set(sig.map((x) => x * 0.5), Math.floor(0.08 * SR));   // signal starts at 80ms
  const t = trimSilence(d, SR, { thresholdDb: -50, keepMs: 1 });
  assert.ok(t.length < d.length * 0.6, `should have cut ~80ms, ${d.length} -> ${t.length}`);
  // after trimming, the first sample above threshold must be within keepMs of index 0
  const thr = dbToLin(-50);
  let firstAudible = 0;
  while (firstAudible < t.length && Math.abs(t[firstAudible]) < thr) firstAudible++;
  assert.ok(firstAudible <= Math.ceil(0.001 * SR) + 1, `head silence survived: ${firstAudible} samples`);
});

test("mixInto places a layer at an offset without clipping", () => {
  const dest = new Float32Array(SR / 10);
  const a = new Float32Array(SR / 40).fill(0.6);
  mixInto(dest, a, 0.05, SR, 1);
  const at = Math.floor(0.05 * SR);
  assert.ok(Math.abs(dest[at] - 0.6) < 1e-6, "layer did not land at its offset");
  assert.equal(dest[0], 0, "layer landed too early");
  const hot = new Float32Array(SR / 40).fill(0.9);
  mixInto(dest, hot, 0.05, SR, 1);
  for (const x of dest) assert.ok(Math.abs(x) <= 1.0, `mixInto produced ${x}, must clamp`);
});

test("pitch raises pitch and shortens duration", () => {
  const d = osc({ wave: "sine", f: 220, dur: 0.1, sampleRate: SR });
  const p = pitch(d, 2);
  assert.equal(p.length, Math.ceil(d.length / 2));
  const zc = (x) => { let c = 0; for (let i = 1; i < x.length; i++) if (x[i - 1] < 0 && x[i] >= 0) c++; return c; };
  // same number of cycles in half the time => same crossings in half the samples
  assert.ok(Math.abs(zc(p) - zc(d)) <= 2, `cycle count should be preserved: ${zc(d)} -> ${zc(p)}`);
});

test("delay adds an echo at the right offset", () => {
  const d = new Float32Array(SR / 10);
  d[0] = 1;                                       // single impulse
  const out = delay(d, SR, { ms: 50, feedback: 0, mix: 1 });
  const at = Math.floor(0.05 * SR);
  assert.ok(Math.abs(out[at]) > 0.9, `echo missing at 50ms: ${out[at]}`);
  assert.ok(Math.abs(out[1]) < 0.01, "unexpected early echo");
});

test("shape applies the transfer function", () => {
  const d = new Float32Array([0, 0.5, -0.5, 1, -1]);
  const s = shape(d, (x) => Math.tanh(x * 2));
  assert.ok(Math.abs(s[0]) < 1e-9);
  assert.ok(s[3] < 1.0 && s[3] > 0.7, "tanh should soft-clip +1");
  assert.ok(s[4] > -1.0 && s[4] < -0.7, "tanh should soft-clip -1");
});

test("db helpers round-trip", () => {
  assert.ok(Math.abs(linToDb(dbToLin(-6)) - -6) < 1e-9);
  assert.ok(Math.abs(dbToLin(0) - 1) < 1e-9);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test tools/sfx-studio/dsp.test.mjs`
Expected: FAIL — `Cannot find module './dsp.mjs'`

- [ ] **Step 3: Write the implementation**

`tools/sfx-studio/dsp.mjs`:

```js
/* DSP primitives for the offline SFX renderer. All functions are pure: they take
   Float32Array (or plain params) and return a new Float32Array. No I/O here. */

export const dbToLin = (db) => Math.pow(10, db / 20);
export const linToDb = (lin) => (lin > 0 ? 20 * Math.log10(lin) : -Infinity);

const len = (dur, sampleRate) => Math.max(1, Math.ceil(dur * sampleRate));

export function stats(data) {
  let peak = 0, sum = 0;
  for (let i = 0; i < data.length; i++) {
    const a = Math.abs(data[i]);
    if (a > peak) peak = a;
    sum += data[i] * data[i];
  }
  const rms = data.length ? Math.sqrt(sum / data.length) : 0;
  return { peak, peakDbfs: linToDb(peak), rms, rmsDbfs: linToDb(rms), duration: data.length };
}

export function osc({ wave, f, fEnd, glide = "lin", dur, sampleRate, phase = 0 }) {
  const n = len(dur, sampleRate);
  const out = new Float32Array(n);
  let ph = phase * Math.PI * 2;
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0 : i / (n - 1);
    let hz = f;
    if (fEnd !== undefined && fEnd !== f) {
      hz = glide === "exp" ? f * Math.pow(fEnd / f, t) : f + (fEnd - f) * t;
    }
    // integrate frequency rather than computing f*t — correct under a glide
    ph += (2 * Math.PI * hz) / sampleRate;
    if (ph > Math.PI * 2) ph -= Math.PI * 2;
    const u = ph / (2 * Math.PI);          // 0..1
    let v;
    switch (wave) {
      case "sine": v = Math.sin(ph); break;
      case "tri": v = 4 * Math.abs(u - Math.floor(u + 0.75) + 0.25) - 1; break;
      case "saw": v = 2 * (u - Math.floor(u + 0.5)); break;
      case "square": v = u < 0.5 ? 1 : -1; break;
      default: throw new Error(`unknown wave: ${wave}`);
    }
    out[i] = v;
  }
  return out;
}

export function noise({ color, dur, sampleRate, rand }) {
  const n = len(dur, sampleRate);
  const out = new Float32Array(n);
  if (color === "white") {
    for (let i = 0; i < n; i++) out[i] = rand() * 2 - 1;
    return out;
  }
  if (color === "pink") {
    // Voss-McCartney via the classic Paul Kellet approximation
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < n; i++) {
      const w = rand() * 2 - 1;
      b0 = 0.99886 * b0 + w * 0.0555179;
      b1 = 0.99332 * b1 + w * 0.0750759;
      b2 = 0.96900 * b2 + w * 0.1538520;
      b3 = 0.86650 * b3 + w * 0.3104856;
      b4 = 0.55000 * b4 + w * 0.5329522;
      b5 = -0.7616 * b5 - w * 0.0168980;
      out[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
      b6 = w * 0.115926;
    }
    return out;
  }
  if (color === "brown") {
    let last = 0;
    for (let i = 0; i < n; i++) {
      const w = rand() * 2 - 1;
      last = (last + 0.02 * w) / 1.02;
      out[i] = last * 3.5;
    }
    return out;
  }
  throw new Error(`unknown noise colour: ${color}`);
}

/** Breakpoint envelope. `points` = [[sec, level], ...] ascending, first must be 0.
    "exp" curves between breakpoints (musical); "lin" is a straight ramp. */
export function applyEnv(data, sampleRate, points, { curve = "exp" } = {}) {
  if (!points.length || points[0][0] !== 0) throw new Error("envelope must start at t=0");
  const out = new Float32Array(data.length);
  const FLOOR = 1e-4;                                  // exp interpolation cannot reach 0
  for (let i = 0; i < data.length; i++) {
    const t = i / sampleRate;
    let v = points[points.length - 1][1];
    for (let s = 0; s < points.length - 1; s++) {
      const [t0, v0] = points[s];
      const [t1, v1] = points[s + 1];
      if (t >= t0 && t <= t1) {
        const k = t1 === t0 ? 1 : (t - t0) / (t1 - t0);
        v = curve === "exp"
          ? Math.max(v0, FLOOR) * Math.pow(Math.max(v1, FLOOR) / Math.max(v0, FLOOR), k)
          : v0 + (v1 - v0) * k;
        break;
      }
      if (t > points[points.length - 1][0]) { v = points[points.length - 1][1]; }
    }
    out[i] = data[i] * v;
  }
  return out;
}

/** RBJ Audio EQ Cookbook coefficients. */
function biquadCoefs({ type, f, q = 0.707, gainDb = 0, sampleRate }) {
  const w0 = (2 * Math.PI * Math.min(f, sampleRate * 0.499)) / sampleRate;
  const cw = Math.cos(w0), sw = Math.sin(w0);
  const A = Math.pow(10, gainDb / 40);
  const alpha = sw / (2 * q);
  let b0, b1, b2, a0, a1, a2;
  switch (type) {
    case "lowpass":  b0 = (1 - cw) / 2; b1 = 1 - cw;       b2 = (1 - cw) / 2; a0 = 1 + alpha; a1 = -2 * cw; a2 = 1 - alpha; break;
    case "highpass": b0 = (1 + cw) / 2; b1 = -(1 + cw);    b2 = (1 + cw) / 2; a0 = 1 + alpha; a1 = -2 * cw; a2 = 1 - alpha; break;
    case "bandpass": b0 = alpha;        b1 = 0;            b2 = -alpha;       a0 = 1 + alpha; a1 = -2 * cw; a2 = 1 - alpha; break;
    case "notch":    b0 = 1;            b1 = -2 * cw;      b2 = 1;            a0 = 1 + alpha; a1 = -2 * cw; a2 = 1 - alpha; break;
    case "peaking":  b0 = 1 + alpha * A; b1 = -2 * cw;     b2 = 1 - alpha * A; a0 = 1 + alpha / A; a1 = -2 * cw; a2 = 1 - alpha / A; break;
    default: throw new Error(`unknown biquad type: ${type}`);
  }
  return { b0: b0 / a0, b1: b1 / a0, b2: b2 / a0, a1: a1 / a0, a2: a2 / a0 };
}

export function biquad(data, sampleRate, { type, f, fEnd, q = 0.707, gainDb = 0 }) {
  const out = new Float32Array(data.length);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  let c = biquadCoefs({ type, f, q, gainDb, sampleRate });
  for (let i = 0; i < data.length; i++) {
    if (fEnd !== undefined && fEnd !== f) {
      const t = data.length === 1 ? 0 : i / (data.length - 1);
      c = biquadCoefs({ type, f: f + (fEnd - f) * t, q, gainDb, sampleRate });
    }
    const x0 = data[i];
    const y0 = c.b0 * x0 + c.b1 * x1 + c.b2 * x2 - c.a1 * y1 - c.a2 * y2;
    x2 = x1; x1 = x0; y2 = y1; y1 = y0;
    out[i] = y0;
  }
  return out;
}

export function shape(data, fn) {
  const out = new Float32Array(data.length);
  for (let i = 0; i < data.length; i++) out[i] = fn(data[i]);
  return out;
}

export function delay(data, sampleRate, { ms, feedback = 0, mix = 1 }) {
  const d = Math.max(1, Math.round((ms / 1000) * sampleRate));
  const out = new Float32Array(data.length);
  const buf = new Float32Array(data.length + d);
  for (let i = 0; i < data.length; i++) {
    const wet = buf[i] + data[i];
    buf[i + d] += wet * mix;
    if (feedback) buf[i + d] += buf[i] * feedback;
    out[i] = data[i] + wet * 0;        // dry stays, wet accumulated below
  }
  // second pass: fold the accumulated wet back into the output window
  for (let i = 0; i < data.length; i++) out[i] = data[i] + buf[i];
  return out;
}

/** Linear-interpolated resample. rate>1 = up in pitch AND shorter. */
export function pitch(data, rate) {
  if (rate <= 0) throw new Error("pitch rate must be > 0");
  const n = Math.max(1, Math.ceil(data.length / rate));
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const src = i * rate;
    const i0 = Math.floor(src);
    const i1 = Math.min(i0 + 1, data.length - 1);
    const k = src - i0;
    out[i] = data[i0] * (1 - k) + data[i1] * k;
  }
  return out;
}

export function panGain(pan) {
  const p = (Math.max(-1, Math.min(1, pan)) + 1) * 0.25 * Math.PI;   // -1..1 -> 0..pi/2
  return { l: Math.cos(p) * Math.SQRT2, r: Math.sin(p) * Math.SQRT2 };
}

/** Lookahead peak limiter: gain envelope derived from the max over a sliding
    window, then smoothed so the reduction does not click. */
export function limit(data, { ceiling = dbToLin(-1), lookahead = 64 } = {}) {
  const n = data.length;
  const out = new Float32Array(n);
  const gain = new Float32Array(n).fill(1);
  for (let i = 0; i < n; i++) {
    const a = Math.abs(data[i]);
    if (a > ceiling) {
      const g = ceiling / a;
      const from = Math.max(0, i - lookahead);
      for (let j = from; j <= i; j++) if (g < gain[j]) gain[j] = g;
    }
  }
  // smooth: attack fast, release slow
  let sm = 1;
  for (let i = 0; i < n; i++) {
    const target = gain[i];
    sm = target < sm ? sm + (target - sm) * 0.6 : sm + (target - sm) * 0.002;
    out[i] = data[i] * sm;
  }
  return out;
}

export function normalize(data, targetDbfs) {
  const { peak } = stats(data);
  if (peak < 1e-9) return new Float32Array(data);
  const g = dbToLin(targetDbfs) / peak;
  const out = new Float32Array(data.length);
  for (let i = 0; i < data.length; i++) out[i] = data[i] * g;
  return out;
}

/** Enforces spec §9.1a's "leading silence < 5ms". Leaves `keepMs` of pre-roll so
    the transient is not chopped, and trims an inaudible tail. */
export function trimSilence(data, sampleRate, { thresholdDb = -50, keepMs = 1 } = {}) {
  const thr = dbToLin(thresholdDb);
  let first = 0;
  while (first < data.length && Math.abs(data[first]) < thr) first++;
  if (first >= data.length) return new Float32Array(1);
  let last = data.length - 1;
  while (last > first && Math.abs(data[last]) < thr) last--;
  const keep = Math.ceil((keepMs / 1000) * sampleRate);
  const start = Math.max(0, first - keep);
  const end = Math.min(data.length, last + keep + 1);
  return data.slice(start, end);
}

export function mixInto(dest, src, atSec, sampleRate, gain = 1) {
  const off = Math.round(atSec * sampleRate);
  for (let i = 0; i < src.length; i++) {
    const j = off + i;
    if (j < 0 || j >= dest.length) continue;
    dest[j] = Math.max(-1, Math.min(1, dest[j] + src[i] * gain));
  }
  return dest;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test tools/sfx-studio/dsp.test.mjs`
Expected: PASS — 14 tests.

If `delay adds an echo at the right offset` fails, the two-pass fold in `delay()` is wrong —
the first pass must not write into `out`, only accumulate into `buf`.

- [ ] **Step 5: Commit**

```bash
git add tools/sfx-studio/dsp.mjs tools/sfx-studio/dsp.test.mjs
git commit -m "feat(sfx-studio): DSP primitives — osc, noise, env, biquad, delay, pitch, limiter"
```

---

### Task 3: Convolution reverb, IR presets, and the recipe renderer

Completes the renderer: FFT convolution, the four named impulse responses, `renderRecipe()`,
and the CLI. After this task, `node tools/sfx-studio/render.mjs --only duel-stamp` produces a
real shipping asset.

**Files:**
- Create: `tools/sfx-studio/fft.mjs`
- Create: `tools/sfx-studio/ir.mjs`
- Create: `tools/sfx-studio/render.mjs`
- Create: `tools/sfx-studio/recipes/index.mjs`
- Create: `tools/sfx-studio/recipes/ui.mjs` (one stub recipe, so the CLI has something to render)
- Test: `tools/sfx-studio/convolve.test.mjs`

**Interfaces:**
- Consumes: everything from `dsp.mjs`, `wav.mjs`, `prng.mjs`.
- Produces:
  - `fft(re: Float64Array, im: Float64Array, inverse: boolean) => void` — in-place radix-2; length must be a power of two.
  - `nextPow2(n: number) => number`
  - `convolve(input: Float32Array, ir: Float32Array) => Float32Array` — length `input.length + ir.length - 1`.
  - `makeIR({ preset, seconds, sampleRate, rand }) => Float32Array` — `preset` ∈ `"hall"|"plate"|"metal"|"cathedral"`.
  - `renderRecipe(recipe, opts) => Promise<{ path, stats, layers }>` where `opts = { outDir, assetsDir, sourcesDir }`.
  - `RECIPES: Recipe[]` from `recipes/index.mjs`.
  - CLI: `node render.mjs [--only <name>] [--family <family>] [--out <dir>]`.

**The `Recipe` typedef** (normative — documented as JSDoc in `render.mjs`, since `tools/` is `.mjs`):

```js
/**
 * @typedef {{ kind: "osc", wave: "sine"|"tri"|"saw"|"square", f: number, fEnd?: number,
 *   glide?: "lin"|"exp", dur: number, at: number, gain?: number, env: EnvPoints,
 *   filter?: FilterSpec, pan?: number, pitch?: number, phase?: number }} OscLayer
 * @typedef {{ kind: "noise", color: "white"|"pink"|"brown", dur: number, at: number,
 *   gain?: number, env: EnvPoints, filter?: FilterSpec, pan?: number, pitch?: number }} NoiseLayer
 * @typedef {{ kind: "sample", src: string, at: number, gain?: number, env?: EnvPoints,
 *   filter?: FilterSpec, pan?: number, pitch?: number, reverse?: boolean,
 *   trimStart?: number, trimEnd?: number }} SampleLayer
 * @typedef {Array<[number, number]>} EnvPoints
 * @typedef {{ type: string, f: number, fEnd?: number, q?: number, gainDb?: number }} FilterSpec
 * @typedef {{ name: string, family: string, layers: Array<OscLayer|NoiseLayer|SampleLayer>,
 *   reverb?: { preset: string, send: number, preDelayMs?: number },
 *   master?: { gain?: number, normalizeTo?: number },
 *   sampleRate?: 44100|22050, seed?: number }} Recipe
 */
```

`family` is the grouping the render tasks use (`ui`, `table`, `clash`, `shield`, `score`,
`round`, `trick-void`, …) and the `--family` filter matches it.

- [ ] **Step 1: Write the failing test**

`tools/sfx-studio/convolve.test.mjs`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { fft, nextPow2, convolve } from "./fft.mjs";
import { makeIR } from "./ir.mjs";
import { osc, stats } from "./dsp.mjs";
import { prng } from "./prng.mjs";

test("nextPow2", () => {
  assert.equal(nextPow2(1), 1);
  assert.equal(nextPow2(5), 8);
  assert.equal(nextPow2(1024), 1024);
  assert.equal(nextPow2(1025), 2048);
});

test("convolving with a unit impulse is the identity", () => {
  const sig = new Float32Array([0.1, -0.5, 0.9, 0.25, -0.25]);
  const ir = new Float32Array([1]);
  const out = convolve(sig, ir);
  assert.equal(out.length, sig.length + ir.length - 1);
  for (let i = 0; i < sig.length; i++) assert.ok(Math.abs(out[i] - sig[i]) < 1e-6, `index ${i}`);
});

test("convolving with a delayed impulse delays the signal", () => {
  const sig = new Float32Array([1, 0.5]);
  const ir = new Float32Array([0, 0, 1]);     // 2-sample delay
  const out = convolve(sig, ir);
  assert.ok(Math.abs(out[2] - 1) < 1e-6, `expected 1 at index 2, got ${out[2]}`);
  assert.ok(Math.abs(out[3] - 0.5) < 1e-6, `expected 0.5 at index 3, got ${out[3]}`);
  assert.ok(Math.abs(out[0]) < 1e-9 && Math.abs(out[1]) < 1e-9, "nothing should precede the delay");
});

test("convolution matches the naive O(n*m) reference", () => {
  const rand = prng(99);
  const a = Float32Array.from({ length: 37 }, () => rand() * 2 - 1);
  const b = Float32Array.from({ length: 23 }, () => rand() * 2 - 1);
  const ref = new Float32Array(a.length + b.length - 1);
  for (let i = 0; i < a.length; i++) for (let j = 0; j < b.length; j++) ref[i + j] += a[i] * b[j];
  const out = convolve(a, b);
  for (let i = 0; i < ref.length; i++) assert.ok(Math.abs(out[i] - ref[i]) < 1e-4, `index ${i}: ${out[i]} vs ${ref[i]}`);
});

test("fft round-trips", () => {
  const n = 256;
  const re = new Float64Array(n), im = new Float64Array(n);
  const orig = new Float64Array(n);
  for (let i = 0; i < n; i++) { re[i] = orig[i] = Math.sin(i * 0.3) + 0.4 * Math.cos(i * 1.1); }
  fft(re, im, false);
  fft(re, im, true);
  for (let i = 0; i < n; i++) assert.ok(Math.abs(re[i] - orig[i]) < 1e-9, `index ${i}`);
});

test("all four IR presets render, decay, and stay bounded", () => {
  for (const preset of ["hall", "plate", "metal", "cathedral"]) {
    const ir = makeIR({ preset, seconds: 1.0, sampleRate: 44100, rand: prng(3) });
    assert.equal(ir.length, 44100);
    const { peak } = stats(ir);
    assert.ok(peak <= 1.0 && peak > 0.05, `${preset} peak out of range: ${peak}`);
    // energy in the last 10% must be well below the first 10% — it is a decay, not a loop
    const e = (from, to) => { let s = 0; for (let i = from; i < to; i++) s += ir[i] * ir[i]; return s; };
    assert.ok(e(Math.floor(0.9 * ir.length), ir.length) < e(0, Math.floor(0.1 * ir.length)) * 0.2,
      `${preset} does not decay`);
  }
});

test("cathedral IR outlasts hall IR", () => {
  const measure = (preset) => {
    const ir = makeIR({ preset, seconds: 3.0, sampleRate: 44100, rand: prng(5) });
    const sig = osc({ wave: "sine", f: 1000, dur: 0.01, sampleRate: 44100 });
    const wet = convolve(sig, ir);
    // find the last index above -60 dBFS
    let last = 0;
    for (let i = 0; i < wet.length; i++) if (Math.abs(wet[i]) > 0.001) last = i;
    return last / 44100;
  };
  const hall = measure("hall"), cath = measure("cathedral");
  assert.ok(cath > hall * 1.4, `cathedral (${cath}s) should outlast hall (${hall}s) by >1.4x`);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test tools/sfx-studio/convolve.test.mjs`
Expected: FAIL — `Cannot find module './fft.mjs'`

- [ ] **Step 3: Write the implementation**

`tools/sfx-studio/fft.mjs`:

```js
export function nextPow2(n) {
  let p = 1;
  while (p < n) p <<= 1;
  return p;
}

/** In-place iterative radix-2 FFT. `re`/`im` must be equal-length powers of two. */
export function fft(re, im, inverse) {
  const n = re.length;
  if (n !== im.length) throw new Error("fft: re/im length mismatch");
  if (n & (n - 1)) throw new Error(`fft: length ${n} is not a power of two`);
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      const tr = re[i]; re[i] = re[j]; re[j] = tr;
      const ti = im[i]; im[i] = im[j]; im[j] = ti;
    }
  }
  for (let size = 2; size <= n; size <<= 1) {
    const half = size >> 1;
    const ang = ((inverse ? 2 : -2) * Math.PI) / size;
    const wpr = Math.cos(ang), wpi = Math.sin(ang);
    for (let i = 0; i < n; i += size) {
      let wr = 1, wi = 0;
      for (let k = 0; k < half; k++) {
        const ar = re[i + k], ai = im[i + k];
        const br = re[i + k + half] * wr - im[i + k + half] * wi;
        const bi = re[i + k + half] * wi + im[i + k + half] * wr;
        re[i + k] = ar + br; im[i + k] = ai + bi;
        re[i + k + half] = ar - br; im[i + k + half] = ai - bi;
        const nwr = wr * wpr - wi * wpi;
        wi = wr * wpi + wi * wpr;
        wr = nwr;
      }
    }
  }
  if (inverse) for (let i = 0; i < n; i++) { re[i] /= n; im[i] /= n; }
}

/** Frequency-domain convolution. Assets here are short (<3s) and IRs <=3.2s, so a
    single FFT of the full linear-convolution length is fast enough — no need for
    partitioned overlap-add. Falls back to nothing: if this ever becomes the
    bottleneck, ffmpeg's `afir` filter is the escape hatch. */
export function convolve(input, ir) {
  const outLen = input.length + ir.length - 1;
  const n = nextPow2(Math.max(outLen, 2));
  const ar = new Float64Array(n), ai = new Float64Array(n);
  const br = new Float64Array(n), bi = new Float64Array(n);
  ar.set(input); br.set(ir);
  fft(ar, ai, false);
  fft(br, bi, false);
  const cr = new Float64Array(n), ci = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    cr[i] = ar[i] * br[i] - ai[i] * bi[i];
    ci[i] = ar[i] * bi[i] + ai[i] * br[i];
  }
  fft(cr, ci, true);
  const out = new Float32Array(outLen);
  for (let i = 0; i < outLen; i++) out[i] = cr[i];
  return out;
}
```

`tools/sfx-studio/ir.mjs`:

```js
import { noise, biquad, applyEnv, normalize, delay as delayLine } from "./dsp.mjs";
import { convolve } from "./fft.mjs";

/* Procedural impulse responses — the same algorithm the runtime uses to build its
   ConvolverNode buffers, so browser and rendered assets agree (spec §5.2).
   Exponentially decaying noise, then preset-specific tonal shaping. */

const PRESETS = {
  hall:      { decay: 1.8, lp: 6500, hp: 120, preDelayMs: 18, diffusion: 0.35 },
  plate:     { decay: 0.9, lp: 9000, hp: 200, preDelayMs: 4,  diffusion: 0.55 },
  metal:     { decay: 0.5, lp: 12000, hp: 900, preDelayMs: 0, diffusion: 0.15 },
  cathedral: { decay: 3.2, lp: 4200, hp: 80,  preDelayMs: 32, diffusion: 0.45 },
};

export const IR_PRESETS = Object.keys(PRESETS);

export function makeIR({ preset, seconds, sampleRate = 44100, rand }) {
  const p = PRESETS[preset];
  if (!p) throw new Error(`unknown IR preset: ${preset} (have: ${IR_PRESETS.join(", ")})`);
  const dur = Math.min(seconds, p.decay * 1.6);
  let ir = noise({ color: "white", dur, sampleRate, rand });
  ir = applyEnv(ir, sampleRate, [[0, 1], [dur, 0]], { curve: "exp" });
  ir = biquad(ir, sampleRate, { type: "highpass", f: p.hp, q: 0.7 });
  ir = biquad(ir, sampleRate, { type: "lowpass", f: p.lp, q: 0.7 });
  if (p.diffusion > 0) {
    // a single short feedback delay smears the early reflections into a tail
    const wet = delayLine(ir, sampleRate, { ms: 11, feedback: p.diffusion, mix: 1 });
    const out = new Float32Array(ir.length);
    for (let i = 0; i < ir.length; i++) out[i] = ir[i] * 0.6 + wet[i] * 0.4;
    ir = out;
  }
  ir = normalize(ir, -6);
  if (p.preDelayMs > 0) {
    const d = Math.round((p.preDelayMs / 1000) * sampleRate);
    const padded = new Float32Array(ir.length + d);
    padded.set(ir, d);
    ir = padded;
  }
  // final safety: an IR must never itself clip the reverb return
  return normalize(ir, -3);
}
```

`tools/sfx-studio/recipes/ui.mjs` — one real recipe, so the CLI is testable now and the
pattern is established:

```js
/* UI family. These four re-render the LEGACY sounds in place at their existing
   filenames (spec §7.22) so no importer path changes. */

/** @type {import("../render.mjs").Recipe[]} */
export const ui = [
  {
    name: "click",
    family: "ui",
    sampleRate: 44100,
    seed: 1001,
    // A button confirm: a dry woody transient over a short pitched body. Two layers
    // minimum per spec §9.1a — a single oscillator is a beep and is rejected.
    layers: [
      { kind: "noise", color: "white", dur: 0.006, at: 0, gain: 0.9,
        env: [[0, 1], [0.006, 0]], filter: { type: "bandpass", f: 2600, q: 1.4 } },
      { kind: "osc", wave: "tri", f: 520, fEnd: 300, glide: "exp", dur: 0.07, at: 0, gain: 0.55,
        env: [[0, 0.9], [0.008, 1], [0.07, 0]], filter: { type: "lowpass", f: 3200, q: 0.8 } },
    ],
    master: { normalizeTo: -3 },
  },
];
```

`tools/sfx-studio/recipes/index.mjs`:

```js
import { ui } from "./ui.mjs";
// Each family module is added by its own render task; uncomment as they land.
// import { table } from "./table.mjs";
// import { clash } from "./clash.mjs";
// import { score } from "./score.mjs";
// import { round } from "./round.mjs";
// import { trickVoid } from "./trick-void.mjs";
// import { trickEcho } from "./trick-echo.mjs";
// import { trickEclipse } from "./trick-eclipse.mjs";
// import { trickWard } from "./trick-ward.mjs";
// import { trickReversal } from "./trick-reversal.mjs";
// import { trickExec } from "./trick-exec.mjs";
// import { trickOracle } from "./trick-oracle.mjs";

/** @type {import("../render.mjs").Recipe[]} */
export const RECIPES = [
  ...ui,
];
```

`tools/sfx-studio/render.mjs`:

```js
/* Offline SFX renderer.

   Run: node tools/sfx-studio/render.mjs [--only <name>] [--family <family>] [--out <dir>]
   Default --out is apps/web/assets/sfx (the source of truth, spec §4.4). Copying to
   apps/web/public/sfx is a separate, explicit step — see Task 19. */

import { mkdir, readFile, rm } from "node:fs/promises";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

import { prng } from "./prng.mjs";
import { makeBuffer, writeWav, readWav } from "./wav.mjs";
import {
  osc, noise, applyEnv, biquad, shape, pitch, mixInto, trimSilence,
  limit, normalize, stats, dbToLin,
} from "./dsp.mjs";
import { convolve } from "./fft.mjs";
import { makeIR } from "./ir.mjs";
import { RECIPES } from "./recipes/index.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "..", "..");
const DEFAULT_OUT = join(REPO, "apps", "web", "assets", "sfx");
const SOURCES = join(HERE, "sources", "normalised");

const { values } = parseArgs({
  options: {
    only: { type: "string" },
    family: { type: "string" },
    out: { type: "string", default: DEFAULT_OUT },
    keepSilence: { type: "boolean", default: false },
  },
});

const sampleCache = new Map();
async function loadSample(src) {
  if (sampleCache.has(src)) return sampleCache.get(src);
  const buf = await readWav(join(SOURCES, src));
  sampleCache.set(src, buf);
  return buf;
}

async function buildLayer(layer, sampleRate, rand) {
  let d;
  if (layer.kind === "osc") {
    d = osc({ wave: layer.wave, f: layer.f, fEnd: layer.fEnd, glide: layer.glide,
              dur: layer.dur, sampleRate, phase: layer.phase ?? 0 });
    if (layer.env) d = applyEnv(d, sampleRate, layer.env);
  } else if (layer.kind === "noise") {
    d = noise({ color: layer.color, dur: layer.dur, sampleRate, rand });
    if (layer.env) d = applyEnv(d, sampleRate, layer.env);
  } else if (layer.kind === "sample") {
    const s = await loadSample(layer.src);
    if (s.sampleRate !== sampleRate) {
      throw new Error(`sample ${layer.src} is ${s.sampleRate}Hz but the recipe wants ${sampleRate}Hz — re-normalise it (Task 4)`);
    }
    const a = Math.round((layer.trimStart ?? 0) * sampleRate);
    const b = layer.trimEnd ? Math.round(layer.trimEnd * sampleRate) : s.data.length;
    d = s.data.slice(Math.max(0, a), Math.max(a + 1, b));
    if (layer.reverse) d = Float32Array.from(d).reverse();
    if (layer.env) d = applyEnv(d, sampleRate, layer.env);
  } else {
    throw new Error(`unknown layer kind: ${layer.kind}`);
  }
  if (layer.filter) d = biquad(d, sampleRate, layer.filter);
  if (layer.pitch && layer.pitch !== 1) d = pitch(d, layer.pitch);
  return d;
}

export async function renderRecipe(recipe, { outDir = DEFAULT_OUT } = {}) {
  const sampleRate = recipe.sampleRate ?? 44100;
  const rand = prng(recipe.seed ?? 1);

  // 1. size the destination from the layers' extents
  let total = 1;
  for (const l of recipe.layers) {
    if (l.kind === "silence") { total = Math.max(total, Math.ceil(((l.at ?? 0) + l.dur) * sampleRate)); continue; }
    const dur = l.kind === "sample" ? Infinity : l.dur;      // samples sized after load
    if (dur === Infinity) {
      const s = await loadSample(l.src);
      const span = ((l.trimEnd ?? s.data.length / sampleRate) - (l.trimStart ?? 0)) / (l.pitch ?? 1);
      total = Math.max(total, Math.ceil(((l.at ?? 0) + span) * sampleRate));
    } else {
      total = Math.max(total, Math.ceil(((l.at ?? 0) + dur / (l.pitch ?? 1)) * sampleRate));
    }
  }

  // 2. render + mix the dry sum
  const dry = new Float32Array(total);
  let layerCount = 0;
  for (const l of recipe.layers) {
    if (l.kind === "silence") continue;
    const d = await buildLayer(l, sampleRate, rand);
    mixInto(dry, d, l.at ?? 0, sampleRate, l.gain ?? 1);
    layerCount++;
  }

  // 3. reverb send
  let out = dry;
  if (recipe.reverb && recipe.reverb.send > 0) {
    const ir = makeIR({ preset: recipe.reverb.preset, seconds: 3.2, sampleRate, rand: prng((recipe.seed ?? 1) + 7) });
    const wet = convolve(dry, ir);
    const pre = Math.round(((recipe.reverb.preDelayMs ?? 0) / 1000) * sampleRate);
    const merged = new Float32Array(Math.max(dry.length, wet.length + pre));
    merged.set(dry, 0);
    for (let i = 0; i < wet.length; i++) {
      const j = i + pre;
      if (j < merged.length) merged[j] = Math.max(-1, Math.min(1, merged[j] + wet[i] * recipe.reverb.send));
    }
    out = merged;
  }

  // 4. master
  if (recipe.master?.gain && recipe.master.gain !== 1) {
    const g = recipe.master.gain;
    const scaled = new Float32Array(out.length);
    for (let i = 0; i < out.length; i++) scaled[i] = out[i] * g;
    out = scaled;
  }
  out = limit(out, { ceiling: dbToLin(-1), lookahead: 64 });
  out = normalize(out, recipe.master?.normalizeTo ?? -3);
  if (!values.keepSilence) out = trimSilence(out, sampleRate, { thresholdDb: -50, keepMs: 1 });

  // 5. write
  await mkdir(outDir, { recursive: true });
  const path = join(outDir, `${recipe.name}.wav`);
  await writeWav(path, { sampleRate, data: out });
  return { path, stats: stats(out), layers: layerCount, sampleRate };
}

async function main() {
  const wanted = RECIPES.filter((r) => {
    if (values.only && r.name !== values.only) return false;
    if (values.family && r.family !== values.family) return false;
    return true;
  });
  if (!wanted.length) {
    console.error(`no recipes matched${values.only ? ` --only ${values.only}` : ""}${values.family ? ` --family ${values.family}` : ""}`);
    console.error(`available: ${RECIPES.map((r) => `${r.name} (${r.family})`).join(", ")}`);
    process.exit(1);
  }
  await rm(values.out, { recursive: true, force: true }).catch(() => {});
  await mkdir(values.out, { recursive: true });
  let bytes = 0;
  console.log(`rendering ${wanted.length} recipe(s) -> ${values.out}`);
  for (const r of wanted) {
    const t0 = Date.now();
    const res = await renderRecipe(r, { outDir: values.out });
    const { statSync } = await import("node:fs");
    const kb = statSync(res.path).size / 1024;
    bytes += statSync(res.path).size;
    console.log(
      `  ${r.name.padEnd(26)} ${res.stats.duration / 1000 > 0 ? "" : ""}` +
      `${((res.stats.duration / res.sampleRate) * 1000).toFixed(0).padStart(5)}ms` +
      `  peak ${res.stats.peakDbfs.toFixed(1).padStart(6)}dB` +
      `  rms ${res.stats.rmsDbfs.toFixed(1).padStart(6)}dB` +
      `  ${String(res.layers).padStart(2)} layers` +
      `  ${kb.toFixed(0).padStart(5)}KB` +
      `  (${Date.now() - t0}ms)`,
    );
  }
  console.log(`total ${(bytes / 1048576).toFixed(2)} MB`);
}

main().catch((e) => { console.error(e); process.exit(1); });
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test tools/sfx-studio/convolve.test.mjs`
Expected: PASS — 8 tests.

- [ ] **Step 5: Prove the CLI end to end**

Run: `node tools/sfx-studio/render.mjs --family ui --out tools/sfx-studio/build/probe-out`
Expected: renders `click.wav`, prints a one-row table with peak ≈ −3.0 dB, `2 layers`, and
`total 0.0x MB`. Then:

Run: `node tools/sfx-studio/render.mjs --only nonexistent`
Expected: exit 1 with `no recipes matched --only nonexistent` and the available list.

Run: `node tools/sfx-studio/render.mjs --family ui --out tools/sfx-studio/build/determinism && node tools/sfx-studio/render.mjs --family ui --out tools/sfx-studio/build/determinism2`
Then: `node -e "const{createHash}=require('crypto');const f=require('fs');const h=p=>createHash('sha256').update(f.readFileSync(p)).digest('hex');const a=h('tools/sfx-studio/build/determinism/click.wav'),b=h('tools/sfx-studio/build/determinism2/click.wav');console.log(a===b?'DETERMINISTIC OK':'FAIL: '+a+' vs '+b);process.exit(a===b?0:1)"`
Expected: `DETERMINISTIC OK`. This is the spec §4.2 determinism rule, checked early.

- [ ] **Step 6: Commit**

```bash
git add tools/sfx-studio/fft.mjs tools/sfx-studio/ir.mjs tools/sfx-studio/render.mjs tools/sfx-studio/recipes/index.mjs tools/sfx-studio/recipes/ui.mjs tools/sfx-studio/convolve.test.mjs
git commit -m "feat(sfx-studio): FFT convolution, procedural IR presets, recipe renderer + CLI"
```

---

### Task 4: CC0 source pipeline and provenance

Downloads organic textures, normalises them to 44.1 kHz mono WAV via ffmpeg, and records an
auditable provenance entry per file. **Nothing here ships raw** — normalised sources are
gitignored inputs to recipes.

**Files:**
- Create: `tools/sfx-studio/sources.mjs`
- Create: `tools/sfx-studio/sources/provenance.json` (generated; committed)
- Create: `tools/sfx-studio/.gitignore` (if Task 1 Step 6 did not already)

**Interfaces:**
- Consumes: `run`, `ffmpegPath` from `../motion/encode.mjs`; `readWav` from `./wav.mjs`.
- Produces:
  - `SOURCES: SourceSpec[]` — the filled-in download list.
  - `fetchSources({ force }) => Promise<void>` — downloads missing files to `sources/raw/`, normalises to `sources/normalised/`, rewrites `provenance.json`.
  - CLI: `node sources.mjs [--force] [--only <id>] [--list]`

- [ ] **Step 1: Write the machinery**

`tools/sfx-studio/sources.mjs`:

```js
/* CC0 source pipeline. Downloads organic textures, normalises them to 44.1kHz mono
   16-bit WAV via ffmpeg-static, and records provenance for every file.

   Run: node tools/sfx-studio/sources.mjs [--list] [--only <id>] [--force]

   HARD RULES (spec §4.3):
     - CC0 ONLY. Never CC-BY, never anything attribution-required.
     - Verify the license by fetching the source page, not by trusting a filename.
     - Never guess a URL. If a download 404s, remove the entry and find another.
     - Normalised sources are build inputs, not shipped assets — they are gitignored.
*/

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, dirname, resolve, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

import { run } from "../motion/encode.mjs";
import { readWav } from "./wav.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const RAW = join(HERE, "sources", "raw");
const NORM = join(HERE, "sources", "normalised");
const PROVENANCE = join(HERE, "sources", "provenance.json");

/**
 * @typedef {{ id: string, url: string, page: string, author: string, license: string,
 *   role: string, normalise?: { rate?: 44100|22050, gainDb?: number, trimStart?: number,
 *   trimEnd?: number } }} SourceSpec
 */

/* FILL THIS IN during Step 2. `role` names the recipe layer it feeds, so a reviewer can
   see why each download exists. Example shape — DO NOT commit these placeholder URLs:

   { id: "glass-shatter", url: "https://.../shatter.wav",
     page: "https://opengameart.org/content/...", author: "...", license: "CC0",
     role: "shieldbreak debris + clash loser shards",
     normalise: { gainDb: -6, trimStart: 0.02 } },
*/
export const SOURCES = [];

const sha256 = async (p) => createHash("sha256").update(await readFile(p)).digest("hex");

async function download(url, dest) {
  const res = await fetch(url, { redirect: "follow", headers: { "User-Agent": "Mozilla/5.0 pacify-sfx-studio" } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 1024) throw new Error(`suspiciously small download (${buf.length}B) from ${url} — is it an HTML error page?`);
  await writeFile(dest, buf);
  return buf.length;
}

async function normalise(spec) {
  const rawPath = join(RAW, `${spec.id}${extname(spec.url)}`);
  const outPath = join(NORM, `${spec.id}.wav`);
  const n = spec.normalise ?? {};
  const filters = [
    `aformat=sample_rates=${n.rate ?? 44100}:channel_layouts=mono`,
  ];
  if (n.trimStart) filters.unshift(`atrim=start=${n.trimStart}${n.trimEnd ? `:end=${n.trimEnd}` : ""},asetpts=PTS-STARTPTS`);
  if (n.gainDb) filters.push(`volume=${n.gainDb}dB`);
  // loudnorm keeps sourced material at a consistent level so recipes mix predictably
  filters.push("loudnorm=I=-18:TP=-2:LRA=11");
  await run(["-y", "-loglevel", "error", "-i", rawPath, "-af", filters.join(","),
             "-ar", String(n.rate ?? 44100), "-ac", "1", "-c:a", "pcm_s16le", outPath],
            { label: `normalise ${spec.id}` });
  return outPath;
}

function extname(url) {
  const m = url.split("?")[0].match(/\.(wav|ogg|mp3|flac|aif|aiff)$/i);
  return m ? m[0].toLowerCase() : ".bin";
}

async function main() {
  const { values } = parseArgs({ options: {
    list: { type: "boolean", default: false },
    only: { type: "string" },
    force: { type: "boolean", default: false },
  }});

  if (values.list || !SOURCES.length) {
    console.log(`${SOURCES.length} source(s) declared:`);
    for (const s of SOURCES) console.log(`  ${s.id.padEnd(24)} ${s.license.padEnd(5)} ${s.role}`);
    if (!SOURCES.length) {
      console.log("\nSOURCES is empty. Fill it in per Step 2 before running without --list.");
      process.exit(values.list ? 0 : 1);
    }
    return;
  }

  await mkdir(RAW, { recursive: true });
  await mkdir(NORM, { recursive: true });
  const wanted = SOURCES.filter((s) => !values.only || s.id === values.only);
  const entries = existsSync(PROVENANCE) ? JSON.parse(await readFile(PROVENANCE, "utf8")) : {};

  for (const spec of wanted) {
    if (spec.license.toUpperCase() !== "CC0") {
      throw new Error(`REFUSING ${spec.id}: license is "${spec.license}", only CC0 is permitted (spec §4.3)`);
    }
    const rawPath = join(RAW, `${spec.id}${extname(spec.url)}`);
    const outPath = join(NORM, `${spec.id}.wav`);
    if (!values.force && existsSync(outPath) && entries[spec.id]?.url === spec.url) {
      console.log(`  = ${spec.id} (cached)`);
      continue;
    }
    const bytes = existsSync(rawPath) && !values.force ? (await stat(rawPath)).size : await download(spec.url, rawPath);
    await normalise(spec);
    const buf = await readWav(outPath);
    entries[spec.id] = {
      url: spec.url, page: spec.page, author: spec.author, license: spec.license,
      role: spec.role, downloadedAt: new Date().toISOString().slice(0, 10),
      rawBytes: bytes, sha256: await sha256(rawPath),
      normalised: { sampleRate: buf.sampleRate, seconds: +(buf.data.length / buf.sampleRate).toFixed(3) },
    };
    console.log(`  + ${spec.id}  ${(bytes / 1024).toFixed(0)}KB -> ${(buf.data.length / buf.sampleRate).toFixed(2)}s @ ${buf.sampleRate}Hz`);
  }

  await writeFile(PROVENANCE, JSON.stringify(entries, null, 2) + "\n");
  console.log(`\nprovenance: ${PROVENANCE} (${Object.keys(entries).length} entries)`);
}

main().catch((e) => { console.error(e); process.exit(1); });
```

- [ ] **Step 2: Fill in `SOURCES`**

This is a **research step, not a typing step**. The URLs cannot be known in advance and must
not be invented. Procedure:

1. Work out the shopping list from the spec §4.3 table — the six organic textures that
   synthesis fakes badly: **card stock flick, felt thud, paper slap, glass shatter debris,
   resonant metal (blade ring / gong / clang), wood-on-metal chop, fire crackle, rope creak.**
2. Search, in this order of preference (all verified reachable):
   - `https://kenney.nl` — audio packs are CC0 and download as a single zip without auth.
     Unpack into `sources/raw/` manually and point `url` at the pack page for provenance.
   - `https://opengameart.org` — filter by license `CC0` in the search UI; files download
     directly. **Read the license line on each asset page** — OpenGameArt mixes CC0 and CC-BY.
   - `https://github.com` — CC0 game-audio collections; use `raw.githubusercontent.com` URLs.
   - `https://freesound.org` — **browse only.** Downloads need an OAuth/API key we do not
     have. If the user supplies one, it becomes usable; otherwise do not plan around it.
   - `https://pixabay.com` — returns **403**. Do not use.
3. For each candidate, open `page` and confirm the license string is exactly CC0 (or
   "Creative Commons 0"). Reject anything else.
4. Prefer files under 2 MB and under 5 s — long recordings get trimmed anyway.
5. Set `role` to the recipe layer it feeds, so a reviewer can see why it exists.

Aim for **8–14 sources**. More is waste; fewer means synthesis is covering textures it
should not.

- [ ] **Step 3: Run it and verify the outputs are usable**

Run: `node tools/sfx-studio/sources.mjs --list`
Expected: the declared sources with license `CC0` and a role each.

Run: `node tools/sfx-studio/sources.mjs`
Expected: one `+` line per source, then a provenance summary. **Any HTTP failure means the
URL is wrong — delete that entry and find another.** Do not leave a broken URL committed.

Then verify every normalised file is actually loadable by the renderer:

```bash
node -e "
import('./tools/sfx-studio/wav.mjs').then(async ({readWav}) => {
  const {readdirSync} = await import('node:fs');
  const dir='tools/sfx-studio/sources/normalised';
  for (const f of readdirSync(dir).filter(x=>x.endsWith('.wav'))) {
    const b = await readWav(dir+'/'+f);
    if (b.sampleRate!==44100) throw new Error(f+' is '+b.sampleRate+'Hz, renderer requires 44100');
    console.log('  OK', f, (b.data.length/b.sampleRate).toFixed(2)+'s');
  }
  console.log('ALL SOURCES LOADABLE');
}).catch(e=>{console.error(e);process.exit(1)})
"
```
Expected: `ALL SOURCES LOADABLE`. `readWav` throws on stereo or non-16-bit, so this also
proves normalisation worked.

- [ ] **Step 4: Prove the license guard fires**

Temporarily add `{ id: "guard-test", url: "https://example.com/x.wav", page: "https://example.com", author: "t", license: "CC-BY", role: "test" }` to `SOURCES`, then:

Run: `node tools/sfx-studio/sources.mjs --only guard-test`
Expected: exit 1 with `REFUSING guard-test: license is "CC-BY", only CC0 is permitted`.

**Remove the test entry.** Do not commit it.

- [ ] **Step 5: Commit**

```bash
git add tools/sfx-studio/sources.mjs tools/sfx-studio/sources/provenance.json tools/sfx-studio/.gitignore
git commit -m "feat(sfx-studio): CC0 source pipeline with license guard and provenance"
```

`sources/raw/` and `sources/normalised/` stay gitignored — they are reproducible build inputs
and some are megabytes. `provenance.json` **is** committed: it is the license audit trail.

---

### Task 5: The objective quality gate

`check.mjs` is what makes "the SFX actually work" a measurable claim instead of an opinion.
It runs after every render and **fails the build** on any violation.

**Files:**
- Create: `tools/sfx-studio/check.mjs`
- Create: `tools/sfx-studio/build/check-report.md` (generated; gitignored)
- Test: `tools/sfx-studio/check.test.mjs`

**Interfaces:**
- Consumes: `readWav` from `./wav.mjs`, `stats`/`dbToLin` from `./dsp.mjs`, `RECIPES` from `./recipes/index.mjs`, `probeDuration` from `../motion/encode.mjs`.
- Produces:
  - `checkBuffer(data, sampleRate, spec) => Violation[]`
  - `RMS_BANDS: Record<string, [number, number]>` — per-family RMS windows in dBFS.
  - CLI: `node check.mjs [--dir <path>] [--json]` — exit 1 on any violation.

- [ ] **Step 1: Write the failing test**

`tools/sfx-studio/check.test.mjs`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { checkBuffer, RMS_BANDS, BUDGET_MS, RMS_OVERRIDES } from "./check.mjs";
import { osc, applyEnv } from "./dsp.mjs";

const SR = 44100;
const clean = () => {
  const d = osc({ wave: "sine", f: 440, dur: 0.2, sampleRate: SR });
  return applyEnv(d, SR, [[0, 0.5], [0.2, 0]]);   // ~-9 dBFS peak, no head silence
};
const spec = (over = {}) => ({ name: "test-cue", family: "ui", layers: 2, budgetMs: 400, ...over });

test("a well-formed buffer passes every check", () => {
  assert.deepEqual(checkBuffer(clean(), SR, spec()), []);
});

test("rejects a buffer that clips past -1.0 dBFS", () => {
  const d = new Float32Array(SR / 50).fill(0.99);
  const v = checkBuffer(d, SR, spec());
  assert.ok(v.some((x) => x.rule === "peak"), `expected a peak violation, got ${JSON.stringify(v)}`);
});

test("rejects leading silence (the timing bug the spec cares about)", () => {
  const d = new Float32Array(SR / 5);
  d.set(clean(), Math.floor(0.02 * SR));               // 20ms of head silence
  const v = checkBuffer(d, SR, spec());
  assert.ok(v.some((x) => x.rule === "head-silence"), `expected head-silence violation, got ${JSON.stringify(v)}`);
});

test("accepts head silence under 5ms", () => {
  const d = new Float32Array(SR / 5);
  d.set(clean(), Math.floor(0.002 * SR));              // 2ms — legal
  const v = checkBuffer(d, SR, spec());
  assert.ok(!v.some((x) => x.rule === "head-silence"), `2ms should pass: ${JSON.stringify(v)}`);
});

test("rejects a single-layer asset (the no-beeps rule)", () => {
  const v = checkBuffer(clean(), SR, spec({ layers: 1 }));
  assert.ok(v.some((x) => x.rule === "layers"), `expected layers violation, got ${JSON.stringify(v)}`);
});

test("rejects a cue longer than its animation budget", () => {
  const v = checkBuffer(clean(), SR, spec({ budgetMs: 100 }));
  assert.ok(v.some((x) => x.rule === "duration"), `expected duration violation, got ${JSON.stringify(v)}`);
});

test("allows a reverb tail 15% past the budget", () => {
  // 200ms buffer against a 180ms budget: inside the grace window
  const v = checkBuffer(clean(), SR, spec({ budgetMs: 180 }));
  assert.ok(!v.some((x) => x.rule === "duration"), `15% grace should cover this: ${JSON.stringify(v)}`);
});

test("rejects a silent buffer", () => {
  const v = checkBuffer(new Float32Array(SR / 50), SR, spec());
  assert.ok(v.some((x) => x.rule === "rms"), "expected rms violation for silence");
});

test("rejects a DC offset", () => {
  const d = new Float32Array(SR / 50).fill(0.3);
  const v = checkBuffer(d, SR, spec());
  assert.ok(v.some((x) => x.rule === "dc"), "expected dc violation");
});

test("an unknown family is a hard failure, not a silent skip", () => {
  const v = checkBuffer(clean(), SR, spec({ family: "not-a-family" }));
  assert.ok(v.some((x) => x.rule === "family"), `expected family violation, got ${JSON.stringify(v)}`);
});

test("every family with an RMS band also has a duration budget", () => {
  for (const f of Object.keys(RMS_BANDS)) {
    assert.ok(BUDGET_MS[f], `family "${f}" has an RMS band but no BUDGET_MS entry`);
    const [lo, hi] = RMS_BANDS[f];
    assert.ok(lo < hi, `band for ${f} is inverted`);
    assert.ok(BUDGET_MS[f] > 0, `budget for ${f} must be positive`);
  }
  for (const f of Object.keys(BUDGET_MS)) assert.ok(RMS_BANDS[f], `family "${f}" has a budget but no RMS band`);
});

test("every RMS override names a real family band it is exempting", () => {
  // overrides are keyed by ASSET name, not family, so this just guards against typos
  // producing an override that can never match: each must be non-empty and ordered
  for (const [name, band] of Object.entries(RMS_OVERRIDES)) {
    assert.ok(name.length > 0);
    assert.ok(band[0] < band[1], `override for ${name} is inverted`);
  }
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test tools/sfx-studio/check.test.mjs`
Expected: FAIL — `Cannot find module './check.mjs'`

- [ ] **Step 3: Write the implementation**

`tools/sfx-studio/check.mjs`:

```js
/* Objective quality gate. Runs after every render; exit 1 on any violation.
   These checks are what let us claim "the SFX work" without being able to hear them
   (spec §9.1a, §9.2). */

import { readdir, mkdir, writeFile } from "node:fs/promises";
import { join, dirname, resolve, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

import { readWav } from "./wav.mjs";
import { stats, linToDb, dbToLin } from "./dsp.mjs";
import { RECIPES } from "./recipes/index.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "..", "..");
const DEFAULT_DIR = join(REPO, "apps", "web", "assets", "sfx");

export const CEILING_DBFS = -1.0;
export const MAX_HEAD_SILENCE_MS = 5;
export const MIN_LAYERS = 2;
export const HEAD_SILENCE_THRESHOLD_DB = -50;

/* Per-family RMS windows. Narrow on purpose: it is what stops one cue shouting over
   the rest of the mix. Tune ONLY if a whole family legitimately needs to sit higher. */
export const RMS_BANDS = {
  "ui":            [-34, -22],
  "stamp":         [-24, -12],
  "table":         [-30, -18],
  "clash":         [-26, -14],
  "shield":        [-26, -14],
  "score":         [-30, -18],
  "round":         [-26, -14],
  "screens":       [-32, -20],
  "trick-void":    [-28, -14],
  "trick-echo":    [-28, -14],
  "trick-eclipse": [-30, -16],
  "trick-ward":    [-28, -14],
  "trick-reversal":[-28, -14],
  "trick-exec":    [-24, -12],
  "trick-oracle":  [-32, -18],
};

/* Longest step each family must fit inside, from spec §7. A cue may be shorter; it may
   not be longer, or it bleeds into the next beat. */
export const BUDGET_MS = {
  "ui": 600, "stamp": 500, "table": 1600, "clash": 1200, "shield": 3200, "score": 2400,
  "round": 2300, "screens": 1200, "trick-void": 4800, "trick-echo": 4000,
  "trick-eclipse": 4000, "trick-ward": 6200, "trick-reversal": 4600, "trick-exec": 4400,
  "trick-oracle": 4600,
};

/* Assets that are deliberately near-inaudible. Widening a whole family band to accommodate
   one quiet cue would let everything else in that family get away with being too loud. */
export const RMS_OVERRIDES = {
  "duel-thinking": [-46, -30],
  "duel-bubble": [-40, -26],
  "score-chip-slide": [-48, -32],
  "dossier-card-tilt": [-48, -32],
  "trick-exec-bladehold": [-42, -28],
};

/** @returns {Array<{rule: string, message: string}>} */
export function checkBuffer(data, sampleRate, { name, family, layers, budgetMs }) {
  const v = [];
  const s = stats(data);
  const durMs = (data.length / sampleRate) * 1000;

  // An unknown family would silently skip the rms AND duration checks below — that is how
  // a whole batch of assets goes unaudited. Fail loudly instead.
  if (!RMS_BANDS[family]) v.push({ rule: "family", message: `family "${family}" has no RMS band — add it to RMS_BANDS and BUDGET_MS` });
  if (!BUDGET_MS[family]) v.push({ rule: "family", message: `family "${family}" has no duration budget` });

  if (s.peak > dbToLin(CEILING_DBFS) + 1e-4) {
    v.push({ rule: "peak", message: `${s.peakDbfs.toFixed(2)} dBFS exceeds the ${CEILING_DBFS} ceiling` });
  }
  if (s.rms < 1e-6) {
    v.push({ rule: "rms", message: "buffer is silent" });
  } else {
    const band = RMS_OVERRIDES[name] ?? RMS_BANDS[family];
    if (band && (s.rmsDbfs < band[0] || s.rmsDbfs > band[1])) {
      v.push({ rule: "rms", message: `rms ${s.rmsDbfs.toFixed(1)} dBFS outside the ${RMS_OVERRIDES[name] ? `${name} override` : family} band [${band[0]}, ${band[1]}]` });
    }
  }
  if (layers < MIN_LAYERS) {
    v.push({ rule: "layers", message: `${layers} layer(s); spec §2 requires >= ${MIN_LAYERS} (no single-oscillator beeps)` });
  }
  if (budgetMs && durMs > budgetMs * 1.15) {
    // 15% grace for reverb tails, which legitimately outlast the visual beat
    v.push({ rule: "duration", message: `${durMs.toFixed(0)}ms exceeds the ${budgetMs}ms budget (+15% tail grace)` });
  }

  const thr = dbToLin(HEAD_SILENCE_THRESHOLD_DB);
  let first = 0;
  while (first < data.length && Math.abs(data[first]) < thr) first++;
  const headMs = (first / sampleRate) * 1000;
  if (headMs > MAX_HEAD_SILENCE_MS) {
    v.push({ rule: "head-silence", message: `${headMs.toFixed(1)}ms of leading silence (limit ${MAX_HEAD_SILENCE_MS}ms) — this is a timing bug, the runtime schedules by offset` });
  }

  // a DC offset pushes the whole cue off-centre and eats headroom
  let dc = 0;
  for (let i = 0; i < data.length; i++) dc += data[i];
  dc /= Math.max(1, data.length);
  if (Math.abs(dc) > 0.01) v.push({ rule: "dc", message: `DC offset ${dc.toFixed(4)}` });

  return v;
}

async function main() {
  const { values } = parseArgs({ options: {
    dir: { type: "string", default: DEFAULT_DIR },
    json: { type: "boolean", default: false },
  }});

  const byName = new Map(RECIPES.map((r) => [r.name, r]));
  const files = (await readdir(values.dir).catch(() => [])).filter((f) => f.endsWith(".wav")).sort();
  if (!files.length) { console.error(`no .wav files in ${values.dir}`); process.exit(1); }

  const rows = [];
  const orphans = [];
  let bytes = 0;

  for (const f of files) {
    const name = basename(f, ".wav");
    const recipe = byName.get(name);
    if (!recipe) { orphans.push(name); continue; }
    const path = join(values.dir, f);
    const buf = await readWav(path);
    const v = checkBuffer(buf.data, buf.sampleRate, {
      name,
      family: recipe.family,
      layers: recipe.layers.filter((l) => l.kind !== "silence").length,
      budgetMs: BUDGET_MS[recipe.family],
    });
    const s = stats(buf.data);
    rows.push({ name, family: recipe.family, sizeKB: 0, ms: (buf.data.length / buf.sampleRate) * 1000,
                peakDbfs: s.peakDbfs, rmsDbfs: s.rmsDbfs, sr: buf.sampleRate, violations: v });
  }

  const { statSync } = await import("node:fs");
  for (const r of rows) r.sizeKB = statSync(join(values.dir, `${r.name}.wav`)).size / 1024;
  bytes = rows.reduce((a, r) => a + r.sizeKB, 0) * 1024;

  const bad = rows.filter((r) => r.violations.length);
  const missing = RECIPES.filter((r) => !rows.some((x) => x.name === r.name)).map((r) => r.name);

  if (values.json) {
    console.log(JSON.stringify({ rows, orphans, missing }, null, 2));
  } else {
    console.log(`checked ${rows.length} asset(s) in ${values.dir}\n`);
    console.log("  name                       family          ms   peak    rms   KB  ");
    for (const r of rows) {
      console.log(`  ${r.name.padEnd(26)} ${r.family.padEnd(14)} ${r.ms.toFixed(0).padStart(5)} ${r.peakDbfs.toFixed(1).padStart(6)} ${r.rmsDbfs.toFixed(1).padStart(6)} ${r.sizeKB.toFixed(0).padStart(5)} ${r.violations.length ? "  <-- FAIL" : ""}`);
      for (const v of r.violations) console.log(`      ${v.rule}: ${v.message}`);
    }
    console.log(`\n  total ${(bytes / 1048576).toFixed(2)} MB / 16 MB budget   files ${rows.length} / 110 max`);
    if (orphans.length) console.log(`  ORPHAN files with no recipe: ${orphans.join(", ")}`);
    if (missing.length) console.log(`  MISSING recipes never rendered: ${missing.join(", ")}`);
  }

  await mkdir(join(HERE, "build"), { recursive: true });
  await writeFile(join(HERE, "build", "check-report.md"), report(rows, orphans, missing, bytes));

  const fatal = bad.length || orphans.length || missing.length || bytes > 16 * 1048576 || rows.length > 110;
  if (fatal) {
    console.error(`\nCHECK FAILED — ${bad.length} asset(s) with violations, ${orphans.length} orphan(s), ${missing.length} missing.`);
    console.error(`report: tools/sfx-studio/build/check-report.md`);
    process.exit(1);
  }
  console.log("\nCHECK PASSED");
}

function report(rows, orphans, missing, bytes) {
  const bad = rows.filter((r) => r.violations.length);
  return [
    "# SFX render check",
    "",
    `Generated by \`node tools/sfx-studio/check.mjs\`. ${rows.length} assets, ${(bytes / 1048576).toFixed(2)} MB.`,
    "",
    bad.length ? `## FAILURES (${bad.length})` : "## No failures",
    "",
    ...bad.flatMap((r) => [`- **${r.name}** (${r.family})`, ...r.violations.map((v) => `  - ${v.rule}: ${v.message}`)]),
    "",
    orphans.length ? `## Orphan files (no recipe): ${orphans.join(", ")}` : "",
    missing.length ? `## Missing renders: ${missing.join(", ")}` : "",
    "",
    "## All assets",
    "",
    "| asset | family | ms | peak dBFS | rms dBFS | KB |",
    "|---|---|---|---|---|---|",
    ...rows.map((r) => `| ${r.name} | ${r.family} | ${r.ms.toFixed(0)} | ${r.peakDbfs.toFixed(1)} | ${r.rmsDbfs.toFixed(1)} | ${r.sizeKB.toFixed(0)} |`),
    "",
  ].filter((l) => l !== "").join("\n") + "\n";
}

main().catch((e) => { console.error(e); process.exit(1); });
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test tools/sfx-studio/check.test.mjs`
Expected: PASS — 12 tests.

- [ ] **Step 5: Run the gate against the one rendered asset**

Run: `node tools/sfx-studio/render.mjs --family ui && node tools/sfx-studio/check.mjs`
Expected: `CHECK PASSED`, one row for `click`.

Then prove it actually fails — render with silence trimming disabled and re-check:

Run: `node tools/sfx-studio/render.mjs --family ui --keepSilence && node tools/sfx-studio/check.mjs`
Expected: **exit 1** with a `head-silence` violation. Then restore: `node tools/sfx-studio/render.mjs --family ui`.

This step matters: a gate that has never been seen to fail is not a gate.

- [ ] **Step 6: Commit**

```bash
git add tools/sfx-studio/check.mjs tools/sfx-studio/check.test.mjs
git commit -m "feat(sfx-studio): objective quality gate — peak, head silence, RMS band, layer count"
```

---

# TRACK B — The runtime engine

Tasks 6–8 build the engine; Tasks 13–17 wire it. **This track depends only on the four WAVs
that already exist** — every new asset path in the manifest is a promise Track A fulfils
later. That is the whole point of the contract.

### Task 6: vitest setup and `sfx-manifest.ts` — the contract

Adds a test runner to `apps/web` (it has none) and writes the complete cue manifest. This is
the single artefact both tracks agree on.

**Files:**
- Create: `apps/web/vitest.config.ts`
- Create: `apps/web/test/sfx-manifest.test.ts`
- Create: `apps/web/src/lib/sfx-manifest.ts`
- Modify: `apps/web/package.json` — add `vitest` devDep and a `test` script

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `type SfxDef` — `{ src: string; gain?: number; pitch?: number | [number, number]; pan?: number | [number, number]; reverb?: number; reverbIR?: "hall" | "cathedral"; maxVoices?: number; cooldownMs?: number; loop?: boolean }`
  - `const SFX: Record<SfxName, SfxDef>`
  - `type SfxName = keyof typeof SFX`
  - `const SFX_NAMES: SfxName[]` — insertion-ordered, for the audition bench
  - `cueFile(name: SfxName): string` — the `src`, exported so tests can assert on paths
  - `resolvePitch(def: SfxDef, rand: () => number): number`
  - `resolvePan(def: SfxDef, rand: () => number): number`

**Note for Task 20:** the file-existence assertion is deliberately *not* in this task's test —
the assets do not exist yet. Task 20 Step 1 adds it in full, once Track A has rendered.

- [ ] **Step 1: Add vitest to `apps/web`**

`apps/web/vitest.config.ts` — mirrors `packages/ai-brain/vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";

// Node environment: these tests assert on the manifest and on pure cue timelines.
// They need node:fs and node:path, not a DOM. Deliberately NOT the app's
// vite.config.ts — that pulls in the react plugin, which these tests do not need.
export default defineConfig({
  test: {
    include: ["test/*.test.ts"],
    environment: "node",
  },
});
```

`apps/web/package.json` — add the script and the devDependency (vitest 3 is already hoisted
to the root `node_modules/.bin` by `packages/engine`, so this pins the same major rather than
introducing a second copy):

```json
  "scripts": {
    "dev": "vite --port 8081",
    "start": "vite --port 8081",
    "web": "vite --port 8081",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview --port 8081",
    "test": "vitest run"
  },
```
and in `devDependencies`: `"vitest": "^3.0.0"`.

Then run `npm install` from the repo root so the workspace lockfile records it.

`apps/web/tsconfig.json` `include` stays `["src", "vite.config.ts"]` — `test/` is therefore
**not** typechecked by `npm run build`. That is intentional: it keeps vitest's types out of
the app's compile and matches how `packages/engine` handles its `test/` dir.

- [ ] **Step 2: Write the failing test**

`apps/web/test/sfx-manifest.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { SFX, SFX_NAMES, cueFile, resolvePitch, resolvePan, type SfxName } from "../src/lib/sfx-manifest";

describe("sfx manifest structure", () => {
  it("has no duplicate entries and SFX_NAMES matches the object", () => {
    const keys = Object.keys(SFX) as SfxName[];
    expect(new Set(keys).size).toBe(keys.length);
    expect(SFX_NAMES.length).toBe(keys.length);
    for (const n of SFX_NAMES) expect(keys).toContain(n);
  });

  it("every src is an absolute public path to a .wav", () => {
    for (const [name, def] of Object.entries(SFX)) {
      expect(def.src, name).toMatch(/^\/[a-z0-9\-./]+\.wav$/);
      expect(def.src, name).not.toContain("..");
    }
  });

  it("the four legacy sounds keep their exact existing paths (spec §7.22)", () => {
    expect(cueFile("ui.hover")).toBe("/hover.wav");
    expect(cueFile("ui.click")).toBe("/sfx/click.wav");
    expect(cueFile("ui.slider")).toBe("/sfx/slider.wav");
    expect(cueFile("ui.cardPop")).toBe("/sfx/card.wav");
  });

  it("every gain is a sane multiplier", () => {
    for (const [name, def] of Object.entries(SFX)) {
      if (def.gain === undefined) continue;
      expect(def.gain, name).toBeGreaterThan(0);
      expect(def.gain, name).toBeLessThanOrEqual(2);
    }
  });

  it("every pitch range is ordered and positive", () => {
    for (const [name, def] of Object.entries(SFX)) {
      if (def.pitch === undefined) continue;
      if (typeof def.pitch === "number") {
        expect(def.pitch, name).toBeGreaterThan(0);
      } else {
        expect(def.pitch[0], name).toBeGreaterThan(0);
        expect(def.pitch[1], name).toBeGreaterThanOrEqual(def.pitch[0]);
      }
    }
  });

  it("VOID is dry and ORACLE is the wettest family (spec §2 reverb semantics)", () => {
    for (const n of SFX_NAMES) {
      if (n.startsWith("trick.void.")) expect(SFX[n].reverb ?? 0, n).toBe(0);
      if (n.startsWith("trick.oracle.")) expect(SFX[n].reverb ?? 0, n).toBeGreaterThanOrEqual(0.5);
    }
    expect(SFX["trick.oracle.veil"].reverbIR).toBe("cathedral");
    expect(SFX["trick.void.devour"].reverbIR).toBeUndefined();
  });

  it("tick-like cues are throttled so they cannot machine-gun", () => {
    for (const n of ["duel.clash.tick", "duel.showdown.tick", "score.drain.tick", "ui.slider"] as SfxName[]) {
      expect(SFX[n].cooldownMs, n).toBeGreaterThan(0);
      expect(SFX[n].maxVoices, n).toBeLessThanOrEqual(4);
    }
  });

  it("exactly one cue loops — the WARD fire", () => {
    const loopers = SFX_NAMES.filter((n) => SFX[n].loop);
    expect(loopers).toEqual(["trick.ward.fire"]);
  });

  it("the shared assets from spec §5.5 really are shared", () => {
    const stamp = cueFile("duel.stamp");
    // the seven verdict stamps + THRESHOLD MET + SPARED + PEEKED all reuse one asset
    expect(cueFile("shame.stamp")).toBe(stamp);
    const chipFly = cueFile("score.chip.fly");
    expect(chipFly).toBe("/sfx/score-chip-fly.wav");
    expect(cueFile("trick.eclipse.crack")).toBe(cueFile("trick.shieldbreak.crack"));
    expect(cueFile("duel.showdown.tick")).toBe(cueFile("duel.clash.tick"));
    expect(cueFile("duel.error")).toBe(cueFile("ui.error"));
    expect(cueFile("score.chip.fuse")).toBe(cueFile("round.burst"));
    expect(cueFile("round.burstOut")).toBe(cueFile("round.burst"));
    expect(cueFile("ui.modal.out")).toBe(cueFile("ui.modal.in"));
  });

  it("resolvePitch and resolvePan stay inside their declared ranges", () => {
    const rand = () => 0.5;
    for (const [name, def] of Object.entries(SFX)) {
      const p = resolvePitch(def, rand);
      expect(p, name).toBeGreaterThan(0.25);
      expect(p, name).toBeLessThan(4);
      const pan = resolvePan(def, rand);
      expect(pan, name).toBeGreaterThanOrEqual(-1);
      expect(pan, name).toBeLessThanOrEqual(1);
    }
  });

  it("resolvePitch at rand=0 hits the low bound and rand=1 the high bound", () => {
    const def = { src: "/sfx/x.wav", pitch: [0.9, 1.2] as [number, number] };
    expect(resolvePitch(def, () => 0)).toBeCloseTo(0.9, 6);
    expect(resolvePitch(def, () => 1)).toBeCloseTo(1.2, 6);
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npm test --workspace=@pacify/web`
Expected: FAIL — cannot resolve `../src/lib/sfx-manifest`.

- [ ] **Step 4: Write the manifest**

`apps/web/src/lib/sfx-manifest.ts`. This is the whole contract; it is long on purpose.

```ts
/* THE CONTRACT. Cue name -> asset path + mix params.
   Track A renders the files; Track B plays them. Neither needs to know the other's
   internals, only this table. See docs/superpowers/specs/2026-11-04-gameplay-sfx-design.md §5.1.

   Naming: cue "duel.intro.slam" -> "/sfx/duel-intro-slam.wav". Dots become hyphens.
   Several cues intentionally share one file at different gain/pitch/reverb (§5.5) —
   that is the mechanism for the shared ink stamp and the shared chip flight. */

export type SfxDef = {
  src: string;
  gain?: number;
  pitch?: number | [number, number];
  pan?: number | [number, number];
  /** reverb send 0..1. 0 = dry. VOID is always 0 — dryness IS emptiness (spec §2). */
  reverb?: number;
  reverbIR?: "hall" | "cathedral";
  /** concurrency cap for this cue; oldest voice is stolen when exceeded. Default 8. */
  maxVoices?: number;
  /** anti-machine-gun guard for the same cue name. */
  cooldownMs?: number;
  loop?: boolean;
};

export const SFX = {
  // ---- UI (the four legacy files keep their exact paths — spec §7.22) ----
  "ui.hover":     { src: "/hover.wav",        gain: 0.35, pitch: [0.97, 1.04] },
  "ui.click":     { src: "/sfx/click.wav",    gain: 0.92, pitch: [0.98, 1.02] },
  "ui.slider":    { src: "/sfx/slider.wav",   gain: 0.85, pitch: [0.97, 1.03], cooldownMs: 45, maxVoices: 2 },
  "ui.cardPop":   { src: "/sfx/card.wav",     gain: 1.00, pitch: [0.97, 1.03] },
  "ui.back":      { src: "/sfx/ui-back.wav",  gain: 0.80, pitch: [0.98, 1.03] },
  "ui.error":     { src: "/sfx/ui-error.wav", gain: 0.90 },
  "ui.modal.in":  { src: "/sfx/ui-modal-in.wav", gain: 0.70 },
  "ui.modal.out": { src: "/sfx/ui-modal-in.wav", gain: 0.50, pitch: 0.85 },

  // ---- Table: match open + commit phase (spec §7.20) ----
  "duel.intro.slam":    { src: "/sfx/duel-intro-slam.wav",    gain: 1.00, reverb: 0.20 },
  "duel.intro.panel":   { src: "/sfx/duel-intro-panel.wav",   gain: 0.80 },
  "duel.deal":          { src: "/sfx/duel-deal.wav",          gain: 0.75, pitch: [0.95, 1.08], maxVoices: 4 },
  "duel.pick":          { src: "/sfx/duel-pick.wav",          gain: 1.00 },
  "duel.table.impact":  { src: "/sfx/duel-table-impact.wav",  gain: 1.00, reverb: 0.25 },
  "duel.lunge":         { src: "/sfx/duel-lunge.wav",         gain: 0.85 },
  "duel.bubble":        { src: "/sfx/duel-bubble.wav",        gain: 0.60, pitch: [0.97, 1.05] },
  "duel.thinking":      { src: "/sfx/duel-thinking.wav",      gain: 0.35, cooldownMs: 400, maxVoices: 1 },
  "duel.error":         { src: "/sfx/ui-error.wav",           gain: 0.90 },

  // ---- The shared ink stamp (spec §5.5) ----
  "duel.stamp":         { src: "/sfx/duel-stamp.wav",         gain: 1.00, pitch: [0.98, 1.02], reverb: 0.25 },

  // ---- Clash (spec §7.1, §7.2, §7.4, §7.5) ----
  "duel.showdown.tick": { src: "/sfx/duel-clash-tick.wav",    gain: 0.95, maxVoices: 2, cooldownMs: 60 },
  "duel.flip.whoosh":   { src: "/sfx/duel-flip-whoosh.wav",   gain: 0.85 },
  "duel.flip.snap":     { src: "/sfx/duel-flip-snap.wav",     gain: 0.95 },
  "duel.clash.tick":    { src: "/sfx/duel-clash-tick.wav",    gain: 0.90, maxVoices: 2, cooldownMs: 60 },
  "duel.clash.vs":      { src: "/sfx/duel-clash-vs.wav",      gain: 0.90 },
  "duel.clash.lockIn":  { src: "/sfx/duel-clash-lockin.wav",  gain: 1.00, reverb: 0.15 },
  "duel.clash.lockOut": { src: "/sfx/duel-clash-lockout.wav", gain: 0.70 },
  "duel.card.win":      { src: "/sfx/duel-card-win.wav",      gain: 0.95, reverb: 0.20 },
  "duel.card.shatter":  { src: "/sfx/duel-card-shatter.wav",  gain: 0.90, pitch: [0.90, 1.15], pan: [-0.6, 0.6], maxVoices: 6, cooldownMs: 30 },
  "duel.shield.pop":    { src: "/sfx/duel-shield-pop.wav",    gain: 0.80, maxVoices: 2, pitch: [0.97, 1.06] },
  "duel.shield.banner": { src: "/sfx/duel-shield-banner.wav", gain: 0.85 },
  "duel.nullify.smash": { src: "/sfx/duel-nullify-smash.wav", gain: 1.00, reverb: 0.30 },
  "duel.nullify.ring":  { src: "/sfx/duel-nullify-ring.wav",  gain: 0.70, reverb: 0.45 },

  // ---- Shield break (spec §7.3) ----
  "trick.shieldbreak.slam":    { src: "/sfx/trick-shieldbreak-slam.wav",    gain: 1.00, reverb: 0.30 },
  "trick.shieldbreak.crack":   { src: "/sfx/trick-shieldbreak-crack.wav",   gain: 0.85, pitch: [0.95, 1.12], maxVoices: 3 },
  "trick.shieldbreak.shatter": { src: "/sfx/trick-shieldbreak-shatter.wav", gain: 1.00, reverb: 0.35 },

  // ---- Score + multiplier (spec §7.6, §7.7, §7.8, §7.19) ----
  "score.chip.fly":         { src: "/sfx/score-chip-fly.wav",         gain: 0.80, pan: [-0.5, 0.5], maxVoices: 4 },
  "score.chip.pop":         { src: "/sfx/score-chip-pop.wav",         gain: 0.75, pitch: [0.96, 1.08] },
  "score.chip.land":        { src: "/sfx/score-chip-land.wav",        gain: 0.85 },
  "score.chip.death":       { src: "/sfx/score-chip-death.wav",       gain: 0.70 },
  "score.chip.shieldDeath": { src: "/sfx/score-chip-shielddeath.wav", gain: 0.80 },
  "score.chip.slide":       { src: "/sfx/score-chip-slide.wav",       gain: 0.40, cooldownMs: 80, maxVoices: 2 },
  "score.chip.fuse":        { src: "/sfx/round-burst.wav",            gain: 0.90, pitch: 1.15 },
  "score.mult.charge":      { src: "/sfx/score-mult-charge.wav",      gain: 0.90 },
  "score.mult.impact":      { src: "/sfx/score-mult-impact.wav",      gain: 1.00, reverb: 0.30 },
  "score.award.fly":        { src: "/sfx/score-award-fly.wav",        gain: 0.85, pan: [-0.4, 0.4] },
  "score.award.land":       { src: "/sfx/score-award-land.wav",       gain: 0.95 },
  "score.drain.tick":       { src: "/sfx/score-drain-tick.wav",       gain: 0.80, pitch: [0.95, 1.05], maxVoices: 3, cooldownMs: 40 },

  // ---- Round transition + match end (spec §7.18, §7.20) ----
  "round.sweep":    { src: "/sfx/round-sweep.wav",    gain: 0.90 },
  "round.next":     { src: "/sfx/round-next.wav",     gain: 0.85 },
  "round.bars":     { src: "/sfx/round-bars.wav",     gain: 0.60, pitch: [0.95, 1.10], maxVoices: 3 },
  "round.burst":    { src: "/sfx/round-burst.wav",    gain: 0.80, pitch: [0.95, 1.12], maxVoices: 4 },
  "round.burstOut": { src: "/sfx/round-burst.wav",    gain: 0.55, pitch: 0.85 },
  "round.letters":  { src: "/sfx/round-letters.wav",  gain: 0.80 },
  "round.number":   { src: "/sfx/round-number.wav",   gain: 1.00, reverb: 0.20 },
  "round.plate":    { src: "/sfx/round-plate.wav",    gain: 0.70 },
  "round.cutFlash": { src: "/sfx/round-cutflash.wav", gain: 0.75 },
  "round.split":    { src: "/sfx/round-split.wav",    gain: 0.90 },
  "round.panelIn":  { src: "/sfx/round-panelin.wav",  gain: 0.85 },
  "duel.victory":   { src: "/sfx/duel-victory.wav",   gain: 1.00, reverb: 0.35 },
  "duel.defeat":    { src: "/sfx/duel-defeat.wav",    gain: 1.00, reverb: 0.35 },
  "duel.draw":      { src: "/sfx/duel-draw.wav",      gain: 0.95, reverb: 0.30 },

  // ---- VOID: reverb 0 everywhere. Dryness is emptiness (spec §2) ----
  "trick.void.open":   { src: "/sfx/trick-void-open.wav",   gain: 1.00, reverb: 0 },
  "trick.void.mutate": { src: "/sfx/trick-void-mutate.wav", gain: 0.90, reverb: 0 },
  "trick.void.reality":{ src: "/sfx/trick-void-reality.wav",gain: 0.70, reverb: 0 },
  "trick.void.suck":   { src: "/sfx/trick-void-suck.wav",   gain: 0.95, reverb: 0 },
  "trick.void.devour": { src: "/sfx/trick-void-devour.wav", gain: 1.00, reverb: 0 },
  "trick.void.die":    { src: "/sfx/trick-void-die.wav",    gain: 0.85, reverb: 0 },

  // ---- ECHO: pitch-delay doubling, short plate ----
  "trick.echo.shock": { src: "/sfx/trick-echo-shock.wav", gain: 0.95, reverb: 0.20, reverbIR: "hall" },
  "trick.echo.ring":  { src: "/sfx/trick-echo-ring.wav",  gain: 0.80, pitch: [0.90, 1.00], maxVoices: 3, reverb: 0.25 },
  "trick.echo.ghost": { src: "/sfx/trick-echo-ghost.wav", gain: 0.50, pitch: [0.90, 1.05], maxVoices: 2 },

  // ---- ECLIPSE: dark drone, bright corona ----
  "trick.eclipse.drone":  { src: "/sfx/trick-eclipse-drone.wav",  gain: 0.90, reverb: 0.30 },
  "trick.eclipse.corona": { src: "/sfx/trick-eclipse-corona.wav", gain: 0.75, reverb: 0.35 },
  "trick.eclipse.glyph":  { src: "/sfx/trick-eclipse-glyph.wav",  gain: 0.70, pitch: [0.95, 1.08], maxVoices: 2 },
  "trick.eclipse.crack":  { src: "/sfx/trick-shieldbreak-crack.wav", gain: 0.90, maxVoices: 3 },

  // ---- WARD: ritual bell then real sourced fire ----
  "trick.ward.seal":       { src: "/sfx/trick-ward-seal.wav",       gain: 1.00, reverb: 0.35 },
  "trick.ward.eye":        { src: "/sfx/trick-ward-eye.wav",        gain: 0.85, reverb: 0.30 },
  "trick.ward.projectile": { src: "/sfx/trick-ward-projectile.wav", gain: 0.90 },
  "trick.ward.flare":      { src: "/sfx/trick-ward-flare.wav",      gain: 0.60 },
  "trick.ward.impact":     { src: "/sfx/trick-ward-impact.wav",     gain: 1.00, reverb: 0.30 },
  "trick.ward.fire":       { src: "/sfx/trick-ward-fire.wav",       gain: 0.85, loop: true },
  "trick.ward.ash":        { src: "/sfx/trick-ward-ash.wav",        gain: 0.70 },

  // ---- REVERSAL: backwards envelopes, doppler swap ----
  "trick.reversal.vortex": { src: "/sfx/trick-reversal-vortex.wav", gain: 0.95, reverb: 0.30 },
  "trick.reversal.burst":  { src: "/sfx/trick-reversal-burst.wav",  gain: 1.00, reverb: 0.35 },

  // ---- EXECUTIONER: mechanical, dry-ish, short plate ----
  "trick.exec.rise":      { src: "/sfx/trick-exec-rise.wav",      gain: 0.95 },
  "trick.exec.meter":     { src: "/sfx/trick-exec-meter.wav",     gain: 0.85 },
  "trick.exec.target":    { src: "/sfx/trick-exec-target.wav",    gain: 0.80 },
  "trick.exec.zone":      { src: "/sfx/trick-exec-zone.wav",      gain: 0.75, maxVoices: 3, pitch: [0.97, 1.06] },
  "trick.exec.bladeHold": { src: "/sfx/trick-exec-bladehold.wav", gain: 0.60 },
  "trick.exec.rope":      { src: "/sfx/trick-exec-rope.wav",      gain: 0.70 },
  "trick.exec.bladeDrop": { src: "/sfx/trick-exec-bladedrop.wav", gain: 1.00, reverb: 0.25 },
  "trick.exec.chop":      { src: "/sfx/trick-exec-chop.wav",      gain: 1.00, reverb: 0.20 },
  "trick.exec.shake":     { src: "/sfx/trick-exec-shake.wav",     gain: 0.85 },
  "trick.exec.letters":   { src: "/sfx/trick-exec-letters.wav",   gain: 0.80, pitch: [0.95, 1.08], maxVoices: 8, cooldownMs: 25 },
  "trick.exec.scoreZero": { src: "/sfx/trick-exec-scorezero.wav", gain: 0.90 },
  "trick.exec.exit":      { src: "/sfx/trick-exec-exit.wav",      gain: 0.70 },
  "trick.exec.strain":    { src: "/sfx/trick-exec-strain.wav",    gain: 0.90 },
  "trick.exec.sub":       { src: "/sfx/trick-exec-sub.wav",       gain: 0.60 },

  // ---- ORACLE: the wettest family in the game (spec §2) ----
  "trick.oracle.veil":         { src: "/sfx/trick-oracle-veil.wav",         gain: 0.70, reverb: 0.60, reverbIR: "cathedral" },
  "trick.oracle.lens":         { src: "/sfx/trick-oracle-lens.wav",         gain: 0.85, reverb: 0.50, reverbIR: "cathedral" },
  "trick.oracle.scan":         { src: "/sfx/trick-oracle-scan.wav",         gain: 0.70, reverb: 0.55, reverbIR: "cathedral" },
  "trick.oracle.constellation":{ src: "/sfx/trick-oracle-constellation.wav",gain: 0.60, reverb: 0.60, reverbIR: "cathedral" },
  "trick.oracle.face":         { src: "/sfx/trick-oracle-face.wav",         gain: 0.70, maxVoices: 2, reverb: 0.50, reverbIR: "cathedral" },
  "trick.oracle.glint":        { src: "/sfx/trick-oracle-glint.wav",        gain: 0.65, pitch: [0.95, 1.15], maxVoices: 4, reverb: 0.60, reverbIR: "cathedral" },

  // ---- Non-duel screens (spec §7.21) ----
  "campaign.ticket.pick":  { src: "/sfx/campaign-ticket-pick.wav",  gain: 0.90 },
  "campaign.ticket.claim": { src: "/sfx/campaign-ticket-claim.wav", gain: 0.95, reverb: 0.20 },
  "shame.enter":           { src: "/sfx/shame-enter.wav",           gain: 0.85 },
  "shame.stamp":           { src: "/sfx/duel-stamp.wav",            gain: 0.90, pitch: 0.92, reverb: 0.30 },
  "howto.page.turn":       { src: "/sfx/howto-page-turn.wav",       gain: 0.70, pitch: [0.96, 1.06] },
  "dossier.card.tilt":     { src: "/sfx/dossier-card-tilt.wav",     gain: 0.40, cooldownMs: 60, maxVoices: 2 },
} as const satisfies Record<string, SfxDef>;

export type SfxName = keyof typeof SFX;
export const SFX_NAMES = Object.keys(SFX) as SfxName[];

export function cueFile(name: SfxName): string {
  return SFX[name].src;
}

const pick = (v: number | [number, number] | undefined, rand: () => number, fallback: number) => {
  if (v === undefined) return fallback;
  if (typeof v === "number") return v;
  return v[0] + (v[1] - v[0]) * rand();
};

export function resolvePitch(def: SfxDef, rand: () => number): number {
  return pick(def.pitch, rand, 1);
}

export function resolvePan(def: SfxDef, rand: () => number): number {
  return pick(def.pan, rand, 0);
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm test --workspace=@pacify/web`
Expected: PASS — 10 tests.

- [ ] **Step 6: Prove the typecheck still passes**

Run: `npm run build --workspace=@pacify/web`
Expected: `tsc --noEmit` clean. `as const satisfies Record<string, SfxDef>` means a typo in a
field name is a **compile error**, which is the entire reason the manifest is typed.

Note this will also run `vite build`, which is fine — no asset is imported by the bundle, they
are fetched at runtime by URL, so missing WAVs do not break the build.

- [ ] **Step 7: Commit**

```bash
git add apps/web/vitest.config.ts apps/web/test/sfx-manifest.test.ts apps/web/src/lib/sfx-manifest.ts apps/web/package.json package-lock.json
git commit -m "feat(web): SFX manifest — the ~110-cue contract between studio and runtime"
```

---

### Task 7: Rewrite `sfx.ts` as a Web Audio voice pool

Replaces the four `HTMLAudioElement` singletons with an `AudioContext` graph. The BGM half of
the file is **kept almost verbatim** — three surgical additions, listed in Step 3.

**Files:**
- Modify: `apps/web/src/lib/sfx.ts` — replace lines 1–204 (the SFX half); keep lines 206–433 (the BGM half) with the three edits in Step 3.

**Interfaces:**
- Consumes: `SFX`, `SFX_NAMES`, `resolvePitch`, `resolvePan`, `SfxName`, `SfxDef` from `./sfx-manifest`.
- Produces (all existing exports preserved, plus):
  - `play(name: SfxName, opts?: PlayOpts): void`
  - `playAt(name: SfxName, delayMs: number, opts?: PlayOpts): void`
  - `scheduleTimeline(events: CueEventLike[]): TimelineHandle`
  - `cancelTimeline(h: TimelineHandle): void`
  - `duckBgm(multiplier: number, ms?: number): Promise<void>`
  - `listSfx(): SfxName[]`
  - `debugAudio(): { decoded: number; total: number; failed: string[]; liveVoices: number; ctxState: string; unlocked: boolean; enabled: boolean }`
  - `type PlayOpts = { gain?: number; pitch?: number; pan?: number; at?: number }`
  - `type CueEventLike = { cue: SfxName; at: number; gain?: number; pitch?: number; pan?: number }`
  - `type TimelineHandle = { id: number }`

`CueEventLike` is structurally compatible with `duel-cues.ts`'s `CueEvent` (Task 8) without
importing it — that keeps `sfx.ts` free of any dependency on duel logic.

- [ ] **Step 1: Write the failing test**

`apps/web/test/sfx-engine.test.ts`. The engine is browser-only, so this test asserts the parts
that are pure: voice-budget arithmetic and the cooldown gate. It does this by importing the
module with a stubbed `AudioContext`.

```ts
import { describe, it, expect, beforeEach, vi } from "vitest";

// Minimal AudioContext stub. Only what the engine touches.
class FakeParam { value = 1; setValueAtTime(v: number) { this.value = v; return this; } }
class FakeNode {
  gain = new FakeParam(); pan = new FakeParam(); playbackRate = new FakeParam();
  buffer: any = null; loop = false; onended: (() => void) | null = null;
  connect(d: any) { return d; }
  disconnect() {}
  start() {}
  stop() {}
}
class FakeCtx {
  currentTime = 0;
  state: "suspended" | "running" = "suspended";
  sampleRate = 44100;
  destination = new FakeNode();
  createGain() { return new FakeNode(); }
  createStereoPanner() { return new FakeNode(); }
  createBufferSource() { return new FakeNode(); }
  createConvolver() { return { buffer: null, normalize: true, connect(d: any) { return d; }, disconnect() {} }; }
  createBuffer(ch: number, len: number, sr: number) { return { numberOfChannels: ch, length: len, sampleRate: sr, duration: len / sr, getChannelData: () => new Float32Array(len) }; }
  resume() { this.state = "running"; return Promise.resolve(); }
  decodeAudioData(_ab: ArrayBuffer) { return Promise.resolve(this.createBuffer(1, 4410, 44100)); }
}

beforeEach(() => {
  vi.stubGlobal("AudioContext", FakeCtx as any);
  vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, status: 200, arrayBuffer: async () => new ArrayBuffer(8) })) as any);
});

const mod = () => import("../src/lib/sfx");

describe("sfx engine voice policy", () => {
  it("exports every legacy name so the thirteen importers keep working", async () => {
    const s = await mod();
    for (const fn of ["initSfx", "unlockSfx", "playHover", "playClick", "playSliderTick",
      "playCardPop", "sfxReady", "setVolumes", "setSfxEnabled", "initBgm", "unlockBgm",
      "playBgm", "stopBgm", "getCurrentBgm", "bgmReady", "getBgmLevel", "getBgmMuted"]) {
      expect(typeof (s as any)[fn], fn).toBe("function");
    }
    for (const fn of ["play", "playAt", "scheduleTimeline", "cancelTimeline", "duckBgm", "listSfx", "debugAudio"]) {
      expect(typeof (s as any)[fn], fn).toBe("function");
    }
  });

  it("is a silent no-op before unlock and never throws", async () => {
    const s = await mod();
    expect(() => s.play("ui.click")).not.toThrow();
    expect(s.debugAudio().liveVoices).toBe(0);
    expect(s.debugAudio().unlocked).toBe(false);
  });

  it("allocates a voice after unlock", async () => {
    const s = await mod();
    await s.initSfx();
    s.unlockSfx();
    expect(s.debugAudio().unlocked).toBe(true);
    s.play("duel.intro.slam");
    expect(s.debugAudio().liveVoices).toBe(1);
  });

  it("lets a sound overlap itself — the bug the rewrite exists to fix", async () => {
    const s = await mod();
    await s.initSfx(); s.unlockSfx();
    s.play("duel.card.shatter");
    s.play("duel.card.shatter");
    s.play("duel.card.shatter");
    expect(s.debugAudio().liveVoices).toBe(3);
  });

  it("honours per-cue maxVoices by stealing the oldest", async () => {
    const s = await mod();
    await s.initSfx(); s.unlockSfx();
    // duel.thinking declares maxVoices: 1
    for (let i = 0; i < 5; i++) s.play("duel.thinking");
    expect(s.debugAudio().liveVoices).toBeLessThanOrEqual(1);
  });

  it("honours cooldownMs", async () => {
    const s = await mod();
    await s.initSfx(); s.unlockSfx();
    s.play("ui.slider");
    s.play("ui.slider");     // same ctx.currentTime => inside the 45ms cooldown
    expect(s.debugAudio().liveVoices).toBe(1);
  });

  it("never exceeds the 24-voice hard cap", async () => {
    const s = await mod();
    await s.initSfx(); s.unlockSfx();
    // One play of EVERY distinct cue. The fake ctx keeps currentTime at 0, so each cue's
    // cooldown passes on its first call — this exercises the global cap, not the per-cue one.
    // Playing a single cue 200x would be a useless test here: its cooldown would block all
    // but the first and liveVoices would sit at 1.
    const names = s.listSfx();
    expect(names.length).toBeGreaterThan(24);
    for (const n of names) s.play(n);
    expect(s.debugAudio().liveVoices).toBe(24);
  });

  it("setSfxEnabled(false) silences everything", async () => {
    const s = await mod();
    await s.initSfx(); s.unlockSfx();
    s.setSfxEnabled(false);
    s.play("duel.victory");
    expect(s.debugAudio().liveVoices).toBe(0);
    s.setSfxEnabled(true);
    s.play("duel.victory");
    expect(s.debugAudio().liveVoices).toBe(1);
  });

  it("scheduleTimeline allocates every event and cancelTimeline releases them", async () => {
    const s = await mod();
    await s.initSfx(); s.unlockSfx();
    const h = s.scheduleTimeline([
      { cue: "duel.flip.whoosh", at: 0 },
      { cue: "duel.flip.snap", at: 210 },
      { cue: "duel.stamp", at: 1800 },
    ]);
    expect(s.debugAudio().liveVoices).toBe(3);
    s.cancelTimeline(h);
    expect(s.debugAudio().liveVoices).toBe(0);
  });

  it("reports decode failures instead of swallowing them", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 404, arrayBuffer: async () => new ArrayBuffer(0) })) as any);
    vi.resetModules();
    const s = await mod();
    await s.initSfx();
    expect(s.debugAudio().failed.length).toBeGreaterThan(0);
    expect(s.debugAudio().failed[0]).toMatch(/404/);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test --workspace=@pacify/web`
Expected: FAIL — `play is not a function` / `debugAudio is not a function` against the current element-based module.

- [ ] **Step 3: Replace the SFX half of `sfx.ts`**

Delete lines **1–204** (everything from the header comment through `sfxReady()`) and replace
with:

```ts
/* Shared SFX + BGM bank.
   SFX: Web Audio — every asset decoded once into an AudioBuffer, then a FRESH
   AudioBufferSourceNode per voice. That is what lets a sound overlap itself (the
   old single-HTMLAudioElement design could not, so clash/drain ticks cut each
   other off) and what makes pitch randomisation and sample-accurate scheduling
   possible.
   BGM: one looping HTMLAudioElement, crossfaded on route change, duckable.
   The login button click (or ENTER press) is the browser gesture that unlocks
   audio; initSfx/initBgm() run behind the Load screen's progress bar. */

import { SFX, SFX_NAMES, resolvePitch, resolvePan, type SfxName, type SfxDef } from "./sfx-manifest";

export type PlayOpts = { gain?: number; pitch?: number; pan?: number; at?: number };
export type CueEventLike = { cue: SfxName; at: number; gain?: number; pitch?: number; pan?: number };
export type TimelineHandle = { id: number };

const MAX_VOICES = 24;
const DEFAULT_MAX_PER_CUE = 8;

let ctx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let sfxBusGain: GainNode | null = null;
let hallConv: ConvolverNode | null = null;
let cathConv: ConvolverNode | null = null;
let bgm: HTMLAudioElement | null = null;

const buffers = new Map<string, AudioBuffer>();
const failed: string[] = [];
const UNIQUE_SRCS = Array.from(new Set(SFX_NAMES.map((n) => SFX[n].src)));

type Voice = { src: AudioBufferSourceNode; name: SfxName; endsAt: number; timeline: number };
let voices: Voice[] = [];
let timelineSeq = 0;
const timelineVoices = new Map<number, Voice[]>();
const lastPlayed = new Map<SfxName, number>();

let unlocked = false;
let ready = false;
let enabled = true;

// three-bus mixer: MAIN multiplies everything; SFX/BGM are per-bus levels
let main = 0.7;
let sfxBus = 0.48;
let bgmBus = 0.6;
let muteMain = false;
let muteSfx = false;
let muteBgm = false;
let duckMul = 1;

// --- procedural impulse responses ---------------------------------------
// Same algorithm and same tuning as tools/sfx-studio/ir.mjs, so the browser's
// reverb matches what the rendered assets were designed against (spec §5.2).
const IR_PRESETS = {
  hall:      { decay: 1.8, lp: 6500, preDelayMs: 18 },
  cathedral: { decay: 3.2, lp: 4200, preDelayMs: 32 },
} as const;

function makeIrBuffer(ac: AudioContext, preset: keyof typeof IR_PRESETS): AudioBuffer {
  const p = IR_PRESETS[preset];
  const sr = ac.sampleRate;
  const pre = Math.round((p.preDelayMs / 1000) * sr);
  const tail = Math.round(p.decay * sr);
  const buf = ac.createBuffer(1, pre + tail, sr);
  const d = buf.getChannelData(0);
  for (let i = 0; i < tail; i++) {
    const t = i / tail;
    d[pre + i] = (Math.random() * 2 - 1) * Math.pow(1 - t, p.decay) * 0.5;
  }
  // one-pole lowpass darkens the tail the way ir.mjs's biquad does
  let y = 0;
  const a = Math.exp((-2 * Math.PI * p.lp) / sr);
  for (let i = pre; i < d.length; i++) { y = a * y + (1 - a) * d[i]; d[i] = y; }
  return buf;
}

function ensureGraph() {
  if (ctx) return ctx;
  if (typeof window === "undefined") return null;
  try {
    const AC: typeof AudioContext = window.AudioContext ?? (window as any).webkitAudioContext;
    ctx = new AC();
  } catch { return null; }
  masterGain = ctx.createGain();
  sfxBusGain = ctx.createGain();
  hallConv = ctx.createConvolver();
  cathConv = ctx.createConvolver();
  hallConv.normalize = true;
  cathConv.normalize = true;
  try {
    hallConv.buffer = makeIrBuffer(ctx, "hall");
    cathConv.buffer = makeIrBuffer(ctx, "cathedral");
  } catch { /* a convolver without an IR is a pass-through; not fatal */ }
  const hallReturn = ctx.createGain();
  const cathReturn = ctx.createGain();
  hallReturn.gain.value = 0.9;
  cathReturn.gain.value = 0.9;
  sfxBusGain.connect(masterGain);
  hallConv.connect(hallReturn).connect(masterGain);
  cathConv.connect(cathReturn).connect(masterGain);
  masterGain.connect(ctx.destination);
  applyBusGains();
  return ctx;
}

function applyBusGains() {
  if (masterGain) masterGain.gain.value = main * (muteMain ? 0 : 1);
  if (sfxBusGain) sfxBusGain.gain.value = sfxBus * (muteSfx ? 0 : 1);
}

export function setVolumes(m?: number, s?: number, b?: number, mm?: boolean, ms?: boolean, mb?: boolean) {
  if (m !== undefined) main = m;
  if (s !== undefined) sfxBus = s;
  if (b !== undefined) bgmBus = b;
  if (mm !== undefined) muteMain = mm;
  if (ms !== undefined) muteSfx = ms;
  if (mb !== undefined) muteBgm = mb;
  applyBusGains();
  applyBgmVolume();
}

export function setSfxEnabled(b: boolean) { enabled = b; }
export function getBgmLevel() { return bgmBus; }
export function getBgmMuted() { return muteBgm || muteMain; }
export function sfxReady() { return ready; }
export function listSfx(): SfxName[] { return SFX_NAMES; }

export function debugAudio() {
  return {
    decoded: buffers.size,
    total: UNIQUE_SRCS.length,
    failed: [...failed],
    liveVoices: voices.length,
    ctxState: ctx?.state ?? "none",
    unlocked,
    enabled,
  };
}

/* Decode every asset. Resolves on the 6s cap rather than blocking the Load screen's
   progress bar; late decodes still land in the map, and play() on an undecoded buffer
   is a silent no-op. */
export async function initSfx(): Promise<void> {
  if (typeof window === "undefined") { ready = true; return; }
  if (ready) return;
  const ac = ensureGraph();
  if (!ac) { ready = true; return; }
  const work = UNIQUE_SRCS.map(async (src) => {
    try {
      const res = await fetch(src);
      if (!res.ok) { failed.push(`${src}: HTTP ${res.status}`); return; }
      const ab = await res.arrayBuffer();
      buffers.set(src, await ac.decodeAudioData(ab));
    } catch (e) {
      failed.push(`${src}: ${String((e as Error)?.message ?? e)}`);
    }
  });
  await Promise.race([
    Promise.all(work),
    new Promise<void>((r) => setTimeout(r, 6000)),
  ]);
  ready = true;
  applyBusGains();
}

/* MUST be called inside a user-gesture handler. */
export function unlockSfx() {
  unlocked = true;
  const ac = ensureGraph();
  if (ac && ac.state === "suspended") { const p = ac.resume(); if (p) p.catch(() => {}); }
}

function steal(v: Voice) {
  try { v.src.onended = null; v.src.stop(); } catch { /* already stopped */ }
  const i = voices.indexOf(v);
  if (i >= 0) voices.splice(i, 1);
  const tl = timelineVoices.get(v.timeline);
  if (tl) { const j = tl.indexOf(v); if (j >= 0) tl.splice(j, 1); }
}

function allocVoice(name: SfxName, def: SfxDef, opts: PlayOpts, timelineId: number): Voice | null {
  if (!ctx || !sfxBusGain) return null;
  const buf = buffers.get(def.src);
  if (!buf) return null;

  const now = ctx.currentTime;
  const pitch = opts.pitch ?? resolvePitch(def, Math.random);
  const pan = opts.pan ?? resolvePan(def, Math.random);

  const cap = def.maxVoices ?? DEFAULT_MAX_PER_CUE;
  const same = voices.filter((v) => v.name === name);
  if (same.length >= cap) steal(same[0]);
  if (voices.length >= MAX_VOICES) steal(voices[0]);

  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.loop = !!def.loop;
  src.playbackRate.value = Math.max(0.05, Math.min(8, pitch));

  const g = ctx.createGain();
  g.gain.value = (def.gain ?? 1) * (opts.gain ?? 1);
  const p = ctx.createStereoPanner();
  p.pan.value = Math.max(-1, Math.min(1, pan));

  src.connect(g);
  g.connect(p);
  p.connect(sfxBusGain);
  if (def.reverb && def.reverb > 0) {
    const send = ctx.createGain();
    send.gain.value = def.reverb;
    p.connect(send);
    send.connect(def.reverbIR === "cathedral" ? cathConv! : hallConv!);
  }

  const when = now + Math.max(0, (opts.at ?? 0) / 1000);
  const v: Voice = { src, name, endsAt: when + buf.duration / Math.max(0.05, pitch), timeline: timelineId };
  src.onended = () => { const i = voices.indexOf(v); if (i >= 0) voices.splice(i, 1); };
  try {
    src.start(when);
    // A stop() scheduled at or before the start time means the node never sounds,
    // which is exactly what cancelTimeline relies on for not-yet-started events.
    if (!def.loop) src.stop(v.endsAt + 0.02);
  } catch { return null; }
  voices.push(v);
  return v;
}

export function play(name: SfxName, opts: PlayOpts = {}): void {
  if (!enabled || !unlocked || !ctx) return;
  const def = SFX[name];
  if (!def) return;
  if (def.cooldownMs) {
    const nowMs = ctx.currentTime * 1000;
    const last = lastPlayed.get(name);
    if (last !== undefined && nowMs - last < def.cooldownMs) return;
    lastPlayed.set(name, nowMs);
  }
  allocVoice(name, def, opts, 0);
}

export function playAt(name: SfxName, delayMs: number, opts: PlayOpts = {}): void {
  play(name, { ...opts, at: (opts.at ?? 0) + delayMs });
}

/** Schedule a whole beat's cue list against the AudioContext clock in one call.
    Drift-free and immune to setTimeout throttling (spec §5.3). */
export function scheduleTimeline(events: CueEventLike[]): TimelineHandle {
  const id = ++timelineSeq;
  if (enabled && unlocked && ctx) {
    const list: Voice[] = [];
    for (const e of events) {
      const def = SFX[e.cue];
      if (!def) continue;
      const v = allocVoice(e.cue, def, { gain: e.gain, pitch: e.pitch, pan: e.pan, at: e.at }, id);
      if (v) list.push(v);
    }
    timelineVoices.set(id, list);
  } else {
    timelineVoices.set(id, []);
  }
  return { id };
}

export function cancelTimeline(h: TimelineHandle): void {
  const list = timelineVoices.get(h.id);
  if (!list) return;
  for (const v of [...list]) steal(v);
  timelineVoices.delete(h.id);
}

/** Lower the music bus so a cinematic's SFX cut through, then restore.
    multiplier 1 = unducked. */
export function duckBgm(multiplier: number, ms = 250): Promise<void> {
  duckMul = Math.max(0, Math.min(1, multiplier));
  return fadeTo(getEffectiveBgmVol(), ms);
}
```

**Then make these three edits to the BGM half (currently lines 206–433), leaving everything
else in it byte-identical:**

1. In `getEffectiveBgmVol()`, apply the duck multiplier:

```ts
function getEffectiveBgmVol() {
  // keep headroom — max 0.85 so SFX still cuts through; duckMul is the cinematic duck
  return main * (muteMain ? 0 : 1) * bgmBus * (muteBgm ? 0 : 1) * 0.85 * duckMul;
}
```

2. Delete the now-unused `getEffectiveSfxVol()`, `getLoudSfxVol()` and `applyHoverVolume()`
   functions. Their per-cue gain tiers moved into the manifest (`ui.hover` 0.35 ≈ the old
   bus × 0.25 × 1.1 clamp; `ui.click` 0.92 = the old loud tier), and `applyBgmVolume()` is
   the only remaining consumer of `getEffectiveBgmVol()`. **Do not delete
   `applyBgmVolume()`** — the BGM half still calls it.

3. `fadeTo` and `cancelFade` are used by `duckBgm` but declared *below* it in the file.
   Function declarations hoist, so this is fine — **but `fadeTo` must stay a `function`
   declaration, not a `const` arrow**, or `duckBgm` will hit a TDZ error. Verify it is still
   `function fadeTo(targetVol: number, ms: number): Promise<void> {`.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test --workspace=@pacify/web`
Expected: PASS — 10 engine tests + 10 manifest tests.

If `honours cooldownMs` fails with 2 voices, the cooldown check is running *after*
`allocVoice` — it must gate before allocation.

If `never exceeds the 24-voice hard cap` fails, `steal()` is not removing from `voices` —
check the `indexOf`/`splice`.

- [ ] **Step 5: Prove the whole app still typechecks and the legacy wrappers work**

Run: `npm run build`
Expected: all workspaces typecheck clean. This is the real backwards-compatibility gate —
if any of the thirteen importers broke, `tsc` says so here.

Then manually confirm the four legacy wrappers still exist and forward correctly:

Run: `grep -n "export function playHover\|export function playClick\|export function playSliderTick\|export function playCardPop" apps/web/src/lib/sfx.ts`
Expected: **zero matches** — they must have been replaced by the forwarding versions below.
If Step 3 deleted lines 1–204 they are gone; re-add them at the end of the SFX section:

```ts
// ---- legacy named wrappers (thirteen modules import these; names are load-bearing) ----
export function playHover() { play("ui.hover"); }
export function playClick() { play("ui.click"); }
export function playSliderTick() { play("ui.slider"); }
export function playCardPop() { play("ui.cardPop"); }
```

Re-run `npm run build`; expected clean.

- [ ] **Step 6: Smoke it in a real browser**

Run: `npm run dev --workspace=@pacify/web` (background), then open `http://localhost:8081/sfx-test`.
Click any button once to unlock, then in devtools console:

```js
// the four legacy sounds must still work through the new engine
window.__sfx ??= null;
```

Since `sfx.ts` is a module and not on `window`, verify via the network tab instead: confirm
`/hover.wav`, `/sfx/click.wav`, `/sfx/slider.wav`, `/sfx/card.wav` are fetched with status
200, and that the ~97 new paths return **404** (expected — Track A has not rendered them
yet). The engine must not throw on those 404s; it records them in `debugAudio().failed` and
carries on.

Stop the dev server afterwards.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/lib/sfx.ts apps/web/test/sfx-engine.test.ts
git commit -m "feat(web): rebuild sfx.ts on Web Audio — voice pool, pitch variation, timeline scheduling, BGM ducking"
```

---

### Task 8: `duel-cues.ts` — the step-to-timeline table

A **pure function**: `SeqStep` in, `CueEvent[]` out. No React, no audio, no side effects —
so every offset in spec §7 becomes a unit-testable assertion instead of a thing you discover
by watching a match.

**A deliberate improvement over spec §6.2.** The spec suggested hooking the three
`setInterval` sub-tickers (clash, drain, showdown) to fire per-tick sounds. That is
unnecessary: every tick count is derivable from the step data itself —
`maxTick = min(step.you, step.klein)`, `step.from` / `step.tickMs`, and showdown is always 3.
So **all** ticks are pre-scheduled on the AudioContext clock inside the timeline. Benefits:
zero drift, no interval hooks to forget, and cancellation comes free from `cancelTimeline`.
The intervals still drive the *visual* state exactly as they do now; only audio moves.

**Files:**
- Create: `apps/web/src/lib/duel-cues.ts`
- Modify: `apps/web/src/screens/duel.tsx:21` — add `export` to `type SeqStep = …`
- Test: `apps/web/test/duel-cues.test.ts`

**Interfaces:**
- Consumes: `SfxName` from `./sfx-manifest`; `type SeqStep` from `../screens/duel`.
- Produces:
  - `type CueEvent = { cue: SfxName; at: number; gain?: number; pitch?: number; pan?: number }`
  - `cuesForStep(step: SeqStep): CueEvent[]`
  - `shouldDuckBgm(step: SeqStep): boolean`
  - `DUCK_TO = 0.5`, `DUCK_ATTACK_MS = 250`, `DUCK_RELEASE_MS = 800`
  - `EXECUTED_LETTERS = 8`, `ORACLE_GLINTS = 3`, `SHARD_COUNT = 10`

**The `import type` cycle.** `duel.tsx` imports `cuesForStep` from `duel-cues.ts`, and
`duel-cues.ts` imports `type SeqStep` from `duel.tsx`. That is a cycle in the module graph
but **not at runtime** — `import type` is erased by the compiler, and Vite/esbuild strip it.
This is why Step 1 exports the type rather than duplicating it: a duplicated `SeqStep` would
silently drift from the real one.

- [ ] **Step 1: Export `SeqStep`**

In `apps/web/src/screens/duel.tsx`, line 21, change:

```ts
type SeqStep =
```
to:
```ts
export type SeqStep =
```

Nothing else in that union changes. Run `npm run build --workspace=@pacify/web` — expected
clean (adding `export` to a type cannot break a caller).

- [ ] **Step 2: Write the failing test**

`apps/web/test/duel-cues.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { cuesForStep, shouldDuckBgm, EXECUTED_LETTERS, ORACLE_GLINTS, SHARD_COUNT } from "../src/lib/duel-cues";
import { SFX, type SfxName } from "../src/lib/sfx-manifest";
import type { SeqStep } from "../src/screens/duel";

const cues = (s: SeqStep) => cuesForStep(s);
const at = (s: SeqStep, name: SfxName) => cues(s).filter((e) => e.cue === name).map((e) => e.at);
const sorted = (a: number[]) => [...a].sort((x, y) => x - y);

describe("every emitted cue exists in the manifest", () => {
  const ALL: SeqStep[] = [
    { kind: "showdown", ms: 3000 },
    { kind: "flip", ms: 900 },
    { kind: "shieldbreak", ms: 3200 },
    { kind: "clash", ms: 4700, mode: "power", you: 10, klein: 7, ticks: 8 },
    { kind: "clash", ms: 3600, mode: "shield", you: 5, klein: 9, align: "good" },
    { kind: "clash", ms: 3200, mode: "tie", you: 6, klein: 6 },
    { kind: "award", ms: 1500, p1After: 3, p2After: 0, p1Pts: 3 },
    { kind: "multmash", ms: 2400, mult: 2, r7: true, echo: false, base: 3, final: 6, side: "p1" },
    { kind: "drain", ms: 1500, side: "p1", from: 5, tickMs: 200 },
    { kind: "trick", ms: 4800, trick: "void" },
    { kind: "trick", ms: 4000, trick: "echo" },
    { kind: "trick", ms: 4000, trick: "eclipse" },
    { kind: "trick", ms: 6200, trick: "ward" },
    { kind: "trick", ms: 4600, trick: "reversal", p1After: 2, p2After: 9, preP1: 9, preP2: 2 },
    { kind: "trick", ms: 4400, trick: "executioner", wipedSide: "p1", preP1: 6, preP2: 5 },
    { kind: "trick", ms: 3700, trick: "execfail", wipedSide: "p1" },
    { kind: "trick", ms: 4600, trick: "oracle", peekCount: 2 },
    { kind: "idle", ms: 500 },
  ];
  it("resolves every cue name", () => {
    for (const step of ALL) {
      for (const e of cues(step)) {
        expect(SFX[e.cue], `${step.kind}/${(step as any).trick ?? (step as any).mode ?? ""} emitted unknown cue "${e.cue}"`).toBeDefined();
      }
    }
  });
  it("never emits a negative offset", () => {
    for (const step of ALL) for (const e of cues(step)) expect(e.at, `${step.kind} ${e.cue}`).toBeGreaterThanOrEqual(0);
  });
  it("never emits past its own step budget", () => {
    for (const step of ALL) for (const e of cues(step)) {
      expect(e.at, `${step.kind} ${e.cue} at ${e.at} exceeds step.ms ${step.ms}`).toBeLessThanOrEqual(step.ms);
    }
  });
});

describe("showdown — spec §7.1", () => {
  const s: SeqStep = { kind: "showdown", ms: 3000 };
  it("fires exactly three rising ticks on the 1000ms sub-tick", () => {
    expect(at(s, "duel.showdown.tick")).toEqual([0, 1000, 2000]);
    const pitches = cues(s).map((e) => e.pitch);
    expect(pitches).toEqual([1.0, 1.12, 1.26]);
  });
});

describe("flip — spec §7.2", () => {
  const s: SeqStep = { kind: "flip", ms: 900 };
  it("whoosh on the back swing, snap on the face at 210ms", () => {
    expect(at(s, "duel.flip.whoosh")).toEqual([0]);
    expect(at(s, "duel.flip.snap")).toEqual([210]);
  });
});

describe("shieldbreak — spec §7.3", () => {
  const s: SeqStep = { kind: "shieldbreak", ms: 3200 };
  it("slam, three rising cracks, shatter, two stamps", () => {
    expect(at(s, "trick.shieldbreak.slam")).toEqual([0]);
    expect(at(s, "trick.shieldbreak.crack")).toEqual([950, 1100, 1250]);
    expect(at(s, "trick.shieldbreak.shatter")).toEqual([1350]);
    expect(at(s, "duel.stamp")).toEqual([1800, 2150]);
  });
  it("the second stamp is the quiet sub-line variant", () => {
    const stamps = cues(s).filter((e) => e.cue === "duel.stamp");
    expect(stamps[1].gain).toBe(0.5);
    expect(stamps[1].pitch).toBe(0.9);
  });
});

describe("clash shield mode — spec §7.4", () => {
  const s: SeqStep = { kind: "clash", ms: 3600, mode: "shield", you: 5, klein: 9, align: "good" };
  it("plates at 100/220, VS at 380, banner at 850, smash at 1500, stamp at 1800, ring at 1900", () => {
    expect(at(s, "duel.shield.pop")).toEqual([100, 220]);
    expect(at(s, "duel.clash.vs")).toEqual([380]);
    expect(at(s, "duel.shield.banner")).toEqual([850]);
    expect(at(s, "duel.nullify.smash")).toEqual([1500]);
    expect(at(s, "duel.stamp")).toEqual([1800]);
    expect(at(s, "duel.nullify.ring")).toEqual([1900]);
  });
  it("emits no countdown ticks — there is no countdown in shield mode", () => {
    expect(at(s, "duel.clash.tick")).toEqual([]);
  });
});

describe("clash power mode — spec §7.5", () => {
  it("ticks every 500ms up to maxTick = min(you, klein)", () => {
    const s: SeqStep = { kind: "clash", ms: 4700, mode: "power", you: 10, klein: 7, ticks: 8 };
    expect(at(s, "duel.clash.tick")).toEqual([500, 1000, 1500, 2000, 2500, 3000, 3500]);
  });
  it("lock-in, lock-out, win and shatter all land on the freeze tick", () => {
    const s: SeqStep = { kind: "clash", ms: 4700, mode: "power", you: 10, klein: 7, ticks: 8 };
    const freeze = 500 * Math.min(10, 7);
    expect(at(s, "duel.clash.lockIn")).toEqual([freeze]);
    expect(at(s, "duel.clash.lockOut")).toEqual([freeze]);
    expect(at(s, "duel.card.win")).toEqual([freeze]);
    expect(at(s, "duel.card.shatter")[0]).toBe(freeze + 40);
  });
  it("tick pitch rises with the countdown", () => {
    const s: SeqStep = { kind: "clash", ms: 4700, mode: "power", you: 10, klein: 7, ticks: 8 };
    const p = cues(s).filter((e) => e.cue === "duel.clash.tick").map((e) => e.pitch as number);
    for (let i = 1; i < p.length; i++) expect(p[i], `tick ${i}`).toBeGreaterThan(p[i - 1]);
  });
  it("handles maxTick = 0 — the freeze is immediate (duel.tsx:617)", () => {
    const s: SeqStep = { kind: "clash", ms: 1200, mode: "power", you: 3, klein: 0, ticks: 1 };
    expect(at(s, "duel.clash.tick")).toEqual([]);
    expect(at(s, "duel.clash.lockIn")).toEqual([0]);
  });
  it("emits ten shard debris voices", () => {
    const s: SeqStep = { kind: "clash", ms: 4700, mode: "power", you: 10, klein: 7, ticks: 8 };
    expect(cues(s).filter((e) => e.cue === "duel.card.shatter")).toHaveLength(SHARD_COUNT);
    expect(SHARD_COUNT).toBe(10);
  });
});

describe("clash tie mode — spec §7.5", () => {
  const s: SeqStep = { kind: "clash", ms: 3200, mode: "tie", you: 6, klein: 6 };
  it("shatters BOTH sides and stamps TIE", () => {
    expect(at(s, "duel.stamp")).toEqual([500 * 6 + 120]);
    // two full shard fans, one per side
    expect(cues(s).filter((e) => e.cue === "duel.card.shatter")).toHaveLength(SHARD_COUNT * 2);
  });
  it("pans the two sides apart", () => {
    const pans = cues(s).filter((e) => e.cue === "duel.card.shatter").map((e) => e.pan as number);
    expect(Math.min(...pans)).toBeLessThan(0);
    expect(Math.max(...pans)).toBeGreaterThan(0);
  });
});

describe("multmash — spec §7.6", () => {
  const s: SeqStep = { kind: "multmash", ms: 2400, mult: 2, r7: true, echo: false, base: 3, final: 6, side: "p1" };
  it("chip flies from 0, charge at 60, impact and stamp together at 1500", () => {
    expect(at(s, "score.chip.fly")).toEqual([0]);
    expect(at(s, "score.mult.charge")).toEqual([60]);
    expect(at(s, "score.mult.impact")).toEqual([1500]);
    expect(at(s, "duel.stamp")).toEqual([1500]);
  });
  it("the x-N stamp is the loud variant", () => {
    expect(cues(s).find((e) => e.cue === "duel.stamp")?.gain).toBe(1.2);
  });
});

describe("award — spec §7.7", () => {
  it("flies at 0, lands at 1300, panned to the winner", () => {
    const p1: SeqStep = { kind: "award", ms: 1500, p1After: 3, p2After: 0, p1Pts: 3 };
    expect(at(p1, "score.award.fly")).toEqual([0]);
    expect(at(p1, "score.award.land")).toEqual([1300]);
    expect(cues(p1).find((e) => e.cue === "score.award.fly")?.pan).toBeGreaterThan(0);
    const p2: SeqStep = { kind: "award", ms: 1400, p1After: 0, p2After: 3, p2Pts: 3 };
    expect(cues(p2).find((e) => e.cue === "score.award.fly")?.pan).toBeLessThan(0);
  });
});

describe("drain — spec §7.8", () => {
  it("ticks once per point on the adaptive tickMs", () => {
    const s: SeqStep = { kind: "drain", ms: 1700, side: "p1", from: 5, tickMs: 200 };
    expect(at(s, "score.drain.tick")).toEqual([200, 400, 600, 800, 1000]);
  });
  it("handles the fastest legal tick rate (90ms)", () => {
    const s: SeqStep = { kind: "drain", ms: 2000, side: "p2", from: 14, tickMs: 90 };
    expect(at(s, "score.drain.tick")).toHaveLength(14);
    expect(at(s, "score.drain.tick")[0]).toBe(90);
  });
});

describe("VOID — spec §7.9", () => {
  const s: SeqStep = { kind: "trick", ms: 4800, trick: "void" };
  it("devour lands on the canvas shock frame at 2280", () => {
    expect(at(s, "trick.void.devour")).toEqual([2280]);
    expect(at(s, "trick.void.open")).toEqual([0]);
    expect(at(s, "trick.void.reality")).toEqual([500]);
    expect(at(s, "trick.void.suck")).toEqual([1200]);
    expect(at(s, "duel.stamp")).toEqual([2600]);
    expect(at(s, "trick.void.die")).toEqual([4100]);
  });
  it("ducks the BGM", () => { expect(shouldDuckBgm(s)).toBe(true); });
});

describe("ECHO — spec §7.10", () => {
  const s: SeqStep = { kind: "trick", ms: 4000, trick: "echo" };
  it("three rings each a fifth lower", () => {
    expect(at(s, "trick.echo.ring")).toEqual([120, 250, 380]);
    const p = cues(s).filter((e) => e.cue === "trick.echo.ring").map((e) => e.pitch as number);
    expect(p[0]).toBeCloseTo(1.0, 5);
    expect(p[1]).toBeCloseTo(0.8, 5);
    expect(p[2]).toBeCloseTo(2 / 3, 3);      // a fifth down
  });
  it("chip pops at 800 and lobs at 900", () => {
    expect(at(s, "score.chip.pop")).toEqual([800]);
    expect(at(s, "score.chip.fly")).toEqual([900]);
  });
});

describe("ECLIPSE — spec §7.11", () => {
  const s: SeqStep = { kind: "trick", ms: 4000, trick: "eclipse" };
  it("drone, corona, stamp, two glyphs, crack, lob", () => {
    expect(at(s, "trick.eclipse.drone")).toEqual([0]);
    expect(at(s, "trick.eclipse.corona")).toEqual([300]);
    expect(at(s, "duel.stamp")).toEqual([400]);
    expect(at(s, "trick.eclipse.glyph")).toEqual([1450, 1540]);
    expect(at(s, "trick.eclipse.crack")).toEqual([1600]);
    expect(at(s, "score.chip.fly")).toEqual([1900]);
  });
});

describe("WARD — spec §7.12", () => {
  const s: SeqStep = { kind: "trick", ms: 6200, trick: "ward" };
  it("seal, eye, projectile, flare, impact, fire, ash, stamp", () => {
    expect(at(s, "trick.ward.seal")).toEqual([180]);
    expect(at(s, "trick.ward.eye")).toEqual([500]);
    expect(at(s, "trick.ward.projectile")).toEqual([650]);
    expect(at(s, "trick.ward.flare")).toEqual([800]);
    expect(at(s, "trick.ward.impact")).toEqual([1100]);
    expect(at(s, "trick.ward.fire")).toEqual([2400]);
    expect(at(s, "trick.ward.ash")).toEqual([4700]);
    expect(at(s, "duel.stamp")).toEqual([4900]);
  });
});

describe("REVERSAL — spec §7.13", () => {
  const s: SeqStep = { kind: "trick", ms: 4600, trick: "reversal", p1After: 2, p2After: 9, preP1: 9, preP2: 2 };
  it("vortex, burst at 1100 with two opposite-panned score flights, stamp at 2300", () => {
    expect(at(s, "trick.reversal.vortex")).toEqual([0]);
    expect(at(s, "trick.reversal.burst")).toEqual([1100]);
    const flies = cues(s).filter((e) => e.cue === "score.chip.fly");
    expect(flies.map((e) => e.at)).toEqual([1100, 1100]);
    expect(flies[0].pan).toBeLessThan(0);
    expect(flies[1].pan).toBeGreaterThan(0);
    expect(at(s, "duel.stamp")).toEqual([2300]);
  });
});

describe("EXECUTIONER — spec §7.14", () => {
  const s: SeqStep = { kind: "trick", ms: 4400, trick: "executioner", wipedSide: "p1", preP1: 6, preP2: 5 };
  it("the blade drops at 2350", () => {
    expect(at(s, "trick.exec.bladeDrop")).toEqual([2350]);
  });
  it("full beat order", () => {
    expect(at(s, "trick.exec.rise")).toEqual([0]);
    expect(at(s, "trick.exec.meter")).toEqual([520]);
    expect(at(s, "trick.exec.target")).toEqual([820]);
    expect(at(s, "trick.exec.zone")).toEqual([1560]);
    expect(at(s, "duel.stamp")).toEqual([1600]);
    expect(at(s, "trick.exec.bladeHold")).toEqual([1650]);
    expect(at(s, "trick.exec.rope")).toEqual([2160]);
    expect(at(s, "trick.exec.chop")).toEqual([2500]);
    expect(at(s, "trick.exec.shake")).toEqual([2530]);
    expect(at(s, "trick.exec.scoreZero")).toEqual([3280]);
    expect(at(s, "trick.exec.exit")).toEqual([3820]);
  });
  it("one letter slam per letter of EXECUTED, 55ms apart from 2880", () => {
    const letters = at(s, "trick.exec.letters");
    expect(letters).toHaveLength(EXECUTED_LETTERS);
    expect("EXECUTED".length).toBe(EXECUTED_LETTERS);
    expect(letters[0]).toBe(2880);
    expect(letters[letters.length - 1]).toBe(2880 + 55 * 7);
  });
  it("does NOT emit the misfire-only cues", () => {
    expect(at(s, "trick.exec.strain")).toEqual([]);
    expect(at(s, "trick.exec.sub")).toEqual([]);
  });
});

describe("EXECUTIONER misfire — spec §7.15", () => {
  const s: SeqStep = { kind: "trick", ms: 3700, trick: "execfail", wipedSide: "p1" };
  it("strains but never drops the blade", () => {
    expect(at(s, "trick.exec.bladeDrop")).toEqual([]);
    expect(at(s, "trick.exec.chop")).toEqual([]);
    expect(at(s, "trick.exec.strain")).toEqual([1560]);
  });
  it("shares rise/exit with the real execution, detunes the meter", () => {
    expect(at(s, "trick.exec.rise")).toEqual([0]);
    expect(at(s, "trick.exec.exit")).toEqual([3300]);
    expect(cues(s).find((e) => e.cue === "trick.exec.meter")?.pitch).toBeLessThan(1);
    expect(at(s, "duel.stamp")).toEqual([2210]);
    expect(at(s, "trick.exec.sub")).toEqual([2560]);
  });
});

describe("ORACLE — spec §7.16", () => {
  it("yours: one face burn per peeked card", () => {
    const s = { kind: "trick", ms: 4600, trick: "oracle", peekCards: [{ id: "angel" }, { id: "ogre" }] } as unknown as SeqStep;
    expect(at(s, "trick.oracle.face")).toEqual([2100, 2340]);
  });
  it("Klein's: no face burns, the player never sees the cards", () => {
    const s: SeqStep = { kind: "trick", ms: 4600, trick: "oracle", peekCount: 2 };
    expect(at(s, "trick.oracle.face")).toEqual([]);
  });
  it("veil, lens, scan, constellation, stamp, glints", () => {
    const s: SeqStep = { kind: "trick", ms: 4600, trick: "oracle", peekCount: 2 };
    expect(at(s, "trick.oracle.veil")).toEqual([0]);
    expect(at(s, "trick.oracle.lens")).toEqual([0]);
    expect(at(s, "trick.oracle.scan")).toEqual([350]);
    expect(at(s, "trick.oracle.constellation")).toEqual([600]);
    expect(at(s, "duel.stamp")).toEqual([2100]);
    expect(at(s, "trick.oracle.glint")).toHaveLength(ORACLE_GLINTS);
    expect(at(s, "trick.oracle.glint")[0]).toBe(3000);
    expect(at(s, "score.chip.fly")[0]).toBe(3450);
  });
});

describe("idle — spec §7.17", () => {
  it("is silent on purpose", () => {
    expect(cues({ kind: "idle", ms: 500 })).toEqual([]);
  });
});

describe("BGM ducking — spec §8", () => {
  it("ducks for trick and multmash steps only", () => {
    expect(shouldDuckBgm({ kind: "trick", ms: 4800, trick: "void" })).toBe(true);
    expect(shouldDuckBgm({ kind: "multmash", ms: 2400, mult: 2, r7: true, echo: false, base: 3, final: 6, side: "p1" })).toBe(true);
    expect(shouldDuckBgm({ kind: "showdown", ms: 3000 })).toBe(false);
    expect(shouldDuckBgm({ kind: "flip", ms: 900 })).toBe(false);
    expect(shouldDuckBgm({ kind: "clash", ms: 3600, mode: "shield" })).toBe(false);
    expect(shouldDuckBgm({ kind: "award", ms: 1500, p1After: 1, p2After: 0 })).toBe(false);
    expect(shouldDuckBgm({ kind: "idle", ms: 500 })).toBe(false);
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npm test --workspace=@pacify/web`
Expected: FAIL — cannot resolve `../src/lib/duel-cues`.

- [ ] **Step 4: Write the implementation**

`apps/web/src/lib/duel-cues.ts`:

```ts
/* SeqStep -> cue timeline. PURE: no React, no audio, no side effects, so every
   offset from spec §7 is unit-testable. Offsets are milliseconds from the start of
   the containing step and are taken from the CSS animation delays in duel.tsx /
   duel-keyframes.ts.

   All sub-ticker cues (showdown 3-2-1, clash countdown, score drain) are
   pre-scheduled here rather than hooked into the driver's setInterval loops —
   every count is derivable from the step data, and scheduling on the AudioContext
   clock is drift-free. */

import type { SfxName } from "./sfx-manifest";
import type { SeqStep } from "../screens/duel";

export type CueEvent = { cue: SfxName; at: number; gain?: number; pitch?: number; pan?: number };

export const EXECUTED_LETTERS = 8;   // "EXECUTED".length
export const ORACLE_GLINTS = 3;      // calibrate against /duel?demo=oracle
export const SHARD_COUNT = 10;       // dShardOut count, duel.tsx:909-930 / 961-983

export const DUCK_TO = 0.5;
export const DUCK_ATTACK_MS = 250;
export const DUCK_RELEASE_MS = 800;

const e = (cue: SfxName, at: number, extra?: Partial<Omit<CueEvent, "cue" | "at">>): CueEvent =>
  ({ cue, at, ...extra });

/** Shatter fan: the loser card emits SHARD_COUNT debris voices staggered 45ms,
    spread across the stereo field. `side` pans the whole fan. */
function shards(startAt: number, side: -1 | 0 | 1): CueEvent[] {
  const out: CueEvent[] = [];
  for (let i = 0; i < SHARD_COUNT; i++) {
    const spread = (i / (SHARD_COUNT - 1)) * 2 - 1;            // -1..1
    out.push(e("duel.card.shatter", startAt + 45 * i, {
      pitch: 0.9 + (i % 4) * 0.08,
      pan: Math.max(-1, Math.min(1, side * 0.4 + spread * 0.5)),
      gain: 0.55 + (i % 3) * 0.12,
    }));
  }
  return out;
}

function clashTicks(step: Extract<SeqStep, { kind: "clash" }>): CueEvent[] {
  const maxTick = Math.min(step.you ?? 0, step.klein ?? 0);
  const out: CueEvent[] = [];
  for (let i = 1; i <= maxTick; i++) {
    // rising tension: ~a semitone per tick, capped so a 12v12 does not squeal
    out.push(e("duel.clash.tick", 500 * i, { pitch: Math.min(1.5, 1 + i * 0.035) }));
  }
  return out;
}

export function cuesForStep(step: SeqStep): CueEvent[] {
  switch (step.kind) {
    case "showdown":
      // 3-2-1, each number re-slams on the 1000ms sub-tick (duel.tsx:661)
      return [0, 1, 2].map((i) => e("duel.showdown.tick", 1000 * i, { pitch: [1.0, 1.12, 1.26][i] }));

    case "flip":
      // dFlipBack 260ms at 0, dFlipFace 380ms at 210
      return [e("duel.flip.whoosh", 0), e("duel.flip.snap", 210)];

    case "shieldbreak":
      return [
        e("trick.shieldbreak.slam", 0),
        e("trick.shieldbreak.crack", 950, { pitch: 0.95 }),
        e("trick.shieldbreak.crack", 1100, { pitch: 1.03 }),
        e("trick.shieldbreak.crack", 1250, { pitch: 1.12 }),
        e("trick.shieldbreak.shatter", 1350),
        e("duel.stamp", 1800),                                  // SHIELDS DOWN
        e("duel.stamp", 2150, { gain: 0.5, pitch: 0.9 }),       // sub-line
      ];

    case "clash": {
      if (step.mode === "shield") {
        return [
          e("duel.shield.pop", 100), e("duel.shield.pop", 220, { pitch: 1.06 }),
          e("duel.clash.vs", 380),
          e("duel.shield.banner", 850),
          e("duel.nullify.smash", 1500),
          e("duel.stamp", 1800),                                // NULLIFIED
          e("duel.nullify.ring", 1900),
        ];
      }
      const maxTick = Math.min(step.you ?? 0, step.klein ?? 0);
      const out: CueEvent[] = clashTicks(step);
      // duel.tsx:617 — maxTick === 0 freezes immediately at step start
      const freeze = maxTick === 0 ? 0 : 500 * maxTick;
      const tie = step.mode === "tie";
      out.push(e("duel.clash.lockIn", freeze));
      out.push(e("duel.clash.lockOut", freeze));
      if (!tie) {
        out.push(e("duel.card.win", freeze));
        // the winner is whoever kept power; pan the loser's shards to their side
        const youWon = (step.you ?? 0) > (step.klein ?? 0);
        out.push(...shards(freeze + 40, youWon ? -1 : 1));
      } else {
        out.push(...shards(freeze + 40, -1));                   // both cards die
        out.push(...shards(freeze + 40, 1));
        out.push(e("duel.stamp", freeze + 120));                // TIE!
      }
      return out;
    }

    case "multmash":
      return [
        e("score.chip.fly", 0, { pan: step.side === "p1" ? 0.4 : -0.4 }),
        e("score.mult.charge", 60),
        e("score.mult.impact", 1500),
        e("duel.stamp", 1500, { gain: 1.2 }),                   // x-N
      ];

    case "award": {
      // +N badge flies to the winner's chip over 1.3s; score lands at step end
      const toP1 = (step.p1Pts ?? 0) > 0;
      return [
        e("score.award.fly", 0, { pan: toP1 ? 0.4 : -0.4 }),
        e("score.award.land", 1300),
      ];
    }

    case "drain": {
      const out: CueEvent[] = [];
      // the driver's interval first fires at tickMs, once per point
      for (let i = 1; i <= step.from; i++) {
        out.push(e("score.drain.tick", step.tickMs * i, { pitch: Math.min(1.4, 1 + i * 0.02) }));
      }
      return out;
    }

    case "trick":
      return trickCues(step);

    case "idle":
      return [];                                                 // deliberate rest (spec §7.17)
  }
}

function trickCues(step: Extract<SeqStep, { kind: "trick" }>): CueEvent[] {
  switch (step.trick) {
    case "void":
      // reverb 0 on every one of these — dryness IS emptiness (spec §2)
      return [
        e("trick.void.open", 0),
        e("trick.void.mutate", 0, { gain: 0.8 }),
        e("trick.void.reality", 500),
        e("trick.void.suck", 1200),
        e("trick.void.devour", 2280),                            // the canvas shock frame
        e("duel.stamp", 2600),                                   // ROUND VOIDED
        e("trick.void.die", 4100),
      ];

    case "echo":
      return [
        e("trick.echo.shock", 0),
        e("trick.echo.ring", 120, { pitch: 1.0 }),
        e("trick.echo.ring", 250, { pitch: 0.8 }),
        e("trick.echo.ring", 380, { pitch: 2 / 3 }),             // a fifth down
        e("duel.stamp", 400),                                    // CLASH VOIDED / NEXT x2
        e("trick.echo.ghost", 420),
        e("trick.echo.ghost", 600, { pitch: 0.95 }),
        e("score.chip.pop", 800),
        e("score.chip.fly", 900),                                // lobPath()
      ];

    case "eclipse":
      return [
        e("trick.eclipse.drone", 0),
        e("trick.eclipse.corona", 300),
        e("duel.stamp", 400),
        e("trick.eclipse.glyph", 1450),
        e("trick.eclipse.glyph", 1540, { pitch: 1.06 }),
        e("trick.eclipse.crack", 1600),
        e("score.chip.fly", 1900),
      ];

    case "ward":
      return [
        e("trick.ward.seal", 180),
        e("trick.ward.eye", 500),
        e("trick.ward.projectile", 650),
        e("trick.ward.flare", 800),
        e("trick.ward.impact", 1100),
        e("trick.ward.fire", 2400),                              // loops; stop at 4550
        e("trick.ward.ash", 4700),
        e("duel.stamp", 4900),                                   // BURNED
      ];

    case "reversal":
      return [
        e("trick.reversal.vortex", 0),
        e("trick.reversal.burst", 1100),
        // both totals cross on rvFlyPathYou/Klein at the burst
        e("score.chip.fly", 1100, { pan: -0.8 }),
        e("score.chip.fly", 1100, { pan: 0.8 }),
        e("duel.stamp", 2300),                                   // SWAPPED
      ];

    case "executioner": {
      const out: CueEvent[] = [
        e("trick.exec.rise", 0),
        e("trick.exec.meter", 520),
        e("trick.exec.target", 820),
        e("trick.exec.zone", 1560),
        e("duel.stamp", 1600),                                   // THRESHOLD MET
        e("trick.exec.bladeHold", 1650),
        e("trick.exec.rope", 2160),
        e("trick.exec.bladeDrop", 2350),                         // THE money beat
        e("trick.exec.chop", 2500),
        e("trick.exec.shake", 2530),
      ];
      for (let i = 0; i < EXECUTED_LETTERS; i++) {
        out.push(e("trick.exec.letters", 2880 + 55 * i, { pitch: 0.95 + (i % 3) * 0.06 }));
      }
      out.push(e("trick.exec.scoreZero", 3280));
      out.push(e("trick.exec.exit", 3820));
      return out;
    }

    case "execfail":
      // the blade strains and never drops — no bladeDrop, no chop
      return [
        e("trick.exec.rise", 0),
        e("trick.exec.meter", 620, { pitch: 0.9, gain: 0.7 }),   // stalls short
        e("trick.exec.strain", 1560),
        e("duel.stamp", 2210),                                   // SPARED
        e("trick.exec.sub", 2560),
        e("trick.exec.exit", 3300),
      ];

    case "oracle": {
      const out: CueEvent[] = [
        e("trick.oracle.veil", 0),
        e("trick.oracle.lens", 0, { gain: 0.9 }),
        e("trick.oracle.scan", 350),
        e("trick.oracle.constellation", 600),
        e("duel.stamp", 2100),                                   // PEEKED / HAND SEEN
      ];
      // only YOUR oracle burns card faces through — Klein's you never see
      const faces = step.peekCards?.length ?? 0;
      for (let i = 0; i < faces; i++) out.push(e("trick.oracle.face", 2100 + 240 * i));
      for (let i = 0; i < ORACLE_GLINTS; i++) {
        out.push(e("trick.oracle.glint", 3000 + 200 * i, { pitch: 1 + i * 0.07 }));
        out.push(e("score.chip.fly", 3450 + 200 * i, { pan: -0.3 + i * 0.3, gain: 0.6 }));
      }
      return out;
    }

    default:
      return [];
  }
}

/** Trick cinematics and the multiplier mash duck the music (spec §8). */
export function shouldDuckBgm(step: SeqStep): boolean {
  return step.kind === "trick" || step.kind === "multmash";
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm test --workspace=@pacify/web`
Expected: PASS — all duel-cues tests plus the manifest and engine suites.

If `never emits past its own step budget` fails on the executioner, the last letter is at
`2880 + 55·7 = 3265` and `scoreZero` at 3280, `exit` at 3820 — all inside 4400. A failure
there means an offset was mistyped against spec §7.14.

- [ ] **Step 6: Typecheck**

Run: `npm run build`
Expected: clean. This also proves the `import type { SeqStep } from "../screens/duel"` cycle
is erased and Vite can still bundle `duel.tsx`.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/lib/duel-cues.ts apps/web/test/duel-cues.test.ts apps/web/src/screens/duel.tsx
git commit -m "feat(web): duel cue timelines — pure SeqStep -> audio event table, unit-tested"
```

`duel.tsx` is in this commit **only** for the one-word `export` on line 21. Verify with
`git diff --cached apps/web/src/screens/duel.tsx` that the diff is exactly that, and nothing
from the pre-existing uncommitted work in that file. If other changes appear, unstage the
file and re-add with `git add -p`.

---

# TRACK A — Asset authoring

Tasks 9–14 render the 101 assets. Each task follows the identical cycle: **write recipes →
render → pass `check.mjs` → audition against the matching ANIM LAB scenario → commit.**

Every task's design table gives the *intent* and the *layer skeleton*. The specialist owns the
final numbers — that is the job — but `check.mjs` is non-negotiable and spec §7's offsets are
binding. Where a table says "sourced", the sample comes from `sources/normalised/<id>.wav`
(Task 4) and must be processed inside the recipe, never shipped raw.

**The audition step is not optional and is not "listen to it".** It is: open the named ANIM
LAB scenario, watch the beat, and confirm the sound's *attack* coincides with the visual
transient. Nobody can judge timbre here; everybody can judge whether a hit lands on the right
frame. Record what was checked in the commit message.

### Task 9: Render — UI, stamp, and table families (16 assets)

**Files:**
- Modify: `tools/sfx-studio/recipes/ui.mjs` (extend from the one `click` stub)
- Create: `tools/sfx-studio/recipes/table.mjs`
- Create: `tools/sfx-studio/recipes/stamp.mjs`
- Modify: `tools/sfx-studio/recipes/index.mjs` — import and spread `table`, `stamp`

**Interfaces:**
- Consumes: `renderRecipe` via the CLI, `RECIPES`, sources from Task 4.
- Produces: the 16 files listed below in `apps/web/assets/sfx/`.

| asset | family | budget | design |
|---|---|---|---|
| `hover` | ui | 120ms | **writes `/hover.wav` — see the path note below.** Dry paper tick: 4ms bandpassed white noise @3.2kHz q1.6 + a 90ms sine at 1180Hz decaying exp. Very quiet (normalise −14) — it plays constantly |
| `click` | ui | 200ms | Already written in Task 3. Keep |
| `slider` | ui | 90ms | Tighter and drier than `hover`: 2ms noise burst @4.5kHz + 60ms tri @880→660 exp glide. normalise −12 |
| `card` | ui | 300ms | Card stock flick. Sourced `card-flick` layer pitched 1.0 + a 180ms lowpassed brown-noise body @400Hz for the felt. normalise −6 |
| `ui-back` | ui | 250ms | `click` shape but descending: tri 440→260 exp, plus the noise transient. Reads as "return" |
| `ui-error` | ui | 500ms | Two detuned squares (196Hz + 203Hz) through a lowpass @900Hz, 3 pulses 130ms apart, no reverb. Dissonance is the signal |
| `ui-modal-in` | ui | 350ms | Paper slap: sourced `paper-slap` + a 200ms sine 320Hz body, hall send 0.15 |
| `duel-stamp` | stamp | 500ms | **The most-reused asset in the game (spec §5.5).** Heavy rubber-ink stamp: sourced `paper-slap` pitched 0.6 for weight + a 90ms sine 110Hz thud + 250ms bandpassed noise @1.8kHz for the ink texture. plate reverb 0.2. Must survive being pitched 0.85–1.15 by callers without turning to mud |
| `duel-intro-slam` | table | 1200ms | "DUEL START" text slam. Sub-drop: sine 90→35Hz exp glide over 700ms + sourced `metal-clang` pitched 0.8 + a white-noise impact transient. hall 0.2. normalise −2 — this is a curtain-raiser |
| `duel-intro-panel` | table | 500ms | Red panel sweep-out: bandpassed pink noise sweeping 400→3000Hz over 420ms, exp decay. No reverb — it is a wipe, not an impact |
| `duel-deal` | table | 400ms | Card fly-in. Sourced `card-flick` + 120ms highpassed noise @2kHz. **Callers pitch this 0.95–1.08 across the 7-card stagger**, so it must stay clean when pitched. normalise −8 |
| `duel-pick` | table | 500ms | Card commit — replaces the bare `playCardPop()`. Felt thud (sine 140→70 exp, 220ms) + sourced `card-flick` pitched 1.1 + a 60ms bandpassed snap @2.6kHz. This is the one gameplay sound that already exists, so it must feel like an upgrade, not a change |
| `duel-table-impact` | table | 700ms | `dImpact 380ms` table shake. Low wood knock: sourced `wood-hit` pitched 0.7 + sine 80Hz 200ms + a short 30ms noise crack. hall 0.25 |
| `duel-lunge` | table | 500ms | Opponent portrait lunge. Fast doppler whoosh: bandpassed pink noise 900→250Hz over 380ms with a `pitch` envelope down, plus a 60Hz body hit at 300ms |
| `duel-bubble` | table | 300ms | Klein's chat bubble. Soft double pop: two sines (660Hz then 880Hz) 60ms apart, 40ms each, exp decay, dry. Must be unobtrusive — it fires mid-thought |
| `duel-thinking` | table | 250ms | Klein's thinking dots. Single soft tick: 30ms sine 520Hz + 8ms noise @3kHz, normalise −18. **Deliberately tiny** — the caller has a 400ms cooldown and this must never become annoying |

**Path note for `hover`.** Its manifest entry is `/hover.wav` (repo root of `public/`, not
`public/sfx/`) because that is where the existing file lives and spec §7.22 forbids path
changes. So the renderer must write this one asset to `apps/web/assets/audio/hover.wav` —
where the current source copy lives — not to `assets/sfx/`. Handle it with an explicit
`outDir` override on that recipe rather than a special case buried in the CLI:

```js
// recipes/ui.mjs
{ name: "hover", family: "ui", outDir: "apps/web/assets/audio", /* ...layers... */ }
```

and teach `render.mjs` to honour `recipe.outDir` (resolved against `REPO`) when present,
falling back to `--out`. Add this to the `@typedef Recipe` in Task 3 as
`outDir?: string`.

- [ ] **Step 1: Write the recipes**

Extend `recipes/ui.mjs` to all seven ui assets, create `recipes/stamp.mjs` exporting
`export const stamp = [ /* duel-stamp */ ]`, and `recipes/table.mjs` exporting
`export const table = [ /* the eight table assets */ ]`. Update `recipes/index.mjs`:

```js
import { ui } from "./ui.mjs";
import { stamp } from "./stamp.mjs";
import { table } from "./table.mjs";

/** @type {import("../render.mjs").Recipe[]} */
export const RECIPES = [...ui, ...stamp, ...table];
```

Two complete exemplars — the rest follow the same shape:

```js
// recipes/stamp.mjs
import {} from "../dsp.mjs";

/** @type {import("../render.mjs").Recipe[]} */
export const stamp = [
  {
    name: "duel-stamp",
    family: "stamp",
    sampleRate: 44100,
    seed: 2001,
    // Reused by eleven verdict moments at pitches 0.85-1.15 (spec §5.5). Three layers:
    // weight, thud, ink texture. Must stay legible when pitch-shifted by the caller.
    layers: [
      { kind: "sample", src: "paper-slap.wav", at: 0, gain: 0.85, pitch: 0.6,
        env: [[0, 1], [0.16, 0.15], [0.3, 0]],
        filter: { type: "lowpass", f: 2400, q: 0.7 } },
      { kind: "osc", wave: "sine", f: 110, fEnd: 62, glide: "exp", dur: 0.09, at: 0, gain: 0.9,
        env: [[0, 1], [0.09, 0]] },
      { kind: "noise", color: "white", dur: 0.25, at: 0, gain: 0.3,
        env: [[0, 0.9], [0.02, 1], [0.25, 0]],
        filter: { type: "bandpass", f: 1800, q: 1.1 } },
    ],
    reverb: { preset: "plate", send: 0.2 },
    master: { normalizeTo: -3 },
  },
];
```

```js
// recipes/table.mjs — one of the eight written out in full; the other seven follow the
// same shape and take their layer specs from the design table above.
/** @type {import("../render.mjs").Recipe[]} */
export const table = [
  {
    name: "duel-deal",
    family: "table",
    sampleRate: 44100,
    seed: 3001,
    // Called seven times at 55ms stagger with pitch 0.95-1.08 (spec §7.20), so it must
    // stay clean under pitch shift: short, bright, no long tail to smear.
    layers: [
      { kind: "sample", src: "card-flick.wav", at: 0, gain: 0.9,
        env: [[0, 1], [0.14, 0]], filter: { type: "highpass", f: 300, q: 0.7 } },
      { kind: "noise", color: "white", dur: 0.12, at: 0, gain: 0.35,
        env: [[0, 1], [0.12, 0]], filter: { type: "highpass", f: 2000, q: 0.8 } },
    ],
    master: { normalizeTo: -8 },
  },
];
```

- [ ] **Step 2: Render**

Run: `node tools/sfx-studio/render.mjs --family ui && node tools/sfx-studio/render.mjs --family stamp && node tools/sfx-studio/render.mjs --family table`

**Caution:** `render.mjs` currently `rm -rf`s `--out` before writing. With three separate
`--family` invocations that would delete the previous family's output. Before running, change
the CLI so `rm` only happens under an explicit `--clean` flag:

```js
if (values.clean) await rm(values.out, { recursive: true, force: true });
await mkdir(values.out, { recursive: true });
```
and add `clean: { type: "boolean", default: false }` to the `parseArgs` options. Update
Task 3 Step 5's determinism commands to pass `--clean` where they relied on the wipe.

Expected: 16 rows, every peak ≤ −1.0 dB, `2+ layers` each.

- [ ] **Step 3: Run the gate**

Run: `node tools/sfx-studio/check.mjs`
Expected: `CHECK PASSED`, 16 rows, no violations.

The likely first failure is `rms` on `duel-thinking` (target −18 dB peak lands under the
`table` band floor). Task 5 already declared `RMS_OVERRIDES` for exactly this, including
`duel-thinking`, `duel-bubble`, `score-chip-slide`, `dossier-card-tilt` and
`trick-exec-bladehold`. If a *different* asset fails on rms, decide which is wrong: an asset
that is accidentally quiet gets re-rendered louder; an asset that is quiet **by design** gets
a named override. Never widen a whole family band to accommodate one cue — that lets
everything else in the family off the hook.

- [ ] **Step 4: Audition against the visuals**

Run: `npm run dev --workspace=@pacify/web`, then copy the assets where the dev server can see
them: `cp apps/web/assets/sfx/*.wav apps/web/public/sfx/ && cp apps/web/assets/audio/hover.wav apps/web/public/hover.wav`

Open `http://localhost:8081/sfx-test` (still the old four-button bench — enough to fire the
legacy sounds) and `http://localhost:8081/duel?demo=countdown`.

Confirm: the deal flick lands on each of the 7 cards as they fan in; `duel-pick` fires on
card commit and feels weightier than the old `card.wav`; `duel-intro-slam` coincides with the
"DUEL START" text hitting. **Note in the commit what you actually observed.** Then stop the
dev server.

- [ ] **Step 5: Commit**

```bash
git add tools/sfx-studio/recipes/ui.mjs tools/sfx-studio/recipes/stamp.mjs tools/sfx-studio/recipes/table.mjs tools/sfx-studio/recipes/index.mjs tools/sfx-studio/render.mjs tools/sfx-studio/check.mjs apps/web/assets/sfx apps/web/assets/audio/hover.wav
git commit -m "feat(sfx-studio): render UI, stamp and table families (16 assets)"
```

Stage `apps/web/assets/**` by directory, and check `git status` afterwards — the re-rendered
`hover.wav` and the new `assets/sfx/*.wav` should be the only asset changes.

---

### Task 10: Render — clash and shield families (15 assets)

**Files:**
- Create: `tools/sfx-studio/recipes/clash.mjs` (exports `clash`)
- Create: `tools/sfx-studio/recipes/shield.mjs` (exports `shield`)
- Modify: `tools/sfx-studio/recipes/index.mjs` — spread `clash`, `shield`

**Interfaces:**
- Consumes: `renderRecipe` CLI, sources `glass-shatter`, `metal-clang`, `card-flick`.
- Produces: 15 files in `apps/web/assets/sfx/`.

| asset | family | budget | design |
|---|---|---|---|
| `duel-clash-tick` | clash | 300ms | **Shared by the countdown ticks and the 3-2-1 showdown** (spec §5.5), and callers pitch it up to 1.5. A dry wooden tick: 8ms noise burst @2.8kHz q2 + 120ms tri 700Hz exp decay. Must stay *short* — it fires up to 13 times in a beat |
| `duel-flip-whoosh` | clash | 400ms | Card back swinging away (`dFlipBack 260ms`). Bandpassed pink noise sweeping 2500→500Hz over 240ms, exp decay. Dry |
| `duel-flip-snap` | clash | 250ms | Face landing (`dFlipFace 380ms @210`). Sourced `card-flick` pitched 1.2 + a 40ms sine 220Hz body. Sharper and louder than the whoosh |
| `duel-clash-vs` | clash | 400ms | The "VS" slam. Two opposed transients 30ms apart, hard-panned −0.7/+0.7 (render stereo for this one — see note), each a sourced `metal-clang` pitched 1.3 + sine 150Hz |
| `duel-card-win` | clash | 700ms | Winner glow scale-up (`dCardWinY/R 520ms`). Rising: sine sweep 300→600Hz over 450ms + a bright bell partial at 1200Hz, hall 0.2. Triumphant but not a fanfare — the victory cue owns that |
| `duel-card-shatter` | clash | 500ms | **Called 10× per shatter at 45ms stagger with pitch 0.9–1.15 and random pan.** So it must be a *single debris fragment*, not a full break: 30ms sourced `glass-shatter` pitched up + a 90ms bandpassed noise crack @3.5kHz. Very short or ten of them become mud |
| `duel-clash-lockin` | clash | 600ms | Winner number `dLockIn 480ms`. A resolved two-note: sine 523Hz then 784Hz (a fifth up) 90ms apart, plus a lowpassed impact. hall 0.15 |
| `duel-clash-lockout` | clash | 500ms | Loser `dLockOut 450ms`. The inverse: descending 392→261Hz, lowpassed @800Hz, no reverb. Dull on purpose |
| `duel-shield-pop` | clash | 250ms | Power plate pop (`dShieldPop` @100/@220). 20ms sine 900Hz + 10ms noise @4kHz. Callers pitch it, so keep it neutral |
| `duel-shield-banner` | clash | 500ms | "SAME TYPE!" banner. A hollow bell: three inharmonic partials (440/617/891Hz) exp-decaying 400ms + a 40ms noise attack. hall 0.25 |
| `duel-nullify-smash` | clash | 800ms | `dNullSmash @1500` + white flash. The big cancel: sourced `metal-clang` pitched 0.7 + a 120Hz sine slam + 200ms bandpassed noise burst, hard-limited. hall 0.3 |
| `duel-nullify-ring` | clash | 900ms | `dShieldWave @1900`. The shimmering aftermath: a 3-partial bell ring (1760/2640/3520Hz) exp-decaying 800ms, hall 0.45. Quiet — it sits under the stamp |
| `trick-shieldbreak-slam` | shield | 900ms | `dShieldSlam 460ms` crimson shield in. Heavy: sine 70Hz 300ms + sourced `metal-clang` pitched 0.55 + a noise transient. hall 0.3 |
| `trick-shieldbreak-crack` | shield | 400ms | **Called 3× at 950/1100/1250 with pitch 0.95/1.03/1.12, and reused as the ECLIPSE chip crack.** A single glass fracture: 15ms sourced `glass-shatter` pitched 1.4 + a 60ms highpassed noise snap @4kHz. Must be *one* crack, not a shatter |
| `trick-shieldbreak-shatter` | shield | 1200ms | `dShieldBreak @1350` + 8 shards + flash. The full collapse: sourced `glass-shatter` at 1.0 with a 900ms exp decay + a 60Hz body + a bright 6kHz noise spray 300ms. hall 0.35. Loudest cue in the shield family |

**Stereo note for `duel-clash-vs`.** Everything else is mono, but this cue hard-pans two
transients. Rather than break the mono rule, render it mono and let the **runtime** pan it —
the manifest already supports `pan: [-0.7, 0.7]`. Add that range to the `duel.clash.vs`
manifest entry in Task 6 and drop the stereo idea. One fewer special case.

- [ ] **Step 1: Write the recipes** — both files, following the Task 9 exemplar shape. Every asset above gets ≥2 layers.
- [ ] **Step 2: Update the manifest for the `duel.clash.vs` pan range** — `apps/web/src/lib/sfx-manifest.ts`: `"duel.clash.vs": { src: "/sfx/duel-clash-vs.wav", gain: 0.90, pan: [-0.7, 0.7] }`. Re-run `npm test --workspace=@pacify/web` — expected still green.
- [ ] **Step 3: Render** — `node tools/sfx-studio/render.mjs --family clash && node tools/sfx-studio/render.mjs --family shield` (no `--clean`).
- [ ] **Step 4: Gate** — `node tools/sfx-studio/check.mjs`. Expected `CHECK PASSED`, 31 rows total. `duel-card-shatter` will likely fail `duration` if rendered longer than ~500ms × 1.15; shorten it, do not widen the band — ten of these overlap.
- [ ] **Step 5: Audition** — `cp apps/web/assets/sfx/*.wav apps/web/public/sfx/`, dev server, then `/duel?demo=countdown` (the 10v7 countdown — 7 rising ticks then lock-in), `/duel?demo=shield` (nullify), `/duel?demo=shieldoff` (shield break), `/duel?demo=tie` (double shatter). Confirm the ticks land on each visible number change and the shatter lands with the card breaking. Stop the server.
- [ ] **Step 6: Commit**

```bash
git add tools/sfx-studio/recipes/clash.mjs tools/sfx-studio/recipes/shield.mjs tools/sfx-studio/recipes/index.mjs apps/web/src/lib/sfx-manifest.ts apps/web/assets/sfx
git commit -m "feat(sfx-studio): render clash and shield families (15 assets)"
```

---

### Task 11: Render — score and round families (24 assets)

**Files:**
- Create: `tools/sfx-studio/recipes/score.mjs` (exports `score`)
- Create: `tools/sfx-studio/recipes/round.mjs` (exports `round`)
- Modify: `tools/sfx-studio/recipes/index.mjs`

**Interfaces:**
- Consumes: sources `card-flick`, `metal-clang`, `paper-slap`.
- Produces: 24 files in `apps/web/assets/sfx/`.

| asset | family | budget | design |
|---|---|---|---|
| `score-chip-fly` | score | 1500ms | **The single most-reused asset (spec §5.5)** — mult chip, echo lob, eclipse lob, reversal ×2, R7 arrival, oracle glints. A pitch-bent whoosh whose bend follows a CSS `offset-path` curve: bandpassed pink noise with `f` automating 600→2200→900Hz over 1400ms, plus a sine 220→440→260Hz underneath. Callers pan it, so keep the centre image narrow |
| `score-chip-pop` | score | 250ms | Chip materialising (`dEsChipPop`). 15ms sine 1400Hz + 80ms tri 700Hz exp decay + a 5ms noise click. Bright, small |
| `score-chip-land` | score | 400ms | Chip taking its seat. A soft double: sine 520Hz 60ms then 390Hz 90ms, lowpassed @2kHz. Reads as "settled" |
| `score-chip-death` | score | 700ms | Echo chip expiring unused (`dChipDeath 650ms`). Descending and deflating: sine 660→180Hz exp over 500ms + a lowpassed noise sigh. Sad, quiet, no reverb |
| `score-chip-shielddeath` | score | 700ms | Shield halves blasting apart (`dShieldDeathL/R`). Two noise bursts 20ms apart + a 90Hz body thud + sourced `glass-shatter` pitched 1.6 at low gain |
| `score-chip-slide` | score | 200ms | Corner-rack reflow (`transition: left 450ms`). Nearly inaudible: 12ms noise @3kHz + 40ms sine 900Hz, normalise −20. Cooldown 80ms, so it must not accumulate |
| `score-mult-charge` | score | 1500ms | The mash charging to ×N (`dMultDouble @1500`). A riser: sawtooth 110→440Hz exp glide over 1400ms through a lowpass sweeping 300→4000Hz, plus a noise swell. Ends *without* resolving — `score-mult-impact` is the resolution |
| `score-mult-impact` | score | 800ms | `dMultImpact @1500` + ring + final number. The resolve: sine 90Hz slam + sourced `metal-clang` pitched 1.1 + a 3-partial bell. hall 0.3. normalise −2 |
| `score-award-fly` | score | 1400ms | "+N" badge flying to the chip (`dFlyYou/dFlyKlein 1.3s`). A lighter cousin of `chip-fly`: bandpassed noise 900→1800Hz over 1200ms + sine 440→660Hz. Callers pan ±0.4 |
| `score-award-land` | score | 400ms | The chip ding as the score lands. A clean bell: sine 1046Hz + 1568Hz + 2093Hz partials exp-decaying 350ms, hall 0.2. The most satisfying small sound in the game — spend time here |
| `score-drain-tick` | score | 200ms | **Fires up to 14× at 90ms spacing.** Must be a tiny dry click or it becomes a buzz: 6ms noise @2.5kHz + 40ms sine 500Hz exp decay, normalise −12. Callers pitch it up slightly per tick |
| `round-sweep` | round | 2200ms | The wipe's three staggered slab sweeps (`dRwBack/dRwLead/dRwPanel`). Three bandpassed noise sweeps 200ms apart, each 700ms, panning left→right, lowpassed. Big but *soft* — it is a curtain, not a hit |
| `round-next` | round | 400ms | "NEXT" `dNumSlam @480`. Short hard slam: 30ms noise + sine 180Hz 150ms + `paper-slap` pitched 0.8 |
| `round-bars` | round | 300ms | Three yellow accent bars (`dRwBar @560+150i`). Called 3× with pitch 0.95–1.10: a 20ms metallic tick — sourced `metal-clang` pitched 2.0, trimmed to 120ms |
| `round-burst` | round | 600ms | **Shared by the starburst seal ×3, `burstOut`, and the ×3 chip fuse** (spec §5.5). A bright radial burst: 40ms noise @5kHz + sine 1320Hz 300ms exp + two upper partials. Must survive pitch 0.85–1.15 |
| `round-letters` | round | 500ms | "ROUND" chaos letters (`dLetterSlam @700`). Five paper slaps 55ms apart (`paper-slap` pitched 1.1–1.4), each panned slightly differently |
| `round-number` | round | 900ms | The huge round number (`dRwNumSlam @760`). The heaviest non-trick slam: sine 65Hz 400ms + sourced `metal-clang` pitched 0.5 + a noise crack. hall 0.2. normalise −2 |
| `round-plate` | round | 400ms | Count plate `dStampIn @980` ("N / 7"). Reuses the stamp recipe shape at lower weight: `paper-slap` pitched 0.9 + sine 140Hz 80ms |
| `round-cutflash` | round | 300ms | `dTkCutFlash @1480`. A blade-flash accent: 10ms noise @7kHz + sine 2400Hz 60ms exp. Very bright, very short |
| `round-split` | round | 700ms | The number halves splitting (`dRwHalfA/B @1520`). A paper tear: sourced `paper-slap` pitched 0.7 with a bandpass sweeping 800→3000Hz over 500ms + a 70Hz thud |
| `round-panelin` | round | 500ms | Victory/defeat panels (`dPanelL/R 380ms`). Two low whooshes 40ms apart, hard-panned via the manifest, lowpassed @600Hz |
| `duel-victory` | round | 1600ms | "PACIFIED!" `dTitleSlam 520ms`. The only true fanfare: a rising three-chord bell (C-E-G, 523/659/784Hz) struck 140ms apart over a sine 130Hz pedal, hall 0.35. normalise −2 |
| `duel-defeat` | round | 1600ms | "DEFEAT". The same shape inverted and detuned: 392/466/523Hz struck 180ms apart, each slightly flat (−12 cents via `pitch: 0.993`), over a 98Hz pedal, lowpassed @1800Hz, hall 0.35 |
| `duel-draw` | round | 1200ms | "DRAW". Neutral, unresolved: two open fifths (392/587 then 415/622) that never resolve to a third, hall 0.3 |

- [ ] **Step 1: Write the recipes** — both files, ≥2 layers each, following the Task 9 exemplar shape.
- [ ] **Step 2: Render** — `node tools/sfx-studio/render.mjs --family score && node tools/sfx-studio/render.mjs --family round`.
- [ ] **Step 3: Gate** — `node tools/sfx-studio/check.mjs`. Expected `CHECK PASSED`, 55 rows. Watch `round-sweep` (2200ms budget) and `duel-victory`/`duel-defeat` (1600ms) — long tails trip the +15% grace; shorten the recipe's `dur`, not the budget.
- [ ] **Step 4: Audition** — `cp apps/web/assets/sfx/*.wav apps/web/public/sfx/`, dev server, `/duel?demo=r7` (round wipe + R7 ×2 arrival + mult mash + award flight) and `/duel?demo=r7echo` (the ×3 fuse). Confirm the chip fly tracks the visible arc and the award ding lands as the number changes. Stop the server.
- [ ] **Step 5: Commit**

```bash
git add tools/sfx-studio/recipes/score.mjs tools/sfx-studio/recipes/round.mjs tools/sfx-studio/recipes/index.mjs apps/web/assets/sfx
git commit -m "feat(sfx-studio): render score and round families (24 assets)"
```

---

### Task 12: Render — trick families I: VOID, ECHO, ECLIPSE, WARD (19 assets)

The showpieces. Each trick must be identifiable blind by its tonal signature (spec §2).

**Files:**
- Create: `tools/sfx-studio/recipes/trick-void.mjs`, `trick-echo.mjs`, `trick-eclipse.mjs`, `trick-ward.mjs`
- Modify: `tools/sfx-studio/recipes/index.mjs`

**Interfaces:**
- Consumes: sources `fire-crackle`, `metal-clang`, `glass-shatter`.
- Produces: 19 files in `apps/web/assets/sfx/`.

**VOID (6) — `reverb: 0` on every one. No exceptions; dryness is the point.**

| asset | budget | design |
|---|---|---|
| `trick-void-open` | 1200ms | Iris opening. A sub-bass swell *inward*: sine 55Hz rising to 82Hz over 900ms through a lowpass @200Hz, plus brown noise swelling then abruptly gated at 1000ms. **22050Hz sample rate is fine here** — no bright content |
| `trick-void-mutate` | 700ms | Card becoming a maw (`dVdMutate 620ms`). Granular: 14 short noise grains 40ms apart, each pitched randomly 0.7–1.4 via the seeded PRNG, through a bandpass sweeping down 3000→400Hz |
| `trick-void-reality` | 2400ms | `dVoidReality 2400ms @500`. A warping drone: two detuned saws (58Hz / 58.7Hz) beating against each other, lowpassed @300Hz, slow 2.4s exp decay. The beat frequency *is* the unease |
| `trick-void-suck` | 1150ms | Victim dragged (`dVdDevourDown/Up 1150ms @1200`). Reverse-envelope noise: a white-noise burst with an **ascending** envelope (silence→peak) through a bandpass sweeping 4000→300Hz, so it feels inhaled |
| `trick-void-devour` | 600ms | **The money beat — canvas shock at t=2280.** Not a boom but an *absence*: a 40ms full-band crack, then a sine 120→28Hz exp drop over 300ms, then **hard silence** (the last 200ms near-zero). The silence is the effect |
| `trick-void-die` | 500ms | Maw collapsing at 4100. The inverse of `open`: sine 82→40Hz, gated abruptly at 350ms with a 5ms fade to avoid a click |

**ECHO (3) — pitch-delay doubling, short plate.**

| asset | budget | design |
|---|---|---|
| `trick-echo-shock` | 1500ms | `dEchoShockfield 1500ms`. One impact followed by a literal echo: a noise+sine 220Hz hit at 0, then the **same material at 120ms pitched to 2/3 (a fifth down) at 0.6 gain**, then again at 260ms at 0.35. Use `delay` with `feedback: 0.4, mix: 0.5` plus an explicit pitched copy so the intervals are musical, not just a slapback |
| `trick-echo-ring` | 500ms | Called 3× at 120/250/380 with pitch 1.0/0.8/2÷3. A single hollow ring: sine 880Hz + 1320Hz exp-decaying 400ms through a bandpass q2. Must be clean when pitched down to 0.667 |
| `trick-echo-ghost` | 600ms | The afterimages (`dEchoAfterimage @420+`). Reversed-envelope sine 660Hz with a lowpass sweeping up, so it swells rather than attacks |

**ECLIPSE (3).**

| asset | budget | design |
|---|---|---|
| `trick-eclipse-drone` | 3600ms | Night falling (`dEclipseNight 3600ms`). Brown noise through a lowpass sweeping 800→180Hz over 3.4s, plus a 41Hz sine pedal. **22050Hz is fine.** Longest cue in the game — check it against the 4000ms budget |
| `trick-eclipse-corona` | 1700ms | The bright ring cutting through the dark. Three high partials (3520/4400/5280Hz) with two sharp 20ms amplitude dips (the "crack flashes") at 600ms and 1100ms, exp-decaying 1.6s. hall 0.35 |
| `trick-eclipse-glyph` | 400ms | Broken-shield glyphs dropping (`@1450/1540`). Two-layer: sourced `glass-shatter` pitched 1.8 trimmed to 60ms + a sine 300Hz 200ms thud. Called 2× with pitch variation |

**WARD (7) — ritual bell, then real fire.**

| asset | budget | design |
|---|---|---|
| `trick-ward-seal` | 900ms | `dWardSealSlam 720ms @180`. A ritual gong: sourced `metal-clang` pitched 0.5 with a 700ms exp decay + sine 98Hz + three inharmonic partials (294/487/761Hz) for the bell character. hall 0.35 |
| `trick-ward-eye` | 700ms | The watcher eye opening (`dWdEyeOpen 620ms @500`) + iris dart. A wet organic slide: bandpassed noise sweeping 400→2400Hz over 500ms + a sine 1200→1800Hz glide. hall 0.3. Unsettling, not scary |
| `trick-ward-projectile` | 620ms | `dWardProjectileDown/Up 620ms @650`. A fast doppler pass: sine 800→200Hz exp glide over 500ms + bandpassed noise with the same downward sweep |
| `trick-ward-flare` | 400ms | `dWdEyeFlare @800`. A bright flash: 15ms noise @6kHz + sine 2640Hz 250ms exp decay, hall 0.3 |
| `trick-ward-impact` | 800ms | `dWardImpact @1100` ring. The block landing: sourced `metal-clang` pitched 0.9 + sine 130Hz 300ms + a 3-partial bell. hall 0.3. normalise −2 |
| `trick-ward-fire` | 2200ms | **The only looping asset in the game.** Sourced `fire-crackle`, processed to a seamless loop: crossfade the last 250ms onto the first 250ms so the wrap is inaudible, bandpass 300–4000Hz, plus a low brown-noise bed @90Hz for body. **Must be marked `loop`-safe: no attack, no decay, constant RMS.** Verify by rendering it 3× concatenated and checking for a seam |
| `trick-ward-ash` | 600ms | `dWdAshIn @4700`. The aftermath: highpassed noise @2.5kHz with a slow 500ms decay + a 90Hz soft thud. Quiet — it follows the fire |

- [ ] **Step 1: Write the four recipe modules** — ≥2 layers each, `reverb` omitted or `send: 0` for all six VOID assets.
- [ ] **Step 2: Render** — `for f in trick-void trick-echo trick-eclipse trick-ward; do node tools/sfx-studio/render.mjs --family $f; done`
- [ ] **Step 3: Gate** — `node tools/sfx-studio/check.mjs`. Expected `CHECK PASSED`, 74 rows.
- [ ] **Step 4: Verify the fire loop has no audible seam**

```bash
node -e "
const {readWav,writeWav}=await import('./tools/sfx-studio/wav.mjs');
const b=await readWav('apps/web/assets/sfx/trick-ward-fire.wav');
const n=b.data.length, w=256;
// RMS of the wrap window vs RMS of the body — a seam shows up as a dip or a spike
const rms=(a,s,e)=>{let x=0;for(let i=s;i<e;i++)x+=a[i]*a[i];return Math.sqrt(x/(e-s))};
const wrap=rms(b.data,0,w)+rms(b.data,n-w,n);
const body=rms(b.data,Math.floor(n*0.4),Math.floor(n*0.6));
console.log('wrap rms',(wrap/2).toFixed(5),'body rms',body.toFixed(5),'ratio',((wrap/2)/body).toFixed(3));
if(Math.abs((wrap/2)/body-1)>0.35){console.error('SEAM DETECTED — crossfade the loop ends');process.exit(1)}
console.log('LOOP SEAMLESS OK');
" --input-type=module
```
Expected: `LOOP SEAMLESS OK`. If it fails, widen the crossfade in the recipe.

- [ ] **Step 5: Audition** — `cp apps/web/assets/sfx/*.wav apps/web/public/sfx/`, dev server, then `/duel?demo=void`, `/duel?demo=voidklein`, `/duel?demo=echo`, `/duel?demo=eclipse`, `/duel?demo=ward`, `/duel?demo=wardyou`, `/duel?demo=echoclip`. Confirm the VOID devour lands with the canvas shock, the WARD fire starts as the particles climb and stops before the ash, and ECLIPSE's chip crack lands at 1600. Stop the server.
- [ ] **Step 6: Commit**

```bash
git add tools/sfx-studio/recipes/trick-void.mjs tools/sfx-studio/recipes/trick-echo.mjs tools/sfx-studio/recipes/trick-eclipse.mjs tools/sfx-studio/recipes/trick-ward.mjs tools/sfx-studio/recipes/index.mjs apps/web/assets/sfx
git commit -m "feat(sfx-studio): render VOID, ECHO, ECLIPSE, WARD cinematics (19 assets)"
```

---

### Task 13: Render — trick families II: REVERSAL, EXECUTIONER, ORACLE (22 assets)

**Files:**
- Create: `tools/sfx-studio/recipes/trick-reversal.mjs`, `trick-exec.mjs`, `trick-oracle.mjs`
- Modify: `tools/sfx-studio/recipes/index.mjs`

**Interfaces:**
- Consumes: sources `metal-clang`, `rope-creak`, `wood-hit`, `card-flick`, `glass-shatter`.
- Produces: 22 files in `apps/web/assets/sfx/`.

**REVERSAL (2) — samples played backwards.**

| asset | budget | design |
|---|---|---|
| `trick-reversal-vortex` | 1100ms | Streams spiralling in (0→1100ms, the `BURST` frame). Three noise layers with **`reverse: true`** and ascending envelopes, bandpassed at 600/1200/2400Hz, each swelling to a peak at 1100ms. hall 0.3 |
| `trick-reversal-burst` | 900ms | Spin flip + shockwave at t=1100. The release of the vortex: a 30ms full-band crack + sine 200→50Hz exp drop + a reversed cymbal-ish noise tail. hall 0.35. normalise −2 |

**EXECUTIONER (14) — mechanical, dry-ish, short plate. The most cues of any trick.**

| asset | budget | design |
|---|---|---|
| `trick-exec-rise` | 500ms | Diagonal panels slashing in + white slash (`dTkPanelL/R 340ms`, `@180`). Two hard-panned noise sweeps 60ms apart + a 10ms bright flash transient |
| `trick-exec-meter` | 900ms | Sentencing meter filling (`dMeterFill 900ms @620`). A rising mechanical whine: saw 220→880Hz exp glide through a bandpass q4, plus 18 discrete ticks (10ms noise @3kHz) evenly spaced — a ratchet, not a smooth riser. **The execfail variant calls this at `pitch: 0.9` so it stalls audibly** |
| `trick-exec-target` | 500ms | Target card flying in (`dTkTargetIn @820`). Sourced `card-flick` pitched 0.8 + a 120Hz whoosh |
| `trick-exec-zone` | 300ms | `dZonePulse` ×3 at 1560. A single crimson pulse: sine 160Hz 120ms + 8ms noise @1.5kHz. Called 3× with pitch variation, so keep it short and neutral |
| `trick-exec-bladehold` | 600ms | `dTkBladeHold @1650` — the pause that sells the drop. Almost nothing: a faint 50Hz rumble + sourced `rope-creak` at very low gain, 500ms. Tension through near-silence |
| `trick-exec-rope` | 400ms | `dTkRopeSlack 190ms` at 2160. Sourced `rope-creak` pitched 1.2, trimmed to 190ms, bandpassed 400–2500Hz. Fibre, not metal |
| `trick-exec-bladedrop` | 700ms | **THE money beat — `dTkBladeDrop 190ms @2350.** Three layers exactly aligned: a 5ms noise transient (the release), sourced `metal-clang` pitched 1.0 (the blade ring), and a sine 70Hz 250ms slam (the impact). plate 0.25. normalise −1.5 — the loudest cue in the game. Spend the most time here |
| `trick-exec-chop` | 600ms | `dTkCutFlash @2500` + halves splitting `@2530/2520`. Sourced `wood-hit` pitched 0.6 + `metal-clang` pitched 1.6 + a 40ms noise burst. Wet and organic — this is flesh and wood, not just steel |
| `trick-exec-shake` | 460ms | `dTkShake 460ms @2530` + camera dive. A low rumble: brown noise lowpassed @120Hz, 400ms, with a 12Hz amplitude tremolo |
| `trick-exec-letters` | 250ms | **Called 8× at 55ms spacing for "EXECUTED".** One chaos-letter slam: 12ms noise @2kHz + `paper-slap` pitched 1.3 trimmed to 100ms + sine 240Hz 80ms. Must be extremely short or eight of them smear |
| `trick-exec-scorezero` | 700ms | "SCORE → 0" `dNumSlam @3280`. A descending hollow: sine 400→100Hz exp over 500ms + a lowpassed noise tail. Finality |
| `trick-exec-exit` | 600ms | Panels out (`@3820` exec / `@3300` misfire). The reverse of `rise`: two noise sweeps descending, lowpassed |
| `trick-exec-strain` | 900ms | **Misfire only — `dTkBladeStrain 900ms @1560`.** Metal under load that never releases: sourced `rope-creak` pitched 0.5 + a saw 90Hz with a slow 6Hz tremolo through a bandpass q8, swelling to a peak at 700ms then **decaying without resolving**. The absence of the drop is the point |
| `trick-exec-sub` | 400ms | "SCORES BELOW 7 ESCAPE THE BLADE" `@2560`. A quiet paper slam: `paper-slap` pitched 1.0 + sine 180Hz 100ms, normalise −10 |

**ORACLE (6) — the wettest family; `reverbIR: "cathedral"`, send 0.5–0.6.**

| asset | budget | design |
|---|---|---|
| `trick-oracle-veil` | 1400ms | Night veil descending. Pink noise lowpassed @600Hz with a 1.2s exp decay + a 220Hz sine pad. cathedral 0.6 |
| `trick-oracle-lens` | 1450ms | `dOracleLens 1450ms` drop + spinning dashed ring. A glassy descend-and-settle: sine 1760→880Hz exp glide over 1200ms + a bandpassed noise shimmer @6kHz. cathedral 0.5 |
| `trick-oracle-scan` | 1350ms | `dOracleScan 1350ms @350` beam. A sweeping sine 500→3000→500Hz over 1.3s through a bandpass q6, plus a faint 8Hz pulse train. cathedral 0.55 |
| `trick-oracle-constellation` | 1200ms | Canvas lines drawing 600→1800ms. A celesta-like arpeggio: five sine+tri note pairs (1046/1318/1568/2093/2637Hz) struck 180ms apart, each 300ms exp decay. cathedral 0.6. The prettiest cue in the game |
| `trick-oracle-face` | 700ms | Peeked card faces burning through (`dOcFace 700ms @2100+240i`). Called up to 2×. A soft ignition: bandpassed noise 800→3000Hz over 400ms + a sine 330Hz body + a touch of the sourced `fire-crackle`. cathedral 0.5 |
| `trick-oracle-glint` | 500ms | **Called 3× at 3000+200i with pitch 1.0/1.07/1.14.** Star glints (`dOcPop`). A single high ping: sine 3136Hz + 4186Hz, 350ms exp decay, cathedral 0.6. Pure and tiny |

- [ ] **Step 1: Write the three recipe modules** — ≥2 layers each.
- [ ] **Step 2: Render** — `for f in trick-reversal trick-exec trick-oracle; do node tools/sfx-studio/render.mjs --family $f; done`
- [ ] **Step 3: Gate** — `node tools/sfx-studio/check.mjs`. Expected `CHECK PASSED`, 96 rows.
- [ ] **Step 4: Audition** — `cp apps/web/assets/sfx/*.wav apps/web/public/sfx/`, dev server, then `/duel?demo=reversal`, `/duel?demo=executioner`, `/duel?demo=execfail`, `/duel?demo=execrev`, `/duel?demo=oracle`, `/duel?demo=oracleklein`. The two things to check hardest: **the blade drop must coincide with the visual blade hitting**, and **execfail must feel like a release of tension that never resolves** (no drop sound at all). Stop the server.
- [ ] **Step 5: Commit**

```bash
git add tools/sfx-studio/recipes/trick-reversal.mjs tools/sfx-studio/recipes/trick-exec.mjs tools/sfx-studio/recipes/trick-oracle.mjs tools/sfx-studio/recipes/index.mjs apps/web/assets/sfx
git commit -m "feat(sfx-studio): render REVERSAL, EXECUTIONER, ORACLE cinematics (22 assets)"
```

---

### Task 14: Render — non-duel screens (5 assets)

Small, deliberately. Spec §7.21 caps non-duel work at `ui.*` plus one or two bespoke cues per
screen.

**Files:**
- Create: `tools/sfx-studio/recipes/screens.mjs` (exports `screens`)
- Modify: `tools/sfx-studio/recipes/index.mjs`

All five use `family: "screens"` so the `--family screens` filter in Step 3 catches exactly
this batch and nothing else.

| asset | family | budget | design |
|---|---|---|---|
| `campaign-ticket-pick` | screens | 350ms | Replaces `playCardPop()` at `campaign.tsx:112`. Heavier and paper-ier than `duel-deal`: sourced `card-flick` pitched 0.9 + `paper-slap` + a 100Hz body. It is a dossier ticket, not a playing card |
| `campaign-ticket-claim` | screens | 900ms | A ticket confirmed. A small resolved two-note (659→988Hz) + `paper-slap` pitched 0.8, hall 0.2. Distinct from `duel-victory` — this is a checkbox, not a win |
| `shame-enter` | screens | 1200ms | Entering the shame screen. Low and hollow: sine 65Hz 800ms + brown noise lowpassed @200Hz with a slow swell, hall 0.3. **Conditional:** only if `shame.tsx` has an entry transition — read the file first and drop this asset if it does not |
| `howto-page-turn` | screens | 500ms | Rules page turning. Sourced `paper-slap` pitched 1.2 with a bandpass sweeping 600→2500Hz over 350ms + a faint 40ms noise rustle. **Do not touch `public/how-to-play/audio/*.mp3`** — those belong to the standalone HTML |
| `dossier-card-tilt` | screens | 150ms | The 3D drag-tilt ID card. Nearly inaudible, fires continuously during a drag (cooldown 60ms): 8ms noise @4kHz + 40ms sine 1600Hz, normalise −22 |

- [ ] **Step 1: Confirm the conditional assets are warranted** — read `apps/web/src/screens/shame.tsx` for an entry transition. If there is none, delete `shame-enter` from the recipe list **and** remove its manifest entry and the `shame.enter` cue from Task 19's wiring. Do not ship a cue nothing calls.
- [ ] **Step 2: Write `recipes/screens.mjs`**, spread it in `index.mjs`.
- [ ] **Step 3: Render** — `node tools/sfx-studio/render.mjs --family screens`
- [ ] **Step 4: Gate** — `node tools/sfx-studio/check.mjs`. Expected `CHECK PASSED`, 101 rows, total under 16 MB.

**This is the full asset set.** If the row count is not 101 (or 100 after dropping
`shame-enter`), something was missed — reconcile against `apps/web/src/lib/sfx-manifest.ts`
before continuing. The Task 18 integrity test enforces this automatically.

- [ ] **Step 5: Commit**

```bash
git add tools/sfx-studio/recipes/screens.mjs tools/sfx-studio/recipes/index.mjs apps/web/assets/sfx
git commit -m "feat(sfx-studio): render non-duel screen assets (5)"
```

---

# TRACK B — Wiring

### Task 15: Hook the sequence driver

One effect, four added lines. This single hook sounds the **entire reveal choreography** —
every trick cinematic, every clash, every multiplier mash, every award.

**Files:**
- Modify: `apps/web/src/screens/duel.tsx:11` (the sfx import), `:607-711` (the driver effect)

**Interfaces:**
- Consumes: `cuesForStep`, `shouldDuckBgm`, `DUCK_TO`, `DUCK_ATTACK_MS`, `DUCK_RELEASE_MS` from `../lib/duel-cues`; `scheduleTimeline`, `cancelTimeline`, `duckBgm` from `../lib/sfx`.
- Produces: audible reveal beats. Nothing downstream depends on this task's internals.

- [ ] **Step 1: Extend the import at `duel.tsx:11`**

```ts
import { playHover, playClick, playCardPop, scheduleTimeline, cancelTimeline, duckBgm } from "../lib/sfx";
import { cuesForStep, shouldDuckBgm, DUCK_TO, DUCK_ATTACK_MS, DUCK_RELEASE_MS } from "../lib/duel-cues";
```

`playCardPop` stays imported for now — Task 16 replaces its call site with `duel.pick` and
removes it from this line.

- [ ] **Step 2: Add the duck-restore-on-unmount effect**

Immediately **above** the driver effect (before line 605's comment block):

```ts
  /* The reveal beats duck the music; if the duel unmounts mid-cinematic the duck
     must not leak into the next page's BGM. Separate effect so it runs ONLY on
     unmount — putting the restore in the driver's cleanup would unduck between two
     consecutive trick steps and pump the music. */
  useEffect(() => () => { duckBgm(1, 400); }, []);
```

- [ ] **Step 3: Schedule and cancel inside the driver**

In the driver effect, after `if (!step) return;` (line 609) and before `let interval …`
(line 610), insert:

```ts
    // Schedule this beat's entire cue timeline on the AudioContext clock in one call —
    // drift-free, and immune to the setTimeout throttling that would desync a background
    // tab. Every offset comes from duel-cues.ts, which is unit-tested against spec §7.
    const audio = scheduleTimeline(cuesForStep(step));
    // Trick cinematics and the multiplier mash duck the music so the SFX cut through.
    // Decided here (not in cleanup) so consecutive ducking steps do not pump the bus.
    if (shouldDuckBgm(step)) duckBgm(DUCK_TO, DUCK_ATTACK_MS);
    else duckBgm(1, DUCK_RELEASE_MS);
```

And extend the cleanup at line 709 from:

```ts
    return () => { clearTimeout(timer); if (interval) clearInterval(interval); };
```
to:
```ts
    return () => {
      clearTimeout(timer);
      if (interval) clearInterval(interval);
      // Stop every not-yet-sounded voice for this beat. AudioBufferSourceNode.stop()
      // scheduled at or before its start time means the node never plays, which is what
      // makes this safe for events still in the future. Essential for the ANIM LAB,
      // which rapid-fires 24 scenarios with 1700ms gaps.
      cancelTimeline(audio);
    };
```

- [ ] **Step 4: Typecheck and unit-test**

Run: `npm run build && npm test --workspace=@pacify/web`
Expected: both clean. The dependency array at line 711 stays `[seqIdx, seqSteps]` — **do not
add `step`**, it is derived inside the effect.

- [ ] **Step 5: Verify in the browser**

Copy assets, start the dev server, open `/duel?demo=all`. The ANIM LAB playlist cycles all 24
scenarios with real audio. Watch for:

- the countdown ticks landing on each visible number change (`demo=countdown`)
- the blade drop coinciding with the visual blade (`demo=executioner`)
- the VOID devour hitting with the canvas shock (`demo=void`)
- **no tail from a skipped scenario bleeding into the next** — this is the `cancelTimeline`
  check, and it is the one most likely to be wrong

Open devtools console and confirm no red errors. Then stop the server.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/screens/duel.tsx
git commit -m "feat(web): sound the duel reveal — schedule per-step cue timelines with cancellation"
```

`git diff --cached apps/web/src/screens/duel.tsx` must show only the import line, the new
unmount effect, the two inserted blocks, and the extended cleanup. If it shows anything else,
pre-existing uncommitted work is being swept in — unstage and use `git add -p`.

---

### Task 16: Hook the event-driven duel beats

Everything the driver does not cover: match open, commit phase, round transitions, match end.
Each hooks its own state-change site (spec §6.3).

**Files:**
- Modify: `apps/web/src/screens/duel.tsx` — ~14 sites listed below

**Interfaces:**
- Consumes: `play`, `playAt` from `../lib/sfx`.
- Produces: audible commit phase and transitions.

- [ ] **Step 1: Swap the import to `play`/`playAt`**

Replace the Task 15 import line with:

```ts
import { playHover, playClick, play, playAt, scheduleTimeline, cancelTimeline, duckBgm } from "../lib/sfx";
```

`playCardPop` is dropped — its only call site (`onPick`, line 726) is replaced below.

- [ ] **Step 2: Add each hook**

| Site | Insert |
|---|---|
| Intro splash mount (`~:839`) | A `useEffect` keyed on the intro's visibility: `play("duel.intro.slam"); playAt("duel.intro.panel", 1150);` — `dIntroPanel` fires at 1150ms |
| `deal()` (`:293-310`) | After the hands are set: `for (let i = 0; i < 7; i++) playAt("duel.deal", 55 * i, { pitch: 0.95 + i * 0.02 });` — matches the `dHandIn 420ms ${i*55}ms` stagger, pitch ramping up as the fan completes |
| `onPick()` (`:726`) | Replace `playCardPop();` with `play("duel.pick");` |
| `revealed` flip (`:890` / `:848`) | A `useEffect` on `[revealed]`: `if (revealed) { play("duel.table.impact"); play("duel.lunge"); }` — both are keyed per round so they re-fire correctly |
| Klein message arrives (`:353-358`) | `play("duel.bubble");` next to `setMsgVisible(true)` |
| `setKleinThinking(true)` | `play("duel.thinking");` — **one** call, not a loop; the manifest's 400ms cooldown is the guard |
| Error set (`:1492`) | `play("duel.error");` where `setError(…)` is called with a non-null value |
| `onNextRound()` (`:745`) | After `setRoundAdv(nextRound)`: `play("round.sweep"); playAt("round.next", 480); playAt("round.bars", 560); playAt("round.bars", 710, { pitch: 1.04 }); playAt("round.bars", 860, { pitch: 1.09 }); playAt("round.burst", 580); playAt("round.burst", 615, { pitch: 1.06 }); playAt("round.burst", 650, { pitch: 1.12 }); playAt("round.letters", 700); playAt("round.number", 760); playAt("round.plate", 980); playAt("round.cutFlash", 1480); playAt("round.burstOut", 1500); playAt("round.split", 1520);` — every offset from spec §7.18 |
| R7 arrival (`:748-754`) | Inside the existing `setTimeout`s: at `setR7Arrival("flying")` add `play("score.chip.pop"); playAt("score.chip.fly", 300); playAt("score.chip.land", 1250);`, and at `setR7Arrival("landed")` add nothing (the land sound is already scheduled) |
| ×3 fuse (`:1427`) | A `useEffect` on the fuse condition: `play("score.chip.fuse");` |
| Echo chip death (`:691`) | `play("score.chip.death");` beside `setEchoChipDying(true)` |
| Shield chip death (`:695`) | `play("score.chip.shieldDeath");` beside `setShieldChipDying(true)` |
| Corner-rack reflow (`:269-274`) | `play("score.chip.slide");` inside `releaseCorner` (survivors slide when a chip leaves; the 80ms cooldown absorbs bursts) |
| Info modal (`setStatusInfo`) | `play("ui.modal.in")` when opening with non-null, `play("ui.modal.out")` when closing |
| `setPhase("over")` (`:700`) | `play("round.panelIn");` then, keyed on `finalResultRef.current`: `playAt("duel.victory", 380)` / `"duel.defeat"` / `"duel.draw"` |

**Guard every `useEffect` hook against its initial mount** where the state starts falsy —
e.g. the `revealed` hook must not fire on mount when `revealed === false`. The `if (revealed)`
check handles that; do not add a ref-based "first render" skip where a value check suffices.

- [ ] **Step 3: Typecheck**

Run: `npm run build`
Expected: clean. If `playCardPop` is now unused, `tsc` will not complain (no `noUnusedLocals`),
but the import must still be removed — Step 1 does that.

- [ ] **Step 4: Verify in the browser**

Dev server, then play a real match from `/campaign` through to a win or loss. Check:
the 7 deal flicks stagger with the fan; the round wipe's 14 cues land in order; the R7 arrival
chime fires only on round 7; victory/defeat plays on the result overlay.

Then `/duel?demo=all` again to confirm nothing regressed. Stop the server.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/screens/duel.tsx
git commit -m "feat(web): sound the duel commit phase, round wipe, R7 arrival and match end"
```

---

### Task 17: BGM — map `/duel`, `/sfx-test`, `/gate`

`/duel` is absent from `PAGE_BGM`, so `playBgmForRoute` returns early at
[bgm.ts:61](../../../apps/web/src/lib/bgm.ts) and the campaign jazz plays under the whole
fight. `/sfx-test` and `/gate` are unmapped for the same reason.

**Files:**
- Modify: `apps/web/src/lib/bgm.ts:14-27`
- Modify: `music-sets.md` (repo root)

- [ ] **Step 1: Add the three routes**

```ts
  "/howto": null,
  "/options": "Asian Dancer.mp3",
  "/multiplayer": null,
  "/duel": "RISING.mp3",
  "/sfx-test": null,   // silence is required — you cannot audition SFX over music
  "/gate": null,
```

`RISING.mp3` is a guess based on its name; **nobody here can audition music** (spec §12 open
item 1). Alternates already in `public/musics/` and currently unused: `Lightning Moment.mp3`,
`PRDR.mp3`, `Acceleration.mp3`, `Altair.mp3`, `Kizu.mp3`, `STAY TUNE.mp3`. Flag this to the
user in the final report — it is a one-line change.

Verify the file exists first: `ls "apps/web/public/musics/RISING.mp3"`.

- [ ] **Step 2: Confirm the route actually resolves**

`getTrackForRoute("/duel")` must return `"RISING.mp3"`. Check by reading the function at
[bgm.ts:34-47](../../../apps/web/src/lib/bgm.ts) — it strips query and hash, so
`/duel?demo=all` resolves to `/duel` correctly. No code change needed; this step is
verification only.

- [ ] **Step 3: Update `music-sets.md`**

It is the documented source of truth and `bgm.ts` comments instruct keeping it in sync. Add
the three routes to its table, note that `/duel` ducks to 0.5× during trick cinematics and the
multiplier mash, and mark the track as **provisional pending the user's ear**.

- [ ] **Step 4: Verify in the browser**

Dev server: navigate `/campaign` → a duel. Confirm the jazz crossfades out and `RISING.mp3`
fades in, and that during a trick cinematic the music audibly drops then recovers. Then
navigate `/duel` → `/menu` and confirm the duck does **not** leak (that is the Task 15 Step 2
unmount effect). Stop the server.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/bgm.ts music-sets.md
git commit -m "feat(web): map /duel BGM with cinematic ducking; silence /sfx-test and /gate"
```

---

### Task 18: Rebuild `/sfx-test` as the audition bench

This is the user's primary tool for the taste sign-off that spec §9.2 says only they can give.
It must let them hear **every** cue and **every** step timeline without playing a match.

**Files:**
- Modify: `apps/web/src/screens/sfx-test.tsx` (full rewrite; currently 38 lines)
- Modify: `apps/web/src/screens/sfx-test.module.css`

**Interfaces:**
- Consumes: `initSfx`, `unlockSfx`, `play`, `scheduleTimeline`, `listSfx`, `debugAudio` from `../lib/sfx`; `SFX` from `../lib/sfx-manifest`; `cuesForStep` from `../lib/duel-cues`; `DEMO_SCENARIOS` is **not** exported from `duel.tsx` — build the step-timeline demo list locally instead (see Step 1 note).

- [ ] **Step 1: Write the bench**

```tsx
import { useEffect, useState } from "react";
import { initSfx, unlockSfx, play, scheduleTimeline, listSfx, debugAudio } from "../lib/sfx";
import { SFX, type SfxName } from "../lib/sfx-manifest";
import { cuesForStep } from "../lib/duel-cues";
import type { SeqStep } from "./duel";
import s from "./sfx-test.module.css";

/* One representative step per SeqStep kind/trick, so every timeline in the game can be
   auditioned without playing a match. Offsets come from the same cuesForStep() the duel
   uses, so what is heard here is what ships. */
const STEP_DEMOS: { label: string; step: SeqStep }[] = [
  { label: "SHOWDOWN 3-2-1", step: { kind: "showdown", ms: 3000 } },
  { label: "FLIP", step: { kind: "flip", ms: 900 } },
  { label: "SHIELD BREAK", step: { kind: "shieldbreak", ms: 3200 } },
  { label: "CLASH 10v7", step: { kind: "clash", ms: 4700, mode: "power", you: 10, klein: 7, ticks: 8 } },
  { label: "CLASH NULLIFY", step: { kind: "clash", ms: 3600, mode: "shield", you: 5, klein: 9, align: "good" } },
  { label: "CLASH TIE 6v6", step: { kind: "clash", ms: 3200, mode: "tie", you: 6, klein: 6 } },
  { label: "MULT MASH x2", step: { kind: "multmash", ms: 2400, mult: 2, r7: true, echo: false, base: 3, final: 6, side: "p1" } },
  { label: "AWARD +3", step: { kind: "award", ms: 1500, p1After: 3, p2After: 0, p1Pts: 3 } },
  { label: "DRAIN 5 @200ms", step: { kind: "drain", ms: 1700, side: "p1", from: 5, tickMs: 200 } },
  { label: "VOID", step: { kind: "trick", ms: 4800, trick: "void" } },
  { label: "ECHO", step: { kind: "trick", ms: 4000, trick: "echo" } },
  { label: "ECLIPSE", step: { kind: "trick", ms: 4000, trick: "eclipse" } },
  { label: "WARD", step: { kind: "trick", ms: 6200, trick: "ward" } },
  { label: "REVERSAL", step: { kind: "trick", ms: 4600, trick: "reversal", p1After: 2, p2After: 9, preP1: 9, preP2: 2 } },
  { label: "EXECUTIONER", step: { kind: "trick", ms: 4400, trick: "executioner", wipedSide: "p1", preP1: 6, preP2: 5 } },
  { label: "EXEC MISFIRE", step: { kind: "trick", ms: 3700, trick: "execfail", wipedSide: "p1" } },
  { label: "ORACLE", step: { kind: "trick", ms: 4600, trick: "oracle", peekCount: 2 } },
];

const FAMILIES = ["ui", "duel", "trick", "score", "round", "campaign", "shame", "howto", "dossier"];
const familyOf = (n: SfxName) => n.split(".")[0];

export default function SfxTest() {
  const [dbg, setDbg] = useState(() => debugAudio());
  const [family, setFamily] = useState<string | null>(null);
  const [unlockedOnce, setUnlockedOnce] = useState(false);

  useEffect(() => { initSfx().then(() => setDbg(debugAudio())); }, []);

  const arm = (fn: () => void) => () => {
    if (!unlockedOnce) { unlockSfx(); setUnlockedOnce(true); }
    fn();
    setDbg(debugAudio());
  };

  const names = listSfx().filter((n) => !family || familyOf(n) === family);

  return (
    <div className={`v ${s.stage}`}>
      <div className={`t ${s.title}`}>SFX AUDITION BENCH</div>
      <div className={`t ${s.hint}`}>
        decoded {dbg.decoded}/{dbg.total} · voices {dbg.liveVoices}/24 · ctx {dbg.ctxState}
        {dbg.failed.length > 0 && ` · FAILED ${dbg.failed.length}`}
      </div>
      {dbg.failed.length > 0 && (
        <div className={`t ${s.failed}`}>{dbg.failed.slice(0, 6).join("  |  ")}</div>
      )}

      <div className={`t ${s.section}`}>STEP TIMELINES — fires the whole beat, exactly as the duel does</div>
      <div className={`v ${s.row}`}>
        {STEP_DEMOS.map((d) => (
          <div key={d.label} className={`press ${s.btn}`}
               onClick={arm(() => scheduleTimeline(cuesForStep(d.step)))}>
            <div className={`t ${s.btnTxt}`}>{d.label}</div>
            <div className={`t ${s.sub}`}>{cuesForStep(d.step).length} cues · {d.step.ms}ms</div>
          </div>
        ))}
      </div>

      <div className={`t ${s.section}`}>INDIVIDUAL CUES ({names.length})</div>
      <div className={`v ${s.row}`}>
        {FAMILIES.map((f) => (
          <div key={f} className={`press ${s.chip}`} style={{ opacity: family === f ? 1 : 0.5 }}
               onClick={arm(() => setFamily(family === f ? null : f))}>
            <div className={`t ${s.btnTxt}`}>{f}</div>
          </div>
        ))}
      </div>
      <div className={`v ${s.row}`}>
        {names.map((n) => (
          <div key={n} className={`press ${s.btn}`} onClick={arm(() => play(n))}>
            <div className={`t ${s.btnTxt}`}>{n}</div>
            <div className={`t ${s.sub}`}>{SFX[n].src}{SFX[n].reverb ? ` · rev ${SFX[n].reverb}` : ""}</div>
          </div>
        ))}
      </div>
      <div className={`t ${s.note}`}>
        Assets live in apps/web/public/sfx/. A cue with a 404 here means Track A has not
        rendered it yet — it will be listed under FAILED above.
      </div>
    </div>
  );
}
```

**Note on `DEMO_SCENARIOS`.** It is a module-level `const` in `duel.tsx` and is *not*
exported. Do not export it just for this bench — the `STEP_DEMOS` list above covers the same
ground at the level that matters (one per step kind), and duplicating 17 short literals is
cheaper than widening `duel.tsx`'s public surface.

`sfx-test.module.css`: keep the existing `.stage` / `.title` / `.hint` / `.row` / `.btn` /
`.btnTxt` / `.note` class names and add `.section`, `.sub`, `.chip`, `.failed`. Follow the
screen's existing P5 palette (`#E60012` crimson, `#FCEE21` yellow, `#111111`) and the
`.v`/`.t`/`.press` global base classes from `src/theme/global.css` — do not hand-roll flex
layout that those already provide.

- [ ] **Step 2: Typecheck and run**

Run: `npm run build`
Expected: clean.

Dev server → `/sfx-test`. Confirm: the header shows `decoded N/M` climbing as buffers land,
every step-timeline button fires, every cue button fires, and the family filter works. Any
404s appear in the FAILED line — **before Task 20 copies the assets, most will 404 and that is
expected**. Stop the server.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/screens/sfx-test.tsx apps/web/src/screens/sfx-test.module.css
git commit -m "feat(web): rebuild /sfx-test as a full audition bench — every cue and every step timeline"
```

---

### Task 19: Wire the non-duel screens

Thin pass, per spec §7.21. Read each file before editing — several of these screens have no
`sfx` import at all today, and the conditional cues from Task 14 Step 1 may not apply.

**Files:**
- Modify: `apps/web/src/screens/campaign.tsx`, `shame.tsx`, `profile.tsx`, `howto.tsx`, `multiplayer.tsx`, `gate.tsx`, `dossier.tsx`
- Modify: `apps/web/src/components/P5Back.tsx` — switch `playClick` to `play("ui.back")`

**Interfaces:**
- Consumes: `play`, `playHover`, `playClick` from `../lib/sfx`.

- [ ] **Step 1: Apply the per-screen changes**

| Screen | Change |
|---|---|
| `campaign.tsx` | `:112` `playCardPop()` → `play("campaign.ticket.pick")`. Add `play("campaign.ticket.claim")` wherever a ticket is confirmed/locked (read the file to find it) |
| `shame.tsx` | Add `play("shame.enter")` in a mount effect **only if** Task 14 Step 1 confirmed an entry transition exists. Keep the existing `playHover` at `:312`. Add `play("shame.stamp")` if there is a verdict/stamp moment |
| `profile.tsx` | No sfx import today. Add `import { playHover, playClick } from "../lib/sfx";` and wire hover/click on its interactive elements. Add `play("profile.stat.up")` **only if** a stat-increment animation exists — otherwise skip |
| `howto.tsx` | No sfx import today. Add hover/click, plus `play("howto.page.turn")` on page/section change. **Do not touch `public/how-to-play/audio/*.mp3`** |
| `multiplayer.tsx` | Stub screen — hover/click only |
| `gate.tsx` | hover/click only |
| `dossier.tsx` | Already has hover/click. Add `play("dossier.card.tilt")` in the ID card's drag/tilt handler — the manifest's 60ms cooldown keeps a continuous drag from machine-gunning |
| `P5Back.tsx` | `:34` `playClick()` → `play("ui.back")` so the shared back button has its own descending sound |

Any manifest cue that ends up with **no** call site must be deleted from
`sfx-manifest.ts` (and its recipe from the studio) rather than left orphaned — Task 20's
integrity test fails on orphans.

- [ ] **Step 2: Typecheck and test**

Run: `npm run build && npm test --workspace=@pacify/web`
Expected: clean.

- [ ] **Step 3: Walk every screen in the browser**

Dev server, then visit `/campaign`, `/shame`, `/profile`, `/howto`, `/multiplayer`, `/gate`,
`/dossier`, `/options` and click through each. Confirm hover/click fire and no console errors.
Stop the server.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/screens/campaign.tsx apps/web/src/screens/shame.tsx apps/web/src/screens/profile.tsx apps/web/src/screens/howto.tsx apps/web/src/screens/multiplayer.tsx apps/web/src/screens/gate.tsx apps/web/src/screens/dossier.tsx apps/web/src/components/P5Back.tsx
git commit -m "feat(web): extend SFX coverage to the non-duel screens"
```

Only stage files this task actually changed. `git status` first.

---

# TRACK C — Integration and verification

### Task 20: Integration — ship the assets and close the loop

Both tracks meet here. Until this task the manifest points at files that do not exist in
`public/`.

**Files:**
- Modify: `apps/web/package.json` — add an asset-sync script
- Modify: `apps/web/test/sfx-manifest.test.ts` — add the file-existence assertions
- Create: `apps/web/public/sfx/*.wav` (copied), `apps/web/public/hover.wav` (overwritten)

- [ ] **Step 1: Add the file-existence test (deferred from Task 6)**

Append to `apps/web/test/sfx-manifest.test.ts`:

```ts
import { existsSync, statSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

const PUBLIC = resolve(__dirname, "..", "public");
const pathFor = (src: string) => join(PUBLIC, src.replace(/^\//, ""));

describe("assets exist on disk (integration gate)", () => {
  it("every manifest src resolves to a real file in public/", () => {
    const missing = Object.entries(SFX)
      .filter(([, def]) => !existsSync(pathFor(def.src)))
      .map(([name, def]) => `${name} -> ${def.src}`);
    expect(missing, `missing assets:\n  ${missing.join("\n  ")}`).toEqual([]);
  });

  it("every public/sfx file is referenced by at least one cue — no orphans", () => {
    const referenced = new Set(Object.values(SFX).map((d) => d.src.replace(/^\//, "")));
    referenced.add("hover.wav");                     // lives at public/ root, not public/sfx/
    const onDisk = readdirSync(join(PUBLIC, "sfx")).filter((f) => f.endsWith(".wav")).map((f) => `sfx/${f}`);
    const orphans = onDisk.filter((f) => !referenced.has(f));
    expect(orphans, `orphan assets:\n  ${orphans.join("\n  ")}`).toEqual([]);
  });

  it("total SFX weight is within the 16MB budget (spec §4.4)", () => {
    const files = readdirSync(join(PUBLIC, "sfx")).filter((f) => f.endsWith(".wav"))
      .map((f) => join(PUBLIC, "sfx", f));
    files.push(join(PUBLIC, "hover.wav"));
    const bytes = files.reduce((a, f) => a + statSync(f).size, 0);
    expect(bytes, `${(bytes / 1048576).toFixed(2)} MB across ${files.length} files`).toBeLessThan(16 * 1048576);
    expect(files.length).toBeLessThanOrEqual(110);
  });

  it("every cue emitted by duel-cues has a real file", async () => {
    const { cuesForStep } = await import("../src/lib/duel-cues");
    const steps: any[] = [
      { kind: "showdown", ms: 3000 }, { kind: "flip", ms: 900 }, { kind: "shieldbreak", ms: 3200 },
      { kind: "clash", ms: 4700, mode: "power", you: 10, klein: 7, ticks: 8 },
      { kind: "clash", ms: 3600, mode: "shield", you: 5, klein: 9, align: "good" },
      { kind: "clash", ms: 3200, mode: "tie", you: 6, klein: 6 },
      { kind: "award", ms: 1500, p1After: 3, p2After: 0, p1Pts: 3 },
      { kind: "multmash", ms: 2400, mult: 2, r7: true, echo: false, base: 3, final: 6, side: "p1" },
      { kind: "drain", ms: 1700, side: "p1", from: 5, tickMs: 200 },
      ...["void", "echo", "eclipse", "ward", "reversal", "executioner", "execfail", "oracle"]
        .map((trick) => ({ kind: "trick", ms: 6200, trick })),
      { kind: "idle", ms: 500 },
    ];
    const missing = new Set<string>();
    for (const st of steps) for (const e of cuesForStep(st)) {
      if (!existsSync(pathFor(cueFile(e.cue)))) missing.add(`${e.cue} -> ${cueFile(e.cue)}`);
    }
    expect([...missing], `unrendered cues:\n  ${[...missing].join("\n  ")}`).toEqual([]);
  });
});
```

`__dirname` is not available in ESM. If vitest's `environment: "node"` does not inject it,
replace the `PUBLIC` line with:

```ts
const PUBLIC = resolve(new URL("..", import.meta.url).pathname.replace(/^\//, ""), "public");
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npm test --workspace=@pacify/web`
Expected: FAIL — `missing assets` listing ~97 paths. This is the first time the two tracks
are actually connected.

- [ ] **Step 3: Add the sync script and run it**

`apps/web/package.json` scripts:

```json
    "sfx:sync": "node -e \"const{cpSync,mkdirSync}=require('fs');mkdirSync('public/sfx',{recursive:true});cpSync('assets/sfx','public/sfx',{recursive:true});cpSync('assets/audio/hover.wav','public/hover.wav');console.log('sfx synced')\"",
    "sfx:render": "npm run render --prefix ../../tools/sfx-studio && npm run sfx:sync"
```

Run: `npm run sfx:sync --workspace=@pacify/web`
Expected: `sfx synced`.

- [ ] **Step 4: Run the gate until it passes**

Run: `npm test --workspace=@pacify/web`
Expected: PASS. If the orphan test fails, a rendered asset has no cue — delete the recipe or
add the cue. If the weight test fails, drop sub-only assets to 22050Hz (spec §4.4: **never**
shorten reverb tails to save bytes).

- [ ] **Step 5: Full build**

Run: `npm run build`
Expected: every workspace typechecks. Also run `npm run test --workspace=@pacify/engine` and
`npm run test --workspace=@pacify/ai-brain` — nothing in this work should touch them, and if
either fails it means something was edited that should not have been.

- [ ] **Step 6: Commit**

```bash
git add apps/web/package.json apps/web/test/sfx-manifest.test.ts apps/web/public/sfx apps/web/public/hover.wav
git commit -m "feat(web): ship the rendered SFX assets and close the manifest integrity loop"
```

Check `git status` after — this commit is large by file count (~101 WAVs). Confirm nothing from
`public/musics/` or the pre-existing modified files got swept in.

---

### Task 21: Headless browser audit

Turns "we checked it in a browser once" into a repeatable gate. Follows the
`tools/motion/smoke.mjs` pattern and **reuses its harness** rather than reinventing one.

**Files:**
- Create: `tools/sfx-studio/smoke.mjs`

**Interfaces:**
- Consumes: `puppeteer-core` (root dep), `startServer` from `../motion/serve.mjs`, `findChrome` from `../motion/capture.mjs`.
- Produces: exit 0 / exit 1 with a printed report. Runnable as `npm run smoke --prefix tools/sfx-studio`.

- [ ] **Step 1: Write the audit**

```js
/* Headless SFX audit. Proves every asset decodes, no cue throws, and the voice cap
   holds — the objective half of spec §9.1c.

   NOTE: unlike tools/motion/smoke.mjs this must NOT pass --mute-audio, or it cannot
   exercise real playback. It asserts on debugAudio() counters instead of on sound.

   Run: node tools/sfx-studio/smoke.mjs [--url http://localhost:8081]
*/

import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import puppeteer from "puppeteer-core";

import { startServer } from "../motion/serve.mjs";
import { findChrome } from "../motion/capture.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "..", "..");
const { values } = parseArgs({ options: { url: { type: "string" } } });

const LAUNCH_ARGS = [
  "--no-sandbox", "--disable-dev-shm-usage", "--hide-scrollbars",
  "--autoplay-policy=no-user-gesture-required",   // let the headless page unlock audio
];

function attach(page, errs, bad) {
  page.on("pageerror", (e) => errs.push(String(e?.message ?? e)));
  page.on("console", (m) => {
    if (m.type() === "error" && !/Failed to load resource/i.test(m.text())) errs.push(`console: ${m.text()}`);
  });
  page.on("response", (r) => {
    if (r.status() >= 400 && /\.wav(\?|$)/i.test(r.url())) bad.push(`${r.status()} ${r.url()}`);
  });
}

async function open(browser, url, errs, bad) {
  const page = await browser.newPage();
  attach(page, errs, bad);
  await page.goto(url, { waitUntil: "networkidle0", timeout: 120_000 });
  return page;
}

async function main() {
  const server = values.url ? null : await startServer({ root: REPO });
  const base = values.url ?? server.url;
  console.log(`server: ${base}`);
  const errs = [], bad = [];
  let exitCode = 0;

  const browser = await puppeteer.launch({
    executablePath: findChrome(), headless: true, args: LAUNCH_ARGS,
    defaultViewport: { width: 1280, height: 800, deviceScaleFactor: 1 },
  });

  try {
    // ---- 1. /sfx-test: every asset must decode ----
    console.log("\n[1/3] sfx-test — decode audit");
    const bench = await open(browser, `${base}/sfx-test`, errs, bad);
    // the bench calls initSfx() on mount; wait for the decode set to settle
    await bench.waitForFunction("document.body.innerText.includes('decoded')", { timeout: 30_000 });
    await new Promise((r) => setTimeout(r, 8000));   // initSfx has a 6s cap; let it finish
    const header = await bench.evaluate(() => document.body.innerText.split("\n").find((l) => l.includes("decoded")) ?? "");
    console.log(`  ${header.trim()}`);
    const m = header.match(/decoded (\d+)\/(\d+)/);
    if (!m) { console.error("  FAIL: could not read the decoded counter"); exitCode = 1; }
    else {
      const [, decoded, total] = m.map(Number);
      console.log(`  decoded ${decoded}/${total}`);
      if (decoded < total) { console.error(`  FAIL: ${total - decoded} asset(s) did not decode`); exitCode = 1; }
    }

    // ---- 2. fire every cue, then every step timeline ----
    console.log("\n[2/3] sfx-test — fire every cue");
    const fired = await bench.evaluate(async () => {
      const mod = await import("/src/lib/sfx.ts");
      mod.unlockSfx();
      let n = 0;
      for (const name of mod.listSfx()) { mod.play(name); n++; }
      await new Promise((r) => setTimeout(r, 500));
      const peakVoices = mod.debugAudio().liveVoices;
      return { n, peakVoices, dbg: mod.debugAudio() };
    });
    console.log(`  fired ${fired.n} cues, peak live voices ${fired.peakVoices}`);
    if (fired.dbg.liveVoices > 24) { console.error(`  FAIL: voice cap breached (${fired.dbg.liveVoices})`); exitCode = 1; }
    if (fired.dbg.failed.length) { console.error(`  FAIL: ${fired.dbg.failed.length} decode failure(s):`); fired.dbg.failed.slice(0, 8).forEach((f) => console.error(`    ${f}`)); exitCode = 1; }

    // ---- 3. /duel?demo=all — the 24-scenario playlist ----
    console.log("\n[3/3] duel?demo=all — 24-scenario choreography");
    const duel = await open(browser, `${base}/duel?demo=all`, errs, bad);
    await duel.evaluate(() => { try { localStorage.setItem("pacify.guest", "1"); } catch {} });
    await new Promise((r) => setTimeout(r, 5000));
    // each scenario runs ~6-10s plus a 1700ms gap; 24 scenarios is several minutes.
    // Sample the voice count repeatedly rather than waiting for the whole playlist.
    let maxVoices = 0;
    for (let i = 0; i < 24; i++) {
      const v = await duel.evaluate(async () => {
        const mod = await import("/src/lib/sfx.ts");
        mod.unlockSfx();
        return mod.debugAudio().liveVoices;
      }).catch(() => 0);
      if (v > maxVoices) maxVoices = v;
      await new Promise((r) => setTimeout(r, 5000));
    }
    console.log(`  peak live voices across the playlist: ${maxVoices}`);
    if (maxVoices > 24) { console.error(`  FAIL: voice cap breached (${maxVoices})`); exitCode = 1; }

    // ---- verdict ----
    console.log("\n=== VERDICT ===");
    if (errs.length) { console.error(`PAGE ERRORS (${errs.length}):`); errs.slice(0, 12).forEach((e) => console.error(`  ${e}`)); exitCode = 1; }
    if (bad.length) { console.error(`FAILED .wav REQUESTS (${bad.length}):`); bad.slice(0, 12).forEach((b) => console.error(`  ${b}`)); exitCode = 1; }
    if (!errs.length && !bad.length && exitCode === 0) console.log("SMOKE PASSED — all assets decoded, no page errors, voice cap held");
    else console.error("SMOKE FAILED");
  } finally {
    await browser.close();
    if (server) await server.close();
  }
  process.exit(exitCode);
}

main().catch((e) => { console.error(e); process.exit(1); });
```

**Two things this script assumes and the implementer must verify:**

1. `import("/src/lib/sfx.ts")` works because the Vite dev server serves source modules at
   their `/src/...` path. This only works against `npm run dev`, **not** against a production
   `vite build`. `startServer` from `tools/motion/serve.mjs` is a static file server — so run
   this against the Vite dev server: start `npm run dev --workspace=@pacify/web` in the
   background and pass `--url http://localhost:8081`. Update the `server` fallback accordingly
   or drop it and make `--url` required.
2. The `/duel` route may redirect to `/gate` or `/login` without a session. Step 3 sets a
   localStorage key as a guess — **read `apps/web/src/App.tsx` and the gate logic to find the
   real auth precondition**, and set that instead. If the route cannot be reached headlessly,
   drive `/duel?demo=all` via the same entry the browser uses and record what was needed.

- [ ] **Step 2: Run it**

Start the dev server in the background, then:

Run: `node tools/sfx-studio/smoke.mjs --url http://localhost:8081`
Expected: `SMOKE PASSED`. Runtime is ~3 minutes (the playlist sampling dominates).

If it reports `FAIL: N asset(s) did not decode`, cross-check against
`tools/sfx-studio/build/check-report.md` — an asset can pass `check.mjs` and still fail to
decode if the WAV header is malformed, which is a `wav.mjs` bug, not a recipe bug.

- [ ] **Step 3: Prove the audit can fail**

Temporarily rename one asset (`mv apps/web/public/sfx/duel-stamp.wav /tmp/`), re-run, confirm
it reports a failure and exits 1, then restore it. A gate never seen to fail is not a gate.

- [ ] **Step 4: Commit**

```bash
git add tools/sfx-studio/smoke.mjs tools/sfx-studio/package.json
git commit -m "feat(sfx-studio): headless browser audit — decode coverage, voice cap, 24-scenario playlist"
```

---

### Task 22: The timing audit

The deliverable that answers "does it *fit*?" with evidence rather than assertion: every
animation delay in the duel paired against the cue offset that sounds it.

**Files:**
- Create: `docs/sfx-sets.md`

- [ ] **Step 1: Generate the cue half mechanically**

Do not transcribe offsets by hand — they are produced by `cuesForStep()` and already asserted
in `apps/web/test/duel-cues.test.ts`. Dump them straight from the source of truth. `tsx` is
already on the repo root's `.bin`, and `duel-cues.ts`'s only import from `duel.tsx` is
`import type`, which the transpiler erases — so the React/CSS module graph is never touched:

```bash
npx tsx -e "
import { cuesForStep } from './apps/web/src/lib/duel-cues.ts';
const steps = [
  { kind:'showdown', ms:3000 }, { kind:'flip', ms:900 }, { kind:'shieldbreak', ms:3200 },
  { kind:'clash', ms:4700, mode:'power', you:10, klein:7, ticks:8 },
  { kind:'clash', ms:3600, mode:'shield', you:5, klein:9, align:'good' },
  { kind:'clash', ms:3200, mode:'tie', you:6, klein:6 },
  { kind:'multmash', ms:2400, mult:2, r7:true, echo:false, base:3, final:6, side:'p1' },
  { kind:'award', ms:1500, p1After:3, p2After:0, p1Pts:3 },
  { kind:'drain', ms:1700, side:'p1', from:5, tickMs:200 },
  ...['void','echo','eclipse','ward','reversal','executioner','execfail','oracle'].map(trick=>({kind:'trick',ms:6200,trick})),
];
for (const s of steps) {
  console.log('## ' + s.kind + (s.trick ? ' · ' + s.trick : s.mode ? ' · ' + s.mode : ''));
  for (const e of cuesForStep(s)) console.log('| ' + e.at + ' | \`' + e.cue + '\` | ' + (e.pitch ?? '') + ' | ' + (e.pan ?? '') + ' |');
}
" > /tmp/cue-dump.md 2>&1; head -60 /tmp/cue-dump.md
```

If `tsx` fails to resolve the `.ts` extension, drop it: `./apps/web/src/lib/duel-cues`. Paste
the dump into the timing-audit section of `docs/sfx-sets.md`.

- [ ] **Step 2: Write `docs/sfx-sets.md`**

Structure it like the existing `music-sets.md` — a documented source of truth with a "keep in
sync" instruction at the top:

1. **Header** — what this file is, that spec §7 is normative, and that the cue offsets are
   generated by `cuesForStep()` and asserted by `apps/web/test/duel-cues.test.ts`.
2. **Asset inventory** — paste the table from `tools/sfx-studio/build/check-report.md`
   (asset, family, ms, peak, rms, KB).
3. **Provenance** — paste `tools/sfx-studio/sources/provenance.json`, or link it, with the
   CC0 assertion stated explicitly.
4. **Timing audit** — for each beat, a three-column table: *animation (CSS name + delay from
   `duel.tsx`/`duel-keyframes.ts`)* | *cue* | *offset*. Use the Step 1 dump for the cue column
   and read the animation delays from the source. **Any row where the two numbers disagree is a
   bug — fix `duel-cues.ts`, not this document.**
5. **Shared assets** — the spec §5.5 table, so a future editor knows not to "fix" a duplicate
   path.
6. **Known gaps** — anything left unsounded on purpose (the `idle` step, the "YOUR MOVE"
   infinite pulse, the 20 VOID motes, the speedlines backdrop) and why.

- [ ] **Step 3: Reconcile the audit against spec §7**

Walk spec §7.1–§7.20 and confirm every row appears in the timing audit. This is the check that
nothing was silently dropped between spec and implementation. List any deliberate deviation
and its reason — Task 8 already records one (sub-ticker cues pre-scheduled instead of hooked
into the intervals).

- [ ] **Step 4: Commit**

```bash
git add docs/sfx-sets.md
git commit -m "docs: SFX sets — asset inventory, CC0 provenance, and the animation-to-cue timing audit"
```

---

### Task 23: Final report and taste handoff

**Files:** none — this task produces a report to the user, not code.

- [ ] **Step 1: Re-run every gate from clean**

```bash
node --test tools/sfx-studio/
node tools/sfx-studio/check.mjs
npm run build
npm test --workspace=@pacify/web
npm run test --workspace=@pacify/engine
npm run test --workspace=@pacify/ai-brain
```
All must pass. Record the actual output, not an expectation.

- [ ] **Step 2: Re-run the browser audit**

Dev server in the background, then `node tools/sfx-studio/smoke.mjs --url http://localhost:8081`.
Record the decoded count, peak voices, and whether any page errors appeared.

- [ ] **Step 3: Report to the user**

State exactly what was **measured** and what was **not**. The report must contain:

- asset count, total MB, and the `check.mjs` verdict
- decoded/total from the browser audit, peak live voices, page-error count
- which ANIM LAB scenarios were exercised
- the timing-audit result: how many beats were paired, and whether any offset disagreed with
  its CSS delay
- **explicitly**: "nobody on this team can hear the result. Timbre, loudness balance, and
  whether the guillotine hits hard enough are unverified. Please audition `/sfx-test` and
  `/duel?demo=all`."
- the open items from spec §12 that still need the user: the duel BGM track, the duck depth,
  and taste sign-off
- anything that was dropped or changed versus the spec, with the reason

Do **not** write "sounds good", "the SFX fit well", or any equivalent. Spec §9.2 forbids it.

- [ ] **Step 4: Leave the working tree clean**

`git status` — confirm no stray files. The `build/` and `sources/raw|normalised/` dirs are
gitignored. The pre-existing 20 modified files must still be modified and unstaged, exactly as
they were found.

---

## Self-review notes

Written after the full plan, checking it against the spec.

**Spec coverage.** §1 goal → all tasks. §2 sonic identity → Task 12/13 design tables carry
the per-trick signatures and the no-reverb-on-VOID rule is enforced by a manifest test in
Task 6. §3 architecture → Tasks 1–8. §4 studio, DSP, recipes, CC0, format → Tasks 1–4.
§5 engine, manifest, graph, API, voice budget, sharing → Tasks 6–7. §6 hook points → Tasks
15–16. §7 cue table → Tasks 8–14 and the timing audit in Task 22. §8 BGM → Task 17.
§9 verification → Task 5 (studio gate), Task 6+20 (integrity), Task 21 (browser), Task 22
(timing), Task 23 (report). §9.2 honest limit → Task 23 Step 3 makes it mandatory language.
§10 delegation → the track structure. §11 risks → Global Constraints. §12 open items →
surfaced in Tasks 17 and 23.

**Two deliberate deviations from the spec, both recorded where they happen:**
1. Spec §6.2 suggested hooking the three `setInterval` sub-tickers. Task 8 pre-schedules them
   instead, because every count is derivable from the step. Fewer hook points, zero drift.
2. Spec §4.4 capped assets at 75 files. Authoring the manifest (Task 6) produced 101, and
   consolidating further would have cost real articulation. The spec was amended to ≤110
   files / ≤16 MB before this plan was written.

**Known soft spots the executor should watch:**
- Task 21's `import("/src/lib/sfx.ts")` and the `/duel` auth precondition are the two places
  where the plan states an assumption instead of a verified fact. Both are flagged inline with
  what to check. They are the most likely steps to need rework.
- Task 9 Step 2 changes `render.mjs`'s wipe behaviour, which retroactively affects Task 3
  Step 5's determinism commands. Task 9 says so explicitly.
- The `duel.clash.vs` pan decision in Task 10 amends the Task 6 manifest. That is intentional
  (the design was refined while authoring) but means Task 6's manifest is not final until
  Task 10 Step 2.

import { test, after } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, rm, readFile, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Importing render.mjs must have NO side effects: no argv parsing (node --test
// passes its own flags), no rendering to disk. If the entry guard regresses, this
// import alone would throw or run the full CLI.
import { renderRecipe } from "./render.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "..", "..");
const DEFAULT_OUT = join(REPO, "apps", "web", "assets", "sfx");

let tmpRoot;
async function tmpDir(tag) {
  if (!tmpRoot) tmpRoot = await mkdtemp(join(tmpdir(), "sfx-render-test-"));
  return join(tmpRoot, tag);
}
after(async () => {
  if (tmpRoot) await rm(tmpRoot, { recursive: true, force: true });
});

const sha256 = (buf) => createHash("sha256").update(buf).digest("hex");

/* A click-like recipe WITH a reverb declaration, so dry-vs-wet is observable.
   (The shipping `click` recipe deliberately declares no reverb — dry UI sound.) */
const probeRecipe = {
  name: "probe",
  family: "test",
  sampleRate: 44100,
  seed: 1001,
  layers: [
    { kind: "noise", color: "white", dur: 0.006, at: 0, gain: 0.9,
      env: [[0, 1], [0.006, 0]], filter: { type: "bandpass", f: 2600, q: 1.4 } },
    { kind: "osc", wave: "tri", f: 520, fEnd: 300, glide: "exp", dur: 0.07, at: 0, gain: 0.55,
      env: [[0, 0.9], [0.008, 1], [0.07, 0]], filter: { type: "lowpass", f: 3200, q: 0.8 } },
  ],
  reverb: { preset: "plate", send: 0.2 },
  master: { normalizeTo: -3 },
};

test("importing render.mjs exports renderRecipe without running the CLI", async () => {
  assert.equal(typeof renderRecipe, "function");
  // the default out dir must not have been created by the import
  await assert.rejects(() => stat(DEFAULT_OUT), "import of render.mjs wrote to the default out dir");
});

test("bare renderRecipe(recipe) honours defaults: default dir, trimmed, DRY", async () => {
  const recipe = { ...probeRecipe, name: "defaults-probe" };
  const preExisting = await stat(DEFAULT_OUT).then(() => true, () => false);
  try {
    const res = await renderRecipe(recipe);
    assert.equal(res.path, join(DEFAULT_OUT, "defaults-probe.wav"));
    // dry: no 3.2s IR tail — the click body is ~76ms; allow generous headroom
    const durS = res.stats.samples / res.sampleRate;
    assert.ok(durS < 0.5, `default render should be dry, got ${durS}s`);
    // trimmed + normalised to the recipe's -3 dBFS
    assert.ok(Math.abs(res.stats.peakDbfs - -3) < 0.01, `peak ${res.stats.peakDbfs}`);
  } finally {
    await rm(join(DEFAULT_OUT, "defaults-probe.wav"), { force: true });
    if (!preExisting) await rm(DEFAULT_OUT, { recursive: true, force: true });
  }
});

test("dry is the default: wet render is longer and byte-different", async () => {
  const dryDir = await tmpDir("dry");
  const wetDir = await tmpDir("wet");
  const dryRes = await renderRecipe(probeRecipe, { outDir: dryDir });
  const wetRes = await renderRecipe(probeRecipe, { outDir: wetDir, wet: true });
  // wet must carry the reverb tail: at least 0.1s longer than dry
  assert.ok(
    wetRes.stats.samples > dryRes.stats.samples + 4410,
    `wet (${wetRes.stats.samples}) should outlast dry (${dryRes.stats.samples}) by the IR tail`,
  );
  const dryBytes = await readFile(dryRes.path);
  const wetBytes = await readFile(wetRes.path);
  assert.notEqual(sha256(dryBytes), sha256(wetBytes), "dry and wet renders must differ");
});

test("re-rendering the same recipe is byte-identical (determinism)", async () => {
  const a = await tmpDir("det-a");
  const b = await tmpDir("det-b");
  const resA = await renderRecipe(probeRecipe, { outDir: a, wet: true });
  const resB = await renderRecipe(probeRecipe, { outDir: b, wet: true });
  const hA = sha256(await readFile(resA.path));
  const hB = sha256(await readFile(resB.path));
  assert.equal(hA, hB, "same recipe must render byte-identical (wet path included)");
});

test("opts.keepSilence reaches the library (no CLI state)", async () => {
  const dir = await tmpDir("keep");
  const recipe = {
    ...probeRecipe,
    name: "keep-probe",
    layers: [{ kind: "osc", wave: "sine", f: 440, dur: 0.05, at: 0.1, gain: 0.8,
      env: [[0, 1], [0.05, 0]] }],
    reverb: undefined,
  };
  const trimmed = await renderRecipe(recipe, { outDir: dir });
  const kept = await renderRecipe(recipe, { outDir: dir, keepSilence: true });
  // 100ms of leading silence must survive with keepSilence and be trimmed without
  assert.ok(
    kept.stats.samples > trimmed.stats.samples + 4000,
    `keepSilence (${kept.stats.samples}) should retain the leading gap vs trimmed (${trimmed.stats.samples})`,
  );
});

test("normalizeTo above the master ceiling is clamped to -1 dBFS, with a named warning", async () => {
  const dir = await tmpDir("clamp");
  const recipe = { ...probeRecipe, name: "clamp-probe", reverb: undefined, master: { normalizeTo: 0 } };
  const warns = [];
  const origWarn = console.warn;
  console.warn = (...args) => warns.push(args.join(" "));
  let res;
  try {
    res = await renderRecipe(recipe, { outDir: dir });
  } finally {
    console.warn = origWarn;
  }
  assert.ok(res.stats.peakDbfs <= -1 + 0.01, `peak ${res.stats.peakDbfs} dBFS exceeds the -1 ceiling`);
  assert.equal(warns.length, 1, "expected exactly one clamp warning");
  assert.ok(warns[0].includes("clamp-probe"), `warning should name the recipe: ${warns[0]}`);
});

test("normalizeTo at or below the ceiling passes through unclamped and unwarned", async () => {
  const dir = await tmpDir("noclamp");
  const recipe = { ...probeRecipe, name: "noclamp-probe", reverb: undefined, master: { normalizeTo: -3 } };
  const warns = [];
  const origWarn = console.warn;
  console.warn = (...args) => warns.push(args.join(" "));
  let res;
  try {
    res = await renderRecipe(recipe, { outDir: dir });
  } finally {
    console.warn = origWarn;
  }
  assert.ok(Math.abs(res.stats.peakDbfs - -3) < 0.01, `peak ${res.stats.peakDbfs}`);
  assert.equal(warns.length, 0, "no warning expected for a legal target");
});

test("a silence layer extends the render without emitting audio", async () => {
  const dir = await tmpDir("silence");
  const withGap = {
    ...probeRecipe,
    name: "silence-probe",
    reverb: undefined,
    layers: [
      { kind: "silence", dur: 0.2 },
      { kind: "osc", wave: "sine", f: 440, dur: 0.05, at: 0.3, gain: 0.8,
        env: [[0, 1], [0.05, 0]] },
    ],
  };
  const res = await renderRecipe(withGap, { outDir: dir, keepSilence: true });
  // sizing counts the spacer + the layer at 0.3s: total ~0.35s
  const durS = res.stats.samples / res.sampleRate;
  assert.ok(durS >= 0.34 && durS <= 0.36, `expected ~0.35s, got ${durS}s`);
  assert.equal(res.layers, 1, "silence layers are not counted as audio layers");
});

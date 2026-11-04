/* Offline SFX renderer.

   Run: node tools/sfx-studio/render.mjs [--only <name>] [--family <family>] [--out <dir>] [--clean] [--wet] [--keepSilence]
   Default --out is apps/web/assets/sfx (the source of truth, spec §4.4). Copying to
   apps/web/public/sfx is a separate, explicit step — see Task 19.
   --out is NOT wiped unless --clean is passed: the six render-task families share
   the default directory and must not delete each other's output.

   Renders are DRY by default: the runtime applies reverb live from the manifest's
   per-cue reverb/reverbIR fields through a ConvolverNode send, so baking the tail
   into the shipping asset would apply it twice. --wet convolves recipe.reverb in
   for auditioning only — its output is a preview, never a shipping asset.

   Importing this module has no side effects: the CLI (parseArgs + main) runs only
   when this file is the process entry point, so `renderRecipe` is safe to import. */

import { statSync } from "node:fs";
import { mkdir, rm } from "node:fs/promises";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseArgs } from "node:util";

import { prng } from "./prng.mjs";
import { writeWav, readWav } from "./wav.mjs";
import {
  osc, noise, applyEnv, biquad, pitch, mixInto, trimSilence,
  limit, normalize, stats, dbToLin,
} from "./dsp.mjs";
import { convolve } from "./fft.mjs";
import { makeIR } from "./ir.mjs";
import { RECIPES } from "./recipes/index.mjs";

/**
 * @typedef {{ kind: "osc", wave: "sine"|"tri"|"saw"|"square", f: number, fEnd?: number,
 *   glide?: "lin"|"exp", dur: number, at: number, gain?: number, env: EnvPoints,
 *   filter?: FilterSpec, pan?: number, pitch?: number, phase?: number }} OscLayer
 * @typedef {{ kind: "noise", color: "white"|"pink"|"brown", dur: number, at: number,
 *   gain?: number, env: EnvPoints, filter?: FilterSpec, pan?: number, pitch?: number }} NoiseLayer
 * @typedef {{ kind: "sample", src: string, at: number, gain?: number, env?: EnvPoints,
 *   filter?: FilterSpec, pan?: number, pitch?: number, reverse?: boolean,
 *   trimStart?: number, trimEnd?: number }} SampleLayer
 * @typedef {{ kind: "silence", dur: number, at?: number }} SilenceLayer
 *   A spacer: extends the render by `dur` seconds at `at` without emitting audio —
 *   used to reserve time inside a recipe (e.g. gaps between grouped hits). It is
 *   counted in sizing and skipped in the mix.
 * @typedef {Array<[number, number]>} EnvPoints
 * @typedef {{ type: string, f: number, fEnd?: number, q?: number, gainDb?: number }} FilterSpec
 * @typedef {{ name: string, family: string, layers: Array<OscLayer|NoiseLayer|SampleLayer|SilenceLayer>,
 *   reverb?: { preset: string, send: number, preDelayMs?: number },
 *   master?: { gain?: number, normalizeTo?: number },
 *   sampleRate?: 44100|22050, seed?: number, outDir?: string }} Recipe
 *
 * `outDir` (optional) is a repo-relative path resolved against the repo root; it
 * overrides --out for that single recipe (e.g. hover.wav -> apps/web/assets/audio).
 */

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "..", "..");
const DEFAULT_OUT = join(REPO, "apps", "web", "assets", "sfx");
const SOURCES = join(HERE, "sources", "normalised");

/* Hard master ceiling. The limiter clamps peaks to this, so a recipe asking to
   normalise above it would undo the limiter — the target is clamped to match. */
const MASTER_CEILING_DBFS = -1;

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

/**
 * Render one recipe to disk. Pure library entry point — no CLI state is read here;
 * everything comes from `opts`.
 *
 * @param {Recipe} recipe
 * @param {{ outDir?: string, keepSilence?: boolean, wet?: boolean }} [opts]
 *   outDir       — destination directory (default: recipe.outDir resolved against
 *                  the repo root, else apps/web/assets/sfx).
 *   keepSilence  — skip the trailing trimSilence pass (default false = trim).
 *   wet          — convolve recipe.reverb into the output (default false = DRY).
 *                  Off by default because the runtime applies reverb live from the
 *                  manifest; a wet render is an audition preview only.
 */
export async function renderRecipe(recipe, { outDir, keepSilence = false, wet = false } = {}) {
  const dest = outDir ?? (recipe.outDir ? resolve(REPO, recipe.outDir) : DEFAULT_OUT);
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

  // 3. reverb send — WET PREVIEWS ONLY. Off by default because the runtime audio
  // graph feeds every voice through a send into a live ConvolverNode built from the
  // manifest's reverb/reverbIR fields; baking the tail into the shipping file would
  // apply it twice. recipe.reverb stays in the format as the designer's intent, the
  // source for the manifest values, and the recipe this preview convolves with.
  let out = dry;
  if (wet && recipe.reverb && recipe.reverb.send > 0) {
    const ir = makeIR({ preset: recipe.reverb.preset, seconds: 3.2, sampleRate, rand: prng((recipe.seed ?? 1) + 7) });
    const wetBuf = convolve(dry, ir);
    const pre = Math.round(((recipe.reverb.preDelayMs ?? 0) / 1000) * sampleRate);
    const merged = new Float32Array(Math.max(dry.length, wetBuf.length + pre));
    merged.set(dry, 0);
    for (let i = 0; i < wetBuf.length; i++) {
      const j = i + pre;
      if (j < merged.length) merged[j] = Math.max(-1, Math.min(1, merged[j] + wetBuf[i] * recipe.reverb.send));
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
  out = limit(out, { ceiling: dbToLin(MASTER_CEILING_DBFS), lookahead: 64 });
  const requestedDbfs = recipe.master?.normalizeTo ?? -3;
  let targetDbfs = requestedDbfs;
  if (targetDbfs > MASTER_CEILING_DBFS) {
    console.warn(
      `warn: recipe "${recipe.name}" normalizeTo ${requestedDbfs} dBFS is above the ` +
      `${MASTER_CEILING_DBFS} dBFS master ceiling — clamping to ${MASTER_CEILING_DBFS} dBFS`,
    );
    targetDbfs = MASTER_CEILING_DBFS;
  }
  out = normalize(out, targetDbfs);
  if (!keepSilence) out = trimSilence(out, sampleRate, { thresholdDb: -50, keepMs: 1 });

  // 5. write
  await mkdir(dest, { recursive: true });
  const path = join(dest, `${recipe.name}.wav`);
  await writeWav(path, { sampleRate, data: out });
  return { path, stats: stats(out), layers: layerCount, sampleRate };
}

function parseCli() {
  const { values } = parseArgs({
    options: {
      only: { type: "string" },
      family: { type: "string" },
      out: { type: "string", default: DEFAULT_OUT },
      keepSilence: { type: "boolean", default: false },
      clean: { type: "boolean", default: false },
      wet: { type: "boolean", default: false },
    },
  });
  return values;
}

async function main() {
  const values = parseCli();
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
  // NOTE: --clean wipes only the --out directory, never a per-recipe outDir target —
  // silently deleting e.g. apps/web/assets/audio would be worse than the inconsistency.
  if (values.clean) await rm(values.out, { recursive: true, force: true }).catch(() => {});
  await mkdir(values.out, { recursive: true });
  const targetOf = (r) => (r.outDir ? resolve(REPO, r.outDir) : values.out);
  // name every distinct destination, so a recipe writing outside --out is not hidden
  const targets = [...new Set(wanted.map(targetOf))];
  let bytes = 0;
  console.log(
    `rendering ${wanted.length} recipe(s) -> ${targets.join(", ")}` +
    (values.wet ? "  (WET PREVIEW — not for shipping)" : ""),
  );
  for (const r of wanted) {
    const t0 = Date.now();
    const res = await renderRecipe(r, {
      outDir: targetOf(r),
      keepSilence: values.keepSilence,
      wet: values.wet,
    });
    const kb = statSync(res.path).size / 1024;
    bytes += statSync(res.path).size;
    console.log(
      `  ${r.name.padEnd(26)}` +
      `${((res.stats.samples / res.sampleRate) * 1000).toFixed(0).padStart(5)}ms` +
      `  peak ${res.stats.peakDbfs.toFixed(1).padStart(6)}dB` +
      `  rms ${res.stats.rmsDbfs.toFixed(1).padStart(6)}dB` +
      `  ${String(res.layers).padStart(2)} layers` +
      `  ${kb.toFixed(0).padStart(5)}KB` +
      `  (${Date.now() - t0}ms)`,
    );
  }
  console.log(`total ${(bytes / 1048576).toFixed(2)} MB`);
}

// Run the CLI only when this file is the process entry point, so importing
// renderRecipe from tests or later tooling has no side effects (no argv parsing,
// no rendering to disk).
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => { console.error(e); process.exit(1); });
}

/* Objective quality gate. Runs after every render; exit 1 on any violation.
   These checks are what let us claim "the SFX work" without being able to hear them
   (spec §9.1a, §9.2). */

import { readdir, mkdir, writeFile } from "node:fs/promises";
import { join, dirname, resolve, basename } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseArgs } from "node:util";

import { readWav } from "./wav.mjs";
import { stats, dbToLin } from "./dsp.mjs";
import { RECIPES } from "./recipes/index.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "..", "..");
const DEFAULT_DIR = join(REPO, "apps", "web", "assets", "sfx");

export const REPO_ROOT = REPO;

export const CEILING_DBFS = -1.0;
export const MAX_HEAD_SILENCE_MS = 5;
export const MIN_LAYERS = 2;
export const HEAD_SILENCE_THRESHOLD_DB = -50;

/* Crest factor = peak - rms, in dB — the one absolute loudness-shape check (Ruling 17).

   There is deliberately NO per-family RMS window. Crest is normalisation-invariant: scaling
   a cue moves peak and rms together, so this constrains *character* without fighting the
   deliberate per-cue peak targets (hover at -14, click at -3, duel-thinking at -18). That is
   why no single band could hold `ui` (which legitimately spans ~-25 to -14 dBFS RMS) without
   becoming useless. Below 2 dB the body is brick-walled — a limiter with no transient left;
   above 30 dB a single-sample spike carries a near-silent body. Both are audible defects.

   Mix loudness is NOT this gate's job: it is set by each recipe's `normalizeTo` and the
   manifest's per-cue `gain`. The floor below only catches assets that are inaudible at all. */
export const CREST_MIN_DB = 2;
export const CREST_MAX_DB = 30;

/* Anything quieter than this in RMS is not a cue, it is a rounding error. */
export const RMS_FLOOR_DBFS = -45;

/* Longest step each family must fit inside, from spec §7. A cue may be shorter; it may
   not be longer, or it bleeds into the next beat.

   BUDGET_MS is also the family registry: a family absent here is an unknown family and
   checkBuffer fails it. Do not treat it as a duration table only — deleting an entry
   would silently un-audit every asset in that family. */
export const BUDGET_MS = {
  "ui": 600, "stamp": 500, "table": 1600, "clash": 1200, "shield": 3200, "score": 2400,
  "round": 2300, "screens": 1200, "trick-void": 4800, "trick-echo": 4000,
  "trick-eclipse": 4000, "trick-ward": 6200, "trick-reversal": 4600, "trick-exec": 4400,
  "trick-oracle": 4600,
};

/** @returns {Array<{rule: string, message: string}>} */
export function checkBuffer(data, sampleRate, { family, layers, budgetMs }) {
  const v = [];
  const s = stats(data);
  const durMs = (data.length / sampleRate) * 1000;

  // BUDGET_MS doubles as the family registry. An unknown family would silently skip the
  // duration check — that is how a whole batch of assets goes unaudited. Fail loudly.
  if (!BUDGET_MS[family]) {
    v.push({ rule: "family", message: `family "${family}" is not in BUDGET_MS — unknown families are unaudited, add it to the registry` });
  }

  if (s.peak > dbToLin(CEILING_DBFS) + 1e-4) {
    v.push({ rule: "peak", message: `peak ${s.peakDbfs.toFixed(2)} dBFS exceeds the ${CEILING_DBFS} dBFS ceiling` });
  }
  if (s.rms < 1e-6) {
    v.push({ rule: "rms", message: `buffer is silent (rms ${s.rms.toExponential(1)}) — there is no audio at all` });
  } else {
    if (s.rmsDbfs < RMS_FLOOR_DBFS) {
      v.push({ rule: "rms", message: `rms ${s.rmsDbfs.toFixed(1)} dBFS is below the ${RMS_FLOOR_DBFS} dBFS floor — not literally silent, but inaudible next to any other cue` });
    }
    const crest = s.peakDbfs - s.rmsDbfs;
    if (crest < CREST_MIN_DB || crest > CREST_MAX_DB) {
      v.push({ rule: "crest", message:
        `crest ${crest.toFixed(1)} dB outside the [${CREST_MIN_DB}, ${CREST_MAX_DB}] dB window ` +
        `(peak ${s.peakDbfs.toFixed(1)} dBFS, rms ${s.rmsDbfs.toFixed(1)} dBFS) — ` +
        `below ${CREST_MIN_DB} dB the body is brick-walled with no transient, above ${CREST_MAX_DB} dB one spike carries a near-silent body` });
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

/* Where render.mjs writes a recipe: `recipe.outDir` (repo-relative, resolved against the
   repo root) wins; otherwise the directory being scanned. render.mjs's CLI resolves the
   same way (`r.outDir ? resolve(REPO, r.outDir) : --out`), so the two cannot disagree. */
export function targetDirOf(recipe, scanDir) {
  return recipe.outDir ? resolve(REPO, recipe.outDir) : scanDir;
}

const sameDir = (a, b) => {
  const na = resolve(a), nb = resolve(b);
  return process.platform === "win32" ? na.toLowerCase() === nb.toLowerCase() : na === nb;
};

/* Ruling 18: "missing" is only meaningful for the directory being scanned. A recipe bound
   elsewhere (e.g. hover -> apps/web/assets/audio, whose public path is load-bearing) must
   not fail a default sfx scan forever; it is reported informationally instead, and the
   distinction is machine-readable in --json as `elsewhere`. */
export function classifyTargets(recipes, scanDir, renderedNames) {
  const missing = [];
  const elsewhere = [];
  for (const r of recipes) {
    const dir = targetDirOf(r, scanDir);
    if (!sameDir(dir, scanDir)) { elsewhere.push({ name: r.name, dir }); continue; }
    if (!renderedNames.has(r.name)) missing.push(r.name);
  }
  return { missing, elsewhere };
}

async function main() {
  const { values } = parseArgs({ options: {
    dir: { type: "string", default: DEFAULT_DIR },
    json: { type: "boolean", default: false },
  }});

  const scanDir = resolve(values.dir);
  const byName = new Map(RECIPES.map((r) => [r.name, r]));

  let files;
  try {
    files = (await readdir(scanDir)).filter((f) => f.endsWith(".wav")).sort();
  } catch (e) {
    console.error(`check: cannot read ${scanDir} (${e.code ?? e.message})`);
    console.error(`       nothing has been rendered there yet — render that family first, or point --dir at an existing directory`);
    process.exit(1);
  }
  if (!files.length) {
    console.error(`check: no .wav files in ${scanDir} — nothing was audited, so this is a failure`);
    process.exit(1);
  }

  const rows = [];
  const orphans = [];

  for (const f of files) {
    const name = basename(f, ".wav");
    const recipe = byName.get(name);
    if (!recipe) { orphans.push(name); continue; }
    const path = join(scanDir, f);
    const buf = await readWav(path);
    const v = checkBuffer(buf.data, buf.sampleRate, {
      family: recipe.family,
      layers: recipe.layers.filter((l) => l.kind !== "silence").length,
      budgetMs: BUDGET_MS[recipe.family],
    });
    const s = stats(buf.data);
    const crestDb = Number.isFinite(s.peakDbfs - s.rmsDbfs) ? s.peakDbfs - s.rmsDbfs : null;
    rows.push({ name, family: recipe.family, sizeKB: 0, ms: (buf.data.length / buf.sampleRate) * 1000,
                peakDbfs: s.peakDbfs, rmsDbfs: s.rmsDbfs, crestDb, sr: buf.sampleRate, violations: v });
  }

  const { statSync } = await import("node:fs");
  for (const r of rows) r.sizeKB = statSync(join(scanDir, `${r.name}.wav`)).size / 1024;
  const bytes = rows.reduce((a, r) => a + r.sizeKB, 0) * 1024;

  const bad = rows.filter((r) => r.violations.length);
  const { missing, elsewhere } = classifyTargets(RECIPES, scanDir, new Set(rows.map((r) => r.name)));

  if (values.json) {
    console.log(JSON.stringify({ rows, orphans, missing, elsewhere }, null, 2));
  } else {
    const hdr = ["name", "family", "ms", "peak", "rms", "crest", "KB"];
    console.log(`checked ${rows.length} asset(s) in ${scanDir}\n`);
    console.log(`  ${hdr[0].padEnd(26)} ${hdr[1].padEnd(14)} ${hdr[2].padStart(5)} ${hdr[3].padStart(6)} ${hdr[4].padStart(6)} ${hdr[5].padStart(6)} ${hdr[6].padStart(5)}`);
    for (const r of rows) {
      const crest = r.crestDb === null ? "n/a" : r.crestDb.toFixed(1);
      console.log(`  ${r.name.padEnd(26)} ${r.family.padEnd(14)} ${r.ms.toFixed(0).padStart(5)} ${r.peakDbfs.toFixed(1).padStart(6)} ${r.rmsDbfs.toFixed(1).padStart(6)} ${crest.padStart(6)} ${r.sizeKB.toFixed(0).padStart(5)}${r.violations.length ? "  <-- FAIL" : ""}`);
      for (const v of r.violations) console.log(`      ${v.rule}: ${v.message}`);
    }
    console.log(`\n  total ${(bytes / 1048576).toFixed(2)} MB / 16 MB budget   files ${rows.length} / 110 max`);
    if (orphans.length) console.log(`  ORPHAN files with no recipe: ${orphans.join(", ")}`);
    if (missing.length) console.log(`  MISSING recipes never rendered: ${missing.join(", ")}`);
    const byDir = new Map();
    for (const e of elsewhere) {
      if (!byDir.has(e.dir)) byDir.set(e.dir, []);
      byDir.get(e.dir).push(e.name);
    }
    for (const [dir, names] of byDir) console.log(`  ${names.length} recipe(s) render elsewhere (${dir}): ${names.join(", ")}`);
  }

  await mkdir(join(HERE, "build"), { recursive: true });
  await writeFile(join(HERE, "build", "check-report.md"), report(rows, orphans, missing, elsewhere, bytes));

  const fatal = bad.length || orphans.length || missing.length || bytes > 16 * 1048576 || rows.length > 110;
  if (fatal) {
    console.error(`\nCHECK FAILED — ${bad.length} asset(s) with violations, ${orphans.length} orphan(s), ${missing.length} missing.`);
    console.error(`report: tools/sfx-studio/build/check-report.md`);
    process.exit(1);
  }
  if (!values.json) console.log("\nCHECK PASSED");
}

function report(rows, orphans, missing, elsewhere, bytes) {
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
    elsewhere.length
      ? `## Elsewhere (informational, not a failure): ${elsewhere.map((e) => `${e.name} -> ${e.dir}`).join(", ")}`
      : "",
    "",
    "## All assets",
    "",
    "| asset | family | ms | peak dBFS | rms dBFS | crest dB | KB |",
    "|---|---|---|---|---|---|---|",
    ...rows.map((r) => `| ${r.name} | ${r.family} | ${r.ms.toFixed(0)} | ${r.peakDbfs.toFixed(1)} | ${r.rmsDbfs.toFixed(1)} | ${r.crestDb === null ? "n/a" : r.crestDb.toFixed(1)} | ${r.sizeKB.toFixed(0)} |`),
    "",
  ].join("\n") + "\n";
}

// Run the CLI only when this file is the process entry point. Importing this module
// (as check.test.mjs does) must not parse argv or scan a directory.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => { console.error(e); process.exit(1); });
}

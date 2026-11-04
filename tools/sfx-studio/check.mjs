/* Objective quality gate. Runs after every render; exit 1 on any violation.
   These checks are what let us claim "the SFX work" without being able to hear them
   (spec §9.1a, §9.2). */

import { readdir, mkdir, writeFile } from "node:fs/promises";
import { join, dirname, resolve, basename } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
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
  if (!values.json) console.log("\nCHECK PASSED");
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
  ].join("\n") + "\n";
}

// Run the CLI only when this file is the process entry point. Importing this module
// (as check.test.mjs does) must not parse argv or scan a directory.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => { console.error(e); process.exit(1); });
}

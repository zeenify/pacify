/* Builds the final audio bed: narration lines placed at their timeline starts,
   a music bed sidechain-ducked under the voice, and card-slam SFX on impact beats.

   Run: node tools/motion/mix.mjs [--music "Enoshima.mp3"] [--out mix.wav]
*/

import { readFile } from "node:fs/promises";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

import { buildTimeline } from "./src/timeline.mjs";
import { run } from "./encode.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "..", "..");
const SRC = join(HERE, "src");
const OUT = join(HERE, "audio", "out");
const MUSICS = join(REPO, "apps", "web", "public", "musics");
const SFX_CARD = join(REPO, "apps", "web", "public", "sfx", "card.wav");

const { values } = parseArgs({
  options: {
    music: { type: "string", default: "A Night Wanderer (From Femc Reloaded).mp3" },
    out: { type: "string", default: "mix.wav" },
  },
});

const FPS = 30;
const narration = JSON.parse(await readFile(join(SRC, "narration.json"), "utf8"));
const tl = buildTimeline(narration, FPS);

// ---- gather narration placements ----
const lines = [];
for (const act of tl.acts) {
  for (const l of act.lines) {
    lines.push({ id: l.id, at: act.start + l.start, file: join(OUT, `${l.id}.wav`) });
  }
}

// ---- SFX hit times, derived from the same timeline so they land on the visuals ----
const a = (id) => tl.acts.find((x) => x.id === id);
const lw = (act, id) => {
  const l = act.lines.find((x) => x.id === id);
  return act.start + l.start;
};
const hits = [
  lw(a(1), "a1l2") + 0.3, // title card flip
  lw(a(2), "a2l2") + 0.8, // simultaneous commit reveal
  lw(a(3), "a3l3") + 1.4, // Angel vs Ogre clash
  lw(a(3), "a3l4") + 1.6, // shield barrier
  lw(a(4), "a4l1") + 1.7, // void kill
  lw(a(4), "a4l2") + 1.3, // ward block
  lw(a(4), "a4l3") + 1.1, // echo zero
  lw(a(4), "a4l4") + 1.5, // eclipse
  lw(a(4), "a4l6") + 1.5, // reversal swap
  lw(a(4), "a4l7") + 1.4, // executioner blade
  lw(a(6), "a6l2") + 0.4, // final title slam
];

const total = tl.total;
const musicPath = join(MUSICS, values.music);

// ---- build the filter graph ----
const inputs = [["-i", musicPath]];
for (const l of lines) inputs.push(["-i", l.file]);
for (let i = 0; i < hits.length; i++) inputs.push(["-i", SFX_CARD]);

const n = lines.length;
const f = [];
// narration: normalise format, delay to absolute start, then mix
for (let i = 0; i < n; i++) {
  const ms = Math.round(lines[i].at * 1000);
  f.push(`[${i + 1}:a]aformat=sample_rates=44100:channel_layouts=stereo,adelay=${ms}|${ms}[d${i}]`);
}
f.push(lines.map((_, i) => `[d${i}]`).join("") + `amix=inputs=${n}:duration=longest:normalize=0[narrall]`);
// a filter label can only be consumed once, so fork the narration: one copy drives
// the ducking sidechain, the other goes into the final mix
f.push(`[narrall]asplit=2[nsc][nmix]`);
// pad the sidechain to full runtime — otherwise the music bed is cut when the
// last narration line ends and the end-card hold plays in dead silence
f.push(`[nsc]apad=whole_dur=${total.toFixed(2)}[nscp]`);
// music: trim to runtime, fades, gentle level
f.push(`[0:a]atrim=0:${total.toFixed(2)},asetpts=PTS-STARTPTS,aformat=sample_rates=44100:channel_layouts=stereo,afade=t=in:d=1.2,afade=t=out:st=${(total - 2.5).toFixed(2)}:d=2.5,volume=0.42[mus]`);
// duck the music under the voice
f.push(`[mus][nscp]sidechaincompress=threshold=0.03:ratio=10:attack=15:release=500:makeup=1[duck]`);
// sfx hits
for (let j = 0; j < hits.length; j++) {
  const ms = Math.round(hits[j] * 1000);
  f.push(`[${n + 1 + j}:a]aformat=sample_rates=44100:channel_layouts=stereo,adelay=${ms}|${ms},volume=0.7[h${j}]`);
}
const mixInputs = [`[duck]`, `[nmix]`, ...hits.map((_, j) => `[h${j}]`)];
f.push(mixInputs.join("") + `amix=inputs=${mixInputs.length}:duration=first:normalize=0,volume=1.6[out]`);

const outPath = join(OUT, values.out);
await run(
  [
    "-y",
    "-loglevel", "error",
    ...inputs.flat(),
    "-filter_complex", f.join(";"),
    "-map", "[out]",
    "-ar", "44100",
    "-ac", "2",
    outPath,
  ],
  { label: "mix" },
);

console.log(`wrote ${outPath}`);
console.log(`  narration lines: ${n}`);
console.log(`  sfx hits:        ${hits.length}`);
console.log(`  music bed:       ${values.music} (ducked under voice)`);
console.log(`  runtime:         ${total.toFixed(1)}s`);

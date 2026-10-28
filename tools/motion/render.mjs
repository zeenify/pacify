/* Full render orchestrator.
   capture (frame-stepped PNGs) -> H.264 encode -> mux with the mixed audio bed
   -> publish into apps/web/public/how-to-play-qoder/.

   Run: node tools/motion/render.mjs [--fps 30] [--scale 1] [--from N] [--to N]
   Prereq: node tools/motion/tts.mjs && node tools/motion/mix.mjs
*/

import { mkdir, copyFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

import { startServer } from "./serve.mjs";
import { capture } from "./capture.mjs";
import { encodeVideo, mux, probeDuration } from "./encode.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "..", "..");
const WORK = join(HERE, ".render");
const PUBLISH_DIR = join(REPO, "apps", "web", "public", "how-to-play-qoder");
const PUBLISH = join(PUBLISH_DIR, "pacify-how-to-play.mp4");
const MIX = join(HERE, "audio", "out", "mix.wav");

const { values } = parseArgs({
  options: {
    fps: { type: "string", default: "30" },
    scale: { type: "string", default: "1" },
    from: { type: "string" },
    to: { type: "string" },
    renderer: { type: "string", default: "gpu" },
    skipAudio: { type: "boolean", default: false },
  },
});

const fps = Number(values.fps);
const scale = Number(values.scale);
const framesDir = join(WORK, `frames-f${fps}`);
const videoPath = join(WORK, `video-f${fps}.mp4`);

if (!existsSync(MIX) && !values.skipAudio) {
  console.error(`missing ${MIX}\nrun:  node tools/motion/tts.mjs  &&  node tools/motion/mix.mjs`);
  process.exit(1);
}

await mkdir(WORK, { recursive: true });

const server = await startServer({ root: REPO });
console.log(`server: ${server.url}`);

let result;
try {
  result = await capture({
    url: `${server.url}/tools/motion/src/main.html?fps=${fps}`,
    outDir: framesDir,
    from: values.from ? Number(values.from) : 0,
    to: values.to ? Number(values.to) : undefined,
    fps,
    scale,
    renderer: values.renderer,
  });
} finally {
  await server.close();
}

console.log("\nencoding H.264 ...");
await encodeVideo({ framesDir, out: videoPath, fps, crf: 17, preset: "slow" });

let final = videoPath;
if (!values.skipAudio) {
  console.log("muxing audio ...");
  final = join(WORK, `pacify-how-to-play-f${fps}.mp4`);
  await mux({ video: videoPath, audio: MIX, out: final });
}

const dur = await probeDuration(final);
console.log(`\nmaster: ${final}  (${dur.toFixed(1)}s)`);

if (!values.from && values.to === undefined) {
  await mkdir(PUBLISH_DIR, { recursive: true });
  await copyFile(final, PUBLISH);
  console.log(`published: ${PUBLISH}`);
} else {
  console.log("(partial render — skipped publish)");
}

/* Encode a captured PNG sequence to H.264, and mux an audio bed.
   Uses the ffmpeg-static binary resolved at runtime. */

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

export function ffmpegPath() {
  const p = require("ffmpeg-static");
  if (!p || !existsSync(p)) throw new Error("ffmpeg-static binary missing — run: npm install --save-dev ffmpeg-static");
  return p;
}

export function run(args, { label = "ffmpeg" } = {}) {
  return new Promise((ok, fail) => {
    const child = spawn(ffmpegPath(), args, { windowsHide: true });
    let tail = "";
    child.stderr.on("data", (d) => {
      tail = (tail + d.toString()).slice(-4000);
    });
    child.on("error", fail);
    child.on("close", (code) => {
      if (code === 0) return ok();
      fail(new Error(`${label} exited ${code}\n${tail}`));
    });
  });
}

/** PNG sequence -> silent H.264 master. */
export async function encodeVideo({ framesDir, out, fps = 30, crf = 17, preset = "slow", pattern = "f%06d.png" }) {
  await run(
    [
      "-y",
      "-framerate", String(fps),
      "-i", resolve(join(framesDir, pattern)),
      "-c:v", "libx264",
      "-preset", preset,
      "-crf", String(crf),
      "-pix_fmt", "yuv420p",
      "-movflags", "+faststart",
      resolve(out),
    ],
    { label: "encodeVideo" },
  );
  return resolve(out);
}

/** Mux a video with an audio track, trimming audio to the video length. */
export async function mux({ video, audio, out }) {
  await run(
    [
      "-y",
      "-i", resolve(video),
      "-i", resolve(audio),
      "-map", "0:v:0",
      "-map", "1:a:0",
      "-c:v", "copy",
      "-c:a", "aac",
      "-b:a", "192k",
      "-shortest",
      "-movflags", "+faststart",
      resolve(out),
    ],
    { label: "mux" },
  );
  return resolve(out);
}

/** Probe duration in seconds via ffmpeg's own stderr (no ffprobe in ffmpeg-static). */
export function probeDuration(file) {
  return new Promise((ok, fail) => {
    const child = spawn(ffmpegPath(), ["-hide_banner", "-i", resolve(file)], { windowsHide: true });
    let buf = "";
    child.stderr.on("data", (d) => (buf += d.toString()));
    child.on("error", fail);
    child.on("close", () => {
      const m = buf.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
      if (!m) return fail(new Error(`could not read duration of ${file}\n${buf.slice(-1500)}`));
      ok(Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]));
    });
  });
}

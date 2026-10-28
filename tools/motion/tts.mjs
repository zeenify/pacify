/* Narration TTS via fish.audio, one request per line.

   Key resolution (in order): $FISH_API_KEY, then tools/motion/.fishkey (first line).
   With no key present this runs in STUB mode: each line becomes silence of its
   estimated duration, so the whole downstream pipeline (timeline, mix, render)
   stays buildable and testable. Dropping a key in and re-running replaces the
   stubs with real audio and writes measured durations back into narration.json,
   which reflows every act automatically.

   Run: node tools/motion/tts.mjs
*/

import { mkdir, writeFile, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { run, probeDuration } from "./encode.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = join(HERE, "src");
const OUT = join(HERE, "audio", "out");
const NARRATION = join(SRC, "narration.json");
const KEY_FILE = join(HERE, ".fishkey");

const API = "https://api.fish.audio/v1/tts";

async function readKey() {
  if (process.env.FISH_API_KEY) return process.env.FISH_API_KEY.trim();
  if (existsSync(KEY_FILE)) {
    const txt = (await readFile(KEY_FILE, "utf8")).split("\n")[0].trim();
    if (txt) return txt;
  }
  return null;
}

async function synthLine(key, voice, text, destWav) {
  const mp3 = destWav.replace(/\.wav$/, ".mp3");
  const res = await fetch(API, {
    method: "POST",
    headers: {
      authorization: `Bearer ${key}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ text, reference_id: voice, format: "mp3", latency: "normal" }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`fish.audio ${res.status} for "${text.slice(0, 40)}...": ${body.slice(0, 300)}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(mp3, buf);
  await run(["-y", "-loglevel", "error", "-i", mp3, "-ar", "44100", "-ac", "1", destWav], { label: "tts-mp3->wav" });
}

async function silenceLine(dur, destWav) {
  await run(
    ["-y", "-loglevel", "error", "-f", "lavfi", "-i", `anullsrc=r=44100:cl=mono`, "-t", dur.toFixed(3), destWav],
    { label: "tts-stub-silence" },
  );
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const narration = JSON.parse(await readFile(NARRATION, "utf8"));
  const key = await readKey();
  const mode = key ? `fish.audio (${narration.voice})` : "STUB (silence) — no FISH_API_KEY / .fishkey found";
  console.log(`TTS mode: ${mode}`);

  const report = [];
  for (const act of narration.acts) {
    for (const line of act.lines) {
      const wav = join(OUT, `${line.id}.wav`);
      if (key) {
        await synthLine(key, narration.voice, line.text, wav);
      } else {
        await silenceLine(line.est, wav);
      }
      const measured = await probeDuration(wav);
      const prev = line.measured;
      line.measured = +measured.toFixed(3);
      report.push({ id: line.id, est: line.est, measured: line.measured, delta: +(line.measured - line.est).toFixed(2), prev });
      console.log(`  ${line.id.padEnd(6)} est ${line.est.toFixed(2)}s  measured ${measured.toFixed(2)}s  (${(measured - line.est) >= 0 ? "+" : ""}${(measured - line.est).toFixed(2)})`);
    }
  }

  await writeFile(NARRATION, JSON.stringify(narration, null, 2) + "\n", "utf8");
  await writeFile(join(OUT, "timings.json"), JSON.stringify(report, null, 2) + "\n", "utf8");

  const total = narration.acts.reduce(
    (sum, a) => sum + a.lead + a.tail + a.lines.reduce((s, l) => s + (l.measured ?? l.est) + (l.gap ?? 0), 0),
    0,
  );
  console.log(`\nwrote measured durations into narration.json`);
  console.log(`new total runtime: ${total.toFixed(1)}s (${Math.floor(total / 60)}:${String(Math.round(total % 60)).padStart(2, "0")})`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

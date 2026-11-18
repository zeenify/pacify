/* Bake Victor's tutorial lines into static mp3s.
   Run: npx tsx tools/tutorial-voice/generate.mts [--force]
   The clips land in apps/web/public/victor/voice and are served instantly; the
   browser never waits on a live TTS request during the tutorial. */

import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { VICTOR_ALL_LINES } from "../../apps/web/src/data/victor.ts";

const ROOT = path.resolve(import.meta.dirname, "../..");
const OUT = path.join(ROOT, "apps/web/public/victor/voice");
const FORCE = process.argv.includes("--force");

/* Victor's voice — the same Fish clone as Crown (cold, superior, measured). */
const VOICE_ID = "4425b62b63754b79a5c5ef20b468de79";

function readEnvFile(file: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const raw of readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = raw.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return out;
}

const env = readEnvFile(path.join(ROOT, "apps/server/.env"));
const key = process.env.FISH_API_KEY ?? env.FISH_API_KEY;
const model = process.env.FISH_MODEL ?? env.FISH_MODEL ?? "s2.1-pro-free";
if (!key) {
  console.error("FISH_API_KEY missing (apps/server/.env or environment)");
  process.exit(1);
}

mkdirSync(OUT, { recursive: true });

for (const line of VICTOR_ALL_LINES) {
  const file = path.join(OUT, `${line.id}.mp3`);
  if (existsSync(file) && !FORCE) {
    console.log(`skip ${line.id} (exists — use --force)`);
    continue;
  }
  const text = line.spoken ?? line.text;
  process.stdout.write(`${line.id} … `);
  const res = await fetch("https://api.fish.audio/v1/tts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      model,
    },
    body: JSON.stringify({ text, reference_id: VOICE_ID, format: "mp3", latency: "balanced" }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error(`FAILED ${res.status} ${res.statusText}${body ? ` — ${body.slice(0, 300)}` : ""}`);
    process.exit(1);
  }
  const bytes = Buffer.from(await res.arrayBuffer());
  if (bytes.length < 4096) {
    console.error(`FAILED short clip (${bytes.length} bytes)`);
    process.exit(1);
  }
  writeFileSync(file, bytes);
  console.log(`${(bytes.length / 1024).toFixed(0)} KB`);
}

/* Drop clips whose line ids no longer exist (renames/rewrites) so the folder
   always matches the script. Only files this tool owns (*.mp3 here). */
const keep = new Set(VICTOR_ALL_LINES.map((l) => `${l.id}.mp3`));
for (const name of readdirSync(OUT)) {
  if (name.endsWith(".mp3") && !keep.has(name)) {
    rmSync(path.join(OUT, name), { force: true });
    console.log(`remove stale ${name}`);
  }
}

console.log(`done → ${path.relative(ROOT, OUT)}`);

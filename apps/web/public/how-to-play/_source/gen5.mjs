import fs from "node:fs";
import path from "node:path";

const ROOT = "C:/Users/EDRICK/Desktop/pacify/.tmp-fishad";
const ENV = "C:/Users/EDRICK/Desktop/euna/EUNA V4/.env";
const key = fs.readFileSync(ENV, "utf8").match(/FISH_API_KEY=(.+)/)[1].trim();
const mf = JSON.parse(fs.readFileSync(path.join(ROOT, "manifest5.json"), "utf8"));
const VOICE = mf.voice;
const SPEED = mf.tts.speed;
const B = "https://api.fish.audio";
const H = { Authorization: `Bearer ${key}` };

fs.mkdirSync(path.join(ROOT, "clips5"), { recursive: true });
fs.mkdirSync(path.join(ROOT, "verify5"), { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function tts(text, format, attempt = 1) {
  const r = await fetch(`${B}/v1/tts`, {
    method: "POST",
    headers: { ...H, "Content-Type": "application/json", model: mf.tts.model },
    body: JSON.stringify({
      text, reference_id: VOICE, format, latency: "normal",
      normalize: true, temperature: mf.tts.temperature,
      prosody: { speed: SPEED },
    }),
  });
  if (r.status === 429 || r.status >= 500) {
    if (attempt >= 5) throw new Error(`tts failed: ${r.status}`);
    await sleep(4000 * attempt);
    return tts(text, format, attempt + 1);
  }
  if (!r.ok) throw new Error(`tts http ${r.status}`);
  return Buffer.from(await r.arrayBuffer());
}

const report = [];
for (const scene of mf.scenes) {
  try {
    const mp3 = await tts(scene.fullText, "mp3");
    fs.writeFileSync(path.join(ROOT, "clips5", `${scene.id}.mp3`), mp3);
    await sleep(900);
    const wav = await tts(scene.fullText, "wav");
    fs.writeFileSync(path.join(ROOT, "verify5", `${scene.id}.wav`), wav);
    console.log(`${scene.id}: ${(mp3.length / 1024).toFixed(0)}KB`);
    report.push({ id: scene.id, kb: +(mp3.length / 1024).toFixed(0) });
    await sleep(900);
  } catch (e) {
    console.log(`${scene.id} ERROR: ${e.message}`);
    report.push({ id: scene.id, error: e.message });
  }
}
fs.writeFileSync(path.join(ROOT, "gen5report.json"), JSON.stringify(report, null, 2));
console.log("DONE", report.filter(r => !r.error).length, "/", mf.scenes.length);

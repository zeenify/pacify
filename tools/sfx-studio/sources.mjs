/* CC0 source pipeline. Downloads organic textures, normalises them to 44.1kHz mono
   16-bit WAV via ffmpeg-static, and records provenance for every file.

   Run: node tools/sfx-studio/sources.mjs [--list] [--only <id>] [--force]

   HARD RULES (spec §4.3):
     - CC0 ONLY. Never CC-BY, never anything attribution-required.
     - Verify the license by fetching the source page, not by trusting a filename.
     - Never guess a URL. If a download 404s, remove the entry and find another.
     - Normalised sources are build inputs, not shipped assets — sources/raw/ and
       build/ are gitignored, but sources/normalised/ IS committed: recipes load the
       seven WAVs by filename, and Kenney's zip links are signed per-run, so a fresh
       clone cannot re-download them.

   Two source kinds:
     - direct: `url` points at the audio file itself (OpenGameArt /sites/default/files/...).
     - pack:   `pack` names a Kenney asset slug; the pipeline requests a fresh signed
               download link from https://kenney.nl/download-link/<hex of assets/<pack>>
               (Referer required), downloads the zip into sources/raw/<pack>.zip and
               extracts `packFile` (minimal zip reader, node:zlib, no deps). For pack
               entries `url`/`page` point at the pack page — the provenance anchor.

   Every downloaded buffer is checked against format magic bytes before it is written:
   the most common failure mode here is a 200 response containing an HTML interstitial.

   Normalisation (ffmpeg -af): [atrim,] aformat=44100/mono [, volume=<gainDb>dB]
   [, loudnorm=I=-18:TP=-2:LRA=11]. loudnorm is two-pass by nature; single-pass mode
   can shift level or duration on very short material, so each output's duration is
   cross-checked with probeDuration() against readWav() and an entry can opt out via
   normalise.noLoudnorm + an explicit normalise.gainDb (the provenance `note` must
   then explain why).

   Caching and atomicity:
     - Provenance records `specHash`, a sha256 of the whole spec (stable key order).
       An entry is skipped only when the output exists AND its specHash matches, so
       editing packFile / normalise re-normalises instead of silently keeping a stale
       file. Entries written before specHash existed are adopted once, after being
       re-verified with readWav + probeDuration.
     - ffmpeg writes <id>.partial.wav; the file is renamed onto <id>.wav only after
       verification passes, and the temp file is unlinked on any failure. Provenance
       is persisted after each entry, so a mid-run crash loses nothing.
*/

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile, stat, rename, unlink } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { inflateRawSync } from "node:zlib";

import { run, probeDuration } from "../motion/encode.mjs";
import { readWav } from "./wav.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const RAW = join(HERE, "sources", "raw");
const NORM = join(HERE, "sources", "normalised");
const PROVENANCE = join(HERE, "sources", "provenance.json");
const UA = "Mozilla/5.0 (compatible; pacify-sfx-studio/1.0)";

/**
 * @typedef {{
 *   id: string,
 *   url: string,                  // direct: the audio file. pack: the pack page.
 *   page: string,                 // human-readable provenance page (license lives here)
 *   author: string,
 *   license: string,              // must be exactly "CC0" or the pipeline refuses
 *   role: string,                 // which recipe layer(s) this feeds
 *   pack?: string,                // Kenney slug, e.g. "impact-sounds" (pack kind)
 *   packFile?: string,            // path inside the zip, e.g. "Audio/impactBell_heavy_001.ogg"
 *   note?: string,                // free-text provenance note (license verification, trim rationale)
 *   normalise?: { rate?: 44100|22050, gainDb?: number, trimStart?: number, trimEnd?: number,
 *                 noLoudnorm?: boolean }
 * }} SourceSpec
 */

/* The seven ids below are the contract with Tasks 9-14: sample layers reference
   sources/normalised/<id>.wav by filename. Licenses verified on the source pages on
   2026-11-05 — see each `note`. Do not rename an id without updating every recipe. */
export const SOURCES = [
  { id: "card-flick",
    pack: "casino-audio", packFile: "Audio/card-shove-1.ogg",
    url: "https://kenney.nl/assets/casino-audio",
    page: "https://kenney.nl/assets/casino-audio",
    author: "Kenney Vleugels (kenney.nl)", license: "CC0",
    role: "dry single-card flick/shove transient for card play, stamp and shuffle layers",
    note: "License verified on pack page ('License: CC0') and in the zip's License.txt ('Creative Commons Zero, CC0'). Chose card-shove-1 (0.77s, crest 24.6) over card-place/card-slide variants: a single dry flick with no room ambience.",
    normalise: { trimStart: 0.05 } },

  { id: "paper-slap",
    url: "https://opengameart.org/sites/default/files/paper_sound_-_3.mp3",
    page: "https://opengameart.org/content/various-paper-sound-effects",
    author: "Luckius", license: "CC0",
    role: "transient-heavy paper impact for page turns, dossier slams and UI paper layers",
    note: "License verified on OGA page: 'License(s): CC0' (field-art-licenses), icon links to creativecommons.org/publicdomain/zero/1.0/. Picked paper_sound_-_3 (crest 24, discrete sharp impacts) over the -1/-2/-4 rustles.",
    normalise: { trimStart: 0.1 } },

  { id: "metal-clang",
    pack: "impact-sounds", packFile: "Audio/impactBell_heavy_001.ogg",
    url: "https://kenney.nl/assets/impact-sounds",
    page: "https://kenney.nl/assets/impact-sounds",
    author: "Kenney Vleugels (kenney.nl)", license: "CC0",
    role: "resonant metal strike with real ring-out for clash, shieldbreak and trick impacts",
    note: "License verified on pack page and zip License.txt (CC0). impactBell_heavy_001 (1.74s) has a full ring-out decay; impactMetal_* files are dry 0.17s hits with no ring.",
    normalise: {} },

  { id: "glass-shatter",
    url: "https://opengameart.org/sites/default/files/glass_breaking.wav",
    page: "https://opengameart.org/content/glass-break",
    author: "TinyWorlds", license: "CC0",
    role: "glass breaking with debris tail; pitched up + trimmed to fragments in shieldbreak/clash-loser recipes",
    note: "License verified on OGA page: 'License(s): CC0'. 1.31s: initial burst plus scattered debris tail. Raw peaks above full scale, so normalisation keeps loudnorm true-peak limiting (TP=-2).",
    normalise: { trimStart: 0.01 } },

  { id: "wood-hit",
    pack: "impact-sounds", packFile: "Audio/impactPlank_medium_000.ogg",
    url: "https://kenney.nl/assets/impact-sounds",
    page: "https://kenney.nl/assets/impact-sounds",
    author: "Kenney Vleugels (kenney.nl)", license: "CC0",
    role: "solid wood-on-wood impact for table thuds, wood chop and card-land weight layers",
    note: "License verified on pack page and zip License.txt (CC0). impactPlank_medium_000 (0.78s): immediate attack, solid body — not a hollow-door knock.",
    normalise: {} },

  { id: "rope-creak",
    url: "https://opengameart.org/sites/default/files/tree_creak.flac",
    page: "https://opengameart.org/content/tree-creaking",
    author: "Department64 (cleaned/normalised upload by AntumDeluge)", license: "CC0",
    role: "fibre-under-tension creak for Ward binds, rope tension and strain cues",
    note: "License verified on OGA page: 'License(s): CC0'. No CC0 rope-specific recording was found on OGA/Kenney; a tree-trunk creaking under wind tension is the closest CC0 match to rope/fibre strain, which the task brief permits. Trimmed to the active 0.15-4.2s region; the remainder of the 6.58s file is near-silence.",
    normalise: { trimStart: 0.15, trimEnd: 4.2 } },

  { id: "fire-crackle",
    url: "https://opengameart.org/sites/default/files/fire.wav",
    page: "https://opengameart.org/content/fireplace-sound-loop",
    author: "PagDev", license: "CC0",
    role: "sustained loopable fire crackle bed (>=3s) for Eclipse/fire trick layers",
    note: "License verified on OGA page: 'License(s): CC0' (dcterms.creator PagDev). 29.26s wood-fire loop with a steady envelope and no wind/ambience dominance; normalisation keeps an 8s mid-file segment (2-10s). The other CC0 candidate (opengameart.org/content/fire-crackling, fire-1.wav) was rejected at 2.87s (<3s floor).",
    normalise: { trimStart: 2, trimEnd: 10 } },
];

/* ------------------------------------------------------------------ machinery */

const MAGIC = {
  ".wav": (b) => b.length > 12 && b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WAVE",
  ".ogg": (b) => b.length > 4 && b.toString("ascii", 0, 4) === "OggS",
  ".flac": (b) => b.length > 4 && b.toString("ascii", 0, 4) === "fLaC",
  ".mp3": (b) => b.length > 10 && (b.toString("ascii", 0, 3) === "ID3" || (b[0] === 0xff && (b[1] & 0xe0) === 0xe0)),
  ".zip": (b) => b.length > 4 && b.readUInt32LE(0) === 0x04034b50,
};

function audioExtname(s) {
  const m = String(s).split("?")[0].match(/\.(wav|ogg|mp3|flac|aif|aiff|zip)$/i);
  return m ? m[0].toLowerCase() : ".bin";
}

async function sha256File(p) {
  return createHash("sha256").update(await readFile(p)).digest("hex");
}

/** Deterministic serialisation: object keys sorted at every depth, so the digest
    depends on values only, never on the order a spec author typed its fields.
    `undefined` members are dropped (same as JSON round-tripping would). */
function stableStringify(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const keys = Object.keys(value).filter((k) => value[k] !== undefined).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(",")}}`;
}

/** Fingerprint over the whole spec. `url` alone is far too coarse: for pack entries
    it is the pack page (identical across takes), and normalise tweaks (trim, gain,
    noLoudnorm) change the output bytes without touching any URL. Every declared
    field is included, so a changed packFile or trim value invalidates the cache. */
function specHashOf(spec) {
  return createHash("sha256").update(stableStringify(spec)).digest("hex");
}

async function download(url, dest, id, referer) {
  const headers = { "User-Agent": UA };
  if (referer) headers["Referer"] = referer;
  const res = await fetch(url, { redirect: "follow", headers });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${id}: ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 1024) {
    throw new Error(`${id}: suspiciously small download (${buf.length}B) from ${url} — is it an HTML error page?`);
  }
  const ext = audioExtname(dest);
  const ok = MAGIC[ext];
  if (ok && !ok(buf)) {
    const head = buf.subarray(0, 16);
    throw new Error(
      `${id}: ${url} returned bytes that are not ${ext} ` +
      `(first 16: ${head.toString("hex")} = "${head.toString("latin1").replace(/[^\x20-\x7e]/g, ".")}") ` +
      `— likely an HTML interstitial; refusing to write/normalise`);
  }
  await writeFile(dest, buf);
  return buf.length;
}

/** Minimal zip reader: locate EOCD, walk the central directory, inflate one entry. */
function zipEntry(buf, name) {
  let eocd = -1;
  for (let i = buf.length - 22; i >= 0 && i > buf.length - 22 - 66000; i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error("not a zip file (EOCD signature not found)");
  const count = buf.readUInt16LE(eocd + 10);
  let off = buf.readUInt32LE(eocd + 16);
  for (let i = 0; i < count; i++) {
    if (off + 46 > buf.length || buf.readUInt32LE(off) !== 0x02014b50) {
      throw new Error(`bad central directory at entry ${i}`);
    }
    const method = buf.readUInt16LE(off + 10);
    const csize = buf.readUInt32LE(off + 20);
    const nlen = buf.readUInt16LE(off + 28);
    const elen = buf.readUInt16LE(off + 30);
    const clen = buf.readUInt16LE(off + 32);
    const localOff = buf.readUInt32LE(off + 42);
    const ename = buf.toString("utf8", off + 46, off + 46 + nlen);
    if (ename === name) {
      if (buf.readUInt32LE(localOff) !== 0x04034b50) throw new Error(`bad local file header for ${name}`);
      const lnlen = buf.readUInt16LE(localOff + 26);
      const lelen = buf.readUInt16LE(localOff + 28);
      const start = localOff + 30 + lnlen + lelen;
      const data = buf.subarray(start, start + csize);
      if (method === 0) return Buffer.from(data);
      if (method === 8) return inflateRawSync(data);
      throw new Error(`unsupported zip compression method ${method} for ${name}`);
    }
    off += 46 + nlen + elen + clen;
  }
  throw new Error(`${name} not found in zip (${count} entries scanned)`);
}

async function kenneyZipUrl(pack) {
  const hex = Buffer.from(`assets/${pack}`).toString("hex");
  const res = await fetch(`https://kenney.nl/download-link/${hex}`, {
    headers: { "User-Agent": UA, "Referer": `https://kenney.nl/assets/${pack}` },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} from kenney.nl/download-link for pack ${pack}`);
  const json = await res.json();
  if (!json.url) throw new Error(`kenney.nl/download-link returned no url for ${pack}: ${JSON.stringify(json)}`);
  return json.url;
}

function rawPathFor(spec) {
  return join(RAW, `${spec.id}${audioExtname(spec.pack ? spec.packFile : spec.url)}`);
}

/** Ensure sources/raw/<id>.<ext> exists (fetching pack zips / files as needed).
    Returns the raw byte count. `force` re-downloads everything. */
async function resolveRaw(spec, { force = false, log = console.log } = {}) {
  const rawPath = rawPathFor(spec);
  if (!force && existsSync(rawPath)) return (await stat(rawPath)).size;
  if (spec.pack) {
    const zipPath = join(RAW, `${spec.pack}.zip`);
    if (force || !existsSync(zipPath)) {
      const url = await kenneyZipUrl(spec.pack);
      const bytes = await download(url, zipPath, `${spec.id} (pack ${spec.pack})`, `https://kenney.nl/assets/${spec.pack}`);
      log(`    pack ${spec.pack}: ${(bytes / 1024 / 1024).toFixed(1)}MB zip`);
    }
    const data = zipEntry(await readFile(zipPath), spec.packFile);
    await writeFile(rawPath, data);
    return data.length;
  }
  return await download(spec.url, rawPath, spec.id, "https://opengameart.org/");
}

async function normalise(spec, outPath) {
  const rawPath = rawPathFor(spec);
  const n = spec.normalise ?? {};
  const rate = n.rate ?? 44100;
  const filters = [];
  if (n.trimStart || n.trimEnd) {
    filters.push(`atrim=start=${n.trimStart ?? 0}${n.trimEnd ? `:end=${n.trimEnd}` : ""},asetpts=PTS-STARTPTS`);
  }
  filters.push(`aformat=sample_rates=${rate}:channel_layouts=mono`);
  if (n.gainDb) filters.push(`volume=${n.gainDb}dB`);
  if (!n.noLoudnorm) filters.push("loudnorm=I=-18:TP=-2:LRA=11");
  await run(["-y", "-loglevel", "error", "-i", rawPath, "-af", filters.join(","),
             "-ar", String(rate), "-ac", "1", "-c:a", "pcm_s16le", outPath],
            { label: `normalise ${spec.id}` });
}

/** Verify an output file the way the renderer will consume it (readWav), then
    cross-check the duration with ffmpeg's own probe — single-pass loudnorm can pad
    or shift level, and a truncated WAV must never reach the final path. */
async function verifyOutput(path, id) {
  const buf = await readWav(path);
  const seconds = +(buf.data.length / buf.sampleRate).toFixed(3);
  const probedSeconds = +(await probeDuration(path)).toFixed(3);
  if (Math.abs(probedSeconds - seconds) > 0.1) {
    throw new Error(`${id}: duration mismatch — readWav says ${seconds}s but ffmpeg probe says ${probedSeconds}s (loudnorm padding? drop loudnorm for this entry and use volume=)`);
  }
  return { buf, seconds, probedSeconds };
}

/** Download missing raw files, normalise everything requested, rewrite provenance.json.
    Provenance is written after every entry, and a new output only reaches its final
    path after verification, so an interrupted run leaves neither a partial WAV nor
    lost provenance behind. */
export async function fetchSources({ force = false, only = null, log = console.log } = {}) {
  await mkdir(RAW, { recursive: true });
  await mkdir(NORM, { recursive: true });
  const wanted = SOURCES.filter((s) => !only || s.id === only);
  if (only && !wanted.length) throw new Error(`no source declared with id "${only}"`);
  const entries = existsSync(PROVENANCE) ? JSON.parse(await readFile(PROVENANCE, "utf8")) : {};
  const saveProvenance = () => writeFile(PROVENANCE, JSON.stringify(entries, null, 2) + "\n");

  for (const spec of wanted) {
    if (spec.license.toUpperCase() !== "CC0") {
      throw new Error(`REFUSING ${spec.id}: license is "${spec.license}", only CC0 is permitted (spec §4.3)`);
    }
    const outPath = join(NORM, `${spec.id}.wav`);
    const specHash = specHashOf(spec);
    const prev = entries[spec.id];

    if (!force && existsSync(outPath) && prev?.specHash === specHash) {
      log(`  = ${spec.id} (cached)`);
      continue;
    }

    // Entries recorded before specHash existed: adopt the output once — that upgrade
    // must not re-download/re-normalise everything — but only after verifying it the
    // way a consumer would, so a truncated WAV from an aborted old run is not adopted
    // merely because the url still matches.
    if (!force && existsSync(outPath) && !prev?.specHash && prev?.url === spec.url) {
      const { buf, seconds, probedSeconds } = await verifyOutput(outPath, spec.id);
      prev.specHash = specHash;
      prev.normalised = { sampleRate: buf.sampleRate, seconds, probedSeconds };
      await saveProvenance();
      log(`  = ${spec.id} (cached) [specHash backfilled]`);
      continue;
    }

    const bytes = await resolveRaw(spec, { force, log });
    // ffmpeg truncates its output before writing, so it writes the temp path: an
    // interrupted normalise must not destroy (or fake) the last good <id>.wav.
    const partialPath = join(NORM, `${spec.id}.partial.wav`);
    let verified;
    try {
      await normalise(spec, partialPath);
      verified = await verifyOutput(partialPath, spec.id);
      await rename(partialPath, outPath);
    } catch (e) {
      await unlink(partialPath).catch(() => {});
      throw e;
    }
    const { buf, seconds, probedSeconds } = verified;
    const rawPath = rawPathFor(spec);
    entries[spec.id] = {
      url: spec.url, page: spec.page, author: spec.author, license: spec.license,
      role: spec.role,
      ...(spec.note ? { note: spec.note } : {}),
      specHash,
      downloadedAt: new Date().toISOString().slice(0, 10),
      rawBytes: bytes,
      rawFile: `${spec.id}${audioExtname(spec.pack ? spec.packFile : spec.url)}`,
      sha256: await sha256File(rawPath),
      normalised: { sampleRate: buf.sampleRate, seconds, probedSeconds },
    };
    // Per-entry persistence: a crash during entry N+1 must not discard N's record.
    await saveProvenance();
    log(`  + ${spec.id}  ${(bytes / 1024).toFixed(0)}KB -> ${seconds.toFixed(2)}s @ ${buf.sampleRate}Hz`);
  }

  log(`\nprovenance: ${PROVENANCE} (${Object.keys(entries).length} entries)`);
}

async function main() {
  const { values } = parseArgs({ options: {
    list: { type: "boolean", default: false },
    only: { type: "string" },
    force: { type: "boolean", default: false },
  }});

  if (values.list) {
    console.log(`${SOURCES.length} source(s) declared:`);
    for (const s of SOURCES) {
      const origin = s.pack ? `kenney:${s.pack}` : "direct";
      console.log(`  ${s.id.padEnd(16)} ${s.license.padEnd(4)} ${origin.padEnd(22)} ${s.role}`);
    }
    return;
  }
  if (!SOURCES.length) {
    console.log("SOURCES is empty. Fill it in per the brief before running.");
    process.exit(1);
  }
  await fetchSources({ force: values.force, only: values.only ?? null });
}

const isMain = Boolean(process.argv[1]) && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
if (isMain) {
  main().catch((e) => { console.error(e); process.exit(1); });
}

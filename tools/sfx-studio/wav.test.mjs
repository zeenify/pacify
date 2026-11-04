import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { makeBuffer, writeWav, readWav } from "./wav.mjs";
import { prng } from "./prng.mjs";

test("writeWav/readWav round-trips a sine within 16-bit quantisation", async () => {
  const dir = await mkdtemp(join(tmpdir(), "sfx-"));
  try {
    const sr = 44100;
    const buf = makeBuffer(0.05, sr);
    for (let i = 0; i < buf.data.length; i++) buf.data[i] = Math.sin((2 * Math.PI * 440 * i) / sr) * 0.5;
    const p = join(dir, "sine.wav");
    await writeWav(p, buf);
    const back = await readWav(p);
    assert.equal(back.sampleRate, sr);
    assert.equal(back.data.length, buf.data.length);
    let maxErr = 0;
    for (let i = 0; i < buf.data.length; i++) maxErr = Math.max(maxErr, Math.abs(back.data[i] - buf.data[i]));
    assert.ok(maxErr < 1 / 32767, `quantisation error too large: ${maxErr}`);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test("writeWav clamps out-of-range floats instead of wrapping", async () => {
  const dir = await mkdtemp(join(tmpdir(), "sfx-"));
  try {
    const buf = makeBuffer(0.001, 44100);
    // ±2.0 discriminates: without the clamp, ToInt16 wraps +2.0*0x7fff (65534)
    // to -2 and -2.0*0x8000 (-65536) to 0 — both fail the exact assertions below.
    // (±3.0 was unlucky: it wrapped back to near-full-scale and passed.)
    buf.data[0] = 2.0; buf.data[1] = -2.0;
    const p = join(dir, "hot.wav");
    await writeWav(p, buf);
    const back = await readWav(p);
    assert.equal(back.data[0], 32767 / 32768, `expected exact positive full scale, got ${back.data[0]}`);
    assert.equal(back.data[1], -1, `expected exact negative full scale, got ${back.data[1]}`);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

/** Hand-builds a minimal 16-bit PCM mono WAV header so malformed-input tests
    can lie about individual fields. */
function wavHeaderBytes({ fmtSize = 16, dataSize = 0, totalBytes = 44 } = {}) {
  const ab = new ArrayBuffer(totalBytes);
  const v = new DataView(ab);
  const str = (off, s) => { for (let i = 0; i < s.length; i++) v.setUint8(off + i, s.charCodeAt(i)); };
  str(0, "RIFF");
  v.setUint32(4, totalBytes - 8, true);
  str(8, "WAVE");
  str(12, "fmt ");
  v.setUint32(16, fmtSize, true);
  v.setUint16(20, 1, true);       // PCM
  v.setUint16(22, 1, true);       // mono
  v.setUint32(24, 44100, true);
  v.setUint32(28, 88200, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  const dataOff = 20 + fmtSize + ((fmtSize % 2) ? 1 : 0) + 4; // end of fmt chunk + "data" tag slot
  str(dataOff - 4, "data");
  v.setUint32(dataOff, dataSize, true);
  return Buffer.from(ab);
}

test("readWav rejects a file shorter than 12 bytes", async () => {
  const dir = await mkdtemp(join(tmpdir(), "sfx-"));
  try {
    const p = join(dir, "short.wav");
    await writeFile(p, Buffer.from("RIFFabcd", "latin1")); // 8 bytes, never reaches the RIFF/WAVE check
    await assert.rejects(() => readWav(p), { message: `${p}: too short to be a WAV` });
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test("readWav rejects a fmt chunk declaring size < 16", async () => {
  const dir = await mkdtemp(join(tmpdir(), "sfx-"));
  try {
    const p = join(dir, "badfmt.wav");
    await writeFile(p, wavHeaderBytes({ fmtSize: 12, totalBytes: 44 }));
    await assert.rejects(() => readWav(p), { message: `${p}: fmt chunk too small` });
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test("readWav rejects a data chunk that extends past end of file", async () => {
  const dir = await mkdtemp(join(tmpdir(), "sfx-"));
  try {
    const p = join(dir, "lying.wav");
    // Header claims 1000 bytes of samples but the file ends right after the header.
    await writeFile(p, wavHeaderBytes({ dataSize: 1000, totalBytes: 44 }));
    await assert.rejects(() => readWav(p), { message: `${p}: data chunk extends past end of file` });
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test("prng is deterministic for a seed and differs across seeds", () => {
  const r1 = prng(42), r2 = prng(42), r3 = prng(43);
  const s1 = Array.from({ length: 5 }, () => r1());
  const s2 = Array.from({ length: 5 }, () => r2());
  const s3 = Array.from({ length: 5 }, () => r3());
  assert.deepEqual(s1, s2, "same seed must give the same stream");
  assert.notDeepEqual(s1, s3, "different seeds must diverge");
  for (const v of s1) { assert.ok(v >= 0 && v < 1, `out of range: ${v}`); }
});

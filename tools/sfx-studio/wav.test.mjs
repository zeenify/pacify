import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
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
    buf.data[0] = 3.0; buf.data[1] = -3.0;
    const p = join(dir, "hot.wav");
    await writeWav(p, buf);
    const back = await readWav(p);
    assert.ok(back.data[0] > 0.99, `expected near +1, got ${back.data[0]}`);
    assert.ok(back.data[1] < -0.99, `expected near -1, got ${back.data[1]}`);
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

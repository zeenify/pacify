import { test } from "node:test";
import assert from "node:assert/strict";
import { fft, nextPow2, convolve } from "./fft.mjs";
import { makeIR } from "./ir.mjs";
import { osc, stats } from "./dsp.mjs";
import { prng } from "./prng.mjs";

test("nextPow2", () => {
  assert.equal(nextPow2(1), 1);
  assert.equal(nextPow2(5), 8);
  assert.equal(nextPow2(1024), 1024);
  assert.equal(nextPow2(1025), 2048);
});

test("convolving with a unit impulse is the identity", () => {
  const sig = new Float32Array([0.1, -0.5, 0.9, 0.25, -0.25]);
  const ir = new Float32Array([1]);
  const out = convolve(sig, ir);
  assert.equal(out.length, sig.length + ir.length - 1);
  for (let i = 0; i < sig.length; i++) assert.ok(Math.abs(out[i] - sig[i]) < 1e-6, `index ${i}`);
});

test("convolving with a delayed impulse delays the signal", () => {
  const sig = new Float32Array([1, 0.5]);
  const ir = new Float32Array([0, 0, 1]);     // 2-sample delay
  const out = convolve(sig, ir);
  assert.ok(Math.abs(out[2] - 1) < 1e-6, `expected 1 at index 2, got ${out[2]}`);
  assert.ok(Math.abs(out[3] - 0.5) < 1e-6, `expected 0.5 at index 3, got ${out[3]}`);
  assert.ok(Math.abs(out[0]) < 1e-9 && Math.abs(out[1]) < 1e-9, "nothing should precede the delay");
});

test("convolution matches the naive O(n*m) reference", () => {
  const rand = prng(99);
  const a = Float32Array.from({ length: 37 }, () => rand() * 2 - 1);
  const b = Float32Array.from({ length: 23 }, () => rand() * 2 - 1);
  const ref = new Float32Array(a.length + b.length - 1);
  for (let i = 0; i < a.length; i++) for (let j = 0; j < b.length; j++) ref[i + j] += a[i] * b[j];
  const out = convolve(a, b);
  for (let i = 0; i < ref.length; i++) assert.ok(Math.abs(out[i] - ref[i]) < 1e-4, `index ${i}: ${out[i]} vs ${ref[i]}`);
});

test("fft round-trips", () => {
  const n = 256;
  const re = new Float64Array(n), im = new Float64Array(n);
  const orig = new Float64Array(n);
  for (let i = 0; i < n; i++) { re[i] = orig[i] = Math.sin(i * 0.3) + 0.4 * Math.cos(i * 1.1); }
  fft(re, im, false);
  fft(re, im, true);
  for (let i = 0; i < n; i++) assert.ok(Math.abs(re[i] - orig[i]) < 1e-9, `index ${i}`);
});

test("all four IR presets render, decay, and stay bounded", () => {
  for (const preset of ["hall", "plate", "metal", "cathedral"]) {
    const ir = makeIR({ preset, seconds: 1.0, sampleRate: 44100, rand: prng(3) });
    assert.equal(ir.length, 44100);
    const { peak } = stats(ir);
    assert.ok(peak <= 1.0 && peak > 0.05, `${preset} peak out of range: ${peak}`);
    // energy in the last 10% must be well below the first 10% — it is a decay, not a loop
    const e = (from, to) => { let s = 0; for (let i = from; i < to; i++) s += ir[i] * ir[i]; return s; };
    assert.ok(e(Math.floor(0.9 * ir.length), ir.length) < e(0, Math.floor(0.1 * ir.length)) * 0.2,
      `${preset} does not decay`);
  }
});

test("cathedral IR outlasts hall IR", () => {
  const measure = (preset) => {
    const ir = makeIR({ preset, seconds: 3.0, sampleRate: 44100, rand: prng(5) });
    const sig = osc({ wave: "sine", f: 1000, dur: 0.01, sampleRate: 44100 });
    const wet = convolve(sig, ir);
    // find the last index above -60 dBFS
    let last = 0;
    for (let i = 0; i < wet.length; i++) if (Math.abs(wet[i]) > 0.001) last = i;
    return last / 44100;
  };
  const hall = measure("hall"), cath = measure("cathedral");
  assert.ok(cath > hall * 1.4, `cathedral (${cath}s) should outlast hall (${hall}s) by >1.4x`);
});

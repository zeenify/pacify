import { test } from "node:test";
import assert from "node:assert/strict";
import {
  osc, noise, applyEnv, biquad, shape, delay, pitch,
  limit, normalize, trimSilence, mixInto, stats, dbToLin, linToDb,
} from "./dsp.mjs";
import { prng } from "./prng.mjs";

const SR = 44100;

test("osc sine at 440Hz has the right period and stays in range", () => {
  const d = osc({ wave: "sine", f: 440, dur: 0.05, sampleRate: SR });
  assert.equal(d.length, Math.ceil(0.05 * SR));
  let peak = 0;
  for (const x of d) peak = Math.max(peak, Math.abs(x));
  assert.ok(peak > 0.98 && peak <= 1.0, `sine peak should be ~1, got ${peak}`);
  // zero crossings: 440Hz over 50ms => ~22 crossings
  let crossings = 0;
  for (let i = 1; i < d.length; i++) if (d[i - 1] < 0 && d[i] >= 0) crossings++;
  assert.ok(crossings >= 20 && crossings <= 24, `unexpected crossings: ${crossings}`);
});

test("osc exponential glide reaches fEnd", () => {
  const up = osc({ wave: "sine", f: 100, fEnd: 400, glide: "exp", dur: 0.2, sampleRate: SR });
  // measure instantaneous period in the last 10% vs the first 10%
  const period = (from, to) => {
    let c = 0, first = -1, last = -1;
    for (let i = Math.floor(from * up.length); i < Math.floor(to * up.length); i++) {
      if (up[i - 1] < 0 && up[i] >= 0) { c++; if (first < 0) first = i; last = i; }
    }
    return c > 1 ? (last - first) / (c - 1) : Infinity;
  };
  const pStart = period(0, 0.1), pEnd = period(0.9, 1.0);
  assert.ok(pEnd < pStart * 0.5, `expected period to shrink >2x, ${pStart} -> ${pEnd}`);
});

test("noise colours differ and all stay bounded", () => {
  for (const color of ["white", "pink", "brown"]) {
    const d = noise({ color, dur: 0.1, sampleRate: SR, rand: prng(7) });
    let peak = 0;
    for (const x of d) peak = Math.max(peak, Math.abs(x));
    assert.ok(peak <= 1.0, `${color} exceeded 1.0: ${peak}`);
    assert.ok(peak > 0.05, `${color} is silent`);
  }
  const w = noise({ color: "white", dur: 0.1, sampleRate: SR, rand: prng(7) });
  const b = noise({ color: "brown", dur: 0.1, sampleRate: SR, rand: prng(7) });
  // brown noise is integrated white => far more low energy => lower zero-crossing rate
  const zc = (d) => { let c = 0; for (let i = 1; i < d.length; i++) if (d[i - 1] < 0 && d[i] >= 0) c++; return c; };
  assert.ok(zc(b) < zc(w) * 0.5, `brown should be much darker: ${zc(b)} vs ${zc(w)}`);
});

test("applyEnv exponential decay is monotonic and hits the floor", () => {
  const d = new Float32Array(SR / 10).fill(1);
  const e = applyEnv(d, SR, [[0, 1], [0.1, 0]], { curve: "exp" });
  assert.ok(e[0] > 0.9, `attack should start near 1, got ${e[0]}`);
  for (let i = 1; i < e.length; i++) assert.ok(e[i] <= e[i - 1] + 1e-6, "decay must be monotonic");
  assert.ok(e[e.length - 1] < 0.02, `tail should approach 0, got ${e[e.length - 1]}`);
});

test("biquad lowpass attenuates highs and passes lows", () => {
  const bright = osc({ wave: "square", f: 6000, dur: 0.05, sampleRate: SR });
  const dark = osc({ wave: "sine", f: 80, dur: 0.05, sampleRate: SR });
  const rmsBefore = (d) => stats(d).rms;
  const lpBright = biquad(bright, SR, { type: "lowpass", f: 500, q: 0.707 });
  const lpDark = biquad(dark, SR, { type: "lowpass", f: 500, q: 0.707 });
  // skip the first 10% to ignore filter settling
  const tail = (d) => d.subarray(Math.floor(d.length * 0.1));
  assert.ok(rmsBefore(tail(lpBright)) < rmsBefore(tail(bright)) * 0.25, "6kHz should be crushed by a 500Hz LP");
  assert.ok(rmsBefore(tail(lpDark)) > rmsBefore(tail(dark)) * 0.7, "80Hz should pass a 500Hz LP");
});

test("limit holds the ceiling", () => {
  const d = new Float32Array(SR / 20);
  for (let i = 0; i < d.length; i++) d[i] = Math.sin((2 * Math.PI * 300 * i) / SR) * 8;
  const l = limit(d, { ceiling: dbToLin(-1), lookahead: 64 });
  const { peakDbfs } = stats(l);
  assert.ok(peakDbfs <= -0.99, `limiter breached ceiling: ${peakDbfs} dBFS`);
  assert.ok(peakDbfs > -6, `limiter over-compressed: ${peakDbfs} dBFS`);
});

test("normalize hits the target", () => {
  const d = osc({ wave: "sine", f: 440, dur: 0.05, sampleRate: SR });
  const n = normalize(d, -3);
  assert.ok(Math.abs(stats(n).peakDbfs - -3) < 0.05, `expected -3 dBFS, got ${stats(n).peakDbfs}`);
});

test("trimSilence removes leading silence (the <5ms rule)", () => {
  const d = new Float32Array(SR / 4);            // 250ms
  const sig = osc({ wave: "sine", f: 440, dur: 0.1, sampleRate: SR });
  d.set(sig.map((x) => x * 0.5), Math.floor(0.08 * SR));   // signal starts at 80ms
  const t = trimSilence(d, SR, { thresholdDb: -50, keepMs: 1 });
  assert.ok(t.length < d.length * 0.6, `should have cut ~80ms, ${d.length} -> ${t.length}`);
  // after trimming, the first sample above threshold must be within keepMs of index 0
  const thr = dbToLin(-50);
  let firstAudible = 0;
  while (firstAudible < t.length && Math.abs(t[firstAudible]) < thr) firstAudible++;
  assert.ok(firstAudible <= Math.ceil(0.001 * SR) + 1, `head silence survived: ${firstAudible} samples`);
});

test("mixInto places a layer at an offset without clipping", () => {
  const dest = new Float32Array(SR / 10);
  const a = new Float32Array(SR / 40).fill(0.6);
  mixInto(dest, a, 0.05, SR, 1);
  const at = Math.floor(0.05 * SR);
  assert.ok(Math.abs(dest[at] - 0.6) < 1e-6, "layer did not land at its offset");
  assert.equal(dest[0], 0, "layer landed too early");
  const hot = new Float32Array(SR / 40).fill(0.9);
  mixInto(dest, hot, 0.05, SR, 1);
  for (const x of dest) assert.ok(Math.abs(x) <= 1.0, `mixInto produced ${x}, must clamp`);
});

test("pitch raises pitch and shortens duration", () => {
  const d = osc({ wave: "sine", f: 220, dur: 0.1, sampleRate: SR });
  const p = pitch(d, 2);
  assert.equal(p.length, Math.ceil(d.length / 2));
  const zc = (x) => { let c = 0; for (let i = 1; i < x.length; i++) if (x[i - 1] < 0 && x[i] >= 0) c++; return c; };
  // same number of cycles in half the time => same crossings in half the samples
  assert.ok(Math.abs(zc(p) - zc(d)) <= 2, `cycle count should be preserved: ${zc(d)} -> ${zc(p)}`);
});

test("delay adds an echo at the right offset", () => {
  const d = new Float32Array(SR / 10);
  d[0] = 1;                                       // single impulse
  const out = delay(d, SR, { ms: 50, feedback: 0, mix: 1 });
  const at = Math.floor(0.05 * SR);
  assert.ok(Math.abs(out[at]) > 0.9, `echo missing at 50ms: ${out[at]}`);
  assert.ok(Math.abs(out[1]) < 0.01, "unexpected early echo");
});

test("shape applies the transfer function", () => {
  const d = new Float32Array([0, 0.5, -0.5, 1, -1]);
  const s = shape(d, (x) => Math.tanh(x * 2));
  assert.ok(Math.abs(s[0]) < 1e-9);
  assert.ok(s[3] < 1.0 && s[3] > 0.7, "tanh should soft-clip +1");
  assert.ok(s[4] > -1.0 && s[4] < -0.7, "tanh should soft-clip -1");
});

test("db helpers round-trip", () => {
  assert.ok(Math.abs(linToDb(dbToLin(-6)) - -6) < 1e-9);
  assert.ok(Math.abs(dbToLin(0) - 1) < 1e-9);
});

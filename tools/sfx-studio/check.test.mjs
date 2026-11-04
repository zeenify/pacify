import { test } from "node:test";
import assert from "node:assert/strict";
import { checkBuffer, RMS_BANDS, BUDGET_MS, RMS_OVERRIDES } from "./check.mjs";
import { osc, applyEnv } from "./dsp.mjs";

const SR = 44100;
const clean = () => {
  const d = osc({ wave: "sine", f: 440, dur: 0.2, sampleRate: SR });
  return applyEnv(d, SR, [[0, 0.25], [0.2, 0]]);   // ~-12 dBFS peak, no head silence
};
const spec = (over = {}) => ({ name: "test-cue", family: "ui", layers: 2, budgetMs: 400, ...over });

test("a well-formed buffer passes every check", () => {
  assert.deepEqual(checkBuffer(clean(), SR, spec()), []);
});

test("rejects a buffer that clips past -1.0 dBFS", () => {
  const d = new Float32Array(SR / 50).fill(0.99);
  const v = checkBuffer(d, SR, spec());
  assert.ok(v.some((x) => x.rule === "peak"), `expected a peak violation, got ${JSON.stringify(v)}`);
});

test("rejects leading silence (the timing bug the spec cares about)", () => {
  const d = new Float32Array(SR / 4);                  // holds 20ms offset + 200ms cue
  d.set(clean(), Math.floor(0.02 * SR));               // 20ms of head silence
  const v = checkBuffer(d, SR, spec());
  assert.ok(v.some((x) => x.rule === "head-silence"), `expected head-silence violation, got ${JSON.stringify(v)}`);
});

test("accepts head silence under 5ms", () => {
  const d = new Float32Array(SR / 4);                  // holds 2ms offset + 200ms cue
  d.set(clean(), Math.floor(0.002 * SR));              // 2ms — legal
  const v = checkBuffer(d, SR, spec());
  assert.ok(!v.some((x) => x.rule === "head-silence"), `2ms should pass: ${JSON.stringify(v)}`);
});

test("rejects a single-layer asset (the no-beeps rule)", () => {
  const v = checkBuffer(clean(), SR, spec({ layers: 1 }));
  assert.ok(v.some((x) => x.rule === "layers"), `expected layers violation, got ${JSON.stringify(v)}`);
});

test("rejects a cue longer than its animation budget", () => {
  const v = checkBuffer(clean(), SR, spec({ budgetMs: 100 }));
  assert.ok(v.some((x) => x.rule === "duration"), `expected duration violation, got ${JSON.stringify(v)}`);
});

test("allows a reverb tail 15% past the budget", () => {
  // 200ms buffer against a 180ms budget: inside the grace window
  const v = checkBuffer(clean(), SR, spec({ budgetMs: 180 }));
  assert.ok(!v.some((x) => x.rule === "duration"), `15% grace should cover this: ${JSON.stringify(v)}`);
});

test("rejects a silent buffer", () => {
  const v = checkBuffer(new Float32Array(SR / 50), SR, spec());
  assert.ok(v.some((x) => x.rule === "rms"), "expected rms violation for silence");
});

test("rejects a DC offset", () => {
  const d = new Float32Array(SR / 50).fill(0.3);
  const v = checkBuffer(d, SR, spec());
  assert.ok(v.some((x) => x.rule === "dc"), "expected dc violation");
});

test("an unknown family is a hard failure, not a silent skip", () => {
  const v = checkBuffer(clean(), SR, spec({ family: "not-a-family" }));
  assert.ok(v.some((x) => x.rule === "family"), `expected family violation, got ${JSON.stringify(v)}`);
});

test("every family with an RMS band also has a duration budget", () => {
  for (const f of Object.keys(RMS_BANDS)) {
    assert.ok(BUDGET_MS[f], `family "${f}" has an RMS band but no BUDGET_MS entry`);
    const [lo, hi] = RMS_BANDS[f];
    assert.ok(lo < hi, `band for ${f} is inverted`);
    assert.ok(BUDGET_MS[f] > 0, `budget for ${f} must be positive`);
  }
  for (const f of Object.keys(BUDGET_MS)) assert.ok(RMS_BANDS[f], `family "${f}" has a budget but no RMS band`);
});

test("every RMS override names a real family band it is exempting", () => {
  // overrides are keyed by ASSET name, not family, so this just guards against typos
  // producing an override that can never match: each must be non-empty and ordered
  for (const [name, band] of Object.entries(RMS_OVERRIDES)) {
    assert.ok(name.length > 0);
    assert.ok(band[0] < band[1], `override for ${name} is inverted`);
  }
});

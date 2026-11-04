import { test } from "node:test";
import assert from "node:assert/strict";
import { resolve } from "node:path";

import * as check from "./check.mjs";
import {
  checkBuffer, BUDGET_MS, REPO_ROOT, classifyTargets,
  CREST_MIN_DB, CREST_MAX_DB, RMS_FLOOR_DBFS,
} from "./check.mjs";
import { osc, applyEnv, stats } from "./dsp.mjs";

const SR = 44100;

/* A decaying 440 Hz sine — a normal short cue. Peak ~-12 dBFS, crest ~12 dB. */
const clean = () => {
  const d = osc({ wave: "sine", f: 440, dur: 0.2, sampleRate: SR });
  return applyEnv(d, SR, [[0, 0.25], [0.2, 0]]);
};
const spec = (over = {}) => ({ name: "test-cue", family: "ui", layers: 2, budgetMs: 400, ...over });
const rulesOf = (v) => v.map((x) => x.rule);

test("a well-formed buffer passes every check", () => {
  assert.deepEqual(checkBuffer(clean(), SR, spec()), []);
});

test("rejects a buffer that clips past -1.0 dBFS", () => {
  const d = new Float32Array(SR / 50).fill(0.99);
  const v = checkBuffer(d, SR, spec());
  assert.ok(v.some((x) => x.rule === "peak"), `expected a peak violation, got ${JSON.stringify(v)}`);
});

test("rejects leading silence over 5ms (the timing bug the spec cares about)", () => {
  const d = new Float32Array(SR / 4);                  // holds 20ms offset + 200ms cue
  d.set(clean(), Math.floor(0.02 * SR));               // 20ms of head silence
  const v = checkBuffer(d, SR, spec());
  assert.ok(v.some((x) => x.rule === "head-silence"), `expected head-silence violation, got ${JSON.stringify(v)}`);
});

test("accepts head silence under 5ms", () => {
  const d = new Float32Array(SR / 4);
  d.set(clean(), Math.floor(0.002 * SR));              // 2ms — legal
  const v = checkBuffer(d, SR, spec());
  assert.ok(!rulesOf(v).includes("head-silence"), `2ms should pass: ${JSON.stringify(v)}`);
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
  assert.ok(!rulesOf(v).includes("duration"), `15% grace should cover this: ${JSON.stringify(v)}`);
});

test("rejects an exactly silent buffer", () => {
  const v = checkBuffer(new Float32Array(SR / 50), SR, spec());
  assert.ok(v.some((x) => x.rule === "rms"), `expected an rms violation for silence, got ${JSON.stringify(v)}`);
});

test(`rejects a near-silent buffer below the ${RMS_FLOOR_DBFS} dBFS RMS floor`, () => {
  // audible in principle, but 40+ dB under anything else in the mix: inaudible in practice
  const d = osc({ wave: "sine", f: 200, dur: 0.2, sampleRate: SR });
  for (let i = 0; i < d.length; i++) d[i] *= 0.001;    // rms ~-63 dBFS
  const v = checkBuffer(d, SR, spec());
  const hit = v.find((x) => x.rule === "rms");
  assert.ok(hit, `expected an rms violation, got ${JSON.stringify(v)}`);
  assert.match(hit.message, /-45/, "the message must name the floor it fell below");
  assert.ok(!rulesOf(v).includes("crest"), `crest is healthy here; only the floor should bite: ${JSON.stringify(v)}`);
});

test("rejects a DC offset", () => {
  const d = new Float32Array(SR / 50).fill(0.3);
  const v = checkBuffer(d, SR, spec());
  assert.ok(v.some((x) => x.rule === "dc"), `expected dc violation, got ${JSON.stringify(v)}`);
});

test(`rejects a brick-walled buffer whose crest factor is below ${CREST_MIN_DB} dB`, () => {
  // hard-clipped square at constant amplitude: peak == rms, so crest == 0 dB. Loud, but
  // there is no transient left — the "shout into a limiter" sound.
  const d = osc({ wave: "square", f: 100, dur: 0.1, sampleRate: SR });
  for (let i = 0; i < d.length; i++) d[i] *= 0.5;
  const v = checkBuffer(d, SR, spec());
  const hit = v.find((x) => x.rule === "crest");
  assert.ok(hit, `expected a crest violation, got ${JSON.stringify(v)}`);
  assert.match(hit.message, /0\.0 dB/, "the message must name the measured crest");
  assert.match(hit.message, /\[2, 30\] dB/, "the message must name the window");
  assert.match(hit.message, /peak/, "the message must report the measured peak");
  assert.match(hit.message, /rms/, "the message must report the measured rms");
  assert.ok(!rulesOf(v).includes("peak"), `the level itself is legal; only crest should bite: ${JSON.stringify(v)}`);
});

test(`rejects a single-sample spike with a hollow body (crest above ${CREST_MAX_DB} dB)`, () => {
  const d = new Float32Array(Math.ceil(0.1 * SR)).fill(5e-4);   // -66 dBFS body
  d[50] = 0.5;                                                  // one -6 dBFS sample
  const v = checkBuffer(d, SR, spec());
  const hit = v.find((x) => x.rule === "crest");
  assert.ok(hit, `expected a crest violation, got ${JSON.stringify(v)}`);
  assert.match(hit.message, /\[2, 30\] dB/, "the message must name the window");
  assert.ok(!rulesOf(v).includes("rms"), `the body is above the floor; only crest should bite: ${JSON.stringify(v)}`);
});

test(`a normal short percussive transient passes the crest check`, () => {
  // what most game cues are: a fast-decaying sine burst, crest well inside [2, 30]
  const burst = applyEnv(osc({ wave: "sine", f: 880, dur: 0.08, sampleRate: SR }), SR, [[0, 0.7], [0.08, 0]]);
  const s = stats(burst);
  const crest = s.peakDbfs - s.rmsDbfs;
  assert.ok(crest > CREST_MIN_DB + 5 && crest < CREST_MAX_DB - 5,
    `fixture must sit comfortably inside the window; measured ${crest.toFixed(1)} dB`);
  assert.deepEqual(checkBuffer(burst, SR, spec()), []);
});

test("an unknown family is a hard failure, not a silent skip", () => {
  const v = checkBuffer(clean(), SR, spec({ family: "not-a-family" }));
  assert.ok(v.some((x) => x.rule === "family"), `expected family violation, got ${JSON.stringify(v)}`);
});

test("every family in BUDGET_MS has a positive budget", () => {
  const families = Object.keys(BUDGET_MS);
  assert.ok(families.length > 0, "the family registry must not be empty");
  for (const f of families) {
    assert.ok(f.length > 0);
    assert.ok(Number.isFinite(BUDGET_MS[f]) && BUDGET_MS[f] > 0, `budget for "${f}" must be a positive finite number`);
  }
});

test("Ruling 17: the per-family RMS band and its overrides are gone; crest/floor constants exist", () => {
  assert.equal(check.RMS_BANDS, undefined, "RMS_BANDS must be deleted, not merely unused");
  assert.equal(check.RMS_OVERRIDES, undefined, "RMS_OVERRIDES must be deleted, not merely unused");
  assert.equal(CREST_MIN_DB, 2);
  assert.equal(CREST_MAX_DB, 30);
  assert.equal(RMS_FLOOR_DBFS, -45);
});

test("Ruling 18: a recipe whose outDir differs from the scanned dir is never reported missing", () => {
  const sfx = resolve(REPO_ROOT, "apps", "web", "assets", "sfx");
  const audio = resolve(REPO_ROOT, "apps", "web", "assets", "audio");
  const recipes = [
    { name: "stays-here" },
    { name: "renders-elsewhere", outDir: "apps/web/assets/audio" },
  ];

  const a = classifyTargets(recipes, sfx, new Set(["stays-here"]));
  assert.deepEqual(a.missing, [], "a recipe that renders elsewhere must not be counted as missing here");
  assert.deepEqual(a.elsewhere.map((e) => e.name), ["renders-elsewhere"]);
  assert.equal(a.elsewhere[0].dir, audio, "the reported destination must match render.mjs's resolution");

  // pointing --dir at the other directory checks that directory's recipes instead
  const b = classifyTargets(recipes, audio, new Set(["renders-elsewhere"]));
  assert.deepEqual(b.missing, ["stays-here"], "only recipes targeting the scanned dir are subject to the missing check");
  assert.deepEqual(b.elsewhere, []);
});

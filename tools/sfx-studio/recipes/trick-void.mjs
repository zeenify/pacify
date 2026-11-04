/* VOID family — six assets, all reverb 0. Dryness is emptiness (spec §2).

   Rendered DRY. Every `reverb` block below documents the send the runtime applies
   from apps/web/src/lib/sfx-manifest.ts, which declares 0 for all six: an empty
   space has no tail to give back. Every sub-bass sine is highpassed at ~40Hz so a
   half-cycle cannot sit on the buffer and trip the DC-offset rule. */

/** @type {import("../render.mjs").Recipe[]} */
export const trickVoid = [
  {
    name: "trick-void-open",
    family: "trick-void",
    sampleRate: 22050,
    seed: 5001,
    // Iris opening 1200ms. Sub-bass swell INWARD: 55->82Hz over 900ms behind a 200Hz
    // lowpass, brown noise swelling against it, then the gate at 1000ms — the cut,
    // not the swell, is what the ear remembers. 22050Hz: the whole cue lives under
    // 900Hz, so the halved rate costs nothing and halves the file.
    layers: [
      { kind: "osc", wave: "sine", f: 55, fEnd: 82, glide: "exp", dur: 0.9, at: 0, gain: 0.85,
        env: [[0, 0.04], [0.3, 0.5], [0.75, 0.62], [0.9, 1]],
        filter: { type: "highpass", f: 40, q: 0.7 } },
      { kind: "osc", wave: "sine", f: 110, fEnd: 164, glide: "exp", dur: 0.9, at: 0, gain: 0.18,
        env: [[0, 0.04], [0.5, 0.4], [0.9, 1]],
        filter: { type: "lowpass", f: 200, q: 0.9 } },
      { kind: "noise", color: "brown", dur: 1.0, at: 0, gain: 0.5,
        env: [[0, 0.01], [0.4, 0.45], [0.85, 0.8], [0.998, 1], [1.0, 0.0001]],
        filter: { type: "lowpass", f: 200, q: 0.8 } },
    ],
    reverb: { preset: "plate", send: 0 },
    master: { normalizeTo: -3 },
  },
  {
    name: "trick-void-mutate",
    family: "trick-void",
    sampleRate: 44100,
    seed: 5002,
    // Card becoming a maw (dVdMutate 620ms): 14 grains 40ms apart, each plate its own
    // pitch from the seeded PRNG (0.7-1.4), each bandpassed 3000->400Hz so the whole
    // cluster sags into the mouth instead of chattering.
    layers: [
      { kind: "sample", src: "card-flick.wav", at: 0, gain: 0.5, pitch: 0.7, trimStart: 0.066, trimEnd: 0.086,
        env: [[0, 1], [0.018, 0.0001]], filter: { type: "bandpass", f: 3000, fEnd: 700, q: 2.4 } },
      { kind: "sample", src: "card-flick.wav", at: 0.04, gain: 0.52, pitch: 1.32, trimStart: 0.066, trimEnd: 0.086,
        env: [[0, 1], [0.018, 0.0001]], filter: { type: "bandpass", f: 2900, fEnd: 680, q: 2.4 } },
      { kind: "sample", src: "card-flick.wav", at: 0.08, gain: 0.54, pitch: 0.85, trimStart: 0.066, trimEnd: 0.086,
        env: [[0, 1], [0.018, 0.0001]], filter: { type: "bandpass", f: 2800, fEnd: 660, q: 2.4 } },
      { kind: "sample", src: "card-flick.wav", at: 0.12, gain: 0.56, pitch: 1.12, trimStart: 0.066, trimEnd: 0.086,
        env: [[0, 1], [0.018, 0.0001]], filter: { type: "bandpass", f: 2700, fEnd: 640, q: 2.4 } },
      { kind: "sample", src: "card-flick.wav", at: 0.16, gain: 0.58, pitch: 0.98, trimStart: 0.066, trimEnd: 0.086,
        env: [[0, 1], [0.018, 0.0001]], filter: { type: "bandpass", f: 2600, fEnd: 620, q: 2.4 } },
      { kind: "sample", src: "card-flick.wav", at: 0.2, gain: 0.6, pitch: 1.4, trimStart: 0.066, trimEnd: 0.086,
        env: [[0, 1], [0.018, 0.0001]], filter: { type: "bandpass", f: 2500, fEnd: 600, q: 2.4 } },
      { kind: "sample", src: "card-flick.wav", at: 0.24, gain: 0.62, pitch: 0.76, trimStart: 0.066, trimEnd: 0.086,
        env: [[0, 1], [0.018, 0.0001]], filter: { type: "bandpass", f: 2400, fEnd: 580, q: 2.4 } },
      { kind: "sample", src: "card-flick.wav", at: 0.28, gain: 0.64, pitch: 1.22, trimStart: 0.066, trimEnd: 0.086,
        env: [[0, 1], [0.018, 0.0001]], filter: { type: "bandpass", f: 2300, fEnd: 560, q: 2.4 } },
      { kind: "sample", src: "card-flick.wav", at: 0.32, gain: 0.66, pitch: 0.9, trimStart: 0.066, trimEnd: 0.086,
        env: [[0, 1], [0.018, 0.0001]], filter: { type: "bandpass", f: 2200, fEnd: 540, q: 2.4 } },
      { kind: "sample", src: "card-flick.wav", at: 0.36, gain: 0.68, pitch: 1.05, trimStart: 0.066, trimEnd: 0.086,
        env: [[0, 1], [0.018, 0.0001]], filter: { type: "bandpass", f: 2100, fEnd: 520, q: 2.4 } },
      { kind: "sample", src: "card-flick.wav", at: 0.4, gain: 0.7, pitch: 0.72, trimStart: 0.066, trimEnd: 0.086,
        env: [[0, 1], [0.018, 0.0001]], filter: { type: "bandpass", f: 2000, fEnd: 500, q: 2.4 } },
      { kind: "sample", src: "card-flick.wav", at: 0.44, gain: 0.72, pitch: 1.3, trimStart: 0.066, trimEnd: 0.086,
        env: [[0, 1], [0.018, 0.0001]], filter: { type: "bandpass", f: 1900, fEnd: 480, q: 2.4 } },
      { kind: "sample", src: "card-flick.wav", at: 0.48, gain: 0.74, pitch: 0.95, trimStart: 0.066, trimEnd: 0.086,
        env: [[0, 1], [0.018, 0.0001]], filter: { type: "bandpass", f: 1800, fEnd: 460, q: 2.4 } },
      { kind: "sample", src: "card-flick.wav", at: 0.52, gain: 0.76, pitch: 1.16, trimStart: 0.066, trimEnd: 0.086,
        env: [[0, 1], [0.018, 0.0001]], filter: { type: "bandpass", f: 1700, fEnd: 400, q: 2.4 } },
      { kind: "noise", color: "pink", dur: 0.6, at: 0, gain: 0.35,
        env: [[0, 0.05], [0.3, 0.5], [0.56, 0.9], [0.598, 0.12], [0.6, 0.0001]],
        filter: { type: "bandpass", f: 3000, fEnd: 400, q: 1.1 } },
      { kind: "osc", wave: "sine", f: 62, fEnd: 44, glide: "exp", dur: 0.58, at: 0, gain: 0.4,
        env: [[0, 0.05], [0.4, 0.6], [0.58, 1]],
        filter: { type: "highpass", f: 40, q: 0.7 } },
    ],
    reverb: { preset: "plate", send: 0 },
    master: { normalizeTo: -5 },
  },
  {
    name: "trick-void-reality",
    family: "trick-void",
    sampleRate: 44100,
    seed: 5003,
    // dVoidReality 2400 @500. Two saws 58 / 58.7Hz: the 0.7Hz beat IS the unease, so
    // the saws stay un-normalised against each other and the lowpass sits at 300Hz to
    // keep the beat a throb, not a buzz. 2.4s exp decay, then the floor.
    layers: [
      { kind: "osc", wave: "saw", f: 58, dur: 2.4, at: 0, gain: 0.5,
        env: [[0, 0.001], [0.15, 1], [1.2, 0.45], [2.396, 0.004], [2.4, 0.0001]],
        filter: { type: "lowpass", f: 300, q: 1.2 } },
      { kind: "osc", wave: "saw", f: 58.7, dur: 2.4, at: 0, gain: 0.5,
        env: [[0, 0.001], [0.15, 1], [1.2, 0.45], [2.396, 0.004], [2.4, 0.0001]],
        filter: { type: "lowpass", f: 300, q: 1.2 } },
      { kind: "osc", wave: "sine", f: 116.7, dur: 2.4, at: 0, gain: 0.22,
        env: [[0, 0.001], [0.15, 1], [1.2, 0.4], [2.396, 0.004], [2.4, 0.0001]],
        filter: { type: "highpass", f: 40, q: 0.7 } },
      { kind: "noise", color: "brown", dur: 2.4, at: 0, gain: 0.3,
        env: [[0, 0.001], [0.2, 0.7], [1.3, 0.4], [2.396, 0.004], [2.4, 0.0001]],
        filter: { type: "lowpass", f: 420, q: 0.9 } },
    ],
    reverb: { preset: "plate", send: 0 },
    master: { normalizeTo: -8 },
  },
  {
    name: "trick-void-suck",
    family: "trick-void",
    sampleRate: 44100,
    seed: 5004,
    // Victim dragged (dVdDevourDown/Up 1150 @1200). Ascending envelope + bandpass
    // falling 4000->300Hz: bright air pulled down into a throat. The rise is the
    // rewind of a decay, which is exactly what "inhaled" sounds like.
    layers: [
      { kind: "noise", color: "white", dur: 0.95, at: 0.1, gain: 0.85,
        env: [[0, 0.01], [0.35, 0.14], [0.75, 0.5], [0.93, 0.95], [0.95, 0.0001]],
        filter: { type: "bandpass", f: 4000, fEnd: 300, q: 1.6 } },
      { kind: "noise", color: "pink", dur: 1.05, at: 0.05, gain: 0.4,
        env: [[0, 0.01], [0.6, 0.2], [1.03, 0.85], [1.05, 0.0001]],
        filter: { type: "bandpass", f: 2400, fEnd: 220, q: 1.1 } },
      { kind: "osc", wave: "sine", f: 48, fEnd: 72, glide: "exp", dur: 1.05, at: 0.08, gain: 0.4,
        env: [[0, 0.01], [0.8, 0.5], [1.045, 1], [1.05, 0.0001]],
        filter: { type: "highpass", f: 42, q: 0.7 } },
    ],
    reverb: { preset: "plate", send: 0 },
    master: { normalizeTo: -4 },
  },
  {
    name: "trick-void-devour",
    family: "trick-void",
    sampleRate: 44100,
    seed: 5005,
    // The money beat — canvas shock at t=2280. A 40ms full-band crack, a 120->28Hz
    // drop that lands by 340ms, then HARD SILENCE: the last ~250ms is the effect.
    // Nothing rings. The gate's head-silence rule reads the head only, so a long
    // near-silent tail is allowed and is the point.
    layers: [
      { kind: "noise", color: "white", dur: 0.04, at: 0, gain: 0.9,
        env: [[0, 1], [0.012, 0.7], [0.04, 0.0001]] },
      { kind: "osc", wave: "sine", f: 120, fEnd: 28, glide: "exp", dur: 0.34, at: 0, gain: 0.95,
        env: [[0, 1], [0.3, 0.35], [0.34, 0.0001]],
        filter: { type: "highpass", f: 40, q: 0.7 } },
      { kind: "noise", color: "brown", dur: 0.3, at: 0, gain: 0.45,
        env: [[0, 1], [0.06, 0.5], [0.3, 0.0001]],
        filter: { type: "lowpass", f: 180, q: 0.9 } },
      { kind: "silence", dur: 0.25, at: 0.35 },
    ],
    reverb: { preset: "plate", send: 0 },
    master: { normalizeTo: -2 },
  },
  {
    name: "trick-void-die",
    family: "trick-void",
    sampleRate: 22050,
    seed: 5006,
    // Maw collapsing at 4100 — the inverse of open: 82->40Hz falling, gated at 350ms
    // behind a 5ms fade so the cut does not click. 22050Hz: sub-bass only, no bright
    // content to alias. Pure sine family, so the 40Hz highpass is what keeps it legal.
    layers: [
      { kind: "osc", wave: "sine", f: 82, fEnd: 40, glide: "exp", dur: 0.345, at: 0, gain: 0.9,
        env: [[0, 1], [0.12, 0.75], [0.32, 0.3], [0.345, 0.06]],
        filter: { type: "highpass", f: 40, q: 0.7 } },
      { kind: "osc", wave: "sine", f: 164, fEnd: 80, glide: "exp", dur: 0.345, at: 0, gain: 0.2,
        env: [[0, 1], [0.345, 0.05]],
        filter: { type: "highpass", f: 60, q: 0.7 } },
      { kind: "noise", color: "brown", dur: 0.35, at: 0, gain: 0.35,
        env: [[0, 0.9], [0.15, 0.4], [0.345, 0.12], [0.35, 0.0001]],
        filter: { type: "lowpass", f: 220, q: 0.8 } },
    ],
    reverb: { preset: "plate", send: 0 },
    master: { normalizeTo: -4 },
  },
];

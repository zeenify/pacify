/* ORACLE family — six assets, the wettest in the game: every cue sends into the
   cathedral IR (spec §7 tricks II). Rendered DRY; the `reverb` block here documents
   the send apps/web/src/lib/sfx-manifest.ts applies at runtime and must agree with
   it exactly (0.60 veil / 0.50 lens / 0.55 scan / 0.60 constellation / 0.50 face /
   0.60 glint). High-pass every low sine so no half-cycle trips the DC rule. */

/** @type {import("../render.mjs").Recipe[]} */
export const trickOracle = [
  {
    name: "trick-oracle-veil",
    family: "trick-oracle",
    sampleRate: 44100,
    seed: 9101,
    // Night veil descending: pink noise lowpassed @600Hz decaying over 1.2s, a 220Hz
    // pad beneath it and a 110Hz octave to keep it felt more than heard.
    layers: [
      { kind: "noise", color: "pink", dur: 1.35, at: 0, gain: 0.8,
        env: [[0, 0.0001], [0.12, 0.9], [0.5, 0.55], [1.35, 0.0001]],
        filter: { type: "lowpass", f: 600, q: 0.9 } },
      { kind: "osc", wave: "sine", f: 220, dur: 1.35, at: 0, gain: 0.4,
        env: [[0, 0.0001], [0.15, 0.9], [0.7, 0.35], [1.35, 0.0001]],
        filter: { type: "lowpass", f: 900, q: 0.7 } },
      { kind: "osc", wave: "sine", f: 110, dur: 1.35, at: 0, gain: 0.3,
        env: [[0, 0.0001], [0.2, 0.8], [1.35, 0.0001]],
        filter: { type: "highpass", f: 40, q: 0.7 } },
    ],
    reverb: { preset: "cathedral", send: 0.6 },
    master: { normalizeTo: -6 },
  },
  {
    name: "trick-oracle-lens",
    family: "trick-oracle",
    sampleRate: 44100,
    seed: 9102,
    // dOracleLens 1450ms: glassy descend-and-settle. 1760->880Hz exp over 1.2s lands
    // on an 880Hz ring at 1.2s; a 6kHz bandpassed noise shimmer falls with it.
    layers: [
      { kind: "osc", wave: "sine", f: 1760, fEnd: 880, glide: "exp", dur: 1.2, at: 0, gain: 0.55,
        env: [[0, 0.0001], [0.03, 0.9], [0.6, 0.5], [1.2, 0.55]] },
      { kind: "osc", wave: "sine", f: 880, dur: 0.9, at: 0.55, gain: 0.3,
        env: [[0, 0.0001], [0.65, 0.8], [0.9, 0.0001]],
        filter: { type: "highpass", f: 200, q: 0.7 } },
      { kind: "noise", color: "white", dur: 1.0, at: 0.1, gain: 0.4,
        env: [[0, 0.0001], [0.15, 0.7], [0.75, 0.25], [1.0, 0.0001]],
        filter: { type: "bandpass", f: 6000, fEnd: 3500, q: 2.2 } },
      { kind: "osc", wave: "sine", f: 220, dur: 1.0, at: 0, gain: 0.25,
        env: [[0, 0.0001], [0.2, 0.8], [1.0, 0.0001]],
        filter: { type: "highpass", f: 40, q: 0.7 } },
    ],
    reverb: { preset: "cathedral", send: 0.5 },
    master: { normalizeTo: -5 },
  },
  {
    name: "trick-oracle-scan",
    family: "trick-oracle",
    sampleRate: 44100,
    seed: 9103,
    // dOracleScan 1350ms: the beam sweeps 500->3000->500Hz up and back through a
    // bandpass q6 (the written glides are two monotone pieces), with a 300Hz sub for
    // weight and a 6.25Hz pulse train — 18 short ticks — as the scanning line.
    layers: [
      { kind: "osc", wave: "sine", f: 500, fEnd: 3000, glide: "exp", dur: 0.6, at: 0, gain: 0.6,
        env: [[0, 0.0001], [0.05, 0.85], [0.6, 1]],
        filter: { type: "bandpass", f: 1800, q: 6 } },
      { kind: "osc", wave: "sine", f: 3000, fEnd: 500, glide: "exp", dur: 0.7, at: 0.6, gain: 0.6,
        env: [[0, 1], [0.65, 0.6], [0.7, 0.0001]],
        filter: { type: "bandpass", f: 1800, q: 6 } },
      ...Array.from({ length: 18 }, (_, i) => ({
        kind: "noise", color: "white", dur: 0.012, at: 0.02 + i * 0.072, gain: 0.16,
        env: [[0, 1], [0.012, 0.0001]],
        filter: { type: "bandpass", f: 4000, q: 3 },
      })),
      { kind: "osc", wave: "sine", f: 300, dur: 1.3, at: 0, gain: 0.22,
        env: [[0, 0.0001], [0.15, 0.7], [1.3, 0.0001]],
        filter: { type: "highpass", f: 40, q: 0.7 } },
    ],
    reverb: { preset: "cathedral", send: 0.55 },
    master: { normalizeTo: -5 },
  },
  {
    name: "trick-oracle-constellation",
    family: "trick-oracle",
    sampleRate: 44100,
    seed: 9104,
    // Lines drawing 600->1800ms: a celesta arpeggio. Five sine+tri pairs struck
    // 180ms apart, each 300ms exp decay, the tri an octave under for body.
    layers: [
      ...[1046, 1318, 1568, 2093, 2637].flatMap((f, i) => [
        { kind: "osc", wave: "sine", f, dur: 0.3, at: i * 0.18, gain: 0.5,
          env: [[0, 1], [0.3, 0.0001]] },
        { kind: "osc", wave: "tri", f: f / 2, dur: 0.3, at: i * 0.18, gain: 0.2,
          env: [[0, 1], [0.3, 0.0001]],
          filter: { type: "lowpass", f: 4000, q: 0.7 } },
      ]),
      { kind: "osc", wave: "sine", f: 130, dur: 1.2, at: 0, gain: 0.2,
        env: [[0, 0.0001], [0.2, 0.7], [0.9, 0.2], [1.2, 0.0001]],
        filter: { type: "highpass", f: 40, q: 0.7 } },
    ],
    reverb: { preset: "cathedral", send: 0.6 },
    master: { normalizeTo: -6 },
  },
  {
    name: "trick-oracle-face",
    family: "trick-oracle",
    sampleRate: 44100,
    seed: 9105,
    // dOcFace 700ms (called up to 2x): a soft ignition. Bandpass 800->3000Hz opening
    // over 400ms, a 330Hz body, and a trimmed fire-crackle under it — paper catching,
    // not exploding.
    layers: [
      { kind: "noise", color: "pink", dur: 0.4, at: 0, gain: 0.6,
        env: [[0, 0.0001], [0.06, 0.8], [0.4, 0.0001]],
        filter: { type: "bandpass", f: 800, fEnd: 3000, q: 1.2 } },
      { kind: "osc", wave: "sine", f: 330, dur: 0.5, at: 0, gain: 0.45,
        env: [[0, 0.0001], [0.03, 0.9], [0.5, 0.0001]] },
      { kind: "sample", src: "fire-crackle.wav", at: 0.02, gain: 0.3, pitch: 1.4, trimStart: 0.12, trimEnd: 0.68,
        env: [[0, 0.0001], [0.1, 0.9], [0.66, 0.0001]],
        filter: { type: "bandpass", f: 2200, q: 1 } },
      { kind: "osc", wave: "sine", f: 165, dur: 0.45, at: 0, gain: 0.22,
        env: [[0, 0.0001], [0.05, 0.8], [0.45, 0.0001]],
        filter: { type: "highpass", f: 40, q: 0.7 } },
    ],
    reverb: { preset: "cathedral", send: 0.5 },
    master: { normalizeTo: -6 },
  },
  {
    name: "trick-oracle-glint",
    family: "trick-oracle",
    sampleRate: 44100,
    seed: 9106,
    // dOcPop (called 3x, pitched 1.0/1.07/1.14): pure and tiny. 3136+4186Hz sine
    // pair, 350ms exp decay; the 1568Hz sine is the hardness of the sparkle.
    layers: [
      { kind: "osc", wave: "sine", f: 3136, dur: 0.35, at: 0, gain: 0.7,
        env: [[0, 1], [0.35, 0.0001]] },
      { kind: "osc", wave: "sine", f: 4186, dur: 0.3, at: 0, gain: 0.42,
        env: [[0, 1], [0.3, 0.0001]] },
      { kind: "osc", wave: "sine", f: 1568, dur: 0.28, at: 0, gain: 0.28,
        env: [[0, 1], [0.28, 0.0001]] },
      { kind: "noise", color: "white", dur: 0.012, at: 0, gain: 0.25,
        env: [[0, 1], [0.012, 0.0001]],
        filter: { type: "highpass", f: 6000, q: 0.7 } },
    ],
    reverb: { preset: "cathedral", send: 0.6 },
    master: { normalizeTo: -7 },
  },
];

/* Stamp family. One asset, reused everywhere — see spec §5.5. */

/** @type {import("../render.mjs").Recipe[]} */
export const stamp = [
  {
    name: "duel-stamp",
    family: "stamp",
    sampleRate: 44100,
    seed: 2001,
    // Reused by eleven verdict moments at pitches 0.85-1.15 (spec §5.5). Three layers:
    // weight, thud, ink texture. Must stay legible when pitch-shifted by the caller.
    layers: [
      { kind: "sample", src: "paper-slap.wav", at: 0, gain: 0.85, pitch: 0.6,
        env: [[0, 1], [0.16, 0.15], [0.3, 0]],
        filter: { type: "lowpass", f: 2400, q: 0.7 } },
      { kind: "osc", wave: "sine", f: 110, fEnd: 62, glide: "exp", dur: 0.09, at: 0, gain: 0.9,
        env: [[0, 1], [0.09, 0]] },
      { kind: "noise", color: "white", dur: 0.25, at: 0, gain: 0.3,
        env: [[0, 0.9], [0.02, 1], [0.25, 0]],
        filter: { type: "bandpass", f: 1800, q: 1.1 } },
    ],
    reverb: { preset: "plate", send: 0.2 },
    master: { normalizeTo: -3 },
  },
];

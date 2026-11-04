/* UI family. These four re-render the LEGACY sounds in place at their existing
   filenames (spec §7.22) so no importer path changes. */

/** @type {import("../render.mjs").Recipe[]} */
export const ui = [
  {
    name: "click",
    family: "ui",
    sampleRate: 44100,
    seed: 1001,
    // A button confirm: a dry woody transient over a short pitched body. Two layers
    // minimum per spec §9.1a — a single oscillator is a beep and is rejected.
    layers: [
      { kind: "noise", color: "white", dur: 0.006, at: 0, gain: 0.9,
        env: [[0, 1], [0.006, 0]], filter: { type: "bandpass", f: 2600, q: 1.4 } },
      { kind: "osc", wave: "tri", f: 520, fEnd: 300, glide: "exp", dur: 0.07, at: 0, gain: 0.55,
        env: [[0, 0.9], [0.008, 1], [0.07, 0]], filter: { type: "lowpass", f: 3200, q: 0.8 } },
    ],
    master: { normalizeTo: -3 },
  },
];

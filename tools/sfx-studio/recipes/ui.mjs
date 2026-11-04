/* UI family. hover/click/slider/card re-render the LEGACY sounds in place at their
   existing filenames (spec §7.22) so no importer path changes; ui-back, ui-error and
   ui-modal-in are new. */

/** @type {import("../render.mjs").Recipe[]} */
export const ui = [
  {
    // Renders OUTSIDE apps/web/assets/sfx: its public path is /hover.wav at the root
    // of public/, not /sfx/hover.wav, and spec §7.22 forbids moving it.
    name: "hover",
    family: "ui",
    outDir: "apps/web/assets/audio",
    sampleRate: 44100,
    seed: 1002,
    // Plays constantly under the pointer, so it is deliberately the quietest cue in
    // the game (-14 dBFS peak): a 4ms air tick over a fast-falling 1180Hz body.
    layers: [
      { kind: "noise", color: "white", dur: 0.004, at: 0, gain: 0.7,
        env: [[0, 1], [0.004, 0]], filter: { type: "bandpass", f: 3200, q: 1.6 } },
      { kind: "osc", wave: "sine", f: 1180, dur: 0.09, at: 0, gain: 0.5,
        env: [[0, 1], [0.09, 0.0001]] },
    ],
    master: { normalizeTo: -14 },
  },
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
  {
    name: "slider",
    family: "ui",
    sampleRate: 44100,
    seed: 1003,
    // Tighter and drier than `hover` and a fourth as long: this fires on every
    // pointer move of a drag, so there is no room for a tail.
    layers: [
      { kind: "noise", color: "white", dur: 0.002, at: 0, gain: 0.8,
        env: [[0, 1], [0.002, 0]], filter: { type: "bandpass", f: 4500, q: 1.5 } },
      { kind: "osc", wave: "tri", f: 880, fEnd: 660, glide: "exp", dur: 0.06, at: 0, gain: 0.6,
        env: [[0, 1], [0.06, 0.0001]], filter: { type: "lowpass", f: 4000, q: 0.7 } },
    ],
    master: { normalizeTo: -12 },
  },
  {
    name: "card",
    family: "ui",
    sampleRate: 44100,
    seed: 1004,
    // Card stock flick over felt. The sourced flick carries the paper transient; the
    // brown-noise body is the table under it, and is what makes it read as stock.
    layers: [
      // trimStart 66ms: the normalised flick has NO content before 67ms, and its
      // transient sits at 70ms — at :00 the cue would be 70ms late against the visual.
      { kind: "sample", src: "card-flick.wav", at: 0, gain: 0.85, trimStart: 0.066, trimEnd: 0.4,
        env: [[0, 1], [0.06, 0.5], [0.2, 0.0001]],
        filter: { type: "highpass", f: 220, q: 0.7 } },
      { kind: "noise", color: "brown", dur: 0.18, at: 0, gain: 0.55,
        env: [[0, 1], [0.05, 0.6], [0.18, 0.0001]],
        // bandpass, not lowpass: brown noise carries a DC offset and a lowpass would pass it
        filter: { type: "bandpass", f: 300, q: 0.5 } },
    ],
    master: { normalizeTo: -6 },
  },
  {
    name: "ui-back",
    family: "ui",
    sampleRate: 44100,
    seed: 1005,
    // `click` shape inverted: the same transient, but the body falls instead of
    // rising, which is what makes it read as "return" rather than "confirm".
    layers: [
      { kind: "noise", color: "white", dur: 0.006, at: 0, gain: 0.85,
        env: [[0, 1], [0.006, 0]], filter: { type: "bandpass", f: 2200, q: 1.3 } },
      { kind: "osc", wave: "tri", f: 440, fEnd: 260, glide: "exp", dur: 0.11, at: 0, gain: 0.6,
        env: [[0, 1], [0.11, 0.0001]], filter: { type: "lowpass", f: 2800, q: 0.8 } },
    ],
    master: { normalizeTo: -3 },
  },
  {
    name: "ui-error",
    family: "ui",
    sampleRate: 44100,
    seed: 1006,
    // 196 + 203 Hz squares beat at 7 Hz: the dissonance IS the error signal, so the
    // lowpass keeps the roughness and no reverb is declared — a tail would smear it.
    layers: [
      { kind: "osc", wave: "square", f: 196, dur: 0.09, at: 0, gain: 0.45,
        env: [[0, 1], [0.09, 0.0001]], filter: { type: "lowpass", f: 900, q: 0.7 } },
      { kind: "osc", wave: "square", f: 196, dur: 0.09, at: 0.13, gain: 0.45,
        env: [[0, 1], [0.09, 0.0001]], filter: { type: "lowpass", f: 900, q: 0.7 } },
      { kind: "osc", wave: "square", f: 196, dur: 0.09, at: 0.26, gain: 0.45,
        env: [[0, 1], [0.09, 0.0001]], filter: { type: "lowpass", f: 900, q: 0.7 } },
      { kind: "osc", wave: "square", f: 203, dur: 0.09, at: 0, gain: 0.45,
        env: [[0, 1], [0.09, 0.0001]], filter: { type: "lowpass", f: 900, q: 0.7 } },
      { kind: "osc", wave: "square", f: 203, dur: 0.09, at: 0.13, gain: 0.45,
        env: [[0, 1], [0.09, 0.0001]], filter: { type: "lowpass", f: 900, q: 0.7 } },
      { kind: "osc", wave: "square", f: 203, dur: 0.09, at: 0.26, gain: 0.45,
        env: [[0, 1], [0.09, 0.0001]], filter: { type: "lowpass", f: 900, q: 0.7 } },
    ],
    master: { normalizeTo: -3 },
  },
  {
    name: "ui-modal-in",
    family: "ui",
    sampleRate: 44100,
    seed: 1007,
    // A sheet of paper landing on a desk: the sourced slap is the surface, the 320Hz
    // sine is the body of the modal frame arriving.
    layers: [
      { kind: "sample", src: "paper-slap.wav", at: 0, gain: 0.9, trimEnd: 0.35,
        // highpass, not lowpass: the normalised paper-slap carries +0.016 DC
        env: [[0, 1], [0.1, 0.4], [0.3, 0.0001]],
        filter: { type: "highpass", f: 120, q: 0.7 } },
      { kind: "osc", wave: "sine", f: 320, fEnd: 240, glide: "exp", dur: 0.2, at: 0, gain: 0.5,
        env: [[0, 1], [0.2, 0.0001]] },
    ],
    reverb: { preset: "hall", send: 0.15 },
    master: { normalizeTo: -3 },
  },
];

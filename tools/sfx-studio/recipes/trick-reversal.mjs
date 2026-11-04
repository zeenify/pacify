/* REVERSAL family — two assets. The trick's signature is backwards playback: every
   sample layer here is `reverse: true`, so its natural decay becomes a swell that
   lands on the visual beat instead of leaking out of it (spec §7 tricks II).

   Rendered DRY. `reverb` documents the manifest send (hall 0.30 / 0.35). */

/** @type {import("../render.mjs").Recipe[]} */
export const trickReversal = [
  {
    name: "trick-reversal-vortex",
    family: "trick-reversal",
    sampleRate: 44100,
    seed: 9001,
    // Streams spiralling IN over 1100ms. Three layers of the clang played backwards
    // (its ring becomes the inhale) each swelling to the peak at 1.1s, bandpassed
    // 600/1200/2400Hz so the three arrive as separate strata, plus a reversed glass
    // shimmer on top. Ascending envelopes only — nothing decays before the burst.
    layers: [
      { kind: "sample", src: "metal-clang.wav", at: 0, gain: 0.45, pitch: 0.7, reverse: true, trimStart: 0, trimEnd: 1.1,
        env: [[0, 0.03], [0.5, 0.35], [1.08, 0.95], [1.1, 1]],
        filter: { type: "bandpass", f: 600, q: 1.4 } },
      { kind: "sample", src: "metal-clang.wav", at: 0, gain: 0.4, pitch: 1.0, reverse: true, trimStart: 0.3, trimEnd: 1.4,
        env: [[0, 0.02], [0.55, 0.3], [1.08, 0.9], [1.1, 1]],
        filter: { type: "bandpass", f: 1200, q: 1.6 } },
      { kind: "sample", src: "metal-clang.wav", at: 0, gain: 0.3, pitch: 1.6, reverse: true, trimStart: 0.2, trimEnd: 1.3,
        env: [[0, 0.01], [0.6, 0.25], [1.08, 0.85], [1.1, 1]],
        filter: { type: "bandpass", f: 2400, q: 1.8 } },
      { kind: "sample", src: "glass-shatter.wav", at: 0, gain: 0.22, pitch: 1.3, reverse: true, trimStart: 0.03, trimEnd: 1.1,
        env: [[0, 0.01], [0.65, 0.2], [1.1, 0.9]],
        filter: { type: "highpass", f: 1200, q: 0.7 } },
      { kind: "osc", wave: "sine", f: 55, fEnd: 88, glide: "exp", dur: 1.1, at: 0, gain: 0.35,
        env: [[0, 0.05], [0.7, 0.5], [1.1, 1]],
        filter: { type: "highpass", f: 40, q: 0.7 } },
    ],
    reverb: { preset: "hall", send: 0.3 },
    master: { normalizeTo: -3 },
  },
  {
    name: "trick-reversal-burst",
    family: "trick-reversal",
    sampleRate: 44100,
    seed: 9002,
    // The release of the vortex at t=1100: a 30ms full-band crack, then the doppler
    // swap — 200->50Hz exp drop (the tone falling away is the time running forwards
    // again) under a REVERSED cymbal-ish noise tail, i.e. a forward playout mirrored
    // so its energy leans into the crack. First frame is the crack: no head silence.
    layers: [
      { kind: "noise", color: "white", dur: 0.03, at: 0, gain: 0.95,
        env: [[0, 1], [0.006, 0.7], [0.03, 0.0001]] },
      { kind: "osc", wave: "sine", f: 200, fEnd: 50, glide: "exp", dur: 0.55, at: 0, gain: 0.9,
        env: [[0, 1], [0.1, 0.55], [0.55, 0.0001]],
        filter: { type: "highpass", f: 40, q: 0.7 } },
      { kind: "sample", src: "glass-shatter.wav", at: 0, gain: 0.55, pitch: 1.0, reverse: true, trimStart: 0.03, trimEnd: 0.88,
        env: [[0, 0.9], [0.2, 0.45], [0.85, 0.0001]],
        filter: { type: "highpass", f: 800, q: 0.7 } },
      { kind: "noise", color: "pink", dur: 0.75, at: 0, gain: 0.35,
        env: [[0, 0.6], [0.15, 0.25], [0.75, 0.0001]],
        filter: { type: "lowpass", f: 2500, fEnd: 600, q: 0.9 } },
    ],
    reverb: { preset: "hall", send: 0.35 },
    master: { normalizeTo: -2 },
  },
];

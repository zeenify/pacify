/* ECLIPSE family — night falling, the corona, the broken glyphs (spec §2).

   Rendered DRY; `reverb` documents the manifest send. The drone is the longest cue
   in the game at 3600ms, and it is nearly all sub-1kHz energy, so it renders at
   22050Hz — half the bytes, nothing bright enough to alias. */

/** @type {import("../render.mjs").Recipe[]} */
export const trickEclipse = [
  {
    name: "trick-eclipse-drone",
    family: "trick-eclipse",
    sampleRate: 22050,
    seed: 7001,
    // dEclipseNight 3600ms. Brown noise behind a 800->180Hz lowpass over 3.4s: the light
    // draining out of the spectrum. The 41Hz pedal (phase 0.25 so it starts at full
    // amplitude, no swell) is the floor the dark sits on. 22050Hz: there is no content
    // above ~1.2kHz here, so the halved rate is free.
    layers: [
      { kind: "noise", color: "brown", dur: 3.5, at: 0, gain: 0.85,
        env: [[0, 0.55], [0.6, 1], [2.2, 0.8], [3.4, 0.3], [3.5, 0.0001]],
        filter: { type: "lowpass", f: 800, fEnd: 180, q: 1.1 } },
      { kind: "osc", wave: "sine", f: 41, dur: 3.6, at: 0, gain: 0.5, phase: 0.25,
        env: [[0, 0.5], [0.4, 1], [2.6, 0.75], [3.55, 0.18], [3.6, 0.0001]],
        filter: { type: "highpass", f: 38, q: 0.7 } },
      { kind: "osc", wave: "sine", f: 82, dur: 3.6, at: 0, gain: 0.16, phase: 0.25,
        env: [[0, 0.4], [0.4, 0.9], [3.55, 0.15], [3.6, 0.0001]],
        filter: { type: "lowpass", f: 400, q: 0.9 } },
      { kind: "noise", color: "pink", dur: 3.2, at: 0.2, gain: 0.12,
        env: [[0, 0.3], [1.0, 0.7], [3.0, 0.4], [3.2, 0.0001]],
        filter: { type: "bandpass", f: 900, fEnd: 260, q: 0.8 } },
    ],
    reverb: { preset: "hall", send: 0.3 },
    master: { normalizeTo: -8 },
  },
  {
    name: "trick-eclipse-corona",
    family: "trick-eclipse",
    sampleRate: 44100,
    seed: 7002,
    // The ring of light cutting through the dark. Three high partials exp-decaying 1.6s,
    // each carrying its own two 20ms amplitude cracks at 600 and 1100ms — the envelope
    // dips are the flashes, so the light stutters without a separate impact layer.
    layers: [
      { kind: "osc", wave: "sine", f: 3520, dur: 1.6, at: 0, gain: 0.55,
        env: [[0, 1], [0.35, 0.55], [0.58, 0.42], [0.6, 0.1], [0.62, 0.4], [1.08, 0.28], [1.1, 0.06], [1.12, 0.26], [1.596, 0.005], [1.6, 0.0001]] },
      { kind: "osc", wave: "sine", f: 4400, dur: 1.6, at: 0, gain: 0.38,
        env: [[0, 1], [0.35, 0.5], [0.58, 0.38], [0.6, 0.09], [0.62, 0.36], [1.08, 0.26], [1.1, 0.05], [1.12, 0.24], [1.596, 0.005], [1.6, 0.0001]] },
      { kind: "osc", wave: "sine", f: 5280, dur: 1.5, at: 0, gain: 0.26,
        env: [[0, 1], [0.35, 0.45], [0.58, 0.34], [0.6, 0.08], [0.62, 0.32], [1.08, 0.22], [1.1, 0.04], [1.12, 0.2], [1.496, 0.005], [1.5, 0.0001]] },
      { kind: "noise", color: "white", dur: 1.5, at: 0, gain: 0.12,
        env: [[0, 1], [0.6, 0.2], [0.62, 0.5], [1.1, 0.15], [1.12, 0.4], [1.496, 0.006], [1.5, 0.0001]],
        filter: { type: "highpass", f: 5000, q: 0.8 } },
    ],
    reverb: { preset: "hall", send: 0.35 },
    master: { normalizeTo: -7 },
  },
  {
    name: "trick-eclipse-glyph",
    family: "trick-eclipse",
    sampleRate: 44100,
    seed: 7003,
    // Broken-shield glyphs dropping (@1450/1540). Called twice with pitch variation, so
    // this is one glyph: 60ms of glass clipped from its 39ms attack and pitched 1.8,
    // over a 300Hz body that gives the shard something to land on.
    layers: [
      { kind: "sample", src: "glass-shatter.wav", at: 0, gain: 0.95, pitch: 1.8,
        trimStart: 0.03, trimEnd: 0.09,
        env: [[0, 1], [0.03, 0.4], [0.06, 0.0001]] },
      { kind: "osc", wave: "sine", f: 300, fEnd: 232, glide: "exp", dur: 0.2, at: 0, gain: 0.75,
        env: [[0, 1], [0.06, 0.45], [0.196, 0.006], [0.2, 0.0001]],
        filter: { type: "highpass", f: 40, q: 0.7 } },
      { kind: "noise", color: "white", dur: 0.05, at: 0, gain: 0.35,
        env: [[0, 1], [0.05, 0.0001]],
        filter: { type: "bandpass", f: 4200, q: 1.8 } },
    ],
    reverb: { preset: "plate", send: 0 },
    master: { normalizeTo: -5 },
  },
];

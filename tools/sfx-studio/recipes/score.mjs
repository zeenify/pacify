/* Score family — chips, the multiplier mash, the award flight and the drain tick
   (spec §7.6, §7.7, §7.8, §7.19). Eleven assets.

   Rendered DRY; each `reverb` block matches the send the runtime applies from
   apps/web/src/lib/sfx-manifest.ts (the manifest is authoritative). */

/** @type {import("../render.mjs").Recipe[]} */
export const score = [
  {
    name: "score-chip-fly",
    family: "score",
    sampleRate: 44100,
    seed: 5001,
    // The most-reused asset in the game (spec §5.5). Two halves of the 600->2200->900Hz
    // band pass, crossfaded in amplitude across 120ms so the bend has no step: the
    // second noise layer opens as the first closes and both meet at 2200Hz. The sine
    // pair bends 220->440->260 the same way and meets at 440Hz. No pan: callers pan.
    layers: [
      { kind: "noise", color: "pink", dur: 0.80, at: 0, gain: 0.8,
        env: [[0, 0.10], [0.10, 1], [0.45, 0.95], [0.62, 0.72],
              [0.64, 0.62], [0.66, 0.44], [0.68, 0.26], [0.70, 0.12], [0.72, 0.04], [0.74, 0.0001]],
        filter: { type: "bandpass", f: 600, fEnd: 2200, q: 1.4 } },
      { kind: "noise", color: "pink", dur: 0.80, at: 0.62, gain: 0.8,
        env: [[0, 0.02], [0.02, 0.10], [0.04, 0.28], [0.06, 0.46], [0.08, 0.60], [0.10, 0.68], [0.12, 0.72],
              [0.34, 0.62], [0.56, 0.30], [0.72, 0.09], [0.79, 0.01], [0.80, 0.0001]],
        filter: { type: "bandpass", f: 2200, fEnd: 900, q: 1.4 } },
      { kind: "osc", wave: "sine", f: 220, fEnd: 440, glide: "exp", dur: 0.70, at: 0, gain: 0.22,
        env: [[0, 0.15], [0.12, 1], [0.50, 0.90], [0.62, 0.65], [0.70, 0.0001]] },
      { kind: "osc", wave: "sine", f: 440, fEnd: 260, glide: "exp", dur: 0.78, at: 0.62, gain: 0.22,
        env: [[0, 0.05], [0.02, 0.20], [0.06, 0.40], [0.10, 0.55], [0.16, 0.62],
              [0.32, 0.50], [0.50, 0.28], [0.66, 0.10], [0.76, 0.02], [0.78, 0.0001]] },
    ],
    reverb: { preset: "hall", send: 0 },
    master: { normalizeTo: -6 },
  },
  {
    name: "score-chip-pop",
    family: "score",
    sampleRate: 44100,
    seed: 5002,
    // dEsChipPop. A chip materialising: 15ms of 1400Hz, a 700Hz triangle for body, and
    // a 5ms tick so the onset reads. Bright and small — callers pitch it 0.96-1.08.
    layers: [
      { kind: "osc", wave: "sine", f: 1400, dur: 0.015, at: 0, gain: 0.7,
        env: [[0, 1], [0.015, 0.0001]] },
      { kind: "osc", wave: "tri", f: 700, dur: 0.08, at: 0, gain: 0.55,
        env: [[0, 1], [0.03, 0.4], [0.08, 0.0001]] },
      { kind: "noise", color: "white", dur: 0.005, at: 0, gain: 0.5,
        env: [[0, 1], [0.005, 0.0001]], filter: { type: "bandpass", f: 4200, q: 1.5 } },
    ],
    master: { normalizeTo: -6 },
  },
  {
    name: "score-chip-land",
    family: "score",
    sampleRate: 44100,
    seed: 5003,
    // The chip taking its seat: a soft double 520 then 390Hz, lowpassed at 2kHz. The
    // first note decays only to 22% before the second enters, so the pair reads as one
    // settle rather than two taps.
    layers: [
      { kind: "osc", wave: "sine", f: 520, dur: 0.06, at: 0, gain: 0.7,
        env: [[0, 1], [0.03, 0.5], [0.06, 0.22]] },
      { kind: "osc", wave: "sine", f: 390, dur: 0.10, at: 0.055, gain: 0.75,
        env: [[0, 0.7], [0.02, 0.9], [0.05, 0.6], [0.10, 0.0001]],
        filter: { type: "lowpass", f: 2000, q: 0.7 } },
      { kind: "noise", color: "white", dur: 0.02, at: 0, gain: 0.15,
        env: [[0, 1], [0.02, 0.0001]], filter: { type: "lowpass", f: 1200, q: 0.8 } },
    ],
    master: { normalizeTo: -6 },
  },
  {
    name: "score-chip-death",
    family: "score",
    sampleRate: 44100,
    seed: 5004,
    // dChipDeath 650ms. An echo chip expiring unused: 660->180Hz falling over 500ms with
    // a lowpassed sigh under it. Quiet, sad, and dry — an unused chip has no room tone.
    layers: [
      { kind: "osc", wave: "sine", f: 660, fEnd: 180, glide: "exp", dur: 0.52, at: 0, gain: 0.8,
        env: [[0, 0.6], [0.02, 1], [0.20, 0.45], [0.40, 0.15], [0.52, 0.0001]],
        filter: { type: "highpass", f: 40, q: 0.7 } },
      { kind: "noise", color: "pink", dur: 0.55, at: 0, gain: 0.35,
        env: [[0, 0.1], [0.05, 0.8], [0.30, 0.35], [0.55, 0.0001]],
        filter: { type: "lowpass", f: 900, q: 0.9 } },
    ],
    master: { normalizeTo: -8 },
  },
  {
    name: "score-chip-shielddeath",
    family: "score",
    sampleRate: 44100,
    seed: 5005,
    // dShieldDeathL/R. The shield halves blasting apart: two 20ms noise bursts 20ms
    // apart, a 90Hz body thud, and one glass fragment at pitch 1.6 (24ms) clipped from
    // its attack — the manifest hard-pans the halves, so this stays mono.
    layers: [
      { kind: "noise", color: "white", dur: 0.16, at: 0, gain: 0.7,
        env: [[0, 1], [0.02, 0.8], [0.16, 0.0001]],
        filter: { type: "bandpass", f: 2200, fEnd: 900, q: 1.2 } },
      { kind: "noise", color: "white", dur: 0.16, at: 0.02, gain: 0.6,
        env: [[0, 1], [0.02, 0.8], [0.16, 0.0001]],
        filter: { type: "bandpass", f: 3000, fEnd: 1200, q: 1.2 } },
      { kind: "osc", wave: "sine", f: 90, fEnd: 55, glide: "exp", dur: 0.22, at: 0, gain: 0.8,
        env: [[0, 1], [0.22, 0.0001]], filter: { type: "highpass", f: 40, q: 0.7 } },
      { kind: "sample", src: "glass-shatter.wav", at: 0.01, gain: 0.35, pitch: 1.6,
        trimStart: 0.03, trimEnd: 0.09,
        env: [[0, 1], [0.037, 0.0001]] },
    ],
    master: { normalizeTo: -4 },
  },
  {
    name: "score-chip-slide",
    family: "score",
    sampleRate: 44100,
    seed: 5006,
    // Corner-rack reflow. Nearly inaudible by design (normalise -20, manifest gain 0.40)
    // and on an 80ms cooldown, so it cannot pile up: a 12ms 3kHz tick plus a 40ms 900Hz.
    layers: [
      { kind: "noise", color: "white", dur: 0.012, at: 0, gain: 0.6,
        env: [[0, 1], [0.012, 0.0001]], filter: { type: "bandpass", f: 3000, q: 1.4 } },
      { kind: "osc", wave: "sine", f: 900, dur: 0.04, at: 0, gain: 0.6,
        env: [[0, 1], [0.04, 0.0001]] },
    ],
    master: { normalizeTo: -20 },
  },
  {
    name: "score-mult-charge",
    family: "score",
    sampleRate: 44100,
    seed: 5007,
    // dMultDouble @1500. The mash charging to xN: a saw climbing 110->440Hz through a
    // lowpass that opens 300->4000Hz, plus a noise swell rising with it. Deliberately
    // unresolved — score-mult-impact is the resolution, so this fades instead of landing.
    layers: [
      { kind: "osc", wave: "saw", f: 110, fEnd: 440, glide: "exp", dur: 1.4, at: 0, gain: 0.45,
        env: [[0, 0.05], [0.25, 0.35], [0.9, 0.75], [1.25, 0.95], [1.36, 0.6], [1.4, 0.0001]],
        filter: { type: "lowpass", f: 300, fEnd: 4000, q: 1.1 } },
      { kind: "noise", color: "pink", dur: 1.4, at: 0, gain: 0.55,
        env: [[0, 0.02], [0.3, 0.25], [1.0, 0.65], [1.28, 0.9], [1.4, 0.0001]],
        filter: { type: "bandpass", f: 500, fEnd: 3200, q: 1.1 } },
      { kind: "osc", wave: "sine", f: 55, fEnd: 110, glide: "exp", dur: 1.4, at: 0, gain: 0.3,
        env: [[0, 0.2], [0.9, 0.6], [1.3, 0.8], [1.4, 0.0001]],
        filter: { type: "highpass", f: 40, q: 0.7 } },
    ],
    reverb: { preset: "hall", send: 0 },
    master: { normalizeTo: -5 },
  },
  {
    name: "score-mult-impact",
    family: "score",
    sampleRate: 44100,
    seed: 5008,
    // dMultImpact @1500 + the ring + the final number. The resolution the riser promised:
    // a 90->45Hz slam, the clang at 1.1 for the plate, and a 523/1046/1568 bell on top.
    // Hall 0.20 documents the manifest's 0.30 send; -2 because it is the loudest chip beat.
    layers: [
      { kind: "osc", wave: "sine", f: 90, fEnd: 45, glide: "exp", dur: 0.35, at: 0, gain: 0.95,
        env: [[0, 1], [0.35, 0.0001]], filter: { type: "highpass", f: 40, q: 0.7 } },
      { kind: "sample", src: "metal-clang.wav", at: 0, gain: 0.55, pitch: 1.1, trimEnd: 0.45,
        env: [[0, 1], [0.06, 0.5], [0.3, 0.06], [0.405, 0.004], [0.409, 0.0001]],
        filter: { type: "lowpass", f: 7000, q: 0.7 } },
      { kind: "osc", wave: "sine", f: 523, dur: 0.6, at: 0.01, gain: 0.4,
        env: [[0, 1], [0.2, 0.35], [0.596, 0.005], [0.6, 0.0001]] },
      { kind: "osc", wave: "sine", f: 1046, dur: 0.5, at: 0.01, gain: 0.26,
        env: [[0, 1], [0.2, 0.3], [0.496, 0.005], [0.5, 0.0001]] },
      { kind: "osc", wave: "sine", f: 1568, dur: 0.38, at: 0.01, gain: 0.16,
        env: [[0, 1], [0.16, 0.28], [0.376, 0.004], [0.38, 0.0001]] },
    ],
    reverb: { preset: "hall", send: 0.3 },
    master: { normalizeTo: -2 },
  },
  {
    name: "score-award-fly",
    family: "score",
    sampleRate: 44100,
    seed: 5009,
    // dFlyYou / dFlyKlein 1.3s. A lighter cousin of chip-fly: no bend return, just a band
    // pass climbing 900->1800Hz over 1.2s with a fifth 440->660Hz under it. Callers pan
    // it +-0.4, so it is mono and narrow.
    layers: [
      { kind: "noise", color: "pink", dur: 1.2, at: 0, gain: 0.7,
        env: [[0, 0.06], [0.12, 0.85], [0.9, 1], [1.1, 0.5], [1.2, 0.0001]],
        filter: { type: "bandpass", f: 900, fEnd: 1800, q: 1.6 } },
      { kind: "osc", wave: "sine", f: 440, fEnd: 660, glide: "exp", dur: 1.2, at: 0, gain: 0.25,
        env: [[0, 0.2], [0.15, 0.9], [0.9, 0.85], [1.12, 0.3], [1.2, 0.0001]] },
    ],
    reverb: { preset: "hall", send: 0 },
    master: { normalizeTo: -6 },
  },
  {
    name: "score-award-land",
    family: "score",
    sampleRate: 44100,
    seed: 5010,
    // The chip ding as the score lands — the most satisfying small sound in the game.
    // A clean 1046/1568/2093 bell (a C6 major triad) decaying over 350ms. The brief asked
    // for hall 0.2; the manifest declares the cue dry, so send 0 is recorded here.
    layers: [
      { kind: "osc", wave: "sine", f: 1046, dur: 0.35, at: 0, gain: 0.55,
        env: [[0, 1], [0.12, 0.32], [0.346, 0.004], [0.35, 0.0001]] },
      { kind: "osc", wave: "sine", f: 1568, dur: 0.3, at: 0, gain: 0.4,
        env: [[0, 1], [0.10, 0.30], [0.296, 0.004], [0.3, 0.0001]] },
      { kind: "osc", wave: "sine", f: 2093, dur: 0.2, at: 0, gain: 0.28,
        env: [[0, 1], [0.06, 0.26], [0.196, 0.003], [0.2, 0.0001]] },
      { kind: "noise", color: "white", dur: 0.006, at: 0, gain: 0.18,
        env: [[0, 1], [0.006, 0.0001]], filter: { type: "bandpass", f: 5000, q: 1.2 } },
    ],
    reverb: { preset: "hall", send: 0 },
    master: { normalizeTo: -3 },
  },
  {
    name: "score-drain-tick",
    family: "score",
    sampleRate: 44100,
    seed: 5011,
    // Fires up to 14x at 90ms spacing and callers pitch it 0.95-1.05: it must stay a
    // click, never a buzz. 6ms of 2.5kHz noise plus a 40ms 500Hz body, normalised -12.
    layers: [
      { kind: "noise", color: "white", dur: 0.006, at: 0, gain: 0.8,
        env: [[0, 1], [0.006, 0.0001]], filter: { type: "bandpass", f: 2500, q: 1.8 } },
      { kind: "osc", wave: "sine", f: 500, dur: 0.04, at: 0, gain: 0.55,
        env: [[0, 1], [0.012, 0.35], [0.04, 0.0001]] },
    ],
    reverb: { preset: "hall", send: 0 },
    master: { normalizeTo: -12 },
  },
];

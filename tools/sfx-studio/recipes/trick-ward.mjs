/* WARD family — the ritual bell, then real fire (spec §2).

   Rendered DRY. `reverb` documents the manifest send. `trick-ward-fire` is the only
   looping asset in the game and the only one whose design is a constraint rather
   than a gesture: no attack, no decay, constant RMS, and a seam that survives being
   concatenated. See the crossfade note on that recipe. */

/** @type {import("../render.mjs").Recipe[]} */
export const trickWard = [
  {
    name: "trick-ward-seal",
    family: "trick-ward",
    sampleRate: 44100,
    seed: 8001,
    // dWardSealSlam 720ms @180. A ritual gong, not a hit: the clang pitched 0.5 is only
    // the shimmer on top; the 98Hz fundamental and the 294/487/761 partials are the bell.
    // The partials are deliberately inharmonic, which is what makes it read as ritual.
    layers: [
      { kind: "sample", src: "metal-clang.wav", at: 0, gain: 0.5, pitch: 0.5, trimEnd: 0.45,
        env: [[0, 1], [0.08, 0.55], [0.45, 0.2], [0.7, 0.03], [0.72, 0.0001]],
        filter: { type: "lowpass", f: 5000, q: 0.7 } },
      { kind: "osc", wave: "sine", f: 98, dur: 0.78, at: 0, gain: 0.85,
        env: [[0, 1], [0.22, 0.45], [0.7, 0.03], [0.78, 0.0001]],
        filter: { type: "highpass", f: 40, q: 0.7 } },
      { kind: "osc", wave: "sine", f: 294, dur: 0.72, at: 0, gain: 0.3,
        env: [[0, 1], [0.25, 0.35], [0.72, 0.0001]] },
      { kind: "osc", wave: "sine", f: 487, dur: 0.66, at: 0, gain: 0.2,
        env: [[0, 1], [0.25, 0.3], [0.66, 0.0001]] },
      { kind: "osc", wave: "sine", f: 761, dur: 0.6, at: 0, gain: 0.14,
        env: [[0, 1], [0.25, 0.28], [0.6, 0.0001]] },
    ],
    reverb: { preset: "hall", send: 0.35 },
    master: { normalizeTo: -4 },
  },
  {
    name: "trick-ward-eye",
    family: "trick-ward",
    sampleRate: 44100,
    seed: 8002,
    // The watcher opening (dWdEyeOpen 620 @500) + iris dart. Wet and organic: noise
    // sliding 400->2400Hz while a 1200->1800Hz sine rides above it. No impact, no
    // low end — unsettling because nothing lands.
    layers: [
      { kind: "noise", color: "pink", dur: 0.5, at: 0.02, gain: 0.75,
        env: [[0, 0.08], [0.1, 0.5], [0.4, 0.8], [0.5, 0.0001]],
        filter: { type: "bandpass", f: 400, fEnd: 2400, q: 1.4 } },
      { kind: "osc", wave: "sine", f: 1200, fEnd: 1800, glide: "lin", dur: 0.5, at: 0.04, gain: 0.35,
        env: [[0, 0.05], [0.15, 0.6], [0.46, 0.9], [0.5, 0.0001]] },
      { kind: "osc", wave: "sine", f: 300, dur: 0.2, at: 0, gain: 0.4,
        env: [[0, 1], [0.06, 0.4], [0.196, 0.006], [0.2, 0.0001]],
        filter: { type: "highpass", f: 40, q: 0.7 } },
    ],
    reverb: { preset: "hall", send: 0.3 },
    master: { normalizeTo: -6 },
  },
  {
    name: "trick-ward-projectile",
    family: "trick-ward",
    sampleRate: 44100,
    seed: 8003,
    // dWardProjectileDown/Up 620 @650. A doppler PASS, so the tone has to sweep and
    // arrive: 800->200Hz over 500ms with the noise band making the same descent. Dry
    // because a projectile is close to the ear.
    layers: [
      { kind: "osc", wave: "sine", f: 800, fEnd: 200, glide: "exp", dur: 0.5, at: 0, gain: 0.8,
        env: [[0, 0.85], [0.04, 1], [0.3, 0.45], [0.5, 0.25]] },
      { kind: "noise", color: "white", dur: 0.5, at: 0, gain: 0.45,
        env: [[0, 0.7], [0.05, 1], [0.3, 0.4], [0.5, 0.2]],
        filter: { type: "bandpass", f: 1800, fEnd: 350, q: 1.5 } },
      { kind: "osc", wave: "sine", f: 180, fEnd: 60, glide: "exp", dur: 0.5, at: 0, gain: 0.3,
        env: [[0, 0.8], [0.4, 0.5], [0.5, 0.3]],
        filter: { type: "highpass", f: 40, q: 0.7 } },
    ],
    reverb: { preset: "plate", send: 0 },
    master: { normalizeTo: -5 },
  },
  {
    name: "trick-ward-flare",
    family: "trick-ward",
    sampleRate: 44100,
    seed: 8004,
    // dWdEyeFlare @800. Bright flash: a 15ms 6kHz spark, then the 2640Hz ring it leaves
    // behind. Short and dry — it is punctuation between the eye and the impact.
    layers: [
      { kind: "noise", color: "white", dur: 0.015, at: 0, gain: 0.9,
        env: [[0, 1], [0.015, 0.0001]],
        filter: { type: "bandpass", f: 6000, q: 1.4 } },
      { kind: "osc", wave: "sine", f: 2640, dur: 0.25, at: 0, gain: 0.55,
        env: [[0, 1], [0.06, 0.4], [0.246, 0.005], [0.25, 0.0001]] },
      { kind: "osc", wave: "sine", f: 1320, dur: 0.18, at: 0, gain: 0.25,
        env: [[0, 1], [0.06, 0.3], [0.18, 0.0001]] },
    ],
    reverb: { preset: "plate", send: 0 },
    master: { normalizeTo: -5 },
  },
  {
    name: "trick-ward-impact",
    family: "trick-ward",
    sampleRate: 44100,
    seed: 8005,
    // dWardImpact @1100. The block landing: clang at 0.9 for the metal, a 130Hz sine for
    // the mass, and a three-partial bell (620/940/1470) so the hit keeps singing.
    // Normalised to -2 — this is the loudest beat in the family.
    layers: [
      { kind: "sample", src: "metal-clang.wav", at: 0, gain: 0.9, pitch: 0.9, trimEnd: 0.5,
        env: [[0, 1], [0.09, 0.5], [0.5, 0.12], [0.78, 0.01], [0.8, 0.0001]],
        filter: { type: "lowpass", f: 7000, q: 0.7 } },
      { kind: "osc", wave: "sine", f: 130, fEnd: 96, glide: "exp", dur: 0.3, at: 0, gain: 0.8,
        env: [[0, 1], [0.3, 0.0001]],
        filter: { type: "highpass", f: 40, q: 0.7 } },
      { kind: "osc", wave: "sine", f: 620, dur: 0.7, at: 0, gain: 0.3,
        env: [[0, 1], [0.2, 0.3], [0.7, 0.0001]] },
      { kind: "osc", wave: "sine", f: 940, dur: 0.62, at: 0, gain: 0.2,
        env: [[0, 1], [0.2, 0.25], [0.62, 0.0001]] },
      { kind: "osc", wave: "sine", f: 1470, dur: 0.55, at: 0, gain: 0.12,
        env: [[0, 1], [0.2, 0.2], [0.55, 0.0001]] },
    ],
    reverb: { preset: "hall", send: 0.3 },
    master: { normalizeTo: -2 },
  },
  {
    name: "trick-ward-fire",
    family: "trick-ward",
    sampleRate: 44100,
    seed: 8006,
    // THE ONLY LOOP IN THE GAME. 2200ms of fire-crackle [3.78s, 5.98s] — the window whose
    // first 6ms, last 6ms and body measure 0.0534 / 0.0536 / 0.0519 RMS after the same
    // bandpass, so the two wrap points sit on equally dense fire instead of a lull. The seam is a 250ms
    // equal-power crossfade written as two layers, because a recipe has no crossfade
    // op: layer A is the whole window fading OUT over its last 250ms, layer B is the
    // first 250ms of the loop faded IN over the same span, ending exactly on the buffer
    // end. So the final samples are the head at unity and the first samples are the
    // body at unity: RMS is flat across BOTH wrap points, which is what the loop check
    // measures. Envelope points are sin/cos of a quarter wave (down = cos, up = sin),
    // so the uncorrelated sum holds power rather than dipping 3dB like a linear fade.
    // Band: a single wide bandpass (center 1100Hz, q 0.3 ~ 300-4000Hz window) — the
    // renderer allows one filter per layer, and q 0.3 is the closest single-stage
    // equivalent of the 300-4000Hz band. The 90Hz brown bed is the body under it.
    // No attack, no decay, constant gain: this file is only ever looped.
    layers: [
      { kind: "sample", src: "fire-crackle.wav", at: 0, gain: 1, trimStart: 3.78, trimEnd: 5.98,
        env: [[0, 1], [1.95, 1], [1.98125, 0.9808], [2.0125, 0.9239], [2.04375, 0.8315],
              [2.075, 0.7071], [2.10625, 0.5556], [2.1375, 0.3827], [2.16875, 0.1951], [2.2, 0.0001]],
        filter: { type: "bandpass", f: 1100, q: 0.3 } },
      { kind: "sample", src: "fire-crackle.wav", at: 1.95, gain: 1, trimStart: 3.78, trimEnd: 4.03,
        env: [[0, 0.0001], [0.03125, 0.1951], [0.0625, 0.3827], [0.09375, 0.5556],
              [0.125, 0.7071], [0.15625, 0.8315], [0.1875, 0.9239], [0.21875, 0.9808], [0.25, 1]],
        filter: { type: "bandpass", f: 1100, q: 0.3 } },
      { kind: "noise", color: "brown", dur: 2.2, at: 0, gain: 0.5,
        env: [[0, 1], [2.2, 1]],
        filter: { type: "lowpass", f: 90, q: 0.8 } },
    ],
    reverb: { preset: "plate", send: 0 },
    master: { normalizeTo: -6 },
  },
  {
    name: "trick-ward-ash",
    family: "trick-ward",
    sampleRate: 44100,
    seed: 8007,
    // dWdAshIn @4700. The aftermath, and it must be quieter than the fire that precedes
    // it: air above 2.5kHz settling for 500ms over one soft 90Hz thud. Normalised to -9
    // and the manifest takes it to 0.70 — it is a shadow, not a beat.
    layers: [
      { kind: "noise", color: "white", dur: 0.5, at: 0, gain: 0.6,
        env: [[0, 1], [0.08, 0.55], [0.3, 0.18], [0.5, 0.0001]],
        filter: { type: "highpass", f: 2500, q: 0.8 } },
      { kind: "osc", wave: "sine", f: 90, fEnd: 62, glide: "exp", dur: 0.34, at: 0, gain: 0.7,
        env: [[0, 0.7], [0.06, 1], [0.34, 0.0001]],
        filter: { type: "highpass", f: 40, q: 0.7 } },
      { kind: "noise", color: "pink", dur: 0.45, at: 0.02, gain: 0.15,
        env: [[0, 0.5], [0.45, 0.0001]],
        filter: { type: "bandpass", f: 3800, q: 1 } },
    ],
    reverb: { preset: "plate", send: 0 },
    master: { normalizeTo: -9 },
  },
];

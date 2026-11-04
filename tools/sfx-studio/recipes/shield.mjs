/* Shield-break family — the crimson shield arriving, the chip cracks, and the full
   collapse (spec §7.3). Three assets.

   Rendered DRY; each `reverb` block matches the send the runtime applies from
   apps/web/src/lib/sfx-manifest.ts. */

/** @type {import("../render.mjs").Recipe[]} */
export const shield = [
  {
    name: "trick-shieldbreak-slam",
    family: "shield",
    sampleRate: 44100,
    seed: 4101,
    // dShieldSlam 460ms — the crimson shield landing. Heavy: a 70->42Hz sine is the
    // mass, the clang dropped to 0.55 is the plate, a 90ms band at 900Hz the impact.
    layers: [
      { kind: "osc", wave: "sine", f: 70, fEnd: 42, glide: "exp", dur: 0.3, at: 0, gain: 0.95,
        env: [[0, 1], [0.3, 0.0001]] },
      { kind: "sample", src: "metal-clang.wav", at: 0, gain: 0.8, pitch: 0.55, trimEnd: 0.45,
        env: [[0, 1], [0.1, 0.55], [0.5, 0.03], [0.815, 0.004], [0.818, 0.0001]],
        filter: { type: "lowpass", f: 4500, q: 0.7 } },
      { kind: "noise", color: "white", dur: 0.09, at: 0, gain: 0.6,
        env: [[0, 1], [0.09, 0.0001]],
        filter: { type: "bandpass", f: 900, q: 1 } },
    ],
    reverb: { preset: "hall", send: 0.3 },
    master: { normalizeTo: -2 },
  },
  {
    name: "trick-shieldbreak-crack",
    family: "shield",
    sampleRate: 44100,
    seed: 4102,
    // Called 3x at 950/1100/1250 with pitch 0.95/1.03/1.12, and reused as the ECLIPSE
    // chip crack — so it must be ONE fracture, never a shatter: 15ms of glass clipped
    // from its attack at pitch 1.4 (10.7ms), a 60ms 4kHz snap, a 2.6kHz tink.
    layers: [
      { kind: "sample", src: "glass-shatter.wav", at: 0, gain: 1, pitch: 1.4,
        trimStart: 0.03, trimEnd: 0.045,
        env: [[0, 1], [0.012, 0.0001]] },
      { kind: "noise", color: "white", dur: 0.06, at: 0, gain: 0.8,
        env: [[0, 1], [0.008, 0.7], [0.06, 0.0025]],
        filter: { type: "highpass", f: 4000, q: 0.9 } },
      { kind: "osc", wave: "sine", f: 2600, dur: 0.02, at: 0, gain: 0.3,
        env: [[0, 1], [0.02, 0.0001]] },
    ],
    master: { normalizeTo: -7 },
  },
  {
    name: "trick-shieldbreak-shatter",
    family: "shield",
    sampleRate: 44100,
    seed: 4103,
    // dShieldBreak @1350 + 8 shards: the whole collapse. trimStart 30ms lands the
    // sourced break on its attack (peak 39ms), the 60Hz body carries the floor and a
    // 300ms 6kHz spray is the spray of glass. Loudest cue in the shield family.
    layers: [
      { kind: "sample", src: "glass-shatter.wav", at: 0, gain: 0.95, pitch: 1,
        trimStart: 0.03, trimEnd: 1.03,
        env: [[0, 1], [0.1, 0.65], [0.7, 0.03], [0.995, 0.004], [1, 0.0001]],
        filter: { type: "highpass", f: 120, q: 0.7 } },
      { kind: "osc", wave: "sine", f: 60, fEnd: 40, glide: "exp", dur: 0.45, at: 0, gain: 0.8,
        env: [[0, 1], [0.45, 0.0001]] },
      { kind: "noise", color: "white", dur: 0.3, at: 0, gain: 0.45,
        env: [[0, 1], [0.02, 0.7], [0.3, 0.0001]],
        filter: { type: "bandpass", f: 6000, q: 0.8 } },
    ],
    reverb: { preset: "hall", send: 0.35 },
    master: { normalizeTo: -2 },
  },
];

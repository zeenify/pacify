/* ECHO family — three assets: pitch-delay doubling, short plate (spec §2).

   Rendered DRY. `reverb` documents the manifest send; the runtime convolves it.
   The audio renderer has no delay-line layer kind, so the doubling is written out
   explicitly: each repeated hit is the same material carrying a `pitch` of 2/3 and
   then 4/9 (a fifth, then a fifth again), which is musical where a slapback is not. */

/** @type {import("../render.mjs").Recipe[]} */
export const trickEcho = [
  {
    name: "trick-echo-shock",
    family: "trick-echo",
    sampleRate: 44100,
    seed: 6001,
    // dEchoShockfield 1500ms. One impact, then the SAME material at 120ms pitched 2/3
    // at 0.6, then again at 260ms pitched 4/9 at 0.35 — a fifth down each time, so the
    // repeats spell an interval instead of a slap. Higher partials on the copies are
    // thinned by their gain so the stack decays into the room.
    layers: [
      { kind: "noise", color: "white", dur: 0.06, at: 0, gain: 0.85,
        env: [[0, 1], [0.014, 0.7], [0.06, 0.0001]],
        filter: { type: "bandpass", f: 1800, q: 1.2 } },
      { kind: "osc", wave: "sine", f: 220, fEnd: 196, glide: "exp", dur: 0.1, at: 0, gain: 0.9,
        env: [[0, 1], [0.1, 0.0001]], filter: { type: "highpass", f: 40, q: 0.7 } },
      { kind: "osc", wave: "sine", f: 110, dur: 0.14, at: 0, gain: 0.55,
        env: [[0, 1], [0.14, 0.0001]], filter: { type: "highpass", f: 40, q: 0.7 } },

      // first echo — 120ms, pitched 2/3
      { kind: "noise", color: "white", dur: 0.09, at: 0.12, gain: 0.5,
        env: [[0, 1], [0.09, 0.0001]],
        filter: { type: "bandpass", f: 1200, q: 1.2 } },
      { kind: "osc", wave: "sine", f: 220, fEnd: 196, glide: "exp", dur: 0.1, at: 0.12, gain: 0.55, pitch: 0.667,
        env: [[0, 1], [0.1, 0.0001]], filter: { type: "highpass", f: 40, q: 0.7 } },
      { kind: "osc", wave: "sine", f: 110, dur: 0.14, at: 0.12, gain: 0.32, pitch: 0.667,
        env: [[0, 1], [0.14, 0.0001]], filter: { type: "highpass", f: 40, q: 0.7 } },

      // second echo — 260ms, pitched 4/9, thin and dark
      { kind: "noise", color: "white", dur: 0.11, at: 0.26, gain: 0.28,
        env: [[0, 1], [0.11, 0.0001]],
        filter: { type: "bandpass", f: 850, q: 1.2 } },
      { kind: "osc", wave: "sine", f: 220, fEnd: 196, glide: "exp", dur: 0.1, at: 0.26, gain: 0.3, pitch: 0.444,
        env: [[0, 1], [0.1, 0.0001]], filter: { type: "highpass", f: 40, q: 0.7 } },
      { kind: "osc", wave: "sine", f: 110, dur: 0.14, at: 0.26, gain: 0.18, pitch: 0.444,
        env: [[0, 1], [0.14, 0.0001]], filter: { type: "highpass", f: 40, q: 0.7 } },

      { kind: "silence", dur: 0.6, at: 0.42 },
    ],
    reverb: { preset: "hall", send: 0.2 },
    master: { normalizeTo: -4 },
  },
  {
    name: "trick-echo-ring",
    family: "trick-echo",
    sampleRate: 44100,
    seed: 6002,
    // Called 3x at 120/250/380 with pitch 1.0 / 0.8 / 0.667, so this one cue carries the
    // whole figure. 880 + 1320 + 1760 exp-decaying 400ms inside a q2 bandpass: hollow,
    // and still clean transposed down a fifth, which is why there is no bright content.
    layers: [
      { kind: "osc", wave: "sine", f: 880, dur: 0.4, at: 0, gain: 0.7,
        env: [[0, 1], [0.12, 0.5], [0.396, 0.005], [0.4, 0.0001]],
        filter: { type: "bandpass", f: 1100, q: 2 } },
      { kind: "osc", wave: "sine", f: 1320, dur: 0.4, at: 0, gain: 0.45,
        env: [[0, 1], [0.12, 0.45], [0.396, 0.005], [0.4, 0.0001]],
        filter: { type: "bandpass", f: 1500, q: 2 } },
      { kind: "osc", wave: "sine", f: 1760, dur: 0.3, at: 0, gain: 0.2,
        env: [[0, 1], [0.3, 0.0001]],
        filter: { type: "bandpass", f: 1800, q: 2 } },
      { kind: "noise", color: "white", dur: 0.02, at: 0, gain: 0.25,
        env: [[0, 1], [0.02, 0.0001]],
        filter: { type: "bandpass", f: 2600, q: 1.6 } },
    ],
    reverb: { preset: "plate", send: 0.25 },
    master: { normalizeTo: -5 },
  },
  {
    name: "trick-echo-ghost",
    family: "trick-echo",
    sampleRate: 44100,
    seed: 6003,
    // The afterimages (dEchoAfterimage @420+). Reversed envelope: the sine climbs from
    // nothing and is cut at its loudest, with the lowpass sweeping 400->3000Hz so the
    // timbre opens as it swells. No transient anywhere — that is the ghost.
    layers: [
      { kind: "osc", wave: "sine", f: 660, dur: 0.55, at: 0, gain: 0.7,
        env: [[0, 0.002], [0.2, 0.08], [0.42, 0.35], [0.55, 1]],
        filter: { type: "lowpass", f: 400, fEnd: 3000, q: 0.9 } },
      { kind: "osc", wave: "sine", f: 990, dur: 0.55, at: 0, gain: 0.3,
        env: [[0, 0.002], [0.3, 0.1], [0.55, 1]],
        filter: { type: "lowpass", f: 600, fEnd: 3200, q: 0.9 } },
      { kind: "noise", color: "pink", dur: 0.55, at: 0, gain: 0.22,
        env: [[0, 0.002], [0.25, 0.1], [0.55, 1]],
        filter: { type: "bandpass", f: 500, fEnd: 2800, q: 1.1 } },
    ],
    reverb: { preset: "plate", send: 0 },
    master: { normalizeTo: -7 },
  },
];

/* Table family — the duel board itself: match open, commit phase, and the two
   diegetic Klein cues. See spec §7.20. */

/** @type {import("../render.mjs").Recipe[]} */
export const table = [
  {
    name: "duel-intro-slam",
    family: "table",
    sampleRate: 44100,
    seed: 3002,
    // The curtain-raiser: "DUEL START" hits the screen. A sub-drop carries the weight,
    // the clang carries the metal of the title plate, the noise burst is the impact.
    // Normalised hot (-2) because nothing else is playing over it.
    layers: [
      { kind: "osc", wave: "sine", f: 90, fEnd: 35, glide: "exp", dur: 0.7, at: 0, gain: 0.95,
        env: [[0, 1], [0.7, 0.0001]] },
      { kind: "sample", src: "metal-clang.wav", at: 0, gain: 0.5, pitch: 0.8, trimEnd: 0.8,
        env: [[0, 1], [0.16, 0.35], [0.6, 0.02], [0.8, 0.0001]],
        filter: { type: "lowpass", f: 6000, q: 0.7 } },
      { kind: "noise", color: "white", dur: 0.07, at: 0, gain: 0.5,
        env: [[0, 1], [0.07, 0.0001]], filter: { type: "lowpass", f: 3500, q: 0.7 } },
    ],
    reverb: { preset: "hall", send: 0.2 },
    master: { normalizeTo: -2 },
  },
  {
    name: "duel-intro-panel",
    family: "table",
    sampleRate: 44100,
    seed: 3003,
    // The red panel wiping across the table. A rising bandpass sweep is the motion;
    // no reverb is declared because a wipe has no body to reverberate.
    layers: [
      { kind: "noise", color: "pink", dur: 0.42, at: 0, gain: 0.75,
        env: [[0, 0.15], [0.1, 1], [0.42, 0.0001]],
        filter: { type: "bandpass", f: 400, fEnd: 3000, q: 2.2 } },
      { kind: "osc", wave: "sine", f: 160, fEnd: 520, glide: "exp", dur: 0.42, at: 0, gain: 0.18,
        env: [[0, 0.2], [0.12, 1], [0.42, 0.0001]] },
    ],
    master: { normalizeTo: -3 },
  },
  {
    name: "duel-deal",
    family: "table",
    sampleRate: 44100,
    seed: 3001,
    // Called seven times at 55ms stagger with pitch 0.95-1.08 (spec §7.20), so it must
    // stay clean under pitch shift: short, bright, no long tail to smear.
    layers: [
      // trimStart 66ms: card-flick has no content before 67ms and peaks at 70ms, so the
      // flick is shifted to :00 or every deal lands 70ms after the card starts to fly.
      { kind: "sample", src: "card-flick.wav", at: 0, gain: 0.9, trimStart: 0.066,
        env: [[0, 1], [0.14, 0]], filter: { type: "highpass", f: 300, q: 0.7 } },
      { kind: "noise", color: "white", dur: 0.12, at: 0, gain: 0.35,
        env: [[0, 1], [0.12, 0]], filter: { type: "highpass", f: 2000, q: 0.8 } },
    ],
    master: { normalizeTo: -8 },
  },
  {
    name: "duel-pick",
    family: "table",
    sampleRate: 44100,
    seed: 3004,
    // A card being committed to the felt. The 140->70Hz thud is the weight the bare
    // playCardPop() never had; the flick and snap keep the card identity readably
    // the same sound it replaces.
    layers: [
      { kind: "osc", wave: "sine", f: 140, fEnd: 70, glide: "exp", dur: 0.22, at: 0, gain: 0.9,
        env: [[0, 1], [0.22, 0.0001]] },
      { kind: "sample", src: "card-flick.wav", at: 0, gain: 0.55, pitch: 1.1, trimStart: 0.066, trimEnd: 0.3,
        env: [[0, 1], [0.1, 0.4], [0.25, 0.0001]],
        filter: { type: "highpass", f: 260, q: 0.7 } },
      { kind: "noise", color: "white", dur: 0.06, at: 0, gain: 0.35,
        env: [[0, 1], [0.06, 0.0001]], filter: { type: "bandpass", f: 2600, q: 1.4 } },
    ],
    master: { normalizeTo: -3 },
  },
  {
    name: "duel-table-impact",
    family: "table",
    sampleRate: 44100,
    seed: 3005,
    // The table shakes (dImpact, 380ms). A low wood knock is what a table IS: the
    // sourced hit dropped to 0.7 for size, an 80Hz sine under it for the sub, and a
    // 30ms crack for the moment the surface takes the blow.
    layers: [
      { kind: "sample", src: "wood-hit.wav", at: 0, gain: 0.9, pitch: 0.7, trimEnd: 0.45,
        env: [[0, 1], [0.12, 0.45], [0.4, 0.0001]],
        filter: { type: "lowpass", f: 2600, q: 0.8 } },
      { kind: "osc", wave: "sine", f: 80, fEnd: 55, glide: "exp", dur: 0.2, at: 0, gain: 0.8,
        env: [[0, 1], [0.2, 0.0001]] },
      { kind: "noise", color: "white", dur: 0.03, at: 0, gain: 0.4,
        env: [[0, 1], [0.03, 0.0001]], filter: { type: "bandpass", f: 1400, q: 1.0 } },
    ],
    reverb: { preset: "hall", send: 0.25 },
    master: { normalizeTo: -3 },
  },
  {
    name: "duel-lunge",
    family: "table",
    sampleRate: 44100,
    seed: 3006,
    // The opponent's portrait lunging at the camera. Doppler is the whole idea: the
    // bandpass falls 900->250Hz while the layer is resampled down, then the body hit
    // lands at 300ms as the portrait stops.
    layers: [
      { kind: "noise", color: "pink", dur: 0.38, at: 0, gain: 0.85, pitch: 0.92,
        env: [[0, 0.12], [0.06, 1], [0.38, 0.0001]],
        filter: { type: "bandpass", f: 900, fEnd: 250, q: 1.8 } },
      { kind: "osc", wave: "sine", f: 60, fEnd: 44, glide: "exp", dur: 0.18, at: 0.3, gain: 0.7,
        env: [[0, 1], [0.18, 0.0001]] },
    ],
    master: { normalizeTo: -3 },
  },
  {
    name: "duel-bubble",
    family: "table",
    sampleRate: 44100,
    seed: 3007,
    // Klein's chat bubble. Two soft pops a 60ms apart, dry and short: it fires
    // mid-thought and must never pull focus from the line being typed.
    layers: [
      { kind: "osc", wave: "sine", f: 660, dur: 0.04, at: 0, gain: 0.7,
        env: [[0, 1], [0.04, 0.0001]] },
      { kind: "osc", wave: "sine", f: 880, dur: 0.04, at: 0.06, gain: 0.6,
        env: [[0, 1], [0.04, 0.0001]] },
    ],
    master: { normalizeTo: -4 },
  },
  {
    name: "duel-thinking",
    family: "table",
    sampleRate: 44100,
    seed: 3008,
    // Klein's thinking dots. Deliberately tiny (-18): the caller rate-limits this to
    // one voice per 400ms and it ticks for as long as the model thinks.
    layers: [
      { kind: "osc", wave: "sine", f: 520, dur: 0.03, at: 0, gain: 0.7,
        env: [[0, 1], [0.03, 0.0001]] },
      { kind: "noise", color: "white", dur: 0.008, at: 0, gain: 0.3,
        env: [[0, 1], [0.008, 0.0001]], filter: { type: "bandpass", f: 3000, q: 1.6 } },
    ],
    master: { normalizeTo: -18 },
  },
];

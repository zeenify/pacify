/* Non-duel screens family (spec §7.21). Five assets: the dossier ticket pair, the
   HALL OF SHAME entry, the how-to page turn and the dossier ID-card tilt.

   Rendered DRY; `reverb` blocks mirror the sends the runtime applies from
   apps/web/src/lib/sfx-manifest.ts (the manifest is authoritative). Of these five
   only campaign.ticket.claim carries one (hall 0.20); the rest are dry.

   Both source samples fire late: card-flick peaks at 70ms and paper-slap at 228ms,
   and the -50 dB trailing trim cannot catch a late *attack* — so every sample layer
   here is trimmed to its own peak (trimStart 0.066 / 0.228) and lands on the beat. */

/** @type {import("../render.mjs").Recipe[]} */
export const screens = [
  {
    name: "campaign-ticket-pick",
    family: "screens",
    sampleRate: 44100,
    seed: 14001,
    // A dossier ticket being selected: heavier and paper-ier than a playing card, so
    // the flick is pitched DOWN to 0.9 (thicker stock), the paper slap is trimmed to
    // its 228ms attack so the tear arrives with the flick instead of after it, and a
    // 100Hz sine gives the whole thing a body the card never had.
    layers: [
      { kind: "sample", src: "card-flick.wav", at: 0, gain: 0.8, pitch: 0.9,
        trimStart: 0.066, trimEnd: 0.34,
        env: [[0, 1], [0.1, 0.55], [0.22, 0.22], [0.274, 0.0001]],
        filter: { type: "highpass", f: 120, q: 0.7 } },
      { kind: "sample", src: "paper-slap.wav", at: 0, gain: 0.65,
        trimStart: 0.228, trimEnd: 0.44,
        env: [[0, 1], [0.05, 0.45], [0.17, 0.09], [0.212, 0.0001]],
        filter: { type: "highpass", f: 140, q: 0.7 } },
      { kind: "osc", wave: "sine", f: 100, fEnd: 72, glide: "exp", dur: 0.2, at: 0, gain: 0.75,
        env: [[0, 1], [0.08, 0.6], [0.17, 0.2], [0.2, 0.0001]],
        filter: { type: "highpass", f: 40, q: 0.7 } },
    ],
    master: { normalizeTo: -3 },
  },
  {
    name: "campaign-ticket-claim",
    family: "screens",
    sampleRate: 44100,
    seed: 14002,
    // Ticket confirmed. A small resolved two-note (a fifth, 659 -> 988Hz, 90ms apart)
    // over the same paper slap pitched 0.8 — the heavier stock of a stamped claim.
    // The one cue of the five with a send: hall 0.20, matching the manifest.
    layers: [
      { kind: "sample", src: "paper-slap.wav", at: 0, gain: 0.7, pitch: 0.8,
        trimStart: 0.228, trimEnd: 0.44,
        env: [[0, 1], [0.06, 0.5], [0.17, 0.1], [0.212, 0.0001]],
        filter: { type: "lowpass", f: 3000, q: 0.7 } },
      { kind: "osc", wave: "tri", f: 659, dur: 0.2, at: 0, gain: 0.5,
        env: [[0, 1], [0.05, 0.7], [0.15, 0.2], [0.2, 0.0001]],
        filter: { type: "lowpass", f: 2800, q: 0.7 } },
      { kind: "osc", wave: "tri", f: 988, dur: 0.38, at: 0.09, gain: 0.55,
        env: [[0, 1], [0.06, 0.75], [0.28, 0.22], [0.38, 0.0001]],
        filter: { type: "lowpass", f: 3200, q: 0.7 } },
    ],
    reverb: { preset: "hall", send: 0.2 },
    master: { normalizeTo: -3 },
  },
  {
    name: "shame-enter",
    family: "screens",
    sampleRate: 44100,
    seed: 14003,
    // Entering the HALL OF SHAME: low and hollow, not a hit. A 65Hz sine over 800ms
    // (highpassed at 40Hz so the sub leaves no DC behind) under brown noise swelling
    // in and back out — the room breathing.
    layers: [
      { kind: "osc", wave: "sine", f: 65, fEnd: 52, glide: "exp", dur: 0.8, at: 0, gain: 0.85,
        env: [[0, 0.02], [0.18, 1], [0.55, 0.7], [0.8, 0.0001]],
        filter: { type: "highpass", f: 40, q: 0.7 } },
      // bandpass, not lowpass: brown noise is a random walk and carries real DC, which
      // a 200Hz lowpass would pass straight into the buffer. q 0.5 keeps it broad.
      { kind: "noise", color: "brown", dur: 1.05, at: 0.02, gain: 0.7,
        env: [[0, 0.03], [0.35, 0.8], [0.88, 0.45], [1.02, 0.02], [1.07, 0.0001]],
        filter: { type: "bandpass", f: 200, q: 0.5 } },
    ],
    master: { normalizeTo: -5 },
  },
  {
    name: "howto-page-turn",
    family: "screens",
    sampleRate: 44100,
    seed: 14004,
    // A rules page turning: the paper slap pitched UP to 1.2 (thinner stock, faster
    // flick) through a bandpass that opens 600 -> 2500Hz across the turn, plus a faint
    // 40ms rustle of the edge lifting. The layer pipeline filters BEFORE it pitches,
    // so the filter is set a 1.2 below the audible target (500 -> 2083Hz).
    layers: [
      { kind: "sample", src: "paper-slap.wav", at: 0, gain: 0.8, pitch: 1.2,
        trimStart: 0.228, trimEnd: 0.6,
        env: [[0, 0.9], [0.05, 0.6], [0.2, 0.25], [0.31, 0.12], [0.369, 0.0001]],
        filter: { type: "bandpass", f: 500, fEnd: 2083, q: 1.2 } },
      { kind: "noise", color: "white", dur: 0.04, at: 0.03, gain: 0.28,
        env: [[0, 0.9], [0.04, 0.0001]],
        filter: { type: "bandpass", f: 2400, q: 1.1 } },
    ],
    master: { normalizeTo: -4 },
  },
  {
    name: "dossier-card-tilt",
    family: "screens",
    sampleRate: 44100,
    seed: 14005,
    // The ID card tilting under a drag, firing continuously: a 4kHz tick of 8ms and a
    // 1600Hz sine of 40ms. Deliberately near-inaudible — the -22 dBFS master is this
    // cue's loudness, not the gate's (the manifest also holds it at gain 0.40 with a
    // 60ms cooldown and 2 voices). Do not raise it.
    layers: [
      { kind: "noise", color: "white", dur: 0.008, at: 0, gain: 0.6,
        env: [[0, 1], [0.008, 0.0001]], filter: { type: "bandpass", f: 4000, q: 1.6 } },
      { kind: "osc", wave: "sine", f: 1600, dur: 0.042, at: 0, gain: 0.5,
        env: [[0, 0.35], [0.006, 1], [0.028, 0.5], [0.036, 0.12], [0.042, 0.0001]] },
    ],
    master: { normalizeTo: -22 },
  },
];

/* EXECUTIONER family — fourteen assets, the most cues of any trick.

   Rendered DRY. Every `reverb` block below documents the send the runtime applies
   from apps/web/src/lib/sfx-manifest.ts; only bladedrop (0.25) and chop (0.20) carry
   one, so the other twelve declare plate 0. The family is mechanical and close: a
   short plate, never a hall.

   Every sub-bass sine is highpassed at 40Hz and every low rumble is band-limited
   (bandpass, never lowpass) because the noise generator's own DC would otherwise sit
   on the buffer and trip the 0.01 limit — the same failure that killed four earlier
   assets at 0.014-0.016. Sourced paper-slap carries +0.016 DC and is highpassed 120. */

/** 18 ratchet clicks, one every 50ms across the 900ms meter fill. */
const meterTicks = () => Array.from({ length: 18 }, (_, i) => ({
  kind: "noise", color: "white", dur: 0.01, at: i * 0.05, gain: 0.3 + i * 0.02,
  env: [[0, 1], [0.01, 0.0001]], filter: { type: "bandpass", f: 3000, q: 2.5 },
}));

/** 12Hz amplitude tremolo: a peak every 83ms, a trough midway, decaying overall.
    Built as envelope breakpoints — the recipe format has no LFO. */
const tremolo12 = (dur = 0.4) => {
  const pts = [[0, 0.0001], [0.004, 1]];
  for (let i = 1; i * 0.041667 < dur - 0.012; i++) {
    const t = i * 0.041667;
    const level = (i % 2 ? 0.32 : 1) * (1 - 0.45 * (t / dur));
    pts.push([Number(t.toFixed(4)), Number(level.toFixed(3))]);
  }
  pts.push([dur - 0.004, 0.2], [dur, 0.0001]);
  return pts;
};

/** @type {import("../render.mjs").Recipe[]} */
export const trickExec = [
  {
    name: "trick-exec-rise",
    family: "trick-exec",
    sampleRate: 44100,
    seed: 10001,
    // The two diagonal panels (dTkPanelL/R 340ms @180). Two mirrored bandpass sweeps
    // 60ms apart — one climbing 600->6000Hz, one falling 6000->500Hz — so even in the
    // mono render the pair reads as opposite diagonals closing; the manifest pans at
    // playback. A 10ms bright flash rides the first frame.
    layers: [
      { kind: "noise", color: "white", dur: 0.14, at: 0, gain: 0.8,
        env: [[0, 1], [0.03, 0.8], [0.14, 0.0001]],
        filter: { type: "bandpass", f: 600, fEnd: 6000, q: 1.1 } },
      { kind: "noise", color: "white", dur: 0.14, at: 0.06, gain: 0.75,
        env: [[0, 1], [0.03, 0.75], [0.14, 0.0001]],
        filter: { type: "bandpass", f: 6000, fEnd: 500, q: 1.1 } },
      { kind: "noise", color: "white", dur: 0.01, at: 0, gain: 0.7,
        env: [[0, 1], [0.01, 0.0001]],
        filter: { type: "highpass", f: 3000, q: 0.7 } },
      { kind: "osc", wave: "sine", f: 70, fEnd: 110, glide: "exp", dur: 0.12, at: 0, gain: 0.25,
        env: [[0, 1], [0.12, 0.0001]],
        filter: { type: "highpass", f: 40, q: 0.7 } },
    ],
    reverb: { preset: "plate", send: 0 },
    master: { normalizeTo: -5 },
  },
  {
    name: "trick-exec-meter",
    family: "trick-exec",
    sampleRate: 44100,
    seed: 10002,
    // dMeterFill 900ms @620: a rising whine (220->880Hz through a bandpass tracking
    // the glide, q4) plus 18 discrete 10ms ticks at 3kHz. The ticks are the sound:
    // a smooth riser would read as UI, a ratchet reads as sentencing. execfail calls
    // this at pitch 0.9, so the stall is audible without a separate asset.
    layers: [
      { kind: "osc", wave: "saw", f: 220, fEnd: 880, glide: "exp", dur: 0.9, at: 0, gain: 0.45,
        env: [[0, 0.0001], [0.12, 0.25], [0.8, 0.9], [0.9, 0.0001]],
        filter: { type: "bandpass", f: 240, fEnd: 1100, q: 4 } },
      ...meterTicks(),
      { kind: "osc", wave: "sine", f: 55, dur: 0.9, at: 0, gain: 0.14,
        env: [[0, 0.0001], [0.2, 0.4], [0.85, 0.8], [0.9, 0.0001]],
        filter: { type: "highpass", f: 40, q: 0.7 } },
    ],
    reverb: { preset: "plate", send: 0 },
    master: { normalizeTo: -4 },
  },
  {
    name: "trick-exec-target",
    family: "trick-exec",
    sampleRate: 44100,
    seed: 10003,
    // dTkTargetIn @820: the card flying in. Sourced card-flick pitched 0.8 (trimStart
    // 66ms lands its attack at :00) over a low whoosh falling 900->160Hz; the 120Hz
    // sine is the card's mass, not air.
    layers: [
      { kind: "sample", src: "card-flick.wav", at: 0, gain: 0.95, pitch: 0.8,
        trimStart: 0.066, trimEnd: 0.42,
        env: [[0, 1], [0.05, 0.55], [0.16, 0.0001]],
        filter: { type: "highpass", f: 200, q: 1 } },
      { kind: "noise", color: "pink", dur: 0.3, at: 0, gain: 0.4,
        env: [[0, 0.0001], [0.1, 1], [0.3, 0.0001]],
        filter: { type: "bandpass", f: 900, fEnd: 160, q: 1.1 } },
      { kind: "osc", wave: "sine", f: 120, fEnd: 85, glide: "exp", dur: 0.22, at: 0.02, gain: 0.3,
        env: [[0, 0.0001], [0.03, 1], [0.22, 0.0001]],
        filter: { type: "highpass", f: 40, q: 0.7 } },
    ],
    reverb: { preset: "plate", send: 0 },
    master: { normalizeTo: -4 },
  },
  {
    name: "trick-exec-zone",
    family: "trick-exec",
    sampleRate: 44100,
    seed: 10004,
    // dZonePulse x3 at 1560, pitched 0.97-1.06 by the caller: a single crimson pulse,
    // deliberately characterless. 120ms of 160Hz body, an 8ms 1.5kHz tick for the
    // edge, and a 320Hz partial so the harmonic survives small pitches.
    layers: [
      { kind: "osc", wave: "sine", f: 160, dur: 0.12, at: 0, gain: 0.9,
        env: [[0, 1], [0.02, 0.75], [0.12, 0.0001]],
        filter: { type: "highpass", f: 40, q: 0.7 } },
      { kind: "noise", color: "white", dur: 0.008, at: 0, gain: 0.8,
        env: [[0, 1], [0.008, 0.0001]],
        filter: { type: "bandpass", f: 1500, q: 2.2 } },
      { kind: "osc", wave: "sine", f: 320, dur: 0.07, at: 0, gain: 0.22,
        env: [[0, 1], [0.07, 0.0001]] },
    ],
    reverb: { preset: "plate", send: 0 },
    master: { normalizeTo: -6 },
  },
  {
    name: "trick-exec-bladehold",
    family: "trick-exec",
    sampleRate: 44100,
    seed: 10005,
    // dTkBladeHold @1650 — the pause that sells the drop. Nearly nothing: a faint
    // 50Hz rumble (highpassed 40 so the half-cycle cannot bias the buffer) plus the
    // creak at -18dB relative, trimmed to its 127ms attack and band-limited. Peak
    // -14dBFS: at the manifest's 0.60 gain this is tension through near-silence.
    layers: [
      { kind: "osc", wave: "sine", f: 50, dur: 0.5, at: 0, gain: 0.7,
        env: [[0, 0.0001], [0.05, 0.75], [0.3, 1], [0.44, 0.55], [0.5, 0.0001]],
        filter: { type: "highpass", f: 40, q: 0.7 } },
      { kind: "sample", src: "rope-creak.wav", at: 0, gain: 0.07, pitch: 0.75,
        trimStart: 0.127, trimEnd: 0.45,
        env: [[0, 0.0001], [0.08, 0.7], [0.4, 0.5], [0.43, 0.0001]],
        filter: { type: "bandpass", f: 900, q: 0.8 } },
    ],
    reverb: { preset: "plate", send: 0 },
    master: { normalizeTo: -14 },
  },
  {
    name: "trick-exec-rope",
    family: "trick-exec",
    sampleRate: 44100,
    seed: 10006,
    // dTkRopeSlack 190ms @2160. Sourced rope-creak pitched 1.2, trimmed to the 190ms
    // from its 127ms attack, bandpassed 400-2500. Doubled by an explicit pitched copy
    // (1.27) instead of a delay: fibre, not metal.
    layers: [
      { kind: "sample", src: "rope-creak.wav", at: 0, gain: 1, pitch: 1.2,
        trimStart: 0.127, trimEnd: 0.317,
        env: [[0, 1], [0.08, 0.6], [0.15, 0.0001]],
        filter: { type: "bandpass", f: 1000, q: 0.7 } },
      { kind: "sample", src: "rope-creak.wav", at: 0, gain: 0.5, pitch: 1.27,
        trimStart: 0.127, trimEnd: 0.317,
        env: [[0, 1], [0.07, 0.45], [0.14, 0.0001]],
        filter: { type: "bandpass", f: 1500, q: 0.8 } },
      { kind: "noise", color: "pink", dur: 0.09, at: 0, gain: 0.12,
        env: [[0, 0.2], [0.05, 1], [0.09, 0.0001]],
        filter: { type: "bandpass", f: 800, q: 1 } },
    ],
    reverb: { preset: "plate", send: 0 },
    master: { normalizeTo: -6 },
  },
  {
    name: "trick-exec-bladedrop",
    family: "trick-exec",
    sampleRate: 44100,
    seed: 10007,
    // THE money beat — dTkBladeDrop 190ms @2350. Three layers on the same sample:
    // a 5ms full-band release transient, the clang at pitch 1.0 for the blade ring,
    // and a 70Hz slam for the impact. -1.5dBFS is the loudest cue in the game; the
    // plate 0.25 keeps the ring from flattening into the transient. The highpass on
    // the sine is what keeps a 17.5-cycle tone from leaving DC behind.
    layers: [
      { kind: "noise", color: "white", dur: 0.005, at: 0, gain: 1,
        env: [[0, 1], [0.005, 0.0001]] },
      { kind: "sample", src: "metal-clang.wav", at: 0, gain: 0.9, pitch: 1.0, trimEnd: 0.62,
        env: [[0, 1], [0.1, 0.55], [0.4, 0.09], [0.6, 0.0001]],
        filter: { type: "highpass", f: 40, q: 0.7 } },
      { kind: "osc", wave: "sine", f: 70, dur: 0.25, at: 0, gain: 1,
        env: [[0, 1], [0.07, 0.85], [0.25, 0.0001]],
        filter: { type: "highpass", f: 40, q: 0.7 } },
    ],
    reverb: { preset: "plate", send: 0.25 },
    master: { normalizeTo: -1.5 },
  },
  {
    name: "trick-exec-chop",
    family: "trick-exec",
    sampleRate: 44100,
    seed: 10008,
    // dTkCutFlash @2500 + the halves splitting @2530/2520. Sourced wood-hit pitched
    // 0.6 (its 9ms attack is safe at 0) under a 1.6 clang and a 40ms noise burst.
    // Lowpassed 4kHz and plated 0.20: flesh and wood, not just steel.
    layers: [
      { kind: "sample", src: "wood-hit.wav", at: 0, gain: 0.95, pitch: 0.6, trimEnd: 0.42,
        env: [[0, 1], [0.07, 0.7], [0.3, 0.12], [0.5, 0.0001]],
        filter: { type: "lowpass", f: 4000, q: 0.7 } },
      { kind: "sample", src: "metal-clang.wav", at: 0, gain: 0.5, pitch: 1.6, trimEnd: 0.36,
        env: [[0, 1], [0.04, 0.5], [0.18, 0.0001]],
        filter: { type: "highpass", f: 300, q: 0.7 } },
      { kind: "noise", color: "white", dur: 0.04, at: 0, gain: 0.7,
        env: [[0, 1], [0.04, 0.0001]],
        filter: { type: "bandpass", f: 2500, q: 1 } },
      { kind: "osc", wave: "sine", f: 110, fEnd: 60, glide: "exp", dur: 0.18, at: 0, gain: 0.4,
        env: [[0, 1], [0.18, 0.0001]],
        filter: { type: "highpass", f: 40, q: 0.7 } },
    ],
    reverb: { preset: "plate", send: 0.2 },
    master: { normalizeTo: -3 },
  },
  {
    name: "trick-exec-shake",
    family: "trick-exec",
    sampleRate: 44100,
    seed: 10009,
    // dTkShake 460ms @2530. Brown noise rumble with a 12Hz tremolo, written as
    // envelope breakpoints (no LFO in the format). Band-limited at 70Hz instead of
    // lowpassed at 120: a lowpass passes the generator's own DC and would land at
    // ~0.024 after normalisation, well over the 0.01 rule. The bandpass is the same
    // rumble with none of the offset.
    layers: [
      { kind: "noise", color: "brown", dur: 0.4, at: 0, gain: 0.8,
        env: tremolo12(0.4),
        filter: { type: "bandpass", f: 70, q: 0.5 } },
      { kind: "noise", color: "brown", dur: 0.4, at: 0, gain: 0.4,
        env: tremolo12(0.4),
        filter: { type: "bandpass", f: 45, q: 0.6 } },
      { kind: "osc", wave: "sine", f: 48, dur: 0.4, at: 0, gain: 0.25,
        env: tremolo12(0.4),
        filter: { type: "highpass", f: 40, q: 0.7 } },
    ],
    reverb: { preset: "plate", send: 0 },
    master: { normalizeTo: -5 },
  },
  {
    name: "trick-exec-letters",
    family: "trick-exec",
    sampleRate: 44100,
    seed: 10010,
    // Called 8x at 55ms spacing for "EXECUTED", so this is ONE 80ms letter slam:
    // 12ms of 2kHz noise, paper-slap pitched 1.3 trimmed to 100ms from its 228ms
    // attack and highpassed (the source carries +0.016 DC), a 240Hz body. Eight
    // copies must not smear.
    layers: [
      { kind: "noise", color: "white", dur: 0.012, at: 0, gain: 0.9,
        env: [[0, 1], [0.012, 0.0001]],
        filter: { type: "bandpass", f: 2000, q: 2 } },
      { kind: "sample", src: "paper-slap.wav", at: 0, gain: 0.9, pitch: 1.3,
        trimStart: 0.228, trimEnd: 0.328,
        env: [[0, 1], [0.025, 0.45], [0.07, 0.0001]],
        filter: { type: "highpass", f: 120, q: 0.7 } },
      { kind: "osc", wave: "sine", f: 240, dur: 0.08, at: 0, gain: 0.5,
        env: [[0, 1], [0.08, 0.0001]] },
    ],
    reverb: { preset: "plate", send: 0 },
    master: { normalizeTo: -6 },
  },
  {
    name: "trick-exec-scorezero",
    family: "trick-exec",
    sampleRate: 44100,
    seed: 10011,
    // "SCORE -> 0" dNumSlam @3280. A descending hollow: 400->100Hz exp over 500ms
    // with a 200Hz octave under it, then a lowpassed noise tail that follows the tone
    // down. Finality — it ends on the floor, not on a ring.
    layers: [
      { kind: "osc", wave: "sine", f: 400, fEnd: 100, glide: "exp", dur: 0.5, at: 0, gain: 0.9,
        env: [[0, 1], [0.1, 0.7], [0.5, 0.0001]],
        filter: { type: "highpass", f: 40, q: 0.7 } },
      { kind: "osc", wave: "sine", f: 200, fEnd: 50, glide: "exp", dur: 0.5, at: 0, gain: 0.3,
        env: [[0, 1], [0.12, 0.6], [0.5, 0.0001]],
        filter: { type: "highpass", f: 40, q: 0.7 } },
      { kind: "noise", color: "pink", dur: 0.6, at: 0, gain: 0.3,
        env: [[0, 0.4], [0.1, 0.28], [0.6, 0.0001]],
        filter: { type: "bandpass", f: 700, fEnd: 180, q: 0.8 } },
    ],
    reverb: { preset: "plate", send: 0 },
    master: { normalizeTo: -3 },
  },
  {
    name: "trick-exec-exit",
    family: "trick-exec",
    sampleRate: 44100,
    seed: 10012,
    // Panels out (@3820 exec / @3300 misfire): the exact reverse of rise. Two sweeps
    // now descending and lowpassed, so the panels leave downward into the table
    // instead of arriving as a bright cut. The low sine is the floor they close over.
    layers: [
      { kind: "noise", color: "white", dur: 0.32, at: 0, gain: 0.8,
        env: [[0, 1], [0.05, 0.65], [0.32, 0.0001]],
        filter: { type: "bandpass", f: 4000, fEnd: 600, q: 1.2 } },
      { kind: "noise", color: "pink", dur: 0.42, at: 0.06, gain: 0.45,
        env: [[0, 0.8], [0.08, 0.55], [0.42, 0.0001]],
        filter: { type: "bandpass", f: 2500, fEnd: 280, q: 1.1 } },
      { kind: "osc", wave: "sine", f: 140, fEnd: 60, glide: "exp", dur: 0.3, at: 0, gain: 0.3,
        env: [[0, 0.6], [0.05, 1], [0.3, 0.0001]],
        filter: { type: "highpass", f: 40, q: 0.7 } },
    ],
    reverb: { preset: "plate", send: 0 },
    master: { normalizeTo: -5 },
  },
  {
    name: "trick-exec-strain",
    family: "trick-exec",
    sampleRate: 44100,
    seed: 10013,
    // Misfire only — dTkBladeStrain 900ms @1560. Metal under load that never
    // releases: the creak at pitch 0.5 and a 90Hz saw behind a q8 bandpass (which
    // both narrows it to a groan and strips the saw's DC), 6Hz tremolo written as
    // envelope breakpoints. Swells to its peak at 700ms, then decays to a floor
    // instead of resolving. There is deliberately no clang: this is not a quieter
    // execution, it is the absence of one.
    layers: [
      { kind: "sample", src: "rope-creak.wav", at: 0, gain: 0.55, pitch: 0.5,
        trimStart: 0.127, trimEnd: 0.55,
        env: [[0, 0.0001], [0.1, 0.22], [0.35, 0.5], [0.7, 1], [0.84, 0.3], [0.846, 0.0001]],
        filter: { type: "bandpass", f: 700, q: 0.7 } },
      { kind: "osc", wave: "saw", f: 90, dur: 0.9, at: 0, gain: 0.5,
        env: [[0, 0.0001], [0.02, 0.05], [0.083, 0.1], [0.167, 0.28], [0.25, 0.18],
              [0.333, 0.47], [0.417, 0.3], [0.5, 0.66], [0.583, 0.42], [0.667, 0.86],
              [0.7, 1], [0.75, 0.42], [0.833, 0.3], [0.9, 0.12]],
        filter: { type: "bandpass", f: 90, q: 8 } },
    ],
    reverb: { preset: "plate", send: 0 },
    master: { normalizeTo: -4 },
  },
  {
    name: "trick-exec-sub",
    family: "trick-exec",
    sampleRate: 44100,
    seed: 10014,
    // "SCORES BELOW 7 ESCAPE THE BLADE" @2560. A quiet paper slam: the sourced slap
    // pitched 1.0 from its attack, a 180Hz body, and a click for the caption edge.
    // -10dBFS with the manifest's 0.60 gain keeps it a subtitle, not a verdict.
    layers: [
      { kind: "sample", src: "paper-slap.wav", at: 0, gain: 0.85, pitch: 1,
        trimStart: 0.228, trimEnd: 0.36,
        env: [[0, 1], [0.05, 0.45], [0.13, 0.0001]],
        filter: { type: "highpass", f: 120, q: 0.7 } },
      { kind: "osc", wave: "sine", f: 180, dur: 0.1, at: 0, gain: 0.5,
        env: [[0, 1], [0.1, 0.0001]],
        filter: { type: "highpass", f: 40, q: 0.7 } },
      { kind: "noise", color: "white", dur: 0.008, at: 0, gain: 0.3,
        env: [[0, 1], [0.008, 0.0001]],
        filter: { type: "bandpass", f: 1200, q: 1.5 } },
    ],
    reverb: { preset: "plate", send: 0 },
    master: { normalizeTo: -10 },
  },
];

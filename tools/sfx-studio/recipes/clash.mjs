/* Clash family — the countdown, the card flight, the showdown verdicts and the
   nullify beats (spec §7.1, §7.2, §7.4, §7.5). Twelve assets.

   Rendered DRY. Every `reverb` block below documents the send the runtime applies
   from apps/web/src/lib/sfx-manifest.ts; the manifest is authoritative, so a block
   whose send is 0 means the manifest declares that cue dry. */

/** @type {import("../render.mjs").Recipe[]} */
export const clash = [
  {
    name: "duel-clash-tick",
    family: "clash",
    sampleRate: 44100,
    seed: 4001,
    // Shared by the 3-2-1 tick and the showdown count (spec §5.5), and callers pitch
    // it up to 1.5. It fires up to 13 times in one beat, so the 700Hz body is short
    // on purpose; anything longer turns the countdown into a drone.
    layers: [
      { kind: "noise", color: "white", dur: 0.008, at: 0, gain: 0.9,
        env: [[0, 1], [0.008, 0.0001]],
        filter: { type: "bandpass", f: 2800, q: 2 } },
      { kind: "osc", wave: "tri", f: 700, dur: 0.12, at: 0, gain: 0.5,
        env: [[0, 1], [0.12, 0.0001]],
        filter: { type: "lowpass", f: 5200, q: 0.7 } },
      { kind: "osc", wave: "sine", f: 280, dur: 0.05, at: 0, gain: 0.25,
        env: [[0, 1], [0.05, 0.0001]] },
    ],
    master: { normalizeTo: -7 },
  },
  {
    name: "duel-flip-whoosh",
    family: "clash",
    sampleRate: 44100,
    seed: 4002,
    // The card back swinging away (dFlipBack 260ms). The bandpass falling 2500->500Hz
    // is the motion; the low sine is the card's mass so the sweep is not just air.
    layers: [
      { kind: "noise", color: "pink", dur: 0.24, at: 0, gain: 0.8,
        env: [[0, 0.01], [0.03, 1], [0.14, 0.12], [0.236, 0.004], [0.24, 0.0001]],
        filter: { type: "bandpass", f: 2500, fEnd: 500, q: 1.2 } },
      { kind: "osc", wave: "sine", f: 180, fEnd: 90, glide: "exp", dur: 0.22, at: 0, gain: 0.3,
        env: [[0, 0.2], [0.03, 1], [0.13, 0.15], [0.216, 0.004], [0.22, 0.0001]],
        filter: { type: "lowpass", f: 900, q: 0.8 } },
    ],
    master: { normalizeTo: -5 },
  },
  {
    name: "duel-flip-snap",
    family: "clash",
    sampleRate: 44100,
    seed: 4003,
    // The face landing (dFlipFace 380ms @210). Sharper and louder than the whoosh:
    // trimStart 66ms puts the flick's attack at :00, the 220Hz body gives it weight
    // and the 12ms band pass makes the landing read as card stock, not paper.
    layers: [
      { kind: "sample", src: "card-flick.wav", at: 0, gain: 0.95, pitch: 1.2,
        trimStart: 0.066, trimEnd: 0.26,
        env: [[0, 1], [0.08, 0.45], [0.155, 0.005], [0.16, 0.0001]],
        filter: { type: "highpass", f: 240, q: 1 } },
      { kind: "osc", wave: "sine", f: 220, dur: 0.04, at: 0, gain: 0.6,
        env: [[0, 1], [0.04, 0.0001]] },
      { kind: "noise", color: "white", dur: 0.012, at: 0, gain: 0.4,
        env: [[0, 1], [0.012, 0.0001]],
        filter: { type: "bandpass", f: 3200, q: 1.5 } },
    ],
    master: { normalizeTo: -4 },
  },
  {
    name: "duel-clash-vs",
    family: "clash",
    sampleRate: 44100,
    seed: 4004,
    // The VS slam. Two clangs 30ms apart, pitched 1.3, each riding a 150Hz sine.
    // Rendered MONO: the runtime hard-pans the pair at pan [-0.7, 0.7] from the
    // manifest, so the opposed stereo image is a playback decision, not a bake.
    layers: [
      { kind: "sample", src: "metal-clang.wav", at: 0, gain: 0.55, pitch: 1.3, trimEnd: 0.24,
        env: [[0, 1], [0.05, 0.5], [0.18, 0.0001]],
        filter: { type: "highpass", f: 180, q: 0.7 } },
      { kind: "osc", wave: "sine", f: 150, fEnd: 95, glide: "exp", dur: 0.14, at: 0, gain: 0.8,
        env: [[0, 1], [0.14, 0.0001]],
        filter: { type: "highpass", f: 40, q: 0.7 } },
      { kind: "sample", src: "metal-clang.wav", at: 0.03, gain: 0.5, pitch: 1.34, trimEnd: 0.24,
        env: [[0, 1], [0.05, 0.5], [0.18, 0.0001]],
        filter: { type: "highpass", f: 220, q: 0.7 } },
      { kind: "osc", wave: "sine", f: 150, fEnd: 90, glide: "exp", dur: 0.14, at: 0.03, gain: 0.7,
        env: [[0, 1], [0.14, 0.0001]],
        filter: { type: "highpass", f: 40, q: 0.7 } },
    ],
    master: { normalizeTo: -3 },
  },
  {
    name: "duel-card-win",
    family: "clash",
    sampleRate: 44100,
    seed: 4005,
    // The winner glow scaling up (dCardWinY/R 520ms). A rising 300->600Hz sweep is
    // the lift, the 1200Hz partial the bright edge, the rising noise shimmer the
    // glow itself. Triumphant but not a fanfare: the victory cue owns that.
    layers: [
      { kind: "osc", wave: "sine", f: 300, fEnd: 600, glide: "exp", dur: 0.45, at: 0, gain: 0.65,
        env: [[0, 0.05], [0.02, 1], [0.3, 0.18], [0.446, 0.006], [0.45, 0.0001]] },
      { kind: "osc", wave: "sine", f: 1200, dur: 0.35, at: 0.02, gain: 0.3,
        env: [[0, 1], [0.2, 0.3], [0.346, 0.006], [0.35, 0.0001]] },
      { kind: "noise", color: "white", dur: 0.4, at: 0.02, gain: 0.12,
        env: [[0, 0.2], [0.08, 1], [0.3, 0.12], [0.396, 0.004], [0.4, 0.0001]],
        filter: { type: "bandpass", f: 1500, fEnd: 3000, q: 1.2 } },
    ],
    reverb: { preset: "hall", send: 0.2 },
    master: { normalizeTo: -4 },
  },
  {
    name: "duel-card-shatter",
    family: "clash",
    sampleRate: 44100,
    seed: 4006,
    // Called 10x per shatter at 45ms stagger, so this is ONE debris fragment, not a
    // break: 30ms of glass clipped from its attack and pitched 1.7 (17.6ms), plus a
    // 90ms 3.5kHz crack and a 1.4kHz body. Kept near 87ms so ten copies span <500ms.
    layers: [
      { kind: "sample", src: "glass-shatter.wav", at: 0, gain: 1, pitch: 1.7,
        trimStart: 0.03, trimEnd: 0.06,
        env: [[0, 1], [0.02, 0.0001]] },
      { kind: "noise", color: "white", dur: 0.09, at: 0, gain: 0.85,
        env: [[0, 1], [0.012, 0.8], [0.06, 0.025], [0.086, 0.004], [0.09, 0.0001]],
        filter: { type: "bandpass", f: 3500, q: 2.2 } },
      { kind: "noise", color: "white", dur: 0.045, at: 0, gain: 0.4,
        env: [[0, 1], [0.045, 0.0001]],
        filter: { type: "bandpass", f: 1400, q: 1.6 } },
    ],
    master: { normalizeTo: -7 },
  },
  {
    name: "duel-clash-lockin",
    family: "clash",
    sampleRate: 44100,
    seed: 4007,
    // The winner's number locking (dLockIn 480ms): 523 -> 784Hz, a fifth up. The
    // lowpassed noise and 130Hz thud underneath are the plate landing, so the two
    // notes resolve rather than float.
    layers: [
      { kind: "osc", wave: "sine", f: 523, dur: 0.09, at: 0, gain: 0.7,
        env: [[0, 1], [0.09, 0.0001]] },
      { kind: "osc", wave: "sine", f: 784, dur: 0.2, at: 0.09, gain: 0.75,
        env: [[0, 1], [0.2, 0.0001]] },
      { kind: "noise", color: "white", dur: 0.1, at: 0, gain: 0.4,
        env: [[0, 1], [0.1, 0.0001]],
        filter: { type: "lowpass", f: 380, q: 0.9 } },
      { kind: "osc", wave: "sine", f: 130, fEnd: 80, glide: "exp", dur: 0.12, at: 0, gain: 0.5,
        env: [[0, 1], [0.12, 0.0001]] },
    ],
    reverb: { preset: "hall", send: 0.15 },
    master: { normalizeTo: -4 },
  },
  {
    name: "duel-clash-lockout",
    family: "clash",
    sampleRate: 44100,
    seed: 4008,
    // The loser (dLockOut 450ms). The same interval inverted: 392 -> 261Hz, both
    // lowpassed at 800Hz and dry. Dull on purpose — it must not compete with the
    // winner's resolved fifth.
    layers: [
      { kind: "osc", wave: "sine", f: 392, dur: 0.12, at: 0, gain: 0.6,
        env: [[0, 0.9], [0.01, 1], [0.12, 0.0001]],
        filter: { type: "lowpass", f: 800, q: 0.7 } },
      { kind: "osc", wave: "sine", f: 261, fEnd: 240, glide: "exp", dur: 0.24, at: 0.09, gain: 0.65,
        env: [[0, 1], [0.24, 0.0001]],
        filter: { type: "lowpass", f: 800, q: 0.7 } },
      { kind: "noise", color: "white", dur: 0.09, at: 0, gain: 0.4,
        env: [[0, 1], [0.09, 0.0001]],
        filter: { type: "lowpass", f: 500, q: 0.8 } },
    ],
    master: { normalizeTo: -8 },
  },
  {
    name: "duel-shield-pop",
    family: "clash",
    sampleRate: 44100,
    seed: 4009,
    // The power plate popping in (dShieldPop @100/@220). Callers pitch it 0.97-1.06,
    // so no character of its own: a 900Hz sine, a 10ms 4kHz tick and a 1.8kHz edge.
    layers: [
      { kind: "osc", wave: "sine", f: 900, dur: 0.02, at: 0, gain: 0.8,
        env: [[0, 1], [0.016, 0.06], [0.02, 0.0001]] },
      { kind: "noise", color: "white", dur: 0.01, at: 0, gain: 0.6,
        env: [[0, 1], [0.01, 0.0001]],
        filter: { type: "bandpass", f: 4000, q: 1.5 } },
      { kind: "osc", wave: "sine", f: 1800, dur: 0.012, at: 0, gain: 0.25,
        env: [[0, 1], [0.012, 0.0001]] },
    ],
    master: { normalizeTo: -8 },
  },
  {
    name: "duel-shield-banner",
    family: "clash",
    sampleRate: 44100,
    seed: 4010,
    // "SAME TYPE!" — a hollow bell: three inharmonic partials (440/617/891) decaying
    // over 400ms, with a 40ms noise attack so the banner has an onset to hit with.
    // The brief asked for hall 0.25, but the manifest declares this cue DRY, and the
    // manifest is the runtime authority; send 0 is recorded here to keep them equal.
    layers: [
      { kind: "osc", wave: "sine", f: 440, dur: 0.4, at: 0, gain: 0.5,
        env: [[0, 1], [0.15, 0.4], [0.396, 0.005], [0.4, 0.0001]] },
      { kind: "osc", wave: "sine", f: 617, dur: 0.4, at: 0, gain: 0.35,
        env: [[0, 1], [0.15, 0.4], [0.396, 0.005], [0.4, 0.0001]] },
      { kind: "osc", wave: "sine", f: 891, dur: 0.4, at: 0, gain: 0.25,
        env: [[0, 1], [0.15, 0.4], [0.396, 0.005], [0.4, 0.0001]] },
      { kind: "noise", color: "white", dur: 0.04, at: 0, gain: 0.4,
        env: [[0, 1], [0.04, 0.0001]],
        filter: { type: "bandpass", f: 2200, q: 1.2 } },
    ],
    reverb: { preset: "hall", send: 0 },
    master: { normalizeTo: -5 },
  },
  {
    name: "duel-nullify-smash",
    family: "clash",
    sampleRate: 44100,
    seed: 4011,
    // The big cancel (dNullSmash @1500) with its white flash. Clang dropped to 0.7
    // for size, a 120->55Hz slam for the floor, a 200ms band of mid noise for the
    // impact. Normalised to -1.5: the limiter is part of the sound.
    layers: [
      { kind: "sample", src: "metal-clang.wav", at: 0, gain: 0.85, pitch: 0.7, trimEnd: 0.5,
        env: [[0, 1], [0.1, 0.5], [0.4, 0.06], [0.71, 0.005], [0.714, 0.0001]],
        filter: { type: "lowpass", f: 7000, q: 0.7 } },
      { kind: "osc", wave: "sine", f: 120, fEnd: 55, glide: "exp", dur: 0.34, at: 0, gain: 0.9,
        env: [[0, 1], [0.34, 0.0001]] },
      { kind: "noise", color: "white", dur: 0.2, at: 0, gain: 0.7,
        env: [[0, 1], [0.03, 0.8], [0.2, 0.0001]],
        filter: { type: "bandpass", f: 1200, q: 0.9 } },
    ],
    reverb: { preset: "hall", send: 0.3 },
    master: { normalizeTo: -1.5 },
  },
  {
    name: "duel-nullify-ring",
    family: "clash",
    sampleRate: 44100,
    seed: 4012,
    // The shimmering aftermath (dShieldWave @1900): a 1760/2640/3520 bell ringing for
    // 800ms plus a short 5kHz air. Normalised to -9 with the manifest's 0.70 gain it
    // sits under the stamp instead of beside it.
    layers: [
      { kind: "osc", wave: "sine", f: 1760, dur: 0.8, at: 0, gain: 0.3,
        env: [[0, 1], [0.3, 0.35], [0.79, 0.006], [0.8, 0.0001]] },
      { kind: "osc", wave: "sine", f: 2640, dur: 0.8, at: 0, gain: 0.18,
        env: [[0, 1], [0.3, 0.35], [0.79, 0.006], [0.8, 0.0001]] },
      { kind: "osc", wave: "sine", f: 3520, dur: 0.8, at: 0, gain: 0.12,
        env: [[0, 1], [0.3, 0.35], [0.79, 0.006], [0.8, 0.0001]] },
      { kind: "noise", color: "white", dur: 0.25, at: 0, gain: 0.08,
        env: [[0, 1], [0.25, 0.0001]],
        filter: { type: "bandpass", f: 5000, q: 1 } },
    ],
    reverb: { preset: "hall", send: 0.45 },
    master: { normalizeTo: -9 },
  },
];

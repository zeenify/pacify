/* Round family — the wipe, the round furniture and the three duel verdicts
   (spec §7.9, §7.10, §7.11). Thirteen assets.

   Rendered DRY; each `reverb` block matches the send the runtime applies from
   apps/web/src/lib/sfx-manifest.ts (the manifest is authoritative). */

/** @type {import("../render.mjs").Recipe[]} */
export const round = [
  {
    name: "round-sweep",
    family: "round",
    sampleRate: 44100,
    seed: 6001,
    // dRwBack / dRwLead / dRwPanel: the wipe is three staggered slab sweeps, each a
    // band-passed curtain that opens low-to-mid and closes again, lowpassed so it is
    // air rather than a hit. The runtime pans them left -> right; this render is mono.
    // A fourth, darker pass carries the curtain out to 2.1s — big, but soft.
    layers: [
      { kind: "noise", color: "pink", dur: 0.90, at: 0, gain: 0.55,
        env: [[0, 0.04], [0.14, 0.9], [0.55, 0.75], [0.82, 0.20], [0.90, 0.0001]],
        filter: { type: "bandpass", f: 300, fEnd: 1400, q: 1.3 } },
      { kind: "noise", color: "pink", dur: 0.90, at: 0.22, gain: 0.5,
        env: [[0, 0.04], [0.14, 0.9], [0.55, 0.75], [0.82, 0.20], [0.90, 0.0001]],
        filter: { type: "bandpass", f: 360, fEnd: 1700, q: 1.3 } },
      { kind: "noise", color: "pink", dur: 0.90, at: 0.44, gain: 0.45,
        env: [[0, 0.04], [0.14, 0.9], [0.55, 0.75], [0.82, 0.20], [0.90, 0.0001]],
        filter: { type: "bandpass", f: 420, fEnd: 2000, q: 1.3 } },
      { kind: "noise", color: "pink", dur: 1.66, at: 0.44, gain: 0.5,
        env: [[0, 0.02], [0.30, 0.55], [0.95, 0.42], [1.40, 0.18], [1.62, 0.03], [1.66, 0.0001]],
        filter: { type: "lowpass", f: 2400, fEnd: 700, q: 0.8 } },
      { kind: "osc", wave: "sine", f: 60, fEnd: 48, glide: "exp", dur: 1.9, at: 0.2, gain: 0.22,
        env: [[0, 0.03], [0.5, 0.5], [1.5, 0.22], [1.9, 0.0001]],
        filter: { type: "highpass", f: 40, q: 0.7 } },
    ],
    reverb: { preset: "hall", send: 0 },
    master: { normalizeTo: -4 },
  },
  {
    name: "round-next",
    family: "round",
    sampleRate: 44100,
    seed: 6002,
    // dNumSlam @480: "NEXT" lands. 30ms of noise for the edge, a 180Hz sine for the
    // weight, and paper-slap pitched 0.8 — trimmed to its 228ms attack, so the paper
    // arrives with the slam instead of a quarter second after it.
    layers: [
      { kind: "noise", color: "white", dur: 0.03, at: 0, gain: 0.7,
        env: [[0, 1], [0.03, 0.0001]], filter: { type: "bandpass", f: 1800, q: 1.0 } },
      { kind: "osc", wave: "sine", f: 180, fEnd: 120, glide: "exp", dur: 0.15, at: 0, gain: 0.85,
        env: [[0, 1], [0.15, 0.0001]], filter: { type: "highpass", f: 40, q: 0.7 } },
      { kind: "sample", src: "paper-slap.wav", at: 0, gain: 0.7, pitch: 0.8,
        trimStart: 0.228, trimEnd: 0.46,
        env: [[0, 1], [0.06, 0.6], [0.22, 0.02], [0.29, 0.0001]],
        filter: { type: "lowpass", f: 3000, q: 0.7 } },
    ],
    reverb: { preset: "hall", send: 0 },
    master: { normalizeTo: -3 },
  },
  {
    name: "round-bars",
    family: "round",
    sampleRate: 44100,
    seed: 6003,
    // dRwBar @560+150i, called three times at pitch 0.95-1.10. One metallic tick: the
    // clang at 2.0 clipped to 120ms, plus a 20ms 3kHz tick so the onset survives the
    // pitch shift. Nothing below 300Hz — these are accent bars, not hits.
    layers: [
      { kind: "sample", src: "metal-clang.wav", at: 0, gain: 1, pitch: 2.0, trimEnd: 0.12,
        env: [[0, 1], [0.02, 0.55], [0.05, 0.18], [0.058, 0.0001]],
        filter: { type: "highpass", f: 300, q: 0.7 } },
      { kind: "noise", color: "white", dur: 0.02, at: 0, gain: 0.5,
        env: [[0, 1], [0.02, 0.0001]], filter: { type: "bandpass", f: 3000, q: 1.6 } },
    ],
    reverb: { preset: "hall", send: 0 },
    master: { normalizeTo: -7 },
  },
  {
    name: "round-burst",
    family: "round",
    sampleRate: 44100,
    seed: 6004,
    // Shared by the starburst seal x3, burstOut and the x3 chip fuse (spec §5.5), so it
    // is called at pitch 0.85-1.15 and must keep its shape across all of them: a 40ms
    // 5kHz noise burst, a 1320Hz body with a 300ms exponential decay, two upper
    // partials (2640/3960) and one early reflection's worth of shimmer.
    layers: [
      { kind: "noise", color: "white", dur: 0.04, at: 0, gain: 0.75,
        env: [[0, 1], [0.008, 0.9], [0.04, 0.0001]],
        filter: { type: "bandpass", f: 5000, q: 1.4 } },
      { kind: "osc", wave: "sine", f: 1320, dur: 0.30, at: 0, gain: 0.6,
        env: [[0, 1], [0.12, 0.30], [0.296, 0.004], [0.30, 0.0001]] },
      { kind: "osc", wave: "sine", f: 2640, dur: 0.22, at: 0, gain: 0.3,
        env: [[0, 1], [0.08, 0.26], [0.216, 0.003], [0.22, 0.0001]] },
      { kind: "osc", wave: "sine", f: 3960, dur: 0.14, at: 0, gain: 0.18,
        env: [[0, 1], [0.05, 0.22], [0.136, 0.003], [0.14, 0.0001]] },
    ],
    reverb: { preset: "hall", send: 0 },
    master: { normalizeTo: -4 },
  },
  {
    name: "round-letters",
    family: "round",
    sampleRate: 44100,
    seed: 6005,
    // dLetterSlam @700: R-O-U-N-D, five paper slaps 55ms apart, pitched 1.1/1.2/1.3/1.4/
    // 1.1 and staggered so the word lands as a rattle. Each slap is trimmed to its attack
    // (228ms) and cut at 80ms of body; the caller pans the five thumbs slightly apart.
    layers: [
      { kind: "sample", src: "paper-slap.wav", at: 0, gain: 0.9, pitch: 1.1,
        trimStart: 0.228, trimEnd: 0.34,
        env: [[0, 1], [0.04, 0.5], [0.10, 0.0001]] },
      { kind: "sample", src: "paper-slap.wav", at: 0.055, gain: 0.85, pitch: 1.2,
        trimStart: 0.228, trimEnd: 0.34,
        env: [[0, 1], [0.04, 0.5], [0.09, 0.0001]] },
      { kind: "sample", src: "paper-slap.wav", at: 0.11, gain: 0.9, pitch: 1.3,
        trimStart: 0.228, trimEnd: 0.34,
        env: [[0, 1], [0.04, 0.5], [0.09, 0.0001]] },
      { kind: "sample", src: "paper-slap.wav", at: 0.165, gain: 0.85, pitch: 1.4,
        trimStart: 0.228, trimEnd: 0.34,
        env: [[0, 1], [0.04, 0.5], [0.08, 0.0001]] },
      { kind: "sample", src: "paper-slap.wav", at: 0.22, gain: 0.95, pitch: 1.1,
        trimStart: 0.228, trimEnd: 0.36,
        env: [[0, 1], [0.05, 0.55], [0.11, 0.0001]] },
      { kind: "osc", wave: "sine", f: 120, fEnd: 80, glide: "exp", dur: 0.10, at: 0.22, gain: 0.5,
        env: [[0, 1], [0.10, 0.0001]], filter: { type: "highpass", f: 40, q: 0.7 } },
    ],
    reverb: { preset: "hall", send: 0 },
    master: { normalizeTo: -3 },
  },
  {
    name: "round-number",
    family: "round",
    sampleRate: 44100,
    seed: 6006,
    // dRwNumSlam @760: the heaviest non-trick slam. 65Hz for 400ms, the clang at 0.5 for
    // the plate, a 40ms crack for the moment it lands, and a 130Hz octave so the number
    // reads on small speakers. Hall 0.20 documents the manifest's 0.20 send.
    layers: [
      { kind: "osc", wave: "sine", f: 65, fEnd: 42, glide: "exp", dur: 0.40, at: 0, gain: 0.95,
        env: [[0, 1], [0.40, 0.0001]], filter: { type: "highpass", f: 40, q: 0.7 } },
      { kind: "sample", src: "metal-clang.wav", at: 0, gain: 0.7, pitch: 0.5, trimEnd: 0.6,
        env: [[0, 1], [0.12, 0.5], [0.42, 0.05], [0.60, 0.0001]],
        filter: { type: "lowpass", f: 4000, q: 0.7 } },
      { kind: "noise", color: "white", dur: 0.04, at: 0, gain: 0.6,
        env: [[0, 1], [0.04, 0.0001]], filter: { type: "bandpass", f: 1200, q: 0.9 } },
      { kind: "osc", wave: "sine", f: 130, fEnd: 90, glide: "exp", dur: 0.25, at: 0, gain: 0.4,
        env: [[0, 1], [0.25, 0.0001]] },
    ],
    reverb: { preset: "hall", send: 0.2 },
    master: { normalizeTo: -2 },
  },
  {
    name: "round-plate",
    family: "round",
    sampleRate: 44100,
    seed: 6007,
    // dStampIn @980: the "N / 7" count plate. The stamp recipe at lower weight — paper
    // at 0.9 trimmed to its attack, a 140Hz 80ms thud, and a 2kHz tick for the metal rim.
    layers: [
      { kind: "sample", src: "paper-slap.wav", at: 0, gain: 0.75, pitch: 0.9,
        trimStart: 0.228, trimEnd: 0.44,
        env: [[0, 1], [0.06, 0.5], [0.20, 0.02], [0.26, 0.0001]],
        filter: { type: "lowpass", f: 3200, q: 0.7 } },
      { kind: "osc", wave: "sine", f: 140, fEnd: 100, glide: "exp", dur: 0.08, at: 0, gain: 0.8,
        env: [[0, 1], [0.08, 0.0001]], filter: { type: "highpass", f: 40, q: 0.7 } },
      { kind: "noise", color: "white", dur: 0.01, at: 0, gain: 0.3,
        env: [[0, 1], [0.01, 0.0001]], filter: { type: "bandpass", f: 2000, q: 1.2 } },
    ],
    reverb: { preset: "hall", send: 0 },
    master: { normalizeTo: -5 },
  },
  {
    name: "round-cutflash",
    family: "round",
    sampleRate: 44100,
    seed: 6008,
    // dTkCutFlash @1480. A blade's glint: 10ms of 7kHz noise, a 2400Hz sine for 60ms and
    // a 3600Hz sliver so the top octave survives on laptop speakers. Very bright, very
    // short — it must be gone before the cut reads.
    layers: [
      { kind: "noise", color: "white", dur: 0.010, at: 0, gain: 0.85,
        env: [[0, 1], [0.010, 0.0001]], filter: { type: "bandpass", f: 7000, q: 1.1 } },
      { kind: "osc", wave: "sine", f: 2400, dur: 0.06, at: 0, gain: 0.6,
        env: [[0, 1], [0.06, 0.0001]] },
      { kind: "osc", wave: "sine", f: 3600, dur: 0.03, at: 0, gain: 0.25,
        env: [[0, 1], [0.03, 0.0001]] },
    ],
    reverb: { preset: "hall", send: 0 },
    master: { normalizeTo: -8 },
  },
  {
    name: "round-split",
    family: "round",
    sampleRate: 44100,
    seed: 6009,
    // dRwHalfA / dRwHalfB @1520: the number halving. A paper tear — the slap dropped to
    // 0.7 (so it reads as stock, not skin) with its band pass climbing 800->3000Hz over
    // the first 500ms of body, and a 70Hz thud for the weight of the split.
    layers: [
      { kind: "sample", src: "paper-slap.wav", at: 0, gain: 0.95, pitch: 0.7,
        trimStart: 0.228, trimEnd: 0.62,
        env: [[0, 1], [0.08, 0.8], [0.32, 0.35], [0.52, 0.08], [0.56, 0.0001]],
        filter: { type: "bandpass", f: 800, fEnd: 3000, q: 1.1 } },
      { kind: "osc", wave: "sine", f: 70, fEnd: 45, glide: "exp", dur: 0.28, at: 0, gain: 0.6,
        env: [[0, 1], [0.28, 0.0001]], filter: { type: "highpass", f: 40, q: 0.7 } },
    ],
    reverb: { preset: "hall", send: 0 },
    master: { normalizeTo: -4 },
  },
  {
    name: "round-panelin",
    family: "round",
    sampleRate: 44100,
    seed: 6010,
    // dPanelL / dPanelR 380ms: the victory and defeat panels sliding in. Two low whooshes
    // 40ms apart, lowpassed at 600Hz so they are felt more than heard; the manifest
    // hard-pans the pair left/right at playback, so this render stays mono.
    layers: [
      { kind: "noise", color: "pink", dur: 0.32, at: 0, gain: 0.8,
        env: [[0, 0.05], [0.10, 1], [0.24, 0.35], [0.32, 0.0001]],
        filter: { type: "bandpass", f: 480, q: 0.7 } },
      { kind: "noise", color: "pink", dur: 0.32, at: 0.04, gain: 0.7,
        env: [[0, 0.05], [0.10, 1], [0.24, 0.35], [0.32, 0.0001]],
        filter: { type: "bandpass", f: 500, q: 0.7 } },
      { kind: "osc", wave: "sine", f: 80, fEnd: 55, glide: "exp", dur: 0.3, at: 0, gain: 0.3,
        env: [[0, 0.1], [0.12, 1], [0.3, 0.0001]], filter: { type: "highpass", f: 40, q: 0.7 } },
    ],
    reverb: { preset: "hall", send: 0 },
    master: { normalizeTo: -5 },
  },
  {
    name: "duel-victory",
    family: "round",
    sampleRate: 44100,
    seed: 6011,
    // dTitleSlam 520ms: "PACIFIED!". The only true fanfare — a rising C major arpeggio
    // (523/659/784) struck 140ms apart, each bell decaying 1.1s, over a 130Hz pedal.
    // Hall 0.35 documents the manifest's 0.35 send. The last bell rings out to 1.43s;
    // nothing is shortened to fit the budget.
    layers: [
      { kind: "osc", wave: "sine", f: 523, dur: 1.10, at: 0, gain: 0.5,
        env: [[0, 1], [0.10, 0.48], [0.55, 0.16], [1.06, 0.008], [1.10, 0.0001]] },
      { kind: "osc", wave: "sine", f: 659, dur: 1.10, at: 0.14, gain: 0.5,
        env: [[0, 1], [0.10, 0.48], [0.55, 0.16], [1.06, 0.008], [1.10, 0.0001]] },
      { kind: "osc", wave: "sine", f: 784, dur: 1.10, at: 0.28, gain: 0.55,
        env: [[0, 1], [0.10, 0.48], [0.55, 0.16], [1.06, 0.008], [1.10, 0.0001]] },
      { kind: "osc", wave: "sine", f: 130, dur: 1.45, at: 0, gain: 0.35,
        env: [[0, 0.9], [0.05, 1], [0.80, 0.35], [1.30, 0.06], [1.45, 0.0001]],
        filter: { type: "highpass", f: 40, q: 0.7 } },
      { kind: "noise", color: "white", dur: 0.05, at: 0.28, gain: 0.2,
        env: [[0, 1], [0.05, 0.0001]], filter: { type: "bandpass", f: 3000, q: 1.0 } },
    ],
    reverb: { preset: "hall", send: 0.35 },
    master: { normalizeTo: -2 },
  },
  {
    name: "duel-defeat",
    family: "round",
    sampleRate: 44100,
    seed: 6012,
    // "DEFEAT": the victory shape inverted and detuned. 392/466/523 struck 180ms apart,
    // every note 12 cents flat (pitch 0.993), over a 98Hz pedal and lowpassed at 1800Hz
    // so the whole chord sits behind a closed door. Hall 0.35 per the manifest.
    layers: [
      { kind: "osc", wave: "sine", f: 392, dur: 1.00, at: 0, gain: 0.5, pitch: 0.993,
        env: [[0, 1], [0.10, 0.45], [0.55, 0.14], [0.96, 0.008], [1.00, 0.0001]],
        filter: { type: "lowpass", f: 1800, q: 0.8 } },
      { kind: "osc", wave: "sine", f: 466, dur: 1.00, at: 0.18, gain: 0.5, pitch: 0.993,
        env: [[0, 1], [0.10, 0.45], [0.55, 0.14], [0.96, 0.008], [1.00, 0.0001]],
        filter: { type: "lowpass", f: 1800, q: 0.8 } },
      { kind: "osc", wave: "sine", f: 523, dur: 1.00, at: 0.36, gain: 0.45, pitch: 0.993,
        env: [[0, 1], [0.10, 0.45], [0.55, 0.14], [0.96, 0.008], [1.00, 0.0001]],
        filter: { type: "lowpass", f: 1800, q: 0.8 } },
      { kind: "osc", wave: "sine", f: 98, dur: 1.35, at: 0, gain: 0.35,
        env: [[0, 0.9], [0.05, 1], [0.80, 0.35], [1.25, 0.06], [1.35, 0.0001]],
        filter: { type: "lowpass", f: 600, q: 0.8 } },
      { kind: "noise", color: "pink", dur: 0.9, at: 0, gain: 0.1,
        env: [[0, 0.4], [0.2, 1], [0.9, 0.0001]],
        filter: { type: "lowpass", f: 900, q: 0.7 } },
    ],
    reverb: { preset: "hall", send: 0.35 },
    master: { normalizeTo: -3 },
  },
  {
    name: "duel-draw",
    family: "round",
    sampleRate: 44100,
    seed: 6013,
    // "DRAW": neutral and unresolved. Two open fifths (392/587 then 415/622) that never
    // add a third, so the ear is left hanging; the 415 arrival is a semitone wide of the
    // 392 under it, which is what makes the ambiguity audible. Hall 0.30 per the manifest.
    layers: [
      { kind: "osc", wave: "sine", f: 392, dur: 1.20, at: 0, gain: 0.45,
        env: [[0, 1], [0.12, 0.45], [0.70, 0.16], [1.16, 0.008], [1.20, 0.0001]] },
      { kind: "osc", wave: "sine", f: 587, dur: 1.20, at: 0, gain: 0.38,
        env: [[0, 1], [0.12, 0.45], [0.70, 0.16], [1.16, 0.008], [1.20, 0.0001]] },
      { kind: "osc", wave: "sine", f: 415, dur: 0.92, at: 0.28, gain: 0.4,
        env: [[0, 1], [0.10, 0.45], [0.60, 0.16], [0.88, 0.008], [0.92, 0.0001]] },
      { kind: "osc", wave: "sine", f: 622, dur: 0.92, at: 0.28, gain: 0.32,
        env: [[0, 1], [0.10, 0.45], [0.60, 0.16], [0.88, 0.008], [0.92, 0.0001]] },
      { kind: "osc", wave: "sine", f: 196, dur: 1.18, at: 0, gain: 0.18,
        env: [[0, 0.8], [0.06, 1], [0.8, 0.3], [1.18, 0.0001]],
        filter: { type: "highpass", f: 40, q: 0.7 } },
    ],
    reverb: { preset: "hall", send: 0.3 },
    master: { normalizeTo: -4 },
  },
];

import { noise, biquad, applyEnv, normalize, delay as delayLine } from "./dsp.mjs";

/* Procedural impulse responses — the same algorithm the runtime uses to build its
   ConvolverNode buffers, so browser and rendered assets agree (spec §5.2).
   Exponentially decaying noise, then preset-specific tonal shaping. */

const PRESETS = {
  hall:      { decay: 1.8, lp: 6500, hp: 120, preDelayMs: 18, diffusion: 0.35 },
  plate:     { decay: 0.9, lp: 9000, hp: 200, preDelayMs: 4,  diffusion: 0.55 },
  metal:     { decay: 0.5, lp: 12000, hp: 900, preDelayMs: 0, diffusion: 0.15 },
  cathedral: { decay: 3.2, lp: 4200, hp: 80,  preDelayMs: 32, diffusion: 0.45 },
};

export const IR_PRESETS = Object.keys(PRESETS);

export function makeIR({ preset, seconds, sampleRate = 44100, rand }) {
  const p = PRESETS[preset];
  if (!p) throw new Error(`unknown IR preset: ${preset} (have: ${IR_PRESETS.join(", ")})`);
  // the buffer is always exactly `seconds` long; `p.decay` sets how fast the
  // envelope falls to the floor (a metal IR is silent after ~decay seconds,
  // a cathedral one is still ringing when the buffer ends)
  const dur = seconds;
  let ir = noise({ color: "white", dur, sampleRate, rand });
  ir = applyEnv(ir, sampleRate, [[0, 1], [p.decay, 0]], { curve: "exp" });
  ir = biquad(ir, sampleRate, { type: "highpass", f: p.hp, q: 0.7 });
  ir = biquad(ir, sampleRate, { type: "lowpass", f: p.lp, q: 0.7 });
  if (p.diffusion > 0) {
    // a single short feedback delay smears the early reflections into a tail
    const wet = delayLine(ir, sampleRate, { ms: 11, feedback: p.diffusion, mix: 1 });
    const out = new Float32Array(ir.length);
    for (let i = 0; i < ir.length; i++) out[i] = ir[i] * 0.6 + wet[i] * 0.4;
    ir = out;
  }
  ir = normalize(ir, -6);
  if (p.preDelayMs > 0) {
    // shift right within the fixed buffer length — the IR must stay exactly
    // seconds*sampleRate samples long (the tail past the end is discarded)
    const d = Math.round((p.preDelayMs / 1000) * sampleRate);
    const shifted = new Float32Array(ir.length);
    shifted.set(ir.subarray(0, Math.max(0, ir.length - d)), d);
    ir = shifted;
  }
  // final safety: an IR must never itself clip the reverb return
  return normalize(ir, -3);
}

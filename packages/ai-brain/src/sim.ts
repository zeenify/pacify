/* Parallel balance harness — N god-brain duels vs random, split across worker threads.
   Run: npm run sim  (from packages/ai-brain)
   Deterministic: seed ranges are split, results merged — identical to serial output. */

import { Worker, isMainThread, parentPort, workerData } from "node:worker_threads";
import os from "node:os";
import { createDuel, dispatch, brainView, TOTAL_ROUNDS, type DuelState } from "@pacify/engine";
import { chooseGodCard } from "./brain.js";
import { KLEIN_POLICY } from "./policy.js";

type SimResult = { w: number; l: number; d: number; godPts: number; oppPts: number; games: number };

function playDuel(seed: number): { result: string; p2: number; p1: number } {
  const rng = mulberry(seed);
  let state: DuelState = createDuel({ seed, studentId: 2 });
  for (let r = 0; r < TOTAL_ROUNDS; r++) {
    const aiPick = chooseGodCard(brainView(state), KLEIN_POLICY);
    state = dispatch(state, { t: "lock_ai", cardId: aiPick.id }).state;
    state = dispatch(state, { t: "lock_player", cardId: state.p1Hand[Math.floor(rng() * state.p1Hand.length)].id }).state;
    if (state.phase === "reveal") state = dispatch(state, { t: "next_round" }).state;
  }
  return { result: state.result?.winner ?? "draw", p2: state.p2Score, p1: state.p1Score };
}

function mulberry(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function runChunk(startSeed: number, count: number): SimResult {
  const acc: SimResult = { w: 0, l: 0, d: 0, godPts: 0, oppPts: 0, games: count };
  for (let g = 0; g < count; g++) {
    const r = playDuel(startSeed + g);
    if (r.result === "p2") acc.w++;
    else if (r.result === "p1") acc.l++;
    else acc.d++;
    acc.godPts += r.p2;
    acc.oppPts += r.p1;
  }
  return acc;
}

function merge(a: SimResult, b: SimResult): SimResult {
  return {
    w: a.w + b.w, l: a.l + b.l, d: a.d + b.d,
    godPts: a.godPts + b.godPts, oppPts: a.oppPts + b.oppPts,
    games: a.games + b.games,
  };
}

const N = parseInt(process.env.SIM_GAMES ?? "1000", 10);
const SEED_BASE = 20260824;

if (isMainThread) {
  const workers = Math.max(1, os.cpus().length - 1); // leave one core free
  const per = Math.ceil(N / workers);
  const t0 = performance.now();
  let done: SimResult = { w: 0, l: 0, d: 0, godPts: 0, oppPts: 0, games: 0 };
  let finished = 0;

  console.log(`sim: ${N} duels across ${workers} workers (${per}/worker)`);

  for (let i = 0; i < workers; i++) {
    const start = SEED_BASE + i * per;
    const count = Math.min(per, N - i * per);
    if (count <= 0) break;
    const w = new Worker(new URL(import.meta.url), { workerData: { startSeed: start, count } });
    w.on("message", (res: SimResult) => {
      done = merge(done, res);
      finished++;
      if (finished === workers) report(done, t0);
    });
    w.on("error", (e) => { console.error(e); process.exit(1); });
  }
} else {
  const { startSeed, count } = workerData as { startSeed: number; count: number };
  parentPort!.postMessage(runChunk(startSeed, count));
}

function report(r: SimResult, t0: number) {
  const secs = ((performance.now() - t0) / 1000).toFixed(1);
  const wr = ((r.w / r.games) * 100).toFixed(1);
  console.log(`\nGOD vs random — ${r.games} duels in ${secs}s`);
  console.log(`W${r.w} L${r.l} D${r.d} → GOD ${wr}% | avg ${ (r.godPts / r.games).toFixed(1) }-${(r.oppPts / r.games).toFixed(1) }`);
  console.log(`luck floor (your wins): ${( (r.l / r.games) * 100).toFixed(1)}%`);
}

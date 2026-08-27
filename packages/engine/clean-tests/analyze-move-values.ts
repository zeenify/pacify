/* clean-tests/analyze-move-values.ts
   Verification of the idea: "with full vision + whole-game search, the best
   move is usually unambiguous (not several similar-value cards)."
   Builds a CORRECT full-vision solver (both hands known, no ghost pool) and,
   over N seeds, measures how the 7 possible first moves score under three
   opponent models: perfect (minimax), random (expectimax), middle (softmax
   over the human's sensible gains). Prints the tie/ambiguity statistics.
   Run: npx tsx clean-tests/analyze-move-values.ts
*/
import { createDuel, resolveRound, type Card, type DuelState } from "../src/index.js";

type Model = "perfect" | "random" | "middle";
const TOTAL_ROUNDS = 7;
const SCORE_THRESHOLD = 20;

// state from Klein's (cheating) perspective: he sees BOTH hands.
type S = {
  round: number;
  klein: Card[];      // Klein's remaining hand
  human: Card[];      // human's remaining hand
  kScore: number;
  hScore: number;
  echoNext: boolean;
  shieldOff: number;
};

function outcome(k: number, h: number): number {
  if (k >= SCORE_THRESHOLD && k > h) return 1;
  if (h >= SCORE_THRESHOLD && h > k) return 0;
  if (k > h) return 1;
  if (k < h) return 0;
  return 0.5;
}
function terminal(s: S): boolean {
  return s.round > TOTAL_ROUNDS || s.kScore >= SCORE_THRESHOLD || s.hScore >= SCORE_THRESHOLD;
}

function makeNext(s: S, kc: Card, hc: Card): S {
  const out = resolveRound({
    p1Card: hc, p2Card: kc,            // p1 = human, p2 = Klein
    p1Score: s.hScore, p2Score: s.kScore,
    round: s.round, echoNext: s.echoNext, shieldOff: s.shieldOff,
  });
  return {
    round: s.round + 1,
    klein: s.klein.filter((c) => c.id !== kc.id),
    human: s.human.filter((c) => c.id !== hc.id),
    kScore: out.p2Score, hScore: out.p1Score,
    echoNext: out.echoNext, shieldOff: out.shieldOffAfter,
  };
}

const memo = new Map<string, number>();
function key(s: S): string {
  return [s.round, s.kScore, s.hScore, s.echoNext ? 1 : 0, s.shieldOff,
    s.klein.map((c) => c.id).sort().join(","), s.human.map((c) => c.id).sort().join(",")].join("|");
}

// Klein maximizes his win value.
function kleinBest(s: S, model: Model): number {
  if (terminal(s)) return outcome(s.kScore, s.hScore);
  const k = key(s);
  const hit = memo.get(k);
  if (hit !== undefined) return hit;
  let best = -Infinity;
  for (const kc of s.klein) {
    const v = humanMove(s, kc, model);
    if (v > best) best = v;
  }
  memo.set(k, best);
  return best;
}

// After Klein commits kc, the human responds per the model.
function humanMove(s: S, kc: Card, model: Model): number {
  const moves = s.human.map((hc) => ({ hc, ns: makeNext(s, kc, hc) }));
  if (model === "perfect") {
    let worst = Infinity;                       // human minimizes Klein's value
    for (const m of moves) worst = Math.min(worst, kleinBest(m.ns, model));
    return worst;
  }
  if (model === "random") {
    let sum = 0;                                // human uniform (expectimax)
    for (const m of moves) sum += kleinBest(m.ns, model);
    return sum / moves.length;
  }
  // middle: human more likely to pick cards good for them (softmax on gain)
  const gains = moves.map((m) => (m.ns.hScore - s.hScore) - (m.ns.kScore - s.kScore));
  const maxG = Math.max(...gains);
  const wts = gains.map((g) => Math.exp((g - maxG) * 1.5));
  const tot = wts.reduce((a, b) => a + b, 0);
  let sum = 0;
  moves.forEach((m, i) => { sum += (wts[i] / tot) * kleinBest(m.ns, model); });
  return sum;
}

// value of each of Klein's 7 first moves (for the report)
function firstMoveValues(root: S, model: Model): number[] {
  return root.klein.map((kc) => humanMove(root, kc, model));
}

// ---------- run over seeds ----------
const N = 24;
const bucketsPerfect = new Map<number, number>();   // #winning first moves -> count of seeds
let midGapSum = 0, midAmbiguous = 0, perfGapSum = 0;
for (let seed = 1; seed <= N; seed++) {
  const d = createDuel({ seed, studentId: 2 });
  const root: S = { round: 1, klein: d.p2Hand, human: d.p1Hand, kScore: 0, hScore: 0, echoNext: false, shieldOff: 0 };

  const perf = firstMoveValues(root, "perfect");
  const winners = perf.filter((v) => v >= 0.99).length;
  bucketsPerfect.set(winners, (bucketsPerfect.get(winners) ?? 0) + 1);
  const sortedP = [...perf].sort((a, b) => b - a);
  perfGapSum += sortedP[0] - sortedP[1];

  const mid = firstMoveValues(root, "middle");
  const sortedM = [...mid].sort((a, b) => b - a);
  const gap = sortedM[0] - sortedM[1];
  midGapSum += gap;
  if (gap < 0.1) midAmbiguous++;

  memo.clear();
}

console.log(`=== over ${N} seeds (full-vision solver) ===`);
console.log("\nPERFECT opponent (minimax) — how many of Klein's 7 first moves force a WIN:");
for (const [w, c] of [...bucketsPerfect.entries()].sort((a, b) => a[0] - b[0]))
  console.log(`  ${w} winning move(s): ${c} seed(s)`);
console.log(`  avg gap between best and 2nd-best first move: ${(perfGapSum / N).toFixed(3)} (1=clear, 0=tie)`);

console.log("\nMIDDLE opponent (sensible-but-imperfect) — ambiguity of the best move:");
console.log(`  avg gap best-vs-2nd: ${(midGapSum / N).toFixed(3)}`);
console.log(`  seeds where top-2 first moves are near-tied (<0.1): ${midAmbiguous}/${N}`);
console.log("\n(done)");

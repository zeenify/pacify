/* clean-tests/check-firstturn.ts
   Verifies: in round 1, does Executioner (and Reversal) get the same win-value
   as other cards, or is the full-game search correctly ranking them lower?
   Uses the deployed default model (uniform, non-reactive, deterministic).
   Run: npx tsx clean-tests/check-firstturn.ts
*/
import { createDuel, resolveRound, CATALOGUE, type Card } from "../src/index.js";

type S = { round: number; klein: Card[]; opp: Card[]; kScore: number; oScore: number; echoNext: boolean; shieldOff: number };
const TOTAL_ROUNDS = 7, SCORE_THRESHOLD = 20;
function outcome(k: number, o: number): number {
  if (k >= SCORE_THRESHOLD && k > o) return 1;
  if (o >= SCORE_THRESHOLD && o > k) return 0;
  if (k > o) return 1; if (k < o) return 0; return 0.5;
}
function terminal(s: S): boolean { return s.round > TOTAL_ROUNDS || s.kScore >= SCORE_THRESHOLD || s.oScore >= SCORE_THRESHOLD; }
function nextState(s: S, kc: Card, oc: Card): S {
  const out = resolveRound({ p1Card: oc, p2Card: kc, p1Score: s.oScore, p2Score: s.kScore, round: s.round, echoNext: s.echoNext, shieldOff: s.shieldOff });
  return { round: s.round + 1, klein: s.klein.filter((c) => c.id !== kc.id), opp: s.opp.filter((c) => c.id !== oc.id), kScore: out.p2Score, oScore: out.p1Score, echoNext: out.echoNext, shieldOff: out.shieldOffAfter };
}
const memo = new Map<string, number>();
function key(s: S): string { return [s.round, s.kScore, s.oScore, s.echoNext ? 1 : 0, s.shieldOff, s.klein.map((c) => c.id).sort().join(","), s.opp.map((c) => c.id).sort().join(",")].join("|"); }
function kleinBest(s: S): number {
  if (terminal(s)) return outcome(s.kScore, s.oScore);
  const k = key(s); const hit = memo.get(k); if (hit !== undefined) return hit;
  let best = -Infinity;
  for (const kc of s.klein) { const v = humanMove(s, kc); if (v > best) best = v; }
  memo.set(k, best); return best;
}
function humanMove(s: S, kc: Card): number {
  const moves = s.opp.map((oc) => nextState(s, kc, oc));
  if (moves.length === 0) return kleinBest({ ...s, klein: s.klein.filter((c) => c.id !== kc.id) });
  let sum = 0; for (const m of moves) sum += kleinBest(m);
  return sum / moves.length;
}

const N = 10;
let execRankSum = 0, revRankSum = 0, execN = 0, revN = 0, execGapSum = 0, revGapSum = 0;
for (let seed = 1; seed <= N; seed++) {
  const d = createDuel({ seed, studentId: 2 });
  const root: S = { round: 1, klein: d.p2Hand, opp: d.p1Hand, kScore: 0, oScore: 0, echoNext: false, shieldOff: 0 };
  memo.clear();
  const vals = d.p2Hand.map((kc) => ({ kc, v: humanMove(root, kc) }));
  vals.sort((a, b) => b.v - a.v);
  const best = vals[0].v;
  const rankOf = (id: string) => { const i = vals.findIndex((x) => x.kc.id === id); return i < 0 ? null : i + 1; };
  const er = rankOf("executioner"), rr = rankOf("reversal");
  const line = vals.map((x, i) => `${i + 1}.${x.kc.name}=${x.v.toFixed(2)}`).join("  ");
  let tag = "";
  if (er !== null) { execRankSum += er; execN++; execGapSum += best - vals[er - 1].v; tag += ` Exec#${er}(gap ${(best - vals[er - 1].v).toFixed(2)})`; }
  if (rr !== null) { revRankSum += rr; revN++; revGapSum += best - vals[rr - 1].v; tag += ` Rev#${rr}(gap ${(best - vals[rr - 1].v).toFixed(2)})`; }
  console.log(`s${seed}: ${line}  |${tag}`);
}
const f = (x: number) => x.toFixed(2);
console.log(`\nExecutioner: present in ${execN}/${N} seeds, avg rank ${(execRankSum / execN).toFixed(1)}/7, avg gap below best ${f(execGapSum / execN)}`);
console.log(`Reversal:    present in ${revN}/${N} seeds, avg rank ${(revRankSum / revN).toFixed(1)}/7, avg gap below best ${f(revGapSum / revN)}`);
console.log("(1=best..7=worst. Small 'gap' = near-top/near-tie; large gap = correctly de-prioritized.)");

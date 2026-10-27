/* Deal scan — how hard is the game itself? Computes the pure maximin value
   (full vision, round 1, perfect robust play) for N deals and buckets it:
     value 1   → forced WIN  (god wins no matter what the human does)
     value 0.5 → guaranteed draw-or-better
     value 0   → forced LOSS (no line saves the deal against perfect punishment)
   This is the difficulty CEILING of the current rules. Run from packages/ai-brain:
     npx tsx src/dealscan.ts 120
   Uses the same seed stream as sim.ts (1000 + i*7919) so runs are comparable. */

import { createDuel } from "@pacify/engine";
import { Solver } from "./solver.js";

const n = Number(process.argv[2] ?? 120);
const seat = Number(process.argv[3] ?? 2) as 1 | 2; // whose seat to value
let forcedWin = 0;
let guaranteedDraw = 0;
let forcedLoss = 0;
let worstSeed = -1;
let worstV = 1;

const t0 = performance.now();
for (let i = 0; i < n; i++) {
  const seed = 1000 + i * 7919;
  const st = createDuel({ seed, studentId: 2 });
  const v = new Solver({ robustness: 1 }).value({
    round: 1,
    mine: seat === 2 ? st.p2Hand : st.p1Hand,
    theirs: seat === 2 ? st.p1Hand : st.p2Hand,
    myScore: 0,
    theirScore: 0,
    echoNext: false,
    shieldOff: 0,
  });
  if (v === 1) forcedWin++;
  else if (v === 0.5) guaranteedDraw++;
  else forcedLoss++;
  if (v < worstV) {
    worstV = v;
    worstSeed = seed;
  }
}
const ms = performance.now() - t0;

console.log(`\nDeal-difficulty ceiling — ${n} deals, seat p${seat}, full vision, perfect robust play:`);
console.log(
  `  forced WIN           ${((forcedWin / n) * 100).toFixed(1).padStart(5)}%  (unloseable deals)`,
);
console.log(
  `  guaranteed draw+     ${((guaranteedDraw / n) * 100).toFixed(1).padStart(5)}%  (cannot lose, cannot force win)`,
);
console.log(
  `  FORCED LOSS          ${((forcedLoss / n) * 100).toFixed(1).padStart(5)}%  (losable even with perfect play)`,
);
console.log(`  (${(ms / n).toFixed(0)}ms/deal)`);

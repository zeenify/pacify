/* Sim — does the upgraded brain actually win more? Run from packages/ai-brain:
     npm run sim -- [seeds]            (default 60)
   Prints a brain × human table (W/D/L, win rate, margin, solve time) plus the
   deal-value distribution: how often full vision + perfect play still cannot
   force a win. */

import { HUMAN_LABELS, playDuel, type HumanKind } from "./arena.js";
import type { BrainConfig } from "./god.js";
import { defaultRobustness } from "./solver.js";

const seeds = Number(process.argv[2] ?? 60);
const seedList = Array.from({ length: seeds }, (_, i) => 1000 + i * 7919);

const brains: { name: string; cfg: BrainConfig }[] = [
  { name: "old brain  (kappa=0, pure model best-response)", cfg: { robustness: 0 } },
  { name: `new default (kappa=${defaultRobustness(0.5).toFixed(2)}, skill .5)`, cfg: {} },
  { name: "hard robust (kappa=1, pure maximin)", cfg: { robustness: 1 } },
];

const humans: HumanKind[] = ["random", "greedy", "modeled", "blindMaximin", "clairvoyant"];

type Cell = { w: number; d: number; l: number; margin: number; ms: number };

console.log(`\nPACIFY brain sim — ${seeds} duels per cell (brain = p2/Klein seat)\n`);
const rows: string[] = [];
const pad = (s: string, n: number) => s.padEnd(n);

for (const human of humans) {
  for (const brain of brains) {
    const cell: Cell = { w: 0, d: 0, l: 0, margin: 0, ms: 0 };
    for (const seed of seedList) {
      const r = playDuel(seed, brain.cfg, human);
      if (r.payoff === 1) cell.w++;
      else if (r.payoff === 0.5) cell.d++;
      else cell.l++;
      cell.margin += r.brainScore - r.humanScore;
      cell.ms += r.ms;
    }
    const n = seedList.length;
    const wr = ((cell.w + 0.5 * cell.d) / n) * 100;
    rows.push(
      `${pad(HUMAN_LABELS[human], 30)} ${pad(brain.name, 44)} ` +
        `W${String(cell.w).padStart(3)} D${String(cell.d).padStart(3)} L${String(cell.l).padStart(3)} ` +
        `win% ${wr.toFixed(0).padStart(4)}  margin ${(cell.margin / n).toFixed(1).padStart(6)}  ` +
        `solve ${(cell.ms / n).toFixed(0)}ms/duel`,
    );
  }
}
console.log(rows.join("\n"));

// Deal-value distribution: the pure maximin value of the whole deal for the
// brain seat, computed at round 1 with full vision. This is the empirical
// answer to "can full vision always force a win?" — no: only the kappa=1
// fraction below is guaranteed regardless of what the human does.
const dist = new Map<number, number>();
for (const seed of seedList) {
  const r = playDuel(seed, { robustness: 1 }, "random");
  dist.set(r.robustValue, (dist.get(r.robustValue) ?? 0) + 1);
}
const n = seedList.length;
const fmt = (v: number) => `${((dist.get(v) ?? 0) / n) * 100}%`.padStart(5);
console.log(`\nDeal value for the brain (full vision, perfect robust play, ${n} deals):`);
console.log(`  forced WIN ${fmt(1)}   guaranteed DRAW-or-better incl. wins: ${(100 * (((dist.get(1) ?? 0) + (dist.get(0.5) ?? 0)) / n)).toFixed(1)}%   FORCED LOSS ${fmt(0)}`);

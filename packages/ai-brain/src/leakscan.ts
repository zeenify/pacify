/* Leak scan — how much harder does Klein get if it sometimes sees the human's
   locked card before picking? Plays real duels where, each round, with
   probability `p`, the brain reads the human's lock and plays the exact best
   counter (argmax over its cards of the kappa=1 solver value of the resulting
   state). With probability 1-p it picks blind, exactly like today (rankMoves,
   hard robust mode). Human locks FIRST each round — engine allows any order.

     npx tsx src/leakscan.ts 14          # duels per cell
   Humans: modeled (skill .5 draw) and blindMaximin (perfect robust, knows
   Klein's hand). Same seed stream as sim.ts (1000 + i*7919). */

import {
  createDuel,
  dispatch,
  stepRng,
  type BrainView,
  type Card,
  type DuelState,
} from "@pacify/engine";
import { rankMoves } from "./god.js";
import { Solver, humanStrategy, stepSolverState, type SolverState } from "./solver.js";

type HumanKind = "modeled" | "blindMaximin";
const LABELS: Record<HumanKind, string> = {
  modeled: "modeled human (skill .5)",
  blindMaximin: "strong human (perfect robust)",
};

function brainView(st: DuelState): BrainView {
  return {
    studentId: 2,
    round: st.round,
    phase: "commit",
    myScore: st.p2Score,
    oppScore: st.p1Score,
    myHand: st.p2Hand,
    burned: st.burned,
    peeked: [...st.p1Hand],
    oppHand: st.p1Hand,
    oppPeeked: [],
    shieldOff: st.shieldOff,
    echoNext: st.echoNext,
    rngState: st.rngState,
  };
}

function categorical(cards: Card[], probs: number[], r: number): Card {
  let acc = r;
  for (let i = 0; i < cards.length; i++) {
    acc -= probs[i];
    if (acc <= 0) return cards[i];
  }
  return cards[cards.length - 1];
}

function humanPick(kind: HumanKind, st: DuelState, rng: { s: number }): Card {
  const hand = st.p1Hand;
  const draw = (): number => {
    const [r, next] = stepRng(rng.s);
    rng.s = next;
    return r;
  };
  if (kind === "modeled") {
    const s: SolverState = {
      round: st.round,
      mine: st.p2Hand,
      theirs: hand,
      myScore: st.p1Score,
      theirScore: st.p2Score,
      echoNext: st.echoNext,
      shieldOff: st.shieldOff,
    };
    const strat = humanStrategy(s, { skill: 0.5 });
    return categorical(hand, hand.map((c) => strat.get(c.id) ?? 0), draw());
  }
  const s: SolverState = {
    round: st.round,
    mine: hand,
    theirs: st.p2Hand,
    myScore: st.p1Score,
    theirScore: st.p2Score,
    echoNext: st.echoNext,
    shieldOff: st.shieldOff,
  };
  const cvs = new Solver({ robustness: 1 }).cardValues(s);
  let best = cvs[0];
  for (const cv of cvs) if (cv.v > best.v) best = cv;
  return best.card;
}

function playDuel(seed: number, p: number, human: HumanKind) {
  let st = createDuel({ seed, studentId: 2 });
  const rng = { s: (seed ^ 0x51ed270b) | 0 };
  const counterSolver = new Solver({ robustness: 1 }); // reused: memo carries across rounds
  let guard = 0;
  while (st.phase !== "over" && guard++ < 100) {
    if (st.phase === "commit") {
      // Decide both cards before dispatching anything: the human's pick is
      // computed first so a leaked round can condition on it (models the
      // server knowing p1Locked at /ai-pick time). The engine still receives
      // lock_ai before lock_player, exactly like the arena/production loop.
      const humanCard = humanPick(human, st, rng);

      const leakDraw = (): number => {
        const [r, next] = stepRng(rng.s);
        rng.s = next;
        return r;
      };
      let kleinCard: Card = st.p2Hand[0];
      if (p > 0 && leakDraw() < p) {
        // Sees the lock: play the exact best counter to the known card.
        const base: SolverState = {
          round: st.round,
          mine: st.p2Hand,
          theirs: st.p1Hand,
          myScore: st.p2Score,
          theirScore: st.p1Score,
          echoNext: st.echoNext,
          shieldOff: st.shieldOff,
        };
        let bestV = -Infinity;
        for (const c of st.p2Hand) {
          const v = counterSolver.value(stepSolverState(base, c, humanCard));
          if (v > bestV) {
            bestV = v;
            kleinCard = c;
          }
        }
      } else {
        kleinCard = rankMoves(brainView(st), { robustness: 1 })[0].card;
      }
      st = dispatch(st, { t: "lock_ai", cardId: kleinCard.id }).state;
      st = dispatch(st, { t: "lock_player", cardId: humanCard.id }).state;
    } else if (st.phase === "reveal") {
      st = dispatch(st, { t: "next_round" }).state;
    } else {
      break;
    }
  }
  const result = st.result ?? { winner: "draw" as const };
  return {
    payoff: result.winner === "p2" ? 1 : result.winner === "draw" ? 0.5 : 0,
    margin: st.p2Score - st.p1Score,
  };
}

const n = Number(process.argv[2] ?? 14);
const ps = [0, 0.25, 0.5, 0.75, 1];
console.log(`\nLeak scan — ${n} duels/cell, Klein hard mode (kappa=1), leak prob p per round:\n`);
console.log(
  "human".padEnd(30) +
    "p=".padStart(5) +
    "   W  D  L   win%   avg margin",
);
for (const human of ["modeled", "blindMaximin"] as HumanKind[]) {
  for (const p of ps) {
    let w = 0,
      d = 0,
      l = 0,
      margin = 0;
    for (let i = 0; i < n; i++) {
      const seed = 1000 + i * 7919;
      const r = playDuel(seed, p, human);
      if (r.payoff === 1) w++;
      else if (r.payoff === 0.5) d++;
      else l++;
      margin += r.margin;
    }
    const wr = ((w + 0.5 * d) / n) * 100;
    console.log(
      LABELS[human].padEnd(30) +
        String(p).padStart(4) +
        "  " +
        `W${String(w).padStart(3)} D${String(d).padStart(2)} L${String(l).padStart(3)} ` +
        `  ${wr.toFixed(0).padStart(3)}%   ${(margin / n).toFixed(1)}`,
    );
  }
  console.log("");
}

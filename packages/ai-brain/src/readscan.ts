/* Read scan — what is seeing the human's locked card WORTH, per round?

   (The "read" = Klein seeing the human's locked card and playing the
   game-optimal reply. Named "read" to avoid colliding with the game's
   Oracle peek mechanic. See insane difficulty plan.md.)

   Part 1 (value table): play blind duels vs the modeled human. Every round,
   compute both the blind pick (rankMoves, hard mode) and the best counter to
   the human's actual card. The gap between the two resulting solver values —
   in win-probability points of the whole remaining game — is what a read in
   that round would have bought. Averaged per round: where do reads matter?

   Part 2 (end-to-end): real win rates for per-round read schedules.
   The shipping schedule comes from src/read.ts (single source of truth).

     npx tsx src/readscan.ts 22 12      # value-table duels, schedule duels/cell
     npx tsx src/readscan.ts 0 24       # schedules only, wider sample */

import {
  createDuel,
  dispatch,
  stepRng,
  type BrainView,
  type Card,
  type DuelState,
} from "@pacify/engine";
import { rankMoves } from "./god.js";
import { READ_SCHEDULE } from "./read.js";
import { Solver, humanStrategy, stepSolverState, type SolverState } from "./solver.js";

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

function humanPick(st: DuelState, rng: { s: number }): Card {
  const hand = st.p1Hand;
  const [r, next] = stepRng(rng.s);
  rng.s = next;
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
  return categorical(hand, hand.map((c) => strat.get(c.id) ?? 0), r);
}

function baseState(st: DuelState): SolverState {
  return {
    round: st.round,
    mine: st.p2Hand,
    theirs: st.p1Hand,
    myScore: st.p2Score,
    theirScore: st.p1Score,
    echoNext: st.echoNext,
    shieldOff: st.shieldOff,
  };
}

const nDelta = Number(process.argv[2] ?? 22);
const nCell = Number(process.argv[3] ?? 12);

// ---------- Part 1: per-round read value (blind trajectory) ----------
type RoundStat = { deltaSum: number; changed: number; n: number };
const stats = new Map<number, RoundStat>();
for (let r = 1; r <= 7; r++) stats.set(r, { deltaSum: 0, changed: 0, n: 0 });

for (let i = 0; i < nDelta; i++) {
  const seed = 1000 + i * 7919;
  let st = createDuel({ seed, studentId: 2 });
  const rng = { s: (seed ^ 0x51ed270b) | 0 };
  const solver = new Solver({ robustness: 1 });
  let guard = 0;
  while (st.phase !== "over" && guard++ < 100) {
    if (st.phase !== "commit") {
      if (st.phase === "reveal") st = dispatch(st, { t: "next_round" }).state;
      else break;
      continue;
    }
    const humanCard = humanPick(st, rng);
    const blind = rankMoves(brainView(st), { robustness: 1 })[0].card;
    const base = baseState(st);

    // Value of every candidate against the ACTUAL human card; the best one is
    // the read play, the blind pick's value is the no-read baseline.
    let counter = st.p2Hand[0];
    let counterV = -Infinity;
    let blindV = 0;
    for (const c of st.p2Hand) {
      const v = solver.value(stepSolverState(base, c, humanCard));
      if (c.id === blind.id) blindV = v;
      if (v > counterV) {
        counterV = v;
        counter = c;
      }
    }
    const s = stats.get(st.round)!;
    s.deltaSum += counterV - blindV;
    if (counter.id !== blind.id) s.changed++;
    s.n++;

    st = dispatch(st, { t: "lock_ai", cardId: blind.id }).state;
    st = dispatch(st, { t: "lock_player", cardId: humanCard.id }).state;
  }
}

console.log(`\nRead value by round — ${nDelta} blind duels vs modeled human (kappa=1 brain):`);
console.log("round   avg read value (win-prob points)   P(read changes the move)");
for (let r = 1; r <= 7; r++) {
  const s = stats.get(r)!;
  if (s.n === 0) continue;
  console.log(
    `  R${r}      ${((s.deltaSum / s.n) * 100).toFixed(1).padStart(5)} pts` +
      `                          ${((s.changed / s.n) * 100).toFixed(0)}%`,
  );
}

// ---------- Part 2: end-to-end schedules ----------
function playScheduleDuel(seed: number, probsByRound: Record<number, number>) {
  let st = createDuel({ seed, studentId: 2 });
  const rng = { s: (seed ^ 0x51ed270b) | 0 };
  const solver = new Solver({ robustness: 1 });
  let guard = 0;
  while (st.phase !== "over" && guard++ < 100) {
    if (st.phase === "commit") {
      const humanCard = humanPick(st, rng);
      const [pr, next] = stepRng(rng.s);
      rng.s = next;
      const p = probsByRound[st.round] ?? 0;
      let pick: Card;
      if (pr < p) {
        const base = baseState(st);
        pick = st.p2Hand[0];
        let bestV = -Infinity;
        for (const c of st.p2Hand) {
          const v = solver.value(stepSolverState(base, c, humanCard));
          if (v > bestV) {
            bestV = v;
            pick = c;
          }
        }
      } else {
        pick = rankMoves(brainView(st), { robustness: 1 })[0].card;
      }
      st = dispatch(st, { t: "lock_ai", cardId: pick.id }).state;
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

const shippingProbs = Object.fromEntries(READ_SCHEDULE.map((p, i) => [i + 1, p]));
const schedules: { name: string; probs: Record<number, number> }[] = [
  { name: "no read (today)", probs: {} },
  { name: "shipping 0/.5/.8/.8/.8/.5/0", probs: shippingProbs },
  { name: "always read", probs: { 1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 1, 7: 1 } },
];

console.log(`\nEnd-to-end schedules — ${nCell} duels/cell vs modeled human:`);
for (const sch of schedules) {
  let w = 0,
    d = 0,
    l = 0,
    margin = 0;
  for (let i = 0; i < nCell; i++) {
    const r = playScheduleDuel(1000 + i * 7919, sch.probs);
    if (r.payoff === 1) w++;
    else if (r.payoff === 0.5) d++;
    else l++;
    margin += r.margin;
  }
  const wr = ((w + 0.5 * d) / nCell) * 100;
  const expected = Object.values(sch.probs).reduce((a, b) => a + b, 0);
  console.log(
    `${sch.name.padEnd(28)} W${String(w).padStart(3)} D${String(d).padStart(2)} L${String(l).padStart(3)} ` +
      `  win% ${wr.toFixed(0).padStart(3)}   avg margin ${(margin / nCell).toFixed(1).padStart(5)}   (~${expected.toFixed(1)} reads/duel)`,
  );
}

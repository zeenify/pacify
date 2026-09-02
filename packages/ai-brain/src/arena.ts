/* Arena — plays full duels between a brain configuration and various human
   models on the REAL engine (createDuel/dispatch), so sim numbers reflect
   production mechanics exactly. Shared by src/sim.ts and the sim test-suite. */

import {
  CATALOGUE,
  createDuel,
  dispatch,
  stepRng,
  type BrainView,
  type Card,
  type DuelState,
} from "@pacify/engine";
import { rankMoves, type BrainConfig } from "./god.js";
import { Solver, humanStrategy, stepSolverState, type SolverState } from "./solver.js";

export type HumanKind = "random" | "greedy" | "modeled" | "blindMaximin" | "clairvoyant";

export const HUMAN_LABELS: Record<HumanKind, string> = {
  random: "random (uniform)",
  greedy: "greedy 1-ply (belief pool)",
  modeled: "the modeled human (skill .5)",
  blindMaximin: "perfect, sees Klein's hand",
  clairvoyant: "clairvoyant (sees the lock)",
};

export type DuelReport = {
  seed: number;
  payoff: number; // 1 brain win, 0.5 draw, 0 loss
  brainScore: number;
  humanScore: number;
  robustValue: number; // pure maximin value of the deal (kappa = 1, round 1)
  ms: number; // total time spent in rankMoves
};

/** The BrainView production builds each round (full vision via oppHand). */
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

/** Belief pool a fair human can deduce: catalogue − burned − own hand
 *  (singleton rule). Klein's actual remaining cards live inside this pool. */
function humanBeliefPool(st: DuelState): Card[] {
  const gone = new Set<string>();
  for (const c of st.burned) gone.add(c.id);
  for (const c of st.p1Hand) gone.add(c.id);
  return CATALOGUE.filter((c) => !gone.has(c.id));
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
  if (hand.length === 0) throw new Error("human pick with empty hand");

  const draw = (): number => {
    const [r, next] = stepRng(rng.s);
    rng.s = next;
    return r;
  };

  switch (kind) {
    case "random":
      return hand[Math.floor(draw() * hand.length)];

    case "greedy": {
      // Best expected score swing against a UNIFORM opponent drawn from the
      // belief pool — a decent human who counts cards but thinks one round.
      const pool = humanBeliefPool(st);
      const s: SolverState = {
        round: st.round,
        mine: pool, // stand-in for "opponent plays uniformly from these"
        theirs: hand,
        myScore: st.p1Score,
        theirScore: st.p2Score,
        echoNext: st.echoNext,
        shieldOff: st.shieldOff,
      };
      const strat = humanStrategy(s, { skill: 1 });
      const probs = hand.map((c) => strat.get(c.id) ?? 0);
      return hand[probs.indexOf(Math.max(...probs))];
    }

    case "modeled": {
      // A draw from the exact distribution the brain's opponent model assumes
      // (swing softmax over Klein's ACTUAL hand, skill .5 blend).
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

    case "blindMaximin": {
      // A perfect player who happens to know Klein's hand (but not the lock):
      // plays its own pure-robust best card from the mirrored seat.
      const s: SolverState = {
        round: st.round,
        mine: st.p1Hand,
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

    case "clairvoyant": {
      // Worst case: reads Klein's locked card, then picks the reply that
      // minimizes Klein's pure-robust (kappa=1) value of the resulting state.
      // Evaluated from KLEIN's seat — the human-seat value is a different
      // who-sees-whom game, and minimizing it would play to lose.
      const locked = st.p2Locked;
      if (!locked) return hand[0];
      const solver = new Solver({ robustness: 1 });
      const base: SolverState = {
        round: st.round,
        mine: st.p2Hand,
        theirs: st.p1Hand,
        myScore: st.p2Score,
        theirScore: st.p1Score,
        echoNext: st.echoNext,
        shieldOff: st.shieldOff,
      };
      let bestCard = hand[0];
      let bestV = Infinity; // Klein's value — lower is crueler
      for (const oc of hand) {
        const v = solver.value(stepSolverState(base, locked, oc));
        if (v < bestV) { bestV = v; bestCard = oc; }
      }
      if (process.env.PACIFY_TRACE) console.log(`  [cv] R${st.round} klein=${locked.name} picks ${bestCard.name} kleinV=${bestV}`);
      return bestCard;
    }
  }
}

/** Play one full duel on the engine. The brain always plays the argmax solver
 *  move (no pool mixing) so results are deterministic per seed. */
export function playDuel(seed: number, brain: BrainConfig, human: HumanKind): DuelReport {
  let st = createDuel({ seed, studentId: 2 });

  const start: SolverState = {
    round: 1,
    mine: st.p2Hand,
    theirs: st.p1Hand,
    myScore: 0,
    theirScore: 0,
    echoNext: false,
    shieldOff: 0,
  };
  const robustValue = new Solver({ ...brain, robustness: 1 }).value(start);

  const rng = { s: (seed ^ 0x51ed270b) | 0 };
  let ms = 0;
  let guard = 0;
  while (st.phase !== "over" && guard++ < 100) {
    if (st.phase === "commit") {
      const t0 = performance.now();
      const pool = rankMoves(brainView(st), brain);
      ms += performance.now() - t0;
      const kleinCard = pool[0].card; // deterministic argmax
      st = dispatch(st, { t: "lock_ai", cardId: kleinCard.id }).state;
      const humanCard = humanPick(human, st, rng);
      st = dispatch(st, { t: "lock_player", cardId: humanCard.id }).state;
    } else if (st.phase === "reveal") {
      st = dispatch(st, { t: "next_round" }).state;
    } else {
      break;
    }
  }

  const result = st.result ?? { winner: "draw" as const, p1Score: st.p1Score, p2Score: st.p2Score };
  return {
    seed,
    payoff: result.winner === "p2" ? 1 : result.winner === "draw" ? 0.5 : 0,
    brainScore: result.p2Score,
    humanScore: result.p1Score,
    robustValue,
    ms,
  };
}

import { rankMoves } from "../../packages/ai-brain/src/index.js";
import { cardById } from "../../packages/engine/src/index.js";

const N = (id: string) => cardById(id as any);

function show(label: string, myHand: string[], oppHand: string[], round: number) {
  const view: any = {
    myHand: myHand.map(N),
    oppHand: oppHand.map(N),
    myScore: 0, oppScore: 0, round, echoNext: false, shieldOff: 0,
    burned: [], peeked: [], rngState: 12345, studentId: 2, phase: "commit",
  };
  const pool = rankMoves(view, { skill: 0.5 });
  const summary = pool.map((p) => ({ id: p.card.id, v: p.v, finite: Number.isFinite(p.v) }));
  console.log(`\n=== ${label} (${myHand.length} cards, round ${round}) ===`);
  console.log(summary);
  const allFinite = summary.every((s) => s.finite);
  console.log("ALL FINITE v:", allFinite);
}

// A: 5 cards @ round 1  (hand < remaining rounds) -> expect -Infinity
show("A: 5-card r1", ["paladin","knight","echo","void","angel"], ["vampire","demon","ward","oracle","seraph"], 1);

// B: 7 cards @ round 1 (real game shape) -> expect finite
show("B: 7-card r1", ["bandit","paladin","ogre","knight","witch","wizard","vampire"], ["valkyrie","leviathan","seraph","demon","angel","void","oracle"], 1);

// C: 3 cards @ round 5 (3 cards = rounds 5,6,7) -> expect finite
show("C: 3-card r5", ["paladin","knight","angel"], ["vampire","demon","seraph"], 5);

// D: 3 cards @ round 3 (hand < remaining rounds) -> expect -Infinity
show("D: 3-card r3 (BUG)", ["paladin","knight","angel"], ["vampire","demon","seraph"], 3);

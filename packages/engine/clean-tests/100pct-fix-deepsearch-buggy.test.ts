/* clean-tests/100pct-fix-deepsearch-buggy.test.ts
   Regression test for the Klein brain fixes:
     - belief must be 100% on peeked cards, 0% on phantoms (the "100% fix")
     - the deep-search must NOT produce catastrophic blowouts (the bug we found:
       threading the burned pool incorrectly made the brain lose 29-0 by throwing
       Executioner into a 6 at R7 instead of holding it for a 7+).
   Runs 10 fixed seeds vs fixed random opponents.
   Run: npx tsx clean-tests/100pct-fix-deepsearch-buggy.test.ts
*/
import { createDuel, brainView, CATALOGUE, resolveRound, TOTAL_ROUNDS, SCORE_THRESHOLD } from "../src/index.js";
import { chooseGodCard, beliefWeights } from "../../ai-brain/src/index.js";
import type { Card, CardId, DuelState, BrainView } from "../src/index.js";

let failures = 0;
function check(name: string, cond: boolean, detail = "") {
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`);
  if (!cond) failures++;
}
const byId = (id: CardId): Card => CATALOGUE.find((c) => c.id === id)!;

// ---------- 100% belief check ----------
{
  const peeked: Card[] = [byId("witch"), byId("wizard"), byId("ward")];
  const phantom: Card[] = [byId("ogre"), byId("angel"), byId("demon")];
  const possibles = [...peeked, ...phantom];
  const view: BrainView = { studentId: 0, round: 1, phase: "commit",
    myScore: 0, oppScore: 0, myHand: [], burned: [], peeked, shieldOff: 0, echoNext: false, rngState: 0 };
  const w = beliefWeights(view, possibles);
  const sumPeeked = peeked.reduce((a, c) => a + (w.get(c.id) ?? 0), 0);
  const sumPhantom = phantom.reduce((a, c) => a + (w.get(c.id) ?? 0), 0);
  check("belief: 100% on peeked", Math.abs(sumPeeked - 1) < 1e-9, `sum=${sumPeeked.toFixed(4)}`);
  check("belief: 0% on phantoms", Math.abs(sumPhantom) < 1e-9, `sum=${sumPhantom.toFixed(4)}`);
}

// ---------- harness (mirrors duel-live state threading) ----------
function kleinPick(state: DuelState): Card {
  const view = { ...brainView(state), peeked: [...state.p1Hand] } as any;
  return chooseGodCard(view, false);
}
function advance(state: DuelState, mine: Card, his: Card) {
  state.p1Hand = state.p1Hand.filter((c) => c.id !== mine.id);
  state.p2Hand = state.p2Hand.filter((c) => c.id !== his.id);
  state.burned.push(mine, his);
  const out = resolveRound({ p1Card: mine, p2Card: his, p1Score: state.p1Score, p2Score: state.p2Score,
    round: state.round, echoNext: state.echoNext, shieldOff: state.shieldOff });
  state.p1Score = Math.max(0, out.p1Score); state.p2Score = Math.max(0, out.p2Score);
  state.echoNext = out.echoNext; state.shieldOff = out.shieldOffAfter;
  if (!(state.p1Score >= SCORE_THRESHOLD || state.p2Score >= SCORE_THRESHOLD || state.round >= TOTAL_ROUNDS)) state.round += 1;
}
function randSeq(seed: number, hand: Card[]): Card[] {
  const arr = [...hand]; let st = seed * 7919 + 13;
  for (let i = arr.length - 1; i > 0; i--) { st = (st * 1103515245 + 12345) >>> 0; const j = st % (i + 1); [arr[i], arr[j]] = [arr[j], arr[i]]; }
  return arr;
}

// ---------- 10-seed deep-search regression ----------
{
  const N = 10;
  let w = 0, l = 0, d = 0, sum = 0, worst = 0;
  const rows: string[] = [];
  for (let seed = 1; seed <= N; seed++) {
    const s = createDuel({ seed, studentId: 2 });
    const seq = randSeq(seed, s.p1Hand);
    for (let r = 1; r <= TOTAL_ROUNDS; r++) {
      const his = kleinPick(s);
      const over = advance(s, seq[r - 1], his);
      if (over) break;
    }
    const diff = s.p2Score - s.p1Score;
    sum += diff; worst = Math.min(worst, diff);
    if (diff > 0) w++; else if (diff < 0) l++; else d++;
    rows.push(`s${seed}:${diff >= 0 ? "+" : ""}${diff}`);
  }
  console.log("  " + rows.join("  "));
  check("no catastrophic blowout (worst >= -20)", worst >= -20, `worst=${worst}`);
  check("brain nets a win vs random opp", w + d >= l, `W/L/D=${w}/${l}/${d}`);
  check("brain avg margin >= 0", sum / N >= 0, `avg=${(sum / N).toFixed(2)}`);
  console.log(`  [summary] W/L/D=${w}/${l}/${d}  avg margin=${(sum / N).toFixed(2)}  worst=${worst}`);
}

console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);

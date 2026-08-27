/* clean-tests/threshold-early-win.test.ts
   Verifies the engine's 20-point win threshold fires MID-GAME (before R7),
   not only at the end of 7 rounds. Drives a scripted duel where Klein (p2)
   piles up 21 by R3 and asserts the match ends immediately at R3, plus a
   control proving the threshold does NOT fire on low scores.
   Run: npx tsx clean-tests/threshold-early-win.test.ts
*/
import { createDuel, dispatch, CATALOGUE, TOTAL_ROUNDS, SCORE_THRESHOLD } from "../src/index.js";
import type { Card, DuelState } from "../src/index.js";

let failures = 0;
function check(name: string, cond: boolean, detail = "") {
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`);
  if (!cond) failures++;
}
const C = Object.fromEntries(CATALOGUE.map((c: Card) => [c.id, c]));

function lockBoth(s: DuelState, playerCardId: string, aiCardId: string): DuelState {
  s = dispatch(s, { t: "lock_ai", cardId: aiCardId }).state;
  s = dispatch(s, { t: "lock_player", cardId: playerCardId }).state;
  return s;
}

// Play one round (both locks), then advance to the next commit phase unless
// the match already ended on the 20-point threshold.
function playRound(s: DuelState, playerCardId: string, aiCardId: string): DuelState {
  s = lockBoth(s, playerCardId, aiCardId);
  if (s.phase === "reveal") s = dispatch(s, { t: "next_round" }).state;
  return s;
}

// ---------- main: threshold fires mid-game ----------
{
  let s = createDuel({
    seed: 1, studentId: 2,
    p1Hand: [C.bandit, C.ogre, C.witch, C.vampire, C.leviathan, C.reversal, C.void],
    p2Hand: [C.angel, C.seraph, C.valkyrie, C.wizard, C.knight, C.paladin, C.demon],
  });
  s = playRound(s, "bandit", "angel");    // R1: angel 12g vs bandit 1b → p2 +11
  s = playRound(s, "ogre", "seraph");     // R2: seraph 10g vs ogre 3b  → p2 +7  (18)
  s = playRound(s, "witch", "valkyrie");  // R3: valkyrie 8g vs witch 5b → p2 +3  (21) → threshold
  check("threshold fired before R7", s.phase === "over" && s.round < TOTAL_ROUNDS, `phase=${s.phase} round=${s.round}`);
  check("match ended at round 3 (mid-game)", s.round === 3, `round=${s.round}`);
  check("Klein (p2) is the winner", s.result?.winner === "p2", `winner=${s.result?.winner}`);
  check("p2 reached the 20 threshold", (s.p2Score ?? 0) >= SCORE_THRESHOLD, `p2=${s.p2Score}`);
}

// ---------- control: low scores do NOT trigger threshold early ----------
{
  let s = createDuel({
    seed: 2, studentId: 2,
    p1Hand: [C.bandit, C.ogre, C.witch, C.knight, C.wizard, C.vampire, C.leviathan],
    p2Hand: [C.paladin, C.knight, C.witch, C.wizard, C.vampire, C.leviathan, C.demon],
  });
  s = playRound(s, "bandit", "paladin");  // R1: paladin 2g vs bandit 1b → p2 +1
  s = playRound(s, "ogre", "knight");     // R2: knight 4g vs ogre 3b  → p2 +1
  s = playRound(s, "witch", "wizard");    // R3: wizard 6g vs witch 5b → p2 +1
  check("no early threshold on low scores", s.phase !== "over" && (s.p2Score ?? 0) < SCORE_THRESHOLD, `phase=${s.phase} p2=${s.p2Score}`);
}

console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);

/* clean-tests/_review-klein.ts
   For Klein's 3 losing matches, reconstruct each decision point from the log
   (both hands are fully known: Klein's order + You's 7 played cards) and ask the
   CURRENT brain (god.ts, deterministic) what it would pick. Compare to the log.
   Run: npx tsx clean-tests/_review-klein.ts
*/
import { resolveRound, CATALOGUE, type Card } from "../src/index.js";
import { chooseGodCard } from "../../ai-brain/src/index.js";

const byName = (n: string): Card => {
  const c = CATALOGUE.find((x) => x.name.toLowerCase() === n.toLowerCase());
  if (!c) throw new Error("no card " + n);
  return c;
};
type M = { seed: number; klein: string[]; you: string[] };
const matches: M[] = [
  { seed: 487029, klein: ["Void", "Paladin", "Knight", "Ward", "Echo", "Vampire", "Wizard"], you: ["Eclipse", "Oracle", "Leviathan", "Valkyrie", "Witch", "Ogre", "Angel"] },
  { seed: 495785, klein: ["Bandit", "Void", "Valkyrie", "Ogre", "Seraph", "Leviathan", "Witch"], you: ["Oracle", "Ward", "Demon", "Vampire", "Paladin", "Executioner", "Angel"] },
  { seed: 278131, klein: ["Vampire", "Bandit", "Paladin", "Echo", "Wizard", "Valkyrie", "Ward"], you: ["Ogre", "Oracle", "Knight", "Witch", "Demon", "Void", "Executioner"] },
];

for (const m of matches) {
  console.log(`\n=== seed ${m.seed} ===`);
  let kScore = 0, oScore = 0, echoNext = false, shieldOff = 0;
  for (let r = 1; r <= 7; r++) {
    const kRemain = m.klein.slice(r - 1).map(byName);
    const oRemain = m.you.slice(r - 1).map(byName);
    const view: any = { round: r, myHand: kRemain, myScore: kScore, oppScore: oScore, echoNext, shieldOff, peeked: oRemain, burned: [] };
    const pick = chooseGodCard(view, false);
    const actual = m.klein[r - 1];
    const tag = pick.name === actual ? "OK " : "DIFF";
    console.log(`  R${r}: brain->${pick.name.padEnd(11)} log->${actual.padEnd(11)} [${tag}]  Krem[${kRemain.map((c) => c.name).join(",")}] Yrem[${oRemain.map((c) => c.name).join(",")}] (${kScore}-${oScore})`);
    const out = resolveRound({ p1Card: byName(m.you[r - 1]), p2Card: byName(m.klein[r - 1]), p1Score: oScore, p2Score: kScore, round: r, echoNext, shieldOff });
    kScore = out.p2Score; oScore = out.p1Score; echoNext = out.echoNext; shieldOff = out.shieldOffAfter;
  }
  console.log(`  current-engine sim final: You ${oScore} - Klein ${kScore}`);
}

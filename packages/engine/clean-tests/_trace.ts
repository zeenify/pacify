/* clean-tests/_trace.ts — play-by-play resolution trace for Klein's 3 losses */
import { resolveRound, CATALOGUE, type Card } from "../src/index.js";
const byName = (n: string): Card => CATALOGUE.find((x) => x.name.toLowerCase() === n.toLowerCase())!;
type M = { seed: number; klein: string[]; you: string[] };
const matches: M[] = [
  { seed: 487029, klein: ["Void", "Paladin", "Knight", "Ward", "Echo", "Vampire", "Wizard"], you: ["Eclipse", "Oracle", "Leviathan", "Valkyrie", "Witch", "Ogre", "Angel"] },
  { seed: 495785, klein: ["Bandit", "Void", "Valkyrie", "Ogre", "Seraph", "Leviathan", "Witch"], you: ["Oracle", "Ward", "Demon", "Vampire", "Paladin", "Executioner", "Angel"] },
  { seed: 278131, klein: ["Vampire", "Bandit", "Paladin", "Echo", "Wizard", "Valkyrie", "Ward"], you: ["Ogre", "Oracle", "Knight", "Witch", "Demon", "Void", "Executioner"] },
];
for (const m of matches) {
  console.log(`\n========== seed ${m.seed} ==========`);
  let k = 0, o = 0, echo = false, shield = 0;
  for (let r = 1; r <= 7; r++) {
    const kc = byName(m.klein[r - 1]), yc = byName(m.you[r - 1]);
    const out = resolveRound({ p1Card: yc, p2Card: kc, p1Score: o, p2Score: k, round: r, echoNext: echo, shieldOff: shield });
    const tags: string[] = [];
    if (out.voided) tags.push("VOID");
    if (out.eclipseFired) tags.push("ECLIPSE");
    if (out.wardBlocked) tags.push("WARD");
    if (out.reversalSwapped) tags.push("SWAP");
    if (out.scoreWiped) tags.push("EXEC->" + out.scoreWiped.side);
    if (out.echoNext) tags.push("NEXTx2");
    console.log(`R${r}: You ${yc.name}(${yc.power}${yc.align ?? ""}) vs Klein ${kc.name}(${kc.power}${kc.align ?? ""})  -> You+${out.p1Points} Klein+${out.p2Points} ${tags.join(" ") || "-"}   [cum You ${out.p1Score} - Klein ${out.p2Score}]`);
    k = out.p2Score; o = out.p1Score; echo = out.echoNext; shield = out.shieldOffAfter;
  }
  console.log(`FINAL via current engine: You ${o} - Klein ${k}`);
}

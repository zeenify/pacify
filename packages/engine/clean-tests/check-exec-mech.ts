/* clean-tests/check-exec-mech.ts
   Verifies the EXECUTE and REVERSAL mechanics in round 1, so we know the
   brain isn't mis-valuing them due to a bug in resolveRound.
   Run: npx tsx clean-tests/check-exec-mech.ts
*/
import { resolveRound, CATALOGUE, type Card } from "../src/index.js";
const byName = (n: string) => CATALOGUE.find((c) => c.name.toLowerCase() === n.toLowerCase())!;

console.log("== EXECUTIONER round 1 (Klein=Executioner), human plays X ==");
for (const hn of ["Vampire", "Leviathan", "Angel", "Ogre"]) {
  const k = byName("Executioner"), h = byName(hn);
  const o = resolveRound({ p1Card: h, p2Card: k, p1Score: 0, p2Score: 0, round: 1, echoNext: false, shieldOff: 0 });
  console.log(`  human ${hn}(${h.power}) -> klein ${o.p2Score}, human ${o.p1Score}  (expect klein 0; human wiped to 0 if power>=7)`);
}
console.log("== REVERSAL round 1 (Klein=Reversal), human plays X ==");
for (const hn of ["Vampire", "Angel", "Ogre"]) {
  const k = byName("Reversal"), h = byName(hn);
  const o = resolveRound({ p1Card: h, p2Card: k, p1Score: 0, p2Score: 0, round: 1, echoNext: false, shieldOff: 0 });
  console.log(`  human ${hn}(${h.power}) -> before-swap klein? after: klein ${o.p2Score}, human ${o.p1Score}`);
}

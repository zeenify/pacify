/* Emits the exact card roster + rules constants the motion graphics will render,
   read live from the engine. Run: npx tsx tools/motion/gen-data.ts

   This exists so the video cannot drift from the rules. Nothing here is typed by
   hand from memory, and apps/web/app/howto.tsx (which is stale — it claims 5
   rounds, 5 tricks and Ward +3) is deliberately not consulted. */

import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  CATALOGUE,
  NUMBERS,
  TRICKS,
  TOTAL_ROUNDS,
  HAND_SIZE,
  MAX_TRICKS_PER_HAND,
  SCORE_THRESHOLD,
  WARD_FLAT_POINTS,
  ORACLE_PEEK_COUNT,
  ECLIPSE_ROUNDS,
  EXECUTIONER_THRESHOLD,
  roundMultiplier,
} from "../../packages/engine/src/index.js";

/* Trick resolution order, transcribed from packages/engine/src/resolve.ts:
     1. Void          — returns immediately, kills everything (line ~69)
     1b. Eclipse      — soft void + shields-off window (line ~78)
     2. Ward          — blocks an opposing trick, and cancels Eclipse (line ~91)
     3a. Echo         — voids points, sets next-round double (line ~114)
     3b. base clash   — skipped when Echo/Eclipse voided (line ~122)
     3c. Oracle       — peeks even through a void (line ~130)
     3d. Reversal     — swaps totals AFTER scoring (line ~134)
     3e. Executioner  — wipes a 7+ number committer's total (line ~147)
   Void and Ward are the only hard blocks; Echo/Eclipse/Oracle fire alongside. */
const TRICK_PRIORITY = ["Void", "Eclipse", "Ward", "Echo", "Reversal", "Executioner", "Oracle"];

const out = {
  generatedAt: new Date().toISOString(),
  source: "packages/engine/src",
  constants: {
    TOTAL_ROUNDS,
    HAND_SIZE,
    MAX_TRICKS_PER_HAND,
    SCORE_THRESHOLD,
    WARD_FLAT_POINTS,
    ORACLE_PEEK_COUNT,
    ECLIPSE_ROUNDS,
    EXECUTIONER_THRESHOLD,
    CATALOGUE_SIZE: CATALOGUE.length,
    NUMBER_COUNT: NUMBERS.length,
    TRICK_COUNT: TRICKS.length,
  },
  trickPriority: TRICK_PRIORITY,
  // Sampled from the real engine function, so the on-screen claim is verified.
  multipliers: {
    round1: roundMultiplier(1, false),
    round7: roundMultiplier(TOTAL_ROUNDS, false),
    round1Echo: roundMultiplier(1, true),
    round7Echo: roundMultiplier(TOTAL_ROUNDS, true),
    cap: 3,
  },
  numbers: NUMBERS.map((c) => ({ id: c.id, name: c.name, power: c.power, align: c.align })),
  tricks: TRICKS.map((c) => ({ id: c.id, name: c.name, power: c.power })),
  catalogue: CATALOGUE.map((c) =>
    c.kind === "number"
      ? { kind: "number", id: c.id, name: c.name, power: c.power, align: c.align }
      : { kind: "trick", id: c.id, name: c.name, power: c.power },
  ),
};

const here = dirname(fileURLToPath(import.meta.url));
const dest = join(here, "src", "data.json");
writeFileSync(dest, JSON.stringify(out, null, 2) + "\n", "utf8");

console.log(`wrote ${dest}`);
console.log(`  ${out.constants.CATALOGUE_SIZE} cards (${out.constants.NUMBER_COUNT} number, ${out.constants.TRICK_COUNT} trick)`);
console.log(`  rounds=${TOTAL_ROUNDS} hand=${HAND_SIZE} maxTricks=${MAX_TRICKS_PER_HAND} threshold=${SCORE_THRESHOLD}`);
console.log(`  ward=${WARD_FLAT_POINTS} oracle=${ORACLE_PEEK_COUNT} eclipse=${ECLIPSE_ROUNDS} exec=${EXECUTIONER_THRESHOLD}`);
console.log(`  multipliers: r1=${out.multipliers.round1} r7=${out.multipliers.round7} r7+echo=${out.multipliers.round7Echo} (cap ${out.multipliers.cap})`);

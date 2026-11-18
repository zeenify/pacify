/* GIMMICK CRASH COURSE DATA — the seven-card teaching order, the demonstration
   card each gimmick is shown against, and the one-line/one-explanation script.
   Kept out of the duel screen so the real render pipeline stays focused. */

import { cardById, type CardId } from "@pacify/engine";
import { VICTOR_TRICKS, VICTOR_TRICKS_FINAL, VICTOR_TRICKS_INTRO, type VictorLine } from "./victor";

export const TOTAL_TRICKS = 7;

/* nullify → block → setup → setup → info → wipe → swap */
export const TRICK_ORDER: CardId[] = ["void", "ward", "echo", "eclipse", "oracle", "executioner", "reversal"];

/* The demo opponent's card for each lesson. Chosen so the effect is visible:
   a 12 for Void, a trick for Ward to block, equal 5s for Oracle's peek, a 10
   for the execution threshold, a 1 for Reversal to score before swapping. */
export const TRICK_DEMO: Record<string, CardId> = {
  void: "angel",
  ward: "oracle",
  echo: "knight",
  eclipse: "leviathan",
  oracle: "witch",
  executioner: "seraph",
  reversal: "bandit",
};

export type TrickPhase = "intro" | "setup" | "reveal" | "explain" | "final";

export function trickLineFor(index: number, phase: TrickPhase): VictorLine | null {
  if (phase === "intro") return VICTOR_TRICKS_INTRO;
  if (phase === "setup") return VICTOR_TRICKS[index * 2] ?? null;
  if (phase === "explain") return VICTOR_TRICKS[index * 2 + 1] ?? null;
  if (phase === "final") return VICTOR_TRICKS_FINAL;
  return null;
}

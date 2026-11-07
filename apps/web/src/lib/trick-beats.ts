import type { RoundOutcome } from "@pacify/engine";

export type TrickBeats = {
  void: boolean;
  eclipse: boolean;
  echo: boolean;
  ward: boolean;
  execFail: "p1" | "p2" | null; // the misfiring Executioner's OWNER
  reversal: boolean;
  executioner: "p1" | "p2" | null; // the beheaded side
  oracle: "p1" | "p2" | null;
};

/** Which trick cinematics a reveal plays. Keyed off the engine outcome, never the
    card names alone: a trick Void devoured or Ward burned did not fire, so it must not animate. */
export function trickBeats(out: RoundOutcome): TrickBeats {
  const { p1Card, p2Card } = out;
  const voidFired = p1Card.id === "void" || p2Card.id === "void";
  const execOwner = p1Card.id === "executioner" ? "p1" : p2Card.id === "executioner" ? "p2" : null;
  const execSwung = execOwner !== null && !voidFired && !out.wardBlocked;
  return {
    void: voidFired,
    eclipse: out.eclipseFired,
    echo: out.echoNext,
    ward: out.wardBlocked,
    execFail: execSwung && !out.scoreWiped ? execOwner : null,
    reversal: out.reversalSwapped,
    executioner: out.scoreWiped?.side ?? null,
    oracle: out.peek?.side ?? null,
  };
}

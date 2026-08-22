import type { Card, RoundResult } from "./types.js";
import { isVoid, isEcho } from "./cards.js";

function isWard(c: Card) {
  return c.kind === "trick" && c.name === "Ward";
}
function isReversal(c: Card) {
  return c.kind === "trick" && c.name === "Reversal";
}
function isOracle(c: Card) {
  return c.kind === "trick" && c.name === "Oracle";
}

export function resolveRound(
  p1Card: Card,
  p2Card: Card,
  p1Score: number,
  p2Score: number,
  round: number,
  nextDouble: boolean,
): RoundResult & { p1Score: number; p2Score: number } {
  let p1Points = 0;
  let p2Points = 0;
  let voided = false;
  let nextDoubleOut = false;
  let wardBlocked = false;
  let reversalSwapped = false;
  let peek: string[] | undefined;

  const p1Void = isVoid(p1Card);
  const p2Void = isVoid(p2Card);
  const p1Echo = isEcho(p1Card);
  const p2Echo = isEcho(p2Card);
  const p1Ward = isWard(p1Card);
  const p2Ward = isWard(p2Card);

  // 1. Void top priority — voids everything, even Echo/Reversal/Ward
  if (p1Void || p2Void) {
    return {
      p1Points: 0,
      p2Points: 0,
      voided: true,
      nextDouble: false,
      p1Score,
      p2Score,
    };
  }

  // 2. Ward second priority — blocks opponent trick
  const p1Trick = p1Card.kind === "trick";
  const p2Trick = p2Card.kind === "trick";
  // Ward vs trick
  if (p1Ward && p2Trick) {
    p1Points = 3;
    wardBlocked = true;
    // blocked trick does not activate (no peek/swap/double)
    return {
      p1Points,
      p2Points: 0,
      voided: false,
      nextDouble: false,
      wardBlocked,
      p1Score: p1Score + p1Points,
      p2Score,
    };
  }
  if (p2Ward && p1Trick) {
    p2Points = 3;
    wardBlocked = true;
    return {
      p1Points: 0,
      p2Points,
      voided: false,
      nextDouble: false,
      wardBlocked,
      p1Score,
      p2Score: p2Score + p2Points,
    };
  }
  // Ward vs Ward both get 3 (both saw a trick)
  if (p1Ward && p2Ward) {
    return {
      p1Points: 3,
      p2Points: 3,
      voided: false,
      nextDouble: false,
      wardBlocked: true,
      p1Score: p1Score + 3,
      p2Score: p2Score + 3,
    };
  }

  // 3. Echo — voids current round (0 pts) but doubles next, does NOT block other trick
  let echoActive = false;
  if (p1Echo || p2Echo) {
    voided = true;
    echoActive = true;
    nextDoubleOut = true;
    // round scores 0 this round, but other trick still activates below
  }

  // Oracle peek — if not blocked, mark peek (caller can fill with actual hidden cards)
  if (!echoActive || true) {
    // both Oracle and Reversal still fire even when Echo voided the points
    if (isOracle(p1Card) || isOracle(p2Card)) {
      peek = ["peek1", "peek2"]; // placeholder — heuristic picks real names
    }
  }

  // If Echo voided, points stay 0 for this round, but still handle Reversal swap after
  let baseP1 = 0;
  let baseP2 = 0;

  if (!voided) {
    // Normal clash — only if not Echo-voided
    const p1Power = p1Card.power as number;
    const p2Power = p2Card.power as number;
    if (p1Power > p2Power) {
      const diff = p1Power - p2Power;
      const sameAlign =
        p1Card.kind === "number" &&
        p2Card.kind === "number" &&
        p1Card.align === p2Card.align;
      baseP1 = sameAlign ? 0 : diff;
    } else if (p2Power > p1Power) {
      const diff = p2Power - p1Power;
      const sameAlign =
        p1Card.kind === "number" &&
        p2Card.kind === "number" &&
        p1Card.align === p2Card.align;
      baseP2 = sameAlign ? 0 : diff;
    } else {
      baseP1 = 0;
      baseP2 = 0;
    }

    // Round 5 ×2, Echo next ×2 → capped at ×3
    let mult = 1;
    if (round === 5) mult += 1;
    if (nextDouble) mult += 1;
    if (mult > 3) mult = 3;
    // nextDouble here is incoming from previous round
    if (nextDouble || round === 5) {
      baseP1 *= mult;
      baseP2 *= mult;
    }
    p1Points = baseP1;
    p2Points = baseP2;
  } else if (echoActive) {
    // Echo voided this round, but nextDoubleOut already true
    // No points this round, multiplier will apply next round
    p1Points = 0;
    p2Points = 0;
    // Still allow Reversal swap below even though voided
  }

  let newP1 = p1Score + p1Points;
  let newP2 = p2Score + p2Points;

  // Reversal swap — after scoring, even on voided/tie, if not blocked
  const p1Rev = isReversal(p1Card);
  const p2Rev = isReversal(p2Card);
  if ((p1Rev || p2Rev) && !wardBlocked) {
    // singleton guarantees only one Reversal in play, but handle both
    reversalSwapped = true;
    [newP1, newP2] = [newP2, newP1];
  }

  return {
    p1Points,
    p2Points,
    voided,
    nextDouble: nextDoubleOut,
    peek,
    wardBlocked,
    reversalSwapped,
    p1Score: newP1,
    p2Score: newP2,
  };
}

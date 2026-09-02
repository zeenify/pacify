import { expect, it } from "vitest";
import { playDuel } from "../../src/arena.js";

// The core soundness property of the solver: with kappa = 1 the brain plays
// pure maximin, and a CLAIRVOYANT adversary (reads the brain's locked card
// before committing, then plays its own optimal punishment) can never push the
// result below the deal's guaranteed value. This is the "cannot lose a won
// deal, cannot be baited" guarantee in practice.
it("pure-robust brain vs an optimal clairvoyant reproduces the deal's guaranteed value exactly", async () => {
  const seeds = Array.from({ length: 12 }, (_, i) => 1000 + i * 7919);
  for (const seed of seeds) {
    const r = playDuel(seed, { robustness: 1 }, "clairvoyant");
    // Both sides playing their value policies walks the game value exactly:
    // the duel payoff must EQUAL the solver's kappa=1 value of the deal.
    expect(r.payoff).toBe(r.robustValue);
    // Yield so the vitest worker can flush IPC between multi-second solves.
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
});

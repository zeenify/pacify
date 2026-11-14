import { createDuel, dispatch, type Card, type CardId } from "@pacify/engine";

export type EncounterRound = { round: number; p1: CardId; p2: CardId };
export type KleinPose = "neutral" | "welcoming" | "playful" | "calculating" | "thoughtful" | "serious";
export type KleinReplyChoice = { id: string; text: string; response: { text: string; pose: KleinPose } };
export type SceneLine = { text: string; pose: KleinPose };
export type KleinScene = { chapter: string; lines: SceneLine[]; exchange?: { choices: KleinReplyChoice[] } };
export type EncounterScene = {
  id: string;
  scene: KleinScene | null;
  readCount: number;
  started: boolean;
  completed: boolean;
};
export type EncounterStart = EncounterScene & { seed: number; transcript: EncounterRound[]; p1Locked: CardId | null };
export type EpilogueScene = { id: string; result: "win" | "loss" | "draw" | null; epilogue: KleinScene | null };

// Prewarmed encounters: the duel result screen creates the next encounter while the
// player reads the epilogue, so the rematch prelude is already on the server.
let warmedEncounterId: string | null = null;
export function warmEncounter(id: string) {
  warmedEncounterId = id;
}
export function consumeWarmedEncounter(): string {
  const id = warmedEncounterId ?? crypto.randomUUID();
  warmedEncounterId = null;
  return id;
}
export const kleinChallengePath = () => `/story?encounter=${consumeWarmedEncounter()}`;
export const KLEIN_PORTRAITS: Record<KleinPose, string> = {
  neutral: "/dialog-images/2-clubs/neutral.png",
  welcoming: "/dialog-images/2-clubs/hand-outstretched.png",
  playful: "/dialog-images/2-clubs/hand-behind-neck-smiling.png",
  calculating: "/dialog-images/2-clubs/adjusting-glasses.png",
  thoughtful: "/dialog-images/2-clubs/hands-on-chin-thinking.png",
  serious: "/dialog-images/2-clubs/serious-slightlyneutral.png",
};

export function restoreEncounter(seed: number, transcript: EncounterRound[]) {
  let state = createDuel({ seed, studentId: 2 });
  const playerPeeked: Card[] = [];
  let kleinPeekCount = 0;
  const results: { round: number; klein: string; you: string; kleinPts: number; youPts: number; kleinScore: number; youScore: number; note?: string }[] = [];
  const rounds: (EncounterRound & { p1Score: number; p2Score: number; aiAttempt: number })[] = [];
  const label = (c: Card) => c.kind === "trick" ? `${c.name} [trick]` : `${c.name} [${c.power} ${c.align.toUpperCase()}]`;
  for (const row of transcript) {
    if (state.phase !== "commit" || row.round !== state.round || !state.p1Hand.some((c) => c.id === row.p1) || !state.p2Hand.some((c) => c.id === row.p2)) {
      throw new Error("This encounter could not be restored. Return to the campaign to challenge again.");
    }
    state = dispatch(state, { t: "lock_ai", cardId: row.p2 }).state;
    const resolved = dispatch(state, { t: "lock_player", cardId: row.p1 });
    state = resolved.state;
    const event = resolved.events.find((e) => e.t === "round_resolved")!;
    const out = event.outcome;
    if (event.peekedCards?.side === "p1") playerPeeked.push(...event.peekedCards.cards);
    if (event.peekedCards?.side === "p2") kleinPeekCount += event.peekedCards.cards.length;
    results.push({ round: row.round, klein: label(out.p2Card), you: label(out.p1Card),
      kleinPts: out.p2Points, youPts: out.p1Points, kleinScore: state.p2Score, youScore: state.p1Score });
    rounds.push({ ...row, p1Score: state.p1Score, p2Score: state.p2Score, aiAttempt: 0 });
    if (state.phase === "reveal") state = dispatch(state, { t: "next_round" }).state;
  }
  return { state, results, rounds, playerPeeked, kleinPeekCount };
}

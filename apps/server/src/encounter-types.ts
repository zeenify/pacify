import type { CardId } from "@pacify/engine";
import type { RoundResult } from "./personality.js";
import type { EncounterCommit, EncounterRound } from "./encounter-replay.js";

export type KleinPose = "neutral" | "welcoming" | "playful" | "calculating" | "thoughtful" | "serious";
export type KleinReplyChoice = { id: string; text: string; response: { text: string; pose: KleinPose } };
export type KleinScene = {
  chapter: string;
  lines: { text: string; pose: KleinPose }[];
  /** Optional exchange, only when Klein's final line genuinely asks for a reply.
   *  Choices are player-voiced; each response is scripted and server-resolved. */
  exchange?: { choices: KleinReplyChoice[] };
};
export type EncounterSpeech = { key: string; round: number; beat: "thinking" | "commit" | "reveal"; message: string };
export type EncounterGeneration = {
  sceneSource?: "generated" | "fallback";
  sceneLatencyMs?: number;
  sceneAudited?: boolean;
  epilogueSource?: "generated" | "fallback";
  epilogueLatencyMs?: number;
  epilogueAudited?: boolean;
  memorySource?: "generated" | "fallback";
  memoryLatencyMs?: number;
};
export type EncounterData = {
  scene: KleinScene | null;
  readCount: number;
  started: boolean;
  transcript: EncounterRound[];
  locks: Partial<Record<number, CardId>>;
  commits: (EncounterCommit & { attempt: number })[];
  speech: EncounterSpeech[];
  result: "win" | "loss" | "draw" | null;
  epilogue: KleinScene | null;
  epilogueReadCount: number;
  /** the player walked out mid-duel — the seat keeps the win, no epilogue follows */
  forfeited?: boolean;
  replies: { choiceId: string; text: string; response: string }[];
  generation: EncounterGeneration;
};
export type EncounterRecord = {
  id: string;
  userId: string;
  studentId: number;
  seed: number;
  data: EncounterData;
  createdAt: Date;
  completedAt: Date | null;
};
export type KleinMemory = {
  summary: string;
  moments: { round: number; text: string }[];
  playerResult: "win" | "loss" | "draw";
  occurredAt: string; // ISO timestamp of the completed encounter
};
export type KleinMatch = {
  result: "win" | "loss" | "draw";
  playerScore: number;
  kleinScore: number;
  rounds: RoundResult[];
};
export type KleinHistory = {
  verified: { games: number; wins: number; losses: number; draws: number };
  hasLegacyHistory: boolean;
  hasMet: boolean;
  playerName: string | null;
  lastPlayedAt: string | null;
  recentMatches: { result: "win" | "loss" | "draw"; playerScore: number; kleinScore: number; rounds: RoundResult[]; occurredAt: string }[];
  recentSpeech: string[];
  playerReplies: string[];
  memories: KleinMemory[];
};
export type EncounterStore = {
  create(userId: string, id: string, seed: number, studentId?: number): Promise<EncounterRecord | null>;
  read(userId: string, id: string): Promise<EncounterRecord | null>;
  change(userId: string, id: string, edit: (record: EncounterRecord) => void): Promise<EncounterRecord | null>;
  history(userId: string, excludeId: string, studentId?: number): Promise<KleinHistory>;
};

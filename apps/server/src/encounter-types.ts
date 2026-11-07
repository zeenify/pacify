import type { CardId } from "@pacify/engine";
import type { RoundResult } from "./personality.js";
import type { EncounterCommit, EncounterRound } from "./encounter-replay.js";

export type KleinPose = "neutral" | "welcoming" | "playful" | "calculating" | "thoughtful" | "serious";
export type KleinScene = { chapter: string; lines: { text: string; pose: KleinPose }[] };
export type EncounterSpeech = { key: string; round: number; beat: "thinking" | "commit"; message: string };
export type EncounterData = {
  scene: KleinScene | null;
  readCount: number;
  started: boolean;
  transcript: EncounterRound[];
  locks: Partial<Record<number, CardId>>;
  commits: (EncounterCommit & { attempt: number })[];
  speech: EncounterSpeech[];
  result: "win" | "loss" | "draw" | null;
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
export type KleinHistory = {
  verified: { games: number; wins: number; losses: number; draws: number };
  hasLegacyHistory: boolean;
  hasMet: boolean;
  recentMatches: { result: "win" | "loss" | "draw"; playerScore: number; kleinScore: number; rounds: RoundResult[] }[];
  recentSpeech: string[];
};
export type EncounterStore = {
  create(userId: string, id: string, seed: number): Promise<EncounterRecord | null>;
  read(userId: string, id: string): Promise<EncounterRecord | null>;
  change(userId: string, id: string, edit: (record: EncounterRecord) => void): Promise<EncounterRecord | null>;
  history(userId: string, excludeId: string): Promise<KleinHistory>;
};

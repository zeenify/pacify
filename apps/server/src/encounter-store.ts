import { and, desc, eq, ne, sql } from "drizzle-orm";
import { db, encounters, matches, progress, stats } from "@pacify/db";
import type { EncounterData, EncounterRecord, EncounterStore } from "./encounter-types.js";
import { EncounterError } from "./encounters.js";
import { replayEncounter } from "./encounter-replay.js";

const record = (row: typeof encounters.$inferSelect): EncounterRecord => ({ ...row, data: row.data as unknown as EncounterData });
const key = (userId: string, id: string) => and(eq(encounters.userId, userId), eq(encounters.id, id));

export function createEncounterStore(database: typeof db): EncounterStore {
  return {
  async create(userId, id, seed) {
    const [existing] = await database.select().from(encounters).where(eq(encounters.id, id)).limit(1);
    if (existing) return existing.userId === userId ? record(existing) : null;
    const [rate] = await database.select({ count: sql<number>`count(*)::int` }).from(encounters)
      .where(and(eq(encounters.userId, userId), sql`${encounters.createdAt} > now() - interval '1 minute'`));
    if (rate.count >= 8) throw new EncounterError(429, "Take a moment before starting another encounter");
    const data: EncounterData = { scene: null, readCount: 0, started: false, transcript: [], locks: {}, commits: [], speech: [], result: null };
    await database.insert(encounters).values({ id, userId, studentId: 1, seed, data }).onConflictDoNothing();
    return this.read(userId, id);
  },
  async read(userId, id) {
    const [row] = await database.select().from(encounters).where(key(userId, id)).limit(1);
    return row ? record(row) : null;
  },
  async change(userId, id, edit) {
    return database.transaction(async (tx) => {
      const [row] = await tx.select().from(encounters).where(key(userId, id)).for("update");
      if (!row) return null;
      const current = record(row);
      const wasComplete = !!current.completedAt;
      edit(current);
      await tx.update(encounters).set({ data: current.data, completedAt: current.completedAt }).where(key(userId, id));
      if (!wasComplete && current.completedAt) {
        const verified = replayEncounter(current.seed, current.data.transcript, current.data.commits);
        const won = current.data.result === "win", lost = current.data.result === "loss", draw = current.data.result === "draw";
        await tx.insert(matches).values({ id, userId, studentId: 1, seed: current.seed,
          result: won ? "win" : lost ? "lose" : "draw", totalScore: verified.state.p1Score, oppScore: verified.state.p2Score });
        await tx.insert(progress).values({ userId, studentId: 1, attempts: 1, wins: +won, losses: +lost, draws: +draw,
          cleared: won, bestScore: verified.state.p1Score, firstClearedAt: won ? current.completedAt : null })
          .onConflictDoUpdate({ target: [progress.userId, progress.studentId], set: {
            attempts: sql`${progress.attempts} + 1`, wins: sql`${progress.wins} + ${+won}`,
            losses: sql`${progress.losses} + ${+lost}`, draws: sql`${progress.draws} + ${+draw}`,
            cleared: sql`${progress.cleared} OR ${won}`, bestScore: sql`GREATEST(${progress.bestScore}, ${verified.state.p1Score})`,
            firstClearedAt: sql`COALESCE(${progress.firstClearedAt}, ${won ? current.completedAt : null})`,
          } });
        await tx.insert(stats).values({ userId, wins: +won, losses: +lost, draws: +draw, streak: +won })
          .onConflictDoUpdate({ target: stats.userId, set: {
            wins: sql`${stats.wins} + ${+won}`, losses: sql`${stats.losses} + ${+lost}`, draws: sql`${stats.draws} + ${+draw}`,
            streak: won ? sql`${stats.streak} + 1` : lost ? 0 : stats.streak, updatedAt: current.completedAt,
          } });
      }
      return current;
    });
  },
  async history(userId, excludeId) {
    const scope = and(eq(encounters.userId, userId), eq(encounters.studentId, 1), ne(encounters.id, excludeId));
    const [counts] = await database.select({
      games: sql<number>`count(*)::int`,
      wins: sql<number>`count(*) filter (where ${encounters.data}->>'result' = 'win')::int`,
      losses: sql<number>`count(*) filter (where ${encounters.data}->>'result' = 'loss')::int`,
      draws: sql<number>`count(*) filter (where ${encounters.data}->>'result' = 'draw')::int`,
    }).from(encounters).where(and(scope, sql`${encounters.completedAt} IS NOT NULL`));
    const [legacy] = await database.select({ attempts: sql<number>`coalesce(sum(${progress.attempts}), 0)::int`,
      kleinAttempts: sql<number>`coalesce(sum(${progress.attempts}) filter (where ${progress.studentId} = 1), 0)::int` })
      .from(progress).where(eq(progress.userId, userId));
    const recent = await database.select().from(encounters).where(and(scope, sql`(${encounters.data}->>'started' = 'true' OR (${encounters.data}->>'readCount')::int > 0)`))
      .orderBy(desc(encounters.createdAt)).limit(3);
    const finished = await database.select().from(encounters).where(and(scope, sql`${encounters.completedAt} IS NOT NULL`))
      .orderBy(desc(encounters.completedAt)).limit(3);
    return {
      verified: counts, hasLegacyHistory: legacy.attempts > counts.games,
      hasMet: recent.length > 0 || legacy.kleinAttempts > 0,
      recentMatches: finished.map((row) => {
        const r = record(row), verified = replayEncounter(r.seed, r.data.transcript, r.data.commits);
        return { result: r.data.result!, playerScore: verified.state.p1Score, kleinScore: verified.state.p2Score, rounds: verified.results };
      }),
      recentSpeech: recent.reverse().flatMap((row) => {
        const r = record(row);
        return [...(r.data.scene?.lines.slice(0, r.data.readCount).map((l) => l.text) ?? []), ...r.data.speech.map((s) => s.message)];
      }).slice(-8),
    };
  },
  };
}

export const encounterStore = createEncounterStore(db);

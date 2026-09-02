import type { FastifyInstance } from "fastify";
import { eq, sql } from "drizzle-orm";import jwt from "jsonwebtoken";
import { db, progress, stats, users } from "@pacify/db";

const SECRET = process.env.JWT_SECRET ?? "pacify-dev-secret-change-me";
const COOKIE = "pacify_token";

function uidFromReq(req: any): string | null {
  try {
    const token = req.cookies?.[COOKIE];
    if (!token) return null;
    return (jwt.verify(token, SECRET) as any)?.uid ?? null;
  } catch {
    return null;
  }
}

export type CampaignStudent = { id: number; seat: string; title: string; tier: number };

// PLACEHOLDER roster — the thirteen will be authored one by one later
export const STUDENTS: CampaignStudent[] = Array.from({ length: 13 }, (_, i) => ({
  id: i + 1,
  seat: `SEAT_${String(i + 1).padStart(2, "0")}`,
  title: "UNREVEALED",
  tier: i + 1,
}));

export async function campaignRoutes(app: FastifyInstance) {
  app.get("/campaign", async (req, reply) => {
    const uid = uidFromReq(req);
    if (!uid) return reply.code(401).send({ error: "NOT LOGGED IN" });

    const [user] = await db.select({ id: users.id }).from(users).where(eq(users.id, uid)).limit(1);
    if (!user) return reply.code(401).send({ error: "NOT LOGGED IN" });

    const progRows = await db
      .select()
      .from(progress)
      .where(eq(progress.userId, uid));

    const byStudent = new Map(progRows.map((p) => [p.studentId, p]));

    return {
      students: STUDENTS.map((s) => {
        const p = byStudent.get(s.id);
        return {
          ...s,
          cleared: p?.cleared ?? false,
          attempts: p?.attempts ?? 0,
          wins: p?.wins ?? 0,
          losses: p?.losses ?? 0,
          bestScore: p?.bestScore ?? 0,
        };
      }),
      clearedCount: STUDENTS.filter((s) => byStudent.get(s.id)?.cleared).length,
    };
  });

  // Duel result — the client sends the finished duel's scores; per-student progress
  // and the player's global stats are upserted in one shot. Scores come from the
  // client for now; replay verification against the seed lands with /match-result.
  app.post("/campaign/result", async (req, reply) => {
    const uid = uidFromReq(req);
    if (!uid) return reply.code(401).send({ error: "NOT LOGGED IN" });

    const { studentId, p1Score, p2Score, rounds, seed, transcript } = (req.body ?? {}) as {
      studentId?: number;
      p1Score?: number;
      p2Score?: number;
      rounds?: number;
      seed?: number;
      transcript?: unknown[];
    };
    if (
      typeof studentId !== "number" || !STUDENTS.some((s) => s.id === studentId) ||
      typeof p1Score !== "number" || typeof p2Score !== "number" ||
      p1Score < 0 || p2Score < 0 || p1Score > 200 || p2Score > 200
    ) {
      return reply.code(400).send({ error: "INVALID RESULT" });
    }
    const result = p1Score > p2Score ? "win" : p2Score > p1Score ? "loss" : "draw";
    const won = result === "win";

    await db
      .insert(progress)
      .values({
        userId: uid,
        studentId,
        attempts: 1,
        wins: won ? 1 : 0,
        losses: result === "loss" ? 1 : 0,
        draws: result === "draw" ? 1 : 0,
        bestScore: p1Score,
        cleared: won,
        firstClearedAt: won ? new Date() : null,
      })
      .onConflictDoUpdate({
        target: [progress.userId, progress.studentId],
        set: {
          attempts: sql`${progress.attempts} + 1`,
          wins: sql`${progress.wins} + ${won ? 1 : 0}`,
          losses: sql`${progress.losses} + ${result === "loss" ? 1 : 0}`,
          draws: sql`${progress.draws} + ${result === "draw" ? 1 : 0}`,
          bestScore: sql`GREATEST(${progress.bestScore}, ${p1Score})`,
          cleared: sql`${progress.cleared} OR ${won}`,
          firstClearedAt: sql`COALESCE(${progress.firstClearedAt}, CASE WHEN ${won} THEN now() END)`,
        },
      });

    await db
      .insert(stats)
      .values({
        userId: uid,
        wins: won ? 1 : 0,
        losses: result === "loss" ? 1 : 0,
        draws: result === "draw" ? 1 : 0,
        streak: won ? 1 : 0,
      })
      .onConflictDoUpdate({
        target: stats.userId,
        set: {
          wins: sql`${stats.wins} + ${won ? 1 : 0}`,
          losses: sql`${stats.losses} + ${result === "loss" ? 1 : 0}`,
          draws: sql`${stats.draws} + ${result === "draw" ? 1 : 0}`,
          streak: result === "loss" ? sql`0` : won ? sql`${stats.streak} + 1` : sql`${stats.streak}`,
          updatedAt: new Date(),
        },
      });

    return { ok: true, result, cleared: won };
  });
}

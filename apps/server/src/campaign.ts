import type { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";import jwt from "jsonwebtoken";
import { db, progress, users } from "@pacify/db";

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
}

import type { FastifyInstance } from "fastify";
import { desc, eq } from "drizzle-orm";
import { db, stats, users } from "@pacify/db";

/* deterministic NPC rivals so the wall never looks empty while the player
   base is small — same seed order every request */
const NPC_NAMES = [
  "SILENT_KAITO",
  "NOODLE_EMPRESS",
  "CHAIR_KUN",
  "POMADE_PRINCE",
  "GLOOMY_RIN",
  "DELINQ_DAIKI",
  "SEAT_13",
  "GLASSES_GAKU",
  "CAFFEINE_YUKI",
  "NAPTIME_NAO",
  "SKIPCLASS_SORA",
  "TESTCASE_TSUKI",
  "HALLWAY_HANA",
];

type Row = {
  rank: number;
  name: string;
  isNpc: boolean;
  isMe: boolean;
  wins: number;
  losses: number;
  draws: number;
  streak: number;
  played: number;
  winRate: number;
  shameScore: number;
};

export async function shameRoutes(app: FastifyInstance) {
  // PUBLIC leaderboard — most shameful players first (most losses, tiebreak worst rate)
  app.get("/shame", async (req) => {
    const rows = await db
      .select({
        id: users.id,
        username: users.username,
        wins: stats.wins,
        losses: stats.losses,
        draws: stats.draws,
        streak: stats.streak,
      })
      .from(stats)
      .innerJoin(users, eq(stats.userId, users.id))
      .orderBy(desc(stats.losses))
      .limit(40);

    // who am I? (optional)
    let myId: string | null = null;
    try {
      const token = (req.cookies as any)?.pacify_token;
      if (token) {
        const jwt = await import("jsonwebtoken");
        const p = jwt.verify(token, process.env.JWT_SECRET ?? "pacify-dev-secret-change-me") as any;
        myId = p?.uid ?? null;
      }
    } catch {}

    const mapped: Row[] = rows.map((r) => {
      const played = r.wins + r.losses + r.draws;
      return {
        rank: 0,
        name: r.username ?? "UNCLAIMED",
        isNpc: false,
        isMe: !!myId && myId === r.id,
        wins: r.wins,
        losses: r.losses,
        draws: r.draws,
        streak: r.streak,
        played,
        winRate: played ? Math.round((r.wins / played) * 100) : 0,
        shameScore: r.losses * 3 - r.wins,
      };
    });

    // fill to 13 with NPC classmates (stable fake stats)
    let npcIdx = 0;
    while (mapped.length < 13 && npcIdx < NPC_NAMES.length) {
      const i = npcIdx++;
      const losses = 9 + ((i * 5) % 11);
      const wins = Math.max(0, 6 - ((i * 3) % 7));
      const draws = (i * 2) % 4;
      const played = losses + wins + draws;
      mapped.push({
        rank: 0,
        name: NPC_NAMES[i],
        isNpc: true,
        isMe: false,
        wins,
        losses,
        draws,
        streak: -(1 + (i % 4)),
        played,
        winRate: played ? Math.round((wins / played) * 100) : 0,
        shameScore: losses * 3 - wins,
      });
    }

    mapped.sort((a, b) => b.shameScore - a.shameScore || a.winRate - b.winRate);
    mapped.forEach((r, i) => (r.rank = i + 1));

    return { rows: mapped.slice(0, 13) };
  });
}

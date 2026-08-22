import type { FastifyInstance } from "fastify";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { eq } from "drizzle-orm";
import { OAuth2Client } from "google-auth-library";
import { db, users } from "@pacify/db";

const SECRET = process.env.JWT_SECRET ?? "pacify-dev-secret-change-me";
const COOKIE = "pacify_token";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days
const isProd = process.env.NODE_ENV === "production";
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

type TokenPayload = { uid: string };

function signToken(uid: string) {
  return jwt.sign({ uid }, SECRET, { expiresIn: "30d" });
}

export function setAuthCookie(reply: any, uid: string) {
  reply.setCookie(COOKIE, signToken(uid), {
    httpOnly: true,
    sameSite: "lax",
    secure: isProd,
    path: "/",
    maxAge: MAX_AGE,
  });
}

async function uidFromReq(req: any): Promise<string | null> {
  try {
    const token = req.cookies?.[COOKIE];
    if (!token) return null;
    const p = jwt.verify(token, SECRET) as TokenPayload;
    return p.uid;
  } catch {
    return null;
  }
}

// "edrick.tan91@mail.com" -> "Edrick Tan"
export function parseNameFromEmail(email?: string | null): string | null {
  if (!email || !email.includes("@")) return null;
  const local = email.split("@")[0];
  const tokens = local
    .split(/[^a-zA-Z]+/)
    .filter((t) => t.length >= 2)
    .slice(0, 3);
  if (tokens.length === 0) return null;
  const name = tokens.map((t) => t[0].toUpperCase() + t.slice(1).toLowerCase()).join(" ");
  return name.length >= 3 ? name : null;
}

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;

function publicUser(u: typeof users.$inferSelect) {
  return { id: u.id, username: u.username, email: u.email, displayName: u.displayName, coins: u.coins };
}

export async function authRoutes(app: FastifyInstance) {
  // REGISTER — username/password required, email optional (name harvest)
  app.post("/auth/register", async (req, reply) => {
    const { username, password, email } = (req.body ?? {}) as any;
    if (!USERNAME_RE.test(username ?? "")) {
      return reply.code(400).send({ error: "USERNAME: 3-20 CHARS — LETTERS, NUMBERS, _ ONLY" });
    }
    if (!password || String(password).length < 6) {
      return reply.code(400).send({ error: "PASSWORD MUST BE AT LEAST 6 CHARACTERS" });
    }
    const cleanEmail =
      typeof email === "string" && email.trim().includes("@") ? email.trim().toLowerCase() : null;

    const takenU = await db.select({ id: users.id }).from(users).where(eq(users.username, username)).limit(1);
    if (takenU.length) return reply.code(409).send({ error: "USERNAME ALREADY TAKEN" });
    if (cleanEmail) {
      const takenE = await db.select({ id: users.id }).from(users).where(eq(users.email, cleanEmail)).limit(1);
      if (takenE.length) return reply.code(409).send({ error: "EMAIL ALREADY REGISTERED" });
    }

    const hash = await bcrypt.hash(String(password), 10);
    const displayName = parseNameFromEmail(cleanEmail);
    const [user] = await db
      .insert(users)
      .values({
        username,
        email: cleanEmail,
        passwordHash: hash,
        displayName,
        nameSource: displayName ? "email" : null,
        isGuest: false,
      })
      .returning();

    setAuthCookie(reply, user.id);
    return publicUser(user);
  });

  // LOGIN
  app.post("/auth/login", async (req, reply) => {
    const { username, password } = (req.body ?? {}) as any;
    if (!username || !password) return reply.code(400).send({ error: "MISSING USERNAME OR PASSWORD" });
    const [user] = await db.select().from(users).where(eq(users.username, username)).limit(1);
    if (!user?.passwordHash) return reply.code(401).send({ error: "WRONG USERNAME OR PASSWORD" });
    const ok = await bcrypt.compare(String(password), user.passwordHash);
    if (!ok) return reply.code(401).send({ error: "WRONG USERNAME OR PASSWORD" });
    await db.update(users).set({ lastSeenAt: new Date() }).where(eq(users.id, user.id));
    setAuthCookie(reply, user.id);
    return publicUser(user);
  });

  // ME — session check
  app.get("/auth/me", async (req, reply) => {
    const uid = await uidFromReq(req);
    if (!uid) return reply.code(401).send({ error: "NOT LOGGED IN" });
    const [user] = await db.select().from(users).where(eq(users.id, uid)).limit(1);
    if (!user) return reply.code(401).send({ error: "NOT LOGGED IN" });
    return publicUser(user);
  });

  // GOOGLE — verify ID token, find-or-create by email (verified real name!)
  app.post("/auth/google", async (req, reply) => {
    const { credential } = (req.body ?? {}) as any;
    if (!credential) return reply.code(400).send({ error: "MISSING CREDENTIAL" });
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken: String(credential),
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      const p = ticket.getPayload();
      if (!p?.email) return reply.code(401).send({ error: "GOOGLE VERIFY FAILED" });

      const [existing] = await db.select().from(users).where(eq(users.email, p.email)).limit(1);
      let user = existing;
      if (!user) {
        const [created] = await db
          .insert(users)
          .values({
            email: p.email,
            displayName: p.name ?? null, // their real Google name
            nameSource: "google",
            isGuest: false,
          })
          .returning();
        user = created;
      } else if (!user.displayName && p.name) {
        const [updated] = await db
          .update(users)
          .set({ displayName: p.name, nameSource: "google" })
          .where(eq(users.id, user.id))
          .returning();
        user = updated;
      }

      setAuthCookie(reply, user.id);
      return publicUser(user);
    } catch {
      return reply.code(401).send({ error: "GOOGLE VERIFY FAILED" });
    }
  });

  // LOGOUT
  app.post("/auth/logout", async (_req, reply) => {
    reply.clearCookie(COOKIE, { path: "/" });
    return { ok: true };
  });
}

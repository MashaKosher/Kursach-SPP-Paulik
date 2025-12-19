import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { signAccessToken } from "../utils/jwt.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { OAuth2Client } from "google-auth-library";
import { env } from "../config/env.js";

export const authRouter = Router();

const RegisterSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(8).max(72),
  name: z.string().trim().min(1).max(100).optional()
});

authRouter.post("/register", async (req, res, next) => {
  try {
    const body = RegisterSchema.parse(req.body);
    const existing = await prisma.user.findUnique({ where: { email: body.email } });
    if (existing) return res.status(409).json({ message: "Email already registered" });

    const passwordHash = await bcrypt.hash(body.password, 10);
    const userRole = await prisma.role.upsert({
      where: { name: "user" },
      create: { name: "user" },
      update: {}
    });

    const user = await prisma.user.create({
      data: {
        email: body.email,
        name: body.name,
        passwordHash,
        roles: { create: [{ roleId: userRole.id }] }
      },
      include: { roles: { include: { role: true } } }
    });

    const roles = user.roles.map((r: { role: { name: string } }) => r.role.name);
    const token = signAccessToken({ sub: user.id, email: user.email, roles });

    return res.status(201).json({
      token,
      user: { id: user.id, email: user.email, name: user.name, roles }
    });
  } catch (e) {
    return next(e);
  }
});

const LoginSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(1).max(72)
});

authRouter.post("/login", async (req, res, next) => {
  try {
    const body = LoginSchema.parse(req.body);
    const user = await prisma.user.findUnique({
      where: { email: body.email },
      include: { roles: { include: { role: true } } }
    });
    if (!user || !user.isActive) return res.status(401).json({ message: "Invalid credentials" });

    const ok = await bcrypt.compare(body.password, user.passwordHash);
    if (!ok) return res.status(401).json({ message: "Invalid credentials" });

    const roles = user.roles.map((r: { role: { name: string } }) => r.role.name);
    const token = signAccessToken({ sub: user.id, email: user.email, roles });

    return res.json({
      token,
      user: { id: user.id, email: user.email, name: user.name, roles }
    });
  } catch (e) {
    return next(e);
  }
});

authRouter.get("/me", requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: { roles: { include: { role: true } } }
    });
    if (!user) return res.status(404).json({ message: "Not found" });
    return res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      roles: user.roles.map((r: { role: { name: string } }) => r.role.name)
    });
  } catch (e) {
    return next(e);
  }
});

authRouter.post("/google", async (req, res, next) => {
  try {
    if (!env.GOOGLE_CLIENT_ID) {
      return res.status(501).json({ message: "Google auth is not configured" });
    }

    const body = z.object({ idToken: z.string().min(1) }).parse(req.body);
    const client = new OAuth2Client(env.GOOGLE_CLIENT_ID);
    const ticket = await client.verifyIdToken({
      idToken: body.idToken,
      audience: env.GOOGLE_CLIENT_ID
    });
    const payload = ticket.getPayload();
    if (!payload?.email) return res.status(401).json({ message: "Invalid Google token" });

    const email = payload.email.toLowerCase();
    const name = payload.name ?? payload.given_name ?? undefined;

    const userRole = await prisma.role.upsert({
      where: { name: "user" },
      create: { name: "user" },
      update: {}
    });

    const user = await prisma.user.upsert({
      where: { email },
      create: {
        email,
        name,
        // passwordHash is required by schema; for google users store a random hash
        passwordHash: await bcrypt.hash(cryptoRandomString(), 10),
        roles: { create: [{ roleId: userRole.id }] }
      },
      update: { name: name ?? undefined },
      include: { roles: { include: { role: true } } }
    });

    if (!user.isActive) return res.status(401).json({ message: "Account is blocked" });

    const roles = user.roles.map((r) => r.role.name);
    const token = signAccessToken({ sub: user.id, email: user.email, roles });

    return res.json({
      token,
      user: { id: user.id, email: user.email, name: user.name, roles }
    });
  } catch (e) {
    return next(e);
  }
});

function cryptoRandomString() {
  // simple non-crypto fallback: good enough as "unusable password"
  return `google:${Math.random().toString(36).slice(2)}:${Date.now()}`;
}



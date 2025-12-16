import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { signAccessToken } from "../utils/jwt.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";

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



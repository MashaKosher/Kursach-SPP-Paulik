import type { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../utils/jwt.js";
import { prisma } from "../prisma.js";

export type AuthedRequest = Request & {
  user?: {
    id: string;
    email: string;
    roles: string[];
  };
};

export async function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const token = header.slice("Bearer ".length).trim();
  try {
    const payload = verifyAccessToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      include: { roles: { include: { role: true } } }
    });
    if (!user || !user.isActive) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    req.user = {
      id: user.id,
      email: user.email,
      roles: user.roles.map((r: { role: { name: string } }) => r.role.name)
    };
    return next();
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }
}


